export interface TemplateVars {
  company: string
  oneLiner: string
  domain: string
  accentColor: string
  bgColor: string
  /** Card / surface colour from BrandWorld. Optional; falls back to a
   *  light/dark-mode-derived tint if omitted. */
  surfaceColor?: string
  /** Body text colour from BrandWorld. Wins over the dark/light fg default. */
  textColor?: string
  fontHeading: string
  fontBody: string
  fontData?: string          // mono / numeric stack (default: JetBrains Mono)
  isDark: boolean
  totalSlides: number
  slidesHtml: string
  dotNav: string
}

export function deckTemplate(v: TemplateVars): string {
  const fg = v.textColor || (v.isDark ? '#eef2f7' : '#0f1d2e')
  const wire = v.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,29,46,0.06)'
  const mist = v.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,29,46,0.03)'
  const surface = v.surfaceColor || (v.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,29,46,0.04)')
  const fontMono = v.fontData || 'JetBrains Mono'
  const fonts = [v.fontHeading, v.fontBody, fontMono]
    .filter(Boolean)
    .filter((f, i, a) => a.indexOf(f) === i)
    .map(f => f.replace(/ /g, '+') + ':ital,wght@0,400;0,700;0,900')
    .join('&family=')
  const total2 = String(v.totalSlides).padStart(2, '0')

  const css = [
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}',
    'html,body{height:100%;overflow:hidden}',
    ':root{',
    '  --bg:' + v.bgColor + ';',
    '  --accent:' + v.accentColor + ';',
    '  --fg:' + fg + ';',
    '  --wire:' + wire + ';',
    '  --mist:' + mist + ';',
    '  --snow:' + fg + ';',
    '  --surface:' + surface + ';',
    "  --fh:'" + v.fontHeading + "',system-ui,sans-serif;",
    "  --fb:'" + v.fontBody + "',system-ui,sans-serif;",
    "  --fm:'" + fontMono + "',monospace;",
    '}',
    'body{background:var(--bg);color:var(--fg);font-family:var(--fb)}',
    '#deck{height:100vh;overflow-y:scroll;scroll-snap-type:y mandatory;scroll-behavior:smooth;-ms-overflow-style:none;scrollbar-width:none}',
    '#deck::-webkit-scrollbar{display:none}',
    '.slide{position:relative;height:100vh;scroll-snap-align:start;overflow:hidden;display:flex;align-items:center;perspective:1200px}',
    '.slide-bg{position:absolute;inset:0;background:radial-gradient(ellipse at var(--bgx,50%) var(--bgy,50%),color-mix(in srgb,var(--accent) 14%,transparent),transparent 68%)}',
    '.slide-grid{position:absolute;inset:0;background-image:linear-gradient(var(--wire) 1px,transparent 1px),linear-gradient(90deg,var(--wire) 1px,transparent 1px);background-size:64px 64px;pointer-events:none}',
    '.slide-num-bg{position:absolute;right:-.05em;bottom:-.1em;font-family:var(--fh);font-size:clamp(140px,30vw,400px);font-weight:900;color:var(--mist);line-height:1;pointer-events:none;user-select:none;letter-spacing:-.04em;z-index:1}',
    '.slide-inner{position:relative;z-index:2;padding:clamp(36px,7vw,100px);max-width:1200px;width:100%;margin:0 auto;transform-origin:center center;will-change:transform,opacity}',
    '.slide-tag{font-family:var(--fm);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--accent);margin-bottom:18px;opacity:0;transform:translateY(10px);transition:opacity .4s ease .1s,transform .4s ease .1s}',
    '.in-view .slide-tag{opacity:1;transform:translateY(0)}',
    '.slide-title{font-family:var(--fh);font-size:clamp(32px,6.5vw,88px);font-weight:900;line-height:.94;letter-spacing:-.02em;text-transform:uppercase;margin-bottom:22px;overflow:hidden}',
    '.slide-sub{font-size:clamp(14px,1.7vw,21px);font-weight:500;opacity:.65;margin-bottom:18px;max-width:620px;line-height:1.4}',
    '.slide-lede{font-size:clamp(14px,1.5vw,19px);line-height:1.7;max-width:580px;opacity:.72}',
    '.stat-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:28px}',
    '.stat-card{background:var(--surface);border:1px solid var(--wire);border-radius:14px;padding:18px 24px;min-width:130px;opacity:0;transform:translateY(18px);transition:opacity .4s ease calc(var(--i,0) * .1s + .3s),transform .4s ease calc(var(--i,0) * .1s + .3s)}',
    '.in-view .stat-card{opacity:1;transform:translateY(0)}',
    '.stat-val{font-family:var(--fh);font-size:clamp(26px,3.8vw,48px);font-weight:900;color:var(--accent);line-height:1;margin-bottom:5px}',
    '.stat-lbl{font-family:var(--fm);font-size:10px;letter-spacing:2px;text-transform:uppercase;opacity:.45}',
    '.bullet-list{list-style:none;margin-top:24px;display:flex;flex-direction:column;gap:12px;max-width:620px}',
    '.bullet-list li{font-size:clamp(13px,1.4vw,17px);line-height:1.55;padding-left:24px;position:relative;opacity:0;transform:translateX(-14px);transition:opacity .4s ease calc(var(--i,0) * .1s + .4s),transform .4s ease calc(var(--i,0) * .1s + .4s)}',
    '.in-view .bullet-list li{opacity:1;transform:translateX(0)}',
    ".bullet-list li::before{content:'';position:absolute;left:0;top:.6em;width:10px;height:2px;background:var(--accent)}",
    '.reveal-wipe{display:inline-block;clip-path:inset(0 100% 0 0);transition:clip-path .8s cubic-bezier(.16,1,.3,1) .15s}',
    '.in-view .reveal-wipe{clip-path:inset(0 0% 0 0)}',
    '.reveal-up{opacity:0;transform:translateY(22px);transition:opacity .55s ease,transform .55s ease}',
    '.in-view .reveal-up{opacity:1;transform:translateY(0)}',
    '.d1{transition-delay:.15s!important}.d2{transition-delay:.3s!important}.d3{transition-delay:.45s!important}.d4{transition-delay:.6s!important}',
    '.slide[data-tx="zoom-passage"] .slide-inner{transform:scale(.45);opacity:0;transition:transform 1s cubic-bezier(.16,1,.3,1),opacity .6s ease}',
    '.slide[data-tx="zoom-passage"].in-view .slide-inner{transform:scale(1);opacity:1}',
    '.slide[data-tx="zoom-passage"].out-above .slide-inner{transform:scale(1.7);opacity:0}',
    '.slide[data-tx="explode"] .slide-inner{transform:scale(1.35);opacity:0;transition:transform .75s cubic-bezier(.34,1.56,.64,1),opacity .45s ease}',
    '.slide[data-tx="explode"].in-view .slide-inner{transform:scale(1);opacity:1}',
    '.slide[data-tx="fold"] .slide-inner{transform:perspective(800px) rotateX(-38deg) translateY(50px);opacity:0;transition:transform .9s cubic-bezier(.16,1,.3,1),opacity .6s ease}',
    '.slide[data-tx="fold"].in-view .slide-inner{transform:perspective(800px) rotateX(0) translateY(0);opacity:1}',
    '.slide[data-tx="warp"] .slide-inner{transform:skewX(-10deg) translateX(-70px) scale(.97);opacity:0;transition:transform .75s cubic-bezier(.16,1,.3,1),opacity .5s ease}',
    '.slide[data-tx="warp"].in-view .slide-inner{transform:skewX(0) translateX(0) scale(1);opacity:1}',
    '@keyframes glitch-in{0%{clip-path:inset(45% 0 48% 0);transform:translate(-10px,0);opacity:0}12%{clip-path:inset(8% 0 82% 0);transform:translate(10px,0)}25%{clip-path:inset(72% 0 8% 0);transform:translate(-5px,0)}38%{clip-path:inset(28% 0 42% 0);transform:translate(5px,0);opacity:.5}55%{clip-path:inset(0 0 0 0);transform:translate(0,0);opacity:.8}100%{clip-path:inset(0 0 0 0);transform:translate(0,0);opacity:1}}',
    '.slide[data-tx="glitch"] .slide-inner{opacity:0}',
    '.slide[data-tx="glitch"].in-view .slide-inner{animation:glitch-in .65s ease forwards}',
    '.slide[data-tx="glitch"].out-above .slide-inner,.slide[data-tx="glitch"].out-below .slide-inner{opacity:0;animation:none}',
    '.slide[data-tx="dropzoom"] .slide-inner{transform:scale(1.18) translateY(-65px);opacity:0;transition:transform .9s cubic-bezier(.34,1.56,.64,1),opacity .5s ease}',
    '.slide[data-tx="dropzoom"].in-view .slide-inner{transform:scale(1) translateY(0);opacity:1}',
    '.slide[data-tx="prism"] .slide-inner{transform:perspective(1000px) rotateY(22deg) scale(.88);opacity:0;transition:transform 1s cubic-bezier(.16,1,.3,1),opacity .7s ease}',
    '.slide[data-tx="prism"].in-view .slide-inner{transform:perspective(1000px) rotateY(0) scale(1);opacity:1}',
    '.hero-tag{font-family:var(--fm);font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--accent);margin-bottom:22px}',
    '.hero-title{font-family:var(--fb);font-weight:400;opacity:.58;margin-bottom:36px;max-width:600px}',
    '.hero-divider{width:44px;height:2px;background:var(--accent);margin-bottom:28px;opacity:0;transform:scaleX(0);transform-origin:left;transition:opacity .5s ease .4s,transform .5s ease .4s}',
    '.in-view .hero-divider{opacity:1;transform:scaleX(1)}',
    '.hero-signature{display:flex;align-items:center;gap:10px;font-size:14px;margin-bottom:7px}',
    '.h-name{font-weight:600}.h-dot{width:4px;height:4px;border-radius:50%;background:var(--accent)}.h-role{opacity:.48}',
    '.hero-company{font-family:var(--fm);font-size:11px;letter-spacing:2px;opacity:.35}',
    '.scroll-cue{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);font-family:var(--fm);font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:.28;animation:pulse-cue 2.2s ease-in-out infinite}',
    '@keyframes pulse-cue{0%,100%{opacity:.28;transform:translateX(-50%) translateY(0)}50%{opacity:.55;transform:translateX(-50%) translateY(-4px)}}',
    '.demo-embed-wrap{width:100%;max-width:820px;aspect-ratio:16/9;border-radius:14px;overflow:hidden;border:1px solid var(--wire);margin-top:28px;opacity:0;transform:translateY(20px);transition:opacity .6s ease .3s,transform .6s ease .3s}',
    '.in-view .demo-embed-wrap{opacity:1;transform:translateY(0)}',
    '.demo-iframe{width:100%;height:100%;border:none}',
    '.demo-placeholder{width:100%;max-width:580px;margin-top:28px}',
    '.demo-ph-inner{background:var(--mist);border:1px dashed var(--wire);border-radius:14px;padding:56px 36px;text-align:center}',
    '.demo-ph-icon{font-size:44px;color:var(--accent);opacity:.38;margin-bottom:14px}',
    '.demo-ph-inner p{opacity:.5;font-size:14px;margin-bottom:20px}',
    '.demo-ph-link{display:inline-block;padding:11px 22px;background:var(--accent);color:var(--bg);text-decoration:none;border-radius:8px;font-weight:700;font-size:13px}',
    '#hud{position:fixed;inset:0;pointer-events:none;z-index:1000}',
    '#progress-bar{position:absolute;top:0;left:0;height:2px;background:var(--accent);transition:width .4s ease;width:0}',
    '#hud-top{position:absolute;top:24px;left:28px;right:28px;display:flex;align-items:center;justify-content:space-between}',
    '#hud-company,#hud-counter{font-family:var(--fm);font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:.28}',
    '#dot-nav{position:absolute;right:20px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:7px;pointer-events:all}',
    '#dot-nav button{width:5px;height:5px;border-radius:50%;border:1px solid var(--fg);background:transparent;cursor:pointer;opacity:.18;transition:opacity .25s,background .25s,transform .25s;padding:0}',
    '#dot-nav button.active{background:var(--accent);border-color:var(--accent);opacity:1;transform:scale(1.5)}',
    '#dot-nav button:hover{opacity:.5}',
    '#hud-label{position:absolute;bottom:24px;left:28px;font-family:var(--fm);font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:.22}',
  ].join('\n')

  const js = [
    '(function(){',
    "  var deck=document.getElementById('deck');",
    "  var slides=Array.from(document.querySelectorAll('.slide'));",
    "  var dots=Array.from(document.querySelectorAll('#dot-nav button'));",
    "  var counter=document.getElementById('hud-counter');",
    "  var bar=document.getElementById('progress-bar');",
    "  var lbl=document.getElementById('hud-label');",
    '  var total=slides.length;',
    '  var current=0;',
    "  function goTo(idx){if(idx<0||idx>=total)return;slides[idx].scrollIntoView({behavior:'smooth'});}",
    '  var obs=new IntersectionObserver(function(entries){',
    '    entries.forEach(function(entry){',
    '      var sl=entry.target;',
    "      var idx=parseInt(sl.dataset.idx||'0',10);",
    '      if(entry.isIntersecting){',
    "        sl.classList.add('in-view');",
    "        sl.classList.remove('out-above','out-below');",
    '        current=idx;',
    "        dots.forEach(function(d,i){d.classList.toggle('active',i===idx);});",
    "        if(counter)counter.textContent=('0'+(idx+1)).slice(-2)+' / '+('0'+total).slice(-2);",
    "        if(bar)bar.style.width=((idx+1)/total*100)+'%';",
    "        if(lbl)lbl.textContent=sl.dataset.label||'';",
    '      }else{',
    "        sl.classList.remove('in-view');",
    '        var rect=entry.boundingClientRect;',
    "        if(rect.top<0){sl.classList.add('out-above');sl.classList.remove('out-below');}",
    "        else{sl.classList.add('out-below');sl.classList.remove('out-above');}",
    '      }',
    '    });',
    '  },{threshold:0.5,root:deck});',
    '  slides.forEach(function(s){obs.observe(s);});',
    "  dots.forEach(function(d,i){d.addEventListener('click',function(){goTo(i);});});",
    "  document.addEventListener('keydown',function(e){",
    "    if(e.key==='ArrowDown'||e.key==='PageDown'){e.preventDefault();goTo(current+1);}",
    "    if(e.key==='ArrowUp'||e.key==='PageUp'){e.preventDefault();goTo(current-1);}",
    "    if(e.key==='Home'){e.preventDefault();goTo(0);}",
    "    if(e.key==='End'){e.preventDefault();goTo(total-1);}",
    '  });',
    '  var tsy=0;',
    "  deck.addEventListener('touchstart',function(e){tsy=e.touches[0].clientY;},{passive:true});",
    "  deck.addEventListener('touchend',function(e){var dy=tsy-e.changedTouches[0].clientY;if(Math.abs(dy)>50)goTo(dy>0?current+1:current-1);});",
    '  goTo(0);',
    '})();',
  ].join('\n')

  return '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="UTF-8"/>\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>\n' +
    '<title>' + v.company + '</title>\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=' + fonts + '&display=swap" rel="stylesheet"/>\n' +
    '<style>\n' + css + '\n</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="hud">\n' +
    '  <div id="progress-bar"></div>\n' +
    '  <div id="hud-top">\n' +
    '    <span id="hud-company">' + v.company + '</span>\n' +
    '    <span id="hud-counter">01 / ' + total2 + '</span>\n' +
    '  </div>\n' +
    '  <nav id="dot-nav">' + v.dotNav + '</nav>\n' +
    '  <div id="hud-label"></div>\n' +
    '</div>\n' +
    '<div id="deck">' + v.slidesHtml + '</div>\n' +
    '<script>\n' + js + '\n</script>\n' +
    '</body>\n' +
    '</html>'
}
