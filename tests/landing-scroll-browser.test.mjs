import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {createServer} from 'vite';
const {chromium}=createRequire(import.meta.url)('C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const server=await createServer({configFile:path.resolve('vite.config.ts'),server:{host:'127.0.0.1',port:0}});
await server.listen();
const port=server.httpServer.address().port;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
for(const width of [1440,390]){
const page=await browser.newPage({viewport:{width,height:900}});
const errors=[];
const consoleErrors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
await page.addInitScript(()=>localStorage.setItem('i18nextLng','en'));
await page.route(/https:\/\/(connect\.facebook\.net|www\.googletagmanager\.com|www\.google-analytics\.com|www\.facebook\.com)\//,r=>r.fulfill({body:'',contentType:'text/javascript'}));
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
await page.goto('http://localhost:'+port+'/');
await page.locator('.lp-scroll-ready').waitFor({timeout:60000});
await page.waitForTimeout(1500);
assert.equal(await page.locator('.lp-badge > i,.wl-index i,header.wl-chapter,.lp-vs,#wl-step-7,#how').count(),0,'Removed sections and legacy badges stay absent');
assert.deepEqual(
 await page.locator('.lp main > section').evaluateAll(nodes=>nodes.map(n=>n.id)),
 ['top','problem','solution','ai-demo','compare','white-label','plan-faq','results'],
 'Main landing sections match upgraded architecture with plan-faq and results last'
);
assert.equal(await page.locator('.lp-header--arch').count(),1,'Architectural header renders');
assert.equal(await page.locator('.lp-header__inner').evaluate(el=>getComputedStyle(el).borderRadius),'0px','Header shell is non-pill');
if(width===1440){
 assert.equal(await page.locator('.lp-header__nav').evaluate(el=>getComputedStyle(el).borderRadius),'0px','Desktop nav bar is non-pill');
}
assert.equal(await page.locator('#wl-arch-tablist [role="tab"]').count(),5,'Five horizontal White-Label Architecture tabs render');
assert.equal(await page.locator('#white-label .lp-hbar').count(),5,'Five tab panels exist inside unified White-Label section');
assert.ok(await page.locator('#wl-bar-4 .lp-pay-brand').count()>=10,'Authentic payment gateway brands render');
assert.equal(await page.locator('#compare .lp-how__banner .lp-cmp-row').count(),12,'Compare table renders 12 platform tools inside How It Works atmosphere');
const last=page.locator('#results .lp-draw').last();
assert.equal(await last.evaluate(n=>n.classList.contains('is-drawn')),false,'Offscreen content stays pending before scrolling');
for(const section of await page.locator('.lp main > section').all()){
 await section.scrollIntoViewIfNeeded();
 for(const block of await section.locator('.lp-draw').all()){
 if(!await block.isVisible())continue;
 await block.evaluate(n=>n.scrollIntoView({block:"center",behavior:"instant"}));
 try { await page.waitForFunction(n=>n.classList.contains('is-drawn'),await block.elementHandle(),{timeout:5000}); } catch(e) {console.log(await block.evaluate(n=>({tag:n.tagName,cls:n.className,rect:n.getBoundingClientRect().toJSON()}))); throw e;}
 }
}
if(width===1440){
 const effectiveScaleX=selector=>page.locator(selector).evaluate(el=>{
  const cs=getComputedStyle(el);
  const sc=cs.scale&&cs.scale!=='none'?parseFloat(cs.scale.split(' ')[0]):1;
  const m=cs.transform&&cs.transform!=='none'?new DOMMatrixReadOnly(cs.transform).a:1;
  return Math.round(sc*m*100)/100;
 });
 // Verify LTR arrow direction first
 assert.equal(await effectiveScaleX('.lp-transform-bridge__arrow'),1,'Hero bridge arrow points right (+1) in LTR');
 assert.equal(await effectiveScaleX('#wl-arch-prev svg'),1,'Prev chevron unflipped in LTR');
 assert.equal(await effectiveScaleX('#wl-arch-next svg'),1,'Next chevron unflipped in LTR');

 // Verify authentic original section designs inside each of the 5 tabs
 await page.locator('#wl-arch-tab-0').click();
 assert.equal(await page.locator('#wl-bar-1').evaluate(el=>el.classList.contains('is-active')),true);
 assert.equal(await page.locator('#wl-bar-1 .wl-product__grid .wl-tool').count(),8,'Tab 01 preserves 8 product cards');
 assert.equal(await page.locator('#wl-bar-1 .wl-art').count(),8,'Tab 01 preserves 8 custom illustrations');

 await page.locator('#wl-arch-tab-1').click();
 assert.equal(await page.locator('#wl-bar-2').evaluate(el=>el.classList.contains('is-active')),true);
 assert.equal(await page.locator('#wl-bar-2 .wl-hub__core .wl-hub__disc').count(),1,'Tab 02 preserves central hub disc');
 assert.equal(await page.locator('#wl-bar-2 .wl-hub__node').count(),4,'Tab 02 preserves 4 connected infrastructure nodes');

 await page.locator('#wl-arch-tab-2').click();
 assert.equal(await page.locator('#wl-bar-3').evaluate(el=>el.classList.contains('is-active')),true);
 assert.equal(await page.locator('#wl-bar-3 .wl-brand__features li').count(),4,'Tab 03 preserves 4 feature rows');
 assert.equal(await page.locator('#wl-bar-3 .wl-brand__url .wl-typing').count(),1,'Tab 03 preserves typing SSL URL visual');
 assert.equal(await page.locator('#wl-bar-3 .wl-brand__toggle').count(),1,'Tab 03 preserves Light/Dark theme switch visual');
 assert.equal(await page.locator('#wl-bar-3 .wl-brand__tile').count(),1,'Tab 03 preserves branded PWA app icon tile');

 await page.locator('#wl-arch-tab-3').click();
 assert.equal(await page.locator('#wl-bar-4').evaluate(el=>el.classList.contains('is-active')),true);
 assert.equal(await page.locator('#wl-bar-4 .wl-commerce__grid .wl-panel').count(),2,'Tab 04 preserves 2-panel commercial layout');
 assert.equal(await page.locator('#wl-bar-4 .wl-plans li').count(),3,'Tab 04 preserves 3 plan cards');
 assert.ok(await page.locator('#wl-bar-4 .wl-gateways .lp-pay-brand').count()>=10,'Tab 04 preserves gateway brand cards');

 await page.locator('#wl-arch-tab-4').click();
 assert.equal(await page.locator('#wl-bar-5').evaluate(el=>el.classList.contains('is-active')),true);
 assert.equal(await page.locator('#wl-bar-5 .wl-timeline__rail').count(),1,'Tab 05 preserves timeline connecting rail');
 assert.equal(await page.locator('#wl-bar-5 .wl-timeline__arrows svg').count(),3,'Tab 05 preserves 3 timeline step arrows');
 assert.equal(await page.locator('#wl-bar-5 .wl-timeline .wl-timeline__item').count(),4,'Tab 05 preserves 4 numbered timeline cards');
 assert.equal(await page.locator('#wl-bar-5 .wl-launch__chips li').count(),3,'Tab 05 preserves 3 bottom action pills');

 for(const ch of ['whatsapp','messenger','instagram','webchat']){
  await page.locator('#lp-demo-channel-'+ch).click();
  assert.equal(await page.locator('#ai-demo .lp-phone').getAttribute('data-channel'),ch);
 }
 assert.equal(await page.locator('.lp-transform-bridge').count(),1,'Hero directional transformation bridge exists');
 const morphDuration=await page.locator('.lp-url-morph-stack > span').first().evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration));
 assert.ok(morphDuration>=0.9,'Brand URL morph transition is smooth and slow ('+morphDuration+'s)');
 assert.equal(await page.locator('.lp-wl-mock').getAttribute('data-brand'),'orbit');
 await page.locator('.lp-transform-swatch').nth(1).click();
 assert.equal(await page.locator('.lp-wl-mock').getAttribute('data-brand'),'nova');
 await page.locator('#lp-header-book').click();
 await page.locator('#lp-trial-modal-title').waitFor();
 for(const inputId of ['#lp-trial-f-alpha','#lp-trial-f-beta','#lp-trial-f-gamma','#lp-trial-f-delta']){
  assert.equal(await page.locator(inputId).getAttribute('autocomplete'),'off','Autofill suppressed on '+inputId);
  assert.equal(await page.locator(inputId).getAttribute('data-lpignore'),'true',' Autofill ignore set on '+inputId);
 }
 await page.locator('#lp-trial-submit').click();
 assert.ok(await page.locator('.lp-trial-field__err').count()>=3,'Admin trial modal validates required fields');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#lp-trial-modal-title').count(),0,'Escape closes Admin trial modal');

 // Switch to Arabic (RTL) and verify every directional arrow flips ONCE (-1) with no double-flip!
 await page.locator('#lp-lang-toggle').click();
 await page.locator('.global-language-menu button[lang="ar"]').click();
 await page.waitForFunction(()=>document.querySelector('.lp')?.getAttribute('dir')==='rtl');
 const beforeBox=await page.locator('.lp-mock').boundingBox();
 const afterBox=await page.locator('.lp-wl-mock').boundingBox();
 assert.ok(beforeBox.x>afterBox.x,'In RTL, Upklick dashboard is on the right and Brand dashboard is on the left');
 assert.equal(await effectiveScaleX('.lp-transform-bridge__arrow'),-1,'In RTL, center transformation arrow flips left (-1) toward Brand dashboard');
 assert.equal(await effectiveScaleX('.lp-transform-bridge__url-arrow'),-1,'In RTL, bridge URL flow arrow flips left (-1)');
 assert.equal(await effectiveScaleX('#lp-header-book svg'),-1,'In RTL, header CTA arrow flips left (-1)');
 assert.equal(await effectiveScaleX('#lp-hero-book svg'),-1,'In RTL, hero CTA arrow flips left (-1)');
 assert.equal(await effectiveScaleX('#wl-arch-prev svg'),-1,'In RTL, Prev chevron flips right (-1 on ChevronLeft) toward earlier tabs');
 assert.equal(await effectiveScaleX('#wl-arch-next svg'),-1,'In RTL, Next chevron flips left (-1 on ChevronRight) toward later tabs');
 assert.equal(await effectiveScaleX('#wl-bar-5 .wl-timeline__arrows svg >> nth=0'),-1,'In RTL, Launch timeline step arrows flip left (-1)');
 const prevBox=await page.locator('#wl-arch-prev').boundingBox();
 const nextBox=await page.locator('#wl-arch-next').boundingBox();
 assert.ok(prevBox.x>nextBox.x,'In RTL, Previous button sits to the right of Next button');
 await page.locator('#wl-arch-tab-0').click();
 await page.locator('#wl-arch-next').click();
 assert.equal(await page.locator('#wl-bar-2').evaluate(el=>el.classList.contains('is-active')),true,'Clicking Next in RTL advances from Tab 01 to Tab 02');
 await page.locator('#wl-arch-prev').click();
 assert.equal(await page.locator('#wl-bar-1').evaluate(el=>el.classList.contains('is-active')),true,'Clicking Prev in RTL returns from Tab 02 to Tab 01');

 const arBodyText=await page.locator('.lp > main').innerText();
 assert.doesNotMatch(arBodyText,/\b(إزاي|ازاي|عشان|علشان|دلوقتي|بتاعتك|بتاعك|بيشتغل|هتقدر|مايروحش|مبيعاتك هتزيد)\b/,'Arabic copy uses Modern Standard Arabic without Egyptian dialect');
 await page.locator('#lp-lang-toggle').click();
 await page.locator('.global-language-menu button[lang="en"]').click();
 await page.waitForFunction(()=>document.querySelector('.lp')?.getAttribute('dir')==='ltr');
}
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.emulateMedia({reducedMotion:'reduce'});
assert.equal(await last.evaluate(n=>getComputedStyle(n).animationName),'none');
await page.emulateMedia({media:'print'});
assert.equal(await last.evaluate(n=>getComputedStyle(n).opacity),'1');
assert.deepEqual(errors,[]);
await page.close();
console.log('PASS scroll reveal, architectural header, horizontal tabs, slow brand URL morph, MSA Arabic, no overflow at '+width);
}

// End-to-end localhost Free Trial Admin signup verification (Image 5 regression guard)
const signupPage=await browser.newPage({viewport:{width:1440,height:900}});
const signupErrors=[];
const corsErrors=[];
signupPage.on('pageerror',e=>signupErrors.push(e.message));
signupPage.on('console',msg=>{
 if(msg.type()==='error'&&/CORS|Access-Control-Allow-Origin|ERR_FAILED/i.test(msg.text())){
  corsErrors.push(msg.text());
 }
});
await signupPage.addInitScript(()=>localStorage.setItem('i18nextLng','en'));
await signupPage.route(/https:\/\/(connect\.facebook\.net|www\.googletagmanager\.com|www\.google-analytics\.com|www\.facebook\.com)\//,r=>r.fulfill({body:'',contentType:'text/javascript'}));
await signupPage.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
// Simulate undeployed Cloud Function returning 404 through Vite same-origin proxy
await signupPage.route('**/api-functions/registerTrialAdmin',r=>r.fulfill({status:404,contentType:'text/plain',body:'Not Found'}));
await signupPage.goto('http://localhost:'+port+'/');
await signupPage.locator('#lp-header-book').click();
await signupPage.locator('#lp-trial-modal-title').waitFor();
await signupPage.locator('#lp-trial-f-alpha').fill('Osama Hassen');
await signupPage.locator('#lp-trial-f-beta').fill('Orbit');
await signupPage.locator('#lp-trial-f-gamma').fill('or@orbit.com');
await signupPage.locator('#lp-trial-f-delta').fill('+13915898423');
await signupPage.locator('#lp-trial-f-secret').fill('OrbitAdmin2026!');
await signupPage.locator('#lp-trial-submit').click();
await signupPage.locator('.adm-shell').waitFor({timeout:45000});
assert.match(signupPage.url(),/\/admin\//,'Navigated into Admin workspace');
const adminText=await signupPage.locator('.adm-shell').innerText();
assert.doesNotMatch(adminText,/Subscription Required/i,'Admin workspace is unlocked with active Free Trial');
assert.match(adminText,/Orbit/,'Admin workspace displays custom brand name');
assert.deepEqual(corsErrors,[],'Zero CORS errors during localhost Admin trial registration');
assert.deepEqual(signupErrors,[]);
await signupPage.close();
console.log('PASS localhost Free Trial Admin signup -> unlocked /admin workspace with zero CORS errors');
}finally{await browser.close();await server.close();}
