import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixture = `
  import { useSyncExternalStore } from 'react';
  const listeners = new Set();
  const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
  let accounts = [
    { id: 'admin-123', name: 'Ahmed Ali', email: 'ahmed@example.com', role: 'ADMIN', status: 'Active', defaultAgencyUserId: 'agency-123' },
    { id: 'agency-123', name: 'Default Agency', email: 'ahmed@example.com', role: 'USER', status: 'Active', agency: true, billingOwnerId: 'admin-123' },
    { id: 'staff-123', name: 'Maya', email: 'maya@example.com', role: 'PLATFORM_SUPPORT', status: 'Active' },
  ];
  const live = data => ({ data, loading: false, error: '', cached: false });
  const read = () => accounts;
  export const isAdminAccount = row => row.role === 'ADMIN';
  export const isSubUser = (row, admin) => row.billingOwnerId === admin.id;
  export const platformTimezones = ['UTC'];
  export const usePlatformAccounts = () => live(useSyncExternalStore(subscribe, read));
  export const usePlatformUsage = () => live([{ id: 'usage-123', amount: 8, description: 'AI usage' }]);
  export const usePlatformAudit = () => live([]);
  export const usePlatformWallet = () => live({ balance: 40, held: 10, available: 30, currency: 'EUR' });
  export const useManagedWallets = () => live([]);
  export const usePlatformSubscriptions = () => live([]);
  export const usePlatformSettings = () => live({ revision: 0, settings: { name: 'Upclick', email: '', timezone: 'UTC', trialDays: 14 } });
  export const usePlatformPayments = () => live([{ id: 'invoice-123', key: 'billingRequests/invoice-123', amount: 45, currency: 'EUR', name: 'Ahmed Ali', method: 'Bank', scope: 'Platform billing', platformRevenue: true, status: 'Approved', date: new Date() }]);
  export async function updatePlatform(input) {
    window.lastOperation = input.operation;
    if (input.operation === 'setStatus') accounts = accounts.map(row => row.id === input.id ? { ...row, status: input.active ? 'Active' : 'Suspended' } : row);
    if (input.operation === 'createMember') accounts = [...accounts, { ...input, id: 'new-member', status: 'Active' }];
    listeners.forEach(listener => listener());
  }
`;

const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-super-admin-test', plugins: [react(), {
  name: 'super-admin-fixture', enforce: 'pre',
  load(id) {
    const path = id.replaceAll('\\', '/');
    if (path.endsWith('/src/backend/session.tsx')) return 'export const logoutFirebase=async()=>{};';
    if (path.endsWith('/src/backend/superAdmin.ts')) return fixture;
    if (path.endsWith('/src/components/layout/WalletBadge.tsx')) return 'export const WalletBadge=()=>null;';
    if (path.endsWith('/src/components/layout/CreditBadge.tsx')) return 'export const CreditBadge=()=>null;';
  },
  configureServer(vite) { vite.middlewares.use('/__super-admin', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__super-admin', `<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
      import React from 'react';import {createRoot} from 'react-dom/client';import {Provider} from 'react-redux';import {createMemoryRouter,RouterProvider} from 'react-router-dom';
      import {store} from '/src/store/index.ts';import {loginSuccess} from '/src/store/slices/authSlice.ts';import {setLanguage} from '/src/store/slices/uiSlice.ts';import i18n from '/src/i18n/i18n.ts';
      import {SuperAdminLayout} from '/src/components/layout/SuperAdminLayout.tsx';import {SuperAdminWorkspace} from '/src/pages/super-admin/SuperAdminWorkspace.tsx';
      import '/src/index.css';import '/src/global-controls.css';import '/src/theme-controls.css';
      window.loginAs = role => store.dispatch(loginSuccess({role, user:{id:role,name:'Platform Tester',email:'tester@example.com'},tenant:null,token:'fixture'}));
      window.loginAs('SUPER_ADMIN');store.dispatch(setLanguage('en'));await i18n.changeLanguage('en');
      const workspace = React.createElement(SuperAdminWorkspace);
      window.router=createMemoryRouter([{path:'/super-admin',element:React.createElement(SuperAdminLayout),children:[{index:true,element:workspace},...['clients','analytics','wallet','users','settings','payments','logs'].map(path=>({path,element:workspace})),{path:'support',element:React.createElement('h1',null,'Support') }]}],{initialEntries:['/super-admin']});
      createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(RouterProvider,{router:window.router})));
    </script></body></html>`));
  }); },
}], server: { host: '127.0.0.1', port: 0 } });

await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const heading = name => page.getByRole('heading', { name, exact: true });
  const nav = async (path, name) => { await page.evaluate(path => window.router.navigate('/super-admin/' + path), path); await heading(name).waitFor(); };
  const sidebar = page.getByRole('navigation', { name: 'Super admin navigation' });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__super-admin`);
  await heading('Platform overview').waitFor();
  assert.equal(await sidebar.getByRole('link', { name: 'All Softwares' }).count(), 0);
  assert.equal(await sidebar.getByRole('link', { name: 'Templates' }).count(), 1);
  await sidebar.getByRole('link', { name: 'All Admins', exact: true }).click();
  await heading('All Admins').waitFor();
  await page.getByRole('textbox', { name: 'Search records' }).fill('ADMIN-123');
  await page.getByRole('button', { name: 'View sub-users' }).click();
  await page.getByRole('dialog').getByText('Default Agency', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Suspend', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await page.locator('tbody').getByText('Suspended', { exact: true }).waitFor();
  await nav('users', 'Team Management');
  await page.getByRole('button', { name: 'Add team member' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('New Member');
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill('new@example.com');
  await dialog.getByLabel('Password', { exact: true }).fill('test-password');
  await dialog.getByLabel('Confirm Password', { exact: true }).fill('wrong-password');
  await dialog.getByRole('button', { name: 'Create team member' }).click();
  await dialog.getByRole('alert').getByText('Passwords must match.').waitFor();
  await dialog.getByLabel('Confirm Password', { exact: true }).fill('test-password');
  await dialog.getByRole('button', { name: 'Create team member' }).click();
  await page.locator('tbody').getByText('New Member', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.lastOperation), 'createMember');
  await page.evaluate(() => window.loginAs('PLATFORM_FINANCE'));
  await nav('clients', 'Usage & Revenue');
  assert.deepEqual(await sidebar.getByRole('link').allTextContents(), ['Usage & Revenue', 'Payments']);
  await page.evaluate(() => window.loginAs('PLATFORM_SUPPORT'));
  await nav('payments', 'Support');
  await sidebar.getByRole('link', { name: 'Logs & Monitoring' }).waitFor();
  assert.deepEqual(await sidebar.getByRole('link').allTextContents(), ['Logs & Monitoring']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('dialog', { name: 'Platform navigation' }).getByRole('link', { name: 'Logs & Monitoring' }).click();
  await heading('Logs & Monitoring').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS account controls, password validation, role-specific routes and mobile navigation with Firebase adapter fixtures.');
} finally { await browser?.close(); await server.close(); }
