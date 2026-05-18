import { useState, useEffect, useRef } from 'react'
import { getTemplate, VC_PROFILES, personalize, extractWedge, type Template, type PersonalCtx } from '@/lib/templates'
import { brandWorldToCssVars, type BrandWorld } from '@/lib/brand-world'
import { PALETTE_LIBRARY, suggestPalettes, type Palette } from '@/lib/design-library/palettes'
import { TYPE_PAIRS, suggestTypePairs, googleFontsHref, type TypePair } from '@/lib/design-library/typography'
import { pickAxes, axesToClasses, AXIS_OPTIONS, AXIS_COMBINATIONS, type StyleAxes } from '@/lib/design-library/axes'
import { ARCHETYPES, getArchetype, inferArchetype } from '@/lib/design-library/archetypes'
import { COMPOSITIONS, getComposition } from '@/lib/design-library/composition'
import { getIconSet } from '@/lib/icons'
import { brandWorldMotifBackground } from '@/lib/motifs'
import AndreasPanel from '@/components/AndreasPanel'
import { FRAMEWORKS } from '@/lib/frameworks/library'
import { DARK_FRAMEWORKS } from '@/lib/frameworks/dark'
import { rankFrameworks, recommendCompanions } from '@/lib/frameworks/scoring'
import type { Framework } from '@/lib/frameworks/types'

/* ── Nav (matches app.html groups) ─────────────────────────── */
const NAV = [
  { group: 'Build', items: [
    { id: 'overview',   label: 'Overview',      icon: 'layers'   },
    { id: 'sources',    label: 'Sources',        icon: 'doc'      },
    { id: 'theme',      label: 'Theme',          icon: 'palette'  },
    { id: 'deck',       label: 'Deck Build',     icon: 'cards'    },
    { id: 'style',      label: 'Style Library',  icon: 'star'     },
    { id: 'frameworks', label: 'Frameworks',     icon: 'list'     },
  ]},
  { group: 'Insights', items: [
    { id: 'vclens',  label: 'VC Lens',  icon: 'eye'    },
    { id: 'audit',   label: 'Audit',    icon: 'check'  },
    { id: 'claims',  label: 'Claims',   icon: 'bolt'   },
    { id: 'signals', label: 'Signals',  icon: 'signal' },
  ]},
  { group: 'Ship', items: [
    { id: 'demo',     label: 'Demo Layer', icon: 'play'   },
    { id: 'present',  label: 'Present',    icon: 'spark'  },
    { id: 'deploy',   label: 'Deploy',     icon: 'rocket' },
    { id: 'followup', label: 'Follow-up',  icon: 'send'   },
    { id: 'settings', label: 'Settings',   icon: 'cog'    },
  ]},
]

const TITLES: Record<string, [string, string]> = {
  overview:   ['Overview',       'Your deck at a glance'],
  sources:    ['Sources',        'Materials shaping your deck'],
  theme:      ['Theme',          'Brand intelligence and overrides'],
  deck:       ['Deck Build',     'Outline, slides, inspector'],
  style:      ['Style Library',  'Transitions, layouts, palettes, moods'],
  frameworks: ['Frameworks',     'Pick a narrative spine'],
  vclens:     ['VC Lens',        "Pitch through the investor's eyes"],
  audit:      ['Audit',          'Story scoring, rewrites, objections'],
  claims:     ['Claims',         'Every assertion, classified'],
  signals:    ['Signals',        'Engagement and drop-off'],
  demo:       ['Demo Layer',     'How the product appears'],
  present:    ['Present',        'Run the room'],
  deploy:     ['Deploy',         'Send the deck live'],
  followup:   ['Follow-up',      'Voice-matched email'],
  settings:   ['Settings',       'Profile, brand, exports'],
}

const AUDIENCES = ['Seed VC', 'Series A', 'Angel', 'Strategic', 'Internal']

/** Get a short label from a URL ("stripe.com/pricing" from "https://stripe.com/pricing"). */
function hostOf(url: string): string {
  try { const u = new URL(url.startsWith('http') ? url : 'https://' + url); return u.host + (u.pathname !== '/' ? u.pathname : '') }
  catch { return url }
}
const STAGES    = ['Pre-seed', 'Seed', 'Series A', 'Series B+', 'Bootstrapped']

const SEVERITY_STYLE: Record<string, { bg: string; color: string }> = {
  good: { bg:'#e8f4ee', color:'#137a4a' },
  warn: { bg:'#fbf1dd', color:'#a86a00' },
  risk: { bg:'#fbe8e5', color:'#b0322b' },
  info: { bg:'#eff6ff', color:'#1d4ed8' },
}

const CLAIM_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  'supported':      { bg:'#e8f4ee', color:'#137a4a', label:'Supported'      },
  'needs-source':   { bg:'#fbf1dd', color:'#a86a00', label:'Needs source'   },
  'risky':          { bg:'#fbe8e5', color:'#b0322b', label:'Risky'          },
  'founder-thesis': { bg:'#eff6ff', color:'#1d4ed8', label:'Founder thesis' },
}

/* ─── Strengthen UI — per-field "✨ alternatives" picker ──────────────
   Calls /api/strengthen (Haiku, ~300 output tokens) to generate N stronger
   phrasings for one field. Founder picks one to apply. Small, cheap,
   surgical — the founder doesn't have to retype anything when their
   external AI's draft was weak. */
function StrengthenInline({ field, slideKey, current, slideContext, onApply }:
  { field: string; slideKey: string; current: string; slideContext?: any; onApply: (text: string) => void }) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [opts,    setOpts]    = useState<string[]>([])
  const [error,   setError]   = useState('')

  async function fetchAlternatives() {
    if (!current?.trim()) return
    setOpen(true); setLoading(true); setError(''); setOpts([])
    try {
      const r = await fetch('/api/strengthen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideId: slideKey, field, currentText: current, slideContext, count: 3,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`)
      setOpts(Array.isArray(data.alternatives) ? data.alternatives : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to generate')
    } finally { setLoading(false) }
  }

  return (
    <span style={{ position: 'relative' }}>
      <button onClick={fetchAlternatives} title="Generate 3 stronger alternatives"
        className="h-9 w-9 flex-shrink-0 inline-flex items-center justify-center rounded-lg hairline text-[14px] hover:bg-[var(--surface)]"
        style={{ background: 'var(--paper)' }}>
        ✦
      </button>
      {open && (
        <div onMouseLeave={() => setOpen(false)}
          className="absolute right-0 top-[calc(100%+6px)] z-30 rounded-xl hairline shadow-card p-2 w-[min(360px,90vw)]"
          style={{ background:'var(--surface)' }}>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="text-[11px] font-medium" style={{ letterSpacing:'0.04em', textTransform:'uppercase' }}>Stronger alternatives</div>
            <button onClick={() => setOpen(false)} className="text-[14px] ink-muted leading-none">×</button>
          </div>
          {loading && <div className="text-[12px] ink-muted px-2 py-3">Andreas writing 3 alternatives…</div>}
          {error && <div className="text-[12px] px-2 py-2" style={{ color:'#b0322b' }}>{error}</div>}
          {!loading && !error && opts.map((alt, i) => (
            <button key={i} onClick={() => { onApply(alt); setOpen(false) }}
              className="block w-full text-left px-2.5 py-2 rounded-lg text-[12px] hover:bg-[var(--paper)] transition-colors leading-relaxed">
              <div className="font-mono text-[9px] ink-muted mb-0.5">OPTION {i + 1}</div>
              <div>{alt}</div>
            </button>
          ))}
          {!loading && !error && opts.length === 0 && (
            <div className="text-[12px] ink-muted px-2 py-2">No alternatives returned. Try a non-empty value.</div>
          )}
        </div>
      )}
    </span>
  )
}

/** Field heading row: small label + tiny ✦ button that wraps StrengthenInline. */
function FieldHead({ label, field, slideKey, current, slideContext, onApply }:
  { label: string; field: string; slideKey: string; current: string; slideContext?: any; onApply: (text: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color:'var(--ink-muted)' }}>{label}</div>
      <StrengthenInline field={field} slideKey={slideKey} current={current} slideContext={slideContext} onApply={onApply} />
    </div>
  )
}

interface WorkspaceProps {
  onRegenerate?: (frameworkId: string) => Promise<void>
  company: string
  accentColor: string
  generatedHtml: string
  generatedContent: any
  /** Unique deck id from /api/generate — keys live viewership signals. */
  deckId?: string
  /** What narrative spine Andreas picked + strategist override reasoning. */
  narrativeInfo?: {
    narrativeId: string
    slideOrder:  string[]
    strategist?: { applied: boolean; reasoning: string; confidence: number; runnerUp?: string; runnerUpReason?: string }
  } | null
  onRestart: () => void
  logoUrl?: string
  audience?: string
  websiteUrl?: string
  realStory?: string
  founderName?: string
  stage?: string
  industry?: string
  brandWorld?: BrandWorld | null
}

/* ═══════════════════════════════════════════════════════════════════
   WORKSPACE — per-industry adaptation via templates engine
═══════════════════════════════════════════════════════════════════ */
export default function Workspace({
  company, accentColor, generatedHtml, generatedContent, deckId, narrativeInfo, onRestart, onRegenerate,
  logoUrl, audience = 'Seed VC', websiteUrl, realStory, founderName = 'You', stage = 'Pre-seed', industry, brandWorld: propBrandWorld,
}: WorkspaceProps) {
  const [active, setActive] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Plain theme toggle — when on, the workspace ignores the generated BrandWorld
  // and renders in the default monochrome SignalDeck shell. Useful for resetting
  // a noisy brand world to a neutral baseline without re-running intake.
  const [plainTheme, setPlainTheme] = useState(false)
  // Local overrides — sliders + toggles on the Theme screen mutate this. Merged
  // over the generated brand world before render so the founder can dial it
  // without burning API credits.
  const [bwOverrides, setBwOverrides] = useState<Partial<BrandWorld>>({})
  const brandWorld = plainTheme ? null : (propBrandWorld ? {
    ...propBrandWorld,
    ...bwOverrides,
    colour:  { ...(propBrandWorld.colour),  ...((bwOverrides as any).colour  || {}) },
    effects: { ...(propBrandWorld.effects), ...((bwOverrides as any).effects || {}) },
    typography: { ...(propBrandWorld.typography), ...((bwOverrides as any).typography || {}) },
  } as BrandWorld : null)

  /* Per-brand icon set — Luma gets duotone, fintech gets line, sports gets glyph.
     Falls back to line when no BrandWorld is generated yet (intake). */
  const ic = getIconSet(brandWorld?.iconStyle ?? 'line')

  /* per-company template — drives every screen */
  const [productType, setProductType] = useState(industry || 'Other')
  const [stageType,   setStageType]   = useState(stage)
  const [lensType,    setLensType]    = useState('Workflow pain + wedge')
  const [investor,    setInvestor]    = useState(audience)
  const tpl: Template = getTemplate(productType)

  /* per-company personalization context — drives {company}/{wedge}/etc substitution */
  const personalCtx: PersonalCtx = {
    company:  company  || 'Your startup',
    wedge:    extractWedge(realStory),
    audience: investor,
    stage:    stageType,
    product:  productType,
    founder:  founderName,
  }
  const px = (text: string | undefined) => personalize(text, personalCtx)

  /* deploy */
  const [vercelToken, setVercelToken] = useState('')
  const [deployUrl, setDeployUrl] = useState('')
  const [deployLoading, setDeployLoading] = useState(false)
  const [selectedDeploy, setSelectedDeploy] = useState('Vercel')
  const [deployHistory, setDeployHistory] = useState<{ target: string; url: string; time: string; status: string }[]>([])
  const [investorLinks, setInvestorLinks] = useState<string[]>([])
  const [publishOpts, setPublishOpts] = useState({ named:true, slideTrack:true, password:false, expiry:false, pdf:true, blockDl:false })

  /* refine */
  const [isRefining, setIsRefining] = useState(false)
  const [isRefined, setIsRefined] = useState(false)
  const [refinedHtml, setRefinedHtml] = useState(generatedHtml)

  /* VC Lens */
  const [vcData, setVcData] = useState<any>(null)
  const [vcLoading, setVcLoading] = useState(false)

  /* Audit */
  const [auditData, setAuditData] = useState<any>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [objectionSeed, setObjectionSeed] = useState(0)

  /* Story rewrite */
  const [rewriteSeed, setRewriteSeed] = useState(0)

  /* Claims */
  const [claimsData, setClaimsData] = useState<any>(null)
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [claimsFilter, setClaimsFilter] = useState('All')

  /* Follow-up */
  const [fuAudience, setFuAudience] = useState(audience)
  const [fuData, setFuData] = useState<any>(null)
  const [fuLoading, setFuLoading] = useState(false)
  const [fuCopied, setFuCopied] = useState(false)
  const [fuTo, setFuTo] = useState('partner@a16z.com')

  /* Deck Build */
  const [activeSlide, setActiveSlide] = useState(0)
  const [deckOpts, setDeckOpts] = useState({ motion: true, analytics: true, password: false })
  // Per-slide chat panel: scoped to whatever slide is currently active
  const [chatInput, setChatInput] = useState('')
  const [chatBusy,  setChatBusy]  = useState(false)
  const [chatLog,   setChatLog]   = useState<Record<string, { instruction: string; changeNote: string; at: number }[]>>({})
  // Locally-editable content — starts from generatedContent prop and can be
  // mutated by chat edits and inline contentEditable saves.
  const [liveContent, setLiveContent] = useState<any>(generatedContent)
  useEffect(() => { setLiveContent(generatedContent) }, [generatedContent])

  /* Sources — inspiration uploads (NEW) */
  const [inspoLinks, setInspoLinks] = useState<{ url: string; title?: string; image?: string }[]>([])
  const [inspoImages, setInspoImages] = useState<string[]>([])   // data URLs of uploaded inspo images
  const [inspoInput, setInspoInput] = useState('')

  /* Style Library */
  const [styleTab, setStyleTab] = useState<'transitions'|'layouts'|'palettes'|'moods'>('transitions')
  const [antiGeneric, setAntiGeneric] = useState(false)

  /* Frameworks */
  const [activeFramework, setActiveFramework] = useState<string|null>(null)
  const [showDarkTactics, setShowDarkTactics] = useState(false)

  /* Demo Layer */
  const [demoMode, setDemoMode] = useState<'embed'|'video'|'speaker'>('embed')
  const [demoUrl, setDemoUrl] = useState('')

  /* Present */
  const [presentSlide, setPresentSlide] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [scriptLength, setScriptLength] = useState('5 minutes')
  const [scriptTone, setScriptTone] = useState('Sharp and direct')
  const timerRef = useRef<any>(null)

  /* Settings */
  const [settingsName, setSettingsName] = useState(founderName)
  const [settingsCompany, setSettingsCompany] = useState(company)
  const [settingsIndustry, setSettingsIndustry] = useState(productType)
  const [manualHex, setManualHex] = useState(accentColor)
  const [liveAccent, setLiveAccent] = useState(accentColor)
  const [qualityGate, setQualityGate] = useState({ blockUnsourced:true, requireCta:true, mobile:true, consent:false })
  const [analyticsOpts, setAnalyticsOpts] = useState({ slideTime:true, ctaClicks:true, returns:true, location:false, device:false, anonOpt:true })
  const [exportOpts, setExportOpts] = useState({ html:true, vercel:true, cloudflare:true, netlify:true, pdf:true, pptx:false })

  /* Sources */
  const [sourcesFilter, setSourcesFilter] = useState('All')

  /* Signals */
  const [signalSeed, setSignalSeed] = useState(0)

  /* Frameworks regenerate */
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenStatus, setRegenStatus] = useState<string>('')

  const [error, setError] = useState('')

  /* derived: real slides if AI generated, else template slides */
  const realSlides = liveContent ? Object.entries(liveContent).map(([key, val]: [string, any], i) => ({
    key, kind: tpl.slides[i]?.kind || key, title: val.headline || px(tpl.slides[i]?.title) || key,
    body: val.lede || val.sub || px(tpl.slides[i]?.body) || '',
    motion: tpl.slides[i]?.motion || 'smooth reveal',
    notes: val.notes || px(tpl.slides[i]?.notes) || '',
    val,
  })) : tpl.slides.map((s, i) => ({ key: `s${i}_${s.kind.toLowerCase()}`, ...s, title: px(s.title), body: px(s.body), notes: px(s.notes), val: {} as any }))

  useEffect(() => { document.documentElement.style.setProperty('--accent', liveAccent) }, [liveAccent])

  // When a BrandWorld is provided, inject a Google Fonts <link> for its
  // heading/body/mono so the CSS vars actually have something to render.
  // Re-injects only when the font triplet changes; cleans up on unmount.
  useEffect(() => {
    if (!brandWorld) return
    const fams = [brandWorld.typography.heading, brandWorld.typography.body, brandWorld.typography.mono]
      .filter(Boolean)
      .filter((f, i, a) => a.indexOf(f) === i)
      .map(f => `family=${f.replace(/\s+/g, '+')}:wght@400;500;600;700;800;900`)
      .join('&')
    if (!fams) return
    const href = `https://fonts.googleapis.com/css2?${fams}&display=swap`
    const id = 'brand-world-fonts'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = href
  }, [brandWorld?.typography.heading, brandWorld?.typography.body, brandWorld?.typography.mono])

  useEffect(() => {
    if (timerRunning) timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [timerRunning])

  const fmtTimer = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  /* ── API ─────────────────────────────────────────────────────── */
  async function download() {
    const res = await fetch('/api/download', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: refinedHtml, filename: `${company}-deck` }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${company.toLowerCase().replace(/\s+/g,'-')}-deck.html`; a.click()
    URL.revokeObjectURL(url)
  }

  async function deployToVercel() {
    setDeployLoading(true); setError('')
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: refinedHtml, projectName: `${company.toLowerCase().replace(/\s+/g,'-')}-deck`, vercelToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDeployUrl(data.url)
      setDeployHistory(h => [{ target:'Vercel', url: data.url, time:'just now', status:'Live' }, ...h])
    } catch (e: any) { setError(e.message) }
    finally { setDeployLoading(false) }
  }

  async function refine() {
    setIsRefining(true); setError('')
    try {
      const res = await fetch('/api/refine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedContent, input: { company, accentColor: liveAccent } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRefinedHtml(data.html); setIsRefined(true)
    } catch (e: any) { setError(e.message) }
    finally { setIsRefining(false) }
  }

  async function runVCLens() {
    setVcLoading(true); setError('')
    try {
      const res = await fetch('/api/vclens', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedContent, company, persona: investor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVcData(data)
    } catch (e: any) { setError(e.message) }
    finally { setVcLoading(false) }
  }

  // ─── LIVE VIEWERSHIP SIGNALS ────────────────────────────────────────
  // Polls /api/signals?deckId=... every 10s when the Signals tab is open
  // OR a deck has been generated this session. Falls back to simulated
  // mode when no deck id exists yet (intake just finished and the API
  // call hasn't returned, OR the founder is on a /?demo route).
  const [signalsData, setSignalsData] = useState<any>(null)
  const [signalsLoading, setSignalsLoading] = useState(false)
  useEffect(() => {
    if (!deckId) return
    let cancelled = false
    async function poll() {
      if (cancelled) return
      try {
        setSignalsLoading(true)
        const r = await fetch(`/api/signals?deckId=${encodeURIComponent(deckId!)}`)
        if (r.ok) {
          const data = await r.json()
          if (!cancelled) setSignalsData(data)
        }
      } catch {} finally {
        if (!cancelled) setSignalsLoading(false)
      }
    }
    poll()
    const id = setInterval(poll, 10000)
    return () => { cancelled = true; clearInterval(id) }
  }, [deckId])

  // Per-slide layout + transition overrides. Built up locally as the founder
  // picks variants; flow back into /api/generate on the next regenerate. Zero
  // cost until they hit regenerate.
  const [layoutOverrides, setLayoutOverrides]         = useState<Record<string, string>>({})
  const [transitionOverrides, setTransitionOverrides] = useState<Record<string, string>>({})

  // Catalog of available variants + transitions per slide id. Used to render
  // the picker chips in ScreenDeck. Stays in sync with renderer's variant pickers.
  const LAYOUT_VARIANTS: Record<string, string[]> = {
    s1_intro:        ['massive-display','phone-mockup','split-editorial','minimal-centered'],
    s2_situation:    ['why-now-triple','shift-timeline','convergence','before-after-world'],
    s3_problem:      ['card-grid','stat-overlay','quote-evidence','before-state'],
    s4_implication:  ['cost-counter','risk-fan','loss-frame','status-quo-failure'],
    s5_fix:          ['checks-row','before-after','three-pillar','one-big-thing'],
    s6_how:          ['step-flow','arch-stack','sequence-arrows','inputs-outputs'],
    s7_validation:   ['hero-number','cohort-curve','logo-wall','quote-stack'],
    s8_market:       ['tam-sam-som','waterfall-bars','verticals','growth-curve'],
    s9_customers:    ['archetype-cards','persona-quotes','timeline-vertical','icon-grid'],
    s10_competition: ['matrix','positioning-grid','comparison-radar','anti-positioning'],
    s11_risks:       ['mitigation-pairs','risk-radar','risk-narrative','risk-timeline'],
    s12_team_ask:    ['split-cta','team-grid','cap-table','milestone-road'],
  }
  const TRANSITIONS = ['zoom-passage','explode','fold','warp','glitch','dropzoom','prism','vortex']

  // Theme variants — fetches /api/brand-world-variants to show 3 alternative
  // directions (loud/balanced/restrained) with per-variant contrast + fit
  // scores. Opt-in because it costs a Sonnet call.
  const [variants, setVariants] = useState<any[] | null>(null)
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variantsError, setVariantsError] = useState('')
  async function fetchVariants() {
    setVariantsLoading(true); setVariantsError('')
    try {
      const r = await fetch('/api/brand-world-variants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company, industry, audience, stage,
          oneLiner: realStory?.slice(0, 200) || '',
          websiteUrl,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`)
      setVariants(Array.isArray(data.variants) ? data.variants : [])
    } catch (e: any) {
      setVariantsError(e?.message || 'Variants failed')
    } finally {
      setVariantsLoading(false)
    }
  }
  function applyVariant(v: any) {
    if (!v?.brandWorld) return
    // Apply the entire brand-world as an override — preserves prop, can be
    // un-applied by clicking "Reset overrides".
    setBwOverrides({
      ...v.brandWorld,
      colour:     v.brandWorld.colour,
      effects:    v.brandWorld.effects,
      typography: v.brandWorld.typography,
    })
  }

  // Design with Andreas — calls /api/design-deck, replaces the deck HTML with
  // the Sonnet-handwritten cinematic version. Opt-in because it burns ~15k
  // output tokens per run; never auto-fires.
  const [designLoading, setDesignLoading] = useState(false)
  const [designStatus,  setDesignStatus]  = useState('')
  async function runDesignDeck() {
    if (!brandWorld || !liveContent) return
    setDesignLoading(true); setDesignStatus('')
    try {
      const res = await fetch('/api/design-deck', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandWorld,
          content: liveContent,
          founder: {
            company, oneLiner: '', founderName, audience, stage, industry,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      if (typeof data.html === 'string' && data.html.length > 1000) {
        // Update the in-flight deck HTML — Export PDF + Deploy both read
        // refinedHtml so the designed version flows through every share path.
        setRefinedHtml(data.html)
        // Open the new deck in a fresh tab so the founder can see it now.
        try {
          const blob = new Blob([data.html], { type: 'text/html' })
          const url  = URL.createObjectURL(blob)
          window.open(url, '_blank', 'noopener,noreferrer')
          // Revoke later so the tab has time to load.
          setTimeout(() => URL.revokeObjectURL(url), 60000)
        } catch {}
        setDesignStatus(`Done — opened in a new tab. Export PDF / Deploy now ship this version.`)
      } else {
        throw new Error('Design returned empty HTML')
      }
    } catch (e: any) {
      setDesignStatus(`Failed — ${e?.message || 'unknown error'}`)
    } finally {
      setDesignLoading(false)
      setTimeout(() => setDesignStatus(''), 12000)
    }
  }

  async function runAudit(contentOverride?: any) {
    setAuditLoading(true); setError('')
    try {
      const res = await fetch('/api/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentOverride || liveContent || generatedContent, company }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAuditData(data)
    } catch (e: any) { setError(e.message) }
    finally { setAuditLoading(false) }
  }

  // Auto re-audit after edits — only if an audit was already run (otherwise we
  // would burn API calls before the founder asked). Debounced 3s so rapid
  // edits coalesce into one call.
  useEffect(() => {
    if (!auditData) return
    const t = setTimeout(() => { runAudit(liveContent) }, 3000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveContent])

  async function runClaims() {
    setClaimsLoading(true); setError('')
    try {
      const res = await fetch('/api/claims', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedContent, company }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClaimsData(data)
    } catch (e: any) { setError(e.message) }
    finally { setClaimsLoading(false) }
  }

  async function runFollowup() {
    setFuLoading(true); setError(''); setFuCopied(false)
    try {
      const res = await fetch('/api/followup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedContent, company, audience: fuAudience, founderName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFuData(data)
    } catch (e: any) { setError(e.message) }
    finally { setFuLoading(false) }
  }

  /** Per-slide AI chat — sends current slide JSON + instruction to /api/edit-slide,
   *  updates liveContent in place when Claude returns. */
  async function editSlide(slideKey: string, instruction: string) {
    if (!instruction.trim() || !liveContent?.[slideKey]) return
    setChatBusy(true); setError('')
    try {
      const res = await fetch('/api/edit-slide', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideId:        slideKey,
          currentContent: liveContent[slideKey],
          instruction,
          company, industry: productType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'edit-slide failed')
      setLiveContent((prev: any) => ({ ...prev, [slideKey]: data.content }))
      setChatLog(prev => ({
        ...prev,
        [slideKey]: [...(prev[slideKey] || []), { instruction, changeNote: data.changeNote, at: Date.now() }],
      }))
      setChatInput('')
    } catch (e: any) { setError(e.message) }
    finally { setChatBusy(false) }
  }

  /** Inline edit — user typed into contentEditable; save the new value back. */
  function patchSlide(slideKey: string, field: string, value: string) {
    setLiveContent((prev: any) => prev ? {
      ...prev,
      [slideKey]: { ...prev[slideKey], [field]: value },
    } : prev)
  }

  /* ── Primitives ──────────────────────────────────────────────── */
  const Card = ({ children, className = '', style = {} }: any) => (
    <div className={`paper hairline rounded-[18px] shadow-card ${className}`} style={style}>{children}</div>
  )

  const Pill = ({ children, tone = 'soft' }: any) => {
    const styles: Record<string, any> = {
      good:   { background:'#e8f4ee', color:'#137a4a' },
      warn:   { background:'#fbf1dd', color:'#a86a00' },
      risk:   { background:'#fbe8e5', color:'#b0322b' },
      info:   { background:'#eff6ff', color:'#1d4ed8' },
      soft:   { background:'var(--surface)', color:'var(--ink-muted)' },
      accent: { background: liveAccent, color:'#fff' },
    }
    return <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full" style={styles[tone] || styles.soft}>{children}</span>
  }

  const MiniLabel = ({ children }: any) => (
    <div className="mini-label text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: liveAccent }}>{children}</div>
  )

  const ScoreCard = ({ label, value, suffix='/ 100' }: { label: string; value: number; suffix?: string }) => (
    <Card className="p-5">
      <div className="text-[12px] uppercase tracking-wider ink-muted mb-1">{label}</div>
      <div className="text-[28px] font-semibold tracking-tight" style={{ color: liveAccent }}>{value}</div>
      <div className="text-[12px] ink-muted">{suffix}</div>
      {suffix === '/ 100' && (
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background:'var(--surface)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width:`${value}%`, background: value>=70?'#137a4a':value>=50?'#a86a00':'#b0322b' }} />
        </div>
      )}
    </Card>
  )

  const TipCard = ({ tip }: any) => (
    <div className="p-4 rounded-xl hairline flex items-start gap-3" style={{ background:'var(--paper)' }}>
      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold flex-shrink-0"
        style={SEVERITY_STYLE[tip.severity] || SEVERITY_STYLE.info}>{tip.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[14px]">{px(tip.title)}</div>
        <div className="text-[13px] ink-muted mt-0.5 leading-relaxed">{px(tip.body)}</div>
      </div>
    </div>
  )

  const RunBtn = ({ onClick, loading, label, done, secondary }: any) => (
    <button onClick={onClick} disabled={loading}
      className="h-9 px-4 rounded-xl text-[13px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5 flex-shrink-0 hairline"
      style={secondary
        ? { background:'var(--paper)', color:'var(--ink)' }
        : { background: liveAccent, color:'#fff', border:'none' }}>
      {loading ? <><span className="sd-spinner">◐</span> Working…</> : done ? <><ic.refresh className="w-3.5 h-3.5"/>Re-run</> : label}
    </button>
  )

  const MotionChip = ({ children }: any) => (
    <span className="inline-flex items-center text-[10px] font-mono px-2 py-1 rounded-full uppercase tracking-wider"
      style={{ background: liveAccent+'12', color: liveAccent, border: `1px solid ${liveAccent}33` }}>
      {children}
    </span>
  )

  const [t1, t2] = TITLES[active] || ['', '']

  /* ── OVERVIEW ────────────────────────────────────────────────── */
  const ScreenOverview = () => {
    const auditScore = auditData?.overall ?? Math.round(tpl.scoreBaseline.reduce((a,b)=>a+b,0)/4 * 10)
    const claimsCount = claimsData?.claims?.length ?? tpl.exampleClaims.length
    const claimsFix   = claimsData ? claimsData.claims.filter((c:any) => c.classification !== 'supported').length : tpl.exampleClaims.filter(c => c.classification !== 'supported').length
    // Pretty labels for narrative IDs so the founder doesn't see kebab-case
    const NARRATIVE_LABEL: Record<string, string> = {
      'show-me-the-machine': 'Show me the machine',
      'bet-on-founder':      'Bet on the founder',
      'belief-driven':       'Belief-driven',
      'precision-first':     'Precision-first',
      'transformation':      'Transformation',
      'category-creator':    'Category creator',
      'efficient-default':   'Efficient default',
    }
    return (
      <div className="p-6 lg:p-8 space-y-5">
        {/* Hero */}
        <Card className="p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage:`linear-gradient(135deg,${liveAccent},transparent)` }} />
          <div className="relative grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <div>
              <MiniLabel>Project command centre</MiniLabel>
              <h1
                className={`display-heading text-[28px] sm:text-[34px] font-semibold tracking-tight leading-tight mt-2 ${fx.heroWatermark ? 'has-watermark' : ''}`}
                data-watermark={fx.heroWatermark ? (company || 'OVERVIEW').toUpperCase() : undefined}
              >
                From rough founder notes to a live <span className="accent-text">investor deck</span>
              </h1>
              <p className="ink-muted mt-3 text-[14px] leading-relaxed max-w-lg">
                SignalDeck audits the story, applies a {productType} VC lens, checks claims, builds an interactive deck, deploys it, and shows what investors cared about after opening it.
              </p>
              <div className="flex gap-2 mt-5 flex-wrap">
                <button onClick={() => setActive('audit')}
                  className="brand-glow h-10 px-4 rounded-xl font-medium text-[14px] text-white inline-flex items-center gap-2" style={{ background: 'var(--primary-fill)' }}>
                  <ic.check className="w-4 h-4"/> Run audit
                </button>
                <button onClick={() => setActive('sources')}
                  className="h-10 px-4 rounded-xl font-medium text-[14px] paper hairline">
                  Upload sources
                </button>
                <button onClick={() => setActive('signals')}
                  className="h-10 px-4 rounded-xl font-medium text-[14px] paper hairline">
                  View signals
                </button>
              </div>
            </div>
            <Card className="p-5" style={{ background:`${liveAccent}08`, borderColor:`${liveAccent}33` }}>
              <MiniLabel>Readiness snapshot</MiniLabel>
              <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
                <div className="p-3 rounded-xl hairline" style={{ background:'var(--paper)' }}>
                  <div className="text-[32px] font-semibold tracking-tight" style={{ color: liveAccent }}>{auditScore}</div>
                  <div className="text-[11px] ink-muted leading-tight mt-0.5">Investor readiness</div>
                </div>
                <div className="p-3 rounded-xl hairline" style={{ background:'var(--paper)' }}>
                  <div className="text-[32px] font-semibold tracking-tight" style={{ color: liveAccent }}>{claimsCount}</div>
                  <div className="text-[11px] ink-muted leading-tight mt-0.5">Claims checked</div>
                </div>
              </div>
              <TipCard tip={tpl.tips[1]} />
            </Card>
          </div>
        </Card>

        {/* Stat strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { v: realSlides.length, t:'Deck slides',     d: `${productType} structure for ${stageType.toLowerCase()} investors.` },
            { v: 5,                  t:'Sources',         d:'Notes, screenshots, website copy, demo material, proof.' },
            { v: investorLinks.length, t:'Investor links', d:'Named links ready for separate tracking.' },
            { v: '43%',              t:'Drop-off risk',   d:`Likely weak slide: ${tpl.slides[Math.floor(tpl.slides.length/2)]?.kind || 'Market'}.` },
          ].map((m, i) => (
            <Card key={i} className="p-5">
              <div className="text-[36px] font-semibold tracking-tight leading-none" style={{ color: liveAccent, fontFamily:'inherit' }}>{m.v}</div>
              <div className="font-medium text-[13px] mt-3">{m.t}</div>
              <div className="text-[12px] ink-muted mt-1 leading-relaxed">{m.d}</div>
            </Card>
          ))}
        </div>

        {/* Narrative spine — surfaces WHICH narrative Andreas picked and why.
            Hidden until a real generation has run (no info from /?demo). */}
        {narrativeInfo && narrativeInfo.narrativeId && (
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <MiniLabel>Narrative spine</MiniLabel>
                <div className="font-semibold text-[16px] mt-1.5">
                  {NARRATIVE_LABEL[narrativeInfo.narrativeId] || narrativeInfo.narrativeId}
                </div>
                {narrativeInfo.strategist && narrativeInfo.strategist.applied && (
                  <div className="text-[12px] ink-muted mt-1.5 leading-relaxed max-w-2xl">
                    <span className="font-medium" style={{ color: liveAccent }}>Andreas overrode the default:</span> {narrativeInfo.strategist.reasoning}
                    {narrativeInfo.strategist.runnerUp && (
                      <span className="block mt-1 text-[11px]">
                        Runner-up: <b>{NARRATIVE_LABEL[narrativeInfo.strategist.runnerUp] || narrativeInfo.strategist.runnerUp}</b>{narrativeInfo.strategist.runnerUpReason ? ` — ${narrativeInfo.strategist.runnerUpReason}` : ''}
                      </span>
                    )}
                  </div>
                )}
                {narrativeInfo.strategist && !narrativeInfo.strategist.applied && (
                  <div className="text-[12px] ink-muted mt-1.5 leading-relaxed max-w-2xl">
                    Confirmed by Andreas (confidence {narrativeInfo.strategist.confidence}/100). {narrativeInfo.strategist.reasoning}
                  </div>
                )}
              </div>
              {narrativeInfo.slideOrder.length > 0 && (
                <div className="flex-shrink-0 min-w-0 max-w-full">
                  <MiniLabel>Slides selected ({narrativeInfo.slideOrder.length})</MiniLabel>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {narrativeInfo.slideOrder.map((s, i) => (
                      <span key={s} className="inline-flex items-center text-[10px] font-medium px-2 py-1 rounded-full hairline"
                        style={{ background:'var(--surface)', letterSpacing:'0.02em' }}>
                        <span className="font-mono mr-1.5 opacity-50">{String(i+1).padStart(2,'0')}</span>
                        {s.replace(/^s\d+_/, '').replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Pipeline + AI workbench */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="font-semibold tracking-tight mb-1">Build pipeline</div>
            <div className="text-[12px] ink-muted mb-5">What the product does step by step</div>
            <div className="relative space-y-3 pl-9">
              <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background:`linear-gradient(${liveAccent},var(--line))` }} />
              {[
                { n:1, t:'Parse founder context', d:`Extract problem, customer, proof, risks, and ${productType.toLowerCase()} market claims.` },
                { n:2, t:'Apply VC lens',         d:`Restructure based on product type (${productType}), stage (${stageType}), and investor (${investor}).` },
                { n:3, t:'Build coded deck',      d:'Render the approved story into HTML, CSS, JS, and analytics events.' },
                { n:4, t:'Track signals',         d:'Measure time per slide, drop-off, return visits, CTA clicks, and follow-up intent.' },
              ].map(s => (
                <div key={s.n} className="relative grid grid-cols-[28px_1fr] gap-3 items-start">
                  <div className="absolute -left-9 top-0 w-8 h-8 rounded-xl flex items-center justify-center font-mono text-[11px] font-semibold z-10"
                    style={{ background:'var(--paper)', border:`1px solid ${liveAccent}55`, color: liveAccent }}>{s.n}</div>
                  <div className="col-start-2 p-3 rounded-xl hairline" style={{ background:'var(--paper)' }}>
                    <div className="font-medium text-[13px]">{s.t}</div>
                    <div className="text-[12px] ink-muted mt-1 leading-relaxed">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="font-semibold tracking-tight mb-1">How Andreas built this deck</div>
            <div className="text-[12px] ink-muted mb-5">Andreas is your pitchdeck specialist — purpose-built for investor narrative</div>
            <div className="space-y-3">
              <TipCard tip={{ icon:'A', severity:'info', title:'Story analysis',     body:'Andreas parses your context, runs a VC lens over the structure, simulates objections, and decides the narrative spine.' }} />
              <TipCard tip={{ icon:'A', severity:'good', title:'Copy polish',        body:'Andreas writes slide copy, speaker notes, follow-up messages, and tone variations matched to your audience.' }} />
              <TipCard tip={{ icon:'JS', severity:'warn', title:'Safe rendering',     body:'Andreas returns structured data; the app renders safe templates into real HTML — no hallucinated layouts.' }} />
            </div>
          </Card>
        </div>

        {/* Pitch coach */}
        {!isRefined && (
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold tracking-tight">Run pitch coach</div>
                <div className="text-[13px] ink-muted mt-1 leading-relaxed">Rebuilds headlines to 2–5 words, sharpens bullets, removes buzzwords.</div>
              </div>
              {isRefining
                ? <div className="flex-shrink-0 flex items-center gap-2 text-[13px]" style={{ color: liveAccent }}><span className="sd-spinner">◐</span> Working…</div>
                : <button onClick={refine} className="flex-shrink-0 h-9 px-4 rounded-xl text-[13px] font-medium text-white" style={{ background: liveAccent }}>✦ Run coach</button>
              }
            </div>
          </Card>
        )}
        {error && <div className="sd-error">{error}</div>}
      </div>
    )
  }

  /* ── SOURCES ─────────────────────────────────────────────────── */
  const [openSource, setOpenSource] = useState<any>(null)
  const ScreenSources = () => {
    const sources: any[] = [
      logoUrl    && { type:'Brand',   title:'Logo / mark',                value: logoUrl.slice(0,40)+'…',                          status:'Ready',           confidence:'High',   tag:'good', body:'Logo extracted from your domain — used in deck cover and footer.' },
      websiteUrl && { type:'Brand',   title: websiteUrl.replace(/^https?:\/\//,''), value:'Brand colours and fonts extracted',     status:'Ready',           confidence:'High',   tag:'good', body:'Website fetched, theme colours and fonts pulled in to drive the deck theme.' },
      realStory  && { type:'Story',   title:'Founder story',              value: realStory.slice(0,80)+(realStory.length>80?'…':''),status:'Used in deck',    confidence:'High',   tag:'good', body:realStory },
                    { type:'Voice',   title:'Voice profile',              value:'Extracted tone from your story input',              status:'Used in audit',  confidence:'Medium', tag:'info', body:'Voice match used for follow-up email generation and speaker notes tone.' },
                    { type:'Deck',    title:'Andreas deck draft',          value:`Generated ${realSlides.length}-slide deck`,        status:'Used in deck',    confidence:'High',   tag:'good', body:'Structured slide data returned by Andreas, rendered through the deterministic template.' },
      isRefined && { type:'Deck',    title:'Andreas pitch coach pass',    value:'Refined all copy — headlines, bullets, lede',       status:'Applied',         confidence:'High',   tag:'good', body:'Andreas rewrote headlines to 2–5 words and sharpened proof claims.' },
      // Inspo links from this session
      ...inspoLinks.map(l => ({ type:'Inspo', title: l.title || l.url, value: l.url, status:'Reference', confidence:'Medium', tag:'info', body:`Inspiration link — Andreas pulls tone + structure from this.` })),
      // Inspo images uploaded this session
      ...inspoImages.map((_, i) => ({ type:'Inspo', title:`Inspiration image ${i+1}`, value:'(uploaded)', status:'Reference', confidence:'Medium', tag:'info', body:'Uploaded image. Used as a visual reference for layout and feel.' })),
    ].filter(Boolean)

    const filtered = sourcesFilter === 'All' ? sources : sources.filter(s => s.type === sourcesFilter)

    return (
      <div className="p-6 lg:p-8 space-y-5">
        {/* Hero */}
        <Card className="p-6 sm:p-8 relative overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <div>
              <MiniLabel>Source library</MiniLabel>
              <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight mt-2">
                Separate real proof from loose <span style={{ color: liveAccent }}>claims</span>
              </h1>
              <p className="ink-muted mt-2 text-[14px] leading-relaxed max-w-lg">
                Upload founder notes, old decks, links, screenshots, customer quotes, and investor feedback. Every slide should know what evidence supports it.
              </p>
              <div className="flex gap-2 mt-5 flex-wrap">
                <button className="h-10 px-4 rounded-xl font-medium text-[14px] text-white inline-flex items-center gap-2" style={{ background: liveAccent }}>
                  <ic.plus className="w-4 h-4"/> Add source
                </button>
                <button onClick={() => setActive('claims')} className="h-10 px-4 rounded-xl font-medium text-[14px] paper hairline">
                  Scan for claims
                </button>
              </div>
            </div>
            <Card className="p-5" style={{ background:'var(--surface)' }}>
              <MiniLabel>Source quality</MiniLabel>
              <div className="space-y-2.5 mt-3">
                {[['Proof', 76],['Claims', 58],['Assets', 88]].map(([l, v]: any) => (
                  <div key={l} className="grid grid-cols-[70px_1fr_36px] items-center gap-2 text-[12px] ink-muted">
                    <span>{l}</span>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background:'var(--paper)' }}>
                      <div className="h-full rounded-full" style={{ width:`${v}%`, background:`linear-gradient(90deg,${liveAccent},${liveAccent}99)` }}/>
                    </div>
                    <b className="text-right">{v}%</b>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Card>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {['All','Brand','Story','Voice','Deck','Inspo'].map(f => (
            <button key={f} onClick={() => setSourcesFilter(f)}
              className="h-8 px-3.5 rounded-full text-[13px] font-medium hairline transition-all"
              style={sourcesFilter===f ? { background: liveAccent, color:'#fff', border:'none' } : {}}>
              {f}
            </button>
          ))}
          <Pill tone="soft">{sources.length} sources</Pill>
        </div>

        {/* Inspiration uploader — paste a link OR drop an image. Claude pulls tone + layout cues from these. */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold tracking-tight">Inspiration</div>
              <div className="text-[12px] ink-muted mt-0.5">
                Paste links to decks / sites / videos you want this to feel like, or drop an image. Used as reference, not copied.
              </div>
            </div>
          </div>

          {/* URL input */}
          <div className="flex gap-2 mb-3">
            <input
              value={inspoInput}
              onChange={e => setInspoInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && inspoInput.trim()) {
                  e.preventDefault()
                  const url = inspoInput.trim()
                  setInspoLinks(prev => [...prev, { url, title: hostOf(url) }])
                  setInspoInput('')
                }
              }}
              placeholder='e.g. https://stripe.com  /  https://vimeo.com/...  /  a competitor deck URL'
              className="flex-1 h-10 px-3 rounded-xl text-[13px] hairline" />
            <button
              onClick={() => {
                if (!inspoInput.trim()) return
                const url = inspoInput.trim()
                setInspoLinks(prev => [...prev, { url, title: hostOf(url) }])
                setInspoInput('')
              }}
              className="h-10 px-4 rounded-xl text-[13px] font-medium text-white"
              style={{ background: liveAccent }}>
              Add link
            </button>
          </div>

          {/* Image drop */}
          <label
            className="block cursor-pointer rounded-xl text-center text-[12px] py-4 transition-all"
            style={{ border:'1.5px dashed var(--line)', color:'var(--ink-muted)' }}>
            + Drop or click to upload an inspiration image (PNG/JPG)
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={async e => {
                const files = e.target.files
                if (!files) return
                const { compressMany } = await import('@/lib/image-upload')
                const imgs = await compressMany(files)
                setInspoImages(prev => [...prev, ...imgs.map(i => i.dataUrl)])
                e.target.value = ''
              }} />
          </label>

          {/* Active inspo list */}
          {(inspoLinks.length > 0 || inspoImages.length > 0) && (
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {inspoLinks.map((l, i) => (
                <div key={`l-${i}`} className="p-3 rounded-lg hairline flex items-start justify-between gap-2" style={{ background:'var(--surface)' }}>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider ink-muted">Link</div>
                    <div className="text-[12px] font-mono truncate">{l.url}</div>
                  </div>
                  <button onClick={() => setInspoLinks(prev => prev.filter((_, j) => j !== i))}
                    className="text-[16px] leading-none ink-muted hover:text-red-500">×</button>
                </div>
              ))}
              {inspoImages.map((src, i) => (
                <div key={`i-${i}`} className="p-2 rounded-lg hairline relative" style={{ background:'var(--surface)' }}>
                  <img src={src} alt={`inspo ${i+1}`} className="w-full h-24 object-cover rounded" />
                  <button onClick={() => setInspoImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-[12px]">×</button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s: any, i: number) => (
            <Card key={i} className="p-5 cursor-pointer transition-all hover:-translate-y-0.5" onClick={() => setOpenSource(s)}>
              <MiniLabel>{s.type}</MiniLabel>
              <div className="font-semibold text-[14px] mt-1.5 truncate">{s.title}</div>
              <div className="text-[12px] ink-muted mt-2 leading-relaxed line-clamp-2">{s.body}</div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Pill tone={s.tag}>{s.status}</Pill>
                <Pill tone="soft">{s.confidence} confidence</Pill>
              </div>
            </Card>
          ))}
          <Card className="p-5 flex flex-col items-center justify-center text-center min-h-[140px]" style={{ background:'var(--surface)', border:'1.5px dashed var(--line)' }}>
            <ic.upload className="w-5 h-5 ink-muted mb-2"/>
            <div className="text-[13px] font-medium">Add another source</div>
            <div className="text-[12px] ink-muted mt-1">Logos, sites, decks, notes, screenshots, audio.</div>
          </Card>
        </div>

        {/* Source modal */}
        {openSource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpenSource(null)}>
            <Card className="w-full max-w-xl p-6" onClick={(e: any) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <MiniLabel>{openSource.type}</MiniLabel>
                  <div className="font-semibold text-[16px] mt-1">{openSource.title}</div>
                </div>
                <button onClick={() => setOpenSource(null)} className="w-8 h-8 rounded-lg hairline">×</button>
              </div>
              <div className="space-y-3">
                <TipCard tip={{ icon:'i', severity: openSource.tag, title: openSource.status, body: openSource.body }} />
                <div className="p-4 rounded-xl hairline">
                  <div className="text-[12px] uppercase tracking-wider ink-muted mb-1">Suggested use</div>
                  <div className="text-[13px] leading-relaxed">Attach this source to the most relevant slide and use it to support claims, screenshots, or product proof.</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    )
  }

  /* ── THEME ───────────────────────────────────────────────────── */
  const ScreenTheme = () => {
    const tints = [liveAccent, liveAccent+'cc', liveAccent+'99', liveAccent+'55', liveAccent+'22']
    const bw = brandWorld
    return (
      <div className="p-6 lg:p-8">
        {/* Brand System Inspector — expose everything the brand-world generator
            decided so the founder can see/audit it, not just the accent colour.
            Hidden when no brand world has been generated. */}
        {bw && (
          <Card className="p-5 mb-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <MiniLabel>Brand system inspector</MiniLabel>
                <div className="font-semibold text-[15px] mt-1">{bw.brandPersonality}</div>
                <div className="text-[12px] ink-muted mt-1 leading-relaxed max-w-2xl">{bw.whyThisWorks}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="inline-flex items-center text-[10px] font-medium px-2 py-1 rounded-full hairline" style={{ letterSpacing:'0.04em', textTransform:'uppercase' }}>
                  {bw.visualRichness}
                </span>
                <span className="inline-flex items-center text-[10px] font-medium px-2 py-1 rounded-full hairline" style={{ letterSpacing:'0.04em', textTransform:'uppercase' }}>
                  {bw.deckMode}
                </span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[12px]">
              <div className="p-3 rounded-lg hairline">
                <MiniLabel>Typography</MiniLabel>
                <div className="mt-1 leading-relaxed"><span className="ink-muted">Heading:</span> {bw.typography.heading} {bw.typography.headingWeight}</div>
                <div className="leading-relaxed"><span className="ink-muted">Body:</span> {bw.typography.body} {bw.typography.bodyWeight}</div>
                <div className="leading-relaxed"><span className="ink-muted">Mono:</span> {bw.typography.mono}</div>
              </div>
              <div className="p-3 rounded-lg hairline">
                <MiniLabel>Style</MiniLabel>
                <div className="mt-1 leading-relaxed"><span className="ink-muted">Layout:</span> {bw.layoutStyle}</div>
                <div className="leading-relaxed"><span className="ink-muted">Cards:</span> {bw.cardStyle} · r{bw.radius}px</div>
                <div className="leading-relaxed"><span className="ink-muted">Buttons:</span> {bw.buttonStyle}</div>
                <div className="leading-relaxed"><span className="ink-muted">Icons:</span> {bw.iconStyle}</div>
              </div>
              <div className="p-3 rounded-lg hairline">
                <MiniLabel>Effects</MiniLabel>
                <div className="mt-1 leading-relaxed flex flex-wrap gap-1">
                  {Object.entries(bw.effects || {}).filter(([,v]) => v).map(([k]) => (
                    <span key={k} className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background:'rgba(0,0,0,0.05)' }}>{k}</span>
                  ))}
                  {!Object.values(bw.effects || {}).some(Boolean) && <span className="ink-muted">none</span>}
                </div>
              </div>
              <div className="p-3 rounded-lg hairline sm:col-span-2 lg:col-span-3">
                <MiniLabel>Motifs</MiniLabel>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(bw.motifs || []).map((m, i) => (
                    <span key={i} className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full hairline">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
        {/* Theme variants — 3 alternative directions in one Sonnet call.
            Scored on contrast + industry fit + boldness, ranked best-first. */}
        {bw && (
          <Card className="p-5 mb-5">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <MiniLabel>Explore directions</MiniLabel>
                <div className="font-semibold tracking-tight mt-1">Three brand-world variants</div>
                <div className="text-[12px] ink-muted mt-0.5">Loud, balanced, restrained. Andreas scores each on contrast + industry fit + boldness; best-fit leads.</div>
              </div>
              <button onClick={fetchVariants} disabled={variantsLoading}
                className="h-9 px-4 rounded-xl text-[13px] font-medium text-white inline-flex items-center gap-2 disabled:opacity-50"
                style={{ background: liveAccent }}>
                {variantsLoading ? <><span className="sd-spinner">◐</span> Generating…</> : <>✦ Generate 3 variants</>}
              </button>
            </div>
            {variantsError && <div className="text-[12px] mt-2" style={{ color:'#b0322b' }}>{variantsError}</div>}
            {variants && variants.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                {variants.map((v: any, i: number) => {
                  const c = v.brandWorld?.colour || {}
                  return (
                    <div key={v.id || i} className="rounded-xl hairline overflow-hidden flex flex-col">
                      {/* Hero strip showing the variant's actual colours */}
                      <div className="h-20 relative" style={{ background: c.background }}>
                        <div className="absolute inset-3 rounded-lg" style={{ background: c.surface }}>
                          <div className="absolute top-2 left-3 right-3 h-1.5 rounded-full" style={{ background: c.primary }}/>
                          <div className="absolute top-5 left-3 w-2/3 h-1 rounded-full" style={{ background: c.text, opacity:.7 }}/>
                          <div className="absolute bottom-2 right-3 w-12 h-3 rounded-full" style={{ background: c.primary }}/>
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: liveAccent }}>{v.temperament}</span>
                          {i === 0 && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background:'#dcfce7', color:'#137a4a', letterSpacing:'0.04em', textTransform:'uppercase' }}>Best fit</span>
                          )}
                        </div>
                        <div className="text-[12px] ink-muted leading-snug">{v.why}</div>
                        <div className="text-[10px] font-mono ink-muted">
                          contrast {v.scores?.contrast}/100 · fit {v.scores?.fit}/100 · bold {v.scores?.boldness}/100
                        </div>
                        <div className="text-[10px] font-mono ink-muted truncate">
                          {v.brandWorld?.typography?.heading} · {v.brandWorld?.typography?.body}
                        </div>
                        <button onClick={() => applyVariant(v)}
                          className="mt-auto h-8 rounded-lg text-[12px] font-medium text-white"
                          style={{ background: liveAccent }}>
                          Apply this direction
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {/* Curated palettes — instant swap, zero API cost. Pulls from the
            50-strong PALETTE_LIBRARY. Suggestions match the founder's industry. */}
        {bw && (
          <Card className="p-5 mb-5">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <MiniLabel>Curated palettes</MiniLabel>
                <div className="font-semibold tracking-tight mt-1">Drop a tested brand palette</div>
                <div className="text-[12px] ink-muted mt-0.5">{PALETTE_LIBRARY.length} proven palettes from real brands — Stripe, Up, Notion, Anthropic, Patagonia. Click to apply instantly.</div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(suggestPalettes([productType, stageType, investor].filter(Boolean), 12).length
                ? suggestPalettes([productType, stageType, investor].filter(Boolean), 12)
                : PALETTE_LIBRARY.slice(0, 12)
              ).map((pal: Palette) => (
                <button key={pal.id}
                  onClick={() => setBwOverrides(o => ({ ...o, colour: pal.colour as any, deckMode: pal.deckMode }))}
                  className="text-left rounded-xl hairline overflow-hidden hover:scale-[1.02] transition-transform">
                  <div className="h-14 flex" style={{ background: pal.colour.background }}>
                    <div className="flex-1" style={{ background: pal.colour.surface }} />
                    <div className="w-1/3 flex flex-col">
                      <div className="flex-1" style={{ background: pal.colour.primary }} />
                      <div className="flex-1" style={{ background: pal.colour.accent }} />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="text-[12px] font-semibold leading-tight">{pal.name}</div>
                    <div className="text-[10px] ink-muted mt-0.5 line-clamp-2">{pal.vibe}</div>
                    {pal.inspiredBy && (
                      <div className="text-[9px] font-mono mt-1 ink-muted" style={{ letterSpacing: '0.04em' }}>{pal.inspiredBy.toUpperCase()}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Typography pairings — Google Fonts that auto-load. */}
        {bw && (
          <Card className="p-5 mb-5">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <MiniLabel>Typography pairings</MiniLabel>
                <div className="font-semibold tracking-tight mt-1">Swap fonts in one click</div>
                <div className="text-[12px] ink-muted mt-0.5">{TYPE_PAIRS.length} curated Google Font pairs by personality. Auto-loads on apply.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(suggestTypePairs([productType, stageType, investor].filter(Boolean), 9).length
                ? suggestTypePairs([productType, stageType, investor].filter(Boolean), 9)
                : TYPE_PAIRS.slice(0, 9)
              ).map((pair: TypePair) => (
                <button key={pair.id}
                  onClick={() => {
                    // Inject the Google Fonts <link> for the new pair, then apply.
                    if (typeof document !== 'undefined') {
                      const id = `gf-${pair.id}`
                      if (!document.getElementById(id)) {
                        const link = document.createElement('link')
                        link.id = id; link.rel = 'stylesheet'; link.href = googleFontsHref(pair)
                        document.head.appendChild(link)
                      }
                    }
                    setBwOverrides(o => ({
                      ...o,
                      typography: {
                        ...(bw.typography),
                        heading: pair.heading, body: pair.body, mono: pair.mono,
                        style: pair.style, headingWeight: pair.headingWeight,
                        bodyWeight: pair.bodyWeight, tracking: pair.tracking,
                      } as any,
                    }))
                  }}
                  className="text-left rounded-xl hairline p-3 hover:bg-[var(--surface)] transition-colors">
                  <div className="font-semibold text-[14px]" style={{ fontFamily: `'${pair.heading}', sans-serif` }}>{pair.name}</div>
                  <div className="text-[11px] mt-1 ink-muted" style={{ fontFamily: `'${pair.body}', sans-serif` }}>{pair.vibe}</div>
                  <div className="text-[10px] font-mono mt-2 ink-muted" style={{ letterSpacing: '0.04em' }}>
                    {pair.heading.toUpperCase()} · {pair.body.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Live overrides — zero API cost. Tweak the active brand world via
            sliders and toggles. Reset returns to the generated original. */}
        {bw && (
          <Card className="p-5 mb-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <MiniLabel>Live overrides</MiniLabel>
                <div className="font-semibold tracking-tight mt-1">Dial the design without re-generating</div>
                <div className="text-[12px] ink-muted mt-0.5">Changes apply to the workspace immediately, no API call.</div>
              </div>
              {Object.keys(bwOverrides).length > 0 && (
                <button onClick={() => setBwOverrides({})}
                  className="h-8 px-3 rounded-xl text-[12px] hairline ink-muted inline-flex items-center gap-1.5">
                  <ic.refresh className="w-3 h-3"/> Reset overrides
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Radius slider */}
              <div className="p-3 rounded-lg hairline">
                <MiniLabel>Card radius</MiniLabel>
                <div className="mt-1 text-[13px] font-medium font-mono">{bw.radius}px</div>
                <input type="range" min="4" max="32" step="2" value={bw.radius}
                  onChange={e => setBwOverrides(o => ({ ...o, radius: Number(e.target.value) }))}
                  className="w-full mt-2" style={{ accentColor: liveAccent }} />
              </div>
              {/* Density */}
              <div className="p-3 rounded-lg hairline">
                <MiniLabel>Density</MiniLabel>
                <div className="grid grid-cols-3 gap-1 mt-2">
                  {(['tight','normal','spacious'] as const).map(d => (
                    <button key={d} onClick={() => setBwOverrides(o => ({ ...o, density: d }))}
                      className="h-7 rounded-md text-[11px] font-medium"
                      style={{ background: bw.density === d ? liveAccent : 'var(--surface)', color: bw.density === d ? '#fff' : 'var(--ink)' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              {/* Visual richness tier */}
              <div className="p-3 rounded-lg hairline">
                <MiniLabel>Richness</MiniLabel>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {(['restrained','balanced','rich','maximal'] as const).map(r => (
                    <button key={r} onClick={() => setBwOverrides(o => ({ ...o, visualRichness: r }))}
                      className="h-7 rounded-md text-[10px] font-medium px-1"
                      style={{ background: bw.visualRichness === r ? liveAccent : 'var(--surface)', color: bw.visualRichness === r ? '#fff' : 'var(--ink)' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {/* Deck mode */}
              <div className="p-3 rounded-lg hairline">
                <MiniLabel>Deck mode</MiniLabel>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {(['light','dark'] as const).map(m => (
                    <button key={m} onClick={() => setBwOverrides(o => ({ ...o, deckMode: m }))}
                      className="h-7 rounded-md text-[11px] font-medium"
                      style={{ background: bw.deckMode === m ? liveAccent : 'var(--surface)', color: bw.deckMode === m ? '#fff' : 'var(--ink)' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Effect toggles — six on/off chips */}
            <div className="p-3 rounded-lg hairline">
              <MiniLabel>Effects</MiniLabel>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(['gridOverlay','radialAmbient','heroWatermark','monoLabels','glow','grainOverlay'] as const).map(k => {
                  const on = Boolean((bw.effects as any)[k])
                  return (
                    <button key={k} onClick={() => setBwOverrides(o => ({ ...o, effects: { ...(bw.effects), ...((o as any).effects || {}), [k]: !on } }))}
                      className="h-7 px-2.5 rounded-full text-[10px] font-medium"
                      style={{ background: on ? liveAccent : 'var(--surface)', color: on ? '#fff' : 'var(--ink-muted)' }}>
                      {on ? '✓ ' : ''}{k}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Algorithmic variation — 5 independent style axes (675 combos per
            layout × 48 layouts = 32,400 distinct visual outputs). Derived
            deterministically from brand world + company name; any can be
            overridden live without an API call. */}
        {bw && (() => {
          const computedAxes = pickAxes(bw, company || '')
          const currentAxes  = { ...computedAxes, ...((bwOverrides as any)._axes || {}) }
          const setAxis = (key: keyof StyleAxes, value: any) => {
            setBwOverrides(o => ({ ...o, _axes: { ...(o as any)._axes, [key]: value } } as any))
          }
          return (
            <Card className="p-5 mb-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <MiniLabel>Algorithmic variation</MiniLabel>
                  <div className="font-semibold tracking-tight mt-1">5 style axes — {AXIS_COMBINATIONS.toLocaleString()} combinations</div>
                  <div className="text-[12px] ink-muted mt-0.5">
                    These compose multiplicatively on top of every layout. Auto-picked from your brand; click any value to override.
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {(Object.keys(AXIS_OPTIONS) as Array<keyof StyleAxes>).map(axisKey => (
                  <div key={axisKey} className="p-2.5 rounded-lg hairline">
                    <MiniLabel>{axisKey.replace(/([A-Z])/g, ' $1').replace(/Fx$/, '').trim()}</MiniLabel>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(AXIS_OPTIONS[axisKey] as readonly string[]).map(val => {
                        const isActive = currentAxes[axisKey] === val
                        return (
                          <button key={val} onClick={() => setAxis(axisKey, val)}
                            className="text-[10px] font-medium px-2 py-1 rounded-full transition-colors"
                            style={{
                              background: isActive ? liveAccent : 'var(--surface)',
                              color: isActive ? '#fff' : 'var(--ink-muted)',
                              letterSpacing: '0.02em',
                            }}>
                            {val.replace(/-/g, ' ')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] ink-muted font-mono pt-1">
                {axesToClasses(currentAxes).split(' ').join(' · ')}
              </div>
            </Card>
          )
        })()}

        {/* Brand Archetype — Jungian DNA. The brand-world API attaches an
            archetype inference; founder can override here. Surfaces "why
            this design works" in one click. */}
        {(() => {
          const inferred = (bw as any)?.archetype || (bw ? inferArchetype(bw) : null)
          const inferredId = (inferred as any)?.archetype?.id || (inferred as any)?.id
          const overrideId = (bwOverrides as any)?.archetype?.id
          const activeId = overrideId || inferredId
          const active = activeId ? getArchetype(activeId) : null
          const confidence = (inferred as any)?.confidence ?? 100
          const runnerUp = typeof (inferred as any)?.runnerUp === 'string'
            ? (inferred as any).runnerUp
            : (inferred as any)?.runnerUp?.id
          return (
            <Card className="p-5 mb-5">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div>
                  <MiniLabel>Brand Archetype</MiniLabel>
                  <div className="font-semibold tracking-tight mt-1">
                    {active ? `${active.name}` : 'Pick an archetype'}
                    {active && (<span className="ml-2 text-[11px] ink-muted font-mono">{overrideId ? 'override' : `${confidence}% match`}{runnerUp && !overrideId ? ` · runner-up: ${runnerUp}` : ''}</span>)}
                  </div>
                  {active && (
                    <div className="text-[12px] ink-muted mt-1.5 max-w-[640px]">
                      <span className="font-medium" style={{ color: 'var(--ink)' }}>{active.promise}.</span> Voice: {active.voice}. Like {active.exemplarBrands.slice(0, 4).join(', ')}.
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
                {ARCHETYPES.map(a => {
                  const isActive = a.id === activeId
                  return (
                    <button
                      key={a.id}
                      onClick={() => setBwOverrides(o => ({ ...o, archetype: { id: a.id, confidence: 100 } } as any))}
                      className="text-left p-2.5 rounded-lg transition-all"
                      style={{
                        background: isActive ? `${liveAccent}15` : 'var(--surface)',
                        border: `1.5px solid ${isActive ? liveAccent : 'var(--line)'}`,
                        boxShadow: isActive ? `0 0 0 1px ${liveAccent}, 0 0 20px ${liveAccent}33` : 'none',
                      }}
                    >
                      <div className="text-[11px] uppercase ink-muted font-mono">{a.axis}</div>
                      <div className="text-[13px] font-semibold tracking-tight mt-0.5">{a.name}</div>
                      <div className="text-[10px] ink-muted mt-0.5 truncate">{a.exemplarBrands.slice(0, 3).join(' · ')}</div>
                    </button>
                  )
                })}
              </div>
            </Card>
          )
        })()}

        {/* Composition Grid — 6 classical layout grammars. Selecting one
            sets the --composition CSS var on the deck root; advanced
            layouts can opt-in. */}
        {(() => {
          const activeCompId = (bwOverrides as any)?.compositionGrid || (bw as any)?.compositionGrid || 'asymmetric-weight'
          return (
            <Card className="p-5 mb-5">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <MiniLabel>Composition Grid</MiniLabel>
                  <div className="font-semibold tracking-tight mt-1">{getComposition(activeCompId)?.name || 'Asymmetric Weight'}</div>
                  <div className="text-[12px] ink-muted mt-1 max-w-[640px]">{getComposition(activeCompId)?.rationale}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMPOSITIONS.map(c => {
                  const isActive = c.id === activeCompId
                  return (
                    <button
                      key={c.id}
                      onClick={() => setBwOverrides(o => ({ ...o, compositionGrid: c.id } as any))}
                      className="text-left p-2.5 rounded-lg transition-all"
                      style={{
                        background: isActive ? `${liveAccent}15` : 'var(--surface)',
                        border: `1.5px solid ${isActive ? liveAccent : 'var(--line)'}`,
                      }}
                    >
                      <div className="text-[12px] font-semibold tracking-tight">{c.name}</div>
                      <div className="text-[10px] font-mono ink-muted mt-0.5">{c.gridTemplate}</div>
                    </button>
                  )
                })}
              </div>
            </Card>
          )
        })()}

        {/* Plain-theme toggle — reset the workspace to the default SignalDeck
            monochrome shell. Useful when the generated brand world is too noisy
            or the founder just wants to focus on content. */}
        <Card className="p-4 mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-[13px] font-semibold tracking-tight">Plain SignalDeck theme</div>
            <div className="text-[12px] ink-muted mt-0.5">
              {plainTheme ? 'Workspace is in the default black/white shell — your brand world is paused.' : 'Override the brand world with the default black/white shell.'}
            </div>
          </div>
          <button
            onClick={() => setPlainTheme(v => !v)}
            className="h-9 px-3.5 rounded-xl text-[13px] font-medium hairline focus-ring inline-flex items-center gap-2 flex-shrink-0"
            style={{
              background: plainTheme ? '#0F1115' : '#fff',
              color:      plainTheme ? '#fff'    : '#0F1115',
            }}
          >
            {plainTheme ? 'Restore brand theme' : 'Reset to plain theme'}
          </button>
        </Card>
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="p-6 space-y-5 lg:col-span-1">
            <div>
              <div className="font-semibold tracking-tight mb-1">Brand intelligence</div>
              {websiteUrl && <div className="text-[12px] ink-muted">Extracted from {websiteUrl.replace(/^https?:\/\//,'')}</div>}
            </div>
            <div>
              <MiniLabel>Extracted colours</MiniLabel>
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {tints.map((t, i) => (
                  <button key={i} onClick={() => { setLiveAccent(t); setManualHex(t) }}
                    className="w-8 h-8 rounded-lg hairline transition-all hover:scale-110"
                    style={{ background: t }} />
                ))}
              </div>
              <div className="text-[11px] ink-muted">Click any colour to apply it as the primary</div>
            </div>
            {logoUrl && (
              <div>
                <MiniLabel>Brand logo</MiniLabel>
                <img src={logoUrl} alt="Logo" className="mt-2 h-10 max-w-[140px] rounded hairline object-contain" />
              </div>
            )}
            {productType && (
              <div>
                <MiniLabel>Industry</MiniLabel>
                <div className="mt-2"><Pill tone="soft">{productType}</Pill></div>
              </div>
            )}
            <div>
              <MiniLabel>Manual override</MiniLabel>
              <div className="flex gap-2 mt-2">
                <input value={manualHex} onChange={e => setManualHex(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl text-[13px] hairline font-mono" placeholder="#3B7D4F" />
                <button onClick={() => setLiveAccent(manualHex)}
                  className="h-9 px-3 rounded-xl text-[13px] font-medium text-white" style={{ background: liveAccent }}>
                  Apply
                </button>
              </div>
            </div>
            <button onClick={() => { setLiveAccent(accentColor); setManualHex(accentColor) }}
              className="h-8 px-3 rounded-xl text-[12px] hairline ink-muted inline-flex items-center gap-1.5">
              <ic.refresh className="w-3 h-3"/> Reset to detected
            </button>
          </Card>

          <div className="lg:col-span-2 space-y-5">
            <Card className="p-6">
              <div className="font-semibold tracking-tight mb-1">How the UI adapts to brand</div>
              <div className="text-[12px] ink-muted mb-4">Same workspace, three brand worlds</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name:'Fintech',    accent:'#00b09b', bg:'#f0fafa' },
                  { name:'Consumer',   accent:'#e63946', bg:'#fff5f5' },
                  { name:'Climate',    accent:'#2d6a4f', bg:'#f0f7f0' },
                ].map(dt => (
                  <div key={dt.name} className="rounded-xl overflow-hidden hairline" style={{ background: dt.bg }}>
                    <div className="h-16 p-2 flex gap-1">
                      <div className="w-10 rounded-lg flex-shrink-0" style={{ background: dt.accent + '33' }}/>
                      <div className="flex-1 space-y-1">
                        <div className="h-2 rounded-full" style={{ background: dt.accent, opacity:.7 }}/>
                        <div className="h-1.5 rounded-full" style={{ background: dt.accent, opacity:.3, width:'70%' }}/>
                        <div className="h-1.5 rounded-full" style={{ background: dt.accent, opacity:.2, width:'50%' }}/>
                      </div>
                    </div>
                    <div className="px-2 pb-2 text-[10px] font-medium" style={{ color: dt.accent }}>{dt.name}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="font-semibold tracking-tight mb-4">Current theme preview</div>
              <div className="rounded-xl overflow-hidden hairline" style={{ background:'var(--surface)' }}>
                <div className="h-20 flex gap-2 p-3" style={{ background: liveAccent + '11' }}>
                  <div className="w-12 rounded-lg flex-shrink-0" style={{ background: liveAccent + '33' }}/>
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-2.5 rounded-full" style={{ background: liveAccent, opacity:.8 }}/>
                    <div className="h-2 rounded-full" style={{ background: liveAccent, opacity:.4, width:'65%' }}/>
                    <div className="h-2 rounded-full" style={{ background: liveAccent, opacity:.25, width:'45%' }}/>
                  </div>
                </div>
                <div className="p-3 text-[12px] ink-muted">
                  {company} · {productType} · {liveAccent}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  /* ── DECK BUILD ──────────────────────────────────────────────── */
  const ScreenDeck = () => {
    const cur = realSlides[activeSlide]
    const livePreviewHtml = refinedHtml || generatedHtml
    const openInTab = () => {
      if (!livePreviewHtml) return
      try {
        const blob = new Blob([livePreviewHtml], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } catch {}
    }
    return (
      <div className="p-4 lg:p-6 space-y-5">
        {/* Live deck preview — the actual rendered HTML, not just slide
            tile metadata. This is what the investor sees. */}
        {livePreviewHtml && livePreviewHtml.length > 1000 && (
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 pb-3">
              <div>
                <div className="font-semibold tracking-tight">Live deck preview</div>
                <div className="text-[12px] ink-muted mt-0.5">The actual rendered HTML — what investors will see.</div>
              </div>
              <button onClick={openInTab}
                className="h-9 px-4 rounded-xl text-[13px] font-medium text-white inline-flex items-center gap-2"
                style={{ background: liveAccent }}>
                Open full-screen ↗
              </button>
            </div>
            <div className="relative" style={{ height: 'min(720px, 70vh)', background: '#000' }}>
              <iframe
                srcDoc={livePreviewHtml}
                title="Deck preview"
                sandbox="allow-scripts allow-same-origin"
                style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
              />
            </div>
          </Card>
        )}

        {/* Design with Andreas — opt-in. Calls /api/design-deck which asks
            Sonnet to write the whole HTML deck cinematically. */}
        {brandWorld && liveContent && Object.keys(liveContent).length > 0 && (
          <Card className="p-4 flex items-start justify-between gap-4" style={{ background: `${liveAccent}10`, borderColor: `${liveAccent}33` }}>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold tracking-tight">Design with Andreas</div>
              <div className="text-[12px] ink-muted leading-relaxed mt-0.5">
                {designLoading
                  ? 'Andreas is hand-writing a brand-true cinematic HTML deck — bespoke per-slide layouts, scroll-snap, custom cursor, marquee bands…'
                  : designStatus
                    ? designStatus
                    : 'Let Andreas hand-write the entire HTML deck — brand-true colours, per-slide bespoke layouts, scroll-snap, custom cursor, marquee bands.'}
              </div>
            </div>
            <button onClick={runDesignDeck} disabled={designLoading}
              className="h-9 px-4 rounded-xl text-[13px] font-medium text-white shadow-card inline-flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
              style={{ background: liveAccent }}>
              {designLoading ? <><span className="sd-spinner">◐</span> Designing…</> : <>✦ Design with Andreas</>}
            </button>
          </Card>
        )}

        {/* Slide map */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold tracking-tight">Generated slide map</div>
              <div className="text-[12px] ink-muted mt-0.5">Click a slide to update the deck preview</div>
            </div>
            <button onClick={() => setActiveSlide((activeSlide+1) % realSlides.length)}
              className="h-8 px-3 rounded-xl text-[12px] hairline inline-flex items-center gap-1.5">
              <ic.refresh className="w-3 h-3"/> Regenerate flow
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {realSlides.map((s, i) => {
              const variants = LAYOUT_VARIANTS[s.key] || []
              const curLayout = layoutOverrides[s.key] || variants[0] || ''
              const curTx     = transitionOverrides[s.key] || ''
              return (
                <div key={s.key}
                  className="text-left p-3 rounded-xl hairline transition-all flex flex-col gap-2"
                  style={i===activeSlide ? { background: liveAccent+'12', borderColor: liveAccent } : { background:'var(--paper)' }}>
                  <button onClick={() => setActiveSlide(i)} className="text-left">
                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: liveAccent }}>{s.kind}</div>
                    <div className="font-semibold text-[13px] leading-tight mb-1 line-clamp-2">{s.title}</div>
                    <div className="text-[11px] ink-muted leading-snug line-clamp-2">{s.body}</div>
                  </button>
                  {variants.length > 0 && (
                    <div>
                      <MiniLabel>Layout</MiniLabel>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {variants.map(v => {
                          const isActive = curLayout === v
                          return (
                            <button key={v} onClick={() => setLayoutOverrides(o => ({ ...o, [s.key]: v }))}
                              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full transition-colors"
                              style={{
                                background: isActive ? liveAccent : 'var(--surface)',
                                color: isActive ? '#fff' : 'var(--ink-muted)',
                                letterSpacing: '0.02em',
                              }}>
                              {v}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <MiniLabel>Transition</MiniLabel>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {TRANSITIONS.map(tx => {
                        const isActive = curTx === tx
                        return (
                          <button key={tx} onClick={() => setTransitionOverrides(o => ({ ...o, [s.key]: tx }))}
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full transition-colors"
                            style={{
                              background: isActive ? liveAccent : 'var(--surface)',
                              color: isActive ? '#fff' : 'var(--ink-muted)',
                              letterSpacing: '0.02em',
                            }}>
                            {tx}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="text-[9px] font-mono ink-muted">{String(i+1).padStart(2,'0')}</div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* HTML deck build */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold tracking-tight">HTML deck build</div>
              <div className="text-[12px] ink-muted mt-0.5">Interactive coded deck with motion, pacing, and demo sections</div>
            </div>
            <MotionChip>scroll snap + analytics</MotionChip>
          </div>

          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-5">
            {/* Preview */}
            <div className="rounded-2xl overflow-hidden hairline aspect-video p-8 relative"
              style={{ background: `radial-gradient(circle at 70% 30%, ${liveAccent}22, transparent 30%), linear-gradient(180deg, var(--paper), var(--surface))` }}>
              <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage:'linear-gradient(rgba(15,17,21,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,17,21,.06) 1px, transparent 1px)', backgroundSize:'48px 48px' }}/>
              <div className="relative h-full flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: liveAccent }}>
                    Slide {String(activeSlide+1).padStart(2,'0')} · {cur?.kind?.toLowerCase()}
                  </div>
                  <h2 className="text-[36px] sm:text-[48px] font-semibold tracking-tight leading-[0.95] uppercase outline-none"
                      contentEditable suppressContentEditableWarning
                      onBlur={e => cur?.key && patchSlide(cur.key, 'headline', e.currentTarget.innerText.trim())}
                      title="Click to edit">
                    {cur?.title}
                  </h2>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <p className="ink-muted text-[13px] leading-relaxed max-w-md outline-none"
                     contentEditable suppressContentEditableWarning
                     onBlur={e => {
                       if (!cur?.key) return
                       const v = e.currentTarget.innerText.trim()
                       patchSlide(cur.key, cur?.val?.lede !== undefined ? 'lede' : 'sub', v)
                     }}
                     title="Click to edit">{cur?.body}</p>
                  <MotionChip>transition: {cur?.motion}</MotionChip>
                </div>
              </div>
            </div>

            {/* Right stack */}
            <div className="space-y-3">
              <Card className="p-4">
                <MiniLabel>Build status</MiniLabel>
                <div className="font-medium text-[13px] mt-2">{generatedContent ? 'HTML deck generated' : 'Ready to generate'}</div>
                <div className="text-[12px] ink-muted mt-1 leading-relaxed">
                  {generatedContent
                    ? 'Created index.html, styles.css, deck.js, analytics.js, investor links, and PDF fallback.'
                    : 'Use the intake to generate slides; this will build the live HTML deck.'}
                </div>
              </Card>
              <Card className="p-4">
                <MiniLabel>Included files</MiniLabel>
                <ul className="mt-2 space-y-1 text-[12px]">
                  {['index.html','styles.css','deck.js','analytics.js','assets/','PDF fallback'].map(f =>
                    <li key={f} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full" style={{ background: liveAccent }}/>{f}</li>
                  )}
                </ul>
              </Card>
              <Card className="p-4">
                <MiniLabel>Deck controls</MiniLabel>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(['motion','analytics','password'] as const).map(k => (
                    <button key={k} onClick={() => setDeckOpts(o => ({ ...o, [k]: !o[k] }))}
                      className="text-[12px] px-3 h-7 rounded-full hairline capitalize transition-all"
                      style={deckOpts[k] ? { background: liveAccent+'15', color: liveAccent, borderColor: liveAccent+'55' } : { color:'var(--ink-muted)' }}>
                      {k}
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </Card>

        {/* Inspector — inline-editable */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold tracking-tight">Inspector — slide {activeSlide+1}</div>
            <div className="text-[11px] ink-muted">Click ✨ on any field to get 3 SignalDeck-AI alternatives.</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldHead label="Headline" field="headline" slideKey={cur?.key} current={cur?.val?.headline ?? cur?.title ?? ''} slideContext={cur?.val} onApply={text => patchSlide(cur.key, 'headline', text)} />
              <input value={cur?.val?.headline ?? cur?.title ?? ''}
                onChange={e => patchSlide(cur.key, 'headline', e.target.value)}
                className="w-full h-9 px-3 mt-2 rounded-xl text-[13px] hairline" />
            </div>
            <div>
              <FieldHead label="Tag" field="tag" slideKey={cur?.key} current={cur?.val?.tag ?? ''} slideContext={cur?.val} onApply={text => patchSlide(cur.key, 'tag', text)} />
              <input value={cur?.val?.tag ?? ''}
                onChange={e => patchSlide(cur.key, 'tag', e.target.value)}
                className="w-full h-9 px-3 mt-2 rounded-xl text-[13px] hairline" />
            </div>
            <div className="sm:col-span-2">
              <FieldHead label="Lede / sub" field={cur?.val?.lede !== undefined ? 'lede' : 'sub'} slideKey={cur?.key} current={cur?.val?.lede ?? cur?.val?.sub ?? cur?.body ?? ''} slideContext={cur?.val} onApply={text => patchSlide(cur.key, cur?.val?.lede !== undefined ? 'lede' : 'sub', text)} />
              <textarea
                value={cur?.val?.lede ?? cur?.val?.sub ?? cur?.body ?? ''}
                onChange={e => patchSlide(cur.key, cur?.val?.lede !== undefined ? 'lede' : 'sub', e.target.value)}
                rows={3} className="w-full px-3 py-2 mt-2 rounded-xl text-[13px] hairline resize-none" />
            </div>
            {Array.isArray(cur?.val?.bullets) && cur.val.bullets.length > 0 && (
              <div className="sm:col-span-2">
                <MiniLabel>Bullets</MiniLabel>
                <div className="space-y-1.5 mt-2">
                  {cur.val.bullets.map((b: string, i: number) => (
                    <div key={i} className="flex gap-1.5 items-center">
                      <input value={b}
                        onChange={e => {
                          const next = [...cur.val.bullets]; next[i] = e.target.value
                          patchSlide(cur.key, 'bullets', next as any)
                        }}
                        className="flex-1 h-9 px-3 rounded-xl text-[13px] hairline" />
                      <StrengthenInline field="bullet" slideKey={cur?.key} current={b} slideContext={cur?.val}
                        onApply={text => {
                          const next = [...cur.val.bullets]; next[i] = text
                          patchSlide(cur.key, 'bullets', next as any)
                        }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Per-slide AI chat */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold tracking-tight">Ask Andreas to rework this slide</div>
            <Pill tone="soft">{cur?.kind || cur?.key}</Pill>
          </div>
          <div className="text-[12px] ink-muted mb-3 leading-relaxed">
            Tell Andreas what to change in plain English. The headline, the bullets, the tone — anything. Edits apply to slide {activeSlide+1} only.
          </div>

          {/* Chat log for this slide */}
          {(chatLog[cur?.key] || []).length > 0 && (
            <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
              {(chatLog[cur.key] || []).map((entry, i) => (
                <div key={i} className="text-[12px] grid grid-cols-[60px_1fr] gap-2 p-2 rounded-lg" style={{ background:'var(--surface)' }}>
                  <span className="ink-muted">You</span>
                  <span>"{entry.instruction}"</span>
                  <span className="ink-muted" style={{ color: liveAccent }}>Andreas</span>
                  <span className="ink-muted">{entry.changeNote}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !chatBusy && cur?.key) { e.preventDefault(); editSlide(cur.key, chatInput) } }}
              placeholder='e.g. "make the headline punchier" / "add a bullet about retention"'
              disabled={chatBusy}
              className="flex-1 h-10 px-3 rounded-xl text-[13px] hairline" />
            <button
              onClick={() => cur?.key && editSlide(cur.key, chatInput)}
              disabled={chatBusy || !chatInput.trim() || !cur?.key}
              className="h-10 px-4 rounded-xl text-[13px] font-medium text-white disabled:opacity-40 inline-flex items-center gap-1.5"
              style={{ background: liveAccent }}>
              {chatBusy ? <><span className="sd-spinner">◐</span> Editing…</> : 'Send'}
            </button>
          </div>

          {/* Quick suggestion chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Make headline punchier','Tighten the lede','Add one more bullet','Rewrite for Series A audience','Less buzzwordy'].map(s => (
              <button key={s} onClick={() => setChatInput(s)}
                className="text-[11px] px-2.5 h-7 rounded-full hairline ink-muted hover:ink-muted">
                {s}
              </button>
            ))}
          </div>
          {error && <div className="sd-error mt-3">{error}</div>}
        </Card>
      </div>
    )
  }

  /* ── STYLE LIBRARY ───────────────────────────────────────────── */
  const ScreenStyle = () => {
    const content: Record<string, { name: string; usage: string; generic?: boolean }[]> = {
      transitions: [
        { name:'Calm fade',         usage:'Used by 34% in your industry' },
        { name:'Type-on headline',  usage:'Used by 22% in your industry' },
        { name:'Zoom passage',      usage:'Used by 18% in your industry' },
        { name:'Explode',           usage:'Used by 12% in your industry', generic: true },
        { name:'Fold reveal',       usage:'Used by 9% in your industry' },
        { name:'Warp cut',          usage:'Used by 4% in your industry' },
      ],
      layouts: [
        { name:'Centered hero',          usage:'Used by 41% in your industry', generic: true },
        { name:'Split: claim + proof',   usage:'Used by 29% in your industry' },
        { name:'Three-column metric',    usage:'Used by 17% in your industry' },
        { name:'Quote on canvas',        usage:'Used by 11% in your industry' },
        { name:'Full-bleed image',       usage:'Used by 8% in your industry' },
        { name:'Grid mosaic',            usage:'Used by 5% in your industry' },
      ],
      palettes: [
        { name:'Brand primary',  usage:'Used by 28% in your industry' },
        { name:'Corporate blue', usage:'Used by 22% in your industry', generic: true },
        { name:'Founder ink',    usage:'Used by 19% in your industry' },
        { name:'Warm clay',      usage:'Used by 14% in your industry' },
      ],
      moods: [
        { name:'Calm conviction',  usage:'Used by 31% in your industry' },
        { name:'Bold and loud',    usage:'Used by 24% in your industry', generic: true },
        { name:'Glassy startup',   usage:'Used by 18% in your industry' },
        { name:'Editorial dark',   usage:'Used by 12% in your industry' },
        { name:'Warm founder',     usage:'Used by 9% in your industry' },
      ],
    }
    const items = antiGeneric ? content[styleTab].filter(x => !x.generic) : content[styleTab]
    return (
      <div className="p-6 lg:p-8 space-y-5">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1">
              {(['transitions','layouts','palettes','moods'] as const).map(t => (
                <button key={t} onClick={() => setStyleTab(t)}
                  className="h-8 px-3.5 rounded-xl text-[13px] capitalize transition-all"
                  style={styleTab===t ? { background: liveAccent, color:'#fff' } : { color:'var(--ink-muted)' }}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="ink-muted">Anti-generic filter</span>
              <button onClick={() => setAntiGeneric(!antiGeneric)}
                className="relative w-10 h-6 rounded-full transition-colors"
                style={{ background: antiGeneric ? liveAccent : 'var(--surface)', border:'1px solid var(--line)' }}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full shadow transition-all"
                  style={{ left: antiGeneric ? 'calc(100% - 22px)' : '2px', background: antiGeneric ? '#fff' : 'var(--ink-muted)' }} />
              </button>
            </div>
          </div>
        </Card>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <Card key={i} className="p-0 overflow-hidden cursor-pointer hover:shadow-lg transition-all">
              <div className="h-16 relative overflow-hidden" style={{ background:`linear-gradient(135deg,${liveAccent}33,${liveAccent}11)` }}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage:'linear-gradient(to right,rgba(15,17,21,.08) 1px,transparent 1px),linear-gradient(to bottom,rgba(15,17,21,.08) 1px,transparent 1px)', backgroundSize:'12px 12px' }}/>
                {styleTab==='palettes' && (
                  <div className="absolute bottom-2 left-3 flex gap-1.5">
                    {[liveAccent, liveAccent+'99', liveAccent+'44'].map((c,j)=>(
                      <div key={j} className="w-5 h-5 rounded-md" style={{ background: c }}/>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[13px] font-medium">{item.name}</div>
                  {item.generic && <Pill tone="warn">Generic</Pill>}
                </div>
                <div className="text-[11px] ink-muted mt-0.5">{item.usage}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  /* ── FRAMEWORKS ──────────────────────────────────────────────── */
  const TIER_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    clean: { bg:'#e8f4ee', color:'#137a4a', label:'Clean' },
    edgy:  { bg:'#fbf1dd', color:'#a86a00', label:'Edgy'  },
    dark:  { bg:'#fbe8e5', color:'#b0322b', label:'Dark'  },
  }

  const FrameworkCard = ({ f, compact = false }: { f: Framework; compact?: boolean }) => {
    const t = TIER_STYLE[f.tier]
    const isActive = activeFramework === f.id
    return (
      <Card className={`${compact ? 'p-4' : 'p-5'} flex flex-col relative`}
        style={isActive ? {
          boxShadow: `inset 0 0 0 2px ${liveAccent}, 0 0 28px ${liveAccent}55`,
          borderColor: liveAccent,
          background: `linear-gradient(180deg, ${liveAccent}10, transparent 60%)`,
        } : {}}>
        {isActive && (
          <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white shadow-card"
            style={{ background: liveAccent, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            ✓ Selected
          </span>
        )}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-semibold tracking-tight text-[15px]">{f.name}</div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: t.bg, color: t.color }}>{t.label}</span>
            {f.risk === 'high' && (
              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background:'#fbe8e5', color:'#b0322b' }} title="High reputational risk">⚠</span>
            )}
          </div>
        </div>
        <div className="text-[13px] ink-muted mb-3">{f.summary}</div>
        <ol className={`space-y-1.5 ${compact ? 'mb-2' : 'mb-3'}`}>
          {f.steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px]">
              <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] flex-shrink-0 font-semibold"
                style={{ background: liveAccent }}>{i+1}</span>
              {s}
            </li>
          ))}
        </ol>
        {!compact && (
          <div className="text-[12px] ink-muted mb-4 mt-auto">
            <span className="font-medium">When to use:</span> {f.when}
          </div>
        )}
        <div className="flex gap-2 mt-auto">
          <button onClick={() => setActiveFramework(isActive ? null : f.id)}
            className="flex-1 h-8 rounded-xl text-[12px] font-medium text-white transition-all"
            style={{ background: isActive ? '#137a4a' : liveAccent }}>
            {isActive ? '✓ Applied' : 'Apply to deck'}
          </button>
          {!compact && <button className="h-8 px-3 rounded-xl text-[12px] hairline ink-muted">Preview</button>}
        </div>
      </Card>
    )
  }

  const ScreenFrameworks = () => {
    const ctx = { industry: productType, stage: stageType, audience: investor, lensType }
    const visible: Framework[] = showDarkTactics ? [...FRAMEWORKS, ...DARK_FRAMEWORKS] : FRAMEWORKS
    const ranked = rankFrameworks(visible, ctx, activeFramework)
    const all: Framework[] = [...FRAMEWORKS, ...DARK_FRAMEWORKS]
    const companions = activeFramework ? recommendCompanions(activeFramework, ctx, all) : { combos: [], swaps: [] }
    const activeFw = activeFramework ? all.find(f => f.id === activeFramework) : null

    const handleRegen = async () => {
      if (!activeFramework || !onRegenerate) return
      setRegenLoading(true); setRegenStatus('')
      try {
        await onRegenerate(activeFramework)
        setRegenStatus(`Deck regenerated with ${activeFw?.name || activeFramework}`)
        setActive('deck')
      } catch (e: any) {
        setRegenStatus(e?.message || 'Regenerate failed')
      } finally {
        setRegenLoading(false)
        setTimeout(() => setRegenStatus(''), 4000)
      }
    }

    return (
      <div className="p-6 lg:p-8 space-y-6">
        {/* Sticky regen bar — only when something is applied */}
        {activeFw && onRegenerate && (
          <Card className="p-4 flex items-center gap-3 flex-wrap" style={{ background:`${liveAccent}08`, borderColor:`${liveAccent}33` }}>
            <div className="flex-1 min-w-0">
              <MiniLabel>Applied framework</MiniLabel>
              <div className="font-medium text-[14px] mt-1 truncate">{activeFw.name}</div>
              <div className="text-[12px] ink-muted mt-0.5">{activeFw.summary}</div>
            </div>
            <button onClick={handleRegen} disabled={regenLoading}
              className="h-9 px-4 rounded-xl text-[13px] font-medium text-white disabled:opacity-40 inline-flex items-center gap-2"
              style={{ background: liveAccent }}>
              {regenLoading ? <><span className="sd-spinner">◐</span> Regenerating…</> : <><ic.refresh className="w-3.5 h-3.5"/> Regenerate deck</>}
            </button>
            {regenStatus && (
              <div className="w-full text-[12px] ink-muted">{regenStatus}</div>
            )}
          </Card>
        )}

        {/* Header with dark-tactics toggle */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-[13px] ink-muted">
            <span className="font-medium" style={{ color: 'var(--ink)' }}>{ranked.length}</span> tactics ranked for{' '}
            <span className="font-medium" style={{ color: liveAccent }}>{productType}</span> ·{' '}
            <span className="font-medium" style={{ color: liveAccent }}>{stageType}</span> ·{' '}
            <span className="font-medium" style={{ color: liveAccent }}>{investor}</span>
          </div>
          <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none">
            <input type="checkbox" checked={showDarkTactics} onChange={e => setShowDarkTactics(e.target.checked)} />
            <span className="ink-muted">Show edgy / dark tactics</span>
            {showDarkTactics && (
              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background:'#fbe8e5', color:'#b0322b' }}>Use carefully</span>
            )}
          </label>
        </div>

        {/* Main grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ranked.map(f => <FrameworkCard key={f.id} f={f} />)}
        </div>

        {/* Companion tactics — only when something is applied */}
        {activeFramework && (companions.combos.length > 0 || companions.swaps.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-semibold tracking-tight">Companion tactics</div>
              <div className="text-[12px] ink-muted">tweak your applied framework</div>
            </div>
            <div className="grid lg:grid-cols-2 gap-5">
              {companions.combos.length > 0 && (
                <div>
                  <MiniLabel>Combine with</MiniLabel>
                  <div className="grid gap-3 mt-2">
                    {companions.combos.map(f => <FrameworkCard key={f.id} f={f} compact />)}
                  </div>
                </div>
              )}
              {companions.swaps.length > 0 && (
                <div>
                  <MiniLabel>Or try instead</MiniLabel>
                  <div className="grid gap-3 mt-2">
                    {companions.swaps.map(f => <FrameworkCard key={f.id} f={f} compact />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── VC LENS ─────────────────────────────────────────────────── */
  const ScreenVCLens = () => {
    const profile = VC_PROFILES[investor] || VC_PROFILES['Seed VC']
    return (
      <div className="p-6 lg:p-8 space-y-5">
        {/* Hero with selects */}
        <Card className="p-6 sm:p-8 relative overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <div>
              <MiniLabel>VC lens</MiniLabel>
              <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight mt-2">
                Different investors need <span style={{ color: liveAccent }}>different stories</span>
              </h1>
              <p className="ink-muted mt-2 text-[14px] leading-relaxed max-w-lg">
                The product adjusts template, audit, slide order, and critique based on product type, stage, and investor audience.
              </p>
              <div className="flex gap-2 mt-5 flex-wrap">
                <RunBtn onClick={runVCLens} loading={vcLoading} label="Apply lens to deck" done={!!vcData} />
                <button onClick={() => setActive('audit')} className="h-9 px-4 rounded-xl text-[13px] font-medium hairline">View audit</button>
              </div>
            </div>
            <Card className="p-5 space-y-3" style={{ background:`${liveAccent}08`, borderColor:`${liveAccent}33` }}>
              <div>
                <MiniLabel>Product type</MiniLabel>
                <select value={productType} onChange={e => setProductType(e.target.value)}
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-[13px] hairline">
                  {Object.keys({ Fintech:1, SaaS:1, AI:1, Enterprise:1, Consumer:1, 'Developer Tools':1, Climate:1, Health:1, Education:1, Other:1 }).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <MiniLabel>Stage</MiniLabel>
                <select value={stageType} onChange={e => setStageType(e.target.value)}
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-[13px] hairline">
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <MiniLabel>Investor lens</MiniLabel>
                <select value={lensType} onChange={e => setLensType(e.target.value)}
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-[13px] hairline">
                  {['Workflow pain + wedge','Founder insight + market size','Product depth + defensibility','Growth loop + retention','Enterprise ROI + adoption risk'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <MiniLabel>Target investor</MiniLabel>
                <select value={investor} onChange={e => setInvestor(e.target.value)}
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-[13px] hairline">
                  {AUDIENCES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </Card>
          </div>
        </Card>

        {/* Template logic + VC profile */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold tracking-tight">Template logic</div>
                <div className="text-[12px] ink-muted mt-0.5">Updates when you change product type</div>
              </div>
              <Pill tone="accent">{tpl.status}</Pill>
            </div>
            <div className="space-y-3">
              {tpl.tips.map((t, i) => <TipCard key={i} tip={t} />)}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold tracking-tight">VC profile</div>
                <div className="text-[12px] ink-muted mt-0.5">Public signals and likely questions</div>
              </div>
            </div>
            <Card className="p-4" style={{ background:'var(--surface)' }}>
              <MiniLabel>{profile.name}</MiniLabel>
              <div className="font-medium text-[14px] mt-1">{profile.fund}</div>
              <div className="text-[12px] ink-muted mt-1 leading-relaxed">Public thesis, portfolio, posts shaping the lens.</div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.focus.map(f => <Pill key={f} tone="info">{f}</Pill>)}
              </div>
            </Card>
            <div className="mt-4">
              <MiniLabel>Likely questions</MiniLabel>
              <ol className="mt-2 space-y-1.5">
                {profile.questionsLikely.map((q, i) => (
                  <li key={i} className="flex gap-2 text-[13px]">
                    <span className="font-semibold flex-shrink-0" style={{ color: liveAccent }}>{i+1}.</span>{q}
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </div>

        {/* Quality gates checklist */}
        <Card className="p-5">
          <div className="font-semibold tracking-tight mb-1">What this lens tests</div>
          <div className="text-[12px] ink-muted mb-4">Deck quality gates based on audience</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tpl.checklist.map(c => px(c)).map((item, i) => (
              <Card key={i} className="p-4" style={{ background:'var(--surface)' }}>
                <MiniLabel>Quality gate</MiniLabel>
                <div className="font-medium text-[13px] mt-1.5">{item}</div>
                <div className="text-[12px] ink-muted mt-1.5 leading-relaxed">
                  This lens checks whether the deck proves this clearly enough for {investor.toLowerCase()}.
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* AI-augmented output if vcData loaded */}
        {vcData && (
          <Card className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <MiniLabel>{investor} verdict</MiniLabel>
                <div className="font-semibold text-[15px] mt-1 leading-snug">{vcData.verdict}</div>
              </div>
              <div className="text-center flex-shrink-0">
                <div className="text-[32px] font-semibold tracking-tight" style={{ color: liveAccent }}>{vcData.score}</div>
                <div className="text-[11px] ink-muted">/ 100</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <MiniLabel>Strengths</MiniLabel>
                <ul className="mt-2 space-y-1.5">{vcData.strengths?.map((s: string, i: number) => <li key={i} className="text-[12px] flex gap-2"><span style={{ color:'#137a4a' }}>✓</span>{s}</li>)}</ul>
              </div>
              <div>
                <MiniLabel>Concerns</MiniLabel>
                <ul className="mt-2 space-y-1.5">{vcData.concerns?.map((c: string, i: number) => <li key={i} className="text-[12px] flex gap-2"><span style={{ color:'#b0322b' }}>·</span>{c}</li>)}</ul>
              </div>
              <div>
                <MiniLabel>Tips</MiniLabel>
                <ul className="mt-2 space-y-1.5">{vcData.tips?.map((t: string, i: number) => <li key={i} className="text-[12px] flex gap-2"><span style={{ color: liveAccent }}>→</span>{t}</li>)}</ul>
              </div>
            </div>
          </Card>
        )}
        {error && <div className="sd-error">{error}</div>}
      </div>
    )
  }

  /* ── AUDIT ───────────────────────────────────────────────────── */
  const ScreenAudit = () => {
    const base = tpl.scoreBaseline
    const seedAdjust = (i: number) => Math.max(4.8, Math.min(9.3, base[i] + (Math.sin(rewriteSeed * (i+1)) * 0.6))).toFixed(1)
    const scores = [seedAdjust(0), seedAdjust(1), seedAdjust(2), seedAdjust(3)]
    const objs = tpl.objections.slice(objectionSeed % 1, (objectionSeed % 1) + 3)
    return (
      <div className="p-6 lg:p-8 space-y-5">
        {/* Score grid + tips */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold tracking-tight">Investor readiness audit</div>
              <Pill tone="accent">{productType} lens active</Pill>
            </div>
            <div className="text-[12px] ink-muted mb-4">Scored from founder notes and selected VC lens</div>
            <div className="grid grid-cols-4 gap-2">
              {[['Story clarity', scores[0]], ['Proof strength', scores[1]], ['Investor fit', scores[2]], ['Market logic', scores[3]]].map(([l, v]: any) => (
                <Card key={l} className="p-3" style={{ background:'var(--surface)' }}>
                  <div className="text-[28px] font-semibold tracking-tight leading-none" style={{ color: liveAccent }}>{v}</div>
                  <div className="text-[11px] ink-muted mt-2 leading-tight">{l}</div>
                </Card>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <RunBtn onClick={() => { setRewriteSeed(s => s+1); runAudit() }} loading={auditLoading} label="Re-run audit" done={!!auditData} secondary />
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold tracking-tight mb-1">VC tips</div>
            <div className="text-[12px] ink-muted mb-4">Blunt notes before the deck is built</div>
            <div className="space-y-3">
              {tpl.tips.map((t, i) => <TipCard key={i} tip={t} />)}
            </div>
          </Card>
        </div>

        {/* Story rewrite */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold tracking-tight">Story rewrite</div>
              <div className="text-[12px] ink-muted mt-0.5">Turns raw notes into stronger slide copy</div>
            </div>
            <button onClick={() => setRewriteSeed(s => s+1)} className="h-8 px-3 rounded-xl text-[12px] hairline inline-flex items-center gap-1.5">
              <ic.refresh className="w-3 h-3"/> Rewrite again
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4" style={{ background:'var(--surface)' }}>
              <MiniLabel>Before</MiniLabel>
              <p className="text-[13px] ink-muted mt-2 leading-relaxed">{realStory?.slice(0,170) || px(tpl.rewriteBefore)}{realStory && realStory.length > 170 ? '…' : ''}</p>
            </Card>
            <Card className="p-4" style={{ background:`${liveAccent}08`, borderColor:`${liveAccent}33` }}>
              <MiniLabel>After</MiniLabel>
              <h4 className="font-semibold text-[15px] mt-2 leading-snug">{px(tpl.rewriteAfter.headline)}</h4>
              <p className="text-[13px] ink-muted mt-2 leading-relaxed">{px(tpl.rewriteAfter.body)}</p>
            </Card>
          </div>
        </Card>

        {/* Objection simulator */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold tracking-tight">Objection simulator</div>
              <div className="text-[12px] ink-muted mt-0.5">Likely investor pushback and suggested answer angle</div>
            </div>
            <button onClick={() => setObjectionSeed(s => s+1)} className="h-8 px-3 rounded-xl text-[12px] hairline inline-flex items-center gap-1.5">
              <ic.refresh className="w-3 h-3"/> New objection
            </button>
          </div>
          <div className="space-y-3">
            {tpl.objections.map((o, i) => (
              <div key={i} className="p-4 rounded-xl hairline flex items-start gap-3" style={{ background:'var(--paper)' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0" style={SEVERITY_STYLE[o.severity]}>?</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[14px]">{px(o.question)}</div>
                  <div className="text-[13px] ink-muted mt-1 leading-relaxed">{px(o.angle)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        {error && <div className="sd-error">{error}</div>}
      </div>
    )
  }

  /* ── CLAIMS ──────────────────────────────────────────────────── */
  const [openClaim, setOpenClaim] = useState<any>(null)
  const ScreenClaims = () => {
    const apiClaims = claimsData?.claims || []
    const allClaims = apiClaims.length > 0 ? apiClaims : tpl.exampleClaims.map((c, i) => ({ ...c, slide: realSlides[i % realSlides.length]?.key, confidence: c.classification==='supported' ? 0.9 : c.classification==='needs-source' ? 0.55 : 0.4 }))
    const filterMap: Record<string, string> = { 'Supported':'supported', 'Needs source':'needs-source', 'Risky':'risky', 'Founder thesis':'founder-thesis' }
    const visible = claimsFilter === 'All' ? allClaims : allClaims.filter((c:any) => c.classification === filterMap[claimsFilter])
    const verified = allClaims.filter((c:any) => c.classification === 'supported').length
    const risky    = allClaims.filter((c:any) => c.classification === 'risky' || c.classification === 'needs-source').length
    return (
      <div className="p-6 lg:p-8 space-y-5">
        {/* Hero */}
        <Card className="p-6 relative overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <div>
              <MiniLabel>Claim checker</MiniLabel>
              <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight mt-2">
                Find weak claims before investors <span style={{ color: liveAccent }}>do</span>
              </h1>
              <p className="ink-muted mt-2 text-[14px] leading-relaxed max-w-lg">
                Every market number, traction point, and competitive statement gets a confidence level. Unsupported claims get safer rewrites.
              </p>
              <div className="flex gap-2 mt-5 flex-wrap">
                <RunBtn onClick={runClaims} loading={claimsLoading} label="Check claims" done={!!claimsData} />
                <button className="h-9 px-4 rounded-xl text-[13px] font-medium hairline inline-flex items-center gap-1.5">
                  <ic.plus className="w-3.5 h-3.5"/> Add claim
                </button>
              </div>
            </div>
            <Card className="p-5" style={{ background:'var(--surface)' }}>
              <MiniLabel>Claim status</MiniLabel>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 rounded-xl hairline" style={{ background:'var(--paper)' }}>
                  <div className="text-[32px] font-semibold tracking-tight" style={{ color: '#137a4a' }}>{verified}</div>
                  <div className="text-[11px] ink-muted mt-0.5">Verified</div>
                </div>
                <div className="p-3 rounded-xl hairline" style={{ background:'var(--paper)' }}>
                  <div className="text-[32px] font-semibold tracking-tight" style={{ color: '#b0322b' }}>{risky}</div>
                  <div className="text-[11px] ink-muted mt-0.5">Need source</div>
                </div>
              </div>
            </Card>
          </div>
        </Card>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {['All','Supported','Needs source','Risky','Founder thesis'].map(f => (
            <button key={f} onClick={() => setClaimsFilter(f)}
              className="h-8 px-3.5 rounded-full text-[13px] font-medium hairline transition-all"
              style={claimsFilter===f ? { background: liveAccent, color:'#fff', border:'none' } : {}}>
              {f}
            </button>
          ))}
          <div className="ml-auto"><Pill tone="warn">{risky} risky</Pill></div>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((c: any, i: number) => {
            const cs = CLAIM_STYLES[c.classification] || CLAIM_STYLES['needs-source']
            return (
              <Card key={i} className="p-5 cursor-pointer transition-all hover:-translate-y-0.5" onClick={() => setOpenClaim(c)}>
                <MiniLabel>{c.status || cs.label}</MiniLabel>
                <h4 className="font-semibold text-[14px] mt-2 leading-snug">{c.text || c.claim}</h4>
                <div className="text-[12px] ink-muted mt-2">Risk: {c.risk || 'Medium'}</div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: cs.bg, color: cs.color }}>{cs.label}</span>
                  <Pill tone="soft">conf {Math.round((c.confidence || 0.6)*100)}%</Pill>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Claim modal */}
        {openClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpenClaim(null)}>
            <Card className="w-full max-w-xl p-6" onClick={(e: any) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <MiniLabel>Claim review</MiniLabel>
                  <div className="text-[12px] ink-muted mt-0.5">{openClaim.status || CLAIM_STYLES[openClaim.classification]?.label}</div>
                </div>
                <button onClick={() => setOpenClaim(null)} className="w-8 h-8 rounded-lg hairline">×</button>
              </div>
              <div className="space-y-3">
                <TipCard tip={{
                  icon: openClaim.classification==='supported'?'✓':openClaim.classification==='risky'?'!':'~',
                  severity: openClaim.classification==='supported'?'good':openClaim.classification==='risky'?'risk':'warn',
                  title: openClaim.text || openClaim.claim,
                  body: `Risk level: ${openClaim.risk || 'Medium'}`,
                }} />
                <Card className="p-4" style={{ background:'var(--surface)' }}>
                  <MiniLabel>Suggested rewrite</MiniLabel>
                  <p className="text-[13px] mt-2 leading-relaxed">{openClaim.rewrite || 'Rewrite this with lower certainty until a source is added.'}</p>
                </Card>
                <div className="flex gap-2">
                  <button className="h-9 px-4 rounded-xl text-[13px] font-medium text-white" style={{ background: liveAccent }}>Attach source</button>
                  <button className="h-9 px-4 rounded-xl text-[13px] font-medium hairline">Apply rewrite</button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    )
  }

  /* ── SIGNALS ─────────────────────────────────────────────────── */
  const ScreenSignals = () => {
    // Live viewership mode — we have a deckId AND the polling has returned
    // a summary. Show real numbers, not the simulator.
    const isLive = !!deckId && !!signalsData
    const live = signalsData

    // Simulator (legacy) — runs when no deckId yet OR data hasn't loaded.
    const seed = signalSeed
    const engagement = tpl.engagementLabels.map((_, i) => {
      const base = [92, 78, 96, 43, 61, 55, 88, 71][i] ?? 60
      return Math.max(20, Math.min(99, base + Math.sin(seed * (i+1)) * 8))
    })
    const viewerFallback = ['first-viewer','second-viewer','third-viewer']
    const viewers = (investorLinks.length ? investorLinks : viewerFallback).slice(0, 3).map((name, i) => ({
      id: `${name}-•-${(seed * 7 + i * 13).toString(16).slice(-2)}`,
      last: ['2h ago','yesterday','3d ago'][i],
      returns: [3, 2, 1][i],
      hot: i === 0,
    }))

    // ── LIVE mode ─────────────────────────────────────────────────────
    if (isLive) {
      const fmtRel = (ts: number) => {
        const s = Math.max(1, Math.floor((Date.now() - ts) / 1000))
        if (s < 60) return `${s}s ago`
        if (s < 3600) return `${Math.floor(s/60)}m ago`
        if (s < 86400) return `${Math.floor(s/3600)}h ago`
        return `${Math.floor(s/86400)}d ago`
      }
      const maxDur = Math.max(1, ...live.slides.map((s: any) => s.totalDurMs || 0))
      const persistent = live.persistent === true
      return (
        <div className="p-6 lg:p-8 space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="font-semibold tracking-tight">Investor signals — live</div>
                <div className="text-[12px] ink-muted mt-0.5 font-mono">deck {deckId}</div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full" style={{ background:'#dcfce7', color:'#137a4a' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'#137a4a' }}/>
                {signalsLoading ? 'syncing…' : 'live · polls every 10s'}
              </span>
            </div>
            {!persistent && (
              <Card className="p-3 mb-4" style={{ background:'#fff4e0', borderColor:'#fbbf24' }}>
                <div className="text-[12px]">
                  <b style={{ color:'#92400e' }}>In-memory only.</b> Vercel KV isn't configured, so signals reset on cold starts and may split across lambda instances.
                  Add <code className="px-1 py-0.5 rounded text-[11px]" style={{ background:'rgba(0,0,0,0.06)' }}>KV_REST_API_URL</code> + <code className="px-1 py-0.5 rounded text-[11px]" style={{ background:'rgba(0,0,0,0.06)' }}>KV_REST_API_TOKEN</code> in Vercel → Settings → Storage to make these persistent. Two clicks, free tier covers most use.
                </div>
              </Card>
            )}
            <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Card className="p-4" style={{ background:'var(--surface)' }}>
                <div className="text-[32px] font-semibold tracking-tight leading-none" style={{ color: liveAccent }}>{live.totalSessions ?? 0}</div>
                <div className="font-medium text-[13px] mt-3">Unique sessions</div>
                <div className="text-[12px] ink-muted mt-1 leading-relaxed">Each viewer/tab counted once.</div>
              </Card>
              <Card className="p-4" style={{ background:'var(--surface)' }}>
                <div className="text-[32px] font-semibold tracking-tight leading-none" style={{ color: liveAccent }}>{live.totalOpens ?? 0}</div>
                <div className="font-medium text-[13px] mt-3">Total opens</div>
                <div className="text-[12px] ink-muted mt-1 leading-relaxed">Includes return visits.</div>
              </Card>
              <Card className="p-4" style={{ background:'var(--surface)' }}>
                <div className="text-[32px] font-semibold tracking-tight leading-none" style={{ color: liveAccent }}>{live.reachedEnd ?? 0}</div>
                <div className="font-medium text-[13px] mt-3">Reached the ask</div>
                <div className="text-[12px] ink-muted mt-1 leading-relaxed">Scrolled to the last slide.</div>
              </Card>
              <Card className="p-4" style={{ background:'var(--surface)' }}>
                <div className="text-[32px] font-semibold tracking-tight leading-none" style={{ color: liveAccent }}>{live.lastSeenTs ? fmtRel(live.lastSeenTs) : '—'}</div>
                <div className="font-medium text-[13px] mt-3">Last viewer</div>
                <div className="text-[12px] ink-muted mt-1 leading-relaxed">Most recent in-view event.</div>
              </Card>
            </div>
            {live.dropOffSlide && (
              <Card className="p-3 mt-4" style={{ background: `${liveAccent}10`, borderColor: `${liveAccent}33` }}>
                <div className="text-[12px]"><b style={{ color: liveAccent }}>Drop-off insight:</b> {live.dropOffSlide.sessions} session{live.dropOffSlide.sessions > 1 ? 's' : ''} stopped at <b>{live.dropOffSlide.label}</b> without reaching the end. Rework this slide first.</div>
              </Card>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="font-semibold tracking-tight mb-1">Slide dwell time</div>
              <div className="text-[12px] ink-muted mb-4">Where the viewer spent attention</div>
              <div className="space-y-2.5">
                {live.slides.length === 0 && (
                  <div className="text-[12px] ink-muted">No slide views yet. Share the deployed deck URL with an investor.</div>
                )}
                {live.slides.map((s: any) => {
                  const dwellSec = Math.round(s.totalDurMs / 1000)
                  const pct = Math.min(99, Math.round((s.totalDurMs / maxDur) * 100))
                  return (
                    <div key={s.idx} className="grid grid-cols-[1fr_36px_64px] items-center gap-2 text-[12px] ink-muted">
                      <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                        <span className="font-medium ink truncate">{s.label || `slide ${s.idx + 1}`}</span>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background:'var(--surface)' }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${liveAccent},${liveAccent}99)` }}/>
                        </div>
                      </div>
                      <b className="text-right">{s.views}×</b>
                      <span className="text-right font-mono">{dwellSec}s</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="p-5">
              <div className="font-semibold tracking-tight mb-1">Sessions</div>
              <div className="text-[12px] ink-muted mb-4">Per-viewer detail</div>
              <div className="space-y-2.5">
                {live.sessions.length === 0 && (
                  <div className="text-[12px] ink-muted">No sessions yet. The deck reports back the moment someone opens it.</div>
                )}
                {live.sessions.slice(0, 8).map((sess: any) => (
                  <div key={sess.sessionId} className="grid grid-cols-[42px_1fr_auto] gap-3 items-center p-3 rounded-xl hairline" style={{ background:'var(--paper)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[12px]" style={{ background:'var(--surface)', color: liveAccent }}>
                      {sess.deviceHint === 'iPhone' ? '📱' : sess.deviceHint === 'Mac' ? '💻' : sess.deviceHint === 'Android' ? '📱' : sess.deviceHint === 'Windows' ? '🖥' : '·'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[13px]">
                        {sess.deviceHint} · {sess.slidesViewed} slide{sess.slidesViewed !== 1 ? 's' : ''} viewed
                        {sess.reachedEnd && <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background:'#dcfce7', color:'#137a4a' }}>reached end</span>}
                      </div>
                      <div className="text-[11px] ink-muted mt-0.5 font-mono truncate">{sess.sessionId.slice(0, 8)} · opened {fmtRel(sess.openedTs)}</div>
                    </div>
                    <div className="text-[11px] font-mono ink-muted text-right">
                      {fmtRel(sess.lastSeenTs)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )
    }
    // ── End live mode; fall through to existing simulator below ──────
    return (
      <div className="p-6 lg:p-8 space-y-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold tracking-tight">Investor signals</div>
              <div className="text-[12px] ink-muted mt-0.5">Named links, viewer behaviour, and follow-up guidance</div>
            </div>
            <button onClick={() => setSignalSeed(s => s+1)}
              className="h-9 px-4 rounded-xl text-[13px] font-medium text-white inline-flex items-center gap-1.5" style={{ background: liveAccent }}>
              <ic.refresh className="w-3.5 h-3.5"/> Simulate new view
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { v: 3 + seed,       t:'Return visits',     d:'Investors coming back after first view.' },
              { v: `${2+seed}m`,   t:'Product demo time', d:'Most attention went to the demo section.' },
              { v: `${Math.max(15, 43 - seed*4)}%`, t:'Market drop-off',  d:'The market story may need to be clearer.' },
            ].map((m, i) => (
              <Card key={i} className="p-4" style={{ background:'var(--surface)' }}>
                <div className="text-[32px] font-semibold tracking-tight leading-none" style={{ color: liveAccent }}>{m.v}</div>
                <div className="font-medium text-[13px] mt-3">{m.t}</div>
                <div className="text-[12px] ink-muted mt-1 leading-relaxed">{m.d}</div>
              </Card>
            ))}
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="font-semibold tracking-tight mb-1">Slide engagement</div>
            <div className="text-[12px] ink-muted mb-4">Track what the viewer cared about</div>
            <div className="space-y-2.5">
              {tpl.engagementLabels.map((l, i) => (
                <div key={l} className="grid grid-cols-[70px_1fr_36px] items-center gap-2 text-[12px] ink-muted">
                  <span className="font-medium ink">{l}</span>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background:'var(--surface)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width:`${engagement[i]}%`, background:`linear-gradient(90deg,${liveAccent},${liveAccent}99)` }}/>
                  </div>
                  <b className="text-right">{Math.round(engagement[i])}%</b>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold tracking-tight mb-1">Activity feed</div>
            <div className="text-[12px] ink-muted mb-4">Viewer behaviour and Andreas follow-up</div>
            <div className="space-y-3">
              {(() => {
                const [v1, v2] = viewers
                const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
                const feed = [
                  v1 && { a: v1.id.charAt(0).toUpperCase(), t: `${cap(v1.id.split('-')[0])} link opened`,   d:'Viewed 11 slides, longest on product demo, clicked book a call.', time:'9:42 AM' },
                  v2 && { a: v2.id.charAt(0).toUpperCase(), t: `${cap(v2.id.split('-')[0])} link returned`, d:'Second visit detected. Rewatched the workflow slides.',           time:'11:18 AM' },
                  { a:'A', t:'Andreas follow-up suggestion', d: px(tpl.followupAngle.headline) + '. ' + px(tpl.followupAngle.reason), time:'Now' },
                ].filter(Boolean) as { a: string; t: string; d: string; time: string }[]
                return feed.map((r, i) => (
                <div key={i} className="grid grid-cols-[42px_1fr_auto] gap-3 items-center p-3 rounded-xl hairline" style={{ background:'var(--paper)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[12px]" style={{ background:'var(--surface)', color: liveAccent }}>{r.a}</div>
                  <div className="min-w-0">
                    <div className="font-medium text-[13px]">{r.t}</div>
                    <div className="text-[12px] ink-muted mt-0.5 leading-snug">{r.d}</div>
                  </div>
                  <div className="text-[11px] font-mono ink-muted">{r.time}</div>
                </div>
              ))
              })()}
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="font-semibold tracking-tight mb-1">Returning viewers</div>
          <div className="text-[12px] ink-muted mb-4">Per investor link</div>
          <div className="divide-y divide-[var(--line)]">
            {viewers.map(v => (
              <div key={v.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-medium font-mono">{v.id}</div>
                  <div className="text-[12px] ink-muted">Last seen {v.last}</div>
                </div>
                <Pill tone={v.hot ? 'accent' : 'soft'}>{v.returns}× returns</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  /* ── DEMO LAYER ──────────────────────────────────────────────── */
  const ScreenDemo = () => (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        {([
          { id:'embed',   title:'App embed',      desc:'Embed a live demo inside your deck.',           est:'2:00' },
          { id:'video',   title:'Autoplay video', desc:'Auto-play an MP4 at the right moment.',          est:'1:20' },
          { id:'speaker', title:'Speaker-led',    desc:'Beat-by-beat script for a live walkthrough.',    est:'3:00' },
        ] as const).map(m => (
          <Card key={m.id} className="p-5 cursor-pointer transition-all hover:-translate-y-0.5"
            style={demoMode===m.id ? { boxShadow:`0 0 0 2px ${liveAccent}` } : {}}
            onClick={() => setDemoMode(m.id)}>
            <MiniLabel>{m.est}</MiniLabel>
            <div className="font-semibold tracking-tight mt-1.5">{m.title}</div>
            <div className="text-[13px] ink-muted mt-1 leading-relaxed">{m.desc}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        {demoMode === 'embed' && (
          <div className="space-y-4">
            <div>
              <MiniLabel>App URL</MiniLabel>
              <input value={demoUrl} onChange={e => setDemoUrl(e.target.value)} className="w-full h-9 px-3 mt-2 rounded-xl text-[13px] hairline" placeholder="https://app.yourproduct.com/demo" />
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="ink-muted">Estimated demo time</span>
              <span className="font-medium font-mono">2:00</span>
            </div>
          </div>
        )}
        {demoMode === 'video' && (
          <div className="space-y-4">
            <div>
              <MiniLabel>Video URL (MP4)</MiniLabel>
              <input value={demoUrl} onChange={e => setDemoUrl(e.target.value)} className="w-full h-9 px-3 mt-2 rounded-xl text-[13px] hairline" placeholder="https://cdn.yourproduct.com/demo.mp4" />
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="ink-muted">Estimated demo time</span>
              <span className="font-medium font-mono">1:20</span>
            </div>
          </div>
        )}
        {demoMode === 'speaker' && (
          <div className="space-y-4">
            <div>
              <MiniLabel>Beats (one per line)</MiniLabel>
              <textarea rows={5} className="w-full px-3 py-2 mt-2 rounded-xl text-[13px] hairline resize-none"
                placeholder={"Open the dashboard\nClick 'New payment'\nShow the 3-second confirmation\nNavigate to reports"} />
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="ink-muted">Estimated demo time</span>
              <span className="font-medium font-mono">3:00</span>
            </div>
          </div>
        )}
        <div className="mt-5 pt-4 border-t border-[var(--line)] flex gap-2">
          <button className="h-9 px-4 rounded-xl text-[13px] font-medium text-white" style={{ background: liveAccent }}>Save demo layer</button>
          <button className="h-9 px-4 rounded-xl text-[13px] hairline ink-muted">Preview in deck</button>
        </div>
      </Card>
    </div>
  )

  /* ── PRESENT ─────────────────────────────────────────────────── */
  const ScreenPresent = () => {
    const cur  = realSlides[presentSlide]
    const next = realSlides[presentSlide + 1]
    const livePreviewHtml = refinedHtml || generatedHtml
    const openInTab = () => {
      if (!livePreviewHtml) return
      try {
        const blob = new Blob([livePreviewHtml], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } catch {}
    }
    return (
      <div className="p-4 lg:p-6 space-y-5">
        {/* Full-screen preview of the actual rendered deck — what investors see */}
        {livePreviewHtml && livePreviewHtml.length > 1000 && (
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 pb-3">
              <div>
                <div className="font-semibold tracking-tight">Deck preview</div>
                <div className="text-[12px] ink-muted mt-0.5">Live rendered HTML — scroll-snap, transitions, motion. Open in a tab for full-screen.</div>
              </div>
              <button onClick={openInTab}
                className="h-9 px-4 rounded-xl text-[13px] font-medium text-white inline-flex items-center gap-2"
                style={{ background: liveAccent }}>
                Open full-screen ↗
              </button>
            </div>
            <div className="relative" style={{ height: 'min(820px, 78vh)', background: '#000' }}>
              <iframe
                srcDoc={livePreviewHtml}
                title="Deck preview"
                sandbox="allow-scripts allow-same-origin"
                style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
              />
            </div>
          </Card>
        )}
        {/* Hero */}
        <Card className="p-6 relative overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <div>
              <MiniLabel>Presentation mode</MiniLabel>
              <h1
                className={`display-heading text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight mt-2 ${fx.heroWatermark ? 'has-watermark' : ''}`}
                data-watermark={fx.heroWatermark ? 'PRESENT' : undefined}
              >
                Turn the deck into a <span className="accent-text">talk track</span>
              </h1>
              <p className="ink-muted mt-2 text-[14px] leading-relaxed max-w-lg">
                Generate speaker notes, timing, demo day script, and investor Q&amp;A prep for each slide. Tone: <i>{px(tpl.speakerTone)}</i>
              </p>
            </div>
            <Card className="p-5 space-y-3" style={{ background:'var(--surface)' }}>
              <div>
                <MiniLabel>Presentation length</MiniLabel>
                <select value={scriptLength} onChange={e => setScriptLength(e.target.value)} className="w-full h-9 px-3 mt-1.5 rounded-xl text-[13px] hairline">
                  {['2 minutes','5 minutes','10 minutes','Investor meeting'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <MiniLabel>Tone</MiniLabel>
                <select value={scriptTone} onChange={e => setScriptTone(e.target.value)} className="w-full h-9 px-3 mt-1.5 rounded-xl text-[13px] hairline">
                  {['Sharp and direct','Demo day energy','Technical walkthrough','Founder story'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </Card>
          </div>
        </Card>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* Slide + controls */}
          <div className="space-y-3">
            <Card className="p-0 overflow-hidden">
              <div className="aspect-video p-8 flex flex-col justify-end relative"
                style={{ background:`radial-gradient(circle at 70% 30%, ${liveAccent}22, transparent 30%), linear-gradient(180deg, var(--paper), var(--surface))` }}>
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{ backgroundImage:'linear-gradient(rgba(15,17,21,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,17,21,.06) 1px, transparent 1px)', backgroundSize:'24px 24px' }}/>
                <div className="relative">
                  <MotionChip>Slide {String(presentSlide+1).padStart(2,'0')} · {cur?.kind?.toLowerCase()}</MotionChip>
                  <div className="mt-3 text-[32px] sm:text-[44px] font-semibold tracking-tight leading-tight uppercase">
                    {cur?.title}
                  </div>
                  {cur?.body && <div className="mt-3 text-[15px] ink-muted max-w-lg">{cur.body}</div>}
                </div>
              </div>
              <div className="p-3 flex items-center justify-between border-t border-[var(--line)]">
                <div className="flex gap-2">
                  <button onClick={() => setPresentSlide(s => Math.max(0, s-1))} className="h-8 px-3 rounded-xl text-[13px] hairline inline-flex items-center gap-1">
                    <ic.chevL className="w-4 h-4"/> Prev
                  </button>
                  <button onClick={() => setPresentSlide(s => Math.min(realSlides.length-1, s+1))} className="h-8 px-3 rounded-xl text-[13px] text-white inline-flex items-center gap-1" style={{ background: liveAccent }}>
                    Next <ic.chevR className="w-4 h-4"/>
                  </button>
                </div>
                <div className="text-[14px] font-mono ink-muted">{fmtTimer(timerSeconds)}</div>
                <div className="flex gap-2">
                  <button onClick={() => setTimerRunning(!timerRunning)} className="h-8 px-3 rounded-xl text-[13px] hairline">{timerRunning ? 'Pause' : 'Start'}</button>
                  <button onClick={() => { setTimerSeconds(0); setTimerRunning(false) }} className="h-8 px-3 rounded-xl text-[13px] ink-muted">Reset</button>
                </div>
              </div>
            </Card>

            {/* Thumbnail strip */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {realSlides.map((s, i) => (
                <button key={s.key} onClick={() => setPresentSlide(i)}
                  className="h-8 px-3 rounded-xl text-[12px] font-mono flex-shrink-0 transition-all"
                  style={i===presentSlide ? { background: liveAccent, color:'#fff' } : { background:'var(--surface)', color:'var(--ink-muted)' }}>
                  S{i+1}
                </button>
              ))}
            </div>
          </div>

          {/* Speaker notes timeline */}
          <Card className="p-5">
            <div className="font-semibold tracking-tight mb-1">Speaker notes</div>
            <div className="text-[12px] ink-muted mb-4">Generated per slide</div>
            <div className="relative space-y-3 pl-9">
              <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background:`linear-gradient(${liveAccent},var(--line))` }} />
              {realSlides.slice(0,5).map((s, i) => (
                <div key={s.key} className="relative grid grid-cols-[28px_1fr] gap-3 items-start cursor-pointer" onClick={() => setPresentSlide(i)}>
                  <div className="absolute -left-9 top-0 w-8 h-8 rounded-xl flex items-center justify-center font-mono text-[11px] font-semibold z-10"
                    style={{ background:'var(--paper)', border:`1px solid ${i===presentSlide ? liveAccent : liveAccent+'55'}`, color: liveAccent }}>{i+1}</div>
                  <div className="col-start-2 p-3 rounded-xl hairline" style={{ background:'var(--paper)' }}>
                    <div className="font-medium text-[13px]">{s.title}</div>
                    <div className="text-[12px] ink-muted mt-1 leading-relaxed">Say: {s.body} Then move to proof. Likely question: why does this matter now?</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  /* ── DEPLOY ──────────────────────────────────────────────────── */
  const ScreenDeploy = () => {
    const targets = [
      { name:'Vercel',      letter:'V',   desc:'Push the deck to a live route like /pitch.' },
      { name:'Netlify',     letter:'N',   desc:'Static deploy with fast preview links.' },
      { name:'Cloudflare',  letter:'C',   desc:'Ship to Pages with custom domain support.' },
      { name:'HTML ZIP',    letter:'ZIP', desc:'Download HTML, CSS, JS, and assets.' },
    ]
    return (
      <div className="p-6 lg:p-8 space-y-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold tracking-tight">Deploy anywhere</div>
              <div className="text-[12px] ink-muted mt-0.5">Hosted link, exportable code, or push to the founder's stack</div>
            </div>
            <button onClick={selectedDeploy === 'HTML ZIP' ? download : deployToVercel}
              disabled={deployLoading}
              className="h-9 px-4 rounded-xl text-[13px] font-medium text-white disabled:opacity-40"
              style={{ background: liveAccent }}>
              {deployLoading ? <><span className="sd-spinner">◐</span> Publishing…</> : 'Publish selected'}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {targets.map(t => (
              <Card key={t.name} className="p-5 cursor-pointer transition-all hover:-translate-y-0.5"
                style={selectedDeploy===t.name ? { boxShadow:`0 0 0 2px ${liveAccent}`, background:`${liveAccent}08` } : {}}
                onClick={() => setSelectedDeploy(t.name)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 font-bold text-[13px]"
                  style={{ background: 'var(--surface)', color: liveAccent }}>{t.letter}</div>
                <div className="font-semibold tracking-tight text-[14px]">{t.name}</div>
                <div className="text-[12px] ink-muted mt-1 leading-relaxed">{t.desc}</div>
              </Card>
            ))}
          </div>
        </Card>

        {selectedDeploy === 'Vercel' && (
          <Card className="p-6">
            <div className="font-semibold tracking-tight mb-1">Vercel token</div>
            <div className="text-[13px] ink-muted mb-4">Paste your Vercel token and your deck goes live in seconds.</div>
            <div className="flex gap-2">
              <input value={vercelToken} onChange={e => setVercelToken(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl text-[13px] hairline font-mono"
                placeholder="vcel_…" type="password" />
              <button onClick={deployToVercel} disabled={!vercelToken || deployLoading}
                className="h-9 px-4 rounded-xl text-[13px] font-medium text-white disabled:opacity-40"
                style={{ background: liveAccent }}>
                {deployLoading ? 'Deploying…' : 'Deploy'}
              </button>
            </div>
            {deployUrl && (
              <div className="mt-4 p-3 rounded-xl flex items-center gap-3" style={{ background:'#e8f4ee', border:'1px solid #b7ddc7' }}>
                <ic.external className="w-4 h-4 flex-shrink-0" style={{ color:'#137a4a' }}/>
                <a href={`https://${deployUrl}`} target="_blank" rel="noreferrer" className="text-[13px] font-medium truncate" style={{ color:'#137a4a' }}>{deployUrl}</a>
              </div>
            )}
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold tracking-tight">Investor links</div>
                <div className="text-[12px] ink-muted mt-0.5">Create named links for tracking</div>
              </div>
              <button onClick={() => {
                const name = prompt('Investor link name', 'new-investor')
                if (name) setInvestorLinks(l => [...l, name.toLowerCase().replace(/[^a-z0-9]+/g,'-')])
              }} className="h-8 px-3 rounded-xl text-[12px] hairline inline-flex items-center gap-1.5">
                <ic.plus className="w-3 h-3"/> Add link
              </button>
            </div>
            <div className="space-y-2">
              {investorLinks.map(name => (
                <div key={name} className="grid grid-cols-[42px_1fr_auto] gap-3 items-center p-3 rounded-xl hairline" style={{ background:'var(--paper)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold" style={{ background:'var(--surface)', color: liveAccent }}>{name[0].toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-mono font-medium truncate">{(company || 'deck').toLowerCase()}.com/pitch/{name}</div>
                    <div className="text-[12px] ink-muted">Named tracking link for {name}</div>
                  </div>
                  <Pill tone="good">live</Pill>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold tracking-tight mb-1">Publish settings</div>
            <div className="text-[12px] ink-muted mb-4">Control privacy and access</div>
            <div className="flex flex-wrap gap-2">
              {([
                ['named',      'Named links'],
                ['slideTrack', 'Slide tracking'],
                ['password',   'Password'],
                ['expiry',     'Expiry'],
                ['pdf',        'PDF fallback'],
                ['blockDl',    'Disable download'],
              ] as const).map(([k, l]) => (
                <button key={k} onClick={() => setPublishOpts(o => ({ ...o, [k]: !o[k] }))}
                  className="h-8 px-3 rounded-full text-[12px] hairline transition-all"
                  style={publishOpts[k] ? { background: liveAccent+'15', color: liveAccent, borderColor: liveAccent+'55' } : { color:'var(--ink-muted)' }}>
                  {l}
                </button>
              ))}
            </div>
            <Card className="p-3 mt-4" style={{ background:'var(--surface)' }}>
              <div className="text-[12px] ink-muted leading-relaxed">
                {deployUrl
                  ? `Published to ${selectedDeploy}. Live at ${deployUrl}. Investor analytics active.`
                  : 'No deployment yet. Select a platform and press publish.'}
              </div>
            </Card>
          </Card>
        </div>

        {deployHistory.length > 0 && (
          <Card className="p-5">
            <div className="font-semibold tracking-tight mb-4">Deploy history</div>
            <div className="divide-y divide-[var(--line)]">
              {deployHistory.map((d, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-medium">{d.target}</div>
                    <div className="text-[12px] ink-muted font-mono">{d.url} · {d.time}</div>
                  </div>
                  <Pill tone="good">{d.status}</Pill>
                </div>
              ))}
            </div>
          </Card>
        )}
        {error && <div className="sd-error">{error}</div>}
      </div>
    )
  }

  /* ── FOLLOW-UP ───────────────────────────────────────────────── */
  const ScreenFollowup = () => (
    <div className="p-6 lg:p-8 space-y-5">
      <Card className="p-6 relative overflow-hidden">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div>
            <MiniLabel>Follow-up intelligence</MiniLabel>
            <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight mt-2">
              Use viewer behaviour to send the <span style={{ color: liveAccent }}>right follow-up</span>
            </h1>
            <p className="ink-muted mt-2 text-[14px] leading-relaxed max-w-lg">
              SignalDeck reads engagement patterns and recommends the next message, talking points, and deck changes.
            </p>
            <div className="flex gap-2 mt-5 flex-wrap">
              <RunBtn onClick={runFollowup} loading={fuLoading} label="Generate follow-up" done={!!fuData} />
              <button onClick={() => setActive('signals')} className="h-9 px-4 rounded-xl text-[13px] font-medium hairline">View signals</button>
            </div>
          </div>
          <Card className="p-5" style={{ background:'var(--surface)' }}>
            <MiniLabel>Recommended angle</MiniLabel>
            <h4 className="font-semibold text-[15px] mt-2">{px(tpl.followupAngle.headline)}</h4>
            <p className="text-[13px] ink-muted mt-2 leading-relaxed">{px(tpl.followupAngle.reason)}</p>
          </Card>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold tracking-tight">Suggested email</div>
            <button onClick={async () => {
              if (fuData) { await navigator.clipboard.writeText(`Subject: ${fuData.subject}\n\n${fuData.body}`); setFuCopied(true); setTimeout(() => setFuCopied(false), 2000) }
            }} className="h-8 px-3 rounded-xl text-[12px] hairline inline-flex items-center gap-1.5">
              <ic.copy className="w-3 h-3"/>{fuCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div>
            <MiniLabel>Persona</MiniLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {AUDIENCES.map(a => (
                <button key={a} onClick={() => setFuAudience(a)}
                  className="h-8 px-3 rounded-full text-[12px] hairline transition-all"
                  style={fuAudience===a ? { background: liveAccent, color:'#fff', border:'none' } : {}}>{a}</button>
              ))}
            </div>
          </div>
          <div>
            <MiniLabel>To</MiniLabel>
            <input value={fuTo} onChange={e => setFuTo(e.target.value)} className="w-full h-9 px-3 mt-2 rounded-xl text-[13px] hairline" />
          </div>
          {fuData && (<>
            <div>
              <MiniLabel>Subject</MiniLabel>
              <input defaultValue={fuData.subject} className="w-full h-9 px-3 mt-2 rounded-xl text-[13px] hairline" />
            </div>
            <div>
              <MiniLabel>Message</MiniLabel>
              <textarea defaultValue={fuData.body} rows={9} className="w-full px-3 py-2 mt-2 rounded-xl text-[13px] hairline resize-none leading-relaxed" />
            </div>
          </>)}
        </Card>

        <Card className="p-6">
          <div className="font-semibold tracking-tight mb-1">Next actions</div>
          <div className="text-[12px] ink-muted mb-4">What to do before sending</div>
          <div className="space-y-3">
            <TipCard tip={{ icon:'1', severity:'good', title:'Lead with product demo',     body:'The viewer spent the most time on product, so keep the follow-up practical.' }} />
            <TipCard tip={{ icon:'2', severity:'warn', title:'Do not over-send market data', body:'They dropped near market. Offer to explain the wedge instead.' }} />
            <TipCard tip={{ icon:'3', severity:'info', title:'Book a short walkthrough',   body:'Best next CTA is a 10-minute product walkthrough, not a generic coffee.' }} />
          </div>
        </Card>
      </div>
      {error && <div className="sd-error">{error}</div>}
    </div>
  )

  /* ── SETTINGS ────────────────────────────────────────────────── */
  const ScreenSettings = () => {
    const tints = [liveAccent, liveAccent+'cc', liveAccent+'99', '#0F1115', '#6366f1', '#137a4a', '#b0322b', '#a86a00']
    const Toggle = ({ on, label, onClick }: any) => (
      <button onClick={onClick} className="h-8 px-3 rounded-full text-[12px] hairline transition-all"
        style={on ? { background: liveAccent+'15', color: liveAccent, borderColor: liveAccent+'55' } : { color:'var(--ink-muted)' }}>
        {label}
      </button>
    )
    return (
      <div className="p-6 lg:p-8 space-y-5">
        <Card className="p-6 relative overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <div>
              <MiniLabel>Workspace settings</MiniLabel>
              <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight mt-2">
                Control privacy, tracking, and <span style={{ color: liveAccent }}>deck quality gates</span>
              </h1>
              <p className="ink-muted mt-2 text-[14px] leading-relaxed max-w-lg">
                Set how aggressive analytics should be, whether claims need sources before publishing, and what export formats are enabled.
              </p>
            </div>
            <Card className="p-5" style={{ background:'var(--surface)' }}>
              <MiniLabel>Quality gate</MiniLabel>
              <div className="flex flex-wrap gap-2 mt-3">
                <Toggle on={qualityGate.blockUnsourced} label="Block unsourced numbers" onClick={() => setQualityGate(q => ({ ...q, blockUnsourced: !q.blockUnsourced }))} />
                <Toggle on={qualityGate.requireCta}     label="Require CTA"             onClick={() => setQualityGate(q => ({ ...q, requireCta: !q.requireCta }))} />
                <Toggle on={qualityGate.mobile}         label="Mobile check"            onClick={() => setQualityGate(q => ({ ...q, mobile: !q.mobile }))} />
                <Toggle on={qualityGate.consent}        label="Consent banner"          onClick={() => setQualityGate(q => ({ ...q, consent: !q.consent }))} />
              </div>
            </Card>
          </div>
        </Card>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card className="p-6 space-y-4">
            <div className="font-semibold tracking-tight">Profile</div>
            <div>
              <MiniLabel>Founder name</MiniLabel>
              <input value={settingsName} onChange={e => setSettingsName(e.target.value)} className="w-full h-9 px-3 mt-2 rounded-xl text-[13px] hairline" />
            </div>
            <div>
              <MiniLabel>Company</MiniLabel>
              <input value={settingsCompany} onChange={e => setSettingsCompany(e.target.value)} className="w-full h-9 px-3 mt-2 rounded-xl text-[13px] hairline" />
            </div>
            <div>
              <MiniLabel>Industry</MiniLabel>
              <select value={settingsIndustry} onChange={e => { setSettingsIndustry(e.target.value); setProductType(e.target.value) }} className="w-full h-9 px-3 mt-2 rounded-xl text-[13px] hairline">
                {['Fintech','SaaS','AI','Enterprise','Consumer','Developer Tools','Climate','Health','Education','Other'].map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <button className="h-9 px-4 rounded-xl text-[13px] font-medium text-white w-full" style={{ background: liveAccent }}>Save profile</button>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="font-semibold tracking-tight">Brand override</div>
            {websiteUrl && <div className="text-[13px] ink-muted">Currently using colours from {websiteUrl.replace(/^https?:\/\//,'')}.</div>}
            <div>
              <MiniLabel>Colour palette</MiniLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {tints.map((t, i) => (
                  <button key={i} onClick={() => { setLiveAccent(t); setManualHex(t) }}
                    className="w-10 h-10 rounded-lg hairline shadow-card transition-all hover:scale-110" style={{ background: t }} />
                ))}
              </div>
            </div>
            <button onClick={() => { setLiveAccent(accentColor); setManualHex(accentColor) }}
              className="h-8 px-3 rounded-xl text-[12px] hairline ink-muted inline-flex items-center gap-1.5">
              <ic.refresh className="w-3 h-3"/> Reset to detected
            </button>
          </Card>

          <Card className="p-6 space-y-5">
            <div>
              <div className="font-semibold tracking-tight mb-3">Analytics</div>
              <div className="flex flex-wrap gap-2">
                <Toggle on={analyticsOpts.slideTime}  label="Slide time"            onClick={() => setAnalyticsOpts(a => ({ ...a, slideTime: !a.slideTime }))} />
                <Toggle on={analyticsOpts.ctaClicks}  label="CTA clicks"            onClick={() => setAnalyticsOpts(a => ({ ...a, ctaClicks: !a.ctaClicks }))} />
                <Toggle on={analyticsOpts.returns}    label="Return visits"         onClick={() => setAnalyticsOpts(a => ({ ...a, returns: !a.returns }))} />
                <Toggle on={analyticsOpts.location}   label="Location"              onClick={() => setAnalyticsOpts(a => ({ ...a, location: !a.location }))} />
                <Toggle on={analyticsOpts.device}     label="Device"                onClick={() => setAnalyticsOpts(a => ({ ...a, device: !a.device }))} />
                <Toggle on={analyticsOpts.anonOpt}    label="Anonymous mode option" onClick={() => setAnalyticsOpts(a => ({ ...a, anonOpt: !a.anonOpt }))} />
              </div>
            </div>
            <div>
              <div className="font-semibold tracking-tight mb-3">Exports</div>
              <div className="flex flex-wrap gap-2">
                <Toggle on={exportOpts.html}        label="HTML ZIP"     onClick={() => setExportOpts(e => ({ ...e, html: !e.html }))} />
                <Toggle on={exportOpts.vercel}      label="Vercel"       onClick={() => setExportOpts(e => ({ ...e, vercel: !e.vercel }))} />
                <Toggle on={exportOpts.cloudflare}  label="Cloudflare"   onClick={() => setExportOpts(e => ({ ...e, cloudflare: !e.cloudflare }))} />
                <Toggle on={exportOpts.netlify}     label="Netlify"      onClick={() => setExportOpts(e => ({ ...e, netlify: !e.netlify }))} />
                <Toggle on={exportOpts.pdf}         label="PDF fallback" onClick={() => setExportOpts(e => ({ ...e, pdf: !e.pdf }))} />
                <Toggle on={exportOpts.pptx}        label="PPTX"         onClick={() => setExportOpts(e => ({ ...e, pptx: !e.pptx }))} />
              </div>
            </div>
            <div className="pt-3 border-t border-[var(--line)]">
              <div className="text-[13px] font-semibold mb-3" style={{ color:'#b0322b' }}>Danger zone</div>
              <button onClick={onRestart} className="h-8 px-3 rounded-xl text-[12px] hairline w-full text-left" style={{ color:'#b0322b' }}>Reset workspace</button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  /* ── Screen router ───────────────────────────────────────────── */
  const SCREENS: Record<string, () => JSX.Element> = {
    overview: ScreenOverview, sources: ScreenSources, theme: ScreenTheme,
    deck: ScreenDeck, style: ScreenStyle, frameworks: ScreenFrameworks,
    vclens: ScreenVCLens, audit: ScreenAudit, claims: ScreenClaims, signals: ScreenSignals,
    demo: ScreenDemo, present: ScreenPresent, deploy: ScreenDeploy,
    followup: ScreenFollowup, settings: ScreenSettings,
  }
  const Screen = SCREENS[active] || ScreenOverview

  /* Per-industry layout variant derived from BrandWorld.layoutStyle.
     Falls back to 'default' when no world is generated yet (intake). */
  const layoutVariant: 'ledger' | 'arena' | 'editorial' | 'default' = (() => {
    const ls = brandWorld?.layoutStyle
    if (ls === 'ledger-precise') return 'ledger'
    if (ls === 'arena-kinetic')  return 'arena'
    if (ls === 'editorial-spacious' || ls === 'gallery-expressive') return 'editorial'
    return 'default'
  })()
  const SIDEBAR_WIDTHS = { default: 240, ledger: 200, arena: 240, editorial: 76 } as const
  const sidebarWidth = SIDEBAR_WIDTHS[layoutVariant]
  const iconOnlySidebar = layoutVariant === 'editorial'
  const navLabelStyle: React.CSSProperties =
    layoutVariant === 'ledger' ? { fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.02em' } :
    layoutVariant === 'arena'  ? { textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontFamily: 'var(--font-heading)' } :
    {}

  /* ── Sidebar ─────────────────────────────────────────────────── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={`px-${iconOnlySidebar ? 3 : 6} py-4 border-b border-[var(--line)] flex items-center gap-3 ${iconOnlySidebar ? 'justify-center' : ''}`}>
        {logoUrl
          ? <img src={logoUrl} alt="Logo" className="h-7 max-w-[100px] object-contain rounded"/>
          : <div className="w-7 h-7 rounded-lg flex-shrink-0" style={{ background: liveAccent }}/>
        }
        {!iconOnlySidebar && company && <span className="font-semibold tracking-tight text-[14px] truncate">{company}</span>}
      </div>

      {!iconOnlySidebar && (
        <div className="px-4 py-3 border-b border-[var(--line)]">
          <MiniLabel>Current project</MiniLabel>
          <div className="text-[13px] font-medium mt-1 truncate">{company || 'Untitled'} investor deck</div>
          <div className="mt-2"><Pill tone="accent">{tpl.status}</Pill></div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV.map(group => (
          <div key={group.group}>
            {!iconOnlySidebar && <div className="px-3 mb-1 text-[10px] uppercase tracking-widest ink-muted font-medium">{group.group}</div>}
            {group.items.map(item => {
              const Ico = ic[item.icon as keyof typeof ic]
              const isActive = active === item.id
              return (
                <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false) }}
                  title={iconOnlySidebar ? item.label : undefined}
                  className={`w-full text-left h-9 ${iconOnlySidebar ? 'px-0 justify-center' : 'px-3'} rounded-xl flex items-center gap-2.5 text-[13px] font-medium transition-all`}
                  style={isActive ? { background: 'var(--primary-fill)', color:'#fff' } : { color:'var(--ink)' }}>
                  {Ico && <Ico className="w-4 h-4 flex-shrink-0"/>}
                  {!iconOnlySidebar && <span style={navLabelStyle}>{item.label}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {!iconOnlySidebar && (
        <div className="p-4 border-t border-[var(--line)]">
          <button onClick={onRestart} className="w-full h-8 rounded-xl text-[12px] hairline ink-muted">← New deck</button>
        </div>
      )}
    </div>
  )

  /* ── Shell ───────────────────────────────────────────────────── */
  // BrandWorld CSS vars — applied at the root so every nested component
  // reading `var(--bg)`, `var(--surface)`, `var(--primary)`, `var(--text)`,
  // `var(--border)`, `var(--paper)`, `var(--accent)`, `var(--ink)`, etc.
  // automatically picks up the generated visual world. Aliases mean the
  // legacy class system (paper, hairline, ink-muted) keeps working.

  // Showcase screens get the brand-world's motif background + an optional
  // soft gradient for editorial/gallery layouts. Information-dense screens
  // (audit, claims, signals, sources) stay flat so density isn't disturbed.
  const SHOWCASE_SCREENS = new Set(['overview', 'theme', 'style', 'present'])
  const isShowcase = !!brandWorld && SHOWCASE_SCREENS.has(active)
  const fx = brandWorld?.effects ?? { gridOverlay:false, radialAmbient:false, heroWatermark:false, monoLabels:false, glow:false, grainOverlay:false }
  const isRichBrand = brandWorld?.visualRichness === 'rich' || brandWorld?.visualRichness === 'maximal'
  const motifLayer = isShowcase ? brandWorldMotifBackground(brandWorld!.motifs, brandWorld!.colour.primary).css : ''
  const wantsLayoutGradient = isShowcase && (brandWorld?.layoutStyle === 'editorial-spacious' || brandWorld?.layoutStyle === 'gallery-expressive')
  const layoutGradient = wantsLayoutGradient ? 'radial-gradient(at 20% 0%, var(--primary-soft), transparent 50%)' : ''
  // Richness-driven ambient washes. For rich/maximal brands we layer THREE
  // saturated ellipses in primary + secondary + accent — the "reflective
  // mirror" iridescent effect matching luma-preview.html. For balanced
  // brands we use the simpler two-soft-washes pattern.
  const hexAlpha = (hex: string, a: number) => {
    if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  // Ambient ellipse centres are INSIDE the viewport so the glow reads on dark
  // backgrounds. Background-attachment:fixed is intentionally omitted — it
  // doesn't work on elements with overflow:hidden (the root). Instead the
  // ambient is painted onto a position:fixed div that sits behind everything.
  // Light brands need MUCH lower opacity — saturated colours on white flood the
  // page and destroy text contrast. Dark brands can take 30%+ alpha because
  // the background absorbs most of the colour.
  const isDarkMode = brandWorld?.deckMode === 'dark'
  const aP = isDarkMode ? 0.38 : 0.10   // primary alpha
  const aA = isDarkMode ? 0.30 : 0.08   // accent alpha
  const aS = isDarkMode ? 0.34 : 0.09   // secondary alpha
  const ambientLayer = brandWorld && fx.radialAmbient
    ? (isRichBrand
        ? `radial-gradient(ellipse 130% 70% at 18% 22%, ${hexAlpha(brandWorld.colour.primary, aP)}, transparent 62%), radial-gradient(ellipse 120% 65% at 82% 12%, ${hexAlpha(brandWorld.colour.accent, aA)}, transparent 58%), radial-gradient(ellipse 110% 60% at 52% 80%, ${hexAlpha(brandWorld.colour.secondary, aS)}, transparent 62%)`
        : `radial-gradient(circle at 12% 15%, ${brandWorld.colour.primarySoft}, transparent 32%), radial-gradient(circle at 88% 18%, ${brandWorld.colour.primarySoft}, transparent 28%)`)
    : ''
  const gridLayer = brandWorld && fx.gridOverlay
    ? `linear-gradient(${brandWorld.colour.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${brandWorld.colour.gridLine} 1px, transparent 1px)`
    : ''
  const layers = [layoutGradient, motifLayer, gridLayer].filter(Boolean)
  const sizes  = [layoutGradient, motifLayer].filter(Boolean).map(() => 'auto').concat(gridLayer ? ['64px 64px'] : [])
  const repeats = [layoutGradient].filter(Boolean).map(() => 'no-repeat').concat(motifLayer ? ['repeat'] : []).concat(gridLayer ? ['repeat'] : [])
  const layered = layers.join(', ')

  // Buttons use the brand's solid primary colour. Earlier this was a
  // gradient for rich/maximal brands but it conflicted with brands like Up
  // that use single saturated colours as their identity — the gradient made
  // every CTA look generic instead of brand-correct.
  const primaryFill = brandWorld ? brandWorld.colour.primary : ''
  // Solid primary — matches the brand's main font colour. No rainbow.
  const accentTextFill = brandWorld ? brandWorld.colour.primary : ''

  // Use backgroundColor (not background shorthand) to avoid resetting backgroundImage.
  const worldStyle: any = brandWorld
    ? {
        ...brandWorldToCssVars(brandWorld),
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        '--primary-fill': primaryFill,
        '--accent-text': accentTextFill,
        ...(layered ? { backgroundImage: layered, backgroundRepeat: repeats.join(', '), backgroundSize: sizes.join(', ') } : {}),
      }
    : { backgroundColor: 'var(--bg)', color: 'var(--ink)' }

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      style={worldStyle}
      data-richness={brandWorld?.visualRichness || 'balanced'}
      data-mono-labels={String(fx.monoLabels)}
      data-glow={String(fx.glow)}
    >
      {/* Fixed-position ambient glow — bypasses overflow:hidden on root so the
          gradient is always visible regardless of scroll position or clipping. */}
      {brandWorld && ambientLayer && (
        <div aria-hidden="true" style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: ambientLayer, backgroundRepeat: 'no-repeat', backgroundSize: 'auto',
        }} />
      )}
      {brandWorld && (
        <style>{`
          .display-heading {
            font-family: var(--font-heading), system-ui, sans-serif !important;
            font-weight: var(--heading-weight) !important;
            letter-spacing: var(--heading-tracking) !important;
            font-size: clamp(36px, 5vw, 64px) !important;
            line-height: 1.05 !important;
          }
          .accent-text {
            background: var(--accent-text);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
          }
          [data-mono-labels="true"] .mini-label {
            font-family: var(--font-mono), ui-monospace, monospace !important;
            letter-spacing: 0.16em !important;
            font-weight: 500 !important;
          }
          [data-glow="true"] .brand-glow {
            box-shadow: 0 12px 30px ${brandWorld.colour.primarySoft.replace(/0\.\d+/, '0.35')}, 0 0 0 1px ${brandWorld.colour.primary} inset;
          }
          .has-watermark { position: relative; overflow: hidden; }
          .has-watermark::after {
            content: attr(data-watermark);
            position: absolute;
            right: -16px;
            bottom: -28px;
            font-family: var(--font-heading), system-ui, sans-serif;
            font-weight: var(--heading-weight);
            font-size: clamp(110px, 14vw, 210px);
            line-height: 1;
            letter-spacing: -4px;
            color: ${brandWorld.colour.primary};
            opacity: 0.035;
            pointer-events: none;
            text-transform: uppercase;
            z-index: 0;
          }
          .has-watermark > * { position: relative; z-index: 1; }
        `}</style>
      )}
      {brandWorld && fx.grainOverlay && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
            opacity: 0.25, mixBlendMode: 'overlay',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E")`,
          }}
        />
      )}
      <aside className="hidden lg:flex flex-col flex-shrink-0 border-r border-[var(--line)] bg-[var(--paper)]" style={{ width: sidebarWidth }}>
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}/>
          <aside className="relative h-full bg-[var(--paper)] flex flex-col shadow-xl" style={{ width: Math.max(sidebarWidth, 240) }}><SidebarContent /></aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {layoutVariant === 'arena' && (
          <div style={{ height: 4, background: `linear-gradient(90deg, var(--primary), var(--accent))`, flexShrink: 0 }} />
        )}
        <header className="sticky top-0 z-10 flex items-center gap-3 px-5 h-14 border-b border-[var(--line)] bg-[var(--paper)] flex-shrink-0">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><ic.menu className="w-5 h-5 ink-muted"/></button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[15px] font-semibold truncate">{t1}</span>
            <span className="hidden sm:inline text-[13px] ink-muted">— {t2}</span>
          </div>
          <div className="flex-1"/>
          <div className="hidden md:flex items-center gap-3">
            {realSlides.length > 0 && <Pill tone="soft">{realSlides.length} slides ready</Pill>}
            <button onClick={() => setActive('theme')} className="h-8 px-3 rounded-full hairline flex items-center gap-2 text-[13px]">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: 'var(--primary-fill)' }}/>
              Theme
            </button>
          </div>
          <button onClick={() => setActive('present')} className="brand-glow h-8 px-3.5 rounded-xl text-[13px] font-medium text-white inline-flex items-center gap-1.5" style={{ background: 'var(--primary-fill)' }}>
            <ic.play className="w-3.5 h-3.5"/> Present
          </button>
          <div className="w-9 h-9 rounded-full surface hairline flex items-center justify-center text-[12px] font-semibold flex-shrink-0" style={{ background:'var(--surface)' }}>
            {(settingsName || founderName || 'YO').slice(0,2).toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto"><Screen /></main>
      </div>

      {/* Andreas — floating chat panel. Sees workspace context so it can
         dispatch the right sub-agents per founder instruction. */}
      <AndreasPanel
        company={company}
        industry={industry}
        audience={audience}
        stage={stage}
        founderName={founderName}
        brandWorld={brandWorld}
        currentScreen={active}
        deckContent={liveContent}
        slideIds={realSlides.map((s: any) => s.key)}
        activeSlideId={realSlides[activeSlide]?.key}
        // Workspace-computed signals so Andreas can answer from cache instead
        // of re-dispatching audit/claims/vclens for every related question.
        auditData={auditData}
        claimsData={claimsData}
        vcData={vcData}
        signalsData={signalsData}
      />
    </div>
  )
}
