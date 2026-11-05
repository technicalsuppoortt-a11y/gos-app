import type { BuilderPage, BuilderSection } from './BuilderWorkspace';
import type { Asset } from './asset-model';
import { defaultCMS } from './landing/cms';

/** Asset IDs use this prefix so a workspace can recognise its seeded landing copy. */
export const AGENCY_LANDING_PREFIX = 'agency-landing-';

/**
 * Maps the public landing page's shipped CMS copy to native website builder blocks.
 */
export function buildAgencyLandingAsset(language: 'en' | 'ar' = 'en'): Asset {
  const cms = defaultCMS();
  const copy = cms[language];
  const name = language === 'ar' ? 'صفحة الهبوط الرئيسية' : 'Landing Page';
  const image = '/dashboard/hero-landscape.png';
  const title = [copy.hero.titleA, copy.hero.titleB].filter(Boolean).join(' ');
  let sequence = 0;
  const nextId = () => `landing-${++sequence}`;
  const block = (type: BuilderSection['type'], title: string, body = '', content: Record<string, string> = {}, textAlign = 'Left'): BuilderSection => ({
    id: nextId(),
    type,
    content: { title, body, ...content },
    styles: { backgroundColor: '#ffffff', padding: '28', textAlign, typography: 'Default', customCss: '', visibility: 'All devices', animation: 'None' },
  });
  const heading = (title: string, tag = 'H2') => block('Heading', title, '', { headingTag: tag }, 'Center');
  const paragraph = (text: string) => block('Paragraph', '', text, {}, 'Center');
  const cardColumns = (cards: { title: string; text: string }[]) => {
    const columns = block('Columns', '', '', { columnLayout: '3 Col (33/33/33)', gap: '20' });
    columns.children = [0, 1, 2].map(column => cards.filter((_, index) => index % 3 === column).flatMap(card => [heading(card.title, 'H3'), paragraph(card.text)]));
    return columns;
  };

  const contact = block('Contact Form', copy.cta.title, copy.cta.text, {
    fields: JSON.stringify(['Name', 'Email', 'Message']),
    button: copy.cta.primary,
    successMessage: language === 'ar' ? 'شكراً لك! تم استلام طلبك وسيتواصل معك فريقنا قريباً.' : 'Thank you! Your request has been received. Our team will be in touch shortly.',
  });

  const sections = [
    block('Hero', title, copy.hero.lead, { button: copy.hero.primary, destinationType: 'Scroll to Section', destination: contact.id }),
    paragraph(copy.hero.checks.join(' · ')),
    heading(copy.hero.builtFor, 'H3'), paragraph(copy.hero.businesses.join(' · ')),
    heading(copy.problem.title), paragraph(copy.problem.text), cardColumns(copy.problem.cards),
    paragraph(copy.problem.alert),
    heading(`${copy.solution.titleA} ${copy.solution.titleB}`), paragraph(copy.solution.text),
    cardColumns(Object.values(copy.solution.nodes)),
    cardColumns(copy.solution.steps.map(({ label, detail }) => ({ title: label, text: detail }))),
    heading(copy.demo.title), paragraph(copy.demo.text),
    cardColumns(copy.demo.stages),
    ...copy.demo.messages.map(message => block('Paragraph', '', message.text, {}, message.from === 'ai' ? 'Right' : 'Left')),
    heading(copy.demo.canTitle, 'H3'), paragraph(copy.demo.can.join(' · ')),
    heading(copy.compare.title), paragraph(copy.compare.text),
    cardColumns([
      { title: copy.compare.beforeTitle, text: copy.compare.before.join('\n') },
      { title: copy.compare.afterTitle, text: copy.compare.after.join('\n') },
    ]),
    heading(copy.how.title), paragraph(copy.how.text), cardColumns(copy.how.steps),
    heading(copy.tools.title), paragraph(copy.tools.text), cardColumns(copy.tools.items),
    block('Testimonials', copy.testimonials.title, copy.testimonials.text, {
      testimonials: JSON.stringify(copy.testimonials.items.map((item, index) => ({ id: nextId(), author: item.name, role: item.role, quote: item.quote.replace(/^[“"]|[”"]$/g, ''), rating: 5, avatar: `/landing/avatar-${(index % 3) + 1}.png` }))),
    }, 'Center'),
    block('FAQ', copy.faq.title, copy.faq.text, { questions: JSON.stringify(copy.faq.items.map(item => ({ id: nextId(), question: item.q, answer: item.a }))) }),
    contact,
    paragraph(copy.footer.rights),
  ];
  const page: BuilderPage = {
    id: 'home', name: language === 'ar' ? 'الرئيسية' : 'Home', path: '/', status: 'Draft',
    headline: title, subheadline: copy.hero.lead, cta: copy.hero.primary,
    seoTitle: copy.meta.title, seoDescription: copy.meta.description, featuredImage: image,
    showHeader: true, header: 'Header 1', showFooter: true, footer: 'Footer 1', sections,
  };

  return {
    id: AGENCY_LANDING_PREFIX,
    kind: 'website',
    formAsset: false,
    name,
    document: {
      pages: [page], steps: [], theme: { color: '#7C3AED', font: 'Inter', corners: 'Square' },
      funnel: { name, goal: 'Lead generation', audience: '', offer: '', pagesFlow: [page.id], events: ['Form Submit'], status: 'Draft' },
    },
    image,
    description: copy.meta.description,
    domain: '',
    updated: '',
    settings: { seo: copy.meta.title, navigation: page.name, color: '#7C3AED' },
  };
}
