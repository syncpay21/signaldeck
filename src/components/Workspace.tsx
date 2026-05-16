import { useState } from 'react'

const ic = {
  layers:  (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>,
  doc:     (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6"/></svg>,
  palette: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2-.6-1.4.4-2.5 1.7-2.5H17a4 4 0 004-4 9 9 0 00-9-9z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="9.5" cy="6.5" r="1"/><circle cx="14" cy="6" r="1"/><circle cx="17" cy="10" r="1"/></svg>,
  cards:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/></svg>,
  star:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"/></svg>,
  list:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
  eye:     (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>,
  check:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12l5 5L20 6"/></svg>,
  bolt:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>,
  signal:  (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 20V14M9 20V10M14 20V6M19 20V2"/></svg>,
  play:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7V5z"/></svg>,
  spark:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4"/></svg>,
  rocket:  (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 14c0-5 4-11 9-11 5 0 5 6 0 11-3 3-6 4-9 0z"/><path d="M5 14c-2 1-3 3-3 6 3 0 5-1 6-3"/><circle cx="14" cy="8" r="1.5"/></svg>,
  send:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 11l18-7-7 18-3-8-8-3z"/></svg>,
  cog:     (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.4.8a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.8-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.8c.6.5 1.3.9 2 1.2L10 21h4l.5-2.5c.7-.3 1.4-.7 2-1.2l2.4.8 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>,
  menu:    (p: any) => <svg {...p} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/></svg>,
  download:(p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 4v12M6 14l6 6 6-6M4 20h16"/></svg>,
  external:(p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M18 13v6H6V7h6M15 3h6v6M10 14L21 3"/></svg>,
  copy:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  globe:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>,
}

const NAV = [
  { group: 'Build', items: [
    { id: 'overview',   label: 'Overview',      icon: 'layers'  },
    { id: 'sources',    label: 'Sources',        icon: 'doc'     },
    { id: 'theme',      label: 'Theme',          icon: 'palette' },
    { id: 'deck',       label: 'Deck Build',     icon: 'cards'   },
    { id: 'style',      label: 'Style Library',  icon: 'star'    },
    { id: 'frameworks', label: 'Frameworks',     icon: 'list'    },
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
  theme:      ['Theme',          'Brand and visual system'],
  deck:       ['Deck Build',     'Slides and content'],
  style:      ['Style Library',  'Transitions, layouts, moods'],
  frameworks: ['Frameworks',     'Pick a narrative spine'],
  vclens:     ['VC Lens',        'Pitch through the investor\'s eyes'],
  audit:      ['Audit',          'Story scoring and tips'],
  claims:     ['Claims',         'Every assertion, classified'],
  signals:    ['Signals',        'Engagement and drop-off'],
  demo:       ['Demo Layer',     'How the product appears in the deck'],
  present:    ['Present',        'Run the room'],
  deploy:     ['Deploy',         'Send the deck live'],
  followup:   ['Follow-up',      'Voice-matched email after the meeting'],
  settings:   ['Settings',       'Profile, brand, exports'],
}

const SLIDE_LABELS: Record<string, string> = {
  s1_intro: 'Intro', s2_situation: 'Situation', s3_problem: 'Problem',
  s4_implication: 'Implication', s5_fix: 'The Fix', s6_how: 'How It Works',
  s7_validation: 'Validation', s8_market: 'Market', s9_customers: 'Customers',
  s10_competition: 'Competition', s11_risks: 'Risks', s12_team_ask: 'Team & Ask',
}

const CLAIM_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  'supported':       { bg: '#e8f4ee', color: '#137a4a', label: 'Supported' },
  'needs-source':    { bg: '#fbf1dd', color: '#a86a00', label: 'Needs source' },
  'risky':           { bg: '#fbe8e5', color: '#b0322b', label: 'Risky' },
  'founder-thesis':  { bg: '#eff6ff', color: '#1d4ed8', label: 'Founder thesis' },
}

const AUDIT_COLORS: Record<string, string> = {
  good: '#137a4a', warn: '#a86a00', risk: '#b0322b',
}

const FRAMEWORKS = [
  { id: 'belief', name: 'Belief Chain', summary: 'Stack the beliefs the investor must accept, in order.', steps: ['World is changing', 'Old way breaks', 'New way wins', 'We are the new way'], when: 'Category-creation pitches.' },
  { id: 'spin',   name: 'SPIN Selling',  summary: 'Diagnose pain before pitching the cure.', steps: ['Situation', 'Problem', 'Implication', 'Need-payoff'], when: 'Enterprise / long sales cycle decks.' },
  { id: 'risk',   name: 'Risk Reversal', summary: 'Surface the obvious risk and dismantle it on the spot.', steps: ['Name the risk', 'Quantify it', 'Show our hedge', 'Show proof'], when: 'Skeptical / late-stage investors.' },
  { id: 'bab',    name: 'Before-After-Bridge', summary: 'Paint pain, paint relief, name the bridge.', steps: ['Before', 'After', 'Bridge', 'Proof'], when: 'Short / demo-led decks.' },
  { id: 'cat',    name: 'Category Creation', summary: 'Define a new game where you are already winning.', steps: ['Old category', 'New category', 'Stakes', 'Frontier metric'], when: 'Market-defining pitches.' },
  { id: 'jtbd',   name: 'Jobs To Be Done', summary: 'Frame the customer hire, not the customer profile.', steps: ['Job', 'Hire', 'Fire', 'Outcome'], when: 'Consumer / horizontal products.' },
]

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

export default function Workspace({
  company, accentColor, generatedHtml, generatedContent, onRestart,
  logoUrl, audience = 'Seed VC', websiteUrl, realStory, founderName, stage, industry,
}: WorkspaceProps) {
  const [active, setActive] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Deploy
  const [vercelToken, setVercelToken] = useState('')
  const [deployUrl, setDeployUrl] = useState('')
  const [deployLoading, setDeployLoading] = useState(false)

  // Refine
  const [isRefining, setIsRefining] = useState(false)
  const [isRefined, setIsRefined] = useState(false)
  const [refinedHtml, setRefinedHtml] = useState(generatedHtml)

  // VC Lens
  const [vcPersona, setVcPersona] = useState(audience)
  const [vcData, setVcData] = useState<any>(null)
  const [vcLoading, setVcLoading] = useState(false)

  // Audit
  const [auditData, setAuditData] = useState<any>(null)
  const [auditLoading, setAuditLoading] = useState(false)

  // Claims
  const [claimsData, setClaimsData] = useState<any>(null)
  const [claimsLoading, setClaimsLoading] = useState(false)

  // Follow-up
  const [fuAudience, setFuAudience] = useState(audience)
  const [fuData, setFuData] = useState<any>(null)
  const [fuLoading, setFuLoading] = useState(false)
  const [fuCopied, setFuCopied] = useState(false)

  const [error, setError] = useState('')

  const initials = company ? company.slice(0, 2).toUpperCase() : 'SD'
  const [t1, t2] = TITLES[active] || ['', '']

  /* ── API helpers ──────────────────────────────────────────────── */
  async function download() {
    const res = await fetch('/api/download', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: refinedHtml, filename: `${company}-deck` }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${company.toLowerCase()}-deck.html`; a.click()
    URL.revokeObjectURL(url)
  }

  async function deployToVercel() {
    setDeployLoading(true); setError('')
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: refinedHtml, projectName: `${company.toLowerCase().replace(/\s+/g, '-')}-deck`, vercelToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDeployUrl(data.url); setActive('deploy')
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
    setFuLoading(true); setError('')
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

  /* ── Shared primitives ────────────────────────────────────────── */
  const Card = ({ children, className = '' }: any) => (
    <div className={`paper hairline rounded-[18px] shadow-card ${className}`}>{children}</div>
  )

  const RunBtn = ({ onClick, loading, label, done }: any) => (
    <button onClick={onClick} disabled={loading}
      className="h-9 px-4 rounded-xl text-[13px] font-medium disabled:opacity-40 inline-flex items-center gap-2 flex-shrink-0"
      style={{ background: accentColor, color: '#fff' }}>
      {loading ? <><span className="sd-spinner">◐</span> Analysing…</> : done ? '↻ Re-run' : label}
    </button>
  )

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div>
      <div className="flex justify-between text-[13px] mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="ink-muted">{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: value >= 70 ? '#137a4a' : value >= 50 ? '#a86a00' : '#b0322b' }} />
      </div>
    </div>
  )

  const AUDIENCES = ['Seed VC', 'Series A', 'Angel', 'Strategic', 'Internal']

  /* ── Screens ──────────────────────────────────────────────────── */

  // Overview
  const ScreenOverview = () => (
    <div className="p-6 lg:p-8 space-y-5">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-1">
            <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Deck ready</div>
            <h1 className="text-[26px] font-semibold tracking-tight">{company} — 12 slides built.</h1>
            <p className="ink-muted mt-2 text-[14px]">Download the HTML or push to Vercel. Run the GPT-4o pitch coach to sharpen every word.</p>
            <div className="flex gap-2 mt-5 flex-wrap">
              <button onClick={download}
                className="h-10 px-4 rounded-xl font-medium text-[14px] text-white inline-flex items-center gap-2"
                style={{ background: accentColor }}>
                <ic.download className="w-4 h-4" /> Download HTML
              </button>
              <button onClick={() => setActive('deploy')}
                className="h-10 px-4 rounded-xl font-medium text-[14px] paper hairline ink hover:bg-[var(--surface)] inline-flex items-center gap-2">
                <ic.rocket className="w-4 h-4" /> Push to Vercel
              </button>
            </div>
          </div>
          <div className="hidden sm:block w-[180px] h-[110px] rounded-2xl hairline surface flex-shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'linear-gradient(to right,rgba(15,17,21,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(15,17,21,.05) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="absolute bottom-3 left-3">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-white" style={{ background: accentColor }}>{company}</span>
              <div className="text-[11px] ink-muted mt-1">Live deck</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Slides', value: '12', sub: 'Ready to present' },
          { label: 'Model', value: 'Claude', sub: 'Sonnet 4.6' },
          { label: 'Copy pass', value: isRefined ? '2/2' : '1/2', sub: isRefined ? 'GPT-4o refined' : 'Claude draft' },
          { label: 'Status', value: 'Ready', sub: 'Download available' },
        ].map((m, i) => (
          <Card key={i} className="p-5">
            <div className="text-[12px] ink-muted">{m.label}</div>
            <div className="text-[22px] font-semibold tracking-tight mt-1">{m.value}</div>
            <div className="text-[12px] ink-muted mt-0.5">{m.sub}</div>
          </Card>
        ))}
      </div>

      {!isRefined && (
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold tracking-tight">Run GPT-4o pitch coach</div>
              <div className="text-[13px] ink-muted mt-1">Tears apart every word. Rebuilds headlines to 2–5 words, sharpens bullets, removes buzzwords.</div>
            </div>
            {!isRefining
              ? <button onClick={refine} className="flex-shrink-0 h-9 px-4 rounded-xl text-[13px] font-medium inline-flex items-center gap-2" style={{ background: '#6366f1', color: '#fff' }}>✦ Run coach</button>
              : <div className="flex-shrink-0 flex items-center gap-2 text-[13px] text-[#6366f1]"><span className="sd-spinner">◐</span> Working…</div>
            }
          </div>
        </Card>
      )}
      {isRefined && <div className="px-4 py-3 rounded-[14px] text-[13px] flex items-center gap-2" style={{ background: '#f5f3ff', border: '1px solid #c7d2fe', color: '#6366f1' }}>✓ Pitch coach applied — copy is sharper</div>}
      {error && <div className="sd-error">{error}</div>}
    </div>
  )

  // Sources
  const ScreenSources = () => {
    const sources = [
      websiteUrl && { icon: '🌐', type: 'Website', value: websiteUrl, status: 'Active' },
      realStory  && { icon: '📝', type: 'Founder story', value: realStory.slice(0, 120) + (realStory.length > 120 ? '…' : ''), status: 'Active' },
      { icon: '🤖', type: 'Claude Sonnet 4.6', value: 'Generated 12-slide deck from your story', status: 'Done' },
      isRefined && { icon: '✦', type: 'GPT-4o pitch coach', value: 'Refined all copy — headlines, bullets, lede', status: 'Done' },
    ].filter(Boolean) as any[]

    return (
      <div className="p-6 lg:p-8 space-y-4">
        {sources.map((s: any, i: number) => (
          <Card key={i} className="p-5 flex items-start gap-4">
            <div className="text-[22px] flex-shrink-0 w-9 text-center">{s.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[14px]">{s.type}</div>
              <div className="text-[13px] ink-muted mt-0.5 truncate">{s.value}</div>
            </div>
            <span className="text-[12px] px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: '#e8f4ee', color: '#137a4a' }}>{s.status}</span>
          </Card>
        ))}
        <p className="text-[12px] ink-muted px-1">Add more sources — social profiles, old decks, screenshots, voice notes — in the next build.</p>
      </div>
    )
  }

  // Theme
  const ScreenTheme = () => {
    const tints = [accentColor, accentColor + 'cc', accentColor + '99', accentColor + '55', accentColor + '22']
    return (
      <div className="p-6 lg:p-8 space-y-5 max-w-xl">
        <Card className="p-6">
          <div className="text-[13px] ink-muted mb-3">Brand colour</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ background: accentColor }} />
            <div>
              <div className="font-semibold font-mono">{accentColor}</div>
              <div className="text-[12px] ink-muted mt-0.5">Applied across all 12 slides</div>
            </div>
          </div>
          <div className="flex gap-2">
            {tints.map((t, i) => (
              <div key={i} className="flex-1 h-8 rounded-lg" style={{ background: t }} />
            ))}
          </div>
        </Card>
        <Card className="p-6 space-y-3">
          <div className="text-[13px] ink-muted mb-1">Applied to</div>
          {['Slide backgrounds and accents', 'Stat callout values', 'Bullet markers', 'Progress bar and transitions', 'Cover slide gradient'].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-[13px]">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />
              {item}
            </div>
          ))}
        </Card>
        <Card className="p-6">
          <div className="text-[13px] ink-muted mb-1">Typography</div>
          <div className="font-semibold text-[18px] mt-2" style={{ letterSpacing: '-0.02em' }}>Inter — headings</div>
          <div className="text-[14px] ink-muted mt-1">Inter — body text</div>
        </Card>
      </div>
    )
  }

  // Deck Build
  const ScreenDeck = () => {
    const slides = generatedContent ? Object.entries(generatedContent) : []
    if (!slides.length) return (
      <div className="p-6 lg:p-8"><Card className="p-10 text-center max-w-md"><div className="text-[13px] ink-muted">No deck content yet.</div></Card></div>
    )
    return (
      <div className="p-6 lg:p-8 space-y-4">
        {slides.map(([key, slide]: [string, any], i) => (
          <Card key={key} className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-semibold text-white"
                style={{ background: accentColor }}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wider ink-muted mb-0.5">{SLIDE_LABELS[key] || key}</div>
                <div className="font-semibold text-[15px] tracking-tight">{slide.headline || slide.tag || '—'}</div>
                {slide.sub && <div className="text-[13px] ink-muted mt-1">{slide.sub}</div>}
                {slide.lede && <div className="text-[13px] ink-muted mt-1 leading-relaxed">{slide.lede}</div>}
                {slide.bullets?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {slide.bullets.map((b: string, j: number) => (
                      <li key={j} className="text-[12px] ink-muted flex gap-2">
                        <span style={{ color: accentColor }}>·</span>{b}
                      </li>
                    ))}
                  </ul>
                )}
                {slide.stats?.length > 0 && (
                  <div className="flex gap-4 mt-2">
                    {slide.stats.map((s: any, j: number) => (
                      <div key={j} className="text-[12px]">
                        <span className="font-semibold" style={{ color: accentColor }}>{s.value}</span>
                        <span className="ink-muted ml-1">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // Style Library
  const ScreenStyle = () => (
    <div className="p-6 lg:p-8 space-y-5">
      {[
        { title: 'Transitions', items: ['Zoom passage', 'Explode', 'Fold', 'Warp', 'Glitch', 'Prism'] },
        { title: 'Layouts', items: ['Centered hero', 'Split: claim + proof', 'Three-column metric', 'Quote on canvas', 'Full-bleed image', 'Grid mosaic'] },
        { title: 'Moods', items: ['Calm conviction', 'Bold and loud', 'Glassy startup', 'Editorial dark', 'Warm founder'] },
      ].map(section => (
        <Card key={section.title} className="p-6">
          <div className="font-semibold tracking-tight mb-3">{section.title}</div>
          <div className="flex flex-wrap gap-2">
            {section.items.map(item => (
              <span key={item} className="text-[13px] px-3 py-1.5 rounded-full hairline ink-muted">{item}</span>
            ))}
          </div>
        </Card>
      ))}
      <p className="text-[12px] ink-muted px-1">Per-slide layout and transition overrides coming in the next build.</p>
    </div>
  )

  // Frameworks
  const ScreenFrameworks = () => (
    <div className="p-6 lg:p-8 space-y-4">
      {FRAMEWORKS.map(f => (
        <Card key={f.id} className="p-5">
          <div className="font-semibold tracking-tight text-[15px]">{f.name}</div>
          <div className="text-[13px] ink-muted mt-1">{f.summary}</div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {f.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[12px]">
                <span className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] flex-shrink-0"
                  style={{ background: accentColor }}>{i + 1}</span>
                <span>{s}</span>
                {i < f.steps.length - 1 && <span className="ink-muted">→</span>}
              </div>
            ))}
          </div>
          <div className="text-[12px] ink-muted mt-3">Best for: {f.when}</div>
        </Card>
      ))}
    </div>
  )

  // VC Lens
  const ScreenVCLens = () => (
    <div className="p-6 lg:p-8 space-y-5 max-w-2xl">
      <Card className="p-6">
        <div className="text-[13px] ink-muted mb-3">Choose investor persona</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {AUDIENCES.map(a => (
            <button key={a} onClick={() => setVcPersona(a)}
              className="text-[13px] px-3 h-8 rounded-full hairline transition-all"
              style={vcPersona === a ? { background: accentColor, color: '#fff', border: 'none' } : {}}>
              {a}
            </button>
          ))}
        </div>
        <RunBtn onClick={runVCLens} loading={vcLoading} label="Analyse pitch" done={!!vcData} />
      </Card>

      {vcData && (<>
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-1">{vcPersona} verdict</div>
              <div className="font-semibold text-[15px] tracking-tight leading-snug">{vcData.verdict}</div>
            </div>
            <div className="flex-shrink-0 text-center">
              <div className="text-[28px] font-semibold tracking-tight" style={{ color: accentColor }}>{vcData.score}</div>
              <div className="text-[11px] ink-muted">/ 100</div>
            </div>
          </div>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="text-[12px] uppercase tracking-wider ink-muted mb-3">Questions they'd ask</div>
            <ol className="space-y-2">
              {vcData.questions?.map((q: string, i: number) => (
                <li key={i} className="text-[13px] flex gap-2">
                  <span className="font-semibold flex-shrink-0" style={{ color: accentColor }}>{i + 1}.</span>{q}
                </li>
              ))}
            </ol>
          </Card>
          <div className="space-y-4">
            <Card className="p-5">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-3">Strengths</div>
              <ul className="space-y-2">
                {vcData.strengths?.map((s: string, i: number) => (
                  <li key={i} className="text-[13px] flex gap-2"><span style={{ color: '#137a4a' }}>✓</span>{s}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-3">Concerns</div>
              <ul className="space-y-2">
                {vcData.concerns?.map((c: string, i: number) => (
                  <li key={i} className="text-[13px] flex gap-2"><span style={{ color: '#b0322b' }}>·</span>{c}</li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <Card className="p-5">
          <div className="text-[12px] uppercase tracking-wider ink-muted mb-3">Tips for next meeting</div>
          <ul className="space-y-2">
            {vcData.tips?.map((t: string, i: number) => (
              <li key={i} className="text-[13px] flex gap-2"><span style={{ color: accentColor }}>→</span>{t}</li>
            ))}
          </ul>
        </Card>
      </>)}
      {error && <div className="sd-error">{error}</div>}
    </div>
  )

  // Audit
  const ScreenAudit = () => (
    <div className="p-6 lg:p-8 space-y-5 max-w-2xl">
      <Card className="p-6">
        <div className="font-semibold tracking-tight mb-1">Deck audit</div>
        <div className="text-[13px] ink-muted mb-5">Scores clarity, momentum, evidence, and conviction across all 12 slides.</div>
        <RunBtn onClick={runAudit} loading={auditLoading} label="Run audit" done={!!auditData} />
      </Card>

      {auditData && (<>
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold tracking-tight">Overall score</div>
            <div className="text-[28px] font-semibold tracking-tight" style={{ color: accentColor }}>{auditData.overall}</div>
          </div>
          <ScoreBar label="Clarity" value={auditData.scores?.clarity ?? 0} />
          <ScoreBar label="Momentum" value={auditData.scores?.momentum ?? 0} />
          <ScoreBar label="Evidence" value={auditData.scores?.evidence ?? 0} />
          <ScoreBar label="Conviction" value={auditData.scores?.conviction ?? 0} />
        </Card>

        <div className="space-y-3">
          {auditData.tips?.map((tip: any, i: number) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-3">
                <span className="text-[12px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5"
                  style={{ background: tip.severity === 'good' ? '#e8f4ee' : tip.severity === 'risk' ? '#fbe8e5' : '#fbf1dd', color: AUDIT_COLORS[tip.severity] || '#0f1115' }}>
                  {tip.severity}
                </span>
                <div>
                  <div className="font-medium text-[14px]">{tip.title}</div>
                  <div className="text-[13px] ink-muted mt-0.5 leading-relaxed">{tip.body}</div>
                  {tip.slide && <div className="text-[11px] ink-muted mt-1">{SLIDE_LABELS[tip.slide] || tip.slide}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </>)}
      {error && <div className="sd-error">{error}</div>}
    </div>
  )

  // Claims
  const ScreenClaims = () => (
    <div className="p-6 lg:p-8 space-y-5 max-w-2xl">
      <Card className="p-6">
        <div className="font-semibold tracking-tight mb-1">Claims analysis</div>
        <div className="text-[13px] ink-muted mb-5">Every factual and persuasive assertion, classified by evidential strength.</div>
        <RunBtn onClick={runClaims} loading={claimsLoading} label="Analyse claims" done={!!claimsData} />
      </Card>

      {claimsData?.claims && (<>
        <div className="flex flex-wrap gap-2 text-[12px]">
          {Object.entries(CLAIM_STYLES).map(([k, v]) => (
            <span key={k} className="px-2 py-1 rounded-full font-medium" style={{ background: v.bg, color: v.color }}>{v.label}</span>
          ))}
        </div>
        <div className="space-y-3">
          {claimsData.claims.map((c: any, i: number) => {
            const style = CLAIM_STYLES[c.classification] || CLAIM_STYLES['founder-thesis']
            return (
              <Card key={i} className="p-4 flex items-start gap-3">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5"
                  style={{ background: style.bg, color: style.color }}>{style.label}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] leading-relaxed">{c.text}</div>
                  <div className="text-[11px] ink-muted mt-1">{SLIDE_LABELS[c.slide] || c.slide}</div>
                </div>
                <div className="text-[11px] ink-muted flex-shrink-0">{Math.round((c.confidence || 0) * 100)}%</div>
              </Card>
            )
          })}
        </div>
      </>)}
      {error && <div className="sd-error">{error}</div>}
    </div>
  )

  // Signals (stub — needs live tracking infra)
  const ScreenSignals = () => (
    <div className="p-6 lg:p-8 space-y-5 max-w-2xl">
      <Card className="p-6">
        <div className="font-semibold tracking-tight mb-1">Engagement signals</div>
        <div className="text-[13px] ink-muted">Signals activate once your deck is live and receiving traffic. Deploy first, then watch the data flow in.</div>
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total views', value: '—' },
          { label: 'Unique viewers', value: '—' },
          { label: 'Avg. time on deck', value: '—' },
          { label: 'Slide drop-off', value: '—' },
          { label: 'Return visits', value: '—' },
          { label: 'Demo clicks', value: '—' },
        ].map((m, i) => (
          <Card key={i} className="p-5">
            <div className="text-[12px] ink-muted">{m.label}</div>
            <div className="text-[22px] font-semibold tracking-tight mt-1 ink-muted">{m.value}</div>
          </Card>
        ))}
      </div>
      <button onClick={() => setActive('deploy')}
        className="h-10 px-5 rounded-xl font-medium text-[14px] text-white inline-flex items-center gap-2"
        style={{ background: accentColor }}>
        <ic.rocket className="w-4 h-4" /> Deploy to activate signals
      </button>
    </div>
  )

  // Demo Layer
  const ScreenDemo = () => (
    <div className="p-6 lg:p-8 max-w-xl space-y-4">
      <Card className="p-6">
        <div className="font-semibold tracking-tight mb-1">Demo layer</div>
        <div className="text-[13px] ink-muted mb-5">Embed your live product inside the deck. Investors click through — no context switch.</div>
        <div className="text-[13px] ink-muted">Add your demo URL in the intake form to activate this slide. The deck already contains a dedicated Demo slide — just needs a URL.</div>
      </Card>
      <button onClick={onRestart}
        className="h-10 px-4 rounded-xl font-medium text-[14px] paper hairline ink hover:bg-[var(--surface)] inline-flex items-center gap-2">
        ← Rebuild with demo URL
      </button>
    </div>
  )

  // Present
  const ScreenPresent = () => (
    <div className="p-6 lg:p-8 max-w-xl">
      <Card className="p-6 sm:p-8">
        <h2 className="text-[20px] font-semibold tracking-tight mb-1">Present</h2>
        <p className="text-[13px] ink-muted mb-6">Full-screen cinematic mode. Keyboard nav, scroll-snap transitions, HUD overlay.</p>
        <button onClick={download}
          className="h-10 px-5 rounded-xl font-medium text-[14px] text-white w-full flex items-center justify-center gap-2"
          style={{ background: accentColor }}>
          <ic.download className="w-4 h-4" /> Download &amp; open
        </button>
        <p className="text-[12px] ink-muted mt-3 text-center">Open the HTML file in any browser. Press F or double-click to present.</p>
      </Card>
    </div>
  )

  // Deploy
  const ScreenDeploy = () => (
    <div className="p-6 lg:p-8 max-w-xl">
      <Card className="p-6 sm:p-8">
        <h2 className="text-[20px] font-semibold tracking-tight mb-1">Push to Vercel</h2>
        <p className="text-[13px] ink-muted mb-6">Your deck goes live as a standalone URL — no login required to view it.</p>
        {deployUrl ? (
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest ink-muted mb-2">Live at</div>
            <a href={deployUrl} target="_blank" rel="noopener noreferrer"
              className="text-[14px] break-all flex items-center gap-1.5 hover:opacity-80"
              style={{ color: accentColor }}>
              {deployUrl} <ic.external className="w-3.5 h-3.5 flex-shrink-0" />
            </a>
          </div>
        ) : (<>
          <label className="block mb-4">
            <div className="text-[13px] ink-muted mb-1.5">Vercel API token</div>
            <input type="password" value={vercelToken} onChange={e => setVercelToken(e.target.value)}
              placeholder="vercel.com/account/tokens"
              className="w-full h-10 paper hairline rounded-xl px-3 focus-ring text-[14px]" />
          </label>
          {error && <div className="sd-error mb-3">{error}</div>}
          <button onClick={deployToVercel} disabled={!vercelToken || deployLoading}
            className="h-10 px-5 rounded-xl font-medium text-[14px] text-white w-full flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: accentColor }}>
            {deployLoading ? <><span className="sd-spinner">◐</span> Deploying…</> : <><ic.rocket className="w-4 h-4" /> Deploy now</>}
          </button>
        </>)}
      </Card>
    </div>
  )

  // Follow-up
  const ScreenFollowup = () => (
    <div className="p-6 lg:p-8 space-y-5 max-w-2xl">
      <Card className="p-6">
        <div className="font-semibold tracking-tight mb-1">Follow-up email</div>
        <div className="text-[13px] ink-muted mb-4">Voice-matched email from the founder, sent the day after the meeting.</div>
        <div className="text-[13px] ink-muted mb-2">Investor type</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {AUDIENCES.map(a => (
            <button key={a} onClick={() => setFuAudience(a)}
              className="text-[13px] px-3 h-8 rounded-full hairline transition-all"
              style={fuAudience === a ? { background: accentColor, color: '#fff', border: 'none' } : {}}>
              {a}
            </button>
          ))}
        </div>
        <RunBtn onClick={runFollowup} loading={fuLoading} label="Generate email" done={!!fuData} />
      </Card>

      {fuData && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[12px] uppercase tracking-wider ink-muted">Draft email</div>
            <button onClick={() => { navigator.clipboard.writeText(`Subject: ${fuData.subject}\n\n${fuData.body}`); setFuCopied(true); setTimeout(() => setFuCopied(false), 2000) }}
              className="h-8 px-3 rounded-lg text-[12px] paper hairline inline-flex items-center gap-1.5 hover:bg-[var(--surface)]">
              <ic.copy className="w-3.5 h-3.5" /> {fuCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="text-[13px] font-semibold mb-3">Subject: {fuData.subject}</div>
          <div className="text-[13px] ink-muted leading-relaxed whitespace-pre-line border-t pt-4" style={{ borderColor: 'var(--line)' }}>
            {fuData.body}
          </div>
        </Card>
      )}
      {error && <div className="sd-error">{error}</div>}
    </div>
  )

  // Settings
  const ScreenSettings = () => (
    <div className="p-6 lg:p-8 space-y-4 max-w-xl">
      {[
        { label: 'Company', value: company },
        { label: 'Stage', value: stage || '—' },
        { label: 'Industry', value: industry || '—' },
        { label: 'Audience', value: audience },
        { label: 'Website', value: websiteUrl || '—' },
        { label: 'Brand colour', value: accentColor },
      ].map(row => (
        <Card key={row.label} className="px-5 py-4 flex items-center justify-between">
          <div className="text-[13px] ink-muted">{row.label}</div>
          <div className="flex items-center gap-2 text-[13px] font-medium">
            {row.label === 'Brand colour' && <div className="w-4 h-4 rounded" style={{ background: accentColor }} />}
            {row.value}
          </div>
        </Card>
      ))}
      <button onClick={onRestart}
        className="h-10 px-4 rounded-xl font-medium text-[14px] paper hairline ink hover:bg-[var(--surface)] inline-flex items-center gap-2">
        ← Start a new deck
      </button>
    </div>
  )

  /* ── Screen map ───────────────────────────────────────────────── */
  const screens: Record<string, JSX.Element> = {
    overview:   <ScreenOverview />,
    sources:    <ScreenSources />,
    theme:      <ScreenTheme />,
    deck:       <ScreenDeck />,
    style:      <ScreenStyle />,
    frameworks: <ScreenFrameworks />,
    vclens:     <ScreenVCLens />,
    audit:      <ScreenAudit />,
    claims:     <ScreenClaims />,
    signals:    <ScreenSignals />,
    demo:       <ScreenDemo />,
    present:    <ScreenPresent />,
    deploy:     <ScreenDeploy />,
    followup:   <ScreenFollowup />,
    settings:   <ScreenSettings />,
  }

  /* ── Shell ────────────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={[
        'fixed lg:static inset-y-0 left-0 z-30 lg:z-auto w-[240px] shrink-0',
        'surface hairline border-y-0 border-l-0 h-screen lg:h-auto lg:sticky lg:top-0',
        'flex flex-col transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>

        <div className="px-5 py-5 flex items-center gap-2.5 min-h-[64px]">
          {logoUrl && (
            <img src={logoUrl} alt={company}
              className="w-9 h-9 rounded-lg flex-shrink-0 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          {company && <div className="font-semibold tracking-tight text-[14px] truncate">{company}</div>}
        </div>

        <nav className="px-3 pb-6 overflow-y-auto flex-1">
          {NAV.map(g => (
            <div key={g.group} className="mb-4">
              <div className="px-2 text-[10px] uppercase tracking-widest ink-muted mb-1">{g.group}</div>
              {g.items.map(item => {
                const Icon = ic[item.icon as keyof typeof ic]
                const isActive = active === item.id
                return (
                  <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false) }}
                    className={['w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-left transition-colors', isActive ? 'text-white' : 'ink hover:bg-[rgba(0,0,0,0.04)]'].join(' ')}
                    style={isActive ? { background: accentColor } : {}}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="px-3 pb-4">
          <button onClick={onRestart}
            className="w-full flex items-center gap-2 px-2.5 h-9 rounded-lg text-[12px] ink-muted hover:bg-[rgba(0,0,0,0.04)] transition-colors">
            ← New deck
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="paper hairline border-x-0 border-t-0 sticky top-0 z-10">
          <div className="px-4 lg:px-6 h-14 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 flex-shrink-0">
              <ic.menu className="w-[18px] h-[18px]" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-[15px] font-semibold tracking-tight truncate">{t1}</div>
              <div className="ink-muted text-[13px] truncate hidden sm:block">— {t2}</div>
            </div>
            <div className="flex-1" />
            <button onClick={() => setActive('theme')}
              className="hidden md:inline-flex items-center gap-2 h-8 pl-1 pr-3 rounded-full paper hairline text-[13px]">
              <span className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)` }} />
              {company}
            </button>
            <button onClick={() => setActive('present')}
              className="h-9 px-3 rounded-xl text-[13px] font-medium text-white flex items-center gap-1.5"
              style={{ background: accentColor }}>
              <ic.play className="w-3 h-3" /> Present
            </button>
            <div className="w-8 h-8 rounded-full surface hairline flex items-center justify-center text-[12px] font-medium flex-shrink-0">
              {initials}
            </div>
          </div>
        </div>

        <div className="flex-1">{screens[active]}</div>
      </div>
    </div>
  )
}
