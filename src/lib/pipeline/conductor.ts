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
import { classifyIntent, domainAddendum, type IntentResult } from './intent-classifier'
import { critiqueReply, extractContextNumbers } from './reply-critic'

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
  /** Optional ISO timestamps for cached signals so the planner can reason
   *  about staleness ("audit ran 12 min ago — still fresh"). Workspace
   *  attaches these when handing data into the panel. */
  staleness?: {
    auditFetchedAt?:     string
    claimsFetchedAt?:    string
    vcFetchedAt?:        string
    signalsFetchedAt?:   string
    designFetchedAt?:    string
  }
  /** Tool results from prior turns in this same conversation. The planner
   *  uses this to avoid re-dispatching tools the conductor already ran
   *  earlier in the chat (orthogonal to the workspace-cached signals). */
  recentToolResults?: Array<{ tool: string; result: any; turnIndex: number }>
}

export interface ToolStep {
  tool: string
  args: any
  why:  string
  /** Optional sequence index — when present, tools run in stages (stage 0
   *  first, then stage 1 with stage-0 results in context). When absent or
   *  all-zero, all tools run in parallel. */
  stage?: number
}

export interface ConductorPlan {
  steps:     ToolStep[]
  reasoning: string
  /** Classifier output — surfaced so the dispatcher can use it for budget
   *  decisions and the UI can show "I think you want X" if intent.confidence
   *  was high. */
  intent?:   IntentResult
}

export interface ToolResult {
  tool:   string
  result: any
  error?: string
}

/** Synthesiser output — text + the critic's diagnostics. The route layer
 *  is free to attach the critique fields to its JSON response so the UI
 *  can show a confidence chip. */
export interface SynthResult {
  text:       string
  confidence: number      // 0..1 — combined synth + critic confidence
  critique?: {
    bannedWords:    string[]
    suspectNumbers: string[]
  }
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

  // Staleness — surface how old each cached signal is so Andreas knows
  // whether to recommend a refresh. "Fresh" = under 10 minutes.
  if (ctx.staleness) {
    const lines2: string[] = []
    for (const [key, ts] of Object.entries(ctx.staleness)) {
      if (!ts) continue
      const ageMin = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
      if (Number.isFinite(ageMin) && ageMin >= 0) {
        const label = key.replace(/FetchedAt$/, '')
        const fresh = ageMin < 10
        lines2.push(`${label}: ${ageMin}min ago${fresh ? ' (fresh)' : ''}`)
      }
    }
    if (lines2.length) lines.push(`Staleness — ${lines2.join(', ')}`)
  }

  // Recent tool results from THIS conversation — orthogonal to workspace
  // signals. Prevents the planner from re-running a tool it already ran
  // earlier in the chat.
  if (Array.isArray(ctx.recentToolResults) && ctx.recentToolResults.length) {
    const recent = ctx.recentToolResults.slice(-5).map(r => `${r.tool}(turn ${r.turnIndex})`).join(', ')
    lines.push(`Tools already dispatched in this chat: ${recent}`)
  }

  return lines.join('\n')
}

/** Compress turns 1..n-keep into a short "Earlier:" line, then format the
 *  last `keep` turns in full. Activates when prior.length > keep + 2. */
function summariseHistory(prior: PriorTurn[], keep = 8, maxCharsPerTurn = 1500): string {
  if (!prior || prior.length === 0) return '(no prior turns — this is the start of the conversation)'
  if (prior.length <= keep + 2) {
    return prior.map(t => `${t.role === 'founder' ? 'Founder' : 'Andreas'}: ${t.text.slice(0, maxCharsPerTurn)}`).join('\n\n')
  }
  const earlier = prior.slice(0, prior.length - keep)
  const recent  = prior.slice(-keep)
  // Deterministic summary — pull the founder's actual questions and the
  // first sentence of each Andreas reply. Cheaper than another model call,
  // good enough for back-reference resolution.
  const summary = earlier.map(t => {
    if (t.role === 'founder') return `• Founder asked: "${t.text.slice(0, 80).replace(/\n+/g, ' ')}"`
    const firstSentence = t.text.split(/(?<=[.!?])\s+/)[0] || ''
    return `• Andreas answered: ${firstSentence.slice(0, 120)}`
  }).join('\n')
  const formatted = recent.map(t => `${t.role === 'founder' ? 'Founder' : 'Andreas'}: ${t.text.slice(0, maxCharsPerTurn)}`).join('\n\n')
  return `EARLIER IN THIS CONVERSATION (${earlier.length} turns summarised):\n${summary}\n\nRECENT TURNS:\n${formatted}`
}

export interface PriorTurn { role: 'founder' | 'andreas'; text: string }

/** Keep last N turns, each capped at maxChars per turn, to bound token count.
 *  When history exceeds the keep window, the older turns are deterministically
 *  summarised into an "Earlier:" preamble so back-references still resolve. */
function formatHistory(prior: PriorTurn[], maxTurns = 8, maxCharsPerTurn = 1500): string {
  return summariseHistory(prior, maxTurns, maxCharsPerTurn)
}

/** Truncate JSON output at the last complete JSON field boundary (closing `}` or `]`)
 *  rather than cutting mid-string, so the synthesiser sees valid partial JSON. */
function smartTruncate(json: string, maxLen: number): string {
  if (json.length <= maxLen) return json
  const cut = json.slice(0, maxLen)
  // Find last occurrence of a field-closing boundary
  const lastBrace  = Math.max(cut.lastIndexOf('},'), cut.lastIndexOf('"}'), cut.lastIndexOf('"}'))
  const lastBracket = Math.max(cut.lastIndexOf('],'), cut.lastIndexOf('"]'))
  const boundary = Math.max(lastBrace, lastBracket)
  const trimmed = boundary > maxLen * 0.5 ? cut.slice(0, boundary + 1) : cut
  return trimmed + '\n…(truncated)'
}

/** Tool-specific result digesters. The synthesiser doesn't need the full
 *  raw JSON — most tools return verbose payloads where 80% of the bytes
 *  don't influence the reply. Each digester extracts the 2-5 fields that
 *  matter and presents them as readable prose. Falls back to raw JSON for
 *  unknown tools so nothing's lost on unfamiliar shapes. */
function digestToolResult(tool: string, result: any): string {
  if (!result || typeof result !== 'object') return smartTruncate(JSON.stringify(result, null, 2), 5000)

  try {
    switch (tool) {
      case 'audit': {
        const score = result.overall ?? result.score
        const tips = Array.isArray(result.tips) ? result.tips.slice(0, 5) : []
        const tipList = tips.map((t: any) => `- ${t.slide || t.slideId || '?'}: ${t.note || t.text || t.tip || ''}`).join('\n')
        return `Overall score: ${score ?? 'n/a'}/100${tips.length ? `\nTop ${tips.length} tips:\n${tipList}` : ''}`
      }
      case 'claims': {
        const claims = Array.isArray(result.claims) ? result.claims : []
        const byClass: Record<string, any[]> = {}
        claims.forEach((c: any) => {
          const k = c.classification || 'unknown'
          ;(byClass[k] = byClass[k] || []).push(c)
        })
        const summary = Object.entries(byClass).map(([k, arr]) => `${k}: ${arr.length}`).join(', ')
        const examples = (byClass['needs-source'] || byClass['risky'] || []).slice(0, 3).map((c: any) => `- "${(c.text || c.claim || '').slice(0, 90)}" (${c.slide || c.slideId || '?'})`).join('\n')
        return `${claims.length} total claims — ${summary}${examples ? `\nNeeds source / risky examples:\n${examples}` : ''}`
      }
      case 'vclens': {
        const verdict = result.verdict || result.takeaway || result.summary || ''
        const concerns = Array.isArray(result.concerns) ? result.concerns.slice(0, 5) : []
        return `Partner verdict: ${String(verdict).slice(0, 400)}${concerns.length ? `\nConcerns:\n${concerns.map((c: any) => `- ${typeof c === 'string' ? c : c.text || c.note || ''}`).join('\n')}` : ''}`
      }
      case 'edit_slide': {
        const before = result.before || result.previousContent
        const after = result.after || result.content || result.updated
        const field = result.field || result.targetField || ''
        // Try to find what changed concretely
        if (before && after && typeof before === 'object' && typeof after === 'object') {
          const changes: string[] = []
          for (const key of Object.keys(after)) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
              changes.push(`${key}: ${JSON.stringify(after[key]).slice(0, 140)}`)
            }
          }
          if (changes.length) return `Edited slide${field ? ` (field: ${field})` : ''}. Changed:\n${changes.join('\n')}`
        }
        return `Slide updated${field ? ` (field: ${field})` : ''}.\n${smartTruncate(JSON.stringify(after || result, null, 2), 1500)}`
      }
      case 'followup': {
        return `Drafted follow-up email:\n${String(result.email || result.body || result.text || '').slice(0, 1500)}`
      }
      case 'refine': {
        const changed = Array.isArray(result.changed) ? result.changed.length : Object.keys(result.content || {}).length
        return `Whole-deck polish complete. ${changed} slides updated.`
      }
      case 'regenerate_brand_world': {
        const personality = result.brandPersonality || result.personality || ''
        const primary = result.colour?.primary || result.colors?.primary || ''
        return `Brand world rebuilt. Personality: ${personality}, primary colour: ${primary}.`
      }
      case 'swap_framework':
      case 'update_demo': {
        return JSON.stringify(result)
      }
    }
  } catch {
    // Fall through to raw on any digester crash
  }
  return smartTruncate(JSON.stringify(result, null, 2), 5000)
}

export async function planSteps(
  client: Anthropic,
  instruction: string,
  ctx: ConductorContext,
  catalog: ToolSpec[],
  prior: PriorTurn[] = [],
): Promise<ConductorPlan | null> {
  // Stage 0 — deterministic intent classification. For chit-chat / pure-opinion
  // questions we skip the planner entirely (saves a Haiku round-trip).
  const priorText = prior.slice(-2).map(t => t.text).join(' ')
  const intent = classifyIntent(instruction, priorText)
  if (intent.skipPlanner) {
    return { steps: [], reasoning: `(planner skipped — intent: ${intent.intent})`, intent }
  }

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
      // Low temperature for planning — we want deterministic tool selection,
      // not creative interpretations of which tool to call.
      temperature: 0.2,
      system: buildPlannerSystemPrompt(),
      tools: tools as any,
      messages: [{
        role: 'user',
        content: `CONVERSATION SO FAR:
${formatHistory(prior)}

LATEST FOUNDER INSTRUCTION:
"${instruction}"

DETECTED INTENT: ${intent.intent}${intent.isCompound ? ' (COMPOUND — plan in stages)' : ''}${intent.domain !== 'generic' ? ` | domain: ${intent.domain}` : ''}

WORKSPACE CONTEXT:
${buildContextSummary(ctx)}

Plan tools based on the LATEST instruction. Use prior turns to resolve back-references ("rewrite that slide", "the one you mentioned"). Call zero or more tools, or just reply with text if no tool is needed.${intent.isCompound ? '\n\nThis is a COMPOUND request. Emit tools in dependency order; the dispatcher will run them sequentially when stages differ.' : ''}`,
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
          why:  '',  // populated below from reasoning text
        })
      } else if (block.type === 'text') {
        reasoningText += (reasoningText ? '\n' : '') + String(block.text || '').trim()
      }
    }

    // Populate `why` from the planner's reasoning text. If the model wrote
    // N sentences and there are N tools, try to match one sentence per tool;
    // otherwise use the first sentence for all (better than empty).
    if (reasoningText && steps.length > 0) {
      const sentences = reasoningText.split(/(?<=[.!?])\s+/).filter(Boolean)
      steps.forEach((step, i) => {
        step.why = (sentences[i] || sentences[0] || reasoningText).slice(0, 120)
      })
    }

    // 1. Server-side schema validation — drop any step whose args fail the
    //    schema's required keys.
    const validNames = new Set(catalog.map(t => t.name))
    const schemaByName = new Map(catalog.map(t => [t.name, t.inputSchema] as const))
    let validatedSteps = steps.filter(s => {
      if (!validNames.has(s.tool)) return false
      const schema = schemaByName.get(s.tool)
      const required = schema?.required ?? []
      for (const key of required) {
        if (typeof s.args[key] === 'undefined' || s.args[key] === '') return false
      }
      return true
    })

    // 2. Semantic validation — slideId for edit_slide must exist in
    //    ctx.slideIds; if missing or wrong, repair with activeSlideId.
    const slideSet = new Set(ctx.slideIds || [])
    validatedSteps = validatedSteps.map(s => {
      if (s.tool === 'edit_slide') {
        const id = String(s.args?.slideId || '')
        if (!slideSet.has(id)) {
          // Repair if we have an active slide; otherwise drop the step
          if (ctx.activeSlideId && slideSet.has(ctx.activeSlideId)) {
            return { ...s, args: { ...s.args, slideId: ctx.activeSlideId } }
          }
          return null
        }
      }
      return s
    }).filter(Boolean) as ToolStep[]

    // 3. Deduplication — drop identical (tool, args) pairs that the planner
    //    emitted twice in the same plan. Common with compound questions.
    const seen = new Set<string>()
    validatedSteps = validatedSteps.filter(s => {
      const key = `${s.tool}:${JSON.stringify(s.args)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // 4. Skip tools whose result is already in recentToolResults with
    //    matching args. The planner's prompt says "don't re-run" but it
    //    sometimes does anyway — belt and suspenders.
    if (Array.isArray(ctx.recentToolResults) && ctx.recentToolResults.length) {
      const recentKeys = new Set(ctx.recentToolResults.map((r: any) =>
        `${r.tool}:${JSON.stringify(r.args || {})}`
      ))
      validatedSteps = validatedSteps.filter(s => !recentKeys.has(`${s.tool}:${JSON.stringify(s.args)}`))
    }

    // 5. Stage assignment for compound requests — when the planner emits
    //    multiple tools and intent is compound, assign stages so dependent
    //    tools (e.g. edit_slide after audit) wait for their predecessors.
    if (intent.isCompound && validatedSteps.length > 1) {
      validatedSteps = assignStages(validatedSteps)
    }

    return { steps: validatedSteps, reasoning: reasoningText, intent }
  } catch (e: any) {
    return { steps: [], reasoning: `(planner error: ${e?.message || 'unknown'})`, intent }
  }
}

/** Order tools by natural dependency: data-gathering first (audit, claims,
 *  vclens), then transformations (edit_slide, refine), then communications
 *  (followup). Within the same stage, tools run in parallel. */
function assignStages(steps: ToolStep[]): ToolStep[] {
  const stageMap: Record<string, number> = {
    audit:     0, claims:    0, vclens:    0,
    refine:    1, edit_slide: 1, regenerate_brand_world: 1, swap_framework: 1, update_demo: 1,
    followup:  2,
  }
  return steps.map(s => ({ ...s, stage: stageMap[s.tool] ?? 0 }))
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
  intent?: IntentResult,
): Promise<SynthResult> {
  const resultsBlock = results.length === 0
    ? '(no tools dispatched — answer from context and your own expertise)'
    : results.map(r => {
        if (r.error) return `[${r.tool}] FAILED: ${r.error}`
        // Pre-summarised tool digest — only the fields that influence the
        // reply, not the raw JSON. Saves 60-80% of synth input tokens.
        return `[${r.tool}]\n${digestToolResult(r.tool, r.result)}`
      }).join('\n\n')

  // Adaptive budgets — derived from intent classifier (chit-chat = 400 tok,
  // audit/vclens = 2500 tok, etc.). Saves cost on trivial questions and
  // lets deep questions get the space they need.
  const maxTokens = intent?.synth.maxTokens ?? 1500
  const temperature = intent?.synth.temperature ?? 0.6

  // Domain-specific persona addendum — Andreas speaks the right vocabulary
  // (clinical for medtech, unit economics for fintech, etc.) without us
  // having to switch personas wholesale.
  const systemPrompt = intent && intent.domain !== 'generic'
    ? SYNTHESISER_PROMPT + domainAddendum(intent.domain)
    : SYNTHESISER_PROMPT

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
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

    // Self-critique pass — deterministic post-check for banned words,
    // hedge phrases, and fabricated numbers. Cheap; runs in <1ms.
    const contextNums = extractContextNumbers({
      auditData: ctx.auditData, claimsData: ctx.claimsData, vcData: ctx.vcData,
      signalsData: ctx.signalsData, designCritique: ctx.designCritique,
      brandWorld: ctx.brandWorld, recipientIntel: ctx.recipientIntel,
    })
    const critique = critiqueReply(raw, contextNums)

    // Proactive suggestion — append one actionable nudge if the workspace
    // signals a gap. Never fabricated: only fires when we have concrete data.
    const suggestion = buildProactiveSuggestion(ctx)

    let finalText = raw
    if (suggestion) finalText += `\n\n💡 ${suggestion}`
    if (critique.caveat) finalText += critique.caveat

    return {
      text: finalText,
      confidence: critique.confidence,
      critique: {
        bannedWords: critique.bannedWordsFound,
        suspectNumbers: critique.suspectNumbers,
      },
    }
  } catch (e: any) {
    return {
      text: `Something went wrong on my end — ${e?.message || 'try again in a moment'}.`,
      confidence: 0,
    }
  }
}

/** Returns a single proactive suggestion sentence when the workspace data
 *  reveals an obvious gap, or null when everything looks fine. */
function buildProactiveSuggestion(ctx: ConductorContext): string | null {
  // Deck has design issues that haven't been addressed
  if (ctx.designCritique?.failures?.length && !ctx.auditData) {
    return `Your brand palette has ${ctx.designCritique.failures.length} contrast issue${ctx.designCritique.failures.length > 1 ? 's' : ''} — want me to audit the slides too?`
  }
  // Audit run but score is weak
  if (ctx.auditData) {
    const score = ctx.auditData.overall ?? ctx.auditData.score ?? null
    if (typeof score === 'number' && score < 65) {
      const tips: any[] = Array.isArray(ctx.auditData.tips) ? ctx.auditData.tips : []
      const worst = tips.find((t: any) => t.slide || t.slideId)
      if (worst) return `Audit flagged "${worst.slide || worst.slideId}" as the weakest — want me to rewrite it?`
    }
  }
  // Claims need sourcing but no action taken
  if (ctx.claimsData) {
    const claims: any[] = Array.isArray(ctx.claimsData.claims) ? ctx.claimsData.claims : []
    const unsourced = claims.filter((c: any) => c.classification === 'needs-source' || c.classification === 'risky')
    if (unsourced.length >= 3) {
      return `${unsourced.length} claims still need a source — investors will push back on those. Want me to suggest citations?`
    }
  }
  // Recipient intel present but VC lens not run
  if (ctx.recipientIntel?.length && !ctx.vcData) {
    const r = ctx.recipientIntel[0]?.recipient
    if (r?.name) return `Want me to run the VC lens specifically for ${r.name} now that I have their investment history?`
  }
  return null
}
