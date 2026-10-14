import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const results=[],errors=[];
try {
 for(const language of ['en','ar']) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  await context.addInitScript(({language,theme})=>{
   localStorage.setItem('theme',theme);localStorage.setItem('i18nextLng',language);
   localStorage.setItem('gos.auth',JSON.stringify({user:{id:'audit',name:'Admin Audit',email:'admin@example.com'},role:'ADMIN',tenant:{id:'platform',name:'Platform'},token:'demo-token'}));
   localStorage.setItem('gos.admin.v1.ai-usage.0',JSON.stringify(Array.from({length:12},(_,i)=>({id:`model-${i}`,name:`Model ${i}`,tenant:['Nova Studio','Atlas Agency','Cairo Growth'][i%3],status:'Active',model:'GPT-4.1',tokens:'1000',budget:'10000'}))));
   localStorage.setItem('gos.admin.v1.payments-gateways.0',JSON.stringify(Array.from({length:12},(_,i)=>({id:`gateway-${i}`,name:`Gateway ${i}`,tenant:'Platform',status:'Connected',merchant:`merchant-${i}`,mode:'Sandbox'}))));
   localStorage.setItem('gos.admin.v1.analytics.0',JSON.stringify(Array.from({length:12},(_,i)=>({id:`event-${i}`,name:`Event ${i}`,tenant:'Nova Studio',status:'Completed',event:'Lead captured',date:'2026-10-14'}))));
  },{language,theme});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['dashboard','analytics']) {
   await page.goto(`http://127.0.0.1:5177/admin/${route}`,{waitUntil:'domcontentloaded'});await page.locator('.adm-workspace').waitFor();
   assert.equal(await page.locator('.adm-budget-list>div').count(),route==='analytics'?2:3);
   if(route==='dashboard')assert.equal(await page.locator('.adm-health').count(),4);
   const check=async()=>{const geometry=await page.locator('.adm-main').evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight}));assert.ok(geometry.scroll<=geometry.client+1,`${route} ${language} ${theme}: ${JSON.stringify(geometry)}`);results.push({route,language,theme,...geometry});};
   await check();await page.locator('.adm-mini-pagination').first().getByRole('button').last().click();await check();
   if(route==='dashboard'){await page.locator('.adm-mini-pagination').last().getByRole('button').last().click();await check();}
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('artifacts/admin-compact/widget-growth.json',JSON.stringify({results,errors},null,2));console.log(`PASS: ${results.length} growing-widget layout states and pagination interactions.`);
} finally {await browser.close();}
