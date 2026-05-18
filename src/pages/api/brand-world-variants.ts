/* ════════════════════════════════════════════════════════════════════
   POST /api/brand-world-variants

   Returns 3 distinct brand-world directions in ONE Sonnet call (not 3
   separate calls). Each variant is generated with a different temperament
   directive — LOUD, BALANCED, RESTRAINED — so the founder can pick instead
   of accepting Andreas's one-shot guess.

   Each variant is scored on:
     - contrast  (WCAG pair pass rate, 0-100)
     - boldness  (saturation of background + accent, 0-100)
     - fit       (how well the temperament matches the industry default)
   And ranked so the highest-scoring "best fit" leads.

   Body: same shape as /api/brand-world (company, industry, ...).

   Returns: { variants: Array<{ id, temperament, brandWorld, scores, why }> }
═══════════════════════════════════════════════════════════════════ */

import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import type { BrandWorld } from '../../lib/brand-world'
import { extractBrand, type ExtractedBrand } from '../../lib/pipeline/brand-extractor'
import { ANDREAS_PERSONA } from '../../lib/andreas-persona'
import { detectContrastFailures, contrastRatio } from '../../lib/pipeline/design-critic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

JOB: Produce 3 alternative brand-world directions for ONE company. Each must
feel like a real, intentional choice for a different temperament — not the
same world with the saturation slider moved.

THREE TEMPERAMENTS:
  LOUD       — saturated surfaces, bold display type, the brand SHOUTS.
               Liquid Death / Klarna / Up Bank. Background and surface use
               actual brand colours, not neutrals. Text is heavy.
  BALANCED   — one strong accent, restrained chrome, professional. Linear /
               Notion. Mostly neutral with one signature colour pulled into
               accents + CTAs. Cards stay light or stay dark consistently.
  RESTRAINED — editorial silence, lots of whitespace, type does the work.
               Stripe / Cormorant / luxury hotel sites. Hairline borders,
               minimal colour, generous spacing.

OUTPUT — return EXACTLY this JSON, no markdown:
{
  "variants": [
    { "temperament": "LOUD",       "why": "<one line>", "brandWorld": { ... full BrandWorld JSON ... } },
    { "temperament": "BALANCED",   "why": "<one line>", "brandWorld": { ... } },
    { "temperament": "RESTRAINED", "why": "<one line>", "brandWorld": { ... } }
  ]
}

Each brandWorld must have ALL these fields (same schema as /api/brand-world):
  industry, brandPersonality, visualDirection, avoid (3-6 items), whyThisWorks,
  colour { background, surface, surfaceSoft, primary, primarySoft, secondary,
           accent, text, textMuted, border, success, warning, error, gridLine, glow },
  typography { heading, body, mono, style, headingWeight, bodyWeight, tracking },
  motifs (3-5), layoutStyle, cardStyle, buttonStyle, iconStyle, motionStyle,
  dataVizStyle, backgroundSystem, radius (number), density,
  visualRichness, effects { gridOverlay, radialAmbient, heroWatermark, monoLabels, glow, grainOverlay },
  deckTheme, deckMode, origin { primaryFrom, fontsFrom }

Use real Google Font names so they actually load.`

function buildUserPrompt(input: any, extracted?: ExtractedBrand | null): string {
  const lines: string[] = []
  if (input.company)    lines.push(`Company: ${input.company}`)
  if (input.industry)   lines.push(`Industry: ${input.industry}`)
  if (input.oneLiner)   lines.push(`One-liner: ${input.oneLiner}`)
  if (input.audience)   lines.push(`Audience: ${input.audience}`)
  if (input.stage)      lines.push(`Stage: ${input.stage}`)
  if (input.websiteUrl) lines.push(`Website: ${input.websiteUrl}`)
  if (input.inspoBrands) lines.push(`Inspiration brands the founder admires: ${input.inspoBrands}`)
  if (extracted) {
    const palette = extracted.colors.slice(0, 5).map(c => `${c.hex} (${c.source})`).join(', ')
    if (palette) lines.push(`Detected site palette: ${palette}`)
    if (extracted.detectedFonts.length) lines.push(`Detected fonts: ${extracted.detectedFonts.join(', ')}`)
  }
  return `Generate 3 brand-world VARIANTS for the company below — one LOUD, one BALANCED, one RESTRAINED. Each is a distinct, intentional direction.

${lines.join('\n')}

Return the JSON exactly as specified.`
}

/** Score a variant on contrast quality, boldness, and industry fit. */
function scoreVariant(bw: BrandWorld, industry: string): { contrast: number; boldness: number; fit: number; total: number } {
  // Contrast: 100 - 20 per failure (clamp 0-100)
  const failures = detectContrastFailures(bw.colour)
  const contrast = Math.max(0, 100 - failures.length * 20)

  // Boldness: max contrast between bg and surface * saturation of primary
  const bgVsSurface = contrastRatio(bw.colour.background, bw.colour.surface)
  const primSat = hexSaturation(bw.colour.primary)
  const boldness = Math.min(100, Math.round((bgVsSurface * 12) + primSat * 60))

  // Fit: industry-default temperament. Fintech-data-led → LOUD or BALANCED.
  // Legal/luxury → RESTRAINED. AI/dev tools → BALANCED. Returns the boost
  // for the brand-world's visualRichness against the industry.
  const richness = bw.visualRichness
  const idfit: Record<string, Record<string, number>> = {
    fintech:  { maximal: 95, rich: 88, balanced: 80, restrained: 50 },
    legal:    { maximal: 40, rich: 50, balanced: 75, restrained: 95 },
    health:   { maximal: 45, rich: 60, balanced: 85, restrained: 85 },
    cyber:    { maximal: 95, rich: 90, balanced: 75, restrained: 40 },
    'dev-tools': { maximal: 80, rich: 78, balanced: 95, restrained: 70 },
    creative: { maximal: 90, rich: 95, balanced: 75, restrained: 55 },
    retail:   { maximal: 80, rich: 95, balanced: 75, restrained: 55 },
    luxury:   { maximal: 60, rich: 70, balanced: 85, restrained: 95 },
    other:    { maximal: 75, rich: 80, balanced: 85, restrained: 75 },
  }
  const tier = (idfit[industry] || idfit.other)
  const fit = tier[richness] ?? 75

  // Weighted total: contrast matters most (readability is table-stakes), then
  // industry fit, then boldness. A loud-but-readable world ranks above a
  // bold-but-unreadable one.
  const total = Math.round(contrast * 0.5 + fit * 0.35 + boldness * 0.15)
  return { contrast, boldness, fit, total }
}

function hexSaturation(hex: string): number {
  const h = (hex || '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const input = req.body || {}
    if (!input.company) return res.status(400).json({ error: 'company is required' })

    // Extract website signal if available — but unlike /api/brand-world we
    // don't pull screenshots here. One Sonnet call, no vision = cheaper.
    let extracted: ExtractedBrand | null = null
    if (input.websiteUrl) {
      extracted = await extractBrand(input.websiteUrl).catch(() => null)
    }

    const userPrompt = buildUserPrompt(input, extracted)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = (message.content[0] as any).text?.trim() ?? ''
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    let parsed: any
    try { parsed = JSON.parse(jsonStr) }
    catch {
      const m = jsonStr.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'Variants response unparseable' })
      parsed = JSON.parse(m[0])
    }

    const rawVariants = Array.isArray(parsed.variants) ? parsed.variants : []
    const industry = (input.industry || '').toLowerCase()

    // Score and rank — best-scoring variant leads.
    const scored = rawVariants
      .filter((v: any) => v && v.brandWorld && v.brandWorld.colour)
      .map((v: any, i: number) => ({
        id: `v${i + 1}`,
        temperament: String(v.temperament || '').toUpperCase(),
        why:         String(v.why || ''),
        brandWorld:  v.brandWorld as BrandWorld,
        scores:      scoreVariant(v.brandWorld, industry),
      }))
      .sort((a: any, b: any) => b.scores.total - a.scores.total)

    res.status(200).json({ variants: scored })
  } catch (e: any) {
    console.error('brand-world-variants error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'variants generation failed' })
  }
}
