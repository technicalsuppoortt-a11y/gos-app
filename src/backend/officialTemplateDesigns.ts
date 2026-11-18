import { COVER_HTML } from '../../functions/seed-data/legacy-template-designs.mjs';
import builtInContentAr from '../../functions/seed-data/template-content-ar.json';
import builtInDesignCopyAr from '../../functions/seed-data/template-design-copy-ar.json';
import builtInMetadataAr from '../../functions/seed-data/template-metadata-ar.json';
import { translateTemplateCopy } from '../../functions/template-arabic.js';
import { MASTER_TEMPLATES } from '../pages/system-template-data';
import { pageTemplates, type TemplateDesignDocument } from '../pages/page-template-data';
import { initializeTemplateAsset } from '../pages/system-template-assets';
import type { ManagedTemplate } from '../pages/admin/managed-template';

const contentMap = builtInContentAr as Record<string, Record<string, string>>;
const copyMap = builtInDesignCopyAr as Record<string, Record<string, string>>;
const metaMap = builtInMetadataAr as Record<string, { name: string; title_ar: string; description_ar: string }>;

export const OFFICIAL_NINE_FUNNEL_IDS = [
  'upklick-funnel-business-development',
  'upklick-funnel-software-platform',
  'upklick-funnel-project-management-ai',
  'upklick-funnel-b2b-saas',
  'upklick-funnel-medical-solution',
  'upklick-funnel-product-development',
  'upklick-funnel-coaching-collective',
  'upklick-funnel-flagship-sell',
  'upklick-funnel-flagship-audience',
] as const;

export const LEGACY_DRAFT_FUNNEL_IDS = new Set([
  'ghl-funnel-mortgage-company',
  'ghl-funnel-brake-muffler',
  'ghl-funnel-locksmith',
]);

export function resolveOfficialTemplateDesigns(id: string): {
  design_en?: TemplateDesignDocument;
  design_ar?: TemplateDesignDocument;
} {
  const raw = COVER_HTML[id];
  if (!raw) return {};
  const match = raw.match(/<style>([\s\S]+)<\/style><\/head><body>([\s\S]+)<\/body>/);
  if (!match) return {};
  const [, css, html] = match;
  const dictionary = { ...(contentMap[id] || {}), ...(copyMap[id] || {}) };
  const localized = html.replace(/>([^<]+)</g, (original, text) => {
    const key = text.trim();
    if (!/[A-Za-z]/.test(key)) return original;
    if (!Object.prototype.hasOwnProperty.call(dictionary, key)) return original;
    return `>${text.replace(key, () => dictionary[key])}<`;
  });
  return {
    design_en: { html, css },
    design_ar: { html: localized, css },
  };
}

export function buildOfficialFunnelManagedTemplates(): ManagedTemplate[] {
  return OFFICIAL_NINE_FUNNEL_IDS.map(id => {
    const master = MASTER_TEMPLATES.find(t => t.id === id);
    const page = pageTemplates.find(p => p.id === id);
    if (!master || !page) {
      throw new Error(`Missing official funnel starter definition for ${id}`);
    }
    const arMeta = metaMap[id];
    const dict = contentMap[id];
    const steps = page.builderDocument?.pages?.length
      ? page.builderDocument.pages.map(p => p.name)
      : master.content.steps;
    const contentEn = {
      headline: page.title || master.content.headline,
      steps,
      settings: { enabled: true, language: 'en' },
    };
    const contentAr = dict
      ? {
          ...(translateTemplateCopy(contentEn, dict) as ManagedTemplate['content']),
          settings: { enabled: true, language: 'ar' },
        }
      : { headline: arMeta?.title_ar || '', steps: [], settings: { enabled: true, language: 'ar' } };
    const builderAr =
      dict && page.builderDocument?.pages?.length
        ? translateTemplateCopy(page.builderDocument, dict)
        : undefined;
    const tagsAr = dict
      ? (page.tags || master.tags).map(tag => dict[tag] || tag)
      : [];

    return initializeTemplateAsset({
      ...master,
      active: true,
      status: 'Published',
      source: 'official',
      schemaVersion: 2,
      industry: page.industry,
      goal: page.goal,
      color: page.color,
      popularity: page.popularity ?? master.popularity,
      tags: page.tags ?? master.tags,
      thumbnail: page.thumbnail ?? master.thumbnail,
      pageTemplate: page,
      builderDocument: page.builderDocument,
      content: contentEn,
      title_en: page.name,
      title_ar: arMeta?.title_ar || '',
      description_en: page.description || master.description,
      description_ar: arMeta?.description_ar || '',
      category_en: 'Funnels',
      category_ar: 'مسارات التحويل',
      tags_en: page.tags ?? master.tags,
      tags_ar: tagsAr,
      content_en: contentEn,
      content_ar: contentAr,
      builder_document_ar: builderAr,
      ...resolveOfficialTemplateDesigns(id),
    });
  });
}
