import { NextResponse } from 'next/server';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import {
  cleanDomain,
  isValidDomainName,
  isValidEmailAddress,
  ensureAndVerifyTenantDomain,
  ensureAndVerifyTenantEmailAddress,
  normalizeEmailProviderSettings,
  resolveTenantSenderIdentity
} from '@/lib/email/tenantSesHelper';
import { NamecheapService } from '@/lib/domains/namecheap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const verifyType = body.type === 'email' ? 'email' : 'domain';

    // Mode 1: Verify a Single Email Address in AWS SES (sends verification link to customer's email)
    if (verifyType === 'email') {
      const emailToVerify = String(body.email || '').trim().toLowerCase();
      if (!isValidEmailAddress(emailToVerify)) {
        return NextResponse.json(
          { error: 'Please enter a valid email address (e.g. name@yourdomain.com)' },
          { status: 400 }
        );
      }

      const emailVerification = await ensureAndVerifyTenantEmailAddress(emailToVerify);
      const existingSettings = auth.userData?.emailProviderSettings || {};
      const updatedSettings = normalizeEmailProviderSettings(
        {
          ...existingSettings,
          mode: 'email_identity',
          verifiedSenderEmail: emailToVerify,
          customFromEmail: emailToVerify,
          replyToEmail: existingSettings.replyToEmail || emailToVerify,
          emailIdentityVerified: emailVerification.emailVerified,
          updatedAt: new Date().toISOString()
        },
        {
          businessName: auth.userData?.GC?.profile?.name || auth.userData?.displayName || '',
          email: auth.email
        }
      );

      if (auth.adminDb) {
        try {
          await auth.adminDb.collection('users').doc(auth.uid).set(
            { emailProviderSettings: updatedSettings },
            { merge: true }
          );
        } catch {}
      }

      const identity = resolveTenantSenderIdentity(updatedSettings);
      return NextResponse.json({
        success: true,
        type: 'email',
        email: emailToVerify,
        emailVerified: emailVerification.emailVerified,
        verificationEmailSent: emailVerification.verificationEmailSent,
        settings: updatedSettings,
        identity
      });
    }

    // Mode 2: Verify a Full Custom Domain in AWS SES (DKIM CNAMEs + SPF)
    const domain = cleanDomain(body.domain || auth.userData?.emailProviderSettings?.customDomain || '');
    const autoConfigureDns = Boolean(body.autoConfigureDns);

    if (!domain || !isValidDomainName(domain)) {
      return NextResponse.json(
        { error: 'Please enter a valid domain name (e.g. yourbrand.com)' },
        { status: 400 }
      );
    }

    // Check if the customer owns this domain inside UpKlick's Namecheap domains collection
    let ownedDomainDoc = null;
    if (auth.adminDb) {
      try {
        const domSnap = await auth.adminDb
          .collection('domains')
          .where('user_id', '==', auth.uid)
          .get();
        ownedDomainDoc = domSnap.docs.find(
          (d) => cleanDomain(d.data()?.domain) === domain
        );
      } catch {
        // Ignore query errors
      }
    }

    const verification = await ensureAndVerifyTenantDomain(auth.uid, domain);
    let autoConfigured = false;
    let autoConfigureError = null;

    // If requested and domain is managed in UpKlick via Namecheap, automatically push AWS SES DKIM & SPF records
    if (autoConfigureDns) {
      try {
        const existingRecords = await NamecheapService.getDnsRecords(domain);
        const filtered = (existingRecords || []).filter((r) => {
          const host = String(r.name || '').toLowerCase();
          if (host.includes('_domainkey') || host === '_amazonses') return false;
          if (r.type === 'TXT' && String(r.address || '').includes('amazonses.com')) return false;
          return true;
        });

        const sesDnsRecords = verification.records.map((rec) => ({
          name: rec.host,
          type: rec.type,
          address: rec.value,
          mxPref: '10',
          ttl: rec.ttl || '1799'
        }));

        await NamecheapService.setDnsRecords(domain, [...filtered, ...sesDnsRecords]);
        autoConfigured = true;
      } catch (dnsErr) {
        autoConfigureError = dnsErr.message || 'Could not auto-configure DNS via registrar';
      }
    }

    const existingSettings = auth.userData?.emailProviderSettings || {};
    const customFromLocal = body.customFromLocal || existingSettings.customFromLocal || 'hello';
    const updatedSettings = normalizeEmailProviderSettings(
      {
        ...existingSettings,
        mode: 'custom_domain',
        customDomain: domain,
        customFromLocal,
        customFromEmail: `${customFromLocal}@${domain}`,
        domainVerified: verification.domainVerified,
        sesIdentityVerified: Boolean(verification.sesIdentityVerified),
        dkimTokens: verification.dkimTokens,
        records: verification.records,
        updatedAt: new Date().toISOString()
      },
      {
        businessName: auth.userData?.GC?.profile?.name || auth.userData?.displayName || '',
        email: auth.email
      }
    );

    if (auth.adminDb) {
      try {
        await auth.adminDb.collection('users').doc(auth.uid).set(
          {
            emailProviderSettings: updatedSettings
          },
          { merge: true }
        );
      } catch (dbErr) {
        console.warn('[api/email/verify-domain POST] adminDb write skipped:', dbErr.message);
      }
    }

    const identity = resolveTenantSenderIdentity(updatedSettings);

    return NextResponse.json({
      success: true,
      type: 'domain',
      domain,
      dkimStatus: verification.dkimStatus,
      domainVerified: verification.domainVerified,
      records: verification.records,
      ownedInUpklick: Boolean(ownedDomainDoc),
      autoConfigured,
      autoConfigureError,
      settings: updatedSettings,
      identity
    });
  } catch (err) {
    console.error('[api/email/verify-domain POST]', err);
    return NextResponse.json({ error: err.message || 'Domain verification failed' }, { status: 500 });
  }
}
