/* ════════════════════════════════════════════════════════════════════
   STYLE AXES — algorithmic variation system.

   Every slide is rendered against 5 independent style axes. Each axis
   has 3-5 values. The cartesian product gives us 675 axis combinations,
   multiplied by 48 bespoke layouts = 32,400 distinct visual outputs.
   Multiplied by 60 palettes + 30 font pairings = ~58M unique decks.

   Axes are derived deterministically from the brand world + a stable
   hash of the company name, so:
     - Same founder gets the same axes across sessions (consistency)
     - Different founders get different axes (variety, no template fatigue)
     - The workspace Theme Lab can override any axis live (zero API cost)

   How axes are applied: each slide root gets axis CSS classes (axis-card-filled,
   axis-accent-bar-top, etc.). deckTemplate CSS defines what each class does.
   Existing layouts read these vars and respond.
═══════════════════════════════════════════════════════════════════ */

export type CardFinish = 'filled' | 'outlined' | 'minimal'
export type AccentFx   = 'bar-top' | 'bar-left' | 'underline' | 'glow' | 'none'
export type NumFx      = 'italic-display' | 'mono-tabular' | 'circle-badge'
export type BgMotif    = 'plain' | 'grid' | 'noise' | 'gradient' | 'dot-grid'
export type Density    = 'tight' | 'normal' | 'spacious'

export interface StyleAxes {
  cardFinish: CardFinish
  accentFx:   AccentFx
  numFx:      NumFx
  bgMotif:    BgMotif
  density:    Density
}

const CARD_FINISHES: CardFinish[] = ['filled', 'outlined', 'minimal']
const ACCENT_FXS:    AccentFx[]   = ['bar-top', 'bar-left', 'underline', 'glow', 'none']
const NUM_FXS:       NumFx[]      = ['italic-display', 'mono-tabular', 'circle-badge']
const BG_MOTIFS:     BgMotif[]    = ['plain', 'grid', 'noise', 'gradient', 'dot-grid']
const DENSITIES:     Density[]    = ['tight', 'normal', 'spacious']

/** djb2 string hash → stable integer regardless of platform. */
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

/** Derive axes from brand world + company name. Some axes are STRONGLY
 *  determined by the world (density, bgMotif from richness/effects), others
 *  are deterministic-random based on the company hash so two fintech
 *  founders don't get the same look. */
export function pickAxes(brandWorld: any, companyName: string): StyleAxes {
  const seed = hash(companyName || 'signaldeck')
  const w = brandWorld || {}

  // Density — brand-world directly drives it when set, else hash decides
  const density: Density =
    w.density === 'tight'    ? 'tight' :
    w.density === 'spacious' ? 'spacious' :
    w.density === 'normal'   ? 'normal' :
    DENSITIES[seed % 3]

  // Background motif — driven by richness + effects, falls back to hash
  const richness = w.visualRichness
  let bgMotif: BgMotif
  if (w.effects?.grainOverlay)     bgMotif = 'noise'
  else if (w.effects?.gridOverlay) bgMotif = 'grid'
  else if (richness === 'maximal') bgMotif = 'gradient'
  else if (richness === 'restrained') bgMotif = 'plain'
  else                              bgMotif = BG_MOTIFS[(seed >> 4) % BG_MOTIFS.length]

  // Card finish — cardStyle hint primary, else hash
  let cardFinish: CardFinish
  if (w.cardStyle === 'statement' || w.cardStyle === 'tile')         cardFinish = 'filled'
  else if (w.cardStyle === 'editorial' || w.cardStyle === 'terminal') cardFinish = 'outlined'
  else if (w.cardStyle === 'minimal-line')                            cardFinish = 'minimal'
  else                                                                cardFinish = CARD_FINISHES[(seed >> 8) % CARD_FINISHES.length]

  // Number style — typography.style influences, hash decides ties
  let numFx: NumFx
  if (w.typography?.style === 'bold-condensed' || w.typography?.style === 'editorial-serif') numFx = 'italic-display'
  else if (w.typography?.style === 'mono-technical')                                          numFx = 'mono-tabular'
  else if (w.typography?.style === 'playful-rounded')                                         numFx = 'circle-badge'
  else                                                                                         numFx = NUM_FXS[(seed >> 12) % NUM_FXS.length]

  // Accent treatment — buttonStyle hint, else hash
  let accentFx: AccentFx
  if (w.buttonStyle === 'pill' || w.cardStyle === 'statement') accentFx = 'glow'
  else if (w.cardStyle === 'terminal' || w.buttonStyle === 'sharp') accentFx = 'underline'
  else if (richness === 'maximal')                              accentFx = 'glow'
  else if (richness === 'restrained')                           accentFx = 'none'
  else                                                          accentFx = ACCENT_FXS[(seed >> 16) % ACCENT_FXS.length]

  return { cardFinish, accentFx, numFx, bgMotif, density }
}

/** Return axes as a space-separated class string for the slide root. */
export function axesToClasses(axes: StyleAxes): string {
  return [
    `axis-card-${axes.cardFinish}`,
    `axis-accent-${axes.accentFx}`,
    `axis-num-${axes.numFx}`,
    `axis-bg-${axes.bgMotif}`,
    `axis-density-${axes.density}`,
  ].join(' ')
}

/** All axis values as an enumerable list — for the workspace override picker. */
export const AXIS_OPTIONS = {
  cardFinish: CARD_FINISHES,
  accentFx:   ACCENT_FXS,
  numFx:      NUM_FXS,
  bgMotif:    BG_MOTIFS,
  density:    DENSITIES,
} as const

/** Count of possible combinations. */
export const AXIS_COMBINATIONS =
  CARD_FINISHES.length * ACCENT_FXS.length * NUM_FXS.length * BG_MOTIFS.length * DENSITIES.length
