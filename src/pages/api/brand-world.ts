import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import type { BrandWorld } from '../../lib/brand-world'
import { extractBrand, type ExtractedBrand } from '../../lib/pipeline/brand-extractor'
import { resolveLogoUrl } from '../../lib/pipeline/logo-resolver'
import { ANDREAS_PERSONA } from '../../lib/andreas-persona'
import { critiqueAndFix } from '../../lib/pipeline/design-critic'

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

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
Produce a specific, intentional, branded visual world for THIS company. Not a template. Not the same AI startup look. A world that belongs to this business and no other.

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

⚡ SATURATED-BACKGROUND BRANDS — do NOT soften these into "tasteful" neutrals.
Some brands (Up Bank's electric yellow + coral, Cash App's lime, Yotel's
magenta, Klarna's pink, Mailchimp's yellow, Liquid Death's neon green)
define themselves by aggressive, saturated colours used as ACTUAL surfaces
— not just accents. If the og:image or extracted body-bg shows a fully-
saturated colour covering >40% of the hero, that colour IS a workspace
surface. Do NOT default to cream/white "for legibility" — adjust text
contrast (deep navy on yellow, white on magenta) instead.

DUAL-SATURATED BRANDS — when the extractor returns TWO highly saturated
colours (e.g. Up Bank: coral + yellow), look at the ACTUAL website
screenshots to see what colour the BRAND USES FOR CARDS, then mirror it:

  STEP 1 — Examine the screenshots. What colour are the actual card/tile
  surfaces on the brand's marketing site? Common patterns:
    - Black/dark cards on saturated bg (Up Bank, Liquid Death, Adidas)
    - Cream/off-white cards on saturated bg (Notion, Mailchimp)
    - The same saturated colour as bg but slightly different shade
    - Glass / outlined / no fill cards
  USE WHAT YOU SEE. Do NOT default to cream cards if the brand uses
  black cards. Do NOT default to dark cards if the brand uses cream.

  STEP 2 — Set the palette to match:
  - colour.background → saturated dominant from website body (Up = coral)
  - colour.surface    → MATCH THE WEBSITE'S CARDS (Up = #0D0D0D black,
                        Notion = #FAFAF7 cream). This is not your taste
                        decision — it is observed from screenshots.
  - colour.primary    → the second saturated colour, used for high-contrast
                        accents (Up = yellow for headings/CTAs on dark cards;
                        Mailchimp = yellow against cream cards)
  - colour.text       → text colour MUST hit 4.5:1 contrast against surface.
                        Dark cards → white/cream text. Light cards → black/
                        navy text. If you set yellow text on cream cards
                        you have failed this rule — pick a darker accent.

  STEP 3 — Verify contrast:
  - accent text (primary on surface) MUST be readable. Yellow on cream =
    fail. Yellow on black = perfect. Coral on cream = good. Coral on coral
    = fail.
  - If primary doesn't contrast against surface, swap roles: use the
    saturated bg colour as the accent text instead (Up: coral text on
    black cards, with yellow CTAs).

SUBTLE CUES YOU MUST CATCH from screenshots (don't miss these):
  - Card border radius (Up = ~24px rounded, Stripe = 8px, Notion = 6px)
  - Card stroke vs fill (outlined vs solid)
  - Accent illustrations / mascots visible (Up = yellow triangle character)
  - Tertiary brand colours used decoratively (Up has pink/peach as
    illustration ink — list them in motifs even if not in main palette)
  - Whether headlines are SANS or SERIF (Up = sans, Stripe = sans, NYT = serif)
  - Button shape (Up = black pill, Stripe = sharp rectangle, Apple = rounded)
  These cues matter as much as the palette. Output them in motifs[] and
  use them to anchor cardStyle, buttonStyle, radius.

If you choose to soften the saturated colours into neutrals, you must
explain in whyThisWorks exactly why this brand reads as "subtle" rather
than "loud". If you can't justify it concretely, use the saturated
colours as actual surfaces.

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
    // Show the palette WITH source + count so Sonnet can weight it. body-bg
    // and theme-color sources are basically the brand colour; respect them.
    const paletteDetailed = extracted.colors.slice(0, 6)
      .map(c => `${c.hex} (source: ${c.source}${c.count && c.count > 1 ? `, seen ${c.count}×` : ''})`)
      .filter(Boolean)
    if (paletteDetailed.length) {
      sources.push(`Detected site palette — USE THESE COLOURS unless the user explicitly overrode them. Colours from "body-bg" or "theme-color" sources ARE the brand's actual primary/background and must appear in your output palette:\n  ${paletteDetailed.join('\n  ')}`)
    }
    if (extracted.detectedFonts.length) {
      sources.push(`Detected site fonts: ${extracted.detectedFonts.join(', ')}
  ⚠ If any of these are CUSTOM fonts (not on Google Fonts — e.g. "UpFont", "ProximaCustom", proprietary names), DO NOT output that name in typography.heading/body. Instead, look at the og:image to see what the typeface LOOKS like (condensed display, geometric grotesk, editorial serif, rounded humanist, etc.) and pick the closest GOOGLE FONT match. Examples: bold condensed display → Antonio / Bebas Neue / Oswald / Barlow Condensed; geometric grotesk → DM Sans / Manrope / Space Grotesk; editorial serif → Fraunces / Cormorant Garamond. The font MUST be loadable from Google Fonts.`)
    }
    if (extracted.ogImage) sources.push(`og:image was attached above — treat as the strongest visual signal for palette and mood. Verify the palette above against what you see in the image.`)
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

/** Fetch a remote image (e.g. og:image) and inline it as a base64 data URL.
 *  Anthropic vision only accepts jpeg / png / gif / webp — SVG and other
 *  formats are rejected with HTTP 400, so we filter them here. */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SignalDeck/1.0; +https://signaldeck.app)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const rawType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim().toLowerCase()
  const VISION_OK = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
  // Some servers mislabel — also fall back to URL extension when content-type
  // is generic like application/octet-stream.
  const extMatch = url.toLowerCase().match(/\.(jpe?g|png|gif|webp|svg|ico)(\?|$)/)
  const extType = extMatch ? `image/${extMatch[1] === 'jpg' ? 'jpeg' : extMatch[1]}` : null
  const finalType = VISION_OK.has(rawType) ? rawType : (extType && VISION_OK.has(extType) ? extType : null)
  if (!finalType) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > 4_500_000) return null  // Anthropic vision cap is ~5MB; bail before sending
  return `data:${finalType};base64,${buf.toString('base64')}`
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
    // site's og:image + extracted logo + brand colours so Sonnet doesn't infer
    // blind. Logo is fetched even when transparent — PNG alpha is preserved in
    // the base64 round-trip; Sonnet can read the mark on any background.
    let extracted: ExtractedBrand | null = null
    let ogImageDataUrl: string | null = null
    let extractedLogoDataUrl: string | null = null
    let extraImageDataUrls: string[] = []
    if (input.websiteUrl && !heroImage) {
      extracted = await extractBrand(input.websiteUrl).catch(() => null)
      if (extracted?.ogImage) {
        ogImageDataUrl = await fetchImageAsDataUrl(extracted.ogImage).catch(() => null)
      }
      if (extracted?.logoUrl && !logoImage) {
        extractedLogoDataUrl = await fetchImageAsDataUrl(extracted.logoUrl).catch(() => null)
      }
      // Additional photos / screenshots — fetch up to 4 in parallel. Anthropic
      // vision accepts ~20 images per message but we cap aggressively to keep
      // latency + cost predictable; the og:image + logo are usually enough,
      // these are bonus context for cases like Up Bank where the hero illustrates
      // the brand more than the OG card does.
      if (extracted?.extraImages?.length) {
        const fetched = await Promise.all(
          extracted.extraImages.slice(0, 4).map(u => fetchImageAsDataUrl(u).catch(() => null)),
        )
        extraImageDataUrls = fetched.filter((x): x is string => Boolean(x))
      }
    }

    const userTextPrompt = buildUserPrompt(input, extracted)
    const userContent: any[] = []
    // Attach images first so the model sees them before reading text.
    // Order matters: user-uploaded hero/logo first, then extracted og/logo,
    // then extra page photos.
    const allImages = [heroImage, ogImageDataUrl, logoImage, extractedLogoDataUrl, productImage, ...extraImageDataUrls]
    for (const img of allImages.filter(Boolean) as string[]) {
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
      if (!m) return res.status(500).json({ error: 'Andreas returned an unparseable response — try regenerating' })
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

    // Tertiary / decorative colour — if the extractor caught 3+ saturated
    // brand colours (Up's pink ink alongside coral + yellow), expose the
    // third as colour.tertiary so the renderer + workspace can use it as
    // `--decorative` without it being mistaken for primary/accent.
    if (extracted?.colors && extracted.colors.length >= 3) {
      const used = new Set([brandWorld.colour.primary, brandWorld.colour.secondary, brandWorld.colour.accent].map(c => String(c || '').toLowerCase()))
      const tertiary = extracted.colors.find(c => !used.has(c.hex.toLowerCase()))
      if (tertiary) (brandWorld.colour as any).tertiary = tertiary.hex
    }

    // DESIGN CRITIC — deterministic WCAG contrast check on the palette, then
    // a Haiku repair pass if anything failed. Catches the "yellow text on
    // cream cards" class of bug that Sonnet sometimes ships when it's busy
    // matching brand voice and forgets readability is a hard constraint.
    const critique = await critiqueAndFix(anthropic, brandWorld.colour).catch(() => ({ failures: [], fixedColour: undefined, reasoning: '' }))
    if (critique.fixedColour) {
      // Apply only the keys the critic actually returned; preserve everything else.
      brandWorld.colour = { ...brandWorld.colour, ...critique.fixedColour } as typeof brandWorld.colour
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
      designCritique: { failures: critique.failures, reasoning: critique.reasoning || null },
    })
  } catch (err: any) {
    console.error('brand-world error:', err)
    res.status(500).json({ error: err.message || 'brand-world generation failed' })
  }
}
