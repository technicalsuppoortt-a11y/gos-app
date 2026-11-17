import { createRequire } from 'node:module';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core'
);

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
    // SPA fallback
  }
  const indexHtml = await readFile(join(distRoot, 'index.html'));
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(indexHtml);
});

await new Promise(r => staticServer.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${staticServer.address().port}`;
const easternDigitRegex = /[٠-٩۰-۹]/;

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

  // =========================================================================
  // 1) USER DASHBOARD (/dashboard/funnels?tab=templates):
  //    Flagship Multi-Step Funnels + Live Step Templates Switcher + Preview
  // =========================================================================
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push(e.message));

  await page.addInitScript(() => {
    if (window !== window.top) return;
    sessionStorage.setItem('gos.demo-account.active', '1');
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('user_selected_lang', 'en');
    localStorage.setItem('theme', 'light');
  });

  await page.goto(`${baseUrl}/dashboard/funnels?tab=templates`);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.locator('[data-template-id="upklick-funnel-flagship-sell"]').waitFor();
  await page.locator('[data-template-id="upklick-funnel-flagship-audience"]').waitFor();

  // Verify Complete Multi-Step Funnels vs Step Templates switcher on User Templates Gallery
  const userScopeStepsBtn = page.locator('[data-user-funnel-subview="steps"]');
  await userScopeStepsBtn.waitFor();
  await userScopeStepsBtn.click();

  await page.locator('.sys-user-step-catalog').waitFor();
  assert.equal(await page.locator('.sys-user-step-catalog .sys-tpl-card').count(), 10, 'All 10 upgraded Step Templates appear in User Catalog');

  // Filter by Category pills (Opt-in: 3, Sales: 3, Order Form: 2, Thank You: 2)
  for (const [cat, expectedCount] of [
    ['Opt-in', 3],
    ['Sales', 3],
    ['Order Form', 2],
    ['Thank You', 2],
  ]) {
    await page.locator(`[data-step-cat="${cat}"]`).click();
    assert.equal(
      await page.locator('.sys-user-step-catalog .sys-tpl-card').count(),
      expectedCount,
      `${cat} category shows ${expectedCount} step templates`
    );
  }

  // Reset to All Steps -> verify live rendered thumbnails & Preview opening in a NEW TAB (target="_blank")
  await page.locator('[data-step-cat="Opt-in"]').click();
  await page.locator('.sys-user-step-catalog .template-design-thumbnail').first().waitFor();

  const firstPreviewLink = page.locator('.sys-user-step-catalog a.sys-step-preview-link').first();
  assert.equal(await firstPreviewLink.getAttribute('target'), '_blank', 'Step template Preview link uses target="_blank"');
  const previewHref = await firstPreviewLink.getAttribute('href');
  assert.match(previewHref || '', /^\/template-preview\/gft-optin-curiosity\?source=step&lang=en$/);
  assert.equal(await page.getByRole('dialog').count(), 0, 'Zero constrained preview modal in User Step Catalog');

  // Verify standalone /template-preview/:id?source=step route in dist/ across Desktop, Tablet, Mobile & EN/AR
  const previewTab = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  previewTab.setDefaultTimeout(20000);
  previewTab.on('pageerror', e => errors.push(e.message));
  await previewTab.addInitScript(() => {
    if (window !== window.top) return;
    sessionStorage.setItem('gos.demo-account.active', '1');
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('user_selected_lang', 'en');
    localStorage.setItem('theme', 'light');
  });
  try {
    await previewTab.goto(`${baseUrl}${previewHref}`);
    await previewTab.locator('.template-preview-canvas .fb-site-frame').waitFor();

    // Test responsive Desktop / Tablet / Mobile viewports in the standalone preview tab
    await previewTab.getByRole('button', { name: 'Tablet preview', exact: true }).click();
    await previewTab.getByRole('button', { name: 'Mobile preview', exact: true }).click();
    const mobileFits = await previewTab.locator('.template-preview-canvas').evaluate(
      el => el.scrollWidth <= el.clientWidth + 2
    );
    assert.ok(mobileFits, 'Step template mobile preview has zero horizontal overflow');

    // Switch preview language to Arabic (RTL) & verify Western digits + clean form (zero legacy FitZone copy)
    await previewTab.locator('.template-preview-devices button').filter({ hasText: 'العربية' }).click();
    await previewTab.waitForFunction(
      () => document.querySelector('.template-preview-page')?.getAttribute('dir') === 'rtl'
    );
    const arPreviewText = (await previewTab.locator('.template-preview-canvas').textContent()) || '';
    assert.ok(/[ء-ي]/.test(arPreviewText), 'Arabic step preview renders Arabic copy');
    assert.equal(easternDigitRegex.test(arPreviewText), false, 'Step template Arabic preview uses strictly Western digits (0-9)');
    assert.equal(arPreviewText.includes('أسبوعك الأول مجاناً'), false, 'Zero legacy FitZone lead-capture text');

    // Check representative Sales, Order Form, and Thank You step templates on Mobile in Arabic RTL
    for (const tplId of ['gft-sales-flagship', 'gft-order-purchase', 'gft-thanks-order']) {
      await previewTab.goto(`${baseUrl}/template-preview/${tplId}?source=step&lang=ar`);
      await previewTab.locator('.template-preview-canvas .fb-site-frame').waitFor();
      await previewTab.locator('.template-preview-controls .template-preview-devices button').nth(2).click();
      const fits = await previewTab.locator('.template-preview-canvas').evaluate(
        el => el.scrollWidth <= el.clientWidth + 2
      );
      assert.ok(fits, `${tplId} Arabic mobile preview fits without horizontal overflow`);
      const text = (await previewTab.locator('.template-preview-canvas').textContent()) || '';
      assert.equal(easternDigitRegex.test(text), false, `${tplId} Arabic preview uses strictly Western numerals (0-9)`);
    }
  } finally {
    await previewTab.close();
  }

  // Strict Single-Step Scope Check: Installing an Opt-in Step Template creates ONLY 1 isolated step (NOT a multi-step funnel)
  await page.locator('[data-step-template-id="gft-optin-curiosity"]').click();
  await page.locator('.fb-editor-header').waitFor();
  await page.getByRole('button', { name: 'Back to overview', exact: true }).click();
  await page.locator('.sys-workspace').waitFor();
  assert.equal(await page.locator('.sys-step-item').count(), 1, 'Step template installs strictly 1 isolated step');

  // Return to /dashboard/funnels?tab=templates -> Complete Multi-Step Funnels -> verify Preview opens in new tab & installs 3 pre-linked steps
  await page.goto(`${baseUrl}/dashboard/funnels?tab=templates`);
  const fullPreviewLink = page.locator('.pf-template-entry').filter({ has: page.locator('[data-template-id="upklick-funnel-flagship-sell"]') }).locator('a.pf-template-preview-action');
  assert.equal(await fullPreviewLink.getAttribute('target'), '_blank');
  await page.locator('[data-template-id="upklick-funnel-flagship-sell"]').click();
  await page.locator('.fb-editor-header').waitFor();
  await page.getByRole('button', { name: 'Back to overview', exact: true }).click();
  await page.locator('.sys-workspace').waitFor();
  assert.equal(await page.locator('.sys-step-item').count(), 3, 'Flagship Sell Funnel installs 3 pre-linked steps');

  // =========================================================================
  // 2) "CREATE WITH AI" INTERACTIVE BRIEF -> MULTI-STEP FUNNEL (ENGLISH LTR)
  // =========================================================================
  await page.goto(`${baseUrl}/dashboard/funnels`);
  await page.getByRole('button', { name: 'Create Funnel', exact: true }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'Create Funnel' });
  await createDialog.waitFor();

  await createDialog.getByLabel('Funnel name').fill('AI SaaS Accelerator Funnel');
  await createDialog.locator('[data-goal-id="ai"]').click();
  // Verify button says "Save" and opens the AI Funnel Architect Wizard
  assert.match((await createDialog.locator('button[type="submit"]').textContent()) || '', /Save/);
  await createDialog.locator('button[type="submit"]').click();

  const aiModal = page.locator('[data-testid="ai-funnel-architect-modal"]');
  await aiModal.waitFor();

  await aiModal.locator('[data-testid="ai-brief-business-name"]').fill('ScalePulse Cloud');
  await aiModal.locator('[data-testid="ai-brief-niche"]').fill('B2B SaaS Growth');
  await aiModal.locator('[data-ai-goal="sale"]').click();
  await aiModal.locator('[data-testid="ai-brief-audience"]').fill('SaaS founders struggling with trial-to-paid conversion');
  await aiModal.locator('[data-testid="ai-brief-offer"]').fill('Automated Onboarding Blueprint & Course');
  await aiModal.locator('[data-testid="ai-brief-price"]').fill('197');
  await aiModal.locator('[data-ai-lang="en"]').click();
  await aiModal.locator('[data-ai-tone="persuasive"]').click();
  await aiModal.locator('[data-testid="ai-architect-submit"]').click();

  // Verify AI Funnel opens directly in Funnel Workspace with 3 pre-linked, pre-configured steps
  await page.locator('.sys-workspace').waitFor();
  assert.equal(await page.locator('.sys-step-item').count(), 3, 'AI Sale Funnel creates 3 pre-linked steps');
  await page.locator('.sys-step-config-stack').waitFor();
  await page.close();

  // =========================================================================
  // 3) ARABIC (RTL) + DARK MODE: "CREATE WITH AI" BRIEF + WESTERN DIGITS (0-9)
  // =========================================================================
  const arPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  arPage.setDefaultTimeout(20000);
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

  const arCreate = arPage.getByRole('dialog');
  await arCreate.waitFor();
  await arCreate.locator('input').first().fill('مسار الأكاديمية الذكي');
  await arCreate.locator('[data-goal-id="ai"]').click();
  await arCreate.locator('button[type="submit"]').click();

  const arAiModal = arPage.locator('[data-testid="ai-funnel-architect-modal"]');
  await arAiModal.waitFor();
  assert.equal(await arAiModal.getAttribute('dir'), 'rtl');

  await arAiModal.locator('[data-testid="ai-brief-business-name"]').fill('أكاديمية قمة الرقمية');
  await arAiModal.locator('[data-testid="ai-brief-niche"]').fill('التدريب والاستشارات');
  await arAiModal.locator('[data-ai-goal="audience"]').click();
  await arAiModal.locator('[data-testid="ai-brief-audience"]').fill('المدربون وأصحاب المشاريع الراغبون في مضاعفة قائمة عملائهم');
  await arAiModal.locator('[data-testid="ai-brief-offer"]').fill('الدليل التطبيقي لبناء مسارات التحويل');
  await arAiModal.locator('[data-testid="ai-brief-price"]').fill('٠');
  // Verify input immediately normalized Eastern digit ٠ -> Western 0
  assert.equal(await arAiModal.locator('[data-testid="ai-brief-price"]').inputValue(), '0');
  await arAiModal.locator('[data-ai-lang="ar"]').click();
  await arAiModal.locator('[data-ai-tone="urgent"]').click();
  await arAiModal.locator('[data-testid="ai-architect-submit"]').click();

  await arPage.locator('.sys-workspace').waitFor();
  assert.equal(await arPage.locator('.sys-workspace').getAttribute('dir'), 'rtl');
  assert.equal(await arPage.locator('.sys-step-item').count(), 2, 'AI Audience Funnel in Arabic creates 2 pre-linked steps');

  // Open Step 1 in Page Builder and verify Arabic copy + zero Eastern digits
  await arPage.locator('.sys-step-config-stack button.aw-primary').first().click();
  await arPage.locator('.fb-editor-header').waitFor();
  const canvasText = await arPage.locator('.fb-site-window').first().textContent();
  assert.ok(/[ء-ي]/.test(canvasText || ''), 'Generated step canvas contains natural Arabic copy');
  assert.equal(easternDigitRegex.test(canvasText || ''), false, 'Generated Arabic step canvas uses strictly Western digits (0-9)');
  await arPage.close();

  // =========================================================================
  // 4) SUPER ADMIN & REAL-SESSION NEW-TAB POPUP (target="_blank") VERIFICATION
  // =========================================================================
  viteServer = await createServer({
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'sa-admin-mgmt-harness',
        configureServer(vite) {
          vite.middlewares.use(async (req, res, next) => {
            const urlPath = (req.url || '/').split('?')[0];
            if (
              urlPath !== '/__sa-mgmt' &&
              urlPath !== '/__user-steps' &&
              urlPath !== '/admin-preview' &&
              !urlPath.startsWith('/template-preview/')
            ) {
              return next();
            }
            res.setHeader('Content-Type', 'text/html');
            res.end(
              await vite.transformIndexHtml(
                req.url || '/__sa-mgmt',
                `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module">
                  import React from 'react';
                  import { createRoot } from 'react-dom/client';
                  import { Provider } from 'react-redux';
                  import { BrowserRouter, Routes, Route } from 'react-router-dom';
                  import { store } from '/src/store/index.ts?account-demo';
                  import { loginSuccess } from '/src/store/slices/authSlice.ts?account-demo';
                  import { setLanguage } from '/src/store/slices/uiSlice.ts?account-demo';
                  import i18n from '/src/i18n/i18n.ts?account-demo';
                  import { AdminManagementView } from '/src/pages/admin/AdminManagementView.tsx?account-demo';
                  import { AdminPreviewPage } from '/src/pages/admin/AdminPreviewPage.tsx?account-demo';
                  import { UserStepTemplatesCatalog } from '/src/pages/UserStepTemplatesCatalog.tsx?account-demo';
                  import { TemplatePreviewPage } from '/src/pages/TemplatePreviewPage.tsx?account-demo';
                  import '/src/index.css';
                  store.dispatch(setLanguage('en'));
                  await i18n.changeLanguage('en');
                  store.dispatch(loginSuccess({
                    user: { id: 'sa-1', name: 'Super Admin', email: 'sa@upklick.com' },
                    role: 'SUPER_ADMIN',
                    tenant: null,
                    token: 'local-demo-only-not-a-firebase-token',
                  }));
                  createRoot(document.getElementById('root')).render(
                    React.createElement(Provider, { store },
                      React.createElement(BrowserRouter, null,
                        React.createElement(Routes, null,
                          React.createElement(Route, { path: '/__sa-mgmt', element: React.createElement(AdminManagementView, { moduleId: 'templates' }) }),
                          React.createElement(Route, { path: '/admin-preview', element: React.createElement(AdminPreviewPage) }),
                          React.createElement(Route, { path: '/__user-steps', element: React.createElement(UserStepTemplatesCatalog, { install: () => {} }) }),
                          React.createElement(Route, { path: '/template-preview/:templateId', element: React.createElement(TemplatePreviewPage) })
                        )
                      )
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
  const harnessOrigin = `http://127.0.0.1:${viteServer.httpServer.address().port}`;

  // 4a) Real non-demo User Step Templates Gallery: clicking Preview opens a REAL new browser tab (popup)
  const realUserPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  realUserPage.setDefaultTimeout(20000);
  realUserPage.on('pageerror', e => errors.push(e.message));
  await realUserPage.goto(`${harnessOrigin}/__user-steps`);
  await realUserPage.locator('.sys-user-step-catalog a.sys-step-preview-link').first().waitFor();
  const [userPopup] = await Promise.all([
    realUserPage.waitForEvent('popup'),
    realUserPage.locator('.sys-user-step-catalog a.sys-step-preview-link').first().click(),
  ]);
  try {
    assert.match(userPopup.url(), /\/template-preview\/gft-optin-curiosity\?source=step&lang=en$/);
    await userPopup.locator('.template-preview-canvas .fb-site-frame').waitFor();
    assert.equal(await realUserPage.getByRole('dialog').count(), 0, 'User Preview opens in new tab without modal');
  } finally {
    await userPopup.close();
  }
  await realUserPage.close();

  // 4b) Super Admin Funnels -> Step Templates: all 10 templates + Preview opens in a REAL new browser tab (popup)
  const saPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  saPage.setDefaultTimeout(20000);
  saPage.on('pageerror', e => errors.push(e.message));
  await saPage.goto(`${harnessOrigin}/__sa-mgmt`);
  await saPage.getByRole('tab', { name: /Funnels/i }).click();
  await saPage.locator('[data-funnel-subview="steps"]').waitFor();
  await saPage.locator('[data-funnel-subview="steps"]').click();
  await saPage.getByRole('heading', { name: 'Global Funnel Step Templates Library' }).waitFor();
  assert.equal(await saPage.locator('.sys-tpl-card').count(), 10, 'Super Admin Funnels -> Step Templates shows all 10 templates');
  const [saPopup] = await Promise.all([
    saPage.waitForEvent('popup'),
    saPage.locator('.sys-tpl-card a[target="_blank"]').first().click(),
  ]);
  try {
    assert.match(saPopup.url(), /\/admin-preview\?template=gft-optin-curiosity&source=step&lang=en$/);
    await saPopup.locator('.template-preview-canvas .fb-site-frame').waitFor();
  } finally {
    await saPopup.close();
  }
  await saPage.close();

  assert.deepEqual(errors, [], `Zero runtime page errors: ${errors.join('; ')}`);
  console.log('✓ All Flagship Funnels, 10 Bilingual Step Templates, Super Admin Sync, and AI Funnel Architect E2E checks passed!');
} finally {
  await browser?.close();
  await viteServer?.close();
  staticServer.close();
}
