import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Circle, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { loginSuccess } from '../../store/slices/authSlice';
import { emptySetup, mockPasswordDigest, updateOnboarding, useOnboarding } from './onboarding-store';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { Toggle } from '../../components/ui/Toggle';
import './onboarding.css';

export function ActivationPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const dispatch = useDispatch();
  const ar = useSelector((s: RootState) => s.ui.language === 'ar'); const t = (en: string, arabic: string) => ar ? arabic : en;
  const { invites } = useOnboarding(); const invite = invites.find(i => i.id === params.get('invite'));
  const [password, setPassword] = React.useState(''), [confirm, setConfirm] = React.useState('');
  const [visible, setVisible] = React.useState(false), [verified, setVerified] = React.useState(false), [mfa, setMfa] = React.useState(false);
  const [error, setError] = React.useState(''), [busy, setBusy] = React.useState(false);
  const rules = [password.length >= 8, /[A-Z]/.test(password) && /[a-z]/.test(password), /[0-9]/.test(password)];
  const strength = rules.filter(Boolean).length;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!invite || busy) return;
    if (!rules.every(Boolean)) { setError(t('Use at least 8 characters, uppercase and lowercase letters, and a number.', 'استخدم ٨ أحرف على الأقل، تتضمن حروفاً كبيرة وصغيرة ورقماً.')); return; }
    if (password !== confirm) { setError(t('Your passwords do not match.', 'كلمتا المرور غير متطابقتين.')); return; }
    if (!verified) { setError(t('Confirm your email ownership to continue.', 'أكد ملكيتك للبريد الإلكتروني للمتابعة.')); return; }
    setBusy(true); setError('');
    try {
      const passwordDigest = await mockPasswordDigest(password, invite.id);
      updateOnboarding(s => ({ invites: s.invites.map(i => i.id === invite.id ? { ...i, status: 'Activated', mfa, passwordDigest } : i), setups: { ...s.setups, [invite.email]: { ...emptySetup(), language: ar ? 'ar' : 'en' } } }));
      dispatch(loginSuccess({ user: { id: invite.id, email: invite.email, name: invite.email.split('@')[0] }, role: invite.role, tenant: { id: invite.id, name: t('Your workspace', 'مساحة عملك') }, token: `mock-${invite.id}` }));
      setPassword(''); setConfirm(''); navigate('/onboarding', { replace: true });
    } catch { setError(t('Activation could not finish. Please try again.', 'تعذر إتمام التفعيل. حاول مرة أخرى.')); setBusy(false); }
  };
  return <main className="ob-root ob-activation" dir={ar ? 'rtl' : 'ltr'}>
    <header className="ob-top"><Link to="/" className="ob-brand"><span>g</span>gos<span className="ob-brand-dot">.</span></Link><span className="ob-top-center"><ShieldCheck size={15}/>{t('Your secure beginning', 'بداية آمنة لمساحتك')}</span><div className="ob-preferences"><LanguageSwitcher/><ThemeToggle/><Link to="/auth/login">{t('Back to sign in', 'العودة لتسجيل الدخول')}</Link></div></header>
    <div className="ob-activation-grid">
      <aside className="ob-activation-art"><span className="ob-eyebrow">{t('A NEW CHAPTER FOR YOUR BUSINESS', 'فصل جديد لنشاطك')}</span><h1>{t('Less setup.', 'إعداد أبسط.')}<br/>{t('More possibility.', 'إمكانات أكبر.')}</h1><p>{t('One connected workspace for your customers, your team, and your next big idea.', 'مساحة عمل متكاملة لعملائك وفريقك وفكرتك الكبيرة القادمة.')}</p>
        <div className="ob-art-window"><div className="ob-window-dots">● ● ● <span>{t('YOUR GROWTH WORKSPACE', 'مساحتك للنمو')}</span></div><div className="ob-art-welcome"><span className="ob-orb"><Sparkles/></span><h3>{t('Everything clicks into place.', 'كل شيء في مكانه الصحيح.')}</h3><p>{t('Designed around the way you work.', 'مصممة لتناسب أسلوب عملك.')}</p></div><div className="ob-art-tiles">{[['Your brand', 'هويتك', 'Make it unmistakably yours', 'اجعلها تعكس شخصيتك'], ['Your tools', 'أدواتك', 'Bring everything together', 'اجمع كل شيء في مكان واحد'], ['Your growth', 'نموك', 'Let AI handle the busywork', 'دع الذكاء الاصطناعي يتولى المهام']].map(([en, arabic, detail, detailAr], i) => <div key={en}>0{i + 1}<b>{t(en, arabic)}</b><small>{t(detail, detailAr)}</small></div>)}</div></div><div className="ob-art-footer"><ShieldCheck size={17}/>{t('Your business. Your data. Your control.', 'نشاطك. بياناتك. تحت سيطرتك.')}</div>
      </aside>
      <section className="ob-activation-form">
        {!invite ? <><span className="ob-orb"><LockKeyhole/></span><h1>{t('You’re one invite away.', 'دعوة واحدة تفصلك عن البداية.')}</h1><p>{t('Open the personal activation link provided by your workspace administrator.', 'افتح رابط التفعيل الشخصي الذي أرسله مسؤول مساحة العمل.')}</p><Link className="ob-primary" to="/admin/users">{t('Go to user management', 'الانتقال لإدارة المستخدمين')}<ArrowRight size={16}/></Link></> : invite.status === 'Activated' ? <><span className="ob-orb success"><Check/></span><h1>{t('Your account is activated.', 'تم تفعيل حسابك.')}</h1><p>{t('Continue with your existing session or sign in to access your workspace.', 'تابع بجلستك الحالية أو سجل الدخول للوصول إلى مساحتك.')}</p><Link className="ob-primary" to="/onboarding">{t('Continue setup', 'متابعة الإعداد')}<ArrowRight size={16}/></Link><Link className="ob-text-link" to="/auth/login">{t('Sign in', 'تسجيل الدخول')}</Link></> :
        <form onSubmit={submit}><span className="ob-badge"><Sparkles size={13}/>{t('YOU’RE INVITED', 'أنت مدعو')}</span><h1>{t('Make yourself at home.', 'مرحباً بك في مساحتك.')}</h1><p>{t('Activate your account. Your new workspace is waiting.', 'فعّل حسابك. مساحة عملك الجديدة بانتظارك.')}</p>
          <div className="ob-email-card"><span className="ob-avatar">{invite.email.slice(0, 2).toUpperCase()}</span><div><b dir="ltr">{invite.email}</b><small>{t(invite.role === 'ADMIN' ? 'Workspace admin' : 'Team member', invite.role === 'ADMIN' ? 'مسؤول مساحة العمل' : 'عضو الفريق')} · {t('Invitation confirmed', 'الدعوة مؤكدة')}</small></div><ShieldCheck size={20}/></div>
          <label className="ob-field">{t('Create password', 'إنشاء كلمة المرور')}<div className="ob-password"><input required autoComplete="new-password" aria-describedby="password-strength" aria-invalid={!!password && strength < 3} type={visible ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder={t('At least 8 characters', '٨ أحرف على الأقل')}/><button type="button" className="ob-icon" aria-label={t(visible ? 'Hide password' : 'Show password', visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
          <div className="ob-strength" id="password-strength"><div className="ob-strength-bars" role="meter" aria-label={t('Password strength', 'قوة كلمة المرور')} aria-valuemin={0} aria-valuemax={3} aria-valuenow={strength}>{[1, 2, 3].map(i => <span key={i} className={i <= strength ? `strength-${strength}` : ''}/>)}</div><small>{t(!password ? 'Choose a strong password' : strength === 3 ? 'Strong password' : strength === 2 ? 'Almost there' : 'Keep strengthening it', !password ? 'اختر كلمة مرور قوية' : strength === 3 ? 'كلمة مرور قوية' : strength === 2 ? 'اقتربت من المطلوب' : 'زد قوة كلمة المرور')}</small></div>
          <div className="ob-password-rules">{[t('8+ characters', '٨ أحرف أو أكثر'), t('Aa letters', 'حروف كبيرة وصغيرة'), t('One number', 'رقم واحد')].map((rule, i) => <span key={rule} className={rules[i] ? 'met' : ''}>{rules[i] ? <Check size={12}/> : <Circle size={10}/>} {rule}</span>)}</div>
          <label className="ob-field">{t('Confirm password', 'تأكيد كلمة المرور')}<input autoComplete="new-password" required type="password" aria-invalid={!!confirm && password !== confirm} value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} placeholder={t('Enter your password again', 'أدخل كلمة المرور مرة أخرى')}/>{confirm && <small className={password === confirm ? 'ob-match' : 'ob-mismatch'}>{t(password === confirm ? 'Passwords match' : 'Passwords do not match yet', password === confirm ? 'كلمتا المرور متطابقتان' : 'كلمتا المرور غير متطابقتين بعد')}</small>}</label>
          <label className="ob-checkbox"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)}/>{t('I confirm this email belongs to me.', 'أؤكد أن هذا البريد الإلكتروني يخصني.')}</label>
          <div className="ob-connection"><span className="ob-orb"><ShieldCheck size={19}/></span><div><b>{t('Extra peace of mind', 'حماية إضافية لحسابك')}</b><small>{t('Enable multi-factor authentication', 'تفعيل المصادقة متعددة العوامل')}</small></div><Toggle checked={mfa} label={t('Multi-factor authentication', 'المصادقة متعددة العوامل')} onChange={setMfa}/></div>
          {mfa && <p className="ob-callout">{t('MFA preference enabled for this demo. A real authenticator would be linked here.', 'تم تفعيل خيار المصادقة للتجربة. يتم ربط تطبيق المصادقة في هذه الخطوة لاحقاً.')}</p>}{error && <p role="alert" className="ob-error">{error}</p>}
          <button className="ob-primary ob-full" type="submit" disabled={busy}>{busy && <LoaderCircle size={16} className="animate-spin"/>}{t(busy ? 'Activating account…' : 'Activate & set up workspace', busy ? 'جارٍ تفعيل الحساب…' : 'تفعيل الحساب وإعداد المساحة')}<ArrowRight size={17}/></button><p className="ob-demo-note"><LockKeyhole size={13}/>{t('Demo activation · Passwords are never stored.', 'تفعيل تجريبي · لا يتم تخزين كلمات المرور.')}</p>
        </form>}
      </section>
    </div>
  </main>;
}
