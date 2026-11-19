import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {landingPreviewPlugin} from '../scripts/landing-preview-plugin.ts';
const {chromium}=createRequire(import.meta.url)('C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const server=await createServer({configFile:false,plugins:[landingPreviewPlugin(),react()],server:{host:'127.0.0.1',port:0}});
await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
for(const width of [1440,390]){
const page=await browser.newPage({viewport:{width,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('i18nextLng','en'));
await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/');
await page.locator('.lp-scroll-ready').waitFor({timeout:60000});
await page.waitForTimeout(3000);
assert.equal(await page.locator('.lp-badge > i,.wl-index i').count(),0);
assert.deepEqual(await page.locator('.wl > section').evaluateAll(nodes=>nodes.map(n=>n.id)),[1,2,6,3,4,5,7,8,9,10].map(n=>'wl-step-'+n));
const last=page.locator('.wl-final .lp-draw').first();
assert.equal(await last.evaluate(n=>n.classList.contains('is-drawn')),false,'Offscreen content stays pending after the old timer');
for(const section of await page.locator('.lp main section').all()){
 await section.scrollIntoViewIfNeeded();
 for(const block of await section.locator('.lp-draw').all()){
 if(!await block.isVisible())continue;
 await block.evaluate(n=>n.scrollIntoView({block:"center",behavior:"instant"}));
 try { await page.waitForFunction(n=>n.classList.contains('is-drawn'),await block.elementHandle(),{timeout:5000}); } catch(e) {console.log(await block.evaluate(n=>({tag:n.tagName,cls:n.className,rect:n.getBoundingClientRect().toJSON()}))); throw e;}
 }
}
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.emulateMedia({reducedMotion:'reduce'});
assert.equal(await last.evaluate(n=>getComputedStyle(n).animationName),'none');
await page.emulateMedia({media:'print'});
assert.equal(await last.evaluate(n=>getComputedStyle(n).opacity),'1');
assert.deepEqual(errors,[]);
await page.close();
console.log('PASS scroll reveal, preserved sections, order, no overflow, reduced motion and print at '+width);
}
}finally{await browser.close();await server.close();}


