import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createServer } from 'vite';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixtureId = 'virtual:stage-header-fixture';
const server = await createServer({
  root: path.resolve('launch-brand'),
  configFile: path.resolve('launch-brand/vite.config.ts'),
  cacheDir: 'node_modules/.vite-stage-header-test',
  plugins: [{
    name: 'stage-header-fixture',
    resolveId: id => id === fixtureId ? '\0' + id : null,
    load(id) {
      if (id !== '\0' + fixtureId) return null;
      return `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { Provider } from 'react-redux';
        import { AppHeader } from '@/modules/brand-engine/components/brandengine/AppHeader';
        import { store } from '@/modules/brand-engine/store';
        import { actions } from '@/modules/brand-engine/store/brandSlice';
        import '@/launch-brand-tokens.css';
        import '@/index.css';
        import '@/launch-brand-identity.css';
        import '@/pages/launch-brand-page.css';
        window.setStage = (step, language) => {
          store.dispatch(actions.setLanguage(language));
          store.dispatch(actions.setStep(step));
          store.dispatch(actions.setMode('wizard'));
          document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        };
        window.setStage(14, 'en');
        createRoot(document.getElementById('root')).render(React.createElement(Provider, {store}, React.createElement(AppHeader)));
      `;
    },
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/launch-brand/__stage-fixture') return next();
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div class="brand-engine-module launch-brand-toolbar" id="root"></div><script type="module" src="/launch-brand/@id/__x00__virtual:stage-header-fixture"></script></body></html>');
      });
    },
  }],
  server: { host: '127.0.0.1', port: 0, hmr: false },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/launch-brand/__stage-fixture`);
  await page.locator('.compact-phase').first().waitFor({ timeout: 60000 });
  for (const language of ['en', 'ar']) {
    for (const step of [13, 14, 5, 4, 18]) {
      await page.evaluate(({ step, language }) => window.setStage(step, language), { step, language });
      assert.equal(await page.locator('.compact-phase').count(), 4);
      await page.locator('.compact-phase.is-active').waitFor();
      assert.equal(await page.locator('.compact-phase-tab[aria-current="step"]').count(), 1);
      for (const width of [1366, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        for (const tab of await page.locator('.compact-phase-tab').all()) assert.equal(await tab.isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${language}/${step}/${width}: no horizontal overflow`);
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: four stage headers on all workspace steps, English/Arabic, desktop/tablet/mobile, no overflow or runtime errors.');
} finally {
  await browser?.close();
  await server.close();
}
