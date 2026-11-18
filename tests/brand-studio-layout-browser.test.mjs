import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer, preview } from 'vite';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const gos = await preview({ configFile: false, build: { outDir: path.resolve('dist') }, preview: { host: '127.0.0.1', port: 0 } });
const target = `http://127.0.0.1:${gos.httpServer.address().port}`;
const fixture = 'virtual:brand-studio-layout';
const server = await createServer({
  root: path.resolve('launch-brand'), configFile: path.resolve('launch-brand/vite.config.ts'),
  plugins: [{
    name: 'brand-studio-layout',
    resolveId: id => id === fixture ? '\0' + id : null,
    load(id) {
      if (id !== '\0' + fixture) return;
      return `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { Provider } from 'react-redux';
        import { store } from '@/modules/brand-engine/store';
        import { actions } from '@/modules/brand-engine/store/brandSlice';
        import { BrandingStudio } from '@/modules/brand-engine/components/brandengine/BrandingStudio';
        import '@/launch-brand-tokens.css';
        import '@/index.css';
        import '@/launch-brand-identity.css';
        window.setLanguage = language => {
          store.dispatch(actions.setLanguage(language));
          document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        };
        store.dispatch(actions.setBrandName('Juniper Studio'));
        window.setLanguage('ar');
        createRoot(document.getElementById('root')).render(React.createElement(Provider, { store }, React.createElement(BrandingStudio)));
      `;
    },
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/launch-brand/__studio-layout') return next();
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div class="brand-engine-module" style="padding:24px;box-sizing:border-box" id="root"></div><script type="module" src="/launch-brand/@id/__x00__virtual:brand-studio-layout"></script>');
      });
    },
  }],
  server: { host: '127.0.0.1', port: 0, hmr: false, proxy: { '/dashboard': target, '/assets': target } },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/launch-brand/__studio-layout`);
  await page.locator('#studio-tab-name').waitFor({ timeout: 60000 });
  await mkdir('artifacts/brand-studio-layout', { recursive: true });
  for (const language of ['ar', 'en']) {
    await page.evaluate(language => window.setLanguage(language), language);
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await page.locator('.studio-editor-tabs [role="tab"]').count(), 4);
    await page.locator('#studio-tab-name').click();
    for (const step of ['colors', 'typography', 'logo']) {
      await page.locator('.studio-section-next').click();
      assert.equal(await page.locator(`#studio-tab-${step}`).getAttribute('aria-selected'), 'true');
    }
    assert.equal(await page.locator('#studio-logo-manager').isVisible(), true);
    const logo = await page.locator('.bs-logo-preview').boundingBox();
    assert.ok(logo.height >= 180 && logo.width > 200, 'Logo gets a spacious preview');
    const dashboard = page.locator('.studio-preview-layer iframe[title="Dashboard"]');
    assert.equal(await dashboard.getAttribute('height'), null);
    assert.equal(await dashboard.evaluate(frame => frame.style.height), '850px');
    const stage = await page.locator('[data-preview-stage]').boundingBox();
    const frame = await page.locator('.studio-preview-device-frame').boundingBox();
    assert.ok(Math.abs(frame.width / frame.height - 1280 / 850) < 0.01, 'Full desktop proportions');
    assert.ok(frame.width > stage.width - 4, 'Preview uses available width');
    await page.screenshot({ path: `artifacts/brand-studio-layout/${language}-desktop.png`, fullPage: true });
    await page.locator('#studio-generate-logo').click();
    assert.equal(await page.locator('.studio-logo-generator-dialog').isVisible(), true);
    assert.equal(await page.locator('.studio-compact-editor .studio-logo-generator-dialog').count(), 1);
    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${language}/${width}: no overflow`);
      await page.screenshot({ path: `artifacts/brand-studio-layout/${language}-${width}.png`, fullPage: true });
    }
    await page.locator('#studio-tab-name').click();
    assert.equal(await page.locator('.studio-logo-generator-dialog').isVisible(), false);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: four-step navigation, logo generation in step 4, full dashboard proportions, Arabic/English and mobile layouts.');
} finally {
  await browser?.close();
  await server.close();
  await new Promise(resolve => gos.httpServer.close(resolve));
}
