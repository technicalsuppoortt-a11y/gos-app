import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as Select from '@radix-ui/react-select';
import {
  Search,
  X,
  Settings,
  ArrowUpRight,
  RotateCcw,
  Download,
  Power,
  Check,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import {
  type ToolItem,
  type ToolStatus,
  initialTools,
} from './tools-data';
import './admin-tools.css';
import { usePlatformTools, persistPlatformTools, defaultPlatformTools } from '../../backend/platformTools';

const CATEGORY_OPTIONS = [
  { id: 'All', labelEn: 'All Categories', labelAr: 'جميع الفئات' },
  { id: 'Intelligence', labelEn: 'Intelligence (AI)', labelAr: 'الذكاء الاصطناعي' },
  { id: 'Growth', labelEn: 'Growth & Sales', labelAr: 'النمو والمبيعات' },
  { id: 'Core', labelEn: 'Core Platform', labelAr: 'الأساسيات' },
  { id: 'Operations', labelEn: 'Operations & Booking', labelAr: 'العمليات والحجوزات' },
  { id: 'Commerce', labelEn: 'Commerce & Payments', labelAr: 'التجارة والمدفوعات' },
  { id: 'Infrastructure', labelEn: 'Infrastructure & Domains', labelAr: 'البنية التحتية والنطاقات' },
  { id: 'Developer', labelEn: 'Developer Tools', labelAr: 'أدوات المطورين' },
] as const;

export function AdminTools() {
  const language = useUILanguage();
  const ar = language.startsWith('ar');
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  const [tools, setTools] = useState<ToolItem[]>(() => defaultPlatformTools);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ToolStatus>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [configuringTool, setConfiguringTool] = useState<ToolItem | null>(null);

  const source = usePlatformTools();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  async function commit(next: ToolItem[]) {
    if (saving || source.loading || source.error) return false;
    setSaving(true); setFailure('');
    try { await persistPlatformTools(next, source.revision); setTools(next); return true; }
    catch (error) { setFailure(error instanceof Error ? error.message : 'Could not save tools.'); return false; }
    finally { setSaving(false); }
  }
  // The cloud is authoritative; browser values are never published on mount.
  useEffect(() => {
    setTools(defaultPlatformTools.map(tool => ({ ...tool, ...source.tools[tool.id] })));
  }, [source.tools]);

  // Compute status counts
  const totalCount = tools.length;
  const activeCount = tools.filter((t) => t.status === 'Active').length;
  const maintenanceCount = tools.filter((t) => t.status === 'Maintenance').length;
  const disabledCount = tools.filter((t) => t.status === 'Disabled').length;

  // Compute category counts
  const categoryCounts: Record<string, number> = {
    All: totalCount,
    Intelligence: tools.filter((t) => t.category === 'Intelligence').length,
    Growth: tools.filter((t) => t.category === 'Growth').length,
    Core: tools.filter((t) => t.category === 'Core').length,
    Operations: tools.filter((t) => t.category === 'Operations').length,
    Commerce: tools.filter((t) => t.category === 'Commerce').length,
    Infrastructure: tools.filter((t) => t.category === 'Infrastructure').length,
    Developer: tools.filter((t) => t.category === 'Developer').length,
  };

  // Filter tools
  const visibleTools = tools.filter((tool) => {
    const matchesStatus = statusFilter === 'All' || tool.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || tool.category === categoryFilter;
    const searchLower = search.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      tool.name[0].toLowerCase().includes(searchLower) ||
      tool.name[1].includes(searchLower) ||
      tool.description[0].toLowerCase().includes(searchLower) ||
      tool.description[1].includes(searchLower) ||
      tool.category.toLowerCase().includes(searchLower) ||
      tool.id.toLowerCase().includes(searchLower);

    return matchesStatus && matchesCategory && matchesSearch;
  });

  // Toggle quick switch on card
  const handleQuickToggle = async (tool: ToolItem) => {
    const updated = tools.map(item => item.id === tool.id ? { ...item, enabled: !item.enabled, status: (!item.enabled ? 'Active' : 'Disabled') as ToolStatus } : item);
    if (!await commit(updated)) return;
    const wasEnabled = tool.enabled;
    const toolTitle = tool.name[ar ? 1 : 0];
    if (wasEnabled) {
      showToast.info(
        ar ? `تم تعطيل ${toolTitle} عالمياً.` : `${toolTitle} disabled globally across all tenants.`
      );
    } else {
      showToast.success(
        ar ? `تم تفعيل ${toolTitle} عالمياً.` : `${toolTitle} activated globally across all tenants.`
      );
    }
  };

  // Bulk enable all
  const handleEnableAll = async () => {
    const next = tools.map((t) => ({
      ...t,
      enabled: true,
      status: (t.status === 'Maintenance' ? 'Maintenance' : 'Active') as ToolStatus,
    }));
    if (!await commit(next)) return;
    showToast.success(
      ar ? 'تم تفعيل جميع الأدوات عالمياً.' : 'All platform tools enabled globally.'
    );
  };

  // Reset to factory defaults
  const handleResetDefaults = async () => {
    if (
      window.confirm(
        ar
          ? 'هل أنت متأكد من استعادة الإعدادات الافتراضية لجميع الأدوات؟'
          : 'Are you sure you want to reset all platform tools to default settings?'
      )
    ) {
      if (!await commit(defaultPlatformTools)) return;
      showToast.info(
        ar ? 'تمت استعادة الإعدادات الافتراضية بنجاح.' : 'Tools reset to factory defaults.'
      );
    }
  };

  // Export JSON configuration
  const handleExportConfig = () => {
    const serializable = tools.map(({ id, enabled, status, accessTier, maintenanceNotice, settings }) => ({ id, enabled, status, accessTier, maintenanceNotice, settings }));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(serializable, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `upclick-platform-tools-config.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast.success(
      ar ? 'تم تصدير ملف إعدادات الأدوات بنجاح.' : 'Tools configuration exported to JSON.'
    );
  };

  // Save drawer edits
  const handleSaveDrawer = async (updatedTool: ToolItem) => {
    if (!await commit(tools.map(tool => tool.id === updatedTool.id ? updatedTool : tool))) return;
    setConfiguringTool(null);
    showToast.success(
      ar
        ? `تم حفظ إعدادات ${updatedTool.name[1]} بنجاح.`
        : `Configuration for ${updatedTool.name[0]} saved successfully.`
    );
  };

  return (
    <div className="adm-tools-workspace" aria-busy={saving || source.loading}>
      {(failure || source.error) && <p role="alert">{failure || source.error}</p>}
      {(saving || source.loading) && <p role="status">{saving ? t('Saving…','جار الحفظ…') : t('Loading tools…','جار التحميل…')}</p>}
      {/* Page Header & Global Toolbar */}
      <header className="adm-tools-head">
        <div className="adm-tools-title-row">
          <div className="adm-tools-title-wrap">
            <span className="adm-eyebrow">{t('PLATFORM OPERATIONS', 'عمليات المنصة')}</span>
            <h1>{t('All Tools Management', 'إدارة كل الأدوات')}</h1>
            <p>
              {t(
                'Centralized control center to monitor, toggle, and configure platform features across all tenants.',
                'مركز التحكم الموحد لمراقبة وتفعيل وتهيئة ميزات المنصة عبر كافة مساحات العمل.'
              )}
            </p>
          </div>

          <div className="adm-tools-chips">
            <span className="adm-tool-chip">
              <Layers size={13} />
              {t('Total Tools:', 'إجمالي الأدوات:')} <b>{totalCount}</b>
            </span>
            <span className="adm-tool-chip active">
              <i />
              {t('Active:', 'نشطة:')} <b>{activeCount}</b>
            </span>
            <span className="adm-tool-chip maintenance">
              <i />
              {t('Maintenance:', 'صيانة:')} <b>{maintenanceCount}</b>
            </span>
            <span className="adm-tool-chip disabled">
              <i />
              {t('Disabled:', 'معطلة:')} <b>{disabledCount}</b>
            </span>
            <span className="adm-tool-chip">
              <Sparkles size={12} />
              {t('Revision:', 'الإصدار:')} {source.revision}
            </span>
          </div>
        </div>

        {/* Filter & Action Row */}
        <div className="adm-tools-bar">
          <div className="adm-tools-filters">
            {/* Search */}
            <div className="adm-tools-search">
              <Search size={14} className="adm-tools-search-icon" />
              <input
                type="text"
                placeholder={t('Search tools (e.g., AI, Funnel, CRM)...', 'ابحث في الأدوات (ذكاء، قمع، CRM)...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="adm-tools-search-clear"
                  onClick={() => setSearch('')}
                  aria-label={t('Clear search', 'مسح البحث')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="adm-tools-status-tabs" role="tablist" aria-label={t('Filter by status', 'تصفية حسب الحالة')}>
              {(['All', 'Active', 'Maintenance', 'Disabled'] as const).map((status) => {
                const count =
                  status === 'All'
                    ? totalCount
                    : status === 'Active'
                    ? activeCount
                    : status === 'Maintenance'
                    ? maintenanceCount
                    : disabledCount;
                const label =
                  status === 'All'
                    ? t('All', 'الكل')
                    : status === 'Active'
                    ? t('Active', 'نشط')
                    : status === 'Maintenance'
                    ? t('Maintenance', 'صيانة')
                    : t('Disabled', 'معطل');
                return (
                  <button
                    key={status}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === status}
                    className={`adm-tools-status-tab ${statusFilter === status ? 'active' : ''}`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {label}
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Professional Category Filter Dropdown */}
            <Select.Root
              dir={ar ? 'rtl' : 'ltr'}
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(val)}
            >
              <Select.Trigger
                className={`adm-tools-cat-trigger ${categoryFilter !== 'All' ? 'is-active' : ''}`}
                aria-label={t('Filter by category', 'تصفية حسب الفئة')}
              >
                <div className="adm-tools-cat-trigger-content">
                  <SlidersHorizontal size={13} className="adm-tools-cat-icon" />
                  <span className="adm-tools-cat-prefix">{t('Category:', 'الفئة:')}</span>
                  <Select.Value>
                    {categoryFilter === 'All'
                      ? t('All Categories', 'جميع الفئات')
                      : (CATEGORY_OPTIONS.find((c) => c.id === categoryFilter)?.[ar ? 'labelAr' : 'labelEn'] ?? categoryFilter)}
                  </Select.Value>
                </div>
                <Select.Icon className="adm-tools-cat-chevron">
                  <ChevronDown size={13} />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  dir={ar ? 'rtl' : 'ltr'}
                  className="adm-tools-cat-popup"
                  position="popper"
                  sideOffset={6}
                  collisionPadding={12}
                  align="start"
                >
                  <Select.Viewport className="adm-tools-cat-viewport">
                    {CATEGORY_OPTIONS.map((cat) => {
                      const count = categoryCounts[cat.id] ?? 0;
                      const label = ar ? cat.labelAr : cat.labelEn;
                      return (
                        <Select.Item
                          key={cat.id}
                          value={cat.id}
                          className="adm-tools-cat-item"
                          textValue={label}
                        >
                          <div className="adm-tools-cat-item-left">
                            <Select.ItemText>{label}</Select.ItemText>
                          </div>
                          <div className="adm-tools-cat-item-right">
                            <span className="adm-tools-cat-item-count">{count}</span>
                            <Select.ItemIndicator className="adm-tools-cat-check">
                              <Check size={13} />
                            </Select.ItemIndicator>
                          </div>
                        </Select.Item>
                      );
                    })}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Professional Action Buttons */}
          <div className="adm-tools-actions">
            <button
              type="button"
              className="adm-tools-btn adm-tools-btn-enable"
              disabled={saving || source.loading || !!source.error} onClick={handleEnableAll}
              title={t('Enable all tools globally across all tenants', 'تفعيل جميع الأدوات عبر كافة مساحات العمل')}
            >
              <Power size={13} className="adm-btn-power-icon" />
              <span>{t('Enable All', 'تفعيل الكل')}</span>
            </button>
            <button
              type="button"
              className="adm-tools-btn adm-tools-btn-export"
              onClick={handleExportConfig}
              title={t('Export configuration as JSON', 'تصدير ملف الإعدادات كـ JSON')}
            >
              <Download size={13} className="adm-btn-download-icon" />
              <span>{t('Export', 'تصدير')}</span>
            </button>
            <button
              type="button"
              className="adm-tools-btn adm-tools-btn-reset"
              disabled={saving || source.loading || !!source.error} onClick={handleResetDefaults}
              title={t('Reset tools to defaults', 'إعادة تعيين للافتراضي')}
              aria-label={t('Reset tools to defaults', 'إعادة تعيين للافتراضي')}
            >
              <RotateCcw size={13} className="adm-btn-reset-icon" />
            </button>
          </div>
        </div>
      </header>

      {/* 4x3 Zero-Scroll Grid Container */}
      <fieldset disabled={saving || source.loading || !!source.error} style={{border:0,padding:0,margin:0, minHeight:0,overflow:'auto'}}><main className="adm-tools-grid" role="region" aria-label={t('Platform Tools Grid', 'شبكة أدوات المنصة')}>
        {visibleTools.map((tool) => {
          const Icon = tool.icon;
          const statusClass = tool.status.toLowerCase();
          const cardClass = `adm-tool-card ${tool.enabled ? '' : 'is-disabled'} ${
            tool.status === 'Maintenance' ? 'is-maintenance' : ''
          }`;

          return (
            <article
              key={tool.id}
              className={cardClass}
              data-category={tool.category}
              data-tool-id={tool.id}
            >
              {/* Card Top: Identity & Status Badge */}
              <div className="adm-tool-card-head">
                <div className="adm-tool-identity">
                  <div className="adm-tool-icon-orb" aria-hidden="true">
                    <Icon size={17} />
                  </div>
                  <div className="adm-tool-text">
                    <h2 className="adm-tool-name" title={tool.name[ar ? 1 : 0]}>
                      {tool.name[ar ? 1 : 0]}
                    </h2>
                    <span className="adm-tool-cat-badge">{tool.categoryLabel[ar ? 1 : 0]}</span>
                  </div>
                </div>

                <span className={`adm-tool-badge ${statusClass}`}>
                  <i />
                  {tool.status === 'Active'
                    ? t('Active', 'نشط')
                    : tool.status === 'Maintenance'
                    ? t('Maintenance', 'صيانة')
                    : t('Disabled', 'معطل')}
                </span>
              </div>

              {/* Card Middle: Description & Micro-Telemetry */}
              <div className="adm-tool-card-body">
                <p className="adm-tool-desc" title={tool.description[ar ? 1 : 0]}>
                  {tool.description[ar ? 1 : 0]}
                </p>

                <div className="adm-tool-telemetry">
                  <span>
                    {t('Source:', 'المصدر:')} <b>Firebase</b>
                  </span>
                  <span>
                    {t('Plans:', 'الخطط:')} <b>{tool.accessTier === 'all' ? t('All', 'الكل') : tool.accessTier === 'agency_only' ? 'Agency' : 'Pro / Agency'}</b>
                  </span>
                </div>
              </div>

              {/* Card Bottom: Quick Toggle & Configure Action */}
              <div className="adm-tool-card-foot">
                <label
                  className="adm-tool-switch-wrap"
                  title={
                    tool.enabled
                      ? t('Disable globally across tenants', 'تعطيل عالمياً لجميع مساحات العمل')
                      : t('Enable globally across tenants', 'تفعيل عالمياً لجميع مساحات العمل')
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    handleQuickToggle(tool);
                  }}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tool.enabled}
                    aria-label={`${t('Toggle', 'تبديل')} ${tool.name[ar ? 1 : 0]}`}
                    className={`adm-tool-switch ${tool.enabled ? 'on' : ''}`}
                  >
                    <span className="adm-tool-switch-knob" />
                  </button>
                  <span className="adm-tool-switch-label">
                    {tool.enabled ? t('Enabled', 'مفعل') : t('Disabled', 'معطل')}
                  </span>
                </label>

                <button
                  type="button"
                  className="adm-tool-config-btn"
                  onClick={() => setConfiguringTool(tool)}
                  aria-label={`${t('Configure', 'تهيئة')} ${tool.name[ar ? 1 : 0]}`}
                >
                  <Settings size={13} />
                  <span>{t('Configure', 'تهيئة')}</span>
                </button>
              </div>
            </article>
          );
        })}

        {/* Empty State */}
        {visibleTools.length === 0 && (
          <div className="adm-tools-empty">
            <Search size={28} />
            <h3>{t('No tools matching criteria', 'لا توجد أدوات مطابقة للبحث')}</h3>
            <p>
              {t(
                'Try clearing your search query or adjusting your status and category filters.',
                'جرّب مسح نص البحث أو تغيير فلاتر الحالة والفئات.'
              )}
            </p>
            <button
              className="adm-primary"
              onClick={() => {
                setSearch('');
                setStatusFilter('All');
                setCategoryFilter('All');
              }}
            >
              {t('Reset Filters', 'إعادة تعيين الفلاتر')}
            </button>
          </div>
        )}
      </main></fieldset>

      {/* Drawer / Compact Modal for Configuration */}
      {configuringTool && (
        <ToolConfigDrawer
          tool={configuringTool}
          revision={source.revision}
          ar={ar}
          t={t}
          onClose={() => setConfiguringTool(null)}
          onSave={handleSaveDrawer}
        />
      )}
    </div>
  );
}

// Drawer Component
interface ToolConfigDrawerProps {
  tool: ToolItem;
  revision: number;
  ar: boolean;
  t: (en: string, ar: string) => string;
  onClose: () => void;
  onSave: (tool: ToolItem) => void;
}

function ToolConfigDrawer({ tool, revision, ar, t, onClose, onSave }: ToolConfigDrawerProps) {
  const [draft, setDraft] = useState<ToolItem>({ ...tool });
  const drawerRef = useRef<HTMLDivElement>(null);
  const Icon = tool.icon;

  // Keyboard navigation & trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, select, textarea, a[href]'
          )
        );
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updateSettingValue = (key: string, value: string | number | boolean) => {
    setDraft((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
  };

  return (
    <div
      className="adm-dialog-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        className="adm-tool-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-drawer-title"
      >
        {/* Drawer Header */}
        <div className="adm-drawer-head">
          <div className="adm-drawer-head-info">
            <div className="adm-tool-icon-orb" aria-hidden="true">
              <Icon size={20} />
            </div>
            <div>
              <span className="adm-eyebrow">{t('TOOL CONFIGURATION', 'إعدادات الأداة')}</span>
              <h2 id="tool-drawer-title">{draft.name[ar ? 1 : 0]}</h2>
            </div>
          </div>
          <button
            className="adm-drawer-close"
            onClick={onClose}
            aria-label={t('Close drawer', 'إغلاق النافذة')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Operational Status Section */}
        <section className="adm-drawer-section">
          <h3 className="adm-drawer-section-title">{t('Operational Status', 'الحالة التشغيلية')}</h3>

          <div className="adm-drawer-status-grid">
            <div
              className={`adm-drawer-status-opt ${
                draft.status === 'Active' ? 'active status-active' : ''
              }`}
              onClick={() => setDraft((p) => ({ ...p, status: 'Active', enabled: true }))}
            >
              <Check size={16} />
              <span>{t('Active (Live)', 'نشط (متاح)')}</span>
            </div>

            <div
              className={`adm-drawer-status-opt ${
                draft.status === 'Maintenance' ? 'active status-maintenance' : ''
              }`}
              onClick={() => setDraft((p) => ({ ...p, status: 'Maintenance' }))}
            >
              <AlertTriangle size={16} />
              <span>{t('Maintenance', 'تحت الصيانة')}</span>
            </div>

            <div
              className={`adm-drawer-status-opt ${
                draft.status === 'Disabled' ? 'active' : ''
              }`}
              onClick={() => setDraft((p) => ({ ...p, status: 'Disabled', enabled: false }))}
            >
              <Power size={16} />
              <span>{t('Disabled', 'معطل')}</span>
            </div>
          </div>

          {/* Master Global Switch */}
          <div className="adm-drawer-master-toggle">
            <div className="adm-drawer-master-toggle-text">
              <b>{t('Global Availability', 'الإتاحة العامة')}</b>
              <small>
                {t(
                  'When disabled, this feature is completely suppressed across all workspaces.',
                  'عند التعطيل، تحجب هذه الميزة بالكامل عن جميع مساحات العمل.'
                )}
              </small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              className={`adm-tool-switch ${draft.enabled ? 'on' : ''}`}
              onClick={() =>
                setDraft((p) => {
                  const nextEn = !p.enabled;
                  return {
                    ...p,
                    enabled: nextEn,
                    status: nextEn ? (p.status === 'Disabled' ? 'Active' : p.status) : 'Disabled',
                  };
                })
              }
            >
              <span className="adm-tool-switch-knob" />
            </button>
          </div>

          {draft.status === 'Maintenance' && (
            <div className="adm-drawer-field">
              <label>
                <ShieldAlert size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />
                {t('Maintenance Banner Message', 'رسالة تنبيه الصيانة للعملاء')}
              </label>
              <textarea
                value={draft.maintenanceNotice ?? ''}
                placeholder={t(
                  'e.g., Scheduled infrastructure upgrade in progress...',
                  'مثال: ترقية دورية للبنية التحتية قيد التنفيذ...'
                )}
                onChange={(e) => setDraft((p) => ({ ...p, maintenanceNotice: e.target.value }))}
              />
            </div>
          )}
        </section>

        {/* Configurable Parameters Section */}
        <section className="adm-drawer-section">
          <h3 className="adm-drawer-section-title">
            {t('Engine Parameters & Defaults', 'معلمات المحرك والإعدادات الافتراضية')}
          </h3>

          <div className="adm-drawer-fields">
            {draft.settingFields.map((field) => {
              const currentValue = draft.settings[field.key] ?? field.value;

              if (field.type === 'boolean') {
                return (
                  <label key={field.key} className="adm-drawer-field-bool">
                    <span>{field.label[ar ? 1 : 0]}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(currentValue)}
                      onChange={(e) => updateSettingValue(field.key, e.target.checked)}
                    />
                  </label>
                );
              }

              if (field.type === 'select') {
                return (
                  <div key={field.key} className="adm-drawer-field">
                    <label>{field.label[ar ? 1 : 0]}</label>
                    <select
                      value={String(currentValue)}
                      onChange={(e) => updateSettingValue(field.key, e.target.value)}
                    >
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={field.key} className="adm-drawer-field">
                  <label>{field.label[ar ? 1 : 0]}</label>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={String(currentValue)}
                    onChange={(e) =>
                      updateSettingValue(
                        field.key,
                        field.type === 'number' ? Number(e.target.value) : e.target.value
                      )
                    }
                  />
                </div>
              );
            })}

            {/* Tenant Access Tier Restriction */}
            <div className="adm-drawer-field">
              <label>{t('Tenant Plan Access Tier', 'مستوى خطة الوصول المسموحة')}</label>
              <select
                value={draft.accessTier}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, accessTier: e.target.value as ToolItem['accessTier'] }))
                }
              >
                <option value="all">{t('All Plans (Starter, Pro, Agency)', 'جميع الخطط (الأساسية، الاحترافية، الوكالات)')}</option>
                <option value="pro_agency">{t('Pro & Agency Tiers Only', 'الخطط الاحترافية والوكالات فقط')}</option>
                <option value="agency_only">{t('Agency White-Label Tier Only', 'خطط الوكالات فقط')}</option>
              </select>
            </div>
          </div>
        </section>

        {/* Telemetry & Direct Link Section */}
        <section className="adm-drawer-section">
          <h3 className="adm-drawer-section-title">
            {t('Telemetry & Native Module', 'مؤشرات الأداء والصفحة الأصلية')}
          </h3>

          <div className="adm-drawer-telemetry">
            <div className="adm-drawer-tele-item">
              <small>{t('Configuration Revision', 'إصدار الإعدادات')}</small>
              <strong>{revision}</strong>
            </div>
            <div className="adm-drawer-tele-item">
              <small>{t('Data Source', 'مصدر البيانات')}</small>
              <strong>Firebase Firestore</strong>
            </div>
            <div className="adm-drawer-tele-item">
              <small>{t('Workspace Access', 'وصول المساحات')}</small>
              <strong>{draft.accessTier === 'all' ? t('All plans', 'جميع الخطط') : draft.accessTier === 'agency_only' ? 'Agency' : 'Pro / Agency'}</strong>
            </div>
            <div className="adm-drawer-tele-item">
              <small>{t('Native Route', 'المسار المباشر')}</small>
              <Link to={draft.route} className="adm-drawer-deep-link" onClick={onClose}>
                <span>{t('Open Workspace', 'فتح مساحة العمل')}</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* Drawer Actions */}
        <div className="adm-drawer-foot">
          <button
            type="button"
            className="adm-tools-action-btn"
            onClick={() => {
              const initial = tool;
              setDraft(initial);
              showToast.info(t('Reverted to loaded values.', 'تمت استعادة القيم المحفوظة.'));
            }}
          >
            <RotateCcw size={13} />
            {t('Reset', 'استعادة')}
          </button>

          <div className="adm-drawer-foot-actions">
            <button type="button" onClick={onClose}>
              {t('Cancel', 'إلغاء')}
            </button>
            <button
              type="button"
              className="adm-primary"
              onClick={() => onSave(draft)}
            >
              <Check size={14} />
              {t('Save Changes', 'حفظ التغييرات')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
