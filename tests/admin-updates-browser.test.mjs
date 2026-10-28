import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const platformFixture = `
import {useEffect,useState} from 'react';
import {initialTools} from '/src/pages/admin/tools-data.ts';
export const defaultPlatformTools=initialTools.map(t=>({...t,enabled:true,status:'Active'}));
window.fixtureTools={};window.fixtureRevision=0;
export function usePlatformTools(){const[state,set]=useState({tools:window.fixtureTools,loading:false,error:'',revision:window.fixtureRevision});useEffect(()=>{const update=()=>set({tools:window.fixtureTools,loading:false,error:'',revision:window.fixtureRevision});window.addEventListener('tools-test',update);return()=>window.removeEventListener('tools-test',update)},[]);return state}
export async function persistPlatformTools(tools){if(window.failSave)throw Error('Simulated connection failure');window.fixtureTools=Object.fromEntries(tools.map(t=>[t.id,t]));window.fixtureRevision++;window.dispatchEvent(new Event('tools-test'))}
`;
const firestoreFixture = `
export const collection=(_, ...path)=>({path:path.join('/')});export const doc=collection;export const where=()=>({});export const orderBy=()=>({});export const limit=()=>({});export const query=(ref)=>ref;
export function onSnapshot(ref,callback){const notify=()=>callback({docs:ref.path.endsWith('/messages')?(window.fixtureMessages??[]).filter(m=>m.roomId===ref.path.split('/')[1]).slice().reverse().map(m=>({id:m.id,data:()=>m})):(window.fixtureRooms??[]).map(r=>({id:r.id,data:()=>r})),data:()=>({}),exists:()=>true});notify();window.addEventListener('chat-test',notify);return()=>window.removeEventListener('chat-test',notify)}
export const serverTimestamp=()=>new Date();export const runTransaction=async(_,fn)=>fn({get:async()=>({data:()=>({})}),set:()=>{}});
`;
const backendFixture = `
export const db={};export const storage={};export const auth={currentUser:{uid:'admin'}};export const backendError=e=>e.message;
window.fixtureMessages=[];window.fixtureRooms=[];window.fixtureRole='ADMIN';
const stamp=()=>({toDate:()=>new Date(),toMillis:()=>Date.now()});
const roomKey=recipient=>['admin',recipient].sort().join('~');
const publish=()=>window.dispatchEvent(new Event('chat-test'));
export async function callBackend(name,data){
 if(data.operation==='contacts')return{contacts:window.fixtureRole==='USER'?[{id:'assignedadmin',name:'Assigned Admin',role:'ADMIN'}]:window.fixtureRole==='SUPER_ADMIN'?[{id:'teamadmin',name:'Team Admin',role:'ADMIN'}]:[{id:'user',name:'Sara Ahmed',role:'USER'},{id:'user2',name:'Kareem',role:'USER'},{id:'super',name:'Platform Super Admin',role:'SUPER_ADMIN'}]};
 if(data.operation==='open'){const id=roomKey(data.recipientId);if(!window.fixtureRooms.some(r=>r.id===id))window.fixtureRooms.push({id,lastMessage:'',updatedAt:stamp()});publish();return{roomId:id}}
 if(data.operation==='send'){if(window.failChat)throw Error('Simulated send failure');if(!window.fixtureMessages.some(m=>m.id===data.messageId)){const parent=window.fixtureMessages.find(m=>m.id===data.replyToId);window.fixtureMessages.push({id:data.messageId,roomId:roomKey(data.recipientId),authorId:'admin',authorName:'Admin',text:data.text,files:data.files??[],replyContext:parent?{id:parent.id,text:parent.text,authorName:parent.authorName}:null,createdAt:stamp()})}publish()}
 const m=window.fixtureMessages.find(m=>m.id===data.messageId);
 if(data.operation==='edit'){m.text=data.text;m.editedAt=stamp();publish()}
 if(data.operation==='react'){m.reactions??={};if(m.reactions.admin===data.emoji)delete m.reactions.admin;else m.reactions.admin=data.emoji;publish()}
 if(data.operation==='delete'){if(data.scope==='me')m.hiddenFor=['admin'];else{m.deleted=true;m.text='';m.files=[]}publish()}
 if(data.operation==='forward'){window.fixtureMessages.push({...m,id:data.forwardId,roomId:roomKey(data.targetId),forwarded:{authorName:m.authorName},reactions:{},hiddenFor:[]});publish();return{roomId:roomKey(data.targetId)}}
 return{ok:true}
}
`;
const paymentsFixture = `
import {useState} from 'react';import {gatewayFields} from '/functions/payment-gateway-model.js';
export const paymentProviders=[['vodafone','Vodafone Cash','manual'],['instapay','InstaPay','manual'],['etisalat','Etisalat Cash','manual'],['orange','Orange Cash','manual'],['bank','Bank Transfer','manual'],['stc','STC Pay','manual'],...['stripe','paddle','paymob','paypal','paytabs','fawry','kashier'].map(id=>[id,id[0].toUpperCase()+id.slice(1),'gateway'])];
const getGateway=async provider=>({gatewayRevision:0,fields:Object.fromEntries(gatewayFields[provider].filter(f=>!f.secret).map(f=>[f.key,''])),configuredSecrets:{},mode:'sandbox',region:'SAU'});
export function usePaymentMethods(){const[methods,set]=useState([]);return{methods,loading:false,error:'',canManage:true,refresh:()=>{},getGateway,save:async next=>set(next),saveGateway:async(provider,label,enabled,configuration)=>{window.savedGateway={provider,label,enabled,configuration}}}}
`;
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-admin-updates-test', optimizeDeps: { entries: [], include: ['react','react-dom/client','react/jsx-runtime','react-router-dom','react-redux','@reduxjs/toolkit','lucide-react','@radix-ui/react-select','firebase/storage'] }, plugins: [react(), {
  name: 'admin-updates-fixture', enforce: 'pre',
  resolveId(source, importer) { if (source === 'firebase/storage' && /(?:SupportChat|SupportMedia)\.tsx$/.test(importer ?? '')) return '\0fixture-storage'; if (source === 'firebase/firestore' && /(?:SupportChat|AdminGeneral)\.tsx$/.test(importer ?? '')) return '\0fixture-firestore'; },
  load(id) {
    const path = id.replaceAll('\\', '/');
    if (id === '\0fixture-storage') return `export const ref=(_,path)=>({fullPath:path});window.fixtureFileUrls={};window.fixtureUploads=[];export const uploadBytes=async(ref,file)=>{window.fixtureFileUrls[ref.fullPath]=URL.createObjectURL(file);window.fixtureUploads.push({path:ref.fullPath,type:file.type,name:file.name,size:file.size})};export const getDownloadURL=async ref=>window.fixtureFileUrls[ref.fullPath]??'data:application/pdf;base64,JVBERi0xLjQ=';`;
    if (id === '\0fixture-firestore') return firestoreFixture;
    if (path.endsWith('/src/backend/workspace.tsx')) return 'export const WorkspaceData=({children})=>children;export const cloudStorage={getItem:()=>null,setItem:()=>true};';
    if (path.endsWith('/src/pages/settings/useModuleAccess.ts')) return "export const useModuleAccess=()=>()=>false;export const moduleForPath=path=>{const parts=path.split('/').filter(Boolean);if(parts[0]==='dashboard')parts.shift();return parts[0]||'home'};";
    if (path.endsWith('/src/components/layout/Sidebar.tsx')) return "import{NavLink}from'react-router-dom';export const Sidebar=({items,basePath})=><nav aria-label='User sidebar'>{items.map(item=><NavLink key={item.href} to={basePath+item.href}>{item.name}</NavLink>)}</nav>;";
    if (path.endsWith('/src/backend/platformTools.tsx')) return platformFixture;
    if (path.endsWith('/src/backend/firebase.ts')) return backendFixture;
    if (path.endsWith('/src/backend/paymentMethods.ts')) return paymentsFixture;
    if (path.endsWith('/src/backend/session.tsx')) return 'export const logoutFirebase=async()=>{};';
    if (path.endsWith('/src/components/layout/Header.tsx')) return 'export const Header=({title})=><header style={{padding:20}}>{title}</header>;';
  },
  configureServer(vite) { vite.middlewares.use('/__admin-updates', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await vite.transformIndexHtml('/__admin-updates', `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react';import{createRoot}from'react-dom/client';import{Provider}from'react-redux';import{createMemoryRouter,RouterProvider}from'react-router-dom';
import{store}from'/src/store/index.ts';import{loginSuccess}from'/src/store/slices/authSlice.ts';import{setLanguage}from'/src/store/slices/uiSlice.ts';import i18n from'/src/i18n/i18n.ts';
import{UserLayout}from'/src/components/layout/UserLayout.tsx';import{AdminLayout}from'/src/components/layout/AdminLayout.tsx';import{AdminTools}from'/src/pages/admin/AdminTools.tsx';import{SupportChat}from'/src/pages/support/SupportChat.tsx';import{PaymentMethodsPanel}from'/src/pages/settings/PaymentMethodsPanel.tsx';import{AdminGeneral}from'/src/pages/admin/AdminGeneral.tsx';import'/src/index.css';
store.dispatch(loginSuccess({user:{id:'admin',name:'Admin',email:'admin@example.com'},role:'ADMIN',tenant:{id:'platform',name:'Platform'},token:'fixture'}));store.dispatch(setLanguage('en'));await i18n.changeLanguage('en');
window.switchSupportRole=role=>{window.fixtureRole=role;store.dispatch(loginSuccess({user:{id:'admin',name:'Admin',email:'admin@example.com'},role,tenant:{id:'platform',name:'Platform'},token:'fixture'}))};
window.router=createMemoryRouter([{path:'/admin',element:React.createElement(AdminLayout),children:[{path:'tools',element:React.createElement(AdminTools)},{path:'support',element:React.createElement(SupportChat)},{path:'payments-gateways',element:React.createElement(PaymentMethodsPanel)},{path:'settings',element:React.createElement(AdminGeneral)},...['funnels','crm','booking','products','templates','integrations','ai-usage','transactions'].map(path=>({path,element:React.createElement('div',null,'Module')}))]},{path:'/dashboard',element:React.createElement(UserLayout),children:[{path:'support',element:React.createElement(SupportChat)}]}],{initialEntries:['/admin/tools']});
createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(RouterProvider,{router:window.router})));
</script></body></html>`));
  }); },
}], server: { host: '127.0.0.1', port: 0 } });
await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read','clipboard-write','microphone'] });
  page.setDefaultTimeout(60000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__admin-updates`);
  await page.getByRole('heading', { name: 'All Tools Management' }).waitFor();
  const sidebar = page.locator('.adm-sidebar nav');
  for (const name of ['Domains & SSL', 'Marketing Tracking', 'Onboarding']) assert.equal(await sidebar.getByRole('link', { name, exact: true }).count(), 0);
  assert.equal(await sidebar.getByRole('link', { name: 'Dashboard Management' }).count(), 1);
  fs.mkdirSync('artifacts/admin-updates', { recursive: true });
  await page.screenshot({ path: 'artifacts/admin-updates/tools-light.png' });
  const toggle = page.getByRole('switch', { name: 'Toggle AI Copilot & Automations', exact: true });
  await toggle.click(); await page.waitForFunction(() => window.fixtureTools['ai-copilot']?.enabled === false);
  assert.equal(await toggle.getAttribute('aria-checked'), 'false');
  await page.evaluate(() => { window.failSave = true; }); await toggle.click();
  await page.getByRole('alert').getByText('Simulated connection failure').waitFor();
  assert.equal(await toggle.getAttribute('aria-checked'), 'false');
  await page.evaluate(() => { window.failSave = false; });
  await page.locator('[data-tool-id="booking-engine"]').getByRole('button', { name: 'Configure Booking & Calendar Engine' }).click();
  await page.getByRole('dialog').waitFor(); await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();
  await page.waitForFunction(() => window.fixtureRevision === 2);
  const nav = async path => { await page.evaluate(path => window.router.navigate('/admin/' + path), path); };
  await nav('funnels'); await page.getByRole('heading', { name: 'Dashboard Management' }).waitFor();
  assert.equal(await page.locator('.adm-group-nav a').count(), 5);
  await nav('settings'); await page.getByRole('heading', { name: 'General', exact: true }).waitFor();
  assert.equal(await page.locator('.adm-group-nav a').count(), 4);
  await nav('payments-gateways'); await page.getByRole('heading', { name: 'Professional Payment Gateways' }).waitFor();
  assert.equal(await page.locator('.pm-gateway-card').count(), 4);
  assert.deepEqual(await page.locator('.pm-gateway-heading b').allTextContents(), ['Stripe', 'Paddle', 'Fawry / Kashier', 'Paymob']);
  assert.equal(await page.locator('.pm-brand-logo').count(), 5);
  await page.waitForFunction(() => [...document.querySelectorAll('.pm-brand-logo')].every(img => img.complete && img.naturalWidth > 0));
  await page.screenshot({ path: 'artifacts/admin-updates/payments-light.png' });
  for (const provider of ['Paddle', 'Paymob']) {
    const card = page.locator('.pm-gateway-card').filter({ has: page.getByText(provider, { exact: true }) });
    await card.getByRole('button', { name: 'Configure Account' }).click();
    await page.getByRole('dialog').waitFor();
    assert.ok(await page.getByRole('dialog').locator('input[type=password]').count() >= 2);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Open quick support chat' }).click();
  await page.getByRole('dialog', { name: 'Quick Support' }).waitFor();
  await page.getByRole('dialog', { name: 'Quick Support' }).getByRole('button', { name: 'Close dialog', exact: true }).click();
  await nav('support');
  await page.getByRole('tab', { name: /Super Admin/ }).click();
  assert.equal(await page.getByRole('button', { name: /Sara Ahmed/ }).count(), 0);
  await page.getByRole('button', { name: /Platform Super Admin/ }).click();
  await page.getByRole('tab', { name: /Users/ }).click();
  await page.getByRole('button', { name: 'New Chat', exact: true }).first().click();
  await page.getByRole('dialog', { name: 'New Chat' }).getByRole('button', { name: /Sara Ahmed/ }).click();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Please help with my workspace');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.locator('.support-message p').getByText('Please help with my workspace', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reply', exact: true }).click();
  await page.locator('.support-reply').waitFor();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Follow-up');
  await page.evaluate(() => { window.failChat = true; });
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('alert').getByText('Simulated send failure').waitFor();
  assert.equal(await page.getByRole('textbox', { name: 'Message', exact: true }).inputValue(), 'Follow-up');
  await page.evaluate(() => { window.failChat = false; });
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.waitForFunction(() => window.fixtureMessages.length === 2);
  const first = page.locator('.support-message').first();
  await first.getByRole('button', { name: 'Message actions', exact: true }).click();
  await first.getByRole('button', { name: 'Edit message', exact: true }).click();
  await first.getByRole('textbox', { name: 'Edit message', exact: true }).fill('Edited support request');
  await first.getByRole('button', { name: 'Save edit', exact: true }).click();
  await first.getByText('Edited support request', { exact: true }).waitFor();
  await page.locator('.support-quote').filter({ hasText: 'Edited support request' }).click();
  assert.ok((await first.getAttribute('class')).includes('support-highlight'));
  await first.getByRole('button', { name: 'Message actions', exact: true }).click();
  await first.getByRole('button', { name: 'Add reaction', exact: true }).click();
  await first.getByRole('button', { name: 'React 👍', exact: true }).click();
  await first.locator('.support-reactions').getByRole('button', { name: 'React 👍', exact: true }).waitFor();
  await first.getByRole('button', { name: 'Message actions', exact: true }).click();
  await first.getByRole('button', { name: 'Copy text', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Edited support request');
  await first.getByRole('button', { name: 'Message actions', exact: true }).click();
  await first.getByRole('button', { name: 'Forward message', exact: true }).click();
  await page.getByRole('dialog', { name: 'Forward message', exact: true }).getByRole('button', { name: /Kareem/ }).click();
  await page.waitForFunction(() => window.fixtureMessages.some(m => m.roomId === 'admin~user2' && m.forwarded));
  const second = page.locator('.support-message').nth(1);
  await second.getByRole('button', { name: 'Message actions', exact: true }).click();
  await second.getByRole('button', { name: 'Delete for me', exact: true }).click();
  await page.waitForFunction(() => window.fixtureMessages.some(m => m.text === 'Follow-up' && m.hiddenFor?.includes('admin')));
  assert.equal(await page.locator('.support-message').count(), 1);
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X7wAAAABJRU5ErkJggg==','base64');
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  await page.locator('.support-composer input[type=file]').setInputFiles([{ name: 'guide.png', mimeType: 'image/png', buffer: image }, { name: 'guide.pdf', mimeType: 'application/pdf', buffer: pdf }]);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: 'Preview guide.png', exact: true }).click();
  await page.getByRole('dialog', { name: 'guide.png', exact: true }).waitFor();
  await page.getByRole('dialog', { name: 'guide.png', exact: true }).getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Preview PDF', exact: true }).click();
  await page.getByRole('dialog', { name: 'guide.pdf', exact: true }).locator('iframe').waitFor();
  await page.getByRole('dialog', { name: 'guide.pdf', exact: true }).getByRole('button', { name: 'Close dialog', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download guide.png', exact: true }).click();
  assert.equal((await downloaded).suggestedFilename(), 'guide.png');
  await page.getByRole('button', { name: 'Record voice note', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Recording voice note' }).waitFor();
  await page.waitForTimeout(1600);
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
  await page.locator('.support-reply').filter({ hasText: 'voice-' }).waitFor();
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: 'Play voice message', exact: true }).waitFor();
  assert.ok(await page.evaluate(() => window.fixtureMessages.some(m => m.files.some(f => f.duration > 0 && f.waveform?.length === 40))));
  await page.getByRole('button', { name: 'Play voice message', exact: true }).click();
  await page.getByRole('button', { name: 'Pause voice message', exact: true }).click();
  await first.getByRole('button', { name: 'Message actions', exact: true }).click();
  await first.getByRole('button', { name: 'Delete for everyone', exact: true }).click();
  await first.getByText('Message deleted', { exact: true }).waitFor();
  if(await page.getByRole('button', { name: 'Dismiss notice' }).count())await page.getByRole('button', { name: 'Dismiss notice' }).click();
  fs.mkdirSync('artifacts/admin-updates', { recursive: true });
  await page.screenshot({ path: 'artifacts/admin-updates/support-light.png' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: 'artifacts/admin-updates/support-dark.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.locator('.support-thread').isVisible());
  await page.getByRole('button', { name: 'Back to contacts' }).click();
  assert.ok(await page.locator('.support-contacts').isVisible());
  await page.screenshot({ path: 'artifacts/admin-updates/support-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>window.switchSupportRole('SUPER_ADMIN'));
  await page.getByRole('button',{name:'New Chat',exact:true}).first().click();
  await page.getByRole('dialog',{name:'New Chat',exact:true}).getByRole('button',{name:/Team Admin/}).click();
  assert.equal(await page.getByRole('tablist',{name:'Conversation groups'}).count(),0);
  await page.evaluate(()=>{window.switchSupportRole('USER');window.router.navigate('/dashboard/support')});
  await page.getByRole('navigation',{name:'User sidebar'}).getByRole('link',{name:'Support',exact:true}).waitFor();
  assert.equal(await page.getByRole('navigation',{name:'User sidebar'}).getByRole('link',{name:'Support',exact:true}).getAttribute('href'),'/dashboard/support');
  await page.locator('.support-thread').getByText('Assigned Admin',{exact:true}).waitFor();
  assert.equal(await page.getByRole('tablist',{name:'Conversation groups'}).count(),0);
  assert.deepEqual(errors, []);
  console.log('PASS: admin navigation/tools/gateways; role tabs/new chat/quick overlay/user sidebar; edit/react/copy/reply/forward/delete modes; image/PDF previews/download; synthetic recording, persisted waveform/duration and playback; responsive/light/dark layouts.');
} finally { await browser?.close(); await server.close(); }
