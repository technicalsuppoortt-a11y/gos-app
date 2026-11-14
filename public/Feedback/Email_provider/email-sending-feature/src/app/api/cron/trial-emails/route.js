import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/utils/firebaseAdmin';
import emailService from '@/services/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron / Background route to process automated trial emails.
 * Can be triggered daily via Vercel Cron, external cron ping, or Admin dashboard.
 */
export async function GET(req) {
  return handleTrialEmails();
}

export async function POST(req) {
  return handleTrialEmails();
}

async function handleTrialEmails() {
  try {
    const { adminDb } = await getFirebaseAdmin();

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin DB not initialized' }, { status: 500 });
    }

    const now = new Date();
    const usersSnapshot = await adminDb.collection('users').get();

    let welcomeSentCount = 0;
    let days7SentCount = 0;
    let endedSentCount = 0;
    let processedUsersCount = 0;
    const errors = [];

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      processedUsersCount++;

      if (!user.email) continue;

      // Skip users who have an active paid subscription / non-trial status if explicitly set
      if (user.subscriptionStatus === 'active' || user.isTrial === false) {
        continue;
      }

      // Determine trial start timestamp
      const trialStartRaw = user.trialStartedAt || user.createdAt;
      if (!trialStartRaw) continue;

      const trialStartDate = new Date(trialStartRaw);
      if (isNaN(trialStartDate.getTime())) continue;

      // Calculate elapsed days
      const elapsedMs = now.getTime() - trialStartDate.getTime();
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

      // 1. Email 1: Welcome Email (fallback for users created without welcome email)
      if (!user.trialWelcomeEmailSent && elapsedDays < 8) {
        try {
          const res = await emailService.sendTrialWelcomeEmail({
            to: user.email,
            name: user.name || ''
          });
          if (res.success) {
            await doc.ref.update({ trialWelcomeEmailSent: true });
            welcomeSentCount++;
          }
        } catch (err) {
          errors.push({ email: user.email, stage: 'welcome', error: err.message });
        }
      }

      // 2. Email 2: 7 Days Remaining (Triggered at Day 8 - Day 14 of trial)
      if (elapsedDays >= 8 && elapsedDays < 15 && !user.trial7DaysEmailSent) {
        try {
          const res = await emailService.sendTrial7DaysLeftEmail({
            to: user.email,
            name: user.name || ''
          });
          if (res.success) {
            await doc.ref.update({ trial7DaysEmailSent: true });
            days7SentCount++;
          }
        } catch (err) {
          errors.push({ email: user.email, stage: '7days', error: err.message });
        }
      }

      // 3. Email 3: Trial Ended (Triggered at Day 15+)
      if (elapsedDays >= 15 && !user.trialEndedEmailSent) {
        try {
          const res = await emailService.sendTrialEndedEmail({
            to: user.email,
            name: user.name || ''
          });
          if (res.success) {
            await doc.ref.update({ trialEndedEmailSent: true, isTrialExpired: true });
            endedSentCount++;
          }
        } catch (err) {
          errors.push({ email: user.email, stage: 'ended', error: err.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        totalProcessedUsers: processedUsersCount,
        welcomeSent: welcomeSentCount,
        days7LeftSent: days7SentCount,
        trialEndedSent: endedSentCount,
        errorCount: errors.length
      },
      errors
    });
  } catch (error) {
    console.error('[cron/trial-emails] Unhandled error during cron processing:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
