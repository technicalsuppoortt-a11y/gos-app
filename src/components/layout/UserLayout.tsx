import React from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, CalendarDays, Clock3, Filter, Layers, Link2, ListChecks, MessageCircle, Puzzle, Settings, ShoppingBag, Sparkles, Users, LayoutDashboard } from 'lucide-react';
import { Sidebar, type SidebarItem } from './Sidebar';
import { Header } from './Header';

const userItems: SidebarItem[] = [
  { name: 'Dashboard', href: '', icon: LayoutDashboard, end: true },
  { name: 'Funnel & Website', href: '/funnels', icon: Filter },
  { name: 'Inbox', href: '/inbox', icon: MessageCircle, badge: '12' },
  { name: 'CRM & Leads', href: '/crm', icon: Users },
  { name: 'AI Follow-Up', href: '/follow-up', icon: Sparkles },
  { name: 'Booking & Calendar', href: '/booking', icon: CalendarDays },
  { name: 'Products & Payments', href: '/products', icon: ShoppingBag },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Templates', href: '/templates', icon: Layers, dividerBefore: true },
  { name: 'Integrations', href: '/integrations', icon: Puzzle },
  { name: 'Settings', href: '/settings', icon: Settings },
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
    {bookingTabs.map(tab => <button key={tab.value} className={`layout-booking-tab${active === tab.value ? ' is-active' : ''}`} onClick={() => setParams({ tab: tab.value })} aria-current={active === tab.value ? 'page' : undefined}>
      <tab.icon size={15}/><span>{tab.label}</span>
    </button>)}
  </nav>;
}

export const UserLayout: React.FC = () => {
  const location = useLocation();
  const isBooking = location.pathname === '/dashboard/booking';
  return <div className="layout-dashboard-shell user-dashboard-shell">
    <Sidebar items={userItems} basePath="/dashboard"/>
    <div className="layout-workspace">
      <Header/>
      {isBooking && <BookingTabs/>}
      <main className="layout-main">
        <AnimatePresence mode="wait"><motion.div key={location.pathname} className="layout-route-content" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }}><Outlet/></motion.div></AnimatePresence>
      </main>
      <footer className="layout-footer"><span>© 2025 GOS Inc.</span><span className="layout-footer-status"><i/> All systems operational</span></footer>
    </div>
  </div>;
};
