import { deckTemplate } from '../templates/deckTemplate'

function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${a})`
}
function darken(hex: string, n: number) {
  const r = Math.max(0,parseInt(hex.slice(1,3),16)-n), g = Math.max(0,parseInt(hex.slice(3,5),16)-n), b = Math.max(0,parseInt(hex.slice(5,7),16)-n)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}
function stats(items: any[] = []) {
  if (!items.length) return ''
  return `<div class="stat-row reveal-stagger">${items.map((s,i)=>`<div class="stat-card" style="--i:${i}"><div class="stat-val">${s.value}</div><div class="stat-lbl">${s.label}</div></div>`).join('')}</div>`
}
function bullets(items: string[] = []) {
  if (!items.length) return ''
  return `<ul class="bullet-list reveal-stagger">${items.map((b,i)=>`<li style="--i:${i}">${b}</li>`).join('')}</ul>`
}
function slide(id: string, idx: number, label: string, tx: string, bgx: string, bgy: string, c: any) {
  return `<section class="slide" id="${id}" data-idx="${idx}" data-num="${String(idx).padStart(2,'0')}" data-label="${label}" data-tx="${tx}">
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

export function renderDeck(input: any, content: any): string {
  const labels = ['Intro','Situation','Problem','Implication','Fix','How It Works','Validation','Market','Customers','Competition','Risks','Team & Ask','Demo']
  const introSlide = `<section class="slide" id="s1" data-idx="0" data-num="00" data-label="Intro" data-tx="zoom-passage">
  <span class="slide-num-bg">00</span>
  <div class="slide-grid"></div><div class="slide-bg" style="--bgx:20%;--bgy:30%;"></div>
  <div class="slide-inner">
    <div class="hero-tag reveal-up">${content.s1_intro?.tag||''}</div>
    <div class="reveal-wipe" style="font-family:var(--font-heading);font-weight:900;font-size:clamp(80px,16vw,220px);line-height:0.88;letter-spacing:-4px;text-transform:uppercase;margin-bottom:12px;">${input.company}</div>
    <h1 class="hero-title reveal-wipe d1">${content.s1_intro?.sub||input.oneLiner}</h1>
    <div class="hero-divider"></div>
    <div class="hero-signature reveal-up d3"><span class="h-name">${input.founderName}</span><span class="h-dot"></span><span class="h-role">${input.founderRole}</span></div>
    <div class="hero-company reveal-up d4">${input.location} · ${input.domain}</div>
    <div class="scroll-cue">Use ↑ / ↓ arrow keys</div>
  </div>
</section>`

  const demoSlide = `<section class="slide" id="s13" data-idx="12" data-num="12" data-label="Demo" data-tx="fold">
  <span class="slide-num-bg">12</span>
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

  const slides = [
    introSlide,
    slide('s2',1,'Situation','explode','60%','40%',content.s2_situation||{}),
    slide('s3',2,'Problem','explode','70%','30%',content.s3_problem||{}),
    slide('s4',3,'Implication','fold','40%','60%',content.s4_implication||{}),
    slide('s5',4,'Fix','fold','50%','50%',content.s5_fix||{}),
    slide('s6',5,'How It Works','warp','30%','40%',content.s6_how||{}),
    slide('s7',6,'Validation','glitch','55%','35%',content.s7_validation||{}),
    slide('s8',7,'Market','glitch','45%','55%',content.s8_market||{}),
    slide('s9',8,'Customers','explode','65%','45%',content.s9_customers||{}),
    slide('s10',9,'Competition','dropzoom','35%','65%',content.s10_competition||{}),
    slide('s11',10,'Risks','fold','50%','40%',content.s11_risks||{}),
    slide('s12',11,'Team & Ask','prism','45%','50%',content.s12_team_ask||{}),
    demoSlide,
  ]

  return deckTemplate({
    company: input.company,
    oneLiner: input.oneLiner,
    domain: input.domain,
    accentColor: input.accentColor||'#00e5c3',
    bgColor: input.bgColor||'#06080d',
    fontHeading: input.fontHeading||'Barlow Condensed',
    fontBody: input.fontBody||'DM Sans',
    isDark: input.isDark!==false,
    totalSlides: slides.length,
    slidesHtml: slides.join('\n'),
    dotNav: labels.map((l,i)=>`<button data-idx="${i}" data-label="${l}" aria-label="${l}"></button>`).join('\n'),
  })
}
