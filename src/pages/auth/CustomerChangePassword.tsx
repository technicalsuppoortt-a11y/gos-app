import { useState, type FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { backendError, callBackend } from '../../backend/firebase';
import { logoutFirebase } from '../../backend/session';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { translateText, useUILanguage } from '../../i18n/display';
import type { RootState } from '../../store';
import '../commerce/customer-portal.css';

export function CustomerChangePassword() {
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const user = useSelector((state: RootState) => state.auth.user);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const requested = params.get('returnTo') || '';
  const returnTo = /^\/portal(?:\/[\w.%-]+)?$/.test(requested) ? requested : '/portal';
  const login = '/auth/login?' + new URLSearchParams({ portal: '1', email: user?.email || '', redirect: returnTo });
  if (!user?.requiresPasswordChange) return <Navigate to={returnTo} replace/>;

  async function signInAgain() {
    try {
      await logoutFirebase();
      navigate(login, { replace: true });
    } catch (cause) {
      setError(backendError(cause));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || requiresSignIn) return;
    const fields = new FormData(event.currentTarget);
    const newPassword = String(fields.get('newPassword') || '');
    if (newPassword !== fields.get('confirmPassword')) {
      setError(t('The passwords do not match.', 'كلمتا المرور غير متطابقتين.'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      await callBackend('customerPortal', { action: 'changeInitialPassword', newPassword });
      setRequiresSignIn(true);
      await signInAgain();
    } catch (cause) {
      if (['functions/unauthenticated', 'functions/permission-denied'].includes((cause as { code?: string })?.code || '')) setRequiresSignIn(true);
      setError(backendError(cause));
    } finally {
      setBusy(false);
    }
  }

  return <main className="cportal-shell cportal-password-page">
    <header className="cportal-topbar">
      <div className="cportal-brand">
        <span className="cportal-brand-mark"><img src="/upclick-mark.svg" width="32" height="32" alt=""/></span>
        <div>
          <strong>{translateText('Upclick')}</strong>
          <small>{translateText('Customer Portal')}</small>
        </div>
      </div>
      <div className="cportal-actions">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
    <section className="cportal-panel-card cportal-password-card" aria-labelledby="customer-password-title">
      <KeyRound size={24}/>
      <h1 id="customer-password-title" className="mt-3 text-xl font-semibold">{translateText('Change password')}</h1>
      <p className="mt-2">{t('Choose a new password to access your purchases.', 'اختر كلمة مرور جديدة للوصول إلى مشترياتك.')}</p>
      {error && <p className="mt-2 text-rose-600 dark:text-rose-400" role="alert">{ar ? translateText(error) : error}</p>}
      {requiresSignIn ? <button type="button" className="cportal-btn-primary mt-4" onClick={() => void signInAgain()}>{t('Sign in again', 'سجّل الدخول مرة أخرى')}</button>
        : <form className="cportal-account-form" onSubmit={submit}>
          <label>{translateText('New password')}<input type="password" name="newPassword" required minLength={12} maxLength={128} autoComplete="new-password"/></label>
          <label>{t('Confirm new password', 'تأكيد كلمة المرور الجديدة')}<input type="password" name="confirmPassword" required minLength={12} maxLength={128} autoComplete="new-password"/></label>
          <p className="text-sm">{t('Use at least 12 characters, including a letter and a number or symbol.', 'استخدم 12 حرفًا على الأقل، بما فيها حرف ورقم أو رمز.')}</p>
          <button type="submit" className="cportal-btn-primary" disabled={busy}>{busy ? translateText('Saving…') : translateText('Change password')}</button>
        </form>}
    </section>
  </main>;
}
