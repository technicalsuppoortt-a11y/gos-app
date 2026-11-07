import { useEffect, useState } from 'react';
import { collection, collectionGroup, doc, limit, onSnapshot, orderBy, query, Timestamp, where, type DocumentData, type QueryDocumentSnapshot, type DocumentReference, type Query } from 'firebase/firestore';
import { backendError, callBackend, primaryDb } from './firebase';
import { safeDate } from '../utils/safeDate';
import type { PlatformTeamRole } from '../types/auth';

export type AccountStatus = 'Active' | 'Suspended' | 'Pending';
export type PlatformAccount = {
  id: string; name: string; email: string; role: string; status: AccountStatus; joined: Date | null;
  tenantId: string; supportParentId: string; billingOwnerId: string; defaultAgencyUserId: string; agency: boolean;
};
export type PlatformPayment = {
  key: string; id: string; name: string; scope: string; method: string; date: Date | null;
  amount: number | null; currency: string; status: string; platformRevenue: boolean;
};
export type PlatformSettings = {
  name: string; email: string; timezone: string; trialDays: number;
  registrations: boolean; maintenance: boolean; mfa: boolean; alerts: boolean;
};
export const platformTimezones = ['Africa/Cairo', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Dubai'];
const defaults: PlatformSettings = { name: 'Upclick', email: '', timezone: 'Africa/Cairo', trialDays: 14, registrations: true, maintenance: false, mfa: false, alerts: false };

type Credentials = { name: string; email: string; password: string; requestId: string; language: string };
type Operation = ({ operation: 'createAdmin' } & Credentials) | ({ operation: 'createMember'; role: PlatformTeamRole } & Credentials)
  | { operation: 'editAdmin'; id: string; name: string; email: string }
  | { operation: 'setStatus'; id: string; active: boolean }
  | { operation: 'deleteAdmin'; id: string }
  | { operation: 'saveSettings'; settings: PlatformSettings; revision: number };

export async function updatePlatform(input: Operation) {
  return callBackend('superAdminOperations', input);
}

const string = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => {
  const result = typeof value === 'string' && value.trim() ? Number(value) : value;
  return typeof result === 'number' && Number.isFinite(result) ? result : null;
};
const currency = (value: unknown) => /^[A-Z]{3}$/.test(string(value).toUpperCase()) ? string(value).toUpperCase() : '';
const timestamp = (value: Date | null) => value?.getTime() ?? 0;

export const isAdminAccount = (account: PlatformAccount) => ['ADMIN', 'OWNER', 'PLATFORM_ADMIN'].includes(account.role);
export const isSubUser = (account: PlatformAccount, admin: PlatformAccount) => account.role === 'USER' && (
  account.id === admin.defaultAgencyUserId || account.billingOwnerId === admin.id || account.supportParentId === admin.id ||
  (!account.supportParentId && !account.billingOwnerId && !!admin.tenantId && account.tenantId === admin.tenantId)
);

function account(record: QueryDocumentSnapshot): PlatformAccount | null {
  const row = record.data(), rawStatus = string(row.status).toLowerCase();
  if (row.activatedUid || row.deletedAt || rawStatus === 'deleted') return null;
  const status = ['suspended', 'deactivated', 'inactive'].includes(rawStatus) ? 'Suspended' : ['pending', 'invited', 'provisioning'].includes(rawStatus) ? 'Pending' : 'Active';
  return {
    id: record.id, name: string(row.name), email: string(row.email || row.contactEmail), status,
    role: string(row.role).toUpperCase(), joined: safeDate(row.created || row.createdAt),
    tenantId: string(row.tenantId), supportParentId: string(row.supportParentId), billingOwnerId: string(row.billingOwnerId || (row.accountType === 'agency' ? row.createdBy : '')),
    defaultAgencyUserId: string(row.defaultAgencyUserId), agency: row.accountType === 'agency',
  };
}

function payment(record: QueryDocumentSnapshot): PlatformPayment {
  const row = record.data(), rawStatus = string(row.status).trim().toLowerCase();
  const statuses: Record<string, string> = { paid: 'Paid', completed: 'Paid', succeeded: 'Paid', confirmed: 'Paid', pending: 'Pending', processing: 'Pending',
    failed: 'Failed', refunded: 'Refunded', partially_refunded: 'Partially refunded', cancelled: 'Cancelled', canceled: 'Cancelled',
    approved: 'Approved', rejected: 'Rejected' };
  const billing = record.ref.parent.id === 'billingRequests';
  // Legacy instant checkouts can record approval from a client-reported gateway flag.
  const unverified = billing && rawStatus === 'approved' && row.decidedBy === 'gateway-webhook';
  const status = unverified ? 'Unverified' : Object.hasOwn(statuses, rawStatus) ? statuses[rawStatus] : 'Unknown';
  return {
    key: record.ref.path, id: string(row.invoiceId || row.invoiceNumber) || record.id,
    name: string(row.requesterName || row.customerName || row.requesterEmail || row.customerEmail || row.requesterId),
    scope: billing ? (row.providerId === 'platform' ? 'Platform billing' : 'Reseller billing') : 'Commerce transaction',
    method: string(row.paymentMethod || row.method || row.gateway || row.provider),
    date: safeDate(row.paidAt ?? (billing && status === 'Approved' ? row.decidedAt : undefined) ?? row.createdAt ?? row.date),
    amount: amount(billing ? row.total ?? row.totalAmount : row.amount ?? row.total), currency: currency(row.currency || row.plan?.currency),
    status, platformRevenue: billing && status === 'Approved' && !!string(row.decidedBy) && row.providerId === 'platform' && row.type !== 'wallet_topup',
  };
}

type Live<T> = { data: T; loading: boolean; error: string; cached: boolean };
const emptyRows: never[] = [];

function useRows<T>(source: Query<DocumentData>, map: (record: QueryDocumentSnapshot) => T, enabled = true): Live<T[]> {
  const [state, setState] = useState<Live<T[]>>({ data: emptyRows, loading: enabled, error: '', cached: false });
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(source, { includeMetadataChanges: true }, snapshot => {
      setState({ data: snapshot.docs.map(map), loading: false, error: '', cached: snapshot.metadata.fromCache });
    }, error => setState({ data: emptyRows, loading: false, error: backendError(error), cached: false }));
  }, [source, map, enabled]);
  return state;
}

function useRecord<T>(source: DocumentReference, map: (data: DocumentData) => T): Live<T> {
  const [state, setState] = useState<Live<T>>(() => ({ data: map({}), loading: true, error: '', cached: false }));
  useEffect(() => onSnapshot(source, { includeMetadataChanges: true }, snapshot => {
    setState({ data: map(snapshot.data() ?? {}), loading: false, error: '', cached: snapshot.metadata.fromCache });
  }, error => setState({ data: map({}), loading: false, error: backendError(error), cached: false })), [source, map]);
  return state;
}

const users = collection(primaryDb, 'users');
const billingRequests = collection(primaryDb, 'billingRequests');
const commerceTransactions = collectionGroup(primaryDb, 'transactions');
const usage = query(collection(primaryDb, 'billingLedger'), where('type', '==', 'usage'));
const subscriptions = collection(primaryDb, 'billingSubscriptions');
const auditLog = collection(primaryDb, 'userManagementAudit');
const recentAudit = query(auditLog, where('createdAt', '>=', Timestamp.fromDate(new Date(0))), orderBy('createdAt', 'desc'), limit(500));
const legacyAudit = query(auditLog, where('createdAt', '>=', '1970-01-01'), orderBy('createdAt', 'desc'), limit(500));
const settings = doc(primaryDb, 'settings', 'platformOperations');
const wallet = doc(primaryDb, 'communicationWallets', 'platform');
const managedWallets = query(collection(primaryDb, 'communicationWallets'), where('providerId', '==', 'platform'));

export function usePlatformAccounts() {
  const state = useRows(users, account);
  return { ...state, data: state.data.filter(row => row !== null).sort((a, b) => timestamp(b.joined) - timestamp(a.joined) || a.name.localeCompare(b.name)) };
}

export function usePlatformPayments(includeCommerce: boolean) {
  const invoices = useRows(billingRequests, payment);
  const transactions = useRows(commerceTransactions, payment, includeCommerce);
  return { data: [...invoices.data, ...transactions.data].sort((a, b) => timestamp(b.date) - timestamp(a.date)), loading: invoices.loading || transactions.loading,
    error: invoices.error || transactions.error, cached: invoices.cached || transactions.cached };
}

const mapUsage = (record: QueryDocumentSnapshot) => {
  const row = record.data();
  return { id: record.id, amount: Math.abs(amount(row.amount) ?? 0), description: string(row.usageType || row.description) };
};
export const usePlatformUsage = () => useRows(usage, mapUsage);

const mapSubscription = (record: QueryDocumentSnapshot) => {
  const row = record.data();
  return { id: record.id, status: string(row.status), plan: string(row.plan?.name?.en || row.planId), expires: safeDate(row.currentPeriodEnd) };
};
export const usePlatformSubscriptions = () => useRows(subscriptions, mapSubscription);

const mapAudit = (record: QueryDocumentSnapshot) => {
  const row = record.data();
  return { id: record.id, time: safeDate(row.createdAt), actor: string(row.actorId) || 'System', action: string(row.type), target: string(row.userId || row.resourceId),
    severity: row.severity === 'Warning' || row.severity === 'Error' ? String(row.severity) : 'Info' };
};
export function usePlatformAudit() {
  // Firestore orders strings and timestamps separately, so query each format before merging.
  const current = useRows(recentAudit, mapAudit), legacy = useRows(legacyAudit, mapAudit);
  const entries = new Map([...current.data, ...legacy.data].map(row => [row.id, row]));
  return { data: [...entries.values()].sort((a, b) => timestamp(b.time) - timestamp(a.time)).slice(0, 500),
    loading: current.loading || legacy.loading, error: current.error || legacy.error, cached: current.cached || legacy.cached };
}

const mapSettings = (row: DocumentData) => ({
  revision: amount(row.revision) ?? 0,
  settings: {
    name: string(row.name) || defaults.name, email: string(row.email), timezone: platformTimezones.includes(row.timezone) ? String(row.timezone) : defaults.timezone,
    trialDays: amount(row.trialDays) ?? defaults.trialDays, registrations: typeof row.registrations === 'boolean' ? row.registrations : defaults.registrations,
    maintenance: row.maintenance === true, mfa: row.mfa === true, alerts: row.alerts === true,
  } satisfies PlatformSettings,
});
export const usePlatformSettings = () => useRecord(settings, mapSettings);

const mapWallet = (row: DocumentData) => {
  const balance = amount(row.balance);
  const held = amount(row.held) ?? 0;
  return { balance, available: balance === null ? null : Math.max(0, balance - held), held, currency: currency(row.currency) };
};
export const usePlatformWallet = () => useRecord(wallet, mapWallet);
const mapManagedWallet = (record: QueryDocumentSnapshot) => ({ id: record.id, ...mapWallet(record.data()) });
export const useManagedWallets = () => useRows(managedWallets, mapManagedWallet);
