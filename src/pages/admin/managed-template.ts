import builtInArabic from '../../../functions/seed-data/template-metadata-ar.json';
import builtInCopy from '../../../functions/seed-data/template-content-ar.json';
import { translateTemplateCopy } from '../../../functions/template-arabic.js';
import type { Template } from '../system-template-data';
import type { BuilderDocument } from '../BuilderWorkspace';
export type ManagedTemplate = Template & {
  design_en?: import('../page-template-data').TemplateDesignDocument;
  design_ar?: import('../page-template-data').TemplateDesignDocument | null;
  design?: import('../page-template-data').TemplateDesignDocument;
  active?: boolean; status?: 'Published' | 'Draft'; builderDocument?: BuilderDocument;
  assetType?: 'funnel' | 'website' | 'form' | 'booking' | 'product' | 'pipeline' | 'workspace';
  pageTemplate?: import('../page-template-data').PageTemplate;
  bookingPage?: import('../booking/model').BookingPage;
  productTemplate?: import('../commerce/productTemplates').ProductTemplate;
  pipelineTemplate?: { name: string; description: string; stages: string[] };
  automationTemplate?: import('../follow-up-workflow').Workflow;
  automation_template_ar?: ManagedTemplate['automationTemplate'];
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
  'Email/SMS/WhatsApp': 'البريد والرسائل وواتساب', 'AI Assistants': 'Ai Agent', 'AI Knowledge Packs': 'حزم المعرفة',
};

export function templateCategoryLabel(category: string, arabic: boolean) {
  return arabic ? arabicCategories[category] || category : category;
}

const builtInMetadata = builtInArabic as Record<string, { name: string; title_ar: string; description_ar: string }>;
const builtInDictionaries = builtInCopy as Record<string, Record<string, string>>;

function matchingPreset(template: ManagedTemplate) {
  const preset = template.source === 'official' && !('ownerUid' in template) ? builtInMetadata[template.id] : undefined;
  return preset?.name === (template.title_en || template.name) ? preset : undefined;
}

export function templateArabicMetadata(template: ManagedTemplate) {
  const preset = matchingPreset(template);
  return {
    title_ar: template.title_ar?.trim() || preset?.title_ar || '',
    description_ar: template.description_ar?.trim() || preset?.description_ar || '',
  };
}

export function templateArabicDesign(template: ManagedTemplate): BuilderDocument | undefined {
  if (template.builder_document_ar?.pages?.length) return template.builder_document_ar;
  const document = template.builderDocument || template.pageTemplate?.builderDocument;
  const dictionary = matchingPreset(template) && builtInDictionaries[template.id];
  return document?.pages?.length && dictionary ? translateTemplateCopy(document, dictionary) : undefined;
}

export function localizeManagedTemplate<T extends ManagedTemplate>(template: T, arabic: boolean): T & { categoryLabel: string } {
  const english = template.content_en || template.content;
  const alternate = arabic ? template.content_ar : undefined;
  const dictionary = arabic && matchingPreset(template) && builtInDictionaries[template.id];
  const fallback = dictionary ? translateTemplateCopy(english, dictionary) as Template['content'] : english;
  const content = { ...fallback, ...alternate, headline: alternate?.headline?.trim() || fallback.headline, steps: alternate?.steps?.length ? alternate.steps : fallback.steps, settings: { ...english.settings, ...alternate?.settings } };
  const arabicMetadata = arabic && templateArabicMetadata(template);
  const name = (arabicMetadata && arabicMetadata.title_ar) || template.title_en || template.name;
  const description = (arabicMetadata && arabicMetadata.description_ar) || template.description_en || template.description;
  const bookingPage = (arabic && template.booking_page_ar) || template.bookingPage;
  const productTemplate = (arabic && template.product_template_ar) || template.productTemplate;
  const pipelineTemplate = (arabic && template.pipeline_template_ar) || template.pipelineTemplate;
  return {
    ...template, name, description,
    automationTemplate: (arabic && template.automation_template_ar) || template.automationTemplate,
    design: arabic && template.design_ar === null ? undefined : (arabic && template.design_ar?.html ? template.design_ar : template.design_en),
    categoryLabel: (arabic ? template.category_ar : template.category_en) || templateCategoryLabel(template.category, arabic),
    tags: (arabic && template.tags_ar?.length ? template.tags_ar : template.tags_en) || template.tags,
    content,
    builderDocument: (arabic && templateArabicDesign(template)) || template.builderDocument,
    bookingPage: bookingPage && { ...bookingPage, name, description },
    productTemplate: productTemplate && { ...productTemplate, product: { ...productTemplate.product, name, description } },
    pipelineTemplate: pipelineTemplate && { ...pipelineTemplate, name, description },
  };
}
