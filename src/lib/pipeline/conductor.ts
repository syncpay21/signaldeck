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
  /** Named recipients + their LinkedIn / Crunchbase intel bundles. When the
   *  founder told us who's reading the deck, the planner uses this to bias
   *  framework + objection-pre-answer recommendations. */
  recipientIntel?: Array<{ recipient: any; fund: any; fetchedAt: string }>
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

function buildPlannerSystemPrompt(): string {
  // Tool-use spec carries the per-tool descriptions and input_schema directly
  // to the API, so the system prompt only needs to set the planner's job
  // contract + the don't-re-dispatch-cached-tools rule.
  return `${ANDREAS_PERSONA}

YOUR JOB HERE
Plan the tool calls needed to answer the founder's instruction. Use the tool_use
mechanism: call zero, one, or many tools.

RULES (binding):
- Empty plan is valid. If the founder asked something you can answer from
  context alone (definitions, opinions, narrative explanations), call no tools.
- ⚠ NEVER re-run a tool whose result is already in context. If "Audit already
  run" appears, do NOT call audit — answer from that cache. Same for claims,
  vclens, signals. Re-running is a UX failure and a cost waste.
- Only re-run a cached tool when the founder explicitly says "re-audit",
  "score again", "refresh", OR when the deck has clearly changed since
  (they will say so).
- For edit_slide, slideId MUST be a value from context.slideIds. If unsure,
  default to activeSlideId. Never invent slide ids.
- Don't dispatch audit + claims + vclens together unless the founder asked
  for a "full review". Pick the single tool that answers what was asked.
- For brand-level changes that are tweaks (single colour, radius, density,
  one effect), DO NOT call regenerate_brand_world — tell the founder to use
  the Live Overrides panel on Theme. Reserve regeneration for actual
  whole-brand redirections.

If you call no tools, you can also reply with text — the synthesiser will use
your text as additional context for the final answer.`
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
  if (Array.isArray(ctx.recipientIntel) && ctx.recipientIntel.length) {
    const primary = ctx.recipientIntel.find(b => b?.recipient?.name || b?.fund?.recentDeals?.length)
    if (primary) {
      const r = primary.recipient || {}
      const f = primary.fund || {}
      const dealStr = Array.isArray(f.recentDeals) ? f.recentDeals.slice(0, 5).map((d: any) => d.company).join(', ') : ''
      lines.push(`Recipient intel — Reader: ${r.name || '?'}${r.firm ? ` @ ${r.firm}` : ''}${r.focus?.length ? ` (focus: ${r.focus.join(', ')})` : ''}${dealStr ? `. Fund recent: ${dealStr}` : ''}${f.avgCheck ? ` ${f.avgCheck}` : ''}`)
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
  // Anthropic tool_use spec — the model can only emit valid tool calls with
  // schema-conformant arguments. Eliminates malformed JSON and unknown tool
  // names that the previous prose-only planner sometimes produced.
  const tools = catalog.map(t => ({
    name:        t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }))

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      system: buildPlannerSystemPrompt(),
      tools: tools as any,
      messages: [{
        role: 'user',
        content: `CONVERSATION SO FAR:
${formatHistory(prior)}

LATEST FOUNDER INSTRUCTION:
"${instruction}"

WORKSPACE CONTEXT:
${buildContextSummary(ctx)}

Plan tools based on the LATEST instruction. Use prior turns to resolve back-references ("rewrite that slide", "the one you mentioned"). Call zero or more tools, or just reply with text if no tool is needed.`,
      }],
    })

    // Extract tool_use blocks AND any preamble text the model emitted.
    const steps: ToolStep[] = []
    let reasoningText = ''
    for (const block of message.content as any[]) {
      if (block.type === 'tool_use') {
        steps.push({
          tool: String(block.name),
          args: block.input && typeof block.input === 'object' ? block.input : {},
          why:  '',
        })
      } else if (block.type === 'text') {
        reasoningText += (reasoningText ? '\n' : '') + String(block.text || '').trim()
      }
    }

    // Server-side arg validation: drop any step whose args fail the schema's
    // required keys. The API normally enforces this, but defensive guards
    // against partial responses and future-proof for tools we add later.
    const validNames = new Set(catalog.map(t => t.name))
    const schemaByName = new Map(catalog.map(t => [t.name, t.inputSchema] as const))
    const validatedSteps = steps.filter(s => {
      if (!validNames.has(s.tool)) return false
      const schema = schemaByName.get(s.tool)
      const required = schema?.required ?? []
      for (const key of required) {
        if (typeof s.args[key] === 'undefined' || s.args[key] === '') return false
      }
      return true
    })

    return { steps: validatedSteps, reasoning: reasoningText }
  } catch (e: any) {
    // Surface the error in reasoning so the synthesiser can mention it
    return { steps: [], reasoning: `(planner error: ${e?.message || 'unknown'})` }
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

⚠ ANTI-FABRICATION (binding):
- NEVER invent specifics — slide scores, claim counts, dollar amounts,
  customer names, persona quotes — that are not present in either the tool
  results OR the workspace context (which already includes cached audit /
  claims / vc / signals data).
- If the founder asks about something you don't have data for: SAY SO.
  "I haven't run the audit yet — want me to?" Do NOT make up scores.
- If a tool failed (you'll see "FAILED: <reason>" in results), tell the
  founder it failed and the reason in one sentence. Don't paper over.
- Tools the workspace already ran are listed in context summary ("Audit
  already run — overall 72/100..."). Use those numbers; don't invent new ones.

VOICE RULES:
- Don't recite raw JSON from tool results. Summarise what matters.
- If a tool returned actionable items (audit tips, weak claims, weak slides),
  mention the top 1-3 with specifics — not all of them.
- If edit_slide ran: state EXACTLY what one field changed and what it changed
  to ("Changed the headline to X"). Nothing else about that slide unless the
  founder asks. Do NOT offer opinions on the rest.
- If the founder asked for the VC lens, lead with the partner's takeaway,
  then the specific objections.
- Don't break character. No "I dispatched...", no "Based on the audit tool...",
  just your voice.
- Keep replies short — 2-4 sentences default. Founder can ask for more.
- Plain prose only. No markdown headers, no bullet lists unless asked.`

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
