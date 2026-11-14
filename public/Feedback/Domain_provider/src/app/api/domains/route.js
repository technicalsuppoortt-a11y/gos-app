import { NextResponse } from 'next/server';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import { serializeTs } from '@/lib/domains/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serializeDomain(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    domain: data.domain,
    extension: data.extension,
    status: data.status,
    registrar: data.registrar || 'namecheap',
    registration_price: data.registration_price,
    renewal_price: data.renewal_price,
    registered_at: data.registered_at || serializeTs(data.created_at),
    expires_at: data.expires_at,
    auto_renew: data.auto_renew !== false,
    nameservers: data.nameservers || [],
    created_at: serializeTs(data.created_at),
    updated_at: serializeTs(data.updated_at)
  };
}

export async function GET(req) {
  const auth = await verifyUserRequest(req);
  if (!auth.ok) return auth.response;
  const snap = await auth.adminDb.collection('domains').where('user_id', '==', auth.uid).get();
  const domains = snap.docs.map(serializeDomain)
    .sort((a, b) => String(a.domain || '').localeCompare(String(b.domain || '')));
  return NextResponse.json({ domains });
}
