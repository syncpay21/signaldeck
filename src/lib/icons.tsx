/* ════════════════════════════════════════════════════════════════════
   ICONS — per-iconStyle variants for the Workspace nav.

   Single source of truth for the 27 workflow icons used in the sidebar
   and chrome. Each icon's SVG primitives live in ICONS once; four
   variant builders apply different rendering treatments based on
   BrandWorld.iconStyle. Workspace.tsx imports getIconSet() and looks up
   the variant matching the generated world — Luma gets duotone,
   SyncPay gets line, CourtIQ gets glyph.

   Variant rules (from the SignalDeck design philosophy):
     line    — thin stroke, fill:none (default fallback)
     duotone — two layers of the SAME path in var(--primary): a 20%-opacity
               fill behind, full-opacity stroke on top. Never a second hue.
     glyph   — fully filled solid (open shapes thicken stroke to 2.4)
     badge   — line icon inside a primary-soft chip (iOS app-icon feel)
═══════════════════════════════════════════════════════════════════ */

import React from 'react'
import type { IconStyle } from './brand-world'

export type IconKey =
  | 'layers' | 'doc' | 'palette' | 'cards' | 'star' | 'list' | 'eye'
  | 'check' | 'bolt' | 'signal' | 'play' | 'spark' | 'rocket' | 'send'
  | 'cog' | 'menu' | 'download' | 'external' | 'copy' | 'globe'
  | 'upload' | 'mic' | 'chevL' | 'chevR' | 'image' | 'refresh' | 'plus'

export type IconProps = { className?: string; style?: React.CSSProperties }
export type IconComponent = React.FC<IconProps>
export type IconSet = Record<IconKey, IconComponent>

type SvgKind = 'path' | 'circle' | 'rect' | 'line'
type Primitive = { kind: SvgKind; attrs: Record<string, any> }
type Def = {
  viewBox: string
  primitives: Primitive[]
  /** True if the shape isn't closed (chevrons, plus, menu lines). Duotone
   *  skips the fill layer; glyph keeps stroke instead of fill-solid. */
  openShape?: boolean
}

const ICONS: Record<IconKey, Def> = {
  layers: { viewBox: '0 0 24 24', primitives: [
    { kind: 'path', attrs: { d: 'M12 3l9 5-9 5-9-5 9-5z' } },
    { kind: 'path', attrs: { d: 'M3 13l9 5 9-5' } },
  ]},
  doc: { viewBox: '0 0 24 24', primitives: [
    { kind: 'path', attrs: { d: 'M6 3h9l5 5v13H6z' } },
    { kind: 'path', attrs: { d: 'M14 3v6h6' } },
  ]},
  palette: { viewBox: '0 0 24 24', primitives: [
    { kind: 'path', attrs: { d: 'M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2-.6-1.4.4-2.5 1.7-2.5H17a4 4 0 004-4 9 9 0 00-9-9z' } },
    { kind: 'circle', attrs: { cx: 7.5, cy: 10.5, r: 1 } },
    { kind: 'circle', attrs: { cx: 9.5, cy: 6.5,  r: 1 } },
    { kind: 'circle', attrs: { cx: 14,  cy: 6,    r: 1 } },
    { kind: 'circle', attrs: { cx: 17,  cy: 10,   r: 1 } },
  ]},
  cards: { viewBox: '0 0 24 24', primitives: [
    { kind: 'rect', attrs: { x: 3, y: 4,  width: 18, height: 6, rx: 1.5 } },
    { kind: 'rect', attrs: { x: 3, y: 14, width: 18, height: 6, rx: 1.5 } },
  ]},
  star: { viewBox: '0 0 24 24', primitives: [
    { kind: 'path', attrs: { d: 'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z' } },
  ]},
  list: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M4 6h16M4 12h16M4 18h16' } },
  ]},
  eye: { viewBox: '0 0 24 24', primitives: [
    { kind: 'path', attrs: { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z' } },
    { kind: 'circle', attrs: { cx: 12, cy: 12, r: 3 } },
  ]},
  check: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M4 12l5 5L20 6' } },
  ]},
  bolt: { viewBox: '0 0 24 24', primitives: [
    { kind: 'path', attrs: { d: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z' } },
  ]},
  signal: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M4 20V14M9 20V10M14 20V6M19 20V2' } },
  ]},
  play: { viewBox: '0 0 24 24', primitives: [
    { kind: 'path', attrs: { d: 'M7 5l12 7-12 7V5z' } },
  ]},
  spark: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4' } },
  ]},
  rocket: { viewBox: '0 0 24 24', primitives: [
    { kind: 'path', attrs: { d: 'M5 14c0-5 4-11 9-11 5 0 5 6 0 11-3 3-6 4-9 0z' } },
    { kind: 'path', attrs: { d: 'M5 14c-2 1-3 3-3 6 3 0 5-1 6-3' } },
    { kind: 'circle', attrs: { cx: 14, cy: 8, r: 1.5 } },
  ]},
  send: { viewBox: '0 0 24 24', primitives: [
    { kind: 'path', attrs: { d: 'M3 11l18-7-7 18-3-8-8-3z' } },
  ]},
  cog: { viewBox: '0 0 24 24', primitives: [
    { kind: 'circle', attrs: { cx: 12, cy: 12, r: 3 } },
    { kind: 'path', attrs: { d: 'M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.4.8a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.8-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.8c.6.5 1.3.9 2 1.2L10 21h4l.5-2.5c.7-.3 1.4-.7 2-1.2l2.4.8 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z' } },
  ]},
  menu: { viewBox: '0 0 18 18', openShape: true, primitives: [
    { kind: 'line', attrs: { x1: 2, y1: 4.5,  x2: 16, y2: 4.5 } },
    { kind: 'line', attrs: { x1: 2, y1: 9,    x2: 16, y2: 9 } },
    { kind: 'line', attrs: { x1: 2, y1: 13.5, x2: 16, y2: 13.5 } },
  ]},
  download: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M12 4v12M6 14l6 6 6-6M4 20h16' } },
  ]},
  external: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M18 13v6H6V7h6M15 3h6v6M10 14L21 3' } },
  ]},
  copy: { viewBox: '0 0 24 24', primitives: [
    { kind: 'rect', attrs: { x: 9, y: 9, width: 13, height: 13, rx: 2 } },
    { kind: 'path', attrs: { d: 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' } },
  ]},
  globe: { viewBox: '0 0 24 24', primitives: [
    { kind: 'circle', attrs: { cx: 12, cy: 12, r: 9 } },
    { kind: 'path', attrs: { d: 'M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18' } },
  ]},
  upload: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M12 16V4M6 10l6-6 6 6M4 20h16' } },
  ]},
  mic: { viewBox: '0 0 24 24', primitives: [
    { kind: 'rect', attrs: { x: 9, y: 2, width: 6, height: 12, rx: 3 } },
    { kind: 'path', attrs: { d: 'M5 10a7 7 0 0014 0M12 19v3M9 22h6' } },
  ]},
  chevL: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M15 18l-6-6 6-6' } },
  ]},
  chevR: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M9 18l6-6-6-6' } },
  ]},
  image: { viewBox: '0 0 24 24', primitives: [
    { kind: 'rect', attrs: { x: 3, y: 3, width: 18, height: 18, rx: 2 } },
    { kind: 'circle', attrs: { cx: 8.5, cy: 8.5, r: 1.5 } },
    { kind: 'path', attrs: { d: 'M21 15l-5-5L5 21' } },
  ]},
  refresh: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M3 12a9 9 0 0114-7l3 3M3 12l3-3M21 12a9 9 0 01-14 7l-3-3M21 12l-3 3' } },
  ]},
  plus: { viewBox: '0 0 24 24', openShape: true, primitives: [
    { kind: 'path', attrs: { d: 'M12 5v14M5 12h14' } },
  ]},
}

const STROKE_WIDTHS: Partial<Record<IconKey, number>> = {
  check: 2, chevL: 2, chevR: 2, plus: 2, menu: 1.8,
}

const FILLED_LINE_ICONS = new Set<IconKey>(['play'])

function makePrimitives(primitives: Primitive[], extra: Record<string, any>, prefix: string) {
  return primitives.map((p, i) => React.createElement(p.kind, { ...p.attrs, ...extra, key: `${prefix}${i}` }))
}

function buildLine(key: IconKey, def: Def): IconComponent {
  const sw = STROKE_WIDTHS[key] ?? 1.6
  const extraSvg: Record<string, any> = key === 'menu' ? { strokeLinecap: 'round' } : {}
  if (FILLED_LINE_ICONS.has(key)) {
    return ({ className, style }) => (
      <svg viewBox={def.viewBox} fill="currentColor" className={className} style={style}>
        {makePrimitives(def.primitives, {}, 'l')}
      </svg>
    )
  }
  return ({ className, style }) => (
    <svg viewBox={def.viewBox} fill="none" stroke="currentColor" strokeWidth={sw} {...extraSvg} className={className} style={style}>
      {makePrimitives(def.primitives, {}, 'l')}
    </svg>
  )
}

function buildDuotone(key: IconKey, def: Def): IconComponent {
  const sw = STROKE_WIDTHS[key] ?? 1.6
  const extraSvg: Record<string, any> = key === 'menu' ? { strokeLinecap: 'round' } : {}
  if (FILLED_LINE_ICONS.has(key)) {
    return ({ className, style }) => (
      <svg viewBox={def.viewBox} fill="var(--primary)" className={className} style={style}>
        {makePrimitives(def.primitives, {}, 'd')}
      </svg>
    )
  }
  return ({ className, style }) => (
    <svg viewBox={def.viewBox} className={className} style={style}>
      {!def.openShape && makePrimitives(def.primitives, { fill: 'var(--primary)', opacity: 0.2, stroke: 'none' }, 'df')}
      {makePrimitives(def.primitives, { fill: 'none', stroke: 'var(--primary)', strokeWidth: sw, ...extraSvg }, 'ds')}
    </svg>
  )
}

function buildGlyph(key: IconKey, def: Def): IconComponent {
  if (def.openShape) {
    const extraSvg: Record<string, any> = key === 'menu' ? { strokeLinecap: 'round' } : {}
    return ({ className, style }) => (
      <svg viewBox={def.viewBox} fill="none" stroke="currentColor" strokeWidth={2.4} {...extraSvg} className={className} style={style}>
        {makePrimitives(def.primitives, {}, 'g')}
      </svg>
    )
  }
  return ({ className, style }) => (
    <svg viewBox={def.viewBox} fill="currentColor" stroke="none" className={className} style={style}>
      {makePrimitives(def.primitives, {}, 'g')}
    </svg>
  )
}

function buildBadge(key: IconKey, def: Def): IconComponent {
  const Line = buildLine(key, def)
  return ({ className, style }) => (
    <span className={className} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '20%', background: 'var(--primary-soft)', color: 'var(--primary)',
      flexShrink: 0,
      ...style,
    }}>
      <Line className="w-[70%] h-[70%]"/>
    </span>
  )
}

const BUILDERS: Record<IconStyle, (key: IconKey, def: Def) => IconComponent> = {
  line: buildLine,
  duotone: buildDuotone,
  glyph: buildGlyph,
  badge: buildBadge,
}

export function getIconSet(style: IconStyle | undefined): IconSet {
  const builder = BUILDERS[style ?? 'line'] ?? BUILDERS.line
  const set = {} as IconSet
  for (const key of Object.keys(ICONS) as IconKey[]) {
    set[key] = builder(key, ICONS[key])
  }
  return set
}
