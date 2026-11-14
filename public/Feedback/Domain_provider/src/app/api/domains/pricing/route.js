import { NextResponse } from 'next/server';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import { listPricing, toPublicPricing } from '@/lib/domains/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;
    const rows = await listPricing(auth.adminDb, { enabledOnly: true });
    return NextResponse.json({
      currency: 'USD',
      pricing: rows.map(toPublicPricing).filter(Boolean)
    });
  } catch (err) {
    console.error('[domains/pricing]', err);
    return NextResponse.json({ error: 'Could not load domain pricing' }, { status: 500 });
  }
}
