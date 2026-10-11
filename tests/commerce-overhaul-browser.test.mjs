// Run with COURSE_BROWSER_PATH pointing at a Chromium browser, or use Edge on Windows.
// No browser automation package or changes to the application's authentication are needed.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'gos-commerce-overhaul-browser-'));
const edge = process.env.COURSE_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const server = await createServer({ server: { port: 5199, strictPort: true }, plugins: [{ name: 'course-test-harness', configureServer(vite) {
  vite.middlewares.use('/__commerce-overhaul-test', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__commerce-overhaul-test', `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { Provider } from 'react-redux';
      import { createMemoryRouter, RouterProvider } from 'react-router-dom';
      import { store } from '/src/store/index.ts';
      import { ProductWorkspace } from '/src/pages/commerce/ProductWorkspace.tsx';
      import { UserLayout } from '/src/components/layout/UserLayout.tsx';
      import { ProductLivePreview } from '/src/pages/commerce/ProductLivePreview.tsx';
      import { saveProduct, storageKey } from '/src/pages/commerce/repository.ts';
      import courseCover from '/src/assets/products/ai-course.jpg';
      import { newProduct } from '/src/pages/commerce/model.ts';
      import i18n from '/src/i18n/i18n.ts';
      import '/src/index.css'; import '/src/layout-shell.css'; import '/src/global-controls.css';
      await i18n.changeLanguage('en'); document.documentElement.dir = 'ltr';
      const p = newProduct(); p.id='course-browser-fixture'; p.name='Complete AI Marketing Course'; p.type='Course'; p.description='Learn how to create, market and sell digital products using AI. Step by step system with real examples and templates.'; p.config.amount=297; p.status='Active'; p.sales='124'; p.revenue='€36,828'; p.config.experience.shortDescription=p.description; p.config.experience.tags=['AI','Marketing','Digital Products','Online Business']; p.config.experience.included=['25+ Video Lessons (HD)','Step-by-step framework','Ready-to-use templates','Live Q&A sessions (monthly)','Private community','Lifetime access','Certificate of completion'].map((title,i)=>({id:'benefit-'+i,title,enabled:true}));
      p.config.modules=[{title:'Introduction',lessons:[{id:'one',title:'Welcome',kind:'Video',duration:'08:24',url:''},{id:'two',title:'Tools',kind:'PDF',duration:'2 MB',url:''}]},{title:'Marketing',lessons:[{id:'three',title:'Launch',kind:'Video',duration:'05:00',url:''}]}];
      p.config.experience.instructor.name='Mohamed Joe'; p.image=courseCover; if (!JSON.parse(localStorage.getItem(storageKey()) || '[]').some(product => product.id === p.id)) saveProduct(p);
      const args = new URLSearchParams(location.search), mode = args.get('mode') || 'edit';
      const previewToken = args.get('preview');
      const path = previewToken ? '/product-preview/' + previewToken : mode === 'create' ? '/dashboard/products-payments/products/new?type=course' : '/dashboard/products-payments/products/course-browser-fixture' + (mode === 'edit' ? '/edit' : '');
      const h = React.createElement;
      window.testRouter = createMemoryRouter([{path:'/product-preview/:token',element:h(ProductLivePreview)},{element:h(UserLayout),children:[
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
const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9342', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch('http://127.0.0.1:9342/json')).json(); break; } catch { await pause(100); } }
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
    await cdp('Page.navigate', { url: `http://localhost:5199/__commerce-overhaul-test?mode=${mode}` });
    await waitFor(`!!document.querySelector('.course-grid')`);
    await pause(350);
  }
  for (const [width,height] of [[390,844],[768,1024],[1024,682],[1440,900]]) {
    for (const mode of ['create','edit']) {
      await load(mode,width,height);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= '+width),mode+' horizontal overflow at '+width);
      assert.equal(await evaluate("document.querySelectorAll('header.layout-header').length"),1);
      assert.equal(await evaluate("document.querySelectorAll('.tw-tabs button').length"),10);
      console.log('PASS responsive '+mode+' '+width+'x'+height);
    }
  }
  await load('edit',1440,900);
  async function clickText(selector, text) { await evaluate('Array.from(document.querySelectorAll('+JSON.stringify(selector)+')).find(el=>el.textContent.trim()==='+JSON.stringify(text)+').click()'); await pause(150); }
  async function input(selector, value) { await evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,'+JSON.stringify(value)+');el.dispatchEvent(new Event("input",{bubbles:true}));})()'); await pause(100); }
  await evaluate('document.querySelector(".cw-header-actions a").addEventListener("click",event=>event.preventDefault(),{once:true});document.querySelector(".cw-header-actions a").click()');
  const previewPath = await evaluate('document.querySelector(".cw-header-actions a").getAttribute("href")');
  assert.equal(await evaluate('document.querySelector(".cw-header-actions a").target'),'_blank');
  await input('.course-primary input','Live updated course title');
  assert.ok(await evaluate('Object.keys(localStorage).some(key=>key.endsWith('+JSON.stringify(':preview:'+previewPath.split('/').pop())+') && JSON.parse(localStorage.getItem(key)).product.name==="Live updated course title")'));
  await clickText('.tw-tabs button','Content');
  await evaluate('document.querySelector("[aria-label=\"Preview lesson Welcome\"]").click()'); await waitFor('!!document.querySelector("[role=dialog]")');
  await clickText('[role=dialog] button','Mark lesson complete');
  assert.ok(await evaluate('document.querySelector("[role=dialog]").textContent.includes("Completed")'));
  await evaluate('document.querySelector("[aria-label=\"Close dialog\"]").click()');
  await clickText('.tw-tabs button','Students'); await clickText('.cw-button','Add student');
  await input('[role=dialog] input','New Student'); await input('[role=dialog] input[type=email]','new.student@example.com');
  await evaluate('document.querySelector("[role=dialog] form").requestSubmit()'); await waitFor('!document.querySelector("[role=dialog]")');
  assert.ok(await evaluate('document.querySelector(".ce-table").textContent.includes("New Student")'));
  await evaluate('document.querySelector("[aria-label=\"Edit New Student\"]").click()'); await input('[role=dialog] input[type=number]','75');
  await evaluate('document.querySelector("[role=dialog] form").requestSubmit()'); await waitFor('!document.querySelector("[role=dialog]")');
  assert.ok(await evaluate('document.querySelector(".ce-table").textContent.includes("75% complete")'));
  await clickText('.cw-header-actions button','Save Changes'); await waitFor('document.body.textContent.includes("All changes saved")');
  assert.ok(await evaluate('window.testRouter.state.location.pathname.endsWith("/edit")'));
  await cdp('Page.reload'); await waitFor('!!document.querySelector(".course-grid")'); await clickText('.tw-tabs button','Students');
  assert.ok(await evaluate('document.querySelector(".ce-table").textContent.includes("75% complete")'));
  await evaluate('document.querySelector("[aria-label=\"Delete New Student\"]").click()'); await clickText('[role=dialog] button','Remove student');
  await clickText('.cw-header-actions button','Save Changes'); await waitFor('document.body.textContent.includes("All changes saved")');
  await clickText('.tw-tabs button','Pricing & Offers');
  assert.ok(await evaluate('!document.body.textContent.includes("Payment Plan (Optional)") && !document.body.textContent.includes("Subscription (Optional)")'));
  await evaluate('Array.from(document.querySelectorAll(".tw-pricing-types button")).find(el=>el.textContent.includes("Payment plan")).click()'); await pause(200);
  assert.ok(await evaluate('document.body.textContent.includes("Payment Plan (Optional)") && !document.body.textContent.includes("Subscription (Optional)")'));
  await evaluate('Array.from(document.querySelectorAll(".tw-pricing-types button")).find(el=>el.textContent.includes("Subscription")).click()'); await pause(200);
  assert.ok(await evaluate('!document.body.textContent.includes("Payment Plan (Optional)") && document.body.textContent.includes("Subscription (Optional)")'));
  await clickText('.tw-tabs button','Checkout');
  assert.ok(await evaluate('!!document.querySelector(".cp-checkout") && document.querySelectorAll(".cp-checkout input:disabled").length>=3'));
  if(process.argv[2]) {const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(process.argv[2]+'-checkout.png',Buffer.from(shot.data,'base64'));}
  await cdp('Page.navigate',{url:'http://localhost:5199/__commerce-overhaul-test?preview='+previewPath.split('/').pop()}); await waitFor('!!document.querySelector(".cp-course")');
  assert.ok(await evaluate('document.querySelector(".cp-course-hero h1").textContent.includes("Live updated course title")'));
  if(process.argv[2]) {const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(process.argv[2]+'-course-preview.png',Buffer.from(shot.data,'base64'));}
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS live draft preview, lesson completion, student create/edit/delete, reload persistence, conditional pricing and mock checkout');
} finally {
  socket?.close(); browser.kill(); await server.close();
  assert.equal(dirname(resolve(profile)), resolve(tmpdir()));
  await pause(500); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
