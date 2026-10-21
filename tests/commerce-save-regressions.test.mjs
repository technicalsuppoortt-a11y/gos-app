import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

function load(path, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => { if (id in mocks) return mocks[id]; throw Error(id); }, crypto: webcrypto, URL });
  return exports;
}
const { createResilientStorage } = load('../src/utils/browserStorage.ts');
const model = load('../src/pages/commerce/model.ts');
function settings(storage, browserStorage = createResilientStorage(() => undefined)) {
  return load('../src/pages/commerce/workspacePreferences.ts', { '../../backend/workspace': { cloudStorage: storage }, '../../utils/browserStorage': { browserStorage } });
}

test('settings await persistence and write a separate workspace settings key', async () => {
  const values = new Map(); let finish;
  const api = settings({ getItem: key => values.get(key) ?? null, setItem: (key, value) => new Promise(resolve => { finish = () => { values.set(key, value); resolve(); }; }) });
  const prefs = { ...api.defaultWorkspacePreferences, paypal: false };
  let saved = false;
  const pending = api.saveWorkspacePreferences('tenant-a', prefs).then(() => { saved = true; });
  assert.equal(saved, false); finish(); await pending;
  assert.deepEqual(JSON.parse(JSON.stringify(api.readWorkspacePreferences('tenant-a'))), prefs);
  assert.ok(values.has('tenant-a:settings'));
});
test('synchronous storage failures and asynchronous unavailability preserve scoped preferences in memory', async () => {
  for (const setItem of [() => { throw Object.assign(Error('SecurityError'), { code: 18 }); }, async () => { throw Object.assign(Error('Offline'), { code: 'unavailable' }); }]) {
    const api = settings({ getItem: () => null, setItem }, createResilientStorage(() => { throw Error('Storage blocked'); }));
    const prefs = { ...api.defaultWorkspacePreferences, stripe: false };
    await api.saveWorkspacePreferences('tenant-a', prefs);
    assert.deepEqual(JSON.parse(JSON.stringify(api.readWorkspacePreferences('tenant-a'))), prefs);
    assert.equal(api.readWorkspacePreferences('tenant-b').stripe, true);
  }
});
test('validation and backend authorization errors remain failures', async () => {
  let writes = 0;
  const api = settings({ getItem: () => null, setItem: async () => { writes++; throw Object.assign(Error('Permission denied'), { code: 'permission-denied' }); } });
  await assert.rejects(api.saveWorkspacePreferences('tenant', { ...api.defaultWorkspacePreferences, taxRate: 101 }), /Tax rate/);
  assert.equal(writes, 0);
  await assert.rejects(api.saveWorkspacePreferences('tenant', api.defaultWorkspacePreferences), /Permission denied/);
});
test('fresh products have blank content, price and no generated curriculum for every supported type', () => {
  for (const type of ['Course', 'Digital Product', 'Service']) {
    const product = model.hydrateProduct({ ...model.newProduct(), type, config: model.defaultConfig(type) });
    assert.equal(product.name, ''); assert.equal(product.description, ''); assert.equal(product.price, '');
    assert.equal(product.config.modules.length, 0); assert.equal(product.config.assets.length, 0);
    assert.equal(product.config.experience.instructor.name, '');
  }
});
test('editing a draft does not write preview snapshots until Preview is explicitly opened', () => {
  const writes = [];
  const snapshots = load('../src/pages/commerce/previewSnapshot.ts', { '../../utils/browserStorage': { browserStorage: { getItem: () => null, setItem: (...args) => writes.push(args) } }, react: { useState: initial => [initial()], useCallback: callback => callback }, './repository': { storageKey: () => 'tenant' } });
  const preview = snapshots.useProductPreview(model.newProduct(), message => { throw Error(message); });
  assert.equal(writes.length, 0);
  preview.prepare(); assert.equal(writes.length, 1);
});
test('settings and order drafts never resolve to the product collection', () => {
  const source = fs.readFileSync(new URL('../src/backend/workspace.tsx', import.meta.url), 'utf8');
  const fn = source.match(/function entityFor\(key: string\): string \| undefined \{[\s\S]*?\n\}/)[0];
  const { entityFor } = (() => {
    const exports = {};
    vm.runInNewContext(ts.transpileModule('export ' + fn, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports }); return exports;
  })();
  assert.equal(entityFor('gos-commerce-products-v1:tenant'), 'products');
  for (const suffix of [':settings', ':order-drafts', ':preview:token']) assert.equal(entityFor('gos-commerce-products-v1:tenant' + suffix), undefined);
});
