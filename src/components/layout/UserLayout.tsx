import { WorkspaceData } from '../../backend/workspace';

import { useUILanguage, translateText, localizeNode, uiDirection } from '../../i18n/display';
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { BarChart3, CalendarDays, Contact, CreditCard, Filter, LayoutGrid, ListChecks, MessageCircle, Send, Settings, Sparkles, Zap, Users, MessageSquare, ArrowLeft, Lock } from 'lucide-react';
import { Sidebar, type SidebarItem } from './Sidebar';
import { Header } from './Header';
import { useModuleAccess, moduleForPath, isTabAllowed, firstAuthorizedPath } from '../../pages/settings/useModuleAccess';
import { settingsTabs } from '../../pages/settings/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { useSubscription, isLive } from '../../backend/billing';
import { isDemoAccount } from '../../backend/demoContext';
import { isDemoSessionActive } from '../../demo/mode';
import { SupportQuickChat } from '../../pages/support/SupportQuickChat';
import { AgencyLandingSeed } from '../../backend/agencyLanding';
import { SupportRoutingWatcher } from './SupportRoutingWatcher';
// OnboardingProgress is temporarily disabled with the onboarding cycle.

const userItems: SidebarItem[] = [
  { name: 'AI Copilot', href: '/copilot', icon: Sparkles },
  { name: 'Dashboard', href: '', icon: MessageSquare, end: true },
  { name: 'Funnel & Website', href: '/funnels', icon: Filter, activePaths: ['/dashboard/funnels', '/dashboard/websites', '/dashboard/forms', '/funnels', '/websites', '/forms'] },
  { name: 'Inbox', href: '/inbox', icon: MessageCircle,  },
  { name: 'CRM & Leads', href: '/crm', icon: Users, end: false, activePaths: ['/crm'] },
  { name: 'Contacts', href: '/contacts', icon: Contact, end: false, activePaths: ['/dashboard/contacts', '/contacts'] },
  { name: 'Automation & Campaign', href: '/automation', icon: Zap },
  { name: 'AI Follow-Up', href: '/follow-up', icon: Send },
  { name: 'Booking & Calendar', href: '/booking', icon: CalendarDays },
  { name: 'Products & Payments', href: '/products', icon: CreditCard, activePaths: ['/dashboard/products-payments'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings, end: false, dividerBefore: true, activePaths: ['/dashboard/integrations', '/dashboard/domains', '/domains'] },
  { name: 'Support', href: '/support', icon: MessageCircle },
];

const bookingTabs = [
  { label: 'Dashboard', value: 'dashboard', icon: LayoutGrid },
  { label: 'Bookings', value: 'bookings', icon: ListChecks },
  { label: 'Calendar', value: 'calendar', icon: CalendarDays },
  { label: 'Contacts', value: 'contacts', icon: Users },
  { label: 'Workspace', value: 'workspace', icon: Users },
  { label: 'Templates', value: 'templates', icon: LayoutGrid },
];

function BookingTabs() {
  useUILanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const active = params.get('tab') === 'links' ? 'dashboard' : params.get('tab') ?? 'dashboard';
  return <nav className="layout-booking-tabs" aria-label={translateText("Booking navigation")}>
    {localizeNode(bookingTabs.map(tab => <button key={tab.value} className={`layout-booking-tab relative${active === tab.value ? ' is-active' : ''}`} onClick={() => navigate('/dashboard/booking?tab='+tab.value)} aria-current={active === tab.value ? 'page' : undefined}>
      {localizeNode(active === tab.value && (
        <motion.div
          layoutId="activeBookingTab"
          className="absolute inset-0 bg-[#efedff] dark:bg-[#0F172A] rounded-[9px]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      ))}
      <div className="relative z-10 flex items-center gap-[7px]">
        <tab.icon size={15}/><span>{localizeNode(tab.label)}</span>
      </div>
    </button>))}
  </nav>;
}

export const UserLayout: React.FC = () => {
  useUILanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const tenant = useSelector((s: RootState) => s.auth.tenant);
  const role = useSelector((s: RootState) => s.auth.role);
  const agency = user?.accountType === 'agency';
  const subOwnerId = user?.ownerId || (tenant?.id ? tenant.id.replace(/^workspace-/, '') : null) || user?.id || null;
  const { data: sub, loading: subLoading } = useSubscription(agency ? null : subOwnerId);
  const live = isLive(sub);
  const impersonation = useSelector((s: RootState) => s.auth.impersonation);
  const isLocked = !agency && !impersonation && !user?.isTeamMember && !(isDemoAccount || isDemoSessionActive()) && role === 'USER' && !subLoading && !live;

  useEffect(() => {
    if (isLocked) {
      const allowed = location.pathname.startsWith('/dashboard/settings') || location.pathname === '/dashboard/support';
      if (!allowed) {
        navigate('/dashboard/settings/billing?tab=plans', { replace: true });
      }
    }
  }, [isLocked, location.pathname, navigate]);

  const canAccess = useModuleAccess();
  const module = moduleForPath(location.pathname);
  const permitted = isLocked
    ? (module === 'settings' || module === 'support')
    : isTabAllowed(canAccess, location.pathname);

  useEffect(() => {
    if (!isLocked && !permitted) {
      const fallback = firstAuthorizedPath(canAccess);
      if (fallback && fallback !== location.pathname) {
        navigate(fallback, { replace: true });
      }
    }
  }, [isLocked, permitted, canAccess, location.pathname, navigate]);

  const visibleItems = isLocked
    ? userItems.filter(item => item.href === '/settings' || item.href === '/support')
    : userItems.filter(item => {
        if (item.href === '/support') return true;
        if (item.href === '/settings') return canAccess('settings');
        return canAccess(moduleForPath('/dashboard' + item.href));
      });

  const visibleSettingsTabs = settingsTabs.filter(tab => canAccess(`settings:${tab.slug}`));
  const backMainHref = canAccess('home') ? '' : firstAuthorizedPath(canAccess).replace(/^\/dashboard/, '');

  const isBooking = location.pathname.startsWith('/dashboard/booking');
  const isSettings = location.pathname.startsWith('/dashboard/settings') || location.pathname === '/dashboard/integrations';
  const isInbox = location.pathname === '/dashboard/inbox';
  const isContacts = /^\/(dashboard\/)?contacts(?:\/|$)/.test(location.pathname);
  const isCRM = /^\/(dashboard\/)?crm(?:\/|$)/.test(location.pathname);
  const isProductWorkspace = /^\/dashboard\/products-payments\/(?:products|course)\/[^/]+(?:\/(?:edit|pricing|orders|students))?$/.test(location.pathname);
  const isBuilder = /^\/(?:dashboard\/)?(funnels|websites|forms)\/[^/]+\/edit(?:\/|$)/.test(location.pathname);

  useEffect(() => {
    document.documentElement.classList.add('layout-locked');
    document.body.classList.add('layout-locked');
    return () => {
      document.documentElement.classList.remove('layout-locked');
      document.body.classList.remove('layout-locked');
    };
  }, []);

  const isNativeTemplates = new URLSearchParams(location.search).get('tab') === 'templates';
  const isDashboard = location.pathname === '/dashboard';
  const isFullPage = isInbox || isCRM || isContacts || isBooking || isNativeTemplates || isBuilder;
  return <div className={`layout-dashboard-shell user-dashboard-shell h-screen max-h-screen overflow-hidden${isDashboard ? ' is-dashboard-route' : ''}${isNativeTemplates ? ' is-module-templates-route' : ''}${isBooking ? ' is-booking-route' : ''}${isSettings ? ' is-settings-route' : ''}${isProductWorkspace ? ' is-product-workspace' : ''}${isFullPage ? ' is-inbox-route' : ''}${isCRM || isContacts ? ' is-crm-route' : ''}${isBuilder ? ' is-builder-route' : ''}`} dir={uiDirection()}>
    <Sidebar navigationLabel={isSettings ? "Settings navigation" : "Main navigation"} items={isSettings ? [{ name: 'Back to Main Sidebar', href: backMainHref, icon: ArrowLeft, end: true }, ...visibleSettingsTabs.map(tab => ({ name: tab.name, href: '/settings/' + tab.slug, icon: tab.icon }))] : visibleItems} basePath="/dashboard"/>
    <div className={`layout-workspace flex-1 flex flex-col min-w-0${isFullPage ? ' layout-workspace-inbox' : ''}`}>
      <Header title={translateText(location.pathname === '/dashboard/support' ? 'Support' : isBooking ? 'Booking & Calendar' : isContacts ? 'Contacts' : isCRM ? 'CRM & Leads' : isProductWorkspace ? 'Products & Payments' : isSettings ? 'Settings' : undefined)}/>
      {localizeNode(
        user?.isTeamMember && user?.ownerName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              padding: '7px 20px',
              background: 'linear-gradient(90deg, #f5f3ff 0%, #faf5ff 100%)',
              borderBottom: '1px solid #e9d5ff',
              fontSize: 12,
              color: '#4c1d95',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#7c3aed',
                  color: '#ffffff',
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
              >
                <Users size={11} />
                {translateText(user.teamRole || 'Team Member')}
              </span>
              <span>
                {translateText('Logged in to workspace of')}{' '}
                <b style={{ fontWeight: 700, color: '#2e1065' }}>{user.ownerName}</b>
                {user.ownerEmail ? (
                  <span style={{ color: '#6d28d9', marginInlineStart: 4 }}>({user.ownerEmail})</span>
                ) : null}
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#6d28d9', fontWeight: 600 }}>
              {translateText('Owner')}: {user.ownerName}
            </span>
          </div>
        ),
      )}
      {localizeNode(isBooking && <BookingTabs/>)}
      <main className={`layout-main${isFullPage ? ' layout-main-inbox' : ''}`}>
        {/* Onboarding progress is temporarily disabled. */}

        <WorkspaceData><AgencyLandingSeed/><SupportRoutingWatcher/><div key={location.pathname} className={`layout-route-content workspace-content-enter${isFullPage ? ' layout-route-content-inbox' : ''}`}>{localizeNode(permitted ? <Outlet/> : <section className="module-access-message"><div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}><Lock size={26} /></div><h1>{isLocked ? translateText("Subscription Required") : translateText("Module access restricted")}</h1><p>{isLocked ? translateText("Your account does not have an active subscription. Please select a plan to unlock all platform tools.") : translateText("Your team permissions do not include this module. Contact your workspace owner to request access.")}</p>{isLocked && <button type="button" className="bl-btn primary" onClick={() => navigate('/dashboard/settings/billing?tab=plans')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: '#7C3AED', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', margin: '16px auto 0' }}>{translateText("View Plans & Pricing")}</button>}</section>)}</div></WorkspaceData>
      </main>
      {localizeNode(!isFullPage && !isProductWorkspace && !isDashboard && <footer className="layout-footer"><span>{translateText("© 2025 Upclick Inc.")}</span><span className="layout-footer-status"><i/>{translateText(" All systems operational")}</span></footer>)}
    </div>
    <SupportQuickChat/>
  </div>;
};

