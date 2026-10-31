import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const server = await createServer({server:{host:'127.0.0.1',port:0}});
await server.listen();
let browser;
try {
 browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[]; page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/form-controls.html?theme=1&selected=theme-form`);
 await page.locator('.form-canvas-wrapper').waitFor();
 for (const dashboardDark of [false,true]) {
  await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dashboardDark);
  for (const [name,dark] of [['Modern Slate & Glow',true],['Soft Mesh Gradient',false],['Aurora Borealis',true],['Blank / Clean White',false]]) {
   await page.getByRole('button',{name:'Theme & Background',exact:true}).click();
   await page.getByText(name,{exact:true}).click();
   const canvas=page.locator('.form-canvas-wrapper');
   assert.equal(await canvas.getAttribute('data-form-theme'),dark?'dark':'light');
   await page.waitForFunction(() => getComputedStyle(document.querySelector('.form-canvas-wrapper')).background === getComputedStyle(document.querySelector('[data-public-asset]')).background);
   const bg=await canvas.evaluate(node=>getComputedStyle(node).background);
   const live=page.locator('[data-public-asset]');
   assert.equal(await live.evaluate(node=>getComputedStyle(node).background),bg);
   assert.equal(await live.locator('.fb-live-page-nav,.fb-site-footer').count(),0);
   assert.equal(await live.locator('.fb-standalone-form-header button').count(),0);
   await live.getByText('Secure SSL Submission',{exact:true}).waitFor();
   const headingColor=await live.locator('h2').evaluate(node=>getComputedStyle(node).color);
   assert.equal(headingColor,dark?'rgb(248, 250, 252)':'rgb(15, 23, 42)');
   const editorColors = await canvas.locator('input:not([type=checkbox]):not([type=radio])').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).color));
   assert.ok(editorColors.length >= 3 && editorColors.every(color=>color===headingColor));
   const captureScreens = process.env.FORM_UI_SCREENSHOTS && !dashboardDark && (name === 'Modern Slate & Glow' || name === 'Blank / Clean White');
   if (captureScreens) {
    await mkdir(process.env.FORM_UI_SCREENSHOTS,{recursive:true});
    await page.locator('.form-studio').screenshot({path:`${process.env.FORM_UI_SCREENSHOTS}/form-studio-${dark?'dark':'light'}.png`});
    await live.screenshot({path:`${process.env.FORM_UI_SCREENSHOTS}/form-live-${dark?'dark':'light'}.png`});
   }
   await page.getByRole('button',{name:'Interactive Preview',exact:true}).click();
   const preview=page.locator('.form-studio [data-form-theme]');
   await page.waitForFunction(() => getComputedStyle(document.querySelector('.form-studio [data-form-theme]')).background === getComputedStyle(document.querySelector('[data-public-asset]')).background);
   assert.equal(await preview.evaluate(node=>getComputedStyle(node).background),bg);
   assert.equal(await preview.locator('h2').evaluate(node=>getComputedStyle(node).color),headingColor);
   assert.equal(await preview.locator('.fb-field-label').first().evaluate(node=>getComputedStyle(node).color),headingColor);
   assert.equal(await preview.locator('.fb-custom-form input').first().evaluate(node=>getComputedStyle(node).color),headingColor);
   assert.equal(await preview.locator(':scope > div').evaluate(node=>getComputedStyle(node).backgroundColor),await live.locator('.fb-canvas-section').evaluate(node=>getComputedStyle(node).backgroundColor));
   if (captureScreens) await preview.screenshot({path:`${process.env.FORM_UI_SCREENSHOTS}/form-preview-${dark?'dark':'light'}.png`});
   await page.getByRole('button',{name:'Builder',exact:true}).click();
  }
 }
 assert.deepEqual(errors,[]);
 console.log('Blank, slate, mesh and aurora themes synchronize across editor, interactive preview and public renderer in both dashboard modes; standalone chrome is clean.');
} finally { await browser?.close(); await server.close(); }
