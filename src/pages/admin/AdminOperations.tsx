import { useCurrency } from '../../context/CurrencyContext';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Layers,
  MessagesSquare,
  Plug,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Webhook,
} from 'lucide-react';
import { useAdminManagement } from '../../backend/adminManagement';
import { primaryAuth, primaryDb } from '../../backend/firebase';
import { useUILanguage } from '../../i18n/display';
import type { RootState } from '../../store';
import { downloadCSV } from './repository';
import type { RecordRow } from './catalog';
import { aggregateOperations, dateValue, numberValue, resourceOf, tokenCount } from './operations-model';
import type { LiveRecord, ManagementResource } from './live-model';
import { sourceAvailability } from './sourceAvailability';
import { AdminAIUsage } from './AdminAIUsage';

export type AdminOperationsModuleId = 'conversations' | 'analytics' | 'ai-usage' | 'integrations' | 'transactions';

const resources: Record<AdminOperationsModuleId, readonly ManagementResource[]> = {
  conversations: ['conversations', 'messages', 'handoffLogs', 'integrations'],
  analytics: ['leads', 'transactions', 'conversations', 'messages', 'auditLogs', 'events', 'aiUsage'],
  'ai-usage': ['aiUsage', 'modelAllocations'],
  integrations: ['integrations', 'events', 'auditLogs'],
  transactions: ['transactions', 'orders'],
};
type Row = { id: string; values: string[]; status: string; cells?: ReactNode[] };

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (/^(connected|active|healthy|operational|completed|paid|succeeded|confirmed|approved|resolved|won)$/i.test(status)) return 'success';
  if (/^(pending|paused|warning|needs attention|human handoff|open|trialing)$/i.test(status)) return 'warning';
  if (/^(failed|undelivered|rejected|error|disconnected|expired|cancelled)$/i.test(status)) return 'danger';
  return 'neutral';
}

function statusLabel(status: string, ar: boolean): string {
  const clean = status.trim();
  const map: Record<string, [string, string]> = {
    approved: ['Approved', 'مقبول'],
    pending: ['Pending', 'قيد المراجعة'],
    rejected: ['Rejected', 'مرفوض'],
    cancelled: ['Cancelled', 'ملغى'],
    completed: ['Completed', 'مكتمل'],
    paid: ['Paid', 'مدفوع'],
    connected: ['Connected', 'متصل'],
    disconnected: ['Disconnected', 'غير متصل'],
    active: ['Active', 'نشط'],
    paused: ['Paused', 'متوقف'],
    failed: ['Failed', 'فشل'],
  };
  const found = map[clean.toLowerCase()];
  if (found) return ar ? found[1] : found[0];
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '—';
}

function requestTypeLabel(type: string, ar: boolean): string {
  const map: Record<string, [string, string]> = {
    wallet_topup: ['Wallet Top-up', 'شحن محفظة'],
    addon: ['Add-on Pack', 'إضافة رصيد'],
    plan: ['Subscription Plan', 'اشتراك باقة'],
    renewal: ['Plan Renewal', 'تجديد باقة'],
  };
  const found = map[type.toLowerCase()];
  return found ? (ar ? found[1] : found[0]) : type;
}

function initialsOf(name: string): string {
  const clean = (name || 'WS').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function formatPrettyDate(iso: string, ar: boolean): { day: string; time: string } | null {
  if (!iso || iso === '—') return null;
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return null;
  const locale = ar ? 'ar-EG' : 'en-US';
  return {
    day: parsed.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
    time: parsed.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
  };
}

export function AdminOperations({ moduleId }: { moduleId: AdminOperationsModuleId }) {
  const { formatPrice } = useCurrency();
  const [reload, setReload] = useState(0);
  const { user, role } = useSelector((s: RootState) => s.auth);
  const { records, tenants, loading, error, sourceErrors = {}, pendingSources = loading ? ['directory'] : [] } = useAdminManagement(resources[moduleId], false, false, reload);
  const [billingRequests, setBillingRequests] = useState<Record<string, any>[]>([]);
  const [trackingSettings, setTrackingSettings] = useState<Record<string, any> | null>(null);
  const incomplete = !!error || Object.keys(sourceErrors).length > 0;
  const availability = (...dependencies: string[]) => sourceAvailability(dependencies, Object.keys(tenants), sourceErrors, pendingSources, error);
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => ar ? arabic : en;

  useEffect(() => {
    if (moduleId !== 'transactions') {
      setBillingRequests([]);
      return;
    }
    const uid = user?.id || primaryAuth.currentUser?.uid || '';
    if (!uid || !primaryAuth.currentUser) {
      setBillingRequests([]);
      return;
    }
    try {
      return onSnapshot(
        collection(primaryDb, 'billingRequests'),
        snapshot => {
          const all = snapshot.docs.map(item => ({ ...item.data(), id: item.id })) as Record<string, any>[];
          const scopedList = role === 'SUPER_ADMIN'
            ? all
            : all.filter(req => req.providerId === uid || req.requesterId === uid);
          setBillingRequests(scopedList);
        },
        () => setBillingRequests([])
      );
    } catch {
      setBillingRequests([]);
    }
  }, [moduleId, user?.id, role, reload]);

  useEffect(() => {
    if (moduleId !== 'integrations') {
      setTrackingSettings(null);
      return;
    }
    if (!primaryAuth.currentUser) {
      setTrackingSettings(null);
      return;
    }
    try {
      return onSnapshot(
        doc(primaryDb, 'settings', 'marketingTracking'),
        snapshot => setTrackingSettings(snapshot.exists() ? snapshot.data() : null),
        () => setTrackingSettings(null)
      );
    } catch {
      setTrackingSettings(null);
    }
  }, [moduleId, reload]);

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
  const tabs = moduleId === 'conversations'
    ? [t('Threads', 'المحادثات'), t('Messages', 'الرسائل'), t('Human handoffs', 'التحويلات'), t('Channel health', 'صحة القنوات')]
    : moduleId === 'analytics'
      ? [t('Operational Events Log', 'سجل الأحداث'), t('Revenue trends', 'اتجاهات الإيرادات'), t('Workspace AI tokens', 'استهلاك الذكاء الاصطناعي')]
      : moduleId === 'integrations'
        ? [t('Connected Integrations', 'التطبيقات المتصلة'), t('Webhook & Sync Events', 'مستقبلات وسجل Webhooks')]
        : moduleId === 'transactions'
          ? [t('All Transactions', 'دفتر المعاملات'), t('Billing & Plan Requests', 'طلبات الباقات والرصيد'), t('Workspace Orders', 'طلبات المتاجر والمنتجات')]
          : [t('Workspace usage', 'استخدام المساحات'), t('Model allocations', 'توزيع النماذج')];
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
  } else if (moduleId === 'integrations') {
    const integrationRecords = scoped('integrations');
    const renderIntegrationCells = (titleText: string, wsName: string, categoryText: string, st: string, endpointText: string, dt: string): ReactNode[] => {
      const pretty = formatPrettyDate(dt, ar);
      return [
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Plug size={14} />
          </span>
          <span>{titleText}</span>
        </div>,
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="adm-avatar" style={{ width: 26, height: 26, fontSize: 9.5, borderRadius: 7 }}>{initialsOf(wsName)}</span>
          <span style={{ fontWeight: 500 }}>{wsName}</span>
        </div>,
        <span className="adm-badge neutral">{categoryText}</span>,
        <span className={`adm-badge ${statusTone(st)}`}><i />{statusLabel(st, ar)}</span>,
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11.5, color: 'var(--adm-muted)' }}>{endpointText}</span>,
        pretty ? (
          <div title={dt} style={{ lineHeight: 1.35 }}>
            <div style={{ fontWeight: 500 }}>{pretty.day}</div>
            <small style={{ color: 'var(--adm-muted)', fontSize: 10.5 }}>{pretty.time}</small>
          </div>
        ) : <span>{dt}</span>,
      ];
    };
    const trackingRows: Row[] = [];
    if (trackingSettings && (trackingSettings.enabled || trackingSettings.webhookUrl || trackingSettings.metaId || trackingSettings.googleId)) {
      const trackingStatus = trackingSettings.enabled ? 'Connected' : 'Paused';
      const titleText = t('Marketing Tracking & Webhook', 'تتبع التسويق وWebhook');
      const wsText = t('Platform', 'المنصة');
      const catText = 'Tracking / Webhook';
      const epText = String(trackingSettings.webhookUrl || [trackingSettings.metaId && `Meta: ${trackingSettings.metaId}`, trackingSettings.googleId && `GA: ${trackingSettings.googleId}`].filter(Boolean).join(' · ') || '—');
      const dtText = dateValue(trackingSettings.updatedAt) || '—';
      trackingRows.push({
        id: 'settings/marketingTracking',
        status: trackingStatus,
        values: [titleText, wsText, catText, trackingStatus, epText, dtText],
        cells: renderIntegrationCells(titleText, wsText, catText, trackingStatus, epText, dtText),
      });
    }
    if (tab === 0) {
      columns = [t('Integration', 'التطبيق'), t('Workspace', 'مساحة العمل'), t('Category / Channel', 'الفئة / القناة'), t('Status', 'الحالة'), t('Account / Endpoint', 'الحساب / الرابط'), t('Last update', 'آخر تحديث')];
      rows = [
        ...trackingRows,
        ...integrationRecords.map(r => {
          const d: Record<string, unknown> = r.data;
          const st = String(d.status ?? (d.enabled === false ? 'Disconnected' : 'Connected'));
          const titleText = String(d.name ?? d.provider ?? d.channel ?? r.id);
          const wsName = workspace(r);
          const catText = String(d.category ?? d.channel ?? d.type ?? 'Integration');
          const epText = String(d.account ?? d.webhookUrl ?? d.url ?? d.endpoint ?? d.email ?? d.problem ?? '—');
          const dtText = dateValue(d.updatedAt ?? d.lastSyncAt ?? d.createdAt) || '—';
          return {
            id: r.path,
            status: st,
            values: [titleText, wsName, catText, st, epText, dtText],
            cells: renderIntegrationCells(titleText, wsName, catText, st, epText, dtText),
          };
        }),
      ];
    } else {
      columns = [t('Event / Listener', 'الحدث / المستقبل'), t('Workspace', 'مساحة العمل'), t('Endpoint / Source', 'نقطة الاتصال / المصدر'), t('Status', 'الحالة'), t('Details', 'التفاصيل'), t('Date', 'التاريخ')];
      const webhookIntegrations: Row[] = integrationRecords
        .filter(r => /webhook/i.test(String(r.id ?? r.data.type ?? r.data.channel ?? '')) || Boolean(r.data.webhookUrl || r.data.url || r.data.endpoint))
        .map(r => {
          const d: Record<string, unknown> = r.data;
          const st = String(d.status ?? 'Active');
          const titleText = String(d.name ?? r.id);
          const wsName = workspace(r);
          const epText = String(d.webhookUrl ?? d.url ?? d.endpoint ?? '—');
          const detailText = String(d.event ?? d.description ?? 'Webhook listener');
          const dtText = dateValue(d.updatedAt ?? d.createdAt) || '—';
          return {
            id: `${r.path}#webhook`,
            status: st,
            values: [titleText, wsName, epText, st, detailText, dtText],
            cells: renderIntegrationCells(titleText, wsName, epText, st, detailText, dtText),
          };
        });
      const eventRows: Row[] = [...scoped('events'), ...scoped('auditLogs')]
        .sort((a, b) => dateValue(b.data.createdAt ?? b.data.at).localeCompare(dateValue(a.data.createdAt ?? a.data.at)))
        .map(r => {
          const d: Record<string, unknown> = r.data;
          const st = String(d.status ?? 'Completed');
          const titleText = String(d.type ?? d.event ?? d.name ?? r.id);
          const wsName = workspace(r);
          const srcText = String(d.channel ?? d.source ?? d.actorId ?? 'System');
          const detailText = String(d.description ?? d.text ?? d.reason ?? '—');
          const dtText = dateValue(d.createdAt ?? d.updatedAt ?? d.at) || '—';
          return {
            id: r.path,
            status: st,
            values: [titleText, wsName, srcText, st, detailText, dtText],
            cells: renderIntegrationCells(titleText, wsName, srcText, st, detailText, dtText),
          };
        });
      rows = [...(trackingSettings?.webhookUrl ? trackingRows : []), ...webhookIntegrations, ...eventRows];
    }
  } else if (moduleId === 'transactions') {
    columns = [t('Reference', 'المرجع'), t('Workspace / Account', 'مساحة العمل / الحساب'), t('Amount', 'المبلغ'), t('Method / Type', 'طريقة الدفع / النوع'), t('Status', 'الحالة'), t('Date', 'التاريخ')];
    const renderTxnCells = (refText: string, subId: string, accountText: string, curr: string, amt: number, methodText: string, typeText: string, st: string, dt: string): ReactNode[] => {
      const pretty = formatPrettyDate(dt, ar);
      return [
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Receipt size={14} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--adm-text)' }}>{refText}</div>
            {subId && <small style={{ fontSize: 10.5, color: 'var(--adm-muted)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>#{subId.slice(0, 10)}</small>}
          </div>
        </div>,
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="adm-avatar" style={{ width: 26, height: 26, fontSize: 9.5, borderRadius: 7 }}>{initialsOf(accountText)}</span>
          <span style={{ fontWeight: 500 }}>{accountText}</span>
        </div>,
        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 12.5, color: 'var(--adm-text)' }}>
          {formatPrice(amt, curr)}
        </span>,
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500 }}>{methodText}</span>
          {typeText && <span className="adm-badge neutral" style={{ fontSize: 9.5, padding: '2px 6px' }}>{requestTypeLabel(typeText, ar)}</span>}
        </div>,
        <span className={`adm-badge ${statusTone(st)}`}><i />{statusLabel(st, ar)}</span>,
        pretty ? (
          <div title={dt} style={{ lineHeight: 1.35 }}>
            <div style={{ fontWeight: 500 }}>{pretty.day}</div>
            <small style={{ color: 'var(--adm-muted)', fontSize: 10.5 }}>{pretty.time}</small>
          </div>
        ) : <span>{dt}</span>,
      ];
    };
    const mapWorkspaceTxn = (r: LiveRecord, fallbackType: string): Row & { sortDate: string } => {
      const d: Record<string, unknown> = r.data;
      const st = String(d.status ?? 'Completed');
      const curr = String(d.currency ?? (d.config as Record<string, unknown> | undefined)?.currency ?? 'USD');
      const amt = numberValue(d.amount ?? d.total ?? d.price ?? (d.config as Record<string, unknown> | undefined)?.amount);
      const dt = dateValue(d.createdAt ?? d.date ?? d.at ?? d.updatedAt);
      const refText = String(d.reference ?? d.transactionId ?? d.orderNumber ?? d.productName ?? d.name ?? r.id);
      const wsName = workspace(r);
      const methodText = String(d.paymentMethod ?? d.method ?? d.gateway ?? fallbackType);
      const typeText = String(d.type ?? fallbackType);
      return {
        id: r.path,
        status: st,
        sortDate: dt,
        values: [refText, wsName, `${curr} ${amt.toLocaleString()}`, `${methodText} · ${typeText}`, st, dt || '—'],
        cells: renderTxnCells(refText, r.id, wsName, curr, amt, methodText, typeText, st, dt || '—'),
      };
    };
    const mapBillingReq = (req: Record<string, any>): Row & { sortDate: string } => {
      const st = String(req.status ?? 'pending');
      const curr = String(req.currency ?? req.plan?.currency ?? 'USD');
      const amt = numberValue(req.totalAmount ?? req.total ?? req.plan?.price);
      const dt = dateValue(req.createdAt ?? req.decidedAt ?? req.updatedAt);
      const planName = typeof req.plan?.name === 'object' ? (req.plan.name[ar ? 'ar' : 'en'] || req.plan.name.en) : req.plan?.name;
      const refText = String(planName || req.transactionId || req.planId || req.id);
      const accountText = String(req.requesterName || req.requesterEmail || req.requesterId || '—');
      const methodText = String(req.paymentMethod || req.paymentType || 'manual');
      const typeText = String(req.type || 'plan');
      return {
        id: `billingRequests/${req.id}`,
        status: st,
        sortDate: dt,
        values: [refText, accountText, `${curr} ${amt.toLocaleString()}`, `${methodText} · ${typeText}`, st, dt || '—'],
        cells: renderTxnCells(refText, String(req.transactionId || req.id), accountText, curr, amt, methodText, typeText, st, dt || '—'),
      };
    };
    const workspaceTxnRows = scoped('transactions').map(r => mapWorkspaceTxn(r, 'Transaction'));
    const workspaceOrderRows = scoped('orders').map(r => mapWorkspaceTxn(r, 'Order'));
    const billingReqRows = billingRequests.map(mapBillingReq);
    const combined = tab === 1
      ? billingReqRows
      : tab === 2
        ? [...workspaceTxnRows, ...workspaceOrderRows]
        : [...workspaceTxnRows, ...billingReqRows, ...workspaceOrderRows];
    rows = combined.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
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
  const title = moduleId === 'conversations'
    ? t('Conversations', 'المحادثات')
    : moduleId === 'integrations'
      ? t('Integrations & Webhooks', 'التكاملات وWebhooks')
      : moduleId === 'transactions'
        ? t('Transactions', 'المعاملات')
        : t('Analytics', 'التحليلات');
  const connectedIntegrationsCount = scoped('integrations').filter(r => /^(connected|active|healthy|operational)$/i.test(String(r.data.status ?? (r.data.enabled === false ? 'Disconnected' : 'Connected')))).length + (trackingSettings?.enabled ? 1 : 0);
  const allTransactionsCount = scoped('transactions').length + scoped('orders').length + billingRequests.length;
  const completedTransactionsCount = scoped('transactions').filter(r => /^(completed|paid|succeeded|confirmed|approved)$/i.test(String(r.data.status))).length
    + scoped('orders').filter(r => /^(completed|paid|succeeded|confirmed|approved)$/i.test(String(r.data.status))).length
    + billingRequests.filter(r => /^(approved|completed|paid)$/i.test(String(r.status))).length;
  const pendingTransactionsCount = scoped('transactions').filter(r => /^pending$/i.test(String(r.data.status))).length
    + scoped('orders').filter(r => /^pending$/i.test(String(r.data.status))).length
    + billingRequests.filter(r => /^pending$/i.test(String(r.status))).length;

  const transactionRevenueEntries = (() => {
    if (moduleId !== 'transactions') return stats.revenue;
    const totals = new Map<string, number>(stats.revenue);
    for (const req of billingRequests) {
      if (/^(approved|completed|paid)$/i.test(String(req.status))) {
        const curr = String(req.currency ?? req.plan?.currency ?? 'USD');
        const amt = numberValue(req.totalAmount ?? req.total ?? req.plan?.price);
        if (amt > 0) totals.set(curr, Math.round(((totals.get(curr) ?? 0) + amt) * 100) / 100);
      }
    }
    return [...totals.entries()];
  })();

  const metrics: [string, string | number, typeof Activity][] = moduleId === 'conversations'
    ? [['Threads', scoped('conversations').length, MessagesSquare], ['Messages', scoped('messages').length, Activity], ['Human handoffs', scoped('handoffLogs').length, Users], ['Connected channels', channelIntegrations.filter(r => /^connected$/i.test(String(r.data.status))).length, Plug]]
    : moduleId === 'integrations'
      ? [[t('Connected integrations', 'التكاملات المتصلة'), connectedIntegrationsCount, CheckCircle2], [t('Total integrations', 'إجمالي التكاملات'), scoped('integrations').length + (trackingSettings ? 1 : 0), Plug], [t('Webhook & sync events', 'أحداث المزامنة وWebhooks'), scoped('events').length + scoped('auditLogs').length, Webhook], [t('Workspaces', 'مساحات العمل'), Object.keys(tenants).length, Building2]]
      : moduleId === 'transactions'
        ? [[t('Total transactions', 'إجمالي المعاملات'), allTransactionsCount, Receipt], [t('Completed / Approved', 'مكتملة / مقبولة'), completedTransactionsCount, CheckCircle2], [t('Pending review', 'قيد الانتظار'), pendingTransactionsCount, Clock], [t('Billing requests', 'طلبات الباقات والرصيد'), billingRequests.length, Layers]]
        : [['Leads', stats.leads, Users], ['Lead conversion (Won / all leads)', stats.conversion === null ? '—' : `${stats.conversion.toFixed(1)}%`, TrendingUp], ['AI tokens', stats.tokens, Sparkles], ['Workspaces', Object.keys(tenants).length, Building2]];
  const metricSources = moduleId === 'conversations'
    ? [['conversations'], ['messages'], ['handoffLogs'], ['integrations', 'conversations']]
    : moduleId === 'integrations'
      ? [['integrations'], ['integrations'], ['events', 'auditLogs'], []]
      : moduleId === 'transactions'
        ? [['transactions', 'orders'], ['transactions', 'orders'], ['transactions', 'orders'], []]
        : [['leads'], ['leads'], ['aiUsage'], []];
  const tableSources = moduleId === 'conversations'
    ? [['conversations'], ['messages'], ['handoffLogs'], ['integrations', 'messages']][tab]
    : moduleId === 'integrations'
      ? [['integrations'], ['integrations', 'events', 'auditLogs']][tab]
      : moduleId === 'transactions'
        ? [['transactions', 'orders'], [], ['transactions', 'orders']][tab]
        : moduleId === 'analytics'
          ? [['auditLogs', 'events'], ['transactions'], ['aiUsage']][tab]
          : ['aiUsage', 'modelAllocations'];
  const tableState = availability(...tableSources);
  const revenueState = availability('transactions');

  const exportCurrentRows = () => {
    const csvRows: RecordRow[] = visible.map(r => {
      const obj: RecordRow = { id: r.id, name: r.values[0] ?? '', tenant: r.values[1] ?? '', status: r.status };
      columns.forEach((col, idx) => { obj[col] = r.values[idx] ?? ''; });
      return obj;
    });
    downloadCSV(csvRows, `${moduleId}-${tab}.csv`);
  };

  const syncTooltip = t('Using cached offline data — sync in progress with Firebase', 'يتم استخدام البيانات المخزنة مؤقتاً — جاري المزامنة الحية مع Firebase');

  return <div className="adm-workspace"><div className="adm-page-head"><div><div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><span className="adm-eyebrow">{t('LIVE PLATFORM OPERATIONS', 'عمليات المنصة الحية')}</span>{loading && <span className="saw-live-sync-chip" role="status" aria-live="polite" title={syncTooltip}><span className="saw-live-sync-dot" aria-hidden="true"/><span className="saw-live-sync-text">{t('Syncing with cloud…', 'جاري المزامنة…')}</span><span className="saw-live-sync-tooltip" role="tooltip">{syncTooltip}</span></span>}</div><h1>{title}</h1><p>{t('Live workspace records · All recorded time', 'بيانات حية · جميع الفترات')}</p></div><div className="adm-actions"><button type="button" onClick={() => setReload(n => n + 1)} disabled={loading}><RefreshCw size={14} className={loading ? 'adm-spin' : ''}/>{t('Refresh', 'تحديث')}</button><button type="button" onClick={exportCurrentRows} disabled={!visible.length}><Download size={14}/>{t('Export CSV', 'تصدير CSV')}</button></div></div>
    {error && <p role="alert">{error}</p>}
    {incomplete && <section className="adm-notice" role="status"><div><p>{t('Some sources are unavailable. Other metrics remain live. Partial values include only accessible records.', 'بعض المصادر غير متاحة. تبقى المقاييس الأخرى حية، وتشمل القيم الجزئية السجلات المتاحة فقط.')}</p>{Object.keys(sourceErrors).length > 0 && <details><summary>{t('Unavailable sources', 'المصادر غير المتاحة')}</summary><ul>{Object.entries(sourceErrors).map(([source, message]) => <li key={source}>{source}: {message}</li>)}</ul></details>}<button onClick={() => setReload(n => n + 1)}>{t('Try again', 'إعادة المحاولة')}</button></div></section>}
    <div className="adm-metrics">{metrics.map(([label, value, Icon], index) => { const state = availability(...metricSources[index]); return <div className="adm-metric" key={label} data-source-state={state}><div><span>{label}</span><i><Icon size={17}/></i></div><strong>{state === 'loading' ? <span className="inline-block h-6 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" /> : state === 'unavailable' ? t('Unavailable', 'غير متاح') : value}</strong>{state === 'partial' && <small>{t('Partial · accessible records only', 'جزئي · السجلات المتاحة فقط')}</small>}</div>; })}</div>
    {(moduleId === 'analytics' || moduleId === 'transactions') && <section className="adm-panel" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--adm-success-bg)', color: 'var(--adm-success)', display: 'grid', placeItems: 'center', flex: 'none' }}><CreditCard size={18}/></span><div><h2 style={{ fontSize: 14, fontWeight: 650 }}>Recorded revenue</h2><small style={{ color: 'var(--adm-muted)', fontSize: 11 }}>{t('Approved & completed payments grouped by currency', 'المدفوعات المكتملة والمقبولة مصنفة حسب العملة')}</small></div></div><div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{revenueState === 'loading' && !transactionRevenueEntries.length ? <span className="inline-block h-6 w-28 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" /> : revenueState === 'unavailable' && !transactionRevenueEntries.length ? <p>{t('Revenue records are unavailable.', 'سجلات الإيرادات غير متاحة.')}</p> : <>{revenueState === 'partial' && <small style={{ color: 'var(--adm-muted)' }}>{t('Partial revenue · accessible workspaces only', 'إيرادات جزئية · مساحات العمل المتاحة فقط')}</small>}{transactionRevenueEntries.length ? transactionRevenueEntries.map(([c, v]) => <p key={c} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--adm-soft)', border: '1px solid var(--adm-border)', fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{`${c}: ${formatPrice(v, c)}`}</p>) : <p style={{ color: 'var(--adm-muted)', fontSize: 12 }}>{t('No completed transactions recorded.', 'لا توجد معاملات مكتملة مسجلة.')}</p>}</>}</div></section>}
    <div className="adm-tabs" role="tablist" aria-label={title}>{tabs.map((label, i) => <button key={label} role="tab" aria-selected={tab === i} className={tab === i ? 'active' : ''} onClick={() => setParams({ tab: String(i) })}>{label}</button>)}</div>
    <section className="adm-panel"><div className="adm-panel-heading"><div><h2>{tabs[tab]}</h2><p>{t('Real-time synchronized records from Firebase Firestore.', 'سجلات حية متزامنة مباشرة من قاعدة بيانات Firebase.')}</p></div><span className="adm-badge neutral">{visible.length} {t('records', 'سجل')}</span></div><div className="adm-filters"><label className="adm-search"><Search size={15}/><input aria-label="Search records" placeholder={t('Search records…', 'ابحث في السجلات…')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label><select aria-label="Status filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">{t('All statuses', 'كل الحالات')}</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
      {tableState === 'partial' && <p role="status">{t('Showing accessible records; some workspace sources are unavailable.', 'تظهر السجلات المتاحة؛ بعض مصادر مساحات العمل غير متاحة.')}</p>}
      <div className="adm-table-wrap"><table><thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{tableState === 'loading' && !visible.length ? Array.from({ length: 5 }, (_, rIdx) => <tr key={rIdx} className="animate-pulse">{columns.map((c, cIdx) => <td key={`${c}-${cIdx}`}><span style={{ display: 'block', height: 14, width: cIdx === 0 ? '70%' : '50%', borderRadius: 6, background: 'var(--adm-border)' }}/></td>)}</tr>) : visible.slice((current - 1) * 15, current * 15).map(r => <tr key={r.id}>{(r.cells ?? r.values).map((v, i) => <td key={i} style={{ maxWidth: 360, overflowWrap: 'anywhere', whiteSpace: 'normal', verticalAlign: 'middle' }}>{v}</td>)}</tr>)}</tbody></table></div>{!visible.length && tableState !== 'loading' && <div className="adm-empty">{tableState === 'unavailable' || tableState === 'partial' ? t('No accessible records in this view. Retry or check workspace permissions.', 'لا توجد سجلات متاحة في هذا العرض. أعد المحاولة أو راجع صلاحيات مساحة العمل.') : t('No matching records.', 'لا توجد سجلات مطابقة.')}</div>}
      <div className="adm-pagination"><span>{current} / {pages}</span><div><button disabled={current <= 1} onClick={() => setPage(current - 1)}>{t('Previous', 'السابق')}</button><button disabled={current >= pages} onClick={() => setPage(current + 1)}>{t('Next', 'التالي')}</button></div></div>
    </section>
  </div>;
}
