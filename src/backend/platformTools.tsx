import { useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useLocation } from 'react-router-dom';
import { db, auth, backendError } from './firebase';
import { initialTools, type ToolItem } from '../pages/admin/tools-data';
import { useUILanguage } from '../i18n/display';
import { toolPolicyAllows } from './toolPolicy';
import { effectiveStatus, entitledTools, useSubscription } from './billing';

type ToolState = Pick<ToolItem, 'enabled' | 'status' | 'settings' | 'accessTier'> & { maintenanceNotice: string };
export type PlatformTools = Record<string, ToolState>;
// Unconfigured workspaces preserve their existing availability. Saving one tool
// must never activate sample maintenance/disabled states on unrelated modules.
export const defaultPlatformTools = initialTools.map(tool => ({ ...tool, enabled: true, status: 'Active' as const }));
export function usePlatformTools() {
  const [state, setState] = useState<{ tools: PlatformTools; loading: boolean; error: string; revision: number }>({ tools: {}, loading: true, error: '', revision: 0 });
  useEffect(() => onSnapshot(doc(db, 'settings', 'platformTools'), snap => setState({ tools: snap.data()?.tools ?? {}, loading: false, error: '', revision: snap.data()?.revision ?? 0 }), error => setState(s => ({ ...s, loading: false, error: backendError(error) }))), []);
  return state;
}
export async function persistPlatformTools(tools: ToolItem[], expectedRevision: number) {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to save tool settings.');
  for (const tool of tools) for (const field of tool.settingFields) {
    const value = tool.settings[field.key];
    if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000000)) throw new Error(`${field.label[0]} must be a valid non-negative number.`);
    if (field.type === 'boolean' && typeof value !== 'boolean') throw new Error(`Invalid ${field.label[0]}.`);
    if (field.options && !field.options.includes(String(value))) throw new Error(`Choose a valid ${field.label[0]}.`);
  }
  const values = Object.fromEntries(tools.map(t => [t.id, { enabled: t.enabled, status: t.status, settings: t.settings, accessTier: t.accessTier, maintenanceNotice: t.maintenanceNotice ?? '' }]));
  await runTransaction(db, async tx => {
    const ref = doc(db, 'settings', 'platformTools');
    const old = await tx.get(ref);
    if ((old.data()?.revision ?? 0) !== expectedRevision) throw new Error('Tools changed in another session. Review the latest values and try again.');
    tx.set(ref, { tools: values, revision: expectedRevision + 1, updatedBy: uid, updatedAt: serverTimestamp() });
  });
}
const routes: Record<string, string> = { copilot: 'ai-copilot', funnels: 'funnel-builder', websites: 'funnel-builder', forms: 'funnel-builder', domains: 'custom-domains', crm: 'crm-pipeline', inbox: 'unified-inbox', booking: 'booking-engine', products: 'products-payments', 'products-payments': 'products-payments', 'follow-up': 'ai-followup', 'ai-followup': 'ai-followup', analytics: 'analytics-bi', integrations: 'webhooks-api', templates: 'email-sms', academy: 'client-portal' };
/** Wrap only authenticated user layouts; existing pages and permissions remain in place. */
export function PlatformToolBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ar = useUILanguage().startsWith('ar');
  const { tools, loading, error } = usePlatformTools();
  const id = pathname.startsWith('/dashboard/settings/integrations') ? 'webhooks-api' : routes[pathname.replace(/^\/dashboard\/?/, '').replace(/^\//, '').split('/')[0]];
  const tool = tools[id];
  const tenantId = useSelector((s: RootState) => s.auth.tenant?.id);
  const uid = useSelector((s: RootState) => s.auth.user?.id ?? null);
  const { data: sub, loading: subLoading } = useSubscription(uid);
  const [plan, setPlan] = useState('');
  useEffect(() => {
    setPlan('');
    if (!tenantId) return;
    return onSnapshot(doc(db, 'tenants', tenantId), snap => {
      const tenant = snap.data();
      setPlan(String(typeof tenant?.plan === 'string' ? tenant.plan : tenant?.planId ?? tenant?.subscription?.plan ?? '').toLowerCase());
    }, () => setPlan(''));
  }, [tenantId]);
  // Optional policy lookup must not block the original workspace while the
  // settings rules are being deployed, or when this auxiliary read is offline.
  if (!loading && !error && !toolPolicyAllows(tool, plan)) return <section className="module-access-message"><h1>{initialTools.find(t => t.id === id)?.name[ar ? 1 : 0]}</h1><p>{tool?.maintenanceNotice || (ar ? 'هذه الأداة غير متاحة حاليًا. تواصل مع المسؤول.' : 'This tool is currently unavailable. Contact your administrator.')}</p><a href="/dashboard/support">{ar ? 'الدعم' : 'Contact support'}</a></section>;
  // Billing entitlement: only enforced once the account has a billing subscription,
  // so workspaces that were never placed on a plan keep their existing access.
  if (id && sub && !subLoading) {
    const status = effectiveStatus(sub);
    const name = initialTools.find(t => t.id === id)?.name[ar ? 1 : 0];
    const billingLink = <a href="/dashboard/plans">{ar ? 'الاشتراك والباقات' : 'View plans'}</a>;
    if (status === 'expired' || status === 'cancelled') return <section className="module-access-message"><h1>{name}</h1><p>{ar ? 'انتهى اشتراكك. جدّد باقتك لمتابعة استخدام هذه الأداة.' : 'Your subscription has ended. Renew your plan to keep using this tool.'}</p>{billingLink}</section>;
    if (sub.plan?.tools?.length && !entitledTools(sub).includes(id)) return <section className="module-access-message"><h1>{name}</h1><p>{ar ? 'هذه الأداة غير مشمولة في باقتك الحالية. قم بالترقية أو اطلب إضافة.' : 'This tool is not included in your current plan. Upgrade or request an add-on.'}</p>{billingLink}</section>;
  }
  return children;
}
