import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, primaryAuth, primaryDb, backendError } from './firebase';
import { decodeFirestoreValue, encodeFirestoreValue } from './firestoreCodec';
import { store } from '../store';
import { useUILanguage } from '../i18n/display';
import type { BuilderPage, BuilderSection } from '../pages/BuilderWorkspace';
import type { FunnelTemplateCategory } from '../pages/funnel-systeme-model';

export const GLOBAL_FUNNEL_TEMPLATES_COLLECTION = 'global_funnel_templates';

export const GLOBAL_TEMPLATE_CATEGORIES: readonly FunnelTemplateCategory[] = [
  'Opt-in',
  'Sales',
  'Order Form',
  'Thank You',
] as const;

export type GlobalFunnelTemplate = {
  id: string;
  category: FunnelTemplateCategory;
  status: 'Published' | 'Draft';
  active: boolean;
  builtIn?: boolean;
  deleted?: boolean;
  schemaVersion?: number;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  tags_en: string[];
  tags_ar: string[];
  thumbnail: string;
  useThumbnail?: boolean;
  color: string;
  accentBg?: string;
  page_en: BuilderPage;
  page_ar: BuilderPage;
  updated?: string;
  updatedBy?: string;
};

export type LocalizedGlobalFunnelTemplate = GlobalFunnelTemplate & {
  title: string;
  description: string;
  categoryLabel: string;
  tags: string[];
  page: BuilderPage;
};

const CATEGORY_AR: Record<FunnelTemplateCategory, string> = {
  'Opt-in': 'صفحة الاشتراك (Opt-in)',
  Sales: 'صفحة المبيعات (Sales)',
  'Order Form': 'نموذج الطلب (Order Form)',
  'Thank You': 'صفحة الشكر (Thank You)',
};

export function globalTemplateCategoryLabel(category: FunnelTemplateCategory, arabic: boolean): string {
  return arabic ? CATEGORY_AR[category] || category : category;
}

const STEP_HERO_IMAGES = {
  newsletter: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=85',
  masterclass: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1400&q=85',
  toolkit: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=85',
  courseSales: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=85',
  agencySales: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=85',
  saasOffer: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=85',
  orderCheckout: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=85',
  orderCoaching: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1400&q=85',
  thanksDownload: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=85',
  thanksOrder: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1400&q=85',
} as const;

function customFieldsJson(
  items: [label: string, type: 'text' | 'email' | 'tel' | 'textarea' | 'select', placeholder: string, required?: boolean][]
): string {
  return JSON.stringify(
    items.map(([label, type, placeholder, required = true], idx) => ({
      id: `f_${idx + 1}`,
      label,
      type,
      required,
      placeholder,
      options: [],
    }))
  );
}

function sec(
  id: string,
  type: BuilderSection['type'],
  title: string,
  body = '',
  extras: Record<string, string> = {},
  bg = '#ffffff',
  align = 'Left',
  padding = '40',
  children?: BuilderSection[][]
): BuilderSection {
  const htmlClass = [
    'sys-pro-step',
    'sys-pro-clean-eyebrow',
    type === 'Stats' ? 'sys-pro-compact' : '',
    extras.htmlClass || '',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    id,
    type,
    content: { title, body, ...extras, htmlClass },
    styles: {
      backgroundColor: bg,
      padding,
      textAlign: align,
      typography: 'Default',
      customCss: '',
      visibility: 'All devices',
      animation: 'None',
    },
    ...(children ? { children } : {}),
  };
}

function childSec(
  id: string,
  type: BuilderSection['type'],
  title: string,
  body = '',
  extras: Record<string, string> = {},
  align = 'Left'
): BuilderSection {
  return {
    id,
    type,
    content: { title, body, ...extras },
    styles: {
      backgroundColor: 'transparent',
      padding: '0',
      textAlign: align,
      typography: 'Default',
      customCss: '',
      visibility: 'All devices',
      animation: 'None',
    },
  };
}

function cols3(
  idPrefix: string,
  sectionTitle: string,
  sectionBody: string,
  cards: [string, string][],
  bg = '#f8fafc',
  align: 'Left' | 'Right' | 'Center' = 'Left'
): BuilderSection {
  const cardAlign = align === 'Center' ? 'Left' : align;
  return sec(
    `${idPrefix}-cols`,
    'Columns',
    sectionTitle,
    sectionBody,
    { columnLayout: '3 Col (33/33/33)', gap: '20' },
    bg,
    align,
    '44',
    cards.map(([h, p], i) => [
      childSec(`${idPrefix}-h-${i}`, 'Heading', h, '', { headingTag: 'H3' }, cardAlign),
      childSec(`${idPrefix}-p-${i}`, 'Paragraph', '', p, {}, cardAlign),
    ])
  );
}

function tplPage(
  id: string,
  name: string,
  path: string,
  category: FunnelTemplateCategory,
  backgroundColor: string,
  sections: BuilderSection[],
  featuredImage = ''
): BuilderPage {
  return {
    id,
    name,
    status: 'Published',
    path,
    seoTitle: name,
    seoDescription: sections[0]?.content.body || '',
    headline: sections[0]?.content.title || name,
    subheadline: sections[0]?.content.body || '',
    cta: sections[0]?.content.button || 'Get Started',
    showHeader: false,
    header: 'Minimal header',
    showFooter: false,
    footer: 'Minimal footer',
    featuredImage,
    backgroundColor,
    isFunnelStep: true,
    templateSelected: true,
    stepCategory: category,
    sections,
  };
}

export const BUILTIN_GLOBAL_FUNNEL_TEMPLATES: GlobalFunnelTemplate[] = [
  // =========================================================================
  // 1. OPT-IN STEP TEMPLATES (3 Isolated Single-Step Designs)
  // =========================================================================
  {
    id: 'gft-optin-curiosity',
    category: 'Opt-in',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'The Curiosity Newsletter & Playbook Squeeze',
    title_ar: 'صفحة اشتراك النشرة البريدية والدليل المجاني',
    description_en:
      'High-converting emerald squeeze step with Western-digit proof strip, 3-pillar playbook breakdown, and clean opt-in card.',
    description_ar:
      'قالب خطوة اشتراك احترافي عالي التحويل لجمع البريد الإلكتروني وتقديم دليل مجاني مع إحصائيات ثقة وشهادات القراء.',
    tags_en: ['Single Step', 'Newsletter', 'Lead Magnet'],
    tags_ar: ['خطوة مستقلة', 'نشرة بريدية', 'اشتراك'],
    thumbnail: '/template-thumbnails/gft-optin-curiosity.jpg',
    useThumbnail: false,
    color: '#059669',
    accentBg: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    page_en: tplPage(
      'gft-optin-curiosity-en',
      'Opt-in Step',
      '/opt-in',
      'Opt-in',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'The 5-Minute Weekly Growth Playbook for Modern Founders',
          'Join 18,400+ founders and operators receiving one battle-tested acquisition & conversion framework every Tuesday — plus instant access to our 28-page Starter Swipe File.',
          {
            src: STEP_HERO_IMAGES.newsletter,
            image: STEP_HERO_IMAGES.newsletter,
            button: 'Unlock Free 28-Page Playbook →',
            destinationType: 'Scroll to Section',
            destination: 's-form',
          },
          '#064e3b',
          'Left'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '18,400+ Active Subscribers · 4.9/5 Verified Reader Rating · 19:59 Bonus Window · 100% Free Forever',
          },
          '#ecfdf5',
          'Center'
        ),
        cols3(
          's-pillars-en',
          'Inside Your Free Starter Playbook',
          'Three proven conversion frameworks you can deploy in under 30 minutes today.',
          [
            [
              '01 · Curiosity Hook Formulas',
              '15 tested headline structures that consistently lift squeeze-page opt-in rates above 42%.',
            ],
            [
              '02 · 5-Day Welcome Sequence',
              'Copy-and-paste automated email & WhatsApp scripts that turn cold subscribers into buyers.',
            ],
            [
              '03 · Real Funnel Teardowns',
              'Weekly step-by-step breakdowns with real metrics so you never guess what converts.',
            ],
          ],
          '#f8fafc',
          'Left'
        ),
        sec(
          's-form',
          'Form',
          'Where Should We Send Your Free Playbook?',
          'Enter your name and best email below for immediate access — zero spam, unsubscribe in 1 click.',
          {
            fields: JSON.stringify(['Name', 'Email']),
            customFields: customFieldsJson([
              ['First & Last Name', 'text', 'e.g. Alex Morgan', true],
              ['Best Email Address', 'email', 'you@company.com', true],
              ['WhatsApp Number (Optional Bonus)', 'tel', '+1 (555) 000-0000', false],
            ]),
            button: 'Send Me the Free Playbook →',
            successMessage: 'Check your inbox! Your 28-page playbook is ready.',
            destinationType: 'Next Step',
          },
          '#ffffff',
          'Center'
        ),
        sec(
          's-reviews',
          'Testimonials',
          'Trusted by 18,400+ Founders & Marketing Leaders',
          'Real results from operators applying these exact weekly frameworks.',
          {
            testimonials: JSON.stringify([
              {
                id: 'c-r1',
                author: 'Maya Lin',
                role: 'SaaS Co-Founder',
                quote:
                  'One headline tweak from Issue #14 lifted our squeeze-page conversion rate from 21% to 44% in 48 hours.',
                rating: 5,
                avatar: '',
              },
              {
                id: 'c-r2',
                author: 'Omar Al-Harbi',
                role: 'Growth Consultant',
                quote:
                  'Hands down the highest-signal 5 minutes in my inbox every Tuesday morning.',
                rating: 5,
                avatar: '',
              },
            ]),
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.newsletter
    ),
    page_ar: tplPage(
      'gft-optin-curiosity-ar',
      'صفحة الاشتراك',
      '/opt-in',
      'Opt-in',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'نشرة النمو الأسبوعية لرواد الأعمال وصنّاع القرار',
          'انضم إلى أكثر من 18,400 رائد أعمال يحصلون على استراتيجية نمو وتحويل عملية في 5 دقائق كل ثلاثاء — مع تحميل فوري لدليل النماذج التسويقية (28 صفحة) مجاناً.',
          {
            src: STEP_HERO_IMAGES.newsletter,
            image: STEP_HERO_IMAGES.newsletter,
            button: 'احصل على الدليل المجاني الآن ←',
            destinationType: 'Scroll to Section',
            destination: 's-form',
          },
          '#064e3b',
          'Right'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '18,400+ مشترك نشط · 4.9/5 تقييم القراء · 19:59 لتحميل الهدية الإضافية · 100% مجاناً بالكامل',
          },
          '#ecfdf5',
          'Center'
        ),
        cols3(
          's-pillars-ar',
          'ماذا ستجد داخل الدليل التطبيقي المجاني؟',
          'ثلاثة أطر عمل مجرّبة يمكنك تطبيقها على مشروعك في أقل من 30 دقيقة اليوم.',
          [
            [
              '01 · صيغ العناوين عالية التحويل',
              '15 قالب عنوان مجرّب يرفع نسبة التسجيل في صفحات الهبوط فوق 42% بدون زيادة ميزانية الإعلانات.',
            ],
            [
              '02 · سلسلة الترحيب لمدة 5 أيام',
              'رسائل متابعة جاهزة عبر البريد وواتساب تبني الثقة وتحوّل المشتركين الجدد إلى عملاء.',
            ],
            [
              '03 · تحليل مسارات ناجحة أسبوعياً',
              'دراسات حالة عملية بأرقام واضحة وخطوات مرتبة قابلة للتطبيق الفوري.',
            ],
          ],
          '#f8fafc',
          'Right'
        ),
        sec(
          's-form',
          'Form',
          'أين نرسل لك نسخة الدليل المجاني؟',
          'أدخل اسمك وبريدك الإلكتروني أدناه ليصلك رابط التحميل المباشر خلال ثوانٍ — خصوصية تامة 100%.',
          {
            fields: JSON.stringify(['Name', 'Email']),
            customFields: customFieldsJson([
              ['الاسم الكامل', 'text', 'مثال: أحمد المنصوري', true],
              ['البريد الإلكتروني', 'email', 'name@company.com', true],
              ['رقم الواتساب (اختياري لاستلام الملخص)', 'tel', '+966 50 000 0000', false],
            ]),
            button: 'أرسل لي الدليل المجاني الآن ←',
            successMessage: 'تم التسجيل بنجاح! تم تجهيز نسختك المجانية.',
            destinationType: 'Next Step',
          },
          '#ffffff',
          'Center'
        ),
        sec(
          's-reviews',
          'Testimonials',
          'آراء أكثر من 18,400 رائد أعمال ومشترك',
          'نتائج حقيقية لأصحاب مشاريع طبّقوا هذه النماذج العملية.',
          {
            testimonials: JSON.stringify([
              {
                id: 'c-r1',
                author: 'عمر الحربي',
                role: 'مستشار نمو وتسويق رقمي',
                quote:
                  'تعديل واحد على العنوان الرئيسي من العدد رقم 14 رفع نسبة التسجيل لدينا من 21% إلى 44% خلال 48 ساعة.',
                rating: 5,
                avatar: '',
              },
              {
                id: 'c-r2',
                author: 'ندى الشامسي',
                role: 'مؤسسة علامة تجارية رقمية',
                quote:
                  'أفضل 5 دقائق أقرؤها كل أسبوع؛ خطوات تطبيقية مركزة بدون أي حشو نظري.',
                rating: 5,
                avatar: '',
              },
            ]),
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.newsletter
    ),
  },
  {
    id: 'gft-optin-webmaven',
    category: 'Opt-in',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'SaaS Masterclass & Free Training Registration',
    title_ar: 'صفحة التسجيل في الورشة التدريبية المباشرة مجاناً',
    description_en:
      'Modern masterclass & webinar registration step with seat urgency metrics, 3-secret agenda, and instant seat reservation.',
    description_ar:
      'قالب خطوة تسجيل احترافي للورش التدريبية والويبينار المجاني مع محاور التدريب ونموذج حجز المقعد الفوري.',
    tags_en: ['Single Step', 'Masterclass', 'Webinar'],
    tags_ar: ['خطوة مستقلة', 'ورشة تدريبية', 'ويبينار'],
    thumbnail: '/template-thumbnails/gft-optin-webmaven.jpg',
    useThumbnail: false,
    color: '#0284c7',
    accentBg: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
    page_en: tplPage(
      'gft-optin-webmaven-en',
      'Masterclass Opt-in',
      '/webinar-register',
      'Opt-in',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'Free 45-Minute Masterclass: Automate Client Acquisition Without Cold Outreach',
          'Reserve your seat to see the exact conversion funnel & AI follow-up architecture generating 30+ qualified client bookings every month.',
          {
            src: STEP_HERO_IMAGES.masterclass,
            image: STEP_HERO_IMAGES.masterclass,
            button: 'Save My Free Seat Now →',
            destinationType: 'Scroll to Section',
            destination: 's-form',
          },
          '#0c4a6e',
          'Left'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '24 Live Seats Remaining · 45-Min Action Session · 98.4% Attendee Satisfaction · $0 Free Registration',
          },
          '#e0f2fe',
          'Center'
        ),
        cols3(
          's-agenda-en',
          'What You Will Learn In This Live Session',
          'Walk away with a complete blueprint — zero fluff, 100% actionable.',
          [
            [
              'Secret #1 · The 60-Second Offer Hook',
              'How to position your service or digital product so qualified prospects request access immediately.',
            ],
            [
              'Secret #2 · High-Velocity Conversion Steps',
              'Why focused single-purpose funnel steps outperform traditional websites by 3.1x.',
            ],
            [
              'Secret #3 · Instant WhatsApp & Email Sync',
              'Automate lead qualification within 30 seconds of opt-in without manual follow-up.',
            ],
          ],
          '#ffffff',
          'Left'
        ),
        sec(
          's-form',
          'Form',
          'Reserve Your Free Masterclass Seat',
          'Complete your registration below to receive your private watch link and downloadable workbook.',
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone']),
            customFields: customFieldsJson([
              ['Full Name', 'text', 'Enter your full name', true],
              ['Work Email Address', 'email', 'you@company.com', true],
              ['Mobile / WhatsApp (For Live Reminder)', 'tel', '+1 (555) 000-0000', true],
            ]),
            button: 'Confirm My Free Seat →',
            successMessage: 'Seat confirmed! Check your email for your private join link.',
            destinationType: 'Next Step',
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.masterclass
    ),
    page_ar: tplPage(
      'gft-optin-webmaven-ar',
      'تسجيل الورشة التدريبية',
      '/webinar-register',
      'Opt-in',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'ورشة تدريبية مجانية (45 دقيقة): كيف تبني نظام جذب عملاء آلي بدون ملاحقة يدوية',
          'احجز مقعدك المجاني لتتعرف عملياً على منظومة المسار الذكي والمتابعة التلقائية التي تولّد أكثر من 30 موعداً مؤهلاً شهرياً.',
          {
            src: STEP_HERO_IMAGES.masterclass,
            image: STEP_HERO_IMAGES.masterclass,
            button: 'احجز مقعدي المجاني الآن ←',
            destinationType: 'Scroll to Section',
            destination: 's-form',
          },
          '#0c4a6e',
          'Right'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '24 مقعداً متبقياً اليوم · 45 دقيقة تطبيقية مركزة · 98.4% نسبة رضا الحضور · $0 تسجيل مجاني بالكامل',
          },
          '#e0f2fe',
          'Center'
        ),
        cols3(
          's-agenda-ar',
          'أهم المحاور العملية التي ستتقنها في الورشة',
          'خطوات تطبيقية واضحة ومباشرة يمكنك تنفيذها فور انتهاء البث.',
          [
            [
              'المحور 01 · صياغة العرض الجاذب في 60 ثانية',
              'كيف تقدّم خدمتك أو دورتك بطريقة تدفع العميل المثالي للتسجيل وطلب التواصل فوراً.',
            ],
            [
              'المحور 02 · تصميم خطوات التحويل المركزة',
              'لماذا تتفوق صفحات الخطوة الواحدة الواضحة على المواقع التقليدية بمعدل 3.1x.',
            ],
            [
              'المحور 03 · الأتمتة الفورية عبر واتساب والبريد',
              'تأهيل العملاء المحتملين تلقائياً خلال 30 ثانية من لحظة التسجيل على مدار الساعة 24/7.',
            ],
          ],
          '#ffffff',
          'Right'
        ),
        sec(
          's-form',
          'Form',
          'أكّد حجز مقعدك المجاني في الورشة',
          'أدخل بياناتك أدناه لاستلام رابط البث المباشر وكتيّب التطبيق العملي فوراً.',
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone']),
            customFields: customFieldsJson([
              ['الاسم الكامل', 'text', 'اكتب اسمك الكامل', true],
              ['البريد الإلكتروني', 'email', 'name@company.com', true],
              ['رقم الجوال / واتساب (لتذكير البث)', 'tel', '+966 50 000 0000', true],
            ]),
            button: 'تأكيد المقعد المجاني الآن ←',
            successMessage: 'تم تأكيد مقعدك بنجاح! أرسلنا رابط الحضور إلى بريدك الإلكتروني.',
            destinationType: 'Next Step',
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.masterclass
    ),
  },
  {
    id: 'gft-optin-toolkit',
    category: 'Opt-in',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'AI & Agency Swipe-File Toolkit Opt-in',
    title_ar: 'صفحة تحميل حقيبة الأدوات والقوالب الجاهزة',
    description_en:
      'Sleek violet SaaS lead-magnet step designed for downloadable templates, checklists, calculators, and swipe bundles.',
    description_ar:
      'قالب خطوة استقطاب عملاء مخصص لتقديم القوالب الجاهزة وقوائم الفحص وحقائب الأدوات الرقمية مجاناً.',
    tags_en: ['Single Step', 'Toolkit', 'Templates'],
    tags_ar: ['خطوة مستقلة', 'حقيبة أدوات', 'قوالب جاهزة'],
    thumbnail: '/template-thumbnails/gft-optin-toolkit.jpg',
    useThumbnail: false,
    color: '#7c3aed',
    accentBg: 'linear-gradient(135deg, #2e1065 0%, #7c3aed 100%)',
    page_en: tplPage(
      'gft-optin-toolkit-en',
      'Toolkit Opt-in',
      '/free-toolkit',
      'Opt-in',
      '#faf5ff',
      [
        sec(
          's-hero',
          'Hero',
          'Download the Complete 2026 Funnel & Ad Copy Toolkit (Free)',
          'Get 25 plug-and-play landing page wireframes, 40 proven ad hooks, and 12 WhatsApp closing flows used by top digital agencies.',
          {
            src: STEP_HERO_IMAGES.toolkit,
            image: STEP_HERO_IMAGES.toolkit,
            button: 'Get Free Toolkit Access →',
            destinationType: 'Scroll to Section',
            destination: 's-form',
            htmlClass: 'sys-pro-hero-center',
          },
          '#2e1065',
          'Center'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items: '25+ Ready Wireframes · 40+ Ad Scripts · $197 Real Value · $0 Free Today',
          },
          '#f3e8ff',
          'Center'
        ),
        sec(
          's-values',
          'Core Values',
          'Everything Bundled Inside Your Instant Download',
          '25 Conversion Wireframes · 40 Direct-Response Ad Hooks · 12 WhatsApp Closing Sequences · Campaign ROI Calculator',
          {},
          '#ffffff',
          'Center'
        ),
        sec(
          's-form',
          'Form',
          'Send the Complete Toolkit Straight to My Inbox',
          'Enter your details below for immediate access to all editable files and templates.',
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone']),
            customFields: customFieldsJson([
              ['Full Name', 'text', 'Your full name', true],
              ['Work Email Address', 'email', 'you@agency.com', true],
              ['Phone / WhatsApp (Optional)', 'tel', '+1 (555) 000-0000', false],
            ]),
            button: 'Unlock Free Toolkit Now →',
            successMessage: 'Toolkit unlocked! Check your inbox for the download link.',
            destinationType: 'Next Step',
          },
          '#faf5ff',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.toolkit
    ),
    page_ar: tplPage(
      'gft-optin-toolkit-ar',
      'تحميل حقيبة الأدوات',
      '/free-toolkit',
      'Opt-in',
      '#faf5ff',
      [
        sec(
          's-hero',
          'Hero',
          'حمّل مجاناً حقيبة قوالب المسارات والإعلانات لعام 2026',
          'احصل على 25 مخطط صفحة هبوط جاهز، و40 نصاً إعلانياً عالي التحويل، و12 سيناريو إغلاق مبيعات عبر واتساب في ملف واحد منظم.',
          {
            src: STEP_HERO_IMAGES.toolkit,
            image: STEP_HERO_IMAGES.toolkit,
            button: 'احصل على الحقيبة المجانية فوراً ←',
            destinationType: 'Scroll to Section',
            destination: 's-form',
            htmlClass: 'sys-pro-hero-center',
          },
          '#2e1065',
          'Center'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items: '25+ مخطط صفحة جاهز · 40+ نص إعلاني مجرّب · $197 القيمة الفعلية · $0 مجاناً اليوم',
          },
          '#f3e8ff',
          'Center'
        ),
        sec(
          's-values',
          'Core Values',
          'محتويات الحقيبة الرقمية الكاملة الجاهزة للتطبيق',
          '25 مخطط مسار تحويلي · 40 صيغة إعلان ممول · 12 سيناريو مبيعات واتساب · حاسبة العائد الإعلاني ROI',
          {},
          '#ffffff',
          'Center'
        ),
        sec(
          's-form',
          'Form',
          'أرسل الحقيبة الكاملة مباشرة إلى بريدي الإلكتروني',
          'أدخل بياناتك أدناه لاستلام جميع القوالب والملفات القابلة للتعديل فوراً.',
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone']),
            customFields: customFieldsJson([
              ['الاسم الكامل', 'text', 'اكتب اسمك الكامل', true],
              ['البريد الإلكتروني للعمل', 'email', 'name@company.com', true],
              ['رقم الجوال / واتساب (اختياري)', 'tel', '+966 50 000 0000', false],
            ]),
            button: 'تحميل الحقيبة المجانية الآن ←',
            successMessage: 'تم تفعيل التحميل! أرسلنا نسخة كاملة إلى بريدك الإلكتروني.',
            destinationType: 'Next Step',
          },
          '#faf5ff',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.toolkit
    ),
  },

  // =========================================================================
  // 2. SALES STEP TEMPLATES (3 Isolated Single-Step Designs)
  // =========================================================================
  {
    id: 'gft-sales-flagship',
    category: 'Sales',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'Creator Flagship Course & Academy Sales Page',
    title_ar: 'صفحة مبيعات الدورات التدريبية والمنتجات الرقمية',
    description_en:
      'Long-form digital course sales step with Western-digit proof metrics, 3-module curriculum cards, social proof, pricing stack, and FAQ.',
    description_ar:
      'قالب خطوة مبيعات متكامل لعرض الدورات التدريبية والبرامج الرقمية مع شواهد الثقة والمحاور وباقة السعر والأسئلة الشائعة.',
    tags_en: ['Single Step', 'Course', 'Sales Page'],
    tags_ar: ['خطوة مستقلة', 'دورة تدريبية', 'صفحة مبيعات'],
    thumbnail: '/template-thumbnails/gft-sales-flagship.jpg',
    useThumbnail: false,
    color: '#6d28d9',
    accentBg: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 100%)',
    page_en: tplPage(
      'gft-sales-flagship-en',
      'Sales Step',
      '/sales',
      'Sales',
      '#ffffff',
      [
        sec(
          's-hero',
          'Hero',
          'Build, Launch & Scale Your Digital Course Business in 14 Days',
          'Stop stitching together 10 disconnected tools. Follow our step-by-step system to package your expertise, launch a high-converting offer, and automate daily enrollments.',
          {
            src: STEP_HERO_IMAGES.courseSales,
            image: STEP_HERO_IMAGES.courseSales,
            button: 'Enroll Now & Save 50% ($197) →',
            destinationType: 'Scroll to Section',
            destination: 's-pricing',
          },
          '#1e1b4b',
          'Left'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '2,400+ Enrolled Creators · 4.9/5 Graduate Rating · 14:59 Launch Offer · 14-Day Money-Back Guarantee',
          },
          '#f5f3ff',
          'Center'
        ),
        cols3(
          's-curriculum-en',
          'Inside the Step-by-Step Implementation Curriculum',
          'Engineered for creators, coaches, and educators who want fast, measurable execution.',
          [
            [
              'Module 01 · Irresistible Offer Architecture',
              'Structure your curriculum, bonuses, and pricing tiers so ideal students see 10x value immediately.',
            ],
            [
              'Module 02 · High-Converting Funnel Launch',
              'Deploy proven bilingual sales, checkout, and confirmation pages without writing a line of code.',
            ],
            [
              'Module 03 · Automated Follow-Up & Scaling',
              'Recover undecided visitors and onboard new students 24/7 with WhatsApp and email sequences.',
            ],
          ],
          '#ffffff',
          'Left'
        ),
        sec(
          's-reviews',
          'Testimonials',
          'Trusted by Over 2,400 Course Creators & Coaches',
          'Verified outcomes from creators across 40+ industries.',
          {
            testimonials: JSON.stringify([
              {
                id: 'r1',
                author: 'Sarah Jenkins',
                role: 'Digital Academy Founder',
                quote:
                  'We launched our flagship program in one afternoon and crossed $12,600 in student enrollments during week one.',
                rating: 5,
                avatar: '',
              },
              {
                id: 'r2',
                author: 'Karim Mansour',
                role: 'Business Mentor',
                quote:
                  'The cleanest sales layout we have ever used for both English and Arabic cohorts — mobile conversions doubled.',
                rating: 5,
                avatar: '',
              },
            ]),
          },
          '#f8fafc',
          'Center'
        ),
        sec(
          's-pricing',
          'Pricing',
          'Simple One-Time Enrollment · Lifetime Access',
          'Lock in founding cohort pricing backed by our 14-day 100% money-back guarantee.',
          {
            plans: JSON.stringify([
              {
                id: 'p-course',
                name: 'Complete Creator Accelerator + Bonus Pack',
                price: '$197',
                period: 'one-time',
                features: [
                  '6 HD Implementation Modules & Action Workbooks',
                  '12 Ready-to-Use Funnel, Checkout & Email Templates',
                  'Private Creator Community & Weekly Live Q&A',
                  '14-Day 100% No-Questions-Asked Refund Guarantee',
                ],
                button: 'Enroll Now ($197) →',
                highlighted: true,
              },
            ]),
            destinationType: 'Next Step',
          },
          '#ffffff',
          'Center'
        ),
        sec(
          's-faq',
          'FAQ',
          'Frequently Asked Questions',
          'Everything you need to know before joining today.',
          {
            questions: JSON.stringify([
              {
                id: 'q1',
                question: 'How quickly do I receive access after enrolling?',
                answer:
                  'Immediately! Your member portal credentials and bonus templates arrive in your inbox within 60 seconds.',
              },
              {
                id: 'q2',
                question: 'Is my enrollment protected by a money-back guarantee?',
                answer:
                  'Yes — try the entire curriculum for 14 days, and if you are not thrilled, request a full 100% refund in one click.',
              },
            ]),
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.courseSales
    ),
    page_ar: tplPage(
      'gft-sales-flagship-ar',
      'صفحة المبيعات',
      '/sales',
      'Sales',
      '#ffffff',
      [
        sec(
          's-hero',
          'Hero',
          'أطلق وضاعف مبيعات دورتك ومنتجك الرقمي خلال 14 يوماً فقط',
          'ودّع الأدوات المعقدة والمتفرقة. اتبع منهجيتنا العملية لتحويل خبرتك إلى برنامج رقمي عالي القيمة وإطلاق نظام مبيعات يعمل على مدار الساعة.',
          {
            src: STEP_HERO_IMAGES.courseSales,
            image: STEP_HERO_IMAGES.courseSales,
            button: 'اشترك الآن بخصم 50% ($197) ←',
            destinationType: 'Scroll to Section',
            destination: 's-pricing',
          },
          '#1e1b4b',
          'Right'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '2,400+ مدرب ومشترك · 4.9/5 تقييم الخريجين · 14:59 لانتهاء عرض الإطلاق · 14-Day ضمان استرداد كامل',
          },
          '#f5f3ff',
          'Center'
        ),
        cols3(
          's-curriculum-ar',
          'المحاور التطبيقية داخل البرنامج خطوة بخطوة',
          'مصمم خصيصاً للمدربين وصنّاع المحتوى وأصحاب الخبرات الباحثين عن تطبيق عملي ونتائج ملموسة.',
          [
            [
              'الوحدة 01 · هندسة العرض والتسعير الذكي',
              'صمّم هيكل برنامجك والمكافآت الإضافية بحيث يدرك العميل القيمة الحقيقية لعرضك من اللحظة الأولى.',
            ],
            [
              'الوحدة 02 · بناء وإطلاق صفحات التحويل',
              'أطلق صفحات بيع ودفع وتأكيد متجاوبة بالكامل بالعربية والإنجليزية دون أي تعقيد تقني.',
            ],
            [
              'الوحدة 03 · أتمتة المتابعة ومضاعفة المبيعات',
              'استرجع الزوار المترددين ورحّب بالمشتركين الجدد تلقائياً على مدار 24/7 عبر واتساب والبريد.',
            ],
          ],
          '#ffffff',
          'Right'
        ),
        sec(
          's-reviews',
          'Testimonials',
          'قصص نجاح أكثر من 2,400 مدرب وصانع محتوى',
          'نتائج حقيقية موثّقة من مشتركين في أكثر من 40 مجالاً.',
          {
            testimonials: JSON.stringify([
              {
                id: 'r1',
                author: 'سارة المنصوري',
                role: 'مؤسسة أكاديمية تدريبية',
                quote:
                  'أطلقنا دورتنا الرئيسية خلال يوم واحد وتجاوزت المبيعات $12,600 في الأسبوع الأول للإطلاق.',
                rating: 5,
                avatar: '',
              },
              {
                id: 'r2',
                author: 'كريم حسن',
                role: 'مستشار تطوير أعمال',
                quote:
                  'أوضح وأجمل تصميم صفحة مبيعات استخدمناه لحملاتنا بالعربية والإنجليزية — تضاعف التحويل من الجوال.',
                rating: 5,
                avatar: '',
              },
            ]),
          },
          '#f8fafc',
          'Center'
        ),
        sec(
          's-pricing',
          'Pricing',
          'استثمار لمرة واحدة · وصول فوري مدى الحياة',
          'احتفظ بسعر دفعة الإطلاق الحصري المشمول بضمان استرداد الأموال بنسبة 100% لمدة 14 يوماً.',
          {
            plans: JSON.stringify([
              {
                id: 'p-course',
                name: 'مسرّعة صنّاع الدورات المتكاملة + باقة الهدايا',
                price: '$197',
                period: 'دفعة واحدة',
                features: [
                  '6 وحدات فيديو تطبيقية عالية الدقة مع أوراق العمل',
                  '12 قالب صفحات مبيعات ودفع ورسائل متابعة جاهزة',
                  'مجتمع خاص للأعضاء ولقاءات إرشاد أسبوعية مباشرة',
                  'ضمان استرجاع الأموال 100% لمدة 14 يوماً دون شروط',
                ],
                button: 'انضم للبرنامج الآن ($197) ←',
                highlighted: true,
              },
            ]),
            destinationType: 'Next Step',
          },
          '#ffffff',
          'Center'
        ),
        sec(
          's-faq',
          'FAQ',
          'الأسئلة الشائعة قبل الانضمام',
          'إجابات واضحة ومباشرة على كل استفساراتك.',
          {
            questions: JSON.stringify([
              {
                id: 'q1',
                question: 'متى أحصل على صلاحية الدخول للبرنامج والقوالب؟',
                answer:
                  'فوراً! تصلك بيانات الدخول إلى البوابة وجميع القوالب المرفقة إلى بريدك الإلكتروني خلال 60 ثانية.',
              },
              {
                id: 'q2',
                question: 'هل اشتراكي مشمول بضمان استرداد الأموال؟',
                answer:
                  'بالتأكيد — يمكنك تجربة البرنامج كاملاً لمدة 14 يوماً واسترداد المبلغ 100% بنقرة واحدة إذا لم يناسبك.',
              },
            ]),
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.courseSales
    ),
  },
  {
    id: 'gft-sales-service',
    category: 'Sales',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'High-Ticket Agency & Done-For-You Service Sales Page',
    title_ar: 'صفحة مبيعات خدمات الوكالات والتنفيذ المتكامل',
    description_en:
      'Executive consulting & agency sales step pairing ROI metrics, 3-phase deliverables, client proof, and transparent sprint pricing.',
    description_ar:
      'قالب خطوة مبيعات تنفيذي للوكالات ومقدمي الخدمات لعرض العائد والمخرجات وباقات التعاقد بوضوح.',
    tags_en: ['Single Step', 'Agency', 'High-Ticket'],
    tags_ar: ['خطوة مستقلة', 'وكالة', 'خدمات احترافية'],
    thumbnail: '/template-thumbnails/gft-sales-service.jpg',
    useThumbnail: false,
    color: '#0d9488',
    accentBg: 'linear-gradient(135deg, #134e4a 0%, #0d9488 100%)',
    page_en: tplPage(
      'gft-sales-service-en',
      'Agency Sales Step',
      '/agency-offer',
      'Sales',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'Scale Your Client Pipeline With a Turnkey Conversion System Built in 14 Days',
          'Our senior strategists, direct-response copywriters, and UI designers architect, write, and launch your client acquisition engine end-to-end.',
          {
            src: STEP_HERO_IMAGES.agencySales,
            image: STEP_HERO_IMAGES.agencySales,
            button: 'Claim Your Implementation Slot →',
            destinationType: 'Scroll to Section',
            destination: 's-pricing',
          },
          '#134e4a',
          'Left'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '$14.2M+ Client Pipeline · 14-Day Launch Sprint · 3.8x Avg ROAS Lift · 4 Slots Available This Month',
          },
          '#f0fdfa',
          'Center'
        ),
        cols3(
          's-deliv-en',
          'Our 3-Phase Turnkey Delivery Process',
          'We handle strategy, copywriting, design, and CRM automation while you focus on closing.',
          [
            [
              '01 · Offer & Positioning Architecture',
              'We refine your core value proposition, tier pricing, and risk-reversal angle for maximum executive trust.',
            ],
            [
              '02 · Custom Copy & Responsive UI',
              'Bespoke bilingual conversion copywriting paired with fast, mobile-first SaaS page layouts.',
            ],
            [
              '03 · CRM, Payment & Follow-Up Sync',
              'Stripe checkout, pipeline routing, and automated WhatsApp + email sequences tested end-to-end.',
            ],
          ],
          '#ffffff',
          'Left'
        ),
        sec(
          's-pricing',
          'Pricing',
          'Transparent Implementation Packages',
          'Choose your sprint tier to reserve your onboarding kickoff this week.',
          {
            plans: JSON.stringify([
              {
                id: 'p1',
                name: 'Growth Funnel Sprint',
                price: '$990',
                period: 'one-time',
                features: [
                  'Complete Conversion Landing & Checkout Design',
                  'Bilingual Direct-Response Copywriting (EN & AR)',
                  'CRM Pipeline + Automated Follow-Up Integration',
                  '14-Day On-Time Launch Guarantee',
                ],
                button: 'Select Growth Sprint ($990) →',
                highlighted: true,
              },
              {
                id: 'p2',
                name: 'Enterprise Revenue Partner',
                price: '$2,400',
                period: 'one-time',
                features: [
                  'Everything in Growth Sprint + Custom Ad Creatives',
                  'Dedicated Senior Conversion Strategist',
                  '30-Day A/B Split Testing & Conversion Optimization',
                  'Priority Slack & WhatsApp Executive Channel',
                ],
                button: 'Select Enterprise Tier ($2,400) →',
                highlighted: false,
              },
            ]),
            destinationType: 'Next Step',
          },
          '#f8fafc',
          'Center'
        ),
        sec(
          's-reviews',
          'Testimonials',
          'What B2B & Agency Partners Say',
          '',
          {
            testimonials: JSON.stringify([
              {
                id: 'sv-r1',
                author: 'Tariq Al-Zahrani',
                role: 'Managing Partner, Apex Advisory',
                quote:
                  'They delivered our bilingual conversion page in 11 days and our cost per qualified consultation dropped by 54%.',
                rating: 5,
                avatar: '',
              },
              {
                id: 'sv-r2',
                author: 'Claire Donovan',
                role: 'Founder, ScaleOps Studio',
                quote:
                  'Paid for itself within 9 days of launch — executive design quality and zero technical headaches.',
                rating: 5,
                avatar: '',
              },
            ]),
          },
          '#ffffff',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.agencySales
    ),
    page_ar: tplPage(
      'gft-sales-service-ar',
      'صفحة مبيعات الخدمات',
      '/agency-offer',
      'Sales',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'ضاعف عملاءك ومبيعاتك مع خدمة بناء منظومة التحويل المتكاملة خلال 14 يوماً',
          'يتولى فريقنا من خبراء الاستراتيجية وكتّاب المحتوى البيعي والمصممين هندسة وكتابة وإطلاق نظام استقطاب العملاء الخاص بك بالكامل.',
          {
            src: STEP_HERO_IMAGES.agencySales,
            image: STEP_HERO_IMAGES.agencySales,
            button: 'احجز مقعد التنفيذ لمشروعك الآن ←',
            destinationType: 'Scroll to Section',
            destination: 's-pricing',
          },
          '#134e4a',
          'Right'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '$14.2M+ مبيعات محققة لعملائنا · 14-Day مدة التنفيذ والإطلاق · 3.8x متوسط مضاعفة العائد · 4 مقاعد متاحة هذا الشهر',
          },
          '#f0fdfa',
          'Center'
        ),
        cols3(
          's-deliv-ar',
          'منهجية التنفيذ المتكامل في 3 مراحل واضحة',
          'نتولى عنك التخطيط والكتابة والتصميم والأتمتة بالكامل لتتفرغ لإدارة ونمو أعمالك.',
          [
            [
              '01 · هندسة العرض والتسعير التنافسي',
              'نطوّر هيكلة عرضك وباقاتك وعناصر الضمان لرفع ثقة العميل ومضاعفة معدل اتخاذ القرار.',
            ],
            [
              '02 · كتابة محتوى إقناعي وتصميم متجاوب',
              'نصوص بيعية احترافية بالعربية والإنجليزية مع واجهة عصرية فائقة السرعة على الجوال وسطح المكتب.',
            ],
            [
              '03 · ربط الدفع وCRM والمتابعة الآلية',
              'تهيئة بوابات الدفع وتوجيه العملاء تلقائياً وتفعيل رسائل المتابعة عبر واتساب والبريد الإلكتروني.',
            ],
          ],
          '#ffffff',
          'Right'
        ),
        sec(
          's-pricing',
          'Pricing',
          'باقات تنفيذ واضحة وشفافة بدون تكاليف خفية',
          'اختر الباقة المناسبة لمرحلة نمو شركتك وابدأ جلسة الانطلاق هذا الأسبوع.',
          {
            plans: JSON.stringify([
              {
                id: 'p1',
                name: 'باقة إطلاق منظومة النمو المتكاملة',
                price: '$990',
                period: 'دفعة واحدة',
                features: [
                  'تصميم وبناء صفحات العرض والدفع الاحترافية',
                  'كتابة محتوى تسويقي بيعي مخصص (عربي وإنجليزي)',
                  'ربط نظام CRM وأتمتة متابعة واتساب والبريد',
                  'ضمان التسليم والإطلاق الكامل خلال 14 يوماً',
                ],
                button: 'اختر باقة النمو ($990) ←',
                highlighted: true,
              },
              {
                id: 'p2',
                name: 'باقة الشريك التنفيذي للشركات',
                price: '$2,400',
                period: 'دفعة واحدة',
                features: [
                  'كل مزايا باقة النمو + كتابة نصوص الحملات الإعلانية',
                  'مستشار استراتيجي مخصص لإدارة الإطلاق',
                  '30 يوماً من اختبارات A/B وتحسين معدل التحويل',
                  'قناة تواصل مباشرة ذات أولوية عبر واتساب',
                ],
                button: 'اختر الباقة التنفيذية ($2,400) ←',
                highlighted: false,
              },
            ]),
            destinationType: 'Next Step',
          },
          '#f8fafc',
          'Center'
        ),
        sec(
          's-reviews',
          'Testimonials',
          'تجارب عملائنا من الشركات ومقدمي الخدمات',
          '',
          {
            testimonials: JSON.stringify([
              {
                id: 'sv-r1',
                author: 'طارق الزهراني',
                role: 'الشريك الإداري، أبيكس للاستشارات',
                quote:
                  'استلمنا منظومة التحويل المتكاملة خلال 11 يوماً فقط وانخفضت تكلفة الحصول على الاستشارة المؤهلة بنسبة 54%.',
                rating: 5,
                avatar: '',
              },
              {
                id: 'sv-r2',
                author: 'دانة المهيري',
                role: 'المديرة التنفيذية، ستوديو نمو',
                quote:
                  'استردينا تكلفة الباقة بالكامل خلال أول 9 أيام من الإطلاق بفضل جودة التصميم ووضوح رحلة العميل.',
                rating: 5,
                avatar: '',
              },
            ]),
          },
          '#ffffff',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.agencySales
    ),
  },
  {
    id: 'gft-sales-saas-offer',
    category: 'Sales',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'Modern SaaS & Membership Founding Offer Page',
    title_ar: 'صفحة العرض الحصري للاشتراكات والأنظمة السحابية',
    description_en:
      'Crisp blue SaaS & membership sales step with uptime/savings metrics, replaced-tools value grid, and founding member plans.',
    description_ar:
      'قالب خطوة مبيعات عصري مخصص للبرمجيات السحابية SaaS والعضويات الشهرية والسنوية مع إبراز التوفير والمزايا.',
    tags_en: ['Single Step', 'SaaS', 'Membership'],
    tags_ar: ['خطوة مستقلة', 'نظام سحابي', 'عضوية'],
    thumbnail: '/template-thumbnails/gft-sales-saas-offer.jpg',
    useThumbnail: false,
    color: '#2563eb',
    accentBg: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)',
    page_en: tplPage(
      'gft-sales-saas-offer-en',
      'SaaS Offer Step',
      '/founding-offer',
      'Sales',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'Automate Leads, Bookings & Payments From One Unified Workspace',
          'Lock in Founding Member access today and consolidate your landing pages, CRM pipeline, AI follow-up, and client billing in under 15 minutes.',
          {
            src: STEP_HERO_IMAGES.saasOffer,
            image: STEP_HERO_IMAGES.saasOffer,
            button: 'Claim Founding Member Offer ($49/mo) →',
            destinationType: 'Scroll to Section',
            destination: 's-pricing',
          },
          '#0f172a',
          'Left'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '99.98% Cloud Uptime · 3,200+ Active Teams · $420/Yr Founding Savings · 14-Day Risk-Free Trial',
          },
          '#eff6ff',
          'Center'
        ),
        sec(
          's-values',
          'Core Values',
          'Four Disconnected Subscriptions Replaced Inside One Platform',
          'Unlimited Pages & Funnels · Visual CRM Pipeline · AI WhatsApp & Email Follow-Up · Instant Stripe & Card Billing',
          {},
          '#ffffff',
          'Center'
        ),
        sec(
          's-pricing',
          'Pricing',
          'Founding Member Plans — Rate Locked For Life',
          'Upgrade your entire growth stack for less than a single legacy marketing add-on.',
          {
            plans: JSON.stringify([
              {
                id: 'p-saas-m',
                name: 'Pro Growth Workspace',
                price: '$49',
                period: 'month',
                features: [
                  'Unlimited Pages, Funnels & Lead Forms',
                  'Native Bilingual AR (RTL) & EN (LTR) Rendering',
                  'Automated CRM & Multi-Channel Follow-Up',
                  'Priority White-Glove Onboarding Support',
                ],
                button: 'Start Pro Monthly ($49/mo) →',
                highlighted: true,
              },
              {
                id: 'p-saas-y',
                name: 'Annual Scale Plan (2 Months Free)',
                price: '$490',
                period: 'year',
                features: [
                  'Everything in Pro Growth Workspace',
                  'Save $98 Instantly With Annual Billing',
                  'Dedicated Domain + Custom SSL Provisioning',
                  '1-on-1 Migration & Funnel Audit Call',
                ],
                button: 'Start Annual Scale ($490/yr) →',
                highlighted: false,
              },
            ]),
            destinationType: 'Next Step',
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.saasOffer
    ),
    page_ar: tplPage(
      'gft-sales-saas-offer-ar',
      'صفحة عرض SaaS',
      '/founding-offer',
      'Sales',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'أدر مسارات البيع والعملاء والمدفوعات من منصة ذكية واحدة',
          'احصل على عضوية المؤسسين اليوم واجمع صفحات الهبوط ونظام CRM والمتابعة الذكية والتحصيل الإلكتروني في أقل من 15 دقيقة.',
          {
            src: STEP_HERO_IMAGES.saasOffer,
            image: STEP_HERO_IMAGES.saasOffer,
            button: 'فعّل عرض المؤسسين ($49/شهرياً) ←',
            destinationType: 'Scroll to Section',
            destination: 's-pricing',
          },
          '#0f172a',
          'Right'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '99.98% استقرار السحابة · 3,200+ فريق عمل نشط · $420 وفورات سنوية · 14-Day تجربة مضمونة',
          },
          '#eff6ff',
          'Center'
        ),
        sec(
          's-values',
          'Core Values',
          'استغنِ عن 4 اشتراكات منفصلة داخل منصة واحدة متكاملة',
          'صفحات ومسارات غير محدودة · إدارة عملاء CRM مرئية · أتمتة واتساب والبريد بالذكاء الاصطناعي · تحصيل مدفوعات فوري',
          {},
          '#ffffff',
          'Center'
        ),
        sec(
          's-pricing',
          'Pricing',
          'باقات الأعضاء المؤسسين — سعر ثابت مدى الحياة',
          'طوّر منظومة مبيعاتك بالكامل بتكلفة أقل من أداة تسويق تقليدية واحدة.',
          {
            plans: JSON.stringify([
              {
                id: 'p-saas-m',
                name: 'الباقة الاحترافية الشاملة للنمو',
                price: '$49',
                period: 'شهرياً',
                features: [
                  'عدد غير محدود من الصفحات والمسارات والنماذج',
                  'دعم أصيل ومتكامل للعربية (RTL) والإنجليزية (LTR)',
                  'أتمتة متابعة العملاء عبر واتساب والبريد الإلكتروني',
                  'دعم فني وتهيئة سريعة ذات أولوية',
                ],
                button: 'ابدأ الباقة الشهرية ($49) ←',
                highlighted: true,
              },
              {
                id: 'p-saas-y',
                name: 'الباقة السنوية للأعمال (شهران مجاناً)',
                price: '$490',
                period: 'سنوياً',
                features: [
                  'جميع مزايا الباقة الاحترافية الشاملة',
                  'توفير فوري بقيمة $98 مع الفوترة السنوية',
                  'ربط دومين مخصص مع شهادة أمان SSL تلقائية',
                  'جلسة فردية مجانية لنقل ومراجعة أعمالك',
                ],
                button: 'ابدأ الباقة السنوية ($490) ←',
                highlighted: false,
              },
            ]),
            destinationType: 'Next Step',
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.saasOffer
    ),
  },

  // =========================================================================
  // 3. ORDER FORM STEP TEMPLATES (2 Isolated Single-Step Designs)
  // =========================================================================
  {
    id: 'gft-order-purchase',
    category: 'Order Form',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'Direct Purchase Two-Step Order Form ($79.99)',
    title_ar: 'نموذج الطلب والدفع المباشر عالي التحويل ($79.99)',
    description_en:
      'High-trust two-step checkout page with price-lock stats, $397 value stack breakdown, buyer details form, and SSL payment card.',
    description_ar:
      'قالب خطوة نموذج طلب ودفع إلكتروني مصمم لرفع معدل إتمام الشراء مع ملخص القيمة وبيانات العميل والدفع المشفّر.',
    tags_en: ['Single Step', 'Checkout', 'Order Form'],
    tags_ar: ['خطوة مستقلة', 'نموذج طلب', 'دفع آمن'],
    thumbnail: '/template-thumbnails/gft-order-purchase.jpg',
    useThumbnail: false,
    color: '#4f46e5',
    accentBg: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
    page_en: tplPage(
      'gft-order-purchase-en',
      'Order Form Step',
      '/order-form',
      'Order Form',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'Complete Your Secure Order — Instant Digital Access ($79.99)',
          'Your special launch price of $79.99 (regularly $199) is locked for 14:59 minutes. Complete Steps 1 & 2 below for instant portal delivery.',
          {
            src: STEP_HERO_IMAGES.orderCheckout,
            image: STEP_HERO_IMAGES.orderCheckout,
            button: 'Jump to Express Checkout ↓',
            destinationType: 'Scroll to Section',
            destination: 's-form',
            htmlClass: 'sys-pro-hero-center',
          },
          '#1e1b4b',
          'Center'
        ),
        sec(
          's-trust',
          'Stats',
          '',
          '',
          {
            items:
              '14:59 Price Lock · 256-Bit SSL Encryption · <60s Instant Access · 14-Day Money-Back Guarantee',
          },
          '#eef2ff',
          'Center'
        ),
        sec(
          's-stack',
          'Core Values',
          'Everything Unlocked Immediately With Your Order ($397 Value)',
          'Complete Mastery Program ($199) · Ready-Made Templates Pack ($99) · Quick-Start Action Checklist ($49) · Lifetime Updates ($50)',
          {},
          '#ffffff',
          'Center'
        ),
        sec(
          's-form',
          'Form',
          'Step 1 · Customer Contact & Delivery Details',
          'Where should we send your instant login credentials and official tax invoice?',
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone']),
            customFields: customFieldsJson([
              ['Full Billing Name', 'text', 'Alex Morgan', true],
              ['Email Address (For Instant Access)', 'email', 'alex@company.com', true],
              ['Mobile / WhatsApp Number', 'tel', '+1 (555) 234-5678', true],
            ]),
            button: 'Verify Details & Continue →',
            successMessage: 'Customer details verified! Complete payment below.',
            destinationType: 'Next Step',
          },
          '#f8fafc',
          'Center'
        ),
        sec(
          's-pay',
          'Payment',
          'Step 2 · Encrypted Order Summary & Payment',
          '256-bit SSL encrypted checkout backed by our 14-day 100% satisfaction guarantee.',
          {
            productId: 'Complete Mastery Bundle (Instant Access)',
            price: '$79.99',
            currency: '$',
            gateway: 'Stripe · Visa / Mastercard / Apple Pay',
            button: 'Complete Secure Order ($79.99) →',
            destinationType: 'Next Step',
          },
          '#ffffff',
          'Center'
        ),
        sec(
          's-reviews',
          'Testimonials',
          'Verified Buyer Feedback',
          '',
          {
            testimonials: JSON.stringify([
              {
                id: 'op-r1',
                author: 'Hannah Brooks',
                role: 'Verified Buyer',
                quote:
                  'Received my login email 10 seconds after checkout and deployed the templates the very same evening!',
                rating: 5,
                avatar: '',
              },
              {
                id: 'op-r2',
                author: 'Youssef Nabil',
                role: 'E-Commerce Founder',
                quote:
                  'Super smooth mobile checkout — clear summary, zero hidden fees, and instant portal activation.',
                rating: 5,
                avatar: '',
              },
            ]),
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.orderCheckout
    ),
    page_ar: tplPage(
      'gft-order-purchase-ar',
      'نموذج الطلب',
      '/order-form',
      'Order Form',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'إتمام الطلب الآمن — تفعيل ووصول فوري ($79.99)',
          'سعر العرض الخاص $79.99 (بدلاً من $199) محجوز لك لمدة 14:59 دقيقة. أكمل الخطوتين 1 و2 أدناه لاستلام حسابك فوراً.',
          {
            src: STEP_HERO_IMAGES.orderCheckout,
            image: STEP_HERO_IMAGES.orderCheckout,
            button: 'انتقل لنموذج الدفع السريع ↓',
            destinationType: 'Scroll to Section',
            destination: 's-form',
            htmlClass: 'sys-pro-hero-center',
          },
          '#1e1b4b',
          'Center'
        ),
        sec(
          's-trust',
          'Stats',
          '',
          '',
          {
            items:
              '14:59 لتثبيت السعر · 256-Bit تشفير دفع SSL · <60s تفعيل فوري للحساب · 14-Day ضمان استرداد كامل',
          },
          '#eef2ff',
          'Center'
        ),
        sec(
          's-stack',
          'Core Values',
          'كل ما ستحصل عليه فور إتمام الطلب اليوم (بقيمة إجمالية $397)',
          'البرنامج التدريبي الشامل ($199) · حقيبة القوالب الجاهزة ($99) · قائمة التطبيق السريع ($49) · تحديثات مجانية مدى الحياة ($50)',
          {},
          '#ffffff',
          'Center'
        ),
        sec(
          's-form',
          'Form',
          'الخطوة 1 · بيانات العميل واستلام الحساب',
          'أدخل بياناتك الصحيحة لإرسال تفاصيل الدخول الفوري والفاتورة الضريبية الرسمية.',
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone']),
            customFields: customFieldsJson([
              ['الاسم الكامل (كما يظهر في الفاتورة)', 'text', 'أحمد المنصوري', true],
              ['البريد الإلكتروني لتفعيل الحساب', 'email', 'ahmed@company.com', true],
              ['رقم الجوال / واتساب', 'tel', '+966 50 000 0000', true],
            ]),
            button: 'تأكيد بيانات الاستلام والمتابعة ←',
            successMessage: 'تم التحقق من بياناتك بنجاح! أكمل الدفع أدناه.',
            destinationType: 'Next Step',
          },
          '#f8fafc',
          'Center'
        ),
        sec(
          's-pay',
          'Payment',
          'الخطوة 2 · ملخص الطلب والدفع الإلكتروني المشفّر',
          'عملية دفع محمية بتشفير 256-Bit SSL ومشمولة بضمان استرداد الأموال 100% لمدة 14 يوماً.',
          {
            productId: 'الباقة الاحترافية الشاملة (تفعيل فوري)',
            price: '$79.99',
            currency: '$',
            gateway: 'Stripe · مدى / فيزا / ماستركارد / Apple Pay',
            button: 'إتمام الشراء بأمان ($79.99) ←',
            destinationType: 'Next Step',
          },
          '#ffffff',
          'Center'
        ),
        sec(
          's-reviews',
          'Testimonials',
          'تجارب المشترين الموثّقة',
          '',
          {
            testimonials: JSON.stringify([
              {
                id: 'op-r1',
                author: 'ريم العتيبي',
                role: 'مشتركة موثّقة',
                quote:
                  'وصلتني بيانات الدخول خلال 10 ثوانٍ من إتمام الدفع وبدأت تطبيق القوالب في نفس المساء!',
                rating: 5,
                avatar: '',
              },
              {
                id: 'op-r2',
                author: 'يوسف نبيل',
                role: 'مؤسس متجر إلكتروني',
                quote:
                  'تجربة دفع سلسة جداً على الجوال — ملخص واضح وتفعيل فوري للبوابة بدون أي تعقيد.',
                rating: 5,
                avatar: '',
              },
            ]),
          },
          '#f8fafc',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.orderCheckout
    ),
  },
  {
    id: 'gft-order-coaching',
    category: 'Order Form',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'Executive Coaching & VIP Bundle Checkout',
    title_ar: 'نموذج طلب باقة الاستشارات والعضوية التنفيذية',
    description_en:
      'Executive coaching & VIP bundle order step featuring deliverables stack, member registration form, and encrypted Stripe checkout.',
    description_ar:
      'قالب خطوة نموذج طلب راقٍ لبرامج الاستشارات والتدريب التنفيذي والعضويات الخاصة مع قائمة المزايا والدفع الآمن.',
    tags_en: ['Single Step', 'Coaching', 'VIP Checkout'],
    tags_ar: ['خطوة مستقلة', 'استشارات', 'عضوية خاصة'],
    thumbnail: '/template-thumbnails/gft-order-coaching.jpg',
    useThumbnail: false,
    color: '#2563eb',
    accentBg: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    page_en: tplPage(
      'gft-order-coaching-en',
      'VIP Order Step',
      '/vip-checkout',
      'Order Form',
      '#eff6ff',
      [
        sec(
          's-hero',
          'Hero',
          'Founder Coaching Accelerator — VIP Member Checkout ($297)',
          'Complete your enrollment below to unlock instant VIP portal access plus your private 60-minute 1-on-1 kickoff roadmap call.',
          {
            src: STEP_HERO_IMAGES.orderCoaching,
            image: STEP_HERO_IMAGES.orderCoaching,
            button: 'Complete VIP Registration ↓',
            destinationType: 'Scroll to Section',
            destination: 's-form',
            htmlClass: 'sys-pro-hero-center',
          },
          '#1e3a8a',
          'Center'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '60-Min 1-on-1 Roadmap Call · 52x Live Weekly Sessions · 256-Bit SSL Checkout · 14-Day Guarantee',
          },
          '#dbeafe',
          'Center'
        ),
        sec(
          's-values',
          'Core Values',
          'Everything Included Inside Your VIP Enrollment',
          'Private 60-Min Strategy Call · Weekly Live Office Hours · Done-For-You Funnel Templates · Private Founder Network',
          {},
          '#ffffff',
          'Center'
        ),
        sec(
          's-form',
          'Form',
          'Step 1 · VIP Member Registration',
          'Enter your executive contact details to provision your account and private booking calendar link.',
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone']),
            customFields: customFieldsJson([
              ['Full Name', 'text', 'Enter your full name', true],
              ['Executive / Work Email', 'email', 'founder@company.com', true],
              ['Direct WhatsApp / Mobile', 'tel', '+1 (555) 987-6543', true],
            ]),
            button: 'Save Member Profile & Continue →',
            successMessage: 'Member profile saved! Complete payment below.',
            destinationType: 'Next Step',
          },
          '#eff6ff',
          'Center'
        ),
        sec(
          's-pay',
          'Payment',
          'Step 2 · Confirm VIP Enrollment ($297.00)',
          'Instant portal activation + direct 1-on-1 kickoff call scheduling link.',
          {
            productId: 'Founder Coaching Accelerator (VIP Cohort)',
            price: '$297.00',
            currency: '$',
            gateway: 'Stripe · Visa / Mastercard / Amex / Apple Pay',
            button: 'Complete VIP Enrollment ($297.00) →',
            destinationType: 'Next Step',
          },
          '#ffffff',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.orderCoaching
    ),
    page_ar: tplPage(
      'gft-order-coaching-ar',
      'نموذج طلب VIP',
      '/vip-checkout',
      'Order Form',
      '#eff6ff',
      [
        sec(
          's-hero',
          'Hero',
          'مسرّعة أعمال المؤسسين — نموذج انضمام عضوية VIP ($297)',
          'أكمل اشتراكك أدناه لتفعيل دخولك الفوري إلى المنصة واستلام رابط جدولة جلسة التخطيط الاستراتيجية الفردية (60 دقيقة).',
          {
            src: STEP_HERO_IMAGES.orderCoaching,
            image: STEP_HERO_IMAGES.orderCoaching,
            button: 'انتقل لبيانات التسجيل ↓',
            destinationType: 'Scroll to Section',
            destination: 's-form',
            htmlClass: 'sys-pro-hero-center',
          },
          '#1e3a8a',
          'Center'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '60-Min جلسة تخطيط فردية · 52x لقاء أسبوعي مباشر · 256-Bit تشفير SSL · 14-Day ضمان استرداد',
          },
          '#dbeafe',
          'Center'
        ),
        sec(
          's-values',
          'Core Values',
          'كل ما تحصل عليه فور تفعيل عضويتك التنفيذية اليوم',
          'جلسة تخطيط فردية (60 دقيقة) · لقاءات مراجعة أسبوعية مباشرة · قوالب مسارات جاهزة · مجتمع خاص لرواد الأعمال',
          {},
          '#ffffff',
          'Center'
        ),
        sec(
          's-form',
          'Form',
          'الخطوة 1 · بيانات تسجيل العضوية التنفيذية',
          'أدخل بيانات التواصل المعتمدة لإعداد حسابك وإرسال رابط حجز الجلسة الاستشارية.',
          {
            fields: JSON.stringify(['Name', 'Email', 'Phone']),
            customFields: customFieldsJson([
              ['الاسم الكامل', 'text', 'اكتب اسمك الكامل', true],
              ['البريد الإلكتروني الرسمي', 'email', 'founder@company.com', true],
              ['رقم الواتساب المباشر', 'tel', '+966 50 000 0000', true],
            ]),
            button: 'حفظ بيانات العضوية والمتابعة ←',
            successMessage: 'تم حفظ ملف العضوية بنجاح! أكمل الدفع أدناه.',
            destinationType: 'Next Step',
          },
          '#eff6ff',
          'Center'
        ),
        sec(
          's-pay',
          'Payment',
          'الخطوة 2 · تأكيد اشتراك عضوية VIP ($297.00)',
          'يشمل تفعيل البوابة فوراً ورابط جدولة جلسة التخطيط الفردية 1-on-1.',
          {
            productId: 'مسرّعة أعمال المؤسسين (عضوية VIP)',
            price: '$297.00',
            currency: '$',
            gateway: 'Stripe · مدى / فيزا / ماستركارد / Apple Pay',
            button: 'إتمام الانضمام الآمن ($297.00) ←',
            destinationType: 'Next Step',
          },
          '#ffffff',
          'Center'
        ),
      ],
      STEP_HERO_IMAGES.orderCoaching
    ),
  },

  // =========================================================================
  // 4. THANK YOU STEP TEMPLATES (2 Isolated Single-Step Designs)
  // =========================================================================
  {
    id: 'gft-thanks-download',
    category: 'Thank You',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'Thank You & Instant Resource Delivery Page',
    title_ar: 'صفحة الشكر والتحميل الفوري للملف المجاني',
    description_en:
      'Polished opt-in confirmation & digital asset delivery step with one-click PDF download CTA, status strip, and 3-step next actions.',
    description_ar:
      'قالب خطوة شكر وتسليم فوري للملفات والأدلة المجانية مع زر تحميل مباشر وخطوات عملية واضحة.',
    tags_en: ['Single Step', 'Thank You', 'Download'],
    tags_ar: ['خطوة مستقلة', 'صفحة شكر', 'تحميل مباشر'],
    thumbnail: '/template-thumbnails/gft-thanks-download.jpg',
    useThumbnail: false,
    color: '#059669',
    accentBg: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
    page_en: tplPage(
      'gft-thanks-download-en',
      'Thank You Step',
      '/thank-you',
      'Thank You',
      '#f0fdf4',
      [
        sec(
          's-hero',
          'Hero',
          'You Are In! Your Free Resource Is Ready For Download',
          'Click the button below for immediate one-click access — we have also sent a backup copy straight to your email inbox.',
          {
            src: STEP_HERO_IMAGES.thanksDownload,
            image: STEP_HERO_IMAGES.thanksDownload,
            button: 'Download Your Guide Now (PDF · 2.4 MB) →',
            destinationType: 'Download File',
            destination: 'https://app.upklick.net/starter-guide.pdf',
            downloadFilename: 'Starter-Growth-Guide.pdf',
            htmlClass: 'sys-pro-hero-center',
          },
          '#064e3b',
          'Center'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '100% Registration Confirmed · 2.4MB Action Playbook · <60s Backup Sent to Inbox · 24/7 Direct Access',
          },
          '#ecfdf5',
          'Center'
        ),
        cols3(
          's-next-en',
          'Your 3 Quick Next Steps',
          'Follow these steps over the next 10 minutes to get maximum value from your download.',
          [
            [
              '01 · Whitelist Our Welcome Email',
              'Open the email we just sent and star it so future frameworks land in your primary inbox.',
            ],
            [
              '02 · Apply the Page-3 Checklist',
              'Run the 5-minute conversion audit on your current offer before launching new traffic.',
            ],
            [
              '03 · Request Your Free Funnel Review',
              'Want expert eyes on your setup? Reply "AUDIT" to our welcome email for tailored feedback.',
            ],
          ],
          '#ffffff',
          'Left'
        ),
      ],
      STEP_HERO_IMAGES.thanksDownload
    ),
    page_ar: tplPage(
      'gft-thanks-download-ar',
      'صفحة الشكر والتحميل',
      '/thank-you',
      'Thank You',
      '#f0fdf4',
      [
        sec(
          's-hero',
          'Hero',
          'تم تأكيد اشتراكك بنجاح! ملفك المجاني جاهز للتحميل الآن',
          'اضغط على الزر أدناه لتحميل نسختك الكاملة فوراً بنقرة واحدة — كما أرسلنا نسخة احتياطية إلى بريدك الإلكتروني.',
          {
            src: STEP_HERO_IMAGES.thanksDownload,
            image: STEP_HERO_IMAGES.thanksDownload,
            button: 'تحميل الدليل المجاني الآن (PDF · 2.4 MB) ←',
            destinationType: 'Download File',
            destination: 'https://app.upklick.net/starter-guide-ar.pdf',
            downloadFilename: 'Starter-Growth-Guide-AR.pdf',
            htmlClass: 'sys-pro-hero-center',
          },
          '#064e3b',
          'Center'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '100% اكتمل التسجيل · 2.4MB حجم الدليل التطبيقي · <60s أُرسلت نسخة لبريدك · 24/7 وصول مفتوح',
          },
          '#ecfdf5',
          'Center'
        ),
        cols3(
          's-next-ar',
          'خطواتك الـ 3 السريعة للبدء الآن',
          'اتبع هذه الخطوات البسيطة خلال الدقائق الـ 10 القادمة لتحقيق أقصى استفادة عملية.',
          [
            [
              '01 · افتح رسالة الترحيب في بريدك',
              'ميّز رسالتنا بنجمة في صندوق الوارد لضمان وصول الأدلة والتحديثات الأسبوعية القادمة.',
            ],
            [
              '02 · طبّق قائمة الفحص في صفحة 3',
              'نفّذ مراجعة التحويل السريعة في 5 دقائق لرفع أداء صفحتك الحالية فوراً.',
            ],
            [
              '03 · احصل على تقييم مجاني لمسارك',
              'رد بكلمة "مراجعة" على رسالة الترحيب ليقدم لك فريقنا توصيات مخصصة لمشروعك.',
            ],
          ],
          '#ffffff',
          'Right'
        ),
      ],
      STEP_HERO_IMAGES.thanksDownload
    ),
  },
  {
    id: 'gft-thanks-order',
    category: 'Thank You',
    status: 'Published',
    active: true,
    builtIn: true,
    schemaVersion: 3,
    title_en: 'Order Confirmed, Receipt & Customer Onboarding Page',
    title_ar: 'صفحة تأكيد الشراء وتفعيل الحساب والبدء الفوري',
    description_en:
      'Post-purchase confirmation step welcoming new buyers with verified receipt metrics, portal access CTA, and 3-step onboarding.',
    description_ar:
      'قالب خطوة شكر وتأكيد احترافي بعد إتمام الشراء يرحب بالعميل الجديد مع زر الدخول لبوابة المشتركين وخطوات التهيئة.',
    tags_en: ['Single Step', 'Order Confirmation', 'Onboarding'],
    tags_ar: ['خطوة مستقلة', 'تأكيد الشراء', 'بوابة العميل'],
    thumbnail: '/template-thumbnails/gft-thanks-order.jpg',
    useThumbnail: false,
    color: '#4f46e5',
    accentBg: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
    page_en: tplPage(
      'gft-thanks-order-en',
      'Order Confirmation',
      '/order-confirmed',
      'Thank You',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'Order Confirmed! Welcome Aboard — Your Portal Is Active',
          'Your payment has been verified securely, and your login credentials + official tax receipt (#10482) are waiting in your inbox.',
          {
            src: STEP_HERO_IMAGES.thanksOrder,
            image: STEP_HERO_IMAGES.thanksOrder,
            button: 'Access Member Portal Now →',
            destinationType: 'External URL',
            destination: '/portal',
            openInNewTab: 'false',
            htmlClass: 'sys-pro-hero-center',
          },
          '#1e1b4b',
          'Center'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '100% Payment Verified · #10482 Receipt Issued · <60s Credentials Emailed · 24/7 Priority Support',
          },
          '#eef2ff',
          'Center'
        ),
        cols3(
          's-onboard-en',
          'Complete Your 10-Minute Onboarding',
          'Everything is unlocked and ready inside your account right now.',
          [
            [
              'Step 01 · Save Your Receipt & Login',
              'Check your inbox for receipt #10482 and bookmark your permanent member portal link.',
            ],
            [
              'Step 02 · Watch the Quick-Start Module',
              'Complete the 10-minute orientation video and import your ready-made templates in one click.',
            ],
            [
              'Step 03 · Join Weekly Implementation Q&A',
              'Add our live coaching session to your calendar for direct feedback from our mentors.',
            ],
          ],
          '#ffffff',
          'Left'
        ),
      ],
      STEP_HERO_IMAGES.thanksOrder
    ),
    page_ar: tplPage(
      'gft-thanks-order-ar',
      'تأكيد الطلب',
      '/order-confirmed',
      'Thank You',
      '#f8fafc',
      [
        sec(
          's-hero',
          'Hero',
          'تم تأكيد طلبك بنجاح! أهلاً بك — حسابك مفعّل الآن',
          'تمت معالجة عملية الدفع بأمان تام، وأرسلنا بيانات الدخول الدائمة والإيصال الضريبي الرسمي (#10482) إلى بريدك الإلكتروني.',
          {
            src: STEP_HERO_IMAGES.thanksOrder,
            image: STEP_HERO_IMAGES.thanksOrder,
            button: 'الدخول إلى بوابة المشتركين الآن ←',
            destinationType: 'External URL',
            destination: '/portal',
            openInNewTab: 'false',
            htmlClass: 'sys-pro-hero-center',
          },
          '#1e1b4b',
          'Center'
        ),
        sec(
          's-stats',
          'Stats',
          '',
          '',
          {
            items:
              '100% تم تأكيد الدفع · #10482 رقم الإيصال الضريبي · <60s أُرسلت بيانات الحساب · 24/7 دعم ذو أولوية',
          },
          '#eef2ff',
          'Center'
        ),
        cols3(
          's-onboard-ar',
          'أكمل تهيئة حسابك في 10 دقائق فقط',
          'جميع البرامج والقوالب المرفقة مع طلبك أصبحت متاحة داخل حسابك الآن.',
          [
            [
              'الخطوة 01 · احفظ رسالة الإيصال والدخول',
              'افتح بريدك الإلكتروني للاطلاع على الإيصال رقم #10482 وحفظ رابط البوابة الدائم.',
            ],
            [
              'الخطوة 02 · شاهد فيديو البداية السريعة',
              'ابدأ بدرس التهيئة (10 دقائق) واستورد القوالب الجاهزة المرفقة مع باقتك بنقرة واحدة.',
            ],
            [
              'الخطوة 03 · انضم للقاء التطبيق الأسبوعي',
              'أضف موعد اللقاء المباشر إلى تقويمك للحصول على إرشاد ومراجعة فردية لمشروعك.',
            ],
          ],
          '#ffffff',
          'Right'
        ),
      ],
      STEP_HERO_IMAGES.thanksOrder
    ),
  },
];

export function localizeGlobalFunnelTemplate(
  template: GlobalFunnelTemplate,
  arabic: boolean
): LocalizedGlobalFunnelTemplate {
  const title = arabic ? template.title_ar?.trim() || template.title_en : template.title_en || template.title_ar;
  const description = arabic
    ? template.description_ar?.trim() || template.description_en
    : template.description_en || template.description_ar;
  const tags = arabic && template.tags_ar?.length ? template.tags_ar : template.tags_en || [];
  const page = arabic && template.page_ar?.sections?.length ? template.page_ar : template.page_en;
  return {
    ...template,
    title,
    description,
    categoryLabel: globalTemplateCategoryLabel(template.category, arabic),
    tags,
    page,
  };
}

export function createBlankGlobalFunnelTemplate(
  category: FunnelTemplateCategory = 'Opt-in'
): GlobalFunnelTemplate {
  const id = `gft-${crypto.randomUUID().slice(0, 12)}`;
  const heroImg =
    category === 'Order Form'
      ? STEP_HERO_IMAGES.orderCheckout
      : category === 'Thank You'
        ? STEP_HERO_IMAGES.thanksOrder
        : category === 'Sales'
          ? STEP_HERO_IMAGES.courseSales
          : STEP_HERO_IMAGES.newsletter;

  const enSections: BuilderSection[] = [
    sec(
      `sec-hero-${crypto.randomUUID().slice(0, 5)}`,
      'Hero',
      category === 'Thank You' ? 'Thank You! Your Step Is Confirmed' : `High-Converting ${category} Headline`,
      'Customize this isolated step template inside the visual page builder.',
      {
        src: heroImg,
        image: heroImg,
        button: category === 'Thank You' ? 'Access Resource →' : 'Get Started Now →',
        destinationType: 'Next Step',
      },
      '#0f172a',
      'Left'
    ),
    ...(category === 'Opt-in' || category === 'Order Form'
      ? [
          sec(
            `sec-form-${crypto.randomUUID().slice(0, 5)}`,
            'Form',
            category === 'Order Form' ? 'Customer Checkout Details' : 'Complete Your Registration',
            'Enter your details below to continue.',
            {
              fields: JSON.stringify(['Name', 'Email']),
              customFields: customFieldsJson([
                ['Full Name', 'text', 'Your full name', true],
                ['Email Address', 'email', 'you@company.com', true],
              ]),
              button: category === 'Order Form' ? 'Continue to Payment →' : 'Submit & Continue →',
              destinationType: 'Next Step',
            },
            '#ffffff',
            'Center'
          ),
        ]
      : []),
  ];

  const arSections: BuilderSection[] = [
    sec(
      `sec-hero-${crypto.randomUUID().slice(0, 5)}`,
      'Hero',
      category === 'Thank You' ? 'شكراً لك! تم تأكيد خطوتك بنجاح' : 'عنوان الخطوة الرئيسي عالي التحويل',
      'قم بتخصيص قالب هذه الخطوة المستقلة بسهولة باستخدام محرر الصفحات المرئي.',
      {
        src: heroImg,
        image: heroImg,
        button: category === 'Thank You' ? 'فتح المحتوى الآن ←' : 'ابدأ الآن ←',
        destinationType: 'Next Step',
      },
      '#0f172a',
      'Right'
    ),
    ...(category === 'Opt-in' || category === 'Order Form'
      ? [
          sec(
            `sec-form-${crypto.randomUUID().slice(0, 5)}`,
            'Form',
            category === 'Order Form' ? 'بيانات العميل وإتمام الطلب' : 'أكمل بيانات التسجيل',
            'أدخل بياناتك بالأسفل للمتابعة.',
            {
              fields: JSON.stringify(['Name', 'Email']),
              customFields: customFieldsJson([
                ['الاسم الكامل', 'text', 'اكتب اسمك الكامل', true],
                ['البريد الإلكتروني', 'email', 'you@company.com', true],
              ]),
              button: category === 'Order Form' ? 'متابعة لإتمام الطلب ←' : 'إرسال ومتابعة ←',
              destinationType: 'Next Step',
            },
            '#ffffff',
            'Center'
          ),
        ]
      : []),
  ];

  const enPage = tplPage(
    `${id}-en`,
    `${category} Step`,
    `/${category.toLowerCase().replace(/\s+/g, '-')}`,
    category,
    '#f8fafc',
    enSections,
    heroImg
  );
  const arPage = tplPage(
    `${id}-ar`,
    globalTemplateCategoryLabel(category, true),
    `/${category.toLowerCase().replace(/\s+/g, '-')}`,
    category,
    '#f8fafc',
    arSections,
    heroImg
  );

  return {
    id,
    category,
    status: 'Published',
    active: true,
    schemaVersion: 3,
    title_en: '',
    title_ar: '',
    description_en: '',
    description_ar: '',
    tags_en: ['Single Step', category],
    tags_ar: ['خطوة مستقلة', CATEGORY_AR[category]],
    thumbnail: '',
    useThumbnail: false,
    color: '#6366f1',
    accentBg: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
    page_en: enPage,
    page_ar: arPage,
  };
}

export function useGlobalFunnelTemplates(options?: {
  includeDrafts?: boolean;
  language?: string;
}) {
  const includeDrafts = Boolean(options?.includeDrafts);
  const uiLang = useUILanguage();
  const arabic = (options?.language || uiLang).startsWith('ar');
  const [remote, setRemote] = useState<GlobalFunnelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const targetDb = includeDrafts ? primaryDb : db;
    setLoading(true);
    setError('');
    const unsub = onSnapshot(
      collection(targetDb, GLOBAL_FUNNEL_TEMPLATES_COLLECTION),
      snapshot => {
        const list: GlobalFunnelTemplate[] = [];
        snapshot.forEach(docSnap => {
          const decoded = decodeFirestoreValue(docSnap.data()) as GlobalFunnelTemplate;
          if (decoded && typeof decoded === 'object') {
            list.push({ ...decoded, id: docSnap.id });
          }
        });
        setRemote(list);
        setLoading(false);
      },
      err => {
        console.warn('[global_funnel_templates] fallback to built-in templates:', err);
        setLoading(false);
        if (includeDrafts) setError(backendError(err));
      }
    );
    return () => unsub();
  }, [includeDrafts]);

  const templates = useMemo(() => {
    const map = new Map<string, GlobalFunnelTemplate>();
    for (const builtin of BUILTIN_GLOBAL_FUNNEL_TEMPLATES) {
      map.set(builtin.id, builtin);
    }
    for (const item of remote) {
      if (item.deleted) {
        map.delete(item.id);
      } else {
        const builtin = map.get(item.id);
        // Prefer v3 redesigned layout for unedited seed records while preserving Super Admin publish/draft status
        const isAutomatedSeed =
          !item.updatedBy ||
          item.updatedBy === 'super-admin-seed' ||
          item.updatedBy.startsWith('super-admin-step-templates');
        if (builtin && builtin.builtIn && (!item.schemaVersion || item.schemaVersion < 3) && isAutomatedSeed) {
          map.set(item.id, {
            ...builtin,
            status: item.status ?? builtin.status,
            active: item.active ?? builtin.active,
            thumbnail: item.useThumbnail && item.thumbnail ? item.thumbnail : builtin.thumbnail,
            useThumbnail: item.useThumbnail ?? false,
          });
        } else {
          map.set(item.id, item);
        }
      }
    }
    const merged = Array.from(map.values()).filter(tpl =>
      includeDrafts ? true : tpl.active !== false && tpl.status === 'Published'
    );
    return merged.map(tpl => localizeGlobalFunnelTemplate(tpl, arabic));
  }, [remote, includeDrafts, arabic]);

  return { templates, rawTemplates: remote, loading, error };
}

export async function saveGlobalFunnelTemplate(template: GlobalFunnelTemplate): Promise<void> {
  const uid = primaryAuth.currentUser?.uid || store.getState().auth.user?.id || 'super_admin';
  const titleEn = template.title_en.trim() || template.title_ar.trim();
  if (!titleEn) throw new Error('Enter a template title before saving.');
  if (!GLOBAL_TEMPLATE_CATEGORIES.includes(template.category)) {
    throw new Error('Choose a valid template category.');
  }
  const active = template.status === 'Published' && template.active !== false;
  const payload: GlobalFunnelTemplate = {
    ...template,
    schemaVersion: 3,
    title_en: titleEn,
    title_ar: template.title_ar.trim() || titleEn,
    description_en: template.description_en.trim(),
    description_ar: template.description_ar.trim() || template.description_en.trim(),
    active,
    status: active ? 'Published' : 'Draft',
    deleted: false,
    updated: new Date().toISOString(),
    updatedBy: uid,
  };
  await setDoc(doc(primaryDb, GLOBAL_FUNNEL_TEMPLATES_COLLECTION, payload.id), {
    ...encodeFirestoreValue(payload),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

export async function deleteGlobalFunnelTemplate(template: GlobalFunnelTemplate): Promise<void> {
  const uid = primaryAuth.currentUser?.uid || store.getState().auth.user?.id || 'super_admin';
  if (template.builtIn) {
    await setDoc(
      doc(primaryDb, GLOBAL_FUNNEL_TEMPLATES_COLLECTION, template.id),
      {
        ...encodeFirestoreValue({
          ...template,
          schemaVersion: 3,
          active: false,
          status: 'Draft',
          deleted: true,
        }),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      },
      { merge: true }
    );
    return;
  }
  await deleteDoc(doc(primaryDb, GLOBAL_FUNNEL_TEMPLATES_COLLECTION, template.id));
}

export async function seedGlobalFunnelTemplatesToFirestore(): Promise<number> {
  const uid = primaryAuth.currentUser?.uid || store.getState().auth.user?.id || 'super_admin';
  let count = 0;
  for (const tpl of BUILTIN_GLOBAL_FUNNEL_TEMPLATES) {
    await setDoc(
      doc(primaryDb, GLOBAL_FUNNEL_TEMPLATES_COLLECTION, tpl.id),
      {
        ...encodeFirestoreValue({
          ...tpl,
          schemaVersion: 3,
          deleted: false,
          updated: new Date().toISOString(),
          updatedBy: uid,
        }),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      },
      { merge: true }
    );
    count++;
  }
  return count;
}
