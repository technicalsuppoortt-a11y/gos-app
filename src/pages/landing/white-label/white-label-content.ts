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

const nl: WhiteLabelCopy = {
  nav: 'White-Label',
  chapter: {
    eyebrow: 'Upklick White-Label Programma',
    title: 'Start je eigen softwarebedrijf — in 10 duidelijke stappen',
    text: 'Voor bureaus, consultants en softwareteams die een compleet AI-platform onder hun eigen merk willen verkopen.',
    steps: '10 stappen',
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
    cta: 'Plan nu een gratis adviesgesprek',
    logoHere: 'Jouw logo hier',
    morph: {
      label: 'Geanimeerd voorbeeld: het Upklick-dashboard verandert in jouw white-label merk',
      stages: ['Upklick-dashboard', 'Merktransformatie', 'Jouw white-label'],
      play: 'Animatie afspelen',
      pause: 'Animatie pauzeren',
      replay: 'Opnieuw afspelen',
      upklick: 'Upklick',
      brand: 'Jouw merk',
      nav: ['Dashboard', 'AI Copilot', 'Postvak IN', 'CRM & Leads', 'Afspraken', 'Analyses'],
      workspace: 'Werkruimte',
      kpis: ['Omzet', 'Nieuwe leads', 'Afspraken'],
      chart: 'Prestaties',
      bars: 'Weekomzet',
      gauge: 'Doel',
      leads: 'Recente leads',
      live: 'Live',
      people: ['Sarah Ahmed', 'Omar Khaled', 'Lina Hassan'],
    },
  },
  s2: {
    badge: 'Het probleem & de kans',
    audiences: ['Marketingbureaus', 'Coaches & consultants', 'Softwarebedrijven', 'Klinieken, vastgoed & webshops'],
    titleA: 'Software vanaf nul bouwen is',
    titleHighlight: 'duur en complex..',
    titleB: 'en alleen diensten verkopen levert nooit een stabiel maandelijks inkomen op',
    cards: [
      'Hoge ontwikkelings- en onderhoudskosten',
      'Complexe Meta- en API-goedkeuringen',
      'Klanten verspreid over 10 losse tools',
      'Een dienstenklant vertrekt — een systeemklant blijft',
    ],
    solution: 'De oplossing: ontvang de volledige infrastructuur gebruiksklaar en verkoop vanaf dag één onder je eigen naam',
  },
  s3: {
    badge: 'Volledig gebruiksklare infrastructuur',
    title: 'Wij draaien alles achter de schermen.. en jij bent de enige eigenaar richting je klanten',
    hub: 'Jouw platform, jouw naam',
    nodes: [
      'Officiële Meta-kanalenprovider: WhatsApp, Instagram en Messenger',
      'AI-provider op basis van tegoed — geen API-sleutels nodig',
      'Provider voor e-mailmarketingcampagnes, direct klaar en actief',
      'Provider voor domeinregistratie en wederverkoop — met jouw winstmarge',
    ],
  },
  s4: {
    badge: 'Volledige white-label',
    tag: 'Full White-Label',
    title: 'Onze naam verdwijnt volledig.. elk scherm, elke e-mail en elke link draagt alleen jouw bedrijfsidentiteit',
    features: [
      'Merkidentiteitsstudio met donkere en lichte modus',
      'Je eigen domein met een gratis SSL-certificaat',
      'Inlogpagina’s en e-mails uit naam van jouw bedrijf',
      'PWA mobiele app met je eigen merkicoon',
    ],
    brand: 'Jouw merk',
    domain: 'app.jouwmerk.nl',
    secure: 'Beveiligde verbinding',
  },
  s5: {
    badge: 'Commerciële controle & geïntegreerde betaalmethoden',
    titleHighlight: 'Stel je abonnementen samen',
    titleA: 'met de prijzen die bij jou passen..',
    titleB: 'en ontvang betalingen via de betaalmethoden die je klanten al gebruiken',
    plansTitle: 'Abonnementen & winstmodel',
    plans: ['Maand-, jaar- en lifetime-abonnementen', 'Verkoop extra tegoed en kortingscodes', 'Meerdere valuta: EUR - USD - EGP - SAR - AED'],
    paymentsTitle: 'Ontvang lokaal en internationaal betalingen',
    active: 'Actief',
    ready: 'Klaar om te koppelen',
  },
  s6: {
    badge: 'Het product dat je aan je klanten verkoopt',
    title: 'Bied je klanten een compleet bedrijfssysteem waarmee ze marketing en verkoop vanuit één scherm aansturen',
    tools: [
      { title: 'Slimme verkoopassistent', text: 'AI Copilot en spraak' },
      { title: 'Gecombineerd postvak IN', text: 'WhatsApp, Instagram en Messenger' },
      { title: 'Website- & funnelbouwer', text: 'Drag-and-drop' },
      { title: 'Chatbot-flowontwerper', text: 'Visuele automatisering' },
      { title: 'CRM-klantbeheer', text: 'Met dienstverdeling' },
      { title: 'Afspraakboekingspagina’s', text: 'Google Agenda-synchronisatie' },
      { title: 'Producten & cursussen verkopen', text: 'WhatsApp- en e-mailcampagnes' },
      { title: 'Live analyses & PDF-rapporten', text: 'Met pixeltracking' },
    ],
  },
  s7: {
    badge: 'De kracht van één platform',
    title: 'Vervang 12 losse tools en abonnementen door één platform met jouw bedrijfsnaam',
    beforeTitle: 'In plaats van 12 versnipperde abonnementen',
    before: [
      'Losse website- en funnelbouwers',
      'CRM- en afspraaksoftware',
      'WhatsApp- en chatbottools',
      'Cursusplatformen en e-mailcampagnes',
      'AI API-facturen en losse domeinaankopen',
    ],
    afterTitle: 'Alles klaar in jouw ene platform',
    after: [
      'Websites, funnels, hosting en kant-en-klare templates',
      'Compleet CRM met slimme afspraakplanning',
      'Gecombineerde Meta-inbox en visuele automatisering',
      'Cursushosting met ingebouwde e-mailmarketing',
      'AI-tegoed en domeinwederverkoop met jouw marge',
    ],
  },
  s8: {
    badge: 'Stappen voor lancering & beheer',
    title: 'Van oplevering van het platform tot je eerste klantabonnement in 4 heldere stappen',
    steps: [
      'Pas je merkidentiteit aan en koppel je domein',
      'Stel je abonnementen samen en activeer betaalmethoden',
      'Presenteer de kant-en-klare demo en open klantaccounts',
      'Volg je winst en ondersteun klanten met één klik',
    ],
    chips: ['Presentatieklaar demo-account', 'Met één klik inloggen op klantaccounts', 'Supportchat onder jouw naam'],
  },
  s9: {
    badge: 'Het abonnement & veelgestelde vragen',
    planName: 'Het alles-in-één Super Admin-abonnement',
    price: '$99',
    period: '/ maand',
    planNote: 'Direct abonnement — onbeperkt aantal klanten',
    features: [
      'Volledige white-label met je eigen domein en mobiele app',
      'Wij zijn de provider: Meta, AI, e-mail en domeinen',
      'Alle 12 tools plus lokale en internationale betaalgateways',
    ],
    cta: 'Plan een gratis adviesgesprek',
    faqTitle: 'Meest gestelde vragen',
    faq: [
      {
        q: 'Zien mijn klanten ergens de naam Upklick?',
        a: 'Nee. Schermen, inlogpagina’s, e-mails, links, je domein en de mobiele app dragen uitsluitend jouw merk — het platform draait volledig achter de schermen onder jouw identiteit.',
      },
      {
        q: 'Moet ik ontwikkelaar zijn of developer-accounts aanmaken bij Meta en OpenAI?',
        a: 'Nee. Wij fungeren als technische provider voor Meta-kanalen, AI, e-mail en domeinen, dus je hoeft geen API-sleutels of ontwikkelaarsgoedkeuringen te beheren. Je stelt alles in vanuit je dashboard.',
      },
      {
        q: 'Hoe ontvang ik abonnementsbetalingen van mijn klanten?',
        a: 'Je koppelt je eigen betaalgateways — zoals Stripe, PayPal, Fawry, Vodafone Cash of InstaPay — en klantabonnementen worden rechtstreeks via jouw rekeningen geïnd.',
      },
      {
        q: 'Hoe behoud ik een winstmarge op AI-gebruik en berichten?',
        a: 'Jij bepaalt de prijzen van je abonnementen, extra tegoed en bundels. Stel ze boven je inkoopprijs in en elk klantgebruik draagt direct bij aan jouw marge.',
      },
    ],
  },
  s10: {
    badge: 'Je volgende stap naar je eigen softwarebedrijf',
    titleA: 'Start vandaag nog je softwarebedrijf..',
    titleB: 'en laat elke klant zijn bedrijf bouwen binnen jouw platform',
    text: 'Plan je gratis adviesgesprek, bekijk het Super Admin- en klantdashboard live en start met verkopen voor $99 per maand.',
    cta: 'Plan nu een gratis adviesgesprek',
    chips: ['Volledig eigenaar van het merk', 'Bepaal zelf je prijzen en winst', 'Volledige regie over je klantrelatie'],
  },
};

const de: WhiteLabelCopy = {
  nav: 'White-Label',
  chapter: {
    eyebrow: 'Upklick White-Label-Programm',
    title: 'Starte dein eigenes Softwareunternehmen — in 10 klaren Schritten',
    text: 'Für Agenturen, Berater und Softwareteams, die eine komplette KI-Plattform unter ihrer eigenen Marke verkaufen möchten.',
    steps: '10 Schritte',
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
    cta: 'Jetzt kostenloses Beratungsgespräch buchen',
    logoHere: 'Dein Logo hier',
    morph: {
      label: 'Animierte Vorschau: Das Upklick-Dashboard verwandelt sich in deine White-Label-Marke',
      stages: ['Upklick-Dashboard', 'Marken-Transformation', 'Dein White-Label'],
      play: 'Animation abspielen',
      pause: 'Animation pausieren',
      replay: 'Neu abspielen',
      upklick: 'Upklick',
      brand: 'Deine Marke',
      nav: ['Dashboard', 'AI Copilot', 'Posteingang', 'CRM & Leads', 'Termine', 'Analysen'],
      workspace: 'Arbeitsbereich',
      kpis: ['Umsatz', 'Neue Leads', 'Buchungen'],
      chart: 'Performance',
      bars: 'Wochenumsatz',
      gauge: 'Ziel',
      leads: 'Aktuelle Leads',
      live: 'Live',
      people: ['Sarah Ahmed', 'Omar Khaled', 'Lina Hassan'],
    },
  },
  s2: {
    badge: 'Das Problem & die Chance',
    audiences: ['Marketingagenturen', 'Coaches & Berater', 'Softwareunternehmen', 'Praxen, Immobilien & Online-Shops'],
    titleA: 'Software von Grund auf zu entwickeln ist',
    titleHighlight: 'teuer und komplex..',
    titleB: 'und reine Dienstleistungen schaffen selten ein stabiles monatliches Einkommen',
    cards: [
      'Hohe Entwicklungs- und Wartungskosten',
      'Komplexe Meta- und API-Freigaben',
      'Kunden verteilt auf 10 verschiedene Tools',
      'Ein Dienstleistungskunde wechselt — ein Systemkunde bleibt',
    ],
    solution: 'Die Lösung: Übernimm die komplette Infrastruktur schlüsselfertig und verkaufe sie ab Tag eins unter deinem Namen',
  },
  s3: {
    badge: 'Schlüsselfertige Infrastruktur',
    title: 'Wir betreiben alles im Hintergrund.. und du bist gegenüber deinen Kunden der alleinige Anbieter',
    hub: 'Deine Plattform, dein Name',
    nodes: [
      'Offizieller Meta-Kanal-Provider: WhatsApp, Instagram und Messenger',
      'KI-Provider auf Guthabenbasis — keine API-Schlüssel erforderlich',
      'E-Mail-Marketing-Provider, sofort einsatzbereit und aktiv',
      'Provider für Domainregistrierung und Weiterverkauf — mit deiner Marge',
    ],
  },
  s4: {
    badge: 'Vollständiges White-Label',
    tag: 'Full White-Label',
    title: 'Unser Name verschwindet komplett.. jeder Bildschirm, jede E-Mail und jeder Link trägt nur deine Unternehmensidentität',
    features: [
      'Marken-Studio mit Hell- und Dunkelmodus',
      'Eigene Domain inklusive kostenlosem SSL-Zertifikat',
      'Login-Seiten und E-Mails im Namen deines Unternehmens',
      'Mobile PWA-App mit deinem eigenen Marken-Icon',
    ],
    brand: 'Deine Marke',
    domain: 'app.deinemarke.de',
    secure: 'Sichere Verbindung',
  },
  s5: {
    badge: 'Kaufmännische Kontrolle & integrierte Zahlungsanbieter',
    titleHighlight: 'Gestalte deine Tarife',
    titleA: 'mit den Preisen, die zu dir passen..',
    titleB: 'und empfange Zahlungen über die Zahlungsmethoden, die deine Kunden bereits nutzen',
    plansTitle: 'Tarife & Margensteuerung',
    plans: ['Monats-, Jahres- und Lifetime-Tarife', 'Zusatzguthaben und Rabattcodes verkaufen', 'Mehrwährungsfähig: EUR - USD - EGP - SAR - AED'],
    paymentsTitle: 'Zahlungen lokal und international einziehen',
    active: 'Aktiv',
    ready: 'Bereit zur Verbindung',
  },
  s6: {
    badge: 'Das Produkt, das du deinen Kunden verkaufst',
    title: 'Biete deinen Kunden ein komplettes Betriebssystem, das Marketing und Vertrieb auf einem Bildschirm vereint',
    tools: [
      { title: 'Intelligenter Vertriebsassistent', text: 'AI Copilot und Sprache' },
      { title: 'Zentraler Posteingang', text: 'WhatsApp, Instagram und Messenger' },
      { title: 'Website- & Funnel-Builder', text: 'Drag-and-drop' },
      { title: 'Chatbot-Flow-Designer', text: 'Visuelle Automatisierung' },
      { title: 'CRM-Kundenverwaltung', text: 'Mit Schichtverteilung' },
      { title: 'Terminbuchungsseiten', text: 'Google Kalender-Synchronisierung' },
      { title: 'Produkte & Kurse verkaufen', text: 'WhatsApp- und E-Mail-Kampagnen' },
      { title: 'Live-Analysen & PDF-Berichte', text: 'Mit Pixel-Tracking' },
    ],
  },
  s7: {
    badge: 'Die Stärke einer zentralen Plattform',
    title: 'Ersetze 12 einzelne Tools und Abonnements durch eine Plattform mit deinem Firmennamen',
    beforeTitle: 'Statt 12 verstreuter Abonnements',
    before: [
      'Separate Website- und Funnel-Builder',
      'CRM- und Terminbuchungs-Software',
      'WhatsApp- und Chatbot-Tools',
      'Kursplattformen und E-Mail-Kampagnen',
      'KI-API-Rechnungen und einzelne Domainkäufe',
    ],
    afterTitle: 'Alles vereint in deiner eigenen Plattform',
    after: [
      'Websites, Funnels, Hosting und fertige Vorlagen',
      'Vollständiges CRM mit intelligenter Terminbuchung',
      'Zentraler Meta-Posteingang und visuelle Automatisierung',
      'Kurs-Hosting mit integriertem E-Mail-Marketing',
      'KI-Guthaben und Domain-Weiterverkauf mit deiner Marge',
    ],
  },
  s8: {
    badge: 'Start- & Betriebsschritte',
    title: 'Von der Bereitstellung der Plattform bis zum ersten Kundenabonnement in 4 klaren Schritten',
    steps: [
      'Markenidentität anpassen und eigene Domain verbinden',
      'Tarife erstellen und Zahlungsmethoden aktivieren',
      'Fertige Demo präsentieren und Kundenkonten eröffnen',
      'Gewinne verfolgen und Kunden mit einem Klick unterstützen',
    ],
    chips: ['Präsentationsfertiges Demo-Konto', 'Ein-Klick-Login in Kundenkonten', 'Support-Chat unter deinem Namen'],
  },
  s9: {
    badge: 'Der Tarif & FAQ',
    planName: 'Der All-inclusive Super-Admin-Tarif',
    price: '$99',
    period: '/ Monat',
    planNote: 'Direktabonnement — unbegrenzte Kundenanzahl',
    features: [
      'Vollständiges White-Label mit eigener Domain und mobiler App',
      'Wir sind der Provider: Meta, KI, E-Mail und Domains',
      'Alle 12 Tools sowie lokale und internationale Zahlungsgateways',
    ],
    cta: 'Kostenloses Beratungsgespräch buchen',
    faqTitle: 'Häufig gestellte Fragen',
    faq: [
      {
        q: 'Sehen meine Kunden irgendwo den Namen Upklick?',
        a: 'Nein. Oberflächen, Login-Seiten, E-Mails, Links, deine Domain und die mobile App tragen ausschließlich deine Marke — die Plattform läuft komplett im Hintergrund unter deiner Identität.',
      },
      {
        q: 'Muss ich Entwickler sein oder Entwicklerkonten bei Meta und OpenAI anlegen?',
        a: 'Nein. Wir agieren als technischer Provider für Meta-Kanäle, KI, E-Mail und Domains — es sind keine API-Schlüssel oder Entwicklerfreigaben nötig. Du richtest alles bequem im Dashboard ein.',
      },
      {
        q: 'Wie erhalte ich Abonnementzahlungen von meinen Kunden?',
        a: 'Du verbindest deine eigenen Zahlungsgateways — etwa Stripe, PayPal, Fawry, Vodafone Cash oder InstaPay — und ziehst Kundenzahlungen direkt darüber ein.',
      },
      {
        q: 'Wie sichere ich meine Gewinnmarge bei KI-Nutzung und Nachrichten?',
        a: 'Du legst die Preise deiner Tarife, Zusatzguthaben und Pakete selbst fest. Setze sie über deinen Einkaufspreis und jede Nutzung deiner Kunden steigert deine Marge.',
      },
    ],
  },
  s10: {
    badge: 'Dein nächster Schritt zur eigenen Software',
    titleA: 'Starte noch heute dein Softwareunternehmen..',
    titleB: 'und lass jeden Kunden sein Business auf deiner Plattform aufbauen',
    text: 'Buche dein kostenloses Beratungsgespräch, erlebe das Super-Admin- und Kunden-Dashboard live und starte den Verkauf für $99 pro Monat.',
    cta: 'Jetzt kostenloses Beratungsgespräch buchen',
    chips: ['Marke vollständig besitzen', 'Preise und Marge selbst bestimmen', 'Kundenbeziehung komplett behalten'],
  },
};

export const whiteLabelContent: Record<'en' | 'ar' | 'nl' | 'de', WhiteLabelCopy> = { en, ar, nl, de };
