import { useEffect, useState } from 'react';
import { applyActionCode } from 'firebase/auth';
import { Link, useSearchParams } from 'react-router-dom';
import { auth, backendError } from '../../backend/firebase';
import { ResetPasswordPage } from './ResetPasswordPage';
import { useUILanguage } from '../../i18n/display';

const actions = new Map<string, Promise<void>>();
export function EmailActionPage() {
  const ar = useUILanguage() === 'ar';
  const [params] = useSearchParams();
  const code = params.get('oobCode') || '';
  const verify = params.get('mode') === 'verifyEmail';
  const [message, setMessage] = useState(ar ? 'جارٍ التحقق من بريدك الإلكتروني…' : 'Verifying your email…');
  useEffect(() => {
    if (!verify) return;
    let active = true;
    if (!code) { setMessage(ar ? 'افتح رابط التحقق من بريدك الإلكتروني.' : 'Open the verification link from your email.'); return; }
    let action = actions.get(code);
    if (!action) { action = applyActionCode(auth, code); actions.set(code, action); }
    action.then(async () => {
      await auth.currentUser?.reload();
      await auth.currentUser?.getIdToken(true);
      if (active) setMessage(ar ? 'تم التحقق من بريدك الإلكتروني. يمكنك الآن تسجيل الدخول.' : 'Your email has been verified. You can now sign in.');
    }).catch(error => {
      if (active) setMessage(['auth/expired-action-code', 'auth/invalid-action-code'].includes(error.code)
        ? ar ? 'انتهت صلاحية رابط التحقق أو تم استخدامه. اطلب رابطًا جديدًا.' : 'This verification link has expired or has already been used. Request a new link.'
        : backendError(error));
    });
    return () => { active = false; };
  }, [verify, code, ar]);
  if (!verify) return <ResetPasswordPage/>;
  return <main dir={ar ? 'rtl' : 'ltr'} className="min-h-screen grid place-items-center p-6"><section className="rounded-2xl border p-8 max-w-md"><h1 className="text-xl font-semibold">{ar ? 'التحقق من البريد الإلكتروني' : 'Email verification'}</h1><p role="status" className="my-4">{message}</p><Link to="/auth/login">{ar ? 'متابعة لتسجيل الدخول' : 'Continue to sign in'}</Link></section></main>;
}
