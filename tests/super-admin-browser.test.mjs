import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-super-admin-test', plugins: [react(), {
  name: 'super-admin-fixture', enforce: 'pre',
  load(id) {
    const path = id.replaceAll('\\', '/');
    if (path.endsWith('/src/backend/session.tsx')) return 'export const logoutFirebase=async()=>{};';
    if (path.endsWith('/src/components/layout/CreditBadge.tsx')) return 'export const CreditBadge=()=>null;';
  },
  configureServer(vite) { vite.middlewares.use('/__super-admin', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__super-admin', `<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
      import React from 'react';import {createRoot} from 'react-dom/client';import {Provider} from 'react-redux';import {createMemoryRouter,RouterProvider} from 'react-router-dom';
      import {store} from '/src/store/index.ts';import {setLanguage} from '/src/store/slices/uiSlice.ts';import i18n from '/src/i18n/i18n.ts';
      import {SuperAdminLayout} from '/src/components/layout/SuperAdminLayout.tsx';import {SuperAdminWorkspace} from '/src/pages/super-admin/SuperAdminWorkspace.tsx';
      import '/src/index.css';import '/src/global-controls.css';import '/src/theme-controls.css';
      store.dispatch(setLanguage('en'));await i18n.changeLanguage('en');
      window.router=createMemoryRouter([{path:'/super-admin',element:React.createElement(SuperAdminLayout),children:[{index:true,element:React.createElement(SuperAdminWorkspace)},...['clients','subscriptions','analytics','users','settings','integrations','payments','logs'].map(path=>({path,element:React.createElement(SuperAdminWorkspace)}))]}],{initialEntries:['/super-admin']});
      createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(RouterProvider,{router:window.router})));
    </script></body></html>`));
  }); },
}], server: { host: '127.0.0.1', port: 0 } });
await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__super-admin`);
  await page.getByRole('heading', { name: 'Platform overview', exact: true }).waitFor();
  const nav = async (path, heading) => { await page.evaluate(path => window.router.navigate('/super-admin/' + path), path); await page.getByRole('heading', { name: heading, exact: true }).waitFor(); };
  await nav('clients', 'All Clients');
  await page.getByRole('button', { name: 'Next page' }).click(); assert.equal(await page.locator('tbody tr').count(), 4);
  await page.getByRole('textbox', { name: 'Search records' }).fill('Ahmed');
  await page.getByRole('button', { name: 'View Ahmed Ali', exact: true }).click();
  await page.getByRole('dialog').getByText('CL-1001').waitFor(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Suspend', exact: true }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.locator('tbody').getByText('Active', { exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Suspend', exact: true }).click(); await page.getByRole('button', { name: 'Confirm change' }).click();
  await page.locator('tbody').getByText('Suspended', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Add client', exact: true }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('New Client'); await page.getByRole('textbox', { name: 'Email address' }).fill('new@example.com');
  await page.getByRole('button', { name: 'Create client', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search records' }).fill('New Client'); await page.locator('tbody').getByText('Trial', { exact: true }).waitFor();
  await nav('subscriptions', 'All Softwares'); await page.getByRole('textbox', { name: 'Search records' }).fill('AI Sales');
  await page.getByRole('button', { name: 'View AI Sales', exact: true }).click(); await page.getByRole('dialog').getByText('SW-1', { exact: true }).waitFor(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Set maintenance' }).click(); await page.getByRole('button', { name: 'Confirm change' }).click();
  await page.getByRole('button', { name: 'Restore service' }).waitFor();
  await page.getByRole('link', { name: 'View accounts' }).click(); assert.equal(await page.getByRole('textbox', { name: 'Search records' }).inputValue(), 'AI Sales');
  await nav('users', 'Team Management'); await page.getByLabel('Role for Maya Johnson').selectOption('Finance');
  await page.getByRole('button', { name: 'Invite member' }).click(); await page.getByRole('textbox', { name: 'Full name' }).fill('Tester'); await page.getByRole('textbox', { name: 'Email address' }).fill('tester@example.com'); await page.getByRole('button', { name: 'Create invitation' }).click();
  await page.locator('tbody').getByText('Tester', { exact: true }).waitFor();
  await nav('settings', 'System Settings'); await page.getByRole('textbox', { name: 'Platform name' }).fill('Upclick Test'); await page.getByRole('switch', { name: /Maintenance mode/ }).check(); await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await nav('integrations', 'Integrations'); const slack = page.locator('.saw-panel').filter({ has: page.getByRole('heading', { name: 'Slack', exact: true }) });
  await slack.getByRole('button', { name: 'Connect service' }).click(); await page.getByRole('button', { name: 'Confirm change' }).click(); await slack.getByText('Connected', { exact: true }).waitFor();
  await nav('payments', 'Payments'); await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('Failed'); await page.getByRole('button', { name: 'Retry payment' }).first().click(); await page.getByRole('button', { name: 'Confirm change' }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV' }).click(); assert.match((await download).suggestedFilename(), /payments/);
  await nav('logs', 'Logs & Monitoring'); await page.getByRole('textbox', { name: 'Search records' }).fill('Settled invoice'); assert.equal(await page.locator('tbody tr').count(), 1);
  await nav('analytics', 'Usage & Revenue'); await page.getByRole('combobox', { name: 'Analytics period' }).selectOption('3'); assert.equal(await page.locator('.saw-bar-column').count(), 3);
  await page.screenshot({ path: 'artifacts/super-admin-desktop.png', fullPage: true });
  await page.reload(); await nav('settings', 'System Settings'); assert.equal(await page.getByRole('textbox', { name: 'Platform name' }).inputValue(), 'Upclick Test'); assert.equal(await page.getByRole('switch', { name: /Maintenance mode/ }).isChecked(), true);
  await page.getByRole('textbox', { name: 'Search clients', exact: true }).fill('Ahmed'); await page.getByRole('textbox', { name: 'Search clients', exact: true }).press('Enter');
  await page.getByRole('heading', { name: 'All Clients', exact: true }).waitFor(); assert.equal(await page.getByRole('textbox', { name: 'Search records' }).inputValue(), 'Ahmed');
  await page.getByRole('button', { name: 'Notifications', exact: true }).click(); await page.getByRole('heading', { name: 'Logs & Monitoring', exact: true }).waitFor();
  await page.getByRole('button', { name: 'JA Jordan Admin' }).click(); await page.getByRole('heading', { name: 'Team Management', exact: true }).waitFor();
  await nav('settings', 'System Settings');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/super-admin-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click(); await page.getByRole('dialog', { name: 'Platform navigation' }).getByRole('link', { name: 'All Clients', exact: true }).click(); await page.getByRole('heading', { name: 'All Clients', exact: true }).waitFor();
  await page.evaluate(() => document.documentElement.classList.remove('dark')); await nav('clients', 'All Clients');
  await page.screenshot({ path: 'artifacts/super-admin-light.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS all nine screens, filtering, pagination, dialogs, cancellations, status changes, roles, invitations, settings, integrations, payment retry, export, audit trail, persistence and mobile layout.');
} finally { await browser?.close(); await server.close(); }
