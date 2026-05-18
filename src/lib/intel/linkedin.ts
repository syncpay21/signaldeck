/* ════════════════════════════════════════════════════════════════════
   LINKEDIN — fetch a public profile to learn who's actually receiving
   the pitch deck.

   This is a best-effort, public-page scrape. No login, no cookies, no
   headless browser auth. LinkedIn aggressively blocks unauthenticated
   crawlers; we accept partial / empty results gracefully and let the
   pipeline downgrade to "generic Series A audience" copy when we can't
   read the page.

   Why this matters: the deck reads completely differently when written
   for Alfred Lin (marketplace liquidity) vs Mamoon Hamid (developer
   tools). The model needs to know who's reading it.

   Output is cached for 7 days (the founder won't change the recipient
   list mid-edit, and LinkedIn rate-limits hard).
═══════════════════════════════════════════════════════════════════ */

export interface RecipientProfile {
  url:           string
  name:          string | null
  firm:          string | null
  role:          string | null
  bio:           string | null
  focus:         string[]              // best-effort interests / topics
  recentSignals: string[]              // recent post headlines / activity, if any
  source:        'linkedin-public' | 'cache' | 'unavailable'
  fetchedAt:     string                // ISO timestamp
}

const UA = 'Mozilla/5.0 (compatible; SignalDeckBot/1.0; +https://signaldeck.app/bot)'

/** Fetch a public LinkedIn profile. Returns a best-effort RecipientProfile.
 *  Failures (404, 403, parse error) return an `unavailable` record rather
 *  than throwing — the caller is expected to degrade gracefully. */
export async function fetchRecipientProfile(linkedinUrl: string): Promise<RecipientProfile> {
  const url = normaliseLinkedinUrl(linkedinUrl)
  const empty: RecipientProfile = {
    url,
    name: null, firm: null, role: null, bio: null,
    focus: [], recentSignals: [],
    source: 'unavailable',
    fetchedAt: new Date().toISOString(),
  }
  if (!url) return empty

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // 8s timeout via AbortController
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return empty
    const html = await res.text()
    return parsePublicProfile(url, html)
  } catch {
    return empty
  }
}

/** Parse the bits of a LinkedIn public profile page that survive their
 *  anonymous-render path. They serve a noscript / og:meta stub to bots,
 *  which is good enough to learn name + headline + firm. */
export function parsePublicProfile(url: string, html: string): RecipientProfile {
  const og  = (k: string) => extractMeta(html, `property="og:${k}"`) || extractMeta(html, `name="og:${k}"`)
  const tw  = (k: string) => extractMeta(html, `name="twitter:${k}"`)
  const ttl = (og('title') || tw('title') || extractTag(html, 'title') || '').trim()
  const desc = (og('description') || tw('description') || '').trim()

  // LinkedIn title formats:
  //  "Alfred Lin - Sequoia Capital | LinkedIn"
  //  "Mamoon Hamid - Partner at Kleiner Perkins | LinkedIn"
  let name: string | null = null
  let firm: string | null = null
  let role: string | null = null
  const m = ttl.match(/^(.+?)\s*-\s*(.+?)(?:\s*\|\s*LinkedIn)?$/i)
  if (m) {
    name = m[1].trim()
    const rest = m[2].trim()
    const at = rest.match(/^(.+?)\s+at\s+(.+)$/i)
    if (at) { role = at[1].trim(); firm = at[2].trim() }
    else    { firm = rest.trim() }
  }

  // Description is often a 200-char bio. Pull out comma-separated topics.
  const focus = topicsFromBio(desc)

  return {
    url,
    name, firm, role,
    bio: desc || null,
    focus,
    recentSignals: [],            // public scrape can't see activity reliably
    source: name ? 'linkedin-public' : 'unavailable',
    fetchedAt: new Date().toISOString(),
  }
}

function normaliseLinkedinUrl(s: string): string {
  if (!s) return ''
  const t = s.trim()
  try {
    const raw = /^https?:\/\//i.test(t) ? t : `https://${t}`
    const u = new URL(raw)
    // SSRF guard: only allow the exact linkedin.com domain (no subdomain tricks,
    // no linkedin.com.evil.com, no private-IP redirects).
    if (u.protocol !== 'https:') return ''
    if (u.hostname !== 'www.linkedin.com' && u.hostname !== 'linkedin.com') return ''
    // Strip query params / fragments — public profiles don't need them.
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    return ''
  }
}

function extractMeta(html: string, attr: string): string | null {
  const re = new RegExp(`<meta[^>]+${attr}[^>]+content="([^"]+)"`, 'i')
  const m = html.match(re)
  return m ? decodeHtml(m[1]) : null
}

function extractTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i')
  const m = html.match(re)
  return m ? decodeHtml(m[1]) : null
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/** Heuristic topic extraction from a 200-char bio. We look for VC vocabulary
 *  (Series A / B / Seed, sectors, theses). Not perfect but enough to bias
 *  the deck writer. */
function topicsFromBio(bio: string): string[] {
  if (!bio) return []
  const topics = new Set<string>()
  const v = bio.toLowerCase()
  const sectors = ['fintech','healthcare','climate','enterprise','saas','consumer','marketplace','devtools','developer tools','infrastructure','ai','ml','crypto','web3','biotech','edtech','proptech','logistics','supply chain','b2b','b2c','vertical saas','horizontal saas','open source']
  for (const s of sectors) if (v.includes(s)) topics.add(s)
  const stages = ['seed','pre-seed','series a','series b','series c','growth','late stage','early stage']
  for (const s of stages) if (v.includes(s)) topics.add(s)
  // Caps to keep prompt tight.
  return Array.from(topics).slice(0, 8)
}
