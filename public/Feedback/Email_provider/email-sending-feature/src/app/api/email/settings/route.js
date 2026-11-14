import { NextResponse } from 'next/server';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import {
  normalizeEmailProviderSettings,
  resolveTenantSenderIdentity,
  buildRequiredDnsRecords,
  hasAwsSesApiCredentials
} from '@/lib/email/tenantSesHelper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;

    const userData = auth.userData || {};
    const businessName =
      userData?.GC?.profile?.name ||
      userData?.businessName ||
      userData?.displayName ||
      userData?.name ||
      '';

    const rawSettings =
      userData?.emailProviderSettings ||
      userData?.GC?.integrations?.emailProvider ||
      {};

    const settings = normalizeEmailProviderSettings(rawSettings, {
      businessName,
      email: auth.email
    });

    if (
      settings.customDomain &&
      Array.isArray(settings.dkimTokens) &&
      settings.dkimTokens.length > 0 &&
      (!settings.records || settings.records.length === 0)
    ) {
      settings.records = buildRequiredDnsRecords(settings.customDomain, settings.dkimTokens);
    }

    const identity = resolveTenantSenderIdentity(settings);

    return NextResponse.json({
      success: true,
      settings,
      identity,
      sesConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
      awsIamConfigured: hasAwsSesApiCredentials()
    });
  } catch (err) {
    console.error('[api/email/settings GET]', err);
    return NextResponse.json({ error: err.message || 'Failed to load email settings' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const userData = auth.userData || {};
    const existing = userData?.emailProviderSettings || {};

    const merged = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString()
    };

    if (
      body.customDomain !== undefined &&
      String(body.customDomain || '').trim().toLowerCase() !== String(existing.customDomain || '').trim().toLowerCase()
    ) {
      merged.domainVerified = false;
      merged.sesIdentityVerified = false;
      merged.dkimTokens = [];
      merged.records = [];
    }

    const settings = normalizeEmailProviderSettings(merged, {
      businessName: userData?.GC?.profile?.name || userData?.displayName || '',
      email: auth.email
    });

    if (auth.adminDb) {
      try {
        await auth.adminDb.collection('users').doc(auth.uid).set(
          {
            emailProviderSettings: settings
          },
          { merge: true }
        );
      } catch (dbErr) {
        console.warn('[api/email/settings PUT] adminDb write skipped:', dbErr.message);
      }
    }

    const identity = resolveTenantSenderIdentity(settings);

    return NextResponse.json({
      success: true,
      settings,
      identity,
      awsIamConfigured: hasAwsSesApiCredentials()
    });
  } catch (err) {
    console.error('[api/email/settings PUT]', err);
    return NextResponse.json({ error: err.message || 'Failed to save email settings' }, { status: 500 });
  }
}
