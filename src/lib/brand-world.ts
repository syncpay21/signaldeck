/* ════════════════════════════════════════════════════════════════════
   BRAND WORLD — the single visual contract for everything SignalDeck
   renders for a specific company.

   Spec is the user's design philosophy doc: one object that captures
   industry, personality, palette, typography, motifs, component
   styles, motion, deck theme — applied across intake, workspace,
   deck, demo, and export.

   Created by /api/brand-world from the user's collected sources
   (company name, industry, story, customers, uploaded assets, etc).
   Consumed by Workspace.tsx (CSS variables on the root) and renderer.ts
   (theme + motifs in the rendered HTML deck).

   The point: no two companies share a brand world.
═══════════════════════════════════════════════════════════════════ */

export type LayoutStyle =
  | 'ledger-precise'        // fintech / data
  | 'arena-kinetic'         // sports / fitness
  | 'document-formal'       // legal / gov
  | 'editorial-spacious'    // luxury / media
  | 'report-scientific'     // climate / health / research
  | 'command-operational'   // logistics / cyber / devops
  | 'gallery-expressive'    // creative / fashion
  | 'terminal-dense'        // developer tools / api
  | 'learning-pathway'      // edtech
  | 'workspace-clean'       // generic productivity — used sparingly

export type CardStyle =
  | 'statement'             // receipt / bank-statement feel
  | 'scoreboard'            // sports stats
  | 'document'              // legal page / contract
  | 'editorial'             // magazine / gallery
  | 'tile'                  // grid / dashboard
  | 'terminal'              // code block
  | 'minimal-line'          // border-only, no fill

export type ButtonStyle =
  | 'pill'
  | 'rounded'
  | 'sharp'
  | 'ghost'
  | 'underlined'

export type IconStyle =
  | 'line'                  // 1.6 stroke icons
  | 'duotone'               // 2-color fills
  | 'glyph'                 // condensed monospace symbols
  | 'badge'                 // filled bg pills

export type MotionStyle =
  | 'precise'               // small / line / sync — fintech
  | 'kinetic'               // momentum-based — sports
  | 'calm'                  // slow fade — health / luxury
  | 'crisp'                 // command feedback — dev tools
  | 'editorial'             // type-on / reveal — media / luxury
  | 'minimal'               // almost none

export type DataVizStyle =
  | 'ledger-rows'           // statement tables
  | 'stat-cards'            // big numbers
  | 'scoreboard'            // game-stat panels
  | 'topographic'           // contour / heatmap (climate, research)
  | 'route-map'             // logistics
  | 'sparkline'             // dev / api dashboards
  | 'editorial-chart'       // hand-curated chart

/* Overall visual ambition of the rendered chrome. Drives whether the workspace
   feels "premium dark with glow + watermark + mono labels" or "minimal flat
   surfaces". Maps from brand personality / category. Restrained brands stay
   simple; bold data-led brands get the full vc_aware-style polish. */
export type VisualRichness =
  | 'restrained'            // legal / luxury / healthcare / climate — minimal
  | 'balanced'              // most B2B / SaaS — clean, one accent
  | 'rich'                  // consumer / creative / sports — vibrant, motifs visible
  | 'maximal'               // fintech-data-led / dev-tools / command — full polish

export interface BrandWorld {
  /* ─── Read of the company ──────────────────────────────────── */
  industry:           string                  // canonical key — fintech / sports / legal / climate / ...
  brandPersonality:   string                  // 1-line: 'serious / data-led', 'kinetic / loud', etc.
  visualDirection:    string                  // 2-sentence description of the visual world
  avoid:              string[]                // hard "no" list — won't render even if Sonnet asks
  whyThisWorks:       string                  // explanation for the user

  /* ─── Tokens (CSS vars on :root) ───────────────────────────── */
  colour: {
    background:   string                      // page bg
    surface:      string                      // card bg
    surfaceSoft:  string                      // recessed bg
    primary:      string                      // main brand colour
    primarySoft:  string                      // primary @ 14% / hover
    secondary:    string                      // supporting accent
    accent:       string                      // single highlight
    text:         string                      // ink
    textMuted:    string                      // captions / hints
    border:       string                      // hairline
    success:      string
    warning:      string
    error:        string
    gridLine:     string                      // bg grid colour
    glow:         string                      // selective glow — use sparingly
  }
  typography: {
    heading:      string                      // Google Font name
    body:         string
    mono:         string
    style:        'editorial-serif' | 'geometric-sans' | 'bold-condensed' | 'mono-technical' | 'playful-rounded' | 'humanist-warm'
    headingWeight:   string                    // '900' | '800' | '700' — for industry tone
    bodyWeight:      string
    tracking:        string                    // CSS letter-spacing for headings: '-0.04em' | '-0.02em' | 'normal'
  }

  /* ─── Visual world ─────────────────────────────────────────── */
  motifs:           string[]                   // 3-5 concrete motifs: 'payment rails', 'court lines', 'route waypoints'
  layoutStyle:      LayoutStyle
  cardStyle:        CardStyle
  buttonStyle:      ButtonStyle
  iconStyle:        IconStyle
  motionStyle:      MotionStyle
  dataVizStyle:     DataVizStyle
  backgroundSystem: string                    // 1-sentence: "subtle 64px grid, no gradient blobs"
  radius:           number                    // px — corner radius for cards
  density:          'tight' | 'normal' | 'spacious'

  /* ─── Visual richness — drives optional polish layers ─────── */
  visualRichness:   VisualRichness
  effects: {
    gridOverlay:    boolean                    // subtle 64px grid behind content
    radialAmbient:  boolean                    // soft radial color washes in bg
    heroWatermark:  boolean                    // giant condensed word behind hero
    monoLabels:     boolean                    // MiniLabels in mono + uppercase tracking
    glow:           boolean                    // primary buttons + status dots get colored shadow
    grainOverlay:   boolean                    // subtle SVG noise overlay (premium dark)
  }

  /* ─── Deck-specific ────────────────────────────────────────── */
  deckTheme:        string                    // 1-sentence vibe for the rendered HTML deck
  deckMode:         'light' | 'dark'

  /* ─── Origin (for "why" surfaces in the UI) ────────────────── */
  origin: {
    primaryFrom:   'logo' | 'website' | 'screenshot' | 'industry-default' | 'user-override'
    fontsFrom:     'detected' | 'industry-default' | 'override'
  }

  /* ─── Brand archetype (post-model inference) ───────────────── */
  /* Inferred from the colour/typography/personality tags by
   * inferArchetype() in src/lib/design-library/archetypes.ts. Optional
   * because legacy worlds may not have it. */
  archetype?: {
    id:         string         // 'sage' | 'hero' | 'lover' | ...
    confidence: number         // 0-100
    runnerUp?:  string
  }

  /* Composition grid chosen for the deck (founder-overridable in
   * Workspace Theme Lab). Optional — when present, renderer can
   * opt-in via the --composition CSS var. */
  compositionGrid?: string
}

/* ─── CSS var emitter ───────────────────────────────────────────────
   Given a BrandWorld, produce the inline style string the workspace's
   root element consumes so EVERY component reads from the world.
   Components reference `var(--bg)`, `var(--primary)`, etc.
*/
export function brandWorldToCssVars(w: BrandWorld): Record<string, string> {
  const out: Record<string, string> = {
    '--bg':          w.colour.background,
    '--surface':     w.colour.surface,
    '--surface-soft': w.colour.surfaceSoft,
    '--primary':     w.colour.primary,
    '--primary-soft': w.colour.primarySoft,
    '--secondary':   w.colour.secondary,
    '--accent':      w.colour.accent,
    '--text':        w.colour.text,
    '--ink':         w.colour.text,                // alias for legacy components
    '--text-muted':  w.colour.textMuted,
    '--ink-muted':   w.colour.textMuted,           // alias
    '--border':      w.colour.border,
    '--line':        w.colour.border,              // alias
    '--paper':       w.colour.surface,             // alias
    '--success':     w.colour.success,
    '--warning':     w.colour.warning,
    '--error':       w.colour.error,
    '--grid-line':   w.colour.gridLine,
    '--glow':        w.colour.glow,
    '--radius':      `${w.radius}px`,
    '--font-heading': `'${w.typography.heading}', system-ui, sans-serif`,
    '--font-body':    `'${w.typography.body}', system-ui, sans-serif`,
    '--font-mono':    `'${w.typography.mono}', ui-monospace, monospace`,
    '--heading-weight': w.typography.headingWeight,
    '--body-weight':    w.typography.bodyWeight,
    '--heading-tracking': w.typography.tracking,
  }
  // Optional tertiary / decorative colour — emitted when extractor caught a
  // third saturated brand colour (Up's pink ink, Klarna's lime accent, etc.).
  // Components can reference var(--decorative) for non-primary flourishes.
  const tertiary = (w as any).colour?.tertiary as string | undefined
  if (tertiary) out['--decorative'] = tertiary

  // Layer in canonical design tokens (type / spacing / radius scales) +
  // colour-role tokens. These don't override existing brand vars — they
  // sit alongside as a semantic vocabulary new layouts can opt into.
  try {
    // Lazy require so this file remains importable in contexts that don't
    // have the design-library on the path.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { designTokensToCss } = require('./design-library/design-tokens')
    const tokens = designTokensToCss(w.archetype?.id, w.density)
    Object.assign(out, tokens)
  } catch { /* design-library optional */ }

  // Composition tokens
  if (w.compositionGrid) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getComposition, compositionToCssVars } = require('./design-library/composition')
      const comp = getComposition(w.compositionGrid)
      if (comp) Object.assign(out, compositionToCssVars(comp))
    } catch { /* optional */ }
  }

  return out
}

/* ─── Neutral starting world ───────────────────────────────────────
   Used during intake when no brand world has been generated yet.
   White, basic, focused — exactly per the spec's "neutral starting mode".
*/
export const NEUTRAL_WORLD: BrandWorld = {
  industry:         'unknown',
  brandPersonality: 'neutral',
  visualDirection:  'White-on-white intake. No theming yet — first collect, then theme.',
  avoid:            ['Generic AI cliché', 'Dark gradients', 'Glowing orbs', 'Glassmorphism'],
  whyThisWorks:     'The intake form stays neutral so the user focuses on input. The brand world generates after sources are collected.',

  colour: {
    background:   '#FFFFFF',
    surface:      '#FFFFFF',
    surfaceSoft:  '#F8F9FA',
    primary:      '#0F1115',
    primarySoft:  'rgba(15, 17, 21, 0.08)',
    secondary:    '#3B5BDB',
    accent:       '#0F1115',
    text:         '#0F1115',
    textMuted:    '#6B7280',
    border:       'rgba(15, 17, 21, 0.10)',
    success:      '#137a4a',
    warning:      '#a86a00',
    error:        '#b0322b',
    gridLine:     'rgba(15, 17, 21, 0.04)',
    glow:         'transparent',
  },
  typography: {
    heading:        'Inter',
    body:           'Inter',
    mono:           'JetBrains Mono',
    style:          'geometric-sans',
    headingWeight:  '700',
    bodyWeight:     '400',
    tracking:       '-0.02em',
  },

  motifs:           ['blank canvas'],
  layoutStyle:      'workspace-clean',
  cardStyle:        'minimal-line',
  buttonStyle:      'rounded',
  iconStyle:        'line',
  motionStyle:      'minimal',
  dataVizStyle:     'sparkline',
  backgroundSystem: 'plain white, no patterns',
  radius:           14,
  density:          'normal',

  visualRichness:   'balanced',
  effects: {
    gridOverlay:    false,
    radialAmbient:  false,
    heroWatermark:  false,
    monoLabels:     false,
    glow:           false,
    grainOverlay:   false,
  },

  deckTheme:        'Neutral starting deck — overridden once the world generates.',
  deckMode:         'light',

  origin: { primaryFrom: 'industry-default', fontsFrom: 'industry-default' },
}
