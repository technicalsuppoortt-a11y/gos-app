import { defaultConfig, formatPrice, newProduct, type Product, type ProductType, type Lesson } from './model';

export interface ProductTemplate {
  id: string; category: 'Services' | 'Digital Products' | 'Courses'; industry: string; tags: string[];
  features: string[]; product: Product;
}
const definitions: Array<[string, ProductType, string, number, string, string, string, string[]]> = [
  ['executive', 'Service', '1-on-1 Executive Strategy Session', 150, 'Business & Consulting', '/dashboard/product-consultation.png', 'Make your next business decision with clarity. Work privately with Samir Morgan to uncover growth opportunities and leave with a focused 90-day action plan.', ['Leadership', 'Strategy', 'Consulting']],
  ['coaching', 'Service', 'Founder Growth Coaching', 150, 'Business & Consulting', '/dashboard/product-coaching.png', 'Turn ambitious goals into practical weekly actions with a private coaching session, tailored feedback, and a clear accountability plan.', ['Founders', 'Coaching', 'Growth']],
  ['playbook', 'Digital Product', 'Ultimate Growth Marketing Playbook', 29, 'Marketing & Growth', '/product-templates/playbook.svg', 'Build a repeatable growth engine with campaign frameworks, acquisition checklists, and an actionable experiment worksheet.', ['Marketing', 'PDF', 'Growth']],
  ['toolkit', 'Digital Product', 'Creator Launch Toolkit', 29, 'Design & Creativity', '/product-templates/toolkit.svg', 'Plan your next launch with a practical collection of positioning exercises, launch checklists, and editable planning resources.', ['Creators', 'ZIP', 'Launch']],
  ['saas', 'Course', 'Full-Stack SaaS Masterclass', 199, 'Technology & Development', '/product-templates/saas.svg', 'Go from idea to a complete SaaS product. Build a secure application, integrate billing, and prepare a confident production launch.', ['SaaS', 'Development', 'Video']],
  ['marketing', 'Course', 'Growth Marketing Academy', 199, 'Marketing & Growth', '/product-templates/marketing.svg', 'Create a measurable marketing system, from audience research and messaging to acquisition experiments and campaign optimization.', ['Marketing', 'Analytics', 'Video']],
];
export const productTemplates: ProductTemplate[] = definitions.map(([id, type, name, amount, industry, image, description, tags]) => {
  const config = defaultConfig(type);
  Object.assign(config, { currency: 'USD', amount, shippingRequired: false, students: [], orders: [], lessonViews: {} });
  const experience = config.experience!;
  Object.assign(experience, { shortDescription: description, tags, category: industry, oneTimeAmount: amount,
    instructor: { name: 'Samir Morgan', bio: 'Business strategist and product educator helping founders turn ideas into sustainable businesses.', image: '/dashboard/product-coaching.png' } });
  let features: string[];
  if (type === 'Service') {
    Object.assign(config, { duration: 60, bookingSlots: ['Mon 10:00', 'Tue 14:00', 'Thu 11:00'], bufferBefore: 15, bufferAfter: 15, cancellationHours: 24,
      fulfillment: 'Complete your goals questionnaire before the session. Choose a time on the connected calendar after payment. Your provider sends a private video call link and a written action plan.',
      cancellationPolicy: 'Reschedule at least 24 hours before your session.' });
    Object.assign(experience, { serviceMode: 'Online', location: 'Video Call', provider: 'Samir Morgan' });
    config.automations.calendarInvite = true;
    features = ['60-minute private video call', 'Samir Morgan · Strategy coach', 'Goal assessment & action plan', '15-minute scheduling buffers'];
  } else if (type === 'Digital Product') {
    config.assets = [{ name: 'Growth playbook · PDF demo', url: '/product-templates/growth-playbook-demo.pdf', mime: 'application/pdf' }, { name: 'Launch resources · ZIP demo', url: '/product-templates/launch-resources-demo.zip', mime: 'application/zip' }];
    Object.assign(experience, { directDownload: true, requireLogin: true, fileType: 'Mixed', accessRule: 'Immediately after payment' });
    config.automations.fileDelivery = true;
    features = ['PDF guide & ZIP resource pack', 'Instant post-purchase downloads', 'Lifetime access', 'Practical implementation worksheets'];
  } else {
    const modules = id === 'saas'
      ? [['SaaS Foundations', 'Define your product & architecture', 'Product requirements guide', 'Worksheet: validate your idea'], ['Build Your Application', 'Authentication, data & APIs', 'Implementation reference', 'Worksheet: design your data model'], ['Billing & Launch', 'Payments, deployment & observability', 'Production launch checklist', 'Worksheet: your launch roadmap']]
      : [['Audience & Positioning', 'Find your ideal customer', 'Audience research guide', 'Worksheet: positioning canvas'], ['Acquisition Systems', 'Build a repeatable acquisition funnel', 'Campaign planning guide', 'Worksheet: campaign brief'], ['Measure & Optimize', 'Analytics and experimentation', 'Experiment design guide', 'Worksheet: growth roadmap']];
    config.modules = modules.map(([title, ...lessons], index) => ({ id: `${id}-module-${index}`, title, lessons: lessons.map((title, lesson): Lesson => ({ id: `${id}-lesson-${index}-${lesson}`, title, kind: lesson === 0 ? 'Video' : 'PDF', duration: lesson === 0 ? '25 min' : '10 min', url: lesson === 0 ? 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' : '/product-templates/growth-playbook-demo.pdf' })) }));
    Object.assign(experience, { planEnabled: true, installmentAmount: 75, estimatedDuration: '2 hr 15 min', courseLevel: 'All levels', requireLogin: true });
    features = ['3 modules · 9 structured lessons', 'Video, PDF & practical worksheets', 'Student progress tracking', '$199 once or 3 monthly payments of $75'];
  }
  experience.included = features.map((title, index) => ({ id: `${id}-included-${index}`, title, enabled: true }));
  return { id, category: type === 'Service' ? 'Services' : type === 'Course' ? 'Courses' : 'Digital Products', industry, tags, features,
    product: { ...newProduct(), id: `template-${id}`, name, type, tag: type, description, image, config, price: formatPrice(config) } };
});

export interface TemplateCalendar { id: string; slug?: string; archived?: boolean; hostName?: string; duration?: number; availability?: Array<{ day: number; enabled: boolean; start: string; end: string }> }
export function instantiateProductTemplate(template: ProductTemplate, origin: string, calendars: TemplateCalendar[] = []): Product {
  const product = structuredClone(template.product), id = `product-${crypto.randomUUID()}`;
  product.id = id;
  product.slug = `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${id.slice(8)}`;
  product.createdAt = new Date().toISOString();
  product.status = 'Draft'; product.sales = '0'; product.revenue = '$0';
  const config = product.config!;
  // Resolve bundled demo resources against the host; saved products require HTTP(S) delivery URLs.
  config.assets = config.assets.map(asset => ({ ...asset, url: new URL(asset.url, origin).href }));
  config.modules = config.modules.map(module => ({ ...module, id: crypto.randomUUID(), lessons: module.lessons.map(lesson => {
    const resource = lesson as Lesson;
    return { ...resource, id: crypto.randomUUID(), url: new URL(resource.url, origin).href };
  }) }));
  config.experience!.included = config.experience!.included.map(item => ({ ...item, id: crypto.randomUUID() }));
  if (product.type === 'Service') {
    const available = calendars.filter(calendar => !calendar.archived && (!calendar.duration || calendar.duration === config.duration));
    const calendar = available.find(calendar => calendar.hostName === 'Samir Morgan') ?? available[0];
    if (calendar) {
      config.calendarId = calendar.id;
      config.bookingUrl = new URL(`/book/${encodeURIComponent(calendar.slug || calendar.id)}`, origin).href;
      config.bookingSlots = (calendar.availability ?? []).filter(slot => slot.enabled).map(slot => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.day]} ${slot.start}–${slot.end}`);
    }
  }
  return product;
}

export function filterProductTemplates(category: string, industry: string, query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return productTemplates.filter(template => (category === 'All' || template.category === category) && (industry === 'All industries' || template.industry === industry)
    && words.every(word => `${template.product.name} ${template.product.description} ${template.category} ${template.industry} ${template.tags.join(' ')}`.toLowerCase().includes(word)));
}
