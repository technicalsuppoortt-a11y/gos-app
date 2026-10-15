export const categories = ['Funnels', 'Websites', 'Landing Pages', 'Booking Pages', 'CRM Pipelines', 'AI Assistants', 'AI Knowledge Packs', 'Automations', 'Products', 'Email/SMS/WhatsApp'] as const;
export type Category = typeof categories[number];
export const industries = ['E-commerce', 'Fitness/Coaching', 'Real Estate', 'SaaS/Agency', 'Healthcare/Clinic', 'Professional Services'];
export const goals = ['Lead Generation', 'Direct Sale', 'Appointment Booking', 'Customer Onboarding', 'Automation Flow'];
export const destinations = ['Module template collection'];
export type Template = { id: string; name: string; description: string; category: Category; industry: string; goal: string; source: 'official' | 'team' | 'mine'; tags: string[]; updated: string; popularity: number; color: string; destination?: string; masterId?: string; content: { headline: string; steps: string[]; settings: { enabled: boolean; language: string } } };
const seeds: [Category, string, string, number, number, string[]][] = [
 ['Funnels', 'Coaching Discovery Funnel', 'Turn warm leads into booked discovery calls.', 1, 2, ['coaching', 'consultation', '3 steps']],
 ['Funnels', 'Product Launch Funnel', 'Build anticipation and convert your next launch.', 0, 1, ['launch', 'checkout', '4 steps']],
 ['Funnels', 'Property Lead Engine', 'Capture and qualify buyers for your listings.', 2, 0, ['property', 'buyers', 'qualification']],
 ['Websites', 'Modern Agency Studio', 'A polished home for your services and case studies.', 3, 0, ['portfolio', 'agency', '5 pages']],
 ['Websites', 'Wellness Clinic', 'Introduce your practitioners and grow patient bookings.', 4, 2, ['clinic', 'care', '4 pages']],
 ['Websites', 'Boutique Storefront', 'Showcase your collection with a refined storefront.', 0, 1, ['shop', 'collection', 'commerce']],
 ['Landing Pages', 'SaaS Waitlist', 'Validate your next product with a focused waitlist.', 3, 0, ['waitlist', 'startup', 'conversion']],
 ['Landing Pages', 'Fitness Challenge', 'Fill your next 30-day coaching program.', 1, 1, ['challenge', 'fitness', 'enrollment']],
 ['Landing Pages', 'Free Market Report', 'Exchange local insights for qualified buyer leads.', 2, 0, ['lead magnet', 'report', 'property']],
 ['Booking Pages', 'Strategy Session', 'Let prospects book a high-value strategy call.', 5, 2, ['calendar', 'consultation', '30 minutes']],
 ['Booking Pages', 'Clinic Appointment', 'Simplify patient scheduling and visit preparation.', 4, 2, ['patient', 'calendar', 'reminders']],
 ['Booking Pages', 'Personal Training Intro', 'Match new members with the right coach.', 1, 2, ['training', 'coach', 'intro']],
 ['CRM Pipelines', 'Agency Sales Pipeline', 'Move opportunities from first contact to signed deal.', 3, 0, ['sales', 'qualification', '6 stages']],
 ['CRM Pipelines', 'Property Buyer Journey', 'Track viewings, offers, and closing milestones.', 2, 1, ['viewings', 'buyers', '5 stages']],
 ['CRM Pipelines', 'Client Onboarding Board', 'Give every new client a consistent first experience.', 5, 3, ['handoff', 'client success', '4 stages']],
 ['AI Assistants', 'Store Shopping Concierge', 'Help customers discover products and resolve questions.', 0, 1, ['support', 'recommendations', 'AI']],
 ['AI Assistants', 'Lead Qualification Agent', 'Ask the right questions before your sales team steps in.', 3, 0, ['qualification', 'sales', 'AI']],
 ['AI Assistants', 'Clinic Reception Assistant', 'Answer visit questions and guide appointment requests.', 4, 2, ['reception', 'booking', 'AI']],
 ['AI Knowledge Packs', 'Agency Services Playbook', 'Ground your assistant in services, scope, and FAQs.', 3, 3, ['knowledge', 'services', 'FAQ']],
 ['AI Knowledge Packs', 'Store Policies & Returns', 'Give consistent answers on delivery and returns.', 0, 4, ['policies', 'shipping', 'knowledge']],
 ['AI Knowledge Packs', 'Coaching Program Guide', 'Equip your assistant with program and session details.', 1, 3, ['program', 'knowledge', 'FAQ']],
 ['Automations', 'New Lead Welcome Flow', 'Welcome, qualify, and route every incoming lead.', 5, 4, ['workflow', 'routing', 'welcome']],
 ['Automations', 'Abandoned Cart Recovery', 'Bring shoppers back with timely follow-up messages.', 0, 4, ['cart', 'recovery', '3 triggers']],
 ['Automations', 'Appointment Reminder Flow', 'Reduce no-shows with a sequence of helpful reminders.', 4, 4, ['reminders', 'calendar', 'workflow']],
 ['Products', 'Digital Course Bundle', 'Package lessons and resources into a ready-to-sell offer.', 1, 1, ['course', 'bundle', 'digital']],
 ['Products', 'Agency Retainer', 'Standardize your recurring service subscription.', 3, 1, ['subscription', 'retainer', 'service']],
 ['Products', 'Consulting Session', 'Sell a focused one-to-one expert consultation.', 5, 1, ['consulting', 'session', 'service']],
 ['Email/SMS/WhatsApp', 'Welcome Email Sequence', 'Introduce your brand and guide the first next step.', 3, 3, ['email', 'welcome', '5 messages']],
 ['Email/SMS/WhatsApp', 'SMS Booking Reminder', 'Keep appointments top of mind with a concise SMS.', 4, 2, ['SMS', 'reminder', 'booking']],
 ['Email/SMS/WhatsApp', 'WhatsApp Lead Follow-Up', 'Re-engage interested prospects with a personal message.', 2, 0, ['WhatsApp', 'follow-up', 'leads']],
];
export const colors = ['#6458c9', '#367c73', '#ab6b4c', '#485785', '#8059a0', '#386b9a'];
export const MASTER_TEMPLATES: Template[] = seeds.map(([category, name, description, niche, goal, tags], i) => ({
 id: 'master-' + i, name, description, category, industry: industries[niche], goal: goals[goal], tags, source: i % 7 === 5 ? 'team' : 'official',
 updated: '2026-10-' + String(7 - i % 7).padStart(2, '0'), popularity: 2400 - i * 47, color: colors[i % colors.length],
 content: { headline: name, steps: category === 'CRM Pipelines' ? ['New lead', 'Qualified', 'Proposal', 'Won'] : category === 'Automations' ? ['Trigger received', 'Check conditions', 'Send message', 'Assign owner'] : ['Welcome', 'Explore offer', 'Take action'], settings: { enabled: false, language: 'en' } },
}));

export const systemCategory: Record<Category,string> = {Funnels:'Funnel',Websites:'Website','Landing Pages':'Landing Page','Booking Pages':'Booking Page','CRM Pipelines':'CRM Pipeline','AI Assistants':'AI Assistant','AI Knowledge Packs':'AI Knowledge Pack',Automations:'Automation',Products:'Product Layout','Email/SMS/WhatsApp':'Email'};
export function systemAssetCategory(template:Template):string {return template.category==='Email/SMS/WhatsApp'?(template.tags.includes('SMS')?'SMS':template.tags.includes('WhatsApp')?'WhatsApp':'Email'):systemCategory[template.category];}
