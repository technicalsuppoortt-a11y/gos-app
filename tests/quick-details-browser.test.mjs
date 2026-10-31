import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixture = new URL('./fixtures/commerce-save-workspace.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-quick-details', optimizeDeps: { entries: ['tests/fixtures/quick-details.html'] }, plugins: [react(), { name: 'details-workspace', enforce: 'pre', resolveId(source) { if (/backend\/workspace$/.test(source)) return fixture; } }], server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/quick-details.html`);
  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    const ratios = await page.locator('.bk-powered,.bk-tip,.bk-muted').evaluateAll(elements => {
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      return elements.map(el => {
        let ancestor = el, background;
        while (ancestor) { const c = getComputedStyle(ancestor).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') { background = c; break; } ancestor = ancestor.parentElement; }
        const a = luminance(getComputedStyle(el).color), b = luminance(background || 'rgb(255, 255, 255)');
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      });
    });
    assert.ok(ratios.every(r => r >= 4.5), `Contrast in ${dark ? 'dark' : 'light'}: ${ratios}`);
    await page.getByRole('button', { name: 'Booking details', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('heading', { name: 'Customer details' }).waitFor();
    await dialog.getByText('Improve conversion').waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Booking details');
    await page.getByRole('button', { name: 'Actions for Design toolkit' }).click();
    await page.getByRole('menuitem', { name: 'Quick View Details' }).click();
    await dialog.getByRole('heading', { name: 'Product specs' }).waitFor();
    await dialog.getByText('Ada Buyer', { exact: true }).waitFor();
    assert.equal(await dialog.getByText('Other Buyer').count(), 0);
    await dialog.getByRole('heading', { name: 'CRM pipeline mapping' }).waitFor();
    await page.getByRole('button', { name: 'Close details' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Booking details', exact: true }).click();
  assert.equal(await page.locator('dialog').evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.ok((await page.locator('dialog').boundingBox()).width <= 390);
  await page.getByRole('button', { name: 'Close details' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log('Booking/product drawers passed: themes, AA contrast, customer history isolation, focus, close, mobile, reduced motion.');
} finally { await browser?.close(); await server.close(); }
