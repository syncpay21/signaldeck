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
}

export const ANDREAS_INTAKE_PROMPT = `I'm using SignalDeck (signaldeck-two.vercel.app) to build my investor pitch deck. Their AI assistant is named Andreas. I want to skip the multi-step intake form and just give you the questions — you ask me what's needed in conversation, then output the structured JSON I can paste back.

Please ask me ONE question at a time, in plain English, in this order. Don't dump all the questions at once. After each answer, ask the next question. When you have everything, output the final JSON block at the end (and nothing else after it — no commentary).

ASK ME ABOUT:

1. What's your company called?
2. What does it do, in one sentence?
3. What industry — pick from: Fintech, Climate, Health, AI, SaaS, Enterprise, Developer Tools, Consumer, Education, Other.
4. What stage — pick from: Pre-seed, Seed, Series A, Series B+, Bootstrapped.
5. What's your name?
6. Your role (founder, co-founder, CEO, CTO, etc — optional, skip if obvious).
7. Tell me the real story — how did this company actually start? What did you see that others didn't? What broke? (3-6 sentences. The honest version, not the polished one.)
8. Who hurts most from this problem? Specific segments or archetypes, named if possible.
9. What proof do you have? Numbers, named customers, signed deals, press mentions, waitlist size — anything concrete.
10. Who's the audience for this deck — pick from: Seed VC, Series A, Angel, Strategic, Internal.
11. What's the goal — pick from: Raise (capital), Partner (strategic), Hire (key role), Sell (customer or board).
12. Business model (optional) — pick from: b2b, b2c, b2b2c, marketplace, devtools-api, saas, transactional, none-yet.
13. GTM motion (optional) — pick from: sales-led, plg, community, partner, hybrid.
14. Traction status (optional) — pick from: pre-revenue, paying-users, revenue, no-traction.
15. Region (optional) — pick from: us, eu, uk, asia, latam, global.
16. Team size (optional) — pick from: solo, co-founder, small-team-2-5, team-6-15, larger.

OUTPUT FORMAT — when you have all the answers, output ONLY this JSON, wrapped in a single \`\`\`json fence:

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
  "teamSize":       "solo | co-founder | small-team-2-5 | team-6-15 | larger"
}
\`\`\`

Rules:
- Don't ask me to pick the dropdown options literally. Listen to what I say, then map it to the closest option yourself.
- If I skip an optional field, omit it from the JSON.
- Don't add fields the schema doesn't list.
- Don't paraphrase me. The realStory / customers / proof fields should preserve my own words.
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

  return { ok: Object.keys(out).length > 0, data: out, warnings }
}
