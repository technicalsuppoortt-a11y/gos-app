import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/admin/verifyAdminRequest';
import { fulfillDomainOrder } from '@/lib/domains/fulfillOrder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const snap = await auth.adminDb.collection('domain_orders').doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  const order = snap.data();
  if (order.status === 'completed') {
    return NextResponse.json({ success: true, message: 'Already completed' });
  }
  if (!['failed', 'paid', 'processing', 'pending'].includes(order.status)) {
    return NextResponse.json({ error: `Cannot retry status ${order.status}` }, { status: 400 });
  }

  await snap.ref.set({
    status: 'paid',
    retry_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  }, { merge: true });

  const result = await fulfillDomainOrder(auth.adminDb, {
    orderId: id,
    paymentId: order.payment_id || '',
    stripeSessionId: order.stripeSessionId || ''
  });

  return NextResponse.json({ success: Boolean(result.ok), result });
}
