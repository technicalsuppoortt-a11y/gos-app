import { useTemplateCatalogState } from './templateCatalog';
import type { ManagedTemplate } from '../pages/admin/managed-template';
import type { PageTemplate } from '../pages/page-template-data';
export function pageCatalogTemplates(catalog: ManagedTemplate[]): PageTemplate[] {
  return catalog.filter(t => ['Funnels', 'Websites', 'Forms', 'Landing Pages'].includes(t.category)).map(t => {
    const page = t.builderDocument?.pages[0];
    return { ...t.pageTemplate, id: t.id, name: t.name, mode: t.category === 'Forms' ? 'form' : t.category === 'Funnels' ? 'funnel' : 'website', industry: t.industry, goal: t.goal,
      title: page?.headline || t.content.headline, body: page?.subheadline || t.description, cta: page?.cta || t.pageTemplate?.cta || 'Get started', color: t.color,
      image: t.pageTemplate?.image || page?.featuredImage || '', thumbnail: t.thumbnail || '', builderDocument: t.builderDocument } as PageTemplate;
  });
}
export function usePageTemplateCatalogState() { const state = useTemplateCatalogState(); return { ...state, templates: pageCatalogTemplates(state.templates) }; }
export function usePageTemplateCatalog(): PageTemplate[] { return usePageTemplateCatalogState().templates; }
