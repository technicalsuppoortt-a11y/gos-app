import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  Check,
  Globe2,
  LoaderCircle,
  ShoppingCart,
  Sparkles,
  Users,
  WandSparkles,
} from 'lucide-react';
import { Modal } from './settings/kit';
import {
  generateAIFunnelAsset,
  type AIFunnelBrief,
  type AIFunnelGenerationPhase,
  type AIFunnelGoal,
  type AIFunnelTone,
} from '../backend/aiFunnelArchitect';
import { backendError } from '../backend/firebase';
import { toWesternDigits, type CurrencyCode } from '../utils/currency';
import { useUILanguage } from '../i18n/display';
import type { Asset } from './asset-model';
import './funnel-systeme.css';

const ACCENT_SWATCHES = [
  { id: 'indigo', color: '#4F46E5', labelEn: 'SaaS Indigo', labelAr: 'نيلي احترافي' },
  { id: 'violet', color: '#7C3AED', labelEn: 'Upklick Violet', labelAr: 'بنفسجي حديث' },
  { id: 'emerald', color: '#059669', labelEn: 'Growth Emerald', labelAr: 'زمردي للنمو' },
  { id: 'ocean', color: '#0284C7', labelEn: 'Executive Blue', labelAr: 'أزرق تنفيذي' },
  { id: 'rose', color: '#E11D48', labelEn: 'Bold Crimson', labelAr: 'قرمزي جريء' },
];

const QUICK_NICHES: { en: string; ar: string }[] = [
  { en: 'SaaS & B2B Software', ar: 'البرمجيات وخدمات SaaS' },
  { en: 'Online Course & Coaching', ar: 'الدورات التدريبية والاستشارات' },
  { en: 'Marketing & Growth Agency', ar: 'وكالة تسويق ونمو رقمي' },
  { en: 'Clinic & Healthcare', ar: 'العيادات والرعاية الصحية' },
  { en: 'Real Estate & Property', ar: 'العقارات والاستثمار العقاري' },
  { en: 'E-Commerce & Digital Products', ar: 'التجارة الإلكترونية والمنتجات الرقمية' },
];

export function AIFunnelArchitectModal({
  initialName = '',
  domain = '',
  currency = 'USD',
  onBack,
  close,
  onCreate,
}: {
  initialName?: string;
  domain?: string;
  currency?: CurrencyCode;
  onBack?: () => void;
  close: () => void;
  onCreate: (asset: Asset, openWorkspace?: boolean) => void | Promise<unknown>;
}) {
  const uiLang = useUILanguage();
  const ar = uiLang.startsWith('ar');
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  const [businessName, setBusinessName] = useState(initialName);
  const [niche, setNiche] = useState('');
  const [goal, setGoal] = useState<AIFunnelGoal>('sale');
  const [audienceAndPainPoints, setAudienceAndPainPoints] = useState('');
  const [offer, setOffer] = useState('');
  const [price, setPrice] = useState('');
  const [outputLanguage, setOutputLanguage] = useState<'en' | 'ar'>(ar ? 'ar' : 'en');
  const [tone, setTone] = useState<AIFunnelTone>('persuasive');
  const [accentColor, setAccentColor] = useState('#4F46E5');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<AIFunnelGenerationPhase>('analyzing');
  const lock = useRef(false);

  const goalOptions: {
    id: AIFunnelGoal;
    title: string;
    desc: string;
    blueprint: string;
    icon: typeof Users;
  }[] = [
    {
      id: 'audience',
      title: t('Lead Generation / Audience', 'بناء الجمهور وجذب العملاء المحتملين'),
      desc: t(
        'Capture qualified emails & WhatsApp leads with a free lead magnet.',
        'اجمع بيانات العملاء المهتمين عبر عرض مجاني عالي القيمة.'
      ),
      blueprint: t('Opt-in Squeeze Page → Thank You Page', 'صفحة الاشتراك ← صفحة الشكر والتسليم'),
      icon: Users,
    },
    {
      id: 'sale',
      title: t('Direct Product / Course Sale', 'بيع مباشر لمنتج أو كورس'),
      desc: t(
        'Convert visitors into paying buyers with offer stack & secure checkout.',
        'حوّل الزوار إلى مشترين عبر صفحة عرض مقنعة ونموذج طلب آمن.'
      ),
      blueprint: t(
        'Sales Page → Order Form → Thank You Page',
        'صفحة المبيعات ← نموذج الطلب ← صفحة الشكر'
      ),
      icon: ShoppingCart,
    },
    {
      id: 'booking',
      title: t('Consultation / Booking', 'حجز استشارة أو مكالمة مبيعات'),
      desc: t(
        'Pre-qualify high-intent prospects and book 1-on-1 strategy calls.',
        'أهّل العملاء المحتملين واحجز مواعيد استشارية مباشرة في تقويمك.'
      ),
      blueprint: t(
        'Strategy Offer → Booking & Intake → Confirmation',
        'صفحة الاستشارة ← الحجز والتأهيل ← تأكيد الموعد'
      ),
      icon: CalendarDays,
    },
  ];

  const toneOptions: { id: AIFunnelTone; label: string; hint: string }[] = [
    {
      id: 'persuasive',
      label: t('Persuasive & High-Converting', 'إقناعي وعالي التحويل'),
      hint: t('Clear ROI, social proof & strong CTAs', 'تركيز على العائد والإثبات الاجتماعي'),
    },
    {
      id: 'executive',
      label: t('Executive & Authoritative', 'احترافي وتنفيذي'),
      hint: t('Trusted B2B & premium consulting tone', 'مثالي للشركات والخدمات الراقية'),
    },
    {
      id: 'friendly',
      label: t('Warm & Consultative', 'ودود واستشاري'),
      hint: t('Empathetic coaching & creator style', 'قريب من الجمهور ومناسب للمدربين'),
    },
    {
      id: 'urgent',
      label: t('Urgent & Action-Driven', 'حماسي ومحدود الوقت'),
      hint: t('Scarcity, launch timers & fast action', 'مناسب للعروض المحدودة والإطلاقات'),
    },
  ];

  const phaseLabel =
    phase === 'analyzing'
      ? t(
          'Analyzing your target audience, offer & conversion architecture…',
          'جارٍ تحليل الجمهور المستهدف والعرض وهندسة خطوات المسار…'
        )
      : phase === 'generating'
        ? t(
            'Writing tailored headlines, benefits, social proof, form fields & CTAs…',
            'جارٍ صياغة العناوين والمزايا والشهادات وحقول النماذج وأزرار التحويل…'
          )
        : t(
            'Linking multi-step funnel pages & saving to Firebase Firestore…',
            'جارٍ ربط خطوات المسار وحفظه مباشرة في قاعدة البيانات…'
          );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current || busy) return;

    const cleanBiz = businessName.trim();
    const cleanNiche = niche.trim();
    const cleanAudience = audienceAndPainPoints.trim();
    const cleanOffer = offer.trim();

    if (!cleanBiz || !cleanNiche) {
      setError(
        t(
          'Please enter your Business / Product Name and Niche.',
          'يرجى إدخال اسم النشاط أو المنتج والمجال (التخصص).'
        )
      );
      return;
    }
    if (!cleanAudience) {
      setError(
        t(
          'Please describe your Target Audience and their main Pain Points.',
          'يرجى وصف الجمهور المستهدف وأهم نقاط الألم أو التحديات.'
        )
      );
      return;
    }
    if (!cleanOffer) {
      setError(
        t(
          'Please enter your Key Offer or Value Proposition.',
          'يرجى كتابة العرض الرئيسي أو القيمة المقترحة.'
        )
      );
      return;
    }

    setError('');
    lock.current = true;
    setBusy(true);

    try {
      const brief: AIFunnelBrief = {
        funnelName: initialName.trim() || cleanBiz,
        businessName: cleanBiz,
        niche: cleanNiche,
        goal,
        audienceAndPainPoints: cleanAudience,
        offer: cleanOffer,
        price: toWesternDigits(price.trim()),
        currency,
        language: outputLanguage,
        tone,
        accentColor,
        domain,
      };

      const generatedAsset = await generateAIFunnelAsset(brief, nextPhase => setPhase(nextPhase));
      await onCreate(generatedAsset, true);
    } catch (err) {
      setError(backendError(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('AI Funnel Architect · Interactive Brief', 'مهندس المسارات الذكي · موجز المشروع')}
      close={() => {
        if (!busy) close();
      }}
    >
      <form
        className="sys-ai-architect"
        data-testid="ai-funnel-architect-modal"
        dir={ar ? 'rtl' : 'ltr'}
        onSubmit={handleGenerate}
      >
        {/* Copilot-styled Hero Banner */}
        <div className="sys-ai-architect-banner">
          <div className="sys-ai-architect-badge">
            <WandSparkles size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong>
                {t('Upklick AI Funnel Copilot', 'مساعد Upklick الذكي لبناء المسارات')}
              </strong>
              <span className="sys-ai-pill">
                <BrainCircuit size={12} />
                {t('Multi-Step Firestore Sync', 'مزامنة سحابية متعددة الخطوات')}
              </span>
            </div>
            <p>
              {t(
                'Share your business brief below. Our AI pipeline will generate tailored headlines, benefits, social proof, intake fields, and pre-linked funnel steps ready to edit.',
                'أدخل تفاصيل عرضك أدناه ليقوم الذكاء الاصطناعي ببناء مسار متكامل ومرتبط الخطوات بعناوين ومزايا ونماذج مخصصة جاهزة للتعديل فوراً.'
              )}
            </p>
          </div>
        </div>

        {/* 1. Business / Product Name & Niche */}
        <section className="sys-ai-section">
          <div className="sys-ai-section-title">
            <span className="sys-ai-num">1</span>
            <span>
              {t('Business / Product Name & Niche', 'اسم النشاط أو المنتج والمجال')}
            </span>
          </div>
          <div className="sys-create-top-grid">
            <label className="sys-field">
              <span>
                {t('Business or Product Name', 'اسم النشاط أو المنتج')}{' '}
                <em className="sys-req">*</em>
              </span>
              <input
                autoFocus
                data-testid="ai-brief-business-name"
                maxLength={100}
                value={businessName}
                onChange={e => {
                  setBusinessName(e.target.value);
                  if (error) setError('');
                }}
                placeholder={t('e.g. ScaleFlow Academy', 'مثال: أكاديمية نمو الأعمال')}
              />
            </label>

            <label className="sys-field">
              <span>
                {t('Industry / Niche', 'المجال أو التخصص')} <em className="sys-req">*</em>
              </span>
              <input
                data-testid="ai-brief-niche"
                maxLength={120}
                value={niche}
                onChange={e => {
                  setNiche(e.target.value);
                  if (error) setError('');
                }}
                placeholder={t(
                  'e.g. B2B SaaS, Fitness Coaching, Dental Clinic',
                  'مثال: التجارة الإلكترونية، الاستشارات، العيادات'
                )}
              />
            </label>
          </div>
          <div className="sys-ai-quick-chips">
            {QUICK_NICHES.map(item => {
              const label = ar ? item.ar : item.en;
              return (
                <button
                  key={item.en}
                  type="button"
                  className={`sys-ai-chip ${niche === label ? 'active' : ''}`}
                  onClick={() => setNiche(label)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Funnel Goal */}
        <section className="sys-ai-section">
          <div className="sys-ai-section-title">
            <span className="sys-ai-num">2</span>
            <span>{t('Funnel Goal & Step Architecture', 'هدف المسار وهيكلة الخطوات')}</span>
          </div>
          <div
            className="sys-ai-goal-grid"
            role="radiogroup"
            aria-label={t('Funnel Goal', 'هدف المسار')}
          >
            {goalOptions.map(opt => {
              const Icon = opt.icon;
              const active = goal === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-ai-goal={opt.id}
                  className={`sys-goal-card ${active ? 'active is-ai' : ''}`}
                  onClick={() => setGoal(opt.id)}
                >
                  <span className="sys-goal-icon">
                    <Icon size={18} />
                  </span>
                  <strong className="sys-goal-title">{opt.title}</strong>
                  <span className="sys-goal-desc">{opt.desc}</span>
                  <small className="sys-goal-hint">{opt.blueprint}</small>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Target Audience & Pain Points */}
        <section className="sys-ai-section">
          <div className="sys-ai-section-title">
            <span className="sys-ai-num">3</span>
            <span>
              {t('Target Audience & Pain Points', 'الجمهور المستهدف ونقاط الألم')}
            </span>
          </div>
          <label className="sys-field">
            <span>
              {t(
                'Who is this funnel for, and what #1 problem are they trying to solve?',
                'من هو عميلك المثالي وما هو أكبر تحدٍ يسعى لحله الآن؟'
              )}{' '}
              <em className="sys-req">*</em>
            </span>
            <textarea
              data-testid="ai-brief-audience"
              rows={2}
              maxLength={500}
              value={audienceAndPainPoints}
              onChange={e => {
                setAudienceAndPainPoints(e.target.value);
                if (error) setError('');
              }}
              placeholder={t(
                'e.g. Agency owners & consultants struggling with inconsistent monthly leads and manual follow-ups',
                'مثال: أصحاب المتاجر والمدربون الذين يعانون من ضعف تحويل الإعلانات وعدم انتظام المبيعات الشهرية'
              )}
            />
          </label>
        </section>

        {/* 4. Key Offer / Value Proposition & Price (optional) */}
        <section className="sys-ai-section">
          <div className="sys-ai-section-title">
            <span className="sys-ai-num">4</span>
            <span>
              {t(
                'Key Offer / Value Proposition & Price (Optional)',
                'العرض الرئيسي والقيمة المقترحة والسعر (اختياري)'
              )}
            </span>
          </div>
          <div className="sys-ai-offer-grid">
            <label className="sys-field">
              <span>
                {t('Core Offer & Promise', 'العرض الرئيسي والنتيجة الموعودة')}{' '}
                <em className="sys-req">*</em>
              </span>
              <input
                data-testid="ai-brief-offer"
                maxLength={240}
                value={offer}
                onChange={e => {
                  setOffer(e.target.value);
                  if (error) setError('');
                }}
                placeholder={t(
                  'e.g. 6-Week Client Acquisition Accelerator + Done-For-You Templates',
                  'مثال: برنامج مضاعفة المبيعات خلال 30 يوماً + قوالب الإعلانات الجاهزة'
                )}
              />
            </label>

            <label className="sys-field">
              <span>
                {t(`Price (${currency} · Optional)`, `السعر (${currency} · اختياري)`)}
              </span>
              <input
                dir="ltr"
                data-testid="ai-brief-price"
                maxLength={32}
                value={price}
                onChange={e => setPrice(toWesternDigits(e.target.value))}
                placeholder={goal === 'audience' ? '0 (Free)' : `197 ${currency}`}
              />
            </label>
          </div>
        </section>

        {/* 5. Output Language (Arabic / English) & Tone of Voice */}
        <section className="sys-ai-section">
          <div className="sys-ai-section-title">
            <span className="sys-ai-num">5</span>
            <span>
              {t('Output Language & Tone of Voice', 'لغة المحتوى ونبرة الخطاب التسويقي')}
            </span>
          </div>

          <div className="sys-create-top-grid">
            <div className="sys-field">
              <span>
                <Globe2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: 5 }} />
                {t('Funnel Copy Language', 'لغة نصوص المسار')}
              </span>
              <div
                className="sys-ai-lang-toggle"
                role="radiogroup"
                aria-label={t('Output Language', 'لغة المحتوى')}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={outputLanguage === 'en'}
                  data-ai-lang="en"
                  className={outputLanguage === 'en' ? 'active' : ''}
                  onClick={() => setOutputLanguage('en')}
                >
                  <span>English (LTR)</span>
                  {outputLanguage === 'en' && <Check size={14} />}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={outputLanguage === 'ar'}
                  data-ai-lang="ar"
                  className={outputLanguage === 'ar' ? 'active' : ''}
                  onClick={() => setOutputLanguage('ar')}
                >
                  <span>العربية (RTL)</span>
                  {outputLanguage === 'ar' && <Check size={14} />}
                </button>
              </div>
            </div>

            <div className="sys-field">
              <span>{t('Brand Accent Palette', 'لون الهوية البصرية')}</span>
              <div className="sys-ai-swatches-row">
                {ACCENT_SWATCHES.map(sw => (
                  <button
                    key={sw.id}
                    type="button"
                    aria-label={ar ? sw.labelAr : sw.labelEn}
                    aria-pressed={accentColor === sw.color}
                    className={`sys-ai-swatch ${accentColor === sw.color ? 'active' : ''}`}
                    style={{ backgroundColor: sw.color }}
                    onClick={() => setAccentColor(sw.color)}
                    title={ar ? sw.labelAr : sw.labelEn}
                  >
                    {accentColor === sw.color && <Check size={13} color="#fff" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className="sys-ai-tone-grid"
            role="radiogroup"
            aria-label={t('Tone of Voice', 'نبرة الخطاب')}
          >
            {toneOptions.map(item => {
              const active = tone === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-ai-tone={item.id}
                  className={`sys-ai-tone-card ${active ? 'active' : ''}`}
                  onClick={() => setTone(item.id)}
                >
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </button>
              );
            })}
          </div>
        </section>

        {busy && (
          <div className="sys-ai-progress-status" role="status">
            <LoaderCircle size={18} className="animate-spin" />
            <div>
              <strong>
                {t('Generating Your Multi-Step Funnel…', 'جارٍ توليد مسار التحويل المتكامل…')}
              </strong>
              <span>{phaseLabel}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="aw-error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}

        <footer className="sys-create-footer">
          {onBack ? (
            <button
              type="button"
              className="aw-secondary"
              disabled={busy}
              onClick={onBack}
            >
              {ar ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              {t('Back', 'رجوع')}
            </button>
          ) : (
            <button type="button" className="aw-secondary" disabled={busy} onClick={close}>
              {t('Cancel', 'إلغاء')}
            </button>
          )}
          <button
            type="submit"
            data-testid="ai-architect-submit"
            className="aw-primary sys-ai-submit-btn"
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <>
                <LoaderCircle size={15} className="animate-spin" />
                {t('Generating Funnel...', 'جارٍ بناء المسار...')}
              </>
            ) : (
              <>
                <Sparkles size={15} />
                {t('Generate Multi-Step Funnel', 'توليد المسار بالذكاء الاصطناعي')}
              </>
            )}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export default AIFunnelArchitectModal;
