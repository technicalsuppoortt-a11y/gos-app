const ARABIC_DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * Normalizes English & Arabic search text so Arabic queries match across
 * alef variants (أ/إ/آ -> ا), taa marbuta (ة -> ه), alef maqsura (ى -> ي),
 * Arabic-Indic digits (٠-٩ -> 0-9), and tashkeel diacritics.
 */
export function normalizeSearchText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .toLowerCase()
    .replace(ARABIC_DIACRITICS_RE, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .trim();
}

export function matchesLocalizedSearch(query: string, fields: ReadonlyArray<unknown>): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = fields.map(normalizeSearchText).filter(Boolean).join(' ');
  return tokens.every(token => haystack.includes(token));
}
