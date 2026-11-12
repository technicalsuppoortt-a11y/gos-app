import React from 'react'
import { ArrowLeft, Check, Copy, Download, FileUp, Info, Megaphone, Plus, RefreshCw, Search, Send, X } from 'lucide-react'
import { gosApi } from '../../backend/gosApi'
import { useUILanguage, translateText as t } from '../../i18n/display'
import i18n from '../../i18n/i18n'
import { showToast } from '../../utils/toast'
import { api as channelApi, type Channel } from '../flow-builder/api'
import {
  campaignsApi, fillTemplate,
  type AudienceInput, type AudiencePreview, type Campaign, type CampaignInput, type CampaignStatus,
  type Recipient, type RecipientStatus, type VariableSource, type WaTemplate,
} from './api'
import './campaigns.css'

type View = { name: 'list' } | { name: 'edit'; campaign?: Campaign } | { name: 'report'; id: string }
type Lead = { id: string; name?: string; phone?: string; tags?: string[]; lifecycle_stage?: string }
type Stage = { id: string; label: string }

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Draft', scheduled: 'Scheduled', sending: 'Sending', completed: 'Completed', cancelled: 'Cancelled', failed: 'Failed',
}
const LEAD_FIELDS = [
  { value: 'name', label: 'Contact name' },
  { value: 'first_name', label: 'First name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
]
const COUNTRIES = [
  { value: '20', label: 'Egypt +20' }, { value: '966', label: 'Saudi Arabia +966' }, { value: '971', label: 'UAE +971' },
  { value: '965', label: 'Kuwait +965' }, { value: '974', label: 'Qatar +974' }, { value: '962', label: 'Jordan +962' },
]

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString(i18n.language.startsWith('ar') ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const bodyOf = (tpl?: WaTemplate) => tpl?.components.find(c => c.type.toUpperCase() === 'BODY')?.text ?? ''
const headerOf = (tpl?: WaTemplate) => tpl?.components.find(c => c.type.toUpperCase() === 'HEADER' && c.text)?.text ?? ''
const varLabel = (key: string) => { const [component, ...rest] = key.split('.'); const name = rest[rest.length - 1]; return component === 'body' ? `{{${name}}}` : `${component} {{${name}}}` }
const buttonsOf = (tpl?: WaTemplate) => tpl?.components.find(c => c.type.toUpperCase() === 'BUTTONS')?.buttons ?? []

export function CampaignsTab() {
  useUILanguage()
  const [view, setView] = React.useState<View>({ name: 'list' })
  return (
    <div className="cp-root">
      {view.name === 'list' && <CampaignList onNew={() => setView({ name: 'edit' })} onOpen={c => setView(c.status === 'draft' ? { name: 'edit', campaign: c } : { name: 'report', id: c.id })} />}
      {view.name === 'edit' && <CampaignWizard initial={view.campaign} onDone={() => setView({ name: 'list' })} />}
      {view.name === 'report' && <CampaignReport id={view.id} onBack={() => setView({ name: 'list' })} onDuplicate={c => setView({ name: 'edit', campaign: c })} />}
    </div>
  )
}

/* ------------------------------------------------------------------ list */

function CampaignList({ onNew, onOpen }: { onNew: () => void; onOpen: (c: Campaign) => void }) {
  const [campaigns, setCampaigns] = React.useState<Campaign[] | null>(null)
  const [error, setError] = React.useState('')
  const [filter, setFilter] = React.useState<CampaignStatus | 'all'>('all')
  const [query, setQuery] = React.useState('')

  const load = React.useCallback(() => {
    setError('')
    campaignsApi.list().then(setCampaigns).catch(e => { setCampaigns([]); setError(errorText(e)) })
  }, [])
  React.useEffect(load, [load])

  const all = campaigns ?? []
  const totals = all.reduce((sum, c) => ({
    sent: sum.sent + c.stats.sent, delivered: sum.delivered + c.stats.delivered, read: sum.read + c.stats.read, replied: sum.replied + c.stats.replied,
  }), { sent: 0, delivered: 0, read: 0, replied: 0 })
  const shown = all.filter(c => (filter === 'all' || c.status === filter) && c.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="cp-stack">
      <header className="cp-head">
        <div>
          <h2>{t('WhatsApp campaigns')}</h2>
          <p className="cp-muted">{t('Send approved Meta templates to your customers, now or at a time you choose.')}</p>
        </div>
        <button type="button" className="cp-btn cp-btn-primary" onClick={onNew}><Plus size={17} />{t('New campaign')}</button>
      </header>

      <div className="cp-kpis">
        <Kpi label={t('Messages sent')} value={totals.sent.toLocaleString()} />
        <Kpi label={t('Delivery rate')} value={`${pct(totals.delivered, totals.sent)}%`} />
        <Kpi label={t('Read rate')} value={`${pct(totals.read, totals.delivered)}%`} />
        <Kpi label={t('Customer replies')} value={totals.replied.toLocaleString()} />
      </div>

      <section className="cp-card cp-flush">
        <div className="cp-toolbar">
          <div className="cp-chips" role="tablist" aria-label={t('Filter by status')}>
            {(['all', 'scheduled', 'sending', 'completed', 'draft'] as const).map(s => (
              <button key={s} type="button" role="tab" aria-selected={filter === s} className={filter === s ? 'is-active' : ''} onClick={() => setFilter(s)}>
                {t(s === 'all' ? 'All' : STATUS_LABEL[s])}
              </button>
            ))}
          </div>
          <label className="cp-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" dir="auto" placeholder={t('Search by campaign name')} value={query} onChange={e => setQuery(e.target.value)} />
          </label>
        </div>
        {error && <p className="cp-error cp-pad" role="alert">{error} <button type="button" className="cp-link" onClick={load}>{t('Retry')}</button></p>}
        {campaigns === null && <p className="cp-muted cp-pad">{t('Loading…')}</p>}
        {campaigns !== null && !error && shown.length === 0 && (
          <div className="cp-empty">
            <Megaphone size={28} aria-hidden="true" />
            <b>{t(all.length ? 'No campaigns match this filter' : 'No campaigns yet')}</b>
            {!all.length && <button type="button" className="cp-btn cp-btn-primary" onClick={onNew}><Plus size={16} />{t('New campaign')}</button>}
          </div>
        )}
        {shown.length > 0 && (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead><tr><th>{t('Campaign')}</th><th>{t('Template')}</th><th>{t('Status')}</th><th>{t('Recipients')}</th><th>{t('Delivered / read')}</th><th>{t('Schedule')}</th></tr></thead>
              <tbody>
                {shown.map(c => (
                  <tr key={c.id}>
                    <td><button type="button" className="cp-row-link" dir="auto" onClick={() => onOpen(c)}>{c.name}</button></td>
                    <td className="cp-muted" dir="ltr">{c.template ? `${c.template.name} · ${c.template.language}` : '—'}</td>
                    <td><StatusBadge status={c.status} progress={c.progress} /></td>
                    <td>{c.stats.recipients ? c.stats.recipients.toLocaleString() : '—'}</td>
                    <td>{c.stats.sent ? `${pct(c.stats.delivered, c.stats.sent)}% / ${pct(c.stats.read, c.stats.sent)}%` : '—'}</td>
                    <td className="cp-muted">{c.status === 'sending' ? t('Now') : c.schedule.mode === 'later' ? formatDate(c.schedule.send_at) : formatDate(c.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'danger' }) {
  return <div className="cp-card cp-kpi"><span className="cp-muted">{label}</span><b className={tone === 'danger' ? 'cp-danger' : ''}>{value}</b>{hint && <small className="cp-muted">{hint}</small>}</div>
}

function StatusBadge({ status, progress }: { status: CampaignStatus | RecipientStatus; progress?: number }) {
  const label = status in STATUS_LABEL ? STATUS_LABEL[status as CampaignStatus] : status[0].toUpperCase() + status.slice(1)
  return <span className={`cp-badge cp-badge-${status}`}>{t(label)}{status === 'sending' && progress !== undefined ? ` · ${progress}%` : ''}</span>
}

/* ---------------------------------------------------------------- wizard */

type Draft = {
  name: string
  template: WaTemplate | null
  templateKey: { name: string; language: string } | null
  variables: Record<string, VariableSource>
  leads: { on: boolean; stages: string[]; tags: string[] }
  exclude_opted_out: boolean
  default_country: string
  csv: { on: boolean; file: string; upload_id: string; headers: string[]; row_count: number; phone_column: string; name_column: string }
  manual: { on: boolean; lead_ids: string[] }
  when: 'now' | 'later'
  date: string
  time: string
  timezone: string
}

const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo'

function draftFrom(c?: Campaign): Draft {
  const a = c?.audience ?? {}
  const later = c?.schedule.mode === 'later' ? c.schedule : null
  const at = later ? new Date(later.send_at) : null
  return {
    name: c ? (c.status === 'draft' ? c.name : `${c.name} (copy)`) : '',
    template: null,
    templateKey: c?.template ?? null,
    variables: c?.variables ?? {},
    leads: { on: !!a.leads, stages: a.leads?.stages ?? [], tags: a.leads?.tags ?? [] },
    exclude_opted_out: a.exclude_opted_out ?? true,
    default_country: a.default_country_code ?? '20',
    csv: a.csv ? { on: true, file: '', upload_id: a.csv.upload_id, headers: [a.csv.phone_column, a.csv.name_column ?? ''].filter(Boolean), row_count: 0, phone_column: a.csv.phone_column, name_column: a.csv.name_column ?? '' } : { on: false, file: '', upload_id: '', headers: [], row_count: 0, phone_column: '', name_column: '' },
    manual: { on: !!a.manual, lead_ids: a.manual?.lead_ids ?? [] },
    when: later ? 'later' : 'now',
    date: at ? at.toISOString().slice(0, 10) : '',
    time: at ? at.toTimeString().slice(0, 5) : '10:00',
    timezone: later?.timezone ?? localTz,
  }
}

function audienceOf(d: Draft): AudienceInput {
  return {
    leads: d.leads.on ? { stages: d.leads.stages, tags: d.leads.tags } : null,
    csv: d.csv.on && d.csv.upload_id ? { upload_id: d.csv.upload_id, phone_column: d.csv.phone_column, name_column: d.csv.name_column || undefined } : null,
    manual: d.manual.on && d.manual.lead_ids.length ? { lead_ids: d.manual.lead_ids } : null,
    default_country_code: d.default_country,
    exclude_opted_out: d.exclude_opted_out,
  }
}

function inputOf(d: Draft): CampaignInput {
  return {
    name: d.name.trim(),
    template: d.templateKey!,
    variables: d.variables,
    audience: audienceOf(d),
    schedule: d.when === 'now' ? { mode: 'now' } : { mode: 'later', send_at: new Date(`${d.date}T${d.time}`).toISOString(), timezone: d.timezone },
  }
}

function CampaignWizard({ initial, onDone }: { initial?: Campaign; onDone: () => void }) {
  const [step, setStep] = React.useState(0)
  const [draft, setDraft] = React.useState<Draft>(() => draftFrom(initial))
  const [templates, setTemplates] = React.useState<WaTemplate[] | null>(null)
  const [templatesError, setTemplatesError] = React.useState('')
  const [refreshing, setRefreshing] = React.useState(false)
  const [channel, setChannel] = React.useState<Channel | null | undefined>(undefined)
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [stages, setStages] = React.useState<Stage[]>([])
  const [preview, setPreview] = React.useState<AudiencePreview | null>(null)
  const [previewError, setPreviewError] = React.useState('')
  const [saving, setSaving] = React.useState<'' | 'draft' | 'send' | 'test'>('')
  const [error, setError] = React.useState('')
  const [draftId, setDraftId] = React.useState(initial?.status === 'draft' ? initial.id : undefined)
  const patch = (p: Partial<Draft>) => setDraft(d => ({ ...d, ...p }))

  const loadTemplates = React.useCallback((refresh = false) => {
    setRefreshing(refresh)
    setTemplatesError('')
    campaignsApi.templates(refresh)
      .then(list => setTemplates(list.filter(x => x.status.toUpperCase() === 'APPROVED')))
      .catch(e => { setTemplates([]); setTemplatesError(errorText(e)) })
      .finally(() => setRefreshing(false))
  }, [])

  React.useEffect(() => {
    loadTemplates()
    channelApi.channels().then(list => setChannel(list.find(c => c.channel === 'whatsapp' && c.status === 'connected') ?? null)).catch(() => setChannel(null))
    gosApi.leads().then(r => setLeads(r.leads as Lead[])).catch(() => setLeads([]))
    gosApi.pipelines().then(r => {
      const seen = new Map<string, Stage>()
      for (const p of r.pipelines as { stages?: Stage[] }[]) for (const s of p.stages ?? []) if (!seen.has(s.id)) seen.set(s.id, s)
      setStages([...seen.values()])
    }).catch(() => setStages([]))
  }, [loadTemplates])

  // Re-attach the full template once the list arrives (editing a draft or a copy).
  React.useEffect(() => {
    if (!templates || draft.template || !draft.templateKey) return
    const match = templates.find(x => x.name === draft.templateKey!.name && x.language === draft.templateKey!.language)
    if (match) patch({ template: match })
  }, [templates, draft.template, draft.templateKey])

  // Live audience count.
  const audienceKey = JSON.stringify(audienceOf(draft))
  React.useEffect(() => {
    const audience = audienceOf(draft)
    if (!audience.leads && !audience.csv && !audience.manual) { setPreview(null); return }
    const timer = window.setTimeout(() => {
      setPreviewError('')
      campaignsApi.previewAudience(audience).then(setPreview).catch(e => { setPreview(null); setPreviewError(errorText(e)) })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [audienceKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickTemplate = (tpl: WaTemplate) => {
    const variables: Record<string, VariableSource> = {}
    tpl.variables.forEach((v, i) => { variables[v.key] = draft.variables[v.key] ?? (i === 0 ? { source: 'field', field: 'name', fallback: '' } : { source: 'text', value: v.example ?? '' }) })
    patch({ template: tpl, templateKey: { name: tpl.name, language: tpl.language }, variables })
  }

  const sampleLead = draft.manual.on ? leads.find(l => draft.manual.lead_ids.includes(l.id)) : undefined
  const sampleName = preview?.sample[0]?.name ?? sampleLead?.name ?? t('Ahmed')
  const previewValues = Object.fromEntries(Object.entries(draft.variables).map(([k, v]) => {
    if (v.source === 'text') return [k, v.value || `{{${k}}}`]
    const value = v.field === 'name' || v.field === 'first_name' ? (v.field === 'first_name' ? sampleName.split(' ')[0] : sampleName) : v.fallback
    return [k, value || v.fallback || `{{${k}}}`]
  }))

  const variablesReady = Object.values(draft.variables).every(v => (v.source === 'text' ? v.value.trim() : v.field))
  const canNext = [
    !!draft.name.trim() && !!draft.templateKey && variablesReady,
    !!preview && preview.total > 0,
    draft.when === 'now' || (!!draft.date && !!draft.time && new Date(`${draft.date}T${draft.time}`).getTime() > Date.now()),
  ]

  const save = async (send: boolean) => {
    setSaving(send ? 'send' : 'draft')
    setError('')
    try {
      const saved = await campaignsApi.save(inputOf(draft), { draftId, send })
      setDraftId(saved.id)
      showToast.success(t(send ? (draft.when === 'now' ? 'Campaign is sending' : 'Campaign scheduled') : 'Draft saved'))
      onDone()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving('')
    }
  }

  const sendTest = async () => {
    const phone = window.prompt(t('Send a test message to this WhatsApp number (with country code):'))
    if (!phone?.trim()) return
    setSaving('test')
    setError('')
    try {
      await campaignsApi.sendTest({ template: draft.templateKey!, variables: draft.variables, phone: phone.trim(), default_country_code: draft.default_country })
      showToast.success(t('Test message sent'))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving('')
    }
  }

  const steps = ['Template', 'Audience', 'Schedule & review']

  return (
    <div className="cp-stack">
      <header className="cp-head">
        <div>
          <button type="button" className="cp-link cp-back" onClick={onDone}><ArrowLeft size={14} aria-hidden="true" />{t('Campaigns')}</button>
          <h2 dir="auto">{draft.name.trim() || t('New campaign')}</h2>
        </div>
        <ol className="cp-steps">
          {steps.map((s, i) => (
            <li key={s} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              {i < step ? <Check size={14} aria-hidden="true" /> : <span>{i + 1}</span>}{t(s)}
            </li>
          ))}
        </ol>
      </header>

      {channel === null && (
        <p className="cp-notice"><Info size={16} aria-hidden="true" />{t('Connect a WhatsApp Business number in Settings › Integrations before sending campaigns.')}</p>
      )}
      {error && <p className="cp-error" role="alert">{error}</p>}

      <div className="cp-split">
        <div className="cp-main cp-stack">
          {step === 0 && (
            <>
              <section className="cp-card cp-stack-sm">
                <label className="cp-field">{t('Campaign name')}
                  <input dir="auto" value={draft.name} onChange={e => patch({ name: e.target.value })} placeholder={t('e.g. White Friday offer')} />
                </label>
                <div className="cp-field">{t('Sending number')}
                  <div className="cp-readonly">
                    <span className={`cp-dot ${channel ? 'is-on' : ''}`} aria-hidden="true" />
                    {channel === undefined ? t('Loading…') : channel ? <span dir="ltr">{channel.name ?? channel.external_id ?? 'WhatsApp Business'}</span> : t('No WhatsApp number connected')}
                  </div>
                </div>
              </section>

              <section className="cp-card cp-stack-sm">
                <div className="cp-row-between">
                  <h3>{t('Choose an approved template')}</h3>
                  <button type="button" className="cp-btn cp-btn-ghost" disabled={refreshing} onClick={() => loadTemplates(true)}>
                    <RefreshCw size={15} className={refreshing ? 'cp-spin' : ''} aria-hidden="true" />{t('Refresh from Meta')}
                  </button>
                </div>
                {templates === null && <p className="cp-muted">{t('Loading templates…')}</p>}
                {templatesError && <p className="cp-error" role="alert">{templatesError}</p>}
                {templates?.length === 0 && !templatesError && <p className="cp-muted">{t('No approved templates yet. Create one and wait for Meta to approve it.')}</p>}
                <div className="cp-template-grid">
                  {templates?.map(tpl => {
                    const on = draft.templateKey?.name === tpl.name && draft.templateKey.language === tpl.language
                    return (
                      <button key={`${tpl.name}:${tpl.language}`} type="button" aria-pressed={on} className={`cp-template ${on ? 'is-selected' : ''}`} onClick={() => pickTemplate(tpl)}>
                        <b dir="ltr">{tpl.name}</b>
                        <span className="cp-muted">{t(tpl.category.charAt(0) + tpl.category.slice(1).toLowerCase())} · <span dir="ltr">{tpl.language}</span> · <span>{tpl.variables.length} {t('variables')}</span></span>
                      </button>
                    )
                  })}
                </div>
                <p className="cp-muted cp-small">{t('Only approved templates are listed. Templates in review or rejected cannot be used in campaigns.')}</p>
              </section>

              {draft.template && draft.template.variables.length > 0 && (
                <section className="cp-card cp-stack-sm">
                  <h3>{t('Template variables')}</h3>
                  <p className="cp-muted cp-small">{t('Link each variable to customer data or type a fixed text. The fallback is used when the data is missing.')}</p>
                  <div className="cp-vars">
                    <span className="cp-muted cp-small">{t('Variable')}</span><span className="cp-muted cp-small">{t('Value')}</span><span className="cp-muted cp-small">{t('Fallback / text')}</span>
                    {draft.template.variables.map(v => {
                      const cur = draft.variables[v.key] ?? { source: 'text', value: '' }
                      const setVar = (next: VariableSource) => patch({ variables: { ...draft.variables, [v.key]: next } })
                      const label = v.component === 'body' ? v.placeholder : `${v.component} ${v.placeholder}`
                      const fields = [...LEAD_FIELDS, ...draft.csv.headers.filter(h => !LEAD_FIELDS.some(f => f.value === h)).map(h => ({ value: h, label: h }))]
                      return (
                        <React.Fragment key={v.key}>
                          <code dir="ltr">{label}</code>
                          <select aria-label={t(`Value for variable ${label}`)} value={cur.source === 'text' ? '__text' : cur.field}
                            onChange={e => setVar(e.target.value === '__text' ? { source: 'text', value: '' } : { source: 'field', field: e.target.value, fallback: cur.source === 'field' ? cur.fallback : '' })}>
                            {fields.map(f => <option key={f.value} value={f.value}>{t(f.label)}</option>)}
                            <option value="__text">{t('Fixed text')}</option>
                          </select>
                          <input dir="auto" aria-label={t(`Fallback for variable ${label}`)} value={cur.source === 'text' ? cur.value : cur.fallback ?? ''}
                            placeholder={t(cur.source === 'text' ? 'Text' : 'e.g. Dear customer')}
                            onChange={e => setVar(cur.source === 'text' ? { source: 'text', value: e.target.value } : { ...cur, fallback: e.target.value })} />
                        </React.Fragment>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {step === 1 && (
            <AudienceStep draft={draft} patch={patch} leads={leads} stages={stages} preview={preview} />
          )}

          {step === 2 && (
            <>
              <section className="cp-card cp-stack-sm">
                <h3>{t('When to send')}</h3>
                <div className="cp-choice-grid">
                  {(['now', 'later'] as const).map(w => (
                    <label key={w} className={`cp-choice ${draft.when === w ? 'is-selected' : ''}`}>
                      <input type="radio" name="when" checked={draft.when === w} onChange={() => patch({ when: w })} />
                      <span><b>{t(w === 'now' ? 'Send now' : 'Schedule for later')}</b><small className="cp-muted">{t(w === 'now' ? 'Sending starts right after you confirm' : 'Pick a date and time')}</small></span>
                    </label>
                  ))}
                </div>
                {draft.when === 'later' && (
                  <div className="cp-grid-3">
                    <label className="cp-field">{t('Date')}<input type="date" value={draft.date} min={new Date().toISOString().slice(0, 10)} onChange={e => patch({ date: e.target.value })} /></label>
                    <label className="cp-field">{t('Time')}<input type="time" value={draft.time} onChange={e => patch({ time: e.target.value })} /></label>
                    <label className="cp-field">{t('Time zone')}<input dir="ltr" value={draft.timezone} onChange={e => patch({ timezone: e.target.value })} /></label>
                  </div>
                )}
              </section>

              <section className="cp-card cp-stack-sm">
                <h3>{t('Review campaign')}</h3>
                <dl className="cp-review">
                  <dt>{t('Sending number')}</dt><dd dir="ltr">{channel ? channel.name ?? channel.external_id ?? 'WhatsApp Business' : '—'}</dd>
                  <dt>{t('Template')}</dt><dd><span dir="ltr">{draft.templateKey?.name}</span> · {draft.templateKey?.language} <button type="button" className="cp-link" onClick={() => setStep(0)}>{t('Edit')}</button></dd>
                  <dt>{t('Variables')}</dt><dd>{Object.entries(draft.variables).map(([k, v]) => (
                    <span key={k} className="cp-var-line"><code dir="ltr">{varLabel(k)}</code> {v.source === 'text' ? v.value : `${t(LEAD_FIELDS.find(f => f.value === v.field)?.label ?? v.field)}${v.fallback ? ` (${t('fallback')}: ${v.fallback})` : ''}`}</span>
                  ))}{!Object.keys(draft.variables).length && '—'}</dd>
                  <dt>{t('Audience')}</dt><dd>{preview?.total.toLocaleString() ?? '—'} {t('recipients')} <button type="button" className="cp-link" onClick={() => setStep(1)}>{t('Edit')}</button></dd>
                  <dt>{t('Schedule')}</dt><dd>{draft.when === 'now' ? t('Send now') : `${formatDate(new Date(`${draft.date}T${draft.time}`).toISOString())} · ${draft.timezone}`}</dd>
                </dl>
              </section>

              <p className="cp-notice cp-warn"><Info size={16} aria-hidden="true" />{t('Meta charges template messages per conversation, and WhatsApp may limit how many you can send a day based on your number’s quality rating.')}</p>
            </>
          )}

          <div className="cp-row-between">
            {step === 0
              ? <button type="button" className="cp-btn" disabled={!!saving || !draft.name.trim() || !draft.templateKey} onClick={() => void save(false)}>{t(saving === 'draft' ? 'Saving…' : 'Save as draft')}</button>
              : <button type="button" className="cp-btn" onClick={() => setStep(step - 1)}>{t('Back')}</button>}
            <div className="cp-row">
              {step === 2 && (
                <button type="button" className="cp-btn" disabled={!!saving || !channel} onClick={() => void sendTest()}><Send size={15} aria-hidden="true" />{t(saving === 'test' ? 'Sending…' : 'Send me a test')}</button>
              )}
              {step < 2
                ? <button type="button" className="cp-btn cp-btn-primary" disabled={!canNext[step]} onClick={() => setStep(step + 1)}>{t(step === 0 ? 'Next: audience' : 'Next: schedule')}</button>
                : <button type="button" className="cp-btn cp-btn-primary" disabled={!!saving || !canNext[2] || !channel} onClick={() => void save(true)}>
                    {t(saving === 'send' ? 'Saving…' : draft.when === 'now' ? 'Send campaign' : 'Schedule campaign')}
                  </button>}
            </div>
          </div>
        </div>

        <aside className="cp-side cp-card cp-stack-sm">
          {step === 1 ? (
            <>
              <h3>{t('Total recipients')}</h3>
              <b className="cp-total">{preview ? preview.total.toLocaleString() : '—'}</b>
              {previewError && <p className="cp-error cp-small" role="alert">{previewError}</p>}
              {preview && (
                <dl className="cp-breakdown">
                  {draft.leads.on && <><dt>{t('Leads')}</dt><dd>{preview.per_source.leads.toLocaleString()}</dd></>}
                  {draft.csv.on && <><dt>{t('CSV file')}</dt><dd>{preview.per_source.csv.toLocaleString()}</dd></>}
                  {draft.manual.on && <><dt>{t('Manual selection')}</dt><dd>{preview.per_source.manual.toLocaleString()}</dd></>}
                  <dt className="cp-muted">{t('Duplicates removed')}</dt><dd className="cp-muted">−{preview.duplicates.toLocaleString()}</dd>
                  {preview.invalid > 0 && <><dt className="cp-muted">{t('Invalid numbers skipped')}</dt><dd className="cp-muted">−{preview.invalid.toLocaleString()}</dd></>}
                </dl>
              )}
              {!preview && !previewError && <p className="cp-muted cp-small">{t('Pick at least one source to see who will receive this campaign.')}</p>}
            </>
          ) : (
            <>
              <h3>{t('Message preview')}</h3>
              <MessagePreview template={draft.template} values={previewValues} time={draft.when === 'later' ? draft.time : undefined} />
              <p className="cp-muted cp-small">{t('Preview uses the first recipient’s data.')}</p>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function AudienceStep({ draft, patch, leads, stages, preview }: { draft: Draft; patch: (p: Partial<Draft>) => void; leads: Lead[]; stages: Stage[]; preview: AudiencePreview | null }) {
  const [tagInput, setTagInput] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [csvError, setCsvError] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const allTags = React.useMemo(() => [...new Set(leads.flatMap(l => l.tags ?? []))].sort(), [leads])
  const matches = leads.filter(l => l.phone && `${l.name ?? ''} ${l.phone}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 50)
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter(x => x !== value) : [...list, value])

  const onFile = async (file?: File) => {
    if (!file) return
    setCsvError('')
    try {
      setUploading(true)
      const up = await campaignsApi.uploadCsv(await file.text(), file.name)
      if (!up.headers.length || !up.row_count) throw new Error(t('The file is empty.'))
      patch({ csv: { on: true, file: up.filename ?? file.name, upload_id: up.upload_id, headers: up.headers, row_count: up.row_count, phone_column: up.suggested.phone_column ?? up.headers[0], name_column: up.suggested.name_column ?? '' } })
    } catch (e) {
      setCsvError(errorText(e))
    } finally {
      setUploading(false)
    }
  }

  const sourceHead = (title: string, on: boolean, setOn: (v: boolean) => void, count?: number) => (
    <div className="cp-row-between">
      <label className="cp-toggle-label"><input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} /><h3>{t(title)}</h3></label>
      {on && count !== undefined && <span className="cp-count">{count.toLocaleString()}</span>}
    </div>
  )

  return (
    <>
      <p className="cp-muted">{t('Combine recipients from one or more sources. Duplicate numbers are removed automatically.')}</p>

      <section className="cp-card cp-stack-sm">
        {sourceHead('Leads by stage or tag', draft.leads.on, on => patch({ leads: { ...draft.leads, on } }), preview?.per_source.leads)}
        {draft.leads.on && (
          <>
            <div className="cp-field">{t('Stages')}
              <div className="cp-chip-pick">
                {stages.length === 0 && <span className="cp-muted cp-small">{t('No pipeline stages yet')}</span>}
                {stages.map(s => (
                  <button key={s.id} type="button" aria-pressed={draft.leads.stages.includes(s.id)} className={draft.leads.stages.includes(s.id) ? 'is-active' : ''}
                    onClick={() => patch({ leads: { ...draft.leads, stages: toggle(draft.leads.stages, s.id) } })}>{t(s.label)}</button>
                ))}
              </div>
            </div>
            <div className="cp-field">{t('Tags')}
              <div className="cp-chip-pick">
                {draft.leads.tags.map(tag => (
                  <button key={tag} type="button" className="is-active" aria-label={t(`Remove ${tag}`)} onClick={() => patch({ leads: { ...draft.leads, tags: draft.leads.tags.filter(x => x !== tag) } })}>
                    <span dir="auto">{tag}</span><X size={12} aria-hidden="true" />
                  </button>
                ))}
                <input list="cp-tags" dir="auto" value={tagInput} placeholder={t('Add a tag')} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== 'Enter' || !tagInput.trim()) return
                    e.preventDefault()
                    patch({ leads: { ...draft.leads, tags: [...new Set([...draft.leads.tags, tagInput.trim()])] } })
                    setTagInput('')
                  }} />
                <datalist id="cp-tags">{allTags.map(tag => <option key={tag} value={tag} />)}</datalist>
              </div>
            </div>
            <p className="cp-muted cp-small">{t('No stage and no tag selected means all leads with a phone number.')}</p>
            <label className="cp-check"><input type="checkbox" checked={draft.exclude_opted_out} onChange={e => patch({ exclude_opted_out: e.target.checked })} />{t('Exclude contacts who opted out of marketing messages')}</label>
          </>
        )}
      </section>

      <section className="cp-card cp-stack-sm">
        {sourceHead('Upload a CSV file', draft.csv.on, on => patch({ csv: { ...draft.csv, on } }), preview?.per_source.csv)}
        {draft.csv.on && (
          <>
            <label className="cp-drop">
              <FileUp size={22} aria-hidden="true" />
              <span className="cp-grow">
                <b dir="auto">{uploading ? t('Uploading…') : draft.csv.file || (draft.csv.upload_id ? t('Uploaded file') : t('Choose a CSV file'))}</b>
                <small className="cp-muted">{draft.csv.row_count ? `${draft.csv.row_count.toLocaleString()} ${t('rows')}${preview?.invalid ? ` · ${preview.invalid} ${t('invalid numbers will be skipped')}` : ''}` : t('First row must be the column names')}</small>
              </span>
              <span className="cp-btn">{t(draft.csv.file ? 'Replace file' : 'Choose file')}</span>
              <input type="file" accept=".csv,text/csv" className="cp-sr-only" onChange={e => void onFile(e.target.files?.[0])} />
            </label>
            {csvError && <p className="cp-error cp-small" role="alert">{csvError}</p>}
            {draft.csv.headers.length > 0 && (
              <div className="cp-grid-3">
                <label className="cp-field">{t('Phone column')}
                  <select value={draft.csv.phone_column} onChange={e => patch({ csv: { ...draft.csv, phone_column: e.target.value } })}>{draft.csv.headers.map(h => <option key={h} value={h}>{h}</option>)}</select>
                </label>
                <label className="cp-field">{t('Name column')}
                  <select value={draft.csv.name_column} onChange={e => patch({ csv: { ...draft.csv, name_column: e.target.value } })}>
                    <option value="">{t('None')}</option>{draft.csv.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label className="cp-field">{t('Default country code')}
                  <select value={draft.default_country} onChange={e => patch({ default_country: e.target.value })}>{COUNTRIES.map(c => <option key={c.value} value={c.value}>{t(c.label)}</option>)}</select>
                </label>
              </div>
            )}
            <a className="cp-link cp-small" download="campaign-sample.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent('phone,name\n+201001234567,Ahmed Samy\n')}`}>{t('Download a sample file')}</a>
          </>
        )}
      </section>

      <section className="cp-card cp-stack-sm">
        {sourceHead('Manual selection', draft.manual.on, on => patch({ manual: { ...draft.manual, on } }), draft.manual.lead_ids.length)}
        {draft.manual.on && (
          <>
            <label className="cp-search"><Search size={16} aria-hidden="true" /><input type="search" dir="auto" placeholder={t('Search by name or number')} value={search} onChange={e => setSearch(e.target.value)} /></label>
            <div className="cp-pick-list">
              {matches.length === 0 && <p className="cp-muted cp-small">{t('No contacts with a phone number found')}</p>}
              {matches.map(l => (
                <label key={l.id} className="cp-pick-row">
                  <input type="checkbox" checked={draft.manual.lead_ids.includes(l.id)} onChange={() => patch({ manual: { ...draft.manual, lead_ids: toggle(draft.manual.lead_ids, l.id) } })} />
                  <span className="cp-grow" dir="auto">{l.name || '—'}</span>
                  <span className="cp-muted" dir="ltr">{l.phone}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  )
}

function MessagePreview({ template, values, time }: { template: WaTemplate | null; values: Record<string, string>; time?: string }) {
  if (!template) return <div className="cp-wa"><p className="cp-muted cp-small cp-center">{t('Choose a template to see the message.')}</p></div>
  const header = fillTemplate(headerOf(template), values, 'header')
  const body = fillTemplate(bodyOf(template), values, 'body')
  return (
    <div className="cp-wa">
      <div className="cp-wa-bubble" dir="auto">
        {header && <b>{header}</b>}
        <p>{body}</p>
        <small>{time ?? new Date().toTimeString().slice(0, 5)}</small>
        {buttonsOf(template).map(b => <span key={b.text} className="cp-wa-button">{b.text}</span>)}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- report */

function CampaignReport({ id, onBack, onDuplicate }: { id: string; onBack: () => void; onDuplicate: (c: Campaign) => void }) {
  const [campaign, setCampaign] = React.useState<Campaign | null>(null)
  const [recipients, setRecipients] = React.useState<Recipient[] | null>(null)
  const [filter, setFilter] = React.useState<RecipientStatus | 'all'>('all')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState('')

  const load = React.useCallback(() => {
    campaignsApi.get(id).then(setCampaign).catch(e => setError(errorText(e)))
  }, [id])
  React.useEffect(() => {
    load()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load() }, 15000)
    return () => window.clearInterval(timer)
  }, [load])
  React.useEffect(() => {
    setRecipients(null)
    campaignsApi.recipients(id, filter === 'all' ? undefined : filter).then(setRecipients).catch(e => { setRecipients([]); setError(errorText(e)) })
  }, [id, filter])

  const run = async (key: string, action: () => Promise<unknown>, done: string) => {
    setBusy(key)
    setError('')
    try { await action(); showToast.success(t(done)); load() } catch (e) { setError(errorText(e)) } finally { setBusy('') }
  }

  const exportCsv = () => run('export', async () => {
    const csv = await campaignsApi.exportRecipients(id)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${campaign?.name ?? 'campaign'}-recipients.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, 'Export ready')

  if (!campaign) return <div className="cp-stack">{error ? <p className="cp-error" role="alert">{error}</p> : <p className="cp-muted">{t('Loading…')}</p>}</div>
  const s = campaign.stats
  const funnel = [
    { label: 'Sent', value: s.sent }, { label: 'Delivered', value: s.delivered }, { label: 'Read', value: s.read }, { label: 'Replied', value: s.replied },
  ]

  return (
    <div className="cp-stack">
      <header className="cp-head">
        <div>
          <button type="button" className="cp-link cp-back" onClick={onBack}><ArrowLeft size={14} aria-hidden="true" />{t('Campaigns')}</button>
          <div className="cp-row"><h2 dir="auto">{campaign.name}</h2><StatusBadge status={campaign.status} progress={campaign.progress} /></div>
          <p className="cp-muted cp-small"><span dir="ltr">{campaign.template?.name}</span> · {campaign.schedule.mode === 'later' && campaign.status === 'scheduled' ? `${t('Scheduled for')} ${formatDate(campaign.schedule.send_at)}` : `${t('Started')} ${formatDate(campaign.started_at)}`}</p>
        </div>
        <div className="cp-row cp-wrap">
          {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
            <button type="button" className="cp-btn" disabled={!!busy} onClick={() => { if (window.confirm(t('Stop this campaign? Messages already sent stay sent.'))) void run('cancel', () => campaignsApi.cancel(id), 'Campaign cancelled') }}>{t('Cancel campaign')}</button>
          )}
          <button type="button" className="cp-btn" disabled={!!busy} onClick={() => void exportCsv()}><Download size={15} aria-hidden="true" />{t('Export CSV')}</button>
          {s.failed > 0 && campaign.status !== 'sending' && (
            <button type="button" className="cp-btn" disabled={!!busy} onClick={() => void run('resend', () => campaignsApi.resendFailed(id), 'Resending to failed recipients')}><RefreshCw size={15} aria-hidden="true" />{t('Resend to failed')}</button>
          )}
          <button type="button" className="cp-btn cp-btn-primary" disabled={!!busy} onClick={() => onDuplicate(campaign)}><Copy size={15} aria-hidden="true" />{t('Duplicate campaign')}</button>
        </div>
      </header>
      {error && <p className="cp-error" role="alert">{error}</p>}

      <div className="cp-kpis cp-kpis-6">
        <Kpi label={t('Recipients')} value={s.recipients.toLocaleString()} />
        <Kpi label={t('Sent')} value={s.sent.toLocaleString()} hint={`${pct(s.sent, s.recipients)}%`} />
        <Kpi label={t('Delivered')} value={s.delivered.toLocaleString()} hint={`${pct(s.delivered, s.recipients)}%`} />
        <Kpi label={t('Read')} value={s.read.toLocaleString()} hint={`${pct(s.read, s.recipients)}%`} />
        <Kpi label={t('Replied')} value={s.replied.toLocaleString()} hint={`${pct(s.replied, s.recipients)}%`} />
        <Kpi label={t('Failed')} value={s.failed.toLocaleString()} hint={`${pct(s.failed, s.recipients)}%`} tone={s.failed ? 'danger' : undefined} />
      </div>

      <section className="cp-card cp-stack-sm">
        <h3>{t('Message funnel')}</h3>
        {funnel.map(f => (
          <div key={f.label} className="cp-bar-row">
            <span>{t(f.label)}</span>
            <div className="cp-bar" role="img" aria-label={`${t(f.label)} ${pct(f.value, s.recipients)}%`}><div style={{ width: `${pct(f.value, s.recipients)}%` }} /></div>
            <span className="cp-end">{pct(f.value, s.recipients)}%</span>
          </div>
        ))}
      </section>

      <section className="cp-card cp-flush">
        <div className="cp-toolbar">
          <h3>{t('Recipients')}</h3>
          <div className="cp-chips" role="tablist" aria-label={t('Filter recipients')}>
            {(['all', 'replied', 'read', 'failed'] as const).map(f => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>{t(f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1))}</button>
            ))}
          </div>
        </div>
        {recipients === null ? <p className="cp-muted cp-pad">{t('Loading…')}</p> : recipients.length === 0 ? <p className="cp-muted cp-pad">{t('No recipients here')}</p> : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead><tr><th>{t('Customer')}</th><th>{t('Number')}</th><th>{t('Status')}</th><th>{t('Last update')}</th><th><span className="cp-sr-only">{t('Actions')}</span></th></tr></thead>
              <tbody>
                {recipients.map(r => (
                  <tr key={r.id}>
                    <td dir="auto">{r.name || '—'}</td>
                    <td className="cp-muted" dir="ltr">{r.phone}</td>
                    <td><StatusBadge status={r.status} />{r.error && <small className="cp-muted cp-error-reason" dir="auto">{r.error}</small>}</td>
                    <td className="cp-muted">{formatDate(r.updated_at)}</td>
                    <td>{r.lead_id && r.status === 'replied' && <a className="cp-link" href={`/dashboard/inbox?channel=whatsapp&leadId=${encodeURIComponent(r.lead_id)}`}>{t('Open conversation')}</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
