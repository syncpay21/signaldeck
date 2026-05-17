/* ════════════════════════════════════════════════════════════════════
   STAGE 3 — Haiku narrative validation + slide suggestion

   Takes Sonnet's draft deck and asks Haiku two questions:
     1. Does the content actually match the narrative we routed to?
     2. Given the content as written, what narrative/slide set fits best?

   If Haiku's confidence is high enough, the caller swaps in the
   suggested slide order. Haiku is cheap + fast so this only adds
   ~2–4s to the total pipeline.

   Critical design choice: Haiku can ONLY reorder existing slides
   (subset of originalSlides). Adding a brand-new slide ID would
   require a second Sonnet call to populate its content — out of
   scope for v1. Suggestions that reference slides not in the
   original set are dropped.
═══════════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk'
import type { SlideId, Narrative, AudienceType, Stage, Industry } from '../types'
import { ANDREAS_PERSONA } from '../andreas-persona'

export interface HaikuValidationInput {
  deckContent: Record<string, any>
  narrativeId: Narrative
  audience:    AudienceType
  stage:       Stage
  industry:    Industry
  slideIds:    SlideId[]
}

export interface HaikuValidationResult {
  narrativeFit:      'yes' | 'no'
  confidence:        number          // 0–100
  suggestedNarrative: Narrative | null
  suggestedSlides:    SlideId[]      // filtered subset of original slideIds
  reasoning:         string
  raw?:              any             // unparsed, for debugging
}

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
Narrative-fit audit. You are given the deck's content + the narrative spine it was generated against.

Your job — three quick judgments:
1. NARRATIVE FIT: Does this deck content actually live up to the chosen narrative? (yes/no)
2. BETTER NARRATIVE: Looking at the content as written, what narrative would fit it best? (pick one)
3. SLIDE ORDER: Given the content, what slide order maximises clarity for this audience?

The 7 possible narratives are:
- bet-on-founder        (founder is the bet; conviction-led)
- show-me-the-machine   (Series A+; proof and traction first)
- make-me-believe       (vision / category-creation; belief stack)
- show-me-the-fit       (strategic partner; integration fit)
- clarity-and-confidence (internal/board; smallest-ask framing)
- solve-my-problem      (customer pitch; pain → fix → proof)
- lets-build-together   (partnership pitch; mutual upside)

CRITICAL: Your suggestedSlides MUST be a subset of the original slideIds provided. Reorder freely, but do NOT introduce slide IDs that aren't already there — they have no content.

Return ONLY valid JSON, no markdown fences:
{
  "narrativeFit": "yes" | "no",
  "confidence": 0-100,
  "suggestedNarrative": "<narrative-id>" | null,
  "suggestedSlides": ["s3_problem", "s5_fix", ...],
  "reasoning": "1-2 sentences explaining the call"
}`

function buildUserPrompt(input: HaikuValidationInput): string {
  return `Audience: ${input.audience}
Stage: ${input.stage}
Industry: ${input.industry}
Current narrative: ${input.narrativeId}
Original slide order: ${input.slideIds.join(' → ')}

Deck content:
${JSON.stringify(input.deckContent, null, 2)}

Audit this deck. Return the JSON exactly as specified — do not include any other text.`
}

const VALID_NARRATIVES = new Set<Narrative>([
  'bet-on-founder', 'show-me-the-machine', 'make-me-believe',
  'show-me-the-fit', 'clarity-and-confidence', 'solve-my-problem',
  'lets-build-together',
])

export async function validateNarrative(
  client: Anthropic,
  input: HaikuValidationInput,
): Promise<HaikuValidationResult> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
  })

  const rawText = (message.content[0] as any).text?.trim() ?? ''
  const jsonStr = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  let parsed: any
  try { parsed = JSON.parse(jsonStr) }
  catch {
    // Defensive: Haiku occasionally emits text around the JSON. Try to find the object.
    const m = jsonStr.match(/\{[\s\S]*\}/)
    if (!m) {
      return {
        narrativeFit: 'yes', confidence: 0, suggestedNarrative: null,
        suggestedSlides: input.slideIds, reasoning: 'Haiku returned unparseable response',
        raw: rawText,
      }
    }
    try { parsed = JSON.parse(m[0]) }
    catch { return { narrativeFit:'yes', confidence:0, suggestedNarrative:null, suggestedSlides:input.slideIds, reasoning:'Haiku JSON parse failed', raw: rawText } }
  }

  // Normalise + filter
  const narrativeFit = parsed.narrativeFit === 'no' ? 'no' : 'yes'
  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0))
  const suggestedNarrative: Narrative | null =
    typeof parsed.suggestedNarrative === 'string' && VALID_NARRATIVES.has(parsed.suggestedNarrative as Narrative)
      ? (parsed.suggestedNarrative as Narrative)
      : null

  // Haiku may only reorder existing slides — strip anything new.
  const origSet = new Set(input.slideIds)
  const suggestedSlides: SlideId[] = Array.isArray(parsed.suggestedSlides)
    ? parsed.suggestedSlides.filter((s: any): s is SlideId => typeof s === 'string' && origSet.has(s as SlideId))
    : input.slideIds
  // Don't accept a suggestion that's identical to the original — no point applying it.
  const finalSlides = suggestedSlides.length > 0 ? suggestedSlides : input.slideIds

  return {
    narrativeFit,
    confidence,
    suggestedNarrative,
    suggestedSlides: finalSlides,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
  }
}

/** Convenience: should the caller apply Haiku's suggested slide order? */
export function shouldApplySuggestion(
  result: HaikuValidationResult,
  originalSlides: SlideId[],
  threshold = 70,
): boolean {
  if (result.confidence < threshold) return false
  if (result.suggestedSlides.length === 0) return false
  // If the suggestion is identical to original, nothing to apply.
  if (
    result.suggestedSlides.length === originalSlides.length &&
    result.suggestedSlides.every((s, i) => s === originalSlides[i])
  ) return false
  return true
}
