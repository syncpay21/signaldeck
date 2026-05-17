import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { renderDeck } from '../../lib/renderer'
import { selectNarrative, getSlideSet } from '../../lib/narrative-engine'
import { buildSystemPrompt, buildGenerationPrompt } from '../../lib/narrative-prompts'
import { FRAMEWORKS } from '../../lib/frameworks/library'
import { DARK_FRAMEWORKS } from '../../lib/frameworks/dark'
import { resolveIndustry, getIndustryGuide } from '../../lib/industry-guide'
import type { AudienceType, UseCase, Stage, Industry, BusinessModel, GtmMotion, TractionStatus, Region, TeamSize } from '../../lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const input = req.body
    if (!input.company) return res.status(400).json({ error: 'company required' })

    const audience         = (input.audience         || 'seed-vc')  as AudienceType
    const goal             = (input.goal             || 'raise')    as UseCase
    const stage            = (input.stage            || 'seed')     as Stage
    const industry         = (input.industry         || 'other')    as Industry
    const businessModelType = input.businessModelType as BusinessModel | undefined
    const gtmMotion        = input.gtmMotion        as GtmMotion | undefined
    const tractionStatus   = input.tractionStatus   as TractionStatus | undefined
    const region           = input.region           as Region | undefined
    const teamSize         = input.teamSize         as TeamSize | undefined

    const narrative = selectNarrative(audience, goal)
    const slideIds  = getSlideSet(narrative, stage, industry, businessModelType, gtmMotion, tractionStatus, region, teamSize)

    // Resolve optional framework + industry-design guide
    const frameworkId   = typeof input.frameworkId === 'string' ? input.frameworkId : undefined
    const allFw         = [...FRAMEWORKS, ...DARK_FRAMEWORKS]
    const fw            = frameworkId ? allFw.find(f => f.id === frameworkId) : undefined
    const guideKey      = resolveIndustry(industry)
    const industryGuide = getIndustryGuide(guideKey)

    const systemPrompt = buildSystemPrompt(narrative, stage, industry, {
      framework:     fw ? { name: fw.name, summary: fw.summary, steps: fw.steps } : undefined,
      industryVoice: { tone: industryGuide.tone, avoid: industryGuide.avoid },
      businessModel: businessModelType,
      gtmMotion: gtmMotion,
      tractionStatus: tractionStatus,
      region: region,
      teamSize: teamSize,
    })
    const prompt = buildGenerationPrompt({ ...input, audience, goal, stage, industry }, narrative, slideIds)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as any).text.trim()
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const content = JSON.parse(jsonStr)
    const html = renderDeck(input, content, slideIds, { industryGuide })

    res.status(200).json({
      html,
      content,
      narrative:        narrative.id,
      slideOrder:       slideIds,
      frameworkApplied: fw?.id ?? null,
      industryGuide:    guideKey,
    })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
