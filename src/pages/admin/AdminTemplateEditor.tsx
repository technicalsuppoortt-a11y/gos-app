import { createPageAsset } from '../page-templates';
import { initializeTemplateAsset } from '../system-template-assets';
import { validateSystemTemplate } from '../system-template-validation';
import { AdminNativeTemplateFields } from './AdminNativeTemplateFields';
import { useRef, useState } from 'react';
import { ArrowRight, Eye, Layers3, LayoutTemplate, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { BuilderWorkspace, createBuilderDocument } from '../BuilderWorkspace';
import { adminTemplateCategories as categories, industries, goals } from '../system-template-data';
import { useUILanguage } from '../../i18n/display';
import { AdminSelect } from './AdminSelect';
import { LiveDialog } from './AdminLiveUI';
import { TemplateContent } from './AdminRecordDetails';
import { templateIsActive, type ManagedTemplate } from './managed-template';
import type { SitePreview } from './AdminSitePreview';

export function newManagedTemplate(category: ManagedTemplate['category'] = 'Funnels'): ManagedTemplate {
  return { id: crypto.randomUUID(), name: '', description: '', category, industry: industries[0], goal: goals[0], source: 'official', tags: [], updated: '', popularity: 0, color: '#7C3AED', active: false, status: 'Draft', content: { headline: '', steps: ['Welcome'], settings: { enabled: false, language: 'en' } } };
}

export function AdminTemplateEditor({ template, save, close, busy, preview, presets = [] }: {
  template: ManagedTemplate; save: (template: ManagedTemplate) => Promise<string | null>; close: () => void;
  busy: boolean; preview: (value: SitePreview) => void; presets?: ManagedTemplate[];
}) {
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  const [draft, setDraft] = useState(() => initializeTemplateAsset(template));
  const [builder, setBuilder] = useState(false);
  const [presetId, setPresetId] = useState('');
  const [error, setError] = useState('');
  const [showContentPreview, setShowContentPreview] = useState(false);
  const documentRef = useRef(draft.builderDocument);
  const web = ['Funnels', 'Websites', 'Forms', 'Landing Pages'].includes(draft.category);
  const mode = draft.category === 'Funnels' ? 'funnel' : 'website';
  const updateContent = (patch: Partial<ManagedTemplate['content']>) => setDraft(d => ({ ...d, content: { ...d.content, ...patch } }));
  function loadPreset(id: string) {
    setPresetId(id);
    const preset = presets.find(item => item.id === id);
    if (!preset) return;
    const { id: _presetId, ...copy } = structuredClone(preset);
    const next = initializeTemplateAsset({ ...copy, id: template.id, source: 'official', active: false, status: 'Draft', popularity: 0 });
    documentRef.current = next.builderDocument;
    setDraft(next);
  }
  async function submit() {
    if (busy) return;
    if (!draft.name.trim()) { setError(t('Add a name and a headline before saving.', 'أضف اسماً وعنواناً قبل الحفظ.')); return; }
    if (draft.content.steps.some(step => !step.trim())) { setError(t('Complete each step or remove the empty step.', 'أكمل كل خطوة أو احذف الخطوة الفارغة.')); return; }
    setError('');
    const value = initializeTemplateAsset({ ...draft, name: draft.name.trim(), builderDocument: documentRef.current, content: { ...draft.content, headline: draft.content.headline || draft.name } });
    const failures = validateSystemTemplate(value); if (failures.length) { setError(failures.join(' ')); return; }
    const failure = await save(value);
    if (failure) setError(failure);
  }
  const openPreview = () => documentRef.current ? preview({ document: documentRef.current, name: draft.name || t('Template preview', 'معاينة القالب'), kind: mode }) : setShowContentPreview(true);
  return <><LiveDialog wide={builder} title={builder ? t('Design your template', 'صمم القالب') : t('Template editor', 'محرر القالب')}
    subtitle={builder ? t('The same visual builder used by workspace owners.', 'نفس المحرر المرئي المستخدم في مساحات العمل.') : t('Create a reusable experience for every workspace.', 'أنشئ تجربة قابلة لإعادة الاستخدام لكل مساحة عمل.')} close={() => !busy && close()}
    footer={builder ? <><span className="alm-preview-note">{t('Changes stay in this template draft until saved.', 'تبقى التغييرات في مسودة القالب حتى الحفظ.')}</span><button type="button" className="alm-button primary" onClick={() => setBuilder(false)}><Save size={15}/>{t('Use builder changes', 'استخدام تغييرات المحرر')}</button></> : <><span className="alm-preview-note">{templateIsActive(draft) ? t('Visible to user workspaces after saving.', 'سيظهر في مساحات المستخدمين بعد الحفظ.') : t('Draft · Hidden from user galleries.', 'مسودة · مخفي من مكتبات المستخدمين.')}</span><div className="alm-inline-actions"><button type="button" className="alm-button" disabled={busy} onClick={close}>{t('Cancel', 'إلغاء')}</button><button type="button" onClick={() => void submit()} className="alm-button primary" disabled={busy}><Save size={15}/>{busy ? t('Saving…', 'جار الحفظ…') : t('Save template', 'حفظ القالب')}</button></div></>}>
    {builder ? <div className="adm-live-builder"><BuilderWorkspace formEditor={draft.category === 'Forms'} mode={mode} document={documentRef.current} availableForms={[]} onBack={() => setBuilder(false)} onDocumentChange={value => { documentRef.current = value; }} onPreview={value => preview({ document: value, name: draft.name || value.funnel.name, kind: mode })}/></div> : <div className="alm-editor">
      {!template.updated && <section className="alm-preset-banner"><span className="alm-record-icon"><Sparkles size={20}/></span><div><h3>{t('Start with a system preset', 'ابدأ بإعداد نظام جاهز')}</h3><p>{t('Choose a starting point, then make it your own.', 'اختر نقطة بداية ثم خصصها كما تريد.')}</p></div><AdminSelect label={t('System preset', 'إعداد النظام')} value={presetId} onChange={loadPreset} options={[{ value: '', label: t('Blank template', 'قالب فارغ') }, ...presets.map(item => ({ value: item.id, label: `${item.category} · ${item.name}` }))]}/></section>}
      <div className="alm-form-grid"><label>{t('Name', 'الاسم')}<input required maxLength={180} value={draft.name} placeholder={t('e.g. Coaching discovery funnel', 'مثال: قمع استشارات التدريب')} onChange={e => setDraft({ ...draft, name: e.target.value })}/></label><label><span>{t('Category', 'الفئة')}</span><AdminSelect label={t('Category', 'الفئة')} value={draft.category} options={categories.map(value => ({ value, label: value }))} onChange={value => { const next = initializeTemplateAsset({ ...draft, category: value as ManagedTemplate['category'], assetType: undefined, pageTemplate: undefined, bookingPage: undefined, productTemplate: undefined, pipelineTemplate: undefined, builderDocument: undefined }); setDraft(next); documentRef.current = next.builderDocument; }}/></label>
        <label className="full">{t('Description', 'الوصف')}<textarea rows={3} maxLength={2000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label><label>{t('Industry', 'المجال')}<input value={draft.industry} onChange={e => setDraft({ ...draft, industry: e.target.value })}/></label><label>{t('Goal', 'الهدف')}<input value={draft.goal} onChange={e => setDraft({ ...draft, goal: e.target.value })}/></label>
        {draft.category === 'Email/SMS/WhatsApp' && <label className="full">{t('Message channel', 'قناة الرسائل')}<AdminSelect label={t('Message channel', 'قناة الرسائل')} value={draft.tags.find(tag => ['Email', 'SMS', 'WhatsApp'].includes(tag)) || 'Email'} options={['Email', 'SMS', 'WhatsApp'].map(value => ({ value, label: value }))} onChange={value => setDraft({ ...draft, tags: [...draft.tags.filter(tag => !['Email', 'SMS', 'WhatsApp'].includes(tag)), value] })}/></label>}
      </div>
      {!['Booking Pages', 'Products', 'CRM Pipelines'].includes(draft.category) && <section className="alm-editor-section"><header><div><h3>{t('Experience content', 'محتوى التجربة')}</h3><p>{t('The content copied into new workspace templates.', 'المحتوى الذي يتم نسخه إلى قوالب مساحات العمل الجديدة.')}</p></div><Layers3 size={20}/></header><label>{t('Headline', 'العنوان الرئيسي')}<input value={draft.content.headline} onChange={e => updateContent({ headline: e.target.value })}/></label>
        <div className="alm-step-editor"><span className="alm-field-label">{t('Steps', 'الخطوات')}</span>{draft.content.steps.map((step, index) => <div key={index}><span>{String(index + 1).padStart(2, '0')}</span><input aria-label={`${t('Step', 'الخطوة')} ${index + 1}`} value={step} onChange={e => updateContent({ steps: draft.content.steps.map((item, i) => i === index ? e.target.value : item) })}/><button type="button" className="alm-icon-button" aria-label={`${t('Remove step', 'حذف الخطوة')} ${index + 1}`} onClick={() => updateContent({ steps: draft.content.steps.filter((_, i) => i !== index) })}><Trash2 size={15}/></button></div>)}<button type="button" className="alm-button subtle" onClick={() => updateContent({ steps: [...draft.content.steps, ''] })}><Plus size={14}/>{t('Add step', 'إضافة خطوة')}</button></div>
        <div className="alm-form-grid"><label>{t('Language', 'اللغة')}<AdminSelect label={t('Language', 'اللغة')} value={draft.content.settings.language} options={[...new Set(['en', 'ar', draft.content.settings.language])].map(value => ({ value, label: value === 'en' ? 'English' : value === 'ar' ? 'العربية' : value }))} onChange={language => updateContent({ settings: { ...draft.content.settings, language } })}/></label><label className="alm-checkbox"><input type="checkbox" checked={draft.content.settings.enabled} onChange={e => updateContent({ settings: { ...draft.content.settings, enabled: e.target.checked } })}/><span>{t('Enable configuration by default', 'تفعيل الإعدادات افتراضياً')}</span></label></div>
      </section>}
      <AdminNativeTemplateFields key={draft.category} value={draft} change={setDraft}/>
      {web && <section className="alm-builder-entry"><LayoutTemplate size={26}/><div><h3>{t('Visual page design', 'التصميم المرئي للصفحة')}</h3><p>{documentRef.current ? t('Continue editing the saved page layout.', 'تابع تعديل تخطيط الصفحة المحفوظ.') : t('Design pages, sections, typography and responsive layouts.', 'صمم الصفحات والأقسام والخطوط والتخطيطات المتجاوبة.')}</p></div><button type="button" className="alm-button" onClick={() => { documentRef.current ??= createPageAsset(draft.category === 'Forms' ? 'form' : mode, draft.name || 'System template').document; documentRef.current.funnel.name = draft.name || 'System template'; setBuilder(true); }}>{t('Open page builder', 'فتح محرر الصفحات')}<ArrowRight size={15}/></button></section>}
      <label className="alm-visibility"><span><strong>{t('Publish to workspaces', 'النشر في مساحات العمل')}</strong><small>{t('Active templates appear in the existing user template galleries.', 'تظهر القوالب النشطة في مكتبات قوالب المستخدمين الحالية.')}</small></span><input role="switch" aria-label={t('Active / Published', 'نشط / منشور')} type="checkbox" checked={templateIsActive(draft)} onChange={e => setDraft({ ...draft, active: e.target.checked, status: e.target.checked ? 'Published' : 'Draft' })}/></label>
      {error && <div className="alm-error-inline" role="alert">{error}</div>}
      <button type="button" className="alm-button" onClick={openPreview}><Eye size={16}/>{t('Preview', 'معاينة')}</button>
    </div>}
  </LiveDialog>{showContentPreview && <LiveDialog title={t('Template preview', 'معاينة القالب')} close={() => setShowContentPreview(false)}><TemplateContent template={draft}/></LiveDialog>}</>;
}
