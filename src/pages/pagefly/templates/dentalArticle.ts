import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';
import { el, IMG } from '../factory';
import type { PFNode } from '../types';

export function dentalArticle(): PFNode[] {
  const muted = '#5f6368', white = '#ffffff';
  const post = (image: string, title: string) => el.block([
    el.image(image, title, { width: '52%', borderRadius: '2px' }, { ratio: '3:4' }),
    el.heading(title, 'h5', { fontSize: '13px', lineHeight: '1.35', width: '48%', fontWeight: '700' }),
  ], { flexDirection: 'row', gap: '12px', alignItems: 'center' }, { action: { type: 'link', url: '#article' } });

  return [
    navbar('BrightSmile Journal', [['Oral care', '#article'], ['Kids', '#related'], ['Reviews', '#faq'], ['Shop', '#offer']], act(el.button('Shop SonicPro', { backgroundColor: '#111111', borderRadius: '0px', fontSize: '12px', letterSpacing: '1px', paddingTop: '11px', paddingBottom: '11px' }), { type: 'link', url: '#offer' }), { brandIcon: 'smile' }),
    named(el.section([
      el.heading('[Heading 1] Is an electric toothbrush a better alternative to a traditional one? Know the pros and cons', 'h1', rs({ color: white, fontSize: '40px', lineHeight: '1.22' }, { fontSize: '28px' })),
      el.paragraph('[Sub-Heading 1] While the American Dental Association (ADA) recommends both manual and electric toothbrushes to remove plaque and prevent dental diseases, you might wonder whether electric toothbrushes get the job done better than manual ones.', { color: '#d1d5db', fontSize: '14px', lineHeight: '1.6' }),
      el.row([
        el.col([el.paragraph('Written by <b>Dr Nguyen</b><br>Published on <b>Feb 08, 2026</b>', { color: '#9ca3af', fontSize: '12px', lineHeight: '1.7' })], 8, { mobile: 8 }),
        el.col([row([el.icon('instagram', { size: '16', color: white }), el.icon('facebook', { size: '16', color: white }), el.icon('mail', { size: '16', color: white })], { justifyContent: 'flex-end', gap: '12px' })], 4, { mobile: 4 }, { justifyContent: 'center' }),
      ], { marginTop: '18px' }, { verticalAlign: 'center' }),
    ], { backgroundColor: '#000000', paddingTop: '72px', paddingBottom: '56px', gap: '16px' }, { maxWidth: '780' }), 'Article hero'),
    named(withId(el.section([
      el.row([
        el.col([
          el.paragraph('[Paragraph] Discover the pros and cons of manual vs. electric toothbrushes for kids including cost, effectiveness, and eco-friendliness so you can make the right choice for your child’s dental needs.', { color: muted, fontSize: '14px', lineHeight: '1.7' }),
          el.image(IMG.toothache, 'Woman holding her cheek with tooth pain', {}, { ratio: '3:2' }),
          el.heading('[Heading 2] Describe the true situation what the customers are facing', 'h2', rs({ fontSize: '26px', lineHeight: '1.3', marginTop: '14px' }, { fontSize: '22px' })),
          el.paragraph('[Paragraph] Discover the pros and cons of manual vs. electric toothbrushes for kids including cost, effectiveness, and eco-friendliness so you can make the right choice for your child’s dental needs.', { color: muted, fontSize: '14px', lineHeight: '1.7' }),
          el.row([
            el.col([el.list(['<b>Customer problem 1:</b> Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry’s standard dummy text ever since.', '<b>Customer problem 2:</b> Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry’s standard dummy text ever since.', '<b>Customer problem 3:</b> Lorem Ipsum is simply dummy text of the printing and typesetting industry.'], {}, { fontSize: '13px', color: '#374151', lineHeight: '1.6' })], 7, { mobile: 12 }),
            el.col([el.image(IMG.bacteria, 'Bacteria under a microscope', {}, { ratio: '1:1' })], 5, { mobile: 12 }),
          ], {}, { verticalAlign: 'start' }),
          el.divider({ color: '#e5e7eb' }, { marginTop: '12px', marginBottom: '12px' }),
          el.row([
            el.col([el.image(IMG.coach, 'Dental expert portrait', { width: '72px', borderRadius: '999px' }, { ratio: '1:1' })], 2, { mobile: 3 }),
            el.col([
              el.heading('Expert’s Name', 'h5', { fontSize: '12px', fontWeight: '600', color: '#6b7280' }),
              el.paragraph('<i>[Paragraph] Discover the pros and cons of manual vs. electric toothbrushes for kids including cost, effectiveness, and eco-friendliness so you can make the right choice for your child’s dental needs.</i>', { color: muted, fontSize: '14px', lineHeight: '1.7' }),
              act(el.button('DOCTOR CONSULTATION', { backgroundColor: '#111111', borderRadius: '0px', fontSize: '11px', letterSpacing: '1px', paddingTop: '11px', paddingBottom: '11px' }), { type: 'link', url: '#offer' }),
            ], 10, { mobile: 9 }),
          ], {}, { verticalAlign: 'start' }),
          el.heading('[Heading 3] Describe deeply the bad effect of these problems', 'h2', rs({ fontSize: '26px', lineHeight: '1.3', marginTop: '18px' }, { fontSize: '22px' })),
          el.paragraph('[Paragraph] Plaque that is not removed hardens into tartar within 24–72 hours. Over time this leads to gum inflammation, bad breath and, eventually, cavities that require costly treatment. Brushing technique matters as much as frequency.', { color: muted, fontSize: '14px', lineHeight: '1.7' }),
          el.paragraph('[Paragraph] Studies show most people brush for less than 60 seconds and miss up to 40% of tooth surfaces. Children are even more likely to skip the back molars where cavities form first.', { color: muted, fontSize: '14px', lineHeight: '1.7' }),
          el.comparison(IMG.toothache, IMG.smile, { beforeLabel: 'Manual brushing', afterLabel: 'After 4 weeks of SonicPro', ratio: '3:2' }),
          named(withId(el.block([
            eyebrow('The solution', '#0f766e'),
            el.heading('[Heading 4] Meet SonicPro — the sonic toothbrush dentists recommend', 'h2', rs({ fontSize: '26px', lineHeight: '1.3' }, { fontSize: '22px' })),
            el.row([
              el.col([el.image(IMG.toothbrush, 'SonicPro electric toothbrush', { borderRadius: '12px' }, { ratio: '1:1' })], 5, { mobile: 12 }),
              el.col([
                el.rating(4.9, '2,341 verified reviews'),
                el.list(['Removes up to 10× more plaque than a manual brush', 'Built-in 2-minute timer with 30-second quadrant pacer', 'Pressure sensor protects sensitive gums', '30-day battery & USB-C fast charging'], { marker: 'icon', icon: 'check-circle', iconColor: '#0f766e' }, { fontSize: '14px' }),
                el.paragraph('<s>$129.00</s>&nbsp; <b>$89.00</b> · Save 31% today', { fontSize: '18px', color: '#111827' }),
                act(el.button('Get 31% off today', { backgroundColor: '#0f766e', borderRadius: '0px', fontSize: '13px', letterSpacing: '1px', paddingTop: '15px', paddingBottom: '15px', width: '100%', justifyContent: 'center' }, { iconRight: 'arrow', tracking: { fb: 'AddToCart', ga: 'advertorial_cta' } }), { type: 'next-step' }),
                el.paragraph('Free shipping · 60-night risk-free trial', { fontSize: '12px', color: '#6b7280', textAlign: 'center' }),
              ], 7, { mobile: 12 }, { justifyContent: 'center' }),
            ], {}, { verticalAlign: 'center' }),
          ], { backgroundColor: '#f0fdfa', padding: '28px', gap: '14px', marginTop: '18px', border: '1px solid #ccfbf1' }), 'offer'), 'Product offer'),
          el.heading('Manual vs. electric: the quick comparison', 'h3', { fontSize: '22px', marginTop: '18px' }),
          el.table([['Feature', 'Manual', 'SonicPro'], ['Plaque removal', 'Good', 'Excellent (10×)'], ['Built-in timer', '—', '✓ 2-minute pacer'], ['Pressure sensor', '—', '✓'], ['Battery life', '—', '30 days'], ['Average cost / year', '$12', '$24 (heads)']]),
        ], 8, { tablet: 12 }, { gap: '16px' }),
        named(withId(el.col([
          el.heading('More related posts', 'h4', { fontSize: '16px', fontWeight: '700' }),
          post(IMG.smile, 'Sonic vs. Vibrating Toothbrushes: What’s the Difference and Which is Right for You?'),
          post(IMG.clinic, 'Teaching Toddlers Brushing: Fun Natural Techniques for a Healthy Smile'),
          post(IMG.toothbrush, 'Interdental Cleaning: The Secret Weapon for a Cleaner Smile'),
          el.block([
            el.heading('Short title to promote your product can be added here!', 'h3', { color: '#ffffff', fontSize: '24px', lineHeight: '1.2' }),
            act(el.button('SHOP NOW', { backgroundColor: '#d9f99d', color: '#111111', borderRadius: '0px', fontSize: '11px', letterSpacing: '1px' }), { type: 'next-step' }),
          ], { minHeight: '420px', justifyContent: 'flex-end', padding: '22px', gap: '14px', backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.65) 100%), url(${IMG.smile})`, backgroundSize: 'cover', backgroundPosition: 'center', marginTop: '6px' }),
        ], 4, { tablet: 12 }, { gap: '16px', position: 'sticky', top: '16px' }), 'related'), 'Related posts sidebar'),
      ], { columnGap: '40px' }, { verticalAlign: 'start' }),
    ], { paddingTop: '40px', paddingBottom: '64px' }, { maxWidth: '1080' }), 'article'), 'Article body'),
    faq([
      ['Are electric toothbrushes safe for kids?', 'Yes. Children over 3 can safely use an electric toothbrush with a kids’ brush head and gentle mode. Supervise brushing until about age 7.'],
      ['How often should I replace the brush head?', 'Every 3 months, or sooner if the bristles fray. SonicPro heads have fading indicator bristles that tell you when it’s time.'],
      ['Does SonicPro work with sensitive teeth?', 'SonicPro includes a Sensitive mode and a pressure sensor that pauses pulsing if you brush too hard.'],
      ['What if it isn’t right for me?', 'Try it for 60 nights. If you don’t love it, return it for a full refund — shipping is on us.'],
    ], 'Your questions, answered', { bg: '#fafafa', variant: 'lines' }),
    footer('BrightSmile Journal', 'Evidence-based oral care advice reviewed by licensed dentists.', [{ title: 'Read', links: ['Oral care', 'Kids’ dental health', 'Product reviews'] }, { title: 'Company', links: ['About', 'Editorial policy', 'Contact'] }], { dark: true, bg: '#000000' }),
  ];
}


