// GOS billing engine — plans, subscriptions, wallets and an append-only credit ledger.
//
// Hierarchy:  SUPER ADMIN ("platform")  ──sells plans/add-ons──►  ADMIN  ──sells plans/add-ons──►  USER
//
// Rules implemented here (single source of truth for the Cloud Function and the demo adapter):
// • The Super Admin owns the AI / communication providers. Credits represent that usage.
// • The platform has an unlimited credit supply. Admin credits come from Super Admin plans/add-ons.
// • Credits an Admin gives to a User (plan, trial, add-on or manual transfer) are DEDUCTED from the
//   Admin wallet. Insufficient Admin balance blocks the grant.
// • Credits are granted per monthly credit cycle and DO NOT roll over: leftovers expire at cycle end.
// • Billing types: monthly, annual, fixed duration (N days) and lifetime.
// • Every balance change writes an immutable ledger entry. The frontend never computes balances.
//
// The engine is storage-agnostic. A `base` store must implement:
//   get(path) → Promise<object|undefined>
//   query(collection, field, value) → Promise<object[]>
//   id() → string
//   commit(writes: [path, data][]) → void | Promise<void>
// Writes are buffered and committed only if the whole operation succeeds (transaction semantics).

export const PLATFORM = 'platform';
// Plan capabilities (entitlements a plan can unlock). 'ai' is a capability only — never a billable channel.
export const CHANNEL_IDS = ['ai', 'whatsapp', 'messenger', 'instagram', 'email', 'sms'];
export const AI_CAPABILITIES = ['ai'];
// External carrier channels whose provider costs are charged to the Communication Wallet.
export const COMMUNICATION_CHANNELS = ['whatsapp', 'messenger', 'instagram', 'email', 'sms', 'webchat'];
export const WALLET_CURRENCY = 'EUR';
export const round4 = value => Math.round(Number(value) * 10000) / 10000;
/**
 * Communication Wallet (pay-as-you-go) — independent from plan credits in `billingWallets`.
 * `balance` is money in `currency`; `held` is reserved for sends awaiting carrier confirmation.
 */
export function newCommunicationWallet(uid, role, providerId, now, currency = WALLET_CURRENCY) {
  return { id: uid, ownerId: uid, role, providerId, currency, balance: 0, held: 0, lifetimeTopup: 0, lifetimeSpent: 0, lowBalanceThreshold: 0, lowBalance: false, autoRecharge: { enabled: false, below: '', amount: '', method: '' }, createdAt: now, updatedAt: now };
}
export const BILLING_TYPES = ['monthly', 'annual', 'fixed', 'lifetime'];
export const PLAN_KINDS = ['plan', 'trial', 'addon'];
export const ADDON_TYPES = ['credits', 'seats', 'tool'];
export const CURRENCIES = ['USD', 'EGP', 'SAR', 'AED', 'EUR'];
export const TOOL_IDS = ['ai-copilot', 'funnel-builder', 'crm-pipeline', 'unified-inbox', 'booking-engine', 'products-payments', 'custom-domains', 'webhooks-api', 'ai-followup', 'email-sms', 'analytics-bi', 'client-portal'];
export const DEFAULT_TRIAL = { admin: { days: 90, credits: 1000 }, user: { days: 14, credits: 100 } };
export const DEFAULT_BILLING_SETTINGS = {
  providerId: '',
  addonMode: 'both',
  unitRate: {
    creditsPerUnit: 100,
    pricePerUnit: 5,
    currency: 'USD',
    minUnits: 1,
    maxUnits: 100,
  },
};

export class BillingError extends Error {
  constructor(code, message) { super(message); this.name = 'BillingError'; this.code = code; }
}
const fail = (code, message) => { throw new BillingError(code, message); };

// ───────────────────────── dates ─────────────────────────
export function addDays(start, days) { return new Date(new Date(start).getTime() + days * 86400000).toISOString(); }
export function addMonths(start, months) {
  const d = new Date(start), day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}
export function periodEndFor(plan, start) {
  if (plan.kind === 'trial') return addDays(start, plan.durationDays);
  if (plan.billingType === 'monthly') return addMonths(start, 1);
  if (plan.billingType === 'annual') return addMonths(start, 12);
  if (plan.billingType === 'fixed') return addDays(start, plan.durationDays);
  return null; // lifetime
}
function cycleEndFrom(start, periodEnd) { const end = addMonths(start, 1); return periodEnd && end > periodEnd ? periodEnd : end; }

// ───────────────────────── status helpers ─────────────────────────
export function effectiveStatus(sub, now = new Date().toISOString()) {
  if (!sub) return 'none';
  if (sub.status === 'cancelled' || sub.status === 'expired') return sub.status;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd <= now) return 'expired';
  return sub.status;
}
export const isLive = (sub, now) => ['active', 'trialing'].includes(effectiveStatus(sub, now));
export function entitledTools(sub, now) {
  if (!isLive(sub, now)) return [];
  const list = [...new Set([...(sub.plan?.tools ?? []), ...(sub.extraTools ?? [])])];
  if (list.includes('unified-inbox') && !list.includes('inbox')) list.push('inbox');
  if (list.includes('inbox') && !list.includes('unified-inbox')) list.push('unified-inbox');
  return list;
}
export function planSnapshot(plan) {
  return { id: plan.id, kind: plan.kind, name: plan.name, billingType: plan.billingType, durationDays: plan.durationDays ?? null, price: plan.price, currency: plan.currency, credits: plan.credits, tools: plan.tools ?? [], channels: plan.channels ?? [], limits: plan.limits ?? {} };
}

// ───────────────────────── validation ─────────────────────────
function text(value, max, label, required = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') fail('invalid-argument', `Invalid ${label}.`);
  const clean = value.trim();
  if (clean.length > max) fail('invalid-argument', `${label} must be ${max} characters or fewer.`);
  if (required && !clean) fail('invalid-argument', `${label} is required.`);
  return clean;
}
function int(value, label, min = 0, max = 100000000) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail('invalid-argument', `${label} must be a whole number between ${min} and ${max}.`);
  return n;
}
function amount(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) fail('invalid-argument', `${label} must be a valid non-negative amount.`);
  return Math.round(n * 100) / 100;
}
const pair = (value, max, label, required = false) => {
  const en = text(value?.en, max, `${label} (English)`, required);
  return { en, ar: text(value?.ar, max, `${label} (Arabic)`) || en };
};
const lines = (value, label) => (Array.isArray(value) ? value : []).slice(0, 20).map(item => text(item, 160, label)).filter(Boolean);

export function normalizePlan(input, { ownerId, allowedTools = null, existing = null, id, now }) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalid-argument', 'Provide plan details.');
  const kind = PLAN_KINDS.includes(input.kind) ? input.kind : fail('invalid-argument', 'Invalid plan type.');
  const audience = ownerId === PLATFORM ? 'admin' : 'user';
  // Platform plans govern quotas and channels. Keep the legacy tool entitlement
  // field populated so admins can continue offering client tool permissions.
  const mapTool = tool => (tool === 'inbox' ? 'unified-inbox' : tool);
  const tools = ownerId === PLATFORM
    ? (Array.isArray(input.tools) && input.tools.length ? [...new Set(input.tools.map(mapTool).filter(tool => TOOL_IDS.includes(tool)))] : [...TOOL_IDS])
    : [...new Set((Array.isArray(input.tools) ? input.tools : []).map(mapTool).filter(tool => TOOL_IDS.includes(tool)))];
  const billingType = kind === 'plan' ? (BILLING_TYPES.includes(input.billingType) ? input.billingType : fail('invalid-argument', 'Choose a billing type.')) : kind === 'trial' ? 'fixed' : 'once';
  const durationDays = kind === 'trial' ? int(input.durationDays, 'Trial duration (days)', 1, 365) : billingType === 'fixed' ? int(input.durationDays, 'Duration (days)', 1, 3650) : null;
  const addonType = kind === 'addon' ? (ADDON_TYPES.includes(input.addonType) ? input.addonType : fail('invalid-argument', 'Choose an add-on type.')) : null;
  const credits = int(input.credits ?? 0, kind === 'addon' ? 'Credits' : 'Credits per month', 0, 10000000);
  if (addonType === 'credits' && credits < 1) fail('invalid-argument', 'A credit pack must include at least 1 credit.');
  const addonSeats = addonType === 'seats' ? int(input.addonSeats, 'Extra seats', 1, 1000) : null;
  const addonTool = addonType === 'tool' ? (TOOL_IDS.includes(input.addonTool) ? input.addonTool : fail('invalid-argument', 'Choose the tool this add-on unlocks.')) : null;
  const requested = addonTool ? [...tools, addonTool] : tools;
  if (allowedTools) {
    const blocked = requested.filter(tool => !allowedTools.includes(tool));
    if (blocked.length) fail('failed-precondition', 'Some selected tools are not included in your platform subscription. Upgrade your plan to offer them.');
  }
  return {
    id, ownerId, audience, kind,
    name: pair(input.name, 80, 'Plan name', true),
    description: pair(input.description, 300, 'Description'),
    badge: pair(input.badge, 30, 'Badge'),
    cta: pair(input.cta, 40, 'Button text'),
    features: { en: lines(input.features?.en, 'Feature'), ar: lines(input.features?.ar, 'Feature') },
    price: kind === 'trial' ? 0 : amount(input.price, 'Price'),
    currency: CURRENCIES.includes(input.currency) ? input.currency : 'USD',
    billingType, durationDays, credits,
    tools: kind === 'addon' ? [] : tools,
    channels: ownerId === PLATFORM ? [...new Set((Array.isArray(input.channels) ? input.channels : existing?.channels ?? []).filter(channel => CHANNEL_IDS.includes(channel)))] : [],
    limits: kind === 'addon' ? {} : { clients: audience === 'admin' ? int(input.limits?.clients ?? 0, 'Client limit', 0, 100000) : 0, seats: int(input.limits?.seats ?? 1, 'Team seats', 0, 10000) },
    addonType, addonSeats, addonTool,
    visible: input.visible !== false,
    enabled: kind === 'trial' ? input.enabled !== false : true,
    sortOrder: int(input.sortOrder ?? 0, 'Sort order', 0, 10000),
    status: 'active',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    revision: (existing?.revision ?? 0) + 1,
  };
}

// ───────────────────────── coupons ─────────────────────────
// A coupon belongs to a provider (the platform or an Admin) and can only be redeemed by that
// provider's own customers. Discounts reduce what the customer pays; a credit bonus adds value on top
// (wallet top-ups: extra wallet money; plans/add-ons: extra plan credits).
export const COUPON_TYPES = ['percent', 'fixed', 'credit_bonus'];
export const COUPON_SCOPES = ['wallet_topup', 'plan', 'addon'];
export const normalizeCouponCode = value => (typeof value === 'string' ? value.trim().toUpperCase() : '');
const COUPON_CODE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
export const couponDocId = (ownerId, code) => `${ownerId}__${code}`;
const round2 = value => Math.round(Number(value) * 100) / 100;
function isoOrNull(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.getTime())) fail('invalid-argument', `Provide a valid ${label}.`);
  return date.toISOString();
}

export function normalizeCoupon(input, { ownerId, existing = null, now }) {
  const code = existing?.code ?? normalizeCouponCode(input?.code);
  if (!COUPON_CODE.test(code)) fail('invalid-argument', 'Coupon codes use 3–32 letters, numbers, dashes or underscores.');
  const type = COUPON_TYPES.includes(input?.type) ? input.type : fail('invalid-argument', 'Choose a coupon type.');
  const value = round2(input?.value);
  if (!Number.isFinite(value) || value <= 0) fail('invalid-argument', 'Coupon value must be greater than zero.');
  if (type === 'percent' && value > 100) fail('invalid-argument', 'A percentage discount cannot exceed 100%.');
  if (value > 10000000) fail('invalid-argument', 'Coupon value is too large.');
  const appliesTo = [...new Set((Array.isArray(input?.appliesTo) ? input.appliesTo : []).filter(scope => COUPON_SCOPES.includes(scope)))];
  if (!appliesTo.length) fail('invalid-argument', 'Choose where the coupon can be redeemed.');
  const currency = type === 'percent' ? null : CURRENCIES.includes(input?.currency) ? input.currency : type === 'credit_bonus' ? WALLET_CURRENCY : fail('invalid-argument', 'Choose the coupon currency.');
  const startsAt = isoOrNull(input?.startsAt, 'start date');
  const expiresAt = isoOrNull(input?.expiresAt, 'expiry date');
  if (startsAt && expiresAt && expiresAt <= startsAt) fail('invalid-argument', 'The expiry date must be after the start date.');
  return {
    id: couponDocId(ownerId, code), ownerId, code, type, value, currency, appliesTo,
    description: text(input?.description, 200, 'Description'),
    minAmount: amount(input?.minAmount ?? 0, 'Minimum amount'),
    startsAt, expiresAt,
    maxRedemptions: int(input?.maxRedemptions ?? 0, 'Total redemptions limit', 0, 1000000),
    perUserLimit: int(input?.perUserLimit ?? 1, 'Per-customer limit', 0, 1000),
    redemptions: existing?.redemptions ?? 0,
    active: input?.active !== false,
    status: 'active',
    createdBy: existing?.createdBy ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * Price effect of a coupon on an order. `subtotal` is the list price in `currency`.
 * Returns what the customer pays and the bonus granted; the coupon must already be eligible.
 * Bonuses are wallet money for `wallet_topup` and whole plan credits for plans/add-ons.
 */
export function couponEffect(coupon, subtotal, currency, context = 'wallet_topup') {
  const base = round2(subtotal);
  const needsCurrency = coupon.type === 'fixed' || (coupon.type === 'credit_bonus' && context === 'wallet_topup');
  if (needsCurrency && coupon.currency && coupon.currency !== currency) fail('failed-precondition', `This coupon is valid for ${coupon.currency} orders only.`);
  const discount = coupon.type === 'percent' ? Math.min(base, round2(base * coupon.value / 100)) : coupon.type === 'fixed' ? Math.min(base, coupon.value) : 0;
  const bonus = coupon.type !== 'credit_bonus' ? 0 : context === 'wallet_topup' ? coupon.value : Math.round(coupon.value);
  return { subtotal: base, discount: round2(discount), bonus, payable: round2(base - discount) };
}

// ───────────────────────── wallet analytics ─────────────────────────
export function buildWalletAnalytics(rows = [], wallets = [], { now = new Date().toISOString(), days = 30 } = {}) {
  const cutoff = new Date(new Date(now).getTime() - days * 86400000).toISOString();
  const validRows = rows.filter(r => r && r.status !== 'failed');
  const recentRows = validRows.filter(r => (r.created_at || '') >= cutoff);

  let total_customer_charge = 0;
  let total_provider_cost = 0;
  let total_margin = 0;
  let total_topups = 0;
  let total_messages = 0;

  const channelMap = new Map();
  COMMUNICATION_CHANNELS.forEach(ch => {
    channelMap.set(ch, { channel: ch, count: 0, customer_charge: 0, provider_cost: 0, margin: 0 });
  });

  const accountMap = new Map();
  wallets.forEach(w => {
    if (w && w.id) {
      accountMap.set(w.id, {
        id: w.id,
        role: w.role || 'USER',
        currency: w.currency || WALLET_CURRENCY,
        balance: round4(w.balance || 0),
        held: round4(w.held || 0),
        lifetimeTopup: round4(w.lifetimeTopup || 0),
        lifetimeSpent: round4(w.lifetimeSpent || 0),
        total_spend: 0,
        provider_cost: 0,
        margin: 0,
        messages_count: 0,
        last_active: w.updatedAt || w.createdAt || null,
      });
    }
  });

  const dailyMap = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(new Date(now).getTime() - i * 86400000).toISOString().slice(0, 10);
    dailyMap.set(d, { date: d, customer_charge: 0, provider_cost: 0, margin: 0, count: 0, topups: 0 });
  }

  for (const row of recentRows) {
    const day = (row.created_at || '').slice(0, 10);
    const isTopup = row.usage_type === 'wallet_topup' && (row.amount > 0);
    if (isTopup) {
      total_topups = round4(total_topups + (row.amount || 0));
      if (dailyMap.has(day)) {
        dailyMap.get(day).topups = round4(dailyMap.get(day).topups + (row.amount || 0));
      }
    }

    const isUsage = row.channel || (row.customer_charge > 0 || row.provider_cost > 0);
    if (isUsage) {
      const charge = round4(row.customer_charge || 0);
      const cost = round4(row.provider_cost || 0);
      const margin = round4(row.margin !== undefined ? row.margin : (charge - cost));
      const qty = Number(row.quantity) || 1;

      total_customer_charge = round4(total_customer_charge + charge);
      total_provider_cost = round4(total_provider_cost + cost);
      total_margin = round4(total_margin + margin);
      total_messages += qty;

      if (row.channel) {
        if (!channelMap.has(row.channel)) {
          channelMap.set(row.channel, { channel: row.channel, count: 0, customer_charge: 0, provider_cost: 0, margin: 0 });
        }
        const chStats = channelMap.get(row.channel);
        chStats.count += qty;
        chStats.customer_charge = round4(chStats.customer_charge + charge);
        chStats.provider_cost = round4(chStats.provider_cost + cost);
        chStats.margin = round4(chStats.margin + margin);
      }

      if (dailyMap.has(day)) {
        const dEntry = dailyMap.get(day);
        dEntry.customer_charge = round4(dEntry.customer_charge + charge);
        dEntry.provider_cost = round4(dEntry.provider_cost + cost);
        dEntry.margin = round4(dEntry.margin + margin);
        dEntry.count += qty;
      }
    }

    const subId = row.subscriber_id || row.wallet_id;
    if (subId) {
      if (!accountMap.has(subId)) {
        accountMap.set(subId, {
          id: subId,
          role: 'USER',
          currency: row.currency || WALLET_CURRENCY,
          balance: round4(row.balance_after || 0),
          held: 0,
          total_spend: 0,
          provider_cost: 0,
          margin: 0,
          messages_count: 0,
          last_active: row.created_at,
        });
      }
      const acc = accountMap.get(subId);
      if (isUsage) {
        acc.total_spend = round4(acc.total_spend + (row.customer_charge || 0));
        acc.provider_cost = round4(acc.provider_cost + (row.provider_cost || 0));
        acc.margin = round4(acc.margin + (row.margin !== undefined ? row.margin : ((row.customer_charge || 0) - (row.provider_cost || 0))));
        acc.messages_count += Number(row.quantity) || 1;
      }
      if (!acc.last_active || acc.last_active < row.created_at) {
        acc.last_active = row.created_at;
      }
    }
  }

  const by_channel = [...channelMap.values()]
    .map(ch => ({
      ...ch,
      percentage: total_customer_charge > 0 ? Math.round((ch.customer_charge / total_customer_charge) * 100) : 0,
      margin_percentage: ch.customer_charge > 0 ? Math.round((ch.margin / ch.customer_charge) * 100) : 0,
    }))
    .sort((a, b) => b.customer_charge - a.customer_charge);

  const accounts = [...accountMap.values()]
    .sort((a, b) => (b.total_spend - a.total_spend) || (b.balance - a.balance));

  const total_wallet_balance = round4(wallets.reduce((s, w) => s + (w.balance || 0), 0));
  const total_wallet_held = round4(wallets.reduce((s, w) => s + (w.held || 0), 0));

  const summary = {
    period_days: days,
    total_customer_charge,
    total_provider_cost,
    total_margin,
    margin_percentage: total_customer_charge > 0 ? Math.round((total_margin / total_customer_charge) * 1000) / 10 : 0,
    total_topups,
    total_messages,
    total_wallet_balance,
    total_wallet_held,
    active_accounts_count: accounts.filter(a => a.total_spend > 0 || a.balance > 0).length,
    total_accounts_count: accounts.length,
  };

  const entries = validRows
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 150)
    .map(r => ({
      id: r.id,
      created_at: r.created_at,
      subscriber_id: r.subscriber_id || r.wallet_id,
      tenant_id: r.tenant_id,
      channel: r.channel || null,
      usage_type: r.usage_type,
      description: r.description || '',
      status: r.status,
      amount: r.amount || 0,
      quantity: r.quantity || 0,
      customer_charge: r.customer_charge || 0,
      provider_cost: r.provider_cost || 0,
      margin: r.margin || 0,
      currency: r.currency || WALLET_CURRENCY,
      balance_after: r.balance_after ?? null,
    }));

  return {
    summary,
    by_channel,
    daily_trend: [...dailyMap.values()],
    accounts,
    entries,
  };
}

// ───────────────────────── buffered store ─────────────────────────
function buffered(base) {
  const cache = new Map(), writes = new Map();
  return {
    async get(path) {
      if (writes.has(path)) return structuredClone(writes.get(path));
      if (!cache.has(path)) cache.set(path, (await base.get(path)) ?? null);
      const value = cache.get(path);
      return value ? structuredClone(value) : undefined;
    },
    async query(collection, field, value) {
      const rows = new Map((await base.query(collection, field, value)).map(row => [row.id, row]));
      for (const [path, data] of writes) {
        const [col, id] = path.split('/');
        if (col !== collection || path.split('/').length !== 2) continue;
        if (data[field] === value) rows.set(id, { ...data, id }); else rows.delete(id);
      }
      return [...rows.values()].map(row => structuredClone(row));
    },
    /** Whole-collection read (newest first when `orderBy` is given). Optional on the base store. */
    async list(collection, options = {}) {
      const rows = new Map(((typeof base.list === 'function' ? await base.list(collection, options) : null) ?? []).map(row => [row.id, row]));
      for (const [path, data] of writes) {
        const [col, id] = path.split('/');
        if (col === collection && path.split('/').length === 2) rows.set(id, { ...data, id });
      }
      return [...rows.values()].map(row => structuredClone(row));
    },
    set(path, data) { writes.set(path, structuredClone(data)); },
    id: () => base.id(),
    flush: () => base.commit([...writes.entries()]),
  };
}

// ───────────────────────── engine ─────────────────────────
const MANAGERS = ['ADMIN', 'SUPER_ADMIN'];

export async function executeBilling(operation, data, actor, base, now = new Date().toISOString()) {
  if (!actor?.uid) fail('unauthenticated', 'Sign in to continue.');
  data = data && typeof data === 'object' ? data : {};
  const store = buffered(base);
  const role = actor.role;

  const providerOf = account => account.role === 'ADMIN' ? PLATFORM : account.role === 'USER' ? (account.supportParentId || fail('failed-precondition', 'Your account is not linked to a provider yet. Contact support.')) : fail('permission-denied', 'This account cannot hold a subscription.');
  const ownerOf = () => role === 'SUPER_ADMIN' ? PLATFORM : role === 'ADMIN' ? actor.uid : fail('permission-denied', 'Only administrators can manage plans.');
  const canDecide = providerId => providerId === PLATFORM ? role === 'SUPER_ADMIN' : actor.uid === providerId || role === 'SUPER_ADMIN';
  const identifier = (value, label) => (typeof value === 'string' && value && !value.includes('/') && value.length <= 200) ? value : fail('invalid-argument', `Provide a valid ${label}.`);

  function entry(wallet, type, delta, description, extra = {}) {
    const id = extra.entryId ?? store.id();
    delete extra.entryId;
    store.set(`billingLedger/${id}`, { id, walletId: wallet.id, providerId: wallet.providerId, type, amount: delta, balanceAfter: wallet.balance, description, actorId: actor.uid, createdAt: now, ...extra });
  }
  const newWallet = (uid, accountRole, providerId) => ({ id: uid, ownerId: uid, role: accountRole, providerId, balance: 0, createdAt: now, updatedAt: now });
  const saveWallet = wallet => store.set(`billingWallets/${wallet.id}`, { ...wallet, updatedAt: now });
  const saveSub = sub => store.set(`billingSubscriptions/${sub.id}`, { ...sub, updatedAt: now });

  // ── Communication Wallet (separate bucket for external carrier costs) ──
  const commWallet = async (uid, accountRole, providerId) => (await store.get(`communicationWallets/${uid}`)) ?? newCommunicationWallet(uid, accountRole, providerId, now);
  const saveCommWallet = wallet => store.set(`communicationWallets/${wallet.id}`, { ...wallet, updatedAt: now });
  function commEntry(wallet, fields) {
    const id = store.id();
    store.set(`communicationLedger/${id}`, {
      id, wallet_id: wallet.id, subscriber_id: wallet.id, tenant_id: wallet.providerId, business_id: null,
      channel: null, provider: null, provider_account_id: null, provider_event_id: null, message_id: null,
      category: null, quantity: 0, unit_cost: 0, provider_cost: 0, customer_charge: 0, margin: 0,
      currency: wallet.currency, recipient_country: null, status: 'confirmed',
      balance_after: wallet.balance, actor_id: actor.uid, created_at: now, updated_at: now, ...fields,
    });
  }
  /** Credit a Communication Wallet. Admin-funded top-ups debit the Admin wallet (the platform supply is unlimited). */
  async function creditCommunicationWallet(account, providerId, value, currency, description, extra = {}) {
    const wallet = await commWallet(account.uid, account.role, providerId);
    if (wallet.currency !== currency) fail('failed-precondition', `This wallet uses ${wallet.currency}; the top-up was requested in ${currency}.`);
    if (providerId !== PLATFORM) {
      const pw = await commWallet(providerId, 'ADMIN', PLATFORM);
      const available = round4(pw.balance - (pw.held ?? 0));
      if (available < value) fail('failed-precondition', `Insufficient communication balance in the provider wallet: ${value} ${currency} required, ${available} available. Top up the agency wallet from the platform first.`);
      pw.balance = round4(pw.balance - value);
      commEntry(pw, { usage_type: 'transfer_out', amount: -value, balance_after: pw.balance, description: `${description} · client ${account.name || account.uid}`, counterparty_id: account.uid, ...extra });
      saveCommWallet(pw);
    }
    wallet.balance = round4(wallet.balance + value);
    wallet.lifetimeTopup = round4((wallet.lifetimeTopup ?? 0) + value);
    wallet.lowBalance = round4(wallet.balance - (wallet.held ?? 0)) < (wallet.lowBalanceThreshold ?? 0);
    commEntry(wallet, { usage_type: 'wallet_topup', amount: value, balance_after: wallet.balance, description, counterparty_id: providerId, ...extra });
    saveCommWallet(wallet);
    return wallet;
  }

  function expireBalance(wallet, reason) {
    if (wallet.balance <= 0) return;
    const leftover = wallet.balance;
    wallet.balance = 0;
    entry(wallet, 'expire', -leftover, reason);
  }

  /** Move credits from the provider to the subscriber. The platform supply is unlimited. */
  async function transfer(wallet, providerId, credits, type, description, extra = {}) {
    if (credits <= 0) return;
    if (providerId !== PLATFORM) {
      const provider = await freshen(providerId);
      if (!isLive(provider.sub, now)) fail('failed-precondition', 'The provider subscription is not active, so credits cannot be issued. The provider must renew first.');
      const pw = provider.wallet ?? newWallet(providerId, 'ADMIN', PLATFORM);
      if (pw.balance < credits) fail('failed-precondition', `Insufficient provider credits: ${credits} required, ${pw.balance} available. The provider must request a credit add-on from the platform.`);
      pw.balance -= credits;
      entry(pw, 'transfer_out', -credits, description, { counterpartyId: wallet.id, ...extra });
      saveWallet(pw);
    }
    wallet.balance += credits;
    entry(wallet, type, credits, description, { counterpartyId: providerId, ...extra });
  }

  /** Apply lazy lifecycle transitions: period expiry and monthly credit cycles (no rollover). */
  async function freshen(uid) {
    const sub = await store.get(`billingSubscriptions/${uid}`);
    let wallet = await store.get(`billingWallets/${uid}`);
    if (!sub) return { sub, wallet };
    if (['active', 'trialing'].includes(sub.status) && sub.currentPeriodEnd && sub.currentPeriodEnd <= now) {
      sub.status = 'expired';
      if (wallet) { expireBalance(wallet, 'Subscription period ended'); saveWallet(wallet); }
      saveSub(sub);
      return { sub, wallet };
    }
    if (isLive(sub, now) && sub.creditCycleEnd && sub.creditCycleEnd <= now) {
      wallet = wallet ?? newWallet(uid, sub.subscriberRole, sub.providerId);
      expireBalance(wallet, 'Monthly credits expired (no rollover)');
      let start = sub.creditCycleEnd;
      while (cycleEndFrom(start, sub.currentPeriodEnd) <= now) start = cycleEndFrom(start, sub.currentPeriodEnd);
      sub.creditCycleStart = start;
      sub.creditCycleEnd = cycleEndFrom(start, sub.currentPeriodEnd);
      try {
        await transfer(wallet, sub.providerId, sub.plan?.credits ?? 0, 'grant', `Monthly credits · ${sub.plan?.name?.en ?? 'Plan'}`, { refType: 'cycle', refId: sub.creditCycleStart });
        sub.creditBlocked = false;
      } catch (error) {
        if (!(error instanceof BillingError)) throw error;
        sub.creditBlocked = true;
      }
      saveWallet(wallet); saveSub(sub);
    }
    return { sub, wallet };
  }

  async function enforceClientLimit(providerId, subscriberId) {
    if (providerId === PLATFORM) return;
    const provider = await freshen(providerId);
    const limit = provider.sub?.plan?.limits?.clients ?? 0;
    if (!limit) return;
    const live = (await store.query('billingSubscriptions', 'providerId', providerId)).filter(sub => sub.id !== subscriberId && isLive(sub, now)).length;
    if (live >= limit) fail('failed-precondition', `The provider reached the client limit of the current platform plan (${limit}). The provider must upgrade first.`);
  }

  /** Start (or renew) a subscription period for `account`. */
  async function startPeriod(account, providerId, plan, kind, ref) {
    const { sub: previous, wallet: existingWallet } = await freshen(account.uid);
    const sameLive = previous && isLive(previous, now) && previous.planId === plan.id && kind === 'plan' && previous.plan?.kind === 'plan';
    if (sameLive) {
      if (!previous.currentPeriodEnd) fail('failed-precondition', 'Lifetime plans never expire and do not need renewal.');
      previous.currentPeriodEnd = periodEndFor(plan, previous.currentPeriodEnd);
      previous.plan = planSnapshot(plan);
      previous.renewals = (previous.renewals ?? 0) + 1;
      previous.status = 'active';
      saveSub(previous);
      return previous;
    }
    await enforceClientLimit(providerId, account.uid);
    const wallet = existingWallet ?? newWallet(account.uid, account.role, providerId);
    wallet.providerId = providerId;
    expireBalance(wallet, 'Plan changed · previous credits expired');
    const end = periodEndFor(plan, now);
    const sub = {
      id: account.uid, subscriberId: account.uid, subscriberRole: account.role,
      subscriberName: account.name ?? '', subscriberEmail: account.email ?? '',
      providerId, planId: plan.id, plan: planSnapshot(plan),
      status: kind === 'trial' ? 'trialing' : 'active',
      startedAt: previous?.startedAt ?? now, currentPeriodStart: now, currentPeriodEnd: end,
      creditCycleStart: now, creditCycleEnd: cycleEndFrom(now, end),
      trialUsedAt: kind === 'trial' ? now : previous?.trialUsedAt ?? null,
      extraSeats: 0, extraTools: [], renewals: 0, creditBlocked: false, createdAt: previous?.createdAt ?? now,
    };
    await transfer(wallet, providerId, plan.credits, 'grant', `${kind === 'trial' ? 'Free trial' : 'Plan'} credits · ${plan.name.en}`, ref);
    saveWallet(wallet); saveSub(sub);
    return sub;
  }

  async function applyAddon(account, providerId, plan, quantity, ref) {
    const { sub, wallet: existing } = await freshen(account.uid);
    if (!isLive(sub, now)) fail('failed-precondition', 'An active subscription is required before adding add-ons.');
    if (plan.addonType === 'credits') {
      const wallet = existing ?? newWallet(account.uid, account.role, providerId);
      await transfer(wallet, providerId, plan.credits * quantity, 'topup', `Add-on · ${plan.name.en} ×${quantity} (expires at cycle end)`, ref);
      saveWallet(wallet);
    } else if (plan.addonType === 'seats') {
      sub.extraSeats = (sub.extraSeats ?? 0) + plan.addonSeats * quantity;
      saveSub(sub);
    } else if (plan.addonType === 'tool') {
      if (providerId !== PLATFORM) {
        const provider = await freshen(providerId);
        if (!entitledTools(provider.sub, now).includes(plan.addonTool)) fail('failed-precondition', 'The provider subscription no longer includes this tool.');
      }
      sub.extraTools = [...new Set([...(sub.extraTools ?? []), plan.addonTool])];
      saveSub(sub);
    }
    return sub;
  }

  async function applyAddonItem(account, providerId, addon, ref) {
    const { sub, wallet: existing } = await freshen(account.uid);
    if (!sub || !isLive(sub, now)) fail('failed-precondition', 'An active subscription is required before adding add-ons.');
    if (addon.addonType === 'seats') {
      sub.extraSeats = (sub.extraSeats ?? 0) + (addon.credits || addon.qty);
      saveSub(sub);
    } else if (addon.addonType === 'tool' && addon.addonTool) {
      if (providerId !== PLATFORM) {
        const provider = await freshen(providerId);
        if (!entitledTools(provider.sub, now).includes(addon.addonTool)) fail('failed-precondition', 'The provider subscription no longer includes this tool.');
      }
      sub.extraTools = [...new Set([...(sub.extraTools ?? []), addon.addonTool])];
      saveSub(sub);
    } else if (addon.credits > 0) {
      const wallet = existing ?? newWallet(account.uid, account.role, providerId);
      const totalCredits = addon.type === 'unit' ? addon.credits : (addon.credits * addon.qty);
      const addonLabel = typeof addon.name === 'string' ? addon.name : (addon.name?.en || 'Add-on credits');
      await transfer(wallet, providerId, totalCredits, 'topup', `${addonLabel} (expires at cycle end)`, ref);
      saveWallet(wallet);
    }
    sub.addons = [...(sub.addons || []), addon];
    saveSub(sub);
    return sub;
  }

  async function providerPlan(planId, providerId, kinds) {
    const plan = await store.get(`billingPlans/${identifier(planId, 'plan')}`);
    if (!plan || plan.ownerId !== providerId || !kinds.includes(plan.kind) || plan.status !== 'active') fail('not-found', 'This plan is not available.');
    return plan;
  }
  async function managedAccount(subscriberId) {
    const target = await store.get(`users/${identifier(subscriberId, 'account')}`);
    if (!target) fail('not-found', 'Account not found.');
    const account = { uid: subscriberId, role: target.role, name: target.name, email: target.email, supportParentId: target.supportParentId };
    const providerId = providerOf(account);
    if (!canDecide(providerId)) fail('permission-denied', 'You can only manage your own clients.');
    return { account, providerId };
  }
  async function findActiveFreePlan(providerId) {
    // 1. Direct trial plan for this provider
    const trial = await store.get(`billingPlans/${providerId}__trial`);
    if (trial) {
      if (trial.status === 'active' && trial.enabled !== false && trial.visible !== false) {
        return trial;
      }
      // If trial exists and enabled === false, provider explicitly turned off free trial
    } else if (providerId !== PLATFORM) {
      // For workspace admin providers, free trial is enabled by default unless explicitly disabled
      const defaults = DEFAULT_TRIAL.user;
      return {
        id: `${providerId}__trial`,
        ownerId: providerId,
        audience: 'user',
        kind: 'trial',
        name: { en: 'Free trial', ar: 'تجربة مجانية' },
        description: { en: 'Complimentary trial period', ar: 'فترة تجريبية مجانية' },
        badge: { en: 'Trial', ar: 'تجربة' },
        cta: { en: 'Start free trial', ar: 'بدء التجربة المجانية' },
        features: { en: ['Access all workspace features during trial'], ar: ['الوصول لكافة ميزات مساحة العمل أثناء التجربة'] },
        price: 0,
        currency: 'USD',
        billingType: 'fixed',
        durationDays: defaults.days,
        credits: defaults.credits,
        tools: [...TOOL_IDS],
        channels: [],
        limits: { seats: 1, clients: 0 },
        addonType: null,
        addonSeats: null,
        addonTool: null,
        visible: true,
        enabled: true,
        sortOrder: 0,
        status: 'active',
      };
    }

    // 2. Query published plans for ownerId === providerId where price === 0
    const plans = await store.query('billingPlans', 'ownerId', providerId);
    const freePlan = plans.find(p => p.status === 'active' && p.visible !== false && (p.kind === 'trial' ? p.enabled !== false : p.price === 0));
    if (freePlan) return freePlan;

    // If provider explicitly turned off trial, do not fall back to platform trial
    if (trial && trial.enabled === false) {
      return null;
    }

    // 3. Fallback to platform master trial/plan if provider is not platform
    if (providerId !== PLATFORM) {
      const platformTrial = await store.get(`billingPlans/${PLATFORM}__trial`);
      if (platformTrial && platformTrial.status === 'active' && platformTrial.enabled !== false && platformTrial.visible !== false) {
        return platformTrial;
      }
      const platformPlans = await store.query('billingPlans', 'ownerId', PLATFORM);
      const platformFree = platformPlans.find(p => p.status === 'active' && p.visible !== false && (p.kind === 'trial' ? p.enabled !== false : p.price === 0));
      if (platformFree) return platformFree;
    }
    return null;
  }

  // ── Coupons ──
  /** Resolve an eligible coupon of `providerId` for `context` and price the order. Read-only. */
  async function resolveCoupon(providerId, rawCode, context, subtotal, currency) {
    const code = normalizeCouponCode(rawCode);
    if (!code) return null;
    if (!COUPON_CODE.test(code)) fail('not-found', 'This coupon code is not valid.');
    const coupon = await store.get(`billingCoupons/${couponDocId(providerId, code)}`);
    if (!coupon || coupon.ownerId !== providerId || coupon.status !== 'active') fail('not-found', 'This coupon code is not valid.');
    if (coupon.active === false) fail('failed-precondition', 'This coupon is currently paused.');
    if (coupon.startsAt && coupon.startsAt > now) fail('failed-precondition', 'This coupon is not active yet.');
    if (coupon.expiresAt && coupon.expiresAt <= now) fail('failed-precondition', 'This coupon has expired.');
    if (!coupon.appliesTo?.includes(context)) fail('failed-precondition', context === 'wallet_topup' ? 'This coupon cannot be used for wallet top-ups.' : 'This coupon cannot be used for this purchase.');
    if (coupon.maxRedemptions && (coupon.redemptions ?? 0) >= coupon.maxRedemptions) fail('resource-exhausted', 'This coupon has reached its redemption limit.');
    const usage = await store.get(`couponRedemptions/${coupon.id}__${actor.uid}`);
    if (coupon.perUserLimit && (usage?.count ?? 0) >= coupon.perUserLimit) fail('resource-exhausted', 'You have already used this coupon.');
    if (subtotal < (coupon.minAmount ?? 0)) fail('failed-precondition', `This coupon requires a minimum order of ${coupon.minAmount} ${coupon.currency ?? currency}.`);
    return { coupon, usage, ...couponEffect(coupon, subtotal, currency, context) };
  }
  /** Count a redemption when the request is created; released again if the request is rejected or cancelled. */
  function redeemCoupon(resolved, requestId) {
    const { coupon, usage } = resolved;
    const usageId = `${coupon.id}__${actor.uid}`;
    store.set(`billingCoupons/${coupon.id}`, { ...coupon, redemptions: (coupon.redemptions ?? 0) + 1, lastRedeemedAt: now, updatedAt: now });
    store.set(`couponRedemptions/${usageId}`, { id: usageId, couponId: coupon.id, ownerId: coupon.ownerId, code: coupon.code, userId: actor.uid, count: (usage?.count ?? 0) + 1, requestIds: [...(usage?.requestIds ?? []), requestId].slice(-50), createdAt: usage?.createdAt ?? now, updatedAt: now });
    return { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, discount: resolved.discount, bonus: resolved.bonus };
  }
  async function releaseCoupon(request) {
    if (!request.coupon?.id) return;
    const usageId = `${request.coupon.id}__${request.requesterId}`;
    const coupon = await store.get(`billingCoupons/${request.coupon.id}`);
    const usage = await store.get(`couponRedemptions/${usageId}`);
    if (coupon) store.set(`billingCoupons/${coupon.id}`, { ...coupon, redemptions: Math.max(0, (coupon.redemptions ?? 0) - 1), updatedAt: now });
    if (usage) store.set(`couponRedemptions/${usageId}`, { ...usage, count: Math.max(0, (usage.count ?? 0) - 1), requestIds: (usage.requestIds ?? []).filter(id => id !== request.id), updatedAt: now });
  }
  /** Plan/add-on coupons with a credit bonus grant extra plan credits (funded by the provider like any grant). */
  async function grantCouponBonus(account, providerId, request, ref) {
    const bonus = request.coupon?.bonus ?? 0;
    if (!bonus || request.type === 'wallet_topup') return;
    const { wallet: existing } = await freshen(account.uid);
    const wallet = existing ?? newWallet(account.uid, account.role, providerId);
    await transfer(wallet, providerId, bonus, 'topup', `Coupon bonus · ${request.coupon.code} (expires at cycle end)`, ref);
    saveWallet(wallet);
  }

  const handlers = {
    async refresh() {
      const uid = role === 'SYSTEM' ? identifier(data.subscriberId, 'account') : actor.uid;
      const { sub, wallet } = await freshen(uid);
      return { subscription: sub ?? null, wallet: wallet ?? null };
    },

    async savePlan() {
      const ownerId = ownerOf();
      let allowedTools = null;
      if (ownerId !== PLATFORM) {
        const { sub } = await freshen(actor.uid);
        if (!isLive(sub, now)) fail('failed-precondition', 'Activate your platform subscription before creating plans for your clients.');
        allowedTools = entitledTools(sub, now);
      }
      const input = data.plan ?? {};
      const id = input.kind === 'trial' ? `${ownerId}__trial` : input.id ? identifier(input.id, 'plan') : store.id();
      const existing = await store.get(`billingPlans/${id}`);
      if (existing && existing.ownerId !== ownerId) fail('permission-denied', 'You cannot edit this plan.');
      const plan = normalizePlan(input, { ownerId, allowedTools, existing, id, now });
      store.set(`billingPlans/${id}`, plan);
      return { plan };
    },

    async archivePlan() {
      const ownerId = ownerOf();
      const plan = await store.get(`billingPlans/${identifier(data.planId, 'plan')}`);
      if (!plan || plan.ownerId !== ownerId) fail('not-found', 'Plan not found.');
      store.set(`billingPlans/${plan.id}`, { ...plan, status: 'archived', visible: false, updatedAt: now });
      return { success: true };
    },

    async saveBillingSettings() {
      const targetProvider = role === 'SUPER_ADMIN' ? (data.providerId || PLATFORM) : actor.uid;
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') fail('permission-denied', 'Only administrators can configure billing settings.');
      const mode = ['fixed', 'dynamic', 'both'].includes(data.addonMode) ? data.addonMode : 'both';
      const unitRate = {
        creditsPerUnit: int(data.unitRate?.creditsPerUnit ?? 100, 'Credits per unit', 1, 1000000),
        pricePerUnit: Math.max(0, Math.round(Number(data.unitRate?.pricePerUnit ?? 5) * 100) / 100),
        currency: CURRENCIES.includes(data.unitRate?.currency) ? data.unitRate.currency : 'USD',
        minUnits: int(data.unitRate?.minUnits ?? 1, 'Min units', 1, 1000),
        maxUnits: int(data.unitRate?.maxUnits ?? 100, 'Max units', 1, 100000),
      };
      const settings = { providerId: targetProvider, addonMode: mode, unitRate, updatedAt: now };
      store.set(`billingSettings/${targetProvider}`, settings);
      return { settings };
    },

    async getBillingSettings() {
      const targetId = data.providerId || (role === 'SUPER_ADMIN' ? PLATFORM : actor.uid);
      const existing = await store.get(`billingSettings/${targetId}`);
      return { settings: existing || { ...DEFAULT_BILLING_SETTINGS, providerId: targetId } };
    },

    async startTrial() {
      const providerId = providerOf(actor);
      const trial = await findActiveFreePlan(providerId);
      if (!trial) fail('failed-precondition', 'No free trial is available right now.');
      const { sub } = await freshen(actor.uid);
      if (sub?.trialUsedAt) fail('already-exists', 'You have already used your free trial.');
      if (isLive(sub, now)) fail('failed-precondition', 'You already have an active subscription.');
      const subscription = await startPeriod(actor, providerId, trial, trial.kind === 'trial' ? 'trial' : 'plan', { refType: 'trial', refId: trial.id });
      return { subscription };
    },

    async initializeAccountPlan() {
      const targetUid = data.subscriberId ? identifier(data.subscriberId, 'subscriber') : actor.uid;
      let account;
      let providerId;
      if (targetUid === actor.uid && actor.role !== 'SYSTEM') {
        account = actor;
        providerId = providerOf(account);
      } else {
        const target = await store.get(`users/${targetUid}`);
        if (!target) fail('not-found', 'Account not found.');
        account = { uid: targetUid, role: target.role, name: target.name, email: target.email, supportParentId: target.supportParentId };
        providerId = providerOf(account);
      }

      // Check if already subscribed
      const { sub: existingSub } = await freshen(account.uid);
      if (existingSub && isLive(existingSub, now)) {
        return { assigned: false, reason: 'already_live', subscription: existingSub };
      }
      if (existingSub?.trialUsedAt) {
        return { assigned: false, reason: 'trial_already_used', subscription: existingSub };
      }

      // Check if Free Plan is active/published
      const freePlan = await findActiveFreePlan(providerId);
      if (!freePlan) {
        return { assigned: false, reason: 'free_plan_disabled' };
      }

      // Automatically assign Free Plan
      const isTrial = freePlan.kind === 'trial';
      const ref = { refType: 'registration', refId: freePlan.id };
      try {
        const subscription = await startPeriod(account, providerId, freePlan, isTrial ? 'trial' : 'plan', ref);
        return { assigned: true, status: 'assigned', subscription };
      } catch (err) {
        if (err instanceof BillingError && err.code === 'failed-precondition') {
          return { assigned: false, reason: 'provider_quota_exceeded', error: err.message };
        }
        throw err;
      }
    },

    async requestPlan() {
      const providerId = providerOf(actor);
      const plan = await providerPlan(data.planId, providerId, ['plan']);
      if (!plan.visible) fail('not-found', 'This plan is not available.');
      const { sub } = await freshen(actor.uid);
      const renewal = isLive(sub, now) && sub.planId === plan.id;
      if (renewal && !sub.currentPeriodEnd) fail('failed-precondition', 'Lifetime plans never expire and do not need renewal.');
      return { request: await createRequest(providerId, plan, renewal ? 'renewal' : 'plan', 1) };
    },

    async requestAddon() {
      const providerId = providerOf(actor);
      let plan;
      if (data.isDynamic || data.planId === 'dynamic_units') {
        const credits = int(data.credits ?? 100, 'Credits', 1, 10000000);
        const price = Math.max(0, Math.round(Number(data.price ?? data.totalAmount ?? 0) * 100) / 100);
        const currency = CURRENCIES.includes(data.currency) ? data.currency : 'USD';
        plan = {
          id: 'dynamic_units', ownerId: providerId, kind: 'addon',
          name: { en: `${credits.toLocaleString()} Custom Credits`, ar: `${credits.toLocaleString()} رصيد مخصص` },
          price, currency, billingType: 'once', credits, addonType: 'credits', status: 'active', visible: true, tools: []
        };
      } else {
        plan = await providerPlan(data.planId, providerId, ['addon']);
        if (!plan.visible) fail('not-found', 'This add-on is not available.');
      }
      const { sub } = await freshen(actor.uid);
      if (!isLive(sub, now)) fail('failed-precondition', 'An active subscription is required before requesting add-ons.');
      return { request: await createRequest(providerId, plan, 'addon', int(data.quantity ?? 1, 'Quantity', 1, 100)) };
    },

    async cancelRequest() {
      const request = await store.get(`billingRequests/${identifier(data.requestId, 'request')}`);
      if (!request || request.requesterId !== actor.uid) fail('not-found', 'Request not found.');
      if (request.status !== 'pending') fail('failed-precondition', 'Only pending requests can be cancelled.');
      await releaseCoupon(request);
      writeRequest(request.id, { ...request, status: 'cancelled', decidedAt: now, decidedBy: actor.uid });
      return { success: true };
    },

    async attachReceipt() {
      const requestId = identifier(data.requestId, 'request');
      const request = await store.get(`billingRequests/${requestId}`);
      if (!request) fail('not-found', 'Request not found.');
      const isRequester = request.requesterId === actor.uid;
      const isProvider = canDecide(request.providerId);
      if (!isRequester && !isProvider) fail('permission-denied', 'You cannot update this request.');

      const rawReceipt = data.receiptUrl || data.receiptPath || data.imageUrl || data.fileUrl || data.receipt || '';
      const receiptUrl = cleanReceipt(rawReceipt);
      const rawName = data.receiptName || data.fileName || data.receiptFileName || '';
      const receiptName = text(rawName, 200, 'Receipt file name') || '';
      const transactionId = data.transactionId ? text(data.transactionId, 120, 'Transaction ID') : request.transactionId;

      const updated = {
        ...request,
        receiptUrl: receiptUrl || request.receiptUrl || '',
        receiptPath: receiptUrl || request.receiptPath || '',
        imageUrl: receiptUrl || request.imageUrl || '',
        fileUrl: receiptUrl || request.fileUrl || '',
        receiptName: receiptName || request.receiptName || 'receipt',
        fileName: receiptName || request.fileName || 'receipt',
        transactionId: transactionId || request.transactionId || '',
        updatedAt: now,
      };
      writeRequest(requestId, updated);
      return { success: true, request: updated };
    },

    async decideRequest() {
      const request = await store.get(`billingRequests/${identifier(data.requestId, 'request')}`);
      if (!request) fail('not-found', 'Request not found.');
      if (!canDecide(request.providerId)) fail('permission-denied', 'You cannot decide on this request.');
      if (request.status !== 'pending') fail('failed-precondition', 'This request was already processed.');
      if (data.decision === 'reject') {
        const reason = text(data.reason, 300, 'Rejection reason', true);
        await releaseCoupon(request);
        writeRequest(request.id, { ...request, status: 'rejected', reason, decidedAt: now, decidedBy: actor.uid });
        return { success: true };
      }
      if (data.decision !== 'approve') fail('invalid-argument', 'Choose approve or reject.');
      const reason = text(data.reason, 300, 'Reason', false);
      if (request.type === 'wallet_topup') {
        const target = await store.get(`users/${request.requesterId}`);
        const topupAccount = { uid: request.requesterId, role: request.requesterRole, name: request.requesterName || target?.name, email: request.requesterEmail };
        // The customer pays `total` (after any coupon discount) and receives `creditAmount` (face value + bonus).
        await creditCommunicationWallet(topupAccount, request.providerId, request.creditAmount ?? request.total, request.currency ?? request.plan?.currency ?? WALLET_CURRENCY, 'Wallet top-up', { ref_type: 'request', ref_id: request.id, payment_method: request.paymentMethod ?? 'manual', ...(request.coupon?.code ? { coupon_code: request.coupon.code } : {}) });
        writeRequest(request.id, { ...request, status: 'approved', reason, decidedAt: now, decidedBy: actor.uid });
        return { success: true };
      }
      const isDynamic = request.planId === 'dynamic_units';
      const plan = isDynamic ? request.plan : await providerPlan(request.planId, request.providerId, request.type === 'addon' ? ['addon'] : ['plan']);
      const account = { uid: request.requesterId, role: request.requesterRole, name: request.requesterName, email: request.requesterEmail };
      const ref = { refType: 'request', refId: request.id };

      if (request.addons && request.addons.length > 0) {
        if (request.type !== 'addon') {
          await startPeriod(account, request.providerId, plan, 'plan', ref);
        }
        for (const addon of request.addons) {
          await applyAddonItem(account, request.providerId, addon, ref);
        }
      } else if (request.type === 'addon') {
        await applyAddon(account, request.providerId, plan, request.quantity ?? 1, ref);
      } else {
        await startPeriod(account, request.providerId, plan, 'plan', ref);
      }
      await grantCouponBonus(account, request.providerId, request, ref);
      writeRequest(request.id, { ...request, status: 'approved', reason, decidedAt: now, decidedBy: actor.uid });
      return { success: true };
    },

    async assignPlan() {
      if (!MANAGERS.includes(role)) fail('permission-denied', 'Only administrators can assign plans.');
      const { account, providerId } = await managedAccount(data.subscriberId);
      const plan = await providerPlan(data.planId, providerId, ['plan', 'addon']);
      const ref = { refType: 'assignment', refId: plan.id };
      const subscription = plan.kind === 'addon' ? await applyAddon(account, providerId, plan, int(data.quantity ?? 1, 'Quantity', 1, 100), ref) : await startPeriod(account, providerId, plan, 'plan', ref);
      return { subscription };
    },

    async transferCredits() {
      if (role !== 'ADMIN') fail('permission-denied', 'Only admins can transfer credits to their clients.');
      const { account, providerId } = await managedAccount(data.subscriberId);
      if (providerId !== actor.uid) fail('permission-denied', 'You can only transfer credits to your own clients.');
      const credits = int(data.amount, 'Credits', 1, 10000000);
      const reason = text(data.reason, 200, 'Reason') || 'Manual credit transfer';
      const { sub, wallet: existing } = await freshen(account.uid);
      if (!isLive(sub, now)) fail('failed-precondition', 'The client needs an active subscription to receive credits.');
      const wallet = existing ?? newWallet(account.uid, account.role, providerId);
      await transfer(wallet, providerId, credits, 'topup', `${reason} (expires at cycle end)`, { refType: 'transfer' });
      saveWallet(wallet);
      return { wallet };
    },

    async adjustCredits() {
      if (role !== 'SUPER_ADMIN') fail('permission-denied', 'Only the platform owner can adjust credits.');
      const { account, providerId } = await managedAccount(data.subscriberId);
      const delta = int(data.amount, 'Adjustment', -10000000, 10000000);
      if (!delta) fail('invalid-argument', 'Enter a non-zero adjustment.');
      const reason = text(data.reason, 200, 'Reason', true);
      const wallet = (await freshen(account.uid)).wallet ?? newWallet(account.uid, account.role, providerId);
      if (wallet.balance + delta < 0) fail('failed-precondition', 'The adjustment would make the balance negative.');
      wallet.balance += delta;
      entry(wallet, 'adjustment', delta, reason, { refType: 'adjustment' });
      saveWallet(wallet);
      return { wallet };
    },

    /** Server-only usage deduction (AI generation, WhatsApp/email sends…). Idempotent per usage event. */
    async consume() {
      if (role !== 'SYSTEM') fail('permission-denied', 'Usage can only be recorded by the server.');
      const uid = identifier(data.subscriberId, 'account');
      const eventId = identifier(data.idempotencyKey, 'usage event');
      const entryId = `usage_${eventId}`;
      if (await store.get(`billingLedger/${entryId}`)) return { duplicate: true };
      const credits = int(data.amount, 'Credits', 1, 1000000);
      const { sub, wallet } = await freshen(uid);
      if (!isLive(sub, now)) fail('failed-precondition', 'No active subscription. Renew to continue using this feature.');
      if (!wallet || wallet.balance < credits) fail('resource-exhausted', 'Not enough credits. Request a credit add-on to continue.');
      wallet.balance -= credits;
      entry(wallet, 'usage', -credits, text(data.description, 200, 'Description') || `Usage · ${text(data.usageType, 40, 'Usage type') || 'service'}`, { entryId, refType: 'usage', refId: eventId, usageType: text(data.usageType, 40, 'Usage type') });
      saveWallet(wallet);
      return { balance: wallet.balance };
    },

    /** The caller's Communication Wallet history. Provider cost and margin are only returned to administrators. */
    async walletLedger() {
      const showCost = role === 'ADMIN' || role === 'SUPER_ADMIN';
      const rows = await store.query('communicationLedger', 'subscriber_id', actor.uid);
      const entries = rows.filter(row => row.status !== 'failed')
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 200)
        .map(row => ({
          id: row.id, created_at: row.created_at, usage_type: row.usage_type, channel: row.channel ?? null, description: row.description ?? '',
          status: row.status, amount: row.amount ?? 0, balance_after: row.balance_after ?? null, currency: row.currency, quantity: row.quantity ?? 0,
          customer_charge: row.customer_charge ?? 0, ...(showCost ? { provider_cost: row.provider_cost ?? 0, margin: row.margin ?? 0 } : {}),
        }));
      return { entries };
    },

    /**
     * Request a Communication Wallet top-up from the provider (Admin → platform, User → Admin).
     * Mirrors plan checkout: manual transfers (with receipt) wait for approval in `billingRequests`;
     * confirmed gateway payments are credited instantly. Coupons reduce `total` (what is paid) and/or
     * add a bonus to `creditAmount` (what the wallet receives).
     */
    async requestWalletTopup() {
      const providerId = providerOf(actor);
      const value = amount(data.amount, 'Top-up amount');
      if (value < 1 || value > 100000) fail('invalid-argument', 'Top-up amount must be between 1 and 100,000.');
      const currency = data.currency === undefined ? WALLET_CURRENCY : data.currency;
      if (currency !== WALLET_CURRENCY) fail('invalid-argument', `Wallet top-ups are processed in ${WALLET_CURRENCY}.`);
      const key = typeof data.idempotencyKey === 'string' && /^[\w-]{8,80}$/.test(data.idempotencyKey) ? data.idempotencyKey : store.id();
      const id = `topup_${actor.uid}_${key}`;
      const existing = await store.get(`billingRequests/${id}`);
      if (existing) return { request: existing, duplicate: true };
      const resolved = data.couponCode ? await resolveCoupon(providerId, data.couponCode, 'wallet_topup', value, currency) : null;
      const payable = resolved ? resolved.payable : value;
      const creditAmount = round2(value + (resolved?.bonus ?? 0));
      const isGatewayInstant = data.paymentType === 'gateway' && data.gatewayPaid === true;
      const paymentMethod = text(data.paymentMethod, 60, 'Payment method') || (isGatewayInstant ? 'gateway' : 'manual');
      const receiptUrl = cleanReceipt(data.receiptUrl || data.receipt || '');
      const receiptName = text(data.receiptName, 200, 'Receipt file name') || '';
      const label = `${value.toFixed(2)} ${currency}`;
      const request = {
        id, requesterId: actor.uid, requesterRole: actor.role, requesterName: actor.name ?? '', requesterEmail: actor.email ?? '',
        providerId, type: 'wallet_topup', planId: 'wallet_topup', quantity: 1,
        plan: { name: { en: `Wallet top-up · ${label}`, ar: `شحن المحفظة · ${label}` }, kind: 'addon', price: payable, currency, credits: 0, billingType: 'once', addonType: null },
        mainPlanPrice: 0, addons: [], subtotal: value, discount: resolved?.discount ?? 0, totalAmount: payable, total: payable, creditAmount, currency,
        coupon: resolved ? redeemCoupon(resolved, id) : null,
        note: text(data.note, 300, 'Note'), status: isGatewayInstant ? 'approved' : 'pending', createdAt: now,
        paymentMethod, paymentType: data.paymentType === 'gateway' ? 'gateway' : 'manual',
        receiptUrl, receiptPath: receiptUrl, imageUrl: receiptUrl, fileUrl: receiptUrl, receiptName, fileName: receiptName,
        transactionId: text(data.transactionId, 120, 'Transaction ID') || '',
        ...(isGatewayInstant ? { decidedAt: now, decidedBy: 'gateway-webhook' } : {}),
      };
      if (isGatewayInstant) {
        await creditCommunicationWallet(actor, providerId, creditAmount, currency, 'Wallet top-up', { ref_type: 'gateway_payment', ref_id: id, payment_method: paymentMethod, ...(request.coupon ? { coupon_code: request.coupon.code } : {}) });
      }
      writeRequest(id, request);
      return { request };
    },

    /** Super Admin manual correction of a Communication Wallet. The ledger entry is the audit record. */
    async adjustWallet() {
      if (role !== 'SUPER_ADMIN') fail('permission-denied', 'Only the platform owner can adjust communication wallets.');
      const { account, providerId } = await managedAccount(data.subscriberId);
      const delta = Math.round(Number(data.amount) * 100) / 100;
      if (!Number.isFinite(delta) || !delta || Math.abs(delta) > 100000) fail('invalid-argument', 'Enter a non-zero adjustment up to 100,000.');
      const reason = text(data.reason, 200, 'Reason', true);
      const wallet = await commWallet(account.uid, account.role, providerId);
      if (round4(wallet.balance - (wallet.held ?? 0) + delta) < 0) fail('failed-precondition', 'The adjustment would make the available balance negative.');
      wallet.balance = round4(wallet.balance + delta);
      commEntry(wallet, { usage_type: 'manual_adjustment', amount: delta, balance_after: wallet.balance, description: reason, ref_type: 'adjustment' });
      saveCommWallet(wallet);
      return { wallet };
    },

    /** Low-balance threshold and auto-recharge preferences for the caller's own Communication Wallet. */
    async saveWalletSettings() {
      const providerId = providerOf(actor);
      const recharge = data.autoRecharge ?? {};
      const below = recharge.below === '' || recharge.below === undefined ? '' : String(amount(recharge.below, 'Low-balance threshold'));
      const topup = recharge.amount === '' || recharge.amount === undefined ? '' : String(amount(recharge.amount, 'Recharge amount'));
      if (recharge.enabled === true) fail('failed-precondition', 'Connect a payment gateway before enabling automatic recharge.');
      const wallet = await commWallet(actor.uid, actor.role, providerId);
      wallet.autoRecharge = { enabled: false, below, amount: topup, method: text(recharge.method, 80, 'Payment method') };
      wallet.lowBalanceThreshold = below ? Number(below) : 0;
      wallet.lowBalance = round4(wallet.balance - (wallet.held ?? 0)) < wallet.lowBalanceThreshold;
      saveCommWallet(wallet);
      return { wallet };
    },

    /** Create or edit a provider coupon (platform coupons for admins, admin coupons for their clients). */
    async saveCoupon() {
      const ownerId = ownerOf();
      const input = data.coupon && typeof data.coupon === 'object' ? data.coupon : (data.code || data.type ? data : {});
      const editing = !!input.id;
      const id = editing ? identifier(input.id, 'coupon') : couponDocId(ownerId, normalizeCouponCode(input.code));
      const existing = await store.get(`billingCoupons/${id}`);
      if (existing && existing.ownerId !== ownerId) fail('permission-denied', 'You cannot edit this coupon.');
      if (editing && !existing) fail('not-found', 'Coupon not found.');
      if (!editing && existing && existing.status !== 'archived') fail('already-exists', `The code ${existing.code} already exists.`);
      const coupon = normalizeCoupon(input, { ownerId, existing: editing ? existing : null, now });
      coupon.createdBy = coupon.createdBy ?? actor.uid;
      store.set(`billingCoupons/${coupon.id}`, coupon);
      return { coupon };
    },

    async setCouponActive() {
      const ownerId = ownerOf();
      const coupon = await store.get(`billingCoupons/${identifier(data.couponId, 'coupon')}`);
      if (!coupon || coupon.ownerId !== ownerId || coupon.status !== 'active') fail('not-found', 'Coupon not found.');
      const updated = { ...coupon, active: data.active === true, updatedAt: now };
      store.set(`billingCoupons/${coupon.id}`, updated);
      return { coupon: updated };
    },

    async archiveCoupon() {
      const ownerId = ownerOf();
      const coupon = await store.get(`billingCoupons/${identifier(data.couponId, 'coupon')}`);
      if (!coupon || coupon.ownerId !== ownerId) fail('not-found', 'Coupon not found.');
      store.set(`billingCoupons/${coupon.id}`, { ...coupon, status: 'archived', active: false, updatedAt: now });
      return { success: true };
    },

    /** Preview a coupon at checkout. The server re-validates when the request is submitted. */
    async validateCoupon() {
      const providerId = providerOf(actor);
      const context = COUPON_SCOPES.includes(data.context) ? data.context : fail('invalid-argument', 'Unknown checkout type.');
      const subtotal = amount(data.amount ?? 0, 'Order amount');
      const currency = context === 'wallet_topup' ? WALLET_CURRENCY : CURRENCIES.includes(data.currency) ? data.currency : 'USD';
      const resolved = await resolveCoupon(providerId, data.code, context, subtotal, currency);
      if (!resolved) fail('invalid-argument', 'Enter a coupon code.');
      const { coupon } = resolved;
      return {
        coupon: { code: coupon.code, type: coupon.type, value: coupon.value, currency: coupon.currency, description: coupon.description, expiresAt: coupon.expiresAt },
        subtotal: resolved.subtotal, discount: resolved.discount, bonus: resolved.bonus, payable: resolved.payable, currency,
      };
    },

    /**
     * Communication Wallet analytics for the billing hub. Super Admin: platform-wide.
     * Admin: their clients' wallets (tenant_id = admin) plus their own agency wallet.
     */
    async walletAnalytics() {
      if (!MANAGERS.includes(role)) fail('permission-denied', 'Only administrators can view wallet analytics.');
      const platform = role === 'SUPER_ADMIN';
      const days = [7, 30, 90, 365].includes(Number(data.days)) ? Number(data.days) : 30;
      let rows, wallets;
      if (platform) {
        rows = await store.list('communicationLedger', { orderBy: 'created_at', limit: 5000 });
        wallets = await store.list('communicationWallets', { limit: 5000 });
      } else {
        const scoped = [...await store.query('communicationLedger', 'tenant_id', actor.uid), ...await store.query('communicationLedger', 'subscriber_id', actor.uid)];
        rows = [...new Map(scoped.map(row => [row.id, row])).values()];
        const own = await store.get(`communicationWallets/${actor.uid}`);
        wallets = [...(own ? [{ ...own, id: actor.uid }] : []), ...(await store.query('communicationWallets', 'providerId', actor.uid))];
      }
      const report = buildWalletAnalytics(rows, wallets, { now, days });
      const ids = report.accounts.slice(0, 60).map(account => account.id);
      const names = {};
      for (const uid of ids) {
        const user = await store.get(`users/${uid}`);
        if (user) names[uid] = { name: user.name || user.displayName || '', email: user.email || '', role: user.role || '' };
      }
      for (const account of report.accounts) Object.assign(account, names[account.id] ?? {});
      for (const entry of report.entries) { const who = names[entry.subscriber_id]; if (who) entry.account_name = who.name || who.email; }
      return { scope: platform ? 'platform' : 'provider', ...report };
    },
  };

  // Preserve the existing approval queue and atomically expose add-on requests
  // under the dedicated collection using the same ID and lifecycle status.
  function cleanReceipt(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    const value = raw.trim();
    if (value.startsWith('data:') && value.length > 900000) fail('invalid-argument', 'Receipt image is too large. Please upload an image under 650 KB or try again so it can be stored in cloud storage.');
    if (!value.startsWith('data:') && value.length > 4000) fail('invalid-argument', 'Invalid receipt link.');
    return value;
  }

  function writeRequest(id, request) {
    store.set(`billingRequests/${id}`, request);
    if (request.type === 'addon') store.set(`add_on_requests/${id}`, request);
  }

  async function createRequest(providerId, plan, type, quantity) {
    const rawReceipt = data.receiptUrl || data.receiptPath || data.imageUrl || data.fileUrl || data.receipt || data.url || data.attachmentUrl || data.documentUrl || '';
    const receiptUrl = cleanReceipt(rawReceipt);
    const rawName = data.receiptName || data.fileName || data.receiptFileName || data.name || '';
    const receiptName = text(rawName, 200, 'Receipt file name') || '';
    const isGatewayInstant = data.paymentType === 'gateway' && data.gatewayPaid === true;

    const rawAddons = Array.isArray(data.addons) ? data.addons : [];
    const cleanedAddons = rawAddons.map(a => ({
      id: String(a.id || ''),
      type: a.type === 'unit' ? 'unit' : 'fixed',
      qty: Math.max(1, Math.min(1000, Number(a.qty) || 1)),
      credits: Math.max(0, Math.min(10000000, Number(a.credits) || 0)),
      price: Math.max(0, Math.min(1000000, Math.round((Number(a.price) || 0) * 100) / 100)),
      name: a.name ?? (a.type === 'unit' ? 'Custom credits' : 'Add-on pack'),
      addonType: a.addonType || 'credits',
      addonTool: a.addonTool ? String(a.addonTool) : undefined,
    }));

    const mainPlanPrice = type === 'addon' ? 0 : Math.round(plan.price * quantity * 100) / 100;
    const addonsTotal = cleanedAddons.reduce((sum, item) => sum + (item.price * (item.type === 'unit' ? 1 : item.qty)), 0);
    const totalAmount = Math.round((type === 'addon' && !cleanedAddons.length ? (plan.price * quantity) : (mainPlanPrice + addonsTotal)) * 100) / 100;

    const open = (await store.query('billingRequests', 'requesterId', actor.uid)).find(item => item.status === 'pending' && item.planId === plan.id);
    if (open) {
      if (receiptUrl || data.transactionId) {
        const updated = {
          ...open,
          mainPlanPrice,
          addons: cleanedAddons,
          totalAmount,
          total: totalAmount,
          receiptUrl: receiptUrl || open.receiptUrl || '',
          receiptPath: receiptUrl || open.receiptPath || '',
          imageUrl: receiptUrl || open.imageUrl || '',
          fileUrl: receiptUrl || open.fileUrl || '',
          receiptName: receiptName || open.receiptName || '',
          fileName: receiptName || open.fileName || '',
          paymentMethod: text(data.paymentMethod, 60, 'Payment method') || open.paymentMethod,
          transactionId: text(data.transactionId, 120, 'Transaction ID') || open.transactionId,
          note: text(data.note, 300, 'Note') || open.note,
          updatedAt: now,
        };
        writeRequest(open.id, updated);
        return updated;
      }
      fail('already-exists', 'You already have a pending request for this item.');
    }
    const id = store.id();
    const resolved = data.couponCode ? await resolveCoupon(providerId, data.couponCode, type === 'addon' ? 'addon' : 'plan', totalAmount, plan.currency) : null;
    const payable = resolved ? resolved.payable : totalAmount;
    const request = {
      id, requesterId: actor.uid, requesterRole: actor.role, requesterName: actor.name ?? '', requesterEmail: actor.email ?? '',
      providerId, type, planId: plan.id, quantity,
      plan: { name: plan.name, kind: plan.kind, price: plan.price, currency: plan.currency, credits: plan.credits, billingType: plan.billingType, addonType: plan.addonType ?? null },
      mainPlanPrice,
      addons: cleanedAddons,
      totalAmount: payable,
      total: payable,
      ...(resolved ? { subtotal: totalAmount, discount: resolved.discount, coupon: redeemCoupon(resolved, id) } : {}),
      note: text(data.note, 300, 'Note'),
      status: isGatewayInstant ? 'approved' : 'pending',
      createdAt: now,
      paymentMethod: text(data.paymentMethod, 60, 'Payment method') || (isGatewayInstant ? 'gateway' : 'manual'),
      paymentType: data.paymentType === 'gateway' ? 'gateway' : 'manual',
      receiptUrl,
      receiptPath: receiptUrl,
      imageUrl: receiptUrl,
      fileUrl: receiptUrl,
      receiptName,
      fileName: receiptName,
      transactionId: text(data.transactionId, 120, 'Transaction ID') || '',
      decidedAt: isGatewayInstant ? now : undefined,
      decidedBy: isGatewayInstant ? 'gateway-webhook' : undefined,
    };
    if (isGatewayInstant) {
      const account = { uid: actor.uid, role: actor.role, name: actor.name, email: actor.email };
      const ref = { refType: 'gateway_payment', refId: request.id, method: request.paymentMethod };
      if (cleanedAddons.length > 0) {
        if (type !== 'addon') {
          await startPeriod(account, providerId, plan, 'plan', ref);
        }
        for (const addon of cleanedAddons) {
          await applyAddonItem(account, providerId, addon, ref);
        }
      } else if (type === 'addon') {
        await applyAddon(account, providerId, plan, quantity, ref);
      } else {
        await startPeriod(account, providerId, plan, 'plan', ref);
      }
      await grantCouponBonus(account, providerId, request, ref);
    }
    writeRequest(id, request);
    return request;
  }

  const handler = Object.hasOwn(handlers, operation) ? handlers[operation] : null;
  if (!handler) fail('invalid-argument', 'Unsupported billing operation.');
  if (role === 'SYSTEM' && !['refresh', 'consume'].includes(operation)) fail('permission-denied', 'Unsupported system operation.');
  const result = await handler();
  await store.flush();
  return result;
}
