/* ════════════════════════════════════════════════════════════════════
   POST /api/recipient-intel

   Founder pastes a LinkedIn URL and a VC firm name; we fan out to
   linkedin.ts + crunchbase.ts in parallel and return a merged bundle
   the deck writer can use to tailor the narrative.

   Body:
     { linkedinUrl?: string, vcFirm?: string }

   Returns:
     {
       recipient: RecipientProfile,
       fund:      VcInvestments,
       fetchedAt: string,
     }

   Cached server-side via a simple in-memory LRU (production should
   move to Vercel KV — see TODO).
═══════════════════════════════════════════════════════════════════ */

import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchRecipientProfile, type RecipientProfile } from '../../lib/intel/linkedin'
import { fetchVcInvestments,    type VcInvestments }    from '../../lib/intel/crunchbase'

interface Bundle {
  recipient: RecipientProfile | null
  fund:      VcInvestments    | null
  fetchedAt: string
}

const CACHE = new Map<string, { ts: number; bundle: Bundle }>()
const TTL_MS = 7 * 24 * 60 * 60 * 1000   // 7 days

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { linkedinUrl, vcFirm } = (req.body || {}) as { linkedinUrl?: string; vcFirm?: string }
  if (!linkedinUrl && !vcFirm) return res.status(400).json({ error: 'linkedinUrl or vcFirm required' })

  const cacheKey = `${linkedinUrl || ''}||${vcFirm || ''}`
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return res.status(200).json(cached.bundle)
  }

  try {
    const [recipient, fund] = await Promise.all([
      linkedinUrl ? fetchRecipientProfile(linkedinUrl) : Promise.resolve(null),
      vcFirm      ? fetchVcInvestments(vcFirm)         : Promise.resolve(null),
    ])
    const bundle: Bundle = {
      recipient: recipient || null,
      fund:      fund      || null,
      fetchedAt: new Date().toISOString(),
    }
    CACHE.set(cacheKey, { ts: Date.now(), bundle })
    res.status(200).json(bundle)
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'intel fetch failed' })
  }
}
