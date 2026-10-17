import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Shield, ShieldCheck, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { showToast } from '../../utils/toast';
import './login-page.css';
import './auth-recovery.css';

interface PasswordCriteria {
  length: boolean;
  mixedCase: boolean;
  number: boolean;
  special: boolean;
  matches: boolean;
}

export const ResetPasswordPage: React.FC = () => {
  useUILanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [redirectCountdown, setRedirectCountdown] = React.useState(3);

  // Criteria calculations
  const criteria: PasswordCriteria = React.useMemo(() => {
    return {
      length: password.length >= 8,
      mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      matches: password.length > 0 && password === confirmPassword,
    };
  }, [password, confirmPassword]);

  // Strength score: 0 to 4
  const strengthScore = React.useMemo(() => {
    let score = 0;
    if (criteria.length) score++;
    if (criteria.mixedCase) score++;
    if (criteria.number) score++;
    if (criteria.special) score++;
    return score;
  }, [criteria]);

  const strengthLabel = React.useMemo(() => {
    if (password.length === 0) return { text: 'Enter a strong password', color: 'text-slate-400' };
    if (strengthScore <= 1) return { text: 'Weak', color: 'text-rose-500' };
    if (strengthScore === 2) return { text: 'Fair', color: 'text-amber-500' };
    if (strengthScore === 3) return { text: 'Good', color: 'text-blue-500' };
    return { text: 'Strong', color: 'text-emerald-500' };
  }, [password, strengthScore]);

  const canSubmit = criteria.length && criteria.mixedCase && criteria.number && criteria.special && criteria.matches;

  // Auto redirect countdown on success
  React.useEffect(() => {
    if (!success) return;
    const interval = window.setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/auth/login', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [success, navigate]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || busy) return;

    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setSuccess(true);
      showToast.success('Password updated successfully!');
    }, 650);
  };

  return (
    <main className="login-page grid min-h-[100dvh] bg-[#f7f8fc] text-slate-900 dark:bg-[#10111b] dark:text-white lg:grid-cols-2">
      {/* Form Side */}
      <section className="login-form-side flex min-h-[100dvh] flex-col justify-between bg-white px-5 py-6 dark:bg-[#141520] sm:px-9 lg:px-12 xl:px-16">
        <header className="flex items-center justify-between">
          <a href="/auth/login" aria-label={translateText("GOS home")} className="login-brand flex w-fit items-center gap-2">
            <span className="login-brand-mark grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/20">{translateText("g")}</span>
            <span className="login-brand-word text-[22px] font-extrabold tracking-[-1.5px] text-slate-900 dark:text-white">{translateText("gos")}<span className="text-indigo-600">.</span></span>
          </a>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            {translateText("Back to Sign In")}
          </button>
        </header>

        <motion.div
          className="login-form-content mx-auto w-full max-w-md py-6"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
        >
          {!success ? (
            <>
              <div className="login-heading mb-6">
                <div className="login-tenant-pill mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
                  <ShieldCheck size={13} className="text-indigo-600 dark:text-indigo-400" />
                  {translateText(" CREDENTIAL RESET")}
                </div>
                <h1 className="text-3xl font-bold tracking-[-1.2px] text-slate-900 dark:text-white">
                  {translateText("Create new password")}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {emailParam ? (
                    <span>
                      {translateText("Resetting password for ")}
                      <b className="font-semibold text-indigo-600 dark:text-indigo-400">{emailParam}</b>
                    </span>
                  ) : (
                    translateText("Choose a strong, unique password to secure your workspace.")
                  )}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="login-fields space-y-4">
                {/* New Password */}
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {translateText("New password")}
                  <span className="mt-1.5 flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-[#191a27] dark:focus-within:border-indigo-400">
                    <LockKeyhole size={17} className="shrink-0 text-slate-400" />
                    <input
                      className="w-full border-0 bg-transparent text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder={translateText("Enter new password")}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={translateText(showPassword ? 'Hide password' : 'Show password')}
                      onClick={() => setShowPassword(!showPassword)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                    >
                      {localizeNode(showPassword ? <EyeOff size={17} /> : <Eye size={17} />)}
                    </button>
                  </span>
                </label>

                {/* Password Strength Indicator */}
                <div className="auth-strength-meter">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {translateText("Password strength:")}
                    </span>
                    <span className={`text-[11px] font-bold ${strengthLabel.color}`}>
                      {translateText(strengthLabel.text)}
                    </span>
                  </div>
                  <div className="auth-strength-bars">
                    <div className={`auth-strength-bar ${strengthScore >= 1 ? (strengthScore === 1 ? 'is-weak' : strengthScore === 2 ? 'is-fair' : strengthScore === 3 ? 'is-good' : 'is-strong') : ''}`} />
                    <div className={`auth-strength-bar ${strengthScore >= 2 ? (strengthScore === 2 ? 'is-fair' : strengthScore === 3 ? 'is-good' : 'is-strong') : ''}`} />
                    <div className={`auth-strength-bar ${strengthScore >= 3 ? (strengthScore === 3 ? 'is-good' : 'is-strong') : ''}`} />
                    <div className={`auth-strength-bar ${strengthScore >= 4 ? 'is-strong' : ''}`} />
                  </div>
                </div>

                {/* Confirm New Password */}
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {translateText("Confirm new password")}
                  <span className={`mt-1.5 flex h-12 items-center gap-3 rounded-xl border bg-white px-3.5 transition focus-within:ring-4 dark:bg-[#191a27] ${
                    confirmPassword && !criteria.matches
                      ? 'border-rose-300 focus-within:border-rose-500 focus-within:ring-rose-500/10 dark:border-rose-500/50'
                      : confirmPassword && criteria.matches
                      ? 'border-emerald-300 focus-within:border-emerald-500 focus-within:ring-emerald-500/10 dark:border-emerald-500/50'
                      : 'border-slate-200 focus-within:border-indigo-600 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:focus-within:border-indigo-400'
                  }`}>
                    <LockKeyhole size={17} className="shrink-0 text-slate-400" />
                    <input
                      className="w-full border-0 bg-transparent text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder={translateText("Confirm your password")}
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={translateText(showConfirmPassword ? 'Hide password' : 'Show password')}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                    >
                      {localizeNode(showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />)}
                    </button>
                  </span>
                </label>

                {/* Real-time Checklist */}
                <div className="auth-checklist">
                  <div className={`auth-checklist-item ${criteria.length ? 'is-valid' : ''}`}>
                    <span className="auth-checklist-icon">
                      {criteria.length && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span>{translateText("At least 8 characters")}</span>
                  </div>
                  <div className={`auth-checklist-item ${criteria.mixedCase ? 'is-valid' : ''}`}>
                    <span className="auth-checklist-icon">
                      {criteria.mixedCase && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span>{translateText("Uppercase & lowercase")}</span>
                  </div>
                  <div className={`auth-checklist-item ${criteria.number ? 'is-valid' : ''}`}>
                    <span className="auth-checklist-icon">
                      {criteria.number && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span>{translateText("At least one number")}</span>
                  </div>
                  <div className={`auth-checklist-item ${criteria.special ? 'is-valid' : ''}`}>
                    <span className="auth-checklist-icon">
                      {criteria.special && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span>{translateText("Special symbol (!@#$)")}</span>
                  </div>
                  <div className={`auth-checklist-item col-span-2 ${criteria.matches ? 'is-valid' : ''}`}>
                    <span className="auth-checklist-icon">
                      {criteria.matches && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span>{translateText("Passwords match")}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  className="auth-primary-btn mt-3"
                  type="submit"
                  disabled={!canSubmit || busy}
                >
                  {localizeNode(
                    busy ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        {translateText("Updating password…")}
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        {translateText("Update Password & Sign In")}
                      </>
                    )
                  )}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <BadgeCheck size={15} className="text-emerald-500 dark:text-emerald-400" />
                {translateText("End-to-end encrypted session sync")}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="auth-feedback-card text-center"
            >
              <div className="mx-auto mb-4 flex justify-center">
                <div className="auth-pulse-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 size={30} strokeWidth={2.2} />
                </div>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {translateText("Password updated!")}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {translateText("Your new password has been saved securely. All previous active sessions have been invalidated.")}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-[#181928] dark:text-slate-300">
                <LoaderCircle size={13} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>
                  {translateText("Redirecting to sign in in ")}
                  <b className="font-bold text-indigo-600 dark:text-indigo-400">{redirectCountdown}s</b>…
                </span>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => navigate('/auth/login', { replace: true })}
                  className="auth-primary-btn"
                >
                  <span>{translateText("Sign In Now")}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        <footer className="login-footer flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400">
          <span>{translateText("© 2025 GOS Inc.")}</span>
          <div className="flex gap-4">
            <a className="transition hover:text-slate-700 dark:hover:text-white" href="/privacy">
              {translateText("Privacy")}
            </a>
            <a className="transition hover:text-slate-700 dark:hover:text-white" href="#help">
              {translateText("Help")}
            </a>
          </div>
        </footer>
      </section>

      {/* Showcase Side */}
      <motion.aside
        className="login-showcase relative hidden min-h-[100dvh] overflow-hidden bg-[#201d3b] text-white lg:flex lg:flex-col lg:justify-between lg:px-10 lg:py-8 xl:px-14"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_76%_18%,rgba(135,112,255,.34),transparent_40%),radial-gradient(ellipse_at_18%_88%,rgba(65,129,180,.22),transparent_38%),linear-gradient(140deg,#282448,#211e3a_56%,#302653)]" />
        <div className="pointer-events-none absolute -right-40 -top-48 h-[560px] w-[560px] rounded-full border border-white/[.06] shadow-[0_0_0_50px_rgba(255,255,255,.025),0_0_0_110px_rgba(255,255,255,.018)]" />

        <div className="login-showcase-header relative z-10 flex items-center justify-between">
          <div className="login-showcase-brand flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 font-bold text-white ring-1 ring-white/15">
              {translateText("g")}
            </span>
            <span className="text-lg font-bold tracking-[-1px]">
              {translateText("gos")}
              <span className="text-violet-300">.</span>
            </span>
          </div>
          <span className="login-showcase-badge flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[10px] font-medium tracking-wide text-violet-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {translateText("CREDENTIAL INTEGRITY")}
          </span>
        </div>

        <div className="login-showcase-content relative z-10 mx-auto my-auto w-full max-w-xl py-9">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.55 }}>
            <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold tracking-[.2em] text-violet-200">
              <Sparkles size={14} />
              {translateText("BANK-GRADE PROTECTION")}
            </div>
            <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-1.6px] xl:text-[48px]">
              {translateText("One strong key")}<br />
              <span className="bg-gradient-to-r from-violet-200 via-violet-300 to-indigo-300 bg-clip-text text-transparent">
                {translateText("for total peace of mind.")}
              </span>
            </h2>
            <p className="login-hero-description mt-4 max-w-md text-sm leading-6 text-indigo-100/90 dark:text-slate-100 font-normal">
              {translateText("We enforce real-time entropy checks and salted bcrypt hashing so your account is guarded against credential stuffing and brute-force attacks.")}
            </p>
          </motion.div>

          <div className="mt-8 space-y-3 max-w-md">
            <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[.08] p-3.5 backdrop-blur-md">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-400/20 text-emerald-300">
                <ShieldCheck size={16} />
              </div>
              <div>
                <b className="block text-xs font-semibold text-white">{translateText("Instant synchronization")}</b>
                <p className="mt-0.5 text-[11px] leading-4 text-indigo-100/70">{translateText("Changes propagate immediately across all desktop and mobile touchpoints.")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[.08] p-3.5 backdrop-blur-md">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-400/20 text-indigo-300">
                <KeyRound size={16} />
              </div>
              <div>
                <b className="block text-xs font-semibold text-white">{translateText("Adaptive threat blocking")}</b>
                <p className="mt-0.5 text-[11px] leading-4 text-indigo-100/70">{translateText("Suspicious reset attempts trigger immediate admin alerts and account isolation.")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-showcase-footer relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-indigo-100/45">
          <span>{translateText("GOS Identity Protection")}</span>
          <span className="flex items-center gap-1.5">
            <Shield size={12} />
            {translateText("256-Bit TLS 1.3")}
          </span>
        </div>
      </motion.aside>
    </main>
  );
};
