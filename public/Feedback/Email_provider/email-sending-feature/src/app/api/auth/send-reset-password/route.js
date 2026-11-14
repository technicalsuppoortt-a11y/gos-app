import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/utils/firebaseAdmin';
import emailService from '@/services/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const { adminAuth, adminDb } = await getFirebaseAdmin();

    // 1. Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    let userName = '';
    let targetUid = null;

    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUserByEmail(cleanEmail);
        targetUid = userRecord.uid;
        userName = userRecord.displayName || '';
      } catch (uErr) {
        console.warn('[send-reset-password] User not found in Firebase Auth:', uErr.message);
      }
    }

    // Fallback Firestore search by email if targetUid is still null
    if (!targetUid && adminDb) {
      try {
        const snap = await adminDb.collection('users').where('email', '==', cleanEmail).get();
        if (!snap.empty) {
          targetUid = snap.docs[0].id;
          userName = snap.docs[0].data()?.name || '';
        }
      } catch (fErr) {
        console.warn('[send-reset-password] Firestore email query error:', fErr.message);
      }
    }

    if (!targetUid) {
      return NextResponse.json({ 
        success: false, 
        error: 'لم يتم العثور على حساب مسجل بهذا البريد الإلكتروني. يرجى التأكد من البريد أو إنشاء حساب جديد.' 
      }, { status: 404 });
    }

    // Save OTP code in Firestore user doc
    if (adminDb) {
      try {
        await adminDb.collection('users').doc(targetUid).set({
          resetPasswordCode: code,
          resetPasswordExpires: expiresAt
        }, { merge: true });
      } catch (dbErr) {
        console.warn('[send-reset-password] Could not save code in adminDb:', dbErr.message);
      }
    }

    // 2. Generate fallback Firebase password reset link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://upklick.net';
    let resetLink = '';
    if (adminAuth) {
      try {
        resetLink = await adminAuth.generatePasswordResetLink(cleanEmail, {
          url: `${appUrl}/login`,
          handleCodeInApp: false
        });
      } catch (lErr) {
        console.warn('[send-reset-password] Action link error:', lErr.message);
      }
    }

    // 3. Send email via emailService (Amazon SES)
    const emailResult = await emailService.sendPasswordResetEmail({
      to: cleanEmail,
      name: userName,
      code,
      resetLink
    });

    if (!emailResult.success && !emailResult.simulated) {
      console.warn('[send-reset-password] Email send warning:', emailResult.error);
      return NextResponse.json({ 
        success: false, 
        error: 'تعذر إرسال البريد الإلكتروني حالياً. يرجى التأكد من كتابة البريد بشكل صحيح أو المحاولة لاحقاً.',
        details: emailResult.error 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset code sent successfully',
      simulated: emailResult.simulated || false
    });
  } catch (error) {
    console.error('[send-reset-password] Server Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
