import { useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CloudUpload,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Monitor,
  Pencil,
  Plus,
  Save,
  Search,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
} from 'lucide-react';
import { BuilderWorkspace, type BuilderDocument, type BuilderPage } from '../BuilderWorkspace';
import { PublishedPage } from '../PublishedPage';
import { StepTemplateThumbnail } from '../StepTemplateThumbnail';
import { Modal } from '../settings/kit';
import { AdminSelect } from './AdminSelect';
import { uploadTemplateThumbnail } from '../../backend/adminManagement';
import { backendError } from '../../backend/firebase';
import {
  GLOBAL_TEMPLATE_CATEGORIES,
  createBlankGlobalFunnelTemplate,
  deleteGlobalFunnelTemplate,
  globalTemplateCategoryLabel,
  localizeGlobalFunnelTemplate,
  saveGlobalFunnelTemplate,
  seedGlobalFunnelTemplatesToFirestore,
  useGlobalFunnelTemplates,
  type GlobalFunnelTemplate,
  type LocalizedGlobalFunnelTemplate,
} from '../../backend/globalFunnelTemplates';
import type { FunnelTemplateCategory } from '../funnel-systeme-model';
import type { Asset } from '../asset-model';
import { useUILanguage, translateText } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import '../funnel-systeme.css';

function makePreviewAsset(page: BuilderPage, title: string, color: string): Asset {
  return {
    id: `preview-${page.id}`,
    kind: 'funnel',
    name: title,
    domain: '',
    image: '',
    updated: new Date().toISOString(),
    description: title,
    settings: { seo: title, navigation: '', color: color || '#6366f1' },
    document: {
      pages: [page],
      steps: [{ id: page.id, label: page.name, pageId: page.id, type: page.stepCategory || 'Opt-in' }],
      funnel: {
        name: title,
        goal: 'Lead generation',
        audience: '',
        offer: title,
        pagesFlow: [page.id],
        events: [],
        status: 'Published',
      },
    },
  };
}

export function SuperAdminFunnelTemplates() {
  const lang = useUILanguage();
  const ar = lang.startsWith('ar');
  const t = (en: string, arabic: string) => (ar ? arabic : translateText(en));

  const { templates, loading, error } = useGlobalFunnelTemplates({
    includeDrafts: true,
    language: lang,
  });

  const [categoryFilter, setCategoryFilter] = useState<'All' | FunnelTemplateCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Draft'>('All');
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState<GlobalFunnelTemplate | null>(null);
  const [builderLang, setBuilderLang] = useState<'en' | 'ar' | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{
    tpl: LocalizedGlobalFunnelTemplate;
    previewLang: 'en' | 'ar';
    device: 'desktop' | 'tablet' | 'mobile';
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocalizedGlobalFunnelTemplate | null>(null);

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = templates.filter(tpl => {
    if (categoryFilter !== 'All' && tpl.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && tpl.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${tpl.title_en} ${tpl.title_ar} ${tpl.description_en} ${tpl.description_ar} ${tpl.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const handleSeedFirestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const count = await seedGlobalFunnelTemplatesToFirestore();
      showToast.success(
        t(
          `Synced ${count} global funnel templates to Firestore.`,
          `تمت مزامنة ${count} قوالب مسارات عالمية في Firestore بنجاح.`
        )
      );
    } catch (err) {
      showToast.error(backendError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editing || busy) return;
    if (!editing.title_en.trim() && !editing.title_ar.trim()) {
      showToast.error(t('Enter an English or Arabic title before saving.', 'أدخل عنوان القالب قبل الحفظ.'));
      return;
    }
    setBusy(true);
    try {
      await saveGlobalFunnelTemplate(editing);
      showToast.success(t('Global funnel template saved to Firestore.', 'تم حفظ القالب في Firestore بنجاح.'));
      setEditing(null);
      setBuilderLang(null);
    } catch (err) {
      showToast.error(backendError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUploadThumb = async (file?: File) => {
    if (!file || !editing || uploading) return;
    setUploading(true);
    try {
      const url = await uploadTemplateThumbnail(editing.id, file);
      setEditing(cur => (cur ? { ...cur, thumbnail: url, useThumbnail: true } : cur));
      showToast.success(t('Thumbnail uploaded.', 'تم رفع صورة القالب.'));
    } catch (err) {
      showToast.error(backendError(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Full-screen Visual Builder for EN or AR page layout
  if (editing && builderLang) {
    const targetPage = builderLang === 'ar' ? editing.page_ar : editing.page_en;
    const tempDoc: BuilderDocument = {
      pages: [structuredClone(targetPage)],
      steps: [
        {
          id: targetPage.id,
          label: targetPage.name,
          pageId: targetPage.id,
          type: editing.category,
        },
      ],
      theme: { color: editing.color || '#6366f1', font: 'Manrope', corners: 'Rounded' },
      funnel: {
        name: (builderLang === 'ar' ? editing.title_ar : editing.title_en) || editing.category,
        goal: editing.category === 'Sales' || editing.category === 'Order Form' ? 'Sales' : 'Lead generation',
        audience: '',
        offer: '',
        pagesFlow: [targetPage.id],
        events: ['Form Submit'],
        status: editing.status,
      },
    };

    return (
      <section className="adm-live alm-template-design-page" dir={ar ? 'rtl' : 'ltr'}>
        <div className="alm-template-toolbar">
          <button type="button" className="alm-button" onClick={() => setBuilderLang(null)}>
            <ArrowLeft size={15} />
            {t('Back to template metadata', 'العودة لتفاصيل القالب')}
          </button>
          <h1>
            {builderLang === 'ar'
              ? t('Arabic Visual Layout (RTL)', 'تصميم القالب بالعربية (RTL)')
              : t('English Visual Layout (LTR)', 'تصميم القالب بالإنجليزية (LTR)')}
          </h1>
          <button
            type="button"
            className="alm-button primary"
            onClick={() => setBuilderLang(null)}
          >
            <Check size={15} />
            {t('Apply Builder Layout', 'اعتماد تصميم المحرر')}
          </button>
        </div>

        <div className="aw-editor-host fn-focused-editor">
          <BuilderWorkspace
            mode="funnel"
            document={tempDoc}
            initialColor={editing.color || '#6366f1'}
            availableForms={[]}
            selectedPageId={targetPage.id}
            onBack={() => setBuilderLang(null)}
            onDocumentChange={nextDoc => {
              const updatedPage = nextDoc.pages[0];
              if (!updatedPage) return;
              setEditing(cur =>
                !cur
                  ? cur
                  : builderLang === 'ar'
                    ? { ...cur, page_ar: updatedPage, color: nextDoc.theme?.color || cur.color }
                    : { ...cur, page_en: updatedPage, color: nextDoc.theme?.color || cur.color }
              );
            }}
          />
        </div>
      </section>
    );
  }

  // Template Metadata & Localization Editor
  if (editing) {
    return (
      <section className="adm-workspace adm-live" dir={ar ? 'rtl' : 'ltr'}>
        <div className="alm-template-toolbar" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className="alm-button"
            disabled={busy}
            onClick={() => setEditing(null)}
          >
            <ArrowLeft size={15} />
            {t('Back to Global Funnel Templates', 'العودة لمكتبة قوالب المسارات')}
          </button>
          <h1>
            {editing.updated
              ? t('Edit Global Funnel Template', 'تعديل قالب المسار العام')
              : t('Create Global Funnel Template', 'إنشاء قالب مسار عام جديد')}
          </h1>
          <button
            type="button"
            className="alm-button primary"
            disabled={busy || uploading}
            onClick={() => void handleSaveTemplate()}
          >
            <Save size={15} />
            {busy ? t('Saving...', 'جارٍ الحفظ...') : t('Save Template', 'حفظ القالب')}
          </button>
        </div>

        <div className="sys-step-config-stack">
          <section className="sys-card">
            <div className="sys-config-grid">
              <label className="sys-field">
                <span>
                  {t('Template Category', 'فئة القالب')} <em className="sys-req">*</em>
                </span>
                <AdminSelect
                  label={t('Category', 'الفئة')}
                  value={editing.category}
                  options={GLOBAL_TEMPLATE_CATEGORIES.map(cat => ({
                    value: cat,
                    label: globalTemplateCategoryLabel(cat, ar),
                  }))}
                  onChange={cat =>
                    setEditing(cur =>
                      cur ? { ...cur, category: cat as FunnelTemplateCategory } : cur
                    )
                  }
                />
              </label>

              <label className="sys-field">
                <span>{t('Publication Status', 'حالة النشر')}</span>
                <AdminSelect
                  label={t('Status', 'الحالة')}
                  value={editing.status}
                  options={[
                    { value: 'Published', label: t('Published (Visible to users)', 'منشور (متاح للمستخدمين)') },
                    { value: 'Draft', label: t('Draft (Hidden from users)', 'مسودة (مخفي عن المستخدمين)') },
                  ]}
                  onChange={st =>
                    setEditing(cur =>
                      cur
                        ? {
                            ...cur,
                            status: st as 'Published' | 'Draft',
                            active: st === 'Published',
                          }
                        : cur
                    )
                  }
                />
              </label>

              <label className="sys-field">
                <span>{t('English Title (LTR)', 'العنوان بالإنجليزية')}</span>
                <input
                  dir="ltr"
                  value={editing.title_en}
                  onChange={e => setEditing({ ...editing, title_en: e.target.value })}
                  placeholder="e.g. High-Converting Order Form"
                />
              </label>

              <label className="sys-field">
                <span>{t('Arabic Title (RTL)', 'العنوان بالعربية')}</span>
                <input
                  dir="rtl"
                  value={editing.title_ar}
                  onChange={e => setEditing({ ...editing, title_ar: e.target.value })}
                  placeholder="مثال: نموذج الطلب الاحترافي"
                />
              </label>

              <label className="sys-field">
                <span>{t('English Description', 'الوصف بالإنجليزية')}</span>
                <textarea
                  dir="ltr"
                  rows={2}
                  value={editing.description_en}
                  onChange={e => setEditing({ ...editing, description_en: e.target.value })}
                />
              </label>

              <label className="sys-field">
                <span>{t('Arabic Description', 'الوصف بالعربية')}</span>
                <textarea
                  dir="rtl"
                  rows={2}
                  value={editing.description_ar}
                  onChange={e => setEditing({ ...editing, description_ar: e.target.value })}
                />
              </label>

              <label className="sys-field">
                <span>{t('Accent Brand Color', 'اللون الرئيسي للقالب')}</span>
                <input
                  type="color"
                  value={editing.color || '#6366f1'}
                  onChange={e => setEditing({ ...editing, color: e.target.value })}
                  style={{ height: 42, padding: 4 }}
                />
              </label>

              <label className="sys-field">
                <span>{t('Thumbnail URL (optional)', 'رابط صورة القالب (اختياري)')}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    dir="ltr"
                    value={editing.thumbnail}
                    onChange={e => setEditing({ ...editing, thumbnail: e.target.value })}
                    placeholder="https://..."
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={e => void handleUploadThumb(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="alm-button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={15} />
                    {uploading ? '...' : t('Upload', 'رفع')}
                  </button>
                </div>
              </label>
            </div>
          </section>

          <section className="sys-card">
            <div className="sys-row-between">
              <div className="sys-collapse-left">
                <span className="sys-collapse-icon">
                  <LayoutTemplate size={18} />
                </span>
                <div>
                  <strong>{t('Visual Page Builder Design (EN & AR)', 'تصميم القالب بالمحرر المرئي (عربي وإنجليزي)')}</strong>
                  <small>
                    {t(
                      'Customize sections, forms, buttons, and colors visually. Users receive a deep-cloned copy when selecting this template.',
                      'صمّم الأقسام والنماذج والأزرار مرئياً. عند اختيار المستخدم للقالب يتم استنساخ نسخة مستقلة تماماً لخطوته.'
                    )}
                  </small>
                </div>
              </div>

              <div className="sys-step-toolbar">
                <button
                  type="button"
                  className="alm-button"
                  onClick={() => setBuilderLang('en')}
                >
                  <Pencil size={14} />
                  {t('Design English (LTR)', 'تصميم النسخة الإنجليزية')}
                </button>
                <button
                  type="button"
                  className="alm-button primary"
                  onClick={() => setBuilderLang('ar')}
                >
                  <Pencil size={14} />
                  {t('Design Arabic (RTL)', 'تصميم النسخة العربية')}
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    );
  }

  // Main Superadmin Funnel Templates Manager Grid
  return (
    <div className="sys-sa-templates" dir={ar ? 'rtl' : 'ltr'}>
      <div className="sys-card" style={{ marginBottom: 16 }}>
        <div className="sys-row-between">
          <div>
            <span className="sys-cat-pill" style={{ marginBottom: 6 }}>
              <Sparkles size={12} style={{ marginInlineEnd: 4 }} />
              Firestore · global_funnel_templates
            </span>
            <h2 style={{ margin: '4px 0', fontSize: 19 }}>
              {t('Global Funnel Step Templates Library', 'مكتبة قوالب خطوات المسارات العامة')}
            </h2>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
              {t(
                'Create, categorize (Opt-in, Sales, Order Form, Thank You), and publish ready-to-use templates cloned non-destructively into user funnel steps.',
                'أنشئ وصنّف (صفحة اشتراك، مبيعات، نموذج طلب، صفحة شكر) وانشر قوالب جاهزة يتم نسخها بأمان دون المساس بمسارات المستخدمين الحالية.'
              )}
            </p>
          </div>

          <div className="sys-step-toolbar">
            <button
              type="button"
              className="alm-button"
              disabled={busy}
              onClick={() => void handleSeedFirestore()}
            >
              <CloudUpload size={15} />
              {t('Sync Starters to Firestore', 'مزامنة القوالب في Firestore')}
            </button>
            <button
              type="button"
              className="alm-button primary"
              disabled={busy}
              onClick={() =>
                setEditing(
                  createBlankGlobalFunnelTemplate(
                    categoryFilter === 'All' ? 'Opt-in' : categoryFilter
                  )
                )
              }
            >
              <Plus size={15} />
              {t('New Funnel Template', 'قالب مسار جديد')}
            </button>
          </div>
        </div>

        <div className="sys-picker-filters" style={{ marginTop: 16 }}>
          <div className="sys-filter-pills" role="tablist">
            {(['All', ...GLOBAL_TEMPLATE_CATEGORIES] as const).map(cat => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={categoryFilter === cat}
                className={`sys-pill ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'All'
                  ? t('All Categories', 'كل الفئات')
                  : globalTemplateCategoryLabel(cat, ar)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AdminSelect
              label={t('Status', 'الحالة')}
              value={statusFilter}
              options={[
                { value: 'All', label: t('All Statuses', 'كل الحالات') },
                { value: 'Published', label: t('Published', 'منشور') },
                { value: 'Draft', label: t('Draft', 'مسودة') },
              ]}
              onChange={v => setStatusFilter(v as 'All' | 'Published' | 'Draft')}
            />
            <label className="sys-tpl-search">
              <Search size={14} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Search global templates...', 'ابحث في القوالب...')}
              />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="alm-error-inline" role="alert" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      {loading && !filtered.length ? (
        <div className="sys-card" style={{ textAlign: 'center', padding: 36 }}>
          {t('Loading global funnel templates...', 'جارٍ تحميل قوالب المسارات...')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="sys-card sys-empty-automation">
          <Layers size={34} />
          <h3>{t('No matching templates', 'لا توجد قوالب مطابقة')}</h3>
          <p>{t('Adjust your filters or create a new template.', 'غيّر الفلاتر أو أنشئ قالباً جديداً.')}</p>
        </div>
      ) : (
        <div className="sys-tpl-grid">
          {filtered.map(tpl => (
            <article key={tpl.id} className="sys-tpl-card" data-template-category={tpl.category}>
              <div
                className="sys-tpl-preview-box"
                style={{ background: tpl.accentBg || tpl.color || '#4f46e5' }}
              >
                <StepTemplateThumbnail tpl={tpl} language={lang} />
                <div className="sys-tpl-hover-actions">
                  <button
                    type="button"
                    className="sys-tpl-select-btn"
                    onClick={() => setEditing(structuredClone(tpl))}
                  >
                    <Pencil size={14} />
                    {t('Edit Template', 'تعديل القالب')}
                  </button>
                  <a
                    className="sys-tpl-preview-btn"
                    href={`/admin-preview?${new URLSearchParams({
                      template: tpl.id,
                      source: 'step',
                      lang: ar ? 'ar' : 'en',
                    })}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye size={14} />
                    {t('Preview', 'معاينة')}
                  </a>
                </div>
              </div>

              <div className="sys-tpl-card-foot" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong>{tpl.title}</strong>
                    <span
                      className="sys-cat-pill"
                      style={{
                        background:
                          tpl.status === 'Published'
                            ? 'rgba(16, 185, 129, 0.14)'
                            : 'rgba(245, 158, 11, 0.16)',
                        color: tpl.status === 'Published' ? '#059669' : '#d97706',
                      }}
                    >
                      {tpl.status === 'Published'
                        ? t('Published', 'منشور')
                        : t('Draft', 'مسودة')}
                    </span>
                  </div>
                  <small style={{ display: 'block', marginTop: 2 }}>{tpl.categoryLabel}</small>
                  {tpl.description && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                      {tpl.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="alm-icon-button"
                    title={
                      tpl.status === 'Published'
                        ? t('Unpublish to Draft', 'تحويل لمسودة')
                        : t('Publish', 'نشر')
                    }
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const nextStatus = tpl.status === 'Published' ? 'Draft' : 'Published';
                        await saveGlobalFunnelTemplate({
                          ...tpl,
                          status: nextStatus,
                          active: nextStatus === 'Published',
                        });
                        showToast.success(
                          nextStatus === 'Published'
                            ? t('Template published', 'تم نشر القالب')
                            : t('Moved to drafts', 'تم تحويل القالب لمسودة')
                        );
                      } catch (err) {
                        showToast.error(backendError(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {tpl.status === 'Published' ? <EyeOff size={15} /> : <Check size={15} />}
                  </button>

                  <button
                    type="button"
                    className="alm-icon-button"
                    title={t('Duplicate', 'نسخ القالب')}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const copy: GlobalFunnelTemplate = {
                          ...structuredClone(tpl),
                          id: `gft-${crypto.randomUUID().slice(0, 12)}`,
                          builtIn: false,
                          title_en: `${tpl.title_en} (Copy)`,
                          title_ar: `${tpl.title_ar} (نسخة)`,
                          status: 'Draft',
                          active: false,
                        };
                        await saveGlobalFunnelTemplate(copy);
                        showToast.success(t('Template duplicated as draft.', 'تم نسخ القالب كمسودة.'));
                      } catch (err) {
                        showToast.error(backendError(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Copy size={15} />
                  </button>

                  <button
                    type="button"
                    className="alm-icon-button danger"
                    title={t('Delete', 'حذف')}
                    disabled={busy}
                    onClick={() => setDeleteTarget(tpl)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Preview Modal with EN/AR & Responsive Device Switcher */}
      {previewTarget && (
        <Modal
          title={`${previewTarget.tpl.title} · ${previewTarget.tpl.categoryLabel}`}
          close={() => setPreviewTarget(null)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <div className="sys-filter-pills">
              <button
                type="button"
                className={`sys-pill ${previewTarget.previewLang === 'en' ? 'active' : ''}`}
                onClick={() =>
                  setPreviewTarget(cur => (cur ? { ...cur, previewLang: 'en' } : cur))
                }
              >
                English (LTR)
              </button>
              <button
                type="button"
                className={`sys-pill ${previewTarget.previewLang === 'ar' ? 'active' : ''}`}
                onClick={() =>
                  setPreviewTarget(cur => (cur ? { ...cur, previewLang: 'ar' } : cur))
                }
              >
                العربية (RTL)
              </button>
            </div>
            <div className="sys-filter-pills">
              {(
                [
                  { id: 'desktop', label: t('Desktop', 'كمبيوتر'), Icon: Monitor },
                  { id: 'tablet', label: t('Tablet', 'تابلت'), Icon: Tablet },
                  { id: 'mobile', label: t('Mobile', 'جوال'), Icon: Smartphone },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`sys-pill ${previewTarget.device === id ? 'active' : ''}`}
                  onClick={() =>
                    setPreviewTarget(cur => (cur ? { ...cur, device: id } : cur))
                  }
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="aw-primary"
              onClick={() => {
                const copy = structuredClone(previewTarget.tpl);
                setPreviewTarget(null);
                setEditing(copy);
              }}
            >
              <Pencil size={14} />
              {t('Edit Template', 'تعديل القالب')}
            </button>
          </div>
          <div className="sys-tpl-modal-preview" style={{ display: 'flex', justifyContent: 'center', background: '#0f172a0d', padding: previewTarget.device === 'desktop' ? 0 : 12 }}>
            {(() => {
              const localized = localizeGlobalFunnelTemplate(
                previewTarget.tpl,
                previewTarget.previewLang === 'ar'
              );
              const targetWidth =
                previewTarget.device === 'mobile'
                  ? 390
                  : previewTarget.device === 'tablet'
                    ? 768
                    : 1120;
              return (
                <div style={{ width: '100%', maxWidth: previewTarget.device === 'desktop' ? '100%' : targetWidth, margin: '0 auto', borderRadius: 10, overflow: 'hidden' }}>
                  <PublishedPage
                    asset={makePreviewAsset(localized.page, localized.title, localized.color)}
                    pageId={localized.page.id}
                    readOnly
                    viewportDevice={previewTarget.device}
                    viewportWidth={targetWidth}
                    language={previewTarget.previewLang}
                  />
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          title={t('Delete Global Template?', 'حذف القالب العام؟')}
          close={() => !busy && setDeleteTarget(null)}
        >
          <div className="aw-modal-body" dir={ar ? 'rtl' : 'ltr'}>
            <p>
              {t(
                'Removing this template hides it from future template selections. Existing user funnels that already cloned it are 100% unaffected.',
                'سيتم إزالة هذا القالب من مكتبة القوالب المستقبلية، ولن تتأثر أي مسارات مستخدمين قامت بنسخه مسبقاً.'
              )}
            </p>
            <strong>{deleteTarget.title}</strong>
            <footer>
              <button
                type="button"
                className="aw-secondary"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                className="aw-danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await deleteGlobalFunnelTemplate(deleteTarget);
                    showToast.success(t('Template removed.', 'تم حذف القالب.'));
                    setDeleteTarget(null);
                  } catch (err) {
                    showToast.error(backendError(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Trash2 size={14} />
                {t('Delete Template', 'حذف القالب')}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default SuperAdminFunnelTemplates;
