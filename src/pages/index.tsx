import { useState, useEffect, useRef } from 'react'
import Workspace from '@/components/Workspace'

type Step = 'basics' | 'story' | 'purpose' | 'brand' | 'building' | 'canvas'

interface FormData {
  company: string
  oneLiner: string
  industry: string
  stage: string
  realStory: string
  promptsUsed: string[]
  audience: string
  goal: string
  websiteUrl: string
  accentColor: string
  bgColor: string
  isDark: boolean
  founderName: string
  founderRole: string
  domain: string
}

const INDUSTRIES = ['Fintech', 'Climate', 'Health', 'AI', 'SaaS', 'Enterprise', 'Developer Tools', 'Consumer', 'Education', 'Other']
const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B+', 'Bootstrapped']
const AUDIENCES = ['Seed VC', 'Series A', 'Angel', 'Strategic', 'Internal']
const GOALS = [
  { id: 'Raise', title: 'Raise capital', desc: 'Pitch to an investor.' },
  { id: 'Partner', title: 'Partner', desc: 'Land a strategic partner.' },
  { id: 'Hire', title: 'Hire', desc: 'Recruit a key role.' },
  { id: 'Sell', title: 'Sell', desc: 'Customer or board pitch.' },
]
const PROMPTS = ['What broke?', 'Who is hurting?', 'Why are you the one?', 'What did you try first?', 'What changed?']

const empty: FormData = {
  company: '', oneLiner: '', industry: '', stage: 'Pre-seed',
  realStory: '', promptsUsed: [],
  audience: 'Seed VC', goal: 'Raise',
  websiteUrl: '',
  accentColor: '#0F1115', bgColor: '#ffffff', isDark: false,
  founderName: '', founderRole: '', domain: '',
}

export default function Home() {
  const [step, setStep] = useState<Step>('basics')
  const [form, setForm] = useState<FormData>(empty)
  const [generatedHtml, setGeneratedHtml] = useState('')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [error, setError] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [detectedColors, setDetectedColors] = useState<string[]>([])
  const debounceRef = useRef<any>(null)

  const set = (k: keyof FormData, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', form.accentColor)
  }, [form.accentColor])

  const togglePrompt = (p: string) => {
    const used = form.promptsUsed.includes(p)
      ? form.promptsUsed.filter(x => x !== p)
      : [...form.promptsUsed, p]
    set('promptsUsed', used)
  }

  const tryDetect = (url: string) => {
    if (!url || !url.startsWith('http')) return
    setDetecting(true)
    setDetectedColors([])
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/brand?domain=${encodeURIComponent(url)}`)
        const data = await res.json()
        if (data.colors?.length) {
          setDetectedColors(data.colors)
          set('accentColor', data.colors[0])
        }
      } catch {}
      setDetecting(false)
    }, 900)
  }

  async function generate() {
    setStep('building')
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // realStory maps to the generate API's structured fields
          problem: form.realStory,
          solution: '', howItWorks: '', traction: '', market: '',
          businessModel: '', competition: '', team: '', ask: '',
          demoUrl: '', demoDescription: '',
          fontHeading: 'Inter', fontBody: 'Inter',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedHtml(data.html)
      setGeneratedContent(data.content)
      setStep('canvas')
    } catch (e: any) {
      setError(e.message)
      setStep('brand')
    }
  }

  // ── Building ──────────────────────────────────────────────────────────
  if (step === 'building') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        <div className="text-center" style={{ maxWidth: 320 }}>
          <div className="sd-spinner" style={{ fontSize: 36, display: 'block', marginBottom: 24 }}>◐</div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Building {form.company}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            Claude is reading your story and composing slides
          </div>
        </div>
      </div>
    )
  }

  // ── Workspace ─────────────────────────────────────────────────────────
  if (step === 'canvas') {
    return (
      <Workspace
        company={form.company}
        accentColor={form.accentColor}
        generatedHtml={generatedHtml}
        generatedContent={generatedContent}
        onRestart={() => {
          setStep('basics')
          setForm(empty)
          setGeneratedHtml('')
          setGeneratedContent(null)
          setDetectedColors([])
          document.documentElement.style.setProperty('--accent', empty.accentColor)
        }}
      />
    )
  }

  const stepNum = ({ basics: 1, story: 2, purpose: 3, brand: 4 } as any)[step] || 1
  const total = 4

  const NavRow = ({ onBack, onNext, nextLabel = 'Continue', canNext = true, isFirst = false }: any) => (
    <div className="mt-8 flex items-center justify-between">
      {isFirst ? <span /> : (
        <button onClick={onBack}
          className="h-10 px-4 text-sm rounded-xl font-medium focus-ring inline-flex items-center gap-2"
          style={{ color: 'var(--ink-muted)' }}>
          Back
        </button>
      )}
      <button onClick={onNext} disabled={!canNext}
        className="h-10 px-4 text-sm rounded-xl font-medium text-white shadow-card hover:opacity-95 disabled:opacity-40 focus-ring inline-flex items-center gap-2"
        style={{ background: 'var(--accent)' }}>
        {nextLabel}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>

      {/* ── Header ── */}
      <header className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg" style={{ background: 'var(--accent)', transition: 'background 0.2s' }} />
          <span className="font-semibold tracking-tight">SignalDeck</span>
        </div>
        <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>Step {stepNum} of {total}</span>
      </header>

      {/* ── Progress ── */}
      <div className="px-8">
        <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'var(--surface)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(stepNum / total) * 100}%`, background: 'var(--accent)' }} />
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-[680px]">

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: '#fbe8e5', border: '1px solid #f3c3be', color: '#b0322b' }}>
              {error}
            </div>
          )}

          <div className="paper hairline rounded-[18px] shadow-card p-10">

            {/* ── Step 1: Basics ─────────────────────────────────────── */}
            {step === 'basics' && <>
              <h1 className="text-[28px] font-semibold tracking-tight">Tell us about your startup</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                Just the basics. We'll build the story from here.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <label className="block">
                  <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>Startup name</div>
                  <input autoFocus value={form.company} onChange={e => set('company', e.target.value)}
                    placeholder="Acme"
                    className="w-full h-10 paper hairline rounded-xl px-3 focus-ring text-sm" />
                </label>
                <label className="block">
                  <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>Industry</div>
                  <select value={form.industry} onChange={e => set('industry', e.target.value)}
                    className="w-full h-10 paper hairline rounded-xl px-3 focus-ring text-sm appearance-none">
                    <option value="">Select</option>
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>One-liner</div>
                  <input value={form.oneLiner} onChange={e => set('oneLiner', e.target.value)}
                    placeholder="What do you do, in one sentence."
                    className="w-full h-10 paper hairline rounded-xl px-3 focus-ring text-sm" />
                </label>
                <label className="block">
                  <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>Stage</div>
                  <select value={form.stage} onChange={e => set('stage', e.target.value)}
                    className="w-full h-10 paper hairline rounded-xl px-3 focus-ring text-sm appearance-none">
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>Founder</div>
                  <input value={form.founderName} onChange={e => set('founderName', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full h-10 paper hairline rounded-xl px-3 focus-ring text-sm" />
                </label>
              </div>
              <NavRow isFirst onNext={() => setStep('story')} canNext={!!form.company} />
            </>}

            {/* ── Step 2: Story ──────────────────────────────────────── */}
            {step === 'story' && <>
              <h1 className="text-[28px] font-semibold tracking-tight">The real story</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                Skip the polish. Tell us what made you start this.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {PROMPTS.map(p => {
                  const active = form.promptsUsed.includes(p)
                  return (
                    <button key={p} onClick={() => togglePrompt(p)}
                      className="text-[13px] px-3 h-8 rounded-full hairline focus-ring transition-all"
                      style={active
                        ? { background: 'var(--accent)', color: '#fff', border: 'none' }
                        : { background: 'var(--paper)', color: 'var(--ink)' }}>
                      {p}
                    </button>
                  )
                })}
              </div>
              <div className="mt-5">
                <textarea rows={9} value={form.realStory} onChange={e => set('realStory', e.target.value)}
                  placeholder="Tell us the raw truth — what's broken, why you're fixing it, what traction you have, your team, and how much you're raising..."
                  className="w-full paper hairline rounded-xl p-3 focus-ring text-sm"
                  style={{ resize: 'vertical', lineHeight: 1.6 }} />
              </div>
              <NavRow onBack={() => setStep('basics')} onNext={() => setStep('purpose')} />
            </>}

            {/* ── Step 3: Purpose ────────────────────────────────────── */}
            {step === 'purpose' && <>
              <h1 className="text-[28px] font-semibold tracking-tight">Deck purpose</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                Who is this pitch going to, and what should happen after they read it?
              </p>
              <div className="mt-6">
                <div className="text-[13px] mb-2" style={{ color: 'var(--ink-muted)' }}>Audience</div>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCES.map(a => (
                    <button key={a} onClick={() => set('audience', a)}
                      className="text-[13px] px-3 h-9 rounded-xl hairline focus-ring transition-all"
                      style={form.audience === a
                        ? { background: 'var(--accent)', color: '#fff', border: 'none' }
                        : { background: 'var(--paper)', color: 'var(--ink)' }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <div className="text-[13px] mb-2" style={{ color: 'var(--ink-muted)' }}>Goal</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GOALS.map(g => (
                    <button key={g.id} onClick={() => set('goal', g.id)}
                      className="text-left p-3 rounded-xl hairline focus-ring paper transition-all"
                      style={form.goal === g.id ? { borderColor: 'var(--accent)', borderWidth: 2 } : {}}>
                      <div className="font-medium text-sm">{g.title}</div>
                      <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <NavRow onBack={() => setStep('story')} onNext={() => setStep('brand')} />
            </>}

            {/* ── Step 4: Brand ──────────────────────────────────────── */}
            {step === 'brand' && <>
              <h1 className="text-[28px] font-semibold tracking-tight">Brand and theme</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                We'll read your brand and apply it across the whole deck. Start with your website.
              </p>

              {/* Website URL — auto-detects on change */}
              <div className="mt-6">
                <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>Website URL</div>
                <div className="relative">
                  <input value={form.websiteUrl}
                    onChange={e => { set('websiteUrl', e.target.value); tryDetect(e.target.value) }}
                    placeholder="https://yourbrand.com"
                    className="w-full h-10 paper hairline rounded-xl px-3 focus-ring text-sm" />
                  {detecting && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full animate-spin"
                      style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
                  )}
                </div>
                {detectedColors.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap items-center">
                    <span className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>Detected:</span>
                    {detectedColors.map(color => (
                      <button key={color} title={color} onClick={() => set('accentColor', color)}
                        className="w-8 h-8 rounded-lg transition-all"
                        style={{
                          background: color,
                          border: form.accentColor === color ? '3px solid var(--ink)' : '1px solid var(--line)',
                        }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Manual colour picker */}
              <div className="mt-5">
                <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>Brand colour</div>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.accentColor} onChange={e => set('accentColor', e.target.value)}
                    style={{ width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0 }} />
                  <input value={form.accentColor} onChange={e => set('accentColor', e.target.value)}
                    placeholder="#0F1115"
                    className="flex-1 h-10 paper hairline rounded-xl px-3 focus-ring text-sm" />
                </div>
              </div>

              {/* Dark / Light */}
              <div className="mt-5">
                <div className="text-[13px] mb-2" style={{ color: 'var(--ink-muted)' }}>Deck mood</div>
                <div className="flex gap-2">
                  {[
                    { label: 'Light', value: false, bg: '#f8f9fa', fg: '#0f1d2e' },
                    { label: 'Dark', value: true, bg: '#06080d', fg: '#eef2f7' },
                  ].map(t => (
                    <button key={String(t.value)}
                      onClick={() => { set('isDark', t.value); set('bgColor', t.bg) }}
                      className="flex-1 h-12 rounded-xl font-semibold text-[13px] transition-all"
                      style={{
                        background: t.bg, color: t.fg,
                        border: form.isDark === t.value ? '2px solid var(--accent)' : '1px solid var(--line)',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <NavRow onBack={() => setStep('purpose')} onNext={generate} nextLabel="Build the deck →" />
            </>}

          </div>
        </div>
      </main>
    </div>
  )
}
