import { cloudStorage } from '../../backend/workspace';
import { store } from '../../store';
import { settingsKey } from './data';
export const modulePermissions = [
  { id: 'home', label: 'Dashboard', path: '' }, { id: 'copilot', label: 'AI Copilot', path: 'copilot' },
  { id: 'funnels', label: 'Funnels & websites', path: 'funnels' }, { id: 'inbox', label: 'Inbox', path: 'inbox' },
  { id: 'crm', label: 'CRM & leads', path: 'crm' }, { id: 'follow-up', label: 'AI Follow-Up', path: 'follow-up' },
  { id: 'booking', label: 'Booking & calendar', path: 'booking' }, { id: 'products', label: 'Products & payments', path: 'products' },
  { id: 'analytics', label: 'Analytics', path: 'analytics' },
  { id: 'inbox.send', label: 'Send messages', path: 'inbox' },
  { id: 'settings', label: 'Settings', path: 'settings' },
];
export type Member = { id: string; name: string; email: string; role: string; active: boolean; permissions: string[] };
export type TeamState = { members: Member[]; audit: string[] };
export type Session = { id: string; device: string; lastActive: string; current: boolean };
export type SecurityState = { sessions: Session[]; history: string[]; mfa: boolean; passwordHash?: string; salt?: string };
function sectionKey(section: string) { return section === 'knowledge' ? 'gos.ai-followup.knowledge.v1' : section === 'team' ? 'gos-settings-team-v1:' + (store.getState().auth.tenant?.id ?? 'demo') : settingsKey() + ':' + section; }
export function readLocal<T>(section: string, defaults: () => T): T {
  try { const saved = JSON.parse(cloudStorage.getItem(sectionKey(section)) ?? 'null'); if (saved && typeof saved === 'object') return saved as T; } catch { /* Recover malformed storage. */ }
  return defaults();
}
export function saveLocal(section: string, data: unknown) {
  if (section === 'knowledge' && Array.isArray(data)) data = data.map(item => ({ ...item, title: item.title || item.name, name: item.title || item.name, type: item.type || 'text', detail: item.content || item.detail, content: item.content || item.detail, approved: true }));
  try { cloudStorage.setItem(sectionKey(section), JSON.stringify(data)); }
  catch { throw new Error('Changes could not be saved. Browser storage is full or unavailable.'); }
  window.dispatchEvent(new Event('gos-settings-changed'));
}
export function defaultTeam(): TeamState { const user = store.getState().auth.user; return { members: user ? [{ id: user.id, name: user.name, email: user.email, role: 'Owner', active: true, permissions: modulePermissions.map(module => module.id) }] : [], audit: [] }; }
export function readTeam(): TeamState {
  const value = readLocal('team', defaultTeam);
  if (!Array.isArray(value.members) || !Array.isArray(value.audit)) return defaultTeam();
  return { ...value, members: value.members.filter(member => typeof member?.id === 'string' && typeof member.email === 'string' && typeof member.name === 'string' && typeof member.active === 'boolean' && Array.isArray(member.permissions)) };
}
export function defaultSecurity(): SecurityState { return { sessions: [], history: [], mfa: false }; }
export function readSecurity(): SecurityState {
  const value = readLocal('security', defaultSecurity);
  return Array.isArray(value.sessions) && Array.isArray(value.history) && typeof value.mfa === 'boolean' ? value : defaultSecurity();
}
export async function passwordDigest(password: string, salt: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + password));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function changeDemoPassword(state: SecurityState, current: string, next: string): Promise<SecurityState> {
  if (next.length < 12) throw new Error('Use at least 12 characters.');
  if (current === next) throw new Error('Choose a different new password.');
  const valid = state.passwordHash && state.salt ? await passwordDigest(current, state.salt) === state.passwordHash : current === 'DemoPassword123!';
  if (!valid) throw new Error('The current demo password is incorrect.');
  const salt = crypto.randomUUID();
  return { ...state, salt, passwordHash: await passwordDigest(next, salt), history: [`${new Date().toLocaleString('en-GB')} · Demo password changed`, ...state.history] };
}
