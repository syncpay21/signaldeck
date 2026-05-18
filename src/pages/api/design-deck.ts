/* ════════════════════════════════════════════════════════════════════
   POST /api/design-deck

   "Design with Claude" — premium HTML generation. Instead of slot-filling
   deckTemplate from per-slide content, this hands the brand world + slide
   content to Sonnet with a few-shot example (the Up Bank handcrafted deck)
   and asks Sonnet to write a complete cinematic HTML deck in the brand's
   actual voice.

   Why opt-in: this burns ~15-20k output tokens per deck vs the renderer
   which is essentially free. Use when the founder wants a hero deck, not a
   draft. The workspace gates it behind an explicit "Design with Claude
   (premium)" button.

   Body:
     {
       brandWorld:    BrandWorld    (required)
       content:       Record<slideId, slideContent>  (required)
       founder:       { company, oneLiner, founderName, audience, stage, ... }
     }

   Returns:
     { html: string, tokensUsed: { in, out } }
═══════════════════════════════════════════════════════════════════ */

import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { ANDREAS_PERSONA } from '../../lib/andreas-persona'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

JOB: Design + write a single self-contained HTML pitch deck for THIS brand.

Output ONE complete HTML document, raw — no markdown, no commentary.

QUALITY BAR:
- Use the brand's palette as actual surfaces. Cards in the brand's card colour (often saturated or black, not always cream). Don't soften.
- Use the brand's heading font for displays at clamp 56-128px. Body for 13-18px text.
- Scroll-snap mandatory; per-slide opacity+transform entry on .in-view; SVG fractalNoise overlay at 28% mix-blend:overlay; HUD with progress bar + slide counter + dot nav + bottom label.
- Story arc: each slide's lede sets up the next slide's headline. Marquee bands after Problem and after Customers with brand-relevant scrolling text.

PER-SLIDE LAYOUTS (do NOT use one grid for everything):
- Intro: brand mark + tag + huge italic display headline + divider + signature + scroll cue
- Problem: 3-card grid (num + head + body + foot accent)
- Fix: 5-check row with brand-coloured check badges
- How: 4 numbered steps with italic huge numerals
- Validation: 4 stat tiles, italic display numerals
- Customers: numbered card list with italic numerals as list markers
- Market: 4-stat hero row
- Competition: matrix table (3 cols, 5-7 rows) with ✓ / ×
- Ask: split — use-of-funds panel + giant accent CTA with cap-table summary

RULES:
- ONE HTML doc, inline CSS + JS (Google Fonts <link> OK)
- Use the supplied slide content as the WORDS — never invent numbers/claims/proof
- Marquee bands AFTER problem and customers slides
- Total HTML under 35KB, trim CSS aggressively, no redundant rules
- Mobile: cursor hidden via @media(hover:none); grids collapse to 1 or 2 cols
- IntersectionObserver wires .in-view / .out-above / .out-below
- Raw HTML only`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { brandWorld, content, founder } = req.body || {}
    if (!brandWorld) return res.status(400).json({ error: 'brandWorld is required' })
    if (!content || typeof content !== 'object') return res.status(400).json({ error: 'content is required' })
    if (!founder?.company) return res.status(400).json({ error: 'founder.company is required' })

    // Compact the brandWorld + content so Sonnet's context stays focused on
    // the design task, not parsing huge JSON blobs.
    const palette = {
      bg:      brandWorld.colour?.background,
      surface: brandWorld.colour?.surface,
      accent:  brandWorld.colour?.primary,
      text:    brandWorld.colour?.text,
      cream:   brandWorld.colour?.textMuted,
    }
    const fonts = {
      heading: brandWorld.typography?.heading,
      body:    brandWorld.typography?.body,
      mono:    brandWorld.typography?.mono,
    }
    const personality = brandWorld.brandPersonality || ''
    const direction   = brandWorld.visualDirection || ''
    const slides = Object.entries(content).map(([id, c]: [string, any]) => `--- ${id} ---
tag: ${c.tag || ''}
headline: ${c.headline || ''}
sub: ${c.sub || ''}
lede: ${c.lede || ''}
${c.bullets ? `bullets: ${(c.bullets || []).join(' | ')}` : ''}
${c.stats ? `stats: ${(c.stats || []).map((s: any) => `${s.value} ${s.label}`).join(' | ')}` : ''}
${c.cards ? `cards: ${(c.cards || []).map((x: any) => `[${x.num} ${x.head}: ${x.body} | ${x.foot}]`).join(' || ')}` : ''}
${c.checks ? `checks: ${(c.checks || []).join(' | ')}` : ''}
${c.steps ? `steps: ${(c.steps || []).map((x: any) => `[${x.head}: ${x.body}]`).join(' | ')}` : ''}
${c.matrix ? `matrix cols: ${(c.matrix.columns || []).join(', ')} | rows: ${(c.matrix.rows || []).map((r: any) => `${r.label}: ${r.cells.join(',')}`).join(' || ')}` : ''}`).join('\n')

    const userMsg = `BRAND
Company:     ${founder.company}
One-liner:   ${founder.oneLiner || ''}
Founder:     ${founder.founderName || ''}
Audience:    ${founder.audience || ''}
Stage:       ${founder.stage || ''}
Personality: ${personality}
Direction:   ${direction}

PALETTE
background: ${palette.bg}
surface:    ${palette.surface}
accent:     ${palette.accent}
text:       ${palette.text}

FONTS
heading: ${fonts.heading}
body:    ${fonts.body}
mono:    ${fonts.mono}

SLIDE CONTENT (use the words; adapt the layout)
${slides}

Write the complete HTML deck now. Raw HTML only, no fences, no commentary.`

    // max_tokens capped to 10k — 35KB HTML target ≈ 9k output tokens. Caps the
    // worst-case spend per run; Sonnet usually returns ~6-8k for a tight deck.
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 10000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    })

    const raw = (message.content[0] as any).text || ''
    // Strip any accidental markdown fence — model is told not to add them
    // but defensive removal keeps the output renderable.
    const html = raw.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '').trim()

    res.status(200).json({
      html,
      tokensUsed: {
        in:  message.usage?.input_tokens  ?? 0,
        out: message.usage?.output_tokens ?? 0,
      },
    })
  } catch (e: any) {
    console.error('design-deck error:', e?.message || e)
    res.status(500).json({ error: e?.message || 'design-deck failed' })
  }
}
