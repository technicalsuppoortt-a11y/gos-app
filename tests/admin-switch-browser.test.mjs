// UI integration with isolated Firebase transport; server authorization is tested separately.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-admin-switch', optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react-dom/client', 'react-dom', 'react-redux', 'react-router-dom', '@reduxjs/toolkit', 'framer-motion', 'sonner', 'lucide-react', 'i18next', 'react-i18next'] }, plugins: [react(), {
  name: 'admin-switch-fixtures', enforce: 'pre',
  load(id) {
    const path = id.replaceAll('\\', '/');
    if (path.endsWith('/src/backend/adminUsers.ts')) return `
      export const useAdminUsers=()=>({loading:false,error:'',invites:[null,'broken','2026-10-24T10:00:00Z',{seconds:1792836000,nanoseconds:0},undefined].map((created,index)=>({id:'user'+index,name:'User '+index,email:'user'+index+'@test.com',role:'USER',status:index===4?'Pending':'Active',created}))});
      export const manageAccount=async()=>({}); export const activationUrl=()=>''; export const getActivationLink=async()=>'';`;
    if (path.endsWith('/src/backend/session.tsx')) return `export const logoutFirebase=async()=>{};`;
    if (path.endsWith('/src/backend/firebase.ts')) return `export const backendError=e=>e.message;`;
    if (path.endsWith('/src/backend/phoenixBrand.ts')) return `export const usePhoenixBrand=()=>null;`;
    if (path.endsWith('/src/backend/impersonation.ts')) return `
      import {store} from '/src/store/index.ts'; import {startImpersonation,stopImpersonation} from '/src/store/slices/authSlice.ts';
      export const switchToUser=async id=>{if(window.failSwitch)throw Error('Switch denied');store.dispatch(startImpersonation({user:{id,name:'Selected User',email:'selected@test.com'},role:'USER',tenant:{id:'workspace-'+id},token:'target-token'}));};
      export const returnToAdmin=async()=>{store.dispatch(stopImpersonation());return '/admin/dashboard';};`;
  },
  configureServer(vite) { vite.middlewares.use('/__admin-switch', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__admin-switch', `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
      import React from 'react';import {createRoot} from 'react-dom/client';import {Provider} from 'react-redux';import {createMemoryRouter,RouterProvider} from 'react-router-dom';
      import {store} from '/src/store/index.ts';import {loginSuccess} from '/src/store/slices/authSlice.ts';import {setLanguage,setSidebarOpen,toggleSidebarCollapse} from '/src/store/slices/uiSlice.ts';
      import i18n from '/src/i18n/i18n.ts';
      import {AdminUsers} from '/src/pages/onboarding/AdminUsers.tsx';import {Sidebar} from '/src/components/layout/Sidebar.tsx';import {Toaster} from 'sonner';
      import '/src/index.css';import '/src/layout-shell.css';
      store.dispatch(loginSuccess({user:{id:'admin',name:'Admin',email:'admin@test.com'},role:'ADMIN',tenant:{id:'admin-workspace'},token:'admin-token'}));
      store.dispatch(setLanguage('en'));await i18n.changeLanguage('en');window.store=store;window.ar=async()=>{store.dispatch(setLanguage('ar'));await i18n.changeLanguage('ar');};window.collapse=()=>store.dispatch(toggleSidebarCollapse());window.openSidebar=()=>store.dispatch(setSidebarOpen(true));
      window.router=createMemoryRouter([{path:'/admin/users',element:React.createElement(AdminUsers)},{path:'/dashboard',element:React.createElement(Sidebar,{items:[],basePath:'/dashboard'})},{path:'/admin/dashboard',element:React.createElement('h1',null,'Admin Dashboard')}],{initialEntries:['/admin/users']});
      createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(RouterProvider,{router:window.router}),React.createElement(Toaster)));
    </script></body></html>`));
  }); },
}], server: { host: '127.0.0.1', port: 0 } });
await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__admin-switch`);
  await page.getByRole('heading', { name: 'Good teams start here.' }).waitFor();
  assert.equal(await page.locator('tbody tr').count(), 5);
  assert.equal(await page.locator('tbody time').allTextContents().then(values => values.filter(value => value === 'N/A').length), 3);
  assert.equal(await page.getByRole('button', { name: 'Switch to User 4', exact: true }).isDisabled(), true);
  await page.evaluate(() => { window.failSwitch = true; });
  await page.getByRole('button', { name: 'Switch to User 0', exact: true }).click();
  await page.getByText('Switch denied', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.store.getState().auth.role), 'ADMIN');
  await page.evaluate(() => { window.failSwitch = false; });
  await page.getByRole('button', { name: 'Switch to User 0', exact: true }).click();
  const returnButton = page.getByRole('button', { name: 'Return to Admin Dashboard', exact: true }).first();
  await returnButton.waitFor();
  assert.equal(await page.evaluate(() => window.store.getState().auth.tenant.id), 'workspace-user0');
  await page.evaluate(() => window.collapse());
  await returnButton.click();
  await page.getByRole('heading', { name: 'Admin Dashboard', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.store.getState().auth.user.id), 'admin');
  assert.equal(await page.evaluate(() => window.store.getState().auth.impersonation), null);
  await page.evaluate(() => window.router.navigate('/admin/users'));
  await page.getByRole('button', { name: 'Switch to User 1', exact: true }).click();
  await page.evaluate(() => window.ar());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.openSidebar());
  await page.getByRole('dialog').getByRole('button', { name: 'العودة إلى لوحة المسؤول', exact: true }).click();
  await page.getByRole('heading', { name: 'Admin Dashboard', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS malformed dates, failed switch, selected workspace, collapsed return, Arabic mobile return; no browser exceptions.');
} finally { await browser?.close(); await server.close(); }
