// Real Chromium interaction and layout checks; uses the existing local Edge installation.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'gos-settings-browser-'));
const server = await createServer({ server: { port: 5197, strictPort: true }, plugins: [{ name: 'settings-test', configureServer(vite) {
  vite.middlewares.use('/__settings-test', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__settings-test', `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module">
      import React from 'react'; import { createRoot } from 'react-dom/client';
      import { Provider } from 'react-redux'; import { createMemoryRouter, RouterProvider } from 'react-router-dom';
      import { store } from '/src/store/index.ts'; import { loginSuccess } from '/src/store/slices/authSlice.ts';
      import { setLanguage } from '/src/store/slices/uiSlice.ts'; import { ThemeProvider } from '/src/context/ThemeProvider.tsx';
      import { SettingsWorkspace } from '/src/pages/settings/SettingsWorkspace.tsx'; import { UserLayout } from '/src/components/layout/UserLayout.tsx';
      import '/src/index.css'; import '/src/layout-shell.css'; import '/src/global-controls.css';
      store.dispatch(loginSuccess({user:{id:'settings-test',name:'Mohamed Joe',email:'mohamedjoe@gmail.com'},role:'ADMIN',tenant:{id:'settings-test',name:'Test'},token:'test'}));
      store.dispatch(setLanguage('en'));
      window.testRouter = createMemoryRouter([{element:React.createElement(UserLayout),children:[{path:'/dashboard/settings/*',element:React.createElement(SettingsWorkspace)},{path:'/dashboard/integrations',element:React.createElement(SettingsWorkspace)}]}],{initialEntries:['/dashboard/settings/'+(new URLSearchParams(location.search).get('tab')||'profile')]});
      createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(ThemeProvider,null,React.createElement(RouterProvider,{router:window.testRouter}))));
    </script></body></html>`));
  });
} }] });
await server.listen();
const browser = spawn(process.env.SETTINGS_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9341',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(r => setTimeout(r, ms));
let socket;
try {
  let tabs;
  for (let i=0;i<70;i++) { try { tabs = await (await fetch('http://127.0.0.1:9341/json')).json(); break; } catch { await pause(100); } }
  assert.ok(tabs?.length, 'Browser must start');
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r,j) => { socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true}); });
  let id=0;const pending=new Map(),errors=[];
  socket.addEventListener('message',event => { const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(data.error):p.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text); });
  function cdp(method,params={}) {return new Promise((r,j)=>{const n=++id;pending.set(n,{resolve:r,reject:j});socket.send(JSON.stringify({id:n,method,params}));});}
  async function evaluate(expression) {const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
  async function wait(expression) {for(let i=0;i<150;i++){if(await evaluate(expression))return;await pause(100);}throw new Error(`Timed out ${expression}\n${errors.join('\n')}`);}
  async function click(text, selector='button') {await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);await pause(150);}
  async function route(tab) {await evaluate(`window.testRouter.navigate('/dashboard/settings/${tab}')`);await pause(450);}
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Page.navigate',{url:'http://localhost:5197/__settings-test'});await wait(`!!document.querySelector('.st-profile-grid')`);
  const names=['Profile','Business','Team & roles','Knowledge','Tools','Integrations','Payments','Billing & Wallet','Security'];
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.st-nav-item b')].map(x=>x.textContent)`),names);
  for(const [width,height] of [[1920,1080],[1440,900],[1024,682],[768,900],[390,844]]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    for(const tab of ['profile','billing','integrations']){
      await route(tab);
      const metrics=await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('.st-layout')).gridTemplateColumns})`);
      assert.ok(metrics.scroll<=width,`${tab} ${width}px horizontal overflow: ${JSON.stringify(metrics)}`);
      if(process.env.SETTINGS_SCREENSHOT_DIR && [1440,1024,390].includes(width)){
        const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(join(process.env.SETTINGS_SCREENSHOT_DIR,`settings-${tab}-${width}.png`),Buffer.from(shot.data,'base64'));
      }
      console.log(`PASS ${tab} ${width}×${height}: no horizontal overflow`);
    }
  }
  await route('profile');
  await evaluate(`const el=document.querySelector('input[autocomplete="name"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Updated Name');el.dispatchEvent(new Event('input',{bubbles:true}));`);await pause(200);
  assert.equal(await evaluate(`document.querySelector('.st-preview>b').textContent`),'Updated Name');
  await route('billing');await wait(`document.querySelector('[role="dialog"]')?.innerText.includes('Leave without saving')`);await click('Keep editing');
  assert.equal(await evaluate(`window.testRouter.state.location.pathname`),'/dashboard/settings/profile');
  await click('Save Changes');await pause(250);await route('billing');await route('profile');
  assert.equal(await evaluate(`document.querySelector('input[autocomplete="name"]').value`),'Updated Name');
  await evaluate(`document.querySelector('[aria-label="Marketing Updates"]').click()`);assert.equal(await evaluate(`document.querySelector('[aria-label="Marketing Updates"]').getAttribute('aria-checked')`),'true');
  await click('Save Changes');await click('Delete Account');await wait(`!!document.querySelector('[role="dialog"]')`);
  assert.ok(await evaluate(`document.querySelector('[role="dialog"] button.st-danger').disabled`));
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await pause(150);assert.equal(await evaluate(`!!document.querySelector('[role="dialog"]')`),false);
  await route('billing');await click('€25');await click('Add €25 Credits');await wait(`!!document.querySelector('[role="dialog"]')`);await click('Continue securely');
  await wait(`document.querySelector('[role="dialog"]')?.innerText.includes('not connected yet')`);assert.equal(await evaluate(`document.querySelector('.st-balance-card strong').textContent`),'€47.80');
  await click('Cancel');await click('Transactions');assert.ok(await evaluate(`!!document.querySelector('[aria-label="Search transactions"]')`));await click('Subscription');assert.ok(await evaluate(`!!document.querySelector('.st-subscription-detail')`));
  await route('integrations');await click('Scheduling');assert.equal(await evaluate(`document.querySelectorAll('.st-integration-card').length`),3);
  await evaluate(`document.querySelector('.st-integration-card button').click()`);await wait(`!!document.querySelector('[role="dialog"]')`);await click('Connect / Authorize');await wait(`document.querySelector('.st-error-box')?.innerText.includes('not connected yet')`);
  assert.equal(await evaluate(`document.querySelectorAll('.st-integration-card .st-badge.green').length`),0);
  assert.ok(await evaluate(`!!document.querySelector('.st-error-box a[href]')`));
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await pause(150);
  await route('tools');assert.ok(await evaluate(`document.body.innerText.includes('Funnels')&&document.body.innerText.includes('Calendars')`));
  assert.deepEqual(errors,[],'No uncaught browser errors');console.log('PASS profile persistence, preview, unsaved navigation, toggles, deletion confirmation, wallet tabs, unverified payment safety, integration recovery, original tools');
} finally {
  socket?.close();browser.kill();await server.close();assert.equal(dirname(resolve(profile)),resolve(tmpdir()));await pause(500);await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
}
