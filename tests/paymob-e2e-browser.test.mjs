import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { computePaymobHmac, paymobGatewayRequest } from '../functions/paymob-gateway.js';
import { configurePaymentMethodsRequest } from '../functions/payment-methods.js';
import { productCheckoutRequest } from '../functions/product-checkout.js';

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core'
);

const docs = new Map();
docs.set('tenants/workspace-merchant-1/products/course-eg-1', {
  id: 'course-eg-1',
  name: 'Egypt Growth Accelerator',
  type: 'Course',
  status: 'Active',
  config: {
    amount: 450,
    currency: 'EGP',
    billing: 'One-time',
    taxRate: 0,
    installments: 3,
    frequency: 'Monthly',
    trialDays: 0,
    delivery: 'Instant',
    automations: { confirmation: true, grantAccess: true },
    experience: {
      oneTimeAmount: 450,
      taxHandling: 'Include tax in price',
      paymentMethods: ['Visa', 'Mastercard'],
      discounts: [],
      included: [],
      checkout: { secure: true, collectInfo: true, requirePhone: false, guest: true, requireTerms: false },
    },
  },
});

function makeServerDb() {
  const ref = path => ({
    id: path.split('/').at(-1),
    path,
    exists: docs.has(path),
    collection: name => col(`${path}/${name}`),
    get: async () => ({ ref: ref(path), exists: docs.has(path), data: () => structuredClone(docs.get(path)) }),
    set: async (val, opts) => {
      docs.set(path, opts?.merge ? { ...(docs.get(path) || {}), ...structuredClone(val) } : structuredClone(val));
    },
    update: async val => {
      docs.set(path, { ...(docs.get(path) || {}), ...structuredClone(val) });
    },
    delete: async () => { docs.delete(path); },
  });
  const col = (basePath, filters = [], max = Infinity) => ({
    doc: id => ref(`${basePath}/${id}`),
    where: (k, _op, v) => col(basePath, [...filters, [k, v]], max),
    limit: n => col(basePath, filters, n),
    get: async () => {
      const matched = [...docs.entries()]
        .filter(([k, d]) => k.startsWith(`${basePath}/`) && !k.slice(basePath.length + 1).includes('/') && filters.every(([fk, fv]) => d?.[fk] === fv))
        .slice(0, max);
      return { docs: await Promise.all(matched.map(([k]) => ref(k).get())) };
    },
  });
  return {
    doc: ref,
    collection: col,
    runTransaction: async fn => {
      const writes = [];
      const res = await fn({
        get: r => (typeof r === 'string' ? ref(r).get() : r.get()),
        set: (r, val, opts) => writes.push(() => (typeof r === 'string' ? ref(r).set(val, opts) : r.set(val, opts))),
        update: (r, val) => writes.push(() => r.update(val)),
        delete: r => writes.push(() => r.delete()),
      });
      for (const w of writes) await w();
      return res;
    },
  };
}

const serverDb = makeServerDb();
const paymobMockFetcher = async url => {
  if (String(url).endsWith('/v1/intention/')) {
    return {
      ok: true,
      status: 201,
      json: async () => ({
        id: 'pi_live_sim_1',
        intention_order_id: 776655,
        client_secret: 'paymob_cs_live_sim_xyz',
      }),
    };
  }
  return { ok: false, status: 404, json: async () => ({ detail: 'Not found' }) };
};

const clientTransportModule = `
const listeners = new Map();
export const db = {};
export const primaryDb = db;
export const storage = { app: { options: { storageBucket: 'test-bucket' } } };
export const firebaseConfig = { projectId: 'gos-app-3c7fb' };
export const firebaseApp = {};
export const functions = {};
export const primaryFunctions = functions;
export const auth = { currentUser: { uid: 'merchant-1', email: 'merchant@example.com' } };
export const primaryAuth = auth;
export const setBackendContext = () => {};
export const createClientAuthUser = async email => ({ uid: 'mock-uid', email });
export const provisionTeamMemberAuth = async ({ email }) => ({ uid: 'mock-uid', email });
export const sendOfficialPasswordResetEmail = async () => true;
export const backendError = e => (e instanceof Error ? e.message : String(e));
export const doc = (_db, ...parts) => parts.join('/');
export const collection = (_db, ...parts) => parts.join('/');
export const query = ref => ref;
export const where = () => ({});
export const orderBy = () => ({});
export const limit = () => ({});
export const serverTimestamp = () => new Date().toISOString();
export const deleteDoc = async () => {};
export const getDocs = async () => ({ docs: [], empty: true });
export const addDoc = async () => ({ id: 'mock' });
export const updateDoc = async () => {};
export const writeBatch = () => ({ set() {}, update() {}, delete() {}, commit: async () => {} });
export const runTransaction = async (_db, fn) => fn({ get: async () => ({ exists: () => false, data: () => undefined }), set() {}, update() {}, delete() {} });

async function rpc(kind, payload) {
  const res = await fetch('/__paymob-rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, payload }),
  });
  const body = await res.json();
  if (!res.ok) {
    const err = new Error(body.error || 'RPC failed');
    err.code = body.code || 'internal';
    throw err;
  }
  return body.result;
}

export async function getDoc(path) {
  const val = await rpc('getDoc', { path });
  return { exists: () => val !== null && val !== undefined, data: () => val ?? undefined };
}

export async function setDoc(path, value, options) {
  await rpc('setDoc', { path, value, merge: !!options?.merge });
  for (const fn of listeners.get(path) || []) void fn();
}

export function onSnapshot(path, next) {
  const emit = async () => {
    const val = await rpc('getDoc', { path });
    next({ exists: () => val !== null && val !== undefined, data: () => val ?? undefined });
  };
  const set = listeners.get(path) || new Set();
  set.add(emit);
  listeners.set(path, set);
  void emit();
  return () => { set.delete(emit); };
}

export async function callBackend(name, data) {
  const out = await rpc('callBackend', { name, data, origin: window.location.origin });
  for (const [, set] of listeners) {
    for (const fn of set) void fn();
  }
  return out;
}
`;

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-paymob-e2e-test',
  optimizeDeps: {
    entries: [],
    include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react-router-dom', 'react-redux', '@reduxjs/toolkit', 'lucide-react', '@radix-ui/react-select', 'i18next', 'react-i18next', 'sonner'],
  },
  plugins: [
    react(),
    {
      name: 'paymob-e2e-fixture',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === 'firebase/firestore') return '\0paymob-firestore';
        if (source === 'firebase/storage') return '\0paymob-storage';
        if (/backend\/workspace$/.test(source) || (source === './workspace' && importer?.replaceAll('\\', '/').includes('/src/backend/'))) {
          return new URL('./fixtures/commerce-save-workspace.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
        }
      },
      load(id) {
        const clean = id.replaceAll('\\', '/');
        if (id === '\0paymob-firestore') return clientTransportModule;
        if (id === '\0paymob-storage') return 'export const ref=()=>{};export const uploadBytes=async()=>{};export const getDownloadURL=async()=>"";';
        if (clean.endsWith('/src/backend/firebase.ts')) return clientTransportModule;
        if (clean.endsWith('/src/backend/marketingTracking.ts')) {
          return 'export const track = () => {};';
        }
      },
      configureServer(vite) {
        vite.middlewares.use('/__paymob-rpc', (req, res) => {
          let raw = '';
          req.on('data', chunk => { raw += chunk; });
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const { kind, payload } = JSON.parse(raw || '{}');
              if (kind === 'getDoc') {
                const val = docs.has(payload.path) ? docs.get(payload.path) : null;
                res.end(JSON.stringify({ result: val }));
                return;
              }
              if (kind === 'setDoc') {
                // Enforce security: private server collection is never client-writable/readable
                if (String(payload.path).startsWith('paymentGatewayConfigurations/')) {
                  res.statusCode = 403;
                  res.end(JSON.stringify({ code: 'permission-denied', error: 'Missing or insufficient permissions.' }));
                  return;
                }
                const prev = docs.get(payload.path);
                docs.set(payload.path, payload.merge && prev ? { ...prev, ...payload.value } : payload.value);
                res.end(JSON.stringify({ result: true }));
                return;
              }
              if (kind === 'callBackend') {
                const actor = async () => ({ uid: 'merchant-1', role: 'USER', tenantId: 'workspace-merchant-1', email: 'merchant@example.com' });
                let result;
                if (payload.name === 'configurePaymentMethods') {
                  result = await configurePaymentMethodsRequest({ data: payload.data }, { actor, db: serverDb });
                } else if (payload.name === 'paymobGateway') {
                  if (payload.data?.simulateUndeployed || globalThis.__simulatePaymobUndeployed) {
                    const err = new Error('Failed to fetch');
                    err.code = 'functions/internal';
                    throw err;
                  }
                  result = await paymobGatewayRequest(
                    { data: payload.data, rawRequest: { headers: { origin: payload.origin } } },
                    { actor, db: serverDb, fetcher: paymobMockFetcher }
                  );
                } else if (payload.name === 'productCheckout') {
                  result = await productCheckoutRequest(
                    { data: payload.data, auth: null, rawRequest: { ip: '127.0.0.1' } },
                    { db: serverDb, workspace: async () => ({ user: { uid: 'merchant-1' }, root: serverDb.doc('tenants/workspace-merchant-1') }), bucket: {} }
                  );
                } else {
                  result = { ok: true };
                }
                res.end(JSON.stringify({ result }));
                return;
              }
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Unknown RPC' }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ code: err?.code || 'internal', error: err?.message || 'Error' }));
            }
          });
        });

        vite.middlewares.use('/__paymob-app', async (req, res) => {
          res.setHeader('Content-Type', 'text/html');
          res.end(
            await vite.transformIndexHtml(
              req.url || '/__paymob-app',
              `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { store } from '/src/store/index.ts';
import { loginSuccess } from '/src/store/slices/authSlice.ts';
import { setLanguage } from '/src/store/slices/uiSlice.ts';
import { CurrencyProvider } from '/src/context/CurrencyContext.tsx';
import i18n from '/src/i18n/i18n.ts';
import { PaymentMethodsPanel } from '/src/pages/settings/PaymentMethodsPanel.tsx';
import { CheckoutScreen } from '/src/pages/commerce/CheckoutScreen.tsx';
import '/src/index.css';

store.dispatch(loginSuccess({
  user: { id: 'merchant-1', name: 'Merchant One', email: 'merchant@example.com' },
  role: 'USER',
  tenant: { id: 'workspace-merchant-1', name: 'Merchant Workspace' },
  token: 'test-token',
}));
store.dispatch(setLanguage('en'));
await i18n.changeLanguage('en');

window.__setLang = async lang => {
  store.dispatch(setLanguage(lang));
  await i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
};

const product = {
  id: 'course-eg-1',
  name: 'Egypt Growth Accelerator',
  type: 'Course',
  price: 'EGP 450',
  stats: [],
  status: 'Active',
  sales: '0',
  revenue: '0',
  art: 'course',
  tag: 'Course',
  description: 'Accelerator',
  config: {
    amount: 450,
    currency: 'EGP',
    billing: 'One-time',
    taxRate: 0,
    installments: 3,
    frequency: 'Monthly',
    trialDays: 0,
    delivery: 'Instant',
    automations: { confirmation: true, grantAccess: true },
    experience: {
      oneTimeAmount: 450,
      taxHandling: 'Include tax in price',
      paymentMethods: ['Visa', 'Mastercard'],
      discounts: [],
      included: [],
      checkout: { secure: true, collectInfo: true, requirePhone: false, guest: true, requireTerms: false },
    },
  },
};

createRoot(document.getElementById('root')).render(
  React.createElement(Provider, { store },
    React.createElement(CurrencyProvider, null,
      React.createElement(BrowserRouter, null,
        React.createElement('nav', { style: { display: 'flex', gap: 12, padding: 12 } },
          React.createElement(Link, { to: '/__paymob-app/settings' }, 'Payment Settings'),
          React.createElement(Link, { to: '/__paymob-app/checkout' }, 'Product Checkout')
        ),
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/__paymob-app/settings', element: React.createElement(PaymentMethodsPanel, { scope: 'user' }) }),
          React.createElement(Route, { path: '/__paymob-app/checkout', element: React.createElement(CheckoutScreen, { product, tenantId: 'workspace-merchant-1' }) })
        )
      )
    )
  )
);
</script></body></html>`
            )
          );
        });
      },
    },
  ],
  server: { host: '127.0.0.1', port: 0 },
});

await server.listen();
let browser;
try {
  browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(30000);
  const pageErrors = [];
  page.on('pageerror', err => { pageErrors.push(err.message); console.error('PAGEERROR:', err.message); });
  page.on('console', msg => { if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text()); });

  let redirectedPaymobUrl = '';
  let directPaymobIntentionCalls = 0;
  await page.route('https://accept.paymob.com/**', async route => {
    const reqUrl = route.request().url();
    if (reqUrl.endsWith('/v1/intention/')) {
      directPaymobIntentionCalls += 1;
      await route.fulfill({
        status: 201,
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({ id: 'pi_direct_1', intention_order_id: 776655, client_secret: 'paymob_cs_direct_xyz' }),
      });
      return;
    }
    redirectedPaymobUrl = reqUrl;
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Paymob Hosted Checkout</body></html>' });
  });

  const baseUrl = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.goto(`${baseUrl}/__paymob-app/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Professional Payment Gateways' }).waitFor();

  // 1. Verify Paddle & Fawry/Kashier remain Coming Soon while Stripe & Paymob are active, and all 6 manual methods exist
  assert.equal(await page.locator('.pm-manual-options button').count(), 6);
  for (const soonName of ['Paddle', 'Fawry / Kashier']) {
    const card = page.locator('.pm-gateway-card').filter({ has: page.locator('b', { hasText: soonName }) });
    assert.equal(await card.getByRole('button', { name: 'Coming Soon' }).isDisabled(), true);
  }
  const paymobCard = page.locator('.pm-gateway-card').filter({ has: page.locator('b', { hasText: 'Paymob' }) });
  await paymobCard.getByRole('button', { name: 'Configure Account' }).click();

  // 2. Test Connection & Save Paymob Credentials
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await dialog.getByLabel('Account label', { exact: true }).fill('Paymob Egypt Live');
  await dialog.getByLabel('Public Key', { exact: true }).fill('egy_pk_test_demo123');
  await dialog.getByLabel('Secret Key', { exact: true }).fill('egy_sk_test_secret456');
  await dialog.getByLabel('Card Integration ID (optional)', { exact: true }).fill('451001');
  await dialog.getByLabel('Mobile Wallet Integration ID (optional)', { exact: true }).fill('451002');
  await dialog.getByLabel('HMAC Secret', { exact: true }).fill('hmac_top_secret_789');

  await dialog.getByRole('button', { name: 'Test Connection' }).click();
  await dialog.getByText('Paymob credentials verified successfully.').waitFor();

  // Simulate undeployed Cloud Function (CORS/network preflight failure on cloudfunctions.net) and verify owner fallback works cleanly
  globalThis.__simulatePaymobUndeployed = true;
  await dialog.getByRole('button', { name: 'Test Connection' }).click();
  await dialog.getByText('Paymob credentials verified successfully.').waitFor();
  assert.equal(directPaymobIntentionCalls >= 1, true, 'Fallback should verify directly against Paymob Intention API when callable is not yet deployed');
  globalThis.__simulatePaymobUndeployed = false;

  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });

  // Paymob card must now show Connected + Manage Account
  await paymobCard.getByText('Connected', { exact: true }).waitFor();
  await paymobCard.getByRole('button', { name: 'Manage Account' }).waitFor();

  // Verify zero secret leakage in public projections
  for (const [docPath, docVal] of docs.entries()) {
    if (docPath.startsWith('settings/') || docPath.includes('/paymentMethods/')) {
      const serialized = JSON.stringify(docVal);
      assert.equal(serialized.includes('egy_sk_test_secret456'), false, `Secret leaked in ${docPath}`);
      assert.equal(serialized.includes('hmac_top_secret_789'), false, `HMAC leaked in ${docPath}`);
    }
  }

  // 3. Verify Arabic RTL & Dark Mode rendering without overflow
  await page.evaluate(async () => {
    await window.__setLang('ar');
    document.documentElement.classList.add('dark');
    document.documentElement.dataset.theme = 'dark';
  });
  await page.getByText('بوابات الدفع الاحترافية').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.evaluate(async () => {
    await window.__setLang('en');
    document.documentElement.classList.remove('dark');
    document.documentElement.dataset.theme = 'light';
  });

  // 4. Navigate to Product Checkout: verify Paymob · Cards and Paymob · Mobile Wallets without manual receipt
  await page.getByRole('link', { name: 'Product Checkout' }).click();
  await page.getByText('Paymob · Cards', { exact: true }).waitFor();
  await page.getByText('Paymob · Mobile Wallets', { exact: true }).waitFor();
  assert.equal(await page.getByText('Live Receipt Preview').count(), 0, 'Paymob gateway must not ask for manual receipt');

  await page.getByText('Paymob · Mobile Wallets', { exact: true }).click();
  await page.getByLabel('Email address').fill('salma@example.com');
  await page.getByLabel('Full name').fill('Salma Adel');
  await page.getByLabel('Phone number').fill('01012345678');
  await page.getByRole('button', { name: /Complete Enrollment/ }).click();

  await page.waitForURL('https://accept.paymob.com/**');
  assert.match(redirectedPaymobUrl, /publicKey=egy_pk_test_demo123/);
  assert.match(redirectedPaymobUrl, /clientSecret=paymob_cs_live_sim_xyz/);

  // 5. Simulate Paymob signed redirect return with valid HMAC-SHA512
  const sessionEntries = [...docs.entries()].filter(([k]) => k.startsWith('paymobCheckoutSessions/pmob_'));
  assert.equal(sessionEntries.length, 1);
  const [sessionDocPath, sessionRecord] = sessionEntries[0];
  const sessionId = sessionDocPath.split('/')[1];
  const callbackFields = {
    id: '99887766',
    pending: 'false',
    amount_cents: '45000',
    success: 'true',
    is_auth: 'false',
    is_capture: 'false',
    is_standalone_payment: 'true',
    is_voided: 'false',
    is_refunded: 'false',
    is_3d_secure: 'true',
    integration_id: '451002',
    has_parent_transaction: 'false',
    order: '776655',
    created_at: '2026-11-22T12:30:00.000000',
    currency: 'EGP',
    error_occured: 'false',
    owner: '3001',
    'source_data.pan': '01012345678',
    'source_data.type': 'wallet',
    'source_data.sub_type': 'wallet',
  };
  const hmac = computePaymobHmac(callbackFields, 'hmac_top_secret_789');
  const returnQuery = new URLSearchParams({
    payment: 'paymob_return',
    provider: 'paymob',
    session_id: sessionId,
    gos_order_id: sessionRecord.productOrderId,
    ...callbackFields,
    hmac,
  });

  await page.goto(`${baseUrl}/__paymob-app/checkout?${returnQuery.toString()}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Enrollment confirmed' }).waitFor();
  await page.getByRole('link', { name: 'Sign In to Customer Portal' }).waitFor();
  assert.equal(page.url().includes('hmac='), false, 'Return callback parameters must be stripped from URL');
  assert.equal(docs.get(`tenants/workspace-merchant-1/orders/${sessionRecord.productOrderId}`)?.status, 'Paid');
  assert.equal(docs.get(`tenants/workspace-merchant-1/checkoutRequests/${sessionRecord.productOrderId}`)?.status, 'Approved');
  assert.deepEqual(pageErrors, []);
  console.log('PASS: Paymob settings, test connection, Connected state, RTL/dark layout, checkout Cards & Wallets redirect, and HMAC-verified return fulfillment.');
} finally {
  await browser?.close();
  await server.close();
}
