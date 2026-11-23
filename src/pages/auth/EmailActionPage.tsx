import { useEffect, useState } from 'react';
import { applyActionCode } from 'firebase/auth';
import { Link, useSearchParams } from 'react-router-dom';
import { auth, backendError } from '../../backend/firebase';
import { portalActionReturn, ResetPasswordPage } from './ResetPasswordPage';
import { translateText, uiDirection, useUILanguage } from '../../i18n/display';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';

const actions = new Map<string, Promise<void>>();
export function EmailActionPage() {
  const uiLang = useUILanguage();
  const ar = uiLang.startsWith('ar');
  const [params] = useSearchParams();
  const code = params.get('oobCode') || '';
  const verify = params.get('mode') === 'verifyEmail';
  const portalReturn = portalActionReturn(params.get('continueUrl'));
  const login = '/auth/login' + (portalReturn ? '?' + new URLSearchParams({ portal: '1', redirect: portalReturn }) : '');
  const [statusKey, setStatusKey] = useState<'verifying' | 'missing' | 'verified' | 'expired' | 'custom'>('verifying');
  const [customMessage, setCustomMessage] = useState('');
  useEffect(() => {
    if (!verify) return;
    let active = true;
    if (!code) { setStatusKey('missing'); return; }
    let action = actions.get(code);
    if (!action) { action = applyActionCode(auth, code); actions.set(code, action); }
    action.then(async () => {
      await auth.currentUser?.reload();
      await auth.currentUser?.getIdToken(true);
      if (active) setStatusKey('verified');
    }).catch(error => {
      if (!active) return;
      if (['auth/expired-action-code', 'auth/invalid-action-code'].includes(error.code)) {
        setStatusKey('expired');
      } else {
        setCustomMessage(backendError(error));
        setStatusKey('custom');
      }
    });
    return () => { active = false; };
  }, [verify, code]);
  if (!verify) return <ResetPasswordPage/>;
  const message = statusKey === 'verifying'
    ? (ar ? 'جارٍ التحقق من بريدك الإلكتروني…' : translateText('Verifying your email…'))
    : statusKey === 'missing'
    ? (ar ? 'افتح رابط التحقق من بريدك الإلكتروني.' : translateText('Open the verification link from your email.'))
    : statusKey === 'verified'
    ? (ar ? 'تم التحقق من بريدك الإلكتروني. يمكنك الآن تسجيل الدخول.' : translateText('Your email has been verified. You can now sign in.'))
    : statusKey === 'expired'
    ? (ar ? 'انتهت صلاحية رابط التحقق أو تم استخدامه. اطلب رابطًا جديدًا.' : translateText('This verification link has expired or has already been used. Request a new link.'))
    : translateText(customMessage);
  return <main lang={uiLang} dir={uiDirection()} className="min-h-screen grid place-items-center p-6">
    <section className="rounded-2xl border p-8 max-w-md w-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">{ar ? 'التحقق من البريد الإلكتروني' : translateText('Email verification')}</h1>
        <LanguageSwitcher />
      </div>
      <p role="status" className="my-4">{message}</p>
      <Link to={login}>{ar ? 'متابعة لتسجيل الدخول' : translateText('Continue to sign in')}</Link>
    </section>
  </main>;
}
