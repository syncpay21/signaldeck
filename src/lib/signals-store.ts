/* ════════════════════════════════════════════════════════════════════
   SIGNALS STORE — in-memory event log for deck viewership.

   Each event:
     - deckId        which deck the view belongs to
     - sessionId     anonymous per-viewer/per-tab id (uuid in localStorage)
     - event         'open' | 'slide-view' | 'slide-leave' | 'close' | 'reached-end'
     - slideIdx      which slide (for view/leave events)
     - durationMs    how long the slide was on screen (for leave events)
     - ts            ms epoch when the event was recorded
     - ip            best-effort fingerprint (hashed, NOT raw)
     - referer       where the view came from
     - userAgent     basic UA string for "what device opened it"

   Storage: process-global memory only. Survives warm lambda invocations
   but NOT cold starts. For persistence the founder needs to wire Vercel
   KV / D1 / Supabase — left as a TODO with a clearly-marked extension
   point (the persist() function below).
═══════════════════════════════════════════════════════════════════ */

export type SignalEventName = 'open' | 'slide-view' | 'slide-leave' | 'close' | 'reached-end'

export interface SignalEvent {
  deckId:      string
  sessionId:   string
  event:       SignalEventName
  slideIdx?:   number
  slideLabel?: string
  durationMs?: number
  ts:          number
  ip?:         string
  referer?:    string
  userAgent?:  string
}

declare global {
  // eslint-disable-next-line no-var
  var __signalEvents: SignalEvent[] | undefined
}

function getStore(): SignalEvent[] {
  if (!globalThis.__signalEvents) globalThis.__signalEvents = []
  return globalThis.__signalEvents
}

/** Hash a string to a short hex digest for IP fingerprinting (no raw IPs). */
export function shortHash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0
  return h.toString(16).slice(0, 8)
}

export function recordEvent(ev: SignalEvent) {
  const store = getStore()
  store.push(ev)
  // Cap memory: keep the most recent 5000 events. Old ones drop off.
  if (store.length > 5000) store.splice(0, store.length - 5000)
  // EXTENSION POINT: if (process.env.VERCEL_KV_URL) kvWrite(ev)
}

export function eventsForDeck(deckId: string): SignalEvent[] {
  return getStore().filter(e => e.deckId === deckId)
}

export interface SignalSummary {
  deckId:        string
  totalSessions: number
  totalOpens:    number
  reachedEnd:    number
  lastSeenTs:    number | null
  slides:        Array<{
    idx:         number
    label:       string
    views:       number
    totalDurMs:  number
    avgDurMs:    number
  }>
  sessions:      Array<{
    sessionId:    string
    openedTs:     number
    lastSeenTs:   number
    reachedEnd:   boolean
    slidesViewed: number
    deviceHint:   string  // best-effort: 'iPhone', 'Mac', 'Android', 'Windows'…
    referer:      string
  }>
  /** Drop-off insight: the slide where most sessions stopped viewing. */
  dropOffSlide:  { idx: number; label: string; sessions: number } | null
}

function deviceHint(ua: string | undefined): string {
  if (!ua) return 'unknown'
  if (/iPhone/.test(ua))   return 'iPhone'
  if (/iPad/.test(ua))     return 'iPad'
  if (/Android/.test(ua))  return 'Android'
  if (/Macintosh/.test(ua))return 'Mac'
  if (/Windows/.test(ua))  return 'Windows'
  return 'unknown'
}

export function summariseDeck(deckId: string): SignalSummary {
  const events = eventsForDeck(deckId)
  const bySession = new Map<string, SignalEvent[]>()
  for (const e of events) {
    const arr = bySession.get(e.sessionId) || []
    arr.push(e)
    bySession.set(e.sessionId, arr)
  }

  // Per-slide aggregates
  const slideMap = new Map<number, { idx: number; label: string; views: number; totalDurMs: number }>()
  for (const e of events) {
    if (e.event === 'slide-view' || e.event === 'slide-leave') {
      const idx = e.slideIdx ?? -1
      if (idx < 0) continue
      const row = slideMap.get(idx) || { idx, label: e.slideLabel || '', views: 0, totalDurMs: 0 }
      if (e.event === 'slide-view') row.views += 1
      if (e.event === 'slide-leave' && e.durationMs) row.totalDurMs += e.durationMs
      if (e.slideLabel) row.label = e.slideLabel
      slideMap.set(idx, row)
    }
  }
  const slides = Array.from(slideMap.values())
    .map(s => ({ ...s, avgDurMs: s.views > 0 ? Math.round(s.totalDurMs / s.views) : 0 }))
    .sort((a, b) => a.idx - b.idx)

  // Per-session summary
  const sessions = Array.from(bySession.entries()).map(([sid, arr]) => {
    const sorted = arr.slice().sort((a, b) => a.ts - b.ts)
    const openedTs = sorted.find(e => e.event === 'open')?.ts ?? sorted[0].ts
    const lastSeenTs = sorted[sorted.length - 1].ts
    const reachedEnd = arr.some(e => e.event === 'reached-end')
    const slidesViewed = new Set(arr.filter(e => e.event === 'slide-view').map(e => e.slideIdx)).size
    const ua = arr.find(e => e.userAgent)?.userAgent
    const ref = arr.find(e => e.referer)?.referer || ''
    return {
      sessionId: sid,
      openedTs,
      lastSeenTs,
      reachedEnd,
      slidesViewed,
      deviceHint: deviceHint(ua),
      referer: ref,
    }
  }).sort((a, b) => b.lastSeenTs - a.lastSeenTs)

  // Drop-off: the highest slide index where many sessions stopped
  let dropOff: { idx: number; label: string; sessions: number } | null = null
  if (sessions.length > 0 && slides.length > 0) {
    const lastSlideBySession = new Map<string, number>()
    for (const e of events) {
      if (e.event === 'slide-view' && typeof e.slideIdx === 'number') {
        lastSlideBySession.set(e.sessionId, Math.max(lastSlideBySession.get(e.sessionId) ?? -1, e.slideIdx))
      }
    }
    const counts = new Map<number, number>()
    for (const idx of lastSlideBySession.values()) counts.set(idx, (counts.get(idx) || 0) + 1)
    // Drop-off is the most common "last slide" that is NOT the final slide
    const finalIdx = slides[slides.length - 1].idx
    let bestIdx = -1, bestCount = 0
    for (const [idx, c] of counts.entries()) {
      if (idx === finalIdx) continue
      if (c > bestCount) { bestIdx = idx; bestCount = c }
    }
    if (bestIdx >= 0) {
      const lbl = slides.find(s => s.idx === bestIdx)?.label || `slide ${bestIdx + 1}`
      dropOff = { idx: bestIdx, label: lbl, sessions: bestCount }
    }
  }

  return {
    deckId,
    totalSessions: bySession.size,
    totalOpens:    events.filter(e => e.event === 'open').length,
    reachedEnd:    Array.from(bySession.values()).filter(arr => arr.some(e => e.event === 'reached-end')).length,
    lastSeenTs:    events.length ? Math.max(...events.map(e => e.ts)) : null,
    slides,
    sessions,
    dropOffSlide:  dropOff,
  }
}
