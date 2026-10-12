import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';
import { el, IMG } from '../factory';
import type { PFNode } from '../types';

export function coaching(): PFNode[] {
  const cream = '#fbf7f2', accent = '#c2410c';
  return [
    navbar('Maya Reed', [['Method', '#method'], ['About', '#about'], ['Results', '#results'], ['Programs', '#programs']], act(el.button('Book a call', { borderRadius: '999px', paddingTop: '11px', paddingBottom: '11px' }), { type: 'link', url: '#book' }), { bg: cream }),
    named(el.section([
      el.row([
        el.col([
          anim(eyebrow('Business & life coach', accent)),
          anim(el.heading('Build a business that fits the life you want', 'h1', rs({ fontSize: '58px', lineHeight: '1.05', letterSpacing: '-1px' }, { fontSize: '38px' })), 'fade-up', '0.1'),
          anim(el.paragraph('I help ambitious founders and freelancers replace burnout with a clear plan, calm systems and consistent growth — in 12 weeks.', { fontSize: '19px', color: '#57534e', lineHeight: '1.65' }), 'fade-up', '0.2'),
          row([
            act(el.button('Book a free discovery call', { borderRadius: '999px', paddingTop: '16px', paddingBottom: '16px', paddingLeft: '30px', paddingRight: '30px' }, { iconRight: 'arrow', tracking: { fb: 'Schedule', ga: 'discovery_call' } }), { type: 'link', url: '#book' }),
            act(el.button('See the method', { backgroundColor: 'transparent', color: '#1c1917', textDecoration: 'underline', paddingLeft: '8px', paddingRight: '8px' }), { type: 'link', url: '#method' }),
          ], { marginTop: '8px' }),
          el.paragraph('As featured in &nbsp;<b>Forbes</b> · <b>Entrepreneur</b> · <b>Inc.</b> · <b>The Guardian</b>', { fontSize: '13px', color: '#78716c', marginTop: '18px', letterSpacing: '0.5px' }),
        ], 7, { tablet: 12 }, { gap: '16px', justifyContent: 'center' }),
        el.col([anim(el.image(IMG.coach, 'Maya Reed, business coach', { borderRadius: '200px 200px 24px 24px', boxShadow: '0 40px 80px rgba(120,53,15,.18)' }, { ratio: '3:4' }), 'slide-left', '0.2')], 5, { tablet: 12 }),
      ], { columnGap: '56px' }, { verticalAlign: 'center' }),
    ], { backgroundColor: cream, paddingTop: '64px', paddingBottom: '88px' }), 'Hero'),
    named(el.section([
      el.row([
        el.col([el.heading('Does this sound familiar?', 'h2', rs({ fontSize: '38px' }, { fontSize: '28px' })), el.paragraph('You started your business for freedom. Somewhere along the way it started running you.', { color: '#57534e', fontSize: '17px' })], 5, { tablet: 12 }, { gap: '12px' }),
        el.col([el.list(['You’re working 60-hour weeks but revenue has plateaued', 'You say yes to every client because you’re afraid of the gaps', 'Your to-do list grows faster than you can clear it', 'You know you need a strategy — but have no time to think'], { marker: 'icon', icon: 'check-circle', iconColor: accent }, { fontSize: '17px' })], 7, { tablet: 12 }),
      ], { columnGap: '56px' }, { verticalAlign: 'center' }),
    ], { paddingTop: '88px', paddingBottom: '88px' }), 'Problem'),
    named(withId(el.section([
      centerBlock([eyebrow('The Calm Growth Method', accent), el.heading('Three phases. One sustainable business.', 'h2', rs({ fontSize: '40px' }, { fontSize: '30px' }))], { marginBottom: '22px' }),
      el.row(([['01', 'Clarity', 'Define your ideal clients, offers and the life your business must support.', 'target'], ['02', 'Systems', 'Build simple workflows, pricing and boundaries that protect your energy.', 'zap'], ['03', 'Momentum', 'Launch a repeatable marketing engine and grow with weekly accountability.', 'rocket']] as [string, string, string, string][]).map(([n, title, text, icon], i) => el.col([anim(card([
        row([el.heading(n, 'p', { fontSize: '40px', fontWeight: '700', color: '#fdba74', fontFamily: 'Playfair Display' }), el.icon(icon, { size: '22', color: accent })], { justifyContent: 'space-between' }),
        el.heading(title, 'h3', { fontSize: '24px' }), el.paragraph(text, { color: '#57534e', lineHeight: '1.65' }),
      ], { height: '100%', backgroundColor: '#ffffff', boxShadow: 'none', border: '1px solid #ede4da' }), 'fade-up', String(i * 0.1))], 4, { tablet: 12 }))),
    ], { backgroundColor: cream, paddingTop: '88px', paddingBottom: '88px' }), 'method'), 'Method'),
    named(withId(el.section([
      el.row([
        el.col([el.image(IMG.coaching, 'Maya coaching a client', { borderRadius: '24px' }, { ratio: '4:5' })], 5, { tablet: 12 }),
        el.col([
          eyebrow('Meet your coach', accent),
          el.heading('Hi, I’m Maya.', 'h2', rs({ fontSize: '42px' }, { fontSize: '30px' })),
          el.paragraph('After a decade leading growth at two venture-backed startups, I burned out — hard. Rebuilding my own consultancy around four-day weeks taught me that growth and calm are not opposites.', { color: '#57534e', lineHeight: '1.75', fontSize: '17px' }),
          el.paragraph('Since 2019 I have coached 400+ founders to clearer offers, higher prices and businesses they actually enjoy running.', { color: '#57534e', lineHeight: '1.75', fontSize: '17px' }),
          el.row([['400+', 'Clients coached'], ['2.3×', 'Average revenue growth'], ['4.9/5', 'Client rating']].map(([v, l]) => el.col([el.heading(v, 'p', { fontSize: '34px', fontWeight: '700', color: accent, fontFamily: 'Playfair Display' }), el.paragraph(l, { fontSize: '13px', color: '#78716c' })], 4, { mobile: 4 }, { gap: '0px' })), { marginTop: '10px' }),
        ], 7, { tablet: 12 }, { gap: '14px', justifyContent: 'center' }),
      ], { columnGap: '56px' }, { verticalAlign: 'center' }),
    ], { paddingTop: '96px', paddingBottom: '96px' }), 'about'), 'About'),
    named(withId(el.section([
      centerBlock([eyebrow('Client results', '#fdba74'), el.heading('Founders who found their calm', 'h2', rs({ fontSize: '40px', color: '#ffffff' }, { fontSize: '30px' }))], { marginBottom: '18px' }),
      el.testimonials([{ quote: 'Working with Maya gave me the clarity and confidence to double my business in under a year — while taking Fridays off for the first time ever.', name: 'Rachel Owens', role: 'Founder, Bloom Studio', rating: 5, avatar: IMG.coach }], { columns: '1' }, { maxWidth: '820px', alignSelf: 'center', width: '100%' }),
      el.testimonials([
        { quote: 'I raised my prices 40% and lost zero clients. Maya’s pricing session alone paid for the program.', name: 'Daniel Cho', role: 'Brand designer', rating: 5 },
        { quote: 'Calm, strategic and incredibly practical. My launch sold out in 6 days.', name: 'Priya N.', role: 'Course creator', rating: 5 },
        { quote: 'The systems we built gave me back 15 hours a week. Life-changing.', name: 'Tom W.', role: 'Agency owner', rating: 5 },
      ], {}, { marginTop: '20px' }),
    ], { backgroundColor: '#1c1917', paddingTop: '96px', paddingBottom: '96px' }), 'results'), 'Testimonials'),
    named(withId(el.section([
      centerBlock([eyebrow('Work with me', accent), el.heading('Choose your path', 'h2', rs({ fontSize: '42px' }, { fontSize: '30px' })), el.paragraph('Every program includes a 14-day money-back guarantee.', { color: '#57534e' })], { marginBottom: '22px' }),
      el.pricing([
        { name: 'Clarity Session', price: '297', period: 'one-time', description: '90-minute deep dive', features: ['Pre-session business audit', '90-minute strategy call', 'Personal action plan', '2 weeks of email support'], button: 'Book session' },
        { name: 'Calm Growth 12-Week', price: '1,497', period: 'one-time', description: 'Signature program', features: ['12 weekly 1:1 coaching calls', 'Offer & pricing redesign', 'Systems & automation setup', 'Private Voxer access', 'Lifetime template library'], button: 'Apply now', highlighted: true, badge: 'Most popular' },
        { name: 'VIP Intensive', price: '3,500', period: 'one-time', description: 'Done-with-you day', features: ['Full-day strategy intensive', 'Launch plan built live', '90 days of support', 'Quarterly check-ins'], button: 'Enquire' },
      ], { currency: '$', action: { type: 'link', url: '#book' } }),
    ], { backgroundColor: cream, paddingTop: '96px', paddingBottom: '96px' }), 'programs'), 'Programs'),
    named(withId(el.section([
      el.row([
        el.col([eyebrow('Free 30-minute call', accent), el.heading('Let’s map your next 90 days', 'h2', rs({ fontSize: '40px' }, { fontSize: '30px' })), el.paragraph('Pick a time that suits you. We’ll talk through where you are, where you want to be and whether coaching is the right next step — no pressure.', { color: '#57534e', lineHeight: '1.7', fontSize: '17px' }), el.list(['A clear picture of your biggest growth lever', 'Two quick wins you can implement this week', 'An honest recommendation — even if it isn’t me'], { marker: 'icon', icon: 'check', iconColor: accent })], 6, { tablet: 12 }, { gap: '14px' }),
        el.col([el.booking({ title: 'Discovery call with Maya', service: 'Discovery call', duration: '30', times: '09:30, 11:00, 13:30, 15:00, 17:30', action: { type: 'next-step' } })], 6, { tablet: 12 }),
      ], { columnGap: '48px' }, { verticalAlign: 'center' }),
    ], { paddingTop: '96px', paddingBottom: '96px' }), 'book'), 'Booking'),
    faq([
      ['Who is coaching for?', 'Founders, freelancers and small-agency owners with an established offer who want to grow without burning out.'],
      ['How are sessions delivered?', 'All coaching happens over Zoom, with recordings and notes shared after every session.'],
      ['What if it’s not the right fit?', 'Every program includes a 14-day money-back guarantee, no questions asked.'],
      ['Do you offer payment plans?', 'Yes — the 12-week program can be paid in three monthly instalments.'],
    ], 'Questions before we start?', { bg: cream, variant: 'lines' }),
    footer('Maya Reed Coaching', 'Calm, strategic coaching for founders who want growth and a life.', [{ title: 'Explore', links: ['Method', 'Programs', 'Podcast', 'Free guide'] }, { title: 'Contact', links: ['hello@mayareed.co', 'Instagram', 'LinkedIn'] }], { dark: true, bg: '#1c1917' }),
  ];
}


