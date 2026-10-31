import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const server = await createServer({server:{host:'127.0.0.1',port:0}});
await server.listen();
let browser;
try {
 browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/form-controls.html`);
 await page.locator('.pf-form-wireframe').first().waitFor();
 const images=await page.locator('.pf-form-wireframe').evaluateAll(nodes=>nodes.map(node=>node.innerHTML));
 assert.equal(new Set(images).size,images.length);
 assert.ok(images.length >= 10);
 assert.equal(await page.locator('.pf-template-card .pf-template-preview,.pf-template-card img,.pf-template-card svg image').count(),0);
 assert.ok(images.every(image=>image.includes('<rect') && image.includes('#7C3AED') && image.includes('#A78BFA')));
 for (const dark of [false,true]) {
  await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
  await page.getByRole('combobox',{name:'Template goal',exact:true}).click();
  const panel=page.getByRole('listbox'); await panel.waitFor();
  assert.equal(await panel.evaluate(node=>getComputedStyle(node).backdropFilter),'blur(18px)');
  if (process.env.FORM_UI_SCREENSHOTS) {
   await mkdir(process.env.FORM_UI_SCREENSHOTS,{recursive:true});
   await page.screenshot({path:`${process.env.FORM_UI_SCREENSHOTS}/form-templates-${dark?'dark':'light'}.png`});
  }
  await page.keyboard.press('Escape');
 }
 await page.evaluate(()=>document.documentElement.classList.remove('dark'));
 await page.getByRole('button',{name:'Open embed builder'}).click();
 await page.locator('[data-section-id="embed-form"]').click();
 await page.getByRole('combobox',{name:'Workspace form',exact:true}).click();
 assert.equal(await page.getByRole('option',{name:'Draft inquiry',exact:true}).count(),0);
 assert.equal(await page.getByRole('option',{name:'Archived inquiry',exact:true}).count(),0);
 await page.getByRole('option',{name:'Workspace inquiry',exact:true}).click();
 await page.locator('.fb-site-frame').getByText('Email address',{exact:false}).waitFor();
 await page.waitForFunction(()=>window.__document?.pages[0].sections[0].content.formAssetId);
 const content=await page.evaluate(()=>window.__document.pages[0].sections[0].content);
 assert.equal(JSON.parse(content.customFields).length,3);
 assert.equal(content.formName,'Workspace inquiry');
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/form-controls.html?gallery=1`);
 await page.getByRole('tab',{name:'Forms',exact:true}).waitFor();
 assert.equal(await page.getByRole('tab',{name:'Forms',exact:true}).getAttribute('aria-selected'),'true');
 assert.ok(await page.locator('.pf-form-wireframe').count() >= 10);
 assert.equal(await page.locator('.pf-template-card .pf-template-preview').count(),0);
 assert.deepEqual(errors,[]);
 console.log('Unique form previews, light/dark dropdowns, and workspace form picker with immediate canvas rendering passed.');
} finally { await browser?.close(); await server.close(); }
