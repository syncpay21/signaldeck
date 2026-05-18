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

/* ─── Persistence via Vercel KV REST API ─────────────────────────────
   KV writes survive cold starts AND are visible across lambda instances —
   the property the in-memory store lacks. If KV env vars are present we
   use them; otherwise we fall back to in-memory so the feature still
   "works" locally / in dev. Plain fetch() so no @vercel/kv dependency. */
const KV_URL   = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
export const KV_ENABLED = Boolean(KV_URL && KV_TOKEN)

async function kvCall(path: string, body?: any): Promise<any> {
  if (!KV_ENABLED) return null
  const res = await fetch(`${KV_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store' as any,
  }).catch(() => null)
  if (!res || !res.ok) return null
  return res.json().catch(() => null)
}

async function kvLpush(key: string, value: string): Promise<void> {
  await kvCall(`/lpush/${encodeURIComponent(key)}/${encodeURIComponent(value)}`)
}
async function kvLrange(key: string, start: number, stop: number): Promise<string[] | null> {
  const r = await kvCall(`/lrange/${encodeURIComponent(key)}/${start}/${stop}`)
  return Array.isArray(r?.result) ? r.result : null
}
async function kvLtrim(key: string, start: number, stop: number): Promise<void> {
  await kvCall(`/ltrim/${encodeURIComponent(key)}/${start}/${stop}`)
}

/** Hash a string to a short hex digest for IP fingerprinting (no raw IPs). */
export function shortHash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0
  return h.toString(16).slice(0, 8)
}

export function recordEvent(ev: SignalEvent) {
  // In-memory write — fast path, also kept as a hot cache in front of KV.
  const store = getStore()
  store.push(ev)
  if (store.length > 5000) store.splice(0, store.length - 5000)
  // KV write — fire-and-forget so the beacon endpoint stays fast. Keep
  // the per-deck list capped at 2000 events so a viral share doesn't run
  // up storage costs.
  if (KV_ENABLED) {
    const key = `sd:deck:${ev.deckId}:events`
    kvLpush(key, JSON.stringify(ev))
      .then(() => kvLtrim(key, 0, 1999))
      .catch(() => {/* swallow — fall back to in-memory */})
  }
}

export async function eventsForDeckAsync(deckId: string): Promise<SignalEvent[]> {
  // KV first when configured (cross-instance + persistent). Fall back to
  // in-memory if KV is off or the call fails for any reason.
  if (KV_ENABLED) {
    const raw = await kvLrange(`sd:deck:${deckId}:events`, 0, 1999)
    if (raw) {
      const parsed: SignalEvent[] = []
      for (const s of raw) {
        try { parsed.push(JSON.parse(s)) } catch {}
      }
      // KV returns newest-first via LPUSH/LRANGE; sort by ts for downstream.
      return parsed.sort((a, b) => a.ts - b.ts)
    }
  }
  return getStore().filter(e => e.deckId === deckId)
}

/** Sync sibling — in-memory only. Kept for callers that don't await. */
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

export async function summariseDeck(deckId: string): Promise<SignalSummary> {
  const events = await eventsForDeckAsync(deckId)
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
