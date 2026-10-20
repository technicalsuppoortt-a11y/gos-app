import test from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { buildPublicationFiles, createHostingClient, domainVerification, hostingSiteId, publicationResourcePaths } from '../hosting-client.js';

const template = '<html><head><title>Page</title><script type="module" src="/assets/public.js"></script></head><body><script id="gos-publication-data" type="application/json">{}</script></body></html>';
const asset = () => ({ id: 'asset', name: 'A <safe> title', kind: 'funnel', image: '/pagefly/coach.png', settings: { color: '#6544e8' }, integrations: { private: 'secret' }, document: { pages: [{ id: 'home', name: 'Home', path: '/start', sections: [], seoTitle: 'My <title>' }, { id: 'thanks', name: 'Thanks', path: '/thank-you', sections: [] }], funnel: { pagesFlow: ['home', 'thanks'] }, steps: [{ id: 'step', pageId: 'home' }] } });

test('published page files cover the root, deep links and assets without exposing integrations', () => {
  const files = buildPublicationFiles(asset(), template, 'https://dashboard.web.app');
  assert.deepEqual(Object.keys(files).sort(), ['/index.html', '/start/index.html', '/thank-you/index.html']);
  assert.ok(files['/index.html'].includes('https://dashboard.web.app/assets/public.js'));
  assert.ok(files['/index.html'].includes('https://dashboard.web.app/pagefly/coach.png'));
  assert.ok(files['/index.html'].includes('My &lt;title&gt;'));
  assert.ok(!files['/index.html'].includes('secret'));
});
test('publication JSON cannot break out of the script container and duplicate paths fail', () => {
  const row = asset(); row.name = '</script><script>alert(1)</script>';
  const files = buildPublicationFiles(row, template, 'https://dashboard.web.app');
  assert.ok(!files['/index.html'].includes(row.name));
  row.document.pages[1].path = '/start/';
  assert.throws(() => buildPublicationFiles(row, template, 'https://dashboard.web.app'), /unique/);
  row.document.pages[1].path = '/../dashboard';
  assert.throws(() => buildPublicationFiles(row, template, 'https://dashboard.web.app'), /URL path/);
});
test('missing step targets and unavailable publication frontend prevent publication', () => {
  const row = asset(); row.document.steps.push({ pageId: 'deleted' });
  assert.throws(() => buildPublicationFiles(row, template, 'https://dashboard.web.app'), /missing page/);
  assert.throws(() => buildPublicationFiles(asset(), '<html>Dashboard</html>', 'https://dashboard.web.app'), /frontend entry/);
});
test('site IDs isolate tenants and assets from the dashboard and each other', () => {
  const first = hostingSiteId('tenant-a', 'asset');
  assert.equal(first, hostingSiteId('tenant-a', 'asset'));
  assert.notEqual(first, hostingSiteId('tenant-b', 'asset'));
  assert.match(first, /^gos-[a-f0-9]{24}$/);
});
test('immutable release packaging includes transitive scripts, CSS and local media', () => {
  const manifest = { 'published.html': { file: 'assets/public.js', imports: ['shared'], css: ['assets/public.css'] }, shared: { file: 'assets/shared.js', assets: ['assets/font.woff2'] } };
  const paths = publicationResourcePaths(asset(), manifest);
  for (const path of ['/assets/public.js', '/assets/shared.js', '/assets/public.css', '/assets/font.woff2', '/pagefly/coach.png']) assert.ok(paths.includes(path));
  const files = buildPublicationFiles(asset(), template, 'https://dashboard.web.app', true);
  assert.ok(files['/index.html'].includes('src="/assets/public.js"'));
  assert.ok(!files['/index.html'].includes('https://dashboard.web.app'));
  assert.throws(() => publicationResourcePaths(asset(), manifest, '<script src="/assets/old-public.js"></script>'), /deployment changed/);
  const invalid = asset(); invalid.image = '/index.html';
  assert.throws(() => publicationResourcePaths(invalid, manifest), /invalid resource path/);
});
test('domain is connected only after host, ownership and SSL are all active', () => {
  const ready = { hostState: 'HOST_ACTIVE', ownershipState: 'OWNERSHIP_ACTIVE', cert: { state: 'CERT_ACTIVE' } };
  assert.equal(domainVerification(ready).status, 'Connected');
  for (const state of [{ ...ready, hostState: 'HOST_CONFLICT' }, { ...ready, ownershipState: 'OWNERSHIP_PENDING' }, { ...ready, cert: { state: 'CERT_PROPAGATING' } }]) assert.equal(domainVerification(state).status, 'Pending');
  assert.equal(domainVerification({ ...ready, cert: { state: 'CERT_EXPIRED' } }).ssl, 'Inactive');
  const records = [{ domainName: 'www.example.com.', type: 'CNAME', rdata: 'gos-site.web.app.', requiredAction: 'ADD' }];
  assert.deepEqual(domainVerification({ requiredDnsUpdates: { desired: [{ records }] } }).dnsRecords, records);
});
test('deploy uploads gzip hashes, finalizes the version, and only then releases it', async () => {
  const calls = []; let expectedHash;
  const client = createHostingClient({ projectId: 'demo', token: async () => 'server-token', fetcher: async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer server-token'); calls.push(url);
    if (url.endsWith('/versions')) return Response.json({ name: 'sites/site/versions/version-1' });
    if (url.endsWith(':populateFiles')) {
      expectedHash = JSON.parse(options.body).files['/index.html'];
      return Response.json({ uploadUrl: 'https://upload-firebasehosting.googleapis.com/upload/sites/site/versions/version-1/files', uploadRequiredHashes: [expectedHash] });
    }
    if (url.startsWith('https://upload-')) {
      assert.equal(createHash('sha256').update(options.body).digest('hex'), expectedHash);
      assert.equal(gunzipSync(options.body).toString(), '<h1>Live</h1>'); return new Response('');
    }
    if (options.method === 'PATCH') { assert.equal(JSON.parse(options.body).status, 'FINALIZED'); return Response.json({}); }
    return Response.json({ name: 'sites/site/releases/release-1' });
  } });
  const result = await client.deploy('site', { '/index.html': '<h1>Live</h1>' });
  assert.equal(result.url, 'https://site.web.app'); assert.ok(calls.at(-1).includes('/releases?'));
});
test('failed uploads never finalize or create a release', async () => {
  const calls = [];
  const client = createHostingClient({ projectId: 'demo', token: async () => 'token', fetcher: async (url, options) => {
    calls.push(url);
    if (url.endsWith('/versions')) return Response.json({ name: 'sites/site/versions/v1' });
    if (url.endsWith(':populateFiles')) return Response.json({ uploadUrl: 'https://upload-firebasehosting.googleapis.com/files', uploadRequiredHashes: Object.values(JSON.parse(options.body).files) });
    return new Response('', { status: 500 });
  } });
  await assert.rejects(client.deploy('site', { '/index.html': 'hello' }), /uploaded/);
  assert.equal(calls.some(url => url.includes('/releases?') || url.includes('updateMask')), false);
});


test('ACME failures show actionable guidance, certificate DNS records and conflicting record removals', () => {
  const add = { domainName: '_acme-challenge.example.com.', type: 'TXT', rdata: 'token', requiredAction: 'ADD' };
  const remove = { domainName: 'example.com.', type: 'AAAA', rdata: '::1', requiredAction: 'REMOVE' };
  const result = domainVerification({ hostState: 'HOST_ACTIVE', ownershipState: 'OWNERSHIP_ACTIVE', cert: {
    state: 'CERT_VALIDATING', issues: [{ message: "One or more of Hosting's HTTP GET request for the ACME challenge failed: private provider details" }],
    verification: { dns: { desired: [{ records: [add] }] } },
  }, requiredDnsUpdates: { discovered: [{ records: [remove, { ...remove, requiredAction: 'NONE' }] }] } });
  assert.equal(result.status, 'Pending');
  assert.deepEqual(result.dnsRecords, [remove, add]);
  assert.ok(result.issues[0].includes('remove only the conflicting A/AAAA'));
  assert.ok(!result.issues[0].includes('private provider details'));
});

test('a failed creation operation retains a provisioned domain and its DNS instructions', async () => {
  let reads = 0;
  const client = createHostingClient({ projectId: 'demo', token: async () => 'token', fetcher: async (_, options) => {
    if (options.method === 'POST') return Response.json({ done: true, error: { message: 'ACME challenge failed' } });
    if (++reads === 1) return Response.json({ error: { message: 'Missing' } }, { status: 404 });
    return Response.json({ cert: { state: 'CERT_VALIDATING' }, requiredDnsUpdates: { desired: [] } });
  } });
  const result = await client.connectDomain('site', 'example.com');
  assert.equal(domainVerification(result).status, 'Pending');
  assert.equal(reads, 2);
});
