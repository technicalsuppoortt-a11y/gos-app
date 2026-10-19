// Isolated UI test: the hook emits the same status snapshots as Firestore.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
const profile = await mkdtemp(join(tmpdir(), 'gos-onboarding-ui-'));
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react-redux', 'react-router-dom', '@reduxjs/toolkit', 'use-sync-external-store/shim', 'use-sync-external-store/shim/with-selector', 'sonner', 'lucide-react'] }, server: { host: '127.0.0.1', port: 5199 }, plugins: [react(),
  { name: 'onboarding-status-fixture', enforce: 'pre', load(id) {
    if (id.replaceAll('\\', '/').endsWith('/src/backend/adminUsers.ts')) return `import { useSyncExternalStore } from 'react';
      let status = 'Pending'; const listeners = new Set();
      export const setTestStatus = next => { status = next; listeners.forEach(fn => fn()); };
      export function useAdminUsers() { const current = useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => status); return { invites: [{id:'invite-fixture',email:'invite@example.com',name:'Pending Invite',role:'USER',status:current,created:'2026-10-19T10:00:00Z',mfa:false}],loading:false,error:'' }; }
      export const manageAccount = async () => ({id:'invite-fixture',status:'Pending'});
      export const activationUrl = () => 'https://example.com/activation';
      export const getActivationLink = async () => 'https://example.com/activation';
      export const generateActivationLink = () => 'https://example.com/activation';`;
  }},
  { name: 'onboarding-page-fixture', configureServer(vite) { vite.middlewares.use('/__onboarding-ui', async (_req,res) => {
    res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/__onboarding-ui', `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
      import React from 'react'; import {createRoot} from 'react-dom/client'; import {Provider} from 'react-redux'; import {MemoryRouter} from 'react-router-dom';
      import {store} from '/src/store/index.ts'; import {loginSuccess} from '/src/store/slices/authSlice.ts'; import {setLanguage} from '/src/store/slices/uiSlice.ts';
      import {AdminUsers} from '/src/pages/onboarding/AdminUsers.tsx'; import {setTestStatus} from '/src/backend/adminUsers.ts';
      import '/src/index.css'; import '/src/theme-surfaces.css';
      store.dispatch(loginSuccess({user:{id:'fixture-admin',name:'Admin',email:'admin@example.com'},role:'ADMIN',tenant:{id:'fixture',name:'Fixture'},token:'fixture'}));store.dispatch(setLanguage('en'));
      window.setTestStatus = setTestStatus;
      createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(MemoryRouter,null,React.createElement(AdminUsers))));
    </script></body></html>`));
  }); }}
]});
await server.listen();
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9349',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let browserError = '';
browser.stderr.on('data', chunk => { browserError = (browserError + chunk.toString()).slice(-2000); });
browser.on('error', error => { browserError = error.message; });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let tabs;
  for(let attempt=0;attempt<150;attempt++){try{tabs=await(await fetch('http://127.0.0.1:9349/json',{signal:AbortSignal.timeout(1000)})).json();break;}catch{await pause(100);}}
  assert.ok(tabs?.length,'Headless Edge must start: ' + browserError);
  socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  const requests=new Map(),errors=[];let counter=0;
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const request=requests.get(data.id);if(!request)return;clearTimeout(request.timer);requests.delete(data.id);data.error?request.reject(data.error):request.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);else if(data.method==='Runtime.consoleAPICalled'&&data.params.type==='error')errors.push(data.params.args.map(value=>value.value??value.description).join(' '));});
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;const timer=setTimeout(()=>{requests.delete(id);reject(Error('Browser command timed out: '+method));},15000);requests.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  async function evaluate(expression){const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  async function wait(expression){for(let attempt=0;attempt<200;attempt++){if(await evaluate(expression))return;await pause(100);}throw Error('Timed out: '+expression);}
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'http://127.0.0.1:5199/__onboarding-ui'});
  await wait('!!window.setTestStatus && !!document.querySelector("tbody tr")');
  const status = () => evaluate('document.querySelector("tbody tr .ob-badge")?.textContent.trim()');
  assert.equal(await status(), 'Pending');
  await evaluate(`document.querySelector('[aria-label="Actions for Pending Invite"]').click()`);
  await wait(`!!document.querySelector('[role="menuitem"]')`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('[role="menuitem"]')).find(item => item.textContent.includes("Awaiting first sign-in"))?.disabled`),true);
  await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
  await evaluate('window.setTestStatus("Active")');
  await wait('document.querySelector("tbody tr .ob-badge")?.textContent.trim() === "Active"');
  await evaluate('window.setTestStatus("Deactivated")');
  await wait('document.querySelector("tbody tr .ob-badge")?.textContent.trim() === "Deactivated"');
  assert.deepEqual(errors, [], 'AdminUsers has no uncaught browser errors');
  console.log('PASS admin table reflects Pending/Active/Deactivated snapshots; Pending invitations cannot be manually activated');
} finally {
  socket?.close();browser.kill();await server.close();await pause(500);
  assert.equal(dirname(resolve(profile)),resolve(tmpdir()));await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200}).catch(()=>{});
}
