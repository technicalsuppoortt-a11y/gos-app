import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { buildPublicationFiles, publicationResourcePaths } from '../functions/hosting-client.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const styles = { backgroundColor: '#fff', padding: '24', textAlign: 'Left', typography: 'Brand heading', customCss: '', visibility: 'Visible', animation: 'None' };
const asset = { id: 'asset', kind: 'funnel', name: 'Published fixture', image: '/pagefly/coach-portrait.png', settings: { color: '#6544e8', navigation: 'Home, Thanks' }, document: { theme: { font: 'Manrope' }, funnel: { pagesFlow: ['home', 'thanks'], status: 'Published' }, steps: [{ id: 'landing', pageId: 'home' }, { id: 'thanks', pageId: 'thanks' }], pages: [
  { id: 'home', name: 'Home', path: '/start', showHeader: false, showFooter: false, sections: [{ id: 'hero', type: 'Hero', content: { title: 'Published saved heading', body: 'Stored workspace content', src: '/pagefly/coach-portrait.png', button: 'Continue', destinationType: 'Next Step', destination: 'thanks' }, styles }] },
  { id: 'thanks', name: 'Thanks', path: '/thank-you', showHeader: false, showFooter: false, sections: [{ id: 'heading', type: 'Heading', content: { title: 'Thank you from the published page', headingTag: 'H1' }, styles }] },
] } };
const files = buildPublicationFiles(asset, await readFile('dist/published.html', 'utf8'), 'https://dashboard.test', true);
const resources = publicationResourcePaths(asset, JSON.parse(await readFile('dist/hosting-manifest.json', 'utf8')));
for (const path of resources) files[path] = await readFile('dist' + path);
const browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  const dashboardRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
  await page.route('https://dashboard.test/**', async route => {
    dashboardRequests.push(route.request().url());
    await route.abort();
  });
  await page.route('https://site.test/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/\/+$/, '') || '/';
    const resource = files[path];
    const html = files[path === '/' ? '/index.html' : path + '/index.html'];
    const contentType = resource ? ({ '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }[extname(path)] || 'application/octet-stream') : 'text/html';
    await route.fulfill({ status: resource || html ? 200 : 404, body: resource || html || 'Page not found', contentType });
  });
  for (const path of ['/', '/start']) {
    const response = await page.goto('https://site.test' + path);
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { name: 'Published saved heading' }).waitFor();
    assert.equal(await page.locator('.fb-editor-header').count(), 0);
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForURL('https://site.test/thank-you');
  await page.getByRole('heading', { name: 'Thank you from the published page' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Thank you from the published page' }).waitFor();
  const response = await page.goto('https://site.test/unknown');
  assert.equal(response.status(), 404);
  assert.deepEqual(errors, []);
  assert.deepEqual(dashboardRequests, [], 'published runtime must remain independent of future dashboard deployments');
  console.log('Published root/deep links, next-step routing, refresh and blocked-storage rendering passed.');
} finally { await browser.close(); }
