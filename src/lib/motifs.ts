/* ════════════════════════════════════════════════════════════════════
   MOTIFS — industry-specific SVG background patterns

   Per the spec: "the background should be meaningful". These return
   inline SVG data URLs the renderer can apply as background-image on
   any slide-bg layer. Each motif is recognisable to the industry
   (payment rails for fintech, court lines for sports, route waypoints
   for logistics, etc.) and uses the BrandWorld's primary colour at
   low opacity so it reads as texture, not decoration.

   Pure functions. Server-safe. No deps.
═══════════════════════════════════════════════════════════════════ */

type MotifBuilder = (colour: string) => string

/* ── Builders — each returns a complete SVG document string ────── */

const paymentRails: MotifBuilder = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
  <g stroke="${c}" stroke-opacity="0.18" stroke-width="1" fill="none">
    <line x1="0" y1="40" x2="200" y2="40"/>
    <line x1="0" y1="60" x2="200" y2="60"/>
    <line x1="0" y1="80" x2="200" y2="80"/>
  </g>
  <g fill="${c}" fill-opacity="0.35">
    <circle cx="40" cy="40" r="2"/>
    <circle cx="100" cy="60" r="2"/>
    <circle cx="160" cy="80" r="2"/>
  </g>
</svg>`

const courtLines: MotifBuilder = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="180" viewBox="0 0 280 180">
  <g stroke="${c}" stroke-opacity="0.22" stroke-width="1.2" fill="none">
    <rect x="6" y="6" width="268" height="168" rx="2"/>
    <line x1="140" y1="6" x2="140" y2="174"/>
    <circle cx="140" cy="90" r="22"/>
    <path d="M 6 30 L 60 30 L 60 150 L 6 150 Z"/>
    <path d="M 220 30 L 274 30 L 274 150 L 220 150 Z"/>
  </g>
</svg>`

const topographic: MotifBuilder = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
  <g stroke="${c}" stroke-opacity="0.18" stroke-width="1" fill="none">
    <path d="M 0 80 Q 60 60 120 80 T 240 80"/>
    <path d="M 0 100 Q 60 80 120 100 T 240 100"/>
    <path d="M 0 60 Q 60 40 120 60 T 240 60"/>
    <path d="M 0 120 Q 60 100 120 120 T 240 120"/>
    <path d="M 0 40 Q 60 20 120 40 T 240 40"/>
  </g>
</svg>`

const routeWaypoints: MotifBuilder = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
  <g stroke="${c}" stroke-opacity="0.25" stroke-width="1.2" fill="none" stroke-dasharray="3 4">
    <path d="M 20 130 Q 70 120 100 90 Q 130 60 180 50 Q 210 45 230 30"/>
  </g>
  <g fill="${c}" fill-opacity="0.4">
    <circle cx="20" cy="130" r="3"/>
    <circle cx="100" cy="90" r="3"/>
    <circle cx="180" cy="50" r="3"/>
    <circle cx="230" cy="30" r="3"/>
  </g>
</svg>`

const documentGrid: MotifBuilder = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240" viewBox="0 0 200 240">
  <g stroke="${c}" stroke-opacity="0.12" stroke-width="0.5" fill="none">
    <line x1="20" y1="0" x2="20" y2="240"/>
    <line x1="0" y1="40" x2="200" y2="40"/>
    <line x1="0" y1="60" x2="200" y2="60"/>
    <line x1="0" y1="80" x2="200" y2="80"/>
    <line x1="0" y1="100" x2="200" y2="100"/>
    <line x1="0" y1="120" x2="200" y2="120"/>
    <line x1="0" y1="140" x2="200" y2="140"/>
    <line x1="0" y1="160" x2="200" y2="160"/>
    <line x1="0" y1="180" x2="200" y2="180"/>
    <line x1="0" y1="200" x2="200" y2="200"/>
  </g>
</svg>`

const terminalBlocks: MotifBuilder = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
  <g fill="${c}" fill-opacity="0.12">
    <rect x="20" y="20" width="60" height="6" rx="1"/>
    <rect x="20" y="34" width="120" height="6" rx="1"/>
    <rect x="40" y="48" width="80" height="6" rx="1"/>
    <rect x="40" y="62" width="100" height="6" rx="1"/>
    <rect x="20" y="84" width="40" height="6" rx="1"/>
    <rect x="20" y="98" width="140" height="6" rx="1"/>
    <rect x="40" y="112" width="60" height="6" rx="1"/>
  </g>
</svg>`

const learningPath: MotifBuilder = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">
  <g stroke="${c}" stroke-opacity="0.22" stroke-width="1" fill="none">
    <line x1="20" y1="60" x2="60" y2="60"/>
    <line x1="80" y1="60" x2="120" y2="60"/>
    <line x1="140" y1="60" x2="180" y2="60"/>
    <line x1="200" y1="60" x2="230" y2="60"/>
  </g>
  <g fill="${c}" fill-opacity="0.35">
    <circle cx="70" cy="60" r="6"/>
    <circle cx="130" cy="60" r="6"/>
    <circle cx="190" cy="60" r="6"/>
  </g>
</svg>`

const ledgerRows: MotifBuilder = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <g stroke="${c}" stroke-opacity="0.14" stroke-width="1" fill="none">
    <line x1="0" y1="30" x2="320" y2="30"/>
    <line x1="0" y1="60" x2="320" y2="60"/>
    <line x1="0" y1="90" x2="320" y2="90"/>
    <line x1="0" y1="120" x2="320" y2="120"/>
    <line x1="0" y1="150" x2="320" y2="150"/>
    <line x1="120" y1="0" x2="120" y2="180"/>
    <line x1="220" y1="0" x2="220" y2="180"/>
  </g>
</svg>`

/* ── Keyword → builder map. Matches loose phrases from BrandWorld.motifs ── */
const MOTIF_MAP: { keys: RegExp; builder: MotifBuilder; name: string }[] = [
  { keys: /payment[-\s]?rail|ledger|statement|reconcil/i,    builder: paymentRails,  name: 'payment-rails' },
  { keys: /ledger[-\s]?rows|transaction[-\s]?row|account[-\s]?row/i, builder: ledgerRows, name: 'ledger-rows' },
  { keys: /court|arena|scoreboard|basketball|stadium|field/i, builder: courtLines,    name: 'court-lines' },
  { keys: /topograph|contour|elevation|carbon|emission|climate/i, builder: topographic, name: 'topographic' },
  { keys: /route|waypoint|map|fleet|warehouse|delivery|logistic/i, builder: routeWaypoints, name: 'route-waypoints' },
  { keys: /document|clause|contract|page|paragraph|legal/i,   builder: documentGrid,  name: 'document-grid' },
  { keys: /terminal|code|api|cli|developer|terminal/i,        builder: terminalBlocks, name: 'terminal-blocks' },
  { keys: /learning|path|progress|step|module|lesson/i,       builder: learningPath,   name: 'learning-path' },
]

/** Pick the best motif for a given BrandWorld.motifs[] list. */
export function pickMotif(motifs: string[]): string | null {
  for (const m of motifs) {
    for (const entry of MOTIF_MAP) {
      if (entry.keys.test(m)) return entry.name
    }
  }
  return null
}

/** Return a CSS `background-image: url('data:image/svg+xml,...')` string for the named motif. */
export function motifBackgroundCss(motifName: string | null, colour: string): string {
  if (!motifName) return ''
  const entry = MOTIF_MAP.find(e => e.name === motifName)
  if (!entry) return ''
  const svg = entry.builder(colour)
  // URL-encode for use in CSS url()
  const encoded = svg.replace(/"/g, "'").replace(/\s+/g, ' ').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')
  return `url("data:image/svg+xml;charset=utf-8,${encoded}")`
}

/** Convenience: take a BrandWorld and return both the chosen motif name and its CSS background. */
export function brandWorldMotifBackground(motifs: string[], colour: string): { name: string | null; css: string } {
  const name = pickMotif(motifs)
  return { name, css: motifBackgroundCss(name, colour) }
}
