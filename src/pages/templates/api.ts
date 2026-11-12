import { gosRequest } from '../../backend/gosApi'
import type { WaTemplate } from '../campaigns/api'

export type { TemplateStatus, TemplateQuality, WaTemplate } from '../campaigns/api'

/**
 * WhatsApp message templates on the Laravel API (ai-follow-up, TemplateController).
 * Templates are managed on Meta: a new one starts PENDING until Meta reviews it.
 */

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'

export type TemplateHeaderDraft =
  /** Text header: at most 60 characters and one variable {{1}} (give its example). */
  | { format: 'TEXT'; text: string; example?: string }
  /** Media header: Meta needs an example media handle (or URL) for review. */
  | { format: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; media_handle: string }

export type TemplateButtonDraft =
  | { type: 'QUICK_REPLY'; text: string }
  /** The URL may end with one {{1}}; give its example. */
  | { type: 'URL'; text: string; url: string; example?: string }
  | { type: 'PHONE_NUMBER'; text: string; phone_number: string }

/** What POST /templates takes; mirrors the backend's TemplateDraft. */
export type TemplateDraft = {
  /** Lowercase letters, numbers and underscores. */
  name: string
  category: TemplateCategory
  /** Meta language code, like "en", "en_US", "ar". */
  language: string
  header?: TemplateHeaderDraft | null
  /** At most 1024 characters; variables {{1}}..{{n}} in order, one example per variable. */
  body: { text: string; examples?: string[] }
  /** At most 60 characters, no variables. */
  footer?: { text: string } | null
  /** Up to 10; at most one PHONE_NUMBER. */
  buttons?: TemplateButtonDraft[]
}

export const templatesApi = {
  /** Every template of the workspace's WABA (all statuses). `refresh` skips the server cache. */
  list: (refresh = false) =>
    gosRequest<{ templates: WaTemplate[] }>(`/templates${refresh ? '?refresh=1' : ''}`).then(r => r.templates),
  /** Submits a template for review; errors carry Meta's message. */
  create: (input: TemplateDraft) =>
    gosRequest<{ template: WaTemplate }>('/templates', { method: 'POST', body: input }).then(r => r.template),
  /** Deletes the template by name (all its languages), or one language when its id is given. */
  remove: (name: string, id?: string | null) =>
    gosRequest<{ deleted: boolean }>(`/templates/${encodeURIComponent(name)}${id ? `?hsm_id=${encodeURIComponent(id)}` : ''}`, { method: 'DELETE' }),
}
