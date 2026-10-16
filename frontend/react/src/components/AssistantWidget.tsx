import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assistantApi, type AssistantCardDto, type AskResponse } from '../api/assistant'
import { codeOf, statusOf } from '../api/http'
import AssistantCard from './AssistantCard'

interface Turn {
  id: number
  question: string
  pending: boolean
  result?: AskResponse
  error?: string
}

const SUGGESTIONS = [
  'How many vehicles are in stock?',
  'How many customers do we have?',
  'Which Toyota vehicles are in stock?',
  'How many blocked ads are there?',
]

let nextId = 1

export default function AssistantWidget() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [hint, setHint] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const threadRef = useRef<HTMLDivElement>(null)

  const busy = turns.some(t => t.pending)

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    if (open) scrollToEnd()
  }, [open, scrollToEnd])

  async function runTurn(turn: Turn) {
    setTurns(prev => prev.map(t => t.id === turn.id ? { ...t, pending: true, error: undefined, result: undefined } : t))
    scrollToEnd()
    try {
      const result = (await assistantApi.ask(turn.question)).data
      setTurns(prev => prev.map(t => t.id === turn.id ? { ...t, pending: false, result } : t))
    } catch (err) {
      let errorMsg: string
      if (statusOf(err) === 403 || codeOf(err) === 'FORBIDDEN') {
        setForbidden(true)
        errorMsg = 'You do not have access to Assistant.'
      } else if (statusOf(err) === 400 || codeOf(err) === 'VALIDATION') {
        errorMsg = 'The assistant could not read that question. Try rephrasing it.'
      } else {
        errorMsg = 'Could not ask assistant.'
      }
      setTurns(prev => prev.map(t => t.id === turn.id ? { ...t, pending: false, error: errorMsg } : t))
    }
    scrollToEnd()
  }

  function ask(question = text) {
    if (busy) return
    const q = question.trim()
    if (!q) {
      setHint('Please enter a question.')
      return
    }
    setHint('')
    setText('')
    const turn: Turn = { id: nextId++, question: q, pending: false }
    setTurns(prev => [...prev, turn])
    runTurn(turn)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      ask()
    }
  }

  function retry(turn: Turn) {
    if (!busy) runTurn(turn)
  }

  function clearThread() {
    setTurns([])
    setHint('')
  }

  function openCard(card: AssistantCardDto) {
    setOpen(false)
    if (card.kind === 'VEHICLE') {
      navigate(`/dms?vehicleId=${card.id}`)
    } else if (card.kind === 'CUSTOMER') {
      navigate(`/crm?customerId=${card.id}`)
    } else if (card.vehicleId != null) {
      navigate(`/ads?vehicleId=${card.vehicleId}`)
    } else {
      navigate('/ads')
    }
  }

  function summaryText(turn: Turn) {
    const r = turn.result
    if (r && r.summaryAvailable && r.summary != null) return r.summary
    return 'Smart summary unavailable'
  }

  function cards(turn: Turn) {
    return (turn.result?.cards || []).slice(0, 5)
  }

  return (
    <div className="assistant-widget">
      {open && (
        <section className="assistant-panel" role="dialog" aria-label="Assistant"
          onKeyDown={e => e.key === 'Escape' && setOpen(false)}>
          <header className="assistant-panel-head">
            <div>
              <strong>Assistant</strong>
              <div className="muted assistant-panel-sub">Up to five matches per answer</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {turns.length > 0 && (
                <button className="btn-link" disabled={busy} onClick={clearThread}
                  style={{ color: '#fff' }}>Clear</button>
              )}
              <button className="btn-link" aria-label="Close assistant"
                onClick={() => setOpen(false)} style={{ color: '#fff' }}>&times;</button>
            </div>
          </header>
          {forbidden ? (
            <div className="state danger-text">You do not have access to Assistant.</div>
          ) : (
            <>
              <div className="muted chat-note" style={{ padding: '10px 16px 0' }}>
                This assistant is read-only: it can only look up vehicles, customers and ads for your
                dealership. It will never create, change or delete any data.
              </div>
              <div ref={threadRef} className="chat-thread">
                {turns.length === 0 && (
                  <div className="chat-welcome">
                    <p>Search by make, VIN or customer name. Try one of these:</p>
                    <div className="chat-suggestions">
                      {SUGGESTIONS.map(s => (
                        <button key={s} className="btn btn-sm btn-suggestion" onClick={() => ask(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {turns.map(turn => (
                  <div key={turn.id}>
                    <div className="chat-row chat-row-user">
                      <div className="chat-bubble chat-bubble-user">{turn.question}</div>
                    </div>
                    <div className="chat-row">
                      <div className="chat-bubble chat-bubble-bot">
                        {turn.pending && (
                          <div className="chat-typing" aria-label="Asking…">
                            <span /><span /><span />
                          </div>
                        )}
                        {!turn.pending && turn.error && (
                          <div className="danger-text">
                            {turn.error}{' '}
                            <button className="btn-link" disabled={busy} onClick={() => retry(turn)}>Retry</button>
                          </div>
                        )}
                        {!turn.pending && turn.result && (
                          <>
                            <div className={`chat-summary${!turn.result.summaryAvailable ? ' muted' : ''}`}>
                              {summaryText(turn)}
                            </div>
                            {cards(turn).length > 0 ? (
                              <div className="card-grid chat-cards">
                                {cards(turn).map(c => (
                                  <AssistantCard key={`${c.kind}-${c.id}`} card={c} onOpen={() => openCard(c)} />
                                ))}
                              </div>
                            ) : (
                              <div className="muted chat-note">No matching records. Try a make, VIN or customer name.</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-composer">
                <div className="input-group">
                  <input className="input" value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about this dealership…" />
                  <button className="btn" disabled={busy} onClick={() => ask()}>
                    {busy ? '...' : 'Ask'}
                  </button>
                </div>
                {hint && <div className="warning-text chat-hint">{hint}</div>}
              </div>
            </>
          )}
        </section>
      )}
      <button
        type="button"
        className={`assistant-fab${open ? ' open' : ''}`}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        onClick={() => setOpen(!open)}
      >
        {!open ? (
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="7" width="16" height="12" rx="3" />
            <path d="M12 7V4" /><circle cx="12" cy="3.5" r="1" />
            <circle cx="9" cy="13" r="1.2" fill="currentColor" />
            <circle cx="15" cy="13" r="1.2" fill="currentColor" />
            <path d="M2 12v3M22 12v3" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        )}
      </button>
    </div>
  )
}
