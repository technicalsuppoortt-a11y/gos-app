import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { verifyWorkspaceTabs } from './commerce-tabs-checks.mjs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixture = new URL('./fixtures/commerce-save-workspace.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-commerce-save', optimizeDeps: { entries: ['tests/fixtures/commerce-save.html'] }, plugins: [react(), { name: 'commerce-test-workspace', enforce: 'pre', resolveId(source) { if (/backend\/workspace$/.test(source)) return fixture; }, transform(source, id) { if (id.replaceAll('\\', '/').endsWith('/src/backend/files.ts')) return source.replace("from './firebase'", "from '/tests/fixtures/commerce-upload-transport.ts'").replace("from 'firebase/storage'", "from '/tests/fixtures/commerce-upload-transport.ts'"); } }], server: { host: '127.0.0.1', port: 0 } });
await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/commerce-save.html`);
  const navigate = url => page.evaluate(url => window.__router.navigate(url), url);
  if (!process.argv.includes('--tabs-only')) {
  await page.getByRole('button', { name: /Payment providers/ }).click();
  const paypal = page.getByRole('switch', { name: 'PayPal', exact: true });
  await paypal.uncheck();
  assert.equal(await page.evaluate(() => window.__writes.length), 0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: /Payment providers/ }).click(); assert.equal(await paypal.isChecked(), true);
  await paypal.uncheck();
  const save = page.getByRole('button', { name: 'Save Changes', exact: true });
  const background = await save.evaluate(button => getComputedStyle(button).backgroundColor); assert.notEqual(background, 'rgba(0, 0, 0, 0)');
  await save.click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => window.__writes.length), 1);
  await page.getByRole('button', { name: /Payment providers/ }).click(); assert.equal(await paypal.isChecked(), false);
  await page.evaluate(() => { window.__failSave = true; Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw Error('Storage blocked'); } }); });
  await paypal.check(); await save.click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: /Payment providers/ }).click(); assert.equal(await paypal.isChecked(), true);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await page.evaluate(() => { window.__failSave = false; });
  await navigate('/dashboard/products-payments?tab=orders');
  await page.getByRole('heading', { name: 'No Orders Yet', exact: true }).waitFor();
  await page.locator('.pp-secondary-heading').getByRole('button', { name: 'Create Order', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('.pp-records-empty').getByRole('button', { name: 'Create Order', exact: true }).click();
  await page.getByLabel('Customer name', { exact: true }).fill('New buyer'); await page.getByLabel('Email', { exact: true }).fill('buyer@example.com');
  await page.getByLabel('Order product', { exact: true }).click(); await page.getByRole('option', { name: 'QA Service', exact: true }).click();
  await save.click(); await page.getByRole('dialog').waitFor({ state: 'hidden' }); await page.getByText('New buyer', { exact: true }).waitFor();
  await navigate('/dashboard/products-payments?tab=customers'); await page.getByRole('heading', { name: 'No Customers Yet', exact: true }).waitFor(); await page.locator('.pp-records-empty').getByRole('button', { name: 'Add Customer', exact: true }).click();
  await page.getByLabel('Customer name', { exact: true }).fill('New customer'); await page.getByLabel('Email', { exact: true }).fill('customer@example.com');
  await save.click(); await page.getByRole('dialog').waitFor({ state: 'hidden' }); await page.getByText('New customer', { exact: true }).waitFor();
  await navigate('/dashboard/products-payments?tab=payments'); await page.getByRole('heading', { name: 'No Payments Yet', exact: true }).waitFor(); await page.locator('.pp-records-empty').getByRole('button', { name: 'Add Payment Method', exact: true }).click();
  await save.click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await navigate('/dashboard/products-payments?tab=discounts'); await page.getByText('No discounts match your filters.', { exact: false }).waitFor();
  const scroll = await page.locator('.dc-table-wrap').evaluate(element => ({ height: element.clientHeight, scroll: element.scrollHeight }));
  assert.ok(scroll.scroll <= scroll.height + 1, JSON.stringify(scroll));
  const outerScroll = await page.locator('.pp-secondary-view').evaluate(element => ({ height: element.clientHeight, scroll: element.scrollHeight }));
  assert.ok(outerScroll.scroll <= outerScroll.height + 1, JSON.stringify(outerScroll));
  for (const type of ['course', 'digital', 'service']) {
    await navigate(`/dashboard/products-payments/products/new?type=${type}`);
    await page.getByRole('heading', { name: /Create/ }).first().waitFor();
    const writes = await page.evaluate(() => window.__writes.length);
    const title = page.locator('input').filter({ visible: true }).first();
    assert.equal(await title.inputValue(), '');
    // Main title fields are empty and no preview write runs while a draft is edited.
    assert.equal(await page.locator('input').evaluateAll(inputs => inputs.some(input => input.value.includes('Introduction'))), false);
    await title.fill('Unsaved title'); await page.waitForTimeout(850);
    assert.equal(await page.evaluate(() => window.__writes.length), writes);
    await page.getByRole('button', { name: 'Use Template', exact: true }).click();
    const templateName = type === 'course' ? 'Masterclass' : type === 'digital' ? 'E-Book' : '1-on-1 Coaching';
    const expectedTitle = type === 'course' ? 'Creator Launch Masterclass' : type === 'digital' ? 'The Creator’s Practical E-Book' : '1-on-1 Coaching Session';
    await page.getByRole('button', { name: `Use ${templateName} template`, exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await title.inputValue(), expectedTitle);
    assert.equal(await page.evaluate(() => window.__writes.length), writes);
    if (type === 'course') {
      await navigate('/dashboard/products-payments/products/new?type=course&tab=content');
      assert.equal(await page.locator('.course-module').count(), 3);
      await page.getByRole('button', { name: 'Add Lesson', exact: true }).first().click();
      await page.getByLabel('Lesson title', { exact: true }).fill('Uploaded lesson');
      await page.getByLabel('Attach PDF / Video', { exact: true }).setInputFiles({ name: 'qa-video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('QA video') });
      await page.getByText('qa-video.mp4', { exact: true }).waitFor().catch(async error => { console.log('Lesson upload dialog:', await page.getByRole('dialog').innerText()); throw error; });
      await page.getByRole('button', { name: 'Save Lesson', exact: true }).click();
      await page.getByText('Local attachments are available only in this browser session.', { exact: false }).waitFor();
    } else if (type === 'digital') {
      await page.locator('input[type="file"][accept*=".zip"]').setInputFiles({ name: 'qa-guide.pdf', mimeType: 'application/pdf', buffer: Buffer.from('QA PDF') });
      await page.locator('input[value="qa-guide.pdf"]').waitFor();
      await page.getByText('Local attachments are available only in this browser session.', { exact: false }).waitFor();
    }
    assert.equal(await page.evaluate(() => window.__writes.length), writes);
    // Discard through the editor's own navigation guard before checking the next type.
    await page.reload();
  }
  }
  await verifyWorkspaceTabs(page);
  assert.deepEqual(errors, []); console.log('Commerce browser checks passed: all product types, cross-tab draft preservation, explicit/failed saves, real order joins, enrollment analytics, advanced settings, presets and upload fallback.');
} finally { await browser?.close(); await server.close(); }
