import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fixture = `
import {useSyncExternalStore} from 'react';
import {executeBilling,PLATFORM} from '/functions/billing-engine.js';
export * from '/functions/billing-engine.js';
let version=0;const listeners=new Set(); const rows=new Map(); let serial=0;
const actors={super:{uid:'super',role:'SUPER_ADMIN'},admin:{uid:'agency',role:'ADMIN'},user:{uid:'client',role:'USER',supportParentId:'agency'}};
window.billingRole='super';window.billingRows=rows;
const store={get:async p=>structuredClone(rows.get(p)),query:async(c,f,v)=>[...rows.entries()].filter(([p,r])=>p.startsWith(c+'/')&&r[f]===v).map(([,r])=>structuredClone(r)),id:()=> 'generated-'+(++serial),commit:writes=>{for(const[p,r]of writes)rows.set(p,r);version++;for(const listener of listeners)listener()}};
export async function billing(op,data={}){return executeBilling(op,data,actors[window.billingRole],store)}
const watch=()=>useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>version);
const result=data=>({data,loading:false,error:''});
const list=(c,f,v)=>[...rows.entries()].filter(([p,r])=>p.startsWith(c+'/')&&r[f]===v).map(([,r])=>r);
export function useBillingIdentity(){watch();const a=actors[window.billingRole];return{...a,uid:a.uid,providerId:a.role==='USER'?'agency':PLATFORM,loading:false}}
export const useBillingRefresh=()=>{};
export function usePlans(owner,hidden=false){watch();return result(list('billingPlans','ownerId',owner).filter(p=>p.status==='active'&&(hidden||p.visible||p.kind==='trial')))}
export function useSubscription(uid){watch();return result(rows.get('billingSubscriptions/'+uid)||null)}
export function useWallet(uid){watch();return result(rows.get('billingWallets/'+uid)||null)}
export function useSubscribers(uid){watch();return result(list('billingSubscriptions','providerId',uid))}
export function useProviderWallets(uid){watch();return result(list('billingWallets','providerId',uid))}
export function useRequests(field,uid){watch();return result(list('billingRequests',field,uid))}
export function useLedger(uid){watch();return result(list('billingLedger','walletId',uid))}
export async function seed(){
 for(const a of Object.values(actors))rows.set('users/'+a.uid,a);
 const plan=(id,extra={})=>({id,kind:'plan',name:{en:id},features:{en:['Workspace features'],ar:[]},price:29,billingType:'monthly',credits:100,...extra});
 await billing('savePlan',{plan:plan('Platform Pro',{credits:10000,channels:['ai','whatsapp']})});
 await billing('assignPlan',{subscriberId:'agency',planId:'Platform Pro'});
 window.billingRole='admin';
 await billing('savePlan',{plan:plan('Client Starter',{tools:['crm-pipeline']})});
 await billing('savePlan',{plan:plan('Client Growth',{credits:500,tools:['crm-pipeline','ai-copilot']})});
 await billing('assignPlan',{subscriberId:'client',planId:'Client Starter'});
 await billing('savePlan',{plan:plan('Extra credits',{kind:'addon',addonType:'credits',credits:50})});
 await billing('savePlan',{plan:plan('AI unlock',{kind:'addon',addonType:'tool',addonTool:'ai-copilot'})});
 window.billingRole='super';
}
`;
const server = await createServer({configFile:false,cacheDir:'node_modules/.vite-billing-plans-test',plugins:[react(),{name:'billing-fixture',enforce:'pre',resolveId(source){if(/backend\/billing$/.test(source))return '\0billing-fixture'},load(id){if(id==='\0billing-fixture')return fixture},configureServer(vite){vite.middlewares.use('/__billing-plans',async(req,res)=>{res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml('/__billing-plans',`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:Arial"><div id="root"></div><script type="module">
import React from 'react';import{createRoot}from'react-dom/client';import{createMemoryRouter,RouterProvider}from'react-router-dom';import{Provider}from'react-redux';import{store}from'/src/store/index.ts';import i18n from'/src/i18n/i18n.ts';import{seed}from'/src/backend/billing';import{SuperAdminPlansPage,AdminPlansPage,UserPlansPage}from'/src/pages/billing/PlansPages.tsx';import '/src/components/layout/super-admin.css';
await seed();await i18n.changeLanguage('en');window.billingLanguage=l=>i18n.changeLanguage(l);
window.router=createMemoryRouter([{path:'/super-admin/plans',element:React.createElement('div',{className:'sa-content'},React.createElement(SuperAdminPlansPage))},{path:'/admin/plans',element:React.createElement(AdminPlansPage)},{path:'/dashboard/plans',element:React.createElement(UserPlansPage)}],{initialEntries:['/super-admin/plans']});createRoot(document.getElementById('root')).render(React.createElement(Provider,{store},React.createElement(RouterProvider,{router:window.router})));
</script></body></html>`))})}}],server:{host:'127.0.0.1',port:0}});
await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/__billing-plans');
 await page.getByRole('heading',{name:'Plans & credits',exact:true}).waitFor();
 fs.mkdirSync('artifacts/billing-plans',{recursive:true});
 const width=await page.locator('.sa-content > .bl').evaluate(e=>({page:e.clientWidth,parent:e.parentElement.clientWidth}));assert.ok(width.page>width.parent-80,JSON.stringify(width));
 const stats=await page.locator('.bl-stat').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert.equal(new Set(stats).size,1);
 for(const dark of [false,true]){
  await page.evaluate(d=>document.documentElement.classList.toggle('dark',d),dark);
  await page.getByRole('button',{name:'Add new plan',exact:true}).click();
  await page.getByRole('dialog').waitFor();assert.equal(await page.locator('.bl-section-head b').filter({hasText:'Tool access'}).count(),0);assert.equal(await page.getByText('Platform channel capabilities',{exact:true}).count(),1);
  await page.screenshot({path:'artifacts/billing-plans/platform-modal-'+(dark?'dark':'light')+'.png'});await page.getByRole('button',{name:'Cancel',exact:true}).click();
 }
 await page.evaluate(async()=>{window.billingRole='admin';await window.router.navigate('/admin/plans')});
 await page.getByRole('button',{name:'Add new plan',exact:true}).click();await page.locator('.bl-section-head b').filter({hasText:'Tool access'}).waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.evaluate(async()=>{window.billingRole='user';await window.router.navigate('/dashboard/plans')});
 await page.getByRole('heading',{name:'Plans & Pricing',exact:true}).waitFor();await page.getByRole('heading',{name:'Client Growth',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Platform Pro',exact:true}).count(),0);
 await page.getByRole('button',{name:'Upgrade plan',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Send request',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.ok(await page.evaluate(()=>[...window.billingRows.values()].some(r=>r.type==='plan'&&r.status==='pending')));
 await page.getByRole('tab',{name:/Add-ons/}).click();await page.locator('.bl-price-card').filter({has:page.getByRole('heading',{name:'Extra credits',exact:true})}).getByRole('button',{name:'Request add-on',exact:true}).click();
 await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Send request',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.ok(await page.evaluate(()=>[...window.billingRows.keys()].some(p=>p.startsWith('add_on_requests/'))));
 await page.getByRole('tab',{name:'Overview',exact:true}).click();
 for(const dark of [false,true]){await page.evaluate(d=>document.documentElement.classList.toggle('dark',d),dark);await page.screenshot({path:'artifacts/billing-plans/user-'+(dark?'dark':'light')+'.png',fullPage:true})}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.billingLanguage('ar'));await page.screenshot({path:'artifacts/billing-plans/user-mobile-rtl.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 assert.deepEqual(errors,[]);console.log('Billing UI passed: full-width stats, theme modals, Admin tools, tenant plans, upgrade, add-on collection, mobile RTL.');
}finally{await browser?.close();await server.close()}
