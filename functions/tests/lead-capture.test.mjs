import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { captureAssetLeadRequest, captureForms } from '../lead-capture.js';

const token = 'a'.repeat(43);
const document = { pages: [{ id: 'home', name: 'Home', sections: [{ id: 'columns', children: [{ gosNestedArrayV1: JSON.stringify([{ id: 'contact', type: 'Form' }]) }] }] }] };
const input = (extra = {}) => ({ tenantId: 'tenant-a', captureToken: token, assetId: 'asset', pageId: 'home', formId: 'contact', requestId: 'submission-1', name: 'Alex Morgan', email: 'ALEX@example.com', message: 'Please contact me', ...extra });
function fixture() {
  const records = new Map([
    ['tenants/tenant-a/assets/asset', { name: 'My website', kind: 'website', document }],
    ['tenants/tenant-a/hosting/asset', { captureTokenHash: createHash('sha256').update(token).digest('hex'), captureForms: captureForms(document) }],
  ]);
  const ref = path => ({ path, id: path.split('/').at(-1), collection: name => ({ doc: id => ref(`${path}/${name}/${id}`) }) });
  const db = { doc: ref, runTransaction: async fn => {
    const writes = []; let writing = false;
    const result = await fn({ get: async target => { assert.equal(writing, false); return { exists: records.has(target.path), data: () => structuredClone(records.get(target.path)) }; }, set: (target, value) => { writing = true; writes.push(() => records.set(target.path, structuredClone(value))); } });
    writes.forEach(write => write()); return result;
  } };
  const deps = { db, now: () => Date.parse('2026-10-20T12:00:00Z'), workspace: async request => {
    if (!request.auth) throw new Error('unauthenticated');
    return { root: ref('tenants/tenant-a'), user: { uid: 'staff' } };
  } };
  const capture = (data, extra = {}) => captureAssetLeadRequest({ data, rawRequest: { ip: '127.0.0.1' }, ...extra }, deps);
  return { records, capture };
}

test('published nested forms atomically create a CRM lead and attributed lead.captured event', async () => {
  const h = fixture(), result = await h.capture(input());
  const lead = h.records.get(`tenants/tenant-a/leads/${result.leadId}`);
  assert.equal(lead.name, 'Alex Morgan'); assert.equal(lead.email, 'alex@example.com');
  assert.equal(lead.message, 'Please contact me'); assert.equal(lead.sourceAssetId, 'asset');
  assert.equal(lead.stage, 'LEAD_CAPTURED'); assert.equal(lead.pipelineId, 'main');
  assert.equal(lead.hasEmailConsent, false);
  const event = h.records.get(`tenants/tenant-a/events/capture-${result.leadId}`);
  assert.equal(event.type, 'lead.captured'); assert.equal(event.resourceId, 'asset'); assert.equal(event.leadId, result.leadId);
});
test('retrying an accepted submission creates neither a duplicate lead nor another conversion', async () => {
  const h = fixture(); const first = await h.capture(input());
  assert.deepEqual(await h.capture(input()), first);
  assert.equal([...h.records.keys()].filter(path => path.includes('/leads/')).length, 1);
  assert.equal([...h.records.keys()].filter(path => path.includes('/events/')).length, 1);
  await assert.rejects(h.capture(input({ email: 'changed@example.com' })), /already been processed/);
});
test('public callers cannot forge tenant, capability, page or form attribution', async () => {
  for (const change of [{ tenantId: 'tenant-b' }, { captureToken: 'b'.repeat(43) }, { pageId: 'missing' }, { formId: 'missing' }, { email: 'invalid' }]) {
    const h = fixture(); await assert.rejects(h.capture(input(change)));
    assert.equal([...h.records.keys()].filter(path => path.includes('/leads/') || path.includes('/events/')).length, 0);
  }
});
test('preview submission requires membership and resolves tenant from authentication', async () => {
  const h = fixture();
  await assert.rejects(h.capture(input({ preview: true })), /unauthenticated/);
  const result = await h.capture(input({ preview: true, tenantId: 'tenant-b', captureToken: '' }), { auth: { uid: 'staff' } });
  assert.equal(h.records.get(`tenants/tenant-a/leads/${result.leadId}`).preview, true);
  assert.equal([...h.records.keys()].some(path => path.startsWith('tenants/tenant-b/')), false);
});
test('archived forms and request bursts cannot create additional leads', async () => {
  const archived = fixture(); archived.records.get('tenants/tenant-a/assets/asset').archived = true;
  await assert.rejects(archived.capture(input()), /no longer available/);
  const h = fixture();
  for (let i = 0; i < 20; i++) await h.capture(input({ requestId: `request-${i}` }));
  await assert.rejects(h.capture(input({ requestId: 'request-21' })), /Too many submissions/);
  assert.equal([...h.records.keys()].filter(path => path.includes('/leads/')).length, 20);
});
