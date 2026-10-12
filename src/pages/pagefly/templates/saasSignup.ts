import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';
import { el, IMG } from '../factory';
import type { PFNode } from '../types';

export function saasSignup(): PFNode[] {
  return [
    named(el.section([
      el.row([
        el.col([
          el.heading('Flowboard', 'p', { fontSize: '20px', fontWeight: '800' }),
          el.heading('Create your free workspace', 'h1', rs({ fontSize: '40px', letterSpacing: '-1px' }, { fontSize: '30px' })),
          el.paragraph('14 days of Growth, free. No credit card required.', { color: '#475569', fontSize: '17px' }),
          el.form([
            el.field('Full name', 'text', { name: 'FNAME', required: true, placeholder: 'Full name', showLabel: true }),
            el.field('Work email', 'email', { name: 'EMAIL', required: true, placeholder: 'you@company.com', showLabel: true }),
            el.field('Team size', 'select', { name: 'SIZE', options: '1–10\n11–50\n51–200\n200+', showLabel: true, placeholder: 'Select team size' }),
            el.field('I agree to the Terms and Privacy Policy', 'checkbox', { name: 'TERMS', required: true }),
            el.submit('Create workspace', { width: '100%', borderRadius: '10px', justifyContent: 'center' }),
          ], { listName: 'Flowboard trials', successMessage: 'Your workspace is ready! Check your inbox to verify your email.', action: { type: 'next-step' } }),
        ], 5, { tablet: 12 }, { gap: '16px', justifyContent: 'center' }),
        el.col([el.block([
          el.image(IMG.saas, 'Flowboard dashboard', { borderRadius: '14px', boxShadow: '0 30px 60px rgba(0,0,0,.3)' }, { ratio: '16:10' }),
          el.paragraph('“Flowboard replaced three tools for us in a single afternoon.”', { color: '#ffffff', fontSize: '20px', lineHeight: '1.5' }),
          el.paragraph('Elena Park · VP Operations, Northwind', { color: '#c7d2fe', fontSize: '14px' }),
        ], { padding: '40px', borderRadius: '24px', gap: '20px', backgroundImage: 'linear-gradient(135deg, #4f46e5, #7c3aed)', height: '100%', justifyContent: 'center' })], 7, { tablet: 12 }),
      ], { columnGap: '56px' }, { verticalAlign: 'stretch' }),
    ], { paddingTop: '56px', paddingBottom: '56px' }), 'Signup'),
  ];
}
