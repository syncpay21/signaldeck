/* ════════════════════════════════════════════════════════════════════
   INDUSTRY GUIDE — extracted from design-reference.html INDUSTRIES[]

   16-industry design system. Each entry pins the font stack
   (display / body / data), accent + 5-stop palette, recommended
   transitions, tone direction, and an explicit "avoid" list so the
   per-client prompt can apply the right design choices instantly.

   Used by /api/generate to drive theme + by the per-client HTML
   pitchdeck builder to pick fonts/palette/transitions without
   re-reading the 894-line reference file each run.
═══════════════════════════════════════════════════════════════════ */

export type IndustryKey =
  | 'fintech' | 'legal' | 'property' | 'health' | 'tech' | 'retail'
  | 'media' | 'hospitality' | 'construction' | 'edtech' | 'climate'
  | 'fashion' | 'food' | 'gov' | 'sports' | 'creative'

export interface IndustryGuide {
  key:         IndustryKey
  name:        string          // human label
  color:       string          // primary accent hex
  display:     string          // Google Font for hero headlines
  body:        string          // Google Font for body
  data:        string          // mono / numeric stack
  palette:     [string, string, string, string, string]  // accent · ink · accent2 · muted · paper
  transitions: string[]        // recommended motion (3–5 entries)
  tone:        string          // copy direction for the AI writer
  avoid:       string[]        // hard "no" list — breaks the brand if used
}

export const INDUSTRIES: Record<IndustryKey, IndustryGuide> = {
  fintech:      { key:'fintech',      name:'Fintech / Payments',       color:'#00e5c3', display:'Barlow Condensed',  body:'DM Sans',     data:'DM Mono',         palette:['#00e5c3','#06080d','#00bfa0','#7a8fa8','#eef2f7'], transitions:['zoom-passage','reveal-wipe','fold','glitch'],         tone:'Authoritative, data-dense, fast. Every claim needs a number behind it. Trust is earned through precision — not warmth.',                          avoid:['Script fonts','Warm amber palettes','Slow decorative transitions','Serif-heavy layouts'] },
  legal:        { key:'legal',        name:'Legal / Professional',     color:'#748ffc', display:'Libre Baskerville', body:'IBM Plex Sans',data:'IBM Plex Mono',  palette:['#3b5bdb','#080c18','#748ffc','#6677a8','#eef0f8'], transitions:['fold','zoom-passage','reveal-up'],                     tone:'Gravitas without opacity. Structured argument, zero decoration. The logo does not need to do the work — the copy does.',                          avoid:['Condensed display fonts','Bright neon palettes','Glitch or disruptive transitions','Startup energy'] },
  property:     { key:'property',     name:'Real Estate / Property',   color:'#c9953a', display:'Gloock',            body:'Urbanist',    data:'IBM Plex Mono',   palette:['#c9953a','#0d0a07','#e0b96a','#7a6a52','#f5f0e8'], transitions:['fold','reveal-up','zoom-passage'],                     tone:'Aspirational but grounded. Show the scale. Headlines earn their space. Photography is the product — let it breathe.',                            avoid:['Startup aggression','Neon palettes','Fast scattered transitions','Tech-forward mono stacking'] },
  health:       { key:'health',       name:'Healthcare / Medical',     color:'#34d399', display:'Lexend',            body:'Nunito',      data:'Roboto Mono',     palette:['#22c55e','#060d09','#4ade80','#6a9476','#edfaf3'], transitions:['reveal-up','reveal-stagger','fold'],                   tone:'Human-first. Clinical trust without cold distance. Outcomes over features. No jargon — concrete numbers only.',                                   avoid:['Dark aggressive palettes','Sharp condensed fonts','Glitch or warp transitions','Startup disruption language'] },
  tech:         { key:'tech',         name:'Technology / SaaS',        color:'#6b9fff', display:'Barlow Condensed',  body:'Inter',       data:'JetBrains Mono',  palette:['#3b82f6','#05080f','#93c5fd','#6480a8','#eff6ff'], transitions:['glitch','zoom-passage','reveal-stagger'],              tone:'Ship fast, show proof. Data-backed claims, live metrics on every slide. The interface IS the pitch.',                                            avoid:['Serif-heavy decks','Warm gold palettes','Slow ceremonial transitions','Decorative scripts'] },
  retail:       { key:'retail',       name:'Consumer / Retail',        color:'#f97316', display:'Bebas Neue',        body:'Poppins',     data:'Space Mono',      palette:['#f97316','#0e0a07','#fb923c','#8a7060','#fdf4ec'], transitions:['reveal-stagger','explode','reveal-up'],                tone:'Desire first, logic second. Visual richness, specific customer language. Outcomes over specs — benefits over features.',                          avoid:['Cold technical palettes','Monospace-heavy layouts','Corporate serif stacking','Dense data slides'] },
  media:        { key:'media',        name:'Media / Publishing',       color:'#fb7185', display:'Playfair Display', body:'Spectral',    data:'Roboto Mono',     palette:['#e11d48','#0d0608','#fb7185','#8a5a64','#fdedf0'], transitions:['reveal-wipe','fold','dropzoom'],                       tone:'Attention economy rules. Authority through editorial restraint. Headlines carry the full weight — copy supports, not explains.',                  avoid:['Startup violet','Friendly rounded fonts','Scattered animation','Pastel or wellness palettes'] },
  hospitality:  { key:'hospitality',  name:'Hospitality / Luxury',     color:'#c9a84c', display:'Cormorant Garamond',body:'Raleway',     data:'Courier Prime',   palette:['#c9a84c','#0e0c0b','#e8c97e','#7a6e64','#f5f0ea'], transitions:['prism','fold','reveal-up'],                            tone:'Never announce luxury — demonstrate it through restraint. White space is amenity. Every word earns its place.',                                   avoid:['Condensed display fonts','Bright neon','Rushed pacing','Startup language','Data-dense layouts'] },
  construction: { key:'construction', name:'Construction / Industrial',color:'#f59e0b', display:'Oswald',            body:'Cabin',       data:'IBM Plex Mono',   palette:['#f59e0b','#0b0900','#fcd34d','#7a6a40','#fefce8'], transitions:['reveal-wipe','fold','dropzoom'],                       tone:'Strength through specificity. Project scale, material clarity, delivery confidence. No abstract language — show the work.',                       avoid:['Luxury serif stacks','Pastel palettes','Experimental creative fonts','Thin weights'] },
  edtech:       { key:'edtech',       name:'Education / Edtech',       color:'#818cf8', display:'Lexend',            body:'Rubik',       data:'Fira Mono',       palette:['#6366f1','#07080f','#818cf8','#6670a8','#eef0ff'], transitions:['reveal-stagger','reveal-up','explode'],                tone:'Progress is measurable. Empower without condescension. Warm but credible. Show outcomes as concrete numbers — not sentiment.',                    avoid:['Cold fintech aesthetics','Heavy condensed display','Slow corporate transitions','Clinical distance'] },
  climate:      { key:'climate',      name:'Climate / Impact',         color:'#34d399', display:'Figtree',           body:'Work Sans',   data:'Source Code Pro', palette:['#10b981','#050e0b','#34d399','#5f8a78','#ecfdf5'], transitions:['reveal-up','reveal-stagger','zoom-passage'],           tone:'Data over emotion — but emotion still matters. Urgency without panic. Proof in every slide. Mission before product.',                              avoid:['Greenwashing palette clichés','Script fonts','Overly corporate blue','Polished stock photography'] },
  fashion:      { key:'fashion',      name:'Fashion & Beauty',         color:'#f9a8d4', display:'Bodoni Moda',       body:'Raleway',     data:'Courier Prime',   palette:['#ec4899','#0c080b','#f9a8d4','#8a5a70','#fdf2f8'], transitions:['prism','fold','reveal-wipe'],                          tone:'The product speaks. Copy exists only to frame the image. Confidence over explanation — presence over persuasion.',                                avoid:['Technical monospace','Corporate sans','Data-heavy layouts','Explanatory slides'] },
  food:         { key:'food',         name:'Food & Beverage',          color:'#fbbf24', display:'Fraunces',          body:'Raleway',     data:'Caveat',          palette:['#d97706','#0c0906','#fbbf24','#7a6040','#fdf6ec'], transitions:['reveal-up','prism','fold'],                            tone:'Appetite is emotional. Describe texture, origin, experience — not ingredients. Warmth before structure. Story before spec.',                        avoid:['Cold tech palettes','Condensed industrial fonts','Hard-edge geometric layouts','Corporate language'] },
  gov:          { key:'gov',          name:'Government / Non-profit',  color:'#94a3b8', display:'Merriweather',      body:'Noto Sans',   data:'IBM Plex Mono',   palette:['#475569','#080a0d','#94a3b8','#5a6880','#f1f5f9'], transitions:['fold','reveal-up','zoom-passage'],                     tone:'Trust through clarity. Accessible language. Impact in measurable community outcomes. No jargon, no startup speak.',                                avoid:['Startup disruption energy','Neon or aggressive palettes','Experimental typography','Motion-heavy slides'] },
  sports:       { key:'sports',       name:'Sports & Fitness',         color:'#a3e635', display:'Barlow Condensed',  body:'Oswald',      data:'Teko',            palette:['#a3e635','#060800','#d9f99d','#607040','#f7fee7'], transitions:['dropzoom','glitch','reveal-stagger'],                  tone:'Motion is the message. Performance metrics dominate. Energy transferred through type weight alone — no decoration needed.',                        avoid:['Serif-heavy layouts','Muted palettes','Slow ceremonial transitions','Soft friendly fonts'] },
  creative:     { key:'creative',     name:'Creative / Agency',        color:'#a855f7', display:'Playfair Display', body:'Work Sans',   data:'JetBrains Mono',  palette:['#a855f7','#0a060f','#c084fc','#7a60a8','#faf5ff'], transitions:['explode','warp','prism'],                              tone:'The work is the credential. Bold editorial choices. Every element intentional — and at least slightly unexpected.',                                avoid:['Generic sans-serif defaults','Predictable grid layouts','Safe neutral palettes','Explanatory copy'] },
}

/* ── Helpers ──────────────────────────────────────────────────────── */

export function getIndustryGuide(key?: string): IndustryGuide {
  if (!key) return INDUSTRIES.tech
  const k = key.toLowerCase() as IndustryKey
  return INDUSTRIES[k] || INDUSTRIES.tech
}

/** Map a free-text industry label (from intake) to a canonical key. */
export function resolveIndustry(label?: string): IndustryKey {
  if (!label) return 'tech'
  const s = label.toLowerCase()
  if (/(fintech|payment|finance|bank|lending)/.test(s))             return 'fintech'
  if (/(legal|law|firm|attorney)/.test(s))                          return 'legal'
  if (/(property|real estate|realty|housing|prop[-\s]?tech)/.test(s)) return 'property'
  if (/(health|medical|clinic|hospital|biotech|pharma)/.test(s))    return 'health'
  if (/(saas|software|dev[-\s]?tool|api|infra|cloud|tech|ai|ml)/.test(s)) return 'tech'
  if (/(retail|consumer|ecommerce|d2c|brand|cpg)/.test(s))          return 'retail'
  if (/(media|publish|news|content|stream)/.test(s))                return 'media'
  if (/(hospitality|hotel|luxury|travel|resort)/.test(s))           return 'hospitality'
  if (/(construction|industrial|manufactur|build)/.test(s))         return 'construction'
  if (/(edu|edtech|school|learn|university)/.test(s))               return 'edtech'
  if (/(climate|sustainab|carbon|impact|esg|green)/.test(s))        return 'climate'
  if (/(fashion|beauty|cosmetic|apparel)/.test(s))                  return 'fashion'
  if (/(food|beverage|restaurant|grocery|dining)/.test(s))          return 'food'
  if (/(gov|non[-\s]?profit|public|civic|policy)/.test(s))          return 'gov'
  if (/(sport|fitness|athletic|wellness|gym)/.test(s))              return 'sports'
  if (/(creative|agency|design|studio|art)/.test(s))                return 'creative'
  return 'tech'
}

/** Generate the Google Fonts URL for an industry's font stack. */
export function fontsUrl(g: IndustryGuide): string {
  const families = [g.display, g.body, g.data].filter(Boolean)
    .map(f => `family=${f.replace(/\s+/g, '+')}:wght@400;500;600;700;800;900`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}
