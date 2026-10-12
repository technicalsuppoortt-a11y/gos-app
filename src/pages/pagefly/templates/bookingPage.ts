import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';
import { el, IMG } from '../factory';
import type { PFNode } from '../types';

export function bookingPage(opts: { brand: string; title: string; service: string; image: string; bg: string }): PFNode[] {
  return [
    named(el.section([
      el.row([
        el.col([
          el.heading(opts.brand, 'p', { fontSize: '19px', fontWeight: '800' }),
          el.heading(opts.title, 'h1', rs({ fontSize: '40px' }, { fontSize: '30px' })),
          el.paragraph('Choose a day and time that suits you. You’ll receive a calendar invite and reminder by email.', { color: '#57534e', fontSize: '17px' }),
          el.image(opts.image, opts.brand, { borderRadius: '18px' }, { ratio: '4:3' }),
        ], 6, { tablet: 12 }, { gap: '14px' }),
        el.col([el.booking({ title: opts.title, service: opts.service, duration: '30', action: { type: 'next-step' } })], 6, { tablet: 12 }),
      ], { columnGap: '48px' }, { verticalAlign: 'center' }),
    ], { backgroundColor: opts.bg, paddingTop: '64px', paddingBottom: '64px' }), 'Booking'),
  ];
}

