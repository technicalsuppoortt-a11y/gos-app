import { NextResponse } from 'next/server';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import { NamecheapService } from '@/lib/domains/namecheap';
import { publicRegistrarError } from '@/lib/domains/xml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadOwned(auth, id) {
  const snap = await auth.adminDb.collection('domains').doc(id).get();
  if (!snap.exists) return { error: NextResponse.json({ error: 'Domain not found' }, { status: 404 }) };
  const data = snap.data();
  if (data.user_id !== auth.uid) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ref: snap.ref, data };
}

export async function GET(req, { params }) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const owned = await loadOwned(auth, id);
    if (owned.error) return owned.error;
    const records = await NamecheapService.getDnsRecords(owned.data.domain);
    return NextResponse.json({ records });
  } catch (err) {
    console.error('[domains dns GET]', err);
    return NextResponse.json({
      error: publicRegistrarError(err.errors || [{ message: err.message }])
    }, { status: 502 });
  }
}

export async function POST(req, { params }) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const owned = await loadOwned(auth, id);
    if (owned.error) return owned.error;
    const body = await req.json().catch(() => ({}));
    const records = Array.isArray(body.records) ? body.records : [];
    await NamecheapService.setDnsRecords(owned.data.domain, records);
    const next = await NamecheapService.getDnsRecords(owned.data.domain);
    return NextResponse.json({ success: true, records: next });
  } catch (err) {
    console.error('[domains dns POST]', err);
    return NextResponse.json({
      error: publicRegistrarError(err.errors || [{ message: err.message }])
    }, { status: 502 });
  }
}
