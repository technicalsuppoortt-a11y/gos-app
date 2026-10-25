import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer, preview as previewBuild } from 'vite';
import react from '@vitejs/plugin-react';
import { landingPreviewPlugin } from '../scripts/landing-preview-plugin.ts';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const production = process.argv.includes('--production');
const server = production ? await previewBuild({ configFile:false, preview:{host:'127.0.0.1',port:0} }) : await createServer({ configFile: false, cacheDir: 'node_modules/.vite-native-preview', plugins: [landingPreviewPlugin(), react()], server: { host: '127.0.0.1', port: 0 }, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-redux', 'react-router-dom', '@reduxjs/toolkit', 'framer-motion', 'lucide-react', 'i18next', 'react-i18next', '@radix-ui/react-select', '@phosphor-icons/react', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/storage', 'sonner'], entries: ['landing-preview.html'] } });
if (!production) await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }); page.setDefaultTimeout(30000);
  const errors = [], previewRequests = [];
  page.on('pageerror', e => { errors.push(e.message); console.error('Page error:', e.message); });
  page.on('request', r => { if (r.frame().url().includes('landing-preview.html') && /^https?:/.test(r.url()) && !['127.0.0.1', 'localhost'].includes(new URL(r.url()).hostname) && /googleapis.com|cloudfunctions.net|gos-api|identitytoolkit|firestore/i.test(r.url()) && !/fonts.googleapis.com/.test(r.url())) previewRequests.push(r.url()); });
  await page.route(/https:\/\/(connect.facebook.net|www.googletagmanager.com|www.google-analytics.com|www.facebook.com)\//, r => r.fulfill({body:'',contentType:'text/javascript'}));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const preview = page.frameLocator('.lp-native-preview iframe');
  await preview.locator('.gos-home-dashboard').waitFor({ timeout: 120000 });
  console.log('Native dashboard loaded');
  const outerBefore = await page.locator('.lp-hero__copy').boundingBox();
  await mkdir('artifacts/landing-native-preview', { recursive: true });
  const ids = ['dashboard','copilot','funnels','inbox','crm','follow-up','booking','products','analytics','marketing-tracking','settings'];
  for (const [i, id] of ids.entries()) {
    await page.locator(`#lp-mock-tab-${i}`).click();
    await preview.locator(`[data-demo-screen="${id}"]`).waitFor();
    await page.waitForTimeout(250);
    await page.locator('.lp-native-demo-label').getByText('Demo data', { exact: true }).waitFor();
    if (id === 'dashboard') for (const section of ['hero','metrics','tools','revenue','activity','funnels','products']) assert.equal(await preview.locator(`[data-dashboard-section="${section}"]`).count(), 1);
    if (id === 'analytics') { await preview.locator('.an-page .an-tabs').waitFor(); await preview.getByText('Operational Events', { exact: true }).waitFor(); await preview.getByText('Workspace Records', { exact: true }).waitFor(); await preview.getByText('Activity Stream', { exact: true }).waitFor(); assert.ok(await preview.locator('.an-table tbody tr').count() > 0); }
    if (id === 'settings') { await preview.locator('.st-profile-grid').waitFor(); await preview.getByText('Personal Information', { exact: true }).waitFor(); }
    await page.locator('.lp-mock').screenshot({ path: `artifacts/landing-native-preview/${id}.png` });
    assert.deepEqual(await page.locator('.lp-hero__copy').boundingBox(), outerBefore, `Changing ${id} moved the hero copy`);
    console.log(`PASS: ${id}`);
  }
  await page.locator('#lp-mock-tab-8').focus(); await page.keyboard.press('ArrowDown'); await preview.locator('[data-demo-screen="marketing-tracking"]').waitFor();
  await page.locator('#lp-mock-tab-0').click();
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForFunction(() => document.querySelector('.lp-native-preview iframe').contentDocument.documentElement.classList.contains('dark'));
  await page.locator('.lp-mock').screenshot({ path: 'artifacts/landing-native-preview/dark.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.lp-mock').screenshot({ path: 'artifacts/landing-native-preview/mobile.png' });
  await page.locator('#lp-lang-toggle').click();
  await page.waitForFunction(() => document.querySelector('.lp-native-preview iframe').contentDocument.documentElement.dir === 'rtl');
  await page.locator('.lp-mock').screenshot({ path: 'artifacts/landing-native-preview/arabic.png' });
  assert.deepEqual(previewRequests, [], 'The demo attempted to contact a real backend'); assert.deepEqual(errors, []);
  console.log('PASS: native screens, demo isolation, keyboard tabs, stable hero layout, mobile, dark and Arabic.');
} catch (e) { console.error(e); throw e; } finally { await browser?.close(); await server.close(); }
