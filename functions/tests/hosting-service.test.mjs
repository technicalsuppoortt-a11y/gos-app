import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { publishAssetRequest, hostingDomainRequest, deleteAssetRequest } from '../hosting-service.js';

const template = '<html><head><title>Page</title><script type="module" src="/assets/public.js"></script></head><body><script id="gos-publication-data" type="application/json">{}</script></body></html>';
const asset = () => ({ id: 'asset', name: 'Site', kind: 'website', document: { pages: [{ id: 'home', path: '/', name: 'Home', status: 'Draft', sections: [{ id: 'cols', children: [{ gosNestedArrayV1: JSON.stringify([{ id: 'heading', content: { title: 'Saved' } }]) }] }] }], funnel: { pagesFlow: ['home'], status: 'Draft' }, steps: [] }, settings: { color: '#fff' } });
function fixture(seed = {}) {
  const records = new Map(Object.entries(seed).map(([path, value]) => [path, structuredClone(value)]));
  const snapshot = ref => ({ ref, id: ref.id, exists: records.has(ref.path), data: () => structuredClone(records.get(ref.path)) });
  const ref = path => ({ path, id: path.split('/').at(-1), collection: name => collection(`${path}/${name}`), get: async () => snapshot(ref(path)), set: async (data, options) => { records.set(path, options?.merge ? { ...records.get(path), ...data } : data); } });
  const collection = (path, filters = []) => ({ path, doc: id => ref(`${path}/${id}`), where: (key, op, value) => collection(path, [...filters, [key, value]]), get: async () => ({ docs: [...records.keys()].filter(key => key.startsWith(path + '/') && !key.slice(path.length + 1).includes('/')).map(ref).filter(row => filters.every(([key, value]) => records.get(row.path)?.[key] === value)).map(snapshot) }) });
  const db = { collection, runTransaction: async fn => {
    const writes = []; let writing = false;
    const result = await fn({
      get: async target => { assert.equal(writing, false, 'all Firestore transaction reads must precede writes'); return target.collection ? snapshot(target) : target.get(); },
      set: (target, value, options) => { writing = true; writes.push(() => records.set(target.path, options?.merge ? { ...records.get(target.path), ...structuredClone(value) } : structuredClone(value))); },
      update: (target, changes) => { writing = true; writes.push(() => { const value = records.get(target.path); assert.ok(value); for (const [key, item] of Object.entries(changes)) { const parts = key.split('.'); let cursor = value; for (const part of parts.slice(0, -1)) cursor = cursor[part]; cursor[parts.at(-1)] = structuredClone(item); } }); },
      delete: target => { writing = true; writes.push(() => records.delete(target.path)); },
    });
    writes.forEach(write => write()); return result;
  } };
  const calls = [];
  const root = ref('tenants/tenant-a');
  const deps = { db, workspace: async (_, permission) => { assert.equal(permission, 'funnels'); return { root, user: { uid: 'staff' } }; }, appOrigin: 'https://dashboard.web.app', fetcher: async url => url.endsWith('/published.html') ? new Response(template) : url.endsWith('/hosting-manifest.json') ? Response.json({ 'published.html': { file: 'assets/public.js' } }) : new Response('// Runtime fixture'), hosting: {
    ensureSite: async id => calls.push(['site', id]),
    deploy: async (id, files) => { calls.push(['deploy', id, files]); return { url: `https://${id}.web.app`, release: 'release-1', version: 'version-1' }; },
    connectDomain: async () => ({ hostState: 'HOST_ACTIVE', ownershipState: 'OWNERSHIP_ACTIVE', cert: { state: 'CERT_VALIDATING' }, requiredDnsUpdates: { desired: [{ records: [{ domainName: 'www.example.com', type: 'CNAME', rdata: 'site.web.app' }] }] } }),
    getDomain: async () => ({ hostState: 'HOST_ACTIVE', ownershipState: 'OWNERSHIP_ACTIVE', cert: { state: 'CERT_ACTIVE' } }),
    deleteSite: async id => calls.push(['deleteSite', id]),
  } };
  return { records, calls, deps };
}
test('publish uses the stored document, decodes columns and marks Published after release', async () => {
  const h = fixture({ 'tenants/tenant-a/assets/asset': asset() });
  const result = await publishAssetRequest({ data: { assetId: 'asset' } }, h.deps);
  assert.equal(result.draftChanged, false);
  assert.equal(h.records.get('tenants/tenant-a/assets/asset').document.funnel.status, 'Published');
  assert.equal(h.records.get('tenants/tenant-a/assets/asset').publishedUrl, result.url);
  assert.ok(h.calls[1][2]['/index.html'].includes('"children":[[{"id":"heading"'));
  assert.equal(h.records.get('tenants/tenant-a/hosting/asset').lease, null);
});
test('a newer edit during deployment stays a draft instead of being falsely marked published', async () => {
  const h = fixture({ 'tenants/tenant-a/assets/asset': asset() });
  h.deps.hosting.deploy = async () => { h.records.get('tenants/tenant-a/assets/asset').document.pages[0].name = 'New edit'; return { url: 'https://published.web.app' }; };
  const result = await publishAssetRequest({ data: { assetId: 'asset' } }, h.deps);
  assert.equal(result.draftChanged, true);
  assert.equal(h.records.get('tenants/tenant-a/assets/asset').document.funnel.status, 'Draft');
});
test('provider errors retain the draft and release the publishing lock', async () => {
  const h = fixture({ 'tenants/tenant-a/assets/asset': asset() });
  h.deps.hosting.deploy = async () => { throw new Error('Upload failed'); };
  await assert.rejects(publishAssetRequest({ data: { assetId: 'asset' } }, h.deps), /Upload failed/);
  assert.equal(h.records.get('tenants/tenant-a/assets/asset').document.funnel.status, 'Draft');
  assert.equal(h.records.get('tenants/tenant-a/hosting/asset').lease, null);
});
test('a missing runtime file returning the dashboard SPA prevents any Hosting mutation', async () => {
  const h = fixture({ 'tenants/tenant-a/assets/asset': asset() });
  const normal = h.deps.fetcher;
  h.deps.fetcher = async url => url.endsWith('/assets/public.js') ? new Response('<html>Dashboard</html>', { headers: { 'Content-Type': 'text/html' } }) : normal(url);
  await assert.rejects(publishAssetRequest({ data: { assetId: 'asset' } }, h.deps), /dashboard fallback/);
  assert.equal(h.calls.length, 0);
});
test('concurrent publishes and unauthorized access stop before provider mutations', async () => {
  const h = fixture({ 'tenants/tenant-a/assets/asset': asset(), 'tenants/tenant-a/hosting/asset': { lease: 'busy', startedAt: Date.now() } });
  await assert.rejects(publishAssetRequest({ data: { assetId: 'asset' } }, h.deps), /already in progress/);
  h.deps.workspace = async () => { throw new Error('permission-denied'); };
  await assert.rejects(publishAssetRequest({ data: { assetId: 'asset' } }, h.deps), /permission-denied/);
  assert.equal(h.calls.length, 0);
});
test('domain DNS and certificate states come from Firebase and assignment becomes live only when ready', async () => {
  const h = fixture({ 'tenants/tenant-a/assets/asset': asset() });
  const request = { data: { operation: 'connect', domainId: 'domain', assetId: 'asset', name: 'www.example.com' } };
  const result = await hostingDomainRequest(request, h.deps);
  assert.equal(result.domain.status, 'Pending'); assert.equal(result.domain.dnsRecords[0].type, 'CNAME');
  assert.notEqual(h.records.get('tenants/tenant-a/assets/asset').domain, 'www.example.com');
  const checked = await hostingDomainRequest({ data: { operation: 'check', domainId: 'domain' } }, h.deps);
  assert.equal(checked.domain.status, 'Connected');
  assert.equal(h.records.get('tenants/tenant-a/assets/asset').domain, 'www.example.com');
});
test('a domain claimed by another tenant cannot be rebound', async () => {
  const key = createHash('sha256').update(JSON.stringify('www.example.com')).digest('hex');
  const h = fixture({ 'tenants/tenant-a/assets/asset': asset(), [`hostingDomainClaims/${key}`]: { tenantId: 'tenant-b' } });
  await assert.rejects(hostingDomainRequest({ data: { domainId: 'domain', assetId: 'asset', name: 'www.example.com' } }, h.deps), /another workspace/);
  assert.equal(h.calls.length, 0);
});
test('deletion removes the dedicated live site before removing the workspace asset', async () => {
  const h = fixture({ 'tenants/tenant-a/assets/asset': asset(), 'tenants/tenant-a/domains/domain': { name: 'www.example.com', assetId: 'asset', status: 'Connected', ssl: 'Active', default: true } });
  await deleteAssetRequest({ data: { assetId: 'asset' } }, h.deps);
  assert.equal(h.calls[0][0], 'deleteSite'); assert.equal(h.records.has('tenants/tenant-a/assets/asset'), false);
  assert.equal(h.records.get('tenants/tenant-a/domains/domain').status, 'Disconnected');
});


test('publication embeds a capture capability while keeping its verifier and allowed forms on the server', async () => {
  const row = asset(); row.document.pages[0].sections.push({ id: 'form', type: 'Form', content: { fields: '["Name","Email"]' } });
  const h = fixture({ 'tenants/tenant-a/assets/asset': row });
  await publishAssetRequest({ data: { assetId: 'asset' } }, h.deps);
  const html = h.calls.find(call => call[0] === 'deploy')[2]['/index.html'];
  const match = html.match(/<script id="gos-publication-data" type="application\/json">([\s\S]*?)<\/script>/);
  const data = JSON.parse(match[1]);
  assert.equal(data.capture.tenantId, 'tenant-a'); assert.equal(data.capture.captureToken.length, 43);
  const state = h.records.get('tenants/tenant-a/hosting/asset');
  assert.equal(state.captureTokenHash, createHash('sha256').update(data.capture.captureToken).digest('hex'));
  assert.deepEqual(state.captureForms, [{ pageId: 'home', formId: 'form', step: 'Home' }]);
  assert.ok(!html.includes('captureTokenHash'));
});
