import {
  DEFAULT_MARKUP,
  DEFAULT_MARKUP_TYPE,
  DEFAULT_TLD_COSTS,
  SUGGESTED_TLDS,
  computeCustomerPrice,
  roundMoney,
  serializeTs,
} from './constants.js';
import { NamecheapService } from './namecheap.js';

const PRICING_COL = 'domain_pricing';
const SETTINGS_DOC = 'domain_settings/global';
const CACHE_TTL_MS = 30 * 1000;

let cachedSettings = null;
let cachedSettingsAt = 0;
let cachedPricingList = null;
let cachedPricingAt = 0;

export function invalidatePricingCache() {
  cachedSettings = null;
  cachedSettingsAt = 0;
  cachedPricingList = null;
  cachedPricingAt = 0;
}

export function toPublicPricing(row) {
  if (!row || row.enabled === false) return null;
  return {
    extension: row.extension,
    registration_price: roundMoney(row.registration_price),
    renewal_price: roundMoney(row.renewal_price),
    transfer_price: roundMoney(row.transfer_price),
    enabled: true,
    currency: row.currency || 'USD',
  };
}

export function toAdminPricing(row) {
  const registrar = roundMoney(row.registrar_price);
  const registration = roundMoney(row.registration_price);
  const profit = roundMoney(registration - registrar);
  return {
    id: row.id || row.extension,
    extension: row.extension,
    registrar_price: registrar,
    renewal_cost: roundMoney(row.renewal_cost ?? registrar),
    transfer_cost: roundMoney(row.transfer_cost ?? registrar),
    registration_price: registration,
    renewal_price: roundMoney(row.renewal_price),
    transfer_price: roundMoney(row.transfer_price),
    markup: roundMoney(row.markup ?? DEFAULT_MARKUP),
    markup_type: row.markup_type || DEFAULT_MARKUP_TYPE,
    enabled: row.enabled !== false,
    currency: row.currency || 'USD',
    profit,
    profit_margin_pct: registration > 0 ? roundMoney((profit / registration) * 100) : 0,
    created_at: serializeTs(row.created_at),
    updated_at: serializeTs(row.updated_at),
  };
}

export async function getSettings(adminDb, { force = false } = {}) {
  if (!force && cachedSettings && Date.now() - cachedSettingsAt < CACHE_TTL_MS) {
    return cachedSettings;
  }
  const snap = await adminDb.doc(SETTINGS_DOC).get();
  const data = snap.exists ? snap.data() : {};
  cachedSettings = {
    markup: Number.isFinite(Number(data?.markup)) ? Number(data.markup) : DEFAULT_MARKUP,
    markup_type: data?.markup_type === 'percent' ? 'percent' : DEFAULT_MARKUP_TYPE,
    suggested_tlds: Array.isArray(data?.suggested_tlds) && data.suggested_tlds.length
      ? data.suggested_tlds
      : SUGGESTED_TLDS,
    currency: data?.currency || 'USD',
    whois_guard: data?.whois_guard !== false,
  };
  cachedSettingsAt = Date.now();
  return cachedSettings;
}

function buildRow(tld, costs, settings) {
  const ext = tld.toLowerCase();
  const markup = settings.markup;
  const markupType = settings.markup_type;
  const regCost = roundMoney(costs.registrar_price);
  const renewCost = roundMoney(costs.renewal_cost ?? regCost);
  const transferCost = roundMoney(costs.transfer_cost ?? regCost);
  const now = new Date().toISOString();
  return {
    extension: ext,
    registrar_price: regCost,
    renewal_cost: renewCost,
    transfer_cost: transferCost,
    markup,
    markup_type: markupType,
    registration_price: computeCustomerPrice(regCost, markup, markupType),
    renewal_price: computeCustomerPrice(renewCost, markup, markupType),
    transfer_price: computeCustomerPrice(transferCost, markup, markupType),
    enabled: true,
    currency: 'USD',
    created_at: now,
    updated_at: now,
  };
}

export async function ensureDefaultPricing(adminDb) {
  const existing = await adminDb.collection(PRICING_COL).get();
  if (!existing.empty) return;
  const settings = await getSettings(adminDb);
  const batch = adminDb.batch();
  for (const [tld, costs] of Object.entries(DEFAULT_TLD_COSTS)) {
    const ref = adminDb.collection(PRICING_COL).doc(tld);
    batch.set(ref, buildRow(tld, costs, settings));
  }
  await batch.commit();
  invalidatePricingCache();
}

export async function listPricing(adminDb, { enabledOnly = false, force = false } = {}) {
  await ensureDefaultPricing(adminDb);
  if (!force && cachedPricingList && Date.now() - cachedPricingAt < CACHE_TTL_MS) {
    return enabledOnly ? cachedPricingList.filter(r => r.enabled !== false) : cachedPricingList;
  }
  const snap = await adminDb.collection(PRICING_COL).get();
  const rows = [];
  snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => String(a.extension).localeCompare(String(b.extension)));
  cachedPricingList = rows;
  cachedPricingAt = Date.now();
  return enabledOnly ? rows.filter(r => r.enabled !== false) : rows;
}

export async function getPricingMap(adminDb) {
  const list = await listPricing(adminDb);
  const map = new Map();
  for (const row of list) map.set(String(row.extension).toLowerCase(), row);
  return map;
}

export async function getPricingForTld(adminDb, tld) {
  const ext = String(tld || '').replace(/^\./, '').toLowerCase();
  if (!ext) return null;
  const map = await getPricingMap(adminDb);
  if (map.has(ext)) return map.get(ext);

  const fallback = DEFAULT_TLD_COSTS[ext];
  if (!fallback) return null;
  const settings = await getSettings(adminDb);
  return buildRow(ext, fallback, settings);
}

export async function upsertPricing(adminDb, extension, patch = {}) {
  const ext = String(extension || '').replace(/^\./, '').toLowerCase().trim();
  if (!ext || !/^[a-z0-9.-]{1,32}$/.test(ext)) throw new Error('Valid extension is required');
  const ref = adminDb.collection(PRICING_COL).doc(ext);
  const snap = await ref.get();
  const prev = snap.exists ? snap.data() : {};
  const settings = await getSettings(adminDb);

  const registrar = patch.registrar_price != null
    ? roundMoney(patch.registrar_price)
    : roundMoney(prev.registrar_price ?? DEFAULT_TLD_COSTS[ext]?.registrar_price ?? 12);
  const renewalCost = patch.renewal_cost != null
    ? roundMoney(patch.renewal_cost)
    : roundMoney(prev.renewal_cost ?? registrar);
  const transferCost = patch.transfer_cost != null
    ? roundMoney(patch.transfer_cost)
    : roundMoney(prev.transfer_cost ?? registrar);
  const markup = patch.markup != null
    ? roundMoney(patch.markup)
    : roundMoney(prev.markup ?? settings.markup);
  const markupType = patch.markup_type || prev.markup_type || settings.markup_type;

  const registrationPrice = patch.registration_price != null
    ? roundMoney(patch.registration_price)
    : computeCustomerPrice(registrar, markup, markupType, patch.markup == null && patch.markup_type == null ? prev.registration_price : undefined);
  const renewalPrice = patch.renewal_price != null
    ? roundMoney(patch.renewal_price)
    : computeCustomerPrice(renewalCost, markup, markupType, patch.markup == null && patch.markup_type == null ? prev.renewal_price : undefined);
  const transferPrice = patch.transfer_price != null
    ? roundMoney(patch.transfer_price)
    : computeCustomerPrice(transferCost, markup, markupType, patch.markup == null && patch.markup_type == null ? prev.transfer_price : undefined);

  const now = new Date().toISOString();
  const next = {
    extension: ext,
    registrar_price: registrar,
    renewal_cost: renewalCost,
    transfer_cost: transferCost,
    markup,
    markup_type: markupType,
    registration_price: registrationPrice,
    renewal_price: renewalPrice,
    transfer_price: transferPrice,
    enabled: patch.enabled != null ? Boolean(patch.enabled) : prev.enabled !== false,
    currency: 'USD',
    updated_at: now,
    ...(snap.exists ? {} : { created_at: now }),
  };

  await ref.set(next, { merge: true });
  invalidatePricingCache();
  const fresh = await ref.get();
  return { id: fresh.id, ...fresh.data() };
}

export async function deletePricing(adminDb, extension) {
  const ext = String(extension || '').replace(/^\./, '').toLowerCase().trim();
  if (!ext) throw new Error('Extension is required');
  await adminDb.collection(PRICING_COL).doc(ext).delete();
  invalidatePricingCache();
  return { deleted: ext };
}

export async function applyBulkMarkup(adminDb, { markup, markup_type }) {
  const mark = roundMoney(markup);
  const type = markup_type === 'percent' ? 'percent' : 'fixed';
  const now = new Date().toISOString();
  await adminDb.doc(SETTINGS_DOC).set(
    { markup: mark, markup_type: type, updated_at: now },
    { merge: true }
  );
  const snap = await adminDb.collection(PRICING_COL).get();
  const batch = adminDb.batch();
  snap.forEach(doc => {
    const d = doc.data();
    const reg = roundMoney(d.registrar_price);
    const ren = roundMoney(d.renewal_cost ?? reg);
    const trn = roundMoney(d.transfer_cost ?? reg);
    batch.set(doc.ref, {
      ...d,
      markup: mark,
      markup_type: type,
      registration_price: computeCustomerPrice(reg, mark, type),
      renewal_price: computeCustomerPrice(ren, mark, type),
      transfer_price: computeCustomerPrice(trn, mark, type),
      updated_at: now,
    }, { merge: true });
  });
  await batch.commit();
  invalidatePricingCache();
  return listPricing(adminDb, { force: true });
}

export async function refreshRegistrarCosts(adminDb, { fetcher = fetch } = {}) {
  const current = await listPricing(adminDb, { force: true });
  const tlds = current.map(r => r.extension);
  const live = await NamecheapService.getDomainPricing(tlds, { db: adminDb, fetcher });
  const byTld = new Map(live.map(item => [item.tld, item]));

  for (const row of current) {
    const got = byTld.get(row.extension);
    if (!got) continue;
    await upsertPricing(adminDb, row.extension, {
      registrar_price: got.register ?? row.registrar_price,
      renewal_cost: got.renew ?? row.renewal_cost ?? row.registrar_price,
      transfer_cost: got.transfer ?? row.transfer_cost ?? row.registrar_price,
      markup: row.markup,
      markup_type: row.markup_type,
    });
  }
  invalidatePricingCache();
  return listPricing(adminDb, { force: true });
}

export function customerPriceFor(row, kind = 'registration', premiumPrice) {
  if (premiumPrice && Number(premiumPrice) > 0) {
    return computeCustomerPrice(premiumPrice, row?.markup, row?.markup_type);
  }
  if (!row) return 0;
  if (kind === 'renewal') return roundMoney(row.renewal_price);
  if (kind === 'transfer') return roundMoney(row.transfer_price);
  return roundMoney(row.registration_price);
}

export function registrarCostFor(row, kind = 'registration', premiumPrice) {
  if (premiumPrice && Number(premiumPrice) > 0) return roundMoney(premiumPrice);
  if (!row) return 0;
  if (kind === 'renewal') return roundMoney(row.renewal_cost ?? row.registrar_price);
  if (kind === 'transfer') return roundMoney(row.transfer_cost ?? row.registrar_price);
  return roundMoney(row.registrar_price);
}
