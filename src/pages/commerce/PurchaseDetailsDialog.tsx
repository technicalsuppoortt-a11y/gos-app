import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Copy, ExternalLink, Hash, Mail, PackageCheck, ShieldCheck, UserRound } from 'lucide-react';
import { QuickDetails } from '../../components/ui/QuickDetails';
import { useEntities } from '../../backend/workspace';
import type { CustomerPurchaseRecord } from '../../backend/customerPortal';
import { useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import type { Product } from './model';
import './purchase-details.css';

type OrderRecord = {
  id: string; orderId?: string; order_id?: string; productId?: string; product_id?: string;
  items?: { productId?: string; product_id?: string }[];
  customerName?: string; customerEmail?: string; email?: string; customer?: { name?: string; email?: string };
  status?: string; createdAt?: string; at?: string; paidAt?: string; amount?: number; total?: number; currency?: string;
};

type Tone = 'success' | 'progress' | 'pending' | 'danger';

const sameEmail = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Detailed buyer & purchase information for one entry of "My Purchases". */
export function PurchaseDetailsDialog({ product, record, customerPage, close }: {
  product: Product; record?: CustomerPurchaseRecord; customerPage: string; close: () => void;
}) {
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : en;
  const orders = useEntities<OrderRecord>('orders');
  const productId = record?.productId || product.id;
  const buyerEmail = record?.customerEmail || '';
  // Preview entries are generated locally; when the workspace holds the real order, show its details.
  const order = useMemo(() => {
    if (record && !record.preview) return undefined;
    const related = orders.filter(item => (item.productId || item.product_id) === productId
      || item.items?.some(line => (line.productId || line.product_id) === productId));
    return related.find(item => sameEmail(item.customerEmail || item.customer?.email || item.email, buyerEmail));
  }, [orders, record, productId, buyerEmail]);

  const name = order?.customerName || order?.customer?.name || record?.customerName || '—';
  const email = order?.customerEmail || order?.customer?.email || order?.email || buyerEmail || '—';
  const orderId = order?.orderId || order?.order_id || order?.id || record?.orderId || '—';
  const purchasedAt = order?.paidAt || order?.createdAt || order?.at || record?.grantedAt || product.createdAt || '';
  const amount = order?.total ?? order?.amount ?? record?.amount ?? product.config?.amount ?? 0;
  const currency = order?.currency || record?.currency || product.config?.currency || 'USD';
  const lessons = record?.productSnapshot?.modules?.reduce((sum, module) => sum + (module.lessons?.length || 0), 0) ?? 0;
  const files = record?.productSnapshot?.assets?.length ?? product.config?.assets?.length ?? 0;
  const progress = record?.progress ?? 0;

  const fulfillment: { label: string; detail: string; tone: Tone } = record?.status === 'Revoked'
    ? { label: t('Access revoked', 'تم إلغاء الوصول'), detail: t('The order was refunded or cancelled.', 'تم استرداد الطلب أو إلغاؤه.'), tone: 'danger' }
    : product.type === 'Course'
      ? progress >= 100
        ? { label: t('Completed', 'مكتمل'), detail: t('All lessons completed.', 'تم إكمال جميع الدروس.'), tone: 'success' }
        : { label: progress > 0 ? t('In progress', 'قيد التقدم') : t('Access granted', 'تم منح الوصول'), detail: lessons ? t(`${record?.completedLessonIds?.length ?? 0} of ${lessons} lessons · ${progress}%`, `${record?.completedLessonIds?.length ?? 0} من ${lessons} دروس · ${progress}%`) : t(`${progress}% completed`, `${progress}% مكتمل`), tone: progress > 0 ? 'progress' : 'success' }
      : product.type === 'Service'
        ? { label: serviceLabel(record?.serviceStatus || 'Order Confirmed', ar), detail: record?.scheduledAt ? t('Session: ', 'الجلسة: ') + formatDateTime(record.scheduledAt, ar) : t('Waiting for the session to be scheduled.', 'بانتظار تحديد موعد الجلسة.'), tone: record?.serviceStatus === 'Completed' ? 'success' : record?.serviceStatus && record.serviceStatus !== 'Order Confirmed' ? 'progress' : 'pending' }
        : { label: record?.downloadCount ? t('Delivered', 'تم التسليم') : t('Ready to download', 'جاهز للتنزيل'), detail: t(`${files} ${files === 1 ? 'file' : 'files'} · downloaded ${record?.downloadCount ?? 0} times`, `${files} ${files === 1 ? 'ملف' : 'ملفات'} · تم التنزيل ${record?.downloadCount ?? 0} مرة`), tone: 'success' };

  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); showToast.success(t(`${label} copied.`, `تم نسخ ${label}.`)); }
    catch { showToast.error(t('Copy is not available in this browser.', 'النسخ غير متاح في هذا المتصفح.')); }
  };
  const copyButton = (value: string, label: string) => value && value !== '—'
    ? <button type="button" className="pdd-copy" aria-label={t(`Copy ${label}`, `نسخ ${label}`)} title={t('Copy', 'نسخ')} onClick={() => void copy(value, label)}><Copy size={13}/></button>
    : null;

  return <QuickDetails title={t('Buyer details', 'تفاصيل المشتري')} close={close}>
    <section className="pdd-product">
      {product.image ? <img src={product.image} alt="" loading="lazy"/> : <span className="pdd-product-icon"><PackageCheck size={20}/></span>}
      <div><strong>{product.name}</strong><small>{typeLabel(product.type, ar)} · {formatMoney(amount, currency, ar)}</small></div>
      <span className={`pdd-status pdd-${fulfillment.tone}`}><CheckCircle2 size={13}/>{fulfillment.label}</span>
    </section>
    {record?.preview && !order && <p className="pdd-note" role="note"><ShieldCheck size={15}/>{t('Preview access — this entry mirrors your own product so you can review the customer experience. No customer order is attached yet.', 'وصول للمعاينة — يعكس هذا العنصر منتجك لتتمكن من مراجعة تجربة العميل. لا يوجد طلب عميل مرتبط به بعد.')}</p>}
    <section aria-labelledby="pdd-buyer">
      <h3 id="pdd-buyer">{t('Buyer', 'المشتري')}</h3>
      <dl>
        <div><dt><UserRound size={13}/>{t('Customer name', 'اسم العميل')}</dt><dd>{name}</dd></div>
        <div><dt><Mail size={13}/>{t('Email', 'البريد الإلكتروني')}</dt><dd className="pdd-inline" dir="ltr">{email !== '—' ? <a href={`mailto:${email}`}>{email}</a> : email}{copyButton(email, t('email', 'البريد الإلكتروني'))}</dd></div>
      </dl>
    </section>
    <section aria-labelledby="pdd-order">
      <h3 id="pdd-order">{t('Purchase', 'الشراء')}</h3>
      <dl>
        <div><dt><Hash size={13}/>{t('Order ID', 'رقم الطلب')}</dt><dd className="pdd-inline pdd-mono" dir="ltr">{orderId}{copyButton(orderId, t('order ID', 'رقم الطلب'))}</dd></div>
        <div><dt><CalendarClock size={13}/>{t('Purchased on', 'تاريخ الشراء')}</dt><dd>{purchasedAt ? formatDateTime(purchasedAt, ar) : '—'}</dd></div>
        <div><dt>{t('Amount paid', 'المبلغ المدفوع')}</dt><dd>{formatMoney(amount, currency, ar)}</dd></div>
        <div><dt>{t('Access', 'الوصول')}</dt><dd>{record?.status === 'Revoked' ? t('Revoked', 'ملغى') : t('Active', 'نشط')}</dd></div>
      </dl>
    </section>
    <section aria-labelledby="pdd-fulfillment">
      <h3 id="pdd-fulfillment">{t('Fulfillment', 'حالة التنفيذ')}</h3>
      <dl>
        <div><dt>{t('Status', 'الحالة')}</dt><dd><span className={`pdd-status pdd-${fulfillment.tone}`}>{fulfillment.label}</span></dd></div>
        <div><dt>{t('Details', 'التفاصيل')}</dt><dd>{fulfillment.detail}</dd></div>
        {record?.updatedAt && <div><dt>{t('Last update', 'آخر تحديث')}</dt><dd>{formatDateTime(record.updatedAt, ar)}</dd></div>}
      </dl>
    </section>
    <Link className="detail-primary pdd-open" to={customerPage} onClick={close}><ExternalLink size={15}/>{t('Open customer page', 'فتح صفحة العميل')}</Link>
  </QuickDetails>;
}

function typeLabel(type: string, ar: boolean) {
  if (!ar) return type;
  return type === 'Course' ? 'دورة' : type === 'Service' ? 'خدمة' : type === 'Digital Product' ? 'منتج رقمي' : type;
}
function serviceLabel(status: string, ar: boolean) {
  if (!ar) return status;
  return ({ 'Order Confirmed': 'تم تأكيد الطلب', 'Session Scheduled': 'تم تحديد موعد الجلسة', 'In Progress': 'قيد التنفيذ', Completed: 'مكتمل' } as Record<string, string>)[status] || status;
}
function formatDateTime(value: string, ar: boolean) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function formatMoney(amount: number, currency: string, ar: boolean) {
  try { return new Intl.NumberFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(Number(amount) || 0); }
  catch { return `${currency} ${Number(amount) || 0}`; }
}
