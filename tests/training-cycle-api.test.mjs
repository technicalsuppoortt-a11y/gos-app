import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }).outputText;
const transportExports = {};
new Function('exports', compile(readFileSync('src/backend/gosTransport.ts', 'utf8')))(transportExports);

test('Training Cycle API methods preserve auth, payloads, multipart boundaries and encoded IDs', async () => {
  const requests = [], tokens = [];
  const fetcher = async (url, options) => {
    requests.push({ url, ...options });
    return Response.json({ success: true, data: {} });
  };
  const apiExports = {};
  const source = readFileSync('src/backend/gosApi.ts', 'utf8').replace("import.meta.env.VITE_GOS_API_BASE_URL || 'https://gos-api.vercel.app'", "'https://gos-api.vercel.app'");
  const dependencies = {
    './firebase': { auth: { authStateReady: async () => {}, currentUser: { getIdToken: async refresh => { tokens.push(refresh); return 'qa-token'; } } } },
    './gosTransport': { ...transportExports, createGosTransport: (base, provider) => transportExports.createGosTransport(base, provider, fetcher) },
    './gosToolPolicy': { checkGosToolPolicy: async () => {} },
  };
  new Function('require', 'exports', compile(source))(name => dependencies[name], apiExports);
  const { gosApi } = apiExports;
  const form = new FormData(); form.append('name', 'Notes'); form.append('type', 'file'); form.append('file', new Blob(['Support hours']), 'notes.txt');
  await gosApi.createSource(form);
  await gosApi.createSource({ name: 'Notes', type: 'text', content: 'Support hours' });
  await gosApi.createSource({ name: 'Website', type: 'url', url: 'https://example.com' });
  await gosApi.training();
  await gosApi.source('source/id');
  await gosApi.ask('When?', { channel: 'whatsapp', city: 'Cairo' });
  await gosApi.ask('And Sunday?', { session_id: 'session-1', source_id: 'source-1' });
  await gosApi.channels();
  await gosApi.updateChannel('webchat', true);
  await gosApi.updateAssistant({ live_enabled: true, channels: { webchat: true } });
  await gosApi.receiveMessage({ channel: 'webchat', external_thread_id: 'thread-1', external_message_id: 'event-1', customer_name: 'QA', body: 'Hello' });
  assert.equal(requests.length, 11);
  for (const request of requests) {
    assert.equal(request.headers.get('Authorization'), 'Bearer qa-token');
    assert.ok(request.url.startsWith('https://gos-api.vercel.app/api/v1/'));
  }
  assert.equal(tokens.length, 11);
  assert.equal(requests[0].headers.get('Content-Type'), null);
  assert.equal(requests[0].body, form);
  assert.deepEqual(JSON.parse(requests[2].body), { name: 'Website', type: 'url', url: 'https://example.com' });
  assert.ok(requests[3].url.endsWith('/ai/training'));
  assert.ok(requests[4].url.endsWith('/ai/sources/source%2Fid'));
  assert.deepEqual(JSON.parse(requests[5].body), { question: 'When?', channel: 'whatsapp', city: 'Cairo' });
  assert.deepEqual(JSON.parse(requests[6].body), { question: 'And Sunday?', session_id: 'session-1', source_id: 'source-1' });
  assert.ok(requests[7].url.endsWith('/ai/channels'));
  assert.equal(requests[8].method, 'PUT');
  assert.deepEqual(JSON.parse(requests[8].body), { enabled: true });
  assert.deepEqual(JSON.parse(requests[9].body), { live_enabled: true, channels: { webchat: true } });
  assert.ok(requests[10].url.endsWith('/inbox/messages'));
});
