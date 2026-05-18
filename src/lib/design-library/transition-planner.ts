/* ════════════════════════════════════════════════════════════════════
   TRANSITION PLANNER — narrative-anchored, no-repeat scheduling.

   Every slide gets its own transition based on:
     1. Story role (intro = arrival, problem = impact, ask = finale, etc.)
     2. The constraint that NO two consecutive slides share a transition
     3. Brand-world influence (restrained brands skip glitch + vortex)
     4. A stable per-founder seed so the assignment is consistent

   Replaces the old hardcoded SLIDE_DEFS.tx mapping which gave every
   founder the same transition for every slide type. Now Andreas mixes
   the rhythm so the deck never feels mechanical.
═══════════════════════════════════════════════════════════════════ */

export type Transition = 'zoom-passage' | 'explode' | 'fold' | 'warp' | 'glitch' | 'dropzoom' | 'prism' | 'vortex'

const ALL: Transition[] = ['zoom-passage','explode','fold','warp','glitch','dropzoom','prism','vortex']

/** Per-slide AFFINITIES — which transitions fit the slide's narrative role.
 *  Higher score = better fit. Used by the planner as a preference order.
 *  Transitions NOT listed score 0 (still legal as a fallback). */
const AFFINITY: Record<string, Partial<Record<Transition, number>>> = {
  // INTRO — arrival feel: zoom-passage primary, prism for splash, dropzoom for entrance
  s1_intro:        { 'zoom-passage': 10, 'prism': 7, 'dropzoom': 6, 'warp': 4 },
  // SITUATION — context-setting: fold (reveal) or warp (perspective shift)
  s2_situation:    { 'fold': 9, 'warp': 8, 'zoom-passage': 5, 'prism': 4 },
  // PROBLEM — impact: explode (signature) for visceral pain, glitch for tension
  s3_problem:      { 'explode': 10, 'glitch': 8, 'dropzoom': 6, 'fold': 4 },
  // IMPLICATION — collapse / heavy: fold (hinge down), dropzoom (plummet)
  s4_implication:  { 'fold': 10, 'dropzoom': 9, 'vortex': 6, 'explode': 5 },
  // FIX — relief / opening: warp (new perspective), zoom-passage (forward), prism
  s5_fix:          { 'warp': 9, 'zoom-passage': 8, 'prism': 7, 'fold': 5 },
  // HOW — mechanical / methodical: warp, fold, sequence feel
  s6_how:          { 'warp': 9, 'fold': 8, 'glitch': 5, 'prism': 5 },
  // VALIDATION — proof / energy: glitch (data crackle), explode, dropzoom
  s7_validation:   { 'glitch': 10, 'explode': 8, 'dropzoom': 7, 'zoom-passage': 5 },
  // MARKET — sizing / scale: dropzoom (scale-down to fit), glitch (data), prism
  s8_market:       { 'dropzoom': 9, 'glitch': 8, 'prism': 6, 'warp': 5 },
  // CUSTOMERS — humanise: explode (scattered humans), fold (reveal personas)
  s9_customers:    { 'explode': 9, 'fold': 7, 'zoom-passage': 6, 'warp': 5 },
  // COMPETITION — comparison / positioning: dropzoom (battlefield), prism
  s10_competition: { 'dropzoom': 9, 'prism': 8, 'glitch': 6, 'fold': 5 },
  // RISKS — caution / weight: fold, dropzoom (gravity), warp
  s11_risks:       { 'fold': 9, 'dropzoom': 7, 'warp': 6, 'glitch': 4 },
  // TEAM & ASK — closing flourish: vortex (finale collapse), prism (sparkle)
  s12_team_ask:    { 'vortex': 10, 'prism': 9, 'zoom-passage': 7, 'fold': 5 },
}

/** Brand-world tunings — restrained brands skip the loudest transitions. */
function legalForBrand(world: any): Set<Transition> {
  const richness = world?.visualRichness
  if (richness === 'restrained') {
    return new Set(['zoom-passage','fold','warp','prism'])
  }
  if (richness === 'balanced') {
    // Allow everything except the rarest dramatic ones for a calmer feel
    return new Set(['zoom-passage','explode','fold','warp','dropzoom','prism','glitch'])
  }
  // rich + maximal: all 8
  return new Set(ALL)
}

function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

/** Plan transitions for the whole deck.
 *  - Honours any existing overrides (returned as-is)
 *  - No two CONSECUTIVE slides share a transition
 *  - Each slide picks the highest-affinity transition that's still legal
 *  - Uses a stable djb2(company) seed so the assignment is deterministic */
export function planTransitions(
  slideIds: string[],
  brandWorld: any,
  companyName: string,
  existing?: Record<string, string>,
): Record<string, Transition> {
  const seed = djb2(companyName || 'signaldeck')
  const legal = legalForBrand(brandWorld)
  const plan: Record<string, Transition> = {}
  let prev: Transition | null = null

  slideIds.forEach((id, idx) => {
    // If the founder already set this slide, honour it.
    if (existing && existing[id] && (ALL as string[]).includes(existing[id])) {
      plan[id] = existing[id] as Transition
      prev = plan[id]
      return
    }

    const affinities = AFFINITY[id] || {}
    // Rank legal transitions by affinity (desc), then by a stable per-slide
    // tie-breaker derived from the seed so different founders get different
    // ties broken differently.
    const ranked: Array<{ tx: Transition; score: number }> = ALL
      .filter(tx => legal.has(tx))
      .map(tx => ({ tx, score: (affinities[tx] || 0) + ((seed + idx * 13 + djb2(tx)) % 7) / 100 }))
      .sort((a, b) => b.score - a.score)

    // Pick the highest-ranked that isn't the same as previous. If only the
    // previous transition is legal (very restrained brand on a tiny deck),
    // fall through and accept the repeat as a graceful degradation.
    const picked = ranked.find(r => r.tx !== prev)?.tx ?? ranked[0]?.tx ?? 'zoom-passage'
    plan[id] = picked
    prev = picked
  })

  return plan
}

/** Tiny helper for the workspace: report which slides got bumped because of
 *  the no-back-to-back constraint. Useful for explaining the picks to founders. */
export function explainPlan(slideIds: string[], plan: Record<string, Transition>): string[] {
  const notes: string[] = []
  slideIds.forEach((id, i) => {
    const aff = AFFINITY[id] || {}
    const top = Object.entries(aff).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]
    if (top && top[0] !== plan[id]) {
      notes.push(`${id}: prefers "${top[0]}" but used "${plan[id]}" to avoid back-to-back repeat`)
    }
  })
  return notes
}

/* ─── LAYOUT RHYTHM ────────────────────────────────────────────────────
   Avoid two consecutive slides with similar layout "shape" — even if the
   variants are technically different. A 3-card grid (s3 card-grid) followed
   by another 3-card grid (s9 archetype-cards) reads monotonous; we'd rather
   the second slide flip to a different shape. */

/** Coarse shape signature each variant collapses to. */
const SHAPE: Record<string, string> = {
  // 3-CARD-GRID family
  'card-grid':         'grid3',
  'archetype-cards':   'grid3',
  'three-pillar':      'grid3',
  'why-now-triple':    'grid3',
  // 5-CHIP-ROW family
  'checks-row':        'row5',
  'icon-grid':         'grid-many',
  // BIG-NUMBER family
  'hero-number':       'hero-num',
  'stat-overlay':      'hero-num',
  'cost-counter':      'hero-num',
  'one-big-thing':     'hero-num',
  // SPLIT 2-COL family
  'before-state':      'split2',
  'before-after':      'split2',
  'before-after-world':'split2',
  'split-cta':         'split2',
  'positioning-grid':  'split2',
  'split-editorial':   'split2',
  // QUOTE family
  'quote-evidence':    'quotes',
  'quote-stack':       'quotes',
  'persona-quotes':    'quotes',
  'risk-narrative':    'quotes',
  // TIMELINE / FLOW family
  'timeline-vertical': 'flow',
  'shift-timeline':    'flow',
  'milestone-road':    'flow',
  'risk-timeline':     'flow',
  'sequence-arrows':   'flow',
  'step-flow':         'flow',
  'loss-frame':        'flow',
  'risk-fan':          'flow',
  // CHART family
  'cohort-curve':      'chart',
  'comparison-radar':  'chart',
  'growth-curve':      'chart',
  'risk-radar':        'chart',
  'convergence':       'chart',
  // MATRIX / TABLE family
  'matrix':            'matrix',
  'status-quo-failure':'matrix',
  'tam-sam-som':       'rings',
  'waterfall-bars':    'bars',
  'verticals':         'grid3',
  'logo-wall':         'grid-many',
  // PHONE / PRODUCT family
  'phone-mockup':      'product',
  // MISC
  'massive-display':   'hero-num',
  'minimal-centered':  'centered',
  'mitigation-pairs':  'split2',
  'team-grid':         'grid3',
  'cap-table':         'grid3',
  'arch-stack':        'flow',
  'inputs-outputs':    'split2',
}

/** Plan layout variants for the whole deck so no two consecutive slides
 *  share a shape family. Returns Record<slideId, variantId>. */
export function planLayoutRhythm(
  slideIds: string[],
  availableVariantsBySlide: Record<string, string[]>,
  companyName: string,
  existing?: Record<string, string>,
): Record<string, string> {
  const seed = djb2(companyName || 'signaldeck')
  const plan: Record<string, string> = {}
  let prevShape: string | null = null

  slideIds.forEach((id, idx) => {
    if (existing && existing[id]) {
      plan[id] = existing[id]
      prevShape = SHAPE[existing[id]] || null
      return
    }
    const variants = availableVariantsBySlide[id] || []
    if (!variants.length) return

    // Score each variant: 1 base + bonus when its shape differs from prev
    // + a stable per-founder tiebreaker.
    const ranked = variants.map((v) => {
      const shape = SHAPE[v] || 'misc'
      const diffBonus = (prevShape && shape !== prevShape) ? 10 : 0
      const tieBreak = ((seed + idx * 17 + djb2(v)) % 11) / 100
      return { v, score: 1 + diffBonus + tieBreak, shape }
    }).sort((a, b) => b.score - a.score)

    const picked = ranked[0]
    plan[id] = picked.v
    prevShape = picked.shape
  })

  return plan
}
