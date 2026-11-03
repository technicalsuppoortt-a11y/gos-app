import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAdminManagement } from '../../backend/adminManagement';
import { backendError, primaryDb } from '../../backend/firebase';
import { useUILanguage } from '../../i18n/display';
import { aggregateOperations, dateValue, numberValue, resourceOf, tokenCount } from './operations-model';
import type { LiveRecord, ManagementResource } from './live-model';
import { sourceAvailability } from './sourceAvailability';
import { AdminAIUsage } from './AdminAIUsage';

const resources: Record<string, readonly ManagementResource[]> = {
  conversations: ['conversations', 'messages', 'handoffLogs', 'integrations'],
  analytics: ['leads', 'transactions', 'conversations', 'messages', 'auditLogs', 'events', 'aiUsage'],
  'ai-usage': ['aiUsage', 'modelAllocations'],
};
type Row = { id: string; values: string[]; status: string };

export function AdminOperations({ moduleId }: { moduleId: 'conversations' | 'analytics' | 'ai-usage' }) {
  const [reload, setReload] = useState(0);
  const { records, tenants, loading, error, sourceErrors = {}, pendingSources = loading ? ['directory'] : [] } = useAdminManagement(resources[moduleId], false, false, reload);
  const incomplete = !!error || Object.keys(sourceErrors).length > 0;
  const availability = (...dependencies: string[]) => sourceAvailability(dependencies, Object.keys(tenants), sourceErrors, pendingSources, error);
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => ar ? arabic : en;

  if (moduleId === 'ai-usage') {
    return (
      <div className="adm-workspace">
        <AdminAIUsage
          records={records}
          tenants={tenants}
          loading={loading}
          error={error}
          sourceErrors={sourceErrors}
          onReload={() => setReload(n => n + 1)}
        />
      </div>
    );
  }
  const [params, setParams] = useSearchParams();
  const tabs = moduleId === 'conversations' ? [t('Threads', 'المحادثات'), t('Messages', 'الرسائل'), t('Human handoffs', 'التحويلات'), t('Channel health', 'صحة القنوات')] : moduleId === 'analytics' ? [t('Operational Events Log', 'سجل الأحداث'), t('Revenue trends', 'اتجاهات الإيرادات'), t('Workspace AI tokens', 'استهلاك الذكاء الاصطناعي')] : [t('Workspace usage', 'استخدام المساحات'), t('Model allocations', 'توزيع النماذج')];
  const requested = Number(params.get('tab') ?? 0), tab = Number.isInteger(requested) && requested >= 0 && requested < tabs.length ? requested : 0;
  const [search, setSearch] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1);
  useEffect(() => { setPage(1); setStatus(''); }, [tab, moduleId]);
  const stats = aggregateOperations(records);
  const scoped = (resource: string) => records.filter(r => resourceOf(r) === resource);
  const channelIntegrations = scoped('integrations').filter(r => ['whatsapp', 'email', 'sms', 'instagram', 'messenger', 'facebook', 'telegram', 'webchat', 'web'].includes(String(r.data.channel ?? r.id).toLowerCase()) || records.some(thread => resourceOf(thread) === 'conversations' && thread.workspaceId === r.workspaceId && thread.data.channel === (r.data.channel ?? r.id)));
  const workspace = (r: LiveRecord) => String(tenants[r.workspaceId]?.name ?? r.workspaceId);
  const row = (r: LiveRecord): Row => {
    const d: Record<string, unknown> = r.data;
    return { id: r.path, status: String(d.status ?? (d.takenOver ? 'Human handoff' : 'Unknown')), values: [String(d.name ?? d.subject ?? d.title ?? d.conversationId ?? r.id), workspace(r), String(d.channel ?? '—'), String(d.status ?? (d.takenOver ? 'Human handoff' : 'Unknown')), String(d.text ?? d.description ?? d.type ?? d.reason ?? '—'), dateValue(d.createdAt ?? d.updatedAt ?? d.at) || '—'] };
  };
  let columns = ['Reference', 'Workspace', 'Channel', 'Status', 'Details', 'Date'];
  let rows: Row[] = [];
  if (moduleId === 'conversations') {
    rows = scoped(['conversations', 'messages', 'handoffLogs', 'integrations'][tab]).map(row);
    if (tab === 3) {
      columns = ['Channel', 'Workspace', 'Connection', 'Messages', 'Failed', 'Last update'];
      rows = channelIntegrations.map(r => { const messages = scoped('messages').filter(m => m.workspaceId === r.workspaceId && m.data.channel === (r.data.channel ?? r.id)); return { id: r.path, status: String(r.data.status ?? 'Unknown'), values: [String(r.data.channel ?? r.id), workspace(r), String(r.data.status ?? 'Unknown'), String(messages.length), String(messages.filter(m => /failed|undelivered/i.test(String(m.data.status))).length), dateValue(r.data.updatedAt ?? r.data.lastSyncAt) || '—'] }; });
    }
  } else if (moduleId === 'analytics' && tab === 0) {
    columns = ['Reference', 'Workspace', 'Actor', 'Status', 'Details', 'Date'];
    rows = [...scoped('auditLogs'), ...scoped('events')].sort((a, b) => dateValue(b.data.createdAt).localeCompare(dateValue(a.data.createdAt))).map(r => { const entry = row(r); entry.values[2] = String(r.data.actorId ?? 'Unattributed'); return entry; });
  }
  else if (moduleId === 'analytics' && tab === 1) { columns = ['Month / Currency', 'Revenue']; rows = stats.trends.map(([key, value]) => ({ id: key, status: '', values: [key, value.toLocaleString()] })); }
  else {
    columns = ['Workspace', 'Model', 'Tokens consumed', 'Token allocation', 'Status'];
    const grouped = new Map<string, { workspaceId: string; model: string; tokens: number; budget: number | null; status: string }>();
    for (const r of records) {
      const key = `${r.workspaceId}:${String(r.data.model ?? 'Unspecified')}`;
      const entry = grouped.get(key) ?? { workspaceId: r.workspaceId, model: String(r.data.model ?? 'Unspecified'), tokens: 0, budget: null, status: 'Active' };
      if (resourceOf(r) === 'aiUsage') entry.tokens += tokenCount(r.data);
      if (resourceOf(r) === 'modelAllocations') { entry.budget = numberValue(r.data.tokenBudget ?? r.data.budget); entry.status = String(r.data.status ?? 'Active'); }
      if (['aiUsage', 'modelAllocations'].includes(resourceOf(r))) grouped.set(key, entry);
    }
    rows = [...grouped].map(([id, d]) => ({ id, status: d.status, values: [String(tenants[d.workspaceId]?.name ?? d.workspaceId), d.model, d.tokens.toLocaleString(), d.budget === null ? 'Not configured' : d.budget.toLocaleString(), d.status] }));
  }
  const statuses = [...new Set(rows.map(r => r.status))].filter(Boolean).sort();
  const visible = rows.filter(r => (!status || r.status === status) && r.values.join(' ').toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(visible.length / 15)), current = Math.min(page, pages);
  const title = moduleId === 'conversations' ? t('Conversations', 'المحادثات') : t('Analytics', 'التحليلات');
  const metrics = moduleId === 'conversations'
    ? [['Threads', scoped('conversations').length], ['Messages', scoped('messages').length], ['Human handoffs', scoped('handoffLogs').length], ['Connected channels', channelIntegrations.filter(r => /^connected$/i.test(String(r.data.status))).length]]
    : [['Leads', stats.leads], ['Lead conversion (Won / all leads)', stats.conversion === null ? '—' : `${stats.conversion.toFixed(1)}%`], ['AI tokens', stats.tokens], ['Workspaces', Object.keys(tenants).length]];
  const metricSources = moduleId === 'conversations'
    ? [['conversations'], ['messages'], ['handoffLogs'], ['integrations', 'conversations']]
    : [['leads'], ['leads'], ['aiUsage'], []];
  const tableSources = moduleId === 'conversations' ? [['conversations'], ['messages'], ['handoffLogs'], ['integrations', 'messages']][tab] : moduleId === 'analytics' ? [['auditLogs', 'events'], ['transactions'], ['aiUsage']][tab] : ['aiUsage', 'modelAllocations'];
  const tableState = availability(...tableSources);
  const revenueState = availability('transactions');
  return <div className="adm-workspace"><div className="adm-page-head"><div><h1>{title}</h1><p>{t('Live workspace records · All recorded time', 'بيانات حية · جميع الفترات')}</p></div></div>
    {loading && <p role="status">{t('Loading live data…', 'جار تحميل البيانات…')}</p>}{error && <p role="alert">{error}</p>}
    {incomplete && <section className="adm-notice" role="status"><div><p>{t('Some sources are unavailable. Other metrics remain live. Partial values include only accessible records.', 'بعض المصادر غير متاحة. تبقى المقاييس الأخرى حية، وتشمل القيم الجزئية السجلات المتاحة فقط.')}</p>{Object.keys(sourceErrors).length > 0 && <details><summary>{t('Unavailable sources', 'المصادر غير المتاحة')}</summary><ul>{Object.entries(sourceErrors).map(([source, message]) => <li key={source}>{source}: {message}</li>)}</ul></details>}<button onClick={() => setReload(n => n + 1)}>{t('Try again', 'إعادة المحاولة')}</button></div></section>}
    <div className="adm-metrics">{metrics.map(([label, value], index) => { const state = availability(...metricSources[index]); return <div className="adm-metric" key={label} data-source-state={state}><span>{label}</span><strong>{state === 'loading' ? '…' : state === 'unavailable' ? t('Unavailable', 'غير متاح') : value}</strong>{state === 'partial' && <small>{t('Partial · accessible records only', 'جزئي · السجلات المتاحة فقط')}</small>}</div>; })}</div>
    {moduleId === 'analytics' && <section className="adm-panel" style={{ padding: 20 }}><h2>Recorded revenue</h2>{revenueState === 'loading' ? <p>{t('Loading revenue…', 'جار تحميل الإيرادات…')}</p> : revenueState === 'unavailable' ? <p>{t('Revenue records are unavailable.', 'سجلات الإيرادات غير متاحة.')}</p> : <>{revenueState === 'partial' && <p>{t('Partial revenue · accessible workspaces only', 'إيرادات جزئية · مساحات العمل المتاحة فقط')}</p>}{stats.revenue.length ? stats.revenue.map(([c, v]) => <p key={c}>{c}: {v.toLocaleString()}</p>) : <p>{t('No completed transactions recorded.', 'لا توجد معاملات مكتملة مسجلة.')}</p>}</>}</section>}
    <div className="adm-tabs" role="tablist" aria-label={title}>{tabs.map((label, i) => <button key={label} role="tab" aria-selected={tab === i} className={tab === i ? 'active' : ''} onClick={() => setParams({ tab: String(i) })}>{label}</button>)}</div>
    <section className="adm-panel"><div className="adm-panel-heading"><h2>{tabs[tab]}</h2><span>{visible.length} records</span></div><div className="adm-filters"><label className="adm-search"><input aria-label="Search records" placeholder={t('Search records…', 'ابحث في السجلات…')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label><select aria-label="Status filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></div>
      {tableState === 'partial' && <p role="status">{t('Showing accessible records; some workspace sources are unavailable.', 'تظهر السجلات المتاحة؛ بعض مصادر مساحات العمل غير متاحة.')}</p>}
      <div className="adm-table-wrap"><table><thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{visible.slice((current - 1) * 15, current * 15).map(r => <tr key={r.id}>{r.values.map((v, i) => <td key={i} style={{ maxWidth: 360, overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{v}</td>)}</tr>)}</tbody></table></div>{!visible.length && <div className="adm-empty">{tableState === 'loading' ? t('Loading records…', 'جار تحميل السجلات…') : tableState === 'unavailable' || tableState === 'partial' ? t('No accessible records in this view. Retry or check workspace permissions.', 'لا توجد سجلات متاحة في هذا العرض. أعد المحاولة أو راجع صلاحيات مساحة العمل.') : t('No matching records.', 'لا توجد سجلات مطابقة.')}</div>}
      <div className="adm-pagination"><span>{current} / {pages}</span><div><button disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button><button disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</button></div></div>
    </section>
  </div>;
}
