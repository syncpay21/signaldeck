/* ════════════════════════════════════════════════════════════════════
   POST /api/strengthen

   Founder doesn't like a stat / headline / lede / bullet that their
   external AI drafted? Hits ✨ — Haiku generates 3 stronger alternatives
   they can pick from. Cheap (~300 output tokens), surgical (one field,
   one slide, returns array of options).

   Body:
     {
       slideId:         string  (required — context for tone matching)
       slideContext:    any     (the full slide content, for surrounding context)
       field:           'headline'|'sub'|'lede'|'bullet'|'stat'|'check'|'step'|'card' (required)
       currentText:     string  (required — the text to strengthen)
       founderStatlines:string  (optional — verbatim stats to lift)
       company:         string  (optional — for tone)
       industry:        string  (optional)
       audience:        string  (optional — Series A vs Seed vs Angel etc.)
       count:           number  (optional, default 3, max 5)
     }

   Returns:
     { alternatives: string[], tokensUsed: number }
═══════════════════════════════════════════════════════════════════ */

import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { ANDREAS_PERSONA } from '../../lib/andreas-persona'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

JOB: Generate N alternative phrasings for ONE field on a pitch deck slide.

The founder thinks the current text is weak / generic / off-brand and wants
options. You return N distinct phrasings, each demonstrably stronger.

RULES:
- Lift founder-supplied statlines verbatim when relevant. Never invent numbers.
- Each alternative must be a different angle, not a synonym shuffle:
    Alt 1 = punchier, fewer words
    Alt 2 = evidence-led (stat first)
    Alt 3 = consequence-led (what it means for the investor)
- Match the field type:
    headline   2-6 words, no buzzwords, present tense
    sub        8-15 words, expands the headline
    lede       1-2 sentences, concrete + specific
    bullet     outcome-led, ≤14 words, no marketing fluff
    stat       value + label (e.g. "$840K ARR — 23% MoM")
    check      ≤10 words, outcome statement
    step       phase title + 1-line explanation
    card       num + head + body shape

OUTPUT — JSON only, no markdown:
{ "alternatives": ["...", "...", "..."] }`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const b = req.body || {}
    if (!b.slideId || !b.field || !b.currentText) {
      return res.status(400).json({ error: 'slideId, field, and currentText are required' })
    }
    const count = Math.min(5, Math.max(2, Number(b.count) || 3))

    const userMsg = `SLIDE: ${b.slideId}
FIELD: ${b.field}
COMPANY: ${b.company || '(unknown)'}
INDUSTRY: ${b.industry || '(unknown)'}
AUDIENCE: ${b.audience || '(unknown)'}

CURRENT TEXT (the founder thinks this is weak):
"${b.currentText}"

SURROUNDING SLIDE CONTEXT (for tone matching, do NOT repeat any of this in your alternatives):
${JSON.stringify(b.slideContext || {}, null, 2).slice(0, 1500)}

${b.founderStatlines ? `FOUNDER-SUPPLIED STATLINES (lift verbatim when relevant — never invent):
${b.founderStatlines}` : '(no statlines supplied — strengthen on craft only, do not invent numbers)'}

Return exactly ${count} alternatives as JSON. Each one MUST be a distinct angle,
not a paraphrase of the same idea. Skip the "alternative 1:" prefixes — just the
phrasings.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    })
    const raw = (message.content[0] as any).text?.trim() ?? ''
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    let parsed: any
    try { parsed = JSON.parse(jsonStr) }
    catch {
      const m = jsonStr.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'unparseable response' })
      parsed = JSON.parse(m[0])
    }

    const alternatives = Array.isArray(parsed.alternatives)
      ? parsed.alternatives.filter((s: any) => typeof s === 'string' && s.trim()).slice(0, count)
      : []

    res.status(200).json({
      alternatives,
      tokensUsed: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
    })
  } catch (e: any) {
    console.error('strengthen error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'strengthen failed' })
  }
}
