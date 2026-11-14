import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import { parseDomainInput, serializeTs } from '@/lib/domains/constants';
import { NamecheapService } from '@/lib/domains/namecheap';
import { customerPriceFor, getPricingForTld, registrarCostFor } from '@/lib/domains/pricing';
import { validateContacts } from '@/lib/domains/fulfillOrder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serializeOrder(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    domain: data.domain,
    extension: data.extension,
    type: data.type,
    status: data.status,
    customer_price: data.customer_price,
    renewal_price: data.renewal_price,
    currency: data.currency || 'USD',
    years: data.years || 1,
    error_public: data.error_public || '',
    created_at: serializeTs(data.created_at),
    updated_at: serializeTs(data.updated_at)
  };
}

export async function GET(req) {
  const auth = await verifyUserRequest(req);
  if (!auth.ok) return auth.response;
  const snap = await auth.adminDb.collection('domain_orders')
    .where('user_id', '==', auth.uid)
    .get();
  const orders = snap.docs.map(serializeOrder)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return NextResponse.json({ orders });
}

export async function POST(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const parsed = parseDomainInput(body.domain);
    if (!parsed) {
      return NextResponse.json({ error: 'Enter a valid domain' }, { status: 400 });
    }

    const type = ['registration', 'renewal', 'transfer'].includes(body.type) ? body.type : 'registration';
    const years = Math.max(1, Math.min(10, Number(body.years) || 1));

    const pricing = await getPricingForTld(auth.adminDb, parsed.tld);
    if (!pricing || pricing.enabled === false) {
      return NextResponse.json({ error: 'This domain extension is not offered yet' }, { status: 400 });
    }

    if (type === 'registration') {
      if (!NamecheapService.isConfigured()) {
        return NextResponse.json({ error: 'Domain registration is not available yet' }, { status: 503 });
      }
      const checks = await NamecheapService.checkDomainAvailability([parsed.fqdn]);
      if (!checks[0]?.available) {
        return NextResponse.json({ error: 'This domain is no longer available' }, { status: 409 });
      }

      const ownedSnap = await auth.adminDb.collection('domains')
        .where('user_id', '==', auth.uid)
        .get();
      if (ownedSnap.docs.some((d) => d.data()?.domain === parsed.fqdn)) {
        return NextResponse.json({ error: 'This domain is already registered on the platform' }, { status: 409 });
      }

      const pendingSnap = await auth.adminDb.collection('domain_orders')
        .where('user_id', '==', auth.uid)
        .get();
      const open = pendingSnap.docs.find((d) => {
        const data = d.data() || {};
        return data.domain === parsed.fqdn && ['pending', 'paid', 'processing'].includes(data.status);
      });
      if (open) {
        return NextResponse.json({ order: serializeOrder(open), existing: true });
      }
    }

    const contactSnap = await auth.adminDb.collection('domain_contacts').doc(auth.uid).get();
    const storedContact = contactSnap.exists ? contactSnap.data() : {};
    const contact = { ...storedContact, ...(body.contact || {}) };
    if (type === 'registration') {
      const missing = validateContacts(contact);
      if (missing.length) {
        return NextResponse.json({
          error: 'Add registrant contact details in Domain Settings before registering.',
          missing
        }, { status: 400 });
      }
    }

    const premium = 0;
    const customerPrice = customerPriceFor(pricing, type, premium) * years;
    const registrarCost = registrarCostFor(pricing, type, premium) * years;

    const ref = auth.adminDb.collection('domain_orders').doc();
    const order = {
      user_id: auth.uid,
      user_email: auth.email || auth.userData.email || '',
      user_name: auth.userData.name || '',
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
      auto_renew: body.auto_renew !== false,
      whois_guard: body.whois_guard !== false,
      domain_id: body.domain_id || '',
      contact: {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        address1: contact.address1 || '',
        city: contact.city || '',
        state: contact.state || '',
        postalCode: contact.postalCode || '',
        country: contact.country || 'US',
        phone: contact.phone || '',
        email: contact.email || auth.email || ''
      },
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    };
    await ref.set(order);
    const saved = await ref.get();
    return NextResponse.json({ order: serializeOrder(saved) });
  } catch (err) {
    console.error('[domains/orders POST]', err);
    return NextResponse.json({ error: err.message || 'Could not create domain order' }, { status: 500 });
  }
}
