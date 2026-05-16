import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { html, filename } = req.body
  if (!html) return res.status(400).json({ error: 'html required' })
  const safe = (filename || 'pitchdeck').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-') + '.html'
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`)
  res.status(200).send(html)
}
