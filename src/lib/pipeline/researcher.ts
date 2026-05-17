/* ════════════════════════════════════════════════════════════════════
   RESEARCHER — Andreas pulls real competitor positioning before
   writing the deck.

   Today Andreas only sees what the founder typed. Two slides land flat
   as a result: Competition (vague hand-waving) and Market (no proof
   that this space is hot). The researcher fixes that with a cheap
   two-step pass:

     1. Identify competitors:
        - If the founder provided any (intake.competitors), use those.
        - ALWAYS ask Sonnet to suggest 2-3 likely competitors (URL + why)
          based on the pitch — gap-filling, not replacing user input.
        - Merge, dedup by hostname, cap at 4 total.

     2. Scrape each competitor URL via the existing brand-extractor —
        returns colours, og:image, detected fonts, and the first chunk
        of meaningful page text (used for positioning analysis).

     3. Bundle into a ResearchResult the writing prompt can consume.

   No new infrastructure. Reuses extractBrand(). No API key. Best-
   effort: failure returns null, the pipeline ships without research.
   Gated by ENABLE_RESEARCHER=false env if needed.
═══════════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk'
import { extractBrand, type ExtractedBrand } from './brand-extractor'
import { ANDREAS_PERSONA } from '../andreas-persona'

export interface ResearcherInput {
  company?:   string
  industry?:  string
  oneLiner?:  string
  realStory?: string
  /** Free-text competitors from the founder — URLs, names, one per line or comma-separated. Optional. */
  competitors?: string
}

export interface CompetitorRecord {
  name:        string
  url:         string | null
  source:      'founder' | 'andreas-inferred'
  why:         string                // 1-line why Andreas thinks they're a competitor
  positioning: string | null         // 1-2 sentence extracted positioning, if scrape succeeded
  primaryHex:  string | null         // top extracted brand colour, if scrape succeeded
  ogImage:     string | null
}

export interface ResearcherResult {
  competitors: CompetitorRecord[]
  /** 1-line summary Andreas writes — what's the competitive shape of this space? */
  summary:     string
}

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
Pre-flight competitor identification. The founder is building a pitch deck and you need to ground the Competition + Market slides in real comparable companies — not vague hand-waving about "various solutions".

You are given the founder's company, industry, and pitch. Suggest 2-3 LIKELY competitors that an investor would mentally compare them to. Be honest — if you don't know specific competitors in the space, name the categories instead.

For each competitor:
- name:  the company name (e.g. "Stripe", "Vercel")
- url:   the canonical company URL with https:// prefix (e.g. "https://stripe.com"). If you don't know it, return null.
- why:   one sentence why this founder would be compared to them — what's the overlap?

Then write a 1-sentence summary of the competitive shape of the space (crowded / two-horse race / greenfield / fragmented / etc).

Return ONLY valid JSON, no markdown:
{
  "competitors": [
    { "name": "...", "url": "https://...", "why": "..." }
  ],
  "summary": "..."
}`

function buildUserPrompt(input: ResearcherInput, founderProvided: string[]): string {
  const lines: string[] = []
  if (input.company)   lines.push(`Company: ${input.company}`)
  if (input.industry)  lines.push(`Industry: ${input.industry}`)
  if (input.oneLiner)  lines.push(`One-liner: ${input.oneLiner}`)
  if (input.realStory) lines.push(`Founder story: ${input.realStory}`)
  if (founderProvided.length) {
    lines.push(`Competitors the founder already named: ${founderProvided.join(', ')} — don't repeat these; gap-fill with 2-3 more.`)
  }
  return `Identify the most likely investor-comparison competitors for this company.

${lines.join('\n')}

Return the JSON.`
}

/** Parse the founder's free-text competitors into a clean list of name+url tokens. */
function parseFounderCompetitors(raw?: string): { name: string; url: string | null }[] {
  if (!raw) return []
  return raw
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(token => {
      const urlMatch = token.match(/(https?:\/\/[^\s]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/i)
      if (urlMatch) {
        const raw = urlMatch[0]
        const url = raw.startsWith('http') ? raw : `https://${raw}`
        const name = token.replace(urlMatch[0], '').replace(/[-—–:]/g, ' ').trim() || hostnameOf(url)
        return { name, url }
      }
      return { name: token, url: null }
    })
    .slice(0, 4)
}

function hostnameOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

/** Pull a 1-2 sentence positioning from raw HTML — best-effort tag scrape. */
function extractPositioning(html: string): string | null {
  if (!html) return null
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
                ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
  if (ogDesc?.[1]) return ogDesc[1].trim().slice(0, 240)
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
  if (metaDesc?.[1]) return metaDesc[1].trim().slice(0, 240)
  // Fallback: first <h1> or <h2>
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1?.[1]) return h1[1].replace(/<[^>]+>/g, ' ').trim().slice(0, 240)
  return null
}

export async function runResearch(
  client: Anthropic,
  input: ResearcherInput,
): Promise<ResearcherResult | null> {
  try {
    const founderProvided = parseFounderCompetitors(input.competitors)
    const founderNames = founderProvided.map(c => c.name).filter(Boolean)

    // 1. Ask Andreas to suggest competitors (always — even if founder provided some,
    //    Andreas gap-fills with what they didn't list).
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input, founderNames) }],
    })

    const raw = (message.content[0] as any).text?.trim() ?? ''
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    let parsed: any
    try { parsed = JSON.parse(jsonStr) }
    catch {
      const m = jsonStr.match(/\{[\s\S]*\}/)
      if (!m) return null
      parsed = JSON.parse(m[0])
    }

    const inferred: { name: string; url: string | null; why: string }[] =
      Array.isArray(parsed.competitors)
        ? parsed.competitors
            .filter((c: any) => c && typeof c.name === 'string')
            .map((c: any) => ({
              name: String(c.name).trim(),
              url:  typeof c.url === 'string' && c.url.startsWith('http') ? c.url : null,
              why:  String(c.why || ''),
            }))
        : []

    // 2. Merge founder + inferred, dedup by hostname (URLs) and lowercased name.
    const seen = new Set<string>()
    const merged: CompetitorRecord[] = []
    const pushOnce = (rec: Omit<CompetitorRecord, 'positioning' | 'primaryHex' | 'ogImage'>) => {
      const key = rec.url ? hostnameOf(rec.url) : rec.name.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      merged.push({ ...rec, positioning: null, primaryHex: null, ogImage: null })
    }
    for (const c of founderProvided) pushOnce({ name: c.name, url: c.url, source: 'founder', why: 'Named by the founder' })
    for (const c of inferred)        pushOnce({ name: c.name, url: c.url, source: 'andreas-inferred', why: c.why })

    // Cap at 4 total so we don't run too many fetches
    const competitors = merged.slice(0, 4)

    // 3. Scrape each one that has a URL (best-effort, parallel). extractBrand
    //    returns null on fetch failure — keep the record but leave fields null.
    const enriched = await Promise.all(competitors.map(async (c): Promise<CompetitorRecord> => {
      if (!c.url) return c
      try {
        const brand: ExtractedBrand | null = await extractBrand(c.url).catch(() => null)
        // Brand-extractor doesn't return raw HTML — fetch it once more for positioning text.
        const html = await fetch(c.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SignalDeck/1.0; +https://signaldeck.app)' },
          signal: AbortSignal.timeout(6000),
        }).then(r => r.ok ? r.text() : '').catch(() => '')
        return {
          ...c,
          positioning: extractPositioning(html),
          primaryHex:  brand?.colors?.[0]?.hex ?? null,
          ogImage:     brand?.ogImage ?? null,
        }
      } catch {
        return c
      }
    }))

    return {
      competitors: enriched,
      summary:     String(parsed.summary || ''),
    }
  } catch {
    return null
  }
}

/** Format the research result as a text block ready to inject into the writing prompt. */
export function formatResearchForPrompt(result: ResearcherResult | null): string {
  if (!result || !result.competitors.length) return ''
  const lines: string[] = ['COMPETITIVE LANDSCAPE (researched, use for Competition + Market slides):']
  if (result.summary) lines.push(`Market shape: ${result.summary}`)
  for (const c of result.competitors) {
    const parts = [`- ${c.name}`]
    if (c.url) parts.push(`(${c.url})`)
    parts.push(`— ${c.why || 'comparable in space'}`)
    if (c.positioning) parts.push(`\n    positioning: "${c.positioning}"`)
    if (c.source === 'founder') parts.push(`\n    [named by founder]`)
    lines.push(parts.join(' '))
  }
  return lines.join('\n')
}
