import { el } from '../factory';
import type { PFAction, PFNode, PFTheme, ResponsiveStyle, StyleMap } from '../types';

/* ------------------------------------------------------------------ */
/* Template model                                                      */
/* ------------------------------------------------------------------ */

export type TemplateCategory = 'Ecommerce' | 'Health & Dental' | 'Coaching' | 'Product Launch' | 'SaaS';
export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['Ecommerce', 'Health & Dental', 'Coaching', 'Product Launch', 'SaaS'];
export type TemplateStepType = 'Landing' | 'Form' | 'Thank You' | 'Booking' | 'Checkout' | 'Confirmation' | 'Upsell' | 'Survey';


export type TemplatePage = { name: string; path: string; type: TemplateStepType; seoTitle: string; seoDescription: string; build: () => PFNode[] };
export type PageTemplate = {
  id: string; name: string; category: TemplateCategory; description: string; tags: string[]; cover: string;
  theme: PFTheme; badge?: string; conversion: string; pages: TemplatePage[];
};

/* ------------------------------------------------------------------ */
/* Small building helpers                                              */
/* ------------------------------------------------------------------ */

export const rs = (desktop: StyleMap, mobile?: StyleMap, tablet?: StyleMap): ResponsiveStyle => ({ desktop, ...(tablet ? { tablet } : {}), ...(mobile ? { mobile } : {}) });
export const named = (node: PFNode, name: string) => { node.name = name; return node; };
export const region = (node: PFNode, value: 'header' | 'footer') => { node.props.region = value; return node; };
export const withId = (node: PFNode, cssId: string) => { node.props.cssId = cssId; return node; };
export const anim = (node: PFNode, appear = 'fade-up', delay = '0') => { node.props.animation = { appear, duration: '0.7', delay }; return node; };
export const act = (node: PFNode, action: PFAction) => { node.props.action = action; return node; };
export const hideMobile = (node: PFNode) => { node.props.hideOn = { mobile: true }; return node; };
export const eyebrow = (text: string, color = 'var(--pf-accent)', style: StyleMap = {}) => el.heading(text, 'p', { fontSize: '12px', letterSpacing: '2.4px', fontWeight: '700', color, textTransform: 'uppercase', ...style });
export const row = (children: PFNode[], style: StyleMap = {}) => el.block(children, { flexDirection: 'row', flexWrap: 'wrap', gap: '12px', alignItems: 'center', ...style });
export const card = (children: PFNode[], style: StyleMap = {}) => el.block(children, { backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', boxShadow: '0 1px 2px rgba(16,24,40,.05), 0 12px 32px rgba(16,24,40,.07)', ...style });
export const centerBlock = (children: PFNode[], style: StyleMap = {}) => el.block(children, { alignItems: 'center', textAlign: 'center', gap: '14px', ...style });
export const linkBtn = (label: string, href: string, color: string) => act(el.button(label, { backgroundColor: 'transparent', color, paddingLeft: '0px', paddingRight: '0px', paddingTop: '6px', paddingBottom: '6px', fontWeight: '500', fontSize: '14px' }), { type: 'link', url: href });

export function navbar(brand: string, links: [string, string][], cta: PFNode, opts: { dark?: boolean; bg?: string; brandIcon?: string } = {}) {
  const color = opts.dark ? '#ffffff' : '#111827';
  return named(region(el.section([
    el.row([
      el.col([row([...(opts.brandIcon ? [el.icon(opts.brandIcon, { size: '22' })] : []), el.heading(brand, 'p', { fontSize: '19px', fontWeight: '800', color, letterSpacing: '-0.3px' })], { gap: '8px', flexWrap: 'nowrap' })], 3, { tablet: 6, mobile: 7 }, { justifyContent: 'center' }),
      hideMobile(el.col([row(links.map(([label, href]) => linkBtn(label, href, opts.dark ? '#d1d5db' : '#374151')), { justifyContent: 'center', gap: '26px' })], 6, { tablet: 12 }, { justifyContent: 'center' })),
      el.col([cta], 3, { tablet: 6, mobile: 5 }, { alignItems: 'flex-end', justifyContent: 'center' }),
    ], { rowGap: '8px' }, { verticalAlign: 'center' }),
  ], { paddingTop: '16px', paddingBottom: '16px', backgroundColor: opts.bg ?? (opts.dark ? '#0b0b10' : '#ffffff'), borderBottom: opts.dark ? '1px solid rgba(255,255,255,.08)' : '1px solid #eef0f3' }), 'header'), 'Header');
}

export function footer(brand: string, blurb: string, columns: { title: string; links: string[] }[], opts: { dark?: boolean; bg?: string } = {}) {
  const dark = opts.dark ?? true, text = dark ? '#9ca3af' : '#4b5563', strong = dark ? '#ffffff' : '#111827';
  return named(region(el.section([
    el.row([
      el.col([
        el.heading(brand, 'p', { fontSize: '20px', fontWeight: '800', color: strong }),
        el.paragraph(blurb, { color: text, fontSize: '14px', lineHeight: '1.7' }),
        row(['instagram', 'facebook', 'x', 'youtube'].map(icon => el.icon(icon, { size: '18', color: strong }, { backgroundColor: dark ? 'rgba(255,255,255,.08)' : '#f3f4f6', padding: '9px', borderRadius: '999px' })), { gap: '8px' }),
      ], 4, { tablet: 12 }),
      ...columns.map(column => el.col([
        el.heading(column.title, 'p', { fontSize: '13px', fontWeight: '700', color: strong, letterSpacing: '1px', textTransform: 'uppercase' }),
        el.list(column.links, { marker: 'none' }, { color: text, fontSize: '14px' }),
      ], Math.floor(8 / columns.length), { tablet: 4, mobile: 6 })),
    ], { columnGap: '32px', rowGap: '32px' }),
    el.divider({ color: dark ? 'rgba(255,255,255,.1)' : '#e5e7eb' }, { marginTop: '28px' }),
    el.paragraph(`© ${new Date().getFullYear()} ${brand}. All rights reserved. · Privacy policy · Terms of service`, { color: text, fontSize: '13px', textAlign: 'center' }),
  ], { backgroundColor: opts.bg ?? (dark ? '#0b0b10' : '#f8fafc'), paddingTop: '64px', paddingBottom: '32px' }), 'footer'), 'Footer');
}

export function faq(items: [string, string][], title = 'Frequently asked questions', opts: { bg?: string; variant?: string; subtitle?: string } = {}) {
  return named(withId(el.section([
    centerBlock([el.heading(title, 'h2'), ...(opts.subtitle ? [el.paragraph(opts.subtitle, { color: '#6b7280' })] : [])], { marginBottom: '16px' }),
    el.accordion(items.map(([q, a]) => ({ title: q, children: [el.paragraph(a, { color: '#4b5563', lineHeight: '1.7' })] })), { variant: opts.variant ?? 'cards', icon: 'plus' }),
  ], { backgroundColor: opts.bg ?? '#ffffff', paddingTop: '80px', paddingBottom: '80px' }, { maxWidth: '820' }), 'faq'), 'FAQ');
}

export function thankYouPage(opts: { title: string; text: string; image?: string; next: string[]; button: string; buttonUrl?: string; social?: boolean }): PFNode[] {
  return [
    named(el.section([
      centerBlock([
        el.icon('check-circle', { size: '30', color: '#ffffff' }, { backgroundColor: '#16a34a', padding: '16px', borderRadius: '999px' }),
        eyebrow('You’re all set', '#16a34a'),
        el.heading(opts.title, 'h1', rs({ fontSize: '46px', maxWidth: '760px' }, { fontSize: '32px' })),
        el.paragraph(opts.text, { fontSize: '18px', color: '#4b5563', maxWidth: '620px', lineHeight: '1.65' }),
      ]),
      ...(opts.image ? [el.image(opts.image, 'Confirmation', { borderRadius: '18px', maxWidth: '760px', alignSelf: 'center', boxShadow: '0 30px 60px rgba(15,23,42,.18)', marginTop: '18px' }, { ratio: '16:9' })] : []),
      el.row(opts.next.map((step, index) => el.col([card([
        el.heading(`0${index + 1}`, 'p', { fontSize: '13px', fontWeight: '800', color: 'var(--pf-accent)', letterSpacing: '1px' }),
        el.paragraph(step, { fontWeight: '600', color: '#111827' }),
      ], { padding: '22px', height: '100%' })], Math.floor(12 / opts.next.length), { tablet: 12 })), { marginTop: '28px' }),
      centerBlock([act(el.button(opts.button, { borderRadius: '999px', paddingLeft: '30px', paddingRight: '30px' }, { iconRight: 'arrow' }), { type: 'link', url: opts.buttonUrl ?? '/' }), ...(opts.social ? [el.fbLike('https://www.facebook.com/facebook')] : [])], { marginTop: '20px' }),
    ], { backgroundColor: '#f8fafc', paddingTop: '96px', paddingBottom: '96px', backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(99,102,241,.08), transparent 45%), radial-gradient(circle at 90% 20%, rgba(22,163,74,.08), transparent 40%)' }, { maxWidth: '980' }), 'Thank you'),
  ];
}

export function checkoutPage(opts: { brand: string; product: string; price: string; compare: string; image: string; features: string[]; quote: [string, string] }): PFNode[] {
  return [
    named(region(el.section([centerBlock([el.heading(opts.brand, 'p', { fontSize: '19px', fontWeight: '800' }), el.paragraph('🔒 Secure checkout · SSL encrypted', { fontSize: '12px', color: '#16a34a', fontWeight: '600' })], { gap: '2px' })], { paddingTop: '18px', paddingBottom: '18px', borderBottom: '1px solid #eef0f3' }), 'header'), 'Header'),
    named(el.section([
      el.row([
        el.col([
          eyebrow('Step 2 of 2 · Complete your order'),
          el.heading('You’re one step away from your new routine', 'h1', rs({ fontSize: '38px' }, { fontSize: '28px' })),
          el.paragraph('Review your order and complete checkout. Ships within 24 hours with tracked delivery.', { color: '#4b5563', fontSize: '17px' }),
          el.contentList([{ icon: 'truck', title: 'Free express shipping', text: 'Delivered in 2–4 business days.' }, { icon: 'returns', title: '60-night risk-free trial', text: 'Love it or send it back for a full refund.' }, { icon: 'shield-check', title: '2-year warranty', text: 'Covered against any manufacturing defect.' }]),
          card([el.rating(5, ''), el.paragraph(`“${opts.quote[0]}”`, { fontSize: '16px', fontStyle: 'italic', color: '#1f2937' }), el.paragraph(`— ${opts.quote[1]}`, { fontSize: '13px', color: '#6b7280', fontWeight: '600' })], { padding: '22px', backgroundColor: '#f8fafc', boxShadow: 'none', border: '1px solid #e5e7eb' }),
        ], 6, { tablet: 12 }, { gap: '18px' }),
        el.col([el.checkout({ product: opts.product, price: opts.price, comparePrice: opts.compare, image: opts.image, features: opts.features, button: 'Complete my order', action: { type: 'next-step' } })], 6, { tablet: 12 }),
      ], { columnGap: '48px' }, { verticalAlign: 'start' }),
    ], { backgroundColor: '#ffffff', paddingTop: '56px', paddingBottom: '80px' }), 'Checkout'),
  ];
}

/* ------------------------------------------------------------------ */
/* 1. Dental advertorial (PageFly article layout)                       */
/* ------------------------------------------------------------------ */

