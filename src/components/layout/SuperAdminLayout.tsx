import { logoutFirebase } from '../../backend/session';
import { showToast as authToast } from '../../utils/toast';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, AppWindow, BarChart3, Bell, CreditCard, Layers, LayoutDashboard, LogOut, Puzzle, Search, Settings, Users, ShieldCheck, Menu, X, Grid2X2, MessageCircle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { ThemeToggle } from '../ui/ThemeToggle';
import '../../pages/admin/admin-workspace.css';
import './super-admin.css';
import { GetAppButton } from './GetAppButton';
import { CreditBadge } from './CreditBadge';

const navigation: { label: string; ar?: string; to: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { label: 'Overview', to: '/super-admin', icon: LayoutDashboard, end: true },
  { label: 'All Clients', to: '/super-admin/clients', icon: Users },
  { label: 'Plans & Credits', ar: 'الباقات والرصيد', to: '/super-admin/plans', icon: Layers },
  { label: 'All Softwares', to: '/super-admin/subscriptions', icon: AppWindow },
  { label: 'Templates', to: '/super-admin/templates', icon: Grid2X2 },
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

  const [saSearch, setSaSearch] = useState('');
  const [saSearchOpen, setSaSearchOpen] = useState(false);
  const saSearchRef = useRef<HTMLDivElement>(null);
  const saFilteredNav = saSearch.trim()
    ? navigation.filter(n => {
        const q = saSearch.toLowerCase().trim();
        return n.label.toLowerCase().includes(q) || (n.ar && n.ar.includes(q)) || translateText(n.label).toLowerCase().includes(q);
      })
    : [];

  const handleSaSearchSubmit = (to?: string) => {
    const target = to || (saFilteredNav[0] ? saFilteredNav[0].to : `/super-admin/clients?search=${encodeURIComponent(saSearch.trim())}`);
    navigate(target);
    setSaSearch('');
    setSaSearchOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (saSearchRef.current && !saSearchRef.current.contains(e.target as Node)) {
        setSaSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return <div className="sa-shell">
    {mobileOpen && <button className="sa-mobile-scrim" aria-label={translateText("Close navigation")} onClick={() => setMobileOpen(false)}/>}
    <aside ref={sidebarRef} className={`sa-sidebar${mobileOpen ? ' is-mobile-open' : ''}`} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-label={translateText("Platform navigation")} onClick={event => { if ((event.target as HTMLElement).closest('a')) setMobileOpen(false); }}>
      <button className="sa-mobile-close" aria-label={translateText("Close menu")} onClick={() => setMobileOpen(false)}><X size={18}/></button>
      <NavLink to="/super-admin" className="layout-brand sa-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', padding: '4px 6px 20px' }}><span className="layout-brand-icon"><img src="/upclick-mark.svg" width="32" height="32" alt=""/></span><div className="layout-brand-copy"><span className="layout-brand-wordmark"><b>Upclick</b></span><small>{translateText("Ideas to impact")}</small></div></NavLink>
      <div className="sa-nav-label">{translateText("PLATFORM")}</div>
      <nav className="sa-nav" aria-label={translateText("Super admin navigation")}>
        {localizeNode(navigation.map(({ label, ar, to, icon: Icon, end }) => <NavLink key={label} to={to} end={end} className={({ isActive }) => `sa-nav-link${isActive ? ' active' : ''}`}><Icon size={15}/><span>{ar && language.startsWith('ar') ? ar : localizeNode(label)}</span></NavLink>))}
      </nav>
      <div className="sa-sidebar-footer">
        <NavLink to="/super-admin/support" className={({ isActive }) => `sa-nav-link sa-support-link${isActive ? ' active' : ''}`} title={translateText("Support")}><MessageCircle size={17}/><span>{translateText("Support")}</span></NavLink>
      <button className="sa-logout" onClick={signOut}><LogOut size={15}/>{translateText("Log out")}</button>
      </div>
    </aside>
    <main className="sa-main">
      <header className="sa-topbar">
        <button className="sa-menu-button" aria-label={translateText("Open navigation")} aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
        <span className="sa-breadcrumb">{translateText("Platform ")}<i>/</i>{translateText(" Super Admin")}</span>
        <div className="relative" ref={saSearchRef}>
          <label className="sa-search">
            <Search size={14}/>
            <input 
              placeholder={translateText("Search clients or sections…")} 
              aria-label={translateText("Search clients or sections")} 
              value={saSearch}
              onChange={e => { setSaSearch(e.target.value); setSaSearchOpen(true); }}
              onFocus={() => { if (saSearch.trim()) setSaSearchOpen(true); }}
              onKeyDown={event => { 
                if (event.key === "Enter") { 
                  event.preventDefault();
                  handleSaSearchSubmit();
                } 
              }}
            />
            <kbd>Enter</kbd>
          </label>
          {saSearchOpen && saFilteredNav.length > 0 && (
            <div className="absolute start-0 top-[calc(100%+6px)] w-64 rounded-xl bg-[#161b26] border border-[#252c3b] shadow-2xl overflow-hidden z-50 p-1.5">
              <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                {translateText("Navigation")}
              </div>
              {saFilteredNav.map(item => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleSaSearchSubmit(item.to)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 hover:bg-[#202737] rounded-lg transition-colors text-start"
                >
                  <span>{item.ar && language.startsWith('ar') ? item.ar : translateText(item.label)}</span>
                  <span className="text-[10px] text-slate-400 font-normal">↵</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <GetAppButton/><div className="sa-preferences"><LanguageSwitcher/><ThemeToggle/></div><CreditBadge/><NavLink to="/super-admin/support" className="sa-support-shortcut" aria-label={translateText("Support")} title={translateText("Support")}><MessageCircle size={17}/></NavLink><button className="sa-notifications" aria-label={translateText("Notifications")} onClick={() => navigate("/super-admin/logs")}><Bell size={17}/><i/></button><button className="sa-account" onClick={() => navigate("/super-admin/users")}><span>{translateText("JA")}</span><b>{translateText("Jordan Admin")}</b></button>
      </header>
      <div className="sa-content"><Outlet/></div>
    </main>
  </div>;
};
