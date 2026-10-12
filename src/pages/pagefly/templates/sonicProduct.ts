import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';
import { el, IMG } from '../factory';
import type { PFNode } from '../types';

export function sonicProduct(): PFNode[] {
  return [
    named(region(el.section([el.paragraph('🚚 Free express shipping over $50 · 60-night risk-free trial · 2-year warranty', { color: '#ffffff', fontSize: '13px', textAlign: 'center', fontWeight: '500' })], { backgroundColor: '#1e3a8a', paddingTop: '10px', paddingBottom: '10px' }), 'header'), 'Announcement bar'),
    navbar('SONICPRO', [['Features', '#features'], ['Compare', '#compare'], ['Reviews', '#reviews'], ['FAQ', '#faq']], act(el.button('Buy now — $89', { borderRadius: '8px', paddingTop: '11px', paddingBottom: '11px' }), { type: 'link', url: '#buy' }), { brandIcon: 'zap' }),
    named(el.section([
      el.row([
        el.col([
          el.image(IMG.toothbrush, 'SonicPro electric toothbrush with charging stand', { borderRadius: '20px', backgroundColor: '#f1f5f9' }, { ratio: '1:1' }),
          el.row([IMG.smile, IMG.clinic, IMG.bacteria].map(src => el.col([el.image(src, 'Product detail', { borderRadius: '12px' }, { ratio: '1:1' })], 4, { mobile: 4 })), { columnGap: '12px' }),
        ], 6, { tablet: 12 }, { gap: '12px' }),
        el.col([
          row([eyebrow('Best seller', '#2563eb'), el.paragraph('· In stock, ships today', { fontSize: '13px', color: '#16a34a', fontWeight: '600' })], { gap: '6px' }),
          el.heading('SonicPro Electric Toothbrush', 'h1', rs({ fontSize: '44px', letterSpacing: '-1px', lineHeight: '1.1' }, { fontSize: '32px' })),
          el.rating(4.9, '2,341 reviews'),
          el.paragraph('Dentist-level clean at home. 40,000 sonic strokes per minute remove up to 10× more plaque than a manual brush — while staying gentle on gums.', { fontSize: '17px', color: '#475569', lineHeight: '1.65' }),
          el.list(['5 cleaning modes incl. Whitening & Sensitive', 'Smart pressure sensor & 2-minute pacer', '30-day battery · USB-C fast charge', 'Includes travel case + 3 brush heads'], { marker: 'icon', icon: 'check-circle', iconColor: '#2563eb' }, { fontSize: '15px' }),
          withId(el.checkout({ product: 'SonicPro Electric Toothbrush', price: '89', comparePrice: '129', image: '', features: ['Free express shipping', '60-night risk-free trial', '2-year warranty'], button: 'Add to cart — Save 31%', gateway: 'Stripe', action: { type: 'next-step' } }), 'buy'),
          el.contentList([{ icon: 'truck', title: 'Free shipping', text: 'Arrives in 2–4 days' }, { icon: 'returns', title: '60-night trial', text: 'Free returns' }, { icon: 'shield-check', title: '2-year warranty', text: 'Full coverage' }], { layout: 'horizontal' }, { fontSize: '13px' }),
        ], 6, { tablet: 12 }, { gap: '16px' }),
      ], { columnGap: '56px' }, { verticalAlign: 'start' }),
    ], { paddingTop: '48px', paddingBottom: '72px' }), 'Product hero'),
    named(withId(el.section([
      centerBlock([eyebrow('Why SonicPro', '#93c5fd'), el.heading('Engineered with dentists. Designed for daily life.', 'h2', rs({ fontSize: '40px', color: '#ffffff', maxWidth: '760px' }, { fontSize: '28px' }))], { marginBottom: '24px' }),
      el.row(([['zap', '40,000 strokes/min', 'Sonic vibrations drive fluid between teeth and along the gumline.'], ['shield-check', 'Gum-safe pressure', 'The handle pulses and slows when you brush too hard.'], ['clock', 'Smart 2-min timer', 'A 30-second quadrant pacer ensures an even clean.'], ['leaf', 'Recyclable heads', 'Plant-based bristles and fully recyclable packaging.']] as [string, string, string][]).map(([icon, title, text], i) => el.col([anim(el.block([
        el.icon(icon, { size: '24', color: '#93c5fd' }, { backgroundColor: 'rgba(147,197,253,.12)', padding: '12px', borderRadius: '12px' }),
        el.heading(title, 'h3', { fontSize: '19px', color: '#ffffff' }),
        el.paragraph(text, { color: '#cbd5e1', lineHeight: '1.6', fontSize: '15px' }),
      ], { gap: '12px', padding: '24px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', height: '100%' }), 'fade-up', String(i * 0.08))], 3, { tablet: 6, mobile: 12 }))),
    ], { backgroundColor: '#0f172a', paddingTop: '88px', paddingBottom: '88px' }), 'features'), 'Features'),
    named(withId(el.section([
      el.row([
        el.col([
          eyebrow('See the difference'),
          el.heading('Visible results in just 4 weeks', 'h2', rs({ fontSize: '38px' }, { fontSize: '28px' })),
          el.paragraph('In a clinical study of 120 adults, SonicPro users saw 3.5× healthier gums and noticeably whiter teeth after one month of twice-daily brushing.', { color: '#475569', lineHeight: '1.7' }),
          el.table([['', 'Manual', 'SonicPro'], ['Plaque removed', '1×', '10×'], ['Brushing timer', '—', '✓'], ['Pressure sensor', '—', '✓'], ['Whitening mode', '—', '✓']]),
        ], 6, { tablet: 12 }, { gap: '16px', justifyContent: 'center' }),
        el.col([el.comparison(IMG.toothache, IMG.smile, { beforeLabel: 'Day 1', afterLabel: 'Day 28', ratio: '1:1' }, { borderRadius: '20px' })], 6, { tablet: 12 }),
      ], { columnGap: '56px' }, { verticalAlign: 'center' }),
    ], { paddingTop: '88px', paddingBottom: '88px' }), 'compare'), 'Comparison'),
    named(el.section([
      el.tabs([
        { label: 'Description', children: [el.paragraph('SonicPro combines 40,000 sonic strokes per minute with a slim, ergonomic handle. Its high-density bristles reach deep between teeth while the soft-touch neck protects your gums. Choose from Clean, White, Polish, Gum Care and Sensitive modes.', { color: '#475569', lineHeight: '1.75' })] },
        { label: 'Specifications', children: [el.table([['Spec', 'Detail'], ['Strokes per minute', '40,000'], ['Modes', '5'], ['Battery', '30 days (2× daily)'], ['Charging', 'USB-C, 4 hours'], ['Water resistance', 'IPX7']], { striped: true })] },
        { label: 'In the box', children: [el.list(['SonicPro handle', '3 × Clean brush heads', 'Travel case', 'USB-C charging stand', 'Quick start guide'], { marker: 'icon', icon: 'package' })] },
        { label: 'Shipping & returns', children: [el.paragraph('Free express shipping on orders over $50. Try SonicPro for 60 nights — if you don’t love it, return it for a full refund.', { color: '#475569', lineHeight: '1.75' })] },
      ], { variant: 'underline', align: 'center' }),
    ], { paddingTop: '72px', paddingBottom: '72px', backgroundColor: '#f8fafc' }, { maxWidth: '900' }), 'Product details'),
    named(el.section([
      centerBlock([eyebrow('Watch'), el.heading('How SonicPro cleans', 'h2', rs({ fontSize: '36px' }, { fontSize: '28px' }))], { marginBottom: '16px' }),
      el.youtube('https://www.youtube.com/watch?v=ysz5S6PUM-U', {}, { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(15,23,42,.15)' }),
    ], { paddingTop: '80px', paddingBottom: '80px' }, { maxWidth: '960' }), 'Video'),
    named(withId(el.section([
      centerBlock([eyebrow('Reviews'), el.heading('Loved by 50,000+ smiles', 'h2', rs({ fontSize: '38px' }, { fontSize: '28px' }))], { marginBottom: '18px' }),
      el.testimonials([
        { quote: 'My hygienist asked what I changed. Gums stopped bleeding in two weeks — genuinely impressed.', name: 'Amira H.', role: 'Verified buyer', rating: 5, avatar: IMG.smile },
        { quote: 'Feels like a professional clean every morning, and the battery lasts my entire month of travel.', name: 'James P.', role: 'Verified buyer', rating: 5 },
        { quote: 'The pressure sensor finally fixed my aggressive brushing. Sensitive mode is a lifesaver.', name: 'Lina S.', role: 'Verified buyer', rating: 5 },
      ]),
      el.appBlock('Judge.me Reviews', { title: 'Customer reviews' }, { marginTop: '18px' }),
    ], { paddingTop: '88px', paddingBottom: '88px', backgroundColor: '#eff6ff' }), 'reviews'), 'Reviews'),
    faq([
      ['How long does the battery last?', 'Up to 30 days with two 2-minute sessions per day. A full charge takes about 4 hours via USB-C.'],
      ['Which brush heads are compatible?', 'All SonicPro heads click on to every handle. Subscribe & save to get fresh heads every 3 months.'],
      ['Is it safe for braces, crowns and implants?', 'Yes — SonicPro is safe for orthodontic appliances and restorations. Use Sensitive mode for the first week.'],
      ['What is the 60-night trial?', 'Use SonicPro for up to 60 nights. If you are not completely happy, contact us for a free return and full refund.'],
    ]),
    footer('SONICPRO', 'Professional oral care, designed with dentists for everyday life.', [{ title: 'Shop', links: ['SonicPro', 'Brush heads', 'Travel case', 'Gift cards'] }, { title: 'Help', links: ['Shipping', 'Returns', 'Warranty', 'Contact'] }], { dark: true, bg: '#0f172a' }),
  ];
}


