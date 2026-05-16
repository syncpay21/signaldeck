import { useState } from 'react'

/* ── SVG icons (same as app.html) ─────────────────────────────── */
const ic = {
  layers: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>,
  doc:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6"/></svg>,
  palette:(p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2-.6-1.4.4-2.5 1.7-2.5H17a4 4 0 004-4 9 9 0 00-9-9z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="9.5" cy="6.5" r="1"/><circle cx="14" cy="6" r="1"/><circle cx="17" cy="10" r="1"/></svg>,
  cards:  (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/></svg>,
  star:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"/></svg>,
  list:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
  eye:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>,
  check:  (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12l5 5L20 6"/></svg>,
  bolt:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>,
  signal: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 20V14M9 20V10M14 20V6M19 20V2"/></svg>,
  play:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7V5z"/></svg>,
  spark:  (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4"/></svg>,
  rocket: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 14c0-5 4-11 9-11 5 0 5 6 0 11-3 3-6 4-9 0z"/><path d="M5 14c-2 1-3 3-3 6 3 0 5-1 6-3"/><circle cx="14" cy="8" r="1.5"/></svg>,
  send:   (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 11l18-7-7 18-3-8-8-3z"/></svg>,
  cog:    (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.4.8a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2l-2.4-.8-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.8c.6.5 1.3.9 2 1.2L10 21h4l.5-2.5c.7-.3 1.4-.7 2-1.2l2.4.8 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>,
  menu:   (p: any) => <svg {...p} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="4.5" x2="16" y2="4.5"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="13.5" x2="16" y2="13.5"/></svg>,
  download:(p:any)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 4v12M6 14l6 6 6-6M4 20h16"/></svg>,
  external:(p:any)=> <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M18 13v6H6V7h6M15 3h6v6M10 14L21 3"/></svg>,
}

const NAV = [
  { group: 'Build', items: [
    { id: 'overview',    label: 'Overview',      icon: 'layers'  },
    { id: 'sources',     label: 'Sources',       icon: 'doc'     },
    { id: 'theme',       label: 'Theme',         icon: 'palette' },
    { id: 'deck',        label: 'Deck Build',    icon: 'cards'   },
    { id: 'style',       label: 'Style Library', icon: 'star'    },
    { id: 'frameworks',  label: 'Frameworks',    icon: 'list'    },
  ]},
  { group: 'Insights', items: [
    { id: 'vclens',  label: 'VC Lens', icon: 'eye'    },
    { id: 'audit',   label: 'Audit',   icon: 'check'  },
    { id: 'claims',  label: 'Claims',  icon: 'bolt'   },
    { id: 'signals', label: 'Signals', icon: 'signal' },
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
  deck:       ['Deck Build',     'Slides and inspector'],
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

interface WorkspaceProps {
  company: string
  accentColor: string
  generatedHtml: string
  generatedContent: any
  onRestart: () => void
  logoUrl?: string
}

export default function Workspace({ company, accentColor, generatedHtml, generatedContent, onRestart, logoUrl }: WorkspaceProps) {
  const [active, setActive] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [vercelToken, setVercelToken] = useState('')
  const [deployUrl, setDeployUrl] = useState('')
  const [deployLoading, setDeployLoading] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [isRefined, setIsRefined] = useState(false)
  const [refinedHtml, setRefinedHtml] = useState(generatedHtml)
  const [error, setError] = useState('')

  const initials = company ? company.slice(0, 2).toUpperCase() : 'SD'
  const [t1, t2] = TITLES[active] || ['Overview', '']

  async function download() {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: refinedHtml, filename: `${company}-deck` }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${company.toLowerCase()}-deck.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function deployToVercel() {
    setDeployLoading(true)
    setError('')
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: refinedHtml,
          projectName: `${company.toLowerCase().replace(/\s+/g, '-')}-deck`,
          vercelToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDeployUrl(data.url)
      setActive('deploy')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeployLoading(false)
    }
  }

  async function refine() {
    setIsRefining(true)
    setError('')
    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedContent, input: { company, accentColor } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRefinedHtml(data.html)
      setIsRefined(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsRefining(false)
    }
  }

  /* ── Screens ─────────────────────────────────────────────────── */
  function ScreenOverview() {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        {/* Hero card */}
        <div className="paper hairline rounded-[18px] shadow-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="flex-1">
              <div className="text-[12px] uppercase tracking-wider ink-muted mb-2">Deck ready</div>
              <h1 className="text-[26px] font-semibold tracking-tight leading-tight">
                {company} — 12 slides built.
              </h1>
              <p className="ink-muted mt-2 text-[14px]">
                Download the HTML or push to Vercel. Run the GPT-4o pitch coach to sharpen every word.
              </p>
              <div className="flex gap-2 mt-5 flex-wrap">
                <button onClick={download}
                  className="h-10 px-4 rounded-xl font-medium text-[14px] text-white shadow-card hover:opacity-90 inline-flex items-center gap-2"
                  style={{ background: accentColor }}>
                  <ic.download className="w-4 h-4" />
                  Download HTML
                </button>
                <button onClick={() => setActive('deploy')}
                  className="h-10 px-4 rounded-xl font-medium text-[14px] paper hairline ink hover:bg-[var(--surface)] inline-flex items-center gap-2">
                  <ic.rocket className="w-4 h-4" />
                  Push to Vercel
                </button>
              </div>
            </div>
            <div className="hidden sm:block w-[180px] h-[110px] rounded-2xl hairline surface flex-shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'linear-gradient(to right,rgba(15,17,21,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(15,17,21,.05) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="absolute bottom-3 left-3">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-white" style={{ background: accentColor }}>
                  {company}
                </span>
                <div className="text-[11px] ink-muted mt-1">Live deck</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Slides built',    value: '12',  sub: 'Ready to present' },
            { label: 'AI model',        value: 'Claude', sub: 'Sonnet 4.5' },
            { label: 'Copy pass',       value: isRefined ? '2/2' : '1/2', sub: isRefined ? 'GPT-4o refined' : 'Claude draft' },
            { label: 'Status',          value: 'Live', sub: 'Download ready' },
          ].map((m, i) => (
            <div key={i} className="paper hairline rounded-[18px] shadow-card p-5">
              <div className="text-[12px] ink-muted">{m.label}</div>
              <div className="text-[22px] font-semibold tracking-tight mt-1">{m.value}</div>
              <div className="text-[12px] ink-muted mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* GPT-4o refine */}
        {!isRefined && (
          <div className="paper hairline rounded-[18px] shadow-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold tracking-tight">Run GPT-4o pitch coach</div>
                <div className="text-[13px] ink-muted mt-1">
                  Tears apart every word. Rebuilds headlines to 2–5 words, sharpens bullets, removes buzzwords.
                </div>
              </div>
              {!isRefining ? (
                <button onClick={refine}
                  className="flex-shrink-0 h-9 px-4 rounded-xl text-[13px] font-medium inline-flex items-center gap-2"
                  style={{ background: '#6366f1', color: '#fff' }}>
                  ✦ Run coach
                </button>
              ) : (
                <div className="flex-shrink-0 flex items-center gap-2 text-[13px] text-[#6366f1]">
                  <span className="sd-spinner">◐</span> Working…
                </div>
              )}
            </div>
          </div>
        )}

        {isRefined && (
          <div className="p-4 rounded-[14px] flex items-center gap-3 text-[13px]"
            style={{ background: '#f5f3ff', border: '1px solid #c7d2fe', color: '#6366f1' }}>
            ✓ Pitch coach applied — copy is sharper
          </div>
        )}

        {error && (
          <div className="sd-error">{error}</div>
        )}
      </div>
    )
  }

  function ScreenDeploy() {
    return (
      <div className="p-6 lg:p-8 max-w-xl">
        <div className="paper hairline rounded-[18px] shadow-card p-6 sm:p-8">
          <h2 className="text-[20px] font-semibold tracking-tight mb-1">Push to Vercel</h2>
          <p className="text-[13px] ink-muted mb-6">Your deck goes live as a standalone URL — no login required to view it.</p>

          {deployUrl ? (
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest ink-muted mb-2">Live at</div>
              <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                className="text-[14px] break-all flex items-center gap-1.5 hover:opacity-80"
                style={{ color: accentColor }}>
                {deployUrl}
                <ic.external className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
            </div>
          ) : (
            <>
              <label className="sd-field">
                <span className="sd-label">Vercel API token</span>
                <input className="sd-input" type="password" value={vercelToken}
                  onChange={e => setVercelToken(e.target.value)}
                  placeholder="vercel.com/account/tokens" />
              </label>
              {error && <div className="sd-error">{error}</div>}
              <button onClick={deployToVercel} disabled={!vercelToken || deployLoading}
                className="h-10 px-5 rounded-xl font-medium text-[14px] text-white w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-40"
                style={{ background: accentColor }}>
                {deployLoading ? <><span className="sd-spinner">◐</span> Deploying…</> : <><ic.rocket className="w-4 h-4" /> Deploy now</>}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  function ScreenPresent() {
    return (
      <div className="p-6 lg:p-8 max-w-xl">
        <div className="paper hairline rounded-[18px] shadow-card p-6 sm:p-8">
          <h2 className="text-[20px] font-semibold tracking-tight mb-1">Present</h2>
          <p className="text-[13px] ink-muted mb-6">
            Full-screen cinematic mode. Keyboard nav, scroll-snap transitions, HUD overlay.
          </p>
          <button onClick={download}
            className="h-10 px-5 rounded-xl font-medium text-[14px] text-white w-full flex items-center justify-center gap-2"
            style={{ background: accentColor }}>
            <ic.download className="w-4 h-4" />
            Download &amp; open
          </button>
          <p className="text-[12px] ink-muted mt-3 text-center">Open the HTML file in any browser to present</p>
        </div>
      </div>
    )
  }

  function ScreenComingSoon({ label }: { label: string }) {
    return (
      <div className="p-6 lg:p-8">
        <div className="paper hairline rounded-[18px] shadow-card p-10 text-center max-w-md">
          <div className="text-[28px] mb-3">◌</div>
          <div className="font-semibold tracking-tight mb-1">{label}</div>
          <div className="text-[13px] ink-muted">Coming in the next build</div>
        </div>
      </div>
    )
  }

  const screens: Record<string, JSX.Element> = {
    overview:   <ScreenOverview />,
    deploy:     <ScreenDeploy />,
    present:    <ScreenPresent />,
  }

  const screen = screens[active] || <ScreenComingSoon label={TITLES[active]?.[0] || active} />

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={[
        'fixed lg:static inset-y-0 left-0 z-30 lg:z-auto w-[240px] shrink-0',
        'surface hairline border-y-0 border-l-0 h-screen lg:h-auto lg:sticky lg:top-0',
        'flex flex-col transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>

        {/* Brand */}
        <div className="px-5 py-5 flex items-center gap-2.5">
          {logoUrl && (
            <img src={logoUrl} alt={company}
              className="w-9 h-9 rounded-lg flex-shrink-0 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          {company && (
            <div className="min-w-0">
              <div className="font-semibold tracking-tight text-[14px] truncate">{company}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="px-3 pb-6 overflow-y-auto flex-1">
          {NAV.map(g => (
            <div key={g.group} className="mb-4">
              <div className="px-2 text-[10px] uppercase tracking-widest ink-muted mb-1">{g.group}</div>
              {g.items.map(item => {
                const Icon = ic[item.icon as keyof typeof ic]
                const isActive = active === item.id
                return (
                  <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false) }}
                    className={[
                      'w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-left transition-colors',
                      isActive ? 'text-white' : 'ink hover:bg-[rgba(0,0,0,0.04)]',
                    ].join(' ')}
                    style={isActive ? { background: accentColor } : {}}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Start over */}
        <div className="px-3 pb-4">
          <button onClick={onRestart}
            className="w-full flex items-center gap-2 px-2.5 h-9 rounded-lg text-[12px] ink-muted hover:bg-[rgba(0,0,0,0.04)] transition-colors">
            ← New deck
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Topbar */}
        <div className="paper hairline border-x-0 border-t-0 sticky top-0 z-10">
          <div className="px-4 lg:px-6 h-14 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 transition-colors flex-shrink-0">
              <ic.menu className="w-[18px] h-[18px]" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="text-[15px] font-semibold tracking-tight truncate">{t1}</div>
              <div className="ink-muted text-[13px] truncate hidden sm:block">— {t2}</div>
            </div>

            <div className="flex-1" />

            {/* Theme chip */}
            <button onClick={() => setActive('theme')}
              className="hidden md:inline-flex items-center gap-2 h-8 pl-1 pr-3 rounded-full paper hairline text-[13px]">
              <span className="w-6 h-6 rounded-full flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)` }} />
              {company}
            </button>

            {/* Present */}
            <button onClick={() => setActive('present')}
              className="h-9 px-3 rounded-xl text-[13px] font-medium text-white flex items-center gap-1.5"
              style={{ background: accentColor }}>
              <ic.play className="w-3 h-3" />
              Present
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full surface hairline flex items-center justify-center text-[12px] font-medium flex-shrink-0">
              {initials}
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div className="flex-1">{screen}</div>
      </div>
    </div>
  )
}
