// Run with DIGITAL_BROWSER_PATH pointing at a Chromium browser, or use Edge on Windows.
// No browser automation package or changes to the application's authentication are needed.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'gos-digital-browser-'));
const edge = process.env.DIGITAL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const server = await createServer({ server: { port: 5195, strictPort: true }, plugins: [{ name: 'digital-test-harness', configureServer(vite) {
  vite.middlewares.use('/__digital-test', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__digital-test', `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { Provider } from 'react-redux';
      import { createMemoryRouter, RouterProvider } from 'react-router-dom';
      import { store } from '/src/store/index.ts';
      import { ProductWorkspace } from '/src/pages/commerce/ProductWorkspace.tsx';
      import { UserLayout } from '/src/components/layout/UserLayout.tsx';
      import { saveProduct } from '/src/pages/commerce/repository.ts';
      import socialCover from '/src/assets/products/social-pack.jpg';
      import { newProduct } from '/src/pages/commerce/model.ts';
      import i18n from '/src/i18n/i18n.ts';
      import '/src/index.css'; import '/src/layout-shell.css'; import '/src/global-controls.css';
      await i18n.changeLanguage('en'); document.documentElement.dir = 'ltr';
      const p = newProduct();
      p.id = 'digital-browser-fixture'; p.name = 'Social Media Templates Pack'; p.status = 'Active';
      p.description = 'Save time and create professional content with this complete pack of social media templates.\\n- 200+ editable templates (Canva)\\n- Instagram, TikTok, Facebook formats\\n- Modern and professional designs\\n- Easy to customize\\n- Commercial use allowed';
      p.image = socialCover; p.config.amount = 47;
      p.config.assets = Array.from({length:7},(_,i)=>({name:'Templates-'+i+'.zip',url:'https://example.com/file.zip',size:250*1024*1024}));
      Object.assign(p.config.experience, { oneTimeAmount:47,comparePrice:97,showComparePrice:true,downloadLimitEnabled:false,category:'Design Templates',fileType:'Canva Template',funnelUrl:'https://example.com/funnel',tags:['Templates','Social Media','Design','Canva'],shortDescription:'A collection of 200+ ready-to-use social media templates.', gallery:['/dashboard/product-coaching.png','/dashboard/product-nutrition.png','/dashboard/product-workout.png'], included:['200+ Social Media Templates','Bonus Fonts & Icons','Step-by-Step Instructions PDF','Commercial Use License','Lifetime Access', 'Extra benefit'].map((title,i)=>({id:'benefit-'+i,title,enabled:true})) });
      saveProduct(p);
      const args = new URLSearchParams(location.search), mode = args.get('mode') || 'edit';
      const path = mode === 'create' ? '/dashboard/products-payments/products/new?type=digital' : '/dashboard/products-payments/products/digital-browser-fixture' + (mode === 'edit' ? '/edit' : '');
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
const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9338', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch('http://127.0.0.1:9338/json')).json(); break; } catch { await pause(100); } }
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
    await cdp('Page.navigate', { url: `http://localhost:5195/__digital-test?mode=${mode}` });
    await waitFor(`!!document.querySelector('.dw-grid')`);
    await pause(350);
  }
  for (const [width, height] of [[1024,682],[1280,720],[1440,900],[1920,1080]]) {
    for (const mode of ['create','edit','detail']) {
      await load(mode,width,height);
      if(process.argv[2] && width===1024 && (mode==='create' || mode==='edit')) {const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(process.argv[2],Buffer.from(shot.data,'base64'));}
      const metrics=await evaluate(`({scroll:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,bottom:Math.max(...[...document.querySelectorAll('.dw-grid .cw-card')].map(el=>el.getBoundingClientRect().bottom)),columns:getComputedStyle(document.querySelector('.dw-grid')).gridTemplateColumns,internal:[...document.querySelectorAll('.dw-grid .cw-card')].filter(el=>el.scrollHeight>el.clientHeight+2).map(el=>({title:el.querySelector('h2').textContent,height:el.clientHeight,scroll:el.scrollHeight}))})`);
      assert.ok(metrics.scroll>=height, 'Natural page height must cover the viewport');
      assert.ok(metrics.bottom<=metrics.scroll+1,mode+' cards below fold '+JSON.stringify(metrics));
      assert.ok(metrics.scrollWidth<=width,mode+' horizontal overflow');
      assert.deepEqual(metrics.internal,[],mode+' cards must not clip content '+JSON.stringify(await evaluate(`Array.from(document.querySelectorAll('.dw-status-card header,.dw-status-card .dw-visibility,.dw-visibility label,.dw-visibility small')).map(el=>({tag:el.tagName,h:el.getBoundingClientRect().height,font:getComputedStyle(el).fontSize,line:getComputedStyle(el).lineHeight,padding:getComputedStyle(el).padding}))`)));
      assert.equal(metrics.columns.split(' ').length,100);
      assert.equal(await evaluate(`document.querySelectorAll('.dw-page .tw-tabs button').length`),8);
      assert.equal(await evaluate(`Math.round(document.querySelector('.dw-editor-content').getBoundingClientRect().height)`),128);
      console.log('PASS '+mode+' '+width+'x'+height+' natural page flow without clipped cards');
    }
  }
  await load('edit',1024,682);
  if(process.argv[2]) {const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(process.argv[2],Buffer.from(shot.data,'base64'));}
  await evaluate(`document.querySelector('[aria-label="Remove tag Canva"]').click()`);await pause(100);
  assert.ok(await evaluate(`!document.querySelector('[aria-label="Remove tag Canva"]')`));
  await evaluate(`document.querySelector('[aria-label="Add tag"]').click()`);await pause(100);
  await evaluate(`const input=document.querySelector('[aria-label="New tag"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'New tag');input.dispatchEvent(new Event('input',{bubbles:true}));`);await pause(100);
  await evaluate(`document.querySelector('.dw-tag-form').requestSubmit()`);await pause(100);
  assert.ok(await evaluate(`!!document.querySelector('[aria-label="Remove tag New tag"]')`));
  await evaluate(`[...document.querySelectorAll('.dw-pricing-options button')][1].click()`);await pause(100);
  assert.ok(await evaluate(`document.querySelectorAll('.dw-pricing-options button')[1].getAttribute('aria-pressed')==='true'`));
  assert.equal(await evaluate(`document.querySelectorAll('.tw-file-item').length`),7);
  assert.equal(await evaluate(`document.querySelector('[aria-label="File 5 name"]').value`),'Templates-4.zip');
  await evaluate(`document.querySelector('[aria-label="File actions for Templates-4.zip"]').click()`);await pause(100);
  await evaluate(`document.querySelector('.dw-file-menu>div button').click()`);await pause(100);
  assert.equal(await evaluate(`document.querySelector('[aria-label="File 5 name"]').value`),'Templates-5.zip');
  await evaluate(`[...document.querySelectorAll('.cw-header-actions button')].find(b=>b.textContent.includes('Save Changes')).click()`);
  await waitFor(`!window.testRouter.state.location.pathname.endsWith('/edit') && !!document.querySelector('.dw-information input:disabled')`);
  assert.ok(await evaluate(`document.querySelector('.dw-tags').textContent.includes('New tag')`));
  assert.ok(await evaluate(`document.querySelectorAll('.dw-pricing-options button')[1].getAttribute('aria-pressed')==='true'`));
  await load('edit',1280,720);
  await evaluate(`document.querySelector('.dw-delete').click()`);await waitFor(`!!document.querySelector('[role="dialog"]')`);
  await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent==='Cancel').click()`);await pause(100);
  assert.ok(await evaluate(`!document.querySelector('[role="dialog"]')`));
  await load('edit',1280,720);
  assert.equal(await evaluate(`document.querySelectorAll('.tw-file-item').length`),7);
  await evaluate(`const input=document.querySelector('.dw-editor-content');input.focus();const range=document.createRange();range.selectNodeContents(input);window.getSelection().removeAllRanges();window.getSelection().addRange(range);`);
  await evaluate(`document.querySelector('[aria-label="Bold"]').click()`);await pause(100);
  assert.ok(await evaluate(`!!document.querySelector('.dw-editor-content b,.dw-editor-content strong')`));
  await evaluate(`[...document.querySelectorAll('.tw-tabs button')].find(b=>b.textContent==='Funnel & Pages').click()`);await pause(100);
  assert.ok(await evaluate(`document.querySelector('.tw-workspace-main').textContent.includes('Connected Funnel URL')`));
  await evaluate(`window.testRouter.navigate('?tab=settings')`);await pause(100);
  assert.ok(await evaluate(`document.querySelector('.tw-workspace-main').textContent.includes('Sales Page URL')`));
  console.log('PASS tags, pricing selection, file actions/removal, save persistence and delete confirmation');
  assert.deepEqual(errors,[],'No uncaught browser errors');
} finally {
  socket?.close(); browser.kill(); await server.close();
  // The resolved target is the exact temporary profile created by this test.
  assert.equal(dirname(resolve(profile)), resolve(tmpdir()));
  await pause(500); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
