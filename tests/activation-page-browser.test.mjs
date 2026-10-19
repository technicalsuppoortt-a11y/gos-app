// Real React page with isolated Firebase operations; never consumes a real invitation.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
const profile = await mkdtemp(join(tmpdir(), 'gos-activation-ui-'));
const artifacts = resolve('artifacts/firebase-ui'); await mkdir(artifacts, { recursive: true });
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react-redux', 'react-router-dom', '@reduxjs/toolkit', 'use-sync-external-store/shim', 'use-sync-external-store/shim/with-selector', 'lucide-react'] }, server: { host: '127.0.0.1', port: 5200 }, plugins: [react(), {
  name: 'activation-fixtures', enforce: 'pre', resolveId(id) { if (id === '/__activation-auth') return '\0activation-auth'; },
  async load(id) {
    const path = id.replaceAll('\\', '/');
    if (path.endsWith('/src/pages/onboarding/ActivateAccountPage.tsx')) return (await readFile(id, 'utf8')).replace("from 'firebase/auth'", "from '/__activation-auth'");
    if (id === '\0activation-auth') return `window.activationEvents=[]; export async function verifyPasswordResetCode(_,code){if(code==='expired')throw Error('Expired');return 'invited@example.com';} export async function confirmPasswordReset(_,code,password){window.activationEvents.push('confirm:'+code);}`;
    if (path.endsWith('/src/backend/firebase.ts')) return `export const auth={}; export const backendError=error=>error.message;`;
    if (path.endsWith('/src/backend/adminUsers.ts')) return `export class ActivationError extends Error{localizedMessage(){return this.message;}} export async function activateInvitedUser(){window.activationEvents.push('signIn-and-activate');if(window.failActivationOnce){window.failActivationOnce=false;throw Error('Connection interrupted');}return {user:{id:'fixture',name:'Invited User',email:'invited@example.com'},role:'USER',tenant:{id:'fixture',name:'Workspace'},token:'fixture'};}`;
  },
}, {
  name: 'activation-fixture-page', configureServer(vite) { vite.middlewares.use('/__activation-ui', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__activation-ui', `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
      import React from 'react'; import {createRoot} from 'react-dom/client'; import {Provider} from 'react-redux'; import {createMemoryRouter,RouterProvider} from 'react-router-dom';
      import {store} from '/src/store/index.ts';import {setLanguage} from '/src/store/slices/uiSlice.ts'; import ActivateAccountPage from '/src/pages/onboarding/ActivateAccountPage.tsx';
      import '/src/index.css'; import '/src/theme-surfaces.css';
      store.dispatch(setLanguage('en'));
      const router=createMemoryRouter([{path:'/onboarding/activate-account',element:React.createElement(ActivateAccountPage)},{path:'/dashboard',element:React.createElement('p',{'data-testid':'dashboard'},'Dashboard')}],{initialEntries:['/onboarding/activate-account']});
      window.testNavigate=router.navigate;window.testPath=()=>router.state.location.pathname;
      createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(RouterProvider,{router})));
    </script></body></html>`));
  }); },
} ] });
await server.listen();
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9350',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let tabs;
  for (let attempt=0;attempt<150;attempt++) { try { tabs=await(await fetch('http://127.0.0.1:9350/json',{signal:AbortSignal.timeout(1000)})).json();break; } catch { await pause(100); } }
  assert.ok(tabs?.length,'Headless Edge must start');
  socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  const requests=new Map(),errors=[];let counter=0;
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const request=requests.get(data.id);if(!request)return;clearTimeout(request.timer);requests.delete(data.id);data.error?request.reject(data.error):request.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);});
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;const timer=setTimeout(()=>{requests.delete(id);reject(Error('Browser command timed out: '+method));},15000);requests.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  async function evaluate(expression){const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  async function wait(expression){for(let attempt=0;attempt<200;attempt++){if(await evaluate(expression))return;await pause(100);}throw Error('Timed out: '+expression);}
  const fill = async (id, value) => evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'http://127.0.0.1:5200/__activation-ui'});
  await wait('!!window.testNavigate && !!document.querySelector(".gos-activation-invalid")');
  await evaluate(`window.testNavigate('/onboarding/activate-account?mode=resetPassword&oobCode=test-code&apiKey=public-key')`);
  await wait('!!document.getElementById("activation-password")');
  assert.ok(await evaluate('document.body.textContent.includes("invited@example.com")'));
  await fill('activation-password','GoodPassword123!');await fill('activation-confirmation','different');
  assert.equal(await evaluate('document.querySelector("button[type=submit]").disabled'),true);
  await fill('activation-confirmation','GoodPassword123!');
  await wait('!document.querySelector("button[type=submit]").disabled');
  const desktop=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(artifacts,'activation-desktop.png'),Buffer.from(desktop.data,'base64'));
  await evaluate('window.failActivationOnce=true;document.querySelector("button[type=submit]").click()');
  await wait('!!document.querySelector(".gos-activation-error-box")');
  assert.equal(await evaluate('window.activationEvents.filter(item=>item.startsWith("confirm:")).length'),1);
  await evaluate('document.querySelector("button[type=submit]").click()');
  await wait('!!document.querySelector(".gos-activation-success")');
  assert.deepEqual(await evaluate('window.activationEvents'),['confirm:test-code','signIn-and-activate','signIn-and-activate']);
  await evaluate('document.querySelector(".gos-activation-success button").click()');
  await wait('window.testPath()==="/dashboard"');
  await evaluate(`window.testNavigate('/onboarding/activate-account?mode=resetPassword&oobCode=expired')`);
  await wait('!!document.querySelector(".gos-activation-invalid")');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.documentElement.classList.add('dark');window.testNavigate('/onboarding/activate-account?mode=resetPassword&oobCode=mobile&lang=ar')`);
  await wait('!!document.getElementById("activation-password")');
  assert.equal(await evaluate('document.querySelector(".gos-activation").dir'),'rtl');
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'No mobile horizontal overflow');
  const mobile=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(artifacts,'activation-mobile-ar-dark.png'),Buffer.from(mobile.data,'base64'));
  assert.deepEqual(errors,[],'No uncaught errors in the custom activation page');
  console.log('PASS branded activation card, missing/expired links, password confirmation, safe activation retry, dashboard redirect, Arabic/mobile/dark layout');
} finally {
  socket?.close();browser.kill();await server.close();await pause(500);
  assert.equal(dirname(resolve(profile)),resolve(tmpdir()));await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200}).catch(()=>{});
}
