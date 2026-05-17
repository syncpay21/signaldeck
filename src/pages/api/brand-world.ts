import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import type { BrandWorld } from '../../lib/brand-world'
import { extractBrand, type ExtractedBrand } from '../../lib/pipeline/brand-extractor'
import { resolveLogoUrl } from '../../lib/pipeline/logo-resolver'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/* ════════════════════════════════════════════════════════════════════
   POST /api/brand-world

   Generates a complete BrandWorld for a specific company. This is the
   one call that decides everything visual — palette, typography,
   motifs, card style, motion, deck theme — based on the user's actual
   inputs.

   Anti-cliché is baked in: the prompt forbids the generic AI look by
   default and forces the model to justify every choice from the
   company context.

   Body:
     {
       company:         string         (required)
       industry?:       string         e.g. 'Fintech' / 'Consumer' / free text
       oneLiner?:       string
       realStory?:      string         the founder narrative
       customers?:      string
       proof?:          string
       audience?:       string         'seed-vc' / 'series-a' / ...
       stage?:          string
       websiteUrl?:     string
       logoData?:       string         data URL — optional, drives vision pass
       heroData?:       string         data URL — biggest brand signal
       productData?:    string
       inspoLinks?:     string[]       reference URLs
     }

   Returns:
     { brandWorld: BrandWorld, reasoning: string }
═══════════════════════════════════════════════════════════════════ */

const SYSTEM_PROMPT = `You are the brand-world generator for SignalDeck.

Your one job: produce a specific, intentional, branded visual world for THIS company. Not a template. Not the same AI startup look. A world that belongs to this business and no other.

HARD RULES — never violate:

ANTI-CLICHÉ — these are forbidden unless the user's actual brand visibly uses them:
  - Dark navy / black + purple-blue gradient
  - Glowing orbs / particles / neural-network lines
  - Glassmorphism / frosted panels as the primary aesthetic
  - Generic bento grids
  - "AI sparkle" iconography / vague robot or brain imagery
  - "Future of work" visuals
  - Inter + gradient button combo (use Inter only if it's the right answer, not the default)

INDUSTRY-SPECIFIC visual world — pick the right one:
  - fintech / payments        → ledger-precise layout, statement cards, payment rail motifs, teal/navy, clean grotesk + mono numbers
  - sports / fitness          → arena-kinetic layout, scoreboard cards, court/field motifs, bold condensed display, team colours
  - legal / professional      → document-formal layout, clause/contract cards, serious serif or grotesk, neutral palette
  - healthcare / medical      → calm spacious layout, gentle greens or blues, care-journey motifs, soft neutrals
  - climate / impact          → report-scientific layout, topographic motifs, earth tones, calm credible
  - cyber security            → command-operational layout, controlled darkness, alert states, grid systems
  - logistics                 → command-operational layout, route lines, warehouse nodes, map motifs
  - luxury / hospitality      → editorial-spacious, premium serif or clean grotesk, restraint, low contrast
  - education / edtech        → learning-pathway layout, progress motifs, warm clarity, friendly sans
  - creative / agency / media → gallery-expressive, editorial serif + grotesk, real product surfaces
  - developer tools / API     → terminal-dense, mono + sans pair, code-block cards, API documentation feel
  - retail / consumer         → editorial or gallery, real photography, warm or bold, depends on positioning
  - AI products               → DO NOT default to generic AI. Pick the underlying industry. AI for law looks like legal. AI for sports looks like sports. AI is a capability, not a brand.

COLOUR SOURCING — in order of preference:
  1. EXPLICIT visualReference in the user prompt (if user described the brand visually, FOLLOW IT verbatim)
  2. Uploaded logo / screenshots
  3. Colours from the website (when fetched)
  4. Industry norms above
  5. Brand personality (premium / playful / serious / technical)
  Use ONE primary, ONE supporting accent, neutrals, semantic colours. Never overload.

TYPOGRAPHY — match the brand, do not default. CRITICAL: if the visualReference says "NOT a serif" or "geometric sans" or names a specific font family, that override wins over the industry default:
  - Fintech / enterprise: Neue Haas Grotesk, IBM Plex Sans, Inter, Source Sans
  - Premium / luxury: Suisse, Cormorant Garamond pair, Editorial serif + clean sans
  - Sports: Barlow Condensed, Oswald, bold condensed
  - Developer: Geist, Sora, Space Grotesk + JetBrains Mono
  - Consumer / events / social: DM Sans, Manrope, Circular, Inter Display — clean grotesks NOT serifs (most consumer brands deliberately avoid editorial serif)
  - Editorial / publishing / luxury hotel: editorial serif fits, otherwise consumer = grotesk
  - Education: Lexend, Nunito, Rubik
  - Legal / gov: Merriweather, Libre Baskerville pairing
  - Use real Google Fonts names so they actually load.
  - When choosing typography.style, only pick "editorial-serif" if the brand visibly uses one — most consumer brands are "geometric-sans".

WRITING — the visualDirection / brandPersonality / whyThisWorks fields must be CONCRETE, not generic:
  Bad:  "Modern, sleek, AI-powered design"
  Good: "A fintech reconciliation workspace. Statement-style cards, payment-rail motifs, teal as the trust signal. Restrained, data-dense, no neon."

OUTPUT — return EXACTLY this JSON, no markdown fences. Every field is required:

{
  "industry": "<canonical key — fintech | sports | legal | health | climate | cyber | logistics | luxury | education | creative | dev-tools | retail | gov | other>",
  "brandPersonality": "<1-line description>",
  "visualDirection": "<2 sentences describing the world>",
  "avoid": ["<3-6 specific anti-patterns this brand must avoid>"],
  "whyThisWorks": "<1-2 sentences explaining the connection between the company and the design>",
  "colour": {
    "background": "#rrggbb",
    "surface": "#rrggbb",
    "surfaceSoft": "#rrggbb",
    "primary": "#rrggbb",
    "primarySoft": "rgba(...)",
    "secondary": "#rrggbb",
    "accent": "#rrggbb",
    "text": "#rrggbb",
    "textMuted": "#rrggbb",
    "border": "rgba(...)",
    "success": "#rrggbb",
    "warning": "#rrggbb",
    "error": "#rrggbb",
    "gridLine": "rgba(...)",
    "glow": "<transparent or rgba()>"
  },
  "typography": {
    "heading": "<exact Google Font name>",
    "body":    "<exact Google Font name>",
    "mono":    "<exact Google Font name>",
    "style":   "<editorial-serif | geometric-sans | bold-condensed | mono-technical | playful-rounded | humanist-warm>",
    "headingWeight": "<700|800|900>",
    "bodyWeight":    "<400|500>",
    "tracking":      "<-0.04em | -0.02em | normal | 0.02em>"
  },
  "motifs": ["<3-5 concrete motifs — 'payment rails', 'court lines', 'route waypoints', etc>"],
  "layoutStyle": "<ledger-precise | arena-kinetic | document-formal | editorial-spacious | report-scientific | command-operational | gallery-expressive | terminal-dense | learning-pathway | workspace-clean>",
  "cardStyle":   "<statement | scoreboard | document | editorial | tile | terminal | minimal-line>",
  "buttonStyle": "<pill | rounded | sharp | ghost | underlined>",
  "iconStyle":   "<line | duotone | glyph | badge>",
  "motionStyle": "<precise | kinetic | calm | crisp | editorial | minimal>",
  "dataVizStyle": "<ledger-rows | stat-cards | scoreboard | topographic | route-map | sparkline | editorial-chart>",
  "backgroundSystem": "<1-sentence description — 'subtle 64px grid, no gradient blobs'>",
  "radius": <number — 4 for sharp, 14 for clean, 22 for friendly>,
  "density": "<tight | normal | spacious>",
  "visualRichness": "<restrained | balanced | rich | maximal>",
  "effects": {
    "gridOverlay":   <true | false>,
    "radialAmbient": <true | false>,
    "heroWatermark": <true | false>,
    "monoLabels":    <true | false>,
    "glow":          <true | false>,
    "grainOverlay":  <true | false>
  },
  "deckTheme": "<1-sentence vibe for the rendered HTML deck>",
  "deckMode":  "<light | dark>",
  "origin": {
    "primaryFrom": "<logo | website | screenshot | industry-default | user-override>",
    "fontsFrom":   "<detected | industry-default | override>"
  }
}

VISUAL RICHNESS — how much polish does the chrome get?
  Match the brand's actual identity. Do not give every brand the same level of
  visual ambition. A serious legal firm and a fintech-bold trading platform
  must NOT render with the same density of effects.

  - "restrained" → minimal embellishment. All effects false.
    Use for: legal, healthcare, climate, luxury hospitality, professional
    services, government, education (early-childhood).
    Visual: hairline borders, calm typography, plenty of whitespace, no glow,
    no watermarks, no grid overlay. Trust comes from clarity, not flair.

  - "balanced" → clean with one accent. radialAmbient may be true; the rest
    usually false. Default for most brands you can't pin to another category.
    Use for: B2B SaaS, productivity tools, mainstream consumer (Notion-style),
    most "modern professional" brands. LinkedIn is balanced.

  - "rich" → vibrant, motifs visible. heroWatermark + monoLabels + radialAmbient
    typically true; gridOverlay + glow depend on brand.
    Use for: consumer event apps (Luma), creative agencies, lifestyle/fashion,
    sports/fitness, media. Brands that want to feel "alive".

  - "maximal" → full polish. All effects typically true (plus grainOverlay when
    deckMode is "dark"). Glow especially.
    Use for: fintech-data-led-bold (Stripe, SyncPay-style trading/payments),
    developer tools / API platforms (Vercel-style), command-ops / cyber, AI
    research labs with a serious dark aesthetic. Brands where the chrome
    itself is part of the credibility signal.

EFFECT INDIVIDUAL GUIDANCE (when in doubt):
  - gridOverlay: true for command/dev-tools/fintech-data and any "engineered"
    feel. false for warm consumer / luxury / healthcare.
  - radialAmbient: true when colours are vibrant enough to support it (any
    brand with a real primary colour). false for pure-neutral palettes.
  - heroWatermark: true for bold-condensed displays (Barlow, Oswald) where the
    typeface itself reads as a graphic. false for editorial serif / humanist.
  - monoLabels: true for technical / data / fintech / dev brands.
    false for consumer / luxury / warm brands (clashes with their voice).
  - glow: true for dark-mode brands with a saturated primary. false for light-
    mode or pastel brands.
  - grainOverlay: true ONLY for premium dark-mode brands (fintech-dark,
    creative-agency-dark, luxury-night). false otherwise — would muddy light
    surfaces.

Before returning, ASK YOURSELF:
- Would this same design fit 50 unrelated startups? If yes, revise.
- Is the palette chosen because of the business or because it looks trendy? If trendy, revise.
- Could the founder look at this and say "this feels like us"? If no, revise.

If the answer is uncertain, lean towards specificity — pick the motif from the actual workflow, not the abstract category.`

function buildUserPrompt(input: any, extracted?: ExtractedBrand | null): string {
  const sources: string[] = []
  if (input.company)    sources.push(`Company: ${input.company}`)
  if (input.industry)   sources.push(`Industry: ${input.industry}`)
  if (input.oneLiner)   sources.push(`One-liner: ${input.oneLiner}`)
  if (input.audience)   sources.push(`Audience: ${input.audience}`)
  if (input.stage)      sources.push(`Stage: ${input.stage}`)
  if (input.websiteUrl) sources.push(`Website: ${input.websiteUrl}`)
  if (input.realStory)  sources.push(`Founder story: ${input.realStory}`)
  if (input.customers)  sources.push(`Customers: ${input.customers}`)
  if (input.proof)      sources.push(`Proof: ${input.proof}`)
  if (Array.isArray(input.inspoLinks) && input.inspoLinks.length) sources.push(`Inspo references: ${input.inspoLinks.join(', ')}`)

  if (extracted) {
    const palette = extracted.colors.slice(0, 5).map(c => c.hex).filter(Boolean)
    if (palette.length) sources.push(`Detected site palette (use as a starting point): ${palette.join(', ')}`)
    if (extracted.detectedFonts.length) sources.push(`Detected site fonts: ${extracted.detectedFonts.join(', ')}`)
    if (extracted.ogImage) sources.push(`og:image was attached above — treat as the strongest visual signal for palette and mood.`)
  }

  return `Generate the BrandWorld for this company. Use everything below as evidence; do not invent context that isn't given.

${sources.join('\n')}

Return the JSON exactly as specified — no markdown, every field present.`
}

/** Convert a data:URL to the Anthropic SDK image-input shape. Returns null if unparseable. */
function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  return { mediaType: m[1], data: m[2] }
}

/** Fetch a remote image (e.g. og:image) and inline it as a base64 data URL. */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SignalDeck/1.0; +https://signaldeck.app)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > 4_500_000) return null  // Anthropic vision cap is ~5MB; bail before sending
  return `data:${contentType};base64,${buf.toString('base64')}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const input = req.body
    if (!input.company) return res.status(400).json({ error: 'company is required' })

    const heroImage = typeof input.heroData    === 'string' && input.heroData.startsWith('data:image')    ? input.heroData    : null
    const logoImage = typeof input.logoData    === 'string' && input.logoData.startsWith('data:image')    ? input.logoData    : null
    const productImage = typeof input.productData === 'string' && input.productData.startsWith('data:image') ? input.productData : null

    // If the user gave a websiteUrl but didn't upload screenshots, fetch the
    // site's og:image + brand colours so Sonnet doesn't infer blind.
    let extracted: ExtractedBrand | null = null
    let ogImageDataUrl: string | null = null
    if (input.websiteUrl && !heroImage) {
      extracted = await extractBrand(input.websiteUrl).catch(() => null)
      if (extracted?.ogImage) {
        ogImageDataUrl = await fetchImageAsDataUrl(extracted.ogImage).catch(() => null)
      }
    }

    const userTextPrompt = buildUserPrompt(input, extracted)
    const userContent: any[] = []
    // Attach images first so the model sees them before reading text.
    for (const img of [heroImage, ogImageDataUrl, logoImage, productImage].filter(Boolean) as string[]) {
      const parsed = parseDataUrl(img)
      if (parsed) {
        userContent.push({ type: 'image', source: { type: 'base64', media_type: parsed.mediaType as any, data: parsed.data } })
      }
    }
    userContent.push({ type: 'text', text: userTextPrompt })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    const raw = (message.content[0] as any).text?.trim() ?? ''
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

    let parsed: any
    try { parsed = JSON.parse(jsonStr) }
    catch {
      const m = jsonStr.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'Claude returned unparseable JSON' })
      parsed = JSON.parse(m[0])
    }

    // Defensive normalisation — ensure shape matches BrandWorld
    const brandWorld: BrandWorld = {
      industry:         String(parsed.industry || 'other'),
      brandPersonality: String(parsed.brandPersonality || ''),
      visualDirection:  String(parsed.visualDirection || ''),
      avoid:            Array.isArray(parsed.avoid) ? parsed.avoid.filter((s: any) => typeof s === 'string') : [],
      whyThisWorks:     String(parsed.whyThisWorks || ''),

      colour: {
        background:   parsed.colour?.background   || '#FFFFFF',
        surface:      parsed.colour?.surface      || '#FFFFFF',
        surfaceSoft:  parsed.colour?.surfaceSoft  || '#F8F9FA',
        primary:      parsed.colour?.primary      || '#0F1115',
        primarySoft:  parsed.colour?.primarySoft  || 'rgba(15, 17, 21, 0.08)',
        secondary:    parsed.colour?.secondary    || '#3B5BDB',
        accent:       parsed.colour?.accent       || parsed.colour?.primary || '#0F1115',
        text:         parsed.colour?.text         || '#0F1115',
        textMuted:    parsed.colour?.textMuted    || '#6B7280',
        border:       parsed.colour?.border       || 'rgba(15, 17, 21, 0.10)',
        success:      parsed.colour?.success      || '#137a4a',
        warning:      parsed.colour?.warning      || '#a86a00',
        error:        parsed.colour?.error        || '#b0322b',
        gridLine:     parsed.colour?.gridLine     || 'rgba(15, 17, 21, 0.04)',
        glow:         parsed.colour?.glow         || 'transparent',
      },
      typography: {
        heading:       parsed.typography?.heading       || 'Inter',
        body:          parsed.typography?.body          || 'Inter',
        mono:          parsed.typography?.mono          || 'JetBrains Mono',
        style:         parsed.typography?.style         || 'geometric-sans',
        headingWeight: parsed.typography?.headingWeight || '700',
        bodyWeight:    parsed.typography?.bodyWeight    || '400',
        tracking:      parsed.typography?.tracking      || '-0.02em',
      },

      motifs:           Array.isArray(parsed.motifs) ? parsed.motifs.filter((s: any) => typeof s === 'string').slice(0, 6) : [],
      layoutStyle:      parsed.layoutStyle      || 'workspace-clean',
      cardStyle:        parsed.cardStyle        || 'minimal-line',
      buttonStyle:      parsed.buttonStyle      || 'rounded',
      iconStyle:        parsed.iconStyle        || 'line',
      motionStyle:      parsed.motionStyle      || 'minimal',
      dataVizStyle:     parsed.dataVizStyle     || 'sparkline',
      backgroundSystem: String(parsed.backgroundSystem || 'plain background, no patterns'),
      radius:           typeof parsed.radius === 'number' ? parsed.radius : 14,
      density:          parsed.density          || 'normal',

      visualRichness:   (['restrained','balanced','rich','maximal'] as const).includes(parsed.visualRichness) ? parsed.visualRichness : 'balanced',
      effects: {
        gridOverlay:    Boolean(parsed.effects?.gridOverlay),
        radialAmbient:  Boolean(parsed.effects?.radialAmbient),
        heroWatermark:  Boolean(parsed.effects?.heroWatermark),
        monoLabels:     Boolean(parsed.effects?.monoLabels),
        glow:           Boolean(parsed.effects?.glow),
        grainOverlay:   Boolean(parsed.effects?.grainOverlay),
      },

      deckTheme:        String(parsed.deckTheme || ''),
      deckMode:         parsed.deckMode === 'dark' ? 'dark' : 'light',

      origin: {
        primaryFrom: parsed.origin?.primaryFrom || 'industry-default',
        fontsFrom:   parsed.origin?.fontsFrom   || 'industry-default',
      },
    }

    // Resolve a logo URL the client can render in the workspace sidebar.
    // User-uploaded logoData wins on the client; this is the auto-sourced fallback.
    const resolvedLogoUrl = resolveLogoUrl({
      websiteUrl:       input.websiteUrl,
      extractedLogoUrl: extracted?.logoUrl,
    })

    res.status(200).json({
      brandWorld,
      reasoning: parsed.whyThisWorks || '',
      resolvedLogoUrl,
      extractedLogoUrl: extracted?.logoUrl ?? null,
      extractedOgImage: extracted?.ogImage ?? null,
    })
  } catch (err: any) {
    console.error('brand-world error:', err)
    res.status(500).json({ error: err.message || 'brand-world generation failed' })
  }
}
