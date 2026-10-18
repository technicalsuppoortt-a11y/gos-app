import { eventLabel, resourceLabel, useBusinessMetrics } from '../backend/metrics';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import React from 'react';
import { ArrowDownToLine, CalendarDays, Check, CircleX, Clock3, CreditCard, Search, Settings2, Users, Zap } from 'lucide-react';
import { Select } from '../components/ui/Select';
import './activity-page.css';

type EventType = 'Booking' | 'Lead' | 'Payment' | 'Automation' | 'System';
type EventStatus = 'Completed' | 'Pending' | 'Failed';
type DatePreset = 'Today' | 'Last 7 Days' | 'Last 30 Days';

interface ActivityEvent {
  id: number;
  type: EventType;
  actor: string;
  description: string;
  status: EventStatus;
  minutesAgo: number;
}

const eventData: ActivityEvent[] = [];

const eventIcon: Record<EventType, React.ElementType> = {
  Booking: CalendarDays,
  Lead: Users,
  Payment: CreditCard,
  Automation: Zap,
  System: Settings2,
};

const dateFromMinutes = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);

function relativeTime(minutesAgo: number) {
  if (minutesAgo < 60) return `${minutesAgo} min${minutesAgo === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function quoteCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export const ActivityPage: React.FC = () => {
  const metrics = useBusinessMetrics(30);
  const eventData: ActivityEvent[] = metrics.events.map((event,index) => ({ id:index, type: /booking/.test(event.type) ? 'Booking' : /lead/.test(event.type) ? 'Lead' : /payment/.test(event.type) ? 'Payment' : /workflow/.test(event.type) ? 'Automation' : 'System', actor: event.actorId || 'Workspace', description:eventLabel(event.type) + ' · ' + resourceLabel(event.resource), status:'Completed', minutesAgo: Math.max(0,(Date.now()-Date.parse(event.createdAt))/60000) }));
  useUILanguage();
  const [query, setQuery] = React.useState('');
  const [type, setType] = React.useState<EventType | 'All Events'>('All Events');
  const [datePreset, setDatePreset] = React.useState<DatePreset>('Last 7 Days');

  const filteredEvents = React.useMemo(() => eventData.filter(event => {
    const matchesType = type === 'All Events' || event.type === type;
    const haystack = `${event.actor} ${event.description} ${event.type} ${event.status}`.toLowerCase();
    const matchesSearch = haystack.includes(query.trim().toLowerCase());
    const daysOld = event.minutesAgo / (60 * 24);
    const matchesDate = datePreset === 'Today' ? daysOld < 1 : datePreset === 'Last 7 Days' ? daysOld < 7 : daysOld < 30;
    return matchesType && matchesSearch && matchesDate;
  }), [datePreset, query, type, JSON.stringify(eventData)]);

  const exportCsv = () => {
    const header = ['Timestamp', 'Event Type', 'Actor', 'Description', 'Status'];
    const rows = filteredEvents.map(event => [
      dateFromMinutes(event.minutesAgo).toISOString(), event.type, event.actor, event.description, event.status,
    ]);
    const csv = [header, ...rows].map(row => row.map(value => quoteCsv(String(value))).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gos-activity-log.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="activity-page">
    <header className="activity-page-header">
      <div><span className="activity-eyebrow">{translateText("WORKSPACE HISTORY")}</span><h1>{translateText("Activity Log")}</h1><p>{translateText("Track all system events, user actions, and automated workflows in real-time.")}</p></div>
      <button className="activity-export" onClick={exportCsv}><ArrowDownToLine size={15}/>{translateText(" Export CSV")}</button>
    </header>

    <section className="activity-toolbar" aria-label={translateText("Activity filters")}>
      <label className="activity-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={translateText("Search activities...")} aria-label={translateText("Search activities")}/>{localizeNode(query && <button onClick={() => setQuery('')} aria-label={translateText("Clear search")}>×</button>)}</label>
      <label className="activity-type-filter flex items-center gap-1.5"><span>{translateText("Event type")}</span><Select value={type} onChange={value => setType(value as EventType | 'All Events')} options={[{ label: 'All Events', value: 'All Events' }, { label: 'Leads', value: 'Lead' }, { label: 'Payments', value: 'Payment' }, { label: 'Bookings', value: 'Booking' }, { label: 'Automation', value: 'Automation' }, { label: 'System', value: 'System' }]} /></label>
      <div className="activity-date-filter" role="group" aria-label={translateText("Filter by date range")}>{localizeNode((['Today', 'Last 7 Days', 'Last 30 Days'] as const).map(preset => <button key={preset} className={datePreset === preset ? 'active' : ''} onClick={() => setDatePreset(preset)} aria-pressed={datePreset === preset}>{localizeNode(preset)}</button>))}</div>
      <span className="activity-results-count">{localizeNode(filteredEvents.length)}{translateText(" events")}</span>
    </section>

    <section className="activity-feed-card" aria-label={translateText("Activity events")}>
      <div className="activity-feed-heading"><div><h2>{translateText("Recent activity")}</h2><p>{translateText("Events from across your workspace")}</p></div><span className="activity-live-indicator"><i/>{translateText(" Live updates")}</span></div>
      {localizeNode(filteredEvents.length ? <div className="activity-table-scroll"><table className="activity-table"><thead><tr><th className="text-start">{translateText("Event")}</th><th className="text-start">{translateText("Activity")}</th><th className="text-center">{translateText("Time")}</th><th className="text-center">{translateText("Status")}</th></tr></thead><tbody>{localizeNode(filteredEvents.map(event => {
        const Icon = eventIcon[event.type];
        const date = dateFromMinutes(event.minutesAgo);
        return <tr key={event.id}>
          <td className="text-start"><span className={`activity-event-badge ${event.type.toLowerCase()}`}><Icon size={15}/>{localizeNode(event.type)}</span></td>
          <td className="text-start"><div className="activity-description"><b>{localizeNode(event.actor)}</b><span>{localizeNode(event.description)}</span></div></td>
          <td className="text-center"><time className="justify-center inline-flex" title={translateText(date.toLocaleString())} dateTime={date.toISOString()}><Clock3 size={13}/>{localizeNode(relativeTime(event.minutesAgo))}</time></td>
          <td className="text-center"><span className={`activity-status mx-auto ${event.status.toLowerCase()}`}>{localizeNode(event.status === 'Completed' ? <Check size={12}/> : event.status === 'Pending' ? <Clock3 size={12}/> : <CircleX size={12}/>)} {localizeNode(event.status)}</span></td>
        </tr>;
      }))}</tbody></table></div> : <div className="activity-empty"><span><Search size={18}/></span><b>{translateText("No matching activity")}</b><p>{translateText("Try another search or adjust the selected filters.")}</p><button onClick={() => { setQuery(''); setType('All Events'); setDatePreset('Last 30 Days'); }}>{translateText("Clear filters")}</button></div>)}
      <footer className="activity-feed-footer"><span>{translateText("Showing ")}{localizeNode(filteredEvents.length)}{translateText(" of ")}{localizeNode(eventData.length)}{translateText(" events")}</span><span>{translateText("Times shown in your local timezone")}</span></footer>
    </section>
  </div>;
};
