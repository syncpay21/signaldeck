/* ════════════════════════════════════════════════════════════════════
   CRUNCHBASE — fetch a VC fund's recent investment history.

   Two paths:
     1. Official API if CRUNCHBASE_API_KEY env var is set (preferred)
     2. Public org page scrape as a best-effort fallback

   Output is intentionally narrow — sectors, stages, last N deals, avg
   check band. Just enough to bias the deck writer's framework choice
   and pre-empt the objections the fund's recent passes signal.

   Cached 30 days — VC investment cadence is monthly, not hourly.
═══════════════════════════════════════════════════════════════════ */

export interface Deal {
  company:     string
  date:        string          // YYYY-MM (precision varies)
  stage:       string | null   // 'Seed' | 'Series A' | ...
  sector:      string | null
  amount:      string | null   // '$12M' or null
  lead:        boolean | null
}

export interface VcInvestments {
  firm:                 string
  recentDeals:          Deal[]
  sectorDistribution:   Record<string, number>   // { fintech: 3, devtools: 5, ... }
  stageDistribution:    Record<string, number>
  avgCheck:             string | null             // '$8M-$15M' band
  source:               'crunchbase-api' | 'crunchbase-public' | 'unavailable'
  fetchedAt:            string
}

const UA = 'Mozilla/5.0 (compatible; SignalDeckBot/1.0; +https://signaldeck.app/bot)'

export async function fetchVcInvestments(firmName: string): Promise<VcInvestments> {
  const firm = (firmName || '').trim()
  const empty: VcInvestments = {
    firm,
    recentDeals: [],
    sectorDistribution: {},
    stageDistribution:  {},
    avgCheck: null,
    source: 'unavailable',
    fetchedAt: new Date().toISOString(),
  }
  if (!firm) return empty

  // Prefer the official API.
  if (process.env.CRUNCHBASE_API_KEY) {
    try {
      const v = await fetchViaApi(firm)
      if (v) return v
    } catch { /* fall through to scrape */ }
  }

  try {
    return await fetchViaPublicPage(firm) || empty
  } catch {
    return empty
  }
}

async function fetchViaApi(firm: string): Promise<VcInvestments | null> {
  const key = process.env.CRUNCHBASE_API_KEY!
  // The Crunchbase REST API requires an org lookup, then an investments
  // search keyed to that org. We keep this minimal — the founder mostly
  // benefits from sector + stage signal, not deep diligence data.
  const slug = firm.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const url = `https://api.crunchbase.com/api/v4/entities/organizations/${slug}?card_ids=raised_investments,participated_investments&user_key=${key}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const json: any = await res.json().catch(() => null)
  if (!json) return null

  const cards = json?.cards || {}
  const raw = [...(cards.raised_investments || []), ...(cards.participated_investments || [])]
  const deals: Deal[] = raw
    .map((r: any) => normaliseDeal(r))
    .filter((d): d is Deal => !!d)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 24)

  return finalise(firm, deals, 'crunchbase-api')
}

function normaliseDeal(r: any): Deal | null {
  // Best-effort: API response shapes vary by card.
  const company = r?.organization?.name || r?.funded_organization_identifier?.value
  const date    = r?.announced_on || r?.created_at || ''
  const stage   = r?.investment_type || r?.series || null
  const sector  = r?.organization?.short_description?.split(/[.,;]/)?.[0] || null
  const amount  = r?.money_raised?.value_usd ? `$${(r.money_raised.value_usd / 1e6).toFixed(1)}M` : null
  const lead    = typeof r?.is_lead_investor === 'boolean' ? r.is_lead_investor : null
  if (!company) return null
  return {
    company,
    date: String(date).slice(0, 7),
    stage,
    sector,
    amount,
    lead,
  }
}

async function fetchViaPublicPage(firm: string): Promise<VcInvestments | null> {
  const slug = firm.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const url = `https://www.crunchbase.com/organization/${slug}/recent_investments`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const html = await res.text()
  // The public page is mostly JS-rendered, but the JSON-LD blob carries
  // recent investment company names + dates. Best-effort regex.
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/i)
  let deals: Deal[] = []
  if (ld) {
    try {
      const obj = JSON.parse(ld[1])
      const items = Array.isArray(obj) ? obj : (obj['@graph'] || [obj])
      deals = items
        .map((it: any) => ({
          company: it?.name || it?.about?.name || '',
          date: String(it?.datePublished || it?.dateModified || '').slice(0, 7),
          stage: null, sector: null, amount: null, lead: null,
        }))
        .filter((d: Deal) => d.company)
        .slice(0, 12)
    } catch { /* silent */ }
  }
  if (!deals.length) return null
  return finalise(firm, deals, 'crunchbase-public')
}

function finalise(firm: string, deals: Deal[], source: VcInvestments['source']): VcInvestments {
  const sectorDistribution: Record<string, number> = {}
  const stageDistribution:  Record<string, number> = {}
  let amountSum = 0, amountN = 0
  for (const d of deals) {
    if (d.sector) sectorDistribution[d.sector] = (sectorDistribution[d.sector] || 0) + 1
    if (d.stage)  stageDistribution[d.stage]   = (stageDistribution[d.stage]  || 0) + 1
    const amt = d.amount ? Number(String(d.amount).replace(/[^0-9.]/g, '')) : 0
    if (amt) { amountSum += amt; amountN += 1 }
  }
  const avg = amountN ? Math.round(amountSum / amountN) : null
  return {
    firm,
    recentDeals: deals,
    sectorDistribution,
    stageDistribution,
    avgCheck: avg ? `~$${avg}M avg (${amountN} disclosed)` : null,
    source,
    fetchedAt: new Date().toISOString(),
  }
}
