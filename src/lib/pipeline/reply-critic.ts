/* ════════════════════════════════════════════════════════════════════
   REPLY CRITIC — deterministic post-synthesiser quality check.

   The synthesiser can slip in banned words or fabricated numbers
   despite strict instructions. This module runs after synth returns
   and flags issues so the conductor can:

   - downgrade confidence in the reply
   - append a "verify this" footnote when fabrication is suspected
   - log telemetry on how often the synthesiser hallucinates

   Zero API calls. Runs in <1ms. Distinct from critic.ts which is the
   heavyweight Sonnet pass that rewrites weak slides in the deck pipeline.
═══════════════════════════════════════════════════════════════════ */

const BANNED_WORDS = [
  'leverage', 'leveraging', 'leverages',
  'synergies', 'synergistic',
  'best-in-class', 'best in class',
  'robust',
  'cutting-edge', 'cutting edge',
  'next-generation', 'next generation',
  'revolutionary',
  'game-changing', 'game changing',
  'innovative',
  'world-class', 'world class',
  'paradigm shift',
  'seamless',
  'holistic',
]

const HEDGE_PHRASES = [
  /\bi'?m sorry\b/i,
  /\bas an ai\b/i,
  /\bi can'?t do that\b/i,
  /\bperhaps you (might|could|should)\b/i,
  /\byou might want to consider\b/i,
]

export interface ReplyCritique {
  bannedWordsFound:   string[]
  hedgesFound:        string[]
  suspectNumbers:     string[]
  confidence:         number    // 0..1 reply quality score
  shouldAppendCaveat: boolean
  caveat?:            string
}

/** Run all critic passes. `contextNumbers` is the set of numbers we know
 *  came from real data; any number in the reply that's NOT in this set
 *  is flagged as suspect (likely fabrication). */
export function critiqueReply(reply: string, contextNumbers: Set<string> = new Set()): ReplyCritique {
  const bannedWordsFound: string[] = []
  const hedgesFound: string[] = []

  for (const word of BANNED_WORDS) {
    const re = new RegExp(`\\b${word.replace(/-/g, '[-\\s]?')}\\b`, 'i')
    if (re.test(reply)) bannedWordsFound.push(word)
  }

  for (const re of HEDGE_PHRASES) {
    const match = reply.match(re)
    if (match) hedgesFound.push(match[0])
  }

  // Suspect-number detection. Pull every number-looking token from the
  // reply. If a number doesn't appear in contextNumbers AND isn't a trivial
  // small int / percentage, flag it.
  const numberRe = /\$?\b([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?)(%|x|M|B|K)?\b/g
  const suspectNumbers: string[] = []
  let m: RegExpExecArray | null
  while ((m = numberRe.exec(reply)) !== null) {
    const raw = m[0]
    const value = parseFloat(m[1].replace(/,/g, ''))
    if (!isNaN(value) && value <= 10 && !m[2]) continue
    if (raw === '100%' || raw === '50%' || raw === '0%') continue
    if (/^(19|20)[0-9]{2}$/.test(m[1])) continue
    const normalised = raw.replace(/[\$,]/g, '')
    if (contextNumbers.has(normalised) || contextNumbers.has(m[1])) continue
    suspectNumbers.push(raw)
  }

  let confidence = 1.0
  confidence -= bannedWordsFound.length * 0.15
  confidence -= hedgesFound.length * 0.10
  confidence -= Math.min(suspectNumbers.length, 4) * 0.12
  confidence = Math.max(0, Math.min(1, confidence))

  const shouldAppendCaveat = suspectNumbers.length >= 2 || confidence < 0.5
  const caveat = shouldAppendCaveat && suspectNumbers.length >= 2
    ? `\n\n_(Some numbers above I'm not 100% sure about — verify ${suspectNumbers.slice(0, 3).join(', ')} before quoting.)_`
    : undefined

  return {
    bannedWordsFound,
    hedgesFound,
    suspectNumbers,
    confidence,
    shouldAppendCaveat,
    caveat,
  }
}

/** Extract every numeric token from the workspace context. Called once per
 *  turn before critiqueReply() so the critic knows which numbers are real. */
export function extractContextNumbers(ctx: any): Set<string> {
  const nums = new Set<string>()
  const visit = (val: any, depth = 0) => {
    if (depth > 6 || val == null) return
    if (typeof val === 'number') nums.add(String(val))
    else if (typeof val === 'string') {
      const matches = val.match(/\$?[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?/g)
      if (matches) matches.forEach(n => nums.add(n.replace(/[\$,]/g, '')))
    }
    else if (Array.isArray(val)) val.forEach(v => visit(v, depth + 1))
    else if (typeof val === 'object') Object.values(val).forEach(v => visit(v, depth + 1))
  }
  visit(ctx)
  return nums
}
