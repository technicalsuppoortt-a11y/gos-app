const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
function compile(file, require) {
  const context = { exports: {}, require, URL, Intl, crypto: webcrypto, structuredClone };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/pages/commerce/${file}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports;
}
const model = compile('model');
const { productTemplates, instantiateProductTemplate, filterProductTemplates } = compile('productTemplates', () => model);
test('all six templates produce valid independent products with unique IDs, slugs and resources', () => {
  assert.equal(productTemplates.length, 6);
  for (const template of productTemplates) {
    const first = instantiateProductTemplate(template, 'https://studio.test');
    const second = instantiateProductTemplate(template, 'https://studio.test');
    assert.equal(model.validateProduct(first, true).length, 0);
    assert.notEqual(first.id, second.id); assert.notEqual(first.slug, second.slug);
    assert.equal(first.status, 'Draft'); assert.equal(first.config.currency, 'USD');
    assert.equal(first.config.students.length, 0);
    first.config.experience.included[0].title = 'Edited';
    assert.notEqual(template.product.config.experience.included[0].title, 'Edited');
    if (first.type === 'Course') {
      assert.equal(first.config.modules.length, 3);
      assert.equal(first.config.experience.installmentAmount, 75);
      assert.equal(first.config.experience.planEnabled, true);
      assert.notEqual(first.config.modules[0].lessons[0].id, second.config.modules[0].lessons[0].id);
    }
    if (first.type === 'Digital Product') for (const asset of first.config.assets) {
      assert.ok(fs.existsSync(`public${new URL(asset.url).pathname}`));
    }
  }
});
test('category, niche and multiword tag searches compose and support empty results', () => {
  assert.equal(filterProductTemplates('Services', 'All industries', '').length, 2);
  assert.equal(filterProductTemplates('Courses', 'Marketing & Growth', 'analytics video').length, 1);
  assert.equal(filterProductTemplates('All', 'All industries', '  PDF growth ').length, 1);
  assert.equal(filterProductTemplates('Services', 'Technology & Development', '').length, 0);
});
test('service copies connect to compatible live calendars without fabricating connections', () => {
  const template = productTemplates[0];
  const first = instantiateProductTemplate(template, 'https://studio.test', [{ id: 'archived', archived: true }, { id: 'samir', hostName: 'Samir Morgan', slug: 'strategy', duration: 60, availability: [{ day: 1, enabled: true, start: '09:00', end: '17:00' }] }]);
  assert.equal(first.config.calendarId, 'samir');
  assert.equal(first.config.bookingUrl, 'https://studio.test/book/strategy');
  assert.equal(first.config.bookingSlots[0], 'Mon 09:00–17:00');
  assert.equal(instantiateProductTemplate(template, 'https://studio.test').config.calendarId, undefined);
});
