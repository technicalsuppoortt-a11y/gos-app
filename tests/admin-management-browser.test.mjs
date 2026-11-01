import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const output = fileURLToPath(new URL('../artifacts/admin-management-polish/', import.meta.url));
await mkdir(output, { recursive: true });
const server = await createServer({ plugins: [{ name: 'admin-management-test-backend', enforce: 'pre', resolveId(id, importer) {
  if (importer?.replaceAll('\\', '/').endsWith('/AdminManagementView.tsx') && id.endsWith('/backend/adminManagement')) return fileURLToPath(new URL('./fixtures/admin-management-backend.ts', import.meta.url));
} }], server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route('**/fonts.googleapis.com/**', route => route.abort());
  await page.route('**/fonts.gstatic.com/**', route => route.abort());
  await page.route('**/images.unsplash.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#eeeafd"/></svg>' }));
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = `http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/admin-management.html`;
  async function choose(label, name) { await page.getByRole('combobox', { name: label, exact: true }).click(); await page.getByRole('option', { name, exact: true }).click(); }
  const count = () => page.locator('.alm-table tbody tr').count();
  const shot = name => process.env.ADMIN_UI_SCREENSHOTS === '0' ? Promise.resolve() : page.screenshot({ path: `${output}/${name}.png`, fullPage: true, animations: 'disabled' });
  for (const theme of ['light', 'dark']) {
    for (const module of ['funnels-websites', 'crm', 'booking', 'products']) {
      await page.goto(`${base}?module=${module}&theme=${theme}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('cell', { name: /Sara Owner/ }).first().waitFor();
      assert.equal(await page.getByRole('button', { name: /Edit template|Delete template|Add record/ }).count(), 0);
      assert.equal(await count(), module === 'funnels-websites' ? 6 : 2);
      await shot(`${module}-${theme}`);
      await page.getByRole('textbox', { name: 'Search records' }).fill('Workspace Alpha');
      assert.equal(await count(), module === 'funnels-websites' ? 3 : 1);
      await page.getByRole('button', { name: 'Clear search', exact: true }).click();
      await choose('Workspace', 'Workspace Alpha · a');
      assert.equal(await count(), module === 'funnels-websites' ? 3 : 1);
      await choose('Workspace', 'All workspaces');
      if (module === 'crm') {
        await choose('Pipeline', 'Sales pipeline · Workspace Alpha'); assert.equal(await count(), 1);
        await choose('Workspace', 'Workspace Beta · b'); assert.equal(await count(), 1); // workspace changes reset the relationship filter
        await choose('Workspace', 'All workspaces');
        await choose('All sources', 'Instagram'); assert.equal(await count(), 1);
        await choose('All statuses', 'Confirmed'); assert.equal(await count(), 1);
        await page.getByRole('button', { name: 'Clear all', exact: true }).click();
      }
      if (module === 'funnels-websites') {
        for (const subtype of ['Forms', 'Funnels', 'Websites']) { await choose('Asset subtype', subtype); assert.equal(await count(), 2); }
        await page.getByRole('button', { name: 'Clear all', exact: true }).click();
        await page.evaluate(() => window.__adminLive.updateName());
        await page.getByRole('button', { name: 'Updated production asset', exact: true }).first().waitFor();
        assert.ok(await page.getByRole('cell', { name: 'Draft', exact: true }).count());
      }
      if (module === 'booking') {
        await choose('Calendar', 'Discovery calendar · Workspace Alpha'); assert.equal(await count(), 1);
        await page.getByRole('button', { name: 'Clear all', exact: true }).click();
        await page.getByRole('tab', { name: 'Calendars', exact: true }).click();
        await page.getByRole('cell', { name: 'Calendar host', exact: true }).first().waitFor();
      }
      if (module === 'products') {
        await page.getByRole('cell', { name: /EGP.*299/ }).first().waitFor();
        await page.getByRole('tab', { name: 'Orders audit' }).click(); assert.equal(await count(), 2);
      }
      await page.getByRole('button', { name: 'View details', exact: true }).first().click();
      assert.equal(await page.locator('dialog pre').count(), 0);
      await page.getByRole('heading', { name: 'Identity & ownership', exact: true }).waitFor();
      await shot(`${module}-details-${theme}`);
      if (module === 'funnels-websites') {
        await page.getByRole('button', { name: 'Preview site', exact: true }).click();
        await page.getByText('A precise preview of your saved design', { exact: true }).first().waitFor();
        await choose('Preview page', 'About the team');
        await page.getByRole('button', { name: 'Mobile preview', exact: true }).click();
        await shot(`site-preview-mobile-${theme}`);
        assert.equal(await page.locator('.alm-preview-canvas[inert]').count(), 1);
        await page.keyboard.press('Escape');
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog[open]').count(), 0);
    }
    await page.goto(`${base}?module=templates&theme=${theme}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'AI Assistants', exact: true }).waitFor();
    assert.equal(await page.locator('.alm-category-tabs [role=tab]').count(), 11);
    await page.getByRole('tab', { name: 'All templates', exact: true }).focus();
    await page.keyboard.press('End');
    assert.equal(await page.getByRole('tab', { name: 'Email/SMS/WhatsApp', exact: true }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    await shot(`templates-${theme}`);
    await page.getByRole('button', { name: 'Deactivate', exact: true }).click();
    await page.getByRole('cell', { name: 'Draft', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Activate', exact: true }).click();
    await page.getByRole('button', { name: 'Edit template', exact: true }).click();
    await page.getByLabel('Name', { exact: true }).fill('Edited master');
    await shot(`template-editor-${theme}`);
    await page.getByRole('button', { name: 'Open page builder', exact: true }).click();
    await page.getByLabel('Funnel name', { exact: true }).fill('Builder master');
    await page.getByRole('button', { name: 'Use builder changes', exact: true }).click();
    await page.getByRole('button', { name: 'Save template', exact: true }).click();
    await page.getByRole('button', { name: 'Edited master', exact: true }).waitFor();
    await page.getByRole('button', { name: 'View details', exact: true }).click();
    await page.getByRole('button', { name: 'Preview template', exact: true }).click();
    assert.equal(await page.locator('dialog[open]').count(), 2);
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Delete template', exact: true }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('heading', { name: 'Your library is ready for its first record', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Create template', exact: true }).click();
    await choose('System preset', 'CRM Pipelines · Agency Sales Pipeline');
    await page.getByLabel('Name', { exact: true }).fill('New system template');
    await page.getByRole('switch', { name: 'Active / Published', exact: true }).check();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await page.getByRole('heading', { name: 'Experience flow', exact: true }).waitFor();
    assert.equal(await page.locator('dialog pre').count(), 0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Save template', exact: true }).click();
    await page.getByRole('button', { name: 'New system template', exact: true }).waitFor();
    await page.getByRole('tab', { name: 'CRM Pipelines', exact: true }).click(); assert.equal(await count(), 1);
  }
  await page.goto(`${base}?module=crm`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.__adminLive.grow());
  assert.equal(await count(), 10);
  await page.getByRole('button', { name: 'Next page', exact: true }).click(); assert.equal(await count(), 10);
  await choose('Rows per page', '25 / page'); assert.equal(await count(), 25);
  await page.evaluate(() => window.__adminLive.fail());
  await page.getByRole('alert').waitFor(); assert.equal(await page.getByRole('button', { name: 'Export', exact: true }).isDisabled(), true);
  for (const language of ['en', 'ar']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}?module=templates&theme=dark&language=${language}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.alm-table').waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow on mobile');
    await shot(`templates-mobile-${language}`);
  }
  assert.deepEqual(errors, []);
  console.log('Admin UI checks passed: all five modules, workspace-safe subtype/pipeline/calendar filters, structured details, responsive previews, template CRUD/presets, pagination, errors, light/dark and mobile RTL.');
} finally { await browser?.close(); await server.close(); }
