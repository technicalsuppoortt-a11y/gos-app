import { auth, callBackend } from './firebase';
import { checkGosToolPolicy } from './gosToolPolicy';
import { createGosTransport, GosApiError } from './gosTransport';

export const gosRequest = createGosTransport((import.meta.env.VITE_GOS_API_BASE_URL || 'https://gos-api.vercel.app').replace(/^http:\/\/localhost(?=[:/]|$)/i, 'http://127.0.0.1'), async refresh => {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('Sign in to connect to the Upclick API.');
  return auth.currentUser.getIdToken(refresh);
}, fetch, checkGosToolPolicy);

async function meteredRequest<T>(request: MeteredGosRequest, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  const result = await callBackend<T>('agencyGosUsage', request, 115000);
  signal?.throwIfAborted();
  return result;
}
export type GosSource = { id: string; name: string; type: 'text' | 'file' | 'instructions' | 'url' | 'faq' | 'products'; status: string; detail?: string | null; url?: string | null; parent_id?: string | null; progress_percent?: number; chunks_done?: number; chunks_total?: number; content?: string; chunk_count?: number; item_count?: number; error?: string; path?: string | null };
export type GosAssistant = { live_enabled: boolean; channels: Record<string, boolean> };
export type GosSourceInput = { name: string; type: 'url'; url: string } | { name: string; type: Exclude<GosSource['type'], 'file' | 'url'>; content: string };
export type GosTrainingBucket = { ready?: number; limit?: number; items?: GosSource[] };
export type GosTraining = { files?: GosSource[] | GosTrainingBucket; links?: GosSource[] | GosTrainingBucket; embedding_percent?: number; embedding_percentage?: number; progress?: number };
export type PlaygroundContext = { channel?: string; city?: string; session_id?: string; source_id?: string };
export type PlaygroundCitation = { source_id?: string; source_name?: string; excerpt?: string; score?: number };
export type PlaygroundTest = { id: string; question: string; answer: string; outcome: string; citations: (PlaygroundCitation | string | unknown)[]; verdict?: string; note?: string | null; context_consistent?: boolean; channel?: string | null; city?: string | null; messages?: { role: 'user' | 'assistant'; content: string }[]; created_at?: string | null; session_id?: string; source_id?: string };
export type ApiRecord = Record<string, any>;
type CopilotInput = { text: string; conversationId?: string; webSearch?: boolean; deepResearch?: boolean };
type InboxSimulationInput = { channel: string; external_thread_id: string; external_message_id: string; customer_name: string; phone?: string; body: string };
type FileSourceInput = { type: 'file'; name: string; file: { name: string; mime: string; data: string } };
type MeteredGosRequest =
  | { action: 'copilot'; payload: CopilotInput }
  | { action: 'playground' | 'inboxSmartReply'; payload: PlaygroundContext & { question: string } }
  | { action: 'inboxSimulation'; payload: InboxSimulationInput }
  | { action: 'source'; payload: GosSourceInput | FileSourceInput }
  | { action: 'liveEnable'; payload: { live_enabled: true; channels?: GosAssistant['channels'] } };
const id = encodeURIComponent;

async function createSource(input: GosSourceInput | FormData): Promise<{ source: GosSource }> {
  if (!(input instanceof FormData)) return meteredRequest({ action: 'source', payload: input });
  const file = input.get('file');
  if (!(file instanceof File) || !file.size || file.size > 20 * 1024 * 1024) throw new Error('Choose a knowledge file up to 20 MB.');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result.split(',')[1]) : reject(new Error('Could not read the knowledge file.'));
    reader.onerror = () => reject(new Error('Could not read the knowledge file.'));
    reader.readAsDataURL(file);
  });
  const name = input.get('name');
  return meteredRequest({ action: 'source', payload: { type: 'file', name: typeof name === 'string' && name.trim() ? name : file.name, file: { name: file.name, mime: file.type, data } } });
}

export const gosApi = {
  health: (signal?: AbortSignal) => gosRequest('/health', { public: true, signal }),
  me: (signal?: AbortSignal) => gosRequest('/auth/me', { signal }),
  verify: () => gosRequest('/auth/verify', { method: 'POST', body: {} }),
  firestoreStatus: () => gosRequest('/firestore/status'),
  sources: (signal?: AbortSignal) => gosRequest<{ sources: GosSource[] }>('/ai/sources', { signal }),
  source: (sourceId: string, signal?: AbortSignal) => gosRequest<{ source: GosSource }>(`/ai/sources/${id(sourceId)}`, { signal }),
  createSource,
  training: (signal?: AbortSignal) => gosRequest<GosTraining & { training?: GosTraining }>('/ai/training', { signal }),
  channels: (signal?: AbortSignal) => gosRequest<{ channels: Record<string, boolean | { enabled: boolean; status?: string; external_id?: string | null }> | { channel: string; enabled: boolean; status?: string; external_id?: string | null }[] }>('/ai/channels', { signal }),
  updateChannel: (channel: string, enabled: boolean, credentials?: { external_id?: string; access_token?: string }) => gosRequest<unknown>(`/ai/channels/${id(channel)}`, { method: 'PUT', body: { enabled, ...credentials } }),
  deleteSource: (sourceId: string) => gosRequest(`/ai/sources/${id(sourceId)}`, { method: 'DELETE' }),
  assistant: (signal?: AbortSignal) => gosRequest<{ assistant: GosAssistant }>('/ai/assistant', { signal }),
  updateAssistant: (body: Partial<GosAssistant>) => body.live_enabled === true
    ? meteredRequest<{ assistant: GosAssistant }>({ action: 'liveEnable', payload: { ...body, live_enabled: true } })
    : gosRequest<{ assistant: GosAssistant }>('/ai/assistant', { method: 'PUT', body }),
  playground: (signal?: AbortSignal) => gosRequest<{ tests: PlaygroundTest[] }>('/ai/playground', { signal }),
  ask: (question: string, context: PlaygroundContext = {}) => meteredRequest<{ test: PlaygroundTest; session_id?: string; source_id?: string }>({ action: 'playground', payload: { question, ...context } }),
  smartReply: (question: string) => meteredRequest<{ test: PlaygroundTest }>({ action: 'inboxSmartReply', payload: { question } }),
  grade: (testId: string, verdict: string, note = '') => gosRequest<{ test: PlaygroundTest }>(`/ai/playground/${id(testId)}/grade`, { method: 'POST', body: { verdict, note } }),
  copilotConversations: (signal?: AbortSignal) => gosRequest<{ conversations: ApiRecord[] }>('/ai/copilot/conversations', { signal }),
  copilot: (body: CopilotInput, signal?: AbortSignal) => meteredRequest<{ text?: string; conversationId?: string; leads?: ApiRecord[]; href?: string; hrefLabel?: string; draft?: ApiRecord; actionExecuted?: ApiRecord }>({ action: 'copilot', payload: body }, signal),
  createCopilotDraft: (body: { draft: ApiRecord; record: ApiRecord; requestId: string }) => callBackend<{ success: boolean; id?: string; resource?: string; href?: string; hrefLabel?: string }>('createCopilotDraft', body),
  conversations: (signal?: AbortSignal) => gosRequest<{ conversations: ApiRecord[] }>('/inbox/conversations', { signal }),
  conversation: (conversationId: string, signal?: AbortSignal) => gosRequest<{ conversation: ApiRecord; messages: ApiRecord[] }>(`/inbox/conversations/${id(conversationId)}`, { signal }),
  inboxSummary: (signal?: AbortSignal) => gosRequest<{ conversations_today: number; needed_team: number; conversations: ApiRecord[] }>('/inbox/summary', { signal }),
  // This ingests customer messages; it is not an outbound staff-reply API.
  receiveMessage: (body: InboxSimulationInput) => meteredRequest<{ outcome: string; conversation: ApiRecord; inbound?: ApiRecord; reply: ApiRecord | null; action?: { type: string; label: string; detail?: string; lead_id?: string | null } | null }>({ action: 'inboxSimulation', payload: body }),
  pipelines: (signal?: AbortSignal) => gosRequest<{ pipelines: ApiRecord[] }>('/crm/pipelines', { signal }),
  pipeline: (pipelineId: string) => gosRequest(`/crm/pipelines/${id(pipelineId)}`),
  presets: () => gosRequest('/crm/pipelines/presets'),
  installPreset: (key: string) => gosRequest(`/crm/pipelines/presets/${id(key)}`, { method: 'POST', body: {} }),
  createPipeline: (body: ApiRecord) => gosRequest('/crm/pipelines', { method: 'POST', body }),
  updatePipeline: (pipelineId: string, body: ApiRecord) => gosRequest(`/crm/pipelines/${id(pipelineId)}`, { method: 'PUT', body }),
  leads: (pipelineId?: string, signal?: AbortSignal) => gosRequest<{ leads: ApiRecord[] }>(`/crm/leads${pipelineId ? `?pipeline_id=${id(pipelineId)}` : ''}`, { signal }),
  lead: async (leadId: string, signal?: AbortSignal): Promise<{ lead: ApiRecord | null; leads?: ApiRecord[] }> => {
    try {
      const result = await gosRequest<{ lead: ApiRecord }>('/crm/leads/' + id(leadId), { signal });
      if (!result.lead || result.lead.id !== leadId) throw new Error('The Upclick API returned a mismatched contact ID.');
      return result;
    }
    catch (error) {
      if (!(error instanceof GosApiError) || error.status !== 404 || error.code !== 'lead_not_found') throw error;
      // The CRM data layer resolves this ID from its tenant-scoped Firestore document.
      return { lead: null };
    }
  },
  createLead: (body: ApiRecord) => gosRequest('/crm/leads', { method: 'POST', body }),
  updateLead: (leadId: string, body: ApiRecord) => gosRequest(`/crm/leads/${id(leadId)}`, { method: 'PATCH', body }),
  moveLead: (leadId: string, lifecycle_stage: string) => gosRequest(`/crm/leads/${id(leadId)}/stage`, { method: 'POST', body: { lifecycle_stage } }),
  addNote: (leadId: string, note: string) => gosRequest(`/crm/leads/${id(leadId)}/notes`, { method: 'POST', body: { note } }),
  deleteLead: (leadId: string) => gosRequest(`/crm/leads/${id(leadId)}`, { method: 'DELETE' }),
  bulkLeads: (lead_ids: string[], action: 'tag' | 'owner' | 'stage' | 'delete', value?: string) => gosRequest('/crm/leads/bulk', { method: 'POST', body: { lead_ids, action, ...(value === undefined ? {} : { value }) } }),
  importLeads: (body: ApiRecord) => gosRequest('/crm/leads/import', { method: 'POST', body }),
  exportLeads: (pipelineId: string) => gosRequest<string>(`/crm/leads/export?pipeline_id=${id(pipelineId)}`, { csv: true }),
};
