import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/backend/gosTransport.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const { createGosTransport } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const response = data => Response.json({ success: true, data });

test('authenticated smoke flow verifies token, posts concrete text, then polls list until ready', async () => {
  const content = fs.readFileSync(new URL('./fixtures/gos-coaching-notes.txt', import.meta.url), 'utf8');
  const calls = [];
  let reads = 0;
  const api = createGosTransport('https://gos-api.vercel.app/', async () => 'firebase-test-token', async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.get('Authorization'), 'Bearer firebase-test-token');
    assert.equal(options.headers.get('X-Tenant-ID'), null);
    if (url.endsWith('/auth/me')) return response({ user: { id: 'test' } });
    if (options.method === 'POST') {
      assert.deepEqual(JSON.parse(options.body), { name: 'Coaching notes', type: 'text', content });
      return response({ source: { id: 'source-1', status: 'queued' } });
    }
    return response({ sources: [{ id: 'source-1', status: ++reads === 1 ? 'processing' : 'ready', chunk_count: reads === 1 ? 0 : 1 }] });
  });
  await api('/auth/me');
  assert.equal((await api('/ai/sources', { method: 'POST', body: { name: 'Coaching notes', type: 'text', content } })).source.status, 'queued');
  assert.equal((await api('/ai/sources')).sources[0].status, 'processing');
  assert.equal((await api('/ai/sources')).sources[0].status, 'ready');
  assert.equal(calls[0], 'https://gos-api.vercel.app/api/v1/auth/me');
});
test('multipart sends file bytes without overriding browser boundary', async () => {
  const form = new FormData();
  form.append('name', 'Coaching notes'); form.append('type', 'file');
  form.append('file', new Blob(['Sessions are in Cairo.']), 'notes.txt');
  const api = createGosTransport('https://example.com', async () => 'token', async (_, options) => {
    assert.equal(options.body, form); assert.equal(options.headers.get('Content-Type'), null);
    assert.equal(await options.body.get('file').text(), 'Sessions are in Cairo.');
    return response({ source: { id: 'file-1', status: 'queued' } });
  });
  await api('/ai/sources', { method: 'POST', body: form });
});
test('401 refreshes the Firebase token once and retries with the same body', async () => {
  const refreshes = []; let requests = 0;
  const api = createGosTransport('https://example.com', async refresh => { refreshes.push(refresh); return refresh ? 'fresh' : 'old'; }, async (_, options) => {
    if (++requests === 1) return new Response('', { status: 401 });
    assert.equal(options.headers.get('Authorization'), 'Bearer fresh');
    return response({ assistant: { live_enabled: false } });
  });
  await api('/ai/assistant'); assert.deepEqual(refreshes, [false, true]);
});
test('does not repeatedly retry a rejected token', async () => {
  let requests = 0;
  const api = createGosTransport('https://example.com', async () => 'token', async () => { requests++; return Response.json({ error: { message: 'Invalid token' } }, { status: 401 }); });
  await assert.rejects(api('/auth/me'), /Invalid token/); assert.equal(requests, 2);
});
test('public health requires no token', async () => {
  const api = createGosTransport('https://example.com', async () => { throw new Error('must not authenticate'); }, async (_, options) => {
    assert.equal(options.headers.get('Authorization'), null); return response({ status: 'ok' });
  });
  assert.equal((await api('/health', { public: true })).status, 'ok');
});
test('validation, malformed responses and network errors become usable errors', async () => {
  const invalid = createGosTransport('https://example.com', async () => 'token', async () => Response.json({ errors: { file: ['Choose a valid file.'] } }, { status: 422 }));
  await assert.rejects(invalid('/ai/sources'), /Choose a valid file/);
  const malformed = createGosTransport('https://example.com', async () => 'token', async () => new Response('<html>error</html>'));
  await assert.rejects(malformed('/ai/sources'), /unexpected response/);
  const offline = createGosTransport('https://example.com', async () => 'token', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(offline('/ai/sources'), /Cannot reach the GOS API/);
});
test('supports CSV exports and cancellation', async () => {
  const csv = createGosTransport('https://example.com', async () => 'token', async () => new Response('name,email\nSarah,sarah@example.com'));
  assert.match(await csv('/crm/leads/export', { csv: true }), /^name,email/);
  const controller = new AbortController(); controller.abort();
  const api = createGosTransport('https://example.com', async () => 'token', async (_, { signal }) => { signal.throwIfAborted(); });
  await assert.rejects(api('/ai/sources', { signal: controller.signal }), { name: 'AbortError' });
});

test('API failures preserve status and machine-readable lead_not_found codes', async () => {
  const api = createGosTransport('https://example.com', async () => 'token', async () => Response.json({ error: { code: 'lead_not_found', message: 'Lead not found' } }, { status: 404 }));
  await assert.rejects(api('/crm/leads/booking-1'), error => error.status === 404 && error.code === 'lead_not_found' && error.message === 'Lead not found');
});
