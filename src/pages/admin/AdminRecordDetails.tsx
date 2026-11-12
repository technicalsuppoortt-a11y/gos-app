import { useCurrency } from '../../context/CurrencyContext';
import { Eye, Globe2, Layers3, ShieldCheck } from 'lucide-react';
import { useUILanguage } from '../../i18n/display';
import { type Directory, type LiveRecord, managementRow } from './live-model';
import { type ManagedTemplate, templateCategoryLabel, templateIsActive } from './managed-template';
import { DetailCard, DetailField, displayDate, displayMoney, LiveDialog, StatusPill } from './AdminLiveUI';
import type { SitePreview } from './AdminSitePreview';
import { BookingLivePreview } from '../booking/BookingLivePreview';

export function TemplateContent({ template }: { template: ManagedTemplate }) {
  const { formatPrice } = useCurrency();
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  if (template.bookingPage) return <div className="alm-native-preview" inert><BookingLivePreview page={template.bookingPage}/></div>;
  if (template.productTemplate) {
    const p = template.productTemplate.product, c = p.config!;
    return <div className="alm-template-content"><div className="alm-template-cover">{p.image && <img src={p.image} alt="" className="alm-product-cover"/>}<span>{p.type}</span><h3>{p.name}</h3><p>{p.description}</p><strong className="alm-detail-price">{displayMoney(String(c.amount), c.currency, formatPrice)}</strong></div><div className="alm-detail-grid"><DetailCard title={t('Included benefits', 'المزايا المشمولة')}><ol className="alm-flow-list">{c.experience?.included.map(item => <li key={item.id}>{item.title}</li>)}</ol></DetailCard><DetailCard title={t('Delivery & access', 'التسليم والوصول')}><dl><DetailField label={t('Billing', 'الفوترة')} value={c.billing}/><DetailField label={t('Access', 'الوصول')} value={c.access}/><DetailField label={t('Duration', 'المدة')} value={c.duration}/><DetailField label={t('Delivery', 'التسليم')} value={c.delivery}/></dl></DetailCard>{c.modules?.map((module, index) => <DetailCard key={module.id || index} title={module.title} wide><ol className="alm-flow-list">{module.lessons.map((lesson, i) => <li key={i}>{typeof lesson === 'string' ? lesson : lesson.title}</li>)}</ol></DetailCard>)}</div></div>;
  }
  if (template.pipelineTemplate) return <div className="alm-template-content"><div className="alm-template-cover"><h3>{template.name}</h3><p>{template.description}</p></div><ol className="alm-flow-list">{template.pipelineTemplate.stages.map((stage, index) => <li key={index}><span>{index + 1}</span><strong>{stage}</strong></li>)}</ol></div>;
  return <div className="alm-template-content"><div className="alm-template-cover"><Layers3 size={28}/><span>{(ar ? template.category_ar : template.category_en) || templateCategoryLabel(template.category, ar)}</span><h3>{template.content?.headline || template.name}</h3><p>{template.description}</p></div><div className="alm-detail-grid">
    <DetailCard title={t('Experience flow', 'تسلسل التجربة')}><ol className="alm-flow-list">{(template.content?.steps || []).map((step, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}</ol>{!template.content?.steps?.length && <p className="alm-muted">{t('No steps configured.', 'لم يتم إعداد خطوات.')}</p>}</DetailCard>
    <DetailCard title={t('Template settings', 'إعدادات القالب')}><dl><DetailField label={t('Language', 'اللغة')} value={template.content?.settings?.language}/><DetailField label={t('Enabled by default', 'مفعل افتراضياً')} value={template.content?.settings?.enabled ? t('Yes', 'نعم') : t('No', 'لا')}/><DetailField label={t('Industry', 'المجال')} value={template.industry}/><DetailField label={t('Goal', 'الهدف')} value={template.goal}/></dl></DetailCard>
  </div></div>;
}

export function AdminRecordDetails({ value, tenants, users, related, close, preview, templatePreviewHref }: {
  value: LiveRecord | ManagedTemplate; tenants: Directory; users: Directory; related: LiveRecord[];
  templatePreviewHref?: string; close: () => void; preview: (value: SitePreview) => void;
}) {
  const { formatPrice } = useCurrency();
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  const record = 'data' in value ? value as LiveRecord : null;
  const template = !record ? value as ManagedTemplate : null;
  const d = record?.data || {};
  const row = record ? managementRow(record, tenants, users, related.filter(r => r.path.split('/').at(-2) === 'calendars'), related.filter(r => r.path.split('/').at(-2) === 'pipelines')) : null;
  const resource = record?.path.split('/').at(-2);
  const name = row?.name || template?.name || '';
  const document = d.document || template?.builderDocument;
  const canPreview = Array.isArray(document?.pages) && document.pages.length > 0;
  return <LiveDialog title={name} subtitle={template ? t('Global system template', 'قالب نظام عام') : t('Workspace record · Read-only supervisory view', 'سجل مساحة العمل · عرض إشرافي للقراءة فقط')} close={close}
    footer={<><span className="alm-preview-note"><ShieldCheck size={14}/>{template ? t('Workspace copies remain independent.', 'نسخ مساحات العمل مستقلة.') : t('Tenant ownership is preserved.', 'يتم الحفاظ على ملكية العميل.')}</span>{templatePreviewHref ? <a className="alm-button primary" href={templatePreviewHref} target="_blank" rel="noopener"><Eye size={15}/>{t('Preview template', 'معاينة القالب')}</a> : canPreview && <button className="alm-button primary" onClick={() => preview({ document, name, domain: row?.domain, image: d.image, settings: d.settings, kind: d.kind === 'funnel' ? 'funnel' : 'website' })}><Eye size={15}/>{template ? t('Preview template', 'معاينة القالب') : t('Preview site', 'معاينة الموقع')}</button>}</>}>
    <div className="alm-detail-hero"><span className="alm-record-icon large">{template ? <Layers3 size={24}/> : <Globe2 size={24}/>}</span><div><h3>{name}</h3><p>{template?.description || d.description || row?.type || t('Production record', 'سجل الإنتاج')}</p></div><StatusPill value={template ? templateIsActive(template) ? 'Published' : 'Draft' : row?.status || 'Unknown'}/></div>
    <div className="alm-detail-grid"><DetailCard title={t('Identity & ownership', 'الهوية والملكية')}><dl>
      <DetailField label={t('Workspace', 'مساحة العمل')} value={row?.tenant || t('Platform', 'المنصة')}/><DetailField label={t('Workspace ID', 'معرف مساحة العمل')} value={row?.workspaceId || 'Platform'}/><DetailField label={t('Owner', 'المالك')} value={row?.owner || t('System library', 'مكتبة النظام')}/><DetailField label={t('Record ID', 'معرف السجل')} value={record?.id || template?.id}/>
    </dl></DetailCard><DetailCard title={t('Overview', 'نظرة عامة')}><dl>
      <DetailField label={t('Type / category', 'النوع / الفئة')} value={row?.type || template?.category}/><DetailField label={t('Updated / created', 'التحديث / الإنشاء')} value={displayDate(row?.date || d.updated || template?.updated || '', ar)}/>
      {row?.domain && <DetailField label={t('Published address', 'العنوان المنشور')} value={<span dir="ltr">{row.domain}</span>}/>}
      {template && <><DetailField label={t('Industry', 'المجال')} value={template.industry}/><DetailField label={t('Goal', 'الهدف')} value={template.goal}/></>}
      {canPreview && <DetailField label={t('Saved pages', 'الصفحات المحفوظة')} value={document.pages.length}/>}
    </dl></DetailCard>
    {canPreview && <DetailCard title={t('Saved pages', 'الصفحات المحفوظة')} wide><div className="alm-saved-pages">{document.pages.map((page: any, index: number) => <div key={page.id || index}><span className="alm-record-icon"><Layers3 size={16}/></span><span><strong>{page.name}</strong><small dir="ltr">{page.path || '/'} · {page.sections?.length || 0} {t('sections', 'أقسام')}</small></span><StatusPill value={page.status || document.funnel?.status || 'Draft'}/></div>)}</div></DetailCard>}
    {resource === 'leads' && <><DetailCard title={t('Contact information', 'معلومات الاتصال')}><dl><DetailField label={t('Email', 'البريد الإلكتروني')} value={row?.email}/><DetailField label={t('Phone', 'الهاتف')} value={d.phone || d.whatsapp}/><DetailField label={t('Company', 'الشركة')} value={d.company}/><DetailField label={t('Source', 'المصدر')} value={row?.source}/></dl></DetailCard><DetailCard title={t('Pipeline & qualification', 'مسار المبيعات والتأهيل')}><dl><DetailField label={t('Pipeline', 'مسار المبيعات')} value={row?.pipeline}/><DetailField label={t('Assigned to', 'المسؤول')} value={d.owner}/><DetailField label={t('Qualification', 'التأهيل')} value={d.qualificationStatus}/><DetailField label={t('Follow-up', 'المتابعة')} value={d.followUpState}/></dl></DetailCard></>}
    {(resource === 'bookings' || resource === 'calendars') && <DetailCard title={t('Scheduling details', 'تفاصيل الجدولة')} wide><dl className="alm-fields-columns"><DetailField label={t('Calendar', 'التقويم')} value={row?.calendar || d.name}/><DetailField label={t('Host', 'المضيف')} value={row?.host}/><DetailField label={t('Date / time', 'التاريخ والوقت')} value={displayDate(row?.date || '', ar)}/><DetailField label={t('Timezone', 'المنطقة الزمنية')} value={d.timezone || d.hostTimezone}/><DetailField label={t('Duration', 'المدة')} value={d.duration ? `${d.duration} ${t('minutes', 'دقيقة')}` : undefined}/><DetailField label={t('Location', 'الموقع')} value={d.location}/><DetailField label={t('Guest email', 'بريد الضيف')} value={row?.email}/><DetailField label={t('Service', 'الخدمة')} value={d.serviceName}/></dl></DetailCard>}
    {Array.isArray(d.availability) && <DetailCard title={t('Weekly availability', 'التوفر الأسبوعي')} wide><div className="alm-availability">{d.availability.map((slot: any, i: number) => <div key={i} data-enabled={!!slot.enabled}><strong>{new Intl.DateTimeFormat(ar ? 'ar' : 'en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 1 + Number(slot.day || 0))))}</strong><span>{slot.enabled ? `${slot.start} – ${slot.end}` : t('Unavailable', 'غير متاح')}</span></div>)}</div></DetailCard>}
    {['products', 'orders', 'transactions'].includes(resource || '') && <DetailCard title={t('Pricing & payment', 'التسعير والدفع')} wide><div className="alm-detail-price">{displayMoney(row?.amount || '', row?.currency || '', formatPrice)}</div><dl className="alm-fields-columns"><DetailField label={t('Product', 'المنتج')} value={row?.product || d.name}/><DetailField label={t('Buyer email', 'بريد المشتري')} value={row?.email}/><DetailField label={t('Billing', 'الفوترة')} value={d.config?.billing}/><DetailField label={t('Order reference', 'مرجع الطلب')} value={d.orderId || (resource === 'orders' ? record?.id : '')}/><DetailField label={t('Payment method', 'طريقة الدفع')} value={d.paymentMethod || d.method || d.provider}/><DetailField label={t('Currency', 'العملة')} value={row?.currency}/></dl></DetailCard>}
    {Array.isArray(d.stages) && <DetailCard title={t('Pipeline stages', 'مراحل المبيعات')} wide><ol className="alm-flow-list">{d.stages.map((stage: any, index: number) => <li key={stage.id || index}><span>{index + 1}</span><strong>{typeof stage === 'string' ? stage : stage.label || stage.name || stage.id}</strong></li>)}</ol></DetailCard>}
    {Array.isArray(d.notes) && d.notes.length > 0 && <DetailCard title={t('Notes', 'الملاحظات')} wide>{d.notes.map((note: any, i: number) => <p className="alm-note" key={i}>{typeof note === 'string' ? note : note.text || note.content}</p>)}</DetailCard>}
    {template && <DetailCard title={t('Template experience', 'تجربة القالب')} wide><TemplateContent template={template}/></DetailCard>}
    {!!template?.tags?.length && <DetailCard title={t('Tags', 'الوسوم')} wide><div className="alm-tags">{template.tags.map(tag => <span key={tag}>{tag}</span>)}</div></DetailCard>}
    </div>
  </LiveDialog>;
}
