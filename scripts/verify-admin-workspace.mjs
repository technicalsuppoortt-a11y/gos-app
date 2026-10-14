import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-features=BackForwardCache']});
async function choose(page,label,option){await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:option,exact:true}).click();}
const baseURL=process.env.ADMIN_AUDIT_URL||'http://127.0.0.1:5175';
const errors=[];const results=[];fs.mkdirSync('artifacts/admin-expansion',{recursive:true});
const routes=['dashboard','users','conversations','onboarding','leads','plans','payments-gateways','transactions','funnels-websites','crm','booking','products','templates','analytics','landing','ai-usage','domains','integrations','settings'];
try {
 for(const language of ['en','ar']) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  if(process.env.ADMIN_AUDIT_OFFLINE_FONTS==='1')await context.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:'/* Use system fallback fonts in restricted environments. */'}));
  await context.addInitScript(({language,theme})=>{
   localStorage.setItem('theme',theme);localStorage.setItem('i18nextLng',language);
   localStorage.setItem('gos.auth',JSON.stringify({user:{id:'admin-audit',name:'Admin Audit',email:'admin@example.com'},role:'ADMIN',tenant:{id:'platform',name:'Platform'},token:'demo-token'}));
  },{language,theme});
  const track=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});};let page=await context.newPage();track(page);
  for(const route of routes) {
   if(page.url()!=='about:blank'){await page.close();page=await context.newPage();track(page);}
   await page.goto(`${baseURL}/admin/${route}`,{waitUntil:'domcontentloaded'});
   try {await page.locator(route==='users'?'.role-shell':'.adm-workspace').waitFor({timeout:60000});} catch(error){console.error(JSON.stringify({route,url:page.url(),errors,body:(await page.locator('body').innerText()).slice(0,1400)}));throw error;}
   assert.equal(await page.locator('html').getAttribute('dir'),language==='ar'?'rtl':'ltr');
   assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
   if(route!=='users') {
    assert.equal(await page.locator('.adm-sidebar nav a').count(),19);
    assert.ok(await page.locator('.adm-workspace h1').textContent());await page.evaluate(()=>document.fonts.ready);const geometry=await page.locator('.adm-main').evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight}));assert.ok(geometry.scroll<=geometry.client+1,`Desktop overflow: ${route} ${language} ${theme}`);
    if(theme==='dark')assert.notEqual(await page.locator('.adm-panel').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','White card in dark mode');
    const tabs=page.locator('.adm-tabs [role=tab]');
    for(let n=0;n<await tabs.count();n++) {
     await tabs.nth(n).click();await page.waitForFunction(n=>document.getElementById(`adm-tab-${n}`)?.getAttribute('aria-selected')==='true',n);
     assert.equal(await tabs.nth(n).getAttribute('aria-selected'),'true',`${route} tab ${n}`);
     assert.ok(await page.locator('tbody tr').count()>0,`Missing records ${route} tab ${n}`);
    }
    if(route==='dashboard') await page.screenshot({path:`artifacts/admin-expansion/dashboard-${theme}-${language}.png`});
    for(const width of [320,390,768]) {await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Horizontal page overflow ${route} at ${width}px`);}
    await page.locator('.adm-shared-header .layout-menu-button').click();await page.locator('.adm-sidebar.is-open').waitFor();await page.keyboard.press('Escape');await page.locator('.adm-sidebar.is-open').waitFor({state:'hidden'});
    await page.setViewportSize({width:1920,height:1080});
   }
   results.push({route,language,theme});
  }
  if(language==='en'&&theme==='light') {
   await page.goto(baseURL+'/admin/leads');await page.locator('.adm-workspace').waitFor();
   await page.getByRole('button',{name:'Add record',exact:true}).click();
   const dialog=page.getByRole('dialog');await dialog.getByLabel('Name / reference',{exact:true}).fill('Admin verification lead');await dialog.getByLabel('Email',{exact:true}).fill('verify@example.com');await dialog.getByRole('button',{name:'Save changes'}).click();
   await page.locator('.adm-search input').fill('Admin verification lead');assert.equal(await page.locator('tbody tr').count(),1);
   await page.reload();await page.locator('.adm-workspace').waitFor();await page.locator('.adm-search input').fill('Admin verification lead');assert.equal(await page.locator('tbody tr').count(),1,'Lead did not persist');
   await page.getByRole('button',{name:'Delete Admin verification lead'}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete record',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),0);
   await page.goto(baseURL+'/admin/transactions');await page.locator('.adm-workspace').waitFor();await choose(page,'Status','Completed');assert.equal(await page.locator('tbody tr').count(),1);await page.getByRole('button',{name:'Refund',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Save changes'}).click();assert.equal(await page.locator('tbody tr').count(),0);await choose(page,'Status','Refunded');assert.equal(await page.locator('tbody tr').count(),2);
   await page.goto(baseURL+'/admin/templates');await page.locator('.adm-workspace').waitFor();await choose(page,'Status','Draft');const count=await page.locator('tbody tr').count();await page.getByRole('button',{name:'Publish',exact:true}).first().click();assert.equal(await page.locator('tbody tr').count(),count-1);
   await page.goto(baseURL+'/admin/plans');await page.locator('.adm-workspace').waitFor();await page.getByRole('button',{name:'Edit Starter',exact:true}).click();await page.getByRole('dialog').getByLabel('AI',{exact:true}).check();await page.getByRole('dialog').getByRole('button',{name:'Save changes'}).click();assert.ok((await page.locator('tbody tr').first().textContent()).includes('AI'));
   await page.getByRole('tab',{name:'Pricing tiers',exact:true}).focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.activeElement?.id==='adm-tab-1');assert.equal(await page.getByRole('tab',{name:'Subscriptions',exact:true}).getAttribute('aria-selected'),'true');
   await page.goto(baseURL+'/admin/landing');await page.locator('.adm-workspace').waitFor();const title=page.locator('.adm-cms-fields textarea').nth(1);await title.fill('Verified CMS headline');await page.getByRole('button',{name:'Save draft',exact:true}).click();
   const publicPage=await context.newPage();publicPage.on("pageerror",e=>errors.push(e.message));publicPage.on("console",m=>{if(m.type()==="error")errors.push(m.text());});await publicPage.goto(baseURL+'/');await publicPage.locator('h1').waitFor();assert.ok(!(await publicPage.locator('h1').textContent()).includes('Verified CMS headline'),'Draft leaked into public page');
   await publicPage.goto(baseURL+'/?cms-preview=1');await publicPage.locator('h1').waitFor();assert.ok((await publicPage.locator('h1').textContent()).includes('Verified CMS headline'));
   await page.getByRole('button',{name:'Publish content',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Publish',exact:true}).click();await publicPage.goto(baseURL+'/');await publicPage.locator('h1').waitFor();assert.ok((await publicPage.locator('h1').textContent()).includes('Verified CMS headline'));
   await page.getByRole('button',{name:'Pricing & CTA links',exact:true}).click();await page.getByLabel('Primary CTA destination',{exact:true}).fill('javascript:alert(1)');await page.getByRole('button',{name:'Save draft',exact:true}).click();assert.ok((await page.locator('[role=status]').textContent()).includes('HTTPS'));
   await page.getByLabel('Primary CTA destination',{exact:true}).fill('/login');await page.getByRole('textbox',{name:'Pricing headline (English)',exact:true}).fill('Verified pricing headline');await page.getByRole('tab',{name:'Starter',exact:true}).click();await page.getByLabel('Monthly price (USD)',{exact:true}).fill('39');await page.getByRole('button',{name:'Publish content',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Publish',exact:true}).click();await publicPage.reload();await publicPage.locator('#pricing').waitFor();assert.ok((await publicPage.locator('#pricing').textContent()).includes('Verified pricing headline'));assert.ok((await publicPage.locator('#pricing').textContent()).includes('$39'));assert.equal(await publicPage.locator('#lp-header-book').getAttribute('href'),'/login');
   await choose(page,'Content language','العربية');await page.getByRole('button',{name:'Hero',exact:true}).click();await page.locator('.adm-cms-fields textarea').nth(1).fill('عنوان عربي للتحقق');await page.getByRole('button',{name:'Publish content',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Publish',exact:true}).click();await publicPage.locator('#lp-lang-toggle').click();await publicPage.waitForFunction(()=>document.querySelector('.lp')?.getAttribute('lang')==='ar');assert.ok((await publicPage.locator('h1').textContent()).includes('عنوان عربي للتحقق'));
   // Recover from malformed persisted CMS rather than crashing the public page.
   await publicPage.evaluate(()=>localStorage.setItem('gos.landing.published.v1',JSON.stringify({en:{hero:{titleA:'invalid'}}})));await publicPage.reload();await publicPage.locator('h1').waitFor();assert.ok(!(await publicPage.locator('h1').textContent()).includes('invalid'));
   await page.screenshot({path:'artifacts/admin-expansion/cms-light-en.png'});await publicPage.close();
  }
  await context.close();
  console.log(`Verified ${language} / ${theme}: ${routes.length} routes`);
 }
 assert.deepEqual(errors,[],'Browser runtime errors');fs.writeFileSync('artifacts/admin-expansion/verification.json',JSON.stringify({results,errors,offlineFonts:process.env.ADMIN_AUDIT_OFFLINE_FONTS==='1'},null,2));console.log(`PASS: ${results.length} route/theme/language combinations; sub-tabs, mobile navigation, persistent CRUD, refund, publish toggles and CMS draft/publish.`);
} finally {await browser.close();}
