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

/* ─── INTRO LAYOUT VARIANTS ──────────────────────────────────────────
   Four distinct intro slide layouts. The renderer picks by brand world:
     - cardStyle = 'statement' + visualRichness in [rich, maximal]  → 'massive-display'
     - input.productData OR input.heroData present                  → 'phone-mockup'
     - cardStyle = 'editorial' OR layoutStyle = 'editorial-spacious'→ 'split-editorial'
     - cardStyle = 'minimal-line' OR visualRichness = 'restrained'  → 'minimal-centered'
   Each variant has bespoke geometry — not the same content slotted into
   different colours. */

type IntroVariant = 'massive-display' | 'phone-mockup' | 'split-editorial' | 'minimal-centered'

function pickIntroVariant(world: any, input: any): IntroVariant {
  if (input?.productData || input?.heroData) return 'phone-mockup'
  if (!world) return 'massive-display'
  if (world.cardStyle === 'editorial' || world.layoutStyle === 'editorial-spacious') return 'split-editorial'
  if (world.cardStyle === 'minimal-line' || world.visualRichness === 'restrained') return 'minimal-centered'
  if (world.cardStyle === 'statement' && (world.visualRichness === 'rich' || world.visualRichness === 'maximal')) return 'massive-display'
  return 'massive-display'
}

function escapeAttr(s: any): string {
  return String(s ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function buildIntroSlide(idx: number, input: any, c: any, world?: any): string {
  const variant = pickIntroVariant(world, input)
  const num = String(idx).padStart(2, '0')

  // ── Variant 1: MASSIVE-DISPLAY — company name fills the viewport ────
  if (variant === 'massive-display') {
    const heroBg = input.heroData
      ? `<div style="position:absolute;inset:0;background-image:url('${escapeAttr(input.heroData)}');background-size:cover;background-position:center;opacity:0.16;filter:blur(2px);"></div>`
      : ''
    const logoMark = input.logoData
      ? `<img src="${escapeAttr(input.logoData)}" alt="${escapeAttr(input.company)} logo" style="max-height:64px;max-width:200px;object-fit:contain;margin-bottom:28px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3));" class="reveal-up" />`
      : ''
    return `<section class="slide" id="s1" data-idx="${idx}" data-num="${num}" data-label="Intro" data-tx="zoom-passage" data-variant="massive-display">
  <span class="slide-num-bg">${num}</span>
  <div class="slide-grid"></div><div class="slide-bg" style="--bgx:20%;--bgy:30%;"></div>
  ${heroBg}
  <div class="slide-inner" style="position:relative;z-index:2;">
    ${logoMark}
    <div class="hero-tag reveal-up">${c.tag || ''}</div>
    <div class="reveal-wipe" style="font-family:var(--font-heading);font-weight:900;font-size:clamp(80px,16vw,240px);line-height:0.85;letter-spacing:-0.04em;text-transform:uppercase;margin-bottom:16px;color:var(--accent)">${input.company}</div>
    <h1 class="hero-title reveal-wipe d1" style="max-width:780px">${c.sub || input.oneLiner}</h1>
    <div class="hero-divider"></div>
    <div class="hero-signature reveal-up d3"><span class="h-name">${input.founderName}</span><span class="h-dot"></span><span class="h-role">${input.founderRole || ''}</span></div>
    <div class="hero-company reveal-up d4">${input.location || ''} · ${input.domain || ''}</div>
    <div class="scroll-cue">scroll · or ↓</div>
  </div>
</section>`
  }

  // ── Variant 2: PHONE-MOCKUP — left text, right product screenshot ───
  if (variant === 'phone-mockup') {
    const productImg = input.productData || input.heroData || ''
    const productPanel = productImg
      ? `<div style="flex:0 0 38%;display:flex;align-items:center;justify-content:center;position:relative">
           <div style="width:300px;max-width:90%;aspect-ratio:9/19;border-radius:36px;overflow:hidden;background:#000;box-shadow:0 30px 80px rgba(0,0,0,0.45),0 0 0 2px rgba(255,255,255,0.06);position:relative">
             <img src="${escapeAttr(productImg)}" alt="${escapeAttr(input.company)} product" style="width:100%;height:100%;object-fit:cover;display:block"/>
             <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);width:90px;height:24px;background:#000;border-radius:14px"></div>
           </div>
         </div>`
      : ''
    return `<section class="slide" id="s1" data-idx="${idx}" data-num="${num}" data-label="Intro" data-tx="fold" data-variant="phone-mockup">
  <span class="slide-num-bg">${num}</span>
  <div class="slide-grid"></div><div class="slide-bg" style="--bgx:75%;--bgy:50%;"></div>
  <div class="slide-inner" style="position:relative;z-index:2;display:flex;gap:56px;align-items:center;flex-wrap:wrap">
    <div style="flex:1 1 480px;min-width:320px">
      <div class="hero-tag reveal-up">${c.tag || 'live product'}</div>
      <div class="reveal-wipe" style="font-family:var(--font-heading);font-weight:900;font-size:clamp(56px,9vw,140px);line-height:0.88;letter-spacing:-0.03em;text-transform:uppercase;margin-bottom:14px;color:var(--accent)">${input.company}</div>
      <h1 class="hero-title reveal-wipe d1" style="font-size:clamp(18px,2vw,26px);max-width:560px">${c.sub || input.oneLiner}</h1>
      <div class="hero-divider"></div>
      <div class="hero-signature reveal-up d3"><span class="h-name">${input.founderName}</span><span class="h-dot"></span><span class="h-role">${input.founderRole || ''}</span></div>
    </div>
    ${productPanel}
  </div>
</section>`
  }

  // ── Variant 3: SPLIT-EDITORIAL — magazine cover meets pitch ──────────
  if (variant === 'split-editorial') {
    return `<section class="slide" id="s1" data-idx="${idx}" data-num="${num}" data-label="Intro" data-tx="warp" data-variant="split-editorial">
  <span class="slide-num-bg">${num}</span>
  <div class="slide-grid"></div><div class="slide-bg" style="--bgx:50%;--bgy:50%;"></div>
  <div class="slide-inner" style="position:relative;z-index:2;display:grid;grid-template-columns:1.1fr 0.9fr;gap:64px;align-items:end">
    <div>
      <div class="hero-tag reveal-up" style="margin-bottom:64px">${c.tag || (input.location || '')} · ISSUE ${idx + 1}</div>
      <div class="reveal-wipe" style="font-family:var(--font-heading);font-weight:900;font-size:clamp(72px,12vw,180px);line-height:0.92;letter-spacing:-0.02em;text-transform:none;font-style:italic;color:var(--accent);margin-bottom:24px">${input.company}</div>
      <div style="height:2px;background:var(--accent);width:160px;margin-bottom:24px;transform:scaleX(0);transform-origin:left;transition:transform .9s .5s var(--ease-enter,cubic-bezier(.16,1,.3,1))" class="hero-divider"></div>
      <h1 class="hero-title reveal-wipe d1" style="font-size:clamp(20px,2.2vw,30px);font-family:var(--font-heading);font-weight:700;max-width:560px">${c.sub || input.oneLiner}</h1>
    </div>
    <div style="padding-bottom:24px;border-left:1px solid var(--wire);padding-left:32px;align-self:stretch;display:flex;flex-direction:column;justify-content:flex-end">
      <div class="reveal-up d2" style="font-family:var(--font-mono,monospace);font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:.55;margin-bottom:8px">Founder</div>
      <div class="reveal-up d3" style="font-family:var(--font-heading);font-weight:800;font-size:24px;margin-bottom:32px">${input.founderName}</div>
      <div class="reveal-up d4" style="font-family:var(--font-mono,monospace);font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:.55;margin-bottom:8px">Stage</div>
      <div class="reveal-up d4" style="font-family:var(--font-heading);font-weight:800;font-size:18px;margin-bottom:32px;text-transform:uppercase">${input.stage || ''}</div>
      <div class="reveal-up d4" style="font-family:var(--font-mono,monospace);font-size:11px;letter-spacing:2px;opacity:.5">${input.domain || ''}</div>
    </div>
  </div>
</section>`
  }

  // ── Variant 4: MINIMAL-CENTERED — quiet, premium, swiss ──────────────
  return `<section class="slide" id="s1" data-idx="${idx}" data-num="${num}" data-label="Intro" data-tx="zoom-passage" data-variant="minimal-centered">
  <span class="slide-num-bg" style="opacity:.04">${num}</span>
  <div class="slide-grid" style="opacity:.18"></div>
  <div class="slide-inner" style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;min-height:80vh">
    <div class="hero-tag reveal-up" style="margin-bottom:48px">${c.tag || (input.industry || '')}</div>
    <div class="reveal-wipe" style="font-family:var(--font-heading);font-weight:800;font-size:clamp(56px,8vw,128px);line-height:0.95;letter-spacing:-0.02em;text-transform:none;margin-bottom:20px;color:var(--accent)">${input.company}</div>
    <h1 class="hero-title reveal-wipe d1" style="font-size:clamp(16px,1.6vw,22px);max-width:620px;opacity:.7">${c.sub || input.oneLiner}</h1>
    <div class="hero-divider" style="margin:48px auto 24px"></div>
    <div class="hero-signature reveal-up d3" style="justify-content:center"><span class="h-name">${input.founderName}</span><span class="h-dot"></span><span class="h-role">${input.founderRole || ''}</span></div>
    <div class="scroll-cue">scroll</div>
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

/* ─── PROBLEM (s3) — 4 variants ────────────────────────────────────────
   3-card grid (default) / stat-overlay / quote-evidence / before-state */
function pickProblemVariant(c: any): 'card-grid' | 'stat-overlay' | 'quote-evidence' | 'before-state' {
  if (c.heroStat && typeof c.heroStat === 'object') return 'stat-overlay'
  if (Array.isArray(c.painQuotes) && c.painQuotes.length) return 'quote-evidence'
  if (c.statusQuo && c.wished) return 'before-state'
  return 'card-grid'
}

function buildProblemSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string): string {
  const variant = pickProblemVariant(c)
  const num = String(idx).padStart(2, '0')
  const head = `<span class="slide-num-bg">${num}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'the problem')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}`
  const wrap = (body: string) => `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${num}" data-label="${label}" data-tx="${tx}" data-variant="${variant}">${head}${body}</div></section>`

  if (variant === 'stat-overlay') {
    const hero = c.heroStat || { value:'—', label:'', subtext:'' }
    const supporting = Array.isArray(c.supporting) ? c.supporting.slice(0, 3) : (Array.isArray(c.bullets) ? c.bullets.slice(0, 3) : [])
    return wrap(`<div class="prob-stat tx-group">
      <div class="prob-stat-hero stagger" style="--i:0">
        <div class="prob-stat-num">${escapeHtml(hero.value)}</div>
        <div class="prob-stat-lbl">${escapeHtml(hero.label)}</div>
        ${hero.subtext ? `<div class="prob-stat-sub">${escapeHtml(hero.subtext)}</div>` : ''}
      </div>
      <div class="prob-stat-side">
        ${supporting.map((s: any, i: number) => `<div class="prob-stat-fact stagger" style="--i:${i+1}">${escapeHtml(typeof s === 'string' ? s : (s.text || s.label || ''))}</div>`).join('')}
      </div>
    </div>`)
  }

  if (variant === 'quote-evidence') {
    const quotes = (c.painQuotes as any[]).slice(0, 3)
    return wrap(`<div class="prob-quotes stagger tx-group">
      ${quotes.map((q: any, i: number) => `<div class="prob-quote-card" style="--i:${i}">
        <div class="prob-quote-mark">"</div>
        <div class="prob-quote-text">${escapeHtml(q.text || q.quote || '')}</div>
        <div class="prob-quote-author">— ${escapeHtml(q.author || q.role || 'A customer')}</div>
      </div>`).join('')}
    </div>`)
  }

  if (variant === 'before-state') {
    const sq = c.statusQuo  // {title, items[]}
    const w  = c.wished    // {title, items[]}
    return wrap(`<div class="prob-before tx-group">
      <div class="prob-before-col prob-before-sq stagger" style="--i:0">
        <div class="prob-before-lbl">${escapeHtml(sq.title || 'Today')}</div>
        <ul>${(sq.items || []).slice(0, 5).map((it: string) => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
      </div>
      <div class="prob-before-arrow">→</div>
      <div class="prob-before-col prob-before-wish stagger" style="--i:1">
        <div class="prob-before-lbl">${escapeHtml(w.title || 'What they want')}</div>
        <ul>${(w.items || []).slice(0, 5).map((it: string) => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
      </div>
    </div>`)
  }

  // CARD-GRID — default 3-card layout
  const cards = Array.isArray(c.cards) ? c.cards : (Array.isArray(c.bullets) ? c.bullets.map((b: string, i: number) => ({ num: `0${i+1}`, head: b, body: '' })) : [])
  if (!cards.length) return ''
  return wrap(`<div class="prob-grid reveal-stagger tx-group">
    ${cards.slice(0, 6).map((card: any, i: number) => `<div class="prob-card" style="--i:${i}">
      <div class="prob-num">${escapeHtml(card.num || `0${i+1}`)}</div>
      <div class="prob-head">${escapeHtml(card.head || card.title || '')}</div>
      ${card.body ? `<div class="prob-body">${escapeHtml(card.body)}</div>` : ''}
      ${card.foot ? `<div class="prob-foot">${escapeHtml(card.foot)}</div>` : ''}
    </div>`).join('')}
  </div>`)
}

/* ─── FIX (s5) — 4 variants ────────────────────────────────────────────
   checks-row (default) / before-after / three-pillar / one-big-thing */
function pickFixVariant(c: any): 'checks-row' | 'before-after' | 'three-pillar' | 'one-big-thing' {
  if (c.before && c.after) return 'before-after'
  if (Array.isArray(c.pillars) && c.pillars.length === 3) return 'three-pillar'
  if (c.oneThing && typeof c.oneThing === 'string') return 'one-big-thing'
  return 'checks-row'
}

function buildFixSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string): string {
  const variant = pickFixVariant(c)
  const num = String(idx).padStart(2, '0')
  const head = `<span class="slide-num-bg">${num}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'the fix')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}`
  const wrap = (body: string) => `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${num}" data-label="${label}" data-tx="${tx}" data-variant="${variant}">${head}${body}</div></section>`

  if (variant === 'before-after') {
    const before = c.before || { title:'Before', items:[] }
    const after  = c.after  || { title:'After',  items:[] }
    return wrap(`<div class="fix-ba tx-group">
      <div class="fix-ba-col fix-ba-before stagger" style="--i:0">
        <div class="fix-ba-lbl">${escapeHtml(before.title || 'Before')}</div>
        <ul>${(before.items || []).slice(0, 5).map((it: string) => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
      </div>
      <div class="fix-ba-arrow">→</div>
      <div class="fix-ba-col fix-ba-after stagger" style="--i:1">
        <div class="fix-ba-lbl">${escapeHtml(after.title || 'After')}</div>
        <ul>${(after.items || []).slice(0, 5).map((it: string) => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
      </div>
    </div>`)
  }

  if (variant === 'three-pillar') {
    const pillars = (c.pillars as any[]).slice(0, 3)
    return wrap(`<div class="fix-pillars stagger tx-group">
      ${pillars.map((p: any, i: number) => `<div class="fix-pillar" style="--i:${i}">
        <div class="fix-pillar-icon">${escapeHtml(p.icon || (i + 1))}</div>
        <div class="fix-pillar-name">${escapeHtml(p.name || p.title || '')}</div>
        <div class="fix-pillar-desc">${escapeHtml(p.desc || p.body || '')}</div>
      </div>`).join('')}
    </div>`)
  }

  if (variant === 'one-big-thing') {
    const sup = Array.isArray(c.supporting) ? c.supporting.slice(0, 2) : []
    return wrap(`<div class="fix-onething tx-group">
      <div class="fix-onething-statement reveal-up d3">${escapeHtml(c.oneThing)}</div>
      ${sup.length ? `<div class="fix-onething-sup stagger">
        ${sup.map((s: any, i: number) => `<div class="fix-onething-line" style="--i:${i}">${escapeHtml(typeof s === 'string' ? s : (s.text || ''))}</div>`).join('')}
      </div>` : ''}
    </div>`)
  }

  // CHECKS-ROW — default
  const checks = Array.isArray(c.checks) ? c.checks : (Array.isArray(c.bullets) ? c.bullets : [])
  if (!checks.length) return ''
  return wrap(`<div class="fix-checks reveal-stagger tx-group">
    ${checks.slice(0, 5).map((chk: any, i: number) => `<div class="fix-check" style="--i:${i}">${escapeHtml(typeof chk === 'string' ? chk : chk.text || chk.label || '')}</div>`).join('')}
  </div>`)
}

/* ─── SITUATION (s2) — 4 variants ──────────────────────────────────────
   why-now-triple (3 shifts) / shift-timeline / convergence / before-after-world */
function pickSituationVariant(c: any): 'why-now-triple' | 'shift-timeline' | 'convergence' | 'before-after-world' {
  if (Array.isArray(c.timeline) && c.timeline.length >= 3) return 'shift-timeline'
  if (Array.isArray(c.converging) && c.converging.length >= 2) return 'convergence'
  if (c.oldWorld && c.newWorld) return 'before-after-world'
  return 'why-now-triple'
}

function buildSituationSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string): string {
  const variant = pickSituationVariant(c)
  const num = String(idx).padStart(2, '0')
  const head = `<span class="slide-num-bg">${num}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'why now')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}`
  const wrap = (body: string) => `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${num}" data-label="${label}" data-tx="${tx}" data-variant="${variant}">${head}${body}</div></section>`

  if (variant === 'shift-timeline') {
    const stones = (c.timeline as any[]).slice(0, 5)
    return wrap(`<div class="sit-timeline tx-group">
      <div class="sit-timeline-line"></div>
      ${stones.map((m: any, i: number) => `<div class="sit-timeline-stop stagger" style="--i:${i}">
        <div class="sit-timeline-dot${m.isNow ? ' sit-timeline-dot-now' : ''}"></div>
        <div class="sit-timeline-when">${escapeHtml(m.when || m.year || '')}</div>
        <div class="sit-timeline-what">${escapeHtml(m.what || m.label || '')}</div>
      </div>`).join('')}
    </div>`)
  }

  if (variant === 'convergence') {
    const trends = (c.converging as any[]).slice(0, 4)
    return wrap(`<div class="sit-conv tx-group">
      <div class="sit-conv-lines">
        ${trends.map((_, i: number) => `<div class="sit-conv-line" style="--i:${i};--total:${trends.length}"></div>`).join('')}
        <div class="sit-conv-point"></div>
      </div>
      <div class="sit-conv-labels stagger">
        ${trends.map((t: any, i: number) => `<div class="sit-conv-trend" style="--i:${i}">
          <div class="sit-conv-name">${escapeHtml(t.name || t.title || '')}</div>
          <div class="sit-conv-desc">${escapeHtml(t.desc || t.body || '')}</div>
        </div>`).join('')}
      </div>
    </div>`)
  }

  if (variant === 'before-after-world') {
    const o = c.oldWorld || { title:'Old world', items:[] }
    const n = c.newWorld || { title:'New world', items:[] }
    return wrap(`<div class="sit-world tx-group">
      <div class="sit-world-col sit-world-old stagger" style="--i:0">
        <div class="sit-world-lbl">${escapeHtml(o.title || 'Old world')}</div>
        <ul>${(o.items || []).slice(0, 5).map((it: string) => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
      </div>
      <div class="sit-world-divider"><span>NOW</span></div>
      <div class="sit-world-col sit-world-new stagger" style="--i:1">
        <div class="sit-world-lbl">${escapeHtml(n.title || 'New world')}</div>
        <ul>${(n.items || []).slice(0, 5).map((it: string) => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
      </div>
    </div>`)
  }

  // WHY-NOW-TRIPLE — three shifts in big cards
  const shifts = Array.isArray(c.shifts) ? c.shifts.slice(0, 3) : (Array.isArray(c.bullets) ? c.bullets.slice(0, 3).map((b: string) => ({ name: b, desc: '' })) : [])
  return wrap(`<div class="sit-triple stagger tx-group">
    ${shifts.map((s: any, i: number) => `<div class="sit-triple-card" style="--i:${i}">
      <div class="sit-triple-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="sit-triple-name">${escapeHtml(typeof s === 'string' ? s : (s.name || s.title || ''))}</div>
      ${typeof s === 'object' && s.desc ? `<div class="sit-triple-desc">${escapeHtml(s.desc)}</div>` : ''}
    </div>`).join('')}
  </div>`)
}

/* ─── MARKET (s8) — 4 variants ─────────────────────────────────────────
   tam-sam-som (concentric rings) / waterfall-bars / verticals / growth-curve */
function pickMarketVariant(c: any): 'tam-sam-som' | 'waterfall-bars' | 'verticals' | 'growth-curve' {
  if (Array.isArray(c.growthCurve) && c.growthCurve.length >= 3) return 'growth-curve'
  if (Array.isArray(c.verticals) && c.verticals.length >= 3) return 'verticals'
  if (Array.isArray(c.stats) && c.stats.length === 3 && /tam|sam|som/i.test(c.stats[0]?.label || '')) return 'tam-sam-som'
  if (Array.isArray(c.stats) && c.stats.length >= 3) return 'waterfall-bars'
  return 'tam-sam-som'
}

function buildMarketSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string): string {
  const variant = pickMarketVariant(c)
  const num = String(idx).padStart(2, '0')
  const head = `<span class="slide-num-bg">${num}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'market')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}`
  const wrap = (body: string) => `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${num}" data-label="${label}" data-tx="${tx}" data-variant="${variant}">${head}${body}</div></section>`

  if (variant === 'tam-sam-som') {
    const stats = (Array.isArray(c.stats) ? c.stats : []).slice(0, 3)
    return wrap(`<div class="mkt-rings tx-group">
      <div class="mkt-rings-svg">
        <div class="mkt-ring mkt-ring-1 stagger" style="--i:0"><span>${escapeHtml(stats[0]?.value || 'TAM')}</span></div>
        <div class="mkt-ring mkt-ring-2 stagger" style="--i:1"><span>${escapeHtml(stats[1]?.value || 'SAM')}</span></div>
        <div class="mkt-ring mkt-ring-3 stagger" style="--i:2"><span>${escapeHtml(stats[2]?.value || 'SOM')}</span></div>
      </div>
      <div class="mkt-rings-legend stagger">
        ${stats.map((s: any, i: number) => `<div class="mkt-rings-row" style="--i:${i+3}">
          <span class="mkt-rings-dot mkt-rings-dot-${i+1}"></span>
          <div><div class="mkt-rings-lbl">${escapeHtml(s.label)}</div><div class="mkt-rings-val">${escapeHtml(s.value)}</div></div>
        </div>`).join('')}
      </div>
    </div>`)
  }

  if (variant === 'waterfall-bars') {
    const stats = (Array.isArray(c.stats) ? c.stats : []).slice(0, 4)
    return wrap(`<div class="mkt-water stagger tx-group">
      ${stats.map((s: any, i: number) => `<div class="mkt-water-row" style="--i:${i};--w:${100 - i * 22}%">
        <div class="mkt-water-lbl">${escapeHtml(s.label)}</div>
        <div class="mkt-water-bar"><div class="mkt-water-bar-fill"></div><div class="mkt-water-bar-val">${escapeHtml(s.value)}</div></div>
      </div>`).join('')}
    </div>`)
  }

  if (variant === 'verticals') {
    const verts = (c.verticals as any[]).slice(0, 6)
    return wrap(`<div class="mkt-verticals stagger tx-group">
      ${verts.map((v: any, i: number) => `<div class="mkt-vertical-card" style="--i:${i}">
        <div class="mkt-vertical-name">${escapeHtml(v.name || v.label || '')}</div>
        <div class="mkt-vertical-size">${escapeHtml(v.size || v.value || '')}</div>
        ${v.detail ? `<div class="mkt-vertical-detail">${escapeHtml(v.detail)}</div>` : ''}
      </div>`).join('')}
    </div>`)
  }

  // GROWTH-CURVE
  const points = c.growthCurve as Array<{year: string|number; value: number; label?: string}>
  const max = Math.max(...points.map(p => p.value || 0), 1)
  const w = 600, h = 200
  const xStep = w / (points.length - 1)
  const path = points.map((p, i) => `${i * xStep},${h - (p.value / max) * (h - 20)}`).join(' ')
  return wrap(`<div class="mkt-growth tx-group">
    <svg class="mkt-growth-svg" viewBox="0 0 ${w} ${h + 40}" preserveAspectRatio="none">
      <defs><linearGradient id="mg${idx}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="0,${h} ${path} ${w},${h}" fill="url(#mg${idx})"/>
      <polyline points="${path}" fill="none" stroke="var(--accent)" stroke-width="3"/>
      ${points.map((p, i) => {
        const x = i * xStep, y = h - (p.value / max) * (h - 20)
        return `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent)"/>
          <text x="${x}" y="${h + 22}" fill="var(--snow)" font-family="var(--fm)" font-size="11" text-anchor="middle" opacity="0.55">${escapeHtml(String(p.year))}</text>`
      }).join('')}
    </svg>
    <div class="mkt-growth-legend stagger">
      ${points.map((p, i) => p.label ? `<div class="mkt-growth-callout" style="--i:${i}">${escapeHtml(p.label)}</div>` : '').join('')}
    </div>
  </div>`)
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

/* ─── VALIDATION (s7) — 4 variants ─────────────────────────────────────
   Picks by content shape + brand:
     content.quotes present                   → 'quote-stack'
     content.customerLogos OR named customers → 'logo-wall'
     content.stats.length === 1 (hero stat)   → 'hero-number'
     fallback when stats[] dominates          → 'cohort-curve' OR generic
*/
function pickValidationVariant(c: any, world: any): 'hero-number' | 'cohort-curve' | 'logo-wall' | 'quote-stack' {
  if (Array.isArray(c.quotes) && c.quotes.length) return 'quote-stack'
  if (Array.isArray(c.customerLogos) && c.customerLogos.length) return 'logo-wall'
  if (Array.isArray(c.stats) && c.stats.length === 1) return 'hero-number'
  if (Array.isArray(c.stats) && c.stats.length >= 3) {
    if (world?.dataVizStyle === 'sparkline' || world?.dataVizStyle === 'editorial-chart') return 'cohort-curve'
  }
  return 'hero-number'
}

function buildValidationSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string, world?: any): string {
  const variant = pickValidationVariant(c, world)
  const num = String(idx).padStart(2, '0')
  const head = `<span class="slide-num-bg">${num}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'validation')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}`
  const wrap = (body: string) => `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${num}" data-label="${label}" data-tx="${tx}" data-variant="${variant}">${head}${body}</div></section>`

  // HERO-NUMBER — one massive italic numeral + supporting stats
  if (variant === 'hero-number') {
    const hero = (Array.isArray(c.stats) && c.stats[0]) || { value: '—', label: '' }
    const supporting = (Array.isArray(c.stats) ? c.stats.slice(1, 4) : [])
    return wrap(`<div class="val-hero stagger tx-group">
      <div class="val-hero-num" style="--i:0">${escapeHtml(hero.value)}</div>
      <div class="val-hero-lbl" style="--i:1">${escapeHtml(hero.label)}</div>
      ${supporting.length ? `<div class="val-hero-side stagger">
        ${supporting.map((s: any, i: number) => `<div class="val-side-stat" style="--i:${i+2}">
          <div class="val-side-num">${escapeHtml(s.value)}</div>
          <div class="val-side-lbl">${escapeHtml(s.label)}</div>
        </div>`).join('')}
      </div>` : ''}
    </div>`)
  }

  // COHORT-CURVE — SVG retention chart with stat tiles below
  if (variant === 'cohort-curve') {
    const stats = (Array.isArray(c.stats) ? c.stats.slice(0, 4) : [])
    // Faked smooth curve — flat tail (retention pattern) so it always reads as healthy
    const pts = '0,140 60,80 120,55 180,42 240,36 300,32 360,30 420,29 480,28 540,28 600,28'
    return wrap(`<div class="val-cohort tx-group">
      <svg class="val-curve" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="cg${idx}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient></defs>
        <polygon points="0,180 ${pts} 600,180" fill="url(#cg${idx})"/>
        <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
        ${pts.split(' ').filter((_, i) => i % 2 === 0).map(p => {
          const [x, y] = p.split(',')
          return `<circle cx="${x}" cy="${y}" r="2.5" fill="var(--accent)"/>`
        }).join('')}
      </svg>
      <div class="val-curve-stats stagger">
        ${stats.map((s: any, i: number) => `<div class="val-curve-stat" style="--i:${i}">
          <div class="val-curve-num">${escapeHtml(s.value)}</div>
          <div class="val-curve-lbl">${escapeHtml(s.label)}</div>
        </div>`).join('')}
      </div>
    </div>`)
  }

  // LOGO-WALL — grid of customer logo monograms (no real logos? use initials)
  if (variant === 'logo-wall') {
    const logos = Array.isArray(c.customerLogos) ? c.customerLogos : []
    const items = logos.length ? logos.slice(0, 12) : (Array.isArray(c.bullets) ? c.bullets.slice(0, 12) : [])
    return wrap(`<div class="val-wall stagger tx-group">
      ${items.map((it: any, i: number) => {
        const name = typeof it === 'string' ? it : (it.name || '')
        const url  = typeof it === 'object' ? (it.url || it.logo || '') : ''
        const initials = name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
        return `<div class="val-logo-tile" style="--i:${i}">
          ${url ? `<img src="${escapeAttr(url)}" alt="${escapeAttr(name)}" />` : `<span class="val-logo-init">${escapeHtml(initials || '·')}</span>`}
          <div class="val-logo-name">${escapeHtml(name)}</div>
        </div>`
      }).join('')}
    </div>`)
  }

  // QUOTE-STACK — 2-3 large quotes with author attribution
  const quotes = Array.isArray(c.quotes) ? c.quotes.slice(0, 3) : []
  return wrap(`<div class="val-quotes stagger tx-group">
    ${quotes.map((q: any, i: number) => `<blockquote class="val-quote" style="--i:${i}">
      <div class="val-quote-mark">"</div>
      <div class="val-quote-text">${escapeHtml(q.text || q.quote || '')}</div>
      <div class="val-quote-author">— ${escapeHtml(q.author || q.name || '')}${q.role ? `, <em>${escapeHtml(q.role)}</em>` : ''}</div>
    </blockquote>`).join('')}
  </div>`)
}

/* ─── COMPETITION (s10) — 4 variants ───────────────────────────────────
   matrix             — capability table (existing default)
   positioning-grid   — 2x2 quadrant with named axes, you as a dot
   comparison-radar   — SVG radar chart, 5-6 axes, you vs avg competitor
   anti-positioning   — "we are X / we are NOT Y" statement card */
function pickCompetitionVariant(c: any, _world: any): 'matrix' | 'positioning-grid' | 'comparison-radar' | 'anti-positioning' {
  if (c.matrix && Array.isArray(c.matrix.rows) && c.matrix.rows.length) return 'matrix'
  if (c.quadrant && c.quadrant.xAxis && c.quadrant.yAxis) return 'positioning-grid'
  if (c.radar && Array.isArray(c.radar.axes) && c.radar.axes.length >= 3) return 'comparison-radar'
  if (c.antiPositioning && Array.isArray(c.antiPositioning) && c.antiPositioning.length) return 'anti-positioning'
  return 'matrix'
}

function buildCompetitionSlideVariants(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string, world?: any): string {
  const variant = pickCompetitionVariant(c, world)
  const num = String(idx).padStart(2, '0')
  const head = `<span class="slide-num-bg">${num}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'competition')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}`
  const wrap = (body: string) => `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${num}" data-label="${label}" data-tx="${tx}" data-variant="${variant}">${head}${body}</div></section>`

  if (variant === 'matrix') {
    return buildCompetitionSlide(htmlId, idx, label, tx, bgx, bgy, c, motifStyle) || wrap('<div class="ink-muted">No competition data</div>')
  }

  if (variant === 'positioning-grid') {
    const q = c.quadrant
    const points = Array.isArray(q.points) ? q.points : []  // [{label, x, y}] where x/y are 0-100
    return wrap(`<div class="comp-quad tx-group">
      <div class="comp-quad-axes">
        <div class="comp-quad-x-label">${escapeHtml(q.xAxis)}</div>
        <div class="comp-quad-y-label">${escapeHtml(q.yAxis)}</div>
        ${points.map((p: any, i: number) => `<div class="comp-quad-dot${p.isUs ? ' is-us' : ''}" style="left:${Math.max(0, Math.min(100, p.x))}%;top:${Math.max(0, Math.min(100, 100 - p.y))}%;--i:${i}">
          <span class="comp-quad-dot-label">${escapeHtml(p.label)}</span>
        </div>`).join('')}
      </div>
    </div>`)
  }

  if (variant === 'comparison-radar') {
    const axes = c.radar.axes  // [{label, you: 0-100, them: 0-100}]
    const n = axes.length
    const cx = 200, cy = 200, r = 160
    const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
    const point = (val: number, i: number) => {
      const a = angle(i); const rr = (val / 100) * r
      return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`
    }
    const youPts  = axes.map((a: any, i: number) => point(a.you  || 0, i)).join(' ')
    const themPts = axes.map((a: any, i: number) => point(a.them || 0, i)).join(' ')
    const gridRings = [0.25, 0.5, 0.75, 1].map(r2 => `<polygon points="${axes.map((_: any, i: number) => point(r2 * 100, i)).join(' ')}" fill="none" stroke="var(--wire)" stroke-width="1"/>`).join('')
    const spokes = axes.map((_: any, i: number) => {
      const a = angle(i)
      return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}" stroke="var(--wire)" stroke-width="1"/>`
    }).join('')
    const labels = axes.map((ax: any, i: number) => {
      const a = angle(i)
      const x = cx + Math.cos(a) * (r + 24)
      const y = cy + Math.sin(a) * (r + 24)
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="var(--snow)" font-family="var(--fm)" font-size="11" text-anchor="middle" dominant-baseline="middle" opacity="0.6">${escapeHtml(ax.label)}</text>`
    }).join('')
    return wrap(`<div class="comp-radar tx-group">
      <svg viewBox="0 0 400 400" class="comp-radar-svg">
        ${gridRings}${spokes}
        <polygon points="${themPts}" fill="var(--wire)" fill-opacity="0.4" stroke="var(--mist)" stroke-width="1.5" stroke-dasharray="4 3"/>
        <polygon points="${youPts}" fill="var(--accent)" fill-opacity="0.28" stroke="var(--accent)" stroke-width="2.5"/>
        ${labels}
      </svg>
      <div class="comp-radar-legend">
        <div class="comp-radar-key" style="--c:var(--accent)"><span></span>${escapeHtml(c.radar.youLabel || 'Us')}</div>
        <div class="comp-radar-key" style="--c:var(--mist)"><span></span>${escapeHtml(c.radar.themLabel || 'Average competitor')}</div>
      </div>
    </div>`)
  }

  // ANTI-POSITIONING — "We are X / We are NOT Y"
  const pairs = c.antiPositioning  // [{are, areNot}]
  return wrap(`<div class="comp-anti tx-group">
    ${pairs.map((p: any, i: number) => `<div class="comp-anti-row stagger" style="--i:${i}">
      <div class="comp-anti-are"><span class="comp-anti-lbl">we are</span><span class="comp-anti-val">${escapeHtml(p.are)}</span></div>
      <div class="comp-anti-not"><span class="comp-anti-lbl">we are NOT</span><span class="comp-anti-val muted">${escapeHtml(p.areNot)}</span></div>
    </div>`).join('')}
  </div>`)
}

/* ─── CUSTOMERS (s9) — 4 variants ──────────────────────────────────────
   archetype-cards   — 3 named personas with title + use case
   persona-quotes    — 2-3 customer quotes
   timeline-vertical — customer journey first hour → first year
   icon-grid         — many small segments in grid */
function pickCustomersVariant(c: any, _world: any): 'archetype-cards' | 'persona-quotes' | 'timeline-vertical' | 'icon-grid' {
  if (Array.isArray(c.quotes) && c.quotes.length) return 'persona-quotes'
  if (Array.isArray(c.journey) && c.journey.length >= 3) return 'timeline-vertical'
  if (Array.isArray(c.segments) && c.segments.length >= 5) return 'icon-grid'
  return 'archetype-cards'
}

function buildCustomersSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string, world?: any): string {
  const variant = pickCustomersVariant(c, world)
  const num = String(idx).padStart(2, '0')
  const head = `<span class="slide-num-bg">${num}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'customers')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}`
  const wrap = (body: string) => `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${num}" data-label="${label}" data-tx="${tx}" data-variant="${variant}">${head}${body}</div></section>`

  if (variant === 'archetype-cards') {
    const bullets = Array.isArray(c.bullets) ? c.bullets.slice(0, 3) : []
    return wrap(`<div class="cust-arch stagger tx-group">
      ${bullets.map((b: any, i: number) => {
        const txt = typeof b === 'string' ? b : (b.text || b.label || '')
        const [name, ...rest] = String(txt).split(/[-—–]/)
        const desc = rest.join('—').trim()
        return `<div class="cust-arch-card" style="--i:${i}">
          <div class="cust-arch-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="cust-arch-name">${escapeHtml(name.trim())}</div>
          ${desc ? `<div class="cust-arch-desc">${escapeHtml(desc)}</div>` : ''}
        </div>`
      }).join('')}
    </div>`)
  }

  if (variant === 'persona-quotes') {
    const quotes = (c.quotes as any[]).slice(0, 3)
    return wrap(`<div class="cust-quotes stagger tx-group">
      ${quotes.map((q: any, i: number) => `<div class="cust-quote-card" style="--i:${i}">
        <div class="cust-quote-avatar">${escapeHtml((q.name || '·').slice(0, 1).toUpperCase())}</div>
        <div class="cust-quote-body">
          <div class="cust-quote-text">"${escapeHtml(q.text || q.quote || '')}"</div>
          <div class="cust-quote-name">${escapeHtml(q.name || '')}<span class="cust-quote-role">${q.role ? ` · ${escapeHtml(q.role)}` : ''}</span></div>
        </div>
      </div>`).join('')}
    </div>`)
  }

  if (variant === 'timeline-vertical') {
    const journey = (c.journey as any[]).slice(0, 5)
    return wrap(`<div class="cust-timeline tx-group">
      ${journey.map((step: any, i: number) => `<div class="cust-timeline-step stagger" style="--i:${i}">
        <div class="cust-timeline-marker"></div>
        <div class="cust-timeline-when">${escapeHtml(step.when || '')}</div>
        <div class="cust-timeline-what">${escapeHtml(step.what || step.label || '')}</div>
        ${step.detail ? `<div class="cust-timeline-detail">${escapeHtml(step.detail)}</div>` : ''}
      </div>`).join('')}
    </div>`)
  }

  // ICON-GRID — many small segment chips
  const segments = (c.segments as any[]).slice(0, 12)
  return wrap(`<div class="cust-icons stagger tx-group">
    ${segments.map((s: any, i: number) => {
      const name = typeof s === 'string' ? s : (s.name || s.label || '')
      const icon = typeof s === 'object' ? (s.icon || name.slice(0, 1)) : name.slice(0, 1)
      return `<div class="cust-icon-tile" style="--i:${i}">
        <div class="cust-icon-glyph">${escapeHtml(icon).toUpperCase()}</div>
        <div class="cust-icon-name">${escapeHtml(name)}</div>
      </div>`
    }).join('')}
  </div>`)
}

/* ─── TEAM & ASK (s12) — 4 variants ────────────────────────────────────
   split-cta       — use-of-funds panel + giant accent CTA (current default)
   team-grid       — founder grid with photos + roles + credentials
   cap-table       — round size + lead + valuation + allocation chart
   milestone-road  — horizontal timeline of milestones this round funds */
function pickTeamAskVariant(c: any, _world: any): 'split-cta' | 'team-grid' | 'cap-table' | 'milestone-road' {
  if (Array.isArray(c.team) && c.team.length >= 2) return 'team-grid'
  if (c.capTable && (c.capTable.round || c.capTable.valuation)) return 'cap-table'
  if (Array.isArray(c.milestones) && c.milestones.length >= 3) return 'milestone-road'
  return 'split-cta'
}

function buildTeamAskSlide(htmlId: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any, motifStyle: string, world?: any): string {
  const variant = pickTeamAskVariant(c, world)
  const num = String(idx).padStart(2, '0')
  const head = `<span class="slide-num-bg">${num}</span>
  <div class="slide-grid" style="${motifStyle}"></div><div class="slide-bg" style="--bgx:${bgx};--bgy:${bgy};"></div>
  <div class="slide-inner">
    <div class="slide-tag">${escapeHtml(c.tag || 'team & ask')}</div>
    <h2 class="slide-title"><span class="reveal-wipe">${escapeHtml(c.headline || '')}</span></h2>
    ${c.sub ? `<div class="slide-sub reveal-up d1">${escapeHtml(c.sub)}</div>` : ''}
    ${c.lede ? `<p class="slide-lede reveal-up d2">${escapeHtml(c.lede)}</p>` : ''}`
  const wrap = (body: string) => `<section class="slide" id="${htmlId}" data-idx="${idx}" data-num="${num}" data-label="${label}" data-tx="${tx}" data-variant="${variant}">${head}${body}</div></section>`

  if (variant === 'split-cta') {
    const ask = (Array.isArray(c.stats) && c.stats[0]) || { value: '—', label: '' }
    const milestone = (Array.isArray(c.stats) && c.stats[1]) || { value: '—', label: '' }
    const bullets = Array.isArray(c.bullets) ? c.bullets : []
    return wrap(`<div class="ask-split tx-group">
      <div class="ask-panel-funds">
        <div class="ask-panel-title">Use of funds</div>
        <ul class="ask-panel-list">
          ${bullets.slice(0, 5).map((b: any, i: number) => `<li style="--i:${i}">${escapeHtml(typeof b === 'string' ? b : (b.text || ''))}</li>`).join('')}
        </ul>
      </div>
      <div class="ask-panel-cta">
        <div class="ask-cta-num">${escapeHtml(ask.value)}</div>
        <div class="ask-cta-lbl">${escapeHtml(ask.label)}</div>
        <div class="ask-cta-milestone">${escapeHtml(milestone.value)} ${escapeHtml(milestone.label)}</div>
      </div>
    </div>`)
  }

  if (variant === 'team-grid') {
    const team = (c.team as any[]).slice(0, 6)
    return wrap(`<div class="team-grid stagger tx-group">
      ${team.map((m: any, i: number) => `<div class="team-card" style="--i:${i}">
        ${m.photo ? `<img src="${escapeAttr(m.photo)}" alt="${escapeAttr(m.name)}" class="team-photo"/>` : `<div class="team-photo team-photo-mono">${escapeHtml((m.name || '·').split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase())}</div>`}
        <div class="team-name">${escapeHtml(m.name)}</div>
        <div class="team-role">${escapeHtml(m.role || '')}</div>
        ${m.cred ? `<div class="team-cred">${escapeHtml(m.cred)}</div>` : ''}
      </div>`).join('')}
    </div>`)
  }

  if (variant === 'cap-table') {
    const cap = c.capTable
    const allocPct = Number(cap.leadCommittedPct ?? cap.committedPct ?? 0)
    return wrap(`<div class="cap-grid tx-group">
      <div class="cap-tile stagger" style="--i:0">
        <div class="cap-lbl">Round size</div>
        <div class="cap-val">${escapeHtml(cap.round || '—')}</div>
      </div>
      <div class="cap-tile stagger" style="--i:1">
        <div class="cap-lbl">Valuation</div>
        <div class="cap-val">${escapeHtml(cap.valuation || '—')}</div>
      </div>
      <div class="cap-tile stagger" style="--i:2">
        <div class="cap-lbl">Lead investor</div>
        <div class="cap-val cap-val-sm">${escapeHtml(cap.leadInvestor || '—')}</div>
      </div>
      <div class="cap-tile stagger cap-progress" style="--i:3">
        <div class="cap-lbl">Committed</div>
        <div class="cap-val">${allocPct}%</div>
        <div class="cap-bar"><div class="cap-bar-fill" style="width:${Math.min(100, Math.max(0, allocPct))}%"></div></div>
      </div>
    </div>`)
  }

  // MILESTONE-ROAD — horizontal funding milestones timeline
  const stones = (c.milestones as any[]).slice(0, 5)
  return wrap(`<div class="ms-road tx-group">
    <div class="ms-road-line"></div>
    ${stones.map((m: any, i: number) => `<div class="ms-stop stagger" style="--i:${i}">
      <div class="ms-dot${m.isCurrent ? ' ms-dot-current' : ''}"></div>
      <div class="ms-when">${escapeHtml(m.when || '')}</div>
      <div class="ms-what">${escapeHtml(m.what || m.label || '')}</div>
      ${m.detail ? `<div class="ms-detail">${escapeHtml(m.detail)}</div>` : ''}
    </div>`).join('')}
  </div>`)
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
    /** Unique deck id baked into the HTML for viewership tracking.
     *  When set, the rendered deck POSTs viewership beacons to
     *  /api/track keyed by this id. */
    deckId?:        string
    /** Override beacon URL. Defaults to the production SignalDeck app. */
    trackUrl?:      string
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
      slideHtmlList.push(buildIntroSlide(idx, input, content.s1_intro || {}, world))
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
    if (id === 's2_situation')         html = buildSituationSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    else if (id === 's3_problem')      html = buildProblemSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    else if (id === 's5_fix')          html = buildFixSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    else if (id === 's6_how')          html = buildHowSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    else if (id === 's7_validation')   html = buildValidationSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg, world)
    else if (id === 's8_market')       html = buildMarketSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg)
    else if (id === 's9_customers')    html = buildCustomersSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg, world)
    else if (id === 's10_competition') html = buildCompetitionSlideVariants(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg, world)
    else if (id === 's12_team_ask')    html = buildTeamAskSlide(def.htmlId, idx, def.label, tx, bgx, bgy, c, motifBg, world)
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
    deckId:      opts?.deckId,
    trackUrl:    opts?.trackUrl,
  })
}
