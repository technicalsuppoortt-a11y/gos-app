// Run with SERVICE_BROWSER_PATH pointing at a Chromium browser, or use Edge on Windows.
// No browser automation package or changes to the application's authentication are needed.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'gos-service-browser-'));
const edge = process.env.SERVICE_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const server = await createServer({ server: { port: 5194, strictPort: true }, plugins: [{ name: 'service-test-harness', configureServer(vite) {
  vite.middlewares.use('/__service-test', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__service-test', `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { Provider } from 'react-redux';
      import { createMemoryRouter, RouterProvider } from 'react-router-dom';
      import { store } from '/src/store/index.ts';
      import { ProductWorkspace } from '/src/pages/commerce/ProductWorkspace.tsx';
      import { UserLayout } from '/src/components/layout/UserLayout.tsx';
      import { saveProduct } from '/src/pages/commerce/repository.ts';
      import { newProduct } from '/src/pages/commerce/model.ts';
      import i18n from '/src/i18n/i18n.ts';
      import '/src/index.css'; import '/src/layout-shell.css'; import '/src/global-controls.css';
      await i18n.changeLanguage('en'); document.documentElement.dir = 'ltr';
      const p = newProduct();
      p.id = 'service-browser-fixture'; p.type = 'Service'; p.name = 'General Consultation'; p.status = 'Active';
      p.description = 'In this consultation, we will discuss your current situation, answer your questions, and create a clear plan based on your needs. You will get professional advice and practical next steps.';
      p.image = '/dashboard/product-consultation.png'; p.config.duration = 30; p.config.amount = 97;
      p.config.fulfillment = 'Consultation'; p.config.bookingUrl = 'https://example.com/book';
      Object.assign(p.config.experience, { category:'Medical Consultation', provider:'Dr. Ahmed Nasser', rating:4.9, reviewCount:128, shortDescription:'Book a consultation with our specialist to get professional advice and a personalized plan.', gallery:['/dashboard/product-coaching.png','/dashboard/product-nutrition.png','/dashboard/product-workout.png'], included:['30 minutes consultation','Professional advice','Personalized recommendations','Follow-up summary (optional)'].map((title,i)=>({id:'benefit-'+i,title,enabled:true})) });
      saveProduct(p);
      const args = new URLSearchParams(location.search), mode = args.get('mode') || 'edit';
      const path = mode === 'create' ? '/dashboard/products-payments/products/new?type=service' : '/dashboard/products-payments/products/service-browser-fixture' + (mode === 'edit' ? '/edit' : '');
      const h = React.createElement;
      window.testRouter = createMemoryRouter([{element:h(UserLayout),children:[
        {path:'/dashboard/products-payments/products/new',element:h(ProductWorkspace,{mode:'create'})},
        {path:'/dashboard/products-payments/products/:id/edit',element:h(ProductWorkspace,{mode:'edit'})},
        {path:'/dashboard/products-payments/products/:id/pricing',element:h(ProductWorkspace,{mode:'edit',defaultTab:'pricing'})},
        {path:'/dashboard/products-payments/products/:id',element:h(ProductWorkspace,{mode:'detail'})}
      ]}],{initialEntries:[path]});
      createRoot(document.getElementById('root')).render(h(Provider,{store},h(RouterProvider,{router:window.testRouter})));
    </script></body></html>`));
  });
} }] });
await server.listen();
const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9337', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch('http://127.0.0.1:9337/json')).json(); break; } catch { await pause(100); } }
  assert.ok(tabs?.length, 'Chromium remote debugging must start');
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0; const pending = new Map(), errors = [];
  socket.addEventListener('message', event => { const data = JSON.parse(event.data); if (data.id) { const call = pending.get(data.id); pending.delete(data.id); if (data.error) call.reject(data.error); else call.resolve(data.result); } else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text); });
  function cdp(method, params = {}) { return new Promise((resolve, reject) => { const current = ++id; pending.set(current, { resolve, reject }); socket.send(JSON.stringify({ id: current, method, params })); }); }
  async function evaluate(expression) { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; }
  await cdp('Runtime.enable'); await cdp('Page.enable');
  async function waitFor(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await pause(100); } throw new Error('Timed out: ' + expression + '\n' + errors.join('\n')); }
  async function load(mode, width, height) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.navigate', { url: `http://localhost:5194/__service-test?mode=${mode}` });
    await waitFor(`!!document.querySelector('.sw-description')`);
    await pause(350);
  }
  for (const [width, height] of [[1024, 682], [1280, 720], [1440, 900]]) {
    for (const mode of ['create', 'edit', 'detail']) {
      await load(mode, width, height);
      const metrics = await evaluate(`({ height:innerHeight, scroll:document.documentElement.scrollHeight, width:innerWidth, scrollWidth:document.documentElement.scrollWidth, bottom:document.querySelector('.sw-description').getBoundingClientRect().bottom, boxes:Object.fromEntries(['.layout-workspace','.layout-main','.tw-page','.tw-workspace','.tw-service-layout','.sw-information','.sw-images','.sw-description','.tw-service-layout .tw-stack>.cw-card:last-child'].map(s=>{const el=document.querySelector(s),r=el.getBoundingClientRect(),c=getComputedStyle(el);return [s,{x:r.x,y:r.y,w:r.width,h:r.height,columns:c.gridTemplateColumns,padding:c.padding}]})), columns:getComputedStyle(document.querySelector('.tw-service-layout')).gridTemplateColumns })`);
      if ((process.env.SERVICE_SCREENSHOT_PATH || process.argv[2]) && mode === 'create' && width === 1024) { const shot = await cdp('Page.captureScreenshot', { format: 'png' }); await writeFile(process.env.SERVICE_SCREENSHOT_PATH || process.argv[2], Buffer.from(shot.data, 'base64')); }
      assert.ok(metrics.scroll <= height + 1, `${mode} ${width}×${height} must not scroll vertically: ${JSON.stringify(metrics)}`);
      assert.ok(metrics.scrollWidth <= width, `${mode} must not overflow horizontally`);
      assert.ok(metrics.bottom <= height, `${mode} description must fit above the fold`);
      assert.ok(await evaluate(`!document.body.innerText.includes('Connected Tools')`));
      console.log(`PASS ${mode} ${width}×${height}: no scroll; description ends at ${Math.round(metrics.bottom)}px`);
    }
  }
  await load('edit', 1024, 682);
  if (process.env.SERVICE_SCREENSHOT_PATH || process.argv[2]) { const shot = await cdp('Page.captureScreenshot', { format: 'png' }); await writeFile(process.env.SERVICE_SCREENSHOT_PATH || process.argv[2], Buffer.from(shot.data, 'base64')); }
  const original = await evaluate(`document.querySelector('.tw-service-image').getAttribute('src')`);
  await evaluate(`document.querySelector('[aria-label="Next preview image"]').click()`); await pause(100);
  assert.notEqual(await evaluate(`document.querySelector('.tw-service-image').getAttribute('src')`), original);
  await evaluate(`document.querySelector('[aria-label="Previous preview image"]').click()`); await pause(100);
  assert.equal(await evaluate(`document.querySelector('.tw-service-image').getAttribute('src')`), original);
  await evaluate(`document.querySelector('.sw-gallery>div:nth-child(2)>button').click()`); await pause(100);
  assert.notEqual(await evaluate(`document.querySelector('.tw-service-image').getAttribute('src')`), original);
  await evaluate(`document.querySelector('.sw-included button').click()`); await waitFor(`!!document.querySelector('[role="dialog"]')`);
  await evaluate(`const input=document.querySelector('[aria-label="Included item title"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Updated benefit');input.dispatchEvent(new Event('input',{bubbles:true}));`);
  await pause(100);
  await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent==='Done').click()`); await pause(100);
  assert.ok(await evaluate(`document.querySelector('.sw-included').innerText.includes('Updated benefit')`));
  await evaluate(`[...document.querySelectorAll('.sw-quick-settings button')].find(b=>b.textContent.includes('Checkout Page')).click()`); await pause(100);
  assert.equal(await evaluate(`window.testRouter.state.location.search`), '?tab=checkout');
  await evaluate(`window.testRouter.navigate('?tab=information')`); await waitFor(`!!document.querySelector('.sw-description')`);
  await evaluate(`[...document.querySelectorAll('.cw-header-actions button')].find(b=>b.textContent.includes('Save Changes')).click()`);
  await waitFor(`!window.testRouter.state.location.pathname.endsWith('/edit') && !!document.querySelector('.sw-information input:disabled')`);
  assert.ok(await evaluate(`document.querySelector('.sw-included').innerText.includes('Updated benefit')`));
  console.log('PASS carousel, main image selection, included details, checkout shortcut, save and view persistence');
  assert.deepEqual(errors, [], 'Browser must have no uncaught runtime errors');
} finally {
  socket?.close(); browser.kill(); await server.close();
  // The resolved target is the exact temporary profile created by this test.
  assert.equal(dirname(resolve(profile)), resolve(tmpdir()));
  await pause(500); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
