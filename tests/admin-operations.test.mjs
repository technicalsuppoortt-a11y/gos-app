import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { recordAIUsage } from '../functions/ai-usage.js';
function load(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: () => load('../src/utils/safeDate.ts'), Date, Number });
  return exports;
}
const { aggregateOperations, dateValue, tokenCount } = load('../src/pages/admin/operations-model.ts');
const row = (resource, id, data) => ({ id, path: `tenants/a/${resource}/${id}`, workspaceId: 'a', data });
test('revenue excludes pending and failed payments and preserves currency boundaries', () => {
  const stats = aggregateOperations([
    row('transactions', 'a', { amount: '100', currency: 'USD', status: 'Completed', createdAt: '2026-11-02' }),
    row('transactions', 'b', { amount: 200, currency: 'SAR', status: 'paid', createdAt: { seconds: 1793577600 } }),
    row('transactions', 'c', { amount: 700, currency: 'USD', status: 'Pending' }),
    row('transactions', 'd', { amount: 900, currency: 'USD', status: 'Failed' }),
    row('orders', 'duplicate', { total: 100, currency: 'USD', status: 'Completed' }),
  ]);
  assert.equal(stats.revenue.find(([c]) => c === 'USD')[1], 100);
  assert.equal(stats.revenue.find(([c]) => c === 'SAR')[1], 200);
  assert.equal(stats.trends.length, 2);
});
test('conversion denominator, unknown dates and invalid numbers remain honest', () => {
  assert.equal(aggregateOperations([]).conversion, null);
  const stats = aggregateOperations([row('leads', 'a', { stage: 'Won' }), row('leads', 'b', { lifecycleStage: 'New' }), row('aiUsage', 'c', { totalTokens: Infinity, inputTokens: 100, outputTokens: 25 })]);
  assert.equal(stats.conversion, 50); assert.equal(stats.tokens, 125);
  for (const value of ['invalid', { seconds: Infinity }, { seconds: 1e22 }, null, {}]) assert.equal(dateValue(value), '');
  assert.equal(tokenCount({ total_tokens: 80, input_tokens: 50, output_tokens: 30 }), 80);
});
test('AI telemetry is idempotent by provider response ID and stores no prompts', async () => {
  const writes = new Map();
  const root = { collection: name => { assert.equal(name, 'aiUsage'); return { doc: id => ({ set: async value => writes.set(id, value) }) }; } };
  const response = { id: 'resp_1', model: 'configured-model', usage: { input_tokens: 100, output_tokens: 20 }, output: 'private answer' };
  await recordAIUsage(root, response, 'copilot'); await recordAIUsage(root, response, 'copilot');
  assert.equal(writes.size, 1); assert.equal(writes.get('resp_1').totalTokens, 120);
  assert.equal('output' in writes.get('resp_1'), false);
  await recordAIUsage(root, {}, 'copilot'); assert.equal(writes.size, 1);
});
const { workspaceTheme } = load('../src/branding/workspaceTheme.ts');
function contrast(a, b) {
  const l = hex => { const c = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; };
  return (Math.max(l(a), l(b)) + .05) / (Math.min(l(a), l(b)) + .05);
}
test('every preset meets AA text and action contrast in light and dark modes', () => {
  for (const id of ['violet', 'slate', 'midnight', 'emerald']) for (const mode of ['light', 'dark']) {
    const p = workspaceTheme(id)[mode];
    assert.ok(contrast(p.text, p.background) >= 4.5, `${id} ${mode}: body`);
    assert.ok(contrast(p.mutedText, p.surface) >= 4.5, `${id} ${mode}: muted`);
    assert.ok(contrast('#ffffff', p.buttonBackground) >= 4.5, `${id} ${mode}: action`);
  }
});
