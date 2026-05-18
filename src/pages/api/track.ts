/* ════════════════════════════════════════════════════════════════════
   POST /api/track — beacon receiver for deck viewership events.

   CORS is wide-open because deployed decks live on different domains
   (Vercel project, Cloudflare Pages, the founder's own site). Anyone
   can post events; we just store them in memory keyed by deckId.

   Body:
     {
       deckId:     string  (required — the deck identifier baked into the HTML)
       sessionId:  string  (required — uuid the deck generates per-tab)
       event:      'open' | 'slide-view' | 'slide-leave' | 'close' | 'reached-end'
       slideIdx?:  number
       slideLabel?:string
       durationMs?:number
     }

   Returns: { ok: true }  — fire-and-forget, no payload to the deck.
═══════════════════════════════════════════════════════════════════ */

import type { NextApiRequest, NextApiResponse } from 'next'
import { recordEvent, shortHash, type SignalEvent } from '../../lib/signals-store'

const VALID_EVENTS = new Set(['open', 'slide-view', 'slide-leave', 'close', 'reached-end'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Wide CORS — deployed decks call us from arbitrary origins
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST only' })

  try {
    const body = req.body || {}
    if (!body.deckId || typeof body.deckId !== 'string') return res.status(400).json({ error: 'deckId required' })
    if (!body.sessionId || typeof body.sessionId !== 'string') return res.status(400).json({ error: 'sessionId required' })
    if (!VALID_EVENTS.has(body.event)) return res.status(400).json({ error: 'invalid event' })

    const rawIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim()
    const ev: SignalEvent = {
      deckId:     String(body.deckId).slice(0, 64),
      sessionId:  String(body.sessionId).slice(0, 64),
      event:      body.event,
      slideIdx:   typeof body.slideIdx   === 'number' ? body.slideIdx   : undefined,
      slideLabel: typeof body.slideLabel === 'string' ? body.slideLabel.slice(0, 64) : undefined,
      durationMs: typeof body.durationMs === 'number' && body.durationMs >= 0 ? Math.min(body.durationMs, 60 * 60 * 1000) : undefined,
      ts:         Date.now(),
      ip:         rawIp ? shortHash(rawIp) : undefined,
      referer:    (req.headers['referer'] as string || '').slice(0, 200) || undefined,
      userAgent:  (req.headers['user-agent'] as string || '').slice(0, 200) || undefined,
    }
    recordEvent(ev)
    res.status(200).json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'track failed' })
  }
}
