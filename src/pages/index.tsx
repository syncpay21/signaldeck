import { useState, useEffect } from 'react'

type Step = 'company' | 'story' | 'room' | 'scene' | 'building' | 'canvas'

interface FormData {
  company: string
  oneLiner: string
  industry: string
  stage: string
  realStory: string
  problem: string
  solution: string
  howItWorks: string
  traction: string
  market: string
  businessModel: string
  competition: string
  team: string
  ask: string
  audience: string
  goal: string
  founderName: string
  founderRole: string
  location: string
  domain: string
  demoUrl: string
  demoDescription: string
  accentColor: string
  bgColor: string
  fontHeading: string
  fontBody: string
  isDark: boolean
  vercelToken: string
}

const FONTS = [
  'Inter', 'DM Sans', 'Space Grotesk', 'Outfit', 'Syne',
  'Barlow Condensed', 'Raleway', 'Montserrat', 'Bebas Neue', 'Plus Jakarta Sans',
]

const INDUSTRIES = [
  'Fintech', 'Climate', 'Health', 'AI', 'SaaS', 'Enterprise',
  'Developer Tools', 'Consumer', 'Education', 'Other',
]

const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B+', 'Bootstrapped']

const AUDIENCES = ['Seed VC', 'Series A', 'Angel', 'Strategic', 'Internal']

const GOALS = [
  { id: 'Raise', title: 'Raise', desc: 'Close a round.' },
  { id: 'Partner', title: 'Partner', desc: 'Strategic deal.' },
  { id: 'Hire', title: 'Hire', desc: 'Recruit a key exec.' },
  { id: 'Sell', title: 'Sell', desc: 'Customer close.' },
]

const empty: FormData = {
  company: '', oneLiner: '', industry: '', stage: 'Pre-seed',
  realStory: '', problem: '', solution: '', howItWorks: '',
  traction: '', market: '', businessModel: '', competition: '', team: '', ask: '',
  audience: 'Seed VC', goal: 'Raise',
  founderName: '', founderRole: '', location: '', domain: '',
  demoUrl: '', demoDescription: '',
  accentColor: '#0F1115', bgColor: '#06080d',
  fontHeading: 'Inter', fontBody: 'Inter',
  isDark: true, vercelToken: '',
}

const STEP_NUM: Record<string, string> = {
  company: '1 / 4', story: '2 / 4', room: '3 / 4', scene: '4 / 4',
}

const STEP_PROGRESS: Record<string, number> = {
  company: 25, story: 50, room: 75, scene: 100,
}

export default function Home() {
  const [step, setStep] = useState<Step>('company')
  const [form, setForm] = useState<FormData>(empty)
  const [generatedHtml, setGeneratedHtml] = useState('')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [deployUrl, setDeployUrl] = useState('')
  const [error, setError] = useState('')
  const [deployMode, setDeployMode] = useState<'vercel' | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [isRefined, setIsRefined] = useState(false)

  const set = (k: keyof FormData, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', form.accentColor)
  }, [form.accentColor])

  async function generate() {
    setStep('building')
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedHtml(data.html)
      setGeneratedContent(data.content)
      setIsRefined(false)
      setStep('canvas')
    } catch (e: any) {
      setError(e.message)
      setStep('scene')
    }
  }

  async function deployToVercel() {
    setError('')
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: generatedHtml,
          projectName: `${form.company.toLowerCase().replace(/\s+/g, '-')}-deck`,
          vercelToken: form.vercelToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDeployUrl(data.url)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function download() {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: generatedHtml, filename: `${form.company}-deck` }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.company.toLowerCase()}-deck.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function refineWithGpt() {
    setIsRefining(true)
    setError('')
    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedContent, input: form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedHtml(data.html)
      setGeneratedContent(data.content)
      setIsRefined(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsRefining(false)
    }
  }

  // ── Building screen ──────────────────────────────────────────────
  if (step === 'building') {
    return (
      <div className="sd-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div className="sd-spinner" style={{ fontSize: 36, display: 'block', marginBottom: 24 }}>◐</div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Building {form.company}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            Claude is reading your story and composing 12 slides
          </div>
        </div>
      </div>
    )
  }

  // ── Canvas (done) screen ─────────────────────────────────────────
  if (step === 'canvas') {
    return (
      <div className="sd-shell">
        <header className="sd-header">
          <div className="sd-logo">
            <div className="sd-logo-mark" />
            <span className="sd-logo-name">SignalDeck</span>
          </div>
          <span className="sd-step-label" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {form.company} — ready
          </span>
        </header>

        <div className="sd-main">
          <div className="sd-card" style={{ maxWidth: 540 }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>
                Deck deployed
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                12 slides.<br />Your story.
              </h1>
            </div>

            {error && <div className="sd-error">{error}</div>}

            {deployUrl && (
              <div className="sd-success-row" style={{ marginBottom: 16 }}>
                <div className="sd-success-label">Live at</div>
                <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 14, color: 'var(--accent)', wordBreak: 'break-all' }}>{deployUrl}</a>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="sd-btn-primary" style={{ justifyContent: 'center' }} onClick={download}>
                Download HTML
              </button>

              {!isRefined && !isRefining && (
                <button className="sd-refine-btn" onClick={refineWithGpt}>
                  ✦ Run GPT-4o pitch coach
                </button>
              )}

              {isRefining && (
                <div className="sd-refined-badge">
                  <span className="sd-spinner">◐</span>
                  GPT-4o is tearing it apart and rebuilding it…
                </div>
              )}

              {isRefined && (
                <div className="sd-refined-badge">
                  ✓ Pitch coach applied — copy is sharper
                </div>
              )}

              {!deployMode && !deployUrl && (
                <button className="sd-btn-secondary" style={{ justifyContent: 'center' }}
                  onClick={() => setDeployMode('vercel')}>
                  Push to Vercel
                </button>
              )}

              {deployMode === 'vercel' && !deployUrl && (
                <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid var(--line)' }}>
                  <label className="sd-field">
                    <span className="sd-label">Vercel token</span>
                    <input className="sd-input" type="password" value={form.vercelToken}
                      onChange={e => set('vercelToken', e.target.value)}
                      placeholder="vercel.com/account/tokens" />
                  </label>
                  <button className="sd-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                    onClick={deployToVercel}>
                    Deploy →
                  </button>
                </div>
              )}

              <button className="sd-btn-ghost"
                style={{ justifyContent: 'center', opacity: 0.5, fontSize: 13 }}
                onClick={() => {
                  setStep('scene')
                  setGeneratedHtml('')
                  setGeneratedContent(null)
                  setDeployUrl('')
                  setDeployMode(null)
                  setIsRefined(false)
                }}>
                Start over
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const progress = STEP_PROGRESS[step as string] || 0

  return (
    <div className="sd-shell">
      <header className="sd-header">
        <div className="sd-logo">
          <div className="sd-logo-mark" />
          <span className="sd-logo-name">SignalDeck</span>
        </div>
        <span className="sd-step-label">{STEP_NUM[step as string]}</span>
      </header>

      <div className="sd-progress-bar">
        <div className="sd-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="sd-main">
        <div className="sd-card">
          {error && <div className="sd-error">{error}</div>}

          {/* ── 1: The company ── */}
          {step === 'company' && <>
            <h1 className="sd-card-title">Who are you?</h1>
            <p className="sd-card-subtitle">Name it. Own it. We build from here.</p>

            <div className="sd-grid-2">
              <label className="sd-field">
                <span className="sd-label">Company</span>
                <input className="sd-input" value={form.company}
                  onChange={e => set('company', e.target.value)} placeholder="Lattice" autoFocus />
              </label>
              <label className="sd-field">
                <span className="sd-label">Industry</span>
                <select className="sd-select" value={form.industry} onChange={e => set('industry', e.target.value)}>
                  <option value="">Pick one</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </label>
              <label className="sd-field" style={{ gridColumn: '1 / -1' }}>
                <span className="sd-label">One line</span>
                <input className="sd-input" value={form.oneLiner}
                  onChange={e => set('oneLiner', e.target.value)}
                  placeholder="Make management feel human again." />
              </label>
              <label className="sd-field">
                <span className="sd-label">Stage</span>
                <select className="sd-select" value={form.stage} onChange={e => set('stage', e.target.value)}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="sd-field">
                <span className="sd-label">Founder</span>
                <input className="sd-input" value={form.founderName}
                  onChange={e => set('founderName', e.target.value)} placeholder="Jane Smith" />
              </label>
              <label className="sd-field">
                <span className="sd-label">Title</span>
                <input className="sd-input" value={form.founderRole}
                  onChange={e => set('founderRole', e.target.value)} placeholder="CEO" />
              </label>
              <label className="sd-field">
                <span className="sd-label">Domain</span>
                <input className="sd-input" value={form.domain}
                  onChange={e => set('domain', e.target.value)} placeholder="yourco.com" />
              </label>
            </div>

            <div className="sd-nav">
              <span />
              <button className="sd-btn-primary"
                onClick={() => setStep('story')}
                disabled={!form.company || !form.founderName}>
                Next →
              </button>
            </div>
          </>}

          {/* ── 2: The story ── */}
          {step === 'story' && <>
            <h1 className="sd-card-title">What's broken?</h1>
            <p className="sd-card-subtitle">No deck copy. Just the raw truth — Claude turns it cinematic.</p>

            <label className="sd-field">
              <span className="sd-label">The problem</span>
              <textarea className="sd-textarea" rows={3} value={form.problem}
                onChange={e => set('problem', e.target.value)}
                placeholder="Managers fly blind on team performance until it's too late." />
            </label>
            <label className="sd-field">
              <span className="sd-label">The fix</span>
              <textarea className="sd-textarea" rows={3} value={form.solution}
                onChange={e => set('solution', e.target.value)}
                placeholder="Real-time engagement data wired into every 1:1." />
            </label>
            <label className="sd-field">
              <span className="sd-label">How it works</span>
              <textarea className="sd-textarea" rows={2} value={form.howItWorks}
                onChange={e => set('howItWorks', e.target.value)}
                placeholder="Connect → surface signals → act — automated." />
            </label>
            <label className="sd-field">
              <span className="sd-label">Proof</span>
              <textarea className="sd-textarea" rows={2} value={form.traction}
                onChange={e => set('traction', e.target.value)}
                placeholder="$120k ARR, 3 enterprise pilots, 40% MoM growth." />
            </label>
            <label className="sd-field">
              <span className="sd-label">The market</span>
              <textarea className="sd-textarea" rows={2} value={form.market}
                onChange={e => set('market', e.target.value)}
                placeholder="$12B HR tech, 500M knowledge workers globally." />
            </label>
            <label className="sd-field">
              <span className="sd-label">Money</span>
              <textarea className="sd-textarea" rows={2} value={form.businessModel}
                onChange={e => set('businessModel', e.target.value)}
                placeholder="$15 per seat / month. Land teams, expand orgs." />
            </label>
            <label className="sd-field">
              <span className="sd-label">Competition</span>
              <textarea className="sd-textarea" rows={2} value={form.competition}
                onChange={e => set('competition', e.target.value)}
                placeholder="Lattice, Culture Amp — generic surveys, no signals." />
            </label>
            <label className="sd-field">
              <span className="sd-label">The team</span>
              <textarea className="sd-textarea" rows={2} value={form.team}
                onChange={e => set('team', e.target.value)}
                placeholder="Jane: ex-Stripe eng. Tom: ex-McKinsey people ops." />
            </label>
            <label className="sd-field">
              <span className="sd-label">The ask</span>
              <textarea className="sd-textarea" rows={2} value={form.ask}
                onChange={e => set('ask', e.target.value)}
                placeholder="$2M seed. 18mo runway. 5 engineers, 10 enterprise pilots." />
            </label>

            <div className="sd-nav">
              <button className="sd-btn-ghost" onClick={() => setStep('company')}>Back</button>
              <button className="sd-btn-primary" onClick={() => setStep('room')} disabled={!form.problem}>
                Next →
              </button>
            </div>
          </>}

          {/* ── 3: The room ── */}
          {step === 'room' && <>
            <h1 className="sd-card-title">Who's in the room?</h1>
            <p className="sd-card-subtitle">We write differently for a seed VC than a board.</p>

            <div style={{ marginBottom: 20 }}>
              <div className="sd-label" style={{ marginBottom: 8 }}>Audience</div>
              <div className="sd-pill-group">
                {AUDIENCES.map(a => (
                  <button key={a} className={`sd-pill${form.audience === a ? ' active' : ''}`}
                    onClick={() => set('audience', a)}>{a}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="sd-label" style={{ marginBottom: 8 }}>What needs to happen</div>
              <div className="sd-goal-grid">
                {GOALS.map(g => (
                  <button key={g.id} className={`sd-goal-card${form.goal === g.id ? ' active' : ''}`}
                    onClick={() => set('goal', g.id)}>
                    <div>{g.title}</div>
                    <div className="sd-goal-card-desc">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="sd-field">
              <span className="sd-label">Live demo URL <span style={{ opacity: 0.5, fontWeight: 400 }}>— optional</span></span>
              <input className="sd-input" value={form.demoUrl}
                onChange={e => set('demoUrl', e.target.value)}
                placeholder="https://demo.yourco.com" />
            </label>
            <label className="sd-field">
              <span className="sd-label">What it shows</span>
              <textarea className="sd-textarea" rows={2} value={form.demoDescription}
                onChange={e => set('demoDescription', e.target.value)}
                placeholder="What should the investor click on first?" />
            </label>

            <div className="sd-nav">
              <button className="sd-btn-ghost" onClick={() => setStep('story')}>Back</button>
              <button className="sd-btn-primary" onClick={() => setStep('scene')}>Next →</button>
            </div>
          </>}

          {/* ── 4: The scene ── */}
          {step === 'scene' && <>
            <h1 className="sd-card-title">Set the scene.</h1>
            <p className="sd-card-subtitle">Pick your colour. Everything shifts to match. Then we build.</p>

            <label className="sd-field">
              <span className="sd-label">Brand colour</span>
              <div className="sd-color-row">
                <input type="color" className="sd-color-swatch"
                  value={form.accentColor} onChange={e => set('accentColor', e.target.value)} />
                <input className="sd-input" value={form.accentColor}
                  onChange={e => set('accentColor', e.target.value)}
                  placeholder="#0F1115" style={{ flex: 1 }} />
              </div>
            </label>

            <div style={{ marginBottom: 18 }}>
              <div className="sd-label" style={{ marginBottom: 8 }}>Deck mood</div>
              <div className="sd-theme-toggle">
                {[
                  { label: 'Dark', value: true, bg: '#06080d', fg: '#eef2f7' },
                  { label: 'Light', value: false, bg: '#f8f9fa', fg: '#0f1d2e' },
                ].map(t => (
                  <button key={String(t.value)}
                    className={`sd-theme-btn${form.isDark === t.value ? ' active' : ''}`}
                    style={{ background: t.bg, color: t.fg }}
                    onClick={() => { set('isDark', t.value); set('bgColor', t.bg) }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sd-grid-2" style={{ marginBottom: 0 }}>
              <label className="sd-field">
                <span className="sd-label">Heading font</span>
                <select className="sd-select" value={form.fontHeading} onChange={e => set('fontHeading', e.target.value)}>
                  {FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
              </label>
              <label className="sd-field">
                <span className="sd-label">Body font</span>
                <select className="sd-select" value={form.fontBody} onChange={e => set('fontBody', e.target.value)}>
                  {FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
              </label>
            </div>

            <div className="sd-nav">
              <button className="sd-btn-ghost" onClick={() => setStep('room')}>Back</button>
              <button className="sd-btn-primary" onClick={generate}>Build the deck →</button>
            </div>
          </>}

        </div>
      </div>
    </div>
  )
}
