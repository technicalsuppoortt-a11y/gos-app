import { gosRequest } from '../../backend/gosApi'

/**
 * WhatsApp campaigns on the Laravel API (ai-follow-up, CampaignController).
 * The screens use the small types below; this file maps them to and from the API's shapes.
 */

export type TemplateComponent = { type: string; format?: string; text?: string; buttons?: { type: string; text: string; url?: string }[] }
/** A template variable, keyed like the API: "body.1", "header.1", "button.0.1". */
export type TemplateVariable = { key: string; component: string; placeholder: string; example?: string | null }
export type WaTemplate = { name: string; language: string; category: string; status: string; components: TemplateComponent[]; variables: TemplateVariable[] }

export type VariableSource = { source: 'field'; field: string; fallback?: string } | { source: 'text'; value: string }

export type AudienceInput = {
  leads?: { stages: string[]; tags: string[] } | null
  csv?: { upload_id: string; phone_column: string; name_column?: string } | null
  manual?: { lead_ids: string[] } | null
  default_country_code?: string
  exclude_opted_out?: boolean
}
export type CsvUpload = { upload_id: string; filename: string | null; headers: string[]; row_count: number; suggested: { phone_column: string | null; name_column: string | null } }

export type AudiencePreview = {
  total: number
  per_source: { leads: number; csv: number; manual: number }
  duplicates: number
  invalid: number
  opted_out: number
  sample: { name: string | null; phone: string }[]
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'
export type CampaignStats = { recipients: number; sent: number; delivered: number; read: number; replied: number; failed: number }

export type Campaign = {
  id: string
  name: string
  status: CampaignStatus
  template: { name: string; language: string } | null
  variables: Record<string, VariableSource>
  audience: AudienceInput
  schedule: { mode: 'now' } | { mode: 'later'; send_at: string; timezone: string }
  stats: CampaignStats
  progress?: number
  error?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at?: string
}

export type CampaignInput = {
  name: string
  template: { name: string; language: string }
  variables: Record<string, VariableSource>
  audience: AudienceInput
  schedule: Campaign['schedule']
}

export type RecipientStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | 'skipped'
export type Recipient = { id: string; name: string | null; phone: string; status: RecipientStatus; error?: string | null; updated_at?: string | null; lead_id?: string | null }

/* ---------------------------------------------------------- API shapes */

type ApiVariable = { type: 'field' | 'text'; field?: string | null; value?: string | null; fallback?: string | null }
type ApiAudience = {
  leads?: { enabled?: boolean; stages?: string[]; tags?: string[] }
  lead_ids?: string[]
  csv?: { upload_id: string; phone_column: string; name_column?: string | null } | null
  default_country_code?: string | null
  exclude_opted_out?: boolean
}
type ApiCampaign = {
  id: string; name: string; status: CampaignStatus
  template: { name: string; language: string } | null
  variables: Record<string, ApiVariable>
  audience: ApiAudience
  schedule: { mode: 'now' | 'later'; send_at?: string | null; timezone?: string | null }
  counts: CampaignStats
  queued?: number
  error?: string | null
  created_at?: string; started_at?: string | null; completed_at?: string | null
}
type ApiRecipient = Recipient & { sent_at?: string | null; delivered_at?: string | null; read_at?: string | null; replied_at?: string | null; failed_at?: string | null }

const toApiVariables = (vars: Record<string, VariableSource>): Record<string, ApiVariable> =>
  Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v.source === 'text' ? { type: 'text', value: v.value } : { type: 'field', field: v.field, fallback: v.fallback || null }]))

const fromApiVariables = (vars: Record<string, ApiVariable> | undefined): Record<string, VariableSource> =>
  Object.fromEntries(Object.entries(vars ?? {}).map(([k, v]) => [k, v.type === 'text' ? { source: 'text', value: v.value ?? '' } : { source: 'field', field: v.field ?? 'name', fallback: v.fallback ?? '' }]))

const toApiAudience = (a: AudienceInput): ApiAudience => ({
  leads: { enabled: !!a.leads, stages: a.leads?.stages ?? [], tags: a.leads?.tags ?? [] },
  lead_ids: a.manual?.lead_ids ?? [],
  csv: a.csv ? { upload_id: a.csv.upload_id, phone_column: a.csv.phone_column, name_column: a.csv.name_column || null } : null,
  default_country_code: a.default_country_code ?? null,
  exclude_opted_out: a.exclude_opted_out ?? true,
})

const fromApiAudience = (a: ApiAudience | undefined): AudienceInput => ({
  leads: a?.leads?.enabled ? { stages: a.leads.stages ?? [], tags: a.leads.tags ?? [] } : null,
  csv: a?.csv ? { upload_id: a.csv.upload_id, phone_column: a.csv.phone_column, name_column: a.csv.name_column ?? undefined } : null,
  manual: a?.lead_ids?.length ? { lead_ids: a.lead_ids } : null,
  default_country_code: a?.default_country_code ?? undefined,
  exclude_opted_out: a?.exclude_opted_out ?? true,
})

const toApiCampaign = (c: CampaignInput) => ({
  name: c.name,
  template: c.template,
  variables: toApiVariables(c.variables),
  audience: toApiAudience(c.audience),
  schedule: c.schedule,
})

function fromApiCampaign(c: ApiCampaign): Campaign {
  const s = c.counts
  const done = s.sent + s.failed
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    template: c.template,
    variables: fromApiVariables(c.variables),
    audience: fromApiAudience(c.audience),
    schedule: c.schedule.mode === 'later' && c.schedule.send_at ? { mode: 'later', send_at: c.schedule.send_at, timezone: c.schedule.timezone ?? 'UTC' } : { mode: 'now' },
    stats: s,
    progress: s.recipients ? Math.round((done / s.recipients) * 100) : 0,
    error: c.error ?? null,
    created_at: c.created_at,
    started_at: c.started_at ?? null,
    completed_at: c.completed_at ?? null,
  }
}

const lastUpdate = (r: ApiRecipient) => r.failed_at ?? r.replied_at ?? r.read_at ?? r.delivered_at ?? r.sent_at ?? null

/* ---------------------------------------------------------------- calls */

const id = (value: string) => encodeURIComponent(value)

export const campaignsApi = {
  templates: (refresh = false) =>
    gosRequest<{ templates: WaTemplate[] }>(`/campaigns/templates${refresh ? '?refresh=1' : ''}`).then(r => r.templates),
  list: () => gosRequest<{ campaigns: ApiCampaign[] }>('/campaigns').then(r => r.campaigns.map(fromApiCampaign)),
  get: (campaignId: string) => gosRequest<{ campaign: ApiCampaign }>(`/campaigns/${id(campaignId)}`).then(r => fromApiCampaign(r.campaign)),
  /** Creates (or updates a draft), then launches it when `send` is set: launch sends now or schedules it. */
  save: async (body: CampaignInput, opts: { draftId?: string; send: boolean }) => {
    const saved = opts.draftId
      ? await gosRequest<{ campaign: ApiCampaign }>(`/campaigns/${id(opts.draftId)}`, { method: 'PATCH', body: toApiCampaign(body) })
      : await gosRequest<{ campaign: ApiCampaign }>('/campaigns', { method: 'POST', body: toApiCampaign(body) })
    if (!opts.send) return fromApiCampaign(saved.campaign)
    const launched = await gosRequest<{ campaign: ApiCampaign }>(`/campaigns/${id(saved.campaign.id)}/launch`, { method: 'POST', body: {} })
    return fromApiCampaign(launched.campaign)
  },
  remove: (campaignId: string) => gosRequest(`/campaigns/${id(campaignId)}`, { method: 'DELETE' }),
  cancel: (campaignId: string) => gosRequest(`/campaigns/${id(campaignId)}/cancel`, { method: 'POST', body: {} }),
  duplicate: (campaignId: string) => gosRequest<{ campaign: ApiCampaign }>(`/campaigns/${id(campaignId)}/duplicate`, { method: 'POST', body: {} }).then(r => fromApiCampaign(r.campaign)),
  resendFailed: (campaignId: string) => gosRequest(`/campaigns/${id(campaignId)}/resend-failed`, { method: 'POST', body: {} }),
  uploadCsv: (content: string, filename: string) => {
    const form = new FormData()
    form.append('file', new File([content], filename || 'audience.csv', { type: 'text/csv' }))
    return gosRequest<CsvUpload>('/campaigns/audience/upload', { method: 'POST', body: form })
  },
  previewAudience: (audience: AudienceInput) =>
    gosRequest<{ total: number; sources: { leads: number; csv: number; manual: number }; duplicates_removed: number; opted_out_excluded: number; invalid: { count: number }; sample: { name: string | null; phone: string }[] }>(
      '/campaigns/audience/preview', { method: 'POST', body: { audience: toApiAudience(audience) } },
    ).then((r): AudiencePreview => ({
      total: r.total, per_source: r.sources, duplicates: r.duplicates_removed, invalid: r.invalid.count, opted_out: r.opted_out_excluded, sample: r.sample,
    })),
  sendTest: (body: { template: { name: string; language: string }; variables: Record<string, VariableSource>; phone: string; default_country_code?: string }) =>
    gosRequest('/campaigns/test-message', { method: 'POST', body: { ...body, variables: toApiVariables(body.variables) } }),
  recipients: (campaignId: string, status?: RecipientStatus) =>
    gosRequest<{ recipients: ApiRecipient[]; total: number }>(`/campaigns/${id(campaignId)}/recipients?per_page=200${status ? `&status=${status}` : ''}`)
      .then(r => r.recipients.map((x): Recipient => ({ ...x, updated_at: lastUpdate(x) }))),
  exportRecipients: (campaignId: string) => gosRequest<string>(`/campaigns/${id(campaignId)}/recipients/export`, { csv: true }),
}

/** Fills {{n}} in one component's text for the preview, from values keyed "body.n" / "header.n". */
export function fillTemplate(text: string, values: Record<string, string>, component: 'body' | 'header') {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, n) => values[`${component}.${n}`] ?? `{{${n}}}`)
}
