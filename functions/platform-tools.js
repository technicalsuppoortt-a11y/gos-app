import { HttpsError } from 'firebase-functions/v2/https';

export const permissionTools = { copilot: 'ai-copilot', funnels: 'funnel-builder', crm: 'crm-pipeline', inbox: 'unified-inbox', 'inbox.send': 'unified-inbox', booking: 'booking-engine', products: 'products-payments', 'follow-up': 'ai-followup', analytics: 'analytics-bi', domains: 'custom-domains', integrations: 'webhooks-api', 'email-sms': 'email-sms', portal: 'client-portal' };
export function toolAvailable(tool, plan = '') {
  if (!tool) return true;
  if (tool.enabled === false || ['Disabled', 'Maintenance'].includes(tool.status ?? '')) return false;
  if (!plan || !tool.accessTier) return true;
  return tool.accessTier === 'all' || tool.accessTier === 'pro_agency' && ['pro', 'agency'].includes(plan.toLowerCase()) || tool.accessTier === 'agency_only' && plan.toLowerCase() === 'agency';
}
export async function checkPlatformTool(db, tenantId, permission) {
  const id = permissionTools[permission];
  if (!id) return;
  const tool = (await db.doc('settings/platformTools').get()).data()?.tools?.[id];
  if (!tool) return;
  const tenant = (await db.doc(`tenants/${tenantId}`).get()).data() ?? {};
  const plan = typeof tenant.plan === 'string' ? tenant.plan : tenant.planId ?? tenant.subscription?.plan ?? '';
  if (!toolAvailable(tool, String(plan))) throw new HttpsError('failed-precondition', tool.maintenanceNotice || 'This tool is unavailable for this workspace. Contact your administrator.');
}
