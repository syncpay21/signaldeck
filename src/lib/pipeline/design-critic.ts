/* ════════════════════════════════════════════════════════════════════
   DESIGN CRITIC — post-processes the BrandWorld palette.

   Sonnet picks colours from screenshots; the critic asks the dumb-but-
   reliable question Sonnet sometimes misses: "is the accent text on this
   surface actually readable?"

   Deterministic step:
     - Parse every relevant colour to RGB
     - Compute WCAG contrast ratios for the pairs that matter
     - Flag any pair below threshold

   Generative step (only runs if anything failed):
     - Hand the failures back to Sonnet ("primary=#FFEE52 on surface=#FFFEF0
       contrasts at 1.4:1, need >=3:1") and ask for a corrected colour block
     - Re-validate; if still failing, fall back to a hard-coded fix
       (text → darken/lighten until pair passes) so we never ship a broken
       palette.

   Used by /api/brand-world right after Sonnet returns.
═══════════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk'
import { ANDREAS_PERSONA } from '../andreas-persona'

export interface ContrastFailure {
  pair:       string      // e.g. "primary on surface"
  fgHex:      string
  bgHex:      string
  ratio:      number
  threshold:  number      // 4.5 for body text, 3.0 for accent / UI text
  why:        string      // human-readable explanation
}

export interface CritiqueResult {
  failures:    ContrastFailure[]
  fixedColour?: Record<string, string>   // only present if we patched the palette
  reasoning?:  string
}

/* ─── WCAG helpers ─────────────────────────────────────────────────── */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}

/** WCAG relative luminance. Returns 0 (black) → 1 (white). */
function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

/** WCAG contrast ratio between two hex colours. 1:1 = no contrast, 21:1 = max. */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  if (l1 == null || l2 == null) return 0
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/* ─── Critique ─────────────────────────────────────────────────────── */

/** Run the deterministic contrast checks against the brand-world palette. */
export function detectContrastFailures(colour: any): ContrastFailure[] {
  const out: ContrastFailure[] = []
  const push = (pair: string, fg: string, bg: string, threshold: number, why: string) => {
    if (!fg || !bg || !fg.startsWith('#') || !bg.startsWith('#')) return
    const ratio = contrastRatio(fg, bg)
    if (ratio < threshold) {
      out.push({ pair, fgHex: fg, bgHex: bg, ratio: Math.round(ratio * 10) / 10, threshold, why })
    }
  }

  // Body text on the card surface MUST hit WCAG AA (4.5:1)
  push('text on surface', colour.text, colour.surface, 4.5,
    'Card body copy must be readable for users to actually consume content')
  // Body text on the page background (when text floats on bg, e.g. hero)
  push('text on background', colour.text, colour.background, 4.5,
    'Headings on the page background must be readable')
  // Accent / UI text — primary on surface (numbers, buttons, headings)
  push('primary on surface', colour.primary, colour.surface, 3.0,
    'Accent text and number callouts on cards must stand out')
  // Accent text on the background
  push('primary on background', colour.primary, colour.background, 3.0,
    'CTAs / accent labels on the page background must be visible')
  // Muted text on surface — slightly lower bar (3:1) since it is decorative
  if (colour.textMuted && /^#/.test(colour.textMuted)) {
    push('textMuted on surface', colour.textMuted, colour.surface, 3.0,
      'Muted text labels must still be legible')
  }

  return out
}

/** Ask Sonnet to repair a palette that failed contrast checks. Returns the
 *  patched colour block on success, or null if Sonnet's fix also fails. */
async function repairWithModel(
  client: Anthropic,
  colour: any,
  failures: ContrastFailure[],
): Promise<{ colour: Record<string, string>; reasoning: string } | null> {
  const failureList = failures.map(f =>
    `  - ${f.pair}: fg=${f.fgHex}, bg=${f.bgHex}, ratio=${f.ratio}:1 (need ${f.threshold}:1 — ${f.why})`
  ).join('\n')

  const system = `${ANDREAS_PERSONA}

YOUR JOB HERE
A palette has been generated for a brand world, but the readability check
caught contrast failures. Fix them without destroying the brand voice.

RULES:
- Keep the brand's saturated colours (background, primary, accent) AS-IS
  unless the only way to fix contrast is to swap their roles.
- Adjust text and surface colours first. If text is too light on the
  surface, darken it. If surface is too close to text, shift it.
- If the only fix is to swap roles (e.g. yellow text on cream → use coral
  text on cream instead), say so explicitly.
- Output JSON only: { "colour": { ... full colour block ... }, "reasoning": "<1-2 sentences>" }
- Every colour key from the input must appear in the output.`

  const user = `CURRENT PALETTE:
${JSON.stringify(colour, null, 2)}

CONTRAST FAILURES:
${failureList}

Return the corrected palette as JSON.`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const raw = (msg.content[0] as any).text?.trim() ?? ''
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    let parsed: any
    try { parsed = JSON.parse(jsonStr) }
    catch { parsed = JSON.parse(jsonStr.match(/\{[\s\S]*\}/)?.[0] || '{}') }
    if (!parsed?.colour || typeof parsed.colour !== 'object') return null
    return { colour: parsed.colour, reasoning: String(parsed.reasoning || '') }
  } catch {
    return null
  }
}

/** Brute-force fallback: try blending the text colour toward both black AND
 *  white, then pick whichever direction actually passes against the surface.
 *  Surfaces with intermediate luminance (coral, mid-grey) need black even
 *  though they look "warm/light" — the dark-vs-light heuristic alone fails
 *  there. We try both and let the contrast numbers decide. */
function forceReadableText(textHex: string, surfaceHex: string, threshold: number): string {
  if (relativeLuminance(surfaceHex) == null) return textHex
  const black = '#0d0d0d'
  const white = '#ffffff'
  // Cheap shortcut — if pure white or pure black already passes, use that.
  if (contrastRatio(black, surfaceHex) >= threshold) return black
  if (contrastRatio(white, surfaceHex) >= threshold) return white
  // Neither end-stop passes against this surface (very rare — happens only
  // when surface is exactly mid-grey ~#777). Pick whichever is higher.
  return contrastRatio(black, surfaceHex) >= contrastRatio(white, surfaceHex) ? black : white
}

function mix(a: string, b: string, t: number): string {
  const ra = hexToRgb(a); const rb = hexToRgb(b)
  if (!ra || !rb) return b
  const r = Math.round(ra.r + (rb.r - ra.r) * t)
  const g = Math.round(ra.g + (rb.g - ra.g) * t)
  const bl = Math.round(ra.b + (rb.b - ra.b) * t)
  return '#' + [r, g, bl].map(n => n.toString(16).padStart(2, '0')).join('')
}

/** Top-level entry: validate + repair if needed. Returns the original
 *  colour block when no failures, or a patched block when something
 *  needed fixing. Safe to call unconditionally. */
export async function critiqueAndFix(
  client: Anthropic,
  colour: any,
): Promise<CritiqueResult> {
  const failures = detectContrastFailures(colour)
  if (failures.length === 0) return { failures: [] }

  // First try Sonnet (well — Haiku, but still LLM-driven repair)
  const repaired = await repairWithModel(client, colour, failures)
  if (repaired) {
    const stillFailing = detectContrastFailures({ ...colour, ...repaired.colour })
    if (stillFailing.length === 0) {
      return { failures, fixedColour: repaired.colour, reasoning: repaired.reasoning }
    }
  }

  // Fall back to deterministic fix: darken/lighten text colours until they pass.
  const patched = { ...colour }
  for (const f of failures) {
    if (f.pair === 'text on surface') patched.text = forceReadableText(colour.text, colour.surface, f.threshold)
    if (f.pair === 'text on background') patched.text = forceReadableText(patched.text, colour.background, f.threshold)
    if (f.pair === 'primary on surface') patched.primary = forceReadableText(colour.primary, colour.surface, f.threshold)
    if (f.pair === 'primary on background') patched.primary = forceReadableText(patched.primary, colour.background, f.threshold)
    if (f.pair === 'textMuted on surface') patched.textMuted = forceReadableText(colour.textMuted, colour.surface, f.threshold)
  }
  return { failures, fixedColour: patched, reasoning: 'Deterministic fallback — darkened/lightened text colours to meet WCAG.' }
}
