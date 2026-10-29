import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCRMRoute } from '../crm-routing.js';
const root = { collection: name => ({ doc: id => `${name}/${id}` }) };
test('routing validates the tenant pipeline and uses its first stage when a saved stage was removed', async () => {
  const tx = { get: async path => { assert.equal(path, 'pipelines/sales'); return { data: () => ({ stages: [{ id: 'QUALIFIED' }] }) }; } };
  assert.deepEqual(await resolveCRMRoute(tx, root, { pipelineId: 'sales', stageId: 'removed' }), { pipelineId: 'sales', stage: 'QUALIFIED', lifecycleStage: 'QUALIFIED' });
});
test('missing or archived destinations use safe defaults without accepting an arbitrary stage', async () => {
  for (const row of [undefined, { archived: true, stages: [{ id: 'QUALIFIED' }] }]) {
    const route = await resolveCRMRoute({ get: async () => ({ data: () => row }) }, root, { pipelineId: 'deleted', stageId: 'arbitrary' }, 'BOOKING');
    assert.deepEqual(route, { pipelineId: 'main', stage: 'BOOKING', lifecycleStage: 'BOOKING' });
  }
});
test('the built-in main pipeline supports explicit canonical stages without requiring a saved pipeline document', async () => {
  const tx = { get: async () => ({ data: () => undefined }) };
  assert.equal((await resolveCRMRoute(tx, root, { pipelineId: 'main', stageId: 'QUALIFIED' })).stage, 'QUALIFIED');
  assert.equal((await resolveCRMRoute(tx, root, { pipelineId: 'main', stageId: 'arbitrary' })).stage, 'LEAD_CAPTURED');
});
