import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const auth = await verifyUserRequest(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const snap = await auth.adminDb.collection('domains').doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
  if (snap.data().user_id !== auth.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const autoRenew = Boolean(body.auto_renew);
  await snap.ref.set({
    auto_renew: autoRenew,
    updated_at: FieldValue.serverTimestamp()
  }, { merge: true });
  return NextResponse.json({ success: true, auto_renew: autoRenew });
}
