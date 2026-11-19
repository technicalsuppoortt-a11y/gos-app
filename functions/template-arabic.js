const copyKeys = new Set([
  'name', 'headline', 'subheadline', 'seoTitle', 'seoDescription', 'cta', 'goal', 'audience', 'offer',
  'title', 'body', 'button', 'subtitle', 'description', 'alt', 'label', 'placeholder', 'helperText',
  'successMessage', 'errorMessage', 'items', 'steps', 'author', 'role', 'quote', 'period', 'features',
  'options', 'eyebrow', 'badge', 'text', 'caption', 'question', 'answer', 'specs', 'serviceType', 'timeSlots',
  'tag', 'secondaryButton', 'brandName', 'brandSlogan', 'calloutTitle', 'calloutBody', 'footerTitle', 'footerNote', 'phoneLabel',
]);
// Legacy form field names also select the input type and submission key.
const jsonKeys = new Set(['customFields', 'testimonials', 'plans', 'questions', 'cards', 'metrics', 'bullets', 'gosNestedArrayV1']);

function lookupPhrase(dictionary, raw) {
  if (Object.hasOwn(dictionary, raw)) return dictionary[raw];
  const trimmed = raw.trim();
  return Object.hasOwn(dictionary, trimmed) ? dictionary[trimmed] : undefined;
}

export function translateTemplateCopy(value, dictionary, key = '') {
  if (Array.isArray(value)) return value.map(item => translateTemplateCopy(item, dictionary, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, translateTemplateCopy(item, dictionary, field)]));
  }
  if (typeof value !== 'string') return value;
  if (jsonKeys.has(key)) {
    try {
      const items = JSON.parse(value);
      if (Array.isArray(items)) return JSON.stringify(translateTemplateCopy(items, dictionary));
    } catch { /* Keep legacy non-JSON values intact. */ }
  }
  if (!copyKeys.has(key)) return value;
  const exact = lookupPhrase(dictionary, value);
  if (exact !== undefined) return exact;
  if (value.includes('·') || value.includes('|')) {
    let hit = false;
    const translated = value.split('·').map(part => {
      const pExact = lookupPhrase(dictionary, part);
      if (pExact !== undefined) { hit = true; return pExact; }
      if (part.includes('|')) {
        return part.split('|').map(sub => {
          const sExact = lookupPhrase(dictionary, sub);
          if (sExact !== undefined) { hit = true; return sExact; }
          return sub.trim();
        }).join(' | ');
      }
      return part.trim();
    }).join(' · ');
    if (hit) return translated;
  }
  return value;
}
