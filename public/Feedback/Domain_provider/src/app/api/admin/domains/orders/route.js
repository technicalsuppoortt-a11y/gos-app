import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/verifyAdminRequest';
import { serializeTs } from '@/lib/domains/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return auth.response;
  const status = String(req.nextUrl.searchParams.get('status') || '').trim();
  const snap = await auth.adminDb.collection('domain_orders').get();
  let orders = snap.docs.map((d) => {
    const data = d.data() || {};
    const registrarCost = Number(data.registrar_cost_actual ?? data.registrar_cost) || 0;
    const customer = Number(data.customer_price) || 0;
    return {
      id: d.id,
      domain: data.domain,
      extension: data.extension,
      type: data.type,
      status: data.status,
      user_id: data.user_id,
      user_email: data.user_email || '',
      user_name: data.user_name || '',
      registrar_cost: registrarCost,
      customer_price: customer,
      profit: Math.round((customer - registrarCost) * 100) / 100,
      error_public: data.error_public || '',
      error_internal: data.error_internal || '',
      error_code: data.error_code || '',
      payment_id: data.payment_id || '',
      stripeSessionId: data.stripeSessionId || '',
      created_at: serializeTs(data.created_at),
      updated_at: serializeTs(data.updated_at)
    };
  });
  if (status) orders = orders.filter((o) => o.status === status);
  orders.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return NextResponse.json({ orders });
}
