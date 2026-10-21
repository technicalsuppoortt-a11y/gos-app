import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadTS(path, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => {
    if (!(id in mocks)) throw new Error(`Unexpected import ${id}`);
    return mocks[id];
  }, console, AbortController, setTimeout, clearTimeout, Headers, FormData, fetch, AbortSignal });
  return exports;
}
const crmModel = loadTS('../src/pages/crm/model.ts');
const { GosApiError } = loadTS('../src/backend/gosTransport.ts');
const action = type => Object.assign(payload => ({ type, payload }), { type });

function harness({ lookup = { lead: { id: 'booking-1' } }, stageError, writeError, exists = true } = {}) {
  const calls = [], toasts = [], dispatched = [];
  const lead = { id: 'booking-1', name: 'Booking lead', stage: 'BOOKING', lifecycleStage: 'BOOKING', bookingStatus: 'Booked', hasEmailConsent: false };
  const state = { auth: { tenant: { id: 'tenant-a' } }, crm: { leads: [lead], pipelines: [] } };
  const actions = Object.fromEntries(['hydrateCRM', 'addLead', 'updateLead', 'savePipeline', 'deleteLeads', 'moveLead'].map(name => [name, action(`crm/${name}`)]));
  const { dispatchGosCRM } = loadTS('../src/backend/gosCRM.ts', {
    react: {}, './gosTransport': { GosApiError }, './firebase': { db: {} },
    '../utils/toast': { showToast: { error: message => toasts.push(message) } },
    '../pages/crm/model': crmModel, '../store/slices/crmSlice': actions,
    '../store': { store: { getState: () => state, dispatch: a => { dispatched.push(a); return a; } } },
    'firebase/firestore': {
      doc: (_, ...parts) => parts.join('/'), getDoc: async ref => { calls.push(['getDoc', ref]); return { exists: () => exists }; },
      updateDoc: async (ref, changes) => { calls.push(['updateDoc', ref, changes]); if (writeError) throw writeError; },
    },
    './gosApi': { gosApi: {
      lead: async id => { calls.push(['lookup', id]); if (lookup instanceof Error || lookup instanceof GosApiError) throw lookup; return lookup; },
      moveLead: async (id, stage) => { calls.push(['move', id, stage]); if (stageError) throw stageError; return { lead: { id, lifecycle_stage: stage } }; },
    } },
  });
  return { run: () => dispatchGosCRM({ type: 'crm/moveLead', payload: { id: 'booking-1', stage: 'QUALIFIED' } }), calls, toasts, dispatched };
}

test('API leads are checked before moving and retain the API stage path', async () => {
  const h = harness(); await h.run();
  assert.deepEqual(h.calls.map(c => c[0]), ['lookup', 'move']);
  assert.equal(h.dispatched[0].type, 'crm/updateLead');
});
for (const lookup of [new GosApiError('Lead not found', 404, 'lead_not_found'), { lead: null }]) {
  test(`booking lead missing from API (${lookup instanceof GosApiError ? 'error' : 'empty'}) is saved under its existing tenant/ID`, async () => {
    const h = harness({ lookup }); await h.run();
    assert.deepEqual(h.calls.map(c => c[0]), ['lookup', 'getDoc', 'updateDoc']);
    assert.equal(h.calls[2][1], 'tenants/tenant-a/leads/booking-1');
    assert.equal(h.calls[2][2].lifecycleStage, 'QUALIFIED');
    assert.equal(h.calls[2][2].stage, 'QUALIFIED');
    assert.ok(h.dispatched.some(action => action.type === 'crm/moveLead'));
    assert.equal(h.toasts.length, 0);
  });
}
test('a lead disappearing after the existence check also falls back', async () => {
  const h = harness({ stageError: new GosApiError('lead_not_found', 404, 'lead_not_found') }); await h.run();
  assert.deepEqual(h.calls.map(c => c[0]), ['lookup', 'move', 'getDoc', 'updateDoc']);
});
test('authorization and network failures never become successful local moves', async () => {
  for (const error of [new GosApiError('Forbidden', 403), new Error('Cannot reach API')]) {
    const h = harness({ lookup: error }); await assert.rejects(h.run(), error);
    assert.equal(h.calls.length, 1); assert.equal(h.dispatched.length, 0);
  }
});
test('a rejected Firestore write does not dispatch or report success', async () => {
  const h = harness({ lookup: { lead: null }, writeError: new Error('permission-denied') });
  await assert.rejects(h.run(), /permission-denied/); assert.equal(h.dispatched.length, 0);
});
test('an unknown Firestore record is not recreated by a stage move', async () => {
  const h = harness({ lookup: { lead: null }, exists: false });
  await assert.rejects(h.run(), /no longer available/);
  assert.equal(h.calls.some(c => c[0] === 'updateDoc'), false);
});
