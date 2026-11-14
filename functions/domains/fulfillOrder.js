import { NamecheapService, NamecheapError } from './namecheap.js';
import { formatPhoneForNamecheap, REQUIRED_CONTACT_FIELDS } from './constants.js';

function contactsFromRecord(contact = {}, fallbackEmail = '') {
  const country = (contact.country || 'US').toUpperCase();
  const base = {
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    address1: contact.address1 || '',
    city: contact.city || '',
    state: contact.state || contact.stateProvince || 'NA',
    postalCode: contact.postalCode || '',
    country,
    phone: formatPhoneForNamecheap(contact.phone, country),
    email: contact.email || fallbackEmail || '',
  };
  return { registrant: base, tech: base, admin: base, auxBilling: base };
}

export function validateContacts(contact) {
  const missing = REQUIRED_CONTACT_FIELDS.filter(k => !String(contact?.[k] || '').trim());
  return missing;
}

async function logRegistrarFailure(adminDb, payload) {
  try {
    await adminDb.collection('domain_registrar_logs').add({
      ...payload,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to persist registrar log:', err?.message);
  }
}

/**
 * Idempotent post-payment domain fulfillment.
 * Safe to call from Stripe webhook, Wallet checkout, verifyCheckout, and Superadmin manual retry.
 */
export async function fulfillDomainOrder(adminDb, { orderId, paymentId = '', stripeSessionId = '', fetcher = fetch }) {
  if (!orderId) throw new Error('orderId required');
  const orderRef = adminDb.collection('domain_orders').doc(orderId);

  const claimed = await adminDb.runTransaction(async tx => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error(`Domain order ${orderId} not found`);
    const data = snap.data();

    if (data.status === 'completed') return { skip: 'already_completed', order: data };
    if (data.status === 'processing') return { skip: 'in_progress', order: data };
    if (data.status === 'refunded') throw new Error(`Order ${orderId} was refunded`);

    const now = new Date().toISOString();
    tx.set(orderRef, {
      ...data,
      status: 'processing',
      payment_id: paymentId || data.payment_id || '',
      stripeSessionId: stripeSessionId || data.stripeSessionId || '',
      processingAt: now,
      updated_at: now,
    }, { merge: true });
    return { order: data };
  });

  if (claimed.skip) {
    return { ok: true, idempotent: true, reason: claimed.skip, order: claimed.order };
  }

  const order = claimed.order;
  const fqdn = String(order.domain || '').toLowerCase();

  if (order.type === 'registration') {
    const existingSnap = await adminDb
      .collection('domains')
      .where('domain', '==', fqdn)
      .get();

    let existingActiveDoc = null;
    existingSnap.forEach(doc => {
      const d = doc.data();
      if (d.status === 'active' || d.registrar_domain_id) {
        existingActiveDoc = doc;
      }
    });

    if (existingActiveDoc) {
      const now = new Date().toISOString();
      await orderRef.set({
        status: 'completed',
        domain_id: existingActiveDoc.id,
        completed_at: now,
        updated_at: now,
      }, { merge: true });
      return { ok: true, idempotent: true, reason: 'domain_exists', domainId: existingActiveDoc.id };
    }
  }

  try {
    const configured = await NamecheapService.isConfigured(adminDb);
    if (!configured) {
      throw new NamecheapError('Registrar credentials missing', {
        code: 'not_configured',
        publicMessage: 'Your payment was received. Domain registration is queued and will complete shortly.',
      });
    }

    if (order.type === 'registration') {
      const [avail] = await NamecheapService.checkDomainAvailability([fqdn], { db: adminDb, fetcher });
      if (avail && !avail.available) {
        throw new NamecheapError('Domain unavailable at fulfillment time', {
          code: 'unavailable',
          publicMessage: 'This domain was registered seconds ago by someone else. Please contact support for an instant refund.',
        });
      }

      const contactDoc = await adminDb.collection('domain_contacts').doc(order.user_id).get();
      const contactRecord = { ...(contactDoc.exists ? contactDoc.data() : {}), ...(order.contact || {}) };
      const missing = validateContacts(contactRecord);
      if (missing.length) {
        throw new NamecheapError(`Missing contact fields: ${missing.join(', ')}`, {
          code: 'invalid_contact',
          publicMessage: 'Registrant contact details are incomplete. Update Domain Settings so we can finish registering your domain.',
        });
      }

      const contacts = contactsFromRecord(contactRecord, order.user_email);
      const result = await NamecheapService.registerDomain(
        {
          domain: fqdn,
          years: order.years || 1,
          contacts,
          whoisGuard: order.whois_guard !== false,
        },
        { db: adminDb, fetcher }
      );

      if (!result.registered && !result.domainID) {
        throw new NamecheapError('Registrar returned Registered=false', {
          code: 'register_failed',
          raw: result.raw,
        });
      }

      let info = null;
      try {
        info = await NamecheapService.getDomainInfo(fqdn, { db: adminDb, fetcher });
      } catch {
        // Non-fatal: registration already succeeded.
      }

      const nowIso = new Date().toISOString();
      const years = Math.max(1, Number(order.years) || 1);
      const fallbackExpires = new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000).toISOString();

      const domainRecord = {
        user_id: order.user_id,
        tenant_id: order.tenant_id || order.user_id,
        admin_id: order.admin_id || '',
        user_email: order.user_email || '',
        user_name: order.user_name || '',
        domain: fqdn,
        extension: order.extension,
        registrar: 'namecheap',
        registrar_domain_id: result.domainID || '',
        status: 'active',
        registration_price: order.customer_price,
        renewal_price: order.renewal_price || order.customer_price,
        registered_at: nowIso,
        expires_at: info?.expiredDate || fallbackExpires,
        auto_renew: order.auto_renew !== false,
        nameservers: info?.nameservers?.length ? info.nameservers : ['dns1.registrar-servers.com', 'dns2.registrar-servers.com'],
        dns_records: [],
        registrar_response: {
          orderID: result.orderID,
          transactionID: result.transactionID,
          chargedAmount: result.chargedAmount,
        },
        created_at: nowIso,
        updated_at: nowIso,
      };

      const domainRef = adminDb.collection('domains').doc();
      await domainRef.set(domainRecord);

      await orderRef.set({
        status: 'completed',
        domain_id: domainRef.id,
        registrar_response: {
          orderID: result.orderID,
          transactionID: result.transactionID,
          chargedAmount: result.chargedAmount,
        },
        registrar_cost_actual: result.chargedAmount || order.registrar_cost || 0,
        error_public: '',
        error_internal: '',
        error_code: '',
        completed_at: nowIso,
        updated_at: nowIso,
      }, { merge: true });

      return { ok: true, domainId: domainRef.id, domain: fqdn, registrarOrderId: result.orderID };
    }

    if (order.type === 'renewal') {
      const result = await NamecheapService.renewDomain(
        { domain: fqdn, years: order.years || 1 },
        { db: adminDb, fetcher }
      );
      let info = null;
      try {
        info = await NamecheapService.getDomainInfo(fqdn, { db: adminDb, fetcher });
      } catch {
        // non-fatal
      }

      const nowIso = new Date().toISOString();
      if (order.domain_id) {
        const domRef = adminDb.collection('domains').doc(order.domain_id);
        const domSnap = await domRef.get();
        const prevExpires = domSnap.exists && domSnap.data()?.expires_at ? new Date(domSnap.data().expires_at).getTime() : Date.now();
        const baseTime = Number.isFinite(prevExpires) && prevExpires > Date.now() ? prevExpires : Date.now();
        const nextExpires = new Date(baseTime + (Number(order.years) || 1) * 365 * 24 * 60 * 60 * 1000).toISOString();
        await domRef.set({
          expires_at: info?.expiredDate || result.expireDate || nextExpires,
          status: 'active',
          registrar_response: {
            orderID: result.orderID,
            transactionID: result.transactionID,
            chargedAmount: result.chargedAmount,
          },
          updated_at: nowIso,
        }, { merge: true });
      }

      await orderRef.set({
        status: 'completed',
        registrar_response: {
          orderID: result.orderID,
          transactionID: result.transactionID,
          chargedAmount: result.chargedAmount,
        },
        error_public: '',
        error_internal: '',
        error_code: '',
        completed_at: nowIso,
        updated_at: nowIso,
      }, { merge: true });

      return { ok: true, domain: fqdn, registrarOrderId: result.orderID };
    }

    throw new Error(`Unsupported domain order type: ${order.type}`);
  } catch (err) {
    const publicMessage = err instanceof NamecheapError
      ? err.publicMessage
      : 'Payment received, but registrar could not complete the order automatically. Our team has been notified.';

    await logRegistrarFailure(adminDb, {
      orderId,
      userId: order.user_id,
      domain: fqdn,
      type: order.type,
      code: err?.code || '',
      message: err?.message || String(err),
      raw: err?.raw || '',
    });

    await orderRef.set({
      status: 'failed',
      error_public: publicMessage,
      error_internal: err?.message || String(err),
      error_code: err?.code || '',
      updated_at: new Date().toISOString(),
    }, { merge: true });

    return { ok: false, error: publicMessage, orderId };
  }
}
