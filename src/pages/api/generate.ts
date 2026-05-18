import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { guardRequest } from '../../lib/api-guard'
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

// Max files + per-file size enforced server-side (client caps are advisory only).
const SERVER_MAX_FILES       = 120
const SERVER_MAX_FILE_BYTES  = 40 * 1024 * 1024   // 40MB
const SERVER_MAX_TOTAL_BYTES = 200 * 1024 * 1024  // 200MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const guard = guardRequest(req)
  if (guard) return res.status(guard.status).json({ error: guard.error })
  try {
    const input = req.body
    if (!input.company) return res.status(400).json({ error: 'company required' })

    // ── Server-side file validation ──────────────────────────────────────
    // Client-side caps are advisory. Validate here to prevent DoS and
    // $10k+ accidental Sonnet calls from oversized payloads.
    if (Array.isArray(input.supportingFiles)) {
      if (input.supportingFiles.length > SERVER_MAX_FILES) {
        return res.status(400).json({ error: `Max ${SERVER_MAX_FILES} supporting files.` })
      }
      let totalBytes = 0
      for (const f of input.supportingFiles as Array<{ name?: string; mime?: string; data?: string; size?: number }>) {
        const approxBytes = f.size || (typeof f.data === 'string' ? Math.ceil(f.data.length * 0.75) : 0)
        if (approxBytes > SERVER_MAX_FILE_BYTES) {
          return res.status(400).json({ error: `File "${f.name || '?'}" exceeds 40MB limit.` })
        }
        totalBytes += approxBytes
        if (totalBytes > SERVER_MAX_TOTAL_BYTES) {
          return res.status(400).json({ error: 'Total file payload exceeds 200MB.' })
        }
        // Validate MIME type is in the allowed set (not user-controlled binary types)
        const mime = (f.mime || '').toLowerCase()
        const allowed = mime.startsWith('image/') || mime.startsWith('video/') ||
          mime === 'application/pdf' || mime === 'text/plain' || mime === 'text/csv' ||
          mime.includes('word') || mime.includes('spreadsheet') || mime.includes('excel')
        if (!allowed) {
          return res.status(400).json({ error: `File type "${mime}" is not supported.` })
        }
      }
    }

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
    // Lightweight detection — if the founder's AI drafted the deck, their
    // framing is already locked in. Skip strategist + researcher.
    const willUseLightweight = !!(input.draftedDeck && typeof input.draftedDeck === 'object' && Object.keys(input.draftedDeck).length >= 3)
    if (process.env.ENABLE_STRATEGIST !== 'false' && !willUseLightweight) {
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
    if (process.env.ENABLE_RESEARCHER !== 'false' && !willUseLightweight) {
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

    // PRODUCT_SURFACE — when 5+ product screenshots come in, force the writer
    // to reference specific UI surfaces in the Solution + How-it-Works slides.
    // Otherwise the writer drifts back to generic "our product helps" copy.
    const productScreenshots = Array.isArray(input.supportingFiles)
      ? input.supportingFiles.filter((f: any) => typeof f?.mime === 'string' && f.mime.startsWith('image/')).length
      : 0
    const productSurfaceBlock = productScreenshots >= 5
      ? `\n\nPRODUCT SURFACE — ${productScreenshots} product screenshots are attached. The Solution and How-it-Works slides MUST reference SPECIFIC UI surfaces visible in those screenshots (named buttons, panels, flows, charts). Generic "our product helps X" language is forbidden when screenshots are present. If you can see a dashboard with a spend heatmap, name it. If you can see a 3-step onboarding, walk through the steps.`
      : ''

    // RECIPIENT_CONTEXT — when the founder gave us named recipients with
    // fetched intel, surface the primary reader's thesis + the fund's recent
    // investments so the writer biases copy to them.
    const recipientIntel = Array.isArray((input as any).recipientIntel) ? (input as any).recipientIntel : []
    const primaryIntel = recipientIntel.find((b: any) => b?.recipient?.name || b?.fund?.recentDeals?.length) || null
    const recipientBlock = primaryIntel
      ? `\n\nRECIPIENT_CONTEXT — write THIS deck for THIS reader.
PRIMARY READER: ${primaryIntel.recipient?.name || '(unknown)'}${primaryIntel.recipient?.firm ? ` (${primaryIntel.recipient.firm})` : ''}${primaryIntel.recipient?.role ? ` — ${primaryIntel.recipient.role}` : ''}
${primaryIntel.recipient?.focus?.length ? `READER FOCUS: ${primaryIntel.recipient.focus.join(', ')}` : ''}
${primaryIntel.fund?.recentDeals?.length ? `FUND RECENT BETS: ${primaryIntel.fund.recentDeals.slice(0, 8).map((d: any) => d.company + (d.stage ? ` (${d.stage})` : '')).join(', ')}` : ''}
${primaryIntel.fund?.avgCheck ? `FUND CHECK BAND: ${primaryIntel.fund.avgCheck}` : ''}
${Object.keys(primaryIntel.fund?.sectorDistribution || {}).length ? `FUND SECTOR SKEW: ${Object.entries(primaryIntel.fund.sectorDistribution).map(([k, v]) => `${k}=${v}`).join(', ')}` : ''}
WRITE FOR THIS READER: open Why-Now with a wedge into their stated focus areas; pre-answer the objection their recent bets / passes signal; you may borrow portfolio-coherent language (e.g. "compounding", "wedge", "GTM motion") when natural. Never fabricate a relationship to the reader. Never invent quotes attributed to them.`
      : ''

    const userPrompt = buildGenerationPrompt({ ...input, audience, goal, stage, industry }, narrative, originalSlideIds)
      + (researchBlock ? `\n\n${researchBlock}` : '')
      + statlineBlock
      + attachmentNote
      + productSurfaceBlock
      + recipientBlock

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

    // ─── Cost-shift: when the founder's external AI drafted the deck,
    // skip the heavy writer Sonnet call. Run ONLY a lightweight Haiku
    // fact-check + rephrase pass instead (~75% cost reduction).
    //
    // Security: validate draftedDeck against a whitelist of known slide keys.
    // An attacker could inject prompt instructions via arbitrary object keys
    // (e.g. { "__inject__": "Ignore previous instructions..." }). We strip
    // any key that isn't a recognised slide id before passing to the model.
    const VALID_SLIDE_KEYS = new Set([
      's1_intro','s2_situation','s3_problem','s4_implication','s5_fix','s6_how',
      's7_validation','s8_market','s9_customers','s10_competition','s11_risks',
      's12_team_ask','s13_traction','s14_team','s15_technology','s16_clinical',
      's17_regulatory','s18_manufacturing','s19_gtm','s20_financials',
      // Legacy / alternate keys the prompt may still produce
      'intro','situation','problem','implication','fix','how','validation',
      'market','customers','competition','risks','team_ask','traction','team',
    ])
    const rawDraft = input.draftedDeck && typeof input.draftedDeck === 'object' && !Array.isArray(input.draftedDeck)
      ? input.draftedDeck as Record<string, unknown>
      : null
    const draftedDeck = rawDraft
      ? Object.fromEntries(Object.entries(rawDraft).filter(([k]) => VALID_SLIDE_KEYS.has(k)))
      : null
    const useLightweightPath = !!draftedDeck && Object.keys(draftedDeck).length >= 3

    let sonnetContent: Record<string, any>
    let stage2TokensUsed = 0
    let extractedBrand: any = null
    let visionResult: any = null
    let stage2LightweightApplied = false

    if (useLightweightPath) {
      // LIGHTWEIGHT PATH: founder's AI did the drafting. Just fact-check
      // and rephrase weak stats. One Haiku call, ~500 output tokens.
      const factCheckSystem = `You are Andreas, fact-checking and strengthening a pre-drafted pitch deck.

The founder's external AI drafted the slides. You see:
  - The drafted slide content
  - The founder's verbatim statlines (the ONLY source of truth for numbers)
  - Optional supporting documents (PDFs, CSVs, etc.)

YOUR JOB
1. For each slide, check every stat / number / customer name against the
   statlines + attached docs.
2. If a stat is INVENTED (not in statlines OR docs), replace with the
   closest matching real stat OR mark as "[needs founder data]".
3. If a stat is WEAK (vague like "many customers", "growing fast"),
   rephrase using the strongest supporting evidence available.
4. If the headline is buzzword-heavy or generic, tighten it. Otherwise leave it.
5. Preserve the founder's voice and overall structure. Don't rewrite for the
   sake of rewriting — only fix what's broken or weak.

Return ONLY a JSON object with the same shape as the input draftedDeck.
Slides you didn't change can be omitted from your output (we'll merge with
the original). Wrap the JSON in a single \`\`\`json fence.`

      const factCheckPrompt = `DRAFTED DECK
${JSON.stringify(draftedDeck, null, 2)}

FOUNDER STATLINES (the only truth source for numbers)
${statlines.length ? statlines.join('\n') : '(none provided)'}

Return the corrected slides as JSON.`

      const factCheckMessage = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        system: factCheckSystem,
        messages: [{ role: 'user', content: attachmentBlocks.length
          ? [...attachmentBlocks, { type: 'text', text: factCheckPrompt }]
          : factCheckPrompt }],
      })
      const factRaw = (factCheckMessage.content[0] as any).text.trim()
      const factJson = factRaw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      let factCheckedSlides: Record<string, any> = {}
      try {
        const m = factJson.match(/\{[\s\S]*\}/)
        if (m) factCheckedSlides = JSON.parse(m[0])
      } catch {/* fall back to drafted as-is */}
      // Merge: founder draft is the base, fact-check overlays only changed slides.
      sonnetContent = { ...draftedDeck, ...factCheckedSlides }
      stage2TokensUsed = (factCheckMessage.usage?.input_tokens || 0) + (factCheckMessage.usage?.output_tokens || 0)
      stage2LightweightApplied = true

      // Still run brand extraction + vision in parallel (no AI cost for extract,
      // vision only fires if hero image present).
      const [eb, vr] = await Promise.all([
        extractBrand(input.websiteUrl || input.domain).catch(() => null),
        visionSource
          ? analyzeBrand(anthropic, visionSource, { company: input.company, industry }).catch(() => null)
          : Promise.resolve(null),
      ])
      extractedBrand = eb
      visionResult = vr
    } else {
      // FULL PATH: founder didn't pre-draft. Heavy writer Sonnet call.
      const [sonnetMessage, eb, vr] = await Promise.all([
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
      const sonnetRaw = (sonnetMessage.content[0] as any).text?.trim() ?? ''
      const sonnetJson = sonnetRaw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      try {
        sonnetContent = JSON.parse(sonnetJson)
      } catch {
        // Sonnet returned unparseable JSON — try regex extraction before giving up
        const m = sonnetJson.match(/\{[\s\S]*\}/)
        if (m) {
          try { sonnetContent = JSON.parse(m[0]) } catch { /* fall through */ }
        }
        if (!sonnetContent || typeof sonnetContent !== 'object') {
          throw new Error('Deck writer returned malformed JSON. Please retry.')
        }
      }
      stage2TokensUsed = (sonnetMessage.usage?.input_tokens || 0) + (sonnetMessage.usage?.output_tokens || 0)
      extractedBrand = eb
      visionResult = vr
    }

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
    // Skip in lightweight path — the founder's AI already shaped the narrative,
    // and we've fact-checked. No more critique passes needed.
    if (process.env.ENABLE_HAIKU_VALIDATION !== 'false' && !useLightweightPath) {
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
    if (process.env.ENABLE_GPT_POLISH !== 'false' && process.env.OPENAI_API_KEY && !useLightweightPath) {
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
    if (process.env.ENABLE_CRITIC !== 'false' && !useLightweightPath) {
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
        stage_a2:   { model: useLightweightPath ? 'claude-haiku-4-5 (fact-check)' : 'claude-sonnet-4-6', tokensUsed: stage2TokensUsed, lightweightPath: useLightweightPath, lightweightApplied: stage2LightweightApplied },
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
    // Log full error server-side; never echo internal details to the client.
    console.error('[generate] error:', err?.message || err)
    const safeMessage = typeof err?.message === 'string' && err.message.length < 200
      ? err.message.replace(/sk-[a-zA-Z0-9_-]{10,}/g, '[REDACTED]')  // strip any leaked API key
      : 'Deck generation failed. Please retry.'
    res.status(500).json({ error: safeMessage })
  }
}
