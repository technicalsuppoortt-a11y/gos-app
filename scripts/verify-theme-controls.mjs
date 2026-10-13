import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('artifacts/theme-audit', { recursive:true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless:true, channel:'chrome' });
const page = await browser.newPage({ viewport:{ width:390,height:844 } });
await page.addInitScript(() => {
  localStorage.setItem('theme','dark'); localStorage.setItem('i18nextLng','en');
  localStorage.setItem('gos.auth',JSON.stringify({user:{id:'audit',name:'Audit',email:'audit@example.com'},role:location.pathname.startsWith('/super-admin')?'SUPER_ADMIN':'USER',tenant:{id:'audit',name:'Audit'},token:'demo-token'}));
});
const base = process.env.THEME_AUDIT_URL || 'http://127.0.0.1:5174';
await page.goto(base+'/dashboard/funnels',{waitUntil:'domcontentloaded'});
await page.locator('.aw-asset-card').first().waitFor();
for (const width of [320,390,767]) {
  await page.setViewportSize({ width,height:844 });
  await page.getByRole('button',{ name:'Open navigation',exact:true }).click();
  await page.getByRole('dialog',{ name:'Workspace navigation' }).waitFor();
  assert.equal(await page.evaluate(() => document.body.style.overflow),'hidden');
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await page.getByRole('dialog',{ name:'Workspace navigation' }).waitFor({ state:'hidden' });
}
await page.setViewportSize({width:390,height:844});
await page.locator('.aw-select-trigger').first().click();
const menu = page.locator('.aw-select-popup'); await menu.waitFor();
assert.notEqual(await menu.evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');
await page.keyboard.press('Escape');
await page.getByRole('button',{name:'Create Funnel',exact:true}).click();
const dialog = page.locator('.st-modal'); await dialog.waitFor();
assert.notEqual(await dialog.evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
await page.screenshot({path:'artifacts/theme-audit/funnel-modal-mobile.png'});
await page.keyboard.press('Escape');
await page.goto(base+'/dashboard/booking/new',{waitUntil:'domcontentloaded'});
await page.locator('.bk-toggle').first().waitFor();
const toggle=page.locator('.bk-toggle:not(:disabled)').first();
const before=await toggle.getAttribute('aria-checked');
const dimensions=await toggle.evaluate(n=>({width:getComputedStyle(n).width,height:getComputedStyle(n).height}));
assert.deepEqual(dimensions,{width:'34px',height:'19px'});
await toggle.focus(); await page.keyboard.press('Space'); await page.waitForTimeout(250);
assert.notEqual(await toggle.getAttribute('aria-checked'),before);
assert.equal(await toggle.evaluate(n=>getComputedStyle(n).backgroundColor), before==='false'?'rgb(99, 102, 241)':'rgb(71, 85, 105)');
await page.locator('.global-language-control button[lang=ar]').click();
assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
if(await toggle.getAttribute('aria-checked')==='true') assert.equal(await toggle.evaluate(n=>getComputedStyle(n,'::after').transform),'matrix(1, 0, 0, 1, -15, 0)');
await page.goto(base+'/super-admin',{waitUntil:'domcontentloaded'});
await page.locator('.sa-menu-button').waitFor();
for (const width of [320,390,767]) {
  await page.setViewportSize({width,height:844});
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'Platform navigation'}); await drawer.waitFor();
  assert.equal(await drawer.getByText('All Clients',{exact:true}).isVisible(),true);
  await page.keyboard.press('Escape'); await drawer.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
}
console.log('Passed: phone/tablet drawers, Escape and scroll restoration, portal dropdown, mobile modal, switch sizing, keyboard state and RTL thumb motion.');
await browser.close();
