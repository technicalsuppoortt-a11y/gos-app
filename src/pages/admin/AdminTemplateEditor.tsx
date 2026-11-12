import { createPageAsset } from '../page-templates';
import { initializeTemplateAsset } from '../system-template-assets';
import { validateSystemTemplate } from '../system-template-validation';
import { AdminNativeTemplateFields } from './AdminNativeTemplateFields';
import { useRef, useState } from 'react';
import { ArrowRight, Eye, ImagePlus, Layers3, LayoutTemplate, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { uploadTemplateThumbnail } from '../../backend/adminManagement';
import { backendError } from '../../backend/firebase';
import { BuilderWorkspace, createBuilderDocument } from '../BuilderWorkspace';
import { adminTemplateCategories as categories, industries, goals } from '../system-template-data';
import { useUILanguage } from '../../i18n/display';
import { AdminSelect } from './AdminSelect';
import { LiveDialog } from './AdminLiveUI';
import { TemplateContent } from './AdminRecordDetails';
import { editableArabicFields, localizeManagedTemplate, templateArabicMetadata, templateCategoryLabel, templateIsActive, type ManagedTemplate } from './managed-template';
import type { SitePreview } from './AdminSitePreview';

export function newManagedTemplate(category: ManagedTemplate['category'] = 'Funnels'): ManagedTemplate {
  return { id: crypto.randomUUID(), name: '', description: '', category, industry: industries[0], goal: goals[0], source: 'official', tags: [], updated: '', popularity: 0, color: '#7C3AED', active: false, status: 'Draft', content: { headline: '', steps: ['Welcome'], settings: { enabled: false, language: 'en' } } };
}

export function AdminTemplateEditor({ template, save, close, busy, preview, presets = [], ownerUid = '' }: {
  template: ManagedTemplate; save: (template: ManagedTemplate) => Promise<string | null>; close: () => void;
  busy: boolean; preview: (value: SitePreview) => void; presets?: ManagedTemplate[]; ownerUid?: string;
}) {
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  const [draft, setDraft] = useState(() => initializeTemplateAsset({ ...template, ...templateArabicMetadata(template), ...editableArabicFields(template) }));
  const [builderArabic, setBuilderArabic] = useState(false);
  const [showArabicNative, setShowArabicNative] = useState(false);
  const [builder, setBuilder] = useState(false);
  const [presetId, setPresetId] = useState('');
  const [error, setError] = useState('');
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const documentRef = useRef(draft.builderDocument);
  const arabicDocumentRef = useRef(draft.builder_document_ar);
  const activeDocument = builderArabic ? arabicDocumentRef : documentRef;
  const web = ['Funnels', 'Websites', 'Forms', 'Landing Pages'].includes(draft.category);
  const mode = draft.category === 'Funnels' ? 'funnel' : 'website';
  const updateContent = (patch: Partial<ManagedTemplate['content']>) => setDraft(d => ({ ...d, content: { ...d.content, ...patch } }));
  function loadPreset(id: string) {
    setPresetId(id);
    const preset = presets.find(item => item.id === id);
    if (!preset) return;
    const { id: _presetId, ...copy } = structuredClone(preset);
    const next = initializeTemplateAsset({ ...copy, ...templateArabicMetadata(preset), ...editableArabicFields(preset), id: template.id, source: 'official', active: false, status: 'Draft', popularity: 0 });
    documentRef.current = next.builderDocument;
    arabicDocumentRef.current = next.builder_document_ar;
    setDraft(next);
  }
  async function submit() {
    if (busy) return;
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
      builder_document_ar: arabicDocumentRef.current,
    });
    const failures = validateSystemTemplate(value);
    if (value.builder_document_ar || value.booking_page_ar || value.product_template_ar || value.pipeline_template_ar) {
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
  const openPreview = () => localized.builderDocument ? preview({ document: localized.builderDocument, name: localized.name || t('Template preview', 'معاينة القالب'), kind: mode }) : setShowContentPreview(true);
  const openBuilder = (arabic: boolean) => {
    const name = (arabic ? draft.title_ar : draft.name) || draft.name || 'System template';
    const target = arabic ? arabicDocumentRef : documentRef;
    target.current ??= arabic && documentRef.current ? structuredClone(documentRef.current) : createPageAsset(draft.category === 'Forms' ? 'form' : mode, name).document;
    setBuilderArabic(arabic);
    setBuilder(true);
  };
  const changeArabicNative: typeof setDraft = change => setDraft(current => {
    const value = localizeManagedTemplate({ ...current, title_en: current.name, description_en: current.description, content_en: current.content }, true);
    const next = typeof change === 'function' ? change(value) : change;
    return { ...current, title_ar: next.name, description_ar: next.description, booking_page_ar: next.bookingPage,
      product_template_ar: next.productTemplate, pipeline_template_ar: next.pipelineTemplate, content_ar: next.content };
  });
  return <><LiveDialog wide={builder} title={builder ? t('Design your template', 'صمم القالب') : t('Template editor', 'محرر القالب')}
    subtitle={builder ? t('The same visual builder used by workspace owners.', 'نفس المحرر المرئي المستخدم في مساحات العمل.') : t('Create a reusable experience for every workspace.', 'أنشئ تجربة قابلة لإعادة الاستخدام لكل مساحة عمل.')} close={() => !busy && close()}
    footer={builder ? <><span className="alm-preview-note">{t('Changes stay in this template draft until saved.', 'تبقى التغييرات في مسودة القالب حتى الحفظ.')}</span><button type="button" className="alm-button primary" onClick={() => setBuilder(false)}><Save size={15}/>{t('Use builder changes', 'استخدام تغييرات المحرر')}</button></> : <><span className="alm-preview-note">{templateIsActive(draft) ? t('Visible to user workspaces after saving.', 'سيظهر في مساحات المستخدمين بعد الحفظ.') : t('Draft · Hidden from user galleries.', 'مسودة · مخفي من مكتبات المستخدمين.')}</span><div className="alm-inline-actions"><button type="button" className="alm-button" disabled={busy} onClick={close}>{t('Cancel', 'إلغاء')}</button><button type="button" onClick={() => void submit()} className="alm-button primary" disabled={busy}><Save size={15}/>{busy ? t('Saving…', 'جار الحفظ…') : t('Save template', 'حفظ القالب')}</button></div></>}>
    {builder ? <div className="adm-live-builder"><BuilderWorkspace formEditor={draft.category === 'Forms'} mode={mode} document={activeDocument.current} availableForms={[]} onBack={() => setBuilder(false)} onDocumentChange={value => { activeDocument.current = value; }} onPreview={value => preview({ document: value, name: (builderArabic ? draft.title_ar : draft.name) || value.funnel.name, kind: mode })}/></div> : <div className="alm-editor">
      {!template.updated && <section className="alm-preset-banner"><span className="alm-record-icon"><Sparkles size={20}/></span><div><h3>{t('Start with a system preset', 'ابدأ بإعداد نظام جاهز')}</h3><p>{t('Choose a starting point, then make it your own.', 'اختر نقطة بداية ثم خصصها كما تريد.')}</p></div><AdminSelect label={t('System preset', 'إعداد النظام')} value={presetId} onChange={loadPreset} options={[{ value: '', label: t('Blank template', 'قالب فارغ') }, ...presets.map(item => ({ value: item.id, label: `${item.category} · ${item.name}` }))]}/></section>}
      <div className="alm-form-grid"><label>{t('English title', 'العنوان بالإنجليزية')}<input dir="ltr" aria-label={t("Name", "الاسم")} required maxLength={180} value={draft.name} placeholder={t('e.g. Coaching discovery funnel', 'مثال: قمع استشارات التدريب')} onChange={e => setDraft({ ...draft, name: e.target.value })}/></label><label><span>{t('Category', 'الفئة')}</span><AdminSelect label={t('Category', 'الفئة')} value={draft.category} options={categories.map(value => ({ value, label: templateCategoryLabel(value, ar) }))} onChange={value => { const next = initializeTemplateAsset({ ...draft, category: value as ManagedTemplate['category'], assetType: undefined, pageTemplate: undefined, bookingPage: undefined, productTemplate: undefined, pipelineTemplate: undefined, builderDocument: undefined, builder_document_ar: undefined, booking_page_ar: undefined, product_template_ar: undefined, pipeline_template_ar: undefined, category_en: undefined, category_ar: undefined }); setDraft(next); documentRef.current = next.builderDocument; arabicDocumentRef.current = undefined; }}/></label>
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
      {!['Booking Pages', 'Products', 'CRM Pipelines'].includes(draft.category) && <section className="alm-editor-section"><header><div><h3>{t('Experience content', 'محتوى التجربة')}</h3><p>{t('The content copied into new workspace templates.', 'المحتوى الذي يتم نسخه إلى قوالب مساحات العمل الجديدة.')}</p></div><Layers3 size={20}/></header><label>{t('Headline', 'العنوان الرئيسي')}<input value={draft.content.headline} onChange={e => updateContent({ headline: e.target.value })}/></label>
        <div className="alm-step-editor"><span className="alm-field-label">{t('Steps', 'الخطوات')}</span>{draft.content.steps.map((step, index) => <div key={index}><span>{String(index + 1).padStart(2, '0')}</span><input aria-label={`${t('Step', 'الخطوة')} ${index + 1}`} value={step} onChange={e => updateContent({ steps: draft.content.steps.map((item, i) => i === index ? e.target.value : item) })}/><button type="button" className="alm-icon-button" aria-label={`${t('Remove step', 'حذف الخطوة')} ${index + 1}`} onClick={() => updateContent({ steps: draft.content.steps.filter((_, i) => i !== index) })}><Trash2 size={15}/></button></div>)}<button type="button" className="alm-button subtle" onClick={() => updateContent({ steps: [...draft.content.steps, ''] })}><Plus size={14}/>{t('Add step', 'إضافة خطوة')}</button></div>
        <div className="alm-form-grid"><label>{t('Language', 'اللغة')}<AdminSelect label={t('Language', 'اللغة')} value={draft.content.settings.language} options={[...new Set(['en', 'ar', draft.content.settings.language])].map(value => ({ value, label: value === 'en' ? 'English' : value === 'ar' ? 'العربية' : value }))} onChange={language => updateContent({ settings: { ...draft.content.settings, language } })}/></label><label className="alm-checkbox"><input type="checkbox" checked={draft.content.settings.enabled} onChange={e => updateContent({ settings: { ...draft.content.settings, enabled: e.target.checked } })}/><span>{t('Enable configuration by default', 'تفعيل الإعدادات افتراضياً')}</span></label></div>
      </section>}
      <AdminNativeTemplateFields key={draft.category} value={draft} change={setDraft}/>
      {['Booking Pages', 'Products', 'CRM Pipelines'].includes(draft.category) && <details className="alm-editor-section" dir="rtl" lang="ar"><summary onClick={() => setShowArabicNative(value => !value)}>{t('Arabic content configuration', 'إعداد المحتوى بالعربية')}</summary>{showArabicNative && <AdminNativeTemplateFields key={draft.category + '-ar'} value={localizedArabicDraft(draft)} change={changeArabicNative}/>}</details>}
      {web && <section className="alm-editor-section alm-thumbnail-editor"><header><div><h3>{t('Template image', 'صورة القالب')}</h3><p>{t('Shown on this template card in the user template gallery.', 'تظهر على بطاقة هذا القالب في مكتبة قوالب المستخدمين.')}</p></div><ImagePlus size={20}/></header>
        <div className="alm-thumbnail-row">{draft.thumbnail ? <img className="alm-thumbnail-preview" src={draft.thumbnail} alt={t('Template image preview', 'معاينة صورة القالب')}/> : <div className="alm-thumbnail-preview alm-thumbnail-empty">{t('No image yet · the default card art is used.', 'لا توجد صورة بعد · يتم استخدام شكل البطاقة الافتراضي.')}</div>}
          <div className="alm-inline-actions"><input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => void chooseThumbnail(e.target.files?.[0])}/><button type="button" className="alm-button" disabled={busy || uploading} onClick={() => imageInput.current?.click()}><ImagePlus size={15}/>{uploading ? t('Uploading…', 'جار الرفع…') : draft.thumbnail ? t('Change image', 'تغيير الصورة') : t('Upload image', 'رفع صورة')}</button>{draft.thumbnail && <button type="button" className="alm-button subtle" disabled={busy || uploading} onClick={() => setDraft(d => ({ ...d, thumbnail: '' }))}><Trash2 size={15}/>{t('Remove', 'إزالة')}</button>}</div></div>
        <small className="alm-muted">{t('PNG, JPG or WebP up to 5 MB · landscape 16:9 works best. Uploading also sets the featured image in the page builder. Save the template to apply.', 'PNG أو JPG أو WebP حتى 5 ميجابايت · الأفضل صورة عرضية 16:9. رفع الصورة يغير أيضاً الصورة الرئيسية في محرر الصفحات. احفظ القالب للتطبيق.')}</small>
      </section>}
      {web && <section className="alm-builder-entry"><LayoutTemplate size={26}/><div><h3>{t('Visual page design', 'التصميم المرئي للصفحة')}</h3><p>{documentRef.current ? t('Continue editing the saved page layout.', 'تابع تعديل تخطيط الصفحة المحفوظ.') : t('Design pages, sections, typography and responsive layouts.', 'صمم الصفحات والأقسام والخطوط والتخطيطات المتجاوبة.')}</p></div><div className="alm-inline-actions"><button type="button" className="alm-button" onClick={() => openBuilder(false)}>{t('Open page builder', 'فتح محرر الصفحات')}<ArrowRight size={15}/></button><button type="button" className="alm-button" onClick={() => openBuilder(true)}>{t('Edit Arabic design', 'تحرير التصميم العربي')}<ArrowRight size={15}/></button></div></section>}
      <label className="alm-visibility"><span><strong>{t('Publish to workspaces', 'النشر في مساحات العمل')}</strong><small>{t('Active templates appear in the existing user template galleries.', 'تظهر القوالب النشطة في مكتبات قوالب المستخدمين الحالية.')}</small></span><input role="switch" aria-label={t('Active / Published', 'نشط / منشور')} type="checkbox" checked={templateIsActive(draft)} onChange={e => setDraft({ ...draft, active: e.target.checked, status: e.target.checked ? 'Published' : 'Draft' })}/></label>
      {error && <div className="alm-error-inline" role="alert">{error}</div>}
      <button type="button" className="alm-button" onClick={openPreview}><Eye size={16}/>{t('Preview', 'معاينة')}</button>
    </div>}
  </LiveDialog>{showContentPreview && <LiveDialog title={t('Template preview', 'معاينة القالب')} close={() => setShowContentPreview(false)}><TemplateContent template={localized}/></LiveDialog>}</>;
}

function splitTemplateList(value: string, separator: RegExp) {
  return value.split(separator).map(item => item.trim()).filter(Boolean).slice(0, 40);
}

function localizedArabicDraft(draft: ManagedTemplate) {
  return localizeManagedTemplate({ ...draft, title_en: draft.name, description_en: draft.description, content_en: draft.content }, true);
}
