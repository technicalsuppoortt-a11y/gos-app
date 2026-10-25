import { read, write, rows, entityMutation, spendCredits } from '../store';
import { makeLead, mainPipeline, parseCSV } from '../../pages/crm/model';
export type ApiRecord = Record<string, any>;
export type GosSource = { id: string; name: string; type: any; status: string; content?: string; chunk_count?: number; error?: string };
export type GosAssistant = { live_enabled: boolean; channels: Record<string, boolean> };
export type PlaygroundTest = { id: string; question: string; answer: string; outcome: string; citations: unknown[]; verdict?: string };
const created = (body: ApiRecord) => ({ ...body, id: body.id || crypto.randomUUID(), created_at: new Date().toISOString() });
export async function gosRequest<T>(input: string, options: { method?: string; body?: any; [key: string]: any } = {}): Promise<T> {
  const url = new URL(input, 'https://demo.invalid');
  const parts = url.pathname.split('/').filter(Boolean), method = options.method ?? 'GET', body = options.body ?? {};
  if (['/health', '/auth/me', '/auth/verify', '/firestore/status'].includes(url.pathname)) return { ok: true, user: { id: 'demo-account-user' }, connected: true } as T;
  if (parts[0] === 'ai') {
    if (parts[1] === 'assistant') { if (method !== 'GET') write('assistant', { ...read('assistant', { live_enabled: false, channels: {} }), ...body }); return { assistant: read('assistant', { live_enabled: false, channels: { whatsapp: true, instagram: true } }) } as T; }
    if (parts[1] === 'sources') {
      if (method === 'POST') { const values = body instanceof FormData ? Object.fromEntries(body.entries()) : body; const source = { ...created(values), status: 'ready', chunk_count: 3, content: values.content ?? 'Demo file content' }; entityMutation('knowledge', source.id, source); return { source } as T; }
      if (method === 'DELETE') entityMutation('knowledge', parts[2]);
      return (parts[2] ? { source: rows('knowledge').find(row => row.id === parts[2]) } : { sources: rows('knowledge') }) as T;
    }
    if (parts[1] === 'playground') {
      if (method === 'GET') return { tests: rows('playground') } as T;
      if (parts[3] === 'grade') { entityMutation('playground', parts[2], body, true); return { test: rows('playground').find(row => row.id === parts[2]) } as T; }
      spendCredits();
      const test = { ...created(body), answer: 'Demo response: Thanks for reaching out! We can help you capture leads, automate follow-ups and book a discovery call. What would you like to explore?', outcome: 'answered', citations: [] };
      entityMutation('playground', test.id, test); return { test } as T;
    }
  }
  if (parts[0] === 'inbox') {
    if (method === 'POST') { const conversation = created({ customer_name: body.customer_name ?? 'Demo customer', channel: body.channel ?? 'webchat', messages: [{ body: body.body, role: 'customer', created_at: new Date().toISOString() }] }); entityMutation('conversations', conversation.id, conversation); return { outcome: 'received', conversation, reply: null } as T; }
    const conversations = rows('conversations'), conversation = conversations.find(row => row.id === parts[2]);
    return (parts[2] ? { conversation, messages: conversation?.messages ?? [] } : { conversations }) as T;
  }
  if (parts[0] === 'crm') {
    const resource = parts[1], id = parts[2];
    if (resource === 'pipelines' && id === 'presets') return { presets: [{ ...mainPipeline, key: 'main', name: 'Sales pipeline' }] } as T;
    if (resource === 'leads' && id === 'export') return ['Name,Email,Stage', ...rows('leads').map(row => [row.name, row.email, row.stage].map(value => JSON.stringify(value ?? '')).join(','))].join('\n') as T;
    if (resource === 'leads' && id === 'bulk') {
      for (const leadId of body.lead_ids ?? []) {
        const lead = rows('leads').find(row => row.id === leadId); if (!lead) continue;
        const change = body.action === 'stage' ? { stage: body.value, lifecycleStage: body.value } : body.action === 'tag' ? { tags: [...(lead.tags ?? []), body.value] } : { owner: body.value };
        entityMutation('leads', leadId, body.action === 'delete' ? undefined : { ...lead, ...change });
      }
      return { leads: rows('leads') } as T;
    }
    if (resource === 'leads' && id === 'import') {
      const imported = { added: 0, updated: 0, skipped: 0 };
      const records = body.csv ? parseCSV(body.csv).slice(1).map(row => Object.fromEntries(Object.entries(body.mapping ?? {}).map(([field, index]) => [field, row[Number(index)] ?? '']))) : body.leads ?? body.rows ?? [];
      for (const record of records) {
        const existing = rows('leads').find(lead => lead.email?.toLowerCase() === record.email?.toLowerCase());
        if (existing && body.duplicates !== 'update') { imported.skipped++; continue; }
        const lead = makeLead({ ...existing, ...record, value: Number(record.value ?? 0), pipelineId: body.pipeline_id ?? 'main', id: existing?.id ?? crypto.randomUUID() });
        entityMutation('leads', lead.id, lead); imported[existing ? 'updated' : 'added']++;
      }
      return { import: imported, leads: rows('leads') } as T;
    }
    if (!['leads', 'pipelines'].includes(resource)) throw new Error('Unknown demo CRM resource.');
    if (method === 'DELETE') { entityMutation(resource, id); return { success: true } as T; }
    if (method !== 'GET') {
      if (parts[3] === 'notes') { const previous = rows(resource).find(row => row.id === id); entityMutation(resource, id, { ...previous, activities: [...(previous?.activities ?? []), { id: crypto.randomUUID(), type: 'note', title: body.note, detail: body.note, at: new Date().toISOString() }] }); }
      else {
        const previous = rows(resource).find(row => row.id === id);
        const value = { ...previous, ...body, id: id || body.id || crypto.randomUUID() };
        if (body.lifecycle_stage) Object.assign(value, { stage: body.lifecycle_stage, lifecycleStage: body.lifecycle_stage });
        if (body.pipeline_id) value.pipelineId = body.pipeline_id;
        const record = resource === 'leads' ? makeLead(value) : value;
        entityMutation(resource, record.id, record);
        return { [resource === 'leads' ? 'lead' : 'pipeline']: record } as T;
      }
    }
    return (id ? { [resource === 'leads' ? 'lead' : 'pipeline']: rows(resource).find(row => row.id === id) } : { [resource]: rows(resource) }) as T;
  }
  throw new Error('Unknown demo API action: ' + url.pathname);
}
// Keep the application's API contract while replacing its transport exclusively.
const request = (path: string, method = 'GET', body?: any) => gosRequest<any>(path, { method, body });
export const gosApi = {
  health: () => request('/health'), me: () => request('/auth/me'), verify: () => request('/auth/verify'), firestoreStatus: () => request('/firestore/status'),
  sources: () => request('/ai/sources'), source: (id: string) => request('/ai/sources/' + id), createSource: (body: any) => request('/ai/sources', 'POST', body), deleteSource: (id: string) => request('/ai/sources/' + id, 'DELETE'),
  assistant: () => request('/ai/assistant'), updateAssistant: (body: any) => request('/ai/assistant', 'PUT', body), playground: () => request('/ai/playground'), ask: (question: string) => request('/ai/playground', 'POST', { question }), grade: (id: string, verdict: string, note: string) => request('/ai/playground/' + id + '/grade', 'POST', { verdict, note }),
  conversations: () => request('/inbox/conversations'), conversation: (id: string) => request('/inbox/conversations/' + id), receiveMessage: (body: any) => request('/inbox/messages', 'POST', body),
  pipelines: () => request('/crm/pipelines'), pipeline: (id: string) => request('/crm/pipelines/' + id), presets: () => request('/crm/pipelines/presets'), installPreset: () => request('/crm/pipelines', 'POST', { ...mainPipeline, id: crypto.randomUUID() }), createPipeline: (body: any) => request('/crm/pipelines', 'POST', body), updatePipeline: (id: string, body: any) => request('/crm/pipelines/' + id, 'PUT', body),
  leads: () => request('/crm/leads'), lead: (id: string) => request('/crm/leads/' + id), createLead: (body: any) => request('/crm/leads', 'POST', body), updateLead: (id: string, body: any) => request('/crm/leads/' + id, 'PATCH', body), moveLead: (id: string, lifecycle_stage: string) => request('/crm/leads/' + id + '/stage', 'POST', { lifecycle_stage }), addNote: (id: string, note: string) => request('/crm/leads/' + id + '/notes', 'POST', { note }), deleteLead: (id: string) => request('/crm/leads/' + id, 'DELETE'), bulkLeads: (lead_ids: string[], action: string, value?: string) => request('/crm/leads/bulk', 'POST', { lead_ids, action, value }), importLeads: (body: any) => request('/crm/leads/import', 'POST', body), exportLeads: (id: string) => request('/crm/leads/export?pipeline_id=' + id),
};
