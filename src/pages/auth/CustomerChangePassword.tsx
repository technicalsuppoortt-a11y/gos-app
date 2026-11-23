import { useState, type FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { backendError } from '../../backend/firebase';
import {
  INITIAL_CUSTOMER_PORTAL_PASSWORD,
  resolveCustomerPrimaryPortalPath,
} from '../../backend/customerPortal';
import {
  completeCustomerFirstLoginPasswordChange,
  logoutFirebase,
} from '../../backend/session';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { translateText, useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import type { RootState } from '../../store';
import '../commerce/customer-portal.css';

export function CustomerChangePassword() {
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => (ar ? arabic : translateText(en));
  const user = useSelector((state: RootState) => state.auth.user);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  const requested = params.get('returnTo') || '';
  const returnTo = /^\/portal(?:\/[\w.%-]+)?$/.test(requested) ? requested : '/portal';
  const login =
    '/auth/login?' +
    new URLSearchParams({
      portal: '1',
      email: user?.email || '',
      redirect: returnTo,
    });

  const mustChange = Boolean(user?.requiresPasswordChange || user?.mustChangePassword);
  if (!mustChange && !busy) {
    return <Navigate to={returnTo} replace />;
  }

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

    if (newPassword.length < 8) {
      setError(
        t(
          'Password must be at least 8 characters long.',
          'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.'
        )
      );
      return;
    }
    if (newPassword === INITIAL_CUSTOMER_PORTAL_PASSWORD) {
      setError(
        t(
          'Please choose a new password different from the initial password (12345678).',
          'يرجى اختيار كلمة مرور جديدة مختلفة عن كلمة المرور المبدئية (12345678).'
        )
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('The passwords do not match.', 'كلمتا المرور غير متطابقتين.'));
      return;
    }

    setError('');
    setBusy(true);
    try {
      const updatedSession = await completeCustomerFirstLoginPasswordChange(newPassword);
      const targetProductPage = await resolveCustomerPrimaryPortalPath(
        updatedSession.user.id,
        updatedSession.user.email,
        returnTo
      );
      showToast.success(
        t(
          'Password updated successfully. Redirecting to your product…',
          'تم تحديث كلمة المرور بنجاح. جاري نقلك إلى صفحة المنتج…'
        )
      );
      navigate(targetProductPage, { replace: true });
    } catch (cause) {
      const code = (cause as { code?: string })?.code || '';
      if (['functions/unauthenticated', 'unauthenticated'].includes(code)) {
        setRequiresSignIn(true);
      }
      setError(backendError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      dir={ar ? 'rtl' : 'ltr'}
      lang={ar ? 'ar' : 'en'}
      className="cportal-shell cportal-password-page"
    >
      <header className="cportal-topbar">
        <div className="cportal-brand-lockup">
          <img
            src="/upclick-mark.svg"
            width="32"
            height="32"
            alt="Upklick"
            className="cportal-brand-logo shrink-0"
          />
          <div className="cportal-brand-text">
            <span className="cportal-brand-name">
              {translateText('Upklick')}
            </span>
            <span className="cportal-brand-divider" aria-hidden="true" />
            <span className="cportal-portal-badge">
              {t('Customer Portal', 'بوابة العملاء')}
            </span>
          </div>
        </div>
        <div className="cportal-actions">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <section
        className="cportal-panel-card cportal-password-card"
        aria-labelledby="customer-password-title"
      >
        <div className="cportal-password-header">
          <div className="cportal-key-icon">
            <KeyRound size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <h1 id="customer-password-title" className="cportal-card-title">
              {t('Set Your New Password', 'تعيين كلمة المرور الجديدة')}
            </h1>
            <p className="cportal-card-subtitle">
              {t('First-time login security setup', 'إعداد أمان الحساب لأول تسجيل دخول')}
            </p>
          </div>
        </div>

        <p className="cportal-password-intro">
          {t(
            'For your account security, please replace your initial password before opening your product.',
            'لحماية حسابك، يرجى تغيير كلمة المرور المبدئية قبل فتح صفحة المنتج الخاص بك.'
          )}
        </p>

        {user?.email && (
          <div className="cportal-email-pill">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span className="cportal-email-label">{t('Account:', 'الحساب:')}</span>
            <bdi>{user.email}</bdi>
          </div>
        )}

        {error && (
          <div className="cportal-password-error" role="alert">
            <span>{ar ? translateText(error) : error}</span>
          </div>
        )}

        {requiresSignIn ? (
          <button
            type="button"
            className="cportal-btn-primary cportal-submit-btn mt-5 flex h-11 w-full items-center justify-center font-semibold"
            onClick={() => void signInAgain()}
          >
            {t('Sign in again', 'سجّل الدخول مرة أخرى')}
          </button>
        ) : (
          <form className="cportal-password-form" onSubmit={submit}>
            <div className="cportal-field-group">
              <label htmlFor="customer-new-password" className="cportal-field-label">
                {t('New password', 'كلمة المرور الجديدة')}
              </label>
              <div className="cportal-password-input-wrap">
                <input
                  id="customer-new-password"
                  type={showNew ? 'text' : 'password'}
                  name="newPassword"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={e => {
                    setNewPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={t('At least 8 characters', '8 أحرف على الأقل')}
                  className="cportal-password-input"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew(v => !v)}
                  aria-label={t(
                    showNew ? 'Hide password' : 'Show password',
                    showNew ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                  )}
                  className="cportal-password-toggle"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="cportal-field-group">
              <label htmlFor="customer-confirm-password" className="cportal-field-label">
                {t('Confirm new password', 'تأكيد كلمة المرور الجديدة')}
              </label>
              <div className="cportal-password-input-wrap">
                <input
                  id="customer-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={t('Re-enter your new password', 'أعد كتابة كلمة المرور الجديدة')}
                  className="cportal-password-input"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={t(
                    showConfirm ? 'Hide password' : 'Show password',
                    showConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                  )}
                  className="cportal-password-toggle"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <p className="cportal-password-hint">
              {t(
                'Use at least 8 characters and make sure it differs from the initial password (12345678).',
                'استخدم 8 أحرف على الأقل وتأكد من اختلافها عن كلمة المرور المبدئية (12345678).'
              )}
            </p>

            <button
              type="submit"
              className="cportal-btn-primary cportal-submit-btn"
              disabled={busy}
            >
              {busy && <Loader2 size={16} className="animate-spin shrink-0" />}
              <span>
                {busy
                  ? t('Updating password…', 'جاري تحديث كلمة المرور…')
                  : t('Save Password & Open Product', 'حفظ كلمة المرور وفتح المنتج')}
              </span>
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
