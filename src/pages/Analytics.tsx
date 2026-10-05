import React from 'react';
import { ArrowRight, CalendarDays, ChartColumnBig, ChartNoAxesColumnIncreasing, CircleDollarSign, MessageSquareText, Package, ShoppingBag, Target, UserRound, UserRoundPlus, Users, UsersRound } from 'lucide-react';
import aiCourseImg from '../assets/products/ai-course.jpg';
import strategyCallImg from '../assets/products/strategy-call.jpg';
import agencyKitImg from '../assets/products/agency-kit.jpg';
import whatsappSetupImg from '../assets/products/whatsapp-setup.jpg';
import growthBundleImg from '../assets/products/growth-bundle.jpg';
import { avatar, ChannelIcon, ChartFrame, DAYS, dayLabels, Delta, Donut, type Kpi, KpiRow, Legend, RangeSelect, type Segment, smoothPath, areaPath, dotsPath, Sparkline, toPoints, VH, VW, type ViewProps } from './analytics/kit';
import { BookingsView, ConversationsView, LeadsView, ProductsView, ReportsView, SalesView, TrafficView } from './analytics/views';
import './analytics.css';

type Props = { notify: (message: string) => void };

/* ───────────────────────── Navigation ───────────────────────── */
const tabs = [
  { name: 'Overview', icon: UsersRound, view: OverviewView },
  { name: 'Sales', icon: ShoppingBag, view: SalesView },
  { name: 'Leads', icon: UserRoundPlus, view: LeadsView },
  { name: 'Traffic', icon: ChartNoAxesColumnIncreasing, view: TrafficView },
  { name: 'Conversations', icon: MessageSquareText, view: ConversationsView },
  { name: 'Bookings', icon: CalendarDays, view: BookingsView },
  { name: 'Products', icon: Package, view: ProductsView },
  { name: 'Reports', icon: ChartColumnBig, view: ReportsView },
] as const;
type TabName = typeof tabs[number]['name'];

/* ───────────────────────── Page ───────────────────────── */
export const Analytics: React.FC<Props> = ({ notify }) => {
  const [activeAnalyticsTab, setActiveAnalyticsTab] = React.useState<TabName>('Overview');
  const [range] = React.useState('Last 30 days');
  const compare = `vs ${range.toLowerCase()}`;
  const ActiveView = (tabs.find(t => t.name === activeAnalyticsTab) ?? tabs[0]).view;

  return <main className="an-page">


    <nav className="an-tabs" role="tablist" aria-label="Analytics sections">
      {tabs.map(({ name, icon: Icon }) => <button key={name} role="tab" aria-selected={activeAnalyticsTab === name} className={activeAnalyticsTab === name ? 'active' : ''} onClick={() => setActiveAnalyticsTab(name)}><Icon size={15} />{name}</button>)}
    </nav>

    {/* key forces a clean mount + fade-in per tab; each view owns its own local state */}
    <div className="an-view-host" key={activeAnalyticsTab} role="tabpanel" aria-label={`${activeAnalyticsTab} analytics`}>
      <ActiveView notify={notify} compare={compare} />
    </div>
  </main>;
};

/* ═════════════════════════ OVERVIEW ═════════════════════════ */
const overviewKpis: Kpi[] = [
  { key: 'leads', label: 'Total Leads', value: '892', delta: '35%', icon: Users, tone: 'pink', color: '#ec4899', spark: [12, 14, 13, 17, 16, 19, 18, 22, 21, 25, 24, 29, 28, 34] },
  { key: 'revenue', label: 'Sales Revenue', value: '€12,430', delta: '52%', icon: CircleDollarSign, tone: 'green', color: '#16a34a', spark: [10, 12, 11, 14, 13, 15, 14, 18, 17, 21, 22, 25, 24, 32] },
  { key: 'bookings', label: 'Bookings', value: '173', delta: '28%', icon: CalendarDays, tone: 'blue', color: '#3b82f6', spark: [11, 10, 13, 12, 15, 14, 13, 16, 18, 17, 20, 19, 23, 26] },
  { key: 'customers', label: 'New Customers', value: '186', delta: '24%', icon: UserRound, tone: 'teal', color: '#14b8a6', spark: [9, 11, 10, 13, 12, 16, 14, 13, 17, 16, 21, 19, 24, 30] },
  { key: 'conversion', label: 'Conversion Rate', value: '5.8%', delta: '18%', icon: Target, tone: 'orange', color: '#f59e0b', spark: [12, 13, 12, 14, 15, 14, 16, 15, 17, 18, 17, 19, 21, 24] },
];

const revenueBars = [220, 380, 300, 460, 340, 420, 300, 380, 470, 360, 420, 520, 380, 460, 560, 430, 640, 500, 600, 470, 680, 560, 720, 820, 700, 880, 1060, 1120, 1320, 1680];
const orderBars = [160, 260, 220, 320, 250, 300, 240, 290, 340, 280, 310, 380, 300, 340, 400, 330, 450, 380, 430, 360, 480, 420, 520, 580, 520, 620, 740, 780, 900, 1100];
const orderTrend = [130, 170, 190, 210, 200, 220, 210, 230, 250, 240, 250, 270, 260, 280, 300, 290, 320, 330, 340, 330, 360, 370, 390, 420, 430, 460, 500, 540, 600, 680];

const traffic = [
  { name: 'Website', color: '#7c3aed', data: [980, 920, 1010, 960, 1080, 1020, 1140, 1060, 1180, 1100, 1050, 1150, 1120, 1240, 1160, 1300, 1220, 1180, 1340, 1260, 1380, 1300, 1360, 1280, 1420, 1340, 1460, 1380, 1500, 1640] },
  { name: 'Instagram', color: '#ec4899', data: [620, 680, 640, 720, 660, 600, 700, 640, 620, 680, 640, 720, 680, 740, 700, 780, 720, 760, 820, 760, 840, 800, 780, 860, 820, 880, 840, 900, 860, 1000] },
  { name: 'Facebook', color: '#3b82f6', data: [260, 300, 240, 280, 320, 260, 300, 340, 280, 320, 360, 300, 340, 380, 320, 360, 400, 340, 380, 420, 360, 400, 440, 380, 420, 460, 400, 440, 480, 520] },
  { name: 'Other', color: '#a3aac0', data: [120, 140, 110, 150, 130, 160, 140, 170, 150, 180, 160, 190, 170, 200, 180, 210, 190, 220, 200, 230, 210, 240, 220, 250, 230, 260, 240, 270, 250, 290] },
];

const customerGrowth = [24, 26, 32, 30, 44, 52, 48, 58, 56, 64, 62, 70, 68, 74, 80, 92, 98, 108, 124, 138, 152, 170, 178, 186, 190];

const sources = [
  { name: 'Instagram', count: 328, pct: 37, color: '#ec4899', kind: 'instagram' },
  { name: 'Facebook', count: 214, pct: 24, color: '#2563eb', kind: 'facebook' },
  { name: 'WhatsApp', count: 162, pct: 18, color: '#22c55e', kind: 'whatsapp' },
  { name: 'Messenger', count: 98, pct: 11, color: '#60a5fa', kind: 'messenger' },
  { name: 'Website', count: 64, pct: 7, color: '#8b5cf6', kind: 'website' },
  { name: 'Other', count: 26, pct: 3, color: '#cbd5e1', kind: 'other' },
];
const sourceSegments: Segment[] = sources.map(s => ({ name: s.name, value: s.count, color: s.color }));

const topProducts = [
  { name: 'Complete AI Marketing Course', image: aiCourseImg, price: '€297', sales: '124 sales', spark: [8, 10, 9, 12, 11, 14, 12, 15, 18, 16, 20] },
  { name: 'Strategy Call (1-on-1)', image: strategyCallImg, price: '€97', sales: '48 sales', spark: [9, 10, 9, 11, 10, 12, 11, 13, 12, 14, 16] },
  { name: 'Agency Starter Kit', image: agencyKitImg, price: '€67', sales: '210 sales', spark: [8, 9, 11, 10, 12, 11, 13, 12, 15, 14, 17] },
  { name: 'WhatsApp Automation Setup', image: whatsappSetupImg, price: '€497', sales: '36 sales', spark: [7, 9, 8, 10, 12, 11, 13, 12, 14, 16, 18] },
  { name: 'Business Growth Bundle', image: growthBundleImg, price: '€197', sales: '54 sales', spark: [9, 8, 10, 11, 10, 12, 13, 12, 14, 15, 17] },
];

const recentOrders = [
  { customer: 'Sarah Ahmed', avatar: 47, product: 'Complete AI Marketing Course', amount: '€297', date: 'Oct 26, 2024' },
  { customer: 'Omar Khaled', avatar: 13, product: 'Strategy Call (1-on-1)', amount: '€97', date: 'Oct 26, 2024' },
  { customer: 'Lina Mansour', avatar: 45, product: 'Agency Starter Kit', amount: '€67', date: 'Oct 25, 2024' },
  { customer: 'Ahmed Ali', avatar: 15, product: 'WhatsApp Automation Setup', amount: '€497', date: 'Oct 25, 2024' },
  { customer: 'Nour Hassan', avatar: 44, product: 'Business Growth Bundle', amount: '€197', date: 'Oct 24, 2024' },
];

function OverviewView({ notify, compare }: ViewProps) {
  return <div className="an-view">
    <KpiRow items={overviewKpis} compare={compare} />

    <div className="an-grid">
      {/* Revenue & Sales — bars + trend line */}
      <article className="an-card">
        <div className="an-card-head"><h2>Revenue &amp; Sales</h2><RangeSelect onChange={v => notify(`Revenue & Sales: ${v.toLowerCase()}.`)} /></div>
        <div className="an-summary"><b>€12,430</b><Delta value="52%" /><span>{compare}</span><Legend items={[['Revenue', '#7c3aed'], ['Orders', '#c4b5fd']]} /></div>
        <ChartFrame yLabels={['€2,000', '€1,500', '€1,000', '€500', '€0']} x={dayLabels(true)}>
          <defs>
            <linearGradient id="anRevBar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#a78bfa" /></linearGradient>
            <linearGradient id="anOrderBar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#d8ccff" /><stop offset="1" stopColor="#ede8ff" /></linearGradient>
          </defs>
          {revenueBars.map((v, i) => {
            const slot = VW / DAYS, rh = (v / 2000) * VH, oh = (orderBars[i] / 2000) * VH;
            return <g key={i} className="an-bar-group">
              <title>{`Sep ${i + 1} · Revenue €${v.toLocaleString()} · Orders ${Math.round(orderBars[i] / 10)}`}</title>
              <rect x={i * slot + slot * 0.14} y={VH - rh} width={slot * 0.36} height={rh} rx="1.1" fill="url(#anRevBar)" />
              <rect x={i * slot + slot * 0.5} y={VH - oh} width={slot * 0.36} height={oh} rx="1.1" fill="url(#anOrderBar)" />
            </g>;
          })}
          {(() => { const pts = toPoints(orderTrend, 2000, true); return <>
            <path d={smoothPath(pts)} fill="none" stroke="#c4b5fd" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            <path d={dotsPath(pts)} stroke="#b9a6fb" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={dotsPath(pts)} stroke="#fff" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>; })()}
        </ChartFrame>
      </article>

      {/* Leads by Source — donut */}
      <article className="an-card">
        <div className="an-card-head"><h2>Leads by Source</h2><RangeSelect onChange={v => notify(`Leads by Source: ${v.toLowerCase()}.`)} /></div>
        <div className="an-sources">
          <Donut segments={sourceSegments} center={<><b>892</b><small>Total Leads</small></>} />
          <ul className="an-source-list">
            {sources.map(s => <li key={s.name}><i style={{ background: s.color }} /><ChannelIcon kind={s.kind} /><span>{s.name}</span><b>{s.count}</b><em>{s.pct}%</em></li>)}
          </ul>
        </div>
      </article>

      {/* Traffic Overview — multi-line */}
      <article className="an-card">
        <div className="an-card-head"><h2>Traffic Overview</h2><RangeSelect onChange={v => notify(`Traffic Overview: ${v.toLowerCase()}.`)} /></div>
        <div className="an-summary"><b>18,432</b><Delta value="41%" /><Legend items={traffic.map(t => [t.name, t.color] as [string, string])} /></div>
        <ChartFrame yLabels={['2,000', '1,000', '0']}>
          <defs><linearGradient id="anTrafficFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7c3aed" stopOpacity=".14" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient></defs>
          <path d={areaPath(toPoints(traffic[0].data, 2000))} fill="url(#anTrafficFill)" />
          {traffic.map(t => { const pts = toPoints(t.data, 2000); return <g key={t.name} className="an-series">
            <title>{t.name}</title>
            <path d={smoothPath(pts)} fill="none" stroke={t.color} strokeWidth={t.name === 'Other' ? 1.3 : 1.7} vectorEffect="non-scaling-stroke" />
            <path d={dotsPath(pts)} stroke={t.color} strokeWidth="3.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>; })}
        </ChartFrame>
      </article>

      {/* Top Performing Products */}
      <article className="an-card">
        <div className="an-card-head"><h2>Top Performing Products</h2><button className="an-link" onClick={() => notify('Opening all products.')}>View All <ArrowRight size={13} /></button></div>
        <ul className="an-products">
          {topProducts.map(p => <li key={p.name}><img src={p.image} alt="" /><span className="an-product-name">{p.name}</span><b>{p.price}</b><em>{p.sales}</em><Sparkline data={p.spark} color="#7c3aed" fill={false} className="an-product-spark" /></li>)}
        </ul>
      </article>

      {/* Recent Orders */}
      <article className="an-card">
        <div className="an-card-head"><h2>Recent Orders</h2><button className="an-link" onClick={() => notify('Opening all orders.')}>View All <ArrowRight size={13} /></button></div>
        <div className="an-table-wrap">
          <table className="an-table fill">
            <colgroup><col style={{ width: '24%' }} /><col style={{ width: '36%' }} /><col style={{ width: '12%' }} /><col style={{ width: '16%' }} /><col style={{ width: '12%' }} /></colgroup>
            <thead><tr><th>Customer</th><th>Product / Service</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {recentOrders.map(o => <tr key={o.customer}>
                <td><span className="an-customer"><img src={avatar(o.avatar)} alt="" />{o.customer}</span></td>
                <td>{o.product}</td><td>{o.amount}</td><td>{o.date}</td><td><span className="an-badge paid">Paid</span></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </article>

      {/* Customer Growth — area */}
      <article className="an-card">
        <div className="an-card-head"><h2>Customer Growth</h2><RangeSelect onChange={v => notify(`Customer Growth: ${v.toLowerCase()}.`)} /></div>
        <div className="an-summary"><b>186</b><Delta value="24%" /><span>{compare}</span></div>
        <ChartFrame yLabels={['200', '100', '0']}>
          <defs><linearGradient id="anGrowthFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7c3aed" stopOpacity=".26" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient></defs>
          {(() => { const pts = toPoints(customerGrowth, 200); return <>
            <path d={areaPath(pts)} fill="url(#anGrowthFill)" />
            <path d={smoothPath(pts)} fill="none" stroke="#7c3aed" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            <path d={dotsPath(pts)} stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>; })()}
        </ChartFrame>
      </article>
    </div>
  </div>;
}
