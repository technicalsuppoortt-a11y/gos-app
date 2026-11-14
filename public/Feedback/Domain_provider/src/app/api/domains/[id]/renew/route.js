import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import { getPricingForTld, customerPriceFor, registrarCostFor } from '@/lib/domains/pricing';
import { parseDomainInput } from '@/lib/domains/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const auth = await verifyUserRequest(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const snap = await auth.adminDb.collection('domains').doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
  const domain = snap.data();
  if (domain.user_id !== auth.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const years = Math.max(1, Math.min(10, Number(body.years) || 1));
  const parsed = parseDomainInput(domain.domain);
  const pricing = await getPricingForTld(auth.adminDb, parsed?.tld || domain.extension);
  if (!pricing) return NextResponse.json({ error: 'Renewal pricing is unavailable' }, { status: 400 });

  const ref = auth.adminDb.collection('domain_orders').doc();
  await ref.set({
    user_id: auth.uid,
    user_email: auth.email || '',
    user_name: auth.userData.name || '',
    domain: domain.domain,
    extension: domain.extension,
    type: 'renewal',
    years,
    registrar: 'namecheap',
    registrar_cost: registrarCostFor(pricing, 'renewal') * years,
    customer_price: customerPriceFor(pricing, 'renewal') * years,
    renewal_price: customerPriceFor(pricing, 'renewal'),
    currency: pricing.currency || 'USD',
    status: 'pending',
    domain_id: id,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  });

  return NextResponse.json({
    order: {
      id: ref.id,
      domain: domain.domain,
      type: 'renewal',
      customer_price: customerPriceFor(pricing, 'renewal') * years,
      currency: pricing.currency || 'USD',
      years
    }
  });
}
