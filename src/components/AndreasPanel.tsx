/* ════════════════════════════════════════════════════════════════════
   ANDREAS PANEL — floating chat bubble bottom-right of Workspace.

   Collapsed by default (small pill with the Andreas mark + "Ask Andreas").
   Click to expand into a chat surface. Founder types instructions,
   sees Andreas's replies, plus chips beneath each reply showing which
   sub-agents got dispatched.

   On send: POST /api/andreas with the founder's instruction + workspace
   context (current screen, company, brand world, deck content, slides,
   active slide). Server-side conductor plans, dispatches, synthesises,
   returns { reply, toolsCalled, rawResults, plan }.

   Conversation history lives in this component's state — server is
   stateless. Refresh = new conversation. Good enough for v1.

   Styling inherits from BrandWorld via CSS vars already set on the
   Workspace root (--primary-fill, --bg, --surface, --text, etc.) so
   the panel adapts per brand without any extra wiring.
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from 'react'
import type { BrandWorld } from '@/lib/brand-world'

export interface AndreasPanelProps {
  company?:       string
  industry?:      string
  audience?:      string
  stage?:         string
  founderName?:   string
  brandWorld?:    BrandWorld | null
  currentScreen?: string
  deckContent?:   Record<string, any> | null
  slideIds?:      string[]
  activeSlideId?: string
}

interface ChatMessage {
  role:        'founder' | 'andreas'
  text:        string
  toolsCalled?: { tool: string; why: string }[]
  error?:      string
}

export default function AndreasPanel(props: AndreasPanelProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  async function send() {
    const instruction = input.trim()
    if (!instruction || loading) return

    const founderMsg: ChatMessage = { role: 'founder', text: instruction }
    setMessages(m => [...m, founderMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/andreas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          context: {
            company:       props.company,
            industry:      props.industry,
            audience:      props.audience,
            stage:         props.stage,
            founderName:   props.founderName,
            currentScreen: props.currentScreen,
            brandWorld:    props.brandWorld,
            deckContent:   props.deckContent,
            slideIds:      props.slideIds,
            activeSlideId: props.activeSlideId,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setMessages(m => [...m, {
        role:        'andreas',
        text:        data.reply || '',
        toolsCalled: data.toolsCalled || [],
      }])
    } catch (e: any) {
      setMessages(m => [...m, {
        role:  'andreas',
        text:  `Something went wrong on my end. ${e?.message || ''}`.trim(),
        error: e?.message,
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  /* ─── Collapsed bubble ─────────────────────────────────────── */
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Ask Andreas"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 50,
          height: 48, padding: '0 18px 0 14px',
          borderRadius: 999, border: 'none',
          background: 'var(--primary-fill, var(--primary, #0F1115))',
          color: '#fff',
          fontFamily: 'var(--font-body, system-ui)',
          fontWeight: 600, fontSize: 14,
          display: 'inline-flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          boxShadow: '0 12px 30px rgba(0,0,0,0.15), 0 0 0 1px var(--primary, rgba(0,0,0,0.1)) inset',
          transition: 'transform 0.18s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}
      >
        <span style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'rgba(255,255,255,0.18)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 12, letterSpacing: '-0.02em',
        }}>A</span>
        Ask Andreas
      </button>
    )
  }

  /* ─── Expanded chat surface ────────────────────────────────── */
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 50,
        width: 'min(420px, calc(100vw - 48px))',
        height: 'min(620px, calc(100vh - 48px))',
        background: 'var(--surface, #fff)',
        color: 'var(--text, #111)',
        border: '1px solid var(--border, rgba(0,0,0,0.10))',
        borderRadius: 18,
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-body, system-ui)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        background: 'var(--surface, #fff)',
      }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'var(--primary-fill, var(--primary, #0F1115))',
          color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-heading, system-ui)', fontWeight: 900, fontSize: 14,
        }}>A</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Andreas</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #666)' }}>Your pitchdeck specialist</div>
        </div>
        <button onClick={() => setOpen(false)} title="Close"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted, #666)', fontSize: 20, lineHeight: 1, padding: 4,
          }}>×</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-muted, #666)', fontSize: 13, lineHeight: 1.55, padding: '8px 4px' }}>
            Ask me anything about your deck. Try:
            <ul style={{ marginTop: 8, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>"audit my deck"</li>
              <li>"rewrite my problem slide to be punchier"</li>
              <li>"what would a Series A partner say"</li>
              <li>"draft my follow-up email"</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              alignSelf: m.role === 'founder' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              padding: '8px 12px',
              borderRadius: 14,
              background: m.role === 'founder' ? 'var(--primary-fill, var(--primary, #111))' : 'var(--surface-soft, #f5f5f5)',
              color: m.role === 'founder' ? '#fff' : 'var(--text, #111)',
              fontSize: 13, lineHeight: 1.5,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {m.text}
            </div>
            {m.role === 'andreas' && m.toolsCalled && m.toolsCalled.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignSelf: 'flex-start' }}>
                {m.toolsCalled.map((t, j) => (
                  <span key={j} title={t.why}
                    style={{
                      fontSize: 10, fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                      padding: '2px 8px', borderRadius: 999,
                      background: 'var(--primary-soft, rgba(0,0,0,0.06))',
                      color: 'var(--primary, var(--text, #111))',
                      letterSpacing: '0.04em',
                    }}>
                    {t.tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '8px 12px', borderRadius: 14,
            background: 'var(--surface-soft, #f5f5f5)',
            color: 'var(--text-muted, #666)',
            fontSize: 13, fontStyle: 'italic',
          }}>thinking…</div>
        )}
      </div>

      {/* Composer */}
      <div style={{
        padding: 10, borderTop: '1px solid var(--border, rgba(0,0,0,0.08))',
        display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask Andreas…"
          rows={1}
          style={{
            flex: 1, resize: 'none',
            padding: '8px 12px', borderRadius: 12,
            border: '1px solid var(--border, rgba(0,0,0,0.10))',
            background: 'var(--surface, #fff)',
            color: 'var(--text, #111)',
            font: 'inherit', fontSize: 13,
            outline: 'none', minHeight: 36, maxHeight: 120,
            fontFamily: 'var(--font-body, system-ui)',
          }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{
            height: 36, padding: '0 14px', borderRadius: 12, border: 'none',
            background: 'var(--primary-fill, var(--primary, #0F1115))',
            color: '#fff', fontWeight: 600, fontSize: 13, cursor: loading ? 'wait' : 'pointer',
            opacity: (loading || !input.trim()) ? 0.5 : 1,
            fontFamily: 'var(--font-body, system-ui)',
          }}>
          Send
        </button>
      </div>
    </div>
  )
}
