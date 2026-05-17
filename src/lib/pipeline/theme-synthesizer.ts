/* ════════════════════════════════════════════════════════════════════
   STAGE B2 — Theme synthesis

   Blends extracted brand colors with the industry guide's defaults
   to produce a final 5-color palette + font stack. Enforces:
     - Industry "avoid" list (e.g. no warm-amber in fintech)
     - WCAG contrast (accent vs bg ≥ 4.5:1, ink vs bg ≥ 7:1)
     - Brand-color preference if WCAG passes
     - Fallback to industry-guide palette when brand colors fail

   This stage is mostly deterministic (color math). Haiku is only
   invoked when the user has explicitly provided a brand-color but it
   conflicts with the industry's "avoid" list — Haiku decides whether
   to honor the user's choice or override with the guide default.
═══════════════════════════════════════════════════════════════════ */

import type { IndustryGuide } from '../industry-guide'
import type { ExtractedBrand, ExtractedColor } from './brand-extractor'

export interface SynthesisedTheme {
  accent:      string
  accent2:     string
  bg:          string
  ink:         string
  paper:       string
  fontHeading: string
  fontBody:    string
  fontData:    string
  isDark:      boolean
  contrast: {
    accentOnBg: number      // ratio
    inkOnBg:    number
    pass:       boolean     // accent ≥ 4.5 AND ink ≥ 7.0
  }
  origin: {
    accent: 'brand' | 'industry' | 'user-override'
    bg:     'brand' | 'industry' | 'user-override'
  }
  reasoning: string         // 1-line explanation
}

export interface ThemeInput {
  brand?:       ExtractedBrand
  guide:        IndustryGuide
  /* manual overrides — win if provided */
  accentColor?: string
  bgColor?:     string
  fontHeading?: string
  fontBody?:    string
  isDark?:      boolean
}

export function synthesiseTheme(input: ThemeInput): SynthesisedTheme {
  const { guide, brand } = input
  const isDark = input.isDark ?? true

  /* Pick accent: user override > best brand color that survives avoid-list > guide */
  let accent = input.accentColor || ''
  let accentOrigin: 'brand' | 'industry' | 'user-override' = 'user-override'
  if (!accent) {
    const brandPick = pickBrandColor(brand, guide)
    if (brandPick) { accent = brandPick; accentOrigin = 'brand' }
    else           { accent = guide.color; accentOrigin = 'industry' }
  }

  /* Pick bg: user override > guide.palette[1] (always industry default for dark/light) */
  let bg = input.bgColor || ''
  let bgOrigin: 'brand' | 'industry' | 'user-override' = 'user-override'
  if (!bg) {
    bg = isDark ? guide.palette[1] : '#ffffff'
    bgOrigin = 'industry'
  }

  /* WCAG contrast — if accent fails on bg, tint or fall back */
  const inkColor = isDark ? '#eef2f7' : '#0f1d2e'
  let accentOnBg = contrastRatio(accent, bg)
  const inkOnBg = contrastRatio(inkColor, bg)

  if (accentOnBg < 4.5) {
    const lighter = adjustLightness(accent, isDark ? +18 : -18)
    if (contrastRatio(lighter, bg) >= 4.5) {
      accent = lighter
      accentOnBg = contrastRatio(accent, bg)
    } else if (accentOrigin === 'brand') {
      // Brand color doesn't have contrast on this bg — fall back to industry default
      accent = guide.color
      accentOrigin = 'industry'
      accentOnBg = contrastRatio(accent, bg)
    }
  }

  const accent2 = adjustLightness(accent, isDark ? +14 : -14)
  const paper   = isDark ? mix(bg, '#ffffff', 0.04) : mix(bg, '#000000', 0.04)

  const reasoning =
    `Accent from ${accentOrigin} (${accent}, ${accentOnBg.toFixed(1)}:1) on ${bgOrigin} bg. ` +
    `Fonts: ${guide.display} / ${guide.body} per ${guide.name} guide.`

  return {
    accent,
    accent2,
    bg,
    ink: inkColor,
    paper,
    fontHeading: input.fontHeading || guide.display,
    fontBody:    input.fontBody    || guide.body,
    fontData:    guide.data,
    isDark,
    contrast: { accentOnBg, inkOnBg, pass: accentOnBg >= 4.5 && inkOnBg >= 7.0 },
    origin:   { accent: accentOrigin, bg: bgOrigin },
    reasoning,
  }
}

/* ── Brand-color picker — enforce avoid list ──────────────────────── */

function pickBrandColor(brand: ExtractedBrand | undefined, guide: IndustryGuide): string | null {
  if (!brand || !brand.colors.length) return null
  // Sort by weight (highest first), filter against avoid list, return first survivor.
  for (const c of brand.colors) {
    if (passesAvoidList(c, guide)) return c.hex
  }
  return null
}

function passesAvoidList(c: ExtractedColor, guide: IndustryGuide): boolean {
  // The 'avoid' list contains phrases like 'Warm amber palettes' or 'Neon palettes'.
  // We don't pattern-match the phrase verbatim — we infer color qualities.
  const [r, g, b] = rgb(c.hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const avoidStr = guide.avoid.join(' ').toLowerCase()

  // Warm amber/gold/orange: hue 25-50, sat > 60
  if (/warm amber|warm gold|amber palette|gold palette/.test(avoidStr) &&
      h >= 25 && h <= 50 && s > 0.55) return false

  // Neon / saturated brights: sat > 85, l 45-65
  if (/neon|bright|aggressive palette|loud palette/.test(avoidStr) &&
      s > 0.85 && l > 0.45 && l < 0.65) return false

  // Cold technical / fintech blue when industry says avoid:
  if (/cold tech|cold technical|corporate blue|startup violet/.test(avoidStr) &&
      h >= 200 && h <= 260 && s > 0.4) return false

  // Pastel / muted when industry wants bold:
  if (/pastel|wellness palette|soft friendly/.test(avoidStr) &&
      s < 0.3 && l > 0.7) return false

  // Greenwashing — bright generic green for climate:
  if (/greenwash/.test(avoidStr) && h >= 90 && h <= 140 && s > 0.7) return false

  return true
}

/* ── Color math (no deps) ──────────────────────────────────────────── */

function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function hex(r: number, g: number, b: number): string {
  const t = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${t(r)}${t(g)}${t(b)}`
}

function relativeLuminance(hexStr: string): number {
  const [R, G, B] = rgb(hexStr).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h *= 60
  }
  return { h, s, l }
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): [number, number, number] {
  h /= 360
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    hue2rgb(p, q, h + 1/3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1/3) * 255,
  ]
}

function adjustLightness(hexStr: string, delta: number): string {
  const [r, g, b] = rgb(hexStr)
  const hsl = rgbToHsl(r, g, b)
  hsl.l = Math.max(0, Math.min(1, hsl.l + delta / 100))
  const [r2, g2, b2] = hslToRgb(hsl)
  return hex(r2, g2, b2)
}

function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  return hex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount)
}
