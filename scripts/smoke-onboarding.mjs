// Low-memory, live onboarding smoke test. Creates and cleans up disposable records.
// Pass the Firebase CLI configstore JSON path; credential values are never printed.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const oauth = config.tokens.access_token;
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line.includes('=')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const project = 'gos-app-3c7fb', run = crypto.randomUUID().slice(0, 12), root = `tenants/onboarding-smoke-${run}`;
const accounts = [], documents = new Set([root]);
const authBase = `https://identitytoolkit.googleapis.com/v1/projects/${project}`;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
async function request(url, body, bearer = oauth, method = 'POST') {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000) });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: { message: 'Non-JSON provider response' } }; }
  return { status: response.status, data };
}
function encode(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  return { stringValue: value };
}
const fields = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)]));
const decode = doc => Object.fromEntries(Object.entries(doc.fields ?? {}).map(([key, value]) => [key, value.stringValue ?? value.booleanValue ?? value.integerValue]));
async function save(path, data) { documents.add(path); const r = await request(`${firestoreBase}/${path}`, { fields: fields(data) }, oauth, 'PATCH'); assert.equal(r.status, 200, 'Disposable fixture write'); }
async function read(path) { const r = await request(`${firestoreBase}/${path}`, null, oauth, 'GET'); assert.equal(r.status, 200); return decode(r.data); }
async function call(name, data, token) {
  const url = `https://us-central1-${project}.cloudfunctions.net/${name}`;
  let result;
  // Retrying this idempotent activation endpoint is safe after a transient cold-start error.
  for (let attempt = 0; attempt < 3; attempt++) {
    result = await request(url, { data }, token || '', 'POST');
    if (name !== 'activateUser' || result.status < 500) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return { status: result.status, result: result.data.result, error: result.data.error };
}
const clientAuth = (action, body) => request(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(env.VITE_FIREBASE_API_KEY)}`, body, '');
let adminId;
try {
  const password = `Smoke-${crypto.randomUUID()}!`, email = `onboarding-admin-${run}@example.com`;
  const created = await request(`${authBase}/accounts`, { email, password, displayName: 'Disposable onboarding admin' });
  assert.equal(created.status, 200, 'CLI OAuth credentials must permit disposable account creation');
  adminId = created.data.localId; accounts.push(adminId);
  const tenantId = root.split('/')[1];
  assert.equal((await request(`${authBase}/accounts:update`, { localId: adminId, customAttributes: JSON.stringify({ role: 'ADMIN', tenantId }) })).status, 200);
  await save(`users/${adminId}`, { id: adminId, email, name: 'Disposable onboarding admin', role: 'ADMIN', tenantId, status: 'Active' });
  await save(root, { name: 'Disposable onboarding test' });
  await save(`${root}/members/${adminId}`, { role: 'Owner', active: true, status: 'Active', permissions: ['*'] });
  const signedAdmin = await clientAuth('signInWithPassword', { email, password, returnSecureToken: true });
  assert.equal(signedAdmin.status, 200);
  const adminToken = signedAdmin.data.idToken;
  const invitedEmail = `onboarding-invite-${run}@example.com`;
  const invitation = await call('manageUser', { operation: 'create', email: invitedEmail, name: 'Disposable invite', role: 'USER' }, adminToken);
  assert.equal(invitation.status, 200, JSON.stringify(invitation.error));
  const uid = invitation.result.id; accounts.push(uid);
  const activationLink = new URL(invitation.result.link);
  assert.equal(activationLink.origin, 'https://gos-app-3c7fb.web.app');
  assert.equal(activationLink.pathname, '/onboarding/activate-account');
  assert.equal(activationLink.searchParams.get('mode'), 'resetPassword');
  assert.ok(activationLink.searchParams.get('oobCode'));
  const renewed = await call('manageUser', { operation: 'activationLink', id: uid }, adminToken);
  assert.equal(renewed.status, 200);
  assert.equal(new URL(renewed.result.link).pathname, '/onboarding/activate-account');
  const profilePath = `users/${uid}`, memberPath = `tenants/workspace-${uid}/members/${uid}`;
  for (const path of [profilePath, memberPath, `tenants/workspace-${uid}`]) documents.add(path);
  assert.equal(invitation.result.status, 'Pending');
  assert.equal((await read(profilePath)).status, 'Pending');
  assert.equal((await read(memberPath)).status, 'Pending'); assert.equal((await read(memberPath)).active, false);
  const listedStatus = async () => {
    const listed = await request(`${firestoreBase}:runQuery`, { structuredQuery: { from: [{ collectionId: 'users' }], where: { compositeFilter: { op: 'AND', filters: [ { fieldFilter: { field: { fieldPath: 'role' }, op: 'EQUAL', value: { stringValue: 'USER' } } }, { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: invitedEmail } } } ] } } } }, adminToken);
    assert.equal(listed.status, 200, 'Admin table query must pass deployed rules');
    return decode(listed.data.find(row => row.document)?.document ?? {}).status;
  };
  assert.equal(await listedStatus(), 'Pending');
  assert.equal((await call('activateUser', {}, '')).status, 401);
  assert.equal((await call('manageUser', { operation: 'status', id: uid, status: 'Active' }, adminToken)).status, 400);
  console.log('PASS provisioning and admin query report Pending; membership is inactive; anonymous and manual activation are blocked');
  const chosen = `Activation-${crypto.randomUUID()}!`;
  const setup = await clientAuth('resetPassword', { oobCode: new URL(renewed.result.link).searchParams.get('oobCode'), newPassword: chosen });
  assert.equal(setup.status, 200);
  assert.equal((await read(profilePath)).status, 'Pending');
  const wrong = await clientAuth('signInWithPassword', { email: invitedEmail, password: 'wrong-password', returnSecureToken: true });
  assert.equal(wrong.status, 400); assert.equal((await read(profilePath)).status, 'Pending');
  console.log('PASS password setup alone and failed login both leave the invite Pending');
  const signed = await clientAuth('signInWithPassword', { email: invitedEmail, password: chosen, returnSecureToken: true });
  assert.equal(signed.status, 200);
  const token = signed.data.idToken;
  const activated = await Promise.all([call('activateUser', { id: adminId, role: 'SUPER_ADMIN' }, token), call('activateUser', {}, token)]);
  for (const result of activated) assert.equal(result.status, 200, JSON.stringify(result.error));
  const profile = await read(profilePath), member = await read(memberPath);
  assert.equal(profile.status, 'Active'); assert.equal(member.status, 'Active'); assert.equal(member.active, true);
  assert.equal(profile.activatedAt, member.activatedAt); assert.equal(profile.role, 'USER');
  assert.equal(await listedStatus(), 'Active');
  console.log('PASS first successful password sign-in activates both records together; repeated calls are safe; admin query updates to Active');
  assert.equal((await call('manageUser', { operation: 'status', id: uid, status: 'Deactivated' }, adminToken)).status, 200);
  assert.ok([401, 403].includes((await call('activateUser', {}, token)).status));
  assert.equal((await read(profilePath)).status, 'Deactivated');
  console.log('PASS activation cannot restore a deactivated account');
} finally {
  const failures = [];
  if (adminId) {
    const audit = await request(`${firestoreBase}:runQuery`, { structuredQuery: { from: [{ collectionId: 'userManagementAudit' }], where: { fieldFilter: { field: { fieldPath: 'actorId' }, op: 'EQUAL', value: { stringValue: adminId } } } } });
    if (audit.status === 200) for (const row of audit.data) if (row.document) documents.add(row.document.name.split('/documents/')[1]);
  }
  for (const path of [...documents].sort((a, b) => b.split('/').length - a.split('/').length)) {
    const r = await request(`${firestoreBase}/${path}`, null, oauth, 'DELETE'); if (![200, 404].includes(r.status)) failures.push(path);
  }
  for (const localId of accounts) { const r = await request(`${authBase}/accounts:delete`, { localId }); if (r.status !== 200) failures.push('disposable-auth-account'); }
  assert.equal(failures.length, 0, 'Disposable fixture cleanup must complete');
  console.log('Disposable onboarding accounts and records cleaned up');
}
