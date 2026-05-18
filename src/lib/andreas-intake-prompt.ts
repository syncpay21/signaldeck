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
  "whyNow":             "1 line"
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

  // Statline block — all optional free-text fields
  ;(['revenue','growthRate','burnAndRunway','customerCount','namedCustomers',
    'retentionOrNps','pressOrAwards','waitlistOrPipeline','raisingAmount',
    'valuationOrTerms','leadInvestor','useOfFunds','nextMilestones',
    'teamHighlights','advisorsOrBoard','knownCompetitors','whyNow'] as Array<keyof IntakeJsonShape>)
    .forEach(k => str(k, false))

  return { ok: Object.keys(out).length > 0, data: out, warnings }
}
