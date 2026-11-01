import { useTemplateCatalog, useTemplateCatalogState } from './templateCatalog';
import { initializeTemplateAsset } from '../pages/system-template-assets';
import type { BookingTemplatePreset } from '../pages/booking/template-presets';
import type { ProductTemplate } from '../pages/commerce/productTemplates';
export function useBookingTemplateCatalogState() {
  const state = useTemplateCatalogState();
  const templates: BookingTemplatePreset[] = state.templates.filter(t => t.category === 'Booking Pages').map(value => {
    const t = initializeTemplateAsset(value), page = t.bookingPage!;
    return { key: t.id, category: t.industry, name: t.name, description: t.description, image: page.image, duration: page.duration, location: page.location, color: page.color, questions: page.questions, bookingPage: page };
  });
  return { ...state, templates };
}
export function useBookingTemplateCatalog() { return useBookingTemplateCatalogState().templates; }
export function useProductTemplateCatalogState() {
  const state = useTemplateCatalogState();
  const templates: ProductTemplate[] = state.templates.filter(t => t.category === 'Products').map(value => {
    const t = initializeTemplateAsset(value);
    return { ...t.productTemplate!, id: t.id, industry: t.industry, tags: t.tags, product: { ...t.productTemplate!.product, name: t.name, description: t.description } };
  });
  return { ...state, templates };
}
export function useProductTemplateCatalog() { return useProductTemplateCatalogState().templates; }
export function usePipelineTemplateCatalog() {
  return useTemplateCatalog().filter(t => t.category === 'CRM Pipelines').map(value => {
    const t = initializeTemplateAsset(value);
    return { ...t.pipelineTemplate!, name: t.name, description: t.description };
  });
}
