import { dateKey, datesIn, inRange, rowTime, type AnalyticsRow, type DateRange } from '../../backend/analytics';

export function string(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function number(value: unknown) {
  const numeric = typeof value === 'number' || typeof value === 'string' ? Number(value) : 0;
  return Number.isFinite(numeric) ? numeric : 0;
}

export function dated(rows: AnalyticsRow[], range: DateRange, time = rowTime) {
  return rows.filter(row => row.preview !== true && row.sample !== true && row.sampleData !== true && inRange(time(row), range));
}

export function sum(rows: AnalyticsRow[], value: (row: AnalyticsRow) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}

export const amount = (row: AnalyticsRow) => number(row.amount ?? row.total);
export const paymentTime = (row: AnalyticsRow) => rowTime(row, 'paidAt', 'decidedAt', 'createdAt', 'date');
export const isPaid = (row: AnalyticsRow) => /^(paid|completed|succeeded)$/i.test(string(row.status));
export const currencyOf = (row: AnalyticsRow) => string(row.currency, 'USD').toUpperCase();
export const countUnique = (rows: AnalyticsRow[], field: string) => new Set(rows.map(row => string(row[field])).filter(Boolean)).size;
export const rate = (part: number, total: number) => total ? part / total : null;

export function paidOrders(orders: AnalyticsRow[], transactions: AnalyticsRow[], range: DateRange) {
  const unique = new Map<string, AnalyticsRow>();
  for (const row of orders) {
    const id = string(row.orderId ?? row.order_id, row.id);
    const existing = unique.get(id);
    if (!existing || paymentTime(row) >= paymentTime(existing)) unique.set(id, { ...row, id });
  }
  for (const transaction of transactions) {
    const id = string(transaction.orderId ?? transaction.order_id, transaction.id);
    const order = unique.get(id);
    if (!order || paymentTime(transaction) > paymentTime(order) ||
      paymentTime(transaction) === paymentTime(order) && isPaid(transaction) && isPaid(order)) {
      unique.set(id, { ...order, ...transaction, id });
    }
  }
  return dated([...unique.values()].filter(isPaid), range, paymentTime);
}

export function activityRows(rows: Record<string, AnalyticsRow[]>, range: DateRange) {
  return dated([
    ...rows.events,
    ...rows.auditLogs.map(row => ({ ...row, type: 'Audit entry', resource: 'settings' })),
    ...(rows.analyticsEvents ?? []),
  ], range).sort((a, b) => rowTime(b) - rowTime(a));
}

export function overviewValues(rows: Record<string, AnalyticsRow[]>, range: DateRange, currency: string) {
  const paid = paidOrders(rows.orders, rows.transactions, range).filter(row => currencyOf(row) === currency);
  return {
    paid, leads: dated(rows.leads, range), chats: dated(rows.conversations, range, chatTime),
    events: activityRows(rows, range), revenue: sum(paid, amount),
  };
}

export const chatTime = (row: AnalyticsRow) => rowTime(row, 'createdAt', 'created_at');

export function group<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const existing = groups.get(id);
    if (existing) existing.push(row);
    else groups.set(id, [row]);
  }
  return groups;
}

export function daily(range: DateRange, rows: AnalyticsRow[], value: (bucket: AnalyticsRow[]) => number = bucket => bucket.length, time = rowTime) {
  const buckets = group(rows.filter(row => time(row) > 0), row => dateKey(new Date(time(row))));
  return datesIn(range).map(day => value(buckets.get(day) ?? []));
}

export function leadStage(row: AnalyticsRow) {
  const stage = string(row.lifecycleStage ?? row.stage).toUpperCase();
  if (/^(CLOSED|CLOSED_LOST|LOST)$/.test(stage)) return 'Lost';
  if (/^(CUSTOMER|PAYMENT_COMPLETED|ACTIVE_CUSTOMER|RENEWAL_UPSELL|WON)$/.test(stage)) return 'Won';
  if (row.qualificationStatus === 'Qualified' || /^(QUALIFIED|BOOKING|BOOKED|BOOKING_OFFERED)$/.test(stage)) return 'Qualified';
  if (/^(CONTACTED|CONTACT_CREATED|CONVERSATION|FOLLOW_UP_NEEDED)$/.test(stage)) return 'Contacted';
  return 'New';
}

export function leadSource(row: AnalyticsRow) {
  const source = string(row.source, 'Unknown');
  if (/whats.?app/i.test(source)) return 'WhatsApp';
  if (/facebook/i.test(source)) return 'Facebook';
  if (/web.?chat|website chat/i.test(source)) return 'Website Chat';
  return source;
}

export function paymentMethod(row: AnalyticsRow) {
  const method = string(row.method ?? row.paymentMethod, 'Unknown');
  if (/cash/i.test(method)) return 'Cash';
  if (/wallet|vodafone/i.test(method)) return 'Wallets';
  if (/card|credit|stripe|visa|mastercard/i.test(method)) return 'Card';
  return method;
}

export function conversationMetrics(threads: AnalyticsRow[], messages: AnalyticsRow[], range: DateRange, channel: string) {
  const channels = new Map(threads.map(thread => [thread.id, string(thread.channel)]));
  const byThread = group(dated(messages, range).filter(message => {
    const id = string(message.conversationId);
    return id && (channel === 'all' || string(message.channel, channels.get(id)) === channel);
  }), message => string(message.conversationId));
  const incoming: AnalyticsRow[] = [];
  const ai: AnalyticsRow[] = [];
  const team: AnalyticsRow[] = [];
  const replies: AnalyticsRow[] = [];
  for (const [id, thread] of byThread) {
    thread.sort((a, b) => rowTime(a) - rowTime(b));
    const firstInbound = thread.find(message => message.direction === 'inbound' || message.sender === 'customer');
    if (!firstInbound) continue;
    incoming.push(firstInbound);
    const firstReply = thread.find(message => rowTime(message) >= rowTime(firstInbound) &&
      (message.direction === 'outbound' || ['ai', 'agent'].includes(string(message.sender))) &&
      !/^(failed|queued|blocked|cancelled|sending|pending|rejected)/i.test(string(message.status)));
    if (!firstReply) continue;
    const handledBy = firstReply.ai === true || firstReply.sender === 'ai' ? ai : team;
    handledBy.push(firstInbound);
    replies.push({ ...firstInbound, id, minutes: (Math.max(rowTime(firstReply, 'sentAt', 'createdAt'), rowTime(firstInbound)) - rowTime(firstInbound)) / 60000 });
  }
  return { incoming, ai, team, replies };
}

export function orderedFunnel(views: AnalyticsRow[], pageIds: string[]) {
  const sessions = group(views.filter(view => string(view.sessionId)), view => string(view.sessionId));
  const counts = pageIds.map(() => 0);
  for (const session of sessions.values()) {
    session.sort((a, b) => rowTime(a) - rowTime(b));
    let stage = 0;
    for (const view of session) {
      if (view.pageId !== pageIds[stage]) continue;
      counts[stage++]++;
      if (stage === pageIds.length) break;
    }
  }
  return counts;
}
