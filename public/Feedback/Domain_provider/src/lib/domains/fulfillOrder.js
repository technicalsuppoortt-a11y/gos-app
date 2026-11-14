import { FieldValue } from 'firebase-admin/firestore';
import { NamecheapError, NamecheapService } from './namecheap';
import { publicRegistrarError } from './xml';
import { formatPhoneForNamecheap, parseDomainInput } from './constants';
import { getPricingForTld } from './pricing';

function logRegistrarError(adminDb, payload) {
  return adminDb.collection('domain_registrar_logs').add({
    ...payload,
    createdAt: FieldValue.serverTimestamp()
  }).catch((err) => console.error('[domain_registrar_logs]', err));
}

export function contactsFromRecord(contact = {}, fallbackEmail = '') {
  const phone = formatPhoneForNamecheap(contact.phone, contact.country || 'US');
  const base = {
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    address1: contact.address1 || '',
    city: contact.city || '',
    state: contact.state || contact.stateProvince || 'NA',
    postalCode: contact.postalCode || '',
    country: contact.country || 'US',
    phone,
    email: contact.email || fallbackEmail
  };
  return {
    registrant: base,
    tech: base,
    admin: base,
    auxBilling: base
  };
}

export function validateContacts(contact) {
  const required = ['firstName', 'lastName', 'address1', 'city', 'postalCode', 'country', 'phone', 'email'];
  const missing = required.filter((k) => !String(contact?.[k] || '').trim());
  return missing;
}

async function findExistingDomain(adminDb, fqdn) {
  const snap = await adminDb.collection('domains').where('domain', '==', fqdn).limit(5).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function fulfillDomainOrder(adminDb, { orderId, paymentId = '', stripeSessionId = '' }) {
  if (!orderId) throw new Error('Missing domain order');

  const orderRef = adminDb.collection('domain_orders').doc(orderId);

  const claim = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error('Domain order not found');
    const order = { id: snap.id, ...snap.data() };

    if (order.status === 'completed') {
      return { skip: true, reason: 'already_completed', order };
    }
    if (order.status === 'processing') {
      return { skip: true, reason: 'in_progress', order };
    }
    if (order.status === 'refunded') {
      throw new Error('This order was refunded');
    }

    tx.update(orderRef, {
      status: 'processing',
      payment_id: paymentId || order.payment_id || '',
      stripeSessionId: stripeSessionId || order.stripeSessionId || '',
      processingAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    });
    return { skip: false, order: { ...order, status: 'processing' } };
  });

  if (claim.skip) {
    return { ok: true, idempotent: true, reason: claim.reason, order: claim.order };
  }

  const order = claim.order;
  const parsed = parseDomainInput(order.domain);
  const fqdn = parsed?.fqdn || String(order.domain || '').toLowerCase();

  try {
    const existing = await findExistingDomain(adminDb, fqdn);
    if (existing && (existing.status === 'active' || existing.registrar_domain_id)) {
      await orderRef.set({
        status: 'completed',
        domain_id: existing.id,
        updated_at: FieldValue.serverTimestamp(),
        completed_at: FieldValue.serverTimestamp()
      }, { merge: true });
      return { ok: true, idempotent: true, reason: 'domain_exists', domain: existing, order };
    }

    if (!NamecheapService.isConfigured()) {
      throw new NamecheapError('Namecheap is not configured', {
        code: 'not_configured',
        publicMessage: 'Registrar is not configured. Your payment was received; support will complete registration.'
      });
    }

    const type = order.type || 'registration';

    if (type === 'registration') {
      const checks = await NamecheapService.checkDomainAvailability([fqdn]);
      const hit = checks[0];
      if (!hit?.available) {
        throw new NamecheapError('Domain is no longer available', {
          code: 'unavailable',
          publicMessage: 'This domain is no longer available. Your payment was received — contact support for a refund or replacement domain.'
        });
      }

      const contactSnap = await adminDb.collection('domain_contacts').doc(order.user_id).get();
      const contact = {
        ...(contactSnap.exists ? contactSnap.data() : {}),
        ...(order.contact || {})
      };
      const missing = validateContacts(contact);
      if (missing.length) {
        throw new NamecheapError(`Missing contact fields: ${missing.join(', ')}`, {
          code: 'invalid_contact',
          publicMessage: 'Contact details are incomplete. Update Domain Settings so support can finish registration.'
        });
      }

      const result = await NamecheapService.registerDomain({
        domain: fqdn,
        years: order.years || 1,
        contacts: contactsFromRecord(contact, order.user_email),
        whoisGuard: order.whois_guard !== false
      });

      if (!result.registered && !result.domainID) {
        throw new NamecheapError('Registrar did not confirm registration', {
          code: 'register_failed',
          publicMessage: 'Registration did not complete. Support will retry this order.'
        });
      }

      let info = null;
      try {
        info = await NamecheapService.getDomainInfo(fqdn);
      } catch (err) {
        console.warn('[fulfillDomainOrder] getDomainInfo', err.message);
      }

      const now = new Date();
      const expires = info?.expiredDate ? new Date(info.expiredDate) : new Date(now.getTime() + 365 * 86400000);
      const domainRef = adminDb.collection('domains').doc();
      const domainDoc = {
        user_id: order.user_id,
        user_email: order.user_email || '',
        user_name: order.user_name || '',
        domain: fqdn,
        extension: parsed?.tld || order.extension || '',
        registrar: 'namecheap',
        registrar_domain_id: result.domainID || '',
        status: 'active',
        registration_price: order.customer_price,
        renewal_price: order.renewal_price || order.customer_price,
        registered_at: now.toISOString(),
        expires_at: expires.toISOString(),
        auto_renew: order.auto_renew !== false,
        nameservers: info?.nameservers || [],
        registrar_response: {
          orderID: result.orderID,
          transactionID: result.transactionID,
          chargedAmount: result.chargedAmount
        },
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      };
      await domainRef.set(domainDoc);

      await orderRef.set({
        status: 'completed',
        domain_id: domainRef.id,
        registrar_response: domainDoc.registrar_response,
        registrar_cost_actual: result.chargedAmount || order.registrar_cost,
        completed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      }, { merge: true });

      return { ok: true, domain: { id: domainRef.id, ...domainDoc }, order };
    }

    if (type === 'renewal') {
      const result = await NamecheapService.renewDomain({
        domain: fqdn,
        years: order.years || 1
      });
      const existingDomain = order.domain_id
        ? await adminDb.collection('domains').doc(order.domain_id).get()
        : null;
      const info = await NamecheapService.getDomainInfo(fqdn).catch(() => null);
      if (existingDomain?.exists) {
        await existingDomain.ref.set({
          expires_at: info?.expiredDate || result.expireDate || existingDomain.data().expires_at,
          status: 'active',
          registrar_response: { orderID: result.orderID, transactionID: result.transactionID },
          updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      await orderRef.set({
        status: 'completed',
        registrar_response: { orderID: result.orderID, transactionID: result.transactionID, chargedAmount: result.chargedAmount },
        completed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      }, { merge: true });
      return { ok: true, order };
    }

    throw new Error(`Unsupported order type: ${type}`);
  } catch (err) {
    const publicMessage = err instanceof NamecheapError
      ? (err.publicMessage || publicRegistrarError(err.errors || [{ message: err.message }]))
      : 'We received your payment but could not finish registrar processing. Support will follow up.';

    await logRegistrarError(adminDb, {
      orderId,
      userId: order.user_id,
      domain: fqdn,
      type: order.type,
      code: err.code || '',
      message: err.message || String(err),
      raw: err.raw || ''
    });

    await orderRef.set({
      status: 'failed',
      error_public: publicMessage,
      error_internal: err.message || String(err),
      error_code: err.code || '',
      updated_at: FieldValue.serverTimestamp()
    }, { merge: true });

    return { ok: false, error: publicMessage, orderId };
  }
}
