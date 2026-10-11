/* Bilingual copy for the public GOS landing page.
   The Arabic object is typed against the English one so both stay in sync. */

/* ---------- Hero preview tab views ----------
   Each sidebar tab of the hero mockup renders one of these views in place (no routing).
   `kind` picks the activity icon/colour in LandingPage.tsx. */
export type PreviewKind = 'capture' | 'message' | 'booking' | 'payment' | 'stage' | 'note' | 'system';
export type PreviewView = {
  title: string;
  subtitle: string;
  stats: { value: number; label: string; suffix?: string }[];
  activity: { text: string; time: string; tag: string; kind: PreviewKind }[];
};

const enFollowUpView: PreviewView = {
  title: 'AI Follow-Up',
  subtitle: 'Manage your leads, follow-ups and bookings.',
  stats: [
    { value: 124, label: 'Active leads' },
    { value: 602, label: 'Follow-ups sent' },
    { value: 731, label: 'Conversations' },
  ],
  activity: [
    { text: 'New lead from Instagram', time: '2m ago', tag: 'New', kind: 'capture' },
    { text: 'Follow-up sent to Sarah', time: '8m ago', tag: 'Sent', kind: 'message' },
    { text: 'Call booked with Omar', time: '21m ago', tag: 'Booked', kind: 'booking' },
    { text: 'Lead converted to client', time: '1h ago', tag: 'Won', kind: 'payment' },
  ],
};

const enViews: Record<'copilot' | 'inbox' | 'crm' | 'booking' | 'products' | 'analytics' | 'settings', PreviewView> = {
  copilot: {
    title: 'AI Copilot',
    subtitle: 'Your AI business assistant, ready 24/7.',
    stats: [
      { value: 48, label: 'Tasks automated' },
      { value: 312, label: 'Questions answered' },
      { value: 19, label: 'Insights today' },
    ],
    activity: [
      { text: 'Drafted a follow-up for Sarah', time: '3m ago', tag: 'Draft', kind: 'message' },
      { text: 'Summarized 12 new leads', time: '15m ago', tag: 'Summary', kind: 'system' },
      { text: 'Suggested best time to call Omar', time: '40m ago', tag: 'Tip', kind: 'stage' },
      { text: 'Weekly growth report is ready', time: '2h ago', tag: 'Report', kind: 'note' },
    ],
  },
  inbox: {
    title: 'Inbox',
    subtitle: 'All your conversations in one place.',
    stats: [
      { value: 58, label: 'Open chats' },
      { value: 214, label: 'Replied today' },
      { value: 9, label: 'Avg. reply time', suffix: 's' },
    ],
    activity: [
      { text: 'WhatsApp: Lina asked about pricing', time: '1m ago', tag: 'New', kind: 'capture' },
      { text: 'Instagram DM from Youssef', time: '6m ago', tag: 'DM', kind: 'message' },
      { text: 'AI replied to Hana on Messenger', time: '12m ago', tag: 'AI', kind: 'system' },
      { text: 'Email thread closed with Omar', time: '1h ago', tag: 'Closed', kind: 'stage' },
    ],
  },
  crm: {
    title: 'CRM & Leads',
    subtitle: 'Track pipeline, contacts and deals.',
    stats: [
      { value: 386, label: 'Contacts' },
      { value: 42, label: 'Open deals' },
      { value: 27, label: 'Qualified this week' },
    ],
    activity: [
      { text: 'Sarah moved to Qualified', time: '5m ago', tag: 'Moved', kind: 'stage' },
      { text: 'New contact: Ahmed Saleh', time: '18m ago', tag: 'New', kind: 'capture' },
      { text: 'Deal won with Nova Studio', time: '1h ago', tag: 'Won', kind: 'payment' },
      { text: 'Note added to Omar’s profile', time: '3h ago', tag: 'Note', kind: 'note' },
    ],
  },
  booking: {
    title: 'Booking & Calendar',
    subtitle: 'Booking links, calendar and appointments.',
    stats: [
      { value: 14, label: 'Calls today' },
      { value: 63, label: 'Booked this week' },
      { value: 92, label: 'Show-up rate', suffix: '%' },
    ],
    activity: [
      { text: 'Call booked with Omar · 4:00 PM', time: '2m ago', tag: 'Booked', kind: 'booking' },
      { text: 'Reminder sent to Lina', time: '25m ago', tag: 'Reminder', kind: 'message' },
      { text: 'Strategy session rescheduled', time: '1h ago', tag: 'Moved', kind: 'stage' },
      { text: 'Consultation completed with Sara', time: '3h ago', tag: 'Done', kind: 'booking' },
    ],
  },
  products: {
    title: 'Products & Payments',
    subtitle: 'Sell products and collect payments.',
    stats: [
      { value: 12, label: 'Products' },
      { value: 86, label: 'Orders' },
      { value: 24680, label: 'Revenue (€)' },
    ],
    activity: [
      { text: 'Payment received · €450', time: '4m ago', tag: 'Paid', kind: 'payment' },
      { text: 'New order: Growth Program', time: '20m ago', tag: 'Order', kind: 'capture' },
      { text: 'Invoice sent to Karim', time: '1h ago', tag: 'Sent', kind: 'message' },
      { text: 'Coupon SPRING20 redeemed', time: '2h ago', tag: 'Promo', kind: 'note' },
    ],
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Track performance and growth.',
    stats: [
      { value: 38, label: 'Conversion rate', suffix: '%' },
      { value: 1240, label: 'Visitors today' },
      { value: 172, label: 'Booked calls' },
    ],
    activity: [
      { text: 'Booked calls up 38% this month', time: '1h ago', tag: 'Growth', kind: 'stage' },
      { text: 'Instagram is your top channel', time: '3h ago', tag: 'Insight', kind: 'system' },
      { text: 'Reply time improved to 9s', time: '5h ago', tag: 'Speed', kind: 'message' },
      { text: 'Weekly report generated', time: '1d ago', tag: 'Report', kind: 'note' },
    ],
  },
  settings: {
    title: 'Settings',
    subtitle: 'Workspace, team and integrations.',
    stats: [
      { value: 6, label: 'Team members' },
      { value: 5, label: 'Connected channels' },
      { value: 3, label: 'Active automations' },
    ],
    activity: [
      { text: 'WhatsApp channel connected', time: '10m ago', tag: 'Connected', kind: 'system' },
      { text: 'Mona joined your team', time: '1h ago', tag: 'Team', kind: 'capture' },
      { text: 'Business hours updated', time: '4h ago', tag: 'Updated', kind: 'stage' },
      { text: 'Knowledge base synced', time: '1d ago', tag: 'Synced', kind: 'note' },
    ],
  },
};

const en = {
  meta: {
    title: 'GOS — Turn Every Lead Into a Real Opportunity with AI Follow-Up',
    description: 'GOS helps you respond instantly, follow up automatically and book appointments with AI — so no lead is ever lost.',
  },
  nav: {
    links: [
      { id: 'how-it-works', label: 'How it Works' },
      { id: 'features', label: 'Features' },
      { id: 'results', label: 'Results' },
      { id: 'pricing', label: 'Pricing' },
      { id: 'faq', label: 'FAQ' },
    ],
    login: 'Log in',
    book: 'Book a Free Consultation',
    langLabel: 'العربية',
    menu: 'Menu',
    top: 'Back to top',
  },
  hero: {
    badge: 'Complete Follow-Up System',
    titleA: 'Turn Every Lead Into a Real Opportunity',
    titleB: 'with AI Follow-Up.',
    lead: 'GOS helps you automatically respond quickly, follow up and book appointments — so no lead gets lost and they reach your business.',
    checks: [
      'Instant and consistent responses',
      'Automate follow-ups and reminders',
      'Book calls and send next steps',
      'Turn more leads into paying clients',
    ],
    primary: 'Book a Free Consultation',
    video: 'Watch a Quick Video',
    note: 'No obligation call • we’ll understand your situation and show you how GOS can help.',
    builtFor: 'Built for different types of businesses:',
    businesses: ['Coaches & Consultants', 'Service Businesses', 'Agencies', 'E-commerce Stores', 'Local Businesses', 'Clinics & Healthcare', 'Education & Courses', 'Real Estate'],
  },
  mock: {
    nav: ['AI Copilot', 'AI Follow-Up', 'Inbox', 'CRM & Leads', 'Booking & Calendar', 'Products & Payments', 'Analytics', 'Settings'],
    ...enFollowUpView,
    live: 'Live',
    activityTitle: 'Recent Activity',
    viewAll: 'View all',
    views: [enViews.copilot, enFollowUpView, enViews.inbox, enViews.crm, enViews.booking, enViews.products, enViews.analytics, enViews.settings],
    liveLabel: 'Your workspace',
    demoLabel: 'Demo preview',
    empty: 'No recent activity yet — new leads will appear here.',
    time: { now: 'Just now', min: '{n}m ago', hour: '{n}h ago', yesterday: 'Yesterday', day: '{n}d ago' },
    events: {
      capture: 'New lead: {name}',
      message: 'Follow-up sent to {name}',
      booking: 'Call booked with {name}',
      payment: 'Payment received from {name}',
      stage: '{name} moved to a new stage',
      note: 'Note added for {name}',
      system: 'Automation update · {name}',
    },
    tags: { capture: 'New', message: 'Sent', booking: 'Booked', payment: 'Won', stage: 'Moved', note: 'Note', system: 'Auto' },
    badgeA: { title: 'Automate follow-ups', text: 'Save time and never miss a lead' },
    badgeB: { title: 'Turn more leads into clients', text: '+38% booked calls' },
  },
  problem: {
    floatCard: 'Where are you losing opportunities?',
    badge: 'The Problem',
    title: 'Many Businesses Lose Real Revenue Without Realizing It.',
    text: 'You might already have leads, traffic and interest, but you still lose revenue because of slow responses, no follow-up, missed bookings, inconsistent processes or disconnected tools.',
    cards: [
      { title: 'Slow Response', text: 'The lead asks a question, but the reply comes too late — and their interest fades.' },
      { title: 'No Follow-Up', text: 'If the lead doesn’t reply right away, they’re forgotten and never contacted again.' },
      { title: 'Price Sent, Then Silence', text: 'You send the price, but there is no next step for booking or a call.' },
      { title: 'Different Follow-Up Styles', text: 'Your team responds in different ways, with no consistent process.' },
      { title: 'Leads in Different Places', text: 'Some leads are in WhatsApp, some in Instagram, some in a spreadsheet — with no single view.' },
    ],
    alert: 'The problem is not always a lack of leads. Often the real problem is what happens after they arrive.',
  },
  solution: {
    badge: 'The AI Follow-Up System',
    titleA: 'Let’s Add Another Tool to Your Business.',
    titleB: 'Let’s Close Your Money Leaks.',
    text: 'Instead of a disconnected process, we combine AI, automation and human handoff inside one simple system to make your follow-up consistent, fast and effective.',
    quoteA: 'AI follow-up doesn’t replace your team.',
    quoteB: 'It makes sure',
    quoteBold: 'no opportunity is lost between these steps.',
    engine: { title: 'GOS', sub: 'Follow-Up System' },
    nodes: {
      ai: { title: 'AI Follow-Up', text: 'Understands, replies and qualifies' },
      team: { title: 'Your Team', text: 'Steps in for important cases and final decisions' },
      automation: { title: 'Automation', text: 'Follows up, moves leads and triggers next steps' },
    },
    steps: [
      { label: 'Identify', detail: 'Every new lead is captured from WhatsApp, Instagram, forms and your website.' },
      { label: 'Engage', detail: 'The AI replies instantly, in your tone, any time of day.' },
      { label: 'Follow Up', detail: 'Smart reminders keep the conversation alive until the lead decides.' },
      { label: 'Book', detail: 'Qualified leads pick a time directly in your calendar.' },
      { label: 'Convert', detail: 'Your team closes warm, ready-to-buy clients.' },
    ],
  },
  demo: {
    badge: 'Live AI Follow-Up Demo',
    title: 'See How the AI Handles a Real Conversation.',
    text: 'This is an example of a real conversation with a potential client. The AI answers questions, qualifies the lead, and books a call.',
    stages: [
      { title: 'New Lead', text: 'From Instagram' },
      { title: 'Qualifying', text: 'Asking the right questions' },
      { title: 'Explain Options', text: 'Share the best package' },
      { title: 'Book a Call', text: 'Suggest a suitable time' },
    ],
    chatName: 'Potential Client',
    chatStatus: 'Online',
    messages: [
      { from: 'lead', text: 'Hi, I’m interested in your coaching program. Can you tell me about the price?' },
      { from: 'ai', text: 'Hi! Great to hear from you 😊 I’d love to help. Before I recommend the best option, can I ask what your main goal is right now?' },
      { from: 'lead', text: 'I want to get more clients for my business.' },
      { from: 'ai', text: 'Great! We have a program built exactly for that. I’d suggest booking a free consultation call so we can recommend the best plan for you.' },
    ],
    bookCta: 'Book a Free Call',
    booked: 'Call booked · Tue 4:00 PM',
    typing: 'AI is typing…',
    replay: 'Replay',
    canTitle: 'The AI can:',
    can: [
      'Answer common questions',
      'Understand the customer’s business',
      'Qualify leads automatically',
      'Book appointments',
      'Follow up before and after calls',
      'Reactivate old leads',
      'Send and support customers',
    ],
  },
  compare: {
    badge: 'Before vs After',
    title: 'From Lost Opportunities to Real Revenue.',
    text: 'Same leads. A completely different result.',
    beforeTitle: 'Before GOS',
    afterTitle: 'After GOS',
    before: ['Slow and inconsistent responses', 'Leads get forgotten', 'No clear follow-up process', 'Prices sent and lost', 'Lost potential clients'],
    after: ['Instant and consistent responses', 'Automatic follow-up and reminders', 'More qualified leads', 'More booked calls', 'Turn more leads into paying clients'],
  },
  how: {
    badge: 'How It Works',
    title: 'From Lead to Booking in 4 Simple Steps.',
    text: 'A simple and clear process to make sure no opportunity is lost and every lead reaches the right next step.',
    stepLabel: 'Step',
    steps: [
      { title: 'Analyze', text: 'Understand your current situation and lead flow' },
      { title: 'Set Up', text: 'Connect your channels and set follow-up rules' },
      { title: 'Activate', text: 'AI starts responding and following up' },
      { title: 'Get Results', text: 'More bookings and paying clients' },
    ],
  },
  tools: {
    badge: 'Everything in One Place',
    title: 'All the Tools You Need to Manage and Grow Your Business.',
    text: 'GOS gives you all the essential tools to capture, follow up and convert leads — in one system.',
    items: [
      { title: 'AI Copilot', text: 'Your AI business assistant' },
      { title: 'AI Follow-Up', text: 'Respond, qualify, follow up and book' },
      { title: 'Inbox', text: 'All your conversations in one place' },
      { title: 'CRM & Leads', text: 'Track pipeline, contacts and deals' },
      { title: 'Booking & Calendar', text: 'Booking links, calendar and appointments' },
      { title: 'Products & Payments', text: 'Sell products and collect payments' },
      { title: 'Analytics', text: 'Track performance and growth' },
    ],
  },
  testimonials: {
    badge: 'Real Results',
    title: 'From Students to Business Owners.',
    text: 'See how our students are building real businesses, getting customers and creating recurring revenue with GOS.',
    items: [
      { quote: '“GOS helped me go from an idea to real customers in just two months. The step-by-step process made everything clear.”', name: 'Ahmed T.', role: 'Coach' },
      { quote: '“I used to follow up manually. Now my AI follow-up and booking system work automatically and bring me consistent customers.”', name: 'Sara M.', role: 'Consultant' },
      { quote: '“Everything I need is in one place: funnels, CRM, payments and AI. It’s a complete business system.”', name: 'Karim A.', role: 'Agency Owner' },
    ],
  },
  faq: {
    badge: 'FAQ',
    title: 'Frequently Asked Questions.',
    text: 'Quick answers to the most common questions about GOS and the AI Follow-Up system.',
    viewAll: 'View All Questions',
    showLess: 'Show Fewer Questions',
    items: [
      { q: 'Does the AI replace my team?', a: 'No. The AI handles the repetitive first replies, qualification and reminders, then hands warm leads to your team for the important conversations and the final close.' },
      { q: 'Can I take over the conversation anytime?', a: 'Yes. You can pause the AI on any conversation with one click and reply yourself from the GOS Inbox. The AI resumes only when you allow it.' },
      { q: 'Can I use it on WhatsApp and Instagram?', a: 'Yes. GOS connects to WhatsApp, Instagram, Messenger, email and your website forms so every lead lands in a single inbox.' },
      { q: 'Do I need to change my existing tools?', a: 'No. GOS works alongside your current setup and can replace disconnected tools gradually, at your own pace.' },
      { q: 'Can I train it on my business information?', a: 'Absolutely. Upload your services, prices, FAQs and policies to the Knowledge Base and the AI will answer using your information and tone.' },
      { q: 'How long does it take to get started?', a: 'Most businesses are live within a few days. We analyze your lead flow, set up your channels and rules, then activate the AI with you.' },
      { q: 'Which languages does the AI support?', a: 'The AI replies fluently in Arabic and English, and can match the language your lead writes in automatically.' },
      { q: 'Is my customer data secure?', a: 'Yes. Your data is encrypted in transit and at rest, and access is controlled by roles and permissions inside your workspace.' },
      { q: 'What happens after the free consultation?', a: 'We share a clear plan for your business. If it’s a fit, we help you set up GOS step by step — with no obligation.' },
      { q: 'Can I see results in the dashboard?', a: 'Yes. Analytics shows replies, follow-ups, bookings and revenue so you always know what is working.' },
    ],
  },
  cta: {
    badge: 'Your Next Step',
    title: 'Start Building Your Business Today.',
    text: 'Get access to the complete GOS system and follow the proven process to turn more of your leads into paying customers.',
    primary: 'Book a Free Consultation',
    video: 'Watch a Quick Video',
    perks: ['Complete system', 'Step-by-step guidance', 'Real business results'],
  },
  video: {
    title: 'How GOS turns leads into booked calls',
    close: 'Close',
    play: 'Play',
    pause: 'Pause',
  },
  footer: {
    rights: '© 2026 GOS — Growth Operating System. All rights reserved.',
  },
};

export type LandingCopy = typeof en;

const arFollowUpView: PreviewView = {
  title: 'المتابعة بالذكاء الاصطناعي',
  subtitle: 'أدر عملاءك المحتملين والمتابعات والحجوزات.',
  stats: [
    { value: 124, label: 'عملاء نشطون' },
    { value: 602, label: 'متابعات مرسلة' },
    { value: 731, label: 'محادثات' },
  ],
  activity: [
    { text: 'عميل جديد من إنستغرام', time: 'منذ دقيقتين', tag: 'جديد', kind: 'capture' },
    { text: 'تم إرسال متابعة إلى سارة', time: 'منذ 8 د', tag: 'أُرسلت', kind: 'message' },
    { text: 'تم حجز مكالمة مع عمر', time: 'منذ 21 د', tag: 'محجوز', kind: 'booking' },
    { text: 'تحويل عميل محتمل إلى عميل', time: 'منذ ساعة', tag: 'تم', kind: 'payment' },
  ],
};

const arViews: typeof enViews = {
  copilot: {
    title: 'المساعد الذكي',
    subtitle: 'مساعدك الذكي للأعمال، جاهز على مدار الساعة.',
    stats: [
      { value: 48, label: 'مهام مؤتمتة' },
      { value: 312, label: 'أسئلة تمت الإجابة عليها' },
      { value: 19, label: 'رؤى اليوم' },
    ],
    activity: [
      { text: 'تمت صياغة متابعة لسارة', time: 'منذ 3 د', tag: 'مسودة', kind: 'message' },
      { text: 'تلخيص 12 عميلاً جديداً', time: 'منذ 15 د', tag: 'ملخص', kind: 'system' },
      { text: 'اقتراح أفضل وقت للاتصال بعمر', time: 'منذ 40 د', tag: 'نصيحة', kind: 'stage' },
      { text: 'تقرير النمو الأسبوعي جاهز', time: 'منذ 2 س', tag: 'تقرير', kind: 'note' },
    ],
  },
  inbox: {
    title: 'صندوق الوارد',
    subtitle: 'كل محادثاتك في مكان واحد.',
    stats: [
      { value: 58, label: 'محادثات مفتوحة' },
      { value: 214, label: 'ردود اليوم' },
      { value: 9, label: 'متوسط وقت الرد', suffix: 'ث' },
    ],
    activity: [
      { text: 'واتساب: لينا تسأل عن السعر', time: 'منذ 1 د', tag: 'جديد', kind: 'capture' },
      { text: 'رسالة إنستغرام من يوسف', time: 'منذ 6 د', tag: 'رسالة', kind: 'message' },
      { text: 'رد الذكاء الاصطناعي على هنا في ماسنجر', time: 'منذ 12 د', tag: 'ذكي', kind: 'system' },
      { text: 'إغلاق محادثة البريد مع عمر', time: 'منذ 1 س', tag: 'مغلقة', kind: 'stage' },
    ],
  },
  crm: {
    title: 'العملاء المحتملون',
    subtitle: 'تتبع المسار وجهات الاتصال والصفقات.',
    stats: [
      { value: 386, label: 'جهات الاتصال' },
      { value: 42, label: 'صفقات مفتوحة' },
      { value: 27, label: 'مؤهلون هذا الأسبوع' },
    ],
    activity: [
      { text: 'انتقلت سارة إلى مؤهل', time: 'منذ 5 د', tag: 'نُقل', kind: 'stage' },
      { text: 'جهة اتصال جديدة: أحمد صالح', time: 'منذ 18 د', tag: 'جديد', kind: 'capture' },
      { text: 'ربح صفقة مع Nova Studio', time: 'منذ 1 س', tag: 'تم', kind: 'payment' },
      { text: 'ملاحظة على ملف عمر', time: 'منذ 3 س', tag: 'ملاحظة', kind: 'note' },
    ],
  },
  booking: {
    title: 'الحجز والتقويم',
    subtitle: 'روابط الحجز والتقويم والمواعيد.',
    stats: [
      { value: 14, label: 'مكالمات اليوم' },
      { value: 63, label: 'حجوزات هذا الأسبوع' },
      { value: 92, label: 'نسبة الحضور', suffix: '%' },
    ],
    activity: [
      { text: 'حجز مكالمة مع عمر · 4:00 م', time: 'منذ 2 د', tag: 'محجوز', kind: 'booking' },
      { text: 'إرسال تذكير إلى لينا', time: 'منذ 25 د', tag: 'تذكير', kind: 'message' },
      { text: 'إعادة جدولة جلسة الاستراتيجية', time: 'منذ 1 س', tag: 'نُقل', kind: 'stage' },
      { text: 'اكتمال الاستشارة مع سارة', time: 'منذ 3 س', tag: 'مكتمل', kind: 'booking' },
    ],
  },
  products: {
    title: 'المنتجات والمدفوعات',
    subtitle: 'بيع المنتجات وتحصيل المدفوعات.',
    stats: [
      { value: 12, label: 'المنتجات' },
      { value: 86, label: 'الطلبات' },
      { value: 24680, label: 'الإيرادات (€)' },
    ],
    activity: [
      { text: 'استلام دفعة · 450€', time: 'منذ 4 د', tag: 'مدفوع', kind: 'payment' },
      { text: 'طلب جديد: برنامج النمو', time: 'منذ 20 د', tag: 'طلب', kind: 'capture' },
      { text: 'إرسال فاتورة إلى كريم', time: 'منذ 1 س', tag: 'أُرسلت', kind: 'message' },
      { text: 'استخدام كوبون SPRING20', time: 'منذ 2 س', tag: 'عرض', kind: 'note' },
    ],
  },
  analytics: {
    title: 'التحليلات',
    subtitle: 'تتبع الأداء والنمو.',
    stats: [
      { value: 38, label: 'معدل التحويل', suffix: '%' },
      { value: 1240, label: 'زوار اليوم' },
      { value: 172, label: 'مكالمات محجوزة' },
    ],
    activity: [
      { text: 'المكالمات المحجوزة ارتفعت 38% هذا الشهر', time: 'منذ 1 س', tag: 'نمو', kind: 'stage' },
      { text: 'إنستغرام هي قناتك الأفضل', time: 'منذ 3 س', tag: 'رؤية', kind: 'system' },
      { text: 'تحسن وقت الرد إلى 9 ثوانٍ', time: 'منذ 5 س', tag: 'سرعة', kind: 'message' },
      { text: 'تم إنشاء التقرير الأسبوعي', time: 'منذ 1 يوم', tag: 'تقرير', kind: 'note' },
    ],
  },
  settings: {
    title: 'الإعدادات',
    subtitle: 'مساحة العمل والفريق والتكاملات.',
    stats: [
      { value: 6, label: 'أعضاء الفريق' },
      { value: 5, label: 'قنوات متصلة' },
      { value: 3, label: 'أتمتة نشطة' },
    ],
    activity: [
      { text: 'تم ربط قناة واتساب', time: 'منذ 10 د', tag: 'متصل', kind: 'system' },
      { text: 'انضمت منى إلى فريقك', time: 'منذ 1 س', tag: 'فريق', kind: 'capture' },
      { text: 'تحديث ساعات العمل', time: 'منذ 4 س', tag: 'تحديث', kind: 'stage' },
      { text: 'مزامنة قاعدة المعرفة', time: 'منذ 1 يوم', tag: 'مزامنة', kind: 'note' },
    ],
  },
};

const ar: LandingCopy = {
  meta: {
    title: 'GOS — حوّل كل عميل محتمل إلى فرصة حقيقية مع المتابعة بالذكاء الاصطناعي',
    description: 'GOS يساعدك على الرد الفوري والمتابعة التلقائية وحجز المواعيد بالذكاء الاصطناعي — حتى لا يضيع أي عميل محتمل.',
  },
  nav: {
    links: [
      { id: 'how-it-works', label: 'كيف يعمل' },
      { id: 'features', label: 'المميزات' },
      { id: 'results', label: 'النتائج' },
      { id: 'pricing', label: 'الأسعار' },
      { id: 'faq', label: 'الأسئلة الشائعة' },
    ],
    login: 'تسجيل الدخول',
    book: 'احجز استشارة مجانية',
    langLabel: 'English',
    menu: 'القائمة',
    top: 'العودة إلى الأعلى',
  },
  hero: {
    badge: 'نظام متابعة متكامل',
    titleA: 'حوّل كل عميل محتمل إلى فرصة حقيقية',
    titleB: 'مع المتابعة بالذكاء الاصطناعي.',
    lead: 'GOS يساعدك على الرد بسرعة والمتابعة تلقائياً وحجز المواعيد — حتى لا يضيع أي عميل محتمل ويصل إلى عملك.',
    checks: [
      'ردود فورية ومتسقة',
      'أتمتة المتابعات والتذكيرات',
      'حجز المكالمات وإرسال الخطوات التالية',
      'تحويل المزيد من العملاء المحتملين إلى عملاء يدفعون',
    ],
    primary: 'احجز استشارة مجانية',
    video: 'شاهد فيديو سريع',
    note: 'مكالمة بدون أي التزام • سنفهم وضعك ونوضح لك كيف يمكن لـ GOS مساعدتك.',
    builtFor: 'مصمم لأنواع مختلفة من الأعمال:',
    businesses: ['المدربون والمستشارون', 'شركات الخدمات', 'الوكالات', 'المتاجر الإلكترونية', 'الأعمال المحلية', 'العيادات والرعاية الصحية', 'التعليم والدورات', 'العقارات'],
  },
  mock: {
    nav: ['المساعد الذكي', 'المتابعة الذكية', 'صندوق الوارد', 'العملاء المحتملون', 'الحجز والتقويم', 'المنتجات والمدفوعات', 'التحليلات', 'الإعدادات'],
    ...arFollowUpView,
    live: 'مباشر',
    activityTitle: 'النشاط الأخير',
    viewAll: 'عرض الكل',
    views: [arViews.copilot, arFollowUpView, arViews.inbox, arViews.crm, arViews.booking, arViews.products, arViews.analytics, arViews.settings],
    liveLabel: 'مساحة عملك',
    demoLabel: 'معاينة تجريبية',
    empty: 'لا يوجد نشاط حديث بعد — سيظهر العملاء الجدد هنا.',
    time: { now: 'الآن', min: 'منذ {n} د', hour: 'منذ {n} س', yesterday: 'أمس', day: 'منذ {n} يوم' },
    events: {
      capture: 'عميل جديد: {name}',
      message: 'تم إرسال متابعة إلى {name}',
      booking: 'تم حجز مكالمة مع {name}',
      payment: 'تم استلام دفعة من {name}',
      stage: 'انتقل {name} إلى مرحلة جديدة',
      note: 'تمت إضافة ملاحظة لـ {name}',
      system: 'تحديث تلقائي · {name}',
    },
    tags: { capture: 'جديد', message: 'أُرسلت', booking: 'محجوز', payment: 'تم', stage: 'نُقل', note: 'ملاحظة', system: 'تلقائي' },
    badgeA: { title: 'أتمتة المتابعات', text: 'وفّر وقتك ولا تفقد أي عميل' },
    badgeB: { title: 'حوّل المزيد من العملاء المحتملين', text: '+38% مكالمات محجوزة' },
  },
  problem: {
    floatCard: 'أين تفقد فرصك؟',
    badge: 'المشكلة',
    title: 'الكثير من الأنشطة تفقد فرص حقيقية وتخسر مبيعات بدون ما تدرك.',
    text: 'قد يكون لديك عملاء محتملون وزيارات واهتمام، لكنك ما زلت تخسر إيرادات بسبب الرد البطيء، أو غياب المتابعة، أو الحجوزات الضائعة، أو العمليات غير المنظمة، أو الأدوات المتفرقة.',
    cards: [
      { title: 'ردود بطيئة', text: 'يسأل العميل سؤالاً، لكن الرد يتأخر كثيراً فيفقد اهتمامه.' },
      { title: 'عدم المتابعة', text: 'إذا لم يرد العميل فوراً يتم نسيانه ولا يتم التواصل معه مرة أخرى.' },
      { title: 'إرسال السعر ثم صمت', text: 'ترسل السعر، لكن لا توجد خطوة تالية للحجز أو المكالمة.' },
      { title: 'طرق متابعة مختلفة', text: 'فريقك يتابع بطرق مختلفة بدون عملية واضحة وموحدة.' },
      { title: 'عملاء في أماكن متعددة', text: 'بعضهم في واتساب، وبعضهم في إنستغرام، وبعضهم في جدول — بدون رؤية موحدة.' },
    ],
    alert: 'المشكلة ليست دائماً في قلة العملاء المحتملين، بل في ما يحدث بعد وصولهم.',
  },
  solution: {
    badge: 'نظام المتابعة بالذكاء الاصطناعي',
    titleA: 'لنُضيف أداة أخرى إلى عملك.',
    titleB: 'لنُغلق نقاط التسريب.',
    text: 'بدلاً من عملية متفرقة، نجمع الذكاء الاصطناعي والأتمتة والتدخل البشري داخل نظام واحد بسيط لتصبح متابعتك ثابتة وسريعة وفعّالة.',
    quoteA: 'المتابعة بالذكاء الاصطناعي لا تحل محل فريقك.',
    quoteB: 'بل تضمن',
    quoteBold: 'عدم ضياع أي فرصة بين هذه الخطوات.',
    engine: { title: 'GOS', sub: 'نظام المتابعة' },
    nodes: {
      ai: { title: 'المتابعة الذكية', text: 'يفهم ويرد ويؤهل العملاء' },
      team: { title: 'فريقك البشري', text: 'يتدخل في الحالات المهمة والقرارات النهائية' },
      automation: { title: 'الأتمتة', text: 'تتابع وتنقل العملاء وتطلق الخطوات التالية' },
    },
    steps: [
      { label: 'الاكتشاف', detail: 'يتم التقاط كل عميل جديد من واتساب وإنستغرام والنماذج وموقعك.' },
      { label: 'التفاعل', detail: 'يرد الذكاء الاصطناعي فوراً وبأسلوبك في أي وقت.' },
      { label: 'المتابعة', detail: 'تذكيرات ذكية تُبقي المحادثة حيّة حتى يتخذ العميل قراره.' },
      { label: 'الحجز', detail: 'العملاء المؤهلون يختارون موعداً مباشرة في تقويمك.' },
      { label: 'التحويل', detail: 'فريقك يُغلق صفقات مع عملاء جاهزين للشراء.' },
    ],
  },
  demo: {
    badge: 'عرض مباشر للمتابعة الذكية',
    title: 'شاهد كيف يتعامل الذكاء الاصطناعي مع محادثة حقيقية.',
    text: 'هذا مثال على محادثة حقيقية مع عميل محتمل. يجيب الذكاء الاصطناعي على الأسئلة، ويؤهل العميل، ويحجز مكالمة.',
    stages: [
      { title: 'عميل جديد', text: 'من إنستغرام' },
      { title: 'التأهيل', text: 'طرح الأسئلة الصحيحة' },
      { title: 'شرح الخيارات', text: 'مشاركة الباقة الأنسب' },
      { title: 'حجز مكالمة', text: 'اقتراح وقت مناسب' },
    ],
    chatName: 'عميل محتمل',
    chatStatus: 'متصل الآن',
    messages: [
      { from: 'lead', text: 'مرحباً، أنا مهتم ببرنامج التدريب. ممكن تخبرني عن السعر؟' },
      { from: 'ai', text: 'أهلاً بك! سعيد بتواصلك 😊 يسعدني مساعدتك. قبل أن أرشح لك الخيار الأنسب، ما هو هدفك الرئيسي حالياً؟' },
      { from: 'lead', text: 'أريد الحصول على عملاء أكثر لعملي.' },
      { from: 'ai', text: 'رائع! لدينا برنامج مصمم لذلك تماماً. أقترح حجز مكالمة استشارية مجانية لنرشح لك الخطة الأنسب.' },
    ],
    bookCta: 'احجز مكالمة مجانية',
    booked: 'تم حجز المكالمة · الثلاثاء 4:00 م',
    typing: 'الذكاء الاصطناعي يكتب…',
    replay: 'إعادة',
    canTitle: 'الذكاء الاصطناعي يستطيع:',
    can: [
      'الإجابة على الأسئلة الشائعة',
      'فهم نشاط العميل',
      'تأهيل العملاء تلقائياً',
      'حجز المواعيد',
      'المتابعة قبل وبعد المكالمات',
      'إعادة تنشيط العملاء القدامى',
      'إرسال ودعم العملاء',
    ],
  },
  compare: {
    badge: 'قبل وبعد',
    title: 'من فرص مفقودة إلى مبيعات حقيقية.',
    text: 'نفس العملاء المحتملين. نتيجة مختلفة تماماً.',
    beforeTitle: 'قبل استخدام GOS',
    afterTitle: 'بعد استخدام GOS',
    before: ['ردود بطيئة وغير منتظمة', 'نسيان العملاء المحتملين', 'لا توجد عملية متابعة واضحة', 'أسعار تُرسل ثم تضيع', 'خسارة عملاء محتملين'],
    after: ['ردود فورية ومتسقة', 'متابعة وتذكيرات تلقائية', 'عملاء محتملون مؤهلون أكثر', 'مكالمات محجوزة أكثر', 'تحويل المزيد إلى عملاء يدفعون'],
  },
  how: {
    badge: 'كيف يعمل',
    title: 'من العميل المحتمل إلى الحجز في 4 خطوات بسيطة.',
    text: 'عملية واضحة وبسيطة تضمن عدم ضياع أي فرصة ووصول كل عميل إلى الخطوة التالية المناسبة.',
    stepLabel: 'الخطوة',
    steps: [
      { title: 'التحليل', text: 'فهم وضعك الحالي وتدفق العملاء' },
      { title: 'الإعداد', text: 'ربط قنواتك وضبط قواعد المتابعة' },
      { title: 'التفعيل', text: 'يبدأ الذكاء الاصطناعي بالرد والمتابعة' },
      { title: 'تحقيق النتائج', text: 'حجوزات أكثر وعملاء يدفعون' },
    ],
  },
  tools: {
    badge: 'كل شيء في مكان واحد',
    title: 'كل ما تحتاجه لإدارة عملائك وتنمية مبيعاتك.',
    text: 'GOS يمنحك كل الأدوات الأساسية لالتقاط العملاء ومتابعتهم وتحويلهم — في نظام واحد.',
    items: [
      { title: 'المساعد الذكي', text: 'مساعدك الذكي للأعمال' },
      { title: 'المتابعة الذكية', text: 'رد وتأهيل ومتابعة وحجز' },
      { title: 'صندوق الوارد', text: 'كل محادثاتك في مكان واحد' },
      { title: 'إدارة العملاء', text: 'تتبع المسار وجهات الاتصال والصفقات' },
      { title: 'الحجز والتقويم', text: 'روابط الحجز والتقويم والمواعيد' },
      { title: 'المنتجات والمدفوعات', text: 'بيع المنتجات وتحصيل المدفوعات' },
      { title: 'التحليلات', text: 'تتبع الأداء والنمو' },
    ],
  },
  testimonials: {
    badge: 'نتائج حقيقية',
    title: 'من طلاب إلى أصحاب أعمال حقيقيين.',
    text: 'شاهد كيف يبني طلابنا أعمالاً حقيقية ويحصلون على عملاء ويحققون إيرادات متكررة مع GOS.',
    items: [
      { quote: '“ساعدني GOS في الانتقال من فكرة إلى عملاء حقيقيين خلال شهرين فقط. الخطوات الواضحة جعلت كل شيء سهلاً.”', name: 'أحمد ت.', role: 'مدرب' },
      { quote: '“كنت أتابع يدوياً. الآن نظام المتابعة والحجز بالذكاء الاصطناعي يعمل تلقائياً ويجلب لي عملاء باستمرار.”', name: 'سارة م.', role: 'مستشارة' },
      { quote: '“كل ما أحتاجه في مكان واحد: الصفحات، إدارة العملاء، المدفوعات والذكاء الاصطناعي. إنه نظام أعمال متكامل.”', name: 'كريم أ.', role: 'صاحب وكالة' },
    ],
  },
  faq: {
    badge: 'الأسئلة الشائعة',
    title: 'أكثر الأسئلة شيوعاً.',
    text: 'إجابات سريعة على أكثر الأسئلة شيوعاً حول GOS ونظام المتابعة بالذكاء الاصطناعي.',
    viewAll: 'عرض كل الأسئلة',
    showLess: 'عرض أسئلة أقل',
    items: [
      { q: 'هل يحل الذكاء الاصطناعي محل فريقي؟', a: 'لا. يتولى الذكاء الاصطناعي الردود الأولى المتكررة والتأهيل والتذكيرات، ثم يسلّم العملاء الجاهزين لفريقك للمحادثات المهمة والإغلاق النهائي.' },
      { q: 'هل يمكنني التدخل في المحادثة في أي وقت؟', a: 'نعم. يمكنك إيقاف الذكاء الاصطناعي في أي محادثة بنقرة واحدة والرد بنفسك من صندوق الوارد، ولا يستأنف إلا بإذنك.' },
      { q: 'هل يمكنني استخدامه على واتساب وإنستغرام؟', a: 'نعم. يتصل GOS بواتساب وإنستغرام وماسنجر والبريد ونماذج موقعك ليصل كل عميل إلى صندوق وارد واحد.' },
      { q: 'هل أحتاج إلى تغيير أدواتي الحالية؟', a: 'لا. يعمل GOS جنباً إلى جنب مع أدواتك الحالية ويمكنه استبدال الأدوات المتفرقة تدريجياً وبالسرعة التي تناسبك.' },
      { q: 'هل يمكنني تدريبه على معلومات عملي؟', a: 'بالتأكيد. ارفع خدماتك وأسعارك وأسئلتك الشائعة وسياساتك إلى قاعدة المعرفة وسيجيب الذكاء الاصطناعي بمعلوماتك وأسلوبك.' },
      { q: 'كم يستغرق البدء؟', a: 'معظم الأنشطة تبدأ خلال أيام قليلة. نحلل تدفق عملائك، ونربط قنواتك وقواعدك، ثم نفعّل الذكاء الاصطناعي معك.' },
      { q: 'ما اللغات التي يدعمها الذكاء الاصطناعي؟', a: 'يرد الذكاء الاصطناعي بطلاقة بالعربية والإنجليزية، ويطابق لغة العميل تلقائياً.' },
      { q: 'هل بيانات عملائي آمنة؟', a: 'نعم. بياناتك مشفرة أثناء النقل والتخزين، والوصول إليها محكوم بالأدوار والصلاحيات داخل مساحة عملك.' },
      { q: 'ماذا يحدث بعد الاستشارة المجانية؟', a: 'نشاركك خطة واضحة لعملك. وإذا كان مناسباً، نساعدك في إعداد GOS خطوة بخطوة — بدون أي التزام.' },
      { q: 'هل يمكنني رؤية النتائج في لوحة التحكم؟', a: 'نعم. تعرض التحليلات الردود والمتابعات والحجوزات والإيرادات لتعرف دائماً ما الذي ينجح.' },
    ],
  },
  cta: {
    badge: 'خطوتك التالية',
    title: 'ابدأ في بناء عملك اليوم.',
    text: 'احصل على نظام GOS المتكامل واتبع العملية المجربة لتحويل المزيد من عملائك المحتملين إلى عملاء يدفعون.',
    primary: 'احجز استشارة مجانية الآن',
    video: 'شاهد فيديو سريع',
    perks: ['نظام متكامل', 'إرشاد خطوة بخطوة', 'نتائج أعمال حقيقية'],
  },
  video: {
    title: 'كيف يحوّل GOS العملاء المحتملين إلى مكالمات محجوزة',
    close: 'إغلاق',
    play: 'تشغيل',
    pause: 'إيقاف مؤقت',
  },
  footer: {
    rights: '© 2026 GOS — نظام تشغيل النمو. جميع الحقوق محفوظة.',
  },
};

export const landingContent: Record<'en' | 'ar', LandingCopy> = { en, ar };
