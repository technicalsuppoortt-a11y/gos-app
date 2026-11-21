import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  dateKey,
  shiftDate,
  useLiveWorkspaceAnalytics,
  type AnalyticsTabId,
  type DateRange,
} from '../backend/analytics';
import { useCurrency } from '../context/CurrencyContext';
import { useUILanguage } from '../i18n/display';
import { downloadCsv } from './analytics/kit';
import { AnalyticsContent, buildAnalyticsExportPayload } from './analytics/LiveAnalytics';
import { t } from './analytics/labels';
import { downloadReportPdf } from './analytics/reportPdf';
import './analytics.css';
import './analytics/dashboard.css';
import './specialized-compact.css';

const TABS: { id: AnalyticsTabId; label: string }[] = [
  { id: 'Overview', label: 'Overview' },
  { id: 'SalesProducts', label: 'Sales & Products' },
  { id: 'FunnelsLeads', label: 'Funnels & Leads' },
  { id: 'ConversationsAI', label: 'Conversations & AI' },
];

const PRESETS: { days: 7 | 30 | 90; label: string }[] = [
  { days: 7, label: '7 Days' },
  { days: 30, label: '30 Days' },
  { days: 90, label: '90 Days' },
];

const CHANNELS = [
  { value: 'all', label: 'All Channels (WhatsApp, Instagram, Messenger, Website)' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'webchat', label: 'Website Chat' },
  // { value: 'facebook', label: 'Facebook' },
  { value: 'email', label: 'Email' },
] as const;

function buildPresetRange(days: number): DateRange {
  const end = dateKey(new Date());
  return { start: shiftDate(end, 1 - days), end };
}

function formatCompactDateBadge(range: DateRange): string {
  const fmt = (iso: string) => {
    const [, m, d] = iso.split('-');
    return m && d ? `${d}/${m}` : iso;
  };
  return `${fmt(range.start)} - ${fmt(range.end)}`;
}

export const Analytics = (props: { notify: (message: string) => void }) => {
  const uiLang = useUILanguage();
  const ar = uiLang.startsWith('ar');
  const locale = ar ? 'ar-EG-u-nu-latn' : 'en-US';
  const { currency: preferredCurrency, convertAmount } = useCurrency();

  const [tab, setTab] = useState<AnalyticsTabId>('Overview');
  const [range, setRange] = useState<DateRange>(() => buildPresetRange(30));
  const [selection, setSelection] = useState<number>(30);
  const [draft, setDraft] = useState<DateRange>(range);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [currency, setCurrency] = useState<string>();
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [exportOpen, setExportOpen] = useState(false);

  const datePopoverRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const activeCurrency = currency ?? preferredCurrency ?? 'EGP';
  const currencies = [
    ...new Set([
      activeCurrency,
      preferredCurrency,
      'EGP',
      'USD',
      'SAR',
      'AED',
      'EUR',
      'GBP',
      'KWD',
      'QAR',
      'JOD',
      'BHD',
      'OMR',
      'CAD',
      'AUD',
    ].filter(Boolean)),
  ];

  const live = useLiveWorkspaceAnalytics();

  useEffect(() => {
    if (!datePopoverOpen && !exportOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (datePopoverRef.current && !datePopoverRef.current.contains(e.target as Node)) {
        setDatePopoverOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDatePopoverOpen(false);
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [datePopoverOpen, exportOpen]);

  function handleExport(kind: 'CSV' | 'PDF') {
    setExportOpen(false);
    try {
      const payload = buildAnalyticsExportPayload({
        tab,
        rows: live.data,
        range,
        currency: activeCurrency,
        convertAmount,
        locale,
        channelFilter,
      });
      if (kind === 'PDF') {
        downloadReportPdf(
          `${payload.filenameBase}.pdf`,
          payload.title,
          payload.headings,
          payload.tableRows.map(row => row.map(String)),
          ar
        );
      } else {
        const sanitized = [payload.headings, ...payload.tableRows].map(row =>
          row.map(value =>
            typeof value === 'string' && /^(?:[\s\uFEFF]*[=+@-]|[\t\r])/.test(value)
              ? `'${value}`
              : value
          )
        );
        downloadCsv(`${payload.filenameBase}.csv`, sanitized);
      }
      props.notify?.(ar ? `تم تصدير التقرير بصيغة ${kind}` : `Exported ${kind} report.`);
    } catch {
      props.notify?.(t('Could not export the report.'));
    }
  }

  return (
    <main className="an-page an2-root" dir={ar ? 'rtl' : 'ltr'}>
      {/* Top Header & Controls Row */}
      <header className="an2-top-bar">
        <h1 className="an2-page-title">{t('Analytics')}</h1>

        <div className="an2-controls-row">
          {/* Preset Days Segmented Pill */}
          <div className="an2-presets-pill" role="group" aria-label={t('Date range')}>
            {PRESETS.map(item => {
              const isSelected = selection === item.days;
              return (
                <button
                  key={item.days}
                  type="button"
                  aria-pressed={isSelected}
                  className={`an2-preset-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    const next = buildPresetRange(item.days);
                    setRange(next);
                    setDraft(next);
                    setSelection(item.days);
                    setDatePopoverOpen(false);
                  }}
                >
                  {t(item.label)}
                </button>
              );
            })}
          </div>

          {/* Compact Date Range Button + Popover */}
          <div className="an2-popover-anchor" ref={datePopoverRef}>
            <button
              type="button"
              className={`an2-control-pill ${datePopoverOpen ? 'is-open' : ''}`}
              aria-expanded={datePopoverOpen}
              aria-label={t('Custom date range')}
              onClick={() => {
                setDraft(range);
                setDatePopoverOpen(v => !v);
              }}
            >
              <CalendarDays size={15} className="an2-control-icon" />
              <bdi className="tabular-nums">{formatCompactDateBadge(range)}</bdi>
            </button>

            {datePopoverOpen && (
              <form
                className="an2-date-popover"
                onSubmit={e => {
                  e.preventDefault();
                  if (draft.start && draft.end && draft.start <= draft.end) {
                    setRange(draft);
                    setSelection(0);
                    setDatePopoverOpen(false);
                  }
                }}
              >
                <label className="an2-date-field">
                  <span>{t('Start date')}</span>
                  <input
                    type="date"
                    required
                    max={draft.end}
                    min={draft.end ? shiftDate(draft.end, -365) : undefined}
                    value={draft.start}
                    onChange={e => setDraft({ ...draft, start: e.target.value })}
                  />
                </label>
                <label className="an2-date-field">
                  <span>{t('End date')}</span>
                  <input
                    type="date"
                    required
                    min={draft.start}
                    max={draft.start ? shiftDate(draft.start, 365) : undefined}
                    value={draft.end}
                    onChange={e => setDraft({ ...draft, end: e.target.value })}
                  />
                </label>
                <button type="submit" className="an2-apply-btn">
                  {t('Apply range')}
                </button>
              </form>
            )}
          </div>

          {/* Comparison Period Switch */}
          <label className="an2-compare-toggle">
            <button
              type="button"
              role="switch"
              aria-checked={compareEnabled}
              aria-label={t('Compare to previous period')}
              className={`an2-switch ${compareEnabled ? 'is-on' : ''}`}
              onClick={() => setCompareEnabled(v => !v)}
            >
              <span className="an2-switch-thumb" />
            </button>
            <span className="an2-compare-label">{t('Compare to previous period')}</span>
          </label>

          {/* Currency Selector */}
          <div className="an2-select-wrap">
            <select
              aria-label={t('Currency')}
              className="an2-currency-select"
              value={activeCurrency}
              onChange={e => setCurrency(e.target.value)}
            >
              {currencies.map(code => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="an2-select-caret" aria-hidden="true" />
          </div>

          {/* Export CSV / PDF Dropdown */}
          <div className="an2-popover-anchor" ref={exportMenuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              className="an2-control-pill an2-export-trigger"
              onClick={() => setExportOpen(v => !v)}
            >
              <Download size={14} className="an2-control-icon" />
              <span>{t('Export CSV / PDF')}</span>
            </button>

            {exportOpen && (
              <div className="an2-export-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => handleExport('CSV')}>
                  <FileSpreadsheet size={15} />
                  <span>{t('Export CSV')}</span>
                </button>
                <button type="button" role="menuitem" onClick={() => handleExport('PDF')}>
                  <FileText size={15} />
                  <span>{t('Export PDF')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 4 Core Tabs + Contextual Channel Filter */}
      <div className="an2-tabs-bar">
        <nav className="an2-tabs-nav" role="tablist" aria-label={t('Analytics sections')}>
          {TABS.map((item, idx) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`analytics-tab-${item.id}`}
                role="tab"
                aria-controls="analytics-panel"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`an2-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
                onKeyDown={event => {
                  const offset =
                    event.key === 'ArrowRight'
                      ? ar
                        ? -1
                        : 1
                      : event.key === 'ArrowLeft'
                        ? ar
                          ? 1
                          : -1
                        : 0;
                  if (!offset && event.key !== 'Home' && event.key !== 'End') return;
                  event.preventDefault();
                  const nextIndex =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? TABS.length - 1
                        : (idx + offset + TABS.length) % TABS.length;
                  const nextId = TABS[nextIndex].id;
                  setTab(nextId);
                  document.getElementById(`analytics-tab-${nextId}`)?.focus();
                }}
              >
                <span>{t(item.label)}</span>
                {isActive && (
                  <motion.span
                    layoutId="an2-tab-indicator"
                    className="an2-tab-underline"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {tab === 'ConversationsAI' && (
          <div className="an2-channel-filter-wrap">
            <select
              aria-label={t('Channel')}
              className="an2-channel-select"
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
            >
              {CHANNELS.map(ch => (
                <option key={ch.value} value={ch.value}>
                  {t(ch.label)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="an2-select-caret" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Active Tab Content */}
      <div className="an-dashboard-scroll an2-scroll-body">
        <section
          id="analytics-panel"
          role="tabpanel"
          aria-labelledby={`analytics-tab-${tab}`}
          tabIndex={0}
          className="an2-panel"
        >
          <AnalyticsContent
            tab={tab}
            data={live.data}
            loading={live.loading}
            error={live.error}
            onRetry={live.retry}
            range={range}
            compareEnabled={compareEnabled}
            currency={activeCurrency}
            convertAmount={convertAmount}
            locale={locale}
            channelFilter={channelFilter}
          />
        </section>
      </div>
    </main>
  );
};
