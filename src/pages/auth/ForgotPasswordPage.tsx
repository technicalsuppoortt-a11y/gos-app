import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, backendError } from '../../backend/firebase';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Clock, KeyRound, LoaderCircle, Mail, RotateCw, Send, Shield, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { showToast } from '../../utils/toast';
import './login-page.css';
import './auth-recovery.css';

export const ForgotPasswordPage: React.FC = () => {
  useUILanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = React.useState(initialEmail);
  const [busy, setBusy] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  // Timer countdown for resending
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !email) return;

    setBusy(true);
    try { await sendPasswordResetEmail(auth, email.trim(), { url: window.location.origin + '/auth/login' }); setSubmitted(true); setResendCooldown(30); showToast.success('If this account exists, a reset link has been sent.'); } catch (error) { showToast.error(backendError(error)); } finally { setBusy(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || busy) return;
    setBusy(true);
    try { await sendPasswordResetEmail(auth, email.trim(), { url: window.location.origin + '/auth/login' }); setResendCooldown(30); showToast.success('If this account exists, a reset link has been sent.'); } catch (error) { showToast.error(backendError(error)); } finally { setBusy(false); }
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
          className="login-form-content mx-auto w-full max-w-md py-8"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
        >
          {!submitted ? (
            <>
              <div className="login-heading mb-7">
                <div className="login-tenant-pill mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
                  <KeyRound size={13} className="text-indigo-600 dark:text-indigo-400" />
                  {translateText(" ACCOUNT RECOVERY")}
                </div>
                <h1 className="text-3xl font-bold tracking-[-1.2px] text-slate-900 dark:text-white">
                  {translateText("Forgot password?")}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {translateText("No worries, it happens. Enter your registered work email and we'll send you a secure link to reset your password.")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="login-fields space-y-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {translateText("Work email")}
                  <span className="mt-1.5 flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-[#191a27] dark:focus-within:border-indigo-400">
                    <Mail size={17} className="shrink-0 text-slate-400" />
                    <input
                      className="w-full border-0 bg-transparent text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder={translateText("you@yourbusiness.com")}
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                    />
                  </span>
                </label>

                <button
                  className="auth-primary-btn mt-2"
                  type="submit"
                  disabled={busy || !email}
                >
                  {localizeNode(
                    busy ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        {translateText("Sending reset link…")}
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        {translateText("Send Reset Link")}
                      </>
                    )
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  <ArrowLeft size={14} />
                  {translateText("Return to sign in")}
                </button>
                <div className="login-trust mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <BadgeCheck size={15} className="text-emerald-500 dark:text-emerald-400" />
                  {translateText("256-bit encrypted credential recovery")}
                </div>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="auth-feedback-card text-center"
            >
              <div className="mx-auto mb-4 flex justify-center">
                <div className="auth-pulse-icon bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Mail size={26} strokeWidth={2.2} />
                </div>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {translateText("Check your email")}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {translateText("We have sent password reset instructions to:")}
              </p>
              <div className="mt-2 inline-block rounded-lg bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-[#202235] dark:text-indigo-300">
                {email}
              </div>

              <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-start text-xs leading-5 text-slate-600 dark:border-slate-700/80 dark:bg-[#151624] dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {translateText("Didn't receive the email?")}
                </p>
                <p className="mt-1">
                  {translateText("Check your spam folder or make sure you typed the correct address.")}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || busy}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[#191a27] dark:text-slate-200 dark:hover:bg-[#222436]"
                >
                  <RotateCw size={14} className={busy ? 'animate-spin' : ''} />
                  {resendCooldown > 0 ? (
                    <span>
                      {translateText("Resend email in ")}
                      <b className="font-bold text-indigo-600 dark:text-indigo-400">{resendCooldown}s</b>
                    </span>
                  ) : (
                    translateText("Resend email")
                  )}
                </button>



                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  {translateText("← Back to Sign In")}
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
            {translateText("ENTERPRISE SECURITY")}
          </span>
        </div>

        <div className="login-showcase-content relative z-10 mx-auto my-auto w-full max-w-xl py-9">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.55 }}>
            <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold tracking-[.2em] text-violet-200">
              <Sparkles size={14} />
              {translateText("ZERO TRUST ARCHITECTURE")}
            </div>
            <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-1.6px] xl:text-[48px]">
              {translateText("Restoring access,")}<br />
              <span className="bg-gradient-to-r from-violet-200 via-violet-300 to-indigo-300 bg-clip-text text-transparent">
                {translateText("without compromise.")}
              </span>
            </h2>
            <p className="login-hero-description mt-4 max-w-md text-sm leading-6 text-indigo-100/90 dark:text-slate-100 font-normal">
              {translateText("Multi-layer verification ensures your workspace stays secure while letting legitimate team members regain access in seconds.")}
            </p>
          </motion.div>

          <div className="mt-8 space-y-3 max-w-md">
            <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[.08] p-3.5 backdrop-blur-md">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-400/20 text-emerald-300">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <b className="block text-xs font-semibold text-white">{translateText("Cryptographically signed tokens")}</b>
                <p className="mt-0.5 text-[11px] leading-4 text-indigo-100/70">{translateText("Links expire automatically within 15 minutes to prevent unauthorized usage.")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[.08] p-3.5 backdrop-blur-md">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-400/20 text-indigo-300">
                <Shield size={16} />
              </div>
              <div>
                <b className="block text-xs font-semibold text-white">{translateText("Session invalidation")}</b>
                <p className="mt-0.5 text-[11px] leading-4 text-indigo-100/70">{translateText("Active sessions across other devices are automatically revoked upon reset.")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-showcase-footer relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-indigo-100/45">
          <span>{translateText("GOS Identity Protection")}</span>
          <span className="flex items-center gap-1.5">
            <Shield size={12} />
            {translateText("SOC2 Type II Certified")}
          </span>
        </div>
      </motion.aside>
    </main>
  );
};
