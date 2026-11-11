import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadTemplateSource } from '../scripts/build-system-template-seed.mjs';
const catalog = JSON.parse(fs.readFileSync(new URL('../functions/seed-data/system-templates.json', import.meta.url), 'utf8'));
const { validateSystemTemplate } = loadTemplateSource('src/pages/system-template-validation.ts');
const { createPageAsset } = loadTemplateSource('src/pages/page-templates.ts');
const { createBookingTemplate } = loadTemplateSource('src/pages/booking/template-presets.ts');
const { instantiateProductTemplate } = loadTemplateSource('src/pages/commerce/productTemplates.ts');
const { templateIsActive } = loadTemplateSource('src/pages/admin/managed-template.ts');
test('migration contains every native preset in all eleven categories and valid asset schemas', () => {
  assert.equal(catalog.length, 51); assert.equal(new Set(catalog.map(t => t.id)).size, 51);
  assert.equal(new Set(catalog.map(t => t.category)).size, 11);
  for (const t of catalog) assert.equal(validateSystemTemplate(t).length, 0, `${t.id}: ${validateSystemTemplate(t).join(' ')}`);
  assert.equal(catalog.filter(t => t.category === 'Websites').length, 3);
  assert.equal(catalog.filter(t => t.category === 'Funnels').length, 3);
  assert.equal(catalog.filter(t => t.category === 'Forms').length, 3);
  assert.equal(catalog.filter(t => t.category === 'Booking Pages').length, 3);
  assert.equal(catalog.filter(t => t.category === 'Products').length, 16);
});
test('managed forms use the existing page installer and retain independent editable form configurations', () => {
  const master = catalog.find(t => t.category === 'Forms' && t.pageTemplate.fields?.length);
  const before = JSON.stringify(master);
  const template = { ...master.pageTemplate, builderDocument: master.builderDocument };
  const a = createPageAsset('form', 'Tenant A form', template), b = createPageAsset('form', 'Tenant B form', template);
  assert.equal(a.formAsset, true); assert.equal(a.document.funnel.status, 'Draft'); assert.notEqual(a.id, b.id);
  a.document.pages[0].sections[0].content.title = 'Tenant edit';
  assert.notEqual(a.document.pages[0].sections[0].content.title, b.document.pages[0].sections[0].content.title);
  assert.equal(JSON.stringify(master), before);
});
test('booking installs preserve questions, locations and availability while replacing identity and routing', () => {
  const master = catalog.find(t => t.category === 'Booking Pages');
  const before = JSON.stringify(master);
  const preset = { key: master.id, name: master.name, bookingPage: { ...master.bookingPage, crmRouting: { pipelineId: 'another-tenant' } } };
  const a = createBookingTemplate(preset), b = createBookingTemplate(preset);
  assert.notEqual(a.id, b.id); assert.notEqual(a.slug, b.slug); assert.equal(a.crmRouting, undefined);
  assert.equal(a.questions.length, master.bookingPage.questions.length);
  assert.equal(JSON.stringify(a.availability), JSON.stringify(master.bookingPage.availability));
  assert.equal(JSON.stringify(master), before);
});
test('product installs validate, resolve portable resources and cannot carry tenant-specific relationships', () => {
  for (const master of catalog.filter(t => t.category === 'Products')) {
    const before = JSON.stringify(master);
    const product = instantiateProductTemplate(master.productTemplate, 'https://tenant.example', []);
    assert.equal(product.status, 'Draft'); assert.equal(product.config.calendarId, undefined); assert.equal(product.config.orders.length, 0);
    assert.equal(product.config.crmRouting, undefined); assert.equal(product.config.experience.upsellId, '');
    assert.ok(product.config.assets.every(asset => /^https:\/\//.test(asset.url)));
    assert.equal(JSON.stringify(master), before);
  }
});
test('publication changes govern visibility without reintroducing deleted static defaults', () => {
  const master = catalog[0];
  assert.equal(templateIsActive({ ...master, active: false }), false);
  assert.equal(templateIsActive({ ...master, status: 'Draft' }), false);
  const adapter = fs.readFileSync(new URL('../src/backend/pageTemplateCatalog.ts', import.meta.url), 'utf8');
  assert.equal(adapter.includes('publishedPageTemplates'), false);
  assert.equal(adapter.includes('pageTemplates,'), false);
});
