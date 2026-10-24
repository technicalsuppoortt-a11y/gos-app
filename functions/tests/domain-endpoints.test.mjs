import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const operations = [];
mock.module('../domain-verification.js', {
  namedExports: {
    normalizeHost: host => host,
    isPlatformHostname: () => false,
    verifyDomainDns: async () => ({}),
    verifyAndProvisionDomain: async (host, scope) => {
      operations.push({ host, ...scope });
      return { ok: true, host, status: 'pending' };
    },
    disconnectSiteDomain: async (host, scope) => {
      operations.push({ host, ...scope, disconnect: true });
      return { ok: true, host };
    },
  },
});

const { verifyDomain, hostingDomain } = await import('../index.js');
const records = new Map([
  ['users/member', { status: 'Active', tenantId: 'workspace-a' }],
  ['tenants/workspace-a/members/member', { active: true, permissions: ['funnels'] }],
  ['tenants/workspace-a/assets/asset-a', {}],
]);
const ref = path => ({
  id: path.split('/').at(-1),
  collection: name => ({ doc: id => ref(`${path}/${name}/${id}`) }),
  get: async () => ({ exists: records.has(path), data: () => records.get(path) }),
});
mock.method(getFirestore(), 'doc', ref);
const tokenCheck = mock.method(getAuth(), 'verifyIdToken', async token => {
  if (token !== 'valid-token') throw new Error('Expired or invalid ID token');
  return { uid: 'member', sub: 'member' };
});

test('domain callable transport, authentication and workspace authorization', async t => {
  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
      req.header = name => req.headers[name.toLowerCase()];
      req.get = req.header;
      res.status = code => { res.statusCode = code; return res; };
      res.send = body => { res.end(typeof body === 'object' ? JSON.stringify(body) : body); return res; };
      res.json = body => { res.setHeader('Content-Type', 'application/json'); return res.send(body); };
      (req.url === '/hostingDomain' ? hostingDomain : verifyDomain)(req, res);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (endpoint, token, data = {}) => fetch(`${base}/${endpoint}`, {
    method: 'POST',
    headers: { Origin: 'https://gos-app-3c7fb.web.app', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ data }),
  });

  for (const endpoint of ['verifyDomain', 'hostingDomain']) {
    assert.ok((endpoint === 'verifyDomain' ? verifyDomain : hostingDomain).__endpoint.callableTrigger);
    for (const origin of ['https://gos-app-3c7fb.web.app', 'http://localhost:5173']) {
      const before = tokenCheck.mock.callCount();
      const preflight = await fetch(`${base}/${endpoint}`, {
        method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
      assert.match(preflight.headers.get('access-control-allow-headers'), /authorization/i);
      assert.equal(tokenCheck.mock.callCount(), before);
    }
    for (const token of [null, 'expired-token', 'invalid-token']) {
      const response = await post(endpoint, token, { host: 'example.com', ownerUid: 'forged-owner' });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('access-control-allow-origin'), 'https://gos-app-3c7fb.web.app');
      assert.equal((await response.json()).error.status, 'UNAUTHENTICATED');
    }
  }
  assert.equal(operations.length, 0);

  const verified = await post('verifyDomain', 'valid-token', { host: 'example.com', ownerUid: 'forged-owner', funnelId: 'asset-a', tenantId: 'workspace-a' });
  assert.equal(verified.status, 200);
  assert.equal((await verified.json()).result.ok, true);
  assert.equal(operations[0].ownerUid, 'member');
  assert.equal(operations[0].tenantId, 'workspace-a');
  assert.ok(tokenCheck.mock.calls.some(call => call.arguments[0] === 'valid-token'));

  const forbidden = await post('verifyDomain', 'valid-token', { host: 'example.com', tenantId: 'workspace-b' });
  assert.equal(forbidden.status, 403);
  const missingAsset = await post('verifyDomain', 'valid-token', { host: 'example.com', funnelId: 'other-workspace-asset' });
  assert.equal(missingAsset.status, 404);
  assert.equal(operations.length, 1);

  const disconnected = await post('verifyDomain', 'valid-token', { host: 'example.com', disconnect: true });
  assert.equal(disconnected.status, 200);
  assert.equal(operations.at(-1).disconnect, true);

  // Authorized requests reach the existing hosting handler, not a missing route.
  const hosting = await post('hostingDomain', 'valid-token', {});
  assert.equal(hosting.status, 400);
  assert.equal((await hosting.json()).error.status, 'INVALID_ARGUMENT');

  records.set('tenants/workspace-a/members/member', { active: true, permissions: [] });
  for (const endpoint of ['verifyDomain', 'hostingDomain']) {
    assert.equal((await post(endpoint, 'valid-token', { host: 'example.com' })).status, 403);
  }
});
