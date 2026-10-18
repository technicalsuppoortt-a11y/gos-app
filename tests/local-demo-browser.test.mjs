import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'gos-local-demo-'));
const artifacts = resolve('artifacts/local-demo');
await mkdir(artifacts, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5199, strictPort: true }, plugins: [
  { name: 'isolate-demo-backend', enforce: 'pre', load(id) {
    const file = id.replaceAll('\\', '/');
    if (file.endsWith('/src/backend/workspace.tsx')) return `import {useState} from 'react'; export const cloudStorage={getItem:()=>null}; export const useEntities=()=>[]; export const useCloudState=(_,value)=>useState(value);`;
    if (file.endsWith('/src/backend/firebase.ts')) return `export const auth={currentUser:null}; export const db={}; export const backendError=e=>e.message; export async function callBackend(){throw Error('Unexpected Cloud Function call in demo');}`;
  } },
  { name: 'demo-harness', configureServer(vite) { vite.middlewares.use('/__local-demo', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__local-demo', `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root" style="height:100vh"></div><script type="module">
      import React from 'react'; import {createRoot} from 'react-dom/client'; import {Provider} from 'react-redux'; import {createMemoryRouter,RouterProvider} from 'react-router-dom';
      import {store} from '/src/store/index.ts'; import {loginSuccess} from '/src/store/slices/authSlice.ts'; import {setLanguage} from '/src/store/slices/uiSlice.ts';
      import {Inbox} from '/src/pages/Inbox.tsx'; import {IntegrationsPanel} from '/src/pages/settings/IntegrationsPanel.tsx'; import {defaultSettings} from '/src/pages/settings/data.ts';
      import '/src/index.css'; import '/src/pages/settings/settings.css'; import '/src/i18n/i18n.ts';
      const session={user:{id:'demo-tester',name:'Alex Morgan',email:'alex@example.com'},role:'USER',tenant:{id:'demo-workspace',name:'Demo workspace'},token:'demo'};
      store.dispatch(loginSuccess(session)); store.dispatch(setLanguage('en'));
      function InboxDemo(){const[ai,setAi]=React.useState(true);return React.createElement(Inbox,{aiMode:ai,setAiMode:setAi,setSent:()=>{}});}
      function Connections(){return React.createElement('div',{className:'st-workspace',style:{padding:24}},React.createElement(IntegrationsPanel,{data:defaultSettings(),refresh:async()=>{}}));}
      const router=createMemoryRouter([{path:'/inbox',element:React.createElement(InboxDemo)},{path:'/integrations',element:React.createElement(Connections)}],{initialEntries:[new URLSearchParams(location.search).get('page')==="integrations"?'/integrations':'/inbox']});
      window.demoRoute=path=>router.navigate(path); window.demoTenant=id=>store.dispatch(loginSuccess({...session,tenant:{id,name:id}}));
      createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(RouterProvider,{router})));
    </script></body></html>`));
  }); } },
] });
await server.listen();
const browser = spawn(process.env.SETTINGS_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9349',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let tabs;
  for (let i=0;i<50;i++) { try { tabs=await(await fetch('http://127.0.0.1:9349/json',{signal:AbortSignal.timeout(1000)})).json(); break; } catch { await pause(100); } }
  assert.ok(tabs?.length, 'Headless Edge must start');
  socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  const pending=new Map(),errors=[];let counter=0;
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const request=pending.get(data.id);if(!request)return;clearTimeout(request.timer);pending.delete(data.id);data.error?request.reject(data.error):request.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);});
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;const timer=setTimeout(()=>reject(Error('Browser command timed out: '+method)),15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  async function evaluate(expression){const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  async function wait(expression){for(let i=0;i<200;i++){if(await evaluate(expression))return;await pause(100);}throw Error('Timed out: '+expression);}
  const clickText = text => evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===${JSON.stringify(text)})?.click()`);
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1500,height:950,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'http://127.0.0.1:5199/__local-demo'});
  await wait('document.querySelectorAll("[id^=inbox-conversation-]").length===3');
  assert.ok(await evaluate('document.body.textContent.includes("Sarah Ahmed") && document.body.textContent.includes("Omar Hassan") && document.body.textContent.includes("Lina Mostafa")'));
  assert.ok(await evaluate('document.body.textContent.includes("Thursday at 2 PM works perfectly")'));
  await evaluate('document.getElementById("inbox-conversation-demo-omar").click()');
  await wait('document.body.textContent.includes("A photography studio in Alexandria")');
  await evaluate(`(()=>{const input=document.getElementById('inbox-message-input');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Demo reply persists after reload');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await wait('!document.getElementById("inbox-send").hasAttribute("aria-disabled") || document.getElementById("inbox-send").getAttribute("aria-disabled")==="false"');
  await evaluate('document.getElementById("inbox-send").click()');
  await wait('document.body.textContent.includes("Demo reply persists after reload")');
  const inboxShot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(artifacts,'inbox-desktop.png'),Buffer.from(inboxShot.data,'base64'));
  await cdp('Page.reload');
  await wait('!!document.getElementById("inbox-conversation-demo-omar")');
  await evaluate('document.getElementById("inbox-conversation-demo-omar").click()');
  await wait('document.body.textContent.includes("Demo reply persists after reload")');
  await evaluate('window.demoRoute("/integrations")');
  await wait('document.querySelectorAll(".st-integration-card").length===11');
  await evaluate(`[...document.querySelectorAll('.st-integration-card')].find(card=>card.textContent.includes('WhatsApp Business')).querySelector('button').click()`);
  await wait('document.querySelector(".st-connection-account")?.textContent.includes("Local demo account")');
  await clickText('Test Connection');
  await wait('document.body.textContent.includes("Connection test passed")');
  await clickText('Continue');
  await wait('!!document.querySelector(".st-preference")');
  await clickText('Save connection');
  await wait('!document.querySelector(".st-modal-actions")');
  assert.ok(await evaluate(`[...document.querySelectorAll('.st-integration-card')].find(card=>card.textContent.includes('WhatsApp Business')).textContent.includes('Connected')`));
  await cdp('Page.navigate',{url:'http://127.0.0.1:5199/__local-demo?page=integrations'});
  await wait(`[...document.querySelectorAll('.st-integration-card')].some(card=>card.textContent.includes('WhatsApp Business')&&card.textContent.includes('Manage'))`);
  const connectionsShot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(artifacts,'integrations-desktop.png'),Buffer.from(connectionsShot.data,'base64'));
  await evaluate(`[...document.querySelectorAll('.st-integration-card')].find(card=>card.textContent.includes('WhatsApp Business')).querySelector('button').click()`);
  await clickText('Continue');await wait('!!document.querySelector(".st-preference")');await clickText('Disconnect');await clickText('Confirm disconnect');
  await wait(`[...document.querySelectorAll('.st-integration-card')].some(card=>card.textContent.includes('WhatsApp Business')&&card.textContent.includes('Not Connected'))`);
  await evaluate('window.demoTenant("another-workspace");window.demoRoute("/inbox")');
  await wait('!!document.getElementById("inbox-conversation-demo-omar")');await evaluate('document.getElementById("inbox-conversation-demo-omar").click()');
  assert.ok(await evaluate('!document.body.textContent.includes("Demo reply persists after reload")'),'Demo conversations are scoped to a workspace');
  assert.deepEqual(errors, [], 'No uncaught browser exceptions');
  console.log('PASS three rich threads, thread selection, local reply persistence, simulated connect/test/preferences/disconnect, connection reload persistence, tenant isolation');
} finally {
  socket?.close();browser.kill();await server.close();await pause(500);
  assert.equal(dirname(resolve(profile)),resolve(tmpdir()));await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200}).catch(()=>{});
}
