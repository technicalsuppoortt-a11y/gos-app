import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
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

export async function POST(req, { params }) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const owned = await loadOwned(auth, id);
    if (owned.error) return owned.error;

    const body = await req.json().catch(() => ({}));
    const nameservers = (Array.isArray(body.nameservers) ? body.nameservers : String(body.nameservers || '').split(','))
      .map((n) => String(n || '').trim().toLowerCase())
      .filter(Boolean);

    if (nameservers.length < 2) {
      return NextResponse.json({ error: 'Provide at least two nameservers' }, { status: 400 });
    }

    await NamecheapService.setNameservers({ domain: owned.data.domain, nameservers });
    await owned.ref.set({
      nameservers,
      updated_at: FieldValue.serverTimestamp()
    }, { merge: true });

    return NextResponse.json({ success: true, nameservers });
  } catch (err) {
    console.error('[domains nameservers]', err);
    return NextResponse.json({
      error: publicRegistrarError(err.errors || [{ message: err.message }])
    }, { status: 502 });
  }
}
