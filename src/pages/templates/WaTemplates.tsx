import React from 'react'
import { AlertCircle, ArrowLeft, Copy, ExternalLink, Info, LayoutGrid, Link2, Phone, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { useUILanguage, translateText as t } from '../../i18n/display'
import { showToast } from '../../utils/toast'
import { api as channelApi, type Channel } from '../flow-builder/api'
import { templatesApi, type TemplateButtonDraft, type TemplateCategory, type TemplateDraft, type WaTemplate } from './api'
import '../campaigns/campaigns.css'
import './templates.css'

/** Automation & Campaign › Templates: WhatsApp message templates managed on Meta. */

type Filter = 'all' | 'approved' | 'review' | 'rejected'
type HeaderKind = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))
const statusGroup = (s: string): Exclude<Filter, 'all'> | 'other' => {
  const v = s.toUpperCase()
  if (v === 'APPROVED') return 'approved'
  if (v === 'PENDING' || v === 'IN_APPEAL') return 'review'
  if (v === 'REJECTED') return 'rejected'
  return 'other'
}
const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Approved', PENDING: 'In review', IN_APPEAL: 'In review', REJECTED: 'Rejected', PAUSED: 'Paused',
  DISABLED: 'Disabled', PENDING_DELETION: 'Deleting', DELETED: 'Deleted', LIMIT_EXCEEDED: 'Limit reached',
}
const CATEGORY_LABEL: Record<string, string> = { MARKETING: 'Marketing', UTILITY: 'Utility', AUTHENTICATION: 'Authentication' }
const bodyOf = (tpl: WaTemplate) => tpl.components.find(c => c.type.toUpperCase() === 'BODY')?.text ?? ''
const varCount = (text: string) => { const m = text.match(/\{\{(\d+)\}\}/g) ?? []; return m.reduce((max, v) => Math.max(max, Number(v.slice(2, -2))), 0) }
const fill = (text: string, examples: string[]) => text.replace(/\{\{(\d+)\}\}/g, (_, n) => examples[Number(n) - 1] || `{{${n}}}`)

export function WaTemplatesTab() {
  useUILanguage()
  const [view, setView] = React.useState<'list' | 'new'>('list')
  const [copyFrom, setCopyFrom] = React.useState<WaTemplate | null>(null)
  const [channel, setChannel] = React.useState<Channel | null | undefined>(undefined)

  React.useEffect(() => {
    channelApi.channels().then(list => setChannel(list.find(c => c.channel === 'whatsapp' && c.status === 'connected') ?? null)).catch(() => setChannel(null))
  }, [])

  if (channel === undefined) return <div className="cp-root"><p className="cp-muted">{t('Loading…')}</p></div>
  if (!channel) return (
    <div className="cp-root"><div className="cp-card wt-empty">
      <span className="wt-empty-icon"><Link2 size={22} aria-hidden="true" /></span>
      <h3>{t('Connect WhatsApp first')}</h3>
      <p className="cp-muted">{t('Templates belong to your WhatsApp Business number. Connect it to create and manage them here.')}</p>
      <a className="cp-btn cp-btn-primary" href="/dashboard/settings/integrations">{t('Connect WhatsApp')}</a>
    </div></div>
  )
  return view === 'new'
    ? <TemplateEditor from={copyFrom} onClose={() => { setView('list'); setCopyFrom(null) }} />
    : <TemplateList channel={channel} onNew={from => { setCopyFrom(from ?? null); setView('new') }} />
}

function TemplateList({ channel, onNew }: { channel: Channel; onNew: (from?: WaTemplate) => void }) {
  const [items, setItems] = React.useState<WaTemplate[] | null>(null)
  const [error, setError] = React.useState('')
  const [filter, setFilter] = React.useState<Filter>('all')
  const [query, setQuery] = React.useState('')
  const [deleting, setDeleting] = React.useState<WaTemplate | null>(null)
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback((refresh = false) => {
    setError('')
    templatesApi.list(refresh).then(setItems).catch(e => { setItems([]); setError(errorText(e)) })
  }, [])
  React.useEffect(() => { load() }, [load])

  const all = items ?? []
  const count = (f: Filter) => (f === 'all' ? all.length : all.filter(x => statusGroup(x.status) === f).length)
  const shown = all.filter(x => (filter === 'all' || statusGroup(x.status) === filter) && (!query || x.name.includes(query.toLowerCase()) || bodyOf(x).toLowerCase().includes(query.toLowerCase())))

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await templatesApi.remove(deleting.name)
      setItems(list => (list ?? []).filter(x => x.name !== deleting.name))
      showToast.success(t('Template deleted'))
      setDeleting(null)
    } catch (e) { showToast.error(errorText(e)) } finally { setBusy(false) }
  }

  return (
    <div className="cp-root cp-stack">
      <section className="cp-card wt-intro">
        <div>
          <h3>{t('WhatsApp Templates')}</h3>
          <p className="cp-muted cp-small">{t('Create templates, send them to Meta for review, and use the approved ones in campaigns.')}</p>
        </div>
        <span className="cp-muted cp-small" dir="ltr">{channel.name ?? channel.external_id ?? 'WhatsApp'}</span>
      </section>

      <div className="cp-row-between">
        <div className="cp-row cp-wrap">
          <label className="wt-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Search templates')} aria-label={t('Search templates')} />
          </label>
          <div className="wt-filters" role="group" aria-label={t('Filter by status')}>
            {(['all', 'approved', 'review', 'rejected'] as Filter[]).map(f => (
              <button key={f} type="button" aria-pressed={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
                {t({ all: 'All', approved: 'Approved', review: 'In review', rejected: 'Rejected' }[f])} {count(f)}
              </button>
            ))}
          </div>
        </div>
        <div className="cp-row">
          <button type="button" className="cp-btn" aria-label={t('Refresh from Meta')} title={t('Refresh from Meta')} onClick={() => { setItems(null); load(true) }}><RefreshCw size={16} aria-hidden="true" /></button>
          <button type="button" className="cp-btn cp-btn-primary" onClick={() => onNew()}><Plus size={16} aria-hidden="true" />{t('New template')}</button>
        </div>
      </div>

      {error && <p className="cp-error" role="alert">{error}</p>}

      {items === null ? <p className="cp-muted">{t('Loading templates…')}</p>
        : all.length === 0 && !error ? (
          <div className="cp-card wt-empty">
            <span className="wt-empty-icon"><LayoutGrid size={22} aria-hidden="true" /></span>
            <h3>{t('No templates yet')}</h3>
            <p className="cp-muted">{t('Create your first template. Meta usually reviews it within minutes, then you can use it in a campaign.')}</p>
            <button type="button" className="cp-btn cp-btn-primary" onClick={() => onNew()}>{t('New template')}</button>
          </div>
        ) : (
          <div className="cp-card cp-flush cp-table-wrap">
            <table className="cp-table">
              <thead><tr><th>{t('Template')}</th><th>{t('Category')}</th><th>{t('Language')}</th><th>{t('Status')}</th><th><span className="cp-sr-only">{t('Actions')}</span></th></tr></thead>
              <tbody>
                {shown.map(x => (
                  <tr key={`${x.name}-${x.language}`}>
                    <td>
                      <div className="wt-name">
                        <code dir="ltr">{x.name}</code>
                        <span className="cp-muted wt-body">{bodyOf(x)}</span>
                        {statusGroup(x.status) === 'rejected' && x.rejected_reason && (
                          <span className="wt-reason"><AlertCircle size={14} aria-hidden="true" />{t('Meta:')} {x.rejected_reason}</span>
                        )}
                      </div>
                    </td>
                    <td><span className="wt-tag">{t(CATEGORY_LABEL[x.category.toUpperCase()] ?? x.category)}</span></td>
                    <td dir="ltr">{x.language}</td>
                    <td><span className={`wt-pill wt-pill-${statusGroup(x.status)}`}>{t(STATUS_LABEL[x.status.toUpperCase()] ?? x.status)}</span></td>
                    <td className="cp-end wt-actions">
                      <button type="button" className="cp-btn cp-btn-ghost" aria-label={t('Duplicate template')} title={t('Duplicate template')} onClick={() => onNew(x)}><Copy size={16} aria-hidden="true" /></button>
                      <button type="button" className="cp-btn cp-btn-ghost cp-danger" aria-label={t('Delete template')} title={t('Delete template')} onClick={() => setDeleting(x)}><Trash2 size={16} aria-hidden="true" /></button>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={5} className="cp-center cp-muted">{t('No templates match.')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}

      <p className="cp-card wt-note"><Info size={18} aria-hidden="true" /><span><b>{t('Meta reviews every template.')}</b> {t('Only approved templates can be used in campaigns. Review usually takes a few minutes and can take up to a day; statuses update here on their own.')}</span></p>

      {deleting && (
        <div className="wt-backdrop" onClick={() => !busy && setDeleting(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="wt-del-title" className="cp-card wt-dialog" onClick={e => e.stopPropagation()}>
            <h3 id="wt-del-title">{t('Delete')} “<span dir="ltr">{deleting.name}</span>”?</h3>
            <p className="cp-muted">{t('It will be deleted from Meta in every language. You can’t reuse this name for 30 days, and scheduled campaigns using it will stop.')}</p>
            <div className="cp-row wt-dialog-actions">
              <button type="button" className="cp-btn" disabled={busy} onClick={() => setDeleting(null)}>{t('Cancel')}</button>
              <button type="button" className="cp-btn wt-btn-danger" disabled={busy} onClick={() => void remove()}>{busy ? t('Deleting…') : t('Delete template')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type ButtonRow = TemplateButtonDraft & { key: number }

function TemplateEditor({ from, onClose }: { from: WaTemplate | null; onClose: () => void }) {
  const fromHeader = from?.components.find(c => c.type.toUpperCase() === 'HEADER')
  const [name, setName] = React.useState(from ? `${from.name}_copy` : '')
  const [language, setLanguage] = React.useState(from?.language ?? 'en')
  const [category, setCategory] = React.useState<TemplateCategory>((from?.category.toUpperCase() as TemplateCategory) || 'MARKETING')
  const [headerKind, setHeaderKind] = React.useState<HeaderKind>((fromHeader?.format?.toUpperCase() as HeaderKind) || (fromHeader ? 'TEXT' : 'NONE'))
  const [headerText, setHeaderText] = React.useState(fromHeader?.text ?? '')
  const [mediaHandle, setMediaHandle] = React.useState('')
  const [body, setBody] = React.useState(from ? bodyOf(from) : '')
  const [examples, setExamples] = React.useState<string[]>([])
  const [footer, setFooter] = React.useState(from?.components.find(c => c.type.toUpperCase() === 'FOOTER')?.text ?? '')
  const [buttons, setButtons] = React.useState<ButtonRow[]>(() => (from?.components.find(c => c.type.toUpperCase() === 'BUTTONS')?.buttons ?? []).map((b, i) => {
    const type = b.type.toUpperCase()
    if (type === 'URL') return { key: i, type: 'URL', text: b.text, url: b.url ?? '' }
    if (type === 'PHONE_NUMBER') return { key: i, type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone_number ?? '' }
    return { key: i, type: 'QUICK_REPLY', text: b.text }
  }))
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const bodyRef = React.useRef<HTMLTextAreaElement>(null)

  const vars = varCount(body)
  const ex = Array.from({ length: vars }, (_, i) => examples[i] ?? '')
  const checks = [
    { ok: /^[a-z0-9_]+$/.test(name), label: 'Name uses lowercase letters, numbers and _ only' },
    { ok: body.trim().length > 0 && body.length <= 1024, label: 'Body has text (up to 1024 characters)' },
    { ok: ex.every(v => v.trim()), label: 'Every variable has a sample value' },
    { ok: !/^\s*\{\{\d+\}\}|\{\{\d+\}\}\s*$/.test(body), label: 'Body doesn’t start or end with a variable' },
    { ok: buttons.every(b => b.text.trim() && (b.type !== 'URL' || /^https?:\/\//.test(b.url)) && (b.type !== 'PHONE_NUMBER' || b.phone_number.trim())), label: 'Every button is filled in' },
  ]
  const valid = checks.every(c => c.ok) && (headerKind === 'NONE' || (headerKind === 'TEXT' ? headerText.trim() && headerText.length <= 60 : mediaHandle.trim()))

  const addVariable = () => {
    const tag = `{{${vars + 1}}}`
    const el = bodyRef.current
    const at = el ? el.selectionStart : body.length
    setBody(body.slice(0, at) + tag + body.slice(at))
  }
  const addButton = (type: string) => {
    const key = Date.now()
    if (type === 'URL') setButtons(b => [...b, { key, type: 'URL', text: '', url: '' }])
    else if (type === 'PHONE_NUMBER') setButtons(b => [...b, { key, type: 'PHONE_NUMBER', text: '', phone_number: '' }])
    else if (type === 'QUICK_REPLY') setButtons(b => [...b, { key, type: 'QUICK_REPLY', text: '' }])
  }
  const patchButton = (key: number, patch: Partial<ButtonRow>) => setButtons(list => list.map(b => (b.key === key ? { ...b, ...patch } as ButtonRow : b)))

  const submit = async () => {
    setBusy(true); setError('')
    const draft: TemplateDraft = {
      name, language, category,
      header: headerKind === 'NONE' ? null : headerKind === 'TEXT' ? { format: 'TEXT', text: headerText } : { format: headerKind, media_handle: mediaHandle },
      body: { text: body, examples: ex },
      footer: footer.trim() ? { text: footer } : null,
      buttons: buttons.map(({ key: _key, ...b }) => b),
    }
    try {
      await templatesApi.create(draft)
      showToast.success(t('Template sent to Meta for review'))
      onClose()
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  const previewHeader = headerKind === 'TEXT' ? headerText : ''
  return (
    <div className="cp-root cp-stack">
      <div className="cp-head">
        <div>
          <button type="button" className="cp-link cp-back" onClick={onClose}><ArrowLeft size={14} aria-hidden="true" />{t('Templates')}</button>
          <h2>{t('New template')}</h2>
        </div>
        <div className="cp-row">
          <button type="button" className="cp-btn" onClick={onClose}>{t('Cancel')}</button>
          <button type="button" className="cp-btn cp-btn-primary" disabled={!valid || busy} onClick={() => void submit()}>{busy ? t('Sending…') : t('Submit for review')}</button>
        </div>
      </div>
      {error && <p className="cp-error" role="alert">{error}</p>}

      <div className="wt-editor">
        <div className="cp-stack-sm wt-form">
          <section className="cp-card cp-stack-sm">
            <h3>{t('Basics')}</h3>
            <div className="wt-grid-2">
              <label className="cp-field">{t('Template name')}
                <input dir="ltr" value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder="order_update" />
                <span className="cp-muted cp-small wt-hint">{t('Lowercase letters, numbers and _ only.')}</span>
              </label>
              <label className="cp-field">{t('Language')}
                <select value={language} onChange={e => setLanguage(e.target.value)}>
                  <option value="en">English (en)</option><option value="en_US">English US (en_US)</option><option value="ar">العربية (ar)</option>
                </select>
              </label>
            </div>
            <fieldset className="wt-fieldset">
              <legend className="cp-field">{t('Category')}</legend>
              <div className="wt-cats">
                {([['MARKETING', 'Offers, launches, newsletters'], ['UTILITY', 'Order, booking and account updates'], ['AUTHENTICATION', 'One-time verification codes']] as const).map(([value, desc]) => (
                  <button key={value} type="button" aria-pressed={category === value} className={category === value ? 'is-active' : ''} onClick={() => setCategory(value)}>
                    <b>{t(CATEGORY_LABEL[value])}</b><span className="cp-muted cp-small">{t(desc)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="cp-card cp-stack-sm">
            <h3>{t('Content')}</h3>
            <div className="cp-row-between">
              <span className="cp-field">{t('Header')} <span className="cp-muted">· {t('optional')}</span></span>
              <div className="wt-seg" role="group" aria-label={t('Header type')}>
                {(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'] as HeaderKind[]).map(k => (
                  <button key={k} type="button" aria-pressed={headerKind === k} className={headerKind === k ? 'is-active' : ''} onClick={() => setHeaderKind(k)}>
                    {t({ NONE: 'None', TEXT: 'Text', IMAGE: 'Image', VIDEO: 'Video', DOCUMENT: 'Document' }[k])}
                  </button>
                ))}
              </div>
            </div>
            {headerKind === 'TEXT' && <><input aria-label={t('Header text')} value={headerText} maxLength={60} onChange={e => setHeaderText(e.target.value)} /><span className="cp-muted cp-small cp-end">{headerText.length} / 60</span></>}
            {headerKind !== 'NONE' && headerKind !== 'TEXT' && <label className="cp-field">{t('Sample media link')}<input dir="ltr" value={mediaHandle} onChange={e => setMediaHandle(e.target.value)} placeholder="https://" /></label>}

            <label className="cp-field">{t('Body')}
              <textarea ref={bodyRef} rows={5} value={body} maxLength={1024} onChange={e => setBody(e.target.value)} />
            </label>
            <div className="cp-row-between">
              <button type="button" className="wt-add-var" onClick={addVariable}>+ {t('Add variable')}</button>
              <span className="cp-muted cp-small">{body.length} / 1024</span>
            </div>
            {vars > 0 && (
              <div className="wt-samples">
                <span className="cp-field">{t('Sample values')} <span className="cp-muted">· {t('Meta needs an example for each variable')}</span></span>
                <div className="wt-grid-2">
                  {ex.map((v, i) => (
                    <label key={i} className="cp-row"><code dir="ltr">{`{{${i + 1}}}`}</code>
                      <input className="cp-grow" aria-label={`${t('Example for variable')} ${i + 1}`} value={v} onChange={e => setExamples(list => { const next = [...list]; next[i] = e.target.value; return next })} />
                    </label>
                  ))}
                </div>
              </div>
            )}
            <label className="cp-field"><span>{t('Footer')} <span className="cp-muted">· {t('optional')}</span></span>
              <input value={footer} maxLength={60} onChange={e => setFooter(e.target.value)} />
            </label>
          </section>

          <section className="cp-card cp-stack-sm">
            <div className="cp-row-between">
              <h3>{t('Buttons')} <span className="cp-muted cp-small">· {t('up to 10')}</span></h3>
              <select aria-label={t('Add a button')} value="" disabled={buttons.length >= 10} onChange={e => addButton(e.target.value)}>
                <option value="">+ {t('Add button')}</option>
                <option value="QUICK_REPLY">{t('Quick reply')}</option>
                <option value="URL">{t('Visit website')}</option>
                <option value="PHONE_NUMBER" disabled={buttons.some(b => b.type === 'PHONE_NUMBER')}>{t('Call phone number')}</option>
              </select>
            </div>
            {buttons.map(b => (
              <div key={b.key} className="wt-button-row">
                <span className="wt-tag">{t(b.type === 'URL' ? 'Website' : b.type === 'PHONE_NUMBER' ? 'Phone' : 'Quick reply')}</span>
                <input aria-label={t('Button text')} maxLength={25} value={b.text} onChange={e => patchButton(b.key, { text: e.target.value })} placeholder={t('Button text')} />
                {b.type === 'URL' && <input dir="ltr" className="cp-grow" aria-label={t('Button URL')} value={b.url} onChange={e => patchButton(b.key, { url: e.target.value })} placeholder="https://" />}
                {b.type === 'PHONE_NUMBER' && <input dir="ltr" className="cp-grow" aria-label={t('Phone number')} value={b.phone_number} onChange={e => patchButton(b.key, { phone_number: e.target.value })} placeholder="+20…" />}
                <button type="button" className="cp-btn cp-btn-ghost" aria-label={t('Remove button')} onClick={() => setButtons(list => list.filter(x => x.key !== b.key))}><X size={16} aria-hidden="true" /></button>
              </div>
            ))}
          </section>
        </div>

        <aside className="wt-preview" aria-label={t('Preview')}>
          <span className="wt-caps">{t('Live preview')}</span>
          <div className="wt-phone">
            <div className="cp-wa-bubble">
              {headerKind !== 'NONE' && headerKind !== 'TEXT' && <div className="wt-media">{t(headerKind === 'IMAGE' ? 'Image' : headerKind === 'VIDEO' ? 'Video' : 'Document')}</div>}
              {previewHeader && <b>{previewHeader}</b>}
              <p>{body ? fill(body, ex) : t('Your message appears here.')}</p>
              {footer && <span className="cp-muted cp-small">{footer}</span>}
              <small>10:42</small>
            </div>
            {buttons.map(b => (
              <div key={b.key} className="cp-wa-bubble wt-wa-btn">
                {b.type === 'URL' && <ExternalLink size={14} aria-hidden="true" />}{b.type === 'PHONE_NUMBER' && <Phone size={14} aria-hidden="true" />}{b.text || t('Button')}
              </div>
            ))}
          </div>
          <div className="cp-card cp-stack-sm">
            <b>{t('Before you submit')}</b>
            {checks.map(c => <span key={c.label} className={c.ok ? 'wt-check is-ok' : 'wt-check'}>{c.ok ? '✓' : '•'} {t(c.label)}</span>)}
          </div>
        </aside>
      </div>
    </div>
  )
}
