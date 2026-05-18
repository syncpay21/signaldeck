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
import { pickStrategicNarrative, shouldApplyStrategistPick } from '../../lib/pipeline/strategist'
import { critiqueAndRevise, shouldApplyRevisions } from '../../lib/pipeline/critic'
import { runResearch, formatResearchForPrompt } from '../../lib/pipeline/researcher'
import { NARRATIVE_CONFIGS } from '../../lib/narrative-engine'
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

    let narrative = selectNarrative(audience, goal)

    /* ─── STAGE A1.5 — Andreas the strategist (best-effort) ──────────
       Haiku reads the founder's actual story and either confirms or
       overrides the deterministic pick. On failure, fall through with
       the deterministic pick — never block generation. */
    let strategistResult: any = null
    let strategistApplied = false
    if (process.env.ENABLE_STRATEGIST !== 'false') {
      strategistResult = await pickStrategicNarrative(anthropic, {
        company:   input.company,
        industry,
        oneLiner:  input.oneLiner,
        realStory: input.realStory,
        customers: input.customers,
        proof:     input.proof,
        audience,
        stage,
        deterministicPick: narrative.id,
      })
      if (shouldApplyStrategistPick(strategistResult)) {
        narrative = NARRATIVE_CONFIGS[strategistResult.pickedNarrative]
        strategistApplied = true
      }
    }

    const originalSlideIds = getSlideSet(narrative, stage, industry, businessModelType, gtmMotion, tractionStatus, region, teamSize)

    const frameworkId   = typeof input.frameworkId === 'string' ? input.frameworkId : undefined
    const allFw         = [...FRAMEWORKS, ...DARK_FRAMEWORKS]
    const fw            = frameworkId ? allFw.find(f => f.id === frameworkId) : undefined
    const guideKey      = resolveIndustry(industry)
    const industryGuide = getIndustryGuide(guideKey)

    const darkTacticsEnabled = input.darkTacticsEnabled === true
    const systemPrompt = buildSystemPrompt(narrative, stage, industry, {
      framework:      fw ? { name: fw.name, summary: fw.summary, steps: fw.steps } : undefined,
      industryVoice:  { tone: industryGuide.tone, avoid: industryGuide.avoid },
      businessModel:  businessModelType,
      gtmMotion,
      tractionStatus,
      region,
      teamSize,
      darkTacticsEnabled,
    })
    /* ─── STAGE A0.5 — Andreas the researcher (best-effort) ──────────
       Sonnet identifies 2-3 likely competitors (gap-filling whatever
       the founder named), then scrapes each for positioning. Result
       is injected into the writing prompt so the Competition + Market
       slides land grounded in real comparables, not vague generalities.
       Failure is non-blocking. Gated by ENABLE_RESEARCHER=false. */
    let researchResult: any = null
    if (process.env.ENABLE_RESEARCHER !== 'false') {
      researchResult = await runResearch(anthropic, {
        company:     input.company,
        industry,
        oneLiner:    input.oneLiner,
        realStory:   input.realStory,
        competitors: input.competitors,
      }).catch(() => null)
    }
    const researchBlock = formatResearchForPrompt(researchResult)
    // Statline block — surface the structured numbers the founder supplied
    // in intake (revenue, named customers, growth rate, etc.) so Sonnet uses
    // them verbatim instead of inventing.
    const statlines: string[] = []
    const addStat = (label: string, v?: string) => { if (v && String(v).trim()) statlines.push(`  ${label}: ${String(v).trim()}`) }
    addStat('Revenue',              input.revenue)
    addStat('Growth rate',          input.growthRate)
    addStat('Burn / runway',        input.burnAndRunway)
    addStat('Customer count',       input.customerCount)
    addStat('Named customers',      input.namedCustomers)
    addStat('Retention / NPS',      input.retentionOrNps)
    addStat('Press / awards',       input.pressOrAwards)
    addStat('Waitlist / pipeline',  input.waitlistOrPipeline)
    addStat('Raising amount',       input.raisingAmount)
    addStat('Valuation / terms',    input.valuationOrTerms)
    addStat('Lead investor',        input.leadInvestor)
    addStat('Use of funds',         input.useOfFunds)
    addStat('Next milestones',      input.nextMilestones)
    addStat('Team highlights',      input.teamHighlights)
    addStat('Advisors / board',     input.advisorsOrBoard)
    addStat('Known competitors',    input.knownCompetitors)
    addStat('Why now',              input.whyNow)
    // Extra evidence
    addStat('Customer testimonials',input.customerTestimonials)
    addStat('Signed deals',         input.signedDeals)
    addStat('Partnerships',         input.partnerships)
    addStat('Unit economics',       input.unitEconomics)
    addStat('Revenue projection',   input.revenueProjection)
    addStat('Cohort retention',     input.cohortRetention)
    addStat('Past funding',         input.pastFunding)
    addStat('Investor objections',  input.investorObjections)
    addStat('Live product URL',     input.liveProductUrl)
    addStat('Upcoming launches',    input.upcomingLaunches)
    addStat('Industry stat',        input.industryStat)
    addStat('Regulatory status',    input.regulatoryStatus)
    addStat('IP / patents',         input.ipOrPatents)
    addStat('Open roles',           input.openRoles)
    addStat('Channel mix',          input.channelMix)
    addStat('Geographic play',      input.geographicPlay)
    addStat('Press quotes',         input.pressQuotes)
    const statlineBlock = statlines.length
      ? `\n\nFOUNDER-SUPPLIED STATLINES — use these EXACT numbers and names verbatim in the deck. Never invent or round.\n${statlines.join('\n')}`
      : ''
    const supportingCount = Array.isArray(input.supportingFiles) ? input.supportingFiles.length : 0
    const attachmentNote = (input.previousDeckData || supportingCount > 0)
      ? `\n\nATTACHED DOCUMENTS — read all of them as source-of-truth. Lift statlines, named customers, competitor names, team backgrounds, exact phrasings the founder is committed to. Never invent numbers that aren't in either the statlines above OR the attached documents. ${input.previousDeckData ? '1 previous pitch deck' : ''}${input.previousDeckData && supportingCount ? ' + ' : ''}${supportingCount ? `${supportingCount} supporting file${supportingCount === 1 ? '' : 's'}` : ''} attached.`
      : ''
    const userPrompt = buildGenerationPrompt({ ...input, audience, goal, stage, industry }, narrative, originalSlideIds)
      + (researchBlock ? `\n\n${researchBlock}` : '')
      + statlineBlock
      + attachmentNote

    /* ─── STAGE 2 (Sonnet) + STAGE B1 (Brand HTML) + STAGE B0.5 (Vision)
       — all run in parallel. Vision only fires when the user uploaded
       a hero image; B1 only when they gave a websiteUrl. */
    const heroImage = typeof input.heroData === 'string' && input.heroData.startsWith('data:image') ? input.heroData : null
    const productImage = typeof input.productData === 'string' && input.productData.startsWith('data:image') ? input.productData : null
    const visionSource = heroImage || productImage   // hero preferred for brand-feel; product as fallback

    // Build the user message content. Previous deck + every supporting file
    // becomes a Sonnet content block where the file type supports it. Sonnet
    // reads them for verbatim statlines / customers / competitor names.
    const attachmentBlocks: any[] = []
    const pushDataUrlAsBlock = (dataUrl: string, _name?: string) => {
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!m) return
      const [, mime, b64] = m
      if (mime === 'application/pdf') {
        attachmentBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } })
      } else if (mime.startsWith('image/') && ['image/jpeg','image/png','image/gif','image/webp'].includes(mime)) {
        attachmentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } })
      } else if (mime === 'text/plain' || mime === 'text/csv') {
        // Text-based files — decode and inline as a text block with a header
        try {
          const decoded = Buffer.from(b64, 'base64').toString('utf-8').slice(0, 60000)
          attachmentBlocks.push({ type: 'text', text: `[Attached file: ${_name || 'document'}]\n${decoded}` })
        } catch {/* skip */}
      }
      // .docx / .xlsx / .pptx — not natively supported. Founder PDF-exports.
    }

    if (typeof input.previousDeckData === 'string') {
      pushDataUrlAsBlock(input.previousDeckData, input.previousDeckName || 'previous deck')
    }
    if (Array.isArray(input.supportingFiles)) {
      for (const f of input.supportingFiles as Array<{ name: string; mime: string; data: string }>) {
        pushDataUrlAsBlock(f.data, f.name)
      }
    }

    const sonnetUserMessage: any = attachmentBlocks.length
      ? [...attachmentBlocks, { type: 'text', text: userPrompt }]
      : userPrompt

    const [sonnetMessage, extractedBrand, visionResult] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: sonnetUserMessage }],
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
    // Priority chain for the final theme:
    //   1. BrandWorld from /api/brand-world (the user just confirmed in the preview screen)
    //   2. User explicit override on the intake form
    //   3. Vision result on uploaded screenshot
    //   4. HTML extraction + industry-guide default fallback
    const userBrandWorld = input.brandWorld || null
    const accentFromVision = visionResult && visionResult.confidence >= 60 ? visionResult.dominantHex : undefined
    const theme = synthesiseTheme({
      brand:       extractedBrand || undefined,
      guide:       industryGuide,
      accentColor: userBrandWorld?.colour?.primary    || input.accentColor || accentFromVision,
      bgColor:     userBrandWorld?.colour?.background || input.bgColor,
      fontHeading: userBrandWorld?.typography?.heading || input.fontHeading,
      fontBody:    userBrandWorld?.typography?.body    || input.fontBody,
      isDark:      typeof input.isDark === 'boolean' ? input.isDark : userBrandWorld?.deckMode === 'dark',
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

    /* ─── STAGE A5 — Andreas the critic (best-effort) ───────────────
       Final pass before render. Sonnet re-reads the polished deck,
       scores each slide on hook/evidence/specificity/punch, picks the
       weakest 1-3, and rewrites them. Merge revisions into the final
       content. Failure is non-blocking. Gated by ENABLE_CRITIC=false. */
    let criticResult: any = null
    let criticApplied = false
    if (process.env.ENABLE_CRITIC !== 'false') {
      try {
        criticResult = await critiqueAndRevise(anthropic, {
          deckContent:  polishedContent,
          slideIds:     activeSlideIds,
          narrativeId:  narrative.id,
          audience,
          stage,
          industry,
          maxRevisions: 3,
        })
        if (shouldApplyRevisions(criticResult)) {
          polishedContent = { ...polishedContent, ...criticResult.revisedSlides }
          criticApplied = true
        }
      } catch (e: any) {
        console.error('Stage A5 (critic) error:', e?.message || e)
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
    // Per-generation deck id for viewership tracking. Each /api/generate call
    // produces a fresh id so signals are scoped to THIS version of the deck.
    const deckId = 'sd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    const html = renderDeck(renderInput, polishedContent, activeSlideIds, {
      industryGuide,
      theme,
      slideVisuals,
      brandWorld: userBrandWorld,
      deckId,
    })

    /* ─── STAGE C2 — Quality gate (deterministic, post-render) ───────── */
    const qualityReport = runQualityGate(html, polishedContent, theme, industryGuide)

    res.status(200).json({
      html,
      deckId,
      content:          polishedContent,
      narrative:        narrative.id,
      slideOrder:       activeSlideIds,
      frameworkApplied: fw?.id ?? null,
      industryGuide:    guideKey,
      brandWorld:       userBrandWorld,
      theme,
      slideVisuals,
      brand:            extractedBrand,
      qualityReport,
      metadata: {
        /* Track A — content */
        stage_a0_5: { researcher: researchResult },
        stage_a1:   { narrative: narrative.id, slideOrder: originalSlideIds },
        stage_a1_5: { strategist: strategistResult, applied: strategistApplied },
        stage_a2:   { model: 'claude-sonnet-4-6', tokensUsed: stage2TokensUsed },
        stage_a3:   { model: 'claude-haiku-4-5', haiku: haikuResult, applied: haikuApplied, error: haikuError },
        stage_a4: { model: 'gpt-4o', statVerification, copyFeedback, applied: polishApplied, error: polishError },
        stage_a5: { model: 'claude-sonnet-4-6 (critic)', critic: criticResult, applied: criticApplied },
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
