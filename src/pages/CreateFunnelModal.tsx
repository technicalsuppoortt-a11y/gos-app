import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { Users, ShoppingCart, Wand2, Sparkles, LoaderCircle } from 'lucide-react';
import { Modal } from './settings/kit';
import { AssetSelect } from './AssetControls';
import { AIFunnelArchitectModal } from './AIFunnelArchitectModal';
import { db } from '../backend/firebase';
import { SITE_DOMAINS, mapFirestoreDomainToModel, normalizeHost } from '../backend/siteDomains';
import { useCurrency } from '../context/CurrencyContext';
import { SUPPORTED_CURRENCIES, isCurrencyCode, type CurrencyCode } from '../utils/currency';
import { useUILanguage, translateText } from '../i18n/display';
import { createSystemeFunnelAsset, type FunnelGoalType } from './funnel-systeme-model';
import type { Asset, Domain } from './asset-model';
import { readWorkspace } from './asset-model';
import type { RootState } from '../store';
import './funnel-systeme.css';

const CURRENCY_AR_NAMES: Record<string, string> = {
  USD: 'الدولار الأمريكي (USD)',
  EUR: 'اليورو (EUR)',
  EGP: 'الجنيه المصري (EGP)',
  GBP: 'الجنيه الإسترليني (GBP)',
  AED: 'الدرهم الإماراتي (AED)',
  SAR: 'الريال السعودي (SAR)',
  KWD: 'الدينار الكويتي (KWD)',
  QAR: 'الريال القطري (QAR)',
  BHD: 'الدينار البحريني (BHD)',
  OMR: 'الريال العماني (OMR)',
  JOD: 'الدينار الأردني (JOD)',
  LBP: 'الليرة اللبنانية (LBP)',
  MAD: 'الدرهم المغربي (MAD)',
  TND: 'الدينار التونسي (TND)',
  DZD: 'الدينار الجزائري (DZD)',
  IQD: 'الدينار العراقي (IQD)',
};

export function CreateFunnelModal({
  domains: propDomains,
  close,
  onCreate,
}: {
  domains?: Domain[];
  close: () => void;
  onCreate: (asset: Asset, openWorkspace?: boolean) => void | Promise<unknown>;
}) {
  const lang = useUILanguage();
  const ar = lang.startsWith('ar');
  const tenant = useSelector((s: RootState) => s.auth.tenant);
  const { currency: contextCurrency } = useCurrency();

  const [name, setName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('__default__');
  const [currency, setCurrency] = useState<CurrencyCode>(
    isCurrencyCode(contextCurrency) ? contextCurrency : 'EUR'
  );
  const [goalType, setGoalType] = useState<FunnelGoalType>('audience');
  const [showAiFlow, setShowAiFlow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [liveDomains, setLiveDomains] = useState<Domain[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, SITE_DOMAINS),
      snap => {
        const list: Domain[] = [];
        snap.forEach(d => list.push(mapFirestoreDomainToModel(d.id, d.data())));
        setLiveDomains(list);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const defaultSubdomain = useMemo(() => {
    const raw = (tenant?.name || tenant?.id || 'workspace')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24);
    return `${raw || 'workspace'}.upklick.app`;
  }, [tenant?.id, tenant?.name]);

  const domainOptions = useMemo(() => {
    const base = propDomains ?? readWorkspace().domains ?? [];
    const merged = new Map<string, Domain>();
    for (const d of base) {
      if (d?.name) merged.set(normalizeHost(d.name), d);
    }
    for (const ld of liveDomains) {
      if (ld?.name) {
        const host = normalizeHost(ld.name);
        merged.set(host, { ...merged.get(host), ...ld });
      }
    }
    const connected = Array.from(merged.values()).filter(d => d.status === 'Connected');
    return [
      { value: '__default__', label: defaultSubdomain, preserveLabel: true },
      ...connected.map(d => ({ value: d.name, label: d.name, preserveLabel: true })),
    ];
  }, [propDomains, liveDomains, defaultSubdomain]);

  const currencySelectOptions = useMemo(
    () =>
      SUPPORTED_CURRENCIES.map(item => ({
        value: item.code,
        label: ar
          ? CURRENCY_AR_NAMES[item.code] || `${item.code} (${item.name})`
          : item.symbol === item.code
            ? `${item.code} (${item.name})`
            : `${item.symbol} · ${item.code} (${item.name})`,
        preserveLabel: true,
      })),
    [ar]
  );

  if (showAiFlow) {
    return (
      <AIFunnelArchitectModal
        initialName={name.trim()}
        domain={selectedDomain === '__default__' ? '' : selectedDomain}
        currency={currency}
        onBack={() => setShowAiFlow(false)}
        close={close}
        onCreate={async aiAsset => {
          const enriched: Asset = {
            ...aiAsset,
            name: name.trim() || aiAsset.name,
            domain: selectedDomain === '__default__' ? '' : selectedDomain,
            currency,
            document: {
              ...aiAsset.document,
              funnel: {
                ...aiAsset.document.funnel,
                name: name.trim() || aiAsset.document.funnel.name,
                goalType: 'ai',
                currency,
                funnelActive: true,
              },
            },
          };
          await onCreate(enriched, true);
        }}
      />
    );
  }

  const goalCards: {
    id: FunnelGoalType;
    title: string;
    desc: string;
    icon: typeof Users;
    stepsHint: string;
  }[] = [
    {
      id: 'audience',
      title: ar ? 'بناء جمهور' : translateText('Build an Audience'),
      desc: ar
        ? 'جمع عناوين البريد الإلكتروني وبناء قائمة البريد الإلكتروني الخاصة بك'
        : translateText('Collect email addresses and build your email list'),
      icon: Users,
      stepsHint: ar ? 'صفحة الاشتراك + صفحة الشكر' : 'Opt-in Page + Thank You Page',
    },
    {
      id: 'sell',
      title: ar ? 'بيع' : translateText('Sell'),
      desc: ar ? 'بيع منتج أو خدمة' : translateText('Sell a product or service'),
      icon: ShoppingCart,
      stepsHint: ar ? 'نموذج الطلب + صفحة الشكر' : 'Order Form + Thank You Page',
    },
    {
      id: 'custom',
      title: ar ? 'مخصص' : translateText('Custom'),
      desc: ar
        ? 'قم ببناء مسار مخصص من الصفر'
        : translateText('Build a custom funnel from scratch'),
      icon: Wand2,
      stepsHint: ar ? 'مساحة عمل فارغة لإضافة الخطوات يدوياً' : 'Empty workspace · add steps manually',
    },
    {
      id: 'ai',
      title: ar ? 'الإنشاء بالذكاء الاصطناعي' : translateText('Create With AI'),
      desc: ar
        ? 'إنشاء مسار تحويل متكامل ومخصص بالذكاء الاصطناعي لمشروعك'
        : translateText('Generate a personalized funnel layout from your business brief'),
      icon: Sparkles,
      stepsHint: ar ? 'توليد ذكي للخطوات والمحتوى' : 'AI-generated steps & copy',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (goalType === 'ai') {
      setShowAiFlow(true);
      return;
    }
    const cleanName = name.trim();
    if (!cleanName) {
      setError(ar ? 'يرجى إدخال اسم المسار للمتابعة.' : translateText('Enter a funnel name to continue.'));
      return;
    }
    setError('');
    setSaving(true);
    try {
      const domainVal = selectedDomain === '__default__' ? '' : selectedDomain;
      const created = createSystemeFunnelAsset({
        name: cleanName,
        domain: domainVal,
        currency,
        goalType,
        arabic: ar,
      });
      await onCreate(created, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : translateText('Could not create funnel.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={ar ? 'إنشاء مسار' : translateText('Create Funnel')} close={close}>
      <form className="sys-create-modal" onSubmit={handleSubmit} dir={ar ? 'rtl' : 'ltr'}>
        <div className="sys-create-top-grid">
          <label className="sys-field">
            <span>
              {ar ? 'الاسم' : translateText('Funnel name')} <em className="sys-req">*</em>
            </span>
            <input
              autoFocus
              aria-label={translateText('Funnel name')}
              maxLength={100}
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder={ar ? 'الاسم' : translateText('Enter funnel name')}
            />
          </label>

          <label className="sys-field">
            <span>
              {ar ? 'دومين المسار' : translateText('Funnel domain')} <em className="sys-req">*</em>
            </span>
            <AssetSelect
              label="Funnel domain"
              value={selectedDomain}
              options={domainOptions}
              onChange={setSelectedDomain}
            />
          </label>
        </div>

        <div
          className="sys-goal-grid"
          role="radiogroup"
          aria-label={ar ? 'اختر هدف المسار' : translateText('Choose funnel goal')}
        >
          {goalCards.map(card => {
            const Icon = card.icon;
            const active = goalType === card.id;
            return (
              <button
                key={card.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-goal-id={card.id}
                className={`sys-goal-card ${active ? 'active' : ''} ${card.id === 'ai' ? 'is-ai' : ''}`}
                onClick={() => {
                  setGoalType(card.id);
                  if (card.id === 'ai') setError('');
                }}
              >
                <span className="sys-goal-icon">
                  <Icon size={20} />
                </span>
                <strong className="sys-goal-title">{card.title}</strong>
                <span className="sys-goal-desc">{card.desc}</span>
                <small className="sys-goal-hint">{card.stepsHint}</small>
              </button>
            );
          })}
        </div>

        <label className="sys-field sys-currency-field">
          <span>
            {ar ? 'العملة' : translateText('Currency')} <em className="sys-req">*</em>
          </span>
          <AssetSelect
            label="Currency"
            value={currency}
            options={currencySelectOptions}
            onChange={val => {
              if (isCurrencyCode(val)) setCurrency(val);
            }}
          />
        </label>

        {error && (
          <p className="aw-error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}

        <footer className="sys-create-footer">
          <button type="button" className="aw-secondary" onClick={close} disabled={saving}>
            {ar ? 'إلغاء' : translateText('Cancel')}
          </button>
          <button type="submit" className="aw-primary sys-save-btn" disabled={saving} aria-busy={saving}>
            {saving ? (
              <>
                <LoaderCircle size={14} className="animate-spin" />
                {ar ? 'جارٍ الإنشاء...' : translateText('Creating...')}
              </>
            ) : goalType === 'ai' ? (
              <>
                <Sparkles size={14} />
                {ar ? 'حفظ' : translateText('Save')}
              </>
            ) : (
              ar ? 'إنشاء' : translateText('Save')
            )}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
