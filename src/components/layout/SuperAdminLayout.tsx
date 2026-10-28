import { logoutFirebase } from '../../backend/session';
import { showToast as authToast } from '../../utils/toast';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, AppWindow, BarChart3, Bell, CreditCard, Layers, LayoutDashboard, LogOut, Puzzle, Search, Settings, Users, ShieldCheck, Menu, X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { ThemeToggle } from '../ui/ThemeToggle';
import './super-admin.css';
import { GetAppButton } from './GetAppButton';
import { CreditBadge } from './CreditBadge';
import { Radio } from 'lucide-react';

const navigation: { label: string; ar?: string; to: string; icon: typeof Radio; end?: boolean }[] = [
  { label: 'Marketing Tracking', to: '/super-admin/marketing-tracking', icon: Radio },
  { label: 'Support', to: '/super-admin/support', icon: Bell },
  { label: 'Overview', to: '/super-admin', icon: LayoutDashboard, end: true },
  { label: 'All Clients', to: '/super-admin/clients', icon: Users },
  { label: 'Plans & Credits', ar: 'الباقات والرصيد', to: '/super-admin/plans', icon: Layers },
  { label: 'All Softwares', to: '/super-admin/subscriptions', icon: AppWindow },
  { label: 'Usage & Revenue', to: '/super-admin/analytics', icon: BarChart3 },
  { label: 'Team Management', to: '/super-admin/users', icon: ShieldCheck },
  { label: 'System Settings', to: '/super-admin/settings', icon: Settings },
  { label: 'Integrations', to: '/super-admin/integrations', icon: Puzzle },
  { label: 'Payments', to: '/super-admin/payments', icon: CreditCard },
  { label: 'Logs & Monitoring', to: '/super-admin/logs', icon: Activity },
];

export const SuperAdminLayout: React.FC = () => {
  const language = useUILanguage();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') ?? []).filter(node => node.getClientRects().length);
    const frame = requestAnimationFrame(() => controls()[0]?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
      if (event.key !== 'Tab') return;
      const nodes = controls(), first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (innerWidth >= 768) setMobileOpen(false); };
    document.addEventListener('keydown', keydown); window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame); document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown); window.removeEventListener('resize', resize);
      previous?.focus();
    };
  }, [mobileOpen]);
  const signOut = () => { showToast.success('You have been logged out successfully.'); void logoutFirebase().catch(error => authToast.error(error.message)); navigate('/auth/login', { replace: true }); };

  return <div className="sa-shell">
    {mobileOpen && <button className="sa-mobile-scrim" aria-label={translateText("Close navigation")} onClick={() => setMobileOpen(false)}/>}
    <aside ref={sidebarRef} className={`sa-sidebar${mobileOpen ? ' is-mobile-open' : ''}`} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-label={translateText("Platform navigation")} onClick={event => { if ((event.target as HTMLElement).closest('a')) setMobileOpen(false); }}>
      <button className="sa-mobile-close" aria-label={translateText("Close menu")} onClick={() => setMobileOpen(false)}><X size={18}/></button>
      <a className="sa-brand" href="/super-admin"><span className="sa-brand-mark"><img src="/upclick-mark.svg" width="32" height="32" alt=""/></span><span><b>{translateText("Upclick")}</b><small>{translateText("Platform control")}</small></span></a>
      <div className="sa-nav-label">{translateText("PLATFORM")}</div>
      <nav className="sa-nav" aria-label={translateText("Super admin navigation")}>
        {localizeNode(navigation.map(({ label, ar, to, icon: Icon, end }) => <NavLink key={label} to={to} end={end} className={({ isActive }) => `sa-nav-link${isActive ? ' active' : ''}`}><Icon size={15}/><span>{ar && language.startsWith('ar') ? ar : localizeNode(label)}</span></NavLink>))}
      </nav>
      <button className="sa-logout" onClick={signOut}><LogOut size={15}/>{translateText("Log out")}</button>
    </aside>
    <main className="sa-main">
      <header className="sa-topbar"><button className="sa-menu-button" aria-label={translateText("Open navigation")} aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={19}/></button><span className="sa-breadcrumb">{translateText("Platform ")}<i>/</i>{translateText(" Super Admin")}</span><label className="sa-search"><Search size={14}/><input placeholder={translateText("Search clients…")} aria-label={translateText("Search clients")} onKeyDown={event => { if (event.key === "Enter") { navigate(`/super-admin/clients?search=${encodeURIComponent(event.currentTarget.value.trim())}`); event.currentTarget.value = ""; } }}/><kbd>Enter</kbd></label><GetAppButton/><div className="sa-preferences"><LanguageSwitcher/><ThemeToggle/></div><CreditBadge/><button className="sa-notifications" aria-label={translateText("Notifications")} onClick={() => navigate("/super-admin/logs")}><Bell size={17}/><i/></button><button className="sa-account" onClick={() => navigate("/super-admin/users")}><span>{translateText("JA")}</span><b>{translateText("Jordan Admin")}</b></button></header>
      <div className="sa-content"><Outlet/></div>
    </main>
  </div>;
};
