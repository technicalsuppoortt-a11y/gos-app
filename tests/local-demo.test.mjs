import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const storage = new Map();
let blocked = false;
const state = { auth: { user: { id: 'alice' }, tenant: { id: 'workspace-a' } } };
function load(file, env = { DEV: true }) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8').replaceAll('import.meta.env', '__env');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, __env: env, crypto, Error, localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => { if (blocked) throw Error('Quota exceeded'); storage.set(key, value); },
  }, require: id => {
    if (id === '../store') return { store: { getState: () => state } };
    if (id === 'react' || id === 'react-redux') return {};
    if (id.endsWith('.jpg')) return { default: id };
    throw Error(`Unexpected dependency ${id}`);
  } }, { filename: file });
  return exports;
}
const demo = load('../src/backend/localDemo.ts');
const fixtures = load('../src/pages/inbox/inboxData.ts');
const samples = fixtures.demoConversations('Alex Morgan');
assert.equal(samples.length, 3);
assert.equal(new Set(samples.map(thread => thread.channel)).size, 3);
assert.ok(samples.every(thread => thread.avatar && thread.messages.length >= 5 && thread.activity.length && thread.email.endsWith('@example.com')));
assert.ok(samples.some(thread => thread.messages.some(message => message.sender === 'note')));
assert.ok(samples.some(thread => thread.unread > 0));
assert.ok(samples.every(thread => thread.assignee === 'Alex Morgan'));
assert.equal(fixtures.demoReplyTemplates.length, 3);
assert.equal(new Set(Array.from({ length: 10 }, () => fixtures.makeId('a'))).size, 10);
assert.equal(storage.size, 0, 'Reading sample data does not seed real or local records');

const request = (path, body, method = body === undefined ? 'GET' : 'POST') => demo.demoIntegrationRequest(path, body, method);
assert.equal(request('/integrations/whatsapp').status, 'Not Connected');
assert.equal(request('/integrations/whatsapp/authorize', {}).status, 'Connected');
assert.equal(request('/integrations/whatsapp/test', {}).ok, true);
request('/integrations/whatsapp/settings', { sync: false }, 'PATCH');
assert.equal(request('/integrations/whatsapp').sync, false);
const reloaded = load('../src/backend/localDemo.ts');
assert.equal(reloaded.demoIntegrationRequest('/integrations/whatsapp', undefined, 'GET').status, 'Connected', 'Connections survive module/page reload');
assert.ok(request('/integrations/logs').entries.length > 0);
demo.writeDemo('inbox', samples.map((thread, index) => index ? thread : { ...thread, messages: [...thread.messages, { id: crypto.randomUUID(), sender: 'agent', text: 'Demo reply', time: 'Just now' }] }));
assert.equal(reloaded.readDemo('inbox', [])[0].messages.at(-1).text, 'Demo reply');
assert.ok([...storage.keys()].every(key => key.startsWith('gos-local-demo-v1:workspace-a:alice:')));

state.auth.tenant.id = 'workspace-b';
assert.equal(request('/integrations/whatsapp').status, 'Not Connected');
assert.equal(demo.readDemo('inbox', []).length, 0);
state.auth.tenant.id = 'workspace-a';
state.auth.user.id = 'bob';
assert.equal(request('/integrations/whatsapp').status, 'Not Connected', 'Do not leak demo connections between users');
state.auth.user.id = 'alice';
assert.equal(request('/integrations/whatsapp', undefined, 'DELETE').status, 'Not Connected');
assert.equal(request('/integrations/whatsapp/test', {}).ok, false);
assert.throws(() => request('/integrations/whatsapp/settings', { sync: true }, 'PATCH'), /Connect this demo channel first/);
storage.set(demo.demoStorageKey('integrations'), '{broken json');
assert.equal(request('/integrations/whatsapp').status, 'Not Connected');
blocked = true;
assert.equal(request('/integrations/meta/authorize', {}).status, 'Connected');
assert.equal(request('/integrations/meta').status, 'Connected', 'Blocked localStorage still supports a session-only demo');
blocked = false;

assert.equal(load('../src/backend/localDemo.ts', { DEV: false }).localDemoEnabled, false);
const production = load('../src/backend/localDemo.ts', { DEV: false });
assert.equal(production.demoIntegrationRequest('/integrations/meta/authorize', {}, 'POST'), undefined);
assert.equal(load('../src/backend/localDemo.ts', { DEV: true, VITE_LOCAL_DEMO: 'false' }).localDemoEnabled, false);
assert.equal(load('../src/backend/localDemo.ts', { DEV: false, VITE_LOCAL_DEMO: 'true' }).localDemoEnabled, true);
console.log('PASS rich fixtures, simulated integration lifecycle, storage persistence, workspace/user isolation, blocked/corrupt storage recovery and production opt-in');
