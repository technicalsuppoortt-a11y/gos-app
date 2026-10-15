import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const base=process.env.ADMIN_AUDIT_URL || 'http://127.0.0.1:5181';
const errors=[],checks=[];
const folder='artifacts/admin-template-hub';
fs.mkdirSync(folder,{recursive:true});
try {
 for(const language of ['en','ar']) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width:1366,height:768}});
  await context.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await context.addInitScript(({language,theme})=>{
   localStorage.setItem('theme',theme);localStorage.setItem('i18nextLng',language);
   localStorage.setItem('gos.auth',JSON.stringify({user:{id:'audit',name:'Admin',email:'admin@example.com'},role:'ADMIN',tenant:{id:'platform',name:'Platform'},token:'demo-token'}));
   const fixtures={
    'gos.admin.v1.leads.0':[{id:'legacy-lead',name:'Preserved tenant lead',tenant:'Nova Studio',status:'New',source:'Funnel',email:'preserved@example.com'}],
    'gos.admin.v1.crm.0':[{id:'legacy-stage',name:'Preserved pipeline stage',tenant:'Platform',status:'Active',position:'2',probability:'45'}],
    'gos.admin.v1.crm.1':[{id:'legacy-field',name:'Preserved custom field',tenant:'Platform',status:'Active',type:'Text',required:'No'}],
    'gos.admin.v1.crm.2':[{id:'legacy-default',name:'Preserved CRM default',tenant:'Platform',status:'Active',value:'Round robin'}],
    'gos.admin.v1.funnels-websites.1':[{id:'legacy-design',name:'Preserved funnel design',tenant:'Platform',status:'Draft',category:'Funnel',content:'Legacy design content'}],
   };
   for(const [key,rows] of Object.entries(fixtures))if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify(rows));
  },{language,theme});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const visit=async path=>{await page.goto(base+path);await page.locator('.adm-workspace').waitFor({timeout:60000});};
  const choose=async(label,value,root=page)=>{await root.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click();};
  for(const route of ['booking','funnels','crm','templates']) {
   await visit(`/admin/${route}`);
   assert.equal(await page.locator('.adm-sidebar nav a[href="/admin/leads"]').count(),0,'Standalone Leads navigation remains');
   assert.equal(await page.locator('.adm-sidebar nav a').count(),19);
   const tabs=page.getByRole('tab');const count=await tabs.count();
   assert.equal(count,{booking:3,funnels:1,crm:4,templates:10}[route]);
   if(language==='en' && route==='crm')assert.deepEqual(await tabs.allTextContents(),['Leads Database','Pipeline stages','Custom fields','CRM defaults']);
   if(language==='en' && route==='templates')assert.deepEqual(await tabs.allTextContents(),['Funnels','Websites','Landing Pages','Booking Pages','CRM Pipelines','AI Assistants','AI Knowledge Packs','Automations','Products','Messages (Email / SMS / WhatsApp)']);
   for(let tab=0;tab<count;tab++) {
    await tabs.nth(tab).click();await page.waitForFunction(tab=>document.querySelector(`#adm-tab-${tab}`)?.getAttribute('aria-selected')==='true',tab);
    assert.equal(await page.locator('.adm-panel').getAttribute('aria-labelledby'),`adm-tab-${tab}`);
    if(route==='booking')assert.equal(await page.locator('.adm-primary,.adm-row-actions,tbody button').count(),0,'Booking mutation controls');
    if(route==='crm')assert.match(await page.locator('tbody').innerText(),[/Preserved tenant lead/,/Preserved pipeline stage/,/Preserved custom field/,/Preserved CRM default/][tab]);
    if(route==='templates') {
     assert.equal(await page.getByRole('combobox',{name:'Asset type',exact:true}).count(),0,'Generic category dropdown remains');
     const allowed=await page.evaluate(async(tab)=>{const {templateHubTabs,labels}=await import('/src/pages/admin/catalog.ts');return templateHubTabs[tab].categories.flatMap(value=>[value,labels[value]??value]);},tab);
     for(const category of await page.locator('tbody tr td:nth-child(2)').allTextContents())assert.ok(allowed.includes(category),`Wrong category on tab ${tab}: ${category}`);
    }
    for(const viewport of [{width:1366,height:768},{width:1024,height:640},{width:390,height:844}]) {
     await page.setViewportSize(viewport);await page.waitForTimeout(80);
     const geometry=await page.evaluate(()=>{const main=document.querySelector('.adm-main'),table=document.querySelector('.adm-table-wrap');return {main:main.clientHeight,scroll:main.scrollHeight,body:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,last:document.querySelector('tbody tr:last-child')?.getBoundingClientRect().bottom,tableBottom:table.getBoundingClientRect().bottom};});
     assert.ok(geometry.scroll<=geometry.main+1,`Page overflow ${JSON.stringify({route,tab,language,theme,viewport,geometry})}`);
     assert.ok(geometry.body<=viewport.height+1 && geometry.width<=viewport.width,'Document overflow');
     assert.ok(!geometry.last || geometry.last<=geometry.tableBottom+1,'Clipped rows');
     checks.push({route,tab,language,theme,...viewport});
    }
    await page.setViewportSize({width:1366,height:768});
   }
   await page.screenshot({path:`${folder}/${route}-${language}-${theme}.png`});
  }
  await visit('/admin/leads');assert.match(page.url(),/\/admin\/crm$/);
  await visit('/admin/funnels?tab=1');assert.match(page.url(),/\/admin\/templates$/);
  await visit('/admin/funnels-websites');assert.equal(await page.getByRole('tab').count(),1);
  const guards=await page.evaluate(async()=>{const repo=await import('/src/pages/admin/repository.ts');const lib=await import('/src/pages/admin/template-library.ts');return {oldRows:repo.readRows('funnels-websites',1),oldWrite:repo.saveRows('funnels-websites',1,[]),bookingWrite:repo.saveRows('booking',0,[]),legacyDesign:lib.readSystemTemplates().some(row=>row.id==='legacy-design')}});
  assert.deepEqual(guards,{oldRows:[],oldWrite:false,bookingWrite:false,legacyDesign:true});
  if(language==='en'&&theme==='light') {
   // Create one record in every hub tab and ensure category is assigned without crossing tabs.
   for(let tab=0;tab<10;tab++) {
    await visit(`/admin/templates?tab=${tab}`);await page.getByRole('button',{name:'Add record',exact:true}).click();
    const dialog=page.getByRole('dialog');await dialog.getByLabel('Name / reference',{exact:true}).fill(`Hub audit ${tab}`);await dialog.getByLabel('Content',{exact:true}).fill(`Content for category ${tab}`);
    assert.equal(await dialog.getByRole('combobox',{name:'Asset type',exact:true}).count(),0);
    if(tab===9)await choose('Message channel','WhatsApp',dialog);
    await dialog.getByRole('button',{name:'Save changes'}).click();await page.locator('.adm-search input').fill(`Hub audit ${tab}`);assert.equal(await page.locator('tbody tr').count(),1);
   }
   // All message channels share a tab; filtering by channel stays local to it.
   await choose('Message channel','Email');assert.equal(await page.locator('tbody tr').count(),0);await choose('Message channel','WhatsApp');assert.equal(await page.locator('tbody tr').count(),1);
   await visit('/admin/templates?tab=1');await page.locator('.adm-search input').fill('Hub audit 1');await page.getByRole('button',{name:'Edit Hub audit 1'}).click();await page.getByRole('dialog').getByLabel('Content',{exact:true}).fill('Updated website content');await page.getByRole('button',{name:'Save changes'}).click();
   await page.reload();await page.locator('.adm-search input').fill('Hub audit 1');assert.match(await page.locator('tbody').innerText(),/Updated website content/);
   await page.getByRole('button',{name:'Unpublish',exact:true}).click();
   assert.equal(await page.evaluate(async()=>{const lib=await import('/src/pages/admin/template-library.ts');return lib.publishedPageTemplates().some(t=>t.name==='Hub audit 1');}),false);
   await page.getByRole('button',{name:'Delete Hub audit 1'}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete record',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),0);
   await visit('/admin/templates?tab=0');await page.locator('.adm-search input').fill('Hub audit 0');assert.equal(await page.locator('tbody tr').count(),1,'Editing/deleting another category damaged Funnels');
   await visit('/admin/crm');await page.getByRole('button',{name:'Edit Preserved tenant lead'}).click();await page.getByRole('dialog').getByLabel('Name / reference',{exact:true}).fill('Updated preserved lead');await page.getByRole('button',{name:'Save changes'}).click();await page.reload();assert.match(await page.locator('tbody').innerText(),/Updated preserved lead/);
   await page.getByRole('tab').nth(1).click();await page.waitForFunction(()=>document.querySelector('#adm-tab-1')?.getAttribute('aria-selected')==='true');assert.match(await page.locator('tbody').innerText(),/Preserved pipeline stage/);
   await visit('/admin/templates?tab=0');await page.getByRole('tab').first().focus();await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('#adm-tab-9')?.getAttribute('aria-selected')==='true');assert.equal(await page.getByRole('tab').last().getAttribute('aria-selected'),'true');await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('#adm-tab-0')?.getAttribute('aria-selected')==='true');assert.equal(await page.getByRole('tab').first().getAttribute('aria-selected'),'true');
  }
  if(language==='ar') {
   await visit('/admin/templates?tab=0');await page.getByRole('tab').first().focus();await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>document.querySelector('#adm-tab-1')?.getAttribute('aria-selected')==='true');assert.equal(await page.getByRole('tab').nth(1).getAttribute('aria-selected'),'true');
  }
  await context.close();console.log(`Verified ${language}/${theme}`);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${folder}/verification.json`,JSON.stringify({checks,errors},null,2));console.log(`PASS: ${checks.length} viewport/language/theme checks; 10-category CRUD, message filtering, lead/CRM preservation, legacy redirects and template isolation.`);
} finally {await browser.close();}

