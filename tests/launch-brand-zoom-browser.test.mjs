import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createServer } from 'vite';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixture = 'virtual:studio-zoom';
const server = await createServer({
  root: path.resolve('launch-brand'), configFile: path.resolve('launch-brand/vite.config.ts'),
  define: { 'import.meta.env.VITE_USE_EMULATORS': JSON.stringify('true') },
  plugins: [{
    name: 'studio-zoom',
    enforce: 'pre',
    resolveId(id, importer) {
      if (id === fixture) return '\0' + id;
      if (/\/services\/aiConnection(?:\.ts)?$/.test(id) && importer?.endsWith('/BrandingStudio.tsx')) return '\0studio-zoom-ai';
      return null;
    },
    load(id) {
      // Keep the real UI/state transitions; replace only the paid AI operation.
      if (id === '\0studio-zoom-ai') return `
        export * from '/src/modules/brand-engine/services/aiConnection.ts';
        let sequence = 0;
        export async function generateBrandElement(element, answers, requestId, language, inputFingerprint) {
          const outcome = await new Promise(resolve => { window.finishLogoGeneration = resolve; });
          window.finishLogoGeneration = null;
          if (outcome === 'error') throw new Error('Test generation failed. Please retry.');
          return {inputFingerprint, promptVersion:'test', suggestions:[{
            id:'zoom-logo-' + (++sequence), mark:'prism',
            logo:{paths:[{d:'M-60 -60H60V60H-60Z',fill:true,strokeWidth:0}]},
          }]};
        }
      `;
      if (id !== '\0' + fixture) return;
      return `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { Provider } from 'react-redux';
        import { BrowserRouter } from 'react-router-dom';
        import { store } from '@/modules/brand-engine/store';
        import { actions } from '@/modules/brand-engine/store/brandSlice';
        import { AppShell } from '@/modules/brand-engine/components/brandengine/AppShell';
        import '@/launch-brand-tokens.css';
        import '@/index.css';
        import '@/launch-brand-identity.css';
        import '@/modules/brand-engine/components/brandengine/WorkspaceShell.css';
        import '@/pages/launch-brand-page.css';
        store.dispatch(actions.setStep(14));
        store.dispatch(actions.setMode('wizard'));
        store.dispatch(actions.setUserProfile({uid:'zoom-fixture',displayName:'Layout test',email:''}));
        store.dispatch(actions.setBrandName('Juniper Studio'));
        store.dispatch(actions.setBusiness('Education'));
        window.setLanguage = language => store.dispatch(actions.setLanguage(language));
        window.setLanguage('en');
        createRoot(document.getElementById('fixture')).render(React.createElement(Provider, {store}, React.createElement(BrowserRouter, null, React.createElement(AppShell, {headerTarget: document.querySelector(".launch-brand-header")}))));
      `;
    },
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/launch-brand/__zoom') return next();
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"><div class="launch-brand-page"><header class="launch-brand-header">Launch Brand</header><div class="launch-brand-content"><div class="brand-engine-module light"><div id="fixture" style="height:100%"></div></div></div></div></div><script type="module" src="/launch-brand/@id/__x00__virtual:studio-zoom"></script></body></html>');
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
  page.on('pageerror', error => { if (!error.message.includes('WebSocket closed')) errors.push(error.stack); });
  // Isolate layout from customer preview pages and network services.
  await page.route('**/*', route => {
    if (route.request().isNavigationRequest() && route.request().frame() !== page.mainFrame()) return route.fulfill({contentType:'text/html', body:'<!doctype html><html><head><style>body{margin:0}</style></head><body>Preview fixture</body></html>'});
    return new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/launch-brand/__zoom?devpreview=1&view=branding`);
  await page.locator('#studio-tab-name').waitFor({timeout: 60000});
  for (const language of ['en', 'ar']) {
    await page.evaluate(language => window.setLanguage(language), language);
    // Browser zoom reduces the CSS viewport: 1366x768 at 125% is ~1093x614.
    for (const size of [{width:1920,height:950},{width:1536,height:760},{width:1366,height:768},{width:1223,height:598},{width:1093,height:614},{width:1024,height:619},{width:1024,height:620},{width:768,height:900},{width:390,height:844}]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(350);
      const grid = await page.locator('.studio-workspace-grid').boundingBox();

      assert(grid && grid.height > 150, 'Studio content has usable height at ' + JSON.stringify(size));
      const tab = page.locator('#studio-tab-name');
      await tab.scrollIntoViewIfNeeded();
      await tab.click({timeout:5000});
      assert(await page.locator('#studio-brand-name').isVisible(), 'Brand name editor remains visible');
      for (const step of ['colors', 'typography', 'logo']) {
        await page.locator('#studio-tab-' + step).click({timeout:5000});
        assert.equal(await page.locator('#studio-tab-' + step).getAttribute('aria-selected'), 'true');
      }
      await page.locator('#studio-generate-logo').click({timeout:5000});
      const generator = page.locator('.studio-logo-generator-dialog');
      await generator.waitFor();
      const generatorBox = await generator.boundingBox();
      assert(generatorBox && generatorBox.height > 150);
      const submit = generator.locator('button[type="submit"]');
      await submit.click({timeout:5000});
      await generator.locator('.ai-generation-progress').waitFor();
      await page.waitForFunction(() => typeof window.finishLogoGeneration === 'function');
      // A pending request must survive crossing the height breakpoint at zoom.
      await page.setViewportSize({...size, height:size.height < 620 ? 625 : 600});
      await page.setViewportSize(size);
      await page.evaluate(() => window.finishLogoGeneration('success'));
      const option = generator.locator('.studio-element-result').last();
      await option.waitFor();
      if (language === 'en' && size.width === 1223) {
        await option.scrollIntoViewIfNeeded();
        await page.screenshot({path:path.resolve('node_modules/.cache/launch-brand-logo-zoom.png')});
      }
      await option.locator('button.studio-done-button').click({timeout:5000});
      await generator.waitFor({state:'hidden'});
      await page.locator('#studio-generate-logo').click({timeout:5000});
      await generator.waitFor();
      assert(await generator.locator('.studio-element-result').count() > 0, 'Generated logo remains after reopening');
      await submit.click({timeout:5000});
      await generator.locator('.ai-generation-progress').waitFor();
      await page.waitForFunction(() => typeof window.finishLogoGeneration === 'function');
      await page.evaluate(() => window.finishLogoGeneration('error'));
      await generator.getByRole('alert').first().waitFor();
      assert((await generator.getByRole('alert').first().innerText()).trim(), 'Failed generation shows a message');
      await generator.getByRole('button', {name:language === 'en' ? 'Close' : 'إغلاق', exact:true}).click({timeout:5000});
      await page.locator('#studio-tab-name').click({timeout:5000});
      const footer = page.locator('.wizard--brand-studio > .wizard-footer');
      await footer.scrollIntoViewIfNeeded();
      const footerBox = await footer.boundingBox();
      assert(footerBox && footerBox.y < size.height && footerBox.y + footerBox.height > 0, 'Footer is reachable');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: logo generation pending/success/selection/reopen/failure/close, resizing during generation, tabs and footer across nine desktop/tablet/mobile sizes in English and Arabic (AI operation mocked).');
} finally {
  await browser?.close();
  await server.close();
}




