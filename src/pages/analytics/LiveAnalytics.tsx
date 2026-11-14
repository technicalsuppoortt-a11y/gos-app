import { useState } from 'react';
import { rowTime, useAnalyticsData, type AnalyticsRow, type AnalyticsTab, type DateRange } from '../../backend/analytics';
import { eventLabel, resourceLabel } from '../../backend/metrics';
import { Card } from './kit';
import { Breakdown, Distribution, Empty, Metrics, Table, Trend } from './charts';
import { amount, chatTime, conversationMetrics, countUnique, currencyOf, daily, dated, group, leadSource, leadStage, number, orderedFunnel, overviewValues, paidOrders, paymentMethod, paymentTime, rate, string, sum } from './model';
import { t } from './labels';
import { Reports } from './Reports';

export type Format = { locale: string; count: (n: number) => string; money: (n: number) => string; percent: (n: number | null) => string };
type DisplayProps = { rows: Record<string, AnalyticsRow[]>; range: DateRange; format: Format; currency: string };
const distribution = (rows: AnalyticsRow[], field: (r: AnalyticsRow) => string): [string, number][] =>
  [...group(rows, field)].map(([label, values]): [string, number] => [label, values.length]).sort((a, b) => b[1] - a[1]);
const grid = 'an-dashboard-grid';

function Overview({ rows, range, format, currency }: DisplayProps) {
  const [search, setSearch] = useState('');
  const { paid, leads, chats, events, revenue } = overviewValues(rows, range, currency);
  const filtered = events.filter(row => [eventLabel(string(row.type)), resourceLabel(string(row.resource)), row.description].some(value => string(value).toLowerCase().includes(search.toLowerCase())));
  const activity = daily(range, events);
  return <>
    <Metrics items={[
      ['Verified revenue', format.money(revenue), daily(range, paid, bucket => sum(bucket, amount), paymentTime)],
      ['New leads', format.count(leads.length), daily(range, leads)],
      ['New conversations', format.count(chats.length), daily(range, chats, bucket => bucket.length, chatTime)],
      ['Operational events', format.count(events.length), activity],
    ]} />
    <Trend title="Workspace activity" range={range} locale={format.locale} kind="area" empty={!events.length} series={[{ name: 'Operational events', values: activity }]} />
    <Card title={t('Activity stream')} action={<input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('Search events')} aria-label={t('Search events')} />}>
      <Table headers={['Event', 'Resource', 'Date']} rows={filtered.slice(0, 100).map(row => [
        t(eventLabel(string(row.type))), t(resourceLabel(string(row.resource))), new Date(rowTime(row)).toLocaleString(format.locale),
      ])} />
    </Card>
  </>;
}

function Sales({ rows, range, format, currency }: DisplayProps) {
  const paid = paidOrders(rows.orders, rows.transactions, range).filter(row => currencyOf(row) === currency && amount(row) > 0);
  const revenue = sum(paid, amount);
  return <>
    <Metrics items={[[ 'Verified revenue', format.money(revenue)], ['Successful transactions', format.count(paid.length)], ['Average order value', paid.length ? format.money(revenue / paid.length) : '—']]} />
    <div className={grid}>
      <Trend title="Revenue and transactions" range={range} locale={format.locale} kind="bars" empty={!paid.length} series={[
        { name: 'Revenue', values: daily(range, paid, bucket => sum(bucket, amount), paymentTime), format: format.money },
        { name: 'Transactions', values: daily(range, paid, bucket => bucket.length, paymentTime) },
      ]} />
      <Distribution title="Payment methods" rows={distribution(paid, paymentMethod)} format={format.count} />
    </div>
  </>;
}

function Leads({ rows, range, format }: DisplayProps) {
  const leads = dated(rows.leads, range);
  const stages = group(leads, leadStage);
  const won = stages.get('Won')?.length ?? 0;
  return <>
    <Metrics items={[[ 'New leads', format.count(leads.length)], ['New contacts', format.count(dated(rows.contacts, range).length)], ['Won leads', format.count(won)], ['Win rate', format.percent(rate(won, leads.length))]]} />
    <div className={grid}>
      <Breakdown title="Pipeline stages" rows={leads.length ? ['New', 'Contacted', 'Qualified', 'Won', 'Lost'].map(stage => [stage, stages.get(stage)?.length ?? 0]) : []} format={format.count} />
      <Distribution title="Lead sources" rows={distribution(leads, leadSource)} format={format.count} />
    </div>
  </>;
}

function Traffic({ rows, range, format }: DisplayProps) {
  const pageViews = dated(rows.analyticsEvents, range);
  const sessions = group(pageViews.filter(row => string(row.sessionId)), row => string(row.sessionId));
  const firstViews = [...sessions.values()].map(items => items.reduce((first, row) => rowTime(row) < rowTime(first) ? row : first));
  const bounces = [...sessions.values()].filter(items => items.length === 1).length;
  const uniquePageViews = [...sessions.values()].reduce((total, items) => total + new Set(items.map(row =>
    row.type === 'product.view' ? `product/${row.productId}` : `page/${row.assetId}/${row.pageId}`)).size, 0);
  return <>
    <Metrics items={[[ 'Unique visitors', format.count(countUnique(pageViews, 'visitorId'))], ['Page views', format.count(pageViews.length)],
      ['Unique page views', format.count(uniquePageViews)], ['Sessions', format.count(sessions.size)], ['Bounce rate', format.percent(rate(bounces, sessions.size))]]} />
    <div className={grid}>
      <Trend title="Daily traffic" range={range} locale={format.locale} empty={!pageViews.length} series={[
        { name: 'Unique visitors', values: daily(range, pageViews, bucket => countUnique(bucket, 'visitorId')) },
        { name: 'Page views', values: daily(range, pageViews) },
      ]}><p className="an-analytics-note">{t('Bounce rate counts sessions with one recorded view in the selected period.')}</p></Trend>
      <Breakdown title="Traffic sources" rows={distribution(firstViews, row => string(row.source, 'Unknown'))} format={format.count} />
    </div>
  </>;
}

type Funnel = { id: string; name?: string; document?: { pages?: { id: string; name: string }[]; funnel?: { pagesFlow?: string[] } } };
function Conversions({ rows, range, format }: DisplayProps) {
  const funnels = rows.assets.filter(row => row.kind === 'funnel' && !row.formAsset && !row.archived && !row.sampleData) as Funnel[];
  const [selected, select] = useState('');
  const funnel = funnels.find(item => item.id === selected) ?? funnels[0];
  const pages = funnel?.document?.pages ?? [];
  const flow = funnel?.document?.funnel?.pagesFlow;
  const ordered = flow?.length ? flow.flatMap(id => pages.filter(page => page.id === id)) : pages;
  const views = dated(rows.analyticsEvents, range).filter(view => view.type === 'page.view' && view.assetId === funnel?.id);
  const counts = orderedFunnel(views, ordered.map(page => page.id));
  const starts = counts[0] ?? 0;
  const finishes = counts[counts.length - 1] ?? 0;
  const submissions = dated(rows.events, range).filter(event => event.type === 'lead.captured' && event.sourceAssetId === funnel?.id).length;
  const checkouts = dated(rows.checkoutRequests, range);
  const approvals = dated(rows.checkoutRequests, range, row => rowTime(row, 'decidedAt', 'createdAt')).filter(row => row.status === 'Approved').length;
  return <>
    <Metrics items={[[ 'Funnel entries', format.count(starts)], ['Final step reached', format.count(finishes)], ['Completion rate', format.percent(rate(finishes, starts))], ['Form submissions', format.count(submissions)]]} />
    <Card title={t('Funnel steps')} action={funnels.length > 0 && <select aria-label={t('Funnel')} value={funnel?.id} onChange={event => select(event.target.value)}>
      {funnels.map(item => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}
    </select>}>
      {starts ? <ol className="an-funnel-list">{ordered.map((page, i) => <li key={page.id}>
        {i > 0 && <small>{t('Drop-off')} · {format.percent(counts[i - 1] ? 1 - counts[i] / counts[i - 1] : null)}</small>}
        <div style={{ width: `${Math.max(35, counts[i] / starts * 100)}%` }}><strong>{page.name}</strong><span>{format.count(counts[i])} · {format.percent(counts[i] / starts)}</span></div>
      </li>)}</ol> : <Empty />}
    </Card>
    <Breakdown title="Workspace checkout activity" rows={[[ 'Checkout requests', checkouts.length], ['Approved checkouts', approvals]]} format={format.count} />
  </>;
}

const channels = ['whatsapp', 'facebook', 'messenger', 'instagram', 'webchat', 'email'];
const channelName = (channel: string) => ({ whatsapp: 'WhatsApp', facebook: 'Facebook', messenger: 'Messenger', instagram: 'Instagram', webchat: 'Website Chat', email: 'Email' }[channel] ?? channel);
function Conversations({ rows, range, format }: DisplayProps) {
  const [channel, select] = useState('all');
  const { incoming, ai, team, replies } = conversationMetrics(rows.conversations, rows.messages, range, channel);
  const handoffs = dated(rows.handoffLogs, range).filter(row => channel === 'all' || row.channel === channel);
  const averages = daily(range, replies, bucket => bucket.length ? sum(bucket, row => number(row.minutes)) / bucket.length : -1);
  return <>
    <div className="an-report-controls"><label>{t('Channel')}<select value={channel} onChange={event => select(event.target.value)}>
      <option value="all">{t('All channels')}</option>{channels.map(id => <option key={id} value={id}>{t(channelName(id))}</option>)}
    </select></label></div>
    <Metrics items={[[ 'Incoming chats', format.count(incoming.length)], ['AI handled', format.count(ai.length)], ['Support team handled', format.count(team.length)], ['Human handoffs', format.count(handoffs.length)]]} />
    <div className={grid}>
      <Trend title="Chat handling" range={range} locale={format.locale} kind="stacked" empty={!ai.length && !team.length} series={[
        { name: 'AI handled', values: daily(range, ai) }, { name: 'Support team handled', values: daily(range, team) },
      ]}><p className="an-analytics-note">{t('Chats are attributed to the first recorded reply in the selected period.')}</p></Trend>
      <Trend title="Average first response time" range={range} locale={format.locale} empty={!replies.length} series={[
        { name: 'Minutes', values: averages.map(value => value < 0 ? null : value) },
      ]} />
    </div>
  </>;
}

function Products({ rows, range, format, currency }: DisplayProps) {
  const views = group(dated(rows.analyticsEvents, range).filter(row => row.type === 'product.view'), row => string(row.productId));
  const products = new Map(rows.products.filter(row => !row.sampleData).map(row => {
    const config = row.config as { inventory?: number } | undefined;
    return [row.id, { name: string(row.name, row.id), stock: config?.inventory ?? row.inventory, units: 0, revenue: 0, purchases: 0 }];
  }));
  for (const order of paidOrders(rows.orders, [], range)) {
    const items = Array.isArray(order.items) && order.items.length ? order.items : [{ ...order, amount: amount(order) }];
    const purchased = new Set<string>();
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const id = string(item.productId);
      if (!id) continue;
      const row = products.get(id) ?? { name: string(item.productName, id), stock: undefined, units: 0, revenue: 0, purchases: 0 };
      row.units += item.quantity === undefined ? 1 : number(item.quantity);
      if (currencyOf(order) === currency) row.revenue += number(item.amount);
      if (!purchased.has(id)) row.purchases++;
      purchased.add(id);
      products.set(id, row);
    }
  }
  const ranked = [...products].sort((a, b) => b[1].revenue - a[1].revenue || b[1].units - a[1].units);
  return <>
    <Metrics items={[[ 'Catalog products', format.count(ranked.length)], ['Units sold', format.count(ranked.reduce((sum, [, row]) => sum + row.units, 0))], ['Product revenue', format.money(ranked.reduce((sum, [, row]) => sum + row.revenue, 0))]]} />
    <Breakdown title="Top products by revenue" rows={ranked.filter(([, row]) => row.revenue > 0).slice(0, 10).map(([, row]) => [row.name, row.revenue])} format={format.money} />
    <Card title={t('Product performance')}><Table headers={['Product', 'In stock', 'Units sold', 'Revenue', 'Product views', 'Purchases per view']} rows={ranked.map(([id, row]) => {
      const count = views.get(id)?.length ?? 0;
      return [row.name, row.stock == null ? '—' : format.count(number(row.stock)), format.count(row.units), format.money(row.revenue), format.count(count), format.percent(rate(row.purchases, count))];
    })} /></Card>
  </>;
}

const views = { Overview, Sales, Leads, Traffic, Conversions, Conversations, Products, Reports };
export function AnalyticsContent({ tab, range, currency, locale }: { tab: AnalyticsTab; range: DateRange; currency: string; locale: string }) {
  const { data, error, incomplete, retry } = useAnalyticsData(tab, range);
  const View = views[tab];
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1, numberingSystem: 'latn' });
  const format: Format = {
    locale, count: new Intl.NumberFormat(locale, { numberingSystem: 'latn' }).format,
    money: new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code', numberingSystem: 'latn' }).format,
    percent: value => value === null ? '—' : percent.format(value),
  };
  return <div className="an-dashboard">{error ? <Card title={t('Analytics unavailable')}>
    <div role="alert"><Empty>{t('Could not load workspace analytics.')}</Empty><button type="button" className="an-control" onClick={retry}>{t('Retry')}</button></div>
  </Card> : data ? <>
    {incomplete && <Card title={t('Some analytics sources are unavailable')}>
      <div role="status"><p className="an-analytics-note">{t('Figures may be incomplete until all sources load.')}</p>
        <button type="button" className="an-control" onClick={retry}>{t('Retry')}</button></div>
    </Card>}
    <View rows={data} format={format} range={range} currency={currency} incomplete={incomplete} />
  </> : <div role="status"><Empty>{t('Loading analytics…')}</Empty></div>}</div>;
}
