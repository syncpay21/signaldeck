import { useState, useEffect, useRef, useMemo } from 'react'
import Workspace from '@/components/Workspace'
import { FRAMEWORKS } from '@/lib/frameworks/library'
import { rankFrameworks } from '@/lib/frameworks/scoring'
import { compressToDataUrl, type UploadedImage } from '@/lib/image-upload'
import { type BrandWorld, brandWorldToCssVars } from '@/lib/brand-world'
import { ANDREAS_INTAKE_PROMPT, parseIntakeJson } from '@/lib/andreas-intake-prompt'

type Step = 'mode' | 'ai-assist' | 'basics' | 'story' | 'purpose' | 'brand' | 'assets' | 'world' | 'building' | 'canvas'

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
  competitors: string     // free-text — comparable companies the founder lists (URLs or names, one per line). Andreas gap-fills.
  ownWordsOverview: string // free-text — "in your own words" biz overview (AI-assist mode supplements pasted JSON)
  darkTacticsEnabled: boolean
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
  // Previous deck (PDF/PPTX/image). Andreas reads it as source-of-truth for
  // statlines / customers / competitor names so the founder doesn't have to
  // re-type everything. Stored as base64 data URL.
  previousDeckData?: string
  previousDeckName?: string
  previousDeckMime?: string
  /** Unlimited supporting materials — financials, contracts, customer
   *  research, screenshots, anything. Andreas references all of them when
   *  writing slides. Cap at 30 files total to keep payload reasonable. */
  supportingFiles?: Array<{ name: string; mime: string; data: string; size: number }>
  /** Pre-drafted deck content from the founder's external AI. When present,
   *  SignalDeck skips the heavy writer Sonnet call and runs only a Haiku
   *  fact-check + rephrase pass. ~75% cost reduction. */
  draftedDeck?: Record<string, any>
  /** Named recipients the deck link will be sent to. Each may have a LinkedIn
   *  URL + VC firm name; /api/recipient-intel fetches both so the deck writer
   *  can tailor the narrative to the actual reader's thesis + portfolio. */
  recipients?: Array<{ name: string; linkedinUrl?: string; vcFirm?: string }>
  /** Cached intel bundles, one per recipient — populated by Fetch intel UI. */
  recipientIntel?: Array<{ recipient: any; fund: any; fetchedAt: string }>
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
  competitors: '',
  ownWordsOverview: '',
  darkTacticsEnabled: false,
  accentColor: '#0F1115', bgColor: '#ffffff', isDark: false,
  founderName: '', founderRole: '', domain: '',
}

export default function Home() {
  const [step, setStep] = useState<Step>('mode')
  const [pastedIntake, setPastedIntake] = useState('')
  const [pasteWarnings, setPasteWarnings] = useState<string[]>([])
  const [pasteError, setPasteError] = useState('')
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [form, setForm] = useState<FormData>(empty)
  const [generatedHtml, setGeneratedHtml] = useState('')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  // Per-generation deck id — flows from /api/generate response to the workspace
  // so the Signals tab can poll /api/signals?deckId=... for live viewership.
  const [deckId, setDeckId] = useState<string>('')
  // Narrative + slide order Andreas picked (with strategist reasoning when it
  // overrode the deterministic pick). Surfaces in the Workspace Overview so
  // the founder sees WHY the spine is this and not another.
  const [narrativeInfo, setNarrativeInfo] = useState<{
    narrativeId: string
    slideOrder: string[]
    strategist?: { applied: boolean; reasoning: string; confidence: number; runnerUp?: string; runnerUpReason?: string }
  } | null>(null)
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
        // If the demo baked in an Andreas-generated deck, use it directly so the
        // founder sees real slides. Otherwise show a placeholder explaining the
        // chrome is the demo (no deck).
        if (preset.generatedHtml && preset.generatedContent) {
          setGeneratedHtml(preset.generatedHtml)
          setGeneratedContent(preset.generatedContent)
        } else {
          setGeneratedHtml(`<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:'Source Sans 3',sans-serif;color:${accent};font-size:18px;font-weight:600;text-align:center;padding:32px;">Demo workspace for ${preset.form?.company || demo}.<br/><span style="font-weight:400;color:#666;font-size:14px;margin-top:8px;display:block;">Run the full intake to generate real slides — the chrome here shows how the BrandWorld adapts every surface.</span></div>`)
          setGeneratedContent({})
        }
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
      if (typeof data.deckId === 'string') setDeckId(data.deckId)
      // Capture the narrative + strategist reasoning so the workspace can show
      // "Andreas picked spine X because Y" instead of hiding it in metadata.
      if (data.narrative || data.slideOrder) {
        const stage15 = data.metadata?.stage_a1_5
        setNarrativeInfo({
          narrativeId: data.narrative || '',
          slideOrder:  Array.isArray(data.slideOrder) ? data.slideOrder : [],
          strategist:  stage15?.strategist ? {
            applied:        Boolean(stage15.applied),
            reasoning:      String(stage15.strategist.reasoning || ''),
            confidence:     Number(stage15.strategist.confidence || 0),
            runnerUp:       stage15.strategist.runnerUp,
            runnerUpReason: stage15.strategist.runnerUpReason,
          } : undefined,
        })
      }
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
        deckId={deckId}
        narrativeInfo={narrativeInfo}
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
          setStep('mode')
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

  const stepNum = ({ basics: 1, story: 2, purpose: 3, brand: 4, assets: 5, world: 6, 'ai-assist': 1 } as any)[step] || 1
  const total = step === 'world' ? 6 : (step === 'ai-assist' ? 2 : 5)
  const hideStepCounter = step === 'mode'

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
        {!hideStepCounter && <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>Step {stepNum} of {total}</span>}
      </header>

      {/* ── Progress ── */}
      {!hideStepCounter && (
        <div className="px-8">
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'var(--surface)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(stepNum / total) * 100}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      )}

      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-[680px]">

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: '#fbe8e5', border: '1px solid #f3c3be', color: '#b0322b' }}>
              {error}
            </div>
          )}

          <div className="paper hairline rounded-[18px] shadow-card p-10">

            {/* ── Step 0: Mode chooser ───────────────────────────────── */}
            {step === 'mode' && <>
              <h1 className="text-[28px] font-semibold tracking-tight">How do you want to fill this out?</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                Both paths land in the same workspace. Pick whichever feels less painful.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <button onClick={() => setStep('basics')}
                  className="text-left p-6 rounded-2xl hairline focus-ring transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--surface)' }}>
                  <div className="text-[11px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Guided</div>
                  <div className="text-[18px] font-semibold tracking-tight mb-1.5">Walk me through it</div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                    Five short steps. Story, audience, brand, assets. Andreas takes it from there.
                  </p>
                  <div className="mt-4 text-[12px] font-medium" style={{ color: 'var(--accent)' }}>~ 5 minutes →</div>
                </button>

                <button onClick={() => setStep('ai-assist')}
                  className="text-left p-6 rounded-2xl hairline focus-ring transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--surface)' }}>
                  <div className="text-[11px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>AI-assist</div>
                  <div className="text-[18px] font-semibold tracking-tight mb-1.5">I'll paste from my AI</div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                    Copy a prompt, run it through Claude or ChatGPT, paste the JSON back. Then just hand us the assets.
                  </p>
                  <div className="mt-4 text-[12px] font-medium" style={{ color: 'var(--accent)' }}>~ 2 minutes →</div>
                </button>
              </div>
            </>}

            {/* ── AI-assist: one page = prompt + paste + assets + biz overview + dark toggle ── */}
            {step === 'ai-assist' && <>
              <h1 className="text-[28px] font-semibold tracking-tight">Run Andreas through your AI</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                Copy the prompt below, paste it into Claude / ChatGPT / Gemini, answer the questions, then paste the JSON it returns here.
              </p>

              {/* Copy-prompt block */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[13px] font-medium">1. Copy this prompt</div>
                  <button onClick={async () => { await navigator.clipboard.writeText(ANDREAS_INTAKE_PROMPT); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000) }}
                    className="text-[12px] font-medium h-7 px-3 rounded-lg hairline"
                    style={{ background: copiedPrompt ? 'var(--accent)' : 'transparent', color: copiedPrompt ? '#fff' : 'var(--ink)' }}>
                    {copiedPrompt ? '✓ Copied' : 'Copy prompt'}
                  </button>
                </div>
                <pre className="text-[11px] leading-relaxed font-mono rounded-xl p-3 hairline overflow-auto max-h-48"
                  style={{ background: 'var(--surface)', color: 'var(--ink-muted)', whiteSpace: 'pre-wrap' }}>{ANDREAS_INTAKE_PROMPT.split('\n').slice(0, 12).join('\n') + '\n…'}</pre>
              </div>

              {/* Paste-response block */}
              <div className="mt-6">
                <div className="text-[13px] font-medium mb-2">2. Paste the JSON your AI returned</div>
                <textarea value={pastedIntake}
                  onChange={e => { setPastedIntake(e.target.value); setPasteWarnings([]); setPasteError('') }}
                  placeholder={'{\n  "company": "...",\n  "oneLiner": "...",\n  ...\n}'}
                  rows={8}
                  className="w-full paper hairline rounded-xl px-3 py-2 focus-ring font-mono text-[12px] resize-y" />
                {pasteError && (
                  <div className="mt-2 text-[12px]" style={{ color: '#b0322b' }}>{pasteError}</div>
                )}
                {pasteWarnings.length > 0 && (
                  <ul className="mt-2 text-[11px] space-y-1" style={{ color: '#a86a00' }}>
                    {pasteWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                )}
              </div>

              {/* Biz overview in own words */}
              <div className="mt-6">
                <div className="text-[13px] mb-1.5">3. In your own words — anything Andreas should know <span className="text-[11px] opacity-60">(optional)</span></div>
                <textarea value={form.ownWordsOverview}
                  onChange={e => set('ownWordsOverview', e.target.value)}
                  placeholder="The voice you'd use over coffee. Why this matters to you. What the AI couldn't capture."
                  rows={3}
                  className="w-full paper hairline rounded-xl px-3 py-2 focus-ring text-sm resize-y" />
              </div>

              {/* Website */}
              <div className="mt-6">
                <div className="text-[13px] mb-1.5">4. Website URL</div>
                <input value={form.websiteUrl}
                  onChange={e => { set('websiteUrl', e.target.value); tryDetect(e.target.value) }}
                  placeholder="https://yourbrand.com"
                  className="w-full h-10 paper hairline rounded-xl px-3 focus-ring text-sm" />
              </div>

              {/* Competitors */}
              <div className="mt-5">
                <div className="text-[13px] mb-1.5">5. Competitors <span className="text-[11px] opacity-60">(optional)</span></div>
                <textarea value={form.competitors}
                  onChange={e => set('competitors', e.target.value)}
                  placeholder={'stripe.com\nbrex.com\nMercury'}
                  rows={2}
                  className="w-full paper hairline rounded-xl px-3 py-2 focus-ring text-sm resize-y" />
              </div>

              {/* Previous deck upload — Andreas reads it for verbatim stats */}
              <div className="mt-5">
                <div className="text-[13px] mb-1.5">6. Previous pitch deck <span className="text-[11px] opacity-60">(optional)</span></div>
                <DeckSlot
                  value={form.previousDeckData}
                  name={form.previousDeckName}
                  onChange={(data, name, mime) => {
                    set('previousDeckData', data)
                    set('previousDeckName', name)
                    set('previousDeckMime', mime)
                  }}
                />
              </div>

              {/* Supporting materials — unlimited */}
              <div className="mt-5">
                <div className="text-[13px] mb-1.5">7. Supporting materials <span className="text-[11px] opacity-60">(optional — drop as many as you like, up to 120 files, videos welcome)</span></div>
                <SupportingFiles
                  value={form.supportingFiles}
                  onChange={next => set('supportingFiles', next)}
                />
              </div>

              {/* Recipients — who's actually opening the link */}
              <div className="mt-5">
                <div className="text-[13px] mb-1.5">8. Who's receiving this? <span className="text-[11px] opacity-60">(optional — but unlocks reader-specific copy)</span></div>
                <Recipients
                  value={form.recipients}
                  onChange={next => set('recipients', next)}
                  intel={form.recipientIntel}
                  onIntelChange={next => set('recipientIntel', next)}
                />
              </div>

              {/* Edge tactics toggle */}
              <div className="mt-6 p-4 rounded-xl hairline" style={{ background: 'var(--surface)' }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.darkTacticsEnabled}
                    onChange={e => set('darkTacticsEnabled', e.target.checked)}
                    className="mt-1" />
                  <div>
                    <div className="text-[13px] font-medium">Edgy persuasion tactics</div>
                    <div className="text-[11px] mt-1" style={{ color: 'var(--ink-muted)' }}>
                      Lets Andreas use harder-edge moves — FOMO framing, competitive shade, urgency anchors, scarcity hooks. Off by default. Investors will notice; pick this only if it fits your voice.
                    </div>
                  </div>
                </label>
              </div>

              <NavRow
                onBack={() => setStep('mode')}
                onNext={() => {
                  const result = parseIntakeJson(pastedIntake)
                  if (!result.ok || !result.data) {
                    setPasteError(result.error || "Couldn't read the JSON. Re-paste what your AI returned.")
                    setPasteWarnings(result.warnings)
                    return
                  }
                  // Merge parsed fields into form. Asset/URL/biz-overview/dark fields stay user-supplied.
                  setForm(f => ({ ...f, ...result.data }))
                  setPasteWarnings(result.warnings)
                  setPasteError('')
                  // Skip the rest of the guided steps — go straight to assets if no logo yet, else build BrandWorld
                  if (!form.logoData && !form.heroData) setStep('assets')
                  else buildBrandWorld()
                }}
                canNext={pastedIntake.trim().length > 10}
                nextLabel="Read my pasted intake →"
              />
            </>}

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
              <NavRow onBack={() => setStep('mode')} onNext={() => setStep('story')} canNext={!!form.company} />
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

              {/* Edge tactics toggle — opt-in, lives next to framework picker */}
              <div className="mt-6 p-4 rounded-xl hairline" style={{ background: 'var(--surface)' }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.darkTacticsEnabled}
                    onChange={e => set('darkTacticsEnabled', e.target.checked)}
                    className="mt-1" />
                  <div>
                    <div className="text-[13px] font-medium">Edgy persuasion tactics</div>
                    <div className="text-[11px] mt-1" style={{ color: 'var(--ink-muted)' }}>
                      Lets Andreas use harder-edge moves — FOMO framing, competitive shade, urgency anchors, scarcity hooks. Off by default. Investors will notice; pick this only if it fits your voice.
                    </div>
                  </div>
                </label>
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

              {/* Competitors — Andreas reads what you list + gap-fills with 2-3 more */}
              <div className="mt-5">
                <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>Competitors <span className="text-[11px] opacity-60">(optional — Andreas will research more if you skip)</span></div>
                <textarea value={form.competitors}
                  onChange={e => set('competitors', e.target.value)}
                  placeholder={'stripe.com\nbrex.com\nMercury'}
                  rows={3}
                  className="w-full paper hairline rounded-xl px-3 py-2 focus-ring text-sm resize-y" />
                <div className="text-[11px] mt-1.5 opacity-60">URLs or names, one per line. Andreas scrapes each and uses positioning to ground your Competition + Market slides.</div>
              </div>

              {/* Manual colour picker */}
              <div className="mt-5">
                <div className="text-[13px] mb-1.5" style={{ color: 'var(--ink-muted)' }}>Brand colour</div>
                <div className="flex items-center gap-3">
                  <input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(form.accentColor) ? form.accentColor : '#0F1115'}
                    onChange={e => set('accentColor', e.target.value)}
                    style={{ width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0 }} />
                  <input value={form.accentColor}
                    onChange={e => {
                      const v = e.target.value
                      // Only accept valid 3 or 6-digit hex colours — prevents CSS/XSS injection
                      if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(v) || v === '#' || v === '') set('accentColor', v)
                    }}
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

              {/* Previous deck — Andreas reads it for statlines + named
                  customers + competitor names so the founder doesn't re-type. */}
              <div className="mt-4">
                <DeckSlot
                  value={form.previousDeckData}
                  name={form.previousDeckName}
                  onChange={(data, name, mime) => {
                    set('previousDeckData', data)
                    set('previousDeckName', name)
                    set('previousDeckMime', mime)
                  }}
                />
              </div>

              {/* Supporting materials — unlimited drops. Financial models,
                  contracts, customer-research notes, screenshots, term sheets,
                  transcripts. Andreas reads them all. */}
              <div className="mt-4">
                <SupportingFiles
                  value={form.supportingFiles}
                  onChange={next => set('supportingFiles', next)}
                />
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
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
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

  // Drag & drop handlers — accept the first image file from the drop.
  // Also catches paste events (Cmd/Ctrl+V) when the slot is the drop target.
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!dragOver) setDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) handleFile(file)
  }
  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (file) { e.preventDefault(); handleFile(file) }
  }

  return (
    <div
      className="paper hairline rounded-xl p-4 transition-colors"
      style={dragOver ? { borderColor: 'var(--ink)', background: 'var(--surface)' } : undefined}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={-1}
    >
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
            border: dragOver ? '1.5px dashed var(--ink)' : '1.5px dashed var(--line)',
            color: dragOver ? 'var(--ink)' : 'var(--ink-muted)',
            background: dragOver ? 'rgba(0,0,0,0.03)' : (busy ? 'var(--surface)' : 'transparent'),
          }}>
          {busy ? 'Compressing…' : (dragOver ? 'Drop image here' : '+ Drop, paste, or click to upload')}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

/* ── Previous deck upload slot ───────────────────────────────────────
   Accepts PDF, PPTX, image. Stored as a base64 data URL so it can be
   passed to /api/generate as a vision/document content block. No
   compression — preserves text layer in PDFs so Andreas can extract
   statlines / customers / competitor names verbatim. */
function DeckSlot({ value, name, onChange }:
  { value?: string; name?: string; onChange: (data?: string, name?: string, mime?: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ACCEPT = 'application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,image/*'
  const MAX_BYTES = 8 * 1024 * 1024  // 8MB — Anthropic vision cap is higher but keep it polite

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      alert(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 8MB. Try compressing the PDF first.`)
      return
    }
    setBusy(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        const data = String(reader.result || '')
        onChange(data, file.name, file.type)
        setBusy(false)
      }
      reader.onerror = () => { setBusy(false); alert("Couldn't read that file — try again.") }
      reader.readAsDataURL(file)
    } catch {
      setBusy(false)
    }
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!dragOver) setDragOver(true) }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false) }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = Array.from(e.dataTransfer.files).find(f =>
      f.type === 'application/pdf' ||
      f.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      f.type === 'application/vnd.ms-powerpoint' ||
      f.type.startsWith('image/'))
    if (file) handleFile(file)
  }

  return (
    <div
      className="paper hairline rounded-xl p-4 transition-colors"
      style={dragOver ? { borderColor: 'var(--ink)', background: 'var(--surface)' } : undefined}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      tabIndex={-1}
    >
      <div className="text-[13px] font-medium">Previous pitch deck <span className="ink-muted font-normal">— optional</span></div>
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
        PDF, PPTX, or images. Andreas lifts statlines, customer names, and competitors directly so you don't have to retype them.
      </div>

      {value ? (
        <div className="mt-3 flex items-center gap-3 p-3 rounded-lg hairline" style={{ background: 'var(--surface)' }}>
          <div className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-[11px] flex-shrink-0"
            style={{ background: 'var(--accent, var(--ink))', color: '#fff' }}>
            {name?.match(/\.pptx?$/i) ? 'PPT' : name?.match(/\.pdf$/i) ? 'PDF' : 'IMG'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{name || 'Previous deck'}</div>
            <div className="text-[11px] ink-muted">Andreas will read this when generating slides</div>
          </div>
          <button onClick={() => onChange(undefined, undefined, undefined)}
            className="w-6 h-6 rounded-full bg-black/60 text-white text-[12px] hover:bg-black/80 flex-shrink-0">
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-3 w-full h-20 rounded-lg text-[12px] focus-ring transition-all"
          style={{
            border: dragOver ? '1.5px dashed var(--ink)' : '1.5px dashed var(--line)',
            color: dragOver ? 'var(--ink)' : 'var(--ink-muted)',
            background: dragOver ? 'rgba(0,0,0,0.03)' : (busy ? 'var(--surface)' : 'transparent'),
          }}>
          {busy ? 'Reading…' : (dragOver ? 'Drop deck here' : '+ Drop or click to upload (PDF, PPTX, image · max 8MB)')}
        </button>
      )}
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

/* ── Supporting materials — unlimited multi-file uploader ──────────
   Founder drops any number of PDFs, images, CSVs, docs. Andreas reads
   them all when writing the deck. Cap is 30 files / 30MB total — past
   that Anthropic's context starts to suffer. */
/* ─── Recipient repeater ────────────────────────────────────────────
 * Founder names the people the deck link will be sent to + their VC firm.
 * We hit /api/recipient-intel for each row to pull LinkedIn focus + the
 * fund's recent investments. The bundles flow into /api/generate so the
 * writer can tailor copy to the actual reader, not a generic audience.
 */
function Recipients({ value, onChange, intel, onIntelChange }: {
  value?: Array<{ name: string; linkedinUrl?: string; vcFirm?: string }>
  onChange: (next: Array<{ name: string; linkedinUrl?: string; vcFirm?: string }>) => void
  intel?: Array<{ recipient: any; fund: any; fetchedAt: string }>
  onIntelChange: (next: Array<{ recipient: any; fund: any; fetchedAt: string }>) => void
}) {
  const rows = value || []
  const intelRows = intel || []
  const [busyIdx, setBusyIdx] = useState<number | null>(null)

  const update = (i: number, patch: Partial<{ name: string; linkedinUrl: string; vcFirm: string }>) => {
    const next = rows.slice()
    next[i] = { ...(next[i] || { name: '' }), ...patch }
    onChange(next)
  }
  const add = () => onChange([...rows, { name: '', linkedinUrl: '', vcFirm: '' }])
  const remove = (i: number) => {
    const next = rows.slice(); next.splice(i, 1); onChange(next)
    const nextI = intelRows.slice(); nextI.splice(i, 1); onIntelChange(nextI)
  }
  const fetchIntel = async (i: number) => {
    const r = rows[i]
    if (!r?.linkedinUrl && !r?.vcFirm) { alert('Need a LinkedIn URL or VC firm to fetch intel.'); return }
    setBusyIdx(i)
    try {
      const res = await fetch('/api/recipient-intel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: r.linkedinUrl, vcFirm: r.vcFirm }),
      })
      const json = await res.json()
      const next = intelRows.slice()
      next[i] = json
      onIntelChange(next)
    } catch (e) {
      alert('Intel fetch failed — proceed without.')
    } finally {
      setBusyIdx(null)
    }
  }

  return (
    <div className="paper hairline rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[13px] font-medium">Who's receiving this deck? <span className="ink-muted font-normal">— optional, named investors</span></div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            Add the people who'll open the link. We pull LinkedIn focus + Crunchbase investment history so the deck is tailored to them — their thesis, recent bets, portfolio language.
          </div>
        </div>
        <button onClick={add} className="text-[11px] px-2 py-1 rounded hairline">+ Add recipient</button>
      </div>

      {rows.length > 0 && (
        <div className="mt-3 space-y-2">
          {rows.map((r, i) => {
            const b = intelRows[i]
            return (
              <div key={i} className="rounded-lg hairline p-2" style={{ background: 'var(--surface)' }}>
                <div className="flex gap-2 items-center">
                  <input value={r.name || ''} onChange={e => update(i, { name: e.target.value })} placeholder="Recipient name" className="flex-1 text-[12px] px-2 py-1 rounded hairline bg-transparent" />
                  <input value={r.linkedinUrl || ''} onChange={e => update(i, { linkedinUrl: e.target.value })} placeholder="linkedin.com/in/…" className="flex-[2] text-[12px] px-2 py-1 rounded hairline bg-transparent" />
                  <input value={r.vcFirm || ''} onChange={e => update(i, { vcFirm: e.target.value })} placeholder="VC firm" className="flex-1 text-[12px] px-2 py-1 rounded hairline bg-transparent" />
                  <button onClick={() => fetchIntel(i)} disabled={busyIdx === i} className="text-[11px] px-2 py-1 rounded" style={{ background: 'var(--ink)', color: '#fff' }}>{busyIdx === i ? '…' : 'Fetch intel'}</button>
                  <button onClick={() => remove(i)} className="w-6 h-6 rounded-full bg-black/40 text-white text-[11px] hover:bg-black/70 flex items-center justify-center" aria-label="Remove">×</button>
                </div>
                {b && (
                  <div className="mt-2 text-[11px] font-mono" style={{ color: 'var(--ink-muted)' }}>
                    {b.recipient?.name && (<div>· {b.recipient.name} — {b.recipient.role || ''} {b.recipient.firm ? `@ ${b.recipient.firm}` : ''} <span className="ink-muted">({b.recipient.source})</span></div>)}
                    {b.recipient?.focus?.length > 0 && (<div>· Focus: {b.recipient.focus.slice(0, 5).join(', ')}</div>)}
                    {b.fund?.recentDeals?.length > 0 && (<div>· Fund recent: {b.fund.recentDeals.slice(0, 5).map((d: any) => d.company).join(', ')}</div>)}
                    {b.fund?.avgCheck && (<div>· Check band: {b.fund.avgCheck}</div>)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SupportingFiles({ value, onChange }:
  { value?: Array<{ name: string; mime: string; data: string; size: number }>; onChange: (next: Array<{ name: string; mime: string; data: string; size: number }>) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const files = value || []
  const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0)
  // Founder said: "add product demo screenshots and videos a lot so we can
  // really recreate it well" — caps raised to accommodate 10-screen onboarding
  // flows + multi-minute demo videos. Each file becomes context for the writer.
  const MAX_FILES = 120
  const MAX_BYTES_PER_FILE = 40 * 1024 * 1024
  const MAX_TOTAL_BYTES   = 200 * 1024 * 1024

  const ACCEPT = 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain,image/*,video/*'

  const ingest = async (incoming: File[]) => {
    setBusy(true)
    const next = [...files]
    for (const f of incoming) {
      if (next.length >= MAX_FILES) { alert(`Max ${MAX_FILES} files.`); break }
      if (f.size > MAX_BYTES_PER_FILE) { alert(`"${f.name}" is too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_BYTES_PER_FILE / 1024 / 1024}MB per file.`); continue }
      if (totalBytes + f.size > MAX_TOTAL_BYTES) { alert(`Total exceeds ${MAX_TOTAL_BYTES / 1024 / 1024}MB.`); break }
      try {
        const data = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(String(r.result || ''))
          r.onerror = () => rej(new Error('read failed'))
          r.readAsDataURL(f)
        })
        next.push({ name: f.name, mime: f.type || 'application/octet-stream', data, size: f.size })
      } catch {/* skip */}
    }
    onChange(next)
    setBusy(false)
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!dragOver) setDragOver(true) }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false) }
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); ingest(Array.from(e.dataTransfer.files || [])) }

  const remove = (idx: number) => { const next = files.slice(); next.splice(idx, 1); onChange(next) }
  const ext = (name: string, mime: string) => {
    const m = name.match(/\.([a-z0-9]+)$/i)?.[1]?.toUpperCase()
    if (m) return m
    if (mime === 'application/pdf') return 'PDF'
    if (mime.startsWith('image/')) return 'IMG'
    if (mime.startsWith('video/')) return 'VID'
    if (mime.includes('word')) return 'DOC'
    if (mime.includes('spreadsheet') || mime === 'text/csv') return 'CSV'
    if (mime === 'text/plain') return 'TXT'
    return 'FILE'
  }

  return (
    <div
      className="paper hairline rounded-xl p-4 transition-colors"
      style={dragOver ? { borderColor: 'var(--ink)', background: 'var(--surface)' } : undefined}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      tabIndex={-1}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[13px] font-medium">Supporting materials <span className="ink-muted font-normal">— optional, unlimited</span></div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            Financial models, contracts, customer research, screenshots, term sheets, transcripts — drop anything. Andreas reads it all when generating slides.
          </div>
        </div>
        {files.length > 0 && (
          <div className="text-[11px] font-mono ink-muted whitespace-nowrap">
            {files.length} / {MAX_FILES} · {(totalBytes / 1024 / 1024).toFixed(1)}MB
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-2 pl-3 pr-2 rounded-lg hairline" style={{ background: 'var(--surface)' }}>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background:'var(--ink)', color:'#fff', letterSpacing:'0.04em' }}>{ext(f.name, f.mime)}</span>
              <span className="text-[12px] max-w-[200px] truncate">{f.name}</span>
              <span className="text-[10px] font-mono ink-muted">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
              <button onClick={() => remove(i)} className="w-5 h-5 rounded-full bg-black/40 text-white text-[11px] hover:bg-black/70 flex items-center justify-center" aria-label="Remove">×</button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy || files.length >= MAX_FILES}
        className="mt-3 w-full h-16 rounded-lg text-[12px] focus-ring transition-all"
        style={{
          border: dragOver ? '1.5px dashed var(--ink)' : '1.5px dashed var(--line)',
          color: dragOver ? 'var(--ink)' : 'var(--ink-muted)',
          background: dragOver ? 'rgba(0,0,0,0.03)' : (busy ? 'var(--surface)' : 'transparent'),
        }}>
        {busy ? 'Reading…' : files.length >= MAX_FILES ? `Max ${MAX_FILES} files reached` : (dragOver ? 'Drop files here' : files.length ? '+ Add more files' : '+ Drop or click to add files (PDF, DOC, CSV, IMG, VIDEO, TXT — up to 120)')}
      </button>
      <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden"
        onChange={e => { const fs = Array.from(e.target.files || []); if (fs.length) ingest(fs); e.target.value = '' }} />
    </div>
  )
}
