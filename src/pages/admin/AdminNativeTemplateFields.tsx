import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { BookingBuilder } from '../booking/BookingBuilder';
import { InformationForm, ServiceDetails, BookingForm, AccessForm, InstructorCard, IncludedItems, type FormProps } from '../commerce/TypeForms';
import { PricingForm } from '../commerce/PricingForms';
import { defaultConfig, formatPrice, productKind, type Product, type ProductType } from '../commerce/model';
import { configureProduct, customizeProduct } from '../commerce/workspaceLogic';
import { useUILanguage } from '../../i18n/display';
import { initializeTemplateAsset } from '../system-template-assets';
import type { ManagedTemplate } from './managed-template';
import { AdminSelect } from './AdminSelect';
import '../commerce/product-workspace.css';
import '../commerce/type-workspace.css';
import '../commerce/pricing-workspace.css';
import '../commerce/service-workspace.css';

export function AdminNativeTemplateFields({ value, change }: { value: ManagedTemplate; change: Dispatch<SetStateAction<ManagedTemplate>> }) {
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  const latest = useRef(value); latest.current = value;
  const [error, setError] = useState('');
  const [tab, setTab] = useState('information');
  const prepared = initializeTemplateAsset(value);
  if (prepared.assetType === 'booking') return <section className="alm-native-config"><BookingBuilder page={prepared.bookingPage} pages={[]} close={() => {}} onDraftChange={bookingPage => { const current = latest.current; change({ ...current, assetType: 'booking', bookingPage, name: bookingPage.name || current.name, description: bookingPage.description }); }} save={bookingPage => change({ ...latest.current, bookingPage, name: bookingPage.name, description: bookingPage.description })}/></section>;
  if (prepared.assetType === 'pipeline') {
    const preset = prepared.pipelineTemplate!;
    const update = (stages: string[]) => change({ ...prepared, pipelineTemplate: { ...preset, stages }, content: { ...prepared.content, steps: stages } });
    return <section className="alm-editor-section"><h3>{t('Pipeline stages', 'مراحل المبيعات')}</h3><p className="alm-muted">{t('Define 2–10 stages. The final stage represents a won deal.', 'حدد من مرحلتين إلى 10 مراحل. المرحلة الأخيرة تمثل صفقة ناجحة.')}</p><div className="alm-step-editor">{preset.stages.map((stage, index) => <div key={index}><span>{index + 1}</span><input aria-label={`Stage ${index + 1} name`} maxLength={40} value={stage} onChange={e => update(preset.stages.map((s, i) => i === index ? e.target.value : s))}/><button type="button" className="alm-icon-button" aria-label={`Move stage ${index + 1} up`} disabled={index === 0} onClick={() => { const stages = [...preset.stages]; [stages[index - 1], stages[index]] = [stages[index], stages[index - 1]]; update(stages); }}><ArrowUp size={14}/></button><button type="button" className="alm-icon-button" aria-label={`Move stage ${index + 1} down`} disabled={index === preset.stages.length - 1} onClick={() => { const stages = [...preset.stages]; [stages[index + 1], stages[index]] = [stages[index], stages[index + 1]]; update(stages); }}><ArrowDown size={14}/></button><button type="button" className="alm-icon-button" aria-label={`Remove stage ${index + 1}`} disabled={preset.stages.length <= 2} onClick={() => update(preset.stages.filter((_, i) => i !== index))}><Trash2 size={14}/></button></div>)}</div><button type="button" className="alm-button" disabled={preset.stages.length >= 10} onClick={() => update([...preset.stages, ''])}><Plus size={15}/>{t('Add stage', 'إضافة مرحلة')}</button></section>;
  }
  if (prepared.assetType !== 'product') return null;
  const product = prepared.productTemplate!.product, config = product.config!, experience = config.experience!;
  const commit = (update: Product | ((current: Product) => Product)) => change(current => {
    const base = initializeTemplateAsset(current), next = typeof update === 'function' ? update(base.productTemplate!.product) : update;
    return { ...base, name: next.name, description: next.description, productTemplate: { ...base.productTemplate!, product: { ...next, price: formatPrice(next.config!) }, category: next.type === 'Service' ? 'Services' : next.type === 'Course' ? 'Courses' : 'Digital Products' } };
  });
  const props: FormProps = { product, config, experience, products: [], editing: true, update: patch => commit(current => ({ ...current, ...patch })), configure: patch => commit(current => configureProduct(current, typeof patch === 'function' ? patch(current.config!) : patch)), customize: patch => commit(current => customizeProduct(current, patch)), error: setError, busy: () => {} };
  const tabs = ['information', 'pricing', 'delivery', 'access'];
  return <section className="alm-native-config cw-workspace"><label>{t('Product type', 'نوع المنتج')}<AdminSelect label={t('Product type', 'نوع المنتج')} value={product.type} options={['Service', 'Digital Product', 'Course'].map(value => ({ value, label: value }))} onChange={type => commit({ ...product, type: type as ProductType, config: defaultConfig(type as ProductType) })}/></label><div className="alm-resource-tabs">{tabs.map(item => <button type="button" key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === 'information' && <><InformationForm {...props}/><label>{t('Cover image URL', 'رابط صورة الغلاف')}<input type="url" value={product.image || ''} onChange={e => commit({ ...product, image: e.target.value })}/></label>{product.type === 'Course' && <InstructorCard {...props}/>}</>}
    {tab === 'pricing' && <PricingForm {...props}/>}
    {tab === 'access' && <><AccessForm {...props}/><IncludedItems {...props}/></>}
    {tab === 'delivery' && (productKind(product.type) === 'service' ? <><ServiceDetails {...props}/><BookingForm {...props}/></> : product.type === 'Course' ? <><h3>{t('Course curriculum', 'منهج الدورة')}</h3>{config.modules.map((module, index) => <section className="alm-editor-section" key={module.id || index}><label>{t('Module title', 'عنوان الوحدة')}<input value={module.title} onChange={e => props.configure({ modules: config.modules.map((m, i) => i === index ? { ...m, title: e.target.value } : m) })}/></label>{module.lessons.map((item, lessonIndex) => { const lesson = typeof item === 'string' ? { id: `lesson-${lessonIndex}`, title: item, kind: 'Video' as const, duration: '', url: '' } : item; return <div className="alm-form-grid" key={lesson.id}><label>{t('Lesson title', 'عنوان الدرس')}<input value={lesson.title} onChange={e => props.configure({ modules: config.modules.map((m, i) => i === index ? { ...m, lessons: m.lessons.map((l, j) => j === lessonIndex ? { ...lesson, title: e.target.value } : l) } : m) })}/></label><label>{t('Resource URL', 'رابط المصدر')}<input value={lesson.url} onChange={e => props.configure({ modules: config.modules.map((m, i) => i === index ? { ...m, lessons: m.lessons.map((l, j) => j === lessonIndex ? { ...lesson, url: e.target.value } : l) } : m) })}/></label></div>; })}<button type="button" className="alm-button" onClick={() => props.configure({ modules: config.modules.map((m, i) => i === index ? { ...m, lessons: [...m.lessons, { id: crypto.randomUUID(), title: '', kind: 'Video', duration: '', url: '' }] } : m) })}>{t('Add lesson', 'إضافة درس')}</button></section>)}<button type="button" className="alm-button" onClick={() => props.configure({ modules: [...config.modules, { id: crypto.randomUUID(), title: 'New module', lessons: [] }] })}>{t('Add module', 'إضافة وحدة')}</button></> : <><h3>{t('Digital resources', 'الموارد الرقمية')}</h3>{config.assets.map((asset, index) => <div className="alm-form-grid" key={index}><label>{t('File name', 'اسم الملف')}<input value={asset.name} onChange={e => props.configure({ assets: config.assets.map((a, i) => i === index ? { ...a, name: e.target.value } : a) })}/></label><label>{t('Download URL', 'رابط التنزيل')}<input value={asset.url} onChange={e => props.configure({ assets: config.assets.map((a, i) => i === index ? { ...a, url: e.target.value } : a) })}/></label></div>)}<button type="button" className="alm-button" onClick={() => props.configure({ assets: [...config.assets, { name: '', url: '' }] })}>{t('Add resource', 'إضافة مورد')}</button></>)}
    {error && <div role="alert" className="alm-error-inline">{error}</div>}
  </section>;
}
