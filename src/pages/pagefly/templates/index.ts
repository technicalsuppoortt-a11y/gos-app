import { IMG } from '../factory';
import type { PFNode } from '../types';
import { checkoutPage, thankYouPage } from './helpers';
import type { PageTemplate } from './helpers';
import { dentalArticle } from './dentalArticle';
import { dentalClinic } from './dentalClinic';
import { sonicProduct } from './sonicProduct';
import { auraHeadphones } from './auraHeadphones';
import { coaching } from './coaching';
import { productLaunch } from './productLaunch';
import { saas } from './saas';
import { bookingPage } from './bookingPage';
import { saasSignup } from './saasSignup';

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'dental-advertorial', name: 'Dental Advertorial', category: 'Health & Dental', badge: 'PageFly classic', cover: IMG.toothache,
    description: 'Long-form editorial article with expert quote, related-posts sidebar, before/after slider and an integrated product offer.',
    tags: ['Blog', 'Advertorial', 'Oral care'], conversion: '4.8%', theme: { color: '#111111', headingFont: 'Fraunces', bodyFont: 'Inter' },
    pages: [
      { name: 'Article', path: '/electric-vs-manual', type: 'Landing', seoTitle: 'Electric vs. manual toothbrush: pros and cons', seoDescription: 'A dentist-reviewed guide to choosing between electric and manual toothbrushes.', build: dentalArticle },
      { name: 'Checkout', path: '/checkout', type: 'Checkout', seoTitle: 'Checkout — SonicPro', seoDescription: 'Secure checkout', build: () => checkoutPage({ brand: 'BrightSmile', product: 'SonicPro Electric Toothbrush', price: '89', compare: '129', image: IMG.toothbrush, features: ['3 brush heads included', 'Travel case', 'Free shipping'], quote: ['My hygienist noticed the difference after a month.', 'Amira H., verified buyer'] }) },
      { name: 'Thank You', path: '/thank-you', type: 'Thank You', seoTitle: 'Thank you for your order', seoDescription: 'Order confirmed', build: () => thankYouPage({ title: 'Your SonicPro is on its way!', text: 'We’ve emailed your receipt and tracking link. Your brush ships within 24 hours.', image: IMG.toothbrush, next: ['Check your inbox for your receipt', 'Track your parcel in 24 hours', 'Charge for 4 hours before first use'], button: 'Read more oral-care tips' }) },
    ],
  },
  {
    id: 'smile-clinic', name: 'BrightSmile Dental Clinic', category: 'Health & Dental', cover: IMG.clinic,
    description: 'Clinic lead-generation page with services grid, before/after results, Google reviews, map and online appointment booking.',
    tags: ['Clinic', 'Booking', 'Local business'], conversion: '11.2%', theme: { color: '#0e7490', headingFont: 'Manrope', bodyFont: 'Inter' },
    pages: [
      { name: 'Landing', path: '/', type: 'Landing', seoTitle: 'BrightSmile Dental — Gentle dentistry in Zamalek', seoDescription: 'Same-day appointments, implants, Invisalign and whitening. Book your free consultation.', build: dentalClinic },
      { name: 'Confirmation', path: '/confirmed', type: 'Confirmation', seoTitle: 'Appointment confirmed', seoDescription: 'Your appointment is confirmed', build: () => thankYouPage({ title: 'Your appointment is confirmed', text: 'We’ve sent the details and a calendar invite to your email. We look forward to meeting you!', image: IMG.clinic, next: ['Add the visit to your calendar', 'Bring your ID & insurance card', 'Arrive 10 minutes early'], button: 'Back to website' }) },
    ],
  },
  {
    id: 'sonicpro-product', name: 'SonicPro Product Page', category: 'Ecommerce', badge: 'Best converting', cover: IMG.toothbrush,
    description: 'High-converting single-product page with gallery, offer box, feature grid, comparison slider, spec tabs, video and reviews.',
    tags: ['Product page', 'DTC', 'Shopify'], conversion: '6.3%', theme: { color: '#2563eb', headingFont: 'DM Sans', bodyFont: 'DM Sans' },
    pages: [
      { name: 'Product', path: '/sonicpro', type: 'Landing', seoTitle: 'SonicPro Electric Toothbrush — 10× cleaner teeth', seoDescription: 'Dentist-level clean at home with 40,000 sonic strokes per minute. 60-night trial.', build: sonicProduct },
      { name: 'Checkout', path: '/checkout', type: 'Checkout', seoTitle: 'Checkout — SonicPro', seoDescription: 'Secure checkout', build: () => checkoutPage({ brand: 'SONICPRO', product: 'SonicPro Electric Toothbrush', price: '89', compare: '129', image: IMG.toothbrush, features: ['3 brush heads', 'Travel case', 'USB-C stand'], quote: ['Feels like a professional clean every morning.', 'James P., verified buyer'] }) },
      { name: 'Thank You', path: '/thank-you', type: 'Thank You', seoTitle: 'Order confirmed', seoDescription: 'Thanks for your order', build: () => thankYouPage({ title: 'Thank you! Your order is confirmed', text: 'A receipt is on its way to your inbox. Your SonicPro ships today.', image: IMG.toothbrush, next: ['Receipt sent to your email', 'Shipping confirmation within 24h', 'Delivery in 2–4 days'], button: 'Continue shopping', social: true }) },
    ],
  },
  {
    id: 'aura-headphones', name: 'Aura Headphones Store', category: 'Ecommerce', cover: IMG.headphones,
    description: 'Dark, premium store page with product line-up pricing, review slider, Instagram community feed and VIP newsletter capture.',
    tags: ['Store', 'Dark mode', 'Electronics'], conversion: '5.1%', theme: { color: '#f59e0b', headingFont: 'Space Grotesk', bodyFont: 'Inter' },
    pages: [
      { name: 'Store', path: '/', type: 'Landing', seoTitle: 'Aura Pro 2 — Adaptive noise-cancelling headphones', seoDescription: 'Studio-grade sound, −42dB ANC and 50-hour battery.', build: auraHeadphones },
      { name: 'Checkout', path: '/checkout', type: 'Checkout', seoTitle: 'Checkout — Aura', seoDescription: 'Secure checkout', build: () => checkoutPage({ brand: 'AURA', product: 'Aura Pro 2 Headphones', price: '299', compare: '349', image: IMG.headphones, features: ['Carry case', 'USB-C cable', '2-year warranty'], quote: ['The noise cancelling is unreal.', 'Omar K., verified buyer'] }) },
      { name: 'Thank You', path: '/thank-you', type: 'Thank You', seoTitle: 'Order confirmed', seoDescription: 'Thanks for your order', build: () => thankYouPage({ title: 'Your Aura Pro 2 is on its way', text: 'We’ve emailed your receipt. Get ready to hear every detail.', image: IMG.headphones, next: ['Receipt sent', 'Ships within 24 hours', 'Download the Aura app'], button: 'Explore accessories' }) },
    ],
  },
  {
    id: 'maya-coaching', name: 'Maya Reed Coaching', category: 'Coaching', badge: 'New', cover: IMG.coach,
    description: 'Personal-brand coaching funnel with method steps, story, featured testimonial, program pricing and discovery-call booking.',
    tags: ['Coach', 'Personal brand', 'Booking'], conversion: '9.4%', theme: { color: '#c2410c', headingFont: 'Playfair Display', bodyFont: 'Inter' },
    pages: [
      { name: 'Landing', path: '/', type: 'Landing', seoTitle: 'Maya Reed — Calm Growth business coaching', seoDescription: 'Build a business that fits the life you want. Book a free discovery call.', build: coaching },
      { name: 'Booking', path: '/book', type: 'Booking', seoTitle: 'Book your discovery call', seoDescription: 'Pick a time for your free call', build: () => bookingPage({ brand: 'Maya Reed Coaching', title: 'Book your free discovery call', service: 'Discovery call', image: IMG.coaching, bg: '#fbf7f2' }) },
      { name: 'Thank You', path: '/thank-you', type: 'Thank You', seoTitle: 'You’re booked!', seoDescription: 'Your call is confirmed', build: () => thankYouPage({ title: 'You’re booked — I can’t wait to meet you!', text: 'Check your inbox for the Zoom link and a short questionnaire so we can make the most of our time.', image: IMG.coach, next: ['Confirm the calendar invite', 'Complete the 5-minute questionnaire', 'Join the call from a quiet space'], button: 'Listen to the podcast' }) },
    ],
  },
  {
    id: 'pulse-launch', name: 'Pulse X Product Launch', category: 'Product Launch', badge: 'Trending', cover: IMG.smartwatch,
    description: 'Pre-launch waitlist page with live countdown, scarcity progress bar, feature grid, spec tabs, early-bird pricing and exit-intent popup.',
    tags: ['Waitlist', 'Countdown', 'Crowdfunding'], conversion: '18.7%', theme: { color: '#22d3ee', headingFont: 'Outfit', bodyFont: 'Inter' },
    pages: [
      { name: 'Launch', path: '/', type: 'Landing', seoTitle: 'Pulse X — The smartwatch that knows you', seoDescription: 'Join the waitlist and save 40% as an early-bird backer.', build: productLaunch },
      { name: 'Thank You', path: '/thank-you', type: 'Thank You', seoTitle: 'You’re on the list', seoDescription: 'Waitlist confirmed', build: () => thankYouPage({ title: 'You’re on the Pulse X list!', text: 'Your 40% early-bird code is on its way. Share with friends to move up the queue.', image: IMG.smartwatch, next: ['Check your inbox for your code', 'Share your referral link', 'Reserve on launch day'], button: 'Share with a friend', social: true }) },
    ],
  },
  {
    id: 'flowboard-saas', name: 'Flowboard SaaS', category: 'SaaS', cover: IMG.saas,
    description: 'Modern SaaS homepage with logo strip, tabbed feature tour, stats band, testimonials, monthly/yearly pricing and free-trial signup.',
    tags: ['Startup', 'Free trial', 'B2B'], conversion: '7.9%', theme: { color: '#4f46e5', headingFont: 'Manrope', bodyFont: 'Inter' },
    pages: [
      { name: 'Home', path: '/', type: 'Landing', seoTitle: 'Flowboard — The calm work OS for modern teams', seoDescription: 'Plan projects, track work and automate busywork. Start your 14-day free trial.', build: saas },
      { name: 'Sign up', path: '/signup', type: 'Form', seoTitle: 'Start your free trial', seoDescription: 'Create your Flowboard workspace', build: saasSignup },
      { name: 'Welcome', path: '/welcome', type: 'Thank You', seoTitle: 'Welcome to Flowboard', seoDescription: 'Your workspace is ready', build: () => thankYouPage({ title: 'Welcome aboard — your workspace is ready', text: 'We’ve sent a verification email. Invite your team and import your first project in minutes.', image: IMG.saas, next: ['Verify your email', 'Invite your teammates', 'Import from Trello or Asana'], button: 'Open my workspace' }) },
    ],
  },
];

export const templateById = (id: string) => PAGE_TEMPLATES.find(template => template.id === id);

/** Cached node trees for thumbnails / previews (rebuilt on demand for real installs). */
const previewCache = new Map<string, PFNode[]>();
export function templatePreviewNodes(template: PageTemplate, pageIndex = 0): PFNode[] {
  const key = `${template.id}:${pageIndex}`;
  if (!previewCache.has(key)) previewCache.set(key, template.pages[pageIndex]?.build() ?? []);
  return previewCache.get(key)!;
}
