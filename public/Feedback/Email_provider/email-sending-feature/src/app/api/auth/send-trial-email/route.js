import { NextResponse } from 'next/server';
import emailService from '@/services/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manual API Route to trigger specific trial emails for testing or direct admin dispatch.
 * 
 * Payload:
 * {
 *   "email": "user@example.com",
 *   "name": "User Name",
 *   "type": "welcome" | "7days" | "ended"
 * }
 */
export async function POST(req) {
  try {
    const { email, name, type, dashboardUrl, pricingUrl } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const emailType = (type || 'welcome').toLowerCase();
    let result;

    switch (emailType) {
      case 'welcome':
      case 'email1':
        result = await emailService.sendTrialWelcomeEmail({
          to: email,
          name: name || '',
          dashboardUrl
        });
        break;

      case '7days':
      case '7daysleft':
      case 'email2':
        result = await emailService.sendTrial7DaysLeftEmail({
          to: email,
          name: name || '',
          dashboardUrl
        });
        break;

      case 'ended':
      case 'trialended':
      case 'email3':
        result = await emailService.sendTrialEndedEmail({
          to: email,
          name: name || '',
          pricingUrl
        });
        break;

      default:
        return NextResponse.json({
          error: `Invalid email type '${type}'. Valid types: 'welcome', '7days', 'ended'.`
        }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        type: emailType,
        message: `Trial email ('${emailType}') successfully sent to ${email}`,
        data: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        type: emailType,
        error: result.error || 'Failed to send trial email',
        simulated: result.simulated
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[send-trial-email] Error sending trial email:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
