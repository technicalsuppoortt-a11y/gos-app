import { useSyncExternalStore } from 'react';

export interface CommerceTransaction {
  id: string;
  date: string;
  productName: string;
  amount: string;
  status: 'Completed' | 'Pending' | 'Refunded';
  customerName?: string;
  customerEmail?: string;
  method?: string;
}

const STORAGE_KEY = 'gos-commerce-transactions';

const seedTransactions: CommerceTransaction[] = [
  {
    id: '#TXN-8821',
    date: '2026-10-12',
    productName: 'Complete AI Marketing Course',
    customerName: 'Sarah Ahmed',
    customerEmail: 'sarah@northstar.co',
    amount: '€297.00',
    method: 'Visa •••• 4242',
    status: 'Completed',
  },
  {
    id: '#TXN-8820',
    date: '2026-10-10',
    productName: 'Social Media Templates Pack',
    customerName: 'Omar Khaled',
    customerEmail: 'omar@orbitlabs.io',
    amount: '€47.00',
    method: 'Mastercard •••• 5512',
    status: 'Completed',
  },
  {
    id: '#TXN-8819',
    date: '2026-10-08',
    productName: 'Strategy & Coaching Session',
    customerName: 'David Miller',
    customerEmail: 'david@agencyflow.io',
    amount: '€199.00',
    method: 'PayPal',
    status: 'Completed',
  },
  {
    id: '#TXN-8818',
    date: '2026-10-05',
    productName: 'GOS Pro Membership',
    customerName: 'Lina Mansour',
    customerEmail: 'lina@brightpath.com',
    amount: '€29.00',
    method: 'Apple Pay',
    status: 'Completed',
  },
];

const listeners = new Set<() => void>();

function readTransactions(): CommerceTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall back to seed
  }
  return seedTransactions;
}

let transactionsCache: CommerceTransaction[] = typeof window !== 'undefined' ? readTransactions() : seedTransactions;

function notifyListeners() {
  listeners.forEach(fn => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) {
      transactionsCache = readTransactions();
      notifyListeners();
    }
  });
  window.addEventListener('gos-transactions-updated', () => {
    transactionsCache = readTransactions();
    notifyListeners();
  });
}

export function getTransactions(): CommerceTransaction[] {
  return transactionsCache;
}

export function recordTransaction(data: {
  productName: string;
  amount: string;
  status?: 'Completed' | 'Pending' | 'Refunded';
  customerName?: string;
  customerEmail?: string;
  method?: string;
  date?: string;
  id?: string;
}): CommerceTransaction {
  const current = readTransactions();
  const newTxn: CommerceTransaction = {
    id: data.id || `#TXN-${Math.floor(1000 + Math.random() * 9000)}`,
    date: data.date || new Date().toISOString().split('T')[0],
    productName: data.productName,
    amount: data.amount.startsWith('€') || data.amount.startsWith('$') ? data.amount : `€${data.amount}`,
    status: data.status || 'Completed',
    customerName: data.customerName || 'Demo Customer',
    customerEmail: data.customerEmail || 'customer@example.com',
    method: data.method || 'Credit Card',
  };

  const next = [newTxn, ...current];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to save transaction to localStorage:', err);
  }

  transactionsCache = next;
  notifyListeners();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gos-transactions-updated'));
  }

  return newTxn;
}

export function useTransactions(): CommerceTransaction[] {
  return useSyncExternalStore(
    fn => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => transactionsCache,
    () => seedTransactions
  );
}
