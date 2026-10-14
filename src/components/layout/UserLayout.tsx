import { useUILanguage, translateText, localizeNode, uiDirection } from '../../i18n/display';
import React from 'react';
import { motion } from 'framer-motion';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { BarChart3, CalendarDays, CreditCard, Filter, LayoutGrid, ListChecks, MessageCircle, Send, Settings, Sparkles, Users, MessageSquare } from 'lucide-react';
import { Sidebar, type SidebarItem } from './Sidebar';
import { Header } from './Header';
import { useModuleAccess, moduleForPath } from '../../pages/settings/useModuleAccess';
import { settingsTabs } from '../../pages/settings/navigation';
import { OnboardingProgress } from '../../pages/onboarding/OnboardingProgress';

const userItems: SidebarItem[] = [
  { name: 'Dashboard', href: '', icon: MessageSquare, end: true },
  { name: 'AI Copilot', href: '/copilot', icon: Sparkles },
  { name: 'Funnel & Website', href: '/funnels', icon: Filter, activePaths: ['/dashboard/funnels', '/dashboard/websites', '/dashboard/domains', '/funnels', '/websites', '/domains'] },
  { name: 'Inbox', href: '/inbox', icon: MessageCircle, badge: '12' },
  { name: 'CRM & Leads', href: '/crm', icon: Users, end: false, activePaths: ['/crm'] },
  { name: 'AI Follow-Up', href: '/follow-up', icon: Send },
  { name: 'Booking & Calendar', href: '/booking', icon: CalendarDays },
  { name: 'Products & Payments', href: '/products', icon: CreditCard, activePaths: ['/dashboard/products-payments'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings, end: false, dividerBefore: true, activePaths: ['/dashboard/integrations'], children: settingsTabs.map(tab => ({ name: tab.name, href: '/settings/' + tab.slug, icon: tab.icon })) },
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
          className="absolute inset-0 bg-[#efedff] dark:bg-[#30265b] rounded-[9px]"
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
  const canAccess = useModuleAccess();
  const module = moduleForPath(location.pathname);
  const permitted = ['settings', 'integrations'].includes(module) || canAccess(module);
  const visibleItems = userItems.filter(item => item.href === '/settings' || canAccess(moduleForPath('/dashboard' + item.href)));
  const isBooking = location.pathname.startsWith('/dashboard/booking');
  const isSettings = location.pathname.startsWith('/dashboard/settings') || location.pathname === '/dashboard/integrations';
  const isInbox = location.pathname === '/dashboard/inbox';
  const isCRM = /^\/(dashboard\/)?crm(?:\/|$)/.test(location.pathname);
  const isProductWorkspace = /^\/dashboard\/products-payments\/(?:products|course)\/[^/]+(?:\/(?:edit|pricing|orders|students))?$/.test(location.pathname);

  const isNativeTemplates = new URLSearchParams(location.search).get('tab') === 'templates';
  const isDashboard = location.pathname === '/dashboard';
  const isFullPage = isInbox || isCRM || isBooking || isNativeTemplates;
  return <div className={`layout-dashboard-shell user-dashboard-shell${isDashboard ? ' is-dashboard-route' : ''}${isNativeTemplates ? ' is-module-templates-route' : ''}${isBooking ? ' is-booking-route' : ''}${isSettings ? ' is-settings-route' : ''}${isProductWorkspace ? ' is-product-workspace' : ''}${isFullPage ? ' is-inbox-route' : ''}${isCRM ? ' is-crm-route h-screen max-h-screen overflow-hidden' : ''}`} dir={uiDirection()}>
    <Sidebar items={visibleItems} basePath="/dashboard"/>
    <div className={`layout-workspace flex-1 flex flex-col min-w-0${isFullPage ? ' layout-workspace-inbox' : ''}`}>
      <Header title={translateText(isBooking ? 'Booking & Calendar' : isCRM ? 'CRM & Leads' : isProductWorkspace ? 'Products & Payments' : isSettings ? 'Settings' : undefined)}/>
      {localizeNode(isBooking && <BookingTabs/>)}
      <main className={`layout-main${isFullPage ? ' layout-main-inbox' : ''}`}>
        {isDashboard && <OnboardingProgress/>}
        <div key={location.pathname} className={`layout-route-content${isFullPage ? ' layout-route-content-inbox' : ''}`}>{localizeNode(permitted ? <Outlet/> : <section className="module-access-message"><h1>{translateText("Module access restricted")}</h1><p>{translateText("Your team permissions do not include this module. Contact your workspace owner to request access.")}</p></section>)}</div>
      </main>
      {localizeNode(!isFullPage && !isProductWorkspace && !isDashboard && <footer className="layout-footer"><span>{translateText("© 2025 GOS Inc.")}</span><span className="layout-footer-status"><i/>{translateText(" All systems operational")}</span></footer>)}
    </div>
  </div>;
};

