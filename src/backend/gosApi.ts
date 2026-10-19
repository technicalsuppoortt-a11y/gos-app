import { auth } from './firebase';
import { createGosTransport } from './gosTransport';

export const gosRequest = createGosTransport(import.meta.env.VITE_GOS_API_BASE_URL || 'https://gos-api.vercel.app', async refresh => {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('Sign in to connect to the GOS API.');
  return auth.currentUser.getIdToken(refresh);
});
export type GosSource = { id: string; name: string; type: 'text' | 'file' | 'instructions' | 'url' | 'faq' | 'products'; status: string; content?: string; chunk_count?: number; error?: string };
export type GosAssistant = { live_enabled: boolean; channels: Record<string, boolean> };
export type PlaygroundTest = { id: string; question: string; answer: string; outcome: string; citations: unknown[]; verdict?: string };
export type ApiRecord = Record<string, any>;
const id = encodeURIComponent;
export const gosApi = {
  health: (signal?: AbortSignal) => gosRequest('/health', { public: true, signal }),
  me: (signal?: AbortSignal) => gosRequest('/auth/me', { signal }),
  verify: () => gosRequest('/auth/verify', { method: 'POST', body: {} }),
  firestoreStatus: () => gosRequest('/firestore/status'),
  sources: (signal?: AbortSignal) => gosRequest<{ sources: GosSource[] }>('/ai/sources', { signal }),
  source: (sourceId: string, signal?: AbortSignal) => gosRequest<{ source: GosSource }>(`/ai/sources/${id(sourceId)}`, { signal }),
  createSource: (body: { name: string; type: string; content: string } | FormData) => gosRequest<{ source: GosSource }>('/ai/sources', { method: 'POST', body }),
  deleteSource: (sourceId: string) => gosRequest(`/ai/sources/${id(sourceId)}`, { method: 'DELETE' }),
  assistant: (signal?: AbortSignal) => gosRequest<{ assistant: GosAssistant }>('/ai/assistant', { signal }),
  updateAssistant: (body: Partial<GosAssistant>) => gosRequest<{ assistant: GosAssistant }>('/ai/assistant', { method: 'PUT', body }),
  playground: (signal?: AbortSignal) => gosRequest<{ tests: PlaygroundTest[] }>('/ai/playground', { signal }),
  ask: (question: string) => gosRequest<{ test: PlaygroundTest }>('/ai/playground', { method: 'POST', body: { question } }),
  grade: (testId: string, verdict: string, note = '') => gosRequest<{ test: PlaygroundTest }>(`/ai/playground/${id(testId)}/grade`, { method: 'POST', body: { verdict, note } }),
  conversations: (signal?: AbortSignal) => gosRequest<{ conversations: ApiRecord[] }>('/inbox/conversations', { signal }),
  conversation: (conversationId: string, signal?: AbortSignal) => gosRequest<{ conversation: ApiRecord; messages: ApiRecord[] }>(`/inbox/conversations/${id(conversationId)}`, { signal }),
  // This ingests customer messages; it is not an outbound staff-reply API.
  receiveMessage: (body: { channel: string; external_thread_id: string; external_message_id: string; customer_name: string; body: string }) => gosRequest<{ outcome: string; conversation: ApiRecord; reply: ApiRecord | null }>('/inbox/messages', { method: 'POST', body }),
  pipelines: (signal?: AbortSignal) => gosRequest<{ pipelines: ApiRecord[] }>('/crm/pipelines', { signal }),
  pipeline: (pipelineId: string) => gosRequest(`/crm/pipelines/${id(pipelineId)}`),
  presets: () => gosRequest('/crm/pipelines/presets'),
  installPreset: (key: string) => gosRequest(`/crm/pipelines/presets/${id(key)}`, { method: 'POST', body: {} }),
  createPipeline: (body: ApiRecord) => gosRequest('/crm/pipelines', { method: 'POST', body }),
  updatePipeline: (pipelineId: string, body: ApiRecord) => gosRequest(`/crm/pipelines/${id(pipelineId)}`, { method: 'PUT', body }),
  leads: (pipelineId?: string, signal?: AbortSignal) => gosRequest<{ leads: ApiRecord[] }>(`/crm/leads${pipelineId ? `?pipeline_id=${id(pipelineId)}` : ''}`, { signal }),
  lead: (leadId: string) => gosRequest(`/crm/leads/${id(leadId)}`),
  createLead: (body: ApiRecord) => gosRequest('/crm/leads', { method: 'POST', body }),
  updateLead: (leadId: string, body: ApiRecord) => gosRequest(`/crm/leads/${id(leadId)}`, { method: 'PATCH', body }),
  moveLead: (leadId: string, lifecycle_stage: string) => gosRequest(`/crm/leads/${id(leadId)}/stage`, { method: 'POST', body: { lifecycle_stage } }),
  addNote: (leadId: string, note: string) => gosRequest(`/crm/leads/${id(leadId)}/notes`, { method: 'POST', body: { note } }),
  deleteLead: (leadId: string) => gosRequest(`/crm/leads/${id(leadId)}`, { method: 'DELETE' }),
  bulkLeads: (lead_ids: string[], action: 'tag' | 'owner' | 'stage' | 'delete', value?: string) => gosRequest('/crm/leads/bulk', { method: 'POST', body: { lead_ids, action, ...(value === undefined ? {} : { value }) } }),
  importLeads: (body: ApiRecord) => gosRequest('/crm/leads/import', { method: 'POST', body }),
  exportLeads: (pipelineId: string) => gosRequest<string>(`/crm/leads/export?pipeline_id=${id(pipelineId)}`, { csv: true }),
};
