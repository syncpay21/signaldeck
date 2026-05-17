import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { renderDeck } from '../../lib/renderer'
import { selectNarrative, getSlideSet } from '../../lib/narrative-engine'
import { buildSystemPrompt, buildGenerationPrompt } from '../../lib/narrative-prompts'
import type { AudienceType, UseCase, Stage, Industry } from '../../lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const input = req.body
    if (!input.company) return res.status(400).json({ error: 'company required' })

    const audience  = (input.audience  || 'seed-vc')  as AudienceType
    const goal      = (input.goal      || 'raise')    as UseCase
    const stage     = (input.stage     || 'seed')     as Stage
    const industry  = (input.industry  || 'other')    as Industry

    const narrative = selectNarrative(audience, goal)
    const slideIds  = getSlideSet(narrative, stage, industry)
    const systemPrompt = buildSystemPrompt(narrative, stage, industry)
    const prompt    = buildGenerationPrompt({ ...input, audience, goal, stage, industry }, narrative, slideIds)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as any).text.trim()
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const content = JSON.parse(jsonStr)
    const html = renderDeck(input, content, slideIds)

    res.status(200).json({
      html,
      content,
      narrative: narrative.id,
      slideOrder: slideIds,
    })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
