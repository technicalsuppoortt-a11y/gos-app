import { read, write, saveSettings } from './store';
import { defaultSettings } from '../pages/settings/data';
import { makeLead, mainPipeline, templates as pipelineTemplates, templateStages } from '../pages/crm/model';
import { newProduct, defaultConfig, formatPrice, type Product } from '../pages/commerce/model';
import { blankPage, hostInstant, dateKey, type Appointment, type BookingPage } from '../pages/booking/model';
import { locationFromLabel } from '../pages/booking/booking-section-schema';
import { createBuilderDocument } from '../pages/BuilderWorkspace';
import { MASTER_TEMPLATES } from '../pages/system-template-data';
import { modulePermissions } from '../pages/settings/localState';
import type { CanonicalLead } from '../store/slices/crmSlice';
import type { Conversation } from '../pages/inbox/inboxData';
import sarah from '../assets/inbox/sarah.jpg';
import omar from '../assets/inbox/omar.jpg';
import lina from '../assets/inbox/lina.jpg';
import ahmed from '../assets/inbox/ahmed.jpg';
import nour from '../assets/inbox/nour.jpg';
import karim from '../assets/inbox/karim.jpg';
import diana from '../assets/inbox/diana.jpg';
import youssef from '../assets/inbox/youssef.jpg';
import mona from '../assets/inbox/mona.jpg';
import hassan from '../assets/inbox/hassan.jpg';
import mohamed from '../assets/inbox/mohamed.jpg';
import strategyCallImg from '../assets/products/strategy-call.jpg';
import agencyKitImg from '../assets/products/agency-kit.jpg';
import aiCourseImg from '../assets/products/ai-course.jpg';
import socialPackImg from '../assets/products/social-pack.jpg';
import whatsappSetupImg from '../assets/products/whatsapp-setup.jpg';
import growthBundleImg from '../assets/products/growth-bundle.jpg';
import funnelSetupImg from '../assets/products/funnel-setup.jpg';

// Rich, deterministic sample workspace for the in-app Demo Account. Every
// dashboard module reads these records through the demo adapters, so all
// tabs, widgets, tables and charts render populated, realistic data.
// Times are relative to "now" so the workspace always looks current.

const SEED_VERSION = 2;
const TENANT = 'account-demo';
const OWNER_ID = 'demo-account-user';

// Deterministic PRNG: identical sample data on every demo start.
let state = 0x2f6e2b1;
const rand = () => { state = (state + 0x6d2b79f5) | 0; let t = Math.imul(state ^ (state >>> 15), 1 | state); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const chance = (p: number) => rand() < p;
const HOUR = 3600000, DAY = 86400000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
/** A business-hours instant `days` ago; times later than now are spread over today instead. */
const dayAt = (days: number, hour = int(8, 21), minute = int(0, 59)) => {
  const d = new Date(now - days * DAY); d.setHours(hour, minute, int(0, 59), 0);
  if (d.getTime() < now - 60000) return d.getTime();
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  return midnight.getTime() + rand() * Math.max(0, now - midnight.getTime() - 120000);
};
const clockLabel = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const PEOPLE = [
  ['Sarah Ahmed', 'Bloom Skincare', sarah], ['Omar Hassan', 'Lens & Light Studio', omar], ['Lina Mostafa', 'Lina Designs', lina],
  ['Ahmed Fathy', 'Fathy Real Estate', ahmed], ['Nour El-Din', 'Nour Fitness Club', nour], ['Karim Adel', 'Adel Dental Clinic', karim],
  ['Diana Roberts', 'Roberts Consulting', diana], ['Youssef Samir', 'Samir Logistics', youssef], ['Mona Khalil', 'Khalil Bakery', mona],
  ['Hassan Ali', 'Ali Motors', hassan], ['Mohamed Tarek', 'Tarek Academy', mohamed],
  ['James Parker', 'Parker & Co.', ''], ['Emily Carter', 'Carter Wellness', ''], ['Layla Ibrahim', 'Layla Boutique', ''],
  ['Daniel Brooks', 'Brooks Media', ''], ['Salma Youssef', 'Salma Nutrition', ''], ['Michael Chen', 'Chen Architects', ''],
  ['Rania Farouk', 'Farouk Law Office', ''], ['Olivia Bennett', 'Bennett Yoga', ''], ['Tarek Mansour', 'Mansour Trading', ''],
  ['Sophia Martinez', 'Martinez Events', ''], ['Amr Saleh', 'Saleh Tech', ''], ['Hana Mahmoud', 'Hana Beauty Lounge', ''],
  ['Lucas Wright', 'Wright Coaching', ''], ['Yasmin Nabil', 'Nabil Interiors', ''], ['Ethan Hughes', 'Hughes Fitness', ''],
  ['Mariam Hosny', 'Hosny Pharmacy', ''], ['Noah Turner', 'Turner Digital', ''], ['Farah Zaki', 'Zaki Photography', ''],
  ['Ava Collins', 'Collins Therapy', ''], ['Khaled Ramzy', 'Ramzy Auto Care', ''], ['Grace Kim', 'Kim Learning Hub', ''],
  ['Ziad Fouad', 'Fouad Properties', ''], ['Chloe Adams', 'Adams Florals', ''], ['Basma Gamal', 'Gamal Kids Academy', ''],
  ['Ryan Mitchell', 'Mitchell Roofing', ''], ['Dina Sherif', 'Sherif Fashion', ''], ['Leo Foster', 'Foster Barbers', ''],
  ['Heba Mourad', 'Mourad Clinic', ''], ['Isabella Reed', 'Reed Marketing', ''], ['Sherif Lotfy', 'Lotfy Coffee Roasters', ''],
  ['Nadia Kamal', 'Kamal Language School', ''], ['Adam Walsh', 'Walsh Fitness Lab', ''], ['Jana Habib', 'Habib Home Decor', ''],
  ['Victor Price', 'Price Advisory', ''], ['Reem Saad', 'Saad Wellness Spa', ''], ['Owen Hayes', 'Hayes Studio', ''], ['Malak Nasser', 'Nasser Jewelry', ''],
] as const;
const SOURCES = ['Website', 'Instagram', 'WhatsApp', 'Referral', 'LinkedIn', 'Facebook', 'Email'] as const;
const TEAM = ['Alex Morgan', 'Mona Samir', 'Karim Fawzy', 'Sara Lewis'] as const;
const TAGS = ['VIP', 'Hot lead', 'Webinar', 'Returning', 'Consultation', 'Course buyer', 'Agency', 'Newsletter'] as const;
const INTERESTS = ['Growth Strategy Session', 'AI Business Toolkit', 'AI Automation Course', 'WhatsApp Automation Setup', 'Social Media Content Pack', 'Funnel Done-For-You'] as const;
const DEVICES = ['Mobile', 'Mobile', 'Mobile', 'Desktop', 'Desktop', 'Tablet'] as const;
const TRAFFIC = ['Instagram', 'Facebook Ads', 'Google Search', 'Direct', 'WhatsApp', 'Email'] as const;

const email = (name: string) => name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') + '@example.com';
const phone = (i: number) => `+20 10${i % 3} ${String(1000000 + i * 7919).slice(-7).replace(/(\d{3})(\d{4})/, '$1 $2')}`;

export function seedAccount() {
  if (read('initialized') && read('seed-version') === SEED_VERSION) return;

  /* ---------------------------------------------------------------- CRM */
  const servicePipeline = { id: 'service-pipeline', name: 'Service Business Pipeline', stages: templateStages(pipelineTemplates[1].stages) };
  const mainStages = ['LEAD_CAPTURED', 'CONTACT_CREATED', 'QUALIFIED', 'CONVERSATION', 'PAYMENT_COMPLETED', 'ACTIVE_CUSTOMER', 'FOLLOW_UP_NEEDED', 'BOOKING'] as const;
  const leads: CanonicalLead[] = PEOPLE.map(([name, company, avatar], i) => {
    const created = now - (i < 11 ? int(0, 20) : int(1, 75)) * DAY - int(1, 20) * HOUR;
    const stage = i < 6 ? (['CONVERSATION', 'LEAD_CAPTURED', 'ACTIVE_CUSTOMER', 'QUALIFIED', 'BOOKING', 'PAYMENT_COMPLETED'] as const)[i] : pick(mainStages);
    const customer = ['PAYMENT_COMPLETED', 'ACTIVE_CUSTOMER'].includes(stage);
    const last = Math.max(created, now - int(5, 60 * 24 * 6) * 60000);
    const activities = [
      { id: `act-${i}-1`, type: 'capture' as const, title: 'Lead captured', detail: `Captured from ${pick(SOURCES)} form`, at: iso(created) },
      ...(stage !== 'LEAD_CAPTURED' ? [{ id: `act-${i}-2`, type: 'message' as const, title: 'AI assistant replied', detail: 'Answered pricing questions and shared availability', at: iso(created + 2 * HOUR) }] : []),
      ...(['QUALIFIED', 'CONVERSATION', 'BOOKING', 'PAYMENT_COMPLETED', 'ACTIVE_CUSTOMER'].includes(stage) ? [{ id: `act-${i}-3`, type: 'stage' as const, title: 'Lifecycle stage updated', detail: 'Contact created → Qualified', at: iso(created + DAY) }] : []),
      ...(['BOOKING', 'PAYMENT_COMPLETED', 'ACTIVE_CUSTOMER'].includes(stage) ? [{ id: `act-${i}-4`, type: 'booking' as const, title: 'Discovery call booked', detail: '30 min · Google Meet', at: iso(created + 2 * DAY) }] : []),
      ...(customer ? [{ id: `act-${i}-5`, type: 'payment' as const, title: 'Payment received', detail: `${pick(INTERESTS)} · Paid by card`, at: iso(Math.min(now - HOUR, created + 3 * DAY)) }] : []),
      ...(chance(0.5) ? [{ id: `act-${i}-6`, type: 'note' as const, title: 'Note added', detail: 'Prefers WhatsApp. Follow up with case studies.', at: iso(last) }] : []),
    ].reverse();
    return makeLead({
      id: `demo-lead-${i}`, name, email: email(name), company, phone: phone(i), photoUrl: avatar || undefined,
      source: i < 11 ? (['WhatsApp', 'Facebook', 'Instagram', 'Website', 'Instagram', 'Referral', 'LinkedIn', 'Website', 'Facebook', 'WhatsApp', 'Email'] as const)[i] : pick(SOURCES),
      stage, lifecycleStage: stage, pipelineId: i % 5 === 4 ? servicePipeline.id : 'main',
      owner: pick(TEAM), value: pick([149, 199, 299, 349, 499, 790, 1200, 1500, 2400]), interest: pick(INTERESTS),
      tags: [...new Set([pick(TAGS), ...(chance(0.4) ? [pick(TAGS)] : [])])],
      qualificationStatus: ['QUALIFIED', 'CONVERSATION', 'BOOKING', 'PAYMENT_COMPLETED', 'ACTIVE_CUSTOMER'].includes(stage) ? 'Qualified' : stage === 'LEAD_CAPTURED' ? 'Pending' : chance(0.2) ? 'Unqualified' : 'Pending',
      bookingStatus: stage === 'BOOKING' ? 'Booked' : customer ? 'Completed' : stage === 'CONVERSATION' ? 'Offer Sent' : 'Not Scheduled',
      followUpState: customer ? 'CUSTOMER' : stage === 'BOOKING' ? 'BOOKED' : stage === 'CONVERSATION' ? 'CONVERSING' : stage === 'QUALIFIED' ? 'QUALIFIED' : stage === 'LEAD_CAPTURED' ? 'NEW' : 'CONTACTED',
      hasWhatsAppConsent: chance(0.75), hasMessagingConsent: chance(0.8), hasEmailConsent: chance(0.85),
      createdAt: iso(created), lastActivity: iso(last),
      nextFollowUpAt: !customer && chance(0.7) ? iso(now + int(-1, 6) * DAY + int(1, 8) * HOUR) : undefined,
      notes: chance(0.6) ? ['Interested in a monthly retainer after the first project.', 'Asked for a proposal with payment plan options.'].slice(0, int(1, 2)) : [],
      tasks: chance(0.55) ? [{ id: `task-${i}-1`, title: 'Send proposal & case study', due: iso(now + int(0, 4) * DAY).slice(0, 10), done: false }, { id: `task-${i}-2`, title: 'Confirm discovery call agenda', due: iso(now - DAY).slice(0, 10), done: true }] : [],
      activities,
    });
  });
  write('entity:leads', leads);
  write('entity:pipelines', [mainPipeline, servicePipeline]);

  write('entity:contacts', leads.slice(0, 30).map(lead => ({ id: `contact-${lead.id}`, leadId: lead.id, name: lead.name, email: lead.email, phone: lead.phone ?? '', company: lead.company, status: ['PAYMENT_COMPLETED', 'ACTIVE_CUSTOMER'].includes(lead.stage) ? 'Customer' : 'Active', createdAt: lead.createdAt })));

  /* ----------------------------------------------------------- Products */
  const catalog: { name: string; type: Product['type']; amount: number; image: string; description: string; billing?: 'Subscription' | 'Payment plan' }[] = [
    { name: 'Growth Strategy Session', type: 'Service', amount: 149, image: strategyCallImg, description: '60-minute 1:1 strategy call with a custom 90-day growth roadmap.' },
    { name: 'AI Business Toolkit', type: 'Digital Product', amount: 79, image: agencyKitImg, description: 'Prompt library, automation templates and SOPs to run your business with AI.' },
    { name: 'AI Automation Masterclass', type: 'Course', amount: 299, image: aiCourseImg, description: '6-module course to automate lead capture, follow-ups and bookings.' },
    { name: 'Social Media Content Pack', type: 'Digital Product', amount: 49, image: socialPackImg, description: '120 editable post templates and 30 days of caption ideas.' },
    { name: 'WhatsApp Automation Setup', type: 'Service', amount: 499, image: whatsappSetupImg, description: 'Done-for-you WhatsApp Business automation, live in 7 days.' },
    { name: 'Growth Accelerator Membership', type: 'Course', amount: 39, image: growthBundleImg, description: 'Monthly coaching calls, community access and new templates every week.', billing: 'Subscription' },
    { name: 'Funnel Done-For-You', type: 'Service', amount: 1200, image: funnelSetupImg, description: 'Complete sales funnel: copy, design, automations and launch support.', billing: 'Payment plan' },
  ];
  const customers = leads.filter((_, i) => i < 30);
  const transactions = Array.from({ length: 260 }, (_, i) => {
    // Denser, growing sales in recent weeks; every one of the last 30 days has sales.
    const days = i < 120 ? i % 30 : int(0, 89);
    const productIndex = pick([0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6]);
    const product = catalog[productIndex], customer = customers[(i * 7) % customers.length];
    const amount = product.billing === 'Payment plan' ? 400 : product.amount;
    const status = days === 0 && i % 9 === 0 ? 'Pending' : chance(0.04) ? 'Refunded' : 'Paid';
    return { id: `txn_${(100480 + i).toString(36).toUpperCase()}`, status, amount, currency: 'USD', createdAt: iso(dayAt(days)), productId: `demo-product-${productIndex}`, productName: product.name, customerName: customer.name, customerEmail: customer.email, leadId: customer.id, method: pick(['Visa •••• 4242', 'Mastercard •••• 5454', 'PayPal', 'Apple Pay', 'Visa •••• 1881']), provider: pick(['Stripe', 'Stripe', 'PayPal']) };
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  write('entity:transactions', transactions);
  write('entity:orders', transactions.slice(0, 60).map((t, i) => ({ id: `ORD-${2480 - i}`, transactionId: t.id, customerName: t.customerName, customerEmail: t.customerEmail, contactId: `contact-${t.leadId}`, productId: t.productId, productName: t.productName, total: t.amount, currency: 'USD', status: t.status === 'Paid' ? 'Paid' : t.status, createdAt: t.createdAt })));

  const products = catalog.map((item, i) => {
    const p = newProduct();
    p.type = item.type; p.config = defaultConfig(p.type);
    const c = p.config;
    p.id = `demo-product-${i}`; p.name = item.name; p.status = 'Active'; p.description = item.description; p.image = item.image;
    p.createdAt = iso(now - (120 - i * 9) * DAY);
    c.amount = item.billing === 'Payment plan' ? 400 : item.amount; c.currency = 'USD';
    if (item.billing === 'Subscription') { c.billing = 'Subscription'; c.access = 'While subscribed'; }
    if (item.billing === 'Payment plan') { c.billing = 'Payment plan'; c.installments = 3; }
    const sold = transactions.filter(t => t.productId === p.id && t.status === 'Paid');
    const revenue = sold.reduce((sum, t) => sum + t.amount, 0);
    p.sales = String(sold.length); p.revenue = money(revenue);
    p.stats = [['sales', `${sold.length} sales`], ['revenue', money(revenue)]];
    c.duration = item.type === 'Service' ? (i === 0 ? 60 : 45) : 60;
    c.fulfillment = item.type === 'Service' ? 'Delivered online via Google Meet with a recorded summary.' : '';
    if (item.type === 'Service') c.calendarId = i === 0 ? 'demo-calendar-strategy' : 'demo-calendar-discovery';
    c.assets = item.type === 'Digital Product' ? [{ id: `asset-${i}-1`, name: `${item.name} (PDF).pdf`, url: window.location.origin + '/product-access?token=demo', size: 2_480_000 }, { id: `asset-${i}-2`, name: 'Bonus templates.zip', url: window.location.origin + '/product-access?token=demo', size: 8_900_000 }] : [];
    c.modules = item.type === 'Course' ? [
      { id: `mod-${i}-1`, title: 'Foundations', lessons: [{ id: `les-${i}-1`, title: 'Welcome & roadmap', kind: 'Video', duration: '6 min', url: '' }, { id: `les-${i}-2`, title: 'Mapping your customer journey', kind: 'Video', duration: '14 min', url: '' }, { id: `les-${i}-3`, title: 'Workbook', kind: 'PDF', duration: '10 min', url: '' }] },
      { id: `mod-${i}-2`, title: 'Automate lead capture', lessons: [{ id: `les-${i}-4`, title: 'High-converting opt-in pages', kind: 'Video', duration: '18 min', url: '' }, { id: `les-${i}-5`, title: 'Connecting forms to your CRM', kind: 'Video', duration: '12 min', url: '' }] },
      { id: `mod-${i}-3`, title: 'AI follow-ups that book calls', lessons: [{ id: `les-${i}-6`, title: 'Writing your AI assistant prompt', kind: 'Text', duration: '9 min', url: '' }, { id: `les-${i}-7`, title: 'WhatsApp & email sequences', kind: 'Video', duration: '21 min', url: '' }] },
    ] : [];
    c.students = item.type === 'Course' ? sold.slice(0, 14).map((t, s) => ({ id: `stu-${i}-${s}`, name: t.customerName, email: t.customerEmail, status: (s % 6 === 5 ? 'Completed' : s % 7 === 6 ? 'Pending' : 'Active') as 'Active' | 'Pending' | 'Completed', progress: s % 6 === 5 ? 100 : int(8, 92), enrolledAt: t.createdAt })) : [];
    c.orders = sold.slice(0, 12).map(t => ({ id: t.id, customer: t.customerName, email: t.customerEmail, at: t.createdAt, amount: t.amount, currency: 'USD', status: 'Paid' as const, productName: t.productName }));
    c.activities = [{ id: `pa-${i}-1`, title: 'New purchase received', at: sold[0]?.createdAt ?? iso(now - DAY) }, { id: `pa-${i}-2`, title: 'Product settings and content saved', at: iso(now - int(2, 9) * DAY) }, { id: `pa-${i}-3`, title: 'Product created', at: p.createdAt }];
    c.automations = { grantAccess: true, confirmation: true, crmTag: item.name.split(' ')[0].toLowerCase() + '-buyer', followUp: true, fileDelivery: item.type === 'Digital Product', calendarInvite: item.type === 'Service' };
    c.experience = { ...c.experience!, oneTimeAmount: item.amount, installmentAmount: item.billing === 'Payment plan' ? 400 : Math.round(item.amount / 3 * 100) / 100, recurringAmount: item.billing === 'Subscription' ? item.amount : 29, recurringEnabled: item.billing === 'Subscription', planEnabled: item.billing === 'Payment plan', shortDescription: item.description, category: item.type === 'Service' ? 'Consulting' : item.type === 'Course' ? 'Education' : 'Templates', tags: ['AI', 'Growth', 'Automation'].slice(0, int(1, 3)), instructor: { name: 'Alex Morgan', bio: 'Founder of Northstar Growth Studio. Helped 300+ service businesses automate growth.', image: '' }, comparePrice: Math.round(item.amount * 1.4), showComparePrice: item.type !== 'Service', activeStudents: c.students.length, courseLevel: 'Intermediate', estimatedDuration: item.type === 'Course' ? '4h 30m' : undefined, updatedAt: iso(now - int(1, 9) * DAY) };
    p.reviews = Array.from({ length: int(4, 9) }, (_, r) => ({ id: `rev-${i}-${r}`, rating: pick([5, 5, 5, 4, 5, 4]), comment: pick(['Clear, practical and worth every cent.', 'Our booked calls doubled in three weeks.', 'Excellent support and super actionable.', 'Exactly what my team needed to get organized.', 'Loved the templates — saved us hours every week.']), author: customers[(i + r * 3) % customers.length].name, createdAt: iso(now - int(2, 60) * DAY) }));
    p.price = formatPrice(c);
    return p;
  });
  write('entity:products', products);
  write(`gos-commerce-products-v1:${TENANT}:settings`, { name: 'Northstar Growth Studio', email: 'billing@northstar-demo.com', currency: 'USD', timezone: 'Africa/Cairo', stripe: true, paypal: true, applePay: true, googlePay: false, taxRate: 0, inclusiveTax: false, receipts: true, receiptPrefix: 'NGS', guestCheckout: true, collectName: true, requirePhone: true, redirectUrl: '', paymentMethods: [
    { id: 'stripe', provider: 'Stripe', name: 'Credit / Debit Cards', type: 'Visa, Mastercard, Amex', status: 'Active', createdAt: iso(now - 90 * DAY) },
    { id: 'paypal', provider: 'PayPal', name: 'PayPal Express', type: 'One-Click Checkout', status: 'Active', createdAt: iso(now - 60 * DAY) },
    { id: 'applePay', provider: 'Apple Pay', name: 'Apple Pay', type: 'Apple Wallet (Tokenized)', status: 'Active', createdAt: iso(now - 30 * DAY) },
  ] });
  write('entity:discounts', [
    { id: 'disc-1', code: 'WELCOME20', description: '20% off first purchase', type: 'Percentage', value: 20, applies: 'All Products', uses: 64, limit: 500, expiry: iso(now + 60 * DAY).slice(0, 10), active: true, minimum: 0, customersOnly: false, once: true, currency: 'USD' },
    { id: 'disc-2', code: 'MASTERCLASS50', description: '$50 off the AI Automation Masterclass', type: 'Fixed Amount', value: 50, applies: 'Specific Products', uses: 31, limit: 100, expiry: iso(now + 21 * DAY).slice(0, 10), active: true, minimum: 0, customersOnly: false, once: true, productIds: ['demo-product-2'], currency: 'USD' },
    { id: 'disc-3', code: 'VIP15', description: 'Loyalty discount for returning customers', type: 'Percentage', value: 15, applies: 'All Products', uses: 18, limit: 0, expiry: '', active: true, minimum: 100, customersOnly: true, once: false, currency: 'USD' },
    { id: 'disc-4', code: 'BLACKFRIDAY', description: 'Black Friday campaign', type: 'Percentage', value: 35, applies: 'All Products', uses: 0, limit: 300, expiry: iso(now + 35 * DAY).slice(0, 10), active: false, minimum: 0, customersOnly: false, once: true, currency: 'USD' },
    { id: 'disc-5', code: 'SUMMER10', description: 'Summer promotion', type: 'Percentage', value: 10, applies: 'All Products', uses: 112, limit: 150, expiry: iso(now - 20 * DAY).slice(0, 10), active: false, minimum: 0, customersOnly: false, once: false, currency: 'USD' },
  ]);

  /* ------------------------------------------------------------ Booking */
  const calendar = (id: string, name: string, slug: string, duration: number, color: string, location: string, description: string): BookingPage => {
    const page = blankPage();
    return Object.assign(page, { id, name, slug, duration, durationOptions: [duration], color, hostName: 'Alex Morgan', description, location, locationOptions: [location], locations: [locationFromLabel(location, `${id}-location`)], questions: [...page.questions, { id: 'goal', label: 'What would you like to achieve?', type: 'textarea' as const, required: false, options: [] }] });
  };
  const calendars = [
    calendar('demo-calendar-discovery', 'Discovery Call', 'discovery-call', 30, 'violet', 'Google Meet', 'A free 30-minute call to understand your goals and see if we are a fit.'),
    calendar('demo-calendar-strategy', 'Growth Strategy Session', 'strategy-session', 60, 'mint', 'Zoom', 'Paid 60-minute deep dive with a custom 90-day growth roadmap.'),
    calendar('demo-calendar-onboarding', 'Client Onboarding', 'client-onboarding', 45, 'blue', 'Google Meet', 'Kick-off call for new clients: goals, access and timeline.'),
  ];
  write('entity:calendars', calendars);
  const tz = calendars[0].hostTimezone;
  const slots = ['09:30', '10:00', '11:00', '12:30', '14:00', '15:00', '16:30'];
  const bookings: Appointment[] = Array.from({ length: 40 }, (_, i): Appointment => {
    // The first 22 bookings are in the past, the rest are upcoming (weekdays only).
    const offset = i < 22 ? -(1 + Math.floor(i * 0.7)) : Math.floor((i - 22) * 1.6) + 1;
    const date = new Date(now + offset * DAY); while (date.getDay() === 0 || date.getDay() === 6) { date.setDate(date.getDate() + (offset < 0 ? -1 : 1)); }
    const key = dateKey(date), time = slots[i % slots.length];
    const page = calendars[i % 5 === 0 ? 1 : i % 4 === 0 ? 2 : 0];
    const lead = leads[(i * 5) % leads.length];
    const start = hostInstant(key, time, tz).toISOString();
    const past = Date.parse(start) < now;
    return { id: `demo-booking-${i}`, calendarId: page.id, serviceName: page.name, name: lead.name, email: lead.email, whatsapp: lead.phone ?? '', date: key, time, start, duration: page.duration, timezone: tz, location: page.location, status: past ? (i % 9 === 0 ? 'Canceled' : 'Confirmed') : i % 6 === 0 ? 'Pending' : 'Confirmed', source: lead.source, fromAd: i % 3 === 0, customAnswers: { goal: pick(['Get more qualified leads', 'Automate WhatsApp follow-ups', 'Launch a new course', 'Fill my calendar with consultations']) }, guests: [], ...(page.id === 'demo-calendar-strategy' ? { payment: { amount: 149, currency: 'USD', status: 'Pending' as const } } : {}) };
  });
  write('entity:bookings', bookings.map(b => ({ ...b, leadId: leads.find(l => l.email === b.email)?.id })));

  /* -------------------------------------------- Funnels, websites, domains */
  const asset = (id: string, kind: 'funnel' | 'website', name: string, image: string, steps: number | undefined, domain: string, color: string, description: string, template?: string) => {
    const document = createBuilderDocument(kind, name, image, steps, template);
    return { id, kind, name, domain, image, updated: iso(now - int(1, 72) * HOUR), document, description, status: domain ? 'Published' : 'Draft', publishedUrl: domain ? window.location.origin + '/asset-preview/' + id : undefined, settings: { seo: name, navigation: '', color }, integrations: { 'Meta Pixel': { enabled: true, configuration: '928174620451' }, 'Google Analytics 4': { enabled: true, configuration: 'G-NGS2026DEMO' }, Stripe: { enabled: true, configuration: 'Northstar workspace' } } };
  };
  const assets = [
    asset('demo-funnel-discovery', 'funnel', 'Discovery Call Funnel', '/dashboard/funnel-consultation.png', 4, 'go.northstar-demo.com', '#7546f5', 'Free strategy call opt-in → booking → confirmation.'),
    asset('demo-funnel-fitness', 'funnel', '30-Day Fitness Challenge', '/dashboard/funnel-fitness.png', 5, 'challenge.northstar-demo.com', '#10b981', 'Lead magnet funnel with upsell to the coaching membership.'),
    asset('demo-funnel-webinar', 'funnel', 'AI Automation Webinar', '/dashboard/funnel-webinar.png', 4, '', '#f59e0b', 'Webinar registration with replay and masterclass offer.'),
    asset('demo-site-northstar', 'website', 'Northstar Growth Studio', '/dashboard/funnel-nutrition.png', 7, 'northstar-demo.com', '#6366f1', 'Main business website with services, blog and booking.', 'Agency Website'),
    asset('demo-site-clinic', 'website', 'Bright Smile Dental Clinic', '/dashboard/product-consultation.png', 6, '', '#0ea5e9', 'Client website project — clinic template.', 'Clinic Website'),
  ];
  const domains = [
    { id: 'dom-1', name: 'northstar-demo.com', status: 'Connected', assetId: 'demo-site-northstar', ssl: 'Active', default: true, renewalAt: iso(now + 240 * DAY), issues: [], dnsRecords: [], checkedAt: iso(now - 2 * HOUR) },
    { id: 'dom-2', name: 'go.northstar-demo.com', status: 'Connected', assetId: 'demo-funnel-discovery', ssl: 'Active', default: false, renewalAt: iso(now + 240 * DAY), issues: [], dnsRecords: [], checkedAt: iso(now - 2 * HOUR) },
    { id: 'dom-3', name: 'challenge.northstar-demo.com', status: 'Connected', assetId: 'demo-funnel-fitness', ssl: 'Active', default: false, renewalAt: iso(now + 240 * DAY), issues: [], dnsRecords: [], checkedAt: iso(now - 5 * HOUR) },
    { id: 'dom-4', name: 'brightsmile-clinic.com', status: 'Pending', assetId: 'demo-site-clinic', ssl: 'Not configured', default: false, renewalAt: null, issues: ['CNAME record not found yet'], dnsRecords: [{ domainName: 'www.brightsmile-clinic.com', type: 'CNAME', rdata: 'sites.gos.app', requiredAction: 'Add this record at your DNS provider' }], checkedAt: iso(now - 30 * 60000) },
  ];
  write('entity:assets', assets); write('entity:domains', domains);
  write('gos.assets.workspace.v1', { assets, domains });
  write('entity:userTemplates', MASTER_TEMPLATES.filter((_, i) => i % 7 === 0).slice(0, 6).map((template, i) => ({ ...template, id: `my-template-${i}`, source: 'mine', masterId: template.id, name: `${template.name} · Northstar`, updated: iso(now - int(1, 30) * DAY), popularity: int(10, 90) })));

  /* -------------------------------------------------------------- Events */
  type SeedEvent = { id: string; type: string; createdAt: string; resource?: string; resourceId?: string; leadId?: string; productId?: string; amount?: number; currency?: string; source?: string; device?: string; step?: string; actorId?: string };
  const events: SeedEvent[] = [];
  let seq = 0;
  const event = (type: string, ms: number, extra: Partial<SeedEvent> = {}) => events.push({ id: `ev-${(seq++).toString(36)}`, type, createdAt: iso(Math.min(ms, now - 60000)), ...extra });
  const recentCap = now - 3 * HOUR; // keep the freshest activity for meaningful business events
  const funnelWeights: Record<string, number> = { 'demo-funnel-discovery': 1.4, 'demo-funnel-fitness': 1, 'demo-funnel-webinar': 0.7 };
  for (const item of assets) {
    const pages = item.document.pages.map(page => page.name);
    const formStep = pages[0] ?? 'Landing Page';
    for (let days = 0; days < 30; days++) {
      if (item.kind === 'website') { for (let v = int(1, 4); v > 0; v--) event('page.viewed', Math.min(recentCap, dayAt(days, int(7, 23))), { resource: 'assets', resourceId: item.id, step: pick(pages), source: pick(TRAFFIC), device: pick(DEVICES), actorId: 'Visitor' }); continue; }
      const weight = funnelWeights[item.id] ?? 1;
      let count = Math.round(int(2, 6) * weight * (1 + (30 - days) / 60));
      pages.forEach(step => { for (let v = 0; v < count; v++) event('page.viewed', Math.min(recentCap, dayAt(days, int(7, 23))), { resource: 'assets', resourceId: item.id, step, source: pick(TRAFFIC), device: pick(DEVICES), actorId: 'Visitor' }); count = Math.round(count * 0.55); });
      const captured = Math.max(0, Math.round(int(0, 2) * weight));
      for (let l = 0; l < captured; l++) { const lead = leads[int(0, leads.length - 1)]; event('lead.captured', dayAt(days), { resource: 'crm', resourceId: item.id, leadId: lead.id, step: formStep, source: pick(TRAFFIC), device: pick(DEVICES), actorId: 'Funnel form' }); }
      if (item.id === 'demo-funnel-discovery' && chance(0.45)) event('booking.saved', dayAt(days), { resource: 'calendars', resourceId: item.id, actorId: 'Booking page' });
    }
  }
  // Make funnel-captured leads show up in each funnel's Leads table.
  for (const item of assets.filter(a => a.kind === 'funnel')) leads.filter((_, i) => i % 3 === ['demo-funnel-discovery', 'demo-funnel-fitness', 'demo-funnel-webinar'].indexOf(item.id)).slice(0, 12).forEach(lead => event('lead.captured', Date.parse(lead.createdAt ?? iso(now - DAY)), { resource: 'crm', resourceId: item.id, leadId: lead.id, step: item.document.pages[0]?.name, source: lead.source, device: pick(DEVICES), actorId: 'Funnel form' }));
  for (const t of transactions) { if (t.status !== 'Paid') continue; const ms = Date.parse(t.createdAt); event('payment.completed', ms, { resource: 'products', productId: t.productId, amount: t.amount, currency: 'USD', leadId: t.leadId, actorId: t.customerName }); if (ms > now - 30 * DAY && chance(0.5)) event('order.created', ms - 60000, { resource: 'commerce', productId: t.productId, actorId: t.customerName }); }
  for (const b of bookings) event(b.status === 'Canceled' ? 'booking.cancelled' : 'booking.saved', Math.min(now - HOUR, Date.parse(b.start) - int(2, 6) * DAY), { resource: 'calendars', actorId: b.name });
  for (let days = 0; days < 60; days++) {
    for (let m = int(1, 4); m > 0; m--) event(pick(['message.received', 'message.received', 'conversation.assigned']), dayAt(days), { resource: 'inbox', actorId: pick(PEOPLE)[0] });
    if (chance(0.8)) event('workflow.completed', dayAt(days), { resource: 'followup', actorId: 'AI Assistant' });
    if (chance(0.5)) event('lead.stage_changed', dayAt(days), { resource: 'crm', actorId: pick(TEAM) });
    if (chance(0.3)) event('copilot.responded', dayAt(days), { resource: 'copilot', actorId: 'Alex Morgan' });
    if (chance(0.15)) event('workspace.updated', dayAt(days), { resource: pick(['products', 'calendars', 'assets', 'crm']), actorId: pick(TEAM) });
    if (chance(0.08)) event('settings.updated', dayAt(days), { resource: 'settings', actorId: 'Alex Morgan' });
  }
  // The freshest activity, shown first on the dashboard and notification center.
  event('payment.completed', now - 6 * 60000, { resource: 'products', productId: 'demo-product-2', amount: 299, currency: 'USD', actorId: 'Sarah Ahmed' });
  event('lead.captured', now - 14 * 60000, { resource: 'crm', resourceId: 'demo-funnel-discovery', leadId: leads[1].id, step: assets[0].document.pages[0]?.name, source: 'Instagram', device: 'Mobile', actorId: 'Funnel form' });
  event('booking.saved', now - 38 * 60000, { resource: 'calendars', resourceId: 'demo-funnel-discovery', actorId: 'Lina Mostafa' });
  event('message.received', now - 52 * 60000, { resource: 'inbox', actorId: 'Omar Hassan' });
  event('workflow.completed', now - 75 * 60000, { resource: 'followup', actorId: 'AI Assistant' });
  events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  write('entity:events', events);
  // Older notifications are already read; the bell shows only fresh activity.
  write(`gos.notifications.v1:${OWNER_ID}`, events.filter(e => Date.parse(e.createdAt) < now - 20 * HOUR).slice(0, 100).map(e => e.id));

  /* --------------------------------------------------------------- Inbox */
  const threads: [number, Conversation['channel'], Conversation['tags'], string, boolean, [Conversation['messages'][number]['sender'], string][]][] = [
    [0, 'whatsapp', ['booking', 'interested'], 'Booking', false, [['customer', 'Hi! I found your growth consultation on Instagram. I run a small skincare brand and want help with our launch.'], ['ai', 'Hi Sarah! Happy to help. Are you looking for support with launch strategy, paid ads, or both?'], ['customer', 'Both ideally. We launch next month with a budget of around $3,000 for the first campaign.'], ['note', 'Warm lead · interested in the Growth package. Discuss launch timeline on the call.'], ['agent', 'Thanks Sarah! Let’s start with a 30-minute discovery call. Would Thursday at 2 PM work?'], ['customer', 'Thursday at 2 PM works perfectly. Is the first consultation online?']]],
    [1, 'facebook', ['new', 'question'], 'New Lead', true, [['customer', 'Hello! Does the website + marketing package include an online booking page?'], ['ai', 'Hi Omar, yes! Every package includes a mobile-friendly booking page synced with your calendar. What type of business is it for?'], ['customer', 'A photography studio. We need portrait sessions and event enquiries in one place.'], ['ai', 'Great fit! Portrait sessions can get their own calendar, and event enquiries a separate form. Want me to send the package comparison?'], ['customer', 'Yes please, send me the difference between Starter and Growth.']]],
    [2, 'instagram', ['interested', 'booking'], 'Customer', true, [['customer', 'Good morning! Is our onboarding call still on for tomorrow at 11?'], ['ai', 'Good morning Lina! Yes, tomorrow at 11:00 AM is confirmed. Your meeting link is in the confirmation email.'], ['customer', 'Found it! Anything I should prepare?'], ['ai', 'Your logo, brand photos and your top three goals would be perfect.'], ['customer', 'Amazing, thank you! I’ll bring the brand photos 😊']]],
    [3, 'whatsapp', ['interested'], 'Interested', true, [['customer', 'How fast can you set up WhatsApp automation for a real estate office?'], ['ai', 'Typically within 7 days. We connect your number, build the lead qualification flow and sync every contact to your CRM.'], ['customer', 'Can it qualify buyers by budget and area?'], ['ai', 'Absolutely — it asks budget, preferred area and timeline, then books a viewing call for qualified buyers.']]],
    [4, 'instagram', ['new'], 'New Lead', true, [['customer', 'Do you have a program for gym owners? 🏋️'], ['ai', 'Yes! Our 30-Day Fitness Challenge funnel is built for gyms. Shall I send you a live example?'], ['customer', 'Yes, send it over']]],
    [5, 'email', ['question'], 'Contacted', false, [['customer', 'Hello, we’re a dental clinic interested in a new website with online appointments. What does it cost?'], ['agent', 'Hi Karim, thanks for reaching out! Our clinic package starts at $1,200 with booking, reminders and reviews included. I’ve attached a short proposal.'], ['customer', 'Thanks — can we do a payment plan?'], ['agent', 'Yes, 3 monthly payments of $400. Shall I send the checkout link?']]],
    [6, 'messenger', ['booking'], 'Booking', true, [['customer', 'I’d like to book the strategy session for next week.'], ['ai', 'Wonderful! Here are the next available times: Tue 10:00, Wed 14:00 or Thu 11:00.'], ['customer', 'Wednesday 14:00 please'], ['ai', 'Booked ✅ You’ll receive a confirmation and calendar invite shortly.']]],
    [7, 'whatsapp', ['interested', 'question'], 'Interested', true, [['customer', 'Is the AI Automation Masterclass suitable for beginners?'], ['ai', 'Yes! It starts from the basics and every lesson includes templates you can copy. Most students finish in two weeks.'], ['customer', 'Is there a discount this week?'], ['ai', 'You can use code MASTERCLASS50 for $50 off until the end of the month.']]],
    [8, 'facebook', ['new'], 'New Lead', true, [['customer', 'Hi, do you build ordering pages for bakeries?'], ['ai', 'Hi Mona! Yes, we can create an order page with pickup times and WhatsApp confirmations.']]],
    [9, 'webchat', ['question'], 'Contacted', true, [['customer', 'What integrations do you support?'], ['ai', 'WhatsApp, Instagram, Facebook, Gmail, Google Calendar, Zoom and Stripe — plus webhooks for everything else.']]],
    [10, 'email', ['booking', 'interested'], 'Customer', false, [['customer', 'Can we add two more team members to our onboarding?'], ['agent', 'Of course, Mohamed. Please share their emails and I’ll add them to the invite.'], ['customer', 'Done — sent them over just now.']]],
    [12, 'instagram', ['interested'], 'Interested', true, [['customer', 'Loved your reel about AI follow-ups! How does it work?'], ['ai', 'Thanks Emily! The assistant replies instantly, qualifies leads and books calls 24/7. Want a quick demo call?'], ['customer', 'Sure, maybe Friday?']]],
  ];
  const relative = ['2 min', '14 min', '1 hr', '2 hr', '3 hr', '5 hr', 'Yesterday', 'Yesterday', 'Mon', 'Sun', 'Sat', 'Fri'];
  const conversations = threads.map(([leadIndex, channel, tags, stage, ai, script], i) => {
    const lead = leads[leadIndex];
    const started = now - (i < 6 ? (i + 1) * 45 * 60000 : (i - 4) * DAY);
    const messages = script.map(([sender, text], m) => ({ id: `msg-${i}-${m}`, sender, text, body: text, role: sender === 'customer' ? 'customer' : 'assistant', time: clockLabel(started + m * 3 * 60000), created_at: iso(started + m * 3 * 60000) }));
    const last = messages[messages.length - 1];
    const assignee = ai ? 'Alex Morgan' : pick(TEAM);
    return {
      id: `demo-conversation-${i}`, name: lead.name, avatar: PEOPLE[leadIndex][2] || undefined, initials: lead.name.split(' ').map(word => word[0]).join(''), channel,
      preview: last.text, time: relative[i], unread: i < 3 ? 3 - i : i === 4 ? 1 : 0, tags, stage, source: channel, phone: lead.phone ?? '', email: lead.email, location: pick(['Cairo, Egypt', 'Alexandria, Egypt', 'Dubai, UAE', 'Riyadh, KSA', 'London, UK']),
      assignee, aiAutoReply: ai, takenOver: !ai, followUp: true, followUpRules: [true, ai, true], starred: i % 4 === 0,
      messages, activity: [
        ...(ai ? [{ id: `cact-${i}-ai`, kind: 'ai' as const, text: 'AI assistant replied automatically', time: clockLabel(started + 3 * 60000) }] : [{ id: `cact-${i}-handoff`, kind: 'handoff' as const, text: `${assignee} took over the conversation`, time: clockLabel(started + 5 * 60000) }]),
        { id: `cact-${i}-tag`, kind: 'tag' as const, text: `Tagged as ${tags.join(' and ')}`, time: clockLabel(started + 2 * 60000) },
        { id: `cact-${i}-created`, kind: 'created' as const, text: `New enquiry from ${channel}`, time: clockLabel(started) },
      ],
      // API / follow-up projections of the same thread.
      leadId: lead.id, customer_name: lead.name, last_message_body: last.text, updated_at: last.created_at, status: ai ? 'open' : 'handoff', unread_count: i < 3 ? 3 - i : 0,
      displayName: lead.name, excerpt: last.text, state: lead.followUpState,
    };
  });
  write('entity:conversations', conversations); write('local:inbox', conversations);

  /* ------------------------------------------------- AI Copilot & Follow-Up */
  const chat = (id: string, title: string, group: string, category: string, ms: number, turns: [string, string][]) => ({ id, title, group, category, time: clockLabel(ms), prompt: turns[0][0], updatedAt: iso(ms), messages: turns.flatMap(([q, a], t) => [{ id: `${id}-u${t}`, role: 'user', text: q }, { id: `${id}-a${t}`, role: 'assistant', text: a }]) });
  write('entity:copilotConversations', [
    chat('copilot-1', 'Plan a Black Friday campaign', 'Today', 'Campaigns', now - 2 * HOUR, [['Plan a Black Friday campaign for my AI Automation Masterclass', 'Here’s a 7-day plan: 1) Teaser reel + waitlist (Day 1–2), 2) Early-bird email with BLACKFRIDAY code (Day 3), 3) Live Q&A webinar (Day 5), 4) Last-chance WhatsApp broadcast (Day 7). Expected lift: +35% vs. last month.'], ['Write the last-chance WhatsApp message', 'Hi {{name}} 👋 Last chance! Our AI Automation Masterclass is 35% off until midnight with code BLACKFRIDAY. Join 300+ business owners automating their follow-ups → {{link}}']]),
    chat('copilot-2', 'Summarize this week’s new leads', 'Today', 'Leads', now - 5 * HOUR, [['Summarize this week’s new leads', 'You captured 23 new leads this week (+18%). Top sources: Instagram (9), Website (6), WhatsApp (5). 7 are qualified and 4 already booked discovery calls. Suggested action: follow up with the 5 leads waiting more than 24h.']]),
    chat('copilot-3', 'Landing page for the dental clinic', 'Yesterday', 'Landing Pages', now - 28 * HOUR, [['Create a landing page for a dental clinic offering free check-ups', 'Draft ready: Hero “Your healthiest smile starts here”, free check-up offer, 3 service cards, doctor bios, reviews carousel and a booking form connected to your Discovery Call calendar.']]),
    chat('copilot-4', 'Improve my follow-up sequence', 'This week', 'General', now - 3 * DAY, [['How can I improve my follow-up sequence?', 'Your sequence converts at 14%. Add a value message on day 2 (case study), switch the day-4 email to WhatsApp (3× reply rate) and end with a soft breakup message on day 7.']]),
    chat('copilot-5', 'Pricing for the membership', 'This week', 'General', now - 4 * DAY, [['What price should I set for my monthly membership?', 'Based on your audience and similar offers, $39/month with a $390/year option is a strong starting point. Add a 7-day trial to reduce friction.']]),
    chat('copilot-6', 'Re-engage cold leads', 'This month', 'Campaigns', now - 12 * DAY, [['Write a campaign to re-engage cold leads', 'Three-step re-engagement: 1) “Still interested?” check-in, 2) free mini-audit offer, 3) limited-time bonus. Target the 14 leads inactive for 30+ days.']]),
  ]);
  write('assistant', { live_enabled: true, channels: { whatsapp: true, instagram: true, facebook: true, messenger: true, webchat: true, email: false } });
  write('agent', { name: 'Nova', role: 'Sales & booking assistant', language: 'Auto-detect Arabic / English', goal: 'Appointments' });
  write('gos.ai-followup.engine-enabled.v1', true);
  write('entity:knowledge', [
    { id: 'kn-1', name: 'Business overview', title: 'Business overview', type: 'text', content: 'Northstar Growth Studio helps service businesses capture leads, automate WhatsApp follow-ups and fill their calendars with qualified calls.', detail: 'Who we are and who we help', status: 'ready', approved: true, chunk_count: 6, created_at: iso(now - 40 * DAY) },
    { id: 'kn-2', name: 'Pricing & packages', title: 'Pricing & packages', type: 'products', content: 'Strategy session $149 · AI Toolkit $79 · Masterclass $299 · WhatsApp setup $499 · Membership $39/mo · Funnel DFY 3×$400.', detail: 'Current offers and payment plans', status: 'ready', approved: true, chunk_count: 9, created_at: iso(now - 35 * DAY) },
    { id: 'kn-3', name: 'Frequently asked questions', title: 'Frequently asked questions', type: 'faq', content: 'Refunds within 14 days · Calls are on Google Meet · Setup takes 7 days · We support Arabic and English.', detail: '24 answered questions', status: 'ready', approved: true, chunk_count: 24, created_at: iso(now - 30 * DAY) },
    { id: 'kn-4', name: 'northstar-demo.com', title: 'northstar-demo.com', type: 'url', content: 'Website pages: Home, Services, About, Blog, Contact.', detail: 'https://northstar-demo.com · 12 pages crawled', status: 'ready', approved: true, chunk_count: 31, created_at: iso(now - 20 * DAY) },
    { id: 'kn-5', name: 'Brand voice guidelines', title: 'Brand voice guidelines', type: 'instructions', content: 'Friendly, confident and concise. Always suggest the next step and offer a discovery call.', detail: 'Tone and escalation rules', status: 'ready', approved: true, chunk_count: 4, created_at: iso(now - 10 * DAY) },
    { id: 'kn-6', name: 'Case studies.pdf', title: 'Case studies.pdf', type: 'file', content: 'Bloom Skincare: 3× bookings in 30 days. Lens & Light: 62% faster response time.', detail: 'PDF · 2.4 MB', status: 'ready', approved: true, chunk_count: 18, created_at: iso(now - 6 * DAY) },
  ]);
  write('entity:playground', [
    { id: 'pg-1', question: 'How much is the strategy session?', answer: 'The Growth Strategy Session is $149 for 60 minutes and includes a custom 90-day roadmap. Would you like to book a time?', outcome: 'answered', citations: [], verdict: 'good', created_at: iso(now - 2 * DAY) },
    { id: 'pg-2', question: 'Do you offer refunds?', answer: 'Yes — all digital products include a 14-day money-back guarantee.', outcome: 'answered', citations: [], verdict: 'good', created_at: iso(now - 2 * DAY) },
    { id: 'pg-3', question: 'Can I pay in installments?', answer: 'The Funnel Done-For-You package can be paid in 3 monthly payments of $400.', outcome: 'answered', citations: [], verdict: 'good', created_at: iso(now - DAY) },
    { id: 'pg-4', question: 'Do you work on weekends?', answer: 'Our team is available Sunday to Thursday, but I can answer questions and book calls 24/7.', outcome: 'answered', citations: [], created_at: iso(now - 3 * HOUR) },
  ]);
  const flow = (id: string, name: string, description: string, trigger: string, from: string, to: string, actionType: string, active: boolean, steps: [string, string, string][], messageText: string) => ({ id, name, description, trigger, from, to, actionType, active, messageText, sequenceSteps: steps.map(([delay, unit, action], s) => ({ id: `${id}-s${s}`, delay, unit, action })), leadIds: leads.slice(0, 12).filter((_, i) => i % 3 === name.length % 3).map(l => l.id), status: active ? 'Enabled' : 'Paused' });
  write('entity:workflows', [
    flow('wf-1', 'Welcome new leads', 'Instant WhatsApp welcome and qualification questions for every new lead.', 'New lead', 'NEW', 'CONTACTED', 'WhatsApp', true, [['0', 'minutes', 'WhatsApp'], ['1', 'hour', 'Email'], ['1', 'day', 'WhatsApp']], 'Hi {{name}}! Thanks for reaching out to Northstar 👋 What’s the #1 goal you want to hit this quarter?'),
    flow('wf-2', 'Book discovery calls', 'Offer available times to qualified leads and confirm bookings.', 'Lead qualified', 'QUALIFIED', 'BOOKING_OFFERED', 'WhatsApp', true, [['10', 'minutes', 'WhatsApp'], ['1', 'day', 'Email']], 'Great news {{name}} — you’re a perfect fit! Pick a time for your free discovery call: {{booking_link}}'),
    flow('wf-3', 'Pre-meeting reminders', 'Reduce no-shows with reminders 24h and 1h before calls.', 'Booking confirmed', 'BOOKED', 'PRE_MEETING_REMINDER', 'Email', true, [['24', 'hours', 'Email'], ['1', 'hour', 'WhatsApp']], 'Reminder: your call with Alex is tomorrow at {{time}}. Reply here if you need to reschedule.'),
    flow('wf-4', 'Post-call follow-up', 'Send the recap and proposal after every discovery call.', 'Meeting completed', 'POST_MEETING', 'CUSTOMER', 'Email', true, [['2', 'hours', 'Email'], ['2', 'days', 'WhatsApp']], 'Thanks for the great call, {{name}}! Here’s your recap and the proposal we discussed.'),
    flow('wf-5', 'Re-engage cold leads', 'Monthly check-in for leads with no reply in 30 days.', 'No reply 30 days', 'NURTURE_REACTIVATION', 'CONVERSING', 'WhatsApp', false, [['30', 'days', 'WhatsApp'], ['7', 'days', 'Email']], 'Hi {{name}}, still thinking about growing with automation? Here’s a free mini-audit for you.'),
  ]);
  write('entity:workflowRuns', Array.from({ length: 24 }, (_, i) => ({ id: `run-${i}`, workflowId: `wf-${(i % 4) + 1}`, status: i % 11 === 0 ? 'Failed' : 'Completed', createdAt: iso(now - i * 7 * HOUR) })));
  write('entity:templates', [
    { id: 'tpl-1', name: 'Welcome message', title: 'Welcome message', description: 'Friendly first reply for new leads.', iconKey: 'message', custom: true, category: 'Welcome', channel: 'WhatsApp', status: 'Active', content: 'Hi {{name}}, thanks for your interest! Would you like to book a discovery call?', prompt: 'Hi {{name}}, thanks for your interest! Would you like to book a discovery call?', variables: '{customer_name}' },
    { id: 'tpl-2', name: 'Book a discovery call', title: 'Book a discovery call', description: 'Invite qualified leads to pick a time.', iconKey: 'calendar', custom: true, category: 'Booking', channel: 'WhatsApp', status: 'Active', content: 'We can arrange a 30-minute online discovery call. Which day and time work best for you?', prompt: 'We can arrange a 30-minute online discovery call. Which day and time work best for you?', variables: '{customer_name}' },
    { id: 'tpl-3', name: 'Compare packages', title: 'Compare packages', description: 'Explain the difference between offers.', iconKey: 'package', custom: true, category: 'Sales', channel: 'Email', status: 'Active', content: 'Starter covers your website and booking page. Growth adds launch planning, campaign support and monthly reporting.', prompt: 'Starter covers your website and booking page. Growth adds launch planning, campaign support and monthly reporting.', variables: '{customer_name}' },
    { id: 'tpl-4', name: 'Payment reminder', title: 'Payment reminder', description: 'Gentle reminder for pending invoices.', iconKey: 'package', custom: true, category: 'Follow-up', channel: 'Email', status: 'Active', content: 'Hi {{name}}, a quick reminder that your invoice is still pending. Here is your secure link: {{link}}', prompt: 'Hi {{name}}, a quick reminder that your invoice is still pending. Here is your secure link: {{link}}', variables: '{customer_name}, {link}' },
    { id: 'tpl-5', name: 'FAQ: refunds', title: 'FAQ: refunds', description: 'Answer refund policy questions.', iconKey: 'help', custom: true, category: 'Support', channel: 'WhatsApp', status: 'Active', content: 'All digital products include a 14-day money-back guarantee — no questions asked.', prompt: 'All digital products include a 14-day money-back guarantee — no questions asked.', variables: '' },
    { id: 'tpl-6', name: 'Course onboarding', title: 'Course onboarding', description: 'Welcome new students to the masterclass.', iconKey: 'book', custom: true, category: 'Onboarding', channel: 'Email', status: 'Active', content: 'Welcome to the AI Automation Masterclass! Start with Module 1 and join our community for weekly Q&As.', prompt: 'Welcome to the AI Automation Masterclass! Start with Module 1 and join our community for weekly Q&As.', variables: '{customer_name}' },
  ]);

  /* ------------------------------------------------------ Team & settings */
  const members = [
    { id: OWNER_ID, name: 'Alex Morgan', email: 'alex@demo.example', role: 'Owner', active: true, permissions: modulePermissions.map(m => m.id) },
    { id: 'demo-member-2', name: 'Mona Samir', email: 'mona@demo.example', role: 'Admin', active: true, permissions: modulePermissions.map(m => m.id) },
    { id: 'demo-member-3', name: 'Karim Fawzy', email: 'karim@demo.example', role: 'Sales', active: true, permissions: ['home', 'crm', 'inbox', 'inbox.send', 'booking'] },
    { id: 'demo-member-4', name: 'Sara Lewis', email: 'sara@demo.example', role: 'Support', active: true, permissions: ['home', 'inbox', 'inbox.send', 'follow-up'] },
    { id: 'demo-member-5', name: 'Youssef Nabil', email: 'youssef@demo.example', role: 'Member', active: false, permissions: ['home', 'analytics'] },
  ];
  write('entity:members', members);
  const audit = ['Alex Morgan updated billing settings · 2 hours ago', 'Mona Samir invited Youssef Nabil · Yesterday', 'Karim Fawzy exported CRM leads · 2 days ago', 'Alex Morgan connected Stripe · 5 days ago', 'Sara Lewis updated inbox permissions · 1 week ago', 'Workspace created · 3 months ago'];
  write(`gos-settings-team-v1:${TENANT}`, { members, audit });
  write('audit', audit);
  write('security', { sessions: [{ id: 'demo-session', device: 'Chrome on Windows · This device', lastActive: 'Now', current: true }, { id: 'demo-session-2', device: 'Safari on iPhone 15 · Cairo', lastActive: '2 hours ago', current: false }, { id: 'demo-session-3', device: 'Edge on MacBook Air · Dubai', lastActive: '3 days ago', current: false }], history: ['Signed in from Chrome on Windows · Today', 'Two-factor authentication enabled · 2 weeks ago', 'Password changed · 1 month ago', 'Signed in from Safari on iPhone · Yesterday'], mfa: true });
  const integrations = {
    meta: { status: 'Connected', account: 'Northstar Growth Studio · Page & @northstar.studio', sync: true },
    whatsapp: { status: 'Connected', account: '+20 100 555 0199 · Northstar', sync: true },
    instagram: { status: 'Connected', account: '@northstar.studio', sync: true },
    gmail: { status: 'Connected', account: 'hello@northstar-demo.com', sync: true },
    'google-calendar': { status: 'Connected', account: 'alex@demo.example', sync: true },
    zoom: { status: 'Connected', account: 'Alex Morgan · Pro', sync: true },
    stripe: { status: 'Connected', account: 'Northstar Growth Studio · acct_demo', sync: true },
    domains: { status: 'Connected', account: '3 domains connected', sync: true },
    ai: { status: 'Connected', account: 'GOS AI · Managed', sync: true },
    webhooks: { status: 'Needs Attention', account: '2 endpoints', problem: '1 failed delivery in the last 24h', sync: true },
  };
  write('local:integrations', integrations);
  const settings = defaultSettings();
  saveSettings({
    ...settings,
    profile: { ...settings.profile, name: 'Alex Morgan', email: 'alex@demo.example', phone: '+20 100 555 0199', title: 'Business Owner', bio: 'Founder of Northstar Growth Studio. Demo account — changes stay in this browser tab.', memberSince: iso(now - 420 * DAY).slice(0, 10), currency: 'USD' },
    business: { ...settings.business, name: 'Northstar Growth Studio', type: 'Coaching & Consulting', email: 'hello@northstar-demo.com', phone: '+20 100 555 0199', address: '42 Nile Corniche, Garden City, Cairo, Egypt', description: 'We help service businesses capture leads, automate follow-ups and grow with AI.', currency: 'USD' },
    balance: 2500,
    plan: { name: 'Professional', price: 49, active: true, renewal: iso(now + 18 * DAY).slice(0, 10) },
    integrations,
    recharge: { enabled: true, below: '200', amount: '500', method: 'demo-card' },
    paymentMethods: [{ id: 'demo-card', kind: 'card', name: 'Visa •••• 4242', detail: 'Expires 08/28 · Simulated card' }, { id: 'demo-paypal', kind: 'paypal', name: 'PayPal', detail: 'alex@demo.example · Simulated' }],
    defaultMethod: 'demo-card',
    transactions: [
      { id: 'w-1', date: iso(now - 1 * DAY).slice(0, 10), type: 'Usage', description: 'AI Follow-Up messages', service: 'AI Follow-Up', amount: -18.4, balance: 2500 },
      { id: 'w-2', date: iso(now - 3 * DAY).slice(0, 10), type: 'Usage', description: 'WhatsApp conversations', service: 'WhatsApp', amount: -12.6, balance: 2518.4 },
      { id: 'w-3', date: iso(now - 5 * DAY).slice(0, 10), type: 'Top Up', description: 'Auto-recharge', service: '—', amount: 500, balance: 2531 },
      { id: 'w-4', date: iso(now - 8 * DAY).slice(0, 10), type: 'Usage', description: 'AI Copilot requests', service: 'AI Copilot', amount: -9.2, balance: 2031 },
      { id: 'w-5', date: iso(now - 12 * DAY).slice(0, 10), type: 'Usage', description: 'Email campaigns', service: 'Email', amount: -4.8, balance: 2040.2 },
      { id: 'w-6', date: iso(now - 18 * DAY).slice(0, 10), type: 'Subscription', description: 'Professional plan · monthly', service: 'Plan', amount: -49, balance: 2045 },
      { id: 'w-7', date: iso(now - 20 * DAY).slice(0, 10), type: 'Top Up', description: 'Credits purchase', service: '—', amount: 1000, balance: 2094 },
      { id: 'w-8', date: iso(now - 26 * DAY).slice(0, 10), type: 'Usage', description: 'SMS reminders', service: 'SMS', amount: -6, balance: 1094 },
    ],
    usage: [
      { service: 'AI Follow-Up', amount: 64.2, detail: '1,284 messages', percentage: 42 },
      { service: 'WhatsApp', amount: 38.5, detail: '770 conversations', percentage: 25 },
      { service: 'AI Copilot', amount: 22.1, detail: '442 requests', percentage: 15 },
      { service: 'Email', amount: 16.4, detail: '3,280 emails', percentage: 11 },
      { service: 'SMS', amount: 10.8, detail: '216 messages', percentage: 7 },
    ],
    usagePeriod: 'This month',
    payment: { ...settings.payment, currency: 'USD', payout: 'Bank account •••• 0912', receiptEmail: 'billing@northstar-demo.com', invoices: true },
  });
  write('doc:settings/paymentMethods', { methods: [
    { id: 'stripe', provider: 'stripe', name: 'Stripe', type: 'gateway', account: 'Northstar Growth Studio', instructions: 'Demo only', enabled: true, status: 'Configured' },
    { id: 'paypal', provider: 'paypal', name: 'PayPal', type: 'gateway', account: 'billing@northstar-demo.com', instructions: 'Demo only', enabled: true, status: 'Configured' },
    { id: 'bank', provider: 'bank', name: 'Bank Transfer', type: 'manual', account: 'DEMO ACCOUNT · NOT A REAL BANK', instructions: 'Simulation only. Do not transfer money.', enabled: true, status: 'Configured' },
  ], revision: 0 });
  write('gateway:stripe', { fields: { publishableKey: 'pk_test_demo_northstar' }, configuredSecrets: { secretKey: true, webhookSecret: true }, mode: 'sandbox', region: 'SAU', gatewayRevision: 1 });
  const tracking = { schemaVersion: 1, metaId: '928174620451', googleId: 'G-NGS2026DEMO', enabled: true, customEvents: ['BookCall', 'StartCheckout', 'WebinarSignup', 'DownloadToolkit'], advancedMode: true, webhookUrl: 'https://hooks.northstar-demo.com/gos-events' };
  write('doc:settings/marketingTracking', tracking);
  write(`doc:tenants/${TENANT}/preferences/marketingTracking`, tracking);

  write('seed-version', SEED_VERSION);
  write('initialized', true);
}
