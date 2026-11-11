export const categories = ['Funnels', 'Websites', 'Forms', 'Landing Pages', 'Booking Pages', 'CRM Pipelines', 'AI Assistants', 'AI Knowledge Packs', 'Automations', 'Products', 'Email/SMS/WhatsApp'] as const;
export type Category = typeof categories[number];
/** Admin template management is limited to the 7 core legacy sections. User-facing galleries still use `categories`. */
export const adminTemplateCategories: Category[] = ['Funnels', 'Websites', 'Forms', 'Booking Pages', 'CRM Pipelines', 'Automations', 'Products'];
export const industries = ['E-commerce', 'Fitness/Coaching', 'Real Estate', 'SaaS/Agency', 'Healthcare/Clinic', 'Professional Services'];
export const goals = ['Lead Generation', 'Direct Sale', 'Appointment Booking', 'Customer Onboarding', 'Automation Flow'];
export const destinations = ['Module template collection'];
export type Template = { id: string; name: string; description: string; category: Category; industry: string; goal: string; source: 'official' | 'team' | 'mine'; tags: string[]; updated: string; popularity: number; color: string; thumbnail?: string; destination?: string; masterId?: string; content: { headline: string; steps: string[]; settings: { enabled: boolean; language: string } } };

const preservedSeeds: [number, Category, string, string, number, number, string[]][] = [
  [6, 'Landing Pages', 'SaaS Waitlist', 'Validate your next product with a focused waitlist.', 3, 0, ['waitlist', 'startup', 'conversion']],
  [7, 'Landing Pages', 'Fitness Challenge', 'Fill your next 30-day coaching program.', 1, 1, ['challenge', 'fitness', 'enrollment']],
  [8, 'Landing Pages', 'Free Market Report', 'Exchange local insights for qualified buyer leads.', 2, 0, ['lead magnet', 'report', 'property']],
  [9, 'Booking Pages', 'Strategy Session', 'Let prospects book a high-value strategy call.', 5, 2, ['calendar', 'consultation', '30 minutes']],
  [10, 'Booking Pages', 'Clinic Appointment', 'Simplify patient scheduling and visit preparation.', 4, 2, ['patient', 'calendar', 'reminders']],
  [11, 'Booking Pages', 'Personal Training Intro', 'Match new members with the right coach.', 1, 2, ['training', 'coach', 'intro']],
  [12, 'CRM Pipelines', 'Agency Sales Pipeline', 'Move opportunities from first contact to signed deal.', 3, 0, ['sales', 'qualification', '6 stages']],
  [13, 'CRM Pipelines', 'Property Buyer Journey', 'Track viewings, offers, and closing milestones.', 2, 1, ['viewings', 'buyers', '5 stages']],
  [14, 'CRM Pipelines', 'Client Onboarding Board', 'Give every new client a consistent first experience.', 5, 3, ['handoff', 'client success', '4 stages']],
  [15, 'AI Assistants', 'Store Shopping Concierge', 'Help customers discover products and resolve questions.', 0, 1, ['support', 'recommendations', 'AI']],
  [16, 'AI Assistants', 'Lead Qualification Agent', 'Ask the right questions before your sales team steps in.', 3, 0, ['qualification', 'sales', 'AI']],
  [17, 'AI Assistants', 'Clinic Reception Assistant', 'Answer visit questions and guide appointment requests.', 4, 2, ['reception', 'booking', 'AI']],
  [18, 'AI Knowledge Packs', 'Agency Services Playbook', 'Ground your assistant in services, scope, and FAQs.', 3, 3, ['knowledge', 'services', 'FAQ']],
  [19, 'AI Knowledge Packs', 'Store Policies & Returns', 'Give consistent answers on delivery and returns.', 0, 4, ['policies', 'shipping', 'knowledge']],
  [20, 'AI Knowledge Packs', 'Coaching Program Guide', 'Equip your assistant with program and session details.', 1, 3, ['program', 'knowledge', 'FAQ']],
  [21, 'Automations', 'New Lead Welcome Flow', 'Welcome, qualify, and route every incoming lead.', 5, 4, ['workflow', 'routing', 'welcome']],
  [22, 'Automations', 'Abandoned Cart Recovery', 'Bring shoppers back with timely follow-up messages.', 0, 4, ['cart', 'recovery', '3 triggers']],
  [23, 'Automations', 'Appointment Reminder Flow', 'Reduce no-shows with a sequence of helpful reminders.', 4, 4, ['reminders', 'calendar', 'workflow']],
  [24, 'Products', 'Digital Course Bundle', 'Package lessons and resources into a ready-to-sell offer.', 1, 1, ['course', 'bundle', 'digital']],
  [25, 'Products', 'Agency Retainer', 'Standardize your recurring service subscription.', 3, 1, ['subscription', 'retainer', 'service']],
  [26, 'Products', 'Consulting Session', 'Sell a focused one-to-one expert consultation.', 5, 1, ['consulting', 'session', 'service']],
  [27, 'Email/SMS/WhatsApp', 'Welcome Email Sequence', 'Introduce your brand and guide the first next step.', 3, 3, ['email', 'welcome', '5 messages']],
  [28, 'Email/SMS/WhatsApp', 'SMS Booking Reminder', 'Keep appointments top of mind with a concise SMS.', 4, 2, ['SMS', 'reminder', 'booking']],
  [29, 'Email/SMS/WhatsApp', 'WhatsApp Lead Follow-Up', 'Re-engage interested prospects with a personal message.', 2, 0, ['WhatsApp', 'follow-up', 'leads']],
];

export const colors = [
  '#6458c9', '#367c73', '#ab6b4c', '#485785', '#8059a0', '#386b9a',
  '#EA580C', '#072A5E', '#0F5132', '#D97706', '#DC2626', '#FF5A00', '#1E293B', '#EAB308', '#111111'
];

const ghlWebAndFormMasters: Template[] = [
  {
    id: 'ghl-website-framing-construction',
    name: 'Framing Construction',
    description: 'High-contrast modern construction & structural framing website with service grids, trust stats, and project bid intake.',
    category: 'Websites',
    industry: 'Professional Services',
    goal: 'Lead Generation',
    source: 'official',
    tags: ['construction', 'framing', 'service grid', '4 pages', 'New'],
    updated: '2026-11-11',
    popularity: 142,
    color: '#EA580C',
    thumbnail: '/template-thumbnails/ghl-website-framing-construction.jpg',
    content: { headline: 'Building Strong Foundations for Every Project', steps: ['Home', 'Services', 'Projects', 'Contact'], settings: { enabled: true, language: 'en' } },
  },
  {
    id: 'ghl-website-life-insurance',
    name: 'Life Insurance',
    description: 'Corporate-grade life insurance & wealth protection website with A+ carrier trust badges, 6-service grid, and rate comparison flow.',
    category: 'Websites',
    industry: 'Professional Services',
    goal: 'Lead Generation',
    source: 'official',
    tags: ['insurance', 'financial services', 'trust badges', '4 pages', 'New'],
    updated: '2026-11-11',
    popularity: 198,
    color: '#072A5E',
    thumbnail: '/template-thumbnails/ghl-website-life-insurance.jpg',
    content: { headline: 'Secure Your Future With Ease.', steps: ['Home', 'Coverage Plans', 'Advisors', 'Contact'], settings: { enabled: true, language: 'en' } },
  },
  {
    id: 'ghl-website-pharmacy',
    name: 'Pharmacy',
    description: 'Clean minimalist medical & neighborhood pharmacy website with 60-second Rx transfer highlights, immunizations, and free local delivery.',
    category: 'Websites',
    industry: 'Healthcare/Clinic',
    goal: 'Appointment Booking',
    source: 'official',
    tags: ['healthcare', 'pharmacy', 'rx transfer', '4 pages'],
    updated: '2026-11-10',
    popularity: 39,
    color: '#0F5132',
    thumbnail: '/template-thumbnails/ghl-website-pharmacy.jpg',
    content: { headline: 'Prescriptions made simple. Care that feels personal.', steps: ['Home', 'Pharmacy Services', 'Immunizations', 'Contact & Hours'], settings: { enabled: true, language: 'en' } },
  },
  {
    id: 'ghl-funnel-mortgage-company',
    name: 'Mortgage Company',
    description: 'Step-by-step mortgage & real estate pre-qualification lead funnel with affordability tiers, soft-pull assurance, and loan officer booking.',
    category: 'Funnels',
    industry: 'Real Estate',
    goal: 'Lead Generation',
    source: 'official',
    tags: ['mortgage', 'real estate', 'pre-qualification', '4 steps'],
    updated: '2026-11-11',
    popularity: 219,
    color: '#D97706',
    thumbnail: '/template-thumbnails/ghl-funnel-mortgage-company.jpg',
    content: { headline: 'Get Your Free Mortgage Pre-Qualification.', steps: ['Pre-Qualification Offer', 'Buying Power Assessment', 'Loan Officer Strategy Call', 'Pre-Qualification Summary'], settings: { enabled: true, language: 'en' } },
  },
  {
    id: 'ghl-funnel-brake-muffler',
    name: 'Brake & Muffler',
    description: 'High-converting local auto repair & brake service funnel featuring a $0 multi-point brake check voucher and instant bay booking.',
    category: 'Funnels',
    industry: 'Professional Services',
    goal: 'Appointment Booking',
    source: 'official',
    tags: ['auto service', 'brake & muffler', 'local booking', '3 steps'],
    updated: '2026-11-10',
    popularity: 381,
    color: '#DC2626',
    thumbnail: '/template-thumbnails/ghl-funnel-brake-muffler.jpg',
    content: { headline: 'FREE BRAKE INSPECTION', steps: ['Free Brake Inspection Offer', 'Reserve Service Bay', 'Bay Confirmation & Coupon'], settings: { enabled: true, language: 'en' } },
  },
  {
    id: 'ghl-funnel-locksmith',
    name: 'Locksmith',
    description: 'Dark-mode high-urgency 24/7 emergency locksmith conversion funnel with click-to-call dispatch, ~15 min arrival stats, and GPS callback pin.',
    category: 'Funnels',
    industry: 'Professional Services',
    goal: 'Lead Generation',
    source: 'official',
    tags: ['locksmith', 'emergency dispatch', 'click-to-call', '3 steps'],
    updated: '2026-11-11',
    popularity: 558,
    color: '#FF5A00',
    thumbnail: '/template-thumbnails/ghl-funnel-locksmith.jpg',
    content: { headline: "Locked out? We'll get you back in — fast.", steps: ['24/7 Emergency Dispatch', 'Instant Technician Pin', 'Live ETA Confirmation'], settings: { enabled: true, language: 'en' } },
  },
  {
    id: 'ghl-form-flooring-quote',
    name: 'Flooring Quote - Classic',
    description: 'Clean structured residential & commercial flooring estimator form with address capture, material selector, and square-footage scoping.',
    category: 'Forms',
    industry: 'Real Estate',
    goal: 'Lead Generation',
    source: 'official',
    tags: ['flooring', 'quote estimator', 'home services', '11 fields'],
    updated: '2026-11-11',
    popularity: 4309,
    color: '#1E293B',
    thumbnail: '/template-thumbnails/ghl-form-flooring-quote.jpg',
    content: { headline: 'Get Your Free Flooring Quote', steps: ['Contact & Property Address', 'Flooring Material Selection', 'Project Scope & Size'], settings: { enabled: true, language: 'en' } },
  },
  {
    id: 'ghl-form-personal-trainer',
    name: 'Personal Trainer',
    description: 'High-energy athletic fitness assessment & workout blueprint intake form with goal profiling, injury screening, and SMS compliance opt-ins.',
    category: 'Forms',
    industry: 'Fitness/Coaching',
    goal: 'Appointment Booking',
    source: 'official',
    tags: ['fitness', 'personal trainer', 'assessment', '8 fields'],
    updated: '2026-11-10',
    popularity: 2181,
    color: '#EAB308',
    thumbnail: '/template-thumbnails/ghl-form-personal-trainer.jpg',
    content: { headline: "LET'S BUILD YOUR WORKOUT BLUEPRINT.", steps: ['Athlete Baseline', 'Goals & Injury Screen', 'Assessment Opt-In'], settings: { enabled: true, language: 'en' } },
  },
  {
    id: 'ghl-form-architecture-studio',
    name: 'Architecture Studio',
    description: 'Sleek editorial architectural & interior studio consultation form featuring project typology, budget range, and timeline selectors.',
    category: 'Forms',
    industry: 'Professional Services',
    goal: 'Lead Generation',
    source: 'official',
    tags: ['architecture', 'studio consultation', 'project scope', '9 fields'],
    updated: '2026-11-11',
    popularity: 2588,
    color: '#111111',
    thumbnail: '/template-thumbnails/ghl-form-architecture-studio.jpg',
    content: { headline: 'Every great space starts with a conversation.', steps: ['Client & Site Location', 'Project Type & Budget', 'Vision Brief'], settings: { enabled: true, language: 'en' } },
  },
];

export const MASTER_TEMPLATES: Template[] = [
  ...ghlWebAndFormMasters,
  ...preservedSeeds.map(([i, category, name, description, niche, goal, tags]) => ({
    id: 'master-' + i,
    name,
    description,
    category,
    industry: industries[niche],
    goal: goals[goal],
    tags,
    source: (i % 7 === 5 ? 'team' : 'official') as Template['source'],
    updated: '2026-10-' + String(7 - (i % 7)).padStart(2, '0'),
    popularity: 2400 - i * 47,
    color: colors[i % 6],
    content: {
      headline: name,
      steps:
        category === 'CRM Pipelines'
          ? ['New lead', 'Qualified', 'Proposal', 'Won']
          : category === 'Automations'
            ? ['Trigger received', 'Check conditions', 'Send message', 'Assign owner']
            : ['Welcome', 'Explore offer', 'Take action'],
      settings: { enabled: false, language: 'en' },
    },
  })),
];

export const systemCategory: Record<Category, string> = {
  Funnels: 'Funnel',
  Websites: 'Website',
  Forms: 'Form',
  'Landing Pages': 'Landing Page',
  'Booking Pages': 'Booking Page',
  'CRM Pipelines': 'CRM Pipeline',
  'AI Assistants': 'AI Assistant',
  'AI Knowledge Packs': 'AI Knowledge Pack',
  Automations: 'Automation',
  Products: 'Product Layout',
  'Email/SMS/WhatsApp': 'Email',
};

export function systemAssetCategory(template: Template): string {
  return template.category === 'Email/SMS/WhatsApp'
    ? template.tags.includes('SMS')
      ? 'SMS'
      : template.tags.includes('WhatsApp')
        ? 'WhatsApp'
        : 'Email'
    : systemCategory[template.category];
}
