/* ════════════════════════════════════════════════════════════════════
   STAGE B3 — Visual mood + per-slide assignment

   For every slide in the final slide set, deterministically pick:
     - transition      from industryGuide.transitions, biased by slide kind
     - mood            calm-conviction | bold-loud | glassy | editorial | warm
     - bgx / bgy       accent-gradient origin (rotated so slides don't all
                       look identical when scrolling)

   Pure function. No AI. Reuses industry-guide.transitions so the
   agency's design taxonomy stays the single source of truth.

   Slide-kind affinity table is intentional — Validation slides want
   stat-pulse, Vision slides want vortex, Hook slides want zoom-passage.
   When the industry's preferred transitions don't include the affinity
   pick, we fall back to the industry's first transition.
═══════════════════════════════════════════════════════════════════ */

import type { SlideId } from '../types'
import type { IndustryGuide } from '../industry-guide'

export type Mood = 'calm-conviction' | 'bold-loud' | 'glassy' | 'editorial' | 'warm'

export interface SlideVisual {
  transition: string
  mood:       Mood
  bgx:        string   // CSS percentage
  bgy:        string
  accentMix:  'pure' | 'soft' | 'fade'
}

/* ── Slide-kind → preferred transition + mood ─────────────────────── */

const KIND_AFFINITY: Record<string, { tx: string; mood: Mood; accentMix: SlideVisual['accentMix'] }> = {
  s1_intro:        { tx: 'zoom-passage', mood: 'calm-conviction', accentMix: 'pure' },
  s2_situation:    { tx: 'reveal-wipe',  mood: 'editorial',       accentMix: 'soft' },
  s3_problem:      { tx: 'glitch',       mood: 'bold-loud',       accentMix: 'pure' },
  s4_implication:  { tx: 'fold',         mood: 'editorial',       accentMix: 'soft' },
  s5_fix:          { tx: 'reveal-up',    mood: 'calm-conviction', accentMix: 'pure' },
  s6_how:          { tx: 'reveal-stagger', mood: 'glassy',        accentMix: 'soft' },
  s7_validation:   { tx: 'stat-pulse',   mood: 'bold-loud',       accentMix: 'pure' },
  s8_market:       { tx: 'explode',      mood: 'editorial',       accentMix: 'soft' },
  s9_customers:    { tx: 'reveal-stagger', mood: 'warm',          accentMix: 'soft' },
  s10_competition: { tx: 'dropzoom',     mood: 'editorial',       accentMix: 'fade' },
  s11_risks:       { tx: 'fold',         mood: 'glassy',          accentMix: 'fade' },
  s12_team_ask:    { tx: 'prism',        mood: 'warm',            accentMix: 'soft' },
}

/* stat-pulse isn't always in industryGuide.transitions; map to the
   closest visual equivalent the agency reference supports. */
const TX_FALLBACK: Record<string, string> = {
  'stat-pulse':    'reveal-stagger',
  'reveal-up':     'reveal-up',
  'reveal-wipe':   'reveal-wipe',
  'reveal-stagger':'reveal-stagger',
  'zoom-passage':  'zoom-passage',
  'fold':          'fold',
  'warp':          'warp',
  'glitch':        'glitch',
  'dropzoom':      'dropzoom',
  'prism':         'prism',
  'vortex':        'vortex',
  'explode':       'explode',
  'shake':         'shake',
}

/* bg origin rotation — same accent gradient origin on every slide
   makes the deck feel static. Rotate every slide. */
const BG_POSITIONS: { x: string; y: string }[] = [
  { x: '20%', y: '30%' },
  { x: '70%', y: '30%' },
  { x: '60%', y: '70%' },
  { x: '30%', y: '60%' },
  { x: '55%', y: '40%' },
  { x: '40%', y: '50%' },
  { x: '65%', y: '45%' },
  { x: '35%', y: '65%' },
  { x: '50%', y: '50%' },
  { x: '25%', y: '45%' },
  { x: '75%', y: '55%' },
  { x: '45%', y: '35%' },
]

export function assignVisuals(
  slideIds: SlideId[],
  guide: IndustryGuide,
): Record<SlideId, SlideVisual> {
  const allowed = new Set(guide.transitions)
  const out = {} as Record<SlideId, SlideVisual>

  slideIds.forEach((id, i) => {
    const aff = KIND_AFFINITY[id] || { tx: 'reveal-up', mood: 'calm-conviction' as Mood, accentMix: 'soft' as const }
    // Pick affinity transition if industry allows it; else pick the first
    // industry-preferred transition that has a TX_DUR entry.
    let tx = TX_FALLBACK[aff.tx] || aff.tx
    if (!allowed.has(tx)) {
      tx = guide.transitions.find(t => TX_FALLBACK[t]) || aff.tx
    }
    const pos = BG_POSITIONS[i % BG_POSITIONS.length]
    out[id] = { transition: tx, mood: aff.mood, bgx: pos.x, bgy: pos.y, accentMix: aff.accentMix }
  })

  return out
}

/* ── Mood → background gradient overlay descriptor ────────────────── */

export function moodOverlay(mood: Mood, accent: string): string {
  switch (mood) {
    case 'calm-conviction': return `radial-gradient(circle, ${accent}1f, transparent 60%)`
    case 'bold-loud':       return `radial-gradient(circle, ${accent}3a, transparent 50%)`
    case 'glassy':          return `radial-gradient(circle, ${accent}26 0%, transparent 40%), linear-gradient(135deg, rgba(255,255,255,.04), transparent)`
    case 'editorial':       return `linear-gradient(180deg, transparent 0%, ${accent}14 80%)`
    case 'warm':            return `radial-gradient(circle, ${accent}22 0%, transparent 55%)`
  }
}
