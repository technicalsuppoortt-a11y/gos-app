import { createPageAsset } from '../page-templates';
import { initializeTemplateAsset } from '../system-template-assets';
import { validateSystemTemplate, validateTemplateProduct } from '../system-template-validation';
import { BookingBuilder } from '../booking/BookingBuilder';
import { workflowFromTemplate, type Workflow } from '../follow-up-workflow';
import { AdminAutomationTemplateFields } from './AdminAutomationTemplateFields';
import '../booking/booking-workspace.css';
import '../asset-workspace.css';
import '../asset-controls.css';
import '../funnel-polish.css';
import '../crm/crm-workspace.css';
import '../crm/crm-pipeline.css';
import { ProductTemplateWorkspace } from '../commerce/ProductWorkspace';
import { productKind } from '../commerce/model';
import { PipelineTemplateFields } from '../crm/TemplateDialog';
import type { CustomTemplate } from '../crm/templateStorage';
import './admin-template-editor.css';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, ImagePlus, Layers3, LayoutTemplate, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { uploadTemplateFile } from '../../backend/templateFiles';
import { uploadTemplateThumbnail } from '../../backend/adminManagement';
import { backendError } from '../../backend/firebase';
import { BuilderWorkspace, createBuilderDocument } from '../BuilderWorkspace';
import { adminTemplateCategories as categories, industries, goals } from '../system-template-data';
import { useUILanguage } from '../../i18n/display';
import { AdminSelect } from './AdminSelect';
import { LiveDialog } from './AdminLiveUI';
import { TemplateContent } from './AdminRecordDetails';
import { localizeManagedTemplate, templateArabicDesign, templateArabicMetadata, templateCategoryLabel, templateIsActive, type ManagedTemplate } from './managed-template';
import type { SitePreview } from './AdminSitePreview';

export function newManagedTemplate(category: ManagedTemplate['category'] = 'Funnels'): ManagedTemplate {
  return { id: crypto.randomUUID(), name: '', description: '', category, industry: industries[0], goal: goals[0], source: 'official', tags: [], updated: '', popularity: 0, color: '#7C3AED', active: false, status: 'Draft', content: { headline: '', steps: ['Welcome'], settings: { enabled: false, language: 'en' } } };
}

export function AdminTemplateEditor({ template, save, close, busy, preview, presets = [], ownerUid = '' }: {
  template: ManagedTemplate; save: (template: ManagedTemplate) => Promise<string | null>; close: () => void;
  busy: boolean; preview: (value: SitePreview) => void; presets?: ManagedTemplate[]; ownerUid?: string;
}) {
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  const [draft, setDraft] = useState(() => initializeTemplateAsset({
    ...template, ...templateArabicMetadata(template),
    name: template.title_en || template.name,
    description: template.description_en || template.description,
    content: template.content_en || template.content,
  }));
  const [, setParams] = useSearchParams();
  const [nativeEditor, setNativeEditor] = useState<'design' | 'booking' | 'product' | null>(null);
  const [builderArabic, setBuilderArabic] = useState(false);
  const [productConfigured, setProductConfigured] = useState(Boolean(template.updated && template.productTemplate));
  const [presetId, setPresetId] = useState('');
  const [error, setError] = useState('');
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const documentRef = useRef(draft.builderDocument);
  const arabicDocumentRef = useRef(draft.builder_document_ar);
  const initialBuilderSnapshot = useRef('');
  const activeDocument = builderArabic ? arabicDocumentRef : documentRef;
  const web = ['Funnels', 'Websites', 'Forms', 'Landing Pages'].includes(draft.category);
  const mode = draft.category === 'Funnels' ? 'funnel' : 'website';
  const updateContent = (patch: Partial<ManagedTemplate['content']>) => setDraft(d => ({ ...d, content: { ...d.content, ...patch } }));
  function loadPreset(id: string) {
    setPresetId(id);
    const preset = presets.find(item => item.id === id);
    if (!preset) return;
    setError('');
    const { id: _presetId, ...copy } = structuredClone(preset);
    const next = initializeTemplateAsset({ ...copy, ...templateArabicMetadata(preset), builder_document_ar: templateArabicDesign(preset), id: template.id, updated: '', source: 'official', active: false, status: 'Draft', popularity: 0 });
    documentRef.current = next.builderDocument;
    arabicDocumentRef.current = next.builder_document_ar;
    setDraft(next);
    setProductConfigured(Boolean(preset.productTemplate));
  }
  async function submit() {
    if (busy || uploading) return;
    if (!draft.name.trim()) { setError(t('Add a name and a headline before saving.', 'أضف اسماً وعنواناً قبل الحفظ.')); return; }
    if (draft.content.steps.some(step => !step.trim())) { setError(t('Complete each step or remove the empty step.', 'أكمل كل خطوة أو احذف الخطوة الفارغة.')); return; }
    setError('');
    const name = draft.name.trim();
    const content = { ...draft.content, headline: draft.content.headline.trim() || name };
    const value = initializeTemplateAsset({
      ...draft, name, content, builderDocument: documentRef.current,
      title_en: name, title_ar: draft.title_ar?.trim() || '',
      description_en: draft.description.trim(), description_ar: draft.description_ar?.trim() || '',
      category_en: draft.category_en?.trim() || draft.category,
      category_ar: draft.category_ar?.trim() || templateCategoryLabel(draft.category, true),
      tags_en: draft.tags, tags_ar: draft.tags_ar || [], content_en: content,
      content_ar: { ...draft.content_ar, settings: { ...content.settings, language: 'ar' } },
      builder_document_ar: templateArabicDesign({ ...draft, builderDocument: documentRef.current, builder_document_ar: arabicDocumentRef.current }),
    });
    const failures = validateSystemTemplate(value);
    if (value.builder_document_ar || value.booking_page_ar || value.product_template_ar || value.pipeline_template_ar || value.automation_template_ar) {
      failures.push(...validateSystemTemplate(initializeTemplateAsset(localizeManagedTemplate(value, true))));
    } if (failures.length) { setError(failures.join(' ')); return; }
    const failure = await save(value);
    if (failure) setError(failure);
  }
  async function chooseThumbnail(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true); setError('');
    try {
      const thumbnail = await uploadTemplateThumbnail(draft.id, file, ownerUid);
      // The template image is also the page builder's featured image (funnel, website and form pages).
      const current = documentRef.current;
      if (current?.pages?.length) documentRef.current = { ...current, pages: current.pages.map((page, index) => index === 0 || page.featuredImage ? { ...page, featuredImage: thumbnail } : page) };
      setDraft(d => ({ ...d, thumbnail, builderDocument: documentRef.current, pageTemplate: d.pageTemplate ? { ...d.pageTemplate, image: thumbnail } : d.pageTemplate }));
    }
    catch (cause) { setError(backendError(cause)); }
    finally { setUploading(false); if (imageInput.current) imageInput.current.value = ''; }
  }
  const localized = localizeManagedTemplate({ ...draft, title_en: draft.name, description_en: draft.description, content_en: draft.content, builderDocument: documentRef.current, builder_document_ar: arabicDocumentRef.current }, ar);
  const openPreview = () => localized.builderDocument ? preview({
    document: localized.builderDocument, name: localized.name || t('Template preview', 'معاينة القالب'), kind: mode,
    image: localized.pageTemplate?.image || localized.builderDocument.pages[0]?.featuredImage,
    template: { formAsset: localized.category === 'Forms', templateDesign: localized.design },
  }) : setShowContentPreview(true);
  const openBuilder = (arabic: boolean) => {
    const name = (arabic ? draft.title_ar : draft.name) || draft.name || 'System template';
    const target = arabic ? arabicDocumentRef : documentRef;
    target.current ??= arabic && documentRef.current ? structuredClone(templateArabicDesign({ ...draft, builderDocument: documentRef.current }) || documentRef.current) : createPageAsset(draft.category === 'Forms' ? 'form' : mode, name).document;
    initialBuilderSnapshot.current = '';
    setBuilderArabic(arabic);
    setNativeEditor('design');
  };
  const openNativeEditor = (editor: 'booking' | 'product', arabic: boolean) => {
    setBuilderArabic(arabic);
    setNativeEditor(editor);
  };
  const closeNativeEditor = () => {
    if (nativeEditor === 'design' && initialBuilderSnapshot.current && initialBuilderSnapshot.current !== JSON.stringify(activeDocument.current)) {
      setDraft(current => builderArabic ? { ...current, design_ar: null } : { ...current, design_en: undefined });
    }
    if (nativeEditor === 'product') {
      setParams(current => {
        const next = new URLSearchParams(current);
        next.delete('tab');
        next.delete('type');
        return next;
      }, { replace: true });
    }
    setNativeEditor(null);
  };
  function updatePipeline(pipeline: CustomTemplate, arabic: boolean) {
    setDraft(current => arabic ? {
      ...current, title_ar: pipeline.name, description_ar: pipeline.description, pipeline_template_ar: pipeline,
      content_ar: { ...current.content_ar, steps: pipeline.stages },
    } : {
      ...current, name: pipeline.name, description: pipeline.description, pipelineTemplate: pipeline,
      content: { ...current.content, steps: pipeline.stages },
    });
  }

  function updateAutomation(patch: Partial<Workflow>, arabic: boolean) {
    setDraft(current => {
      if (current.category !== 'Automations') return current;
      const source = arabic ? localizedArabicDraft(current) : current;
      const automation = { ...workflowFromTemplate(source), ...patch };
      const steps = patch.sequenceSteps?.map(step => `${step.action} · ${step.delay} ${step.unit}`);
      return arabic ? {
        ...current, title_ar: automation.name, automation_template_ar: automation,
        content_ar: { ...current.content_ar, ...(steps ? { steps } : {}) },
      } : {
        ...current, name: automation.name, automationTemplate: automation,
        content: { ...current.content, ...(steps ? { steps } : {}) },
      };
    });
  }

  if (nativeEditor === 'design') return <section className="adm-live alm-template-design-page">
    <div className="alm-template-toolbar">
      <button type="button" className="alm-button" onClick={closeNativeEditor}><ArrowLeft size={15}/>{t('Template details', 'تفاصيل القالب')}</button>
      <h1>{builderArabic ? t('Arabic design', 'التصميم بالعربية') : t('Visual page design', 'التصميم المرئي للصفحة')}</h1>
      <button type="button" className="alm-button primary" onClick={closeNativeEditor}><Save size={15}/>{t('Use builder changes', 'استخدام تغييرات المحرر')}</button>
    </div>
    <div className={mode === 'funnel' ? 'aw-editor-host fn-focused-editor' : 'aw-editor-host fb-website-editor'}>
      <BuilderWorkspace formEditor={draft.category === 'Forms'} mode={mode} document={activeDocument.current} availableForms={[]}
        onBack={closeNativeEditor} onDocumentChange={value => {
          initialBuilderSnapshot.current ||= JSON.stringify(value);
          activeDocument.current = value;
        }}
        onPreview={value => preview({ document: value, name: (builderArabic ? draft.title_ar : draft.name) || value.funnel.name, kind: mode, template: { formAsset: draft.category === 'Forms' } })}/>
    </div>
  </section>;

  const nativeDraft = nativeEditor ? initializeTemplateAsset(builderArabic ? localizedArabicDraft(draft) : draft) : draft;
  if (nativeEditor === 'booking') return <div className="alm-booking-editor-page">
    <BookingBuilder templateEditor page={nativeDraft.bookingPage} pages={[]} close={closeNativeEditor} save={bookingPage => {
      setDraft(current => builderArabic
        ? { ...current, title_ar: bookingPage.name, description_ar: bookingPage.description, booking_page_ar: bookingPage }
        : { ...current, name: bookingPage.name, description: bookingPage.description, bookingPage });
      closeNativeEditor();
    }}/>
  </div>;

  if (nativeEditor === 'product' && nativeDraft.productTemplate) {
    const base = nativeDraft.productTemplate;
    return <ProductTemplateWorkspace creating={!productConfigured && !builderArabic}
      templateEditor={{ product: base.product, close: closeNativeEditor, validate: validateTemplateProduct,
        uploadFile: (file, progress) => uploadTemplateFile(draft.id, ownerUid, file, progress), apply: product => {
        const kind = productKind(product.type);
        const productTemplate = {
          ...base, id: draft.id, product,
          category: kind === 'course' ? 'Courses' as const : kind === 'service' ? 'Services' as const : 'Digital Products' as const,
          features: product.config?.experience?.included.map(item => item.title) || [],
        };
        setDraft(current => builderArabic
          ? { ...current, title_ar: product.name, description_ar: product.description, product_template_ar: productTemplate }
          : { ...current, name: product.name, description: product.description, productTemplate });
        if (!builderArabic) setProductConfigured(true);
        closeNativeEditor();
      } }}/>;
  }

  return <><section className="adm-workspace adm-live alm-template-editor-page" aria-labelledby="template-editor-heading">
    <div className="alm-template-toolbar">
      <button type="button" className="alm-button" disabled={busy} onClick={close}><ArrowLeft size={15}/>{t('Back to templates', 'العودة إلى القوالب')}</button>
      <h1 id="template-editor-heading">{template.updated ? t('Edit template', 'تعديل القالب') : t('Create template', 'إنشاء قالب')}</h1>
      <button type="button" className="alm-button primary" disabled={busy || uploading} onClick={() => void submit()}><Save size={15}/>{busy ? t('Saving…', 'جار الحفظ…') : t('Save template', 'حفظ القالب')}</button>
    </div>
    <div className="alm-editor" inert={busy}>
      {!template.updated && <section className="alm-preset-banner"><span className="alm-record-icon"><Sparkles size={20}/></span><div><h3>{t('Start with a system preset', 'ابدأ بإعداد نظام جاهز')}</h3><p>{t('Choose a starting point, then make it your own.', 'اختر نقطة بداية ثم خصصها كما تريد.')}</p></div><AdminSelect label={t('System preset', 'إعداد النظام')} value={presetId} onChange={loadPreset} options={[{ value: '', label: t('Blank template', 'قالب فارغ') }, ...presets.map(item => ({ value: item.id, label: `${item.category} · ${item.name}` }))]}/></section>}
      <div className="alm-form-grid"><label>{t('English title', 'العنوان بالإنجليزية')}<input dir="ltr" aria-label={t("Name", "الاسم")} required maxLength={180} value={draft.name} placeholder={t('e.g. Coaching discovery funnel', 'مثال: قمع استشارات التدريب')} onChange={e => setDraft({ ...draft, name: e.target.value })}/></label><label><span>{t('Category', 'الفئة')}</span><AdminSelect label={t('Category', 'الفئة')} value={draft.category} options={categories.map(value => ({ value, label: templateCategoryLabel(value, ar) }))} onChange={value => { const next = initializeTemplateAsset({ ...draft, category: value as ManagedTemplate['category'], assetType: undefined, pageTemplate: undefined, bookingPage: undefined, productTemplate: undefined, pipelineTemplate: undefined, builderDocument: undefined, builder_document_ar: undefined, design_en: undefined, design_ar: undefined, booking_page_ar: undefined, product_template_ar: undefined, pipeline_template_ar: undefined, automationTemplate: undefined, automation_template_ar: undefined, category_en: undefined, category_ar: undefined }); setDraft(next); setProductConfigured(false); documentRef.current = next.builderDocument; arabicDocumentRef.current = undefined; }}/></label>
        <label className="full">{t('English description', 'الوصف بالإنجليزية')}<textarea dir="ltr" rows={3} maxLength={2000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label><label>{t('Industry', 'المجال')}<input value={draft.industry} onChange={e => setDraft({ ...draft, industry: e.target.value })}/></label><label>{t('Goal', 'الهدف')}<input value={draft.goal} onChange={e => setDraft({ ...draft, goal: e.target.value })}/></label>
        {draft.category === 'Email/SMS/WhatsApp' && <label className="full">{t('Message channel', 'قناة الرسائل')}<AdminSelect label={t('Message channel', 'قناة الرسائل')} value={draft.tags.find(tag => ['Email', 'SMS', 'WhatsApp'].includes(tag)) || 'Email'} options={['Email', 'SMS', 'WhatsApp'].map(value => ({ value, label: value }))} onChange={value => setDraft({ ...draft, tags: [...draft.tags.filter(tag => !['Email', 'SMS', 'WhatsApp'].includes(tag)), value] })}/></label>}
        <label>{t('English category label', 'اسم الفئة بالإنجليزية')}<input dir="ltr" maxLength={100} value={draft.category_en ?? draft.category} onChange={e => setDraft({ ...draft, category_en: e.target.value })}/></label>
        <label>{t('English tags (comma-separated)', 'الوسوم بالإنجليزية (مفصولة بفواصل)')}<input dir="ltr" key={presetId + draft.category + draft.tags.filter(tag => ['Email', 'SMS', 'WhatsApp'].includes(tag)).join()} defaultValue={draft.tags.join(', ')} onBlur={e => setDraft(current => ({ ...current, tags: splitTemplateList(e.target.value, /[,،]/) }))}/></label>
      </div>
      <section className="alm-editor-section" dir="rtl" lang="ar">
        <h3>{t('Arabic translation', 'الترجمة العربية')}</h3>
        <div className="alm-form-grid">
          <label>{t('Arabic title', 'العنوان بالعربية')}<input maxLength={180} value={draft.title_ar || ''} onChange={e => setDraft({ ...draft, title_ar: e.target.value })}/></label>
          <label>{t('Arabic category label', 'اسم الفئة بالعربية')}<input maxLength={100} value={draft.category_ar ?? templateCategoryLabel(draft.category, true)} onChange={e => setDraft({ ...draft, category_ar: e.target.value })}/></label>
          <label className="full">{t('Arabic description', 'الوصف بالعربية')}<textarea rows={3} maxLength={2000} value={draft.description_ar || ''} onChange={e => setDraft({ ...draft, description_ar: e.target.value })}/></label>
          <label>{t('Arabic tags (comma-separated)', 'الوسوم بالعربية (مفصولة بفواصل)')}<input key={presetId} defaultValue={draft.tags_ar?.join('، ') || ''} onBlur={e => setDraft(current => ({ ...current, tags_ar: splitTemplateList(e.target.value, /[,،]/) }))}/></label>
          <label>{t('Arabic headline', 'العنوان الرئيسي بالعربية')}<input value={draft.content_ar?.headline || ''} onChange={e => setDraft({ ...draft, content_ar: { ...draft.content_ar, headline: e.target.value } })}/></label>
          <label className="full">{t('Arabic steps (one per line)', 'الخطوات بالعربية (خطوة في كل سطر)')}<textarea key={presetId} rows={4} defaultValue={draft.content_ar?.steps?.join('\n') || ''} onBlur={e => setDraft(current => ({ ...current, content_ar: { ...current.content_ar, steps: splitTemplateList(e.target.value, /\n/) } }))}/></label>
        </div>
      </section>
      {!['Booking Pages', 'Products', 'CRM Pipelines', 'Automations'].includes(draft.category) && <section className="alm-editor-section"><header><div><h3>{t('Experience content', 'محتوى التجربة')}</h3><p>{t('The content copied into new workspace templates.', 'المحتوى الذي يتم نسخه إلى قوالب مساحات العمل الجديدة.')}</p></div><Layers3 size={20}/></header><label>{t('Headline', 'العنوان الرئيسي')}<input value={draft.content.headline} onChange={e => updateContent({ headline: e.target.value })}/></label>
        <div className="alm-step-editor"><span className="alm-field-label">{t('Steps', 'الخطوات')}</span>{draft.content.steps.map((step, index) => <div key={index}><span>{String(index + 1).padStart(2, '0')}</span><input aria-label={`${t('Step', 'الخطوة')} ${index + 1}`} value={step} onChange={e => updateContent({ steps: draft.content.steps.map((item, i) => i === index ? e.target.value : item) })}/><button type="button" className="alm-icon-button" aria-label={`${t('Remove step', 'حذف الخطوة')} ${index + 1}`} onClick={() => updateContent({ steps: draft.content.steps.filter((_, i) => i !== index) })}><Trash2 size={15}/></button></div>)}<button type="button" className="alm-button subtle" onClick={() => updateContent({ steps: [...draft.content.steps, ''] })}><Plus size={14}/>{t('Add step', 'إضافة خطوة')}</button></div>
        <div className="alm-form-grid"><label>{t('Language', 'اللغة')}<AdminSelect label={t('Language', 'اللغة')} value={draft.content.settings.language} options={[...new Set(['en', 'ar', draft.content.settings.language])].map(value => ({ value, label: value === 'en' ? 'English' : value === 'ar' ? 'العربية' : value }))} onChange={language => updateContent({ settings: { ...draft.content.settings, language } })}/></label><label className="alm-checkbox"><input type="checkbox" checked={draft.content.settings.enabled} onChange={e => updateContent({ settings: { ...draft.content.settings, enabled: e.target.checked } })}/><span>{t('Enable configuration by default', 'تفعيل الإعدادات افتراضياً')}</span></label></div>
      </section>}
      {draft.category === 'Automations' && <section key={presetId} className="alm-editor-section">
        <h3>{t('Workflow configuration', 'إعداد سير العمل')}</h3>
        <AdminAutomationTemplateFields value={workflowFromTemplate(draft)} onChange={patch => updateAutomation(patch, false)}/>
        <details dir="rtl" lang="ar"><summary>{t('Arabic content configuration', 'إعداد المحتوى بالعربية')}</summary>
          <AdminAutomationTemplateFields value={workflowFromTemplate(localizedArabicDraft(draft))} onChange={patch => updateAutomation(patch, true)}/>
        </details>
      </section>}
      {draft.category === 'CRM Pipelines' && draft.pipelineTemplate && <section className="alm-editor-section crm-workspace crm-template-form">
        <PipelineTemplateFields value={{ ...draft.pipelineTemplate, name: draft.name, description: draft.description }} onChange={value => updatePipeline(value, false)}/>
        <details dir="rtl" lang="ar"><summary>{t('Arabic content configuration', 'إعداد المحتوى بالعربية')}</summary>
          <PipelineTemplateFields value={localizedArabicDraft(draft).pipelineTemplate!} onChange={value => updatePipeline(value, true)}/>
        </details>
      </section>}
      {(draft.category === 'Booking Pages' || draft.category === 'Products') && <section className="alm-builder-entry">
        <LayoutTemplate size={26}/>
        <div><h3>{draft.category === 'Products' ? t('Product editor', 'محرر المنتج') : t('Booking page editor', 'محرر صفحة الحجز')}</h3></div>
        <div className="alm-inline-actions">
          <button type="button" className="alm-button" onClick={() => openNativeEditor(draft.category === 'Products' ? 'product' : 'booking', false)}>{t('Open editor', 'فتح المحرر')}<ArrowRight size={15}/></button>
          <button type="button" className="alm-button" onClick={() => openNativeEditor(draft.category === 'Products' ? 'product' : 'booking', true)}>{t('Edit Arabic content', 'تحرير المحتوى العربي')}<ArrowRight size={15}/></button>
        </div>
      </section>}
      {web && <section className="alm-editor-section alm-thumbnail-editor"><header><div><h3>{t('Template image', 'صورة القالب')}</h3><p>{t('Shown on this template card in the user template gallery.', 'تظهر على بطاقة هذا القالب في مكتبة قوالب المستخدمين.')}</p></div><ImagePlus size={20}/></header>
        <div className="alm-thumbnail-row">{draft.thumbnail ? <img className="alm-thumbnail-preview" src={draft.thumbnail} alt={t('Template image preview', 'معاينة صورة القالب')}/> : <div className="alm-thumbnail-preview alm-thumbnail-empty">{t('No image yet · the default card art is used.', 'لا توجد صورة بعد · يتم استخدام شكل البطاقة الافتراضي.')}</div>}
          <div className="alm-inline-actions"><input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => void chooseThumbnail(e.target.files?.[0])}/><button type="button" className="alm-button" disabled={busy || uploading} onClick={() => imageInput.current?.click()}><ImagePlus size={15}/>{uploading ? t('Uploading…', 'جار الرفع…') : draft.thumbnail ? t('Change image', 'تغيير الصورة') : t('Upload image', 'رفع صورة')}</button>{draft.thumbnail && <button type="button" className="alm-button subtle" disabled={busy || uploading} onClick={() => setDraft(d => ({ ...d, thumbnail: '' }))}><Trash2 size={15}/>{t('Remove', 'إزالة')}</button>}</div></div>
        <small className="alm-muted">{t('PNG, JPG or WebP up to 5 MB · landscape 16:9 works best. Uploading also sets the featured image in the page builder. Save the template to apply.', 'PNG أو JPG أو WebP حتى 5 ميجابايت · الأفضل صورة عرضية 16:9. رفع الصورة يغير أيضاً الصورة الرئيسية في محرر الصفحات. احفظ القالب للتطبيق.')}</small>
      </section>}
      {web && <section className="alm-builder-entry"><LayoutTemplate size={26}/><div><h3>{t('Visual page design', 'التصميم المرئي للصفحة')}</h3><p>{documentRef.current ? t('Continue editing the saved page layout.', 'تابع تعديل تخطيط الصفحة المحفوظ.') : t('Design pages, sections, typography and responsive layouts.', 'صمم الصفحات والأقسام والخطوط والتخطيطات المتجاوبة.')}</p></div><div className="alm-inline-actions"><button type="button" className="alm-button" onClick={() => openBuilder(false)}>{t('Open page builder', 'فتح محرر الصفحات')}<ArrowRight size={15}/></button><button type="button" className="alm-button" onClick={() => openBuilder(true)}>{t('Edit Arabic design', 'تحرير التصميم العربي')}<ArrowRight size={15}/></button></div></section>}
      <label className="alm-visibility"><span><strong>{t('Publish to workspaces', 'النشر في مساحات العمل')}</strong><small>{t('Active templates appear in the existing user template galleries.', 'تظهر القوالب النشطة في مكتبات قوالب المستخدمين الحالية.')}</small></span><input role="switch" aria-label={t('Active / Published', 'نشط / منشور')} type="checkbox" checked={templateIsActive(draft)} onChange={e => setDraft({ ...draft, active: e.target.checked, status: e.target.checked ? 'Published' : 'Draft' })}/></label>
      {error && <div className="alm-error-inline" role="alert">{error}</div>}
      <button type="button" className="alm-button" onClick={openPreview}><Eye size={16}/>{t('Preview', 'معاينة')}</button>
    </div>
  </section>{showContentPreview && <LiveDialog title={t('Template preview', 'معاينة القالب')} close={() => setShowContentPreview(false)}><TemplateContent template={localized}/></LiveDialog>}</>;
}

function splitTemplateList(value: string, separator: RegExp) {
  return value.split(separator).map(item => item.trim()).filter(Boolean).slice(0, 40);
}

function localizedArabicDraft(draft: ManagedTemplate) {
  return localizeManagedTemplate({ ...draft, title_en: draft.name, description_en: draft.description, content_en: draft.content }, true);
}
