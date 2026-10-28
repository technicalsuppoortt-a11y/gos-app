import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, require) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText, { exports, require, setTimeout, clearTimeout, AbortSignal, AbortController, Headers, FormData, fetch });
  return exports;
}
test('hybrid API mutations stop before network delivery when Firebase disables the tool', async () => {
  let plan = 'Starter', calls = 0, policyError = null;
  const policyHelpers = load('src/backend/toolPolicy.ts', () => { throw Error('Unexpected policy import'); });
  const tools = { 'ai-followup': { enabled: false, status: 'Disabled', accessTier: 'all' }, 'crm-pipeline': { enabled: true, status: 'Active', accessTier: 'agency_only' } };
  const { checkGosToolPolicy } = load('src/backend/gosToolPolicy.ts', name => name === './toolPolicy' ? policyHelpers : name === './firebase' ? { db: {}, auth: { authStateReady: async () => {}, currentUser: { uid: 'user' } } } : { doc: (_, ...path) => path.join('/'), getDoc: async path => { if (path.startsWith('settings') && policyError) throw policyError; return ({ data: () => path.startsWith('settings') ? { tools } : path.startsWith('users') ? { tenantId: 'workspace' } : { plan } }); } });
  const { createGosTransport } = load('src/backend/gosTransport.ts', () => { throw new Error('Unexpected import'); });
  const request = createGosTransport('https://example.test', async () => 'fixture-token', async () => { calls++; return { ok: true, status: 200, json: async () => ({ data: { ok: true } }) }; }, checkGosToolPolicy);
  await assert.rejects(request('/ai/assistant', { method: 'PUT', body: { live_enabled: true } }), /unavailable/);
  assert.equal(calls, 0);
  tools['ai-followup'] = { enabled: true, status: 'Active', accessTier: 'all' };
  await request('/ai/assistant', { method: 'PUT', body: { live_enabled: true } });
  assert.equal(calls, 1);
  await assert.rejects(request('/crm/leads', { method: 'POST', body: { name: 'Lead' } }), /workspace plan/);
  assert.equal(calls, 1);
  plan = 'Agency';
  await request('/crm/leads', { method: 'POST', body: { name: 'Lead' } });
  assert.equal(calls, 2);
  // Reading existing records still uses the original service contract.
  tools['ai-followup'].enabled = false;
  await request('/ai/assistant');
  assert.equal(calls, 3);
  policyError = { code: 'permission-denied' };
  await request('/ai/assistant', { method: 'PUT', body: { live_enabled: true } });
  assert.equal(calls, 4, 'Missing auxiliary rules must not block the authenticated external API');
  policyError = { code: 'unavailable' };
  await request('/crm/leads', { method: 'POST', body: { name: 'Lead' } });
  assert.equal(calls, 5);
  policyError = null;
  tools['ai-followup'].enabled = true;
  tools['ai-followup'].status = 'Active';
  tools['ai-followup'].accessTier = 'agency_only';
  plan = '';
  await request('/ai/assistant', { method: 'PUT', body: { live_enabled: true } });
  assert.equal(calls, 6, 'Missing plan projection preserves the existing API authorization');
});
