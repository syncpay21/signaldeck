/* ════════════════════════════════════════════════════════════════════
   DESIGN TOKENS — canonical type / spacing / radius / colour-role scales.

   This is the THEORETICAL scaffolding the rest of the design system
   leans on. Before this file existed, every layout in renderer.ts and
   every rule in deckTemplate.ts invented its own clamp() and px value.
   Now there's a vocabulary: --ds-display-hero, --ds-s-4, --ds-r-md.

   Existing 48 layouts keep their hardcoded values for now (separate
   refactor). New layouts and the workspace UI should reference these
   tokens so future design changes ripple in one place.

   Tokens are archetype-aware (Hero gets tighter line-height, Sage gets
   longer measure) and density-aware (tight / normal / spacious shifts
   the spacing scale by ±20%).
═══════════════════════════════════════════════════════════════════ */

export const TYPE_SCALE = {
  displayHero: 'clamp(80px, 14vw, 240px)',
  displayLg:   'clamp(56px, 9vw, 140px)',
  displayMd:   'clamp(40px, 6.5vw, 96px)',
  displaySm:   'clamp(28px, 4.2vw, 56px)',
  headingLg:   'clamp(22px, 2.8vw, 36px)',
  headingMd:   'clamp(18px, 2.0vw, 24px)',
  body:        'clamp(14px, 1.2vw, 17px)',
  caption:     'clamp(12px, 0.9vw, 14px)',
  micro:       '11px',
} as const

export const SPACING = {
  s0:  '4px',
  s1:  '8px',
  s2:  '12px',
  s3:  '16px',
  s4:  '20px',
  s5:  '24px',
  s6:  '32px',
  s7:  '40px',
  s8:  '48px',
  s9:  '64px',
  s10: '80px',
  s11: '96px',
} as const

export const RADIUS = {
  sharp: '0px',
  sm:    '8px',
  md:    '12px',
  lg:    '16px',
  xl:    '24px',
  pill:  '9999px',
} as const

/* Semantic colour-role tokens. These extend the existing --bg / --accent /
 * --fg / --wire vars by deriving softer / stronger / muted variants via
 * color-mix(). The deck CSS can reference --ink-strong instead of guessing
 * an opacity. */
export const COLOR_ROLES_CSS = `
  --ink-strong:    var(--text, var(--fg, #0F1115));
  --ink-muted:     var(--text-muted, color-mix(in srgb, var(--ink-strong) 60%, transparent));
  --paper:         var(--bg, #FFFFFF);
  --paper-soft:    var(--surface, color-mix(in srgb, var(--paper) 95%, var(--ink-strong)));
  --paper-elev:    color-mix(in srgb, var(--paper-soft) 80%, var(--ink-strong) 4%);
  --accent-strong: var(--accent, var(--primary, #0F1115));
  --accent-soft:   color-mix(in srgb, var(--accent-strong) 18%, transparent);
  --divider:       var(--border, color-mix(in srgb, var(--ink-strong) 10%, transparent));
  --focus-ring:    color-mix(in srgb, var(--accent-strong) 65%, transparent);
`.trim()

/* Per-archetype overrides. These tweak the BASE scale to suit the
 * archetype's voice. Hero / Outlaw want tight, bold, urgent. Sage /
 * Creator want generous, considered. Lover / Caregiver want softer
 * radii and warmer leading. */
const ARCHETYPE_OVERRIDES: Record<string, { lineHeight: string; tracking: string; radiusBias: keyof typeof RADIUS }> = {
  hero:      { lineHeight: '0.92', tracking: '-0.04em', radiusBias: 'sm' },
  outlaw:    { lineHeight: '0.90', tracking: '-0.05em', radiusBias: 'sharp' },
  magician:  { lineHeight: '0.98', tracking: '-0.03em', radiusBias: 'md' },
  sage:      { lineHeight: '1.12', tracking: '-0.01em', radiusBias: 'sm' },
  creator:   { lineHeight: '1.08', tracking: '-0.02em', radiusBias: 'md' },
  ruler:     { lineHeight: '1.02', tracking: '-0.03em', radiusBias: 'sm' },
  lover:     { lineHeight: '1.18', tracking: '-0.01em', radiusBias: 'xl' },
  caregiver: { lineHeight: '1.15', tracking: 'normal',  radiusBias: 'lg' },
  jester:    { lineHeight: '1.00', tracking: '-0.02em', radiusBias: 'xl' },
  everyman:  { lineHeight: '1.10', tracking: 'normal',  radiusBias: 'md' },
  innocent:  { lineHeight: '1.16', tracking: 'normal',  radiusBias: 'lg' },
  explorer:  { lineHeight: '1.04', tracking: '-0.02em', radiusBias: 'md' },
}

const DENSITY_SCALE: Record<string, number> = {
  tight:    0.82,
  normal:   1.00,
  spacious: 1.22,
}

/** Emit a `:root { ... }` style block (without the wrapping selector — caller
 *  decides) carrying every token as a CSS custom property. Caller usually
 *  appends this to the brandWorldToCssVars() output. */
export function designTokensToCss(
  archetypeId?: string,
  density: 'tight' | 'normal' | 'spacious' = 'normal',
): Record<string, string> {
  const out: Record<string, string> = {}
  const scale = DENSITY_SCALE[density] ?? 1
  const arch = (archetypeId && ARCHETYPE_OVERRIDES[archetypeId]) || null

  // Type tokens
  for (const [k, v] of Object.entries(TYPE_SCALE)) {
    out[`--ds-type-${kebab(k)}`] = v
  }
  out['--ds-line-display'] = arch?.lineHeight ?? '1.02'
  out['--ds-line-body']    = arch ? String(Math.max(1.35, Number(arch.lineHeight) + 0.35).toFixed(2)) : '1.45'
  out['--ds-track-display'] = arch?.tracking ?? 'var(--heading-tracking, -0.02em)'

  // Spacing — scaled by density
  for (const [k, v] of Object.entries(SPACING)) {
    const n = parseInt(v, 10)
    out[`--ds-${k}`] = `${Math.round(n * scale)}px`
  }

  // Radius — archetype bias picks the "primary" radius
  for (const [k, v] of Object.entries(RADIUS)) {
    out[`--ds-r-${k}`] = v
  }
  if (arch) out['--ds-r-primary'] = RADIUS[arch.radiusBias]

  return out
}

/** Helper — emit the colour-role CSS block as a single declaration block string
 *  suitable for embedding in a <style> tag. */
export function colorRolesCss(): string {
  return COLOR_ROLES_CSS
}

function kebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([A-Z]+)/g, m => m.toLowerCase())
}
