import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { preview } from 'vite';
import fs from 'node:fs/promises';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
const paths = ['/privacy-policy', '/terms-of-service', '/refund-policy', '/shipping-policy', '/contact-us'];
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  for (const locale of ['en', 'ar', 'nl', 'de']) {
    const page = await browser.newPage({ viewport: { width: locale === 'en' ? 1440 : 390, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(language => {
      localStorage.setItem('i18nextLng', language);
      localStorage.setItem('user_selected_lang', language);
      localStorage.setItem('theme', 'light');
    }, locale);
    for (const path of paths) {
      await page.goto(origin + path);
      await page.locator('.upklick-legal h1').waitFor({ timeout: 60000 });
      assert.equal(await page.locator('.upklick-legal').getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr');
      const content = await page.locator('main').innerText();
      assert.match(content, /UpKlick/);
      assert.match(content, /99/);
      assert.match(content, /support@upklick.net/);
      assert.doesNotMatch(content, /upklickofficial|technicalsuppoortt|299 EGP|499 EGP|799 EGP/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} ${path} has no horizontal overflow`);
      assert.equal(await page.locator('.upklick-legal-top .upklick-legal-logo img').evaluate(img => img.complete && img.naturalWidth > 0), true, 'Official header logo loads');
      assert.equal(await page.locator('.upklick-legal-intro .upklick-legal-logo img').count(), 1, 'Brand header includes the official icon and wordmark');
      assert.equal(await page.locator('.upklick-legal-subnav a[aria-current="page"]').getAttribute('href'), path);
      const lightColor = await page.locator('.uk-card').first().evaluate(card => getComputedStyle(card).backgroundColor);
      await page.locator('.upklick-legal-top .global-theme-control').click();
      await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
      const darkColor = await page.locator('.uk-card').first().evaluate(card => getComputedStyle(card).backgroundColor);
      assert.notEqual(darkColor, lightColor, 'Theme toggle changes card surfaces');
      assert.equal(await page.locator('main').innerText(), content, 'Theme changes preserve every policy word');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Dark mode does not overflow');
      if (path === '/privacy-policy') {
        await fs.mkdir('artifacts/legal-pages', { recursive: true });
        await page.screenshot({ path: `artifacts/legal-pages/privacy-${locale}-dark.png`, fullPage: true });
        await page.screenshot({ path: `artifacts/legal-pages/privacy-${locale}-dark-top.png` });
      }
      await page.locator('.upklick-legal-top .global-theme-control').click();
      await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
      if (path === '/privacy-policy') {
        await page.screenshot({ path: `artifacts/legal-pages/privacy-${locale}-light.png`, fullPage: true });
        await page.screenshot({ path: `artifacts/legal-pages/privacy-${locale}-light-top.png` });
      }
      if (path === '/refund-policy' && locale === 'en') {
        assert.match(content, /non-refundable once activated/);
        assert.match(content, /until the end of your current paid billing period/);
      }
      if (path === '/shipping-policy' && locale === 'en') assert.match(content, /There is no shipping/);
      if (path === '/contact-us') {
        await fs.mkdir('artifacts/legal-pages', { recursive: true });
        await page.screenshot({ path: `artifacts/legal-pages/contact-${locale}.png`, fullPage: true });
        assert.equal(await page.locator('address a[href="tel:+201038979275"]').count(), 1);
        await page.locator('#contact-name').fill('Policy inquiry');
        await page.locator('#contact-email').fill('reader@example.com');
        await page.locator('#contact-message').fill('Please help with my subscription.');
        assert.equal(await page.locator('form').evaluate(form => form.checkValidity()), true);
        // Capture the real mailto request without launching a desktop mail application.
        const draft = page.waitForEvent('request', { predicate: request => request.url().startsWith('mailto:'), timeout: 10000 });
        await page.locator('form button[type="submit"]').click();
        assert.match(decodeURIComponent((await draft).url()), /mailto:support@upklick.net\?subject=UpKlick Support/);
      }
    }
    await page.goto(origin + '/privacy');
    await page.locator('.upklick-legal h1').waitFor();
    for (const entry of ['/', '/login']) {
      await page.goto(origin + entry);
      const footer = page.locator(entry === '/' ? '.lp-site-footer' : '.login-footer');
      await footer.waitFor({ timeout: 60000 });
      for (const path of paths) assert.ok(await footer.locator(`a[href="${path}"]`).count() >= 1, `${locale} ${entry} links to ${path}`);
    }
    assert.deepEqual(errors, [], `${locale}: no uncaught browser errors`);
    await page.close();
    console.log(`PASS ${locale}: five routes, legacy privacy, entry links, RTL/LTR, responsive layout, official logos, active navigation, light/dark surfaces, unchanged text, email draft`);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
