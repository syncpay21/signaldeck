/* ════════════════════════════════════════════════════════════════════
   API GUARD — lightweight protection for LLM endpoints.

   Without a proper auth system, any browser tab can POST to /api/generate
   and rack up Anthropic bills. This module provides two layers:

   1. Secret header check — if SIGNALDECK_API_SECRET is set in env,
      every guarded endpoint requires `x-api-secret: <value>` to match.
      Deploy Vercel env var → paste the same value in .env.local.
      Clients get it from NEXT_PUBLIC_API_SECRET (safe; not a real secret,
      just a shared token for your own frontend).

   2. Simple in-process rate limit — max 20 requests per IP per 60s.
      Serverless-friendly (no Redis needed) — resets on cold start, but
      good enough to stop naive scrapers from burning your quota.

   Usage:
     import { guardRequest } from '@/lib/api-guard'
     export default async function handler(req, res) {
       const guard = guardRequest(req)
       if (guard) return res.status(guard.status).json({ error: guard.error })
       // ... rest of handler
     }
═══════════════════════════════════════════════════════════════════ */

import type { NextApiRequest } from 'next'

/* ─── In-process rate limiter ──────────────────────────────────── */
const WINDOW_MS  = 60_000   // 1 minute
const MAX_RPM    = 20       // requests per minute per IP

const buckets = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || now - b.windowStart > WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now })
    return false
  }
  b.count += 1
  if (b.count > MAX_RPM) return true
  return false
}

// Prune old buckets every 5 minutes (keep Map from growing unbounded).
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS
    for (const [ip, b] of buckets) {
      if (b.windowStart < cutoff) buckets.delete(ip)
    }
  }, 5 * 60_000)
}

/* ─── Guard function ────────────────────────────────────────────── */

interface GuardResult { status: 401 | 429; error: string }

export function guardRequest(req: NextApiRequest): GuardResult | null {
  // 1. Secret check — only enforced if SIGNALDECK_API_SECRET is configured.
  const envSecret = process.env.SIGNALDECK_API_SECRET
  if (envSecret) {
    const provided = req.headers['x-api-secret'] as string | undefined
    if (!provided || provided !== envSecret) {
      return { status: 401, error: 'Unauthorized' }
    }
  }

  // 2. Rate limit — per real IP (Vercel sets x-forwarded-for).
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    (req as any).socket?.remoteAddress ||
    'unknown'

  if (isRateLimited(ip)) {
    return { status: 429, error: 'Too many requests. Please wait a minute.' }
  }

  return null
}
