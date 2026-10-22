import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fixture = new URL('./fixtures/commerce-save-workspace.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-template-tests', optimizeDeps: { entries: ['tests/fixtures/commerce-save.html'] }, plugins: [react(), { name: 'mock-workspace', enforce: 'pre', resolveId(source) { if (/backend\/workspace$/.test(source)) return fixture; } }], server: { host: '127.0.0.1', port: 0 } });
console.log('Starting fixture server'); await server.listen(); console.log('Fixture server ready'); let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  console.log('Browser ready'); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  console.log('Loading fixture'); await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType:'text/css',body:''})); await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/commerce-save.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });


  const go=url=>page.evaluate(url=>window.__router.navigate(url),url);
  await page.route('https://preview.example.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><style>body{font-family:Arial;background:#f6f1ff;padding:36px;color:#41335c}h1{font-size:40px}</style></head><body><h1>External '+new URL(route.request().url()).pathname+'</h1><p>Complete rendered customer page.</p></body></html>'}));
  await page.evaluate(()=>{
    const product={...window.__newProduct(),id:'product-qa',name:'Private Strategy Session',type:'Service',image:'/dashboard/product-consultation.png',description:'Build a clear strategy for your next chapter.',config:window.__defaultConfig('Service','€150')};
    product.config.experience.shortDescription='A focused private session with an expert strategist.';
    product.config.experience.included=[{id:'plan',title:'Personal growth roadmap',enabled:true}];
    window.__seed('gos-commerce-products-v1:tenant-qa',[product]);
    const document=window.__createBuilderDocument('funnel','Preview Funnel','/dashboard/product-consultation.png',2);
    document.pages.forEach((page,index)=>{page.sections[0].content.title='Exact funnel page '+(index+1);});
    window.__seed('gos.assets.workspace.v1',{assets:[{id:'preview-funnel',kind:'funnel',name:'Preview Funnel',domain:'',image:'/dashboard/product-consultation.png',updated:'',description:'',settings:{seo:'',navigation:'',color:'#7253cf'},document}],domains:[]});
  });
  await go('/dashboard/products-payments/products/product-qa/edit?tab=funnel');
  const sales=page.getByRole('region',{name:'Sales page live preview',exact:true});
  const salesFrame=()=>sales.frameLocator('iframe[title="Sales page live preview"]');
  await salesFrame().getByRole('heading',{name:'Private Strategy Session',exact:true}).waitFor();
  console.log('Inline sales renderer ready'); assert.match(await salesFrame().locator('.lp-service-price').innerText(),/150/);
  assert.ok(await salesFrame().locator('.lp-service-hero h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>30));
  const select=async(name,option,scope=page)=>{await scope.getByRole('combobox',{name,exact:true}).click();await page.getByRole('option',{name:option,exact:true}).click();};
  await select('Sales page template','Video Sales Letter (VSL) Layout');
  await page.getByLabel('Sales video URL',{exact:true}).fill('https://preview.example.test/story.mp4');
  await salesFrame().locator('.cx-sales-video video').waitFor();assert.equal(await salesFrame().locator('video').getAttribute('src'),'https://preview.example.test/story.mp4');
  await select('Sales page template','Minimalist Clean Layout');await salesFrame().locator('.cx-sales-minimal').waitFor();
  await sales.getByRole('button',{name:'Mobile page preview',exact:true}).click();assert.equal(await sales.locator('iframe').evaluate(el=>el.style.width),'390px');
  await sales.getByRole('button',{name:'Expand Sales page live preview',exact:true}).click();
  const expanded=page.getByRole('dialog',{name:'Sales page live preview',exact:true});await expanded.waitFor();await expanded.frameLocator('iframe').getByRole('heading',{name:'Private Strategy Session',exact:true}).waitFor();await page.keyboard.press('Escape');await expanded.waitFor({state:'hidden'});
  await go('/dashboard/products-payments/products/product-qa/edit?tab=information'); await page.getByLabel('Service Name *',{exact:true}).fill('Updated Strategy Session'); await go('/dashboard/products-payments/products/product-qa/edit?tab=pricing'); await page.getByLabel('Price *',{exact:true}).fill('175'); await go('/dashboard/products-payments/products/product-qa/edit?tab=funnel'); await salesFrame().getByRole('heading',{name:'Updated Strategy Session',exact:true}).waitFor(); assert.match(await salesFrame().locator('.lp-service-price').innerText(),/175/);
  await select('Sales page template','Custom External URL');await page.getByLabel('Custom sales page URL',{exact:true}).fill('https://preview.example.test/sales-one');
  await sales.frameLocator('iframe').getByRole('heading',{name:'External /sales-one',exact:true}).waitFor();
  await page.getByLabel('Custom sales page URL',{exact:true}).fill('https://preview.example.test/sales-two');await sales.frameLocator('iframe').getByRole('heading',{name:'External /sales-two',exact:true}).waitFor();
  await page.getByLabel('Custom sales page URL',{exact:true}).fill('javascript:alert(1)');await page.waitForTimeout(450);assert.equal(await sales.locator('iframe').count(),0);
  await select('Sales page template','High-Converting Hero Sales Page');
  console.log('Built-in and external sales previews passed'); await select('Connected project funnel',/Preview Funnel/);
  const options=await page.getByRole('combobox',{name:'Connected funnel page',exact:true});await options.click();const second=page.getByRole('option').nth(2);const secondName=await second.innerText();await second.click();
  const funnel=page.getByRole('region',{name:'Connected funnel preview',exact:true});const ff=funnel.frameLocator('iframe');
  await ff.getByRole('heading',{name:'Exact funnel page 2',exact:true}).waitFor();assert.equal(await ff.locator('[data-commerce-product="product-qa"] .lp-service-hero').count(),1);
  await page.screenshot({path:'tests/workspace-funnel-preview.png',fullPage:true});
  const previewLink=page.getByRole('link',{name:'Preview Product',exact:true});const href=await previewLink.getAttribute('href');await previewLink.evaluate(a=>{a.addEventListener('click',event=>event.preventDefault(),{once:true});a.click();});
  await go(href);await page.getByRole('button',{name:'Discard changes',exact:true}).click();await page.getByRole('heading',{name:'Exact funnel page 2',exact:true}).waitFor();assert.equal(await page.locator('[data-commerce-product="product-qa"] .lp-service-hero').count(),1);
  console.log('Exact funnel layout passed'); await go('/dashboard/products-payments/products/product-qa/edit?tab=checkout');
  const settings=page.locator('.cw-card').filter({has:page.getByRole('heading',{name:'Checkout Settings',exact:true})});await settings.getByRole('button',{name:'Advanced settings',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Checkout options',exact:true});await modal.waitFor();
  const thank=modal.getByRole('region',{name:'Thank-you page live preview',exact:true});const tf=()=>thank.frameLocator('iframe');
  await tf().getByRole('heading',{name:'Thank you for your order.',exact:true}).waitFor();
  await select('Thank-you page template','Template 2 · Next steps & onboarding',modal);await tf().getByRole('heading',{name:'Your next chapter starts here.',exact:true}).waitFor();
  await select('Thank-you page template','Template 3 · Video greeting & community',modal);await modal.getByLabel('Welcome video URL',{exact:true}).fill('https://preview.example.test/welcome.mp4');await modal.getByLabel('Community link',{exact:true}).fill('https://preview.example.test/community');await tf().getByRole('heading',{name:'Welcome to the community.',exact:true}).waitFor();assert.equal(await tf().getByRole('link',{name:'Join the community',exact:true}).getAttribute('href'),'https://preview.example.test/community');
  await select('Thank-you page template','Custom External URL',modal);await modal.getByLabel('Custom thank-you URL',{exact:true}).fill('https://preview.example.test/thanks');await thank.frameLocator('iframe').getByRole('heading',{name:'External /thanks',exact:true}).waitFor();
  await modal.getByRole('link',{name:'Preview Terms of Service',exact:true}).click();
  const terms=page.getByRole('dialog',{name:'Terms of Service',exact:true});await terms.getByRole('heading',{name:'Your purchase',exact:true}).waitFor();await page.keyboard.press('Escape');await terms.waitFor({state:'hidden'});await modal.waitFor();
  await select('Terms policy source','Custom Policy URL',modal);await modal.getByLabel('Terms URL',{exact:true}).fill('https://preview.example.test/terms');await modal.getByRole('link',{name:'Preview Terms of Service',exact:true}).click();await terms.frameLocator('iframe').getByRole('heading',{name:'External /terms',exact:true}).waitFor();await terms.getByRole('button',{name:'Close page preview',exact:true}).click();
  await modal.getByRole('link',{name:'Preview Privacy Policy',exact:true}).click();const privacy=page.getByRole('dialog',{name:'Privacy Policy',exact:true});await privacy.getByRole('heading',{name:'Information collected',exact:true}).waitFor();await privacy.getByRole('button',{name:'Close page preview',exact:true}).click();
  await modal.getByRole('switch',{name:'Require terms agreement',exact:true}).check();await modal.getByRole('button',{name:'Apply to draft',exact:true}).click();
  await page.getByRole('link',{name:'Terms',exact:true}).click();await terms.frameLocator('iframe').getByRole('heading',{name:'External /terms',exact:true}).waitFor();await terms.getByRole('button',{name:'Close page preview',exact:true}).click();
  await page.getByRole('link',{name:'Privacy policy',exact:true}).click();await privacy.getByRole('heading',{name:'Information collected',exact:true}).waitFor();await privacy.getByRole('button',{name:'Close page preview',exact:true}).click();
  await go('/dashboard/products-payments/products/product-qa/edit?tab=funnel'); await page.setViewportSize({width:390,height:844}); const mobileCard=page.getByRole('region',{name:'Sales page live preview',exact:true}); await mobileCard.getByRole('button',{name:'Mobile page preview',exact:true}).click(); await mobileCard.frameLocator('iframe').getByRole('heading',{name:'Private Strategy Session',exact:true}).waitFor(); await mobileCard.scrollIntoViewIfNeeded(); await page.screenshot({path:'tests/workspace-preview-mobile.png',fullPage:true}); assert.equal(await mobileCard.evaluate(el=>el.clientWidth>200 && el.scrollWidth<=el.clientWidth+1),true);
  await page.evaluate(()=>{
    const products=['Service','Course','Digital Product'].map((type,index)=>({...window.__newProduct(),id:index===0?'product-qa':'smoke-'+index,name:type+' Preview',type,config:window.__defaultConfig(type,'€59')}));
    products[1].config.modules=[{id:'module',title:'Preview curriculum',lessons:[{id:'lesson',title:'Welcome lesson',kind:'Text',duration:'5 min',url:''}]}];
    window.__seed('gos-commerce-products-v1:tenant-qa',products);
  });
  for(const [id,title,selector] of [['smoke-1','Course Preview','.lp-course-hero'],['smoke-2','Digital Product Preview','.lp-digital-showcase']]){
    await go('/dashboard/products-payments/products/'+id+'/edit?tab=funnel');await page.waitForFunction(id=>window.__router.state.location.pathname.includes(id)||document.body.innerText.includes('Discard changes'),id);const discard=page.getByRole('button',{name:'Discard changes',exact:true});if(await discard.count())await discard.click();
    const frame=page.getByRole('region',{name:'Sales page live preview',exact:true}).frameLocator('iframe'); await frame.locator(selector).waitFor(); await frame.getByRole('heading',{name:title,exact:true}).waitFor();
  }
  assert.equal(await page.evaluate(()=>window.__writes.length),0);assert.deepEqual(errors,[]);
  console.log('Passed: all built-in sales/thank-you layouts, draft data, desktop/mobile/expand, custom URL updates and validation, exact funnel canvas, editor/checkout default and custom policies, nested Escape, no repository writes.');
} catch(error) { console.error(error); await browser?.contexts()[0]?.pages()[0]?.screenshot({path:'tests/page-preview-failure.png',fullPage:true}).catch(()=>{}); process.exitCode=1; } finally { await browser?.close(); await Promise.race([server.close(),new Promise(resolve=>setTimeout(resolve,3000))]);process.exit(process.exitCode||0); }
