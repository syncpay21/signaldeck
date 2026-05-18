/* ════════════════════════════════════════════════════════════════════
   ANDREAS INTAKE PROMPT — for the AI-assist intake mode.

   Founders who don't want to fill out a multi-step form can paste this
   prompt into their own AI (Claude / ChatGPT / Gemini), answer the
   questions in conversation, then paste the structured JSON the AI
   returns back into SignalDeck.

   What this file owns:
     - ANDREAS_INTAKE_PROMPT: the full prompt the founder copies
     - ANDREAS_INTAKE_SCHEMA: the exact JSON shape the AI must return
     - parseIntakeJson(): client-side parser + validator

   What it does NOT cover: assets (logos, photos), URLs (website,
   competitors), the dark-tactics toggle, and the founder's free-text
   "in your own words" overview. Those stay separate fields on the
   AI-assist Page 2 so the founder still owns them directly.
═══════════════════════════════════════════════════════════════════ */

export interface IntakeJsonShape {
  company:          string
  oneLiner:         string
  industry:         string
  stage:            string
  founderName:      string
  founderRole?:     string
  realStory:        string
  customers:        string
  proof:            string
  audience:         string
  goal:             string
  businessModel?:   string
  gtmMotion?:       string
  tractionStatus?:  string
  region?:          string
  teamSize?:        string
  /* ─── EXPANDED STATLINE BLOCK ───
     Structured fields so Andreas can use exact numbers in slides rather
     than vague summaries. Every field is optional — founders skip what
     they don't have. */
  // Money
  revenue?:           string   // e.g. "$840k ARR", "$2.1M GMV monthly"
  growthRate?:        string   // e.g. "23% MoM for 6 months", "3x YoY"
  burnAndRunway?:     string   // e.g. "$180k/mo burn, 14 months runway"
  // Customers
  customerCount?:     string   // e.g. "700K customers", "42 enterprise logos"
  namedCustomers?:    string   // comma-separated, e.g. "Shopify, Notion, Vercel"
  retentionOrNps?:    string   // e.g. "NPS 72", "118% net retention"
  // Distribution
  pressOrAwards?:     string   // e.g. "TechCrunch 2024, Y Combinator W23"
  waitlistOrPipeline?:string   // e.g. "8,400 waitlist", "$2.3M in pipeline"
  // Round
  raisingAmount?:     string   // e.g. "$5M seed", "$25M Series A"
  valuationOrTerms?:  string   // optional, e.g. "$25M pre-money cap"
  leadInvestor?:      string   // e.g. "Sequoia (committed)"
  useOfFunds?:        string   // 1-2 sentences on what the money does
  nextMilestones?:    string   // 2-3 milestones the round funds
  // Team
  teamHighlights?:    string   // notable backgrounds e.g. "ex-Stripe / Notion / ML PhD"
  advisorsOrBoard?:   string   // names of notable advisors
  // Strategic
  knownCompetitors?:  string   // names the founder already tracks
  whyNow?:            string   // 1-line "why this is inevitable now"
  /* ─── EXTRA EVIDENCE (all optional) ───
     Even more structured fields so Andreas can lift verbatim instead of
     researching. Founders skip every one they don't have. */
  customerTestimonials?: string  // 1-3 verbatim quotes with attribution
  signedDeals?:          string  // pipeline / signed enterprise deals
  partnerships?:         string  // integration partners, channel partners
  unitEconomics?:        string  // CAC, LTV, payback, margin, contribution
  revenueProjection?:    string  // 1-3 forward-looking lines (e.g. "$5M ARR by EoY 25")
  cohortRetention?:      string  // M1/M3/M6/M12 retention pattern
  pastFunding?:          string  // round history: angels, pre-seed, accelerator
  investorObjections?:   string  // pushback they've heard + how they answer
  liveProductUrl?:       string  // demo URL — Andreas can iframe
  upcomingLaunches?:     string  // shipping in next 30/60/90
  industryStat?:         string  // a credible external stat that frames the market
  regulatoryStatus?:     string  // licences, compliance achieved
  ipOrPatents?:          string  // patents filed/granted, trade secrets
  openRoles?:            string  // key hires this round funds
  channelMix?:           string  // current acquisition channels + cost split
  geographicPlay?:       string  // current geos + expansion plans
  pressQuotes?:          string  // verbatim press / analyst pull-quotes
  /** The founder's OWN AI drafted the full deck content. When present,
   *  SignalDeck skips the heavy writer Sonnet call and only runs a
   *  Haiku fact-check + rephrase pass on top. ~75% cost reduction. */
  draftedDeck?: Record<string, any>
}

export const ANDREAS_INTAKE_PROMPT = `I'm using SignalDeck (signaldeck-two.vercel.app) to build my investor pitch deck. Their AI assistant is named Andreas. I want to skip the multi-step intake form and just give you the questions — you ask me what's needed in conversation, then output the structured JSON I can paste back.

Please ask me ONE question at a time, in plain English, in this order. Don't dump all the questions at once. After each answer, ask the next question. When you have everything, output the final JSON block at the end (and nothing else after it — no commentary).

If I say "skip" or "I don't have that" for any question, just move on. Optional fields are clearly marked.

ASK ME ABOUT:

═══ BASICS ═══
1. What's your company called?
2. What does it do, in one sentence?
3. What industry — pick from: Fintech, Climate, Health, AI, SaaS, Enterprise, Developer Tools, Consumer, Education, Other.
4. What stage — pick from: Pre-seed, Seed, Series A, Series B+, Bootstrapped.
5. What's your name?
6. Your role (optional — founder, co-founder, CEO, CTO, etc).

═══ STORY ═══
7. Tell me the real story — how did this company actually start? What did you see that others didn't? What broke? (3-6 sentences. The honest version, not the polished one.)
8. Who hurts most from this problem? Specific segments or archetypes, named if possible.
9. Why is now the right moment? What changed in the world that made this inevitable? (optional, 1 line)

═══ CURRENT NUMBERS (statlines we'll cite verbatim) ═══
10. Revenue (optional) — exact number with the unit you use. ARR / MRR / monthly GMV / GPV / transactions / etc. Skip if pre-revenue.
11. Growth rate (optional) — e.g. "23% MoM for 6 months", "3x YoY", "tripled customers since Jan".
12. Customer count (optional) — e.g. "700K consumers", "42 enterprise logos", "8 paid pilots".
13. Named customers you're comfortable disclosing in the deck (optional) — comma-separated.
14. Retention / NPS / engagement metric you cite (optional) — e.g. "NPS 72", "118% net retention", "DAU/MAU 0.55".
15. Press, awards, accelerator badges you'd want on the deck (optional) — e.g. "Y Combinator W23, TechCrunch 2024".
16. Waitlist or pipeline number (optional) — e.g. "8,400 waitlist", "$2.3M qualified pipeline".

═══ THIS ROUND ═══
17. How much are you raising this round (optional) — e.g. "$5M seed", "$25M Series A".
18. Valuation or terms you want to share (optional, skip if not disclosing) — e.g. "$25M pre-money cap".
19. Lead investor or commitments to date (optional) — e.g. "Sequoia leading", "60% committed".
20. Use of funds (optional, 1-2 sentences) — what does the money do?
21. Next milestones the round funds (optional) — 2-3 specific targets, e.g. "1.5M customers, $50M ARR, business banking launch".

═══ TEAM ═══
22. Notable team backgrounds (optional) — e.g. "ex-Stripe, ex-Notion, ML PhD Stanford".
23. Advisors / board (optional) — names of people who'd matter on the deck.

═══ MARKET ═══
24. Known competitors (optional, comma-separated) — names you already track. Andreas will research them if you don't list any.

═══ DECK GOAL ═══
25. Who's the audience — pick from: Seed VC, Series A, Angel, Strategic, Internal.
26. Goal — pick from: Raise, Partner, Hire, Sell.

═══ ROUTING (all optional) ═══
27. Business model — b2b / b2c / b2b2c / marketplace / devtools-api / saas / transactional / none-yet.
28. GTM motion — sales-led / plg / community / partner / hybrid.
29. Traction status — pre-revenue / paying-users / revenue / no-traction.
30. Region — us / eu / uk / asia / latam / global.
31. Team size — solo / co-founder / small-team-2-5 / team-6-15 / larger.

═══ DRAFT THE FULL DECK CONTENT ═══

After you've collected my answers, BEFORE you output the JSON, draft the
full pitch deck content yourself. SignalDeck's Andreas will then fact-check
your draft against the statlines and supporting docs, rephrase any weak
stats, and design the visual layout — but YOU do the writing.

IMPORTANT: Slide count is driven entirely by what the founder has. Use
your judgment:

  Seed / angel / pre-revenue    →  6-9 slides   (lean, conviction-first)
  Series A / B, SaaS / consumer → 10-13 slides  (traction + team + market)
  Series B+ / C, complex product → 13-18 slides  (full story: tech, reg,
    unit economics, go-to-market, use of funds broken out, clinical data,
    hardware roadmap — whatever the round demands)
  Hardware / medtech / deep tech → can go up to 18 slides because investors
    need to understand the device, the regulatory pathway, the clinical
    validation, the manufacturing plan, AND the commercial model.

Never add a slide just to hit a number. Never omit a slide that's
genuinely needed. The deck length is the right length.

ALWAYS include (every deck regardless of stage):
  s1_intro       — company name + one-line hook
  s3_problem     — the core pain with real consequences
  s5_fix         — the solution and key outcomes
  s12_team_ask   — round size + use of funds + milestones

ADD ONLY IF the founder gave you real content:
  s2_situation   — why now / macro shift that makes this inevitable
  s4_implication — cost of doing nothing ($ or time lost)
  s6_how         — how the product works, step by step
  s7_validation  — traction: stats, named customers, retention, NPS
  s8_market      — TAM / SAM / SOM (only with real numbers or credible source)
  s9_customers   — named segments / archetypes with use cases
  s10_competition— competitive matrix vs named competitors
  s11_risks      — risk + mitigation (required for regulated / hardware / Series A+)
  s13_traction   — standalone growth slide when numbers are genuinely strong
  s14_team       — full team slide when credentials are a selling point
  s15_technology — proprietary tech, IP, architecture (deep tech / hardware only)
  s16_clinical   — clinical data, trials, FDA pathway (medtech / neurology only)
  s17_regulatory — regulatory status, licences, compliance (health / fintech / defence)
  s18_manufacturing — production plan, COGS, supply chain (hardware only)
  s19_gtm        — go-to-market motion, channel breakdown, sales cycle
  s20_financials — revenue model, unit economics, projections (Series B+ / C)

Available slide schemas:
  s1_intro:        { tag, headline, sub, lede, stats[] }
  s2_situation:    { tag, headline, sub, lede, shifts[{name,desc}] }
  s3_problem:      { tag, headline, sub, lede, cards[{num,head,body,foot}] }
  s4_implication:  { tag, headline, sub, lede, cost:{value,label}, multipliers[{value,label}] }
  s5_fix:          { tag, headline, sub, lede, checks[] }
  s6_how:          { tag, headline, sub, lede, steps[{head,body}] }
  s7_validation:   { tag, headline, sub, lede, stats[{value,label}] }
  s8_market:       { tag, headline, sub, lede, stats[{value,label}] }
  s9_customers:    { tag, headline, sub, lede, bullets[] }
  s10_competition: { tag, headline, sub, matrix:{columns[],rows[{label,cells[]}]} }
  s11_risks:       { tag, headline, sub, lede, pairs[{risk,mitigation}] }
  s12_team_ask:    { tag, headline, sub, lede, stats[{value,label}], bullets[] }
  s13_traction:    { tag, headline, sub, lede, stats[{value,label}] }
  s14_team:        { tag, headline, sub, lede, bullets[] }
  s15_technology:  { tag, headline, sub, lede, bullets[] }
  s16_clinical:    { tag, headline, sub, lede, stats[{value,label}], bullets[] }
  s17_regulatory:  { tag, headline, sub, lede, checks[] }
  s18_manufacturing:{ tag, headline, sub, lede, steps[{head,body}] }
  s19_gtm:         { tag, headline, sub, lede, steps[{head,body}] }
  s20_financials:  { tag, headline, sub, lede, stats[{value,label}], bullets[] }

Writing rules:
  - Headlines: 2-6 words, punchy, no buzzwords
  - Bullets: outcome-led, never feature-led
  - Stats: lift founder's exact numbers verbatim; mark "[needs founder data]" if missing
  - Tone: match the founder's voice from realStory
  - Never invent customer names, dollar amounts, growth rates, or clinical claims
  - For medtech / neurology / hardware: be precise about what is proven vs projected
  - Never add a slide just to fill space — every slide must earn its place

Output the drafted content as a "draftedDeck" object inside the JSON.
Only include the slide keys you actually wrote.

═══ EXTRA EVIDENCE (all optional — say "skip" if not applicable) ═══
32. Customer testimonials — 1-3 verbatim quotes with name + role.
33. Signed deals or pipeline — specific contracts signed or in legal.
34. Partnerships — integration partners, channel partners, official accelerators.
35. Unit economics — CAC, LTV, payback period, gross margin, contribution.
36. Revenue projection — what you forecast hitting in 12 / 24 months (with caveats).
37. Cohort retention — M1 / M3 / M6 / M12 retention curve.
38. Past funding history — angels, pre-seed, accelerators, notable previous rounds.
39. Investor objections — pushback you've heard most + your answer (1-3 pairs).
40. Live product URL or demo link — Andreas can embed it.
41. Upcoming launches — what ships in next 30 / 60 / 90 days.
42. Industry stat — a credible external stat that frames why this market matters.
43. Regulatory status — licences held, compliance achieved (e.g. SOC-2, ADI, HIPAA).
44. IP or patents — patents filed / granted, key trade secrets.
45. Open roles this round funds — key hires you'd make with the capital.
46. Acquisition channel mix — current channels and rough cost split.
47. Geographic play — current geos and expansion plans.
48. Press / analyst pull-quotes — verbatim mentions, with source.

OUTPUT FORMAT — when you have all the answers, output ONLY this JSON, wrapped in a single \`\`\`json fence. Omit any field I skipped.

\`\`\`json
{
  "company":        "...",
  "oneLiner":       "...",
  "industry":       "Fintech | Climate | Health | AI | SaaS | Enterprise | Developer Tools | Consumer | Education | Other",
  "stage":          "Pre-seed | Seed | Series A | Series B+ | Bootstrapped",
  "founderName":    "...",
  "founderRole":    "...",
  "realStory":      "...",
  "customers":      "...",
  "proof":          "...",
  "audience":       "Seed VC | Series A | Angel | Strategic | Internal",
  "goal":           "Raise | Partner | Hire | Sell",
  "businessModel":  "b2b | b2c | b2b2c | marketplace | devtools-api | saas | transactional | none-yet",
  "gtmMotion":      "sales-led | plg | community | partner | hybrid",
  "tractionStatus": "pre-revenue | paying-users | revenue | no-traction",
  "region":         "us | eu | uk | asia | latam | global",
  "teamSize":       "solo | co-founder | small-team-2-5 | team-6-15 | larger",
  "revenue":            "exact number with unit",
  "growthRate":         "exact phrasing the founder uses",
  "burnAndRunway":      "monthly burn and months of runway",
  "customerCount":      "exact count with descriptor",
  "namedCustomers":     "comma-separated names",
  "retentionOrNps":     "metric + value",
  "pressOrAwards":      "comma-separated",
  "waitlistOrPipeline": "exact number with descriptor",
  "raisingAmount":      "round size",
  "valuationOrTerms":   "valuation or cap if disclosed",
  "leadInvestor":       "name plus status",
  "useOfFunds":         "1-2 sentence breakdown",
  "nextMilestones":     "specific targets the round funds",
  "teamHighlights":     "notable backgrounds",
  "advisorsOrBoard":    "names",
  "knownCompetitors":   "comma-separated names",
  "whyNow":             "1 line",
  "customerTestimonials": "1-3 verbatim quotes with attribution",
  "signedDeals":          "specific signed deals or pipeline",
  "partnerships":         "integration partners, channel partners",
  "unitEconomics":        "CAC, LTV, payback, margin",
  "revenueProjection":    "12-24mo forward forecast",
  "cohortRetention":      "M1/M3/M6/M12 pattern",
  "pastFunding":          "round history",
  "investorObjections":   "pushback + your answer",
  "liveProductUrl":       "URL",
  "upcomingLaunches":     "30/60/90 day roadmap",
  "industryStat":         "credible external stat",
  "regulatoryStatus":     "licences, compliance",
  "ipOrPatents":          "patents and IP",
  "openRoles":            "key hires this round funds",
  "channelMix":           "channels + cost split",
  "geographicPlay":       "current + expansion",
  "pressQuotes":          "verbatim press mentions",
  "draftedDeck": {
    "s1_intro":    { "tag":"intro",       "headline":"...", "sub":"...", "lede":"...", "stats":[] },
    "s3_problem":  { "tag":"the problem", "headline":"...", "sub":"...", "lede":"...", "cards":[{"num":"01","head":"...","body":"...","foot":"..."}] },
    "s5_fix":      { "tag":"the fix",     "headline":"...", "sub":"...", "lede":"...", "checks":["..."] },
    "s12_team_ask":{ "tag":"team & ask",  "headline":"...", "sub":"...", "lede":"...", "stats":[{"value":"$X","label":"raising"}], "bullets":["..."] }
  }
}
\`\`\`

Rules:
- Don't ask me to pick the dropdown options literally. Listen to what I say, then map it to the closest option yourself.
- If I skip an optional field, OMIT IT from the JSON. Don't write null or "skip".
- Don't add fields the schema doesn't list.
- Don't paraphrase the realStory / customers / proof / revenue / growthRate / namedCustomers fields. Preserve my own words and exact numbers — these get cited verbatim in the deck.
- The JSON is the last thing in your response. Nothing after.`

const VALID = {
  industry:       new Set(['Fintech','Climate','Health','AI','SaaS','Enterprise','Developer Tools','Consumer','Education','Other']),
  stage:          new Set(['Pre-seed','Seed','Series A','Series B+','Bootstrapped']),
  audience:       new Set(['Seed VC','Series A','Angel','Strategic','Internal']),
  goal:           new Set(['Raise','Partner','Hire','Sell']),
  businessModel:  new Set(['b2b','b2c','b2b2c','marketplace','devtools-api','saas','transactional','none-yet']),
  gtmMotion:      new Set(['sales-led','plg','community','partner','hybrid']),
  tractionStatus: new Set(['pre-revenue','paying-users','revenue','no-traction']),
  region:         new Set(['us','eu','uk','asia','latam','global']),
  teamSize:       new Set(['solo','co-founder','small-team-2-5','team-6-15','larger']),
}

export interface ParseResult {
  ok:       boolean
  data?:    Partial<IntakeJsonShape>
  /** Field paths that failed validation. Caller surfaces these to the founder. */
  warnings: string[]
  /** Hard parse error (couldn't find / parse JSON at all). */
  error?:   string
}

/** Parse a raw pasted response from the user's AI. Tolerant — extracts the
 *  first JSON object from anywhere in the text (with or without code fences),
 *  drops unknown fields, surfaces invalid enum values as warnings rather than
 *  hard failures. */
export function parseIntakeJson(raw: string): ParseResult {
  if (!raw || typeof raw !== 'string') return { ok: false, warnings: [], error: 'No text pasted' }

  // Strip code fences if present, then find the first {...} block.
  const stripped = raw
    .replace(/^[\s\S]*?```(?:json)?\s*\n/, '')
    .replace(/\n```[\s\S]*$/, '')
  const match = stripped.match(/\{[\s\S]*\}/) || raw.match(/\{[\s\S]*\}/)
  if (!match) return { ok: false, warnings: [], error: "Couldn't find a JSON block in the pasted text" }

  let parsed: any
  try { parsed = JSON.parse(match[0]) }
  catch (e: any) { return { ok: false, warnings: [], error: `JSON didn't parse: ${e.message}` } }

  const warnings: string[] = []
  const out: Partial<IntakeJsonShape> = {}
  const str = (k: keyof IntakeJsonShape, required = true) => {
    if (typeof parsed[k] === 'string' && parsed[k].trim()) {
      out[k] = parsed[k].trim() as any
    } else if (required) {
      warnings.push(`Missing or empty: ${k}`)
    }
  }
  const enumStr = (k: keyof IntakeJsonShape, valid: Set<string>, required = true) => {
    const v = typeof parsed[k] === 'string' ? parsed[k].trim() : ''
    if (v && valid.has(v)) {
      out[k] = v as any
    } else if (v) {
      warnings.push(`Unknown ${k}: "${v}" — not in the allowed list`)
    } else if (required) {
      warnings.push(`Missing: ${k}`)
    }
  }

  str('company')
  str('oneLiner')
  enumStr('industry', VALID.industry)
  enumStr('stage',    VALID.stage)
  str('founderName')
  str('founderRole', false)
  str('realStory')
  str('customers')
  str('proof')
  enumStr('audience', VALID.audience)
  enumStr('goal',     VALID.goal)
  enumStr('businessModel',  VALID.businessModel,  false)
  enumStr('gtmMotion',      VALID.gtmMotion,      false)
  enumStr('tractionStatus', VALID.tractionStatus, false)
  enumStr('region',         VALID.region,         false)
  enumStr('teamSize',       VALID.teamSize,       false)

  // Statline block + extra evidence — all optional free-text fields
  ;(['revenue','growthRate','burnAndRunway','customerCount','namedCustomers',
    'retentionOrNps','pressOrAwards','waitlistOrPipeline','raisingAmount',
    'valuationOrTerms','leadInvestor','useOfFunds','nextMilestones',
    'teamHighlights','advisorsOrBoard','knownCompetitors','whyNow',
    'customerTestimonials','signedDeals','partnerships','unitEconomics',
    'revenueProjection','cohortRetention','pastFunding','investorObjections',
    'liveProductUrl','upcomingLaunches','industryStat','regulatoryStatus',
    'ipOrPatents','openRoles','channelMix','geographicPlay','pressQuotes',
    ] as Array<keyof IntakeJsonShape>)
    .forEach(k => str(k, false))

  // draftedDeck — full slide content the founder's AI pre-wrote. Object,
  // not string; just pass through any shape with valid slide ids.
  if (parsed.draftedDeck && typeof parsed.draftedDeck === 'object') {
    out.draftedDeck = parsed.draftedDeck
  }

  return { ok: Object.keys(out).length > 0, data: out, warnings }
}
