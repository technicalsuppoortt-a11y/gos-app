import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Hash,
  KeyRound,
  LoaderCircle,
  Mail,
  PackageCheck,
  Phone,
  Send,
  ShieldCheck,
  Tag,
  UserRound,
} from 'lucide-react';
import type { RootState } from '../../store';
import { useCurrency } from '../../context/CurrencyContext';
import { db } from '../../backend/firebase';
import { useEntities } from '../../backend/workspace';
import {
  buildCustomerProductSnapshot,
  provisionOrUpdateCustomerPortalCredentials,
  type CustomerBuyerSummary,
  type CustomerPurchaseRecord,
} from '../../backend/customerPortal';
import { QuickDetails } from '../../components/ui/QuickDetails';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import type { Product } from './model';
import './purchase-details.css';

type RawOrderRecord = {
  id: string;
  orderId?: string;
  order_id?: string;
  productId?: string;
  product_id?: string;
  productName?: string;
  items?: Array<{ productId?: string; product_id?: string; productName?: string; name?: string; amount?: number }>;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customer?: { name?: string; email?: string; phone?: string };
  email?: string;
  amount?: number;
  total?: number;
  totals?: { dueToday?: number; currency?: string };
  currency?: string;
  method?: string;
  paymentMethod?: string;
  transferAccount?: string;
  discountCode?: string;
  status?: string;
  createdAt?: string;
  paidAt?: string;
  decidedAt?: string;
  note?: string;
};

function getInitials(name: string): string {
  return (
    (name || 'C')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || 'C'
  );
}

function formatLocalizedDate(value: string | undefined, isArabic: boolean): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PurchaseDetailsDialog({
  product,
  record,
  customerPage,
  close,
}: {
  product: Product;
  record?: CustomerPurchaseRecord;
  customerPage: string;
  close: () => void;
}) {
  const lang = useUILanguage();
  const isAr = lang.startsWith('ar');
  const { formatPrice } = useCurrency();
  const tenantId = useSelector((state: RootState) => state.auth.tenant?.id || '');
  const crmLeads = useSelector((state: RootState) => state.crm.leads);
  const orders = useEntities<RawOrderRecord>('orders');
  const transactions = useEntities<RawOrderRecord>('transactions');
  const [checkoutRequests, setCheckoutRequests] = useState<RawOrderRecord[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      collection(db, 'tenants', tenantId, 'checkoutRequests'),
      snap => {
        setCheckoutRequests(snap.docs.map(d => ({ ...(d.data() as RawOrderRecord), id: d.id })));
      },
      () => setCheckoutRequests([])
    );
    return unsub;
  }, [tenantId]);

  const [selectedBuyerIdx, setSelectedBuyerIdx] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [revealPassword, setRevealPassword] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const rawProductId = useMemo(() => {
    if (record?.productId) return record.productId;
    if (product.id.includes('_')) {
      return product.id.slice(product.id.indexOf('_') + 1);
    }
    return product.id;
  }, [record?.productId, product.id]);

  const buyersList = useMemo<CustomerBuyerSummary[]>(() => {
    const merged = new Map<string, CustomerBuyerSummary>();
    const prodNameLower = String(product.name || '').trim().toLowerCase();

    const matchesProduct = (row: RawOrderRecord) => {
      const pid = row.productId || row.product_id;
      if (pid && (pid === rawProductId || pid === product.id)) return true;
      if (prodNameLower && String(row.productName || '').trim().toLowerCase() === prodNameLower) return true;
      if (
        Array.isArray(row.items) &&
        row.items.some(
          it =>
            (it.productId || it.product_id) === rawProductId ||
            (prodNameLower && String(it.productName || it.name || '').trim().toLowerCase() === prodNameLower)
        )
      ) {
        return true;
      }
      return false;
    };

    const upsertBuyer = (entry: CustomerBuyerSummary) => {
      const key = (entry.email || entry.name || entry.orderId || 'buyer').trim().toLowerCase();
      if (!key) return;
      const prev = merged.get(key);
      if (!prev) {
        merged.set(key, entry);
        return;
      }
      merged.set(key, {
        ...prev,
        name: entry.name && entry.name !== 'Customer' ? entry.name : prev.name,
        phone: entry.phone || prev.phone,
        orderId:
          entry.orderId && !entry.orderId.startsWith('order_') && !entry.orderId.startsWith('lead_')
            ? entry.orderId
            : prev.orderId || entry.orderId,
        amount: entry.amount || prev.amount,
        currency: entry.currency || prev.currency,
        paymentMethod: entry.paymentMethod || prev.paymentMethod,
        transferAccount: entry.transferAccount || prev.transferAccount,
        discountCode: entry.discountCode || prev.discountCode,
        purchasedAt: entry.purchasedAt || prev.purchasedAt,
        decidedAt: entry.decidedAt || prev.decidedAt,
        progress: typeof entry.progress === 'number' ? entry.progress : prev.progress,
      });
    };

    if (record?.buyers?.length) {
      for (const b of record.buyers) upsertBuyer(b);
    }

    for (const src of [...checkoutRequests, ...orders, ...transactions]) {
      if (!matchesProduct(src)) continue;
      const statusText = String(src.status || '');
      if (/^rejected$/i.test(statusText)) continue;
      const email = String(src.customerEmail || src.customer?.email || src.email || '').trim();
      const name = String(src.customerName || src.customer?.name || email.split('@')[0] || '').trim();
      if (!email && !name) continue;
      upsertBuyer({
        name: name || 'Customer',
        email,
        phone: src.customerPhone || src.customer?.phone || '',
        orderId: src.orderId || src.order_id || src.id || '',
        amount: Number(src.totals?.dueToday ?? src.total ?? src.amount ?? product.config?.amount ?? 0),
        currency: String(src.currency || src.totals?.currency || product.config?.currency || 'USD'),
        paymentMethod: src.method || src.paymentMethod || '',
        transferAccount: src.transferAccount || '',
        discountCode: src.discountCode || '',
        purchasedAt: src.paidAt || src.createdAt || src.decidedAt || '',
        decidedAt: src.decidedAt || '',
        status: /^(paid|completed|succeeded|approved|active)$/i.test(statusText) ? 'Active' : statusText || 'Active',
      });
    }

    for (const lead of crmLeads) {
      const leadEmail = String(lead.email || '').trim();
      const attached = (lead.attachedProducts || []).find(
        ap =>
          ap.productId === rawProductId ||
          ap.productId === product.id ||
          (prodNameLower && String(ap.productName || '').trim().toLowerCase() === prodNameLower)
      );
      if (attached && leadEmail) {
        upsertBuyer({
          name: lead.name || leadEmail.split('@')[0],
          email: leadEmail,
          phone: lead.phone || '',
          orderId: lead.orderId || `lead_${lead.id}`,
          amount: Number(lead.value || product.config?.amount || 0),
          currency: String(lead.currency || product.config?.currency || 'USD'),
          paymentMethod: lead.source || 'Direct Checkout',
          purchasedAt: attached.attachedAt || lead.createdAt || '',
          status: 'Active',
        });
      }
    }

    for (const student of product.config?.students || []) {
      if (!student?.email) continue;
      upsertBuyer({
        name: student.name || student.email.split('@')[0],
        email: student.email,
        orderId: student.id || '',
        amount: Number(product.config?.amount || 0),
        currency: String(product.config?.currency || 'USD'),
        paymentMethod: 'Course Enrollment',
        purchasedAt: student.enrolledAt || '',
        status: student.status || 'Active',
        progress: student.progress,
      });
    }

    if (record && (record.customerEmail || record.customerName)) {
      upsertBuyer({
        name: record.customerName || record.customerEmail.split('@')[0] || 'Customer',
        email: record.customerEmail,
        phone: record.customerPhone || '',
        orderId: record.orderId || '',
        amount: Number(record.amount ?? product.config?.amount ?? 0),
        currency: String(record.currency || product.config?.currency || 'USD'),
        paymentMethod: record.paymentMethod || '',
        transferAccount: record.transferAccount || '',
        discountCode: record.discountCode || '',
        purchasedAt: record.grantedAt || product.createdAt || '',
        decidedAt: record.decidedAt || '',
        status: record.status || 'Active',
        progress: record.progress,
      });
    }

    return Array.from(merged.values());
  }, [record, checkoutRequests, orders, transactions, crmLeads, product, rawProductId]);

  const activeBuyer = buyersList[selectedBuyerIdx] || buyersList[0];

  const matchedCrmLead = useMemo(() => {
    const targetEmail = (activeBuyer?.email || record?.customerEmail || '').trim().toLowerCase();
    if (!targetEmail) return undefined;
    return crmLeads.find(l => String(l.email || '').trim().toLowerCase() === targetEmail);
  }, [crmLeads, activeBuyer?.email, record?.customerEmail]);

  const buyerName = activeBuyer?.name || matchedCrmLead?.name || record?.customerName || t('Customer');
  const buyerEmail = activeBuyer?.email || record?.customerEmail || '';
  const buyerPhone = activeBuyer?.phone || matchedCrmLead?.phone || record?.customerPhone || '';
  const transactionRef = activeBuyer?.orderId || record?.orderId || record?.purchaseId || product.id;
  const paymentMethod =
    activeBuyer?.paymentMethod ||
    record?.paymentMethod ||
    (Number(record?.amount ?? product.config?.amount ?? 0) === 0 ? 'Free Enrollment' : 'Direct Checkout');
  const transferAccount = activeBuyer?.transferAccount || record?.transferAccount || '';
  const discountCode = activeBuyer?.discountCode || record?.discountCode || '';
  const purchaseDate = activeBuyer?.purchasedAt || record?.grantedAt || product.createdAt || '';
  const approvedDate = activeBuyer?.decidedAt || record?.decidedAt || '';
  const amountPaid = Number(activeBuyer?.amount ?? record?.amount ?? product.config?.amount ?? 0);
  const currencyCode = activeBuyer?.currency || record?.currency || product.config?.currency || 'USD';

  const resolvedPurchaseId = useMemo(() => {
    if (record?.purchaseId) return record.purchaseId;
    const scope = record?.tenantId || tenantId || 'workspace';
    return `${scope}_${rawProductId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }, [record?.purchaseId, record?.tenantId, tenantId, rawProductId]);

  const portalPath = `/portal/${encodeURIComponent(resolvedPurchaseId)}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const customerLoginUrl = buyerEmail
    ? `${origin}/auth/login?portal=1&email=${encodeURIComponent(buyerEmail)}&redirect=${encodeURIComponent(portalPath)}`
    : `${origin}/auth/login?portal=1&redirect=${encodeURIComponent(portalPath)}`;

  const totalLessons = useMemo(() => {
    const mods = record?.productSnapshot?.modules || product.config?.modules || [];
    return mods.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  }, [record?.productSnapshot?.modules, product.config?.modules]);

  const completedLessons = record?.completedLessonIds?.length ?? 0;
  const progressPct = typeof activeBuyer?.progress === 'number' ? activeBuyer.progress : record?.progress ?? 0;
  const assetsCount = record?.productSnapshot?.assets?.length || product.config?.assets?.length || 0;

  const copyValue = async (key: string, value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      showToast.success(isAr ? `تم نسخ ${label}` : `${label} copied`);
      window.setTimeout(() => setCopiedField(prev => (prev === key ? null : prev)), 1800);
    } catch {
      showToast.error(t('Could not copy to clipboard.'));
    }
  };

  const buildProvisionRecord = (): CustomerPurchaseRecord => {
    return (
      record ? {
        ...record,
        purchaseId: resolvedPurchaseId,
        productId: rawProductId,
        customerName: buyerName,
        customerEmail: buyerEmail,
        customerPhone: buyerPhone,
        paymentMethod,
        orderId: transactionRef,
        amount: amountPaid,
        currency: currencyCode,
      } : {
        id: resolvedPurchaseId,
        purchaseId: resolvedPurchaseId,
        tenantId: tenantId || 'workspace',
        orderId: transactionRef,
        productId: rawProductId,
        customerUid: '',
        customerEmail: buyerEmail,
        customerName: buyerName,
        customerPhone: buyerPhone,
        paymentMethod,
        amount: amountPaid,
        currency: currencyCode,
        status: 'Active',
        loginUrl: customerLoginUrl,
        portalUrl: `${origin}${portalPath}`,
        productSnapshot: buildCustomerProductSnapshot(product, rawProductId, product.name, product.type),
        completedLessonIds: [],
        progress: progressPct,
        downloadedAssetIds: [],
        downloadCount: 0,
        serviceStatus: 'Order Confirmed',
        grantedAt: purchaseDate || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  };

  const handleSavePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!buyerEmail) {
      showToast.error(t('Customer email is required to set portal credentials.'));
      return;
    }
    if (newPassword.trim().length < 8) {
      showToast.error(t('Password must be at least 8 characters long.'));
      return;
    }
    setSavingCredentials(true);
    try {
      await provisionOrUpdateCustomerPortalCredentials({
        record: buildProvisionRecord(),
        password: newPassword.trim(),
      });
      setNewPassword('');
      setShowPasswordForm(false);
      showToast.success(t('Customer portal password updated and access synced.'));
    } catch {
      showToast.error(t('Could not update customer password. Try sending a reset email instead.'));
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!buyerEmail) return;
    setSendingReset(true);
    try {
      const res = await provisionOrUpdateCustomerPortalCredentials({
        record: buildProvisionRecord(),
        sendResetEmail: true,
      });
      if (res.resetSent) {
        showToast.success(t('Password reset email sent to customer.'));
      } else {
        showToast.error(t('Could not send reset email. Set a password directly instead.'));
      }
    } catch {
      showToast.error(t('Could not send reset email.'));
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <QuickDetails title={t('Customer Details')} close={close}>
      <div className="pdd-drawer">
        {/* Product & Purchase Summary Hero */}
        <div className="pdd-hero">
          <div className="pdd-hero-left">
            <div className="pdd-product-thumb">
              {product.image ? (
                <img src={product.image} alt={product.name} loading="lazy" />
              ) : product.type === 'Course' ? (
                <GraduationCap size={24} />
              ) : product.type === 'Service' ? (
                <CalendarDays size={24} />
              ) : (
                <FileText size={24} />
              )}
            </div>
            <div className="pdd-hero-meta">
              <div className="pdd-hero-badges">
                <span className="pdd-type-pill">{t(product.type)}</span>
                <span className="pdd-status-pill">
                  <span className="pdd-status-dot" aria-hidden="true" />
                  {t(activeBuyer?.status || 'Active')}
                </span>
              </div>
              <h3 className="pdd-product-name" title={product.name}>
                {product.name}
              </h3>
            </div>
          </div>
          <div className="pdd-hero-price">
            <small>{t('Amount Paid')}</small>
            <strong>{amountPaid > 0 ? formatPrice(amountPaid, currencyCode) : t('Free')}</strong>
          </div>
        </div>

        {/* Multi-buyer switcher when multiple buyers purchased this product */}
        {buyersList.length > 1 && (
          <div className="pdd-buyer-switcher">
            <span className="pdd-buyer-switcher-label">
              {t('Purchased Customers')} ({buyersList.length})
            </span>
            <div className="pdd-buyer-pills" role="tablist" aria-label={t('Select buyer')}>
              {buyersList.map((b, idx) => (
                <button
                  key={`${b.email}-${b.orderId}-${idx}`}
                  type="button"
                  role="tab"
                  aria-selected={idx === selectedBuyerIdx}
                  className={`pdd-buyer-pill${idx === selectedBuyerIdx ? ' is-active' : ''}`}
                  onClick={() => setSelectedBuyerIdx(idx)}
                >
                  <UserRound size={12} />
                  <span>{b.name || b.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buyer Complete Profile */}
        <section className="pdd-section" aria-labelledby="pdd-buyer-heading">
          <div className="pdd-section-header">
            <h4 id="pdd-buyer-heading" className="pdd-section-title">
              <UserRound size={15} />
              <span>{t('Buyer Profile')}</span>
            </h4>
            <span className="pdd-status-pill">
              <BadgeCheck size={12} />
              <span>{t('Verified Buyer')}</span>
            </span>
          </div>

          <div className="pdd-buyer-header">
            <div className="pdd-avatar" aria-hidden="true">
              {getInitials(buyerName)}
            </div>
            <div className="pdd-buyer-identity">
              <strong dir="auto">{buyerName}</strong>
              <span dir="ltr">{buyerEmail || t('No email recorded')}</span>
            </div>
          </div>

          <div className="pdd-grid">
            <div className="pdd-field">
              <span className="pdd-field-label">
                <Mail size={12} />
                {t('Email Address')}
              </span>
              <div className="pdd-field-value-row">
                <span className="pdd-field-value" dir="ltr" title={buyerEmail}>
                  {buyerEmail ? <a href={`mailto:${buyerEmail}`}>{buyerEmail}</a> : '—'}
                </span>
                {buyerEmail && (
                  <button
                    type="button"
                    className="pdd-icon-btn"
                    title={t('Copy email')}
                    aria-label={t('Copy email')}
                    onClick={() => void copyValue('email', buyerEmail, t('Email'))}
                  >
                    {copiedField === 'email' ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>

            <div className="pdd-field">
              <span className="pdd-field-label">
                <Phone size={12} />
                {t('Phone Number')}
              </span>
              <div className="pdd-field-value-row">
                <span className="pdd-field-value" dir="ltr">
                  {buyerPhone ? <a href={`tel:${buyerPhone}`}>{buyerPhone}</a> : t('Not provided')}
                </span>
                {buyerPhone && (
                  <button
                    type="button"
                    className="pdd-icon-btn"
                    title={t('Copy phone')}
                    aria-label={t('Copy phone')}
                    onClick={() => void copyValue('phone', buyerPhone, t('Phone'))}
                  >
                    {copiedField === 'phone' ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>

            {matchedCrmLead?.company && (
              <div className="pdd-field">
                <span className="pdd-field-label">
                  <Building2 size={12} />
                  {t('Company')}
                </span>
                <span className="pdd-field-value" dir="auto">
                  {matchedCrmLead.company}
                </span>
              </div>
            )}

            {matchedCrmLead?.stage && (
              <div className="pdd-field">
                <span className="pdd-field-label">
                  <ShieldCheck size={12} />
                  {t('CRM Stage')}
                </span>
                <span className="pdd-field-value">{t(matchedCrmLead.stage)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Payment, Purchase Date & Transaction Reference */}
        <section className="pdd-section" aria-labelledby="pdd-tx-heading">
          <div className="pdd-section-header">
            <h4 id="pdd-tx-heading" className="pdd-section-title">
              <CreditCard size={15} />
              <span>{t('Payment & Transaction Details')}</span>
            </h4>
          </div>

          <div className="pdd-grid">
            <div className="pdd-field is-wide">
              <span className="pdd-field-label">
                <Hash size={12} />
                {t('Transaction Reference')}
              </span>
              <div className="pdd-field-value-row">
                <span className="pdd-field-value pdd-mono" dir="ltr" title={transactionRef}>
                  {transactionRef}
                </span>
                <button
                  type="button"
                  className="pdd-icon-btn"
                  title={t('Copy transaction reference')}
                  aria-label={t('Copy transaction reference')}
                  onClick={() => void copyValue('tx', transactionRef, t('Transaction reference'))}
                >
                  {copiedField === 'tx' ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="pdd-field">
              <span className="pdd-field-label">
                <CreditCard size={12} />
                {t('Payment Method')}
              </span>
              <span className="pdd-field-value" title={paymentMethod}>
                {t(paymentMethod)}
                {transferAccount ? ` (${transferAccount})` : ''}
              </span>
            </div>

            <div className="pdd-field">
              <span className="pdd-field-label">
                <CalendarDays size={12} />
                {t('Purchase Date')}
              </span>
              <span className="pdd-field-value">{formatLocalizedDate(purchaseDate, isAr)}</span>
            </div>

            {approvedDate && (
              <div className="pdd-field">
                <span className="pdd-field-label">
                  <Check size={12} />
                  {t('Approval Date')}
                </span>
                <span className="pdd-field-value">{formatLocalizedDate(approvedDate, isAr)}</span>
              </div>
            )}

            {discountCode && (
              <div className="pdd-field">
                <span className="pdd-field-label">
                  <Tag size={12} />
                  {t('Discount Code')}
                </span>
                <span className="pdd-field-value pdd-mono">{discountCode}</span>
              </div>
            )}
          </div>
        </section>

        {/* Product Access & Fulfillment Progress */}
        <section className="pdd-section" aria-labelledby="pdd-fulfillment-heading">
          <div className="pdd-section-header">
            <h4 id="pdd-fulfillment-heading" className="pdd-section-title">
              <PackageCheck size={15} />
              <span>{t('Fulfillment & Portal Access')}</span>
            </h4>
          </div>

          {product.type === 'Course' ? (
            <div className="pdd-progress-bar-wrap">
              <div className="pdd-progress-meta">
                <span>
                  {totalLessons > 0
                    ? `${completedLessons}/${totalLessons} ${t('lessons')}`
                    : t('Course progress')}
                </span>
                <strong>{progressPct}%</strong>
              </div>
              <div className="pdd-progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                <div className="pdd-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
              </div>
            </div>
          ) : product.type === 'Service' ? (
            <div className="pdd-field">
              <span className="pdd-field-label">{t('Service Status')}</span>
              <span className="pdd-field-value">{t(record?.serviceStatus || 'Order Confirmed')}</span>
            </div>
          ) : (
            <div className="pdd-field">
              <span className="pdd-field-label">{t('Digital Delivery')}</span>
              <span className="pdd-field-value">
                {`${assetsCount} ${t(assetsCount === 1 ? 'digital file' : 'digital files')} · ${
                  record?.downloadCount || 0
                } ${t('downloads')}`}
              </span>
            </div>
          )}

          {/* Direct Customer Portal Login URL + Credentials Provisioning */}
          <div className="pdd-portal-box">
            <span className="pdd-field-label">
              <KeyRound size={12} />
              {t('Customer Portal Login Link')}
            </span>
            <div className="pdd-url-row">
              <input
                type="text"
                readOnly
                dir="ltr"
                value={customerLoginUrl}
                aria-label={t('Customer Portal Login Link')}
                className="pdd-url-input"
                onFocus={e => e.currentTarget.select()}
              />
              <button
                type="button"
                className="pdd-icon-btn"
                title={t('Copy login link')}
                aria-label={t('Copy login link')}
                onClick={() => void copyValue('loginUrl', customerLoginUrl, t('Login link'))}
              >
                {copiedField === 'loginUrl' ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>

            {buyerEmail && (
              <div className="pdd-portal-actions">
                <button
                  type="button"
                  className="pdd-btn-secondary"
                  onClick={() => setShowPasswordForm(v => !v)}
                >
                  <KeyRound size={13} />
                  <span>{t('Set Customer Password')}</span>
                </button>
                <button
                  type="button"
                  className="pdd-btn-secondary"
                  disabled={sendingReset}
                  onClick={() => void handleSendResetEmail()}
                >
                  {sendingReset ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{t('Send Reset Email')}</span>
                </button>
              </div>
            )}

            {showPasswordForm && buyerEmail && (
              <form className="pdd-password-form" onSubmit={handleSavePassword}>
                <span className="pdd-field-label">
                  {t('Assign a password so this customer can sign in immediately at /auth/login:')}
                </span>
                <div className="pdd-password-input-row">
                  <div className="pdd-password-field">
                    <input
                      type={revealPassword ? 'text' : 'password'}
                      value={newPassword}
                      minLength={8}
                      required
                      placeholder={t('Minimum 8 characters')}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="pdd-icon-btn"
                      style={{ border: 0, background: 'transparent' }}
                      aria-label={t(revealPassword ? 'Hide password' : 'Show password')}
                      onClick={() => setRevealPassword(v => !v)}
                    >
                      {revealPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button type="submit" className="pdd-btn-primary" disabled={savingCredentials}>
                    {savingCredentials ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>{t('Save Password')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Footer Actions */}
        <footer className="pdd-footer">
          <button type="button" className="pdd-btn-secondary" onClick={close}>
            {t('Close')}
          </button>
          <Link to={customerPage} className="pdd-btn-primary" onClick={close}>
            <span>{t('See Customer Page')}</span>
            <ArrowRight size={14} className="pdd-rtl-flip" />
            <ExternalLink size={12} style={{ display: 'none' }} aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </QuickDetails>
  );
}
