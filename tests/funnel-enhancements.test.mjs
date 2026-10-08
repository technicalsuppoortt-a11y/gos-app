import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const output=process.env.FUNNEL_SCREENSHOT_DIR;
const server=await createServer({server:{host:'127.0.0.1',port:5199,strictPort:true}});await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{localStorage.setItem('i18nextLng','en');localStorage.setItem('gos.auth',JSON.stringify({user:{id:'test',email:'test@example.com',name:'Mohamed Joe'},role:'USER',token:'test',tenant:{id:'test',name:'GOS'}}));});
 async function visit(path){await page.goto('http://127.0.0.1:5199'+path,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.aw-workspace,.aw-editor-host').waitFor();await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.layout-route-content')).opacity)===1);}
 async function fits(label){const sizes=await page.evaluate(()=>({body:document.documentElement.scrollHeight,viewport:innerHeight,main:[...document.querySelectorAll('.layout-main')].map(el=>({height:el.clientHeight,content:el.scrollHeight})),bottom:document.querySelector('.fn-analytics,.fn-leads,.fn-integrations')?.getBoundingClientRect().bottom??document.querySelector('.aw-performance')?.getBoundingClientRect().bottom??[...document.querySelectorAll('.aw-asset-card')].at(-1)?.getBoundingClientRect().bottom}));console.log(label,JSON.stringify(sizes));assert.ok(sizes.body<=sizes.viewport+1,JSON.stringify(sizes));assert.ok(sizes.bottom<=sizes.viewport-36,JSON.stringify(sizes));sizes.main.forEach(el=>assert.ok(el.content<=el.height+1,JSON.stringify(el)));}
 async function shot(name){if(output)await page.screenshot({path:join(output,name+'.png')});}
 for(const viewport of [{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
  await page.setViewportSize(viewport);await visit('/dashboard/funnels');assert.equal(await page.locator('.aw-asset-card').count(),6);await fits('List '+viewport.width);await shot('funnels-refined-'+viewport.width);if(viewport.width===1366){await page.getByRole('button',{name:'List view',exact:true}).click();await fits('Compact list 1366');await shot('funnels-compact-list');await page.getByRole('button',{name:'Grid view',exact:true}).click();}
  await visit('/dashboard/funnels/fitness');assert.equal(await page.locator('.aw-step-card').count(),5);await fits('Overview '+viewport.width);await shot('funnel-overview-refined-'+viewport.width);
 }
 await page.setViewportSize({width:1366,height:768});
 const initial=await page.locator('.aw-metric-value strong').first().innerText();
 await page.getByRole('combobox',{name:'Performance date range'}).click();await page.getByRole('option',{name:'Last 7 Days',exact:true}).click();
 assert.notEqual(await page.locator('.aw-metric-value strong').first().innerText(),initial);
 await page.getByRole('combobox',{name:'Performance date range'}).click();await page.getByRole('option',{name:'Custom Range',exact:true}).click();
 let modal=page.getByRole('dialog');await modal.getByLabel('Start date',{exact:true}).fill('2026-10-01');await modal.getByLabel('End date',{exact:true}).fill('2026-10-03');await modal.getByRole('button',{name:'Apply range',exact:true}).click();
 await page.getByRole('button',{name:'Analytics',exact:true}).click();await page.locator('.fn-chart').waitFor();await fits('Analytics 1366');assert.equal(await page.locator('.fn-dropoff>div').count(),5);await shot('funnel-analytics');
 const lineCount=await page.locator('.fn-chart polyline').count();await page.getByRole('button',{name:'Views',exact:true}).click();assert.equal(await page.locator('.fn-chart polyline').count(),lineCount-1);
 await page.getByRole('button',{name:'Leads',exact:true}).click();await page.getByPlaceholder('Search leads...').fill('Sarah');assert.equal(await page.locator('tbody tr').count(),1);
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export leads',exact:true}).click();const download=await downloaded;assert.equal(await download.failure(),null);if(output){const path=join(output,'funnel-leads.csv');await download.saveAs(path);const csv=await readFile(path,'utf8');assert.ok(csv.includes('Sarah Mitchell'));assert.ok(csv.includes('Step Captured'));}
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await fits('Leads 1366');await shot('funnel-leads');await page.getByRole('button',{name:'Next',exact:true}).click();assert.ok((await page.locator('.fn-leads').innerText()).includes('7–12'));
 await page.getByRole('button',{name:'Integrations',exact:true}).click();const toggle=page.getByRole('switch',{name:'Enable Meta Pixel'});await toggle.click();assert.equal(await toggle.getAttribute('aria-checked'),'false');
 await page.locator('.fn-integration-grid article').first().getByRole('button',{name:'Configure',exact:true}).click();modal=page.getByRole('dialog');await modal.getByLabel('Pixel ID').fill('123456789');await modal.getByRole('button',{name:'Save configuration'}).click();await page.reload();await page.getByRole('button',{name:'Integrations',exact:true}).click();assert.equal(await page.getByRole('switch',{name:'Enable Meta Pixel'}).getAttribute('aria-checked'),'false');await fits('Integrations 1366');await shot('funnel-integrations');
 await page.getByRole('button',{name:'fitzone.com',exact:true}).click();modal=page.getByRole('dialog');await modal.getByPlaceholder('Search available domains...').fill('mygym');await modal.getByRole('radio').click();await modal.getByRole('button',{name:'Connect domain',exact:true}).click();assert.equal(await page.getByRole('button',{name:'mygym.com',exact:true}).count(),1);
 await page.getByRole('button',{name:'Connect Domain',exact:true}).click();modal=page.getByRole('dialog');await modal.getByRole('button',{name:'Add New Domain',exact:true}).click();assert.equal(await page.getByRole('dialog').getByLabel('Domain name').count(),1);await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.getByRole('button',{name:'Steps',exact:true}).click();await page.getByRole('button',{name:'Preview Funnel',exact:true}).click();modal=page.getByRole('dialog');
 for(const [device,width]of [['Tablet',768],['Mobile',375],['Desktop',null]]){await modal.getByRole('button',{name:device+' preview',exact:true}).click();await page.waitForTimeout(250);const actual=await modal.locator('.aw-live-preview').evaluate(el=>el.getBoundingClientRect().width);if(width)assert.equal(Math.round(actual),width);await shot('funnel-preview-'+device.toLowerCase());}
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await visit('/dashboard/funnels/fitness/edit/home');await page.locator('.fn-focused-canvas').waitFor();assert.equal(await page.locator('.fb-pages-list').count(),0);assert.equal(await page.locator('.fn-focused-canvas').count(),1);assert.equal(await page.locator('.fn-focused-canvas').getAttribute('data-page-id'),'home');
 async function drop(kind,target,source=false){const data=await page.evaluateHandle(({kind,source})=>{const data=new DataTransfer();data.setData(source?'text/gos-section':'text/gos-block',kind);return data;},{kind,source});await target.dispatchEvent('dragover',{dataTransfer:data});assert.ok((await target.getAttribute('class')).includes('active'));await shot('funnel-insertion-line');await target.dispatchEvent('drop',{dataTransfer:data});await data.dispose();}
 await drop('Heading',page.locator('[data-drop-parent="root"]').first());let elements=page.locator('.fn-focused-canvas > .fn-canvas-node > [data-section-id]');assert.equal(await elements.first().getAttribute('data-element-type'),'Heading');
 const heading=elements.first();await heading.click();await heading.getByLabel('Inline heading').fill('A stronger start');await page.getByRole('button',{name:'Style',exact:true}).click();await page.getByRole('button',{name:'Content',exact:true}).click();assert.equal(await page.locator('.fb-right-panel textarea').first().inputValue(),'A stronger start');
 await heading.getByRole('button',{name:'Duplicate Heading',exact:true}).click();assert.equal(await page.locator('[data-element-type="Heading"]').count(),2);
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.locator('[data-element-type="Heading"]').count(),1);
 await page.getByRole('button',{name:'Redo',exact:true}).click();assert.equal(await page.locator('[data-element-type="Heading"]').count(),2);
 await page.locator('.fb-block-button').filter({hasText:/^Columns$/}).click();let columns=page.locator('[data-element-type="Columns"]').last();await drop('Button',columns.locator('[data-drop-column="1"]').last());const child=columns.locator('[data-element-type="Button"]');await child.click();await page.locator('.fb-right-panel').getByLabel('Button text',{exact:true}).fill('Book a session');
 await child.getByRole('button',{name:'Settings for Button',exact:true}).click();assert.ok((await page.locator('.fb-right-panel').innerText()).includes('Button settings'));await shot('funnel-focused-editor');
 const rootHeading=page.locator('.fn-focused-canvas > .fn-canvas-node > [data-element-type="Heading"]').first();const id=await rootHeading.getAttribute('data-section-id');await drop(id,columns.locator('[data-drop-column="0"]').last(),true);assert.equal(await columns.locator('[data-element-type="Heading"]').count(),1);
 await page.reload();await page.locator('.fn-focused-canvas').waitFor();assert.equal(await page.locator('[data-element-type="Columns"] [data-element-type="Button"]').count(),1);
 await visit('/dashboard/funnels/fitness/edit/funnel-step-lead-form');assert.equal(await page.locator('.fn-focused-canvas').getAttribute('data-page-id'),'funnel-step-lead-form');assert.equal(await page.locator('[data-element-type="Hero"]').count(),0);
 await visit('/dashboard/funnels/fitness/edit/missing');assert.equal(await page.getByText('Step not found',{exact:true}).count(),1);
 await visit('/dashboard/websites/fitzone-site');assert.equal(await page.locator('.aw-page-row').count(),7);
 assert.deepEqual(errors,[]);console.log('Funnel enhancement checks passed: viewport fit, date ranges, mock tabs, export, persisted integration configuration, domain selection, preview devices, focused editing, positional/nested drops, contextual inspector, undo/redo and persistence.');
}finally{await browser?.close();await server.close();}
