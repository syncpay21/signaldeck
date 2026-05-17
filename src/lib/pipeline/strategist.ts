/* ════════════════════════════════════════════════════════════════════
   STRATEGIST — Andreas reasons about the founder's actual story
   and either confirms or overrides the deterministic narrative pick.

   Today selectNarrative() picks 1 of 7 spines from a (audience, goal)
   lookup table. That ignores everything specific to THIS founder —
   their story, customers, proof, moat, stage of evidence.

   Andreas the strategist runs a Haiku pre-flight before Sonnet writes
   the deck:

     1. Reads the founder's full intake
     2. Sees the deterministic pick + all 7 candidate narratives
     3. Either confirms the pick (with a 1-2 sentence "why this fits")
        or overrides to a better-fit spine (with reasoning + the
        runner-up)

   Caller decides whether to apply the override based on confidence.
   Default threshold: 70.

   Returns null on any failure (caller falls back to the deterministic
   pick) so a Haiku outage never blocks generation.
═══════════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk'
import { NARRATIVE_CONFIGS } from '../narrative-engine'
import type { Narrative, NarrativeConfig } from '../types'
import { ANDREAS_PERSONA } from '../andreas-persona'

export interface StrategistInput {
  /** Founder intake — everything we have about the company */
  company?:    string
  industry?:   string
  oneLiner?:   string
  realStory?:  string
  customers?:  string
  proof?:      string
  audience?:   string
  stage?:      string
  /** What the deterministic selectNarrative() picked. Andreas confirms or overrides. */
  deterministicPick: Narrative
}

export interface StrategistResult {
  /** The narrative Andreas thinks fits best. May equal the deterministic pick. */
  pickedNarrative:   Narrative
  /** 0-100 — Andreas's confidence in this pick */
  confidence:        number
  /** 1-2 sentences in Andreas's voice explaining why this spine */
  reasoning:         string
  /** Second-best spine + why it didn't win */
  runnerUp:          Narrative | null
  runnerUpReason:    string
  /** True when Andreas overrode the deterministic pick */
  usedOverride:      boolean
}

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
Pre-flight narrative selection. Before the writing pass runs, you choose the narrative spine that fits THIS founder's actual story — not just their audience + goal lookup.

You are given:
- The founder's intake (company, industry, story, customers, proof, audience, stage)
- The deterministic system's pick (a starting point — may or may not be right)
- All 7 candidate narrative spines with their core questions and structures

Reason briefly about THIS founder's specific situation: what's their evidence? what's their moat? do they have repeatable customers or just early belief? is the founder the moat or is it the product? Then choose the spine.

You may confirm the deterministic pick OR override it. If you override, the founder needs to know why.

Return ONLY valid JSON, no markdown:
{
  "pickedNarrative":  "<one of: bet-on-founder | show-me-the-machine | make-me-believe | show-me-the-fit | clarity-and-confidence | solve-my-problem | spark-momentum>",
  "confidence":       <0-100, how sure you are this is the right spine>,
  "reasoning":        "<1-2 sentences in your own voice, specific to this founder>",
  "runnerUp":         "<second-best spine id, or null if no close second>",
  "runnerUpReason":   "<1 sentence why the runner-up didn't win for this founder>",
  "usedOverride":     <true if you picked something other than the deterministic pick>
}`

function buildUserPrompt(input: StrategistInput): string {
  const sources: string[] = []
  if (input.company)   sources.push(`Company: ${input.company}`)
  if (input.industry)  sources.push(`Industry: ${input.industry}`)
  if (input.oneLiner)  sources.push(`One-liner: ${input.oneLiner}`)
  if (input.audience)  sources.push(`Audience: ${input.audience}`)
  if (input.stage)     sources.push(`Stage: ${input.stage}`)
  if (input.realStory) sources.push(`Founder story: ${input.realStory}`)
  if (input.customers) sources.push(`Customers: ${input.customers}`)
  if (input.proof)     sources.push(`Proof: ${input.proof}`)

  // Build the candidate-narrative reference block from NARRATIVE_CONFIGS
  // so Andreas has the same source of truth the code uses.
  const candidates = Object.values(NARRATIVE_CONFIGS).map(n => (
    `- ${n.id}: ${n.coreQuestion}\n    spine: ${n.narrativeSpine}\n    audience fit: ${n.audience}`
  )).join('\n')

  return `FOUNDER INTAKE:
${sources.join('\n')}

DETERMINISTIC SYSTEM'S PICK: ${input.deterministicPick}

CANDIDATE NARRATIVES:
${candidates}

Choose the narrative that fits this specific founder. Confirm the deterministic pick if it fits, override if a different spine clearly fits better. Return the JSON.`
}

const VALID_NARRATIVES: Narrative[] = Object.keys(NARRATIVE_CONFIGS) as Narrative[]

export async function pickStrategicNarrative(
  client: Anthropic,
  input: StrategistInput,
): Promise<StrategistResult | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
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

    const picked = VALID_NARRATIVES.includes(parsed.pickedNarrative)
      ? parsed.pickedNarrative as Narrative
      : input.deterministicPick
    const runnerUp = VALID_NARRATIVES.includes(parsed.runnerUp) ? parsed.runnerUp as Narrative : null

    return {
      pickedNarrative: picked,
      confidence:      typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, parsed.confidence)) : 60,
      reasoning:       String(parsed.reasoning || ''),
      runnerUp,
      runnerUpReason:  String(parsed.runnerUpReason || ''),
      usedOverride:    picked !== input.deterministicPick,
    }
  } catch {
    return null
  }
}

/** Should the caller apply Andreas's pick (over the deterministic one)? */
export function shouldApplyStrategistPick(
  result: StrategistResult | null,
  confidenceThreshold = 70,
): boolean {
  if (!result) return false
  if (!result.usedOverride) return false  // already matches deterministic
  return result.confidence >= confidenceThreshold
}
