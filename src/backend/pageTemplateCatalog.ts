import { useTemplateCatalogState } from './templateCatalog';
import type { ManagedTemplate } from '../pages/admin/managed-template';
import type { PageTemplate } from '../pages/page-template-data';

const OFFICIAL_PAGE_CATEGORIES = new Set(['Funnels', 'Websites', 'Forms']);

export function pageCatalogTemplates(catalog: ManagedTemplate[]): PageTemplate[] {
  const seen = new Set<string>();
  return catalog
    .filter(t => {
      if (!OFFICIAL_PAGE_CATEGORIES.has(t.category)) return false;
      const dedupeKey = `${t.category}:${t.name.trim().toLowerCase()}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    })
    .map(t => {
      const builderDocument = t.builderDocument || t.pageTemplate?.builderDocument;
      const page = builderDocument?.pages[0];
      return {
        ...t.pageTemplate,
        id: t.id,
        name: t.name,
        mode: t.category === 'Forms' ? 'form' : t.category === 'Funnels' ? 'funnel' : 'website',
        industry: t.industry || t.pageTemplate?.industry || 'Professional Services',
        goal: t.goal || t.pageTemplate?.goal || 'Lead Generation',
        title: page?.headline || t.content.headline || t.pageTemplate?.title || t.name,
        body: page?.subheadline || t.description || t.pageTemplate?.body || '',
        cta: page?.cta || t.pageTemplate?.cta || 'Get started',
        color: t.color || t.pageTemplate?.color || '#7C3AED',
        image: t.pageTemplate?.image || page?.featuredImage || '',
        thumbnail: t.thumbnail || t.pageTemplate?.thumbnail || '',
        fields: t.pageTemplate?.fields,
        backgroundPreset: t.pageTemplate?.backgroundPreset,
        backgroundColor: t.pageTemplate?.backgroundColor,
        builderDocument,
      } as PageTemplate;
    });
}

export function usePageTemplateCatalogState() {
  const state = useTemplateCatalogState();
  return { ...state, templates: pageCatalogTemplates(state.templates) };
}

export function usePageTemplateCatalog(): PageTemplate[] {
  return usePageTemplateCatalogState().templates;
}
