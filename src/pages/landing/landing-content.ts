/* Bilingual copy for the public Upklick landing page.
   The Arabic object is typed against the English one so both stay in sync. */

/* ---------- Hero preview tab views ----------
   Each sidebar tab of the hero mockup renders one of these views in place (no routing).
   `kind` picks the activity icon/colour in LandingPage.tsx. */
export type PreviewKind =
  | "capture"
  | "message"
  | "booking"
  | "payment"
  | "stage"
  | "note"
  | "system";
export type PreviewView = {
  title: string;
  subtitle: string;
  stats: { value: number; label: string; suffix?: string }[];
  activity: { text: string; time: string; tag: string; kind: PreviewKind }[];
};

const enFollowUpView: PreviewView = {
  title: "AI Follow-Up",
  subtitle: "Manage your leads, follow-ups and bookings.",
  stats: [
    { value: 124, label: "Active leads" },
    { value: 602, label: "Follow-ups sent" },
    { value: 731, label: "Conversations" },
  ],
  activity: [
    {
      text: "New lead from Instagram",
      time: "2m ago",
      tag: "New",
      kind: "capture",
    },
    {
      text: "Follow-up sent to Sarah",
      time: "8m ago",
      tag: "Sent",
      kind: "message",
    },
    {
      text: "Call booked with Omar",
      time: "21m ago",
      tag: "Booked",
      kind: "booking",
    },
    {
      text: "Lead converted to client",
      time: "1h ago",
      tag: "Won",
      kind: "payment",
    },
  ],
};

const enViews: Record<
  | "copilot"
  | "inbox"
  | "crm"
  | "booking"
  | "products"
  | "analytics"
  | "settings",
  PreviewView
> = {
  copilot: {
    title: "AI Copilot",
    subtitle: "Your AI business assistant, ready 24/7.",
    stats: [
      { value: 48, label: "Tasks automated" },
      { value: 312, label: "Questions answered" },
      { value: 19, label: "Insights today" },
    ],
    activity: [
      {
        text: "Drafted a follow-up for Sarah",
        time: "3m ago",
        tag: "Draft",
        kind: "message",
      },
      {
        text: "Summarized 12 new leads",
        time: "15m ago",
        tag: "Summary",
        kind: "system",
      },
      {
        text: "Suggested best time to call Omar",
        time: "40m ago",
        tag: "Tip",
        kind: "stage",
      },
      {
        text: "Weekly growth report is ready",
        time: "2h ago",
        tag: "Report",
        kind: "note",
      },
    ],
  },
  inbox: {
    title: "Inbox",
    subtitle: "All your conversations in one place.",
    stats: [
      { value: 58, label: "Open chats" },
      { value: 214, label: "Replied today" },
      { value: 9, label: "Avg. reply time", suffix: "s" },
    ],
    activity: [
      {
        text: "WhatsApp: Lina asked about pricing",
        time: "1m ago",
        tag: "New",
        kind: "capture",
      },
      {
        text: "Instagram DM from Youssef",
        time: "6m ago",
        tag: "DM",
        kind: "message",
      },
      {
        text: "AI replied to Hana on Messenger",
        time: "12m ago",
        tag: "AI",
        kind: "system",
      },
      {
        text: "Email thread closed with Omar",
        time: "1h ago",
        tag: "Closed",
        kind: "stage",
      },
    ],
  },
  crm: {
    title: "CRM & Leads",
    subtitle: "Track pipeline, contacts and deals.",
    stats: [
      { value: 386, label: "Contacts" },
      { value: 42, label: "Open deals" },
      { value: 27, label: "Qualified this week" },
    ],
    activity: [
      {
        text: "Sarah moved to Qualified",
        time: "5m ago",
        tag: "Moved",
        kind: "stage",
      },
      {
        text: "New contact: Ahmed Saleh",
        time: "18m ago",
        tag: "New",
        kind: "capture",
      },
      {
        text: "Deal won with Nova Studio",
        time: "1h ago",
        tag: "Won",
        kind: "payment",
      },
      {
        text: "Note added to Omar’s profile",
        time: "3h ago",
        tag: "Note",
        kind: "note",
      },
    ],
  },
  booking: {
    title: "Booking & Calendar",
    subtitle: "Booking links, calendar and appointments.",
    stats: [
      { value: 14, label: "Calls today" },
      { value: 63, label: "Booked this week" },
      { value: 92, label: "Show-up rate", suffix: "%" },
    ],
    activity: [
      {
        text: "Call booked with Omar · 4:00 PM",
        time: "2m ago",
        tag: "Booked",
        kind: "booking",
      },
      {
        text: "Reminder sent to Lina",
        time: "25m ago",
        tag: "Reminder",
        kind: "message",
      },
      {
        text: "Strategy session rescheduled",
        time: "1h ago",
        tag: "Moved",
        kind: "stage",
      },
      {
        text: "Consultation completed with Sara",
        time: "3h ago",
        tag: "Done",
        kind: "booking",
      },
    ],
  },
  products: {
    title: "Products & Payments",
    subtitle: "Sell products and collect payments.",
    stats: [
      { value: 12, label: "Products" },
      { value: 86, label: "Orders" },
      { value: 24680, label: "Revenue (€)" },
    ],
    activity: [
      {
        text: "Payment received · €450",
        time: "4m ago",
        tag: "Paid",
        kind: "payment",
      },
      {
        text: "New order: Growth Program",
        time: "20m ago",
        tag: "Order",
        kind: "capture",
      },
      {
        text: "Invoice sent to Karim",
        time: "1h ago",
        tag: "Sent",
        kind: "message",
      },
      {
        text: "Coupon SPRING20 redeemed",
        time: "2h ago",
        tag: "Promo",
        kind: "note",
      },
    ],
  },
  analytics: {
    title: "Analytics",
    subtitle: "Track performance and growth.",
    stats: [
      { value: 38, label: "Conversion rate", suffix: "%" },
      { value: 1240, label: "Visitors today" },
      { value: 172, label: "Booked calls" },
    ],
    activity: [
      {
        text: "Booked calls up 38% this month",
        time: "1h ago",
        tag: "Growth",
        kind: "stage",
      },
      {
        text: "Instagram is your top channel",
        time: "3h ago",
        tag: "Insight",
        kind: "system",
      },
      {
        text: "Reply time improved to 9s",
        time: "5h ago",
        tag: "Speed",
        kind: "message",
      },
      {
        text: "Weekly report generated",
        time: "1d ago",
        tag: "Report",
        kind: "note",
      },
    ],
  },
  settings: {
    title: "Settings",
    subtitle: "Workspace, team and integrations.",
    stats: [
      { value: 6, label: "Team members" },
      { value: 5, label: "Connected channels" },
      { value: 3, label: "Active automations" },
    ],
    activity: [
      {
        text: "WhatsApp channel connected",
        time: "10m ago",
        tag: "Connected",
        kind: "system",
      },
      {
        text: "Mona joined your team",
        time: "1h ago",
        tag: "Team",
        kind: "capture",
      },
      {
        text: "Business hours updated",
        time: "4h ago",
        tag: "Updated",
        kind: "stage",
      },
      {
        text: "Knowledge base synced",
        time: "1d ago",
        tag: "Synced",
        kind: "note",
      },
    ],
  },
};

const en = {
  meta: {
    title:
      "Upklick — Turn Every Lead Into a Real Opportunity with AI Follow-Up",
    description:
      "Upklick helps you respond instantly, follow up automatically and book appointments with AI — so no lead is ever lost.",
  },
  nav: {
    links: [
      { id: "compare", label: "Compare" },
      { id: "features", label: "Features" },
      { id: "results", label: "Results" },
      { id: "pricing", label: "Pricing" },
      { id: "faq", label: "FAQ" },
    ],
    login: "Log in",
    book: "Start Now",
    langLabel: "Arabic",
    menu: "Menu",
    top: "Back to top",
  },
  hero: {
    badge: "Complete Follow-Up System",
    titleA: "Turn Every Lead Into Revenue —",
    titleB: "& Own the AI Platform Under Your Brand.",
    lead: "Upklick responds instantly, follows up automatically, and books appointments with AI — while letting you launch all 12 business tools as your own 100% White-Label software company.",
    checks: [
      "Instant 24/7 AI responses, smart follow-ups & calendar booking",
      "100% your brand — custom domain, SSL & mobile app in your name",
      "Ready tech provider: Meta, AI, email & domains pre-connected",
      "12 integrated business tools to scale your revenue & client base",
    ],
    primary: "Start Now",
    video: "Watch a Quick Video",
    note: "Free Admin trial included • Launch your workspace or White-Label brand in minutes.",
    builtFor: "Built for different types of businesses:",
    businesses: [
      "Coaches & Consultants",
      "Service Businesses",
      "Agencies",
      "E-commerce Stores",
      "Local Businesses",
      "Clinics & Healthcare",
      "Education & Courses",
      "Real Estate",
    ],
  },
  mock: {
    nav: [
      "AI Copilot",
      "AI Follow-Up",
      "Inbox",
      "CRM & Leads",
      "Booking & Calendar",
      "Products & Payments",
      "Analytics",
      "Settings",
    ],
    ...enFollowUpView,
    live: "Live",
    activityTitle: "Recent Activity",
    viewAll: "View all",
    views: [
      enViews.copilot,
      enFollowUpView,
      enViews.inbox,
      enViews.crm,
      enViews.booking,
      enViews.products,
      enViews.analytics,
      enViews.settings,
    ],
    liveLabel: "Your workspace",
    demoLabel: "Demo preview",
    empty: "No recent activity yet — new leads will appear here.",
    time: {
      now: "Just now",
      min: "{n}m ago",
      hour: "{n}h ago",
      yesterday: "Yesterday",
      day: "{n}d ago",
    },
    events: {
      capture: "New lead: {name}",
      message: "Follow-up sent to {name}",
      booking: "Call booked with {name}",
      payment: "Payment received from {name}",
      stage: "{name} moved to a new stage",
      note: "Note added for {name}",
      system: "Automation update · {name}",
    },
    tags: {
      capture: "New",
      message: "Sent",
      booking: "Booked",
      payment: "Won",
      stage: "Moved",
      note: "Note",
      system: "Auto",
    },
    badgeA: {
      title: "Automate follow-ups",
      text: "Save time and never miss a lead",
    },
    badgeB: {
      title: "Turn more leads into clients",
      text: "+38% booked calls",
    },
  },
  problem: {
    floatCard: "Where are you losing opportunities?",
    badge: "The Problem",
    title: "Many Businesses Lose Real Revenue Without Realizing It.",
    text: "You might already have leads, traffic and interest, but you still lose revenue because of slow responses, no follow-up, missed bookings, inconsistent processes or disconnected tools.",
    cards: [
      {
        title: "Slow Response",
        text: "The lead asks a question, but the reply comes too late — and their interest fades.",
      },
      {
        title: "No Follow-Up",
        text: "If the lead doesn’t reply right away, they’re forgotten and never contacted again.",
      },
      {
        title: "Price Sent, Then Silence",
        text: "You send the price, but there is no next step for booking or a call.",
      },
      {
        title: "Different Follow-Up Styles",
        text: "Your team responds in different ways, with no consistent process.",
      },
      {
        title: "Leads in Different Places",
        text: "Some leads are in WhatsApp, some in Instagram, some in a spreadsheet — with no single view.",
      },
    ],
    alert:
      "The problem is not always a lack of leads. Often the real problem is what happens after they arrive.",
  },
  solution: {
    badge: "The AI Follow-Up System",
    titleA: "Not Just Another Disconnected Tool.",
    titleB: "Close Your Revenue Leaks Automatically.",
    text: "Instead of a disconnected process, we combine AI, automation and human handoff inside one simple system to make your follow-up consistent, fast and effective.",
    quoteA: "AI follow-up doesn’t replace your team.",
    quoteB: "It makes sure",
    quoteBold: "no opportunity is lost between these steps.",
    engine: { title: "Upklick", sub: "Follow-Up System" },
    nodes: {
      ai: { title: "AI Follow-Up", text: "Understands, replies and qualifies" },
      team: {
        title: "Your Team",
        text: "Steps in for important cases and final decisions",
      },
      automation: {
        title: "Automation",
        text: "Follows up, moves leads and triggers next steps",
      },
    },
    steps: [
      {
        label: "Identify",
        detail:
          "Every new lead is captured from WhatsApp, Instagram, forms and your website.",
      },
      {
        label: "Engage",
        detail: "The AI replies instantly, in your tone, any time of day.",
      },
      {
        label: "Follow Up",
        detail:
          "Smart reminders keep the conversation alive until the lead decides.",
      },
      {
        label: "Book",
        detail: "Qualified leads pick a time directly in your calendar.",
      },
      {
        label: "Convert",
        detail: "Your team closes warm, ready-to-buy clients.",
      },
    ],
  },
  demo: {
    badge: "Live AI Follow-Up Demo",
    title: "See How the AI Handles a Real Conversation.",
    text: "This is an example of a real conversation with a potential client. The AI answers questions, qualifies the lead, and books a call.",
    stages: [
      { title: "New Lead", text: "From Instagram" },
      { title: "Qualifying", text: "Asking the right questions" },
      { title: "Explain Options", text: "Share the best package" },
      { title: "Book a Call", text: "Suggest a suitable time" },
    ],
    chatName: "Potential Client",
    chatStatus: "Online",
    messages: [
      {
        from: "lead",
        text: "Hi, I’m interested in your coaching program. Can you tell me about the price?",
      },
      {
        from: "ai",
        text: "Hi! Great to hear from you 😊 I’d love to help. Before I recommend the best option, can I ask what your main goal is right now?",
      },
      { from: "lead", text: "I want to get more clients for my business." },
      {
        from: "ai",
        text: "Great! We have a program built exactly for that. I’d suggest booking a free consultation call so we can recommend the best plan for you.",
      },
    ],
    bookCta: "Book a Free Call",
    booked: "Call booked · Tue 4:00 PM",
    typing: "AI is typing…",
    replay: "Replay",
    canTitle: "The AI can:",
    can: [
      "Answer common questions",
      "Understand the customer’s business",
      "Qualify leads automatically",
      "Book appointments",
      "Follow up before and after calls",
      "Reactivate old leads",
      "Send and support customers",
    ],
  },
  compare: {
    badge: "Before vs After",
    title: "From Lost Opportunities to Real Revenue.",
    text: "Same leads. A completely different result.",
    beforeTitle: "Before Upklick",
    afterTitle: "After Upklick",
    before: [
      "Slow and inconsistent responses",
      "Leads get forgotten",
      "No clear follow-up process",
      "Prices sent and lost",
      "Lost potential clients",
    ],
    after: [
      "Instant and consistent responses",
      "Automatic follow-up and reminders",
      "More qualified leads",
      "More booked calls",
      "Turn more leads into paying clients",
    ],
  },
  how: {
    badge: "How It Works",
    title: "From Lead to Booking in 4 Simple Steps.",
    text: "A simple and clear process to make sure no opportunity is lost and every lead reaches the right next step.",
    stepLabel: "Step",
    steps: [
      {
        title: "Analyze",
        text: "Understand your current situation and lead flow",
      },
      {
        title: "Set Up",
        text: "Connect your channels and set follow-up rules",
      },
      { title: "Activate", text: "AI starts responding and following up" },
      { title: "Get Results", text: "More bookings and paying clients" },
    ],
  },
  tools: {
    badge: "Everything in One Place",
    title: "All the Tools You Need to Manage and Grow Your Business.",
    text: "Upklick gives you all the essential tools to capture, follow up and convert leads — in one system.",
    items: [
      { title: "AI Copilot", text: "Your AI business assistant" },
      { title: "AI Follow-Up", text: "Respond, qualify, follow up and book" },
      { title: "Inbox", text: "All your conversations in one place" },
      { title: "CRM & Leads", text: "Track pipeline, contacts and deals" },
      {
        title: "Booking & Calendar",
        text: "Booking links, calendar and appointments",
      },
      {
        title: "Products & Payments",
        text: "Sell products and collect payments",
      },
      { title: "Analytics", text: "Track performance and growth" },
    ],
  },
  testimonials: {
    badge: "Real Results",
    title: "From Students to Business Owners.",
    text: "See how our students are building real businesses, getting customers and creating recurring revenue with Upklick.",
    items: [
      {
        quote:
          "“Upklick helped me go from an idea to real customers in just two months. The step-by-step process made everything clear.”",
        name: "Ahmed T.",
        role: "Coach",
      },
      {
        quote:
          "“I used to follow up manually. Now my AI follow-up and booking system work automatically and bring me consistent customers.”",
        name: "Sara M.",
        role: "Consultant",
      },
      {
        quote:
          "“Everything I need is in one place: funnels, CRM, payments and AI. It’s a complete business system.”",
        name: "Karim A.",
        role: "Agency Owner",
      },
    ],
  },
  faq: {
    badge: "FAQ",
    title: "Frequently Asked Questions.",
    text: "Quick answers to the most common questions about Upklick and the AI Follow-Up system.",
    viewAll: "View All Questions",
    showLess: "Show Fewer Questions",
    items: [
      {
        q: "Does the AI replace my team?",
        a: "No. The AI handles the repetitive first replies, qualification and reminders, then hands warm leads to your team for the important conversations and the final close.",
      },
      {
        q: "Can I take over the conversation anytime?",
        a: "Yes. You can pause the AI on any conversation with one click and reply yourself from the Upklick Inbox. The AI resumes only when you allow it.",
      },
      {
        q: "Can I use it on WhatsApp and Instagram?",
        a: "Yes. Upklick connects to WhatsApp, Instagram, Messenger, email and your website forms so every lead lands in a single inbox.",
      },
      {
        q: "Do I need to change my existing tools?",
        a: "No. Upklick works alongside your current setup and can replace disconnected tools gradually, at your own pace.",
      },
      {
        q: "Can I train it on my business information?",
        a: "Absolutely. Upload your services, prices, FAQs and policies to the Knowledge Base and the AI will answer using your information and tone.",
      },
      {
        q: "How long does it take to get started?",
        a: "Most businesses are live within a few days. We analyze your lead flow, set up your channels and rules, then activate the AI with you.",
      },
      {
        q: "Which languages does the AI support?",
        a: "The AI replies fluently in Arabic and English, and can match the language your lead writes in automatically.",
      },
      {
        q: "Is my customer data secure?",
        a: "Yes. Your data is encrypted in transit and at rest, and access is controlled by roles and permissions inside your workspace.",
      },
      {
        q: "How does the Free Trial Admin account work?",
        a: "Click Start Now to create your Admin account with an instant Free Trial — unlock all 12 tools, White-Label brand settings, and starter AI credits with no upfront commitment.",
      },
      {
        q: "Can I see results in the dashboard?",
        a: "Yes. Analytics shows replies, follow-ups, bookings and revenue so you always know what is working.",
      },
    ],
  },
  cta: {
    badge: "Your Next Step",
    title: "Start Building Your Business Today.",
    text: "Get access to the complete Upklick system and follow the proven process to turn more of your leads into paying customers.",
    primary: "Start Now",
    video: "Watch a Quick Video",
    perks: [
      "Complete system",
      "Step-by-step guidance",
      "Real business results",
    ],
  },
  video: {
    title: "How Upklick turns leads into booked calls",
    close: "Close",
    play: "Play",
    pause: "Pause",
  },
  footer: {
    rights: "© 2026 Upklick — Upklick. All rights reserved.",
  },
};

export type LandingCopy = typeof en;

const arFollowUpView: PreviewView = {
  title: "المتابعة بالذكاء الاصطناعي",
  subtitle: "أدر عملاءك المحتملين والمتابعات والحجوزات.",
  stats: [
    { value: 124, label: "عملاء نشطون" },
    { value: 602, label: "متابعات مرسلة" },
    { value: 731, label: "محادثات" },
  ],
  activity: [
    {
      text: "عميل جديد من إنستغرام",
      time: "منذ دقيقتين",
      tag: "جديد",
      kind: "capture",
    },
    {
      text: "تم إرسال متابعة إلى سارة",
      time: "منذ 8 د",
      tag: "أُرسلت",
      kind: "message",
    },
    {
      text: "تم حجز مكالمة مع عمر",
      time: "منذ 21 د",
      tag: "محجوز",
      kind: "booking",
    },
    {
      text: "تحويل عميل محتمل إلى عميل",
      time: "منذ ساعة",
      tag: "تم",
      kind: "payment",
    },
  ],
};

const arViews: typeof enViews = {
  copilot: {
    title: "AI Agent",
    subtitle: "مساعدك الذكي للأعمال، جاهز على مدار الساعة.",
    stats: [
      { value: 48, label: "مهام مؤتمتة" },
      { value: 312, label: "أسئلة تمت الإجابة عليها" },
      { value: 19, label: "رؤى اليوم" },
    ],
    activity: [
      {
        text: "تمت صياغة متابعة لسارة",
        time: "منذ 3 د",
        tag: "مسودة",
        kind: "message",
      },
      {
        text: "تلخيص 12 عميلاً جديداً",
        time: "منذ 15 د",
        tag: "ملخص",
        kind: "system",
      },
      {
        text: "اقتراح أفضل وقت للاتصال بعمر",
        time: "منذ 40 د",
        tag: "نصيحة",
        kind: "stage",
      },
      {
        text: "تقرير النمو الأسبوعي جاهز",
        time: "منذ 2 س",
        tag: "تقرير",
        kind: "note",
      },
    ],
  },
  inbox: {
    title: "صندوق الوارد",
    subtitle: "كل محادثاتك في مكان واحد.",
    stats: [
      { value: 58, label: "محادثات مفتوحة" },
      { value: 214, label: "ردود اليوم" },
      { value: 9, label: "متوسط وقت الرد", suffix: "ث" },
    ],
    activity: [
      {
        text: "واتساب: لينا تسأل عن السعر",
        time: "منذ 1 د",
        tag: "جديد",
        kind: "capture",
      },
      {
        text: "رسالة إنستغرام من يوسف",
        time: "منذ 6 د",
        tag: "رسالة",
        kind: "message",
      },
      {
        text: "رد الذكاء الاصطناعي على هنا في ماسنجر",
        time: "منذ 12 د",
        tag: "ذكي",
        kind: "system",
      },
      {
        text: "إغلاق محادثة البريد مع عمر",
        time: "منذ 1 س",
        tag: "مغلقة",
        kind: "stage",
      },
    ],
  },
  crm: {
    title: "العملاء المحتملون",
    subtitle: "تتبع المسار وجهات الاتصال والصفقات.",
    stats: [
      { value: 386, label: "جهات الاتصال" },
      { value: 42, label: "صفقات مفتوحة" },
      { value: 27, label: "مؤهلون هذا الأسبوع" },
    ],
    activity: [
      {
        text: "انتقلت سارة إلى مؤهل",
        time: "منذ 5 د",
        tag: "نُقل",
        kind: "stage",
      },
      {
        text: "جهة اتصال جديدة: أحمد صالح",
        time: "منذ 18 د",
        tag: "جديد",
        kind: "capture",
      },
      {
        text: "ربح صفقة مع Nova Studio",
        time: "منذ 1 س",
        tag: "تم",
        kind: "payment",
      },
      {
        text: "ملاحظة على ملف عمر",
        time: "منذ 3 س",
        tag: "ملاحظة",
        kind: "note",
      },
    ],
  },
  booking: {
    title: "الحجز والتقويم",
    subtitle: "روابط الحجز والتقويم والمواعيد.",
    stats: [
      { value: 14, label: "مكالمات اليوم" },
      { value: 63, label: "حجوزات هذا الأسبوع" },
      { value: 92, label: "نسبة الحضور", suffix: "%" },
    ],
    activity: [
      {
        text: "حجز مكالمة مع عمر · 4:00 م",
        time: "منذ 2 د",
        tag: "محجوز",
        kind: "booking",
      },
      {
        text: "إرسال تذكير إلى لينا",
        time: "منذ 25 د",
        tag: "تذكير",
        kind: "message",
      },
      {
        text: "إعادة جدولة جلسة الاستراتيجية",
        time: "منذ 1 س",
        tag: "نُقل",
        kind: "stage",
      },
      {
        text: "اكتمال الاستشارة مع سارة",
        time: "منذ 3 س",
        tag: "مكتمل",
        kind: "booking",
      },
    ],
  },
  products: {
    title: "المنتجات والمدفوعات",
    subtitle: "بيع المنتجات وتحصيل المدفوعات.",
    stats: [
      { value: 12, label: "المنتجات" },
      { value: 86, label: "الطلبات" },
      { value: 24680, label: "الإيرادات (€)" },
    ],
    activity: [
      {
        text: "استلام دفعة · 450€",
        time: "منذ 4 د",
        tag: "مدفوع",
        kind: "payment",
      },
      {
        text: "طلب جديد: برنامج النمو",
        time: "منذ 20 د",
        tag: "طلب",
        kind: "capture",
      },
      {
        text: "إرسال فاتورة إلى كريم",
        time: "منذ 1 س",
        tag: "أُرسلت",
        kind: "message",
      },
      {
        text: "استخدام كوبون SPRING20",
        time: "منذ 2 س",
        tag: "عرض",
        kind: "note",
      },
    ],
  },
  analytics: {
    title: "التحليلات",
    subtitle: "تتبع الأداء والنمو.",
    stats: [
      { value: 38, label: "معدل التحويل", suffix: "%" },
      { value: 1240, label: "زوار اليوم" },
      { value: 172, label: "مكالمات محجوزة" },
    ],
    activity: [
      {
        text: "المكالمات المحجوزة ارتفعت 38% هذا الشهر",
        time: "منذ 1 س",
        tag: "نمو",
        kind: "stage",
      },
      {
        text: "إنستغرام هي قناتك الأفضل",
        time: "منذ 3 س",
        tag: "رؤية",
        kind: "system",
      },
      {
        text: "تحسن وقت الرد إلى 9 ثوانٍ",
        time: "منذ 5 س",
        tag: "سرعة",
        kind: "message",
      },
      {
        text: "تم إنشاء التقرير الأسبوعي",
        time: "منذ 1 يوم",
        tag: "تقرير",
        kind: "note",
      },
    ],
  },
  settings: {
    title: "الإعدادات",
    subtitle: "مساحة العمل والفريق والتكاملات.",
    stats: [
      { value: 6, label: "أعضاء الفريق" },
      { value: 5, label: "قنوات متصلة" },
      { value: 3, label: "أتمتة نشطة" },
    ],
    activity: [
      {
        text: "تم ربط قناة واتساب",
        time: "منذ 10 د",
        tag: "متصل",
        kind: "system",
      },
      {
        text: "انضمت منى إلى فريقك",
        time: "منذ 1 س",
        tag: "فريق",
        kind: "capture",
      },
      {
        text: "تحديث ساعات العمل",
        time: "منذ 4 س",
        tag: "تحديث",
        kind: "stage",
      },
      {
        text: "مزامنة قاعدة المعرفة",
        time: "منذ 1 يوم",
        tag: "مزامنة",
        kind: "note",
      },
    ],
  },
};

const ar: LandingCopy = {
  meta: {
    title:
      "Upklick — حوّل كل عميل محتمل إلى فرصة حقيقية وامتلك منصتك البرمجية الخاصة",
    description:
      "يساعدك Upklick على الاستجابة الفورية والمتابعة التلقائية وحجز المواعيد بالذكاء الاصطناعي — مع إمكانية إطلاق المنصة بالكامل تحت علامتك التجارية.",
  },
  nav: {
    links: [
      { id: "compare", label: "المقارنة" },
      { id: "features", label: "المزايا" },
      { id: "results", label: "النتائج" },
      { id: "pricing", label: "الأسعار" },
      { id: "faq", label: "الأسئلة الشائعة" },
    ],
    login: "تسجيل الدخول",
    book: "ابدأ الآن",
    langLabel: "English",
    menu: "القائمة",
    top: "العودة إلى الأعلى",
  },
  hero: {
    badge: "نظام متابعة متكامل",
    titleA: "حوّل كل عميل محتمل إلى إيراد حقيقي —",
    titleB: "وامتلك منصة الذكاء الاصطناعي بعلامتك التجارية.",
    lead: "يتيح لك Upklick الاستجابة الفورية والمتابعة التلقائية وحجز المواعيد بالذكاء الاصطناعي — مع إمكانية إطلاق النظام المتكامل المكون من 12 أداة أعمال كشركة برمجيات خاصة بك بنسبة 100%.",
    checks: [
      "استجابة فورية على مدار الساعة ومتابعات ذكية وحجز مواعيد تلقائي",
      "علامتك التجارية 100% — نطاقك الخاص وتطبيق جوال باسم شركتك",
      "مزوّد تقني متكامل: قنوات Meta والذكاء الاصطناعي والبريد والنطاقات متصلة مسبقاً",
      "12 أداة أعمال متكاملة لتنمية مبيعاتك وبناء قاعدة عملائك الشهرية",
    ],
    primary: "ابدأ الآن",
    video: "شاهد جولة سريعة",
    note: "تجربة مجانية لحساب المدير متضمنة • أطلق مساحة عملك أو منصتك الخاصة خلال دقائق.",
    builtFor: "مصمم لمختلف القطاعات والأنشطة التجارية:",
    businesses: [
      "المدربون والمستشارون",
      "شركات الخدمات",
      "وكالات التسويق",
      "المتاجر الإلكترونية",
      "الأنشطة المحلية",
      "العيادات والرعاية الصحية",
      "التعليم والدورات",
      "القطاع العقاري",
    ],
  },
  mock: {
    nav: [
      "AI Agent",
      "المتابعة الذكية",
      "صندوق الوارد",
      "العملاء المحتملون",
      "الحجز والتقويم",
      "المنتجات والمدفوعات",
      "التحليلات",
      "الإعدادات",
    ],
    ...arFollowUpView,
    live: "مباشر",
    activityTitle: "النشاط الأخير",
    viewAll: "عرض الكل",
    views: [
      arViews.copilot,
      arFollowUpView,
      arViews.inbox,
      arViews.crm,
      arViews.booking,
      arViews.products,
      arViews.analytics,
      arViews.settings,
    ],
    liveLabel: "مساحة عملك",
    demoLabel: "معاينة تجريبية",
    empty: "لا يوجد نشاط حديث بعد — سيظهر العملاء الجدد هنا.",
    time: {
      now: "الآن",
      min: "منذ {n} د",
      hour: "منذ {n} س",
      yesterday: "أمس",
      day: "منذ {n} يوم",
    },
    events: {
      capture: "عميل جديد: {name}",
      message: "تم إرسال متابعة إلى {name}",
      booking: "تم حجز مكالمة مع {name}",
      payment: "تم استلام دفعة من {name}",
      stage: "انتقل {name} إلى مرحلة جديدة",
      note: "تمت إضافة ملاحظة لـ {name}",
      system: "تحديث تلقائي · {name}",
    },
    tags: {
      capture: "جديد",
      message: "أُرسلت",
      booking: "محجوز",
      payment: "تم",
      stage: "نُقل",
      note: "ملاحظة",
      system: "تلقائي",
    },
    badgeA: { title: "أتمتة المتابعات", text: "وفّر وقتك ولا تفقد أي عميل محتمل" },
    badgeB: {
      title: "ضاعف تحويل العملاء المحتملين",
      text: "+38% مكالمات محجوزة",
    },
  },
  problem: {
    floatCard: "أين تفقد فرصك البيعية؟",
    badge: "المشكلة",
    title: "العديد من الشركات تفقد فرصاً حقيقية وتخسر إيرادات دون أن تدرك ذلك.",
    text: "قد تمتلك بالفعل عملاء محتملين وزيارات واهتماماً بخدماتك، لكنك تخسر الإيرادات بسبب بطء الاستجابة، أو غياب المتابعة المنتظمة، أو ضياع الحجوزات، أو تشتت الأدوات والعمليات.",
    cards: [
      {
        title: "بطء الاستجابة",
        text: "يطرح العميل المحتمل استفساره، لكن الرد يتأخر فيتلاشى اهتمامه ويتجه إلى المنافسين.",
      },
      {
        title: "غياب المتابعة",
        text: "عندما لا يرد العميل فوراً، يُنسى طلبه ولا تتم متابعته مجدداً.",
      },
      {
        title: "إرسال السعر ثم الصمت",
        text: "تُرسل تفاصيل الأسعار دون توجيه العميل إلى خطوة واضحة لحجز موعد أو إتمام الشراء.",
      },
      {
        title: "تفاوت أساليب المتابعة",
        text: "يتواصل أعضاء الفريق بأساليب متباينة في ظل غياب منهجية عمل موحدة ومنضبطة.",
      },
      {
        title: "تشتت بيانات العملاء",
        text: "يتوزع العملاء بين واتساب وإنستغرام وجداول البيانات دون لوحة متابعة مركزية موحدة.",
      },
    ],
    alert:
      "لا تكمن المشكلة دائماً في نقص العملاء المحتملين؛ بل غالباً فيما يحدث بعد تواصلهم الأول معك.",
  },
  solution: {
    badge: "نظام المتابعة بالذكاء الاصطناعي",
    titleA: "لسنا مجرد أداة منفصلة أخرى.",
    titleB: "نغلق منافذ تسرب الإيرادات تلقائياً.",
    text: "بدلاً من الإجراءات المتفرقة، نجمع الذكاء الاصطناعي والأتمتة والتسليم السلس لفريقك داخل نظام موحد يجعل متابعتك فورية ومنتظمة وعالية الكفاءة.",
    quoteA: "المتابعة بالذكاء الاصطناعي لا تلغي دور فريقك،",
    quoteB: "بل تضمن",
    quoteBold: "عدم ضياع أي فرصة بيعية بين مراحل التواصل.",
    engine: { title: "Upklick", sub: "نظام المتابعة" },
    nodes: {
      ai: { title: "المتابعة الذكية", text: "يفهم الاستفسارات ويرد ويؤهل العملاء" },
      team: {
        title: "فريقك المختص",
        text: "يتولى الحالات الاستراتيجية وإغلاق الصفقات النهائية",
      },
      automation: {
        title: "الأتمتة الذكية",
        text: "تتابع تلقائياً وتنقل العملاء وتفعّل الخطوات التالية",
      },
    },
    steps: [
      {
        label: "الاستقطاب",
        detail: "استقبال كل عميل محتمل تلقائياً من واتساب وإنستغرام وماسنجر ونماذج موقعك.",
      },
      {
        label: "التفاعل الفوري",
        detail: "يستجيب الذكاء الاصطناعي خلال ثوانٍ بهويتك وأسلوبك المهني على مدار الساعة.",
      },
      {
        label: "المتابعة المنتظمة",
        detail: "تذكيرات ذكية مدروسة تبقي المحادثة نشطة حتى يتخذ العميل قراره.",
      },
      {
        label: "حجز المواعيد",
        detail: "يختار العملاء المؤهلون الموعد المناسب مباشرة ضمن تقويمك المتزامن.",
      },
      { label: "إغلاق الصفقات", detail: "يتسلم فريقك عملاء مؤهلين وجاهزين لاتخاذ قرار الشراء." },
    ],
  },
  demo: {
    badge: "عرض حي للمتابعة الذكية",
    title: "شاهد كيف يدير الذكاء الاصطناعي محادثة حقيقية.",
    text: "نموذج حي لمحادثة فعلية مع عميل محتمل؛ حيث يجيب الذكاء الاصطناعي عن الاستفسارات، ويؤهل العميل، ويحجز موعداً تلقائياً.",
    stages: [
      { title: "عميل جديد", text: "عبر قنوات التواصل" },
      { title: "تأهيل العميل", text: "طرح الأسئلة التشخيصية المناسبة" },
      { title: "توضيح الحلول", text: "ترشيح الباقة أو العرض الأنسب" },
      { title: "حجز الموعد", text: "تأكيد الموعد مباشرة في التقويم" },
    ],
    chatName: "عميل محتمل",
    chatStatus: "متصل الآن",
    messages: [
      {
        from: "lead",
        text: "مرحباً، أنا مهتم ببرنامجكم التدريبي. هل يمكنك إطلاعي على التفاصيل والأسعار؟",
      },
      {
        from: "ai",
        text: "أهلاً بك! يسعدني تواصلك ومساعدتك 😊 قبل أن أرشح لك الخيار الأنسب، ما الهدف الرئيسي الذي تسعى لتحقيقه حالياً؟",
      },
      { from: "lead", text: "أرغب في استقطاب المزيد من العملاء وتنمية مبيعات شركتي." },
      {
        from: "ai",
        text: "ممتاز! لدينا برنامج متكامل مصمم خصيصاً لهذا الهدف. أقترح حجز مكالمة تعريفية قصيرة لنحدد معاً الخطة الأنسب لنشاطك.",
      },
    ],
    bookCta: "تأكيد حجز الموعد",
    booked: "تم تأكيد الموعد · الثلاثاء 4:00 م",
    typing: "الذكاء الاصطناعي يكتب الآن…",
    replay: "إعادة العرض",
    canTitle: "قدرات الذكاء الاصطناعي:",
    can: [
      "الإجابة الفورية عن الأسئلة الشائعة",
      "فهم طبيعة نشاط العميل واحتياجاته",
      "تأهيل العملاء المحتملين تلقائياً",
      "جدولة المواعيد وتأكيدها في التقويم",
      "المتابعة الذكية قبل المواعيد وبعدها",
      "إعادة تنشيط العملاء غير المستجيبين",
      "مرافقة العملاء وتقديم الدعم المستمر",
    ],
  },
  compare: {
    badge: "المقارنة الشاملة",
    title: "من الأدوات المتفرقة إلى نظام أعمال موحد.",
    text: "نفس حجم الزيارات، بنتائج مضاعفة وتكلفة أقل.",
    beforeTitle: "قبل استخدام Upklick",
    afterTitle: "بعد استخدام Upklick",
    before: [
      "ردود متأخرة وغير متسقة",
      "ضياع العملاء المحتملين دون متابعة",
      "غياب مسار متابعة واضح ومنظم",
      "إرسال عروض الأسعار دون خطوة تالية",
      "خسارة فرص بيعية محققة",
    ],
    after: [
      "استجابة فورية ومنتظمة على مدار الساعة",
      "متابعات وتذكيرات تلقائية ذكية",
      "تأهيل دقيق للعملاء المحتملين",
      "زيادة ملموسة في المواعيد المحجوزة",
      "تحويل مستمر للعملاء المحتملين إلى مشتركين",
    ],
  },
  how: {
    badge: "آلية العمل",
    title: "من استقطاب العميل إلى إتمام الحجز في 4 خطوات واضحة.",
    text: "منهجية عمل واضحة تضمن عدم ضياع أي فرصة وتوجيه كل عميل محتمل نحو الخطوة الصحيحة.",
    stepLabel: "الخطوة",
    steps: [
      { title: "التحليل", text: "دراسة تدفق العملاء الحالي وتحديد فرص التحسين" },
      { title: "الإعداد", text: "ربط قنوات التواصل وضبط قواعد المتابعة" },
      { title: "التفعيل", text: "بدء الاستجابة الفورية والمتابعة الذكية" },
      { title: "النتائج", text: "مواعيد مؤكدة أكثر ونمو مستدام في المبيعات" },
    ],
  },
  tools: {
    badge: "منظومة متكاملة في مكان واحد",
    title: "جميع الأدوات اللازمة لإدارة أعمالك ومضاعفة نموك.",
    text: "يمنحك Upklick كافة الأدوات الأساسية لاستقطاب العملاء ومتابعتهم وتحويلهم ضمن نظام واحد متناغم.",
    items: [
      { title: "AI Agent", text: "مساعد الأعمال الذكي على مدار الساعة" },
      { title: "المتابعة الذكية", text: "رد فوري وتأهيل ومتابعة وحجز مواعيد" },
      { title: "صندوق الوارد الموحد", text: "جميع محادثاتك من كل القنوات في شاشة واحدة" },
      { title: "إدارة علاقات العملاء", text: "تتبع مسارات المبيعات وجهات الاتصال والصفقات" },
      { title: "الحجوزات والتقويم", text: "صفحات حجز ذكية ومزامنة فورية مع التقويم" },
      { title: "المنتجات والمدفوعات", text: "بيع المنتجات والدورات وتحصيل المدفوعات" },
      { title: "التحليلات والتقارير", text: "قياس الأداء ومعدلات التحويل والإيرادات" },
    ],
  },
  testimonials: {
    badge: "نتائج حقيقية",
    title: "قصص نجاح ونتائج ملموسة لشركائنا ورواد الأعمال.",
    text: "اطّلع على كيف يبني شركاؤنا وعملاؤنا أنشطة مستدامة، ويستقطبون عملاء جدد، ويحققون إيرادات شهرية متكررة باستخدام Upklick.",
    items: [
      {
        quote:
          "«مكنني Upklick من الانتقال من مجرد فكرة إلى قاعدة عملاء فعلية خلال شهرين فقط. وضوح الخطوات وتكامل الأدوات اختصرا علينا أشهراً من العمل.»",
        name: "أحمد طارق",
        role: "مدرب أعمال ومستشار تنفيذي",
      },
      {
        quote:
          "«كنت أهدر ساعات طويلة في المتابعة اليدوية يومياً. اليوم يعمل نظام المتابعة والحجز بالذكاء الاصطناعي تلقائياً ويجلب لي مواعيد مؤكدة باستمرار.»",
        name: "سارة محمود",
        role: "مستشارة تطوير أعمال",
      },
      {
        quote:
          "«كل ما نحتاجه أصبح في منصة واحدة تحمل علامتنا التجارية: صفحات الهبوط، إدارة العملاء، بوابات الدفع، والذكاء الاصطناعي. نقلة نوعية حقيقية لوكالتنا.»",
        name: "كريم عبد الله",
        role: "مؤسس وكالة تسويق رقمي",
      },
    ],
  },
  faq: {
    badge: "الأسئلة الشائعة",
    title: "الإجابات الوافية عن أبرز الاستفسارات.",
    text: "إجابات واضحة ومباشرة حول منصة Upklick ونظام المتابعة الذكي وبرنامج العلامة البيضاء.",
    viewAll: "عرض جميع الأسئلة",
    showLess: "عرض أسئلة أقل",
    items: [
      {
        q: "هل يحل الذكاء الاصطناعي محل فريق المبيعات لدي؟",
        a: "لا؛ بل يتولى الذكاء الاصطناعي الردود الفورية الأولى وتأهيل العملاء والتذكيرات المتكررة، ثم يسلّم العملاء المؤهلين لفريقك لإتمام المحادثات الاستراتيجية وإغلاق الصفقات.",
      },
      {
        q: "هل يمكنني استلام المحادثة بنفسي في أي وقت؟",
        a: "نعم بالتأكيد. يمكنك إيقاف المساعد الذكي في أي محادثة بنقرة واحدة والرد مباشرة من صندوق الوارد الموحد، ولا يعود للعمل إلا عندما تفعّله مجدداً.",
      },
      {
        q: "هل يدعم النظام واتساب وإنستغرام وماسنجر؟",
        a: "نعم. يرتبط Upklick رسمياً بواتساب وإنستغرام وماسنجر والبريد الإلكتروني والدردشة المباشرة ونماذج موقعك لتجتمع كل المحادثات في مكان واحد.",
      },
      {
        q: "هل أضطر إلى الاستغناء عن أدواتي الحالية فوراً؟",
        a: "لا. يعمل Upklick بسلاسة إلى جانب أنظمتك الحالية، ويمكنك الاستغناء عن الاشتراكات المنفصلة تدريجياً وفق وتيرة عملك.",
      },
      {
        q: "هل يمكن تدريب الذكاء الاصطناعي على بيانات شركتي وخدماتي؟",
        a: "نعم بكل سهولة. أضف خدماتك وأسعارك وسياساتك والأسئلة المتكررة إلى قاعدة المعرفة ليجيب الذكاء الاصطناعي بدقة تامة وبهوية علامتك.",
      },
      {
        q: "كم يستغرق إطلاق المنصة والبدء الفعلي؟",
        a: "يمكنك إنشاء حساب المدير وتفعيل تجربتك المجانية فوراً خلال دقائق، وتخصيص هويتك وربط قنواتك في اليوم نفسه.",
      },
      {
        q: "ما اللغات التي يتقنها المساعد الذكي؟",
        a: "يتحدث المساعد الذكي العربية الفصحى والإنجليزية والهولندية والألمانية بطلاقة، ويتعرف تلقائياً على لغة العميل للرد بها.",
      },
      {
        q: "هل بيانات شركتي وعملائي محمية وآمنة؟",
        a: "نعم. تُشفّر كافة البيانات أثناء النقل والتخزين، وتُدار الصلاحيات بدقة وفق نظام الأدوار وعزل مساحات العمل.",
      },
      {
        q: "كيف تعمل التجربة المجانية لحساب المدير؟",
        a: "عند الضغط على «ابدأ الآن» يمكنك إنشاء حساب مدير فوري يشمل فترة تجريبية مجانية تتيح لك استكشاف جميع الأدوات الـ 12 وإعدادات العلامة البيضاء ورصيد الذكاء الاصطناعي دون التزام مسبق.",
      },
      {
        q: "هل تتوفر تقارير فورية لمتابعة الأداء والعائد؟",
        a: "نعم. تعرض لوحة التحليلات الحية سرعة الاستجابة، ومعدلات المتابعة، والمواعيد المؤكدة، والإيرادات لحظة بلحظة.",
      },
    ],
  },
  cta: {
    badge: "خطوتك التالية",
    title: "ابدأ ببناء منظومة نموك اليوم.",
    text: "احصل على وصول فوري إلى منصة Upklick المتكاملة وحوّل المزيد من العملاء المحتملين إلى إيرادات شهرية مستدامة.",
    primary: "ابدأ الآن",
    video: "شاهد جولة سريعة",
    perks: ["منصة متكاملة", "تجربة مجانية فورية", "نتائج أعمال ملموسة"],
  },
  video: {
    title: "كيف يحوّل Upklick العملاء المحتملين إلى مواعيد ومبيعات مؤكدة",
    close: "إغلاق",
    play: "تشغيل",
    pause: "إيقاف مؤقت",
  },
  footer: {
    rights: "© 2026 Upklick — نظام تشغيل النمو المتكامل. جميع الحقوق محفوظة.",
  },
};

const nlFollowUpView: PreviewView = {
  title: "AI-opvolging",
  subtitle: "Beheer je leads, opvolgingen en afspraken.",
  stats: [
    { value: 124, label: "Actieve leads" },
    { value: 602, label: "Verzonden opvolgingen" },
    { value: 731, label: "Gesprekken" },
  ],
  activity: [
    { text: "Nieuwe lead via Instagram", time: "2m geleden", tag: "Nieuw", kind: "capture" },
    { text: "Opvolging verzonden naar Sarah", time: "8m geleden", tag: "Verzonden", kind: "message" },
    { text: "Gesprek geboekt met Omar", time: "21m geleden", tag: "Geboekt", kind: "booking" },
    { text: "Lead omgezet in klant", time: "1u geleden", tag: "Gewonnen", kind: "payment" },
  ],
};

const nlViews: typeof enViews = {
  copilot: {
    title: "AI Copilot",
    subtitle: "Je zakelijke AI-assistent, 24/7 paraat.",
    stats: [
      { value: 48, label: "Geautomatiseerde taken" },
      { value: 312, label: "Beantwoorde vragen" },
      { value: 19, label: "Inzichten vandaag" },
    ],
    activity: [
      { text: "Opvolgbericht opgesteld voor Sarah", time: "3m geleden", tag: "Concept", kind: "message" },
      { text: "12 nieuwe leads samengevat", time: "15m geleden", tag: "Samenvatting", kind: "system" },
      { text: "Beste beltijd voor Omar voorgesteld", time: "40m geleden", tag: "Tip", kind: "stage" },
      { text: "Wekelijks groeirapport staat klaar", time: "2u geleden", tag: "Rapport", kind: "note" },
    ],
  },
  inbox: {
    title: "Postvak IN",
    subtitle: "Al je gesprekken op één plek.",
    stats: [
      { value: 58, label: "Open chats" },
      { value: 214, label: "Vandaag beantwoord" },
      { value: 9, label: "Gem. reactietijd", suffix: "s" },
    ],
    activity: [
      { text: "WhatsApp: Lina vroeg naar de prijzen", time: "1m geleden", tag: "Nieuw", kind: "capture" },
      { text: "Instagram-DM van Youssef", time: "6m geleden", tag: "DM", kind: "message" },
      { text: "AI antwoordde Hana op Messenger", time: "12m geleden", tag: "AI", kind: "system" },
      { text: "E-mailgesprek met Omar afgerond", time: "1u geleden", tag: "Gesloten", kind: "stage" },
    ],
  },
  crm: {
    title: "CRM & Leads",
    subtitle: "Volg je pipeline, contacten en deals.",
    stats: [
      { value: 386, label: "Contacten" },
      { value: 42, label: "Open deals" },
      { value: 27, label: "Deze week gekwalificeerd" },
    ],
    activity: [
      { text: "Sarah verplaatst naar Gekwalificeerd", time: "5m geleden", tag: "Verplaatst", kind: "stage" },
      { text: "Nieuw contact: Ahmed Saleh", time: "18m geleden", tag: "Nieuw", kind: "capture" },
      { text: "Deal gewonnen met Nova Studio", time: "1u geleden", tag: "Gewonnen", kind: "payment" },
      { text: "Notitie toegevoegd aan profiel van Omar", time: "3u geleden", tag: "Notitie", kind: "note" },
    ],
  },
  booking: {
    title: "Boekingen & Agenda",
    subtitle: "Boekingslinks, agenda en afspraken.",
    stats: [
      { value: 14, label: "Gesprekken vandaag" },
      { value: 63, label: "Deze week geboekt" },
      { value: 92, label: "Opkomstpercentage", suffix: "%" },
    ],
    activity: [
      { text: "Gesprek geboekt met Omar · 16:00", time: "2m geleden", tag: "Geboekt", kind: "booking" },
      { text: "Herinnering verzonden naar Lina", time: "25m geleden", tag: "Herinnering", kind: "message" },
      { text: "Strategiesessie verzet", time: "1u geleden", tag: "Verplaatst", kind: "stage" },
      { text: "Adviesgesprek met Sara afgerond", time: "3u geleden", tag: "Klaar", kind: "booking" },
    ],
  },
  products: {
    title: "Producten & Betalingen",
    subtitle: "Verkoop producten en ontvang betalingen.",
    stats: [
      { value: 12, label: "Producten" },
      { value: 86, label: "Bestellingen" },
      { value: 24680, label: "Omzet (€)" },
    ],
    activity: [
      { text: "Betaling ontvangen · €450", time: "4m geleden", tag: "Betaald", kind: "payment" },
      { text: "Nieuwe bestelling: Groeiprogramma", time: "20m geleden", tag: "Bestelling", kind: "capture" },
      { text: "Factuur verzonden naar Karim", time: "1u geleden", tag: "Verzonden", kind: "message" },
      { text: "Kortingscode SPRING20 ingewisseld", time: "2u geleden", tag: "Actie", kind: "note" },
    ],
  },
  analytics: {
    title: "Analyses",
    subtitle: "Volg prestaties en bedrijfsgroei.",
    stats: [
      { value: 38, label: "Conversieratio", suffix: "%" },
      { value: 1240, label: "Bezoekers vandaag" },
      { value: 172, label: "Geboekte gesprekken" },
    ],
    activity: [
      { text: "Geboekte gesprekken +38% deze maand", time: "1u geleden", tag: "Groei", kind: "stage" },
      { text: "Instagram is je sterkste kanaal", time: "3u geleden", tag: "Inzicht", kind: "system" },
      { text: "Reactietijd verbeterd naar 9s", time: "5u geleden", tag: "Snelheid", kind: "message" },
      { text: "Wekelijks rapport gegenereerd", time: "1d geleden", tag: "Rapport", kind: "note" },
    ],
  },
  settings: {
    title: "Instellingen",
    subtitle: "Werkruimte, team en integraties.",
    stats: [
      { value: 6, label: "Teamleden" },
      { value: 5, label: "Gekoppelde kanalen" },
      { value: 3, label: "Actieve automatiseringen" },
    ],
    activity: [
      { text: "WhatsApp-kanaal gekoppeld", time: "10m geleden", tag: "Gekoppeld", kind: "system" },
      { text: "Mona is toegevoegd aan je team", time: "1u geleden", tag: "Team", kind: "capture" },
      { text: "Openingstijden bijgewerkt", time: "4u geleden", tag: "Bijgewerkt", kind: "stage" },
      { text: "Kennisbank gesynchroniseerd", time: "1d geleden", tag: "Sync", kind: "note" },
    ],
  },
};

const nl: LandingCopy = {
  meta: {
    title: "Upklick — Maak van elke lead een echte kans met AI-opvolging",
    description: "Upklick helpt je razendsnel te reageren, automatisch op te volgen en afspraken in te plannen met AI — zodat geen enkele lead verloren gaat.",
  },
  nav: {
    links: [
      { id: "compare", label: "Vergelijk" },
      { id: "features", label: "Functies" },
      { id: "results", label: "Resultaten" },
      { id: "pricing", label: "Prijzen" },
      { id: "faq", label: "FAQ" },
    ],
    login: "Inloggen",
    book: "Start nu",
    langLabel: "Dutch",
    menu: "Menu",
    top: "Terug naar boven",
  },
  hero: {
    badge: "Compleet opvolgsysteem",
    titleA: "Maak van elke lead echte omzet —",
    titleB: "& bezit het AI-platform onder jouw merk.",
    lead: "Upklick reageert direct, volgt automatisch op en plant afspraken met AI — én laat je alle 12 zakelijke tools lanceren als je eigen 100% White-Label softwarebedrijf.",
    checks: [
      "Directe 24/7 AI-reacties, slimme opvolging en agendaboekingen",
      "100% jouw merk — eigen domein, SSL en mobiele app op jouw naam",
      "Kant-en-klare tech-provider: Meta, AI, e-mail en domeinen gekoppeld",
      "12 geïntegreerde zakelijke tools om je omzet en klantenbestand te schalen",
    ],
    primary: "Start nu",
    video: "Bekijk korte video",
    note: "Gratis Admin-proefperiode inbegrepen • Lanceer je werkruimte of White-Label merk in minuten.",
    builtFor: "Ontworpen voor uiteenlopende bedrijven:",
    businesses: [
      "Coaches & Consultants",
      "Dienstverleners",
      "Bureaus",
      "Webshops & E-commerce",
      "Lokale bedrijven",
      "Klinieken & Zorg",
      "Opleidingen & Cursussen",
      "Vastgoed",
    ],
  },
  mock: {
    nav: [
      "AI Copilot",
      "AI-opvolging",
      "Postvak IN",
      "CRM & Leads",
      "Boekingen & Agenda",
      "Producten & Betalingen",
      "Analyses",
      "Instellingen",
    ],
    ...nlFollowUpView,
    live: "Live",
    activityTitle: "Recente activiteit",
    viewAll: "Alles bekijken",
    views: [
      nlViews.copilot,
      nlFollowUpView,
      nlViews.inbox,
      nlViews.crm,
      nlViews.booking,
      nlViews.products,
      nlViews.analytics,
      nlViews.settings,
    ],
    liveLabel: "Jouw werkruimte",
    demoLabel: "Demovoorbeeld",
    empty: "Nog geen recente activiteit — nieuwe leads verschijnen hier.",
    time: {
      now: "Zojuist",
      min: "{n}m geleden",
      hour: "{n}u geleden",
      yesterday: "Gisteren",
      day: "{n}d geleden",
    },
    events: {
      capture: "Nieuwe lead: {name}",
      message: "Opvolging verzonden naar {name}",
      booking: "Gesprek geboekt met {name}",
      payment: "Betaling ontvangen van {name}",
      stage: "{name} verplaatst naar een nieuwe fase",
      note: "Notitie toegevoegd voor {name}",
      system: "Automatiseringsupdate · {name}",
    },
    tags: {
      capture: "Nieuw",
      message: "Verzonden",
      booking: "Geboekt",
      payment: "Gewonnen",
      stage: "Verplaatst",
      note: "Notitie",
      system: "Auto",
    },
    badgeA: {
      title: "Automatiseer opvolgingen",
      text: "Bespaar tijd en mis nooit meer een lead",
    },
    badgeB: {
      title: "Zet meer leads om in klanten",
      text: "+38% geboekte gesprekken",
    },
  },
  problem: {
    floatCard: "Waar laat jij kansen liggen?",
    badge: "Het probleem",
    title: "Veel bedrijven verliezen ongemerkt echte omzet.",
    text: "Je hebt misschien al leads, bezoekers en interesse, maar verliest toch omzet door trage reacties, gebrek aan opvolging, gemiste afspraken, inconsistente processen of losse tools.",
    cards: [
      {
        title: "Trage reactie",
        text: "De lead stelt een vraag, maar het antwoord komt te laat — en de interesse ebt weg.",
      },
      {
        title: "Geen opvolging",
        text: "Reageert een lead niet meteen, dan raakt die vergeten en wordt er nooit meer opgevolgd.",
      },
      {
        title: "Prijs gestuurd, daarna stilte",
        text: "Je stuurt de prijs, maar er volgt geen duidelijke volgende stap voor een gesprek of boeking.",
      },
      {
        title: "Wisselende opvolgstijlen",
        text: "Je team reageert telkens anders, zonder vast en herhaalbaar proces.",
      },
      {
        title: "Leads verspreid over kanalen",
        text: "Sommige leads staan in WhatsApp, andere in Instagram of een spreadsheet — zonder centraal overzicht.",
      },
    ],
    alert: "Het probleem is niet altijd een tekort aan leads. Vaak zit het echte verlies in wat er gebeurt nádat een lead binnenkomt.",
  },
  solution: {
    badge: "Het AI-opvolgsysteem",
    titleA: "Geen extra losse tool voor je bedrijf.",
    titleB: "Maar het dichten van je omzetlekken.",
    text: "In plaats van een versnipperd proces combineren we AI, automatisering en persoonlijke overdracht in één overzichtelijk systeem — voor snelle, consistente en effectieve opvolging.",
    quoteA: "AI-opvolging vervangt je team niet.",
    quoteB: "Het zorgt ervoor dat",
    quoteBold: "er geen enkele kans tussen de stappen verloren gaat.",
    engine: { title: "Upklick", sub: "Opvolgsysteem" },
    nodes: {
      ai: { title: "AI-opvolging", text: "Begrijpt, reageert en kwalificeert" },
      team: { title: "Jouw team", text: "Neemt belangrijke gesprekken en beslissingen over" },
      automation: { title: "Automatisering", text: "Volgt op, verplaatst leads en start vervolgstappen" },
    },
    steps: [
      { label: "Vastleggen", detail: "Elke nieuwe lead uit WhatsApp, Instagram, formulieren en je website wordt direct vastgelegd." },
      { label: "Reageren", detail: "De AI antwoordt direct in jouw schrijfstijl, op elk moment van de dag." },
      { label: "Opvolgen", detail: "Slimme herinneringen houden het gesprek warm totdat de lead beslist." },
      { label: "Boeken", detail: "Gekwalificeerde leads kiezen rechtstreeks een geschikt moment in je agenda." },
      { label: "Converteren", detail: "Je team sluit warme, koopklare klanten af." },
    ],
  },
  demo: {
    badge: "Live AI-opvolgdemo",
    title: "Bekijk hoe de AI een echt klantgesprek voert.",
    text: "Dit is een voorbeeld van een echt gesprek met een potentiële klant. De AI beantwoordt vragen, kwalificeert de lead en plant een gesprek in.",
    stages: [
      { title: "Nieuwe lead", text: "Via Instagram" },
      { title: "Kwalificeren", text: "De juiste vragen stellen" },
      { title: "Opties uitleggen", text: "Het beste aanbod delen" },
      { title: "Gesprek plannen", text: "Een passend tijdstip voorstellen" },
    ],
    chatName: "Potentiële klant",
    chatStatus: "Online",
    messages: [
      { from: "lead", text: "Hoi, ik heb interesse in jullie coachingprogramma. Kun je me meer vertellen over de prijs?" },
      { from: "ai", text: "Hoi! Leuk dat je een bericht stuurt 😊 Ik help je graag. Mag ik eerst vragen wat op dit moment je belangrijkste doel is, zodat ik de beste optie kan aanraden?" },
      { from: "lead", text: "Ik wil meer klanten aantrekken voor mijn bedrijf." },
      { from: "ai", text: "Uitstekend! Daar hebben we precies een programma voor ontwikkeld. Ik raad aan een gratis adviesgesprek in te plannen zodat we het beste plan voor jouw situatie kunnen adviseren." },
    ],
    bookCta: "Gratis gesprek plannen",
    booked: "Gesprek geboekt · Di 16:00",
    typing: "AI typt…",
    replay: "Opnieuw afspelen",
    canTitle: "De AI kan:",
    can: [
      "Veelgestelde vragen beantwoorden",
      "Het bedrijf van de klant begrijpen",
      "Leads automatisch kwalificeren",
      "Afspraken inplannen",
      "Voor en na gesprekken opvolgen",
      "Oude leads heractiveren",
      "Klanten begeleiden en ondersteunen",
    ],
  },
  compare: {
    badge: "Voor vs. Na",
    title: "Van gemiste kansen naar echte omzet.",
    text: "Dezelfde leads. Een compleet ander resultaat.",
    beforeTitle: "Vóór Upklick",
    afterTitle: "Met Upklick",
    before: [
      "Trage en wisselende reacties",
      "Leads worden vergeten",
      "Geen duidelijk opvolgproces",
      "Prijzen verstuurd zonder vervolg",
      "Verloren potentiële klanten",
    ],
    after: [
      "Directe en consistente reacties",
      "Automatische opvolging en herinneringen",
      "Meer gekwalificeerde leads",
      "Meer geboekte gesprekken",
      "Meer leads omgezet in betalende klanten",
    ],
  },
  how: {
    badge: "Hoe het werkt",
    title: "Van lead naar afspraak in 4 eenvoudige stappen.",
    text: "Een helder proces zodat geen enkele kans verloren gaat en elke lead de juiste volgende stap zet.",
    stepLabel: "Stap",
    steps: [
      { title: "Analyseren", text: "Inzicht in je huidige situatie en leadstroom" },
      { title: "Inrichten", text: "Koppel je kanalen en stel je opvolgregels in" },
      { title: "Activeren", text: "De AI start met reageren en opvolgen" },
      { title: "Resultaat boeken", text: "Meer afspraken en betalende klanten" },
    ],
  },
  tools: {
    badge: "Alles op één plek",
    title: "Alle tools die je nodig hebt om je bedrijf te beheren en te laten groeien.",
    text: "Upklick biedt alle essentiële tools om leads vast te leggen, op te volgen en te converteren — in één systeem.",
    items: [
      { title: "AI Copilot", text: "Je zakelijke AI-assistent" },
      { title: "AI-opvolging", text: "Reageren, kwalificeren, opvolgen en boeken" },
      { title: "Postvak IN", text: "Al je gesprekken overzichtelijk op één plek" },
      { title: "CRM & Leads", text: "Beheer je pipeline, contacten en deals" },
      { title: "Boekingen & Agenda", text: "Boekingslinks, agenda en afspraken" },
      { title: "Producten & Betalingen", text: "Verkoop producten en ontvang betalingen" },
      { title: "Analyses", text: "Volg prestaties en groei in realtime" },
    ],
  },
  testimonials: {
    badge: "Echte resultaten",
    title: "Van ondernemers tot groeibedrijven.",
    text: "Ontdek hoe ondernemers met Upklick sterke bedrijven bouwen, klanten aantrekken en terugkerende omzet realiseren.",
    items: [
      {
        quote: "“Dankzij Upklick ging ik in twee maanden van een idee naar betalende klanten. Het stapsgewijze proces maakte alles overzichtelijk.”",
        name: "Ahmed T.",
        role: "Coach",
      },
      {
        quote: "“Vroeger volgde ik alles handmatig op. Nu draaien mijn AI-opvolging en boekingssysteem automatisch en leveren ze continu nieuwe klanten op.”",
        name: "Sara M.",
        role: "Consultant",
      },
      {
        quote: "“Alles wat ik nodig heb zit op één plek: funnels, CRM, betalingen en AI. Het is een compleet bedrijfssysteem.”",
        name: "Karim A.",
        role: "Bureau-eigenaar",
      },
    ],
  },
  faq: {
    badge: "FAQ",
    title: "Veelgestelde vragen.",
    text: "Snelle antwoorden op de meest gestelde vragen over Upklick en het AI-opvolgsysteem.",
    viewAll: "Alle vragen bekijken",
    showLess: "Minder vragen tonen",
    items: [
      { q: "Vervangt de AI mijn team?", a: "Nee. De AI vangt herhalende eerste vragen, kwalificatie en herinneringen op en draagt warme leads over aan je team voor belangrijke gesprekken en de afronding." },
      { q: "Kan ik een gesprek op elk moment overnemen?", a: "Ja. Met één klik pauzeer je de AI in elk gesprek en antwoord je zelf vanuit het Upklick Postvak IN. De AI gaat pas verder wanneer jij dat inschakelt." },
      { q: "Werkt het met WhatsApp en Instagram?", a: "Ja. Upklick koppelt met WhatsApp, Instagram, Messenger, e-mail en je websiteformulieren zodat elke lead in één centraal postvak binnenkomt." },
      { q: "Moet ik mijn huidige tools direct vervangen?", a: "Nee. Upklick werkt naast je bestaande werkwijze en kan losse tools stap voor stap in jouw eigen tempo vervangen." },
      { q: "Kan ik de AI trainen met mijn eigen bedrijfsinformatie?", a: "Zeker. Upload je diensten, prijzen, veelgestelde vragen en voorwaarden naar de Kennisbank en de AI antwoordt met jouw informatie en tone-of-voice." },
      { q: "Hoe snel kan ik live gaan?", a: "De meeste bedrijven zijn binnen enkele dagen live. We analyseren je leadstroom, richten je kanalen en regels in en activeren samen de AI." },
      { q: "Welke talen ondersteunt de AI?", a: "De AI communiceert vloeiend in meerdere talen waaronder Nederlands, Engels, Duits en Arabisch en past zich automatisch aan de taal van je lead aan." },
      { q: "Zijn mijn klantgegevens veilig?", a: "Ja. Alle gegevens worden versleuteld verzonden en opgeslagen, met rolgebaseerde toegangsrechten binnen je werkruimte." },
      { q: "Hoe werkt het gratis proefaccount voor Admins?", a: "Klik op Start nu om direct je Admin-account met gratis proefperiode aan te maken — inclusief toegang tot alle 12 tools, White-Label instellingen en AI-starttegoed." },
      { q: "Kan ik de resultaten volgen in het dashboard?", a: "Ja. In Analyses zie je direct reacties, opvolgingen, boekingen en omzet zodat je altijd weet wat werkt." },
    ],
  },
  cta: {
    badge: "Je volgende stap",
    title: "Begin vandaag nog met slimmer groeien.",
    text: "Krijg toegang tot het volledige Upklick-systeem en volg het bewezen proces om meer leads om te zetten in betalende klanten.",
    primary: "Start nu",
    video: "Bekijk korte video",
    perks: ["Compleet systeem", "Stapsgewijze begeleiding", "Meetbare bedrijfsresultaten"],
  },
  video: {
    title: "Hoe Upklick leads omzet in geboekte gesprekken",
    close: "Sluiten",
    play: "Afspelen",
    pause: "Pauzeren",
  },
  footer: {
    rights: "© 2026 Upklick — Alle rechten voorbehouden.",
  },
};

const deFollowUpView: PreviewView = {
  title: "KI-Follow-up",
  subtitle: "Verwalte deine Leads, Follow-ups und Buchungen.",
  stats: [
    { value: 124, label: "Aktive Leads" },
    { value: 602, label: "Gesendete Follow-ups" },
    { value: 731, label: "Gespräche" },
  ],
  activity: [
    { text: "Neuer Lead über Instagram", time: "vor 2 Min.", tag: "Neu", kind: "capture" },
    { text: "Follow-up an Sarah gesendet", time: "vor 8 Min.", tag: "Gesendet", kind: "message" },
    { text: "Gespräch mit Omar gebucht", time: "vor 21 Min.", tag: "Gebucht", kind: "booking" },
    { text: "Lead zum Kunden konvertiert", time: "vor 1 Std.", tag: "Gewonnen", kind: "payment" },
  ],
};

const deViews: typeof enViews = {
  copilot: {
    title: "AI Copilot",
    subtitle: "Dein KI-Business-Assistent, rund um die Uhr bereit.",
    stats: [
      { value: 48, label: "Automatisierte Aufgaben" },
      { value: 312, label: "Beantwortete Fragen" },
      { value: 19, label: "Erkenntnisse heute" },
    ],
    activity: [
      { text: "Follow-up für Sarah entworfen", time: "vor 3 Min.", tag: "Entwurf", kind: "message" },
      { text: "12 neue Leads zusammengefasst", time: "vor 15 Min.", tag: "Zusammenfassung", kind: "system" },
      { text: "Beste Anrufzeit für Omar empfohlen", time: "vor 40 Min.", tag: "Tipp", kind: "stage" },
      { text: "Wöchentlicher Wachstumsbericht bereit", time: "vor 2 Std.", tag: "Bericht", kind: "note" },
    ],
  },
  inbox: {
    title: "Posteingang",
    subtitle: "Alle Kundengespräche an einem Ort.",
    stats: [
      { value: 58, label: "Offene Chats" },
      { value: 214, label: "Heute beantwortet" },
      { value: 9, label: "Ø Antwortzeit", suffix: "s" },
    ],
    activity: [
      { text: "WhatsApp: Lina fragte nach Preisen", time: "vor 1 Min.", tag: "Neu", kind: "capture" },
      { text: "Instagram-DM von Youssef", time: "vor 6 Min.", tag: "DM", kind: "message" },
      { text: "KI antwortete Hana im Messenger", time: "vor 12 Min.", tag: "KI", kind: "system" },
      { text: "E-Mail-Verlauf mit Omar abgeschlossen", time: "vor 1 Std.", tag: "Geschlossen", kind: "stage" },
    ],
  },
  crm: {
    title: "CRM & Leads",
    subtitle: "Pipeline, Kontakte und Deals im Blick.",
    stats: [
      { value: 386, label: "Kontakte" },
      { value: 42, label: "Offene Deals" },
      { value: 27, label: "Diese Woche qualifiziert" },
    ],
    activity: [
      { text: "Sarah auf Qualifiziert gesetzt", time: "vor 5 Min.", tag: "Verschoben", kind: "stage" },
      { text: "Neuer Kontakt: Ahmed Saleh", time: "vor 18 Min.", tag: "Neu", kind: "capture" },
      { text: "Deal mit Nova Studio gewonnen", time: "vor 1 Std.", tag: "Gewonnen", kind: "payment" },
      { text: "Notiz zu Omars Profil hinzugefügt", time: "vor 3 Std.", tag: "Notiz", kind: "note" },
    ],
  },
  booking: {
    title: "Buchungen & Kalender",
    subtitle: "Buchungslinks, Kalender und Termine.",
    stats: [
      { value: 14, label: "Termine heute" },
      { value: 63, label: "Diese Woche gebucht" },
      { value: 92, label: "Erscheinungsquote", suffix: "%" },
    ],
    activity: [
      { text: "Termin mit Omar gebucht · 16:00 Uhr", time: "vor 2 Min.", tag: "Gebucht", kind: "booking" },
      { text: "Erinnerung an Lina gesendet", time: "vor 25 Min.", tag: "Erinnerung", kind: "message" },
      { text: "Strategiesitzung umgebucht", time: "vor 1 Std.", tag: "Verschoben", kind: "stage" },
      { text: "Beratung mit Sara abgeschlossen", time: "vor 3 Std.", tag: "Erledigt", kind: "booking" },
    ],
  },
  products: {
    title: "Produkte & Zahlungen",
    subtitle: "Produkte verkaufen und Zahlungen einziehen.",
    stats: [
      { value: 12, label: "Produkte" },
      { value: 86, label: "Bestellungen" },
      { value: 24680, label: "Umsatz (€)" },
    ],
    activity: [
      { text: "Zahlung erhalten · €450", time: "vor 4 Min.", tag: "Bezahlt", kind: "payment" },
      { text: "Neue Bestellung: Wachstumsprogramm", time: "vor 20 Min.", tag: "Bestellung", kind: "capture" },
      { text: "Rechnung an Karim gesendet", time: "vor 1 Std.", tag: "Gesendet", kind: "message" },
      { text: "Gutschein SPRING20 eingelöst", time: "vor 2 Std.", tag: "Aktion", kind: "note" },
    ],
  },
  analytics: {
    title: "Analysen",
    subtitle: "Performance und Wachstum verfolgen.",
    stats: [
      { value: 38, label: "Conversion-Rate", suffix: "%" },
      { value: 1240, label: "Besucher heute" },
      { value: 172, label: "Gebuchte Gespräche" },
    ],
    activity: [
      { text: "Gebuchte Gespräche +38 % diesen Monat", time: "vor 1 Std.", tag: "Wachstum", kind: "stage" },
      { text: "Instagram ist dein stärkster Kanal", time: "vor 3 Std.", tag: "Einblick", kind: "system" },
      { text: "Antwortzeit auf 9s verbessert", time: "vor 5 Std.", tag: "Tempo", kind: "message" },
      { text: "Wochenbericht erstellt", time: "vor 1 T.", tag: "Bericht", kind: "note" },
    ],
  },
  settings: {
    title: "Einstellungen",
    subtitle: "Arbeitsbereich, Team und Integrationen.",
    stats: [
      { value: 6, label: "Teammitglieder" },
      { value: 5, label: "Verbundene Kanäle" },
      { value: 3, label: "Aktive Automatisierungen" },
    ],
    activity: [
      { text: "WhatsApp-Kanal verbunden", time: "vor 10 Min.", tag: "Verbunden", kind: "system" },
      { text: "Mona ist deinem Team beigetreten", time: "vor 1 Std.", tag: "Team", kind: "capture" },
      { text: "Geschäftszeiten aktualisiert", time: "vor 4 Std.", tag: "Aktualisiert", kind: "stage" },
      { text: "Wissensdatenbank synchronisiert", time: "vor 1 T.", tag: "Sync", kind: "note" },
    ],
  },
};

const de: LandingCopy = {
  meta: {
    title: "Upklick — Verwandle jeden Lead in eine echte Verkaufschance mit KI-Follow-up",
    description: "Upklick hilft dir, sofort zu antworten, automatisch nachzufassen und Termine per KI zu buchen — damit kein Lead mehr verloren geht.",
  },
  nav: {
    links: [
      { id: "compare", label: "Vergleich" },
      { id: "features", label: "Funktionen" },
      { id: "results", label: "Ergebnisse" },
      { id: "pricing", label: "Preise" },
      { id: "faq", label: "FAQ" },
    ],
    login: "Anmelden",
    book: "Jetzt starten",
    langLabel: "Deutsch",
    menu: "Menü",
    top: "Nach oben",
  },
  hero: {
    badge: "Komplettes Follow-up-System",
    titleA: "Verwandle jeden Lead in echten Umsatz —",
    titleB: "& besitze die KI-Plattform unter deiner Marke.",
    lead: "Upklick antwortet sofort, fasst automatisch nach und bucht Termine per KI — und lässt dich alle 12 Business-Tools als eigenes 100 % White-Label-Softwareunternehmen starten.",
    checks: [
      "Sofortige 24/7-KI-Antworten, smarte Follow-ups & Terminbuchung",
      "100 % deine Marke — eigene Domain, SSL & mobile App unter deinem Namen",
      "Schlüsselfertiger Tech-Provider: Meta, KI, E-Mail & Domains verbunden",
      "12 integrierte Business-Tools für dein Wachstum & wiederkehrende Kunden",
    ],
    primary: "Jetzt starten",
    video: "Kurzes Video ansehen",
    note: "Kostenlose Admin-Testphase inklusive • Starte deinen Arbeitsbereich oder dein White-Label in Minuten.",
    builtFor: "Entwickelt für unterschiedlichste Unternehmen:",
    businesses: [
      "Coaches & Berater",
      "Dienstleister",
      "Agenturen",
      "E-Commerce & Shops",
      "Lokale Unternehmen",
      "Praxen & Gesundheit",
      "Bildung & Kurse",
      "Immobilien",
    ],
  },
  mock: {
    nav: [
      "AI Copilot",
      "KI-Follow-up",
      "Posteingang",
      "CRM & Leads",
      "Buchungen & Kalender",
      "Produkte & Zahlungen",
      "Analysen",
      "Einstellungen",
    ],
    ...deFollowUpView,
    live: "Live",
    activityTitle: "Letzte Aktivitäten",
    viewAll: "Alle anzeigen",
    views: [
      deViews.copilot,
      deFollowUpView,
      deViews.inbox,
      deViews.crm,
      deViews.booking,
      deViews.products,
      deViews.analytics,
      deViews.settings,
    ],
    liveLabel: "Dein Arbeitsbereich",
    demoLabel: "Demo-Vorschau",
    empty: "Noch keine aktuellen Aktivitäten — neue Leads erscheinen hier.",
    time: {
      now: "Gerade eben",
      min: "vor {n} Min.",
      hour: "vor {n} Std.",
      yesterday: "Gestern",
      day: "vor {n} T.",
    },
    events: {
      capture: "Neuer Lead: {name}",
      message: "Follow-up gesendet an {name}",
      booking: "Termin gebucht mit {name}",
      payment: "Zahlung erhalten von {name}",
      stage: "{name} in eine neue Phase verschoben",
      note: "Notiz hinzugefügt für {name}",
      system: "Automatisierungs-Update · {name}",
    },
    tags: {
      capture: "Neu",
      message: "Gesendet",
      booking: "Gebucht",
      payment: "Gewonnen",
      stage: "Verschoben",
      note: "Notiz",
      system: "Auto",
    },
    badgeA: {
      title: "Follow-ups automatisieren",
      text: "Zeit sparen und keinen Lead mehr verpassen",
    },
    badgeB: {
      title: "Mehr Leads zu Kunden machen",
      text: "+38 % gebuchte Gespräche",
    },
  },
  problem: {
    floatCard: "Wo verlierst du aktuell Chancen?",
    badge: "Das Problem",
    title: "Viele Unternehmen verlieren echten Umsatz, ohne es zu merken.",
    text: "Du hast vielleicht schon Leads, Besucher und Interesse — verlierst aber dennoch Umsatz durch späte Antworten, fehlendes Nachfassen, verpasste Buchungen, uneinheitliche Abläufe oder getrennte Tools.",
    cards: [
      {
        title: "Langsame Reaktionszeit",
        text: "Der Lead stellt eine Frage, doch die Antwort kommt zu spät — und das Interesse kühlt ab.",
      },
      {
        title: "Kein Follow-up",
        text: "Antwortet ein Lead nicht sofort, gerät er in Vergessenheit und wird nie wieder kontaktiert.",
      },
      {
        title: "Preis genannt, dann Funkstille",
        text: "Du nennst den Preis, aber es fehlt der klare nächste Schritt zur Buchung oder zum Gespräch.",
      },
      {
        title: "Uneinheitliches Nachfassen",
        text: "Dein Team antwortet unterschiedlich — ohne klaren, verlässlichen Prozess.",
      },
      {
        title: "Verstreute Leads",
        text: "Einige Leads sind in WhatsApp, andere bei Instagram oder in Tabellen — ohne zentrale Übersicht.",
      },
    ],
    alert: "Das Problem ist selten ein Mangel an Leads. Meist liegt das eigentliche Problem darin, was nach dem Erstkontakt passiert.",
  },
  solution: {
    badge: "Das KI-Follow-up-System",
    titleA: "Kein weiteres Einzel-Tool für dein Unternehmen.",
    titleB: "Sondern das Schließen deiner Umsatzlecks.",
    text: "Statt isolierter Einzellösungen verbinden wir KI, Automatisierung und persönliche Übergabe in einem klaren System — für schnelles, konsistentes und wirksames Follow-up.",
    quoteA: "KI-Follow-up ersetzt dein Team nicht.",
    quoteB: "Es stellt sicher, dass",
    quoteBold: "zwischen diesen Schritten keine Chance verloren geht.",
    engine: { title: "Upklick", sub: "Follow-up-System" },
    nodes: {
      ai: { title: "KI-Follow-up", text: "Versteht, antwortet und qualifiziert" },
      team: { title: "Dein Team", text: "Übernimmt wichtige Fälle und Abschlussgespräche" },
      automation: { title: "Automatisierung", text: "Fasst nach, verschiebt Leads und startet nächste Schritte" },
    },
    steps: [
      { label: "Erfassen", detail: "Jeder neue Lead aus WhatsApp, Instagram, Formularen und deiner Website wird sofort erfasst." },
      { label: "Antworten", detail: "Die KI antwortet sofort in deinem Tonfall — zu jeder Tageszeit." },
      { label: "Nachfassen", detail: "Intelligente Erinnerungen halten das Gespräch aktiv, bis der Lead entscheidet." },
      { label: "Buchen", detail: "Qualifizierte Leads wählen direkt einen freien Termin in deinem Kalender." },
      { label: "Abschließen", detail: "Dein Team gewinnt warme, kaufbereite Kunden." },
    ],
  },
  demo: {
    badge: "Live KI-Follow-up-Demo",
    title: "Erlebe, wie die KI ein echtes Gespräch führt.",
    text: "Dies ist ein Beispiel eines echten Gesprächs mit einem Interessenten. Die KI beantwortet Fragen, qualifiziert den Lead und bucht einen Termin.",
    stages: [
      { title: "Neuer Lead", text: "Über Instagram" },
      { title: "Qualifizierung", text: "Die richtigen Fragen stellen" },
      { title: "Optionen erklären", text: "Das passende Paket empfehlen" },
      { title: "Termin buchen", text: "Passende Zeit vorschlagen" },
    ],
    chatName: "Potenzieller Kunde",
    chatStatus: "Online",
    messages: [
      { from: "lead", text: "Hallo, ich interessiere mich für euer Coaching-Programm. Könnt ihr mir etwas zum Preis sagen?" },
      { from: "ai", text: "Hallo! Schön, von dir zu hören 😊 Ich helfe dir sehr gerne. Darf ich kurz fragen, was aktuell dein wichtigstes Ziel ist, damit ich dir die passende Option empfehlen kann?" },
      { from: "lead", text: "Ich möchte mehr Kunden für mein Unternehmen gewinnen." },
      { from: "ai", text: "Perfekt! Genau dafür haben wir ein spezialisiertes Programm. Ich empfehle dir ein kurzes kostenloses Beratungsgespräch, damit wir den optimalen Plan für dich auswählen können." },
    ],
    bookCta: "Kostenloses Gespräch buchen",
    booked: "Termin gebucht · Di 16:00 Uhr",
    typing: "KI schreibt…",
    replay: "Neu abspielen",
    canTitle: "Die KI kann:",
    can: [
      "Häufige Fragen beantworten",
      "Das Geschäft des Kunden verstehen",
      "Leads automatisch qualifizieren",
      "Termine buchen",
      "Vor und nach Gesprächen nachfassen",
      "Alte Leads reaktivieren",
      "Kunden begleiten und betreuen",
    ],
  },
  compare: {
    badge: "Vorher vs. Nachher",
    title: "Von verlorenen Chancen zu messbarem Umsatz.",
    text: "Dieselben Leads. Ein völlig anderes Ergebnis.",
    beforeTitle: "Vor Upklick",
    afterTitle: "Mit Upklick",
    before: [
      "Langsame und uneinheitliche Antworten",
      "Leads geraten in Vergessenheit",
      "Kein klarer Follow-up-Prozess",
      "Preise gesendet ohne Nachfassen",
      "Verlorene potenzielle Kunden",
    ],
    after: [
      "Sofortige und konsistente Antworten",
      "Automatisches Follow-up und Erinnerungen",
      "Mehr qualifizierte Leads",
      "Mehr gebuchte Termine",
      "Mehr Leads werden zu zahlenden Kunden",
    ],
  },
  how: {
    badge: "So funktioniert’s",
    title: "Vom Lead zur Buchung in 4 einfachen Schritten.",
    text: "Ein klarer, strukturierter Ablauf, damit keine Verkaufschance verloren geht und jeder Lead den richtigen nächsten Schritt erreicht.",
    stepLabel: "Schritt",
    steps: [
      { title: "Analysieren", text: "Ist-Zustand und Lead-Fluss verstehen" },
      { title: "Einrichten", text: "Kanäle verbinden und Follow-up-Regeln festlegen" },
      { title: "Aktivieren", text: "KI übernimmt Erstantworten und Nachfassen" },
      { title: "Ergebnisse erzielen", text: "Mehr Buchungen und zahlende Kunden" },
    ],
  },
  tools: {
    badge: "Alles an einem Ort",
    title: "Alle Werkzeuge, die du brauchst, um dein Unternehmen zu steuern und zu skalieren.",
    text: "Upklick vereint alle wichtigen Tools zum Erfassen, Nachfassen und Konvertieren von Leads in einem System.",
    items: [
      { title: "AI Copilot", text: "Dein intelligenter Business-Assistent" },
      { title: "KI-Follow-up", text: "Antworten, qualifizieren, nachfassen und buchen" },
      { title: "Posteingang", text: "Alle Unterhaltungen gebündelt an einem Ort" },
      { title: "CRM & Leads", text: "Pipeline, Kontakte und Deals verwalten" },
      { title: "Buchungen & Kalender", text: "Buchungslinks, Kalender und Termine" },
      { title: "Produkte & Zahlungen", text: "Produkte verkaufen und Zahlungen empfangen" },
      { title: "Analysen", text: "Performance und Wachstum im Überblick" },
    ],
  },
  testimonials: {
    badge: "Echte Ergebnisse",
    title: "Von Gründern zu wachsenden Unternehmen.",
    text: "Sieh dir an, wie Unternehmer mit Upklick profitable Geschäfte aufbauen, planbar Kunden gewinnen und wiederkehrende Umsätze erzielen.",
    items: [
      {
        quote: "„Upklick hat mir geholfen, in nur zwei Monaten von einer Idee zu echten zahlenden Kunden zu kommen. Der Schritt-für-Schritt-Prozess hat alles klar gemacht.“",
        name: "Ahmed T.",
        role: "Coach",
      },
      {
        quote: "„Früher habe ich manuell nachgefasst. Jetzt laufen mein KI-Follow-up und mein Buchungssystem automatisch und bringen mir kontinuierlich Kunden.“",
        name: "Sara M.",
        role: "Beraterin",
      },
      {
        quote: "„Alles, was ich brauche, ist an einem Ort: Funnels, CRM, Zahlungen und KI. Ein echtes Komplettsystem fürs Business.“",
        name: "Karim A.",
        role: "Agenturinhaber",
      },
    ],
  },
  faq: {
    badge: "FAQ",
    title: "Häufig gestellte Fragen.",
    text: "Kurze Antworten auf die wichtigsten Fragen rund um Upklick und das KI-Follow-up-System.",
    viewAll: "Alle Fragen anzeigen",
    showLess: "Weniger Fragen anzeigen",
    items: [
      { q: "Ersetzt die KI mein Team?", a: "Nein. Die KI übernimmt wiederkehrende Erstantworten, die Vorqualifizierung und Erinnerungen und übergibt warme Leads an dein Team für wichtige Gespräche und den Abschluss." },
      { q: "Kann ich ein Gespräch jederzeit selbst übernehmen?", a: "Ja. Mit einem Klick pausierst du die KI in jedem Chat und antwortest direkt aus dem Upklick-Posteingang. Die KI übernimmt erst wieder, wenn du sie aktivierst." },
      { q: "Kann ich WhatsApp und Instagram nutzen?", a: "Ja. Upklick verbindet WhatsApp, Instagram, Messenger, E-Mail und deine Website-Formulare, sodass jeder Lead in einem zentralen Posteingang landet." },
      { q: "Muss ich meine bestehenden Tools sofort wechseln?", a: "Nein. Upklick arbeitet problemlos neben deinem bestehenden Setup und kann einzelne Tools Schritt für Schritt in deinem Tempo ablösen." },
      { q: "Kann ich die KI mit meinen Unternehmensdaten trainieren?", a: "Selbstverständlich. Lade Leistungen, Preise, FAQs und Richtlinien in die Wissensdatenbank hoch — die KI antwortet präzise mit deinen Informationen und deinem Stil." },
      { q: "Wie lange dauert der Start?", a: "Die meisten Unternehmen sind innerhalb weniger Tage startklar. Wir analysieren deinen Lead-Fluss, richten Kanäle und Regeln ein und aktivieren gemeinsam die KI." },
      { q: "Welche Sprachen unterstützt die KI?", a: "Die KI kommuniziert fließend auf Deutsch, Englisch, Niederländisch und Arabisch und erkennt automatisch die Sprache deines Leads." },
      { q: "Sind meine Kundendaten sicher?", a: "Ja. Deine Daten werden bei der Übertragung und Speicherung verschlüsselt, und der Zugriff wird über Rollen und Berechtigungen in deinem Arbeitsbereich gesteuert." },
      { q: "Wie funktioniert das kostenlose Admin-Testkonto?", a: "Klicke auf Jetzt starten, um sofort dein Admin-Konto inklusive kostenloser Testphase zu erstellen — mit vollem Zugriff auf alle 12 Tools, White-Label-Branding und KI-Startguthaben." },
      { q: "Sehe ich alle Ergebnisse im Dashboard?", a: "Ja. In den Analysen verfolgst du Antworten, Follow-ups, Buchungen und Umsätze jederzeit transparent in Echtzeit." },
    ],
  },
  cta: {
    badge: "Dein nächster Schritt",
    title: "Baue dein Unternehmen noch heute systematisch aus.",
    text: "Sichere dir den Zugang zum kompletten Upklick-System und nutze den bewährten Prozess, um mehr Leads in zahlende Kunden zu verwandeln.",
    primary: "Jetzt starten",
    video: "Kurzes Video ansehen",
    perks: ["Komplettsystem", "Schritt-für-Schritt-Begleitung", "Messbare Ergebnisse"],
  },
  video: {
    title: "Wie Upklick aus Leads gebuchte Termine macht",
    close: "Schließen",
    play: "Abspielen",
    pause: "Pause",
  },
  footer: {
    rights: "© 2026 Upklick — Alle Rechte vorbehalten.",
  },
};

export const landingContent: Record<"en" | "ar" | "nl" | "de", LandingCopy> = { en, ar, nl, de };
