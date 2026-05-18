/* ════════════════════════════════════════════════════════════════════
   INTENT CLASSIFIER — deterministic pre-planner.

   Before paying for a Haiku planner call we classify the founder's
   message with regex heuristics. The output tells the conductor:

   - intent     — which behavior bucket (edit / audit / vclens / etc.)
   - skipPlanner — true when the message is chit-chat or back-reference
                   only; the synthesiser can answer from context alone.
   - synth      — adaptive { maxTokens, temperature } for the synth call
   - domain     — detected specialist domain (medical / financial / etc.)
                  so the persona gets a small domain addendum.

   This module is pure — no async, no API calls. Adds <1ms of latency
   per turn but saves a planner round-trip on 25-30% of questions.
═══════════════════════════════════════════════════════════════════ */

export type Intent =
  | 'greeting'      // hi, thanks, ok, sounds good
  | 'meta'          // what can you do, who are you
  | 'edit'          // rewrite/change/tighten a slide
  | 'audit'         // score, how is my deck, audit
  | 'claims'        // what claims, what needs sourcing
  | 'vclens'        // what would a partner say
  | 'refine'        // polish the whole deck
  | 'followup'      // draft the email after the meeting
  | 'brand'         // make it warmer, change palette
  | 'framework'     // switch to jobs-to-be-done, lean canvas
  | 'demo'          // change demo to video/screenshot
  | 'narrative'     // explain why X, how should I tell the story
  | 'opinion'       // is this good, what do you think
  | 'unknown'

export type Domain =
  | 'medical' | 'financial' | 'legal' | 'hardware'
  | 'enterprise' | 'consumer' | 'devtools' | 'crypto' | 'ai'
  | 'generic'

export interface IntentResult {
  intent:       Intent
  domain:       Domain
  skipPlanner:  boolean
  isCompound:   boolean       // "audit and rewrite worst" → plan in stages
  synth:        { maxTokens: number; temperature: number }
  confidence:   number        // 0..1, classifier's own confidence
}

const PATTERNS: Array<{ intent: Intent; re: RegExp }> = [
  { intent: 'greeting',  re: /^(hi|hey|hello|yo|sup|thanks?|thank you|ok|okay|cool|got it|sounds good|nice|great|perfect)\b[!.?]*$/i },
  { intent: 'meta',      re: /\b(what can you do|who are you|how do you work|what tools|capabilities)\b/i },
  { intent: 'audit',     re: /\b(audit|score|grade|rate|how (is|good is)|how (well|investor[- ]ready)|critique|review)\b.*\b(deck|slide|pitch)\b|^audit\b/i },
  { intent: 'claims',    re: /\b(claims?|sources?|cite|citations?|proof|evidence|needs? source|risky|substantiat|verif)/i },
  { intent: 'vclens',    re: /\b(vc|partner|investor)\b.*\b(say|think|respond|react|view|see)|\b(seed vc|series [abc]|angel|strategic)\b/i },
  { intent: 'refine',    re: /\b(polish|tighten everything|investor[- ]grade|rewrite (all|whole|every)|sharpen the whole)\b/i },
  { intent: 'followup',  re: /\b(follow[- ]?up|thank[- ]?you (email|note)|email after|post[- ]meeting)\b/i },
  { intent: 'brand',     re: /\b(warmer|cooler|darker|lighter|softer|bolder|premium|palette|brand( world)?|aesthetic|hue|tone)\b/i },
  { intent: 'framework', re: /\b(framework|jobs[- ]to[- ]be[- ]done|jtbd|lean canvas|value prop|aarrr|narrative arc)\b/i },
  { intent: 'demo',      re: /\b(demo|embed|iframe|video|screenshot|live url|staging)\b/i },
  { intent: 'edit',      re: /\b(rewrite|edit|change|tighten|sharpen|punchier|shorten|expand|fix the|update the)\b.*\b(slide|headline|bullet|stat|lede|sub|tag)|^(make|turn|set) (it|the) /i },
  { intent: 'narrative', re: /\b(why|how should i|how do i|tell the story|explain|walk me through)\b/i },
  { intent: 'opinion',   re: /\b(is (this|that|it) good|what do you think|thoughts\??|is it ready|good enough)\b/i },
]

const DOMAIN_PATTERNS: Array<{ domain: Domain; re: RegExp }> = [
  { domain: 'medical',    re: /\b(medical|clinical|fda|hipaa|patient|disease|therap|biotech|pharma|surgical|diagnostic|drug|trial|neurology|cardio|oncolog)/i },
  { domain: 'financial',  re: /\b(fintech|payment|banking|lending|loan|credit|trading|invest|broker|insurance|securit|aml|kyc|sox)/i },
  { domain: 'legal',      re: /\b(legal|lawyer|attorney|compliance|gdpr|contract|litigat|regulator|sec filing)/i },
  { domain: 'hardware',   re: /\b(hardware|chip|sensor|silicon|robot|drone|manufactur|supply chain|bom|prototype|asic|fpga)/i },
  { domain: 'enterprise', re: /\b(enterprise|saas|b2b|fortune 500|procurement|cio|cto|deal cycle|six.figure)/i },
  { domain: 'consumer',   re: /\b(consumer|d2c|b2c|retail|shopper|brand awareness|cac|ltv|viral|tiktok)/i },
  { domain: 'devtools',   re: /\b(developer|api|sdk|cli|devops|ci\/cd|kubernetes|github|infra|platform)/i },
  { domain: 'crypto',     re: /\b(crypto|blockchain|web3|defi|nft|token|smart contract|wallet|chain|onchain)/i },
  { domain: 'ai',         re: /\b(ai|llm|gpt|machine learning|ml|model|training|inference|embedding|rag|agent)/i },
]

const COMPOUND_PATTERNS = [
  /\b(then|after that|and then|once|followed by)\b/i,
  /\b(first.*then|and also|plus)\b/i,
  /\?.*\?/, // two questions
]

export function classifyIntent(message: string, prior: string = ''): IntentResult {
  const text = message.trim()
  const lower = text.toLowerCase()

  // 1. Intent — first matching pattern wins (order matters: more specific first)
  let intent: Intent = 'unknown'
  let confidence = 0
  for (const { intent: i, re } of PATTERNS) {
    if (re.test(text)) {
      intent = i
      confidence = 0.75
      break
    }
  }
  // Very short / interjection-only messages tend to be follow-ups on prior context
  if (intent === 'unknown' && text.length < 30 && prior) {
    intent = 'narrative'
    confidence = 0.35
  } else if (intent === 'unknown') {
    intent = 'opinion'
    confidence = 0.20
  }

  // 2. Domain — first match wins; default generic
  let domain: Domain = 'generic'
  for (const { domain: d, re } of DOMAIN_PATTERNS) {
    if (re.test(text + ' ' + (prior || ''))) { domain = d; break }
  }

  // 3. Compound — message asks for two things at once
  const isCompound = COMPOUND_PATTERNS.some(re => re.test(text))

  // 4. Skip planner — chit-chat, greetings, meta questions, and pure opinion
  //    asks never need a tool. Save the Haiku call.
  const skipPlanner = intent === 'greeting' || intent === 'meta' ||
    (intent === 'opinion' && !lower.includes('audit') && !lower.includes('score'))

  // 5. Adaptive synth budget
  let maxTokens = 1500
  let temperature = 0.6
  if (intent === 'greeting' || intent === 'meta')   { maxTokens = 400;  temperature = 0.5 }
  else if (intent === 'edit')                        { maxTokens = 800;  temperature = 0.7 }
  else if (intent === 'audit' || intent === 'vclens'){ maxTokens = 2500; temperature = 0.4 }
  else if (intent === 'refine')                      { maxTokens = 2000; temperature = 0.5 }
  else if (intent === 'followup')                    { maxTokens = 1200; temperature = 0.7 }
  else if (intent === 'narrative')                   { maxTokens = 1800; temperature = 0.6 }
  else if (intent === 'opinion')                     { maxTokens = 1200; temperature = 0.4 }

  return { intent, domain, skipPlanner, isCompound, synth: { maxTokens, temperature }, confidence }
}

/** Domain-specific persona addendum — appended to ANDREAS_PERSONA when the
 *  classifier detects a specialist domain. Keeps the core persona lean while
 *  letting Andreas speak the right vocabulary. */
export function domainAddendum(domain: Domain): string {
  switch (domain) {
    case 'medical':
      return '\n\nDOMAIN: medical/clinical. Use FDA pathway, clinical-trial stage, reimbursement, key opinion leaders. Pre-answer the safety/efficacy/regulatory triple objection.'
    case 'financial':
      return '\n\nDOMAIN: fintech/financial. Use unit economics, take-rate, charge-back, compliance posture. Pre-answer the regulator + capital-requirement objection.'
    case 'legal':
      return '\n\nDOMAIN: legal/regulated. Be precise about jurisdictions, compliance, contracts. Never give actual legal advice.'
    case 'hardware':
      return '\n\nDOMAIN: hardware. Use BOM, gross margin at scale, supply chain risk, manufacturing pathway. Pre-answer the capex + lead-time objection.'
    case 'enterprise':
      return '\n\nDOMAIN: enterprise B2B. Use ACV, sales cycle length, expansion revenue, champion + economic buyer. Pre-answer the long-cycle objection.'
    case 'consumer':
      return '\n\nDOMAIN: consumer. Use CAC, LTV/CAC, viral coefficient, retention curves. Pre-answer the unit-economics objection.'
    case 'devtools':
      return '\n\nDOMAIN: devtools. Use bottom-up adoption, time-to-value, dev love, monetisation path. Pre-answer the open-source competition objection.'
    case 'crypto':
      return '\n\nDOMAIN: crypto/web3. Be sober — no token-pump language. Pre-answer the regulatory + sustainability objection.'
    case 'ai':
      return '\n\nDOMAIN: AI/ML. Use moat (data / distribution / latency), incumbent risk, inference cost trajectory. Pre-answer the "wrapper" objection.'
    default:
      return ''
  }
}
