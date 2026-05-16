import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { html, projectName, vercelToken } = req.body
  if (!html || !vercelToken) return res.status(400).json({ error: 'html and vercelToken required' })
  const slug = (projectName || 'pitchdeck').toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').slice(0,50)
  try {
    const r = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: slug, files: [{ file: 'index.html', data: html, encoding: 'utf-8' }], projectSettings: { framework: null }, target: 'production' }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error?.message || 'Vercel deploy failed')
    res.status(200).json({ url: `https://${d.url}`, deploymentId: d.id })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
