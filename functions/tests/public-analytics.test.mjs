import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { recordPublicAnalytics } from '../public-analytics.js';

const token = 'a'.repeat(43);
const digest = value => createHash('sha256').update(value).digest('hex');
const event = {
  tenantId: 'tenant-a', assetId: 'funnel', pageId: 'start', captureToken: token, source: 'Search',
  eventId: '00000000-0000-4000-8000-000000000001',
  visitorId: '00000000-0000-4000-8000-000000000002',
  sessionId: '00000000-0000-4000-8000-000000000003',
};
const now = () => Date.UTC(2026, 10, 14);
function fixture() {
  const rows = new Map([
    ['tenants/tenant-a/hosting/funnel', { analyticsTokenHash: digest(token), analyticsPages: ['start'] }],
    ['tenants/tenant-a/products/book', { status: 'Active', config: { experience: { visibility: 'Published' } } }],
    ['tenants/tenant-a/products/draft', { status: 'Draft' }],
  ]);
  const db = {
    doc: root => ({ collection: name => ({ doc: id => `${root}/${name}/${id}` }) }),
    runTransaction: async callback => {
      const writes = new Map();
      const get = async ref => ({ exists: rows.has(ref), data: () => rows.get(ref) });
      const result = await callback({ get, set: (ref, data) => writes.set(ref, data), create: (ref, data) => writes.set(ref, data) });
      for (const [path, value] of writes) rows.set(path, value);
      return result;
    },
  };
  const record = data => recordPublicAnalytics({ data, rawRequest: { ip: '192.0.2.1' } }, { db, now });
  const tracked = () => [...rows].filter(([key]) => key.includes('/analyticsEvents/')).map(([, row]) => row);
  return { rows, record, tracked };
}

test('published page views are idempotent and store scoped anonymous IDs', async () => {
  const { record, tracked } = fixture();
  assert.deepEqual(await record(event), { accepted: true });
  await record(event);
  assert.deepEqual(tracked(), [{
    type: 'page.view', assetId: 'funnel', pageId: 'start', source: 'Search',
    visitorId: digest(`tenant-a/${event.visitorId}`), sessionId: digest(`tenant-a/${event.sessionId}`),
    createdAt: new Date(now()).toISOString(),
  }]);
});

test('unknown publications and draft products reject writes and the workspace quota caps traffic', async () => {
  const { rows, record, tracked } = fixture();
  for (const data of [{ ...event, pageId: 'draft' }, { ...event, captureToken: 'b'.repeat(43) }, { ...event, tenantId: 'tenant-b' }, { ...event, productId: 'draft' }]) {
    await assert.rejects(record(data), { code: 'permission-denied' });
  }
  assert.equal(tracked().length, 0);
  rows.set(`tenants/tenant-a/analyticsLimits/${digest('192.0.2.1')}`, { at: now(), count: 119 });
  await record({ ...event, productId: 'book' });
  assert.equal(tracked()[0].type, 'product.view');
  await assert.rejects(record(event), { code: 'resource-exhausted' });
});
