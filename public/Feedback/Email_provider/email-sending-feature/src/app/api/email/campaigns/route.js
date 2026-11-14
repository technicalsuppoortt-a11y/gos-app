import { NextResponse } from 'next/server';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;

    if (!auth.adminDb) {
      return NextResponse.json({ success: true, campaigns: [] });
    }

    const col = auth.adminDb
      .collection('users')
      .doc(auth.uid)
      .collection('email_campaigns');

    let snap;
    try {
      snap = await col.orderBy('createdAt', 'desc').limit(50).get();
    } catch {
      try {
        snap = await col.limit(50).get();
      } catch {
        return NextResponse.json({ success: true, campaigns: [] });
      }
    }

    const campaigns = snap.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        name: d.name || d.subject || 'Untitled Campaign',
        subject: d.subject || '',
        fromName: d.fromName || '',
        fromEmail: d.fromEmail || '',
        replyTo: d.replyTo || '',
        sendingMode: d.sendingMode || 'instant',
        totalRecipients: Number(d.totalRecipients || 0),
        sent: Number(d.sent || 0),
        failed: Number(d.failed || 0),
        status: d.status || 'completed',
        htmlBody: d.htmlBody || '',
        emailDesign: d.emailDesign || null,
        recipientsSample: d.recipientsSample || [],
        createdAt: d.createdAt || new Date().toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      campaigns
    });
  } catch (err) {
    console.error('[api/email/campaigns GET]', err);
    return NextResponse.json({ error: err.message || 'Failed to load campaigns' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    await auth.adminDb
      .collection('users')
      .doc(auth.uid)
      .collection('email_campaigns')
      .doc(id)
      .delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/email/campaigns DELETE]', err);
    return NextResponse.json({ error: err.message || 'Failed to delete campaign' }, { status: 500 });
  }
}

