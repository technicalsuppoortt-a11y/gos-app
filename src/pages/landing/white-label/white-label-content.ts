/* =========================================================
   Upgraded Landing & White-Label Program Copy (EN / AR / NL / DE).
   Kept outside LandingCopy on purpose: the landing CMS validates
   published content against LandingCopy's exact shape, so keeping
   extended structured copy here preserves saved CMS drafts.
   All Arabic (ar) copy is authored in clean, natural Modern Standard Arabic.
   ========================================================= */

export type ReplacedBrand = {
  id?: string;
  name: string;
  short: string;
  color: string;
};

export type CompareRow = {
  feature: string;
  replaces: ReplacedBrand[];
  otherCost: string;
  uniqueTag?: boolean;
};

export type WhiteLabelCopy = {
  nav: string;
  headerNav: {
    problem: string;
    solution: string;
    aiDemo: string;
    compare: string;
    whiteLabel: string;
    planFaq: string;
    results: string;
  };
  heroTransform: {
    wlPill: string;
    wlTag: string;
    sectionTitle: string;
    sectionSub: string;
    beforeBadge: string;
    beforeLabel: string;
    beforeSub: string;
    arrowLabel: string;
    arrowSub: string;
    afterBadge: string;
    afterLabel: string;
    afterSub: string;
    pickBrand: string;
    domainReady: string;
    syncedNote: string;
  };
  s1: {
    badge: string;
    tag: string;
    title: string;
    subtitle: string;
    checks: string[];
    cta: string;
    logoHere: string;
  };
  s2: {
    badge: string;
    audiences: string[];
    titleA: string;
    titleHighlight: string;
    titleB: string;
    cards: string[];
    solution: string;
  };
  s3: {
    badge: string;
    title: string;
    hub: string;
    nodes: string[];
  };
  s4: {
    badge: string;
    tag: string;
    title: string;
    features: string[];
    brand: string;
    domain: string;
    secure: string;
  };
  s5: {
    badge: string;
    titleHighlight: string;
    titleA: string;
    titleB: string;
    plansTitle: string;
    plans: string[];
    paymentsTitle: string;
    active: string;
    ready: string;
  };
  s6: {
    badge: string;
    title: string;
    tools: { title: string; text: string }[];
  };
  s8: {
    badge: string;
    title: string;
    steps: string[];
    chips: string[];
  };
  s9: {
    badge: string;
    title: string;
    subtitle: string;
    planBadge: string;
    planName: string;
    price: string;
    period: string;
    planNote: string;
    trialHighlight: string;
    features: string[];
    cta: string;
    faqTitle: string;
    faq: { q: string; a: string }[];
  };
  barsSection: {
    badge: string;
    title: string;
    subtitle: string;
  };
  compareSection: {
    badge: string;
    title: string;
    subtitle: string;
    colFeature: string;
    colReplaces: string;
    colOther: string;
    colPlatform: string;
    overallLabel: string;
    overallOther: string;
    overallPrice: string;
    overallPeriod: string;
    trialPill: string;
    cta: string;
    rows: CompareRow[];
  };
  demoChannels: {
    switchLabel: string;
    channels: {
      id: 'whatsapp' | 'messenger' | 'instagram' | 'webchat';
      label: string;
      stageSub: string;
      status: string;
      placeholder: string;
    }[];
    seen: string;
  };
  resultsUpgrade: {
    ratingPill: string;
    verified: string;
    kpis: { value: string; label: string; sub: string }[];
    proofMeta: { metric: string; category: string; outcome: string }[];
    bannerTitle: string;
    bannerSub: string;
    bannerCta: string;
  };
  trialModal: {
    badge: string;
    specialTag: string;
    sideTitle: string;
    sideLead: string;
    perks: { title: string; text: string }[];
    termsTitle: string;
    termsList: string[];
    formTitle: string;
    formSubtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    workspaceLabel: string;
    workspacePlaceholder: string;
    domainPreview: string;
    emailLabel: string;
    emailPlaceholder: string;
    phoneLabel: string;
    phoneOptional: string;
    phonePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordHint: string;
    strengthLabels: [string, string, string, string];
    agreePrefix: string;
    termsLink: string;
    andText: string;
    privacyLink: string;
    agreeTrialSuffix: string;
    submit: string;
    submitting: string;
    haveAccount: string;
    loginCta: string;
    closeLabel: string;
    successTitle: string;
    successText: string;
    errors: {
      name: string;
      workspace: string;
      email: string;
      password: string;
      terms: string;
      exists: string;
      paused: string;
      unavailable: string;
      generic: string;
    };
  };
};

function getCompareBrands(locale: 'en' | 'ar' | 'nl' | 'de') {
  const isAr = locale === 'ar';
  return {
    chatgpt: { id: 'chatgpt', name: 'ChatGPT Team', short: 'AI', color: '#10A37F' },
    claude: { id: 'claude', name: 'Claude', short: 'CL', color: '#D97757' },
    jasper: { id: 'jasper', name: 'Jasper AI', short: 'J', color: '#8B5CF6' },
    airai: { id: 'airai', name: 'Air AI', short: 'VA', color: '#6366F1' },
    manychat: { id: 'manychat', name: 'ManyChat', short: 'MC', color: '#0084FF' },
    elevenlabs: { id: 'elevenlabs', name: 'ElevenLabs', short: '11', color: '#334155' },
    respond: { id: 'respond', name: 'Respond.io', short: 'R', color: '#2563EB' },
    wati: { id: 'wati', name: isAr ? 'واتي' : 'Wati', short: 'WT', color: '#00B67A' },
    intercom: { id: 'intercom', name: 'Intercom', short: 'IC', color: '#1F2937' },
    hubspot: { id: 'hubspot', name: 'HubSpot', short: 'HS', color: '#FF7A59' },
    pipedrive: { id: 'pipedrive', name: 'Pipedrive', short: 'PD', color: '#16A34A' },
    zoho: { id: 'zoho', name: 'Zoho CRM', short: 'ZH', color: '#E42527' },
    canva: { id: 'canva', name: isAr ? 'كانفا' : 'Canva', short: 'CV', color: '#00C4CC' },
    clickfunnels: { id: 'clickfunnels', name: 'ClickFunnels', short: 'CF', color: '#F97316' },
    webflow: { id: 'webflow', name: 'Webflow', short: 'W', color: '#4353FF' },
    wix: { id: 'wix', name: 'Wix', short: 'WX', color: '#0F172A' },
    calendly: { id: 'calendly', name: 'Calendly', short: 'C', color: '#006BFF' },
    acuity: { id: 'acuity', name: 'Acuity', short: 'AC', color: '#0D9488' },
    calcom: { id: 'calcom', name: 'Cal.com', short: 'CL', color: '#374151' },
    salla: { id: 'salla', name: isAr ? 'سلة' : 'Salla', short: 'SL', color: '#00A886' },
    shopify: { id: 'shopify', name: 'Shopify', short: 'SH', color: '#5E8E3E' },
    kajabi: { id: 'kajabi', name: 'Kajabi', short: 'K', color: '#2563EB' },
    teachable: { id: 'teachable', name: 'Teachable', short: 'T', color: '#10B981' },
    activecampaign: { id: 'activecampaign', name: 'ActiveCampaign', short: 'AC', color: '#356AE6' },
    mailchimp: { id: 'mailchimp', name: 'Mailchimp', short: 'M', color: '#D97706' },
    brevo: { id: 'brevo', name: 'Brevo', short: 'BR', color: '#0B996E' },
    zapier: { id: 'zapier', name: 'Zapier', short: 'Z', color: '#FF4F00' },
    make: { id: 'make', name: 'Make', short: 'MK', color: '#9333EA' },
    n8n: { id: 'n8n', name: 'n8n', short: 'N8', color: '#EA4B71' },
    cloudflare: { id: 'cloudflare', name: 'Cloudflare Pro', short: 'CF', color: '#F59E0B' },
    godaddy: { id: 'godaddy', name: 'GoDaddy', short: 'GD', color: '#00A4A6' },
    namecheap: { id: 'namecheap', name: 'Namecheap', short: 'NC', color: '#DE3723' },
    databox: { id: 'databox', name: 'Databox', short: 'DB', color: '#0284C7' },
    mixpanel: { id: 'mixpanel', name: 'Mixpanel', short: 'MX', color: '#7C3AED' },
    hotjar: { id: 'hotjar', name: 'Hotjar', short: 'HJ', color: '#FF3C00' },
  } as const;
}

const BRANDS_EN = getCompareBrands('en');
const BRANDS_AR = getCompareBrands('ar');
const BRANDS_NL = getCompareBrands('nl');
const BRANDS_DE = getCompareBrands('de');

const en: WhiteLabelCopy = {
  nav: 'White-Label',
  headerNav: {
    problem: 'The Problem',
    solution: 'AI System',
    aiDemo: 'Live Demo',
    compare: 'Compare',
    whiteLabel: 'White-Label',
    planFaq: 'Plan & FAQ',
    results: 'Results',
  },
  heroTransform: {
    wlPill: 'Own your software company',
    wlTag: 'White-Label',
    sectionTitle: 'From Upklick Engine to 100% Your Software Brand',
    sectionSub: 'Every dashboard, tool, login screen, and domain transforms seamlessly into your own company identity — with the exact same enterprise polish.',
    beforeBadge: 'Before · Engine',
    beforeLabel: 'Upklick Platform',
    beforeSub: 'Ready AI & 12 business tools',
    arrowLabel: '1-Click White-Label',
    arrowSub: 'Your Logo · Domain · Colors',
    afterBadge: 'After · Your SaaS',
    afterLabel: 'Your Brand',
    afterSub: '100% owned client experience',
    pickBrand: 'Preview brand theme:',
    domainReady: 'SSL Active',
    syncedNote: 'Click any sidebar tool to preview both dashboards in sync',
  },
  s1: {
    badge: 'Own your software company',
    tag: 'White-Label',
    title: 'Own an AI platform that delivers complete solutions to run your online business',
    subtitle: 'A complete platform under your name and your company logo',
    checks: [
      '100% your brand — your domain and a mobile app in your name',
      'We are the tech provider: Meta, AI, email and domains connected',
      '12 business tools in one system for your clients',
    ],
    cta: 'Start Now',
    logoHere: 'Your logo here',
  },
  s2: {
    badge: 'The Opportunity',
    audiences: ['Marketing agencies', 'Coaches & consultants', 'Software companies', 'Clinics, real estate & stores'],
    titleA: 'Building software from',
    titleHighlight: 'scratch is costly and complex —',
    titleB: 'and selling services alone rarely creates predictable monthly recurring revenue',
    cards: [
      'Zero scratch-development or maintenance overhead',
      'Pre-approved official Meta & AI provider stack',
      'Unify clients scattered across 10+ disconnected tools',
      'A service client leaves — a system client stays',
    ],
    solution: 'The opportunity: receive the entire AI & follow-up infrastructure ready, and sell it under your own brand from day one.',
  },
  s3: {
    badge: 'Fully ready infrastructure',
    title: 'We run the entire technical stack behind the scenes — you are the sole owner in front of your clients',
    hub: 'Your platform, your name',
    nodes: [
      'Official Meta channels provider: WhatsApp, Instagram & Messenger',
      'AI provider on credits — zero API keys to manage',
      'Ready-to-send email marketing & broadcast relay',
      'Domain registration & resale provider — at your profit margin',
    ],
  },
  s4: {
    badge: 'Full White-Label',
    tag: '100% Your Brand',
    title: 'Our name disappears completely — every screen, email, and link carries only your company identity',
    features: [
      'Brand identity studio with Light & Dark modes',
      'Your custom domain with automatic free SSL',
      'Branded login screens and transactional emails',
      'Installable PWA mobile app with your brand icon',
    ],
    brand: 'Your brand',
    domain: 'app.yourbrand.com',
    secure: 'SSL Active',
  },
  s5: {
    badge: 'Commercial control & integrated payment gateways',
    titleHighlight: 'Engineer your plans',
    titleA: 'at the margins you choose —',
    titleB: 'and collect payments through the gateways your clients already trust',
    plansTitle: 'Plans & profit engineering',
    plans: [
      'Monthly, annual, fixed-duration & lifetime plans',
      'Sell extra AI credits, seats & promotional coupons',
      'Multi-currency billing: USD · EUR · SAR · AED · EGP',
    ],
    paymentsTitle: 'Integrated global & regional payment methods',
    active: 'Integrated',
    ready: 'Ready',
  },
  s6: {
    badge: 'The product you will sell to your clients',
    title: 'Deliver a complete AI business operating system that runs marketing, sales, and fulfillment from one screen',
    tools: [
      { title: 'AI Copilot & Voice Agent', text: '24/7 autonomous sales assistant' },
      { title: 'Unified Meta Inbox', text: 'WhatsApp, Instagram, Messenger & Web' },
      { title: 'Websites & Funnels Builder', text: 'Drag-and-drop pages & templates' },
      { title: 'Visual Flow Automation', text: 'Smart chatbot & follow-up sequences' },
      { title: 'CRM & Lead Pipeline', text: 'Deal stages & team shift routing' },
      { title: 'Booking & Calendar Engine', text: 'Two-way Google Calendar sync' },
      { title: 'Products, Courses & Portal', text: 'Digital checkout & member library' },
      { title: 'Live Analytics & BI Reports', text: 'Meta/Google pixel & revenue tracking' },
    ],
  },
  s8: {
    badge: 'Launch & operation steps',
    title: 'Go from activating your Admin account to your first paying subscriber in 4 clear steps',
    steps: [
      'Customize your brand identity & connect your domain',
      'Create subscription tiers & connect payment gateways',
      'Present your live demo & onboard client workspaces',
      'Track recurring margins & support clients in one click',
    ],
    chips: ['Ready-to-present demo workspace', 'One-click client account switch', 'Built-in support chat in your name'],
  },
  s9: {
    badge: 'The plan & FAQ',
    title: 'One Transparent Plan. Unlimited Growth Potential.',
    subtitle: 'Everything you need to run your AI follow-up engine and scale your own White-Label software company — backed by an instant Free Trial.',
    planBadge: 'All-Inclusive Platform Plan',
    planName: 'Super Admin & White-Label Plan',
    price: '$99',
    period: '/ month',
    planNote: 'Direct subscription — unlimited client accounts & zero revenue commission',
    trialHighlight: 'Includes 14-Day Free Admin Trial · $0 due today',
    features: [
      'Full 100% White-Label studio, custom domain & PWA mobile app',
      'Built-in tech provider: official Meta, AI credits, email & domains',
      'All 12 business, CRM, funnel, booking & AI follow-up tools included',
      'Connect Stripe, Paymob, Paddle, Fawry, Kashier, wallets & cards',
      'Create unlimited custom monthly, annual & lifetime client plans',
      'One-click client workspace switching & branded support desk',
    ],
    cta: 'Start Now',
    faqTitle: 'Frequently Asked Questions',
    faq: [
      {
        q: 'How does the Free Trial Admin account work?',
        a: 'Click "Start Now" to create your Admin workspace immediately with our complimentary Free Trial. You get instant access to Brand Studio, plan creation, starter AI credits, and all 12 tools before paying anything.',
      },
      {
        q: 'Can my clients see the Upklick name anywhere?',
        a: 'No. Screens, login portals, emails, links, your custom domain, and the PWA mobile app carry exclusively your brand identity.',
      },
      {
        q: 'Do I need developer accounts or API keys for Meta and OpenAI?',
        a: 'No. We operate as your underlying technical provider for official Meta channels, AI models, email delivery, and domain registration — zero API keys or developer approvals required.',
      },
      {
        q: 'How do I collect subscription payments from my clients?',
        a: 'Connect your own Stripe, Paymob, Paddle, PayPal, Fawry, Kashier, Vodafone Cash, or InstaPay accounts and collect 100% of client payments directly.',
      },
      {
        q: 'How do I earn profit margins on AI usage and communications?',
        a: 'You set your own plan prices, credit bundles, and per-unit top-up rates above wholesale cost — every client renewal and top-up builds your recurring margin.',
      },
      {
        q: 'Does the AI replace human sales teams, or work alongside them?',
        a: 'It empowers them. The AI responds in seconds 24/7, qualifies leads, and books calls, while allowing human agents to take over any chat in one click from the Unified Inbox.',
      },
    ],
  },
  barsSection: {
    badge: 'White-Label Architecture',
    title: 'Everything Built for You to Sell, Operate & Scale.',
    subtitle: 'Five integrated pillars engineered into one scannable operating system — ready under your brand from day one.',
  },
  compareSection: {
    badge: 'Platform Comparison',
    title: 'What’s Included with Upklick',
    subtitle: 'Replace a fragmented stack of 12+ expensive monthly subscriptions with one unified AI & White-Label operating system.',
    colFeature: 'Features',
    colReplaces: 'Replaces',
    colOther: 'Other tools',
    colPlatform: 'Upklick',
    overallLabel: 'OVERALL PRICE',
    overallOther: '$1,646+ / MONTH',
    overallPrice: '$99',
    overallPeriod: '/mo',
    trialPill: 'Free Admin Trial Included',
    cta: 'Start Now',
    rows: [
      { feature: 'AI Copilot & Autonomous Agents', replaces: [BRANDS_EN.chatgpt, BRANDS_EN.claude, BRANDS_EN.jasper], otherCost: '$99/monthly' },
      { feature: '24/7 AI Follow-Up & Voice Qualification', replaces: [BRANDS_EN.airai, BRANDS_EN.manychat, BRANDS_EN.elevenlabs], otherCost: '$149/monthly' },
      { feature: 'Unified Multi-Channel Inbox (WA, IG, FB)', replaces: [BRANDS_EN.respond, BRANDS_EN.wati, BRANDS_EN.intercom], otherCost: '$129/monthly' },
      { feature: 'CRM & Multi-Stage Deal Pipelines', replaces: [BRANDS_EN.hubspot, BRANDS_EN.pipedrive, BRANDS_EN.zoho], otherCost: '$99/monthly' },
      { feature: 'Unlimited Sales Funnels & Website Builder', replaces: [BRANDS_EN.clickfunnels, BRANDS_EN.canva, BRANDS_EN.webflow, BRANDS_EN.wix], otherCost: '$297/monthly' },
      { feature: 'Booking Pages & Google Calendar Sync', replaces: [BRANDS_EN.calendly, BRANDS_EN.acuity, BRANDS_EN.calcom], otherCost: '$29/monthly' },
      { feature: 'Courses, Digital Products & Multi-Gateway Checkout', replaces: [BRANDS_EN.salla, BRANDS_EN.shopify, BRANDS_EN.kajabi, BRANDS_EN.teachable], otherCost: '$159/monthly' },
      { feature: 'Email & WhatsApp Broadcast Campaigns', replaces: [BRANDS_EN.activecampaign, BRANDS_EN.mailchimp, BRANDS_EN.brevo], otherCost: '$99/monthly' },
      { feature: 'Visual Chatbot & Workflow Automations', replaces: [BRANDS_EN.zapier, BRANDS_EN.make, BRANDS_EN.n8n], otherCost: '$89/monthly' },
      { feature: 'Custom Domains, Registrar Resale & Auto-SSL', replaces: [BRANDS_EN.cloudflare, BRANDS_EN.godaddy, BRANDS_EN.namecheap], otherCost: '$49/monthly' },
      { feature: 'Live Analytics, Pixel Attribution & BI Reports', replaces: [BRANDS_EN.databox, BRANDS_EN.mixpanel, BRANDS_EN.hotjar], otherCost: '$149/monthly' },
      { feature: '100% White-Label SaaS & Branded Mobile App', replaces: [], otherCost: 'Unique to Upklick ($299+ value)', uniqueTag: true },
    ],
  },
  demoChannels: {
    switchLabel: 'Select live channel:',
    channels: [
      { id: 'whatsapp', label: 'WhatsApp', stageSub: 'From WhatsApp Business', status: 'online', placeholder: 'Message' },
      { id: 'messenger', label: 'Messenger', stageSub: 'From Facebook Messenger', status: 'Active now', placeholder: 'Aa' },
      { id: 'instagram', label: 'Instagram', stageSub: 'From Instagram DM', status: 'Active now', placeholder: 'Message...' },
      { id: 'webchat', label: 'Website Chat', stageSub: 'From Website Live Widget', status: 'Replies in <10s', placeholder: 'Ask anything...' },
    ],
    seen: 'Seen just now',
  },
  resultsUpgrade: {
    ratingPill: '4.9 / 5 Verified Partner Satisfaction',
    verified: 'Verified Partner',
    kpis: [
      { value: '+38%', label: 'More Booked Calls', sub: 'Automated AI qualification & reminders' },
      { value: '< 10s', label: 'Instant First Reply', sub: '24/7 across WhatsApp, IG, Messenger & Web' },
      { value: '12-in-1', label: 'Tools Consolidated', sub: 'Saving $1,500+/mo in software bloat' },
      { value: '3.4x', label: 'Recurring Revenue Lift', sub: 'Agencies transitioning to SaaS ownership' },
    ],
    proofMeta: [
      { metric: '+42% Booked Calls', category: 'Coaching & Advisory', outcome: 'From manual chasing to automated daily bookings' },
      { metric: '9s Avg. Reply Speed', category: 'B2B Consulting', outcome: 'Zero missed inquiries across WhatsApp & Instagram' },
      { metric: '24 Active SaaS Clients', category: 'White-Label Agency', outcome: 'Launched branded platform & recurring MRR in 3 weeks' },
    ],
    bannerTitle: 'Ready to Achieve Real Results Under Your Own Brand?',
    bannerSub: 'Create your Admin account now, activate your Free Trial instantly, and experience the complete platform firsthand.',
    bannerCta: 'Start Now',
  },
  trialModal: {
    badge: 'Special Admin Access',
    specialTag: 'Free Trial Included',
    sideTitle: 'Launch Your Admin Workspace with a Free Trial',
    sideLead: 'Create your full Admin account today with $0 upfront. Test every tool, customize your White-Label identity, and onboard your business with confidence.',
    perks: [
      { title: '14-Day Complimentary Admin Trial', text: 'Full platform & White-Label studio unlocked immediately — $0 due today.' },
      { title: 'All 12 AI & Business Tools Active', text: 'AI Copilot, Follow-Up, Unified Inbox, Funnels, CRM, Booking, Payments & BI.' },
      { title: 'Starter AI Credits & Demo Workspace', text: 'Includes starter AI credits plus a ready-seeded Agency workspace.' },
      { title: 'Seamless Upgrade Anytime ($99/mo)', text: 'Keep your custom domain, branding, plans, and clients when you subscribe.' },
    ],
    termsTitle: 'Free Trial Eligibility & Special Terms',
    termsList: [
      'Eligible for new Admin workspaces (1 complimentary trial per organization).',
      'No credit card required to activate your trial workspace.',
      'Full data ownership — upgrade to the $99/mo unlimited plan anytime.',
    ],
    formTitle: 'Create Your Admin Account',
    formSubtitle: 'Set up your credentials and brand workspace in under 60 seconds.',
    nameLabel: 'Full name',
    namePlaceholder: 'e.g. Mohamed Tarek',
    workspaceLabel: 'Company or software brand name',
    workspacePlaceholder: 'e.g. Orbit Growth Cloud',
    domainPreview: 'Workspace preview:',
    emailLabel: 'Work email',
    emailPlaceholder: 'you@yourcompany.com',
    phoneLabel: 'Phone / WhatsApp',
    phoneOptional: 'Optional',
    phonePlaceholder: '+1 555 234 5678',
    passwordLabel: 'Create password',
    passwordPlaceholder: 'At least 8 characters',
    passwordHint: 'Use 8+ characters with letters and numbers.',
    strengthLabels: ['Too short', 'Fair', 'Good', 'Strong'],
    agreePrefix: 'I agree to the',
    termsLink: 'Terms of Service',
    andText: 'and',
    privacyLink: 'Privacy Policy',
    agreeTrialSuffix: 'and confirm eligibility for one complimentary Admin Free Trial.',
    submit: 'Start Free Trial Now',
    submitting: 'Creating your Admin workspace…',
    haveAccount: 'Already have an account?',
    loginCta: 'Log in',
    closeLabel: 'Close signup dialog',
    successTitle: 'Your Admin Trial Workspace is Ready!',
    successText: 'Signing you into your Admin dashboard now…',
    errors: {
      name: 'Please enter your full name (at least 2 characters).',
      workspace: 'Please enter your company or brand name (at least 2 characters).',
      email: 'Please enter a valid work email address.',
      password: 'Password must be between 8 and 128 characters.',
      terms: 'Please accept the Terms and Free Trial eligibility to continue.',
      exists: 'An account with this email already exists. Please log in instead.',
      paused: 'New trial registrations are temporarily paused. Please try again shortly.',
      unavailable: 'Could not reach the signup service right now. Please check your connection and try again.',
      generic: 'Could not create your Admin account. Please verify your details and try again.',
    },
  },
};

const ar: WhiteLabelCopy = {
  nav: 'العلامة البيضاء',
  headerNav: {
    problem: 'المشكلة',
    solution: 'النظام الذكي',
    aiDemo: 'العرض الحي',
    compare: 'المقارنة',
    whiteLabel: 'العلامة البيضاء',
    planFaq: 'الباقة والأسئلة',
    results: 'النتائج',
  },
  heroTransform: {
    wlPill: 'امتلك شركتك البرمجية الخاصة',
    wlTag: 'White-Label',
    sectionTitle: 'من محرك Upklick إلى منصتك البرمجية الخاصة بنسبة 100%',
    sectionSub: 'تتحول كل لوحة تحكم وأداة وشاشة دخول ونطاق بسلاسة تامة لتحمل هوية شركتك وحدها — بنفس التصميم الاحترافي المتكامل.',
    beforeBadge: 'قبل · المحرك الأساسي',
    beforeLabel: 'منصة Upklick',
    beforeSub: 'ذكاء اصطناعي و12 أداة أعمال جاهزة',
    arrowLabel: 'تحويل فوري للهوية',
    arrowSub: 'شعارك · نطاقك · ألوان علامتك',
    afterBadge: 'بعد · منصتك الخاصة',
    afterLabel: 'علامتك التجارية',
    afterSub: 'تجربة عميل مملوكة لك بالكامل',
    pickBrand: 'جرّب هوية العلامة:',
    domainReady: 'SSL مفعّل',
    syncedNote: 'اضغط على أي أداة في القائمة الجانبية لمعاينة اللوحتين معاً بالتزامن',
  },
  s1: {
    badge: 'امتلك شركتك البرمجية',
    tag: 'White-Label',
    title: 'امتلك منصة ذكاء اصطناعي متكاملة تقدّم حلولاً شاملة لإدارة وتنمية الأعمال الرقمية',
    subtitle: 'منصة سحابية متكاملة تحمل اسمك وشعار شركتك',
    checks: [
      'علامتك التجارية بنسبة 100% مع نطاقك الخاص وتطبيق جوال باسمك',
      'نحن المزوّد التقني المتكامل: ربط قنوات Meta والذكاء الاصطناعي والبريد والنطاقات',
      '12 أداة أعمال متكاملة في نظام واحد تقدّمه لعملائك',
    ],
    cta: 'ابدأ الآن',
    logoHere: 'شعار شركتك هنا',
  },
  s2: {
    badge: 'الفرصة الاستراتيجية',
    audiences: ['وكالات التسويق', 'المدربون والمستشارون', 'شركات البرمجيات', 'العيادات والعقارات والمتاجر'],
    titleA: 'تطوير البرمجيات من',
    titleHighlight: 'الصفر مكلف ومعقّد —',
    titleB: 'وتقديم الخدمات وحده لا يبني إيراداً شهرياً متكرراً ومستقراً',
    cards: [
      'توفير تكاليف التطوير البرمجي والصيانة الباهظة',
      'اعتمادات Meta وواجهات البرمجة مجهزة مسبقاً بالكامل',
      'توحيد أعمال العملاء بدلاً من تشتتهم بين 10 أدوات منفصلة',
      'عميل الخدمة يغادر سريعاً — بينما عميل النظام يستمر طويلاً',
    ],
    solution: 'الفرصة الحقيقية: تسلّم البنية التحتية للذكاء الاصطناعي والمتابعة جاهزة بالكامل، وابدأ بيعها تحت علامتك التجارية منذ اليوم الأول.',
  },
  s3: {
    badge: 'بنية تحتية جاهزة بالكامل',
    title: 'ندير البنية التقنية بالكامل خلف الكواليس — وتظهر أنت المالك الوحيد أمام عملائك',
    hub: 'منصتك بهويتك',
    nodes: [
      'مزوّد رسمي لقنوات Meta: واتساب وإنستغرام وماسنجر',
      'مزوّد ذكاء اصطناعي بنظام الرصيد — دون الحاجة لمفاتيح API',
      'منظومة حملات بريد إلكتروني مدمجة وجاهزة للإرسال',
      'نظام تسجيل وإعادة بيع النطاقات بهامش ربحك الخاص',
    ],
  },
  s4: {
    badge: 'علامة بيضاء كاملة',
    tag: 'هويتك 100%',
    title: 'يختفي اسمنا تماماً؛ فكل شاشة وبريد إلكتروني ورابط يحمل هوية شركتك وحدها',
    features: [
      'استوديو متكامل للهوية البصرية بالوضعين الفاتح والداكن',
      'نطاقك المخصص مع شهادة أمان SSL مجانية وتلقائية',
      'صفحات تسجيل الدخول ورسائل البريد باسم شركتك',
      'تطبيق جوال تقدمي (PWA) يحمل أيقونة علامتك التجارية',
    ],
    brand: 'علامتك التجارية',
    domain: 'app.yourbrand.com',
    secure: 'SSL آمن',
  },
  s5: {
    badge: 'تحكم تجاري وبوابات دفع متكاملة',
    titleHighlight: 'صمّم باقاتك',
    titleA: 'بهوامش الربح التي تناسبك —',
    titleB: 'وحصّل المدفوعات عبر البوابات والوسائل المعتمدة لدى عملائك محلياً ودولياً',
    plansTitle: 'هندسة الباقات وهوامش الربح',
    plans: [
      'باقات شهرية وسنوية ومحددة المدة ومدى الحياة',
      'بيع أرصدة الذكاء الاصطناعي الإضافية والمقاعد وكوبونات الخصم',
      'دعم تعدد العملات: USD · EUR · SAR · AED · EGP',
    ],
    paymentsTitle: 'بوابات وطرق دفع عالمية وإقليمية متكاملة',
    active: 'متكامل',
    ready: 'جاهز للربط',
  },
  s6: {
    badge: 'المنتج الذي ستقدّمه لعملائك',
    title: 'امنح عملاءك نظام تشغيل أعمال متكاملاً يدير التسويق والمبيعات وخدمة العملاء من شاشة واحدة',
    tools: [
      { title: 'مساعد المبيعات الذكي والصوتي', text: 'وكيل ذكاء اصطناعي على مدار الساعة' },
      { title: 'صندوق الوارد الموحد', text: 'واتساب وإنستغرام وماسنجر ودردشة الموقع' },
      { title: 'منشئ المواقع ومسارات البيع', text: 'محرر سحب وإفلات وقوالب احترافية' },
      { title: 'مصمم مسارات الأتمتة المرئية', text: 'بناء الشات بوت وسلاسل المتابعة الذكية' },
      { title: 'إدارة علاقات العملاء (CRM)', text: 'مراحل الصفقات وتوزيع المهام والمناوبات' },
      { title: 'محرك حجز المواعيد والتقويم', text: 'مزامنة ثنائية فورية مع تقويم Google' },
      { title: 'بيع المنتجات والدورات الرقمية', text: 'صفحات دفع ذكية وبوابة خاصة للعملاء' },
      { title: 'التحليلات الحية وتقارير الأداء', text: 'تتبع البيكسل ومؤشرات العائد والتحويل' },
    ],
  },
  s8: {
    badge: 'خطوات الإطلاق والتشغيل',
    title: 'من تفعيل حساب المدير إلى أول مشترك فعلي في منصتك عبر 4 خطوات واضحة',
    steps: [
      'خصّص هويتك البصرية واربط نطاقك الخاص',
      'أنشئ باقات الاشتراك وفعّل بوابات الدفع',
      'استعرض الحساب التجريبي الجاهز وافتح حسابات عملائك',
      'تابع نمو أرباحك وادعم عملاءك بنقرة واحدة',
    ],
    chips: ['حساب عرض تجريبي جاهز فوراً', 'الدخول السريع لحسابات العملاء للمساندة', 'نظام محادثات دعم فني باسم شركتك'],
  },
  s9: {
    badge: 'الباقة والأسئلة الشائعة',
    title: 'باقة شاملة وشفافة لنمو غير محدود.',
    subtitle: 'كل ما تحتاجه لتشغيل منظومة المتابعة الذكية وإطلاق شركتك البرمجية بالعلامة البيضاء — مع تجربة مجانية فورية لحساب المدير.',
    planBadge: 'الباقة الشاملة للمنصة',
    planName: 'باقة المدير الشاملة والعلامة البيضاء',
    price: '$99',
    period: '/ شهرياً',
    planNote: 'اشتراك مباشر ثابت — عدد غير محدود من حسابات العملاء ودون أي عمولة على مبيعاتك',
    trialHighlight: 'تشمل تجربة مجانية لمدة 14 يوماً · 0$ مستحق اليوم',
    features: [
      'علامة بيضاء كاملة 100% مع نطاقك المخصص وتطبيق جوال PWA',
      'مزوّد تقني مدمج: قنوات Meta الرسمية والذكاء الاصطناعي والبريد والنطاقات',
      'جميع أدوات الأعمال الـ 12 لإدارة العملاء والمسارات والحجوزات والمتابعة الذكية',
      'ربط مباشر مع Stripe وPaymob وPaddle وفوري وكاشير والمحافظ والبطاقات',
      'إنشاء عدد غير محدود من الباقات الشهرية والسنوية لعملائك بتسعيرك الخاص',
      'التبديل الفوري لمساندة حسابات العملاء ونظام دعم فني مدمج باسمك',
    ],
    cta: 'ابدأ الآن',
    faqTitle: 'الأسئلة الأكثر شيوعاً',
    faq: [
      {
        q: 'كيف تعمل التجربة المجانية لحساب المدير؟',
        a: 'اضغط على «ابدأ الآن» لإنشاء حساب المدير الخاص بك فوراً مع تفعيل الفترة التجريبية المجانية تلقائياً؛ حيث تحصل على وصول كامل لاستوديو الهوية البصرية وإنشاء الباقات ورصيد الذكاء الاصطناعي الترحيبي وكافة الأدوات الـ 12 دون أي رسوم مسبقة.',
      },
      {
        q: 'هل يظهر اسم Upklick لعملائي في أي مكان داخل المنصة؟',
        a: 'لا على الإطلاق. جميع الشاشات وصفحات الدخول ورسائل البريد الإلكتروني والروابط والنطاق المخصص وتطبيق الجوال تحمل اسم وشعار شركتك وحدها.',
      },
      {
        q: 'هل أحتاج إلى خبرة برمجية أو إنشاء حسابات مطورين في Meta وOpenAI؟',
        a: 'لا. نعمل كمزوّد تقني متكامل لقنوات Meta الرسمية ونماذج الذكاء الاصطناعي والبريد الإلكتروني وتسجيل النطاقات، دون الحاجة لإدارة مفاتيح API أو انتظار موافقات المطورين.',
      },
      {
        q: 'كيف أتسلم مدفوعات الاشتراكات من عملائي؟',
        a: 'تربط حساباتك الخاصة في بوابات الدفع مثل Stripe وPaymob وPaddle وPayPal وفوري وكاشير وفودافون كاش وإنستاباي، وتُحصّل الاشتراكات مباشرة إلى حساباتك بنسبة 100%.',
      },
      {
        q: 'كيف أحقق هامش ربح من استهلاك الذكاء الاصطناعي والرسائل؟',
        a: 'أنت من يحدد أسعار الباقات وحزم الرصيد الإضافية لعملائك أعلى من تكلفة المزوّد، بحيث يضيف كل اشتراك أو شحن رصيد عوائد متكررة لشركتك.',
      },
      {
        q: 'هل يستبدل الذكاء الاصطناعي فريق المبيعات أم يتكامل معه؟',
        a: 'يتكامل معه بكفاءة؛ إذ يتولى الرد الفوري خلال ثوانٍ وتأهيل العملاء وحجز المواعيد على مدار الساعة، مع إتاحة التدخل البشري الفوري بنقرة واحدة من صندوق الوارد الموحد.',
      },
    ],
  },
  barsSection: {
    badge: 'منظومة العلامة البيضاء المتكاملة',
    title: 'كل ما يلزمك للبيع والتشغيل والتوسع في قسم واحد منظم.',
    subtitle: 'خمس ركائز أساسية مصممة في مسارات أفقية واضحة — جاهزة للعمل تحت علامتك التجارية منذ اللحظة الأولى.',
  },
  compareSection: {
    badge: 'مقارنة المنصة والأدوات',
    title: 'ماذا يتضمن اشتراكك في Upklick؟',
    subtitle: 'استبدل أكثر من 12 اشتراكاً شهرياً منفصلاً ومكلفاً بنظام تشغيل موحد للذكاء الاصطناعي والعلامة البيضاء.',
    colFeature: 'الأدوات والمزايا',
    colReplaces: 'يغنيك عن',
    colOther: 'الأدوات الأخرى',
    colPlatform: 'Upklick',
    overallLabel: 'إجمالي التكلفة الشهرية',
    overallOther: '+$1,646 / شهرياً',
    overallPrice: '$99',
    overallPeriod: '/شهرياً',
    trialPill: 'يشمل تجربة مجانية لحساب المدير',
    cta: 'ابدأ الآن',
    rows: [
      { feature: 'مساعد الذكاء الاصطناعي والوكلاء المستقلون (AI Copilot)', replaces: [BRANDS_AR.chatgpt, BRANDS_AR.claude, BRANDS_AR.jasper], otherCost: '$99 / شهرياً' },
      { feature: 'المتابعة الذكية والتأهيل الصوتي على مدار الساعة', replaces: [BRANDS_AR.airai, BRANDS_AR.manychat, BRANDS_AR.elevenlabs], otherCost: '$149 / شهرياً' },
      { feature: 'صندوق الوارد الموحد (واتساب، إنستغرام، ماسنجر)', replaces: [BRANDS_AR.respond, BRANDS_AR.wati, BRANDS_AR.intercom], otherCost: '$129 / شهرياً' },
      { feature: 'إدارة علاقات العملاء ومسارات الصفقات (CRM)', replaces: [BRANDS_AR.hubspot, BRANDS_AR.pipedrive, BRANDS_AR.zoho], otherCost: '$99 / شهرياً' },
      { feature: 'منشئ المواقع ومسارات المبيعات غير المحدودة (Funnels)', replaces: [BRANDS_AR.clickfunnels, BRANDS_AR.canva, BRANDS_AR.webflow, BRANDS_AR.wix], otherCost: '$297 / شهرياً' },
      { feature: 'صفحات حجز المواعيد ومزامنة تقويم Google', replaces: [BRANDS_AR.calendly, BRANDS_AR.acuity, BRANDS_AR.calcom], otherCost: '$29 / شهرياً' },
      { feature: 'المنتجات والدورات الرقمية والدفع متعدد البوابات', replaces: [BRANDS_AR.salla, BRANDS_AR.shopify, BRANDS_AR.kajabi, BRANDS_AR.teachable], otherCost: '$159 / شهرياً' },
      { feature: 'حملات البريد الإلكتروني وواتساب التسويقية', replaces: [BRANDS_AR.activecampaign, BRANDS_AR.mailchimp, BRANDS_AR.brevo], otherCost: '$99 / شهرياً' },
      { feature: 'الأتمتة المرئية ومسارات الشات بوت الذكية', replaces: [BRANDS_AR.zapier, BRANDS_AR.make, BRANDS_AR.n8n], otherCost: '$89 / شهرياً' },
      { feature: 'النطاقات المخصصة وإعادة بيع النطاقات وشهادات SSL', replaces: [BRANDS_AR.cloudflare, BRANDS_AR.godaddy, BRANDS_AR.namecheap], otherCost: '$49 / شهرياً' },
      { feature: 'التحليلات الحية وتتبع البيكسل وتقارير ذكاء الأعمال', replaces: [BRANDS_AR.databox, BRANDS_AR.mixpanel, BRANDS_AR.hotjar], otherCost: '$149 / شهرياً' },
      { feature: 'علامة بيضاء كاملة 100% وتطبيق جوال باسم علامتك', replaces: [], otherCost: 'حصري في Upklick (بقيمة +$299)', uniqueTag: true },
    ],
  },
  demoChannels: {
    switchLabel: 'اختر قناة المحادثة الحية:',
    channels: [
      { id: 'whatsapp', label: 'واتساب', stageSub: 'عبر واتساب للأعمال', status: 'متصل الآن', placeholder: 'اكتب رسالة...' },
      { id: 'messenger', label: 'ماسنجر', stageSub: 'عبر فيسبوك ماسنجر', status: 'نشط الآن', placeholder: 'Aa' },
      { id: 'instagram', label: 'إنستغرام', stageSub: 'عبر رسائل إنستغرام', status: 'نشط الآن', placeholder: 'مراسلة...' },
      { id: 'webchat', label: 'دردشة الموقع', stageSub: 'عبر نافذة الموقع المباشرة', status: 'يرد خلال أقل من 10 ثوانٍ', placeholder: 'اكتب استفسارك...' },
    ],
    seen: 'تمت المشاهدة الآن',
  },
  resultsUpgrade: {
    ratingPill: '4.9 / 5 متوسط رضا الشركاء الموثقين',
    verified: 'شريك موثق',
    kpis: [
      { value: '+38%', label: 'زيادة في المواعيد المحجوزة', sub: 'تأهيل ذكي وتذكيرات تلقائية مستمرة' },
      { value: '< 10 ث', label: 'سرعة الاستجابة الأولى', sub: 'على مدار الساعة عبر واتساب وإنستغرام والموقع' },
      { value: '12 في 1', label: 'أداة أعمال متكاملة', sub: 'توفير أكثر من 1,500$ شهرياً من الاشتراكات' },
      { value: '3.4x', label: 'نمو الإيرادات المتكررة', sub: 'للوكالات المنتقلة إلى ملكية منصتها الخاصة' },
    ],
    proofMeta: [
      { metric: '+42% مواعيد مؤكدة', category: 'التدريب والاستشارات', outcome: 'الانتقال من المتابعة اليدوية إلى الحجوزات اليومية المؤتمتة' },
      { metric: '9 ثوانٍ متوسط الرد', category: 'استشارات الأعمال', outcome: 'القضاء التام على ضياع الاستفسارات عبر واتساب وإنستغرام' },
      { metric: '24 عميلاً مشتركاً نشطاً', category: 'وكالة علامة بيضاء', outcome: 'إطلاق منصة بهوية خاصة وبناء دخل شهري متكرر خلال 3 أسابيع' },
    ],
    bannerTitle: 'هل أنت مستعد لتحقيق نتائج حقيقية تحت علامتك التجارية؟',
    bannerSub: 'أنشئ حساب المدير الآن، وفعّل تجربتك المجانية فوراً، واختبر المنصة المتكاملة بنفسك.',
    bannerCta: 'ابدأ الآن',
  },
  trialModal: {
    badge: 'وصول خاص لحساب المدير',
    specialTag: 'تجربة مجانية متضمنة',
    sideTitle: 'أطلق مساحة عمل المدير مع تجربة مجانية فورية',
    sideLead: 'أنشئ حساب المدير الكامل اليوم بتكلفة 0$ مقدماً. اختبر جميع الأدوات الـ 12، وخصّص هويتك البصرية بالعلامة البيضاء، وابدأ بثقة تامة.',
    perks: [
      { title: 'تجربة مجانية لمدة 14 يوماً لحساب المدير', text: 'تفعيل فوري للمنصة الكاملة واستوديو العلامة البيضاء — 0$ مستحق اليوم.' },
      { title: 'تفعيل جميع أدوات الأعمال والذكاء الاصطناعي الـ 12', text: 'المساعد الذكي، المتابعة، صندوق الوارد، المواقع، إدارة العملاء، الحجوزات، والمدفوعات.' },
      { title: 'رصيد ذكاء اصطناعي ترحيبي ومساحة وكالة جاهزة', text: 'يشمل رصيداً مجانياً للتجربة مع مساحة عمل وكالة مهيأة مسبقاً.' },
      { title: 'ترقية سلسة في أي وقت (99$ / شهرياً)', text: 'احتفظ بنطاقك وهويتك وباقاتك وعملائك بالكامل عند الترقية للاشتراك الدائم.' },
    ],
    termsTitle: 'شروط وأهلية التجربة المجانية الخاصة',
    termsList: [
      'متاحة لحسابات المديرين الجديدة (فترة تجريبية مجانية واحدة لكل مؤسسة).',
      'لا يُشترط إدخال بطاقة ائتمانية لتفعيل مساحة العمل التجريبية.',
      'ملكية كاملة لبياناتك — مع إمكانية الترقية لباقة الـ 99$ غير المحدودة في أي وقت.',
    ],
    formTitle: 'إنشاء حساب مدير جديد',
    formSubtitle: 'أعدّ بيانات الدخول واسم منصتك خلال أقل من 60 ثانية.',
    nameLabel: 'الاسم الكامل',
    namePlaceholder: 'مثال: محمد طارق',
    workspaceLabel: 'اسم الشركة أو العلامة البرمجية',
    workspacePlaceholder: 'مثال: Orbit السحابية للأعمال',
    domainPreview: 'معاينة النطاق:',
    emailLabel: 'البريد الإلكتروني للعمل',
    emailPlaceholder: 'you@yourcompany.com',
    phoneLabel: 'رقم الجوال / واتساب',
    phoneOptional: 'اختياري',
    phonePlaceholder: '+966 50 123 4567',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '8 أحرف على الأقل',
    passwordHint: 'استخدم 8 أحرف أو أكثر تجمع بين الأحرف والأرقام.',
    strengthLabels: ['قصيرة جداً', 'مقبولة', 'جيدة', 'قوية'],
    agreePrefix: 'أوافق على',
    termsLink: 'شروط الخدمة',
    andText: 'و',
    privacyLink: 'سياسة الخصوصية',
    agreeTrialSuffix: 'وأقرّ بأهلية الحصول على تجربة مجانية واحدة لحساب المدير الجديد.',
    submit: 'ابدأ التجربة المجانية الآن',
    submitting: 'جارٍ إعداد مساحة عمل المدير…',
    haveAccount: 'هل لديك حساب بالفعل؟',
    loginCta: 'تسجيل الدخول',
    closeLabel: 'إغلاق نافذة التسجيل',
    successTitle: 'أصبحت مساحة عمل المدير التجريبية جاهزة!',
    successText: 'جارٍ توجيهك الآن إلى لوحة تحكم المدير…',
    errors: {
      name: 'يرجى إدخال الاسم الكامل (حرفان على الأقل).',
      workspace: 'يرجى إدخال اسم الشركة أو العلامة التجارية (حرفان على الأقل).',
      email: 'يرجى إدخال عنوان بريد إلكتروني صالح للعمل.',
      password: 'يجب أن تتكون كلمة المرور من 8 إلى 128 حرفاً.',
      terms: 'يرجى الموافقة على الشروط وأهلية التجربة المجانية للمتابعة.',
      exists: 'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.',
      paused: 'التسجيل التجريبي متوقف مؤقتاً حالياً. يرجى المحاولة بعد قليل.',
      unavailable: 'تعذر الاتصال بخدمة إنشاء الحساب حالياً. يرجى التحقق من اتصالك والمحاولة مجدداً.',
      generic: 'تعذر إنشاء حساب المدير. يرجى مراجعة البيانات والمحاولة مرة أخرى.',
    },
  },
};

const nl: WhiteLabelCopy = {
  nav: 'White-Label',
  headerNav: {
    problem: 'Het probleem',
    solution: 'AI-systeem',
    aiDemo: 'Live demo',
    compare: 'Vergelijk',
    whiteLabel: 'White-Label',
    planFaq: 'Abonnement & FAQ',
    results: 'Resultaten',
  },
  heroTransform: {
    wlPill: 'Bezit je eigen softwarebedrijf',
    wlTag: 'White-Label',
    sectionTitle: 'Van Upklick-engine naar 100% jouw softwaremerk',
    sectionSub: 'Elk dashboard, elke tool, inlogpagina en domeinnaam verandert naadloos in jouw bedrijfsidentiteit — met exact dezelfde professionele afwerking.',
    beforeBadge: 'Vóór · Engine',
    beforeLabel: 'Upklick Platform',
    beforeSub: 'Kant-en-klare AI & 12 tools',
    arrowLabel: '1-klik White-Label',
    arrowSub: 'Jouw logo · domein · kleuren',
    afterBadge: 'Na · Jouw SaaS',
    afterLabel: 'Jouw Merk',
    afterSub: '100% eigen klantervaring',
    pickBrand: 'Bekijk merkthema:',
    domainReady: 'SSL Actief',
    syncedNote: 'Klik op een zijbalktool om beide dashboards synchroon te bekijken',
  },
  s1: {
    badge: 'Bezit je eigen softwarebedrijf',
    tag: 'White-Label',
    title: 'Bezit een AI-platform dat complete oplossingen biedt om je online bedrijf te runnen',
    subtitle: 'Een compleet platform onder jouw naam en jouw bedrijfslogo',
    checks: [
      '100% jouw merk — je eigen domein en een mobiele app op jouw naam',
      'Wij zijn de technische provider: Meta, AI, e-mail en domeinen gekoppeld',
      '12 zakelijke tools in één systeem voor je klanten',
    ],
    cta: 'Start nu',
    logoHere: 'Jouw logo hier',
  },
  s2: {
    badge: 'De kans',
    audiences: ['Marketingbureaus', 'Coaches & consultants', 'Softwarebedrijven', 'Klinieken, vastgoed & webshops'],
    titleA: 'Software vanaf nul bouwen is',
    titleHighlight: 'duur en complex —',
    titleB: 'en alleen losse diensten verkopen bouwt zelden voorspelbare maandelijkse omzet op',
    cards: [
      'Geen hoge ontwikkel- en onderhoudskosten',
      'Direct gekoppelde officiële Meta- & AI-infrastructuur',
      'Breng klanten samen vanuit 10+ losse abonnementen',
      'Een dienstenklant vertrekt — een systeemklant blijft',
    ],
    solution: 'De kans: ontvang de volledige AI- en opvolginfrastructuur gebruiksklaar en verkoop vanaf dag één onder je eigen merknaam.',
  },
  s3: {
    badge: 'Volledig gebruiksklare infrastructuur',
    title: 'Wij beheren alle techniek achter de schermen — jij bent de enige eigenaar richting je klanten',
    hub: 'Jouw platform, jouw naam',
    nodes: [
      'Officiële Meta-kanalenprovider: WhatsApp, Instagram & Messenger',
      'AI-provider op tegoedbasis — geen API-sleutels nodig',
      'Kant-en-klare e-mailmarketing en campagnerelay',
      'Domeinregistratie en wederverkoop met jouw winstmarge',
    ],
  },
  s4: {
    badge: 'Volledige White-Label',
    tag: '100% Jouw Merk',
    title: 'Onze naam verdwijnt volledig — elk scherm, elke e-mail en elke link draagt uitsluitend jouw bedrijfsidentiteit',
    features: [
      'Merkidentiteitsstudio met lichte en donkere modus',
      'Eigen domeinnaam met gratis automatisch SSL-certificaat',
      'Inlogpagina’s en systeemmails uit naam van jouw bedrijf',
      'Installeerbare PWA mobiele app met jouw merkicoon',
    ],
    brand: 'Jouw merk',
    domain: 'app.jouwmerk.nl',
    secure: 'SSL Actief',
  },
  s5: {
    badge: 'Commerciële controle & geïntegreerde betaalmethoden',
    titleHighlight: 'Stel je abonnementen samen',
    titleA: 'met de marges die bij jou passen —',
    titleB: 'en ontvang betalingen via de betaalmethoden die je klanten al vertrouwen',
    plansTitle: 'Abonnementen & winstmodel',
    plans: [
      'Maand-, jaar-, vaste looptijd- en lifetime-abonnementen',
      'Verkoop extra AI-tegoed, teamseats en kortingscodes',
      'Meerdere valuta: EUR · USD · SAR · AED · EGP',
    ],
    paymentsTitle: 'Geïntegreerde internationale & regionale betaalmethoden',
    active: 'Geïntegreerd',
    ready: 'Gereed',
  },
  s6: {
    badge: 'Het product dat je aan je klanten verkoopt',
    title: 'Bied je klanten een compleet AI-bedrijfssysteem waarmee ze marketing, verkoop en levering vanuit één scherm aansturen',
    tools: [
      { title: 'AI Copilot & Spraakagent', text: '24/7 slimme verkoopassistent' },
      { title: 'Gecombineerde Meta-inbox', text: 'WhatsApp, Instagram, Messenger & Web' },
      { title: 'Website- & Funnelbouwer', text: 'Drag-and-drop pagina’s & templates' },
      { title: 'Visuele Flow-automatisering', text: 'Slimme chatbots & opvolgreeksen' },
      { title: 'CRM & Leadpipeline', text: 'Dealfasen & teamdienstverdeling' },
      { title: 'Boekings- & Agendasysteem', text: 'Tweeweg Google Agenda-synchronisatie' },
      { title: 'Producten, Cursussen & Portaal', text: 'Digitale checkout & ledenbibliotheek' },
      { title: 'Live Analyses & BI-rapporten', text: 'Meta/Google-pixel & omzetinzicht' },
    ],
  },
  s8: {
    badge: 'Stappen voor lancering & beheer',
    title: 'Van activatie van je Admin-account tot je eerste betalende klant in 4 heldere stappen',
    steps: [
      'Pas je merkidentiteit aan en koppel je eigen domein',
      'Maak abonnementsvormen en activeer je betaalgateways',
      'Presenteer de live demo en open klantwerkruimtes',
      'Volg je terugkerende marges en ondersteun klanten in één klik',
    ],
    chips: ['Presentatieklare demowerkruimte', 'Met één klik wisselen naar klantaccounts', 'Ingebouwde supportchat op jouw naam'],
  },
  s9: {
    badge: 'Het abonnement & FAQ',
    title: 'Één transparant abonnement. Onbeperkte groeiruimte.',
    subtitle: 'Alles wat je nodig hebt voor AI-opvolging én je eigen White-Label softwarebedrijf — inclusief directe gratis proefperiode.',
    planBadge: 'Alles-in-één Platformplan',
    planName: 'Super Admin & White-Label Abonnement',
    price: '$99',
    period: '/ maand',
    planNote: 'Direct abonnement — onbeperkt aantal klanten & 0% omzetcommissie',
    trialHighlight: 'Inclusief 14 dagen gratis Admin-proefperiode · $0 vandaag',
    features: [
      'Volledige 100% White-Label studio, eigen domein & PWA mobiele app',
      'Ingebouwde tech-provider: officiële Meta, AI-tegoed, e-mail & domeinen',
      'Alle 12 zakelijke, CRM-, funnel-, boekings- & AI-opvolgtools inbegrepen',
      'Koppel Stripe, Paymob, Paddle, Fawry, Kashier, wallets & kaarten',
      'Maak onbeperkt eigen maand-, jaar- & lifetime-klantabonnementen',
      'Met één klik meekijken in klantaccounts & eigen supportdesk',
    ],
    cta: 'Start nu',
    faqTitle: 'Veelgestelde vragen',
    faq: [
      {
        q: 'Hoe werkt het gratis Admin-proefaccount?',
        a: 'Klik op "Start nu" om direct je Admin-werkruimte te openen met onze gratis proefperiode. Je krijgt onmiddellijk toegang tot Brand Studio, abonnementsbeheer, AI-starttegoed en alle 12 tools zonder vooraf te betalen.',
      },
      {
        q: 'Zien mijn klanten ergens de naam Upklick?',
        a: 'Nee. Schermen, inlogpagina’s, e-mails, links, je eigen domein en de PWA-app tonen uitsluitend jouw merk.',
      },
      {
        q: 'Heb ik developer-accounts of API-sleutels bij Meta en OpenAI nodig?',
        a: 'Nee. Wij leveren de volledige technische koppeling voor Meta-kanalen, AI-modellen, e-mail en domeinen achter de schermen.',
      },
      {
        q: 'Hoe ontvang ik abonnementsbetalingen van mijn klanten?',
        a: 'Koppel je eigen Stripe, Paymob, Paddle, PayPal, Fawry of lokale wallets en ontvang 100% van alle klantbetalingen rechtstreeks.',
      },
      {
        q: 'Hoe verdien ik marge op AI-gebruik en berichten?',
        a: 'Jij bepaalt zelf de verkoopprijzen van abonnementen en tegoedbundels boven de inkoopprijs, zodat elk gebruik bijdraagt aan je maandelijkse marge.',
      },
      {
        q: 'Vervangt de AI mijn verkoopteam of werkt het samen?',
        a: 'Het versterkt je team: de AI reageert binnen seconden 24/7, kwalificeert leads en plant afspraken, terwijl medewerkers elk gesprek met één klik kunnen overnemen.',
      },
    ],
  },
  barsSection: {
    badge: 'White-Label Architectuur',
    title: 'Alles gebouwd om direct te verkopen, beheren en schalen.',
    subtitle: 'Vijf geïntegreerde pijlers in overzichtelijke horizontale balken — vanaf dag één klaar onder jouw eigen merk.',
  },
  compareSection: {
    badge: 'Platformvergelijking',
    title: 'Wat is inbegrepen bij Upklick',
    subtitle: 'Vervang 12+ losse, dure maandabonnementen door één compleet AI- & White-Label besturingssysteem.',
    colFeature: 'Functies',
    colReplaces: 'Vervangt',
    colOther: 'Andere tools',
    colPlatform: 'Upklick',
    overallLabel: 'TOTALE PRIJS',
    overallOther: '$1.646+ / MAAND',
    overallPrice: '$99',
    overallPeriod: '/mnd',
    trialPill: 'Gratis Admin-proefperiode inbegrepen',
    cta: 'Start nu',
    rows: [
      { feature: 'AI Copilot & Autonome Agenten', replaces: [BRANDS_NL.chatgpt, BRANDS_NL.claude, BRANDS_NL.jasper], otherCost: '$99/maandelijks' },
      { feature: '24/7 AI-opvolging & Spraakkwalificatie', replaces: [BRANDS_NL.airai, BRANDS_NL.manychat, BRANDS_NL.elevenlabs], otherCost: '$149/maandelijks' },
      { feature: 'Gecombineerde Multi-channel Inbox (WA, IG, FB)', replaces: [BRANDS_NL.respond, BRANDS_NL.wati, BRANDS_NL.intercom], otherCost: '$129/maandelijks' },
      { feature: 'CRM & Multi-stage Dealpipelines', replaces: [BRANDS_NL.hubspot, BRANDS_NL.pipedrive, BRANDS_NL.zoho], otherCost: '$99/maandelijks' },
      { feature: 'Onbeperkte Salesfunnels & Websitebouwer', replaces: [BRANDS_NL.clickfunnels, BRANDS_NL.canva, BRANDS_NL.webflow, BRANDS_NL.wix], otherCost: '$297/maandelijks' },
      { feature: 'Boekingspagina’s & Google Agenda-sync', replaces: [BRANDS_NL.calendly, BRANDS_NL.acuity, BRANDS_NL.calcom], otherCost: '$29/maandelijks' },
      { feature: 'Cursussen, Digitale Producten & Checkout', replaces: [BRANDS_NL.salla, BRANDS_NL.shopify, BRANDS_NL.kajabi, BRANDS_NL.teachable], otherCost: '$159/maandelijks' },
      { feature: 'E-mail- & WhatsApp-campagnes', replaces: [BRANDS_NL.activecampaign, BRANDS_NL.mailchimp, BRANDS_NL.brevo], otherCost: '$99/maandelijks' },
      { feature: 'Visuele Chatbot- & Workflowautomatisering', replaces: [BRANDS_NL.zapier, BRANDS_NL.make, BRANDS_NL.n8n], otherCost: '$89/maandelijks' },
      { feature: 'Eigen Domeinen, Wederverkoop & Auto-SSL', replaces: [BRANDS_NL.cloudflare, BRANDS_NL.godaddy, BRANDS_NL.namecheap], otherCost: '$49/maandelijks' },
      { feature: 'Live Analyses, Pixeltracking & BI-rapporten', replaces: [BRANDS_NL.databox, BRANDS_NL.mixpanel, BRANDS_NL.hotjar], otherCost: '$149/maandelijks' },
      { feature: '100% White-Label SaaS & Eigen Mobiele App', replaces: [], otherCost: 'Uniek bij Upklick ($299+ waarde)', uniqueTag: true },
    ],
  },
  demoChannels: {
    switchLabel: 'Kies live kanaal:',
    channels: [
      { id: 'whatsapp', label: 'WhatsApp', stageSub: 'Via WhatsApp Business', status: 'online', placeholder: 'Bericht' },
      { id: 'messenger', label: 'Messenger', stageSub: 'Via Facebook Messenger', status: 'Nu actief', placeholder: 'Aa' },
      { id: 'instagram', label: 'Instagram', stageSub: 'Via Instagram DM', status: 'Nu actief', placeholder: 'Bericht...' },
      { id: 'webchat', label: 'Websitechat', stageSub: 'Via Live Websitewidget', status: 'Antwoordt in <10s', placeholder: 'Stel je vraag...' },
    ],
    seen: 'Zojuist gezien',
  },
  resultsUpgrade: {
    ratingPill: '4,9 / 5 Geverifieerde Partnerwaardering',
    verified: 'Geverifieerde Partner',
    kpis: [
      { value: '+38%', label: 'Meer geboekte gesprekken', sub: 'Automatische AI-kwalificatie & herinneringen' },
      { value: '< 10s', label: 'Direct eerste antwoord', sub: '24/7 op WhatsApp, IG, Messenger & Web' },
      { value: '12-in-1', label: 'Geconsolideerde tools', sub: 'Bespaar $1.500+/mnd aan losse software' },
      { value: '3.4x', label: 'Groei in terugkerende omzet', sub: 'Bureaus die overstappen op eigen SaaS' },
    ],
    proofMeta: [
      { metric: '+42% Geboekte Calls', category: 'Coaching & Advies', outcome: 'Van handmatig opvolgen naar dagelijkse automatische boekingen' },
      { metric: '9s Gem. Reactietijd', category: 'B2B Consultancy', outcome: 'Geen enkele gemiste aanvraag meer op WhatsApp & Instagram' },
      { metric: '24 Actieve SaaS-klanten', category: 'White-Label Bureau', outcome: 'Eigen merkplatform en vaste MRR gelanceerd in 3 weken' },
    ],
    bannerTitle: 'Klaar voor echte resultaten onder je eigen merknaam?',
    bannerSub: 'Maak nu je Admin-account aan, activeer direct je gratis proefperiode en ervaar het volledige platform zelf.',
    bannerCta: 'Start nu',
  },
  trialModal: {
    badge: 'Speciale Admin-toegang',
    specialTag: 'Gratis proefperiode',
    sideTitle: 'Start je Admin-werkruimte met een gratis proefperiode',
    sideLead: 'Maak vandaag je volledige Admin-account aan voor $0 vooraf. Test alle 12 tools, stel je White-Label merk in en groei met vertrouwen.',
    perks: [
      { title: '14 dagen gratis Admin-proefperiode', text: 'Volledig platform & White-Label studio direct geactiveerd — $0 vandaag.' },
      { title: 'Alle 12 AI- & zakelijke tools actief', text: 'AI Copilot, Opvolging, Inbox, Funnels, CRM, Boekingen, Betalingen & BI.' },
      { title: 'AI-starttegoed & demowerkruimte', text: 'Inclusief gratis AI-starttegoed en een kant-en-klare Agency-werkruimte.' },
      { title: 'Naadloos upgraden ($99/mnd)', text: 'Behoud je domein, merkstijl, abonnementen en klanten wanneer je doorgaat.' },
    ],
    termsTitle: 'Voorwaarden gratis proefperiode',
    termsList: [
      'Beschikbaar voor nieuwe Admin-werkruimtes (1 gratis proefperiode per organisatie).',
      'Geen creditcard vereist om je proefwerkruimte te starten.',
      'Volledig eigendom van je gegevens — upgrade op elk moment naar het $99/mnd plan.',
    ],
    formTitle: 'Maak je Admin-account aan',
    formSubtitle: 'Stel je inloggegevens en merknaam in binnen 60 seconden.',
    nameLabel: 'Volledige naam',
    namePlaceholder: 'bijv. Mohamed Tarek',
    workspaceLabel: 'Bedrijfs- of softwaremerknaam',
    workspacePlaceholder: 'bijv. Orbit Growth Cloud',
    domainPreview: 'Werkruimtevoorbeeld:',
    emailLabel: 'Zakelijk e-mailadres',
    emailPlaceholder: 'jij@jouwbedrijf.nl',
    phoneLabel: 'Telefoon / WhatsApp',
    phoneOptional: 'Optioneel',
    phonePlaceholder: '+31 6 12345678',
    passwordLabel: 'Wachtwoord aanmaken',
    passwordPlaceholder: 'Minimaal 8 tekens',
    passwordHint: 'Gebruik minimaal 8 tekens met letters en cijfers.',
    strengthLabels: ['Te kort', 'Redelijk', 'Goed', 'Sterk'],
    agreePrefix: 'Ik ga akkoord met de',
    termsLink: 'Servicevoorwaarden',
    andText: 'en het',
    privacyLink: 'Privacybeleid',
    agreeTrialSuffix: 'en bevestig één gratis Admin-proefperiode voor dit nieuwe account.',
    submit: 'Gratis proefperiode starten',
    submitting: 'Je Admin-werkruimte wordt aangemaakt…',
    haveAccount: 'Heb je al een account?',
    loginCta: 'Inloggen',
    closeLabel: 'Sluiten',
    successTitle: 'Je Admin-proefwerkruimte staat klaar!',
    successText: 'Je wordt nu ingelogd op je Admin-dashboard…',
    errors: {
      name: 'Vul je volledige naam in (minimaal 2 tekens).',
      workspace: 'Vul je bedrijfs- of merknaam in (minimaal 2 tekens).',
      email: 'Vul een geldig zakelijk e-mailadres in.',
      password: 'Het wachtwoord moet tussen 8 en 128 tekens lang zijn.',
      terms: 'Ga akkoord met de voorwaarden om door te gaan.',
      exists: 'Er bestaat al een account met dit e-mailadres. Log in plaats daarvan in.',
      paused: 'Nieuwe proefregistraties zijn tijdelijk gepauzeerd. Probeer het straks opnieuw.',
      unavailable: 'De registratieservice is momenteel niet bereikbaar. Controleer je verbinding en probeer het opnieuw.',
      generic: 'Het aanmaken van je Admin-account is niet gelukt. Controleer je gegevens en probeer het opnieuw.',
    },
  },
};

const de: WhiteLabelCopy = {
  nav: 'White-Label',
  headerNav: {
    problem: 'Das Problem',
    solution: 'KI-System',
    aiDemo: 'Live-Demo',
    compare: 'Vergleich',
    whiteLabel: 'White-Label',
    planFaq: 'Tarif & FAQ',
    results: 'Ergebnisse',
  },
  heroTransform: {
    wlPill: 'Besitze dein eigenes Softwareunternehmen',
    wlTag: 'White-Label',
    sectionTitle: 'Von der Upklick-Engine zu 100 % deiner eigenen Softwaremarke',
    sectionSub: 'Jedes Dashboard, jedes Tool, jeder Login-Screen und jede Domain verwandelt sich nahtlos in deine Unternehmensidentität — mit exakt derselben Enterprise-Qualität.',
    beforeBadge: 'Vorher · Engine',
    beforeLabel: 'Upklick Plattform',
    beforeSub: 'Fertige KI & 12 Business-Tools',
    arrowLabel: '1-Klick White-Label',
    arrowSub: 'Dein Logo · Domain · Farben',
    afterBadge: 'Nachher · Dein SaaS',
    afterLabel: 'Deine Marke',
    afterSub: '100 % eigenes Kundenerlebnis',
    pickBrand: 'Markenthema testen:',
    domainReady: 'SSL Aktiv',
    syncedNote: 'Klicke auf ein Seitenleisten-Tool, um beide Dashboards synchron zu erleben',
  },
  s1: {
    badge: 'Besitze dein eigenes Softwareunternehmen',
    tag: 'White-Label',
    title: 'Besitze eine KI-Plattform, die Komplettlösungen für dein Online-Business bietet',
    subtitle: 'Eine vollständige Plattform unter deinem Namen und mit deinem Firmenlogo',
    checks: [
      '100 % deine Marke — eigene Domain und mobile App unter deinem Namen',
      'Wir sind der Technologie-Provider: Meta, KI, E-Mail und Domains fertig angebunden',
      '12 Business-Tools in einem System für deine Kunden',
    ],
    cta: 'Jetzt starten',
    logoHere: 'Dein Logo hier',
  },
  s2: {
    badge: 'Die Marktchance',
    audiences: ['Marketingagenturen', 'Coaches & Berater', 'Softwareunternehmen', 'Praxen, Immobilien & Online-Shops'],
    titleA: 'Software von Grund auf zu entwickeln ist',
    titleHighlight: 'teuer und komplex —',
    titleB: 'und reine Dienstleistungen schaffen selten planbare monatliche Umsätze',
    cards: [
      'Keine hohen Entwicklungs- und Wartungskosten',
      'Fertig freigeschaltete offizielle Meta- & KI-Infrastruktur',
      'Kunden aus über 10 Einzel-Tools in einer Plattform vereinen',
      'Ein Dienstleistungskunde wechselt — ein Systemkunde bleibt',
    ],
    solution: 'Die Chance: Übernimm die komplette KI- und Follow-up-Infrastruktur schlüsselfertig und verkaufe sie ab Tag eins unter deiner eigenen Marke.',
  },
  s3: {
    badge: 'Schlüsselfertige Infrastruktur',
    title: 'Wir betreiben den gesamten Tech-Stack im Hintergrund — du bist gegenüber deinen Kunden der alleinige Anbieter',
    hub: 'Deine Plattform, dein Name',
    nodes: [
      'Offizieller Meta-Kanal-Provider: WhatsApp, Instagram & Messenger',
      'KI-Provider auf Guthabenbasis — keine API-Schlüssel erforderlich',
      'Sofort einsatzbereiter E-Mail-Marketing- & Kampagnen-Provider',
      'Provider für Domainregistrierung & Weiterverkauf mit deiner Marge',
    ],
  },
  s4: {
    badge: 'Vollständiges White-Label',
    tag: '100 % Deine Marke',
    title: 'Unser Name verschwindet komplett — jeder Bildschirm, jede E-Mail und jeder Link trägt ausschließlich deine Unternehmensidentität',
    features: [
      'Marken-Studio mit Hell- und Dunkelmodus',
      'Eigene Domain mit kostenlosem Auto-SSL-Zertifikat',
      'Login-Seiten und System-E-Mails im Namen deiner Firma',
      'Installierbare PWA-Mobile-App mit deinem Marken-Icon',
    ],
    brand: 'Deine Marke',
    domain: 'app.deinemarke.de',
    secure: 'SSL Aktiv',
  },
  s5: {
    badge: 'Kaufmännische Kontrolle & integrierte Zahlungsanbieter',
    titleHighlight: 'Gestalte deine Tarife',
    titleA: 'mit den Margen deiner Wahl —',
    titleB: 'und ziehe Zahlungen über die Gateways ein, denen deine Kunden bereits vertrauen',
    plansTitle: 'Tarif- & Margensteuerung',
    plans: [
      'Monats-, Jahres-, Laufzeit- & Lifetime-Tarife',
      'Zusatz-KI-Guthaben, Team-Plätze & Rabattgutscheine verkaufen',
      'Mehrwährungsfähig: EUR · USD · SAR · AED · EGP',
    ],
    paymentsTitle: 'Integrierte globale & regionale Zahlungsmethoden',
    active: 'Integriert',
    ready: 'Bereit',
  },
  s6: {
    badge: 'Das Produkt, das du deinen Kunden verkaufst',
    title: 'Biete deinen Kunden ein komplettes KI-Betriebssystem für Marketing, Vertrieb und Auslieferung auf einem Bildschirm',
    tools: [
      { title: 'AI Copilot & Sprach-Agent', text: 'Autonomer 24/7-Vertriebsassistent' },
      { title: 'Zentraler Meta-Posteingang', text: 'WhatsApp, Instagram, Messenger & Web' },
      { title: 'Website- & Funnel-Builder', text: 'Drag-and-drop Seiten & Vorlagen' },
      { title: 'Visuelle Flow-Automatisierung', text: 'Smarte Chatbots & Follow-up-Sequenzen' },
      { title: 'CRM & Lead-Pipeline', text: 'Deal-Phasen & Schichtverteilung' },
      { title: 'Terminbuchung & Kalender', text: 'Zwei-Wege Google-Kalender-Sync' },
      { title: 'Produkte, Kurse & Kundenportal', text: 'Digitaler Checkout & Mitgliederbereich' },
      { title: 'Live-Analysen & BI-Berichte', text: 'Meta/Google-Pixel & Umsatz-Tracking' },
    ],
  },
  s8: {
    badge: 'Start- & Betriebsschritte',
    title: 'Von der Aktivierung deines Admin-Kontos bis zum ersten zahlenden Kunden in 4 klaren Schritten',
    steps: [
      'Markenidentität anpassen und eigene Domain verbinden',
      'Abonnementtarife anlegen und Zahlungsgateways aktivieren',
      'Live-Demo präsentieren und Kunden-Arbeitsbereiche eröffnen',
      'Wiederkehrende Margen verfolgen und Kunden mit einem Klick betreuen',
    ],
    chips: ['Präsentationsfertiger Demo-Arbeitsbereich', 'Ein-Klick-Wechsel in Kundenkonten', 'Integrierter Support-Chat unter deinem Namen'],
  },
  s9: {
    badge: 'Der Tarif & FAQ',
    title: 'Ein transparenter Tarif. Unbegrenztes Wachstumspotenzial.',
    subtitle: 'Alles für dein KI-Follow-up-System und dein eigenes White-Label-Softwareunternehmen — inklusive sofortiger kostenloser Testphase.',
    planBadge: 'All-inclusive Plattform-Tarif',
    planName: 'Super-Admin- & White-Label-Tarif',
    price: '$99',
    period: '/ Monat',
    planNote: 'Direktabonnement — unbegrenzte Kundenkonten & 0 % Umsatzprovision',
    trialHighlight: 'Inklusive 14 Tage kostenloser Admin-Testphase · heute $0 fällig',
    features: [
      'Vollständiges 100 % White-Label-Studio, eigene Domain & PWA-Mobile-App',
      'Integrierter Tech-Provider: offizielle Meta-Kanäle, KI, E-Mail & Domains',
      'Alle 12 Business-, CRM-, Funnel-, Buchungs- & KI-Follow-up-Tools enthalten',
      'Stripe, Paymob, Paddle, Fawry, Kashier, Wallets & Karten direkt anbinden',
      'Unbegrenzt eigene Monats-, Jahres- & Lifetime-Kundentarife erstellen',
      'Ein-Klick-Kundenkonto-Wechsel & eigenes gebrandetes Support-System',
    ],
    cta: 'Jetzt starten',
    faqTitle: 'Häufig gestellte Fragen',
    faq: [
      {
        q: 'Wie funktioniert das kostenlose Admin-Testkonto?',
        a: 'Klicke auf „Jetzt starten“, um deinen Admin-Arbeitsbereich sofort mit unserer kostenlosen Testphase zu eröffnen. Du erhältst unmittelbaren Zugriff auf das Brand Studio, die Tariferstellung, KI-Startguthaben und alle 12 Tools ohne Vorauszahlung.',
      },
      {
        q: 'Sehen meine Kunden irgendwo den Namen Upklick?',
        a: 'Nein. Alle Oberflächen, Login-Seiten, E-Mails, Links, deine Domain und die PWA-App zeigen ausschließlich deine eigene Markenidentität.',
      },
      {
        q: 'Benötige ich Entwicklerkonten oder API-Schlüssel bei Meta und OpenAI?',
        a: 'Nein. Wir stellen die gesamte technische Infrastruktur für offizielle Meta-Kanäle, KI-Modelle, E-Mail-Versand und Domains im Hintergrund bereit.',
      },
      {
        q: 'Wie ziehe ich Abonnementzahlungen von meinen Kunden ein?',
        a: 'Verbinde deine eigenen Konten bei Stripe, Paymob, Paddle, PayPal, Fawry oder lokalen Wallets und erhalte 100 % deiner Kundenzahlungen direkt.',
      },
      {
        q: 'Wie verdiene ich an KI-Nutzung und Nachrichten mit?',
        a: 'Du definierst deine eigenen Tarifpreise und Guthabenpakete oberhalb des Einkaufspreises — jede Verlängerung und Aufladung steigert deine Marge.',
      },
      {
        q: 'Ersetzt die KI mein Vertriebsteam oder arbeitet sie mit ihm zusammen?',
        a: 'Sie entlastet dein Team: Die KI antwortet rund um die Uhr in Sekunden, qualifiziert Leads und bucht Termine, während Mitarbeiter jedes Gespräch mit einem Klick übernehmen können.',
      },
    ],
  },
  barsSection: {
    badge: 'White-Label-Architektur',
    title: 'Alles bereit zum Verkaufen, Betreiben und Skalieren.',
    subtitle: 'Fünf integrierte Säulen in klaren horizontalen Leisten — ab Tag eins einsatzbereit unter deiner eigenen Marke.',
  },
  compareSection: {
    badge: 'Plattform-Vergleich',
    title: 'Was in Upklick enthalten ist',
    subtitle: 'Ersetze über 12 teure Einzel-Abonnements durch ein zentrales KI- & White-Label-Betriebssystem.',
    colFeature: 'Funktionen',
    colReplaces: 'Ersetzt',
    colOther: 'Andere Tools',
    colPlatform: 'Upklick',
    overallLabel: 'GESAMTPREIS',
    overallOther: '$1.646+ / MONAT',
    overallPrice: '$99',
    overallPeriod: '/Monat',
    trialPill: 'Kostenlose Admin-Testphase inklusive',
    cta: 'Jetzt starten',
    rows: [
      { feature: 'AI Copilot & Autonome Agenten', replaces: [BRANDS_DE.chatgpt, BRANDS_DE.claude, BRANDS_DE.jasper], otherCost: '$99/monatlich' },
      { feature: '24/7 KI-Follow-up & Sprachqualifizierung', replaces: [BRANDS_DE.airai, BRANDS_DE.manychat, BRANDS_DE.elevenlabs], otherCost: '$149/monatlich' },
      { feature: 'Zentraler Multi-Channel-Posteingang (WA, IG, FB)', replaces: [BRANDS_DE.respond, BRANDS_DE.wati, BRANDS_DE.intercom], otherCost: '$129/monatlich' },
      { feature: 'CRM & Mehrstufige Deal-Pipelines', replaces: [BRANDS_DE.hubspot, BRANDS_DE.pipedrive, BRANDS_DE.zoho], otherCost: '$99/monatlich' },
      { feature: 'Unbegrenzte Sales-Funnels & Website-Builder', replaces: [BRANDS_DE.clickfunnels, BRANDS_DE.canva, BRANDS_DE.webflow, BRANDS_DE.wix], otherCost: '$297/monatlich' },
      { feature: 'Terminbuchungsseiten & Google-Kalender-Sync', replaces: [BRANDS_DE.calendly, BRANDS_DE.acuity, BRANDS_DE.calcom], otherCost: '$29/monatlich' },
      { feature: 'Kurse, Digitale Produkte & Multi-Gateway-Checkout', replaces: [BRANDS_DE.salla, BRANDS_DE.shopify, BRANDS_DE.kajabi, BRANDS_DE.teachable], otherCost: '$159/monatlich' },
      { feature: 'E-Mail- & WhatsApp-Kampagnen', replaces: [BRANDS_DE.activecampaign, BRANDS_DE.mailchimp, BRANDS_DE.brevo], otherCost: '$99/monatlich' },
      { feature: 'Visuelle Chatbot- & Workflow-Automatisierungen', replaces: [BRANDS_DE.zapier, BRANDS_DE.make, BRANDS_DE.n8n], otherCost: '$89/monatlich' },
      { feature: 'Eigene Domains, Domain-Weiterverkauf & Auto-SSL', replaces: [BRANDS_DE.cloudflare, BRANDS_DE.godaddy, BRANDS_DE.namecheap], otherCost: '$49/monatlich' },
      { feature: 'Live-Analysen, Pixel-Attribution & BI-Berichte', replaces: [BRANDS_DE.databox, BRANDS_DE.mixpanel, BRANDS_DE.hotjar], otherCost: '$149/monatlich' },
      { feature: '100 % White-Label-SaaS & Eigene Mobile App', replaces: [], otherCost: 'Exklusiv bei Upklick ($299+ Wert)', uniqueTag: true },
    ],
  },
  demoChannels: {
    switchLabel: 'Live-Kanal wählen:',
    channels: [
      { id: 'whatsapp', label: 'WhatsApp', stageSub: 'Über WhatsApp Business', status: 'online', placeholder: 'Nachricht' },
      { id: 'messenger', label: 'Messenger', stageSub: 'Über Facebook Messenger', status: 'Gerade aktiv', placeholder: 'Aa' },
      { id: 'instagram', label: 'Instagram', stageSub: 'Über Instagram DM', status: 'Gerade aktiv', placeholder: 'Nachricht...' },
      { id: 'webchat', label: 'Website-Chat', stageSub: 'Über Live-Website-Widget', status: 'Antwortet in <10s', placeholder: 'Frage stellen...' },
    ],
    seen: 'Gerade gesehen',
  },
  resultsUpgrade: {
    ratingPill: '4,9 / 5 Verifizierte Partnerzufriedenheit',
    verified: 'Verifizierter Partner',
    kpis: [
      { value: '+38 %', label: 'Mehr gebuchte Termine', sub: 'Automatische KI-Qualifizierung & Erinnerungen' },
      { value: '< 10s', label: 'Sofortige Erstantwort', sub: '24/7 auf WhatsApp, IG, Messenger & Web' },
      { value: '12-in-1', label: 'Konsolidierte Tools', sub: 'Über $1.500/Monat an Einzel-Tools gespart' },
      { value: '3.4x', label: 'Mehr wiederkehrender Umsatz', sub: 'Agenturen mit eigener SaaS-Plattform' },
    ],
    proofMeta: [
      { metric: '+42 % Gebuchte Calls', category: 'Coaching & Beratung', outcome: 'Vom manuellen Nachfassen zu täglichen automatischen Buchungen' },
      { metric: '9s Ø Antwortzeit', category: 'B2B-Consulting', outcome: 'Keine verlorenen Anfragen mehr über WhatsApp & Instagram' },
      { metric: '24 Aktive SaaS-Kunden', category: 'White-Label-Agentur', outcome: 'Eigene Markenplattform & planbarer MRR in 3 Wochen gestartet' },
    ],
    bannerTitle: 'Bereit für messbare Ergebnisse unter deiner eigenen Marke?',
    bannerSub: 'Erstelle jetzt dein Admin-Konto, aktiviere sofort deine kostenlose Testphase und erlebe die gesamte Plattform live.',
    bannerCta: 'Jetzt starten',
  },
  trialModal: {
    badge: 'Exklusiver Admin-Zugang',
    specialTag: 'Kostenlose Testphase',
    sideTitle: 'Starte deinen Admin-Arbeitsbereich mit kostenloser Testphase',
    sideLead: 'Erstelle noch heute dein vollwertiges Admin-Konto für $0 im Voraus. Teste alle 12 Tools, richte dein White-Label-Branding ein und starte risikofrei.',
    perks: [
      { title: '14 Tage kostenlose Admin-Testphase', text: 'Komplette Plattform & White-Label-Studio sofort freigeschaltet — heute $0 fällig.' },
      { title: 'Alle 12 KI- & Business-Tools aktiv', text: 'AI Copilot, Follow-up, Posteingang, Funnels, CRM, Buchungen, Zahlungen & BI.' },
      { title: 'KI-Startguthaben & Demo-Arbeitsbereich', text: 'Inklusive kostenlosem KI-Startguthaben und vorbereitetem Agency-Workspace.' },
      { title: 'Nahtloses Upgrade jederzeit ($99/Monat)', text: 'Behalte Domain, Branding, Tarife und Kunden vollständig beim Wechsel.' },
    ],
    termsTitle: 'Teilnahmebedingungen der Gratis-Testphase',
    termsList: [
      'Gültig für neue Admin-Arbeitsbereiche (1 kostenlose Testphase pro Unternehmen).',
      'Keine Kreditkarte zur Aktivierung deines Test-Arbeitsbereichs erforderlich.',
      'Volle Datenhoheit — jederzeit Upgrade auf den unbegrenzten $99/Monat-Tarif möglich.',
    ],
    formTitle: 'Admin-Konto erstellen',
    formSubtitle: 'Richte deine Zugangsdaten und deinen Markennamen in unter 60 Sekunden ein.',
    nameLabel: 'Vollständiger Name',
    namePlaceholder: 'z. B. Mohamed Tarek',
    workspaceLabel: 'Firmen- oder Software-Markenname',
    workspacePlaceholder: 'z. B. Orbit Growth Cloud',
    domainPreview: 'Workspace-Vorschau:',
    emailLabel: 'Geschäftliche E-Mail',
    emailPlaceholder: 'name@deinefirma.de',
    phoneLabel: 'Telefon / WhatsApp',
    phoneOptional: 'Optional',
    phonePlaceholder: '+49 170 1234567',
    passwordLabel: 'Passwort festlegen',
    passwordPlaceholder: 'Mindestens 8 Zeichen',
    passwordHint: 'Mindestens 8 Zeichen mit Buchstaben und Zahlen verwenden.',
    strengthLabels: ['Zu kurz', 'Ausreichend', 'Gut', 'Stark'],
    agreePrefix: 'Ich stimme den',
    termsLink: 'Nutzungsbedingungen',
    andText: 'und der',
    privacyLink: 'Datenschutzerklärung',
    agreeTrialSuffix: 'zu und bestätige den Anspruch auf eine kostenlose Admin-Testphase.',
    submit: 'Kostenlose Testphase starten',
    submitting: 'Dein Admin-Arbeitsbereich wird erstellt…',
    haveAccount: 'Bereits ein Konto vorhanden?',
    loginCta: 'Anmelden',
    closeLabel: 'Schließen',
    successTitle: 'Dein Admin-Test-Arbeitsbereich ist bereit!',
    successText: 'Du wirst jetzt in dein Admin-Dashboard eingeloggt…',
    errors: {
      name: 'Bitte gib deinen vollständigen Namen ein (mindestens 2 Zeichen).',
      workspace: 'Bitte gib deinen Firmen- oder Markennamen ein (mindestens 2 Zeichen).',
      email: 'Bitte gib eine gültige geschäftliche E-Mail-Adresse ein.',
      password: 'Das Passwort muss zwischen 8 und 128 Zeichen lang sein.',
      terms: 'Bitte bestätige die Bedingungen und die Testphasen-Berechtigung.',
      exists: 'Für diese E-Mail-Adresse existiert bereits ein Konto. Bitte melde dich stattdessen an.',
      paused: 'Neue Test-Registrierungen sind vorübergehend pausiert. Bitte versuche es in Kürze erneut.',
      unavailable: 'Der Registrierungsdienst ist derzeit nicht erreichbar. Bitte prüfe deine Verbindung.',
      generic: 'Dein Admin-Konto konnte nicht erstellt werden. Bitte überprüfe deine Angaben.',
    },
  },
};

export const whiteLabelContent: Record<'en' | 'ar' | 'nl' | 'de', WhiteLabelCopy> = { en, ar, nl, de };
