import test from 'node:test';
import assert from 'node:assert/strict';
import { queryIndexedKnowledge, readAgent, validateAgent, defaultAgent } from '../ai-knowledge.js';

test('shared retrieval queries the indexed API with the authenticated caller and preserves grounding', async () => {
  const result = await queryIndexedKnowledge({ authorization: 'Bearer caller-token', question: 'What services are offered?', fetcher: async (url, options) => {
    assert.equal(url, 'https://gos-api.vercel.app/api/v1/ai/playground');
    assert.equal(options.headers.Authorization, 'Bearer caller-token');
    assert.deepEqual(JSON.parse(options.body), { question: 'What services are offered?' });
    assert.equal('X-Tenant-ID' in options.headers, false);
    return Response.json({ success: true, data: { test: { answer: 'Coaching in Cairo.', citations: [{ source_id: 'indexed-file-1', chunk_id: 'chunk-2' }], outcome: 'answered' } } });
  } });
  assert.equal(result.answer, 'Coaching in Cairo.');
  assert.equal(result.citations[0].chunk_id, 'chunk-2');
});
test('retrieval fails closed on missing authentication, API rejection or malformed grounding', async () => {
  await assert.rejects(queryIndexedKnowledge({ question: 'Hello', fetcher: () => { throw new Error('must not call'); } }), /Sign in/);
  for (const response of [Response.json({ error: 'forbidden' }, { status: 403 }), Response.json({ data: {} }), Response.json({ success: false, data: { test: { answer: 'unsafe' } } })]) {
    await assert.rejects(queryIndexedKnowledge({ authorization: 'Bearer token', question: 'Hello', fetcher: async () => response }), /retrieval failed/);
  }
});

function rootWith(config, legacy) {
  const reads = [];
  return { reads, collection: name => ({ doc: id => ({ get: async () => {
    reads.push([name, id]);
    const value = name === 'configuration' ? config : legacy;
    return { exists: value !== undefined, data: () => value };
  } }) }) };
}
test('agent reads use canonical workspace configuration ahead of legacy state', async () => {
  const saved = { ...defaultAgent, name: 'Sales team', role: 'Advisor', goal: 'Qualify prospects', updatedBy: 'staff' };
  const root = rootWith(saved, { value: defaultAgent });
  assert.deepEqual(await readAgent(root), validateAgent(saved));
  assert.deepEqual(root.reads, [['configuration', 'agent']]);
});
test('tenant-scoped legacy profiles migrate, invalid legacy values use defaults', async () => {
  const legacy = { ...defaultAgent, name: 'Existing assistant' };
  assert.deepEqual(await readAgent(rootWith(undefined, { value: legacy })), legacy);
  assert.deepEqual(await readAgent(rootWith(undefined, { value: { role: 12 } })), defaultAgent);
  assert.deepEqual(await readAgent(rootWith(undefined, undefined)), defaultAgent);
});
test('agent validation rejects empty, non-string and oversized fields and strips extra fields', () => {
  for (const role of ['', 42, 'x'.repeat(501)]) assert.throws(() => validateAgent({ ...defaultAgent, role }), /valid assistant/);
  assert.deepEqual(validateAgent({ ...defaultAgent, name: '  Assistant  ', tenantId: 'other' }), { ...defaultAgent, name: 'Assistant' });
});
