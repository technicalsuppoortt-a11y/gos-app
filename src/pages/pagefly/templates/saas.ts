import { rs, named, region, withId, anim, act, hideMobile, eyebrow, row, card, centerBlock, linkBtn, navbar, footer, faq, thankYouPage, checkoutPage } from './helpers';
import { el, IMG } from '../factory';
import type { PFNode } from '../types';

export function saas(): PFNode[] {
  const indigo = '#4f46e5';
  const featurePane = (title: string, text: string, points: string[]) => [el.row([
    el.col([el.heading(title, 'h3', { fontSize: '28px' }), el.paragraph(text, { color: '#475569', lineHeight: '1.7' }), el.list(points, { marker: 'icon', icon: 'check-circle', iconColor: indigo })], 5, { tablet: 12 }, { gap: '14px', justifyContent: 'center' }),
    el.col([el.image(IMG.saas, title, { borderRadius: '16px', boxShadow: '0 30px 60px rgba(30,27,75,.15)' }, { ratio: '16:10' })], 7, { tablet: 12 }),
  ], { columnGap: '48px' }, { verticalAlign: 'center' })];
  const plans = (yearly: boolean) => el.pricing([
    { name: 'Starter', price: yearly ? '7' : '9', period: 'user / mo', description: 'For small teams getting organised', features: ['Unlimited boards', 'Up to 10 members', 'Basic automations', 'Email support'], button: 'Start free trial' },
    { name: 'Growth', price: yearly ? '15' : '19', period: 'user / mo', description: 'For teams that need to move fast', features: ['Everything in Starter', 'Unlimited members', 'Advanced automations', 'Timeline & workload views', 'Priority support'], button: 'Start free trial', highlighted: true, badge: 'Most popular' },
    { name: 'Enterprise', price: yearly ? '29' : '35', period: 'user / mo', description: 'For organisations at scale', features: ['Everything in Growth', 'SSO & SCIM', 'Audit logs', 'Dedicated success manager'], button: 'Contact sales' },
  ], { currency: '$', action: { type: 'next-step' } });
  return [
    navbar('Flowboard', [['Features', '#features'], ['Customers', '#customers'], ['Pricing', '#pricing'], ['FAQ', '#faq']], act(el.button('Start free trial', { borderRadius: '10px', paddingTop: '11px', paddingBottom: '11px' }), { type: 'next-step' }), { brandIcon: 'sparkles' }),
    named(el.section([
      centerBlock([
        anim(el.heading('✦ New: AI weekly reports are here', 'p', { fontSize: '13px', fontWeight: '600', color: indigo, backgroundColor: '#eef2ff', padding: '7px 14px', borderRadius: '999px' })),
        anim(el.heading('Run your whole team from one beautiful board', 'h1', rs({ fontSize: '64px', lineHeight: '1.04', letterSpacing: '-2px', maxWidth: '900px' }, { fontSize: '38px' })), 'fade-up', '0.1'),
        anim(el.paragraph('Plan projects, track work and automate the busywork. Flowboard gives every team a single source of truth — without the clutter.', { fontSize: '19px', color: '#475569', maxWidth: '640px', lineHeight: '1.6' }), 'fade-up', '0.2'),
        row([
          act(el.button('Start your free trial', { borderRadius: '10px', paddingTop: '15px', paddingBottom: '15px', paddingLeft: '28px', paddingRight: '28px', boxShadow: '0 12px 30px rgba(79,70,229,.35)' }, { iconRight: 'arrow', tracking: { fb: 'StartTrial', ga: 'start_trial' } }), { type: 'next-step' }),
          act(el.button('Book a demo', { backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '10px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#e2e8f0', paddingTop: '15px', paddingBottom: '15px' }, { iconLeft: 'play' }), { type: 'link', url: '#features' }),
        ], { justifyContent: 'center', marginTop: '6px' }),
        el.paragraph('No credit card required · 14-day free trial · Cancel anytime', { fontSize: '13px', color: '#64748b' }),
      ], { gap: '18px' }),
      anim(el.image(IMG.saas, 'Flowboard dashboard', { borderRadius: '18px', marginTop: '44px', boxShadow: '0 50px 100px rgba(30,27,75,.22)', border: '1px solid #e0e7ff' }, { ratio: '16:9' }), 'fade-up', '0.25'),
    ], { paddingTop: '80px', paddingBottom: '72px', backgroundColor: '#ffffff', backgroundImage: 'radial-gradient(ellipse at 50% -10%, rgba(79,70,229,.14), transparent 55%)' }, { maxWidth: '1120' }), 'Hero'),
    named(withId(el.section([
      el.paragraph('TRUSTED BY 4,000+ FAST-MOVING TEAMS', { fontSize: '12px', letterSpacing: '2px', color: '#94a3b8', textAlign: 'center', fontWeight: '600' }),
      el.row(['Northwind', 'Globex', 'Acme Co.', 'Umbrella', 'Initech', 'Hooli'].map(name => el.col([el.heading(name, 'p', { fontSize: '20px', fontWeight: '800', color: '#94a3b8', textAlign: 'center', letterSpacing: '-0.5px' })], 2, { tablet: 4, mobile: 6 })), { marginTop: '10px' }),
    ], { paddingTop: '32px', paddingBottom: '32px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }), 'customers'), 'Logo strip'),
    named(withId(el.section([
      centerBlock([eyebrow('Features', indigo), el.heading('One workspace. Every workflow.', 'h2', rs({ fontSize: '42px' }, { fontSize: '30px' }))], { marginBottom: '14px' }),
      el.tabs([
        { label: 'Plan', children: featurePane('Plan with clarity', 'Roadmaps, sprints and goals in one place — everyone sees what matters and why.', ['Drag-and-drop roadmaps', 'Goals linked to real work', 'Templates for every team']) },
        { label: 'Track', children: featurePane('Track every moving part', 'Kanban, list, timeline and workload views that update in real time.', ['Custom fields & statuses', 'Real-time collaboration', 'Workload balancing']) },
        { label: 'Automate', children: featurePane('Automate the busywork', 'Build no-code rules that assign, notify and update tasks for you.', ['200+ automation recipes', 'Slack, Gmail & GitHub sync', 'Recurring tasks']) },
        { label: 'Report', children: featurePane('Report in seconds', 'AI-written weekly summaries and dashboards your leadership will love.', ['AI weekly reports', 'Shareable dashboards', 'Export to PDF & CSV']) },
      ], { variant: 'pills', align: 'center' }),
    ], { paddingTop: '96px', paddingBottom: '96px', backgroundColor: '#f8fafc' }), 'features'), 'Feature tabs'),
    named(el.section([
      el.row([['4,000+', 'Teams onboard'], ['32%', 'Faster delivery'], ['9 hrs', 'Saved per person / week'], ['99.99%', 'Uptime SLA']].map(([value, label]) => el.col([el.heading(value, 'p', rs({ fontSize: '46px', fontWeight: '800', color: '#ffffff', textAlign: 'center', letterSpacing: '-1px' }, { fontSize: '34px' })), el.paragraph(label, { color: '#c7d2fe', textAlign: 'center' })], 3, { tablet: 6, mobile: 6 }, { gap: '4px' }))),
    ], { backgroundColor: indigo, paddingTop: '64px', paddingBottom: '64px', backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }), 'Stats'),
    named(el.section([
      centerBlock([el.heading('Teams switch to Flowboard and never look back', 'h2', rs({ fontSize: '38px', maxWidth: '720px' }, { fontSize: '28px' }))], { marginBottom: '18px' }),
      el.testimonials([
        { quote: 'We replaced three tools with Flowboard and our weekly status meeting disappeared. The AI reports are scary good.', name: 'Elena Park', role: 'VP Operations, Northwind', rating: 5 },
        { quote: 'Onboarding 120 people took one afternoon. The automations alone save my team a full day every week.', name: 'Marcus Lee', role: 'Head of Product, Globex', rating: 5 },
        { quote: 'Finally a project tool designers and engineers both enjoy using. Clean, fast and flexible.', name: 'Sofia Ramos', role: 'Design Lead, Acme', rating: 5 },
      ]),
    ], { paddingTop: '96px', paddingBottom: '96px' }), 'Testimonials'),
    named(withId(el.section([
      centerBlock([eyebrow('Pricing', indigo), el.heading('Simple pricing that scales with you', 'h2', rs({ fontSize: '42px' }, { fontSize: '30px' }))], { marginBottom: '10px' }),
      el.tabs([{ label: 'Monthly', children: [plans(false)] }, { label: 'Yearly · save 20%', children: [plans(true)] }], { variant: 'pills', align: 'center' }),
    ], { paddingTop: '96px', paddingBottom: '96px', backgroundColor: '#f8fafc' }), 'pricing'), 'Pricing'),
    faq([
      ['How does the free trial work?', 'You get full access to the Growth plan for 14 days. No credit card required — choose a plan when you’re ready.'],
      ['Can I import from Trello, Asana or Jira?', 'Yes. One-click importers bring over boards, tasks, comments and attachments in minutes.'],
      ['Is my data secure?', 'Flowboard is SOC 2 Type II certified, encrypts data at rest and in transit, and offers EU data residency.'],
      ['Do you offer discounts for non-profits?', 'Yes — eligible non-profits and education teams get 50% off any plan.'],
    ]),
    named(el.section([
      centerBlock([el.heading('Ready to bring calm to your team’s work?', 'h2', rs({ fontSize: '42px', color: '#ffffff', maxWidth: '720px' }, { fontSize: '30px' })), el.paragraph('Join 4,000+ teams already shipping faster with Flowboard.', { color: '#c7d2fe', fontSize: '18px' }), act(el.button('Start your free trial', { backgroundColor: '#ffffff', color: indigo, borderRadius: '10px', paddingTop: '15px', paddingBottom: '15px', paddingLeft: '30px', paddingRight: '30px' }, { iconRight: 'arrow' }), { type: 'next-step' })], { gap: '16px' }),
    ], { backgroundColor: '#1e1b4b', paddingTop: '88px', paddingBottom: '88px', backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(124,58,237,.45), transparent 45%)' }), 'Final CTA'),
    footer('Flowboard', 'The calm work OS for modern teams.', [{ title: 'Product', links: ['Features', 'Integrations', 'Pricing', 'Changelog'] }, { title: 'Company', links: ['About', 'Careers', 'Security', 'Contact'] }], { dark: false }),
  ];
}
