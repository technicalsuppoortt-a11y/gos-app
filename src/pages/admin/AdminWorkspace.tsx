import { AdminGeneral } from './AdminGeneral';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Download, Pencil, X, Check, ArrowUpRight, ChevronLeft, ChevronRight,
  Activity, Building2, CreditCard, Bot, Trash2, RefreshCw, ShieldCheck, Users,
  TrendingUp, Globe, Plug, Database, Receipt, Grid2X2, Rocket, BarChart3
} from 'lucide-react';
import { useUILanguage } from '../../i18n/display';
import { modules, labels, templateHubTabs, type RecordRow, type Field } from './catalog';
import { readRows, saveRows, downloadCSV } from './repository';
import { AdminSelect } from './AdminSelect';
import { LandingEditor } from './LandingEditor';
import { useOnboarding } from '../onboarding/onboarding-store';
import { PaymentMethodsPanel } from '../settings/PaymentMethodsPanel';
import { AdminPlansPage } from '../billing/PlansPages';

export function AdminWorkspace() {
  const location = useLocation();
  const id = location.pathname.replace(/\/$/, '').split('/').at(-1) ?? 'dashboard';
  const [params] = useSearchParams();
  const module = modules.find(m => m.id === (id === 'funnels' ? 'funnels-websites' : id)) ?? modules[0];
  if (id === 'settings') return <AdminGeneral/>;
  if (id === 'payments-gateways') return <PaymentMethodsPanel/>;
  if (id === 'plans') return <AdminPlansPage/>;
  if (module.id === 'funnels-websites' && ['1', 'templates'].includes(params.get('tab') ?? '')) {
    return <Navigate to="/admin/templates" replace />;
  }
  return <Workspace key={`${module.id}-${params.get('tab') ?? '0'}`} module={module} />;
}

function Workspace({ module }: { module: typeof modules[number] }) {
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const display = (value: string) => ar ? labels[value] ?? value : value;
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('tab') ?? 0);
  const index = Number.isInteger(requested) && requested >= 0 && requested < module.tabs.length ? requested : 0;
  const section = module.tabs[index];
  const [rows, setRows] = useState(() => readRows(module.id, index));
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<RecordRow | null>(null);
  const [deleting, setDeleting] = useState<RecordRow | null>(null);
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const readOnly = module.id === 'booking';

  const persist = (next: RecordRow[]) => {
    if (readOnly) return false;
    if (saveRows(module.id, index, next)) {
      setRows(next);
      setNotice(t('Changes saved to this browser.', 'تم حفظ التغييرات في هذا المتصفح.'));
      return true;
    }
    setNotice(t('Storage is unavailable. Your changes were not saved.', 'التخزين غير متاح. لم تحفظ التغييرات.'));
    return false;
  };

  const scopedRows = module.id === 'templates'
    ? rows.filter(row => templateHubTabs[index].categories.includes(row.category))
    : rows;

  const visible = scopedRows.filter(row =>
    Object.values(row).some(v => `${v} ${display(v)}`.toLowerCase().includes(search.toLowerCase())) &&
    Object.entries(filters).every(([key, value]) => !value || row[key] === value) &&
    (!minimum || Number(row.amount) >= Number(minimum)) &&
    (!maximum || Number(row.amount) <= Number(maximum))
  );

  const compact = ['booking', 'templates', 'funnels-websites', 'crm', 'dashboard', 'analytics'].includes(module.id);
  const tableRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    if (!compact || !tableRef.current) return;
    const element = tableRef.current;
    const observer = new ResizeObserver(() => setPageSize(Math.max(1, Math.min(5, Math.floor((element.clientHeight - 34) / 40)))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [compact]);

  const filteredFields = section?.fields.filter(f => f.options && (module.id !== 'templates' || f.key !== 'category' || index === 9)) ?? [];
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages);

  useEffect(() => {
    if (params.has('tab')) {
      const selected = document.getElementById(`adm-tab-${index}`);
      selected?.focus();
      selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [index, params]);

  const newRow = () => {
    if (readOnly) return;
    const row: RecordRow = { id: crypto.randomUUID(), name: '', tenant: 'Platform', status: section?.fields.find(f => f.key === 'status')?.options?.[0] ?? 'Active' };
    section?.fields.forEach(f => {
      if (f.key !== 'status') row[f.key] = f.options?.[0] ?? '';
    });
    setEditor(row);
  };

  const total = scopedRows.reduce((sum, r) => sum + Number(r.amount ?? r.monthly ?? 0), 0);

  return (
    <div className="adm-workspace" data-module={module.id} data-compact={compact || undefined}>
      <div className="adm-page-head">
        <div>
          <span className="adm-eyebrow">{t('PLATFORM OPERATIONS', 'عمليات المنصة')}</span>
          <h1>{module.title[ar ? 1 : 0]}</h1>
          <p>{module.description[ar ? 1 : 0]}</p>
        </div>
        {section && (
          <div className="adm-actions">
            <button onClick={() => downloadCSV(visible, `${module.id}.csv`)}>
              <Download size={15} />
              {t('Export', 'تصدير')}
            </button>
            {!readOnly && (
              <button className="adm-primary" onClick={newRow}>
                <Plus size={16} />
                {t('Add record', 'إضافة سجل')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="adm-demo">
        <Activity size={14} />
        {readOnly
          ? t('Read-only · Monitor appointments across all workspaces.', 'للقراءة فقط · راقب المواعيد عبر جميع مساحات العمل.')
          : t('Demo workspace · Management changes are stored in this browser.', 'مساحة تجريبية · تحفظ تغييرات الإدارة في هذا المتصفح.')}
      </div>

      {notice && (
        <div className="adm-notice" role="status">
          <Check size={15} />
          {notice}
          <button aria-label={t('Dismiss', 'إغلاق')} onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {module.id === 'landing' ? (
        <LandingEditor />
      ) : module.id === 'dashboard' ? (
        <DashboardOverview />
      ) : module.id === 'analytics' ? (
        <AnalyticsOverview />
      ) : (
        <>
          <div className="adm-metrics">
            <Metric label={t('Total records', 'إجمالي السجلات')} value={scopedRows.length.toLocaleString(ar ? 'ar-EG' : 'en-US')} icon={<Building2 size={19} />} />
            <Metric label={t('Healthy / complete', 'نشطة أو مكتملة')} value={String(scopedRows.filter(r => ['Active', 'Completed', 'Published', 'Connected', 'Verified', 'Confirmed', 'Won', 'Resolved'].includes(r.status)).length)} icon={<Check size={19} />} />
            <Metric label={t('Needs attention', 'تحتاج متابعة')} value={String(rows.filter(r => ['Failed', 'Pending', 'Blocked', 'Expired', 'Disconnected'].includes(r.status)).length)} icon={<Activity size={19} />} />
            <Metric
              label={total ? t('Value (USD)', 'القيمة (دولار)') : t('Workspaces', 'مساحات العمل')}
              value={total ? new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(total) : String(new Set(scopedRows.map(r => r.tenant)).size)}
              icon={<CreditCard size={19} />}
            />
          </div>

          <div className="adm-tabs" role="tablist" aria-label={module.title[ar ? 1 : 0]} aria-orientation="horizontal">
            {module.tabs.map((tab, n) => (
              <button
                key={n}
                role="tab"
                id={`adm-tab-${n}`}
                aria-selected={n === index}
                aria-controls="adm-panel"
                tabIndex={n === index ? 0 : -1}
                className={n === index ? 'active' : ''}
                onKeyDown={e => {
                  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                    e.preventDefault();
                    const next = e.key === 'Home' ? 0 : e.key === 'End' ? module.tabs.length - 1 : (index + ((e.key === 'ArrowRight') !== ar ? 1 : -1) + module.tabs.length) % module.tabs.length;
                    setParams({ tab: String(next) });
                    requestAnimationFrame(() => document.getElementById(`adm-tab-${next}`)?.focus());
                  }
                }}
                onClick={() => setParams({ tab: String(n) })}
              >
                {tab.label[ar ? 1 : 0]}
              </button>
            ))}
          </div>

          <section className="adm-panel" id="adm-panel" role="tabpanel" aria-labelledby={`adm-tab-${index}`}>
            <div className="adm-panel-heading">
              <div>
                <h2>{section?.label[ar ? 1 : 0]}</h2>
                <p>{readOnly ? t('Monitor and filter records. Editing is disabled.', 'راقب السجلات وصنفها. التعديل غير متاح.') : t('Review, filter and manage your records.', 'راجع السجلات وصنفها وأدرها.')}</p>
              </div>
              <span className="adm-badge neutral">{visible.length} {t('records', 'سجل')}</span>
            </div>

            <div className="adm-filters">
              <label className="adm-search">
                <Search size={16} />
                <input
                  aria-label={t('Search records', 'بحث في السجلات')}
                  placeholder={t('Search records…', 'ابحث في السجلات…')}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && (
                  <button className="adm-search-clear" aria-label={t('Clear search', 'مسح البحث')} onClick={() => { setSearch(''); setPage(1); }}>
                    <X size={13} />
                  </button>
                )}
              </label>
              {filteredFields.map(field => (
                <label key={field.key}>
                  <span className="adm-sr">{field.label[ar ? 1 : 0]}</span>
                  <AdminSelect
                    label={field.label[ar ? 1 : 0]}
                    filter
                    value={filters[field.key] ?? ''}
                    onChange={value => { setFilters({ ...filters, [field.key]: value }); setPage(1); }}
                    options={[{ value: '', label: `${t('All', 'كل')} ${field.label[ar ? 1 : 0]}` }, ...(field.options ?? []).map(option => ({ value: option, label: display(option) }))]}
                  />
                </label>
              ))}
              {module.id === 'transactions' && (
                <>
                  <input
                    type="number"
                    min="0"
                    aria-label={t('Minimum amount', 'الحد الأدنى للمبلغ')}
                    placeholder={t('Min amount', 'أقل مبلغ')}
                    value={minimum}
                    onChange={e => { setMinimum(e.target.value); setPage(1); }}
                  />
                  <input
                    type="number"
                    min="0"
                    aria-label={t('Maximum amount', 'الحد الأقصى للمبلغ')}
                    placeholder={t('Max amount', 'أكبر مبلغ')}
                    value={maximum}
                    onChange={e => { setMaximum(e.target.value); setPage(1); }}
                  />
                </>
              )}
              <button title={t('Reset filters', 'إعادة ضبط الفلاتر')} onClick={() => { setFilters({}); setSearch(''); setMinimum(''); setMaximum(''); setPage(1); }}>
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="adm-table-wrap" ref={tableRef}>
              <table>
                <thead>
                  <tr>
                    <th>{t('Name / reference', 'الاسم / المرجع')}</th>
                    {section?.fields.map(field => (
                      <th key={field.key}>{field.label[ar ? 1 : 0]}</th>
                    ))}
                    {!readOnly && <th>{t('Actions', 'الإجراءات')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.slice((current - 1) * pageSize, current * pageSize).map(row => (
                    <tr key={row.id}>
                      <td>
                        {readOnly ? (
                          <span className="adm-record-name adm-readonly-name">
                            <span className="adm-avatar">{row.name.slice(0, 2).toUpperCase()}</span>
                            <b>{display(row.name)}</b>
                          </span>
                        ) : (
                          <button className="adm-record-name" onClick={() => setEditor({ ...row })}>
                            <span className="adm-avatar">{row.name.slice(0, 2).toUpperCase()}</span>
                            <b>{display(row.name)}</b>
                          </button>
                        )}
                      </td>
                      {section?.fields.map(field => (
                        <td key={field.key}>
                          {field.key === 'status' ? (
                            <Badge value={row.status} label={display(row.status)} />
                          ) : field.key === 'progress' ? (
                            <div className="adm-progress">
                              <span>{row.progress}%</span>
                              <progress max="100" value={Number(row.progress)} />
                            </div>
                          ) : (
                            <span className={['url', 'email', 'keyRef', 'domain', 'record', 'date'].includes(field.key) ? 'adm-ltr' : ''}>
                              {display(row[field.key] ?? '—')}
                            </span>
                          )}
                        </td>
                      ))}
                      {!readOnly && (
                        <td>
                          <div className="adm-row-actions">
                            <button aria-label={`${t('Edit', 'تعديل')} ${row.name}`} onClick={() => setEditor({ ...row })}>
                              <Pencil size={15} />
                            </button>
                            {module.id === 'transactions' && row.status === 'Completed' && (
                              <button onClick={() => setEditor({ ...row, status: 'Refunded' })}>{t('Refund', 'استرداد')}</button>
                            )}
                            {module.id === 'templates' && (
                              <button onClick={() => persist(rows.map(r => r.id === row.id ? { ...r, status: r.status === 'Draft' ? 'Published' : 'Draft' } : r))}>
                                {row.status === 'Draft' ? t('Publish', 'نشر') : t('Unpublish', 'إلغاء النشر')}
                              </button>
                            )}
                            {module.id === 'domains' && (
                              <button onClick={() => setNotice(t(`Mock DNS check: ${row.record}. Verification state: ${row.status}.`, `فحص DNS تجريبي: ${row.record}. حالة التحقق: ${display(row.status)}.`))}>
                                {t('Check DNS', 'فحص DNS')}
                              </button>
                            )}
                            {module.id === 'integrations' && (
                              <button onClick={() => setNotice(t('Mock health check completed. No request was sent to the external service.', 'اكتمل فحص الصحة التجريبي. لم يرسل طلب للخدمة الخارجية.'))}>
                                {t('Test', 'اختبار')}
                              </button>
                            )}
                            <button aria-label={`${t('Delete', 'حذف')} ${row.name}`} onClick={() => setDeleting(row)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!visible.length && (
              <div className="adm-empty">
                <Search size={26} />
                <h3>{t('No matching records', 'لا توجد سجلات مطابقة')}</h3>
                <p>{t('Try a different search or reset the filters.', 'جرب بحثاً آخر أو أعد ضبط الفلاتر.')}</p>
              </div>
            )}

            <div className="adm-pagination">
              <span>{t('Page', 'صفحة')} {current} / {pages}</span>
              <div>
                <button disabled={current <= 1} onClick={() => setPage(current - 1)}>{t('Previous', 'السابق')}</button>
                <button disabled={current >= pages} onClick={() => setPage(current + 1)}>{t('Next', 'التالي')}</button>
              </div>
            </div>
          </section>
        </>
      )}

      {!readOnly && editor && (
        <Dialog title={t('Record details', 'تفاصيل السجل')} close={() => setEditor(null)}>
          <form className="adm-form" onSubmit={e => {
            e.preventDefault();
            const existing = rows.some(r => r.id === editor.id);
            if (persist(existing ? rows.map(r => r.id === editor.id ? editor : r) : [editor, ...rows])) setEditor(null);
          }}>
            <label>
              {t('Name / reference', 'الاسم / المرجع')}
              <input required maxLength={180} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} />
            </label>
            {section?.fields.filter(field => module.id !== 'templates' || field.key !== 'category' || index === 9).map(field => (
              <FieldControl key={field.key} field={field} ar={ar} value={editor[field.key] ?? ''} onChange={value => setEditor({ ...editor, [field.key]: value })} />
            ))}
            <div className="adm-form-foot">
              <button type="button" onClick={() => setEditor(null)}>{t('Cancel', 'إلغاء')}</button>
              <button className="adm-primary" type="submit">
                <Check size={15} />
                {t('Save changes', 'حفظ التغييرات')}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {!readOnly && deleting && (
        <Dialog title={t('Delete record?', 'حذف السجل؟')} close={() => setDeleting(null)}>
          <p>{t('This removes the record from the demo workspace.', 'سيتم حذف السجل من المساحة التجريبية.')} <b>{deleting.name}</b></p>
          <div className="adm-form-foot">
            <button onClick={() => setDeleting(null)}>{t('Cancel', 'إلغاء')}</button>
            <button className="adm-danger" onClick={() => {
              if (persist(rows.filter(r => r.id !== deleting.id))) setDeleting(null);
            }}>
              {t('Delete record', 'حذف السجل')}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function FieldControl({ field, ar, value, onChange }: { field: Field; ar: boolean; value: string; onChange: (value: string) => void }) {
  if (field.key === 'features') {
    const enabled = value.split(',').map(v => v.trim());
    return (
      <fieldset className="adm-feature-flags">
        <legend>{field.label[ar ? 1 : 0]}</legend>
        {[
          ['CRM', 'علاقات العملاء'],
          ['Booking', 'الحجوزات'],
          ['AI', 'الذكاء الاصطناعي'],
          ['White label', 'علامة تجارية مخصصة']
        ].map(([en, arabic]) => (
          <label key={en}>
            <input
              type="checkbox"
              checked={enabled.includes(en)}
              onChange={e => onChange((e.target.checked ? [...enabled, en] : enabled.filter(v => v !== en)).join(', '))}
            />
            {ar ? arabic : en}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <label>
      {field.label[ar ? 1 : 0]}
      {field.options ? (
        <AdminSelect label={field.label[ar ? 1 : 0]} value={value} onChange={onChange} options={field.options.map(v => ({ value: v, label: ar ? labels[v] ?? v : v }))} />
      ) : ['content', 'features', 'message', 'value'].includes(field.key) ? (
        <textarea aria-label={field.label[ar ? 1 : 0]} required value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <input
          required
          type={field.type ?? 'text'}
          min={field.type === 'number' ? 0 : undefined}
          max={['progress', 'probability'].includes(field.key) ? 100 : undefined}
          step={field.type === 'number' ? 'any' : undefined}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  const ar = useUILanguage().startsWith('ar');

  useEffect(() => { closeRef.current = close; }, [close]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,a[href]') ?? []);
        const first = controls[0], last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);

  return (
    <div className="adm-dialog-scrim" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div ref={ref} className="adm-dialog" role="dialog" aria-modal="true" aria-labelledby="adm-dialog-title">
        <header>
          <div>
            <span className="adm-eyebrow">{ar ? 'إدارة Upclick' : 'Upclick ADMIN'}</span>
            <h2 id="adm-dialog-title">{title}</h2>
          </div>
          <button onClick={close} aria-label={ar ? 'إغلاق' : 'Close'}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function Badge({ value, label }: { value: string; label: string }) {
  return (
    <span className={`adm-badge ${['Failed', 'Blocked', 'Expired', 'Disconnected', 'Lost'].includes(value) ? 'danger' : ['Pending', 'Draft', 'In progress', 'Provisioning'].includes(value) ? 'warning' : ['Refunded', 'Cancelled', 'Archived', 'Paused'].includes(value) ? 'neutral' : 'success'}`}>
      <i />
      {label}
    </span>
  );
}

function Metric({ label, value, icon, detail }: { label: string; value: string; icon: ReactNode; detail?: string }) {
  return (
    <article className="adm-metric">
      <div>
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <strong>{value}</strong>
      <small>{detail ?? '—'}</small>
    </article>
  );
}

function DashboardOverview() {
  const onboarding = useOnboarding();
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState(() => new Date().toLocaleTimeString(ar ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }));

  const transactions = readRows('transactions', 0);
  const subscriptions = readRows('plans', 1);
  const totalRevenue = transactions.filter(r => r.status === 'Completed').reduce((n, r) => n + Number(r.amount), 0);
  const activeTenants = subscriptions.filter(r => r.status === 'Active').length;
  const activeUsers = onboarding.invites.filter(u => u.status === 'Active').length;
  const money = new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const refreshStatus = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastCheck(new Date().toLocaleTimeString(ar ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }));
      setRefreshing(false);
    }, 400);
  };

  const healthItems = [
    { id: 'stripe', name: t('Stripe Payment Gateway', 'بوابة دفع سترايب'), type: t('Payment Gateway', 'بوابة دفع'), status: 'Connected', ping: '112ms', env: 'Sandbox' },
    { id: 'paypal', name: t('PayPal Merchant Gateway', 'بوابة تجار باي بال'), type: t('Payment Gateway', 'بوابة دفع'), status: 'Connected', ping: '184ms', env: 'Sandbox' },
    { id: 'postgres', name: t('Database Cluster', 'عنقود قاعدة البيانات'), type: t('Infrastructure', 'بنية تحتية'), status: 'Active', ping: '9ms', env: 'Primary PostgreSQL 16' },
    { id: 'dns', name: t('Edge DNS & SSL Engine', 'محرك النطاقات وSSL'), type: t('Security & CDN', 'الأمان والشبكة'), status: 'Active', ping: '22ms', env: 'Cloudflare Edge' },
    { id: 'ai-gateway', name: t('AI Inference Gateway', 'بوابة استدلال الذكاء'), type: t('AI Provider Router', 'موزع نماذج الذكاء'), status: 'Active', ping: '290ms', env: 'OpenAI / Claude' },
    { id: 'webhooks', name: t('Webhook Event Dispatcher', 'مرسل أحداث Webhook'), type: t('Event Broker', 'وسيط الأحداث'), status: 'Active', ping: '41ms', env: '0 Queued / Live' },
  ];

  const shortcuts = [
    { to: '/admin/tools', icon: Grid2X2, title: t('Platform Tools', 'أدوات المنصة'), desc: t('Feature flags, maintenance & utilities', 'أعلام المزايا والصيانة والأدوات') },
    { to: '/admin/users', icon: Users, title: t('Users Management', 'إدارة المستخدمين'), desc: t('Team accounts, roles & invites', 'حسابات الفريق والأدوار والدعوات') },
    { to: '/admin/onboarding', icon: Rocket, title: t('Onboarding Pipeline', 'مسار التهيئة'), desc: t('Workspace setup & onboarding flow', 'إعداد مساحات العمل وخطوات التهيئة') },
    { to: '/admin/payments-gateways', icon: CreditCard, title: t('Payment Gateways', 'طرق وبوابات الدفع'), desc: t('Stripe, PayPal & merchant payout settings', 'إعدادات سترايب وباي بال والتحويلات') },
    { to: '/admin/domains', icon: Globe, title: t('Domains & SSL', 'النطاقات والشهادات'), desc: t('Custom domains & DNS verification', 'النطاقات المخصصة والتحقق من DNS') },
    { to: '/admin/transactions', icon: Receipt, title: t('Transactions Ledger', 'دفتر المعاملات'), desc: t('Audited revenue records & refund control', 'سجل المدفوعات والتحكم بالاسترداد') },
  ];

  return (
    <>
      <div className="adm-overview-tools">
        <div className="adm-status-strip">
          <span className="adm-status-live-dot" />
          <Badge value="Active" label={t('Operational Control Hub · Real-time', 'مركز التحكم التشغيلي · تحديث مباشر')} />
          <span className="adm-status-time">{t('Updated', 'تم التحديث')}: {lastCheck}</span>
        </div>
        <button className="adm-btn-refresh" onClick={refreshStatus} title={t('Refresh system health', 'تحديث صحة النظام')}>
          <RefreshCw size={13} className={refreshing ? 'adm-spin' : ''} />
          {t('Check Status', 'فحص الحالة')}
        </button>
      </div>

      <div className="adm-metrics">
        <Metric label={t('Active Tenants', 'المستأجرون النشطون')} value={String(activeTenants)} icon={<Building2 size={19} />} detail={t('Across all client workspaces', 'عبر كافة مساحات عمل العملاء')} />
        <Metric label={t('Total Revenue', 'إجمالي الإيرادات')} value={money.format(totalRevenue)} icon={<CreditCard size={19} />} detail={t('Completed ledger volume', 'حجم المدفوعات المكتملة في السجل')} />
        <Metric label={t('Active Users', 'المستخدمون النشطون')} value={String(activeUsers)} icon={<Users size={19} />} detail={t('From Users Management', 'من إدارة المستخدمين')} />
        <Metric label={t('System Status', 'حالة النظام')} value={t('100% Operational', '100% يعمل')} icon={<ShieldCheck size={19} />} detail={t('6 of 6 core services healthy', '6 من 6 خدمات أساسية تعمل')} />
      </div>

      <div className="adm-dashboard-grid">
        <section className="adm-panel adm-dashboard-health">
          <div className="adm-panel-heading">
            <div>
              <h2>{t('System & Gateway Health', 'صحة النظام وبوابات الدفع')}</h2>
              <p>{t('Real-time connection states of payment processors and platform core', 'حالات اتصال بوابات الدفع والخدمات الأساسية في الوقت الفعلي')}</p>
            </div>
            <span className="adm-badge success"><Check size={12} />{t('All Operational', 'تعمل بالكامل')}</span>
          </div>
          <div className="adm-health-list">
            {healthItems.map(item => (
              <div key={item.id} className="adm-health-row">
                <div className="adm-health-row-main">
                  <span className="adm-health-dot" />
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.type} · {item.env}</small>
                  </div>
                </div>
                <div className="adm-health-row-meta">
                  <span className="adm-health-ping">{item.ping}</span>
                  <Badge value={item.status} label={ar ? (labels[item.status] ?? item.status) : item.status} />
                </div>
              </div>
            ))}
          </div>
          <div className="adm-widget-footer">
            <Link className="adm-link" to="/admin/payments-gateways">
              {t('Manage payment gateways', 'إدارة بوابات الدفع')}<ArrowUpRight size={14} />
            </Link>
            <Link className="adm-link" to="/admin/integrations">
              {t('View integrations & webhooks', 'عرض التكاملات وWebhooks')}<ArrowUpRight size={14} />
            </Link>
          </div>
        </section>

        <section className="adm-panel adm-dashboard-shortcuts">
          <div className="adm-panel-heading">
            <div>
              <h2>{t('Operations Shortcuts', 'اختصارات العمليات')}</h2>
              <p>{t('Fast access to critical administrative controls & modules', 'وصول سريع لأدوات الإدارة والتحكم الأساسية')}</p>
            </div>
            <span className="adm-badge neutral">{shortcuts.length} {t('shortcuts', 'اختصارات')}</span>
          </div>
          <div className="adm-shortcuts-list">
            {shortcuts.map(item => (
              <Link key={item.to} className="adm-shortcut-card" to={item.to}>
                <div className="adm-shortcut-icon">
                  <item.icon size={18} />
                </div>
                <div className="adm-shortcut-text">
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
                <ArrowUpRight size={16} className="adm-shortcut-arrow" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function AnalyticsOverview() {
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [range, setRange] = useState<'month' | 'week' | '90d'>('month');
  const [eventSearch, setEventSearch] = useState('');
  const [eventStatus, setEventStatus] = useState<string>('all');
  const [eventPage, setEventPage] = useState(1);

  const transactions = readRows('transactions', 0);
  const leads = readRows('crm', 0);
  const subscriptions = readRows('plans', 1);
  const models = readRows('ai-usage', 0);
  const eventRows = readRows('analytics', 0);

  const revenue = transactions.filter(r => r.status === 'Completed').reduce((n, r) => n + Number(r.amount), 0);
  const tokens = models.reduce((n, r) => n + Number(r.tokens), 0);
  const wonLeads = leads.filter(r => r.status === 'Won').length;
  const qualifiedLeads = leads.filter(r => r.status === 'Qualified').length;
  const conversionRate = leads.length ? Math.round((wonLeads / leads.length) * 100) : 0;
  const activeTenants = subscriptions.filter(r => r.status === 'Active').length;

  const money = new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const points = range === 'week' ? [18, 26, 21, 35, 42, 38, 54] : range === '90d' ? [12, 16, 20, 24, 22, 30, 36, 44, 48, 56, 62, 78] : [14, 22, 18, 32, 29, 42, 38, 51, 47, 62, 58, 74];
  const pointLabels = range === 'week'
    ? (ar ? ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'] : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    : points.map((_, i) => `${i + 1}`);

  const filteredEvents = eventRows.filter(ev => {
    const matchesSearch = `${ev.id} ${ev.name} ${ev.tenant} ${ev.event}`.toLowerCase().includes(eventSearch.toLowerCase());
    const matchesStatus = eventStatus === 'all' || ev.status === eventStatus;
    return matchesSearch && matchesStatus;
  });

  const eventPageSize = 4;
  const eventPages = Math.max(1, Math.ceil(filteredEvents.length / eventPageSize));
  const currentEventPage = Math.min(eventPage, eventPages);
  const pagedEvents = filteredEvents.slice((currentEventPage - 1) * eventPageSize, currentEventPage * eventPageSize);

  return (
    <>
      <div className="adm-overview-tools">
        <div className="adm-status-strip">
          <Badge value="Active" label={t('Deep Analytics & Reporting Feed', 'تغذية التحليلات والتقارير المتقدمة')} />
          <span className="adm-status-time">{t('Aggregated across all workspaces', 'مجمّع عبر جميع مساحات العمل')}</span>
        </div>
        <div className="adm-analytics-controls">
          <AdminSelect
            label={t('Reporting period', 'فترة التقرير')}
            value={range}
            onChange={(val) => setRange(val as 'month' | 'week' | '90d')}
            options={[
              { value: 'month', label: t('This month', 'هذا الشهر') },
              { value: 'week', label: t('This week', 'هذا الأسبوع') },
              { value: '90d', label: t('Last 90 days', 'آخر 90 يوماً') },
            ]}
          />
          <button
            onClick={() => downloadCSV(filteredEvents, 'analytics-events.csv')}
            title={t('Export analytics events log', 'تصدير سجل أحداث التحليلات')}
          >
            <Download size={14} />
            {t('Export Events', 'تصدير الأحداث')}
          </button>
        </div>
      </div>

      <div className="adm-metrics">
        <Metric
          label={t('Revenue Volume', 'حجم الإيرادات')}
          value={money.format(revenue)}
          icon={<CreditCard size={19} />}
          detail={`+18.2% ${t('vs previous cycle', 'مقارنة بالدورة السابقة')}`}
        />
        <Metric
          label={t('Lead Conversion Rate', 'معدل تحويل العملاء')}
          value={`${conversionRate}%`}
          icon={<TrendingUp size={19} />}
          detail={`${wonLeads} ${t('won', 'ناجح')} · ${leads.length} ${t('tracked', 'متابع')}`}
        />
        <Metric
          label={t('Workspace Growth Trend', 'اتجاه نمو مساحات العمل')}
          value={`+24%`}
          icon={<Building2 size={19} />}
          detail={`${activeTenants} ${t('active client workspaces', 'مساحة عمل نشطة للعملاء')}`}
        />
        <Metric
          label={t('AI Tokens Consumed', 'رموز الذكاء المستهلكة')}
          value={new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US', { notation: 'compact' }).format(tokens)}
          icon={<Bot size={19} />}
          detail={`${models.length} ${t('model allocations', 'توزيعات نماذج')}`}
        />
      </div>

      <div className="adm-analytics-charts-grid">
        {/* Chart 1: Revenue Volume Trend */}
        <section className="adm-panel adm-chart">
          <div className="adm-panel-heading">
            <div>
              <h2>{t('Revenue Trend', 'اتجاه الإيرادات')}</h2>
              <p>{t('Historical ledger revenue volume · USD', 'حجم الإيرادات التاريخية في السجل · دولار')}</p>
            </div>
            <span className="adm-badge success"><ArrowUpRight size={13} />+18.2%</span>
          </div>
          <div className="adm-bar-chart" role="img" aria-label={t('Revenue trend chart', 'رسم توضيحي لاتجاه الإيرادات')}>
            {points.map((v, i) => (
              <div key={i}>
                <b style={{ height: `${v * 1.05}px` }} title={`$${v * 100}`} />
                <span>{pointLabels[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Chart 2: Lead Conversion & Acquisition Funnel */}
        <section className="adm-panel adm-analytics-conversion">
          <div className="adm-panel-heading">
            <div>
              <h2>{t('Conversion & Growth Trend', 'اتجاه التحويل والنمو')}</h2>
              <p>{t('Pipeline efficiency & client acquisition', 'كفاءة مسار العملاء واكتساب المشتركين')}</p>
            </div>
            <span className="adm-badge success"><TrendingUp size={13} />{conversionRate}% {t('Win Rate', 'نسبة الفوز')}</span>
          </div>
          <div className="adm-conversion-body">
            <div className="adm-conversion-bars">
              <div className="adm-conversion-row">
                <div className="adm-conversion-label">
                  <span>{t('Total Captured Leads', 'إجمالي العملاء الملتقطين')}</span>
                  <b>{leads.length}</b>
                </div>
                <div className="adm-conversion-track">
                  <div className="adm-conversion-fill" style={{ width: '100%', background: 'var(--adm-accent)' }} />
                </div>
              </div>
              <div className="adm-conversion-row">
                <div className="adm-conversion-label">
                  <span>{t('Qualified Prospects', 'العملاء المؤهلون')}</span>
                  <b>{qualifiedLeads} ({leads.length ? Math.round(qualifiedLeads / leads.length * 100) : 0}%)</b>
                </div>
                <div className="adm-conversion-track">
                  <div className="adm-conversion-fill" style={{ width: `${leads.length ? (qualifiedLeads / leads.length) * 100 : 0}%`, background: '#A78BFA' }} />
                </div>
              </div>
              <div className="adm-conversion-row">
                <div className="adm-conversion-label">
                  <span>{t('Won Deals / Clients', 'الصفقات الناجحة / المشتركون')}</span>
                  <b>{wonLeads} ({conversionRate}%)</b>
                </div>
                <div className="adm-conversion-track">
                  <div className="adm-conversion-fill" style={{ width: `${conversionRate}%`, background: 'var(--adm-success)' }} />
                </div>
              </div>
            </div>
            <div className="adm-growth-indicator">
              <span className="adm-growth-badge">+24%</span>
              <p>{t('Workspace expansion velocity acceleration this cycle.', 'تسارع وتيرة توسع مساحات العمل في هذه الدورة.')}</p>
            </div>
          </div>
        </section>

        {/* Chart 3: AI Token Consumption Breakdown */}
        <section className="adm-panel adm-analytics-tokens">
          <div className="adm-panel-heading">
            <div>
              <h2>{t('AI Tokens Per Workspace', 'رموز الذكاء حسب مساحة العمل')}</h2>
              <p>{t('Allocation & quota consumption breakdown', 'توزيع الحصص والاستهلاك حسب المساحة')}</p>
            </div>
            <Bot size={18} />
          </div>
          <div className="adm-budget-list">
            {models.map(r => {
              const used = Number(r.tokens);
              const budget = Math.max(1, Number(r.budget));
              const pct = Math.min(100, Math.round((used / budget) * 100));
              return (
                <div key={r.id}>
                  <span>
                    <strong>{r.tenant}</strong>
                    <b>{pct}%</b>
                  </span>
                  <progress max={budget} value={used} />
                  <small>{Number(used).toLocaleString(ar ? 'ar-EG' : 'en-US')} / {Number(budget).toLocaleString(ar ? 'ar-EG' : 'en-US')} tokens ({r.model})</small>
                </div>
              );
            })}
          </div>
          <div className="adm-widget-footer">
            <Link className="adm-link" to="/admin/ai-usage">
              {t('Manage AI token allocations', 'إدارة توزيع رموز الذكاء')}<ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
      </div>

      {/* Operational Events Log Table */}
      <section className="adm-panel adm-events-panel">
        <div className="adm-panel-heading">
          <div>
            <h2>{t('Operational Events Log', 'سجل الأحداث التشغيلية')}</h2>
            <p>{t('Auditable stream of background system events, webhooks, and transactions', 'سجل تدقيق حي للأحداث البرمجية والويبهوك والمدفوعات')}</p>
          </div>
          <span className="adm-badge neutral">{filteredEvents.length} {t('events', 'أحداث')}</span>
        </div>

        <div className="adm-filters">
          <label className="adm-search">
            <Search size={15} />
            <input
              aria-label={t('Search operational events', 'بحث في الأحداث التشغيلية')}
              placeholder={t('Search events, workspaces or triggers…', 'ابحث في الأحداث أو مساحات العمل أو الإجراءات…')}
              value={eventSearch}
              onChange={e => { setEventSearch(e.target.value); setEventPage(1); }}
            />
            {eventSearch && (
              <button className="adm-search-clear" aria-label={t('Clear search', 'مسح البحث')} onClick={() => { setEventSearch(''); setEventPage(1); }}>
                <X size={13} />
              </button>
            )}
          </label>
          <div className="adm-events-status-tabs">
            {(['all', 'Completed', 'Failed'] as const).map(status => (
              <button
                key={status}
                type="button"
                className={`adm-filter-pill ${eventStatus === status ? 'active' : ''}`}
                onClick={() => { setEventStatus(status); setEventPage(1); }}
              >
                {status === 'all' ? t('All Events', 'كل الأحداث') : status === 'Completed' ? t('Completed', 'مكتملة') : t('Failed', 'فشلت')}
              </button>
            ))}
          </div>
        </div>

        <div className="adm-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Event ID / Reference', 'معرف الحدث / المرجع')}</th>
                <th>{t('Workspace / Tenant', 'مساحة العمل / العميل')}</th>
                <th>{t('Event Action / Trigger', 'إجراء الحدث / المحفز')}</th>
                <th>{t('Timestamp', 'الوقت والتاريخ')}</th>
                <th>{t('Status', 'الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedEvents.map(ev => (
                <tr key={ev.id}>
                  <td>
                    <span className="adm-record-name adm-readonly-name">
                      <span className="adm-avatar">{ev.name.slice(0, 3)}</span>
                      <b>{ev.name}</b>
                    </span>
                  </td>
                  <td>{ev.tenant}</td>
                  <td><b>{ev.event ?? '—'}</b></td>
                  <td><span className="adm-ltr">{ev.date ?? '—'}</span></td>
                  <td>
                    <Badge value={ev.status} label={ar ? (labels[ev.status] ?? ev.status) : ev.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredEvents.length && (
          <div className="adm-empty">
            <Search size={24} />
            <h3>{t('No matching operational events', 'لا توجد أحداث مطابقة')}</h3>
            <p>{t('Try searching for another keyword or resetting the filter.', 'جرب كلمة بحث أخرى أو أعد ضبط الفلتر.')}</p>
          </div>
        )}

        <div className="adm-pagination">
          <span>{t('Page', 'صفحة')} {currentEventPage} / {eventPages} ({filteredEvents.length} {t('total', 'إجمالي')})</span>
          <div>
            <button disabled={currentEventPage <= 1} onClick={() => setEventPage(currentEventPage - 1)}>
              {t('Previous', 'السابق')}
            </button>
            <button disabled={currentEventPage >= eventPages} onClick={() => setEventPage(currentEventPage + 1)}>
              {t('Next', 'التالي')}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function MiniPager({ label, page, pages, change }: { label: string; page: number; pages: number; change: (page: number) => void }) {
  const ar = useUILanguage().startsWith('ar');
  return (
    <div className="adm-mini-pagination" role="group" aria-label={label}>
      <button aria-label={ar ? `السابق: ${label}` : `Previous: ${label}`} disabled={page <= 1} onClick={() => change(page - 1)}>
        {ar ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
      <span>{page} / {pages}</span>
      <button aria-label={ar ? `التالي: ${label}` : `Next: ${label}`} disabled={page >= pages} onClick={() => change(page + 1)}>
        {ar ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
      </button>
    </div>
  );
}
