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
import { planSteps, synthesiseReply, type ConductorContext, type ToolResult } from '../../lib/pipeline/conductor'
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

  const { instruction, context } = req.body || {}
  if (!instruction || typeof instruction !== 'string') {
    return res.status(400).json({ error: 'instruction (string) is required' })
  }
  const ctx: ConductorContext = (context && typeof context === 'object') ? context : {}

  const origin = resolveOrigin(req)

  try {
    /* ─── STAGE 1: PLANNER ──────────────────────────────────────── */
    const plan = await planSteps(anthropic, instruction, ctx, TOOL_CATALOG)
    const steps = plan?.steps ?? []

    /* ─── STAGE 2: DISPATCH ─────────────────────────────────────── */
    // v1: parallel dispatch — no dependency chains. Each tool gets the
    // raw context object so it can pull deck/brand/founder info.
    const results: ToolResult[] = await Promise.all(steps.map(async (step) => {
      const tool = TOOL_CATALOG.find(t => t.name === step.tool)
      if (!tool) return { tool: step.tool, result: null, error: 'unknown tool' }
      try {
        const result = await tool.execute(step.args, ctx, origin)
        return { tool: step.tool, result }
      } catch (e: any) {
        return { tool: step.tool, result: null, error: e?.message || 'tool failed' }
      }
    }))

    /* ─── STAGE 3: SYNTHESISER ──────────────────────────────────── */
    const reply = await synthesiseReply(anthropic, instruction, results, ctx)

    return res.status(200).json({
      reply,
      toolsCalled: steps,
      rawResults:  results,
      plan: { reasoning: plan?.reasoning ?? '' },
    })
  } catch (err: any) {
    console.error('andreas error:', err)
    return res.status(500).json({ error: err?.message || 'Andreas failed' })
  }
}
