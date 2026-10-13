import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
fs.mkdirSync('artifacts/theme-audit', { recursive:true });
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem('theme', 'light');
  localStorage.setItem('i18nextLng', 'en');
  localStorage.setItem('gos.auth', JSON.stringify({ user: { id: 'theme-audit', name: 'Theme Audit', email: 'audit@example.com' }, role: location.pathname.startsWith('/super-admin') ? 'SUPER_ADMIN' : location.pathname.startsWith('/admin') ? 'ADMIN' : 'USER', tenant: { id: 'audit', name: 'Audit' }, token: 'demo-token' }));
});
const routes = process.env.THEME_AUDIT_ROUTES ? JSON.parse(process.env.THEME_AUDIT_ROUTES) : ['/dashboard','/dashboard/funnels','/dashboard/websites','/dashboard/domains','/dashboard/inbox','/dashboard/crm','/dashboard/follow-up','/dashboard/copilot','/dashboard/analytics','/dashboard/products-payments','/dashboard/products-payments?tab=discounts','/dashboard/booking','/dashboard/booking/new','/dashboard/booking?tab=calendar','/dashboard/booking?tab=bookings','/dashboard/booking?tab=templates',...['profile','business','team','knowledge','tools','integrations','billing','security'].map(s => '/dashboard/settings/'+s)];
const snapshot = () => page.locator('main').first().evaluate(el => [el,...el.querySelectorAll('*')].slice(0,600).map(n => {
  const s = getComputedStyle(n), r = n.getBoundingClientRect();
  return [n.tagName, s.color, s.backgroundColor, s.borderColor, r.width, r.height];
}));
if (!process.env.THEME_AUDIT_ROUTES) routes.push('/dashboard/activity','/dashboard/funnels?tab=templates','/dashboard/booking/appointments/new','/dashboard/products-payments/products/new','/dashboard/products-payments/discounts/new','/admin','/super-admin');
for (const route of routes) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto((process.env.THEME_AUDIT_URL || 'http://127.0.0.1:5174')+route,{waitUntil:'domcontentloaded'});
  await page.locator('.global-theme-control').first().waitFor();
  await page.locator('.gos-global-loader').waitFor({ state: 'hidden' });
  await page.waitForTimeout(300);
  if (await page.locator('html').getAttribute('data-theme') !== 'light') await page.locator('.global-theme-control').first().click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(500);
  const light = await snapshot();
  const fields = await page.locator('input,textarea,select').evaluateAll(nodes => nodes.map(n => [n.value,n.checked]));
  await page.locator('.global-theme-control').first().click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.deepEqual(await page.locator('input,textarea,select').evaluateAll(nodes => nodes.map(n => [n.value,n.checked])), fields, 'Theme changed fields: '+route);
  const surfaces = await page.locator('.aw-asset-card,.aw-panel,.st-modal,.bk-dialog,.cw-card').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => ({ className:n.className, background:getComputedStyle(n).backgroundColor })));
  for (const s of surfaces) assert.notEqual(s.background, 'rgb(255, 255, 255)', 'White dark card: '+route+' '+s.className);
  const switches = await page.locator('[role=switch]:not(.aw-default):not(.bk-troubleshoot-toggle):not(.af-status-switch)').evaluateAll(nodes => nodes.filter(n=>n.getClientRects().length).map(n=>[getComputedStyle(n).width,getComputedStyle(n).height]));
  for (const dimensions of switches) assert.deepEqual(dimensions,['34px','19px'],'Inconsistent switch dimensions: '+route);
  if (route === '/dashboard/funnels') await page.screenshot({ path: 'artifacts/theme-audit/funnels-dark.png', fullPage:true });
  for (const theme of ['dark','light']) {
    if (theme === 'light') { await page.locator('.global-theme-control').first().click(); await page.waitForTimeout(250); }
    for (const width of [320,390,767]) {
      await page.setViewportSize({ width, height:844 });
      await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => ({ width: innerWidth, scroll:document.documentElement.scrollWidth, offenders:[...document.querySelectorAll('body *')].filter(n => {const r=n.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2&&getComputedStyle(n).position!=='fixed'&&!n.closest('table,.layout-mobile-sidebar');}).slice(0,8).map(n => n.className) }));
      results.push({ route, theme, ...overflow });
    }
  }
  await page.setViewportSize({ width:1440,height:1000 });
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(500);
  assert.deepEqual(await snapshot(), light, 'Light appearance did not restore: '+route);
  fs.writeFileSync('artifacts/theme-audit/report.json',JSON.stringify({ errors, results },null,2));
  console.log('Checked '+route);
}
fs.writeFileSync('artifacts/theme-audit/report.json',JSON.stringify({ errors, results },null,2));
console.log(JSON.stringify({ routes:routes.length, errors, overflows:results.filter(r => r.scroll > r.width+2) },null,2));
await browser.close();
assert.deepEqual(errors, []);
assert.equal(results.filter(r => r.scroll > r.width+2).length, 0, 'Mobile overflow');
