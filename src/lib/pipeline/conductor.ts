/* ════════════════════════════════════════════════════════════════════
   CONDUCTOR — Andreas's orchestration brain.

   Two model calls that wrap the dispatch step in /api/andreas:

   - planSteps()       Haiku reads the founder's instruction + workspace
                       context + the tool catalog, returns a JSON plan
                       (which tools to call and with what args).

   - synthesiseReply() Sonnet reads the original instruction + the tool
                       results + the workspace context and produces a
                       unified reply in Andreas's voice.

   Both inherit ANDREAS_PERSONA. Both are best-effort — failure returns
   null so the caller can degrade gracefully.

   This file does NOT execute tools. That's the dispatcher's job, lives
   in /api/andreas.ts. Keeping planning + synthesis pure makes them
   testable without spinning up the whole endpoint.
═══════════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk'
import { ANDREAS_PERSONA } from '../andreas-persona'
import type { BrandWorld } from '../brand-world'
import type { ToolSpec } from './andreas-tools'

export interface ConductorContext {
  company?:       string
  industry?:      string
  audience?:      string
  stage?:         string
  founderName?:   string
  /** Which Workspace screen the founder's looking at right now */
  currentScreen?: string
  brandWorld?:    BrandWorld | null
  /** The deck content payload (slide id -> slide content JSON) */
  deckContent?:   Record<string, any> | null
  slideIds?:      string[]
  /** Which slide the founder has open in Deck Build, if any */
  activeSlideId?: string
  /** Pre-computed signals from other workspace screens — lets the planner
   *  answer from context instead of re-dispatching tools. Each is whatever
   *  the matching /api/<tool> endpoint last returned (or null). */
  auditData?:      any
  claimsData?:     any
  vcData?:         any
  signalsData?:    any
  designCritique?: any
}

export interface ToolStep {
  tool: string
  args: any
  why:  string
}

export interface ConductorPlan {
  steps:     ToolStep[]
  reasoning: string
}

export interface ToolResult {
  tool:   string
  result: any
  error?: string
}

/* ─── Planner ─────────────────────────────────────────────────────── */

function buildPlannerSystemPrompt(catalog: ToolSpec[]): string {
  const toolList = catalog.map(t => (
    `  - ${t.name}: ${t.description}\n    args schema: ${t.argsSchema}`
  )).join('\n')

  return `${ANDREAS_PERSONA}

YOUR JOB HERE
Plan the tool calls needed to answer the founder's instruction. You see the available tools and the current workspace context. Return JSON only — no prose around it.

AVAILABLE TOOLS:
${toolList}

OUTPUT FORMAT:
{
  "steps": [
    { "tool": "<tool name from catalog>", "args": { ... }, "why": "<one line>" }
  ],
  "reasoning": "<one line — your overall plan>"
}

RULES:
- Empty steps array is valid. If the founder asked something you can answer from context alone (definitions, opinions, narrative explanations), return zero steps and let synthesis handle it.
- ⚠ NEVER re-run a tool the workspace has already computed. If "Audit already run" appears in context, do NOT call the audit tool again — answer from those results. Same for claims, vclens. The founder can see the chip; running it twice is a UX failure.
- Only re-run a tool if the founder explicitly asked you to refresh it ("re-audit", "score again") OR if the deck has clearly changed since the cached result (the founder will say so).
- Never invent tool names. Only the catalog tools exist.
- If the instruction mentions a specific slide, look at activeSlideId in context first; otherwise infer from slideIds.
- Don't call audit + claims + vclens together unless the founder explicitly asked for a full review. Pick the single tool that answers what was actually asked.
- args MUST match the schema for each tool — don't invent arg keys, don't omit required ones.`
}

function buildContextSummary(ctx: ConductorContext): string {
  const lines: string[] = []
  if (ctx.company)       lines.push(`Company: ${ctx.company}`)
  if (ctx.industry)      lines.push(`Industry: ${ctx.industry}`)
  if (ctx.audience)      lines.push(`Audience: ${ctx.audience}`)
  if (ctx.stage)         lines.push(`Stage: ${ctx.stage}`)
  if (ctx.founderName)   lines.push(`Founder: ${ctx.founderName}`)
  if (ctx.currentScreen) lines.push(`Currently viewing: ${ctx.currentScreen}`)
  if (ctx.activeSlideId) lines.push(`Active slide: ${ctx.activeSlideId}`)
  if (ctx.slideIds && ctx.slideIds.length) lines.push(`Deck slides: ${ctx.slideIds.join(', ')}`)
  if (ctx.brandWorld) {
    lines.push(`Brand world: ${ctx.brandWorld.brandPersonality || 'generated'} — primary ${ctx.brandWorld.colour?.primary || '?'}`)
  }
  const hasContent = ctx.deckContent && Object.keys(ctx.deckContent).length > 0
  lines.push(`Deck content present: ${hasContent ? 'yes' : 'no'}`)

  // Pre-computed workspace signals — answer FROM these where possible instead
  // of re-dispatching the matching tool.
  if (ctx.auditData) {
    const a = ctx.auditData
    const overall = a.overall ?? a.score ?? null
    const tips = Array.isArray(a.tips) ? a.tips.slice(0, 3).map((t: any) => `${t.slide || '?'}: ${t.note || t.text || ''}`).join(' | ') : ''
    lines.push(`Audit already run — overall ${overall}/100${tips ? `. Top tips: ${tips}` : ''}`)
  }
  if (ctx.claimsData) {
    const c = ctx.claimsData
    const claims = Array.isArray(c.claims) ? c.claims : []
    const needSrc = claims.filter((x: any) => x.classification === 'needs-source' || x.classification === 'risky').length
    lines.push(`Claims already classified — ${claims.length} total, ${needSrc} need source/risky`)
  }
  if (ctx.vcData) {
    const v = ctx.vcData
    const verdict = v.verdict || v.takeaway || ''
    const concerns = Array.isArray(v.concerns) ? v.concerns.slice(0, 2).join(' | ') : ''
    lines.push(`VC lens already applied — verdict: ${String(verdict).slice(0, 140)}${concerns ? `. Concerns: ${concerns}` : ''}`)
  }
  if (ctx.designCritique && Array.isArray(ctx.designCritique.failures) && ctx.designCritique.failures.length) {
    lines.push(`Design critic flagged ${ctx.designCritique.failures.length} contrast issues in brand palette`)
  }
  if (ctx.signalsData) {
    const s = ctx.signalsData
    if (s.totalSessions > 0) {
      const drop = s.dropOffSlide ? `; ${s.dropOffSlide.sessions} sessions dropped off at "${s.dropOffSlide.label}"` : ''
      lines.push(`Viewership: ${s.totalSessions} sessions, ${s.reachedEnd || 0} reached end${drop}`)
    } else {
      lines.push('Viewership: deck published, no opens yet')
    }
  }

  return lines.join('\n')
}

export interface PriorTurn { role: 'founder' | 'andreas'; text: string }

function formatHistory(prior: PriorTurn[]): string {
  if (!prior || prior.length === 0) return '(no prior turns — this is the start of the conversation)'
  return prior.map(t => `${t.role === 'founder' ? 'Founder' : 'Andreas'}: ${t.text.slice(0, 600)}`).join('\n\n')
}

export async function planSteps(
  client: Anthropic,
  instruction: string,
  ctx: ConductorContext,
  catalog: ToolSpec[],
  prior: PriorTurn[] = [],
): Promise<ConductorPlan | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: buildPlannerSystemPrompt(catalog),
      messages: [{
        role: 'user',
        content: `CONVERSATION SO FAR:
${formatHistory(prior)}

LATEST FOUNDER INSTRUCTION:
"${instruction}"

WORKSPACE CONTEXT:
${buildContextSummary(ctx)}

Plan tools based on the LATEST instruction. Use the conversation so far for context — if the founder is referring back to something you said earlier ("rewrite that slide", "the one you mentioned"), resolve the reference from history. Return the JSON plan.`,
      }],
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

    const validNames = new Set(catalog.map(t => t.name))
    const steps: ToolStep[] = Array.isArray(parsed.steps)
      ? parsed.steps
          .filter((s: any) => s && typeof s.tool === 'string' && validNames.has(s.tool))
          .map((s: any) => ({
            tool: s.tool,
            args: s.args && typeof s.args === 'object' ? s.args : {},
            why:  String(s.why || ''),
          }))
      : []

    return {
      steps,
      reasoning: String(parsed.reasoning || ''),
    }
  } catch {
    return null
  }
}

/* ─── Synthesiser ─────────────────────────────────────────────────── */

const SYNTHESISER_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
The founder asked something. You may have dispatched sub-agents to gather information. Write a unified reply in your voice.

You see:
- The original instruction
- The tool results (may be empty if no tools were needed)
- Workspace context (current screen, deck content, brand world)

RULES:
- Don't recite raw JSON from tool results. Summarise what matters.
- If a tool returned actionable items (audit tips, weak claims, weak slides), mention the top 1-3 with specifics — not all of them.
- If edit_slide ran: state EXACTLY what one field changed and what it changed to ("Changed the headline to X"). Nothing else about that slide unless the founder asks. Do NOT offer opinions on the rest of the slide.
- If the founder asked for the VC lens, lead with the partner's takeaway, then the specific objections.
- Don't break character. No "I dispatched...", no "Based on the audit tool...", just your voice.
- Keep replies short — 2-4 sentences default. Founder can ask for more.
- Plain prose only. No markdown headers, no bullet lists unless the instruction explicitly asked for a list.`

export async function synthesiseReply(
  client: Anthropic,
  instruction: string,
  results: ToolResult[],
  ctx: ConductorContext,
  prior: PriorTurn[] = [],
): Promise<string> {
  const resultsBlock = results.length === 0
    ? '(no tools dispatched — answer from context and your own expertise)'
    : results.map(r => {
        if (r.error) return `[${r.tool}] FAILED: ${r.error}`
        return `[${r.tool}]\n${JSON.stringify(r.result, null, 2).slice(0, 2000)}`
      }).join('\n\n')

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYNTHESISER_PROMPT,
      messages: [{
        role: 'user',
        content: `CONVERSATION SO FAR:
${formatHistory(prior)}

LATEST FOUNDER INSTRUCTION:
"${instruction}"

WORKSPACE CONTEXT:
${buildContextSummary(ctx)}

TOOL RESULTS:
${resultsBlock}

Write your reply to the LATEST instruction. Reference prior turns when relevant — don't repeat what you've already said. If the founder is following up on something specific you mentioned earlier, build on it directly.`,
      }],
    })

    const raw = (message.content[0] as any).text?.trim() ?? ''
    return raw
  } catch (e: any) {
    return `Something went wrong on my end — ${e?.message || 'try again in a moment'}.`
  }
}
