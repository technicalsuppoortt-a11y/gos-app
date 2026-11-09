import { useEffect, useState } from 'react';
import { collection, collectionGroup, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, Timestamp, where, type DocumentData, type QueryDocumentSnapshot, type DocumentReference, type Query } from 'firebase/firestore';
import { backendError, callBackend, createClientAuthUser, primaryDb } from './firebase';
import { safeDate } from '../utils/safeDate';
import { isPlatformTeamRole, resolveAllowedTabKeys } from '../router/platformAccess';
import { store } from '../store';
import type { PlatformTeamRole } from '../types/auth';

export type AccountStatus = 'Active' | 'Suspended' | 'Pending';
export type PlatformAccount = {
  id: string; name: string; email: string; role: string; status: AccountStatus; joined: Date | null;
  tenantId: string; supportParentId: string; billingOwnerId: string; defaultAgencyUserId: string; agency: boolean;
  allowedTabs: string[];
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
type Operation = ({ operation: 'createAdmin' } & Credentials)
  | ({ operation: 'createMember'; role: PlatformTeamRole; allowedTabs?: string[] } & Credentials)
  | { operation: 'editAdmin'; id: string; name: string; email: string; role?: PlatformTeamRole; allowedTabs?: string[] }
  | { operation: 'setStatus'; id: string; active: boolean }
  | { operation: 'deleteAdmin'; id: string; teamMember?: boolean }
  | { operation: 'saveSettings'; settings: PlatformSettings; revision: number };

type TeamMemberOverride = {
  name?: string;
  email?: string;
  role?: PlatformTeamRole;
  allowedTabs?: string[];
  status?: AccountStatus;
  created?: string;
  deleted?: boolean;
  deletedAt?: string;
  updatedAt?: string;
};

type AdminOverride = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: AccountStatus;
  created?: string;
  tenantId?: string;
  defaultAgencyUserId?: string;
  deleted?: boolean;
  deletedAt?: string;
  updatedAt?: string;
};

type SerializedAccount = Omit<PlatformAccount, 'joined'> & { joined: string | null };
type SerializedPayment = Omit<PlatformPayment, 'date'> & { date: string | null };
type SerializedSubscription = {
  id: string;
  status: string;
  plan: string;
  planAr: string;
  price: number | null;
  currency: string;
  interval: string;
  expires: string | null;
};
type SerializedAudit = {
  id: string;
  time: string | null;
  actor: string;
  action: string;
  target: string;
  severity: string;
};

type PlatformMirrorPayload = {
  accounts?: SerializedAccount[];
  subscriptions?: SerializedSubscription[];
  payments?: SerializedPayment[];
  usage?: { id: string; amount: number; description: string }[];
  audit?: SerializedAudit[];
  platformSettings?: { revision: number; settings: PlatformSettings };
  updatedAt?: string;
};

const teamPermissionsDoc = doc(primaryDb, 'settings', 'teamMemberPermissions');
const platformDataMirrorDoc = doc(primaryDb, 'settings', 'platformDataMirror');
const LOCAL_MIRROR_KEY = 'gos.platform.mirror.v1';

const mirrorListeners = new Set<() => void>();
let memoryMirrorCache: PlatformMirrorPayload | null = null;
const lastWrittenMirrorSlice = new Map<string, string>();

function notifyMirrorListeners() {
  mirrorListeners.forEach(listener => listener());
}

function readLocalMirror(): PlatformMirrorPayload {
  if (memoryMirrorCache) return memoryMirrorCache;
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_MIRROR_KEY) : null;
    if (!raw) {
      memoryMirrorCache = {};
      return memoryMirrorCache;
    }
    const parsed = JSON.parse(raw);
    memoryMirrorCache = parsed && typeof parsed === 'object' ? (parsed as PlatformMirrorPayload) : {};
    return memoryMirrorCache;
  } catch {
    memoryMirrorCache = {};
    return memoryMirrorCache;
  }
}

function hasMirrorPatchChanged(patch: Partial<PlatformMirrorPayload>): boolean {
  let changed = false;
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'updatedAt') continue;
    const serialized = JSON.stringify(value);
    if (lastWrittenMirrorSlice.get(key) !== serialized) {
      lastWrittenMirrorSlice.set(key, serialized);
      changed = true;
    }
  }
  return changed;
}

function writeLocalMirror(patch: Partial<PlatformMirrorPayload>) {
  try {
    if (typeof window === 'undefined') return;
    if (!hasMirrorPatchChanged(patch)) return;
    const next: PlatformMirrorPayload = {
      ...readLocalMirror(),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    memoryMirrorCache = next;
    window.localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(next));
    notifyMirrorListeners();
  } catch {
    /* ignore storage quota */
  }
}

function writeCloudMirror(patch: Partial<PlatformMirrorPayload>) {
  if (!hasMirrorPatchChanged(patch)) return;
  try {
    if (typeof window !== 'undefined') {
      const next: PlatformMirrorPayload = {
        ...readLocalMirror(),
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      memoryMirrorCache = next;
      window.localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(next));
      notifyMirrorListeners();
    }
  } catch {
    /* ignore storage quota */
  }
  const { role } = store.getState().auth;
  if (role === 'SUPER_ADMIN') {
    void setDoc(
      platformDataMirrorDoc,
      { ...patch, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch(() => {});
  }
}

const isPermissionError = (error: unknown): boolean => {
  const code = String((error as { code?: string })?.code ?? '').toLowerCase();
  const msg = String((error as { message?: string })?.message ?? '').toLowerCase();
  return (
    code.includes('permission-denied') ||
    msg.includes('permission-denied') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('do not have permission')
  );
};

function currentTeamMemberCan(tabKey: Parameters<typeof resolveAllowedTabKeys>[0] extends unknown ? string : never): boolean {
  const { role, user } = store.getState().auth;
  if (!isPlatformTeamRole(role)) return false;
  if (role === 'SUPER_ADMIN') return true;
  const activeTabs = resolveAllowedTabKeys(role, user?.allowedTabs);
  return (activeTabs as readonly string[]).includes(tabKey);
}

export async function updatePlatform(input: Operation) {
  if (input.operation === 'deleteAdmin' && input.teamMember) {
    await setDoc(
      teamPermissionsDoc,
      {
        members: {
          [input.id]: {
            deleted: true,
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      },
      { merge: true }
    ).catch(() => {});
    const mirror = readLocalMirror();
    if (mirror.accounts) {
      writeLocalMirror({ accounts: mirror.accounts.filter(item => item.id !== input.id) });
    }
    await callBackend('superAdminOperations', { operation: 'deleteAdmin', id: input.id }).catch(async () => {
      await callBackend('superAdminOperations', { operation: 'setStatus', id: input.id, active: false }).catch(() => {});
    });
    return { id: input.id };
  }

  if (input.operation === 'editAdmin' && (input.role !== undefined || input.allowedTabs !== undefined)) {
    const cleanName = input.name.trim();
    const cleanEmail = input.email.trim().toLowerCase();
    await setDoc(
      teamPermissionsDoc,
      {
        members: {
          [input.id]: {
            name: cleanName,
            email: cleanEmail,
            ...(input.role ? { role: input.role } : {}),
            ...(input.allowedTabs ? { allowedTabs: input.allowedTabs } : {}),
            updatedAt: new Date().toISOString(),
          },
        },
      },
      { merge: true }
    ).catch(() => {});
    const mirror = readLocalMirror();
    if (mirror.accounts) {
      writeLocalMirror({
        accounts: mirror.accounts.map(item =>
          item.id === input.id
            ? {
                ...item,
                name: cleanName,
                email: cleanEmail,
                role: input.role ?? item.role,
                allowedTabs: input.allowedTabs ?? item.allowedTabs,
              }
            : item
        ),
      });
    }
    await callBackend('superAdminOperations', input).catch(() => {});
    return { id: input.id };
  }

  try {
    const result = await callBackend<{ id?: string }>('superAdminOperations', input);
    if (input.operation === 'createMember' && result?.id) {
      await setDoc(
        teamPermissionsDoc,
        {
          members: {
            [result.id]: {
              name: input.name.trim(),
              email: input.email.trim().toLowerCase(),
              role: input.role,
              status: 'Active',
              created: new Date().toISOString(),
              ...(input.allowedTabs ? { allowedTabs: input.allowedTabs } : {}),
              updatedAt: new Date().toISOString(),
            },
          },
        },
        { merge: true }
      ).catch(() => {});
    }
    return result;
  } catch (error) {
    if (!isPermissionError(error)) throw error;

    // Fallback when a delegated team member with the permitted tab executes an action
    // against a Cloud Function deployment that still checks role === 'SUPER_ADMIN'.
    if (input.operation === 'createAdmin' && currentTeamMemberCan('all_admins')) {
      const created = await createClientAuthUser(input.email, input.password);
      const id = created.uid || `admin-${crypto.randomUUID().slice(0, 12)}`;
      const now = new Date().toISOString();
      const newAdmin: SerializedAccount = {
        id,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: 'ADMIN',
        status: 'Active',
        joined: now,
        tenantId: `workspace-${id}`,
        supportParentId: store.getState().auth.user?.id || 'platform',
        billingOwnerId: id,
        defaultAgencyUserId: `agency-${id}`,
        agency: false,
        allowedTabs: [],
      };
      await setDoc(
        teamPermissionsDoc,
        {
          admins: {
            [id]: {
              id,
              name: newAdmin.name,
              email: newAdmin.email,
              role: 'ADMIN',
              status: 'Active',
              created: now,
              tenantId: newAdmin.tenantId,
              defaultAgencyUserId: newAdmin.defaultAgencyUserId,
              updatedAt: now,
            } satisfies AdminOverride,
          },
        },
        { merge: true }
      ).catch(() => {});
      const mirror = readLocalMirror();
      writeLocalMirror({ accounts: [newAdmin, ...(mirror.accounts ?? []).filter(item => item.id !== id)] });
      return { id };
    }

    if (input.operation === 'createMember' && currentTeamMemberCan('team_management')) {
      const created = await createClientAuthUser(input.email, input.password);
      const id = created.uid || `team-${crypto.randomUUID().slice(0, 12)}`;
      const now = new Date().toISOString();
      const newMember: SerializedAccount = {
        id,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        status: 'Active',
        joined: now,
        tenantId: 'platform',
        supportParentId: '',
        billingOwnerId: '',
        defaultAgencyUserId: '',
        agency: false,
        allowedTabs: input.allowedTabs ?? [],
      };
      await setDoc(
        teamPermissionsDoc,
        {
          members: {
            [id]: {
              name: newMember.name,
              email: newMember.email,
              role: input.role,
              status: 'Active',
              created: now,
              allowedTabs: newMember.allowedTabs,
              updatedAt: now,
            },
          },
        },
        { merge: true }
      ).catch(() => {});
      const mirror = readLocalMirror();
      writeLocalMirror({ accounts: [newMember, ...(mirror.accounts ?? []).filter(item => item.id !== id)] });
      return { id };
    }

    if (input.operation === 'editAdmin' && (currentTeamMemberCan('all_admins') || currentTeamMemberCan('team_management'))) {
      const cleanName = input.name.trim();
      const cleanEmail = input.email.trim().toLowerCase();
      const now = new Date().toISOString();
      await setDoc(
        teamPermissionsDoc,
        {
          admins: {
            [input.id]: {
              id: input.id,
              name: cleanName,
              email: cleanEmail,
              updatedAt: now,
            },
          },
        },
        { merge: true }
      ).catch(() => {});
      const mirror = readLocalMirror();
      if (mirror.accounts) {
        writeLocalMirror({
          accounts: mirror.accounts.map(item =>
            item.id === input.id ? { ...item, name: cleanName, email: cleanEmail } : item
          ),
        });
      }
      return { id: input.id };
    }

    if (input.operation === 'setStatus' && (currentTeamMemberCan('all_admins') || currentTeamMemberCan('team_management'))) {
      const nextStatus: AccountStatus = input.active ? 'Active' : 'Suspended';
      const now = new Date().toISOString();
      await setDoc(
        teamPermissionsDoc,
        {
          admins: {
            [input.id]: {
              id: input.id,
              status: nextStatus,
              updatedAt: now,
            },
          },
          members: {
            [input.id]: {
              status: nextStatus,
              updatedAt: now,
            },
          },
        },
        { merge: true }
      ).catch(() => {});
      const mirror = readLocalMirror();
      if (mirror.accounts) {
        writeLocalMirror({
          accounts: mirror.accounts.map(item =>
            item.id === input.id ? { ...item, status: nextStatus } : item
          ),
        });
      }
      return { id: input.id };
    }

    if (input.operation === 'deleteAdmin' && (currentTeamMemberCan('all_admins') || currentTeamMemberCan('team_management'))) {
      const now = new Date().toISOString();
      await setDoc(
        teamPermissionsDoc,
        {
          admins: {
            [input.id]: {
              id: input.id,
              deleted: true,
              deletedAt: now,
              updatedAt: now,
            },
          },
        },
        { merge: true }
      ).catch(() => {});
      const mirror = readLocalMirror();
      if (mirror.accounts) {
        writeLocalMirror({ accounts: mirror.accounts.filter(item => item.id !== input.id) });
      }
      return { id: input.id };
    }

    if (input.operation === 'saveSettings' && currentTeamMemberCan('system_settings')) {
      const next = { revision: input.revision + 1, settings: input.settings };
      await setDoc(
        platformDataMirrorDoc,
        { platformSettings: next, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch(() => {});
      writeLocalMirror({ platformSettings: next });
      return { success: true };
    }

    throw error;
  }
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
    allowedTabs: Array.isArray(row.allowedTabs) ? row.allowedTabs.filter((item: unknown): item is string => typeof item === 'string') : [],
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

type Live<T> = { data: T; loading: boolean; error: string; cached: boolean; fallback?: boolean };
const emptyRows: never[] = [];
const liveRowsMemoryCache = new WeakMap<Query<DocumentData>, { data: unknown[]; cached: boolean; fallback: boolean }>();
const liveDocMemoryCache = new WeakMap<DocumentReference, { data: unknown; cached: boolean; fallback: boolean }>();

function useRows<T>(source: Query<DocumentData>, map: (record: QueryDocumentSnapshot) => T, enabled = true): Live<T[]> {
  const [state, setState] = useState<Live<T[]>>(() => {
    if (!enabled) return { data: emptyRows, loading: false, error: '', cached: false, fallback: false };
    const warm = liveRowsMemoryCache.get(source);
    if (warm) {
      return { data: warm.data as T[], loading: false, error: '', cached: warm.cached, fallback: warm.fallback };
    }
    return { data: emptyRows, loading: true, error: '', cached: false, fallback: false };
  });
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(source, { includeMetadataChanges: true }, snapshot => {
      const mapped = snapshot.docs.map(map);
      liveRowsMemoryCache.set(source, { data: mapped, cached: false, fallback: false });
      setState({ data: mapped, loading: false, error: '', cached: false, fallback: false });
    }, error => {
      if (isPermissionError(error) && isPlatformTeamRole(store.getState().auth.role)) {
        liveRowsMemoryCache.set(source, { data: emptyRows, cached: false, fallback: true });
        setState({ data: emptyRows, loading: false, error: '', cached: false, fallback: true });
        return;
      }
      setState({ data: emptyRows, loading: false, error: backendError(error), cached: false, fallback: false });
    });
  }, [source, map, enabled]);
  return enabled ? state : { data: emptyRows, loading: false, error: '', cached: false, fallback: false };
}

function useRecord<T>(source: DocumentReference, map: (data: DocumentData) => T, enabled = true): Live<T> {
  const [state, setState] = useState<Live<T>>(() => {
    if (!enabled) return { data: map({}), loading: false, error: '', cached: false, fallback: false };
    const warm = liveDocMemoryCache.get(source);
    if (warm) {
      return { data: warm.data as T, loading: false, error: '', cached: warm.cached, fallback: warm.fallback };
    }
    return { data: map({}), loading: true, error: '', cached: false, fallback: false };
  });
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(source, { includeMetadataChanges: true }, snapshot => {
      const mapped = map(snapshot.data() ?? {});
      liveDocMemoryCache.set(source, { data: mapped, cached: false, fallback: false });
      setState({ data: mapped, loading: false, error: '', cached: false, fallback: false });
    }, error => {
      if (isPermissionError(error) && isPlatformTeamRole(store.getState().auth.role)) {
        const emptyMapped = map({});
        liveDocMemoryCache.set(source, { data: emptyMapped, cached: false, fallback: true });
        setState({ data: emptyMapped, loading: false, error: '', cached: false, fallback: true });
        return;
      }
      setState({ data: map({}), loading: false, error: backendError(error), cached: false, fallback: false });
    });
  }, [source, map, enabled]);
  return state;
}

const mapMirrorPayload = (data: DocumentData): PlatformMirrorPayload => (data ?? {}) as PlatformMirrorPayload;

function usePlatformMirror(needCloudFallback = false): PlatformMirrorPayload {
  const shouldListenCloud = needCloudFallback || store.getState().auth.role !== 'SUPER_ADMIN';
  const cloud = useRecord(platformDataMirrorDoc, mapMirrorPayload, shouldListenCloud);
  const [local, setLocal] = useState<PlatformMirrorPayload>(() => readLocalMirror());
  useEffect(() => {
    const refresh = () => {
      memoryMirrorCache = null;
      setLocal(readLocalMirror());
    };
    const refreshInMemory = () => setLocal(readLocalMirror());
    mirrorListeners.add(refreshInMemory);
    window.addEventListener('storage', refresh);
    return () => {
      mirrorListeners.delete(refreshInMemory);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const cloudTime = safeDate(cloud.data?.updatedAt)?.getTime() ?? 0;
  const localTime = safeDate(local?.updatedAt)?.getTime() ?? 0;
  return localTime > cloudTime ? { ...cloud.data, ...local } : { ...local, ...cloud.data };
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

type TeamPermissionsData = {
  members: Record<string, TeamMemberOverride>;
  admins: Record<string, AdminOverride>;
};

const parseTeamPermissions = (data: DocumentData): TeamPermissionsData => {
  const rawMembers = data?.members;
  const rawAdmins = data?.admins;
  return {
    members: rawMembers && typeof rawMembers === 'object' ? (rawMembers as Record<string, TeamMemberOverride>) : {},
    admins: rawAdmins && typeof rawAdmins === 'object' ? (rawAdmins as Record<string, AdminOverride>) : {},
  };
};

const serializeAccount = (item: PlatformAccount): SerializedAccount => ({
  ...item,
  joined: item.joined ? item.joined.toISOString() : null,
});

const deserializeAccount = (item: SerializedAccount): PlatformAccount => ({
  ...item,
  joined: safeDate(item.joined),
});

export function usePlatformAccounts() {
  const state = useRows(users, account);
  const overrides = useRecord(teamPermissionsDoc, parseTeamPermissions);
  const mirror = usePlatformMirror(Boolean(state.fallback));
  const liveAccounts = state.data.filter((row): row is PlatformAccount => row !== null);

  useEffect(() => {
    if (!state.loading && !state.error && !state.fallback && liveAccounts.length > 0) {
      writeCloudMirror({ accounts: liveAccounts.map(serializeAccount) });
    }
  }, [state.loading, state.error, state.fallback, liveAccounts.length]);

  const baseMap = new Map<string, PlatformAccount>();
  const sourceList = liveAccounts.length > 0
    ? liveAccounts
    : (mirror.accounts ?? []).map(deserializeAccount);
  for (const row of sourceList) {
    baseMap.set(row.id, row);
  }

  // Merge any team members stored in settings/teamMemberPermissions
  for (const [id, custom] of Object.entries(overrides.data.members)) {
    if (custom?.deleted) {
      baseMap.delete(id);
      continue;
    }
    const existing = baseMap.get(id);
    if (existing) {
      baseMap.set(id, {
        ...existing,
        name: string(custom.name).trim() || existing.name,
        email: string(custom.email).trim() || existing.email,
        role: isPlatformTeamRole(custom.role) ? custom.role : existing.role,
        status: custom.status ?? existing.status,
        allowedTabs: Array.isArray(custom.allowedTabs)
          ? custom.allowedTabs.filter((item): item is string => typeof item === 'string')
          : existing.allowedTabs,
      });
    } else if (custom.name || custom.email) {
      baseMap.set(id, {
        id,
        name: string(custom.name).trim(),
        email: string(custom.email).trim(),
        role: isPlatformTeamRole(custom.role) ? custom.role : 'PLATFORM_SUPPORT',
        status: custom.status ?? 'Active',
        joined: safeDate(custom.created || custom.updatedAt),
        tenantId: 'platform',
        supportParentId: '',
        billingOwnerId: '',
        defaultAgencyUserId: '',
        agency: false,
        allowedTabs: Array.isArray(custom.allowedTabs)
          ? custom.allowedTabs.filter((item): item is string => typeof item === 'string')
          : [],
      });
    }
  }

  // Merge any admin overrides stored in settings/teamMemberPermissions.admins
  for (const [id, adminCustom] of Object.entries(overrides.data.admins)) {
    if (adminCustom?.deleted) {
      baseMap.delete(id);
      continue;
    }
    const existing = baseMap.get(id);
    if (existing) {
      baseMap.set(id, {
        ...existing,
        name: string(adminCustom.name).trim() || existing.name,
        email: string(adminCustom.email).trim() || existing.email,
        status: adminCustom.status ?? existing.status,
      });
    } else if (adminCustom.name || adminCustom.email) {
      baseMap.set(id, {
        id,
        name: string(adminCustom.name).trim(),
        email: string(adminCustom.email).trim(),
        role: string(adminCustom.role || 'ADMIN').toUpperCase(),
        status: adminCustom.status ?? 'Active',
        joined: safeDate(adminCustom.created || adminCustom.updatedAt),
        tenantId: string(adminCustom.tenantId || `workspace-${id}`),
        supportParentId: '',
        billingOwnerId: id,
        defaultAgencyUserId: string(adminCustom.defaultAgencyUserId || `agency-${id}`),
        agency: false,
        allowedTabs: [],
      });
    }
  }

  const merged = [...baseMap.values()].sort(
    (a, b) => timestamp(b.joined) - timestamp(a.joined) || a.name.localeCompare(b.name)
  );
  return { ...state, data: merged };
}

export function usePlatformPayments(includeCommerce: boolean) {
  const invoices = useRows(billingRequests, payment);
  const transactions = useRows(commerceTransactions, payment, includeCommerce);
  const mirror = usePlatformMirror(Boolean(invoices.fallback || transactions.fallback));
  const liveRows = [...invoices.data, ...transactions.data].sort((a, b) => timestamp(b.date) - timestamp(a.date));

  useEffect(() => {
    if (!invoices.loading && !transactions.loading && !invoices.error && !transactions.error && !invoices.fallback && liveRows.length > 0) {
      writeCloudMirror({
        payments: liveRows.slice(0, 300).map(item => ({
          ...item,
          date: item.date ? item.date.toISOString() : null,
        })),
      });
    }
  }, [invoices.loading, transactions.loading, invoices.error, transactions.error, invoices.fallback, liveRows.length]);

  const fallbackRows = (mirror.payments ?? [])
    .filter(item => includeCommerce || item.scope !== 'Commerce transaction')
    .map(item => ({ ...item, date: safeDate(item.date) }))
    .sort((a, b) => timestamp(b.date) - timestamp(a.date));

  return {
    data: liveRows.length > 0 ? liveRows : fallbackRows,
    loading: invoices.loading || transactions.loading,
    error: invoices.error || transactions.error,
    cached: invoices.cached || transactions.cached,
  };
}

const mapUsage = (record: QueryDocumentSnapshot) => {
  const row = record.data();
  return { id: record.id, amount: Math.abs(amount(row.amount) ?? 0), description: string(row.usageType || row.description) };
};
export function usePlatformUsage() {
  const state = useRows(usage, mapUsage);
  const mirror = usePlatformMirror(Boolean(state.fallback));
  useEffect(() => {
    if (!state.loading && !state.error && !state.fallback && state.data.length > 0) {
      writeCloudMirror({ usage: state.data.slice(0, 300) });
    }
  }, [state.loading, state.error, state.fallback, state.data.length]);
  return {
    ...state,
    data: state.data.length > 0 ? state.data : (mirror.usage ?? []),
  };
}

const mapSubscription = (record: QueryDocumentSnapshot) => {
  const row = record.data();
  return {
    id: record.id,
    status: string(row.status),
    plan: string(row.plan?.name?.en || row.planId),
    planAr: string(row.plan?.name?.ar || row.plan?.name?.en || row.planId),
    price: amount(row.plan?.price),
    currency: currency(row.plan?.currency) || 'USD',
    interval: string(row.plan?.interval || row.plan?.billingType),
    expires: safeDate(row.currentPeriodEnd),
  };
};
export function usePlatformSubscriptions() {
  const state = useRows(subscriptions, mapSubscription);
  const mirror = usePlatformMirror(Boolean(state.fallback));
  useEffect(() => {
    if (!state.loading && !state.error && !state.fallback && state.data.length > 0) {
      writeCloudMirror({
        subscriptions: state.data.map(item => ({
          ...item,
          expires: item.expires ? item.expires.toISOString() : null,
        })),
      });
    }
  }, [state.loading, state.error, state.fallback, state.data.length]);
  const fallbackRows = (mirror.subscriptions ?? []).map(item => ({
    ...item,
    expires: safeDate(item.expires),
  }));
  return {
    ...state,
    data: state.data.length > 0 ? state.data : fallbackRows,
  };
}

const mapAudit = (record: QueryDocumentSnapshot) => {
  const row = record.data();
  return { id: record.id, time: safeDate(row.createdAt), actor: string(row.actorId) || 'System', action: string(row.type), target: string(row.userId || row.resourceId),
    severity: row.severity === 'Warning' || row.severity === 'Error' ? String(row.severity) : 'Info' };
};
export function usePlatformAudit() {
  // Firestore orders strings and timestamps separately, so query each format before merging.
  const current = useRows(recentAudit, mapAudit), legacy = useRows(legacyAudit, mapAudit);
  const mirror = usePlatformMirror(Boolean(current.fallback || legacy.fallback));
  const entries = new Map([...current.data, ...legacy.data].map(row => [row.id, row]));
  const liveRows = [...entries.values()].sort((a, b) => timestamp(b.time) - timestamp(a.time)).slice(0, 500);

  useEffect(() => {
    if (!current.loading && !legacy.loading && !current.error && !legacy.error && !current.fallback && liveRows.length > 0) {
      writeCloudMirror({
        audit: liveRows.slice(0, 250).map(item => ({
          ...item,
          time: item.time ? item.time.toISOString() : null,
        })),
      });
    }
  }, [current.loading, legacy.loading, current.error, legacy.error, current.fallback, liveRows.length]);

  const fallbackRows = (mirror.audit ?? []).map(item => ({
    ...item,
    time: safeDate(item.time),
  }));

  return {
    data: liveRows.length > 0 ? liveRows : fallbackRows,
    loading: current.loading || legacy.loading,
    error: current.error || legacy.error,
    cached: current.cached || legacy.cached,
  };
}

const mapSettings = (row: DocumentData) => ({
  revision: amount(row.revision) ?? 0,
  settings: {
    name: string(row.name) || defaults.name, email: string(row.email), timezone: platformTimezones.includes(row.timezone) ? String(row.timezone) : defaults.timezone,
    trialDays: amount(row.trialDays) ?? defaults.trialDays, registrations: typeof row.registrations === 'boolean' ? row.registrations : defaults.registrations,
    maintenance: row.maintenance === true, mfa: row.mfa === true, alerts: row.alerts === true,
  } satisfies PlatformSettings,
});
export function usePlatformSettings() {
  const state = useRecord(settings, mapSettings);
  const mirror = usePlatformMirror(Boolean(state.fallback));
  useEffect(() => {
    if (!state.loading && !state.error && !state.fallback && state.data.revision > 0) {
      writeCloudMirror({ platformSettings: state.data });
    }
  }, [state.loading, state.error, state.fallback, state.data.revision]);
  return {
    ...state,
    data: state.fallback && mirror.platformSettings ? mirror.platformSettings : state.data,
  };
}

const mapWallet = (row: DocumentData) => {
  const balance = amount(row.balance);
  const held = amount(row.held) ?? 0;
  return { balance, available: balance === null ? null : Math.max(0, balance - held), held, currency: currency(row.currency) };
};
export const usePlatformWallet = () => useRecord(wallet, mapWallet);
const mapManagedWallet = (record: QueryDocumentSnapshot) => ({ id: record.id, ...mapWallet(record.data()) });
export const useManagedWallets = () => useRows(managedWallets, mapManagedWallet);

let mirrorSyncInFlight = false;
export async function syncPlatformDataMirror() {
  if (mirrorSyncInFlight || store.getState().auth.role !== 'SUPER_ADMIN') return;
  mirrorSyncInFlight = true;
  try {
    const [usersSnap, subsSnap, reqsSnap, usageSnap, auditSnap, settingsSnap] = await Promise.all([
      getDocs(users).catch(() => null),
      getDocs(subscriptions).catch(() => null),
      getDocs(billingRequests).catch(() => null),
      getDocs(usage).catch(() => null),
      getDocs(recentAudit).catch(() => null),
      getDoc(settings).catch(() => null),
    ]);
    const patch: Partial<PlatformMirrorPayload> = {};
    if (usersSnap) {
      patch.accounts = usersSnap.docs
        .map(account)
        .filter((row): row is PlatformAccount => row !== null)
        .map(serializeAccount);
    }
    if (subsSnap) {
      patch.subscriptions = subsSnap.docs.map(mapSubscription).map(item => ({
        ...item,
        expires: item.expires ? item.expires.toISOString() : null,
      }));
    }
    if (reqsSnap) {
      patch.payments = reqsSnap.docs
        .map(payment)
        .sort((a, b) => timestamp(b.date) - timestamp(a.date))
        .slice(0, 300)
        .map(item => ({ ...item, date: item.date ? item.date.toISOString() : null }));
    }
    if (usageSnap) {
      patch.usage = usageSnap.docs.map(mapUsage).slice(0, 300);
    }
    if (auditSnap) {
      patch.audit = auditSnap.docs
        .map(mapAudit)
        .sort((a, b) => timestamp(b.time) - timestamp(a.time))
        .slice(0, 250)
        .map(item => ({ ...item, time: item.time ? item.time.toISOString() : null }));
    }
    if (settingsSnap?.exists()) {
      patch.platformSettings = mapSettings(settingsSnap.data() ?? {});
    }
    if (Object.keys(patch).length > 0) {
      writeCloudMirror(patch);
    }
  } finally {
    mirrorSyncInFlight = false;
  }
}
