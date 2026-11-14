import { NextResponse } from 'next/server';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import { serializeTs } from '@/lib/domains/constants';
import { NamecheapService } from '@/lib/domains/namecheap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadOwned(auth, id) {
  const snap = await auth.adminDb.collection('domains').doc(id).get();
  if (!snap.exists) return { error: NextResponse.json({ error: 'Domain not found' }, { status: 404 }) };
  const data = snap.data();
  if (data.user_id !== auth.uid) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { snap, data };
}

export async function GET(req, { params }) {
  const auth = await verifyUserRequest(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const owned = await loadOwned(auth, id);
  if (owned.error) return owned.error;

  let live = null;
  try {
    live = await NamecheapService.getDomainInfo(owned.data.domain);
  } catch (err) {
    console.warn('[domains/:id info]', err.message);
  }

  return NextResponse.json({
    domain: {
      id,
      domain: owned.data.domain,
      extension: owned.data.extension,
      status: owned.data.status,
      registrar: owned.data.registrar || 'namecheap',
      registrar_domain_id: owned.data.registrar_domain_id || '',
      registration_price: owned.data.registration_price,
      renewal_price: owned.data.renewal_price,
      registered_at: owned.data.registered_at,
      expires_at: live?.expiredDate || owned.data.expires_at,
      auto_renew: owned.data.auto_renew !== false,
      nameservers: live?.nameservers?.length ? live.nameservers : (owned.data.nameservers || []),
      created_at: serializeTs(owned.data.created_at),
      updated_at: serializeTs(owned.data.updated_at)
    }
  });
}
