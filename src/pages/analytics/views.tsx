import React from 'react';
import { BadgeCheck, Bot, CalendarClock, CalendarDays, CalendarX2, CircleCheck, CircleDollarSign, Clock, Coins, Download, Eye, FileDown, FileSpreadsheet, FileText, Filter, Gauge, Globe, HeartHandshake, Landmark, Megaphone, MessageSquareText, MousePointerClick, Package, Plus, Repeat, RotateCcw, ShoppingCart, Sparkles, Target, Timer, TrendingUp, Trophy, Undo2, UserCheck, Users } from 'lucide-react';
import aiCourseImg from '../../assets/products/ai-course.jpg';
import socialPackImg from '../../assets/products/social-pack.jpg';
import strategyCallImg from '../../assets/products/strategy-call.jpg';
import whatsappSetupImg from '../../assets/products/whatsapp-setup.jpg';
import funnelSetupImg from '../../assets/products/funnel-setup.jpg';
import agencyKitImg from '../../assets/products/agency-kit.jpg';
import gosProImg from '../../assets/products/gos-pro.jpg';
import growthBundleImg from '../../assets/products/growth-bundle.jpg';
import { avatar, Card, ChannelIcon, ChartFrame, DAYS, dayLabels, Delta, Donut, DonutLegend, downloadCsv, FilterPills, HBarList, type Kpi, KpiRow, Legend, Modal, RangeSelect, type Segment, series, smoothPath, areaPath, dotsPath, Sparkline, StatusBadge, toPoints, VH, VW, type ViewProps } from './kit';

const rangeAction = (notify: ViewProps['notify'], card: string) => <RangeSelect onChange={v => notify(`${card}: ${v.toLowerCase()}.`)} />;
const countBy = <T,>(rows: T[], key: (r: T) => string, value: string) => rows.filter(r => key(r) === value).length;

/* ═════════════════════════ SALES ═════════════════════════ */
const salesKpis: Kpi[] = [
  { key: 'rev', label: 'Total Sales Revenue', value: '€12,430', delta: '52%', icon: CircleDollarSign, tone: 'green', color: '#16a34a', spark: [10, 12, 11, 14, 13, 15, 14, 18, 17, 21, 22, 25, 24, 32] },
  { key: 'aov', label: 'Average Order Value', value: '€142.80', delta: '8.4%', icon: ShoppingCart, tone: 'violet', color: '#7c3aed', spark: [12, 13, 12, 14, 13, 15, 16, 15, 17, 16, 18, 17, 19, 20] },
  { key: 'refund', label: 'Refund Rate', value: '1.9%', delta: '0.4%', down: true, icon: RotateCcw, tone: 'orange', color: '#f59e0b', spark: [24, 23, 24, 21, 22, 20, 21, 19, 18, 19, 17, 16, 17, 15] },
  { key: 'mrr', label: 'Recurring Revenue (MRR)', value: '€2,494', delta: '12%', icon: Repeat, tone: 'blue', color: '#3b82f6', spark: [11, 12, 12, 13, 14, 14, 15, 16, 16, 17, 18, 19, 19, 21] },
];
const grossRevenue = series(DAYS, 260, 32, 85, 1).map((v, i) => v + (i > 23 ? (i - 23) * 95 : 0));
const netRevenue = grossRevenue.map((v, i) => Math.round(v * 0.84 - (i % 7 === 3 ? 60 : 0)));
const revenueMix: Segment[] = [
  { name: 'Online Courses', value: 4455, color: '#7c3aed' }, { name: 'Services', value: 3480, color: '#ec4899' },
  { name: 'Digital Products', value: 1990, color: '#3b82f6' }, { name: 'Subscriptions', value: 1490, color: '#f59e0b' }, { name: 'Bundles', value: 1015, color: '#14b8a6' },
];
type Txn = { id: string; customer: string; avatar: number; product: string; method: string; amount: string; date: string; status: 'Paid' | 'Pending' | 'Refunded' };
const txns: Txn[] = ([
  ['#TX-2048', 'Sarah Ahmed', 47, 'Complete AI Marketing Course', 'Card', '€297', 'Oct 26, 2024', 'Paid'],
  ['#TX-2047', 'Omar Khaled', 13, 'Strategy Call (1-on-1)', 'PayPal', '€97', 'Oct 26, 2024', 'Paid'],
  ['#TX-2046', 'Lina Mansour', 45, 'Agency Starter Kit', 'Card', '€67', 'Oct 25, 2024', 'Pending'],
  ['#TX-2045', 'Ahmed Ali', 15, 'WhatsApp Automation Setup', 'Bank transfer', '€497', 'Oct 25, 2024', 'Paid'],
  ['#TX-2044', 'Nour Hassan', 44, 'Business Growth Bundle', 'Card', '€197', 'Oct 24, 2024', 'Refunded'],
  ['#TX-2043', 'Youssef Adel', 33, 'GOS Pro Membership', 'Card', '€29', 'Oct 24, 2024', 'Paid'],
  ['#TX-2042', 'Mariam Saleh', 49, 'Social Media Templates Pack', 'Apple Pay', '€47', 'Oct 23, 2024', 'Paid'],
  ['#TX-2041', 'Karim Nabil', 51, 'Done-For-You Funnel Setup', 'PayPal', '€497', 'Oct 23, 2024', 'Pending'],
  ['#TX-2040', 'Hana Fawzy', 41, 'Complete AI Marketing Course', 'Card', '€297', 'Oct 22, 2024', 'Paid'],
  ['#TX-2039', 'Tarek Samir', 53, 'Agency Starter Kit', 'Card', '€67', 'Oct 22, 2024', 'Refunded'],
  ['#TX-2038', 'Dina Mostafa', 36, 'GOS Pro Membership', 'Card', '€29', 'Oct 21, 2024', 'Paid'],
  ['#TX-2037', 'Mostafa Gamal', 59, 'Strategy Call (1-on-1)', 'Apple Pay', '€97', 'Oct 21, 2024', 'Paid'],
] as const).map(([id, customer, av, product, method, amount, date, status]) => ({ id, customer, avatar: av, product, method, amount, date, status }));

export function SalesView({ notify, compare }: ViewProps) {
  const [status, setStatus] = React.useState('All');
  const rows = status === 'All' ? txns : txns.filter(t => t.status === status);
  return <div className="an-view">
    <KpiRow items={salesKpis} compare={compare} />
    <div className="an-body">
      <Card title="Revenue Breakdown" action={rangeAction(notify, 'Revenue Breakdown')}>
        <div className="an-summary"><b>€12,430</b><Delta value="52%" /><span>net · €14,798 gross</span><Legend items={[['Gross revenue', '#c4b5fd'], ['Net revenue', '#7c3aed']]} /></div>
        <ChartFrame yLabels={['€2,000', '€1,500', '€1,000', '€500', '€0']} x={dayLabels(true)}>
          <defs>
            <linearGradient id="anGrossBar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#d8ccff" /><stop offset="1" stopColor="#efeaff" /></linearGradient>
            <linearGradient id="anNetFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7c3aed" stopOpacity=".28" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient>
          </defs>
          {grossRevenue.map((v, i) => { const slot = VW / DAYS, h = (Math.min(v, 2000) / 2000) * VH; return <rect key={i} className="an-bar" x={i * slot + slot * 0.2} y={VH - h} width={slot * 0.6} height={h} rx="1.2" fill="url(#anGrossBar)"><title>{`Sep ${i + 1} · Gross €${v.toLocaleString()} · Net €${netRevenue[i].toLocaleString()}`}</title></rect>; })}
          {(() => { const pts = toPoints(netRevenue, 2000, true); return <>
            <path d={areaPath(pts)} fill="url(#anNetFill)" />
            <path d={smoothPath(pts)} fill="none" stroke="#7c3aed" strokeWidth="1.9" vectorEffect="non-scaling-stroke" />
            <path d={dotsPath(pts)} stroke="#7c3aed" strokeWidth="4.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>; })()}
        </ChartFrame>
      </Card>
      <Card title="Revenue by Category" action={rangeAction(notify, 'Revenue by Category')}>
        <div className="an-split"><Donut segments={revenueMix} center={<><b>€12.4K</b><small>Net revenue</small></>} /><DonutLegend segments={revenueMix} format={v => `€${v.toLocaleString()}`} /></div>
      </Card>
      <Card title="Transactions" className="span-2" action={<div className="an-head-tools"><FilterPills value={status} onChange={setStatus} options={[['All', txns.length], ...(['Paid', 'Pending', 'Refunded'] as const).map(s => [s, countBy(txns, t => t.status, s)] as [string, number])]} /><button className="an-ghost" onClick={() => { downloadCsv('transactions.csv', [['ID', 'Customer', 'Product', 'Method', 'Amount', 'Date', 'Status'], ...rows.map(t => [t.id, t.customer, t.product, t.method, t.amount, t.date, t.status])]); notify('Transactions exported to CSV.'); }}><FileDown size={13} />Export</button></div>}>
        <div className="an-table-wrap scroll">
          <table className="an-table">
            <colgroup><col style={{ width: '11%' }} /><col style={{ width: '19%' }} /><col style={{ width: '27%' }} /><col style={{ width: '13%' }} /><col style={{ width: '9%' }} /><col style={{ width: '12%' }} /><col style={{ width: '9%' }} /></colgroup>
            <thead><tr><th>Order</th><th>Customer</th><th>Product / Service</th><th>Method</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>{rows.map(t => <tr key={t.id}><td className="an-mono">{t.id}</td><td><span className="an-customer"><img src={avatar(t.avatar)} alt="" />{t.customer}</span></td><td>{t.product}</td><td>{t.method}</td><td><b>{t.amount}</b></td><td>{t.date}</td><td><StatusBadge status={t.status} /></td></tr>)}</tbody>
          </table>
          {!rows.length && <p className="an-empty">No transactions with this status.</p>}
        </div>
      </Card>
    </div>
  </div>;
}

/* ═════════════════════════ LEADS ═════════════════════════ */
const leadKpis: Kpi[] = [
  { key: 'new', label: 'Total New Leads', value: '892', delta: '35%', icon: Users, tone: 'pink', color: '#ec4899', spark: [12, 14, 13, 17, 16, 19, 18, 22, 21, 25, 24, 29, 28, 34] },
  { key: 'growth', label: 'Lead Growth Rate', value: '35.2%', delta: '9.1%', icon: TrendingUp, tone: 'violet', color: '#7c3aed', spark: [8, 9, 11, 10, 12, 13, 12, 15, 14, 16, 18, 17, 20, 22] },
  { key: 'cpl', label: 'Cost Per Lead (CPL)', value: '€4.80', delta: '12%', down: true, icon: Coins, tone: 'orange', color: '#f59e0b', spark: [26, 25, 26, 24, 23, 24, 22, 21, 22, 20, 19, 20, 18, 17] },
  { key: 'qualified', label: 'Qualified Leads', value: '318', delta: '21%', icon: BadgeCheck, tone: 'teal', color: '#14b8a6', spark: [9, 11, 10, 13, 12, 16, 14, 13, 17, 16, 21, 19, 24, 30] },
];
const funnel = [
  { label: 'Visits', value: '18,432', note: 'All tracked sessions', width: 100, color: '#7c3aed' },
  { label: 'Leads', value: '892', note: '4.8% of visits', width: 74, color: '#8b5cf6' },
  { label: 'MQLs', value: '318', note: '35.7% of leads', width: 52, color: '#a78bfa' },
  { label: 'Customers', value: '186', note: '58.5% of MQLs', width: 34, color: '#c4b5fd' },
];
const leadQuality: Segment[] = [
  { name: 'Hot', value: 118, color: '#f43f5e' }, { name: 'Warm', value: 200, color: '#f59e0b' },
  { name: 'Cold', value: 384, color: '#3b82f6' }, { name: 'Unqualified', value: 190, color: '#cbd5e1' },
];
type Lead = { name: string; avatar: number; email: string; source: string; kind: string; quality: 'Hot' | 'Warm' | 'Cold'; score: number; date: string };
const leads: Lead[] = [
  { name: 'Salma Ibrahim', avatar: 32, email: 'salma@brightpath.co', source: 'Instagram', kind: 'instagram', quality: 'Hot', score: 92, date: 'Oct 26, 2024' },
  { name: 'Hassan Reda', avatar: 60, email: 'hassan.reda@orbitlabs.io', source: 'WhatsApp', kind: 'whatsapp', quality: 'Hot', score: 88, date: 'Oct 26, 2024' },
  { name: 'Rania Fathy', avatar: 26, email: 'rania@studiofathy.com', source: 'Facebook', kind: 'facebook', quality: 'Warm', score: 74, date: 'Oct 25, 2024' },
  { name: 'Adam Mahmoud', avatar: 52, email: 'adam.m@northwind.io', source: 'Website', kind: 'website', quality: 'Warm', score: 69, date: 'Oct 25, 2024' },
  { name: 'Laila Kamal', avatar: 24, email: 'laila@kamalcreative.co', source: 'Messenger', kind: 'messenger', quality: 'Cold', score: 41, date: 'Oct 24, 2024' },
  { name: 'Omar Farouk', avatar: 57, email: 'omar.farouk@gmail.com', source: 'Instagram', kind: 'instagram', quality: 'Warm', score: 71, date: 'Oct 24, 2024' },
  { name: 'Yara Hossam', avatar: 29, email: 'yara@bloomagency.com', source: 'WhatsApp', kind: 'whatsapp', quality: 'Hot', score: 90, date: 'Oct 23, 2024' },
  { name: 'Ziad Sherif', avatar: 68, email: 'ziad.sherif@outlook.com', source: 'Facebook', kind: 'facebook', quality: 'Cold', score: 36, date: 'Oct 23, 2024' },
  { name: 'Nada Wael', avatar: 20, email: 'nada@wael.studio', source: 'Website', kind: 'website', quality: 'Warm', score: 66, date: 'Oct 22, 2024' },
  { name: 'Khaled Ezz', avatar: 65, email: 'k.ezz@brandforge.io', source: 'Instagram', kind: 'instagram', quality: 'Cold', score: 38, date: 'Oct 22, 2024' },
];

export function LeadsView({ notify, compare }: ViewProps) {
  const [quality, setQuality] = React.useState('All');
  const rows = quality === 'All' ? leads : leads.filter(l => l.quality === quality);
  return <div className="an-view">
    <KpiRow items={leadKpis} compare={compare} />
    <div className="an-body">
      <Card title="Lead Acquisition Funnel" action={rangeAction(notify, 'Lead Acquisition Funnel')}>
        <div className="an-funnel">
          {funnel.map(s => <div className="an-funnel-row" key={s.label}>
            <div className="an-funnel-meta"><b>{s.label}</b><span>{s.note}</span></div>
            <div className="an-funnel-track"><div className="an-funnel-bar" style={{ width: `${s.width}%`, background: s.color }}><span>{s.value}</span></div></div>
          </div>)}
        </div>
      </Card>
      <Card title="Lead Quality Distribution" action={rangeAction(notify, 'Lead Quality')}>
        <div className="an-split"><Donut segments={leadQuality} center={<><b>318</b><small>Qualified</small></>} /><DonutLegend segments={leadQuality} /></div>
      </Card>
      <Card title="Recent Leads" className="span-2" action={<div className="an-head-tools"><FilterPills value={quality} onChange={setQuality} options={[['All', leads.length], ...(['Hot', 'Warm', 'Cold'] as const).map(q => [q, countBy(leads, l => l.quality, q)] as [string, number])]} /><button className="an-link" onClick={() => notify('Opening CRM & Leads.')}>Open CRM</button></div>}>
        <div className="an-table-wrap scroll">
          <table className="an-table">
            <colgroup><col style={{ width: '20%' }} /><col style={{ width: '26%' }} /><col style={{ width: '16%' }} /><col style={{ width: '11%' }} /><col style={{ width: '13%' }} /><col style={{ width: '14%' }} /></colgroup>
            <thead><tr><th>Lead</th><th>Email</th><th>Source</th><th>Quality</th><th>Score</th><th>Captured</th></tr></thead>
            <tbody>{rows.map(l => <tr key={l.email}>
              <td><span className="an-customer"><img src={avatar(l.avatar)} alt="" />{l.name}</span></td>
              <td className="an-muted-cell">{l.email}</td>
              <td><span className="an-source-badge"><ChannelIcon kind={l.kind} />{l.source}</span></td>
              <td><StatusBadge status={l.quality} /></td>
              <td><span className="an-score"><i style={{ width: `${l.score}%` }} /></span><small className="an-score-num">{l.score}</small></td>
              <td>{l.date}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>;
}

/* ═════════════════════════ TRAFFIC ═════════════════════════ */
const trafficKpis: Kpi[] = [
  { key: 'visitors', label: 'Unique Visitors', value: '18,432', delta: '41%', icon: Users, tone: 'violet', color: '#7c3aed', spark: [10, 12, 11, 14, 13, 16, 15, 18, 17, 20, 19, 23, 24, 28] },
  { key: 'views', label: 'Page Views', value: '52,816', delta: '33%', icon: MousePointerClick, tone: 'blue', color: '#3b82f6', spark: [12, 13, 12, 15, 14, 16, 15, 18, 19, 18, 21, 22, 21, 25] },
  { key: 'bounce', label: 'Bounce Rate', value: '38.4%', delta: '6.2%', down: true, icon: Undo2, tone: 'orange', color: '#f59e0b', spark: [24, 25, 23, 24, 22, 23, 21, 22, 20, 19, 20, 18, 17, 16] },
  { key: 'session', label: 'Avg. Session Duration', value: '3m 12s', delta: '14%', icon: Timer, tone: 'teal', color: '#14b8a6', spark: [11, 12, 11, 13, 14, 13, 15, 14, 16, 17, 16, 18, 19, 21] },
];
const visitors = series(DAYS, 470, 9, 70, 2);
const pageViews = visitors.map((v, i) => Math.round(v * 2.75 + Math.sin(i * 0.9) * 90));
const devices: Segment[] = [{ name: 'Mobile', value: 11428, color: '#7c3aed' }, { name: 'Desktop', value: 5714, color: '#3b82f6' }, { name: 'Tablet', value: 1290, color: '#f59e0b' }];
const code = (c: string) => <span className="an-code">{c}</span>;
const favicon = (kind: string) => kind === 'web' ? <span className="an-ch web"><Globe size={10} strokeWidth={2.4} /></span> : <ChannelIcon kind={kind} />;

export function TrafficView({ notify, compare }: ViewProps) {
  return <div className="an-view">
    <KpiRow items={trafficKpis} compare={compare} />
    <div className="an-body">
      <Card title="Daily Traffic Trends" action={rangeAction(notify, 'Daily Traffic Trends')}>
        <div className="an-summary"><b>18,432</b><Delta value="41%" /><span>unique visitors</span><Legend items={[['Visitors', '#7c3aed'], ['Page views', '#3b82f6']]} /></div>
        <ChartFrame yLabels={['2,400', '1,600', '800', '0']}>
          <defs>
            <linearGradient id="anViewsFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity=".16" /><stop offset="1" stopColor="#3b82f6" stopOpacity="0" /></linearGradient>
            <linearGradient id="anVisitorsFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7c3aed" stopOpacity=".3" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient>
          </defs>
          {[{ d: pageViews, c: '#3b82f6', fill: 'anViewsFill', n: 'Page views' }, { d: visitors, c: '#7c3aed', fill: 'anVisitorsFill', n: 'Visitors' }].map(s => { const pts = toPoints(s.d, 2400); return <g key={s.n} className="an-series"><title>{s.n}</title>
            <path d={areaPath(pts)} fill={`url(#${s.fill})`} />
            <path d={smoothPath(pts)} fill="none" stroke={s.c} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
          </g>; })}
        </ChartFrame>
      </Card>
      <Card title="Audience Breakdown" action={rangeAction(notify, 'Audience Breakdown')}>
        <div className="an-split">
          <div className="an-device"><Donut segments={devices} center={<><b>62%</b><small>Mobile</small></>} /><DonutLegend segments={devices} /></div>
          <HBarList color="#8b5cf6" items={[
            { label: 'Egypt', value: '6,267', pct: 34, icon: code('EG') }, { label: 'Saudi Arabia', value: '4,055', pct: 22, icon: code('SA') },
            { label: 'UAE', value: '2,949', pct: 16, icon: code('AE') }, { label: 'Germany', value: '1,659', pct: 9, icon: code('DE') },
            { label: 'United Kingdom', value: '1,290', pct: 7, icon: code('GB') }, { label: 'Other', value: '2,212', pct: 12, icon: code('··') },
          ]} />
        </div>
      </Card>
      <Card title="Top Landing Pages" action={<button className="an-link" onClick={() => notify('Opening page analytics.')}>View All</button>}>
        <HBarList items={[
          { label: '/ai-marketing-course', value: '5,530', pct: 30 }, { label: '/ (Home)', value: '4,240', pct: 23 }, { label: '/strategy-call', value: '2,580', pct: 14 },
          { label: '/templates-pack', value: '2,212', pct: 12 }, { label: '/gos-pro', value: '1,659', pct: 9 }, { label: '/blog/ai-funnels', value: '1,290', pct: 7 },
        ]} />
      </Card>
      <Card title="Referring Domains" action={<button className="an-link" onClick={() => notify('Opening referral sources.')}>View All</button>}>
        <HBarList color="#ec4899" items={[
          { label: 'instagram.com', value: '5,714', pct: 31, icon: favicon('instagram') }, { label: 'google.com', value: '4,424', pct: 24, icon: favicon('web') },
          { label: 'facebook.com', value: '3,133', pct: 17, icon: favicon('facebook') }, { label: 'wa.me', value: '2,212', pct: 12, icon: favicon('whatsapp') },
          { label: 'linkedin.com', value: '1,659', pct: 9, icon: favicon('web') }, { label: 'youtube.com', value: '1,290', pct: 7, icon: favicon('web') },
        ]} />
      </Card>
    </div>
  </div>;
}

/* ═════════════════════════ CONVERSATIONS ═════════════════════════ */
const convKpis: Kpi[] = [
  { key: 'inq', label: 'Total Inquiries', value: '1,284', delta: '22%', icon: MessageSquareText, tone: 'violet', color: '#7c3aed', spark: [10, 12, 11, 14, 13, 15, 17, 16, 19, 18, 21, 22, 24, 27] },
  { key: 'resp', label: 'Avg. Response Time', value: '1m 48s', delta: '31%', down: true, icon: Timer, tone: 'blue', color: '#3b82f6', spark: [26, 24, 25, 22, 23, 20, 21, 19, 18, 17, 18, 15, 14, 13] },
  { key: 'res', label: 'Resolution Rate', value: '92.6%', delta: '4.1%', icon: CircleCheck, tone: 'green', color: '#16a34a', spark: [14, 15, 15, 16, 15, 17, 17, 18, 17, 19, 19, 20, 20, 21] },
  { key: 'ai', label: 'AI Auto-reply Rate', value: '68%', delta: '15%', icon: Bot, tone: 'pink', color: '#ec4899', spark: [9, 10, 12, 11, 13, 14, 13, 16, 17, 16, 19, 20, 21, 24] },
];
const hourlyAi = [4, 3, 2, 2, 1, 2, 4, 9, 18, 28, 36, 42, 40, 34, 30, 32, 35, 38, 44, 52, 56, 48, 30, 14];
const hourlyHuman = [2, 1, 1, 1, 0, 1, 2, 5, 10, 16, 22, 24, 22, 18, 16, 18, 19, 20, 22, 24, 22, 18, 12, 6];
const hourLabels: Array<[number, string]> = ([[0, '12am'], [4, '4am'], [8, '8am'], [12, '12pm'], [16, '4pm'], [20, '8pm'], [23, '11pm']] as Array<[number, string]>).map(([h, l]) => [(h + 0.5) / 24, l]);
const channels: Segment[] = [{ name: 'WhatsApp', value: 591, color: '#22c55e' }, { name: 'Messenger', value: 270, color: '#3b82f6' }, { name: 'Live Chat', value: 231, color: '#7c3aed' }, { name: 'Instagram', value: 192, color: '#ec4899' }];
const channelIcons = { WhatsApp: <ChannelIcon kind="whatsapp" />, Messenger: <ChannelIcon kind="messenger" />, 'Live Chat': <ChannelIcon kind="chat" />, Instagram: <ChannelIcon kind="instagram" /> };

export function ConversationsView({ notify, compare }: ViewProps) {
  return <div className="an-view">
    <KpiRow items={convKpis} compare={compare} />
    <div className="an-body">
      <Card title="Hourly Chat Volume" action={rangeAction(notify, 'Hourly Chat Volume')}>
        <div className="an-summary"><b>1,284</b><Delta value="22%" /><span>peak 8–9 PM</span><Legend items={[['AI handled', '#7c3aed'], ['Human agents', '#c4b5fd']]} /></div>
        <ChartFrame yLabels={['80', '60', '40', '20', '0']} x={hourLabels}>
          <defs><linearGradient id="anAiBar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#a78bfa" /></linearGradient></defs>
          {hourlyAi.map((ai, h) => { const slot = VW / 24, ah = (ai / 80) * VH, hh = (hourlyHuman[h] / 80) * VH; return <g key={h} className="an-bar-group"><title>{`${h}:00 · AI ${ai} · Human ${hourlyHuman[h]}`}</title>
            <rect x={h * slot + slot * 0.2} y={VH - ah - hh} width={slot * 0.6} height={hh} rx="1.2" fill="#d8ccff" />
            <rect x={h * slot + slot * 0.2} y={VH - ah} width={slot * 0.6} height={ah} rx="1.2" fill="url(#anAiBar)" />
          </g>; })}
        </ChartFrame>
      </Card>
      <Card title="Channel Distribution" action={rangeAction(notify, 'Channel Distribution')}>
        <div className="an-split"><Donut segments={channels} center={<><b>1,284</b><small>Inquiries</small></>} /><DonutLegend segments={channels} icons={channelIcons} /></div>
      </Card>
      <Card title="Conversation Outcomes">
        <HBarList items={[
          { label: 'Lead qualified', value: '488', pct: 38, color: '#7c3aed' }, { label: 'Support resolved', value: '244', pct: 19, color: '#14b8a6' },
          { label: 'Booked a call', value: '270', pct: 21, color: '#3b82f6' }, { label: 'Purchased', value: '180', pct: 14, color: '#16a34a' }, { label: 'Unresolved', value: '102', pct: 8, color: '#f43f5e' },
        ]} />
      </Card>
      <Card title="Top Inquiry Topics" action={<button className="an-link" onClick={() => notify('Opening Inbox.')}>Open Inbox</button>}>
        <HBarList color="#ec4899" items={[
          { label: 'Pricing & plans', value: '372', pct: 29 }, { label: 'Course access', value: '257', pct: 20 }, { label: 'Booking availability', value: '218', pct: 17 },
          { label: 'Payment methods', value: '167', pct: 13 }, { label: 'Refunds', value: '90', pct: 7 }, { label: 'Technical help', value: '180', pct: 14 },
        ]} />
      </Card>
    </div>
  </div>;
}

/* ═════════════════════════ BOOKINGS ═════════════════════════ */
const bookingKpis: Kpi[] = [
  { key: 'booked', label: 'Total Booked Sessions', value: '173', delta: '28%', icon: CalendarDays, tone: 'blue', color: '#3b82f6', spark: [11, 10, 13, 12, 15, 14, 13, 16, 18, 17, 20, 19, 23, 26] },
  { key: 'attend', label: 'Attendance Rate', value: '91.3%', delta: '3.2%', icon: UserCheck, tone: 'green', color: '#16a34a', spark: [14, 15, 14, 16, 16, 17, 16, 18, 18, 19, 19, 20, 21, 21] },
  { key: 'cancel', label: 'Cancellation Rate', value: '6.4%', delta: '1.8%', down: true, icon: CalendarX2, tone: 'pink', color: '#ec4899', spark: [22, 23, 21, 22, 20, 21, 19, 20, 18, 17, 18, 16, 16, 15] },
  { key: 'upcoming', label: 'Upcoming Meetings', value: '24', delta: '6', icon: Clock, tone: 'violet', color: '#7c3aed', spark: [8, 9, 9, 11, 10, 12, 13, 12, 14, 15, 14, 16, 18, 19], sub: 'next 7 days' },
];
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const slots = ['9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p'];
const density = [[1, 3, 4, 5, 3, 2, 4, 5, 3, 1], [2, 4, 5, 6, 4, 3, 5, 6, 4, 2], [2, 3, 5, 5, 4, 3, 4, 6, 3, 1], [1, 4, 6, 6, 5, 3, 5, 5, 4, 2], [1, 2, 4, 4, 3, 2, 3, 3, 2, 1], [0, 1, 2, 2, 1, 1, 1, 0, 0, 0], [0, 0, 1, 1, 1, 0, 0, 0, 0, 0]];
type Session = { client: string; avatar: number; service: string; when: string; duration: string; status: 'Upcoming' | 'Completed' | 'Cancelled' | 'No-show' };
const sessions: Session[] = [
  { client: 'Sarah Ahmed', avatar: 47, service: 'Strategy Call (1-on-1)', when: 'Oct 28 · 10:00 AM', duration: '60 min', status: 'Upcoming' },
  { client: 'Omar Khaled', avatar: 13, service: 'Discovery Call', when: 'Oct 28 · 1:30 PM', duration: '30 min', status: 'Upcoming' },
  { client: 'Yara Hossam', avatar: 29, service: 'Onboarding Session', when: 'Oct 29 · 11:00 AM', duration: '45 min', status: 'Upcoming' },
  { client: 'Lina Mansour', avatar: 45, service: 'Coaching Session', when: 'Oct 26 · 4:00 PM', duration: '60 min', status: 'Completed' },
  { client: 'Ahmed Ali', avatar: 15, service: 'WhatsApp Setup Consultation', when: 'Oct 26 · 2:00 PM', duration: '45 min', status: 'Completed' },
  { client: 'Nour Hassan', avatar: 44, service: 'Strategy Call (1-on-1)', when: 'Oct 25 · 12:00 PM', duration: '60 min', status: 'Cancelled' },
  { client: 'Karim Nabil', avatar: 51, service: 'Discovery Call', when: 'Oct 25 · 10:30 AM', duration: '30 min', status: 'Completed' },
  { client: 'Hana Fawzy', avatar: 41, service: 'Coaching Session', when: 'Oct 24 · 5:00 PM', duration: '60 min', status: 'No-show' },
  { client: 'Tarek Samir', avatar: 53, service: 'Onboarding Session', when: 'Oct 24 · 9:30 AM', duration: '45 min', status: 'Completed' },
];

export function BookingsView({ notify, compare }: ViewProps) {
  const [status, setStatus] = React.useState('All');
  const rows = status === 'All' ? sessions : sessions.filter(s => s.status === status);
  return <div className="an-view">
    <KpiRow items={bookingKpis} compare={compare} />
    <div className="an-body">
      <Card title="Weekly Meeting Density" action={<div className="an-head-tools"><span className="an-heat-legend">Less{[0, 2, 4, 6].map(v => <i key={v} style={{ background: heat(v) }} />)}More</span>{rangeAction(notify, 'Meeting Density')}</div>}>
        <div className="an-heatmap" style={{ gridTemplateColumns: `30px repeat(${slots.length}, minmax(0,1fr))` }}>
          {weekDays.map((d, r) => <React.Fragment key={d}><span className="an-heat-day">{d}</span>{density[r].map((v, c) => <i key={c} className="an-heat-cell" style={{ background: heat(v) }} title={`${d} ${slots[c]} · ${v} meeting${v === 1 ? '' : 's'}`} />)}</React.Fragment>)}
          <span />{slots.map(s => <span key={s} className="an-heat-slot">{s}</span>)}
        </div>
      </Card>
      <Card title="Bookings by Service" action={rangeAction(notify, 'Bookings by Service')}>
        <HBarList color="#3b82f6" items={[
          { label: 'Strategy Call (1-on-1)', value: '48', pct: 28 }, { label: 'Discovery Call', value: '41', pct: 24 }, { label: 'Onboarding Session', value: '32', pct: 18 },
          { label: 'Coaching Session', value: '29', pct: 17 }, { label: 'Setup Consultation', value: '23', pct: 13 },
        ]} />
      </Card>
      <Card title="Sessions" className="span-2" action={<div className="an-head-tools"><FilterPills value={status} onChange={setStatus} options={[['All', sessions.length], ...(['Upcoming', 'Completed', 'Cancelled', 'No-show'] as const).map(s => [s, countBy(sessions, x => x.status, s)] as [string, number])]} /><button className="an-link" onClick={() => notify('Opening Booking & Calendar.')}>Open Calendar</button></div>}>
        <div className="an-table-wrap scroll">
          <table className="an-table">
            <colgroup><col style={{ width: '22%' }} /><col style={{ width: '28%' }} /><col style={{ width: '20%' }} /><col style={{ width: '12%' }} /><col style={{ width: '18%' }} /></colgroup>
            <thead><tr><th>Client</th><th>Service</th><th>Date &amp; Time</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>{rows.map(s => <tr key={s.client + s.when}><td><span className="an-customer"><img src={avatar(s.avatar)} alt="" />{s.client}</span></td><td>{s.service}</td><td>{s.when}</td><td>{s.duration}</td><td><StatusBadge status={s.status} /></td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>;
}
function heat(v: number) { return v === 0 ? '#f3f2f9' : `rgba(124,58,237,${(0.12 + v * 0.14).toFixed(2)})`; }

/* ═════════════════════════ PRODUCTS ═════════════════════════ */
const productKpis: Kpi[] = [
  { key: 'best', label: 'Best Selling Product', value: 'Social Media Templates', delta: '18%', icon: Trophy, tone: 'orange', color: '#f59e0b', spark: [10, 11, 13, 12, 14, 15, 14, 17, 16, 18, 20, 19, 22, 24], sub: '312 units · €14,664' },
  { key: 'units', label: 'Total Units Sold', value: '906', delta: '31%', icon: Package, tone: 'violet', color: '#7c3aed', spark: [10, 12, 11, 14, 13, 16, 15, 18, 17, 20, 19, 23, 24, 28] },
  { key: 'conv', label: 'Product Conversion Rate', value: '4.6%', delta: '0.8%', icon: Target, tone: 'green', color: '#16a34a', spark: [12, 13, 12, 14, 15, 14, 16, 15, 17, 18, 17, 19, 21, 22] },
  { key: 'refunded', label: 'Refunded Products', value: '7', delta: '3', down: true, icon: RotateCcw, tone: 'pink', color: '#ec4899', spark: [20, 21, 19, 20, 18, 19, 17, 16, 17, 15, 14, 15, 13, 12] },
];
const productRevenue: Segment[] = [
  { name: 'AI Marketing Course', value: 36828, color: '#7c3aed' }, { name: 'WhatsApp Setup', value: 17892, color: '#22c55e' },
  { name: 'Funnel Setup', value: 17892, color: '#3b82f6' }, { name: 'Templates Pack', value: 14664, color: '#ec4899' },
  { name: 'Agency Starter Kit', value: 14070, color: '#f59e0b' }, { name: 'Growth Bundle', value: 10638, color: '#14b8a6' }, { name: 'Other', value: 7150, color: '#cbd5e1' },
];
const productLines = [
  { name: 'Templates Pack', color: '#7c3aed', data: series(DAYS, 6, 0.25, 2.4, 1) },
  { name: 'Agency Starter Kit', color: '#ec4899', data: series(DAYS, 4, 0.18, 2, 3) },
  { name: 'AI Marketing Course', color: '#3b82f6', data: series(DAYS, 2.5, 0.12, 1.4, 5) },
  { name: 'GOS Pro', color: '#14b8a6', data: series(DAYS, 1.5, 0.08, 1.1, 7) },
];
const productRows = [
  { name: 'Social Media Templates Pack', img: socialPackImg, type: 'Digital Product', price: '€47', units: 312, revenue: '€14,664', conv: '6.8%', refunds: 2, spark: [8, 9, 11, 10, 12, 14, 13, 15, 17, 16, 19] },
  { name: 'Agency Starter Kit', img: agencyKitImg, type: 'Digital Product', price: '€67', units: 210, revenue: '€14,070', conv: '5.9%', refunds: 1, spark: [8, 9, 11, 10, 12, 11, 13, 12, 15, 14, 17] },
  { name: 'Complete AI Marketing Course', img: aiCourseImg, type: 'Online Course', price: '€297', units: 124, revenue: '€36,828', conv: '4.2%', refunds: 2, spark: [8, 10, 9, 12, 11, 14, 12, 15, 18, 16, 20] },
  { name: 'GOS Pro Membership', img: gosProImg, type: 'Subscription', price: '€29/mo', units: 86, revenue: '€2,494', conv: '3.8%', refunds: 0, spark: [7, 8, 8, 9, 10, 10, 11, 12, 12, 13, 14] },
  { name: 'Business Growth Bundle', img: growthBundleImg, type: 'Bundle', price: '€197', units: 54, revenue: '€10,638', conv: '3.1%', refunds: 1, spark: [9, 8, 10, 11, 10, 12, 13, 12, 14, 15, 17] },
  { name: '1-on-1 Strategy Call', img: strategyCallImg, type: 'Service', price: '€97', units: 48, revenue: '€4,656', conv: '5.2%', refunds: 0, spark: [9, 10, 9, 11, 10, 12, 11, 13, 12, 14, 16] },
  { name: 'WhatsApp Automation Setup', img: whatsappSetupImg, type: 'Service', price: '€497', units: 36, revenue: '€17,892', conv: '2.7%', refunds: 1, spark: [7, 9, 8, 10, 12, 11, 13, 12, 14, 16, 18] },
  { name: 'Done-For-You Funnel Setup', img: funnelSetupImg, type: 'Service', price: '€497', units: 36, revenue: '€17,892', conv: '2.4%', refunds: 0, spark: [8, 8, 9, 9, 10, 9, 11, 10, 12, 11, 12] },
];

export function ProductsView({ notify, compare }: ViewProps) {
  return <div className="an-view">
    <KpiRow items={productKpis} compare={compare} />
    <div className="an-body">
      <Card title="Product Sales Comparison" action={rangeAction(notify, 'Product Sales Comparison')}>
        <div className="an-summary"><b>906</b><Delta value="31%" /><span>units sold</span><Legend items={productLines.map(p => [p.name, p.color] as [string, string])} /></div>
        <ChartFrame yLabels={['20', '15', '10', '5', '0']}>
          {productLines.map(p => { const pts = toPoints(p.data, 20); return <g key={p.name} className="an-series"><title>{p.name}</title>
            <path d={smoothPath(pts)} fill="none" stroke={p.color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            <path d={dotsPath(pts.filter((_, i) => i % 3 === 0))} stroke={p.color} strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>; })}
        </ChartFrame>
      </Card>
      <Card title="Product Revenue Share" action={rangeAction(notify, 'Product Revenue Share')}>
        <div className="an-split"><Donut segments={productRevenue} center={<><b>€119K</b><small>Lifetime revenue</small></>} /><DonutLegend segments={productRevenue} format={v => `€${(v / 1000).toFixed(1)}K`} /></div>
      </Card>
      <Card title="Product Performance" className="span-2" action={<button className="an-link" onClick={() => notify('Opening Products & Payments.')}>Manage Products</button>}>
        <div className="an-table-wrap scroll">
          <table className="an-table">
            <colgroup><col style={{ width: '27%' }} /><col style={{ width: '13%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '11%' }} /><col style={{ width: '10%' }} /><col style={{ width: '8%' }} /><col style={{ width: '13%' }} /></colgroup>
            <thead><tr><th>Product</th><th>Type</th><th>Price</th><th>Units</th><th>Revenue</th><th>Conversion</th><th>Refunds</th><th>Trend</th></tr></thead>
            <tbody>{productRows.map(p => <tr key={p.name}>
              <td><span className="an-product-cell"><img src={p.img} alt="" />{p.name}</span></td>
              <td><span className={`an-type ${p.type.toLowerCase().replace(/\s+/g, '-')}`}>{p.type}</span></td>
              <td>{p.price}</td><td><b>{p.units}</b></td><td>{p.revenue}</td><td>{p.conv}</td><td>{p.refunds}</td>
              <td><Sparkline data={p.spark} color="#7c3aed" fill={false} className="an-table-spark" /></td>
            </tr>)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>;
}

/* ═════════════════════════ REPORTS ═════════════════════════ */
type Report = { id: string; title: string; desc: string; icon: React.ElementType; tone: string; freq: string; last: string; sections: string[] };
const reports: Report[] = [
  { id: 'executive-summary', title: 'Monthly Executive Summary', desc: 'High-level KPIs across revenue, leads, bookings and growth for leadership.', icon: Sparkles, tone: 'violet', freq: 'Monthly', last: 'Oct 1, 2024', sections: ['Revenue & sales', 'Lead acquisition', 'Bookings', 'Customer growth'] },
  { id: 'tax-revenue', title: 'Tax & Revenue Report', desc: 'Gross, net, VAT collected and refunds by country for your accountant.', icon: Landmark, tone: 'green', freq: 'Monthly', last: 'Oct 1, 2024', sections: ['Gross vs net revenue', 'VAT by country', 'Refunds', 'Payouts'] },
  { id: 'lead-attribution', title: 'Lead Attribution Analysis', desc: 'First- and last-touch attribution of leads and revenue by channel.', icon: Megaphone, tone: 'pink', freq: 'Weekly', last: 'Oct 21, 2024', sections: ['Channel attribution', 'Cost per lead', 'Lead quality', 'Revenue by source'] },
  { id: 'funnel-conversion', title: 'Funnel Conversion Report', desc: 'Step-by-step drop-off from first visit to purchase for every funnel.', icon: Filter, tone: 'blue', freq: 'Weekly', last: 'Oct 21, 2024', sections: ['Funnel steps', 'Drop-off points', 'Conversion by page', 'A/B results'] },
  { id: 'booking-performance', title: 'Booking Performance', desc: 'Attendance, cancellations and utilisation by service and weekday.', icon: CalendarClock, tone: 'teal', freq: 'Weekly', last: 'Oct 21, 2024', sections: ['Sessions booked', 'Attendance', 'Cancellations', 'Busiest hours'] },
  { id: 'product-sales', title: 'Product Sales Report', desc: 'Units, revenue, refunds and conversion rate for every product.', icon: Package, tone: 'orange', freq: 'Monthly', last: 'Oct 1, 2024', sections: ['Units sold', 'Revenue share', 'Refunds', 'Conversion'] },
  { id: 'conversation-quality', title: 'Conversation Quality', desc: 'Response times, AI auto-reply rate and resolution across all channels.', icon: MessageSquareText, tone: 'violet', freq: 'Weekly', last: 'Oct 21, 2024', sections: ['Volume by channel', 'Response time', 'AI vs human', 'Outcomes'] },
  { id: 'retention-ltv', title: 'Customer Retention & LTV', desc: 'Cohort retention, churn and lifetime value of your customers.', icon: HeartHandshake, tone: 'pink', freq: 'Monthly', last: 'Oct 1, 2024', sections: ['Cohorts', 'Churn', 'Lifetime value', 'Repeat purchases'] },
  { id: 'traffic-acquisition', title: 'Traffic & Acquisition', desc: 'Visitors, sources, landing pages and devices over time.', icon: Gauge, tone: 'blue', freq: 'Weekly', last: 'Oct 21, 2024', sections: ['Visitors', 'Sources', 'Landing pages', 'Devices'] },
];
const summaryRows: Array<Array<string | number>> = [
  ['Metric', 'Value', 'Change vs previous period'],
  ['Total leads', 892, '+35%'], ['Sales revenue', '€12,430', '+52%'], ['Bookings', 173, '+28%'], ['New customers', 186, '+24%'],
  ['Conversion rate', '5.8%', '+18%'], ['Unique visitors', '18,432', '+41%'], ['Total inquiries', '1,284', '+22%'], ['Units sold', 906, '+31%'],
];
const METRICS = ['Revenue', 'Leads', 'Traffic', 'Conversations', 'Bookings', 'Products'];
const METRIC_ROWS: Record<string, string[]> = { Revenue: ['Sales revenue'], Leads: ['Total leads', 'Conversion rate'], Traffic: ['Unique visitors'], Conversations: ['Total inquiries'], Bookings: ['Bookings'], Products: ['Units sold', 'New customers'] };
const rowsForMetrics = (metrics: string[]) => [summaryRows[0], ...summaryRows.slice(1).filter(r => metrics.some(m => METRIC_ROWS[m]?.includes(String(r[0]))))];
type ExportItem = { id: string; name: string; format: 'PDF' | 'CSV'; when: string; size: string };

function CustomReportModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (r: { name: string; format: 'PDF' | 'CSV'; metrics: string[]; range: string }) => void }) {
  const [name, setName] = React.useState('October performance review');
  const [metrics, setMetrics] = React.useState<string[]>(['Revenue', 'Leads', 'Bookings']);
  const [format, setFormat] = React.useState<'PDF' | 'CSV'>('PDF');
  const [range, setRange] = React.useState('Last 30 days');
  const valid = name.trim().length > 0 && metrics.length > 0;
  return <Modal title="Generate custom report" subtitle="Pick the metrics, period and format for your report." icon={<Sparkles size={18} />} onClose={onClose}
    footer={<><button className="an-btn" onClick={onClose}>Cancel</button><button className="an-btn primary" disabled={!valid} onClick={() => onGenerate({ name: name.trim(), format, metrics, range })}><Download size={14} />Generate report</button></>}>
    <label className="an-field">Report name<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q4 board summary" /></label>
    <div className="an-field">Metrics<div className="an-checks">{METRICS.map(m => <label key={m} className={metrics.includes(m) ? 'on' : ''}><input type="checkbox" checked={metrics.includes(m)} onChange={e => setMetrics(cur => e.target.checked ? [...cur, m] : cur.filter(x => x !== m))} />{m}</label>)}</div></div>
    <div className="an-field-row">
      <div className="an-field">Period<RangeSelect value={range} onChange={setRange} withIcon /></div>
      <div className="an-field">Format<div className="an-seg">{(['PDF', 'CSV'] as const).map(fm => <button key={fm} className={format === fm ? 'active' : ''} onClick={() => setFormat(fm)}>{fm === 'PDF' ? <FileText size={13} /> : <FileSpreadsheet size={13} />}{fm}</button>)}</div></div>
    </div>
  </Modal>;
}

function ReportPreviewModal({ report, onClose, onDownload }: { report: Report; onClose: () => void; onDownload: (format: 'PDF' | 'CSV') => void }) {
  return <Modal title={report.title} subtitle={`${report.freq} report · Last generated ${report.last}`} icon={<report.icon size={18} />} onClose={onClose}
    footer={<><button className="an-btn" onClick={() => onDownload('CSV')}><FileSpreadsheet size={14} />Download CSV</button><button className="an-btn primary" onClick={() => onDownload('PDF')}><FileDown size={14} />Download PDF</button></>}>
    <p className="an-modal-desc">{report.desc}</p>
    <div className="an-preview-kpis">{summaryRows.slice(1, 5).map(([label, value, change]) => <div key={String(label)}><small>{label}</small><b>{value}</b><Delta value={String(change).replace('+', '')} /></div>)}</div>
    <div className="an-field">Included sections<ul className="an-sections">{report.sections.map(s => <li key={s}><CircleCheck size={13} />{s}</li>)}</ul></div>
  </Modal>;
}

export function ReportsView({ notify }: ViewProps) {
  const [customOpen, setCustomOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<Report | null>(null);
  const [exportsList, setExportsList] = React.useState<ExportItem[]>([
    { id: 'e1', name: 'Monthly Executive Summary', format: 'PDF', when: 'Oct 1, 2024', size: '1.4 MB' },
    { id: 'e2', name: 'Tax & Revenue Report', format: 'CSV', when: 'Oct 1, 2024', size: '86 KB' },
    { id: 'e3', name: 'Lead Attribution Analysis', format: 'PDF', when: 'Sep 30, 2024', size: '920 KB' },
  ]);
  const record = (name: string, format: 'PDF' | 'CSV') => setExportsList(list => [{ id: `e${Date.now()}`, name, format, when: 'Just now', size: format === 'PDF' ? '1.1 MB' : '24 KB' }, ...list].slice(0, 8));
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const download = (name: string, format: 'PDF' | 'CSV', rows = summaryRows) => {
    if (format === 'CSV') { downloadCsv(`${slug(name)}.csv`, [[name], [], ...rows]); notify(`${name} downloaded as CSV.`); }
    else notify(`${name} PDF is being prepared — it will appear in Recent exports.`);
    record(name, format);
  };
  const closeCustom = React.useCallback(() => setCustomOpen(false), []);
  const closePreview = React.useCallback(() => setPreview(null), []);

  return <div className="an-view">
    <section className="an-reports-bar">
      <div><h2>Automated reports</h2><p>{reports.length} reports ready · delivered to your inbox on schedule</p></div>
      <div className="an-reports-actions">
        <button className="an-btn" onClick={() => download('Analytics overview', 'PDF')}><FileText size={14} />Export PDF</button>
        <button className="an-btn" onClick={() => download('Analytics overview', 'CSV')}><FileSpreadsheet size={14} />Export CSV</button>
        <button className="an-btn primary" onClick={() => setCustomOpen(true)}><Plus size={14} />Generate Custom Report</button>
      </div>
    </section>
    <div className="an-reports-layout">
      <div className="an-report-grid">
        {reports.map(r => <article key={r.id} className={`an-report ${r.tone}`}>
          <div className="an-report-top"><span className="an-report-icon"><r.icon size={18} /></span><span className="an-chip">{r.freq}</span></div>
          <h3>{r.title}</h3>
          <p>{r.desc}</p>
          <div className="an-report-foot">
            <small>Last: {r.last}</small>
            <div><button className="an-icon-btn" aria-label={`Preview ${r.title}`} title="Preview" onClick={() => setPreview(r)}><Eye size={14} /></button><button className="an-icon-btn primary" aria-label={`Download ${r.title}`} title="Download CSV" onClick={() => download(r.title, 'CSV')}><Download size={14} /></button></div>
          </div>
        </article>)}
      </div>
      <Card title="Recent Exports" className="an-exports">
        <ul className="an-export-list">
          {exportsList.map(x => <li key={x.id}>
            <span className={`an-file ${x.format.toLowerCase()}`}>{x.format === 'PDF' ? <FileText size={15} /> : <FileSpreadsheet size={15} />}</span>
            <span className="an-export-copy"><b>{x.name}</b><small>{x.format} · {x.size} · {x.when}</small></span>
            <button className="an-icon-btn" aria-label={`Download ${x.name}`} onClick={() => download(x.name, x.format)}><Download size={13} /></button>
          </li>)}
        </ul>
        <div className="an-schedule"><CalendarClock size={15} /><span><b>Next delivery</b><small>Executive Summary · Nov 1, 9:00 AM</small></span></div>
      </Card>
    </div>
    {customOpen && <CustomReportModal onClose={closeCustom} onGenerate={r => { setCustomOpen(false); download(r.name, r.format, rowsForMetrics(r.metrics)); }} />}
    {preview && <ReportPreviewModal report={preview} onClose={closePreview} onDownload={fm => { download(preview.title, fm); setPreview(null); }} />}
  </div>;
}
