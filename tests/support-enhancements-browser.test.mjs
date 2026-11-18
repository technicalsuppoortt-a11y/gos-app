import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import ts from 'typescript';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const mock = `
const role = new URLSearchParams(location.search).get('role') || 'USER';
const ar = new URLSearchParams(location.search).has('ar');
const contact = {id:'peer',name:'Support contact',role:role==='USER'?'ADMIN':role==='ADMIN'?'USER':'ADMIN'};
const stamp = {toMillis:()=>1000,toDate:()=>new Date(1000)};
const oldPin = {id:'old-pin',authorId:'peer',authorName:'Support contact',text:'Older pinned instructions',files:[],createdAt:stamp,pinned:true,deleted:false};
const initial = {id:'peer-message',authorId:'peer',authorName:'Support contact',text:'Important instructions',files:[],createdAt:stamp,deleted:false};
const qa = window.qa = {role,messages:[initial],calls:[],uploads:[],fail:false};
const listeners = new Set();
const emit = () => listeners.forEach(fn=>fn());
export const useSelector = selector => selector({auth:{user:{id:'self'},role}});
export const useUILanguage = () => ar?'ar':'en';
export const db = {}, storage = {};
export const backendError = e => e.message;
export const collection = (_, ...parts) => parts.join('/');
export const limit = value => ({limit:value});
export const where = (key, op, value) => ({key,value});
export const orderBy = () => ({});
export const query = (path, ...filters) => ({path,filters});
export function onSnapshot(query, callback) {
 const notify = () => {
  const pins = query.filters.some(f=>f.key==='pinned');
  const rows = query.path.endsWith('/messages') ? (pins ? [oldPin,...qa.messages].filter(m=>m.pinned) : [...qa.messages].reverse()) : [{id:'peer~self',lastMessage:'Conversation'}];
  callback({docs:rows.map(m=>({id:m.id,data:()=>m}))});
 };
 listeners.add(notify); queueMicrotask(notify); return ()=>listeners.delete(notify);
}
export const ref = (_, path) => path;
export const getDownloadURL = async () => '/payment-brands/fawry.png';
export const uploadBytes = async (path, file) => {qa.uploads.push({path,name:file.name}); await new Promise(r=>setTimeout(r,100));};
export async function callBackend(_, data) {
 qa.calls.push(data);
 if(data.operation==='contacts') return {contacts:[contact]};
 if(data.operation==='open') return {roomId:'peer~self'};
 if(data.operation==='send') {
  if(qa.fail){qa.fail=false;throw Error('Temporary send failure');}
  qa.messages.push({id:data.messageId,authorId:'self',authorName:'Me',text:data.text,files:data.files,createdAt:stamp,deleted:false}); emit();
 }
 if(data.operation==='pin') {const m=[oldPin,...qa.messages].find(m=>m.id===data.messageId);m.pinned=data.pinned;emit();}
 return {ok:true};
}
`;
const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {SupportChat} from '/src/pages/support/SupportChat.tsx';
import {GatewayBrandIcon} from '/src/components/payments/GatewayBrandIcon.tsx';
import '/src/pages/settings/payment-methods.css';
document.body.style.cssText='margin:0;padding:12px;font:14px Arial;box-sizing:border-box';
createRoot(document.getElementById('root')).render(<><SupportChat/><div className="pm-methods"><div className="pm-gateway-grid">{[['stripe'],['paddle'],['fawry','kashier'],['paymob']].map(ids=><div className="pm-gateway-card" key={ids[0]}><div className="pm-gateway-heading"><span className="pm-gateway-brands">{ids.map(provider=><GatewayBrandIcon key={provider} provider={provider}/>)}</span><b>{ids.join(' / ')}</b></div></div>)}</div></div></>);
`;
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-support-enhancements', plugins: [react(), {
  name: 'support-fixture', enforce: 'pre',
  resolveId(source, importer = '') {
    if (source === '/support-qa.tsx') return '\0support-qa.tsx';
    if (importer.replaceAll('\\', '/').includes('/src/pages/support/') && (source === 'react-redux' || source === 'firebase/firestore' || source === 'firebase/storage' || source.endsWith('/backend/firebase') || source.endsWith('/i18n/display'))) return '\0support-mocks';
    if (source === './SupportAssignments') return '\0support-assignments';
  },
  load(id) {
    if (id === '\0support-mocks') return mock;
    if (id === '\0support-assignments') return 'export const SupportAssignments = () => null;';
    if (id === '\0support-qa.tsx') return ts.transpileModule(entry, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText;
  },
  configureServer(server) { server.middlewares.use('/support-qa.html', async (_, res) => { res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml('/support-qa.html', '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/support-qa.tsx"></script></body></html>')); }); },
}], server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  for (const role of ['USER', 'ADMIN', 'SUPER_ADMIN']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/support-qa.html?role=${role}`, { waitUntil: 'networkidle' });
    if (role !== 'USER') await page.locator('.support-contacts>button').click();
    await page.locator('#message-peer-message').waitFor();
    await page.locator('.support-pins summary').click();
    await page.getByText('Older pinned instructions', { exact: true }).waitFor();
    await page.locator('#message-peer-message').getByRole('button', {name:'Message actions'}).click();
    await page.getByRole('button', {name:'Pin message',exact:true}).click();
    await page.locator('#message-peer-message .support-pinned-label').waitFor();
    await page.locator('.support-pin-item').filter({hasText:'Important instructions'}).getByRole('button', {name:'Unpin message'}).click();
    assert.equal(await page.locator('#message-peer-message .support-pinned-label').count(), 0);
    await page.locator('input[type=file]').setInputFiles([{name:'image.png',mimeType:'image/png',buffer:Buffer.from('image')},{name:'instructions.pdf',mimeType:'application/pdf',buffer:Buffer.from('pdf')}]);
    const send = page.getByRole('button', {name:'Send message',exact:true});
    assert.equal(await send.isEnabled(), true);
    await page.evaluate(()=>{window.qa.fail=true;});
    await send.click();
    await page.getByRole('alert').filter({hasText:'Temporary send failure'}).waitFor();
    assert.equal(await page.locator('.support-pending-file').count(), 2);
    await send.click();
    await page.waitForFunction(()=>window.qa.messages.length===2);
    const result = await page.evaluate(()=>({message:window.qa.messages[1],uploads:window.qa.uploads,calls:window.qa.calls.filter(c=>c.operation==='send')}));
    assert.equal(result.message.text, ''); assert.equal(result.message.files.length, 2);
    assert.equal(result.uploads.length, 2, 'retry reuses successful uploads');
    assert.equal(result.calls[0].messageId, result.calls[1].messageId);
    assert.equal(await page.locator('.support-pending-file').count(), 0);
    await page.waitForFunction(()=>[...document.querySelectorAll('.gateway-brand-icon img')].every(img=>img.complete&&img.naturalWidth>0));
    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), true, `${role}: overflow at ${width}`);
      assert.equal(await send.isVisible(), true);
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${role}: attachment-only send, retry, pin/unpin, historical pins, logos and responsive widths passed`);
  }
  const page = await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/support-qa.html?ar`,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await page.locator('#message-peer-message').getByRole('button',{name:'إجراءات الرسالة'}).click();
  await page.getByRole('button',{name:'تثبيت الرسالة',exact:true}).click();
  await page.locator('#message-peer-message .support-pinned-label').waitFor();
  assert.equal(await page.locator('.support-chat').getAttribute('dir'),'rtl');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('Arabic RTL/dark mobile pinning passed');
} finally { await browser?.close(); await server.close(); }
