import { useTemplateCatalogState, type TemplateSource } from './templateCatalog';
import type { ManagedTemplate } from '../pages/admin/managed-template';
import type { PageTemplate } from '../pages/page-template-data';

const OFFICIAL_PAGE_CATEGORIES = new Set(['Funnels', 'Websites', 'Forms']);

const CURATED_FUNNEL_ORDER = [
  'upklick-funnel-business-development',
  'upklick-funnel-software-platform',
  'upklick-funnel-project-management-ai',
  'upklick-funnel-b2b-saas',
  'upklick-funnel-medical-solution',
  'upklick-funnel-product-development',
  'upklick-funnel-coaching-collective',
  'upklick-funnel-flagship-sell',
  'upklick-funnel-flagship-audience',
];

export function pageCatalogTemplates(catalog: (ManagedTemplate & { categoryLabel?: string; previewSource?: TemplateSource })[]): PageTemplate[] {
  const seen = new Set<string>();
  const mapped = catalog
    .filter(t => {
      if (!OFFICIAL_PAGE_CATEGORIES.has(t.category)) return false;
      const dedupeKey = `${t.category}:${(t.title_en || t.name).trim().toLowerCase()}`;
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
        previewSource: t.previewSource,
        design: t.design,
        name: t.name,
        description: t.description,
        categoryLabel: t.categoryLabel,
        tags: t.tags,
        popularity: t.popularity ?? t.pageTemplate?.popularity,
        mode: t.category === 'Forms' ? 'form' : t.category === 'Funnels' ? 'funnel' : 'website',
        industry: t.industry || t.pageTemplate?.industry || 'Professional Services',
        goal: t.goal || t.pageTemplate?.goal || 'Lead Generation',
        title: page?.headline || t.content.headline || t.pageTemplate?.title || t.name,
        body: page?.subheadline || t.description || t.pageTemplate?.body || '',
        cta: page?.cta || t.pageTemplate?.cta || 'Get started',
        color: t.color || t.pageTemplate?.color || '#7C3AED',
        image: t.pageTemplate?.image || page?.featuredImage || '',
        thumbnail: t.thumbnail ?? t.pageTemplate?.thumbnail ?? '',
        useThumbnail: t.useThumbnail,
        fields: t.pageTemplate?.fields,
        backgroundPreset: t.pageTemplate?.backgroundPreset,
        backgroundColor: t.pageTemplate?.backgroundColor,
        builderDocument,
      } as PageTemplate;
    });

  return mapped.sort((a, b) => {
    if (a.mode !== 'funnel' || b.mode !== 'funnel') return 0;
    const ai = CURATED_FUNNEL_ORDER.indexOf(a.id);
    const bi = CURATED_FUNNEL_ORDER.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return -1;
    if (bi === -1) return 1;
    return ai - bi;
  });
}

export function usePageTemplateCatalogState() {
  const state = useTemplateCatalogState();
  return { ...state, templates: pageCatalogTemplates(state.templates) };
}

export function usePageTemplateCatalog(): PageTemplate[] {
  return usePageTemplateCatalogState().templates;
}
