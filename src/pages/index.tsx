import { useState, useEffect, useRef, useMemo } from 'react'
import Workspace from '@/components/Workspace'
import { FRAMEWORKS } from '@/lib/frameworks/library'
import { rankFrameworks } from '@/lib/frameworks/scoring'
import { compressToDataUrl, type UploadedImage } from '@/lib/image-upload'
import { type BrandWorld, brandWorldToCssVars } from '@/lib/brand-world'

type Step = 'basics' | 'story' | 'purpose' | 'brand' | 'assets' | 'world' | 'building' | 'canvas'

interface FormData {
  company: string
  oneLiner: string
  industry: string
  stage: string
  realStory: string
  customers: string       // who are the first customers — names/segments
  proof: string           // numbers, quotes, press, signed deals
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
  frameworkId?: string
  // Uploaded assets — data URLs, embedded directly in the deck
  logoData?:    string
  heroData?:    string    // homepage screenshot or hero image
  productData?: string    // product UI screenshot — drives skeleton demo
  founderPhoto?: string
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
  realStory: '', customers: '', proof: '', promptsUsed: [],
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
  const [logoUrl, setLogoUrl] = useState('')
  const [brandWorld, setBrandWorld] = useState<BrandWorld | null>(null)
  const [worldLoading, setWorldLoading] = useState(false)
  const debounceRef = useRef<any>(null)

  const set = (k: keyof FormData, v: any) => setForm(f => ({ ...f, [k]: v }))

  // Top 6 frameworks ranked for this (industry, stage, audience). Recomputed
  // when those change so the chips reflect the user's choices.
  const rankedFrameworks = useMemo(
    () => rankFrameworks(FRAMEWORKS, {
      industry: form.industry, stage: form.stage, audience: form.audience,
    }, null).slice(0, 6),
    [form.industry, form.stage, form.audience],
  )

  // ── Intake stays neutral ────────────────────────────────────────────
  // The intake form keeps its default neutral chrome regardless of which
  // accent the user picks. Workspace.tsx owns the --accent CSS var once
  // the user reaches step === 'canvas' (it has its own useEffect for that).
  // Reset --accent back to the intake default whenever we leave canvas.
  useEffect(() => {
    if (step !== 'canvas') {
      document.documentElement.style.setProperty('--accent', '#0F1115')
    }
  }, [step])

  // ?demo=1 — jump straight to workspace with stub content
  // ?demo=<brand> — load /public/demo-<brand>.json (form + brandWorld + logo)
  // and jump straight to workspace so a real LinkedIn / Stripe / etc theme is
  // visible without driving the 5-step intake.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const demo = params.get('demo')
    if (!demo) return

    if (demo === '1') {
      setForm(f => ({ ...f, company: 'SignalDeck', accentColor: '#6366f1' }))
      document.documentElement.style.setProperty('--accent', '#6366f1')
      setGeneratedHtml('<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:sans-serif;color:#6366f1;font-size:18px;font-weight:600;">Demo deck — generate a real one to see slides here</div>')
      setGeneratedContent({})
      setStep('canvas')
      return
    }

    // Named-brand demo preset
    ;(async () => {
      try {
        const r = await fetch(`/demo-${demo}.json`)
        if (!r.ok) return
        const preset = await r.json()
        const accent = preset.brandWorld?.colour?.primary || preset.accentColor || '#0F1115'
        if (preset.form)        setForm(f => ({ ...f, ...preset.form, accentColor: accent }))
        else                    setForm(f => ({ ...f, accentColor: accent }))
        if (preset.logoUrl)     setLogoUrl(preset.logoUrl)
        document.documentElement.style.setProperty('--accent', accent)
        if (preset.brandWorld)  setBrandWorld(preset.brandWorld)
        setGeneratedHtml(`<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:'Source Sans 3',sans-serif;color:${accent};font-size:18px;font-weight:600;text-align:center;padding:32px;">Demo workspace for ${preset.form?.company || demo}.<br/><span style="font-weight:400;color:#666;font-size:14px;margin-top:8px;display:block;">Run the full intake to generate real slides — the chrome here shows how the BrandWorld adapts every surface.</span></div>`)
        setGeneratedContent({})
        setStep('canvas')
      } catch (err) {
        console.error('demo preset load failed', err)
      }
    })()
  }, [])

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
        if (data.logo) setLogoUrl(data.logo)
      } catch {}
      setDetecting(false)
    }, 900)
  }

  /** Generate the BrandWorld from all collected intake data. Runs on
   *  user clicking "Build my workspace" on the Assets step. */
  async function buildBrandWorld() {
    setWorldLoading(true); setError('')
    try {
      const res = await fetch('/api/brand-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company:     form.company,
          industry:    form.industry,
          oneLiner:    form.oneLiner,
          realStory:   form.realStory,
          customers:   form.customers,
          proof:       form.proof,
          audience:    form.audience,
          stage:       form.stage,
          websiteUrl:  form.websiteUrl,
          logoData:    form.logoData,
          heroData:    form.heroData,
          productData: form.productData,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'brand-world failed')
      setBrandWorld(data.brandWorld)
      // If the intake auto-detect missed a logo, take what /api/brand-world
      // resolved (extracted apple-touch-icon, or DuckDuckGo favicon fallback).
      if (!logoUrl && data.resolvedLogoUrl) setLogoUrl(data.resolvedLogoUrl)
      setStep('world')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setWorldLoading(false)
    }
  }

  async function generate(frameworkId?: string) {
    if (!frameworkId) setStep('building')
    setError('')
    try {
      // Concat all collected story content so Sonnet sees it all in one block.
      const enrichedStory = [
        form.realStory,
        form.customers && `Customers: ${form.customers}`,
        form.proof     && `Proof: ${form.proof}`,
      ].filter(Boolean).join('\n\n')

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          frameworkId,
          realStory: enrichedStory,
          // realStory maps to the generate API's structured fields
          problem: enrichedStory,
          solution: '', howItWorks: '', traction: form.proof, market: '',
          businessModel: '', competition: '', team: '', ask: '',
          // Brand world overrides — if generated, use ITS palette + fonts; otherwise fall back
          accentColor: brandWorld?.colour.primary ?? form.accentColor,
          bgColor:     brandWorld?.colour.background ?? form.bgColor,
          fontHeading: brandWorld?.typography.heading ?? 'Inter',
          fontBody:    brandWorld?.typography.body    ?? 'Inter',
          brandWorld,
          demoUrl: '', demoDescription: '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedHtml(data.html)
      setGeneratedContent(data.content)
      if (!frameworkId) setStep('canvas')
      return data
    } catch (e: any) {
      setError(e.message)
      if (!frameworkId) setStep(brandWorld ? 'world' : 'assets')
      throw e
    }
  }

  /** Used by Workspace's Frameworks screen — re-runs generate with a framework applied. */
  async function regenerateWithFramework(frameworkId: string) {
    await generate(frameworkId)
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
            Andreas is reading your story and composing slides
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
        logoUrl={form.logoData || logoUrl}
        audience={form.audience}
        websiteUrl={form.websiteUrl}
        realStory={form.realStory}
        founderName={form.founderName}
        stage={form.stage}
        industry={form.industry}
        brandWorld={brandWorld}
        onRegenerate={regenerateWithFramework}
        onRestart={() => {
          setStep('basics')
          setForm(empty)
          setGeneratedHtml('')
          setGeneratedContent(null)
          setDetectedColors([])
          setLogoUrl('')
          document.documentElement.style.setProperty('--accent', empty.accentColor)
        }}
      />
    )
  }

  const stepNum = ({ basics: 1, story: 2, purpose: 3, brand: 4, assets: 5, world: 6 } as any)[step] || 1
  const total = step === 'world' ? 6 : 5

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
                <textarea rows={7} value={form.realStory} onChange={e => set('realStory', e.target.value)}
                  placeholder="Tell us the raw truth — what's broken, why you're fixing it, what made you start this..."
                  className="w-full paper hairline rounded-xl p-3 focus-ring text-sm"
                  style={{ resize: 'vertical', lineHeight: 1.6 }} />
              </div>
              <div className="mt-5">
                <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                  Customers <span className="text-[11px]">(who hurts most — names, segments, archetypes)</span>
                </div>
                <textarea rows={3} value={form.customers} onChange={e => set('customers', e.target.value)}
                  placeholder="e.g. Solo accountants at small firms, 5-50 clients each. They reconcile by hand every month."
                  className="w-full paper hairline rounded-xl p-3 focus-ring text-sm"
                  style={{ resize: 'vertical', lineHeight: 1.55 }} />
              </div>
              <div className="mt-5">
                <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                  Proof <span className="text-[11px]">(numbers, named customers, press, signed deals — anything real)</span>
                </div>
                <textarea rows={3} value={form.proof} onChange={e => set('proof', e.target.value)}
                  placeholder="e.g. 3 paying customers ($12k MRR), 6 LOIs, featured in Fintech Weekly. Don't make anything up."
                  className="w-full paper hairline rounded-xl p-3 focus-ring text-sm"
                  style={{ resize: 'vertical', lineHeight: 1.55 }} />
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
              <div className="mt-6">
                <div className="text-[13px] mb-1" style={{ color: 'var(--ink-muted)' }}>Narrative framework <span className="text-[11px]">(optional)</span></div>
                <div className="text-[12px] mb-2" style={{ color: 'var(--ink-muted)' }}>
                  How the story connects between slides. Auto lets Andreas pick.
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => set('frameworkId', undefined as any)}
                    className="text-[13px] px-3 h-9 rounded-xl hairline focus-ring transition-all"
                    style={!form.frameworkId
                      ? { background: 'var(--accent)', color: '#fff', border: 'none' }
                      : { background: 'var(--paper)', color: 'var(--ink)' }}>
                    Auto
                  </button>
                  {rankedFrameworks.map(f => (
                    <button key={f.id} onClick={() => set('frameworkId', f.id)}
                      title={f.summary}
                      className="text-[13px] px-3 h-9 rounded-xl hairline focus-ring transition-all"
                      style={form.frameworkId === f.id
                        ? { background: 'var(--accent)', color: '#fff', border: 'none' }
                        : { background: 'var(--paper)', color: 'var(--ink)' }}>
                      {f.name}
                    </button>
                  ))}
                </div>
                {form.frameworkId && (
                  <div className="mt-2 text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                    {rankedFrameworks.find(f => f.id === form.frameworkId)?.summary}
                  </div>
                )}
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

              <NavRow onBack={() => setStep('purpose')} onNext={() => setStep('assets')} />
            </>}

            {/* ── Step 5: Assets ─────────────────────────────────────── */}
            {step === 'assets' && <>
              <h1 className="text-[28px] font-semibold tracking-tight">Drop your visuals</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                The more we have, the more the deck looks like you, not a template.
                All optional — but every upload sharpens the result.
              </p>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <AssetSlot label="Logo" hint="PNG or SVG, transparent if possible"
                  value={form.logoData} onChange={v => set('logoData', v)} />
                <AssetSlot label="Hero / homepage screenshot" hint="What people see first on your site"
                  value={form.heroData} onChange={v => set('heroData', v)} />
                <AssetSlot label="Product screenshot" hint="A real screen — we'll style it into the deck"
                  value={form.productData} onChange={v => set('productData', v)} />
                <AssetSlot label="Founder photo" hint="Optional. Goes on the team slide."
                  value={form.founderPhoto} onChange={v => set('founderPhoto', v)} />
              </div>

              {error && <div className="mt-4 sd-error">{error}</div>}

              <NavRow onBack={() => setStep('brand')} onNext={buildBrandWorld} nextLabel={worldLoading ? 'Reading your sources…' : 'Build my workspace →'} canNext={!worldLoading} />
            </>}

            {/* ── Step 6: Brand world preview ─────────────────────────── */}
            {step === 'world' && brandWorld && <>
              <h1 className="text-[28px] font-semibold tracking-tight">Your brand world</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                {brandWorld.visualDirection}
              </p>

              {/* Palette */}
              <div className="mt-6">
                <div className="text-[12px] uppercase tracking-wider mb-2" style={{ color: 'var(--ink-muted)' }}>Palette</div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {([
                    ['Bg',        brandWorld.colour.background],
                    ['Surface',   brandWorld.colour.surface],
                    ['Primary',   brandWorld.colour.primary],
                    ['Secondary', brandWorld.colour.secondary],
                    ['Accent',    brandWorld.colour.accent],
                    ['Text',      brandWorld.colour.text],
                    ['Border',    brandWorld.colour.border],
                  ] as const).map(([l, c]) => (
                    <div key={l} className="rounded-lg overflow-hidden hairline">
                      <div className="h-16" style={{ background: c }} />
                      <div className="text-[10px] px-2 py-1.5">
                        <div className="font-medium">{l}</div>
                        <div className="font-mono" style={{ color: 'var(--ink-muted)' }}>{c}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="paper hairline rounded-xl p-4">
                  <div className="text-[12px] uppercase tracking-wider mb-2" style={{ color: 'var(--ink-muted)' }}>Heading</div>
                  <div style={{ fontFamily: brandWorld.typography.heading, fontWeight: brandWorld.typography.headingWeight, fontSize: 32, letterSpacing: brandWorld.typography.tracking, color: brandWorld.colour.primary }}>
                    {form.company || 'Your company'}
                  </div>
                  <div className="text-[12px] mt-2" style={{ color: 'var(--ink-muted)' }}>
                    {brandWorld.typography.heading} · {brandWorld.typography.style} · weight {brandWorld.typography.headingWeight}
                  </div>
                </div>
                <div className="paper hairline rounded-xl p-4">
                  <div className="text-[12px] uppercase tracking-wider mb-2" style={{ color: 'var(--ink-muted)' }}>Body</div>
                  <div style={{ fontFamily: brandWorld.typography.body, fontSize: 14, lineHeight: 1.55, color: brandWorld.colour.text }}>
                    {form.oneLiner || 'A clean specimen sentence in the chosen body face. Readable, intentional, not generic.'}
                  </div>
                  <div className="text-[12px] mt-3" style={{ color: 'var(--ink-muted)' }}>
                    {brandWorld.typography.body} · body
                  </div>
                </div>
              </div>

              {/* Motifs + layout */}
              <div className="mt-6">
                <div className="text-[12px] uppercase tracking-wider mb-2" style={{ color: 'var(--ink-muted)' }}>Motifs</div>
                <div className="flex flex-wrap gap-2">
                  {brandWorld.motifs.map(m => (
                    <span key={m} className="text-[12px] px-3 h-7 inline-flex items-center rounded-full hairline" style={{ background: brandWorld.colour.surfaceSoft, color: brandWorld.colour.text }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                <span className="font-medium" style={{ color: brandWorld.colour.text }}>Layout:</span> {brandWorld.layoutStyle} ·
                <span className="font-medium ml-1" style={{ color: brandWorld.colour.text }}>Cards:</span> {brandWorld.cardStyle} ·
                <span className="font-medium ml-1" style={{ color: brandWorld.colour.text }}>Motion:</span> {brandWorld.motionStyle} ·
                <span className="font-medium ml-1" style={{ color: brandWorld.colour.text }}>Density:</span> {brandWorld.density}
              </div>

              {/* Avoid + why */}
              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div className="paper hairline rounded-xl p-4">
                  <div className="text-[12px] uppercase tracking-wider mb-2" style={{ color: 'var(--ink-muted)' }}>Won't use</div>
                  <ul className="space-y-1">
                    {brandWorld.avoid.map(a => (
                      <li key={a} className="text-[13px] flex gap-2" style={{ color: 'var(--ink-muted)' }}>
                        <span style={{ color: brandWorld.colour.error }}>×</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="paper hairline rounded-xl p-4">
                  <div className="text-[12px] uppercase tracking-wider mb-2" style={{ color: 'var(--ink-muted)' }}>Why this works</div>
                  <p className="text-[13px] leading-relaxed">{brandWorld.whyThisWorks}</p>
                </div>
              </div>

              {error && <div className="mt-4 sd-error">{error}</div>}

              <div className="mt-8 flex items-center justify-between">
                <button onClick={buildBrandWorld} disabled={worldLoading}
                  className="h-10 px-4 text-sm rounded-xl font-medium hairline focus-ring inline-flex items-center gap-2 disabled:opacity-40">
                  {worldLoading ? 'Regenerating…' : '↻ Regenerate'}
                </button>
                <button onClick={() => generate()}
                  className="h-10 px-5 text-sm rounded-xl font-medium text-white shadow-card focus-ring inline-flex items-center gap-2"
                  style={{ background: brandWorld.colour.primary }}>
                  Build the deck →
                </button>
              </div>
            </>}

          </div>
        </div>
      </main>
    </div>
  )
}

/* ── Asset upload slot ─────────────────────────────────────────────── */

function AssetSlot({ label, hint, value, onChange }:
  { label: string; hint: string; value?: string; onChange: (v: string|undefined) => void }) {
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setBusy(true)
    try {
      const img = await compressToDataUrl(file)
      onChange(img.dataUrl)
    } catch (e) {
      console.error('Image compress failed', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="paper hairline rounded-xl p-4">
      <div className="text-[13px] font-medium">{label}</div>
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>{hint}</div>

      {value ? (
        <div className="mt-3 relative">
          <img src={value} alt={label}
            className="w-full h-24 object-cover rounded-lg hairline"
            style={{ background: '#f4f4f5' }} />
          <button onClick={() => onChange(undefined)}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-[12px] hover:bg-black/80">
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-3 w-full h-24 rounded-lg text-[12px] focus-ring transition-all"
          style={{
            border: '1.5px dashed var(--line)',
            color: 'var(--ink-muted)',
            background: busy ? 'var(--surface)' : 'transparent',
          }}>
          {busy ? 'Compressing…' : '+ Drop or click to upload'}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}
