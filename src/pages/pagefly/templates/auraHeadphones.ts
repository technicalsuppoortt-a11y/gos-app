import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';
import { el, IMG } from '../factory';
import type { PFNode } from '../types';

export function auraHeadphones(): PFNode[] {
  const amber = '#f59e0b';
  return [
    navbar('AURA', [['Sound', '#sound'], ['Models', '#models'], ['Reviews', '#reviews'], ['Community', '#community']], act(el.button('Shop now', { backgroundColor: amber, color: '#111111', borderRadius: '999px', paddingTop: '10px', paddingBottom: '10px' }), { type: 'link', url: '#models' }), { dark: true, brandIcon: 'headphones' }),
    named(el.section([
      el.row([
        el.col([
          anim(eyebrow('New · Aura Pro 2', amber)),
          anim(el.heading('Silence the world. Hear every detail.', 'h1', rs({ fontSize: '62px', color: '#ffffff', lineHeight: '1.02', letterSpacing: '-2px' }, { fontSize: '40px' })), 'fade-up', '0.1'),
          anim(el.paragraph('Adaptive noise cancelling, studio-grade 40mm drivers and 50 hours of battery — wrapped in aluminium and memory foam.', { fontSize: '18px', color: '#a1a1aa', lineHeight: '1.65' }), 'fade-up', '0.2'),
          row([
            act(el.button('Shop Aura Pro 2 — $299', { backgroundColor: amber, color: '#111111', borderRadius: '999px', paddingTop: '15px', paddingBottom: '15px', paddingLeft: '28px', paddingRight: '28px' }, { iconRight: 'arrow', tracking: { fb: 'ViewContent', ga: 'hero_shop' } }), { type: 'link', url: '#models' }),
            act(el.button('Watch film', { backgroundColor: 'rgba(255,255,255,.08)', color: '#ffffff', borderRadius: '999px', paddingTop: '15px', paddingBottom: '15px' }, { iconLeft: 'play' }), { type: 'link', url: '#sound' }),
          ], { marginTop: '8px' }),
          el.row([['50h', 'Battery'], ['-42dB', 'Noise cancelling'], ['4.9★', '6,200 reviews']].map(([value, label]) => el.col([el.heading(value, 'p', { fontSize: '28px', fontWeight: '700', color: '#ffffff' }), el.paragraph(label, { fontSize: '13px', color: '#71717a' })], 4, { mobile: 4 }, { gap: '2px' })), { marginTop: '22px' }),
        ], 6, { tablet: 12 }, { gap: '16px', justifyContent: 'center' }),
        el.col([anim(el.image(IMG.headphones, 'Aura Pro 2 headphones', { borderRadius: '28px' }, { ratio: '1:1' }), 'zoom', '0.15')], 6, { tablet: 12 }),
      ], { columnGap: '48px' }, { verticalAlign: 'center' }),
    ], { backgroundColor: '#0b0b10', paddingTop: '72px', paddingBottom: '88px', backgroundImage: 'radial-gradient(circle at 75% 40%, rgba(245,158,11,.18), transparent 45%)' }), 'Hero'),
    named(withId(el.section([
      el.row(([['headphones', 'Studio-grade sound', 'Custom 40mm beryllium drivers tuned by Grammy-winning engineers.'], ['shield', 'Adaptive ANC', 'Eight microphones cancel up to 42dB of noise in real time.'], ['zap', '50-hour battery', 'Five minutes of charging gives you four hours of playback.'], ['users', 'Multipoint', 'Switch seamlessly between your laptop and phone.']] as [string, string, string][]).map(([icon, title, text], i) => el.col([anim(el.block([
        el.icon(icon, { size: '24', color: amber }),
        el.heading(title, 'h3', { fontSize: '19px', color: '#ffffff' }),
        el.paragraph(text, { fontSize: '15px', color: '#a1a1aa', lineHeight: '1.6' }),
      ], { gap: '10px', padding: '26px', borderRadius: '18px', backgroundColor: '#15151c', border: '1px solid #26262f', height: '100%' }), 'fade-up', String(i * 0.08))], 3, { tablet: 6, mobile: 12 }))),
      el.youtube('https://www.youtube.com/watch?v=ysz5S6PUM-U', {}, { borderRadius: '20px', overflow: 'hidden', marginTop: '32px' }),
    ], { backgroundColor: '#0b0b10', paddingTop: '40px', paddingBottom: '88px' }), 'sound'), 'Features'),
    named(withId(el.section([
      centerBlock([eyebrow('Choose your Aura', amber), el.heading('Find the perfect pair', 'h2', rs({ fontSize: '42px', color: '#ffffff' }, { fontSize: '30px' }))], { marginBottom: '22px' }),
      el.pricing([
        { name: 'Aura One', price: '199', period: 'one-time', description: 'Everyday wireless', features: ['30h battery', 'Passive isolation', 'Bluetooth 5.3', '1-year warranty'], button: 'Add to cart' },
        { name: 'Aura Pro 2', price: '299', period: 'one-time', description: 'Our flagship', features: ['50h battery', 'Adaptive ANC −42dB', 'Spatial audio', 'Multipoint', '2-year warranty'], button: 'Add to cart', highlighted: true, badge: 'Best seller' },
        { name: 'Aura Studio', price: '449', period: 'one-time', description: 'For creators', features: ['Wired + wireless', 'Lossless USB-C audio', 'Detachable boom mic', '3-year warranty'], button: 'Add to cart' },
      ], { currency: '$', action: { type: 'next-step' } }),
    ], { backgroundColor: '#111117', paddingTop: '88px', paddingBottom: '88px' }), 'models'), 'Models & pricing'),
    named(withId(el.section([
      el.slideshow([
        [el.paragraph('“The noise cancelling is unreal. I wear them on every flight and arrive actually rested.”', { fontSize: '26px', textAlign: 'center', color: '#ffffff', maxWidth: '760px', lineHeight: '1.4' }), el.paragraph('— Omar K., frequent flyer', { color: amber, fontWeight: '600' })],
        [el.paragraph('“Best sound I’ve heard under $500. Comfortable for 8-hour editing sessions.”', { fontSize: '26px', textAlign: 'center', color: '#ffffff', maxWidth: '760px', lineHeight: '1.4' }), el.paragraph('— Sara M., video editor', { color: amber, fontWeight: '600' })],
        [el.paragraph('“Battery lasted my entire two-week trip. Multipoint just works.”', { fontSize: '26px', textAlign: 'center', color: '#ffffff', maxWidth: '760px', lineHeight: '1.4' }), el.paragraph('— Daniel R., verified buyer', { color: amber, fontWeight: '600' })],
      ], { height: '320' }, { borderRadius: '24px', overflow: 'hidden' }),
    ], { backgroundColor: '#0b0b10', paddingTop: '72px', paddingBottom: '72px' }), 'reviews'), 'Review slider'),
    named(withId(el.section([
      centerBlock([el.heading('#AuraSound', 'h2', { color: '#ffffff', fontSize: '34px' }), el.paragraph('Tag @aura.audio to be featured.', { color: '#a1a1aa' })], { marginBottom: '16px' }),
      el.instagram('aura.audio', { columns: '6', count: '6', images: [IMG.headphones, IMG.smartwatch, IMG.landscape, IMG.coach, IMG.workout, IMG.saas] }),
    ], { backgroundColor: '#0b0b10', paddingTop: '64px', paddingBottom: '64px' }), 'community'), 'Instagram feed'),
    named(el.section([
      centerBlock([el.heading('Get 10% off your first pair', 'h2', rs({ fontSize: '34px', color: '#111111' }, { fontSize: '26px' })), el.paragraph('Plus early access to drops and members-only sales.', { color: '#3f3f46' }),
        el.form([el.field('Email', 'email', { name: 'EMAIL', required: true, placeholder: 'Enter your email' }, { flexGrow: '1', minWidth: '220px' }), el.submit('Get my code', { backgroundColor: '#111111' })], { listName: 'Aura VIP' }, { flexDirection: 'row', flexWrap: 'wrap', width: '100%', maxWidth: '520px' }),
      ]),
    ], { backgroundColor: amber, paddingTop: '64px', paddingBottom: '64px' }, { maxWidth: '760' }), 'Newsletter'),
    footer('AURA', 'Premium audio engineered for focus, travel and creativity.', [{ title: 'Shop', links: ['Aura One', 'Aura Pro 2', 'Aura Studio', 'Accessories'] }, { title: 'Support', links: ['Shipping', 'Warranty', 'Manuals', 'Contact'] }], { dark: true, bg: '#050507' }),
  ];
}


