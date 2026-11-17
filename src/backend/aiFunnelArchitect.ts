import { gosApi } from './gosApi';
import { generateBuilderDraft, type FunnelArchitectDraft } from './aiBuilders';
import { toWesternDigits, type CurrencyCode } from '../utils/currency';
import { createDefaultInactivePage } from '../pages/funnel-systeme-model';
import type { BuilderDocument, BuilderPage, BuilderSection } from '../pages/BuilderWorkspace';
import type { Asset } from '../pages/asset-model';

export type AIFunnelGoal = 'audience' | 'sale' | 'booking';
export type AIFunnelTone = 'persuasive' | 'executive' | 'friendly' | 'urgent';

export interface AIFunnelBrief {
  funnelName?: string;
  businessName: string;
  niche: string;
  goal: AIFunnelGoal;
  audienceAndPainPoints: string;
  offer: string;
  price?: string;
  currency: CurrencyCode;
  language: 'en' | 'ar';
  tone: AIFunnelTone;
  accentColor?: string;
  domain?: string;
}

export type AIFunnelGenerationPhase = 'analyzing' | 'generating' | 'assembling';

const NICHE_HERO_IMAGES: { match: RegExp; url: string }[] = [
  {
    match: /fitness|gym|coach|health|wellness|nutrition|رياض|تدريب|لياق|تغذية|صحة/i,
    url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1400&q=80',
  },
  {
    match: /clinic|medical|dental|doctor|beauty|skin|عياد|طب|تجميل|أسنان/i,
    url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=80',
  },
  {
    match: /real estate|property|mortgage|home|عقار|تمويل|منازل|استثمار عقاري/i,
    url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80',
  },
  {
    match: /course|academy|education|training|masterclass|كورس|أكاديمي|تعليم|دورة/i,
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80',
  },
  {
    match: /ecommerce|store|shop|brand|product|متجر|تجارة|منتج/i,
    url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=80',
  },
];

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80';

function pickHeroImage(niche: string, offer: string): string {
  const combined = `${niche} ${offer}`;
  return NICHE_HERO_IMAGES.find(item => item.match.test(combined))?.url || DEFAULT_HERO_IMAGE;
}

function cleanPriceNumber(rawPrice?: string, goal?: AIFunnelGoal): string {
  const normalized = toWesternDigits((rawPrice || '').trim());
  const match = normalized.match(/\d+(?:[.,]\d+)?/);
  if (match) return match[0].replace(',', '');
  return goal === 'sale' ? '97' : '0';
}

function w(text: unknown, fallback = ''): string {
  if (typeof text !== 'string' || !text.trim()) return toWesternDigits(fallback);
  return toWesternDigits(text.trim());
}

function extractJsonObject(raw: string): Partial<FunnelArchitectDraft> | null {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try {
    const parsed = JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    return parsed && typeof parsed === 'object' ? (parsed as Partial<FunnelArchitectDraft>) : null;
  } catch {
    return null;
  }
}

export function synthesizeTailoredDraft(brief: AIFunnelBrief): FunnelArchitectDraft {
  const ar = brief.language === 'ar';
  const biz = w(brief.businessName, ar ? 'مشروعك الرقمي' : 'Your Brand');
  const niche = w(brief.niche, ar ? 'الخدمات الرقمية والاستشارات' : 'Digital Business');
  const audience = w(
    brief.audienceAndPainPoints,
    ar ? 'أصحاب الأعمال الباحثين عن نمو مستدام ومبيعات متوقعة' : 'Ambitious clients seeking faster, predictable results'
  );
  const offer = w(
    brief.offer,
    brief.goal === 'audience'
      ? ar
        ? 'الدليل التطبيقي المجاني وخارطة الطريق العملية'
        : 'Free Actionable Blueprint & Implementation Checklist'
      : brief.goal === 'booking'
        ? ar
          ? 'جلسة استشارية تشخيصية مخصصة 1-إلى-1'
          : '1-on-1 Personalized Strategy & Growth Audit'
        : ar
          ? 'البرنامج المتكامل والنظام العملي الجاهز للتطبيق'
          : 'Complete Flagship System & Implementation Toolkit'
  );
  const numericPrice = cleanPriceNumber(brief.price, brief.goal);
  const priceDisplay =
    numericPrice && Number(numericPrice) > 0 ? `${numericPrice} ${brief.currency}` : ar ? 'مجاناً 100%' : '100% Free';

  if (ar) {
    const tonePrefix =
      brief.tone === 'urgent'
        ? 'لفترة محدودة جداً — '
        : brief.tone === 'executive'
          ? 'منهجية احترافية معتمدة: '
          : brief.tone === 'friendly'
            ? 'خطوتك الأذكى اليوم: '
            : '';

    const headline =
      brief.goal === 'audience'
        ? `${tonePrefix}احصل على ${offer} من ${biz} وتجاوز التحديات اليومية بثقة`
        : brief.goal === 'booking'
          ? `${tonePrefix}احجز جلستك الاستراتيجية مع ${biz} لبناء خطة نمو واضحة في ${niche}`
          : `${tonePrefix}${offer} من ${biz} — النظام المتكامل لتحقيق نتائج ملموسة في ${niche}`;

    const subheadline = `صُمم خصيصاً لـ (${audience}) ليمنحك خطوات عملية مدروسة توفر عليك أشهر من التجربة والخطأ وتنقل نتائجك إلى المستوى التالي.`;

    const cta =
      brief.goal === 'audience'
        ? brief.tone === 'urgent'
          ? 'احصل على نسختك المجانية الآن قبل انتهاء الإتاحة'
          : 'أرسل لي النسخة المجانية فوراً'
        : brief.goal === 'booking'
          ? 'احجز موعد استشارتك الآن'
          : numericPrice && Number(numericPrice) > 0
            ? `اشترك الآن مقابل ${priceDisplay}`
            : 'انتقل لإتمام الطلب الآن';

    return {
      headline: w(headline),
      subheadline: w(subheadline),
      cta: w(cta),
      benefits: [
        {
          title: w(`خارطة طريق واضحة في ${niche}`),
          description: w(`نظام عملي مرتب خطوة بخطوة من ${biz} يساعدك على التنفيذ الفوري دون تعقيد تقني.`),
        },
        {
          title: w('حلول مباشرة لأهم نقاط الألم'),
          description: w(`مصمم لمعالجة تحديات (${audience}) وتحويلها إلى نتائج قابلة للقياس خلال أيام.`),
        },
        {
          title: w('أدوات جاهزة ودعم موثوق 24/7'),
          description: w(`احصل على كل القوالب والملفات التطبيقية المرافقة لـ ${offer} فور إتمام خطوتك.`),
        },
      ],
      testimonials: [
        {
          author: 'أحمد المنصوري',
          role: w(`عميل في قطاع ${niche}`),
          quote: w(`تجربتنا مع ${biz} اختصرت علينا أشهراً من البحث؛ الخطوات واضحة والعائد ظهر من الأسبوع الأول.`),
        },
        {
          author: 'سارة العتيبي',
          role: 'مؤسسة مشروع ومديرة تنفيذية',
          quote: w(`أفضل استثمار قمنا به هذا العام. العرض (${offer}) عملي جداً ومصمم بتركيز حقيقي على النتائج.`),
        },
      ],
      formTitle:
        brief.goal === 'audience'
          ? w(`أدخل بياناتك لاستلام ${offer} فوراً`)
          : brief.goal === 'booking'
            ? w(`بيانات التأهيل السريع لحجز جلستك مع ${biz}`)
            : w('بيانات العميل والتسليم الفوري'),
      formSubheadline:
        brief.goal === 'audience'
          ? w('يصلك رابط التحميل المباشر إلى بريدك الإلكتروني خلال أقل من 60 ثانية.')
          : brief.goal === 'booking'
            ? w('أكمل البيانات التالية في 30 ثانية لنستعد لجلستك بأفضل توصيات مخصصة.')
            : w(`أكمل بياناتك لتفعيل وصولك الفوري إلى ${offer} (${priceDisplay}).`),
      formCta: w(cta),
      formFields:
        brief.goal === 'audience'
          ? [
              { label: 'الاسم الكامل', type: 'text', required: true, placeholder: 'اكتب اسمك الكامل' },
              { label: 'البريد الإلكتروني', type: 'email', required: true, placeholder: 'name@company.com' },
              { label: 'رقم الجوال (واتساب)', type: 'tel', required: false, placeholder: '+966 50 000 0000' },
            ]
          : brief.goal === 'booking'
            ? [
                { label: 'الاسم الكامل', type: 'text', required: true, placeholder: 'اكتب اسمك الكامل' },
                { label: 'البريد الإلكتروني للعمل', type: 'email', required: true, placeholder: 'name@company.com' },
                { label: 'رقم الواتساب للتأكيد', type: 'tel', required: true, placeholder: '+966 50 000 0000' },
                {
                  label: 'ما هو أهم هدف ترغب في تحقيقه خلال الـ 90 يوماً القادمة؟',
                  type: 'textarea',
                  required: true,
                  placeholder: 'اشرح باختصار وضعك الحالي وأكبر تحدٍ تواجهه...',
                },
              ]
            : [
                { label: 'الاسم الكامل', type: 'text', required: true, placeholder: 'الاسم كما يظهر في الفاتورة' },
                { label: 'البريد الإلكتروني لتفعيل الحساب', type: 'email', required: true, placeholder: 'you@example.com' },
                { label: 'رقم الهاتف / واتساب', type: 'tel', required: true, placeholder: '+20 100 000 0000' },
              ],
      faq: [
        {
          question: w(`لمن صُمم ${offer} تحديداً؟`),
          answer: w(`صُمم خصيصاً لـ ${audience} الراغبين في حل عملي ومجرب داخل مجال ${niche}.`),
        },
        {
          question: 'متى أحصل على الوصول أو التأكيد بعد التسجيل؟',
          answer: w('بمجرد إرسال النموذج أو إتمام الطلب يتم توجيهك تلقائياً لصفحة التأكيد ويصلك بريد فوري خلال 60 ثانية.'),
        },
        {
          question: 'هل أحتاج إلى خبرة مسبقة لتطبيق الخطوات؟',
          answer: w(`إطلاقاً — فريق ${biz} صمم كل جزء بأسلوب واضح ومباشر يناسب المبتدئين والمحترفين على حد سواء.`),
        },
      ],
      orderHeadline:
        brief.goal === 'booking'
          ? w(`اختر موعدك وأكمل طلب الاستشارة مع ${biz}`)
          : w(`إتمام الطلب الآمن — ${offer}`),
      orderSummary:
        brief.goal === 'booking'
          ? w('جلسة استشارية مركزة لمدة 30 دقيقة عبر الإنترنت مع خطة عمل مخصصة.')
          : w(`وصول فوري وكامل إلى ${offer} من ${biz} مقابل ${priceDisplay} مع ضمان الجودة لمدة 30 يوماً.`),
      thankYouHeadline:
        brief.goal === 'audience'
          ? w(`تم التسجيل بنجاح! نسختك من ${offer} جاهزة الآن`)
          : brief.goal === 'booking'
            ? w(`تم استلام طلب حجزك مع ${biz} بنجاح!`)
            : w(`شكراً لثقتك بـ ${biz} — تم تأكيد طلبك بنجاح!`),
      thankYouBody:
        brief.goal === 'audience'
          ? w('أرسلنا نسخة إضافية إلى بريدك الإلكتروني. اضغط على الزر أدناه لفتح المحتوى والبدء فوراً.')
          : brief.goal === 'booking'
            ? w('تم تسجيل موعدك وبياناتك بنجاح. سيصلك رابط الاجتماع وتفاصيل التحضير عبر البريد والواتساب.')
            : w(`تم تفعيل وصولك الكامل إلى ${offer} وإرسال الفاتورة الضريبية وبيانات الدخول إلى بريدك الإلكتروني.`),
      nextActionCta:
        brief.goal === 'audience'
          ? 'تحميل وفتح المحتوى الآن'
          : brief.goal === 'booking'
            ? 'إضافة الموعد إلى التقويم'
            : 'الدخول إلى بوابة المحتوى الآن',
    };
  }

  // English (LTR)
  const tonePrefix =
    brief.tone === 'urgent'
      ? 'Limited Availability — '
      : brief.tone === 'executive'
        ? 'Proven Strategic Framework: '
        : brief.tone === 'friendly'
          ? 'Your Next Breakthrough Starts Here: '
          : '';

  const headline =
    brief.goal === 'audience'
      ? `${tonePrefix}Unlock ${offer} by ${biz} & Eliminate Guesswork`
      : brief.goal === 'booking'
        ? `${tonePrefix}Book Your 1-on-1 ${niche} Strategy Session with ${biz}`
        : `${tonePrefix}${offer} by ${biz} — Your Complete ${niche} Growth System`;

  const subheadline = `Built specifically for ${audience} — get the step-by-step system to achieve faster, measurable outcomes without wasted time or trial-and-error.`;

  const cta =
    brief.goal === 'audience'
      ? brief.tone === 'urgent'
        ? 'Claim My Free Access Before It Closes'
        : 'Send Me Instant Free Access'
      : brief.goal === 'booking'
        ? 'Schedule My Strategy Session'
        : numericPrice && Number(numericPrice) > 0
          ? `Get Instant Access for ${priceDisplay}`
          : 'Proceed to Secure Checkout';

  return {
    headline: w(headline),
    subheadline: w(subheadline),
    cta: w(cta),
    benefits: [
      {
        title: w(`Proven ${niche} Execution Roadmap`),
        description: w(`Follow ${biz}'s structured step-by-step playbook so you can launch with clarity from Day 1.`),
      },
      {
        title: w('Engineered Around Your Core Bottlenecks'),
        description: w(`Directly addresses the daily friction faced by ${audience} with practical, repeatable frameworks.`),
      },
      {
        title: w('Ready-to-Use Templates & Fast Implementation'),
        description: w(`Plug in our battle-tested assets inside ${offer} and start seeing traction in hours, not months.`),
      },
    ],
    testimonials: [
      {
        author: 'Daniel M.',
        role: w(`${niche} Founder`),
        quote: w(`Working with ${biz} gave us an immediate roadmap. We implemented the steps in 48 hours and saw instant momentum.`),
      },
      {
        author: 'Nadia K.',
        role: 'Operations & Growth Lead',
        quote: w(`${offer} paid for itself right away — crisp structure, zero fluff, and genuinely actionable guidance.`),
      },
    ],
    formTitle:
      brief.goal === 'audience'
        ? w(`Where Should We Send Your ${offer}?`)
        : brief.goal === 'booking'
          ? w(`Quick 30-Second Qualification for ${biz}`)
          : w('Customer Details & Instant Access Setup'),
    formSubheadline:
      brief.goal === 'audience'
        ? w('Enter your best email below for instant delivery in under 60 seconds.')
        : brief.goal === 'booking'
          ? w('Share your goals so our specialist can tailor your session roadmap before we meet.')
          : w(`Complete your order below to unlock ${offer} (${priceDisplay}) immediately.`),
    formCta: w(cta),
    formFields:
      brief.goal === 'audience'
        ? [
            { label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your full name' },
            { label: 'Work Email', type: 'email', required: true, placeholder: 'you@company.com' },
            { label: 'Phone / WhatsApp (Optional)', type: 'tel', required: false, placeholder: '+1 (555) 000-0000' },
          ]
        : brief.goal === 'booking'
          ? [
              { label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your full name' },
              { label: 'Business Email', type: 'email', required: true, placeholder: 'you@company.com' },
              { label: 'WhatsApp / Mobile Number', type: 'tel', required: true, placeholder: '+1 (555) 000-0000' },
              {
                label: 'What is your #1 goal for the next 90 days?',
                type: 'textarea',
                required: true,
                placeholder: 'Briefly describe your current bottleneck and target outcome...',
              },
            ]
          : [
              { label: 'Full Name', type: 'text', required: true, placeholder: 'Full billing name' },
              { label: 'Email Address (for instant access)', type: 'email', required: true, placeholder: 'you@company.com' },
              { label: 'Phone Number', type: 'tel', required: true, placeholder: '+1 (555) 000-0000' },
            ],
    faq: [
      {
        question: w(`Who is ${offer} best suited for?`),
        answer: w(`It is crafted specifically for ${audience} looking for a proven, high-leverage system in ${niche}.`),
      },
      {
        question: 'How fast do I get access after submitting?',
        answer: w('Immediately! You are redirected to your confirmation step right away and receive an email copy within 60 seconds.'),
      },
      {
        question: 'Can I customize or scale this as my business grows?',
        answer: w(`Yes — ${biz} designed every workflow to adapt cleanly whether you are just launching or scaling rapidly.`),
      },
    ],
    orderHeadline:
      brief.goal === 'booking'
        ? w(`Select Your Time & Confirm Your Session with ${biz}`)
        : w(`Complete Your Secure Order — ${offer}`),
    orderSummary:
      brief.goal === 'booking'
        ? w('Focused 30-minute 1-on-1 strategy call with a custom action plan.')
        : w(`Instant lifetime access to ${offer} by ${biz} (${priceDisplay}) backed by a 30-day satisfaction guarantee.`),
    thankYouHeadline:
      brief.goal === 'audience'
        ? w(`You're In! Your ${offer} Is Ready`)
        : brief.goal === 'booking'
          ? w(`Your Strategy Session Request with ${biz} Is Confirmed!`)
          : w(`Order Confirmed — Welcome to ${biz}!`),
    thankYouBody:
      brief.goal === 'audience'
        ? w('We just sent a copy to your inbox. Click the button below to access your resource right now.')
        : brief.goal === 'booking'
          ? w('Check your inbox and WhatsApp for your calendar invitation and pre-session checklist.')
          : w(`Your access to ${offer} is now active, and your receipt has been sent to your email address.`),
    nextActionCta:
      brief.goal === 'audience'
        ? 'Download & Open Resource Now'
        : brief.goal === 'booking'
          ? 'Add Session to My Calendar'
          : 'Access Member Portal Now',
  };
}

function mergeDraft(base: FunnelArchitectDraft, partial?: Partial<FunnelArchitectDraft> | null): FunnelArchitectDraft {
  if (!partial) return base;
  return {
    headline: w(partial.headline, base.headline),
    subheadline: w(partial.subheadline, base.subheadline),
    cta: w(partial.cta, base.cta),
    benefits:
      Array.isArray(partial.benefits) && partial.benefits.length >= 2
        ? partial.benefits.slice(0, 3).map((b, idx) => ({
            title: w(b?.title, base.benefits[idx]?.title || base.benefits[0].title),
            description: w(b?.description, base.benefits[idx]?.description || base.benefits[0].description),
          }))
        : base.benefits,
    testimonials:
      Array.isArray(partial.testimonials) && partial.testimonials.length >= 1
        ? partial.testimonials.slice(0, 3).map((t, idx) => ({
            author: w(t?.author, base.testimonials[idx]?.author || base.testimonials[0].author),
            role: w(t?.role, base.testimonials[idx]?.role || base.testimonials[0].role),
            quote: w(t?.quote, base.testimonials[idx]?.quote || base.testimonials[0].quote),
          }))
        : base.testimonials,
    formTitle: w(partial.formTitle, base.formTitle),
    formSubheadline: w(partial.formSubheadline, base.formSubheadline),
    formCta: w(partial.formCta, base.formCta),
    formFields:
      Array.isArray(partial.formFields) && partial.formFields.length >= 2
        ? partial.formFields.slice(0, 6).map((f, idx) => ({
            label: w(f?.label, base.formFields[idx]?.label || 'Email'),
            type: ['text', 'email', 'tel', 'textarea', 'select'].includes(f?.type)
              ? f.type
              : base.formFields[idx]?.type || 'text',
            required: typeof f?.required === 'boolean' ? f.required : true,
            placeholder: w(f?.placeholder, base.formFields[idx]?.placeholder || ''),
          }))
        : base.formFields,
    faq:
      Array.isArray(partial.faq) && partial.faq.length >= 2
        ? partial.faq.slice(0, 4).map((q, idx) => ({
            question: w(q?.question, base.faq[idx]?.question || ''),
            answer: w(q?.answer, base.faq[idx]?.answer || ''),
          }))
        : base.faq,
    orderHeadline: w(partial.orderHeadline, base.orderHeadline),
    orderSummary: w(partial.orderSummary, base.orderSummary),
    thankYouHeadline: w(partial.thankYouHeadline, base.thankYouHeadline),
    thankYouBody: w(partial.thankYouBody, base.thankYouBody),
    nextActionCta: w(partial.nextActionCta, base.nextActionCta),
  };
}

function makeSection(
  type: BuilderSection['type'],
  title: string,
  body = '',
  content: Record<string, string> = {},
  styles: Partial<BuilderSection['styles']> = {},
  children?: BuilderSection[][]
): BuilderSection {
  return {
    id: crypto.randomUUID(),
    type,
    content: { title, body, ...content },
    styles: {
      backgroundColor: '#ffffff',
      padding: '32',
      textAlign: 'Left',
      typography: 'Default',
      customCss: '',
      visibility: 'All devices',
      animation: 'None',
      ...styles,
    },
    ...(children ? { children } : {}),
  };
}

export function buildAIFunnelAsset(brief: AIFunnelBrief, draft: FunnelArchitectDraft): Asset {
  const ar = brief.language === 'ar';
  const align = ar ? 'Right' : 'Left';
  const accent = brief.accentColor || (brief.goal === 'audience' ? '#059669' : brief.goal === 'booking' ? '#0284c7' : '#4F46E5');
  const heroImg = pickHeroImage(brief.niche, brief.offer);
  const funnelTitle = w(
    brief.funnelName?.trim() ||
      `${brief.businessName.trim()} · ${
        brief.goal === 'audience'
          ? ar
            ? 'مسار بناء الجمهور'
            : 'Lead Funnel'
          : brief.goal === 'booking'
            ? ar
              ? 'مسار حجز الاستشارات'
              : 'Booking Funnel'
            : ar
              ? 'مسار المبيعات'
              : 'Sales Funnel'
      }`
  );
  const numericPrice = cleanPriceNumber(brief.price, brief.goal);
  const priceDisplay =
    numericPrice && Number(numericPrice) > 0 ? `${numericPrice} ${brief.currency}` : ar ? 'مجاناً 100%' : '100% Free';

  const benefitCols: BuilderSection[][] = draft.benefits.slice(0, 3).map((item, idx) => [
    makeSection(
      'Heading',
      `0${idx + 1}. ${item.title}`,
      '',
      { headingTag: 'H3' },
      { padding: '12', textAlign: align, backgroundColor: '#f8fafc' }
    ),
    makeSection('Paragraph', '', item.description, {}, { padding: '12', textAlign: align, backgroundColor: '#f8fafc' }),
  ]);

  const testimonialsSection = makeSection(
    'Testimonials',
    ar ? 'نتائج وتجارب العملاء' : 'Trusted by Clients & Customers',
    '',
    {
      testimonials: JSON.stringify(
        draft.testimonials.map(t => ({
          id: crypto.randomUUID(),
          author: t.author,
          role: t.role,
          quote: t.quote,
          rating: 5,
          avatar: '',
        }))
      ),
    },
    { backgroundColor: '#ffffff', padding: '36', textAlign: align }
  );

  const faqSection = makeSection(
    'FAQ',
    ar ? 'الأسئلة الشائعة' : 'Frequently Asked Questions',
    ar ? 'إجابات واضحة لمساعدتك على اتخاذ القرار بثقة.' : 'Clear answers before you take the next step.',
    {
      questions: JSON.stringify(
        draft.faq.map(q => ({
          id: crypto.randomUUID(),
          question: q.question,
          answer: q.answer,
        }))
      ),
    },
    { backgroundColor: '#f8fafc', padding: '36', textAlign: align }
  );

  const pages: BuilderPage[] = [];

  if (brief.goal === 'audience') {
    const optinId = crypto.randomUUID();
    const thanksId = crypto.randomUUID();

    const customFieldsPayload = draft.formFields.map((f, idx) => ({
      id: `field_${idx + 1}`,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      options: [],
    }));

    const formSection = makeSection(
      'Form',
      draft.formTitle,
      draft.formSubheadline,
      {
        fields: JSON.stringify(['Name', 'Email', 'Phone']),
        customFields: JSON.stringify(customFieldsPayload),
        button: draft.formCta,
        nextPage: thanksId,
        destinationType: 'Next Step',
        destination: thanksId,
        successMessage: draft.thankYouHeadline,
      },
      { backgroundColor: '#ffffff', padding: '36', textAlign: align }
    );

    const optinPage: BuilderPage = {
      id: optinId,
      name: ar ? 'صفحة الاشتراك وبناء الجمهور' : 'Opt-in & Lead Magnet Page',
      path: '/opt-in',
      status: 'Draft',
      isFunnelStep: true,
      stepCategory: 'Opt-in',
      templateSelected: true,
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      headline: draft.headline,
      subheadline: draft.subheadline,
      cta: draft.cta,
      featuredImage: heroImg,
      seoTitle: `${draft.headline} | ${brief.businessName}`,
      seoDescription: draft.subheadline,
      backgroundColor: '#f8fafc',
      sections: [
        makeSection(
          'Hero',
          draft.headline,
          draft.subheadline,
          {
            button: draft.cta,
            image: heroImg,
            destinationType: 'Scroll to Section',
            destination: formSection.id,
          },
          { backgroundColor: '#0f172a', customCss: 'color:#ffffff;', padding: '48', textAlign: align }
        ),
        makeSection(
          'Stats',
          '',
          '',
          {
            items: JSON.stringify([
              { value: '00 : 14 : 59', label: ar ? 'إتاحة العرض المجاني' : 'Bonus Access Timer' },
              { value: '100%', label: ar ? 'مجاني بالكامل' : '100% Free Instant Access' },
              { value: '4.9 / 5', label: ar ? 'تقييم المستفيدين' : 'Average Rating' },
              { value: '< 60s', label: ar ? 'تسليم فوري للبريد' : 'Instant Inbox Delivery' },
            ]),
          },
          { backgroundColor: '#ecfdf5', padding: '24', textAlign: 'Center' }
        ),
        makeSection(
          'Columns',
          ar ? 'ماذا ستحصل عليه فور التسجيل؟' : 'What You Unlock Inside',
          '',
          { columnLayout: '3 Col (33/33/33)', gap: '20' },
          { backgroundColor: '#f8fafc', padding: '36', textAlign: align },
          benefitCols
        ),
        formSection,
        testimonialsSection,
        faqSection,
      ],
    };

    const thankYouPage: BuilderPage = {
      id: thanksId,
      name: ar ? 'صفحة الشكر والتسليم الفوري' : 'Thank You & Instant Delivery',
      path: '/thank-you',
      status: 'Draft',
      isFunnelStep: true,
      stepCategory: 'Thank You',
      templateSelected: true,
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      headline: draft.thankYouHeadline,
      subheadline: draft.thankYouBody,
      cta: draft.nextActionCta,
      featuredImage: heroImg,
      seoTitle: `${draft.thankYouHeadline} | ${brief.businessName}`,
      seoDescription: draft.thankYouBody,
      backgroundColor: '#f8fafc',
      sections: [
        makeSection(
          'Hero',
          draft.thankYouHeadline,
          draft.thankYouBody,
          {
            button: draft.nextActionCta,
            destinationType: 'External URL',
            destination: '#download-ready',
          },
          { backgroundColor: '#064e3b', customCss: 'color:#ffffff;', padding: '48', textAlign: 'Center' }
        ),
        makeSection(
          'Stats',
          '',
          '',
          {
            items: JSON.stringify([
              { value: 'Step 2 / 2', label: ar ? 'اكتمل التسجيل' : 'Registration Complete' },
              { value: '100%', label: ar ? 'جاهز للتحميل الآن' : 'Ready for Download' },
              { value: '24/7', label: ar ? 'وصول مفتوح' : 'On-Demand Access' },
            ]),
          },
          { backgroundColor: '#ffffff', padding: '24', textAlign: 'Center' }
        ),
      ],
    };

    pages.push(optinPage, thankYouPage);
  } else if (brief.goal === 'booking') {
    const offerPageId = crypto.randomUUID();
    const bookingStepId = crypto.randomUUID();
    const thanksId = crypto.randomUUID();

    const customFieldsPayload = draft.formFields.map((f, idx) => ({
      id: `field_${idx + 1}`,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      options: [],
    }));

    const offerPage: BuilderPage = {
      id: offerPageId,
      name: ar ? 'صفحة العرض وحجز الاستشارة' : 'Strategy & Consultation Offer',
      path: '/strategy-session',
      status: 'Draft',
      isFunnelStep: true,
      stepCategory: 'Sales',
      templateSelected: true,
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      headline: draft.headline,
      subheadline: draft.subheadline,
      cta: draft.cta,
      featuredImage: heroImg,
      seoTitle: `${draft.headline} | ${brief.businessName}`,
      seoDescription: draft.subheadline,
      backgroundColor: '#f8fafc',
      sections: [
        makeSection(
          'Hero',
          draft.headline,
          draft.subheadline,
          {
            button: draft.cta,
            image: heroImg,
            destinationType: 'Next Step',
            destination: bookingStepId,
          },
          { backgroundColor: '#0f172a', customCss: 'color:#ffffff;', padding: '48', textAlign: align }
        ),
        makeSection(
          'Stats',
          '',
          '',
          {
            items: JSON.stringify([
              { value: '30 Min', label: ar ? 'مدة الجلسة المركزة' : 'Focused 1-on-1 Session' },
              { value: priceDisplay, label: ar ? 'رسوم الجلسة' : 'Session Investment' },
              { value: '4.9 / 5', label: ar ? 'تقييم العملاء' : 'Client Satisfaction' },
              { value: '90 Days', label: ar ? 'خطة عمل واضحة' : 'Actionable Growth Plan' },
            ]),
          },
          { backgroundColor: '#f0f9ff', padding: '24', textAlign: 'Center' }
        ),
        makeSection(
          'Columns',
          ar ? 'محاور جلستك الاستشارية' : 'What We Cover On Your Call',
          '',
          { columnLayout: '3 Col (33/33/33)', gap: '20' },
          { backgroundColor: '#f8fafc', padding: '36', textAlign: align },
          benefitCols
        ),
        testimonialsSection,
        faqSection,
        makeSection(
          'Hero',
          draft.orderHeadline,
          draft.orderSummary,
          {
            button: draft.cta,
            destinationType: 'Next Step',
            destination: bookingStepId,
          },
          { backgroundColor: '#0f172a', customCss: 'color:#ffffff;', padding: '40', textAlign: 'Center' }
        ),
      ],
    };

    const bookingPage: BuilderPage = {
      id: bookingStepId,
      name: ar ? 'نموذج التأهيل وحجز الموعد' : 'Qualification & Booking Step',
      path: '/schedule',
      status: 'Draft',
      isFunnelStep: true,
      stepCategory: 'Opt-in',
      templateSelected: true,
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      headline: draft.orderHeadline,
      subheadline: draft.orderSummary,
      cta: draft.formCta,
      featuredImage: heroImg,
      seoTitle: `${draft.orderHeadline} | ${brief.businessName}`,
      seoDescription: draft.orderSummary,
      backgroundColor: '#f8fafc',
      sections: [
        makeSection(
          'Hero',
          draft.orderHeadline,
          draft.orderSummary,
          {
            button: draft.formCta,
            destinationType: 'Next Step',
            destination: thanksId,
          },
          { backgroundColor: '#0c4a6e', customCss: 'color:#ffffff;', padding: '36', textAlign: align }
        ),
        makeSection(
          'Booking',
          ar ? 'اختر اليوم والوقت المناسب لك' : 'Select Your Preferred Date & Time',
          draft.orderSummary,
          {
            calendar: `${w(brief.businessName)} Calendar`,
            serviceType: `${w(brief.offer)} · 30 min`,
            timeSlots: ar
              ? 'اليوم · 2:00 PM,غداً · 11:00 AM,غداً · 4:30 PM'
              : 'Today · 2:00 PM,Tomorrow · 11:00 AM,Tomorrow · 4:30 PM',
            button: draft.formCta,
            bookingMode: 'step',
            nextPage: thanksId,
            destinationType: 'Next Step',
            destination: thanksId,
          },
          { backgroundColor: '#ffffff', padding: '32', textAlign: align }
        ),
        makeSection(
          'Form',
          draft.formTitle,
          draft.formSubheadline,
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone', 'Message']),
            customFields: JSON.stringify(customFieldsPayload),
            button: draft.formCta,
            nextPage: thanksId,
            destinationType: 'Next Step',
            destination: thanksId,
            successMessage: draft.thankYouHeadline,
          },
          { backgroundColor: '#f8fafc', padding: '32', textAlign: align }
        ),
      ],
    };

    const thankYouPage: BuilderPage = {
      id: thanksId,
      name: ar ? 'صفحة تأكيد الموعد' : 'Booking Confirmation Page',
      path: '/confirmation',
      status: 'Draft',
      isFunnelStep: true,
      stepCategory: 'Thank You',
      templateSelected: true,
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      headline: draft.thankYouHeadline,
      subheadline: draft.thankYouBody,
      cta: draft.nextActionCta,
      featuredImage: heroImg,
      seoTitle: `${draft.thankYouHeadline} | ${brief.businessName}`,
      seoDescription: draft.thankYouBody,
      backgroundColor: '#f8fafc',
      sections: [
        makeSection(
          'Hero',
          draft.thankYouHeadline,
          draft.thankYouBody,
          {
            button: draft.nextActionCta,
            destinationType: 'External URL',
            destination: '#calendar-confirmed',
          },
          { backgroundColor: '#0c4a6e', customCss: 'color:#ffffff;', padding: '48', textAlign: 'Center' }
        ),
        makeSection(
          'Stats',
          '',
          '',
          {
            items: JSON.stringify([
              { value: 'Step 3 / 3', label: ar ? 'تم تأكيد الحجز' : 'Session Confirmed' },
              { value: '30 Min', label: ar ? 'مكالمة فيديو مباشرة' : '1-on-1 Video Session' },
              { value: '24h', label: ar ? 'تذكير تلقائي قبل الموعد' : 'Automated SMS/Email Reminder' },
            ]),
          },
          { backgroundColor: '#ffffff', padding: '24', textAlign: 'Center' }
        ),
      ],
    };

    pages.push(offerPage, bookingPage, thankYouPage);
  } else {
    // Direct Product / Course Sale (3 pre-linked steps: Sales Page -> Order Form -> Thank You Page)
    const salesId = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const thanksId = crypto.randomUUID();
    const checkoutPrice = numericPrice && Number(numericPrice) > 0 ? numericPrice : '97';

    const salesPage: BuilderPage = {
      id: salesId,
      name: ar ? 'صفحة المبيعات والعرض الرئيسي' : 'Offer & Sales Page',
      path: '/offer',
      status: 'Draft',
      isFunnelStep: true,
      stepCategory: 'Sales',
      templateSelected: true,
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      headline: draft.headline,
      subheadline: draft.subheadline,
      cta: draft.cta,
      featuredImage: heroImg,
      seoTitle: `${draft.headline} | ${brief.businessName}`,
      seoDescription: draft.subheadline,
      backgroundColor: '#f8fafc',
      sections: [
        makeSection(
          'Hero',
          draft.headline,
          draft.subheadline,
          {
            button: draft.cta,
            image: heroImg,
            destinationType: 'Next Step',
            destination: orderId,
          },
          { backgroundColor: '#0f172a', customCss: 'color:#ffffff;', padding: '48', textAlign: align }
        ),
        makeSection(
          'Stats',
          '',
          '',
          {
            items: JSON.stringify([
              { value: '00 : 19 : 59', label: ar ? 'عرض الإطلاق المحدود' : 'Limited Offer Timer' },
              { value: `${checkoutPrice} ${brief.currency}`, label: ar ? 'استثمار لمرة واحدة' : 'Special Offer Price' },
              { value: '30-Day', label: ar ? 'ضمان استرجاع كامل' : 'Money-Back Guarantee' },
              { value: '4.9 / 5', label: ar ? 'تقييم المشتركين' : 'Verified Buyer Rating' },
            ]),
          },
          { backgroundColor: '#eef2ff', padding: '24', textAlign: 'Center' }
        ),
        makeSection(
          'Columns',
          ar ? 'لماذا يختار العملاء هذا النظام؟' : 'Everything Included in Your Offer',
          '',
          { columnLayout: '3 Col (33/33/33)', gap: '20' },
          { backgroundColor: '#f8fafc', padding: '36', textAlign: align },
          benefitCols
        ),
        makeSection(
          'Pricing',
          ar ? 'ملخص العرض والانضمام الفوري' : 'Complete Offer Stack & Pricing',
          draft.orderSummary,
          {
            plans: JSON.stringify([
              {
                id: crypto.randomUUID(),
                name: w(brief.offer || brief.businessName),
                price: checkoutPrice,
                period: ar ? 'دفعة واحدة' : 'one-time',
                features: draft.benefits.map(b => b.title),
                button: draft.cta,
                highlighted: true,
                destinationType: 'Next Step',
                destination: orderId,
              },
            ]),
          },
          { backgroundColor: '#ffffff', padding: '36', textAlign: align }
        ),
        testimonialsSection,
        faqSection,
        makeSection(
          'Hero',
          draft.orderHeadline,
          draft.orderSummary,
          {
            button: draft.cta,
            destinationType: 'Next Step',
            destination: orderId,
          },
          { backgroundColor: '#1e1b4b', customCss: 'color:#ffffff;', padding: '40', textAlign: 'Center' }
        ),
      ],
    };

    const customFieldsPayload = draft.formFields.map((f, idx) => ({
      id: `field_${idx + 1}`,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      options: [],
    }));

    const orderPage: BuilderPage = {
      id: orderId,
      name: ar ? 'نموذج الطلب والدفع الآمن' : 'Order Form & Checkout',
      path: '/order-form',
      status: 'Draft',
      isFunnelStep: true,
      stepCategory: 'Order Form',
      templateSelected: true,
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      headline: draft.orderHeadline,
      subheadline: draft.orderSummary,
      cta: draft.formCta,
      featuredImage: heroImg,
      seoTitle: `${draft.orderHeadline} | ${brief.businessName}`,
      seoDescription: draft.orderSummary,
      backgroundColor: '#f8fafc',
      sections: [
        makeSection(
          'Hero',
          draft.orderHeadline,
          draft.orderSummary,
          {
            button: draft.formCta,
            destinationType: 'Next Step',
            destination: thanksId,
          },
          { backgroundColor: '#1e1b4b', customCss: 'color:#ffffff;', padding: '36', textAlign: align }
        ),
        makeSection(
          'Stats',
          '',
          '',
          {
            items: JSON.stringify([
              { value: '256-Bit', label: ar ? 'تشفير دفع آمن SSL' : 'SSL Encrypted Checkout' },
              { value: `${checkoutPrice} ${brief.currency}`, label: ar ? 'الإجمالي المستحق' : 'Order Total' },
              { value: '30-Day', label: ar ? 'ضمان استرداد الأموال' : 'Satisfaction Guarantee' },
            ]),
          },
          { backgroundColor: '#eef2ff', padding: '20', textAlign: 'Center' }
        ),
        makeSection(
          'Form',
          draft.formTitle,
          draft.formSubheadline,
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone']),
            customFields: JSON.stringify(customFieldsPayload),
            button: draft.formCta,
            nextPage: thanksId,
            destinationType: 'Next Step',
            destination: thanksId,
            successMessage: draft.thankYouHeadline,
          },
          { backgroundColor: '#ffffff', padding: '32', textAlign: align }
        ),
        makeSection(
          'Payment',
          w(brief.offer || brief.businessName),
          draft.orderSummary,
          {
            productName: w(brief.offer || brief.businessName),
            price: checkoutPrice,
            currency: brief.currency,
            button: draft.formCta,
            nextPage: thanksId,
            destinationType: 'Next Step',
            destination: thanksId,
          },
          { backgroundColor: '#f8fafc', padding: '32', textAlign: align }
        ),
      ],
    };

    const thankYouPage: BuilderPage = {
      id: thanksId,
      name: ar ? 'صفحة تأكيد الطلب والشكر' : 'Order Confirmation & Thank You',
      path: '/thank-you',
      status: 'Draft',
      isFunnelStep: true,
      stepCategory: 'Thank You',
      templateSelected: true,
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      headline: draft.thankYouHeadline,
      subheadline: draft.thankYouBody,
      cta: draft.nextActionCta,
      featuredImage: heroImg,
      seoTitle: `${draft.thankYouHeadline} | ${brief.businessName}`,
      seoDescription: draft.thankYouBody,
      backgroundColor: '#f8fafc',
      sections: [
        makeSection(
          'Hero',
          draft.thankYouHeadline,
          draft.thankYouBody,
          {
            button: draft.nextActionCta,
            destinationType: 'External URL',
            destination: '#member-access',
          },
          { backgroundColor: '#1e1b4b', customCss: 'color:#ffffff;', padding: '48', textAlign: 'Center' }
        ),
        makeSection(
          'Stats',
          '',
          '',
          {
            items: JSON.stringify([
              { value: '#10482', label: ar ? 'رقم تأكيد الطلب' : 'Order Reference' },
              { value: `${checkoutPrice} ${brief.currency}`, label: ar ? 'تم تأكيد الدفع' : 'Payment Verified' },
              { value: '24/7', label: ar ? 'الوصول مفعّل الآن' : 'Instant Portal Access' },
            ]),
          },
          { backgroundColor: '#ffffff', padding: '24', textAlign: 'Center' }
        ),
      ],
    };

    pages.push(salesPage, orderPage, thankYouPage);
  }

  const goalLabel =
    brief.goal === 'audience'
      ? 'Lead generation'
      : brief.goal === 'booking'
        ? 'Bookings'
        : 'Sales';

  const document: BuilderDocument = {
    pages,
    steps: pages.map(page => ({
      id: page.id,
      label: page.name,
      pageId: page.id,
      type: page.stepCategory || 'Sales',
    })),
    funnel: {
      name: funnelTitle,
      goal: goalLabel,
      goalType: 'ai',
      currency: brief.currency,
      funnelActive: true,
      audience: w(brief.audienceAndPainPoints),
      offer: w(brief.offer),
      events: ['PageView', 'Lead', 'Purchase'],
      status: 'Draft',
      pagesFlow: pages.map(page => page.id),
    },
    inactivePage: createDefaultInactivePage(funnelTitle),
    theme: {
      color: accent,
      font: ar ? 'Cairo' : 'Inter',
      corners: 'Rounded',
    },
  };

  return {
    id: crypto.randomUUID(),
    kind: 'funnel',
    name: funnelTitle,
    domain: brief.domain || '',
    currency: brief.currency,
    image: heroImg,
    updated: new Date().toISOString(),
    description: draft.subheadline,
    settings: {
      seo: funnelTitle,
      navigation: pages.map(p => p.name).join(', '),
      color: accent,
    },
    document,
  };
}

export async function generateAIFunnelAsset(
  brief: AIFunnelBrief,
  onPhase?: (phase: AIFunnelGenerationPhase) => void
): Promise<Asset> {
  onPhase?.('analyzing');
  const baseSynthesized = synthesizeTailoredDraft(brief);

  onPhase?.('generating');
  const isDemo =
    typeof window !== 'undefined' &&
    (window.sessionStorage?.getItem('gos.demo-account.active') === '1' ||
      new URLSearchParams(window.location.search).has('account-demo'));

  let aiPartial: Partial<FunnelArchitectDraft> | null = null;

  const structuredPrompt = [
    `You are an elite SaaS & Direct-Response Funnel Conversion Copywriter.`,
    `Generate conversion-focused multi-step funnel copy strictly as a raw JSON object (no markdown commentary) in ${
      brief.language === 'ar'
        ? 'natural, persuasive modern business Arabic (NOT literal machine translation)'
        : 'crisp, high-converting English'
    }.`,
    `IMPORTANT: Render ALL numbers, prices, timers, and percentages using standard Western digits (0-9) even in Arabic.`,
    `Business / Product Name: ${brief.businessName}`,
    `Niche / Industry: ${brief.niche}`,
    `Funnel Goal: ${
      brief.goal === 'audience'
        ? 'Lead Generation / Build an Audience (Opt-in + Thank You)'
        : brief.goal === 'booking'
          ? 'Consultation / Strategy Session Booking'
          : 'Direct Product / Course Sale (Sales + Order Form + Thank You)'
    }`,
    `Target Audience & Pain Points: ${brief.audienceAndPainPoints}`,
    `Key Offer / Value Proposition: ${brief.offer}`,
    `Price: ${brief.price ? `${toWesternDigits(brief.price)} ${brief.currency}` : 'Free / Consultation'}`,
    `Tone of Voice: ${brief.tone}`,
    `Required JSON keys: headline, subheadline, cta, benefits (array of 3 {title, description}), testimonials (array of 2 {author, role, quote}), formTitle, formSubheadline, formCta, formFields (array of 3 {label, type, required, placeholder}), faq (array of 3 {question, answer}), orderHeadline, orderSummary, thankYouHeadline, thankYouBody, nextActionCta.`,
  ].join('\n');

  if (!isDemo) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const copilotRes = await gosApi.copilot(
          {
            text: structuredPrompt,
            thinkingLevel: 'medium',
            uiLanguage: brief.language,
            isNewConversation: true,
          },
          controller.signal
        );
        if (copilotRes?.text) {
          aiPartial = extractJsonObject(copilotRes.text);
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      // Fall through to Cloud Function builder draft
    }

    if (!aiPartial) {
      try {
        const cloudDraft = await generateBuilderDraft('funnel_architect', structuredPrompt);
        if (cloudDraft) aiPartial = cloudDraft;
      } catch {
        try {
          const basicDraft = await generateBuilderDraft('funnel', structuredPrompt);
          if (basicDraft) {
            aiPartial = {
              headline: basicDraft.headline,
              subheadline: basicDraft.description,
              cta: basicDraft.cta,
              benefits: basicDraft.benefits?.map(b => ({
                title: b,
                description: baseSynthesized.subheadline,
              })),
              faq: basicDraft.faq,
              orderSummary: basicDraft.nextStep,
              thankYouBody: basicDraft.confirmation,
            };
          }
        } catch {
          // Fall back cleanly to domain-tailored synthesizer
        }
      }
    }
  }

  onPhase?.('assembling');
  const finalDraft = mergeDraft(baseSynthesized, aiPartial);
  return buildAIFunnelAsset(brief, finalDraft);
}
