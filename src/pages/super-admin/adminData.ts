import { useSyncExternalStore } from 'react';

export type Client = { id: string; name: string; email: string; software: string; plan: string; status: 'Active' | 'Suspended' | 'Trial'; monthly: number; usage: number; joined: string };
export type Software = { id: string; name: string; category: string; version: string; status: 'Active' | 'Maintenance'; capacity: number };
export type Member = { id: string; name: string; email: string; role: 'Owner' | 'Administrator' | 'Support' | 'Finance'; status: 'Active' | 'Invited' | 'Suspended' };
export type Payment = { id: string; clientId: string; amount: number; date: string; status: 'Paid' | 'Pending' | 'Failed' | 'Refunded' };
export type Audit = { id: string; time: string; actor: string; action: string; severity: 'Info' | 'Warning' | 'Error' };
export type AdminData = { version: 1; clients: Client[]; softwares: Software[]; members: Member[]; payments: Payment[]; logs: Audit[]; integrations: { id: string; name: string; description: string; connected: boolean }[]; settings: { name: string; email: string; timezone: string; trialDays: number; maintenance: boolean; registrations: boolean; alerts: boolean; mfa: boolean } };
export const ADMIN_KEY = 'upclick.super-admin.mock.v1';
export const money = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
export function seedAdminData(): AdminData {
  const names = ['Ahmed Ali', 'Sara Mohamed', 'Omar Khaled', 'Lina Mansour', 'Nour Hassan', 'James Wilson', 'Maya Patel', 'Alex Chen', 'Emma Davis', 'Youssef Adel', 'Sofia Rossi', 'Daniel Kim'];
  const products = ['AI Sales', 'Coaching', 'E-Commerce', 'Real Estate', 'Agency'];
  const clients: Client[] = names.map((name, i) => ({ id: `CL-${1001 + i}`, name, email: `${name.toLowerCase().replace(' ', '.')}@example.com`, software: products[i % 5], plan: ['Growth', 'Starter', 'Business'][i % 3], status: i === 8 ? 'Suspended' : i % 4 === 3 ? 'Trial' : 'Active', monthly: [97, 47, 147][i % 3], usage: 18 + (i * 17) % 80, joined: `2026-10-${String(i + 1).padStart(2, '0')}` }));
  return { version: 1, clients, softwares: products.map((name, i) => ({ id: `SW-${i + 1}`, name, category: ['Automation', 'Education', 'Commerce', 'Property', 'Marketing'][i], version: `2.${i + 1}.0`, status: i === 3 ? 'Maintenance' : 'Active', capacity: [72, 34, 61, 24, 48][i] })), members: [
    { id: 'TM-1', name: 'Jordan Admin', email: 'jordan@example.com', role: 'Owner', status: 'Active' },
    { id: 'TM-2', name: 'Maya Johnson', email: 'maya@example.com', role: 'Administrator', status: 'Active' },
    { id: 'TM-3', name: 'Adam Smith', email: 'adam@example.com', role: 'Support', status: 'Active' },
    { id: 'TM-4', name: 'Leila Omar', email: 'leila@example.com', role: 'Finance', status: 'Invited' },
  ], payments: Array.from({ length: 30 }, (_, i) => ({ id: `INV-${2026001 + i}`, clientId: clients[i % 12].id, amount: clients[i % 12].monthly, date: new Date(Date.UTC(2026, 9 - Math.floor(i / 6), 25 - i % 6)).toISOString(), status: i % 11 === 0 ? 'Failed' : i % 7 === 0 ? 'Pending' : 'Paid' })), logs: [
    { id: 'LOG-1', time: '2026-10-27T08:42:00Z', actor: 'System', action: 'Daily backup completed successfully', severity: 'Info' },
    { id: 'LOG-2', time: '2026-10-27T08:35:00Z', actor: 'Billing service', action: 'Invoice INV-2026001 payment failed', severity: 'Error' },
    { id: 'LOG-3', time: '2026-10-27T08:20:00Z', actor: 'System', action: 'Real Estate software entered maintenance', severity: 'Warning' },
  ], integrations: [
    { id: 'stripe', name: 'Stripe', description: 'Payments, invoices and subscription billing', connected: true },
    { id: 'sendgrid', name: 'SendGrid', description: 'Transactional email and delivery events', connected: true },
    { id: 'slack', name: 'Slack', description: 'Operational alerts for your team', connected: false },
    { id: 'analytics', name: 'Google Analytics', description: 'Acquisition and product usage reporting', connected: false },
  ], settings: { name: 'Upclick', email: 'operations@example.com', timezone: 'Africa/Cairo', trialDays: 14, maintenance: false, registrations: true, alerts: true, mfa: true } };
}
// Reject incomplete or foreign snapshots instead of letting malformed storage break a page.
function validSnapshot(value: unknown): value is AdminData {
  if (!value || typeof value !== 'object') return false;
  const seed = seedAdminData();
  const shape = (actual: unknown, expected: unknown): boolean => {
    if (Array.isArray(expected)) return Array.isArray(actual) && actual.length <= 10000 && actual.every(row => shape(row, expected[0]));
    if (expected && typeof expected === 'object') return !!actual && typeof actual === 'object' && Object.entries(expected).every(([key, v]) => shape((actual as Record<string, unknown>)[key], v));
    return typeof actual === typeof expected && (typeof actual !== 'number' || Number.isFinite(actual));
  };
  if (!shape(value, seed)) return false;
  const data = value as AdminData;
  const unique = (rows: { id: string }[]) => new Set(rows.map(row => row.id)).size === rows.length;
  return data.version === 1 && [data.clients, data.softwares, data.members, data.payments, data.logs, data.integrations].every(unique)
    && data.clients.every(c => ['Active', 'Suspended', 'Trial'].includes(c.status) && c.monthly >= 0 && c.usage >= 0 && c.usage <= 100)
    && data.members.some(m => m.role === 'Owner' && m.status === 'Active')
    && data.members.every(m => ['Owner', 'Administrator', 'Support', 'Finance'].includes(m.role) && ['Active', 'Invited', 'Suspended'].includes(m.status))
    && data.softwares.every(s => ['Active', 'Maintenance'].includes(s.status) && s.capacity >= 0 && s.capacity <= 100)
    && data.clients.every(c => data.softwares.some(s => s.name === c.software) && ['Starter', 'Growth', 'Business'].includes(c.plan) && Number.isFinite(Date.parse(c.joined)))
    && data.settings.name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.settings.email)
    && Number.isInteger(data.settings.trialDays) && data.settings.trialDays >= 1 && data.settings.trialDays <= 90
    && data.payments.every(p => ['Paid', 'Pending', 'Failed', 'Refunded'].includes(p.status) && p.amount >= 0 && Number.isFinite(Date.parse(p.date)) && data.clients.some(c => c.id === p.clientId))
    && data.logs.every(l => ['Info', 'Warning', 'Error'].includes(l.severity) && Number.isFinite(Date.parse(l.time)));
}
let cache: AdminData | undefined;
let storageWarning = '';
const listeners = new Set<() => void>();
export function readAdminData(): AdminData {
  if (cache) return cache;
  try { const raw = localStorage.getItem(ADMIN_KEY); if (raw) { const parsed: unknown = JSON.parse(raw); if (validSnapshot(parsed)) return cache = parsed; storageWarning = 'Saved demo data was invalid. A fresh demo has been loaded.'; } }
  catch { storageWarning = 'Browser storage is unavailable. Changes will last for this session only.'; }
  return cache = seedAdminData();
}
export function updateAdminData(action: string, update: (data: AdminData) => void, severity: Audit['severity'] = 'Info') {
  const next = structuredClone(readAdminData());
  update(next);
  next.logs.unshift({ id: crypto.randomUUID(), time: new Date().toISOString(), actor: 'Jordan Admin', action, severity });
  next.logs = next.logs.slice(0, 500);
  if (!validSnapshot(next)) throw new Error('This change contains invalid administration data.');
  cache = next;
  try { localStorage.setItem(ADMIN_KEY, JSON.stringify(next)); } catch { storageWarning = 'Browser storage is full or unavailable. Changes will last for this session only.'; }
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => {
    if (event.key !== ADMIN_KEY && event.key !== null) return;
    cache = undefined;
    storageWarning = '';
    readAdminData();
    listener();
  };
  window.addEventListener('storage', sync);
  return () => { listeners.delete(listener); window.removeEventListener('storage', sync); };
}
export function useAdminData() {
  const data = useSyncExternalStore(subscribe, readAdminData);
  return { data, storageWarning };
}
export function exportCsv(filename: string, columns: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
  const url = URL.createObjectURL(new Blob(['\uFEFF' + [columns, ...rows].map(row => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
