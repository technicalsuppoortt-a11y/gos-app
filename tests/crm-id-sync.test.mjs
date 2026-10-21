import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8').replaceAll('import.meta.env.VITE_GOS_API_BASE_URL', "'https://example.com'");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => { if (!(id in mocks)) throw Error(id); return mocks[id]; }, crypto: webcrypto, console, AbortController, setTimeout, clearTimeout });
  return exports;
}
const { GosApiError } = load('../src/backend/gosTransport.ts');
const crmModel = load('../src/pages/crm/model.ts');
const main = { id: 'main', name: 'Main', stages: [{ id: 'LEAD_CAPTURED', label: 'New', color: '#2396ef' }] };
const backendId = 'd165a4ad-c896-4eb1-a9ef-aab73efd6ca8';
const row = (id, name) => ({ id, name, email: 'same@example.com', pipeline_id: 'main', lifecycle_stage: 'LEAD_CAPTURED', activities: [], notes: [], tasks: [] });

function harness({ detailMissing = false, forbidden = false, documentExists = true, failWrite = false, firestoreData, readError } = {}) {
  const requests = [], writes = [];
  const apiRows = [row(backendId, 'marim ahmed'), row('1e494fa6-e9ac-4cb1-a122-d1b7b13790e9', 'saad')];
  const slice = load('../src/store/slices/crmSlice.ts', { '@reduxjs/toolkit': require('@reduxjs/toolkit'), '../../pages/crm/model': { ...crmModel, mainPipeline: main } });
  let state = { auth: { tenant: { id: 'tenant-a' } }, crm: slice.default(undefined, { type: '@@INIT' }) };
  const store = { getState: () => state, dispatch: action => { state = { ...state, crm: slice.default(state.crm, action) }; return action; } };
  store.dispatch(slice.hydrateCRM({ leads: [row('firestore-old-id', 'Mahmoud Ashraf')], pipelines: [main] }));
  const { gosApi } = load('../src/backend/gosApi.ts', {
    './firebase': { auth: {} }, './gosTransport': { GosApiError, createGosTransport: () => async (path, options = {}) => {
      requests.push({ path, options });
      if (forbidden) throw new GosApiError('Forbidden', 403);
      if (path === '/crm/leads') return { leads: apiRows };
      if (path === '/crm/leads/bulk') return { updated: options.body.lead_ids.length };
      if (path === '/crm/pipelines') return { pipelines: [main] };
      const id = decodeURIComponent(path.slice('/crm/leads/'.length));
      const lead = apiRows.find(item => item.id === id);
      if (!lead || (detailMissing && !options.method)) throw new GosApiError('Lead was not found.', 404, 'lead_not_found');
      return { lead: { ...lead, ...options.body } };
    } },
  });
  const crm = load('../src/backend/gosCRM.ts', {
    react: {}, './gosApi': { gosApi }, './gosTransport': { GosApiError }, './firebase': { db: {} },
    '../store': { store }, '../store/slices/crmSlice': slice, '../pages/crm/model': crmModel, '../utils/toast': { showToast: { error() {} } },
    'firebase/firestore': {
      doc: (_, ...parts) => parts.join('/'), getDoc: async () => { if (readError) throw readError; return { exists: () => documentExists, data: () => firestoreData ?? { ...row('embedded-old-id', 'Complete Firestore record'), source: 'Booking', stage: 'BOOKING', lifecycle_stage: 'BOOKING', bookingStatus: 'Booked', phone: '+201000000001', company: 'Calendar customer', notes: ['Appointment requested'], activities: [{ id: 'booking-event', type: 'booking', title: 'Appointment booked', detail: 'Discovery call', at: '2026-10-21T12:00:00Z' }] } }; },
      deleteDoc: async path => writes.push({ path, deleted: true }),
      updateDoc: async (path, changes) => { if (failWrite) throw Error('permission-denied'); writes.push({ path, changes }); },
    },
  });
  return { crm, gosApi, store, slice, requests, writes, apiRows };
}

test('hybrid selector includes all workspace captures while keeping exact backend IDs', async () => {
  const h = harness(); await h.crm.refreshGosCRM();
  const { selectUnifiedCRMLeads } = load('../src/store/crmSelectors.ts', { '@reduxjs/toolkit': require('@reduxjs/toolkit'), '../pages/crm/model': crmModel });
  const state = h.store.getState().crm;
  assert.equal(selectUnifiedCRMLeads(h.store.getState()).length, 3);
  assert.deepEqual(Array.from(state.apiLeadIds), h.apiRows.map(lead => lead.id));
  const captures = ['Funnel', 'Booking', 'Checkout'].map((source, index) => ({ ...row('capture-' + index, source + ' contact'), source }));
  h.store.dispatch(h.slice.hydrateCRM({ leads: captures, pipelines: [main], workspaceScope: 'tenant-a' }));
  const visible = selectUnifiedCRMLeads(h.store.getState());
  assert.equal(visible.length, 5);
  assert.ok(visible.some(lead => lead.id === backendId));
  for (const lead of captures) assert.ok(visible.some(item => item.id === lead.id && item.source === lead.source));
  assert.equal(visible.filter(lead => lead.email === 'same@example.com').length, 5);
});
test('a confirmed API 404 returns control to the Firestore resolver without refreshing the list', async () => {
  const h = harness({ detailMissing: true });
  const result = await h.gosApi.lead(backendId);
  assert.equal(result.lead, null);
  assert.deepEqual(h.requests.map(item => item.path), ['/crm/leads/' + backendId]);
});
test('a workspace ID is never replaced by another contact with the same email', async () => {
  const h = harness(); const result = await h.gosApi.lead('firestore-old-id');
  assert.equal(result.lead, null);
  assert.equal(h.requests.length, 1);
});
test('permission failures do not become a successful cached API read', async () => {
  const h = harness({ forbidden: true });
  await assert.rejects(h.gosApi.lead(backendId), error => error.status === 403);
  assert.equal(h.requests.length, 1);
});
test('cached detail edits use the existing Firestore ID after canonical list synchronization', async () => {
  const h = harness(); await h.crm.refreshGosCRM(); h.requests.length = 0;
  await h.crm.dispatchGosCRM(h.slice.updateLead({ id: 'firestore-old-id', changes: { name: 'Updated cached contact' } }));
  assert.equal(h.requests.length, 0);
  assert.equal(h.writes[0].path, 'tenants/tenant-a/leads/firestore-old-id');
  assert.equal(h.store.getState().crm.leads.find(lead => lead.id === 'firestore-old-id').name, 'Updated cached contact');
});
test('cached notes persist without sending stale IDs to the API', async () => {
  const h = harness(); await h.crm.refreshGosCRM(); h.requests.length = 0;
  await h.crm.dispatchGosCRM({ type: 'crm/addLeadNote', payload: { id: 'firestore-old-id', note: 'Cached note' } });
  assert.equal(h.requests.length, 0);
  assert.equal(h.writes[0].changes.notes[0], 'Cached note');
});
test('missing Firestore records are not recreated and rejected writes do not report success', async () => {
  for (const options of [{ documentExists: false }, { failWrite: true }]) {
    const h = harness(options); await h.crm.refreshGosCRM();
    await assert.rejects(h.crm.dispatchGosCRM(h.slice.updateLead({ id: 'firestore-old-id', changes: { name: 'Changed' } })));
    assert.equal(h.store.getState().crm.leads.find(lead => lead.id === 'firestore-old-id').name, 'Mahmoud Ashraf');
    assert.equal(h.writes.length, 0);
  }
});
test('API contact updates keep their exact UUID', async () => {
  const h = harness(); await h.crm.refreshGosCRM(); h.requests.length = 0;
  await h.crm.dispatchGosCRM(h.slice.updateLead({ id: backendId, changes: { name: 'Updated API contact' } }));
  assert.equal(h.requests[0].path, '/crm/leads/' + backendId);
  assert.equal(h.requests[0].options.method, 'PATCH');
  assert.equal(h.writes.length, 0);
});
test('invalid API IDs are rejected instead of generating local UUIDs', () => {
  const h = harness(); assert.throws(() => h.crm.normalizeLead({ name: 'No ID' }), /valid ID/);
});

test('known booking leads load complete Firestore details without Laravel calls', async () => {
  const h = harness(); await h.crm.refreshGosCRM(); h.requests.length = 0;
  const result = await h.crm.resolveGosLead('firestore-old-id');
  assert.equal(result.backend, 'firestore');
  assert.equal(result.lead.id, 'firestore-old-id');
  assert.equal(result.lead.name, 'Complete Firestore record');
  assert.equal(result.lead.company, 'Calendar customer');
  assert.equal(result.lead.bookingStatus, 'Booked');
  assert.equal(result.lead.activities[0].id, 'booking-event');
  assert.equal(h.requests.length, 0);
});
test('detail 404 falls back to the complete Firestore document without refreshing or clearing CRM', async () => {
  const h = harness({ detailMissing: true }); await h.crm.refreshGosCRM(); h.requests.length = 0;
  const result = await h.crm.resolveGosLead(backendId);
  assert.equal(result.backend, 'firestore');
  assert.equal(result.lead.id, backendId);
  assert.equal(result.lead.name, 'Complete Firestore record');
  assert.deepEqual(h.requests.map(item => item.path), ['/crm/leads/' + backendId]);
  assert.equal(h.store.getState().crm.leads.length, 3);
  h.requests.length = 0;
  await h.crm.resolveGosLead(backendId, undefined, true);
  assert.equal(h.requests.length, 0);
  await h.crm.dispatchGosCRM(h.slice.updateLead({ id: backendId, changes: { company: 'Saved through Firestore' } }));
  assert.equal(h.requests.length, 0);
  assert.equal(h.writes[0].path, 'tenants/tenant-a/leads/' + backendId);
});
test('source mirrors merge once and retain capture history, notes, tasks and follow-up', () => {
  const api = { ...row(backendId, 'API name'), last_activity: '2026-10-21T12:00:00Z', tasks: [], notes: ['API note'], activities: [{ id: 'api-event', type: 'capture', title: 'Manual capture', detail: '', at: '2026-10-21T12:00:00Z' }] };
  const workspace = { ...row(backendId, 'Workspace name'), lastActivity: '2026-10-21T13:00:00Z', source: 'Funnel', notes: ['Form message'], tasks: [{ id: 'task', title: 'Call', due: '2026-11-01', done: false }], nextFollowUpAt: '2026-11-01T10:00', activities: [{ id: 'form-event', type: 'capture', title: 'Form capture', detail: '', at: '2026-10-21T13:00:00Z' }] };
  const rows = crmModel.mergeCRMLeads([api], [workspace]);
  assert.equal(rows.length, 1); assert.equal(rows[0].id, backendId);
  assert.equal(rows[0].source, 'Funnel'); assert.equal(rows[0].activities.length, 2);
  assert.equal(rows[0].notes.length, 2); assert.equal(rows[0].tasks[0].id, 'task');
  assert.equal(rows[0].nextFollowUpAt, '2026-11-01T10:00');
});
test('fresh Firestore snapshots preserve API-only records while removing deleted workspace captures', async () => {
  const h = harness(); await h.crm.refreshGosCRM();
  h.store.dispatch(h.slice.hydrateCRM({ leads: [], pipelines: [main], workspaceScope: 'tenant-a' }));
  assert.equal(h.store.getState().crm.leads.length, 2);
  assert.ok(h.store.getState().crm.leads.every(lead => h.apiRows.some(row => row.id === lead.id)));
  h.store.dispatch(h.slice.hydrateCRM({ leads: [row('new-tenant-lead', 'New workspace')], pipelines: [main], workspaceScope: 'tenant-b' }));
  assert.equal(h.store.getState().crm.leads.length, 1);
  assert.equal(h.store.getState().crm.leads[0].id, 'new-tenant-lead');
});
test('Firestore authorization failures remain failures and missing documents are not recreated', async () => {
  const denied = harness({ readError: Error('permission-denied') }); await denied.crm.refreshGosCRM();
  await assert.rejects(denied.crm.resolveGosLead('firestore-old-id'), /permission-denied/);
  assert.equal(denied.writes.length, 0);
  const missing = harness({ documentExists: false }); await missing.crm.refreshGosCRM();
  await assert.rejects(missing.crm.resolveGosLead('firestore-old-id'), /no longer available/);
  assert.equal(missing.writes.length, 0);
});
test('API aliases normalize for detail tabs, and canonical local edits override stale aliases', () => {
  const lead = crmModel.normalizeCRMLead({ ...row(backendId, 'Contact'), booking_status: 'Booked', follow_up_state: 'BOOKED', has_email_consent: true, next_follow_up_at: '2026-11-01T10:00', created_at: '2026-10-21T12:00:00Z' });
  assert.equal(lead.bookingStatus, 'Booked'); assert.equal(lead.followUpState, 'BOOKED');
  assert.equal(lead.hasEmailConsent, true); assert.equal(lead.nextFollowUpAt, '2026-11-01T10:00');
  const changed = crmModel.normalizeCRMLead({ ...lead, lifecycleStage: 'QUALIFIED', stage: 'QUALIFIED', bookingStatus: 'Completed' });
  assert.equal(changed.lifecycleStage, 'QUALIFIED'); assert.equal(changed.bookingStatus, 'Completed');
});
test('mixed bulk owner edits send only API IDs to Laravel and persist workspace IDs in Firestore', async () => {
  const h = harness(); await h.crm.refreshGosCRM(); h.requests.length = 0;
  await h.crm.bulkGosCRM([backendId, 'firestore-old-id'], 'owner', 'Alex');
  const bulk = h.requests.find(item => item.path === '/crm/leads/bulk');
  assert.deepEqual(Array.from(bulk.options.body.lead_ids), [backendId]);
  assert.equal(h.writes[0].path, 'tenants/tenant-a/leads/firestore-old-id');
  assert.equal(h.writes[0].changes.owner, 'Alex');
});

test('checkout captures normalize customer aliases and match original order/booking references', () => {
  const { linkedToLead } = load('../src/pages/crm/recordLinks.ts');
  const lead = crmModel.normalizeCRMLead({ id: 'checkout-capture', customer_name: 'Buyer', customer_email: 'buyer@example.com', customer_phone: '+201000000001', order_id: 'order-native' });
  assert.equal(lead.name, 'Buyer'); assert.equal(lead.email, 'buyer@example.com'); assert.equal(lead.source, 'Checkout');
  assert.equal(linkedToLead({ id: 'order-native' }, lead, 'order'), true);
  assert.equal(linkedToLead({ id: 'payment-native', order_id: 'order-native' }, lead, 'order'), true);
  assert.equal(linkedToLead({ id: 'order-native' }, lead, 'booking'), false);
  assert.equal(linkedToLead({ id: 'booking-native' }, { id: 'booking-capture', email: '', bookingId: 'booking-native' }, 'booking'), true);
});
