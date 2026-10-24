// Uses the signed-in Firebase CLI account. Never logs credentials or custom tokens.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const cli = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url));
const sdk = createRequire(new URL('../functions/package.json', import.meta.url));
const { getGlobalDefaultAccount, getAccessToken } = cli('./lib/auth.js');
const account = getGlobalDefaultAccount();
if (!account) throw Error('Sign in with the Firebase CLI first.');
const access = account.tokens.access_token && account.tokens.expires_at > Date.now() + 60000
  ? account.tokens
  : await getAccessToken(account.tokens.refresh_token, account.tokens.scopes ?? ['https://www.googleapis.com/auth/cloud-platform']);
const projectId = 'gos-app-3c7fb';
const documents = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
async function read(path) {
  const response = await fetch(`${documents}/${path}`, { headers: { Authorization: `Bearer ${access.access_token}` }, signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (response.status === 404) return null;
  assert.ok(response.ok, `Firestore inspection failed: ${data.error?.message}`);
  return data;
}
const decode = doc => Object.fromEntries(Object.entries(doc?.fields ?? {}).map(([key, value]) => [key, value.stringValue ?? value.booleanValue ?? value.integerValue]));
const profiles = [];
let pageToken = '';
do {
  const result = await read(`users?pageSize=100${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`);
  profiles.push(...(result.documents ?? []).map(doc => ({ ...decode(doc), id: doc.name.split('/').at(-1) })));
  pageToken = result.nextPageToken;
} while (pageToken);
const targets = profiles.filter(profile => ['kareem', 'ahmed', 'brand'].includes(String(profile.name).trim().toLowerCase()) && !profile.activatedUid);
for (const target of targets) {
  const member = target.tenantId ? decode(await read(`tenants/${target.tenantId}/members/${target.id}`)) : null;
  console.log(JSON.stringify({ name: target.name, id: target.id, role: target.role, status: target.status, tenantId: target.tenantId ?? null, memberActive: member?.active ?? null }));
}
if (process.argv.includes('--inspect')) process.exit(0);
assert.equal(targets.length, 3, 'All three requested user profiles must be located.');
const { initializeApp, deleteApp } = sdk('firebase-admin/app');
const { getAuth } = sdk('firebase-admin/auth');
const app = initializeApp({ projectId, serviceAccountId: `${projectId}@appspot.gserviceaccount.com`, credential: { getAccessToken: async () => ({ access_token: access.access_token, expires_in: 3600 }) } }, 'admin-switch-smoke');
const config = JSON.parse(readFileSync(new URL('../src/backend/gos-public-config.json', import.meta.url), 'utf8'));
async function exchange(customToken) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${config.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  assert.ok(response.ok, `Token exchange failed: ${data.error?.message}`);
  return data;
}
let testActor;
try {
  // Disposable admin fixture avoids accessing or changing anyone's admin credentials.
  const password = `Smoke_${crypto.randomUUID()}_aA1!`;
  testActor = await getAuth(app).createUser({ email: `switch-smoke-${crypto.randomUUID()}@example.com`, password });
  const profile = await fetch(`${documents}/users/${testActor.uid}`, { method: 'PATCH', headers: { Authorization: `Bearer ${access.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { role: { stringValue: 'ADMIN' }, status: { stringValue: 'Active' }, tenantId: { stringValue: `switch-smoke-${testActor.uid}` } } }), signal: AbortSignal.timeout(30000) });
  assert.equal(profile.status, 200, 'Create temporary test administrator profile');
  const login = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: testActor.email, password, returnSecureToken: true }), signal: AbortSignal.timeout(30000) });
  const signedIn = await login.json();
  assert.equal(login.status, 200, 'Sign in temporary test administrator');
  for (const target of targets) {
    const payload = process.argv.includes('--aliases') ? { action: 'switch', targetUid: target.id, workspaceId: target.tenantId } : { operation: 'impersonate', id: target.id, tenantId: target.tenantId };
    const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/manageUser`, { method: 'POST', headers: { Authorization: `Bearer ${signedIn.idToken}`, 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify({ data: payload }), signal: AbortSignal.timeout(60000) });
    const data = await response.json();
    console.log(JSON.stringify({ name: target.name, status: response.status, error: data.error ?? null }));
    if (process.argv.includes('--diagnose')) continue;
    assert.equal(response.status, 200, `Switch failed for ${target.name}: ${JSON.stringify(data.error)}`);
    assert.equal(data.result.user.id, target.id);
    assert.equal(data.result.tenant.id, target.tenantId);
    const session = await exchange(data.result.customToken);
    const claims = JSON.parse(Buffer.from(session.idToken.split('.')[1], 'base64url').toString('utf8'));
    assert.equal(claims.sub, target.id);
    assert.equal(claims.tenantId, target.tenantId);
    // Verify that the target token can read its actual workspace under deployed rules.
    const member = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tenants/${target.tenantId}/members/${target.id}`, { headers: { Authorization: `Bearer ${session.idToken}` }, signal: AbortSignal.timeout(30000) });
    assert.equal(member.status, 200, `Workspace access failed for ${target.name}`);
  }
} finally {
  if (testActor) {
    await getAuth(app).deleteUser(testActor.uid);
    const removed = await fetch(`${documents}/users/${testActor.uid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${access.access_token}` }, signal: AbortSignal.timeout(30000) });
    assert.ok(removed.ok, 'Remove temporary test administrator profile');
  }
  await deleteApp(app);
}
