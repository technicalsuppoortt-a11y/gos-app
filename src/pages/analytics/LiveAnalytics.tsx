import { useState, useRef, useEffect } from 'react';
import { BarChart3, Calendar, CalendarDays, Check, ChevronDown, CircleDollarSign, Download, Filter, Globe, Mail, MessageSquare, Package, Users, X } from 'lucide-react';
import { eventLabel, parseTimestampMs, resourceLabel, toIsoDateString, useBusinessMetrics } from '../../backend/metrics';
import { Card, KpiRow, ChartFrame, type Kpi, smoothPath, toPoints, ChannelIcon } from './kit';
import { showToast } from '../../utils/toast';
import { translateText, useUILanguage } from '../../i18n/display';

const DATE_PRESETS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom date range' },
] as const;

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'All Channels', kind: '' },
  { value: 'whatsapp', label: 'WhatsApp', kind: 'whatsapp' },
  { value: 'instagram', label: 'Instagram', kind: 'instagram' },
  { value: 'facebook', label: 'Facebook', kind: 'facebook' },
  { value: 'messenger', label: 'Messenger', kind: 'messenger' },
  { value: 'webchat', label: 'Website Chat', kind: 'website' },
  { value: 'email', label: 'Email', kind: 'email' },
] as const;

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function LiveAnalytics({ tab }: { tab: string }) {
  useUILanguage();
  const [days, setDays] = useState('30');
  const initialDates = defaultDateRange();
  const [customStart, setCustomStart] = useState(initialDates.start);
  const [customEnd, setCustomEnd] = useState(initialDates.end);
  const [draftStart, setDraftStart] = useState(initialDates.start);
  const [draftEnd, setDraftEnd] = useState(initialDates.end);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  const [channel, setChannel] = useState('all');
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const channelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
        setDateMenuOpen(false);
      }
      if (channelMenuRef.current && !channelMenuRef.current.contains(e.target as Node)) {
        setChannelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCustom = days === 'custom';
  const isConversationsTab = tab === 'Conversations';
  const activeChannel = isConversationsTab ? channel : 'all';

  const data = useBusinessMetrics({
    days: isCustom ? undefined : Number(days),
    startDate: isCustom ? customStart : undefined,
    endDate: isCustom ? customEnd : undefined,
    channel: activeChannel,
  });

  const [search, setSearch] = useState('');
  const rawPoints = data.daily.map(day => tab === 'Sales' || tab === 'Products' ? day.revenue : day.events);
  const points = rawPoints.length >= 2 ? rawPoints : rawPoints.length === 1 ? [rawPoints[0], rawPoints[0]] : [0, 0];
  const metric = (key: string, label: string, value: string, icon: Kpi['icon'], tone: string, color: string): Kpi => ({ key, label, value, icon, tone, color, spark: points, delta: '—' });
  const kpis = [
    metric('leads', 'Total Leads', String(data.leads.length), Users, 'violet', '#7C3AED'),
    metric('revenue', 'Verified Revenue', data.money(data.revenue), CircleDollarSign, 'green', '#16a34a'),
    metric('conversations', 'Conversations', String(data.conversations.length), MessageSquare, 'pink', '#ec4899'),
    metric('bookings', 'Bookings', String(data.bookings.length), CalendarDays, 'blue', '#3b82f6'),
  ];
  const events = data.events.filter(event => {
    const relevant = tab === 'Overview' || tab === 'Reports' || (tab === 'Sales' ? /payment|order|purchase/.test(event.type) : tab === 'Leads' ? /lead|crm/.test(event.type + event.resource) : tab === 'Conversations' ? /message|conversation/.test(event.type + event.resource) : tab === 'Bookings' ? /booking|calendar/.test(event.type + event.resource) : tab === 'Products' ? /product/.test(event.type + event.resource) : /page|visit|traffic/.test(event.type));
    return relevant && `${event.type} ${event.resource ?? ''}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));

  const exportEvents = () => {
    const cell = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    const csv = [['Event', 'Resource', 'Timestamp'], ...events.map(event => [event.type, event.resource ?? event.resourceId, toIsoDateString(event.createdAt)])].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `upclick-${tab.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
    showToast.success('Report exported');
  };

  const formatShortDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const periodLabel = isCustom
    ? `${formatShortDate(customStart)} – ${formatShortDate(customEnd)}`
    : translateText(DATE_PRESETS.find(p => p.value === days)?.label ?? `Last ${days} days`);

  const compareText = isCustom
    ? `${formatShortDate(customStart)} – ${formatShortDate(customEnd)} · ${translateText('current records')}`
    : `${translateText(`Last ${days} days`)} · ${translateText('current records')}`;

  const selectedChannelOption = CHANNEL_OPTIONS.find(c => c.value === channel) ?? CHANNEL_OPTIONS[0];
  const maximum = Math.max(1, ...points);
  const step = Math.max(1, Math.ceil(data.totalDays / 6));

  return <div className="an-view">
    <div className="flex flex-wrap shrink-0 items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-3.5 py-2.5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Quick Date Preset Pills */}
        <div className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/80 p-1 gap-0.5">
          {(['7', '30', '90'] as const).map(preset => {
            const active = days === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setDays(preset);
                  setDateMenuOpen(false);
                  showToast.info('Date range updated');
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-[#7C3AED] dark:text-[#A78BFA] shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {translateText(preset === '7' ? '7D' : preset === '30' ? '30D' : '90D')}
              </button>
            );
          })}
        </div>

        {/* Professional Date Range / Custom Picker Dropdown */}
        <div className="relative" ref={dateMenuRef}>
          <button
            type="button"
            onClick={() => {
              setDraftStart(customStart);
              setDraftEnd(customEnd);
              setDateMenuOpen(prev => !prev);
            }}
            aria-expanded={dateMenuOpen}
            className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              isCustom || dateMenuOpen
                ? 'border-[#7C3AED]/60 bg-purple-50/50 dark:bg-purple-950/30 text-[#7C3AED] dark:text-[#A78BFA] ring-2 ring-[#7C3AED]/10'
                : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <Calendar size={13.5} className="text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />
            <span className="truncate max-w-[220px]">{periodLabel}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${dateMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {dateMenuOpen && (
            <div className="absolute start-0 top-[calc(100%+6px)] z-50 w-72 sm:w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {translateText('Filter by Date Range')}
                </span>
                <button
                  type="button"
                  onClick={() => setDateMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md cursor-pointer"
                  aria-label={translateText('Close')}
                >
                  <X size={13} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {(['7', '30', '90'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setDays(p);
                      setDateMenuOpen(false);
                      showToast.info('Date range updated');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                      days === p
                        ? 'border-[#7C3AED] bg-purple-50 dark:bg-purple-950/50 text-[#7C3AED] dark:text-[#A78BFA]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {translateText(`Last ${p} days`)}
                  </button>
                ))}
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {translateText('Custom Range')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span>{translateText('Start date')}</span>
                    <input
                      type="date"
                      value={draftStart}
                      max={draftEnd || undefined}
                      onChange={e => setDraftStart(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/70 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#7C3AED]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span>{translateText('End date')}</span>
                    <input
                      type="date"
                      value={draftEnd}
                      min={draftStart || undefined}
                      onChange={e => setDraftEnd(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/70 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#7C3AED]"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const def = defaultDateRange();
                      setDraftStart(def.start);
                      setDraftEnd(def.end);
                      setDays('30');
                      setDateMenuOpen(false);
                    }}
                    className="h-7 px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {translateText('Reset')}
                  </button>
                  <button
                    type="button"
                    disabled={!draftStart || !draftEnd}
                    onClick={() => {
                      if (!draftStart || !draftEnd) return;
                      setCustomStart(draftStart);
                      setCustomEnd(draftEnd);
                      setDays('custom');
                      setDateMenuOpen(false);
                      showToast.info('Custom date range applied');
                    }}
                    className="h-7 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {translateText('Apply Range')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Channel Filter in Conversations Tab */}
        {isConversationsTab && (
          <div className="relative" ref={channelMenuRef}>
            <button
              type="button"
              onClick={() => setChannelMenuOpen(prev => !prev)}
              aria-expanded={channelMenuOpen}
              className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                channel !== 'all' || channelMenuOpen
                  ? 'border-[#7C3AED]/60 bg-purple-50/50 dark:bg-purple-950/30 text-[#7C3AED] dark:text-[#A78BFA] ring-2 ring-[#7C3AED]/10'
                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {selectedChannelOption.kind === 'email' ? (
                <Mail size={13.5} className="text-[#7C3AED] shrink-0" />
              ) : selectedChannelOption.kind ? (
                <ChannelIcon kind={selectedChannelOption.kind} />
              ) : (
                <Filter size={13} className="text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />
              )}
              <span>{translateText(selectedChannelOption.label)}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${channelMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {channelMenuOpen && (
              <div className="absolute start-0 top-[calc(100%+6px)] z-50 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {translateText('Filter by Channel')}
                </div>
                {CHANNEL_OPTIONS.map(opt => {
                  const isSelected = channel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setChannel(opt.value);
                        setChannelMenuOpen(false);
                        showToast.info(`Filtered by ${opt.label}`);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/50 text-[#7C3AED] dark:text-[#A78BFA] font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {opt.kind === 'email' ? (
                          <span className="an-ch web"><Mail size={10} strokeWidth={2.4} /></span>
                        ) : opt.kind ? (
                          <ChannelIcon kind={opt.kind} />
                        ) : (
                          <span className="an-ch other"><Globe size={10} strokeWidth={2.4} /></span>
                        )}
                        <span className="truncate">{translateText(opt.label)}</span>
                      </span>
                      {isSelected && <Check size={13} className="text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 hover:border-[#7C3AED]/50 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 text-xs font-semibold text-[#7C3AED] dark:text-[#A78BFA] transition-all cursor-pointer"
        onClick={exportEvents}
      >
        <Download size={13.5}/>
        <span>{translateText('Export report')}</span>
      </button>
    </div>

    <KpiRow items={kpis} compare={compareText} />
    <div className="an-body">
      <Card title={translateText(tab === 'Sales' || tab === 'Products' ? 'Verified Revenue' : 'Operational Events')}>
        <ChartFrame yLabels={[String(maximum), String(maximum / 2), '0']} x={data.daily.filter((_, i) => i % step === 0).map(day => [data.daily.indexOf(day) / Math.max(1, data.daily.length - 1), day.label])}>
          <path d={smoothPath(toPoints(points, maximum))} stroke="#7C3AED" fill="none" strokeWidth="3"/>
        </ChartFrame>
        <p className="text-xs text-slate-500">{translateText('Only recorded events and verified transactions are included.')} {data.currencies.length > 1 ? `Revenue includes recorded ${data.currency} transactions.` : ''}</p>
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
