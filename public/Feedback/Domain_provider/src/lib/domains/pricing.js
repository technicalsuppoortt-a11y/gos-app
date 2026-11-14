import { FieldValue } from 'firebase-admin/firestore';
import {
  computeCustomerPrice,
  DEFAULT_MARKUP,
  DEFAULT_MARKUP_TYPE,
  DEFAULT_TLD_COSTS,
  roundMoney,
  SUGGESTED_TLDS
} from './constants';
import { NamecheapService } from './namecheap';

const COLLECTION = 'domain_pricing';

let cachedSettings = null;
let settingsCacheTime = 0;
let cachedPricingList = null;
let pricingCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

export function invalidatePricingCache() {
  cachedSettings = null;
  settingsCacheTime = 0;
  cachedPricingList = null;
  pricingCacheTime = 0;
}

export function toPublicPricing(row) {
  if (!row || row.enabled === false) return null;
  return {
    extension: row.extension,
    registration_price: roundMoney(row.registration_price),
    renewal_price: roundMoney(row.renewal_price),
    transfer_price: roundMoney(row.transfer_price),
    enabled: true,
    currency: row.currency || 'USD'
  };
}

export function toAdminPricing(row) {
  const registrar = roundMoney(row.registrar_price);
  const registration = roundMoney(row.registration_price);
  return {
    id: row.id || row.extension,
    extension: row.extension,
    registrar_price: registrar,
    registration_price: registration,
    renewal_price: roundMoney(row.renewal_price),
    transfer_price: roundMoney(row.transfer_price),
    markup: Number(row.markup) != null && !isNaN(Number(row.markup)) ? Number(row.markup) : DEFAULT_MARKUP,
    markup_type: row.markup_type || DEFAULT_MARKUP_TYPE,
    enabled: row.enabled !== false,
    currency: row.currency || 'USD',
    profit: roundMoney(registration - registrar),
    profit_margin_pct: registrar > 0 ? roundMoney(((registration - registrar) / registration) * 100) : 0,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function buildRow(tld, costs, settings = {}) {
  const markup = settings.markup != null ? Number(settings.markup) : DEFAULT_MARKUP;
  const markupType = settings.markup_type || DEFAULT_MARKUP_TYPE;
  const registrar = roundMoney(costs.registrar_price);
  const renewalCost = roundMoney(costs.renewal_cost ?? costs.registrar_price);
  const transferCost = roundMoney(costs.transfer_cost ?? costs.registrar_price);
  return {
    extension: tld,
    registrar_price: registrar,
    renewal_cost: renewalCost,
    transfer_cost: transferCost,
    markup,
    markup_type: markupType,
    registration_price: computeCustomerPrice(registrar, markup, markupType),
    renewal_price: computeCustomerPrice(renewalCost, markup, markupType),
    transfer_price: computeCustomerPrice(transferCost, markup, markupType),
    enabled: true,
    currency: 'USD',
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  };
}

export async function getSettings(adminDb, { force = false } = {}) {
  const now = Date.now();
  if (!force && cachedSettings && now - settingsCacheTime < CACHE_TTL_MS) {
    return cachedSettings;
  }
  const snap = await adminDb.collection('domain_settings').doc('global').get();
  const data = snap.exists ? snap.data() : {};
  const res = {
    markup: data.markup != null ? Number(data.markup) : DEFAULT_MARKUP,
    markup_type: data.markup_type || DEFAULT_MARKUP_TYPE,
    suggested_tlds: Array.isArray(data.suggested_tlds) && data.suggested_tlds.length
      ? data.suggested_tlds
      : SUGGESTED_TLDS,
    currency: data.currency || 'USD',
    whois_guard: data.whois_guard !== false
  };
  cachedSettings = res;
  settingsCacheTime = now;
  return res;
}

export async function ensureDefaultPricing(adminDb) {
  const existing = await adminDb.collection(COLLECTION).limit(1).get();
  if (!existing.empty) return;

  const settings = await getSettings(adminDb);
  const batch = adminDb.batch();
  Object.entries(DEFAULT_TLD_COSTS).forEach(([tld, costs]) => {
    const ref = adminDb.collection(COLLECTION).doc(tld);
    batch.set(ref, buildRow(tld, costs, settings));
  });
  await batch.commit();
  invalidatePricingCache();
}

export async function listPricing(adminDb, { enabledOnly = false, force = false } = {}) {
  const now = Date.now();
  if (!force && cachedPricingList && now - pricingCacheTime < CACHE_TTL_MS) {
    let rows = [...cachedPricingList];
    if (enabledOnly) rows = rows.filter((r) => r.enabled !== false);
    return rows;
  }

  await ensureDefaultPricing(adminDb);
  const snap = await adminDb.collection(COLLECTION).get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => String(a.extension).localeCompare(String(b.extension)));
  
  cachedPricingList = rows;
  pricingCacheTime = now;

  if (enabledOnly) rows = rows.filter((r) => r.enabled !== false);
  return rows;
}

export async function getPricingMap(adminDb) {
  const list = await listPricing(adminDb);
  const map = new Map();
  for (const item of list) {
    map.set(item.extension.toLowerCase(), item);
  }
  return map;
}

export async function getPricingForTld(adminDb, tld) {
  const ext = String(tld || '').toLowerCase();
  if (!ext) return null;
  const map = await getPricingMap(adminDb);
  if (map.has(ext)) return map.get(ext);

  const fallback = DEFAULT_TLD_COSTS[ext];
  if (!fallback) return null;
  const settings = await getSettings(adminDb);
  return buildRow(ext, fallback, settings);
}

export async function upsertPricing(adminDb, extension, patch = {}) {
  const ext = String(extension || '').replace(/^\./, '').toLowerCase();
  if (!ext) throw new Error('Extension is required');
  const ref = adminDb.collection(COLLECTION).doc(ext);
  const prevSnap = await ref.get();
  const prev = prevSnap.exists ? prevSnap.data() : {};
  const settings = await getSettings(adminDb);

  const markup = patch.markup != null ? Number(patch.markup) : (prev.markup ?? settings.markup);
  const markupType = patch.markup_type || prev.markup_type || settings.markup_type;
  const registrar = patch.registrar_price != null ? Number(patch.registrar_price) : Number(prev.registrar_price) || 0;
  const renewalCost = patch.renewal_cost != null ? Number(patch.renewal_cost) : Number(prev.renewal_cost ?? registrar);
  const transferCost = patch.transfer_cost != null ? Number(patch.transfer_cost) : Number(prev.transfer_cost ?? registrar);

  const registrationPrice = patch.registration_price != null
    ? roundMoney(patch.registration_price)
    : computeCustomerPrice(registrar, markup, markupType, prev.registration_price && patch.markup == null && patch.markup_type == null ? prev.registration_price : undefined);
  const renewalPrice = patch.renewal_price != null
    ? roundMoney(patch.renewal_price)
    : computeCustomerPrice(renewalCost, markup, markupType, prev.renewal_price && patch.markup == null ? prev.renewal_price : undefined);
  const transferPrice = patch.transfer_price != null
    ? roundMoney(patch.transfer_price)
    : computeCustomerPrice(transferCost, markup, markupType, prev.transfer_price && patch.markup == null ? prev.transfer_price : undefined);

  const next = {
    extension: ext,
    registrar_price: roundMoney(registrar),
    renewal_cost: roundMoney(renewalCost),
    transfer_cost: roundMoney(transferCost),
    markup: Number.isFinite(Number(markup)) ? Number(markup) : DEFAULT_MARKUP,
    markup_type: markupType || DEFAULT_MARKUP_TYPE,
    registration_price: registrationPrice,
    renewal_price: renewalPrice,
    transfer_price: transferPrice,
    enabled: patch.enabled != null ? Boolean(patch.enabled) : (prev.enabled !== false),
    currency: patch.currency || prev.currency || 'USD',
    updated_at: FieldValue.serverTimestamp()
  };
  if (!prevSnap.exists) next.created_at = FieldValue.serverTimestamp();
  await ref.set(next, { merge: true });
  invalidatePricingCache();
  const saved = await ref.get();
  return { id: saved.id, ...saved.data() };
}

export async function applyBulkMarkup(adminDb, { markup, markup_type }) {
  const m = Number(markup);
  const mark = Number.isFinite(m) ? m : DEFAULT_MARKUP;
  const type = markup_type === 'percent' ? 'percent' : 'fixed';

  // Update global settings
  await adminDb.collection('domain_settings').doc('global').set({
    markup: mark,
    markup_type: type,
    updated_at: FieldValue.serverTimestamp()
  }, { merge: true });

  const rows = await listPricing(adminDb, { force: true });
  const batch = adminDb.batch();

  for (const row of rows) {
    const registrar = Number(row.registrar_price) || 0;
    const renewalCost = Number(row.renewal_cost ?? registrar) || 0;
    const transferCost = Number(row.transfer_cost ?? registrar) || 0;
    const ref = adminDb.collection(COLLECTION).doc(row.extension);

    batch.set(ref, {
      markup: mark,
      markup_type: type,
      registration_price: computeCustomerPrice(registrar, mark, type),
      renewal_price: computeCustomerPrice(renewalCost, mark, type),
      transfer_price: computeCustomerPrice(transferCost, mark, type),
      updated_at: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
  invalidatePricingCache();
  return await listPricing(adminDb, { force: true });
}

export async function refreshRegistrarCosts(adminDb) {
  if (!NamecheapService.isConfigured()) {
    throw new Error('Namecheap is not configured');
  }
  const rows = await listPricing(adminDb, { force: true });
  const tlds = rows.map((r) => r.extension);
  const remote = await NamecheapService.getDomainPricing(tlds);
  const byTld = Object.fromEntries(remote.map((r) => [r.tld, r]));
  const updated = [];
  for (const row of rows) {
    const hit = byTld[row.extension];
    if (!hit) continue;
    const regCost = hit.register || row.registrar_price;
    const renewCost = hit.renew || row.renewal_cost;
    const transCost = hit.transfer || row.transfer_cost;
    const saved = await upsertPricing(adminDb, row.extension, {
      registrar_price: regCost,
      renewal_cost: renewCost,
      transfer_cost: transCost,
      registration_price: computeCustomerPrice(regCost, row.markup, row.markup_type),
      renewal_price: computeCustomerPrice(renewCost, row.markup, row.markup_type),
      transfer_price: computeCustomerPrice(transCost, row.markup, row.markup_type),
      markup: row.markup,
      markup_type: row.markup_type,
      enabled: row.enabled
    });
    updated.push(saved);
  }
  invalidatePricingCache();
  return updated;
}

export function customerPriceFor(row, kind = 'registration', premiumPrice) {
  if (premiumPrice && Number(premiumPrice) > 0) {
    return computeCustomerPrice(premiumPrice, row?.markup, row?.markup_type);
  }
  if (kind === 'renewal') return roundMoney(row?.renewal_price);
  if (kind === 'transfer') return roundMoney(row?.transfer_price);
  return roundMoney(row?.registration_price);
}

export function registrarCostFor(row, kind = 'registration', premiumPrice) {
  if (premiumPrice && Number(premiumPrice) > 0) return roundMoney(premiumPrice);
  if (kind === 'renewal') return roundMoney(row?.renewal_cost ?? row?.registrar_price);
  if (kind === 'transfer') return roundMoney(row?.transfer_cost ?? row?.registrar_price);
  return roundMoney(row?.registrar_price);
}

