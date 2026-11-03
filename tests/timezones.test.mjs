import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const zones = JSON.parse(fs.readFileSync(new URL('../src/utils/timezones.json', import.meta.url), 'utf8'));
function load(runtime = Intl) {
  const exports = {};
  const source = fs.readFileSync(new URL('../src/utils/timezones.ts', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: () => ({ __esModule: true, default: zones }), Intl: runtime });
  return exports.getTimeZoneOptions;
}
test('timezone catalog covers world regions with unique, valid IANA identifiers', () => {
  const options = load()();
  assert.ok(options.length > 350); assert.equal(options[0].value, 'UTC');
  assert.equal(new Set(options.map(o => o.value)).size, options.length);
  for (const value of ['Africa/Cairo', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Pacific/Auckland']) assert.ok(options.some(o => o.value === value));
  for (const option of options) assert.doesNotThrow(() => new Intl.DateTimeFormat('en', { timeZone: option.value }));
});
test('older browsers retain the full catalog and valid saved aliases', () => {
  const options = load({ DateTimeFormat: Intl.DateTimeFormat })('Etc/UTC');
  assert.ok(options.length > 350); assert.ok(options.some(o => o.value === 'Etc/UTC'));
  assert.equal(load()('invalid/zone').some(o => o.value === 'invalid/zone'), false);
});
