import { useState, useEffect, useRef } from 'react'

/* ── Icons ─────────────────────────────────────────────────────── */
const ic = {
  layers:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>,
  doc:      (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6"/></svg>,
  palette:  (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2-.6-1.4.4-2.5 1.7-2.5H17a4 4 0 004-4 9 9 0 00-9-9z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="9.5" cy="6.5" r="1"/><circle cx="14" cy="6" r="1"/><circle cx="17" cy="10" r="1"/></svg>,
  cards:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/></svg>,
  star:     (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"/></svg>,
  list:     (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
  eye:      (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>,
  check:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12l5 5L20 6"/></svg>,
  bolt:     (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>,
  signal:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 20V14M9 20V10M14 20V6M19 20V2"/></svg>,
  play:     (p: any) => <svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7V5z"/></svg>,
  spark:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4"/></svg>,
  rocket:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 14c0-5 4-11 9-11 5 0 5 6 0 11-3 3-6 4-9 0z"/><path d="M5 14c-2 1-3 3-3 6 3 0 5-1 6-3"/><circle cx="14" cy="8" r="1.5"/></svg>,
  send:     (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 11l18-7-7 18-3-8-8-3z"/></svg>,
  cog:      (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.4.8a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.8-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.8c.6.5 1.3.9 2 1.2L10 21h4l.5-2.5c.7-.3 1.4-.7 2-1.2l2.4.8 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>,
  menu:     (p: any) => <svg {...p} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/></svg>,
  download: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 4v12M6 14l6 6 6-6M4 20h16"/></svg>,
  external: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M18 13v6H6V7h6M15 3h6v6M10 14L21 3"/></svg>,
  copy:     (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  globe:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>,
  upload:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>,
  mic:      (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6"/></svg>,
  chevL:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>,
  chevR:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>,
  clock:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
  image:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  trash:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
}

/* ── Nav ────────────────────────────────────────────────────────── */
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
  audit:      ['Audit',          'Story scoring and tips'],
  claims:     ['Claims',         'Every assertion, classified'],
  signals:    ['Signals',        'Engagement and drop-off'],
  demo:       ['Demo Layer',     'How the product appears'],
  present:    ['Present',        'Run the room'],
  deploy:     ['Deploy',         'Send the deck live'],
  followup:   ['Follow-up',      'Voice-matched email'],
  settings:   ['Settings',       'Profile, brand, exports'],
}

const SLIDE_LABELS: Record<string, string> = {
  s1_intro:'Intro', s2_situation:'Situation', s3_problem:'Problem',
  s4_implication:'Implication', s5_fix:'The Fix', s6_how:'How It Works',
  s7_validation:'Validation', s8_market:'Market', s9_customers:'Customers',
  s10_competition:'Competition', s11_risks:'Risks', s12_team_ask:'Team & Ask',
}

const FRAMEWORKS = [
  { id:'spin',    name:'SPIN Selling',         summary:'Diagnose pain before pitching the cure.',           steps:['Situation','Problem','Implication','Need-payoff'],       when:'Enterprise / long sales cycle decks.' },
  { id:'belief',  name:'Belief Chain',          summary:'Stack the beliefs the investor must accept, in order.', steps:['World is changing','Old way breaks','New way wins','We are the new way'], when:'Category-creation pitches.' },
  { id:'risk',    name:'Risk Reversal',         summary:'Surface the obvious risk and dismantle it.',        steps:['Name the risk','Quantify it','Show our hedge','Show proof'], when:'Skeptical / late-stage investors.' },
  { id:'cat',     name:'Category Creation',     summary:'Define a new game where you are already winning.', steps:['Old category','New category','Stakes','Frontier metric'], when:'Market-defining pitches.' },
  { id:'jtbd',    name:'Jobs To Be Done',       summary:'Frame the customer hire, not the customer profile.',steps:['Job','Hire','Fire','Outcome'],                           when:'Consumer / horizontal products.' },
  { id:'bab',     name:'Before-After-Bridge',   summary:'Paint pain, paint relief, name the bridge.',       steps:['Before','After','Bridge','Proof'],                       when:'Short / demo-led decks.' },
]

const PERSONAS: Record<string, { label: string; fund: string; focus: string }> = {
  'Seed VC':   { label:'Seed VC',   fund:'Generalist Seed',  focus:'Conviction, insight quality, believable wedge' },
  'Series A':  { label:'Series A',  fund:'Series A Lead',    focus:'Repeatable GTM, NRR, payback period' },
  'Angel':     { label:'Angel',     fund:'Operator Angel',   focus:'Founder unfair advantage, why they win' },
  'Strategic': { label:'Strategic', fund:'Corporate Dev',    focus:'Distribution fit, integration cost, M&A optionality' },
  'Internal':  { label:'Internal',  fund:'Board / Team',     focus:'Decision framing, what changed, smallest ask' },
}

const AUDIENCES = ['Seed VC', 'Series A', 'Angel', 'Strategic', 'Internal']

const AUDIT_COLORS: Record<string, string> = { good:'#137a4a', warn:'#a86a00', risk:'#b0322b' }
const CLAIM_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  'supported':      { bg:'#e8f4ee', color:'#137a4a', label:'Supported'      },
  'needs-source':   { bg:'#fbf1dd', color:'#a86a00', label:'Needs source'   },
  'risky':          { bg:'#fbe8e5', color:'#b0322b', label:'Risky'          },
  'founder-thesis': { bg:'#eff6ff', color:'#1d4ed8', label:'Founder thesis' },
}

/* ── Props ──────────────────────────────────────────────────────── */
interface WorkspaceProps {
  company: string
  accentColor: string
  generatedHtml: string
  generatedContent: any
  onRestart: () => void
  logoUrl?: string
  audience?: string
  websiteUrl?: string
  realStory?: string
  founderName?: string
  stage?: string
  industry?: string
}

/* ═══════════════════════════════════════════════════════════════════
   WORKSPACE
═══════════════════════════════════════════════════════════════════ */
export default function Workspace({
  company, accentColor, generatedHtml, generatedContent, onRestart,
  logoUrl, audience = 'Seed VC', websiteUrl, realStory, founderName = 'You', stage, industry,
}: WorkspaceProps) {
  const [active, setActive] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /* deploy */
  const [vercelToken, setVercelToken] = useState('')
  const [deployUrl, setDeployUrl] = useState('')
  const [deployLoading, setDeployLoading] = useState(false)
  const [deployHistory, setDeployHistory] = useState<{ target: string; url: string; time: string; status: string }[]>([])

  /* refine */
  const [isRefining, setIsRefining] = useState(false)
  const [isRefined, setIsRefined] = useState(false)
  const [refinedHtml, setRefinedHtml] = useState(generatedHtml)

  /* VC Lens */
  const [vcPersona, setVcPersona] = useState(audience)
  const [vcData, setVcData] = useState<any>(null)
  const [vcLoading, setVcLoading] = useState(false)

  /* Audit */
  const [auditData, setAuditData] = useState<any>(null)
  const [auditLoading, setAuditLoading] = useState(false)

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

  /* Style Library */
  const [styleTab, setStyleTab] = useState<'transitions'|'layouts'|'palettes'|'moods'>('transitions')
  const [antiGeneric, setAntiGeneric] = useState(false)

  /* Frameworks */
  const [activeFramework, setActiveFramework] = useState<string|null>(null)

  /* Demo Layer */
  const [demoMode, setDemoMode] = useState<'embed'|'video'|'speaker'>('embed')
  const [demoUrl, setDemoUrl] = useState('')

  /* Present */
  const [presentSlide, setPresentSlide] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef<any>(null)

  /* Settings */
  const [settingsName, setSettingsName] = useState(founderName)
  const [settingsCompany, setSettingsCompany] = useState(company)
  const [settingsIndustry, setSettingsIndustry] = useState(industry || '')
  const [manualHex, setManualHex] = useState(accentColor)
  const [liveAccent, setLiveAccent] = useState(accentColor)

  /* Sources */
  const [sourcesFilter, setSourcesFilter] = useState('All')

  const [error, setError] = useState('')

  const slides = generatedContent ? Object.entries(generatedContent) : []
  const slideList = slides.map(([key, val]: [string, any], i) => ({
    key, val, num: i + 1, label: SLIDE_LABELS[key] || key,
  }))

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', liveAccent)
  }, [liveAccent])

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
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
      setActive('deploy')
    } catch (e: any) { setError(e.message) }
    finally { setDeployLoading(false) }
  }

  async function refine() {
    setIsRefining(true); setError('')
    try {
      const res = await fetch('/api/refine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedContent, input: { company, accentColor } }),
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
        body: JSON.stringify({ content: generatedContent, company, persona: vcPersona }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVcData(data)
    } catch (e: any) { setError(e.message) }
    finally { setVcLoading(false) }
  }

  async function runAudit() {
    setAuditLoading(true); setError('')
    try {
      const res = await fetch('/api/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedContent, company }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAuditData(data)
    } catch (e: any) { setError(e.message) }
    finally { setAuditLoading(false) }
  }

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

  /* ── Primitives ──────────────────────────────────────────────── */
  const Card = ({ children, className = '', style = {} }: any) => (
    <div className={`paper hairline rounded-[18px] shadow-card ${className}`} style={style}>{children}</div>
  )

  const Pill = ({ children, tone = 'soft' }: any) => {
    const styles: Record<string, any> = {
      good:    { background:'#e8f4ee', color:'#137a4a' },
      warn:    { background:'#fbf1dd', color:'#a86a00' },
      risk:    { background:'#fbe8e5', color:'#b0322b' },
      soft:    { background:'var(--surface)', color:'var(--ink-muted)' },
      accent:  { background: liveAccent, color:'#fff' },
      neutral: { background:'var(--surface)', color:'var(--ink)' },
    }
    return <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full" style={styles[tone] || styles.soft}>{children}</span>
  }

  const ScoreCard = ({ label, value }: { label: string; value: number }) => (
    <Card className="p-5">
      <div className="text-[12px] uppercase tracking-wider ink-muted mb-1">{label}</div>
      <div className="text-[28px] font-semibold tracking-tight">{value}</div>
      <div className="text-[12px] ink-muted">/ 100</div>
      <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background:'var(--surface)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width:`${value}%`, background: value>=70?'#137a4a':value>=50?'#a86a00':'#b0322b' }} />
      </div>
    </Card>
  )

  const RunBtn = ({ onClick, loading, label, done, secondary }: any) => (
    <button onClick={onClick} disabled={loading}
      className="h-9 px-4 rounded-xl text-[13px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5 flex-shrink-0 hairline"
      style={secondary
        ? { background:'var(--paper)', color:'var(--ink)' }
        : { background: liveAccent, color:'#fff', border:'none' }}>
      {loading ? <><span className="sd-spinner">◐</span> Working…</> : done ? <><ic.spark className="w-3.5 h-3.5"/>Re-run</> : label}
    </button>
  )

  const [t1, t2] = TITLES[active] || ['', '']

  /* ── OVERVIEW ────────────────────────────────────────────────── */
  const ScreenOverview = () => {
    const auditScore  = auditData?.overall ?? 74
    const claimsFix   = claimsData ? claimsData.claims?.filter((c:any) => c.classification !== 'supported').length : 2
    const claimsTotal = claimsData?.claims?.length ?? 7
    return (
      <div className="p-6 lg:p-8 space-y-5">
        {/* Hero */}
        <Card className="p-6 sm:p-8 overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage:`linear-gradient(135deg,${liveAccent},transparent)` }} />
          <div className="relative flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="flex-1">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Your deck is starting to take shape</div>
              <h1 className="text-[26px] font-semibold tracking-tight leading-tight">{company || 'Your deck'} — {slideList.length || 12} slides built.</h1>
              <p className="ink-muted mt-2 text-[14px] leading-relaxed">
                {claimsFix} claim{claimsFix !== 1 ? 's' : ''} need{claimsFix === 1 ? 's' : ''} a source. Run the pitch coach to sharpen every word.
              </p>
              <div className="flex gap-2 mt-5 flex-wrap">
                <button onClick={() => setActive('deck')}
                  className="h-10 px-4 rounded-xl font-medium text-[14px] text-white inline-flex items-center gap-2"
                  style={{ background: liveAccent }}>
                  <ic.cards className="w-4 h-4"/> Generate pitch deck
                </button>
                <button onClick={() => setActive('sources')}
                  className="h-10 px-4 rounded-xl font-medium text-[14px] paper hairline ink hover:bg-[var(--surface)] inline-flex items-center gap-2">
                  Review story
                </button>
              </div>
            </div>
            <div className="hidden sm:flex w-[180px] h-[110px] rounded-2xl hairline surface flex-shrink-0 relative overflow-hidden items-end p-3"
              style={{ background:'var(--surface)' }}>
              <div className="absolute inset-0 opacity-30"
                style={{ backgroundImage:'linear-gradient(to right,rgba(15,17,21,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(15,17,21,.05) 1px,transparent 1px)', backgroundSize:'16px 16px' }} />
              <div className="relative">
                <div className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white mb-1 inline-block" style={{ background: liveAccent }}>{company || 'Deck'}</div>
                <div className="text-[10px] ink-muted">Live deck preview</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Audit score',       value: auditScore,           sub: `/ 100` },
            { label:'Claims to fix',     value: claimsFix,            sub: `of ${claimsTotal} total` },
            { label:'Slides drafted',    value: slideList.length || 8, sub: `${Math.max(0, 12-(slideList.length||8))} in outline` },
            { label:'Signals received',  value: 6,                    sub: 'Last 24h' },
          ].map((m, i) => (
            <Card key={i} className="p-5">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-1">{m.label}</div>
              <div className="text-[28px] font-semibold tracking-tight">{m.value}</div>
              <div className="text-[12px] ink-muted mt-0.5">{m.sub}</div>
            </Card>
          ))}
        </div>

        {/* Pick up + Recent activity */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold tracking-tight">Pick up where you left off</div>
              <Pill tone="soft">3 items</Pill>
            </div>
            <div className="space-y-3">
              {[
                { text: auditData ? 'Re-run audit with refined copy' : 'Run the story audit', link: 'audit', cta: 'Open audit' },
                { text: claimsData ? 'Add a source for the top risky claim' : 'Classify all claims', link: 'claims', cta: 'Open claims' },
                { text: activeFramework ? `Review ${activeFramework} restructure` : 'Pick a narrative framework', link: 'frameworks', cta: 'Open frameworks' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--line)] last:border-0">
                  <div className="text-[13px]">{item.text}</div>
                  <button onClick={() => setActive(item.link)}
                    className="text-[12px] font-medium flex-shrink-0 ml-4" style={{ color: liveAccent }}>
                    {item.cta} →
                  </button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <div className="font-semibold tracking-tight mb-4">Recent activity</div>
            <div className="space-y-3 text-[13px]">
              {[
                { text: 'a16z viewer opened slide 4 twice', time: '2h ago' },
                { text: 'Sequoia viewer stayed 96s on demo', time: 'yesterday' },
                { text: 'Story audit re-ran', time: 'yesterday' },
              ].map((a, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="ink">{a.text}</div>
                  <div className="ink-muted text-[12px]">{a.time}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Pitch coach */}
        {!isRefined && (
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold tracking-tight">Run GPT-4o pitch coach</div>
                <div className="text-[13px] ink-muted mt-1 leading-relaxed">Rebuilds headlines to 2–5 words, sharpens bullets, removes every buzzword.</div>
              </div>
              {isRefining
                ? <div className="flex-shrink-0 flex items-center gap-2 text-[13px]" style={{ color: liveAccent }}><span className="sd-spinner">◐</span> Working…</div>
                : <button onClick={refine} className="flex-shrink-0 h-9 px-4 rounded-xl text-[13px] font-medium inline-flex items-center gap-1.5 text-white" style={{ background: liveAccent }}>
                    <ic.spark className="w-3.5 h-3.5"/> Run coach
                  </button>
              }
            </div>
          </Card>
        )}
        {isRefined && <div className="px-4 py-3 rounded-[14px] text-[13px] flex items-center gap-2" style={{ background:'#f5f3ff', border:'1px solid #c7d2fe', color:'#6366f1' }}>✓ Pitch coach applied — copy is sharper</div>}
        {error && <div className="sd-error">{error}</div>}
      </div>
    )
  }

  /* ── SOURCES ─────────────────────────────────────────────────── */
  const ScreenSources = () => {
    const allSources = [
      logoUrl    && { type:'Brand',   icon:'image',  name:'Logo / mark',                      value: logoUrl.slice(0,40)+'…',                          status:'Ready',      time:'Auto-detected'    },
      websiteUrl && { type:'Brand',   icon:'globe',  name: websiteUrl.replace(/^https?:\/\//,''), value:'Brand colours and fonts extracted',             status:'Ready',      time:'Auto-detected'    },
      realStory  && { type:'Story',   icon:'doc',    name:'Founder story',                    value: realStory.slice(0,80)+(realStory.length>80?'…':''), status:'Ready',      time:'Added at intake'  },
                    { type:'Voice',   icon:'mic',    name:'Voice profile',                    value:'Extracted tone from your story input',              status:'Ready',      time:'At intake'        },
                    { type:'Deck',    icon:'layers', name:'Claude Sonnet 4.6',                value:`Generated ${slideList.length||12}-slide deck`,      status:'Done',       time:'Just now'         },
      isRefined && { type:'Deck',    icon:'spark',  name:'GPT-4o pitch coach',               value:'Refined all copy — headlines, bullets, lede',       status:'Done',       time:'Just now'         },
    ].filter(Boolean) as any[]

    const filtered = sourcesFilter === 'All' ? allSources : allSources.filter(s => s.type === sourcesFilter)

    const iconMap: Record<string, any> = { image: ic.image, globe: ic.globe, doc: ic.doc, mic: ic.mic, layers: ic.layers, spark: ic.spark }

    return (
      <div className="p-6 lg:p-8 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {['All','Brand','Story','Voice','Deck'].map(f => (
            <button key={f} onClick={() => setSourcesFilter(f)}
              className="h-8 px-3.5 rounded-full text-[13px] font-medium hairline transition-all"
              style={sourcesFilter===f ? { background: liveAccent, color:'#fff', border:'none' } : {}}>
              {f}
            </button>
          ))}
          <button className="ml-auto h-8 px-3.5 rounded-full text-[13px] font-medium hairline inline-flex items-center gap-1.5">
            <ic.upload className="w-3.5 h-3.5"/> Add source
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s: any, i: number) => {
            const Ico = iconMap[s.icon] || ic.doc
            return (
              <Card key={i} className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'var(--surface)' }}>
                    <Ico className="w-4 h-4 ink-muted"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[14px] truncate">{s.name}</div>
                    <div className="text-[12px] ink-muted mt-0.5">{s.type}</div>
                  </div>
                </div>
                <div className="text-[12px] ink-muted truncate mb-3">{s.value}</div>
                <div className="flex items-center justify-between">
                  <Pill tone="good">{s.status}</Pill>
                  <div className="text-[11px] ink-muted">{s.time}</div>
                </div>
              </Card>
            )
          })}
          {/* empty state */}
          <Card className="p-5 flex flex-col items-center justify-center text-center min-h-[120px]" style={{ background:'var(--surface)', border:'1.5px dashed var(--line)' }}>
            <ic.upload className="w-5 h-5 ink-muted mb-2"/>
            <div className="text-[13px] font-medium">Add another source</div>
            <div className="text-[12px] ink-muted mt-1">Logos, sites, decks, notes, screenshots, audio.</div>
          </Card>
        </div>
      </div>
    )
  }

  /* ── THEME ───────────────────────────────────────────────────── */
  const ScreenTheme = () => {
    const tints = [liveAccent, liveAccent+'cc', liveAccent+'99', liveAccent+'55', liveAccent+'22']
    const demoThemes = [
      { name:'SyncPay',   accent:'#00b09b', bg:'#f0fafa', desc:'Fintech teal' },
      { name:'Momentum',  accent:'#e63946', bg:'#fff5f5', desc:'Bold red' },
      { name:'Verdant',   accent:'#2d6a4f', bg:'#f0f7f0', desc:'Clean green' },
    ]
    return (
      <div className="p-6 lg:p-8">
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left panel */}
          <Card className="p-6 space-y-5 lg:col-span-1">
            <div>
              <div className="font-semibold tracking-tight mb-1">Brand intelligence</div>
              {websiteUrl && <div className="text-[12px] ink-muted">Extracted from {websiteUrl.replace(/^https?:\/\//,'')}</div>}
            </div>

            <div>
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Extracted colours</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {tints.map((t, i) => (
                  <button key={i} onClick={() => { setLiveAccent(t); setManualHex(t) }}
                    className="w-8 h-8 rounded-lg hairline transition-all hover:ring-2"
                    style={{ background: t }} />
                ))}
              </div>
              <div className="text-[11px] ink-muted">Click any colour to apply it as the primary</div>
            </div>

            {logoUrl && (
              <div>
                <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Brand logo</div>
                <img src={logoUrl} alt="Logo" className="h-10 max-w-[140px] rounded hairline object-contain" />
              </div>
            )}

            {industry && (
              <div>
                <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Industry</div>
                <Pill tone="soft">{industry}</Pill>
              </div>
            )}

            <div>
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Detected fonts</div>
              <div className="space-y-1 text-[13px]">
                <div><span className="font-semibold">Inter</span> <span className="ink-muted">— Heading</span></div>
                <div><span>Inter</span> <span className="ink-muted">— Body</span></div>
              </div>
            </div>

            <div>
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Manual override</div>
              <div className="flex gap-2">
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
              <ic.spark className="w-3 h-3"/> Reset to detected
            </button>
          </Card>

          {/* Right panel */}
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-6">
              <div className="font-semibold tracking-tight mb-4">How the UI adapts to brand</div>
              <div className="grid grid-cols-3 gap-3">
                {demoThemes.map(dt => (
                  <div key={dt.name} className="rounded-xl overflow-hidden hairline" style={{ background: dt.bg }}>
                    <div className="h-16 p-2 flex gap-1">
                      <div className="w-10 rounded-lg flex-shrink-0" style={{ background: dt.accent + '33' }}/>
                      <div className="flex-1 space-y-1">
                        <div className="h-2 rounded-full" style={{ background: dt.accent, opacity:.7 }}/>
                        <div className="h-1.5 rounded-full" style={{ background: dt.accent, opacity:.3, width:'70%' }}/>
                        <div className="h-1.5 rounded-full" style={{ background: dt.accent, opacity:.2, width:'50%' }}/>
                      </div>
                    </div>
                    <div className="px-2 pb-2 text-[10px] font-medium" style={{ color: dt.accent }}>{dt.name} · {dt.desc}</div>
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
                  {company} · {industry || 'Startup'} · {liveAccent}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {tints.slice(0,4).map((t, i) => (
                  <div key={i} className="flex-1 h-6 rounded-lg" style={{ background: t }} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  /* ── DECK BUILD ──────────────────────────────────────────────── */
  const ScreenDeck = () => {
    if (!slideList.length) return (
      <div className="p-8"><Card className="p-10 text-center max-w-md mx-auto">
        <div className="text-[13px] ink-muted">No deck content yet. Complete the intake to generate slides.</div>
      </Card></div>
    )
    const cur = slideList[activeSlide]
    return (
      <div className="p-4 lg:p-6">
        <div className="grid lg:grid-cols-[220px_1fr_260px] gap-4 h-full">
          {/* Outline */}
          <Card className="p-3 overflow-auto max-h-[calc(100vh-160px)]">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <div className="text-[12px] uppercase tracking-wider ink-muted font-medium">Outline</div>
              <Pill tone="soft">{slideList.length}</Pill>
            </div>
            <div className="space-y-0.5">
              {slideList.map((s, i) => (
                <button key={s.key} onClick={() => setActiveSlide(i)}
                  className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all group"
                  style={i===activeSlide ? { background:'var(--surface)' } : {}}>
                  <span className="text-[11px] ink-muted w-4 flex-shrink-0">⋮⋮</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={i===activeSlide?{color:liveAccent}:{}}>{s.val?.headline || s.label}</div>
                    <div className="text-[11px] ink-muted truncate">{s.label}</div>
                  </div>
                  <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100">
                    <button className="w-5 h-5 flex items-center justify-center text-[10px] ink-muted" onClick={e=>{e.stopPropagation();setActiveSlide(Math.max(0,i-1))}}>↑</button>
                    <button className="w-5 h-5 flex items-center justify-center text-[10px] ink-muted" onClick={e=>{e.stopPropagation();setActiveSlide(Math.min(slideList.length-1,i+1))}}>↓</button>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Center */}
          <div className="space-y-4">
            {/* Slide grid */}
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {slideList.slice(0,6).map((s, i) => (
                  <button key={s.key} onClick={() => setActiveSlide(i)}
                    className="rounded-xl overflow-hidden hairline text-left transition-all"
                    style={i===activeSlide ? { boxShadow:`0 0 0 2px ${liveAccent}` } : {}}>
                    <div className="aspect-video p-3 relative overflow-hidden" style={{ background: i===activeSlide ? liveAccent+'11' : 'var(--surface)' }}>
                      <Pill tone={i===activeSlide?'accent':'soft'}>{s.label}</Pill>
                      <div className="mt-1.5 text-[12px] font-semibold leading-tight truncate">{s.val?.headline || s.label}</div>
                      {s.val?.lede && <div className="text-[10px] ink-muted mt-0.5 line-clamp-2 leading-snug">{s.val.lede}</div>}
                    </div>
                    <div className="px-3 py-1.5 flex items-center justify-between" style={{ background:'var(--surface)' }}>
                      <span className="text-[10px] ink-muted">S{i+1}</span>
                      <Pill tone="good">Ready</Pill>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Live preview */}
            <Card className="p-0 overflow-hidden">
              <div className="aspect-video p-8 relative" style={{ background:`linear-gradient(135deg,${liveAccent}22,var(--paper))` }}>
                <Pill tone="accent">{cur?.label}</Pill>
                <div className="mt-4 text-[28px] sm:text-[36px] font-semibold tracking-tight leading-tight">{cur?.val?.headline || cur?.label}</div>
                {cur?.val?.lede && <div className="mt-3 text-[15px] ink-muted leading-relaxed max-w-lg">{cur?.val?.lede}</div>}
                {cur?.val?.bullets?.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {cur.val.bullets.slice(0,3).map((b: string, j: number) => (
                      <li key={j} className="text-[13px] flex gap-2">
                        <span style={{ color: liveAccent }}>·</span>{b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          {/* Inspector */}
          <Card className="p-5 space-y-4 overflow-auto max-h-[calc(100vh-160px)]">
            <div className="font-semibold tracking-tight">Inspector</div>
            {cur && (<>
              <div>
                <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Title</label>
                <input defaultValue={cur.val?.headline || cur.label}
                  className="w-full h-9 px-3 rounded-xl text-[13px] hairline" />
              </div>
              <div>
                <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Body</label>
                <textarea defaultValue={cur.val?.lede || ''} rows={3}
                  className="w-full px-3 py-2 rounded-xl text-[13px] hairline resize-none" />
              </div>
              <div>
                <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Speaker notes</label>
                <textarea rows={3} className="w-full px-3 py-2 rounded-xl text-[13px] hairline resize-none"
                  placeholder="Notes for when you present this slide…" />
              </div>
              <div>
                <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Framework</label>
                <select className="w-full h-9 px-3 rounded-xl text-[13px] hairline">
                  <option>None selected</option>
                  {FRAMEWORKS.map(f => <option key={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Status</label>
                <select className="w-full h-9 px-3 rounded-xl text-[13px] hairline">
                  <option>Ready</option>
                  <option>Drafting</option>
                  <option>Outline</option>
                </select>
              </div>
            </>)}
          </Card>
        </div>
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
        { name:'Trust teal',    usage:'Used by 28% in your industry' },
        { name:'Corporate blue',usage:'Used by 22% in your industry', generic: true },
        { name:'Founder ink',   usage:'Used by 19% in your industry' },
        { name:'Warm clay',     usage:'Used by 14% in your industry' },
      ],
      moods: [
        { name:'Calm conviction',  usage:'Used by 31% in your industry' },
        { name:'Bold and loud',    usage:'Used by 24% in your industry', generic: true },
        { name:'Glassy startup',   usage:'Used by 18% in your industry' },
        { name:'Editorial dark',   usage:'Used by 12% in your industry' },
        { name:'Warm founder',     usage:'Used by 9% in your industry' },
      ],
    }
    const items = (antiGeneric ? content[styleTab].filter(x => !x.generic) : content[styleTab])
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
              <div className="h-16 relative overflow-hidden"
                style={{ background:`linear-gradient(135deg,${liveAccent}33,${liveAccent}11)` }}>
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage:'linear-gradient(to right,rgba(15,17,21,.08) 1px,transparent 1px),linear-gradient(to bottom,rgba(15,17,21,.08) 1px,transparent 1px)', backgroundSize:'12px 12px' }}/>
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
  const ScreenFrameworks = () => (
    <div className="p-6 lg:p-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FRAMEWORKS.map(f => (
          <Card key={f.id} className="p-5 flex flex-col"
            style={activeFramework===f.id ? { boxShadow:`0 0 0 2px ${liveAccent}` } : {}}>
            <div className="font-semibold tracking-tight text-[15px]">{f.name}</div>
            <div className="text-[13px] ink-muted mt-1 mb-3">{f.summary}</div>
            <ol className="space-y-1.5 mb-3">
              {f.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px]">
                  <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] flex-shrink-0 font-semibold"
                    style={{ background: liveAccent }}>{i+1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="text-[12px] ink-muted mb-4 mt-auto">
              <span className="font-medium">When to use:</span> {f.when}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setActiveFramework(activeFramework===f.id ? null : f.id)}
                className="flex-1 h-8 rounded-xl text-[12px] font-medium text-white transition-all"
                style={{ background: activeFramework===f.id ? '#137a4a' : liveAccent }}>
                {activeFramework===f.id ? '✓ Applied' : 'Apply to deck'}
              </button>
              <button className="h-8 px-3 rounded-xl text-[12px] hairline ink-muted">Preview restructure</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  /* ── VC LENS ─────────────────────────────────────────────────── */
  const ScreenVCLens = () => (
    <div className="p-6 lg:p-8">
      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        {/* Left: archetypes */}
        <Card className="p-4">
          <div className="text-[12px] uppercase tracking-wider ink-muted mb-3 px-2">Investor archetypes</div>
          <div className="space-y-1">
            {AUDIENCES.map(a => {
              const p = PERSONAS[a]
              return (
                <button key={a} onClick={() => setVcPersona(a)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start justify-between gap-2"
                  style={vcPersona===a ? { background:'var(--surface)' } : {}}>
                  <div>
                    <div className="text-[13px] font-medium" style={vcPersona===a?{color:liveAccent}:{}}>{p.label}</div>
                    <div className="text-[11px] ink-muted mt-0.5">{p.fund}</div>
                  </div>
                  {vcPersona===a && <Pill tone="soft">Selected</Pill>}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Right */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="font-semibold tracking-tight">{PERSONAS[vcPersona]?.label}</div>
                <div className="text-[13px] ink-muted mt-0.5">{PERSONAS[vcPersona]?.fund} — {PERSONAS[vcPersona]?.focus}</div>
              </div>
              <RunBtn onClick={runVCLens} loading={vcLoading} label="Apply lens to deck" done={!!vcData} />
            </div>
            {!vcData && !vcLoading && (
              <div className="text-[13px] ink-muted">Run the lens to see how a {vcPersona} would react to this pitch.</div>
            )}
          </Card>

          {vcData && (<>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider ink-muted mb-1">{vcPersona} verdict</div>
                  <div className="font-semibold text-[15px] leading-snug">{vcData.verdict}</div>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div className="text-[32px] font-semibold tracking-tight" style={{ color: liveAccent }}>{vcData.score}</div>
                  <div className="text-[11px] ink-muted">/ 100</div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-3">Likely questions</div>
              <ol className="space-y-2">
                {vcData.questions?.map((q: string, i: number) => (
                  <li key={i} className="flex gap-3 p-2 rounded-xl" style={{ background:'var(--surface)' }}>
                    <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] flex-shrink-0 font-semibold"
                      style={{ background: liveAccent }}>{i+1}</span>
                    <span className="text-[13px]">{q}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-5">
                <div className="text-[12px] uppercase tracking-wider ink-muted mb-3">Strengths</div>
                <ul className="space-y-2">
                  {vcData.strengths?.map((s: string, i: number) => (
                    <li key={i} className="text-[13px] flex gap-2"><ic.check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color:'#137a4a' }}/>{s}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5">
                <div className="text-[12px] uppercase tracking-wider ink-muted mb-3">Concerns</div>
                <ul className="space-y-2">
                  {vcData.concerns?.map((c: string, i: number) => (
                    <li key={i} className="text-[13px] flex gap-2"><span className="flex-shrink-0 mt-0.5" style={{ color:'#b0322b' }}>·</span>{c}</li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card className="p-5">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-3">Lens tips</div>
              <ul className="space-y-2">
                {vcData.tips?.map((t: string, i: number) => (
                  <li key={i} className="text-[13px] flex gap-2"><ic.check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: liveAccent }}/>{t}</li>
                ))}
              </ul>
            </Card>
          </>)}
          {error && <div className="sd-error">{error}</div>}
        </div>
      </div>
    </div>
  )

  /* ── AUDIT ───────────────────────────────────────────────────── */
  const ScreenAudit = () => (
    <div className="p-6 lg:p-8 space-y-5">
      {!auditData && (
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold tracking-tight">Deck audit</div>
              <div className="text-[13px] ink-muted mt-1">Scores clarity, momentum, evidence, and conviction. Most decks score 40–70.</div>
            </div>
            <RunBtn onClick={runAudit} loading={auditLoading} label="Run audit" done={false} />
          </div>
        </Card>
      )}

      {auditData && (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard label="Clarity"    value={auditData.scores?.clarity    ?? 0} />
          <ScoreCard label="Momentum"   value={auditData.scores?.momentum   ?? 0} />
          <ScoreCard label="Evidence"   value={auditData.scores?.evidence   ?? 0} />
          <ScoreCard label="Conviction" value={auditData.scores?.conviction ?? 0} />
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-semibold tracking-tight">Overall</div>
              <div className="text-[13px] ink-muted">Composite score</div>
            </div>
            <div className="text-[40px] font-semibold tracking-tight" style={{ color: liveAccent }}>{auditData.overall}</div>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background:'var(--surface)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width:`${auditData.overall}%`, background: liveAccent }} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold tracking-tight">VC tips</div>
            <RunBtn onClick={runAudit} loading={auditLoading} label="Re-run audit" done={false} secondary />
          </div>
          <div className="space-y-3">
            {auditData.tips?.map((tip: any, i: number) => (
              <div key={i} className="p-4 rounded-xl hairline flex items-start gap-3">
                <Pill tone={tip.severity==='good'?'good':tip.severity==='risk'?'risk':'warn'}>{tip.severity}</Pill>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[14px]">{tip.title}</div>
                  <div className="text-[13px] ink-muted mt-0.5 leading-relaxed">{tip.body}</div>
                  {tip.slide && (
                    <button onClick={() => { setActive('deck') }}
                      className="text-[12px] font-medium mt-1.5" style={{ color: liveAccent }}>
                      Apply to {SLIDE_LABELS[tip.slide] || tip.slide} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </>)}
      {error && <div className="sd-error">{error}</div>}
    </div>
  )

  /* ── CLAIMS ──────────────────────────────────────────────────── */
  const ScreenClaims = () => {
    const allClaims = claimsData?.claims || []
    const filterMap: Record<string, string> = { 'Supported':'supported', 'Needs source':'needs-source', 'Risky':'risky', 'Founder thesis':'founder-thesis' }
    const visible = claimsFilter==='All' ? allClaims : allClaims.filter((c:any) => c.classification===filterMap[claimsFilter])
    return (
      <div className="p-6 lg:p-8 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {['All','Supported','Needs source','Risky','Founder thesis'].map(f => (
            <button key={f} onClick={() => setClaimsFilter(f)}
              className="h-8 px-3.5 rounded-full text-[13px] font-medium hairline transition-all"
              style={claimsFilter===f ? { background: liveAccent, color:'#fff', border:'none' } : {}}>
              {f}
            </button>
          ))}
          <div className="ml-auto">
            <RunBtn onClick={runClaims} loading={claimsLoading} label="Classify claims" done={!!claimsData} />
          </div>
        </div>

        {!claimsData && !claimsLoading && (
          <Card className="p-10 text-center">
            <ic.bolt className="w-8 h-8 ink-muted mx-auto mb-3"/>
            <div className="font-semibold tracking-tight">No claims classified yet</div>
            <div className="text-[13px] ink-muted mt-1">Run the classifier to see every assertion in your deck.</div>
          </Card>
        )}

        {claimsData && (
          <Card className="p-2">
            {visible.length === 0 && (
              <div className="p-8 text-center text-[13px] ink-muted">No claims in this category.</div>
            )}
            {visible.map((c: any, i: number) => {
              const cs = CLAIM_STYLES[c.classification] || CLAIM_STYLES['needs-source']
              return (
                <div key={i} className="flex items-start gap-4 p-4 border-b border-[var(--line)] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] leading-snug">{c.text}</div>
                    <div className="text-[12px] ink-muted mt-1">
                      {SLIDE_LABELS[c.slide] || c.slide} · confidence {Math.round((c.confidence||0)*100)}%
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                    style={{ background: cs.bg, color: cs.color }}>{cs.label}</span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button className="h-7 px-2.5 rounded-lg text-[12px] hairline">Attach source</button>
                    <button className="h-7 px-2.5 rounded-lg text-[12px] ink-muted">Soften</button>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
        {error && <div className="sd-error">{error}</div>}
      </div>
    )
  }

  /* ── SIGNALS ─────────────────────────────────────────────────── */
  const ScreenSignals = () => {
    const perSlide = slideList.slice(0,10).map((s, i) => ({
      label:`S${i+1}`, pct: [92,78,96,43,61,55,88,71,39,82][i] ?? 60
    }))
    const viewers = [
      { id:'a16z-•-9f', last:'2h ago', returns:3 },
      { id:'seq-•-4a',  last:'yesterday', returns:2 },
      { id:'nea-•-7c',  last:'3d ago', returns:1 },
    ]
    return (
      <div className="p-6 lg:p-8 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Returning viewers', value:'3',    sub:'Last 7 days'    },
            { label:'Demo time',         value:'2:04', sub:'Median'         },
            { label:'Avg drop-off',       value:'38%',  sub:'Across slides'  },
            { label:'Hook engagement',   value:'92%',  sub:'Slide 1'        },
          ].map((m, i) => (
            <Card key={i} className="p-5">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-1">{m.label}</div>
              <div className="text-[28px] font-semibold tracking-tight">{m.value}</div>
              <div className="text-[12px] ink-muted mt-0.5">{m.sub}</div>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="font-semibold tracking-tight mb-4">Per-slide engagement</div>
            <div className="space-y-2.5">
              {perSlide.map(ps => (
                <div key={ps.label} className="flex items-center gap-3">
                  <div className="text-[12px] ink-muted w-6 flex-shrink-0 font-mono">{ps.label}</div>
                  <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background:'var(--surface)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width:`${ps.pct}%`, background:`linear-gradient(90deg,${liveAccent},${liveAccent}99)` }} />
                  </div>
                  <div className="text-[12px] ink-muted w-8 text-right font-mono">{ps.pct}%</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold tracking-tight mb-4">Returning viewers</div>
            <div className="divide-y divide-[var(--line)]">
              {viewers.map(v => (
                <div key={v.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-medium font-mono">{v.id}</div>
                    <div className="text-[12px] ink-muted">Last seen {v.last}</div>
                  </div>
                  <Pill tone="soft">{v.returns}× returns</Pill>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="font-semibold tracking-tight mb-4">Drop-off by slide</div>
          <div className="flex items-end gap-1.5 h-32">
            {perSlide.map((ps, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md transition-all duration-500"
                  style={{ height:`${ps.pct * 0.9}%`, background: liveAccent, opacity:.85 }} />
                <div className="text-[10px] ink-muted">{ps.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="text-center p-6 text-[13px] ink-muted">
          <ic.signal className="w-5 h-5 mx-auto mb-2 opacity-40"/>
          Deploy your deck to start collecting real engagement signals.
          <button onClick={() => setActive('deploy')} className="ml-2 font-medium" style={{ color: liveAccent }}>Deploy →</button>
        </div>
      </div>
    )
  }

  /* ── DEMO LAYER ──────────────────────────────────────────────── */
  const ScreenDemo = () => (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        {([
          { id:'embed',   title:'App embed',    desc:'Embed a live demo inside your deck.' },
          { id:'video',   title:'Autoplay video', desc:'Auto-play an MP4 at the right moment.' },
          { id:'speaker', title:'Speaker-led',   desc:'Beat-by-beat script for a live walkthrough.' },
        ] as const).map(m => (
          <Card key={m.id} className="p-5 cursor-pointer transition-all"
            style={demoMode===m.id ? { boxShadow:`0 0 0 2px ${liveAccent}` } : {}}
            onClick={() => setDemoMode(m.id)}>
            <div className="font-semibold tracking-tight mb-1">{m.title}</div>
            <div className="text-[13px] ink-muted">{m.desc}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        {demoMode === 'embed' && (
          <div className="space-y-4">
            <div>
              <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">App URL</label>
              <input value={demoUrl} onChange={e => setDemoUrl(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-[13px] hairline"
                placeholder="https://app.yourproduct.com/demo" />
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
              <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Video URL (MP4)</label>
              <input value={demoUrl} onChange={e => setDemoUrl(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-[13px] hairline"
                placeholder="https://cdn.yourproduct.com/demo.mp4" />
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
              <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Beats (one per line)</label>
              <textarea rows={5} className="w-full px-3 py-2 rounded-xl text-[13px] hairline resize-none"
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
    const cur  = slideList[presentSlide]
    const next = slideList[presentSlide + 1]
    const qaPrep = [
      "What's your CAC and how does it scale?",
      'Who else are you talking to right now?',
      "Why won't a larger player copy this?",
      'What does the next 18 months look like?',
    ]
    return (
      <div className="p-4 lg:p-6">
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main slide */}
          <div className="lg:col-span-2 space-y-3">
            <Card className="p-0 overflow-hidden">
              <div className="aspect-video p-8 flex flex-col justify-end relative"
                style={{ background:`linear-gradient(135deg,${liveAccent}22,var(--paper) 70%)` }}>
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{ backgroundImage:'linear-gradient(to right,rgba(15,17,21,.06) 1px,transparent 1px),linear-gradient(to bottom,rgba(15,17,21,.06) 1px,transparent 1px)', backgroundSize:'20px 20px' }}/>
                <Pill tone="accent">{cur?.label}</Pill>
                <div className="mt-3 text-[32px] sm:text-[44px] font-semibold tracking-tight leading-tight">
                  {cur?.val?.headline || cur?.label || company}
                </div>
                {cur?.val?.lede && <div className="mt-3 text-[15px] ink-muted max-w-lg">{cur.val.lede}</div>}
              </div>
              <div className="p-3 flex items-center justify-between border-t border-[var(--line)]">
                <div className="flex gap-2">
                  <button onClick={() => setPresentSlide(s => Math.max(0, s-1))}
                    className="h-8 px-3 rounded-xl text-[13px] hairline inline-flex items-center gap-1">
                    <ic.chevL className="w-4 h-4"/> Prev
                  </button>
                  <button onClick={() => setPresentSlide(s => Math.min(slideList.length-1, s+1))}
                    className="h-8 px-3 rounded-xl text-[13px] text-white inline-flex items-center gap-1"
                    style={{ background: liveAccent }}>
                    Next <ic.chevR className="w-4 h-4"/>
                  </button>
                </div>
                <div className="text-[14px] font-mono ink-muted">{fmtTimer(timerSeconds)}</div>
                <div className="flex gap-2">
                  <button onClick={() => setTimerRunning(!timerRunning)}
                    className="h-8 px-3 rounded-xl text-[13px] hairline">
                    {timerRunning ? 'Pause' : 'Start timer'}
                  </button>
                  <button onClick={() => { setTimerSeconds(0); setTimerRunning(false) }}
                    className="h-8 px-3 rounded-xl text-[13px] ink-muted">
                    Reset
                  </button>
                </div>
              </div>
            </Card>

            {/* Thumbnail strip */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {slideList.map((s, i) => (
                <button key={s.key} onClick={() => setPresentSlide(i)}
                  className="h-8 px-3 rounded-xl text-[12px] font-mono flex-shrink-0 transition-all"
                  style={i===presentSlide ? { background: liveAccent, color:'#fff' } : { background:'var(--surface)', color:'var(--ink-muted)' }}>
                  S{i+1}
                </button>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <Card className="p-5">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Speaker notes</div>
              <div className="text-[13px] leading-relaxed">
                {cur?.val?.notes || `Walk through ${cur?.val?.headline || 'this slide'} with confidence. Pause after the key stat.`}
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Up next</div>
              {next ? (<>
                <Pill tone="soft">{next.label}</Pill>
                <div className="font-semibold text-[15px] mt-2">{next.val?.headline || next.label}</div>
                {next.val?.lede && <div className="text-[13px] ink-muted mt-1">{next.val.lede}</div>}
              </>) : (
                <div className="text-[13px] ink-muted">Last slide.</div>
              )}
            </Card>
            <Card className="p-5">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-3">Q&amp;A prep</div>
              <ul className="space-y-2">
                {qaPrep.map((q, i) => (
                  <li key={i} className="text-[13px] flex gap-2">
                    <span className="ink-muted flex-shrink-0">·</span>{q}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  /* ── DEPLOY ──────────────────────────────────────────────────── */
  const ScreenDeploy = () => (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name:'Vercel',       desc:'One-click deploy, share link in 30s.',     action: () => setActive('deploy') },
          { name:'Netlify',      desc:'Drag & drop or git-connected deploy.',      action: () => {} },
          { name:'Cloudflare',   desc:'Edge CDN, global fast, free tier.',         action: () => {} },
          { name:'HTML Export',  desc:'Download a self-contained HTML bundle.',    action: download },
        ].map((t, i) => (
          <Card key={i} className="p-5 flex flex-col">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white text-[15px] font-bold"
              style={{ background: liveAccent }}>
              <ic.rocket className="w-5 h-5"/>
            </div>
            <div className="font-semibold tracking-tight text-[14px] mb-1">{t.name}</div>
            <div className="text-[12px] ink-muted mb-4 flex-1">{t.desc}</div>
            <button onClick={t.action}
              className="h-8 px-3 rounded-xl text-[12px] font-medium text-white self-start"
              style={{ background: liveAccent }}>
              Deploy
            </button>
          </Card>
        ))}
      </div>

      {/* Vercel token input */}
      <Card className="p-6">
        <div className="font-semibold tracking-tight mb-1">Deploy to Vercel</div>
        <div className="text-[13px] ink-muted mb-4">Paste your Vercel token and your deck goes live in seconds.</div>
        <div className="flex gap-2">
          <input value={vercelToken} onChange={e => setVercelToken(e.target.value)}
            className="flex-1 h-9 px-3 rounded-xl text-[13px] hairline font-mono"
            placeholder="vcel_…" type="password" />
          <button onClick={deployToVercel} disabled={!vercelToken || deployLoading}
            className="h-9 px-4 rounded-xl text-[13px] font-medium text-white disabled:opacity-40"
            style={{ background: liveAccent }}>
            {deployLoading ? <><span className="sd-spinner">◐</span> Deploying…</> : 'Deploy'}
          </button>
        </div>
        {deployUrl && (
          <div className="mt-4 p-3 rounded-xl flex items-center gap-3" style={{ background:'#e8f4ee', border:'1px solid #b7ddc7' }}>
            <ic.external className="w-4 h-4 flex-shrink-0" style={{ color:'#137a4a' }}/>
            <a href={`https://${deployUrl}`} target="_blank" rel="noreferrer"
              className="text-[13px] font-medium truncate" style={{ color:'#137a4a' }}>
              {deployUrl}
            </a>
          </div>
        )}
      </Card>

      {/* Deploy history */}
      <Card className="p-6">
        <div className="font-semibold tracking-tight mb-4">Deploy history</div>
        {deployHistory.length === 0 && !deployUrl ? (
          <div className="text-[13px] ink-muted">No deployments yet.</div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {(deployUrl ? [{ target:'Vercel', url: deployUrl, time:'just now', status:'Live' }, ...deployHistory] : deployHistory).map((d, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-medium">{d.target}</div>
                  <div className="text-[12px] ink-muted">{d.url} · {d.time}</div>
                </div>
                <Pill tone="good">{d.status}</Pill>
              </div>
            ))}
          </div>
        )}
      </Card>
      {error && <div className="sd-error">{error}</div>}
    </div>
  )

  /* ── FOLLOW-UP ───────────────────────────────────────────────── */
  const ScreenFollowup = () => (
    <div className="p-6 lg:p-8">
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Compose */}
        <Card className="p-6 space-y-4">
          <div className="font-semibold tracking-tight">Compose follow-up</div>
          <div>
            <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Investor persona</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {AUDIENCES.map(a => (
                <button key={a} onClick={() => setFuAudience(a)}
                  className="h-8 px-3 rounded-full text-[13px] hairline transition-all"
                  style={fuAudience===a ? { background: liveAccent, color:'#fff', border:'none' } : {}}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">To</label>
            <input value={fuTo} onChange={e => setFuTo(e.target.value)}
              className="w-full h-9 px-3 rounded-xl text-[13px] hairline"
              placeholder="partner@a16z.com" />
          </div>
          {fuData && (<>
            <div>
              <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Subject</label>
              <input defaultValue={fuData.subject}
                className="w-full h-9 px-3 rounded-xl text-[13px] hairline" />
            </div>
            <div>
              <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Message</label>
              <textarea defaultValue={fuData.body} rows={8}
                className="w-full px-3 py-2 rounded-xl text-[13px] hairline resize-none leading-relaxed" />
            </div>
            <div className="flex flex-wrap gap-2">
              {['deck.pdf', 'one-pager.pdf'].map(f => (
                <span key={f} className="text-[12px] px-2.5 py-1 rounded-full" style={{ background:'var(--surface)' }}>{f}</span>
              ))}
            </div>
          </>)}
          <div className="flex gap-2 pt-2">
            <RunBtn onClick={runFollowup} loading={fuLoading} label="✦ Generate email" done={!!fuData} />
            {fuData && (
              <button className="h-9 px-3 rounded-xl text-[13px] hairline ink-muted">Save draft</button>
            )}
          </div>
        </Card>

        {/* Voice-match preview */}
        <Card className="p-6" style={{ background:`linear-gradient(135deg,${liveAccent}08,var(--paper))` }}>
          <div className="font-semibold tracking-tight mb-1">Voice-match preview</div>
          <div className="text-[13px] ink-muted mb-4">Tone tuned to your voice sample and founder story.</div>
          {fuData ? (
            <div className="paper hairline rounded-xl p-4 space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider ink-muted mb-1">Subject</div>
                <div className="font-semibold text-[14px]">{fuData.subject}</div>
              </div>
              <div className="border-t border-[var(--line)] pt-3">
                <div className="text-[13px] leading-relaxed whitespace-pre-line">{fuData.body}</div>
              </div>
            </div>
          ) : (
            <div className="paper hairline rounded-xl p-6 text-center">
              <ic.send className="w-6 h-6 mx-auto mb-2 opacity-30"/>
              <div className="text-[13px] ink-muted">Generate an email to see the preview here.</div>
            </div>
          )}
          {fuData && (
            <button onClick={async () => {
              await navigator.clipboard.writeText(`Subject: ${fuData.subject}\n\n${fuData.body}`)
              setFuCopied(true); setTimeout(() => setFuCopied(false), 2000)
            }} className="mt-4 h-9 px-4 rounded-xl text-[13px] hairline inline-flex items-center gap-1.5 w-full justify-center">
              <ic.copy className="w-3.5 h-3.5"/>{fuCopied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          )}
        </Card>
      </div>
      {error && <div className="sd-error mt-4">{error}</div>}
    </div>
  )

  /* ── SETTINGS ────────────────────────────────────────────────── */
  const ScreenSettings = () => {
    const tints = [liveAccent, liveAccent+'cc', liveAccent+'99', liveAccent+'55', '#0F1115', '#6366f1', '#137a4a', '#b0322b']
    return (
      <div className="p-6 lg:p-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Profile */}
          <Card className="p-6 space-y-4">
            <div className="font-semibold tracking-tight">Profile</div>
            <div>
              <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Founder name</label>
              <input value={settingsName} onChange={e => setSettingsName(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-[13px] hairline" />
            </div>
            <div>
              <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Company</label>
              <input value={settingsCompany} onChange={e => setSettingsCompany(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-[13px] hairline" />
            </div>
            <div>
              <label className="text-[12px] uppercase tracking-wider ink-muted mb-1.5 block">Industry</label>
              <select value={settingsIndustry} onChange={e => setSettingsIndustry(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-[13px] hairline">
                {['Fintech','Climate','Health','AI','SaaS','Enterprise','Developer Tools','Consumer','Education','Other'].map(i=>(
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            <button className="h-9 px-4 rounded-xl text-[13px] font-medium text-white w-full"
              style={{ background: liveAccent }}>Save profile</button>
          </Card>

          {/* Brand override */}
          <Card className="p-6 space-y-4">
            <div className="font-semibold tracking-tight">Brand override</div>
            {websiteUrl && <div className="text-[13px] ink-muted">Currently using colours from {websiteUrl.replace(/^https?:\/\//,'')}.</div>}
            <div>
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Colour palette</div>
              <div className="flex flex-wrap gap-2">
                {tints.map((t, i) => (
                  <button key={i} onClick={() => { setLiveAccent(t); setManualHex(t) }}
                    className="w-10 h-10 rounded-lg hairline shadow-card hover:ring-2 ring-offset-1 transition-all"
                    style={{ background: t }} />
                ))}
              </div>
            </div>
            <button onClick={() => { setLiveAccent(accentColor); setManualHex(accentColor) }}
              className="h-8 px-3 rounded-xl text-[12px] hairline ink-muted inline-flex items-center gap-1.5">
              <ic.spark className="w-3 h-3"/> Reset to detected
            </button>
          </Card>

          {/* Exports + Danger */}
          <Card className="p-6 space-y-5">
            <div>
              <div className="font-semibold tracking-tight mb-3">Exports</div>
              <div className="space-y-2">
                {[
                  { label:'Deck PDF',       action: download },
                  { label:'HTML bundle',    action: download },
                  { label:'Speaker notes',  action: () => {} },
                ].map((x, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-[13px]">{x.label}</span>
                    <button onClick={x.action}
                      className="h-7 px-3 rounded-xl text-[12px] hairline inline-flex items-center gap-1">
                      <ic.download className="w-3 h-3"/> Export
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--line)]">
              <div className="text-[13px] font-semibold mb-3" style={{ color:'#b0322b' }}>Danger zone</div>
              <div className="space-y-2">
                {[
                  { label:'Reset workspace', action: onRestart },
                  { label:'Delete account',  action: () => {} },
                ].map((x, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-[13px]">{x.label}</span>
                    <button onClick={x.action}
                      className="h-7 px-3 rounded-xl text-[12px] hairline"
                      style={{ color:'#b0322b' }}>
                      {x.label.includes('Reset') ? 'Reset' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
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

  /* ── Sidebar ─────────────────────────────────────────────────── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-4 border-b border-[var(--line)] flex items-center gap-3">
        {logoUrl
          ? <img src={logoUrl} alt="Logo" className="h-7 max-w-[100px] object-contain rounded"/>
          : <div className="w-7 h-7 rounded-lg flex-shrink-0" style={{ background: liveAccent }}/>
        }
        {company && <span className="font-semibold tracking-tight text-[14px] truncate">{company}</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV.map(group => (
          <div key={group.group}>
            <div className="px-3 mb-1 text-[10px] uppercase tracking-widest ink-muted font-medium">{group.group}</div>
            {group.items.map(item => {
              const Ico = ic[item.icon as keyof typeof ic]
              const isActive = active === item.id
              return (
                <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false) }}
                  className="w-full text-left h-9 px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium transition-all"
                  style={isActive ? { background: liveAccent, color:'#fff' } : { color:'var(--ink)' }}>
                  {Ico && <Ico className="w-4 h-4 flex-shrink-0"/>}
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-[var(--line)]">
        <button onClick={onRestart} className="w-full h-8 rounded-xl text-[12px] hairline ink-muted">
          ← New deck
        </button>
      </div>
    </div>
  )

  /* ── Shell ───────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden" style={{ background:'var(--bg)', color:'var(--ink)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] flex-shrink-0 border-r border-[var(--line)] bg-[var(--paper)]">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}/>
          <aside className="relative w-[240px] h-full bg-[var(--paper)] flex flex-col shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 px-5 h-14 border-b border-[var(--line)] bg-[var(--paper)] flex-shrink-0">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <ic.menu className="w-5 h-5 ink-muted"/>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[15px] font-semibold truncate">{t1}</span>
            <span className="hidden sm:inline text-[13px] ink-muted">— {t2}</span>
          </div>
          <div className="flex-1"/>
          <div className="hidden md:flex items-center gap-3">
            {slideList.length > 0 && (
              <Pill tone="soft">{slideList.length} slides ready</Pill>
            )}
            <button onClick={() => setActive('theme')}
              className="h-8 px-3 rounded-full hairline flex items-center gap-2 text-[13px]">
              <div className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ background:`linear-gradient(135deg,${liveAccent},${liveAccent}88)` }}/>
              Theme
            </button>
          </div>
          <button onClick={() => setActive('present')}
            className="h-8 px-3.5 rounded-xl text-[13px] font-medium text-white inline-flex items-center gap-1.5"
            style={{ background: liveAccent }}>
            <ic.play className="w-3.5 h-3.5"/> Present
          </button>
          <div className="w-9 h-9 rounded-full surface hairline flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
            style={{ background:'var(--surface)' }}>
            {(settingsName || founderName || 'YO').slice(0,2).toUpperCase()}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Screen />
        </main>
      </div>
    </div>
  )
}
