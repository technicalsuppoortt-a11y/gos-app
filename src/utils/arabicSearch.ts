const ARABIC_DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const COMBINING_MARKS_RE = /[\u0300-\u036F]/g;

/**
 * Normalizes multilingual search text (Arabic, English, Dutch, German) so queries match across
 * Arabic alef/taa/yaa variants, Arabic-Indic digits, German ß -> ss, and Latin diacritics (ä/ö/ü/ë/é…).
 */
export function normalizeSearchText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(COMBINING_MARKS_RE, '')
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
