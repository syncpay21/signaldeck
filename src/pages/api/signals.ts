/* ════════════════════════════════════════════════════════════════════
   GET /api/signals?deckId=<id>

   Returns the aggregated viewership summary for a deck — total opens,
   per-slide views + avg dwell, per-session details, and a drop-off
   insight (the slide where most viewers stopped without reaching the
   end). Workspace's Signals tab polls this every 10s.
═══════════════════════════════════════════════════════════════════ */

import type { NextApiRequest, NextApiResponse } from 'next'
import { summariseDeck } from '../../lib/signals-store'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const deckId = String(req.query.deckId || '').trim()
  if (!deckId) return res.status(400).json({ error: 'deckId required' })
  // Cache disabled — counts must be live.
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json(summariseDeck(deckId))
}
