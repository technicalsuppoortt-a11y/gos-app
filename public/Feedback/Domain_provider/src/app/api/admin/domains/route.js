import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/verifyAdminRequest';
import { serializeTs } from '@/lib/domains/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return auth.response;

  const q = String(req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  const snap = await auth.adminDb.collection('domains').get();
  let domains = snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: d.id,
      domain: data.domain,
      extension: data.extension,
      status: data.status,
      user_id: data.user_id,
      user_email: data.user_email || '',
      user_name: data.user_name || '',
      registrar: data.registrar || 'namecheap',
      registrar_domain_id: data.registrar_domain_id || '',
      registration_price: data.registration_price,
      renewal_price: data.renewal_price,
      registered_at: data.registered_at,
      expires_at: data.expires_at,
      auto_renew: data.auto_renew !== false,
      nameservers: data.nameservers || [],
      created_at: serializeTs(data.created_at)
    };
  });
  if (q) {
    domains = domains.filter((d) =>
      `${d.domain} ${d.user_email} ${d.user_name} ${d.user_id}`.toLowerCase().includes(q)
    );
  }
  domains.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return NextResponse.json({ domains });
}
