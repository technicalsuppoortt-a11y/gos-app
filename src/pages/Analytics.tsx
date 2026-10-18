import { LiveAnalytics } from './analytics/LiveAnalytics';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import React from 'react';
import { ArrowRight, CalendarDays, ChartColumnBig, ChartNoAxesColumnIncreasing, CircleDollarSign, MessageSquareText, Package, ShoppingBag, Target, UserRound, UserRoundPlus, Users, UsersRound } from 'lucide-react';
import aiCourseImg from '../assets/products/ai-course.jpg';
import strategyCallImg from '../assets/products/strategy-call.jpg';
import agencyKitImg from '../assets/products/agency-kit.jpg';
import whatsappSetupImg from '../assets/products/whatsapp-setup.jpg';
import growthBundleImg from '../assets/products/growth-bundle.jpg';
import { avatar, ChannelIcon, ChartFrame, DAYS, dayLabels, Delta, Donut, type Kpi, KpiRow, Legend, RangeSelect, type Segment, smoothPath, areaPath, dotsPath, Sparkline, toPoints, VH, VW, type ViewProps } from './analytics/kit';

import './analytics.css';

type Props = { notify: (message: string) => void };

/* ───────────────────────── Navigation ───────────────────────── */
const tabs = [
  { name: 'Overview', icon: UsersRound },
  { name: 'Sales', icon: ShoppingBag },
  { name: 'Leads', icon: UserRoundPlus },
  { name: 'Traffic', icon: ChartNoAxesColumnIncreasing },
  { name: 'Conversations', icon: MessageSquareText },
  { name: 'Bookings', icon: CalendarDays },
  { name: 'Products', icon: Package },
  { name: 'Reports', icon: ChartColumnBig },
] as const;
type TabName = typeof tabs[number]['name'];

/* ───────────────────────── Page ───────────────────────── */
export const Analytics: React.FC<Props> = ({ notify }) => {
  useUILanguage();
  const [activeAnalyticsTab, setActiveAnalyticsTab] = React.useState<TabName>('Overview');
  const [range] = React.useState('Last 30 days');
  const compare = `vs ${range.toLowerCase()}`;


  return <main className="an-page">


    <nav className="an-tabs" role="tablist" aria-label={translateText("Analytics sections")}>
      {localizeNode(tabs.map(({ name, icon: Icon }) => <button key={name} role="tab" aria-selected={activeAnalyticsTab === name} className={activeAnalyticsTab === name ? 'active' : ''} onClick={() => setActiveAnalyticsTab(name)}><Icon size={15} />{localizeNode(name)}</button>))}
    </nav>

    {/* key forces a clean mount + fade-in per tab; each view owns its own local state */}
    <div className="an-view-host" key={activeAnalyticsTab} role="tabpanel" aria-label={translateText(`${activeAnalyticsTab} analytics`)}>
      <LiveAnalytics tab={activeAnalyticsTab}/>
    </div>
  </main>;
};
