import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import { resolveStripeSecret, stripeClient } from '@/lib/stripe/secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    if (!orderId) return NextResponse.json({ error: 'Missing order' }, { status: 400 });

    const orderRef = auth.adminDb.collection('domain_orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const order = orderSnap.data();
    if (order.user_id !== auth.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (['completed', 'processing'].includes(order.status)) {
      return NextResponse.json({ error: 'This order is already being processed' }, { status: 409 });
    }
    if (order.status === 'refunded') {
      return NextResponse.json({ error: 'This order was refunded' }, { status: 400 });
    }

    const secretKey = await resolveStripeSecret(auth.adminDb, auth.userData.adminId || '');
    if (!secretKey) {
      return NextResponse.json({ error: 'Card payments are not configured. Contact support.' }, { status: 400 });
    }

    const stripe = stripeClient(secretKey);
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const currency = String(order.currency || 'usd').toLowerCase();
    const amount = Math.round(Number(order.customer_price) * 100);
    if (!amount || amount < 50) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const label = order.type === 'renewal'
      ? `Domain renewal: ${order.domain}`
      : `Domain registration: ${order.domain}`;

    const domainMetadata = {
      kind: 'domain',
      domainOrderId: orderId,
      userId: String(auth.uid),
      adminId: String(auth.userData.adminId || ''),
      domain: order.domain,
      amount: String(order.customer_price),
      currency: currency.toUpperCase()
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: label,
            description: `${order.years || 1} year · ${order.domain}`
          },
          unit_amount: amount
        },
        quantity: 1
      }],
      mode: 'payment',
      client_reference_id: String(auth.uid),
      customer_email: auth.userData.email || undefined,
      payment_intent_data: {
        metadata: domainMetadata
      },
      success_url: `${origin}/dashboard?stripe=success&kind=domain&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?stripe=cancel&kind=domain`,
      metadata: domainMetadata
    });

    await orderRef.set({
      stripeSessionId: session.id,
      updated_at: FieldValue.serverTimestamp()
    }, { merge: true });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('[domains/checkout]', err);
    return NextResponse.json({ error: err.message || 'Could not start checkout' }, { status: 500 });
  }
}
