import { translateText } from '../i18n/display';
import type { BuilderDocument, BuilderPage, BuilderSection, FunnelStep } from './BuilderWorkspace';
import type { Asset } from './asset-model';
import type { CRMRoute } from './CRMRouting';
import type { CurrencyCode } from '../utils/currency';

export type FunnelGoalType = 'audience' | 'sell' | 'custom' | 'ai';

export type FunnelTemplateCategory = 'Opt-in' | 'Sales' | 'Order Form' | 'Thank You';

export type FunnelCoupon = {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  amount: number;
  active: boolean;
};

export type FunnelOrderBump = {
  id: string;
  title: string;
  price: number;
  description: string;
  enabled: boolean;
};

export type FunnelAutomationRule = {
  id: string;
  trigger: 'form_subscribed' | 'new_sale' | 'page_visited' | 'booking_confirmed';
  action: 'add_tag' | 'send_email' | 'enroll_course' | 'webhook' | 'send_whatsapp';
  target: string;
  active: boolean;
  createdAt: string;
};

export type FunnelABTestConfig = {
  enabled: boolean;
  variantPageId?: string;
  trafficSplit: number;
  goal: 'optin' | 'sale' | 'next_step';
  startedAt?: string;
};

export type FunnelStepConfiguration = {
  offerType?: 'digital' | 'physical';
  productId?: string;
  productName?: string;
  price?: string;
  affiliateEnabled?: boolean;
  affiliateCommission?: number;
  affiliatePayoutDelayDays?: number;
  salesLimitEnabled?: boolean;
  maxSales?: number;
  salesLimitRedirectStepId?: string;
  coupons?: FunnelCoupon[];
  orderBumps?: FunnelOrderBump[];
  automationRules?: FunnelAutomationRule[];
  abTest?: FunnelABTestConfig;
};

export type FunnelDeadlineSettings = {
  enabled: boolean;
  days: number;
  redirectStepId: string;
  expireAtTimeEnabled?: boolean;
  expireAtTime?: string;
  enabledStepIds: string[];
};

export type LeadCaptureElementInfo = {
  elementId: string;
  elementType: BuilderSection['type'];
  label: string;
  pageId: string;
  pageName: string;
  crmRouting: CRMRoute;
};

const LEAD_CAPTURE_TYPES = new Set<string>(['Form', 'Contact Form', 'Booking', 'Survey']);

export function isLeadCaptureSection(section: BuilderSection): boolean {
  if (!section) return false;
  if (section.type === 'Booking' && section.content?.bookingMode === 'confirmation') return false;
  return LEAD_CAPTURE_TYPES.has(section.type);
}

export function listPageLeadCaptureElements(page?: BuilderPage): LeadCaptureElementInfo[] {
  if (!page || !Array.isArray(page.sections)) return [];
  const found: LeadCaptureElementInfo[] = [];
  const visit = (items: BuilderSection[]) => {
    for (const item of items) {
      if (!item) continue;
      if (isLeadCaptureSection(item)) {
        const label =
          item.content?.elementName?.trim() ||
          item.content?.formName?.trim() ||
          item.content?.calendar?.trim() ||
          item.content?.title?.trim() ||
          item.type;
        found.push({
          elementId: item.id,
          elementType: item.type,
          label,
          pageId: page.id,
          pageName: page.name,
          crmRouting: {
            pipelineId: item.content?.crmPipelineId || undefined,
            stageId: item.content?.crmStageId || undefined,
          },
        });
      }
      if (Array.isArray(item.children)) {
        for (const col of item.children) {
          if (Array.isArray(col)) visit(col);
        }
      }
    }
  };
  visit(page.sections);
  return found;
}

export function hasLeadCaptureElement(page?: BuilderPage): boolean {
  return listPageLeadCaptureElements(page).length > 0;
}

export function normalizeStepCategory(stepType?: string): FunnelTemplateCategory {
  const raw = (stepType || '').trim().toLowerCase();
  if (raw.includes('order') || raw.includes('checkout') || raw.includes('payment') || raw.includes('upsell') || raw.includes('downsell')) {
    return 'Order Form';
  }
  if (raw.includes('thank') || raw.includes('confirm') || raw.includes('download')) {
    return 'Thank You';
  }
  if (raw.includes('sale') || raw.includes('landing') || raw.includes('offer')) {
    return 'Sales';
  }
  return 'Opt-in';
}

function makeDefaultSection(
  type: BuilderSection['type'],
  title: string,
  body = '',
  extras: Record<string, string> = {},
  textAlign = 'Left'
): BuilderSection {
  return {
    id: `section-${type.toLowerCase().replace(/[^a-z]+/g, '-')}-${crypto.randomUUID().slice(0, 8)}`,
    type,
    content: { title, body, ...extras },
    styles: {
      backgroundColor: '#ffffff',
      padding: '28',
      textAlign,
      typography: 'Default',
      customCss: '',
      visibility: 'All devices',
      animation: 'None',
    },
  };
}

export function createDefaultInactivePage(funnelName = 'Funnel'): BuilderPage {
  return {
    id: 'inactive-fallback-page',
    name: 'Inactive Page',
    status: 'Draft',
    path: '/inactive',
    seoTitle: `${funnelName} · Currently Unavailable`,
    seoDescription: 'This offer is currently closed.',
    headline: 'This Funnel Is Currently Closed',
    subheadline: 'Registration or checkout for this offer is no longer active. Join our waiting list or check back soon.',
    cta: 'Notify Me',
    showHeader: false,
    header: 'Minimal header',
    showFooter: false,
    footer: 'Minimal footer',
    featuredImage: '',
    backgroundColor: '#f8fafc',
    isFunnelStep: false,
    templateSelected: true,
    stepCategory: 'Opt-in',
    sections: [
      makeDefaultSection(
        'Heading',
        'This Offer Is Currently Inactive',
        'Thank you for your interest! This page or special promotion has ended or is temporarily offline.',
        { headingTag: 'H1' },
        'Center'
      ),
      makeDefaultSection(
        'Form',
        'Join the Waiting List',
        'Leave your email address to be notified first when we reopen.',
        {
          fields: JSON.stringify(['Name', 'Email']),
          button: 'Join Waiting List',
          successMessage: 'Thank you! We will notify you as soon as this offer reopens.',
        },
        'Center'
      ),
    ],
  };
}

export function buildDefaultStepPage(params: {
  id: string;
  name: string;
  path: string;
  stepType: string;
  nextPageId?: string;
  templateSelected?: boolean;
}): BuilderPage {
  const { id, name, path, stepType, nextPageId, templateSelected = false } = params;
  const category = normalizeStepCategory(stepType);
  const sections: BuilderSection[] =
    category === 'Order Form'
      ? [
          makeDefaultSection('Heading', name, 'Complete your details below to get instant access.', { headingTag: 'H1' }, 'Center'),
          makeDefaultSection(
            'Form',
            'Customer Information',
            'Enter your contact information to complete your order.',
            {
              fields: JSON.stringify(['Name', 'Email', 'Phone']),
              button: 'Complete Order',
              successMessage: 'Order submitted! Redirecting...',
              ...(nextPageId ? { nextPage: nextPageId, destinationType: 'Next Step', destination: nextPageId } : {}),
            }
          ),
          makeDefaultSection(
            'Payment',
            'Order Summary',
            'Secure SSL encrypted checkout.',
            {
              productId: 'Featured Offer',
              price: '49',
              gateway: 'Stripe',
              button: 'Complete Purchase',
              ...(nextPageId ? { destinationType: 'Next Step', destination: nextPageId } : {}),
            }
          ),
        ]
      : category === 'Thank You'
        ? [
            makeDefaultSection(
              'Heading',
              'Thank You! Everything Is Confirmed',
              'Your submission has been received. Follow the steps below to access your resources.',
              { headingTag: 'H1', template: 'thank-you' },
              'Center'
            ),
            makeDefaultSection(
              'Paragraph',
              '',
              'Check your inbox for your confirmation email and access link.',
              { headingTag: 'Paragraph' },
              'Center'
            ),
          ]
        : category === 'Sales'
          ? [
              makeDefaultSection(
                'Hero',
                'Transform Your Results With Proven Systems',
                'Discover how our step-by-step framework helps you achieve measurable growth faster.',
                {
                  button: 'Get Instant Access',
                  destinationType: nextPageId ? 'Next Step' : 'Scroll to Section',
                  destination: nextPageId || '',
                }
              ),
              makeDefaultSection(
                'Pricing',
                'Choose Your Package',
                'Simple, transparent pricing backed by our satisfaction guarantee.',
                {
                  plans: JSON.stringify([
                    {
                      id: crypto.randomUUID(),
                      name: 'Complete Access',
                      price: '97',
                      period: 'one-time',
                      features: ['Full program access', 'Templates & checklists', 'Priority support'],
                      button: 'Enroll Now',
                      highlighted: true,
                    },
                  ]),
                  ...(nextPageId ? { destinationType: 'Next Step', destination: nextPageId } : {}),
                },
                'Center'
              ),
            ]
          : [
              makeDefaultSection(
                'Form',
                'Get Free Instant Access',
                'Enter your best email address below and we will send it straight to your inbox.',
                {
                  template: 'lead-capture',
                  fields: JSON.stringify(['Name', 'Email']),
                  button: 'Get Instant Access',
                  successMessage: 'Success! Check your inbox now.',
                  ...(nextPageId ? { nextPage: nextPageId, destinationType: 'Next Step', destination: nextPageId } : {}),
                }
              ),
            ];

  return {
    id,
    name,
    status: 'Draft',
    path,
    seoTitle: name,
    seoDescription: '',
    headline: name,
    subheadline: '',
    cta: category === 'Order Form' ? 'Complete Order' : category === 'Thank You' ? 'Access Now' : 'Get Started',
    showHeader: false,
    header: 'Minimal header',
    showFooter: false,
    footer: 'Minimal footer',
    featuredImage: '',
    backgroundColor: '#ffffff',
    isFunnelStep: true,
    templateSelected,
    stepCategory: category,
    stepConfig: {
      offerType: category === 'Order Form' ? 'digital' : undefined,
      affiliateEnabled: false,
      affiliateCommission: 0,
      affiliatePayoutDelayDays: 30,
      salesLimitEnabled: false,
      coupons: [],
      orderBumps: [],
      automationRules: [],
    },
    sections,
  };
}

function makeSlugSuffix(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

export function createSystemeFunnelAsset(params: {
  name: string;
  domain: string;
  currency: CurrencyCode;
  goalType: 'audience' | 'sell' | 'custom';
  arabic?: boolean;
}): Asset {
  const { name, domain, currency, goalType, arabic = false } = params;
  const title = name.trim() || (arabic ? 'مسار جديد' : translateText('Untitled funnel'));
  const slugSuffix = makeSlugSuffix();

  let steps: FunnelStep[] = [];
  let pages: BuilderPage[] = [];
  let goalLabel = 'Lead generation';

  if (goalType === 'sell') {
    goalLabel = 'Sales';
    const orderId = crypto.randomUUID();
    const thanksId = crypto.randomUUID();
    const orderName = arabic ? 'نموذج الطلب' : translateText('Order Form');
    const thanksName = arabic ? 'صفحة الشكر' : translateText('Thank You Page');
    const orderPage = buildDefaultStepPage({
      id: orderId,
      name: orderName,
      path: `/order-${slugSuffix}`,
      stepType: 'Order Form',
      nextPageId: thanksId,
      templateSelected: false,
    });
    const thanksPage = buildDefaultStepPage({
      id: thanksId,
      name: thanksName,
      path: `/thank-you-${slugSuffix}`,
      stepType: 'Thank You',
      templateSelected: false,
    });
    pages = [orderPage, thanksPage];
    steps = [
      { id: crypto.randomUUID(), label: orderName, pageId: orderId, type: 'Order Form', category: 'Order Form', templateSelected: false },
      { id: crypto.randomUUID(), label: thanksName, pageId: thanksId, type: 'Thank You', category: 'Thank You', templateSelected: false },
    ];
  } else if (goalType === 'audience') {
    goalLabel = 'Lead generation';
    const optinId = crypto.randomUUID();
    const thanksId = crypto.randomUUID();
    const optinName = arabic ? 'صفحة الاشتراك' : translateText('Opt-in Page');
    const thanksName = arabic ? 'صفحة الشكر' : translateText('Thank You Page');
    const optinPage = buildDefaultStepPage({
      id: optinId,
      name: optinName,
      path: `/optin-${slugSuffix}`,
      stepType: 'Opt-in',
      nextPageId: thanksId,
      templateSelected: false,
    });
    const thanksPage = buildDefaultStepPage({
      id: thanksId,
      name: thanksName,
      path: `/thank-you-${slugSuffix}`,
      stepType: 'Thank You',
      templateSelected: false,
    });
    pages = [optinPage, thanksPage];
    steps = [
      { id: crypto.randomUUID(), label: optinName, pageId: optinId, type: 'Opt-in', category: 'Opt-in', templateSelected: false },
      { id: crypto.randomUUID(), label: thanksName, pageId: thanksId, type: 'Thank You', category: 'Thank You', templateSelected: false },
    ];
  } else {
    goalLabel = 'Lead generation';
    pages = [];
    steps = [];
  }

  const document: BuilderDocument = {
    pages,
    steps,
    inactivePage: createDefaultInactivePage(title),
    theme: { color: '#6366f1', font: 'Manrope', corners: 'Rounded' },
    funnel: {
      name: title,
      goal: goalLabel,
      goalType,
      currency,
      funnelActive: true,
      audience: '',
      offer: title,
      pagesFlow: pages.map(p => p.id),
      events: goalType === 'sell' ? ['Form Submit', 'Checkout'] : ['Form Submit'],
      status: 'Draft',
      deadlineSettings: {
        enabled: false,
        days: 5,
        redirectStepId: '__inactive__',
        expireAtTimeEnabled: false,
        expireAtTime: '23:59',
        enabledStepIds: [],
      },
    },
  };

  return {
    id: crypto.randomUUID(),
    kind: 'funnel',
    name: title,
    domain: domain || '',
    currency,
    image: '/dashboard/hero-landscape.png',
    updated: new Date().toISOString(),
    description:
      goalType === 'sell'
        ? 'Sales & checkout funnel'
        : goalType === 'audience'
          ? 'Audience & lead capture funnel'
          : 'Custom funnel workspace',
    document,
    settings: {
      seo: title,
      navigation: pages.map(p => p.name).join(', '),
      color: '#6366f1',
    },
  };
}

function rekeySections(sections: BuilderSection[], nextPageId?: string): BuilderSection[] {
  return sections.map(sec => {
    const copy = structuredClone(sec);
    copy.id = `sec-${crypto.randomUUID().slice(0, 10)}`;
    if (nextPageId && (copy.content?.destinationType === 'Next Step' || ['Form', 'Contact Form', 'Payment'].includes(copy.type))) {
      if (copy.content?.destinationType === 'Next Step' || copy.type === 'Form' || copy.type === 'Contact Form') {
        copy.content = {
          ...copy.content,
          ...(copy.type === 'Form' || copy.type === 'Contact Form' ? { nextPage: nextPageId } : {}),
          ...(copy.content?.destinationType === 'Next Step' ? { destination: nextPageId } : {}),
        };
      }
    }
    if (Array.isArray(copy.children)) {
      copy.children = copy.children.map(col => rekeySections(col, nextPageId));
    }
    return copy;
  });
}

/**
 * Strictly non-destructive deep clone of a template page into a user's funnel step.
 * Preserves the step's ID, name, URL path, CRM routing, and step configurations.
 */
export function cloneTemplateIntoStep(
  targetPage: BuilderPage,
  templatePage: BuilderPage,
  nextPageId?: string
): BuilderPage {
  const clonedTemplate = structuredClone(templatePage);
  return {
    ...clonedTemplate,
    id: targetPage.id,
    name: targetPage.name,
    path: targetPage.path,
    status: 'Draft',
    isFunnelStep: targetPage.isFunnelStep ?? true,
    crmRouting: targetPage.crmRouting ? structuredClone(targetPage.crmRouting) : undefined,
    stepCategory: targetPage.stepCategory || clonedTemplate.stepCategory,
    stepConfig: targetPage.stepConfig ? structuredClone(targetPage.stepConfig) : clonedTemplate.stepConfig,
    templateSelected: true,
    sections: rekeySections(clonedTemplate.sections || [], nextPageId),
  };
}
