const copyKeys = new Set([
  'name', 'headline', 'subheadline', 'seoTitle', 'seoDescription', 'cta', 'goal', 'audience', 'offer',
  'title', 'body', 'button', 'subtitle', 'description', 'alt', 'label', 'placeholder', 'helperText',
  'successMessage', 'errorMessage', 'items', 'steps', 'author', 'role', 'quote', 'period', 'features',
  'options', 'eyebrow', 'badge', 'text', 'caption', 'question', 'answer', 'specs', 'serviceType', 'timeSlots',
]);
// Legacy form field names also select the input type and submission key.
const jsonKeys = new Set(['customFields', 'testimonials', 'plans', 'questions', 'gosNestedArrayV1']);

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
  if (Object.hasOwn(dictionary, value)) return dictionary[value];
  return Object.hasOwn(dictionary, value.trim()) ? dictionary[value.trim()] : value;
}
