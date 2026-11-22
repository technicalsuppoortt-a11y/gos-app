import { dateKey, datesIn, inRange, rowTime, type AnalyticsRow, type DateRange } from '../../backend/analytics';

export function string(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function number(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
}

export function isNonSample(row: AnalyticsRow | undefined | null): row is AnalyticsRow {
  if (!row || typeof row !== 'object') return false;
  return row.preview !== true && row.sample !== true && row.sampleData !== true;
}

export function dated(rows: AnalyticsRow[] = [], range: DateRange, time = rowTime) {
  return rows.filter(row => isNonSample(row) && inRange(time(row), range));
}

export function sum(rows: AnalyticsRow[], value: (row: AnalyticsRow) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}

export const amount = (row: AnalyticsRow) => {
  const totals = row.totals as Record<string, unknown> | undefined;
  return number(row.amount ?? row.total ?? totals?.dueToday ?? totals?.total);
};

export const paymentTime = (row: AnalyticsRow) =>
  rowTime(row, 'paidAt', 'decidedAt', 'createdAt', 'at', 'date', 'updatedAt');

export const bookingTime = (row: AnalyticsRow) =>
  rowTime(row, 'createdAt', 'bookedAt', 'start', 'date', 'updatedAt');

export const leadTime = (row: AnalyticsRow) =>
  rowTime(row, 'createdAt', 'created_at', 'lastActivity', 'updatedAt');

export const chatTime = (row: AnalyticsRow) =>
  rowTime(row, 'createdAt', 'created_at', 'updated_at', 'lastInboundAt', 'time');

export const isPaid = (row: AnalyticsRow) =>
  /^(paid|completed|succeeded|approved)$/i.test(string(row.status));

export const currencyOf = (row: AnalyticsRow) => {
  const totals = row.totals as Record<string, unknown> | undefined;
  return string(row.currency ?? totals?.currency, 'USD').toUpperCase();
};

export const countUnique = (rows: AnalyticsRow[], field: string) =>
  new Set(rows.map(row => string(row[field])).filter(Boolean)).size;

export const rate = (part: number, total: number) => (total > 0 ? part / total : null);

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

export function daily(
  range: DateRange,
  rows: AnalyticsRow[],
  value: (bucket: AnalyticsRow[]) => number = bucket => bucket.length,
  time = rowTime
) {
  const buckets = group(
    rows.filter(row => time(row) > 0),
    row => dateKey(new Date(time(row)))
  );
  return datesIn(range).map(day => value(buckets.get(day) ?? []));
}

/**
 * Reconciles paid orders across `orders`, `transactions`, `checkoutRequests` (tenant + mirror),
 * and `products` (`config.orders` / recorded sales), deduplicated by canonical order ID.
 */
export function reconciledAllPaidOrders(rows: Record<string, AnalyticsRow[]>) {
  const unique = new Map<string, AnalyticsRow>();
  const products = (rows.products ?? []).filter(isNonSample);
  const findProduct = (prodId?: unknown, prodName?: unknown) => {
    const idStr = string(prodId);
    const nameLower = string(prodName).toLowerCase();
    return products.find(
      p => (idStr && p.id === idStr) || (nameLower && string(p.name).toLowerCase() === nameLower)
    );
  };

  for (const row of (rows.orders ?? []).filter(isNonSample)) {
    const id = string(row.orderId ?? row.order_id, row.id);
    if (!id) continue;
    const existing = unique.get(id);
    if (!existing || paymentTime(row) >= paymentTime(existing)) {
      unique.set(id, { ...existing, ...row, id });
    }
  }

  for (const txn of (rows.transactions ?? []).filter(isNonSample)) {
    const id = string(txn.orderId ?? txn.order_id, txn.id);
    if (!id) continue;
    const existing = unique.get(id);
    if (
      !existing ||
      paymentTime(txn) > paymentTime(existing) ||
      (paymentTime(txn) === paymentTime(existing) && isPaid(txn))
    ) {
      unique.set(id, { ...existing, ...txn, id });
    }
  }

  const allRequests = [
    ...(rows.checkoutRequests ?? []),
    ...(rows.checkoutRequestsMirror ?? []),
  ].filter(isNonSample);

  for (const req of allRequests) {
    const id = string(req.orderId ?? req.id);
    if (!id) continue;
    if (!/^(approved|paid|completed|succeeded)$/i.test(string(req.status))) continue;
    const existing: Record<string, unknown> = unique.get(id) ?? {};
    const items = Array.isArray(req.items) ? req.items : [];
    const firstItem = (items[0] ?? {}) as Record<string, unknown>;
    const matchedProd = findProduct(req.productId ?? firstItem.productId, req.productName ?? firstItem.productName);
    const prodConfig = (matchedProd?.config ?? {}) as Record<string, unknown>;
    const reqAmount = amount(req) || number(existing.amount ?? prodConfig.amount);
    unique.set(id, {
      ...existing,
      ...req,
      id,
      orderId: id,
      status: 'Paid',
      amount: reqAmount,
      total: reqAmount,
      currency: currencyOf(req.currency ? req : (existing.currency ? { id, currency: existing.currency } : { id, currency: prodConfig.currency ?? 'USD' })),
      productId: string(req.productId ?? firstItem.productId ?? existing.productId ?? matchedProd?.id),
      productName: string(req.productName ?? firstItem.productName ?? existing.productName ?? matchedProd?.name, 'Product'),
      method: string(req.method ?? req.paymentMethod ?? existing.method, 'InstaPay'),
      createdAt: req.createdAt ?? existing.createdAt,
      decidedAt: req.decidedAt ?? existing.decidedAt,
    });
  }

  for (const prod of products) {
    const config = (prod.config ?? {}) as Record<string, unknown>;
    const prodCurrency = string(config.currency, 'USD').toUpperCase();
    const prodPrice = number(config.amount) || number(prod.price);
    const configOrders = Array.isArray(config.orders) ? config.orders : [];
    for (const co of configOrders) {
      if (!co || typeof co !== 'object') continue;
      const coRec = co as Record<string, unknown>;
      if (coRec.sample === true) continue;
      const status = string(coRec.status, 'Paid');
      if (!/^(paid|completed|succeeded|approved)$/i.test(status)) continue;
      const id = string(coRec.id, `prod-order-${prod.id}`);
      if (!unique.has(id)) {
        unique.set(id, {
          id,
          orderId: id,
          status: 'Paid',
          productId: prod.id,
          productName: string(prod.name, prod.id),
          amount: number(coRec.amount ?? prodPrice),
          total: number(coRec.amount ?? prodPrice),
          currency: string(coRec.currency, prodCurrency).toUpperCase(),
          method: string(coRec.method ?? coRec.paymentMethod, 'Card'),
          customerEmail: string(coRec.email ?? coRec.customerEmail),
          customerName: string(coRec.customer ?? coRec.customerName),
          createdAt: coRec.at ?? coRec.createdAt ?? prod.createdAt,
        });
      }
    }
  }

  return [...unique.values()].filter(row => isPaid(row) && amount(row) >= 0);
}

export function paidOrders(orders: AnalyticsRow[] = [], transactions: AnalyticsRow[] = [], range: DateRange) {
  return dated(reconciledAllPaidOrders({ orders, transactions }), range, paymentTime);
}

export function paidOrdersInRange(rows: Record<string, AnalyticsRow[]>, range: DateRange) {
  return dated(reconciledAllPaidOrders(rows), range, paymentTime);
}

export type CurrencyConverter = (val: number, sourceCurrency?: string, targetCurrency?: string) => number;

export function orderAmountInCurrency(
  row: AnalyticsRow,
  targetCurrency: string,
  convertAmount?: CurrencyConverter
) {
  const raw = amount(row);
  const src = currencyOf(row);
  if (!raw) return 0;
  if (src === targetCurrency.toUpperCase()) return raw;
  if (convertAmount) return convertAmount(raw, src, targetCurrency);
  return raw;
}

export function confirmedBookingsInRange(rows: Record<string, AnalyticsRow[]>, range: DateRange) {
  const all = (rows.bookings ?? []).filter(isNonSample);
  return all.filter(b => {
    const status = string(b.status, 'Confirmed');
    if (/^(canceled|cancelled|rejected|pending)$/i.test(status)) return false;
    const t = bookingTime(b);
    return inRange(t, range);
  });
}

export function allActiveBookingsInRange(rows: Record<string, AnalyticsRow[]>, range: DateRange) {
  const all = (rows.bookings ?? []).filter(isNonSample);
  return all.filter(b => {
    const status = string(b.status, 'Confirmed');
    if (/^(canceled|cancelled|rejected)$/i.test(status)) return false;
    return inRange(bookingTime(b), range);
  });
}

export function leadsInRange(rows: Record<string, AnalyticsRow[]>, range: DateRange) {
  const rawLeads = (rows.leads ?? []).filter(isNonSample);
  const byKey = new Map<string, AnalyticsRow>();
  for (const lead of rawLeads) {
    const id = string(lead.id);
    if (!id) continue;
    byKey.set(id, lead);
  }
  return [...byKey.values()].filter(lead => inRange(leadTime(lead), range));
}

export function activityRows(rows: Record<string, AnalyticsRow[]>, range: DateRange) {
  return dated(
    [
      ...(rows.events ?? []),
      ...(rows.auditLogs ?? []).map(row => ({ ...row, type: 'Audit entry', resource: 'settings' })),
      ...(rows.analyticsEvents ?? []),
    ],
    range
  ).sort((a, b) => rowTime(b) - rowTime(a));
}

export function overviewValues(
  rows: Record<string, AnalyticsRow[]>,
  range: DateRange,
  currency: string,
  convertAmount?: CurrencyConverter
) {
  const paid = paidOrdersInRange(rows, range);
  const revenue = paid.reduce((acc, row) => acc + orderAmountInCurrency(row, currency, convertAmount), 0);
  return {
    paid,
    leads: leadsInRange(rows, range),
    bookings: confirmedBookingsInRange(rows, range),
    chats: dated(rows.conversations ?? [], range, chatTime),
    events: activityRows(rows, range),
    revenue,
  };
}

export function leadStage(row: AnalyticsRow): 'New' | 'Contacted' | 'Qualified' | 'Won' | 'Lost' {
  const stage = string(row.lifecycleStage ?? row.stage).toUpperCase();
  if (/^(CLOSED|CLOSED_LOST|LOST)$/.test(stage)) return 'Lost';
  if (/^(CUSTOMER|PAYMENT_COMPLETED|ACTIVE_CUSTOMER|RENEWAL_UPSELL|WON)$/.test(stage)) return 'Won';
  if (
    string(row.qualificationStatus) === 'Qualified' ||
    /^(QUALIFIED|BOOKING|BOOKED|BOOKING_OFFERED|INTERESTED|PROPOSAL)$/.test(stage)
  ) {
    return 'Qualified';
  }
  if (/^(CONTACTED|CONTACT_CREATED|CONVERSATION|FOLLOW_UP_NEEDED)$/.test(stage)) return 'Contacted';
  return 'New';
}

export function leadSource(row: AnalyticsRow): string {
  const raw = string(row.source, 'Direct');
  if (/booking|calendar|appointment/i.test(raw)) return 'Booking Appointments';
  if (/ai|copilot|assistant|bot|agent/i.test(raw)) return 'AI Agent';
  if (/form|funnel|landing|opt.?in/i.test(raw)) return 'Forms';
  if (/whats.?app/i.test(raw)) return 'WhatsApp';
  if (/instagram|^ig$/i.test(raw)) return 'Instagram';
  if (/facebook|^fb$|meta/i.test(raw)) return 'Facebook';
  if (/messenger/i.test(raw)) return 'Messenger';
  if (/web.?chat|website chat/i.test(raw)) return 'Website Chat';
  if (/web|site/i.test(raw)) return 'Website';
  if (/service|checkout|product|order|purchase/i.test(raw)) return 'Services & Checkout';
  if (/unknown|manual|general/i.test(raw)) return 'Direct';
  return raw;
}

export function paymentMethod(row: AnalyticsRow): string {
  const method = string(row.method ?? row.paymentMethod, 'Card');
  if (/insta\s*pay/i.test(method)) return 'InstaPay';
  if (/vodafone/i.test(method)) return 'Vodafone Cash';
  if (/fawry/i.test(method)) return 'Fawry';
  if (/paymob/i.test(method)) return 'Paymob';
  if (/stripe/i.test(method)) return 'Stripe';
  if (/paypal/i.test(method)) return 'PayPal';
  if (/apple\s*pay/i.test(method)) return 'Apple Pay';
  if (/google\s*pay/i.test(method)) return 'Google Pay';
  if (/wallet/i.test(method)) return 'Wallets';
  if (/bank|wire|manual\s*transfer/i.test(method)) return 'Bank Transfer';
  if (/cash|cod/i.test(method)) return 'Cash';
  if (/card|credit|debit|visa|mastercard|verified purchase/i.test(method)) return 'Stripe';
  return method;
}

export function uniqueVisitorsInRange(rows: Record<string, AnalyticsRow[]>, range: DateRange): number {
  const analyticsViews = dated(rows.analyticsEvents ?? [], range);
  const byVisitor = countUnique(analyticsViews, 'visitorId');
  if (byVisitor > 0) return byVisitor;
  const bySession = countUnique(analyticsViews, 'sessionId');
  if (bySession > 0) return bySession;
  if (analyticsViews.length > 0) return analyticsViews.length;
  const eventViews = dated(rows.events ?? [], range).filter(e =>
    /^(page\.view|product\.view|funnel\.view)$/i.test(string(e.type))
  );
  return eventViews.length;
}

export function orderedFunnel(views: AnalyticsRow[], pageIds: string[]) {
  const sessions = group(
    views.filter(view => string(view.sessionId || view.visitorId || view.id)),
    view => string(view.sessionId || view.visitorId || view.id)
  );
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

export type FunnelAssetOption = {
  id: string;
  name: string;
  pages: { id: string; name: string }[];
};

export type FunnelStepStat = {
  id: string;
  label: string;
  count: number;
  pct: number;
};

export function extractFunnels(rows: Record<string, AnalyticsRow[]>): FunnelAssetOption[] {
  const assets = (rows.assets ?? []).filter(
    row => isNonSample(row) && row.kind === 'funnel' && !row.formAsset && !row.archived
  );
  return assets.map(item => {
    const doc = (item.document ?? {}) as {
      pages?: { id?: string; name?: string }[];
      funnel?: { pagesFlow?: string[] };
    };
    const rawPages = (Array.isArray(doc.pages) ? doc.pages : [])
      .filter(p => p && typeof p.id === 'string')
      .map(p => ({ id: String(p.id), name: string(p.name, String(p.id)) }));
    const flow = Array.isArray(doc.funnel?.pagesFlow) ? doc.funnel!.pagesFlow! : [];
    const ordered = flow.length
      ? flow.flatMap(id => rawPages.filter(page => page.id === id))
      : rawPages;
    return {
      id: item.id,
      name: string(item.name, item.id),
      pages: ordered.length ? ordered : rawPages,
    };
  });
}

export function computeFunnelSteps(
  rows: Record<string, AnalyticsRow[]>,
  range: DateRange,
  selectedFunnelId: string
): { steps: FunnelStepStat[]; completionRate: number; entries: number; completions: number } {
  const funnels = extractFunnels(rows);
  const selectedFunnel =
    selectedFunnelId === 'all' ? undefined : funnels.find(f => f.id === selectedFunnelId);

  const views = dated(rows.analyticsEvents ?? [], range).filter(
    v => v.type === 'page.view' && (!selectedFunnel || v.assetId === selectedFunnel.id)
  );
  const leads = leadsInRange(rows, range).filter(
    l => !selectedFunnel || l.sourceAssetId === selectedFunnel.id || !l.sourceAssetId
  );
  const checkouts = dated(
    [...(rows.checkoutRequests ?? []), ...(rows.checkoutRequestsMirror ?? [])],
    range,
    r => rowTime(r, 'createdAt', 'decidedAt')
  );
  const paid = paidOrdersInRange(rows, range);

  if (selectedFunnel && selectedFunnel.pages.length >= 2) {
    const stepCounts = orderedFunnel(
      views,
      selectedFunnel.pages.map(p => p.id)
    );
    const hasMultiStepViews = stepCounts[0] > 0 && stepCounts.slice(1).some(c => c > 0);
    if (hasMultiStepViews) {
      const top = Math.max(1, stepCounts[0]);
      const last = stepCounts[stepCounts.length - 1] ?? 0;
      return {
        entries: stepCounts[0],
        completions: last,
        completionRate: stepCounts[0] > 0 ? last / stepCounts[0] : 0,
        steps: selectedFunnel.pages.map((p, idx) => ({
          id: p.id,
          label: p.name,
          count: stepCounts[idx] ?? 0,
          pct: stepCounts[0] > 0 ? Math.round(((stepCounts[idx] ?? 0) / top) * 100) : 0,
        })),
      };
    }
  }

  // Synthesize canonical 4-step conversion funnel from real workspace funnel/lead/checkout/order signals
  const rawVisitors = views.length > 0 ? countUnique(views, 'visitorId') || views.length : uniqueVisitorsInRange(rows, range);
  const leadCaptures = leads.length;
  const checkoutCount = Math.max(checkouts.length, paid.length);
  const completedSales = paid.length;

  const step1 = Math.max(rawVisitors, leadCaptures, checkoutCount, completedSales);
  const step2 = Math.min(step1, Math.max(leadCaptures, checkoutCount, completedSales));
  const step3 = Math.min(step2, Math.max(checkoutCount, completedSales));
  const step4 = Math.min(step3, completedSales);

  const customNames = selectedFunnel?.pages.slice(0, 4).map(p => p.name) ?? [];
  const defaultLabels = ['Page Visit', 'Form Submission', 'Checkout Page', 'Payment Completed'];
  const values = [step1, step2, step3, step4];

  return {
    entries: step1,
    completions: step4,
    completionRate: step1 > 0 ? step4 / step1 : 0,
    steps: values.map((val, idx) => ({
      id: `step-${idx}`,
      label: customNames[idx] || defaultLabels[idx],
      count: val,
      pct: step1 > 0 ? Math.round((val / step1) * 100) : 0,
    })),
  };
}

export type ProductPerfItem = {
  id: string;
  name: string;
  type: string;
  units: number;
  revenue: number;
  views: number;
  conversionRate: number | null;
};

export function computeProductPerformance(
  rows: Record<string, AnalyticsRow[]>,
  range: DateRange,
  targetCurrency: string,
  convertAmount?: CurrencyConverter
): ProductPerfItem[] {
  const productViews = group(
    dated(rows.analyticsEvents ?? [], range).filter(r => r.type === 'product.view'),
    r => string(r.productId)
  );
  const checkoutIntents = group(
    dated(
      [...(rows.checkoutRequests ?? []), ...(rows.checkoutRequestsMirror ?? [])],
      range,
      r => rowTime(r, 'createdAt', 'decidedAt')
    ),
    r => string(r.productId || r.productName).toLowerCase()
  );

  const map = new Map<
    string,
    { id: string; name: string; type: string; units: number; revenue: number; buyers: number }
  >();

  for (const prod of (rows.products ?? []).filter(isNonSample)) {
    map.set(prod.id, {
      id: prod.id,
      name: string(prod.name, prod.id),
      type: string(prod.type, 'Product'),
      units: 0,
      revenue: 0,
      buyers: 0,
    });
  }

  const paid = paidOrdersInRange(rows, range);
  for (const order of paid) {
    const orderTotalConverted = orderAmountInCurrency(order, targetCurrency, convertAmount);
    const rawOrderTotal = amount(order) || 1;
    const items =
      Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : [
            {
              productId: order.productId,
              productName: order.productName,
              amount: amount(order),
              quantity: 1,
            },
          ];

    const seenInOrder = new Set<string>();
    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as Record<string, unknown>;
      const rawId = string(item.productId ?? order.productId);
      const rawName = string(item.productName ?? item.name ?? order.productName, rawId || 'Product');

      // Match by ID first, then case-insensitive name
      let matchedKey = rawId && map.has(rawId) ? rawId : '';
      if (!matchedKey && rawName) {
        for (const [k, existing] of map.entries()) {
          if (existing.name.toLowerCase() === rawName.toLowerCase()) {
            matchedKey = k;
            break;
          }
        }
      }
      const key = matchedKey || rawId || `product:${rawName.toLowerCase()}`;
      const entry = map.get(key) ?? {
        id: key,
        name: rawName,
        type: string(item.productType ?? order.productType, 'Product'),
        units: 0,
        revenue: 0,
        buyers: 0,
      };
      const qty = item.quantity === undefined ? 1 : Math.max(1, number(item.quantity));
      const itemShare =
        items.length === 1
          ? orderTotalConverted
          : rawOrderTotal > 0
            ? (number(item.amount) / rawOrderTotal) * orderTotalConverted
            : orderTotalConverted / items.length;

      entry.units += qty;
      entry.revenue += itemShare;
      if (!seenInOrder.has(key)) {
        entry.buyers += 1;
        seenInOrder.add(key);
      }
      map.set(key, entry);
    }
  }

  return [...map.values()]
    .map(entry => {
      const viewsCount = productViews.get(entry.id)?.length ?? 0;
      const intentsCount =
        (checkoutIntents.get(entry.id.toLowerCase())?.length ?? 0) +
        (checkoutIntents.get(entry.name.toLowerCase())?.length ?? 0);
      const denominator = viewsCount > 0 ? viewsCount : intentsCount > entry.buyers ? intentsCount : 0;
      const convRate = denominator > 0 ? Math.min(1, entry.buyers / denominator) : entry.buyers > 0 ? 1 : 0;
      return {
        id: entry.id,
        name: entry.name,
        type: entry.type,
        units: entry.units,
        revenue: entry.revenue,
        views: viewsCount,
        conversionRate: viewsCount > 0 || intentsCount > 0 ? convRate : entry.units > 0 ? convRate : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.units - a.units || a.name.localeCompare(b.name));
}

export type ChannelKey = 'whatsapp' | 'instagram' | 'messenger' | 'webchat' | 'facebook' | 'email';

export function normalizeChannelKey(raw: unknown): ChannelKey {
  const val = string(raw, 'webchat').toLowerCase();
  if (val.includes('whatsapp') || val === 'wa') return 'whatsapp';
  if (val.includes('instagram') || val === 'ig') return 'instagram';
  if (val.includes('messenger') || val === 'ms') return 'messenger';
  if (val.includes('facebook') || val === 'fb') return 'facebook';
  if (val.includes('email') || val.includes('mail')) return 'email';
  return 'webchat';
}

export function conversationMetrics(
  threads: AnalyticsRow[] = [],
  messages: AnalyticsRow[] = [],
  range: DateRange,
  channel: string
) {
  const channels = new Map(threads.map(thread => [thread.id, normalizeChannelKey(thread.channel ?? thread.source)]));
  const allMessages: AnalyticsRow[] = [...messages.filter(isNonSample)];

  // Also include embedded messages inside conversation documents if not duplicated in `messages`
  const seenMsgIds = new Set(allMessages.map(m => m.id));
  for (const thread of threads.filter(isNonSample)) {
    const ch = normalizeChannelKey(thread.channel ?? thread.source);
    const embedded = Array.isArray(thread.messages) ? thread.messages : [];
    for (const rawMsg of embedded) {
      if (!rawMsg || typeof rawMsg !== 'object') continue;
      const m = rawMsg as Record<string, unknown>;
      const mid = string(m.id, `${thread.id}-${allMessages.length}`);
      if (seenMsgIds.has(mid)) continue;
      seenMsgIds.add(mid);
      allMessages.push({
        ...m,
        id: mid,
        conversationId: thread.id,
        channel: ch,
        createdAt: m.createdAt ?? m.sentAt ?? m.time ?? thread.createdAt ?? thread.time,
      });
    }
  }

  const msgTime = (m: AnalyticsRow) => rowTime(m, 'sentAt', 'createdAt', 'created_at', 'time');

  const byThread = group(
    dated(allMessages, range, msgTime).filter(message => {
      const id = string(message.conversationId);
      if (!id) return false;
      const msgCh = normalizeChannelKey(message.channel ?? channels.get(id));
      return channel === 'all' || msgCh === channel;
    }),
    message => string(message.conversationId)
  );

  const incoming: AnalyticsRow[] = [];
  const ai: AnalyticsRow[] = [];
  const team: AnalyticsRow[] = [];
  const replies: AnalyticsRow[] = [];

  for (const [id, threadMsgs] of byThread) {
    threadMsgs.sort((a, b) => msgTime(a) - msgTime(b));
    const firstInbound = threadMsgs.find(
      message => message.direction === 'inbound' || message.sender === 'customer'
    );
    if (!firstInbound) continue;
    incoming.push(firstInbound);
    const firstReply = threadMsgs.find(
      message =>
        msgTime(message) >= msgTime(firstInbound) &&
        (message.direction === 'outbound' || ['ai', 'agent', 'assistant'].includes(string(message.sender))) &&
        !/^(failed|queued|blocked|cancelled|sending|pending|rejected)/i.test(string(message.status))
    );
    if (!firstReply) continue;
    const isAi =
      firstReply.ai === true ||
      firstReply.sender === 'ai' ||
      firstReply.sender === 'assistant' ||
      firstReply.role === 'assistant';
    const handledBy = isAi ? ai : team;
    handledBy.push(firstInbound);
    const deltaMs = Math.max(0, msgTime(firstReply) - msgTime(firstInbound));
    replies.push({
      ...firstInbound,
      id,
      seconds: deltaMs / 1000,
      minutes: deltaMs / 60000,
      channel: normalizeChannelKey(firstInbound.channel ?? channels.get(id)),
    });
  }

  // Fallback to thread-level metadata when `conversations` docs exist without granular message timestamps
  const datedThreads = dated(threads, range, chatTime).filter(thread => {
    const ch = normalizeChannelKey(thread.channel ?? thread.source);
    return channel === 'all' || ch === channel;
  });

  for (const thread of datedThreads) {
    if (byThread.has(thread.id)) continue;
    const ch = normalizeChannelKey(thread.channel ?? thread.source);
    const syntheticRow: AnalyticsRow = {
      ...thread,
      channel: ch,
      createdAt: thread.createdAt ?? thread.created_at ?? thread.updated_at ?? thread.time,
    };
    incoming.push(syntheticRow);
    if (thread.takenOver === true || string(thread.status) === 'handoff') {
      team.push(syntheticRow);
    } else if (thread.aiAutoReply !== false) {
      ai.push(syntheticRow);
    } else {
      team.push(syntheticRow);
    }
  }

  return { incoming, ai, team, replies, datedThreads };
}

export type ChannelPerformanceStat = {
  channel: ChannelKey;
  label: string;
  total: number;
  aiCount: number;
  resolutionPct: number;
  avgSeconds: number | null;
};

export function computeConversationsAndAI(
  rows: Record<string, AnalyticsRow[]>,
  range: DateRange,
  channelFilter: string
) {
  const conv = conversationMetrics(rows.conversations ?? [], rows.messages ?? [], range, channelFilter);
  const handoffs = dated(rows.handoffLogs ?? [], range).filter(
    h => channelFilter === 'all' || normalizeChannelKey(h.channel) === channelFilter
  );

  const totalConversations = conv.incoming.length;
  const humanCount = Math.max(conv.team.length, Math.min(totalConversations, handoffs.length));
  const aiResolvedCount = Math.max(0, totalConversations - humanCount);
  const aiResolutionRate = totalConversations > 0 ? aiResolvedCount / totalConversations : 0;

  const timedReplies = conv.replies.filter(r => number(r.seconds) > 0);
  const avgFirstResponseSeconds =
    timedReplies.length > 0
      ? sum(timedReplies, r => number(r.seconds)) / timedReplies.length
      : null;

  // AI-generated leads & bookings scoped to selected channel & range
  const matchesChannel = (rawSource: unknown) => {
    if (channelFilter === 'all') return true;
    return normalizeChannelKey(rawSource) === channelFilter;
  };
  const isAiOrChatAttributed = (rawSource: unknown, tags?: unknown) => {
    const s = string(rawSource).toLowerCase();
    const tagList = Array.isArray(tags) ? tags.map(x => string(x).toLowerCase()) : [];
    return (
      /ai|copilot|assistant|bot|whatsapp|instagram|messenger|webchat|chat/.test(s) ||
      tagList.some(t => /ai|bot|chat|whatsapp|instagram|messenger/.test(t))
    );
  };

  const aiLeads = leadsInRange(rows, range).filter(
    l => isAiOrChatAttributed(l.source, l.tags) && matchesChannel(l.source)
  );
  const aiBookings = confirmedBookingsInRange(rows, range).filter(
    b => isAiOrChatAttributed(b.source) && matchesChannel(b.source)
  );
  const threadConversions = conv.datedThreads.filter(thread => {
    const tags = Array.isArray(thread.tags) ? thread.tags.map(x => string(x).toLowerCase()) : [];
    const stg = string(thread.stage).toLowerCase();
    return tags.includes('booking') || tags.includes('interested') || stg === 'booking' || stg === 'customer';
  });
  const aiLeadsAndBookings = Math.max(aiLeads.length + aiBookings.length, threadConversions.length);

  const rowTimestamp = (r: AnalyticsRow) =>
    rowTime(r, 'sentAt', 'createdAt', 'created_at', 'updated_at', 'time');

  const dailyAi = daily(range, conv.ai, b => b.length, rowTimestamp);
  const dailyHuman = daily(range, conv.team, b => b.length, rowTimestamp);

  const coreChannels: { key: ChannelKey; label: string }[] = [
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'messenger', label: 'Messenger' },
    { key: 'webchat', label: 'Website Chat' },
  ];

  const perChannel: ChannelPerformanceStat[] = coreChannels
    .filter(c => channelFilter === 'all' || c.key === channelFilter)
    .map(c => {
      const sub = conversationMetrics(rows.conversations ?? [], rows.messages ?? [], range, c.key);
      const subTotal = sub.incoming.length;
      const subAi = sub.ai.length;
      const subTimed = sub.replies.filter(r => number(r.seconds) > 0);
      const subAvg =
        subTimed.length > 0 ? sum(subTimed, r => number(r.seconds)) / subTimed.length : null;
      return {
        channel: c.key,
        label: c.label,
        total: subTotal,
        aiCount: subAi,
        resolutionPct: subTotal > 0 ? Math.round((subAi / subTotal) * 100) : 0,
        avgSeconds: subAvg,
      };
    });

  return {
    totalConversations,
    aiResolvedCount,
    humanCount,
    aiResolutionRate,
    avgFirstResponseSeconds,
    aiLeadsAndBookings,
    dailyAi,
    dailyHuman,
    perChannel,
  };
}
