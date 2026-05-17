/* ════════════════════════════════════════════════════════════════════
   ANDREAS TOOL CATALOG — wraps the 6 chat-friendly sub-agent endpoints.

   Each tool is the contract the conductor's planner sees + the
   execute() function the dispatcher calls. v1 strategy: each tool
   just does an internal fetch() to its underlying endpoint, so we
   don't have to refactor route handlers into shared library code.

   On Vercel the internal fetch is same-instance — no real network
   hop. Local dev hits localhost on the dev server. Edge cases: when
   running outside a request context (unit tests), the fetch will fail
   gracefully and the conductor surfaces an error chip to the founder.

   The two heavyweight endpoints (/api/generate, /api/brand-world)
   are deliberately not catalogued — regenerating the deck or the
   visual world is too disruptive to dispatch from a chat instruction.
═══════════════════════════════════════════════════════════════════ */

import type { ConductorContext } from './conductor'

export interface ToolSpec<TArgs = any, TResult = any> {
  name:        string
  description: string
  /** A literal JSON-schema-ish string. Not parsed — just shown to the planner. */
  argsSchema:  string
  execute:     (args: TArgs, ctx: ConductorContext, origin: string) => Promise<TResult>
}

async function fetchTool<T = any>(origin: string, path: string, body: any): Promise<T> {
  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),  // sub-agent calls can take a moment
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${path} returned ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export const TOOL_CATALOG: ToolSpec[] = [
  {
    name: 'audit',
    description: 'Score the current deck on clarity / momentum / evidence / conviction and return actionable tips. Use when the founder asks "how is my deck", "audit", "score me", "how investor-ready am I", or wants overall quality feedback.',
    argsSchema: '{}',  // no args — pulls deckContent + company from context
    execute: async (_args, ctx, origin) => {
      if (!ctx.deckContent) throw new Error('No deck content in context')
      return fetchTool(origin, '/api/audit', { content: ctx.deckContent, company: ctx.company || '' })
    },
  },
  {
    name: 'claims',
    description: 'Extract every factual or persuasive claim from the deck and classify each as supported / needs-source / risky / founder-thesis. Use when the founder asks "what claims do I have", "what needs proof", "what would an investor question", or wants due-diligence prep.',
    argsSchema: '{}',
    execute: async (_args, ctx, origin) => {
      if (!ctx.deckContent) throw new Error('No deck content in context')
      return fetchTool(origin, '/api/claims', { content: ctx.deckContent, company: ctx.company || '' })
    },
  },
  {
    name: 'edit_slide',
    description: 'Surgically edit ONE specific field of ONE slide based on a plain-English instruction. SURGICAL — only the targeted field changes, nothing else. Use when the founder targets a specific element: "make the headline punchier", "shorten the lede on slide 3", "add a stat to the traction slide". The slide ID comes from activeSlideId (current slide) or from slideIds if the founder named a different slide. Include a targetField hint when the instruction clearly targets a specific field.',
    argsSchema: '{ "slideId": "<id from slideIds e.g. s3_problem>", "instruction": "<the founder\'s targeted edit instruction>", "targetField": "<optional: headline|lede|bullets|stats|tag|notes>" }',
    execute: async (args: { slideId: string; instruction: string; targetField?: string }, ctx, origin) => {
      if (!ctx.deckContent) throw new Error('No deck content in context')
      const currentContent = ctx.deckContent[args.slideId]
      if (!currentContent) throw new Error(`Slide ${args.slideId} not found in deck`)
      return fetchTool(origin, '/api/edit-slide', {
        slideId: args.slideId,
        currentContent,
        instruction: args.instruction,
        targetField: args.targetField || '',
        company:  ctx.company  || '',
        industry: ctx.industry || '',
      })
    },
  },
  {
    name: 'vclens',
    description: 'Read the deck through one of five investor personas: Seed VC, Series A, Angel, Strategic, Internal. Returns the partner\'s takeaways + objections. Use when the founder asks "what would a Series A partner say", "review through VC eyes", "what would [persona] think".',
    argsSchema: '{ "persona": "Seed VC | Series A | Angel | Strategic | Internal" }',
    execute: async (args: { persona?: string }, ctx, origin) => {
      if (!ctx.deckContent) throw new Error('No deck content in context')
      const persona = args.persona || ctx.audience || 'Seed VC'
      return fetchTool(origin, '/api/vclens', {
        content: ctx.deckContent,
        company: ctx.company || '',
        persona,
      })
    },
  },
  {
    name: 'refine',
    description: 'Pitch-coach polish across the WHOLE deck — tightens every headline (2-5 words), sharpens every bullet, removes buzzwords. Use when the founder asks to "polish", "tighten everything", "make it more investor-grade", "rewrite all the copy". Heavy operation — only call when the instruction is whole-deck scope, not single-slide.',
    argsSchema: '{}',
    execute: async (_args, ctx, origin) => {
      if (!ctx.deckContent) throw new Error('No deck content in context')
      return fetchTool(origin, '/api/refine', {
        content: ctx.deckContent,
        input: {
          company:  ctx.company  || '',
          industry: ctx.industry || '',
          audience: ctx.audience || '',
        },
      })
    },
  },
  {
    name: 'followup',
    description: 'Draft the follow-up email the founder sends the morning after presenting to this investor. Written in the founder\'s voice. Use when the founder asks "write my follow-up", "draft a thank-you email", "email after the meeting".',
    argsSchema: '{}',
    execute: async (_args, ctx, origin) => {
      if (!ctx.deckContent) throw new Error('No deck content in context')
      return fetchTool(origin, '/api/followup', {
        content:     ctx.deckContent,
        company:     ctx.company || '',
        audience:    ctx.audience || 'Seed VC',
        founderName: ctx.founderName || 'The founder',
      })
    },
  },
]
