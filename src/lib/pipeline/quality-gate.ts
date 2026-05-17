/* ════════════════════════════════════════════════════════════════════
   STAGE C2 — Quality gate

   Post-render programmatic checks. No AI — fast + deterministic.
   Returns a report; the caller decides what to do with failures
   (typically: surface them in the UI, never block the deck).

   Checks:
     1. Contrast: accent vs bg ≥ 4.5:1   ink vs bg ≥ 7:1   (WCAG AA/AAA)
     2. Fonts: <link> includes display + body + data families
     3. Avoid list compliance: copy doesn't use banned vocabulary
        per the industry's avoid list (e.g. "neon", "disruptive",
        "innovative" depending on industry voice)
     4. Viewport meta present (mobile sanity)
═══════════════════════════════════════════════════════════════════ */

import type { IndustryGuide } from '../industry-guide'
import type { SynthesisedTheme } from './theme-synthesizer'
import { contrastRatio } from './theme-synthesizer'

export interface QualityReport {
  contrast: {
    accentOnBg: number
    inkOnBg:    number
    pass:       boolean
  }
  fonts: {
    expected: string[]
    found:    string[]
    pass:     boolean
  }
  avoidViolations: { keyword: string; in: 'copy' | 'theme' }[]
  viewport: boolean
  pass: boolean
  notes: string[]
}

/* Industry "avoid" phrases → copy keywords to watch for. */
const AVOID_VOCAB: { phrase: RegExp; banned: string[] }[] = [
  { phrase: /startup language|startup energy|startup disruption|disruption energy/, banned: ['disrupt','revolutionary','next-gen','game-changing','innovative','synergy'] },
  { phrase: /buzzword/i,                                                            banned: ['leverage','paradigm','best-in-class','seamlessly','holistic'] },
  { phrase: /greenwash/,                                                            banned: ['green revolution','sustainable future','impact-driven'] },
  { phrase: /clinical distance/,                                                    banned: ['solution','platform','enable','empower'] },
  { phrase: /jargon/,                                                               banned: ['stakeholder','utilise','synergistic'] },
]

export function runQualityGate(
  html: string,
  content: Record<string, any>,
  theme: SynthesisedTheme,
  guide: IndustryGuide,
): QualityReport {
  const notes: string[] = []

  /* 1. Contrast */
  const accentOnBg = contrastRatio(theme.accent, theme.bg)
  const inkOnBg    = contrastRatio(theme.ink,    theme.bg)
  const contrastPass = accentOnBg >= 4.5 && inkOnBg >= 7.0
  if (!contrastPass) {
    if (accentOnBg < 4.5) notes.push(`Accent contrast ${accentOnBg.toFixed(1)}:1 — below WCAG AA (4.5:1).`)
    if (inkOnBg    < 7.0) notes.push(`Ink contrast ${inkOnBg.toFixed(1)}:1 — below WCAG AAA (7:1).`)
  }

  /* 2. Fonts present in <link href="..."> */
  const expected = [theme.fontHeading, theme.fontBody, theme.fontData].filter(Boolean)
  const linkMatch = html.match(/<link[^>]+fonts\.googleapis\.com\/[^"']+/)?.[0] || ''
  const found: string[] = expected.filter(f => linkMatch.includes(f.replace(/\s+/g, '+')))
  const fontsPass = found.length === expected.length
  if (!fontsPass) notes.push(`Font load — found ${found.length}/${expected.length} in <link>.`)

  /* 3. Avoid-list compliance — scan copy for banned vocabulary */
  const copyText = JSON.stringify(content).toLowerCase()
  const avoidJoined = guide.avoid.join(' ').toLowerCase()
  const banned: string[] = []
  for (const v of AVOID_VOCAB) {
    if (v.phrase.test(avoidJoined)) banned.push(...v.banned)
  }
  const violations: QualityReport['avoidViolations'] = []
  for (const word of banned) {
    // word-boundary, case-insensitive
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i')
    if (re.test(copyText)) violations.push({ keyword: word, in: 'copy' })
  }
  if (violations.length) notes.push(`Avoid-list hits: ${violations.map(v => v.keyword).join(', ')}.`)

  /* 4. Viewport meta */
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  if (!viewport) notes.push('Viewport meta missing.')

  const pass = contrastPass && fontsPass && violations.length === 0 && viewport

  return {
    contrast: { accentOnBg, inkOnBg, pass: contrastPass },
    fonts:    { expected, found, pass: fontsPass },
    avoidViolations: violations,
    viewport,
    pass,
    notes,
  }
}
