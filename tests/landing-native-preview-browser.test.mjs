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
  page.on('request', r => { if (/\/landing-preview\.html|\/assets\/landingPreview-/.test(r.url())) previewRequests.push(r.url()); });
  await page.route(/https:\/\/(connect.facebook.net|www.googletagmanager.com|www.google-analytics.com|www.facebook.com)\//, r => r.fulfill({body:'',contentType:'text/javascript'}));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const preview = page.locator('.lp-native-preview');
  await preview.locator('.gos-home-dashboard').waitFor();
  const logo=page.locator('.lp-mock__logo img:visible');
  await logo.evaluate(image=>image.decode());assert.ok(await logo.evaluate(image=>image.naturalWidth>0));
  assert.equal(await preview.locator('iframe,[aria-busy="true"],[role="status"],.lp-native-loading').count(), 0);
  assert.equal(await page.locator('#pricing,a[href="#pricing"],.lp-pricing-card').count(), 0);
  for (const href of await page.locator('.lp-header a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute('href')))) {
    assert.equal(await page.locator(href).count(), 1, `Navigation target ${href} exists`);
  }
  console.log('Static dashboard content rendered without a loading state; pricing and its anchors are absent');
  const outerBefore = await page.locator('.lp-hero__copy').boundingBox();
  const artifacts = `artifacts/landing-native-preview/rich-static-${Date.now()}`;
  await mkdir(artifacts, { recursive: true });
  const ids = ['dashboard','copilot','funnels','inbox','crm','follow-up','booking','products','analytics','marketing-tracking','settings'];
  for (const [i, id] of ids.entries()) {
    await page.locator(`#lp-mock-tab-${i}`).click();
    await preview.locator(`[data-demo-screen="${id}"]`).waitFor();
    await page.locator('.lp-native-demo-label').getByText('Demo data', { exact: true }).waitFor();
    if(id==='dashboard')for(const section of ['hero','metrics','tools','revenue','activity','funnels','products'])assert.equal(await preview.locator(`[data-dashboard-section="${section}"]`).count(),1);
    if(id==='analytics')assert.ok(await preview.locator('.an-table tbody tr').count()>0);
    if(id==='settings')await preview.locator('.st-profile-grid').waitFor();
    assert.equal(await preview.locator('iframe,[aria-busy="true"],.workspace-loading').count(),0);
    await page.locator('.lp-mock').screenshot({ path: `${artifacts}/${id}.png` });
    assert.deepEqual(await page.locator('.lp-hero__copy').boundingBox(), outerBefore, `Changing ${id} moved the hero copy`);
    console.log(`PASS: ${id}`);
  }
  await page.locator('#lp-mock-tab-8').focus(); await page.keyboard.press('ArrowDown'); await preview.locator('[data-demo-screen="marketing-tracking"]').waitFor();
  await page.locator('#lp-mock-tab-0').click();
  await page.locator('.lp-header__inner').getByRole('button',{name:/dark mode|الوضع الداكن/i}).click();
  await preview.locator('.lp-static-document.dark').waitFor();
  assert.equal(await preview.locator('[data-dashboard-section="tools"]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(21, 26, 39)');
  assert.equal(await page.locator('.lp-mock__logo img:visible').getAttribute('src'),'/upclick-logo-light.svg');
  assert.equal(await preview.evaluate(element => getComputedStyle(element).getPropertyValue('--lp-bg').trim()), '#0f0e21');
  await page.locator('.lp-mock').screenshot({ path: `${artifacts}/dark.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const frameHeight=await preview.evaluate(element=>element.clientHeight);
  assert.ok(Math.abs((await preview.locator('.lp-static-document').boundingBox()).height-frameHeight)<1,'Static native content fills the preview height on mobile');
  await page.locator('.lp-mock').screenshot({ path: `${artifacts}/mobile.png` });
  await page.locator('#lp-lang-toggle').click();
  await page.waitForFunction(() => document.querySelector('.lp').dir === 'rtl');
  assert.equal(await page.locator('#pricing,a[href="#pricing"]').count(), 0);
  await page.locator('.lp-mock').screenshot({ path: `${artifacts}/arabic.png` });
  assert.deepEqual(previewRequests, [], 'Static preview must not boot the dashboard iframe or entry bundle'); assert.deepEqual(errors, []);
  console.log('PASS: static demo screens, no pricing/broken anchors, keyboard tabs, stable hero layout, mobile, dark and Arabic.');
  console.log(`Screenshots: ${artifacts}`);
} catch (e) { console.error(e); throw e; } finally { await browser?.close(); if (production) { server.httpServer.closeAllConnections(); await new Promise(resolve => server.httpServer.close(resolve)); } else await server.close(); }
