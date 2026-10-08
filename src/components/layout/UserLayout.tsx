import React from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, CalendarDays, Clock3, CreditCard, Filter, LayoutGrid, Link2, ListChecks, MessageCircle, Send, Settings, Sparkles, Users, MessageSquare } from 'lucide-react';
import { Sidebar, type SidebarItem } from './Sidebar';
import { Header } from './Header';

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
  { name: 'Templates', href: '/templates', icon: LayoutGrid, dividerBefore: true },
  { name: 'Settings', href: '/settings', icon: Settings, end: false },
];

const bookingTabs = [
  { label: 'Booking Links', value: 'links', icon: Link2 },
  { label: 'Calendar', value: 'calendar', icon: CalendarDays },
  { label: 'Bookings', value: 'bookings', icon: ListChecks },
  { label: 'Availability', value: 'availability', icon: Clock3 },
  { label: 'Automation', value: 'automation', icon: Sparkles },
  { label: 'Settings', value: 'settings', icon: Settings },
];

function BookingTabs() {
  const [params, setParams] = useSearchParams();
  const active = params.get('tab') ?? 'links';
  return <nav className="layout-booking-tabs" aria-label="Booking navigation">
    {bookingTabs.map(tab => <button key={tab.value} className={`layout-booking-tab relative${active === tab.value ? ' is-active' : ''}`} onClick={() => setParams({ tab: tab.value })} aria-current={active === tab.value ? 'page' : undefined}>
      {active === tab.value && (
        <motion.div
          layoutId="activeBookingTab"
          className="absolute inset-0 bg-[#efedff] dark:bg-[#30265b] rounded-[9px]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className="relative z-10 flex items-center gap-[7px]">
        <tab.icon size={15}/><span>{tab.label}</span>
      </div>
    </button>)}
  </nav>;
}

export const UserLayout: React.FC = () => {
  const location = useLocation();
  const isBooking = location.pathname === '/dashboard/booking';
  const isSettings = location.pathname.startsWith('/dashboard/settings') || location.pathname === '/dashboard/integrations';
  const isInbox = location.pathname === '/dashboard/inbox';
  const isCRM = /^\/(dashboard\/)?crm(?:\/|$)/.test(location.pathname);
  const isProductWorkspace = /^\/dashboard\/products-payments\/products\/[^/]+(?:\/(?:edit|pricing))?$/.test(location.pathname);
  const isTemplates = location.pathname === '/dashboard/templates';
  const isFullPage = isInbox || isCRM || isTemplates;
  return <div className={`layout-dashboard-shell user-dashboard-shell${isSettings ? ' is-settings-route' : ''}${isProductWorkspace ? ' is-product-workspace' : ''}${isFullPage ? ' is-inbox-route' : ''}${isTemplates ? ' is-templates-route h-screen max-h-screen overflow-hidden' : ''}${isCRM ? ' is-crm-route h-screen max-h-screen overflow-hidden' : ''}`}>
    <Sidebar items={userItems} basePath="/dashboard"/>
    <div className={`layout-workspace${isFullPage ? ' layout-workspace-inbox' : ''}`}>
      <Header title={isCRM ? 'CRM & Leads' : isProductWorkspace ? 'Products & Payments' : isSettings ? 'Settings' : undefined}/>
      {isBooking && <BookingTabs/>}
      <main className={`layout-main${isFullPage ? ' layout-main-inbox' : ''}`}>
        <AnimatePresence mode="wait"><motion.div key={location.pathname} className={`layout-route-content${isFullPage ? ' layout-route-content-inbox' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }}><Outlet/></motion.div></AnimatePresence>
      </main>
      {!isFullPage && !isProductWorkspace && <footer className="layout-footer"><span>© 2025 GOS Inc.</span><span className="layout-footer-status"><i/> All systems operational</span></footer>}
    </div>
  </div>;
};

