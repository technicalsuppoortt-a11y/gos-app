import type { BuilderDocument, BuilderPage, BuilderSection, FunnelStep } from './BuilderWorkspace';

export type FormFieldType = 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  placeholder?: string;
  helperText?: string;
  defaultValue?: string;
};

export type FormBackgroundPreset = {
  id: string;
  name: string;
  description: string;
  background: string;
  cardBackground: string;
  cardBorder: string;
  textColor: string;
  previewBg: string;
  previewBorder: string;
  isDark?: boolean;
};

export const FORM_BACKGROUND_PRESETS: FormBackgroundPreset[] = [
  {
    id: 'blank',
    name: 'Blank / Clean White',
    description: 'Minimalist white canvas, perfect for embeds and clean looks',
    background: '#ffffff',
    cardBackground: '#ffffff',
    cardBorder: '1px solid #e2e8f0',
    textColor: '#0f172a',
    previewBg: '#ffffff',
    previewBorder: '#cbd5e1',
    isDark: false
  },
  {
    id: 'slate-glow',
    name: 'Modern Slate & Glow',
    description: 'Deep dark mode with ambient indigo radial illumination',
    background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.22), transparent 60%), #090d16',
    cardBackground: 'rgba(15, 23, 42, 0.85)',
    cardBorder: '1px solid rgba(99, 102, 241, 0.25)',
    textColor: '#f8fafc',
    previewBg: '#090d16',
    previewBorder: '#6366f1',
    isDark: true
  },
  {
    id: 'soft-mesh',
    name: 'Soft Mesh Gradient',
    description: 'Delicate pastel gradient with smooth modern light ambiance',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #fae8ff 50%, #e0f2fe 100%)',
    cardBackground: 'rgba(255, 255, 255, 0.92)',
    cardBorder: '1px solid rgba(226, 232, 240, 0.8)',
    textColor: '#0f172a',
    previewBg: 'linear-gradient(135deg, #e0e7ff, #fbcfe8)',
    previewBorder: '#c7d2fe',
    isDark: false
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    description: 'Deep tech gradient with vivid emerald and purple accents',
    background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 55%, #064e3b 100%)',
    cardBackground: 'rgba(15, 23, 42, 0.85)',
    cardBorder: '1px solid rgba(52, 211, 153, 0.3)',
    textColor: '#f8fafc',
    previewBg: 'linear-gradient(135deg, #1e1b4b, #064e3b)',
    previewBorder: '#34d399',
    isDark: true
  },
  {
    id: 'frosted-glass',
    name: 'Frosted Glassmorphism',
    description: 'Translucent glass card on a soft fluid ambient background',
    background: 'radial-gradient(at 100% 0%, #c7d2fe 0px, transparent 50%), radial-gradient(at 0% 100%, #fbcfe8 0px, transparent 50%), #f8fafc',
    cardBackground: 'rgba(255, 255, 255, 0.75)',
    cardBorder: '1px solid rgba(255, 255, 255, 0.65)',
    textColor: '#0f172a',
    previewBg: 'linear-gradient(135deg, #e2e8f0, #e0e7ff)',
    previewBorder: '#cbd5e1',
    isDark: false
  },
  {
    id: 'tech-grid',
    name: 'Technical SaaS Grid',
    description: 'Sleek dark engineering aesthetic with fine contrast',
    background: '#0b0f19',
    cardBackground: '#111827',
    cardBorder: '1px solid #1f2937',
    textColor: '#f9fafb',
    previewBg: '#111827',
    previewBorder: '#374151',
    isDark: true
  },
  {
    id: 'warm-neutral',
    name: 'Warm Neutral Oatmeal',
    description: 'Organic warmth for lifestyle, clinics, wellness and creators',
    background: '#fcfaf6',
    cardBackground: '#ffffff',
    cardBorder: '1px solid #e7e5e4',
    textColor: '#1c1917',
    previewBg: '#fcfaf6',
    previewBorder: '#d6d3d1',
    isDark: false
  }
];

export type PageTemplate = {
  builderDocument?: BuilderDocument;
  mode: 'funnel' | 'website' | 'form';
  id: string;
  name: string;
  description?: string;
  categoryLabel?: string;
  /** Language of the copy inside the template ('ar' renders right-to-left). */
  contentLanguage?: 'ar' | 'en';
  industry: string;
  goal: string;
  title: string;
  body: string;
  cta: string;
  color: string;
  image: string;
  /** Admin-managed gallery image. Only used on template cards, never inside the page. */
  thumbnail?: string;
  popularity?: number;
  tags?: string[];
  benefits?: string[];
  fields?: FormField[];
  backgroundPreset?: string;
  backgroundColor?: string;
};

const sec = (
  id: string,
  type: BuilderSection['type'],
  title: string,
  body = '',
  content: Record<string, string> = {},
  styles: Partial<BuilderSection['styles']> = {},
  children?: BuilderSection[][]
): BuilderSection => ({
  id,
  type,
  content: { title, body, ...content },
  styles: {
    backgroundColor: styles.backgroundColor ?? '#ffffff',
    padding: styles.padding ?? '32',
    textAlign: styles.textAlign ?? (['Stats', 'Program Cards', 'Testimonials', 'Pricing', 'Core Values'].includes(type) ? 'Center' : 'Left'),
    typography: styles.typography ?? 'Default',
    customCss: styles.customCss ?? '',
    visibility: styles.visibility ?? 'All devices',
    animation: styles.animation ?? 'None',
  },
  ...(children ? { children } : {}),
});

const cols3 = (idPrefix: string, cards: [string, string][], bg = '#ffffff'): BuilderSection =>
  sec(
    `${idPrefix}-cols`,
    'Columns',
    '',
    '',
    { columnLayout: '3 Col (33/33/33)', gap: '20' },
    { backgroundColor: bg, padding: '28' },
    cards.map(([h, p], i) => [
      sec(`${idPrefix}-h-${i}`, 'Heading', h, '', { headingTag: 'H3' }, { backgroundColor: bg, padding: '8' }),
      sec(`${idPrefix}-p-${i}`, 'Paragraph', '', p, {}, { backgroundColor: bg, padding: '8' }),
    ])
  );

function buildFormDoc(
  id: string,
  name: string,
  title: string,
  body: string,
  cta: string,
  color: string,
  fields: FormField[],
  pageBg: string,
  cardBg: string,
  cardBorder: string,
  textColor: string,
  presetId: string
): BuilderDocument {
  const page: BuilderPage = {
    id: `${id}-page`,
    name: 'Form Page',
    status: 'Draft',
    path: '/',
    seoTitle: name,
    seoDescription: body,
    headline: title,
    subheadline: body,
    cta,
    showHeader: false,
    header: 'Minimal header',
    showFooter: false,
    footer: 'Minimal footer',
    featuredImage: '',
    backgroundColor: pageBg,
    isFunnelStep: false,
    sections: [
      sec(
        `${id}-form-section`,
        'Form',
        title,
        body,
        {
          title,
          body,
          button: cta,
          customFields: JSON.stringify(fields),
          fields: '[]',
          themeBackgroundId: presetId,
          themeCardBg: cardBg,
          themeCardBorder: cardBorder,
          themeTextColor: textColor,
          successMessage: 'Thank you! Your details have been received and a specialist will follow up shortly.',
        },
        { backgroundColor: cardBg, padding: '32' }
      ),
    ],
  };
  return {
    pages: [page],
    steps: [],
    funnel: {
      name,
      goal: 'Lead Generation',
      audience: 'Qualified prospects',
      offer: name,
      pagesFlow: [],
      events: ['Form Submit'],
      status: 'Draft',
    },
    theme: { color, font: 'Inter', corners: 'Rounded' },
  };
}

// ---------------------------------------------------------------------------
// 1. WEBSITES (3 GoHighLevel-Standard Multi-Page Templates)
// ---------------------------------------------------------------------------

const framingWebsiteDoc: BuilderDocument = {
  theme: { color: '#EA580C', font: 'Manrope', corners: 'Square' },
  steps: [],
  funnel: {
    name: 'Framing Construction',
    goal: 'Lead Generation',
    audience: 'General contractors, custom home builders, and commercial developers',
    offer: 'Structural Framing & Commercial Shell Bid',
    pagesFlow: ['framing-home', 'framing-services', 'framing-projects', 'framing-contact'],
    events: ['Form Submit', 'Booking'],
    status: 'Draft',
  },
  pages: [
    {
      id: 'framing-home',
      name: 'Home',
      status: 'Draft',
      path: '/',
      seoTitle: 'Framing Construction — Structural Wood & Steel Framing Contractors',
      seoDescription: 'Precision residential, multi-family, and commercial structural framing delivered on schedule.',
      headline: 'Building Strong Foundations for Every Project',
      subheadline: 'Precision structural wood & steel framing, custom residential shells, and commercial developments engineered to pass inspection the first time.',
      cta: 'Request a Project Bid',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '/template-thumbnails/ghl-website-framing-construction-hero.jpg',
      backgroundColor: '#ffffff',
      sections: [
        sec('framing-hero', 'Hero', 'Building Strong Foundations for Every Project', 'Precision structural wood & steel framing, custom residential shells, and commercial developments engineered to pass inspection the first time.', {
          button: 'Request a Project Bid',
          destinationType: 'Scroll to Section',
          destination: 'framing-bid-form',
        }, { backgroundColor: '#0B1D3A', padding: '44' }),
        sec('framing-stats', 'Stats', 'Proven Structural Track Record', 'Trusted by premier custom builders and commercial general contractors.', {
          items: '480+ Structures Framed · 99.4% On-Schedule Delivery · 25+ Years Field Experience · Zero OSHA Lost-Time Incidents',
        }, { backgroundColor: '#F8FAFC', padding: '28' }),
        sec('framing-story', 'Brand Story', 'Crafting Strong Foundations With Precision And Pride', 'From blueprint takeoff to roof truss dry-in, our dedicated framing crews deliver plumb walls, laser-level subfloors, and clean job sites that keep every downstream trade ahead of schedule.', {
          image: '/template-thumbnails/ghl-website-framing-construction-hero.jpg',
          alt: 'Structural framing crew inspecting blueprints on site',
        }),
        cols3('framing-pillars', [
          ['Residential Custom Framing', 'Complex architectural rooflines, vaulted timber ceilings, and luxury custom home shells framed to millimeter tolerances.'],
          ['Commercial & Multi-Family', 'High-velocity podium, townhome, and light-gauge steel structural framing backed by dedicated site superintendents.'],
          ['Turnkey Truss & Lumber Takeoff', 'Complete engineered lumber packages, crane scheduling, and value-engineered structural takeoffs before mobilization.'],
        ], '#FFF7ED'),
        sec('framing-services-cards', 'Program Cards', 'Building Excellence, One Frame At A Time', 'Comprehensive structural scopes engineered for speed, safety, and code compliance.', {
          eyebrow: 'Our Services Overview',
          media: 'numbered',
          items: 'Wood & Timber Framing · Light-Gauge Steel Studs · Engineered Roof & Floor Trusses',
          specs: 'Dedicated crew lead · Laser-leveled plates · Full structural hardware schedule',
          button: 'Explore Scopes',
        }),
        sec('framing-testimonials', 'Testimonials', 'What General Contractors Say', '', {
          testimonials: JSON.stringify([
            { id: 'fc-t1', author: 'Marcus Vance', role: 'VP of Construction, Apex Custom Homes', quote: 'Their framing crew dried in our 6,400 sq. ft. custom build four days ahead of schedule. Every wall was dead plumb—our drywall and cabinetry subs noticed immediately.', rating: 5, avatar: '' },
            { id: 'fc-t2', author: 'Elena Rostova', role: 'Senior Project Manager, Crestline Commercial', quote: 'Accurate lumber takeoffs, clean safety compliance, and zero change-order surprises across three multi-family phases.', rating: 5, avatar: '' },
          ]),
        }, { backgroundColor: '#F8FAFC', padding: '32' }),
        sec('framing-bid-form', 'Form', 'Submit Plans & Request a Framing Estimate', 'Share your project location, square footage, and target mobilization window—our estimating desk responds within 24 business hours.', {
          button: 'Request Project Estimate',
          fields: JSON.stringify(['Name', 'Email', 'Phone', 'Message']),
          successMessage: 'Thank you! Our structural estimating team has received your inquiry and will follow up within 1 business day.',
        }),
      ],
    },
    {
      id: 'framing-services',
      name: 'Services',
      status: 'Draft',
      path: '/services',
      seoTitle: 'Structural Framing Services & Capabilities',
      seoDescription: 'Custom home framing, commercial shell construction, roof trusses, and structural retrofits.',
      headline: 'Complete Structural Framing Capabilities',
      subheadline: 'Engineered wood, heavy timber, and commercial steel framing under one roof.',
      cta: 'Request a Project Bid',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '/template-thumbnails/ghl-website-framing-construction-hero.jpg',
      sections: [
        sec('framing-srv-head', 'Heading', 'Structural Scopes Built for Demanding Schedules', 'Every phase inspected by our senior field superintendent before handoff.', { headingTag: 'H1' }),
        cols3('framing-srv-grid', [
          ['Custom Residential Shells', 'Multi-story framing, cantilevered decks, architectural dormers, and coastal shear-wall packages.'],
          ['Multi-Family & Podium Builds', 'Repeatable production framing with strict quality checklists and crane-assisted panelized assembly.'],
          ['Structural Additions & Retrofits', 'Load-bearing beam installations, LVL/Glulam headers, and seismic structural reinforcement.'],
        ]),
      ],
    },
    {
      id: 'framing-projects',
      name: 'Projects',
      status: 'Draft',
      path: '/projects',
      seoTitle: 'Featured Framing Projects',
      seoDescription: 'Recent commercial and custom residential framing completions.',
      headline: 'Recent Structural Completions',
      subheadline: 'Explore residential estates, townhome communities, and commercial shells framed by our crews.',
      cta: 'Schedule Site Walk',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '/template-thumbnails/ghl-website-framing-construction-hero.jpg',
      sections: [
        sec('framing-proj-cards', 'Program Cards', 'Representative Portfolio', 'On-budget structural execution across residential and commercial sectors.', {
          eyebrow: 'Featured Projects',
          media: 'numbered',
          items: 'Oakridge 48-Unit Townhomes · Highland Modern Timber Estate · Westgate Medical Retail Shell',
          specs: 'Completed 2 weeks early · Engineered Glulam package · Light-gauge steel & truss hybrid',
          button: 'Request References',
        }),
      ],
    },
    {
      id: 'framing-contact',
      name: 'Contact',
      status: 'Draft',
      path: '/contact',
      seoTitle: 'Contact Estimating — Framing Construction',
      seoDescription: 'Send architectural drawings or schedule a pre-construction walkthrough.',
      headline: 'Send Plans to Our Estimating Desk',
      subheadline: 'Direct bid coordination for builders, architects, and property developers.',
      cta: 'Request Bid',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '',
      sections: [
        sec('framing-loc', 'Location & Hours', 'Regional Operations & Yard', '1420 Industrial Parkway, Suite 200 · Mon–Fri 6:30 AM – 5:30 PM'),
        sec('framing-faq', 'FAQ', 'Pre-Construction FAQs', 'Do you supply lumber and trusses or labor-only? We offer both turnkey material + labor packages and labor-only structural contracts depending on GC preference.'),
      ],
    },
  ],
};

const lifeInsuranceWebsiteDoc: BuilderDocument = {
  theme: { color: '#072A5E', font: 'Manrope', corners: 'Rounded' },
  steps: [],
  funnel: {
    name: 'Life Insurance',
    goal: 'Lead Generation',
    audience: 'Families, homeowners, and business owners planning long-term financial protection',
    offer: 'Personalized Coverage Comparison & Advisor Review',
    pagesFlow: ['ins-home', 'ins-coverage', 'ins-advisors', 'ins-contact'],
    events: ['Form Submit', 'Booking'],
    status: 'Draft',
  },
  pages: [
    {
      id: 'ins-home',
      name: 'Home',
      status: 'Draft',
      path: '/',
      seoTitle: 'Life Insurance & Financial Protection — Secure Your Future With Ease',
      seoDescription: 'Compare A+ rated term life, whole life, mortgage protection, and retirement solutions tailored to your family.',
      headline: 'Secure Your Future With Ease.',
      subheadline: 'Protect the people who matter most with transparent, A+ rated term life, whole life, and wealth-transfer strategies designed around every stage of life.',
      cta: 'Get My Free Quote',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '/template-thumbnails/ghl-website-life-insurance-hero.jpg',
      backgroundColor: '#ffffff',
      sections: [
        sec('ins-hero', 'Hero', 'Secure Your Future With Ease.', 'Protect the people who matter most with transparent, A+ rated term life, whole life, and wealth-transfer strategies designed around every stage of life.', {
          button: 'Get My Free Quote',
          destinationType: 'Scroll to Section',
          destination: 'ins-quote-form',
        }, { backgroundColor: '#072A5E', padding: '44' }),
        sec('ins-stats', 'Stats', 'Backed by A+ Rated Financial Strength', 'Independent fiduciary guidance across 30+ top-rated national carriers.', {
          items: '50,000+ Families Protected · A+ Superior Rated Carriers · 10-Min No-Exam Options · 99.1% Claims Satisfaction',
        }, { backgroundColor: '#FDF6EC', padding: '28' }),
        cols3('ins-services-row1', [
          ['Term Life Insurance', 'Affordable 10, 20, and 30-year level-premium protection engineered to safeguard income and family milestones.'],
          ['Whole & Universal Life', 'Lifelong coverage with guaranteed cash-value accumulation and tax-advantaged legacy planning.'],
          ['Mortgage & Income Shield', 'Ensure your family keeps their home and standard of living if the unexpected ever happens.'],
        ], '#ffffff'),
        cols3('ins-services-row2', [
          ['Retirement & Fixed Annuities', 'Principal-protected income streams built for predictable, market-resilient retirement confidence.'],
          ['Key Person & Buy-Sell Cover', 'Continuity policies designed for founders, medical practices, and closely held partnerships.'],
          ['Children’s Head-Start Policies', 'Lock in lifelong insurability and early compounding cash value for children and grandchildren.'],
        ], '#FDF6EC'),
        sec('ins-steps', 'Program Cards', 'Secure Tomorrow, Enjoy Today', 'Three clear steps from side-by-side carrier comparison to active family protection.', {
          eyebrow: 'How It Works',
          media: 'numbered',
          items: '1. Compare 30+ A+ Carriers · 2. Customize Coverage & Riders · 3. Instant Digital Approval',
          specs: 'Zero broker fees · Living benefits included · Annual policy checkups',
          button: 'Compare Rates Now',
        }),
        sec('ins-testimonials', 'Testimonials', 'Trusted by Families Across Every Chapter', '', {
          testimonials: JSON.stringify([
            { id: 'ins-t1', author: 'David & Claire Bennett', role: 'Homeowners & Parents of Two', quote: 'In one 20-minute call we locked in $1.5M of 30-year term coverage with living benefits for less than we expected—without medical-exam delays.', rating: 5, avatar: '' },
            { id: 'ins-t2', author: 'Dr. Nadia Mansour', role: 'Clinic Founder', quote: 'Our advisor structured both our family estate policy and our clinic buy-sell coverage with total clarity and zero pressure.', rating: 5, avatar: '' },
          ]),
        }, { backgroundColor: '#F8FAFC', padding: '32' }),
        sec('ins-quote-form', 'Form', 'Request Your Personalized Coverage Comparison', 'Tell us your coverage goals and our licensed advisor will prepare side-by-side rates from A+ rated carriers.', {
          button: 'See My Personalized Rates',
          fields: JSON.stringify(['Name', 'Email', 'Phone', 'Message']),
          successMessage: 'Your coverage request is confirmed! A licensed senior advisor will send your tailored comparison shortly.',
        }),
      ],
    },
    {
      id: 'ins-coverage',
      name: 'Coverage Plans',
      status: 'Draft',
      path: '/coverage',
      seoTitle: 'Term Life, Whole Life & Wealth Protection Plans',
      seoDescription: 'Explore transparent life insurance and annuity options.',
      headline: 'Coverage Tailored to Every Life Milestone',
      subheadline: 'Side-by-side policy architecture with living benefits and flexible riders.',
      cta: 'Compare Rates',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '/template-thumbnails/ghl-website-life-insurance-hero.jpg',
      sections: [
        sec('ins-pricing', 'Pricing', 'Sample Monthly Coverage Benchmarks', 'Illustrative preferred non-tobacco monthly rates—customized to your exact profile.', {
          plans: JSON.stringify([
            { id: 'ins-p1', name: 'Essential Term ($500K)', price: '26', period: 'month', features: ['20-Year Level Premium', 'Accelerated Living Benefits', 'No-Exam Eligibility up to Age 55', 'Convertible to Permanent Cover'], button: 'Check Eligibility', highlighted: false },
            { id: 'ins-p2', name: 'Family Shield ($1M)', price: '44', period: 'month', features: ['30-Year Income & Mortgage Lock', 'Chronic & Critical Illness Rider', 'A+ Carrier Comparison Included', 'Dedicated Annual Policy Review'], button: 'Get Exact Rate', highlighted: true },
            { id: 'ins-p3', name: 'Legacy Whole Life', price: '165', period: 'month', features: ['Guaranteed Lifelong Protection', 'Tax-Deferred Cash Value Growth', 'Fixed Never-Increasing Premiums', 'Estate & Trust Structuring'], button: 'Speak With Advisor', highlighted: false },
          ]),
        }),
      ],
    },
    {
      id: 'ins-advisors',
      name: 'Advisors',
      status: 'Draft',
      path: '/advisors',
      seoTitle: 'Meet Our Licensed Fiduciary Advisors',
      seoDescription: 'Independent insurance specialists working exclusively in your best interest.',
      headline: 'Independent Advisors, Never Captive Salespeople',
      subheadline: 'We shop over 30 top-rated carriers so your policy fits both your family and your budget.',
      cta: 'Book Advisor Call',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '',
      sections: [
        sec('ins-team', 'Team', 'Senior Protection & Legacy Specialists', 'Licensed independent advisors with 15+ years in risk and estate architecture.', {
          items: 'Jonathan Sterling, CLU · Managing Principal  |  Hannah Alverez, CFP · Family Protection Director  |  Tariq Haddad · Business Continuity Specialist',
        }),
      ],
    },
    {
      id: 'ins-contact',
      name: 'Contact',
      status: 'Draft',
      path: '/contact',
      seoTitle: 'Schedule a Private Policy Review',
      seoDescription: 'Book a no-obligation 15-minute phone or video review.',
      headline: 'Questions About Existing or New Coverage?',
      subheadline: 'Schedule a complimentary policy audit with a licensed advisor.',
      cta: 'Book Review',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '',
      sections: [
        sec('ins-booking', 'Booking', 'Book a 15-Minute Coverage Strategy Call', 'Choose a convenient window for a pressure-free phone or Zoom consultation.', {
          calendar: 'Advisor Consultations',
          serviceType: 'Policy Strategy Review · 15 minutes',
          timeSlots: 'Today · 2:00 PM,Tomorrow · 10:30 AM,Thursday · 4:00 PM',
          button: 'Confirm Consultation',
          bookingMode: 'step',
        }),
      ],
    },
  ],
};

const pharmacyWebsiteDoc: BuilderDocument = {
  theme: { color: '#0F5132', font: 'Inter', corners: 'Rounded' },
  steps: [],
  funnel: {
    name: 'Pharmacy',
    goal: 'Appointment Booking',
    audience: 'Local patients, families, and chronic-care households seeking attentive neighborhood pharmacy care',
    offer: '60-Second Prescription Transfer & Same-Day Delivery',
    pagesFlow: ['rx-home', 'rx-services', 'rx-vaccines', 'rx-contact'],
    events: ['Form Submit', 'Booking'],
    status: 'Draft',
  },
  pages: [
    {
      id: 'rx-home',
      name: 'Home',
      status: 'Draft',
      path: '/',
      seoTitle: 'Neighborhood Pharmacy — Prescriptions Made Simple, Care That Feels Personal',
      seoDescription: 'Fast prescription refills, effortless transfers, immunizations, and free same-day home delivery.',
      headline: 'Prescriptions made simple. Care that feels personal.',
      subheadline: 'Refill in seconds, transfer prescriptions without calling your old pharmacy, and enjoy free same-day courier delivery from pharmacists who know you by name.',
      cta: 'Transfer a Prescription',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '/template-thumbnails/ghl-website-pharmacy-hero.jpg',
      backgroundColor: '#ffffff',
      sections: [
        sec('rx-hero', 'Hero', 'Prescriptions made simple. Care that feels personal.', 'Refill in seconds, transfer prescriptions without calling your old pharmacy, and enjoy free same-day courier delivery from pharmacists who know you by name.', {
          button: 'Transfer a Prescription',
          destinationType: 'Scroll to Section',
          destination: 'rx-transfer-form',
        }, { backgroundColor: '#0F5132', padding: '44' }),
        cols3('rx-quick-actions', [
          ['60-Second Rx Transfer', 'Share your current pharmacy details once—our clinical team handles every doctor and insurance call for you.'],
          ['Free Same-Day Delivery', 'Temperature-safe courier delivery straight to your doorstep at zero extra cost on eligible prescriptions.'],
          ['1-on-1 Pharmacist Guidance', 'Direct medication reviews, copay savings lookups, and proactive refill synchronization every month.'],
        ], '#ECFDF5'),
        sec('rx-services', 'Program Cards', 'Everything You Need In One Neighborhood Pharmacy', 'Clinical precision paired with warm, unhurried patient support.', {
          eyebrow: 'Pharmacy Services',
          media: 'numbered',
          items: 'Auto-Sync Monthly Refills · Walk-In Immunizations · Custom Medication Compounding',
          specs: 'All major insurance & Medicare Part D accepted · Blister compliance packaging · Text refill alerts',
          button: 'Explore Clinical Services',
        }),
        sec('rx-story', 'Brand Story', 'A Pharmacy That Treats You Like A Neighbor', 'Tired of 45-minute hold times and out-of-stock surprises at big-box chains? Most prescriptions are filled in under 12 minutes, and our pharmacists proactively check manufacturer copay cards to lower your out-of-pocket cost.', {
          image: '/template-thumbnails/ghl-website-pharmacy-hero.jpg',
          alt: 'Pharmacist consulting warmly with patient at counter',
        }, { backgroundColor: '#F8FAFC', padding: '32' }),
        sec('rx-testimonials', 'Testimonials', 'Loved by Local Patients & Physicians', '', {
          testimonials: JSON.stringify([
            { id: 'rx-t1', author: ' Margaret Holloway', role: 'Local Patient', quote: 'Switching all four of my family’s prescriptions took two minutes online, and they saved me $68 a month on my inhaler copay on day one!', rating: 5, avatar: '' },
            { id: 'rx-t2', author: 'Dr. Amir Soliman, MD', role: 'Internal Medicine Physician', quote: 'My patients rave about their Med-Sync blister packs and free home delivery. Adherence has improved dramatically.', rating: 5, avatar: '' },
          ]),
        }),
        sec('rx-transfer-form', 'Form', 'Transfer or Refill Your Prescription Online', 'Enter your contact info and current pharmacy name—our licensed pharmacist will verify insurance and text you as soon as your medication is ready.', {
          button: 'Start Free Rx Transfer',
          fields: JSON.stringify(['Name', 'Email', 'Phone', 'Message']),
          successMessage: 'Received! Our pharmacy desk is coordinating your prescription transfer now and will text you shortly.',
        }, { backgroundColor: '#ECFDF5', padding: '32' }),
      ],
    },
    {
      id: 'rx-services',
      name: 'Pharmacy Services',
      status: 'Draft',
      path: '/services',
      seoTitle: 'Clinical Pharmacy Services, Med-Sync & Compounding',
      seoDescription: 'Medication synchronization, custom compounding, and Medicare Part D consultations.',
      headline: 'Complete Clinical & Wellness Services',
      subheadline: 'Personalized care plans, compliance packaging, and custom formulations.',
      cta: 'Speak With a Pharmacist',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '/template-thumbnails/ghl-website-pharmacy-hero.jpg',
      sections: [
        cols3('rx-srv-cols', [
          ['Med-Sync & Multi-Dose Packs', 'Align every monthly prescription to a single pickup or delivery date, sorted clearly by morning, noon, and evening.'],
          ['Custom Pediatric & Pet Compounding', 'Dye-free liquid suspensions, topical pain creams, and bespoke dosages prepared in our sterile lab.'],
          ['Annual Medicare & Copay Audits', 'Side-by-side formulary checks to minimize deductibles and uncover manufacturer savings programs.'],
        ]),
      ],
    },
    {
      id: 'rx-vaccines',
      name: 'Immunizations',
      status: 'Draft',
      path: '/immunizations',
      seoTitle: 'Walk-In & Scheduled Immunizations',
      seoDescription: 'Flu, COVID-19, Shingles, RSV, Pneumonia, and travel vaccinations.',
      headline: 'Quick, Gentle Immunizations With Zero Wait',
      subheadline: 'Reserve a 10-minute vaccine slot for yourself or your whole family.',
      cta: 'Book Vaccine Slot',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '',
      sections: [
        sec('rx-booking', 'Booking', 'Schedule an Immunization or Pharmacist Consult', 'Covered at $0 copay under most commercial insurance and Medicare plans.', {
          calendar: 'Clinical Care Desk',
          serviceType: 'Immunization / Medication Consult · 15 minutes',
          timeSlots: 'Today · 11:30 AM,Today · 3:15 PM,Tomorrow · 9:30 AM',
          button: 'Confirm Pharmacy Visit',
          bookingMode: 'step',
        }),
      ],
    },
    {
      id: 'rx-contact',
      name: 'Contact & Hours',
      status: 'Draft',
      path: '/contact',
      seoTitle: 'Pharmacy Location, Delivery Zone & Hours',
      seoDescription: 'Visit our counter, use drive-thru pickup, or schedule free local delivery.',
      headline: 'Visit Us or Request Free Same-Day Delivery',
      subheadline: 'Convenient drive-thru window and dedicated parking right out front.',
      cta: 'Call Pharmacy',
      showHeader: true,
      header: 'Header 1',
      showFooter: true,
      footer: 'Footer 1',
      featuredImage: '',
      sections: [
        sec('rx-loc', 'Location & Hours', 'Pharmacy Counter & Drive-Thru', '410 Elmwood Medical Plaza · Mon–Fri 8:00 AM – 7:00 PM · Sat 9:00 AM – 3:00 PM'),
        sec('rx-faq', 'FAQ', 'Prescription & Insurance FAQs', 'Do I need to call my old pharmacy to transfer? Never—just submit our 60-second transfer form and our pharmacist handles everything seamlessly.'),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. FUNNELS (3 GoHighLevel-Standard Multi-Step Conversion Funnels)
// ---------------------------------------------------------------------------

const mortgageSteps: FunnelStep[] = [
  { id: 'step-prequal', label: '1. Pre-Qualification Offer', pageId: 'mortgage-landing', type: 'Landing' },
  { id: 'step-quiz', label: '2. Buying Power Assessment', pageId: 'mortgage-quiz', type: 'Form' },
  { id: 'step-call', label: '3. Loan Officer Strategy Call', pageId: 'mortgage-booking', type: 'Booking' },
  { id: 'step-done', label: '4. Pre-Qualification Summary', pageId: 'mortgage-thanks', type: 'Thank You' },
];

const mortgageFunnelDoc: BuilderDocument = {
  theme: { color: '#D97706', font: 'Manrope', corners: 'Rounded' },
  steps: mortgageSteps,
  funnel: {
    name: 'Mortgage Company',
    goal: 'Lead Generation',
    audience: 'First-time homebuyers, move-up buyers, and homeowners comparing refinance rates',
    offer: 'Free 3-Minute Soft-Check Mortgage Pre-Qualification',
    pagesFlow: mortgageSteps.map(s => s.pageId),
    events: ['Form Submit', 'Booking'],
    status: 'Draft',
  },
  pages: [
    {
      id: 'mortgage-landing',
      name: 'Pre-Qualification Offer',
      status: 'Draft',
      path: '/pre-qualify',
      seoTitle: 'Get Your Free Mortgage Pre-Qualification in 3 Minutes',
      seoDescription: 'Discover your home buying power with $0 application cost and zero hard credit pull.',
      headline: 'Get Your Free Mortgage Pre-Qualification.',
      subheadline: 'Understand what you can comfortably afford and shop homes with verified buying power — $0 cost, 3 minutes to complete, and zero impact on your credit score.',
      cta: 'Get Pre-Qualified Now',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '/template-thumbnails/ghl-funnel-mortgage-company-hero.jpg',
      backgroundColor: '#ffffff',
      isFunnelStep: true,
      sections: [
        sec('mort-hero', 'Hero', 'Get Your Free Mortgage Pre-Qualification.', 'Understand what you can comfortably afford and shop homes with verified buying power — $0 cost, 3 minutes to complete, and zero impact on your credit score.', {
          button: 'Get Pre-Qualified Now',
          destinationType: 'Next Step',
          destination: 'mortgage-quiz',
        }, { backgroundColor: '#0F1F38', padding: '44' }),
        sec('mort-stats', 'Stats', 'Fast, Transparent Home Financing', 'Designed for clarity before you ever tour a property or make an offer.', {
          items: '$0 Application Cost · 3 Mins To Complete · No Hard Credit Pull · Same-Day Pre-Qual Letter',
        }, { backgroundColor: '#FFFBEB', padding: '26' }),
        cols3('mort-afford', [
          ['See Your True Price Range', 'Calculate comfortable monthly principal, taxes, and insurance across Conventional, FHA, VA, and Jumbo programs.'],
          ['Unlock Down-Payment Programs', 'Check eligibility for 3% down conventional options and local first-time buyer closing-cost grants.'],
          ['Win Competitive Offers', 'Sellers take your offer seriously when backed by a verified local lender pre-qualification letter.'],
        ], '#ffffff'),
        sec('mort-steps-band', 'Program Cards', 'Getting Started Is Simple', 'Three streamlined steps from estimate to keys in hand.', {
          eyebrow: 'The Process',
          media: 'numbered',
          items: '01 Complete 3-Min Profile · 02 Review Rate & Payment Scenarios · 03 Receive Verified Pre-Qual Letter',
          specs: 'Zero obligation · Soft credit check only · Direct NMLS-licensed loan advisor',
          button: 'Start Step 1 →',
          destinationType: 'Next Step',
          destination: 'mortgage-quiz',
        }, { backgroundColor: '#F8FAFC', padding: '32' }),
      ],
    },
    {
      id: 'mortgage-quiz',
      name: 'Buying Power Assessment',
      status: 'Draft',
      path: '/assessment',
      seoTitle: 'Step 2 — Home Loan Pre-Qualification Profile',
      seoDescription: 'Share your target price range, timeline, and loan goal.',
      headline: 'Tell Us About Your Home Goal',
      subheadline: 'Complete your 60-second profile below—no SSN or hard credit inquiry required.',
      cta: 'Calculate My Buying Power →',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '',
      isFunnelStep: true,
      sections: [
        sec('mort-form', 'Form', 'Step 2: Your Pre-Qualification Snapshot', 'No impact on your credit score. Your loan specialist prepares custom rate & payment options immediately.', {
          button: 'Calculate My Buying Power →',
          destinationType: 'Next Step',
          destination: 'mortgage-booking',
          nextPage: 'mortgage-booking',
          customFields: JSON.stringify([
            { id: 'loan_goal', label: 'Loan Goal', type: 'radio', required: true, options: ['Buying a Home', 'Refinancing Current Mortgage', 'Investment / Second Home'] },
            { id: 'est_price', label: 'Estimated Purchase Price / Home Value', type: 'select', required: true, options: ['$200,000 – $350,000', '$350,000 – $550,000', '$550,000 – $850,000', '$850,000+'] },
            { id: 'timeline', label: 'Target Buying Timeline', type: 'select', required: true, options: ['Under Contract / Offer Ready', 'Within 30–60 Days', '3–6 Months', 'Just Researching Affordability'] },
            { id: 'full_name', label: 'Full Name', type: 'text', required: true, options: [], placeholder: 'Jordan Matthews' },
            { id: 'email', label: 'Email Address', type: 'email', required: true, options: [], placeholder: 'jordan@example.com' },
            { id: 'phone', label: 'Mobile Phone (for instant SMS summary)', type: 'tel', required: true, options: [], placeholder: '(555) 234-5678' },
          ]),
          fields: '[]',
          successMessage: 'Profile saved! Choose an optional 10-minute rate review slot next.',
        }),
      ],
    },
    {
      id: 'mortgage-booking',
      name: 'Loan Officer Strategy Call',
      status: 'Draft',
      path: '/schedule-review',
      seoTitle: 'Step 3 — Lock Your 10-Minute Loan Strategy Review',
      seoDescription: 'Review your payment breakdown with a senior mortgage advisor.',
      headline: 'Pick a 10-Minute Window to Review Your Numbers',
      subheadline: 'Speak directly with a senior loan officer to tailor down-payment and rate-lock options.',
      cta: 'Confirm Strategy Call',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '',
      isFunnelStep: true,
      sections: [
        sec('mort-book', 'Booking', 'Select Your Rate & Affordability Review Time', 'Your personalized payment sheet will be ready before your call.', {
          calendar: 'Senior Loan Advisors',
          serviceType: 'Pre-Qualification Strategy Call · 15 minutes',
          timeSlots: 'Today · 1:30 PM,Today · 4:30 PM,Tomorrow · 10:00 AM',
          button: 'Confirm My Review Call',
          bookingMode: 'step',
          destinationType: 'Next Step',
          destination: 'mortgage-thanks',
          nextPage: 'mortgage-thanks',
        }),
      ],
    },
    {
      id: 'mortgage-thanks',
      name: 'Pre-Qualification Summary',
      status: 'Draft',
      path: '/thank-you',
      seoTitle: 'Pre-Qualification Request Confirmed',
      seoDescription: 'Your mortgage affordability breakdown is being prepared.',
      headline: 'You’re All Set! Your Pre-Qualification File Is In Review',
      subheadline: 'Check your email and text messages for your affordability worksheet and advisor confirmation.',
      cta: 'Done',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '',
      isFunnelStep: true,
      sections: [
        sec('mort-ty-head', 'Heading', 'Your Pre-Qualification Snapshot Is On Its Way!', 'Our NMLS-licensed mortgage desk is preparing your custom monthly payment scenarios right now.', { headingTag: 'H1' }),
        cols3('mort-ty-next', [
          ['1. Check Your Inbox', 'We sent a confirmation with the checklist of optional docs if you want an official offer letter today.'],
          ['2. Zero Hard Pull', 'Your credit score remains completely untouched while we calculate your target programs.'],
          ['3. Ready for Weekend Tours', 'Need an urgent offer letter for a showing today? Reply FAST to our text message for priority review.'],
        ], '#FFFBEB'),
      ],
    },
  ],
};

const brakeMufflerSteps: FunnelStep[] = [
  { id: 'brake-offer', label: '1. Free Brake Inspection Offer', pageId: 'brake-landing', type: 'Landing' },
  { id: 'brake-bay', label: '2. Reserve Service Bay', pageId: 'brake-booking', type: 'Booking' },
  { id: 'brake-confirmed', label: '3. Bay Confirmation & Coupon', pageId: 'brake-thanks', type: 'Thank You' },
];

const brakeMufflerFunnelDoc: BuilderDocument = {
  theme: { color: '#DC2626', font: 'Manrope', corners: 'Square' },
  steps: brakeMufflerSteps,
  funnel: {
    name: 'Brake & Muffler',
    goal: 'Appointment Booking',
    audience: 'Local drivers experiencing brake noise, vibration, dashboard warning lights, or exhaust issues',
    offer: '$0 Complete Multi-Point Brake & Exhaust Inspection + Same-Day Bay Booking',
    pagesFlow: brakeMufflerSteps.map(s => s.pageId),
    events: ['Booking', 'Form Submit'],
    status: 'Draft',
  },
  pages: [
    {
      id: 'brake-landing',
      name: 'Free Brake Inspection Offer',
      status: 'Draft',
      path: '/free-brake-check',
      seoTitle: 'FREE Brake & Exhaust Inspection — Same-Day ASE Certified Auto Service',
      seoDescription: 'Grinding, squealing, or soft pedal? Claim your $0 full brake check with written upfront pricing.',
      headline: 'FREE BRAKE INSPECTION',
      subheadline: 'Grinding, squeaking, vibration, or brake warning light on? Our ASE-certified technicians inspect your pads, rotors, calipers, brake lines, and exhaust at $0 cost — with honest, written pricing before any work begins.',
      cta: 'Schedule My Free Inspection',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '/template-thumbnails/ghl-funnel-brake-muffler-hero.jpg',
      backgroundColor: '#ffffff',
      isFunnelStep: true,
      sections: [
        sec('brake-hero', 'Hero', 'FREE BRAKE INSPECTION — $0 COST, ZERO OBLIGATION', 'Grinding, squeaking, or soft pedal? Let our ASE-certified brake & exhaust specialists inspect your complete braking system today and show you exact pad & rotor measurements before you spend a dime.', {
          button: 'Schedule My Free Inspection',
          destinationType: 'Next Step',
          destination: 'brake-booking',
        }, { backgroundColor: '#111827', padding: '44' }),
        sec('brake-stats', 'Stats', 'Local Drivers Trust Our Honest Shop Guarantee', 'No surprise shop fees. No high-pressure upsells—ever.', {
          items: '$0 Complete Brake Check · 4.9★ (480+ Verified Reviews) · 45-Min Express Inspection · 24-Month / 24k-Mile Warranty',
        }, { backgroundColor: '#FEF2F2', padding: '26' }),
        cols3('brake-check-points', [
          ['Pads, Shoes & Rotor Micrometer Check', 'Exact millimeter thickness measurement on all four wheels with digital photo proof sent to your phone.'],
          ['Calipers, Lines & Brake Fluid Test', 'Full hydraulic pressure check, master cylinder inspection, and moisture-boiling-point fluid test.'],
          ['Muffler, Catalytic & Exhaust Hangers', 'Undercarriage lift check for exhaust leaks, rusted flanges, and rattling heat shields while on the rack.'],
        ], '#ffffff'),
        sec('brake-pricing', 'Pricing', 'Transparent Local Brake & Muffler Specials', 'Need service after your free inspection? Lock in upfront coupon pricing today.', {
          plans: JSON.stringify([
            { id: 'bm-1', name: 'Complete Brake Inspection', price: '0', period: 'voucher', features: ['4-Wheel Pad & Rotor Measurement', 'Hydraulic & Fluid Safety Check', 'Exhaust & Undercarriage Lookover', 'Written Digital Estimate'], button: 'Claim $0 Inspection', highlighted: true },
            { id: 'bm-2', name: 'Ceramic Brake Pad Special', price: '149', period: 'per axle', features: ['Premium Low-Dust Ceramic Pads', 'Rotor Resurfacing / Machining Check', 'Hardware & Caliper Slide Lube', '24-Month Nationwide Warranty'], button: 'Lock Special Rate', highlighted: false },
          ]),
        }, { backgroundColor: '#F8FAFC', padding: '32' }),
      ],
    },
    {
      id: 'brake-booking',
      name: 'Reserve Service Bay',
      status: 'Draft',
      path: '/book-bay',
      seoTitle: 'Reserve Your Same-Day Express Service Bay',
      seoDescription: 'Pick an arrival time so a lift bay is waiting for your vehicle.',
      headline: 'Reserve Your Express Lift Bay ($0 Due Today)',
      subheadline: 'Pick a drop-off or wait-in-lounge slot—most inspections finish in 35–45 minutes.',
      cta: 'Reserve My Free Bay Slot',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '',
      isFunnelStep: true,
      sections: [
        sec('brake-book-widget', 'Booking', 'Choose Your Preferred Bay Time', 'No credit card required. Show your confirmation text at the service counter.', {
          calendar: 'Service Bays 1–4',
          serviceType: 'FREE Complete Brake & Exhaust Check · 45 minutes',
          timeSlots: 'Today · 11:00 AM,Today · 2:30 PM,Tomorrow · 8:30 AM,Tomorrow · 1:00 PM',
          button: 'Lock In My $0 Inspection',
          bookingMode: 'step',
          destinationType: 'Next Step',
          destination: 'brake-thanks',
          nextPage: 'brake-thanks',
        }),
      ],
    },
    {
      id: 'brake-thanks',
      name: 'Bay Confirmation & Coupon',
      status: 'Draft',
      path: '/voucher-confirmed',
      seoTitle: 'Service Bay Reserved — $0 Brake Inspection Voucher',
      seoDescription: 'Your express lift bay and $0 inspection voucher are active.',
      headline: 'Your Lift Bay & $0 Brake Voucher Are Locked In!',
      subheadline: 'Pull up to Bay Door #1 at your scheduled time and ask for the Service Advisor.',
      cta: 'Get Directions',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '',
      isFunnelStep: true,
      sections: [
        sec('brake-ty', 'Heading', 'Voucher Code: FREE-BRAKE-CHECK', 'Present this screen or your SMS confirmation at check-in. Includes $25 off any same-day brake or exhaust repair if needed!', { headingTag: 'H1' }),
        sec('brake-loc', 'Location & Hours', 'Shop Address & Lounge Info', '890 Auto Row Boulevard · Free Wi-Fi & Coffee Waiting Lounge · Mon–Sat 7:30 AM – 6:00 PM'),
      ],
    },
  ],
};

const locksmithSteps: FunnelStep[] = [
  { id: 'lock-dispatch', label: '1. 24/7 Emergency Dispatch', pageId: 'lock-landing', type: 'Landing' },
  { id: 'lock-request', label: '2. Instant Technician Pin', pageId: 'lock-form', type: 'Form' },
  { id: 'lock-enroute', label: '3. Live ETA Confirmation', pageId: 'lock-thanks', type: 'Thank You' },
];

const locksmithFunnelDoc: BuilderDocument = {
  theme: { color: '#FF5A00', font: 'Manrope', corners: 'Rounded' },
  steps: locksmithSteps,
  funnel: {
    name: 'Locksmith',
    goal: 'Lead Generation',
    audience: 'Drivers, homeowners, and property managers needing immediate 24/7 lockout or rekey assistance',
    offer: '15-Minute Emergency Mobile Locksmith Dispatch + Upfront Flat Quote',
    pagesFlow: locksmithSteps.map(s => s.pageId),
    events: ['Form Submit'],
    status: 'Draft',
  },
  pages: [
    {
      id: 'lock-landing',
      name: '24/7 Emergency Dispatch',
      status: 'Draft',
      path: '/emergency-locksmith',
      seoTitle: 'Locked Out? 24/7 Mobile Locksmith — ~15 Min Fast Arrival',
      seoDescription: 'Car, home, and commercial lockouts solved damage-free. Licensed, bonded, upfront pricing.',
      headline: "Locked out? We'll get you back in — fast.",
      subheadline: '24/7 emergency mobile locksmith units stationed across the metro. Damage-free entry for cars, homes, and offices with ~15 minute average arrival and flat upfront pricing before dispatch.',
      cta: 'Call (214) 555-5555 — Dispatch Now',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '/template-thumbnails/ghl-funnel-locksmith-hero.jpg',
      backgroundColor: '#0B1324',
      isFunnelStep: true,
      sections: [
        sec('lock-hero', 'Hero', "Locked out? We'll get you back in — fast.", '24/7 emergency mobile vans on standby right now. Call (214) 555-5555 or request instant GPS technician callback below — upfront flat-rate quote before we roll.', {
          button: 'Dispatch Nearest Tech (~15 Min) →',
          destinationType: 'Next Step',
          destination: 'lock-form',
        }, { backgroundColor: '#0B1324', padding: '44' }),
        sec('lock-stats', 'Stats', 'Rapid Damage-Free Entry — Day, Night & Holidays', 'State-licensed, background-checked, and fully insured mobile technicians.', {
          items: '~15 Min Avg Arrival · 4.9★ (1,240+ Rescues) · 100% Damage-Free Pick Tools · Upfront Flat Pricing',
        }, { backgroundColor: '#111C33', padding: '26' }),
        cols3('lock-services', [
          ['Car Lockouts & Smart Key Fobs', 'All makes, push-to-start transponders, trunk lockouts, and on-site laser key cutting without dealer towing.'],
          ['Home Lockouts & Same-Day Rekey', 'Deadbolt entry, broken key extraction, smart keypad installs, and instant multi-door rekeying.'],
          ['Commercial & Storefront Security', 'Panic bars, master-key systems, high-security cylinders, and 24/7 emergency commercial lock repair.'],
        ], '#ffffff'),
        sec('lock-testimonials', 'Testimonials', 'Verified Local Rescue Reviews', '', {
          testimonials: JSON.stringify([
            { id: 'lk-1', author: ' Chris Delgado', role: 'Car Lockout at Airport Garage', quote: 'Tech arrived in 14 minutes at 11:30 PM, unlocked my SUV without a scratch, and charged the exact flat price quoted on the phone.', rating: 5, avatar: '' },
            { id: 'lk-2', author: 'Priya Nair', role: 'Homeowner Rekey & Smart Lock', quote: 'Rekeyed six exterior locks and installed our Schlage Encode smart deadbolt in under an hour. Super professional.', rating: 5, avatar: '' },
          ]),
        }, { backgroundColor: '#F8FAFC', padding: '32' }),
      ],
    },
    {
      id: 'lock-form',
      name: 'Instant Technician Pin',
      status: 'Draft',
      path: '/dispatch-pin',
      seoTitle: 'Request Immediate Mobile Locksmith Callback (60 Seconds)',
      seoDescription: 'Send your street address or cross-streets for immediate technician ETA and upfront quote.',
      headline: 'Where Should We Send Your Technician?',
      subheadline: 'Our dispatcher calls you within 60 seconds with your nearest van’s live ETA and exact flat-rate price.',
      cta: 'Send My Location & Get Instant Quote →',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '',
      isFunnelStep: true,
      sections: [
        sec('lock-dispatch-form', 'Form', '24/7 Priority Dispatch Desk', 'Prefer calling directly? Tap (214) 555-5555 anytime—or submit below for 60-second callback.', {
          button: 'Dispatch Nearest Locksmith Now →',
          destinationType: 'Next Step',
          destination: 'lock-thanks',
          nextPage: 'lock-thanks',
          customFields: JSON.stringify([
            { id: 'service_urgency', label: 'What Do You Need Help With?', type: 'radio', required: true, options: ['Locked Out of Vehicle', 'Locked Out of House / Apt', 'Lost Car Key / Fob Replacement', 'Lock Rekey / Change Locks', 'Commercial Door / Lock Issue'] },
            { id: 'location_address', label: 'Current Street Address, Landmark, or Cross-Streets', type: 'text', required: true, options: [], placeholder: 'e.g. 2400 Main St Parking Lot B' },
            { id: 'phone', label: 'Direct Callback Mobile Number', type: 'tel', required: true, options: [], placeholder: '(214) 555-0199' },
            { id: 'full_name', label: 'Your Name', type: 'text', required: true, options: [], placeholder: 'Alex Rivera' },
            { id: 'vehicle_or_lock_notes', label: 'Vehicle Year/Make/Model or Lock Details (Optional)', type: 'text', required: false, options: [], placeholder: 'e.g. 2022 Toyota RAV4 / Front deadbolt' },
          ]),
          fields: '[]',
          successMessage: 'Dispatch alerted! Keep your phone line open—our nearest tech is calling in under 60 seconds.',
        }),
      ],
    },
    {
      id: 'lock-thanks',
      name: 'Live ETA Confirmation',
      status: 'Draft',
      path: '/tech-dispatched',
      seoTitle: 'Dispatcher Alerted — Keep Your Phone Nearby',
      seoDescription: 'Your emergency locksmith dispatch ticket is active.',
      headline: 'Dispatch Alerted — Keep Your Phone Line Open!',
      subheadline: 'Our on-duty dispatcher is matching the closest GPS mobile van to your location right now.',
      cta: 'Call Dispatch Desk',
      showHeader: false,
      header: 'Minimal header',
      showFooter: false,
      footer: 'Minimal footer',
      featuredImage: '',
      isFunnelStep: true,
      sections: [
        sec('lock-ty-head', 'Heading', 'Priority Ticket Active · Callback Within 60 Seconds', 'Stay in a safe, well-lit spot. Your technician will confirm exact arrival minutes and flat pricing before heading out.', { headingTag: 'H1' }),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. FORMS (3 GoHighLevel-Standard Conversion Forms)
// ---------------------------------------------------------------------------

const flooringFields: FormField[] = [
  { id: 'full_name', label: 'Full Name', type: 'text', required: true, options: [], placeholder: 'Enter your full name' },
  { id: 'email', label: 'Email', type: 'email', required: true, options: [], placeholder: 'you@example.com' },
  { id: 'phone', label: 'Phone', type: 'tel', required: true, options: [], placeholder: '+1 (555) 000-0000' },
  { id: 'street_address', label: 'Street Address', type: 'text', required: true, options: [], placeholder: '742 Evergreen Terrace' },
  { id: 'city', label: 'City', type: 'text', required: true, options: [], placeholder: 'Austin' },
  { id: 'state', label: 'State / Province', type: 'text', required: true, options: [], placeholder: 'TX' },
  { id: 'postal_code', label: 'Postal Code', type: 'text', required: true, options: [], placeholder: '78701' },
  {
    id: 'flooring_type',
    label: 'What Type of Flooring Are You Interested In?',
    type: 'radio',
    required: true,
    options: ['Hardwood', 'Luxury Vinyl Plank (LVP)', 'Laminate', 'Tile', 'Carpet', 'Engineered Wood', 'Not Sure Yet'],
    helperText: 'Choose your preferred material—our estimator brings physical samples to your walkthrough.',
  },
  {
    id: 'project_flooring_type',
    label: 'Project Flooring Scope',
    type: 'select',
    required: true,
    options: ['New Flooring Installation', 'Remove & Replace Existing Floors', 'Hardwood Sanding & Refinishing', 'Commercial / Multi-Room Fit-Out'],
    placeholder: 'Select project scope...',
  },
  {
    id: 'approx_project_size',
    label: 'Approximate Project Size',
    type: 'select',
    required: true,
    options: ['Under 300 sq. ft. (1–2 Rooms)', '300 – 800 sq. ft.', '800 – 1,500 sq. ft.', '1,500+ sq. ft. (Whole Home / Commercial)'],
    placeholder: 'Select approximate square footage...',
  },
  {
    id: 'project_notes',
    label: 'Additional Room Details, Stairs, or Target Timeline',
    type: 'textarea',
    required: false,
    options: [],
    placeholder: 'Let us know how many rooms, stairs, subfloor type, or preferred installation dates...',
  },
];

const personalTrainerFields: FormField[] = [
  { id: 'full_name', label: 'Full Name', type: 'text', required: true, options: [], placeholder: 'Full Name' },
  { id: 'phone', label: 'Mobile Phone', type: 'tel', required: true, options: [], placeholder: '+1 (555) 000-0000' },
  { id: 'email', label: 'Email Address', type: 'email', required: true, options: [], placeholder: 'you@email.com' },
  {
    id: 'fitness_goal',
    label: 'Primary Fitness & Physique Goal',
    type: 'select',
    required: true,
    options: ['Lean Fat Loss & Metabolic Conditioning', 'Muscle Hypertrophy & Strength Blueprint', 'Athletic Performance & Mobility', 'Body Recomposition & Accountability'],
    placeholder: 'Select your primary objective...',
  },
  {
    id: 'weekly_commitment',
    label: 'How Many Days Per Week Can You Train?',
    type: 'radio',
    required: true,
    options: ['2–3 Days / Week', '4 Days / Week', '5+ Days / Week'],
  },
  {
    id: 'injuries_limitations',
    label: 'Are there any current injuries, joint pains, or medical limitations we need to program around?',
    type: 'textarea',
    required: false,
    options: [],
    placeholder: 'Tell us about your current routine, recovery history, or joint considerations...',
  },
  {
    id: 'sms_transactional_consent',
    label: 'By checking this box, I consent to receive non-marketing text messages regarding my baseline assessment and session reminders. Reply STOP to opt out.',
    type: 'checkbox',
    required: true,
    options: [],
  },
  {
    id: 'sms_marketing_consent',
    label: 'Send me weekly workout blueprints, nutrition protocols, and transformation openings.',
    type: 'checkbox',
    required: false,
    options: [],
  },
];

const architectureStudioFields: FormField[] = [
  { id: 'full_name', label: 'Full Name', type: 'text', required: true, options: [], placeholder: 'Enter your full name' },
  { id: 'city_location', label: 'City / Project Location', type: 'text', required: true, options: [], placeholder: 'Enter site city or neighborhood' },
  { id: 'phone', label: 'Phone', type: 'tel', required: true, options: [], placeholder: '+1 (555) 000-0000' },
  { id: 'email', label: 'Email', type: 'email', required: true, options: [], placeholder: 'you@email.com' },
  {
    id: 'project_type',
    label: 'Project Type',
    type: 'select',
    required: true,
    options: ['Custom Ground-Up Residence', 'Architectural Renovation & Addition', 'Boutique Commercial / Hospitality', 'Interior Architecture & Spatial Design', 'Pre-Purchase Site Feasibility Study'],
    placeholder: 'Select an option',
  },
  {
    id: 'approximate_budget',
    label: 'Approximate Budget',
    type: 'select',
    required: true,
    options: ['$250k – $500k', '$500k – $1.2M', '$1.2M – $2.5M', '$2.5M+ Bespoke Commission'],
    placeholder: 'Select a range',
  },
  {
    id: 'desired_start_timeline',
    label: 'Desired Start Timeline',
    type: 'select',
    required: true,
    options: ['Ready Immediately (Site Secured)', '1 – 3 Months', '3 – 6 Months', '6+ Months / Early Exploration'],
    placeholder: 'Select an option',
  },
  {
    id: 'project_description',
    label: 'Describe Your Project Here',
    type: 'textarea',
    required: true,
    options: [],
    placeholder: 'Briefly describe your site, spatial goals, architectural style, and vision...',
  },
  {
    id: 'studio_consent',
    label: 'I consent to receive consultation scheduling updates from the studio team.',
    type: 'checkbox',
    required: true,
    options: [],
  },
];

export const pageTemplates: PageTemplate[] = [
  // ================= WEBSITES (3) =================
  {
    mode: 'website',
    id: 'ghl-website-framing-construction',
    name: 'Framing Construction',
    description: 'High-contrast modern construction & structural framing website with service grids, trust stats, and project bid intake.',
    industry: 'Professional Services',
    goal: 'Lead Generation',
    title: 'Building Strong Foundations for Every Project',
    body: 'Precision structural wood & steel framing, custom residential shells, and commercial developments engineered to pass inspection the first time.',
    cta: 'Request a Project Bid',
    color: '#EA580C',
    image: '/template-thumbnails/ghl-website-framing-construction-hero.jpg',
    thumbnail: '/template-thumbnails/ghl-website-framing-construction.jpg',
    popularity: 142,
    tags: ['construction', 'framing', 'service grid', '4 pages', 'New'],
    benefits: ['Residential Custom Framing', 'Commercial & Multi-Family Shells', 'Turnkey Truss & Lumber Takeoff'],
    builderDocument: framingWebsiteDoc,
  },
  {
    mode: 'website',
    id: 'ghl-website-life-insurance',
    name: 'Life Insurance',
    description: 'Corporate-grade life insurance & wealth protection website with A+ carrier trust badges, 6-service grid, and rate comparison flow.',
    industry: 'Professional Services',
    goal: 'Lead Generation',
    title: 'Secure Your Future With Ease.',
    body: 'Protect the people who matter most with transparent, A+ rated term life, whole life, and wealth-transfer strategies designed around every stage of life.',
    cta: 'Get My Free Quote',
    color: '#072A5E',
    image: '/template-thumbnails/ghl-website-life-insurance-hero.jpg',
    thumbnail: '/template-thumbnails/ghl-website-life-insurance.jpg',
    popularity: 198,
    tags: ['insurance', 'financial services', 'trust badges', '4 pages', 'New'],
    benefits: ['30+ A+ Rated Carriers', 'Living Benefits Included', '10-Minute No-Exam Options'],
    builderDocument: lifeInsuranceWebsiteDoc,
  },
  {
    mode: 'website',
    id: 'ghl-website-pharmacy',
    name: 'Pharmacy',
    description: 'Clean minimalist medical & neighborhood pharmacy website with 60-second Rx transfer highlights, immunizations, and free local delivery.',
    industry: 'Healthcare/Clinic',
    goal: 'Appointment Booking',
    title: 'Prescriptions made simple. Care that feels personal.',
    body: 'Refill in seconds, transfer prescriptions without calling your old pharmacy, and enjoy free same-day courier delivery from pharmacists who know you by name.',
    cta: 'Transfer a Prescription',
    color: '#0F5132',
    image: '/template-thumbnails/ghl-website-pharmacy-hero.jpg',
    thumbnail: '/template-thumbnails/ghl-website-pharmacy.jpg',
    popularity: 39,
    tags: ['healthcare', 'pharmacy', 'rx transfer', '4 pages'],
    benefits: ['60-Second Rx Transfers', 'Free Same-Day Courier Delivery', 'Walk-In Immunizations & Med-Sync'],
    builderDocument: pharmacyWebsiteDoc,
  },

  // ================= FUNNELS (3) =================
  {
    mode: 'funnel',
    id: 'ghl-funnel-mortgage-company',
    name: 'Mortgage Company',
    description: 'Step-by-step mortgage & real estate pre-qualification lead funnel with affordability tiers, soft-pull assurance, and loan officer booking.',
    industry: 'Real Estate',
    goal: 'Lead Generation',
    title: 'Get Your Free Mortgage Pre-Qualification.',
    body: 'Understand what you can comfortably afford and shop homes with verified buying power — $0 cost, 3 minutes to complete, and zero impact on your credit score.',
    cta: 'Get Pre-Qualified Now',
    color: '#D97706',
    image: '/template-thumbnails/ghl-funnel-mortgage-company-hero.jpg',
    thumbnail: '/template-thumbnails/ghl-funnel-mortgage-company.jpg',
    popularity: 219,
    tags: ['mortgage', 'real estate', 'pre-qualification', '4 steps'],
    benefits: ['$0 Application Cost', '3-Minute Soft Check', 'Same-Day Verified Pre-Qual Letter'],
    builderDocument: mortgageFunnelDoc,
  },
  {
    mode: 'funnel',
    id: 'ghl-funnel-brake-muffler',
    name: 'Brake & Muffler',
    description: 'High-converting local auto repair & brake service funnel featuring a $0 multi-point brake check voucher and instant bay booking.',
    industry: 'Professional Services',
    goal: 'Appointment Booking',
    title: 'FREE BRAKE INSPECTION',
    body: 'Grinding, squeaking, or soft brake pedal? ASE-certified technicians inspect your pads, rotors, calipers, and exhaust at $0 cost with written upfront pricing.',
    cta: 'Schedule My Free Inspection',
    color: '#DC2626',
    image: '/template-thumbnails/ghl-funnel-brake-muffler-hero.jpg',
    thumbnail: '/template-thumbnails/ghl-funnel-brake-muffler.jpg',
    popularity: 381,
    tags: ['auto service', 'brake & muffler', 'local booking', '3 steps'],
    benefits: ['$0 Multi-Point Brake Check', 'ASE Certified Technicians', 'Same-Day Express Lift Bay'],
    builderDocument: brakeMufflerFunnelDoc,
  },
  {
    mode: 'funnel',
    id: 'ghl-funnel-locksmith',
    name: 'Locksmith',
    description: 'Dark-mode high-urgency 24/7 emergency locksmith conversion funnel with click-to-call dispatch, ~15 min arrival stats, and GPS callback pin.',
    industry: 'Professional Services',
    goal: 'Lead Generation',
    title: "Locked out? We'll get you back in — fast.",
    body: '24/7 emergency mobile locksmith dispatch for vehicles, homes, and storefronts with ~15 minute average arrival and upfront flat pricing.',
    cta: 'Call (214) 555-5555 — Dispatch Now',
    color: '#FF5A00',
    image: '/template-thumbnails/ghl-funnel-locksmith-hero.jpg',
    thumbnail: '/template-thumbnails/ghl-funnel-locksmith.jpg',
    popularity: 558,
    tags: ['locksmith', 'emergency dispatch', 'click-to-call', '3 steps'],
    benefits: ['~15 Min Average Arrival', '100% Damage-Free Entry', 'Upfront Flat-Rate Pricing'],
    builderDocument: locksmithFunnelDoc,
  },

  // ================= FORMS (3) =================
  {
    mode: 'form',
    id: 'ghl-form-flooring-quote',
    name: 'Flooring Quote - Classic',
    description: 'Clean structured residential & commercial flooring estimator form with address capture, material selector, and square-footage scoping.',
    industry: 'Real Estate',
    goal: 'Lead Generation',
    title: 'Get Your Free Flooring Quote',
    body: 'Ready to transform your home or business with beautiful new flooring? Complete the form below and our team will prepare a customized, no-obligation quote tailored to your project.',
    cta: 'Get My Free Flooring Quote',
    color: '#1E293B',
    image: '/template-thumbnails/ghl-form-flooring-quote.jpg',
    thumbnail: '/template-thumbnails/ghl-form-flooring-quote.jpg',
    popularity: 4309,
    tags: ['flooring', 'quote estimator', 'home services', '11 fields'],
    backgroundPreset: 'warm-neutral',
    backgroundColor: '#EDE8E3',
    benefits: ['Material radio selector (LVP, Hardwood, Tile)', 'Full job-site address capture', 'Square-footage scope qualifier'],
    fields: flooringFields,
    builderDocument: buildFormDoc(
      'ghl-form-flooring-quote',
      'Flooring Quote - Classic',
      'Get Your Free Flooring Quote',
      'Ready to transform your home or business with beautiful new flooring? Complete the form below and our team will prepare a customized, no-obligation quote tailored to your project.',
      'Get My Free Flooring Quote',
      '#1E293B',
      flooringFields,
      '#EDE8E3',
      '#FFFFFF',
      '1px solid #E2DDD5',
      '#1C1917',
      'warm-neutral'
    ),
  },
  {
    mode: 'form',
    id: 'ghl-form-personal-trainer',
    name: 'Personal Trainer',
    description: 'High-energy athletic fitness assessment & workout blueprint intake form with goal profiling, injury screening, and SMS compliance opt-ins.',
    industry: 'Fitness/Coaching',
    goal: 'Appointment Booking',
    title: "LET'S BUILD YOUR WORKOUT BLUEPRINT.",
    body: 'No generic templates. Tell us a bit about your current routine, your goals, and how your body feels today so we can design a training plan tailored exactly to you.',
    cta: 'REQUEST MY BASELINE ASSESSMENT',
    color: '#EAB308',
    image: '/template-thumbnails/ghl-form-personal-trainer.jpg',
    thumbnail: '/template-thumbnails/ghl-form-personal-trainer.jpg',
    popularity: 2181,
    tags: ['fitness', 'personal trainer', 'assessment', '8 fields'],
    backgroundPreset: 'warm-neutral',
    backgroundColor: '#FEFCE8',
    benefits: ['High-energy athletic visual branding', 'Injury & movement limitation screen', 'A2P-ready SMS consent checkboxes'],
    fields: personalTrainerFields,
    builderDocument: buildFormDoc(
      'ghl-form-personal-trainer',
      'Personal Trainer',
      "LET'S BUILD YOUR WORKOUT BLUEPRINT.",
      'No generic templates. Tell us a bit about your current routine, your goals, and how your body feels today so we can design a training plan tailored exactly to you.',
      'REQUEST MY BASELINE ASSESSMENT',
      '#EAB308',
      personalTrainerFields,
      '#FEFCE8',
      '#FFFFFF',
      '2px solid #FACC15',
      '#111827',
      'warm-neutral'
    ),
  },
  {
    mode: 'form',
    id: 'ghl-form-architecture-studio',
    name: 'Architecture Studio',
    description: 'Sleek editorial architectural & interior studio consultation form featuring project typology, budget range, and timeline selectors.',
    industry: 'Professional Services',
    goal: 'Lead Generation',
    title: 'Every great space starts with a conversation.',
    body: 'Tell us a little about yourself and what you have in mind. Whether you are at the idea stage or ready to build, we would love to hear from you.',
    cta: 'START THE CONVERSATION',
    color: '#111111',
    image: '/template-thumbnails/ghl-form-architecture-studio.jpg',
    thumbnail: '/template-thumbnails/ghl-form-architecture-studio.jpg',
    popularity: 2588,
    tags: ['architecture', 'studio consultation', 'project scope', '9 fields'],
    backgroundPreset: 'warm-neutral',
    backgroundColor: '#F5F3EF',
    benefits: ['Project type & budget tier qualification', 'Site location & timeline capture', 'Minimalist architectural aesthetic'],
    fields: architectureStudioFields,
    builderDocument: buildFormDoc(
      'ghl-form-architecture-studio',
      'Architecture Studio',
      'Every great space starts with a conversation.',
      'Tell us a little about yourself and what you have in mind. Whether you are at the idea stage or ready to build, we would love to hear from you.',
      'START THE CONVERSATION',
      '#111111',
      architectureStudioFields,
      '#F5F3EF',
      '#FFFFFF',
      '1px solid #E5E2DC',
      '#111111',
      'warm-neutral'
    ),
  },
];
