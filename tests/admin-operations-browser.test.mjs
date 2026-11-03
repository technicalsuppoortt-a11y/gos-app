// Isolated UI regression: live Firebase authorization is covered by emulator tests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const server = await createServer({ optimizeDeps: { noDiscovery: true, include: ['use-sync-external-store/shim', 'use-sync-external-store/shim/with-selector', 'react/jsx-runtime', 'react', 'react-dom/client', 'react-redux', 'react-router-dom', '@reduxjs/toolkit', 'lucide-react', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions', 'sonner', 'framer-motion'] }, server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'admin-operations-fixtures', enforce: 'pre', configResolved(config) {
    config.optimizeDeps.include = config.optimizeDeps.include.filter(id => !['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-tooltip'].includes(id));
  }, load(id) {
    id = id.replaceAll('\\', '/');
    if (id.endsWith('/src/backend/workspacePreferences.ts')) return `
      import {useSyncExternalStore} from 'react';
      export const DEFAULT_BRAND_NAME='Upclick';
      export const DEFAULT_BRAND_LOGO_URL='/upclick-logo.svg';
      export const DEFAULT_SUPPORT_EMAIL='support@upclick.app';
      export const isDefaultBrandLogo = (url) => !url || url === DEFAULT_BRAND_LOGO_URL || url === '/upclick-logo.svg';
      export const workspaceThemes={violet:'Violet / Indigo',slate:'Slate Clean',midnight:'Midnight Neon',emerald:'Emerald Enterprise'};
      export const preferenceDefaults={name:'Northstar',logoUrl:'/upclick-logo.svg',theme:'violet',language:'en',currency:'USD',mode:'light',timezone:'Africa/Cairo',supportEmail:''};
      let values=preferenceDefaults; const listeners=new Set(); window.setBrand=next=>{values={...values,...next};listeners.forEach(fn=>fn());};window.clearBrand=()=>{values=null;listeners.forEach(fn=>fn());};
      export function useWorkspacePreferences(){const current=useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>values);return {values:current,ownValues:current,tenantId:'test',loading:false,error:''};}
      export async function uploadBrandFile(){throw Error('Uploads are outside this isolated UI test');}
    `;
    if (id.endsWith('/src/backend/adminManagement.ts')) return `
      import {useSyncExternalStore} from 'react';
      let state={records:[{id:'thread',workspaceId:'test',path:'tenants/test/conversations/thread',data:{name:'Live customer',channel:'whatsapp',status:'Open',text:'Hello'}}],tenants:{test:{name:'Northstar'}},users:{},loading:false,error:''};const listeners=new Set();
      window.updateRecords=next=>{state={...state,records:next};listeners.forEach(fn=>fn());};
      window.setDashboardState=patch=>{state={...state,...patch};listeners.forEach(fn=>fn());};
      export function useAdminManagement(resources,templates,serverOnly){if(resources.includes('bookings')&&serverOnly!==true)throw Error('Dashboard must request server-only records');return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>state);}
    `;
    if (id.endsWith('/src/backend/adminDashboard.ts')) return `
      import {useSyncExternalStore} from 'react';
      let state={loading:false,error:'',data:{checkedAt:'2026-11-03T12:00:00Z',services:[{id:'firestore',name:'Cloud Firestore',kind:'Infrastructure',status:'healthy',mode:'server',latencyMs:12,detail:'Server read completed.'}],gateways:[{id:'paddle',name:'Paddle',kind:'Payment gateway',status:'unverified',mode:'unknown',latencyMs:null,detail:'Availability unverified.'}]}};const listeners=new Set();
      window.setHealthState=patch=>{state={...state,...patch};listeners.forEach(fn=>fn());};
      export function useDashboardHealth(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>state);}
    `;
  }, configureServer(vite) { vite.middlewares.use('/__operations', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__operations', `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
      import React from 'react';import {createRoot} from 'react-dom/client';import {Provider} from 'react-redux';import {createMemoryRouter,RouterProvider} from 'react-router-dom';
      import {store} from '/src/store/index.ts';import {ThemeProvider} from '/src/context/ThemeProvider.tsx';import {AdminOperations} from '/src/pages/admin/AdminOperations.tsx';import {WorkspaceBrandSettings} from '/src/pages/admin/WorkspaceBrandSettings.tsx';
      import {AdminDashboard} from '/src/pages/admin/AdminDashboard.tsx';
      import '/src/index.css';import '/src/pages/admin/admin-workspace.css';
      const h=React.createElement; const router=createMemoryRouter([{path:'/settings',element:h(WorkspaceBrandSettings)},{path:'/admin/dashboard',element:h('div',{className:'adm-shell',style:{height:'auto',minHeight:'100vh',padding:20,display:'block'}},h(AdminDashboard))},...['conversations','analytics','ai-usage'].map(id=>({path:'/'+id,element:h('div',{className:'adm-shell',style:{height:'auto',minHeight:'100vh',padding:24,display:'block'}},h(AdminOperations,{moduleId:id}))}))],{initialEntries:['/conversations']});
      window.go=path=>router.navigate(path);window.ui=()=>store.getState().ui;
      createRoot(document.getElementById('root')).render(h(Provider,{store},h(ThemeProvider,null,h(RouterProvider,{router}))));
    </script></body></html>`));
  }); }
}] });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
  page.on('console', msg => { if (msg.type() === 'error') console.error(msg.text()); });
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.goto(`${base}/__operations`);
  await page.getByText('Live customer', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Search records' }).fill('absent');
  await page.getByText('No matching records.', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Search records' }).fill('');
  await page.evaluate(() => window.updateRecords([{ id: 'updated', workspaceId: 'test', path: 'tenants/test/conversations/updated', data: { name: 'Updated live customer', status: 'Closed', channel: 'email' } }]));
  await page.getByText('Updated live customer', { exact: true }).waitFor();
  await page.getByRole('combobox', { name: 'Status filter' }).selectOption('Closed');
  await page.getByText('Updated live customer', { exact: true }).waitFor();
  await page.evaluate(() => window.setDashboardState({sourceErrors:{'test/handoffLogs':'This collection is restricted'}}));
  await page.getByText('Updated live customer', {exact:true}).waitFor();
  assert.equal(await page.locator('.adm-metric').filter({hasText:'Threads'}).locator('strong').innerText(),'1');
  assert.equal(await page.locator('.adm-metric').filter({hasText:'Human handoffs'}).locator('strong').innerText(),'Unavailable');
  await page.getByRole('tab', {name:'Human handoffs',exact:true}).click();
  await page.getByText('No accessible records in this view. Retry or check workspace permissions.', {exact:true}).waitFor();
  await page.evaluate(() => window.setDashboardState({sourceErrors:{}}));
  await page.evaluate(() => {window.updateRecords([{id:'lead',workspaceId:'test',path:'tenants/test/leads/lead',data:{stage:'Won'}},{id:'revenue',workspaceId:'test',path:'tenants/test/transactions/revenue',data:{amount:250,currency:'USD',status:'Completed'}}]);window.setDashboardState({sourceErrors:{'test/aiUsage':'Restricted tokens'}});window.go('/analytics');});
  await page.getByRole('heading',{name:'Recorded revenue',exact:true}).waitFor();
  await page.getByText('USD: 250',{exact:true}).waitFor();
  assert.equal(await page.locator('.adm-metric').filter({has:page.getByText('Leads',{exact:true})}).locator('strong').innerText(),'1');
  assert.equal(await page.locator('.adm-metric').filter({hasText:'AI tokens'}).locator('strong').innerText(),'Unavailable');
  await page.evaluate(() => window.setDashboardState({sourceErrors:{}}));
  await page.evaluate(() => window.go('/settings'));
  await page.getByRole('heading', { name: 'Workspace Settings' }).waitFor();
  await page.locator('.ws-theme-card').filter({ hasText: 'Emerald Enterprise' }).click();
  await page.getByRole('combobox', {name:'Timezone',exact:true}).click();
  assert.ok(await page.getByRole('option').count() > 350);
  await page.getByRole('combobox', {name:'Search city or timezone…',exact:true}).fill('Pacific/Auckland');
  await page.getByRole('option', {name:'Pacific/Auckland',exact:true}).click();
  await page.getByRole('combobox', {name:'Timezone',exact:true}).filter({hasText:'Pacific/Auckland'}).waitFor();
  assert.equal(await page.getByRole('link', {name:'Business Assets',exact:true}).getAttribute('href'), '/dashboard/settings/business-assets');
  await page.getByRole('button', { name: 'Save changes' }).isEnabled().then(v => assert.ok(v));
  await page.evaluate(() => window.setBrand({ theme: 'emerald', language: 'ar', currency: 'SAR', mode: 'dark' }));
  await page.waitForFunction(() => document.documentElement.dir === 'rtl' && document.documentElement.classList.contains('dark') && window.ui().currency === 'SAR');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.adm-primary')).backgroundColor === 'rgb(4, 120, 87)');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Settings fit mobile viewport');
  await mkdir('artifacts/admin-operations', { recursive: true });
  await page.screenshot({ path: 'artifacts/admin-operations/settings-mobile-ar-dark.png', fullPage: true });
  await page.evaluate(() => window.go('/analytics'));
  await page.getByRole('heading', { name: 'التحليلات', exact: true }).waitFor();
  await page.getByRole('tab').nth(1).click();
  await page.screenshot({ path: 'artifacts/admin-operations/analytics-mobile-ar-dark.png', fullPage: true });
  await page.evaluate(() => window.clearBrand());
  await page.waitForFunction(() => window.ui().currency === 'USD' && document.documentElement.dir === 'ltr' && !document.documentElement.hasAttribute('data-workspace-theme'));
  await page.evaluate(() => { window.updateRecords([{id:'txn',workspaceId:'test',path:'tenants/test/transactions/txn',data:{amount:4200,currency:'SAR',status:'Completed'}}]);window.go('/admin/dashboard'); });
  await page.locator('[data-live-dashboard]').waitFor();
  await page.getByText('SAR 4,200', {exact:true}).waitFor();
  assert.equal(await page.locator('.adm-demo').count(), 0);
  assert.doesNotMatch(await page.locator('[data-live-dashboard]').innerText(), /Demo workspace|100% Operational|PostgreSQL|112ms|Cloudflare Edge/);
  await page.getByText('Unverified', {exact:true}).waitFor();
  const shortcuts = await page.locator('.adm-shortcut-card').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  assert.deepEqual(shortcuts, ['/admin/tools','/admin/users','/admin/conversations','/admin/payments-gateways','/admin/booking','/admin/analytics']);
  await page.evaluate(() => window.setDashboardState({loading:true}));
  assert.equal(await page.getByText('SAR 4,200', {exact:true}).count(), 0, 'Cache/loading cannot display stale metrics');
  await page.evaluate(() => window.setDashboardState({loading:false,error:'Firestore permission denied'}));
  await page.getByRole('alert').filter({hasText:'Firestore permission denied'}).waitFor();
  assert.equal(await page.getByText('SAR 4,200', {exact:true}).count(), 0);
  await page.evaluate(() => { window.setDashboardState({error:''});window.setHealthState({data:null,error:'Backend check failed'}); });
  await page.getByRole('alert').filter({hasText:'Backend check failed'}).waitFor();
  assert.equal(await page.getByText('Verified', {exact:true}).count(), 0);
  await page.context().setOffline(true);
  await page.getByText('Offline · Live data unavailable', {exact:true}).waitFor();
  assert.equal(await page.getByText('SAR 4,200', {exact:true}).count(), 0);
  await page.context().setOffline(false);
  await page.getByText('SAR 4,200', {exact:true}).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Dashboard fits mobile viewport');
  await page.screenshot({path:'artifacts/admin-operations/dashboard-mobile.png',fullPage:true});
  assert.deepEqual(errors, []);
  await page.goto(`${base}/auth/login`);
  await page.locator('.login-page').waitFor();
  assert.equal(await page.locator('.login-home-link').count(), 0);
  assert.equal(await page.locator('.login-footer nav a').count(), 3);
  for (const [width,height] of [[1440,900],[1366,768],[1280,600],[1024,600],[390,844],[375,667],[360,640],[320,568],[390,480],[844,390]]) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(100);
    const layout=await page.evaluate(()=>({height:innerHeight,scrollHeight:document.documentElement.scrollHeight,footer:[...document.querySelectorAll('.login-footer nav a')].map(node=>({top:node.getBoundingClientRect().top,bottom:node.getBoundingClientRect().bottom}))}));
    assert.ok(layout.scrollHeight<=layout.height+1,`Login page must not overflow at ${width}×${height}: ${JSON.stringify(layout)}`);
    assert.ok(layout.footer.every(r=>r.top>=0&&r.bottom<=layout.height+1),`Footer must remain visible at ${width}×${height}: ${JSON.stringify(layout)}`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({ path: 'artifacts/admin-operations/login-mobile.png', fullPage: true });
  console.log('PASS live record refresh, filters, preferences, dashboard server-only mode, loading/error/offline states, shortcuts, mobile layout and login footer.');
} finally { await browser?.close(); await server.close(); }
