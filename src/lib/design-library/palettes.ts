/* ════════════════════════════════════════════════════════════════════
   PALETTE LIBRARY — 50+ curated brand palettes grouped by temperament,
   each a complete BrandWorld colour block ready to drop into a generated
   world or apply as a Live Override.

   Why this exists: the brand-world generator (Sonnet) sometimes hallucinates
   harmonious-looking but generic palettes ("modern teal #00D4B4"). This
   library gives founders real, proven brand combinations they can apply
   instantly OR that the generator can reference by name.

   Each palette ships with:
     - name           short label
     - vibe           one-line description
     - tags           lookup keys (industry, mood, deckMode)
     - colour         full BrandWorld.colour block
   So `applyPalette(brandWorld, palette)` is just a spread.
═══════════════════════════════════════════════════════════════════ */

export interface Palette {
  id:        string
  name:      string
  vibe:      string
  tags:      string[]      // industry/mood/deckMode keys, e.g. ['fintech','dark','bold']
  inspiredBy?: string      // real brand reference (not copied — channelled)
  colour: {
    background:  string
    surface:     string
    surfaceSoft: string
    primary:     string
    primarySoft: string
    secondary:   string
    accent:      string
    text:        string
    textMuted:   string
    border:      string
    success:     string
    warning:     string
    error:       string
    gridLine:    string
    glow:        string
    tertiary?:   string
  }
  deckMode: 'light' | 'dark'
}

const SUCCESS  = '#1f9d55'
const WARNING  = '#d68a00'
const ERROR    = '#d93051'

/* ─── FINTECH — payments, trading, banking ───────────────────────────── */
const fintech: Palette[] = [
  {
    id: 'syncpay-precision',
    name: 'SyncPay Precision',
    vibe: 'Dark navy field, single teal accent, ledger-precise',
    tags: ['fintech','dark','bold','data'],
    inspiredBy: 'SyncPay / Linear',
    deckMode: 'dark',
    colour: {
      background:'#06080d', surface:'#0a0e17', surfaceSoft:'#0f1521',
      primary:'#00e5c3', primarySoft:'rgba(0,229,195,0.10)', secondary:'#5e8cff', accent:'#ffb800',
      text:'#eef2f7', textMuted:'rgba(238,242,247,0.55)', border:'rgba(255,255,255,0.06)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.03)', glow:'rgba(0,229,195,0.18)',
    },
  },
  {
    id: 'stripe-quietude',
    name: 'Stripe Quietude',
    vibe: 'Off-white field, deep indigo signature, editorial silence',
    tags: ['fintech','light','restrained','enterprise'],
    inspiredBy: 'Stripe',
    deckMode: 'light',
    colour: {
      background:'#fafaf7', surface:'#ffffff', surfaceSoft:'#f4f4f1',
      primary:'#635bff', primarySoft:'rgba(99,91,255,0.10)', secondary:'#0a2540', accent:'#00d4ff',
      text:'#0a2540', textMuted:'rgba(10,37,64,0.60)', border:'rgba(10,37,64,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(10,37,64,0.04)', glow:'transparent',
    },
  },
  {
    id: 'up-aggressive',
    name: 'Up Aggressive',
    vibe: 'Coral back panel, black cards, electric yellow accents',
    tags: ['fintech','consumer','loud','dual-saturated'],
    inspiredBy: 'Up Bank',
    deckMode: 'dark',
    colour: {
      background:'#ff705c', surface:'#0d0d0d', surfaceSoft:'#1a1a1a',
      primary:'#ffee52', primarySoft:'rgba(255,238,82,0.18)', secondary:'#ff8bd1', accent:'#fb5d40',
      text:'#f5f0e8', textMuted:'rgba(245,240,232,0.55)', border:'rgba(255,255,255,0.12)',
      success:'#3dd68c', warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.05)', glow:'rgba(255,238,82,0.20)',
      tertiary:'#ff8bd1',
    },
  },
  {
    id: 'klarna-pink',
    name: 'Klarna Pink',
    vibe: 'Soft pink wash, black ink, retail confidence',
    tags: ['fintech','consumer','loud','b2c'],
    inspiredBy: 'Klarna',
    deckMode: 'light',
    colour: {
      background:'#ffa8cd', surface:'#0a0a0a', surfaceSoft:'#1a1a1a',
      primary:'#0a0a0a', primarySoft:'rgba(0,0,0,0.10)', secondary:'#ffa8cd', accent:'#ffdac8',
      text:'#fff7f1', textMuted:'rgba(255,247,241,0.65)', border:'rgba(255,255,255,0.15)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(0,0,0,0.04)', glow:'transparent',
    },
  },
  {
    id: 'brex-platinum',
    name: 'Brex Platinum',
    vibe: 'Deep charcoal, platinum accent, fintech-enterprise',
    tags: ['fintech','dark','enterprise','restrained'],
    inspiredBy: 'Brex',
    deckMode: 'dark',
    colour: {
      background:'#1c1c1e', surface:'#2a2a2c', surfaceSoft:'#3a3a3c',
      primary:'#f7c873', primarySoft:'rgba(247,200,115,0.12)', secondary:'#86868b', accent:'#a4d4ff',
      text:'#f5f5f7', textMuted:'rgba(245,245,247,0.55)', border:'rgba(255,255,255,0.08)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.03)', glow:'rgba(247,200,115,0.15)',
    },
  },
  {
    id: 'ramp-saturn',
    name: 'Ramp Saturn',
    vibe: 'Burnt orange, dark cream, premium spend management',
    tags: ['fintech','light','warm','enterprise'],
    inspiredBy: 'Ramp',
    deckMode: 'light',
    colour: {
      background:'#fdf7f2', surface:'#fffefb', surfaceSoft:'#f5ede3',
      primary:'#e87722', primarySoft:'rgba(232,119,34,0.10)', secondary:'#003c47', accent:'#f4c542',
      text:'#003c47', textMuted:'rgba(0,60,71,0.55)', border:'rgba(0,60,71,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(0,60,71,0.04)', glow:'transparent',
    },
  },
]

/* ─── CONSUMER — lifestyle, retail, social ───────────────────────────── */
const consumer: Palette[] = [
  {
    id: 'liquid-death-tallboy',
    name: 'Liquid Death Tallboy',
    vibe: 'Pitch-black field, neon green, anti-wellness rebellion',
    tags: ['consumer','retail','loud','dark','provocative'],
    inspiredBy: 'Liquid Death',
    deckMode: 'dark',
    colour: {
      background:'#0a0a0a', surface:'#161616', surfaceSoft:'#1f1f1f',
      primary:'#c5ff3a', primarySoft:'rgba(197,255,58,0.15)', secondary:'#ff3b30', accent:'#ffffff',
      text:'#ffffff', textMuted:'rgba(255,255,255,0.55)', border:'rgba(255,255,255,0.08)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.04)', glow:'rgba(197,255,58,0.25)',
    },
  },
  {
    id: 'cashapp-lime',
    name: 'Cash App Lime',
    vibe: 'Pure lime, black ink, raw simplicity',
    tags: ['fintech','consumer','loud','b2c'],
    inspiredBy: 'Cash App',
    deckMode: 'light',
    colour: {
      background:'#00d54f', surface:'#000000', surfaceSoft:'#0d0d0d',
      primary:'#ffffff', primarySoft:'rgba(255,255,255,0.12)', secondary:'#00d54f', accent:'#ffeb00',
      text:'#ffffff', textMuted:'rgba(255,255,255,0.65)', border:'rgba(255,255,255,0.12)',
      success:'#00d54f', warning:WARNING, error:ERROR,
      gridLine:'rgba(0,0,0,0.05)', glow:'transparent',
    },
  },
  {
    id: 'oatly-cream',
    name: 'Oatly Cream',
    vibe: 'Bone cream, black hand-drawn ink, organic confidence',
    tags: ['consumer','retail','restrained','organic'],
    inspiredBy: 'Oatly',
    deckMode: 'light',
    colour: {
      background:'#f5ecd9', surface:'#ffffff', surfaceSoft:'#ebe1ca',
      primary:'#000000', primarySoft:'rgba(0,0,0,0.06)', secondary:'#5a4a35', accent:'#d94f30',
      text:'#000000', textMuted:'rgba(0,0,0,0.65)', border:'rgba(0,0,0,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(0,0,0,0.04)', glow:'transparent',
    },
  },
  {
    id: 'allbirds-comfort',
    name: 'Allbirds Comfort',
    vibe: 'Soft cream, sage accent, sustainable comfort',
    tags: ['consumer','retail','restrained','sustainable'],
    inspiredBy: 'Allbirds',
    deckMode: 'light',
    colour: {
      background:'#f7f3eb', surface:'#ffffff', surfaceSoft:'#ebe5d4',
      primary:'#3d5a40', primarySoft:'rgba(61,90,64,0.10)', secondary:'#a47551', accent:'#e3856b',
      text:'#1a1a1a', textMuted:'rgba(26,26,26,0.60)', border:'rgba(26,26,26,0.08)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(26,26,26,0.04)', glow:'transparent',
    },
  },
  {
    id: 'luma-aurora',
    name: 'Luma Aurora',
    vibe: 'Pink-peach gradient field, expressive event aesthetic',
    tags: ['consumer','creative','loud','rich'],
    inspiredBy: 'Luma',
    deckMode: 'light',
    colour: {
      background:'#fde9e3', surface:'#ffffff', surfaceSoft:'#fbd9d1',
      primary:'#ff6b9d', primarySoft:'rgba(255,107,157,0.12)', secondary:'#ffb88a', accent:'#a16ae8',
      text:'#1a1a1a', textMuted:'rgba(26,26,26,0.55)', border:'rgba(26,26,26,0.08)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(26,26,26,0.03)', glow:'rgba(255,107,157,0.18)',
      tertiary:'#a16ae8',
    },
  },
  {
    id: 'glossier-bisque',
    name: 'Glossier Bisque',
    vibe: 'Millennial pink, dusty rose ink, soft confidence',
    tags: ['consumer','retail','balanced','feminine'],
    inspiredBy: 'Glossier',
    deckMode: 'light',
    colour: {
      background:'#fce6dc', surface:'#ffffff', surfaceSoft:'#f5d7c6',
      primary:'#e8a18e', primarySoft:'rgba(232,161,142,0.15)', secondary:'#9a6b5a', accent:'#000000',
      text:'#2a1810', textMuted:'rgba(42,24,16,0.55)', border:'rgba(42,24,16,0.08)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(42,24,16,0.03)', glow:'transparent',
    },
  },
]

/* ─── DEVELOPER / AI / DEVTOOLS ──────────────────────────────────────── */
const devtools: Palette[] = [
  {
    id: 'vercel-blackout',
    name: 'Vercel Blackout',
    vibe: 'Pure black, white ink, geometric precision',
    tags: ['dev-tools','dark','restrained','technical'],
    inspiredBy: 'Vercel',
    deckMode: 'dark',
    colour: {
      background:'#000000', surface:'#0a0a0a', surfaceSoft:'#1a1a1a',
      primary:'#ffffff', primarySoft:'rgba(255,255,255,0.08)', secondary:'#888888', accent:'#0070f3',
      text:'#ededed', textMuted:'rgba(237,237,237,0.55)', border:'rgba(255,255,255,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.03)', glow:'rgba(0,112,243,0.18)',
    },
  },
  {
    id: 'linear-graphite',
    name: 'Linear Graphite',
    vibe: 'Soft graphite, lavender accent, calm IDE energy',
    tags: ['dev-tools','dark','balanced','technical'],
    inspiredBy: 'Linear',
    deckMode: 'dark',
    colour: {
      background:'#0e0e10', surface:'#1a1a1d', surfaceSoft:'#222226',
      primary:'#8a8aff', primarySoft:'rgba(138,138,255,0.10)', secondary:'#5a5a66', accent:'#ff6b9d',
      text:'#e8e8ed', textMuted:'rgba(232,232,237,0.55)', border:'rgba(255,255,255,0.06)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.03)', glow:'rgba(138,138,255,0.12)',
    },
  },
  {
    id: 'anthropic-paper',
    name: 'Anthropic Paper',
    vibe: 'Bone white, deep navy, copper accent, research lab',
    tags: ['ai','light','restrained','research'],
    inspiredBy: 'Anthropic',
    deckMode: 'light',
    colour: {
      background:'#f6f1e7', surface:'#ffffff', surfaceSoft:'#ede4cf',
      primary:'#1a1a2e', primarySoft:'rgba(26,26,46,0.08)', secondary:'#5a5a66', accent:'#c89860',
      text:'#1a1a2e', textMuted:'rgba(26,26,46,0.60)', border:'rgba(26,26,46,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(26,26,46,0.03)', glow:'transparent',
    },
  },
  {
    id: 'github-terminal',
    name: 'GitHub Terminal',
    vibe: 'Deep charcoal, neon green code, terminal aesthetic',
    tags: ['dev-tools','dark','technical','code'],
    inspiredBy: 'GitHub dark mode',
    deckMode: 'dark',
    colour: {
      background:'#0d1117', surface:'#161b22', surfaceSoft:'#21262d',
      primary:'#3fb950', primarySoft:'rgba(63,185,80,0.12)', secondary:'#58a6ff', accent:'#f78166',
      text:'#c9d1d9', textMuted:'rgba(201,209,217,0.55)', border:'rgba(255,255,255,0.06)',
      success:'#3fb950', warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.03)', glow:'rgba(63,185,80,0.15)',
    },
  },
  {
    id: 'figma-fjord',
    name: 'Figma Fjord',
    vibe: 'Cool slate, vibrant orange + green accents, design tool',
    tags: ['dev-tools','dark','rich','creative'],
    inspiredBy: 'Figma',
    deckMode: 'dark',
    colour: {
      background:'#1e1e1e', surface:'#2c2c2c', surfaceSoft:'#3a3a3a',
      primary:'#f24e1e', primarySoft:'rgba(242,78,30,0.12)', secondary:'#0acf83', accent:'#a259ff',
      text:'#ffffff', textMuted:'rgba(255,255,255,0.55)', border:'rgba(255,255,255,0.08)',
      success:'#0acf83', warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.03)', glow:'rgba(242,78,30,0.15)',
      tertiary:'#1abcfe',
    },
  },
]

/* ─── LUXURY / EDITORIAL / PROFESSIONAL ──────────────────────────────── */
const editorial: Palette[] = [
  {
    id: 'magazine-broadsheet',
    name: 'Magazine Broadsheet',
    vibe: 'Newsprint cream, deep ink, editorial gravitas',
    tags: ['editorial','luxury','light','restrained','serif'],
    inspiredBy: 'The New York Times',
    deckMode: 'light',
    colour: {
      background:'#f5f2eb', surface:'#fffefa', surfaceSoft:'#eae5d8',
      primary:'#0a0a0a', primarySoft:'rgba(0,0,0,0.06)', secondary:'#7a6e5a', accent:'#a8332a',
      text:'#0a0a0a', textMuted:'rgba(0,0,0,0.60)', border:'rgba(0,0,0,0.12)',
      success:SUCCESS, warning:WARNING, error:'#a8332a',
      gridLine:'rgba(0,0,0,0.04)', glow:'transparent',
    },
  },
  {
    id: 'aman-resort',
    name: 'Aman Resort',
    vibe: 'Bone, taupe, brushed gold — quiet luxury',
    tags: ['luxury','light','restrained','hospitality'],
    inspiredBy: 'Aman Resorts',
    deckMode: 'light',
    colour: {
      background:'#f3ede2', surface:'#fbf7ee', surfaceSoft:'#e8dcc4',
      primary:'#8a6f4d', primarySoft:'rgba(138,111,77,0.10)', secondary:'#3a3530', accent:'#c4a274',
      text:'#3a3530', textMuted:'rgba(58,53,48,0.55)', border:'rgba(58,53,48,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(58,53,48,0.03)', glow:'transparent',
    },
  },
  {
    id: 'soho-house-velvet',
    name: 'Soho House Velvet',
    vibe: 'Deep emerald, brushed gold, members-only confidence',
    tags: ['luxury','dark','restrained','hospitality'],
    inspiredBy: 'Soho House',
    deckMode: 'dark',
    colour: {
      background:'#0d2820', surface:'#152e26', surfaceSoft:'#1f3c32',
      primary:'#d4a574', primarySoft:'rgba(212,165,116,0.10)', secondary:'#5a8a72', accent:'#e8d4a8',
      text:'#f0ebd9', textMuted:'rgba(240,235,217,0.55)', border:'rgba(212,165,116,0.15)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(212,165,116,0.04)', glow:'rgba(212,165,116,0.15)',
    },
  },
  {
    id: 'apple-aluminum',
    name: 'Apple Aluminum',
    vibe: 'Off-white field, graphite ink, hardware precision',
    tags: ['consumer','dev-tools','light','restrained'],
    inspiredBy: 'Apple',
    deckMode: 'light',
    colour: {
      background:'#fbfbfd', surface:'#ffffff', surfaceSoft:'#f5f5f7',
      primary:'#1d1d1f', primarySoft:'rgba(29,29,31,0.06)', secondary:'#86868b', accent:'#0071e3',
      text:'#1d1d1f', textMuted:'rgba(29,29,31,0.60)', border:'rgba(29,29,31,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(29,29,31,0.04)', glow:'transparent',
    },
  },
]

/* ─── HEALTH / CLIMATE / IMPACT ──────────────────────────────────────── */
const calm: Palette[] = [
  {
    id: 'oura-mist',
    name: 'Oura Mist',
    vibe: 'Soft sage, deep teal, biometric calm',
    tags: ['health','light','balanced','wellness'],
    inspiredBy: 'Oura',
    deckMode: 'light',
    colour: {
      background:'#e8f0eb', surface:'#ffffff', surfaceSoft:'#d4e3da',
      primary:'#2d6a4f', primarySoft:'rgba(45,106,79,0.10)', secondary:'#74c69d', accent:'#52796f',
      text:'#1b3a2c', textMuted:'rgba(27,58,44,0.60)', border:'rgba(27,58,44,0.10)',
      success:'#2d6a4f', warning:WARNING, error:ERROR,
      gridLine:'rgba(27,58,44,0.03)', glow:'transparent',
    },
  },
  {
    id: 'patagonia-glacier',
    name: 'Patagonia Glacier',
    vibe: 'Glacier blue, warm earth, environmental honesty',
    tags: ['climate','consumer','light','restrained','impact'],
    inspiredBy: 'Patagonia',
    deckMode: 'light',
    colour: {
      background:'#eaf2f4', surface:'#ffffff', surfaceSoft:'#d4e2e6',
      primary:'#1f6f7d', primarySoft:'rgba(31,111,125,0.10)', secondary:'#a55a3a', accent:'#e8b04a',
      text:'#1a1a1a', textMuted:'rgba(26,26,26,0.60)', border:'rgba(26,26,26,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(26,26,26,0.03)', glow:'transparent',
    },
  },
  {
    id: 'allbirds-soil',
    name: 'Climate Soil',
    vibe: 'Earth terracotta, deep moss, regenerative agriculture',
    tags: ['climate','light','balanced','organic'],
    deckMode: 'light',
    colour: {
      background:'#f7ede0', surface:'#ffffff', surfaceSoft:'#e6d4ba',
      primary:'#7a4f2f', primarySoft:'rgba(122,79,47,0.10)', secondary:'#4a6741', accent:'#d4915a',
      text:'#2a1810', textMuted:'rgba(42,24,16,0.60)', border:'rgba(42,24,16,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(42,24,16,0.03)', glow:'transparent',
    },
  },
  {
    id: 'headspace-cloud',
    name: 'Headspace Cloud',
    vibe: 'Sky blue, warm yellow, friendly accessibility',
    tags: ['health','consumer','light','balanced'],
    inspiredBy: 'Headspace',
    deckMode: 'light',
    colour: {
      background:'#f0ebe1', surface:'#ffffff', surfaceSoft:'#e0d8c7',
      primary:'#f8a01c', primarySoft:'rgba(248,160,28,0.12)', secondary:'#5b94d6', accent:'#e64c3f',
      text:'#1a1a1a', textMuted:'rgba(26,26,26,0.55)', border:'rgba(26,26,26,0.08)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(26,26,26,0.03)', glow:'rgba(248,160,28,0.15)',
    },
  },
]

/* ─── SPORTS / FITNESS / KINETIC ─────────────────────────────────────── */
const kinetic: Palette[] = [
  {
    id: 'nike-vapor',
    name: 'Nike Vapor',
    vibe: 'Pure black, swoosh red, performance edge',
    tags: ['sports','consumer','dark','bold'],
    inspiredBy: 'Nike',
    deckMode: 'dark',
    colour: {
      background:'#000000', surface:'#111111', surfaceSoft:'#1a1a1a',
      primary:'#fa0f00', primarySoft:'rgba(250,15,0,0.12)', secondary:'#ffffff', accent:'#facc15',
      text:'#ffffff', textMuted:'rgba(255,255,255,0.55)', border:'rgba(255,255,255,0.10)',
      success:SUCCESS, warning:WARNING, error:'#fa0f00',
      gridLine:'rgba(255,255,255,0.04)', glow:'rgba(250,15,0,0.18)',
    },
  },
  {
    id: 'whoop-onyx',
    name: 'Whoop Onyx',
    vibe: 'Pitch black, electric green strain, athletic data',
    tags: ['sports','health','dark','bold','data'],
    inspiredBy: 'Whoop',
    deckMode: 'dark',
    colour: {
      background:'#0a0a0a', surface:'#1a1a1a', surfaceSoft:'#252525',
      primary:'#00ff66', primarySoft:'rgba(0,255,102,0.10)', secondary:'#ff3366', accent:'#ffea00',
      text:'#ffffff', textMuted:'rgba(255,255,255,0.55)', border:'rgba(255,255,255,0.08)',
      success:'#00ff66', warning:WARNING, error:'#ff3366',
      gridLine:'rgba(255,255,255,0.03)', glow:'rgba(0,255,102,0.18)',
    },
  },
  {
    id: 'strava-orange',
    name: 'Strava Orange',
    vibe: 'White field, signal orange, athlete community',
    tags: ['sports','consumer','light','bold'],
    inspiredBy: 'Strava',
    deckMode: 'light',
    colour: {
      background:'#ffffff', surface:'#fafafa', surfaceSoft:'#f0f0f0',
      primary:'#fc4c02', primarySoft:'rgba(252,76,2,0.12)', secondary:'#000000', accent:'#0d96f5',
      text:'#000000', textMuted:'rgba(0,0,0,0.60)', border:'rgba(0,0,0,0.10)',
      success:SUCCESS, warning:WARNING, error:'#fc4c02',
      gridLine:'rgba(0,0,0,0.04)', glow:'transparent',
    },
  },
]

/* ─── CYBER / OPERATIONS / GOV ────────────────────────────────────────── */
const operational: Palette[] = [
  {
    id: 'palantir-ops',
    name: 'Palantir Ops',
    vibe: 'Deep ink, scan-green, command-operational',
    tags: ['cyber','dark','bold','enterprise','technical'],
    inspiredBy: 'Palantir',
    deckMode: 'dark',
    colour: {
      background:'#0c1117', surface:'#1a1f29', surfaceSoft:'#252a36',
      primary:'#5ae07d', primarySoft:'rgba(90,224,125,0.10)', secondary:'#3a6cff', accent:'#ff5252',
      text:'#dfe5ed', textMuted:'rgba(223,229,237,0.55)', border:'rgba(90,224,125,0.10)',
      success:'#5ae07d', warning:WARNING, error:'#ff5252',
      gridLine:'rgba(90,224,125,0.04)', glow:'rgba(90,224,125,0.20)',
    },
  },
  {
    id: 'sentinel-alert',
    name: 'Sentinel Alert',
    vibe: 'Deep navy, alert amber, security operations',
    tags: ['cyber','dark','restrained','technical'],
    deckMode: 'dark',
    colour: {
      background:'#0a1929', surface:'#102841', surfaceSoft:'#1a3a5c',
      primary:'#f59e0b', primarySoft:'rgba(245,158,11,0.12)', secondary:'#3b82f6', accent:'#ef4444',
      text:'#e2e8f0', textMuted:'rgba(226,232,240,0.55)', border:'rgba(255,255,255,0.08)',
      success:SUCCESS, warning:'#f59e0b', error:'#ef4444',
      gridLine:'rgba(255,255,255,0.03)', glow:'rgba(245,158,11,0.18)',
    },
  },
]

/* ─── EDUCATION / LEARNING ───────────────────────────────────────────── */
const education: Palette[] = [
  {
    id: 'duolingo-owl',
    name: 'Duolingo Owl',
    vibe: 'White field, signal green, friendly streak motivation',
    tags: ['education','consumer','light','bold','playful'],
    inspiredBy: 'Duolingo',
    deckMode: 'light',
    colour: {
      background:'#ffffff', surface:'#fafafa', surfaceSoft:'#f0f0f0',
      primary:'#58cc02', primarySoft:'rgba(88,204,2,0.12)', secondary:'#1cb0f6', accent:'#ff4b4b',
      text:'#1a1a1a', textMuted:'rgba(26,26,26,0.55)', border:'rgba(26,26,26,0.08)',
      success:'#58cc02', warning:'#ffc800', error:'#ff4b4b',
      gridLine:'rgba(26,26,26,0.03)', glow:'transparent',
      tertiary:'#ce82ff',
    },
  },
]

/* ─── ARCHETYPAL (industry-agnostic) ─────────────────────────────────── */
const archetypal: Palette[] = [
  {
    id: 'midnight-electric',
    name: 'Midnight Electric',
    vibe: 'Pitch night, electric purple, AI-research feel',
    tags: ['ai','dark','rich','technical'],
    deckMode: 'dark',
    colour: {
      background:'#0a0a14', surface:'#13131f', surfaceSoft:'#1c1c2e',
      primary:'#a855f7', primarySoft:'rgba(168,85,247,0.12)', secondary:'#3b82f6', accent:'#06b6d4',
      text:'#f1f5f9', textMuted:'rgba(241,245,249,0.55)', border:'rgba(168,85,247,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.03)', glow:'rgba(168,85,247,0.20)',
    },
  },
  {
    id: 'desert-sun',
    name: 'Desert Sun',
    vibe: 'Warm sandstone, terracotta, mineral confidence',
    tags: ['consumer','light','balanced','warm'],
    deckMode: 'light',
    colour: {
      background:'#f5ede0', surface:'#fffaf0', surfaceSoft:'#e8d8c0',
      primary:'#c2410c', primarySoft:'rgba(194,65,12,0.10)', secondary:'#854d0e', accent:'#0c4a6e',
      text:'#1c1917', textMuted:'rgba(28,25,23,0.60)', border:'rgba(28,25,23,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(28,25,23,0.03)', glow:'transparent',
    },
  },
  {
    id: 'arctic-clarity',
    name: 'Arctic Clarity',
    vibe: 'Frost white, ice blue, mathematical clarity',
    tags: ['dev-tools','ai','light','restrained','technical'],
    deckMode: 'light',
    colour: {
      background:'#f0f7fa', surface:'#ffffff', surfaceSoft:'#dceaf0',
      primary:'#0369a1', primarySoft:'rgba(3,105,161,0.10)', secondary:'#475569', accent:'#06b6d4',
      text:'#0c1f2e', textMuted:'rgba(12,31,46,0.60)', border:'rgba(12,31,46,0.10)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(12,31,46,0.03)', glow:'transparent',
    },
  },
  {
    id: 'vapor-dream',
    name: 'Vapor Dream',
    vibe: 'Hot magenta + cyan on black, vaporwave',
    tags: ['creative','consumer','dark','loud','rich'],
    deckMode: 'dark',
    colour: {
      background:'#0a0a1a', surface:'#16162e', surfaceSoft:'#212142',
      primary:'#ec4899', primarySoft:'rgba(236,72,153,0.12)', secondary:'#06b6d4', accent:'#fde047',
      text:'#fff0fa', textMuted:'rgba(255,240,250,0.55)', border:'rgba(236,72,153,0.12)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(236,72,153,0.04)', glow:'rgba(236,72,153,0.25)',
      tertiary:'#fde047',
    },
  },
  {
    id: 'matcha-zen',
    name: 'Matcha Zen',
    vibe: 'Bone, matcha green, brushed copper — Japanese ma',
    tags: ['luxury','light','restrained','wellness'],
    deckMode: 'light',
    colour: {
      background:'#f4f1e8', surface:'#fdfbf5', surfaceSoft:'#e8e2d2',
      primary:'#6b8e4e', primarySoft:'rgba(107,142,78,0.10)', secondary:'#a8723a', accent:'#c4956c',
      text:'#2d3520', textMuted:'rgba(45,53,32,0.55)', border:'rgba(45,53,32,0.10)',
      success:'#6b8e4e', warning:WARNING, error:ERROR,
      gridLine:'rgba(45,53,32,0.03)', glow:'transparent',
    },
  },
  {
    id: 'brutalist-mono',
    name: 'Brutalist Mono',
    vibe: 'Pure black on pure white, no compromise',
    tags: ['creative','light','restrained','brutalist'],
    deckMode: 'light',
    colour: {
      background:'#ffffff', surface:'#f5f5f5', surfaceSoft:'#e8e8e8',
      primary:'#000000', primarySoft:'rgba(0,0,0,0.06)', secondary:'#666666', accent:'#ff0000',
      text:'#000000', textMuted:'rgba(0,0,0,0.65)', border:'rgba(0,0,0,0.20)',
      success:SUCCESS, warning:WARNING, error:'#ff0000',
      gridLine:'rgba(0,0,0,0.06)', glow:'transparent',
    },
  },
  {
    id: 'monochrome-ink',
    name: 'Monochrome Ink',
    vibe: 'Pure white on pure black, brutal inversion',
    tags: ['creative','dark','restrained','brutalist'],
    deckMode: 'dark',
    colour: {
      background:'#000000', surface:'#0a0a0a', surfaceSoft:'#1a1a1a',
      primary:'#ffffff', primarySoft:'rgba(255,255,255,0.08)', secondary:'#888888', accent:'#ffeb00',
      text:'#ffffff', textMuted:'rgba(255,255,255,0.55)', border:'rgba(255,255,255,0.15)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(255,255,255,0.05)', glow:'transparent',
    },
  },
  {
    id: 'paper-thread',
    name: 'Paper & Thread',
    vibe: 'Cream paper, single red thread, craftsman simplicity',
    tags: ['creative','light','restrained','craft'],
    deckMode: 'light',
    colour: {
      background:'#faf6ef', surface:'#ffffff', surfaceSoft:'#ede4d2',
      primary:'#c0392b', primarySoft:'rgba(192,57,43,0.10)', secondary:'#2c2825', accent:'#d4915a',
      text:'#2c2825', textMuted:'rgba(44,40,37,0.60)', border:'rgba(44,40,37,0.10)',
      success:SUCCESS, warning:WARNING, error:'#c0392b',
      gridLine:'rgba(44,40,37,0.03)', glow:'transparent',
    },
  },
  {
    id: 'glass-luxury',
    name: 'Glass Luxury',
    vibe: 'Smoke charcoal, brushed champagne, premium quiet',
    tags: ['luxury','dark','restrained','premium'],
    deckMode: 'dark',
    colour: {
      background:'#1a1816', surface:'#26221e', surfaceSoft:'#322d28',
      primary:'#c9a875', primarySoft:'rgba(201,168,117,0.10)', secondary:'#7d756b', accent:'#e8d4a8',
      text:'#f0ead9', textMuted:'rgba(240,234,217,0.55)', border:'rgba(201,168,117,0.15)',
      success:SUCCESS, warning:WARNING, error:ERROR,
      gridLine:'rgba(201,168,117,0.03)', glow:'rgba(201,168,117,0.12)',
    },
  },
  {
    id: 'electric-citrus',
    name: 'Electric Citrus',
    vibe: 'Hot orange + lime on cream, playful B2B',
    tags: ['consumer','dev-tools','light','loud','playful'],
    deckMode: 'light',
    colour: {
      background:'#fffaf0', surface:'#ffffff', surfaceSoft:'#fff0d4',
      primary:'#ff6b35', primarySoft:'rgba(255,107,53,0.12)', secondary:'#84cc16', accent:'#a855f7',
      text:'#1a1a1a', textMuted:'rgba(26,26,26,0.55)', border:'rgba(26,26,26,0.08)',
      success:'#84cc16', warning:WARNING, error:ERROR,
      gridLine:'rgba(26,26,26,0.03)', glow:'rgba(255,107,53,0.15)',
    },
  },
]

export const PALETTE_LIBRARY: Palette[] = [
  ...fintech,
  ...consumer,
  ...devtools,
  ...editorial,
  ...calm,
  ...kinetic,
  ...operational,
  ...education,
  ...archetypal,
]

/** Pick the top N palettes that match a set of tag hints. Pure lookup —
 *  no API call. Used by the workspace Theme Lab's "Quick palette" picker
 *  and (optionally) by the brand-world prompt as a reference. */
export function suggestPalettes(tags: string[], limit = 6): Palette[] {
  const lower = tags.map(t => t.toLowerCase())
  const scored = PALETTE_LIBRARY.map(p => {
    const matches = p.tags.filter(t => lower.includes(t.toLowerCase())).length
    return { p, score: matches }
  })
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.p)
}

export function getPaletteById(id: string): Palette | undefined {
  return PALETTE_LIBRARY.find(p => p.id === id)
}
