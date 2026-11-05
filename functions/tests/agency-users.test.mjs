import test from 'node:test';
import assert from 'node:assert/strict';
import { executeBilling } from '../billing-engine.js';
import { reserveCharge, confirmCharge } from '../communication-ledger.js';
import { agencyLandingWrites, reconcileAgencyWorkspace } from '../agency-workspace.js';
import { mayManageUser } from '../policy.js';

const now = '2026-11-05T10:00:00.000Z';
const agency = { uid: 'agency', tenantId: 'workspace-agency', role: 'USER', status: 'Active', accountType: 'agency', createdBy: 'admin' };
const admin = { uid: 'admin', role: 'ADMIN', status: 'Active' };
const system = { uid: 'system', role: 'SYSTEM' };
const rootPath = 'tenants/workspace-agency';
const seedPath = `${rootPath}/workspaceState/gos.agency.landing-seed.v1`;

test('only the creating admin or a super admin can switch into a funded Agency user', () => {
  const target = { ...agency, id: agency.uid };
  assert.equal(mayManageUser(admin, target), true);
  assert.equal(mayManageUser({ ...admin, uid: 'other-admin' }, target), false);
  assert.equal(mayManageUser({ uid: 'platform-admin', role: 'SUPER_ADMIN' }, target), true);
  assert.equal(mayManageUser({ ...admin, uid: 'other-admin' }, { ...target, accountType: undefined }), true);
});

function fixture(extra = {}) {
  const rows = new Map(Object.entries({
    'users/agency': agency,
    'users/admin': admin,
    [rootPath]: { ownerId: agency.uid, accountType: 'agency' },
    'billingSubscriptions/admin': { id: 'admin', status: 'active', plan: { tools: ['ai-copilot'], channels: ['ai', 'email'] } },
    'billingWallets/admin': { id: 'admin', balance: 1, providerId: 'platform' },
    'communicationWallets/admin': { id: 'admin', balance: 2, held: 0, providerId: 'platform', currency: 'EUR' },
    ...extra,
  }));
  const read = path => structuredClone(rows.get(path));
  const query = (path, field, value) => [...rows].filter(([key, row]) => key.startsWith(`${path}/`) && row[field] === value).map(([, row]) => structuredClone(row));
  const ref = path => ({
    path, id: path.split('/').at(-1),
    collection: name => ({
      doc: id => ref(`${path}/${name}/${id}`),
      orderBy: () => ({
        startAt: start => ({ endAt: end => ({ limit: () => ({ path: `${path}/${name}`, start, end }) }) }),
      }),
    }),
  });
  const db = {
    doc: ref,
    async runTransaction(run) {
      const writes = [];
      const result = await run({
        get(target) {
          assert.equal(writes.length, 0, 'Firestore requires all reads before writes');
          if (target.start) {
            const docs = [...rows.keys()].filter(key => key.startsWith(`${target.path}/`))
              .map(key => ref(key)).filter(doc => doc.id >= target.start && doc.id <= target.end);
            return { docs };
          }
          return { exists: rows.has(target.path), data: () => read(target.path) };
        },
        set: (target, value) => writes.push([target.path, value]),
        create: (target, value) => { assert.ok(!rows.has(target.path)); writes.push([target.path, value]); },
        update: (target, value) => writes.push([target.path, { ...read(target.path), ...value }]),
      });
      writes.forEach(([path, value]) => rows.set(path, value));
      return result;
    },
  };
  return { rows, db, run: (operation, data, actor) => executeBilling(operation, data, actor, {
    get: read, query, id: () => crypto.randomUUID(), commit: writes => writes.forEach(([path, value]) => rows.set(path, value)),
  }, now) };
}

test('Agency user usage uses only the creating admin plan and credits', async () => {
  const { rows, run } = fixture({ 'billingWallets/agency': { id: 'agency', balance: 99 } });
  const usage = { subscriberId: agency.uid, amount: 1, usageType: 'ai', tool: 'ai-copilot', idempotencyKey: 'first' };
  await assert.rejects(run('consume', { ...usage, tool: 'ai-followup' }, system), { code: 'failed-precondition' });
  await assert.rejects(run('consume', usage, agency), { code: 'failed-precondition' });
  assert.deepEqual(await run('consume', usage, system), { balance: 0 });
  assert.deepEqual(await run('consume', usage, system), { duplicate: true });
  assert.equal(rows.get('billingWallets/agency').balance, 99);
  const debit = rows.get('billingLedger/usage_agency_agency_first');
  assert.equal(debit.walletId, 'admin');
  assert.equal(debit.workspaceId, agency.tenantId);
  await assert.rejects(run('consume', { ...usage, idempotencyKey: 'second' }, system), { code: 'resource-exhausted' });
  assert.deepEqual(await run('sharedBilling', { subscriberId: 'someone-else' }, agency), {
    active: true, credits: 0, communicationBalance: 2, currency: 'EUR',
  });
  await assert.rejects(run('initializeAccountPlan', { subscriberId: agency.uid }, admin), { code: 'failed-precondition' });
  await assert.rejects(run('requestWalletTopup', { amount: 20 }, agency), { code: 'failed-precondition' });
  assert.equal(rows.has('billingSubscriptions/agency'), false);
});

test('carrier charges hold and settle the admin wallet while retaining Agency user attribution', async () => {
  const { rows, db, run } = fixture();
  const send = { businessId: agency.tenantId, messageId: 'email-1', channel: 'email', provider: 'smtp', subscriberId: 'another-user' };
  const charge = await db.runTransaction(tx => reserveCharge(tx, db, send, now));
  assert.equal(charge.ok, true);
  assert.equal(rows.get('communicationWallets/admin').held, 0.002);
  await db.runTransaction(tx => confirmCharge(tx, db, { entryId: charge.entryId }, now));
  assert.equal(rows.get('communicationWallets/admin').balance, 1.998);
  assert.equal(rows.get('communicationWallets/admin').held, 0);
  assert.equal(rows.has('communicationWallets/agency'), false);
  const entry = rows.get(`communicationLedger/${charge.entryId}`);
  assert.equal(entry.wallet_id, admin.uid);
  assert.equal(entry.subscriber_id, agency.uid);
  assert.equal((await run('walletLedger', {}, admin)).entries.length, 1);
  assert.equal((await run('walletLedger', {}, agency)).entries[0].provider_cost, undefined);
});

test('the website seed is a draft at the root and carries editable blocks and a form', () => {
  const { db } = fixture();
  const [[assetRef, asset], [markerRef, marker]] = agencyLandingWrites(db.doc(rootPath), agency.uid, now, 'ar');
  assert.equal(markerRef.path, seedPath);
  assert.equal(marker.value.assetId, assetRef.id);
  assert.equal(asset.kind, 'website');
  assert.equal(asset.document.funnel.status, 'Draft');
  const [page] = asset.document.pages;
  assert.equal(page.path, '/');
  assert.ok(page.sections.some(section => ['Form', 'Contact Form'].includes(section.type)));
  assert.ok(page.sections.some(section => section.children?.[0]?.gosNestedArrayV1));
});

test('legacy repair adopts an existing landing, retires its old plan, and honors a subsequent deletion', async () => {
  const landing = `${rootPath}/assets/agency-landing-existing`;
  const { rows, db } = fixture({
    [landing]: { name: 'Edited website' },
    'billingSubscriptions/agency': { status: 'active' },
  });
  await assert.rejects(reconcileAgencyWorkspace(db, { ...agency, accountType: undefined }), { code: 'permission-denied' });
  await reconcileAgencyWorkspace(db, agency, 'en');
  assert.equal(rows.get(seedPath).value.assetId, 'agency-landing-existing');
  assert.equal(rows.get(landing).name, 'Edited website');
  assert.equal(rows.get('users/agency').billingOwnerId, 'admin');
  assert.equal(rows.get(rootPath).billingOwnerId, 'admin');
  assert.equal(rows.get('billingSubscriptions/agency').status, 'cancelled');
  rows.delete(landing);
  await reconcileAgencyWorkspace(db, agency, 'ar');
  assert.equal([...rows.keys()].some(path => path.startsWith(`${rootPath}/assets/`)), false);
});
