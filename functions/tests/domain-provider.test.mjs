import test from 'node:test';
import assert from 'node:assert/strict';
import { domainProviderRequest, createDomainProviderApiHandler } from '../domain-provider.js';
import { invalidateRegistrarConfigCache } from '../domains/namecheap.js';
import { invalidatePricingCache } from '../domains/pricing.js';

function createMockDb(initial = {}) {
  const store = new Map(Object.entries(initial));
  let seq = 0;

  const makeDocRef = path => ({
    path,
    id: path.split('/').at(-1),
    get: async () => ({
      id: path.split('/').at(-1),
      exists: store.has(path),
      data: () => (store.has(path) ? structuredClone(store.get(path)) : undefined),
      ref: makeDocRef(path),
    }),
    set: async (data, opts = {}) => {
      const prev = opts.merge && store.has(path) ? store.get(path) : {};
      store.set(path, structuredClone({ ...prev, ...data }));
    },
    update: async patch => {
      const prev = store.get(path) || {};
      store.set(path, structuredClone({ ...prev, ...patch }));
    },
    delete: async () => {
      store.delete(path);
    },
    collection: sub => makeColRef(`${path}/${sub}`),
  });

  const buildSnapshot = docs => ({
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: fn => docs.forEach(fn),
  });

  const makeQuery = (colPath, filters = []) => ({
    where: (field, op, val) => makeQuery(colPath, [...filters, { field, op, val }]),
    limit: n => ({
      get: async () => {
        const snap = await makeQuery(colPath, filters).get();
        return buildSnapshot(snap.docs.slice(0, n));
      },
    }),
    get: async () => {
      const prefix = `${colPath}/`;
      const matched = [];
      for (const [k, v] of store.entries()) {
        if (!k.startsWith(prefix)) continue;
        const rest = k.slice(prefix.length);
        if (rest.includes('/')) continue;
        const passes = filters.every(({ field, op, val }) => {
          if (op === '==') return v?.[field] === val;
          if (op === 'in') return Array.isArray(val) && val.includes(v?.[field]);
          return true;
        });
        if (passes) {
          matched.push({
            id: rest,
            exists: true,
            data: () => structuredClone(v),
            ref: makeDocRef(k),
          });
        }
      }
      return buildSnapshot(matched);
    },
  });

  const makeColRef = colPath => ({
    path: colPath,
    doc: (id = `doc_${++seq}`) => makeDocRef(`${colPath}/${id}`),
    add: async data => {
      const ref = makeDocRef(`${colPath}/doc_${++seq}`);
      await ref.set(data);
      return ref;
    },
    where: (field, op, val) => makeQuery(colPath, [{ field, op, val }]),
    limit: n => makeQuery(colPath, []).limit(n),
    get: () => makeQuery(colPath, []).get(),
  });

  const batch = () => {
    const ops = [];
    return {
      set: (ref, data, opts) => ops.push(() => ref.set(data, opts)),
      update: (ref, patch) => ops.push(() => ref.update(patch)),
      delete: ref => ops.push(() => ref.delete()),
      commit: async () => {
        for (const op of ops) await op();
      },
    };
  };

  return {
    store,
    doc: path => makeDocRef(path),
    collection: colPath => makeColRef(colPath),
    batch,
    runTransaction: async fn => {
      const writes = [];
      const tx = {
        get: ref => ref.get(),
        set: (ref, data, opts) => writes.push(() => ref.set(data, opts)),
        update: (ref, patch) => writes.push(() => ref.update(patch)),
        delete: ref => writes.push(() => ref.delete()),
      };
      const result = await fn(tx);
      for (const w of writes) await w();
      return result;
    },
  };
}

function createNamecheapMockFetcher({ failCreate = false } = {}) {
  return async (url, init = {}) => {
    const u = String(url);

    // Stripe mock endpoints
    if (u.startsWith('https://api.stripe.com/v1/checkout/sessions/cs_test_123')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'cs_test_123',
          payment_status: 'paid',
          payment_intent: 'pi_test_123',
          amount_total: 1200,
          currency: 'usd',
          metadata: {},
        }),
      };
    }
    if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        }),
      };
    }

    // Namecheap XML mock endpoints
    const parsed = new URL(u);
    const cmd = parsed.searchParams.get('Command');

    if (cmd === 'namecheap.domains.check') {
      const list = (parsed.searchParams.get('DomainList') || '').split(',').filter(Boolean);
      const items = list
        .map(
          d =>
            `<DomainCheckResult Domain="${d}" Available="${d === 'taken.com' ? 'false' : 'true'}" IsPremiumName="false" />`
        )
        .join('');
      return {
        ok: true,
        status: 200,
        text: async () => `<ApiResponse Status="OK"><CommandResponse>${items}</CommandResponse></ApiResponse>`,
      };
    }

    if (cmd === 'namecheap.users.getPricing') {
      return {
        ok: true,
        status: 200,
        text: async () => `
          <ApiResponse Status="OK">
            <CommandResponse>
              <UserGetPricingResult>
                <ProductType Name="DOMAIN">
                  <ProductCategory Name="REGISTER">
                    <Product Name="com"><Price Duration="1" Price="9.50" YourPrice="9.50" Currency="USD" /></Product>
                  </ProductCategory>
                  <ProductCategory Name="RENEW">
                    <Product Name="com"><Price Duration="1" Price="11.50" YourPrice="11.50" Currency="USD" /></Product>
                  </ProductCategory>
                </ProductType>
              </UserGetPricingResult>
            </CommandResponse>
          </ApiResponse>`,
      };
    }

    if (cmd === 'namecheap.domains.create') {
      if (failCreate) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            `<ApiResponse Status="ERROR"><Errors><Error Number="2019166">Insufficient registrar balance</Error></Errors></ApiResponse>`,
        };
      }
      const dom = parsed.searchParams.get('DomainName');
      return {
        ok: true,
        status: 200,
        text: async () =>
          `<ApiResponse Status="OK"><CommandResponse><DomainCreateResult Domain="${dom}" Registered="true" ChargedAmount="9.50" DomainID="NC-901" OrderID="ORD-77" TransactionID="TXN-88" WhoisguardEnable="true" /></CommandResponse></ApiResponse>`,
      };
    }

    if (cmd === 'namecheap.domains.getInfo') {
      const dom = parsed.searchParams.get('DomainName');
      return {
        ok: true,
        status: 200,
        text: async () => `
          <ApiResponse Status="OK">
            <CommandResponse>
              <DomainGetInfoResult Status="Ok" DomainName="${dom}">
                <DomainDetails>
                  <CreatedDate>11/14/2026</CreatedDate>
                  <ExpiredDate>2027-11-14T00:00:00.000Z</ExpiredDate>
                </DomainDetails>
                <WhoisGuard Enabled="True" />
                <DnsDetails ProviderType="CUSTOM">
                  <Nameserver>dns1.registrar-servers.com</Nameserver>
                  <Nameserver>dns2.registrar-servers.com</Nameserver>
                </DnsDetails>
              </DomainGetInfoResult>
            </CommandResponse>
          </ApiResponse>`,
      };
    }

    if (cmd === 'namecheap.domains.dns.getHosts') {
      return {
        ok: true,
        status: 200,
        text: async () => `
          <ApiResponse Status="OK">
            <CommandResponse>
              <DomainDNSGetHostsResult>
                <host HostId="1" Name="@" Type="A" Address="76.76.21.21" TTL="1799" />
                <host HostId="2" Name="www" Type="CNAME" Address="cname.vercel-dns.com" TTL="1799" />
              </DomainDNSGetHostsResult>
            </CommandResponse>
          </ApiResponse>`,
      };
    }

    if (cmd === 'namecheap.domains.dns.setHosts') {
      return {
        ok: true,
        status: 200,
        text: async () =>
          `<ApiResponse Status="OK"><CommandResponse><DomainDNSSetHostsResult IsSuccess="true" /></CommandResponse></ApiResponse>`,
      };
    }

    if (cmd === 'namecheap.domains.dns.setCustom') {
      return {
        ok: true,
        status: 200,
        text: async () =>
          `<ApiResponse Status="OK"><CommandResponse><DomainDNSSetCustomResult Updated="true" /></CommandResponse></ApiResponse>`,
      };
    }

    if (cmd === 'namecheap.domains.renew') {
      const dom = parsed.searchParams.get('DomainName');
      return {
        ok: true,
        status: 200,
        text: async () =>
          `<ApiResponse Status="OK"><CommandResponse><DomainRenewResult DomainName="${dom}" Renew="true" OrderID="REN-1" TransactionID="TXN-REN-1" ChargedAmount="11.50"><DomainDetails ExpiredDate="2028-11-14T00:00:00.000Z" /></DomainRenewResult></CommandResponse></ApiResponse>`,
      };
    }

    throw new Error(`Unhandled mock URL: ${u} (${init.method || 'GET'})`);
  };
}

const VALID_CONTACT = {
  firstName: 'Mahmoud',
  lastName: 'Ali',
  organization: 'Upclick Agency',
  address1: '10 Nile Corniche',
  city: 'Cairo',
  state: 'Cairo',
  postalCode: '11511',
  country: 'EG',
  phone: '01001234567',
  email: 'mahmoud@example.com',
};

test('RBAC: Superadmin manages registrar credentials & pricing while Admins and Users are strictly blocked', async () => {
  invalidateRegistrarConfigCache();
  invalidatePricingCache();

  const db = createMockDb({
    'users/super1': { uid: 'super1', role: 'SUPER_ADMIN', status: 'Active', email: 'root@upclick.app' },
    'users/admin1': { uid: 'admin1', role: 'ADMIN', status: 'Active', tenantId: 'workspace-admin1', email: 'admin1@upclick.app' },
    'users/user1': { uid: 'user1', role: 'USER', status: 'Active', tenantId: 'workspace-user1', supportParentId: 'admin1', email: 'user1@upclick.app' },
    'users/cust1': { uid: 'cust1', role: 'CUSTOMER', status: 'Active', email: 'buyer@upclick.app' },
  });
  const fetcher = createNamecheapMockFetcher();
  const callAs = (uid, data) =>
    domainProviderRequest({ data }, { db, fetcher, actor: async () => db.store.get(`users/${uid}`) });

  // Customer is blocked completely
  await assert.rejects(() => callAs('cust1', { operation: 'getPublicPricing' }), { code: 'permission-denied' });

  // User and Admin cannot save registrar API credentials or modify global pricing
  await assert.rejects(
    () => callAs('user1', { operation: 'saveRegistrarConfig', config: { apiKey: 'hack' } }),
    { code: 'permission-denied' }
  );
  await assert.rejects(
    () => callAs('admin1', { operation: 'saveRegistrarConfig', config: { apiKey: 'hack' } }),
    { code: 'permission-denied' }
  );
  await assert.rejects(
    () => callAs('admin1', { operation: 'updatePricing', applyBulkMarkup: { markup: 50, markup_type: 'percent' } }),
    { code: 'permission-denied' }
  );
  await assert.rejects(() => callAs('user1', { operation: 'adminOverview' }), { code: 'permission-denied' });
  await assert.rejects(() => callAs('admin1', { operation: 'superAdminOverview' }), { code: 'permission-denied' });

  // Superadmin saves Namecheap credentials & tests connection
  const savedCfg = await callAs('super1', {
    operation: 'saveRegistrarConfig',
    config: {
      apiUser: 'nc_root',
      apiKey: 'secret_nc_key_9876',
      clientIp: '34.120.1.9',
      environment: 'sandbox',
    },
  });
  assert.equal(savedCfg.namecheapConfigured, true);
  assert.equal(savedCfg.registrarConfig.hasApiKey, true);
  assert.equal(savedCfg.registrarConfig.maskedApiKey, '••••••••9876');
  assert.equal('apiKey' in savedCfg.registrarConfig, false, 'Raw API key must never be returned');

  const conn = await callAs('super1', { operation: 'testRegistrarConfig' });
  assert.equal(conn.ok, true);

  // Superadmin applies +20% bulk markup & syncs live Namecheap costs
  await callAs('super1', {
    operation: 'updatePricing',
    applyBulkMarkup: { markup: 20, markup_type: 'percent' },
  });
  const synced = await callAs('super1', { operation: 'updatePricing', refreshRegistrar: true });
  const comAdmin = synced.pricing.find(r => r.extension === 'com');
  assert.equal(comAdmin.registrar_price, 9.5);
  assert.equal(comAdmin.registration_price, 11.4); // 9.50 * 1.20 = 11.40

  // Public pricing returned to User NEVER exposes registrar_price or markup!
  const pub = await callAs('user1', { operation: 'getPublicPricing' });
  const comPublic = pub.pricing.find(r => r.extension === 'com');
  assert.equal(comPublic.registration_price, 11.4);
  assert.equal('registrar_price' in comPublic, false);
  assert.equal('markup' in comPublic, false);
});

test('End-to-end User search, ICANN contact, Wallet & Stripe checkout, DNS, Nameservers, Renew, and Admin delegated scope', async () => {
  invalidateRegistrarConfigCache();
  invalidatePricingCache();

  const db = createMockDb({
    'users/super1': { uid: 'super1', role: 'SUPER_ADMIN', status: 'Active', email: 'root@upclick.app' },
    'users/admin1': { uid: 'admin1', role: 'ADMIN', status: 'Active', tenantId: 'workspace-admin1', email: 'admin1@upclick.app' },
    'users/admin2': { uid: 'admin2', role: 'ADMIN', status: 'Active', tenantId: 'workspace-admin2', email: 'admin2@upclick.app' },
    'users/user1': { uid: 'user1', name: 'Mahmoud Ali', role: 'USER', status: 'Active', tenantId: 'workspace-user1', supportParentId: 'admin1', email: 'user1@upclick.app' },
    'users/user2': { uid: 'user2', name: 'Other User', role: 'USER', status: 'Active', tenantId: 'workspace-user2', supportParentId: 'admin2', email: 'user2@upclick.app' },
    'billingWallets/user1': { id: 'user1', ownerId: 'user1', balance: 100 },
    'paymentGatewayConfigurations/stripe': { credentials: { secretKey: 'sk_test_platform', mode: 'sandbox' } },
    'domainRegistrarConfigurations/namecheap': {
      apiUser: 'nc_root',
      apiKey: 'secret_key_1234',
      userName: 'nc_root',
      clientIp: '34.120.1.9',
      environment: 'sandbox',
    },
  });

  const fetcher = createNamecheapMockFetcher();
  const callAs = (uid, data) =>
    domainProviderRequest({ data }, { db, fetcher, actor: async () => db.store.get(`users/${uid}`) });

  // 1. User checks availability
  const check = await callAs('user1', { operation: 'checkAvailability', domain: 'upclickstore' });
  assert.equal(check.query, 'upclickstore.com');
  assert.equal(check.results[0].domain, 'upclickstore.com');
  assert.equal(check.results[0].available, true);

  // 2. Order creation fails cleanly before ICANN contact is saved
  await assert.rejects(
    () => callAs('user1', { operation: 'createOrder', domain: 'upclickstore.com', years: 1 }),
    err => /contact details/i.test(err.message)
  );

  // 3. Save ICANN contact & create order
  await callAs('user1', { operation: 'saveContact', contact: VALID_CONTACT });
  const created = await callAs('user1', { operation: 'createOrder', domain: 'upclickstore.com', years: 1 });
  assert.equal(created.order.status, 'pending');
  assert.equal(created.order.customer_price, 14.99);

  // 4. Checkout via Wallet deducts balance & fulfills domain with Namecheap immediately
  const paid = await callAs('user1', {
    operation: 'createCheckout',
    orderId: created.order.id,
    paymentMethod: 'wallet',
  });
  assert.equal(paid.paid, true);
  assert.equal(paid.fulfillment.ok, true);
  assert.equal(db.store.get('billingWallets/user1').balance, 85.01);

  const portfolio = await callAs('user1', { operation: 'listMyDomains' });
  assert.equal(portfolio.domains.length, 1);
  const domId = portfolio.domains[0].id;
  assert.equal(portfolio.domains[0].domain, 'upclickstore.com');

  // 5. DNS, Nameservers & Auto-Renew management + cross-tenant isolation
  const dns = await callAs('user1', { operation: 'getDnsRecords', domainId: domId });
  assert.equal(dns.records.length, 2);

  await callAs('user1', {
    operation: 'saveDnsRecords',
    domainId: domId,
    records: [{ name: '@', type: 'A', address: '76.76.21.21', ttl: '1799' }],
  });
  await callAs('user1', {
    operation: 'saveNameservers',
    domainId: domId,
    nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
  });
  await callAs('user1', { operation: 'setAutoRenew', domainId: domId, auto_renew: false });

  // Unrelated user2 and unrelated admin2 CANNOT access user1's domain!
  await assert.rejects(
    () => callAs('user2', { operation: 'getDomainDetail', domainId: domId }),
    { code: 'permission-denied' }
  );
  await assert.rejects(
    () => callAs('admin2', { operation: 'getDomainDetail', domainId: domId }),
    { code: 'permission-denied' }
  );

  // Delegated admin1 CAN view user1's domain in adminOverview, WITHOUT wholesale registrar_cost!
  const admin1View = await callAs('admin1', { operation: 'adminOverview' });
  assert.equal(admin1View.domains.length, 1);
  assert.equal(admin1View.orders.length, 1);
  assert.equal('registrar_cost' in admin1View.orders[0], false);
  assert.equal('profit' in admin1View.orders[0], false);

  const admin2View = await callAs('admin2', { operation: 'adminOverview' });
  assert.equal(admin2View.domains.length, 0);

  // 6. Renewal via Stripe Checkout + verifyCheckout
  const renewal = await callAs('user1', { operation: 'createRenewalOrder', domainId: domId, years: 1 });
  const stripeSession = await callAs('user1', {
    operation: 'createCheckout',
    orderId: renewal.order.id,
    paymentMethod: 'stripe',
  });
  assert.equal(stripeSession.sessionId, 'cs_test_123');
  const verified = await callAs('user1', {
    operation: 'verifyCheckout',
    sessionId: 'cs_test_123',
    orderId: renewal.order.id,
  });
  assert.equal(verified.paid, true);
  assert.equal(verified.fulfillment.ok, true);
});

test('Failed registrar fulfillment logs error and Superadmin retryOrder recovers cleanly', async () => {
  invalidateRegistrarConfigCache();
  invalidatePricingCache();

  const db = createMockDb({
    'users/super1': { uid: 'super1', role: 'SUPER_ADMIN', status: 'Active', email: 'root@upclick.app' },
    'users/user1': { uid: 'user1', role: 'USER', status: 'Active', tenantId: 'workspace-user1', email: 'user1@upclick.app' },
    'billingWallets/user1': { id: 'user1', ownerId: 'user1', balance: 50 },
    'domain_contacts/user1': VALID_CONTACT,
    'domainRegistrarConfigurations/namecheap': {
      apiUser: 'nc_root',
      apiKey: 'secret_key_1234',
      userName: 'nc_root',
      clientIp: '34.120.1.9',
      environment: 'sandbox',
    },
  });

  const failingFetcher = createNamecheapMockFetcher({ failCreate: true });
  const okFetcher = createNamecheapMockFetcher({ failCreate: false });

  const created = await domainProviderRequest(
    { data: { operation: 'createOrder', domain: 'retrytest.com', years: 1 } },
    { db, fetcher: failingFetcher, actor: async () => db.store.get('users/user1') }
  );

  const checkout = await domainProviderRequest(
    { data: { operation: 'createCheckout', orderId: created.order.id, paymentMethod: 'wallet' } },
    { db, fetcher: failingFetcher, actor: async () => db.store.get('users/user1') }
  );
  assert.equal(checkout.fulfillment.ok, false);

  const overviewBefore = await domainProviderRequest(
    { data: { operation: 'superAdminOverview' } },
    { db, fetcher: okFetcher, actor: async () => db.store.get('users/super1') }
  );
  assert.equal(overviewBefore.orders[0].status, 'failed');
  assert.equal(overviewBefore.logs.length, 1);

  // Superadmin retries after topping up registrar balance
  const retried = await domainProviderRequest(
    { data: { operation: 'retryOrder', orderId: created.order.id } },
    { db, fetcher: okFetcher, actor: async () => db.store.get('users/super1') }
  );
  assert.equal(retried.success, true);

  const overviewAfter = await domainProviderRequest(
    { data: { operation: 'superAdminOverview' } },
    { db, fetcher: okFetcher, actor: async () => db.store.get('users/super1') }
  );
  assert.equal(overviewAfter.orders[0].status, 'completed');
  assert.equal(overviewAfter.domains.length, 1);
  assert.equal(overviewAfter.domains[0].domain, 'retrytest.com');
});

test('REST HTTP handler (/api/domains/pricing) authenticates Bearer token and responds cleanly', async () => {
  invalidateRegistrarConfigCache();
  invalidatePricingCache();

  const db = createMockDb({
    'users/user1': { uid: 'user1', role: 'USER', status: 'Active', tenantId: 'workspace-user1', email: 'u@example.com' },
  });
  const auth = {
    verifyIdToken: async token => {
      if (token !== 'valid-token') throw new Error('Bad token');
      return { uid: 'user1' };
    },
  };
  const handler = createDomainProviderApiHandler({
    db,
    auth,
    actor: async req => db.store.get(`users/${req.auth.uid}`),
    fetcher: createNamecheapMockFetcher(),
  });

  let capturedStatus = 0;
  let capturedBody = null;
  const res = {
    setHeader: () => {},
    status: code => {
      capturedStatus = code;
      return {
        json: payload => {
          capturedBody = payload;
        },
        send: () => {},
      };
    },
  };

  await handler(
    { method: 'GET', path: '/api/domains/pricing', headers: { authorization: 'Bearer valid-token' }, query: {} },
    res
  );
  assert.equal(capturedStatus, 200);
  assert.equal(capturedBody.currency, 'USD');
  assert.equal(Array.isArray(capturedBody.pricing), true);
  assert.equal(capturedBody.pricing.length > 0, true);
});
