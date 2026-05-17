import { deckTemplate } from '../templates/deckTemplate'
import type { SlideId } from './types'
import type { IndustryGuide } from './industry-guide'
import type { SynthesisedTheme } from './pipeline/theme-synthesizer'
import type { SlideVisual } from './pipeline/visual-mood'
import type { BrandWorld } from './brand-world'
import { brandWorldMotifBackground } from './motifs'

// Transition durations (matched to design-reference.html demoTx timings)
const TX_DUR: Record<string, number> = {
  'reveal-wipe': 900, 'reveal-up': 750, 'reveal-stagger': 700,
  'zoom-passage': 800, 'fold': 800, 'warp': 850, 'glitch': 650,
  'dropzoom': 750, 'prism': 900, 'vortex': 1000, 'explode': 750, 'shake': 500,
}

/** Swap a slide's hardcoded transition for one from the industry guide if it isn't already in-style.
 *  s1_intro stays on zoom-passage (load-coupled). */
function adaptTransition(slideId: string, defaultTx: string, guide?: IndustryGuide): string {
  if (slideId === 's1_intro' || !guide) return defaultTx
  if (guide.transitions.includes(defaultTx)) return defaultTx
  const swap = guide.transitions.find(t => TX_DUR[t])
  return swap || defaultTx
}

function stats(items: any[] = []) {
  if (!items.length) return ''
  return `<div class="stat-row reveal-stagger">${items.map((s,i)=>`<div class="stat-card" style="--i:${i}"><div class="stat-val">${s.value}</div><div class="stat-lbl">${s.label}</div></div>`).join('')}</div>`
}
function bullets(items: string[] = []) {
  if (!items.length) return ''
  return `<ul class="bullet-list reveal-stagger">${items.map((b,i)=>`<li style="--i:${i}">${b}</li>`).join('')}</ul>`
}
function slide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle = '') {
  // motifStyle is an optional inline-style string carrying a background-image
  // for the industry motif. Sits on the slide-grid layer at low opacity.
  return `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="${label}" data-tx="${tx}">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${c.tag||''}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${c.headline||''}</span></h2>
    ${c.sub?`<div class="slide-sub reveal-up d1">${c.sub}</div>`:''}
    ${c.lede?`<p class="slide-lede reveal-up d2">${c.lede}</p>`:''}
    ${stats(c.stats)}${bullets(c.bullets)}
  </div>
</section>`
}

// Visual properties per slide type
const SLIDE_DEFS: Record<string, { htmlId: string; label: string; tx: string; bgx: string; bgy: string }> = {
  s1_intro:        { htmlId: 's1',  label: 'Intro',        tx: 'zoom-passage', bgx: '20%', bgy: '30%' },
  s2_situation:    { htmlId: 's2',  label: 'Situation',    tx: 'explode',      bgx: '60%', bgy: '40%' },
  s3_problem:      { htmlId: 's3',  label: 'Problem',      tx: 'explode',      bgx: '70%', bgy: '30%' },
  s4_implication:  { htmlId: 's4',  label: 'Implication',  tx: 'fold',         bgx: '40%', bgy: '60%' },
  s5_fix:          { htmlId: 's5',  label: 'Fix',          tx: 'fold',         bgx: '50%', bgy: '50%' },
  s6_how:          { htmlId: 's6',  label: 'How It Works', tx: 'warp',         bgx: '30%', bgy: '40%' },
  s7_validation:   { htmlId: 's7',  label: 'Validation',   tx: 'glitch',       bgx: '55%', bgy: '35%' },
  s8_market:       { htmlId: 's8',  label: 'Market',       tx: 'glitch',       bgx: '45%', bgy: '55%' },
  s9_customers:    { htmlId: 's9',  label: 'Customers',    tx: 'explode',      bgx: '65%', bgy: '45%' },
  s10_competition: { htmlId: 's10', label: 'Competition',  tx: 'dropzoom',     bgx: '35%', bgy: '65%' },
  s11_risks:       { htmlId: 's11', label: 'Risks',        tx: 'fold',         bgx: '50%', bgy: '40%' },
  s12_team_ask:    { htmlId: 's12', label: 'Team & Ask',   tx: 'prism',        bgx: '45%', bgy: '50%' },
}

function buildIntroSlide(idx: number, input: any, c: any): string {
  // User-uploaded hero image becomes a soft background layer; logo appears
  // above the company wordmark. If neither is uploaded the slide stays as it was.
  const heroBg = input.heroData
    ? `<div class="hero-image-bg" style="position:absolute;inset:0;background-image:url('${input.heroData}');background-size:cover;background-position:center;opacity:0.18;filter:blur(2px);"></div>`
    : ''
  const logoMark = input.logoData
    ? `<img src="${input.logoData}" alt="${input.company} logo" style="max-height:72px;max-width:200px;object-fit:contain;margin-bottom:24px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3));" class="reveal-up" />`
    : ''
  return `<section class="slide" id="s1" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="Intro" data-tx="zoom-passage">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid"></div><div class="slide-bg" style="--bgx:20%;--bgy:30%;"></div>
  ${heroBg}
  <div class="slide-inner" style="position:relative;z-index:2;">
    ${logoMark}
    <div class="hero-tag reveal-up">${c.tag||''}</div>
    <div class="reveal-wipe" style="font-family:var(--font-heading);font-weight:900;font-size:clamp(80px,16vw,220px);line-height:0.88;letter-spacing:-4px;text-transform:uppercase;margin-bottom:12px;">${input.company}</div>
    <h1 class="hero-title reveal-wipe d1">${c.sub||input.oneLiner}</h1>
    <div class="hero-divider"></div>
    <div class="hero-signature reveal-up d3"><span class="h-name">${input.founderName}</span><span class="h-dot"></span><span class="h-role">${input.founderRole}</span></div>
    <div class="hero-company reveal-up d4">${input.location||''} · ${input.domain}</div>
    <div class="scroll-cue">Use ↑ / ↓ arrow keys</div>
  </div>
</section>`
}

/* ─── Bespoke per-slide layouts ────────────────────────────────────────
   Reference deck has hand-crafted layouts for problem/fix/how/competition;
   our generic slide() shell can't match that. These builders generate the
   matching markup when content fields signal the layout (e.g. content.cards
   present → problem grid; content.checks present → fix checks; etc.).
   Any slide without the required fields falls through to slide().
═════════════════════════════════════════════════════════════════════════ */

function escapeHtml(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string))
}

function buildProblemSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string): string {
  const cards = Array.isArray(c.cards) ? c.cards : (Array.isArray(c.bullets) ? c.bullets.map((b: string, i: number) => ({ num: `0${i+1}`, head: b, body: '' })) : [])
  if (!cards.length) return ''
  const cardsHtml = cards.slice(0, 6).map((card: any, i: number) => `<div class="prob-card" style="--i:${i}">
    <div class="prob-num">${escapeHtml(card.num || `0${i+1}`)}</div>
    <div class="prob-head">${escapeHtml(card.head || card.title || '')}</div>
    ${card.body ? `<div class="prob-body">${escapeHtml(card.body)}</div>` : ''}
    ${card.foot ? `<div class="prob-foot">${escapeHtml(card.foot)}</div>` : ''}
  </div>`).join('')
  return `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="${label}" data-tx="${tx}">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'the problem')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}
    <div class="prob-grid reveal-stagger tx-group">${cardsHtml}</div>
  </div>
</section>`
}

function buildFixSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string): string {
  const checks = Array.isArray(c.checks) ? c.checks : (Array.isArray(c.bullets) ? c.bullets : [])
  if (!checks.length) return ''
  const checksHtml = checks.slice(0, 5).map((chk: any, i: number) => `<div class="fix-check" style="--i:${i}">${escapeHtml(typeof chk === 'string' ? chk : chk.text || chk.label || '')}</div>`).join('')
  return `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="${label}" data-tx="${tx}">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'the fix')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}
    <div class="fix-checks reveal-stagger tx-group">${checksHtml}</div>
  </div>
</section>`
}

function buildHowSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string): string {
  const steps = Array.isArray(c.steps) ? c.steps : (Array.isArray(c.bullets) ? c.bullets.map((b: string, i: number) => ({ head: b, body: '' })) : [])
  if (!steps.length) return ''
  const stepsHtml = steps.slice(0, 4).map((s: any, i: number) => `<div class="how-step" style="--i:${i}">
    <div class="how-num">${String(i + 1).padStart(2,'0')}</div>
    <div class="how-head">${escapeHtml(s.head || s.title || (typeof s === 'string' ? s : ''))}</div>
    ${s.body ? `<div class="how-body">${escapeHtml(s.body)}</div>` : ''}
  </div>`).join('')
  return `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="${label}" data-tx="${tx}">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'how it works')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}
    <div class="how-flow reveal-stagger tx-group">${stepsHtml}</div>
  </div>
</section>`
}

function buildCompetitionSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string): string {
  const matrix = c.matrix
  if (!matrix || !Array.isArray(matrix.rows) || !matrix.rows.length) return ''
  const cols = Array.isArray(matrix.columns) ? matrix.columns.slice(0, 3) : ['You', 'Them A', 'Them B']
  const head = `<div class="comp-head">Capability</div>${cols.map((col: string) => `<div class="comp-head">${escapeHtml(col)}</div>`).join('')}`
  const rows = matrix.rows.slice(0, 6).map((row: any) => {
    const cells = (row.cells || []).slice(0, 3).map((cell: any) => {
      if (cell === true || cell === 'y' || cell === '✓') return '<div class="comp-y">✓</div>'
      if (cell === false || cell === 'n' || cell === '✗') return '<div class="comp-n">×</div>'
      return `<div>${escapeHtml(cell)}</div>`
    }).join('')
    return `<div class="comp-row-label">${escapeHtml(row.label || '')}</div>${cells}`
  }).join('')
  return `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="${label}" data-tx="${tx}">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'competition')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    <div class="comp-matrix reveal-stagger tx-group">${head}${rows}</div>
  </div>
</section>`
}

/** Marquee band — full-viewport section break with animated text rows.
 *  Used between major arc sections (after Problem, after Fix, before Ask). */
function buildMarqueeBand(idx: number, texts: string[]): string {
  const row = (variant: string) => `<div class="marquee-row ${variant}"><span>${texts.map(t => escapeHtml(t)).join('</span><span>')}</span><span>${texts.map(t => escapeHtml(t)).join('</span><span>')}</span></div>`
  return `<section class="marquee-section" data-idx="${idx}" data-label="—">
    ${row('')}
    ${row('reverse muted')}
  </section>`
}

function buildDemoSlide(idx: number, input: any): string {
  // Priority: live demoUrl iframe > uploaded product screenshot > placeholder
  let body: string
  if (input.demoUrl) {
    body = `<div class="demo-embed-wrap reveal-up d2"><iframe src="${input.demoUrl}" class="demo-iframe" allow="fullscreen" loading="lazy"></iframe></div>`
  } else if (input.productData) {
    body = `<div class="demo-embed-wrap reveal-up d2" style="display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);border-radius:16px;padding:24px;">
      <img src="${input.productData}" alt="${input.company} product"
           style="max-width:100%;max-height:60vh;object-fit:contain;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.4);" />
    </div>`
  } else {
    body = `<div class="demo-placeholder reveal-up d2"><div class="demo-ph-inner"><div class="demo-ph-icon">▶</div><p style="color:var(--mist);margin-bottom:16px;">${input.demoDescription||'Interactive demo'}</p><a href="https://${input.domain}" target="_blank" class="demo-ph-link">Visit ${input.domain}</a></div></div>`
  }
  return `<section class="slide" id="s13" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="Demo" data-tx="fold">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid"></div><div class="slide-bg" style="--bgx:50%;--bgy:50%;"></div>
  <div class="slide-inner">
    <div class="slide-tag">live demo</div>
    <h2 class="slide-title"><span class="reveal-wipe">See it in action</span></h2>
    ${body}
  </div>
</section>`
}

// slideIds controls which slides render and in what order.
// When omitted, all 12 slides render in default order (backward compat).
// opts.brandWorld  — full BrandWorld from /api/brand-world. Wins over
//                    everything else for theme + motif. Drives industry-
//                    specific SVG backgrounds via motifs.ts.
// opts.theme       — synthesized theme (Track B2). Wins over industryGuide.
// opts.slideVisuals — per-slide transition / mood / bgx / bgy (Track B3).
//                    Wins over SLIDE_DEFS hardcoded transition + bg position.
// opts.industryGuide supplies the fallback fonts / accent / palette /
//                    transition list when theme/visuals aren't provided.
// opts.includeDemo controls whether to append the demo slide.
export function renderDeck(
  input: any,
  content: any,
  slideIds?: SlideId[],
  opts?: {
    industryGuide?: IndustryGuide
    theme?:         SynthesisedTheme
    slideVisuals?:  Record<string, SlideVisual>
    brandWorld?:    BrandWorld | null
    includeDemo?:   boolean
  },
): string {
  const ids: SlideId[] = slideIds ?? (Object.keys(SLIDE_DEFS) as SlideId[])
  const guide  = opts?.industryGuide
  const theme  = opts?.theme
  const visuals = opts?.slideVisuals
  const world = opts?.brandWorld
  const hasDemo = opts?.includeDemo !== false && (input.demoUrl || input.demoDescription || input.productData)

  // Industry motif background — picked from BrandWorld.motifs. Applied to
  // every slide's bg layer at low opacity so it reads as texture, not
  // decoration. No motif → empty string (current visual unchanged).
  const motifColour = world?.colour.primary || theme?.accent || guide?.color || '#0F1115'
  const motif = world ? brandWorldMotifBackground(world.motifs || [], motifColour) : { name: null, css: '' }
  const motifBg = motif.css ? `background-image:${motif.css};background-size:auto;background-repeat:repeat;` : ''
  // Make the motif visible via a data attribute so the deckTemplate CSS can
  // optionally style it (workspace consumers also see this in dev tools).

  // Slides plus interleaved marquee bands between major arc sections so the
  // story has visible breathing room (matches the reference deck's section
  // breaks). Bands are inserted AFTER s3_problem and s5_fix when present.
  const slideHtmlList: string[] = []
  const labels: string[] = []
  ids.forEach((id) => {
    const idx = slideHtmlList.length
    if (id === 's1_intro') {
      slideHtmlList.push(buildIntroSlide(idx, input, content.s1_intro || {}))
      labels.push(SLIDE_DEFS[id]?.label || id)
      return
    }
    const def = SLIDE_DEFS[id]
    if (!def) return
    const v   = visuals?.[id]
    const tx  = v?.transition || adaptTransition(id, def.tx, guide)
    const bgx = v?.bgx        || def.bgx
    const bgy = v?.bgy        || def.bgy
    const c   = content[id] || {}
    // Bespoke layout dispatch — falls through to the generic slide() shell
    // when the slide's content doesn't carry the layout-specific fields.
    let html = ''
    if (id === 's3_problem')      html = buildProblemSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    else if (id === 's5_fix')     html = buildFixSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    else if (id === 's6_how')     html = buildHowSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    else if (id === 's10_competition') html = buildCompetitionSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    if (!html) html = slide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    slideHtmlList.push(html)
    labels.push(def.label)

    // Interleave a marquee band after Problem and after Fix — section breaks.
    if (id === 's3_problem' || id === 's5_fix') {
      const company = input.company || ''
      const texts = id === 's3_problem'
        ? [company || 'A real problem', 'Costs adding up', 'No one solves this well', 'Here\'s why']
        : [company || 'The fix', 'Built different', 'Proof inside', 'Keep reading']
      slideHtmlList.push(buildMarqueeBand(slideHtmlList.length, texts))
      labels.push('—')
    }
  })

  if (hasDemo) {
    const demoIdx = slideHtmlList.length
    slideHtmlList.push(buildDemoSlide(demoIdx, input))
    labels.push('Demo')
  }

  // BrandWorld wins for theme — same source of truth the workspace uses.
  // For dual-saturated brands (Up, Klarna) the deck inherits the same coral
  // back panel + black cards + yellow accents the workspace shows, not a
  // generic teal-on-navy fallback.
  const accentColor = world?.colour.primary    || input.accentColor || theme?.accent      || guide?.color      || '#00e5c3'
  const bgColor     = world?.colour.background || input.bgColor     || theme?.bg          || guide?.palette[1] || '#06080d'
  const surfaceColor = world?.colour.surface   || undefined
  const textColor    = world?.colour.text       || undefined
  const fontHeading = world?.typography.heading || input.fontHeading || theme?.fontHeading || guide?.display    || 'Barlow Condensed'
  const fontBody    = world?.typography.body    || input.fontBody    || theme?.fontBody    || guide?.body       || 'DM Sans'
  const fontData    = world?.typography.mono    || theme?.fontData   || guide?.data        || 'JetBrains Mono'
  const isDark      = world ? world.deckMode === 'dark' : (input.isDark !== false && (theme?.isDark ?? true))

  return deckTemplate({
    company:     input.company,
    oneLiner:    input.oneLiner,
    domain:      input.domain,
    accentColor,
    bgColor,
    surfaceColor,
    textColor,
    fontHeading,
    fontBody,
    fontData,
    isDark,
    totalSlides: slideHtmlList.length,
    slidesHtml:  slideHtmlList.join('\n'),
    dotNav:      labels.map((l,i) => `<button data-idx="${i}" data-label="${l}" aria-label="${l}"></button>`).join('\n'),
  })
}
