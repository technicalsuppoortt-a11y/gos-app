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
  if (parts[0] === 'platform' && parts[1] === 'meta-app') {
    const defaultMeta = {
      apps: {
        messenger: { app_id: null, config_id: null, has_secret: false },
        instagram: { app_id: null, config_id: null, has_secret: false },
        whatsapp: { app_id: null, config_id: null, has_secret: false },
      },
      public_url: 'https://api.upklick.net',
      allowed_origins: ['https://app.client-domain.com'],
      unreadable_secrets: [],
      verify_token: 'upclick_meta_verify_demo_token',
      webhook_url: 'https://api.upklick.net/api/v1/webhooks/meta',
      redirect_uri: 'https://api.upklick.net/api/v1/oauth/meta/callback',
    };
    const current = read('platform.metaApp', defaultMeta);
    if (method === 'PUT') {
      const next = {
        ...current,
        public_url: body.public_url || current.public_url,
        allowed_origins: Array.isArray(body.allowed_origins) ? body.allowed_origins : current.allowed_origins,
        apps: {
          messenger: {
            app_id: body.messenger_app_id || null,
            config_id: body.messenger_config_id || null,
            has_secret: Boolean(body.messenger_app_secret || current.apps?.messenger?.has_secret),
          },
          instagram: {
            app_id: body.instagram_app_id || null,
            config_id: body.instagram_config_id || null,
            has_secret: Boolean(body.instagram_app_secret || current.apps?.instagram?.has_secret),
          },
          whatsapp: {
            app_id: body.whatsapp_app_id || null,
            config_id: body.whatsapp_config_id || null,
            has_secret: Boolean(body.whatsapp_app_secret || current.apps?.whatsapp?.has_secret),
          },
        },
      };
      write('platform.metaApp', next);
      return { settings: next } as T;
    }
    return { settings: current } as T;
  }
  if (parts[0] === 'ai') {
    if (parts[1] === 'training') return { embedding_percent: 100 } as T;
    // Flow Builder's Meta connect is not available in the demo account.
    if (parts[1] === 'channels' && parts[2] === 'meta') {
      if (method === 'GET') return { meta: { app_id: null, graph_version: 'v27.0', login_config_id: null, whatsapp_config_id: null, ready: false, channels: { messenger: false, instagram: false, whatsapp: false }, webhook_url: '', verify_token: null } } as T;
      throw new Error('Connecting Meta channels is not available in the demo account.');
    }
    if (parts[1] === 'channels') { const current = read('assistant', { live_enabled: false, channels: { whatsapp: true, instagram: true, webchat: true } }); if (method === 'PUT' && parts[2]) write('assistant', { ...current, channels: { ...current.channels, [parts[2]]: !!body.enabled } }); return { channels: read('assistant', { live_enabled: false, channels: { whatsapp: true, instagram: true, webchat: true } }).channels } as T; }
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
    if (parts[1] === 'copilot') {
      if (parts[2] === 'conversations') return { conversations: rows('copilotConversations') } as T;
      if (parts[2] === 'draft') {
        const resource = body.draft?.kind === 'landing' ? 'assets' : body.draft?.kind === 'campaign' ? 'templates' : body.draft?.kind === 'booking' ? 'calendars' : 'products';
        const id = body.requestId || crypto.randomUUID();
        entityMutation(resource, id, { ...(body.record ?? {}), id });
        if (resource === 'assets') write('gos.assets.workspace.v1', { assets: rows('assets'), domains: rows('domains') });
        return { success: true, id, resource } as T;
      }
      spendCredits();
      const cleanUserText = String(body.text ?? '').replace(/\n\n\[Thinking level: [^\]]+\]$/, ''); const levelNote = body.thinkingLevel === 'low' ? ' (Quick summary)' : body.thinkingLevel === 'high' ? ' (Deep strategic breakdown)' : ''; const text = `Demo response${levelNote}: I can help you build a follow-up plan, draft a product, or create a landing page. Start with a clear offer, invite interested leads to a discovery call, and send a friendly reminder after 24 hours. All actions here stay in your demo workspace.`;
      const before = rows('copilotConversations').find(row => row.id === body.conversationId);
      const convId = body.conversationId || crypto.randomUUID();
      entityMutation('copilotConversations', convId, { title: before?.title ?? cleanUserText.slice(0, 60), group: 'Today', category: 'Business', time: 'Just now', prompt: cleanUserText, updatedAt: new Date().toISOString(), messages: [...(before?.messages ?? []), { id: crypto.randomUUID(), role: 'user', text: cleanUserText }, { id: crypto.randomUUID(), role: 'assistant', text }] });
      const kind = /landing|funnel|website/i.test(body.text) ? 'landing' : /course|product/i.test(body.text) ? 'product' : /booking|appointment/i.test(body.text) ? 'booking' : /campaign/i.test(body.text) ? 'campaign' : undefined;
      return { text, conversationId: convId, ...(kind ? { draft: { kind, name: 'Demo Growth Offer', price: '99', currency: 'USD', channel: 'WhatsApp', content: 'A personalized demo offer to help customers reach their next milestone.', description: 'Sample demo draft', duration: '30' } } : {}) } as T;
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
  // Flow Builder: flows are kept in the demo store; the simulator and Messenger need the real API.
  if (parts[0] === 'flows') {
    const flows = read<ApiRecord[]>('flowBuilder.flows', []);
    const save = (next: ApiRecord[]) => write('flowBuilder.flows', next);
    const now = new Date().toISOString();
    if (!parts[1]) {
      if (method === 'POST') {
        const flow = { id: crypto.randomUUID().slice(0, 12), name: body.name, status: 'draft', draft: { triggers: [], rootId: null, nodes: {}, coordinates: {} }, live: null, has_unpublished_changes: false, updated_at: now };
        save([...flows, flow]); return flow as T;
      }
      return flows as T;
    }
    const flow = flows.find(row => row.id === parts[1]);
    if (!flow) throw new Error('Automation not found.');
    const update = (patch: ApiRecord) => { const next = { ...flow, ...patch, updated_at: now }; save(flows.map(row => row.id === flow.id ? next : row)); return next as T; };
    if (parts[2] === 'draft') return update({ draft: body.graph, name: body.name ?? flow.name, has_unpublished_changes: true });
    if (parts[2] === 'publish') return update({ live: flow.draft, status: 'live', has_unpublished_changes: false });
    if (parts[2] === 'stop') return update({ status: 'stopped' });
    if (parts[2] === 'stats') return {} as T;
    if (parts[2] === 'simulator') throw new Error('The demo account cannot run the simulator. Sign in to test flows.');
    return flow as T;
  }
  // WhatsApp message templates: created ones stay PENDING in the demo store; nothing reaches Meta.
  if (parts[0] === 'templates') {
    const templates = read<ApiRecord[]>('templates.v1', demoTemplates.map(t => ({ ...t, id: 'tpl_' + t.name, rejected_reason: null, quality: 'GREEN' })));
    const save = (next: ApiRecord[]) => write('templates.v1', next);
    if (method === 'POST') {
      if (!/^[a-z0-9_]{1,512}$/.test(body.name ?? '')) throw new Error('The name may only use lowercase letters, numbers and underscores (max 512).');
      if (templates.some(t => t.name === body.name && t.language === body.language)) throw new Error('A template with this name and language already exists.');
      const components = [
        body.header && { type: 'HEADER', format: body.header.format ?? 'TEXT', text: body.header.text },
        { type: 'BODY', text: body.body?.text ?? '' },
        body.footer?.text && { type: 'FOOTER', text: body.footer.text },
        body.buttons?.length && { type: 'BUTTONS', buttons: body.buttons },
      ].filter(Boolean);
      const vars = [...new Set<string>((body.body?.text ?? '').match(/\{\{\d+\}\}/g) ?? [])].map((p, i) => tv('body.' + (i + 1), 'body', p, body.body?.examples?.[i]));
      const template = { id: 'tpl_' + crypto.randomUUID().slice(0, 12), name: body.name, language: body.language, category: body.category, status: 'PENDING', rejected_reason: null, quality: null, components, variables: vars };
      save([...templates, template]); return { template } as T;
    }
    if (method === 'DELETE' && parts[1]) { save(templates.filter(t => t.name !== decodeURIComponent(parts[1]))); return { deleted: true, name: parts[1] } as T; }
    return { templates } as T;
  }
  // WhatsApp campaigns: sample templates and campaigns kept in the demo store, in the API's shapes; nothing is sent.
  if (parts[0] === 'campaigns') {
    const campaigns = read<ApiRecord[]>('campaigns.v2', demoCampaigns());
    const save = (next: ApiRecord[]) => write('campaigns.v2', next);
    const now = new Date().toISOString();
    if (parts[1] === 'templates') return { templates: demoTemplates } as T;
    if (parts[1] === 'test-message' || parts[2] === 'test-message') throw new Error('The demo account cannot send WhatsApp messages. Sign in to send a test.');
    if (parts[1] === 'audience' && parts[2] === 'upload') {
      const file = body instanceof FormData ? body.get('file') as File : null;
      const text = file ? await file.text() : String(body.content ?? '');
      const lines = parseCSV(text);
      const headers = (lines[0] ?? []).map(h => String(h).trim());
      write('campaigns.upload', { headers, rows: lines.slice(1) });
      const find = (re: RegExp) => headers.find(h => re.test(h)) ?? null;
      return { upload_id: 'demo-upload', filename: file?.name ?? null, headers, row_count: Math.max(0, lines.length - 1), sample: [], suggested: { phone_column: find(/phone|mobile|whats/i), name_column: find(/name/i) } } as T;
    }
    if (parts[1] === 'audience') {
      const a = body.audience ?? {};
      const digits = (p: unknown) => String(p ?? '').replace(/\D/g, '');
      const leads = rows('leads').filter(lead => lead.phone);
      const fromLeads = a.leads?.enabled ? leads.filter(l => (!a.leads.stages?.length || a.leads.stages.includes(l.stage)) && (!a.leads.tags?.length || a.leads.tags.some((t: string) => (l.tags ?? []).includes(t)))) : [];
      const manual = leads.filter(l => (a.lead_ids ?? []).includes(l.id));
      const upload = a.csv ? read<{ headers: string[]; rows: string[][] }>('campaigns.upload', { headers: [], rows: [] }) : { headers: [], rows: [] };
      const col = upload.headers.indexOf(a.csv?.phone_column);
      const csvPhones = upload.rows.map(r => digits(r[col]));
      const csv = csvPhones.filter(p => p.length >= 8);
      const phones = [...fromLeads.map(l => digits(l.phone)), ...csv, ...manual.map(l => digits(l.phone))];
      const unique = new Set(phones);
      return { total: unique.size, sources: { leads: fromLeads.length, csv: csv.length, manual: manual.length }, duplicates_removed: phones.length - unique.size, opted_out_excluded: 0, invalid: { count: csvPhones.length - csv.length, rows: [] }, sample: [...fromLeads, ...manual].slice(0, 3).map(l => ({ phone: l.phone, name: l.name ?? null })) } as T;
    }
    if (!parts[1]) {
      if (method === 'POST') {
        const campaign = { ...body, id: 'cmp_' + crypto.randomUUID().slice(0, 12), status: 'draft', counts: emptyCounts(), created_at: now, updated_at: now };
        save([campaign, ...campaigns]); return { campaign } as T;
      }
      return { campaigns, stats: {} } as T;
    }
    const campaign = campaigns.find(row => row.id === parts[1]);
    if (!campaign) throw new Error('Campaign not found.');
    const update = (patch: ApiRecord) => { const next = { ...campaign, ...patch, updated_at: now }; save(campaigns.map(row => row.id === campaign.id ? next : row)); return { campaign: next } as T; };
    if (method === 'DELETE') { save(campaigns.filter(row => row.id !== campaign.id)); return { deleted: true } as T; }
    if (method === 'PATCH') return update(body);
    if (parts[2] === 'launch') return campaign.schedule?.mode === 'later'
      ? update({ status: 'scheduled', scheduled_at: now })
      : update({ status: 'completed', started_at: now, completed_at: now, counts: { recipients: 120, sent: 116, delivered: 112, read: 80, replied: 14, failed: 4 } });
    if (parts[2] === 'cancel') return update({ status: 'cancelled', cancelled_at: now });
    if (parts[2] === 'duplicate') {
      const copy = { ...campaign, id: 'cmp_' + crypto.randomUUID().slice(0, 12), name: campaign.name + ' (copy)', status: 'draft', counts: emptyCounts(), created_at: now, started_at: null, completed_at: null };
      save([copy, ...campaigns]); return { campaign: copy } as T;
    }
    if (parts[2] === 'resend-failed') {
      const c = campaign.counts;
      return { requeued: c.failed, ...update({ counts: { ...c, failed: 0, sent: c.sent + c.failed, delivered: c.delivered + c.failed } }) } as T;
    }
    if (parts[2] === 'recipients') {
      const sample = campaign.counts?.sent ? demoRecipients : [];
      if (parts[3] === 'export') return ['name,phone,status,error', ...sample.map(r => [r.name, r.phone, r.status, r.error ?? ''].map(v => JSON.stringify(v ?? '')).join(','))].join('\n') as T;
      const status = url.searchParams.get('status');
      const list = status ? sample.filter(r => r.status === status) : sample;
      return { recipients: list, total: list.length, page: 1 } as T;
    }
    return { campaign } as T;
  }
  throw new Error('Unknown demo API action: ' + url.pathname);
}

const emptyCounts = () => ({ recipients: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 });
const tv = (key: string, component: string, placeholder: string, example: string | null = null) => ({ key, component, placeholder, example });
const demoTemplates = [
  { name: 'white_friday_offer', language: 'ar', category: 'MARKETING', status: 'APPROVED', variables: [tv('body.1', 'body', '{{1}}'), tv('body.2', 'body', '{{2}}', '30%')], components: [{ type: 'HEADER', format: 'TEXT', text: 'عرض الجمعة البيضاء' }, { type: 'BODY', text: 'أهلًا {{1}}، خصم {{2}} على كل المنتجات حتى نهاية الأسبوع.' }, { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'تسوّق الآن', url: 'https://example.com' }] }] },
  { name: 'booking_reminder', language: 'ar', category: 'UTILITY', status: 'APPROVED', variables: [tv('body.1', 'body', '{{1}}'), tv('body.2', 'body', '{{2}}'), tv('body.3', 'body', '{{3}}')], components: [{ type: 'BODY', text: 'مرحبًا {{1}}، نذكّرك بموعدك يوم {{2}} الساعة {{3}}.' }] },
  { name: 'product_launch', language: 'en', category: 'MARKETING', status: 'APPROVED', variables: [tv('body.1', 'body', '{{1}}')], components: [{ type: 'BODY', text: 'Hi {{1}}, our new collection is live. Reply YES to get early access.' }] },
];

function demoCampaigns(): ApiRecord[] {
  const day = 86400000;
  return [
    { id: 'demo-wf', name: 'عرض الجمعة البيضاء', status: 'completed', template: { name: 'white_friday_offer', language: 'ar' }, variables: { 'body.1': { type: 'field', field: 'name', fallback: 'عميلنا العزيز' }, 'body.2': { type: 'text', value: '30%' } }, audience: {}, schedule: { mode: 'now' }, counts: { recipients: 482, sent: 478, delivered: 467, read: 356, replied: 61, failed: 4 }, started_at: new Date(Date.now() - 2 * day).toISOString() },
    { id: 'demo-launch', name: 'إطلاق المنتج الجديد', status: 'scheduled', template: { name: 'product_launch', language: 'en' }, variables: { 'body.1': { type: 'field', field: 'first_name', fallback: 'there' } }, audience: {}, schedule: { mode: 'later', send_at: new Date(Date.now() + 3 * day).toISOString(), timezone: 'Africa/Cairo' }, counts: { recipients: 311, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 } },
  ];
}

const demoRecipients: ApiRecord[] = [
  { id: 'r1', name: 'Ahmed Samy', phone: '+201012345678', status: 'replied', lead_id: null, replied_at: new Date().toISOString() },
  { id: 'r2', name: 'Mona Khaled', phone: '+201123456789', status: 'read', read_at: new Date().toISOString() },
  { id: 'r3', name: 'Omar Farouk', phone: '+971501234567', status: 'failed', error: 'The number is not on WhatsApp', failed_at: new Date().toISOString() },
  { id: 'r4', name: 'Sara Adel', phone: '+201007654321', status: 'delivered', delivered_at: new Date().toISOString() },
];
// Keep the application's API contract while replacing its transport exclusively.
const request = (path: string, method = 'GET', body?: any) => gosRequest<any>(path, { method, body });
export const gosApi = {
  health: () => request('/health'), me: () => request('/auth/me'), verify: () => request('/auth/verify'), firestoreStatus: () => request('/firestore/status'),
  sources: () => request('/ai/sources'), source: (id: string) => request('/ai/sources/' + id), createSource: (body: any) => request('/ai/sources', 'POST', body), deleteSource: (id: string) => request('/ai/sources/' + id, 'DELETE'),
  training: () => request('/ai/training'), channels: () => request('/ai/channels'), updateChannel: (channel: string, enabled: boolean, credentials?: any) => request('/ai/channels/' + channel, 'PUT', { enabled, ...credentials }),
  assistant: () => request('/ai/assistant'), updateAssistant: (body: any) => request('/ai/assistant', 'PUT', body), playground: () => request('/ai/playground'), ask: (question: string) => request('/ai/playground', 'POST', { question }), grade: (id: string, verdict: string, note: string) => request('/ai/playground/' + id + '/grade', 'POST', { verdict, note }),
  copilotConversations: () => request('/ai/copilot/conversations'), copilot: (body: any) => request('/ai/copilot', 'POST', body), createCopilotDraft: (body: any) => request('/ai/copilot/draft', 'POST', body),
  smartReply: (question: string) => request('/ai/playground', 'POST', { question }),
  conversations: () => request('/inbox/conversations'), conversation: (id: string) => request('/inbox/conversations/' + id), inboxSummary: () => request('/inbox/conversations'), receiveMessage: (body: any) => request('/inbox/messages', 'POST', body),
  pipelines: () => request('/crm/pipelines'), pipeline: (id: string) => request('/crm/pipelines/' + id), presets: () => request('/crm/pipelines/presets'), installPreset: () => request('/crm/pipelines', 'POST', { ...mainPipeline, id: crypto.randomUUID() }), createPipeline: (body: any) => request('/crm/pipelines', 'POST', body), updatePipeline: (id: string, body: any) => request('/crm/pipelines/' + id, 'PUT', body),
  leads: () => request('/crm/leads'), lead: (id: string) => request('/crm/leads/' + id), createLead: (body: any) => request('/crm/leads', 'POST', body), updateLead: (id: string, body: any) => request('/crm/leads/' + id, 'PATCH', body), moveLead: (id: string, lifecycle_stage: string) => request('/crm/leads/' + id + '/stage', 'POST', { lifecycle_stage }), addNote: (id: string, note: string) => request('/crm/leads/' + id + '/notes', 'POST', { note }), deleteLead: (id: string) => request('/crm/leads/' + id, 'DELETE'), bulkLeads: (lead_ids: string[], action: string, value?: string) => request('/crm/leads/bulk', 'POST', { lead_ids, action, value }), importLeads: (body: any) => request('/crm/leads/import', 'POST', body), exportLeads: (id: string) => request('/crm/leads/export?pipeline_id=' + id),
};
