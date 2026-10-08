// Set PLAYWRIGHT_MODULE to playwright-core's installed location if it is outside node_modules.
// Set FUNNEL_BROWSER_PATH to use a Chromium browser other than Windows Edge.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const server = await createServer({ server: { host: '127.0.0.1', port: 5197, strictPort: true } });
const screenshotDir = process.env.FUNNEL_SCREENSHOT_DIR || await mkdtemp(join(tmpdir(), 'gos-funnel-qa-'));
await server.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('gos.auth', JSON.stringify({ user: { id: 'test', email: 'test@example.com', name: 'Mohamed Joe' }, role: 'USER', token: 'test', tenant: { id: 'test', name: 'GOS' } }));
  });
  async function settle() {
    await page.waitForFunction(() => {
      const el = document.querySelector('.layout-route-content');
      return el && Number(getComputedStyle(el).opacity) === 1;
    });
  }
  async function screenshot(name) {
    await settle();
    await page.screenshot({ path: join(screenshotDir, `${name}.png`), fullPage: true });
  }
  await page.goto('http://127.0.0.1:5197/dashboard/funnels');
  await page.locator('.aw-asset-card').first().waitFor();
  assert.equal(await page.locator('.aw-asset-card').count(), 6);
  assert.equal(await page.locator('.fb-editor-header').count(), 0);
  await screenshot('funnels');
  await page.getByPlaceholder('Search funnels...').fill('Nutrition');
  assert.equal(await page.locator('.aw-asset-card').count(), 1);
  await page.getByPlaceholder('Search funnels...').fill('');
  await page.getByRole('button', { name: 'Open Fitness Coaching Funnel', exact: true }).click();
  await page.locator('.aw-step-card').first().waitFor();
  assert.equal(await page.locator('.aw-step-card').count(), 5);
  await screenshot('overview');
  await page.getByRole('button', { name: 'Edit Step', exact: true }).nth(1).click();
  await page.locator('.fb-editor-header').waitFor();
  await settle();
  const pageName = page.locator('.fb-inspector-scroll input').first();
  assert.equal(await pageName.inputValue(), 'Lead Form');
  await pageName.fill('Personalized Lead Form');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal(await pageName.inputValue(), 'Lead Form');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  assert.equal(await pageName.inputValue(), 'Personalized Lead Form');
  await page.getByRole('button', {name:'Select funnel step',exact:true}).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  assert.equal(await pageName.inputValue(),'Landing Page');
  await page.getByRole('button', {name:'Select funnel step',exact:true}).click();
  await page.getByRole('menuitemradio').nth(1).click();
  assert.equal(await pageName.inputValue(),'Personalized Lead Form');
  await screenshot('editor');
  await page.getByRole('button', { name: 'Back to overview', exact: true }).click();
  await page.locator('.aw-step-card').first().waitFor();
  await page.reload();
  await page.locator('.aw-step-card').first().waitFor();
  assert.ok((await page.locator('.aw-step-card').nth(1).innerText()).includes('Personalized Lead Form'));
  await page.getByRole('button', { name: 'Reorder Steps', exact: false }).click();
  await page.locator('.aw-reorder-buttons').first().getByRole('button', { name: 'Move →', exact: true }).click();
  assert.ok((await page.locator('.aw-step-card').first().innerText()).includes('Personalized Lead Form'));
  await page.getByRole('button', { name: 'Add Step', exact: true }).first().click();
  let modal = page.getByRole('dialog');
  await modal.getByLabel('Name', { exact: true }).fill('Survey');
  await modal.getByLabel('URL path').fill('/survey');
  await modal.getByLabel('Step type').click();
  await page.getByRole('option', {name:'Form',exact:true}).click();
  await modal.getByRole('button', { name: 'Add Step', exact: true }).click();
  assert.equal(await page.locator('.aw-step-card').count(), 6);
  await page.getByRole('button', { name: 'Websites', exact: true }).click();
  await page.locator('.aw-templates').waitFor();
  assert.equal(await page.locator('.aw-asset-card').count(), 4);
  await screenshot('websites');
  await page.getByRole('button', { name: 'Open FitZone Website', exact: true }).click();
  await page.locator('.aw-page-row').first().waitFor();
  assert.equal(await page.locator('.aw-page-row').count(), 7);
  await screenshot('website-overview');
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  assert.ok((await page.locator('.aw-live-preview').getAttribute('class')).includes('mobile'));
  await page.locator('.aw-page-row').nth(1).locator('.aw-page-select').click();
  await page.getByRole('button', { name: 'Edit Page', exact: true }).click();
  await page.locator('.fb-editor-header').waitFor();
  await settle();
  assert.equal(await page.locator('.fb-inspector-scroll input').first().inputValue(), 'About');
  await page.getByRole('button', { name: 'Back to overview', exact: true }).click();
  await page.locator('.aw-page-row').first().waitFor();
  await page.getByRole('button', { name: 'Domains', exact: true }).click();
  await page.locator('tbody tr').first().waitFor();
  await screenshot('domains');
  await page.getByRole('button', { name: 'Connect Domain', exact: true }).first().click();
  modal = page.getByRole('dialog');
  await modal.getByLabel('Domain name').fill('new-example.com');
  await modal.getByLabel('Connect to').click();
  await page.getByRole('option', {name:'Funnel · Fitness Coaching Funnel',exact:true}).click();
  await modal.getByRole('button', { name: 'Continue', exact: true }).click();
  await modal.getByRole('button', { name: 'Continue to verification' }).click();
  await modal.getByRole('button', { name: 'Save pending domain' }).click();
  assert.equal(await page.locator('tbody tr').count(), 6);
  assert.ok((await page.locator('tbody tr').last().innerText()).includes('Pending'));
  await page.getByLabel('Set coachgrowth.com as default', { exact: true }).click();
  assert.equal(await page.getByLabel('Set coachgrowth.com as default', { exact: true }).getAttribute('aria-checked'), 'true');
  assert.equal(await page.getByLabel('Set fitzone.com as default', { exact: true }).getAttribute('aria-checked'), 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot('domains-mobile');
  // The existing shared shell retains its desktop sidebar margin on mobile.
  // Verify that the new module's content stays inside the space supplied by that shell.
  const bounds = await page.locator('.aw-workspace').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth }));
  assert.ok(bounds.content <= bounds.width + 1, JSON.stringify(bounds));
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: asset-first navigation, filtering, selected page, undo/redo, reload persistence, reordering, add-step, device previews, pending DNS flow, default domain and mobile containment.');
  console.log(`Screenshots: ${screenshotDir}`);
} finally {
  await browser?.close();
  await server.close();
}
