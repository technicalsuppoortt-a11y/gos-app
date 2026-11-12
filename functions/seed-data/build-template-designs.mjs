import fs from 'node:fs';
import { COVER_HTML } from './legacy-template-designs.mjs';

const read = file => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
const content = read('./template-content-ar.json');
const copy = read('./template-design-copy-ar.json');

export function buildTemplateDesigns(id) {
  if (!Object.hasOwn(COVER_HTML, id)) return {};
  const [, css, html] = COVER_HTML[id].match(/<style>([\s\S]+)<\/style><\/head><body>([\s\S]+)<\/body>/);
  const dictionary = { ...content[id], ...copy[id] };
  const localized = html.replace(/>([^<]+)</g, (original, text) => {
    const key = text.trim();
    if (!/[A-Za-z]/.test(key)) return original;
    if (!Object.hasOwn(dictionary, key)) throw new Error(`Missing gallery translation for ${id}: ${key}`);
    return `>${text.replace(key, () => dictionary[key])}<`;
  });
  return { design_en: { html, css }, design_ar: { html: localized, css } };
}
