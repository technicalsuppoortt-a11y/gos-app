import { doc, onSnapshot } from 'firebase/firestore';
import { primaryDb } from '../../backend/firebase';
import { logoutFirebase } from '../../backend/session';
import { syncPlatformDataMirror } from '../../backend/superAdmin';
import { showToast as authToast } from '../../utils/toast';
import { useUILanguage, translateText, translateTextForLanguage, localizeNode } from '../../i18n/display';
import React, { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Bell, CreditCard, Globe, PanelsTopLeft, Landmark, Layers, LayoutDashboard, LogOut, Puzzle, Search, Settings, Users, ShieldCheck, Menu, X, Grid2X2, MessageCircle } from 'lucide-react';
import { matchesLocalizedSearch } from '../../utils/arabicSearch';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { canOpenPlatformPage, isPlatformTeamRole, platformHome } from '../../router/platformAccess';
import { showToast } from '../../utils/toast';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { ThemeToggle } from '../ui/ThemeToggle';
import '../../pages/admin/admin-workspace.css';
import './super-admin.css';
import { GetAppButton } from './GetAppButton';
import { PlatformAccountSwitcher } from './PlatformAccountSwitcher';

const navigation: { label: string; ar?: string; to: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { label: 'Overview', to: '/super-admin', icon: LayoutDashboard, end: true },
  { label: 'All Admins', ar: 'جميع المسؤولين', to: '/super-admin/clients', icon: Users },
  { label: 'Plans & Credits', ar: 'الباقات والرصيد', to: '/super-admin/plans', icon: Layers },
  { label: 'Templates', ar: 'القوالب', to: '/super-admin/dashboard-management', icon: Grid2X2 },
  { label: 'Usage & Revenue', to: '/super-admin/analytics', icon: BarChart3 },
  { label: 'Team Management', to: '/super-admin/users', icon: ShieldCheck },
  { label: 'System Settings', to: '/super-admin/settings', icon: Settings },
  { label: 'Integrations', to: '/super-admin/integrations', icon: Puzzle },
  { label: 'Domains Provider', ar: 'مزود النطاقات', to: '/super-admin/domains', icon: Globe },
  { label: 'Meta App', to: '/super-admin/meta-app', icon: MessageCircle },
  { label: 'Payments', to: '/super-admin/payments', icon: CreditCard },
  { label: 'Payment Methods', ar: 'طرق الدفع', to: '/super-admin/payment-methods', icon: Landmark },
  { label: 'Logs & Monitoring', to: '/super-admin/logs', icon: Activity },
];

export const SuperAdminLayout: React.FC = () => {
  const language = useUILanguage();
  const { role, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const [liveTabsOverride, setLiveTabsOverride] = useState<string[] | undefined>(undefined);
  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      void syncPlatformDataMirror();
    }
  }, [role]);
  useEffect(() => {
    if (!user?.id) {
      setLiveTabsOverride(undefined);
      return;
    }
    return onSnapshot(
      doc(primaryDb, 'settings', 'teamMemberPermissions'),
      snap => {
        const custom = snap.data()?.members?.[user.id];
        if (Array.isArray(custom?.allowedTabs)) {
          setLiveTabsOverride(custom.allowedTabs.filter((item: unknown): item is string => typeof item === 'string'));
        } else {
          setLiveTabsOverride(undefined);
        }
      },
      () => {}
    );
  }, [user?.id]);
  const effectiveAllowedTabs = liveTabsOverride ?? user?.allowedTabs;
  const canOpen = (path: string) => canOpenPlatformPage(role, path, effectiveAllowedTabs);
  const home = isPlatformTeamRole(role) ? platformHome(role, effectiveAllowedTabs) : '/auth/login';
  const visibleNav = navigation.filter(item => canOpen(item.to));
  const name = user?.name || translateText('Platform team');
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const controls = () => Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') ?? []).filter(node => node.getClientRects().length);
    const frame = requestAnimationFrame(() => controls()[0]?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target as HTMLElement).closest('#workspace-switcher-popover, #workspace-switcher-trigger[aria-expanded="true"]')) setMobileOpen(false);
      if (event.key !== 'Tab') return;
      const nodes = controls(), first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (innerWidth >= 768) setMobileOpen(false); };
    document.addEventListener('keydown', keydown); window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown); window.removeEventListener('resize', resize);
      previous?.focus();
    };
  }, [mobileOpen]);
  const signOut = () => { showToast.success(translateText('You have been logged out successfully.')); void logoutFirebase().catch(error => authToast.error(error.message)); navigate('/auth/login', { replace: true }); };

  const [saSearch, setSaSearch] = useState('');
  const [saSearchOpen, setSaSearchOpen] = useState(false);
  const [saActiveIdx, setSaActiveIdx] = useState(0);
  const saSearchRef = useRef<HTMLDivElement>(null);
  const saSearchInputRef = useRef<HTMLInputElement>(null);
  const saFilteredNav = saSearch.trim()
    ? [...visibleNav, ...(canOpen('/super-admin/support') ? [{ label: 'Support', ar: 'الدعم', to: '/super-admin/support' }] : [])].filter(n =>
        matchesLocalizedSearch(saSearch, [
          n.label,
          n.ar || '',
          translateText(n.label),
          translateTextForLanguage(n.label, 'ar'),
          translateTextForLanguage(n.label, 'nl'),
          translateTextForLanguage(n.label, 'de'),
        ])
      )
    : [];

  useEffect(() => {
    setSaActiveIdx(0);
  }, [saSearch]);

  const handleSaSearchSubmit = (to?: string) => {
    const target = to || saFilteredNav[saActiveIdx]?.to || saFilteredNav[0]?.to || (canOpen('/super-admin/clients') ? `/super-admin/clients?search=${encodeURIComponent(saSearch.trim())}` : home);
    navigate(target);
    setSaSearch('');
    setSaSearchOpen(false);
    setSaActiveIdx(0);
    saSearchInputRef.current?.blur();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === 'k' || event.code === 'KeyK')) {
        event.preventDefault();
        saSearchInputRef.current?.focus();
        saSearchInputRef.current?.select();
        setSaSearchOpen(true);
      } else if (event.key === 'Escape' && saSearchOpen) {
        setSaSearchOpen(false);
        saSearchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saSearchOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (saSearchRef.current && !saSearchRef.current.contains(e.target as Node)) {
        setSaSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const allowedCurrentPath = canOpen(location.pathname);
  const blockedPathRef = useRef('');
  useEffect(() => {
    if (!allowedCurrentPath && location.pathname !== '/super-admin' && blockedPathRef.current !== location.pathname) {
      blockedPathRef.current = location.pathname;
      showToast.error(translateText('Access restricted: You do not have permission to view that section.'));
    }
  }, [allowedCurrentPath, location.pathname]);

  if (!allowedCurrentPath) return <Navigate to={home} replace/>;

  return <div className="sa-shell">
    {mobileOpen && <button className="sa-mobile-scrim" aria-label={translateText("Close navigation")} onClick={() => setMobileOpen(false)}/>}
    <aside ref={sidebarRef} className={`sa-sidebar${mobileOpen ? ' is-mobile-open' : ''}`} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-label={translateText("Platform navigation")} onClick={event => { if ((event.target as HTMLElement).closest('a')) setMobileOpen(false); }}>
      <button className="sa-mobile-close" aria-label={translateText("Close menu")} onClick={() => setMobileOpen(false)}><X size={18}/></button>
      <NavLink to={home} className="layout-brand sa-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', padding: '4px 6px 20px' }}><span className="layout-brand-icon"><img src="/upclick-mark.svg" width="32" height="32" alt=""/></span><div className="layout-brand-copy"><span className="layout-brand-wordmark"><b>Upklick</b></span><small>{translateText("Ideas to impact")}</small></div></NavLink>
      <div className="sa-nav-label">{translateText("PLATFORM")}</div>
      {role === 'SUPER_ADMIN' && <div className="adm-switcher-wrap" style={{ padding: '0 4px 12px' }}><PlatformAccountSwitcher/></div>}
      <nav className="sa-nav" aria-label={translateText("Super admin navigation")}>
        {localizeNode(visibleNav.map(({ label, ar, to, icon: Icon, end }) => <NavLink key={label} to={to} end={end} className={({ isActive }) => `sa-nav-link${isActive ? ' active' : ''}`}><Icon size={15}/><span>{ar && language.startsWith('ar') ? ar : localizeNode(label)}</span></NavLink>))}
      </nav>
      <div className="sa-sidebar-footer">
        {canOpen('/super-admin/support') && <NavLink to="/super-admin/support" className={({ isActive }) => `sa-nav-link sa-support-link${isActive ? ' active' : ''}`} title={translateText("Support")}><MessageCircle size={17}/><span>{translateText("Support")}</span></NavLink>}
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
              ref={saSearchInputRef}
              type="search"
              name="gos_sa_topbar_lookup_q"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              placeholder={translateText(canOpen('/super-admin/clients') ? 'Search admins or sections…' : 'Search sections…')}
              aria-label={translateText(canOpen('/super-admin/clients') ? 'Search admins or sections' : 'Search sections')}
              value={saSearch}
              onChange={e => { setSaSearch(e.target.value); setSaSearchOpen(true); }}
              onFocus={() => { if (saSearch.trim()) setSaSearchOpen(true); }}
              onKeyDown={event => {
                if (event.key === 'ArrowDown' && saFilteredNav.length > 0) {
                  event.preventDefault();
                  setSaSearchOpen(true);
                  setSaActiveIdx(prev => (prev + 1) % saFilteredNav.length);
                } else if (event.key === 'ArrowUp' && saFilteredNav.length > 0) {
                  event.preventDefault();
                  setSaSearchOpen(true);
                  setSaActiveIdx(prev => (prev - 1 + saFilteredNav.length) % saFilteredNav.length);
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  handleSaSearchSubmit();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  setSaSearchOpen(false);
                  saSearchInputRef.current?.blur();
                }
              }}
            />
            <kbd dir="ltr">⌘K</kbd>
          </label>
          {saSearchOpen && saFilteredNav.length > 0 && (
            <div className="absolute start-0 top-[calc(100%+6px)] w-64 rounded-xl bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#252c3b] shadow-2xl overflow-hidden z-50 p-1.5">
              <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                {translateText("Navigation")}
              </div>
              {saFilteredNav.map((item, idx) => (
                <button
                  key={item.to}
                  type="button"
                  onMouseEnter={() => setSaActiveIdx(idx)}
                  onClick={() => handleSaSearchSubmit(item.to)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-start ${
                    idx === saActiveIdx
                      ? 'bg-purple-50 text-purple-700 dark:bg-[#202737] dark:text-purple-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-[#202737]'
                  }`}
                >
                  <span>{item.ar && language.startsWith('ar') ? item.ar : translateText(item.label)}</span>
                  <span className="text-[10px] text-slate-400 font-normal">↵</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {role === 'SUPER_ADMIN' && <GetAppButton/>}<div className="sa-preferences"><LanguageSwitcher/><ThemeToggle/></div>
        <NavLink to="/" end className="sa-support-shortcut sa-landing-shortcut" aria-label={translateText("View Landing Page")} title={translateText("View Landing Page")}><PanelsTopLeft size={17}/></NavLink>
        {canOpen('/super-admin/support') && <NavLink to="/super-admin/support" className="sa-support-shortcut" aria-label={translateText("Support")} title={translateText("Support")}><MessageCircle size={17}/></NavLink>}
        {canOpen('/super-admin/logs') && <button className="sa-notifications" aria-label={translateText("Notifications")} onClick={() => navigate('/super-admin/logs')}><Bell size={17}/><i/></button>}
        <button className="sa-account" onClick={() => navigate('/super-admin/users')} disabled={!canOpen('/super-admin/users')}><span>{name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><b>{name}</b></button>
      </header>
      <div className="sa-content"><Outlet/></div>
    </main>
  </div>;
};

