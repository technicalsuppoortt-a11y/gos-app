import { useEntities } from './workspace';
import type { CanonicalLead } from '../store/slices/crmSlice';
import type { Appointment, BookingPage } from '../pages/booking/model';
import type { Product } from '../pages/commerce/model';
import type { Conversation } from '../pages/inbox/inboxData';
export type BusinessEvent = { id: string; type: string; createdAt: string; resource?: string; resourceId?: string; amount?: number; currency?: string; source?: string; productId?: string; actorId?: string; leadId?: string; device?: string; step?: string };
export type VerifiedTransaction = { id: string; status: string; amount: number | string; currency?: string; createdAt?: string; date?: string; productId?: string; productName?: string; customerName?: string; customerEmail?: string; method?: string };
export const eventLabel = (type: string) => ({ 'workspace.updated': 'Changes saved', 'booking.saved': 'Booking saved', 'booking.cancelled': 'Booking cancelled', 'copilot.responded': 'Assistant response received', 'copilot.draft_created': 'Assistant draft created', 'settings.updated': 'Settings updated' }[type] ?? type.replaceAll('.', ' ').replaceAll('_', ' '));
export function resourceLabel(key = '') { return /product|commerce/.test(key) ? 'Products & payments' : /booking|calendar/.test(key) ? 'Booking & calendar' : /followup|workflow/.test(key) ? 'AI Follow-Up' : /inbox|conversation/.test(key) ? 'Inbox' : /crm|lead/.test(key) ? 'CRM & leads' : /asset|domain/.test(key) ? 'Funnels & websites' : /settings/.test(key) ? 'Settings' : 'Workspace'; }
export function parseTimestampMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof (val as { toMillis?: () => number }).toMillis === 'function') return (val as { toMillis: () => number }).toMillis();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') return (val as { toDate: () => Date }).toDate().getTime();
  if (typeof (val as { seconds?: number }).seconds === 'number') {
    const nanos = typeof (val as { nanoseconds?: number }).nanoseconds === 'number' ? (val as { nanoseconds: number }).nanoseconds : 0;
    return (val as { seconds: number }).seconds * 1000 + Math.floor(nanos / 1000000);
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function toIsoDateString(val: unknown): string {
  const ms = parseTimestampMs(val);
  return ms > 0 ? new Date(ms).toISOString() : new Date().toISOString();
}

export function useBusinessMetrics(days = 30) {
  const leads = useEntities<CanonicalLead>('leads');
  const bookings = useEntities<Appointment>('bookings');
  const calendars = useEntities<BookingPage>('calendars');
  const products = useEntities<Product>('products');
  const conversations = useEntities<Conversation>('conversations');
  const events = useEntities<BusinessEvent>('events');
  const transactions = useEntities<VerifiedTransaction>('transactions');
  const now = new Date(), cutoff = Date.now() - days * 86400000;
  const recentEvents = events.filter(event => parseTimestampMs(event.createdAt) >= cutoff);
  const paid = transactions.filter(transaction => ['Paid', 'Completed', 'PAID'].includes(transaction.status) && parseTimestampMs(transaction.createdAt ?? transaction.date) >= cutoff);
  // Never aggregate different currencies into a single revenue figure.
  const currencies = [...new Set(paid.map(transaction => transaction.currency).filter(Boolean))];
  const currency = currencies[0] || 'USD';
  const revenue = paid.filter(transaction => transaction.currency === currency).reduce((sum, transaction) => sum + (typeof transaction.amount === 'number' ? transaction.amount : 0), 0);
  const money = (amount: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(now); date.setDate(now.getDate() - days + index + 1);
    const key = date.toISOString().slice(0, 10);
    return { date: key, label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      revenue: paid.filter(transaction => transaction.currency === currency && toIsoDateString(transaction.createdAt ?? transaction.date).slice(0, 10) === key).reduce((sum, transaction) => sum + (typeof transaction.amount === 'number' ? transaction.amount : 0), 0),
      events: recentEvents.filter(event => toIsoDateString(event.createdAt).slice(0, 10) === key).length };
  });
  return { leads, bookings, calendars, products, conversations, events: recentEvents, paid, revenue, currency, currencies, money, daily, customers: leads.filter(lead => ['ACTIVE_CUSTOMER', 'CUSTOMER', 'PAYMENT_COMPLETED'].includes(lead.stage)).length };
}

