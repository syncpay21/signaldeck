import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { ANDREAS_PERSONA } from '../../lib/andreas-persona'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { content, company } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `${ANDREAS_PERSONA}

YOUR JOB HERE
Audit this pitch deck like the ruthless first reviewer you'd want before sending it to a real investor. Score honestly — most decks score 40-70. Return ONLY valid JSON.`,
      messages: [{
        role: 'user',
        content: `Audit this pitch deck for ${company}:

${JSON.stringify(content, null, 2)}

Score each dimension 0–100:
- clarity: is the story clear and easy to follow?
- momentum: does each slide build urgency toward the ask?
- evidence: are claims backed by data and specifics?
- conviction: does it feel like the founder believes it?

Return this exact JSON:
{
  "scores": { "clarity": 0-100, "momentum": 0-100, "evidence": 0-100, "conviction": 0-100 },
  "overall": 0-100,
  "tips": [
    { "severity": "good|warn|risk", "title": "short title", "body": "specific actionable tip", "slide": "s1_intro" }
  ]
}`
      }],
    })

    const raw = (message.content[0] as any).text.trim()
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    return res.status(200).json(JSON.parse(json))
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
