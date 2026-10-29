import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

function load(path, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => { if (!(id in mocks)) throw Error(id); return mocks[id]; }, crypto: webcrypto, URL, console, setTimeout, clearTimeout });
  return exports;
}
const crmModel = load('../src/pages/crm/model.ts');
const action = type => Object.assign(payload => ({ type, payload }), { type });
function harness(write = async () => {}) {
  const calls = [], dispatched = [];
  const lead = { id: 'lead-1', name: 'Sarah', email: 'sarah@example.com', lifecycleStage: 'QUALIFIED', pipelineId: 'main', activities: [], tasks: [], notes: [], tags: [] };
  const state = { auth: { tenant: { id: 'tenant-a' } }, crm: { leads: [lead], pipelines: [] } };
  const actions = Object.fromEntries(['hydrateCRM', 'addLead', 'updateLead', 'savePipeline', 'deleteLeads', 'moveLead'].map(name => [name, action(`crm/${name}`)]));
  const result = load('../src/backend/gosCRM.ts', {
    react: {}, './gosTransport': { GosApiError: class extends Error {} }, './firebase': { db: {} },
    '../utils/toast': { showToast: { error() {} } },
    '../pages/crm/model': crmModel, '../store/slices/crmSlice': actions,
    '../store': { store: { getState: () => state, dispatch: value => { dispatched.push(value); return value; } } },
    'firebase/firestore': { doc: (_, ...parts) => parts.join('/'), setDoc: async (...args) => { calls.push(['write', ...args]); await write(); } },
    './gosApi': { gosApi: { leads: async () => ({ leads: state.crm.leads }), pipelines: async () => ({ pipelines: state.crm.pipelines.map(({ archived, archivedAt, ...pipeline }) => pipeline) }), updateLead: async (id, body) => { calls.push(['patch', id, body]); return { lead: { ...lead, ...body } }; }, moveLead: async (id, stage) => { calls.push(['stage', id, stage]); return { lead: { ...lead, lifecycle_stage: stage } }; } } },
  });
  return { ...result, calls, dispatched, state, lead };
}

test('task creation awaits tenant-scoped persistence before Redux success', async () => {
  let release;
  const h = harness(() => new Promise(resolve => { release = resolve; }));
  const task = { id: 'task-1', title: 'Call Sarah', due: '2026-11-01', done: false };
  const pending = h.dispatchGosCRM({ type: 'crm/updateLead', payload: { id: 'lead-1', changes: { tasks: [task] } } });
  assert.equal(h.dispatched.length, 0);
  assert.equal(h.calls[0][1], 'tenants/tenant-a/leads/lead-1');
  release();
  const saved = await pending;
  assert.equal(saved.tasks[0].title, 'Call Sarah');
  assert.equal(h.dispatched.length, 1);
  assert.ok(Number.isFinite(Date.parse(saved.activities[0].at)));
});
test('rejected task persistence never commits a successful Redux task', async () => {
  const h = harness(async () => { throw Error('permission-denied'); });
  await assert.rejects(h.dispatchGosCRM({ type: 'crm/updateLead', payload: { id: 'lead-1', changes: { tasks: [{ id: 'task' }] } } }), /permission-denied/);
  assert.equal(h.dispatched.length, 0);
});
test('follow-up and consent use workspace persistence rather than unsupported Laravel fields', async () => {
  for (const payload of [
    { type: 'crm/updateLead', payload: { id: 'lead-1', changes: { nextFollowUpAt: '2026-11-02T10:00', nextFollowUp: 'Tomorrow' } } },
    { type: 'crm/setLeadConsent', payload: { id: 'lead-1', consent: { hasEmailConsent: true } } },
    { type: 'crm/setLeadFollowUpState', payload: { id: 'lead-1', followUpState: 'CONVERSING' } },
  ]) {
    const h = harness(); await h.dispatchGosCRM(payload);
    assert.deepEqual(h.calls.map(call => call[0]), ['write']);
    assert.equal(h.dispatched.length, 1);
  }
});
test('contact updates PATCH supported fields and pipeline changes also call the stage endpoint', async () => {
  const h = harness();
  await h.dispatchGosCRM({ type: 'crm/updateLead', payload: { id: 'lead-1', changes: { owner: 'Alex', pipelineId: 'sales', lifecycleStage: 'LEAD_CAPTURED', stage: 'LEAD_CAPTURED' } } });
  assert.deepEqual(h.calls.map(call => call[0]), ['patch', 'stage', 'write']);
  assert.equal(h.calls[0][2].pipeline_id, 'sales');
  assert.equal(h.calls[0][2].lifecycle_stage, undefined);
  assert.equal(h.calls[1][2], 'LEAD_CAPTURED');
});
test('a workspace switch during a task save does not mutate the new workspace', async () => {
  const h = harness(async () => { h.state.auth.tenant.id = 'tenant-b'; });
  assert.equal(await h.dispatchGosCRM({ type: 'crm/updateLead', payload: { id: 'lead-1', changes: { tasks: [] } } }), undefined);
  assert.equal(h.dispatched.length, 0);
});
test('partial API responses preserve persisted workspace tasks and activity', () => {
  const h = harness(); h.lead.tasks.push({ id: 'task' }); h.lead.activities.push({ id: 'capture' });
  const normalized = h.normalizeLead({ id: 'lead-1', name: 'Updated' });
  assert.equal(normalized.tasks[0].id, 'task'); assert.equal(normalized.activities[0].id, 'capture');
  assert.equal(normalized.lifecycleStage, 'QUALIFIED');
});
test('record associations never match blank email addresses or customer names', () => {
  const { linkedToLead } = load('../src/pages/crm/recordLinks.ts');
  assert.equal(linkedToLead({ email: '' }, { id: 'one', email: '' }), false);
  assert.equal(linkedToLead({ customer_name: 'Sarah' }, { id: 'one', email: 'sarah@example.com' }), false);
  assert.equal(linkedToLead({ lead_id: 'one' }, { id: 'one', email: '' }), true);
  assert.equal(linkedToLead({ customerEmail: ' SARAH@EXAMPLE.COM ' }, { id: 'one', email: 'sarah@example.com' }), true);
});
test('QA catalog covers all 42 Postman entries without executing their scripts or storing login credentials', () => {
  const { apiRequests } = load('../src/pages/crm/apiRequests.ts');
  const collection = JSON.parse(fs.readFileSync(new URL('../public/Feedback/docs/GOS API Copy 2.postman_collection.json', import.meta.url), 'utf8'));
  const flatten = items => items.flatMap(item => item.item ? flatten(item.item) : [item]);
  const items = flatten(collection.item);
  assert.equal(items.length, 42); assert.equal(apiRequests.length, 42);
  items.forEach((item, index) => { assert.equal(apiRequests[index].name, item.name); assert.equal(apiRequests[index].url, item.request.url.raw); assert.equal(apiRequests[index].method, item.request.method); });
  assert.equal(apiRequests.find(row => row.name === 'login Copy').body, '');
});

test('QA assertions reject premature indexing, duplicate-reply failures and ungrounded answers', () => {
  const { qaAssertions } = load('../src/pages/crm/qaAssertions.ts');
  assert.equal(qaAssertions('Get source', { source: { status: 'queued', chunk_count: 0 } }).length, 2);
  assert.equal(qaAssertions('Get source', { source: { status: 'ready', chunk_count: 3 } }).length, 0);
  assert.equal(qaAssertions('Duplicate inbox message', { outcome: 'answered' }).length, 1);
  assert.equal(qaAssertions('Inbox handoff', { outcome: 'handoff', reply: null }).length, 0);
  assert.equal(qaAssertions('Ask playground', { test: { outcome: 'answered', answer: 'Answer', citations: [] } }).length, 1);
});

function archiveHarness(write) {
  const h = harness(write);
  h.state.crm.pipelines = [{ id: 'main', name: 'Main', stages: [] }, { id: 'sales', name: 'Sales', stages: [] }];
  return h;
}
test('pipeline removal awaits a Firestore archive and never calls an unsupported HTTP endpoint', async () => {
  let release;
  const h = archiveHarness(() => new Promise(resolve => { release = resolve; }));
  const pending = h.archiveGosPipeline('sales');
  assert.equal(h.dispatched.length, 0);
  assert.equal(h.calls[0][1], 'tenants/tenant-a/pipelines/sales');
  assert.equal(h.calls[0][2].archived, true);
  release(); await pending;
  assert.equal(h.dispatched[0].type, 'crm/savePipeline');
  assert.equal(h.dispatched[0].payload.archived, true);
});
test('archive rejection leaves the active Redux pipeline unchanged', async () => {
  const h = archiveHarness(async () => { throw Error('permission-denied'); });
  await assert.rejects(h.archiveGosPipeline('sales'), /permission-denied/);
  assert.equal(h.dispatched.length, 0);
});
test('nonempty and last active pipelines cannot be archived', async () => {
  const h = archiveHarness();
  await assert.rejects(h.archiveGosPipeline('main'), /Move/);
  h.state.crm.pipelines = [h.state.crm.pipelines[0]];
  await assert.rejects(h.archiveGosPipeline('main'), /at least one/);
  assert.equal(h.calls.length, 0);
});
test('API refresh preserves Firestore archive flags', async () => {
  const h = archiveHarness(); h.state.crm.pipelines[1].archived = true; h.state.crm.pipelines[1].archivedAt = '2026-10-21T10:00:00Z';
  await h.refreshGosCRM();
  assert.equal(h.dispatched[0].payload.pipelines.find(pipeline => pipeline.id === 'sales').archived, true);
});
test('product attachments persist on the lead without fabricating orders or payments', async () => {
  const h = harness();
  const result = await h.attachGosProduct('lead-1', { id: 'product-1', name: 'Strategy Session' });
  assert.equal(result.attachedProducts[0].productId, 'product-1');
  assert.equal(h.calls[0][1], 'tenants/tenant-a/leads/lead-1');
  assert.deepEqual(h.calls.map(call => call[0]), ['write']);
  const failed = harness(async () => { throw Error('permission-denied'); });
  await assert.rejects(failed.attachGosProduct('lead-1', { id: 'product-1', name: 'Strategy Session' }), /permission-denied/);
  assert.equal(failed.dispatched.length, 0);
});
test('order matching includes customerPhone and checkout links require an absolute HTTP URL', () => {
  const { linkedToLead, productCheckoutURL } = load('../src/pages/crm/recordLinks.ts');
  assert.equal(linkedToLead({ customerPhone: '+20 100 000 0001' }, { id: 'lead', email: '', phone: '+201000000001' }), true);
  assert.equal(productCheckoutURL({ config: { experience: { directCheckoutUrl: 'javascript:alert(1)' } } }), '');
  assert.equal(productCheckoutURL({ config: { salesUrl: '/dashboard/products/internal' } }), '');
  assert.equal(productCheckoutURL({ config: { experience: { directCheckoutUrl: 'https://checkout.example.com/pay' }, salesUrl: 'https://example.com/product' } }), 'https://checkout.example.com/pay');
});
