import React from 'react';
import { ArrowDownToLine, CalendarDays, Check, CircleX, Clock3, CreditCard, Search, Settings2, Users, Zap } from 'lucide-react';
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

const eventData: ActivityEvent[] = [
  { id: 1, type: 'Booking', actor: 'Sarah Chen', description: 'booked a Brand Strategy Session', status: 'Completed', minutesAgo: 12 },
  { id: 2, type: 'Lead', actor: 'Marcus Johnson', description: 'was added from Instagram', status: 'Completed', minutesAgo: 48 },
  { id: 3, type: 'Payment', actor: 'Olivia Reed', description: 'paid $349 for Brand Foundations', status: 'Completed', minutesAgo: 126 },
  { id: 4, type: 'Automation', actor: 'AI Follow-Up', description: 'sent a follow-up to Daniel Brooks', status: 'Completed', minutesAgo: 205 },
  { id: 5, type: 'Booking', actor: 'Lina Mansour', description: 'requested a Product Demo appointment', status: 'Pending', minutesAgo: 365 },
  { id: 6, type: 'System', actor: 'Alex Morgan', description: 'updated workspace availability settings', status: 'Completed', minutesAgo: 780 },
  { id: 7, type: 'Lead', actor: 'Nour Hassan', description: 'moved to Qualified in the sales pipeline', status: 'Completed', minutesAgo: 1650 },
  { id: 8, type: 'Payment', actor: 'Payment provider', description: 'could not confirm invoice #INV-2048', status: 'Failed', minutesAgo: 2890 },
  { id: 9, type: 'Automation', actor: 'AI Follow-Up', description: 'scheduled a check-in for Monday morning', status: 'Pending', minutesAgo: 4280 },
  { id: 10, type: 'Booking', actor: 'Mohamed Joe', description: 'published the Free Consultation booking link', status: 'Completed', minutesAgo: 7200 },
  { id: 11, type: 'Lead', actor: 'Workspace system', description: 'captured a new lead from the website form', status: 'Completed', minutesAgo: 10800 },
  { id: 12, type: 'System', actor: 'Alex Morgan', description: 'connected Google Calendar', status: 'Completed', minutesAgo: 19000 },
];

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
  }), [datePreset, query, type]);

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
      <div><span className="activity-eyebrow">WORKSPACE HISTORY</span><h1>Activity Log</h1><p>Track all system events, user actions, and automated workflows in real-time.</p></div>
      <button className="activity-export" onClick={exportCsv}><ArrowDownToLine size={15}/> Export CSV</button>
    </header>

    <section className="activity-toolbar" aria-label="Activity filters">
      <label className="activity-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search activities..." aria-label="Search activities"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search">×</button>}</label>
      <label className="activity-type-filter"><span>Event type</span><select value={type} onChange={event => setType(event.target.value as EventType | 'All Events')} aria-label="Filter by event type">{[{ label: 'All Events', value: 'All Events' }, { label: 'Leads', value: 'Lead' }, { label: 'Payments', value: 'Payment' }, { label: 'Bookings', value: 'Booking' }, { label: 'Automation', value: 'Automation' }, { label: 'System', value: 'System' }].map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
      <div className="activity-date-filter" role="group" aria-label="Filter by date range">{(['Today', 'Last 7 Days', 'Last 30 Days'] as const).map(preset => <button key={preset} className={datePreset === preset ? 'active' : ''} onClick={() => setDatePreset(preset)} aria-pressed={datePreset === preset}>{preset}</button>)}</div>
      <span className="activity-results-count">{filteredEvents.length} events</span>
    </section>

    <section className="activity-feed-card" aria-label="Activity events">
      <div className="activity-feed-heading"><div><h2>Recent activity</h2><p>Events from across your workspace</p></div><span className="activity-live-indicator"><i/> Live updates</span></div>
      {filteredEvents.length ? <div className="activity-table-scroll"><table className="activity-table"><thead><tr><th>Event</th><th>Activity</th><th>Time</th><th>Status</th></tr></thead><tbody>{filteredEvents.map(event => {
        const Icon = eventIcon[event.type];
        const date = dateFromMinutes(event.minutesAgo);
        return <tr key={event.id}>
          <td><span className={`activity-event-badge ${event.type.toLowerCase()}`}><Icon size={15}/>{event.type}</span></td>
          <td><div className="activity-description"><b>{event.actor}</b><span>{event.description}</span></div></td>
          <td><time title={date.toLocaleString()} dateTime={date.toISOString()}><Clock3 size={13}/>{relativeTime(event.minutesAgo)}</time></td>
          <td><span className={`activity-status ${event.status.toLowerCase()}`}>{event.status === 'Completed' ? <Check size={12}/> : event.status === 'Pending' ? <Clock3 size={12}/> : <CircleX size={12}/>} {event.status}</span></td>
        </tr>;
      })}</tbody></table></div> : <div className="activity-empty"><span><Search size={18}/></span><b>No matching activity</b><p>Try another search or adjust the selected filters.</p><button onClick={() => { setQuery(''); setType('All Events'); setDatePreset('Last 30 Days'); }}>Clear filters</button></div>}
      <footer className="activity-feed-footer"><span>Showing {filteredEvents.length} of {eventData.length} events</span><span>Times shown in your local timezone</span></footer>
    </section>
  </div>;
};
