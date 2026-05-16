import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { domain } = req.query
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'domain required' })
  }

  const base = domain.startsWith('http') ? domain : `https://${domain}`

  let html = ''
  try {
    html = await fetchHtml(base)
  } catch {
    try {
      html = await fetchHtml(base.replace('https://', 'http://'))
    } catch {
      return res.status(200).json({ colors: [] })
    }
  }

  const colors = extractColors(html)
  const logo = extractLogo(html, base)
  return res.status(200).json({ colors, logo })
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

function extractColors(html: string): string[] {
  const seen = new Set<string>()
  const colors: string[] = []

  const add = (c: string) => {
    const norm = normalizeHex(c)
    if (norm && !seen.has(norm) && !isGrayish(norm)) {
      seen.add(norm)
      colors.push(norm)
    }
  }

  // 1. <meta name="theme-color">
  const themeA = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)
  const themeB = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i)
  const themeMeta = (themeA || themeB)?.[1]?.trim()
  if (themeMeta?.startsWith('#')) add(themeMeta)

  // 2. CSS custom properties that look like brand tokens
  const cssVarRe = /--(primary|brand|accent|main|highlight|color(?:-\w+)?)[^:]*:\s*(#[0-9a-fA-F]{3,8})\b/gi
  let m: RegExpExecArray | null
  while ((m = cssVarRe.exec(html)) !== null) add(m[2])

  // 3. All hex colors inside <style> blocks
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(x => x[1])
  const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g
  for (const block of styleBlocks) {
    while ((m = hexRe.exec(block)) !== null) add(m[0])
  }

  return colors.slice(0, 6)
}

function normalizeHex(hex: string): string | null {
  hex = hex.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
  }
  if (!/^#[0-9a-f]{6}$/.test(hex)) return null
  return hex
}

function extractLogo(html: string, base: string): string | null {
  const resolve = (rel: string) => {
    try {
      return new URL(rel, base).href
    } catch { return null }
  }

  // og:image
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (og?.[1]) return resolve(og[1])

  // apple-touch-icon
  const apple = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
              || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i)
  if (apple?.[1]) return resolve(apple[1])

  // favicon
  const fav = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
  if (fav?.[1]) return resolve(fav[1])

  // /favicon.ico fallback
  try { return new URL('/favicon.ico', base).href } catch { return null }
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
