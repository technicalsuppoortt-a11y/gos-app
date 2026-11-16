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
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  tags_en: string[];
  tags_ar: string[];
  thumbnail: string;
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

function sec(
  id: string,
  type: BuilderSection['type'],
  title: string,
  body = '',
  extras: Record<string, string> = {},
  bg = '#ffffff',
  align = 'Left'
): BuilderSection {
  return {
    id,
    type,
    content: { title, body, ...extras },
    styles: {
      backgroundColor: bg,
      padding: '32',
      textAlign: align,
      typography: 'Default',
      customCss: '',
      visibility: 'All devices',
      animation: 'None',
    },
  };
}

function tplPage(
  id: string,
  name: string,
  path: string,
  category: FunnelTemplateCategory,
  backgroundColor: string,
  sections: BuilderSection[]
): BuilderPage {
  return {
    id,
    name,
    status: 'Published',
    path,
    seoTitle: name,
    seoDescription: '',
    headline: sections[0]?.content.title || name,
    subheadline: sections[0]?.content.body || '',
    cta: sections[0]?.content.button || 'Get Started',
    showHeader: false,
    header: 'Minimal header',
    showFooter: false,
    footer: 'Minimal footer',
    featuredImage: '',
    backgroundColor,
    isFunnelStep: true,
    templateSelected: true,
    stepCategory: category,
    sections,
  };
}

export const BUILTIN_GLOBAL_FUNNEL_TEMPLATES: GlobalFunnelTemplate[] = [
  {
    id: 'gft-optin-curiosity',
    category: 'Opt-in',
    status: 'Published',
    active: true,
    builtIn: true,
    title_en: 'The Curiosity Newsletter Squeeze',
    title_ar: 'صفحة اشتراك النشرة البريدية الاحترافية',
    description_en: 'High-converting green editorial squeeze page for newsletters, lead magnets, and creator audiences.',
    description_ar: 'صفحة اشتراك عالية التحويل لجمع عناوين البريد الإلكتروني وبناء قائمة جمهورك المستهدف.',
    tags_en: ['Newsletter', 'Lead Magnet', 'Squeeze'],
    tags_ar: ['نشرة بريدية', 'بناء جمهور', 'اشتراك'],
    thumbnail: '',
    color: '#065f46',
    accentBg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
    page_en: tplPage('gft-optin-curiosity-en', 'Opt-in Page', '/opt-in', 'Opt-in', '#f0fdf4', [
      sec(
        's-hero',
        'Hero',
        'The Curiosity Chronicles',
        'Join 15,000+ founders receiving 5-minute actionable growth frameworks every Tuesday morning.',
        { button: 'Subscribe Free', destinationType: 'Scroll to Section', destination: 's-form' },
        '#064e3b'
      ),
      sec(
        's-form',
        'Form',
        'Get Your Free Starter Playbook',
        'Enter your best email below and get instant access to our top-performing swipe files.',
        {
          template: 'lead-capture',
          fields: JSON.stringify(['Name', 'Email']),
          button: 'Send Me the Playbook',
          successMessage: 'Check your inbox! Your playbook is on the way.',
          destinationType: 'Next Step',
        },
        '#ffffff'
      ),
    ]),
    page_ar: tplPage('gft-optin-curiosity-ar', 'صفحة الاشتراك', '/opt-in', 'Opt-in', '#f0fdf4', [
      sec(
        's-hero',
        'Hero',
        'نشرة النمو الأسبوعية لرواد الأعمال',
        'انضم إلى أكثر من 15,000 رائد أعمال يحصلون على استراتيجيات نمو عملية في 5 دقائق كل أسبوع.',
        { button: 'اشترك مجاناً الآن', destinationType: 'Scroll to Section', destination: 's-form' },
        '#064e3b',
        'Right'
      ),
      sec(
        's-form',
        'Form',
        'احصل على الدليل العملي المجاني فوراً',
        'أدخل اسمك وبريدك الإلكتروني بالأسفل ليصلك الدليل مباشرة إلى صندوق الوارد.',
        {
          template: 'lead-capture',
          fields: JSON.stringify(['Name', 'Email']),
          button: 'أرسل لي الدليل المجاني',
          successMessage: 'تم التسجيل بنجاح! تفقد بريدك الإلكتروني الآن.',
          destinationType: 'Next Step',
        },
        '#ffffff',
        'Right'
      ),
    ]),
  },
  {
    id: 'gft-optin-webmaven',
    category: 'Opt-in',
    status: 'Published',
    active: true,
    builtIn: true,
    title_en: 'WebMaven SaaS & Free Training Opt-in',
    title_ar: 'صفحة تسجيل التدريب المجاني والأدوات الرقمية',
    description_en: 'Clean modern SaaS & masterclass registration page with benefit highlights and instant opt-in form.',
    description_ar: 'صفحة عصرية لتسجيل الحضور في ورش العمل المجانية أو تحميل القوالب الرقمية الجاهزة.',
    tags_en: ['SaaS', 'Webinar', 'Free Guide'],
    tags_ar: ['تدريب مجاني', 'أدوات رقمية', 'تسجيل'],
    thumbnail: '',
    color: '#16a34a',
    accentBg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    page_en: tplPage('gft-optin-webmaven-en', 'Opt-in Page', '/opt-in', 'Opt-in', '#f8fafc', [
      sec(
        's-head',
        'Heading',
        'Your Dream Launch Is Just One Click Away',
        'Unlock our proven 3-step blueprint to automate client acquisition without cold outreach.',
        { headingTag: 'H1' },
        '#dcfce7',
        'Center'
      ),
      sec(
        's-form',
        'Form',
        'Reserve Your Free Access',
        'Complete the form below to unlock the training video immediately.',
        {
          fields: JSON.stringify(['Name', 'Email', 'Phone']),
          button: 'Unlock Free Training',
          successMessage: 'Access unlocked! Redirecting...',
          destinationType: 'Next Step',
        },
        '#ffffff',
        'Center'
      ),
      sec(
        's-stats',
        'Stats',
        '',
        '',
        { items: '1,600+ Active Members · 98% Satisfaction · 24/7 Instant Access' },
        '#ffffff',
        'Center'
      ),
    ]),
    page_ar: tplPage('gft-optin-webmaven-ar', 'صفحة الاشتراك', '/opt-in', 'Opt-in', '#f8fafc', [
      sec(
        's-head',
        'Heading',
        'إطلاق مشروعك الرقمي يبدأ بخطوة واحدة',
        'احصل على خارطة الطريق المجانية من 3 خطوات لجذب العملاء وبناء نظام مبيعات آلي.',
        { headingTag: 'H1' },
        '#dcfce7',
        'Center'
      ),
      sec(
        's-form',
        'Form',
        'احجز مقعدك المجاني الآن',
        'أدخل بياناتك بالأسفل لمشاهدة التدريب المجاني فوراً.',
        {
          fields: JSON.stringify(['Name', 'Email', 'Phone']),
          button: 'مشاهدة التدريب المجاني',
          successMessage: 'تم تأكيد اشتراكك بنجاح!',
          destinationType: 'Next Step',
        },
        '#ffffff',
        'Center'
      ),
      sec(
        's-stats',
        'Stats',
        '',
        '',
        { items: '+1,600 مشترك نشط · 98% نسبة الرضا · وصول فوري ومجاني' },
        '#ffffff',
        'Center'
      ),
    ]),
  },
  {
    id: 'gft-order-purchase',
    category: 'Order Form',
    status: 'Published',
    active: true,
    builtIn: true,
    title_en: 'Direct Purchase Order Form ($79.99)',
    title_ar: 'نموذج الطلب والدفع المباشر الاحترافي',
    description_en: 'Two-step conversion-focused checkout layout with offer value stack, contact details, and secure payment.',
    description_ar: 'نموذج طلب مصمم لرفع معدل إتمام الشراء مع ملخص العرض وبيانات العميل والدفع الآمن.',
    tags_en: ['Checkout', 'Order Form', 'Digital'],
    tags_ar: ['نموذج طلب', 'دفع إلكتروني', 'منتج رقمي'],
    thumbnail: '',
    color: '#1e1b4b',
    accentBg: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
    page_en: tplPage('gft-order-purchase-en', 'Order Form', '/order-form', 'Order Form', '#f8fafc', [
      sec(
        's-head',
        'Heading',
        'Purchase Order Form',
        'Complete the form below to unlock instant access to the complete program and bonuses.',
        { headingTag: 'H1' },
        '#ffffff',
        'Center'
      ),
      sec(
        's-form',
        'Form',
        '1. Contact Information',
        'Where should we send your login credentials and receipt?',
        {
          fields: JSON.stringify(['Name', 'Email', 'Phone']),
          button: 'Proceed & Complete Order',
          successMessage: 'Details verified! Processing your order...',
          destinationType: 'Next Step',
        },
        '#ffffff'
      ),
      sec(
        's-pay',
        'Payment',
        '2. Order Summary & Payment',
        'Includes 14-day money-back guarantee & instant lifetime updates.',
        {
          productId: 'Complete Mastery Bundle',
          price: '79.99',
          currency: '$',
          gateway: 'Stripe',
          button: 'Complete Secure Order →',
          destinationType: 'Next Step',
        },
        '#ffffff'
      ),
    ]),
    page_ar: tplPage('gft-order-purchase-ar', 'نموذج الطلب', '/order-form', 'Order Form', '#f8fafc', [
      sec(
        's-head',
        'Heading',
        'إتمام الطلب والاشتراك الفوري',
        'أكمل بياناتك أدناه للحصول على وصول فوري لكامل البرنامج والمكافآت الإضافية.',
        { headingTag: 'H1' },
        '#ffffff',
        'Center'
      ),
      sec(
        's-form',
        'Form',
        '1. معلومات التواصل',
        'أدخل بياناتك لإرسال تفاصيل الدخول والفاتورة الضريبية.',
        {
          fields: JSON.stringify(['Name', 'Email', 'Phone']),
          button: 'تأكيد البيانات والمتابعة',
          successMessage: 'تم حفظ بياناتك بنجاح!',
          destinationType: 'Next Step',
        },
        '#ffffff',
        'Right'
      ),
      sec(
        's-pay',
        'Payment',
        '2. ملخص الطلب والدفع الآمن',
        'يشمل ضمان استرداد كامل لمدة 14 يوماً ووصولاً مدى الحياة.',
        {
          productId: 'الباقة الاحترافية الشاملة',
          price: '79.99',
          currency: '$',
          gateway: 'Stripe',
          button: 'إتمام الشراء بأمان ←',
          destinationType: 'Next Step',
        },
        '#ffffff',
        'Right'
      ),
    ]),
  },
  {
    id: 'gft-order-coaching',
    category: 'Order Form',
    status: 'Published',
    active: true,
    builtIn: true,
    title_en: 'Founder Coaching Special Offer Checkout',
    title_ar: 'نموذج طلب باقة الاستشارات وعرض الأعضاء',
    description_en: 'Executive coaching and membership checkout page with deliverables checklist, testimonials, and payment.',
    description_ar: 'نموذج طلب مخصص لبرامج التدريب والاستشارات والعضويات الخاصة مع قائمة المزايا.',
    tags_en: ['Coaching', 'Membership', 'Order'],
    tags_ar: ['استشارات', 'عضوية', 'نموذج طلب'],
    thumbnail: '',
    color: '#2563eb',
    accentBg: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    page_en: tplPage('gft-order-coaching-en', 'Order Form', '/order-form', 'Order Form', '#eff6ff', [
      sec(
        's-head',
        'Heading',
        'Our New Member Special Offer',
        'Join the Founder Coaching Accelerator today and lock in founding member pricing.',
        { headingTag: 'H1' },
        '#1d4ed8',
        'Center'
      ),
      sec(
        's-values',
        'Core Values',
        'Everything Included Today',
        '1-on-1 Strategy Roadmap · Weekly Live Office Hours · Done-For-You Funnel Templates · Private Community',
        {},
        '#ffffff',
        'Center'
      ),
      sec(
        's-form',
        'Form',
        'Member Registration & Checkout',
        'Fill in your details below to activate your membership immediately.',
        {
          fields: JSON.stringify(['Name', 'Email', 'Phone']),
          button: 'Join Now & Claim Offer',
          successMessage: 'Welcome aboard! Redirecting to your confirmation page...',
          destinationType: 'Next Step',
        },
        '#ffffff'
      ),
    ]),
    page_ar: tplPage('gft-order-coaching-ar', 'نموذج الطلب', '/order-form', 'Order Form', '#eff6ff', [
      sec(
        's-head',
        'Heading',
        'عرض الانضمام الخاص للأعضاء الجدد',
        'انضم اليوم إلى مسرعة أعمال المؤسسين واحتفظ بسعر الأعضاء المؤسسين الحصري.',
        { headingTag: 'H1' },
        '#1d4ed8',
        'Center'
      ),
      sec(
        's-values',
        'Core Values',
        'كل ما ستحصل عليه فور انضمامك',
        'جلسة تخطيط فردية · لقاءات أسبوعية مباشرة · قوالب مسارات جاهزة · مجتمع خاص للأعضاء',
        {},
        '#ffffff',
        'Center'
      ),
      sec(
        's-form',
        'Form',
        'بيانات التسجيل وتفعيل العضوية',
        'أكمل النموذج أدناه لتفعيل عضويتك والانتقال لصفحة البدء فوراً.',
        {
          fields: JSON.stringify(['Name', 'Email', 'Phone']),
          button: 'انضم الآن وفعّل العرض',
          successMessage: 'أهلاً بك معنا! جاري نقلك لصفحة التأكيد...',
          destinationType: 'Next Step',
        },
        '#ffffff',
        'Right'
      ),
    ]),
  },
  {
    id: 'gft-sales-flagship',
    category: 'Sales',
    status: 'Published',
    active: true,
    builtIn: true,
    title_en: 'Creator Flagship Course Sales Page',
    title_ar: 'صفحة مبيعات الدورات والمنتجات الرقمية',
    description_en: 'Full-featured long-form sales page with hero CTA, curriculum highlights, social proof, pricing, and FAQ.',
    description_ar: 'صفحة مبيعات متكاملة لعرض الدورات التدريبية والمنتجات الرقمية مع آراء العملاء والأسعار والأسئلة الشائعة.',
    tags_en: ['Course', 'Sales Page', 'Digital Product'],
    tags_ar: ['دورة تدريبية', 'صفحة مبيعات', 'منتج رقمي'],
    thumbnail: '',
    color: '#7c3aed',
    accentBg: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
    page_en: tplPage('gft-sales-flagship-en', 'Sales Page', '/sales', 'Sales', '#ffffff', [
      sec(
        's-hero',
        'Hero',
        'Meet Your All-in-One Growth System',
        'Stop stitching together 10 disconnected tools. Launch high-converting funnels, courses, and automations in one afternoon.',
        { button: 'Enroll Now →', destinationType: 'Next Step' },
        '#1e1b4b'
      ),
      sec(
        's-programs',
        'Program Highlights',
        'Inside the Step-by-Step Curriculum',
        'Designed for busy creators, consultants, and agencies.',
        { items: 'Module 1: Offer Architecture · Module 2: Funnel Launch · Module 3: Automated Follow-up', button: 'Proceed to Order Form', destinationType: 'Next Step' },
        '#ffffff',
        'Center'
      ),
      sec(
        's-reviews',
        'Testimonials',
        'Trusted by Over 2,400 Creators',
        '',
        {
          testimonials: JSON.stringify([
            { id: 'r1', author: 'Sarah Jenkins', role: 'Course Creator', quote: 'We launched our new funnel in 45 minutes and doubled our opt-in rate on day one.', rating: 5, avatar: '' },
            { id: 'r2', author: 'Karim Mansour', role: 'Agency Founder', quote: 'Cleanest funnel workflow we have ever used for both English and Arabic campaigns.', rating: 5, avatar: '' },
          ]),
        },
        '#f8fafc',
        'Center'
      ),
      sec(
        's-faq',
        'FAQ',
        'Frequently Asked Questions',
        '',
        {
          questions: JSON.stringify([
            { id: 'q1', question: 'How quickly do I get access?', answer: 'Immediately after completing the order form on the next step.' },
            { id: 'q2', question: 'Is there a refund guarantee?', answer: 'Yes, every enrollment is protected by a 14-day no-questions-asked guarantee.' },
          ]),
        },
        '#ffffff'
      ),
    ]),
    page_ar: tplPage('gft-sales-flagship-ar', 'صفحة المبيعات', '/sales', 'Sales', '#ffffff', [
      sec(
        's-hero',
        'Hero',
        'النظام المتكامل لإطلاق ومضاعفة مبيعاتك الرقمية',
        'ودّع الأدوات المعقدة. أطلق مسارات البيع، الدورات التدريبية، والأتمتة الذكية في مكان واحد وبأعلى معدل تحويل.',
        { button: 'اشترك الآن وانتقل للطلب ←', destinationType: 'Next Step' },
        '#1e1b4b',
        'Right'
      ),
      sec(
        's-programs',
        'Program Highlights',
        'ماذا ستتعلم وتطبق داخل البرنامج؟',
        'منهجية عملية مصممة لأصحاب الخبرات والمدربين والوكالات.',
        { items: 'المحور الأول: هندسة العرض · المحور الثاني: بناء المسار · المحور الثالث: الأتمتة والمبيعات', button: 'انتقل إلى نموذج الطلب', destinationType: 'Next Step' },
        '#ffffff',
        'Center'
      ),
      sec(
        's-reviews',
        'Testimonials',
        'قصص نجاح أكثر من 2,400 مشترك',
        '',
        {
          testimonials: JSON.stringify([
            { id: 'r1', author: 'سارة المنصوري', role: 'مدربة أعمال', quote: 'أطلقنا مسار المبيعات الجديد في أقل من ساعة وتضاعفت نسبة التسجيل من اليوم الأول.', rating: 5, avatar: '' },
            { id: 'r2', author: 'كريم حسن', role: 'مؤسس وكالة تسويق', quote: 'تجربة سلسة جداً وتدعم العربية والإنجليزية باحترافية كاملة.', rating: 5, avatar: '' },
          ]),
        },
        '#f8fafc',
        'Center'
      ),
      sec(
        's-faq',
        'FAQ',
        'الأسئلة الشائعة قبل الاشتراك',
        '',
        {
          questions: JSON.stringify([
            { id: 'q1', question: 'متى أحصل على صلاحية الدخول؟', answer: 'فوراً بمجرد إتمام نموذج الطلب في الخطوة التالية.' },
            { id: 'q2', question: 'هل يوجد ضمان استرجاع؟', answer: 'نعم، اشتراكك مضمون بالكامل لمدة 14 يوماً دون أي شروط معقدة.' },
          ]),
        },
        '#ffffff',
        'Right'
      ),
    ]),
  },
  {
    id: 'gft-sales-service',
    category: 'Sales',
    status: 'Published',
    active: true,
    builtIn: true,
    title_en: 'High-Ticket Service & Strategy Sales Page',
    title_ar: 'صفحة مبيعات الخدمات وحجز الجلسات الاستشارية',
    description_en: 'Persuasive agency & consulting sales page pairing authority proof with direct next-step conversion.',
    description_ar: 'صفحة مبيعات احترافية للوكالات ومقدمي الخدمات لعرض النتائج ونقل الزائر لخطوة الطلب أو الحجز.',
    tags_en: ['Agency', 'Consulting', 'Service'],
    tags_ar: ['وكالة', 'خدمات', 'استشارات'],
    thumbnail: '',
    color: '#0f766e',
    accentBg: 'linear-gradient(135deg, #134e4a 0%, #0d9488 100%)',
    page_en: tplPage('gft-sales-service-en', 'Sales Page', '/sales', 'Sales', '#f8fafc', [
      sec(
        's-hero',
        'Hero',
        'Scale Your Revenue With Done-For-You Funnels',
        'We design, write, and launch your entire client acquisition funnel in 14 days — guaranteed.',
        { button: 'Claim Your Implementation Slot', destinationType: 'Next Step' },
        '#134e4a'
      ),
      sec(
        's-pricing',
        'Pricing',
        'Transparent Implementation Packages',
        'Pick the package aligned with your growth stage.',
        {
          plans: JSON.stringify([
            { id: 'p1', name: 'Growth Funnel', price: '990', period: 'one-time', features: ['Complete 3-step funnel', 'Copywriting & design', 'CRM pipeline integration'], button: 'Select Growth', highlighted: true },
          ]),
          destinationType: 'Next Step',
        },
        '#ffffff',
        'Center'
      ),
    ]),
    page_ar: tplPage('gft-sales-service-ar', 'صفحة المبيعات', '/sales', 'Sales', '#f8fafc', [
      sec(
        's-hero',
        'Hero',
        'ضاعف مبيعاتك مع خدمة بناء المسارات المتكاملة',
        'نصمم ونكتب ونطلق مسار جذب العملاء الخاص بك بالكامل خلال 14 يوماً فقط.',
        { button: 'احجز باقة التنفيذ الآن', destinationType: 'Next Step' },
        '#134e4a',
        'Right'
      ),
      sec(
        's-pricing',
        'Pricing',
        'باقات تنفيذ واضحة وشفافة',
        'اختر الباقة المناسبة لمرحلة نمو مشروعك الحالية.',
        {
          plans: JSON.stringify([
            { id: 'p1', name: 'باقة مسار النمو', price: '990', period: 'one-time', features: ['بناء مسار كامل من 3 خطوات', 'كتابة محتوى تسويقي وتصميم', 'ربط نظام CRM والأتمتة'], button: 'اختر الباقة الآن', highlighted: true },
          ]),
          destinationType: 'Next Step',
        },
        '#ffffff',
        'Center'
      ),
    ]),
  },
  {
    id: 'gft-thanks-download',
    category: 'Thank You',
    status: 'Published',
    active: true,
    builtIn: true,
    title_en: 'Thank You & Instant Resource Download',
    title_ar: 'صفحة الشكر وتحميل الملف المجاني',
    description_en: 'Clean confirmation & resource delivery page for opt-in funnels with direct download button and next steps.',
    description_ar: 'صفحة شكر وتسليم فوري للملفات والهدايا المجانية بعد اشتراك العميل مع زر تحميل مباشر.',
    tags_en: ['Thank You', 'Download', 'Opt-in Confirmation'],
    tags_ar: ['صفحة شكر', 'تحميل الصفحة', 'تأكيد الاشتراك'],
    thumbnail: '',
    color: '#059669',
    accentBg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
    page_en: tplPage('gft-thanks-download-en', 'Thank You Page', '/thank-you', 'Thank You', '#f8fafc', [
      sec(
        's-banner',
        'Heading',
        'Thank You! Your Resource Is Ready',
        'We have also sent a copy to your email inbox so you can access it anytime.',
        { headingTag: 'H1', template: 'thank-you' },
        '#ffffff',
        'Center'
      ),
      sec(
        's-btn',
        'Button',
        '',
        '',
        {
          button: 'Download Your Guide Now',
          destinationType: 'Download File',
          destination: 'https://example.com/starter-guide.pdf',
        },
        '#ffffff',
        'Center'
      ),
      sec(
        's-next',
        'Paragraph',
        'What Happens Next?',
        '1. Whitelist our email address  ·  2. Read pages 1–5 today  ·  3. Reply with your #1 takeaway!',
        { headingTag: 'H3' },
        '#ffffff',
        'Center'
      ),
    ]),
    page_ar: tplPage('gft-thanks-download-ar', 'صفحة الشكر / تحميل الصفحة', '/thank-you', 'Thank You', '#f8fafc', [
      sec(
        's-banner',
        'Heading',
        'شكراً لك! ملفك جاهز للتحميل الآن',
        'أرسلنا أيضاً نسخة إلى بريدك الإلكتروني لتتمكن من الرجوع إليها في أي وقت.',
        { headingTag: 'H1', template: 'thank-you' },
        '#ffffff',
        'Center'
      ),
      sec(
        's-btn',
        'Button',
        '',
        '',
        {
          button: 'تحميل الملف الآن',
          destinationType: 'Download File',
          destination: 'https://example.com/starter-guide-ar.pdf',
        },
        '#ffffff',
        'Center'
      ),
      sec(
        's-next',
        'Paragraph',
        'الخطوات التالية الموصى بها',
        '1. تأكد من فتح رسالتنا في بريدك  ·  2. ابدأ بتطبيق الخطوة الأولى اليوم  ·  3. تواصل معنا لأي استفسار!',
        { headingTag: 'H3' },
        '#ffffff',
        'Center'
      ),
    ]),
  },
  {
    id: 'gft-thanks-order',
    category: 'Thank You',
    status: 'Published',
    active: true,
    builtIn: true,
    title_en: 'Order Confirmed & Onboarding Thank You',
    title_ar: 'صفحة تأكيد الطلب والبدء الفوري',
    description_en: 'Post-purchase confirmation page welcoming new customers with onboarding video and portal access button.',
    description_ar: 'صفحة شكر وتأكيد بعد إتمام الشراء ترحب بالعميل الجديد مع فيديو ترحيبي وزر الدخول للمنصة.',
    tags_en: ['Order Confirmation', 'Receipt', 'Onboarding'],
    tags_ar: ['تأكيد الشراء', 'صفحة شكر', 'بوابة العميل'],
    thumbnail: '',
    color: '#4f46e5',
    accentBg: 'linear-gradient(135deg, #312e81 0%, #6366f1 100%)',
    page_en: tplPage('gft-thanks-order-en', 'Thank You Page', '/thank-you', 'Thank You', '#f8fafc', [
      sec(
        's-banner',
        'Heading',
        'Order Confirmed! Welcome Aboard',
        'Your payment was processed securely and your account credentials have been sent to your email.',
        { headingTag: 'H1', template: 'thank-you' },
        '#ffffff',
        'Center'
      ),
      sec(
        's-btn',
        'Button',
        '',
        '',
        {
          button: 'Access Customer Portal →',
          destinationType: 'External URL',
          destination: '/portal',
          openInNewTab: 'false',
        },
        '#ffffff',
        'Center'
      ),
    ]),
    page_ar: tplPage('gft-thanks-order-ar', 'صفحة الشكر', '/thank-you', 'Thank You', '#f8fafc', [
      sec(
        's-banner',
        'Heading',
        'تم تأكيد طلبك بنجاح! أهلاً بك معنا',
        'تمت معالجة عملية الدفع بأمان، وأرسلنا تفاصيل الدخول والإيصال إلى بريدك الإلكتروني.',
        { headingTag: 'H1', template: 'thank-you' },
        '#ffffff',
        'Center'
      ),
      sec(
        's-btn',
        'Button',
        '',
        '',
        {
          button: 'الدخول إلى بوابة المشتركين ←',
          destinationType: 'External URL',
          destination: '/portal',
          openInNewTab: 'false',
        },
        '#ffffff',
        'Center'
      ),
    ]),
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
  const enPage = tplPage(`${id}-en`, `${category} Template`, `/${category.toLowerCase().replace(/\s+/g, '-')}`, category, '#ffffff', [
    sec(
      `sec-${crypto.randomUUID().slice(0, 6)}`,
      category === 'Opt-in' || category === 'Order Form' ? 'Form' : 'Hero',
      category === 'Thank You' ? 'Thank You!' : `New ${category} Headline`,
      'Customize this template in the visual page builder.',
      category === 'Opt-in' || category === 'Order Form'
        ? { fields: JSON.stringify(['Name', 'Email']), button: 'Continue', destinationType: 'Next Step' }
        : { button: 'Get Started', destinationType: 'Next Step' }
    ),
  ]);
  const arPage = tplPage(`${id}-ar`, globalTemplateCategoryLabel(category, true), `/${category.toLowerCase().replace(/\s+/g, '-')}`, category, '#ffffff', [
    sec(
      `sec-${crypto.randomUUID().slice(0, 6)}`,
      category === 'Opt-in' || category === 'Order Form' ? 'Form' : 'Hero',
      category === 'Thank You' ? 'شكراً لك!' : 'عنوان القالب الرئيسي',
      'قم بتخصيص هذا القالب باستخدام محرر الصفحات المرئي.',
      category === 'Opt-in' || category === 'Order Form'
        ? { fields: JSON.stringify(['Name', 'Email']), button: 'متابعة', destinationType: 'Next Step' }
        : { button: 'ابدأ الآن', destinationType: 'Next Step' },
      '#ffffff',
      'Right'
    ),
  ]);

  return {
    id,
    category,
    status: 'Published',
    active: true,
    title_en: '',
    title_ar: '',
    description_en: '',
    description_ar: '',
    tags_en: [category],
    tags_ar: [CATEGORY_AR[category]],
    thumbnail: '',
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
        // Non-destructive fallback to built-in templates if collection read is offline/unseeded
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
        map.set(item.id, item);
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
    // Non-destructively mark built-in starter template hidden/deleted in Firestore so Superadmin can remove it without code mutation
    await setDoc(
      doc(primaryDb, GLOBAL_FUNNEL_TEMPLATES_COLLECTION, template.id),
      {
        ...encodeFirestoreValue({ ...template, active: false, status: 'Draft', deleted: true }),
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
