import { useCurrency } from '../context/CurrencyContext';
import { useEntities } from './workspace';
import { safeDate } from '../utils/safeDate';
import type { CanonicalLead } from '../store/slices/crmSlice';
import type { Appointment, BookingPage } from '../pages/booking/model';
import type { Product } from '../pages/commerce/model';
import type { Conversation } from '../pages/inbox/inboxData';
export type BusinessEvent = { id: string; type: string; createdAt: string; resource?: string; resourceId?: string; amount?: number; currency?: string; source?: string; productId?: string; actorId?: string; leadId?: string; device?: string; step?: string };
export type VerifiedTransaction = { id: string; status: string; amount: number | string; currency?: string; createdAt?: string; date?: string; productId?: string; productName?: string; customerName?: string; customerEmail?: string; method?: string };
export const eventLabel = (type: string) => ({ 'workspace.updated': 'Changes saved', 'booking.saved': 'Booking saved', 'booking.cancelled': 'Booking cancelled', 'copilot.responded': 'Assistant response received', 'copilot.draft_created': 'Assistant draft created', 'settings.updated': 'Settings updated' }[type] ?? type.replaceAll('.', ' ').replaceAll('_', ' '));
export function resourceLabel(key = '') { return /product|commerce/.test(key) ? 'Products & payments' : /booking|calendar/.test(key) ? 'Booking & calendar' : /followup|workflow/.test(key) ? 'AI Follow-Up' : /inbox|conversation/.test(key) ? 'Inbox' : /crm|lead/.test(key) ? 'CRM & leads' : /asset|domain/.test(key) ? 'Funnels & websites' : /settings/.test(key) ? 'Settings' : 'Workspace'; }
export function parseTimestampMs(val: unknown): number {
  return safeDate(val)?.getTime() ?? 0;
}

export function toIsoDateString(val: unknown): string {
  const ms = parseTimestampMs(val);
  return ms > 0 ? new Date(ms).toISOString() : new Date().toISOString();
}

export interface MetricsFilter {
  days?: number;
  startDate?: string;
  endDate?: string;
  channel?: string;
}

export function useBusinessMetrics(filter: number | MetricsFilter = 30) {
  const { formatPrice, formatCompactPrice } = useCurrency();
  const leads = useEntities<CanonicalLead>('leads');
  const bookings = useEntities<Appointment>('bookings');
  const calendars = useEntities<BookingPage>('calendars');
  const products = useEntities<Product>('products');
  const conversations = useEntities<Conversation>('conversations');
  const events = useEntities<BusinessEvent>('events');
  const transactions = useEntities<VerifiedTransaction>('transactions');

  const opts: MetricsFilter = typeof filter === 'number' ? { days: filter } : filter;
  const now = new Date();
  let startMs: number;
  let endMs: number;
  let totalDays: number;

  if (opts.startDate && opts.endDate) {
    const s = new Date(opts.startDate + 'T00:00:00');
    const e = new Date(opts.endDate + 'T23:59:59.999');
    startMs = Number.isNaN(s.getTime()) ? Date.now() - 30 * 86400000 : s.getTime();
    endMs = Number.isNaN(e.getTime()) ? Date.now() : e.getTime();
    if (startMs > endMs) [startMs, endMs] = [endMs, startMs];
    totalDays = Math.max(1, Math.min(366, Math.round((endMs - startMs) / 86400000)));
  } else {
    totalDays = Math.max(1, opts.days ?? 30);
    endMs = now.getTime();
    startMs = endMs - totalDays * 86400000;
  }

  const channelFilter = opts.channel && opts.channel !== 'all' ? opts.channel.toLowerCase() : '';
  const matchesChannel = (ch?: string) => {
    if (!channelFilter) return true;
    const raw = (ch ?? '').toLowerCase();
    if (channelFilter === 'webchat') return raw === 'webchat' || raw === 'website' || raw === 'chat' || raw === 'web';
    return raw.includes(channelFilter);
  };

  const filteredConversations = channelFilter
    ? conversations.filter(c => matchesChannel(c.channel || c.source))
    : conversations;

  const recentEvents = events.filter(event => {
    const ms = parseTimestampMs(event.createdAt);
    const inRange = ms >= startMs && ms <= endMs;
    if (!inRange) return false;
    if (!channelFilter) return true;
    return matchesChannel(event.source || event.resource);
  });

  const paid = transactions.filter(transaction => {
    const ms = parseTimestampMs(transaction.createdAt ?? transaction.date);
    return ['Paid', 'Completed', 'PAID'].includes(transaction.status) && ms >= startMs && ms <= endMs;
  });
  // Never aggregate different currencies into a single revenue figure.
  const currencies = [...new Set(paid.map(transaction => transaction.currency).filter(Boolean))];
  const currency = currencies[0] || 'USD';
  const revenue = paid.filter(transaction => transaction.currency === currency).reduce((sum, transaction) => sum + (typeof transaction.amount === 'number' ? transaction.amount : 0), 0);
  const money = (amount: number) => formatPrice(amount, currency);
  const compactMoney = (amount: number) => formatCompactPrice(amount, currency);
  const endDateObj = new Date(endMs);
  const daily = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(endDateObj);
    date.setDate(endDateObj.getDate() - totalDays + index + 1);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: paid.filter(transaction => transaction.currency === currency && toIsoDateString(transaction.createdAt ?? transaction.date).slice(0, 10) === key).reduce((sum, transaction) => sum + (typeof transaction.amount === 'number' ? transaction.amount : 0), 0),
      events: recentEvents.filter(event => toIsoDateString(event.createdAt).slice(0, 10) === key).length,
    };
  });
  return { leads, bookings, calendars, products, conversations: filteredConversations, allConversations: conversations, events: recentEvents, paid, revenue, currency, currencies, money, compactMoney, daily, totalDays, customers: leads.filter(lead => ['ACTIVE_CUSTOMER', 'CUSTOMER', 'PAYMENT_COMPLETED'].includes(lead.stage)).length };
}

