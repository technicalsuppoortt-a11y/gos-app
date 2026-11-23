import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  AlertTriangle,
  Ban,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  DollarSign,
  Eye,
  FileText,
  FlaskConical,
  Laptop,
  Layers,
  Package,
  Pencil,
  Percent,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import { CRMRouting } from './CRMRouting';
import { PublishedPage } from './PublishedPage';
import { StepTemplateThumbnail } from './StepTemplateThumbnail';
import { FunnelAnalytics, FunnelDateRange, FunnelIntegrations, FunnelLeads } from './FunnelInsights';
import { rangeFor, assetEvents, funnelLeads } from './funnel-data';
import { AssetOptionsMenu as OptionsMenu } from './AssetOptionsMenu';
import { AssetSelect } from './AssetControls';
import { Modal } from './settings/kit';
import { useGlobalFunnelTemplates, globalTemplateCategoryLabel, type LocalizedGlobalFunnelTemplate } from '../backend/globalFunnelTemplates';
import { usePageTemplateCatalog } from '../backend/pageTemplateCatalog';
import { useEntities } from '../backend/workspace';
import { formatCurrencyAmount } from '../utils/currency';
import { showToast } from '../utils/toast';
import { useUILanguage, translateText, localizeNode, formatDisplayMessage } from '../i18n/display';
import {
  buildDefaultStepPage,
  cloneTemplateIntoStep,
  createDefaultInactivePage,
  hasLeadCaptureElement,
  normalizeStepCategory,
  type FunnelAutomationRule,
  type FunnelCoupon,
  type FunnelDeadlineSettings,
  type FunnelOrderBump,
  type FunnelStepConfiguration,
  type FunnelTemplateCategory,
} from './funnel-systeme-model';
import type { BuilderPage, FunnelStep } from './BuilderWorkspace';
import type { Asset, Dialog } from './asset-model';
import type { BusinessEvent } from '../backend/metrics';
import type { CanonicalLead } from '../store/slices/crmSlice';
import type { RootState } from '../store';
import './funnel-systeme.css';

type StepSubTab =
  | 'Configuration'
  | 'Automation Rules'
  | 'A/B Test'
  | 'Stats'
  | 'Leads'
  | 'Sales'
  | 'Deadline Settings'
  | 'Integrations';

const STEP_TYPE_OPTIONS = [
  { value: 'Opt-in', en: 'Opt-in / Squeeze Page', ar: 'صفحة الاشتراك (Opt-in)' },
  { value: 'Sales', en: 'Sales Page', ar: 'صفحة المبيعات (Sales)' },
  { value: 'Order Form', en: 'Order Form', ar: 'نموذج الطلب (Order Form)' },
  { value: 'Thank You', en: 'Thank You Page', ar: 'صفحة الشكر / تحميل الصفحة' },
  { value: 'Upsell', en: 'Upsell Offer', ar: 'عرض إضافي (Upsell)' },
  { value: 'Booking', en: 'Booking Page', ar: 'صفحة حجز موعد' },
];

function stepIcon(stepType?: string) {
  const cat = normalizeStepCategory(stepType);
  if (cat === 'Order Form') return ShoppingCart;
  if (cat === 'Thank You') return CheckCircle2;
  if (cat === 'Sales') return Layers;
  return Search;
}

function stepTypeLabel(stepType: string | undefined, ar: boolean): string {
  const found = STEP_TYPE_OPTIONS.find(
    o => o.value.toLowerCase() === (stepType || '').trim().toLowerCase()
  );
  if (found) return ar ? found.ar : translateText(found.en);
  const cat = normalizeStepCategory(stepType);
  if (ar) {
    return cat === 'Order Form'
      ? 'نموذج الطلب'
      : cat === 'Thank You'
        ? 'صفحة الشكر'
        : cat === 'Sales'
          ? 'صفحة المبيعات'
          : 'صفحة الاشتراك';
  }
  return translateText(stepType || cat);
}

export function FunnelStepWorkspace({
  asset,
  activePage,
  selected,
  editPage,
  movePage,
  open,
  pageActions,
  updateAsset,
}: {
  asset: Asset;
  activePage?: BuilderPage;
  selected: (id: string) => void;
  editPage: (page: BuilderPage) => void;
  movePage: (from: string, to: string) => void;
  open: (dialog: Dialog) => void;
  pageActions: (page: BuilderPage) => { label: string; onSelect: () => void }[];
  updateAsset: (id: string, update: (a: Asset) => Asset) => void | Promise<unknown>;
}) {
  const lang = useUILanguage();
  const ar = lang.startsWith('ar');
  const t = (en: string, arabic: string) => (ar ? arabic : translateText(en));
  const tenant = useSelector((s: RootState) => s.auth.tenant);
  const globalTheme = useSelector((s: RootState) => s.ui.theme);
  const isDark = globalTheme === 'dark';

  const [subTab, setSubTab] = useState<StepSubTab>('Configuration');
  const [viewingInactive, setViewingInactive] = useState(false);
  const [changingTemplate, setChangingTemplate] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<'Step' | FunnelTemplateCategory | 'All'>('Step');
  const [templateSearch, setTemplateSearch] = useState('');
  const [previewTpl, setPreviewTpl] = useState<{ title: string; page: BuilderPage; color: string } | null>(null);
  const [range, setRange] = useState(() => rangeFor(30));
  const [draggedId, setDraggedId] = useState('');

  // Collapsible sections in Configuration
  const [affiliateOpen, setAffiliateOpen] = useState(true);
  const [salesLimitOpen, setSalesLimitOpen] = useState(false);

  // Modals for Add Step, Coupon, Order Bump, Automation Rule
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepType, setNewStepType] = useState('Opt-in');
  const [newStepSlug, setNewStepSlug] = useState('');

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponAmount, setCouponAmount] = useState('20');

  const [bumpModalOpen, setBumpModalOpen] = useState(false);
  const [bumpTitle, setBumpTitle] = useState('');
  const [bumpPrice, setBumpPrice] = useState('19');
  const [bumpDesc, setBumpDesc] = useState('');

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleTrigger, setRuleTrigger] = useState<FunnelAutomationRule['trigger']>('form_subscribed');
  const [ruleAction, setRuleAction] = useState<FunnelAutomationRule['action']>('add_tag');
  const [ruleTarget, setRuleTarget] = useState('');

  const { templates: globalTemplates } = useGlobalFunnelTemplates({ includeDrafts: false, language: lang });
  const catalogPageTemplates = usePageTemplateCatalog();
  const products = useEntities<{ id: string; name: string; price?: number; type?: string }>('products');
  const events = useEntities<BusinessEvent>('events');
  const leads = useEntities<CanonicalLead>('leads');
  const orders = useEntities<{ id: string; amount?: number; total?: number; currency?: string; customerName?: string; customerEmail?: string; productName?: string; status?: string; createdAt?: string; assetId?: string; funnelId?: string }>('orders');

  const funnelCurrency = asset.currency || asset.document.funnel.currency || 'EUR';
  const defaultDomainHost = useMemo(() => {
    const slug = (tenant?.name || tenant?.id || 'workspace')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24);
    return asset.domain || `${slug || 'workspace'}.upklick.app`;
  }, [asset.domain, tenant?.id, tenant?.name]);

  const pages = asset.document.pages;
  const steps = asset.document.steps;
  const currentStep = steps.find(s => s.pageId === activePage?.id);
  const currentStepCategory = normalizeStepCategory(
    activePage?.stepCategory || currentStep?.category || currentStep?.type
  );
  const inactivePage = asset.document.inactivePage ?? createDefaultInactivePage(asset.name);
  const funnelActive = asset.document.funnel.funnelActive !== false;

  const needsTemplateSelection =
    !viewingInactive &&
    Boolean(activePage) &&
    (activePage?.templateSelected === false || changingTemplate);

  const stepHasLeadCapture = useMemo(
    () => Boolean(activePage && hasLeadCaptureElement(activePage)),
    [activePage]
  );

  const updateCurrentPage = (updater: (p: BuilderPage) => BuilderPage) => {
    if (!activePage) return;
    void updateAsset(asset.id, cur => ({
      ...cur,
      updated: new Date().toISOString(),
      document: {
        ...cur.document,
        pages: cur.document.pages.map(p => (p.id === activePage.id ? updater(p) : p)),
      },
    }));
  };

  const updateStepConfig = (patch: Partial<FunnelStepConfiguration>) => {
    updateCurrentPage(p => ({
      ...p,
      stepConfig: {
        ...(p.stepConfig || {}),
        ...patch,
      },
    }));
  };

  const updateInactivePage = (updater: (p: BuilderPage) => BuilderPage) => {
    void updateAsset(asset.id, cur => ({
      ...cur,
      updated: new Date().toISOString(),
      document: {
        ...cur.document,
        inactivePage: updater(cur.document.inactivePage ?? createDefaultInactivePage(cur.name)),
      },
    }));
  };

  const handleSelectGlobalTemplate = (tpl: LocalizedGlobalFunnelTemplate) => {
    if (!activePage) return;
    const idx = pages.findIndex(p => p.id === activePage.id);
    const nextPageId = pages[idx + 1]?.id;
    const cloned = cloneTemplateIntoStep(activePage, tpl.page, nextPageId);
    void updateAsset(asset.id, cur => ({
      ...cur,
      updated: new Date().toISOString(),
      settings: { ...cur.settings, color: tpl.color || cur.settings.color },
      document: {
        ...cur.document,
        pages: cur.document.pages.map(p => (p.id === activePage.id ? cloned : p)),
        steps: cur.document.steps.map(s =>
          s.pageId === activePage.id ? { ...s, templateSelected: true } : s
        ),
      },
    }));
    setChangingTemplate(false);
    showToast.success(t('Template applied to funnel step!', 'تم تطبيق القالب على الخطوة بنجاح!'));
  };

  const handleStartBlankStep = () => {
    if (!activePage) return;
    void updateAsset(asset.id, cur => ({
      ...cur,
      updated: new Date().toISOString(),
      document: {
        ...cur.document,
        pages: cur.document.pages.map(p =>
          p.id === activePage.id ? { ...p, templateSelected: true } : p
        ),
        steps: cur.document.steps.map(s =>
          s.pageId === activePage.id ? { ...s, templateSelected: true } : s
        ),
      },
    }));
    setChangingTemplate(false);
  };

  const handleCreateStep = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newStepName.trim();
    if (!cleanName) return;
    const rawSlug =
      newStepSlug.trim() ||
      `/${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `step-${pages.length + 1}`}`;
    const normalizedPath = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`;
    const uniquePath = pages.some(p => p.path === normalizedPath)
      ? `${normalizedPath}-${pages.length + 1}`
      : normalizedPath;
    const pageId = crypto.randomUUID();
    const newPage = buildDefaultStepPage({
      id: pageId,
      name: cleanName,
      path: uniquePath,
      stepType: newStepType,
      templateSelected: false,
    });
    const newStep: FunnelStep = {
      id: crypto.randomUUID(),
      label: cleanName,
      pageId,
      type: newStepType,
      category: normalizeStepCategory(newStepType),
      templateSelected: false,
    };
    void updateAsset(asset.id, cur => ({
      ...cur,
      updated: new Date().toISOString(),
      document: {
        ...cur.document,
        pages: [...cur.document.pages, newPage],
        steps: [...cur.document.steps, newStep],
        funnel: {
          ...cur.document.funnel,
          pagesFlow: [...cur.document.pages.map(p => p.id), pageId],
          status: 'Draft',
        },
      },
    }));
    setViewingInactive(false);
    selected(pageId);
    setSubTab('Configuration');
    setAddStepOpen(false);
    setNewStepName('');
    setNewStepSlug('');
    showToast.success(t('Funnel step added', 'تمت إضافة الخطوة بنجاح'));
  };

  // Merge Global Funnel Templates + existing Catalog templates converted to step cards
  const galleryTemplates = useMemo(() => {
    const targetCategory =
      templateFilter === 'Step' ? currentStepCategory : templateFilter === 'All' ? null : templateFilter;

    const list: LocalizedGlobalFunnelTemplate[] = [...globalTemplates];
    for (const ct of catalogPageTemplates) {
      if (ct.mode !== 'funnel' || !ct.builderDocument?.pages?.length) continue;
      if (list.some(item => item.id === `cat-${ct.id}`)) continue;
      const catPage = ct.builderDocument.pages[0];
      const inferredCat: FunnelTemplateCategory = normalizeStepCategory(
        catPage.stepCategory || ct.goal
      );
      list.push({
        id: `cat-${ct.id}`,
        category: inferredCat,
        status: 'Published',
        active: true,
        title_en: ct.name,
        title_ar: ct.name,
        description_en: ct.description || ct.body || '',
        description_ar: ct.description || ct.body || '',
        tags_en: ct.tags || [ct.industry],
        tags_ar: ct.tags || [ct.industry],
        thumbnail: ct.thumbnail || ct.image || '',
        color: ct.color || '#6366f1',
        page_en: catPage,
        page_ar: catPage,
        title: ct.name,
        description: ct.description || ct.body || '',
        categoryLabel: globalTemplateCategoryLabel(inferredCat, ar),
        tags: ct.tags || [],
        page: catPage,
      });
    }

    return list.filter(tpl => {
      if (targetCategory && tpl.category !== targetCategory) return false;
      if (templateSearch.trim()) {
        const q = templateSearch.trim().toLowerCase();
        const hay = `${tpl.title} ${tpl.description} ${tpl.categoryLabel} ${tpl.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [globalTemplates, catalogPageTemplates, templateFilter, currentStepCategory, templateSearch, ar]);

  // Stats computation
  const scopedEvents = useMemo(() => assetEvents(asset, events, range), [asset, events, range]);
  const capturedLeads = useMemo(() => funnelLeads(asset, leads, events), [asset, leads, events]);
  const funnelOrders = useMemo(
    () =>
      orders.filter(
        o => o.assetId === asset.id || o.funnelId === asset.id
      ),
    [orders, asset.id]
  );
  const totalSalesAmount = useMemo(
    () => funnelOrders.reduce((sum, o) => sum + (Number(o.amount ?? o.total ?? 0) || 0), 0),
    [funnelOrders]
  );
  const avgCartValue = funnelOrders.length ? totalSalesAmount / funnelOrders.length : 0;

  const deadline: FunnelDeadlineSettings = asset.document.funnel.deadlineSettings ?? {
    enabled: false,
    days: 5,
    redirectStepId: '__inactive__',
    expireAtTimeEnabled: false,
    expireAtTime: '23:59',
    enabledStepIds: [],
  };

  const [draftDeadline, setDraftDeadline] = useState<FunnelDeadlineSettings>(deadline);

  const saveDeadlineSettings = () => {
    void updateAsset(asset.id, cur => ({
      ...cur,
      updated: new Date().toISOString(),
      document: {
        ...cur.document,
        funnel: {
          ...cur.document.funnel,
          deadlineSettings: draftDeadline,
        },
      },
    }));
    showToast.success(t('Deadline settings saved', 'تم حفظ إعدادات الموعد النهائي'));
  };

  const stepCfg: FunnelStepConfiguration = activePage?.stepConfig ?? {};
  const coupons = stepCfg.coupons ?? [];
  const orderBumps = stepCfg.orderBumps ?? [];
  const automationRules = stepCfg.automationRules ?? [];
  const abTest = stepCfg.abTest ?? { enabled: false, trafficSplit: 50, goal: 'optin' as const };

  const copyStepUrl = async (slugPath: string) => {
    const fullUrl = `https://${defaultDomainHost}${slugPath.startsWith('/') ? slugPath : `/${slugPath}`}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      showToast.success(t('Step link copied to clipboard', 'تم نسخ رابط الخطوة'));
    } catch {
      window.prompt('Copy URL', fullUrl);
    }
  };

  const subTabs: { id: StepSubTab; label: string; icon: typeof Settings }[] = [
    { id: 'Configuration', label: t('Configuration', 'الإعدادات'), icon: Settings },
    { id: 'Automation Rules', label: t('Automation Rules', 'قواعد التشغيل الآلي'), icon: Sparkles },
    { id: 'A/B Test', label: t('A/B Test', 'A/B test'), icon: FlaskConical },
    { id: 'Stats', label: t('Stats', 'الإحصائيات'), icon: BarChart3 },
    { id: 'Leads', label: t('Leads', 'العملاء'), icon: Users },
    { id: 'Sales', label: t('Sales', 'المبيعات'), icon: DollarSign },
    { id: 'Deadline Settings', label: t('Deadline Settings', 'إعدادات الموعد النهائي'), icon: Clock },
    { id: 'Integrations', label: t('Integrations', 'التكاملات'), icon: Zap },
  ];

  return (
    <div className={`sys-workspace ${isDark ? 'is-dark' : ''}`} dir={ar ? 'rtl' : 'ltr'}>
      {/* Left/Start Sidebar: Funnel Steps + Fallback Inactive Page */}
      <aside className="sys-steps-sidebar" aria-label={t('Funnel steps', 'خطوات المسار')}>
        <div className="sys-sidebar-head">
          <strong>{t('Steps', 'خطوات')}</strong>
          <span className="sys-step-count">{pages.length}</span>
        </div>

        <div className="sys-step-list">
          {pages.map((page, idx) => {
            const st = steps.find(s => s.pageId === page.id);
            const Icon = stepIcon(page.stepCategory || st?.category || st?.type);
            const isSelected = !viewingInactive && activePage?.id === page.id;
            const unconfigured = page.templateSelected === false;
            return (
              <div
                key={page.id}
                draggable
                onDragStart={e => {
                  setDraggedId(page.id);
                  e.dataTransfer.setData('text/gos-page', page.id);
                }}
                onDragEnd={() => setDraggedId('')}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const from = e.dataTransfer.getData('text/gos-page') || draggedId;
                  if (from && from !== page.id) movePage(from, page.id);
                  setDraggedId('');
                }}
                className={`sys-step-item aw-step-card ${isSelected ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="sys-step-select-btn"
                  onClick={() => {
                    setViewingInactive(false);
                    setChangingTemplate(false);
                    selected(page.id);
                  }}
                >
                  <span className="sys-step-icon">
                    <Icon size={16} />
                  </span>
                  <span className="sys-step-meta">
                    <b className="sys-step-name">{page.name}</b>
                    <small className="sys-step-type">
                      {stepTypeLabel(page.stepCategory || st?.type, ar)}
                      {unconfigured && (
                        <AlertTriangle
                          size={12}
                          className="sys-step-warn"
                          aria-label={t('Template not selected yet', 'لم يتم اختيار قالب بعد')}
                        />
                      )}
                    </small>
                  </span>
                  <span className="sys-step-index">{idx + 1}</span>
                </button>
                <div className="sys-step-menu" onClick={e => e.stopPropagation()}>
                  <OptionsMenu
                    label={formatDisplayMessage('Options for {{0}}', page.name)}
                    actions={pageActions(page)}
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="sys-add-step-btn"
            onClick={() => {
              setNewStepName('');
              setNewStepSlug('');
              setNewStepType('Opt-in');
              setAddStepOpen(true);
            }}
          >
            <Plus size={15} />
            <span>{t('Add step', 'أضف خطوة')}</span>
          </button>
        </div>

        <div className="sys-fallback-section">
          <div className="sys-fallback-title">{t('Fallback', 'البديل')}</div>
          <button
            type="button"
            className={`sys-inactive-btn ${viewingInactive ? 'active' : ''}`}
            onClick={() => setViewingInactive(true)}
          >
            <span className="sys-step-icon is-inactive">
              <Ban size={16} />
            </span>
            <span className="sys-step-meta">
              <b className="sys-step-name">{t('Inactive Page', 'صفحة غير نشطة')}</b>
              <small className="sys-step-type">
                {t(
                  'Displayed when the funnel is disabled',
                  'يتم عرض هذه الصفحة عند تعطيل المسار'
                )}
              </small>
            </span>
          </button>
        </div>
      </aside>

      {/* Main Step Workspace Content */}
      <div className="sys-main-panel">
        {viewingInactive ? (
          <section className="sys-card sys-inactive-workspace">
            <header className="sys-section-header">
              <div>
                <h2>{t('Inactive Funnel Fallback Page', 'صفحة المسار غير النشط (البديل)')}</h2>
                <p>
                  {t(
                    'Visitors see this fallback page automatically whenever this funnel is paused or a deadline expires.',
                    'يتم عرض هذه الصفحة تلقائياً للزوار عند تعطيل المسار أو انتهاء صلاحية الموعد النهائي.'
                  )}
                </p>
              </div>
              <div className="sys-step-toolbar">
                <button
                  type="button"
                  className="aw-secondary"
                  onClick={() =>
                    setPreviewTpl({
                      title: inactivePage.name,
                      page: inactivePage,
                      color: asset.settings.color || '#6366f1',
                    })
                  }
                >
                  <Eye size={15} />
                  {t('Preview', 'معاينة')}
                </button>
                <button
                  type="button"
                  className="aw-primary"
                  onClick={() => editPage({ ...inactivePage, id: '__inactive__' })}
                >
                  <Pencil size={14} />
                  {t('Edit Inactive Page', 'تعديل الصفحة غير النشطة')}
                </button>
              </div>
            </header>

            <div className="sys-toggle-banner">
              <div>
                <strong>{t('Funnel Active Status', 'حالة تفعيل المسار')}</strong>
                <small>
                  {funnelActive
                    ? t('Funnel is active and accepting live traffic.', 'المسار نشط حالياً ويستقبل الزوار.')
                    : t(
                        'Funnel is disabled — all steps currently show the Inactive Page.',
                        'المسار معطّل حالياً — يتم توجيه الزوار إلى الصفحة غير النشطة.'
                      )}
                </small>
              </div>
              <label className="sys-switch">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={t('Funnel active status', 'حالة تفعيل المسار')}
                  checked={funnelActive}
                  onChange={e =>
                    void updateAsset(asset.id, cur => ({
                      ...cur,
                      updated: new Date().toISOString(),
                      document: {
                        ...cur.document,
                        funnel: {
                          ...cur.document.funnel,
                          funnelActive: e.target.checked,
                        },
                      },
                    }))
                  }
                />
                <span className="sys-switch-slider" />
              </label>
            </div>

            <div className="sys-config-grid">
              <label className="sys-field">
                <span>{t('Fallback Page Name', 'اسم الصفحة البديلة')}</span>
                <input
                  value={inactivePage.name}
                  onChange={e => updateInactivePage(p => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label className="sys-field">
                <span>{t('URL Path', 'مسار الرابط')}</span>
                <div className="sys-url-group" dir="ltr">
                  <span className="sys-url-prefix">https://{defaultDomainHost}</span>
                  <input
                    value={inactivePage.path}
                    onChange={e =>
                      updateInactivePage(p => ({
                        ...p,
                        path: e.target.value.startsWith('/') ? e.target.value : `/${e.target.value}`,
                      }))
                    }
                  />
                </div>
              </label>
            </div>
          </section>
        ) : (
          <>
            {/* Horizontal Step Sub-Tabs */}
            <nav className="sys-subtabs" role="tablist" aria-label={t('Step workspace tabs', 'تبويبات الخطوة')}>
              {subTabs.map(tabItem => {
                const Icon = tabItem.icon;
                const active = subTab === tabItem.id;
                return (
                  <button
                    key={tabItem.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`sys-subtab-btn ${active ? 'active' : ''}`}
                    onClick={() => setSubTab(tabItem.id)}
                  >
                    <Icon size={15} />
                    <span>{tabItem.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Tab Panels */}
            {subTab === 'Configuration' && (
              pages.length === 0 ? (
                <section className="sys-card sys-empty-steps">
                  <Wand2 size={34} className="sys-empty-icon" />
                  <h3>{t('Your custom funnel workspace is ready', 'مساحة المسار المخصص جاهزة للبدء')}</h3>
                  <p>
                    {t(
                      'Add your first step (Opt-in, Sales, Order Form, or Thank You) to pick a template or build from scratch.',
                      'أضف خطوتك الأولى (صفحة اشتراك، صفحة مبيعات، نموذج طلب، أو صفحة شكر) لاختيار قالب جاهز أو التصميم من الصفر.'
                    )}
                  </p>
                  <button
                    type="button"
                    className="aw-primary"
                    onClick={() => setAddStepOpen(true)}
                  >
                    <Plus size={15} />
                    {t('Add First Step', 'أضف الخطوة الأولى')}
                  </button>
                </section>
              ) : needsTemplateSelection && activePage ? (
                <section className="sys-template-picker-wrap">
                  <header className="sys-picker-header">
                    <div>
                      <h2>
                        {activePage.name}{' '}
                        <span className="sys-cat-pill">
                          {globalTemplateCategoryLabel(currentStepCategory, ar)}
                        </span>
                      </h2>
                      <p>
                        {t(
                          'Select a ready-to-use template to clone into this step, or start from a blank canvas.',
                          'اختر قالباً جاهزاً لنسخه في هذه الخطوة، أو ابدأ من صفحة فارغة.'
                        )}
                      </p>
                    </div>
                    <div className="sys-step-toolbar">
                      {changingTemplate && (
                        <button
                          type="button"
                          className="aw-secondary"
                          onClick={() => setChangingTemplate(false)}
                        >
                          {t('Keep Current Design', 'الاحتفاظ بالتصميم الحالي')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="aw-secondary"
                        onClick={handleStartBlankStep}
                      >
                        <FileText size={14} />
                        {t('Skip & Configure Step', 'تخطي والانتقال للإعدادات')}
                      </button>
                      <button
                        type="button"
                        className="aw-primary"
                        onClick={() => {
                          handleStartBlankStep();
                          editPage(activePage);
                        }}
                      >
                        <Pencil size={14} />
                        {t('Edit Step', 'تعديل الصفحة')}
                      </button>
                    </div>
                  </header>

                  <div className="sys-picker-filters">
                    <div className="sys-filter-pills" role="tablist">
                      {(
                        [
                          { id: 'Step', label: t(`Recommended (${currentStepCategory})`, `مقترح (${globalTemplateCategoryLabel(currentStepCategory, true)})`) },
                          { id: 'All', label: t('All Templates', 'كل القوالب') },
                          { id: 'Opt-in', label: t('Opt-in', 'صفحة الاشتراك') },
                          { id: 'Sales', label: t('Sales', 'المبيعات') },
                          { id: 'Order Form', label: t('Order Form', 'نموذج الطلب') },
                          { id: 'Thank You', label: t('Thank You', 'صفحة الشكر') },
                        ] as const
                      ).map(pill => (
                        <button
                          key={pill.id}
                          type="button"
                          className={`sys-pill ${templateFilter === pill.id ? 'active' : ''}`}
                          onClick={() => setTemplateFilter(pill.id)}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>

                    <label className="sys-tpl-search">
                      <Search size={14} />
                      <input
                        value={templateSearch}
                        onChange={e => setTemplateSearch(e.target.value)}
                        placeholder={t('Search templates...', 'ابحث في القوالب...')}
                      />
                    </label>
                  </div>

                  <div className="sys-tpl-grid">
                    {galleryTemplates.map(tpl => (
                      <article key={tpl.id} className="sys-tpl-card">
                        <div
                          className="sys-tpl-preview-box"
                          style={{ background: tpl.page?.backgroundColor || '#f8fafc' }}
                        >
                          <StepTemplateThumbnail tpl={tpl} language={lang} />
                          <div className="sys-tpl-hover-actions">
                            <button
                              type="button"
                              className="sys-tpl-select-btn"
                              onClick={() => handleSelectGlobalTemplate(tpl)}
                            >
                              <Check size={15} />
                              {t('Select', 'تحديد')}
                            </button>
                            <a
                              className="sys-tpl-preview-btn"
                              href={`/template-preview/${encodeURIComponent(tpl.id)}?${new URLSearchParams({
                                source: 'step',
                                lang: ar ? 'ar' : 'en',
                              })}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye size={15} />
                              {t('Preview template', 'معاينة النموذج')}
                            </a>
                          </div>
                        </div>
                        <div className="sys-tpl-card-foot">
                          <div>
                            <strong>{tpl.title}</strong>
                            <small>{tpl.categoryLabel}</small>
                          </div>
                          <button
                            type="button"
                            className="aw-secondary sys-use-inline"
                            onClick={() => handleSelectGlobalTemplate(tpl)}
                          >
                            {t('Select', 'تحديد')}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : activePage ? (
                <div className="sys-step-config-stack">
                  {/* Primary Step Card: Name + URL Path + Visual Editor Launch */}
                  <section className="sys-card">
                    <div className="sys-step-action-row">
                      <div>
                        <span className="sys-cat-pill">
                          {stepTypeLabel(activePage.stepCategory || currentStep?.type, ar)}
                        </span>
                      </div>
                      <div className="sys-step-toolbar">
                        <button
                          type="button"
                          className="aw-secondary"
                          onClick={() => setChangingTemplate(true)}
                        >
                          <Layers size={14} />
                          {t('Change Template', 'تغيير القالب')}
                        </button>
                        <button
                          type="button"
                          className="aw-secondary"
                          onClick={() => open({ type: 'preview', assetId: asset.id, pageId: activePage.id })}
                        >
                          <Eye size={14} />
                          {t('Preview Step', 'معاينة الخطوة')}
                        </button>
                        <button
                          type="button"
                          className="aw-primary"
                          onClick={() => editPage(activePage)}
                        >
                          <Pencil size={14} />
                          {t('Edit Step', 'تعديل الخطوة')}
                        </button>
                      </div>
                    </div>

                    <div className="sys-config-stack-fields">
                      <label className="sys-field">
                        <span>
                          {t('Name', 'الاسم')} <em className="sys-req">*</em>
                        </span>
                        <input
                          value={activePage.name}
                          onChange={e => {
                            const val = e.target.value;
                            void updateAsset(asset.id, cur => ({
                              ...cur,
                              updated: new Date().toISOString(),
                              document: {
                                ...cur.document,
                                pages: cur.document.pages.map(p =>
                                  p.id === activePage.id ? { ...p, name: val } : p
                                ),
                                steps: cur.document.steps.map(s =>
                                  s.pageId === activePage.id ? { ...s, label: val } : s
                                ),
                              },
                            }));
                          }}
                        />
                      </label>

                      <label className="sys-field">
                        <span>
                          {t('URL Path', 'مسار وصول الرابط')} <em className="sys-req">*</em>
                        </span>
                        <div className="sys-url-group" dir="ltr">
                          <span className="sys-url-prefix">https://{defaultDomainHost}/</span>
                          <input
                            aria-label={t('URL Path', 'مسار وصول الرابط')}
                            value={activePage.path.replace(/^\//, '')}
                            onChange={e => {
                              const cleaned = e.target.value.replace(/[^a-zA-Z0-9/_-]/g, '');
                              updateCurrentPage(p => ({ ...p, path: `/${cleaned}` }));
                            }}
                          />
                          <button
                            type="button"
                            className="sys-copy-url-btn"
                            onClick={() => void copyStepUrl(activePage.path)}
                            title={t('Copy step link', 'نسخ الرابط')}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </label>
                    </div>
                  </section>

                  {/* Requirement 3: Conditional CRM Lead Routing ONLY when active step contains a Form or Booking Calendar */}
                  {stepHasLeadCapture && (
                    <section className="sys-card sys-crm-conditional-card" data-testid="funnel-step-crm-routing">
                      <CRMRouting
                        value={activePage.crmRouting ?? asset.crmRouting}
                        onChange={crmRouting =>
                          updateCurrentPage(p => ({
                            ...p,
                            crmRouting,
                          }))
                        }
                      />
                    </section>
                  )}

                  {/* Affiliate Commissions Card */}
                  <section className="sys-card sys-collapsible">
                    <button
                      type="button"
                      className="sys-collapse-trigger"
                      onClick={() => setAffiliateOpen(v => !v)}
                    >
                      <span className="sys-collapse-left">
                        <span className="sys-collapse-icon">
                          <Percent size={16} />
                        </span>
                        <span>
                          <strong>{t('Affiliate Commissions', 'عمولات المسوقين بالعمولة')}</strong>
                          <small>
                            {t(
                              'Reward affiliates who refer sales on this funnel step',
                              'كافئ المسوقين بالعمولة الذين ساهموا في تحقيق هذا البيع'
                            )}
                          </small>
                        </span>
                      </span>
                      {affiliateOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {affiliateOpen && (
                      <div className="sys-config-grid sys-collapse-body">
                        <label className="sys-field">
                          <span>
                            {t('Affiliate commission (%)', 'عمولات المسوقين بالعمولة')} <em className="sys-req">*</em>
                          </span>
                          <div className="sys-suffix-input" dir="ltr">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={stepCfg.affiliateCommission ?? 0}
                              onChange={e =>
                                updateStepConfig({
                                  affiliateEnabled: Number(e.target.value) > 0,
                                  affiliateCommission: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                                })
                              }
                            />
                            <span>%</span>
                          </div>
                        </label>
                        <label className="sys-field">
                          <span>
                            {t('Payout delay (days)', 'تأخير دفع العمولة')} <em className="sys-req">*</em>
                          </span>
                          <div className="sys-suffix-input" dir="ltr">
                            <input
                              type="number"
                              min={0}
                              max={365}
                              value={stepCfg.affiliatePayoutDelayDays ?? 30}
                              onChange={e =>
                                updateStepConfig({
                                  affiliatePayoutDelayDays: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                            />
                            <span>{t('days', 'أيام')}</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </section>

                  {/* Sales Limit Card */}
                  <section className="sys-card sys-collapsible">
                    <button
                      type="button"
                      className="sys-collapse-trigger"
                      onClick={() => setSalesLimitOpen(v => !v)}
                    >
                      <span className="sys-collapse-left">
                        <span className="sys-collapse-icon">
                          <Ban size={16} />
                        </span>
                        <span>
                          <strong>{t('Sales Limit', 'حد المبيعات')}</strong>
                          <small>
                            {t(
                              'Cap total purchases and redirect once the limit is reached',
                              'حدّ عمليات الشراء وإعادة التوجيه عند بلوغ الحد'
                            )}
                          </small>
                        </span>
                      </span>
                      {salesLimitOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {salesLimitOpen && (
                      <div className="sys-config-grid sys-collapse-body">
                        <label className="sys-field">
                          <span>{t('Maximum units / enrollments', 'الحد الأقصى للمبيعات')}</span>
                          <input
                            type="number"
                            min={0}
                            placeholder={t('Unlimited', 'غير محدود')}
                            value={stepCfg.maxSales ?? ''}
                            onChange={e =>
                              updateStepConfig({
                                salesLimitEnabled: Number(e.target.value) > 0,
                                maxSales: Number(e.target.value) || undefined,
                              })
                            }
                          />
                        </label>
                        <label className="sys-field">
                          <span>{t('Redirect when sold out', 'إعادة التوجيه عند النفاد')}</span>
                          <AssetSelect
                            label="Sold out redirect"
                            value={stepCfg.salesLimitRedirectStepId ?? '__inactive__'}
                            options={[
                              { value: '__inactive__', label: t('Inactive Page', 'صفحة غير نشطة') },
                              ...pages
                                .filter(p => p.id !== activePage.id)
                                .map(p => ({ value: p.id, label: p.name, preserveLabel: true })),
                            ]}
                            onChange={val => updateStepConfig({ salesLimitRedirectStepId: val })}
                          />
                        </label>
                      </div>
                    )}
                  </section>

                  {/* Offer Type: Digital Product vs Physical Product */}
                  <section className="sys-offer-type-block">
                    <h3 className="sys-block-label">{t('Choose Offer Type', 'اختر نوع العرض')}</h3>
                    <div className="sys-offer-radios" role="radiogroup" aria-label={t('Offer Type', 'نوع العرض')}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={stepCfg.offerType === 'digital'}
                        className={`sys-offer-card ${stepCfg.offerType === 'digital' ? 'active' : ''}`}
                        onClick={() => updateStepConfig({ offerType: 'digital' })}
                      >
                        <span className="sys-collapse-icon">
                          <Laptop size={18} />
                        </span>
                        <div className="sys-offer-copy">
                          <strong>{t('Digital Product', 'منتج رقمي')}</strong>
                          <small>
                            {t(
                              'Courses, training bundles, digital files, communities, memberships',
                              'الدورات التدريبية، باقات الدورات، الملفات الرقمية، المجتمعات، الأوسمة'
                            )}
                          </small>
                        </div>
                        <span className={`sys-radio-dot ${stepCfg.offerType === 'digital' ? 'checked' : ''}`} />
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={stepCfg.offerType === 'physical'}
                        className={`sys-offer-card ${stepCfg.offerType === 'physical' ? 'active' : ''}`}
                        onClick={() => updateStepConfig({ offerType: 'physical' })}
                      >
                        <span className="sys-collapse-icon">
                          <Package size={18} />
                        </span>
                        <div className="sys-offer-copy">
                          <strong>{t('Physical Product', 'منتج مادي')}</strong>
                          <small>
                            {t(
                              'Tangible goods that require shipping to the customer',
                              'السلع التي يتم شحنها إلى العميل'
                            )}
                          </small>
                        </div>
                        <span className={`sys-radio-dot ${stepCfg.offerType === 'physical' ? 'checked' : ''}`} />
                      </button>
                    </div>

                    {stepCfg.offerType ? (
                      <div className="sys-card sys-offer-details">
                        <div className="sys-config-grid">
                          <label className="sys-field">
                            <span>
                              {stepCfg.offerType === 'digital'
                                ? t('Connected Digital Resource / Product', 'المنتج الرقمي المرتبط')
                                : t('Physical Product Name', 'اسم المنتج المادي')}
                            </span>
                            {products.length > 0 && stepCfg.offerType === 'digital' ? (
                              <AssetSelect
                                label="Connected product"
                                value={stepCfg.productId || ''}
                                options={[
                                  { value: '', label: t('Choose a workspace product...', 'اختر منتجاً من مساحة العمل...') },
                                  ...products.map(prod => ({
                                    value: prod.id,
                                    label: prod.name,
                                    preserveLabel: true,
                                  })),
                                ]}
                                onChange={prodId => {
                                  const found = products.find(p => p.id === prodId);
                                  updateStepConfig({
                                    productId: prodId,
                                    productName: found?.name || '',
                                    price: found?.price !== undefined ? String(found.price) : stepCfg.price,
                                  });
                                }}
                              />
                            ) : (
                              <input
                                value={stepCfg.productName || ''}
                                onChange={e => updateStepConfig({ productName: e.target.value })}
                                placeholder={t('Enter product or offer name', 'أدخل اسم المنتج أو العرض')}
                              />
                            )}
                          </label>
                          <label className="sys-field">
                            <span>
                              {t('Offer Price', 'سعر العرض')} ({funnelCurrency})
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={stepCfg.price || ''}
                              onChange={e => updateStepConfig({ price: e.target.value })}
                              placeholder="0.00"
                              dir="ltr"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="sys-offer-hint">
                        <Sparkles size={15} />
                        <div>
                          <strong>{t('Select an offer type to attach resources', 'اختر نوع العرض للمتابعة')}</strong>
                          <small>
                            {t(
                              'Attach a digital course/file or physical product so visitors can purchase on this step.',
                              'قم بإرفاق منتج رقمي أو مادي ليتمكن الزوار من إتمام الشراء في هذه الصفحة.'
                            )}
                          </small>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Coupons Card */}
                  <section className="sys-card">
                    <div className="sys-row-between">
                      <div className="sys-collapse-left">
                        <span className="sys-collapse-icon">
                          <Tag size={16} />
                        </span>
                        <div>
                          <strong>{t('Coupons', 'الكوبونات')}</strong>
                          <small>
                            {t(
                              'Offer promotional discounts during checkout',
                              'قدّم خصومات عند إتمام عملية الدفع'
                            )}
                          </small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="sys-icon-add-btn"
                        aria-label={t('Add coupon', 'إضافة كوبون')}
                        onClick={() => setCouponModalOpen(true)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {coupons.length > 0 && (
                      <div className="sys-items-list">
                        {coupons.map(c => (
                          <div key={c.id} className="sys-list-item">
                            <div>
                              <strong dir="ltr">{c.code}</strong>
                              <small>
                                {c.discountType === 'percentage'
                                  ? `${c.amount}% ${t('off', 'خصم')}`
                                  : `${formatCurrencyAmount(c.amount, funnelCurrency)} ${t('off', 'خصم')}`}
                              </small>
                            </div>
                            <button
                              type="button"
                              className="sys-remove-btn"
                              aria-label={t('Remove coupon', 'حذف الكوبون')}
                              onClick={() =>
                                updateStepConfig({
                                  coupons: coupons.filter(item => item.id !== c.id),
                                })
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Order Bumps */}
                  <div className="sys-order-bump-bar">
                    {orderBumps.length > 0 && (
                      <div className="sys-items-list" style={{ marginBottom: 10 }}>
                        {orderBumps.map(b => (
                          <div key={b.id} className="sys-card sys-list-item">
                            <div>
                              <strong>{b.title}</strong>
                              <small>
                                +{formatCurrencyAmount(b.price, funnelCurrency)} · {b.description}
                              </small>
                            </div>
                            <button
                              type="button"
                              className="sys-remove-btn"
                              onClick={() =>
                                updateStepConfig({
                                  orderBumps: orderBumps.filter(item => item.id !== b.id),
                                })
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="aw-secondary sys-bump-btn"
                      onClick={() => setBumpModalOpen(true)}
                    >
                      <Plus size={14} />
                      {t('Add order bump', 'إضافة order bump')}
                    </button>
                  </div>
                </div>
              ) : null
            )}

            {/* Automation Rules Tab */}
            {subTab === 'Automation Rules' && (
              <section className="sys-card sys-automation-panel">
                {automationRules.length === 0 ? (
                  <div className="sys-empty-automation">
                    <span className="sys-empty-layers">
                      <Layers size={38} />
                    </span>
                    <h3>{t('No automation rules yet', 'لا توجد قواعد تشغيل آلي بعد')}</h3>
                    <p>
                      {t(
                        'Start by choosing a trigger event that launches your automated workflow.',
                        'ابدأ باختيار مشغّل؛ هذا هو الحدث الذي يبدأ تشغيلك الآلي'
                      )}
                    </p>
                    <button
                      type="button"
                      className="aw-primary"
                      onClick={() => setRuleModalOpen(true)}
                    >
                      <Plus size={15} />
                      {t('Add rule', 'أضف قاعدة')}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="sys-row-between" style={{ marginBottom: 14 }}>
                      <div>
                        <h3>{t('Step Automation Rules', 'قواعد التشغيل الآلي للخطوة')}</h3>
                        <small>{activePage?.name}</small>
                      </div>
                      <button
                        type="button"
                        className="aw-primary"
                        onClick={() => setRuleModalOpen(true)}
                      >
                        <Plus size={14} />
                        {t('Add rule', 'أضف قاعدة')}
                      </button>
                    </div>
                    <div className="sys-items-list">
                      {automationRules.map(rule => (
                        <div key={rule.id} className="sys-list-item">
                          <div>
                            <strong>
                              {rule.trigger === 'form_subscribed'
                                ? t('Funnel step form subscribed', 'عند الاشتراك في نموذج الخطوة')
                                : rule.trigger === 'new_sale'
                                  ? t('New sale completed', 'عند إتمام عملية بيع جديدة')
                                  : rule.trigger === 'booking_confirmed'
                                    ? t('Booking confirmed', 'عند تأكيد حجز موعد')
                                    : t('Page visited', 'عند زيارة الصفحة')}
                            </strong>
                            <small>
                              →{' '}
                              {rule.action === 'add_tag'
                                ? t('Add CRM tag', 'إضافة وسم للعميل')
                                : rule.action === 'send_email'
                                  ? t('Send email campaign', 'إرسال رسالة بريد إلكتروني')
                                  : rule.action === 'enroll_course'
                                    ? t('Enroll in course', 'منح صلاحية دورة تدريبية')
                                    : rule.action === 'send_whatsapp'
                                      ? t('Send WhatsApp message', 'إرسال رسالة واتساب')
                                      : t('Trigger webhook', 'إرسال Webhook')}{' '}
                              {rule.target ? `(${rule.target})` : ''}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="sys-remove-btn"
                            onClick={() =>
                              updateStepConfig({
                                automationRules: automationRules.filter(r => r.id !== rule.id),
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* A/B Test Tab */}
            {subTab === 'A/B Test' && activePage && (
              <section className="sys-card">
                <div className="sys-row-between" style={{ marginBottom: 16 }}>
                  <div>
                    <h3>{t('A/B Split Testing', 'اختبار A/B المقارن')}</h3>
                    <p>
                      {t(
                        'Compare two variants of this step to maximize opt-in or checkout conversions.',
                        'قارن بين نسختين من هذه الخطوة لمعرفة التصميم الأعلى تحويلاً.'
                      )}
                    </p>
                  </div>
                  <label className="sys-switch">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label={t('Enable A/B test', 'تفعيل اختبار A/B')}
                      checked={Boolean(abTest.enabled)}
                      onChange={e =>
                        updateStepConfig({
                          abTest: {
                            ...abTest,
                            enabled: e.target.checked,
                            startedAt: e.target.checked ? new Date().toISOString() : abTest.startedAt,
                          },
                        })
                      }
                    />
                    <span className="sys-switch-slider" />
                  </label>
                </div>

                <div className="sys-config-grid">
                  <label className="sys-field">
                    <span>{t('Variant B Challenger Page', 'الصفحة المنافسة (النسخة B)')}</span>
                    <AssetSelect
                      label="Variant B page"
                      value={abTest.variantPageId || ''}
                      options={[
                        { value: '', label: t('Choose a variant step...', 'اختر خطوة منافسة...') },
                        ...pages
                          .filter(p => p.id !== activePage.id)
                          .map(p => ({ value: p.id, label: p.name, preserveLabel: true })),
                      ]}
                      onChange={val => updateStepConfig({ abTest: { ...abTest, variantPageId: val } })}
                    />
                  </label>

                  <label className="sys-field">
                    <span>{t('Conversion Goal Metric', 'هدف التحويل الأساسي')}</span>
                    <AssetSelect
                      label="Conversion goal"
                      value={abTest.goal || 'optin'}
                      options={[
                        { value: 'optin', label: t('Opt-in / Lead Captured', 'تسجيل العميل (Opt-in)') },
                        { value: 'sale', label: t('Order / Completed Sale', 'إتمام عملية البيع') },
                        { value: 'next_step', label: t('Reached Next Step', 'الوصول للخطوة التالية') },
                      ]}
                      onChange={val =>
                        updateStepConfig({
                          abTest: { ...abTest, goal: val as 'optin' | 'sale' | 'next_step' },
                        })
                      }
                    />
                  </label>
                </div>

                <label className="sys-field" style={{ marginTop: 14 }}>
                  <span>
                    {t('Traffic Split', 'توزيع الزيارات')}: <b>{abTest.trafficSplit ?? 50}%</b>{' '}
                    {t('Original', 'الأصلية')} / <b>{100 - (abTest.trafficSplit ?? 50)}%</b>{' '}
                    {t('Variant B', 'النسخة B')}
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={abTest.trafficSplit ?? 50}
                    onChange={e =>
                      updateStepConfig({
                        abTest: { ...abTest, trafficSplit: Number(e.target.value) },
                      })
                    }
                  />
                </label>
              </section>
            )}

            {/* Stats Tab (Systeme.io Parity [cite: 18]) */}
            {subTab === 'Stats' && (
              <div className="sys-stats-stack">
                <div className="sys-stats-top">
                  <article className="sys-stat-card">
                    <small>{t('Total Sales', 'إجمالي المبيعات')}</small>
                    <strong dir="ltr">{formatCurrencyAmount(totalSalesAmount, funnelCurrency)}</strong>
                  </article>
                  <article className="sys-stat-card">
                    <small>{t('Average Cart Value', 'متوسط قيمة سلة التسوق')}</small>
                    <strong dir="ltr">{formatCurrencyAmount(avgCartValue, funnelCurrency)}</strong>
                  </article>
                  <div className="sys-stats-range">
                    <FunnelDateRange range={range} change={setRange} />
                  </div>
                </div>

                <section className="sys-card sys-stats-table-card">
                  <div className="aw-table-wrap">
                    <table className="sys-stats-table">
                      <thead>
                        <tr>
                          <th>{t('Step', 'خطوة')}</th>
                          <th>{t('Page Views', 'مشاهدات الصفحة')}</th>
                          <th>{t('Opt-ins', 'الاشتراكات')}</th>
                          <th>{t('Opt-in Rate', 'معدل التحويل')}</th>
                          <th>{t('Sales', 'المبيعات')}</th>
                          <th>{t('Revenue', 'ربح')}</th>
                          <th>{t('Earnings / View', 'الأرباح/مشاهدة الصفحة')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pages.map((p, idx) => {
                          const views = scopedEvents.filter(ev =>
                            ev.pageId
                              ? ev.pageId === p.id
                              : ev.step
                                ? ev.step === p.name
                                : idx === 0 && ['page.viewed', 'funnel.viewed', 'asset.viewed'].includes(ev.type)
                          ).length;
                          const optins = capturedLeads.filter(l => l.step === p.name).length;
                          const optinRate = views ? Math.round((optins / views) * 100) : 0;
                          const isOrderStep = normalizeStepCategory(p.stepCategory) === 'Order Form';
                          const stepSalesCount = isOrderStep ? funnelOrders.length : 0;
                          const stepRevenue = isOrderStep ? totalSalesAmount : 0;
                          const epv = views && stepRevenue ? stepRevenue / views : 0;
                          return (
                            <tr key={p.id}>
                              <td>
                                <b>{p.name}</b>
                              </td>
                              <td>{views}</td>
                              <td>{optins}</td>
                              <td>{optinRate}%</td>
                              <td>{stepSalesCount ? stepSalesCount : '—'}</td>
                              <td dir="ltr">
                                {stepSalesCount ? formatCurrencyAmount(stepRevenue, funnelCurrency) : '—'}
                              </td>
                              <td dir="ltr">
                                {epv > 0 ? formatCurrencyAmount(epv, funnelCurrency) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <FunnelAnalytics asset={asset} range={range} change={setRange} />
              </div>
            )}

            {/* Leads Tab */}
            {subTab === 'Leads' && <FunnelLeads asset={asset} />}

            {/* Sales Tab */}
            {subTab === 'Sales' && (
              <section className="sys-card">
                <div className="sys-row-between" style={{ marginBottom: 12 }}>
                  <div>
                    <h3>
                      {t('Funnel Sales', 'مبيعات المسار')} ({funnelOrders.length})
                    </h3>
                    <small>
                      {t('All completed and pending orders from ', 'جميع الطلبات المسجلة من ')}
                      {asset.name}
                    </small>
                  </div>
                  <strong dir="ltr">{formatCurrencyAmount(totalSalesAmount, funnelCurrency)}</strong>
                </div>
                {funnelOrders.length === 0 ? (
                  <div className="sys-empty-automation">
                    <ShoppingCart size={32} style={{ opacity: 0.45 }} />
                    <h3>{t('No sales recorded yet', 'لا توجد مبيعات مسجلة بعد')}</h3>
                    <p>
                      {t(
                        'Orders completed through your Order Form step appear here automatically.',
                        'ستظهر هنا جميع الطلبات المكتملة عبر خطوة نموذج الطلب تلقائياً.'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="aw-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('Customer', 'العميل')}</th>
                          <th>{t('Offer', 'العرض')}</th>
                          <th>{t('Amount', 'المبلغ')}</th>
                          <th>{t('Status', 'الحالة')}</th>
                          <th>{t('Date', 'التاريخ')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {funnelOrders.map(ord => (
                          <tr key={ord.id}>
                            <td>{ord.customerName || ord.customerEmail || 'Customer'}</td>
                            <td>{ord.productName || asset.name}</td>
                            <td dir="ltr">
                              {formatCurrencyAmount(
                                Number(ord.amount ?? ord.total ?? 0),
                                ord.currency || funnelCurrency
                              )}
                            </td>
                            <td>{localizeNode(ord.status || 'Completed')}</td>
                            <td>{String(ord.createdAt || '').slice(0, 10) || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Deadline Settings Tab (Systeme.io Parity [cite: 17]) */}
            {subTab === 'Deadline Settings' && (
              <div className="sys-deadline-stack">
                <div className="sys-row-between">
                  <h2>{t('Deadline Settings', 'إعدادات الموعد النهائي')}</h2>
                  <button type="button" className="aw-primary" onClick={saveDeadlineSettings}>
                    <Check size={15} />
                    {t('Save', 'حفظ')}
                  </button>
                </div>

                <section className="sys-card">
                  <h4>{t('Deadline', 'الموعد النهائي')}</h4>
                  <label className="sys-inline-toggle">
                    <input
                      type="checkbox"
                      checked={draftDeadline.enabled}
                      onChange={e =>
                        setDraftDeadline(d => ({ ...d, enabled: e.target.checked }))
                      }
                    />
                    <span>{t('Enable deadline feature', 'تفعيل ميزة الموعد النهائي')}</span>
                  </label>

                  <div className="sys-config-grid" style={{ marginTop: 14 }}>
                    <label className="sys-field">
                      <span>
                        {t('Deadline expires in', 'تنتهي صلاحية الموعد النهائي في')}{' '}
                        <em className="sys-req">*</em>
                      </span>
                      <div className="sys-suffix-input" dir="ltr">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          disabled={!draftDeadline.enabled}
                          value={draftDeadline.days}
                          onChange={e =>
                            setDraftDeadline(d => ({
                              ...d,
                              days: Math.max(1, Number(e.target.value) || 1),
                            }))
                          }
                        />
                        <span>{t('days', 'أيام')}</span>
                      </div>
                    </label>

                    <label className="sys-field">
                      <span>
                        {t(
                          'Funnel step redirected to once deadline expires',
                          'خطوة المسار الموجه إليها بمجرد انتهاء الموعد النهائي'
                        )}{' '}
                        <em className="sys-req">*</em>
                      </span>
                      <AssetSelect
                        label="Deadline redirect step"
                        disabled={!draftDeadline.enabled}
                        value={draftDeadline.redirectStepId || '__inactive__'}
                        options={[
                          { value: '__inactive__', label: t('Inactive Page', 'صفحة غير نشطة') },
                          ...pages.map(p => ({ value: p.id, label: p.name, preserveLabel: true })),
                        ]}
                        onChange={val => setDraftDeadline(d => ({ ...d, redirectStepId: val }))}
                      />
                    </label>
                  </div>
                </section>

                <section className="sys-card">
                  <label className="sys-inline-toggle">
                    <input
                      type="checkbox"
                      disabled={!draftDeadline.enabled}
                      checked={Boolean(draftDeadline.expireAtTimeEnabled)}
                      onChange={e =>
                        setDraftDeadline(d => ({ ...d, expireAtTimeEnabled: e.target.checked }))
                      }
                    />
                    <span>
                      {t(
                        'Specific time of day when the deadline page expires',
                        'الوقت الذي يجب أن تنتهي فيه صفحة الموعد النهائي'
                      )}
                    </span>
                  </label>
                  {draftDeadline.expireAtTimeEnabled && (
                    <label className="sys-field" style={{ marginTop: 10, maxWidth: 220 }}>
                      <input
                        type="time"
                        disabled={!draftDeadline.enabled}
                        value={draftDeadline.expireAtTime || '23:59'}
                        onChange={e =>
                          setDraftDeadline(d => ({ ...d, expireAtTime: e.target.value }))
                        }
                      />
                    </label>
                  )}
                </section>

                <section className="sys-card">
                  <h4>
                    {t(
                      'Funnel steps protected by the deadline',
                      'خطوات المسار المتاحة لمسار الموعد النهائي'
                    )}
                  </h4>
                  <small style={{ display: 'block', marginBottom: 10, opacity: 0.75 }}>
                    {t(
                      'Select the steps where the deadline expiration check will be enforced:',
                      'حدد الخطوات التي ستكون متاحة في مسار الموعد النهائي:'
                    )}
                  </small>
                  <div className="sys-step-checks">
                    {pages.map(p => {
                      const checked = draftDeadline.enabledStepIds.includes(p.id);
                      return (
                        <label key={p.id} className="sys-check-item">
                          <input
                            type="checkbox"
                            disabled={!draftDeadline.enabled}
                            checked={checked}
                            onChange={e =>
                              setDraftDeadline(d => ({
                                ...d,
                                enabledStepIds: e.target.checked
                                  ? [...d.enabledStepIds, p.id]
                                  : d.enabledStepIds.filter(id => id !== p.id),
                              }))
                            }
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Integrations Tab */}
            {subTab === 'Integrations' && (
              <FunnelIntegrations asset={asset} update={updateAsset} />
            )}
          </>
        )}
      </div>

      {/* Add Step Modal */}
      {addStepOpen && (
        <Modal title={t('Add Funnel Step', 'إضافة خطوة للمسار')} close={() => setAddStepOpen(false)}>
          <form className="aw-modal-body" onSubmit={handleCreateStep} dir={ar ? 'rtl' : 'ltr'}>
            <label>
              {t('Step Name', 'اسم الخطوة')}
              <input
                autoFocus
                required
                maxLength={100}
                value={newStepName}
                onChange={e => setNewStepName(e.target.value)}
                placeholder={t('e.g. Sales Page or Upsell Offer', 'مثال: صفحة المبيعات أو نموذج الطلب')}
              />
            </label>
            <label>
              {t('Step Type', 'نوع الخطوة')}
              <AssetSelect
                label="Step Type"
                value={newStepType}
                options={STEP_TYPE_OPTIONS.map(o => ({
                  value: o.value,
                  label: ar ? o.ar : translateText(o.en),
                  preserveLabel: true,
                }))}
                onChange={setNewStepType}
              />
            </label>
            <label>
              {t('URL Path (optional)', 'مسار الرابط (اختياري)')}
              <input
                dir="ltr"
                value={newStepSlug}
                onChange={e => setNewStepSlug(e.target.value)}
                placeholder="/sales-page"
              />
            </label>
            <footer>
              <button type="button" className="aw-secondary" onClick={() => setAddStepOpen(false)}>
                {t('Cancel', 'إلغاء')}
              </button>
              <button type="submit" className="aw-primary">
                {t('Save Step', 'حفظ الخطوة')}
              </button>
            </footer>
          </form>
        </Modal>
      )}

      {/* Add Coupon Modal */}
      {couponModalOpen && (
        <Modal title={t('Add Checkout Coupon', 'إضافة كوبون خصم')} close={() => setCouponModalOpen(false)}>
          <form
            className="aw-modal-body"
            dir={ar ? 'rtl' : 'ltr'}
            onSubmit={e => {
              e.preventDefault();
              if (!couponCode.trim()) return;
              const nextCoupon: FunnelCoupon = {
                id: crypto.randomUUID(),
                code: couponCode.trim().toUpperCase(),
                discountType: couponType,
                amount: Math.max(1, Number(couponAmount) || 10),
                active: true,
              };
              updateStepConfig({ coupons: [...coupons, nextCoupon] });
              setCouponCode('');
              setCouponModalOpen(false);
              showToast.success(t('Coupon added to step', 'تمت إضافة الكوبون بنجاح'));
            }}
          >
            <label>
              {t('Coupon Code', 'كود الكوبون')}
              <input
                autoFocus
                required
                dir="ltr"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="SAVE20"
              />
            </label>
            <label>
              {t('Discount Type', 'نوع الخصم')}
              <AssetSelect
                label="Discount Type"
                value={couponType}
                options={[
                  { value: 'percentage', label: t('Percentage (%)', 'نسبة مئوية (%)') },
                  { value: 'fixed', label: `${t('Fixed Amount', 'مبلغ ثابت')} (${funnelCurrency})` },
                ]}
                onChange={v => setCouponType(v as 'percentage' | 'fixed')}
              />
            </label>
            <label>
              {t('Discount Value', 'قيمة الخصم')}
              <input
                type="number"
                min={1}
                required
                dir="ltr"
                value={couponAmount}
                onChange={e => setCouponAmount(e.target.value)}
              />
            </label>
            <footer>
              <button type="button" className="aw-secondary" onClick={() => setCouponModalOpen(false)}>
                {t('Cancel', 'إلغاء')}
              </button>
              <button type="submit" className="aw-primary">
                {t('Add Coupon', 'إضافة الكوبون')}
              </button>
            </footer>
          </form>
        </Modal>
      )}

      {/* Add Order Bump Modal */}
      {bumpModalOpen && (
        <Modal title={t('Add Order Bump', 'إضافة عرض إضافي (Order Bump)')} close={() => setBumpModalOpen(false)}>
          <form
            className="aw-modal-body"
            dir={ar ? 'rtl' : 'ltr'}
            onSubmit={e => {
              e.preventDefault();
              if (!bumpTitle.trim()) return;
              const nextBump: FunnelOrderBump = {
                id: crypto.randomUUID(),
                title: bumpTitle.trim(),
                price: Math.max(0, Number(bumpPrice) || 0),
                description: bumpDesc.trim(),
                enabled: true,
              };
              updateStepConfig({ orderBumps: [...orderBumps, nextBump] });
              setBumpTitle('');
              setBumpDesc('');
              setBumpModalOpen(false);
              showToast.success(t('Order bump added', 'تمت إضافة الـ Order Bump'));
            }}
          >
            <label>
              {t('Offer Title', 'عنوان العرض الإضافي')}
              <input
                autoFocus
                required
                value={bumpTitle}
                onChange={e => setBumpTitle(e.target.value)}
                placeholder={t('e.g. VIP Templates Pack', 'مثال: باقة القوالب الجاهزة')}
              />
            </label>
            <label>
              {t('Price', 'السعر')} ({funnelCurrency})
              <input
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                value={bumpPrice}
                onChange={e => setBumpPrice(e.target.value)}
              />
            </label>
            <label>
              {t('Short Description', 'وصف مختصر')}
              <textarea
                rows={2}
                value={bumpDesc}
                onChange={e => setBumpDesc(e.target.value)}
                placeholder={t('Add one-click upgrade value...', 'أضف تفاصيل مختصرة تشجع العميل على الإضافة بنقرة واحدة')}
              />
            </label>
            <footer>
              <button type="button" className="aw-secondary" onClick={() => setBumpModalOpen(false)}>
                {t('Cancel', 'إلغاء')}
              </button>
              <button type="submit" className="aw-primary">
                {t('Save Order Bump', 'حفظ العرض الإضافي')}
              </button>
            </footer>
          </form>
        </Modal>
      )}

      {/* Add Automation Rule Modal */}
      {ruleModalOpen && (
        <Modal title={t('Add Automation Rule', 'إضافة قاعدة تشغيل آلي')} close={() => setRuleModalOpen(false)}>
          <form
            className="aw-modal-body"
            dir={ar ? 'rtl' : 'ltr'}
            onSubmit={e => {
              e.preventDefault();
              const nextRule: FunnelAutomationRule = {
                id: crypto.randomUUID(),
                trigger: ruleTrigger,
                action: ruleAction,
                target: ruleTarget.trim(),
                active: true,
                createdAt: new Date().toISOString(),
              };
              updateStepConfig({ automationRules: [...automationRules, nextRule] });
              setRuleTarget('');
              setRuleModalOpen(false);
              showToast.success(t('Automation rule added', 'تمت إضافة قاعدة التشغيل الآلي'));
            }}
          >
            <label>
              {t('When this event occurs (Trigger)', 'عند حدوث هذا المشغّل (Trigger)')}
              <AssetSelect
                label="Trigger"
                value={ruleTrigger}
                options={[
                  { value: 'form_subscribed', label: t('Funnel step form subscribed', 'الاشتراك في نموذج الخطوة') },
                  { value: 'new_sale', label: t('New sale completed', 'إتمام عملية بيع جديدة') },
                  { value: 'booking_confirmed', label: t('Booking confirmed', 'تأكيد حجز موعد') },
                  { value: 'page_visited', label: t('Step page visited', 'زيارة صفحة الخطوة') },
                ]}
                onChange={v => setRuleTrigger(v as FunnelAutomationRule['trigger'])}
              />
            </label>
            <label>
              {t('Do this action', 'قم بتنفيذ هذا الإجراء')}
              <AssetSelect
                label="Action"
                value={ruleAction}
                options={[
                  { value: 'add_tag', label: t('Add CRM tag', 'إضافة وسم في CRM') },
                  { value: 'send_email', label: t('Send email', 'إرسال بريد إلكتروني') },
                  { value: 'send_whatsapp', label: t('Send WhatsApp message', 'إرسال رسالة واتساب') },
                  { value: 'enroll_course', label: t('Enroll in course', 'تسجيل العميل في دورة تدريبية') },
                  { value: 'webhook', label: t('Send Webhook HTTP POST', 'إرسال Webhook') },
                ]}
                onChange={v => setRuleAction(v as FunnelAutomationRule['action'])}
              />
            </label>
            <label>
              {t('Tag / Campaign / Webhook Target', 'الوسم / الحملة / الرابط المستهدف')}
              <input
                value={ruleTarget}
                onChange={e => setRuleTarget(e.target.value)}
                placeholder={t('e.g. VIP-Lead or https://...', 'مثال: عميل-مهتم أو رابط الويبهوك')}
              />
            </label>
            <footer>
              <button type="button" className="aw-secondary" onClick={() => setRuleModalOpen(false)}>
                {t('Cancel', 'إلغاء')}
              </button>
              <button type="submit" className="aw-primary">
                {t('Save Rule', 'حفظ القاعدة')}
              </button>
            </footer>
          </form>
        </Modal>
      )}

      {/* Template Live Preview Modal */}
      {previewTpl && (
        <Modal title={previewTpl.title} close={() => setPreviewTpl(null)}>
          <div className="sys-tpl-modal-preview">
            <PublishedPage
              asset={{
                ...asset,
                settings: { ...asset.settings, color: previewTpl.color || '#6366f1' },
                document: {
                  ...asset.document,
                  pages: [previewTpl.page],
                },
              }}
              pageId={previewTpl.page.id}
              readOnly
              language={lang}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
