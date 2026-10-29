import { useEffect, useState, type FormEvent } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { auth, backendError } from '../../backend/firebase';
import { activateInvitedUser, ActivationError } from '../../backend/adminUsers';
import { store } from '../../store';
import { loginSuccess } from '../../store/slices/authSlice';
import { useUILanguage } from '../../i18n/display';
import './activate-account.css';

export default function ActivateAccountPage() {
  const [params] = useSearchParams();
  return <ActivateAccountForm key={`${params.get('mode')}:${params.get('oobCode')}`}/>;
}

function ActivateAccountForm() {
  const language = useUILanguage();
  const [params] = useSearchParams();
  const ar = (params.get('lang') || language).split('-')[0] === 'ar';
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const navigate = useNavigate();
  const code = params.get('oobCode') || '';
  const mode = params.get('mode');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [success, setSuccess] = useState(false);
  const [planAssigned, setPlanAssigned] = useState<boolean>(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (passwordSaved || success) return;
    let active = true;
    setLoading(true); setLinkError(false); setEmail('');
    if (!code || mode !== 'resetPassword') {
      setLinkError(true); setLoading(false);
      return;
    }
    verifyPasswordResetCode(auth, code).then(value => {
      if (active) { setEmail(value); setLoading(false); }
    }).catch(() => {
      if (active) { setLinkError(true); setLoading(false); }
    });
    return () => { active = false; };
  }, [code, mode, passwordSaved, success]);

  const longEnough = password.length >= 8;
  const matches = confirmation.length > 0 && password === confirmation;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || loading || linkError || !email || !longEnough || !matches) return;
    setBusy(true); setError('');
    try {
      if (!passwordSaved) {
        await confirmPasswordReset(auth, code, password);
        // A retry after a network/activation failure must not consume this code again.
        setPasswordSaved(true);
      }
      const result = await activateInvitedUser({ email, password, afterReset: true });
      setPlanAssigned(result.planAssigned !== false);
      store.dispatch(loginSuccess({ user: result.user, role: result.role, tenant: result.tenant, token: result.token }));
      setPassword(''); setConfirmation(''); setSuccess(true);
    } catch (failure) {
      setError(failure instanceof ActivationError ? failure.localizedMessage() : backendError(failure));
    } finally { setBusy(false); }
  };

  return <main className="gos-activation" dir={ar ? 'rtl' : 'ltr'}>
    <section className="gos-activation-card" aria-labelledby="activation-title">
      <Link to="/" className="gos-activation-brand" aria-label="Upclick">
        <span className="gos-activation-logo" style={{ background: '#EDE9FE' }}><img src="/upclick-mark.svg" width="30" height="32" alt=""/></span>
        <span><b>Upclick</b><small>{t('Ideas to impact', 'من الأفكار إلى الأثر')}</small></span>
      </Link>
      {success ? <div className="gos-activation-success" role="status">
        <span className="gos-activation-state-icon"><CheckCircle2 size={30}/></span>
        {planAssigned ? (
          <>
            <h1 id="activation-title">{t('You’re all set', 'حسابك جاهز')}</h1>
            <p>{t('Your password is saved and your account is active on the Free Plan. Welcome to your workspace.', 'تم حفظ كلمة المرور وتفعيل حسابك بالباقة المجانية. مرحبًا بك في مساحة عملك.')}</p>
            <button type="button" className="gos-activation-primary" onClick={() => navigate('/dashboard', { replace: true })}>{t('Continue to dashboard', 'المتابعة إلى لوحة التحكم')}<ArrowRight size={17}/></button>
          </>
        ) : (
          <>
            <h1 id="activation-title">{t('Account Activated!', 'تم تفعيل الحساب!')}</h1>
            <p>{t('Your account is active! Please select a subscription plan to unlock your workspace tools.', 'تم تفعيل حسابك بنجاح! يرجى اختيار باقة اشتراك لفتح الوصول الكامل لأدوات مساحة عملك.')}</p>
            <button type="button" className="gos-activation-primary" onClick={() => navigate('/dashboard/plans', { replace: true })}>{t('Choose a Subscription Plan', 'اختيار باقة الاشتراك')}<ArrowRight size={17}/></button>
          </>
        )}
      </div> : loading ? <div className="gos-activation-loading" role="status"><LoaderCircle size={25} className="animate-spin"/><p>{t('Checking your invitation…', 'جارٍ التحقق من دعوتك…')}</p></div> : linkError ? <div className="gos-activation-invalid" role="alert">
        <span className="gos-activation-state-icon"><LockKeyhole size={27}/></span>
        <h1 id="activation-title">{t('This link is unavailable', 'هذا الرابط غير متاح')}</h1>
        <p>{t('Your invitation link is missing, expired, or has already been used. Ask your administrator for a new activation link. If you already saved your password, sign in to finish activation.', 'رابط الدعوة غير مكتمل أو انتهت صلاحيته أو تم استخدامه. اطلب رابط تفعيل جديدًا من المسؤول. إذا حفظت كلمة المرور بالفعل، سجّل الدخول لإكمال التفعيل.')}</p>
        <Link to="/auth/login" className="gos-activation-primary">{t('Go to sign in', 'الانتقال إلى تسجيل الدخول')}<ArrowRight size={17}/></Link>
      </div> : <>
        <div className="gos-activation-heading"><span className="gos-activation-eyebrow"><ShieldCheck size={14}/>{t('ACCOUNT ACTIVATION', 'تفعيل الحساب')}</span><h1 id="activation-title">{t('Set up your account', 'إعداد حسابك')}</h1><p>{t('Choose a password to activate your account and open your Upclick workspace.', 'اختر كلمة مرور لتفعيل حسابك وفتح مساحة عملك في Upclick.')}</p></div>
        <div className="gos-activation-account"><span>{t('Your invitation', 'دعوتك')}</span><b dir="ltr">{email}</b></div>
        <form className="gos-activation-form" onSubmit={submit}>
          <div className="gos-activation-field"><label htmlFor="activation-password">{t('New password', 'كلمة المرور الجديدة')}</label><div className="gos-activation-input"><LockKeyhole size={17} aria-hidden="true"/><input id="activation-password" name="new-password" autoComplete="new-password" dir="ltr" type={visible ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} minLength={8} required disabled={busy || passwordSaved} aria-describedby="activation-password-help"/><button type="button" aria-label={visible ? t('Hide password', 'إخفاء كلمة المرور') : t('Show password', 'إظهار كلمة المرور')} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>
          <p id="activation-password-help" className={`gos-activation-help ${longEnough ? 'is-valid' : ''}`}><Check size={13}/>{t('At least 8 characters', '٨ أحرف على الأقل')}</p>
          <div className="gos-activation-field"><label htmlFor="activation-confirmation">{t('Confirm password', 'تأكيد كلمة المرور')}</label><div className="gos-activation-input"><LockKeyhole size={17} aria-hidden="true"/><input id="activation-confirmation" name="confirm-password" autoComplete="new-password" dir="ltr" type={visible ? 'text' : 'password'} value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={busy || passwordSaved} aria-invalid={confirmation.length > 0 && !matches} aria-describedby={confirmation && !matches ? 'activation-match-help' : undefined}/>{matches && <Check size={17} className="gos-activation-match"/>}</div></div>
          {confirmation && !matches && <p id="activation-match-help" className="gos-activation-error">{t('Passwords must match.', 'يجب أن تتطابق كلمتا المرور.')}</p>}
          {error && <div className="gos-activation-error-box" role="alert">{error}{passwordSaved && <p>{t('Your password is saved. Try finishing activation again, or sign in with your new password.', 'تم حفظ كلمة المرور. حاول إكمال التفعيل مجددًا أو سجّل الدخول بكلمة المرور الجديدة.')}</p>}</div>}
          <button className="gos-activation-primary" type="submit" disabled={busy || !longEnough || !matches}>{busy ? <><LoaderCircle size={17} className="animate-spin"/>{t('Setting up your account…', 'جارٍ إعداد حسابك…')}</> : <>{passwordSaved ? t('Finish activation', 'إكمال التفعيل') : t('Save', 'حفظ')}<ArrowRight size={17}/></>}</button>
        </form>
        <p className="gos-activation-signin">{t('Already set your password?', 'هل عيّنت كلمة المرور بالفعل؟')} <Link to="/auth/login">{t('Sign in', 'تسجيل الدخول')}</Link></p>
      </>}
      <footer className="gos-activation-footer"><ShieldCheck size={13}/>{t('Secure account setup', 'إعداد آمن للحساب')}</footer>
    </section>
    <p className="gos-activation-caption">Upclick · {t('Your business, in one workspace.', 'أعمالك في مساحة عمل واحدة.')}</p>
  </main>;
}
