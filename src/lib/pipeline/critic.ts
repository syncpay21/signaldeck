/* ════════════════════════════════════════════════════════════════════
   CRITIC — Andreas reads the polished deck, scores each slide, and
   rewrites the weakest ones before it ships.

   Today's pipeline polishes line-by-line via GPT-4o but never asks
   "is the weakest slide actually good enough to send to an investor?"
   The critic asks that question and fixes the answer in one shot.

   Single Sonnet call, returns:
     - per-slide scores on 4 dimensions (hook / evidence / specificity / punch)
     - the 1-3 weakest slide IDs
     - revised content for those weak slides (same schema as input)

   Caller merges the revised slides into the final content payload.
   Best-effort: failure returns null and the caller ships the polished
   content as-is. Gated by ENABLE_CRITIC=false env.
═══════════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk'
import { ANDREAS_PERSONA } from '../andreas-persona'

export interface CriticInput {
  /** The deck content AFTER stage A4 polish — slide id → slide content JSON */
  deckContent: Record<string, any>
  narrativeId: string
  audience?:   string
  stage?:      string
  industry?:   string
  /** Slide IDs in narrative order so the critic can reason about arc */
  slideIds:    string[]
  /** Max number of slides to revise (default 3). Keeps token cost predictable. */
  maxRevisions?: number
}

export interface SlideScore {
  slideId:     string
  hook:        number     // 0-100 — does the opening line make me lean in?
  evidence:    number     // 0-100 — claims backed by numbers / names / proof?
  specificity: number     // 0-100 — concrete vs vague language
  punch:       number     // 0-100 — tight copy, no filler
  overall:     number     // 0-100 — Andreas's combined verdict
  critique:    string     // 1-2 sentences, Andreas's voice
}

export interface CriticResult {
  scores:           SlideScore[]
  weakestSlideIds:  string[]
  /** slide id -> revised slide content (same schema as input) */
  revisedSlides:    Record<string, any>
  /** 1-line summary of what Andreas changed */
  summary:          string
}

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
Final critique pass on the polished deck. You read the whole deck, score every slide on four dimensions, and rewrite the weakest 1-3 slides so they're actually good enough to send to an investor.

SCORING DIMENSIONS (each 0-100):
- hook:        does the opening line make a tired Series-A partner lean in?
- evidence:    are claims backed by numbers, named customers, or real proof — not vibes?
- specificity: concrete language vs generic "various solutions in the market" filler?
- punch:      tight copy, no filler, every word earns its place

REVISION RULES:
- Only revise the weakest 1-3 slides (you pick — whichever scored lowest overall).
- Return revisions in the EXACT SAME JSON schema as the input slide content. Same keys, same shape.
- Don't invent stats. If the founder didn't give you a number, don't make one up.
- Keep the narrative arc intact — the revision should plug INTO the surrounding slides, not change topic.
- If the slide is genuinely fine (overall >= 75), don't revise it for the sake of revising.

Return ONLY valid JSON, no markdown:
{
  "scores": [
    { "slideId": "s3_problem", "hook": 0-100, "evidence": 0-100, "specificity": 0-100, "punch": 0-100, "overall": 0-100, "critique": "<1-2 sentences in your voice>" },
    ...for every slide...
  ],
  "weakestSlideIds": ["s3_problem", "s5_fix"],
  "revisedSlides": {
    "s3_problem": { ...full slide content JSON same shape as input... }
  },
  "summary": "<1 line: what did you revise and why>"
}`

function buildUserPrompt(input: CriticInput): string {
  const slideBlock = input.slideIds.map((id, i) => {
    const c = input.deckContent[id]
    if (!c) return `[${i + 1}] ${id}: (missing)`
    return `[${i + 1}] ${id}:\n${JSON.stringify(c, null, 2)}`
  }).join('\n\n')

  const context: string[] = []
  if (input.audience) context.push(`Audience: ${input.audience}`)
  if (input.stage)    context.push(`Stage: ${input.stage}`)
  if (input.industry) context.push(`Industry: ${input.industry}`)
  context.push(`Narrative spine: ${input.narrativeId}`)
  context.push(`Max revisions: ${input.maxRevisions ?? 3}`)

  return `Critique this polished deck and revise the weakest slides.

CONTEXT:
${context.join('\n')}

DECK (in narrative order):

${slideBlock}

Return the JSON.`
}

export async function critiqueAndRevise(
  client: Anthropic,
  input: CriticInput,
): Promise<CriticResult | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
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

    // Defensive normalisation — only trust fields we recognise + clamp ranges
    const knownIds = new Set(input.slideIds)
    const scores: SlideScore[] = Array.isArray(parsed.scores)
      ? parsed.scores
          .filter((s: any) => s && typeof s.slideId === 'string' && knownIds.has(s.slideId))
          .map((s: any) => ({
            slideId:     s.slideId,
            hook:        clamp(s.hook),
            evidence:    clamp(s.evidence),
            specificity: clamp(s.specificity),
            punch:       clamp(s.punch),
            overall:     clamp(typeof s.overall === 'number' ? s.overall : (s.hook + s.evidence + s.specificity + s.punch) / 4),
            critique:    String(s.critique || ''),
          }))
      : []

    const weakestSlideIds: string[] = Array.isArray(parsed.weakestSlideIds)
      ? parsed.weakestSlideIds.filter((id: any) => typeof id === 'string' && knownIds.has(id)).slice(0, input.maxRevisions ?? 3)
      : []

    const revisedSlides: Record<string, any> = {}
    if (parsed.revisedSlides && typeof parsed.revisedSlides === 'object') {
      for (const [id, content] of Object.entries(parsed.revisedSlides)) {
        if (knownIds.has(id) && content && typeof content === 'object') {
          revisedSlides[id] = content
        }
      }
    }

    return {
      scores,
      weakestSlideIds,
      revisedSlides,
      summary: String(parsed.summary || ''),
    }
  } catch {
    return null
  }
}

function clamp(n: any): number {
  const v = typeof n === 'number' ? n : 0
  return Math.max(0, Math.min(100, v))
}

/** Should the caller apply Andreas's revisions to the polished content? */
export function shouldApplyRevisions(
  result: CriticResult | null,
  minOverallToRevise = 75,
): boolean {
  if (!result) return false
  if (!result.revisedSlides || Object.keys(result.revisedSlides).length === 0) return false
  // Only apply when at least one weakest slide actually scored below the threshold —
  // don't revise slides Andreas judged fine.
  const weakScores = result.scores.filter(s => result.weakestSlideIds.includes(s.slideId))
  return weakScores.some(s => s.overall < minOverallToRevise)
}
