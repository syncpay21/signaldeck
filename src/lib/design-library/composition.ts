/* ════════════════════════════════════════════════════════════════════
   COMPOSITION GRIDS — 6 classical layout grammars.

   Every slide today picks an ad-hoc grid (1fr 1fr, 1.4fr 0.9fr, etc).
   This module names the grammars so Andreas can reason about WHY a
   layout works:
     - Golden Section (1.618:1) — the most-studied ratio in visual art
     - Rule of Thirds — three equal columns, gallery convention
     - Centred Axis — symmetric, oratorical; quote / manifesto / ask
     - Asymmetric Weight — editorial split, 1.4fr / 0.9fr
     - Four-Up Grid — quadrant matrix, 2x2

   Pick one with pickComposition(slideId, archetype) — recommendations
   bake in archetype affinity (Sage / Creator gravitate to golden +
   centred; Hero / Outlaw to asymmetric + four-up).
═══════════════════════════════════════════════════════════════════ */

export interface Composition {
  id:               string
  name:             string
  /** CSS value for `grid-template`. May include both columns and rows. */
  gridTemplate:     string
  /** CSS value for `gap`. */
  gutter:           string
  /** CSS value for `padding`. */
  padding:          string
  /** Slide ids this composition flatters. */
  suitableSlides:   string[]
  /** Slide ids this composition should NOT be used for. */
  avoidSlides:      string[]
  /** 1-sentence rationale Andreas can quote back to the founder. */
  rationale:        string
}

export const COMPOSITIONS: Composition[] = [
  {
    id: 'golden-vertical',
    name: 'Golden Section — Vertical',
    gridTemplate: '1.618fr 1fr / auto',
    gutter: 'clamp(32px, 4vw, 64px)',
    padding: 'clamp(48px, 6vw, 96px)',
    suitableSlides: ['hero', 'why-now', 'solution', 'market', 'team'],
    avoidSlides: ['ask', 'quote'],
    rationale: 'The 1.618:1 split places the headline on the larger panel and supporting data on the smaller — the most-studied proportion in visual composition.',
  },
  {
    id: 'golden-horizontal',
    name: 'Golden Section — Horizontal',
    gridTemplate: 'auto / 100% / 61.8% 38.2%',
    gutter: 'clamp(24px, 3vw, 48px)',
    padding: 'clamp(48px, 6vw, 96px)',
    suitableSlides: ['product', 'demo', 'how', 'validation'],
    avoidSlides: ['competition', 'cap-table'],
    rationale: 'Image-led slides where the visual lives in the upper 61.8% and the legend / caption sits beneath at 38.2%.',
  },
  {
    id: 'thirds-stacked',
    name: 'Rule of Thirds',
    gridTemplate: 'auto / repeat(3, 1fr)',
    gutter: 'clamp(20px, 2.4vw, 32px)',
    padding: 'clamp(48px, 6vw, 96px)',
    suitableSlides: ['problem', 'three-pillar', 'comparison', 'how', 'gtm'],
    avoidSlides: ['hero', 'ask', 'quote'],
    rationale: 'Three equal columns — the rule of thirds. Use when the argument is built from three coordinate parts (pain points, pillars, phases).',
  },
  {
    id: 'centered-axis',
    name: 'Centred Axis',
    gridTemplate: 'auto / 1fr min(60ch, 70%) 1fr',
    gutter: 'clamp(16px, 2vw, 24px)',
    padding: 'clamp(56px, 8vw, 128px)',
    suitableSlides: ['ask', 'quote', 'manifesto', 'closing', 'why-us'],
    avoidSlides: ['competition', 'cap-table', 'market'],
    rationale: 'Symmetric on a central vertical axis. Oratorical, ceremonial — reserve for the deck\'s emotional beats (the ask, a manifesto, a customer quote).',
  },
  {
    id: 'asymmetric-weight',
    name: 'Asymmetric Weight',
    gridTemplate: 'auto / 1.4fr 0.9fr',
    gutter: 'clamp(24px, 3vw, 48px)',
    padding: 'clamp(48px, 6vw, 96px)',
    suitableSlides: ['solution', 'product', 'why-now', 'validation', 'traction'],
    avoidSlides: ['ask', 'quote'],
    rationale: 'Editorial split — primary content on the left at 1.4fr, supporting evidence on the right at 0.9fr. Reads like a magazine spread.',
  },
  {
    id: 'four-up-grid',
    name: 'Four-Up Grid',
    gridTemplate: 'repeat(2, 1fr) / repeat(2, 1fr)',
    gutter: 'clamp(20px, 2.4vw, 32px)',
    padding: 'clamp(40px, 5vw, 72px)',
    suitableSlides: ['competition', 'matrix', 'metrics', 'team', 'logos'],
    avoidSlides: ['hero', 'ask', 'quote', 'manifesto'],
    rationale: '2×2 quadrant matrix. Use when comparing four entities along two axes or showing four equal-weight metrics.',
  },
]

/* Archetype affinity — which compositions feel native to which archetype.
 * First entry is the strongest preference. Used by pickComposition() to
 * break ties when multiple compositions are suitable for a slide. */
const ARCHETYPE_AFFINITY: Record<string, string[]> = {
  sage:      ['golden-vertical', 'centered-axis', 'thirds-stacked'],
  creator:   ['golden-vertical', 'asymmetric-weight', 'golden-horizontal'],
  ruler:     ['centered-axis', 'golden-vertical', 'four-up-grid'],
  hero:      ['asymmetric-weight', 'four-up-grid', 'thirds-stacked'],
  outlaw:    ['asymmetric-weight', 'four-up-grid', 'centered-axis'],
  magician:  ['centered-axis', 'golden-horizontal', 'asymmetric-weight'],
  lover:     ['golden-horizontal', 'centered-axis', 'golden-vertical'],
  caregiver: ['thirds-stacked', 'golden-vertical', 'centered-axis'],
  jester:    ['four-up-grid', 'thirds-stacked', 'asymmetric-weight'],
  everyman:  ['thirds-stacked', 'four-up-grid', 'golden-vertical'],
  innocent:  ['golden-vertical', 'centered-axis', 'thirds-stacked'],
  explorer:  ['asymmetric-weight', 'golden-horizontal', 'thirds-stacked'],
}

export function getComposition(id: string): Composition | undefined {
  return COMPOSITIONS.find(c => c.id === id)
}

/** Pick the best composition for a given slide + archetype.
 *  Ranking: avoid-list (hard veto) → archetype affinity → suitableSlides match.
 *  Returns the chosen Composition plus a list of also-suitable runners-up. */
export function pickComposition(
  slideId: string,
  archetypeId?: string,
): { composition: Composition; alternates: Composition[] } {
  const sid = slideId.toLowerCase()
  // Filter: any composition that explicitly avoids this slide is vetoed.
  const eligible = COMPOSITIONS.filter(c => !c.avoidSlides.some(s => sid.includes(s)))
  // Score by: suitable match (2 pts) + archetype affinity (3 / 2 / 1 pts).
  const affinity = (archetypeId && ARCHETYPE_AFFINITY[archetypeId]) || []
  const scored = eligible.map(c => {
    let score = 0
    if (c.suitableSlides.some(s => sid.includes(s))) score += 2
    const rank = affinity.indexOf(c.id)
    if (rank === 0) score += 3
    else if (rank === 1) score += 2
    else if (rank === 2) score += 1
    return { c, score }
  }).sort((a, b) => b.score - a.score)
  const winner = scored[0]?.c || COMPOSITIONS[0]
  const alternates = scored.slice(1, 4).map(s => s.c)
  return { composition: winner, alternates }
}

/** Emit composition CSS as custom properties — for the workspace's live
 *  preview to read. The deck root element gets `--composition-grid: <value>`
 *  etc., and advanced layouts can opt-in by referencing them. */
export function compositionToCssVars(c: Composition): Record<string, string> {
  return {
    '--composition':        c.id,
    '--composition-grid':   c.gridTemplate,
    '--composition-gutter': c.gutter,
    '--composition-pad':    c.padding,
  }
}
