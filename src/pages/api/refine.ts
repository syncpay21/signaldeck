import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'
import { renderDeck } from '@/lib/renderer'
import type { DeckInput, DeckContent } from '@/lib/types'
import { ANDREAS_PERSONA } from '@/lib/andreas-persona'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const REFINE_SYSTEM = `${ANDREAS_PERSONA}

YOUR JOB HERE
Pitch-coach pass. You receive slide content JSON from a pitch deck. Two passes:
1. Critique the copy slide-by-slide — direct, sharp, specific.
2. Rewrite every text field to be tighter, more investor-grade, more emotionally resonant.

Rewrite rules:
- Headlines: 2–5 words max, punchy, UPPERCASE-friendly, no clichés
- Sub lines: one crisp sentence, specific claim
- Lede: cut every filler word. Say the thing. 1–2 sentences.
- Bullets: specific, evidence-backed, no buzzwords ("innovative", "disruptive", "game-changing")
- Stats values: keep numbers exactly as given — do NOT invent new numbers
- Stat labels: make them punchy and meaningful
- Tags: keep exactly as-is
- Return ONLY valid JSON matching the EXACT same schema as the input`

function buildRefinePrompt(company: string, content: DeckContent): string {
  return `Critique and rewrite this pitch deck copy for ${company}.

Return improved JSON with the same structure. Do not add or remove keys.

${JSON.stringify(content, null, 2)}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { content, input }: { content: DeckContent; input: DeckInput } = req.body

  if (!content || !input) {
    return res.status(400).json({ error: 'content and input are required' })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: REFINE_SYSTEM },
        { role: 'user', content: buildRefinePrompt(input.company, content) },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    })

    const raw = completion.choices[0].message.content || '{}'
    const improved: DeckContent = JSON.parse(raw)
    const html = renderDeck(input, improved)

    return res.status(200).json({ html, content: improved })
  } catch (err: any) {
    console.error('Refine error:', err)
    return res.status(500).json({ error: err.message })
  }
}
