import { useEffect, useState } from 'react'
import { translateText } from '../../i18n/display'
import { api, ApiError, type ConversationContact } from './api'

const INPUT = 'min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-800 outline-none focus:border-purple-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f6f7ff]'
const BTN = 'shrink-0 rounded-lg bg-purple-600 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-purple-700 disabled:opacity-50'
const CHIP = 'inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[12px] text-purple-700 dark:bg-purple-400/15 dark:text-purple-200'

/** datetime-local value <-> the "YYYY-MM-DD HH:mm" the flow engine reads in the workspace time zone. */
const toInput = (v: string) => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(v) ? v.slice(0, 16).replace(' ', 'T') : ''
const fromInput = (v: string) => v.replace('T', ' ')

/**
 * Labels and fields that automations read (e.g. label "مهتم" + booking_at). Saving here is what
 * fires "Conversation updated" automations. Hidden for conversations the flow engine does not serve.
 */
export function ConversationFields({ conversationId, cardClass }: { conversationId: string; cardClass: string }) {
  const [contact, setContact] = useState<ConversationContact | null>(null)
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [isDate, setIsDate] = useState(true)

  useEffect(() => {
    let live = true
    setContact(null); setHidden(false); setNotice(null)
    api.conversationContact(conversationId).then(c => { if (live) setContact(c) }).catch(() => { if (live) setHidden(true) })
    return () => { live = false }
  }, [conversationId])

  if (hidden) return null

  const save = async (body: { tags?: string[]; fields?: Record<string, string | null> }) => {
    setBusy(true); setNotice(null)
    try {
      const res = await api.saveConversationContact(conversationId, body)
      setContact(res)
      setNotice({ tone: 'ok', text: res.flows_started.length ? translateText('Saved. An automation started.') : translateText('Saved') })
      return true
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof ApiError ? e.message : translateText('Could not save') })
      return false
    } finally {
      setBusy(false)
    }
  }

  const addLabel = async () => {
    const tag = label.trim()
    if (!tag || !contact || contact.tags.includes(tag)) return
    if (await save({ tags: [...contact.tags, tag] })) setLabel('')
  }

  const addField = async () => {
    const k = key.trim()
    if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) { setNotice({ tone: 'error', text: translateText('Field name: English letters, digits and _ only') }); return }
    if (await save({ fields: { [k]: isDate ? fromInput(value) : value } })) { setKey(''); setValue('') }
  }

  const fields = Object.entries(contact?.fields ?? {})

  return (
    <div className={`${cardClass} shrink-0 p-3.5`}>
      <b className="text-[13.5px] font-bold text-slate-900 dark:text-[#f6f7ff]">{translateText('Automation labels and fields')}</b>
      {!contact && <p className="mt-2 text-[12px] text-slate-500 dark:text-[#c7d0ec]">{translateText('Loading…')}</p>}
      {contact && (
        <>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {contact.tags.length === 0 && <span className="text-[12px] text-slate-500 dark:text-[#c7d0ec]">{translateText('No labels')}</span>}
            {contact.tags.map(t => (
              <span key={t} className={CHIP} dir="auto">{t}
                <button type="button" disabled={busy} aria-label={`${translateText('Remove label')} ${t}`} className="opacity-70 hover:opacity-100" onClick={() => save({ tags: contact.tags.filter(x => x !== t) })}>×</button>
              </span>
            ))}
          </div>
          <form className="mt-2 flex gap-1.5" onSubmit={e => { e.preventDefault(); addLabel() }}>
            <label htmlFor="cf-label" className="sr-only">{translateText('Label')}</label>
            <input id="cf-label" dir="auto" className={INPUT} placeholder={translateText('Add label, e.g. مهتم')} value={label} onChange={e => setLabel(e.target.value)} />
            <button type="submit" className={BTN} disabled={busy || !label.trim()}>{translateText('Add')}</button>
          </form>

          <ul className="mt-3 space-y-1.5">
            {fields.map(([k, v]) => (
              <li key={k} className="flex items-center gap-2 text-[12.5px]">
                <code className="shrink-0 text-slate-500 dark:text-[#c7d0ec]">{k}</code>
                {toInput(v)
                  ? <input type="datetime-local" aria-label={k} className={INPUT} defaultValue={toInput(v)} disabled={busy} onBlur={e => { const next = fromInput(e.target.value); if (next !== v) save({ fields: { [k]: next || null } }) }} />
                  : <input aria-label={k} dir="auto" className={INPUT} defaultValue={v} disabled={busy} onBlur={e => { if (e.target.value !== v) save({ fields: { [k]: e.target.value || null } }) }} />}
                <button type="button" disabled={busy} aria-label={`${translateText('Clear field')} ${k}`} className="text-slate-400 hover:text-rose-600" onClick={() => save({ fields: { [k]: null } })}>×</button>
              </li>
            ))}
          </ul>
          <form className="mt-2 grid gap-1.5" onSubmit={e => { e.preventDefault(); addField() }}>
            <div className="flex gap-1.5">
              <label htmlFor="cf-key" className="sr-only">{translateText('Field name')}</label>
              <input id="cf-key" className={INPUT} placeholder="booking_at" value={key} onChange={e => setKey(e.target.value)} />
              <label className="flex shrink-0 items-center gap-1 text-[12px] text-slate-500 dark:text-[#c7d0ec]">
                <input type="checkbox" checked={isDate} onChange={e => { setIsDate(e.target.checked); setValue('') }} />{translateText('Date')}
              </label>
            </div>
            <div className="flex gap-1.5">
              <label htmlFor="cf-value" className="sr-only">{translateText('Value')}</label>
              {isDate
                ? <input id="cf-value" type="datetime-local" className={INPUT} value={value} onChange={e => setValue(e.target.value)} />
                : <input id="cf-value" dir="auto" className={INPUT} placeholder={translateText('Value')} value={value} onChange={e => setValue(e.target.value)} />}
              <button type="submit" className={BTN} disabled={busy || !key.trim() || !value}>{translateText('Save')}</button>
            </div>
          </form>
          {notice && <p role="status" className={`mt-2 text-[12px] ${notice.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{notice.text}</p>}
        </>
      )}
    </div>
  )
}
