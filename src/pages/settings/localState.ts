import { store } from '../../store';
import { settingsKey } from './data';
export const modulePermissions = [
  { id: 'home', label: 'Dashboard', path: '' }, { id: 'copilot', label: 'AI Copilot', path: 'copilot' },
  { id: 'funnels', label: 'Funnels & websites', path: 'funnels' }, { id: 'inbox', label: 'Inbox', path: 'inbox' },
  { id: 'crm', label: 'CRM & leads', path: 'crm' }, { id: 'follow-up', label: 'AI Follow-Up', path: 'follow-up' },
  { id: 'booking', label: 'Booking & calendar', path: 'booking' }, { id: 'products', label: 'Products & payments', path: 'products' },
  { id: 'analytics', label: 'Analytics', path: 'analytics' },
];
export type Member = { id: string; name: string; email: string; role: string; active: boolean; permissions: string[] };
export type TeamState = { members: Member[]; audit: string[] };
export type Session = { id: string; device: string; lastActive: string; current: boolean };
export type SecurityState = { sessions: Session[]; history: string[]; mfa: boolean; passwordHash?: string; salt?: string };
function sectionKey(section: string) { return section === 'team' ? 'gos-settings-team-v1:' + (store.getState().auth.tenant?.id ?? 'demo') : settingsKey() + ':' + section; }
export function readLocal<T>(section: string, defaults: () => T): T {
  try { const saved = JSON.parse(localStorage.getItem(sectionKey(section)) ?? 'null'); if (saved && typeof saved === 'object') return saved as T; } catch { /* Recover malformed storage. */ }
  return defaults();
}
export function saveLocal(section: string, data: unknown) {
  try { localStorage.setItem(sectionKey(section), JSON.stringify(data)); }
  catch { throw new Error('Changes could not be saved. Browser storage is full or unavailable.'); }
  window.dispatchEvent(new Event('gos-settings-changed'));
}
export function defaultTeam(): TeamState {
  const user = store.getState().auth.user;
  return { members: [
    { id: user?.id ?? 'owner', name: user?.name ?? 'Mohamed Joe', email: user?.email ?? 'm.joe@example.com', role: 'Owner', active: true, permissions: modulePermissions.map(module => module.id) },
    { id: 'demo-sarah', name: 'Sarah Chen', email: 'sarah@northstar.example', role: 'Sales', active: true, permissions: ['home', 'crm', 'inbox', 'booking', 'products'] },
    { id: 'demo-omar', name: 'Omar Hassan', email: 'omar@northstar.example', role: 'Manager', active: true, permissions: modulePermissions.map(module => module.id) },
    { id: 'demo-emma', name: 'Emma Wilson', email: 'emma@northstar.example', role: 'Support', active: false, permissions: ['home', 'inbox', 'booking'] },
  ], audit: ['Sample activity · Sarah Chen joined the Sales team.', 'Sample activity · Omar Hassan was assigned the Manager role.'] };
}
export function readTeam(): TeamState {
  const value = readLocal('team', defaultTeam);
  if (!Array.isArray(value.members) || !Array.isArray(value.audit)) return defaultTeam();
  return { ...value, members: value.members.filter(member => typeof member?.id === 'string' && typeof member.email === 'string' && typeof member.name === 'string' && typeof member.active === 'boolean' && Array.isArray(member.permissions)) };
}
export function defaultSecurity(): SecurityState {
  const ago = (hours: number) => new Date(Date.now() - hours * 3600000).toLocaleString('en-GB');
  return { mfa: false, sessions: [
    { id: 'current', device: 'This browser · Cairo, Egypt', lastActive: 'Active now', current: true },
    { id: 'sample-mac', device: 'Chrome on macOS · Cairo, Egypt', lastActive: ago(4), current: false },
    { id: 'sample-phone', device: 'Safari on iPhone · Dubai, UAE', lastActive: ago(25), current: false },
  ], history: [`${ago(1)} · Successful sign-in · Cairo, Egypt`, `${ago(25)} · Successful sign-in · Safari on iPhone`, `${ago(48)} · Failed sign-in · Incorrect password`, `${ago(72)} · Successful sign-in · Chrome on macOS`] };
}
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
