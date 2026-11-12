import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixtures = name => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const server = await createServer({ plugins: [{ name: 'system-template-fixture', enforce: 'pre', resolveId(id, importer) {
  if (!importer?.includes('/src/') && !importer?.includes('\\src\\')) return;
  if (/\/(?:templateCatalog|adminManagement|templateOwnership)$/.test(id)) return fixtures('system-template-catalog.ts');
  if (/\/(?:backend\/)?workspace$/.test(id) && /backend\/workspace|\.\/workspace/.test(id)) return fixtures('system-template-workspace.tsx');
} }], cacheDir: 'node_modules/.vite-system-template-test', server: { host: '127.0.0.1', port: 0 } });
await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], firebaseRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/fonts.googleapis.com/**', route => route.abort());
  await page.route('**/fonts.gstatic.com/**', route => route.abort());
  await page.route('**/images.unsplash.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#ede9fe"/></svg>' }));
  await page.route('**/firestore.googleapis.com/**', route => { firebaseRequests.push(route.request().method()); return route.abort(); });
  const base = `http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/system-template-migration.html`;
  await page.context().route(/\/(admin-preview|template-preview\/[^/?]+)(\?|$)/, async route => {
    await route.fulfill({ response: await route.fetch({ url: base }) });
  });
  const checkPreview = async (trigger, route) => {
    const [popup] = await Promise.all([page.waitForEvent('popup'), trigger.click()]);
    try {
      assert.match(popup.url(), route);
      await popup.locator('.template-preview-canvas').waitFor();
      for (const [label, width] of [['Mobile', 390], ['Tablet', 768], ['Desktop', 1440]]) {
        await popup.getByRole('button', { name: label + ' preview', exact: true }).click();
        await popup.waitForFunction(width => Math.round(document.querySelector('.template-preview-canvas').getBoundingClientRect().width) === width, width);
      }
      assert.equal(await popup.getByRole('dialog').count(), 0);
    } finally { await popup.close(); }
  };
  const open = async view => { await page.goto(`${base}?view=${view}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); };
  const choose = async (label, name) => { await page.getByRole('combobox', { name: label, exact: true }).click(); await page.getByRole('option', { name, exact: true }).click(); };
  await open('admin'); await page.locator('.alm-table').waitFor();
  await page.setViewportSize({ width: 1440, height: 500 });
  await page.getByRole('tab', { name: 'Websites', exact: true }).click();
  await page.locator('.alm-ghl-gallery').hover();
  await page.mouse.wheel(0, 1200);
  await page.waitForFunction(() => document.querySelector('.sa-shell').scrollTop > 0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.alm-ghl-card').first().hover();
  await checkPreview(page.locator('.alm-ghl-preview-pill').first(), /\/admin-preview\?template=/);
  await page.evaluate(() => window.__setTemplateLanguage('ar'));
  await page.getByText('موقع أعمال الهياكل والإنشاءات', { exact: true }).waitFor();
  await page.getByText('موقع لشركات الإنشاءات يعرض خدمات بناء الهياكل والخبرات السابقة ويستقبل طلبات عروض أسعار المشاريع.', { exact: true }).waitFor();
  await page.evaluate(() => window.__setTemplateLanguage('en'));
  assert.equal(await page.locator('.alm-category-tabs [role=tab]').count(), 8);
  for (const category of ['Websites', 'Funnels', 'Forms']) { await page.getByRole('tab', { name: category, exact: true }).click(); assert.equal(await page.locator('.alm-ghl-card').count(), 3); }
  for (const category of ['Booking Pages', 'CRM Pipelines', 'Products', 'Automations']) { await page.getByRole('tab', { name: category, exact: true }).click(); assert.ok(await page.locator('tbody tr').count() > 0); }
  await page.getByRole('tab', { name: 'All templates', exact: true }).click();
  for (const [category, name] of [['Booking Pages', 'Native booking'], ['Products', 'Native course'], ['CRM Pipelines', 'Native pipeline'], ['Forms', 'Native form']]) {
    await page.getByRole('button', { name: 'Create template', exact: true }).click();
    await page.getByLabel('Name', { exact: true }).fill(name);
    await choose('Category', category);
    if (category === 'Booking Pages') {
      await page.getByLabel('Booking page title', { exact: true }).fill('Native booking updated');
      await page.waitForFunction(() => document.querySelector('input[aria-label="Search records"]') !== null);
    }
    if (category === 'Products') {
      await choose('Product type', 'Course');
      await page.locator('.alm-native-config input[maxlength="140"]').fill(name);
      await page.locator('.alm-native-config .alm-resource-tabs').getByRole('button', { name: 'pricing', exact: true }).click();
      await page.getByLabel('Price *', { exact: true }).fill('125');
      await page.locator('.alm-native-config .alm-resource-tabs').getByRole('button', { name: 'delivery', exact: true }).click();
      await page.getByRole('button', { name: 'Add module', exact: true }).click();
      await page.getByLabel('Module title', { exact: true }).fill('Foundations');
      await page.getByRole('button', { name: 'Add lesson', exact: true }).click();
      await page.getByLabel('Lesson title', { exact: true }).fill('Getting started');
    }
    if (category === 'CRM Pipelines') { await page.getByLabel('Stage 1 name').fill('Fresh inquiry'); }
    if (category === 'Forms') {
      await page.getByLabel('Arabic title', { exact: true }).fill('نموذج التواصل');
      await page.getByLabel('Arabic description', { exact: true }).fill('وصف النموذج');
      await page.getByLabel('Arabic tags (comma-separated)', { exact: true }).fill('تواصل، دعم');
      await page.getByLabel('Arabic steps (one per line)', { exact: true }).fill('ابدأ\nأرسل');
      await page.getByRole('button', { name: 'Open page builder', exact: true }).click();
      await page.getByLabel('Funnel name', { exact: true }).fill(name);
      await page.getByRole('button', { name: 'Use builder changes', exact: true }).click();
    }
    await page.getByRole('switch', { name: 'Active / Published', exact: true }).check();
    await page.getByRole('button', { name: 'Save template', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    const saved = await page.evaluate(name => window.__systemCatalog.rows().find(t => t.name === name), category === 'Booking Pages' ? 'Native booking updated' : name);
    assert.ok(saved, `${category} template persisted`);
    if (category === 'Products') { assert.equal(saved.productTemplate.product.config.amount, 125); assert.equal(saved.productTemplate.product.config.modules[0].title, 'Foundations'); }
    if (category === 'Booking Pages') { assert.equal(saved.bookingPage.name, 'Native booking updated'); assert.ok(saved.bookingPage.availability.length); }
    if (category === 'Forms') {
      assert.equal(saved.assetType, 'form');
      assert.equal(saved.title_en, name);
      assert.equal(saved.title_ar, 'نموذج التواصل');
      assert.equal(saved.description_ar, 'وصف النموذج');
      assert.deepEqual(saved.tags_ar, ['تواصل', 'دعم']);
      assert.deepEqual(saved.content_ar.steps, ['ابدأ', 'أرسل']);
    }
    if (category === 'CRM Pipelines') assert.equal(saved.pipelineTemplate.stages[0], 'Fresh inquiry');
  }
  assert.equal(await page.evaluate(() => (window.__workspaceWrites || []).length), 0, 'Admin template creation never persists tenant state');
  await open('pages'); await page.getByRole('tab', { name: 'Forms', exact: true }).click();
  await page.locator('.pf-template-card').first().waitFor();
  const formCount = await page.locator('.pf-template-card').count();
  const firstId = await page.locator('.pf-template-card').first().getAttribute('data-template-id');
  await page.evaluate(id => {
    window.__systemCatalog.translate(id, { title_ar: 'القالب العربي', description_ar: 'وصف القالب' });
    return window.__setTemplateLanguage('ar');
  }, firstId);
  await page.getByText('القالب العربي', { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 720 });
  const columns = () => page.locator('.pf-template-library').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
  assert.equal(await columns(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.setViewportSize({ width: 820, height: 780 });
  assert.equal(await columns(), 2);
  await page.evaluate(() => window.__setTemplateLanguage('en'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await checkPreview(page.locator('.pf-template-preview-action').first(), /\/template-preview\//);
  assert.equal(await page.evaluate(() => window.__installedPage), undefined);
  await page.evaluate(id => window.__systemCatalog.hide(id), firstId);
  assert.equal(await page.locator('.pf-template-card').count(), formCount - 1, 'Inactive records do not return through static defaults');
  await page.locator('.pf-template-card').first().click();
  assert.equal(await page.evaluate(() => window.__installedPage.formAsset), true);
  await open('booking'); await page.getByRole('button', { name: /Booking Presets/ }).click();
  await page.locator('.bk-template-card').first().waitFor();
  assert.equal(await page.locator('.bk-template-card').count(), 3);
  await page.getByRole('button', { name: 'Use template', exact: true }).first().click();
  await page.getByRole('heading', { name: 'Booking copy created', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(window.__templateWorkspace.get('gos.booking-links.v1')).length), 1);
  await open('products');
  const course = page.locator('.pt-card').filter({ has: page.getByRole('heading', { name: 'Full-Stack SaaS Masterclass', exact: true }) });
  await course.waitFor(); await course.getByRole('button', { name: 'Use Template', exact: true }).click();
  await page.getByRole('heading', { name: 'Product copy created', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(window.__templateWorkspace.get('gos-commerce-products-v1:fixture'))[0].status), 'Draft');
  await open('password');
  await page.getByRole('heading', { name: 'Change password', exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Purchase delivery' }).count(), 0);
  await page.getByLabel('New password', { exact: true }).fill('Long password 123!');
  await page.getByLabel('Confirm new password', { exact: true }).fill('Different password 456!');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await page.getByRole('alert').getByText('The passwords do not match.').waitFor();
  assert.deepEqual(firebaseRequests, []); assert.deepEqual(errors, []);
  console.log('Native template browser checks passed: 72-record admin catalog, booking/product/pipeline/form creation, dynamic publication, and independent user page/booking/product installation.');
} finally { await browser?.close(); await server.close(); }
