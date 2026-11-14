import { useState } from 'react';
import { datesIn, rowTime, shiftDate, useAnalyticsData, type AnalyticsRow, type DateRange } from '../../backend/analytics';
import { eventLabel, resourceLabel } from '../../backend/metrics';
import { Card, downloadCsv } from './kit';
import { Empty, Table } from './charts';
import type { Format } from './LiveAnalytics';
import { activityRows, countUnique, dated, overviewValues, string } from './model';
import { t } from './labels';
import { downloadReportPdf } from './reportPdf';

export function Reports({ rows, range, format, currency, incomplete }: {
  rows: Record<string, AnalyticsRow[]>; range: DateRange; format: Format; currency: string; incomplete?: boolean;
}) {
  const [custom, setCustom] = useState<DateRange>();
  const [draft, setDraft] = useState<DateRange>();
  const [mode, setMode] = useState('CSV');
  const [exportFailed, setExportFailed] = useState(false);
  const previous = { start: shiftDate(range.start, -datesIn(range).length), end: shiftDate(range.start, -1) };
  const comparison = custom ?? previous;
  const dates = draft ?? comparison;
  const compare = useAnalyticsData('Reports', comparison);
  const current = overviewValues(rows, range, currency);
  const prior = !compare.incomplete && !compare.error && compare.data
    ? overviewValues(compare.data, comparison, currency) : undefined;
  const currentVisitors = countUnique(dated(rows.analyticsEvents, range), 'visitorId');
  const priorVisitors = prior && compare.data ? countUnique(dated(compare.data.analyticsEvents, comparison), 'visitorId') : undefined;
  const logs = activityRows(rows, range);
  const summaryHeaders = ['Metric', 'Selected period', 'Comparison period', 'Change'];
  const summary = [
    ['Verified revenue', current.revenue, prior?.revenue, format.money],
    ['Paid orders', current.paid.length, prior?.paid.length, format.count],
    ['New leads', current.leads.length, prior?.leads.length, format.count],
    ['New conversations', current.chats.length, prior?.chats.length, format.count],
    ['Operational events', current.events.length, prior?.events.length, format.count],
    ['Unique visitors', currentVisitors, priorVisitors, format.count],
  ] as const;
  const comparisons = summary.map(([label, value, baseline, formatter]) => [
    t(label), formatter(value), baseline === undefined ? '—' : formatter(baseline),
    baseline === undefined || baseline === 0 ? '—' : format.percent((value - baseline) / baseline),
  ]);
  const logHeaders = ['Event', 'Resource', 'Date'];
  const activity = (exporting: boolean) => logs.slice(0, exporting ? logs.length : 100).map(row => [
    t(eventLabel(string(row.type))), t(resourceLabel(string(row.resource))),
    exporting ? new Date(rowTime(row)).toISOString() : new Date(rowTime(row)).toLocaleString(format.locale),
  ]);
  function exportReport(name: string, headers: string[], data: (string | number)[][]) {
    const title = `${t(name)} · ${range.start} – ${range.end}${name === 'Period comparison' ? ` / ${comparison.start} – ${comparison.end}` : ''}`;
    const filename = name === 'Period comparison'
      ? `analytics-summary-${range.start}-${range.end}-vs-${comparison.start}-${comparison.end}-${currency}`
      : `analytics-activity-${range.start}-${range.end}`;
    try {
      if (mode === 'PDF') downloadReportPdf(`${filename}.pdf`, title, headers.map(t), data.map(row => row.map(String)), format.locale.startsWith('ar'));
      else downloadCsv(`${filename}.csv`, [headers.map(t), ...data].map(row => row.map(value =>
        typeof value === 'string' && /^(?:[\s\uFEFF]*[=+@-]|[\t\r])/.test(value) ? `'${value}` : value)));
      setExportFailed(false);
    } catch { setExportFailed(true); }
  }
  return <>
    <Card title={t('Report generator')} action={<label>{t('Format')} <select value={mode} onChange={event => { setMode(event.target.value); setExportFailed(false); }}>
      <option>CSV</option><option>PDF</option>
    </select></label>}>
      <form className="an-report-controls" onSubmit={event => { event.preventDefault(); setCustom(dates); }}>
        <label>{t('Comparison start')}<input type="date" required max={dates.end} min={dates.end ? shiftDate(dates.end, -365) : undefined} value={dates.start} onChange={event => setDraft({ ...dates, start: event.target.value })} /></label>
        <label>{t('Comparison end')}<input type="date" required min={dates.start} max={dates.start ? shiftDate(dates.start, 365) : undefined} value={dates.end} onChange={event => setDraft({ ...dates, end: event.target.value })} /></label>
        <button className="an-control" type="submit">{t('Compare periods')}</button>
        <button className="an-control" type="button" onClick={() => { setDraft(undefined); setCustom(undefined); }}>{t('Previous period')}</button>
      </form>
      <div className="an-report-controls">
        <button className="an-control" type="button" disabled={!prior || incomplete} onClick={() => exportReport('Period comparison', summaryHeaders, comparisons)}>{t('Export summary')}</button>
        <button className="an-control" type="button" disabled={!logs.length || incomplete} onClick={() => exportReport('Activity stream', logHeaders, activity(true))}>{t('Export activity logs')}</button>
      </div>
      {exportFailed && <p role="alert">{t('Could not export the report.')}</p>}
    </Card>
    <Card title={t('Period comparison')}>
      <p className="an-analytics-note"><bdi>{range.start} – {range.end}</bdi> / <bdi>{comparison.start} – {comparison.end}</bdi></p>
      {compare.error || compare.incomplete ? <div role="alert"><Empty>{t('Could not load comparison data.')}</Empty><button type="button" className="an-control" onClick={compare.retry}>{t('Retry')}</button></div>
        : compare.data ? <Table headers={summaryHeaders} rows={comparisons} /> : <div role="status"><Empty>{t('Loading comparison…')}</Empty></div>}
    </Card>
    <Card title={t('Activity stream')}><Table headers={logHeaders} rows={activity(false)} /></Card>
  </>;
}
