import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const catalogAr = JSON.parse(fs.readFileSync('src/i18n/locales/display-ar.json', 'utf8'));
const patternsAr = JSON.parse(fs.readFileSync('src/i18n/locales/patterns-ar.json', 'utf8'));
const catalogNl = JSON.parse(fs.readFileSync('src/i18n/locales/display-nl.json', 'utf8'));
const patternsNl = JSON.parse(fs.readFileSync('src/i18n/locales/patterns-nl.json', 'utf8'));
const catalogDe = JSON.parse(fs.readFileSync('src/i18n/locales/display-de.json', 'utf8'));
const patternsDe = JSON.parse(fs.readFileSync('src/i18n/locales/patterns-de.json', 'utf8'));

const rawTranslate = fs
  .readFileSync('src/i18n/translate.ts', 'utf8')
  .replace("import catalogAr from './locales/display-ar.json';", `const catalogAr = ${JSON.stringify(catalogAr)};`)
  .replace("import patternsAr from './locales/patterns-ar.json';", `const patternsAr = ${JSON.stringify(patternsAr)};`)
  .replace("import catalogNl from './locales/display-nl.json';", `const catalogNl = ${JSON.stringify(catalogNl)};`)
  .replace("import patternsNl from './locales/patterns-nl.json';", `const patternsNl = ${JSON.stringify(patternsNl)};`)
  .replace("import catalogDe from './locales/display-de.json';", `const catalogDe = ${JSON.stringify(catalogDe)};`)
  .replace("import patternsDe from './locales/patterns-de.json';", `const patternsDe = ${JSON.stringify(patternsDe)};`);

const source = ts.transpile(rawTranslate, { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext });
const { resolveDisplayTranslation: tr } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const displaySource = fs.readFileSync('src/i18n/display.ts', 'utf8').replace(/^import .*;\r?\n/gm, '');
const isolated = ts.transpile(
  `const i18n={language:'en',resolvedLanguage:'en',on(){},off(){}}; const useSyncExternalStore=(_subscribe:any,read:any)=>read(); export const testLanguage=(language:string)=>{i18n.language=language; i18n.resolvedLanguage=language;};\n${source}\n${displaySource}`,
  { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
);
const display = await import('data:text/javascript;base64,' + Buffer.from(isolated).toString('base64'));

// Direction checks across all 4 supported locales
display.testLanguage('en');
assert.equal(display.uiDirection(), 'ltr');
assert.equal(display.translateText(' Save changes '), ' Save changes ', 'English copy and whitespace remain identical');

display.testLanguage('ar');
assert.equal(display.uiDirection(), 'rtl');
assert.equal(display.translateText(' Save changes '), ' حفظ التغييرات ');
assert.equal(display.translateText('Customer-authored content'), 'Customer-authored content');
assert.equal(display.formatDisplayMessage('Form "{{0}}" published!', 'Draft ٠١'), 'تم نشر النموذج «Draft ٠١»!');
assert.equal(display.formatDisplayMessage('Edit {{0}}', 'Draft'), 'تعديل Draft');
assert.equal(display.formatDisplayMessage('Edit {{0}}', 'مرحلة {{0}}'), 'تعديل مرحلة {{0}}');
assert.equal(display.localizeNode('AM'), 'AM', 'Personal initials remain intact');
assert.equal(display.translateText('AM'), 'ص', 'Time-period labels remain translatable');
const element = { type: 'input', props: { value: 'Draft', name: 'status', onChange: () => {} } };
assert.equal(display.localizeNode(element), element, 'Elements, field values and callbacks retain their identity');
assert.deepEqual(display.localizeNode(['Draft', 42, null]), ['مسودة', 42, null]);

// Dutch (nl) checks
display.testLanguage('nl');
assert.equal(display.uiDirection(), 'ltr');
assert.equal(display.formatDisplayMessage('Welcome back, {{0}}!', 'Salma'), 'Welkom terug, Salma!');
assert.equal(display.localizeNode('AM'), 'AM');

// German (de) checks
display.testLanguage('de');
assert.equal(display.uiDirection(), 'ltr');
assert.equal(display.formatDisplayMessage('Welcome back, {{0}}!', 'Salma'), 'Willkommen zurück, Salma!');
assert.equal(display.localizeNode('AM'), 'AM');

display.testLanguage('en');
assert.equal(display.translateText('Draft'), 'Draft', 'Switching back restores English');

// Arabic grammatical checks
assert.equal(tr('Funnel', 'ar'), 'الفانل');
assert.equal(tr('Booking', 'ar'), 'حجز المواعيد');
assert.equal(tr('Analytics', 'ar'), 'التحليلات');
assert.equal(tr('Draft', 'ar'), 'مسودة');
assert.equal(tr('DRAFT', 'ar'), 'مسودة');
assert.equal(tr('Add Lesson', 'ar'), 'إضافة درس');
assert.equal(tr('Delete Lesson?', 'ar'), 'حذف درس؟');
assert.equal(tr('Delete Customer supplied name?', 'ar'), 'حذف Customer supplied name؟');
assert.equal(tr('Showing 1–10 of 25', 'ar'), 'عرض 1–10 من 25');
assert.equal(tr('30 minutes', 'ar'), '30 دقيقة');
assert.equal(tr('12 min ago', 'ar'), 'قبل 12 دقيقة');
assert.equal(tr('Oct 14', 'ar'), '14 أكتوبر');
assert.equal(tr('Welcome back, Salma!', 'ar'), 'مرحبًا بعودتك، Salma!');
assert.equal(tr('Lesson 4 title', 'ar'), 'عنوان الدرس 4');
assert.equal(tr('Price (Optional)', 'ar'), 'السعر (اختياري)');

for (const loc of ['ar', 'nl', 'de']) {
  assert.equal(tr('SKU_CUSTOM_123', loc), undefined);
  assert.equal(tr('https://example.com', loc), undefined);
  assert.equal(tr('a.user@example.com', loc), undefined);
}

// Dutch & German grammatical & pattern checks
assert.equal(tr('Showing 1–10 of 25', 'nl'), '1–10 van 25 weergegeven');
assert.equal(tr('Showing 1–10 of 25', 'de'), '1–10 von 25 angezeigt');
assert.equal(tr('30 minutes', 'nl'), '30 minuten');
assert.equal(tr('30 minutes', 'de'), '30 Minuten');
assert.equal(tr('12 min ago', 'nl'), '12 min geleden');
assert.equal(tr('12 min ago', 'de'), 'vor 12 Min.');
assert.equal(tr('Oct 14', 'nl'), '14 okt.');
assert.equal(tr('Oct 14', 'de'), '14. Okt.');
assert.equal(tr('Welcome back, Salma!', 'nl'), 'Welkom terug, Salma!');
assert.equal(tr('Welcome back, Salma!', 'de'), 'Willkommen zurück, Salma!');

const brandCopy = new Map([
  ['Upklick', 'Upklick'],
  ['AI Copilot', 'AI Agent'],
  ['AI Assistant ·', 'AI Agent ·'],
  ['AI Assistants', 'Ai Agent'],
]);
for (const [english, arabic] of Object.entries(catalogAr)) {
  assert.ok(english.trim());
  assert.ok(arabic.trim());
  if (brandCopy.get(english) !== arabic) assert.match(arabic, /[\u0600-\u06ff]/, `Arabic text missing: ${english}`);
  assert.ok(catalogNl[english]?.trim(), `Dutch translation missing for catalog key: ${english}`);
  assert.ok(catalogDe[english]?.trim(), `German translation missing for catalog key: ${english}`);
}

for (const [english, nlVal] of Object.entries(catalogNl)) {
  assert.ok(english.trim());
  assert.ok(nlVal.trim(), `Empty Dutch translation for: ${english}`);
}
for (const [english, deVal] of Object.entries(catalogDe)) {
  assert.ok(english.trim());
  assert.ok(deVal.trim(), `Empty German translation for: ${english}`);
}

assert.deepEqual(Object.keys(patternsAr).sort(), Object.keys(patternsNl).sort(), 'Dutch pattern catalog key parity');
assert.deepEqual(Object.keys(patternsAr).sort(), Object.keys(patternsDe).sort(), 'German pattern catalog key parity');

const en = JSON.parse(fs.readFileSync('src/i18n/locales/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('src/i18n/locales/ar.json', 'utf8'));
const nl = JSON.parse(fs.readFileSync('src/i18n/locales/nl.json', 'utf8'));
const de = JSON.parse(fs.readFileSync('src/i18n/locales/de.json', 'utf8'));
assert.deepEqual(Object.keys(en).sort(), Object.keys(ar).sort(), 'i18next ar resource key parity');
assert.deepEqual(Object.keys(en).sort(), Object.keys(nl).sort(), 'i18next nl resource key parity');
assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort(), 'i18next de resource key parity');

console.log(
  `Localization checks passed: ar=${Object.keys(catalogAr).length}, nl=${Object.keys(catalogNl).length}, de=${Object.keys(catalogDe).length} catalog entries, ${Object.keys(patternsAr).length} patterns, directionality, technical-value preservation and 4-locale resource parity.`,
);
