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
      max_tokens: 2000,
      system: `${ANDREAS_PERSONA}

YOUR JOB HERE
Pull every factual or persuasive claim out of this deck and classify each one — the way you'd want them lined up before a real DD meeting. Return ONLY valid JSON.`,
      messages: [{
        role: 'user',
        content: `Extract and classify every claim in this ${company} pitch deck:

${JSON.stringify(content, null, 2)}

Classifications:
- "supported": backed by a number, named customer, or verifiable data in the deck
- "needs-source": plausible but unverified — an investor will ask for proof
- "risky": bold or unlikely claim that could damage credibility if challenged
- "founder-thesis": subjective belief or opinion, clearly stated as such

Return this exact JSON:
{
  "claims": [
    {
      "text": "the exact claim as stated",
      "slide": "s1_intro",
      "classification": "supported|needs-source|risky|founder-thesis",
      "confidence": 0.0-1.0
    }
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
