#!/usr/bin/env tsx
/* ════════════════════════════════════════════════════════════════════
   build-client-deck.ts — per-client single-file HTML pitch deck builder

   Accepts CLI flags for per-client inputs and writes a complete self-
   contained HTML deck to --out by posting to the deployed
   /api/generate endpoint (same pipeline as the workspace deck).

   Defaults to the production deploy at signaldeck-two.vercel.app — set
   SIGNALDECK_API_URL to point elsewhere (e.g. http://localhost:3000
   for local dev).

   Example:
     npx tsx scripts/build-client-deck.ts \
       --client "SyncPay" --url syncpay.au --industry fintech \
       --brief "Reconciliation gap between payments and records" \
       --founder "Ezana" --audience seed-vc --stage seed \
       --framework belief \
       --out "C:/Users/ezana/Downloads/design-SyncPay.html"
═══════════════════════════════════════════════════════════════════ */

import fs from 'fs'
import path from 'path'
import { FRAMEWORKS } from '../src/lib/frameworks/library'
import { DARK_FRAMEWORKS } from '../src/lib/frameworks/dark'
import { resolveIndustry, getIndustryGuide } from '../src/lib/industry-guide'

const API_BASE = process.env.SIGNALDECK_API_URL || 'https://signaldeck-two.vercel.app'

/* ── arg parsing ──────────────────────────────────────────────────── */
function parseArgs(argv: string[]) {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) { args[key] = next; i++ }
      else                                  { args[key] = 'true' }
    }
  }
  return args
}

function requireFlag(args: Record<string, string>, key: string): string {
  const v = args[key]
  if (!v || v === 'true') {
    console.error(`Missing required flag: --${key}`)
    process.exit(1)
  }
  return v
}

/* ── main ─────────────────────────────────────────────────────────── */
async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help === 'true' || args.h === 'true') {
    console.log(`build-client-deck — generate a single-file HTML pitch deck

Required flags:
  --client     "Company name"          e.g. "SyncPay"
  --url        domain.tld              e.g. "syncpay.au"
  --industry   fintech|saas|...        any IndustryKey (see industry-guide.ts)
  --brief      "Founder story / pitch" the realStory body
  --founder    "Founder name"          e.g. "Ezana"

Optional flags:
  --role       "Founder, CEO"          founder title (default: "Founder")
  --audience   seed-vc|series-a|...    default: seed-vc
  --stage      pre-seed|seed|...       default: seed
  --goal       raise|customer|partner  default: raise
  --oneLiner   "x for y"               default: derived from brief
  --framework  spin|belief|risk|...    optional narrative framework id
  --out        "/path/to/file.html"    default: ./design-{client}.html

Environment:
  SIGNALDECK_API_URL  override the API base (default: signaldeck-two.vercel.app)

Examples:
  npx tsx scripts/build-client-deck.ts --client Acme --url acme.com \\
    --industry fintech --brief "..." --founder "Jane"
`)
    process.exit(0)
  }

  const client    = requireFlag(args, 'client')
  const url       = requireFlag(args, 'url')
  const industry  = requireFlag(args, 'industry')
  const brief     = requireFlag(args, 'brief')
  const founder   = requireFlag(args, 'founder')
  const role      = args.role     || 'Founder'
  const audience  = args.audience || 'seed-vc'
  const stage     = args.stage    || 'seed'
  const goal      = args.goal     || 'raise'
  const oneLiner  = args.oneLiner || brief.split(/[.!?]/)[0].trim().slice(0, 100)
  const frameworkId = args.framework

  const safeName = client.replace(/[^A-Za-z0-9_-]/g, '')
  const outPath  = args.out || path.join(process.cwd(), `design-${safeName}.html`)

  /* Sanity-check inputs locally before hitting the API */
  const guideKey      = resolveIndustry(industry)
  const industryGuide = getIndustryGuide(guideKey)
  const allFw         = [...FRAMEWORKS, ...DARK_FRAMEWORKS]
  const fw            = frameworkId ? allFw.find(f => f.id === frameworkId) : undefined
  if (frameworkId && !fw) {
    console.error(`Unknown framework id: ${frameworkId}`)
    console.error('Available:', allFw.map(f => f.id).join(', '))
    process.exit(1)
  }

  const body = {
    company:      client,
    domain:       url,
    oneLiner,
    industry,
    stage,
    audience,
    goal,
    realStory:    brief,
    founderName:  founder,
    founderRole:  role,
    frameworkId,
  }

  console.log(`▸ ${client} (${guideKey})  audience=${audience}  stage=${stage}  framework=${fw?.id || 'auto'}`)
  console.log(`▸ Fonts:     ${industryGuide.display} / ${industryGuide.body}`)
  console.log(`▸ Accent:    ${industryGuide.color}`)
  console.log(`▸ POST ${API_BASE}/api/generate …`)

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error(`API ${res.status} ${res.statusText}: ${errText.slice(0, 500)}`)
    process.exit(1)
  }
  const data = await res.json() as { html: string; narrative: string; slideOrder: string[]; frameworkApplied: string|null; industryGuide: string }

  console.log(`▸ Narrative: ${data.narrative}`)
  console.log(`▸ Slide set: ${data.slideOrder.join(', ')}`)
  console.log(`▸ Framework applied: ${data.frameworkApplied ?? '(auto)'}`)
  console.log(`▸ Industry guide:    ${data.industryGuide}`)

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, data.html, 'utf8')

  console.log(`▸ Wrote ${outPath} (${(data.html.length / 1024).toFixed(1)} KB)`)
  console.log('▸ Done.')
}

main().catch(err => {
  console.error('Error:', err.message || err)
  if (err.stack) console.error(err.stack)
  process.exit(1)
})
