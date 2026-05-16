import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { renderDeck } from '../../lib/renderer'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a world-class pitch deck writer. Write cinematic, punchy, investor-grade pitch decks. Headlines are SHORT (2-6 words). Tags are VERY short (2-4 words). Lede is 1-2 sentences max. Bullets are sharp and specific. Avoid buzzwords. Return ONLY valid JSON, no markdown.`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const input = req.body
    if (!input.company) return res.status(400).json({ error: 'company required' })

    const prompt = `Create a cinematic VC pitch deck for:
Company: ${input.company}
One-liner: ${input.oneLiner}
Problem: ${input.problem}
Solution: ${input.solution}
How it works: ${input.howItWorks}
Traction: ${input.traction}
Market: ${input.market}
Business model: ${input.businessModel}
Competition: ${input.competition}
Team: ${input.team}
Ask: ${input.ask}
${input.demoDescription ? 'Demo: ' + input.demoDescription : ''}

Return this exact JSON (no markdown):
{"s1_intro":{"tag":"string","headline":"COMPANY NAME","sub":"hook line"},"s2_situation":{"tag":"the situation","headline":"2-5 word headline","lede":"1-2 sentences","stats":[{"value":"stat","label":"label"}]},"s3_problem":{"tag":"the problem","headline":"4-6 word headline","lede":"1-2 sentences","bullets":["pain 1","pain 2","pain 3"]},"s4_implication":{"tag":"the implication","headline":"4-6 words","lede":"the stakes","stats":[{"value":"number","label":"impact"}]},"s5_fix":{"tag":"the fix","headline":"2-3 word solution name","sub":"one crisp sentence","lede":"how it solves it"},"s6_how":{"tag":"how it works","headline":"3-step process","lede":"the mechanism","bullets":["Step 1: ...","Step 2: ...","Step 3: ..."]},"s7_validation":{"tag":"validation","headline":"traction headline","lede":"what it proves","stats":[{"value":"metric","label":"meaning"},{"value":"metric","label":"meaning"},{"value":"metric","label":"meaning"}]},"s8_market":{"tag":"market","headline":"market headline","lede":"why now","stats":[{"value":"$XB","label":"TAM"},{"value":"$XM","label":"SAM"},{"value":"$XM","label":"SOM"}]},"s9_customers":{"tag":"who it serves","headline":"customer headline","lede":"who buys and why","bullets":["segment 1","segment 2","segment 3"]},"s10_competition":{"tag":"competition","headline":"competitive position","lede":"what makes it defensible","bullets":["differentiator 1","differentiator 2","differentiator 3"]},"s11_risks":{"tag":"risks","headline":"what could go wrong","lede":"honest assessment","bullets":["Risk: X → Mitigation: Y","Risk: X → Mitigation: Y","Risk: X → Mitigation: Y"]},"s12_team_ask":{"tag":"team & the ask","headline":"$XM ask headline","lede":"why this team wins","stats":[{"value":"$XM","label":"raising"},{"value":"X mo","label":"runway"}],"bullets":["founder + credential","founder + credential"]}}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as any).text.trim()
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const content = JSON.parse(jsonStr)
    const html = renderDeck(input, content)
    res.status(200).json({ html, content })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
