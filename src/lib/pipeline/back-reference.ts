/* ════════════════════════════════════════════════════════════════════
   BACK-REFERENCE RESOLVER — deterministic resolution of pronouns and
   demonstratives in the founder's instruction.

   Examples we handle:
     "rewrite that slide"        → uses the slide id Andreas just edited
     "the one you mentioned"     → finds the most recently-named slide id
     "fix it"                    → assumes the active slide
     "do the same for s5_fix"    → expands to "apply prior edit to s5_fix"

   Pure module — no async, no API calls. Runs in <1ms before the planner
   sees the instruction. Returns a possibly-rewritten instruction string
   that's more explicit so the planner doesn't have to guess.
═══════════════════════════════════════════════════════════════════ */

import type { PriorTurn } from './conductor'

const DEMONSTRATIVES = [
  /\bthat slide\b/i,
  /\bthat one\b/i,
  /\bthat (problem|fix|solution|how|why|ask|team|traction|market|competition) slide\b/i,
  /\bthe (one|slide) (you|i) (mentioned|talked about|suggested|named|edited|rewrote|wrote)\b/i,
  /\b(rewrite|fix|edit|tighten|sharpen|change|update) it\b/i,
  /\b(do|try) the same\b/i,
  /\bagain\b/i,
]

const PRONOUNS = [
  /\b(it|this|that|those|these)\b/i,
]

export interface BackrefResult {
  /** Rewritten instruction with the inferred reference made explicit, or
   *  the original instruction if no ref needed resolving. */
  rewritten:  string
  /** Slide id that the back-reference resolved to, if any. */
  resolvedSlideId?: string
  /** True if we found a back-reference but couldn't resolve it (low confidence). */
  ambiguous:  boolean
  /** Reason / explanation for the rewrite — surfaced in the plan reasoning. */
  rationale?: string
}

/** Mine prior Andreas turns for slide IDs that were mentioned by name. The
 *  most recent mention wins. Slide IDs follow the pattern s\d+_word. */
function findRecentSlideId(prior: PriorTurn[]): string | null {
  for (let i = prior.length - 1; i >= 0; i--) {
    if (prior[i].role !== 'andreas') continue
    const m = prior[i].text.match(/\bs[0-9]+_[a-z_]+\b/)
    if (m) return m[0]
  }
  // Try the founder's prior message too — they may have named a slide
  for (let i = prior.length - 1; i >= 0; i--) {
    const m = prior[i].text.match(/\bs[0-9]+_[a-z_]+\b/)
    if (m) return m[0]
  }
  return null
}

/** Heuristic: which slide name does the founder reference by topic?
 *  "the problem slide" → s3_problem, etc. Uses common naming conventions. */
function inferByTopic(instruction: string, slideIds: string[]): string | null {
  const lower = instruction.toLowerCase()
  for (const id of slideIds) {
    const topic = id.split('_').slice(1).join('_')
    if (topic && lower.includes(topic.toLowerCase())) return id
  }
  return null
}

export function resolveBackReference(
  instruction: string,
  prior: PriorTurn[],
  slideIds: string[] = [],
  activeSlideId?: string,
): BackrefResult {
  const hasDemonstrative = DEMONSTRATIVES.some(re => re.test(instruction))
  const hasPronounOnly = !hasDemonstrative && PRONOUNS.some(re => re.test(instruction))

  // No back-reference → return unchanged
  if (!hasDemonstrative && !hasPronounOnly) {
    return { rewritten: instruction, ambiguous: false }
  }

  // Already names a slide explicitly → no rewrite needed
  if (/\bs[0-9]+_[a-z_]+\b/i.test(instruction)) {
    return { rewritten: instruction, ambiguous: false }
  }

  // Try resolution order: topic match in instruction → recent slide in chat → active slide
  let resolved: string | null = null
  let rationale = ''

  const byTopic = inferByTopic(instruction, slideIds)
  if (byTopic) {
    resolved = byTopic
    rationale = `Resolved "the ${byTopic.split('_').slice(1).join(' ')} slide" → ${byTopic}`
  }
  if (!resolved) {
    const recent = findRecentSlideId(prior)
    if (recent && slideIds.includes(recent)) {
      resolved = recent
      rationale = `Back-reference resolved to most recent slide mentioned: ${recent}`
    }
  }
  if (!resolved && activeSlideId && slideIds.includes(activeSlideId)) {
    resolved = activeSlideId
    rationale = `Back-reference resolved to active slide: ${activeSlideId}`
  }

  if (!resolved) {
    // Couldn't resolve — flag ambiguous so the synthesiser can ask
    return {
      rewritten: instruction,
      ambiguous: hasDemonstrative,  // pronoun-only is too weak to flag
      rationale: 'Demonstrative used but no slide ID could be resolved',
    }
  }

  // Rewrite by appending the resolution as an explicit hint
  const rewritten = `${instruction}\n[resolved: ${resolved}]`
  return { rewritten, resolvedSlideId: resolved, ambiguous: false, rationale }
}
