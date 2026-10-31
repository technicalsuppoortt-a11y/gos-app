import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const server=await createServer({server:{host:'127.0.0.1',port:0}}); await server.listen();
let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1100,height:750}});
 const errors=[]; page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/modal-selects.html`);
 await page.getByRole('combobox',{name:'Pipeline',exact:true}).click();
 await page.getByRole('option',{name:'Sales pipeline',exact:true}).click();
 await page.getByRole('combobox',{name:'Initial stage',exact:true}).click();
 await page.getByRole('option',{name:'Qualified',exact:true}).click();
 const saved=await page.getByTestId('route').textContent();
 assert.equal(JSON.parse(saved).pipelineId,'sales');
 assert.equal(JSON.parse(saved).stageId,'QUALIFIED');
 for(const dark of [false,true]) {
  await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
  for(const prefix of ['Modal','Native']) {
   if(prefix==='Native') await page.getByRole('button',{name:'Native dialog',exact:true}).click();
   for(const kind of ['Asset','Commerce','Shared','Admin','Search','Booking','CRM']) {
    const trigger=page.getByRole('combobox',{name:`${prefix} ${kind}`,exact:true});
    await trigger.click();
    const panel=page.getByRole('listbox'); await panel.waitFor();
    assert.equal(await panel.evaluate(node=>!!node.closest('.form-modal-body')),false,'listbox must escape modal overflow');
    assert.equal(await panel.evaluate(node=>!!node.closest('dialog')),prefix==='Native','native controls stay in the browser top layer');
    const option=page.getByRole('option',{name:'Option 01',exact:true});
    await option.scrollIntoViewIfNeeded();
    assert.equal(await option.evaluate(node=>{const r=node.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&node.contains(hit);}),true,`${prefix} ${kind} option must be above the modal`);
    const bounds=await panel.boundingBox();
    assert.ok(bounds.y>=0 && bounds.y+bounds.height<=752,`${kind} must fit the viewport`);
    await option.click();
    await trigger.click(); await page.keyboard.press('Escape');
    await panel.waitFor({state:'hidden'});
    assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
   }
   if(prefix==='Native') await page.getByRole('button',{name:'Close native'}).click();
  }
 }
 assert.equal(await page.getByTestId('route').textContent(),saved);
 assert.deepEqual(errors,[]);
 console.log('CRM routing state preserved; seven shared dropdowns escape clipped high-layer modals and native dialogs in both themes, with hit testing, scrolling, collision positioning and Escape focus restoration.');
} finally {await browser?.close();await server.close();}
