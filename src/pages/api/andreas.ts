/* ════════════════════════════════════════════════════════════════════
   POST /api/andreas

   The orchestration entry point. Founder sends a plain-English
   instruction + their workspace context. Andreas plans → dispatches
   sub-agents → synthesises a reply.

   Body:
     {
       instruction: string,
       context:     ConductorContext
     }

   Returns:
     {
       reply:       string,             // Andreas's final reply
       toolsCalled: ToolStep[],         // what the planner decided to call
       rawResults:  ToolResult[],       // each tool's raw output (UI may use)
       plan:        { reasoning }       // planner's overall reasoning
     }
═══════════════════════════════════════════════════════════════════ */

import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { planSteps, synthesiseReply, type ConductorContext, type ToolResult, type ToolStep } from '../../lib/pipeline/conductor'
import { TOOL_CATALOG } from '../../lib/pipeline/andreas-tools'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Resolve the deployment's own origin so tool execute() can fetch local
 *  routes. Vercel sets VERCEL_URL on serverless; locally we use the
 *  request host. */
function resolveOrigin(req: NextApiRequest): string {
  const xfHost  = (req.headers['x-forwarded-host']  as string | undefined) || ''
  const xfProto = (req.headers['x-forwarded-proto'] as string | undefined) || 'https'
  if (xfHost) return `${xfProto}://${xfHost}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const host = (req.headers.host as string | undefined) || 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { instruction, context, history } = req.body || {}
  if (!instruction || typeof instruction !== 'string') {
    return res.status(400).json({ error: 'instruction (string) is required' })
  }
  const ctx: ConductorContext = (context && typeof context === 'object') ? context : {}

  // Conversation memory: prior turns the panel sent up. Stays in-memory on the
  // client; server is still stateless. Trim to last 6 turns to bound prompt cost.
  const priorTurns: Array<{ role: 'founder' | 'andreas'; text: string }> =
    Array.isArray(history) ? history.slice(-8).filter(t => t && typeof t.text === 'string') : []

  const origin = resolveOrigin(req)

  try {
    /* ─── STAGE 1: PLANNER ──────────────────────────────────────── */
    const plan = await planSteps(anthropic, instruction, ctx, TOOL_CATALOG, priorTurns)
    const steps = plan?.steps ?? []

    /* ─── STAGE 2: DISPATCH (staged + retried) ──────────────────── */
    // When the planner assigned stages (compound questions), run tools
    // sequentially by stage so stage-1 tools see stage-0 results. Inside
    // a stage, tools still run in parallel. Single retry on transient
    // network errors with 400ms backoff.
    const results = await dispatchStaged(steps, ctx, origin)

    /* ─── STAGE 3: SYNTHESISER ──────────────────────────────────── */
    const synth = await synthesiseReply(anthropic, instruction, results, ctx, priorTurns, plan?.intent)

    return res.status(200).json({
      reply: synth.text,
      toolsCalled: steps,
      rawResults:  results,
      confidence:  synth.confidence,
      critique:    synth.critique,
      plan: {
        reasoning: plan?.reasoning ?? '',
        intent:    plan?.intent ?? null,
      },
    })
  } catch (err: any) {
    console.error('andreas error:', err)
    return res.status(500).json({ error: err?.message || 'Andreas failed' })
  }
}

/** Execute steps in stages — within a stage parallel, across stages serial.
 *  Single retry per tool on transient network errors. */
async function dispatchStaged(steps: ToolStep[], ctx: ConductorContext, origin: string): Promise<ToolResult[]> {
  const byStage = new Map<number, ToolStep[]>()
  for (const s of steps) {
    const stage = s.stage ?? 0
    if (!byStage.has(stage)) byStage.set(stage, [])
    byStage.get(stage)!.push(s)
  }
  const sortedStages = Array.from(byStage.keys()).sort((a, b) => a - b)

  const all: ToolResult[] = []
  for (const stage of sortedStages) {
    const stageSteps = byStage.get(stage)!
    const stageResults = await Promise.all(stageSteps.map(step => runWithRetry(step, ctx, origin)))
    all.push(...stageResults)
  }
  return all
}

async function runWithRetry(step: ToolStep, ctx: ConductorContext, origin: string): Promise<ToolResult> {
  const tool = TOOL_CATALOG.find(t => t.name === step.tool)
  if (!tool) return { tool: step.tool, result: null, error: 'unknown tool' }

  const attempt = async (): Promise<ToolResult> => {
    try {
      const result = await tool.execute(step.args, ctx, origin)
      return { tool: step.tool, result }
    } catch (e: any) {
      return { tool: step.tool, result: null, error: e?.message || 'tool failed' }
    }
  }

  const first = await attempt()
  if (!first.error) return first

  // Retry only on transient signals (network, 5xx, timeout). Don't retry
  // on schema / validation / "not found" errors — those won't fix themselves.
  const msg = String(first.error).toLowerCase()
  const transient = /timeout|aborted|network|fetch failed|5\d\d|econn|enotfound/.test(msg)
  if (!transient) return first

  await new Promise(r => setTimeout(r, 400))
  const second = await attempt()
  return second
}
