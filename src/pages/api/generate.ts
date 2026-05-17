import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { renderDeck } from '../../lib/renderer'
import { selectNarrative, getSlideSet } from '../../lib/narrative-engine'
import { buildSystemPrompt, buildGenerationPrompt } from '../../lib/narrative-prompts'
import { FRAMEWORKS } from '../../lib/frameworks/library'
import { DARK_FRAMEWORKS } from '../../lib/frameworks/dark'
import { resolveIndustry, getIndustryGuide } from '../../lib/industry-guide'
import { validateNarrative, shouldApplySuggestion } from '../../lib/pipeline/haiku-validator'
import { polishDeck } from '../../lib/pipeline/gpt4o-polish'
import { extractBrand } from '../../lib/pipeline/brand-extractor'
import { synthesiseTheme } from '../../lib/pipeline/theme-synthesizer'
import { assignVisuals } from '../../lib/pipeline/visual-mood'
import { runQualityGate } from '../../lib/pipeline/quality-gate'
import { analyzeBrand } from '../../lib/pipeline/vision-analyzer'
import type { AudienceType, UseCase, Stage, Industry, BusinessModel, GtmMotion, TractionStatus, Region, TeamSize, SlideId } from '../../lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({    apiKey: process.env.OPENAI_API_KEY })

const HAIKU_CONFIDENCE_THRESHOLD = 70

/* ════════════════════════════════════════════════════════════════════
   4-STAGE GENERATION PIPELINE

   Stage 1 — Predetermined route (deterministic, no AI)
   Stage 2 — Sonnet content generation
   Stage 3 — Haiku narrative validation + slide reorder (best-effort)
   Stage 4 — GPT-4o copy polish + stat verification (best-effort)

   Stages 3 + 4 are best-effort: if either fails the pipeline still
   returns a usable deck. Skip via ENABLE_HAIKU_VALIDATION=false or
   ENABLE_GPT_POLISH=false (env).
═══════════════════════════════════════════════════════════════════ */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const input = req.body
    if (!input.company) return res.status(400).json({ error: 'company required' })

    /* ─── STAGE 1 — Predetermined route ──────────────────────────────── */
    const audience          = (input.audience          || 'seed-vc')  as AudienceType
    const goal              = (input.goal              || 'raise')    as UseCase
    const stage             = (input.stage             || 'seed')     as Stage
    const industry          = (input.industry          || 'other')    as Industry
    const businessModelType = input.businessModelType  as BusinessModel | undefined
    const gtmMotion         = input.gtmMotion          as GtmMotion | undefined
    const tractionStatus    = input.tractionStatus     as TractionStatus | undefined
    const region            = input.region             as Region | undefined
    const teamSize          = input.teamSize           as TeamSize | undefined

    const narrative = selectNarrative(audience, goal)
    const originalSlideIds = getSlideSet(narrative, stage, industry, businessModelType, gtmMotion, tractionStatus, region, teamSize)

    const frameworkId   = typeof input.frameworkId === 'string' ? input.frameworkId : undefined
    const allFw         = [...FRAMEWORKS, ...DARK_FRAMEWORKS]
    const fw            = frameworkId ? allFw.find(f => f.id === frameworkId) : undefined
    const guideKey      = resolveIndustry(industry)
    const industryGuide = getIndustryGuide(guideKey)

    const systemPrompt = buildSystemPrompt(narrative, stage, industry, {
      framework:      fw ? { name: fw.name, summary: fw.summary, steps: fw.steps } : undefined,
      industryVoice:  { tone: industryGuide.tone, avoid: industryGuide.avoid },
      businessModel:  businessModelType,
      gtmMotion,
      tractionStatus,
      region,
      teamSize,
    })
    const userPrompt = buildGenerationPrompt({ ...input, audience, goal, stage, industry }, narrative, originalSlideIds)

    /* ─── STAGE 2 (Sonnet) + STAGE B1 (Brand HTML) + STAGE B0.5 (Vision)
       — all run in parallel. Vision only fires when the user uploaded
       a hero image; B1 only when they gave a websiteUrl. */
    const heroImage = typeof input.heroData === 'string' && input.heroData.startsWith('data:image') ? input.heroData : null
    const productImage = typeof input.productData === 'string' && input.productData.startsWith('data:image') ? input.productData : null
    const visionSource = heroImage || productImage   // hero preferred for brand-feel; product as fallback

    const [sonnetMessage, extractedBrand, visionResult] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      extractBrand(input.websiteUrl || input.domain).catch(() => null),
      visionSource
        ? analyzeBrand(anthropic, visionSource, { company: input.company, industry }).catch(() => null)
        : Promise.resolve(null),
    ])
    const sonnetRaw = (sonnetMessage.content[0] as any).text.trim()
    const sonnetJson = sonnetRaw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const sonnetContent: Record<string, any> = JSON.parse(sonnetJson)
    const stage2TokensUsed = (sonnetMessage.usage?.input_tokens || 0) + (sonnetMessage.usage?.output_tokens || 0)

    /* ─── STAGE B2 — Theme synthesis (deterministic, no AI) ──────────── */
    // Vision result wins over HTML extraction if confidence is high.
    // User explicit override still wins over both.
    const accentFromVision = visionResult && visionResult.confidence >= 60 ? visionResult.dominantHex : undefined
    const theme = synthesiseTheme({
      brand:       extractedBrand || undefined,
      guide:       industryGuide,
      accentColor: input.accentColor || accentFromVision,
      bgColor:     input.bgColor,
      fontHeading: input.fontHeading,
      fontBody:    input.fontBody,
      isDark:      input.isDark,
    })

    /* ─── STAGE 3 — Haiku narrative validation (best-effort) ─────────── */
    let activeSlideIds: SlideId[] = originalSlideIds
    let haikuResult: any = null
    let haikuError: string | null = null
    let haikuApplied = false
    if (process.env.ENABLE_HAIKU_VALIDATION !== 'false') {
      try {
        const v = await validateNarrative(anthropic, {
          deckContent: sonnetContent,
          narrativeId: narrative.id,
          audience, stage, industry,
          slideIds: originalSlideIds,
        })
        haikuResult = {
          narrativeFit:       v.narrativeFit,
          confidence:         v.confidence,
          suggestedNarrative: v.suggestedNarrative,
          suggestedSlides:    v.suggestedSlides,
          reasoning:          v.reasoning,
        }
        if (shouldApplySuggestion(v, originalSlideIds, HAIKU_CONFIDENCE_THRESHOLD)) {
          activeSlideIds = v.suggestedSlides
          haikuApplied = true
        }
      } catch (e: any) {
        haikuError = e?.message || 'Haiku validation failed'
        console.error('Stage 3 error:', haikuError)
      }
    }

    /* ─── STAGE 4 — GPT-4o copy polish + stat verification (best-effort) */
    let polishedContent: Record<string, any> = sonnetContent
    let statVerification: any = { flagged: [], corrected: [], allStatsValid: true }
    let copyFeedback = ''
    let polishError: string | null = null
    let polishApplied = false
    if (process.env.ENABLE_GPT_POLISH !== 'false' && process.env.OPENAI_API_KEY) {
      try {
        const polish = await polishDeck(openai, {
          deckContent:  sonnetContent,
          slideIds:     activeSlideIds,
          narrativeId:  narrative.id,
          coreQuestion: narrative.coreQuestion,
          spine:        narrative.narrativeSpine,
          rawInput:     input,
        })
        polishedContent  = polish.deckContent
        statVerification = polish.statVerification
        copyFeedback     = polish.copyFeedback
        polishApplied    = true
      } catch (e: any) {
        polishError = e?.message || 'GPT-4o polish failed'
        console.error('Stage 4 error:', polishError)
      }
    }

    /* ─── STAGE B3 — Per-slide visual mood + transition (deterministic) */
    const slideVisuals = assignVisuals(activeSlideIds, industryGuide)

    /* ─── STAGE C1 — Render ──────────────────────────────────────────── */
    // Pass uploaded images + vision hints to the renderer via input augmentation.
    const renderInput = {
      ...input,
      logoData:     input.logoData,
      heroData:     input.heroData,
      productData:  input.productData,
      founderPhoto: input.founderPhoto,
      visionMood:   visionResult?.mood,
      visionLayout: visionResult?.layout,
    }
    const html = renderDeck(renderInput, polishedContent, activeSlideIds, {
      industryGuide,
      theme,
      slideVisuals,
    })

    /* ─── STAGE C2 — Quality gate (deterministic, post-render) ───────── */
    const qualityReport = runQualityGate(html, polishedContent, theme, industryGuide)

    res.status(200).json({
      html,
      content:          polishedContent,
      narrative:        narrative.id,
      slideOrder:       activeSlideIds,
      frameworkApplied: fw?.id ?? null,
      industryGuide:    guideKey,
      theme,
      slideVisuals,
      brand:            extractedBrand,
      qualityReport,
      metadata: {
        /* Track A — content */
        stage_a1: { narrative: narrative.id, slideOrder: originalSlideIds },
        stage_a2: { model: 'claude-sonnet-4-6', tokensUsed: stage2TokensUsed },
        stage_a3: { model: 'claude-haiku-4-5', haiku: haikuResult, applied: haikuApplied, error: haikuError },
        stage_a4: { model: 'gpt-4o', statVerification, copyFeedback, applied: polishApplied, error: polishError },
        /* Track B — brand × theme × vision */
        stage_b0: visionResult ? {
          model:      'claude-sonnet-4-6 (vision)',
          source:     heroImage ? 'hero' : 'product',
          dominantHex: visionResult.dominantHex,
          mood:        visionResult.mood,
          typography:  visionResult.typography,
          layout:      visionResult.layout,
          imagery:     visionResult.imageryArchetype,
          confidence:  visionResult.confidence,
          reasoning:   visionResult.reasoning,
        } : { skipped: !visionSource ? 'no-image-uploaded' : 'failed' },
        stage_b1: { brandFound: !!extractedBrand?.colors.length, colorCount: extractedBrand?.colors.length || 0, logoFound: !!extractedBrand?.logoUrl, ogImage: !!extractedBrand?.ogImage },
        stage_b2: { accent: theme.accent, bg: theme.bg, origin: theme.origin, contrast: theme.contrast, reasoning: theme.reasoning },
        stage_b3: { slideCount: Object.keys(slideVisuals).length },
        /* Track C — render + quality gate */
        stage_c1: { rendered: true, htmlBytes: html.length },
        stage_c2: { pass: qualityReport.pass, notes: qualityReport.notes },
      },
    })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
