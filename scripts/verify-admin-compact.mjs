import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const routes=['dashboard','conversations','onboarding','leads','plans','payments-gateways','transactions','funnels-websites','crm','booking','products','templates','analytics','landing','ai-usage','domains','integrations','settings'];
const report=[],errors=[];fs.mkdirSync('artifacts/admin-compact',{recursive:true});
const base=process.env.ADMIN_AUDIT_URL||'http://127.0.0.1:5177';
try {
for(const route of routes.filter(route=>!process.env.ADMIN_AUDIT_ROUTE||route===process.env.ADMIN_AUDIT_ROUTE)) {
 for(const language of ['en','ar']) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  await context.addInitScript(({language,theme})=>{localStorage.setItem('theme',theme);localStorage.setItem('i18nextLng',language);localStorage.setItem('gos.auth',JSON.stringify({user:{id:'compact-audit',name:'Admin Audit',email:'admin@example.com'},role:'ADMIN',tenant:{id:'platform',name:'Platform'},token:'demo-token'}));},{language,theme});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/admin/${route}`,{waitUntil:'domcontentloaded'});await page.locator('.adm-workspace').waitFor({timeout:60000});
  assert.equal(await page.locator('.layout-header').count(),1,'Shared Users header missing');
  const check=async(section)=>{await page.waitForTimeout(80);const dimensions=await page.evaluate(()=>{const main=document.querySelector('.adm-main');return {viewport:innerHeight,body:document.documentElement.scrollHeight,mainClient:main.clientHeight,mainScroll:main.scrollHeight,bottom:document.querySelector('.adm-workspace').getBoundingClientRect().bottom,sidebarScroll:document.querySelector('.adm-sidebar nav').scrollHeight,sidebarClient:document.querySelector('.adm-sidebar nav').clientHeight};});report.push({route,language,theme,section,...dimensions});assert.ok(dimensions.mainScroll<=dimensions.mainClient+1,JSON.stringify(report.at(-1)));assert.ok(dimensions.body<=1080,`Body overflow ${route}`);assert.ok(dimensions.bottom<=1080,`Clipped content ${route}`);};
  await check('default');
  if(language==='en'&&theme==='light'&&await page.locator('tbody tr').count()){
   const status=(await page.locator('tbody .adm-badge').first().textContent()).trim();
   await page.evaluate(({route,status})=>{const rows=Array.from({length:12},(_,i)=>({id:`compact-${i}`,name:`Compact record ${i+1}`,tenant:'Nova Studio',status,amount:'99',monthly:'99',annual:'990',users:'3',tokens:'1000',budget:'10000',progress:'50',probability:'40',position:String(i+1),features:'CRM, Booking',date:'2026-10-14',email:'audit@example.com',url:'https://example.com/webhook'}));localStorage.setItem(`gos.admin.v1.${route}.0`,JSON.stringify(rows));},{route,status});
   await page.reload();await page.locator('.adm-workspace').waitFor();assert.equal(await page.locator('tbody tr').count(),5,'Expected five rows per page');await check('five-row-page');await page.locator('.adm-pagination').getByRole('button',{name:'Next',exact:true}).click();assert.ok((await page.locator('tbody tr').first().textContent()).includes('Compact record 6'));await check('pagination-next');
   await page.getByRole('button',{name:'Edit Compact record 6',exact:true}).click();const drawer=await page.getByRole('dialog').evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight}));assert.ok(drawer.scroll<=drawer.client+1,`Drawer needs scrolling: ${route}`);await page.keyboard.press('Escape');await page.getByRole('button',{name:'Delete Compact record 6',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete record',exact:true}).click();await check('saved-notice');
   await page.locator('.adm-search input').fill('no-matching-record');await check('empty-search');await page.getByRole('button',{name:'Clear search',exact:true}).click();
  }

  const tabs=page.locator('.adm-tabs [role=tab]');for(let n=1;n<await tabs.count();n++){await tabs.nth(n).click();await page.waitForFunction(n=>document.getElementById(`adm-tab-${n}`)?.getAttribute('aria-selected')==='true',n);await check(`tab-${n}`);}
  if(route==='landing'){
   const sections=page.locator('.adm-cms-nav button');for(let n=0;n<await sections.count();n++){await sections.nth(n).click();const pages=page.locator('.adm-cms-pagination button').last();await check(`cms-${n}-1`);let count=1;while(await pages.count()&&await pages.isEnabled()){await pages.click();await check(`cms-${n}-${++count}`);}if(n===await sections.count()-1){const pricing=page.locator('.adm-pricing-tabs button');for(let j=0;j<await pricing.count();j++){await pricing.nth(j).click();await check(`pricing-${j}`);}}}
  }
  const select=page.locator('.adm-workspace [role=combobox]').first();if(await select.count()){await select.click();await page.getByRole('listbox').waitFor();await page.keyboard.press('Escape');}
  if(route==='dashboard'||route==='analytics'||route==='landing')await page.screenshot({path:`artifacts/admin-compact/${route}-${theme}-${language}.png`});
  await context.close();
 }
 console.log(`Verified ${route}: all themes, languages and sections fit 1080p`);
}
assert.deepEqual(errors,[]);fs.writeFileSync('artifacts/admin-compact/verification.json',JSON.stringify({report,errors},null,2));console.log(`PASS: ${report.length} compact layout states with zero page overflow.`);
} finally {await browser.close();}
