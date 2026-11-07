import { gosRequest } from '../../backend/gosApi'
import { GosApiError } from '../../backend/gosTransport'
import type { Flow, Graph } from './types'
import type { MetaConfig } from './metaSdk'

/** Flow Builder calls go to the same Laravel API (ai-follow-up) as the rest of AI Follow-Up, signed in with Firebase. */
export class ApiError extends Error {
  errors: string[]
  constructor(message: string, errors: string[] = []) {
    super(message)
    this.errors = errors
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    return await gosRequest<T>(path, { method, body })
  } catch (e) {
    if (e instanceof GosApiError) throw new ApiError(e.message)
    throw e
  }
}

export type SimState = {
  messages: { text: string; buttons?: { id?: string; title: string; type: string; url?: string }[] }[]
  run: { state: string; node_id: string | null; waiting_for: string | null; wake_at: string | null } | null
  contact: { tags: string[]; fields: Record<string, string> } | null
}

export type Channel = { channel: string; status: 'connected' | 'idle'; enabled: boolean; external_id: string | null; name: string | null; method: string }
export type MetaPage = { id: string; name: string; instagram: { id: string; username: string } | null }

/** Channels are the same ones the AI uses (ai-follow-up /ai/channels); flows reply on them too. */
export const api = {
  // The demo account answers with a { channel: enabled } map; the API answers with a list.
  channels: () => call<{ channels: Channel[] | Record<string, boolean> }>('GET', '/ai/channels').then(r => Array.isArray(r.channels)
    ? r.channels
    : Object.entries(r.channels).map(([channel, enabled]): Channel => ({ channel, status: enabled ? 'connected' : 'idle', enabled, external_id: null, name: null, method: 'manual' }))),
  metaConfig: () => call<{ meta: MetaConfig }>('GET', '/ai/channels/meta/config').then(r => r.meta),
  metaLoginUrl: (channel: 'messenger' | 'instagram' | 'whatsapp') => call<{ url: string }>('POST', '/ai/channels/meta/login-url', { channel }).then(r => r.url),
  metaClaim: (claim: string) => call<{ pages?: MetaPage[]; channel?: Channel }>('POST', '/ai/channels/meta/claim', { claim }),
  whatsappManual: (body: { external_id: string; access_token: string; app_secret: string }) =>
    call<{ channel: Channel }>('PUT', '/ai/channels/whatsapp', { enabled: true, ...body }).then(r => r.channel),
  metaConnect: (channel: 'messenger' | 'instagram', pageId: string) =>
    call<{ channel: Channel }>('POST', '/ai/channels/meta/connect', { channel, page_id: pageId }).then(r => r.channel),
  disconnect: (channel: string) => call<{ channel: Channel }>('PUT', `/ai/channels/${encodeURIComponent(channel)}`, { enabled: false }).then(r => r.channel),
  list: () => call<Pick<Flow, 'id' | 'name' | 'status' | 'has_unpublished_changes' | 'updated_at'>[]>('GET', '/flows'),
  create: (name: string) => call<Flow>('POST', '/flows', { name }),
  get: (id: string) => call<Flow>('GET', `/flows/${encodeURIComponent(id)}`),
  saveDraft: (id: string, graph: Graph, name?: string) => call<Flow>('PUT', `/flows/${encodeURIComponent(id)}/draft`, { graph, name }),
  publish: (id: string) => call<Flow>('POST', `/flows/${encodeURIComponent(id)}/publish`, {}),
  stop: (id: string) => call<Flow>('POST', `/flows/${encodeURIComponent(id)}/stop`, {}),
  stats: (id: string) => call<Record<string, { sent: number; clicked: number; completed: number }>>('GET', `/flows/${encodeURIComponent(id)}/stats`),
  simulate: (id: string, session: string, text: string) => call<SimState>('POST', `/flows/${encodeURIComponent(id)}/simulator/messages`, { session, text }),
  skipDelay: (id: string, session: string) => call<SimState>('POST', `/flows/${encodeURIComponent(id)}/simulator/skip-delay`, { session }),
}
