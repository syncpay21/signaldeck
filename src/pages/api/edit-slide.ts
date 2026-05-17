import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/* ════════════════════════════════════════════════════════════════════
   POST /api/edit-slide

   Per-slide AI chat — takes the current slide JSON + a natural-language
   instruction and returns the updated slide JSON.

   Body:
     {
       slideId:        "s3_problem"   — which slide we're editing
       currentContent: { tag, headline, lede, stats[], bullets[], ... }
       instruction:    "make the headline punchier" / "add a stat about retention"
       company:        "Luma"         — context for personalization
       industry:       "Consumer"
       narrative:      "bet-on-founder" (optional)
     }

   Returns:
     { content: <updated slide JSON, same schema>, changeNote: "1-line summary" }
═══════════════════════════════════════════════════════════════════ */

const SYSTEM_PROMPT = `You are a pitch-deck editor with a precision instrument.

You receive ONE slide's content JSON and a single edit instruction from the founder.
Apply the instruction. Return the SAME JSON schema — same keys, same shape, same field types.

Rules:
- ONLY change what the instruction asks for. Leave everything else identical.
- Headlines: 2–6 words. Punchy. Uppercase-friendly. No buzzwords (avoid: revolutionary, disruptive, innovative, next-gen, game-changing).
- Stats values: numbers only when the founder explicitly provides one. NEVER invent metrics.
- Bullets: outcome-first, evidence-backed, no fluff.
- Tags: keep exactly as-is unless the instruction targets them.
- If the instruction is unclear, make the smallest reasonable change and note the assumption in changeNote.

Return ONLY valid JSON, no markdown:
{
  "content":    { /* the slide JSON, same schema as input */ },
  "changeNote": "<1-line summary of what changed>"
}`

function buildUserPrompt(args: {
  slideId: string; currentContent: any; instruction: string;
  company?: string; industry?: string; narrative?: string;
}): string {
  return `Slide: ${args.slideId}
Company: ${args.company || '(unknown)'}
Industry: ${args.industry || '(unknown)'}
${args.narrative ? `Narrative: ${args.narrative}` : ''}

Current slide JSON:
${JSON.stringify(args.currentContent, null, 2)}

Edit instruction:
"${args.instruction}"

Apply the instruction and return the updated slide JSON. Same keys, same shape.`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { slideId, currentContent, instruction, company, industry, narrative } = req.body

    if (!slideId || !currentContent || !instruction) {
      return res.status(400).json({ error: 'slideId, currentContent, and instruction are required' })
    }
    if (typeof instruction !== 'string' || instruction.trim().length < 2) {
      return res.status(400).json({ error: 'instruction must be a non-empty string' })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildUserPrompt({ slideId, currentContent, instruction, company, industry, narrative }),
      }],
    })

    const rawText = (message.content[0] as any).text?.trim() ?? ''
    const jsonStr = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

    let parsed: any
    try { parsed = JSON.parse(jsonStr) }
    catch {
      const m = jsonStr.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'Claude returned unparseable JSON' })
      parsed = JSON.parse(m[0])
    }

    // Defensive: if Claude returned the bare slide content instead of the wrapper, accept it.
    const content    = parsed.content    ?? parsed
    const changeNote = typeof parsed.changeNote === 'string' ? parsed.changeNote : 'Updated'

    res.status(200).json({ content, changeNote })
  } catch (err: any) {
    console.error('edit-slide error:', err)
    res.status(500).json({ error: err.message || 'edit-slide failed' })
  }
}
