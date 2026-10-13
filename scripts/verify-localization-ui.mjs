import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
import fs from 'node:fs';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',msg=>{if(msg.type()==='error'&&!/ERR_NETWORK_ACCESS_DENIED/.test(msg.text()))errors.push(msg.text());});
await page.addInitScript(()=>{
  localStorage.setItem('i18nextLng','en');
  localStorage.setItem('gos.auth',JSON.stringify({user:{id:'test-user',name:'Localization Tester',email:'test@example.com'},role:location.pathname.startsWith('/super-admin')?'SUPER_ADMIN':location.pathname.startsWith('/admin')?'ADMIN':'USER',tenant:{id:'test-tenant',name:'Test Workspace'},token:'demo-token'}));
});
await page.goto('http://127.0.0.1:5173/dashboard',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2000);
fs.writeFileSync('scripts/localization-browser-initial.json',JSON.stringify({url:page.url(),errors,text:await page.locator('body').innerText()},null,2));
await page.locator('.global-language-control').waitFor();
await page.locator('.global-language-control button[lang="en"]').click();
assert.equal(await page.locator('html').getAttribute('dir'),'ltr');
const search=page.locator('.layout-search input');
if(await search.count()) await search.fill('Unchanged input');
await page.locator('.global-language-control button[lang="ar"]').click();
await page.waitForTimeout(250);
assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
assert.equal(await page.locator('html').getAttribute('lang'),'ar');
if(await search.count()) assert.equal(await search.inputValue(),'Unchanged input');
assert.match(await page.locator('.layout-nav').first().innerText(),/حجز|المنتجات|التحليلات/);
await page.locator('.global-language-control button[lang="en"]').click();
assert.equal(await page.locator('html').getAttribute('dir'),'ltr');
if(await search.count()) assert.equal(await search.inputValue(),'Unchanged input');

const results=[];
const routes=process.env.LOCALIZATION_ROUTES?JSON.parse(process.env.LOCALIZATION_ROUTES):['/dashboard','/dashboard/booking','/dashboard/funnels','/dashboard/inbox','/dashboard/crm','/dashboard/follow-up','/dashboard/products','/dashboard/analytics','/dashboard/settings/profile','/dashboard/settings/business','/dashboard/settings/team','/dashboard/settings/knowledge','/dashboard/settings/tools','/dashboard/settings/integrations','/dashboard/settings/billing','/dashboard/settings/security','/dashboard/products-payments?tab=discounts','/dashboard/copilot','/dashboard/booking/new','/dashboard/booking?tab=calendar','/dashboard/booking?tab=templates','/dashboard/booking?tab=bookings','/dashboard/products-payments/products/new','/dashboard/products-payments/discounts/new','/admin','/super-admin'];
for(const route of routes) {
  await page.goto('http://127.0.0.1:5173'+route,{waitUntil:'domcontentloaded'});
  await page.locator('.global-language-control').first().waitFor();
  await page.locator('.gos-global-loader').waitFor({state:'hidden'});
  await page.waitForTimeout(500);
  let editedField;
  if(route==='/dashboard/booking/new') {
    const field=page.getByLabel('Booking page title',{exact:true});
    await field.fill('Unsaved draft مسودة اختبار');
    editedField=await field.elementHandle();
  }
  const formValues=await page.locator('input,select,textarea').evaluateAll(nodes=>nodes.map(n=>({value:n.value,name:n.name,type:n.type})));
  await page.locator('.global-language-control button[lang="ar"]').first().click();
  await page.waitForTimeout(400);
  assert.deepEqual(await page.locator('input,select,textarea').evaluateAll(nodes=>nodes.map(n=>({value:n.value,name:n.name,type:n.type}))),formValues,'Form values changed on language switch: '+route);
  if(editedField)assert.equal(await editedField.evaluate(n=>n.isConnected&&n.value==='Unsaved draft مسودة اختبار'),true,'Editor input remounted or draft changed');
  const english=await page.evaluate(()=>{
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const result=[];
    while(walker.nextNode()) {
      const n=walker.currentNode;
      if(!n.parentElement?.getClientRects().length||n.parentElement.closest('script,style,code,pre'))continue;
      const text=n.textContent.trim();
      if(/[a-z]{3}/i.test(text)&&!/[\u0600-\u06ff]/.test(text))result.push(text);
    }
    return [...new Set(result)];
  });
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  results.push({route,viewport:'desktop',overflow,english});
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(100);
  results.push({route,viewport:'mobile',overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)});
  fs.writeFileSync('scripts/localization-browser-report.json',JSON.stringify({errors,results},null,2));
  await page.setViewportSize({width:1440,height:1000});
}
fs.writeFileSync('scripts/localization-browser-report.json',JSON.stringify({errors,results},null,2));
assert.deepEqual(errors,[],'Browser runtime errors');
console.log(JSON.stringify({pages:routes.length,errors,overflows:results.filter(r=>r.overflow)},null,2));
await browser.close();
