import { useState } from 'react'

type Step = 'company' | 'story' | 'brand' | 'generating' | 'done'

interface FormData {
  company: string
  oneLiner: string
  problem: string
  solution: string
  howItWorks: string
  traction: string
  market: string
  businessModel: string
  competition: string
  team: string
  ask: string
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
  'Barlow Condensed',
  'Inter',
  'Outfit',
  'Space Grotesk',
  'DM Sans',
  'Syne',
  'Raleway',
  'Montserrat',
  'Bebas Neue',
  'Plus Jakarta Sans',
]

const empty: FormData = {
  company: '', oneLiner: '', problem: '', solution: '',
  howItWorks: '', traction: '', market: '', businessModel: '',
  competition: '', team: '', ask: '',
  founderName: '', founderRole: 'Founder', location: '', domain: '',
  demoUrl: '', demoDescription: '',
  accentColor: '#00e5c3', bgColor: '#06080d',
  fontHeading: 'Barlow Condensed', fontBody: 'DM Sans',
  isDark: true, vercelToken: '',
}

export default function Home() {
  const [step, setStep] = useState<Step>('company')
  const [form, setForm] = useState<FormData>(empty)
  const [generatedHtml, setGeneratedHtml] = useState('')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [deployUrl, setDeployUrl] = useState('')
  const [error, setError] = useState('')
  const [deployMode, setDeployMode] = useState<'vercel' | 'download' | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [isRefined, setIsRefined] = useState(false)

  const set = (k: keyof FormData, v: any) => setForm(f => ({ ...f, [k]: v }))

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
          projectName: `${form.company}-pitchdeck`,
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
      body: JSON.stringify({
        html: generatedHtml,
        filename: `${form.company}-pitchdeck`,
      }),
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

  const Field = ({ label, name, type = 'text', placeholder = '', rows = 0 }: any) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', color: '#7a8fa8', marginBottom: 6 }}>{label}</label>
      {rows > 0
        ? <textarea rows={rows} value={(form as any)[name]} onChange={e => set(name, e.target.value)} placeholder={placeholder} style={textareaStyle} />
        : <input type={type} value={(form as any)[name]} onChange={e => set(name, e.target.value)} placeholder={placeholder} style={inputStyle} />
      }
    </div>
  )

  if (step === 'generating') {
    return (
      <div style={shellStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 24, animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>◐</div>
            <h2 style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#00e5c3', marginBottom: 8 }}>Generating your deck</h2>
            <p style={{ color: '#7a8fa8', fontSize: 14 }}>Claude is crafting your cinematic pitch...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div style={shellStyle}>
        <div style={{ ...cardStyle, maxWidth: 640 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={tagStyle}>✓ Deck ready</div>
            <h1 style={headingStyle}>{form.company} pitch deck</h1>
            <p style={{ color: '#7a8fa8', fontSize: 14, lineHeight: 1.6 }}>Your cinematic pitch deck is ready. Deploy it to Vercel or download and self-host.</p>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          {deployUrl && (
            <div style={{ background: 'rgba(0,229,195,0.08)', border: '1px solid rgba(0,229,195,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, color: '#00e5c3', marginBottom: 6, textTransform: 'uppercase' }}>Deployed</div>
              <a href={deployUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#eef2f7', fontSize: 14, wordBreak: 'break-all' }}>{deployUrl}</a>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={download} style={btnPrimaryStyle}>Download HTML</button>

            {!isRefined && !isRefining && (
              <button onClick={refineWithGpt} style={{ ...btnSecondaryStyle, borderColor: '#6366f1', color: '#a5b4fc' }}>
                ✦ Refine copy with GPT-4o →
              </button>
            )}

            {isRefining && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', border: '1px solid #6366f1', borderRadius: 10, color: '#a5b4fc', fontSize: 13 }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◐</span>
                GPT-4o is critiquing and sharpening your copy...
              </div>
            )}

            {isRefined && (
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#a5b4fc', fontFamily: 'monospace', letterSpacing: 1 }}>
                ✓ GPT-4O REFINED — copy sharpened by pitch coach
              </div>
            )}

            {!deployMode && (
              <button onClick={() => setDeployMode('vercel')} style={btnSecondaryStyle}>Deploy to Vercel →</button>
            )}

            {deployMode === 'vercel' && !deployUrl && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid #1a2640' }}>
                <Field label="Vercel API Token" name="vercelToken" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                <p style={{ fontSize: 11, color: '#7a8fa8', marginBottom: 16 }}>Get your token at vercel.com/account/tokens</p>
                <button onClick={deployToVercel} style={btnPrimaryStyle}>Push to Vercel</button>
              </div>
            )}

            <button onClick={() => { setStep('brand'); setGeneratedHtml(''); setGeneratedContent(null); setDeployUrl(''); setDeployMode(null); setIsRefined(false) }} style={{ ...btnSecondaryStyle, opacity: 0.6 }}>← Regenerate</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 36 }}>
          <div style={tagStyle}>SignalDeck</div>
          <h1 style={headingStyle}>Build your<br /><span style={{ color: '#00e5c3' }}>cinematic</span> pitch</h1>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {step === 'company' && (
          <>
            <Field label="Company name" name="company" placeholder="SyncPay" />
            <Field label="One-liner" name="oneLiner" placeholder="Businesses lack data richness to understand cash flow without manual work" />
            <Field label="Founder name" name="founderName" placeholder="Ezana Yohala" />
            <Field label="Founder role" name="founderRole" placeholder="Founder" />
            <Field label="Location" name="location" placeholder="Melbourne, Australia" />
            <Field label="Domain" name="domain" placeholder="syncpay.au" />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => setStep('story')} disabled={!form.company || !form.founderName} style={form.company && form.founderName ? btnPrimaryStyle : { ...btnPrimaryStyle, opacity: 0.4, cursor: 'not-allowed' }}>
                Next: Story →
              </button>
            </div>
          </>
        )}

        {step === 'story' && (
          <>
            <Field label="The problem" name="problem" rows={3} placeholder="Businesses can't see invoice, GST, or supplier data inside their bank feed..." />
            <Field label="Your solution" name="solution" rows={3} placeholder="SyncPay embeds metadata into every payment transaction..." />
            <Field label="How it works" name="howItWorks" rows={3} placeholder="Step 1: payment is made → Step 2: SyncPay attaches metadata → Step 3: accountant sees full record" />
            <Field label="Traction" name="traction" rows={2} placeholder="3 pilots with $2M+ GMV, 1 LOI from regional bank" />
            <Field label="Market" name="market" rows={2} placeholder="$4.2T global B2B payments market, 30M SMBs in English-speaking markets" />
            <Field label="Business model" name="businessModel" rows={2} placeholder="SaaS: $49/mo per business, $199/mo for accountants" />
            <Field label="Competition" name="competition" rows={2} placeholder="Xero, MYOB, Stripe — none embed metadata at payment layer" />
            <Field label="Team" name="team" rows={2} placeholder="Ezana: ex-ANZ Bank, 8 yrs payments. Priya: ex-Atlassian, Head of Eng" />
            <Field label="The ask" name="ask" rows={2} placeholder="Raising $1.5M seed to hire 2 engineers and run 10 bank pilots" />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => setStep('company')} style={btnSecondaryStyle}>← Back</button>
              <button onClick={() => setStep('brand')} disabled={!form.problem} style={form.problem ? btnPrimaryStyle : { ...btnPrimaryStyle, opacity: 0.4, cursor: 'not-allowed' }}>
                Next: Brand →
              </button>
            </div>
          </>
        )}

        {step === 'brand' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', color: '#7a8fa8', marginBottom: 10 }}>Accent color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="color" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} style={{ width: 48, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                <input value={form.accentColor} onChange={e => set('accentColor', e.target.value)} placeholder="#00e5c3" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', color: '#7a8fa8', marginBottom: 10 }}>Theme</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ label: 'Dark', value: true, bg: '#06080d' }, { label: 'Light', value: false, bg: '#e9fef8' }].map(t => (
                  <button key={String(t.value)} onClick={() => { set('isDark', t.value); set('bgColor', t.bg) }} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `2px solid ${form.isDark === t.value ? '#00e5c3' : '#1a2640'}`, background: t.bg, color: t.value ? '#eef2f7' : '#0f1d2e', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', color: '#7a8fa8', marginBottom: 8 }}>Heading font</label>
              <select value={form.fontHeading} onChange={e => set('fontHeading', e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', color: '#7a8fa8', marginBottom: 8 }}>Body font</label>
              <select value={form.fontBody} onChange={e => set('fontBody', e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <Field label="Demo URL (optional iframe embed)" name="demoUrl" placeholder="https://demo.yourapp.com" />
            <Field label="Demo description (helps AI explain it)" name="demoDescription" rows={2} placeholder="Interactive side-by-side comparison of bank feed without vs with SyncPay enrichment" />

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => setStep('story')} style={btnSecondaryStyle}>← Back</button>
              <button onClick={generate} style={btnPrimaryStyle}>Generate Deck ✦</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const shellStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#06080d',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  color: '#eef2f7',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid #1a2640',
  borderRadius: 20,
  padding: '40px 40px',
}

const tagStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 10,
  letterSpacing: 3,
  textTransform: 'uppercase' as const,
  color: '#00e5c3',
  marginBottom: 12,
}

const headingStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
  lineHeight: 1.1,
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid #1a2640',
  borderRadius: 10,
  padding: '12px 14px',
  color: '#eef2f7',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color .2s',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical' as const,
  lineHeight: 1.6,
  minHeight: 80,
}

const btnPrimaryStyle: React.CSSProperties = {
  padding: '14px 24px',
  background: '#00e5c3',
  color: '#06080d',
  border: 'none',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  flex: 1,
  transition: 'opacity .2s',
}

const btnSecondaryStyle: React.CSSProperties = {
  padding: '14px 24px',
  background: 'transparent',
  color: '#7a8fa8',
  border: '1px solid #1a2640',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'border-color .2s',
}

const errorStyle: React.CSSProperties = {
  background: 'rgba(255,59,92,0.08)',
  border: '1px solid rgba(255,59,92,0.2)',
  borderRadius: 10,
  padding: '12px 16px',
  color: '#ff3b5c',
  fontSize: 13,
  marginBottom: 20,
}
