import { HttpsError } from 'firebase-functions/v2/https';
import { readStripeCredentials, stripeOwner, toMinorUnits, fulfillCheckoutSession } from './stripe-gateway.js';
import {
  CONTACT_FIELD_KEYS,
  DOMAIN_ORDER_TYPES,
  SUGGESTED_TLDS,
  parseDomainInput,
  roundMoney,
  serializeTs,
} from './domains/constants.js';
import {
  NamecheapService,
  NamecheapError,
  getRegistrarConfigSummary,
  saveRegistrarConfig,
} from './domains/namecheap.js';
import {
  applyBulkMarkup,
  customerPriceFor,
  deletePricing,
  getPricingForTld,
  getPricingMap,
  getSettings,
  invalidatePricingCache,
  listPricing,
  refreshRegistrarCosts,
  registrarCostFor,
  toAdminPricing,
  toPublicPricing,
  upsertPricing,
} from './domains/pricing.js';
import { fulfillDomainOrder, validateContacts } from './domains/fulfillOrder.js';

const STRIPE_API = 'https://api.stripe.com/v1';
const CHECK_CACHE_TTL_MS = 45 * 1000;
const checkCache = new Map();

function normalizeRole(user) {
  return String(user?.role || '').toUpperCase();
}

export function isRootSuperAdmin(user) {
  const role = normalizeRole(user);
  if (role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN') return true;
  if (['PLATFORM_SUPPORT', 'PLATFORM_FINANCE'].includes(role) && Array.isArray(user?.allowedTabs)) {
    return user.allowedTabs.includes('domains');
  }
  return false;
}

export function isStrictSuperAdmin(user) {
  const role = normalizeRole(user);
  return role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN';
}

export function isWorkspaceAdmin(user) {
  const role = normalizeRole(user);
  return role === 'ADMIN' || isRootSuperAdmin(user);
}

function assertWorkspaceActor(user) {
  const role = normalizeRole(user);
  if (!user?.uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  if (role === 'CUSTOMER') {
    throw new HttpsError('permission-denied', 'Customer portal accounts cannot manage workspace domains.');
  }
  if (['PLATFORM_SUPPORT', 'PLATFORM_FINANCE'].includes(role) && !isRootSuperAdmin(user)) {
    throw new HttpsError('permission-denied', 'Your role does not have domain management permissions.');
  }
}

function resolveAdminOwnerId(user) {
  if (!user) return '';
  if (normalizeRole(user) === 'ADMIN') return user.uid;
  return String(user.supportParentId || user.billingOwnerId || '').trim();
}

function resolveWalletOwnerId(user) {
  if (!user) return '';
  if (user.accountType === 'agency' && user.billingOwnerId) return String(user.billingOwnerId);
  return String(user.uid);
}

async function resolveDelegatedUserIds(db, adminUid, adminProfile = {}) {
  const ids = new Set([adminUid]);
  if (adminProfile.defaultAgencyUserId) ids.add(String(adminProfile.defaultAgencyUserId));
  if (adminProfile.tenantId) ids.add(String(adminProfile.tenantId));

  const [bySupportParent, byBillingOwner] = await Promise.all([
    db.collection('users').where('supportParentId', '==', adminUid).get().catch(() => null),
    db.collection('users').where('billingOwnerId', '==', adminUid).get().catch(() => null),
  ]);
  bySupportParent?.forEach(doc => {
    ids.add(doc.id);
    const d = doc.data();
    if (d?.tenantId) ids.add(String(d.tenantId));
  });
  byBillingOwner?.forEach(doc => {
    ids.add(doc.id);
    const d = doc.data();
    if (d?.tenantId) ids.add(String(d.tenantId));
  });
  return ids;
}

function canManageDomainRecord(user, data, delegatedIds = null) {
  if (!data || !user?.uid) return false;
  if (isRootSuperAdmin(user)) return true;
  if (data.user_id === user.uid) return true;
  if (user.tenantId && data.tenant_id === user.tenantId) return true;
  if (normalizeRole(user) === 'ADMIN') {
    if (data.admin_id === user.uid) return true;
    if (user.defaultAgencyUserId && data.user_id === user.defaultAgencyUserId) return true;
    if (delegatedIds && (delegatedIds.has(data.user_id) || delegatedIds.has(data.tenant_id))) return true;
  }
  return false;
}

async function getOwnedDomainOrThrow(db, user, domainId) {
  const cleanId = String(domainId || '').trim();
  if (!cleanId) throw new HttpsError('invalid-argument', 'Domain ID is required.');
  const ref = db.collection('domains').doc(cleanId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Domain not found.');
  const data = snap.data();

  let delegatedIds = null;
  if (normalizeRole(user) === 'ADMIN' && data.user_id !== user.uid && data.admin_id !== user.uid) {
    delegatedIds = await resolveDelegatedUserIds(db, user.uid, user);
  }
  if (!canManageDomainRecord(user, data, delegatedIds)) {
    throw new HttpsError('permission-denied', 'You do not have permission to manage this domain.');
  }
  return { ref, id: snap.id, data };
}

function serializeDomainDoc(id, d, { includeOwner = false } = {}) {
  const base = {
    id,
    domain: d.domain,
    extension: d.extension,
    status: d.status || 'active',
    registrar: d.registrar || 'namecheap',
    registrar_domain_id: d.registrar_domain_id || '',
    registration_price: roundMoney(d.registration_price),
    renewal_price: roundMoney(d.renewal_price),
    registered_at: serializeTs(d.registered_at),
    expires_at: serializeTs(d.expires_at),
    auto_renew: d.auto_renew !== false,
    nameservers: Array.isArray(d.nameservers) ? d.nameservers : [],
    connected_funnel_id: d.connected_funnel_id || '',
    created_at: serializeTs(d.created_at),
    updated_at: serializeTs(d.updated_at),
  };
  if (includeOwner) {
    base.user_id = d.user_id || '';
    base.tenant_id = d.tenant_id || '';
    base.admin_id = d.admin_id || '';
    base.user_email = d.user_email || '';
    base.user_name = d.user_name || '';
  }
  return base;
}

function serializeOrderDoc(id, d, { includeWholesale = false, includeOwner = false } = {}) {
  const customer = roundMoney(d.customer_price);
  const registrarCost = roundMoney(d.registrar_cost_actual ?? d.registrar_cost);
  const base = {
    id,
    domain: d.domain,
    extension: d.extension,
    type: d.type || 'registration',
    years: Number(d.years) || 1,
    status: d.status || 'pending',
    customer_price: customer,
    renewal_price: roundMoney(d.renewal_price || customer),
    currency: d.currency || 'USD',
    payment_id: d.payment_id || '',
    payment_method: d.payment_method || (d.stripeSessionId ? 'stripe' : ''),
    stripeSessionId: d.stripeSessionId || '',
    domain_id: d.domain_id || '',
    error_public: d.error_public || '',
    created_at: serializeTs(d.created_at),
    completed_at: serializeTs(d.completed_at),
    updated_at: serializeTs(d.updated_at),
  };
  if (includeOwner) {
    base.user_id = d.user_id || '';
    base.tenant_id = d.tenant_id || '';
    base.admin_id = d.admin_id || '';
    base.user_email = d.user_email || '';
    base.user_name = d.user_name || '';
  }
  if (includeWholesale) {
    base.registrar_cost = registrarCost;
    base.profit = roundMoney(customer - registrarCost);
    base.error_internal = d.error_internal || '';
    base.error_code = d.error_code || '';
  }
  return base;
}

async function stripeRequest(fetcher, secretKey, path, { method = 'GET', form, idempotencyKey } = {}) {
  const res = await fetcher(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    ...(form ? { body: new URLSearchParams(form).toString() } : {}),
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  let payload = {};
  try {
    payload = await res.json();
  } catch {
    // ignore non-json
  }
  if (!res.ok) {
    throw new HttpsError(
      res.status === 401 ? 'permission-denied' : 'failed-precondition',
      payload?.error?.message || `Stripe request failed (${res.status}).`
    );
  }
  return payload;
}

export async function domainProviderRequest(request, { actor, db, fetcher = fetch }) {
  const user = await actor(request);
  const data = request.data ?? {};
  const operation = String(data.operation || '').trim();

  switch (operation) {
    // =========================================================================
    // PUBLIC / AUTHENTICATED WORKSPACE OPERATIONS (User, Admin, Superadmin)
    // =========================================================================
    case 'getPublicPricing': {
      assertWorkspaceActor(user);
      const [settings, rows] = await Promise.all([
        getSettings(db),
        listPricing(db, { enabledOnly: true }),
      ]);
      return {
        currency: settings.currency || 'USD',
        suggested_tlds: settings.suggested_tlds || SUGGESTED_TLDS,
        pricing: rows.map(toPublicPricing).filter(Boolean),
      };
    }

    case 'checkAvailability': {
      assertWorkspaceActor(user);
      const parsed = parseDomainInput(data.domain);
      if (!parsed) {
        throw new HttpsError('invalid-argument', 'Enter a valid domain name (e.g. mybrand.com).');
      }

      const settings = await getSettings(db);
      const tldSet = new Set([parsed.tld, ...(settings.suggested_tlds || SUGGESTED_TLDS)]);
      for (const extra of SUGGESTED_TLDS) tldSet.add(extra);
      const fqdns = Array.from(tldSet).map(t => `${parsed.sld}.${t}`);

      const registrarConfigured = await NamecheapService.isConfigured(db);
      const cacheKey = `${registrarConfigured ? 'reg' : 'dns'}:${fqdns.slice().sort().join(',')}`;
      let rawChecks = null;
      const hit = checkCache.get(cacheKey);
      if (hit && Date.now() - hit.at < CHECK_CACHE_TTL_MS) {
        rawChecks = hit.data;
      } else {
        try {
          rawChecks = await NamecheapService.checkDomainAvailability(fqdns, {
            db,
            fetcher,
            allowDnsFallback: true,
          });
          checkCache.set(cacheKey, { at: Date.now(), data: rawChecks });
        } catch (err) {
          const msg = err instanceof NamecheapError ? err.publicMessage : 'Domain check failed. Please try again.';
          throw new HttpsError('unavailable', msg);
        }
      }

      const pricingMap = await getPricingMap(db);
      const byDomain = new Map(rawChecks.map(r => [r.domain, r]));

      const results = fqdns.map(fqdn => {
        const ext = fqdn.split('.').slice(1).join('.');
        const check = byDomain.get(fqdn) || { domain: fqdn, available: false, isPremium: false };
        const pRow = pricingMap.get(ext);
        if (!pRow || pRow.enabled === false) {
          return {
            domain: fqdn,
            extension: ext,
            available: false,
            unsupported: true,
            status: 'unsupported',
          };
        }

        const regPrice = customerPriceFor(pRow, 'registration', check.isPremium ? check.premiumRegistrationPrice : null);
        const renewPrice = customerPriceFor(pRow, 'renewal', check.isPremium ? check.premiumRenewalPrice : null);
        const transferPrice = customerPriceFor(pRow, 'transfer', check.isPremium ? check.premiumTransferPrice : null);

        return {
          domain: fqdn,
          extension: ext,
          available: Boolean(check.available),
          isPremium: Boolean(check.isPremium),
          status: check.available ? 'available' : 'unavailable',
          registration_price: regPrice,
          renewal_price: renewPrice,
          transfer_price: transferPrice,
          currency: pRow.currency || 'USD',
          source: check.source || 'namecheap',
        };
      });

      // Put exact searched FQDN first, then available popular extensions
      results.sort((a, b) => {
        if (a.domain === parsed.fqdn) return -1;
        if (b.domain === parsed.fqdn) return 1;
        if (a.unsupported !== b.unsupported) return a.unsupported ? 1 : -1;
        return 0;
      });

      return {
        query: parsed.fqdn,
        sld: parsed.sld,
        registrarConfigured,
        results,
      };
    }

    case 'listMyDomains': {
      assertWorkspaceActor(user);
      const walletOwnerId = resolveWalletOwnerId(user);
      const [byUserSnap, byTenantSnap, ordersByUserSnap, walletSnap, stripeCheck] = await Promise.all([
        db.collection('domains').where('user_id', '==', user.uid).get(),
        user.tenantId && user.tenantId !== user.uid
          ? db.collection('domains').where('tenant_id', '==', user.tenantId).get()
          : Promise.resolve(null),
        db.collection('domain_orders').where('user_id', '==', user.uid).get(),
        walletOwnerId ? db.doc(`billingWallets/${walletOwnerId}`).get().catch(() => null) : Promise.resolve(null),
        readStripeCredentials(db, { scope: 'super_admin', ownerId: 'platform' }).catch(() => null),
      ]);

      const domainMap = new Map();
      byUserSnap.forEach(doc => domainMap.set(doc.id, serializeDomainDoc(doc.id, doc.data())));
      byTenantSnap?.forEach(doc => {
        if (!domainMap.has(doc.id)) domainMap.set(doc.id, serializeDomainDoc(doc.id, doc.data()));
      });
      const domains = Array.from(domainMap.values()).sort((a, b) =>
        String(a.domain || '').localeCompare(String(b.domain || ''))
      );

      const orders = [];
      ordersByUserSnap.forEach(doc => orders.push(serializeOrderDoc(doc.id, doc.data())));
      orders.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      let stripeAvailable = Boolean(stripeCheck?.secretKey);
      if (!stripeAvailable) {
        const adminOwner = resolveAdminOwnerId(user);
        if (adminOwner) {
          const adminStripe = await readStripeCredentials(db, { scope: 'admin', ownerId: adminOwner }).catch(() => null);
          stripeAvailable = Boolean(adminStripe?.secretKey);
        }
      }

      return {
        domains,
        orders,
        walletBalance: roundMoney(walletSnap?.data()?.balance ?? 0),
        stripeAvailable,
      };
    }

    case 'getDomainDetail': {
      assertWorkspaceActor(user);
      const owned = await getOwnedDomainOrThrow(db, user, data.domainId);
      let live = null;
      try {
        if (await NamecheapService.isConfigured(db)) {
          live = await NamecheapService.getDomainInfo(owned.data.domain, { db, fetcher });
        }
      } catch {
        // fallback to stored Firestore metadata
      }
      const merged = {
        ...owned.data,
        expires_at: live?.expiredDate || owned.data.expires_at,
        nameservers: live?.nameservers?.length ? live.nameservers : owned.data.nameservers,
      };
      return { domain: serializeDomainDoc(owned.id, merged) };
    }

    case 'getContact': {
      assertWorkspaceActor(user);
      const snap = await db.collection('domain_contacts').doc(user.uid).get();
      const stored = snap.exists ? snap.data() : {};
      const nameParts = String(user.name || '').trim().split(/\s+/).filter(Boolean);
      const out = {};
      for (const k of CONTACT_FIELD_KEYS) out[k] = stored[k] || '';
      if (!out.firstName && nameParts[0]) out.firstName = nameParts[0];
      if (!out.lastName && nameParts.length > 1) out.lastName = nameParts.slice(1).join(' ');
      if (!out.email) out.email = user.email || user.contactEmail || '';
      if (!out.country) out.country = 'US';
      return { contact: out };
    }

    case 'saveContact': {
      assertWorkspaceActor(user);
      const payload = data.contact && typeof data.contact === 'object' ? data.contact : data;
      const clean = {};
      for (const k of CONTACT_FIELD_KEYS) {
        clean[k] = String(payload[k] ?? '').trim().slice(0, 200);
      }
      clean.country = (clean.country || 'US').toUpperCase().slice(0, 2);
      const missing = validateContacts(clean);
      if (missing.length) {
        throw new HttpsError(
          'invalid-argument',
          `Missing required contact fields: ${missing.join(', ')}`,
          { missing }
        );
      }
      await db.collection('domain_contacts').doc(user.uid).set(
        {
          ...clean,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
      return { success: true, contact: clean };
    }

    case 'createOrder': {
      assertWorkspaceActor(user);
      const parsed = parseDomainInput(data.domain);
      if (!parsed) throw new HttpsError('invalid-argument', 'Invalid domain name.');

      const type = DOMAIN_ORDER_TYPES.includes(data.type) ? data.type : 'registration';
      const years = Math.max(1, Math.min(10, Number(data.years) || 1));

      const pricing = await getPricingForTld(db, parsed.tld);
      if (!pricing || pricing.enabled === false) {
        throw new HttpsError('invalid-argument', `.${parsed.tld} is not available for registration.`);
      }

      let premiumReg = null;
      if (type === 'registration') {
        const [avail] = await NamecheapService.checkDomainAvailability([parsed.fqdn], {
          db,
          fetcher,
          allowDnsFallback: true,
        });
        if (!avail || !avail.available) {
          throw new HttpsError('already-exists', 'This domain is no longer available.');
        }
        if (avail.isPremium && avail.premiumRegistrationPrice) {
          premiumReg = avail.premiumRegistrationPrice;
        }

        const ownedSnap = await db.collection('domains').where('domain', '==', parsed.fqdn).get();
        let alreadyActive = false;
        ownedSnap.forEach(doc => {
          if (doc.data()?.status !== 'expired') alreadyActive = true;
        });
        if (alreadyActive) {
          throw new HttpsError('already-exists', 'This domain is already registered.');
        }

        // Reuse existing open pending order for same user & domain
        const openSnap = await db.collection('domain_orders').where('user_id', '==', user.uid).get();
        let existingOrder = null;
        openSnap.forEach(doc => {
          const d = doc.data();
          if (d.domain === parsed.fqdn && d.type === 'registration' && d.status === 'pending' && Number(d.years) === years) {
            existingOrder = { id: doc.id, ...d };
          }
        });
        if (existingOrder) {
          return { order: serializeOrderDoc(existingOrder.id, existingOrder), existing: true };
        }

        const contactSnap = await db.collection('domain_contacts').doc(user.uid).get();
        const contact = { ...(contactSnap.exists ? contactSnap.data() : {}), ...(data.contact || {}) };
        const missing = validateContacts(contact);
        if (missing.length) {
          throw new HttpsError(
            'failed-precondition',
            'Add registrant contact details in Domain Settings before registering.',
            { code: 'missing_contact', missing }
          );
        }
      }

      const unitCustomer = customerPriceFor(pricing, type, premiumReg);
      const unitRegistrar = registrarCostFor(pricing, type, premiumReg);
      const customerPrice = roundMoney(unitCustomer * years);
      const registrarCost = roundMoney(unitRegistrar * years);
      const now = new Date().toISOString();

      const contactSnap = await db.collection('domain_contacts').doc(user.uid).get();
      const savedContact = contactSnap.exists ? contactSnap.data() : {};
      const mergedContact = { ...savedContact, ...(data.contact || {}) };

      const orderDoc = {
        user_id: user.uid,
        tenant_id: user.tenantId || user.uid,
        admin_id: resolveAdminOwnerId(user),
        user_email: user.email || user.contactEmail || mergedContact.email || '',
        user_name: user.name || `${mergedContact.firstName || ''} ${mergedContact.lastName || ''}`.trim(),
        domain: parsed.fqdn,
        extension: parsed.tld,
        type,
        years,
        registrar: 'namecheap',
        registrar_cost: registrarCost,
        customer_price: customerPrice,
        renewal_price: customerPriceFor(pricing, 'renewal'),
        currency: pricing.currency || 'USD',
        status: 'pending',
        payment_id: '',
        domain_id: data.domain_id || '',
        auto_renew: data.auto_renew !== false,
        whois_guard: data.whois_guard !== false,
        contact: data.contact || savedContact || null,
        created_at: now,
        updated_at: now,
      };

      const ref = db.collection('domain_orders').doc();
      await ref.set(orderDoc);
      checkCache.clear();

      return {
        order: serializeOrderDoc(ref.id, orderDoc),
      };
    }

    case 'createCheckout': {
      assertWorkspaceActor(user);
      const orderId = String(data.orderId || '').trim();
      if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required.');

      const orderRef = db.collection('domain_orders').doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found.');
      const order = orderSnap.data();

      if (order.user_id !== user.uid && !isRootSuperAdmin(user)) {
        throw new HttpsError('permission-denied', 'Forbidden');
      }
      if (order.status === 'completed' || order.status === 'processing') {
        throw new HttpsError('already-exists', 'Order is already fulfilled.');
      }
      if (order.status === 'refunded') {
        throw new HttpsError('failed-precondition', 'Order was refunded.');
      }

      const paymentMethod = String(data.paymentMethod || 'stripe').toLowerCase();
      const priceUsd = roundMoney(order.customer_price);
      if (priceUsd <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid domain order total.');
      }

      // Option 1: Pay directly with Platform Wallet Balance
      if (paymentMethod === 'wallet') {
        const walletOwnerId = resolveWalletOwnerId(user);
        const walletRef = db.doc(`billingWallets/${walletOwnerId}`);
        const ledgerRef = db.collection('billingLedger').doc();
        const now = new Date().toISOString();

        await db.runTransaction(async tx => {
          const [wSnap, freshOrderSnap] = await Promise.all([tx.get(walletRef), tx.get(orderRef)]);
          const freshOrder = freshOrderSnap.data() || {};
          if (['paid', 'processing', 'completed'].includes(freshOrder.status)) {
            return;
          }
          const currentBalance = roundMoney(wSnap.data()?.balance ?? 0);
          if (currentBalance < priceUsd) {
            throw new HttpsError(
              'failed-precondition',
              `Insufficient wallet balance ($${currentBalance.toFixed(2)} available, $${priceUsd.toFixed(2)} required).`
            );
          }
          const nextBalance = roundMoney(currentBalance - priceUsd);
          tx.set(walletRef, {
            id: walletOwnerId,
            ownerId: walletOwnerId,
            balance: nextBalance,
            updatedAt: now,
          }, { merge: true });
          tx.set(ledgerRef, {
            id: ledgerRef.id,
            walletId: walletOwnerId,
            providerId: 'platform',
            type: 'domain_purchase',
            amount: -priceUsd,
            balanceAfter: nextBalance,
            currency: order.currency || 'USD',
            domain: order.domain,
            domainOrderId: orderId,
            description: `Domain ${order.type}: ${order.domain} (${order.years || 1} yr)`,
            createdAt: now,
          });
          tx.set(orderRef, {
            status: 'paid',
            payment_method: 'wallet',
            payment_id: ledgerRef.id,
            paid_at: now,
            updated_at: now,
          }, { merge: true });
        });

        const fulfillment = await fulfillDomainOrder(db, {
          orderId,
          paymentId: ledgerRef.id,
          fetcher,
        });
        checkCache.clear();
        return {
          paid: true,
          method: 'wallet',
          orderId,
          fulfillment,
        };
      }

      // Option 2: Pay via Stripe Checkout Session (Root Provider Stripe -> fallback Admin Stripe)
      let stripeScope = 'super_admin';
      let stripeOwnerId = 'platform';
      let credentials = await readStripeCredentials(db, { scope: 'super_admin', ownerId: 'platform' });
      if (!credentials?.secretKey && order.admin_id) {
        const adminCreds = await readStripeCredentials(db, { scope: 'admin', ownerId: order.admin_id });
        if (adminCreds?.secretKey) {
          stripeScope = 'admin';
          stripeOwnerId = order.admin_id;
          credentials = adminCreds;
        }
      }
      if (!credentials?.secretKey) {
        throw new HttpsError(
          'failed-precondition',
          'Card checkout (Stripe) is not configured yet. Configure Stripe in Superadmin Payment Methods or pay using Wallet balance.'
        );
      }

      const currency = String(order.currency || 'usd').toLowerCase();
      const unitAmount = toMinorUnits(priceUsd, currency);
      if (unitAmount < 50) {
        throw new HttpsError('invalid-argument', 'Order total is below minimum card charge ($0.50).');
      }

      const originHeader = request.rawRequest?.headers?.origin || data.origin || process.env.APP_ORIGIN || 'https://gos-app-3c7fb.web.app';
      const origin = String(originHeader).replace(/\/+$/, '');
      const returnPath = typeof data.returnPath === 'string' && data.returnPath.startsWith('/')
        ? data.returnPath
        : '/dashboard/settings/domains';

      const label = order.type === 'renewal'
        ? `Domain Renewal: ${order.domain} (${order.years || 1} yr)`
        : `Domain Registration: ${order.domain} (${order.years || 1} yr)`;

      const metadata = {
        kind: 'domain',
        domainOrderId: orderId,
        userId: order.user_id,
        adminId: order.admin_id || '',
        ownerScope: stripeScope,
        ownerId: stripeOwnerId,
        domain: order.domain,
        amount: String(priceUsd),
        currency: currency.toUpperCase(),
      };

      const form = {
        mode: 'payment',
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][unit_amount]': String(unitAmount),
        'line_items[0][price_data][product_data][name]': label,
        'line_items[0][price_data][product_data][description]': 'Includes free WHOIS privacy & DNS management',
        'line_items[0][quantity]': '1',
        client_reference_id: order.user_id,
        success_url: `${origin}${returnPath}?stripe=success&kind=domain&order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}${returnPath}?stripe=cancel&kind=domain`,
        ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [`metadata[${k}]`, v])),
        ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [`payment_intent_data[metadata][${k}]`, v])),
        ...(order.user_email ? { customer_email: String(order.user_email) } : {}),
      };

      const session = await stripeRequest(fetcher, credentials.secretKey, '/checkout/sessions', {
        method: 'POST',
        form,
        idempotencyKey: `domain_checkout_${orderId}_${Date.now()}`,
      });

      if (!session?.id || !session?.url) {
        throw new HttpsError('internal', 'Stripe did not return a checkout session URL.');
      }

      const now = new Date().toISOString();
      await Promise.all([
        db.doc(`stripeCheckoutSessions/${session.id}`).set({
          sessionId: session.id,
          kind: 'domain',
          domainOrderId: orderId,
          userId: order.user_id,
          ownerScope: stripeScope,
          ownerId: stripeOwnerId,
          amount: priceUsd,
          currency: currency.toUpperCase(),
          status: 'open',
          fulfilled: false,
          createdAt: now,
        }, { merge: true }),
        orderRef.set({
          stripeSessionId: session.id,
          payment_method: 'stripe',
          updated_at: now,
        }, { merge: true }),
      ]);

      return {
        id: session.id,
        sessionId: session.id,
        url: session.url,
        method: 'stripe',
      };
    }

    case 'verifyCheckout': {
      assertWorkspaceActor(user);
      const sessionId = String(data.sessionId || '').trim();
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
        throw new HttpsError('invalid-argument', 'Invalid Stripe session ID.');
      }
      const sessionSnap = await db.doc(`stripeCheckoutSessions/${sessionId}`).get();
      const record = sessionSnap.data();
      if (!record) throw new HttpsError('not-found', 'Checkout session not found.');
      if (record.userId !== user.uid && !isRootSuperAdmin(user)) {
        throw new HttpsError('permission-denied', 'This checkout session belongs to another user.');
      }

      const owner = stripeOwner(record.ownerScope || 'super_admin', record.ownerId || 'platform');
      const credentials = await readStripeCredentials(db, owner);
      if (!credentials?.secretKey) {
        throw new HttpsError('failed-precondition', 'Stripe credentials are unavailable for verification.');
      }

      const session = await stripeRequest(
        fetcher,
        credentials.secretKey,
        `/checkout/sessions/${encodeURIComponent(sessionId)}`
      );
      if (session.payment_status !== 'paid') {
        return { paid: false, status: session.payment_status };
      }

      await fulfillCheckoutSession(db, session);
      const orderId = record.domainOrderId || session.metadata?.domainOrderId || data.orderId;
      if (!orderId) {
        return { paid: true, fulfilled: true };
      }
      const orderRef = db.collection('domain_orders').doc(orderId);
      const orderSnap = await orderRef.get();
      if (orderSnap.exists && orderSnap.data()?.status === 'pending') {
        await orderRef.set({
          status: 'paid',
          payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
          stripeSessionId: session.id,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      }
      const fulfillment = await fulfillDomainOrder(db, {
        orderId,
        stripeSessionId: session.id,
        paymentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
        fetcher,
      });
      checkCache.clear();
      return { paid: true, orderId, fulfillment };
    }

    case 'getDnsRecords': {
      assertWorkspaceActor(user);
      const owned = await getOwnedDomainOrThrow(db, user, data.domainId);
      try {
        const records = await NamecheapService.getDnsRecords(owned.data.domain, {
          db,
          fetcher,
          fallbackRecords: owned.data.dns_records || [],
        });
        return { records };
      } catch (err) {
        if (Array.isArray(owned.data.dns_records) && owned.data.dns_records.length) {
          return { records: owned.data.dns_records, cached: true };
        }
        const msg = err instanceof NamecheapError ? err.publicMessage : 'Could not fetch DNS records.';
        throw new HttpsError('unavailable', msg);
      }
    }

    case 'saveDnsRecords': {
      assertWorkspaceActor(user);
      const owned = await getOwnedDomainOrThrow(db, user, data.domainId);
      const records = Array.isArray(data.records) ? data.records : [];
      if (!records.length) {
        throw new HttpsError('invalid-argument', 'Provide at least one DNS record.');
      }
      const cleaned = records
        .map((r, i) => ({
          hostId: String(r?.hostId || i + 1),
          name: String(r?.name || '@').trim() || '@',
          type: String(r?.type || 'A').trim().toUpperCase(),
          address: String(r?.address || '').trim(),
          mxPref: String(r?.mxPref || '10'),
          ttl: String(r?.ttl || '1799'),
        }))
        .filter(r => r.address);

      if (!cleaned.length) {
        throw new HttpsError('invalid-argument', 'Each DNS record must have a valid target/address.');
      }

      try {
        if (await NamecheapService.isConfigured(db)) {
          await NamecheapService.setDnsRecords(owned.data.domain, cleaned, { db, fetcher });
        }
        let next = cleaned;
        if (await NamecheapService.isLiveConfigured(db)) {
          next = await NamecheapService.getDnsRecords(owned.data.domain, { db, fetcher });
        }
        await owned.ref.set({
          dns_records: next,
          updated_at: new Date().toISOString(),
        }, { merge: true });
        return { success: true, records: next };
      } catch (err) {
        const msg = err instanceof NamecheapError ? err.publicMessage : 'Could not update DNS records.';
        throw new HttpsError('unavailable', msg);
      }
    }

    case 'saveNameservers': {
      assertWorkspaceActor(user);
      const owned = await getOwnedDomainOrThrow(db, user, data.domainId);
      const rawList = Array.isArray(data.nameservers)
        ? data.nameservers
        : String(data.nameservers || '').split(/[\n,]+/);
      const nameservers = rawList
        .map(s => String(s || '').trim().toLowerCase())
        .filter(s => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s));

      if (nameservers.length < 2) {
        throw new HttpsError('invalid-argument', 'Provide at least two valid nameservers (e.g. ns1.example.com).');
      }

      try {
        if (await NamecheapService.isConfigured(db)) {
          await NamecheapService.setNameservers(
            { domain: owned.data.domain, nameservers },
            { db, fetcher }
          );
        }
        await owned.ref.set({
          nameservers,
          updated_at: new Date().toISOString(),
        }, { merge: true });
        return { success: true, nameservers };
      } catch (err) {
        const msg = err instanceof NamecheapError ? err.publicMessage : 'Could not update nameservers.';
        throw new HttpsError('unavailable', msg);
      }
    }

    case 'setAutoRenew': {
      assertWorkspaceActor(user);
      const owned = await getOwnedDomainOrThrow(db, user, data.domainId);
      const autoRenew = Boolean(data.auto_renew);
      await owned.ref.set({
        auto_renew: autoRenew,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      return { success: true, auto_renew: autoRenew };
    }

    case 'createRenewalOrder': {
      assertWorkspaceActor(user);
      const owned = await getOwnedDomainOrThrow(db, user, data.domainId);
      const years = Math.max(1, Math.min(10, Number(data.years) || 1));
      const ext = owned.data.extension || owned.data.domain.split('.').slice(1).join('.');
      const pricing = await getPricingForTld(db, ext);
      if (!pricing) {
        throw new HttpsError('invalid-argument', `Pricing unavailable for .${ext}`);
      }

      const customerPrice = roundMoney(customerPriceFor(pricing, 'renewal') * years);
      const registrarCost = roundMoney(registrarCostFor(pricing, 'renewal') * years);
      const now = new Date().toISOString();

      const orderDoc = {
        user_id: user.uid,
        tenant_id: owned.data.tenant_id || user.tenantId || user.uid,
        admin_id: owned.data.admin_id || resolveAdminOwnerId(user),
        user_email: user.email || owned.data.user_email || '',
        user_name: user.name || owned.data.user_name || '',
        domain: owned.data.domain,
        extension: ext,
        type: 'renewal',
        years,
        registrar: 'namecheap',
        registrar_cost: registrarCost,
        customer_price: customerPrice,
        renewal_price: customerPriceFor(pricing, 'renewal'),
        currency: pricing.currency || 'USD',
        status: 'pending',
        payment_id: '',
        domain_id: owned.id,
        created_at: now,
        updated_at: now,
      };

      const ref = db.collection('domain_orders').doc();
      await ref.set(orderDoc);
      return {
        order: serializeOrderDoc(ref.id, orderDoc),
      };
    }

    // =========================================================================
    // ADMIN DELEGATED SCOPE OPERATIONS (/admin/domains)
    // =========================================================================
    case 'adminOverview': {
      if (!isWorkspaceAdmin(user)) {
        throw new HttpsError('permission-denied', 'Administrator access is required.');
      }
      const superScope = isRootSuperAdmin(user);
      const q = String(data.q || '').trim().toLowerCase();

      const [allDomainsSnap, allOrdersSnap, siteDomainsSnap, settings, publicRows, delegatedIds] = await Promise.all([
        db.collection('domains').get(),
        db.collection('domain_orders').get(),
        db.collection('site_domains').get().catch(() => null),
        getSettings(db),
        listPricing(db, { enabledOnly: true }),
        superScope ? Promise.resolve(null) : resolveDelegatedUserIds(db, user.uid, user),
      ]);

      const domains = [];
      allDomainsSnap.forEach(doc => {
        const d = doc.data();
        if (!superScope && !canManageDomainRecord(user, d, delegatedIds)) return;
        const hay = `${d.domain || ''} ${d.user_email || ''} ${d.user_name || ''} ${d.user_id || ''}`.toLowerCase();
        if (q && !hay.includes(q)) return;
        domains.push(serializeDomainDoc(doc.id, d, { includeOwner: true }));
      });
      domains.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      const orders = [];
      allOrdersSnap.forEach(doc => {
        const d = doc.data();
        if (!superScope && !canManageDomainRecord(user, d, delegatedIds)) return;
        orders.push(serializeOrderDoc(doc.id, d, {
          includeOwner: true,
          includeWholesale: superScope,
        }));
      });
      orders.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      const siteDomains = [];
      siteDomainsSnap?.forEach(doc => {
        const d = doc.data();
        const ownerMatch = superScope
          || d.ownerUid === user.uid
          || d.tenantId === user.tenantId
          || (delegatedIds && (delegatedIds.has(d.ownerUid) || delegatedIds.has(d.tenantId)));
        if (!ownerMatch) return;
        siteDomains.push({
          host: doc.id,
          funnelId: d.funnelId || '',
          tenantId: d.tenantId || '',
          ownerUid: d.ownerUid || '',
          status: d.status || 'pending',
          sslStatus: d.sslStatus || (d.verified ? 'active' : 'pending'),
          verified: Boolean(d.verified),
          updatedAt: serializeTs(d.updatedAt),
        });
      });

      return {
        scope: superScope ? 'super_admin' : 'admin',
        currency: settings.currency || 'USD',
        pricing: publicRows.map(toPublicPricing).filter(Boolean),
        domains,
        orders,
        siteDomains,
      };
    }

    // =========================================================================
    // SUPERADMIN ROOT PROVIDER OPERATIONS (/super-admin/domains)
    // =========================================================================
    case 'superAdminOverview': {
      if (!isRootSuperAdmin(user)) {
        throw new HttpsError('permission-denied', 'Superadmin access is required.');
      }
      const q = String(data.q || '').trim().toLowerCase();
      const statusFilter = String(data.status || '').trim().toLowerCase();

      const [settings, pricingRows, registrarConfig, domainsSnap, ordersSnap, logsSnap] = await Promise.all([
        getSettings(db, { force: true }),
        listPricing(db, { force: true }),
        getRegistrarConfigSummary(db),
        db.collection('domains').get(),
        db.collection('domain_orders').get(),
        db.collection('domain_registrar_logs').get().catch(() => null),
      ]);

      const domains = [];
      domainsSnap.forEach(doc => {
        const d = doc.data();
        const hay = `${d.domain || ''} ${d.user_email || ''} ${d.user_name || ''} ${d.user_id || ''}`.toLowerCase();
        if (q && !hay.includes(q)) return;
        domains.push(serializeDomainDoc(doc.id, d, { includeOwner: true }));
      });
      domains.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      const orders = [];
      ordersSnap.forEach(doc => {
        const d = doc.data();
        if (statusFilter && statusFilter !== 'all' && d.status !== statusFilter) return;
        orders.push(serializeOrderDoc(doc.id, d, { includeOwner: true, includeWholesale: true }));
      });
      orders.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      const logs = [];
      logsSnap?.forEach(doc => {
        const d = doc.data();
        if (data.orderId && d.orderId !== data.orderId) return;
        logs.push({
          id: doc.id,
          orderId: d.orderId || '',
          userId: d.userId || '',
          domain: d.domain || '',
          type: d.type || '',
          code: d.code || '',
          message: d.message || '',
          createdAt: serializeTs(d.createdAt),
        });
      });
      logs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      return {
        settings,
        pricing: pricingRows.map(toAdminPricing),
        registrarConfig,
        namecheapConfigured: registrarConfig.configured,
        domains,
        orders,
        logs: logs.slice(0, 50),
      };
    }

    case 'saveRegistrarConfig': {
      if (!isStrictSuperAdmin(user)) {
        throw new HttpsError('permission-denied', 'Only the Root Superadmin can modify registrar API credentials.');
      }
      const summary = await saveRegistrarConfig(db, data.config || data, user.uid);
      checkCache.clear();
      await db.collection('userManagementAudit').add({
        actorId: user.uid,
        type: 'domain_registrar.config_updated',
        provider: 'namecheap',
        environment: summary.environment,
        sandboxSimulation: summary.sandboxSimulation,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
      return { success: true, registrarConfig: summary, namecheapConfigured: summary.configured };
    }

    case 'testRegistrarConfig': {
      if (!isStrictSuperAdmin(user)) {
        throw new HttpsError('permission-denied', 'Only the Root Superadmin can test registrar API credentials.');
      }
      try {
        const res = await NamecheapService.testConnection(db, {
          override: data.config || null,
          fetcher,
        });
        return { success: true, ...res };
      } catch (err) {
        throw new HttpsError('failed-precondition', err?.message || 'Could not connect to Namecheap API.');
      }
    }

    case 'updatePricing': {
      if (!isRootSuperAdmin(user)) {
        throw new HttpsError('permission-denied', 'Superadmin access is required to manage global domain pricing.');
      }

      if (data.deleteExtension) {
        const res = await deletePricing(db, data.deleteExtension);
        const rows = await listPricing(db, { force: true });
        return { success: true, ...res, pricing: rows.map(toAdminPricing) };
      }

      if (data.applyBulkMarkup && typeof data.applyBulkMarkup === 'object') {
        const rows = await applyBulkMarkup(db, data.applyBulkMarkup);
        const settings = await getSettings(db, { force: true });
        return {
          success: true,
          settings,
          pricing: rows.map(toAdminPricing),
        };
      }

      if (data.settings && typeof data.settings === 'object') {
        const s = data.settings;
        const patch = { updated_at: new Date().toISOString() };
        if (s.markup != null) patch.markup = Number(s.markup) || 0;
        if (s.markup_type) patch.markup_type = s.markup_type === 'percent' ? 'percent' : 'fixed';
        if (Array.isArray(s.suggested_tlds)) {
          patch.suggested_tlds = s.suggested_tlds
            .map(t => String(t).replace(/^\./, '').toLowerCase())
            .filter(Boolean);
        }
        if (s.currency) patch.currency = String(s.currency).toUpperCase();
        await db.doc('domain_settings/global').set(patch, { merge: true });
        invalidatePricingCache();
      }

      if (data.extension) {
        const saved = await upsertPricing(db, data.extension, data);
        return { success: true, pricing: toAdminPricing(saved) };
      }

      if (data.refreshRegistrar) {
        try {
          const rows = await refreshRegistrarCosts(db, { fetcher });
          return { success: true, pricing: rows.map(toAdminPricing) };
        } catch (err) {
          throw new HttpsError('failed-precondition', err?.message || 'Failed to sync registrar pricing.');
        }
      }

      const [settings, rows] = await Promise.all([
        getSettings(db, { force: true }),
        listPricing(db, { force: true }),
      ]);
      return { success: true, settings, pricing: rows.map(toAdminPricing) };
    }

    case 'retryOrder': {
      if (!isRootSuperAdmin(user)) {
        throw new HttpsError('permission-denied', 'Superadmin access is required to retry registrar fulfillment.');
      }
      const orderId = String(data.orderId || '').trim();
      if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required.');

      const ref = db.collection('domain_orders').doc(orderId);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
      const order = snap.data();

      if (order.status === 'completed') {
        return { success: true, message: 'Already completed' };
      }
      if (!['failed', 'paid', 'processing', 'pending'].includes(order.status)) {
        throw new HttpsError('failed-precondition', `Cannot retry order in status "${order.status}".`);
      }

      const now = new Date().toISOString();
      await ref.set({
        status: 'paid',
        retry_at: now,
        updated_at: now,
      }, { merge: true });

      const result = await fulfillDomainOrder(db, {
        orderId,
        paymentId: order.payment_id || '',
        stripeSessionId: order.stripeSessionId || '',
        fetcher,
      });
      checkCache.clear();
      return { success: Boolean(result.ok), result };
    }

    default:
      throw new HttpsError('invalid-argument', `Unknown domainProvider operation: ${operation}`);
  }
}

/**
 * HTTP REST Bridge supporting `/api/domains/*` and `/api/admin/domains/*`
 * for direct Bearer-token API compatibility with `public/Feedback/Domain_provider`.
 */
export function createDomainProviderApiHandler({ db, auth, actor, fetcher = fetch }) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).send('');

    try {
      const authHeader = String(req.headers.authorization || '');
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) return res.status(401).json({ error: 'Authentication required' });
      const decoded = await auth.verifyIdToken(token);

      const body = typeof req.body === 'string'
        ? (req.body ? JSON.parse(req.body) : {})
        : (req.body || {});
      const path = String(req.path || req.url || '').split('?')[0].replace(/\/+$/, '');
      const method = req.method.toUpperCase();

      const invoke = payload =>
        domainProviderRequest(
          { auth: { uid: decoded.uid, token: decoded }, data: payload, rawRequest: req },
          { actor, db, fetcher }
        );

      // Admin routes
      if (path.endsWith('/api/admin/domains') && method === 'GET') {
        const out = await invoke({ operation: 'superAdminOverview', q: req.query?.q || '' });
        return res.status(200).json({ domains: out.domains });
      }
      if (path.endsWith('/api/admin/domains/pricing')) {
        if (method === 'GET') {
          const out = await invoke({ operation: 'superAdminOverview' });
          return res.status(200).json({
            settings: out.settings,
            pricing: out.pricing,
            namecheapConfigured: out.namecheapConfigured,
            registrarConfig: out.registrarConfig,
          });
        }
        if (method === 'PUT') {
          const out = await invoke({ operation: 'updatePricing', ...body });
          return res.status(200).json(out);
        }
      }
      if (path.endsWith('/api/admin/domains/orders') && method === 'GET') {
        const out = await invoke({ operation: 'superAdminOverview', status: req.query?.status || '' });
        return res.status(200).json({ orders: out.orders });
      }
      const retryMatch = /\/api\/admin\/domains\/orders\/([^/]+)\/retry$/.exec(path);
      if (retryMatch && method === 'POST') {
        const out = await invoke({ operation: 'retryOrder', orderId: retryMatch[1] });
        return res.status(200).json(out);
      }
      if (path.endsWith('/api/admin/domains/logs') && method === 'GET') {
        const out = await invoke({ operation: 'superAdminOverview', orderId: req.query?.orderId || '' });
        return res.status(200).json({ logs: out.logs });
      }

      // User routes
      if (path.endsWith('/api/domains') && method === 'GET') {
        const out = await invoke({ operation: 'listMyDomains' });
        return res.status(200).json({ domains: out.domains });
      }
      if (path.endsWith('/api/domains/check') && (method === 'GET' || method === 'POST')) {
        const out = await invoke({
          operation: 'checkAvailability',
          domain: req.query?.domain || body.domain || '',
        });
        return res.status(200).json(out);
      }
      if (path.endsWith('/api/domains/pricing') && method === 'GET') {
        const out = await invoke({ operation: 'getPublicPricing' });
        return res.status(200).json(out);
      }
      if (path.endsWith('/api/domains/contact')) {
        if (method === 'GET') return res.status(200).json(await invoke({ operation: 'getContact' }));
        if (method === 'PUT' || method === 'POST') {
          return res.status(200).json(await invoke({ operation: 'saveContact', contact: body }));
        }
      }
      if (path.endsWith('/api/domains/orders')) {
        if (method === 'GET') {
          const out = await invoke({ operation: 'listMyDomains' });
          return res.status(200).json({ orders: out.orders });
        }
        if (method === 'POST') {
          return res.status(200).json(await invoke({ operation: 'createOrder', ...body }));
        }
      }
      if (path.endsWith('/api/domains/checkout') && method === 'POST') {
        return res.status(200).json(await invoke({ operation: 'createCheckout', ...body }));
      }

      const dnsMatch = /\/api\/domains\/([^/]+)\/dns$/.exec(path);
      if (dnsMatch) {
        if (method === 'GET') return res.status(200).json(await invoke({ operation: 'getDnsRecords', domainId: dnsMatch[1] }));
        if (method === 'POST') return res.status(200).json(await invoke({ operation: 'saveDnsRecords', domainId: dnsMatch[1], ...body }));
      }
      const nsMatch = /\/api\/domains\/([^/]+)\/nameservers$/.exec(path);
      if (nsMatch && method === 'POST') {
        return res.status(200).json(await invoke({ operation: 'saveNameservers', domainId: nsMatch[1], ...body }));
      }
      const renewMatch = /\/api\/domains\/([^/]+)\/renew$/.exec(path);
      if (renewMatch && method === 'POST') {
        return res.status(200).json(await invoke({ operation: 'createRenewalOrder', domainId: renewMatch[1], ...body }));
      }
      const autoRenewMatch = /\/api\/domains\/([^/]+)\/autorenew$/.exec(path);
      if (autoRenewMatch && method === 'POST') {
        return res.status(200).json(await invoke({ operation: 'setAutoRenew', domainId: autoRenewMatch[1], ...body }));
      }
      const idMatch = /\/api\/domains\/([^/]+)$/.exec(path);
      if (idMatch && method === 'GET') {
        return res.status(200).json(await invoke({ operation: 'getDomainDetail', domainId: idMatch[1] }));
      }

      return res.status(404).json({ error: 'Unknown domain endpoint' });
    } catch (err) {
      const status = err?.httpErrorCode?.status || (err?.code === 'permission-denied' ? 403 : err?.code === 'unauthenticated' ? 401 : err?.code === 'not-found' ? 404 : 400);
      return res.status(status).json({ error: err?.message || 'Domain request failed', ...(err?.details ? { details: err.details } : {}) });
    }
  };
}
