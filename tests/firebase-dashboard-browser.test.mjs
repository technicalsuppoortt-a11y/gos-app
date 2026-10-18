// UI-only regression harness. Firebase services are isolated here; this does not prove live authorization.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'gos-firebase-ui-'));
const artifacts = resolve('artifacts/firebase-ui'); await mkdir(artifacts, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5198 }, plugins: [
  { name: 'isolate-firebase-ui', enforce: 'pre', load(id) {
    const normalized = id.replaceAll('\\', '/');
    if (normalized.endsWith('/src/backend/workspace.tsx')) return `import {useState} from 'react'; export const cloudStorage={getItem:()=>null,setItem:()=>Promise.resolve(),removeItem:()=>Promise.resolve()}; export const useEntities=()=>[]; export const readCloud=(_,fallback)=>fallback; export const useCloudState=(_,fallback)=>useState(fallback); export const WorkspaceData=({children})=>children;`;
    if (normalized.endsWith('/src/pages/settings/useModuleAccess.ts')) return `export const useModuleAccess=()=>()=>true; export const moduleForPath=path=>path;`;
  } },
  { name: 'firebase-ui-harness', configureServer(vite) { vite.middlewares.use('/__firebase-ui', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__firebase-ui', `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
      import React from 'react'; import {createRoot} from 'react-dom/client'; import {Provider} from 'react-redux'; import {createMemoryRouter,RouterProvider} from 'react-router-dom';
      import {store} from '/src/store/index.ts'; import {loginSuccess} from '/src/store/slices/authSlice.ts'; import {setLanguage,toggleTheme} from '/src/store/slices/uiSlice.ts';
      import {UserLayout} from '/src/components/layout/UserLayout.tsx'; import {DashboardPage} from '/src/pages/DashboardPage.tsx'; import {ThemeProvider} from '/src/context/ThemeProvider.tsx'; import {Toaster} from 'sonner';
      import '/src/index.css'; import '/src/layout-shell.css'; import '/src/global-controls.css'; import '/src/theme-surfaces.css'; import '/src/module-updates.css'; import '/src/i18n/rtl.css';
      store.dispatch(loginSuccess({user:{id:'ui-only',name:'Test User',email:'test@example.com'},role:'USER',tenant:{id:'ui-only',name:'Test workspace'},token:'ui-only'})); store.dispatch(setLanguage('en'));
      const pages=['home','inbox','follow-up','booking','products','analytics']; const router=createMemoryRouter([{path:'/dashboard',element:React.createElement(UserLayout),children:pages.map(page=>({...(page==='home'?{index:true}:{path:page}),element:React.createElement(DashboardPage,{page})}))}],{initialEntries:['/dashboard']});
      window.testRoute=page=>router.navigate('/dashboard'+(page==='home'?'':'/'+page));window.testArabic=()=>store.dispatch(setLanguage('ar'));window.testDark=()=>store.dispatch(toggleTheme());
      createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(ThemeProvider,null,React.createElement(RouterProvider,{router}),React.createElement(Toaster))));
    </script></body></html>`));
  }); } },
] });
await server.listen();
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9348',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let tabs;
  for(let attempt=0;attempt<30;attempt++){try{tabs=await(await fetch('http://127.0.0.1:9348/json',{signal:AbortSignal.timeout(1000)})).json();break;}catch{await pause(100);}}
  assert.ok(tabs?.length,'Headless Edge must start');
  socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  const requests=new Map(),errors=[];let counter=0;
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const request=requests.get(data.id);if(!request)return;clearTimeout(request.timer);requests.delete(data.id);data.error?request.reject(data.error):request.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);else if(data.method==='Runtime.consoleAPICalled'&&data.params.type==='error')errors.push(data.params.args.map(value=>value.value??value.description).join(' '));});
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++counter;const timer=setTimeout(()=>{requests.delete(id);reject(Error('Browser command timed out: '+method));},15000);requests.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  async function evaluate(expression){const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  async function wait(expression){for(let attempt=0;attempt<200;attempt++){if(await evaluate(expression))return;await pause(100);}throw Error('Timed out: '+expression);}
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'http://127.0.0.1:5198/__firebase-ui'});
  await wait('!!window.testRoute && !!document.querySelector(".layout-dashboard-shell")');
  for(const page of ['home','inbox','follow-up','booking','products','analytics']){
    await evaluate(`window.testRoute(${JSON.stringify(page)})`);await pause(600);
    const layout=await evaluate(`({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,shell:!!document.querySelector('.layout-dashboard-shell'),text:document.querySelector('.layout-main')?.textContent?.length??0})`);
    assert.ok(layout.shell&&layout.text>10,`${page} renders its empty workspace`);
    assert.ok(layout.scrollHeight<=layout.height+1,`${page} has no body vertical overflow: ${JSON.stringify(layout)}`);
    assert.ok(layout.scrollWidth<=layout.width+1,`${page} has no body horizontal overflow`);
    if(['home','follow-up','analytics'].includes(page)){const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(artifacts,`${page}-desktop.png`),Buffer.from(shot.data,'base64'));}
  }
  await evaluate('window.testDark();window.testArabic()');await pause(300);
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`window.testRoute('inbox')`);await pause(400);
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Arabic mobile inbox has no body horizontal overflow');
  const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(artifacts,'inbox-mobile-ar-dark.png'),Buffer.from(shot.data,'base64'));
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS six empty dashboard modules, desktop viewport locks, Arabic mobile inbox and dark mode (isolated UI harness).');
} finally {
  socket?.close();browser.kill();await server.close();await pause(500);
  assert.equal(dirname(resolve(profile)),resolve(tmpdir()));await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200}).catch(()=>{});
}
