/* ════════════════════════════════════════════════════════════════════
   TYPOGRAPHY PAIRINGS LIBRARY — 40+ curated Google Fonts pairs grouped
   by personality + industry fit. Each pair is heading + body + mono
   that's been proven on real brand work.

   The brand-world generator references these as a catalog ("pick the
   best-fitting pair for THIS brand from the list") instead of guessing.
   Also exposed to the workspace as a "swap fonts" picker.
═══════════════════════════════════════════════════════════════════ */

export interface TypePair {
  id:       string
  name:     string
  vibe:     string
  tags:     string[]      // industry/mood lookup keys
  heading:  string        // Google Font name (must load)
  body:     string
  mono:     string
  /** Default weights when this pair is applied. */
  headingWeight: '700' | '800' | '900'
  bodyWeight:    '400' | '500'
  /** Letter-spacing default for display headings. */
  tracking: '-0.04em' | '-0.02em' | 'normal' | '0.02em'
  /** Best fit when typography.style is forced — drives renderer mood. */
  style:    'editorial-serif' | 'geometric-sans' | 'bold-condensed' | 'mono-technical' | 'playful-rounded' | 'humanist-warm'
}

export const TYPE_PAIRS: TypePair[] = [
  /* ─── BOLD CONDENSED DISPLAY ─── */
  {
    id: 'barlow-stack',
    name: 'Barlow Stack',
    vibe: 'Bold condensed display + clean grotesk — fintech-data, sports, news',
    tags: ['fintech','sports','data','bold','condensed'],
    heading: 'Barlow Condensed', body: 'DM Sans', mono: 'JetBrains Mono',
    headingWeight: '900', bodyWeight: '400', tracking: '-0.02em',
    style: 'bold-condensed',
  },
  {
    id: 'antonio-dm',
    name: 'Antonio Display',
    vibe: 'Italic-friendly condensed + DM Sans — bank-app punchy',
    tags: ['consumer','fintech','bold','condensed','phone-first'],
    heading: 'Antonio', body: 'DM Sans', mono: 'JetBrains Mono',
    headingWeight: '900', bodyWeight: '500', tracking: '-0.02em',
    style: 'bold-condensed',
  },
  {
    id: 'bebas-inter',
    name: 'Bebas Neue Header',
    vibe: 'All-caps tall display + Inter body — startup-punchy',
    tags: ['consumer','sports','bold','condensed'],
    heading: 'Bebas Neue', body: 'Inter', mono: 'JetBrains Mono',
    headingWeight: '900', bodyWeight: '400', tracking: '0.02em',
    style: 'bold-condensed',
  },
  {
    id: 'oswald-source',
    name: 'Oswald Editorial',
    vibe: 'Oswald display + Source Sans body — magazine-poster',
    tags: ['editorial','consumer','bold','condensed'],
    heading: 'Oswald', body: 'Source Sans 3', mono: 'JetBrains Mono',
    headingWeight: '800', bodyWeight: '400', tracking: 'normal',
    style: 'bold-condensed',
  },

  /* ─── GEOMETRIC SANS ─── */
  {
    id: 'inter-canonical',
    name: 'Inter Canonical',
    vibe: 'Inter all the way — the safe, modern, dev-tool default',
    tags: ['dev-tools','fintech','b2b','balanced','geometric'],
    heading: 'Inter', body: 'Inter', mono: 'JetBrains Mono',
    headingWeight: '800', bodyWeight: '400', tracking: '-0.02em',
    style: 'geometric-sans',
  },
  {
    id: 'space-grotesk-mono',
    name: 'Space Grotesk × IBM Plex',
    vibe: 'Slightly weird geometric + monospace body — Vercel/Linear adjacent',
    tags: ['dev-tools','ai','technical','geometric'],
    heading: 'Space Grotesk', body: 'IBM Plex Sans', mono: 'IBM Plex Mono',
    headingWeight: '700', bodyWeight: '400', tracking: '-0.02em',
    style: 'geometric-sans',
  },
  {
    id: 'manrope-stack',
    name: 'Manrope Modern',
    vibe: 'Manrope display + DM Sans body — friendly modern SaaS',
    tags: ['consumer','b2b','balanced','geometric'],
    heading: 'Manrope', body: 'DM Sans', mono: 'JetBrains Mono',
    headingWeight: '800', bodyWeight: '500', tracking: '-0.02em',
    style: 'geometric-sans',
  },
  {
    id: 'sora-inter',
    name: 'Sora Tech',
    vibe: 'Sora display + Inter body — AI/dev-tools modern',
    tags: ['ai','dev-tools','balanced','geometric'],
    heading: 'Sora', body: 'Inter', mono: 'JetBrains Mono',
    headingWeight: '800', bodyWeight: '400', tracking: '-0.02em',
    style: 'geometric-sans',
  },
  {
    id: 'geist-mono',
    name: 'Geist Console',
    vibe: 'Geist display + Geist body — Vercel signature',
    tags: ['dev-tools','ai','technical','geometric'],
    heading: 'Geist', body: 'Geist', mono: 'Geist Mono',
    headingWeight: '700', bodyWeight: '400', tracking: '-0.02em',
    style: 'geometric-sans',
  },
  {
    id: 'dm-stack',
    name: 'DM Pure',
    vibe: 'DM Sans + DM Mono — Stripe-adjacent professional',
    tags: ['fintech','b2b','balanced','geometric','restrained'],
    heading: 'DM Sans', body: 'DM Sans', mono: 'DM Mono',
    headingWeight: '700', bodyWeight: '400', tracking: '-0.02em',
    style: 'geometric-sans',
  },
  {
    id: 'archivo-stack',
    name: 'Archivo Display',
    vibe: 'Archivo display + Inter body — magazine-ish but contemporary',
    tags: ['consumer','editorial','bold','geometric'],
    heading: 'Archivo Black', body: 'Inter', mono: 'JetBrains Mono',
    headingWeight: '900', bodyWeight: '400', tracking: '-0.02em',
    style: 'geometric-sans',
  },

  /* ─── EDITORIAL SERIF ─── */
  {
    id: 'fraunces-inter',
    name: 'Fraunces Editorial',
    vibe: 'Variable serif display + Inter body — premium publisher',
    tags: ['editorial','luxury','consumer','serif','restrained'],
    heading: 'Fraunces', body: 'Inter', mono: 'JetBrains Mono',
    headingWeight: '900', bodyWeight: '400', tracking: '-0.02em',
    style: 'editorial-serif',
  },
  {
    id: 'cormorant-jost',
    name: 'Cormorant × Jost',
    vibe: 'Cormorant Garamond display + Jost body — luxury hotel',
    tags: ['luxury','editorial','hospitality','serif','restrained'],
    heading: 'Cormorant Garamond', body: 'Jost', mono: 'JetBrains Mono',
    headingWeight: '700', bodyWeight: '400', tracking: 'normal',
    style: 'editorial-serif',
  },
  {
    id: 'playfair-source',
    name: 'Playfair Classic',
    vibe: 'Playfair Display + Source Sans body — editorial fashion',
    tags: ['editorial','luxury','consumer','serif'],
    heading: 'Playfair Display', body: 'Source Sans 3', mono: 'JetBrains Mono',
    headingWeight: '900', bodyWeight: '400', tracking: '-0.02em',
    style: 'editorial-serif',
  },
  {
    id: 'libre-baskerville',
    name: 'Libre Baskerville',
    vibe: 'Libre Baskerville serif + Karla body — formal, professional',
    tags: ['legal','luxury','editorial','serif','restrained'],
    heading: 'Libre Baskerville', body: 'Karla', mono: 'JetBrains Mono',
    headingWeight: '700', bodyWeight: '400', tracking: 'normal',
    style: 'editorial-serif',
  },
  {
    id: 'crimson-pro',
    name: 'Crimson Pro',
    vibe: 'Crimson Pro display + body — academic gravitas',
    tags: ['education','editorial','serif','restrained'],
    heading: 'Crimson Pro', body: 'Crimson Pro', mono: 'JetBrains Mono',
    headingWeight: '700', bodyWeight: '400', tracking: 'normal',
    style: 'editorial-serif',
  },

  /* ─── MONO-TECHNICAL ─── */
  {
    id: 'jet-brains-everywhere',
    name: 'JetBrains Everywhere',
    vibe: 'JetBrains Mono for everything — terminal-dense, dev-ops',
    tags: ['dev-tools','cyber','technical','mono'],
    heading: 'JetBrains Mono', body: 'JetBrains Mono', mono: 'JetBrains Mono',
    headingWeight: '700', bodyWeight: '400', tracking: 'normal',
    style: 'mono-technical',
  },
  {
    id: 'ibm-plex-mono',
    name: 'IBM Plex Mono',
    vibe: 'IBM Plex Mono display + IBM Plex Sans body — engineering',
    tags: ['dev-tools','b2b','technical'],
    heading: 'IBM Plex Mono', body: 'IBM Plex Sans', mono: 'IBM Plex Mono',
    headingWeight: '700', bodyWeight: '400', tracking: 'normal',
    style: 'mono-technical',
  },
  {
    id: 'space-mono-grotesk',
    name: 'Space Mono Stack',
    vibe: 'Space Mono display + Space Grotesk body — research/AI lab',
    tags: ['ai','dev-tools','technical','mono'],
    heading: 'Space Mono', body: 'Space Grotesk', mono: 'Space Mono',
    headingWeight: '700', bodyWeight: '400', tracking: 'normal',
    style: 'mono-technical',
  },

  /* ─── PLAYFUL ROUNDED ─── */
  {
    id: 'rubik-stack',
    name: 'Rubik Friendly',
    vibe: 'Rubik display + Rubik body — accessible, friendly, education',
    tags: ['education','consumer','playful'],
    heading: 'Rubik', body: 'Rubik', mono: 'JetBrains Mono',
    headingWeight: '900', bodyWeight: '400', tracking: '-0.02em',
    style: 'playful-rounded',
  },
  {
    id: 'lexend-tega',
    name: 'Lexend Reader',
    vibe: 'Lexend display + Lexend body — research-backed legibility',
    tags: ['education','consumer','playful'],
    heading: 'Lexend', body: 'Lexend', mono: 'JetBrains Mono',
    headingWeight: '800', bodyWeight: '400', tracking: 'normal',
    style: 'playful-rounded',
  },
  {
    id: 'nunito-stack',
    name: 'Nunito Friendly',
    vibe: 'Nunito display + body — soft, friendly, kids/EDU',
    tags: ['education','consumer','playful'],
    heading: 'Nunito', body: 'Nunito', mono: 'JetBrains Mono',
    headingWeight: '900', bodyWeight: '400', tracking: '-0.02em',
    style: 'playful-rounded',
  },
  {
    id: 'fredoka-stack',
    name: 'Fredoka Pop',
    vibe: 'Fredoka display + Manrope body — bouncy consumer',
    tags: ['consumer','playful'],
    heading: 'Fredoka', body: 'Manrope', mono: 'JetBrains Mono',
    headingWeight: '800', bodyWeight: '400', tracking: 'normal',
    style: 'playful-rounded',
  },

  /* ─── HUMANIST WARM ─── */
  {
    id: 'work-sans-stack',
    name: 'Work Sans Warm',
    vibe: 'Work Sans display + Work Sans body — friendly humanist',
    tags: ['consumer','b2b','health','humanist'],
    heading: 'Work Sans', body: 'Work Sans', mono: 'JetBrains Mono',
    headingWeight: '700', bodyWeight: '400', tracking: '-0.02em',
    style: 'humanist-warm',
  },
  {
    id: 'epilogue-stack',
    name: 'Epilogue Modern',
    vibe: 'Epilogue display + Inter body — modern humanist',
    tags: ['consumer','b2b','health','humanist'],
    heading: 'Epilogue', body: 'Inter', mono: 'JetBrains Mono',
    headingWeight: '800', bodyWeight: '400', tracking: '-0.02em',
    style: 'humanist-warm',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    vibe: 'PJS display + body — modern alt to Inter',
    tags: ['b2b','consumer','balanced','humanist'],
    heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', mono: 'JetBrains Mono',
    headingWeight: '800', bodyWeight: '400', tracking: '-0.02em',
    style: 'humanist-warm',
  },
]

/** Suggest the top N font pairs that match a set of tag hints. */
export function suggestTypePairs(tags: string[], limit = 6): TypePair[] {
  const lower = tags.map(t => t.toLowerCase())
  const scored = TYPE_PAIRS.map(p => {
    const matches = p.tags.filter(t => lower.includes(t.toLowerCase())).length
    return { p, score: matches }
  })
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.p)
}

export function getTypePairById(id: string): TypePair | undefined {
  return TYPE_PAIRS.find(p => p.id === id)
}

/** Render a Google Fonts <link> URL for a set of pairs (or one). Used by
 *  the workspace when swapping live, since the new fonts need to be loaded. */
export function googleFontsHref(pair: TypePair): string {
  const fams = [pair.heading, pair.body, pair.mono]
    .filter((f, i, a) => f && a.indexOf(f) === i)
    .map(f => f.replace(/ /g, '+') + ':ital,wght@0,400;0,500;0,700;0,800;0,900')
    .join('&family=')
  return `https://fonts.googleapis.com/css2?family=${fams}&display=swap`
}
