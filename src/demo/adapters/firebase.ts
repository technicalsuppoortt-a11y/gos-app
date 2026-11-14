import { getAuth } from './auth';
import { read, write, rows, entityMutation, spendCredits } from '../store';
import { gatewayFields, type GatewayProvider } from '../../../functions/payment-gateway-model.js';
import { normalizeTrackingConfig, trackingDefaults } from '../../../functions/marketing-tracking-model.js';
import { evaluateQualification, publicScreeningQuestions, validQualificationQuestions } from '../../../functions/booking-qualification.js';
import { demoBilling } from './billing';
export const auth = getAuth(), primaryAuth = auth;
export const db = {}, primaryDb = db, firebaseApp = {}, firebaseConfig = {}, functions = {};
export const primaryFunctions = functions;
export const storage = { app: { options: { storageBucket: 'isolated-demo' } } };
export const setBackendContext = () => {};
export const backendError = (error: unknown) => error instanceof Error ? error.message : 'Demo action could not be completed.';
export const createClientAuthUser = async (email: string) => ({ uid: crypto.randomUUID(), email });
export const sendOfficialPasswordResetEmail = async () => true;
export const provisionTeamMemberAuth = async () => ({ uid: crypto.randomUUID(), created: true, passwordUpdated: true });
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
    case 'transcribeCopilotVoice':
    case 'extractCopilotVoice': throw new Error('Voice transcription is available in a connected workspace.');
    case 'createCopilotDraft': {
      const resource = data.draft.kind === 'landing' ? 'assets' : data.draft.kind === 'campaign' ? 'templates' : 'products';
      entityMutation(resource, data.requestId, { ...data.record, id: data.requestId });
      if (resource === 'assets') write('gos.assets.workspace.v1', { assets: rows('assets'), domains: rows('domains') });
      return { success: true };
    }
    case 'generateFollowUp': spendCredits(); return { text: 'Hi! Just checking in about your interest. Would you like to book a quick discovery call? · Demo message' };
    case 'generateBuilderDraft': {
      spendCredits();
      if (data.kind === 'booking') return { name: 'Discovery call', description: 'Discuss your goals and plan the next step.', duration: 30 };
      if (data.kind === 'form') return { name: 'Consultation request', description: 'Tell us how we can help.', fields: [
        { type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com', options: [] },
        { type: 'textarea', label: 'Your goals', required: true, placeholder: 'Tell us about your project', options: [] },
      ] };
      return { headline: 'Take the next step with confidence', description: 'Tell us about your goals and find the right next step.', cta: 'Get in touch', benefits: ['Personal guidance', 'Simple next steps', 'Ongoing support'], faq: [], nextStep: 'Tell us about your project.', confirmation: 'Thank you for getting in touch.' };
    }
    case 'queueMessage': {
      const thread = rows('conversations').find(row => row.id === data.conversationId);
      if (thread) entityMutation('conversations', thread.id, { ...thread, messages: [...(thread.messages ?? []), { id: crypto.randomUUID(), body: data.text, text: data.text, role: 'assistant', sender: 'ai', created_at: new Date().toISOString() }], last_message_body: data.text });
      spendCredits(); return { queued: true, id: crypto.randomUUID() };
    }
    case 'startWorkflow': entityMutation('workflowRuns', crypto.randomUUID(), { workflowId: data.workflowId, status: 'Completed', demo: true, createdAt: new Date().toISOString() }); spendCredits(); return { success: true };
    case 'saveBookings': for (const row of data.upserts ?? []) entityMutation('bookings', row.id, row, true); for (const id of data.removed ?? []) entityMutation('bookings', id); return { success: true };
    case 'publicBooking': {
      const record = rows('calendars').find(row => row.slug === data.slug) ?? rows('calendars')[0];
      if (!record) throw new Error('Booking page not found.');
      const { qualificationQuestions, ...page } = record;
      const rules = qualificationQuestions ?? [];
      if (!validQualificationQuestions(rules)) throw new Error('This booking page has an invalid screening configuration.');
      const screeningQuestions = publicScreeningQuestions(rules);
      const evaluation = evaluateQualification(rules, data.screeningAnswers);
      const qualification = evaluation.status === 'incomplete' ? { status: evaluation.status, screeningQuestions } : { status: evaluation.status };
      if (data.operation === 'qualify') return qualification;
      if (data.operation === 'create' && evaluation.status !== 'qualified') return { qualification };
      if (data.operation && data.operation !== 'availability') {
        const old = rows('bookings').find(row => row.id === data.booking.id);
        if (old && data.operation === 'create') return { booking: old };
        const responses = data.operation === 'create' && evaluation.status === 'qualified' ? evaluation.responses : old?.qualificationResponses;
        const booking = {
          ...data.booking, id: data.booking.id ?? crypto.randomUUID(),
          status: data.operation === 'cancel' ? 'Canceled' : page.requireApproval || !page.free ? 'Pending' : 'Confirmed',
          ...(responses?.length ? { qualificationResponses: responses } : {}),
        };
        entityMutation('bookings', booking.id, booking);
        return { booking };
      }
      return { page, bookings: rows('bookings'), screeningQuestions };
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
    case 'commerceService': return { ok: true, customerUid: 'customer_demo', created: false, passwordUpdated: Boolean(data.password), message: 'Demo access updated. No real purchase or account was changed.', ...(data.action === 'certificate' ? { certificate: { id: crypto.randomUUID(), name: data.email, course: rows('products').find(row => row.id === data.productId)?.name ?? 'Demo Course', issuedAt: new Date().toISOString() } } : {}) };
    case 'productAccess': return { name: 'Demo Product', files: [], message: 'Demo access updated.' };
    case 'activateUser': return { success: true };
    case 'billingService': return demoBilling(data);
    case 'domainProvider': {
      const demoPricing = read<any[]>('demo:domain_pricing', [
        { id: 'com', extension: 'com', registrar_price: 10, renewal_cost: 12.98, transfer_cost: 10, registration_price: 14.99, renewal_price: 17.99, transfer_price: 14.99, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 33.29 },
        { id: 'net', extension: 'net', registrar_price: 11.98, renewal_cost: 13.98, transfer_cost: 11.98, registration_price: 16.97, renewal_price: 18.97, transfer_price: 16.97, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 29.4 },
        { id: 'org', extension: 'org', registrar_price: 10.18, renewal_cost: 13.18, transfer_cost: 10.18, registration_price: 15.17, renewal_price: 18.17, transfer_price: 15.17, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 32.89 },
        { id: 'ai', extension: 'ai', registrar_price: 69.98, renewal_cost: 69.98, transfer_cost: 69.98, registration_price: 74.97, renewal_price: 74.97, transfer_price: 74.97, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 6.66 },
        { id: 'co', extension: 'co', registrar_price: 9.98, renewal_cost: 24.98, transfer_cost: 9.98, registration_price: 14.97, renewal_price: 29.97, transfer_price: 14.97, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 33.33 },
        { id: 'io', extension: 'io', registrar_price: 32.98, renewal_cost: 32.98, transfer_cost: 32.98, registration_price: 37.97, renewal_price: 37.97, transfer_price: 37.97, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 13.14 },
        { id: 'store', extension: 'store', registrar_price: 4.98, renewal_cost: 29.98, transfer_cost: 4.98, registration_price: 9.97, renewal_price: 34.97, transfer_price: 9.97, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 50.05 },
        { id: 'app', extension: 'app', registrar_price: 14, renewal_cost: 18, transfer_cost: 14, registration_price: 18.99, renewal_price: 22.99, transfer_price: 18.99, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 26.28 },
        { id: 'dev', extension: 'dev', registrar_price: 12, renewal_cost: 14, transfer_cost: 12, registration_price: 16.99, renewal_price: 18.99, transfer_price: 16.99, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 29.37 },
        { id: 'online', extension: 'online', registrar_price: 5, renewal_cost: 28, transfer_cost: 5, registration_price: 9.99, renewal_price: 32.99, transfer_price: 9.99, markup: 4.99, markup_type: 'fixed', enabled: true, currency: 'USD', profit: 4.99, profit_margin_pct: 49.95 },
      ]);
      const demoDomains = read<any[]>('demo:registered_domains', []);
      const demoOrders = read<any[]>('demo:domain_orders', []);
      const demoContact = read<any>('demo:domain_contact', { firstName: 'Demo', lastName: 'Owner', organization: 'Northstar Studio', address1: '100 Innovation Way', city: 'Cairo', state: 'Cairo', postalCode: '11511', country: 'EG', phone: '+201001234567', email: 'demo@upclick.app' });
      const op = data.operation;
      if (op === 'getPublicPricing') return { currency: 'USD', suggested_tlds: demoPricing.map(p => p.extension), pricing: demoPricing };
      if (op === 'checkAvailability') {
        const sld = String(data.domain || 'mybrand').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0] || 'mybrand';
        return {
          query: `${sld}.com`,
          sld,
          registrarConfigured: true,
          results: demoPricing.map(p => ({
            domain: `${sld}.${p.extension}`,
            extension: p.extension,
            available: !demoDomains.some(d => d.domain === `${sld}.${p.extension}`),
            status: demoDomains.some(d => d.domain === `${sld}.${p.extension}`) ? 'unavailable' : 'available',
            registration_price: p.registration_price,
            renewal_price: p.renewal_price,
            transfer_price: p.transfer_price,
            currency: 'USD',
          })),
        };
      }
      if (op === 'listMyDomains') return { domains: demoDomains, orders: demoOrders, walletBalance: 250, stripeAvailable: false };
      if (op === 'getContact') return { contact: demoContact };
      if (op === 'saveContact') { write('demo:domain_contact', data.contact); return { success: true, contact: data.contact }; }
      if (op === 'createOrder') {
        const ext = String(data.domain || '').split('.').slice(1).join('.') || 'com';
        const p = demoPricing.find(x => x.extension === ext) || demoPricing[0];
        const years = Number(data.years) || 1;
        const order = { id: crypto.randomUUID(), domain: data.domain, extension: ext, type: data.type || 'registration', years, status: 'pending', customer_price: Math.round(p.registration_price * years * 100) / 100, currency: 'USD', created_at: new Date().toISOString() };
        write('demo:domain_orders', [order, ...demoOrders]);
        return { order };
      }
      if (op === 'createCheckout') {
        const idx = demoOrders.findIndex(o => o.id === data.orderId);
        const order = demoOrders[idx];
        if (!order) throw new Error('Order not found');
        const dom = { id: crypto.randomUUID(), domain: order.domain, extension: order.extension, status: 'active', registrar: 'namecheap', registration_price: order.customer_price, renewal_price: order.customer_price, registered_at: new Date().toISOString(), expires_at: new Date(Date.now() + (order.years || 1) * 365 * 86400000).toISOString(), auto_renew: true, nameservers: ['dns1.registrar-servers.com', 'dns2.registrar-servers.com'], dns_records: [], created_at: new Date().toISOString() };
        write('demo:registered_domains', [dom, ...demoDomains]);
        const nextOrders = [...demoOrders];
        nextOrders[idx] = { ...order, status: 'completed', domain_id: dom.id };
        write('demo:domain_orders', nextOrders);
        return { paid: true, method: 'wallet', orderId: order.id, fulfillment: { ok: true, domainId: dom.id, domain: dom.domain } };
      }
      if (op === 'getDnsRecords') {
        const dom = demoDomains.find(d => d.id === data.domainId);
        return { records: dom?.dns_records ?? [] };
      }
      if (op === 'saveDnsRecords') {
        write('demo:registered_domains', demoDomains.map(d => d.id === data.domainId ? { ...d, dns_records: data.records } : d));
        return { success: true, records: data.records };
      }
      if (op === 'saveNameservers') {
        write('demo:registered_domains', demoDomains.map(d => d.id === data.domainId ? { ...d, nameservers: data.nameservers } : d));
        return { success: true, nameservers: data.nameservers };
      }
      if (op === 'setAutoRenew') {
        write('demo:registered_domains', demoDomains.map(d => d.id === data.domainId ? { ...d, auto_renew: Boolean(data.auto_renew) } : d));
        return { success: true, auto_renew: Boolean(data.auto_renew) };
      }
      if (op === 'adminOverview') return { scope: 'admin', currency: 'USD', pricing: demoPricing, domains: demoDomains, orders: demoOrders, siteDomains: [] };
      if (op === 'superAdminOverview') return { settings: { markup: 4.99, markup_type: 'fixed' }, pricing: demoPricing, registrarConfig: { provider: 'namecheap', apiUser: '', userName: '', clientIp: '', environment: 'sandbox', sandboxSimulation: true, liveConfigured: false, configured: true, hasApiKey: false, maskedApiKey: '', defaultNameservers: ['dns1.registrar-servers.com', 'dns2.registrar-servers.com'] }, namecheapConfigured: true, domains: demoDomains, orders: demoOrders, logs: [] };
      return { success: true };
    }
    default: throw new Error('Unknown local demo action: ' + name);
  }
}
