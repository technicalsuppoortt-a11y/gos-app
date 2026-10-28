// Disposable fixtures only. Never logs identity tokens, credentials or user data.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const cli = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url));
const sdk = createRequire(new URL('../functions/package.json', import.meta.url));
const { getGlobalDefaultAccount, getAccessToken } = cli('./lib/auth.js');
const account = getGlobalDefaultAccount();
if (!account) throw new Error('Firebase CLI sign-in required.');
const access = account.tokens.access_token && account.tokens.expires_at > Date.now() + 60000 ? account.tokens : await getAccessToken(account.tokens.refresh_token, account.tokens.scopes ?? ['https://www.googleapis.com/auth/cloud-platform']);
const project = 'gos-app-3c7fb', run = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
const { initializeApp, deleteApp } = sdk('firebase-admin/app');
const { getAuth } = sdk('firebase-admin/auth');
const app = initializeApp({ projectId: project, credential: { getAccessToken: async () => ({ access_token: access.access_token, expires_in: 3600 }) } }, `hotfix-${run}`);
const auth = getAuth(app);
const config = JSON.parse(readFileSync(new URL('../src/backend/gos-public-config.json', import.meta.url), 'utf8'));
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const fixtures = [];
let roomId = '', toolRestore;
const encode = value => value === null ? { nullValue: null } : typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, v]) => [key, encode(v)])) } };
async function firestore(path, token, method = 'GET', fields, precondition) {
  const response = await fetch(`${base}/${path}${precondition ? `?currentDocument.updateTime=${encodeURIComponent(precondition)}` : ''}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: fields ? JSON.stringify({ fields }) : undefined, signal: AbortSignal.timeout(30000) });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}
async function put(path, value) {
  const response = await firestore(path, access.access_token, 'PATCH', encode(value).mapValue.fields);
  assert.equal(response.status, 200, 'Create disposable fixture document');
}
async function remove(path) {
  const response = await firestore(path, access.access_token, 'DELETE');
  assert.ok([200,204,404].includes(response.status), 'Remove disposable fixture document');
}
async function callable(name, token, data) {
  const response = await fetch(`https://us-central1-${project}.cloudfunctions.net/${name}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify({ data }), signal: AbortSignal.timeout(60000) });
  const payload = await response.json();
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173', `${name}: missing CORS header`);
  return { status: response.status, data: payload.result ?? payload.data, error: payload.error };
}
async function fixture(kind, role, parent = '') {
  const scope = `hotfix-${run}-${kind}`;
  const password = `Hotfix_${crypto.randomUUID()}_aA1!`;
  const account = await auth.createUser({ email: `hotfix-${run}-${kind}@example.invalid`, password, displayName: 'Hotfix test account' });
  const f = { uid: account.uid, scope };
  fixtures.push(f);
  await put(`users/${f.uid}`, { id: f.uid, name: 'Hotfix test account', email: account.email, role, tenantId: scope, status: 'Active', supportParentId: parent || 'unassigned-hotfix-super' });
  await put(`tenants/${scope}`, { name: 'Disposable hotfix test', ownerId: f.uid });
  await put(`tenants/${scope}/members/${f.uid}`, { role: 'Owner', active: true, permissions: ['*'] });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, password, returnSecureToken: true }), signal: AbortSignal.timeout(30000) });
  const signedIn = await response.json();
  assert.equal(response.status, 200, 'Disposable fixture sign-in');
  f.token = signedIn.idToken;
  return f;
}
try {
  const admin = await fixture('admin', 'ADMIN');
  const user = await fixture('user', 'USER', admin.uid);
  const outsider = await fixture('outsider', 'USER');
  const assetPath = `tenants/${user.scope}/assets/access-check`;
  assert.equal((await firestore(assetPath, user.token, 'PATCH', encode({ id: 'access-check', name: 'Disposable permission check', domain: '' }).mapValue.fields)).status, 200, 'User can save a funnel in their own workspace without custom claims or a plan field');
  assert.equal((await firestore(`tenants/${user.scope}/assets`, user.token)).status, 200, 'User can list own funnels');
  assert.equal((await firestore(assetPath, outsider.token)).status, 403, 'Other workspaces remain isolated');
  assert.equal((await firestore('settings/platformTools', admin.token)).status, (await firestore('settings/platformTools', access.access_token)).status, 'Admin can read global tool policy');

  // Check admin write permission with identical policy values. No tools are
  // toggled. A compare-and-set cleanup avoids overwriting concurrent admin edits.
  const before = await firestore('settings/platformTools', admin.token);
  const previousFields = before.status === 200 ? before.data.fields : null;
  const policyFields = { tools: previousFields?.tools ?? encode({}), revision: encode(Number(previousFields?.revision?.integerValue ?? 0) + 1), updatedBy: encode(admin.uid), updatedAt: { timestampValue: new Date().toISOString() } };
  const saved = await firestore('settings/platformTools', admin.token, 'PATCH', policyFields, before.status === 200 ? before.data.updateTime : undefined);
  assert.equal(saved.status, 200, 'Admin tool configuration write is permitted');
  toolRestore = { before: previousFields, updateTime: saved.data.updateTime };
  assert.equal((await firestore('settings/platformTools', user.token, 'PATCH', saved.data.fields)).status, 403, 'Users cannot change platform policies');

  const opened = await callable('supportChat', user.token, { operation: 'open', recipientId: admin.uid });
  assert.equal(opened.status, 200, `User can open assigned admin chat: ${opened.error?.status ?? ''}`);
  roomId = opened.data.roomId;
  for (const [sender, recipient, text] of [[user, admin, 'Disposable user support check'], [admin, user, 'Disposable admin reply check']]) {
    const sent = await callable('supportChat', sender.token, { operation: 'send', recipientId: recipient.uid, messageId: crypto.randomUUID(), text, files: [] });
    assert.equal(sent.status, 200, 'Assigned support messages are accepted');
  }
  assert.equal((await firestore(`supportRooms/${roomId}/messages`, user.token)).status, 200, 'User can read live support messages');
  assert.equal((await firestore(`supportRooms/${roomId}/messages`, admin.token)).status, 200, 'Admin can read live support messages');
  assert.equal((await firestore(`supportRooms/${roomId}`, outsider.token)).status, 403, 'Unrelated user cannot read the support room');
  assert.equal((await firestore(`supportRooms/${roomId}/messages/forged`, user.token, 'PATCH', encode({ text: 'forged' }).mapValue.fields)).status, 403, 'Client cannot bypass authenticated chat callable');
  for (const provider of ['stripe', 'paddle', 'fawry', 'paymob']) assert.equal((await callable('configurePaymentMethods', admin.token, { operation: 'getGateway', provider })).status, 200, `${provider} admin configuration is accessible`);
  assert.equal((await callable('configurePaymentMethods', user.token, { operation: 'getGateway', provider: 'stripe' })).status, 403, 'Merchant secrets remain admin-only');
  console.log('PASS: own-workspace funnel writes/reads, admin tool writes, assigned support send/read, four gateway configurations, and cross-tenant/role isolation.');
} finally {
  if (toolRestore) {
    const path = 'settings/platformTools';
    const restored = await firestore(path, access.access_token, toolRestore.before ? 'PATCH' : 'DELETE', toolRestore.before ?? undefined, toolRestore.updateTime);
    if (![200, 204, 404, 409, 412].includes(restored.status)) console.error(`Policy cleanup status ${restored.status}`);
  }
  if (roomId) {
    const roomPath = `supportRooms/${roomId}`;
    const room = await firestore(roomPath, access.access_token);
    const participants = room.data.fields?.participants?.arrayValue?.values?.map(v=>v.stringValue) ?? [];
    assert.ok(participants.length === 2 && participants.every(uid => fixtures.some(f => f.uid === uid)), 'Only disposable support rooms may be deleted');
    const messages = await firestore(`${roomPath}/messages`, access.access_token);
    for (const message of messages.data.documents ?? []) {
      assert.ok(message.name.includes(`/documents/${roomPath}/messages/`));
      await remove(`${roomPath}/messages/${message.name.split('/').at(-1)}`);
    }
    await remove(roomPath);
  }
  for (const f of fixtures) {
    assert.match(f.scope, new RegExp(`^hotfix-${run}-(admin|user|outsider)$`));
    await remove(`tenants/${f.scope}/assets/access-check`);
    await remove(`tenants/${f.scope}/members/${f.uid}`);
    await remove(`tenants/${f.scope}`);
    await remove(`users/${f.uid}`);
    await auth.deleteUser(f.uid);
  }
  await deleteApp(app);
  console.log('Disposable fixtures cleaned up.');
}
