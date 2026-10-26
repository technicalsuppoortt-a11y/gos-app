import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { preview } from 'vite';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.addInitScript(() => { sessionStorage.setItem('gos.demo-account.active','1'); localStorage.setItem('user_selected_lang','en'); localStorage.setItem('i18nextLng','en'); localStorage.setItem('theme','light'); });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.goto(`${origin}/dashboard`, { waitUntil: 'domcontentloaded' });
  const trigger = page.getByRole('button', { name: 'Open help center', exact: true }).filter({ visible: true });
  await trigger.waitFor({ timeout: 120000 });
  assert.equal(await page.locator('.layout-brand img[src="/upclick-mark.svg"]').filter({ visible: true }).count(),1);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'How can we help?' });
  await dialog.waitFor();
  assert.equal(await page.locator('dialog:modal').count(),1);
  assert.equal(await dialog.locator('article').count(),3);
  assert.equal(await dialog.locator('a[href^="mailto:"]').count(),1);
  await dialog.getByText('How do I invite my team?', { exact:true }).click();
  assert.equal(await dialog.locator('details').first().getAttribute('open'),'');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.querySelector('.upclick-help').contains(document.activeElement)),true);
  await page.keyboard.press('Escape'); await dialog.waitFor({ state:'hidden' });
  await page.getByRole('button', { name:'View guides', exact:true }).filter({ visible:true }).click();
  await dialog.getByRole('link', { name:'Open workspace' }).nth(1).click();
  await page.waitForURL('**/dashboard/booking');
  await trigger.click();
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  assert.equal(await dialog.evaluate(el => getComputedStyle(el).backgroundColor),'rgb(15, 23, 42)');
  await page.screenshot({path:'tests/upclick-help-desktop.png'});
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button', {name:/menu|navigation/i}).filter({visible:true}).first().click();
  await trigger.click(); await dialog.waitFor();
  assert.ok(await dialog.evaluate(el=>el.getBoundingClientRect().width)<=390);
  await page.screenshot({path:'tests/upclick-help-mobile.png'});
  const arabic = await browser.newPage({ viewport: { width:390, height:844 } });
  arabic.setDefaultTimeout(15000);
  await arabic.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType:'text/css', body:'' }));
  await arabic.addInitScript(() => { sessionStorage.setItem('gos.demo-account.active','1'); localStorage.setItem('user_selected_lang','ar'); localStorage.setItem('i18nextLng','ar'); localStorage.setItem('theme','light'); });
  await arabic.goto(`${origin}/dashboard`, { waitUntil:'domcontentloaded' });
  await arabic.locator('.layout-menu-button').click();
  await arabic.locator('.layout-mobile-sidebar .layout-help-card>button').first().click();
  const arDialog=arabic.getByRole('dialog', {name:'كيف يمكننا مساعدتك؟'}); await arDialog.waitFor();
  assert.equal(await arDialog.getAttribute('dir'),'rtl');
  assert.ok(await arDialog.getByRole('heading',{name:'كيف يمكننا مساعدتك؟'}).count());
  await arabic.screenshot({path:'tests/upclick-help-arabic.png'}); await arabic.close();
  // Rasterize the vector install icon at the manifest's declared sizes.
  for (const size of [192,512]) {
    const data = await page.evaluate(async size => {
      const image = new Image(); image.src='/app-icon.svg'; await image.decode();
      const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
      canvas.getContext('2d').drawImage(image,0,0,size,size);return canvas.toDataURL('image/png').split(',')[1];
    },size);
    await fs.writeFile(`public/app-icon-${size}.png`,Buffer.from(data,'base64'));
  }
  assert.deepEqual(errors,[]);
  console.log('Upclick: drawer content, FAQs, focus containment, Escape, guide navigation, dark mode and mobile sizing passed. Install icons generated.');
} catch(error) { console.error(error); throw error; }
finally { await browser?.close(); server.httpServer.closeAllConnections(); await new Promise(resolve => server.httpServer.close(resolve)); }
