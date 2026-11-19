import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/dashboard-layout.html`);
  await page.locator('.gos-home-dashboard').waitFor();
  await mkdir('artifacts/dashboard-layout', { recursive: true });
  for (const language of ['ar', 'en']) for (const theme of ['light', 'dark']) {
    await page.evaluate(async ({ language, theme }) => window.setLayoutMode(language, theme), { language, theme });
    for (const [width, height] of [[1440, 900], [1024, 768], [768, 600], [390, 844], [360, 640], [844, 390]]) {
      await page.setViewportSize({ width, height });
      const art = page.locator('[data-dashboard-section="hero"] > .pointer-events-none');
      assert.equal(await art.evaluate(element => getComputedStyle(element).display), 'block');
      await art.locator('img').evaluate(image => image.decode());
      assert.equal(await art.locator('img').evaluate(image => image.naturalWidth > 0), true);
      await page.locator('.nc-trigger').click();
      await page.getByRole('tab').first().click();
      assert.equal(await page.locator('.nc-item').count(), 100);
      const geometry = await page.locator('.nc-popover').evaluate(panel => {
        const rect = panel.getBoundingClientRect();
        const tabs = panel.querySelector('.nc-tabs').getBoundingClientRect();
        const items = panel.querySelector('.nc-items');
        return { bounded: rect.left >= 11 && rect.right <= innerWidth - 11 && rect.top >= 11 && rect.bottom <= innerHeight - 11,
          tabsClear: tabs.bottom <= items.getBoundingClientRect().top + 1 && tabs.height >= 36,
          scrolls: items.scrollHeight > items.clientHeight, itemsHeight: items.clientHeight,
          footerVisible: panel.querySelector('footer').getBoundingClientRect().bottom <= rect.bottom };
      });
      assert.ok(geometry.bounded && geometry.tabsClear && geometry.scrolls && geometry.itemsHeight > 0 && geometry.footerVisible, JSON.stringify({ language, theme, width, height, geometry }));
      if (width === 390) await page.locator('.nc-popover').screenshot({ path: `artifacts/dashboard-layout/notifications-${language}-${theme}.png` });
      await page.locator('.nc-items').evaluate(element => { element.scrollTop = element.scrollHeight; });
      await page.getByRole('tab').nth(3).click();
      assert.ok(await page.locator('.nc-item').count() > 0);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.nc-popover').count(), 0);
      if (width === 1440 || width === 390) await page.screenshot({ path: `artifacts/dashboard-layout/${language}-${theme}-${width}.png` });
    }
  }
  // Short viewports can place the panel above a trigger near the bottom edge.
  await page.setViewportSize({ width: 390, height: 600 });
  await page.locator('.layout-header').evaluate(element => { element.style.cssText = 'position:fixed;top:auto;right:auto;bottom:12px;left:12px;width:64px;z-index:100;transform:none'; });
  await page.locator('.nc-trigger').click();
  const flipped = await page.locator('.nc-popover').evaluate(element => ({ panel: element.getBoundingClientRect().toJSON(), trigger: document.querySelector('.nc-trigger').getBoundingClientRect().toJSON() }));
  assert.ok(flipped.panel.bottom < flipped.trigger.top, JSON.stringify(flipped));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/dashboard-layout.html?preview=1`);
  const preview = page.locator('.lp-native-preview');
  await preview.locator('.gos-home-dashboard').waitFor();
  for (const language of ['ar', 'en']) for (const theme of ['light', 'dark']) {
    await page.evaluate(async ({ language, theme }) => window.setLayoutMode(language, theme), { language, theme });
    for (const width of [1440, 1024, 768, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const geometry = await preview.evaluate(element => {
        const root = element.querySelector('.lp-native-static').shadowRoot;
        const frame = element.getBoundingClientRect();
        const sections = [...root.querySelectorAll('[data-dashboard-section]')];
        return { sections: sections.map(section => ({ name: section.dataset.dashboardSection, rect: section.getBoundingClientRect().toJSON() })),
          allVisible: sections.every(section => { const r = section.getBoundingClientRect(); return r.left >= frame.left - 1 && r.right <= frame.right + 1 && r.top >= frame.top - 1 && r.bottom <= frame.bottom + 1; }),
          artVisible: getComputedStyle(root.querySelector('[data-dashboard-section="hero"] > .pointer-events-none')).display === 'block' };
      });
      assert.equal(geometry.sections.length, 8);
      assert.ok(geometry.allVisible && geometry.artVisible, JSON.stringify({ language, theme, width, geometry }));
      if (width === 1440 || width === 390) await preview.screenshot({ path: `artifacts/dashboard-layout/preview-${language}-${theme}-${width}.png` });
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: notifications and welcome art across 24 language/theme/viewport combinations; all eight dashboard preview sections and restored art visible across 20 combinations.');
} finally { await browser?.close(); await server.close(); }
