import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { content, company, audience = 'Seed VC', founderName = 'The founder' } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `You write follow-up emails for founders after investor meetings. Voice: direct, warm, human. No corporate speak, no bullet points, no fake enthusiasm. Short — 3–4 short paragraphs max. Return ONLY valid JSON.`,
      messages: [{
        role: 'user',
        content: `Write a follow-up email from ${founderName} at ${company} to a ${audience} investor, sent the day after presenting this deck:

${JSON.stringify(content, null, 2)}

The email should:
- Reference one specific thing from the deck that resonated
- Offer one piece of new information or proof point not in the deck
- Make a clear, low-friction ask (next step)
- Sound like a real founder, not a template

Return this exact JSON:
{
  "subject": "email subject line (no emojis, no RE:, direct)",
  "body": "full email body using \\n for line breaks"
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
