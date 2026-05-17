/* ════════════════════════════════════════════════════════════════════
   STAGE B1 — Brand extraction

   Pulls the company's actual brand from its website:
     - theme-color meta tag
     - CSS brand variables (--brand-*, --primary, --accent, etc.)
     - hex colors inside <style> blocks
     - Logo (og:image → apple-touch-icon → favicon → /favicon.ico)
     - Detected font-family declarations

   Each extracted color is weighted by source:
     theme-color  = 1.0 (highest trust — author-declared)
     css-var      = 0.8
     style-hex    = 0.4 (might be any color, not necessarily brand)

   Used both by the legacy /api/brand endpoint and by Track B of the
   generation pipeline. Defensive: never throws — returns empty
   defaults if fetch fails.
═══════════════════════════════════════════════════════════════════ */

export interface ExtractedColor {
  hex:    string
  weight: number          // 0–1 trust score
  source: 'theme-color' | 'css-var' | 'body-bg' | 'inline-style' | 'style-hex'
  /** How many times this hex was seen across the page. Higher = stronger brand signal. */
  count?: number
}

export interface ExtractedBrand {
  colors:         ExtractedColor[]
  logoUrl:        string | null  // small mark (favicon / apple-touch-icon)
  ogImage:        string | null  // social card / hero (much bigger, better for cover bg)
  detectedFonts:  string[]
  domain:         string
  fetchedAt:      number  // ms epoch
}

const EMPTY: ExtractedBrand = { colors: [], logoUrl: null, ogImage: null, detectedFonts: [], domain: '', fetchedAt: 0 }

export async function extractBrand(websiteUrl?: string): Promise<ExtractedBrand> {
  if (!websiteUrl) return EMPTY
  const base = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`

  let html = ''
  try {
    html = await fetchHtml(base)
  } catch {
    try { html = await fetchHtml(base.replace('https://', 'http://')) }
    catch { return { ...EMPTY, domain: base, fetchedAt: Date.now() } }
  }

  const { logo, og } = extractLogoAndOg(html, base)
  return {
    colors:        extractColors(html),
    logoUrl:       logo,
    ogImage:       og,
    detectedFonts: extractFonts(html),
    domain:        base,
    fetchedAt:     Date.now(),
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SignalDeck/1.0; +https://signaldeck.app)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(8000),
  })
  return res.text()
}

function extractColors(html: string): ExtractedColor[] {
  const seen = new Map<string, ExtractedColor>()

  const add = (raw: string, source: ExtractedColor['source'], weight: number) => {
    const hex = normalizeHex(raw)
    if (!hex || isGrayish(hex)) return
    const existing = seen.get(hex)
    if (existing) {
      existing.count = (existing.count || 1) + 1
      if (weight > existing.weight) { existing.weight = weight; existing.source = source }
    } else {
      seen.set(hex, { hex, weight, source, count: 1 })
    }
  }

  // 1. <meta name="theme-color"> (highest trust)
  const themeA = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)
  const themeB = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i)
  const themeMeta = (themeA || themeB)?.[1]?.trim()
  if (themeMeta?.startsWith('#')) add(themeMeta, 'theme-color', 1.0)

  // 2. CSS custom properties that look like brand tokens (high trust)
  const cssVarRe = /--(primary|brand|accent|main|highlight|color(?:-\w+)?)[^:]*:\s*(#[0-9a-fA-F]{3,8})\b/gi
  let m: RegExpExecArray | null
  while ((m = cssVarRe.exec(html)) !== null) add(m[2], 'css-var', 0.85)

  // 3. <body> / <html> background-color — this IS the brand bg for marketing sites
  // (Up Bank's yellow, Stripe's purple, etc.). Highest single-source signal.
  const bodyBgRe = /<(?:body|html)\b[^>]*style=["'][^"']*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/gi
  while ((m = bodyBgRe.exec(html)) !== null) add(m[1], 'body-bg', 0.95)
  // Also catch `body { background: #xxx }` inside <style>
  const bodyBgCssRe = /\b(?:body|html)\s*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/gi
  while ((m = bodyBgCssRe.exec(html)) !== null) add(m[1], 'body-bg', 0.95)

  // 4. Inline style="..." attributes (background / color / fill / stroke)
  // Up Bank's coral text, hero accents — most JS-rendered marketing sites
  // shove brand colours into inline styles rather than stylesheets.
  const inlineStyleRe = /style=["']([^"']+)["']/gi
  const propHexRe = /(background(?:-color)?|color|fill|stroke|border(?:-color)?)\s*:\s*(#[0-9a-fA-F]{3,8})\b/gi
  let s: RegExpExecArray | null
  while ((s = inlineStyleRe.exec(html)) !== null) {
    const inline = s[1]
    let p: RegExpExecArray | null
    while ((p = propHexRe.exec(inline)) !== null) add(p[2], 'inline-style', 0.6)
  }

  // 5. All hex colors inside <style> blocks (lower trust — but bump if seen often)
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(x => x[1])
  const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g
  for (const block of styleBlocks) {
    while ((m = hexRe.exec(block)) !== null) add(m[0], 'style-hex', 0.4)
  }

  // Final ranking: weight + frequency bonus (capped). A colour seen 5+ times
  // anywhere is almost certainly part of the brand — boost it.
  const ranked = Array.from(seen.values()).map(c => ({
    ...c,
    weight: Math.min(1, c.weight + Math.min(0.3, ((c.count || 1) - 1) * 0.05)),
  }))

  return ranked
    .sort((a, b) => b.weight - a.weight || (b.count || 0) - (a.count || 0))
    .slice(0, 8)
}

function extractFonts(html: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (name: string) => {
    const trimmed = name.replace(/['"]/g, '').trim()
    if (!trimmed || trimmed.length > 40) return
    if (/^(var|inherit|initial|sans|serif|monospace|system-ui|ui-\w+|-apple-system|blinkmacsystemfont)/i.test(trimmed)) return
    const key = trimmed.toLowerCase()
    if (seen.has(key)) return
    seen.add(key); out.push(trimmed)
  }
  let m: RegExpExecArray | null

  // 1. Google Fonts <link href="...family=Inter:..."> (very common pattern)
  const linkRe = /fonts\.googleapis\.com\/css2?\?[^"']*family=([^"'&]+)/gi
  while ((m = linkRe.exec(html)) !== null) {
    for (const fam of decodeURIComponent(m[1]).split('|')) {
      const name = fam.split(':')[0]?.replace(/\+/g, ' ').trim()
      if (name) push(name)
    }
  }
  // 2. @font-face font-family declarations (custom fonts — UpBank's "UpFont", etc.)
  // These won't load on the deck, but they tell Sonnet what kind of typeface the
  // brand actually uses so it can pick the closest Google equivalent.
  const fontFaceRe = /@font-face\s*\{[^}]*font-family\s*:\s*([^;}\n]+)/gi
  while ((m = fontFaceRe.exec(html)) !== null) push(m[1].split(',')[0] || '')
  // 3. font-family CSS declarations (in <style> blocks AND inline style attrs)
  const ffRe = /font-family\s*:\s*([^;}"\n]+)/gi
  while ((m = ffRe.exec(html)) !== null) push(m[1].split(',')[0] || '')

  return out.slice(0, 6)
}

function normalizeHex(hex: string): string | null {
  hex = hex.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
  }
  if (!/^#[0-9a-f]{6}$/.test(hex)) return null
  return hex
}

/** Split logo (small mark) from og:image (large hero) — they have different uses. */
function extractLogoAndOg(html: string, base: string): { logo: string | null; og: string | null } {
  const resolve = (rel: string) => {
    try { return new URL(rel, base).href } catch { return null }
  }

  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
              || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  const og = ogMatch?.[1] ? resolve(ogMatch[1]) : null

  // Prefer apple-touch-icon (high-res) → icon → /favicon.ico
  const apple = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
             || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i)
  if (apple?.[1]) return { logo: resolve(apple[1]), og }

  const fav = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
  if (fav?.[1]) return { logo: resolve(fav[1]), og }

  try { return { logo: new URL('/favicon.ico', base).href, og } } catch { return { logo: null, og } }
}

function isGrayish(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const sat = max === 0 ? 0 : (max - min) / max
  const lum = (r * 299 + g * 587 + b * 114) / 1000
  return sat < 0.18 || lum > 235 || lum < 12
}
