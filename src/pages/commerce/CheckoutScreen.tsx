import { useCurrency } from '../../context/CurrencyContext';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Check, Copy, CreditCard, Landmark, Loader2, LockKeyhole, Tag, UploadCloud } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useCloudState } from '../../backend/workspace';
import { backendError, callBackend, db, primaryAuth } from '../../backend/firebase';
import { encodeFirestoreValue } from '../../backend/firestoreCodec';
import { sha256Hex } from '../../backend/customerPortal';
import { manualBrandLogos, resolvePaymentProviderKey, usePaymentMethods } from '../../backend/paymentMethods';
import { createCheckoutSession, verifyCheckoutSession } from '../../backend/stripeService';
import {
  createPaymobCheckoutSession,
  expandPaymobCheckoutOptions,
  extractPaymobReturnParams,
  readPaymobPublicConfig,
  stripPaymobReturnParams,
  verifyPaymobCheckoutSession,
  type PaymobPaymentOption,
  type PaymobPublicConfig,
} from '../../backend/paymobService';
import { track } from '../../backend/marketingTracking';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import type { Discount } from '../discounts-data';
import { PolicyPreviewLink } from './PolicyPreview';
import { checkoutFieldList, defaultExperience, productKind, type Billing, type CheckoutField, type Product } from './model';
import { checkoutTotals, resolvePromoDiscount } from './checkout-model';
import { useProducts } from './repository';
import './dynamic-checkout.css';
import './product-checkout.css';
import { GatewayBrandIcon, hasGatewayBrand } from '../../components/payments/GatewayBrandIcon';

type Totals = ReturnType<typeof checkoutTotals> & { currency: string };
type Method = { id: string; provider?: string; paymentOption?: PaymobPaymentOption; type?: 'manual' | 'gateway'; name: string; account?: string; instructions?: string };

function CheckoutMethodIcon({ provider, id, name, isManual }: { provider?: string; id?: string; name: string; isManual: boolean }) {
  const key = resolvePaymentProviderKey(provider, id, name);
  if (hasGatewayBrand(key)) return <GatewayBrandIcon provider={key}/>;
  const logo = manualBrandLogos[key];
  if (logo) {
    return (
      <span className={`pco-brand-frame ${key}`}>
        <img className="pco-brand-logo" src={logo} alt={name} loading="lazy" />
      </span>
    );
  }
  return (
    <span className={`pco-icon pco-brand-fallback ${key}`}>
      {isManual || key === 'bank' ? <Landmark size={18} /> : <CreditCard size={18} />}
    </span>
  );
}
type Quote = {
  revision: string;
  totals: Totals;
  methods: Method[];
  bump: { id: string; name: string; amount: number } | null;
  fields: CheckoutField[];
  requiresTerms: boolean;
  guestAllowed: boolean;
  terms: { termsUrl?: string; termsMode?: 'default' | 'custom' | null; privacyUrl?: string; privacyMode?: 'default' | 'custom' | null };
  installments: number;
  frequency: string;
  trialDays: number;
};
type Preview = { methods: Method[]; loading: boolean; error: string; retry: () => void; bump: Quote['bump']; discounts: Discount[]; billing?: Billing };
const allowedFiles = ['image/png', 'image/jpeg', 'application/pdf'];
const receiptLimit = 15 * 1024 * 1024;

function encodeReceipt(file: File): Promise<{ name: string; type: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The receipt could not be read. Choose the file again.'));
    reader.onload = () => resolve({ name: file.name, type: file.type, data: String(reader.result).split(',')[1] });
    reader.readAsDataURL(file);
  });
}

async function encodeReceiptForMirror(
  file: File,
  encoded?: { name: string; type: string; data: string }
): Promise<{ name: string; type: string; dataUrl?: string }> {
  const base = encoded ?? (await encodeReceipt(file));
  const rawDataUrl = `data:${base.type};base64,${base.data}`;
  if (rawDataUrl.length <= 620_000) {
    return { name: base.name, type: base.type, dataUrl: rawDataUrl };
  }
  if (base.type.startsWith('image/') && typeof document !== 'undefined') {
    try {
      const compressed = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1360;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.76));
        };
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = rawDataUrl;
      });
      if (compressed && compressed.length <= 750_000) {
        return { name: base.name, type: 'image/jpeg', dataUrl: compressed };
      }
    } catch {
      /* Fall back to metadata if compression fails */
    }
  }
  return { name: base.name, type: base.type };
}

export type CheckoutSubmissionScope = { tenantId: string; ownerId?: string };

export function CheckoutScreen({
  product,
  billing,
  tenantId,
  submissionScope,
}: {
  product: Product;
  billing?: Billing;
  tenantId?: string;
  submissionScope?: CheckoutSubmissionScope;
}) {
  return tenantId
    ? <CheckoutForm key={tenantId + '/' + product.id} product={product} tenantId={tenantId}/>
    : <PreviewCheckout product={product} billing={billing} submissionScope={submissionScope}/>;
}

function PreviewCheckout({
  product,
  billing,
  submissionScope,
}: {
  product: Product;
  billing?: Billing;
  submissionScope?: CheckoutSubmissionScope;
}) {
  const config = product.config!, experience = config.experience ?? defaultExperience();
  const payments = usePaymentMethods({ scope: 'user' }), products = useProducts();
  const [paymobPublic, setPaymobPublic] = useState<PaymobPublicConfig | null>(null);
  useEffect(() => {
    let active = true;
    if (!payments.tenantId) return;
    void readPaymobPublicConfig('user', payments.tenantId).then(cfg => {
      if (active) setPaymobPublic(cfg);
    });
    return () => { active = false; };
  }, [payments.tenantId]);
  const [discounts] = useCloudState<Discount[]>('gos-discounts-v1', []);
  const addOn = experience.checkout.bumpEnabled && products.find(item => item.id === experience.checkout.bumpProductId && item.id !== product.id && item.status === 'Active' && item.config?.currency === config.currency && item.config.billing === 'One-time');
  const bump = addOn ? { id: addOn.id, name: addOn.name, amount: addOn.config!.amount } : null;
  const methods: Method[] = payments.methods
    .filter(item => item.enabled && (item.type === 'manual' || item.status === 'Connected' || item.status === 'Configured'))
    .flatMap((item): Method[] => {
      const providerKey = resolvePaymentProviderKey(item.provider, item.id, item.name);
      if (item.type === 'manual') {
        return [{
          id: item.id || providerKey || item.name,
          provider: providerKey,
          type: 'manual',
          name: item.name,
          account: item.account,
          instructions: item.instructions,
        }];
      }
      if (providerKey === 'stripe') {
        const stripeLabels = ['Visa', 'Mastercard', 'Apple Pay', 'Google Pay'] as const;
        const allowed = stripeLabels.filter(label => experience.paymentMethods.includes(label));
        const labels: readonly string[] = allowed.length ? allowed : [item.name];
        return labels.map(label => ({
          id: label,
          provider: 'stripe',
          type: 'gateway',
          name: label,
        }));
      }
      if (providerKey === 'paymob') {
        return expandPaymobCheckoutOptions(item.name, paymobPublic);
      }
      return [{
        id: item.id || providerKey || item.name,
        provider: providerKey,
        type: 'gateway',
        name: item.name,
      }];
    });
  return <CheckoutForm key={product.id} product={product} submissionScope={submissionScope} preview={{ methods, loading: payments.loading, error: payments.error, retry: payments.refresh, bump, discounts, billing }}/>;
}

function CheckoutForm({
  product,
  preview,
  tenantId,
  submissionScope,
}: {
  product: Product;
  preview?: Preview;
  tenantId?: string;
  submissionScope?: CheckoutSubmissionScope;
}) {
  useUILanguage();
  const { formatCheckoutPrice } = useCurrency();
  const config = product.config!, experience = config.experience ?? defaultExperience();
  const promoId = useId(), paymentGroup = useId(), title = useId();
  const submission = useRef('');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [phone, setPhone] = useState('');
  const [methodId, setMethod] = useState(''), [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<File>(), [receiptUrl, setReceiptUrl] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [bumpSelected, setBump] = useState(false), [acceptedTerms, setAcceptedTerms] = useState(false);
  const [coupon, setCoupon] = useState(''), [discountCode, setDiscountCode] = useState(''), [promoError, setPromoError] = useState('');
  const [remote, setRemote] = useState<Quote>(), [loading, setLoading] = useState(!!tenantId);
  const [quoteError, setQuoteError] = useState(''), [submitError, setSubmitError] = useState('');
  const [reload, setReload] = useState(0), [busy, setBusy] = useState(false), [confirmation, setConfirmation] = useState('');
  const [instantAccess, setInstantAccess] = useState(false);
  const [discountEmail, setDiscountEmail] = useState('');

  const [persistedSubmission, setPersistedSubmission] = useState(false);

  // Verify Paymob or Stripe Checkout return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const paymobReturn = extractPaymobReturnParams(window.location.search);
    if (paymobReturn) {
      const cleanUrl = new URL(window.location.href);
      stripPaymobReturnParams(cleanUrl);
      window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
      if (paymobReturn.isCancelled) {
        setSubmitError('Paymob payment was not completed. Please try again or choose another payment method.');
        return;
      }
      if (paymobReturn.isPaymobReturn && paymobReturn.sessionId) {
        const effectiveScope = (tenantId || submissionScope?.tenantId || '').trim();
        const effectiveOwnerId = (submissionScope?.ownerId || effectiveScope.replace(/^workspace-/, '')).trim();
        setBusy(true);
        verifyPaymobCheckoutSession(paymobReturn.sessionId, paymobReturn.callbackParams, {
          scope: 'user',
          ownerId: effectiveOwnerId || effectiveScope,
        })
          .then(async res => {
            if (res?.success || res?.paid) {
              const finalOrderId = res.productOrderId || paymobReturn.orderId || paymobReturn.sessionId;
              if (effectiveScope && finalOrderId && !/^pmob_/.test(finalOrderId)) {
                const targetScopes = Array.from(
                  new Set([effectiveScope, effectiveOwnerId ? `workspace-${effectiveOwnerId}` : '', effectiveOwnerId].filter(Boolean))
                );
                await Promise.allSettled(
                  targetScopes.map(sc =>
                    setDoc(
                      doc(db, 'settings', `checkoutRequests_${sc}`, 'items', finalOrderId),
                      { status: 'Approved', paymobSessionId: paymobReturn.sessionId, paymentProvider: 'paymob', reviewedAt: new Date().toISOString() },
                      { merge: true }
                    )
                  )
                );
                try {
                  const paidEmail = String(primaryAuth.currentUser?.email || '').trim().toLowerCase();
                  if (paidEmail) {
                    const leadSlug = paidEmail.replace(/[^a-z0-9]/g, '').slice(0, 24);
                    const leadId = `lead-order-${leadSlug || finalOrderId.slice(0, 16)}`;
                    const paidAmount = Number(product?.config?.amount || 0);
                    const paidCurrency = String(product?.config?.currency || 'EGP');
                    const paymobLead = {
                      id: leadId,
                      name: paidEmail.split('@')[0] || 'Customer',
                      email: paidEmail,
                      source: 'Services',
                      pipelineId: product?.config?.crmRouting?.pipelineId || 'main',
                      stage: product?.config?.crmRouting?.stageId || 'PAYMENT_COMPLETED',
                      lifecycleStage: product?.config?.crmRouting?.stageId || 'PAYMENT_COMPLETED',
                      owner: 'Unassigned',
                      value: paidAmount,
                      currency: paidCurrency,
                      interest: product?.name || 'Product',
                      orderId: finalOrderId,
                      qualificationStatus: 'Qualified',
                      followUpState: 'CUSTOMER',
                      attachedProducts: [{
                        productId: product?.id,
                        productName: product?.name || 'Product',
                        productType: product?.type || 'Course',
                        attachedAt: new Date().toISOString(),
                      }],
                      tags: ['Customer', product?.type || 'Course', product?.name].filter(Boolean),
                      activities: [{
                        id: `act-paymob-${finalOrderId}`,
                        type: 'payment',
                        title: 'Product purchased (Paymob)',
                        detail: `${product?.name || 'Product'} · ${paidCurrency} ${paidAmount.toFixed(2)}`,
                        at: new Date().toISOString(),
                      }],
                      lastActivity: new Date().toISOString(),
                    };
                    for (const sc of targetScopes) {
                      void setDoc(doc(db, 'tenants', sc, 'leads', leadId), encodeFirestoreValue(paymobLead), { merge: true }).catch(() => null);
                    }
                    window.dispatchEvent(new CustomEvent('gos-booking-change', { detail: 'gos-crm-leads-v1' }));
                    window.dispatchEvent(new Event('gos-settings-changed'));
                  }
                } catch {
                  /* ignore optional lead write error */
                }
              }
              setPersistedSubmission(true);
              setInstantAccess(true);
              setConfirmation(finalOrderId);
              showToast.success(t('Payment confirmed!'));
            } else {
              setSubmitError('Paymob payment was not confirmed yet. Please check your transaction status or try again.');
            }
          })
          .catch(err => setSubmitError(backendError(err)))
          .finally(() => setBusy(false));
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get('payment');
    const sessionId = params.get('session_id') || '';
    const returnedOrderId = params.get('order_id') || '';
    if (!paymentState || (paymentState !== 'success' && paymentState !== 'cancelled')) return;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('payment');
    cleanUrl.searchParams.delete('session_id');
    cleanUrl.searchParams.delete('order_id');
    window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    if (paymentState === 'cancelled') {
      setSubmitError('Stripe checkout was cancelled before payment completed.');
      return;
    }
    if (paymentState === 'success' && sessionId) {
      const effectiveScope = (tenantId || submissionScope?.tenantId || '').trim();
      const effectiveOwnerId = (submissionScope?.ownerId || effectiveScope.replace(/^workspace-/, '')).trim();
      setBusy(true);
      verifyCheckoutSession(sessionId, { scope: 'user', ownerId: effectiveOwnerId || effectiveScope })
        .then(async res => {
          if (res?.success || res?.paid) {
            const finalOrderId = res.productOrderId || returnedOrderId || sessionId;
            if (effectiveScope && finalOrderId && !/^cs_/.test(finalOrderId)) {
              const targetScopes = Array.from(
                new Set([effectiveScope, effectiveOwnerId ? `workspace-${effectiveOwnerId}` : '', effectiveOwnerId].filter(Boolean))
              );
              await Promise.allSettled(
                targetScopes.map(sc =>
                  setDoc(
                    doc(db, 'settings', `checkoutRequests_${sc}`, 'items', finalOrderId),
                    { status: 'Approved', stripeSessionId: sessionId, reviewedAt: new Date().toISOString() },
                    { merge: true }
                  )
                )
              );
              try {
                const paidEmail = String(primaryAuth.currentUser?.email || '').trim().toLowerCase();
                if (paidEmail) {
                  const leadSlug = paidEmail.replace(/[^a-z0-9]/g, '').slice(0, 24);
                  const leadId = `lead-order-${leadSlug || finalOrderId.slice(0, 16)}`;
                  const paidAmount = Number(product?.config?.amount || 0);
                  const paidCurrency = String(product?.config?.currency || 'USD');
                  const stripeLead = {
                    id: leadId,
                    name: paidEmail.split('@')[0] || 'Customer',
                    email: paidEmail,
                    source: 'Services',
                    pipelineId: product?.config?.crmRouting?.pipelineId || 'main',
                    stage: product?.config?.crmRouting?.stageId || 'PAYMENT_COMPLETED',
                    lifecycleStage: product?.config?.crmRouting?.stageId || 'PAYMENT_COMPLETED',
                    owner: 'Unassigned',
                    value: paidAmount,
                    currency: paidCurrency,
                    interest: product?.name || 'Product',
                    orderId: finalOrderId,
                    qualificationStatus: 'Qualified',
                    followUpState: 'CUSTOMER',
                    attachedProducts: [{
                      productId: product?.id,
                      productName: product?.name || 'Product',
                      productType: product?.type || 'Course',
                      attachedAt: new Date().toISOString(),
                    }],
                    tags: ['Customer', product?.type || 'Course', product?.name].filter(Boolean),
                    activities: [{
                      id: `act-stripe-${finalOrderId}`,
                      type: 'payment',
                      title: 'Product purchased (Stripe)',
                      detail: `${product?.name || 'Product'} · ${paidCurrency} ${paidAmount.toFixed(2)}`,
                      at: new Date().toISOString(),
                    }],
                    lastActivity: new Date().toISOString(),
                  };
                  for (const sc of targetScopes) {
                    void setDoc(doc(db, 'tenants', sc, 'leads', leadId), encodeFirestoreValue(stripeLead), { merge: true }).catch(() => null);
                  }
                  window.dispatchEvent(new CustomEvent('gos-booking-change', { detail: 'gos-crm-leads-v1' }));
                  window.dispatchEvent(new Event('gos-settings-changed'));
                }
              } catch {
                /* ignore optional lead write error */
              }
            }
            setPersistedSubmission(true);
            setInstantAccess(true);
            setConfirmation(finalOrderId);
            showToast.success(t('Payment confirmed!'));
          }
        })
        .catch(err => setSubmitError(backendError(err)))
        .finally(() => setBusy(false));
    }
  }, [tenantId, submissionScope?.tenantId, submissionScope?.ownerId]);

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    setLoading(true);
    setQuoteError('');
    callBackend<Quote>('productCheckout', { action: 'quote', tenantId, productId: product.id, discountCode, email: discountEmail, bump: bumpSelected })
      .then(quote => { if (active) setRemote(quote); })
      .catch(async error => {
        if (!active) return;
        if (discountCode) {
          setPromoError(backendError(error));
          setDiscountCode('');
          return;
        }
        // Fallback to direct public paymentMethods lookup when Cloud Function quote is unavailable
        try {
          const bareTenant = tenantId.replace(/^workspace-/, '');
          const [tenantPay, userPay, bareTenantPay, bareUserPay, globalPay, paymobPublic] = await Promise.all([
            getDoc(doc(db, 'tenants', tenantId, 'paymentMethods', 'config')).catch(() => null),
            getDoc(doc(db, 'settings', `paymentMethods_user_${tenantId}`)).catch(() => null),
            bareTenant && bareTenant !== tenantId
              ? getDoc(doc(db, 'tenants', bareTenant, 'paymentMethods', 'config')).catch(() => null)
              : Promise.resolve(null),
            bareTenant && bareTenant !== tenantId
              ? getDoc(doc(db, 'settings', `paymentMethods_user_${bareTenant}`)).catch(() => null)
              : Promise.resolve(null),
            getDoc(doc(db, 'settings', 'paymentMethods')).catch(() => null),
            readPaymobPublicConfig('user', tenantId).catch(() => null),
          ]);
          const payData =
            (tenantPay?.exists() ? tenantPay.data() : null) ??
            (userPay?.exists() ? userPay.data() : null) ??
            (bareTenantPay?.exists() ? bareTenantPay.data() : null) ??
            (bareUserPay?.exists() ? bareUserPay.data() : null) ??
            (globalPay?.exists() ? globalPay.data() : null);
          const fallbackMethods: Method[] = (Array.isArray(payData?.methods) ? payData.methods : [])
            .flatMap((item: any): Method[] => {
              if (!item?.enabled || !item?.name) return [];
              const providerKey = resolvePaymentProviderKey(item.provider, item.id, item.name);
              if (item.type === 'manual' && item.account) {
                return [{
                  id: String(item.id || providerKey || item.name),
                  provider: providerKey,
                  type: 'manual',
                  name: String(item.name),
                  account: String(item.account),
                  instructions: item.instructions ? String(item.instructions) : undefined,
                }];
              }
              if (item.type === 'gateway' && (!item.status || item.status === 'Connected' || item.status === 'Configured')) {
                if (providerKey === 'paymob') {
                  return expandPaymobCheckoutOptions(String(item.name), paymobPublic);
                }
                return [{
                  id: String(item.id || providerKey || item.name),
                  provider: providerKey,
                  type: 'gateway',
                  name: String(item.name),
                }];
              }
              return [];
            });
          if (!active) return;
          setRemote({
            revision: '',
            totals: { ...checkoutTotals(product, config.billing, 0, '', []), currency: config.currency },
            methods: fallbackMethods,
            bump: null,
            fields: checkoutFieldList(config),
            requiresTerms: !!experience.checkout.requireTerms,
            guestAllowed: experience.checkout.guest !== false,
            terms: experience.checkout,
            installments: config.installments,
            frequency: config.billing === 'Payment plan' ? experience.paymentInterval : config.frequency,
            trialDays: config.trialDays,
          });
        } catch {
          if (active) setQuoteError(backendError(error));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenantId, product, config, experience, discountCode, discountEmail, bumpSelected, reload]);

  useEffect(() => {
    if (!receipt) { setReceiptUrl(''); return; }
    const url = URL.createObjectURL(receipt);
    setReceiptUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  const previewQuote: Omit<Quote, 'revision'> | undefined = preview && {
    totals: { ...checkoutTotals(product, preview.billing, bumpSelected ? preview.bump?.amount : 0, discountCode, preview.discounts), currency: config.currency },
    methods: preview.methods, bump: preview.bump, fields: checkoutFieldList(config),
    requiresTerms: !!experience.checkout.requireTerms, guestAllowed: true, terms: experience.checkout,
    installments: config.installments, frequency: preview.billing === 'Payment plan' ? experience.paymentInterval : config.frequency, trialDays: config.trialDays,
  };
  const quote = previewQuote ?? remote, totals = quote?.totals;
  const methods = (quote?.methods ?? []).flatMap((m): Method[] => {
    const providerKey = resolvePaymentProviderKey(m.provider, m.id, m.name);
    if (!preview && m.type === 'gateway' && providerKey === 'stripe' && m.id === 'stripe') {
      const stripeLabels = ['Visa', 'Mastercard', 'Apple Pay', 'Google Pay'] as const;
      const allowed = stripeLabels.filter(label => experience.paymentMethods.includes(label));
      if (allowed.length) {
        return allowed.map(label => ({ id: label, provider: 'stripe', type: 'gateway' as const, name: label }));
      }
    }
    return [{ ...m, provider: providerKey }];
  });
  const method = methods.find(option => option.id === methodId) ?? methods[0];
  const isGateway = method?.type === 'gateway';
  const paymentDue = (totals?.dueToday ?? 0) > 0;
  const needsReceipt = !isGateway && !!method?.account && (paymentDue || !!preview);
  const currency = totals?.currency || config.currency;
  const money = (value: number) => formatCheckoutPrice(value, currency);
  const ready = !!quote && !loading && !quoteError && !preview?.loading && !preview?.error && !busy;
  const orderAction = productKind(product.type) === 'course' ? 'Complete Enrollment' : productKind(product.type) === 'service' ? 'Complete Booking' : 'Complete Purchase';

  function applyCoupon() {
    const code = coupon.trim();
    if (!code) return;
    if (preview && !resolvePromoDiscount(product, code, preview.discounts, preview.billing)) {
      setPromoError('Invalid discount code');
      setDiscountCode('');
      return;
    }
    setPromoError('');
    if (tenantId) setDiscountEmail(email.trim());
    setDiscountCode(code);
  }

  function chooseReceipt(file?: File) {
    setReceiptError('');
    if (file && (!allowedFiles.includes(file.type) || file.size < 1 || file.size > receiptLimit)) {
      setReceipt(undefined);
      setReceiptError('Upload a PNG, JPG or PDF receipt up to 15 MB.');
      return;
    }
    setReceipt(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !totals || !quote) return;
    const effectiveScope = (tenantId || submissionScope?.tenantId || '').trim();
    const effectiveOwnerId = (submissionScope?.ownerId || effectiveScope.replace(/^workspace-/, '')).trim();
    const requiresReceiptUpload = Boolean(paymentDue && !isGateway && method?.account);
    if (requiresReceiptUpload && !receipt) {
      setReceiptError('Upload a receipt to submit your transfer.');
      return;
    }
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setSubmitError('');
    try {
      submission.current ||= crypto.randomUUID();
      if (preview && !effectiveScope) {
        setConfirmation(submission.current);
        return;
      }
      if (!effectiveScope) throw new Error('Checkout is unavailable.');

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim() || cleanEmail.split('@')[0] || 'Customer';
      const cleanPhone = phone.trim();
      const customFields = quote.fields
        .map(field => ({ label: field.label, value: String(data.get('custom-' + field.id) ?? '').trim() }))
        .filter(field => field.value);

      const encodedReceipt = receipt ? await encodeReceipt(receipt) : undefined;
      const mirrorReceipt = receipt ? await encodeReceiptForMirror(receipt, encodedReceipt) : null;
      const computedId = await sha256Hex(JSON.stringify([product.id, submission.current]));

      // Best-effort sync canonical product document if signed in as merchant (encode nested arrays such as stats/builder rows)
      if (primaryAuth.currentUser && product.id && /^[\w-]{1,150}$/.test(product.id)) {
        try {
          const {
            reviews: _r,
            ratingAverage: _ra,
            reviewsCount: _rc,
            ratingTotal: _rt,
            ...safeProduct
          } = product as unknown as Record<string, unknown>;
          const sanitizedProduct = encodeFirestoreValue(JSON.parse(JSON.stringify(safeProduct)));
          const productRef = doc(db, 'tenants', effectiveScope, 'products', product.id);
          const existingSnap = await getDoc(productRef).catch(() => null);
          if (!existingSnap?.exists()) {
            await setDoc(productRef, sanitizedProduct, { merge: true }).catch(() => null);
          }
        } catch {
          /* Ignore optional product sync failures so checkout is never blocked */
        }
      }

      const hasManualReceipt = Boolean(receipt || (paymentDue && !isGateway && method?.account));
      const isFreeInstant = totals.dueToday === 0 && !hasManualReceipt && config.delivery !== 'After approval';
      let finalId = computedId;
      let savedViaBackend = false;
      const gatewayMethodLabel =
        method?.provider === 'paymob'
          ? (method.name || 'Paymob')
          : method?.provider === 'stripe'
            ? 'Stripe'
            : (method?.name || 'Stripe');
      const backendMethodId =
        isGateway && method?.provider === 'stripe' && remote?.methods?.some(item => item.id === 'stripe')
          ? 'stripe'
          : isGateway && method?.provider === 'paymob' && remote?.methods && !remote.methods.some(item => item.id === method.id)
            ? (remote.methods.find(item => item.provider === 'paymob')?.id ?? method.id)
            : method?.id;

      if (tenantId && remote?.revision) {
        try {
          const result = await callBackend<{ id: string }>('productCheckout', {
            action: 'submit',
            tenantId: effectiveScope,
            productId: product.id,
            submissionId: submission.current,
            revision: remote.revision,
            methodId: backendMethodId,
            discountCode,
            bump: bumpSelected,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            note,
            acceptedTerms,
            fields: Object.fromEntries(quote.fields.map(field => [field.id, data.get('custom-' + field.id)])),
            ...(encodedReceipt && paymentDue ? { receipt: encodedReceipt } : {}),
          }, 90000);
          if (result?.id) finalId = result.id;
          savedViaBackend = true;
        } catch (err) {
          if (!primaryAuth.currentUser) {
            // Re-throw for unauthenticated visitor if mirror write is also disallowed
            const fallbackCreatedAt = new Date().toISOString();
            const fallbackPayload = {
              id: finalId,
              orderId: finalId,
              tenantId: effectiveScope,
              workspaceId: effectiveScope,
              ownerId: effectiveOwnerId || effectiveScope,
              source: 'Product checkout',
              status: isFreeInstant ? 'Approved' : 'Pending',
              createdAt: fallbackCreatedAt,
              productId: product.id,
              productName: product.name,
              items: [
                { productId: product.id, productName: product.name, amount: totals.total, quantity: 1 },
                ...(bumpSelected && quote.bump
                  ? [{ productId: quote.bump.id, productName: quote.bump.name, amount: totals.bumpTotal, quantity: 1 }]
                  : []),
              ],
              customerName: cleanName,
              customerEmail: cleanEmail,
              customerPhone: cleanPhone,
              currency: totals.currency,
              amount: totals.dueToday,
              total: totals.dueToday,
              totals: {
                price: totals.price,
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax,
                dueToday: totals.dueToday,
              },
              method: isGateway ? gatewayMethodLabel : (method?.name || (paymentDue ? 'Manual transfer' : 'No payment due')),
              paymentType: isGateway ? 'gateway' : 'manual',
              transferAccount: isGateway ? '' : (method?.account || ''),
              note: note.trim(),
              discountCode,
              receipt: mirrorReceipt,
              fields: customFields,
            };
            let mirrorSaved = false;
            try {
              mirrorSaved = await setDoc(
                doc(db, 'settings', `checkoutRequests_${effectiveScope}`, 'items', finalId),
                encodeFirestoreValue(JSON.parse(JSON.stringify(fallbackPayload))),
                { merge: true }
              ).then(() => true).catch(() => false);
            } catch {
              mirrorSaved = false;
            }
            if (!mirrorSaved) throw err;
            savedViaBackend = true;
          }
        }
      }

      // Persist mirror record with full workspace/owner identifiers & status so Requests view always sees it immediately
      if (!savedViaBackend || primaryAuth.currentUser) {
        const createdAt = new Date().toISOString();
        const requestRecord = encodeFirestoreValue(
          JSON.parse(
            JSON.stringify({
              id: finalId,
              orderId: finalId,
              tenantId: effectiveScope,
              workspaceId: effectiveScope,
              ownerId: effectiveOwnerId || effectiveScope,
              source: 'Product checkout',
              status: isFreeInstant ? 'Approved' : 'Pending',
              createdAt,
              productId: product.id,
              productName: product.name,
              items: [
                { productId: product.id, productName: product.name, amount: totals.total, quantity: 1 },
                ...(bumpSelected && quote.bump
                  ? [{ productId: quote.bump.id, productName: quote.bump.name, amount: totals.bumpTotal, quantity: 1 }]
                  : []),
              ],
              customerName: cleanName,
              customerEmail: cleanEmail,
              customerPhone: cleanPhone,
              currency: totals.currency,
              amount: totals.dueToday,
              total: totals.dueToday,
              totals: {
                price: totals.price,
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax,
                dueToday: totals.dueToday,
              },
              method: isGateway ? gatewayMethodLabel : (method?.name || (paymentDue || method?.account ? 'Manual transfer' : 'No payment due')),
              paymentType: isGateway ? 'gateway' : 'manual',
              transferAccount: isGateway ? '' : (method?.account || ''),
              note: note.trim(),
              discountCode,
              receipt: mirrorReceipt,
              fields: customFields,
            })
          )
        );
        const targetScopes = Array.from(
          new Set(
            [
              effectiveScope,
              effectiveOwnerId ? `workspace-${effectiveOwnerId}` : '',
              effectiveOwnerId,
            ].filter(Boolean)
          )
        );
        let mirrorWrote = false;
        for (const sc of targetScopes) {
          let ok = false;
          try {
            ok = await setDoc(
              doc(db, 'settings', `checkoutRequests_${sc}`, 'items', finalId),
              requestRecord,
              { merge: true }
            ).then(() => true).catch(() => false);
          } catch {
            ok = false;
          }
          if (ok) mirrorWrote = true;
        }
        if (!savedViaBackend && !mirrorWrote) {
          throw new Error('Could not submit checkout request. Please try again.');
        }

        try {
          const cleanBuyerEmail = cleanEmail.toLowerCase();
          const leadSlug = cleanBuyerEmail.replace(/[^a-z0-9]/g, '').slice(0, 24);
          const leadId = `lead-order-${leadSlug || finalId.slice(0, 16)}`;
          const initialLeadStage = isFreeInstant ? (product.config?.crmRouting?.stageId || 'PAYMENT_COMPLETED') : 'CONTACT_CREATED';
          const crmLeadRecord = {
            id: leadId,
            name: cleanName || cleanBuyerEmail.split('@')[0] || 'Customer',
            email: cleanBuyerEmail,
            phone: cleanPhone || '',
            source: 'Services',
            pipelineId: product.config?.crmRouting?.pipelineId || 'main',
            stage: initialLeadStage,
            lifecycleStage: initialLeadStage,
            owner: 'Unassigned',
            value: Number(totals.total ?? totals.dueToday ?? 0),
            currency: totals.currency || 'USD',
            interest: product.name || 'Product',
            orderId: finalId,
            qualificationStatus: isFreeInstant ? 'Qualified' : 'Pending',
            followUpState: isFreeInstant ? 'CUSTOMER' : 'CONTACTED',
            attachedProducts: [{
              productId: product.id,
              productName: product.name,
              productType: product.type || 'Course',
              attachedAt: new Date().toISOString(),
            }],
            tags: [isFreeInstant ? 'Customer' : 'Lead', product.type || 'Course', product.name].filter(Boolean),
            activities: [{
              id: `act-checkout-${finalId}`,
              type: 'payment',
              title: isFreeInstant ? 'Product enrolled' : 'Order submitted',
              detail: `${product.name} · ${totals.currency} ${Number(totals.dueToday).toFixed(2)}`,
              at: new Date().toISOString(),
            }],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
          };
          for (const sc of targetScopes) {
            void setDoc(doc(db, 'tenants', sc, 'leads', leadId), encodeFirestoreValue(crmLeadRecord), { merge: true }).catch(() => null);
          }
          window.dispatchEvent(new CustomEvent('gos-booking-change', { detail: 'gos-crm-leads-v1' }));
          window.dispatchEvent(new Event('gos-settings-changed'));
        } catch {
          /* ignore optional lead write error */
        }
      }

      if (paymentDue && isGateway && method?.provider === 'paymob' && typeof window !== 'undefined') {
        const returnBase = new URL(window.location.href);
        stripPaymobReturnParams(returnBase);
        const baseHref = `${returnBase.origin}${returnBase.pathname}${returnBase.search}`;
        const sep = returnBase.search ? '&' : '?';
        const paymobOption: PaymobPaymentOption =
          method.paymentOption ||
          (method.id === 'paymob_wallet' ? 'wallet' : method.id === 'paymob_card' ? 'card' : 'any');
        const paymobSession = await createPaymobCheckoutSession({
          scope: 'user',
          ownerId: effectiveOwnerId || effectiveScope,
          kind: 'product',
          paymentOption: paymobOption,
          productOrderId: finalId,
          tenantId: effectiveScope,
          customerEmail: cleanEmail,
          customerName: cleanName,
          customerPhone: cleanPhone,
          buyerSessionId: submission.current,
          planId: product.id,
          planName: product.name,
          amount: totals.dueToday,
          currency: totals.currency,
          requestId: finalId,
          successUrl: `${baseHref}${sep}payment=paymob_return&provider=paymob&gos_order_id=${encodeURIComponent(finalId)}`,
          cancelUrl: `${baseHref}${sep}payment=cancelled&provider=paymob`,
        });
        if (paymobSession?.url) {
          track('InitiateCheckout', { productId: product.id, value: totals.dueToday, currency: totals.currency }, true);
          window.location.assign(paymobSession.url);
          return;
        }
      }

      if (paymentDue && isGateway && method?.provider === 'stripe' && typeof window !== 'undefined') {
        const returnBase = new URL(window.location.href);
        returnBase.searchParams.delete('payment');
        returnBase.searchParams.delete('session_id');
        returnBase.searchParams.delete('order_id');
        const sep = returnBase.search ? '&' : '?';
        const baseHref = `${returnBase.origin}${returnBase.pathname}${returnBase.search}`;
        const successUrl = `${baseHref}${sep}payment=success&order_id=${encodeURIComponent(finalId)}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseHref}${sep}payment=cancelled`;
        const stripeSession = await createCheckoutSession({
          scope: 'user',
          ownerId: effectiveOwnerId || effectiveScope,
          kind: 'product',
          productOrderId: finalId,
          tenantId: effectiveScope,
          customerEmail: cleanEmail,
          buyerSessionId: submission.current,
          planId: product.id,
          planName: product.name,
          amount: totals.dueToday,
          currency: totals.currency,
          interval: String(quote.frequency || '').toLowerCase().includes('year') ? 'year' : 'once',
          requestId: finalId,
          successUrl,
          cancelUrl,
        });
        if (stripeSession?.url) {
          track('InitiateCheckout', { productId: product.id, value: totals.dueToday, currency: totals.currency }, true);
          window.location.assign(stripeSession.url);
          return;
        }
      }

      setPersistedSubmission(true);
      setInstantAccess(isFreeInstant);
      setConfirmation(finalId);
      setReceipt(undefined);
      showToast.success(t('Order request submitted successfully!'));
      track('InitiateCheckout', { productId: product.id, value: totals.dueToday, currency: totals.currency }, true);
    } catch (error) {
      setSubmitError(backendError(error));
      if (['functions/aborted', 'functions/failed-precondition'].includes((error as { code?: string })?.code ?? '')) {
        setReceipt(undefined);
        setReload(value => value + 1);
      }
    } finally { setBusy(false); }
  }

  const showLiveConfirmation = !preview || persistedSubmission;

  return <section className="cp-checkout product-checkout" aria-labelledby={title}>
    <header className="pco-header"><div className="pco-icon"><LockKeyhole size={18}/></div><div>
      <h1 id={title}>{t(preview ? 'Checkout Preview' : 'Secure Checkout')}</h1>
      <p>{preview ? t('Preview the customer experience. No payments are collected.') : product.name}</p>
    </div></header>
    {confirmation ? <div className="pco-confirmation" role="status"><Check size={26}/><h2>{t(!showLiveConfirmation ? 'Checkout Preview' : instantAccess ? 'Enrollment confirmed' : 'Request submitted')}</h2><p>{t(!showLiveConfirmation ? 'Preview the customer experience. No payments are collected.' : instantAccess ? 'Check your email for instructions to access your purchase.' : 'Once approved, you’ll receive an email with instructions to access your purchase.')}</p>{instantAccess && <a className="pco-primary" href="/auth/login?portal=1">{t('Sign In to Customer Portal')}</a>}<small>{t('Reference')} <b>{confirmation.slice(0, 12).toUpperCase()}</b></small></div> :
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="pco-columns">
          <div className="pco-column">
            <section className="pco-card pco-summary">
              <div className="pco-product">{product.image && <img src={product.image} alt=""/>}<div><small>{t('ORDER SUMMARY')}</small><h2>{product.name}</h2></div></div>
              {totals ? <dl>
                <div><dt>{t(totals.selected === 'One-time' ? 'Product price' : 'First payment')}</dt><dd>{money(totals.price)}</dd></div>
                {bumpSelected && quote?.bump && <div><dt>{quote.bump.name}</dt><dd>{money(quote.bump.amount)}</dd></div>}
                {totals.discount > 0 && <div><dt>{t('Discount')}</dt><dd className="pco-accent">−{money(totals.discount)}</dd></div>}
                <div><dt>{t(totals.included ? 'Tax included' : 'Tax')}</dt><dd>{money(totals.tax)}</dd></div>
                <div className="pco-total"><dt>{t('Due today')}</dt><dd>{money(totals.dueToday)}</dd></div>
              </dl> : <p role="status">{loading && t('Loading checkout…')}</p>}
              {quote && totals?.selected === 'Payment plan' && <small>{quote.installments} × {money(totals.total)} · {t(quote.frequency)}</small>}
              {quote && totals?.selected === 'Subscription' && <small>{money(totals.total)} · {t(quote.frequency)}{quote.trialDays > 0 && ` · ${quote.trialDays} ${t('trial days')}`}</small>}
              {!preview && totals && totals.selected !== 'One-time' && <small>{t('Future payments are arranged separately with the seller.')}</small>}
            </section>
            {quote?.bump && <label className="pco-card pco-check"><input type="checkbox" checked={bumpSelected} onChange={event => setBump(event.target.checked)}/><span><b>{quote.bump.name}</b><small>{t('Optional add-on')}</small></span><b>{money(quote.bump.amount)}</b></label>}
            <section className="pco-card cx-promo">
              <label htmlFor={promoId}><Tag size={15}/>{t('Discount code')}</label>
              <div className="pco-inline"><input id={promoId} value={coupon} maxLength={100} placeholder={t('Enter coupon or promo code')} aria-invalid={!!promoError} onChange={event => { setCoupon(event.target.value); setDiscountCode(''); setPromoError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); applyCoupon(); } }}/><button type="button" className="pco-secondary" disabled={!coupon.trim() || loading} onClick={applyCoupon}>{t('Apply')}</button></div>
              {promoError && <p className="pco-error" role="alert">{t(promoError)}</p>}
              {discountCode && !loading && !promoError && <small role="status">{t('Discount applied')} · {discountCode}</small>}
            </section>
            {(needsReceipt || receiptError) && <section className="pco-receipt">
              <div className="pco-label"><b>{t('Live Receipt Preview')}</b><span>{t(preview ? 'Preview' : 'Required')}</span></div>
              <label className="pco-upload" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) chooseReceipt(event.dataTransfer.files[0]); }}>
                <input type="file" accept={allowedFiles.join(',')} onChange={event => { chooseReceipt(event.target.files?.[0]); event.currentTarget.value = ''; }}/>
                <UploadCloud size={24}/><b>{receipt?.name || t('Click or drag and drop receipt here')}</b><small>{t('PNG, JPG or PDF · 15 MB max')}</small>
              </label>
              {receipt && receiptUrl && <div className="pco-attachment">{receipt.type.startsWith('image/') && <img src={receiptUrl} alt={t('Receipt preview')}/>}<a href={receiptUrl} target="_blank" rel="noopener noreferrer">{t('Open receipt')}</a><button type="button" onClick={() => chooseReceipt()}>{t('Remove')}</button></div>}
              {receiptError && <p className="pco-error" role="alert">{t(receiptError)}</p>}
            </section>}
            <label className="pco-field">{t('Order note (optional)')}<textarea rows={2} maxLength={1000} value={note} onChange={event => setNote(event.target.value)}/></label>
          </div>
          <div className="pco-column">
            <section className="pco-card pco-customer">
              <h2>{t('Your information')}</h2>
              {quote?.guestAllowed === false && <p>{t('Use your signed-in email for this checkout.')} <a href="/auth/login" target="_blank" rel="noopener noreferrer">{t('Sign in')}</a></p>}
              <label className="pco-field">{t('Email address')}<input type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} value={email} required onChange={event => setEmail(event.target.value)} onBlur={() => { if (tenantId && discountCode) setDiscountEmail(email.trim()); }}/></label>
              {(!preview || experience.checkout.collectInfo) && <label className="pco-field">{t('Full name')}<input autoComplete="name" maxLength={150} required value={name} onChange={event => setName(event.target.value)}/></label>}
              {(!preview || experience.checkout.requirePhone || (method?.provider === 'paymob' && (method?.paymentOption === 'wallet' || method?.id === 'paymob_wallet'))) && <label className="pco-field">{t('Phone number')}<input type="tel" autoComplete="tel" maxLength={50} required value={phone} onChange={event => setPhone(event.target.value)}/></label>}
              {quote?.fields.map(field => <label key={field.id} className="pco-field">{field.label}{field.required && ' *'}<input name={'custom-' + field.id} required={field.required} maxLength={500}/></label>)}
            </section>
            {(paymentDue || preview) && <section className="pco-methods" aria-label={t('Choose Payment Method')}>
              <div className="pco-methods-head">
                <h2>{t('Choose Payment Method')}</h2>
                {(loading || preview?.loading) && (
                  <span className="pco-methods-sync-pill" role="status" aria-live="polite">
                    <Loader2 size={12} className="animate-spin" />
                    <span>{t('Syncing methods…')}</span>
                  </span>
                )}
              </div>
              {!methods.length && (loading || preview?.loading) && (
                <div className="pco-methods-loading" role="status" aria-live="polite" aria-label={t('Loading payment methods…')}>
                  <div className="pco-methods-loading-banner">
                    <div className="pco-methods-spinner" aria-hidden="true">
                      <Loader2 size={15} className="animate-spin" />
                    </div>
                    <div className="pco-methods-loading-copy">
                      <b>{t('Loading verified payment methods…')}</b>
                      <small>{t('Fetching active transfer wallets and payment gateways')}</small>
                    </div>
                  </div>
                  {[0, 1, 2].map(idx => (
                    <div key={idx} className="pco-method-skeleton" aria-hidden="true">
                      <span className="pco-sk-brand" />
                      <span className="pco-sk-info">
                        <span className="pco-sk-line pco-sk-title" />
                        <span className="pco-sk-line pco-sk-sub" />
                      </span>
                      <span className="pco-sk-badge" />
                    </div>
                  ))}
                </div>
              )}
              {methods.map(option => {
                const providerKey = resolvePaymentProviderKey(option.provider, option.id, option.name);
                const isManual = option.type !== 'gateway' && Boolean(option.account || option.type === 'manual');
                const isSelected = method?.id === option.id;
                return (
                  <label key={option.id} data-provider={providerKey} className={`pco-method-card brand-${providerKey}${isSelected ? ' selected' : ''}`}>
                    <input type="radio" name={paymentGroup} checked={isSelected} onChange={() => setMethod(option.id)}/>
                    <CheckoutMethodIcon provider={option.provider} id={option.id} name={option.name} isManual={isManual}/>
                    <span className="pco-method-info"><b>{t(option.name)}</b>{isManual && option.account && <small>{option.account}</small>}</span>
                    <small className={`pco-badge ${isManual ? 'manual' : 'gateway'}`}>{t(isManual ? 'Manual' : 'Gateway')}</small>
                  </label>
                );
              })}
              {!methods.length && !loading && !preview?.loading && <p role="status">{t('No payment methods are available for this product.')}</p>}
            </section>}
            {!isGateway && method?.account && (paymentDue || preview) && <section className={`pco-card pco-transfer brand-${resolvePaymentProviderKey(method.provider, method.id, method.name)}`}><h2><CheckoutMethodIcon provider={method.provider} id={method.id} name={method.name} isManual={true}/><span>{t('Transfer Instructions & Account Details')}</span></h2>
              <div className="pco-inline"><div><small>{t('Transfer account')}</small><b>{method.account}</b></div><button className="pco-secondary" type="button" onClick={() => void navigator.clipboard.writeText(method.account!).then(() => showToast.success('Copied'), () => showToast.error('Could not copy.'))}><Copy size={13}/>{t('Copy')}</button></div>
              <p>{method.instructions || t('Transfer the amount shown and upload your receipt for review.')}</p>
            </section>}
            {quote?.requiresTerms && <div className="cx-terms"><label><input type="checkbox" required checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)}/>{t('I agree to the terms and privacy policy')}</label> <PolicyPreviewLink kind="terms" custom={quote.terms.termsMode === 'custom' || !quote.terms.termsMode && !!quote.terms.termsUrl} url={quote.terms.termsUrl} checkout/> <PolicyPreviewLink kind="privacy" custom={quote.terms.privacyMode === 'custom' || !quote.terms.privacyMode && !!quote.terms.privacyUrl} url={quote.terms.privacyUrl} checkout/></div>}
          </div>
        </fieldset>
        <footer className="pco-footer">
          {(quoteError || preview?.error || submitError) && <p className="pco-error" role="alert">{t(quoteError || preview?.error || submitError)} {(quoteError || preview?.error) && <button type="button" onClick={() => preview ? preview.retry() : setReload(value => value + 1)}>{t('Try again')}</button>}</p>}
          <span><LockKeyhole size={14}/>{t(preview ? 'Checkout preview' : 'Protected checkout')}</span>
          <button className="pco-primary" type="submit" disabled={!ready || (paymentDue || preview) && !method || !!quote?.requiresTerms && !acceptedTerms}>
            {busy ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
            {t(busy ? 'Submitting…' : preview ? orderAction : paymentDue && !isGateway ? 'Submit Transfer & Receipt' : paymentDue ? orderAction : 'Submit request')}{totals && !busy && ` · ${money(totals.dueToday)}`}
          </button>
        </footer>
      </form>}
  </section>;
}
