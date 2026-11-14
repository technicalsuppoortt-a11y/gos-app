import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUserRequest } from '@/lib/auth/verifyUserRequest';
import emailService from '@/services/email';
import {
  isValidEmailAddress,
  normalizeEmailProviderSettings,
  resolveTenantSenderIdentity
} from '@/lib/email/tenantSesHelper';
import { sanitizeCampaignHtml, unsubscribeUrl } from '@/lib/outreach/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function personalizeRecipientText(template, recipient = {}, senderIdentity = {}) {
  const name = recipient.name || recipient.email?.split('@')[0] || 'Client';
  const email = recipient.email || '';
  const phone = recipient.phone || '';
  const company = recipient.company || senderIdentity.brandName || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://upklick.net';

  return String(template || '')
    .replaceAll('{{name}}', name)
    .replaceAll('{{email}}', email)
    .replaceAll('{{phone}}', phone)
    .replaceAll('{{company}}', company)
    .replaceAll('{{dashboard_url}}', appUrl);
}

function stripHtmlTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req) {
  try {
    const auth = await verifyUserRequest(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const {
      isTest = false,
      campaignName = '',
      subject = '',
      htmlBody = '',
      textBody = '',
      actionUrl = '',
      actionText = '',
      recipients = [],
      senderOverrides = {},
      emailDesign = null
    } = body;

    if (!String(subject || '').trim()) {
      return NextResponse.json({ error: 'Email subject is required' }, { status: 400 });
    }
    if (!String(htmlBody || textBody || '').trim()) {
      return NextResponse.json({ error: 'Email content is required' }, { status: 400 });
    }

    // Normalize recipients list
    const rawList = Array.isArray(recipients) ? recipients : [];
    const validRecipients = [];
    const seenEmails = new Set();

    for (const item of rawList) {
      const email = String(typeof item === 'string' ? item : item?.email || '')
        .trim()
        .toLowerCase();
      if (!isValidEmailAddress(email) || seenEmails.has(email)) continue;
      seenEmails.add(email);
      validRecipients.push({
        id: item?.id || email,
        name: String(item?.name || '').trim(),
        email,
        phone: String(item?.phone || '').trim(),
        stage: String(item?.stage || '').trim()
      });
    }

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one valid recipient email address' },
        { status: 400 }
      );
    }

    if (validRecipients.length > 250) {
      return NextResponse.json(
        { error: 'Maximum 250 recipients per campaign batch' },
        { status: 400 }
      );
    }

    // Load customer's saved Email Provider Settings (prefer client-supplied settings if adminDb was unavailable)
    const userData = auth.userData || {};
    const rawSettings = {
      ...(userData?.GC?.integrations?.emailProvider || {}),
      ...(userData?.emailProviderSettings || {}),
      ...(body.settings || {})
    };

    const settings = normalizeEmailProviderSettings(rawSettings, {
      businessName: userData?.GC?.profile?.name || userData?.displayName || '',
      email: auth.email
    });

    const senderIdentity = resolveTenantSenderIdentity(settings, senderOverrides);
    const campaignId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let sentCount = 0;
    let failedCount = 0;
    let simulatedCount = 0;
    const deliveryResults = [];

    for (const recipient of validRecipients) {
      const unsubLink = unsubscribeUrl(`${auth.uid}:${recipient.email}`);
      const personalizedSubject = personalizeRecipientText(subject, recipient, senderIdentity);
      const rawHtml = sanitizeCampaignHtml(htmlBody || `<p>${textBody}</p>`);
      const personalizedHtml = personalizeRecipientText(rawHtml, recipient, senderIdentity).replaceAll(
        '{{unsubscribe_url}}',
        unsubLink
      );
      const plainText = textBody
        ? personalizeRecipientText(textBody, recipient, senderIdentity)
        : stripHtmlTags(personalizedHtml);

      const res = await emailService.sendCampaignEmail({
        to: recipient.email,
        name: recipient.name,
        subject: personalizedSubject,
        messageHtml: personalizedHtml,
        text: plainText,
        unsubscribeUrl: unsubLink,
        actionUrl: actionUrl || null,
        actionText: actionText || null,
        campaignId,
        fromName: senderIdentity.fromName,
        fromEmail: senderIdentity.fromEmail,
        replyTo: senderIdentity.replyTo,
        brandName: senderIdentity.brandName,
        brandLogoUrl: senderIdentity.brandLogoUrl,
        footerText: senderIdentity.footerText
      });

      if (res.success) {
        sentCount += 1;
        deliveryResults.push({
          email: recipient.email,
          name: recipient.name,
          status: 'sent',
          messageId: res.data?.messageId || null
        });
      } else if (res.simulated) {
        simulatedCount += 1;
        sentCount += 1;
        deliveryResults.push({
          email: recipient.email,
          name: recipient.name,
          status: 'simulated',
          note: 'SMTP credentials not set in local env; simulated send succeeded.'
        });
      } else {
        failedCount += 1;
        deliveryResults.push({
          email: recipient.email,
          name: recipient.name,
          status: 'failed',
          error: res.error || 'Failed to send'
        });
      }
    }

    // Record campaign in customer's subcollection (unless it's a single preview test from builder)
    let savedCampaign = null;
    if (!isTest) {
      const campaignDoc = {
        id: campaignId,
        name: String(campaignName || subject).trim(),
        subject: String(subject).trim(),
        fromName: senderIdentity.fromName,
        fromEmail: senderIdentity.fromEmail,
        replyTo: senderIdentity.replyTo || '',
        sendingMode: senderIdentity.mode,
        totalRecipients: validRecipients.length,
        sent: sentCount,
        failed: failedCount,
        simulated: simulatedCount,
        status: failedCount === validRecipients.length ? 'failed' : 'completed',
        htmlBody: String(htmlBody || '').slice(0, 150000),
        emailDesign: emailDesign || null,
        recipientsSample: deliveryResults.slice(0, 50),
        createdAt: new Date().toISOString(),
        createdAtServer: FieldValue.serverTimestamp()
      };

      if (auth.adminDb) {
        try {
          await auth.adminDb
            .collection('users')
            .doc(auth.uid)
            .collection('email_campaigns')
            .doc(campaignId)
            .set(campaignDoc);
        } catch (dbErr) {
          console.warn('[api/email/send POST] adminDb campaign save skipped:', dbErr.message);
        }
      }

      savedCampaign = campaignDoc;
    }

    if (sentCount === 0 && failedCount > 0) {
      return NextResponse.json(
        {
          error: deliveryResults[0]?.error || 'Failed to send email via AWS SES',
          results: deliveryResults
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaignId,
      sent: sentCount,
      failed: failedCount,
      simulated: simulatedCount > 0,
      senderIdentity,
      campaign: savedCampaign,
      results: deliveryResults
    });
  } catch (err) {
    console.error('[api/email/send POST]', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch email' }, { status: 500 });
  }
}

