import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { buildPublicationFiles, publicationResourcePaths } from '../functions/hosting-client.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const styles = { backgroundColor: '#fff', padding: '24', textAlign: 'Left', typography: 'Brand heading', customCss: '', visibility: 'Visible', animation: 'None' };
const asset = { id: 'asset', kind: 'funnel', name: 'Published fixture', image: '/pagefly/coach-portrait.png', settings: { color: '#6544e8', navigation: 'Home, Thanks' }, document: { theme: { font: 'Manrope' }, funnel: { pagesFlow: ['home', 'thanks'], status: 'Published' }, steps: [{ id: 'landing', pageId: 'home' }, { id: 'thanks', pageId: 'thanks' }], pages: [
  { id: 'home', name: 'Home', path: '/start', showHeader: true, showFooter: false, sections: [{ id: 'hero', type: 'Hero', content: { title: 'Published saved heading', body: 'Stored workspace content', src: '/pagefly/coach-portrait.png', button: 'Continue', destinationType: 'Next Step', destination: 'thanks' }, styles }] },
  { id: 'thanks', name: 'Thanks', path: '/thank-you', showHeader: false, showFooter: false, sections: [{ id: 'heading', type: 'Heading', content: { title: 'Thank you from the published page', headingTag: 'H1' }, styles }] },
] } };
asset.document.pages[0].sections.push({ id: 'contact', type: 'Form', content: { title: 'Public contact form', fields: JSON.stringify(['Name', 'Email', 'Message']), button: 'Send public inquiry', successMessage: 'Public inquiry saved' }, styles });
const capture = { tenantId: 'tenant-fixture', captureToken: 'a'.repeat(43), endpoint: 'https://us-central1-gos-app-3c7fb.cloudfunctions.net/captureAssetLead' };
const files = buildPublicationFiles(asset, await readFile('dist/published.html', 'utf8'), 'https://dashboard.test', true, capture);
const resources = publicationResourcePaths(asset, JSON.parse(await readFile('dist/hosting-manifest.json', 'utf8')));
for (const path of resources) files[path] = await readFile('dist' + path);
const browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  const dashboardRequests = [];
  let submission;
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
  await page.route(capture.endpoint, async route => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    submission = route.request().postDataJSON().data;
    await route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify({ result: { accepted: true, leadId: 'public-lead' } }) });
  });
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
    assert.equal(await page.locator('.fb-live-page-nav').evaluate(node => getComputedStyle(node).display), 'flex');
    assert.ok(await page.locator('.fb-live-page-nav').evaluate(node => node.getBoundingClientRect().height >= 50));
  }
  await page.locator('#contact input[name="name"]').fill('Published visitor');
  await page.locator('#contact input[name="email"]').fill('visitor@example.com');
  await page.locator('#contact textarea[name="message"]').fill('Published inquiry');
  await page.getByRole('button', { name: 'Send public inquiry', exact: true }).click();
  await page.getByText('Public inquiry saved', { exact: true }).waitFor();
  assert.equal(submission.tenantId, capture.tenantId); assert.equal(submission.captureToken, capture.captureToken);
  assert.equal(submission.name, 'Published visitor'); assert.equal(submission.message, 'Published inquiry');
  assert.equal(submission.preview, undefined);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.waitForURL('https://site.test/thank-you');
  await page.getByRole('heading', { name: 'Thank you from the published page' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Thank you from the published page' }).waitFor();
  const response = await page.goto('https://site.test/unknown');
  assert.equal(response.status(), 404);
  const standalone = structuredClone(asset);
  standalone.formAsset = true;
  standalone.document.pages = [{ id: 'form-page', name: 'Standalone form', path: '/', showHeader: false, showFooter: false, backgroundColor: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', sections: [{ id: 'custom-form', type: 'Form', styles, content: {
    title: 'Tell us about your project', body: 'All dynamic fields render on this published page.', button: 'Send custom answers', successMessage: 'Custom answers received', themeCardBg: '#ffffff', themeCardBorder: '1px solid #ddd6fe', themeTextColor: '#0f172a',
    customFields: JSON.stringify([
      { id: 'generated-name', label: 'Full name', type: 'text', required: true },
      { id: 'generated-email', label: 'Work email', type: 'email', required: true },
      { id: 'generated-phone', label: 'Phone number', type: 'tel' },
      { id: 'budget', label: 'Budget', type: 'number' },
      { id: 'details', label: 'Project details', type: 'textarea', helperText: 'Include your timeline.' },
      { id: 'industry', label: 'Industry', type: 'select', required: true, options: ['Design','Retail'] },
      { id: 'contact-method', label: 'Preferred contact', type: 'radio', required: true, options: ['Email','Phone'] },
      { id: 'consent', label: 'I agree', type: 'checkbox', required: true }
    ])
  } }] }];
  standalone.document.funnel.pagesFlow = [];
  standalone.document.steps = [];
  Object.assign(files, buildPublicationFiles(standalone, await readFile('dist/published.html','utf8'), 'https://dashboard.test', true, capture));
  await page.goto('https://site.test/');
  await page.getByRole('heading', { name: 'Tell us about your project' }).waitFor();
  assert.equal(await page.locator('.is-form-page').count(), 1);
  await page.getByLabel('Full name').fill('Custom visitor');
  await page.getByLabel('Work email').fill('custom@example.com');
  await page.getByLabel('Phone number').fill('+201234567890');
  await page.getByLabel('Budget').fill('500');
  await page.getByLabel('Project details').fill('Launch next month');
  await page.getByLabel('Industry').selectOption('Design');
  await page.getByRole('radio', { name: 'Email', exact: true }).check();
  await page.getByLabel('I agree').check();
  await page.getByRole('button', { name: 'Send custom answers' }).click();
  await page.getByRole('status').filter({ hasText: 'Custom answers received' }).waitFor();
  assert.equal(submission.name, 'Custom visitor');
  assert.equal(submission.message, 'Launch next month');
  assert.equal(submission.customFields.industry, 'Design');
  assert.equal(submission.customFields['contact-method'], 'Email');
  assert.equal(submission.preview, undefined);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator('.is-form-page').evaluate(node => node.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(dashboardRequests, [], 'published runtime must remain independent of future dashboard deployments');
  console.log('Published root/deep links, next-step routing, refresh and blocked-storage rendering passed.');
} finally { await browser.close(); }
