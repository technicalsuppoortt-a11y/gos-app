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

export type PageTemplate = {
  mode: 'funnel' | 'website' | 'form';
  id: string;
  name: string;
  industry: string;
  goal: string;
  title: string;
  body: string;
  cta: string;
  color: string;
  image: string;
  benefits?: string[];
  fields?: FormField[];
};

export const pageTemplates: PageTemplate[] = [
  { mode: 'funnel', id: 'fitness', name: 'Personal coaching', industry: 'Fitness', goal: 'Lead generation', title: 'Build strength. Build confidence.', body: 'A personal training plan and expert support, built around your life.', cta: 'Get my free training plan', color: '#27634b', image: '/dashboard/product-workout.png', benefits: ['A plan that fits your goals', 'Expert coaching every week', 'Progress you can measure'] },
  { mode: 'funnel', id: 'wellness', name: 'Nutrition consultation', industry: 'Health & wellness', goal: 'Bookings', title: 'Feel better, one habit at a time.', body: 'Meet your nutrition coach and discover a sustainable approach to healthier living.', cta: 'Book a consultation', color: '#94764b', image: '/dashboard/product-nutrition.png', benefits: ['Personal nutrition guidance', 'Simple daily habits', 'Support at every step'] },
  { mode: 'funnel', id: 'agency', name: 'Agency growth', industry: 'Business services', goal: 'Lead generation', title: 'Your next stage of growth starts here.', body: 'Strategy, creative and campaigns that help ambitious businesses reach more customers.', cta: 'Request a strategy call', color: '#5e47bb', image: '/dashboard/product-consultation.png', benefits: ['A clear growth strategy', 'Creative that connects', 'Results you can track'] },
  { mode: 'funnel', id: 'launch', name: 'Product launch', industry: 'E-commerce', goal: 'Sales', title: 'Meet your new everyday essential.', body: 'Thoughtful design. Lasting quality. Discover the collection made for your everyday.', cta: 'Explore the collection', color: '#20252d', image: '/dashboard/product-nutrition.png', benefits: ['Thoughtfully designed', 'Made to last', 'Easy delivery & returns'] },
  { mode: 'funnel', id: 'course', name: 'Online masterclass', industry: 'Education', goal: 'Lead generation', title: 'Turn your knowledge into your next opportunity.', body: 'Join a practical masterclass with expert instruction and a community that supports your progress.', cta: 'Reserve my place', color: '#285caa', image: '/dashboard/product-consultation.png', benefits: ['Learn from an expert', 'Practice with real projects', 'Grow with a community'] },
  { mode: 'funnel', id: 'studio', name: 'Studio membership', industry: 'Fitness', goal: 'Sales', title: 'Find your space. Find your strength.', body: 'Discover a welcoming training studio with flexible membership and coaches who know your name.', cta: 'Find my membership', color: '#ac4931', image: '/dashboard/product-workout.png', benefits: ['Flexible membership', 'Small group training', 'Experienced coaches'] },
  { mode: 'website', id: 'coaching-site', name: 'Coaching website', industry: 'Fitness', goal: 'Lead generation', title: 'Coaching built around your life.', body: 'Meet your coaches, explore training programs, and find your next step.', cta: 'Explore our programs', color: '#27634b', image: '/dashboard/product-workout.png', benefits: ['Personal training', 'Nutrition coaching', 'Progress reviews'] },
  { mode: 'website', id: 'clinic-site', name: 'Wellness clinic website', industry: 'Health & wellness', goal: 'Bookings', title: 'Thoughtful care for a healthier you.', body: 'Discover our practitioners, treatments and welcoming clinic.', cta: 'Explore our services', color: '#94764b', image: '/dashboard/product-nutrition.png', benefits: ['Meet our specialists', 'Personal care plans', 'Visit our clinic'] },
  { mode: 'website', id: 'agency-site', name: 'Agency portfolio website', industry: 'Business services', goal: 'Lead generation', title: 'Good ideas. Lasting impact.', body: 'Explore our work, meet our team, and discover how we help brands grow.', cta: 'Explore our work', color: '#5e47bb', image: '/dashboard/product-consultation.png', benefits: ['Brand strategy', 'Design and development', 'Marketing campaigns'] },
  { mode: 'website', id: 'store-site', name: 'Product storefront website', industry: 'E-commerce', goal: 'Sales', title: 'Find something made for you.', body: 'Browse our collection, learn our story, and get help from our team.', cta: 'Explore the collection', color: '#20252d', image: '/pagefly/headphones-product.png', benefits: ['Shop the collection', 'Our design story', 'Customer support'] },

  // Pre-designed Ready-Made Form Templates
  {
    mode: 'form',
    id: 'contact-inquiry-form',
    name: 'Contact & Inquiry',
    industry: 'Business services',
    goal: 'Lead generation',
    title: 'Get in touch with our team',
    body: 'We typically respond within 24 hours. Let us know how we can help your business thrive.',
    cta: 'Send Message',
    color: '#7C3AED',
    image: '/dashboard/product-consultation.png',
    benefits: ['Instant CRM Lead Capture', 'Smart inquiry categorization', 'Automated routing'],
    fields: [
      { id: 'name', label: 'Full name', type: 'text', required: true, options: [], placeholder: 'e.g. Sarah Jenkins' },
      { id: 'email', label: 'Email address', type: 'email', required: true, options: [], placeholder: 'sarah@company.com' },
      { id: 'phone', label: 'Phone number', type: 'tel', required: false, options: [], placeholder: '+1 (555) 000-0000', helperText: 'Optional - for faster phone or SMS assistance.' },
      {
        id: 'subject',
        label: 'Inquiry topic',
        type: 'select',
        required: true,
        options: ['General Inquiry', 'Sales & Pricing', 'Technical Support', 'Partnership Opportunity'],
        placeholder: 'Select an inquiry reason...',
        helperText: 'Routes your message directly to the designated department.'
      },
      { id: 'message', label: 'Message', type: 'textarea', required: true, options: [], placeholder: 'How can our team help you?' }
    ]
  },
  {
    mode: 'form',
    id: 'consultation-request-form',
    name: 'Consultation Request',
    industry: 'Health & wellness',
    goal: 'Bookings',
    title: 'Schedule your private discovery consultation',
    body: 'Tell us about your goals, current hurdles, and preferred call times before we meet.',
    cta: 'Request Consultation',
    color: '#7C3AED',
    image: '/dashboard/product-nutrition.png',
    benefits: ['Pre-qualifies incoming prospects', 'Captures preferred call time', 'Syncs to CRM pipeline'],
    fields: [
      { id: 'name', label: 'Full name', type: 'text', required: true, options: [], placeholder: 'e.g. Alex Morgan' },
      { id: 'email', label: 'Email address', type: 'email', required: true, options: [], placeholder: 'alex@example.com' },
      { id: 'phone', label: 'Direct phone number', type: 'tel', required: true, options: [], placeholder: '+1 (555) 123-4567' },
      {
        id: 'primary_goal',
        label: 'Primary focus area',
        type: 'select',
        required: true,
        options: ['Health & Longevity', 'Weight Management & Nutrition', 'Strength & Peak Performance', 'Stress Relief & Recovery'],
        placeholder: 'Choose your main goal...',
        helperText: 'Helps our coach tailor your initial session.'
      },
      {
        id: 'preferred_time',
        label: 'Preferred call window',
        type: 'select',
        required: true,
        options: ['Morning (9:00 AM – 12:00 PM)', 'Afternoon (12:00 PM – 4:00 PM)', 'Evening (4:00 PM – 7:00 PM)'],
        placeholder: 'Select a suitable time window...'
      },
      { id: 'notes', label: 'Additional context or current challenges', type: 'textarea', required: false, options: [], placeholder: 'Share any specifics you would like us to review prior to the call.' }
    ]
  },
  {
    mode: 'form',
    id: 'newsletter-signup-form',
    name: 'VIP Newsletter & Briefing',
    industry: 'Marketing & Media',
    goal: 'Lead generation',
    title: 'Join our weekly executive briefing',
    body: 'Get actionable growth strategies, private case studies, and early access to product releases.',
    cta: 'Subscribe to Briefing',
    color: '#7C3AED',
    image: '/dashboard/product-consultation.png',
    benefits: ['High conversion single-step capture', 'Audience segmentation dropdown', 'Instant welcome trigger'],
    fields: [
      { id: 'name', label: 'First name', type: 'text', required: true, options: [], placeholder: 'e.g. Elena' },
      { id: 'email', label: 'Work email address', type: 'email', required: true, options: [], placeholder: 'elena@company.com' },
      {
        id: 'interest_topics',
        label: 'Primary topics of interest',
        type: 'select',
        required: true,
        options: ['Growth & Performance Marketing', 'Product & AI Engineering', 'Operations & Scaling', 'All Topics & Updates'],
        placeholder: 'Select your interest focus...',
        helperText: 'We customize your curated weekly newsletter.'
      },
      { id: 'consent', label: 'I agree to receive weekly insights and product updates. Unsubscribe anytime.', type: 'checkbox', required: true, options: [] }
    ]
  },
  {
    mode: 'form',
    id: 'client-onboarding-form',
    name: 'Client Project Intake',
    industry: 'Business services',
    goal: 'Lead generation',
    title: 'New project briefing & scope assessment',
    body: 'Help us understand your company, deliverables, timeline, and anticipated budget.',
    cta: 'Submit Project Brief',
    color: '#7C3AED',
    image: '/dashboard/product-consultation.png',
    benefits: ['Detailed budget & timeline qualification', 'Ready for agency workflows', 'Automated pipeline triage'],
    fields: [
      { id: 'company_name', label: 'Company / Organization name', type: 'text', required: true, options: [], placeholder: 'e.g. Acme Corp' },
      { id: 'name', label: 'Contact person name', type: 'text', required: true, options: [], placeholder: 'e.g. David Vance' },
      { id: 'email', label: 'Business email', type: 'email', required: true, options: [], placeholder: 'david@acme.com' },
      {
        id: 'budget_tier',
        label: 'Estimated investment budget',
        type: 'select',
        required: true,
        options: ['$2,500 – $5,000', '$5,000 – $10,000', '$10,000 – $25,000', '$25,000+'],
        placeholder: 'Select anticipated budget range...'
      },
      {
        id: 'timeline',
        label: 'Desired launch timeline',
        type: 'select',
        required: true,
        options: ['Immediate (Within 2 weeks)', 'This Month (2–4 weeks)', 'Next Quarter (1–3 months)', 'Flexible / Exploring options'],
        placeholder: 'Select timeline urgency...'
      },
      { id: 'project_details', label: 'Project description & core goals', type: 'textarea', required: true, options: [], placeholder: 'Outline your project scope, target audience, and primary KPIs...' }
    ]
  },
  {
    mode: 'form',
    id: 'event-rsvp-form',
    name: 'Event RSVP & Ticket Registration',
    industry: 'Events & Community',
    goal: 'Bookings',
    title: 'Reserve your pass for the Annual Summit',
    body: 'Spaces are strictly limited. Register today to lock in your attendee credentials and session access.',
    cta: 'Confirm Registration',
    color: '#7C3AED',
    image: '/dashboard/hero-landscape.png',
    benefits: ['Attendee pass type selection', 'In-person vs Virtual attendance', 'Automated calendar & confirmation emails'],
    fields: [
      { id: 'name', label: 'Attendee full name', type: 'text', required: true, options: [], placeholder: 'e.g. Maya Lin' },
      { id: 'email', label: 'Work email for ticket delivery', type: 'email', required: true, options: [], placeholder: 'maya@summit.org' },
      { id: 'phone', label: 'Mobile number for SMS reminders', type: 'tel', required: false, options: [], placeholder: '+1 (555) 789-0123' },
      {
        id: 'ticket_tier',
        label: 'Registration pass tier',
        type: 'select',
        required: true,
        options: ['Standard Attendee Pass (Free)', 'VIP Executive Pass ($199)', 'Virtual Livestream Access (Free)'],
        placeholder: 'Select ticket tier...'
      },
      {
        id: 'attendance_mode',
        label: 'How will you attend?',
        type: 'radio',
        required: true,
        options: ['In-Person (Convention Center)', 'Virtual Live Stream (Zoom / Webcast)'],
        defaultValue: 'In-Person (Convention Center)'
      },
      { id: 'special_requests', label: 'Dietary or accessibility requirements', type: 'textarea', required: false, options: [], placeholder: 'Let us know if you need any accommodations.' }
    ]
  },
  {
    mode: 'form',
    id: 'feedback-review-form',
    name: 'Customer Feedback & Survey',
    industry: 'E-commerce',
    goal: 'Feedback',
    title: 'Share your feedback with us',
    body: 'Help us elevate our product quality and customer experience with your candid review.',
    cta: 'Submit Review',
    color: '#7C3AED',
    image: '/pagefly/headphones-product.png',
    benefits: ['5-star satisfaction dropdown rating', 'NPS recommendation metric', 'Actionable customer insights'],
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true, options: [], placeholder: 'e.g. Jordan Cole' },
      { id: 'email', label: 'Email address', type: 'email', required: true, options: [], placeholder: 'jordan@example.com' },
      {
        id: 'satisfaction',
        label: 'Overall satisfaction rating',
        type: 'select',
        required: true,
        options: ['⭐⭐⭐⭐⭐ 5 - Outstanding Experience', '⭐⭐⭐⭐ 4 - Very Good', '⭐⭐⭐ 3 - Satisfactory', '⭐⭐ 2 - Needs Improvement', '⭐ 1 - Unsatisfactory'],
        placeholder: 'Rate your overall experience...'
      },
      { id: 'nps_score', label: 'Likelihood to recommend to colleagues (1 - 10)', type: 'number', required: true, options: [], placeholder: '10', helperText: 'Enter a number between 1 (unlikely) and 10 (definitely).' },
      { id: 'what_went_well', label: 'What did we do especially well?', type: 'textarea', required: false, options: [], placeholder: 'Share highlights of your experience...' },
      { id: 'areas_to_improve', label: 'Where can we improve our service?', type: 'textarea', required: false, options: [], placeholder: 'Any suggestions or pain points encountered...' }
    ]
  },
  {
    mode: 'form',
    id: 'job-application-form',
    name: 'Career & Talent Intake',
    industry: 'Human Resources',
    goal: 'Lead generation',
    title: 'Join our mission and grow your career',
    body: 'We are expanding rapidly and always seeking visionary talent. Submit your credentials to apply.',
    cta: 'Submit Application',
    color: '#7C3AED',
    image: '/dashboard/product-consultation.png',
    benefits: ['Role & department selection', 'Seniority qualification', 'Portfolio and LinkedIn capture'],
    fields: [
      { id: 'full_name', label: 'Full legal name', type: 'text', required: true, options: [], placeholder: 'e.g. Marcus Vance' },
      { id: 'email', label: 'Personal email address', type: 'email', required: true, options: [], placeholder: 'marcus@example.com' },
      { id: 'phone', label: 'Direct phone number', type: 'tel', required: true, options: [], placeholder: '+1 (555) 456-7890' },
      {
        id: 'position',
        label: 'Position applied for',
        type: 'select',
        required: true,
        options: ['Senior Full-Stack Engineer', 'Product Designer (UI/UX)', 'Growth Marketing Lead', 'Customer Success Architect', 'Operations & Strategy Associate'],
        placeholder: 'Select target role...'
      },
      {
        id: 'experience_years',
        label: 'Years of professional experience',
        type: 'select',
        required: true,
        options: ['1 – 3 Years (Mid-level)', '4 – 7 Years (Senior)', '8+ Years (Staff / Principal / Director)'],
        placeholder: 'Select experience level...'
      },
      { id: 'portfolio_url', label: 'Portfolio, GitHub, or LinkedIn URL', type: 'text', required: false, options: [], placeholder: 'https://linkedin.com/in/yourprofile' },
      { id: 'cover_note', label: 'Why are you the perfect fit for this role?', type: 'textarea', required: true, options: [], placeholder: 'Highlight recent achievements and what excites you about our team...' }
    ]
  },
  {
    mode: 'form',
    id: 'quote-estimator-form',
    name: 'Quotation & Scope Estimator',
    industry: 'Business services',
    goal: 'Lead generation',
    title: 'Request a customized project estimate',
    body: 'Tell us what you need built, your timeframe, and your scope for an upfront quotation.',
    cta: 'Generate Quotation',
    color: '#7C3AED',
    image: '/dashboard/product-consultation.png',
    benefits: ['Instant project categorization', 'Budget range qualification', 'Fast turnaround estimates'],
    fields: [
      { id: 'contact_name', label: 'Full name', type: 'text', required: true, options: [], placeholder: 'e.g. Jessica Taylor' },
      { id: 'work_email', label: 'Work email address', type: 'email', required: true, options: [], placeholder: 'jessica@brand.com' },
      { id: 'company_name', label: 'Company or Brand name', type: 'text', required: true, options: [], placeholder: 'e.g. Apex Global' },
      {
        id: 'service_required',
        label: 'Primary service needed',
        type: 'select',
        required: true,
        options: ['Complete Website & Funnel Architecture', 'Custom Web Application Development', 'Growth Marketing & Tracking Integration', 'Brand Strategy & Visual Identity'],
        placeholder: 'Select service needed...'
      },
      {
        id: 'budget_expectation',
        label: 'Allocated budget range',
        type: 'select',
        required: true,
        options: ['$3,000 – $7,500', '$7,500 – $15,000', '$15,000 – $30,000', '$30,000+'],
        placeholder: 'Select budget tier...'
      },
      { id: 'requirements', label: 'Key deliverables & special requirements', type: 'textarea', required: true, options: [], placeholder: 'List must-have features, existing platforms, or design references...' }
    ]
  },
  {
    mode: 'form',
    id: 'enterprise-demo-form',
    name: 'Enterprise Demo & Trial Request',
    industry: 'Technology & SaaS',
    goal: 'Sales',
    title: 'Experience the next generation platform',
    body: 'Book a tailored walkthrough with our technical architects and unlock early enterprise trial access.',
    cta: 'Schedule Live Demo',
    color: '#7C3AED',
    image: '/dashboard/hero-landscape.png',
    benefits: ['Company size verification', 'Custom use-case routing', 'VIP onboarding priority'],
    fields: [
      { id: 'name', label: 'Work name', type: 'text', required: true, options: [], placeholder: 'e.g. Liam Parker' },
      { id: 'business_email', label: 'Corporate email address', type: 'email', required: true, options: [], placeholder: 'liam@enterprise.com' },
      { id: 'company', label: 'Company name', type: 'text', required: true, options: [], placeholder: 'Acme Technologies' },
      {
        id: 'company_size',
        label: 'Company size',
        type: 'select',
        required: true,
        options: ['1 – 10 Employees', '11 – 50 Employees', '51 – 200 Employees', '201 – 1,000 Employees', '1,000+ Enterprise'],
        placeholder: 'Select employee count...'
      },
      {
        id: 'primary_interest',
        label: 'Primary solution requirement',
        type: 'select',
        required: true,
        options: ['Unified Funnel & Lead Automation', 'Omnichannel CRM & Messaging', 'Custom Domains & High-Speed Hosting', 'AI Copilot & Autonomous Agents'],
        placeholder: 'Choose primary use case...'
      },
      { id: 'questions', label: 'What challenges are you looking to solve?', type: 'textarea', required: false, options: [], placeholder: 'Any current tools you are replacing or specific integrations required?' }
    ]
  }
];
