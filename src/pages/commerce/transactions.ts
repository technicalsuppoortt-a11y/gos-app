import { cloudStorage } from '../../backend/workspace';
import { useSyncExternalStore } from 'react';

export interface CommerceTransaction {
  id: string;
  date: string;
  productName: string;
  amount: string;
  amountValue: number;
  currency: string;
  status: 'Completed' | 'Pending' | 'Refunded';
  customerName?: string;
  customerEmail?: string;
  method?: string;
}

// Read-only view over tenants/{tenantId}/transactions. Records are written exclusively by the
// payment-provider webhook (Cloud Function); the client can never create or edit them.
const STORAGE_KEY = 'gos-commerce-transactions';
const EMPTY: CommerceTransaction[] = [];
const listeners = new Set<() => void>();

type StoredTransaction = { id: string; status?: string; amount?: number | string; currency?: string; createdAt?: string; date?: string; productName?: string; customerName?: string; customerEmail?: string; method?: string };
function normalizeStatus(status = ''): CommerceTransaction['status'] {
  const value = status.toUpperCase();
  if (['PAID', 'COMPLETED', 'SUCCEEDED'].includes(value)) return 'Completed';
  if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(value)) return 'Refunded';
  return 'Pending';
}
function normalize(row: StoredTransaction): CommerceTransaction {
  const currency = row.currency || 'USD';
  const amountValue = typeof row.amount === 'number' ? row.amount : Number.parseFloat(String(row.amount ?? '').replace(/[^0-9.-]/g, '')) || 0;
  let amount: string;
  try { amount = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountValue); }
  catch { amount = `${amountValue.toFixed(2)} ${currency}`; }
  return { id: row.id, date: (row.createdAt ?? row.date ?? '').slice(0, 10), productName: row.productName || '—', amount, amountValue, currency, status: normalizeStatus(row.status), customerName: row.customerName, customerEmail: row.customerEmail, method: row.method };
}
let raw: string | null = null;
let transactionsCache: CommerceTransaction[] = EMPTY;
function readTransactions(): CommerceTransaction[] {
  const next = cloudStorage.getItem(STORAGE_KEY);
  if (next === raw) return transactionsCache;
  raw = next;
  try {
    const parsed: unknown = JSON.parse(next ?? '[]');
    transactionsCache = Array.isArray(parsed) ? parsed.filter(row => row && typeof row.id === 'string').map(normalize).sort((a, b) => b.date.localeCompare(a.date)) : EMPTY;
  } catch { transactionsCache = EMPTY; }
  return transactionsCache;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) { readTransactions(); listeners.forEach(fn => fn()); }
  });
}

export function getTransactions(): CommerceTransaction[] {
  return readTransactions();
}

export function recordTransaction(): never {
  throw new Error('Transactions are recorded only after the payment provider verifies the payment.');
}

export function useTransactions(): CommerceTransaction[] {
  return useSyncExternalStore(
    fn => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    readTransactions,
    () => EMPTY,
  );
}
