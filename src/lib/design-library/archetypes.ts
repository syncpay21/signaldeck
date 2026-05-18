/* ════════════════════════════════════════════════════════════════════
   BRAND ARCHETYPES — 12 Jungian archetypes with full design DNA.

   Carl Jung argued every brand maps to one of 12 universal patterns.
   We use them as a vocabulary for design coherence: once the archetype
   is fixed, palette / typography / layout / voice all become consistent
   choices instead of arbitrary ones.

   Andreas's brand-world generator picks an archetype during generation;
   the renderer uses it to bias layout dispatch + type tone; the workspace
   surfaces it so the founder can see what voice the deck is in.

   Reference grouping (Mark + Pearson, 'The Hero and the Outlaw'):
     - Independence axis:  Explorer / Innocent / Sage
     - Risk axis:          Hero / Rebel / Magician
     - Belonging axis:     Lover / Jester / Everyman
     - Stability axis:     Caregiver / Creator / Ruler
═══════════════════════════════════════════════════════════════════ */

export interface Archetype {
  id:        string
  name:      string
  axis:      'independence' | 'risk' | 'belonging' | 'stability'
  promise:   string          // 1-line — what this brand promises the customer
  voice:     string          // tone descriptors (calm, urgent, playful, etc.)
  avoid:     string[]        // anti-patterns this archetype must NOT do
  /* Design DNA — biases for palette + typography + layout when the
   * generator is undecided. Used as ranking hints, not hard rules. */
  paletteTags:     string[]   // matches PALETTE_LIBRARY tags
  typeTags:        string[]   // matches TYPE_PAIRS tags
  layoutBias:      string[]   // preferred slide variants for ambiguous slides
  exemplarBrands:  string[]   // real brands embodying this archetype
}

export const ARCHETYPES: Archetype[] = [
  /* ─── INDEPENDENCE ─────────────────────────────────────── */
  {
    id: 'explorer',
    name: 'The Explorer',
    axis: 'independence',
    promise: "Freedom to discover what's out there",
    voice: 'restless, curious, frontier-minded',
    avoid: ['conformity', 'corporate polish', 'safety-first language'],
    paletteTags: ['warm', 'organic', 'sustainable', 'balanced'],
    typeTags: ['humanist', 'geometric', 'condensed'],
    layoutBias: ['why-now-triple', 'phone-mockup', 'sequence-arrows'],
    exemplarBrands: ['Patagonia', 'Jeep', 'The North Face', 'Subaru'],
  },
  {
    id: 'innocent',
    name: 'The Innocent',
    axis: 'independence',
    promise: 'Things can be simple, honest, good',
    voice: 'optimistic, plain-spoken, gentle',
    avoid: ['irony', 'edge', 'dark palettes', 'aggressive type'],
    paletteTags: ['light', 'restrained', 'wellness', 'organic'],
    typeTags: ['humanist', 'playful', 'serif'],
    layoutBias: ['minimal-centered', 'archetype-cards', 'one-big-thing'],
    exemplarBrands: ['Dove', 'Coca-Cola', "McDonald's", 'Volkswagen'],
  },
  {
    id: 'sage',
    name: 'The Sage',
    axis: 'independence',
    promise: 'Truth, intelligence, expertise',
    voice: 'thoughtful, precise, authoritative without arrogance',
    avoid: ['hype', 'emotional appeals', 'oversimplification'],
    paletteTags: ['restrained', 'editorial', 'research', 'data'],
    typeTags: ['serif', 'restrained', 'editorial', 'mono'],
    layoutBias: ['split-editorial', 'cohort-curve', 'comparison-radar'],
    exemplarBrands: ['Anthropic', 'The Economist', 'Google', 'BBC', 'MIT'],
  },
  /* ─── RISK ─────────────────────────────────────────────── */
  {
    id: 'hero',
    name: 'The Hero',
    axis: 'risk',
    promise: 'Master adversity through courage and skill',
    voice: 'confident, urgent, results-led',
    avoid: ['hedging', 'soft pastels', 'editorial silence'],
    paletteTags: ['bold', 'sports', 'data', 'dark'],
    typeTags: ['bold', 'condensed', 'geometric'],
    layoutBias: ['hero-number', 'massive-display', 'milestone-road'],
    exemplarBrands: ['Nike', 'BMW', 'Whoop', 'Strava', 'FedEx'],
  },
  {
    id: 'outlaw',
    name: 'The Outlaw',
    axis: 'risk',
    promise: 'Break the rules, disrupt the system',
    voice: 'provocative, anti-establishment, blunt',
    avoid: ['safe corporate aesthetics', 'cream palettes', 'serif type'],
    paletteTags: ['loud', 'dark', 'provocative', 'bold'],
    typeTags: ['bold', 'condensed', 'brutalist'],
    layoutBias: ['anti-positioning', 'stat-overlay', 'one-big-thing'],
    exemplarBrands: ['Liquid Death', 'Cash App', 'Diesel', 'Harley-Davidson'],
  },
  {
    id: 'magician',
    name: 'The Magician',
    axis: 'risk',
    promise: 'Transform reality — make impossible feel inevitable',
    voice: 'visionary, present-tense, conviction-led',
    avoid: ['incrementalism', 'process talk', 'risk discussions'],
    paletteTags: ['ai', 'rich', 'maximal'],
    typeTags: ['geometric', 'editorial', 'mono'],
    layoutBias: ['before-after-world', 'convergence', 'arch-stack'],
    exemplarBrands: ['Apple', 'Tesla', 'Disney', 'OpenAI'],
  },
  /* ─── BELONGING ────────────────────────────────────────── */
  {
    id: 'lover',
    name: 'The Lover',
    axis: 'belonging',
    promise: 'Intimacy, beauty, sensory pleasure',
    voice: 'sensuous, refined, emotionally honest',
    avoid: ['data-heavy slides', 'technical jargon', 'cold palettes'],
    paletteTags: ['warm', 'luxury', 'feminine', 'editorial'],
    typeTags: ['editorial', 'serif', 'humanist'],
    layoutBias: ['quote-stack', 'persona-quotes', 'split-editorial'],
    exemplarBrands: ['Chanel', 'Hermès', 'Aesop', 'Glossier'],
  },
  {
    id: 'jester',
    name: 'The Jester',
    axis: 'belonging',
    promise: 'Levity — life is short, play is purposeful',
    voice: 'witty, irreverent, deflating',
    avoid: ['gravity', 'corporate seriousness', 'dark sad palettes'],
    paletteTags: ['playful', 'loud', 'consumer'],
    typeTags: ['playful', 'rounded', 'bold'],
    layoutBias: ['icon-grid', 'risk-narrative', 'three-pillar'],
    exemplarBrands: ['Old Spice', 'Mailchimp', 'Duolingo', 'Innocent Drinks'],
  },
  {
    id: 'everyman',
    name: 'The Everyman',
    axis: 'belonging',
    promise: 'Belonging, normalcy, fairness',
    voice: 'plain, accessible, no-nonsense',
    avoid: ['premium pretense', 'exclusive language', 'editorial restraint'],
    paletteTags: ['balanced', 'b2c', 'humanist'],
    typeTags: ['humanist', 'geometric', 'balanced'],
    layoutBias: ['archetype-cards', 'checks-row', 'mitigation-pairs'],
    exemplarBrands: ['IKEA', "Levi's", 'Target', 'Toyota'],
  },
  /* ─── STABILITY ────────────────────────────────────────── */
  {
    id: 'caregiver',
    name: 'The Caregiver',
    axis: 'stability',
    promise: 'Protection, support, others first',
    voice: 'warm, reassuring, service-led',
    avoid: ['aggressive type', 'self-promotion', 'cold corporate'],
    paletteTags: ['health', 'wellness', 'warm', 'balanced'],
    typeTags: ['humanist', 'serif', 'rounded'],
    layoutBias: ['archetype-cards', 'timeline-vertical', 'mitigation-pairs'],
    exemplarBrands: ['Johnson & Johnson', 'Volvo', 'Oura', 'Headspace'],
  },
  {
    id: 'creator',
    name: 'The Creator',
    axis: 'stability',
    promise: 'Make something that lasts, that matters',
    voice: 'craft-led, considered, artisanal',
    avoid: ['mass-market language', 'aggressive sales tone', 'cheap palettes'],
    paletteTags: ['editorial', 'creative', 'craft', 'restrained'],
    typeTags: ['editorial', 'serif', 'humanist'],
    layoutBias: ['split-editorial', 'three-pillar', 'arch-stack'],
    exemplarBrands: ['Adobe', 'Lego', 'Figma', 'Notion', 'Steinway'],
  },
  {
    id: 'ruler',
    name: 'The Ruler',
    axis: 'stability',
    promise: 'Order, control, premium status',
    voice: 'commanding, established, exclusive',
    avoid: ['casual tone', 'playful palettes', 'mass-market positioning'],
    paletteTags: ['luxury', 'enterprise', 'restrained', 'dark'],
    typeTags: ['editorial', 'serif', 'restrained', 'condensed'],
    layoutBias: ['cap-table', 'team-grid', 'matrix'],
    exemplarBrands: ['Rolex', 'Mercedes-Benz', 'Goldman Sachs', 'IBM'],
  },
]

export function getArchetype(id: string): Archetype | undefined {
  return ARCHETYPES.find(a => a.id === id.toLowerCase())
}

/** Infer the most likely archetype from a BrandWorld. Pure tag-matching —
 *  no AI call. Returns the archetype with the highest score, and a
 *  confidence value. */
export function inferArchetype(brandWorld: any): { archetype: Archetype; confidence: number; runnerUp?: Archetype } {
  const w = brandWorld || {}
  const tags = new Set<string>()
  // Collect tag-like signals from the brand world
  if (w.visualRichness) tags.add(w.visualRichness)
  if (w.deckMode === 'dark') tags.add('dark')
  if (w.deckMode === 'light') tags.add('light')
  if (w.industry) tags.add(String(w.industry).toLowerCase())
  if (w.layoutStyle) tags.add(String(w.layoutStyle))
  if (w.cardStyle) tags.add(String(w.cardStyle))
  // Brand personality keywords
  const personality = String(w.brandPersonality || '').toLowerCase()
  if (/bold|loud|aggressive|punchy/.test(personality)) tags.add('bold')
  if (/calm|warm|gentle|approachable/.test(personality)) tags.add('warm')
  if (/premium|luxury|refined|elegant/.test(personality)) tags.add('luxury')
  if (/technical|engineering|precise|data/.test(personality)) tags.add('data')
  if (/playful|fun|cheeky|irreverent/.test(personality)) tags.add('playful')
  if (/serious|professional|enterprise/.test(personality)) tags.add('enterprise')
  if (/research|scientific|academic/.test(personality)) tags.add('research')

  // Score each archetype by tag overlap
  const scored = ARCHETYPES.map(a => {
    const aTags = new Set([...a.paletteTags, ...a.typeTags])
    let score = 0
    for (const t of tags) if (aTags.has(t)) score += 1
    return { a, score }
  }).sort((x, y) => y.score - x.score)

  const top = scored[0]
  const second = scored[1]
  const total = Math.max(1, tags.size)
  const confidence = Math.min(100, Math.round((top.score / total) * 100))
  return {
    archetype:  top.a,
    confidence,
    runnerUp:   second && second.score > 0 ? second.a : undefined,
  }
}
