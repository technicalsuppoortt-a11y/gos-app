import builtInArabic from '../../../functions/seed-data/template-metadata-ar.json';
import { builtInArabicDocument, builtInTemplateDictionary, translateTemplateText } from './template-localization';
import type { Template } from '../system-template-data';
import type { BuilderDocument } from '../BuilderWorkspace';
import type { Asset } from '../asset-model';
export type ManagedTemplate = Template & {
  active?: boolean; status?: 'Published' | 'Draft'; builderDocument?: BuilderDocument;
  assetType?: 'funnel' | 'website' | 'form' | 'booking' | 'product' | 'pipeline' | 'workspace';
  pageTemplate?: import('../page-template-data').PageTemplate;
  bookingPage?: import('../booking/model').BookingPage;
  productTemplate?: import('../commerce/productTemplates').ProductTemplate;
  pipelineTemplate?: { name: string; description: string; stages: string[] };
  schemaVersion?: number;
  title_en?: string; title_ar?: string;
  description_en?: string; description_ar?: string;
  category_en?: string; category_ar?: string;
  tags_en?: string[]; tags_ar?: string[];
  content_en?: Template['content']; content_ar?: Partial<Template['content']>;
  builder_document_ar?: BuilderDocument;
  booking_page_ar?: ManagedTemplate['bookingPage'];
  product_template_ar?: ManagedTemplate['productTemplate'];
  pipeline_template_ar?: ManagedTemplate['pipelineTemplate'];
  /** Gallery card image shown to users; managed from the admin template editor. */
  thumbnail?: string;
};
export function templateIsActive(template: { active?: boolean; status?: string }) {
  return template.active !== false && (!template.status || template.status === 'Published');
}

const arabicCategories: Record<string, string> = {
  Funnels: 'مسارات التحويل', Websites: 'المواقع', Forms: 'النماذج', 'Landing Pages': 'صفحات الهبوط',
  'Booking Pages': 'صفحات الحجز', 'CRM Pipelines': 'مسارات المبيعات', Automations: 'الأتمتة', Products: 'المنتجات',
  'Email/SMS/WhatsApp': 'البريد والرسائل وواتساب', 'AI Assistants': 'مساعدو الذكاء الاصطناعي', 'AI Knowledge Packs': 'حزم المعرفة',
};

export function templateCategoryLabel(category: string, arabic: boolean) {
  return arabic ? arabicCategories[category] || category : category;
}

const builtInMetadata = builtInArabic as Record<string, { name: string; title_ar: string; description_ar: string }>;

export function templateArabicMetadata(template: ManagedTemplate) {
  const preset = template.source === 'official' && !('ownerUid' in template) ? builtInMetadata[template.id] : undefined;
  const matchesPreset = preset?.name === (template.title_en || template.name);
  return {
    title_ar: template.title_ar?.trim() || (matchesPreset ? preset.title_ar : ''),
    description_ar: template.description_ar?.trim() || (matchesPreset ? preset.description_ar : ''),
  };
}

export function localizeManagedTemplate<T extends ManagedTemplate>(template: T, arabic: boolean): T & { categoryLabel: string; contentLanguage: 'ar' | 'en' } {
  const english = template.content_en || template.content;
  const dictionary = arabic ? builtInTemplateDictionary(template) : undefined;
  // Saved Arabic content wins; official templates fall back to their bundled, reviewed Arabic copy.
  const alternate = arabic ? { ...(dictionary && english ? builtInArabicContent(english, dictionary) : {}), ...template.content_ar } : undefined;
  const content = { ...english, ...alternate, headline: alternate?.headline || english.headline, steps: alternate?.steps?.length ? alternate.steps : english.steps };
  const arabicMetadata = arabic && templateArabicMetadata(template);
  const name = (arabicMetadata && arabicMetadata.title_ar) || template.title_en || template.name;
  const description = (arabicMetadata && arabicMetadata.description_ar) || template.description_en || template.description;
  const bookingPage = (arabic && template.booking_page_ar) || template.bookingPage;
  const productTemplate = (arabic && template.product_template_ar) || template.productTemplate;
  const pipelineTemplate = (arabic && template.pipeline_template_ar) || template.pipelineTemplate;
  const arabicDocument = arabic ? template.builder_document_ar || builtInArabicDocument(template) : undefined;
  const arabicTags = arabic ? template.tags_ar?.length ? template.tags_ar : dictionary ? (template.tags_en || template.tags).map(tag => translateTemplateText(tag, dictionary)) : undefined : undefined;
  return {
    ...template, name, description,
    categoryLabel: (arabic ? template.category_ar : template.category_en) || templateCategoryLabel(template.category, arabic),
    tags: arabicTags || template.tags_en || template.tags,
    content,
    builderDocument: arabicDocument || template.builderDocument,
    // Direction/language of the copy inside the template, used by previews and gallery thumbnails.
    contentLanguage: arabicDocument || (!template.builderDocument && english?.settings?.language === 'ar') ? 'ar' : 'en',
    bookingPage: bookingPage && { ...bookingPage, name, description },
    productTemplate: productTemplate && { ...productTemplate, product: { ...productTemplate.product, name, description } },
    pipelineTemplate: pipelineTemplate && { ...pipelineTemplate, name, description },
  };
}

function builtInArabicContent(content: Template['content'], dictionary: Readonly<Record<string, string>>): Partial<Template['content']> {
  return {
    headline: translateTemplateText(content.headline || '', dictionary),
    steps: (content.steps || []).map(step => translateTemplateText(step, dictionary)),
    settings: { ...content.settings, language: 'ar' },
  };
}

/**
 * Arabic fields a super admin starts from when editing a template: the saved Arabic version, else the
 * bundled Arabic copy of an official template. Saving the editor persists them to Firestore.
 */
export function editableArabicFields(template: ManagedTemplate): Pick<ManagedTemplate, 'builder_document_ar' | 'content_ar' | 'tags_ar'> {
  const dictionary = builtInTemplateDictionary(template);
  const document = template.builder_document_ar || builtInArabicDocument(template);
  const english = template.content_en || template.content;
  return {
    builder_document_ar: document && structuredClone(document),
    content_ar: template.content_ar || (dictionary && english ? builtInArabicContent(english, dictionary) : undefined),
    tags_ar: template.tags_ar?.length ? template.tags_ar : dictionary ? (template.tags_en || template.tags).map(tag => translateTemplateText(tag, dictionary)) : template.tags_ar,
  };
}

/**
 * The renderable page asset for a (localized) managed template. Shared by the full-page preview and the
 * gallery card artwork so both always show exactly the same template document.
 */
export function managedTemplateAsset(template: ManagedTemplate): Asset | undefined {
  const document = template.builderDocument || template.pageTemplate?.builderDocument;
  if (!document?.pages?.length) return undefined;
  return {
    id: template.id, name: template.name, document,
    kind: template.category === 'Funnels' ? 'funnel' : 'website',
    formAsset: template.category === 'Forms',
    image: template.pageTemplate?.image || document.pages[0]?.featuredImage || '',
    domain: '', description: template.description || '', updated: '',
    settings: { color: document.theme?.color || '#7C3AED', navigation: document.pages.map(page => page.name).join(', '), seo: template.name },
  };
}
