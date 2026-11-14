import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/utils/firebaseAdmin';
import emailService from '@/services/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, name, uid } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { adminAuth, adminDb } = await getFirebaseAdmin();

    // 1. Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    // 2. Save OTP code in Firestore user doc safely
    let targetUid = uid;
    if (adminAuth && !targetUid) {
      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        targetUid = userRecord?.uid;
      } catch (uErr) {
        console.warn('[send-verification] Could not find user by email:', uErr.message);
      }
    }

    if (targetUid && adminDb) {
      try {
        await adminDb.collection('users').doc(targetUid).set({
          emailVerificationCode: code,
          emailVerificationExpires: expiresAt
        }, { merge: true });
      } catch (dbErr) {
        console.warn('[send-verification] Could not save code in adminDb:', dbErr.message);
      }
    }

    // 3. Generate fallback verification link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://upklick.net';
    let verificationLink = '';
    if (adminAuth) {
      try {
        verificationLink = await adminAuth.generateEmailVerificationLink(email, {
          url: `${appUrl}/login?verified=true`,
          handleCodeInApp: false
        });
      } catch (lErr) {
        console.warn('[send-verification] Could not generate action link:', lErr.message);
      }
    }

    // 4. Send email with 6-digit OTP code
    const emailResult = await emailService.sendEmailVerification({
      to: email,
      name: name || '',
      code,
      verificationLink
    });

    if (!emailResult.success && !emailResult.simulated) {
      console.warn('[send-verification] Email send warning:', emailResult.error);
      return NextResponse.json({ success: false, warning: 'Failed to send verification email', details: emailResult.error }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      simulated: emailResult.simulated || false
    });
  } catch (error) {
    console.error('[send-verification] Server Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 200 });
  }
}
