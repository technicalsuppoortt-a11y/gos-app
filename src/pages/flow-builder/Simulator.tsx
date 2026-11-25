import { translateText } from '../../i18n/display';
import { useState } from 'react'
import { api, ApiError, type SimState } from './api'

type Line = { from: 'user' | 'bot' | 'system'; text?: string; buttons?: { id?: string; title: string; type: string; url?: string }[]; file?: { kind: string; name: string; url: string; caption?: string } }

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

  // Labels and fields of the test contact, set the way the inbox sets them.
  const [tags, setTags] = useState('')
  const [fieldKey, setFieldKey] = useState('')
  const [fieldValue, setFieldValue] = useState('')
  const updateContact = async (body: { tags?: string[]; fields?: Record<string, string> }, note: string) => {
    setError(null)
    try {
      const res = await api.simulateContact(flowId, session, body)
      setLines(l => [...l, { from: 'system', text: note }, ...res.messages.map(m => ({ from: 'bot' as const, ...m }))])
      setState(s => ({ ...res, run: res.run ?? s?.run ?? null }))
    } catch (e) {
      setError(e instanceof ApiError ? [e.message, ...e.errors].join(' ') : 'The simulator could not reach the API.')
    }
  }

  return (
    <aside className="fb-sim" aria-label={translateText("Test this flow")}>
      <header className="fb-sim-head">
        <strong>{translateText("Test")}</strong>
        <button type="button" className="fb-btn fb-btn-ghost" onClick={() => { setSession(`s${Date.now()}`); setLines([]); setState(null) }}>{translateText("Restart")}</button>
        <button type="button" className="fb-btn fb-btn-ghost" onClick={onClose} aria-label={translateText("Close test panel")}>{translateText("Close")}</button>
      </header>
      <div className="fb-sim-log" aria-live="polite">
        {lines.length === 0 && <p className="fb-muted">{translateText("Send a trigger keyword, or set a label or field below, to start the draft.")}</p>}
        {lines.map((l, i) => (
          <div key={i} className={`fb-bubble from-${l.from}`} dir="auto">
            {l.text}
            {l.file && <a className="fb-bubble-file" href={l.file.url} target="_blank" rel="noreferrer">📎 {translateText(l.file.kind)}: {l.file.name}{l.file.caption ? ` — ${l.file.caption}` : ''}</a>}
            {l.buttons?.map((b, j) => b.type === 'url'
              ? <a key={j} className="fb-bubble-btn" href={b.url} target="_blank" rel="noreferrer">{b.title}</a>
              : <button key={j} type="button" className="fb-bubble-btn" onClick={() => send(b.title)}>{b.title}</button>)}
          </div>
        ))}
      </div>
      {state?.run?.state === 'waiting_delay' && (
        <div className="fb-sim-note">{translateText("Waiting until ")}{new Date(state.run.wake_at!).toLocaleString('en-US')} <button type="button" className="fb-btn fb-btn-soft" onClick={skip}>{translateText("Skip wait")}</button></div>
      )}
      {state?.contact && (
        <dl className="fb-sim-contact">
          <dt>{translateText("Tags")}</dt><dd>{state.contact.tags.join(', ') || '—'}</dd>
          {Object.entries(state.contact.fields).map(([k, v]) => <div key={k}><dt>{k}</dt><dd dir="auto">{v}</dd></div>)}
        </dl>
      )}
      <details className="fb-sim-contact-edit">
        <summary>{translateText("Labels and fields (as in the inbox)")}</summary>
        <form className="fb-inline" onSubmit={e => { e.preventDefault(); const list = tags.split(/[,،]/).map(t => t.trim()).filter(Boolean); updateContact({ tags: list }, `${translateText("Labels")}: ${list.join(', ') || '—'}`) }}>
          <label htmlFor="sim-tags" className="sr-only">{translateText("Labels")}</label>
          <input id="sim-tags" dir="auto" placeholder={translateText("Labels, comma separated")} value={tags} onChange={e => setTags(e.target.value)} />
          <button type="submit" className="fb-btn fb-btn-soft">{translateText("Set")}</button>
        </form>
        <form className="fb-inline" onSubmit={e => { e.preventDefault(); if (fieldKey.trim()) updateContact({ fields: { [fieldKey.trim()]: fieldValue } }, `${fieldKey.trim()} = ${fieldValue || '—'}`) }}>
          <label htmlFor="sim-fk" className="sr-only">{translateText("Field")}</label>
          <input id="sim-fk" placeholder="booking_at" value={fieldKey} onChange={e => setFieldKey(e.target.value)} />
          <label htmlFor="sim-fv" className="sr-only">{translateText("Value")}</label>
          <input id="sim-fv" dir="auto" placeholder="2026-11-25 20:30" value={fieldValue} onChange={e => setFieldValue(e.target.value)} />
          <button type="submit" className="fb-btn fb-btn-soft">{translateText("Set")}</button>
        </form>
      </details>
      {error && <p className="fb-error" role="alert">{translateText(error)}</p>}
      <form className="fb-sim-input" onSubmit={e => { e.preventDefault(); send(text) }}>
        <label htmlFor="sim-text" className="sr-only">{translateText("Message")}</label>
        <input id="sim-text" dir="auto" value={text} onChange={e => setText(e.target.value)} placeholder={translateText("Type a message")} />
        <button type="submit" className="fb-btn fb-btn-primary">{translateText("Send")}</button>
      </form>
    </aside>
  )
}
