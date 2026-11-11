import { useCurrency } from '../../context/CurrencyContext';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Check, Copy, CreditCard, Landmark, Loader2, LockKeyhole, Tag, UploadCloud } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { cloudStorage, readCloud, useCloudState } from '../../backend/workspace';
import { backendError, callBackend, db } from '../../backend/firebase';
import { manualBrandLogos, resolvePaymentProviderKey, usePaymentMethods } from '../../backend/paymentMethods';
import { track } from '../../backend/marketingTracking';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import type { Discount } from '../discounts-data';
import { PolicyPreviewLink } from './PolicyPreview';
import { checkoutFieldList, defaultExperience, productKind, type Billing, type CheckoutField, type Product } from './model';
import { checkoutTotals, resolvePromoDiscount } from './checkout-model';
import { storageKey, useProducts } from './repository';
import { provisionCustomerPurchase, type CustomerProvisionResult } from '../../backend/customerPortal';
import './dynamic-checkout.css';
import './product-checkout.css';

type Totals = ReturnType<typeof checkoutTotals> & { currency: string };
type Method = { id: string; provider?: string; type?: 'manual' | 'gateway'; name: string; account?: string; instructions?: string };

function CheckoutMethodIcon({ provider, id, name, isManual }: { provider?: string; id?: string; name: string; isManual: boolean }) {
  const key = resolvePaymentProviderKey(provider, id, name);
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

export function CheckoutScreen({ product, billing, tenantId }: { product: Product; billing?: Billing; tenantId?: string }) {
  return tenantId
    ? <CheckoutForm key={tenantId + '/' + product.id} product={product} tenantId={tenantId}/>
    : <PreviewCheckout product={product} billing={billing}/>;
}

function PreviewCheckout({ product, billing }: { product: Product; billing?: Billing }) {
  const config = product.config!, experience = config.experience ?? defaultExperience();
  const payments = usePaymentMethods({ scope: 'user' }), products = useProducts();
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
      return [{
        id: item.id || providerKey || item.name,
        provider: providerKey,
        type: 'gateway',
        name: item.name,
      }];
    });
  return <CheckoutForm key={product.id} product={product} preview={{ methods, loading: payments.loading, error: payments.error, retry: payments.refresh, bump, discounts, billing }}/>;
}

function CheckoutForm({ product, preview, tenantId }: { product: Product; preview?: Preview; tenantId?: string }) {
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
  const [portalAccess, setPortalAccess] = useState<CustomerProvisionResult | null>(null);
  const [discountEmail, setDiscountEmail] = useState('');
  const tenantPayments = usePaymentMethods(tenantId ? { scope: 'user', tenantId } : { scope: 'user' });

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    setLoading(true);
    setQuoteError('');
    callBackend<Quote>('productCheckout', { action: 'quote', tenantId, productId: product.id, discountCode, email: discountEmail, bump: bumpSelected })
      .then(quote => { if (active) setRemote(quote); })
      .catch(error => {
        if (!active) return;
        if (discountCode) {
          setPromoError(backendError(error));
          setDiscountCode('');
        } else {
          setQuoteError(backendError(error));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenantId, product.id, discountCode, discountEmail, bumpSelected, reload]);

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
  const liveTenantMethods: Method[] | null = !preview && tenantId && !tenantPayments.loading && (tenantPayments.revision > 0 || tenantPayments.methods.length > 0)
    ? tenantPayments.methods
        .filter(m => m.enabled && ((m.type === 'manual' && m.account) || (m.type === 'gateway' && (m.status === 'Connected' || m.status === 'Configured'))))
        .map(m => ({
          id: m.id || resolvePaymentProviderKey(m.provider, m.id, m.name) || m.name,
          provider: resolvePaymentProviderKey(m.provider, m.id, m.name),
          type: m.type,
          name: m.name,
          account: m.account,
          instructions: m.instructions,
        }))
    : null;
  const methods = (liveTenantMethods ?? quote?.methods ?? []).map(m => ({
    ...m,
    provider: resolvePaymentProviderKey(m.provider, m.id, m.name),
  }));
  const method = methods.find(option => option.id === methodId) ?? methods[0];
  const paymentDue = (totals?.dueToday ?? 0) > 0;
  const needsReceipt = !!method?.account && (paymentDue || !!preview);
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
    const requiresReceiptUpload = Boolean(paymentDue && method?.account);
    if (requiresReceiptUpload && !receipt) {
      setReceiptError('Upload a receipt to submit your transfer.');
      return;
    }
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setSubmitError('');
    try {
      submission.current ||= crypto.randomUUID();
      const encodedReceipt = receipt && paymentDue ? await encodeReceipt(receipt) : undefined;
      const ownerTenantId =
        tenantId ||
        tenantPayments.tenantId ||
        storageKey().replace('gos-commerce-products-v1:', '') ||
        'default';

      if (tenantId && remote) {
        try {
          const result = await callBackend<{ id: string }>('productCheckout', {
            action: 'submit',
            tenantId,
            productId: product.id,
            submissionId: submission.current,
            revision: remote.revision,
            methodId: method?.id,
            discountCode,
            bump: bumpSelected,
            name,
            email,
            phone,
            note,
            acceptedTerms,
            fields: Object.fromEntries(quote.fields.map(field => [field.id, data.get('custom-' + field.id)])),
            ...(encodedReceipt ? { receipt: encodedReceipt } : {}),
          }, 90000);
          if (!preview && totals.dueToday === 0 && config.delivery !== 'After approval') {
            const provisioned = await provisionCustomerPurchase({
              tenantId: ownerTenantId,
              product,
              productId: product.id,
              productName: product.name,
              productType: product.type,
              orderId: result.id,
              customerName: name.trim() || email.trim().split('@')[0] || 'Customer',
              customerEmail: email.trim().toLowerCase(),
              customerPhone: phone.trim(),
              amount: 0,
              currency: totals.currency,
            }).catch(() => null);
            if (provisioned) setPortalAccess(provisioned);
          }
          setConfirmation(result.id);
          setReceipt(undefined);
          showToast.success(t(totals.dueToday === 0 && !preview ? 'Enrollment complete! Login credentials sent to your email.' : 'Order request submitted successfully!'));
          track('InitiateCheckout', { productId: product.id, value: totals.dueToday, currency: totals.currency }, true);
          return;
        } catch {
          // Fall back to direct Firestore checkout persistence when scoped methods or preview products are used
        }
      }

      const reqId = (submission.current.replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')).toLowerCase().slice(0, 64);
      const createdAt = new Date().toISOString();
      const customerEmail = email.trim().toLowerCase();
      const customerName = name.trim() || customerEmail.split('@')[0] || 'Customer';
      const customerPhone = phone.trim() || '—';
      const items = [
        { productId: product.id, productName: product.name, amount: totals.total, quantity: 1 },
        ...(bumpSelected && quote.bump
          ? [{ productId: quote.bump.id, productName: quote.bump.name, amount: totals.bumpTotal, quantity: 1 }]
          : []),
      ];
      const customFields = quote.fields
        .map(field => ({
          label: field.label,
          value: String(data.get('custom-' + field.id) ?? '').trim(),
        }))
        .filter(field => field.value);

      const orderRecord = {
        id: reqId,
        orderId: reqId,
        source: 'Product checkout',
        productId: product.id,
        productName: product.name,
        items,
        customerName,
        customerEmail,
        customerPhone,
        currency: totals.currency,
        amount: totals.dueToday,
        total: totals.dueToday,
        discountCode: discountCode.trim(),
        discount: totals.discount,
        method: method?.name || 'No payment due',
        transferAccount: method?.account || '',
        createdAt,
        status: 'Pending' as const,
      };

      const receiptPayload = encodedReceipt
        ? {
            name: encodedReceipt.name,
            type: encodedReceipt.type,
            dataUrl: `data:${encodedReceipt.type};base64,${encodedReceipt.data}`,
          }
        : null;

      const requestRecord = {
        ...orderRecord,
        fields: customFields,
        totals: {
          price: totals.price,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          dueToday: totals.dueToday,
        },
        receipt: receiptPayload,
        note: note.trim(),
      };

      const emailSlug = (customerEmail || reqId).replace(/[^a-z0-9]/g, '').slice(0, 24) || reqId.slice(0, 16);
      const leadId = `lead-order-${emailSlug}`;
      const isInstantFree = totals.dueToday === 0;
      const rawType = String(product.type || '').trim().toLowerCase();
      const prodTypeLabel: 'Course' | 'Digital Product' | 'Service' = rawType.includes('course')
        ? 'Course'
        : rawType.includes('service') || rawType.includes('booking') || rawType.includes('consult')
          ? 'Service'
          : 'Digital Product';
      const checkoutLeadRecord = {
        id: leadId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone === '—' ? '' : customerPhone,
        company: '',
        source: 'Services',
        owner: 'Unassigned',
        pipelineId: config.crmRouting?.pipelineId || 'main',
        stage: isInstantFree ? (config.crmRouting?.stageId || 'PAYMENT_COMPLETED') : 'CONTACT_CREATED',
        lifecycleStage: isInstantFree ? (config.crmRouting?.stageId || 'PAYMENT_COMPLETED') : 'CONTACT_CREATED',
        value: totals.total || totals.dueToday || 0,
        currency: totals.currency,
        interest: `${prodTypeLabel}: ${product.name}`,
        orderId: reqId,
        qualificationStatus: isInstantFree ? 'Qualified' : 'Pending',
        bookingStatus: 'Not Scheduled',
        followUpState: isInstantFree ? 'CUSTOMER' : 'CONTACTED',
        hasWhatsAppConsent: Boolean(customerPhone && customerPhone !== '—'),
        hasMessagingConsent: true,
        hasEmailConsent: Boolean(customerEmail),
        tags: isInstantFree ? [prodTypeLabel, product.name, 'Customer'] : [prodTypeLabel, product.name],
        attachedProducts: items.map(it => ({ productId: it.productId, productName: it.productName, productType: prodTypeLabel, attachedAt: createdAt })),
        activities: [
          {
            id: `act-checkout-${reqId}`,
            type: 'payment',
            title: isInstantFree ? `${prodTypeLabel} enrolled` : 'Order submitted',
            detail: `${prodTypeLabel}: ${product.name} · ${totals.currency} ${Number(totals.dueToday).toFixed(2)}`,
            at: createdAt,
          },
        ],
        notes: note.trim() ? [note.trim()] : [],
        createdAt,
        lastActivity: createdAt,
      };

      const instantGrant = !preview && totals.dueToday === 0 && config.delivery !== 'After approval';
      if (instantGrant) {
        (orderRecord as { status: string }).status = 'Paid';
        (requestRecord as { status: string }).status = 'Approved';
      }
      await Promise.allSettled([
        setDoc(doc(db, 'settings', `checkoutRequests_${ownerTenantId}`, 'items', reqId), requestRecord),
        setDoc(doc(db, 'tenants', ownerTenantId, 'checkoutRequests', reqId), requestRecord),
        setDoc(doc(db, 'tenants', ownerTenantId, 'orders', reqId), orderRecord, { merge: true }),
        setDoc(doc(db, 'tenants', ownerTenantId, 'leads', leadId), checkoutLeadRecord, { merge: true }),
      ]);

      if (instantGrant && customerEmail) {
        const provisioned = await provisionCustomerPurchase({
          tenantId: ownerTenantId,
          product,
          productId: product.id,
          productName: product.name,
          productType: product.type,
          orderId: reqId,
          customerName,
          customerEmail,
          customerPhone,
          amount: totals.dueToday,
          currency: totals.currency,
        }).catch(() => null);
        if (provisioned) setPortalAccess(provisioned);
      }

      try {
        if (customerEmail) {
          const existingContacts = readCloud<Record<string, any>[]>('entity:contacts', []);
          if (!existingContacts.some(row => String(row.email ?? '').toLowerCase() === customerEmail)) {
            await cloudStorage.setItem(
              'entity:contacts',
              JSON.stringify([
                {
                  id: `contact-${reqId.slice(0, 12)}`,
                  name: customerName,
                  email: customerEmail,
                  phone: customerPhone === '—' ? '' : customerPhone,
                  status: 'Active',
                  source: 'Checkout',
                  createdAt,
                },
                ...existingContacts,
              ]),
              { silent: true }
            );
          }
        }
      } catch {
        /* ignore local cloudStorage sync errors for guest visitors */
      }

      setConfirmation(reqId);
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

  return <section className="cp-checkout product-checkout" aria-labelledby={title}>
    <header className="pco-header"><div className="pco-icon"><LockKeyhole size={18}/></div><div>
      <h1 id={title}>{t(preview ? 'Checkout Preview' : 'Secure Checkout')}</h1>
      <p>{preview ? t('Preview the customer experience. No payments are collected.') : product.name}</p>
    </div></header>
    {confirmation ? <div className="pco-confirmation" role="status"><Check size={26}/><h2>{t(portalAccess ? 'Access Activated' : 'Request submitted')}</h2><p>{t(portalAccess ? `Your Customer Portal account is ready. Login details have been dispatched to ${portalAccess.email}.` : 'Your request is pending review. Once approved, your Customer Portal login link and password will be emailed automatically.')}</p>{portalAccess && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 10 }}><a className="pco-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10 }} href={portalAccess.loginUrl}>{t('Sign In to Customer Portal')}</a></div>}<small>{t('Reference')} <b>{confirmation.slice(0, 12).toUpperCase()}</b></small></div> :
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
              {(!preview || experience.checkout.requirePhone) && <label className="pco-field">{t('Phone number')}<input type="tel" autoComplete="tel" maxLength={50} required value={phone} onChange={event => setPhone(event.target.value)}/></label>}
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
                const isManual = Boolean(option.account || option.type === 'manual');
                const isSelected = method?.id === option.id;
                return (
                  <label key={option.id} data-provider={providerKey} className={`pco-method-card brand-${providerKey}${isSelected ? ' selected' : ''}`}>
                    <input type="radio" name={paymentGroup} checked={isSelected} onChange={() => setMethod(option.id)}/>
                    <CheckoutMethodIcon provider={option.provider} id={option.id} name={option.name} isManual={isManual}/>
                    <span className="pco-method-info"><b>{t(option.name)}</b>{option.account && <small>{option.account}</small>}</span>
                    <small className={`pco-badge ${isManual ? 'manual' : 'gateway'}`}>{t(isManual ? 'Manual' : 'Gateway')}</small>
                  </label>
                );
              })}
              {!methods.length && !loading && !preview?.loading && <p role="status">{t('No payment methods are available for this product.')}</p>}
            </section>}
            {method?.account && (paymentDue || preview) && <section className={`pco-card pco-transfer brand-${resolvePaymentProviderKey(method.provider, method.id, method.name)}`}><h2><CheckoutMethodIcon provider={method.provider} id={method.id} name={method.name} isManual={true}/><span>{t('Transfer Instructions & Account Details')}</span></h2>
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
            {t(busy ? 'Submitting…' : preview ? orderAction : paymentDue ? 'Submit Transfer & Receipt' : 'Submit request')}{totals && !busy && ` · ${money(totals.dueToday)}`}
          </button>
        </footer>
      </form>}
  </section>;
}
