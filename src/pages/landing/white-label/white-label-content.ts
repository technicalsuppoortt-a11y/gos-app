/* =========================================================
   White-Label program — 10-step chapter copy (EN / AR).
   Kept outside LandingCopy on purpose: the landing CMS
   validates published content against LandingCopy's exact
   shape, so adding keys there would discard saved edits.
   ========================================================= */

export type WhiteLabelCopy = {
  nav: string;
  chapter: { eyebrow: string; title: string; text: string; steps: string };
  s1: {
    badge: string; tag: string; title: string; subtitle: string; checks: string[]; cta: string; logoHere: string;
    morph: {
      label: string; stages: string[]; play: string; pause: string; replay: string; upklick: string; brand: string;
      nav: string[]; workspace: string; kpis: string[]; chart: string; bars: string; gauge: string; leads: string; live: string;
      people: string[];
    };
  };
  s2: { badge: string; audiences: string[]; titleA: string; titleHighlight: string; titleB: string; cards: string[]; solution: string };
  s3: { badge: string; title: string; hub: string; nodes: string[] };
  s4: { badge: string; tag: string; title: string; features: string[]; brand: string; domain: string; secure: string };
  s5: { badge: string; titleHighlight: string; titleA: string; titleB: string; plansTitle: string; plans: string[]; paymentsTitle: string; active: string; ready: string };
  s6: { badge: string; title: string; tools: { title: string; text: string }[] };
  s7: { badge: string; title: string; beforeTitle: string; before: string[]; afterTitle: string; after: string[] };
  s8: { badge: string; title: string; steps: string[]; chips: string[] };
  s9: { badge: string; planName: string; price: string; period: string; planNote: string; features: string[]; cta: string; faqTitle: string; faq: { q: string; a: string }[] };
  s10: { badge: string; titleA: string; titleB: string; text: string; cta: string; chips: string[] };
};

const en: WhiteLabelCopy = {
  nav: 'White-Label',
  chapter: {
    eyebrow: 'Upklick White-Label Program',
    title: 'Launch your own software company — in 10 clear steps',
    text: 'For agencies, consultants and software teams who want to sell a complete AI platform under their own brand.',
    steps: '10 steps',
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
    cta: 'Book a free consultation now',
    logoHere: 'Your logo here',
    morph: {
      label: 'Animated preview: the Upklick dashboard transforms into your white-label brand',
      stages: ['Upklick dashboard', 'Brand morph', 'Your white-label'],
      play: 'Play animation',
      pause: 'Pause animation',
      replay: 'Replay',
      upklick: 'Upklick',
      brand: 'Your brand',
      nav: ['Dashboard', 'AI Copilot', 'Inbox', 'CRM & Leads', 'Booking', 'Analytics'],
      workspace: 'Workspace',
      kpis: ['Revenue', 'New leads', 'Bookings'],
      chart: 'Performance',
      bars: 'Weekly sales',
      gauge: 'Goal',
      leads: 'Recent leads',
      live: 'Live',
      people: ['Sarah Ahmed', 'Omar Khaled', 'Lina Hassan'],
    },
  },
  s2: {
    badge: 'The problem & the opportunity',
    audiences: ['Marketing agencies', 'Coaches & consultants', 'Software companies', 'Clinics, real estate & stores'],
    titleA: 'Building software from',
    titleHighlight: 'scratch is costly and complex..',
    titleB: 'and selling services alone never builds a stable monthly income',
    cards: [
      'Huge development and maintenance costs',
      'Complex Meta and API approvals',
      'Clients scattered across 10 different tools',
      'A service client leaves — a system client stays',
    ],
    solution: 'The solution: receive the entire infrastructure ready, and sell it under your name from day one',
  },
  s3: {
    badge: 'Fully ready infrastructure',
    title: 'We are the provider running everything behind the scenes.. and you are the only owner in front of your clients',
    hub: 'Your platform, your name',
    nodes: [
      'Official Meta channels provider: WhatsApp, Instagram and Messenger',
      'AI provider on credits — no API keys needed',
      'Email marketing campaigns provider, ready and active',
      'Domain registration and resale provider — at your margin',
    ],
  },
  s4: {
    badge: 'Full white-label',
    tag: 'Full White-Label',
    title: 'Our name disappears completely.. every screen, email and link carries only your company identity',
    features: [
      'Brand identity studio with dark and light modes',
      'Your own domain with a free SSL certificate',
      'Login pages and emails in your company name',
      'PWA mobile app with your brand icon',
    ],
    brand: 'Your brand',
    domain: 'app.yourbrand.com',
    secure: 'Secure connection',
  },
  s5: {
    badge: 'Commercial control & integrated payment gateways',
    titleHighlight: 'Tailor your plans',
    titleA: 'with the pricing that suits you..',
    titleB: 'and get paid through the payment methods your clients already use',
    plansTitle: 'Plans & profit engineering',
    plans: ['Monthly, yearly and lifetime plans', 'Sell extra credits and discount coupons', 'Multi-currency: EGP - SAR - AED - USD'],
    paymentsTitle: 'Collect payments locally and internationally',
    active: 'Active',
    ready: 'Ready to connect',
  },
  s6: {
    badge: 'The product you will sell to your clients',
    title: 'Offer your clients a complete business operating system that runs marketing and sales from one screen',
    tools: [
      { title: 'Smart sales agent', text: 'AI Copilot and voice' },
      { title: 'Unified inbox', text: 'WhatsApp, Instagram and Messenger' },
      { title: 'Websites & funnels builder', text: 'Drag and drop' },
      { title: 'Chatbot flow designer', text: 'Visual automation' },
      { title: 'CRM client management', text: 'With shift distribution' },
      { title: 'Appointment booking pages', text: 'Google Calendar sync' },
      { title: 'Sell products & courses', text: 'WhatsApp and email campaigns' },
      { title: 'Live analytics & PDF reports', text: 'With pixel tracking' },
    ],
  },
  s7: {
    badge: 'The power of one platform',
    title: 'Replace 12 separate tools and subscriptions with one platform carrying your company name',
    beforeTitle: 'Instead of 12 scattered subscriptions',
    before: [
      'Website and funnel builder tools',
      'CRM and appointment booking software',
      'WhatsApp and chatbot tools',
      'Course platforms and email campaigns',
      'AI API invoices and domain purchases',
    ],
    afterTitle: 'All ready inside your one platform',
    after: [
      'Websites, funnels, hosting and ready templates',
      'Complete CRM with smart appointment booking',
      'Unified Meta inbox and visual automation',
      'Course hosting with built-in email marketing',
      'AI credits and domain resale at your margin',
    ],
  },
  s8: {
    badge: 'Launch & operation steps',
    title: 'From receiving the platform to your first client subscription in 4 clear steps',
    steps: [
      'Customize your identity and connect your domain',
      'Build your plans and activate payment methods',
      'Present the ready demo and open your client accounts',
      'Track your profits and support clients in one click',
    ],
    chips: ['Ready-to-present demo account', 'One-click login to client accounts', 'Support chat in your name'],
  },
  s9: {
    badge: 'The plan & FAQ',
    planName: 'The all-inclusive Super Admin plan',
    price: '$99',
    period: '/ month',
    planNote: 'Direct subscription — unlimited clients',
    features: [
      'Full white-label with your domain and a mobile app',
      'We are the provider: Meta, AI, email and domains',
      'All 12 tools plus local and international payment gateways',
    ],
    cta: 'Book a free consultation',
    faqTitle: 'Most frequently asked questions',
    faq: [
      {
        q: 'Can my clients see the Upklick name anywhere?',
        a: 'No. Screens, login pages, emails, links, your domain and the mobile app all carry your brand only — the platform runs behind the scenes under your identity.',
      },
      {
        q: 'Do I need to be a developer or create developer accounts with Meta and OpenAI?',
        a: 'No. We act as the technical provider for Meta channels, AI, email and domains, so there are no API keys or developer approvals to manage. You configure everything from your dashboard.',
      },
      {
        q: 'How do I receive subscription payments from my clients?',
        a: 'You connect your own payment gateways — such as Stripe, PayPal, Fawry, Vodafone Cash or InstaPay — and client subscriptions are collected through them directly.',
      },
      {
        q: 'How do I keep a profit margin on AI usage and messages?',
        a: 'You decide the prices of your plans, extra credits and bundles. Set them above your cost and every client usage contributes to your margin.',
      },
    ],
  },
  s10: {
    badge: 'Your next step to owning your software',
    titleA: 'Start your software company today..',
    titleB: 'and let every client build their business inside your platform',
    text: 'Book your free consultation, see the Super Admin and client dashboards live, and start selling for $99 a month.',
    cta: 'Book a free consultation now',
    chips: ['Own the brand completely', 'Own your pricing and profit', 'Own your client relationship'],
  },
};

const ar: WhiteLabelCopy = {
  nav: 'وايت ليبل',
  chapter: {
    eyebrow: 'برنامج Upklick للعلامة البيضاء',
    title: 'أطلق شركتك البرمجية الخاصة — في 10 خطوات واضحة',
    text: 'للوكالات والاستشاريين وفرق البرمجيات اللي عايزة تبيع منصة ذكاء اصطناعي متكاملة باسمها.',
    steps: '10 خطوات',
  },
  s1: {
    badge: 'امتلك شركتك البرمجية',
    tag: 'White-Label',
    title: 'امتلك منصة ذكاء اصطناعي تقدّم حلول متكاملة لإدارة تجارتك الإلكترونية',
    subtitle: 'منصة متكاملة باسمك ولوجو شركتك',
    checks: [
      'براندك 100% بدومينك وتطبيق موبايل باسمك',
      'إحنا البروفايدر التقني: ربط ميتا والـ AI والإيميل والدومينات',
      '12 أداة بيزنس في سيستم واحد لعملائك',
    ],
    cta: 'احجز استشارة مجانية الآن',
    logoHere: 'اللوجو بتاعك هنا',
    morph: {
      label: 'معاينة متحركة: لوحة Upklick بتتحول للعلامة البيضاء الخاصة بيك',
      stages: ['لوحة Upklick', 'تحويل الهوية', 'علامتك البيضاء'],
      play: 'تشغيل الحركة',
      pause: 'إيقاف الحركة مؤقتاً',
      replay: 'إعادة التشغيل',
      upklick: 'Upklick',
      brand: 'براندك',
      nav: ['لوحة التحكم', 'المساعد الذكي', 'صندوق الرسائل', 'العملاء المحتملين', 'الحجوزات', 'التحليلات'],
      workspace: 'مساحة العمل',
      kpis: ['الإيرادات', 'عملاء جدد', 'الحجوزات'],
      chart: 'الأداء',
      bars: 'مبيعات الأسبوع',
      gauge: 'الهدف',
      leads: 'أحدث العملاء',
      live: 'مباشر',
      people: ['سارة أحمد', 'عمر خالد', 'لينا حسن'],
    },
  },
  s2: {
    badge: 'المشكلة والفرصة',
    audiences: ['وكالات التسويق', 'المدربين والاستشاريين', 'شركات البرمجيات', 'العيادات والعقارات والمتاجر'],
    titleA: 'بناء سوفتوير من',
    titleHighlight: 'الصفر مكلف ومعقد..',
    titleB: 'وبيع الخدمات لوحده مبيبنيش دخل شهري مستقر',
    cards: [
      'تكلفة برمجة وصيانة ضخمة',
      'تعقيد موافقات ميتا والـ API',
      'عملاء متشتتين بين 10 أدوات',
      'عميل الخدمة بيمشي وعميل السيستم بيكمّل',
    ],
    solution: 'الحل إنك تستلم البنية التحتية كلها جاهزة وتبيعها باسمك من أول يوم',
  },
  s3: {
    badge: 'بنية تحتية جاهزة بالكامل',
    title: 'إحنا البروفايدر اللي بنوفرلك كل حاجة في الكواليس.. وإنت المالك الوحيد قدام عملائك',
    hub: 'منصتك باسمك',
    nodes: [
      'بروفايدر رسمي لقنوات Meta: واتساب وإنستجرام وماسنجر',
      'مزود الذكاء الاصطناعي بالكريدت بدون مفاتيح API',
      'مزود حملات الإيميل ماركيتنج جاهز ومفعّل',
      'مزود حجز وإعادة بيع الدومينات بربحك',
    ],
  },
  s4: {
    badge: 'علامة بيضاء كاملة',
    tag: 'Full White-Label',
    title: 'اسمنا بيختفي تماماً.. كل شاشة وإيميل ولينك بيحمل هوية شركتك لوحدك',
    features: [
      'استوديو الهوية البصرية والوضع الليلي والنهاري',
      'دومينك الخاص مع شهادة SSL مجانية',
      'صفحات الدخول والإيميلات باسم شركتك',
      'تطبيق موبايل PWA بأيقونة براندك',
    ],
    brand: 'براندك',
    domain: 'app.yourbrand.com',
    secure: 'اتصال آمن',
  },
  s5: {
    badge: 'تحكم تجاري وبوابات دفع متكاملة',
    titleHighlight: 'فصّل باقاتك',
    titleA: 'بالتسعير اللي يناسبك..',
    titleB: 'واستقبل فلوسك بطرق الدفع اللي عميلك بيستخدمها',
    plansTitle: 'هندسة الباقات والأرباح',
    plans: ['باقات شهرية وسنوية ومدى الحياة', 'بيع كريدت إضافي وكوبونات خصم', 'تعدد العملات: EGP - SAR - AED - USD'],
    paymentsTitle: 'تحصيل المدفوعات محلياً ودولياً',
    active: 'مفعّل',
    ready: 'جاهز للربط',
  },
  s6: {
    badge: 'المنتج اللي هتبيعه لعملائك',
    title: 'قدّم لعملائك نظام تشغيل بيزنس متكامل بيدير التسويق والمبيعات من شاشة واحدة',
    tools: [
      { title: 'وكيل مبيعات ذكي', text: 'AI Copilot وصوتي' },
      { title: 'صندوق رسائل موحد', text: 'لواتساب وإنستجرام وماسنجر' },
      { title: 'بناء المواقع والـ Funnels', text: 'بالسحب والإفلات' },
      { title: 'رسم مسارات الشات بوت', text: 'والأتمتة المرئية' },
      { title: 'إدارة العملاء CRM', text: 'وتوزيع الورديات' },
      { title: 'صفحات حجز المواعيد', text: 'وربط جوجل كالندر' },
      { title: 'بيع المنتجات والكورسات', text: 'وحملات واتساب والإيميل' },
      { title: 'تحليلات حية وتقارير PDF', text: 'وتتبع البيكسل' },
    ],
  },
  s7: {
    badge: 'قوة التجميع في منصة واحدة',
    title: 'استبدل 12 أداة واشتراك منفصل بمنصة واحدة شايلة اسم شركتك',
    beforeTitle: 'بدل تشتت 12 اشتراك منفصل',
    before: [
      'أدوات بناء المواقع والفانلز',
      'برامج الـ CRM وحجز المواعيد',
      'أدوات الواتساب والشات بوت',
      'منصات الكورسات وحملات الإيميل',
      'فواتير الـ AI API وشراء الدومينات',
    ],
    afterTitle: 'كلهم جاهزين جوه منصتك الواحدة',
    after: [
      'مواقع وفانلز واستضافة وقوالب جاهزة',
      'CRM متكامل وحجز مواعيد ذكي',
      'صندوق رسائل ميتا الموحد وأتمتة مرئية',
      'استضافة كورسات وإيميل ماركيتنج مدمج',
      'كريدت AI وإعادة بيع الدومينات بربحك',
    ],
  },
  s8: {
    badge: 'خطوات الإطلاق والتشغيل',
    title: 'من استلام المنصة لأول اشتراك عميل في 4 خطوات واضحة',
    steps: [
      'خصّص هويتك واربط دومينك',
      'ابني باقاتك وفعّل طرق الدفع',
      'اعرض الديمو الجاهز وافتح حسابات عملائك',
      'تابع أرباحك وادعم عملائك بضغطة زر',
    ],
    chips: ['حساب ديمو جاهز للعرض', 'دخول لحساب العميل بضغطة زر', 'شات دعم فني باسمك'],
  },
  s9: {
    badge: 'الباقة والأسئلة الشائعة',
    planName: 'باقة السوبر أدمن الشاملة',
    price: '$99',
    period: '/ شهرياً',
    planNote: 'اشتراك مباشر - عدد عملاء غير محدود',
    features: [
      'وايت ليبل كامل بدومينك وتطبيق موبايل',
      'إحنا البروفايدر: ميتا والـ AI والإيميل والدومينات',
      'كل الـ 12 أداة وبوابات الدفع المحلية والدولية',
    ],
    cta: 'احجز استشارة مجانية',
    faqTitle: 'أكثر الأسئلة شيوعاً',
    faq: [
      {
        q: 'هل عملائي ممكن يشوفوا اسم Upklick في أي مكان؟',
        a: 'لأ. الشاشات وصفحات الدخول والإيميلات واللينكات ودومينك وتطبيق الموبايل كلها بتحمل براندك إنت بس — والمنصة شغالة في الكواليس بهويتك.',
      },
      {
        q: 'هل لازم أكون مبرمج أو أعمل حسابات مطورين في ميتا وOpenAI؟',
        a: 'لأ. إحنا البروفايدر التقني لقنوات ميتا والذكاء الاصطناعي والإيميل والدومينات، فمفيش مفاتيح API ولا موافقات مطورين تتعامل معاها. كل حاجة بتتظبط من لوحة التحكم بتاعتك.',
      },
      {
        q: 'إزاي بستلم فلوس الاشتراكات من عملائي؟',
        a: 'بتربط بوابات الدفع الخاصة بيك — زي Stripe وPayPal وفوري وفودافون كاش وإنستاباي — واشتراكات عملائك بتتحصّل من خلالها مباشرة.',
      },
      {
        q: 'إزاي بضمن هامش ربحي من الذكاء الاصطناعي والرسائل؟',
        a: 'إنت اللي بتحدد أسعار باقاتك والكريدت الإضافي والحزم. حطها أعلى من تكلفتك وكل استخدام من عملائك بيزوّد ربحك.',
      },
    ],
  },
  s10: {
    badge: 'خطوتك الجاية لامتلاك السوفتوير بتاعك',
    titleA: 'ابدأ شركتك البرمجية النهاردة..',
    titleB: 'وخلّي كل عميل يبني بيزنسه جوه منصتك إنت',
    text: 'احجز استشارتك المجانية وشوف لوحة السوبر أدمن ولوحة العميل لايف وابدأ البيع بـ 99$ شهرياً',
    cta: 'احجز استشارة مجانية الآن',
    chips: ['امتلك البراند بالكامل', 'امتلك قرار التسعير والربح', 'امتلك علاقتك بالعميل'],
  },
};

export const whiteLabelContent: Record<'en' | 'ar', WhiteLabelCopy> = { en, ar };
