import builtInContent from '../../../functions/seed-data/template-content-ar.json';
import type { BuilderDocument } from '../BuilderWorkspace';

/**
 * Arabic versions of the built-in (official) page templates.
 *
 * The super admin can store a dedicated Arabic design per template in Firestore (`builder_document_ar`).
 * Official templates that have not been given one yet fall back to the reviewed Arabic copy bundled in
 * `functions/seed-data/template-content-ar.json`, applied to the template's current English document so
 * the structure, images and links always stay identical between both languages.
 */
type Dictionary = Readonly<Record<string, string>>;
const dictionaries = builtInContent as Readonly<Record<string, Dictionary>>;

/** Keys whose values are identifiers, URLs, styles or logic values — never visible copy. */
const NON_TEXT_KEYS = new Set([
  'id', 'pageId', 'nextPage', 'destination', 'destinationType', 'path', 'status', 'type', 'goal', 'events', 'pagesFlow',
  'src', 'image', 'images', 'featuredImage', 'avatar', 'url', 'href', 'bookingUrl', 'mapUrl', 'icon', 'media',
  'columnLayout', 'gap', 'headingTag', 'header', 'footer', 'calendar', 'bookingMode', 'htmlClass', 'trackingId',
  'themeBackgroundId', 'themeCardBg', 'themeCardBorder', 'themeTextColor', 'backgroundColor', 'color', 'font', 'corners',
  'required', 'rating', 'highlighted', 'price', 'period',
]);
const SKIPPED_OBJECTS = new Set(['styles', 'theme', 'responsive', 'deviceStyles']);

export function builtInTemplateDictionary(template: { id: string; source?: string; ownerUid?: unknown }): Dictionary | undefined {
  if (template.source !== 'official' || template.ownerUid) return undefined;
  return Object.prototype.hasOwnProperty.call(dictionaries, template.id) ? dictionaries[template.id] : undefined;
}

export function translateTemplateText(value: string, dictionary: Dictionary): string {
  const exact = dictionary[value];
  if (exact !== undefined) return exact;
  const text = value.trim();
  const trimmed = text && text !== value ? dictionary[text] : undefined;
  return trimmed !== undefined ? value.replace(text, trimmed) : value;
}

function translateValue(value: unknown, dictionary: Dictionary, key = ''): unknown {
  if (typeof value === 'string') {
    if (NON_TEXT_KEYS.has(key) || !value.trim()) return value;
    const first = value.trimStart()[0];
    if (first === '[' || first === '{') {
      try { return JSON.stringify(translateValue(JSON.parse(value), dictionary, key)); }
      catch { /* Plain copy that happens to start with a bracket. */ }
    }
    return translateTemplateText(value, dictionary);
  }
  if (Array.isArray(value)) return NON_TEXT_KEYS.has(key) ? value : value.map(item => translateValue(item, dictionary, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, SKIPPED_OBJECTS.has(name) ? item : translateValue(item, dictionary, name)]));
  }
  return value;
}

const documentCache = new WeakMap<object, Map<string, BuilderDocument>>();

/** Arabic copy of `document` using the bundled dictionary for this official template (cached per document object). */
export function translateBuilderDocument(templateId: string, document: BuilderDocument, dictionary: Dictionary): BuilderDocument {
  let byTemplate = documentCache.get(document);
  if (!byTemplate) documentCache.set(document, byTemplate = new Map());
  let translated = byTemplate.get(templateId);
  if (!translated) byTemplate.set(templateId, translated = translateValue(document, dictionary) as BuilderDocument);
  return translated;
}

/** The built-in Arabic design for an official template, or undefined when none is available. */
export function builtInArabicDocument(template: { id: string; source?: string; ownerUid?: unknown; builderDocument?: BuilderDocument; pageTemplate?: { builderDocument?: BuilderDocument } }) {
  const dictionary = builtInTemplateDictionary(template);
  const document = template.builderDocument || template.pageTemplate?.builderDocument;
  return dictionary && document?.pages?.length ? translateBuilderDocument(template.id, document, dictionary) : undefined;
}
