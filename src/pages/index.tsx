import { useState, useEffect } from 'react'

type Step = 'company' | 'story' | 'purpose' | 'brand' | 'generating' | 'done'

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
  { id: 'Raise', title: 'Raise capital', desc: 'Pitch to an investor.' },
  { id: 'Partner', title: 'Partner', desc: 'Land a strategic partner.' },
  { id: 'Hire', title: 'Hire', desc: 'Recruit a key role.' },
  { id: 'Sell', title: 'Sell', desc: 'Customer or board pitch.' },
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

const STEP_LABELS: Record<string, string> = {
  company: 'Step 1 of 4',
  story: 'Step 2 of 4',
  purpose: 'Step 3 of 4',
  brand: 'Step 4 of 4',
  generating: '',
  done: '',
}

const STEP_PROGRESS: Record<string, number> = {
  company: 25, story: 50, purpose: 75, brand: 100,
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

  // Sync accent color to CSS variable so buttons/progress update live
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', form.accentColor)
  }, [form.accentColor])

  async function generate() {
    setStep('generating')
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
      setStep('done')
    } catch (e: any) {
      setError(e.message)
      setStep('brand')
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
          projectName: `${form.company.toLowerCase().replace(/\s+/g, '-')}-pitchdeck`,
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
      body: JSON.stringify({ html: generatedHtml, filename: `${form.company}-pitchdeck` }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.company.toLowerCase()}-pitchdeck.html`
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

  if (step === 'generating') {
    return (
      <div className="sd-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="sd-spinner" style={{ fontSize: 40, display: 'block', marginBottom: 20 }}>◐</div>
          <div style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 6 }}>Generating your deck…</div>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', opacity: 0.6 }}>Claude is crafting your cinematic pitch</div>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="sd-shell">
        <header className="sd-header">
          <div className="sd-logo">
            <div className="sd-logo-mark" />
            <span className="sd-logo-name">SignalDeck</span>
          </div>
        </header>
        <div className="sd-main">
          <div className="sd-card" style={{ maxWidth: 560 }}>
            <h1 className="sd-card-title">Your deck is ready</h1>
            <p className="sd-card-subtitle">{form.company} pitch deck — cinematic, investor-grade, and yours.</p>

            {error && <div className="sd-error">{error}</div>}

            {deployUrl && (
              <div className="sd-success-row" style={{ marginBottom: 20 }}>
                <div className="sd-success-label">Deployed</div>
                <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 14, color: 'var(--accent)', wordBreak: 'break-all' }}>{deployUrl}</a>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="sd-btn-primary" onClick={download}>Download HTML</button>

              {!isRefined && !isRefining && (
                <button className="sd-refine-btn" onClick={refineWithGpt}>
                  ✦ Sharpen copy with GPT-4o
                </button>
              )}

              {isRefining && (
                <div className="sd-refined-badge" style={{ color: '#6366f1', background: '#f5f3ff' }}>
                  <span className="sd-spinner">◐</span>
                  GPT-4o is critiquing and sharpening your copy…
                </div>
              )}

              {isRefined && (
                <div className="sd-refined-badge">
                  ✓ Copy sharpened by GPT-4o pitch coach
                </div>
              )}

              {!deployMode && (
                <button className="sd-btn-secondary" onClick={() => setDeployMode('vercel')}>
                  Deploy to Vercel →
                </button>
              )}

              {deployMode === 'vercel' && !deployUrl && (
                <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid var(--line)' }}>
                  <label className="sd-field">
                    <span className="sd-label">Vercel API Token</span>
                    <input className="sd-input" type="password" value={form.vercelToken}
                      onChange={e => set('vercelToken', e.target.value)}
                      placeholder="Get yours at vercel.com/account/tokens" />
                  </label>
                  <button className="sd-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                    onClick={deployToVercel}>
                    Push to Vercel
                  </button>
                </div>
              )}

              <button className="sd-btn-ghost" style={{ width: '100%', justifyContent: 'center', opacity: 0.6 }}
                onClick={() => { setStep('brand'); setGeneratedHtml(''); setGeneratedContent(null); setDeployUrl(''); setDeployMode(null); setIsRefined(false) }}>
                ← Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const progress = STEP_PROGRESS[step] || 0

  return (
    <div className="sd-shell">
      <header className="sd-header">
        <div className="sd-logo">
          <div className="sd-logo-mark" />
          <span className="sd-logo-name">SignalDeck</span>
        </div>
        <span className="sd-step-label">{STEP_LABELS[step]}</span>
      </header>

      <div className="sd-progress-bar">
        <div className="sd-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="sd-main">
        <div className="sd-card">

          {error && <div className="sd-error">{error}</div>}

          {/* ── Step 1: Company basics ── */}
          {step === 'company' && <>
            <h1 className="sd-card-title">Tell us about your startup</h1>
            <p className="sd-card-subtitle">Start with the basics — we'll use this to build your narrative.</p>

            <div className="sd-grid-2">
              <label className="sd-field">
                <span className="sd-label">Startup name</span>
                <input className="sd-input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Inc." />
              </label>
              <label className="sd-field">
                <span className="sd-label">Industry</span>
                <select className="sd-select" value={form.industry} onChange={e => set('industry', e.target.value)}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </label>
              <label className="sd-field" style={{ gridColumn: '1 / -1' }}>
                <span className="sd-label">One-liner</span>
                <input className="sd-input" value={form.oneLiner} onChange={e => set('oneLiner', e.target.value)} placeholder="What do you do, in one sentence." />
              </label>
              <label className="sd-field">
                <span className="sd-label">Stage</span>
                <select className="sd-select" value={form.stage} onChange={e => set('stage', e.target.value)}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="sd-field">
                <span className="sd-label">Founder name</span>
                <input className="sd-input" value={form.founderName} onChange={e => set('founderName', e.target.value)} placeholder="Jane Smith" />
              </label>
              <label className="sd-field">
                <span className="sd-label">Founder role</span>
                <input className="sd-input" value={form.founderRole} onChange={e => set('founderRole', e.target.value)} placeholder="CEO & Co-founder" />
              </label>
              <label className="sd-field">
                <span className="sd-label">Domain</span>
                <input className="sd-input" value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="yourcompany.com" />
              </label>
            </div>

            <div className="sd-nav">
              <span />
              <button className="sd-btn-primary" onClick={() => setStep('story')} disabled={!form.company || !form.founderName}>
                Continue →
              </button>
            </div>
          </>}

          {/* ── Step 2: Story ── */}
          {step === 'story' && <>
            <h1 className="sd-card-title">The real story</h1>
            <p className="sd-card-subtitle">Skip the polish. Tell us what made you start this — and what you've found.</p>

            <label className="sd-field">
              <span className="sd-label">The problem</span>
              <textarea className="sd-textarea" rows={3} value={form.problem} onChange={e => set('problem', e.target.value)}
                placeholder="Describe the pain your customers feel today…" />
            </label>
            <label className="sd-field">
              <span className="sd-label">Your solution</span>
              <textarea className="sd-textarea" rows={3} value={form.solution} onChange={e => set('solution', e.target.value)}
                placeholder="How does your product solve it uniquely?" />
            </label>
            <label className="sd-field">
              <span className="sd-label">How it works</span>
              <textarea className="sd-textarea" rows={2} value={form.howItWorks} onChange={e => set('howItWorks', e.target.value)}
                placeholder="Step 1 → Step 2 → Step 3 — keep it simple" />
            </label>
            <label className="sd-field">
              <span className="sd-label">Traction</span>
              <textarea className="sd-textarea" rows={2} value={form.traction} onChange={e => set('traction', e.target.value)}
                placeholder="Revenue, customers, pilots, LOIs, growth rate…" />
            </label>
            <label className="sd-field">
              <span className="sd-label">Market</span>
              <textarea className="sd-textarea" rows={2} value={form.market} onChange={e => set('market', e.target.value)}
                placeholder="Market size, target segment, geography…" />
            </label>
            <label className="sd-field">
              <span className="sd-label">Business model</span>
              <textarea className="sd-textarea" rows={2} value={form.businessModel} onChange={e => set('businessModel', e.target.value)}
                placeholder="How do you make money? Pricing model?" />
            </label>
            <label className="sd-field">
              <span className="sd-label">Competition</span>
              <textarea className="sd-textarea" rows={2} value={form.competition} onChange={e => set('competition', e.target.value)}
                placeholder="Who else plays here and why you win?" />
            </label>
            <label className="sd-field">
              <span className="sd-label">Team</span>
              <textarea className="sd-textarea" rows={2} value={form.team} onChange={e => set('team', e.target.value)}
                placeholder="Founder backgrounds and why you're the right team?" />
            </label>
            <label className="sd-field">
              <span className="sd-label">The ask</span>
              <textarea className="sd-textarea" rows={2} value={form.ask} onChange={e => set('ask', e.target.value)}
                placeholder="How much are you raising and what will you use it for?" />
            </label>

            <div className="sd-nav">
              <button className="sd-btn-ghost" onClick={() => setStep('company')}>Back</button>
              <button className="sd-btn-primary" onClick={() => setStep('purpose')} disabled={!form.problem}>Continue →</button>
            </div>
          </>}

          {/* ── Step 3: Purpose ── */}
          {step === 'purpose' && <>
            <h1 className="sd-card-title">Deck purpose</h1>
            <p className="sd-card-subtitle">Who is this pitch going to, and what should happen after they read it?</p>

            <div style={{ marginBottom: 18 }}>
              <div className="sd-label" style={{ marginBottom: 8 }}>Audience</div>
              <div className="sd-pill-group">
                {AUDIENCES.map(a => (
                  <button key={a} className={`sd-pill${form.audience === a ? ' active' : ''}`} onClick={() => set('audience', a)}>{a}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div className="sd-label" style={{ marginBottom: 8 }}>Goal</div>
              <div className="sd-goal-grid">
                {GOALS.map(g => (
                  <button key={g.id} className={`sd-goal-card${form.goal === g.id ? ' active' : ''}`} onClick={() => set('goal', g.id)}>
                    <div>{g.title}</div>
                    <div className="sd-goal-card-desc">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="sd-field">
              <span className="sd-label">Demo URL <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>(optional iframe embed)</span></span>
              <input className="sd-input" value={form.demoUrl} onChange={e => set('demoUrl', e.target.value)} placeholder="https://demo.yourapp.com" />
            </label>
            <label className="sd-field">
              <span className="sd-label">What does the demo show?</span>
              <textarea className="sd-textarea" rows={2} value={form.demoDescription} onChange={e => set('demoDescription', e.target.value)}
                placeholder="What should the investor interact with?" />
            </label>

            <div className="sd-nav">
              <button className="sd-btn-ghost" onClick={() => setStep('story')}>Back</button>
              <button className="sd-btn-primary" onClick={() => setStep('brand')}>Continue →</button>
            </div>
          </>}

          {/* ── Step 4: Brand ── */}
          {step === 'brand' && <>
            <h1 className="sd-card-title">Your brand</h1>
            <p className="sd-card-subtitle">This becomes your deck's visual identity — colors, fonts, tone.</p>

            <label className="sd-field">
              <span className="sd-label">Accent color</span>
              <div className="sd-color-row">
                <input type="color" className="sd-color-swatch" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} />
                <input className="sd-input" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} placeholder="#0F1115" style={{ flex: 1 }} />
              </div>
            </label>

            <div style={{ marginBottom: 18 }}>
              <div className="sd-label" style={{ marginBottom: 8 }}>Theme</div>
              <div className="sd-theme-toggle">
                {[{ label: 'Dark', value: true, bg: '#06080d', fg: '#eef2f7' }, { label: 'Light', value: false, bg: '#f8f9fa', fg: '#0f1d2e' }].map(t => (
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
              <button className="sd-btn-ghost" onClick={() => setStep('purpose')}>Back</button>
              <button className="sd-btn-primary" onClick={generate}>Generate Deck ✦</button>
            </div>
          </>}

        </div>
      </div>
    </div>
  )
}
