import { useCurrency } from '../../context/CurrencyContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowUpDown, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, CloudDownload, Copy, Download, Eye, EyeOff, FileText, Globe2, Layers3, LayoutGrid, LayoutTemplate, List, MoreVertical, Pencil, Plus, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { useTemplateLibrary, saveAdminTemplate, deleteAdminTemplate, setGeneralTemplateHidden, duplicateToMyTemplates, type OwnedTemplate, type TemplateLibraryScope } from '../../backend/templateOwnership';
import { useAdminManagement, saveManagedTemplate, deleteManagedTemplate } from '../../backend/adminManagement';
import { backendError } from '../../backend/firebase';
import { useUILanguage } from '../../i18n/display';
import { adminTemplateCategories as categories } from '../system-template-data';
import { managementRow, type ManagementResource, type LiveRecord } from './live-model';
import { localizeManagedTemplate, templateCategoryLabel, templateIsActive, type ManagedTemplate } from './managed-template';
import { AdminSelect } from './AdminSelect';
import { downloadCSV } from './repository';
import { displayDate, displayMoney, humanLabel, LiveDialog, navigateAdminTabs, StatusPill } from './AdminLiveUI';
import { AdminRecordDetails } from './AdminRecordDetails';
import { AdminSitePreview, type SitePreview } from './AdminSitePreview';
import { AdminTemplateEditor, newManagedTemplate } from './AdminTemplateEditor';
import { isPlatformTeamRole } from '../../router/platformAccess';
import './admin-live.css';

const views: Record<string, { title: [string, string]; description: [string, string]; tabs: [string, string, ManagementResource][] }> = {
  'funnels-websites': { title: ['Funnels & Websites', 'الأقماع والمواقع'], description: ['A clear view of every workspace’s published experiences and drafts.', 'رؤية شاملة للتجارب المنشورة والمسودات في كل مساحة عمل.'], tabs: [['All sites', 'كل المواقع', 'assets']] },
  crm: { title: ['CRM & Leads', 'العملاء المحتملون'], description: ['Follow every lead, source and pipeline across your platform.', 'تابع كل عميل ومصدر ومسار مبيعات عبر المنصة.'], tabs: [['Leads database', 'قاعدة العملاء', 'leads'], ['Pipelines', 'مسارات المبيعات', 'pipelines']] },
  booking: { title: ['Booking & Calendar', 'الحجوزات والتقويم'], description: ['Monitor appointments, hosts and calendars in one place.', 'راقب المواعيد والمضيفين والتقويمات في مكان واحد.'], tabs: [['Appointments & bookings', 'المواعيد والحجوزات', 'bookings'], ['Calendars', 'التقويمات', 'calendars']] },
  products: { title: ['Products & Payments', 'المنتجات والمدفوعات'], description: ['Explore the live catalog and trace every order and payment.', 'استعرض الكتالوج المباشر وتتبع الطلبات والمدفوعات.'], tabs: [['Products', 'المنتجات', 'products'], ['Orders audit', 'مراجعة الطلبات', 'orders'], ['Payment history', 'سجل المدفوعات', 'transactions']] },
  templates: { title: ['System Templates', 'قوالب النظام'], description: ['Curate the master library your workspaces build with.', 'أدر المكتبة الرئيسية التي تستخدمها مساحات العمل.'], tabs: [] },
};
type Row = ReturnType<typeof managementRow>;
type Column = keyof Row;
const GHL_VISUAL_CATEGORIES = new Set(['Websites', 'Funnels', 'Forms']);

export function AdminManagementView({ moduleId }: { moduleId: string }) {
  const { formatPrice } = useCurrency();
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  const [params, setParams] = useSearchParams();
  const view = views[moduleId], isTemplates = moduleId === 'templates';
  const requested = Number(params.get('tab') || 0);
  const tab = Number.isInteger(requested) && requested >= 0 && requested < view.tabs.length ? requested : 0;
  const resource = view.tabs[tab]?.[2];
  const resources = useMemo(() => resource ? [...new Set<ManagementResource>([resource, ...(resource === 'bookings' ? ['calendars' as const] : []), ...(resource === 'leads' ? ['pipelines' as const] : [])])] : [], [resource]);
  const management = useAdminManagement(resources, isTemplates);
  // Template libraries: super admin = My templates (system) | Client templates; admin = General templates | My templates.
  const accountRole = useSelector((s: RootState) => s.auth.role), accountId = useSelector((s: RootState) => s.auth.user?.id) || '';
  const superAdmin = isPlatformTeamRole(accountRole);
  const libraries: [TemplateLibraryScope, string][] = superAdmin ? [['system', t('My templates', 'قوالبي')], ['client', t('Client templates', 'قوالب العملاء')]] : [['general', t('General templates', 'القوالب العامة')], ['mine', t('My templates', 'قوالبي')]];
  const library = isTemplates ? (libraries.find(([id]) => id === params.get('library'))?.[0] ?? libraries[0][0]) : null;
  const libraryData = useTemplateLibrary(library);
  const editable = library === 'system' || library === 'mine';
  const live = isTemplates ? { ...management, templates: libraryData.templates as OwnedTemplate[], loading: libraryData.loading, error: libraryData.error || management.error } : { ...management, templates: management.templates as OwnedTemplate[] };
  const saveTemplate = (value: ManagedTemplate) => library === 'mine' ? saveAdminTemplate(value) : saveManagedTemplate(value);
  const hiddenFor = (id: string) => libraryData.hidden.includes(id);
  const unavailable = !!live.error || Object.keys(live.sourceErrors).length > 0;
  const [search, setSearch] = useState(''), [workspace, setWorkspace] = useState('');
  const [status, setStatus] = useState(''), [source, setSource] = useState(''), [category, setCategory] = useState('');
  const [pipeline, setPipeline] = useState(''), [calendar, setCalendar] = useState('');
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: Column; direction: 1 | -1 }>({ key: 'name', direction: 1 });
  const [viewOverride, setViewOverride] = useState<'grid' | 'table' | null>(null);
  const [openMenuId, setOpenMenuId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState<ManagedTemplate | null>(null), [deleting, setDeleting] = useState<ManagedTemplate | null>(null);
  const [preview, setPreview] = useState<SitePreview | null>(null);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null), [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = (event: MouseEvent) => {
      if (!(event.target as HTMLElement | null)?.closest('.alm-ghl-menu-wrap')) setOpenMenuId('');
    };
    window.addEventListener('mousedown', closeMenu);
    return () => window.removeEventListener('mousedown', closeMenu);
  }, [openMenuId]);

  const showTemplateGrid = isTemplates && (viewOverride ? viewOverride === 'grid' : GHL_VISUAL_CATEGORIES.has(category));
  const records = live.records.filter(r => r.path.split('/').at(-2) === resource);
  const calendars = live.records.filter(r => r.path.split('/').at(-2) === 'calendars');
  const pipelines = live.records.filter(r => r.path.split('/').at(-2) === 'pipelines');
  const localizedTemplates = new Map(live.templates.map(template => [template.id, localizeManagedTemplate(template, ar)]));
  const rows: Row[] = isTemplates ? [...localizedTemplates.values()].filter(template => categories.includes(template.category)).map(template => ({ id: template.id, recordId: template.id, name: template.name, tenant: 'Platform', workspaceId: '', owner: library === 'client' ? template.ownerName || template.ownerEmail || 'Admin' : 'System library', ownerId: library === 'client' ? template.ownerEmail || template.ownerUid || '' : '', email: '', status: !templateIsActive(template) ? 'Draft' : library === 'general' && hiddenFor(template.id) ? 'Hidden' : 'Published', type: template.category, source: '', host: '', date: template.updated, amount: '', currency: '', product: '', domain: '', pipeline: '', pipelineKey: '', calendar: '', calendarKey: '' })) : records.map(record => managementRow(record, live.tenants, live.users, calendars, pipelines));
  const workspaceRows = rows.filter(row => !workspace || row.workspaceId === workspace);
  const filtered = workspaceRows.filter(row => (!status || row.status === status) && (!source || row.source === source) && (!category || row.type === category) && (!pipeline || row.pipelineKey === pipeline) && (!calendar || row.calendarKey === calendar) && [...Object.values(row), localizedTemplates.get(row.id)?.description, localizedTemplates.get(row.id)?.tags.join(' '), localizedTemplates.get(row.id)?.categoryLabel].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  const sorted = [...filtered].sort((a, b) => String(a[sort.key]).localeCompare(String(b[sort.key]), ar ? 'ar' : 'en', { numeric: true, sensitivity: 'base' }) * sort.direction);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize)), current = Math.min(page, pages), start = (current - 1) * pageSize;
  const visibleRows = sorted.slice(start, start + pageSize);
  const selected = isTemplates ? localizedTemplates.get(selectedId) : records.find(item => item.path === selectedId);
  const columns: Column[] = ['name', ...(!isTemplates ? ['tenant', 'owner'] as const : library === 'client' ? ['owner'] as const : []), ...(resource === 'leads' ? ['pipeline', 'source'] as const : []), ...(resource === 'bookings' ? ['calendar', 'host', 'date'] as const : []), ...(resource === 'calendars' ? ['host'] as const : []), ...(resource === 'products' || isTemplates || resource === 'assets' ? ['type'] as const : []), ...(['products', 'orders', 'transactions'].includes(resource) ? ['amount', ...(['orders', 'transactions'].includes(resource) ? ['date'] as const : [])] as Column[] : []), 'status'];
  const labels: Partial<Record<Column, string>> = { name: t('Name / reference', 'الاسم / المرجع'), tenant: t('Workspace', 'مساحة العمل'), owner: library === 'client' ? t('Admin', 'الأدمن') : t('Owner', 'المالك'), pipeline: t('Pipeline', 'مسار المبيعات'), calendar: t('Calendar', 'التقويم'), source: t('Source', 'المصدر'), host: t('Host', 'المضيف'), date: t('Date / time', 'التاريخ والوقت'), type: t('Type', 'النوع'), amount: resource === 'products' ? t('Price', 'السعر') : t('Amount', 'المبلغ'), status: t('Status', 'الحالة') };
  const filterCount = [search, workspace, status, source, category, pipeline, calendar].filter(Boolean).length;

  async function action(fn: () => Promise<void>, success: string): Promise<string | null> {
    if (lock.current) return t('Another action is still saving.', 'لا يزال إجراء آخر قيد الحفظ.');
    lock.current = true; setBusy(true); setNotice(null);
    try { await fn(); setNotice({ message: success }); return null; }
    catch (error) { const message = backendError(error); setNotice({ message, error: true }); return message; }
    finally { lock.current = false; setBusy(false); }
  }
  function resetFilters() { setSearch(''); setWorkspace(''); setStatus(''); setSource(''); setCategory(''); setPipeline(''); setCalendar(''); setPage(1); }
  function changeTab(index: number) { setParams({ tab: String(index) }); setSelectedId(''); setStatus(''); setSource(''); setCategory(''); setPipeline(''); setCalendar(''); setPage(1); }
  function relationOptions(items: LiveRecord[], key: 'pipelineKey' | 'calendarKey', label: 'pipeline' | 'calendar') {
    const options = new Map<string, { value: string; label: string }>();
    for (const item of items) if (!workspace || item.workspaceId === workspace) options.set(item.path, { value: item.path, label: `${item.data.name || item.id} · ${live.tenants[item.workspaceId]?.name || item.workspaceId}` });
    for (const row of workspaceRows) if (row[key] && !options.has(row[key])) options.set(row[key], { value: row[key], label: `${row[label]} · ${row.tenant}` });
    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
  }
  function previewHref(id: string) {
    return '/admin-preview?' + new URLSearchParams(isTemplates ? { template: id, ...(library === 'mine' || library === 'client' ? { source: 'admin' } : {}) } : { record: id });
  }
  function openPreview(row: Row) {
    window.open(previewHref(row.id), '_blank', 'noopener');
  }
  const select = (label: string, value: string, values: string[], change: (value: string) => void, human = false) => <AdminSelect label={label} value={value} onChange={v => { change(v); setPage(1); }} options={[{ value: '', label }, ...[...new Set(values.filter(Boolean))].sort().map(v => ({ value: v, label: human ? humanLabel(v) : v }))]} />;
  function cell(row: Row, key: Column) {
    if (key === 'name') {
      const tpl = isTemplates ? localizedTemplates.get(row.id) : undefined;
      return <div className="alm-record-cell">{tpl?.thumbnail ? <img className="alm-row-thumb" src={tpl.thumbnail} alt="" width={38} height={48} loading="lazy" decoding="async" onError={e => { const fallback = `/template-thumbnails/${row.id}.jpg`; if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; }}/> : <span className="alm-record-icon">{isTemplates ? <LayoutTemplate size={18}/> : resource === 'assets' ? row.type === 'Forms' ? <FileText size={18}/> : <Globe2 size={18}/> : resource === 'leads' ? <Users size={18}/> : moduleId === 'booking' ? <CalendarDays size={18}/> : <Layers3 size={18}/>}</span>}<div><button className="alm-name-button" onClick={() => setSelectedId(row.id)}>{row.name}</button><small>{isTemplates ? tpl?.description || t('Global system template', 'قالب نظام عام') : row.email || row.domain || row.recordId}</small></div></div>;
    }
    if (key === 'status') return <StatusPill value={row.status}/>;
    if (key === 'tenant') return <span className="alm-attribution"><strong>{row.tenant}</strong><small dir="ltr" title={row.workspaceId}>{row.workspaceId}</small></span>;
    if (key === 'owner') return <span className="alm-owner"><span className="alm-owner-avatar">{row.owner.slice(0, 1).toUpperCase()}</span><span className="alm-attribution"><strong>{row.owner}</strong><small dir="ltr" title={row.ownerId}>{row.ownerId || t('Owner not assigned', 'لم يحدد المالك')}</small></span></span>;
    if (key === 'type') return <span className="alm-type">{localizedTemplates.get(row.id)?.categoryLabel || row.type}</span>;
    if (key === 'amount') return <strong className="alm-money" dir="auto">{displayMoney(row.amount, row.currency, formatPrice)}</strong>;
    if (key === 'date') return <span className="alm-date">{displayDate(row.date, ar)}</span>;
    if (key === 'source') return <span className="alm-source"><i/>{row.source || '—'}</span>;
    return row[key] || '—';
  }
  const chips: [string, string, () => void][] = [];
  if (search) chips.push([t('Search', 'بحث'), search, () => setSearch('')]);
  if (workspace) chips.push([t('Workspace', 'مساحة العمل'), live.tenants[workspace]?.name || workspace, () => { setWorkspace(''); setPipeline(''); setCalendar(''); }]);
  if (category) chips.push([t('Type', 'النوع'), templateCategoryLabel(category, ar), () => setCategory('')]);
  if (pipeline) chips.push([t('Pipeline', 'مسار المبيعات'), relationOptions(pipelines, 'pipelineKey', 'pipeline').find(o => o.value === pipeline)?.label || pipeline, () => setPipeline('')]);
  if (calendar) chips.push([t('Calendar', 'التقويم'), relationOptions(calendars, 'calendarKey', 'calendar').find(o => o.value === calendar)?.label || calendar, () => setCalendar('')]);
  if (source) chips.push([t('Source', 'المصدر'), source, () => setSource('')]);
  if (status) chips.push([t('Status', 'الحالة'), humanLabel(status), () => setStatus('')]);

  return <div className="adm-workspace adm-live" data-module={moduleId}>
    <div className="alm-page-head"><div><span className="alm-kicker">{t('PLATFORM MANAGEMENT', 'إدارة المنصة')}</span><h1>{isTemplates && superAdmin ? t('Templates', 'القوالب') : view.title[ar ? 1 : 0]}</h1><p>{view.description[ar ? 1 : 0]}</p></div><div className="alm-inline-actions"><button className="alm-button" disabled={live.loading || !!live.error || !filtered.length} onClick={() => downloadCSV(filtered, `${moduleId}.csv`)}><Download size={16}/>{t('Export', 'تصدير')}</button>{isTemplates && editable && <button className="alm-button primary" disabled={live.loading || !!live.error || busy} onClick={() => setEditing(newManagedTemplate((category || 'Funnels') as ManagedTemplate['category']))}><Plus size={17}/>{t('Create template', 'إنشاء قالب')}</button>}</div></div>
    <div className="alm-summary"><div><span className="alm-summary-icon"><Layers3 size={18}/></span><div><small>{t('Total records', 'إجمالي السجلات')}</small><strong>{live.loading ? '—' : rows.length.toLocaleString('en-US')}</strong></div></div><div><span className="alm-summary-icon secondary"><Check size={18}/></span><div><small>{t('Active / published', 'نشط / منشور')}</small><strong>{live.loading ? '—' : rows.filter(r => /^(published|active|confirmed|completed|paid|qualified|won|succeeded)$/i.test(r.status)).length.toLocaleString('en-US')}</strong></div></div><div><span className="alm-summary-icon"><Building2 size={18}/></span><div><small>{isTemplates ? t('Template categories', 'فئات القوالب') : t('Workspaces', 'مساحات العمل')}</small><strong>{isTemplates ? categories.length : Object.keys(live.tenants).length}</strong></div></div><div className="alm-live-state" role="status" data-error={!!live.error} title={live.loading ? t('Using cached offline data — sync in progress with Firebase', 'يتم استخدام البيانات المخزنة مؤقتاً — جاري المزامنة الحية مع Firebase') : undefined}><span className={live.loading ? 'loading' : ''}/><div><strong>{live.error ? t('Connection needs attention', 'الاتصال يحتاج إلى متابعة') : live.loading ? t('Syncing with cloud…', 'جاري المزامنة…') : t('Live Firestore', 'فايرستور مباشر')}</strong><small>{isTemplates ? t('Master system library', 'مكتبة قوالب النظام') : t('Read-only · All workspaces', 'للقراءة فقط · كل مساحات العمل')}</small></div></div></div>
    {live.error && <div className="alm-error-inline" role="alert"><Activity size={17}/><div><strong>{t('Some records could not be loaded.', 'تعذر تحميل بعض السجلات.')}</strong><p>{live.error}</p></div></div>}
    {!live.error && unavailable && <div className="alm-error-inline" role="status"><Activity size={17}/><div><strong>{t('Some sources are unavailable. Showing accessible records.', 'بعض المصادر غير متاحة. تظهر السجلات المسموح بها.')}</strong><details><summary>{t('Unavailable sources', 'المصادر غير المتاحة')}</summary>{Object.entries(live.sourceErrors).map(([source, message]) => <p key={source}>{source}: {message}</p>)}</details></div></div>}
    {notice && <div className={`alm-notice ${notice.error ? 'error' : ''}`} role="status"><span>{notice.error ? <Activity size={17}/> : <Check size={17}/>}</span>{notice.message}<button className="alm-icon-button" aria-label={t('Dismiss', 'إغلاق')} onClick={() => setNotice(null)}><X size={15}/></button></div>}
    {isTemplates && <div className="alm-resource-tabs alm-library-tabs" role="tablist" onKeyDown={navigateAdminTabs} aria-label={t('Template libraries', 'مكتبات القوالب')}>{libraries.map(([id, label]) => <button key={id} role="tab" aria-selected={library === id} tabIndex={library === id ? 0 : -1} onClick={() => { setParams({ library: id }); setSelectedId(''); setCategory(''); setStatus(''); setPage(1); }}>{label}</button>)}</div>}
    {isTemplates ? <div className="alm-category-tabs" role="tablist" onKeyDown={navigateAdminTabs} aria-label={t('Template categories', 'فئات القوالب')}>{['', ...categories].map(item => <button key={item} role="tab" aria-selected={category === item} tabIndex={category === item ? 0 : -1} onClick={() => { setCategory(item); setOpenMenuId(''); setPage(1); }}>{item ? templateCategoryLabel(item, ar) : t('All templates', 'كل القوالب')}<span aria-hidden="true">{rows.filter(row => !item || row.type === item).length}</span></button>)}</div> : <div className="alm-resource-tabs" role="tablist" onKeyDown={navigateAdminTabs}>{view.tabs.map((item, index) => <button key={item[2]} role="tab" aria-selected={tab === index} tabIndex={tab === index ? 0 : -1} onClick={() => changeTab(index)}>{item[ar ? 1 : 0]}</button>)}</div>}
    <section className="alm-table-panel" aria-label={view.title[ar ? 1 : 0]}>
      <div className="alm-table-heading"><div><h2>{isTemplates ? categories.find(item => item === category) ? templateCategoryLabel(categories.find(item => item === category)!, ar) : t('Master library', 'المكتبة الرئيسية') : view.tabs[tab]?.[ar ? 1 : 0]}<span>{filtered.length}</span></h2><p>{isTemplates ? (library === 'general' ? t('Templates from the platform library. You can preview, copy, and show or hide them for your users.', 'قوالب مكتبة المنصة. يمكنك معاينتها ونسخها وإظهارها أو إخفاؤها لمستخدميك.') : library === 'mine' ? t('Templates you create are visible only to your users.', 'القوالب التي تنشئها تظهر لمستخدميك فقط.') : library === 'client' ? t('Templates created by admins for their own users · view only.', 'قوالب أنشأها الأدمن لمستخدميهم · للعرض فقط.') : t('Published templates are available to every admin as General templates.', 'القوالب المنشورة متاحة لكل أدمن كقوالب عامة.')) : t('Inspect records while preserving workspace ownership.', 'استعرض السجلات مع الحفاظ على ملكية مساحة العمل.')}</p></div><span className="alm-monitor-label"><ShieldCheck size={14}/>{isTemplates ? t('System managed', 'بإدارة النظام') : t('Monitoring view', 'عرض المراقبة')}</span></div>
      <div className="alm-filters"><label className="alm-search"><Search size={17}/><input aria-label={t('Search records', 'بحث في السجلات')} placeholder={isTemplates ? t('Search by template name or use case…', 'ابحث باسم القالب أو الاستخدام…') : t('Search name, owner or workspace…', 'ابحث بالاسم أو المالك أو مساحة العمل…')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>{search && <button className="alm-icon-button" onClick={() => { setSearch(''); setPage(1); }} aria-label={t('Clear search', 'مسح البحث')}><X size={14}/></button>}</label><div className="alm-filter-controls">
        {!isTemplates && <AdminSelect label={t('Workspace', 'مساحة العمل')} value={workspace} onChange={value => { setWorkspace(value); setPipeline(''); setCalendar(''); setPage(1); }} options={[{ value: '', label: t('All workspaces', 'كل مساحات العمل') }, ...Object.entries(live.tenants).map(([id, data]) => ({ value: id, label: `${data.name || id} · ${id}` }))]}/>}
        {resource === 'assets' && select(t('Asset subtype', 'نوع الأصل'), category, ['Funnels', 'Websites', 'Forms'], setCategory)}
        {resource === 'leads' && <AdminSelect label={t('Pipeline', 'مسار المبيعات')} value={pipeline} onChange={value => { setPipeline(value); setPage(1); }} options={[{ value: '', label: t('All pipelines', 'كل مسارات المبيعات') }, ...relationOptions(pipelines, 'pipelineKey', 'pipeline')]}/>}
        {resource === 'bookings' && <AdminSelect label={t('Calendar', 'التقويم')} value={calendar} onChange={value => { setCalendar(value); setPage(1); }} options={[{ value: '', label: t('All calendars', 'كل التقويمات') }, ...relationOptions(calendars, 'calendarKey', 'calendar')]}/>}
        {resource === 'leads' && select(t('All sources', 'كل المصادر'), source, workspaceRows.map(r => r.source), setSource)}
        {resource === 'products' && select(t('Product type', 'نوع المنتج'), category, ['Service', 'Digital Product', 'Course', ...workspaceRows.map(r => r.type)], setCategory)}
        {select(t('All statuses', 'كل الحالات'), status, workspaceRows.map(r => r.status), setStatus, true)}
        {isTemplates && <div className="alm-view-switch" role="group" aria-label={t('Template layout view', 'طريقة عرض القوالب')}>
          <button type="button" aria-label={t('Grid view', 'عرض البطاقات')} aria-pressed={showTemplateGrid} onClick={() => setViewOverride('grid')} title={t('Grid view', 'عرض البطاقات')}><LayoutGrid size={15}/></button>
          <button type="button" aria-label={t('List view', 'عرض الجدول')} aria-pressed={!showTemplateGrid} onClick={() => setViewOverride('table')} title={t('List view', 'عرض الجدول')}><List size={15}/></button>
        </div>}
      </div></div>
      {!!filterCount && <div className="alm-active-filters"><span>{filterCount} {t('active filters', 'فلاتر نشطة')}</span>{chips.map(([label, value, clear]) => <button key={label} onClick={() => { clear(); setPage(1); }} aria-label={`${t('Remove filter', 'حذف الفلتر')}: ${label}`}><span>{label}: {value}</span><X size={12}/></button>)}<button className="alm-reset" onClick={resetFilters}>{t('Clear all', 'مسح الكل')}</button></div>}

      {showTemplateGrid ? (
        <div className="alm-ghl-gallery" aria-busy={live.loading}>
          <div className="alm-ghl-section-head">
            <div>
              <h3>{t('Recently added', 'أضيف مؤخراً')}</h3>
              <span>{t('Showing', 'عرض')} {filtered.length} {filtered.length === 1 ? t('template', 'قالب') : t('templates', 'قوالب')}</span>
            </div>
            {GHL_VISUAL_CATEGORIES.has(category) && <small>{t('High-converting curated collection · Synced with Firebase', 'مجموعة احترافية عالية التحويل · متزامنة مع Firebase')}</small>}
          </div>
          {live.loading && !rows.length ? (
            <div className="alm-ghl-grid" aria-hidden="true">
              {Array.from({ length: 3 }, (_, idx) => (
                <div key={idx} className="alm-ghl-card skeleton">
                  <div className="alm-ghl-frame" />
                  <div className="alm-ghl-meta">
                    <span className="alm-ghl-skel-line title" />
                    <span className="alm-ghl-skel-line sub" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleRows.length > 0 ? (
            <div className="alm-ghl-grid">
              {visibleRows.map(row => {
                const tpl = live.templates.find(item => item.id === row.id);
                const localized = localizedTemplates.get(row.id);
                const isNew = Boolean(tpl?.tags?.some(tag => tag.toLowerCase() === 'new'));
                const scopeTag = tpl?.tags?.find(tag => /\b(pages|steps|fields)\b/i.test(tag));
                const menuOpen = openMenuId === row.id;
                return (
                  <article key={row.id} className="alm-ghl-card" data-status={row.status}>
                    <div className="alm-ghl-frame">
                      {tpl?.thumbnail ? (
                        <a className="alm-ghl-image-link" href={previewHref(row.id)} target="_blank" rel="noopener" aria-label={`${t("Preview", "معاينة")} · ${row.name}`}><img
                          className="alm-ghl-thumb"
                          src={tpl.thumbnail}
                          alt={row.name}
                          width={960}
                          height={1240}
                          loading="eager"
                          decoding="async"
                          onError={e => { const fallback = `/template-thumbnails/${row.id}.jpg`; if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; }}
                        /></a>
                      ) : (
                        <button type="button" className="alm-ghl-fallback-art" onClick={() => setSelectedId(row.id)} style={{ '--card-accent': tpl?.color || '#7C3AED' } as React.CSSProperties}>
                          <span>{localized?.categoryLabel || row.type}</span>
                          <strong>{localized?.content?.headline || row.name}</strong>
                          <small>{localized?.description}</small>
                        </button>
                      )}
                      <div className={`alm-ghl-overlay ${menuOpen ? 'open' : ''}`}>
                        <div className="alm-ghl-menu-wrap">
                          <button
                            type="button"
                            className="alm-ghl-more-btn"
                            aria-label={`${t('Actions for', 'إجراءات')} ${row.name}`}
                            aria-expanded={menuOpen}
                            onClick={() => setOpenMenuId(menuOpen ? '' : row.id)}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuOpen && (
                            <div className="alm-ghl-menu" role="menu">
                              <button type="button" role="menuitem" onClick={() => { setOpenMenuId(''); setSelectedId(row.id); }}>
                                <Eye size={14} /> {t('View details', 'عرض التفاصيل')}
                              </button>
                              <button type="button" role="menuitem" onClick={() => { setOpenMenuId(''); openPreview(row); }}>
                                <Globe2 size={14} /> {t('Open in new tab', 'فتح في تبويب جديد')}
                              </button>
                              {library === 'general' && tpl && (
                                <>
                                  <button type="button" role="menuitem" disabled={busy} onClick={() => { setOpenMenuId(''); void action(async () => { await duplicateToMyTemplates(tpl); }, t('Copied to My templates as a draft.', 'تم النسخ إلى قوالبي كمسودة.')); }}>
                                    <Copy size={14} /> {t('Duplicate to My templates', 'نسخ إلى قوالبي')}
                                  </button>
                                  <button type="button" role="menuitem" disabled={busy || row.status === 'Draft'} onClick={() => { setOpenMenuId(''); const hide = !hiddenFor(row.id); void action(() => setGeneralTemplateHidden(row.id, hide), hide ? t('Hidden from your users.', 'تم إخفاؤه عن مستخدميك.') : t('Visible to your users.', 'أصبح ظاهراً لمستخدميك.')); }}>
                                    {hiddenFor(row.id) ? <><Eye size={14} /> {t('Show to my users', 'إظهار لمستخدميّ')}</> : <><EyeOff size={14} /> {t('Hide from my users', 'إخفاء عن مستخدميّ')}</>}
                                  </button>
                                </>
                              )}
                              {editable && tpl && (
                                <>
                                  <button type="button" role="menuitem" disabled={busy} onClick={() => { setOpenMenuId(''); setEditing(structuredClone(tpl)); }}>
                                    <Pencil size={14} /> {t('Edit template', 'تعديل القالب')}
                                  </button>
                                  <button type="button" role="menuitem" disabled={busy} onClick={() => { setOpenMenuId(''); void action(() => saveTemplate({ ...tpl, active: !templateIsActive(tpl), status: templateIsActive(tpl) ? 'Draft' : 'Published' }), t('Template visibility updated.', 'تم تحديث ظهور القالب.')); }}>
                                    {row.status === 'Published' ? <><EyeOff size={14} /> {t('Deactivate', 'تعطيل')}</> : <><Check size={14} /> {t('Activate', 'تفعيل')}</>}
                                  </button>
                                  <button type="button" role="menuitem" className="danger" disabled={busy} onClick={() => { setOpenMenuId(''); setNotice(null); setDeleting(tpl); }}>
                                    <Trash2 size={14} /> {t('Delete template', 'حذف القالب')}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <a
                          className="alm-ghl-preview-pill"
                          href={previewHref(row.id)} target="_blank" rel="noopener"
                        >
                          <Eye size={15} />
                          <span>{t('Preview', 'معاينة')}</span>
                        </a>
                      </div>
                    </div>
                    <div className="alm-ghl-meta">
                      <div className="alm-ghl-title-row">
                        <button type="button" className="alm-ghl-title" onClick={() => setSelectedId(row.id)}>
                          {row.name}
                        </button>
                        {row.status === 'Draft' ? (
                          <span className="alm-ghl-draft-pill"><Pencil size={11} />{t('In draft', 'مسودة')}</span>
                        ) : row.status === 'Hidden' ? (
                          <StatusPill value="Hidden" />
                        ) : null}
                      </div>
                      {localized?.description && <p className="alm-ghl-description">{localized.description}</p>}
                      <div className="alm-ghl-stats-row">
                        <span className="alm-ghl-downloads" title={t('Workspace installs & downloads', 'مرات التثبيت والاستخدام')}>
                          <CloudDownload size={14} />
                          {(tpl?.popularity ?? 0).toLocaleString('en-US')}
                        </span>
                        {isNew && <span className="alm-ghl-new-badge">{t('New', 'جديد')}</span>}
                        {scopeTag && <span className="alm-ghl-scope-tag">{scopeTag}</span>}
                        {!category && <span className="alm-ghl-scope-tag">{localizedTemplates.get(row.id)?.categoryLabel || row.type}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <span className="alm-mobile-hint">{t('Swipe to view all columns', 'اسحب لعرض كل الأعمدة')}</span>
          <div className="alm-table-scroll" role="region" tabIndex={0} aria-label={t('Records table', 'جدول السجلات')} aria-busy={live.loading}><table className="alm-table"><thead><tr>{columns.map(key => <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => { setSort({ key, direction: sort.key === key && sort.direction === 1 ? -1 : 1 }); setPage(1); }}>{labels[key]}<ArrowUpDown size={12}/></button></th>)}<th scope="col" className="alm-actions-heading">{t('Actions', 'الإجراءات')}</th></tr></thead><tbody>
            {live.loading && !rows.length ? Array.from({ length: 5 }, (_, index) => <tr key={index} className="alm-skeleton-row" aria-hidden="true">{[...columns, 'actions'].map(key => <td key={key}><span/></td>)}</tr>) : visibleRows.map(row => <tr key={row.id}>{columns.map(key => <td key={key} data-column={key}>{cell(row, key)}</td>)}<td className="alm-actions-cell"><div className="alm-row-actions"><button className="alm-icon-button" aria-label={t('View details', 'عرض التفاصيل')} title={t('View details', 'عرض التفاصيل')} onClick={() => setSelectedId(row.id)}><Eye size={16}/></button>{(isTemplates || records.find(item => item.path === row.id)?.data.document?.pages?.length > 0) && <button className="alm-icon-button" aria-label={t('Preview', 'معاينة')} title={t('Preview', 'معاينة')} onClick={() => openPreview(row)}><Globe2 size={16}/></button>}{library === 'general' && <><button disabled={busy} className="alm-icon-button" aria-label={t('Duplicate to My templates', 'نسخ إلى قوالبي')} title={t('Duplicate to My templates', 'نسخ إلى قوالبي')} onClick={() => { const template = live.templates.find(item => item.id === row.id)!; void action(async () => { await duplicateToMyTemplates(template); }, t('Copied to My templates as a draft.', 'تم النسخ إلى قوالبي كمسودة.')); }}><Copy size={15}/></button><button disabled={busy || row.status === 'Draft'} className="alm-visibility-button" title={row.status === 'Draft' ? t('Turned off by the super admin', 'معطل من السوبر أدمن') : undefined} onClick={() => { const hide = !hiddenFor(row.id); void action(() => setGeneralTemplateHidden(row.id, hide), hide ? t('Hidden from your users.', 'تم إخفاؤه عن مستخدميك.') : t('Visible to your users.', 'أصبح ظاهراً لمستخدميك.')); }}>{hiddenFor(row.id) ? <><Eye size={14}/>{t('Show to my users', 'إظهار لمستخدميّ')}</> : <><EyeOff size={14}/>{t('Hide from my users', 'إخفاء عن مستخدميّ')}</>}</button></>}{isTemplates && editable && <><button disabled={busy} className="alm-icon-button" aria-label={t('Edit template', 'تعديل القالب')} title={t('Edit template', 'تعديل القالب')} onClick={() => setEditing(structuredClone(live.templates.find(item => item.id === row.id)!))}><Pencil size={15}/></button><button disabled={busy} className="alm-visibility-button" onClick={() => { const template = live.templates.find(item => item.id === row.id)!; void action(() => saveTemplate({ ...template, active: !templateIsActive(template), status: templateIsActive(template) ? 'Draft' : 'Published' }), t('Template visibility updated.', 'تم تحديث ظهور القالب.')); }}>{row.status === 'Published' ? t('Deactivate', 'تعطيل') : t('Activate', 'تفعيل')}</button><button disabled={busy} className="alm-icon-button danger" aria-label={t('Delete template', 'حذف القالب')} title={t('Delete template', 'حذف القالب')} onClick={() => { setNotice(null); setDeleting(live.templates.find(item => item.id === row.id)!); }}><Trash2 size={15}/></button></>}</div></td></tr>)}
          </tbody></table></div>
        </>
      )}

      {!live.loading && !filtered.length && <div className="alm-empty"><span><Search size={27}/></span><h3>{unavailable ? t('Records are unavailable', 'السجلات غير متاحة') : filterCount ? t('No matching records.', 'لا توجد سجلات مطابقة.') : t('Your library is ready for its first record', 'المكتبة جاهزة لأول سجل')}</h3><p>{unavailable ? t('Check the connection and administrator permissions.', 'تحقق من الاتصال وصلاحيات الإدارة.') : filterCount ? t('Try another search or adjust the filters.', 'جرب بحثاً آخر أو عدل الفلاتر.') : isTemplates ? t('Create a template or start from a system preset.', 'أنشئ قالباً أو ابدأ من إعداد نظام جاهز.') : t('New workspace records appear here automatically.', 'تظهر سجلات مساحات العمل الجديدة هنا تلقائياً.')}</p>{!!filterCount && <button className="alm-button" onClick={resetFilters}>{t('Clear filters', 'مسح الفلاتر')}</button>}</div>}
      <footer className="alm-pagination"><div><span>{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)}` : '0'} {t('of', 'من')} {filtered.length} {t('records', 'سجل')}</span><AdminSelect label={t('Rows per page', 'عدد الصفوف')} value={String(pageSize)} options={[10, 25, 50].map(value => ({ value: String(value), label: `${value} / ${t('page', 'صفحة')}` }))} onChange={value => { setPageSize(Number(value)); setPage(1); }}/></div><div><button className="alm-button" aria-label={t('Previous page', 'الصفحة السابقة')} disabled={current <= 1} onClick={() => setPage(current - 1)}><ChevronLeft size={15}/>{t('Previous', 'السابق')}</button><span>{current} / {pages}</span><button className="alm-button" aria-label={t('Next page', 'الصفحة التالية')} disabled={current >= pages} onClick={() => setPage(current + 1)}>{t('Next', 'التالي')}<ChevronRight size={15}/></button></div></footer>
    </section>
    {selected && <AdminRecordDetails value={selected} tenants={live.tenants} users={live.users} related={live.records} close={() => setSelectedId('')} preview={setPreview} templatePreviewHref={isTemplates ? previewHref(selectedId) : undefined}/>}
    {editing && <AdminTemplateEditor ownerUid={library === 'mine' ? accountId : ''} presets={management.templates} key={editing.id} template={editing} busy={busy} close={() => setEditing(null)} preview={setPreview} save={async value => action(async () => { await saveTemplate(value); setEditing(null); }, t('Template saved to Firebase.', 'تم حفظ القالب في فايربيس.'))}/>}
    {deleting && <LiveDialog title={t('Delete template?', 'حذف القالب؟')} subtitle={library === 'mine' ? t('This removes the template from your library and your users’ galleries.', 'سيحذف هذا القالب من مكتبتك ومن مكتبات مستخدميك.') : t('This removes the master from the shared library.', 'سيحذف هذا القالب من المكتبة المشتركة.')} alert={notice?.error ? notice.message : undefined} close={() => !busy && setDeleting(null)} footer={<><button className="alm-button" disabled={busy} onClick={() => setDeleting(null)}>{t('Cancel', 'إلغاء')}</button><button className="alm-button destructive" disabled={busy} onClick={() => void action(async () => { await (library === 'mine' ? deleteAdminTemplate(deleting.id) : deleteManagedTemplate(deleting.id)); setDeleting(null); }, t('Template deleted.', 'تم حذف القالب.'))}><Trash2 size={15}/>{t('Delete', 'حذف')}</button></>}><div className="alm-delete-card"><span className="alm-record-icon"><LayoutTemplate size={24}/></span><div><h3>{deleting.name}</h3><p>{t('Existing workspace copies and user assets remain independent.', 'نسخ مساحات العمل وأصول المستخدمين الحالية مستقلة.')}</p></div></div></LiveDialog>}
    {preview && <AdminSitePreview value={preview} close={() => setPreview(null)}/>}
  </div>;
}
