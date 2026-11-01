import type { ManagedTemplate } from './admin/managed-template';
import { createPageAsset } from './page-templates';
import { blankPage, normalizeBookingPage, slugify } from './booking/model';
import { defaultConfig, formatPrice, hydrateProduct, newProduct } from './commerce/model';

// Native configurations use the same factories as ordinary creation. No persistence occurs here.
export function initializeTemplateAsset(template: ManagedTemplate): ManagedTemplate {
  const t = structuredClone(template);
  t.schemaVersion = 2;
  if (['Funnels', 'Websites', 'Forms', 'Landing Pages'].includes(t.category)) {
    const mode = t.category === 'Funnels' ? 'funnel' : t.category === 'Forms' ? 'form' : 'website';
    t.assetType = mode;
    t.pageTemplate ??= { id: t.id, mode, name: t.name, title: t.content.headline || t.name, body: t.description, cta: 'Get started', industry: t.industry, goal: t.goal, color: t.color, image: '' };
    t.builderDocument ??= createPageAsset(mode, t.name, t.pageTemplate).document;
  } else if (t.category === 'Booking Pages') {
    t.assetType = 'booking';
    t.bookingPage = normalizeBookingPage({ ...(t.bookingPage || blankPage()), slug: t.bookingPage?.slug || slugify(t.name), name: t.name, description: t.description });
  } else if (t.category === 'Products') {
    t.assetType = 'product';
    const base = hydrateProduct(t.productTemplate?.product || { ...newProduct(), name: t.name, description: t.description, config: defaultConfig('Digital Product') });
    base.name = t.name; base.description = t.description;
    base.price = formatPrice(base.config!);
    t.productTemplate = { id: t.id, category: base.type === 'Service' ? 'Services' : base.type === 'Course' ? 'Courses' : 'Digital Products', industry: t.industry, tags: t.tags, features: base.config?.experience?.included.map(i => i.title) || [], ...t.productTemplate, product: base };
  } else if (t.category === 'CRM Pipelines') {
    t.assetType = 'pipeline';
    t.pipelineTemplate ??= { name: t.name, description: t.description, stages: t.content.steps.length >= 2 ? [...t.content.steps] : ['New inquiry', 'Qualified', 'Won'] };
    t.pipelineTemplate.name = t.name; t.pipelineTemplate.description = t.description;
  } else t.assetType = 'workspace';
  return t;
}
