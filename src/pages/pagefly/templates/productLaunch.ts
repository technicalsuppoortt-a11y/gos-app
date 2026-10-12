import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';
import { el, IMG, inDays } from '../factory';
import type { PFNode } from '../types';

export function productLaunch(): PFNode[] {
  const cyan = '#22d3ee', bg = '#05060a';
  return [
    navbar('PULSE', [['Features', '#features'], ['Specs', '#specs'], ['Early bird', '#earlybird'], ['FAQ', '#faq']], act(el.button('Reserve yours', { backgroundColor: cyan, color: '#04121a', borderRadius: '999px', paddingTop: '10px', paddingBottom: '10px' }), { type: 'link', url: '#waitlist' }), { dark: true, bg, brandIcon: 'watch' }),
    named(withId(el.section([
      centerBlock([
        anim(el.heading('LAUNCHING NOVEMBER 2026', 'p', { fontSize: '12px', letterSpacing: '3px', fontWeight: '700', color: cyan, border: '1px solid rgba(34,211,238,.35)', padding: '8px 14px', borderRadius: '999px' })),
        anim(el.heading('Pulse X. The smartwatch that knows you.', 'h1', rs({ fontSize: '68px', color: '#ffffff', lineHeight: '1.02', letterSpacing: '-2px', maxWidth: '900px' }, { fontSize: '40px' })), 'fade-up', '0.1'),
        anim(el.paragraph('AI health coaching, 14-day battery and a sapphire display — in a 9mm titanium case. Early-bird backers save 40%.', { fontSize: '19px', color: '#9ca3af', maxWidth: '640px', lineHeight: '1.6' }), 'fade-up', '0.2'),
        el.countdown({ date: inDays(12), variant: 'boxes' }, { marginTop: '12px' }),
        el.form([el.field('Email', 'email', { name: 'EMAIL', required: true, placeholder: 'Your email for early access' }, { flexGrow: '1', minWidth: '240px' }), el.submit('Join the waitlist', { backgroundColor: cyan, color: '#04121a' })], { listName: 'Pulse X waitlist', successMessage: 'You’re on the list! Watch your inbox for your 40% early-bird code.', action: { type: 'next-step' } }, { flexDirection: 'row', flexWrap: 'wrap', width: '100%', maxWidth: '560px', marginTop: '8px' }),
        el.progress(78, 'Early-bird spots claimed', { color: cyan, track: 'rgba(255,255,255,.1)', striped: true }, { width: '100%', maxWidth: '560px', color: '#d1d5db' }),
      ], { gap: '18px' }),
      anim(el.image(IMG.smartwatch, 'Pulse X smartwatch', { borderRadius: '28px', marginTop: '36px', boxShadow: '0 40px 120px rgba(34,211,238,.18)' }, { ratio: '16:9' }), 'zoom', '0.1'),
    ], { backgroundColor: bg, paddingTop: '80px', paddingBottom: '96px', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(34,211,238,.18), transparent 55%)' }, { maxWidth: '1100' }), 'waitlist'), 'Launch hero'),
    named(withId(el.section([
      centerBlock([el.heading('Everything you need. Nothing you don’t.', 'h2', rs({ fontSize: '42px', color: '#ffffff' }, { fontSize: '30px' }))], { marginBottom: '24px' }),
      el.row(([['activity', 'AI health coach', 'Daily readiness score built from HRV, sleep and training load.'], ['zap', '14-day battery', 'Two weeks of always-on display on a single charge.'], ['shield-check', 'Titanium & sapphire', 'Aerospace-grade case with scratch-proof sapphire glass.'], ['heart', 'Medical-grade ECG', 'FDA-cleared ECG and irregular rhythm alerts.'], ['pin', 'Dual-band GPS', 'Pinpoint accuracy in cities, forests and mountains.'], ['phone', 'eSIM calling', 'Leave your phone at home — stay reachable anywhere.']] as [string, string, string][]).map(([icon, title, text], i) => el.col([anim(el.block([
        el.icon(icon, { size: '22', color: cyan }, { backgroundColor: 'rgba(34,211,238,.1)', padding: '12px', borderRadius: '12px' }),
        el.heading(title, 'h3', { fontSize: '19px', color: '#ffffff' }), el.paragraph(text, { color: '#9ca3af', fontSize: '15px', lineHeight: '1.6' }),
      ], { gap: '12px', padding: '26px', borderRadius: '18px', backgroundColor: '#0d0f16', border: '1px solid #1c2030', height: '100%' }), 'fade-up', String((i % 3) * 0.08))], 4, { tablet: 6, mobile: 12 }))),
    ], { backgroundColor: bg, paddingTop: '88px', paddingBottom: '88px' }), 'features'), 'Features'),
    named(el.section([
      centerBlock([el.heading('See Pulse X in action', 'h2', rs({ fontSize: '38px', color: '#ffffff' }, { fontSize: '28px' }))], { marginBottom: '16px' }),
      el.youtube('https://www.youtube.com/watch?v=ysz5S6PUM-U', {}, { borderRadius: '22px', overflow: 'hidden', border: '1px solid #1c2030' }),
    ], { backgroundColor: bg, paddingTop: '40px', paddingBottom: '88px' }, { maxWidth: '980' }), 'Video'),
    named(withId(el.section([
      centerBlock([el.heading('Technical specifications', 'h2', rs({ fontSize: '36px', color: '#ffffff' }, { fontSize: '28px' }))], { marginBottom: '10px' }),
      el.tabs([
        { label: 'Display', children: [el.table([['Spec', 'Pulse X'], ['Display', '1.5" LTPO AMOLED, 2,000 nits'], ['Glass', 'Sapphire crystal'], ['Always-on', 'Yes']])] },
        { label: 'Health', children: [el.table([['Sensor', 'Capability'], ['Optical HR', '24/7 heart rate & HRV'], ['ECG', 'FDA-cleared'], ['SpO₂', 'Blood oxygen'], ['Skin temp', 'Cycle & illness insights']])] },
        { label: 'Battery', children: [el.table([['Mode', 'Battery life'], ['Smartwatch', '14 days'], ['Always-on display', '7 days'], ['GPS training', '40 hours']])] },
      ], { variant: 'pills', align: 'center' }, { color: '#e5e7eb' }),
    ], { backgroundColor: '#0a0c12', paddingTop: '80px', paddingBottom: '80px' }, { maxWidth: '820' }), 'specs'), 'Specs'),
    named(withId(el.section([
      centerBlock([el.heading('Early-bird pricing', 'h2', rs({ fontSize: '42px', color: '#ffffff' }, { fontSize: '30px' })), el.paragraph('Limited to the first 5,000 backers. Ships January 2027.', { color: '#9ca3af' })], { marginBottom: '22px' }),
      el.pricing([
        { name: 'Pulse X', price: '239', period: 'one-time', description: 'Retail $399 · Save 40%', features: ['Titanium case, 44mm', 'Sport band', '2-year warranty', 'Free worldwide shipping'], button: 'Reserve for $1' },
        { name: 'Pulse X Pro', price: '299', period: 'one-time', description: 'Retail $499 · Save 40%', features: ['Everything in Pulse X', 'eSIM & dual-band GPS', 'Extra leather band', '3-year warranty'], button: 'Reserve for $1', highlighted: true, badge: 'Backer favourite' },
      ], { currency: '$', action: { type: 'link', url: '#waitlist' } }, { maxWidth: '760px', alignSelf: 'center', width: '100%' }),
    ], { backgroundColor: bg, paddingTop: '88px', paddingBottom: '88px' }), 'earlybird'), 'Early-bird pricing'),
    faq([
      ['When will Pulse X ship?', 'Production starts in December 2026 and the first early-bird orders ship in January 2027.'],
      ['Is the $1 reservation refundable?', 'Yes, 100%. You can cancel your reservation at any time before shipping.'],
      ['Does it work with iPhone and Android?', 'Pulse X works with iOS 16+ and Android 10+ through the free Pulse app.'],
    ], 'Launch FAQ', { bg: '#ffffff' }),
    named(el.section([
      el.popup([
        el.icon('gift', { size: '28', color: '#ffffff' }, { backgroundColor: cyan, padding: '14px', borderRadius: '999px', alignSelf: 'center' }),
        el.heading('Wait — take an extra 10% off', 'h3', { textAlign: 'center', fontSize: '26px' }),
        el.paragraph('Join the waitlist now and we’ll stack an extra 10% on your early-bird price.', { textAlign: 'center', color: '#4b5563' }),
        el.form([el.field('Email', 'email', { name: 'EMAIL', required: true, placeholder: 'you@example.com' }), el.submit('Claim my extra 10%', { backgroundColor: '#05060a' })], { listName: 'Pulse X exit offer' }),
      ], { trigger: 'exit', width: '460' }),
    ], { paddingTop: '0px', paddingBottom: '0px', backgroundColor: bg }), 'Exit-intent popup'),
    footer('PULSE', 'Wearables that understand you — designed in Copenhagen.', [{ title: 'Product', links: ['Pulse X', 'Pulse X Pro', 'Bands', 'App'] }, { title: 'Company', links: ['About', 'Press', 'Careers', 'Support'] }], { dark: true, bg: '#020306' }),
  ];
}


