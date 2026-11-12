import { translateText } from '../../i18n/display';
import { useState } from 'react'
import { api, ApiError, type SimState } from './api'

type Line = { from: 'user' | 'bot'; text: string; buttons?: { id?: string; title: string; type: string; url?: string }[] }

/** Chats with the saved draft. Save before testing so the simulator sees the latest graph. */
export function Simulator({ flowId, onClose }: { flowId: string; onClose: () => void }) {
  const [session, setSession] = useState(() => `s${Date.now()}`)
  const [lines, setLines] = useState<Line[]>([])
  const [state, setState] = useState<SimState | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const apply = (res: SimState, sent?: string) => {
    setLines(l => [...l, ...(sent ? [{ from: 'user' as const, text: sent }] : []), ...res.messages.map(m => ({ from: 'bot' as const, ...m }))])
    setState(res)
  }

  const send = async (value: string) => {
    if (!value.trim()) return
    setError(null)
    try {
      apply(await api.simulate(flowId, session, value), value)
      setText('')
    } catch (e) {
      setError(e instanceof ApiError ? [e.message, ...e.errors].join(' ') : 'The simulator could not reach the API.')
    }
  }

  const skip = async () => apply(await api.skipDelay(flowId, session))

  return (
    <aside className="fb-sim" aria-label={translateText("Test this flow")}>
      <header className="fb-sim-head">
        <strong>{translateText("Test")}</strong>
        <button type="button" className="fb-btn fb-btn-ghost" onClick={() => { setSession(`s${Date.now()}`); setLines([]); setState(null) }}>{translateText("Restart")}</button>
        <button type="button" className="fb-btn fb-btn-ghost" onClick={onClose} aria-label={translateText("Close test panel")}>{translateText("Close")}</button>
      </header>
      <div className="fb-sim-log" aria-live="polite">
        {lines.length === 0 && <p className="fb-muted">{translateText("Send a trigger keyword to start the draft.")}</p>}
        {lines.map((l, i) => (
          <div key={i} className={`fb-bubble from-${l.from}`} dir="auto">
            {l.text}
            {l.buttons?.map((b, j) => b.type === 'url'
              ? <a key={j} className="fb-bubble-btn" href={b.url} target="_blank" rel="noreferrer">{b.title}</a>
              : <button key={j} type="button" className="fb-bubble-btn" onClick={() => send(b.title)}>{b.title}</button>)}
          </div>
        ))}
      </div>
      {state?.run?.state === 'waiting_delay' && (
        <div className="fb-sim-note">{translateText("Waiting until ")}{new Date(state.run.wake_at!).toLocaleString()} <button type="button" className="fb-btn fb-btn-soft" onClick={skip}>{translateText("Skip wait")}</button></div>
      )}
      {state?.contact && (
        <dl className="fb-sim-contact">
          <dt>{translateText("Tags")}</dt><dd>{state.contact.tags.join(', ') || '—'}</dd>
          {Object.entries(state.contact.fields).map(([k, v]) => <div key={k}><dt>{k}</dt><dd dir="auto">{v}</dd></div>)}
        </dl>
      )}
      {error && <p className="fb-error" role="alert">{translateText(error)}</p>}
      <form className="fb-sim-input" onSubmit={e => { e.preventDefault(); send(text) }}>
        <label htmlFor="sim-text" className="sr-only">{translateText("Message")}</label>
        <input id="sim-text" dir="auto" value={text} onChange={e => setText(e.target.value)} placeholder={translateText("Type a message")} />
        <button type="submit" className="fb-btn fb-btn-primary">{translateText("Send")}</button>
      </form>
    </aside>
  )
}
