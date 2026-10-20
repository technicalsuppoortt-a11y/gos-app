import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';

async function load(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const { createResilientStorage } = await load('../src/utils/browserStorage.ts');
const { encodeFirestoreValue, decodeFirestoreValue } = await load('../src/backend/firestoreCodec.ts');
const { createAssetPersistence, workspaceWrites } = await load('../src/backend/assetPersistence.ts');
const { duplicateBuilderPage } = await load('../src/pages/builder-integrity.ts');

test('throwing storage getters and missing browser storage retain drafts without exceptions', () => {
  for (const resolve of [() => undefined, () => { throw new Error('SecurityError'); }]) {
    const storage = createResilientStorage(resolve);
    storage.setItem('draft', 'latest'); assert.equal(storage.getItem('draft'), 'latest');
    assert.equal(storage.length, 1); assert.equal(storage.key(0), 'draft');
    storage.removeItem('draft'); assert.equal(storage.getItem('draft'), null);
  }
});
test('quota failures never resurrect old values, including deletes and clear', () => {
  const native = new Map([['draft', 'old'], ['other', 'old']]);
  const storage = createResilientStorage(() => ({ getItem: key => native.get(key) ?? null, setItem() { throw new Error('QuotaExceededError'); }, removeItem() { throw new Error('SecurityError'); }, clear() { throw new Error('SecurityError'); }, get length() { return native.size; }, key: index => [...native.keys()][index] ?? null }));
  assert.equal(storage.getItem('draft'), 'old');
  storage.setItem('draft', 'new'); assert.equal(storage.getItem('draft'), 'new');
  storage.removeItem('draft'); assert.equal(storage.getItem('draft'), null);
  storage.clear(); assert.equal(storage.getItem('other'), null); assert.equal(storage.length, 0);
  storage.setItem('new', 'retained'); assert.equal(storage.getItem('new'), 'retained');
});
test('a successful native read reflects changes and removals from another tab', () => {
  const values = new Map();
  const storage = createResilientStorage(() => ({ getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), get length() { return values.size; }, key: index => [...values.keys()][index] ?? null }));
  storage.setItem('draft', 'first'); values.set('draft', 'remote'); assert.equal(storage.getItem('draft'), 'remote');
  values.delete('draft'); assert.equal(storage.length, 0); assert.equal(storage.getItem('draft'), null);
});
test('builder column arrays fail native Firestore validation but encoded trees round-trip', async () => {
  const tree = { document: { pages: [{ id: 'home', sections: [{ id: 'columns', children: [[{ id: 'nested', children: [[], [{ id: 'heading', content: { title: 'Saved' } }]] }], []] }] }] } };
  const app = initializeApp({ projectId: 'demo-gos-resilience' }, 'codec-test');
  try {
    const db = getFirestore(app), ref = doc(db, 'tenants', 'test', 'assets', 'tree');
    assert.throws(() => writeBatch(db).set(ref, tree), /Nested arrays/);
    const encoded = encodeFirestoreValue(tree);
    assert.doesNotThrow(() => writeBatch(db).set(ref, encoded));
    assert.deepEqual(decodeFirestoreValue(encoded), tree);
    let deep = { id: 'leaf', content: { title: 'Deeply nested' } };
    for (let i = 0; i < 25; i++) deep = { id: `column-${i}`, children: [[deep]] };
    const deepEncoded = encodeFirestoreValue(deep);
    assert.doesNotThrow(() => writeBatch(db).set(ref, deepEncoded));
    assert.deepEqual(decodeFirestoreValue(deepEncoded), deep);
    assert.deepEqual(decodeFirestoreValue({ legacy: [1, { name: 'unchanged' }] }), { legacy: [1, { name: 'unchanged' }] });
  } finally { await deleteApp(app); }
});

const empty = () => ({ assets: [], domains: [] });
test('repeated page duplication keeps independent trees and unique IDs, names and URLs', () => {
  const original = { id: 'home', name: 'Home', path: '/', sections: [{ id: 'hero', content: { title: 'Original' } }] };
  const first = duplicateBuilderPage(original, [original]);
  const second = duplicateBuilderPage(original, [original, first]);
  assert.notEqual(first.id, second.id); assert.notEqual(first.path, second.path); assert.notEqual(first.name, second.name);
  assert.equal(first.path, '/copy'); assert.equal(second.path, '/copy-2');
  first.sections[0].content.title = 'Changed'; assert.equal(original.sections[0].content.title, 'Original');
});
function harness(commit) {
  let value = empty(), scope = 'tenant-a';
  const calls = [];
  const persistence = createAssetPersistence({ scope: () => scope, read: () => value, publish: next => { value = next; }, commit: async (tenant, writes) => { calls.push({ tenant, writes }); await commit?.(tenant, writes); } });
  return { persistence, calls, value: () => value, scope: next => { scope = next; } };
}
test('asset/domain bindings use one operation and rapid edits commit in order', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let count = 0;
  const h = harness(async () => { if (++count === 1) await gate; });
  const first = { assets: [{ id: 'asset', name: 'First', domain: 'www.example.com' }], domains: [{ id: 'domain', name: 'www.example.com', assetId: 'asset' }] };
  const last = structuredClone(first); last.assets[0].name = 'Latest';
  const a = h.persistence.save(first), b = h.persistence.save(last);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.persistence.isProtected(), true); assert.equal(h.value().assets[0].name, 'Latest');
  release(); await Promise.all([a, b]);
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.calls[0].writes.map(write => write.resource), ['assets', 'domains']);
  assert.equal(h.calls[1].writes[0].value.name, 'Latest');
  assert.equal(h.persistence.isProtected(), false);
});
test('backend failures retain the draft, fail flush, and a later save retries the full draft', async () => {
  let fail = true;
  const h = harness(async () => { if (fail) throw new Error('permission-denied'); });
  const draft = { assets: [{ id: 'asset', name: 'Do not lose me' }], domains: [] };
  await assert.rejects(h.persistence.save(draft), /permission-denied/);
  assert.equal(h.value().assets[0].name, 'Do not lose me');
  assert.equal(h.persistence.isProtected(), true);
  await assert.rejects(h.persistence.flush(), /permission-denied/);
  fail = false; await h.persistence.save(draft); await h.persistence.flush();
  assert.equal(h.calls[1].writes[0].value.name, 'Do not lose me');
});
test('queued writes cannot leak into a changed workspace', async () => {
  const h = harness();
  const pending = h.persistence.save({ assets: [{ id: 'asset' }], domains: [] });
  h.scope('tenant-b'); h.persistence.reset();
  await assert.rejects(pending, /workspace changed/); assert.equal(h.calls.length, 0);
});
test('older listener snapshots preserve dirty edits while allowing unrelated remote records through', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = harness(async () => gate);
  const pending = h.persistence.save({ assets: [{ id: 'asset', name: 'Latest' }], domains: [] });
  const merged = h.persistence.mergeSnapshot('assets', [{ id: 'asset', name: 'Older' }, { id: 'remote', name: 'Other member' }]);
  assert.equal(merged.find(row => row.id === 'asset').name, 'Latest');
  assert.equal(merged.find(row => row.id === 'remote').name, 'Other member');
  release(); await pending;
});
test('invalid IDs and dangling domain bindings are rejected before mutation', () => {
  assert.throws(() => workspaceWrites(empty(), { assets: [{ id: '../other' }], domains: [] }), /valid ID/);
  assert.throws(() => workspaceWrites(empty(), { assets: [], domains: [{ id: 'domain', assetId: 'missing' }] }), /existing asset/);
});
