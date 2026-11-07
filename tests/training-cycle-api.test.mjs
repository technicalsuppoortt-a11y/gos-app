import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }).outputText;
const transportExports = {};
new Function('exports', compile(readFileSync('src/backend/gosTransport.ts', 'utf8')))(transportExports);

test('Training Cycle routes paid mutations through Firebase and preserves the payloads and REST reads', async () => {
  const requests = [], tokens = [], paid = [];
  const fetcher = async (url, options) => {
    requests.push({ url, ...options });
    return Response.json({ success: true, data: {} });
  };
  const apiExports = {};
  const source = readFileSync('src/backend/gosApi.ts', 'utf8').replace("import.meta.env.VITE_GOS_API_BASE_URL || 'https://gos-api.vercel.app'", "'https://gos-api.vercel.app'");
  const dependencies = {
    './firebase': {
      auth: { authStateReady: async () => {}, currentUser: { getIdToken: async refresh => { tokens.push(refresh); return 'qa-token'; } } },
      callBackend: async (name, data) => { paid.push({ name, ...data }); return {}; },
    },
    './gosTransport': { ...transportExports, createGosTransport: (base, provider) => transportExports.createGosTransport(base, provider, fetcher) },
    './gosToolPolicy': { checkGosToolPolicy: async () => {} },
  };
  const FileReader = class {
    async readAsDataURL(file) {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(await file.arrayBuffer()).toString('base64');
      this.onload();
    }
  };
  new Function('require', 'exports', 'FileReader', compile(source))(name => dependencies[name], apiExports, FileReader);
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
  await gosApi.updateAssistant({ live_enabled: false });
  await gosApi.receiveMessage({ channel: 'webchat', external_thread_id: 'thread-1', external_message_id: 'event-1', customer_name: 'QA', body: 'Hello' });
  await gosApi.updateChannel('whatsapp', true, { external_id: 'phone-1', access_token: 'token-1' });
  await gosApi.inboxSummary();
  assert.equal(requests.length, 7);
  for (const request of requests) {
    assert.equal(request.headers.get('Authorization'), 'Bearer qa-token');
    assert.ok(request.url.startsWith('https://gos-api.vercel.app/api/v1/'));
  }
  assert.equal(tokens.length, 7);
  assert.ok(requests[0].url.endsWith('/ai/training'));
  assert.ok(requests[1].url.endsWith('/ai/sources/source%2Fid'));
  assert.ok(requests[2].url.endsWith('/ai/channels'));
  assert.equal(requests[3].method, 'PUT');
  assert.deepEqual(JSON.parse(requests[3].body), { enabled: true });
  assert.deepEqual(JSON.parse(requests[4].body), { live_enabled: false });
  assert.ok(requests[5].url.endsWith('/ai/channels/whatsapp'));
  assert.deepEqual(JSON.parse(requests[5].body), { enabled: true, external_id: 'phone-1', access_token: 'token-1' });
  assert.ok(requests[6].url.endsWith('/inbox/summary'));
  assert.deepEqual(paid.map(row => row.action), ['source', 'source', 'source', 'playground', 'playground', 'liveEnable', 'inboxSimulation']);
  assert.ok(paid.every(row => row.name === 'agencyGosUsage'));
  assert.deepEqual(paid[0].payload, { name: 'Notes', type: 'file', file: { name: 'notes.txt', mime: '', data: Buffer.from('Support hours').toString('base64') } });
  assert.deepEqual(paid[2].payload, { name: 'Website', type: 'url', url: 'https://example.com' });
  assert.deepEqual(paid[3].payload, { question: 'When?', channel: 'whatsapp', city: 'Cairo' });
  assert.deepEqual(paid[4].payload, { question: 'And Sunday?', session_id: 'session-1', source_id: 'source-1' });
  assert.deepEqual(paid[5].payload, { live_enabled: true, channels: { webchat: true } });
  assert.equal(paid[6].payload.external_message_id, 'event-1');
});
