import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixtureDirectory = '.firebase/launch-settings-browser';
await mkdir(fixtureDirectory, { recursive: true });
await writeFile(path.join(fixtureDirectory, 'index.html'), '<div id="root"></div><script type="module" src="./fixture.tsx"></script>');
await writeFile(path.join(fixtureDirectory, 'fixture.tsx'), `
  import React from 'react'; import {createRoot} from 'react-dom/client';
  import {Provider} from 'react-redux'; import {BrowserRouter} from 'react-router-dom';
  import {configureStore} from '@reduxjs/toolkit'; import '/src/i18n/i18n.ts';
  import {AdminGroupNav} from '/src/pages/admin/AdminGroups.tsx';
  import {SystemSettingsSections} from '/src/pages/super-admin/LaunchBrandSettings.tsx';
  import '/src/pages/admin/admin-workspace.css';
  import '/src/pages/super-admin/admin-workspace.css';
  const role = new URLSearchParams(location.search).get('role') || 'SUPER_ADMIN';
  const store = configureStore({ reducer: () => ({ auth: { role }, ui: { theme: 'light' } }) });
  createRoot(document.getElementById('root')).render(<Provider store={store}><BrowserRouter>
    {role === 'ADMIN' ? <AdminGroupNav group="settings"/> : <main className="saw-workspace">
      <h1>System Settings</h1>
      <SystemSettingsSections><h2>General configuration</h2></SystemSettingsSections>
    </main>}
  </BrowserRouter></Provider>);
`);
const server = process.env.GOS_TEST_ORIGIN ? null : await createServer({ configFile: false, cacheDir: fixtureDirectory + '/cache', plugins: [react()], optimizeDeps: { entries: [fixtureDirectory + '/index.html'], include: ['react', 'react-dom/client', 'react-redux', 'react-router-dom'] }, server: { host: '127.0.0.1', port: 5196, strictPort: true, hmr: false } });
await server?.listen();
const base = process.env.GOS_TEST_ORIGIN || 'http://127.0.0.1:5196';
const origin = new URL(base).origin;
const browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const external = [];
try {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
    if (url.pathname === '/src/backend/firebase.ts') return route.fulfill({ contentType: 'application/javascript', body: `export const primaryAuth={currentUser:{getIdToken:async()=>"local-fixture-token"}};` });
    if (url.pathname === '/launch-brand/admin-settings') return route.fulfill({ contentType: 'text/html', body: `<body><script>const ready=()=>parent.postMessage({type:'launch-brand-admin-ready'},location.origin);ready();addEventListener('message',e=>{if(e.data.type==='launch-brand-admin-connect')ready();if(e.data.type==='launch-brand-admin-session')document.body.textContent=e.data.language+' '+e.data.theme;});</script></body>` });
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  const fixture = base + '/' + fixtureDirectory + '/index.html';
  await page.goto(fixture + '?role=ADMIN', { waitUntil: 'domcontentloaded' });
  await page.getByRole('navigation', { name: 'Settings', exact: true }).waitFor();
  assert.deepEqual(await page.locator('.adm-group-nav').getByRole('link').allTextContents(), ['General', 'Integrations & Webhooks', 'AI Models & Usage', 'Transactions']);
  await page.goto(fixture + '?role=PLATFORM_SUPPORT&section=launch-brand&tab=business-discovery', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'General configuration' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Launch Brand Settings' }).count(), 0);
  assert.equal(await page.locator('iframe').count(), 0);
  await page.goto(fixture, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'System Settings' }).waitFor();
  assert.equal(await page.locator('iframe').count(), 0);
  await page.getByRole('button', { name: 'Launch Brand Settings' }).click();
  assert.match(page.url(), /section=launch-brand/);
  await page.getByRole('heading', { name: 'Launch Brand Settings' }).waitFor();
  await page.frameLocator('iframe').locator('body').filter({ hasText: 'en light' }).waitFor();
  await page.getByRole('button', { name: 'Business Discovery', exact: true }).click();
  assert.match(page.url(), /tab=business-discovery/);
  assert.match(await page.locator('iframe').getAttribute('src'), /tab=business-discovery/);
  await page.getByRole('button', { name: 'AI Center', exact: true }).click();
  assert.match(page.url(), /tab=ai-center/);
  await page.getByRole('button', { name: 'General', exact: true }).click();
  await page.getByRole('heading', { name: 'General configuration' }).waitFor();
  assert.equal(await page.locator('iframe').count(), 0);
  await page.getByRole('button', { name: 'Launch Brand Settings' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('Launch Brand settings placement, both tabs, authenticated frame handshake and mobile width passed. External requests were blocked:', external.length);
} finally {
  await context.close(); await browser.close(); await server?.close();
  const cleanupPath = path.resolve(fixtureDirectory);
  assert.equal(path.dirname(cleanupPath), path.resolve('.firebase'));
  await rm(cleanupPath, { recursive: true, force: true });
}
