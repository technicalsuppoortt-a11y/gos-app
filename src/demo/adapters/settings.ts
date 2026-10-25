import { read, write, rows, entityMutation, saveSettings } from '../store';
import { store } from '../../store';
import { loginSuccess } from '../../store/slices/authSlice';
import { demoSession } from './session';
import { endDemoSession } from '../mode';
const returnUrl = () => window.location.origin + '/dashboard/settings/billing';
export async function firebaseSettingsRequest<T>(path: string, body?: any, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const settings = read<any>('settings', {});
  if (path === '/settings') {
    if (method === 'GET') return structuredClone(settings) as T;
    saveSettings({ ...settings, ...body });
    if (body.profile) store.dispatch(loginSuccess({ ...demoSession, user: { ...demoSession.user, name: body.profile.name, email: body.profile.email, avatar: body.profile.photo } }));
    return { success: true, profile: body.profile ?? settings.profile } as T;
  }
  if (path === '/team/audit' || path === '/integrations/logs') return { entries: read('audit', ['Demo workspace initialized · Sample data']) } as T;
  if (path.startsWith('/team')) {
    if (method === 'GET') return { members: rows('members') } as T;
    const id = path.split('/')[2] || body?.id || crypto.randomUUID();
    entityMutation('members', id, method === 'DELETE' ? undefined : { ...body, active: body.active ?? true }, true);
    write('audit', [`Demo team ${method.toLowerCase()}`, ...read<string[]>('audit', [])]); return { success: true } as T;
  }
  if (path.startsWith('/integrations/')) {
    const [, , provider, action] = path.split('/');
    const previous = settings.integrations?.[provider] ?? { status: 'Not Connected', sync: false };
    if (method === 'GET') return previous as T;
    if (action === 'test') return { ok: previous.status === 'Connected', problem: previous.status === 'Connected' ? undefined : 'Connect the demo channel first.' } as T;
    const connection = method === 'DELETE' ? { status: 'Not Connected', sync: false } : { ...previous, ...body, status: 'Connected', account: provider + ' · Demo account', sync: body?.sync ?? true };
    saveSettings({ ...settings, integrations: { ...settings.integrations, [provider]: connection } }); return connection as T;
  }
  if (path === '/security' && method === 'GET') return read('security', { sessions: [{ id: 'demo-session', device: 'This browser · Demo', lastActive: 'Now', current: true }], history: ['Isolated demo session started'], mfa: false }) as T;
  if (path.startsWith('/security/')) {
    const security = read<any>('security', { sessions: [], history: [], mfa: false });
    if (path.includes('sessions/')) security.sessions = security.sessions.filter((session: any) => session.id !== path.split('/').at(-1));
    if (path.includes('mfa') || path.includes('2fa')) security.mfa = body?.enabled ?? !security.mfa;
    write('security', { ...security, history: ['Demo security settings updated', ...security.history] });
    return { success: true, message: 'Demo security settings updated. No real account was changed.' } as T;
  }
  if (path === '/billing/checkout') {
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Choose a valid demo credit amount.');
    const used = read<string[]>('checkout-requests', []);
    if (!used.includes(body.idempotencyKey)) {
      const balance = settings.balance + amount;
      saveSettings({ ...settings, balance, transactions: [{ id: crypto.randomUUID(), date: new Date().toLocaleDateString(), type: 'Top Up', description: 'Simulated demo top-up', service: '—', amount, balance }, ...settings.transactions] });
      write('checkout-requests', [...used, body.idempotencyKey]);
    }
    return { url: returnUrl() } as T;
  }
  if (path === '/billing/payment-methods/setup') {
    const method = { id: crypto.randomUUID(), name: 'Demo payment method', kind: body?.method ?? 'card', detail: 'Simulated · no real card charged' };
    saveSettings({ ...settings, paymentMethods: [...settings.paymentMethods, method] }); return { url: returnUrl() } as T;
  }
  if (path === '/billing/recharge') { saveSettings({ ...settings, recharge: body }); return { success: true } as T; }
  if (path === '/billing/payment-methods/default') { saveSettings({ ...settings, defaultMethod: body.id }); return { success: true } as T; }
  if (path.startsWith('/billing/')) return { url: returnUrl(), message: 'Demo subscription settings saved.' } as T;
  if (path === '/account') { endDemoSession('/auth/login'); return { success: true } as T; }
  throw new Error('Unknown demo settings action: ' + path);
}
