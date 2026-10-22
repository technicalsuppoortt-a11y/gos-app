import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fixture = new URL('./fixtures/commerce-save-workspace.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-template-tests', optimizeDeps: { entries: ['tests/fixtures/commerce-save.html'] }, plugins: [react(), { name: 'mock-workspace', enforce: 'pre', resolveId(source) { if (/backend\/workspace$/.test(source)) return fixture; } }], server: { host: '127.0.0.1', port: 0 } });
console.log('Starting fixture server'); await server.listen(); console.log('Fixture server ready'); let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  console.log('Browser ready'); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  console.log('Loading fixture'); await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType:'text/css',body:''})); await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/commerce-save.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const go = () => page.evaluate(() => window.__router.navigate('/dashboard/products?tab=templates'));
  await go(); console.log('Opened template route'); await page.locator('.pt-card').first().waitFor();
  console.log('Cards rendered'); assert.equal(await page.locator('.pt-card').count(), 6);
  await page.getByRole('button', {name:'Courses 2', exact:true}).click();
  assert.equal(await page.locator('.pt-card').count(), 2);
  await page.getByRole('combobox', {name:'Industry/Niche', exact:true}).click(); await page.getByRole('option', {name:'Marketing & Growth', exact:true}).click();
  assert.equal(await page.locator('.pt-card').count(), 1);
  await page.getByLabel('Search product templates').fill('impossible'); assert.equal(await page.locator('.pt-card').count(), 0);
  await page.getByRole('button', {name:'Clear filters', exact:true}).click();
  await page.locator('.pt-card').nth(4).getByRole('button', {name:'Preview',exact:true}).click();
  console.log('Waiting for preview'); await page.getByRole('dialog').waitFor();
  await page.getByLabel('3 × $75 monthly').check(); assert.equal(await page.locator('.pt-price').innerText(), '$75 × 3');
  await page.getByRole('button', {name:'Close preview'}).click();
  await page.locator('.pt-card').first().hover(); await page.waitForTimeout(1200); assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('combobox', {name:'Sort templates'}).click(); await page.getByRole('option',{name:'Price: Low to High',exact:true}).click(); assert.match(await page.locator('.pt-card').first().innerText(), /29/);
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await page.mouse.move(0,0);
  console.log('Filters and previews passed'); for (const index of [0,2,4]) { console.log('Cloning',index);
    await go(); const card = page.locator('.pt-card').nth(index); if(index === 0) await card.locator('h2').click(); else if(index === 2) await card.locator('.pt-cover').click(); else await card.getByRole('button', {name:'Use Template',exact:true}).click();
    await page.waitForFunction(() => /products\/product-.*\/edit/.test(window.__router.state.location.pathname));
    const saved = await page.evaluate(() => JSON.parse(window.__writes.filter(w => w.key.startsWith('gos-commerce-products')).at(-1).value)[0]);
    assert.ok(saved.slug); assert.equal(saved.status,'Draft'); assert.equal(saved.config.currency,'USD');
    await page.locator('.product-delete-trigger').waitFor();
  }
  await go();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'tests/product-template-mobile.png',fullPage:true});
  assert.equal(await page.locator('.pt-library').evaluate(el=>el.scrollWidth <= el.clientWidth+1),true);
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'tests/product-template-desktop.png',fullPage:true});
  await page.evaluate(()=>{window.__failSave=true});
  await page.locator('.pt-card').first().getByRole('button',{name:'Use Template',exact:true}).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.pt-card').count(),6);
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>{window.__failSave=false; return window.__router.navigate('/dashboard/products-payments');});
  await page.getByRole('button',{name:'Actions for QA Service',exact:true}).click();
  await page.getByRole('menuitem',{name:'Delete Product',exact:true}).click();
  const deletion = page.getByRole('dialog',{name:'Delete product?',exact:true});
  await deletion.waitFor(); assert.equal(await deletion.locator('strong').innerText(),'QA Service');
  await page.screenshot({path:'tests/product-delete-dialog.png'});
  await deletion.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Actions for QA Service',exact:true}).count(),1);
  await page.getByRole('button',{name:'Actions for QA Service',exact:true}).click();
  await page.getByRole('menuitem',{name:'Delete Product',exact:true}).click();
  await page.keyboard.press('Escape'); assert.equal(await deletion.count(),0);
  await page.getByRole('button',{name:'Actions for QA Service',exact:true}).click();
  await page.getByRole('menuitem',{name:'Delete Product',exact:true}).click();
  await page.evaluate(()=>{window.__failSave=true});
  await deletion.getByRole('button',{name:'Delete Product',exact:true}).click();
  await deletion.getByRole('alert').waitFor(); assert.equal(await deletion.count(),1);
  await page.evaluate(()=>{window.__failSave=false});
  await deletion.getByRole('button',{name:'Delete Product',exact:true}).click();
  await deletion.waitFor({state:'hidden'});
  assert.equal(await page.getByRole('button',{name:'Actions for QA Service',exact:true}).count(),0);
  await page.getByText('Product deleted.',{exact:true}).first().waitFor();
  const lastSaved = await page.evaluate(()=>JSON.parse(window.__writes.filter(w=>w.key.startsWith('gos-commerce-products')).at(-1).value));
  assert.equal(lastSaved.some(p=>p.id==='product-qa'),false);
  const target = lastSaved[0];
  await page.evaluate(id=>window.__router.navigate('/dashboard/products-payments/products/'+id+'/edit'),target.id);
  const editableTitle=page.locator('input').filter({visible:true}).first(); await editableTitle.fill('Unsaved name before deletion');
  await page.locator('.product-delete-trigger').click();
  await deletion.waitFor();
  await deletion.getByRole('button',{name:'Delete Product',exact:true}).click();
  await page.waitForFunction(()=>window.__router.state.location.pathname==='/dashboard/products-payments');
  assert.equal(await page.getByRole('button',{name:'Actions for '+target.name,exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log('Passed: explicit previews, no hover preview, body/cover/CTA cloning, polished filters and sort, mobile layout, delete cancellation, Escape, failure/retry, persisted removal, toast and dirty editor deletion.');
} catch (error) { console.error(error); process.exitCode = 1; } finally { await browser?.close(); await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 3000))]); process.exit(process.exitCode || 0); }





