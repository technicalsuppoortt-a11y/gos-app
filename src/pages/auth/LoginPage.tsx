import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, ArrowUpRight, BadgeCheck, Building2, CalendarDays, Check, Eye, EyeOff, LayoutDashboard, LoaderCircle, LockKeyhole, Mail, Shield, Sparkles, UserRound, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { authenticateDemo } from '../../data/mockData';
import { loginSuccess, type Role } from '../../store/slices/authSlice';
import type { RootState } from '../../store';
import { showToast } from '../../utils/toast';
import './login-page.css';
import { authenticateInvitedUser } from '../onboarding/onboarding-store';

const destination: Record<Role, string> = {
  SUPER_ADMIN: '/super-admin',
  ADMIN: '/admin',
  USER: '/dashboard',
};

const quickAccounts = [
  { label: 'Super Admin', short: 'Platform', email: 'superadmin@brand.com', role: 'SUPER_ADMIN', icon: Shield },
  { label: 'Admin', short: 'Workspace', email: 'admin@brand.com', role: 'ADMIN', icon: Building2 },
  { label: 'User', short: 'Team member', email: 'user@brand.com', role: 'USER', icon: UserRound },
] as const;

export const LoginPage: React.FC = () => {
  useUILanguage();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useSelector((state: RootState) => state.auth);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const selectedAccount = quickAccounts.find(account => account.email === email)?.role;

  React.useEffect(() => {
    if (auth.isAuthenticated && auth.role) navigate(destination[auth.role], { replace: true });
  }, [auth.isAuthenticated, auth.role, navigate]);

  const quickFill = (account: typeof quickAccounts[number]) => {
    setEmail(account.email);
    setPassword('12345678');
    setError('');
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    window.setTimeout(async () => {
      const session = authenticateDemo(email, password) || await authenticateInvitedUser(email, password).catch(() => null);
      if (!session) {
        setBusy(false);
        const errStr = 'Invalid credentials. Please try again.';
        setError(errStr);
        showToast.error(errStr);
        return;
      }
      showToast.success(`Welcome back, ${session.user.name}!`);
      dispatch(loginSuccess(session));
      const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      const canOpenRequestedPath = session.role === 'SUPER_ADMIN'
        ? requestedPath?.startsWith('/super-admin') || requestedPath?.startsWith('/dashboard')
        : session.role === 'ADMIN'
          ? requestedPath?.startsWith('/admin') || requestedPath?.startsWith('/dashboard')
          : requestedPath?.startsWith('/dashboard');
      navigate(canOpenRequestedPath ? requestedPath! : destination[session.role], { replace: true });
    }, 420);
  };

  return <main className="login-page grid min-h-[100dvh] bg-[#f7f8fc] text-slate-900 dark:bg-[#10111b] dark:text-white lg:grid-cols-2">
    <section className="login-form-side flex min-h-[100dvh] flex-col bg-white px-5 py-5 dark:bg-[#141520] sm:px-9 lg:px-12 xl:px-16">
      <a href="/auth/login" aria-label={translateText("GOS home")} className="login-brand flex w-fit items-center gap-2">
        <span className="login-brand-mark grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/20">{translateText("g")}</span>
        <span className="login-brand-word text-[22px] font-extrabold tracking-[-1.5px] text-slate-900 dark:text-white">{translateText("gos")}<span className="text-indigo-600">.</span></span>
      </a>

      <motion.div className="login-form-content mx-auto my-auto w-full max-w-md py-7" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42, ease: 'easeOut' }}>
        <div className="login-heading mb-7">
          <div className="login-tenant-pill mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>{translateText(" NORTHSTAR STUDIO WORKSPACE")}</div>
          <h1 className="text-3xl font-bold tracking-[-1.2px] text-slate-900 dark:text-white">{translateText("Welcome back")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{translateText("Sign in to keep your business moving.")}</p>
        </div>

        {localizeNode(error && <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{localizeNode(error)}</motion.div>)}

        <form onSubmit={submit} className="login-fields space-y-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{translateText("Work email")}<span className="mt-1.5 flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-[#191a27] dark:focus-within:border-indigo-400">
              <Mail size={17} className="shrink-0 text-slate-400"/><input className="w-full border-0 bg-transparent text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" type="email" required autoComplete="username" placeholder={translateText("you@yourbusiness.com")} value={email} onChange={event => setEmail(event.target.value)}/>
            </span>
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{translateText("Password")}<span className="mt-1.5 flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-[#191a27] dark:focus-within:border-indigo-400">
              <LockKeyhole size={17} className="shrink-0 text-slate-400"/><input className="w-full border-0 bg-transparent text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="current-password" placeholder={translateText("Enter your password")} value={password} onChange={event => setPassword(event.target.value)}/><button type="button" aria-label={translateText(showPassword ? 'Hide password' : 'Show password')} onClick={() => setShowPassword(!showPassword)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"><>{localizeNode(showPassword ? <EyeOff size={17}/> : <Eye size={17}/>)}</></button>
            </span>
          </label>
          <div className="login-options flex items-center justify-between pt-0.5 text-xs">
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-indigo-600"/>{translateText(" Keep me signed in")}</label>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              {translateText("Forgot password?")}
            </button>
          </div>
          <button className="login-submit flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80" type="submit" disabled={busy}>
            {localizeNode(busy ? <><LoaderCircle size={17} className="animate-spin"/>{translateText(" Signing you in…")}</> : <>{translateText("Sign in to your workspace ")}<ArrowRight size={16}/></>)}
          </button>
        </form>

        <div className="login-demo-heading mb-3 mt-6 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700"/><span className="whitespace-nowrap text-[10px] font-bold tracking-[.13em] text-slate-400 dark:text-slate-300">{translateText("DEMO ACCOUNTS QUICK ACCESS")}</span><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700"/></div>
        <div className="login-demo-grid grid grid-cols-3 gap-2">
          {localizeNode(quickAccounts.map(account => { const Icon = account.icon; const active = selectedAccount === account.role; return <button type="button" key={account.role} onClick={() => quickFill(account)} aria-pressed={active} className={`login-demo-card group min-w-0 rounded-xl border p-2.5 text-start transition ${active ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-500/20 dark:border-indigo-400/80 dark:bg-indigo-500/15' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-[#191a27] dark:hover:border-indigo-400/70'}`}>
            <span className={`mb-2 grid h-8 w-8 place-items-center rounded-lg transition ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-200'}`}><Icon size={16}/></span>
            <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">{localizeNode(account.label)}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400 font-medium">{localizeNode(account.short)}</span>
          </button>; }))}
        </div>
        <p className="login-demo-note mt-3 text-center text-[11px] leading-5 text-slate-500 dark:text-slate-300">{translateText("Choose a role to auto-fill credentials (password: ")}<b className="font-semibold text-slate-700 dark:text-white">12345678</b>{translateText("). Then click ")}<b className="font-semibold text-slate-700 dark:text-white">{translateText("Sign in")}</b>.</p>
        <div className="login-trust mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-300">
          <BadgeCheck size={15} className="text-emerald-500 dark:text-emerald-400"/>
          <span>{translateText("Secure access to your workspace")}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <Link to="/privacy" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition hover:underline">
            {translateText("Privacy Policy")}
          </Link>
        </div>
      </motion.div>

      <footer className="login-footer flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400">
        <span>{translateText("© 2026 GOS Inc.")}</span>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition underline-offset-2 hover:underline">
            {translateText("Privacy Policy")}
          </Link>
          <a className="transition hover:text-slate-700 dark:hover:text-white" href="#help">
            {translateText("Help")}
          </a>
        </div>
      </footer>
    </section>

    <motion.aside className="login-showcase relative hidden min-h-[100dvh] overflow-hidden bg-[#201d3b] text-white lg:flex lg:flex-col lg:justify-between lg:px-10 lg:py-8 xl:px-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .6 }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_76%_18%,rgba(135,112,255,.34),transparent_40%),radial-gradient(ellipse_at_18%_88%,rgba(65,129,180,.22),transparent_38%),linear-gradient(140deg,#282448,#211e3a_56%,#302653)]"/>
      <div className="pointer-events-none absolute -right-40 -top-48 h-[560px] w-[560px] rounded-full border border-white/[.06] shadow-[0_0_0_50px_rgba(255,255,255,.025),0_0_0_110px_rgba(255,255,255,.018)]"/>
      <div className="login-showcase-header relative z-10 flex items-center justify-between"><div className="login-showcase-brand flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 font-bold text-white ring-1 ring-white/15">{translateText("g")}</span><span className="text-lg font-bold tracking-[-1px]">{translateText("gos")}<span className="text-violet-300">.</span></span></div><span className="login-showcase-badge flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[10px] font-medium tracking-wide text-violet-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>{translateText(" YOUR BUSINESS, IN SYNC")}</span></div>

      <div className="login-showcase-content relative z-10 mx-auto my-auto w-full max-w-xl py-9">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .55 }}>
          <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold tracking-[.2em] text-violet-200"><Sparkles size={14}/>{translateText(" THE BUSINESS OPERATING SYSTEM")}</div>
          <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-1.6px] xl:text-[48px]">{translateText("More focus.")}<br/><span className="bg-gradient-to-r from-violet-200 via-violet-300 to-indigo-300 bg-clip-text text-transparent">{translateText("Less busywork.")}</span></h2>
          <p className="login-hero-description mt-4 max-w-md text-sm leading-6 text-indigo-100/90 dark:text-slate-100 font-normal">{translateText("One calm workspace to capture leads, keep conversations moving, and grow your business with confidence.")}</p>
        </motion.div>

        <motion.div className="login-preview mt-8 rounded-2xl border border-white/15 bg-white/[.08] p-4 shadow-[0_24px_80px_rgba(5,4,20,.32)] backdrop-blur-md xl:p-5" initial={{ opacity: 0, y: 18, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: .24, duration: .55 }}>
          <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-300/15 text-violet-200"><LayoutDashboard size={16}/></span><span><b className="block text-xs font-semibold">{translateText("Workspace overview")}</b><small className="mt-0.5 block text-[10px] text-indigo-100/55">{translateText("Tuesday, October 14")}</small></span></div><button type="button" className="rounded-lg border border-white/10 bg-white/[.06] px-2.5 py-1.5 text-[10px] text-indigo-100/70">{translateText("This month⌄")}</button></div>
          <div className="grid grid-cols-3 gap-2.5">
            <PreviewMetric label="New leads" value="1,284" change="+18.2%" icon={Users}/><PreviewMetric label="Bookings" value="48" change="+12.8%" icon={CalendarDays}/><PreviewMetric label="Revenue" value="$24.6k" change="+24.5%" icon={Activity}/>
          </div>
          <div className="login-recent mt-3 rounded-xl border border-white/10 bg-[#17152d]/40 p-3">
          <div className="login-recent-title mb-3 flex items-center justify-between"><span className="text-[11px] font-semibold text-white/90">{translateText("Recent momentum")}</span><span className="flex items-center gap-1 text-[10px] text-emerald-300"><ArrowUpRight size={12}/>{translateText(" Trending up")}</span></div>
            <div className="login-chart flex h-[68px] items-end gap-1.5">{localizeNode([30,42,36,54,45,61,48,72,58,82,68,96,76,100,82,92,74,100,86,100].map((height,index)=><i key={index} style={{ height: `${height}%` }} className={`flex-1 rounded-t-[3px] ${index>14 ? 'bg-violet-300/90' : 'bg-violet-300/35'}`}/>))}</div>
            <div className="login-chart-labels mt-2 flex justify-between text-[9px] text-indigo-100/45"><span>{translateText("Oct 1")}</span><span>{translateText("Oct 7")}</span><span>{translateText("Oct 14")}</span><span>{translateText("Oct 21")}</span><span>{translateText("Oct 31")}</span></div>
          </div>
          <div className="login-team-row mt-3 flex items-center justify-between border-t border-white/10 pt-3"><div className="flex items-center gap-2"><span className="login-team-avatars flex -space-x-2"><i className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#332d55] bg-orange-200 text-[8px] font-bold not-italic text-orange-900">{translateText("SC")}</i><i className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#332d55] bg-sky-200 text-[8px] font-bold not-italic text-sky-900">{translateText("MJ")}</i><i className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#332d55] bg-emerald-200 text-[8px] font-bold not-italic text-emerald-900">{translateText("PP")}</i></span><span className="text-[10px] text-indigo-100/65">{translateText("Your team is on top of it")}</span></div><span className="login-health flex items-center gap-1.5 text-[10px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>{translateText(" All systems go")}</span></div>
        </motion.div>

        <div className="login-showcase-proof mt-5 flex items-center gap-2 text-[11px] text-indigo-100/60"><Check size={14} className="text-emerald-300"/>{translateText(" Leads, conversations, bookings, and payments work together.")}</div>
      </div>
      <div className="login-showcase-footer relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-indigo-100/45">
        <span>{translateText("Built for the people building what’s next.")}</span>
        <div className="flex items-center gap-3">
          <Link to="/privacy" className="hover:text-white transition-colors underline-offset-2 hover:underline">
            {translateText("Privacy Policy")}
          </Link>
          <span>•</span>
          <span className="flex items-center gap-1.5"><Shield size={12}/>{translateText("Your data stays yours")}</span>
        </div>
      </div>
    </motion.aside>
  </main>;
};

function PreviewMetric({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: React.ElementType }) {
  useUILanguage();
  return <div className="login-preview-metric min-w-0 rounded-xl border border-white/10 bg-white/[.06] p-2.5 xl:p-3"><div className="flex items-center justify-between"><span className="text-[9px] font-medium text-indigo-100/60">{localizeNode(label)}</span><Icon size={13} className="text-violet-200/80"/></div><b className="mt-2 block truncate text-base font-semibold tracking-tight xl:text-lg">{localizeNode(value)}</b><span className="mt-0.5 block text-[9px] text-emerald-300">{localizeNode(change)}{translateText(" this month")}</span></div>;
}
