import { createRequire } from 'node:module';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');

const distRoot = resolve('dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const staticServer = http.createServer(async (req, res) => {
  try {
    const urlPath = new URL(req.url || '/', 'http://127.0.0.1').pathname;
    const candidate = resolve(distRoot, '.' + urlPath);
    if (!candidate.startsWith(distRoot)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const ext = extname(candidate).toLowerCase();
    if (ext) {
      const data = await readFile(candidate);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
      return;
    }
  } catch {
    // Fall back to SPA index.html for client-side routes
  }
  const indexHtml = await readFile(join(distRoot, 'index.html'));
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(indexHtml);
});

await new Promise(r => staticServer.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${staticServer.address().port}`;

let browser;
let viteServer;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.FUNNEL_BROWSER_PATH ||
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });

  const errors = [];

  // -------------------------------------------------------------------------
  // PART A: English (LTR) + Light Mode — Systeme.io Funnel Flow, CRM Routing,
  //         Websites Per-Element CRM Routing, Page Builder Button Actions,
  //         and Existing Multi-Step Funnel Templates Regression Check
  // -------------------------------------------------------------------------
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));

  await page.addInitScript(() => {
    if (window !== window.top) return;
    sessionStorage.setItem('gos.demo-account.active', '1');
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('user_selected_lang', 'en');
    localStorage.setItem('theme', 'light');
  });

  await page.goto(`${baseUrl}/dashboard/funnels`);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: 'Create Funnel', exact: true }).first().waitFor();

  // 0) Zero-Regression Check on Existing Pre-Seeded User Funnels
  assert.ok(
    (await page.locator('.aw-asset-card').count()) >= 2,
    'Existing user funnels remain intact with zero data loss'
  );

  // 1) Open Create Funnel Modal & create a "Sell" Funnel (Order Form + Thank You Page)
  await page.getByRole('button', { name: 'Create Funnel', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Create Funnel' });
  await dialog.waitFor();

  await dialog.getByLabel('Funnel name').fill('Systeme Sell Funnel');
  assert.equal(await dialog.locator('[data-goal-id="audience"]').count(), 1);
  assert.equal(await dialog.locator('[data-goal-id="sell"]').count(), 1);
  assert.equal(await dialog.locator('[data-goal-id="custom"]').count(), 1);
  assert.equal(await dialog.locator('[data-goal-id="ai"]').count(), 1);

  await dialog.locator('[data-goal-id="sell"]').click();
  await dialog.locator('button[type="submit"]').click();

  // Navigates directly to Funnel Step Workspace (/dashboard/funnels/:id)
  await page.locator('.sys-workspace').waitFor();
  assert.equal(await page.locator('.sys-step-item').count(), 2, 'Sell funnel creates 2 default steps');
  const stepNames = await page.locator('.sys-step-item .sys-step-name').allTextContents();
  assert.deepEqual(stepNames, ['Order Form', 'Thank You Page']);

  // Verify Template Picker opens on new unconfigured Order Form step, then deep-clone a template
  await page.locator('.sys-template-picker-wrap').waitFor();
  assert.ok((await page.locator('.sys-tpl-card').count()) >= 2, 'Order Form templates are displayed');
  await page.locator('.sys-tpl-card .sys-use-inline').first().click();

  // Configuration workspace is active for Order Form
  await page.locator('.sys-step-config-stack').waitFor();

  // Requirement 3: Conditional CRM Lead Routing IS displayed on Order Form (contains a Form)
  assert.equal(
    await page.locator('[data-testid="funnel-step-crm-routing"]').count(),
    1,
    'CRM Lead Routing appears on Order Form step containing a Form'
  );

  // Verify Offer Type (Digital vs Physical)
  const digitalRadio = page.getByRole('radio', { name: /Digital Product/i });
  await digitalRadio.click();
  assert.equal(await digitalRadio.getAttribute('aria-checked'), 'true');

  // Switch to Step 2 (Thank You Page) -> skip template picker -> verify CRM Lead Routing is HIDDEN
  await page.locator('.sys-step-item').nth(1).locator('.sys-step-select-btn').click();
  await page.locator('.sys-template-picker-wrap').waitFor();
  await page.getByRole('button', { name: /Skip & Configure Step/i }).click();
  await page.locator('.sys-step-config-stack').waitFor();
  assert.equal(
    await page.locator('[data-testid="funnel-step-crm-routing"]').count(),
    0,
    'CRM Lead Routing is hidden on Thank You Page with no Form or Calendar'
  );

  // Check Step Workspace Tabs (Automation Rules, A/B Test, Stats, Leads, Sales, Deadline Settings)
  for (const tabLabel of [
    'Automation Rules',
    'A/B Test',
    'Stats',
    'Leads',
    'Sales',
    'Deadline Settings',
  ]) {
    await page.getByRole('tab', { name: tabLabel, exact: true }).click();
  }
  await page.getByRole('tab', { name: 'Configuration', exact: true }).click();

  // Check Fallback Inactive Page
  await page.locator('.sys-inactive-btn').click();
  await page.locator('.sys-inactive-workspace').waitFor();

  // Switch back to Step 1 (Order Form) and open Visual Page Builder ("Edit Step")
  await page.locator('.sys-step-item').first().locator('.sys-step-select-btn').click();
  await page.getByRole('button', { name: 'Edit Step', exact: true }).click();
  await page.locator('.fb-editor-header').waitFor();

  // Verify static global CRM box at top of funnel builder was removed
  assert.equal(await page.locator('.fn-crm-routing-shell').count(), 0);

  // Requirement 4: Add a Button element in Page Builder & verify upgraded Action Types
  await page.locator('.pf-icon-rail').getByRole('button', { name: 'Elements', exact: true }).click();
  await page.locator('.fb-block-button').filter({ hasText: /^Button$/ }).click();
  await page.locator('.pf-variant-card').first().click();
  const btnNode = page.locator('[data-element-type="Button"]').last();
  await btnNode.click();
  const btnToolbar = page.getByRole('toolbar', { name: 'Button selection actions' });
  if ((await btnToolbar.count()) > 0) {
    await btnToolbar.getByRole('button', { name: 'Settings for selected Button' }).click();
  }
  const actionTrigger = page.getByLabel('Action destination');
  await actionTrigger.waitFor();
  await actionTrigger.click();
  const optionTexts = await page.getByRole('option').allTextContents();
  for (const expectedLabel of [
    'Go to Next Funnel Step',
    'Go to Specific Page / Step',
    'External URL',
    'Submit Form / Trigger Order',
    'Scroll to Section',
    'Open Popup / Modal',
    'Download File',
  ]) {
    assert.ok(
      optionTexts.some(t => t.includes(expectedLabel)),
      `Action dropdown includes "${expectedLabel}"`
    );
  }
  await page.keyboard.press('Escape');

  // Requirement 3 (Websites): Per-Element CRM Lead Routing (Form + Calendar independent)
  await page.evaluate(() => {
    history.pushState(null, '', '/dashboard/websites');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('button', { name: 'Create Website', exact: true }).first().click();
  const siteDialog = page.getByRole('dialog', { name: 'Create a new page' });
  await siteDialog.waitFor();
  await siteDialog.locator('input').first().fill('Multi-Capture Agency Site');
  await siteDialog.getByRole('button', { name: /Create blank page/i }).click();
  await page.locator('.fb-editor-header').waitFor();

  // Add a Form element and verify its independent CRM Lead Routing in Inspector
  await page.locator('.pf-icon-rail').getByRole('button', { name: 'Elements', exact: true }).click();
  await page.locator('.fb-block-button').filter({ hasText: /^Form$/ }).click();
  await page.locator('.pf-variant-card').first().click();
  await page.locator('[data-element-type="Form"]').last().click();
  await page.locator('.fb-element-crm-routing').waitFor();

  // Add a Booking Calendar element on the SAME website page & verify its independent CRM Lead Routing
  await page.locator('.fb-block-button').filter({ hasText: /^Booking$/ }).click();
  await page.locator('.pf-variant-card').first().click();
  await page.locator('[data-element-type="Booking"]').last().click();
  await page.locator('.fb-element-crm-routing').waitFor();

  // Save draft & return to Website Overview -> Global Settings -> verify independent per-element CRM routing cards
  await page.getByRole('button', { name: /Save Draft/i }).click();
  await page.getByRole('button', { name: 'Back to overview', exact: true }).click();
  await page.getByRole('button', { name: /Global Settings/i }).click();
  await page.getByText('Per-Element CRM Lead Routing').waitFor();
  assert.ok(
    (await page.locator('[data-testid^="website-element-routing-"]').count()) >= 2,
    'Website renders independent CRM Lead Routing cards for Form and Booking Calendar'
  );
  await page.close();

  // -------------------------------------------------------------------------
  // PART B: Arabic (RTL) + Dark Mode — Build an Audience & Custom Flows
  // -------------------------------------------------------------------------
  const arPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  arPage.setDefaultTimeout(15000);
  arPage.on('pageerror', e => errors.push(e.message));
  await arPage.addInitScript(() => {
    if (window !== window.top) return;
    sessionStorage.setItem('gos.demo-account.active', '1');
    localStorage.setItem('i18nextLng', 'ar');
    localStorage.setItem('user_selected_lang', 'ar');
    localStorage.setItem('theme', 'dark');
  });

  await arPage.goto(`${baseUrl}/dashboard/funnels`);
  await arPage.locator('.aw-topbar .aw-primary').first().waitFor();
  await arPage.locator('.aw-topbar .aw-primary').first().click();

  const arDialog = arPage.getByRole('dialog');
  await arDialog.waitFor();
  assert.equal(await arDialog.locator('form.sys-create-modal').getAttribute('dir'), 'rtl');

  // Create "Build an Audience" (بناء جمهور) funnel in Arabic
  await arDialog.locator('input').first().fill('مسار بناء الجمهور');
  await arDialog.locator('[data-goal-id="audience"]').click();
  await arDialog.locator('button[type="submit"]').click();

  await arPage.locator('.sys-workspace').waitFor();
  assert.equal(await arPage.locator('.sys-workspace').getAttribute('dir'), 'rtl');
  assert.equal(await arPage.locator('.sys-step-item').count(), 2);
  const arSteps = await arPage.locator('.sys-step-item .sys-step-name').allTextContents();
  assert.equal(arSteps[0], 'صفحة الاشتراك');
  assert.match(arSteps[1], /صفحة الشكر/);

  // Create "Custom" (مخصص) empty funnel
  await arPage.goto(`${baseUrl}/dashboard/funnels`);
  await arPage.locator('.aw-topbar .aw-primary').first().click();
  await arPage.getByRole('dialog').waitFor();
  await arPage.getByRole('dialog').locator('input').first().fill('مسار مخصص فارغ');
  await arPage.getByRole('dialog').locator('[data-goal-id="custom"]').click();
  await arPage.getByRole('dialog').locator('button[type="submit"]').click();

  await arPage.locator('.sys-empty-steps').waitFor();
  assert.equal(await arPage.locator('.sys-step-item').count(), 0, 'Custom funnel starts with 0 steps');
  await arPage.close();

  // -------------------------------------------------------------------------
  // PART C: Superadmin Global Funnel Templates Manager
  // -------------------------------------------------------------------------
  viteServer = await createServer({
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'sa-funnel-templates-harness',
        configureServer(vite) {
          vite.middlewares.use('/__sa-templates', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html');
            res.end(
              await vite.transformIndexHtml(
                '/__sa-templates',
                `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module">
                  import React from 'react';
                  import { createRoot } from 'react-dom/client';
                  import { Provider } from 'react-redux';
                  import { MemoryRouter } from 'react-router-dom';
                  import { store } from '/src/store/index.ts?account-demo';
                  import { loginSuccess } from '/src/store/slices/authSlice.ts?account-demo';
                  import { setLanguage } from '/src/store/slices/uiSlice.ts?account-demo';
                  import i18n from '/src/i18n/i18n.ts?account-demo';
                  import { SuperAdminFunnelTemplates } from '/src/pages/admin/SuperAdminFunnelTemplates.tsx?account-demo';
                  import '/src/index.css';
                  store.dispatch(setLanguage('en'));
                  await i18n.changeLanguage('en');
                  window.setAdminLang = async lng => { store.dispatch(setLanguage(lng)); await i18n.changeLanguage(lng); };
                  store.dispatch(loginSuccess({
                    user: { id: 'sa-1', name: 'Super Admin', email: 'sa@upklick.com' },
                    role: 'SUPER_ADMIN',
                    tenant: null,
                    token: 'local-demo-only-not-a-firebase-token',
                  }));
                  createRoot(document.getElementById('root')).render(
                    React.createElement(Provider, { store },
                      React.createElement(MemoryRouter, null, React.createElement(SuperAdminFunnelTemplates))
                    )
                  );
                </script></body></html>`
              )
            );
          });
        },
      },
    ],
  });
  await viteServer.listen();
  const vitePort = viteServer.httpServer.address().port;

  const saPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  saPage.setDefaultTimeout(25000);
  saPage.on('pageerror', e => errors.push(e.message));
  await saPage.goto(`http://127.0.0.1:${vitePort}/__sa-templates`);
  await saPage.getByRole('heading', { name: 'Global Funnel Step Templates Library' }).waitFor();
  assert.ok(
    (await saPage.locator('.sys-tpl-card').count()) >= 8,
    'Superadmin sees all starter global funnel templates'
  );
  for (const cat of ['Opt-in', 'Sales', 'Order Form', 'Thank You']) {
    assert.ok(
      (await saPage.locator(`.sys-tpl-card[data-template-category="${cat}"]`).count()) >= 1,
      `Superadmin library includes ${cat} templates`
    );
  }
  await saPage.close();

  assert.deepEqual(errors, [], 'Zero uncaught page errors across EN/AR, Light/Dark, User & Superadmin flows');
  console.log('ALL E2E CHECKS PASSED: Create Funnel goals, Step Workspace, Superadmin global_funnel_templates, Conditional & Per-Element CRM routing, Button Actions, AR/RTL & Dark mode!');
} finally {
  await browser?.close();
  await viteServer?.close();
  await new Promise(r => staticServer.close(r));
}
