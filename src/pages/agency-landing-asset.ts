import { createBuilderDocument, type BuilderSection } from './BuilderWorkspace';
import type { Asset } from './asset-model';
import { readCMS } from './landing/cms';

/** Asset IDs use this prefix so a workspace can recognise its seeded landing copy. */
export const AGENCY_LANDING_PREFIX = 'agency-landing-';

const styles = (textAlign = 'Left'): BuilderSection['styles'] => ({ backgroundColor: '#ffffff', padding: '28', textAlign, typography: 'Default', customCss: '', visibility: 'All devices', animation: 'None' });
const block = (type: BuilderSection['type'], title: string, body = '', content: Record<string, string> = {}, textAlign = 'Left'): BuilderSection =>
  ({ id: crypto.randomUUID(), type, content: { title, body, ...content }, styles: styles(textAlign) });
const heading = (title: string, tag = 'H2') => block('Heading', title, '', { headingTag: tag }, 'Center');
const paragraph = (text: string) => block('Paragraph', '', text, {}, 'Center');
/** Spreads cards across three columns, each card rendered as a heading and a paragraph. */
function cardColumns(cards: { title: string; text: string }[]): BuilderSection {
  const columns = block('Columns', '', '', { columnLayout: '3 Col (33/33/33)', gap: '20' });
  columns.children = [0, 1, 2].map(column => cards.filter((_, index) => index % 3 === column).flatMap(card => [block('Heading', card.title, '', { headingTag: 'H3' }), block('Paragraph', '', card.text)]));
  return columns;
}

/**
 * Builds an independent, editable website from the published platform landing page (`/`).
 * It is a copy: edits made in the agency workspace never change the platform landing page.
 */
export function buildAgencyLandingAsset(language: 'en' | 'ar' = 'en'): Asset {
  const cms = readCMS();
  const copy = cms[language] ?? cms.en;
  const name = language === 'ar' ? 'صفحة الهبوط الرئيسية' : 'Landing Page';
  const image = '/dashboard/hero-landscape.png';
  const document = createBuilderDocument('website', name, image, 1);
  const page = document.pages[0];
  const title = [copy.hero.titleA, copy.hero.titleB].filter(Boolean).join(' ');

  const contact = block('Form', copy.cta.title, copy.cta.text, {
    fields: JSON.stringify(['Name', 'Email', 'Message']),
    button: copy.cta.primary,
    successMessage: language === 'ar' ? 'شكراً لك! تم استلام طلبك وسيتواصل معك فريقنا قريباً.' : 'Thank you! Your request has been received. Our team will be in touch shortly.',
  });
  const plans = cms.pricing.map((plan, index) => ({
    id: crypto.randomUUID(),
    name: language === 'ar' ? plan.nameAr || plan.name : plan.name,
    price: `$${plan.monthly}`,
    period: language === 'ar' ? 'شهرياً' : 'month',
    features: String(language === 'ar' ? plan.featuresAr || plan.features : plan.features).split(/[·•,\n]/).map(item => item.trim()).filter(Boolean),
    button: cms.pricingCTA[language] || copy.cta.primary,
    highlighted: index === 1,
  }));

  page.sections = [
    block('Hero', title, copy.hero.lead, { button: copy.hero.primary, destinationType: 'Scroll to Section', destination: contact.id, src: image }),
    heading(copy.problem.title), paragraph(copy.problem.text), cardColumns(copy.problem.cards),
    heading(copy.how.title), paragraph(copy.how.text), cardColumns(copy.how.steps),
    heading(copy.tools.title), paragraph(copy.tools.text), cardColumns(copy.tools.items),
    block('Testimonials', copy.testimonials.title, copy.testimonials.text, {
      testimonials: JSON.stringify(copy.testimonials.items.map((item, index) => ({ id: crypto.randomUUID(), author: item.name, role: item.role, quote: item.quote.replace(/^[“"]|[”"]$/g, ''), rating: 5, avatar: `/landing/avatar-${(index % 3) + 1}.png` }))),
    }, 'Center'),
    ...(plans.length ? [block('Pricing', cms.pricingTitle[language] || cms.pricingTitle.en, cms.pricingDescription[language] || cms.pricingDescription.en, { plans: JSON.stringify(plans) }, 'Center')] : []),
    block('FAQ', copy.faq.title, copy.faq.text, { questions: JSON.stringify(copy.faq.items.map(item => ({ id: crypto.randomUUID(), question: item.q, answer: item.a }))) }),
    contact,
  ];
  Object.assign(page, { name: language === 'ar' ? 'الرئيسية' : 'Home', path: '/', status: 'Draft', headline: title, subheadline: copy.hero.lead, cta: copy.hero.primary, seoTitle: copy.meta.title, seoDescription: copy.meta.description, featuredImage: image });
  document.theme = { color: '#7C3AED', font: 'Inter', corners: 'Square' };
  document.funnel = { ...document.funnel, name, goal: 'Lead generation', pagesFlow: [page.id], status: 'Draft' };

  return {
    id: AGENCY_LANDING_PREFIX + crypto.randomUUID(),
    kind: 'website',
    formAsset: false,
    name,
    document,
    image,
    description: copy.meta.description,
    domain: '',
    updated: new Date().toISOString(),
    settings: { seo: copy.meta.title, navigation: page.name, color: '#7C3AED' },
  };
}
