import { useEffect, useState } from 'react';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { auth, db } from './firebase';
import { decodeFirestoreValue } from './firestoreCodec';
import { safeDate } from '../utils/safeDate';

export type DateRange = { start: string; end: string };
export type AnalyticsRow = Record<string, unknown> & { id: string };
type Source = readonly [collection: string, ...fields: string[]];
type Data = Record<string, AnalyticsRow[]>;

const orders = ['orders', 'createdAt', 'decidedAt', 'paidAt', 'date'] as const;
const transactions = ['transactions', 'createdAt', 'decidedAt', 'paidAt', 'date'] as const;
const leads = ['leads', 'createdAt'] as const;
const chats = ['conversations', 'createdAt', 'created_at', 'lastInboundAt'] as const;
const audit = ['auditLogs', 'createdAt'] as const;
const activity = ['events', 'createdAt'] as const;
const views = ['analyticsEvents', 'createdAt'] as const;
const overview = [orders, transactions, leads, chats, audit, activity] as const;
const sources = {
  Overview: overview,
  Sales: [orders, transactions],
  Leads: [leads, ['contacts', 'createdAt']],
  Traffic: [views],
  Conversions: [['assets'], ['checkoutRequests', 'createdAt', 'decidedAt'], activity, views],
  Conversations: [chats, ['messages', 'createdAt'], ['handoffLogs', 'createdAt']],
  Products: [['products'], orders, views],
  Reports: [...overview, views],
} as const satisfies Record<string, readonly Source[]>;

export type AnalyticsTab = keyof typeof sources;

export function dateKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, i) => String(part).padStart(i === 0 ? 4 : 2, '0')).join('-');
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
  for (let day = range.start; day <= range.end; day = shiftDate(day, 1)) days.push(day);
  return days;
}

export function rowTime(row: AnalyticsRow, ...fields: string[]) {
  for (const field of fields.length ? fields : ['createdAt']) {
    const value = row[field];
    const time = safeDate(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00' : value)?.getTime();
    if (time) return time;
  }
  return 0;
}

export function inRange(time: number, range: DateRange) {
  return time > 0 && dateKey(new Date(time)) >= range.start && dateKey(new Date(time)) <= range.end;
}

function errorCode(error: unknown) {
  return (error as { code?: string } | null)?.code ?? 'unknown';
}

async function readSource(database: typeof db, scope: string, [name, ...fields]: Source, range: DateRange) {
  const ref = collection(database, 'tenants', scope, name);
  const [start, end] = dateBounds(range);
  // Older writers stored ISO strings and payment dates. Newer services also use Firestore timestamps.
  const reads = fields.flatMap(field => {
    const bounds = [
      [start.toISOString(), end.toISOString()],
      ...(name === 'analyticsEvents' ? [] : [
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
    // Older projects can have index exemptions or query-specific rules. A
    // direct list still has to pass the same tenant collection's read rules.
    if (!fields.length || !['failed-precondition', 'permission-denied'].includes(errorCode(error))) throw error;
    snapshots = [await getDocs(ref)];
  }
  const unique = new Map<string, AnalyticsRow>();
  for (const snapshot of snapshots) for (const doc of snapshot.docs) {
    const row = { ...decodeFirestoreValue(doc.data()), id: doc.id };
    if (!fields.length || fields.some(field => inRange(rowTime(row, field), range))) unique.set(doc.id, row);
  }
  return [...unique.values()];
}

export async function loadAnalyticsSources(database: typeof db, scope: string, tab: AnalyticsTab, range: DateRange) {
  const results = await Promise.allSettled(sources[tab].map(source => readSource(database, scope, source, range)));
  const data: Data = {};
  const failed: { name: string; code: string }[] = [];
  results.forEach((result, index) => {
    const name = sources[tab][index][0];
    data[name] = result.status === 'fulfilled' ? result.value : [];
    if (result.status === 'rejected') failed.push({ name, code: errorCode(result.reason) });
  });
  return { data, failed, error: failed.length === results.length };
}

export function useAnalyticsData(tab: AnalyticsTab, range: DateRange) {
  const scope = useSelector((state: RootState) => state.auth.tenant?.id);
  const user = useSelector((state: RootState) => state.auth.user?.id);
  const { start, end } = range;
  const key = JSON.stringify([scope, user, tab, start, end]);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string } & Awaited<ReturnType<typeof loadAnalyticsSources>>>();
  const requestKey = `${key}/${attempt}`;
  useEffect(() => {
    if (!scope || !user) return;
    let current = true;
    const session = auth;
    const database = db;
    void session.authStateReady().then(async () => {
      if (!current) return;
      if (auth !== session || !session.currentUser) {
        setResult({ key: requestKey, data: {}, failed: [], error: true });
        return;
      }
      const response = await loadAnalyticsSources(database, scope, tab, { start, end });
      if (!current || auth !== session) return;
      if (response.failed.length) console.warn('Analytics source reads failed', tab, response.failed);
      setResult({ key: requestKey, ...response });
    }).catch(error => {
      if (current) setResult({ key: requestKey, data: {}, failed: [], error: true });
      console.warn('Analytics session initialization failed', errorCode(error));
    });
    return () => { current = false; };
  }, [scope, user, tab, start, end, requestKey]);
  return {
    data: result?.key === requestKey ? result.data : undefined,
    error: !scope || !user || (result?.key === requestKey && result.error),
    incomplete: result?.key === requestKey && Boolean(result.failed.length),
    retry: () => setAttempt(value => value + 1),
  };
}
