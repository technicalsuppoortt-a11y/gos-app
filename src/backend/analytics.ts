import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, getDocs, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { auth, db } from './firebase';
import { decodeFirestoreValue } from './firestoreCodec';
import { safeDate } from '../utils/safeDate';

export type DateRange = { start: string; end: string };
export type AnalyticsRow = Record<string, unknown> & { id: string };
export type AnalyticsTabId = 'Overview' | 'SalesProducts' | 'FunnelsLeads' | 'ConversationsAI';
type LegacyTab = 'Overview' | 'Sales' | 'Leads' | 'Traffic' | 'Conversions' | 'Conversations' | 'Products' | 'Reports';
export type AnalyticsTab = AnalyticsTabId | LegacyTab;

type Source = readonly [collection: string, ...fields: string[]];
export type WorkspaceAnalyticsData = Record<string, AnalyticsRow[]>;

const orders = ['orders', 'createdAt', 'decidedAt', 'paidAt', 'date'] as const;
const transactions = ['transactions', 'createdAt', 'decidedAt', 'paidAt', 'date'] as const;
const checkoutRequests = ['checkoutRequests', 'createdAt', 'decidedAt'] as const;
const bookings = ['bookings', 'createdAt', 'start', 'date'] as const;
const calendars = ['calendars'] as const;
const leads = ['leads', 'createdAt'] as const;
const contacts = ['contacts', 'createdAt'] as const;
const chats = ['conversations', 'createdAt', 'created_at', 'updated_at', 'lastInboundAt'] as const;
const messages = ['messages', 'createdAt', 'sentAt'] as const;
const handoffLogs = ['handoffLogs', 'createdAt'] as const;
const products = ['products'] as const;
const assets = ['assets'] as const;
const audit = ['auditLogs', 'createdAt'] as const;
const activity = ['events', 'createdAt'] as const;
const views = ['analyticsEvents', 'createdAt'] as const;

const overview = [orders, transactions, checkoutRequests, bookings, calendars, leads, contacts, chats, products, assets, activity, views] as const;

const sources: Record<AnalyticsTab, readonly Source[]> = {
  Overview: overview,
  SalesProducts: [orders, transactions, checkoutRequests, products, views, activity],
  FunnelsLeads: [assets, leads, contacts, bookings, orders, transactions, checkoutRequests, activity, views],
  ConversationsAI: [chats, messages, handoffLogs, leads, bookings, activity],
  Sales: [orders, transactions, checkoutRequests],
  Leads: [leads, contacts],
  Traffic: [views],
  Conversions: [assets, checkoutRequests, activity, views],
  Conversations: [chats, messages, handoffLogs],
  Products: [products, orders, views],
  Reports: [...overview, audit],
};

const LIVE_COLLECTIONS = [
  'orders',
  'transactions',
  'checkoutRequests',
  'products',
  'leads',
  'contacts',
  'bookings',
  'calendars',
  'assets',
  'conversations',
  'messages',
  'handoffLogs',
  'events',
  'analyticsEvents',
] as const;

const CORE_READY_COLLECTIONS = ['orders', 'transactions', 'leads', 'bookings', 'products', 'conversations'] as const;

export function emptyAnalyticsData(): WorkspaceAnalyticsData {
  return {
    orders: [],
    transactions: [],
    checkoutRequests: [],
    checkoutRequestsMirror: [],
    products: [],
    leads: [],
    contacts: [],
    bookings: [],
    calendars: [],
    assets: [],
    conversations: [],
    messages: [],
    handoffLogs: [],
    events: [],
    analyticsEvents: [],
    auditLogs: [],
  };
}

export function dateKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, i) => String(part).padStart(i === 0 ? 4 : 2, '0'))
    .join('-');
}

export function shiftDate(key: string, days: number) {
  const date = new Date(key + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function dateBounds(range: DateRange) {
  return [new Date(range.start + 'T00:00:00'), new Date(shiftDate(range.end, 1) + 'T00:00:00')] as const;
}

export function datesIn(range: DateRange) {
  const days: string[] = [];
  if (!range.start || !range.end || range.start > range.end) return [range.end || dateKey(new Date())];
  for (let day = range.start; day <= range.end && days.length <= 370; day = shiftDate(day, 1)) {
    days.push(day);
  }
  return days.length ? days : [range.end];
}

export function previousRangeOf(range: DateRange): DateRange {
  const span = Math.max(1, datesIn(range).length);
  return {
    start: shiftDate(range.start, -span),
    end: shiftDate(range.start, -1),
  };
}

export function rowTime(row: AnalyticsRow, ...fields: string[]) {
  for (const field of fields.length ? fields : ['createdAt', 'updatedAt', 'date', 'start', 'time']) {
    const value = row[field];
    if (value === undefined || value === null || value === '') continue;
    const normalized =
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
        ? value.trim() + 'T12:00:00'
        : value;
    const time = safeDate(normalized)?.getTime();
    if (time && time > 0) return time;
  }
  return 0;
}

export function inRange(time: number, range: DateRange) {
  if (time <= 0) return false;
  const key = dateKey(new Date(time));
  return key >= range.start && key <= range.end;
}

function errorCode(error: unknown) {
  return (error as { code?: string } | null)?.code ?? 'unknown';
}

function normalizeSnapshotValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object') {
    const raw = val as Record<string, unknown>;
    if (
      val instanceof Date ||
      typeof raw.toDate === 'function' ||
      typeof raw.toMillis === 'function' ||
      (typeof raw.seconds === 'number' && Object.keys(raw).length <= 2)
    ) {
      return safeDate(val)?.toISOString() ?? null;
    }
    if (Array.isArray(val)) return val.map(normalizeSnapshotValue);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = normalizeSnapshotValue(v);
    return out;
  }
  return val;
}

async function readSource(database: typeof db, scope: string, [name, ...fields]: Source, range: DateRange) {
  const ref = collection(database, 'tenants', scope, name);
  const [start, end] = dateBounds(range);
  const reads = fields.flatMap(field => {
    const bounds = [
      [start.toISOString(), end.toISOString()],
      ...(name === 'analyticsEvents'
        ? []
        : [
            [Timestamp.fromDate(start), Timestamp.fromDate(end)],
            [start.getTime(), end.getTime()],
          ]),
      ...(field === 'date' ? [[range.start, shiftDate(range.end, 1)]] : []),
    ];
    return bounds.map(([from, until]) => query(ref, where(field, '>=', from), where(field, '<', until)));
  });
  let snapshots;
  try {
    snapshots = await Promise.all((reads.length ? reads : [ref]).map(read => getDocs(read)));
  } catch (error) {
    if (!fields.length || !['failed-precondition', 'permission-denied'].includes(errorCode(error))) {
      if (['permission-denied', 'failed-precondition', 'not-found'].includes(errorCode(error))) return [];
      throw error;
    }
    try {
      snapshots = [await getDocs(ref)];
    } catch (fallbackError) {
      if (['permission-denied', 'failed-precondition', 'not-found'].includes(errorCode(fallbackError))) return [];
      throw fallbackError;
    }
  }
  const unique = new Map<string, AnalyticsRow>();
  for (const snapshot of snapshots) {
    for (const docItem of snapshot.docs) {
      const decoded = decodeFirestoreValue(normalizeSnapshotValue(docItem.data())) as Record<string, unknown>;
      const row: AnalyticsRow = { ...decoded, id: docItem.id };
      if (!fields.length || fields.some(field => inRange(rowTime(row, field), range))) {
        unique.set(docItem.id, row);
      }
    }
  }
  return [...unique.values()];
}

export async function loadAnalyticsSources(database: typeof db, scope: string, tab: AnalyticsTab, range: DateRange) {
  const activeSources = sources[tab] ?? sources.Overview;
  const results = await Promise.allSettled(activeSources.map(source => readSource(database, scope, source, range)));
  const data: WorkspaceAnalyticsData = emptyAnalyticsData();
  const failed: { name: string; code: string }[] = [];
  results.forEach((result, index) => {
    const name = activeSources[index][0];
    data[name] = result.status === 'fulfilled' ? result.value : [];
    if (result.status === 'rejected') failed.push({ name, code: errorCode(result.reason) });
  });
  return { data, failed, error: results.length > 0 && failed.length === results.length };
}

/**
 * Real-time resilient workspace analytics subscription.
 * Streams live Firestore updates for the active tenant without disruptive partial-source banners.
 */
export function useLiveWorkspaceAnalytics() {
  const scope = useSelector((state: RootState) => state.auth.tenant?.id);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const token = useSelector((state: RootState) => state.auth.token);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    scopeKey: string;
    data: WorkspaceAnalyticsData;
    loading: boolean;
    error: boolean;
  }>(() => ({
    scopeKey: '',
    data: emptyAnalyticsData(),
    loading: true,
    error: false,
  }));

  const scopeKey = `${scope ?? ''}:${userId ?? ''}:${attempt}`;
  const latestDataRef = useRef<WorkspaceAnalyticsData>(emptyAnalyticsData());
  const workspaceFallbackRef = useRef<Record<string, AnalyticsRow[]>>({});

  const retry = useCallback(() => {
    setAttempt(v => v + 1);
  }, []);

  useEffect(() => {
    if (!scope || !userId || token === 'ui-only' || token === 'test-only') {
      return;
    }

    let active = true;
    const currentData: WorkspaceAnalyticsData = emptyAnalyticsData();
    const workspaceFallback: Record<string, AnalyticsRow[]> = {};
    latestDataRef.current = currentData;
    workspaceFallbackRef.current = workspaceFallback;
    const settled = new Set<string>();
    const unsubscribers: (() => void)[] = [];

    const publish = (forceReady = false) => {
      if (!active) return;
      const merged: WorkspaceAnalyticsData = { ...currentData };
      for (const [k, fallbackRows] of Object.entries(workspaceFallback)) {
        if ((!merged[k] || merged[k].length === 0) && fallbackRows.length > 0) {
          merged[k] = fallbackRows;
        }
      }
      const coreReady = CORE_READY_COLLECTIONS.every(col => settled.has(col));
      setState({
        scopeKey,
        data: merged,
        loading: !(forceReady || coreReady),
        error: false,
      });
    };

    const graceTimer = window.setTimeout(() => {
      publish(true);
    }, 900);

    const session = auth;
    const database = db;

    void session
      .authStateReady()
      .then(() => {
        if (!active) return;
        if (auth !== session || !session.currentUser) {
          // Graceful empty state if session is uninitialized in preview/isolated environments
          publish(true);
          return;
        }

        for (const colName of LIVE_COLLECTIONS) {
          const ref = collection(database, 'tenants', scope, colName);
          const unsub = onSnapshot(
            ref,
            snapshot => {
              if (!active) return;
              const rows: AnalyticsRow[] = snapshot.docs.map(docSnap => {
                const decoded = decodeFirestoreValue(normalizeSnapshotValue(docSnap.data())) as Record<string, unknown>;
                return { ...decoded, id: docSnap.id };
              });
              currentData[colName] = rows;
              settled.add(colName);
              publish();
            },
            () => {
              // Missing, unindexed, or permission-scoped optional collections resolve cleanly to []
              if (!active) return;
              if (!currentData[colName]) currentData[colName] = [];
              settled.add(colName);
              publish();
            }
          );
          unsubscribers.push(unsub);
        }

        // Subscribe to mirror checkout requests (`settings/checkoutRequests_{scope}/items`)
        const mirrorRef = collection(database, 'settings', `checkoutRequests_${scope}`, 'items');
        unsubscribers.push(
          onSnapshot(
            mirrorRef,
            snapshot => {
              if (!active) return;
              currentData.checkoutRequestsMirror = snapshot.docs.map(docSnap => {
                const decoded = decodeFirestoreValue(normalizeSnapshotValue(docSnap.data())) as Record<string, unknown>;
                return { ...decoded, id: docSnap.id };
              });
              publish();
            },
            () => {
              if (!active) return;
              currentData.checkoutRequestsMirror = [];
            }
          )
        );

        // Subscribe to workspaceState for legacy/mirrored booking or conversation state
        const wsRef = collection(database, 'tenants', scope, 'workspaceState');
        unsubscribers.push(
          onSnapshot(
            wsRef,
            snapshot => {
              if (!active) return;
              const keyMap: Record<string, string> = {
                'gos.booking.appointments.v2': 'bookings',
                'gos.booking-links.v1': 'calendars',
                'gos.inbox.conversations.v1': 'conversations',
                'gos-crm-leads-v1': 'leads',
                'gos-commerce-transactions': 'transactions',
              };
              for (const k of Object.values(keyMap)) workspaceFallback[k] = [];
              snapshot.forEach(item => {
                const decoded = decodeFirestoreValue(normalizeSnapshotValue(item.data())) as {
                  key?: string;
                  value?: unknown;
                };
                const target = decoded?.key ? keyMap[decoded.key] : undefined;
                if (target && Array.isArray(decoded.value)) {
                  workspaceFallback[target] = decoded.value
                    .filter((entry): entry is Record<string, unknown> & { id: string } =>
                      Boolean(entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string')
                    )
                    .map(entry => ({ ...entry }));
                }
              });
              publish();
            },
            () => {
              // Ignore workspaceState permission errors gracefully
            }
          )
        );
      })
      .catch(() => {
        if (active) publish(true);
      });

    return () => {
      active = false;
      window.clearTimeout(graceTimer);
      unsubscribers.forEach(unsub => unsub());
    };
  }, [scope, userId, token, scopeKey]);

  if (!scope || !userId) {
    return { data: emptyAnalyticsData(), loading: false, error: true, retry };
  }
  if (token === 'ui-only' || token === 'test-only') {
    return { data: emptyAnalyticsData(), loading: false, error: false, retry };
  }
  const isCurrent = state.scopeKey === scopeKey;
  return {
    data: isCurrent ? state.data : emptyAnalyticsData(),
    loading: !isCurrent || state.loading,
    error: isCurrent && state.error,
    retry,
  };
}

export function useAnalyticsData(_tab: AnalyticsTab, _range: DateRange) {
  const live = useLiveWorkspaceAnalytics();
  return {
    data: live.loading ? undefined : live.data,
    error: live.error,
    incomplete: false,
    retry: live.retry,
  };
}
