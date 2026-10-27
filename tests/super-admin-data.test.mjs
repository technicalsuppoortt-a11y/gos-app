import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function harness(raw, blocked = false) {
  const values = new Map(raw === undefined ? [] : [['upclick.super-admin.mock.v1', raw]]);
  const code = ts.transpileModule(fs.readFileSync('src/pages/super-admin/adminData.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({ useSyncExternalStore: (_subscribe, read) => read() }), structuredClone, crypto: { randomUUID: () => String(Math.random()) }, localStorage: { getItem: key => { if (blocked) throw Error('blocked'); return values.get(key); }, setItem: (key, value) => { if (blocked) throw Error('blocked'); values.set(key, value); } }, Intl, Date, Number, Set, Map });
  return { ...exports, values };
}
test('malformed and incomplete storage recovers without breaking admin screens', () => {
  for (const raw of ['{', 'null', '{}', JSON.stringify({ version: 1, clients: [] })]) {
    const h = harness(raw); assert.equal(h.readAdminData().clients.length, 12); assert.ok(h.useAdminData().storageWarning);
  }
});
test('admin mutations persist, audit changes and leave foreign storage untouched', () => {
  const h = harness(); h.values.set('user.workspace', 'untouched');
  h.updateAdminData('Suspended client', d => { d.clients[0].status = 'Suspended'; });
  assert.equal(h.readAdminData().clients[0].status, 'Suspended');
  assert.equal(h.readAdminData().logs[0].action, 'Suspended client');
  assert.equal(h.values.get('user.workspace'), 'untouched');
  const reloaded = harness(h.values.get(h.ADMIN_KEY)); assert.equal(reloaded.readAdminData().clients[0].status, 'Suspended');
});
test('blocked storage keeps updates in memory and exposes a warning', () => {
  const h = harness(undefined, true); h.updateAdminData('Settings', d => { d.settings.name = 'Changed'; });
  assert.equal(h.readAdminData().settings.name, 'Changed'); assert.match(h.useAdminData().storageWarning, /session only/);
});
test('invalid updates and owner removal cannot corrupt the last valid snapshot', () => {
  const h = harness();
  assert.throws(() => h.updateAdminData('bad', d => { d.clients[0].monthly = NaN; }));
  assert.throws(() => h.updateAdminData('bad', d => { d.members = []; }));
  assert.equal(h.readAdminData().members[0].role, 'Owner'); assert.equal(h.readAdminData().logs.length, 3);
});
