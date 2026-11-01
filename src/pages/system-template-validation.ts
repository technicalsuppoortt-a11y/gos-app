import { categories } from './system-template-data';
import { validateProduct } from './commerce/model';
import type { ManagedTemplate } from './admin/managed-template';
export function validateSystemTemplate(t: ManagedTemplate): string[] {
  const errors: string[] = [];
  if (!t.name.trim() || t.name.length > 180) errors.push('Enter a template name of at most 180 characters.');
  if (!categories.includes(t.category)) errors.push('Choose a supported template category.');
  if (!t.content || typeof t.content.headline !== 'string' || !Array.isArray(t.content.steps) || t.content.steps.some(step => typeof step !== 'string')) errors.push('Provide valid template content.');
  if (['Funnels', 'Websites', 'Forms', 'Landing Pages'].includes(t.category) && (!t.builderDocument?.pages?.length || t.builderDocument.pages.some(p => !p.id || !Array.isArray(p.sections)))) errors.push('Save at least one valid page in the page builder.');
  if (t.category === 'Booking Pages') {
    const p = t.bookingPage;
    if (!p?.name.trim() || !p.slug?.trim()) errors.push('Enter a booking title and booking URL.');
    if (!p?.durationOptions?.length || p.durationOptions.some(n => !Number.isFinite(n) || n < 1 || n > 1440)) errors.push('Booking durations must be between 1 and 1440 minutes.');
    if (!p?.locations?.length || p.locations.some(l => !l.label.trim())) errors.push('Add a named booking location.');
    if (p?.availability?.some(slot => slot.enabled && (!slot.start || !slot.end || slot.start >= slot.end))) errors.push('Availability must end after it starts.');
    if (p?.questions?.some(q => !q.label.trim() || ['radio', 'select'].includes(q.type) && !q.options.some(o => o.trim()))) errors.push('Give every booking question a label and options where required.');
  }
  if (t.category === 'Products') {
    if (!t.productTemplate?.product) errors.push('Configure a product.');
    else {
      const product = structuredClone(t.productTemplate.product);
      // Bundled resources stay portable in masters and are resolved by the existing installer.
      const absolute = (url: string) => /^\/(?!\/)/.test(url) ? new URL(url, 'https://templates.invalid').href : url;
      if (product.config) {
        product.config.assets = product.config.assets.map(asset => ({ ...asset, url: absolute(asset.url) }));
        product.config.modules = product.config.modules.map(module => ({ ...module, lessons: module.lessons.map(lesson => typeof lesson === 'string' ? lesson : { ...lesson, url: absolute(lesson.url) }) }));
      }
      errors.push(...validateProduct(product, false));
    }
  }
  if (t.category === 'CRM Pipelines') {
    const stages = t.pipelineTemplate?.stages || [];
    if (stages.length < 2 || stages.length > 10 || stages.some(s => !s.trim() || s.length > 40) || new Set(stages.map(s => s.trim().toLowerCase())).size !== stages.length) errors.push('Define 2–10 unique pipeline stages, each with 1–40 characters.');
  }
  return errors;
}
