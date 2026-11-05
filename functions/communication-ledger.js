// GOS Communication Credits — dual-cost ledger and two-phase charge service.
//
// • Charges ONLY external carrier/provider costs that GOS incurs (WhatsApp/Meta, SMS, email…).
// • Uses the Communication Wallet (`communicationWallets/{uid}`), which is independent from plan
//   credits (`billingWallets`). OpenAI / AI generation never creates an entry here.
// • Every charge stores `provider_cost` (what GOS pays) separately from `customer_charge`
//   (what the wallet is debited) plus `margin`.
// • Two phases: reserveCharge (hold before the provider call) → confirmCharge (carrier accepted)
//   or releaseCharge (carrier failed / not billable). A confirmed charge that later fails is
//   reversed with an offsetting entry. All functions are idempotent and run inside a Firestore
//   transaction (`tx`): every read happens before any write.
import { createHash } from 'node:crypto';
import { CHANNEL_IDS, COMMUNICATION_CHANNELS, PLATFORM, isLive, newCommunicationWallet, round4 } from './billing-engine.js';
import { agencyBillingOwnerId, isAgencyBillingOwner } from './agency-billing.js';

/**
 * Fallback rate card (EUR, per message). Placeholders only: the Super Admin should override them in
 * `communicationRates/{key}` with the real provider costs. Keys resolve from most to least specific:
 *   {provider}_{channel}_{category}_{country} → {provider}_{channel}_{category} → {channel}_{category}_{country}
 *   → {channel}_{category} → {channel}
 */
export const DEFAULT_COMMUNICATION_RATES = Object.freeze({
  whatsapp_marketing: { provider_cost: 0.0509, customer_charge: 0.07, currency: 'EUR' },
  whatsapp_utility: { provider_cost: 0.0200, customer_charge: 0.03, currency: 'EUR' },
  whatsapp_authentication: { provider_cost: 0.0200, customer_charge: 0.03, currency: 'EUR' },
  whatsapp_service: { provider_cost: 0, customer_charge: 0, currency: 'EUR' },
  whatsapp: { provider_cost: 0, customer_charge: 0, currency: 'EUR' },
  sms: { provider_cost: 0.0500, customer_charge: 0.08, currency: 'EUR' },
  email: { provider_cost: 0.0010, customer_charge: 0.002, currency: 'EUR' },
  instagram: { provider_cost: 0, customer_charge: 0, currency: 'EUR' },
  messenger: { provider_cost: 0, customer_charge: 0, currency: 'EUR' },
  webchat: { provider_cost: 0, customer_charge: 0, currency: 'EUR' },
});

export class ChargeError extends Error {
  constructor(code, message) { super(message); this.name = 'ChargeError'; this.code = code; }
}
const fail = (code, message) => { throw new ChargeError(code, message); };
const sha = value => createHash('sha256').update(String(value)).digest('hex');

export const chargeEntryId = (provider, businessId, messageId) => `comm_${sha(`${provider}:${businessId}:${messageId}`).slice(0, 32)}`;
export const eventIndexId = (provider, providerEventId) => sha(`${provider}:${providerEventId}`).slice(0, 40);
const providerOfAccount = account => account?.role === 'USER' ? (account.supportParentId || '') : PLATFORM;

export function rateKeys({ provider, channel, category, country }) {
  const base = category ? `${channel}_${category}` : channel;
  return [...new Set([
    country && `${provider}_${base}_${country}`, `${provider}_${base}`,
    country && `${base}_${country}`, base, channel,
  ].filter(Boolean))];
}

/** Server-side price lookup. The frontend never sees or computes provider pricing. */
export async function resolveRate(tx, db, params) {
  const keys = rateKeys(params);
  const snaps = await Promise.all(keys.map(key => tx.get(db.doc(`communicationRates/${key}`))));
  for (let i = 0; i < keys.length; i++) {
    const data = snaps[i].exists ? snaps[i].data() : null;
    if (data && data.active !== false) return { key: keys[i], source: 'configured', provider_cost: Number(data.provider_cost) || 0, customer_charge: Number(data.customer_charge) || 0, currency: data.currency || 'EUR' };
  }
  for (const key of keys) if (DEFAULT_COMMUNICATION_RATES[key]) return { key, source: 'default', ...DEFAULT_COMMUNICATION_RATES[key] };
  return fail('failed-precondition', `No communication rate is configured for ${params.channel}.`);
}

export function priceUsage(rate, quantity = 1) {
  const provider_cost = round4(rate.provider_cost * quantity);
  const customer_charge = round4(rate.customer_charge * quantity);
  return { quantity, unit_cost: round4(rate.provider_cost), provider_cost, customer_charge, margin: round4(customer_charge - provider_cost), currency: rate.currency, rate_key: rate.key };
}

/**
 * Phase 1 — hold the customer charge before calling the provider.
 * Returns `{ ok: false, code, reason }` (without writing) when the send must be blocked.
 */
export async function reserveCharge(tx, db, input, now = new Date().toISOString()) {
  const { businessId, messageId, channel, provider, providerAccountId = null, category = null, country = null, quantity = 1, messagePath = null, description = '' } = input;
  if (!COMMUNICATION_CHANNELS.includes(channel)) fail('invalid-argument', 'AI and non-communication usage never consume communication credits.');
  if (!businessId || !messageId || !provider) fail('invalid-argument', 'A business, message and provider are required to reserve a charge.');
  const entryId = chargeEntryId(provider, businessId, messageId);
  const entryRef = db.doc(`communicationLedger/${entryId}`);
  const existing = await tx.get(entryRef);
  if (existing.exists) {
    const entry = existing.data();
    return { ok: ['pending', 'confirmed'].includes(entry.status), duplicate: true, entryId, entry, code: entry.status, reason: 'This send was already charged.' };
  }
  const tenant = (await tx.get(db.doc(`tenants/${businessId}`))).data();
  const subscriberId = tenant?.accountType === 'agency'
    ? tenant.ownerId
    : input.subscriberId || tenant?.ownerId || tenant?.ownerUid;
  if (!subscriberId) return { ok: false, entryId, code: 'no-billing-owner', reason: 'This workspace has no billing owner.' };
  const subscriber = (await tx.get(db.doc(`users/${subscriberId}`))).data();
  const agency = tenant?.accountType === 'agency' || subscriber?.accountType === 'agency';
  const walletId = agency ? agencyBillingOwnerId(subscriber) : subscriberId;
  const account = agency && walletId ? (await tx.get(db.doc(`users/${walletId}`))).data() : subscriber;
  if (!walletId || agency && (!isAgencyBillingOwner(account) || subscriber?.status !== 'Active')) {
    return { ok: false, entryId, code: 'no-billing-owner', reason: 'The Agency user billing owner is unavailable.' };
  }
  const walletRef = db.doc(`communicationWallets/${walletId}`);
  const [subSnap, walletSnap] = await Promise.all([tx.get(db.doc(`billingSubscriptions/${walletId}`)), tx.get(walletRef)]);
  const sub = subSnap.exists ? subSnap.data() : null;
  // Entitlement gate (plan) comes first — a plan problem is not a balance problem.
  if (!isLive(sub, now) && !(agency && account.role === 'SUPER_ADMIN' && !sub)) return { ok: false, entryId, code: 'subscription-inactive', reason: 'No active subscription. Renew to send messages.' };
  if (CHANNEL_IDS.includes(channel) && sub?.plan?.channels?.length && !sub.plan.channels.includes(channel)) return { ok: false, entryId, code: 'channel-not-entitled', reason: `Your plan does not include the ${channel} channel.` };
  const rate = await resolveRate(tx, db, { provider, channel, category, country });
  const wallet = walletSnap.exists ? walletSnap.data() : newCommunicationWallet(walletId, account?.role ?? 'USER', providerOfAccount(account), now);
  if (rate.currency !== wallet.currency) fail('failed-precondition', `The ${channel} rate is priced in ${rate.currency} but the wallet uses ${wallet.currency}.`);
  const price = priceUsage(rate, quantity);
  const available = round4(wallet.balance - (wallet.held ?? 0));
  if (price.customer_charge > available) return { ok: false, entryId, code: 'insufficient-credits', reason: `Not enough communication credits: ${price.customer_charge} ${wallet.currency} required, ${available} available. Top up your wallet to continue.` };
  // ── writes ──
  wallet.held = round4((wallet.held ?? 0) + price.customer_charge);
  wallet.lowBalance = round4(wallet.balance - wallet.held) < (wallet.lowBalanceThreshold ?? 0);
  wallet.updatedAt = now;
  tx.set(walletRef, wallet);
  tx.set(entryRef, {
    id: entryId, wallet_id: walletId, subscriber_id: subscriberId, tenant_id: wallet.providerId, business_id: businessId,
    channel, provider, provider_account_id: providerAccountId, provider_event_id: null, message_id: messageId, message_path: messagePath,
    usage_type: category ? `${channel}_${category}` : channel, category, recipient_country: country,
    ...price, status: 'pending', amount: -price.customer_charge, balance_after: null,
    description: description || `${channel} message`, actor_id: 'system', created_at: now, updated_at: now,
  });
  return { ok: true, entryId, customer_charge: price.customer_charge, currency: wallet.currency, subscriberId, tenantId: wallet.providerId };
}

/** Link the provider's message ID (e.g. WhatsApp wamid) so status webhooks can find the charge. */
export async function attachProviderEvent(tx, db, { entryId, provider, providerEventId, messagePath = null }, now = new Date().toISOString()) {
  const entryRef = db.doc(`communicationLedger/${entryId}`);
  const entry = (await tx.get(entryRef)).data();
  if (!entry) return { ok: false };
  tx.set(entryRef, { ...entry, provider_event_id: providerEventId, updated_at: now });
  tx.set(db.doc(`communicationEventIndex/${eventIndexId(provider, providerEventId)}`), { entry_id: entryId, provider, provider_event_id: providerEventId, message_path: messagePath ?? entry.message_path ?? null, created_at: now });
  return { ok: true };
}

/** Look up the ledger entry (and message path) for a provider event. Read-only. */
export async function findChargeByEvent(tx, db, provider, providerEventId) {
  const snap = await tx.get(db.doc(`communicationEventIndex/${eventIndexId(provider, providerEventId)}`));
  return snap.exists ? snap.data() : null;
}

async function settle(tx, db, { entryId, outcome, pricing = null, reason = '' }, now) {
  const entryRef = db.doc(`communicationLedger/${entryId}`);
  const entrySnap = await tx.get(entryRef);
  if (!entrySnap.exists) return { ok: false, code: 'not-found' };
  const entry = entrySnap.data();
  const walletRef = db.doc(`communicationWallets/${entry.wallet_id}`);
  const walletSnap = await tx.get(walletRef);
  if (!walletSnap.exists) return { ok: false, code: 'wallet-missing' };
  const wallet = walletSnap.data();
  const notBillable = pricing && pricing.billable === false;

  if (outcome === 'confirm' && !notBillable) {
    if (entry.status !== 'pending') return { ok: true, duplicate: true, status: entry.status };
    let price = { provider_cost: entry.provider_cost, customer_charge: entry.customer_charge, margin: entry.margin, unit_cost: entry.unit_cost, rate_key: entry.rate_key };
    const category = pricing?.category ? String(pricing.category).toLowerCase() : null;
    if (category && category !== entry.category) {
      const rate = await resolveRate(tx, db, { provider: entry.provider, channel: entry.channel, category, country: entry.recipient_country });
      if (rate.currency === wallet.currency) price = priceUsage(rate, entry.quantity);
    }
    wallet.held = Math.max(0, round4((wallet.held ?? 0) - entry.customer_charge));
    wallet.balance = round4(wallet.balance - price.customer_charge);
    wallet.lifetimeSpent = round4((wallet.lifetimeSpent ?? 0) + price.customer_charge);
    wallet.lowBalance = round4(wallet.balance - wallet.held) < (wallet.lowBalanceThreshold ?? 0);
    wallet.updatedAt = now;
    tx.set(walletRef, wallet);
    tx.set(entryRef, {
      ...entry, ...price, category: category ?? entry.category, usage_type: category ? `${entry.channel}_${category}` : entry.usage_type,
      amount: -price.customer_charge, status: 'confirmed', balance_after: wallet.balance,
      provider_pricing: pricing ?? null, confirmed_at: now, updated_at: now,
    });
    return { ok: true, status: 'confirmed', balance: wallet.balance };
  }

  // fail / not billable
  if (entry.status === 'pending') {
    wallet.held = Math.max(0, round4((wallet.held ?? 0) - entry.customer_charge));
    wallet.lowBalance = round4(wallet.balance - wallet.held) < (wallet.lowBalanceThreshold ?? 0);
    wallet.updatedAt = now;
    tx.set(walletRef, wallet);
    tx.set(entryRef, { ...entry, status: 'failed', amount: 0, balance_after: wallet.balance, failure_reason: notBillable ? 'Provider marked the message as not billable.' : reason || 'Provider delivery failed.', provider_pricing: pricing ?? null, updated_at: now });
    return { ok: true, status: 'failed', balance: wallet.balance };
  }
  if (entry.status === 'confirmed' && outcome === 'fail') {
    wallet.balance = round4(wallet.balance + entry.customer_charge);
    wallet.lifetimeSpent = Math.max(0, round4((wallet.lifetimeSpent ?? 0) - entry.customer_charge));
    wallet.lowBalance = round4(wallet.balance - (wallet.held ?? 0)) < (wallet.lowBalanceThreshold ?? 0);
    wallet.updatedAt = now;
    tx.set(walletRef, wallet);
    tx.set(entryRef, { ...entry, status: 'reversed', reversed_at: now, updated_at: now });
    tx.set(db.doc(`communicationLedger/${entryId}_rev`), {
      ...entry, id: `${entryId}_rev`, usage_type: 'refund_reversal', status: 'reversed', reversal_of: entryId,
      amount: entry.customer_charge, provider_cost: -entry.provider_cost, customer_charge: -entry.customer_charge, margin: -entry.margin,
      balance_after: wallet.balance, description: `Refund · ${reason || 'carrier reported delivery failure'}`, created_at: now, updated_at: now,
    });
    return { ok: true, status: 'reversed', balance: wallet.balance };
  }
  return { ok: true, duplicate: true, status: entry.status };
}

/** Phase 2a — carrier accepted the message (billable). Idempotent. */
export const confirmCharge = (tx, db, { entryId, pricing = null }, now = new Date().toISOString()) => settle(tx, db, { entryId, outcome: 'confirm', pricing }, now);
/** Phase 2b — carrier rejected / failed. Releases a hold, or reverses an already confirmed charge. Idempotent. */
export const releaseCharge = (tx, db, { entryId, reason = '', pricing = null }, now = new Date().toISOString()) => settle(tx, db, { entryId, outcome: 'fail', reason, pricing }, now);
