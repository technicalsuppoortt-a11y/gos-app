import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixture = name => new URL(`./fixtures/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-commerce-reviews', optimizeDeps: { entries: ['tests/fixtures/commerce-save.html'] }, plugins: [react(), {
  name: 'review-test-transports', enforce: 'pre',
  resolveId(source) {
    if (/backend\/workspace$/.test(source)) return fixture('commerce-save-workspace.ts');
    if (source === './reviewRepository') return fixture('commerce-review-transport.ts');
    if (source === '@phosphor-icons/react') return '\0review-test-icons';
  },
  load(id) { if (id === '\0review-test-icons') return 'export const AppleLogo=()=>null, InstagramLogo=()=>null, LinkedinLogo=()=>null, YoutubeLogo=()=>null, TiktokLogo=()=>null;'; },
}], server: { host: '127.0.0.1', port: 0 } });
await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/commerce-save.html`);
  await page.waitForFunction(() => !!window.__router);
  const navigate = url => page.evaluate(url => window.__router.navigate(url), url);
  for (const [index, type] of ['Service', 'Course', 'Digital Product'].entries()) {
    const id = `review-product-${index}`;
    await page.evaluate(({ id, type }) => {
      const p = { ...window.__newProduct(), id, name: `Review ${type}`, type, status: 'Active', config: window.__defaultConfig(type, '€50') };
      window.__seed('gos-commerce-products-v1:tenant-qa', [p]); window.__writePreview(`product-${id}`, p);
    }, { id, type });
    await navigate(`/product-preview/product-${id}`);
    const section = page.getByRole('region', { name: 'Customer reviews', exact: true });
    await section.getByText('(No reviews yet)', { exact: true }).waitFor();
    await section.getByRole('button', { name: 'Submit review', exact: true }).click();
    assert.equal(await section.getByRole('article').count(), 0);
    await section.getByRole('radio', { name: '5 stars', exact: true }).check();
    await section.getByLabel('Your name', { exact: true }).fill('Alex');
    await section.getByLabel('Your review', { exact: true }).fill('Excellent experience!');
    await page.evaluate(() => { window.__failReview = true; });
    await section.getByRole('button', { name: 'Submit review', exact: true }).click();
    await section.getByRole('alert').waitFor();
    assert.equal(await section.getByRole('article').count(), 0);
    assert.equal(await section.locator('textarea').inputValue(), 'Excellent experience!');
    await page.evaluate(() => { window.__failReview = false; });
    await section.getByRole('button', { name: 'Submit review', exact: true }).click();
    await section.getByText('Thank you! Your review has been submitted.', { exact: true }).waitFor();
    await section.getByText('5.0', { exact: true }).waitFor();
    await section.getByRole('radio', { name: '4 stars', exact: true }).check();
    await section.getByLabel('Your name', { exact: true }).fill('Jordan');
    await section.getByLabel('Your review', { exact: true }).fill('Very useful.');
    await section.getByRole('button', { name: 'Submit review', exact: true }).click();
    await section.getByText('4.5', { exact: true }).waitFor();
    assert.equal(await section.getByRole('article').count(), 2);
    await navigate(`/dashboard/products-payments/products/${id}/edit`);
    await page.locator('.product-title-bar .pr-rating').getByText('4.5', { exact: true }).waitFor();
    if (type === 'Service') await page.locator('.tw-service-preview .pr-rating').getByText('(2 reviews)', { exact: true }).waitFor();
    const name = page.getByLabel(type === 'Service' ? 'Service Name *' : type === 'Course' ? 'Course Title *' : 'Product Title *', { exact: true });
    // Simulate another customer while this editor has an unsaved local field.
    const input = await name.count() ? name : page.locator('input').filter({ visible: true }).first();
    await input.fill('Unsaved local title');
    await page.evaluate(id => window.__submitReview('tenant-qa', id, { id: crypto.randomUUID(), rating: 3, author: 'Taylor', comment: 'Good experience.' }), id);
    await page.locator('.product-title-bar .pr-rating').getByText('4.0', { exact: true }).waitFor();
    assert.equal(await input.inputValue(), 'Unsaved local title');
    // Restore the local input before navigating through the unsaved changes guard.
    await input.fill(`Review ${type}`);
    await navigate(`/product-preview/product-${id}`);
    await section.getByText('(3 reviews)', { exact: true }).waitFor();
    await navigate(`/product-preview/${id}?workspace=tenant-qa`);
    await section.getByText('(3 reviews)', { exact: true }).waitFor();
    await section.getByRole('radio', { name: '4 stars', exact: true }).check();
    await section.getByLabel('Your name', { exact: true }).fill('Public visitor');
    await section.getByLabel('Your review', { exact: true }).fill('A useful product.');
    await section.getByRole('button', { name: 'Submit review', exact: true }).click();
    await section.getByText('(4 reviews)', { exact: true }).waitFor();
    await navigate(`/dashboard/products-payments/products/${id}/edit`);
    await page.locator('.product-title-bar .pr-rating').getByText('(4 reviews)', { exact: true }).waitFor();
    await navigate(`/product-preview/${id}?workspace=tenant-qa`);
    await section.getByText('(4 reviews)', { exact: true }).waitFor();
    if (index === 2) {
      await page.setViewportSize({ width: 390, height: 844 });
      await section.scrollIntoViewIfNeeded();
      assert.equal(await section.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      if (process.env.REVIEW_SCREENSHOT) await page.screenshot({ path: process.env.REVIEW_SCREENSHOT, fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  console.log('Verified preview/public submission, failure/retry, aggregation, reopened pages, unsaved editor state, and mobile layout across all three product types.');
} finally { await browser?.close(); await server.close(); }
