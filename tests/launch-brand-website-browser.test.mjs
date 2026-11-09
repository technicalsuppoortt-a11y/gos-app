import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createServer, preview } from 'vite';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const brandName = 'Juniper Studio';
const logoUrl = '/__launch-brand-test-logo.svg';
const slowImageUrl = '/__launch-brand-test-slow.svg';
const primary = '#13756A';
const darkPrimary = '#52D6BD';
const background = '#F1FBF7';
const darkBackground = '#102421';
const button = '#156B62';
const fixtureId = 'virtual:launch-brand-website-fixture.js';

// Provide a saved draft directly to the real Launch Brand Builder. The page it
// embeds is the production GOS build, with its real demo bootstrap and bridge.
const fixture = {
  name: 'launch-brand-website-fixture',
  resolveId: id => id === fixtureId ? '\0' + id : null,
  load(id) {
    if (id !== '\0' + fixtureId) return null;
    return `
      import { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import { Provider } from 'react-redux';
      import { BuilderPage } from '@/modules/brand-engine/pages/BuilderPage';
      import { createBrandTheme } from '@/modules/brand-engine/data/brandTheme';
      import { actions } from '@/modules/brand-engine/store/brandSlice';
      import { store } from '@/modules/brand-engine/store/index';

      const brandTheme = createBrandTheme('teal');
      Object.assign(brandTheme.light, { primary: '${primary}', background: '${background}', buttonBackground: '${button}' });
      Object.assign(brandTheme.dark, { primary: '${darkPrimary}', background: '${darkBackground}' });
      store.dispatch(actions.hydrateUserDraft({
        brandName: '${brandName}', brandTheme, language: 'en', mode: 'builder',
        pageParameters: { branding: { uploadedLogo: { url: '${logoUrl}' } } },
      }));
      document.querySelector('button').onclick = () => store.dispatch(actions.toggleTheme());
      createRoot(document.getElementById('root')).render(createElement(Provider, { store }, createElement(BuilderPage)));
    `;
  },
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url?.split('?')[0] !== '/launch-brand/') return next();
      response.setHeader('Content-Type', 'text/html');
      response.end(`<!doctype html><title>Launch Brand fixture</title><button>Switch draft theme</button><div id="root"></div><script type="module" src="/launch-brand/@id/__x00__${fixtureId}"></script>`);
    });
  },
};

const outDir = path.resolve(process.env.GOS_TEST_DIST || 'dist');
const gosHtml = await readFile(path.join(outDir, 'index.html'), 'utf8');
const gos = await preview({
  configFile: false,
  build: { outDir },
  preview: { host: '127.0.0.1', port: 0 },
});
let launchBrand;
let browser;
let releaseImage;
const imagePending = new Promise(resolve => { releaseImage = resolve; });

try {
  launchBrand = await createServer({
    root: path.resolve('launch-brand'),
    configFile: path.resolve('launch-brand/vite.config.ts'),
    cacheDir: 'node_modules/.vite-website-preview-test',
    plugins: [fixture],
    optimizeDeps: {
      noDiscovery: true,
      include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-redux', '@reduxjs/toolkit', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
    },
    server: {
      host: '127.0.0.1', port: 0, hmr: { clientPort: 0 }, ws: { clientPort: 0 },
      proxy: { '^/(?!launch-brand/)': `http://127.0.0.1:${gos.httpServer.address().port}` },
    },
  });
  await launchBrand.listen();
  const origin = `http://127.0.0.1:${launchBrand.httpServer.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(60000);
  const errors = [];
  const demoBackendRequests = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      if (/firebase|firestore|googleapis\.com/.test(url.hostname) && !/fonts\./.test(url.hostname)) {
        demoBackendRequests.push(url.href);
      }
      if (request.resourceType() === 'stylesheet') return route.fulfill({ body: '', contentType: 'text/css' });
      if (request.resourceType() === 'script') return route.fulfill({ body: '', contentType: 'text/javascript' });
      return route.abort();
    }
    if (url.pathname === slowImageUrl) await imagePending;
    if (url.pathname === logoUrl || url.pathname === slowImageUrl) {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20" fill="#13756a"/></svg>' });
    }
    if (url.pathname === '/' && url.searchParams.get('launch-brand-preview') === '1') {
      const html = gosHtml.replace('</body>', `<img hidden src="${slowImageUrl}" alt=""></body>`);
      return route.fulfill({ contentType: 'text/html', body: html });
    }
    return route.continue();
  });

  await Promise.all([
    page.waitForRequest(`${origin}${slowImageUrl}`),
    page.goto(`${origin}/launch-brand/?view=website`, { waitUntil: 'domcontentloaded' }),
  ]);
  const selector = 'iframe[name="gos-demo-account"]';
  const landing = page.frameLocator(selector);
  await landing.locator('.lp-hero__copy').getByRole('heading', { level: 1 }).waitFor();
  assert.equal(await page.locator('iframe').count(), 1);

  async function waitForPalette(accent, surface) {
    await page.waitForFunction(({ selector, accent, surface }) => {
      const root = document.querySelector(selector)?.contentDocument?.querySelector('.lp[data-launch-brand]');
      if (!root) return false;
      const style = root.ownerDocument.defaultView.getComputedStyle(root);
      return style.getPropertyValue('--lp-primary').trim().toUpperCase() === accent
        && style.getPropertyValue('--lp-bg').trim().toUpperCase() === surface;
    }, { selector, accent, surface });
  }

  await waitForPalette(primary, background);
  const gradient = await landing.locator('.lp-gradient-text').first().evaluate(element => getComputedStyle(element).backgroundImage);
  assert.match(gradient, /rgb\(19, 117, 106\)/);
  const buttonGradient = await landing.locator('#lp-header-book').evaluate(element => getComputedStyle(element).backgroundImage);
  assert.match(buttonGradient, /rgb\(21, 107, 98\)/);
  const hero = landing.locator('.lp-hero__lead');
  await hero.filter({ hasText: brandName }).waitFor();
  assert.doesNotMatch(await hero.textContent(), /Upclick/i);
  await landing.locator('.lp-header__brand').getByText(brandName, { exact: true }).waitFor();
  for (const element of ['.lp-header__brand img', '.lp-mock__logo img']) {
    const logo = landing.locator(element);
    await logo.waitFor();
    assert.equal(await logo.getAttribute('src'), logoUrl);
    await logo.evaluate(image => image.decode());
  }
  assert.equal(await page.locator(selector).evaluate(frame => frame.contentDocument.readyState), 'interactive');
  releaseImage();

  await page.getByRole('button', { name: 'Switch draft theme' }).click();
  await waitForPalette(darkPrimary, darkBackground);
  assert.deepEqual(errors, []);
  assert.deepEqual(demoBackendRequests, []);
  console.log('Launch Brand rendered and branded the production demo landing before the frame finished loading. Light and dark draft palettes passed.');
} finally {
  releaseImage();
  await browser?.close();
  await launchBrand?.close();
  gos.httpServer.closeAllConnections();
  await new Promise(resolve => gos.httpServer.close(resolve));
}
