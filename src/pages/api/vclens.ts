import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { ANDREAS_PERSONA } from '../../lib/andreas-persona'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PERSONAS: Record<string, string> = {
  'Seed VC':   'a generalist seed investor writing $500k–$2M checks. You care about founder conviction, insight quality, and a believable wedge.',
  'Series A':  'a Series A partner writing $8–15M checks. You care about repeatable GTM, NRR, and payback period above all else.',
  'Angel':     'an operator angel writing $25k–250k. You care about the founder above all — their unfair advantage and why they will win.',
  'Strategic': 'a corporate development investor from a large company. You care about distribution fit, integration cost, and long-term M&A optionality.',
  'Internal':  'a board member or internal stakeholder. You care about the decision being asked, what changed since last quarter, and the smallest ask that works.',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { content, company, persona = 'Seed VC' } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })

  const personaDesc = PERSONAS[persona] || PERSONAS['Seed VC']

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `${ANDREAS_PERSONA}

YOUR JOB HERE
You are running a VC-lens simulation for the founder. For THIS reading, channel the voice of ${personaDesc} The output should sound like that investor speaking, not like you summarising their view. Stay sharp, honest, no flattery. Return ONLY valid JSON.`,
      messages: [{
        role: 'user',
        content: `Review this pitch deck for ${company}:

${JSON.stringify(content, null, 2)}

Return this exact JSON:
{
  "verdict": "one punchy sentence: your hot take on this pitch",
  "score": 0-100,
  "questions": ["5 hard questions you would ask in the room"],
  "strengths": ["2 genuine strengths"],
  "concerns": ["3 specific concerns"],
  "tips": ["2 concrete things to fix before the next meeting"]
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
