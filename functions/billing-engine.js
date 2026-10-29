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
export const CHANNEL_IDS = ['ai', 'whatsapp', 'messenger', 'instagram', 'email', 'sms'];
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
  return [...new Set([...(sub.plan?.tools ?? []), ...(sub.extraTools ?? [])])];
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
  const tools = ownerId === PLATFORM
    ? (Array.isArray(input.tools) && input.tools.length ? [...new Set(input.tools.filter(tool => TOOL_IDS.includes(tool)))] : [...TOOL_IDS])
    : [...new Set((Array.isArray(input.tools) ? input.tools : []).filter(tool => TOOL_IDS.includes(tool)))];
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
        writeRequest(request.id, { ...request, status: 'rejected', reason, decidedAt: now, decidedBy: actor.uid });
        return { success: true };
      }
      if (data.decision !== 'approve') fail('invalid-argument', 'Choose approve or reject.');
      const reason = text(data.reason, 300, 'Reason', false);
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
    const request = {
      id, requesterId: actor.uid, requesterRole: actor.role, requesterName: actor.name ?? '', requesterEmail: actor.email ?? '',
      providerId, type, planId: plan.id, quantity,
      plan: { name: plan.name, kind: plan.kind, price: plan.price, currency: plan.currency, credits: plan.credits, billingType: plan.billingType, addonType: plan.addonType ?? null },
      mainPlanPrice,
      addons: cleanedAddons,
      totalAmount,
      total: totalAmount,
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
