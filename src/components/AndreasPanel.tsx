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
  /** Already-computed signals from other workspace screens — so Andreas can
   *  answer "what's the weakest slide" without re-dispatching the audit tool,
   *  reference the actual claims when asked about objections, etc. */
  auditData?:       any
  claimsData?:      any
  vcData?:          any
  signalsData?:     any
  designCritique?:  any
  /** LinkedIn + Crunchbase intel for deck recipients — feeds the conductor so
   *  Andreas can reference investor focus and fund thesis in context without
   *  calling a tool. */
  recipientIntel?:  Array<{ recipient: any; fund: any; fetchedAt: string }>
  /** ISO timestamps the workspace attaches when each signal was fetched, so
   *  Andreas can reason about staleness. */
  staleness?: {
    auditFetchedAt?: string; claimsFetchedAt?: string; vcFetchedAt?: string;
    signalsFetchedAt?: string; designFetchedAt?: string;
  }
}

interface ChatMessage {
  role:        'founder' | 'andreas'
  text:        string
  toolsCalled?: { tool: string; why: string }[]
  /** Per-tool result, including any failure reason. Used to colour the
   *  tool chip red when a dispatch failed instead of silently showing it
   *  as if it succeeded. */
  rawResults?: Array<{ tool: string; result?: any; error?: string }>
  error?:      string
  /** Planner reasoning + detected intent — shown in an expandable "Why I did
   *  this" footnote so the founder can audit Andreas's choices. */
  plan?:       { reasoning?: string; intent?: any }
  /** Critic's confidence score for this reply (0..1). Below 0.6 surfaces a
   *  small "low-confidence" chip so the founder knows to double-check. */
  confidence?: number
}

/** Per-deck localStorage key. Each company gets its own chat history so a
 *  founder switching between decks doesn't see cross-talk. */
function storageKeyFor(company?: string) {
  const safe = (company || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40)
  return `andreas_history_v2_${safe}`
}

export default function AndreasPanel(props: AndreasPanelProps) {
  const [open, setOpen] = useState(false)
  const storageKey = storageKeyFor(props.company)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Restore conversation from localStorage on first render.
    // Per-deck key so switching companies gives a fresh thread.
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
      if (stored) return JSON.parse(stored) as ChatMessage[]
    } catch {}
    return []
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedPlanIdx, setExpandedPlanIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reload history when the deck (company) changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      setMessages(stored ? JSON.parse(stored) : [])
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
  }, [messages, storageKey])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  function clearChat() {
    setMessages([])
    try { localStorage.removeItem(storageKey) } catch {}
  }

  /** Pull tool dispatches from prior assistant messages so the planner sees
   *  what we already ran. Bounded to last 10 to keep prompt cost predictable. */
  function buildRecentToolResults(): Array<{ tool: string; result: any; turnIndex: number; args: any }> {
    const out: Array<{ tool: string; result: any; turnIndex: number; args: any }> = []
    messages.forEach((m, idx) => {
      if (m.role !== 'andreas' || !m.rawResults) return
      m.rawResults.forEach(r => {
        if (r.error) return
        const argsFromCall = m.toolsCalled?.find(t => t.tool === r.tool)
        out.push({ tool: r.tool, result: r.result, turnIndex: idx, args: (argsFromCall as any)?.args || {} })
      })
    })
    return out.slice(-10)
  }

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
          // Send the prior conversation so Andreas can resolve back-references
          // ("rewrite that slide", "the one you mentioned"). Server trims to last 6.
          history: messages.map(m => ({ role: m.role, text: m.text })),
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
            // Workspace-computed signals so Andreas can answer from context
            // instead of re-dispatching tools.
            auditData:      props.auditData,
            claimsData:     props.claimsData,
            vcData:         props.vcData,
            signalsData:    props.signalsData,
            designCritique: props.designCritique,
            recipientIntel: props.recipientIntel,
            staleness:      props.staleness,
            // Tools we already ran in this chat — planner skips re-dispatch
            recentToolResults: buildRecentToolResults(),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setMessages(m => [...m, {
        role:        'andreas',
        text:        data.reply || '',
        toolsCalled: data.toolsCalled || [],
        rawResults:  data.rawResults  || [],
        plan:        data.plan,
        confidence:  typeof data.confidence === 'number' ? data.confidence : undefined,
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
        {messages.length > 0 && (
          <button onClick={clearChat} title="Clear chat"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted, #888)', fontSize: 11, padding: '2px 6px',
              borderRadius: 6, fontFamily: 'var(--font-body, system-ui)',
            }}>Clear</button>
        )}
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
                {m.toolsCalled.map((t, j) => {
                  // If a result with this tool failed, surface the failure as
                  // a red chip rather than the default neutral chip.
                  const result = m.rawResults?.find((r: any) => r.tool === t.tool)
                  const failed = result && result.error
                  return (
                    <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span title={failed ? `Failed: ${result.error}` : (t.why || t.tool)}
                        style={{
                          fontSize: 10, fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                          padding: '2px 8px', borderRadius: 999,
                          background: failed ? 'rgba(176,50,43,0.12)' : 'var(--primary-soft, rgba(0,0,0,0.06))',
                          color:      failed ? '#b0322b' : 'var(--primary, var(--text, #111))',
                          letterSpacing: '0.04em',
                        }}>
                        {failed ? '⚠ ' : ''}{t.tool}
                      </span>
                      {t.why && !failed && (
                        <span style={{
                          fontSize: 10, color: 'var(--text-muted, #888)',
                          paddingLeft: 8, lineHeight: 1.35,
                          fontFamily: 'var(--font-body, system-ui)',
                        }}>{t.why}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {m.role === 'andreas' && (m.plan?.reasoning || m.plan?.intent || typeof m.confidence === 'number') && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {m.plan?.intent?.intent && (
                    <span title={`Detected intent: ${m.plan.intent.intent} (${Math.round((m.plan.intent.confidence || 0) * 100)}%)`}
                      style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 999,
                        background: 'rgba(80,160,210,0.10)', color: 'var(--text-muted, #555)',
                        fontFamily: 'var(--font-mono, ui-monospace, monospace)', letterSpacing: '0.04em',
                      }}>{m.plan.intent.intent}</span>
                  )}
                  {m.plan?.intent?.domain && m.plan.intent.domain !== 'generic' && (
                    <span style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 999,
                      background: 'rgba(130,90,200,0.10)', color: 'var(--text-muted, #555)',
                      fontFamily: 'var(--font-mono, ui-monospace, monospace)', letterSpacing: '0.04em',
                    }}>{m.plan.intent.domain}</span>
                  )}
                  {typeof m.confidence === 'number' && m.confidence < 0.6 && (
                    <span title={`Self-rated confidence ${(m.confidence * 100).toFixed(0)}% — verify before quoting`}
                      style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 999,
                        background: 'rgba(220,160,40,0.16)', color: '#a86a00',
                        fontFamily: 'var(--font-mono, ui-monospace, monospace)', letterSpacing: '0.04em',
                      }}>~{(m.confidence * 100).toFixed(0)}% conf</span>
                  )}
                  {m.plan?.reasoning && (
                    <button
                      onClick={() => setExpandedPlanIdx(expandedPlanIdx === i ? null : i)}
                      style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 999,
                        background: 'transparent', border: '1px solid var(--border, rgba(0,0,0,0.10))',
                        color: 'var(--text-muted, #777)', cursor: 'pointer',
                        fontFamily: 'var(--font-body, system-ui)',
                      }}>
                      {expandedPlanIdx === i ? 'hide reasoning' : 'why?'}
                    </button>
                  )}
                </div>
                {expandedPlanIdx === i && m.plan?.reasoning && (
                  <div style={{
                    fontSize: 11, color: 'var(--text-muted, #666)',
                    background: 'var(--surface-soft, rgba(0,0,0,0.04))',
                    padding: '6px 9px', borderRadius: 8, maxWidth: '88%', lineHeight: 1.45,
                    fontFamily: 'var(--font-body, system-ui)',
                  }}>
                    {m.plan.reasoning}
                  </div>
                )}
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
