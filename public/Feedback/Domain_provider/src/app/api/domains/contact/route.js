import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import { validateContacts } from '@/lib/domains/fulfillOrder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIELDS = ['firstName', 'lastName', 'organization', 'address1', 'address2', 'city', 'state', 'postalCode', 'country', 'phone', 'email'];

export async function GET(req) {
  const auth = await verifyUserRequest(req);
  if (!auth.ok) return auth.response;
  const snap = await auth.adminDb.collection('domain_contacts').doc(auth.uid).get();
  const data = snap.exists ? snap.data() : {};
  const contact = {};
  FIELDS.forEach((k) => { contact[k] = data[k] || ''; });
  if (!contact.email) contact.email = auth.email || '';
  if (!contact.country) contact.country = 'US';
  return NextResponse.json({ contact });
}

export async function PUT(req) {
  const auth = await verifyUserRequest(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({}));
  const contact = {};
  FIELDS.forEach((k) => { contact[k] = String(body[k] || '').trim(); });
  if (!contact.email) contact.email = auth.email || '';
  const missing = validateContacts(contact);
  if (missing.length) {
    return NextResponse.json({ error: `Missing: ${missing.join(', ')}`, missing }, { status: 400 });
  }
  await auth.adminDb.collection('domain_contacts').doc(auth.uid).set({
    ...contact,
    updated_at: FieldValue.serverTimestamp()
  }, { merge: true });
  return NextResponse.json({ success: true, contact });
}
