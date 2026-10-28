import { executeBilling, PLATFORM, type BillingActor, type BillingStore } from '../../../functions/billing-engine.js';
import { read, write, entries } from '../store';
import { demoSession } from './session';

// The demo account is a USER whose provider is a simulated Admin. Requests are auto-approved by that
// simulated Admin so the full plan → wallet → ledger flow can be explored without a second account.
const DEMO_ADMIN = 'demo-admin';
const user: BillingActor = { uid: demoSession.user.id, role: 'USER', name: demoSession.user.name, email: demoSession.user.email, supportParentId: DEMO_ADMIN };
const admin: BillingActor = { uid: DEMO_ADMIN, role: 'ADMIN', name: 'Demo Agency', email: 'agency@demo.example' };
const platform: BillingActor = { uid: 'demo-super-admin', role: 'SUPER_ADMIN', name: 'Platform' };

const store: BillingStore = {
  get: async path => read('doc:' + path),
  query: async (collection, field, value) => entries('doc:' + collection + '/').map(([path, data]) => ({ ...data, id: path.split('/').at(-1) })).filter(row => row[field] === value),
  id: () => crypto.randomUUID(),
  commit: writes => { for (const [path, data] of writes) write('doc:' + path, data); },
};

const plan = (input: Record<string, unknown>) => ({ visible: true, currency: 'USD', features: { en: [], ar: [] }, ...input });
async function seed() {
  if (read('doc:billingPlans/' + DEMO_ADMIN + '__trial')) return;
  write('doc:users/' + DEMO_ADMIN, { role: 'ADMIN', name: admin.name, email: admin.email });
  write('doc:users/' + user.uid, { role: 'USER', name: user.name, email: user.email, supportParentId: DEMO_ADMIN });
  const allTools = ['ai-copilot', 'funnel-builder', 'crm-pipeline', 'unified-inbox', 'booking-engine', 'products-payments', 'custom-domains', 'webhooks-api', 'ai-followup', 'email-sms', 'analytics-bi', 'client-portal'];
  await executeBilling('savePlan', { plan: plan({ id: 'demo-platform-agency', kind: 'plan', name: { en: 'Agency', ar: 'الوكالة' }, price: 199, billingType: 'monthly', credits: 50000, tools: allTools, limits: { clients: 50, seats: 10 } }) }, platform, store);
  await executeBilling('assignPlan', { subscriberId: DEMO_ADMIN, planId: 'demo-platform-agency' }, platform, store);
  const plans = [
    { id: 'demo-starter', kind: 'plan', name: { en: 'Starter', ar: 'البداية' }, price: 29, billingType: 'monthly', credits: 500, tools: ['crm-pipeline', 'booking-engine', 'funnel-builder', 'analytics-bi'], limits: { seats: 2 }, features: { en: ['CRM & booking', 'Funnel builder'], ar: ['إدارة العملاء والحجوزات', 'منشئ القمع'] }, sortOrder: 1 },
    { id: 'demo-growth', kind: 'plan', name: { en: 'Growth', ar: 'النمو' }, price: 290, billingType: 'annual', credits: 2000, badge: { en: 'Popular', ar: 'الأكثر طلبًا' }, tools: allTools.filter(tool => tool !== 'webhooks-api'), limits: { seats: 5 }, features: { en: ['Everything in Starter', 'AI Copilot & follow-up', 'Unified inbox'], ar: ['كل مزايا البداية', 'المساعد الذكي والمتابعة', 'صندوق وارد موحد'] }, sortOrder: 2 },
    { id: 'demo-sprint', kind: 'plan', name: { en: '90-Day Sprint', ar: 'تحدي 90 يوم' }, price: 99, billingType: 'fixed', durationDays: 90, credits: 1000, tools: ['ai-copilot', 'crm-pipeline', 'funnel-builder', 'unified-inbox'], limits: { seats: 3 }, sortOrder: 3 },
    { id: 'demo-lifetime', kind: 'plan', name: { en: 'Lifetime', ar: 'مدى الحياة' }, price: 999, billingType: 'lifetime', credits: 1500, tools: allTools, limits: { seats: 10 }, sortOrder: 4 },
    { id: 'demo-pack-1k', kind: 'addon', addonType: 'credits', name: { en: '1,000 credits', ar: '1,000 رصيد' }, price: 20, credits: 1000, sortOrder: 1 },
    { id: 'demo-pack-seats', kind: 'addon', addonType: 'seats', name: { en: '+3 team seats', ar: '+3 مقاعد فريق' }, price: 15, addonSeats: 3, sortOrder: 2 },
    { id: 'demo-pack-webhooks', kind: 'addon', addonType: 'tool', name: { en: 'Webhooks & API', ar: 'Webhooks وواجهة API' }, price: 25, addonTool: 'webhooks-api', sortOrder: 3 },
    { kind: 'trial', name: { en: 'Free trial', ar: 'تجربة مجانية' }, durationDays: 14, credits: 100, tools: ['crm-pipeline', 'booking-engine', 'funnel-builder'], limits: { seats: 1 }, enabled: true },
  ];
  for (const item of plans) await executeBilling('savePlan', { plan: plan(item) }, admin, store);
}

export async function demoBilling(data: Record<string, any>) {
  await seed();
  const result = await executeBilling(data.operation, data, user, store);
  if ((data.operation === 'requestPlan' || data.operation === 'requestAddon') && result?.request?.id) {
    await executeBilling('decideRequest', { requestId: result.request.id, decision: 'approve', reason: 'Auto-approved in the demo workspace' }, admin, store);
  }
  return result;
}
export const demoBillingProvider = { id: DEMO_ADMIN, platform: PLATFORM };
