import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { ANDREAS_PERSONA } from '../../lib/andreas-persona'

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

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
Surgical per-slide editing. You receive ONE slide's content JSON and a single edit instruction from the founder.
Apply the instruction. Return the SAME JSON schema — same keys, same shape, same field types.

SURGICAL RULES — strictly enforced:
1. Read the instruction and identify the TARGET FIELD(S): headline / lede / bullets / stats / tag / notes.
2. Change ONLY those target field(s). Every other field must be byte-for-byte identical to the input JSON.
3. Examples of correct targeting:
   - "make the headline punchier" → change ONLY headline. lede, bullets, stats, tag, notes stay identical.
   - "add a retention stat" → change ONLY stats. Everything else stays identical.
   - "shorten the lede" → change ONLY lede. Everything else stays identical.
4. If the instruction targets bullets, change ONLY the bullets array. Do NOT touch headline or lede.
5. NEVER rewrite unmentioned fields "while you're in there". Scope creep is a failure.
6. If the instruction is ambiguous, change the FEWEST possible fields and note the assumption in changeNote.
7. Headlines: 2–6 words. Punchy. No buzzwords (avoid: revolutionary, disruptive, innovative, next-gen, game-changing).
8. Stats values: numbers only when the founder explicitly provides one. NEVER invent metrics.
9. List in changedFields exactly which keys you modified — this is verified by the caller.

Return ONLY valid JSON, no markdown:
{
  "content":      { /* the slide JSON, same schema as input, ONLY target fields changed */ },
  "changeNote":   "<1-line: what field changed and how — e.g. 'Changed headline: X → Y'>",
  "changedFields": ["headline"]
}`

function buildUserPrompt(args: {
  slideId: string; currentContent: any; instruction: string;
  company?: string; industry?: string; narrative?: string; targetField?: string;
}): string {
  return `Slide: ${args.slideId}
Company: ${args.company || '(unknown)'}
Industry: ${args.industry || '(unknown)'}
${args.narrative ? `Narrative: ${args.narrative}` : ''}
${args.targetField ? `Target field: ${args.targetField} (ONLY change this field)` : ''}

Current slide JSON:
${JSON.stringify(args.currentContent, null, 2)}

Edit instruction:
"${args.instruction}"

Apply the instruction surgically. Only change the target field(s). Return the updated slide JSON with changedFields array.`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { slideId, currentContent, instruction, company, industry, narrative, targetField } = req.body

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
        content: buildUserPrompt({ slideId, currentContent, instruction, company, industry, narrative, targetField }),
      }],
    })

    const rawText = (message.content[0] as any).text?.trim() ?? ''
    const jsonStr = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

    let parsed: any
    try { parsed = JSON.parse(jsonStr) }
    catch {
      const m = jsonStr.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'Andreas returned an unparseable response — try rephrasing your edit' })
      parsed = JSON.parse(m[0])
    }

    // Defensive: if Claude returned the bare slide content instead of the wrapper, accept it.
    const content       = parsed.content    ?? parsed
    const changedFields = Array.isArray(parsed.changedFields) ? parsed.changedFields : []

    // Verify scope: count how many top-level keys actually differ from the input.
    const diffKeys = Object.keys(currentContent).filter(
      k => JSON.stringify(currentContent[k]) !== JSON.stringify(content[k])
    )
    const scopeWarning = diffKeys.length > changedFields.length + 1
      ? ` (note: ${diffKeys.length} fields changed — verify scope)`
      : ''
    const changeNote = (typeof parsed.changeNote === 'string' ? parsed.changeNote : `Changed: ${diffKeys.join(', ')}`) + scopeWarning

    res.status(200).json({ content, changeNote, changedFields: diffKeys })
  } catch (err: any) {
    console.error('edit-slide error:', err)
    res.status(500).json({ error: err.message || 'edit-slide failed' })
  }
}
