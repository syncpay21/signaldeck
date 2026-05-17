/* ════════════════════════════════════════════════════════════════════
   STAGE 4 — GPT-4o copy polish + stat verification

   Takes the (possibly Haiku-adjusted) deck content and:
     1. Polishes every text field — headlines tighter, bullets sharper,
        ledes specific, tone aligned to narrative.
     2. Verifies every number against the input data. Flags invented
        metrics, unrealistic growth, broken TAM/SAM/SOM math. Returns
        corrections inline.

   Reuses the existing OpenAI client pattern from /api/refine.ts.
═══════════════════════════════════════════════════════════════════ */

import OpenAI from 'openai'
import type { SlideId, Narrative } from '../types'
import { ANDREAS_PERSONA } from '../andreas-persona'

export interface GptPolishInput {
  deckContent:  Record<string, any>
  slideIds:     SlideId[]
  narrativeId:  Narrative
  coreQuestion: string
  spine:        string
  rawInput:     {
    company?:    string
    problem?:    string
    solution?:   string
    traction?:   string
    market?:     string
    realStory?:  string
    [k: string]: any
  }
}

export interface StatFlag {
  slide:    SlideId
  metric:   string
  issue:    string         // why it's flagged
}

export interface StatCorrection {
  slide:    SlideId
  metric:   string
  original: string
  corrected:string
  reason:   string
}

export interface GptPolishResult {
  deckContent: Record<string, any>      // polished, same schema as input
  statVerification: {
    flagged:       StatFlag[]
    corrected:     StatCorrection[]
    allStatsValid: boolean
  }
  copyFeedback: string                  // 1-line summary of what changed
  raw?: any
}

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
Final-pass copy polish + stat verification. You are the last reviewer before this deck goes to investors.

You will receive:
 - The current deck content JSON (slide-keyed)
 - The narrative the deck was written for (core question + spine)
 - The raw founder input that produced this deck

Your job has TWO parts.

PART 1 — COPY POLISH (every text field):
- Headlines: 2–5 words max, punchy, UPPERCASE-friendly. No clichés ("revolutionary", "disruptive", "next-gen").
- Sub: one specific sentence.
- Lede: cut every filler word. 1–2 sentences. Specific, not vague.
- Bullets: outcome-first, evidence-backed, no buzzwords. Replace "innovative" with the actual feature.
- Stats values: DO NOT INVENT numbers. Keep numbers exactly as in the input — only fix obvious typos or unit inconsistencies.
- Stat labels: punchy and meaningful.
- Tags: keep exactly as-is.
- Tone: match the narrative spine.

PART 2 — STAT VERIFICATION:
For every numeric claim in the deck:
- Cross-check against the raw founder input. If the number isn't in the input, flag it.
- Check internal math (TAM > SAM > SOM, sums add up, growth rates plausible).
- Flag unrealistic claims (e.g., "10x growth in 3 months" without supporting data).
- Where you can fix a value with high confidence (e.g., typo, unit fix), do so and record it in 'corrected'.
- Otherwise, leave the value alone and record the issue in 'flagged'.

CRITICAL:
- Return JSON only, no markdown fences.
- The 'deckContent' field MUST have the same keys + sub-keys as the input — no additions, no deletions.
- 'flagged' should be empty when everything checks out.
- 'allStatsValid' = (flagged.length === 0 AND corrected.length === 0).

Return shape:
{
  "deckContent": { /* polished, same schema */ },
  "statVerification": {
    "flagged":   [{ "slide": "<slide_id>", "metric": "<which value>", "issue": "<why>" }],
    "corrected": [{ "slide": "<slide_id>", "metric": "<value>", "original": "<X>", "corrected": "<Y>", "reason": "<why>" }],
    "allStatsValid": true | false
  },
  "copyFeedback": "<1-sentence summary of major changes>"
}`

function buildUserPrompt(input: GptPolishInput): string {
  const inputSummary = [
    input.rawInput.company   && `Company: ${input.rawInput.company}`,
    input.rawInput.problem   && `Problem: ${input.rawInput.problem}`,
    input.rawInput.solution  && `Solution: ${input.rawInput.solution}`,
    input.rawInput.traction  && `Traction: ${input.rawInput.traction}`,
    input.rawInput.market    && `Market: ${input.rawInput.market}`,
    input.rawInput.realStory && `Founder story: ${input.rawInput.realStory}`,
  ].filter(Boolean).join('\n')

  return `NARRATIVE: ${input.narrativeId}
Core question: ${input.coreQuestion}
Spine: ${input.spine}

Slide set: ${input.slideIds.join(' → ')}

Raw founder input (use this to verify numbers):
${inputSummary || '(no structured input provided)'}

Current deck JSON:
${JSON.stringify(input.deckContent, null, 2)}

Polish the copy and verify the stats. Return JSON in the exact shape specified.`
}

export async function polishDeck(
  openai: OpenAI,
  input: GptPolishInput,
): Promise<GptPolishResult> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.4,
    max_tokens: 4000,                       // bumped from 2000 to fit content + corrections
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: buildUserPrompt(input) },
    ],
  })

  const rawText = completion.choices[0]?.message?.content ?? ''
  let parsed: any
  try { parsed = JSON.parse(rawText) }
  catch {
    // GPT-4o with response_format:json_object should always parse, but defensively…
    return {
      deckContent: input.deckContent,
      statVerification: { flagged: [], corrected: [], allStatsValid: true },
      copyFeedback: 'GPT-4o polish skipped — unparseable response',
      raw: rawText,
    }
  }

  // Defensive: ensure required fields exist
  const polishedContent = parsed.deckContent && typeof parsed.deckContent === 'object'
    ? parsed.deckContent
    : input.deckContent

  // Keep only slide keys that were in the original to avoid the renderer
  // encountering surprise slides.
  const filteredContent: Record<string, any> = {}
  for (const id of input.slideIds) {
    filteredContent[id] = polishedContent[id] ?? input.deckContent[id]
  }

  const sv = parsed.statVerification ?? {}
  const flagged: StatFlag[] = Array.isArray(sv.flagged) ? sv.flagged.filter((f: any) => f && typeof f === 'object') : []
  const corrected: StatCorrection[] = Array.isArray(sv.corrected) ? sv.corrected.filter((c: any) => c && typeof c === 'object') : []

  return {
    deckContent: filteredContent,
    statVerification: {
      flagged,
      corrected,
      allStatsValid: flagged.length === 0 && corrected.length === 0,
    },
    copyFeedback: typeof parsed.copyFeedback === 'string' ? parsed.copyFeedback : '',
  }
}
