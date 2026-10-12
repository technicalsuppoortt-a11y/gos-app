import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';
import { el, IMG } from '../factory';
import type { PFNode } from '../types';

export function dentalClinic(): PFNode[] {
  const services: [string, string, string][] = [
    ['sparkles', 'Teeth whitening', 'Up to 8 shades brighter in a single 60-minute visit.'],
    ['shield-check', 'Dental implants', 'Permanent, natural-looking replacements for missing teeth.'],
    ['smile', 'Invisalign® aligners', 'Straighten your smile discreetly — no metal braces.'],
    ['heart', 'Kids’ dentistry', 'Gentle, fun visits that build healthy habits for life.'],
    ['stethoscope', 'Check-ups & cleaning', 'Thorough exams, digital X-rays and hygienist cleaning.'],
    ['zap', 'Emergency care', 'Same-day appointments for toothache and injuries.'],
  ];
  return [
    navbar('BrightSmile Dental', [['Services', '#services'], ['Results', '#results'], ['Reviews', '#reviews'], ['Contact', '#booking']], act(el.button('Book a visit', { borderRadius: '999px', paddingTop: '11px', paddingBottom: '11px' }), { type: 'link', url: '#booking' }), { brandIcon: 'smile' }),
    named(el.section([
      el.row([
        el.col([
          anim(eyebrow('Trusted by 12,000+ patients in Cairo')),
          anim(el.heading('Healthy, confident smiles start here', 'h1', rs({ fontSize: '54px', lineHeight: '1.08', letterSpacing: '-1.5px' }, { fontSize: '36px' })), 'fade-up', '0.1'),
          anim(el.paragraph('Modern, pain-free dentistry for the whole family. Same-day appointments, transparent pricing and a team that genuinely cares.', { fontSize: '18px', color: '#475569', lineHeight: '1.65' }), 'fade-up', '0.2'),
          row([
            act(el.button('Book free consultation', { borderRadius: '999px', paddingTop: '15px', paddingBottom: '15px', paddingLeft: '28px', paddingRight: '28px', boxShadow: '0 10px 24px rgba(14,116,144,.3)' }, { iconRight: 'arrow', tracking: { fb: 'Lead', ga: 'book_consultation' } }), { type: 'link', url: '#booking' }),
            act(el.button('Call (02) 2345 6789', { backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '999px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#cbd5e1', paddingTop: '15px', paddingBottom: '15px' }, { iconLeft: 'phone' }), { type: 'phone', url: '+20223456789' }),
          ], { marginTop: '8px' }),
          row([el.rating(4.9, '812 Google reviews'), el.paragraph('· Open Saturdays', { fontSize: '14px', color: '#475569' })], { marginTop: '10px', gap: '6px' }),
        ], 6, { tablet: 12 }, { gap: '16px', justifyContent: 'center' }),
        el.col([anim(el.image(IMG.clinic, 'Modern dental clinic treatment room', { borderRadius: '24px', boxShadow: '0 40px 80px rgba(15,23,42,.18)' }, { ratio: '4:3' }), 'zoom', '0.2')], 6, { tablet: 12 }),
      ], { columnGap: '56px' }, { verticalAlign: 'center' }),
    ], { paddingTop: '80px', paddingBottom: '80px', backgroundColor: '#f0fdff', backgroundImage: 'radial-gradient(circle at 85% 10%, rgba(14,116,144,.14), transparent 40%)' }), 'Hero'),
    named(el.section([
      el.contentList([{ icon: 'clock', title: 'Same-day visits', text: 'Book online in 60 seconds.' }, { icon: 'card', title: 'Insurance accepted', text: 'All major providers.' }, { icon: 'heart', title: 'Pain-free care', text: 'Gentle sedation options.' }, { icon: 'calendar', title: 'Open 6 days', text: 'Mon–Sat, 9am–9pm.' }], { layout: 'horizontal' }),
    ], { paddingTop: '28px', paddingBottom: '28px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }), 'Trust bar'),
    named(withId(el.section([
      centerBlock([eyebrow('Our services'), el.heading('Complete care under one roof', 'h2', rs({ fontSize: '40px' }, { fontSize: '30px' })), el.paragraph('From routine check-ups to complete smile makeovers, our specialists use the latest digital technology.', { color: '#64748b', maxWidth: '620px', fontSize: '17px' })], { marginBottom: '20px' }),
      el.row(services.map(([icon, title, text], index) => el.col([anim(card([
        el.icon(icon, { size: '22', color: '#0e7490' }, { backgroundColor: '#ecfeff', padding: '12px', borderRadius: '12px' }),
        el.heading(title, 'h3', { fontSize: '20px' }),
        el.paragraph(text, { color: '#64748b', lineHeight: '1.6' }),
        act(el.button('Learn more', { backgroundColor: 'transparent', color: '#0e7490', paddingLeft: '0px', paddingRight: '0px', paddingTop: '4px', paddingBottom: '4px', fontSize: '14px' }, { iconRight: 'arrow' }), { type: 'link', url: '#booking' }),
      ], { height: '100%', border: '1px solid #e2e8f0', boxShadow: 'none' }), 'fade-up', String(index * 0.08))], 4, { tablet: 6, mobile: 12 }))),
    ], { paddingTop: '88px', paddingBottom: '88px', backgroundColor: '#f8fafc' }), 'services'), 'Services'),
    named(withId(el.section([
      el.row([
        el.col([el.comparison(IMG.toothache, IMG.smile, { beforeLabel: 'Before', afterLabel: 'After', ratio: '4:3' }, { borderRadius: '20px' })], 6, { tablet: 12 }),
        el.col([
          eyebrow('Real results'),
          el.heading('Smile makeovers our patients love', 'h2', rs({ fontSize: '38px' }, { fontSize: '28px' })),
          el.paragraph('Drag the slider to see a real whitening and alignment result from our clinic. Every treatment plan is designed digitally, so you can preview your new smile before we begin.', { color: '#475569', lineHeight: '1.7' }),
          el.progress(98, 'Patient satisfaction', { color: '#0e7490' }), el.progress(94, 'Would recommend to family', { color: '#0e7490' }), el.progress(87, 'Treatments finished ahead of schedule', { color: '#0e7490' }),
        ], 6, { tablet: 12 }, { gap: '16px', justifyContent: 'center' }),
      ], { columnGap: '56px' }, { verticalAlign: 'center' }),
    ], { paddingTop: '88px', paddingBottom: '88px' }), 'results'), 'Before & after'),
    named(withId(el.section([
      centerBlock([eyebrow('Patient stories'), el.heading('Rated 4.9 by 800+ patients', 'h2', rs({ fontSize: '38px' }, { fontSize: '28px' }))], { marginBottom: '18px' }),
      el.testimonials([
        { quote: 'I was terrified of dentists. Dr. Salma explained every step and I felt absolutely nothing. My implant looks completely natural.', name: 'Nour E.', role: 'Implant patient', rating: 5, avatar: IMG.smile },
        { quote: 'Booked online at 8am and was seen by 11. The clinic is spotless and the team is incredibly kind with my kids.', name: 'Karim A.', role: 'Family plan', rating: 5 },
        { quote: 'Invisalign changed my confidence. Clear pricing from day one and progress check-ins that fit my work schedule.', name: 'Mariam H.', role: 'Invisalign patient', rating: 5 },
      ]),
      el.appBlock('Google Reviews', { title: 'BrightSmile Dental · Google' }, { marginTop: '18px', alignSelf: 'center' }),
    ], { paddingTop: '88px', paddingBottom: '88px', backgroundColor: '#f0fdff' }), 'reviews'), 'Testimonials'),
    named(withId(el.section([
      el.row([
        el.col([
          eyebrow('Book your visit'),
          el.heading('Your free consultation includes', 'h2', rs({ fontSize: '36px' }, { fontSize: '28px' })),
          el.list(['Full oral exam and digital X-rays', 'Personalised treatment plan & pricing', 'Smile simulation for cosmetic treatments', 'No obligation — ever'], { marker: 'icon', icon: 'check-circle', iconColor: '#0e7490' }, { fontSize: '16px' }),
          el.map('Zamalek, Cairo, Egypt', { height: '260' }),
          el.paragraph('📍 26 July St, Zamalek, Cairo · ☎ (02) 2345 6789', { fontSize: '14px', color: '#475569' }),
        ], 6, { tablet: 12 }, { gap: '16px' }),
        el.col([el.booking({ title: 'Book your free consultation', service: 'New patient consultation', duration: '30', times: '09:00, 10:30, 12:00, 14:30, 16:00, 18:30', action: { type: 'next-step' } })], 6, { tablet: 12 }),
      ], { columnGap: '48px' }, { verticalAlign: 'start' }),
    ], { paddingTop: '88px', paddingBottom: '88px' }), 'booking'), 'Booking'),
    faq([
      ['Is the first consultation really free?', 'Yes. Your first visit — including the exam, X-rays and treatment plan — is completely free with no obligation.'],
      ['Do you accept my insurance?', 'We work with all major insurance providers and offer 0% instalment plans for treatments over EGP 5,000.'],
      ['Do you treat dental emergencies?', 'Absolutely. We keep same-day slots open for toothache, broken teeth and swelling. Call us and we will see you today.'],
      ['Is teeth whitening safe?', 'Professional whitening supervised by a dentist is safe and does not damage enamel. Sensitivity, if any, fades within 48 hours.'],
    ]),
    footer('BrightSmile Dental', 'Modern, gentle dentistry for the whole family in the heart of Zamalek.', [{ title: 'Treatments', links: ['Whitening', 'Implants', 'Invisalign', 'Kids'] }, { title: 'Clinic', links: ['Our team', 'Pricing', 'Insurance', 'Contact'] }], { dark: true, bg: '#042f3a' }),
  ];
}


