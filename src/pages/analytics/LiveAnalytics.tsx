import { useState } from 'react';
import { BarChart3, CalendarDays, CircleDollarSign, Download, MessageSquare, Package, Users } from 'lucide-react';
import { eventLabel, parseTimestampMs, resourceLabel, toIsoDateString, useBusinessMetrics } from '../../backend/metrics';
import { Card, KpiRow, ChartFrame, type Kpi, smoothPath, toPoints, VH } from './kit';
import { Select } from '../../components/ui/Select';
import { showToast } from '../../utils/toast';
import { translateText } from '../../i18n/display';

export function LiveAnalytics({ tab }: { tab: string }) {
  const [days, setDays] = useState('30');
  const data = useBusinessMetrics(Number(days));
  const [search, setSearch] = useState('');
  const points = data.daily.map(day => tab === 'Sales' || tab === 'Products' ? day.revenue : day.events);
  const metric = (key: string, label: string, value: string, icon: Kpi['icon'], tone: string, color: string): Kpi => ({ key, label, value, icon, tone, color, spark: points, delta: '—' });
  const kpis = [metric('leads', 'Total Leads', String(data.leads.length), Users, 'violet', '#7c3aed'), metric('revenue', 'Verified Revenue', data.money(data.revenue), CircleDollarSign, 'green', '#16a34a'), metric('conversations', 'Conversations', String(data.conversations.length), MessageSquare, 'pink', '#ec4899'), metric('bookings', 'Bookings', String(data.bookings.length), CalendarDays, 'blue', '#3b82f6')];
  const events = data.events.filter(event => {
    const relevant = tab === 'Overview' || tab === 'Reports' || (tab === 'Sales' ? /payment|order|purchase/.test(event.type) : tab === 'Leads' ? /lead|crm/.test(event.type + event.resource) : tab === 'Conversations' ? /message|conversation/.test(event.type + event.resource) : tab === 'Bookings' ? /booking|calendar/.test(event.type + event.resource) : tab === 'Products' ? /product/.test(event.type + event.resource) : /page|visit|traffic/.test(event.type));
    return relevant && `${event.type} ${event.resource ?? ''}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
  const exportEvents = () => {
    const cell = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    const csv = [['Event', 'Resource', 'Timestamp'], ...events.map(event => [event.type, event.resource ?? event.resourceId, toIsoDateString(event.createdAt)])].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `gos-${tab.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
    showToast.success('Report exported');
  };
  const maximum = Math.max(1, ...points);
  return <div className="an-view">
    <div className="flex shrink-0 items-center justify-between gap-3"><Select value={days} onChange={value => { setDays(value); showToast.info('Date range updated'); }} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]}/><button className="an-link" onClick={exportEvents}><Download size={14}/>{translateText('Export report')}</button></div>
    <KpiRow items={kpis} compare={`Last ${days} days · current records`} />
    <div className="an-body">
      <Card title={translateText(tab === 'Sales' || tab === 'Products' ? 'Verified Revenue' : 'Operational Events')}>
        <ChartFrame yLabels={[String(maximum), String(maximum / 2), '0']} x={data.daily.filter((_, i) => i % Math.ceil(Number(days)/6) === 0).map(day => [data.daily.indexOf(day) / Math.max(1, data.daily.length - 1), day.label])}>
          <path d={smoothPath(toPoints(points, maximum))} stroke="#7c3aed" fill="none" strokeWidth="3"/>
        </ChartFrame>
        <p className="text-xs text-slate-500">{translateText('Only recorded events and verified transactions are included.')} {data.currencies.length > 1 ? `Revenue shown in ${data.currency}; other currencies excluded.` : ''}</p>
      </Card>
      <Card title={translateText('Workspace Records')}>
        <div className="flex h-full flex-col justify-around gap-3 p-3">
          {[[Users, 'Leads', data.leads.length], [MessageSquare, 'Conversations', data.conversations.length], [CalendarDays, 'Calendars', data.calendars.length], [Package, 'Products', data.products.length]].map(([Icon, label, count]) => { const ItemIcon = Icon as typeof Users; return <div key={String(label)} className="flex items-center gap-3"><ItemIcon size={18}/><span className="flex-1">{translateText(String(label))}</span><b>{String(count)}</b></div>; })}
        </div>
      </Card>
      <Card title={translateText('Activity Stream')} className="an-span2">
        <input className="mb-3 rounded-lg border bg-transparent px-3 py-2 text-sm" aria-label="Search events" placeholder={translateText('Search events')} value={search} onChange={event => setSearch(event.target.value)}/>
        {events.length ? <div className="an-table-wrap"><table className="an-table"><thead><tr><th>{translateText('Event')}</th><th>{translateText('Resource')}</th><th>{translateText('Date')}</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td>{eventLabel(event.type)}</td><td>{resourceLabel(event.resource)}</td><td>{new Date(parseTimestampMs(event.createdAt) || Date.now()).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-sm text-slate-500"><BarChart3 size={24}/><p>{translateText('No events recorded for this period.')}</p></div>}
      </Card>
    </div>
  </div>;
}
