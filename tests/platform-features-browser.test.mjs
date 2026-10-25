import { landingPreviewPlugin } from '../scripts/landing-preview-plugin.ts';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fixture = new URL('./fixtures/commerce-save-workspace.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-platform-features', optimizeDeps: { entries: ['tests/fixtures/platform-features.html'] }, plugins: [landingPreviewPlugin(), react(), { name: 'feature-transport', enforce: 'pre', resolveId(source, importer) { if (/backend\/workspace$/.test(source) || source === './workspace' && importer?.replaceAll('\\','/').includes('/src/backend/')) return fixture; }, transform(source, id) { if (/src\/backend\/(marketingTracking|paymentMethods)\.ts$/.test(id.replaceAll('\\','/'))) return source.replaceAll("from 'firebase/firestore'", "from '/tests/fixtures/platform-feature-transport'").replaceAll("from './firebase'", "from '/tests/fixtures/platform-feature-transport'"); } }], server: { host: '127.0.0.1', port: 0 } });
await server.listen(); let browser;
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error('PAGE ERROR:', e.message); }); page.on('console', e => { if (e.type() === 'error') console.error('BROWSER:', e.text()); });
  await page.route(/https:\/\/(fonts.googleapis.com|connect.facebook.net|www.googletagmanager.com)\//, route => route.fulfill({ body: '', contentType: 'text/javascript' }));
  const url = `http://127.0.0.1:${server.httpServer.address().port}/tests/fixtures/platform-features.html`;
  console.log('Opening feature fixture'); await page.goto(url, {waitUntil:'domcontentloaded', timeout:60000}); console.log('Fixture opened'); await page.getByRole('heading', { name: 'Marketing Tracking', exact: true }).waitFor({timeout:120000});
  console.log('Testing install flow'); await page.getByRole('button', { name: 'Get App', exact: true }).click();
  await page.getByRole('dialog').waitFor(); await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.getByRole('button', { name: 'Get App', exact: true }).evaluate(el => el === document.activeElement), true);
  await page.evaluate(() => { window.deferredPWAInstallPrompt = { prompt: async () => { window.__prompted = true; }, userChoice: Promise.resolve({ outcome: 'accepted' }) }; dispatchEvent(new Event('pwa-prompt-ready')); });
  await page.getByRole('button', { name: 'Get App', exact: true }).click(); await page.getByRole('button', { name: 'Install Now' }).click();
  assert.equal(await page.evaluate(() => window.__prompted), true);
  await page.evaluate(() => dispatchEvent(new Event('appinstalled'))); assert.equal(await page.getByRole('button', { name: 'Get App', exact: true }).count(), 0);
  console.log('Testing tracking'); await page.getByRole('button', { name: 'Connect Accounts', exact: true }).first().click();
  await page.getByLabel('Meta Pixel ID', { exact: true }).fill('<script>bad</script>'); await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: '10–16 digits' }).waitFor(); assert.equal(await page.locator('#gos-meta-pixel').count(), 0);
  await page.getByLabel('Meta Pixel ID', { exact: true }).fill('123456789012345'); await page.getByLabel('GA4 Measurement ID', { exact: true }).fill('G-TEST1234'); await page.getByRole('switch', { name: 'Enable tracking', exact: true }).click(); await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await page.waitForFunction(() => !!document.getElementById('gos-meta-pixel') && !!document.getElementById('gos-ga4'));
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); assert.equal(await page.locator('#gos-meta-pixel').count(), 1);
  const queuedBeforeTest = await page.evaluate(() => window.fbq?.queue?.length);
  await page.getByRole('button', { name: 'Test Center', exact: true }).click(); await page.getByRole('button', { name: 'Purchase', exact: true }).click(); await page.getByRole('button', { name: 'Realtime', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'Purchase' }).filter({ hasText: 'Local test' }).waitFor();
  assert.equal(await page.evaluate(() => window.fbq?.queue?.length), queuedBeforeTest);
  for (const name of ['Funnels', 'Analytics', 'Health Check', 'Debug Logs', 'AI Optimization', 'Advanced', 'Event Library', 'Event SDK', 'Overview']) await page.getByRole('button', { name, exact: true }).first().click();
  console.log('Testing payment settings'); await page.getByRole('link', { name: 'Billing', exact: true }).click();
  await page.getByRole('button', { name: 'Bank Transfer', exact: true }).click();
  await page.getByLabel('Transfer account / wallet number', { exact: true }).fill('EG-ACCOUNT-123'); await page.getByLabel('Customer instructions', { exact: true }).fill('Include your order reference'); if (await page.getByRole('switch', { name: 'Enable payment method', exact: true }).getAttribute('aria-checked') !== 'true') await page.getByRole('switch', { name: 'Enable payment method', exact: true }).click();
  await page.evaluate(() => { window.__saveFail = true; });
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); await page.getByRole('dialog').getByRole('alert').waitFor(); assert.equal(await page.getByLabel('Transfer account / wallet number', { exact: true }).inputValue(), 'EG-ACCOUNT-123');
  await page.evaluate(() => { window.__saveFail = false; });
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await mkdir('artifacts/platform-features', {recursive:true}); await page.locator('.pm-methods').screenshot({path:'artifacts/platform-features/payment-methods.png'});
  console.log('Testing provider-specific gateway credentials');
  const cases = [
    { card: 'Stripe', fields: { 'Publishable Key': 'pk_test_example', 'Secret Key': 'sk_test_private', 'Webhook Secret (optional)': 'whsec_private' } },
    { card: 'PayPal', fields: { 'Client ID': 'paypal-client', 'Client Secret': 'paypal-private' } },
    { card: 'PayTabs', fields: { 'Profile ID': '12345', 'Server Key': 'paytabs-private' } },
    { card: 'Fawry / Kashier', fields: { 'Merchant Code': 'merchant-example', 'Secure Key': 'fawry-private' } },
    { card: 'Fawry / Kashier', provider: 'kashier', fields: { 'Merchant ID': 'MID-example', 'Payment API Key': 'payment-private', 'Secret API Key': 'kashier-private' } },
  ];
  for (const entry of cases) {
    await page.locator('.pm-gateway-card').filter({ has: page.locator('b', { hasText: entry.card }) }).getByRole('button').click();
    const dialog = page.getByRole('dialog');
    if (entry.provider) await dialog.getByLabel('Provider', { exact: true }).selectOption(entry.provider);
    await dialog.getByLabel(Object.keys(entry.fields)[0], { exact: true }).waitFor();
    assert.equal(await dialog.getByLabel('Customer instructions', { exact: true }).count(), 0);
    assert.equal(await dialog.getByLabel('Merchant account reference', { exact: true }).count(), 0);
    await dialog.getByLabel('Account label', { exact: true }).fill(`Business ${entry.provider ?? entry.card}`);
    for (const [label, value] of Object.entries(entry.fields)) await dialog.getByLabel(label, { exact: true }).fill(value);
    if (entry.card === 'PayPal') await dialog.getByLabel('Mode', { exact: true }).selectOption('live');
    if (entry.card === 'PayTabs') await dialog.getByLabel('PayTabs region', { exact: true }).selectOption('EGY');
    if (entry.card === 'Stripe') {
      await page.evaluate(() => { window.__saveFail = true; });
      await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); await dialog.getByRole('alert').waitFor();
      assert.equal(await dialog.getByLabel('Secret Key', { exact: true }).inputValue(), 'sk_test_private');
      await page.evaluate(() => { window.__saveFail = false; });
      await dialog.screenshot({ path: 'artifacts/platform-features/stripe-configuration.png' });
    }
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    const projection = await page.evaluate(() => JSON.stringify(window.__publicPayments()));
    for (const value of Object.values(entry.fields)) assert.equal(projection.includes(value), false);
  }
  await page.locator('.pm-gateway-card').filter({ has: page.locator('b', { hasText: 'Stripe' }) }).getByRole('button').click();
  await page.getByLabel('Secret Key', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Secret Key', { exact: true }).inputValue(), '');
  assert.equal(await page.getByLabel('Secret Key', { exact: true }).getAttribute('required'), null);
  await page.getByLabel('Mode', { exact: true }).selectOption('live');
  assert.notEqual(await page.getByLabel('Secret Key', { exact: true }).getAttribute('required'), null);
  await page.getByLabel('Mode', { exact: true }).selectOption('sandbox');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('dialog').screenshot({path:'artifacts/platform-features/stripe-configuration-mobile.png'});
  await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; });
  await page.getByRole('dialog').screenshot({path:'artifacts/platform-features/stripe-configuration-dark.png'});
  await page.evaluate(() => { document.documentElement.classList.remove('dark'); document.documentElement.dataset.theme = 'light'; });
  await page.getByRole('button', {name:'Cancel', exact:true}).click(); await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('link', { name: 'Checkout', exact: true }).click(); await page.getByRole('button', { name: 'Bank Transfer', exact: true }).waitFor(); await page.getByText('EG-ACCOUNT-123', { exact: true }).waitFor();
  await page.evaluate(() => window.__updatePayments([])); await page.getByText('No payment methods enabled. Contact your administrator to configure payment methods.', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Billing', exact: true }).click(); await page.getByRole('button', { name: 'User role', exact: true }).click(); assert.equal(await page.getByRole('button', { name: 'Add a transfer method', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Superadmin role', exact: true }).click(); await page.getByRole('button', { name: 'Add a transfer method', exact: true }).first().waitFor();
  await page.getByRole('link',{name:'Billing tabs',exact:true}).click(); await page.getByRole('button',{name:'Payment Methods',exact:true}).click(); await page.getByRole('heading',{name:'Manual Transfer Methods',exact:true}).waitFor(); assert.equal(await page.locator('.pm-manual-options button').count(),6); assert.equal(await page.locator('.pm-gateway-card').count(),4); await page.getByRole('button',{name:'Wallet',exact:true}).click(); await page.locator('.pm-methods').waitFor({state:'detached'});
  await page.evaluate(() => { window.__denySubscriptions = ['settings/paymentMethods', 'settings/marketingTracking']; });
  await page.getByRole('link', {name:'Tracking',exact:true}).click(); await page.getByRole('button',{name:'Connect Accounts',exact:true}).first().click(); await page.getByLabel('Meta Pixel ID',{exact:true}).waitFor(); await page.waitForFunction(() => document.querySelector('input[placeholder="123456789012345"]')?.value === '123456789012345');
  await page.getByRole('link',{name:'Billing',exact:true}).click(); await page.getByRole('button',{name:'Add a transfer method',exact:true}).waitFor(); assert.equal(await page.getByRole('alert').count(),0);
  await page.setViewportSize({width:390,height:844}); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true); await page.locator('.pm-methods').screenshot({path:'artifacts/platform-features/payment-methods-mobile.png'}); await page.evaluate(()=>(document.documentElement.classList.add('dark'), document.documentElement.dataset.theme='dark')); await page.locator('.pm-methods').screenshot({path:'artifacts/platform-features/payment-methods-dark.png'}); await page.setViewportSize({width:1440,height:1000});
  await mkdir('artifacts/platform-features', { recursive: true });
  if (!process.argv.includes('--no-landing')) {
  await page.goto(`${url}?view=landing`, {waitUntil:'domcontentloaded',timeout:120000}); await page.frameLocator('.lp-native-preview iframe').locator('.gos-home-dashboard').waitFor({timeout:120000});
  await page.locator('.lp-mock-replica').screenshot({ path: 'artifacts/platform-features/landing-preview.png' });
  await page.locator('#lp-mock-tab-5').click(); await page.frameLocator('.lp-native-preview iframe').locator('[data-demo-screen="follow-up"]').waitFor();
  await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#lp-mock-tab-0').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.lp-mock-replica').screenshot({ path: 'artifacts/platform-features/landing-mobile.png' });
  await page.evaluate(() => document.documentElement.classList.add('dark')); await page.locator('.lp-mock-replica').screenshot({ path: 'artifacts/platform-features/landing-dark.png' });
  }
  const ios = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' }); const iosPage = await ios.newPage();
  await iosPage.goto(url, {waitUntil:'domcontentloaded'}); await iosPage.getByRole('button', {name:'Get App', exact:true}).click(); await iosPage.getByText('Tap Share in the browser toolbar.', {exact:true}).waitFor(); await ios.close();
  const anonymous = await browser.newPage(); await anonymous.route(/https:\/\/(connect.facebook.net|www.googletagmanager.com)\//, r => r.fulfill({body:'',contentType:'text/javascript'})); await anonymous.goto(url+'?anonymous=1', {waitUntil:'domcontentloaded'}); await anonymous.waitForFunction(() => !!window.__updateTracking); await anonymous.evaluate(() => window.__updateTracking({ metaId:'123456789012345', googleId:'G-ANON1234', enabled:true, customEvents:[], advancedMode:false, webhookUrl:'' })); await anonymous.waitForFunction(() => !!document.getElementById('gos-meta-pixel') && !!document.getElementById('gos-ga4')); await anonymous.close();
  assert.deepEqual(errors, []); console.log('PASS: install lifecycle, tracking validation and tests, payment roles and live checkout synchronization, responsive landing preview.');
} catch (e) { console.error(e); throw e; } finally { await browser?.close(); await server.close(); }
