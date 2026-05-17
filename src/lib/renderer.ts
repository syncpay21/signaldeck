import { deckTemplate } from '../templates/deckTemplate'
import type { SlideId } from './types'
import type { IndustryGuide } from './industry-guide'

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
function slide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any) {
  return `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="${label}" data-tx="${tx}">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
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
  return `<section class="slide" id="s1" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="Intro" data-tx="zoom-passage">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid"></div><div class="slide-bg" style="--bgx:20%;--bgy:30%;"></div>
  <div class="slide-inner">
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

function buildDemoSlide(idx: number, input: any): string {
  return `<section class="slide" id="s13" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="Demo" data-tx="fold">
  <span class="slide-num-bg">${String(idx).padStart(2,'0')}</span>
  <div class="slide-grid"></div><div class="slide-bg" style="--bgx:50%;--bgy:50%;"></div>
  <div class="slide-inner">
    <div class="slide-tag">live demo</div>
    <h2 class="slide-title"><span class="reveal-wipe">See it in action</span></h2>
    ${input.demoUrl
      ? `<div class="demo-embed-wrap reveal-up d2"><iframe src="${input.demoUrl}" class="demo-iframe" allow="fullscreen" loading="lazy"></iframe></div>`
      : `<div class="demo-placeholder reveal-up d2"><div class="demo-ph-inner"><div class="demo-ph-icon">▶</div><p style="color:var(--mist);margin-bottom:16px;">${input.demoDescription||'Interactive demo'}</p><a href="https://${input.domain}" target="_blank" class="demo-ph-link">Visit ${input.domain}</a></div></div>`
    }
  </div>
</section>`
}

// slideIds controls which slides render and in what order.
// When omitted, all 12 slides render in default order (backward compat).
// opts.industryGuide supplies fallback fonts / accent / palette /
// transition list per the agency design guide — user theme overrides win.
export function renderDeck(
  input: any,
  content: any,
  slideIds?: SlideId[],
  opts?: { industryGuide?: IndustryGuide },
): string {
  const ids: SlideId[] = slideIds ?? (Object.keys(SLIDE_DEFS) as SlideId[])
  const guide = opts?.industryGuide

  const slideHtmlList = ids.map((id, idx) => {
    if (id === 's1_intro') return buildIntroSlide(idx, input, content.s1_intro || {})
    const def = SLIDE_DEFS[id]
    if (!def) return ''
    const tx = adaptTransition(id, def.tx, guide)
    return slide(def.htmlId, idx, def.label, tx, def.bgx, def.bgy, content[id] || {})
  })

  const demoIdx = slideHtmlList.length
  slideHtmlList.push(buildDemoSlide(demoIdx, input))

  const labels = ids.map(id => SLIDE_DEFS[id]?.label || id)
  labels.push('Demo')

  return deckTemplate({
    company:     input.company,
    oneLiner:    input.oneLiner,
    domain:      input.domain,
    accentColor: input.accentColor || guide?.color         || '#00e5c3',
    bgColor:     input.bgColor     || guide?.palette[1]    || '#06080d',
    fontHeading: input.fontHeading || guide?.display       || 'Barlow Condensed',
    fontBody:    input.fontBody    || guide?.body          || 'DM Sans',
    isDark:      input.isDark !== false,
    totalSlides: slideHtmlList.length,
    slidesHtml:  slideHtmlList.join('\n'),
    dotNav:      labels.map((l,i) => `<button data-idx="${i}" data-label="${l}" aria-label="${l}"></button>`).join('\n'),
  })
}
