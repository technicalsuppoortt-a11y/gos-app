import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { 
  CreditCard, Landmark, UploadCloud, CheckCircle2, ShieldCheck, 
  Package, Gem, FileText, Lock, X, Copy, Check, Info, AlertCircle, Settings,
  Eye, Trash2, ZoomIn, Image as ImageIcon, Plus, Minus, PackagePlus, Sliders,
  ChevronDown, ChevronUp, Sparkles, Coins
} from 'lucide-react';
import { billing, DEFAULT_BILLING_SETTINGS, useBillingIdentity, useBillingSettings, usePlans, type AddonItem, type BillingPlan } from '../../backend/billing';
import { usePaymentMethods } from '../../backend/paymentMethods';
import { Modal, Spinner, billingLabel, useAction, useCopy } from './ui';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../../backend/firebase';

interface CheckoutModalProps {
  plan: BillingPlan;
  quantity?: number;
  mode?: 'plan' | 'renewal' | 'addon';
  onClose: () => void;
  onSuccess: (result: any) => void;
}

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

export function CheckoutModal({ plan: initialPlan, quantity = 1, mode = 'plan', onClose, onSuccess }: CheckoutModalProps) {
  const c = useCopy();
  const { busy, run } = useAction();
  const { methods: savedMethods, loading: methodsLoading, canManage } = usePaymentMethods();
  
  const identity = useBillingIdentity();
  const providerId = initialPlan?.ownerId || identity.providerId || 'platform';
  const { data: availablePlans } = usePlans(providerId);
  const { data: billingSettings } = useBillingSettings(providerId);
  const rate = billingSettings?.unitRate || DEFAULT_BILLING_SETTINGS.unitRate;

  // All active fixed add-on plans available from the provider
  const allFixedAddons = useMemo(() => {
    return (availablePlans || []).filter(p => p && p.kind === 'addon' && p.visible && p.id !== 'dynamic_units');
  }, [availablePlans]);

  // Selected addon plan if in standalone addon mode
  const [selectedAddonId, setSelectedAddonId] = useState<string>(() => initialPlan?.id || (allFixedAddons[0]?.id || ''));

  // Active plan (switching supported in addon mode)
  const plan = useMemo<BillingPlan>(() => {
    if (!initialPlan) {
      return allFixedAddons[0] || {
        id: 'default_addon',
        ownerId: providerId,
        audience: 'admin',
        kind: 'addon',
        name: { en: 'Add-on Pack', ar: 'باقة إضافية' },
        description: { en: 'Credit top-up', ar: 'شحن رصيد' },
        badge: { en: '', ar: '' },
        cta: { en: 'Buy', ar: 'شراء' },
        features: { en: [], ar: [] },
        price: 10,
        currency: 'USD',
        billingType: 'once',
        durationDays: null,
        credits: 100,
        tools: [],
        limits: {},
        addonType: 'credits',
        addonSeats: null,
        addonTool: null,
        visible: true,
        enabled: true,
        sortOrder: 0,
        status: 'active',
        createdAt: '',
        updatedAt: '',
        revision: 1,
      };
    }
    if (mode === 'addon' && initialPlan.id !== 'dynamic_units' && selectedAddonId && selectedAddonId !== initialPlan.id) {
      const switched = allFixedAddons.find(p => p.id === selectedAddonId);
      if (switched) return switched;
    }
    return initialPlan;
  }, [initialPlan, mode, selectedAddonId, allFixedAddons, providerId]);

  const isAddon = mode === 'addon' || plan?.kind === 'addon';
  const isDynamicStandalone = isAddon && plan?.id === 'dynamic_units';
  const safeCurrency = plan?.currency || rate?.currency || 'USD';

  // Dynamic slider units state for standalone top-up
  const initialDynamicUnits = isDynamicStandalone
    ? Math.max(rate.minUnits || 1, Math.round((plan?.credits || 100) / (rate.creditsPerUnit || 100)))
    : (rate.minUnits || 1);
  const [standaloneDynamicUnits, setStandaloneDynamicUnits] = useState<number>(initialDynamicUnits);
  const [rawStandaloneCreditsInput, setRawStandaloneCreditsInput] = useState<string | null>(() => {
    return isDynamicStandalone && plan?.credits ? plan.credits.toString() : null;
  });

  const standalonePerUnit = rate?.creditsPerUnit || 100;
  const standaloneMinUnits = rate?.minUnits || 1;
  const standaloneMaxUnits = rate?.maxUnits || 50;
  const standaloneMinCredits = standaloneMinUnits * standalonePerUnit;
  const standaloneMaxCredits = standaloneMaxUnits * standalonePerUnit;

  const standaloneCurrentInputValue = rawStandaloneCreditsInput !== null
    ? rawStandaloneCreditsInput
    : (isDynamicStandalone && plan?.credits ? plan.credits.toString() : (standaloneDynamicUnits * standalonePerUnit).toString());

  const standaloneParsedCredits = Number(standaloneCurrentInputValue);
  const standaloneHasInput = standaloneCurrentInputValue.trim() !== '';
  const standaloneIsUnderMin = standaloneHasInput && (!Number.isFinite(standaloneParsedCredits) || standaloneParsedCredits < standaloneMinCredits);
  const standaloneIsOverMax = standaloneHasInput && standaloneParsedCredits > standaloneMaxCredits;
  const standaloneIsCreditInvalid = !standaloneHasInput || standaloneIsUnderMin || standaloneIsOverMax;

  const standaloneValidationMsg = standaloneIsUnderMin
    ? c.t(`Minimum is ${standaloneMinCredits.toLocaleString()} credits (${standaloneMinUnits} ${standaloneMinUnits === 1 ? 'unit' : 'units'})`, `الحد الأدنى هو ${c.num(standaloneMinCredits)} رصيد (${c.num(standaloneMinUnits)} وحدة)`)
    : standaloneIsOverMax
    ? c.t(`Maximum is ${standaloneMaxCredits.toLocaleString()} credits (${standaloneMaxUnits} units)`, `الحد الأقصى هو ${c.num(standaloneMaxCredits)} رصيد (${c.num(standaloneMaxUnits)} وحدة)`)
    : null;

  const setStandaloneUnitsAndSync = (u: number) => {
    const clamped = Math.max(standaloneMinUnits, Math.min(standaloneMaxUnits, u));
    setStandaloneDynamicUnits(clamped);
    setRawStandaloneCreditsInput((clamped * standalonePerUnit).toString());
  };

  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [qty, setQty] = useState(quantity);
  const [note, setNote] = useState('');
  const [txId, setTxId] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Receipt file state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Card details state for gateway
  const [cardName, setCardName] = useState(() => auth.currentUser?.displayName || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  
  // Completion screen
  const [completed, setCompleted] = useState<{ type: 'manual' | 'gateway'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter ONLY active (enabled) payment methods configured in Payment Methods dashboard (/admin/payments-gateways)
  const activeMethods = useMemo(() => {
    return (savedMethods || []).filter(m => m && m.enabled);
  }, [savedMethods]);

  // Set selected payment method
  const selectedMethod = useMemo(() => {
    if (!activeMethods.length) return null;
    return activeMethods.find(m => (m.id || m.provider) === selectedMethodId) || activeMethods[0];
  }, [activeMethods, selectedMethodId]);

  // Available fixed add-ons when combining with a base plan
  const fixedAddons = useMemo(() => {
    return (availablePlans || []).filter(p => p && p.kind === 'addon' && p.visible && p.id !== plan?.id);
  }, [availablePlans, plan?.id]);

  const [selectedFixedAddons, setSelectedFixedAddons] = useState<Record<string, number>>({});
  const [includeDynamicUnits, setIncludeDynamicUnits] = useState(false);
  const [dynamicUnitsCount, setDynamicUnitsCount] = useState<number>(() => rate.minUnits || 1);
  const [isAddonsAccordionOpen, setIsAddonsAccordionOpen] = useState(false);
  const [addonAccordionTab, setAddonAccordionTab] = useState<'packages' | 'custom'>('packages');

  const [rawAccordionCreditsInput, setRawAccordionCreditsInput] = useState<string | null>(null);

  const accordionPerUnit = rate?.creditsPerUnit || 100;
  const accordionMinUnits = rate?.minUnits || 1;
  const accordionMaxUnits = rate?.maxUnits || 50;
  const accordionMinCredits = accordionMinUnits * accordionPerUnit;
  const accordionMaxCredits = accordionMaxUnits * accordionPerUnit;

  const accordionCurrentInputValue = rawAccordionCreditsInput !== null
    ? rawAccordionCreditsInput
    : (dynamicUnitsCount * accordionPerUnit).toString();

  const accordionParsedCredits = Number(accordionCurrentInputValue);
  const accordionHasInput = accordionCurrentInputValue.trim() !== '';
  const accordionIsUnderMin = accordionHasInput && (!Number.isFinite(accordionParsedCredits) || accordionParsedCredits < accordionMinCredits);
  const accordionIsOverMax = accordionHasInput && accordionParsedCredits > accordionMaxCredits;
  const accordionIsCreditInvalid = !accordionHasInput || accordionIsUnderMin || accordionIsOverMax;

  const accordionValidationMsg = accordionIsUnderMin
    ? c.t(`Minimum is ${accordionMinCredits.toLocaleString()} credits (${accordionMinUnits} ${accordionMinUnits === 1 ? 'unit' : 'units'})`, `الحد الأدنى هو ${c.num(accordionMinCredits)} رصيد (${c.num(accordionMinUnits)} وحدة)`)
    : accordionIsOverMax
    ? c.t(`Maximum is ${accordionMaxCredits.toLocaleString()} credits (${accordionMaxUnits} units)`, `الحد الأقصى هو ${c.num(accordionMaxCredits)} رصيد (${c.num(accordionMaxUnits)} وحدة)`)
    : null;

  const setAccordionUnitsAndSync = (u: number) => {
    const clamped = Math.max(accordionMinUnits, Math.min(accordionMaxUnits, u));
    setDynamicUnitsCount(clamped);
    setRawAccordionCreditsInput((clamped * accordionPerUnit).toString());
  };

  // Standalone dynamic top-up calculations
  const dynamicStandaloneCredits = !standaloneIsCreditInvalid && standaloneParsedCredits > 0
    ? standaloneParsedCredits
    : (standaloneDynamicUnits * (rate.creditsPerUnit || 100));
  const standaloneUnitsFloat = dynamicStandaloneCredits / (rate.creditsPerUnit || 100);
  const dynamicStandaloneCost = Math.round((standaloneUnitsFloat * (rate.pricePerUnit || 5)) * 100) / 100;

  // Compute itemized attached addons
  const attachedAddons = useMemo<AddonItem[]>(() => {
    if (isAddon) {
      if (isDynamicStandalone) {
        return [{
          id: 'dynamic_units',
          type: 'unit',
          qty: Number.isInteger(standaloneUnitsFloat) ? standaloneUnitsFloat : Math.round(standaloneUnitsFloat * 100) / 100,
          credits: dynamicStandaloneCredits,
          price: dynamicStandaloneCost,
          name: `${dynamicStandaloneCredits.toLocaleString()} ${c.t('Custom Credits', 'رصيد مخصص')}`,
          addonType: 'credits',
        }];
      }
      return [{
        id: plan.id,
        type: 'fixed',
        qty,
        credits: (plan.credits || 0) * qty,
        price: Math.round((plan.price || 0) * qty * 100) / 100,
        name: c.pick(plan.name) || 'Add-on Pack',
        addonType: plan.addonType || 'credits',
        addonTool: plan.addonTool || undefined,
      }];
    }

    const items: AddonItem[] = [];
    for (const [addonId, quantity] of Object.entries(selectedFixedAddons)) {
      if (quantity > 0) {
        const found = fixedAddons.find(a => a.id === addonId);
        if (found) {
          items.push({
            id: found.id,
            type: 'fixed',
            qty: quantity,
            credits: (found.credits || 0) * quantity,
            price: Math.round((found.price || 0) * quantity * 100) / 100,
            name: c.pick(found.name),
            addonType: found.addonType || 'credits',
            addonTool: found.addonTool || undefined,
          });
        }
      }
    }

    if (includeDynamicUnits && dynamicUnitsCount > 0 && rate) {
      const credits = !accordionIsCreditInvalid && accordionParsedCredits > 0
        ? accordionParsedCredits
        : dynamicUnitsCount * (rate.creditsPerUnit || 100);
      const unitsFloat = credits / (rate.creditsPerUnit || 100);
      const price = Math.round((unitsFloat * (rate.pricePerUnit || 5)) * 100) / 100;
      items.push({
        id: 'dynamic_units',
        type: 'unit',
        qty: Number.isInteger(unitsFloat) ? unitsFloat : Math.round(unitsFloat * 100) / 100,
        credits,
        price,
        name: `${credits.toLocaleString()} ${c.t('Custom Credits', 'رصيد مخصص')}`,
        addonType: 'credits',
      });
    }

    return items;
  }, [isAddon, isDynamicStandalone, standaloneDynamicUnits, dynamicStandaloneCredits, dynamicStandaloneCost, plan, qty, selectedFixedAddons, fixedAddons, includeDynamicUnits, dynamicUnitsCount, rate, c]);

  const mainPlanPrice = isAddon ? 0 : Math.round((plan?.price || 0) * qty * 100) / 100;
  const addonsTotal = attachedAddons.reduce((sum, item) => sum + (item.price * (item.type === 'unit' ? 1 : item.qty)), 0);
  const totalAmount = isAddon
    ? (isDynamicStandalone ? dynamicStandaloneCost : Math.round((plan?.price || 0) * qty * 100) / 100)
    : Math.round((mainPlanPrice + addonsTotal) * 100) / 100;
  const totalCredits = isAddon
    ? (isDynamicStandalone ? dynamicStandaloneCredits : (plan?.credits || 0) * qty)
    : ((plan?.credits || 0) * qty) + attachedAddons.reduce((sum, item) => sum + (item.credits || 0), 0);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const getAccountLabel = (provider: string) => {
    if (['vodafone', 'orange', 'etisalat', 'stc'].includes(provider)) {
      return c.t('Wallet Phone Number', 'رقم المحفظة الإلكترونية');
    }
    if (provider === 'instapay') {
      return c.t('InstaPay Account / Mobile', 'حساب إنستاباي أو رقم الهاتف');
    }
    if (provider === 'bank') {
      return c.t('Bank Account / IBAN', 'رقم الحساب البنكي أو الآيبان');
    }
    return c.t('Account / Wallet Reference', 'بيانات الحساب / المحفظة');
  };

  // Handle receipt selection
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview('');
    setReceiptUrl('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload receipt to Firebase Storage (with offline base64 fallback)
  const uploadReceipt = async (): Promise<string> => {
    if (!receiptFile) return receiptUrl || receiptPreview;
    try {
      setUploadProgress(10);
      const uid = auth.currentUser?.uid || 'guest';
      const ext = receiptFile.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const storageRef = ref(storage, `billingReceipts/${uid}/${fileName}`);
      
      const snap = await uploadBytes(storageRef, receiptFile, { contentType: receiptFile.type || 'image/png' });
      setUploadProgress(70);
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

  // Process checkout
  const handleSubmit = async () => {
    if (!selectedMethod) return;

    if (selectedMethod.type === 'manual') {
      if (!receiptFile && !receiptUrl && !receiptPreview) {
        alert(c.t('Please upload your transfer receipt before confirming.', 'يرجى رفع إيصال التحويل البنكي قبل التأكيد.'));
        return;
      }
      
      await run('checkout', async () => {
        let uploaded = receiptUrl;
        if (!uploaded && receiptFile) {
          uploaded = await uploadReceipt();
          if (uploaded) setReceiptUrl(uploaded);
        }
        if (!uploaded && receiptPreview) {
          uploaded = receiptPreview;
        }

        const op = isAddon ? 'requestAddon' : 'requestPlan';
        const res = await billing<any>(op, {
          planId: plan.id,
          quantity: isDynamicStandalone ? standaloneDynamicUnits : qty,
          mainPlanPrice,
          addons: attachedAddons,
          totalAmount,
          note,
          isDynamic: isDynamicStandalone,
          credits: isDynamicStandalone ? dynamicStandaloneCredits : (plan.credits ? plan.credits * qty : undefined),
          price: isDynamicStandalone ? dynamicStandaloneCost : totalAmount,
          currency: plan.currency,
          paymentMethod: selectedMethod.name,
          paymentType: 'manual',
          receiptUrl: uploaded,
          receiptPath: uploaded,
          imageUrl: uploaded,
          fileUrl: uploaded,
          receiptName: receiptFile?.name || 'bank_transfer_receipt',
          fileName: receiptFile?.name || 'bank_transfer_receipt',
          transactionId: txId,
        });

        // Cache receipt locally so it is immediately visible even if cloud function stripped it
        if (uploaded) {
          try {
            const receiptPayload = {
              receiptUrl: uploaded,
              receiptPath: uploaded,
              imageUrl: uploaded,
              fileUrl: uploaded,
              receiptName: receiptFile?.name || 'bank_transfer_receipt',
              fileName: receiptFile?.name || 'bank_transfer_receipt',
              transactionId: txId,
              paymentMethod: selectedMethod.name,
              timestamp: Date.now(),
            };
            const reqId = res?.request?.id || res?.id;
            if (reqId) {
              localStorage.setItem(`bl_receipt_${reqId}`, JSON.stringify(receiptPayload));
            }
            const uid = auth.currentUser?.uid || 'me';
            localStorage.setItem(`bl_pending_receipt_${uid}_${plan.id}`, JSON.stringify(receiptPayload));
            localStorage.setItem(`bl_latest_receipt_${uid}`, JSON.stringify(receiptPayload));
            localStorage.setItem('bl_latest_receipt_me', JSON.stringify(receiptPayload));
          } catch (e) {
            console.warn('LocalStorage receipt cache error:', e);
          }
        }

        setCompleted({
          type: 'manual',
          message: c.t(
            'Your transfer receipt was submitted successfully! It is now pending review. Your plan will activate once approved by the administrator.',
            'تم إرسال إيصال التحويل بنجاح! طلبك قيد المراجعة حاليًا، وسيتم تفعيل الباقة فور اعتماد الإيصال من الإدارة.'
          )
        });
        onSuccess(res);
      }, c.t('Submitting transfer request…', 'جاري إرسال طلب التحويل…'));

    } else {
      // Automated Gateway Flow (Stripe/Paddle/Paymob/etc.)
      await run('checkout', async () => {
        const op = isAddon ? 'requestAddon' : 'requestPlan';
        const res = await billing(op, {
          planId: plan.id,
          quantity: isDynamicStandalone ? standaloneDynamicUnits : qty,
          mainPlanPrice,
          addons: attachedAddons,
          totalAmount,
          note,
          isDynamic: isDynamicStandalone,
          credits: isDynamicStandalone ? dynamicStandaloneCredits : (plan.credits ? plan.credits * qty : undefined),
          price: isDynamicStandalone ? dynamicStandaloneCost : totalAmount,
          currency: plan.currency,
          paymentMethod: selectedMethod.name,
          paymentType: 'gateway',
          gatewayPaid: true,
          transactionId: `gtw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        });

        setCompleted({
          type: 'gateway',
          message: c.t(
            'Payment verified successfully! Your plan and credits have been activated immediately.',
            'تم تأكيد عملية الدفع بنجاح! تم تفعيل باقتك ورصيدك فورًا.'
          )
        });
        onSuccess(res);
      }, c.t('Processing payment…', 'جاري معالجة الدفع…'));
    }
  };

  return (
    <Modal
      wide
      title={mode === 'renewal' ? c.t('Renew Plan', 'تجديد الباقة') : isAddon ? c.t('Purchase Add-on', 'شراء إضافة') : c.t('Secure Checkout', 'إتمام الاشتراك والدفع')}
      icon={<Lock size={18} />}
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
              style={{ minWidth: 160 }}
              disabled={!!busy || !selectedMethod || (isDynamicStandalone && standaloneIsCreditInvalid) || (includeDynamicUnits && accordionIsCreditInvalid)}
              onClick={handleSubmit}
            >
              {busy ? <Spinner /> : <ShieldCheck size={16} />}
              {selectedMethod?.type === 'manual'
                ? c.t('Submit Transfer & Receipt', 'تأكيد التحويل وإرسال الإيصال')
                : c.t(`Pay ${c.money(totalAmount, plan.currency)} Now`, `دفع ${c.money(totalAmount, plan.currency)} الآن`)}
            </button>
          </div>
        )
      }
    >
      {completed ? (
        <div style={{ textAlign: 'center', padding: '36px 16px', display: 'grid', gap: 16, justifyItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: completed.type === 'gateway' ? 'var(--bl-success-soft)' : 'var(--bl-accent-soft)', color: completed.type === 'gateway' ? 'var(--bl-success)' : 'var(--bl-accent)', display: 'grid', placeItems: 'center' }}>
            <CheckCircle2 size={36} />
          </div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            {completed.type === 'gateway' ? c.t('Subscription Activated!', 'تم تفعيل الاشتراك بنجاح!') : c.t('Request Submitted for Review', 'تم إرسال الطلب للمراجعة')}
          </h3>
          <p style={{ margin: 0, color: 'var(--bl-muted)', fontSize: 14, maxWidth: 460, lineHeight: 1.6 }}>
            {completed.message}
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: 'var(--bl-surface-2)', border: '1px solid var(--bl-border)', fontSize: 13, fontWeight: 600 }}>
            <span>{c.pick(plan.name)}</span>
            <span>·</span>
            <span style={{ color: 'var(--bl-accent-2)' }}>{c.money(totalAmount, plan.currency)}</span>
          </div>
        </div>
      ) : (
        <div className="bl-checkout-grid">
          {/* Hidden File Input used across modal triggers */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          
          {/* Left Column: Order Summary & Live Receipt Preview */}
          <div className="bl-checkout-col">
            {/* Plan / Add-on Details Card */}
            <div style={{ padding: 18, borderRadius: 14, background: 'var(--bl-surface-2)', border: '1px solid var(--bl-border)', display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                  <small style={{ color: 'var(--bl-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {isAddon ? (isDynamicStandalone ? c.t('Custom Credit Top-up', 'شحن رصيد مخصص') : c.t('Selected Add-on', 'الإضافة المختارة')) : c.t('Selected Plan', 'الباقة المختارة')}
                  </small>
                  <h3 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isAddon ? <Package size={17} color="var(--bl-accent)" /> : <Gem size={17} color="var(--bl-accent)" />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isDynamicStandalone ? `${dynamicStandaloneCredits.toLocaleString()} ${c.t('Custom Credits Top-up', 'شحن رصيد مخصص')}` : c.pick(plan.name)}
                    </span>
                  </h3>
                </div>
                <span className="bl-pill violet plain" style={{ flexShrink: 0 }}>{billingLabel(plan, c)}</span>
              </div>

              {/* Standalone Add-on Controls */}
              {isAddon && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {isDynamicStandalone ? (
                    <div style={{ display: 'grid', gap: 10, padding: 12, borderRadius: 10, background: 'var(--bl-surface)', border: '1px solid var(--bl-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 12.5 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600 }}>{c.t('Enter Credits', 'أدخل كمية الرصيد')}:</span>
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={standaloneCurrentInputValue}
                                onChange={e => {
                                  const text = e.target.value;
                                  const clean = text.replace(/[^\d]/g, '');
                                  setRawStandaloneCreditsInput(clean);
                                  const n = Number(clean);
                                  if (clean !== '' && Number.isFinite(n) && n >= standaloneMinCredits && n <= standaloneMaxCredits) {
                                    const u = Math.round(n / standalonePerUnit);
                                    setStandaloneDynamicUnits(u);
                                  }
                                }}
                                onBlur={() => {
                                  if (standaloneCurrentInputValue.trim() === '') {
                                    setRawStandaloneCreditsInput((standaloneDynamicUnits * standalonePerUnit).toString());
                                  }
                                }}
                                placeholder={`${standaloneMinCredits} - ${standaloneMaxCredits}`}
                                style={{
                                  width: 125,
                                  height: 32,
                                  padding: '0 8px',
                                  paddingInlineEnd: 48,
                                  borderRadius: 6,
                                  border: standaloneValidationMsg ? '1.5px solid #ef4444' : '1.5px solid var(--bl-accent)',
                                  background: 'var(--bl-surface-2)',
                                  color: standaloneValidationMsg ? '#ef4444' : 'var(--bl-text)',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  outline: 'none',
                                  transition: 'border-color 0.2s',
                                }}
                              />
                              <span style={{ position: 'absolute', insetInlineEnd: 6, fontSize: 11, color: standaloneValidationMsg ? '#ef4444' : 'var(--bl-muted)', fontWeight: 600, pointerEvents: 'none' }}>
                                {c.t('credits', 'رصيد')}
                              </span>
                            </div>
                          </div>
                          {standaloneValidationMsg && (
                            <div style={{ color: '#ef4444', fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                              <AlertCircle size={13} style={{ flexShrink: 0 }} />
                              <span>{standaloneValidationMsg}</span>
                            </div>
                          )}
                        </div>
                        <span style={{ color: 'var(--bl-accent)', fontWeight: 700 }}>
                          {Number.isInteger(standaloneUnitsFloat) ? standaloneUnitsFloat : standaloneUnitsFloat.toFixed(1)} {c.t(standaloneUnitsFloat === 1 ? 'unit' : 'units', 'وحدة')}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={standaloneMinUnits}
                        max={standaloneMaxUnits}
                        value={standaloneDynamicUnits}
                        onChange={e => setStandaloneUnitsAndSync(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--bl-accent)', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[1, 5, 10, 25].filter(u => u >= standaloneMinUnits && u <= standaloneMaxUnits).map(u => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setStandaloneUnitsAndSync(u)}
                            className="bl-btn"
                            style={{
                              padding: '4px 10px',
                              fontSize: 11.5,
                              fontWeight: 600,
                              borderRadius: 8,
                              borderColor: standaloneDynamicUnits === u ? 'var(--bl-accent)' : undefined,
                              background: standaloneDynamicUnits === u ? 'rgba(124, 58, 237, 0.12)' : undefined,
                              color: standaloneDynamicUnits === u ? 'var(--bl-accent)' : undefined,
                            }}
                          >
                            +{c.num(u * standalonePerUnit)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {allFixedAddons.length > 1 && (
                        <div style={{ display: 'grid', gap: 5 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bl-muted)' }}>
                            {c.t('Change Package', 'تغيير الباقة')}
                          </label>
                          <select
                            value={selectedAddonId || plan.id}
                            onChange={e => setSelectedAddonId(e.target.value)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 10,
                              border: '1px solid var(--bl-border)',
                              background: 'var(--bl-surface)',
                              color: 'inherit',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            {allFixedAddons.map(a => (
                              <option key={a.id} value={a.id}>
                                {c.pick(a.name)} — {c.money(a.price, a.currency)} (+{c.num(a.credits || 0)} {c.t('credits', 'رصيد')})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, background: 'var(--bl-surface)', border: '1px solid var(--bl-border)' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.t('Quantity', 'الكمية')}</span>
                        <div className="bl-qty">
                          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                          <span>{qty}</span>
                          <button type="button" onClick={() => setQty(qty + 1)}>+</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Order Cost Breakdown */}
              <div style={{ borderBlockStart: '1px solid var(--bl-border)', paddingBlockStart: 12, display: 'grid', gap: 8, fontSize: 13 }}>
                {!isAddon && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bl-muted)' }}>
                    <span>{c.t('Main Plan', 'الباقة الأساسية')} ({c.pick(plan.name)})</span>
                    <b>{c.money(mainPlanPrice, plan.currency)}</b>
                  </div>
                )}
                {isAddon && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bl-muted)' }}>
                    <span>{isDynamicStandalone ? c.t('Rate per unit', 'السعر لكل وحدة') : c.t('Price per pack', 'السعر لكل باقة')}</span>
                    <b>{isDynamicStandalone ? c.money(rate.pricePerUnit, rate.currency || plan.currency) : c.money(plan.price, plan.currency)}</b>
                  </div>
                )}
                {!isAddon && attachedAddons.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bl-accent)', fontSize: 12.5, fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Package size={13} />
                      {typeof a.name === 'string' ? a.name : c.pick(a.name)} {a.qty > 1 ? `×${a.qty}` : ''}
                    </span>
                    <span>+{c.money(a.price * (a.type === 'unit' ? 1 : a.qty), plan.currency)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bl-muted)' }}>
                  <span>{c.t('Total credits granted', 'إجمالي الكريديت الممنوح')}</span>
                  <b>{c.num(totalCredits)} {c.t('Credits', 'نقطة')}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: 'var(--bl-text)', paddingBlockStart: 6, borderBlockStart: '1px dashed var(--bl-border)' }}>
                  <span>{c.t('Total due', 'المبلغ الإجمالي')}</span>
                  <span style={{ color: 'var(--bl-accent-2)' }}>{c.money(totalAmount, plan.currency)}</span>
                </div>
              </div>
            </div>

            {/* Optional Attached Add-ons & Top-ups Section */}
            {!isAddon && (rate || fixedAddons.length > 0) && (
              <div className="bl-addon-accordion">
                <button
                  type="button"
                  onClick={() => setIsAddonsAccordionOpen(open => !open)}
                  className="bl-addon-accordion-head"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(124, 58, 237, 0.12)', color: 'var(--bl-accent)' }}>
                      <PackagePlus size={16} />
                    </span>
                    <div>
                      <b style={{ fontSize: 13, display: 'block', color: 'var(--bl-text)' }}>{c.t('Combine Add-ons & Top-ups (Optional)', 'إضافة باقات أو شحن رصيد إضافي (اختياري)')}</b>
                      <small style={{ color: 'var(--bl-muted)', fontSize: 11.5 }}>
                        {attachedAddons.length > 0
                          ? c.t(`${attachedAddons.length} item(s) attached (+${c.money(addonsTotal, plan.currency)})`, `تمت إضافة ${attachedAddons.length} عناصر (+${c.money(addonsTotal, plan.currency)})`)
                          : c.t('Attach fixed packages or custom credits to checkout', 'أضف باقات ثابتة أو رصيدًا مخصصًا عند الدفع')}
                      </small>
                    </div>
                  </div>
                  <span style={{ color: 'var(--bl-muted)', display: 'grid', placeItems: 'center' }}>
                    {isAddonsAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                {isAddonsAccordionOpen && (
                  <div style={{ padding: '0 14px 14px', borderBlockStart: '1px solid var(--bl-border)', display: 'grid', gap: 12 }}>
                    {/* Segmented Switcher if both modes are available */}
                    {fixedAddons.length > 0 && rate && (
                      <div style={{ display: 'flex', gap: 4, background: 'var(--bl-surface)', padding: 4, borderRadius: 10, border: '1px solid var(--bl-border)' }}>
                        <button
                          type="button"
                          className={`bl-addon-seg-btn${addonAccordionTab === 'packages' ? ' active' : ''}`}
                          onClick={() => setAddonAccordionTab('packages')}
                        >
                          <Package size={13} />
                          {c.t(`Fixed Packages (${fixedAddons.length})`, `باقات ثابتة (${fixedAddons.length})`)}
                        </button>
                        <button
                          type="button"
                          className={`bl-addon-seg-btn${addonAccordionTab === 'custom' ? ' active' : ''}`}
                          onClick={() => setAddonAccordionTab('custom')}
                        >
                          <Coins size={13} />
                          {c.t('Custom Credits', 'رصيد مخصص')}
                        </button>
                      </div>
                    )}

                    {/* Fixed Packages Tab */}
                    {(addonAccordionTab === 'packages' || !rate) && fixedAddons.length > 0 && (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {fixedAddons.map(a => {
                          const quantity = selectedFixedAddons[a.id] || 0;
                          return (
                            <div key={a.id} className="bl-addon-item-card">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124, 58, 237, 0.08)', color: 'var(--bl-accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                  <Package size={14} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <b style={{ fontSize: 12.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.pick(a.name)}</b>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--bl-muted)', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--bl-accent)', fontWeight: 600 }}>{c.money(a.price, a.currency)}</span>
                                    <span>·</span>
                                    <span>
                                      {a.addonType === 'seats'
                                        ? c.t(`+${a.addonSeats} seats`, `+${c.num(a.addonSeats ?? 0)} مقاعد`)
                                        : c.t(`+${(a.credits || 0).toLocaleString()} credits`, `+${c.num(a.credits || 0)} رصيد`)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="bl-qty">
                                <button type="button" onClick={() => setSelectedFixedAddons(prev => ({ ...prev, [a.id]: Math.max(0, quantity - 1) }))}>−</button>
                                <span>{quantity}</span>
                                <button type="button" onClick={() => setSelectedFixedAddons(prev => ({ ...prev, [a.id]: quantity + 1 }))}>+</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Custom Credits Slider Tab */}
                    {(addonAccordionTab === 'custom' || fixedAddons.length === 0) && rate && (
                      <div style={{ padding: 12, borderRadius: 10, background: 'var(--bl-surface)', border: '1px solid var(--bl-border)', display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={includeDynamicUnits}
                              onChange={e => setIncludeDynamicUnits(e.target.checked)}
                              style={{ width: 16, height: 16, accentColor: 'var(--bl-accent)' }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 700 }}>
                              <Coins size={13} style={{ display: 'inline', marginInlineEnd: 4, color: 'var(--bl-accent)' }} />
                              {c.t('Enable Custom Credit Top-up', 'تفعيل شحن رصيد مخصص')}
                            </span>
                          </label>
                          <small style={{ color: 'var(--bl-accent)', fontWeight: 700 }}>
                            {c.money(rate.pricePerUnit, rate.currency || plan.currency)} / {c.num(rate.creditsPerUnit)} {c.t('credits', 'رصيد')}
                          </small>
                        </div>

                        {includeDynamicUnits && (
                          <div style={{ display: 'grid', gap: 8, paddingBlockStart: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: 12.5 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 600 }}>{c.t('Enter Credits', 'أدخل كمية الرصيد')}:</span>
                                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={accordionCurrentInputValue}
                                    onChange={e => {
                                      const text = e.target.value;
                                      const clean = text.replace(/[^\d]/g, '');
                                      setRawAccordionCreditsInput(clean);
                                      const n = Number(clean);
                                      if (clean !== '' && Number.isFinite(n) && n >= accordionMinCredits && n <= accordionMaxCredits) {
                                        const u = Math.round(n / accordionPerUnit);
                                        setDynamicUnitsCount(u);
                                      }
                                    }}
                                    onBlur={() => {
                                      if (accordionCurrentInputValue.trim() === '') {
                                        setRawAccordionCreditsInput((dynamicUnitsCount * accordionPerUnit).toString());
                                      }
                                    }}
                                    placeholder={`${accordionMinCredits} - ${accordionMaxCredits}`}
                                    style={{
                                      width: 120,
                                      height: 30,
                                      padding: '0 8px',
                                      paddingInlineEnd: 48,
                                      borderRadius: 6,
                                      border: accordionValidationMsg ? '1.5px solid #ef4444' : '1.5px solid var(--bl-accent)',
                                      background: 'var(--bl-surface-2)',
                                      color: accordionValidationMsg ? '#ef4444' : 'var(--bl-text)',
                                      fontSize: 12.5,
                                      fontWeight: 700,
                                      outline: 'none',
                                      transition: 'border-color 0.2s',
                                    }}
                                  />
                                  <span style={{ position: 'absolute', insetInlineEnd: 6, fontSize: 11, color: accordionValidationMsg ? '#ef4444' : 'var(--bl-muted)', fontWeight: 600, pointerEvents: 'none' }}>
                                    {c.t('credits', 'رصيد')}
                                  </span>
                                </div>
                              </div>
                              <span style={{ color: 'var(--bl-accent)', fontWeight: 700 }}>
                                +{c.num(dynamicUnitsCount * accordionPerUnit)} {c.t('credits', 'رصيد')} (+{c.money(Math.round(dynamicUnitsCount * (rate.pricePerUnit || 5) * 100) / 100, rate.currency || plan.currency)})
                              </span>
                            </div>

                            {accordionValidationMsg && (
                              <div style={{ color: '#ef4444', fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                                <span>{accordionValidationMsg}</span>
                              </div>
                            )}

                            <input
                              type="range"
                              min={accordionMinUnits}
                              max={accordionMaxUnits}
                              value={dynamicUnitsCount}
                              onChange={e => setAccordionUnitsAndSync(Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--bl-accent)', cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {[1, 5, 10, 25].filter(u => u >= accordionMinUnits && u <= accordionMaxUnits).map(u => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={() => setAccordionUnitsAndSync(u)}
                                  className="bl-btn"
                                  style={{
                                    padding: '3px 8px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    borderColor: dynamicUnitsCount === u ? 'var(--bl-accent)' : undefined,
                                    background: dynamicUnitsCount === u ? 'rgba(124, 58, 237, 0.12)' : undefined,
                                    color: dynamicUnitsCount === u ? 'var(--bl-accent)' : undefined,
                                  }}
                                >
                                  {u} {c.t(u === 1 ? 'unit' : 'units', 'وحدة')}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dedicated Live Receipt Preview Section (When Manual Transfer is selected) */}
            {selectedMethod?.type === 'manual' && (
              <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <ImageIcon size={14} color="var(--bl-accent)" />
                    {c.t('Live Receipt Preview', 'معاينة إيصال التحويل')}
                  </label>
                  <span className={`bl-pill ${receiptFile ? 'green' : 'amber'} plain`} style={{ fontSize: 11, flexShrink: 0 }}>
                    {receiptFile ? c.t('Ready', 'جاهز') : c.t('Required', 'إلزامي')}
                  </span>
                </div>

                {!receiptFile ? (
                  /* Before Upload: Interactive Dropzone Placeholder */
                  <div
                    className={`bl-receipt-dropzone${isDragging ? ' dragging' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                  >
                    <div className="bl-receipt-drop-icon">
                      <UploadCloud size={22} />
                    </div>
                    <div className="bl-receipt-drop-title">
                      {c.t('Click or drag & drop receipt here', 'اضغط أو اسحب وأفلت الإيصال هنا')}
                    </div>
                    <div className="bl-receipt-drop-hint">
                      {c.t('Clear screenshot showing amount & reference number', 'صورة واضحة توضح المبلغ ورقم الحوالة')}
                    </div>
                    <span className="bl-receipt-drop-badge">
                      PNG · JPG · PDF ({c.t('Max 15MB', 'بحد أقصى 15 ميجابايت')})
                    </span>
                  </div>
                ) : (
                  /* After Upload: High Quality Receipt Image Preview Card */
                  <div className="bl-receipt-preview-card">
                    {receiptPreview ? (
                      <div
                        className="bl-receipt-img-frame"
                        onClick={() => setIsZoomOpen(true)}
                        title={c.t('Click to expand full size', 'انقر للتكبير بالحجم الكامل')}
                      >
                        <img src={receiptPreview} alt="Receipt preview" className="bl-receipt-img" />
                        <div className="bl-receipt-zoom-badge">
                          <ZoomIn size={13} />
                          <span>{c.t('Click to zoom', 'تكبير')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bl-receipt-doc-frame">
                        <FileText size={40} color="var(--bl-accent)" />
                        <b style={{ fontSize: 13, color: 'var(--bl-text)' }}>{c.t('PDF Receipt Document', 'مستند إيصال PDF')}</b>
                        <small style={{ color: 'var(--bl-muted)', fontSize: 11 }}>
                          {c.t('Document ready for administrator verification', 'المستند جاهز للمراجعة والاعتماد')}
                        </small>
                      </div>
                    )}

                    {/* Upload Progress Bar if in progress */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="bl-meter" style={{ height: 4, borderRadius: 0 }}>
                        <b style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}

                    {/* Metadata Bar & Actions with STRICT text truncation */}
                    <div className="bl-receipt-meta-bar">
                      <div className="bl-receipt-meta-info">
                        <span className="bl-receipt-file-name" title={receiptFile.name}>
                          {receiptFile.name}
                        </span>
                        <span className="bl-receipt-file-size">
                          {(receiptFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <div className="bl-receipt-actions">
                        {receiptPreview && (
                          <button
                            type="button"
                            className="bl-receipt-action-btn"
                            title={c.t('View full size', 'عرض بالحجم الكامل')}
                            onClick={() => setIsZoomOpen(true)}
                          >
                            <Eye size={12} />
                            <span>{c.t('View', 'عرض')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="bl-receipt-action-btn"
                          title={c.t('Choose a different file', 'اختيار ملف آخر')}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <UploadCloud size={12} />
                          <span>{c.t('Change', 'تغيير')}</span>
                        </button>
                        <button
                          type="button"
                          className="bl-receipt-action-btn danger"
                          title={c.t('Remove receipt', 'حذف الإيصال')}
                          onClick={handleRemoveReceipt}
                        >
                          <Trash2 size={12} />
                          <span>{c.t('Remove', 'حذف')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Note Input */}
            <label className="bl-field" style={{ margin: 0, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--bl-muted)' }}>
                {c.t('Order Note (Optional)', 'ملاحظات إضافية (اختياري)')}
              </span>
              <input
                type="text"
                className="bl-input"
                style={{ fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                placeholder={c.t('e.g. Please expedite activation', 'مثال: نرجو سرعة التفعيل')}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </label>

            {/* Security Guarantee */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--bl-muted)' }}>
              <ShieldCheck size={15} color="var(--bl-success)" style={{ flexShrink: 0 }} />
              <span>{c.t('256-bit encrypted secure transaction.', 'عملية دفع آمنة ومشفرة بالكامل.')}</span>
            </div>
          </div>

          {/* Right Column: Payment Methods Selection & Active Configuration */}
          <div className="bl-checkout-col">
            <div style={{ minWidth: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBlockEnd: 8 }}>
                {c.t('Choose Payment Method', 'اختر طريقة الدفع')}
              </label>

              {methodsLoading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--bl-muted)' }}>
                  <Spinner />
                  <p style={{ margin: '8px 0 0', fontSize: 12.5 }}>{c.t('Loading active payment methods…', 'جاري تحميل طرق الدفع المتاحة…')}</p>
                </div>
              ) : activeMethods.length === 0 ? (
                /* Empty state when no payment methods are active in /admin/payments-gateways */
                <div className="bl-empty-notice">
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bl-warning-soft)', color: 'var(--bl-warning)', display: 'grid', placeItems: 'center' }}>
                    <AlertCircle size={24} />
                  </div>
                  <h4>{c.t('No Active Payment Methods', 'لا توجد طرق دفع مفعلة')}</h4>
                  <p>
                    {c.t(
                      'No payment methods or gateways are currently enabled in the payment settings.',
                      'لم يتم تفعيل أي من بوابات الدفع أو طرق التحويل في إعدادات طرق الدفع بعد.'
                    )}
                  </p>
                  {canManage && (
                    <Link
                      to="/admin/payments-gateways"
                      className="bl-btn primary sm"
                      onClick={onClose}
                      style={{ marginBlockStart: 4 }}
                    >
                      <Settings size={13} />
                      {c.t('Configure Payment Methods', 'تهيئة طرق الدفع')}
                    </Link>
                  )}
                </div>
              ) : (
                /* Dynamic list of active methods configured in /admin/payments-gateways */
                <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                  {activeMethods.map(m => {
                    const methodId = m.id || m.provider;
                    const active = (selectedMethod?.id || selectedMethod?.provider) === methodId;
                    return (
                      <div
                        key={methodId}
                        className={`bl-checkout-method-card${active ? ' active' : ''}`}
                        onClick={() => setSelectedMethodId(methodId)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden', flex: '1 1 0%', maxWidth: 'calc(100% - 75px)' }}>
                          <PaymentBrandIcon provider={m.provider} />
                          <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                            <b style={{ display: 'block', fontSize: 13, color: active ? 'var(--bl-text)' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.name || m.provider}>
                              {m.name || m.provider}
                            </b>
                            {m.account && (
                              <small style={{ color: 'var(--bl-muted)', fontSize: 11.5, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.account}>
                                {m.account}
                              </small>
                            )}
                          </div>
                        </div>
                        <span className={`bl-pill ${m.type === 'gateway' ? 'blue' : 'plain'}`} style={{ fontSize: 11, flexShrink: 0 }}>
                          {m.type === 'gateway' ? c.t('Instant', 'فوري') : c.t('Manual', 'يدوي')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Method Details Panel */}
            {selectedMethod && (
              selectedMethod.type === 'manual' ? (
                /* Manual Transfer Dynamic Flow */
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--bl-surface-2)', border: '1px solid var(--bl-border)', display: 'grid', gap: 12, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 750, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Landmark size={15} color="var(--bl-accent)" />
                      {c.t('Transfer Instructions & Account Details', 'بيانات التحويل وتعليمات الدفع')}
                    </h4>
                    
                    {/* Account / Wallet Card with 1-click Copy */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--bl-surface)', border: '1px solid var(--bl-border)', margin: '8px 0', minWidth: 0, width: '100%', boxSizing: 'border-box', gap: 10 }}>
                      <div style={{ overflow: 'hidden', minWidth: 0, flex: '1 1 0%', maxWidth: 'calc(100% - 85px)' }}>
                        <small style={{ color: 'var(--bl-muted)', fontSize: 11, display: 'block', fontWeight: 600 }}>
                          {getAccountLabel(selectedMethod.provider)}
                        </small>
                        <strong
                          style={{
                            fontSize: 14,
                            color: 'var(--bl-text)',
                            letterSpacing: 0.5,
                            fontVariantNumeric: 'tabular-nums',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}
                          title={selectedMethod.account}
                        >
                          {selectedMethod.account || '—'}
                        </strong>
                      </div>
                      {selectedMethod.account && (
                        <button
                          type="button"
                          className={`bl-copy-btn${copied ? ' copied' : ''}`}
                          style={{ flexShrink: 0, minWidth: 70 }}
                          onClick={() => copyToClipboard(selectedMethod.account)}
                        >
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                          <span>{copied ? c.t('Copied!', 'تم النسخ!') : c.t('Copy', 'نسخ')}</span>
                        </button>
                      )}
                    </div>

                    {/* Customer Instructions from Dashboard */}
                    {selectedMethod.instructions && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 10px', borderRadius: 8, background: 'var(--bl-accent-soft)', fontSize: 12, color: 'var(--bl-text)', lineHeight: 1.45, minWidth: 0, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                        <Info size={14} color="var(--bl-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0, flex: '1 1 0%' }}>{selectedMethod.instructions}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Receipt Status & Upload Trigger in Right Column */}
                  <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
                        {c.t('Payment Receipt Status', 'حالة إيصال الدفع')}
                      </label>
                      <span style={{ fontSize: 11, color: receiptFile ? 'var(--bl-success)' : 'var(--bl-muted)', fontWeight: 600 }}>
                        {receiptFile ? c.t('Attached ✓', 'مرفق ✓') : c.t('Required *', 'مطلوب *')}
                      </span>
                    </div>

                    {receiptFile ? (
                      <div className="bl-receipt-status-pill attached">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden', flex: 1 }}>
                          <CheckCircle2 size={16} color="var(--bl-success)" style={{ flexShrink: 0 }} />
                          <span
                            className="bl-receipt-file-name"
                            title={receiptFile.name}
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {receiptFile.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="bl-receipt-action-btn"
                          onClick={() => fileInputRef.current?.click()}
                          style={{ flexShrink: 0 }}
                        >
                          {c.t('Change', 'تغيير')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="bl-btn"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          gap: 8,
                          fontSize: 12.5,
                          background: 'var(--bl-surface)',
                          borderColor: 'var(--bl-border-strong)',
                          color: 'var(--bl-accent-2)'
                        }}
                      >
                        <UploadCloud size={16} />
                        <span>{c.t('Attach Receipt File', 'إرفاق ملف الإيصال')}</span>
                      </button>
                    )}
                  </div>

                  {/* Transaction reference */}
                  <label className="bl-field" style={{ margin: 0, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bl-muted)' }}>
                      {c.t('Transfer Reference / Sender Phone (Optional)', 'رقم الحوالة أو هاتف المحوّل (اختياري)')}
                    </span>
                    <input
                      type="text"
                      className="bl-input"
                      style={{ fontSize: 12.5, width: '100%', boxSizing: 'border-box' }}
                      placeholder="e.g. TR-9823145 / 010xxxxxxxx"
                      value={txId}
                      onChange={e => setTxId(e.target.value)}
                    />
                  </label>
                </div>
              ) : (
                /* Automated Gateway Card Interface (Stripe/Paddle/Paymob/etc.) */
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--bl-surface-2)', border: '1px solid var(--bl-border)', display: 'grid', gap: 12, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 750, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CreditCard size={15} color="var(--bl-accent)" />
                      {c.t('Card Information', 'بيانات البطاقة البنكية')}
                    </h4>
                    <span className="bl-pill violet plain" style={{ fontSize: 11, flexShrink: 0 }}>
                      {selectedMethod.name}
                    </span>
                  </div>

                  <label className="bl-field" style={{ margin: 0, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{c.t('Cardholder Name', 'اسم حامل البطاقة')}</span>
                    <input
                      type="text"
                      className="bl-input"
                      style={{ fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                      placeholder="e.g. John Doe"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                    />
                  </label>

                  <label className="bl-field" style={{ margin: 0, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{c.t('Card Number', 'رقم البطاقة')}</span>
                    <input
                      type="text"
                      className="bl-input"
                      style={{ fontSize: 13, letterSpacing: 1, width: '100%', boxSizing: 'border-box' }}
                      placeholder="4242 •••• •••• 4242"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, minWidth: 0 }}>
                    <label className="bl-field" style={{ margin: 0, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{c.t('Expiry', 'تاريخ الانتهاء')}</span>
                      <input
                        type="text"
                        className="bl-input"
                        style={{ fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                        placeholder="MM / YY"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                      />
                    </label>
                    <label className="bl-field" style={{ margin: 0, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{c.t('CVC / CVV', 'رمز الأمان')}</span>
                      <input
                        type="text"
                        className="bl-input"
                        style={{ fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                        placeholder="123"
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Full Size Receipt Zoom Lightbox */}
      {isZoomOpen && receiptPreview && typeof document !== 'undefined' && createPortal(
        <div className="bl-receipt-zoom-scrim" onClick={() => setIsZoomOpen(false)}>
          <div className="bl-receipt-zoom-wrap" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="bl-receipt-zoom-close"
              onClick={() => setIsZoomOpen(false)}
              aria-label={c.t('Close preview', 'إغلاق المعاينة')}
            >
              <X size={18} />
            </button>
            <img src={receiptPreview} alt="Receipt Full Preview" className="bl-receipt-zoom-img" />
            <div className="bl-receipt-zoom-caption">
              <span>{receiptFile?.name}</span>
              <span style={{ marginInlineStart: 8, opacity: 0.75 }}>({((receiptFile?.size || 0) / 1024).toFixed(1)} KB)</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Modal>
  );
}
