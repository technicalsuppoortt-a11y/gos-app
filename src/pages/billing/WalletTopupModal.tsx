import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  Wallet, Landmark, CreditCard, UploadCloud, CheckCircle2, ShieldCheck, 
  X, Copy, Check, Info, AlertCircle, Eye, Trash2, ZoomIn, 
  Sparkles, Tag, ArrowRight, CheckCircle, Clock
} from 'lucide-react';
import { 
  billing, 
  WALLET_CURRENCY, 
  useBillingIdentity, 
  useRequests,
  type BillingCoupon 
} from '../../backend/billing';
import { usePaymentMethods, type PaymentMethod } from '../../backend/paymentMethods';
import { Modal, Spinner, useAction, useCopy } from './ui';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../../backend/firebase';
import { localDemoEnabled } from '../../backend/localDemo';

interface WalletTopupModalProps {
  initialAmount?: number;
  currency?: string;
  onClose: () => void;
  onSuccess?: (result?: unknown) => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];

const brandAssets: Record<string, string> = { 
  vodafone: 'vodafone.svg', 
  instapay: 'instapay.png', 
  etisalat: 'etisalat.ico', 
  orange: 'orange.svg', 
  stc: 'stc.svg' 
};

function PaymentBrandIcon({ provider }: { provider: string }) {
  if (provider === 'bank') {
    return (
      <span className="bl-brand-frame" style={{ background: 'var(--bl-surface-2)', color: 'var(--bl-accent)' }}>
        <Landmark size={18} />
      </span>
    );
  }
  if (brandAssets[provider]) {
    return (
      <span className={`bl-brand-frame ${provider}`}>
        <img className="bl-brand-logo" src={`/payment-brands/${brandAssets[provider]}`} alt={provider} />
      </span>
    );
  }
  return (
    <span className="bl-brand-frame" style={{ background: 'var(--bl-surface-2)', color: 'var(--bl-accent)' }}>
      <CreditCard size={18} />
    </span>
  );
}

export function WalletTopupModal({ initialAmount = 50, currency = WALLET_CURRENCY, onClose, onSuccess }: WalletTopupModalProps) {
  const c = useCopy();
  const { busy, run } = useAction();
  const identity = useBillingIdentity();
  const providerId = identity.providerId || (identity.role === 'ADMIN' ? 'platform' : '');
  const paymentScope = providerId === 'platform' || identity.role === 'ADMIN' ? 'super_admin' : 'admin';
  const { methods: savedMethods, loading: methodsLoading } = usePaymentMethods({
    scope: paymentScope,
    targetId: paymentScope === 'super_admin' ? 'platform' : providerId,
  });
  const uid = identity.uid || auth.currentUser?.uid || null;
  const { data: userRequests } = useRequests('requesterId', uid);
  const pendingTopup = useMemo(() => {
    return (userRequests || []).find(r => r && r.type === 'wallet_topup' && r.status === 'pending');
  }, [userRequests]);

  // Selected Amount & Custom Numeric Input
  const [selectedPreset, setSelectedPreset] = useState<number | null>(() => 
    PRESET_AMOUNTS.includes(initialAmount) ? initialAmount : null
  );
  const [customInput, setCustomInput] = useState<string>(String(initialAmount));

  // Parse numerical amount
  const parsedAmount = useMemo(() => {
    const cleaned = customInput.trim();
    if (!cleaned) return 0;
    const num = parseFloat(cleaned);
    return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : 0;
  }, [customInput]);

  const isAmountValid = parsedAmount >= 1 && parsedAmount <= 100000;

  useEffect(() => {
    setCustomInput(String(initialAmount));
    setSelectedPreset(PRESET_AMOUNTS.includes(initialAmount) ? initialAmount : null);
  }, [initialAmount]);

  const handleSelectPreset = (val: number) => {
    setSelectedPreset(val);
    setCustomInput(String(val));
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits and up to 2 decimal places
    if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
      setCustomInput(val);
      const num = parseFloat(val);
      if (PRESET_AMOUNTS.includes(num)) {
        setSelectedPreset(num);
      } else {
        setSelectedPreset(null);
      }
    }
  };

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponState, setCouponState] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    coupon?: BillingCoupon;
    discount: number;
    creditBonus: number;
    error?: string;
  }>({ status: 'idle', discount: 0, creditBonus: 0 });

  // Handle coupon validation
  const validateCouponCode = async (codeToTest?: string) => {
    const raw = (codeToTest ?? couponCodeInput).trim().toUpperCase();
    if (!raw) return;
    setCouponState(prev => ({ ...prev, status: 'checking', error: undefined }));
    try {
      const res = await billing<{ valid: boolean; coupon?: BillingCoupon; discount?: number; creditBonus?: number; reason?: string }>('validateCoupon', {
        code: raw,
        amount: parsedAmount,
        currency,
        context: 'wallet_topup',
      });
      if ((res?.valid || res?.coupon) && res?.coupon) {
        setCouponState({
          status: 'valid',
          coupon: res.coupon,
          discount: res.discount ?? 0,
          creditBonus: res.creditBonus ?? (res as any).bonus ?? 0,
        });
      } else {
        setCouponState({
          status: 'invalid',
          discount: 0,
          creditBonus: 0,
          error: res?.reason || c.t('Coupon code is invalid or expired', 'كود الخصم غير صالح أو منتهي الصلاحية'),
        });
      }
    } catch (err) {
      setCouponState({
        status: 'invalid',
        discount: 0,
        creditBonus: 0,
        error: (err as Error).message || c.t('Failed to validate coupon', 'تعذر التحقق من كود الخصم'),
      });
    }
  };

  const removeCoupon = () => {
    setCouponCodeInput('');
    setCouponState({ status: 'idle', discount: 0, creditBonus: 0 });
  };

  // Re-evaluate coupon if amount changes
  useEffect(() => {
    if (couponState.status === 'valid' && couponState.coupon && parsedAmount > 0) {
      const coupon = couponState.coupon;
      let discount = 0;
      let creditBonus = 0;
      if (coupon.type === 'percent') {
        discount = Math.round(((parsedAmount * coupon.value) / 100) * 100) / 100;
      } else if (coupon.type === 'fixed') {
        discount = Math.min(parsedAmount, coupon.value);
      } else if (coupon.type === 'credit_bonus') {
        creditBonus = coupon.value;
      }
      setCouponState(prev => ({ ...prev, discount, creditBonus }));
    }
  }, [parsedAmount]);

  // Financial calculations
  const subtotal = parsedAmount;
  const discount = couponState.status === 'valid' ? couponState.discount : 0;
  const totalToPay = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const creditBonus = couponState.status === 'valid' ? couponState.creditBonus : 0;
  const totalCreditsReceived = Math.round((subtotal + creditBonus) * 100) / 100;

  // Active payment methods
  const activeMethods = useMemo(() => {
    const list = (savedMethods || []).filter(m => m && m.enabled);
    if (list.length > 0) return list;
    // Default fallback list if none configured yet
    return [
      {
        id: 'stripe_gateway',
        provider: 'stripe',
        name: 'Credit / Debit Card (Stripe)',
        type: 'gateway' as const,
        account: '',
        instructions: 'Instant automatic activation.',
        enabled: true,
        status: 'Connected' as const,
      },
      {
        id: 'bank_transfer',
        provider: 'bank',
        name: 'Bank Transfer (SEPA / Wire)',
        type: 'manual' as const,
        account: 'IBAN: EG420002000100000001234567890\nBank: National Bank\nSwift: NBEGEGCX',
        instructions: 'Transfer the exact amount and upload the payment receipt below.',
        enabled: true,
        status: 'Configured' as const,
      }
    ];
  }, [savedMethods]);

  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const selectedMethod = useMemo<PaymentMethod | null>(() => {
    if (!activeMethods.length) return null;
    return activeMethods.find(m => (m.id || m.provider) === selectedMethodId) || activeMethods[0];
  }, [activeMethods, selectedMethodId]);

  // Manual payment state
  const [txId, setTxId] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulated gateway card state
  const [cardName, setCardName] = useState(() => auth.currentUser?.displayName || 'Cardholder');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('•••');

  // Completion state
  const [completed, setCompleted] = useState<{
    type: 'manual' | 'gateway';
    message: string;
    amountPaid: number;
    creditsReceived: number;
  } | null>(null);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const processSelectedFile = (file: File) => {
    if (!file) return;
    setReceiptFile(file);
    setReceiptUrl('');
    setUploadProgress(0);
    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif|bmp|tiff?)$/i.test(file.name);
    if (isImg) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview('');
    }
  };

  const uploadReceipt = async (): Promise<string> => {
    if (!receiptFile) return receiptUrl || receiptPreview;
    try {
      setUploadProgress(15);
      const uid = auth.currentUser?.uid || identity.uid || 'guest';
      const ext = receiptFile.name.split('.').pop() || 'png';
      const fileName = `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const storageRef = ref(storage, `billingReceipts/${uid}/${fileName}`);
      
      const snap = await uploadBytes(storageRef, receiptFile, { contentType: receiptFile.type || 'image/png' });
      setUploadProgress(80);
      const download = await getDownloadURL(snap.ref);
      setUploadProgress(100);
      return download;
    } catch (err) {
      console.warn('Storage upload error, using local data URL fallback:', err);
      if (receiptPreview) return receiptPreview;
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(receiptPreview || '');
        reader.readAsDataURL(receiptFile);
      });
    }
  };

  const handleSubmit = async () => {
    if (pendingTopup) return;
    if (!selectedMethod) return;
    if (!isAmountValid) {
      alert(c.t('Please enter a valid amount (minimum €1.00).', 'يرجى إدخال مبلغ صالح (الحد الأدنى 1.00 يورو).'));
      return;
    }

    const idempotencyKey = crypto.randomUUID();

    if (selectedMethod.type === 'manual') {
      if (!receiptFile && !receiptUrl && !receiptPreview) {
        alert(c.t('Please upload your transfer receipt before confirming.', 'يرجى رفع إيصال التحويل قبل تأكيد الطلب.'));
        return;
      }

      await run('topup', async () => {
        let uploaded = receiptUrl;
        if (!uploaded && receiptFile) {
          uploaded = await uploadReceipt();
          if (uploaded) setReceiptUrl(uploaded);
        }
        if (!uploaded && receiptPreview) {
          uploaded = receiptPreview;
        }

        const res = await billing<any>('requestWalletTopup', {
          amount: totalToPay,
          currency,
          paymentMethod: selectedMethod.name,
          paymentType: 'manual',
          receiptUrl: uploaded,
          receiptName: receiptFile?.name || 'wallet_topup_receipt',
          transactionId: txId,
          note,
          couponCode: couponState.status === 'valid' ? couponState.coupon?.code : undefined,
          subtotal,
          discount,
          creditAmount: totalCreditsReceived,
          idempotencyKey,
        });

        // Cache receipt locally for immediate UI preview
        if (uploaded) {
          try {
            const receiptPayload = {
              receiptUrl: uploaded,
              receiptName: receiptFile?.name || 'wallet_topup_receipt',
              transactionId: txId,
              paymentMethod: selectedMethod.name,
              amount: totalToPay,
              timestamp: Date.now(),
            };
            const reqId = res?.request?.id || res?.id;
            if (reqId) {
              localStorage.setItem(`bl_receipt_${reqId}`, JSON.stringify(receiptPayload));
            }
          } catch (e) {
            console.warn('LocalStorage receipt cache error:', e);
          }
        }

        setCompleted({
          type: 'manual',
          message: c.t(
            'Your top-up receipt has been submitted! Our billing team is reviewing it. Your balance will update immediately upon approval.',
            'تم إرسال إيصال الشحن بنجاح! طلبك قيد المراجعة حاليًا، وسيتم إضافة الرصيد إلى محفظتك فور اعتماد الإيصال.'
          ),
          amountPaid: totalToPay,
          creditsReceived: totalCreditsReceived,
        });
        onSuccess?.(res);
      }, c.t('Submitting top-up request…', 'جاري إرسال طلب الشحن…'));

    } else {
      // Gateway Flow (Stripe / Instant Card)
      await run('topup', async () => {
        const res = await billing<any>('requestWalletTopup', {
          amount: totalToPay,
          currency,
          paymentMethod: selectedMethod.name,
          paymentType: 'gateway',
          gatewayPaid: true,
          transactionId: `gtw_topup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          couponCode: couponState.status === 'valid' ? couponState.coupon?.code : undefined,
          subtotal,
          discount,
          creditAmount: totalCreditsReceived,
          idempotencyKey,
        });

        setCompleted({
          type: 'gateway',
          message: c.t(
            'Payment verified instantly! Your communication wallet has been credited.',
            'تم تأكيد الدفع بنجاح! تمت إضافة الرصيد إلى محفظة المحادثات فورًا.'
          ),
          amountPaid: totalToPay,
          creditsReceived: totalCreditsReceived,
        });
        onSuccess?.(res);
      }, c.t('Processing instant payment…', 'جاري معالجة الدفع الفوري…'));
    }
  };

  return (
    <>
      <Modal
        wide
        title={c.t('Top Up Communication Wallet', 'شحن محفظة المحادثات')}
        subtitle={c.t('Carrier transit funds for WhatsApp, SMS, and messaging networks', 'رصيد رسوم عبور شبكات الاتصال والرسائل')}
        icon={<Wallet size={19} className="text-emerald-500" />}
        onClose={onClose}
        footer={
          completed ? (
            <button type="button" className="bl-btn primary" onClick={onClose}>
              {c.t('Done', 'تم')}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="bl-btn" onClick={onClose}>
                {c.t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                className="bl-btn primary"
                disabled={!isAmountValid || busy === 'topup' || !!pendingTopup}
                onClick={handleSubmit}
              >
                {busy === 'topup' ? (
                  <>
                    <Spinner size={14} />
                    <span>{c.t('Processing…', 'جاري المعالجة…')}</span>
                  </>
                ) : pendingTopup ? (
                  <>
                    <Clock size={15} />
                    <span>{c.t('Awaiting Admin Approval', 'بانتظار موافقة الإدارة')}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedMethod?.type === 'gateway'
                        ? c.t(`Pay ${c.checkoutMoney(totalToPay, currency)} & Activate`, `دفع ${c.checkoutMoney(totalToPay, currency)} والتفعيل الفوري`)
                        : c.t(`Submit Request (${c.checkoutMoney(totalToPay, currency)})`, `إرسال الطلب (${c.checkoutMoney(totalToPay, currency)})`)}
                    </span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          )
        }
      >
        {completed ? (
          <div className="text-center py-8 px-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
              <CheckCircle size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {completed.type === 'gateway'
                ? c.t('Top-Up Successful!', 'تم الشحن بنجاح!')
                : c.t('Request Submitted!', 'تم استلام طلب الشحن!')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-6">
              {completed.message}
            </p>
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 max-w-sm mx-auto text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">{c.t('Amount Paid:', 'المبلغ المدفوع:')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{c.checkoutMoney(completed.amountPaid, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{c.t('Credits Added:', 'الرصيد المضاف:')}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{c.money(completed.creditsReceived, currency)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingTopup && (
              <div className="p-4.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-start gap-3.5 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={19} className="animate-pulse" />
                </div>
                <div className="text-xs leading-relaxed flex-1">
                  <div className="font-bold text-sm text-amber-900 dark:text-amber-100 mb-1 flex items-center gap-2">
                    <span>{c.t('Pending Top-Up Request Under Review', 'طلب شحن سابق قيد المراجعة')}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300">
                      {c.t('Awaiting Approval', 'بانتظار الموافقة')}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    {c.t(
                      `You already have a pending top-up request for ${c.checkoutMoney(pendingTopup.totalAmount ?? pendingTopup.subtotal ?? 0, pendingTopup.plan?.currency ?? currency)} submitted on ${c.date(pendingTopup.createdAt)} via ${pendingTopup.paymentMethod || 'Manual Transfer'}. You cannot send another top-up request until your previous request is approved or rejected by an administrator.`,
                      `لديك بالفعل طلب شحن بقيمة ${c.checkoutMoney(pendingTopup.totalAmount ?? pendingTopup.subtotal ?? 0, pendingTopup.plan?.currency ?? currency)} تم إرساله بتاريخ ${c.date(pendingTopup.createdAt)} عبر ${pendingTopup.paymentMethod || 'التحويل اليدوي'}. لا يمكنك إرسال طلب شحن آخر حتى يتم اعتماد أو رفض طلبك السابق من قِبل الإدارة.`
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Top-Up Configuration & Payment Method */}
            <div className="lg:col-span-7 space-y-6">
              {/* Amount Selection */}
              <div className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  {c.t(`1. Choose or Enter Credit Amount (${currency})`, `1. اختر أو اكتب قيمة الرصيد (${currency})`)}
                </label>
                
                {/* Preset Pills */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {PRESET_AMOUNTS.map(preset => {
                    const active = selectedPreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        dir="ltr"
                        className={`py-2 px-1 text-sm font-semibold rounded-xl border transition-all text-center tabular-nums ${
                          active
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                        }`}
                      >
                        {currency === 'EUR' ? `€${preset}` : `${currency} ${preset}`}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Numeric Input */}
                <div className="relative" dir="ltr">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-semibold text-xs">
                    {currency === 'EUR' ? '€' : currency}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customInput}
                    onChange={handleCustomInputChange}
                    placeholder={c.t('Enter custom amount…', 'أدخل مبلغًا مخصصًا…')}
                    className={`w-full ${currency === 'EUR' ? 'pl-8' : 'pl-12'} pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all`}
                  />
                </div>
                {!isAmountValid && (
                  <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {c.t(`Enter an amount between ${currency} 1.00 and ${currency} 100,000`, `أدخل مبلغًا بين ${currency} 1.00 و ${currency} 100,000`)}
                  </p>
                )}
              </div>

              {/* Coupon Code Section */}
              <div className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Tag size={13} className="text-indigo-500" />
                    {c.t('2. Have a Coupon or Promo Code?', '2. هل لديك كود خصم أو برومو؟')}
                  </label>
                  {couponState.status === 'valid' && (
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                    >
                      <X size={12} />
                      {c.t('Remove', 'إزالة')}
                    </button>
                  )}
                </div>

                {couponState.status === 'valid' && couponState.coupon ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold font-mono text-emerald-800 dark:text-emerald-200">
                          {couponState.coupon.code}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          {couponState.coupon.type === 'percent'
                            ? c.t(`${couponState.coupon.value}% discount applied`, `تم تطبيق خصم ${couponState.coupon.value}%`)
                            : couponState.coupon.type === 'fixed'
                            ? c.t(`${c.money(couponState.coupon.value, currency)} discount applied`, `تم تطبيق خصم ${c.money(couponState.coupon.value, currency)}`)
                            : c.t(`+${c.money(couponState.coupon.value, currency)} bonus credits!`, `+${c.money(couponState.coupon.value, currency)} رصيد إضافي هدية!`)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {couponState.discount > 0 ? `-${c.money(couponState.discount, currency)}` : `+${c.money(couponState.creditBonus, currency)}`}
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void validateCouponCode(); } }}
                        placeholder={c.t('e.g. SUMMER20, BONUS10', 'مثال: SUMMER20, BONUS10')}
                        className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 uppercase font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        disabled={!couponCodeInput.trim() || couponState.status === 'checking'}
                        onClick={() => void validateCouponCode()}
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                      >
                        {couponState.status === 'checking' ? <Spinner size={14} /> : c.t('Apply', 'تطبيق')}
                      </button>
                    </div>
                    {couponState.status === 'invalid' && couponState.error && (
                      <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {couponState.error}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  {c.t('3. Select Payment Method', '3. اختر طريقة الدفع')}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                  {activeMethods.map(m => {
                    const isSelected = (selectedMethod?.id || selectedMethod?.provider) === (m.id || m.provider);
                    return (
                      <button
                        key={m.id || m.provider}
                        type="button"
                        onClick={() => setSelectedMethodId(m.id || m.provider)}
                        className={`p-3 rounded-xl border text-start flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <PaymentBrandIcon provider={m.provider} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {m.type === 'gateway' ? c.t('Instant activation', 'تفعيل فوري تلقائي') : c.t('Manual transfer', 'تحويل يدوي وإيصال')}
                          </div>
                        </div>
                        {isSelected && <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Method Details: Manual vs Gateway */}
                {selectedMethod?.type === 'manual' ? (
                  <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {/* Account Instructions */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {c.t('Payment Account Details:', 'بيانات حساب التحويل:')}
                        </span>
                        {selectedMethod.account && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedMethod.account)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? c.t('Copied!', 'تم النسخ!') : c.t('Copy Account', 'نسخ الحساب')}
                          </button>
                        )}
                      </div>
                      <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-all bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        {selectedMethod.account || c.t('Please contact support for payment instructions.', 'يرجى التواصل مع الدعم للحصول على بيانات التحويل.')}
                      </pre>
                      {selectedMethod.instructions && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                          {selectedMethod.instructions}
                        </p>
                      )}
                    </div>

                    {/* Receipt Upload Dropzone */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {c.t('Upload Payment Receipt (Required)', 'رفع إيصال التحويل (مطلوب)')}
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) processSelectedFile(f);
                        }}
                        className="hidden"
                      />

                      {receiptFile || receiptPreview ? (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                          <div className="flex items-center gap-3 min-w-0">
                            {receiptPreview ? (
                              <img
                                src={receiptPreview}
                                alt="Receipt preview"
                                className="w-12 h-12 object-cover rounded-lg border border-emerald-300 cursor-pointer"
                                onClick={() => setIsZoomOpen(true)}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <UploadCloud size={20} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {receiptFile?.name || 'receipt.png'}
                              </p>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check size={12} />
                                {c.t('Ready to submit', 'جاهز للإرسال')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {receiptPreview && (
                              <button
                                type="button"
                                onClick={() => setIsZoomOpen(true)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-white dark:hover:bg-slate-800"
                                title={c.t('Zoom Receipt', 'تكبير الإيصال')}
                              >
                                <ZoomIn size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptFile(null);
                                setReceiptPreview('');
                                setReceiptUrl('');
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white dark:hover:bg-slate-800"
                              title={c.t('Remove', 'حذف')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={e => {
                            e.preventDefault();
                            setIsDragging(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) processSelectedFile(f);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                            isDragging
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                              : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-900/40'
                          }`}
                        >
                          <UploadCloud size={24} className="mx-auto text-slate-400 mb-1.5" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {c.t('Click or drag receipt here', 'اضغط هنا أو اسحب الإيصال للإفلات')}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {c.t('PNG, JPG, PDF up to 10MB', 'صيغ الصور أو PDF حتى 10 ميجابايت')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Transaction Reference & Note */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {c.t('Transaction / Reference ID', 'رقم العملية / الحوالة')}
                        </label>
                        <input
                          type="text"
                          value={txId}
                          onChange={e => setTxId(e.target.value)}
                          placeholder={c.t('e.g. TXN-89472', 'مثال: TXN-89472')}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {c.t('Order Note (Optional)', 'ملاحظة الطلب (اختياري)')}
                        </label>
                        <input
                          type="text"
                          value={note}
                          onChange={e => setNote(e.target.value)}
                          placeholder={c.t('Any specific details…', 'أي تفاصيل إضافية…')}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Gateway Card Input Simulation */
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
                      <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                      <span>{c.t('Instant activation: credits will be loaded immediately upon payment completion.', 'تفعيل فوري: ستتم إضافة الرصيد إلى محفظتك مباشرة عند إتمام العملية.')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {c.t('Name on Card', 'اسم حامل البطاقة')}
                        </label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={e => setCardName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {c.t('Card Number', 'رقم البطاقة')}
                        </label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {c.t('Expiry', 'تاريخ الانتهاء')}
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {c.t('CVC', 'رمز الأمان')}
                        </label>
                        <input
                          type="password"
                          value={cardCvc}
                          onChange={e => setCardCvc(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary Box */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-500" />
                  {c.t('Order Summary', 'ملخص الطلب')}
                </h4>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>{c.t('Credit Top-Up Subtotal', 'قيمة الرصيد المطلوب')}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{c.money(subtotal, currency)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Tag size={13} />
                        {c.t('Coupon Discount', 'خصم الكوبون')}
                      </span>
                      <span className="font-semibold">-{c.money(discount, currency)}</span>
                    </div>
                  )}

                  {creditBonus > 0 && (
                    <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400">
                      <span className="flex items-center gap-1">
                        <Sparkles size={13} />
                        {c.t('Bonus Credits Added', 'رصيد إضافي مجاني')}
                      </span>
                      <span className="font-semibold">+{c.money(creditBonus, currency)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{c.t('Total To Pay', 'الإجمالي للدفع')}</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {c.checkoutMoney(totalToPay, currency)}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center mt-2">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                      {c.t('Wallet Credits Added:', 'الرصيد المضاف للمحفظة:')}
                    </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {c.money(totalCreditsReceived, currency)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>{c.t('Funds strictly reserved for carrier transit fees', 'الرصيد مخصص لرسوم شبكات الاتصال المباشرة')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{c.t('AI tokens and platform tools remain decoupled', 'تكاليف الذكاء الاصطناعي منفصلة تمامًا ولا تخصم من هنا')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}
      </Modal>

      {/* Receipt Zoom Lightbox */}
      {isZoomOpen && receiptPreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={receiptPreview}
              alt="Receipt preview zoomed"
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-lg"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
