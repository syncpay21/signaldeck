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

// Reference: the Up Bank handcrafted deck (compact version — Sonnet sees
// the SHAPE of a cinematic deck, not 33KB of detail. Tells Sonnet what
// "good" looks like as a scaffold to remix per brand.)
const REFERENCE_DECK_SKETCH = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{COMPANY} · Pitch</title>
<link href="https://fonts.googleapis.com/css2?family={FONT_HEADING}&family={FONT_BODY}&display=swap" rel="stylesheet"/>
<style>
:root{ --bg:{BG}; --surface:{SURFACE}; --accent:{ACCENT}; --fg:{TEXT}; --wire:rgba(255,255,255,.12);
       --fh:'{FONT_HEADING}',sans-serif; --fb:'{FONT_BODY}',sans-serif; --fm:'JetBrains Mono',monospace; }
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden} body{background:var(--bg);color:var(--fg);font-family:var(--fb)}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:.28;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E")}
.cursor,.cursor-dot{position:fixed;top:0;left:0;pointer-events:none;z-index:9998;border-radius:50%;mix-blend-mode:difference}
.cursor{width:28px;height:28px;border:1.5px solid var(--accent)} .cursor-dot{width:5px;height:5px;background:var(--accent)}
.cursor.hov{width:64px;height:64px;background:color-mix(in srgb,var(--accent) 14%,transparent)}
#hud{position:fixed;inset:0;pointer-events:none;z-index:1000}
#bar{position:absolute;top:0;left:0;height:3px;background:var(--accent);box-shadow:0 0 14px var(--accent);transition:width .35s ease;width:0}
#deck{height:100vh;overflow-y:scroll;scroll-snap-type:y mandatory;scroll-behavior:smooth;scrollbar-width:none}
#deck::-webkit-scrollbar{display:none}
.slide{position:relative;min-height:100vh;width:100%;overflow:hidden;display:flex;flex-direction:column;justify-content:center;scroll-snap-align:start;scroll-snap-stop:always;padding:80px 56px}
.slide-inner{max-width:1240px;margin:0 auto;width:100%;opacity:0;transform:translate3d(0,28px,0) scale(.985);filter:blur(6px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1),filter .9s cubic-bezier(.16,1,.3,1)}
.slide.in-view .slide-inner{opacity:1;transform:none;filter:blur(0)}
.tag{font-family:var(--fm);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--accent);margin-bottom:24px}
.h1{font-family:var(--fh);font-weight:900;font-size:clamp(56px,8vw,128px);line-height:.88;letter-spacing:-.02em;text-transform:uppercase;margin-bottom:24px}
.h1 .accent{color:var(--accent)}
.sub{font-family:var(--fh);font-weight:800;font-size:clamp(22px,2.6vw,36px);text-transform:uppercase;margin-bottom:22px;max-width:880px;color:var(--accent)}
.lede{font-size:clamp(15px,1.3vw,18px);line-height:1.6;max-width:780px;margin-bottom:28px;opacity:.85}
/* + per-slide bespoke layouts (prob-grid, fix-row, how-flow, stats, comp matrix, ask split) */
/* + marquee bands between sections */
</style></head>
<body>
<div class="cursor"></div><div class="cursor-dot"></div>
<div id="hud"><div id="bar"></div>{HUD_TOP}{DOT_NAV}{HUD_LABEL}</div>
<div id="deck">
  <section class="slide" data-idx="0"> ... INTRO ... </section>
  <section class="slide" data-idx="1"> ... PROBLEM (3-card grid) ... </section>
  <section class="marq" data-idx="2"> ... MARQUEE BAND ... </section>
  <section class="slide" data-idx="3"> ... FIX (5 checks) ... </section>
  <section class="slide" data-idx="4"> ... HOW (4 steps) ... </section>
  <section class="slide" data-idx="5"> ... VALIDATION (4 stats) ... </section>
  <section class="slide" data-idx="6"> ... CUSTOMERS (numbered list) ... </section>
  <section class="marq" data-idx="7"> ... MARQUEE BAND ... </section>
  <section class="slide" data-idx="8"> ... MARKET (stats) ... </section>
  <section class="slide" data-idx="9"> ... COMPETITION (matrix) ... </section>
  <section class="slide" data-idx="10"> ... ASK (split panel + CTA) ... </section>
</div>
<script>/* IntersectionObserver → in-view/out-above/out-below + dot nav + cursor + keys */</script>
</body></html>`

const SYSTEM_PROMPT = `${ANDREAS_PERSONA}

YOUR JOB HERE
Design + write a single self-contained HTML pitch deck. This is the
"premium" path — you get to set the entire visual experience, not just the
slide copy. Output ONE complete HTML document with inline CSS + JS.

QUALITY BAR — this deck must feel hand-designed for THIS brand:
- Use the brand's colour palette as actual surfaces. If primary is yellow
  on coral, USE that — don't soften. Cards in the brand's card colour
  (often saturated or black, not always cream).
- Use the brand's typography. The heading font is for displays at clamp
  56-128px. Body for read-able 13-18px text.
- Cinematic chrome: scroll-snap mandatory, per-slide in-view fade+scale+blur
  entry, custom cursor (ring + dot, mix-blend:difference), SVG fractalNoise
  overlay, HUD (progress bar + counter + dot nav + bottom label).
- Story arc: each slide's lede or last bullet sets up the next slide's
  headline. Marquee bands between major sections (after Problem, after
  Customers) with brand-relevant scrolling text.
- Per-slide bespoke layouts (NOT the same grid on every slide):
    Problem      → 3-card grid with num + head + body + foot
    Fix          → 5-check row with brand-coloured check badges
    How          → 4 numbered steps with italic huge numerals
    Validation   → 4 stat tiles, italic display numerals
    Customers    → numbered card list with italic numerals as markers
    Market       → 4-stat hero row
    Competition  → matrix table (3 cols, 5-7 rows) with ✓/× cells
    Ask          → split layout — use-of-funds panel + giant accent CTA
- Intro slide: brand mark + tag + huge italic display headline + divider
  + meta + signature + scroll cue.

RULES:
- ONE HTML document. No external CSS or JS files (Google Fonts link is OK).
- Use the supplied slide content as the WORDS — don't invent numbers, claims
  or proof not present. Adapt the layout, not the facts.
- Insert marquee bands AFTER the problem slide and AFTER the customers slide.
  Pick brand-relevant scrolling text from the company's story.
- Keep total HTML under 50KB. Trim CSS aggressively. No redundant rules.
- Mobile fallbacks: cursor hidden, grid collapses to 1 or 2 cols.
- Return raw HTML only. NO markdown fences, NO commentary, NO leading explanation.

REFERENCE SCAFFOLD (the shape, not the content):
${REFERENCE_DECK_SKETCH}`

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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
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
