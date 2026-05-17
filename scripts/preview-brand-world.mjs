#!/usr/bin/env node
/* Render a BrandWorld JSON response into a single-file HTML preview.
   Usage:  node scripts/preview-brand-world.mjs <input.json> <out.html>
*/
import fs from 'fs'

const [, , inputPath, outPath] = process.argv
if (!inputPath || !outPath) {
  console.error('usage: preview-brand-world.mjs <input.json> <out.html>')
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const w = data.brandWorld
if (!w) { console.error('no brandWorld in input'); process.exit(1) }
const c = w.colour
const t = w.typography
const fontsHref = 'https://fonts.googleapis.com/css2?family=' +
  t.heading.replace(/\s+/g, '+') + ':wght@400;700;900&family=' +
  t.body.replace(/\s+/g, '+')    + ':wght@400;500;700&display=swap'

const motifChips = w.motifs.map(m => `<div class="motif-chip">— ${m}</div>`).join('')
const avoidList  = w.avoid.map(a => `<li>${a}</li>`).join('')

const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"/>
<title>${w.industry} — BrandWorld preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="${fontsHref}" rel="stylesheet"/>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:${c.background};
    --surface:${c.surface};
    --surface-soft:${c.surfaceSoft};
    --primary:${c.primary};
    --secondary:${c.secondary};
    --accent:${c.accent};
    --text:${c.text};
    --muted:${c.textMuted};
    --border:${c.border};
    --radius:${w.radius}px;
    --fh:'${t.heading}',serif;
    --fb:'${t.body}',system-ui,sans-serif;
  }
  body{background:var(--bg);color:var(--text);font-family:var(--fb);min-height:100vh;padding:48px 40px 80px;background-image:radial-gradient(ellipse 90% 60% at 20% 0%, rgba(167,139,250,0.18), transparent 60%),radial-gradient(ellipse 80% 50% at 80% 10%, rgba(125,211,252,0.16), transparent 55%),radial-gradient(ellipse 70% 50% at 50% 100%, rgba(251,207,232,0.20), transparent 60%);background-attachment:fixed;}
  .wrap{max-width:1280px;margin:0 auto}
  .lead{padding-bottom:32px;border-bottom:1px solid var(--border)}
  .label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
  h1{font-family:var(--fh);font-weight:${t.headingWeight};font-size:84px;line-height:1.02;letter-spacing:${t.tracking};color:var(--text);margin-bottom:16px}
  h1 em{font-style:normal;background:linear-gradient(90deg,#7C3AED 0%,#EC4899 40%,#F97316 75%,#FB7185 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  .sub{font-size:18px;line-height:1.5;color:var(--muted);max-width:640px}
  .section{margin-top:48px}
  .section h2{font-family:var(--fh);font-weight:700;font-size:24px;margin-bottom:16px;color:var(--text)}
  .palette{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
  .sw{border-radius:12px;overflow:hidden;border:1px solid var(--border)}
  .sw-block{height:80px}
  .sw-lbl{padding:8px 10px;background:var(--surface);font-size:11px}
  .sw-lbl b{display:block;font-weight:600;margin-bottom:2px;color:var(--text)}
  .sw-lbl span{font-family:'JetBrains Mono',monospace;color:var(--muted)}
  .row{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;align-items:start}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;box-shadow:0 4px 24px rgba(0,0,0,0.05)}
  .invite-card{position:relative;overflow:hidden}
  .invite-hero{height:160px;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:calc(var(--radius) - 4px);margin-bottom:20px;display:flex;align-items:flex-end;padding:20px;color:white}
  .date-badge{background:white;border-radius:8px;padding:6px 10px;text-align:center;color:var(--text);min-width:48px}
  .date-badge b{font-family:var(--fh);font-weight:700;display:block;font-size:22px;line-height:1}
  .date-badge span{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
  .invite-card h3{font-family:var(--fh);font-weight:700;font-size:22px;line-height:1.2;margin-bottom:8px}
  .invite-meta{font-size:13px;color:var(--muted);margin-bottom:14px}
  .pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:500;background:var(--surface-soft);color:var(--text)}
  .pill-going{background:var(--primary);color:white}
  .btn{padding:10px 18px;border-radius:999px;border:none;font-family:var(--fb);font-weight:600;font-size:14px;cursor:pointer}
  .btn-primary{background:var(--primary);color:white}
  .btn-ghost{background:transparent;color:var(--text);border:1px solid var(--border)}
  .feed-row{display:grid;grid-template-columns:64px 1fr auto;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);align-items:center}
  .feed-row:last-child{border-bottom:none}
  .feed-img{height:64px;background:var(--surface-soft);border-radius:10px}
  .feed-title{font-family:var(--fh);font-weight:700;font-size:15px;line-height:1.3;margin-bottom:4px}
  .feed-meta{font-size:12px;color:var(--muted)}
  .typo-spec{margin-bottom:20px}
  .typo-spec .display{font-family:var(--fh);font-weight:${t.headingWeight};font-size:48px;line-height:1;letter-spacing:${t.tracking};color:var(--primary);margin-bottom:8px}
  .typo-spec .name{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px}
  .motif-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .motif-chip{padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:14px;font-size:13px;color:var(--text)}
  .avoid-list{list-style:none}
  .avoid-list li{padding:8px 0;font-size:13px;color:var(--muted);display:flex;gap:10px}
  .avoid-list li::before{content:'×';color:var(--primary);font-weight:700}
</style>
</head>
<body>
<div class="wrap">
  <div class="lead">
    <div class="label">Brand World — Luma</div>
    <h1>Delightful events <em>start here.</em></h1>
    <p class="sub">${w.visualDirection}</p>
  </div>

  <div class="section">
    <h2>Palette</h2>
    <div class="palette">
      <div class="sw"><div class="sw-block" style="background:${c.background}"></div><div class="sw-lbl"><b>Background</b><span>${c.background}</span></div></div>
      <div class="sw"><div class="sw-block" style="background:${c.surface}"></div><div class="sw-lbl"><b>Surface</b><span>${c.surface}</span></div></div>
      <div class="sw"><div class="sw-block" style="background:${c.surfaceSoft}"></div><div class="sw-lbl"><b>Surface Soft</b><span>${c.surfaceSoft}</span></div></div>
      <div class="sw"><div class="sw-block" style="background:${c.primary}"></div><div class="sw-lbl"><b>Primary</b><span>${c.primary}</span></div></div>
      <div class="sw"><div class="sw-block" style="background:${c.accent}"></div><div class="sw-lbl"><b>Accent</b><span>${c.accent}</span></div></div>
      <div class="sw"><div class="sw-block" style="background:${c.text}"></div><div class="sw-lbl"><b>Text</b><span>${c.text}</span></div></div>
      <div class="sw"><div class="sw-block" style="background:${c.textMuted}"></div><div class="sw-lbl"><b>Muted</b><span>${c.textMuted}</span></div></div>
    </div>
  </div>

  <div class="section">
    <h2>Typography</h2>
    <div class="typo-spec">
      <div class="display">Summer party at Ocean Beach</div>
      <div class="name">${t.heading} · weight ${t.headingWeight} · tracking ${t.tracking}</div>
    </div>
    <div class="typo-spec">
      <div style="font-family:var(--fb);font-size:18px;line-height:1.55;color:var(--text);margin-bottom:8px">Hosted by Guillaume Mitch · 45 guests · Sunday July 23, 10am</div>
      <div class="name">${t.body} · body</div>
    </div>
  </div>

  <div class="section">
    <h2>Sample event card — the actual motif</h2>
    <div class="row">
      <div class="card invite-card">
        <div class="invite-hero">
          <div class="date-badge"><b>23</b><span>JUL</span></div>
        </div>
        <h3>Summer Party at Ocean Beach</h3>
        <div class="invite-meta">Hosted by Guillaume Mitch · 10:00 AM – 8:00 PM PDT · Ocean Beach, San Francisco</div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <span class="pill pill-going">● 45 going</span>
          <span class="pill">3 friends going</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary">RSVP</button>
          <button class="btn btn-ghost">Share</button>
        </div>
      </div>

      <div class="card">
        <div class="label" style="margin-bottom:14px">Discovery feed</div>
        <div class="feed-row"><div class="feed-img"></div><div><div class="feed-title">Yoga in the Park</div><div class="feed-meta">Sat · Dolores Park · 32 going</div></div><span class="pill">RSVP</span></div>
        <div class="feed-row"><div class="feed-img"></div><div><div class="feed-title">Founders dinner</div><div class="feed-meta">Thu · Mission · 18 going</div></div><span class="pill">RSVP</span></div>
        <div class="feed-row"><div class="feed-img"></div><div><div class="feed-title">Climbing meetup</div><div class="feed-meta">Sun · Mission Cliffs · 8 going</div></div><span class="pill">RSVP</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Motifs the system will use</h2>
    <div class="motif-grid">${motifChips}</div>
  </div>

  <div class="section">
    <h2>Will not use — anti-cliché</h2>
    <ul class="avoid-list">${avoidList}</ul>
  </div>

  <div class="section">
    <h2>Why this works</h2>
    <p class="sub" style="max-width:none;color:var(--text);font-size:16px">${w.whyThisWorks}</p>
  </div>
</div>
</body></html>`

fs.writeFileSync(outPath, html, 'utf8')
console.log(`▸ Wrote ${outPath} (${(html.length/1024).toFixed(1)} KB)`)
