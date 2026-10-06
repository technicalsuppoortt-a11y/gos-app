// Run with COURSE_BROWSER_PATH pointing at a Chromium browser, or use Edge on Windows.
// No browser automation package or changes to the application's authentication are needed.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'gos-course-browser-'));
const edge = process.env.COURSE_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const server = await createServer({ server: { port: 5196, strictPort: true }, plugins: [{ name: 'course-test-harness', configureServer(vite) {
  vite.middlewares.use('/__course-test', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__course-test', `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { Provider } from 'react-redux';
      import { createMemoryRouter, RouterProvider } from 'react-router-dom';
      import { store } from '/src/store/index.ts';
      import { ProductWorkspace } from '/src/pages/commerce/ProductWorkspace.tsx';
      import { UserLayout } from '/src/components/layout/UserLayout.tsx';
      import { saveProduct } from '/src/pages/commerce/repository.ts';
      import courseCover from '/src/assets/products/ai-course.jpg';
      import { newProduct } from '/src/pages/commerce/model.ts';
      import i18n from '/src/i18n/i18n.ts';
      import '/src/index.css'; import '/src/layout-shell.css'; import '/src/global-controls.css';
      await i18n.changeLanguage('en'); document.documentElement.dir = 'ltr';
      const p = newProduct(); p.id='course-browser-fixture'; p.name='Complete AI Marketing Course'; p.type='course'; p.description='Learn how to create, market and sell digital products using AI. Step by step system with real examples and templates.'; p.config.amount=297; p.status='Active'; p.sales='124'; p.revenue='€36,828'; p.config.experience.shortDescription=p.description; p.config.experience.tags=['AI','Marketing','Digital Products','Online Business']; p.config.experience.included=['25+ Video Lessons (HD)','Step-by-step framework','Ready-to-use templates','Live Q&A sessions (monthly)','Private community','Lifetime access','Certificate of completion'].map((title,i)=>({id:'benefit-'+i,title,enabled:true}));
      p.config.modules=[{title:'Introduction',lessons:[{id:'one',title:'Welcome',kind:'Video',duration:'08:24',url:''},{id:'two',title:'Tools',kind:'PDF',duration:'2 MB',url:''}]},{title:'Marketing',lessons:[{id:'three',title:'Launch',kind:'Video',duration:'05:00',url:''}]}];
      p.config.experience.instructor.name='Mohamed Joe'; p.image=courseCover; saveProduct(p);
      const args = new URLSearchParams(location.search), mode = args.get('mode') || 'edit';
      const path = mode === 'create' ? '/dashboard/products-payments/products/new?type=course' : '/dashboard/products-payments/products/course-browser-fixture' + (mode === 'edit' ? '/edit' : '');
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
const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9339', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch('http://127.0.0.1:9339/json')).json(); break; } catch { await pause(100); } }
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
    await cdp('Page.navigate', { url: `http://localhost:5196/__course-test?mode=${mode}` });
    await waitFor(`!!document.querySelector('.course-grid')`);
    await pause(350);
  }
  for (const [width,height] of [[390,844],[768,1024],[1024,682],[1440,900],[1920,1080]]) {
    for (const mode of ['create','edit','detail']) {
      await load(mode,width,height);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= '+width),mode+' horizontal overflow at '+width);
      assert.equal(await evaluate("document.querySelectorAll('header.layout-header').length"),1,'exactly one shared header');
      assert.equal(await evaluate("document.querySelectorAll('.tw-tabs button').length"),mode==='detail'?10:7);
      console.log('PASS '+mode+' responsive '+width+'x'+height);
      if(process.argv[2] && width===1440 && mode!=='create') {const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(process.argv[2]+'-'+mode+'.png',Buffer.from(shot.data,'base64'));}
    }
  }
  await load('edit',1440,900);
  await evaluate("document.querySelector('[aria-label=\"Edit Social Links\"]').click()");await waitFor("!!document.querySelector('[role=dialog]')");
  await evaluate("const input=document.querySelector('.course-social-modal-fields input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'https://example.com/instructor');input.dispatchEvent(new Event('input',{bubbles:true}));");await pause(100);
  await evaluate("document.querySelector('[role=dialog] form').requestSubmit()");await waitFor("!document.querySelector('[role=dialog]')");
  assert.ok(await evaluate("document.querySelector('[aria-label=\"Manage instructor Website profile\"]').classList.contains('connected')"));
  await evaluate("document.querySelector('[aria-label=\"Lesson 1 actions in module 1\"]').click()");await pause(100);
  await evaluate("[...document.querySelectorAll('.course-row-options button')].find(b=>b.textContent.includes('Move Down')).click()");await pause(100);
  assert.ok(await evaluate("document.querySelector('.course-lesson-title').textContent.includes('Tools')"));
  await evaluate("document.querySelector('[aria-label=\"Module 1 actions\"]').click()");await pause(100);
  await evaluate("[...document.querySelectorAll('.course-row-options button')].find(b=>b.textContent.includes('Move Down')).click()");await pause(100);
  assert.equal(await evaluate("document.querySelector('.course-module-toggle b').textContent"),'Marketing');
  await evaluate("document.querySelectorAll('.course-visibility input')[1].click()");
  await evaluate("[...document.querySelectorAll('.cw-header-actions button')].find(b=>b.textContent.includes('Save Changes')).click()");
  await waitFor("!window.testRouter.state.location.pathname.endsWith('/edit') && !!document.querySelector('.course-overview')");
  assert.ok(await evaluate("!document.querySelector('.course-curriculum')"));
  await evaluate("[...document.querySelectorAll('.tw-tabs button')].find(b=>b.textContent==='Content').click()");await pause(150);
  assert.equal(await evaluate("document.querySelector('.tw-module-heading b').textContent"),'Marketing');
  await evaluate("[...document.querySelectorAll('.tw-tabs button')].find(b=>b.textContent==='Orders').click()");await pause(150);
  assert.ok(await evaluate("document.body.textContent.includes('No order records available')"));
  await evaluate("[...document.querySelectorAll('.tw-tabs button')].find(b=>b.textContent==='Analytics').click()");await pause(150);
  assert.ok(await evaluate("document.body.textContent.includes('Sales trend unavailable')"));
  await load('edit',1440,900);
  await evaluate("document.querySelector('.course-danger').click()");await waitFor("!!document.querySelector('[role=dialog]')");
  await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Cancel').click()");await pause(100);
  assert.ok(await evaluate("!document.querySelector('[role=dialog]')"));
  console.log('PASS lesson/module ordering, persistence, orders, analytics and delete confirmation');
  assert.deepEqual(errors,[],'No uncaught browser errors');
} finally {
  socket?.close(); browser.kill(); await server.close();
  // The resolved target is the exact temporary profile created by this test.
  assert.equal(dirname(resolve(profile)), resolve(tmpdir()));
  await pause(500); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
