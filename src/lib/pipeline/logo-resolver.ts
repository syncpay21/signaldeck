/* ════════════════════════════════════════════════════════════════════
   LOGO RESOLVER — prefer real, fall back to favicon CDN

   Tiers (highest first):
     1. User-uploaded logoData (handled in the client, not here)
     2. Extracted apple-touch-icon / icon / favicon from the site's HTML
        (already pulled by brand-extractor.ts)
     3. DuckDuckGo favicon service — no key, reliable for ~every domain,
        sizes vary 32–240px

   Returns null only when nothing's available (no website + no extracted).
═══════════════════════════════════════════════════════════════════ */

export function resolveLogoUrl(opts: {
  websiteUrl?: string | null
  extractedLogoUrl?: string | null
}): string | null {
  if (opts.extractedLogoUrl) return opts.extractedLogoUrl
  if (!opts.websiteUrl) return null
  try {
    const u = new URL(opts.websiteUrl.startsWith('http') ? opts.websiteUrl : `https://${opts.websiteUrl}`)
    const host = u.hostname.replace(/^www\./, '')
    return `https://icons.duckduckgo.com/ip3/${host}.ico`
  } catch {
    return null
  }
}
