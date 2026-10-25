import { getAuth } from './auth';
import { read, write, rows, entityMutation, spendCredits } from '../store';
import { gatewayFields, type GatewayProvider } from '../../../functions/payment-gateway-model.js';
import { normalizeTrackingConfig, trackingDefaults } from '../../../functions/marketing-tracking-model.js';
export const auth = getAuth(), primaryAuth = auth;
export const db = {}, primaryDb = db, firebaseApp = {}, firebaseConfig = {}, functions = {};
export const storage = { app: { options: { storageBucket: 'isolated-demo' } } };
export const setBackendContext = () => {};
export const backendError = (error: unknown) => error instanceof Error ? error.message : 'Demo action could not be completed.';
export const createClientAuthUser = async (email: string) => ({ uid: crypto.randomUUID(), email });
export const sendOfficialPasswordResetEmail = async () => true;
export async function callBackend<T>(name: string, data: any = {}): Promise<T> {
  return await demoRequest(name, data) as T;
}
async function demoRequest(name: string, data: any): Promise<any> {
  switch (name) {
    case 'configurePaymentMethods': {
      const previous = read<any>('doc:settings/paymentMethods', { methods: [], revision: 0 });
      if (data.operation === 'get') return { ...previous, canManage: true };
      const key = 'gateway:' + data.provider;
      if (data.operation === 'getGateway') return read(key, { fields: {}, configuredSecrets: {}, mode: 'sandbox', region: 'SAU', gatewayRevision: 0 });
      if (data.expectedRevision !== previous.revision) throw new Error('Demo payment methods changed. Reopen and try again.');
      let methods = data.methods;
      if (data.operation === 'saveGateway') {
        const before = read<any>(key, { fields: {}, configuredSecrets: {}, gatewayRevision: 0 });
        if (data.expectedGatewayRevision !== before.gatewayRevision) throw new Error('Demo gateway changed. Reopen and try again.');
        const fields: Record<string, string> = {}, configuredSecrets: Record<string, boolean> = {};
        for (const field of gatewayFields[data.provider as GatewayProvider]) {
          // Store only presence flags for demo secrets, never credential values.
          if (field.secret) configuredSecrets[field.key] = !!data.configuration[field.key] || !!before.configuredSecrets[field.key];
          else fields[field.key] = data.configuration[field.key] ?? '';
        }
        write(key, { fields, configuredSecrets, mode: data.configuration.mode, region: data.configuration.region ?? 'SAU', gatewayRevision: before.gatewayRevision + 1 });
        methods = [...previous.methods.filter((method: any) => method.provider !== data.provider), { id: data.provider, provider: data.provider, name: ({ stripe: 'Stripe', paypal: 'PayPal', paytabs: 'PayTabs', fawry: 'Fawry', kashier: 'Kashier' } as any)[data.provider], type: 'gateway', account: data.label, instructions: 'Demo only', enabled: data.enabled, status: 'Configured' }];
      }
      const result = { methods, revision: previous.revision + 1 };
      write('doc:settings/paymentMethods', result); return { ...result, canManage: true };
    }
    case 'marketingTrackingConfiguration': {
      const path = data.scope === 'platform' ? 'settings/marketingTracking' : 'tenants/account-demo/preferences/marketingTracking';
      if (data.operation === 'save') write('doc:' + path, normalizeTrackingConfig(data.config));
      return { config: read('doc:' + path, trackingDefaults), canManage: true };
    }
    case 'agentConfiguration': {
      if (data.operation === 'save') write('agent', data.agent);
      return { agent: read('agent', { name: 'Demo Assistant', role: 'Business assistant', language: 'English', goal: 'Appointments' }) };
    }
    case 'copilot': {
      spendCredits();
      const text = 'Demo response: I can help you build a follow-up plan, draft a product, or create a landing page. Start with a clear offer, invite interested leads to a discovery call, and send a friendly reminder after 24 hours. All actions here stay in your demo workspace.';
      const before = rows('copilotConversations').find(row => row.id === data.conversationId);
      entityMutation('copilotConversations', data.conversationId, { title: before?.title ?? data.text.slice(0, 60), group: 'Today', category: 'Business', time: 'Just now', prompt: data.text, updatedAt: new Date().toISOString(), messages: [...(before?.messages ?? []), { id: crypto.randomUUID(), role: 'user', text: data.text }, { id: crypto.randomUUID(), role: 'assistant', text }] });
      const kind = /landing|funnel|website/i.test(data.text) ? 'landing' : /course|product/i.test(data.text) ? 'product' : /booking|appointment/i.test(data.text) ? 'booking' : /campaign/i.test(data.text) ? 'campaign' : undefined;
      return { text, ...(kind ? { draft: { kind, name: 'Demo Growth Offer', price: '99', currency: 'USD', channel: 'WhatsApp', content: 'A personalized demo offer to help customers reach their next milestone.', description: 'Sample demo draft', duration: '30' } } : {}) };
    }
    case 'createCopilotDraft': {
      const resource = data.draft.kind === 'landing' ? 'assets' : data.draft.kind === 'campaign' ? 'templates' : 'products';
      entityMutation(resource, data.requestId, { ...data.record, id: data.requestId });
      if (resource === 'assets') write('gos.assets.workspace.v1', { assets: rows('assets'), domains: rows('domains') });
      return { success: true };
    }
    case 'generateFollowUp': spendCredits(); return { text: 'Hi! Just checking in about your interest. Would you like to book a quick discovery call? · Demo message' };
    case 'queueMessage': {
      const thread = rows('conversations').find(row => row.id === data.conversationId);
      if (thread) entityMutation('conversations', thread.id, { ...thread, messages: [...(thread.messages ?? []), { id: crypto.randomUUID(), body: data.text, text: data.text, role: 'assistant', sender: 'ai', created_at: new Date().toISOString() }], last_message_body: data.text });
      spendCredits(); return { queued: true, id: crypto.randomUUID() };
    }
    case 'startWorkflow': entityMutation('workflowRuns', crypto.randomUUID(), { workflowId: data.workflowId, status: 'Completed', demo: true, createdAt: new Date().toISOString() }); spendCredits(); return { success: true };
    case 'saveBookings': for (const row of data.upserts ?? []) entityMutation('bookings', row.id, row, true); for (const id of data.removed ?? []) entityMutation('bookings', id); return { success: true };
    case 'publicBooking': {
      const page = rows('calendars').find(row => row.slug === data.slug) ?? rows('calendars')[0];
      if (data.operation) { const booking = { ...data.booking, id: data.booking.id ?? crypto.randomUUID(), status: data.operation === 'cancel' ? 'Cancelled' : 'Confirmed' }; entityMutation('bookings', booking.id, booking); return { booking }; }
      return { page, bookings: rows('bookings') };
    }
    case 'publishAsset': { const asset = rows('assets').find(row => row.id === data.assetId); const url = window.location.origin + '/asset-preview/' + data.assetId; if (asset) entityMutation('assets', asset.id, { ...asset, status: 'Published', publishedUrl: url }); return { url, draftChanged: false }; }
    case 'deleteWorkspaceAsset': entityMutation('assets', data.assetId); write('gos.assets.workspace.v1', { assets: rows('assets'), domains: rows('domains') }); return { success: true };
    case 'verifyDomain': return { matched: true, status: 'connected', matchedType: 'cname', demo: true };
    case 'hostingDomain': return { domain: { id: data.domainId, name: data.name, assetId: data.assetId, status: 'Connected', ssl: 'Active', default: false, issues: [], dnsRecords: [] } };
    case 'captureAssetLead': { const id = crypto.randomUUID(); entityMutation('leads', id, { ...data, id, stage: 'LEAD_CAPTURED', lifecycleStage: 'LEAD_CAPTURED', createdAt: new Date().toISOString() }); return { success: true, leadId: id }; }
    case 'productReviews': {
      const product = rows('products').find(row => row.id === data.productId);
      if (data.action === 'product') return product;
      const key = 'doc:tenants/account-demo/products/' + data.productId + '/publicReviews/current';
      const summary = structuredClone(read<any>(key, { reviews: [], ratingAverage: 0, reviewsCount: 0 }));
      if (data.review) { summary.reviews.push({ ...data.review, id: crypto.randomUUID(), createdAt: new Date().toISOString() }); summary.reviewsCount = summary.reviews.length; summary.ratingAverage = summary.reviews.reduce((sum: number, row: any) => sum + row.rating, 0) / summary.reviewsCount; write(key, summary); }
      return summary;
    }
    case 'commerceService': return { message: 'Demo access updated. No real purchase or account was changed.', ...(data.action === 'certificate' ? { certificate: { id: crypto.randomUUID(), name: data.email, course: rows('products').find(row => row.id === data.productId)?.name ?? 'Demo Course', issuedAt: new Date().toISOString() } } : {}) };
    case 'productAccess': return { name: 'Demo Product', files: [], message: 'Demo access updated.' };
    case 'activateUser': return { success: true };
    default: throw new Error('Unknown local demo action: ' + name);
  }
}
