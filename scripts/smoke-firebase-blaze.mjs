// Live, reversible smoke test. Uses a disposable workspace/account; never sends messages.
// Pass the firebase-tools installation directory as the first argument.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const sdk = createRequire(new URL('../functions/package.json', import.meta.url));
const clientSdk = createRequire(new URL('../package.json', import.meta.url));
const cli = createRequire(resolve(process.argv[2], 'package.json'));
const { configstore } = cli('./lib/configstore.js');
const tokens = await cli('./lib/auth.js').getAccessToken(configstore.get('tokens').refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const { initializeApp, deleteApp } = sdk('firebase-admin/app');
const { Firestore } = sdk('@google-cloud/firestore');
const { OAuth2Client } = cli('google-auth-library');
const oauth = new OAuth2Client();
oauth.setCredentials({ access_token: tokens.access_token, expiry_date: Date.now() + 3600000 });
const { getAuth } = sdk('firebase-admin/auth');
const app = initializeApp({ projectId: 'gos-app-3c7fb', credential: { getAccessToken: async () => ({ access_token: tokens.access_token, expires_in: 3600 }) } }, 'blaze-smoke');
const db = new Firestore({ projectId: 'gos-app-3c7fb', authClient: oauth }), auth = getAuth(app);
const run = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
const tenantId = `blaze-smoke-${run}`, root = db.doc(`tenants/${tenantId}`);
const created = [];
let actor;
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line.includes('=')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
async function call(name, data, bearer) {
  const response = await fetch(`https://us-central1-gos-app-3c7fb.cloudfunctions.net/${name}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify({ data }), signal: AbortSignal.timeout(90000),
  });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); }
  catch { throw new Error(`${name} returned HTTP ${response.status} with a non-JSON response.`); }
  return { status: response.status, data: body.result, error: body.error };
}
try {
  actor = await auth.createUser({ email: `blaze-smoke-${run}@example.com`, password: `Smoke-${crypto.randomUUID()}!` });
  created.push(actor.uid);
  // Test admin onboarding through a real Firebase ID token.
  const password = `Smoke-${crypto.randomUUID()}!`;
  await auth.updateUser(actor.uid, { password });
  await auth.setCustomUserClaims(actor.uid, { role: 'ADMIN', tenantId });
  await db.doc(`users/${actor.uid}`).set({ id: actor.uid, name: 'Deployment smoke', email: actor.email, role: 'ADMIN', tenantId, status: 'Active' });
  await root.set({ name: 'Temporary deployment smoke', ownerId: actor.uid });
  await root.collection('members').doc(actor.uid).set({ active: true, role: 'Owner', permissions: ['*'] });
  const sessionResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(env.VITE_FIREBASE_API_KEY)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: actor.email, password, returnSecureToken: true }) });
  const session = await sessionResponse.json();
  assert.ok(session.idToken, 'Disposable Firebase sign-in must succeed');
  const bearer = session.idToken;
  const escalation = await fetch(`https://firestore.googleapis.com/v1/projects/gos-app-3c7fb/databases/(default)/documents/users/${actor.uid}?updateMask.fieldPaths=role`, { method: 'PATCH', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { role: { stringValue: 'SUPER_ADMIN' } } }) });
  assert.equal(escalation.status, 403, 'Deployed rules must block client role escalation');
  const verificationLink = await auth.generateEmailVerificationLink(actor.email);
  const clientApp = clientSdk('firebase/app').initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, projectId: 'gos-app-3c7fb', authDomain: env.VITE_FIREBASE_AUTH_DOMAIN }, `verification-${run}`);
  try {
    await clientSdk('firebase/auth').applyActionCode(clientSdk('firebase/auth').getAuth(clientApp), new URL(verificationLink).searchParams.get('oobCode'));
    assert.equal((await auth.getUser(actor.uid)).emailVerified, true);
    console.log('PASS applyActionCode verifies a real email action code without entering password reset');
  } finally { await clientSdk('firebase/app').deleteApp(clientApp); }
  const unauthorized = await call('manageUser', { operation: 'create', email: `unauthorized-${run}@example.com` });
  assert.equal(unauthorized.status, 401);
  const invitation = await call('manageUser', { operation: 'create', email: `blaze-invite-${run}@example.com`, name: 'Deployment invite', role: 'USER' }, bearer);
  assert.equal(invitation.status, 200, JSON.stringify(invitation.error));
  created.push(invitation.data.id);
  const account = await auth.getUser(invitation.data.id);
  assert.equal(account.customClaims.role, 'USER');
  assert.equal(account.customClaims.tenantId, `workspace-${account.uid}`);
  assert.ok(new URL(invitation.data.link).searchParams.get('oobCode'));
  console.log('PASS manageUser creates real Auth account, role/tenant claims and password-setup action code; unauthenticated admin access denied');
  const inviteRef = db.doc(`users/${account.uid}`), memberRef = db.doc(`tenants/workspace-${account.uid}/members/${account.uid}`);
  assert.equal(invitation.data.status, 'Pending');
  assert.equal((await inviteRef.get()).data().status, 'Pending');
  assert.equal((await memberRef.get()).data().status, 'Pending');
  assert.equal((await memberRef.get()).data().active, false);
  const bypass = await call('manageUser', { operation: 'status', id: account.uid, status: 'Active' }, bearer);
  assert.equal(bypass.status, 400, 'An admin cannot bypass the first-login requirement');
  const inviteeApp = clientSdk('firebase/app').initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, projectId: 'gos-app-3c7fb', authDomain: env.VITE_FIREBASE_AUTH_DOMAIN }, `activation-${run}`);
  try {
    const clientAuth = clientSdk('firebase/auth'), inviteeAuth = clientAuth.getAuth(inviteeApp);
    const chosenPassword = `Activation-${crypto.randomUUID()}!`;
    await clientAuth.confirmPasswordReset(inviteeAuth, new URL(invitation.data.link).searchParams.get('oobCode'), chosenPassword);
    assert.equal((await inviteRef.get()).data().status, 'Pending', 'Password setup alone must not activate the profile');
    await assert.rejects(clientAuth.signInWithEmailAndPassword(inviteeAuth, account.email, 'incorrect-password'));
    assert.equal((await inviteRef.get()).data().status, 'Pending', 'A failed login must leave the invitation pending');
    const signedIn = await clientAuth.signInWithEmailAndPassword(inviteeAuth, account.email, chosenPassword);
    const inviteeToken = await signedIn.user.getIdToken();
    const results = await Promise.all([call('activateUser', { id: actor.uid, role: 'SUPER_ADMIN' }, inviteeToken), call('activateUser', {}, inviteeToken)]);
    for (const result of results) assert.equal(result.status, 200, JSON.stringify(result.error));
    const activated = (await inviteRef.get()).data(), member = (await memberRef.get()).data();
    assert.equal(activated.status, 'Active'); assert.equal(member.status, 'Active'); assert.equal(member.active, true);
    assert.equal(activated.activatedAt, member.activatedAt); assert.equal(activated.role, 'USER');
    const deactivate = await call('manageUser', { operation: 'status', id: account.uid, status: 'Deactivated' }, bearer);
    assert.equal(deactivate.status, 200);
    const reactivation = await call('activateUser', {}, inviteeToken);
    assert.equal(reactivation.status, 403, 'Activation must never restore a deactivated account');
    console.log('PASS invite stays Pending through password setup and failed login; first password sign-in activates profile and membership together; retries are safe and deactivation is respected');
  } finally { await clientSdk('firebase/app').deleteApp(inviteeApp); }
  if (!process.argv.includes('--onboarding-only')) {
  const day = new Date(Date.now() + 3 * 86400000); day.setUTCHours(12, 0, 0, 0);
  const date = day.toISOString().slice(0, 10), slug = `blaze-smoke-${run}`;
  const page = { id: 'smoke', name: 'Temporary smoke calendar', slug, active: true, free: true, duration: 30, durationOptions: [30], hostTimezone: 'UTC', minNotice: 0, maxAdvanceBooking: 60, groupCapacity: 1, dailyLimit: 10, availability: Array.from({ length: 7 }, (_, day) => ({ day, enabled: true, start: '09:00', end: '17:00' })), questions: [], afterBooking: { allowCancelReschedule: true }, passwordProtect: false, password: 'must-not-leak' };
  await root.collection('calendars').doc('smoke').set(page);
  const availability = await call('publicBooking', { slug });
  assert.equal(availability.status, 200, JSON.stringify(availability.error));
  assert.equal(availability.data.page.password, undefined);
  const booking = { id: `booking-${run}`, name: 'Temporary visitor', email: `visitor-${run}@example.com`, date, start: day.toISOString(), duration: 30, customAnswers: {}, guests: [] };
  const token = crypto.randomUUID();
  const [first, second] = await Promise.all([
    call('publicBooking', { slug, operation: 'create', booking, token }),
    call('publicBooking', { slug, operation: 'create', booking: { ...booking, id: `other-${run}` }, token }),
  ]);
  assert.equal([first, second].filter(r => r.status === 200).length, 1, 'Only one concurrent slot lock may win');
  const winner = first.status === 200 ? booking : { ...booking, id: `other-${run}` };
  const busy = await call('publicBooking', { slug });
  assert.ok(busy.data.bookings.every(b => !b.email && !b.name && !b.customAnswers));
  const denied = await call('publicBooking', { slug, operation: 'cancel', booking: winner, token: crypto.randomUUID() });
  assert.equal(denied.status, 403);
  const cancelled = await call('publicBooking', { slug, operation: 'cancel', booking: winner, token });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.error));
  assert.equal(cancelled.data.booking.status, 'Canceled');
  console.log('PASS public availability/create/cancel without sign-in, concurrent slot exclusion, private busy data and management-token authorization');
  const queued = await call('queueMessage', { conversationId: 'not-linked', text: 'Never delivered', requestId: `smoke-${run}` }, bearer);
  assert.equal(queued.status, 404);
  console.log('PASS queueMessage rejects an unlinked conversation without fabricating delivery');
  await root.collection('leads').doc('smoke-lead').set({ email: actor.email, name: 'Temporary lead', followUpState: 'NEW', hasEmailConsent: true });
  await root.collection('conversations').doc('smoke-thread').set({ leadId: 'smoke-lead', channel: 'email', aiMode: 'on' });
  // Only disposable Firestore configuration: live dispatch is deliberately not deployed.
  await root.collection('integrations').doc('email').set({ status: 'CONNECTED' });
  const payload = { conversationId: 'smoke-thread', text: 'Deployment smoke - never delivered', requestId: `message-${run}` };
  const manual = await call('queueMessage', payload, bearer);
  assert.equal(manual.status, 200, JSON.stringify(manual.error));
  const repeated = await call('queueMessage', payload, bearer);
  assert.equal(repeated.data.id, manual.data.id);
  assert.equal((await root.collection('messages').get()).size, 1);
  await root.collection('workflows').doc('smoke-workflow').set({ active: true, from: 'NEW', messageText: 'Deployment smoke - never delivered', sequenceSteps: [{ action: 'Email', delay: '1', unit: 'minute' }] });
  const workflowRun = await call('startWorkflow', { workflowId: 'smoke-workflow', requestId: `run-${run}` }, bearer);
  assert.equal(workflowRun.status, 200, JSON.stringify(workflowRun.error));
  const action = root.collection('scheduledActions').doc(`run-${run}-smoke-lead-0`);
  await action.update({ dueAt: new Date(Date.now() - 60000).toISOString() });
  const scheduledRun = await fetch('https://cloudscheduler.googleapis.com/v1/projects/gos-app-3c7fb/locations/us-central1/jobs/firebase-schedule-processScheduledActions-us-central1:run', { method: 'POST', headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' }, body: '{}' });
  assert.ok(scheduledRun.ok, `Scheduler trigger HTTP ${scheduledRun.status}`);
  for (let attempt = 0; attempt < 50 && (await action.get()).data()?.status === 'pending'; attempt++) await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal((await action.get()).data()?.status, 'queued');
  assert.equal((await root.collection('messages').doc(`scheduled-${action.id}`).get()).data()?.status, 'queued');
  console.log('PASS real Cloud Scheduler invocation processes due scheduledActions; queueMessage is idempotent; messages remain queued with live dispatch disabled');
  const pausedRun = await call('startWorkflow', { workflowId: 'smoke-workflow', requestId: `pause-${run}` }, bearer);
  assert.equal(pausedRun.status, 200);
  const pausedAction = root.collection('scheduledActions').doc(`pause-${run}-smoke-lead-0`);
  await root.collection('conversations').doc('smoke-thread').update({ takenOver: true });
  for (let attempt = 0; attempt < 50 && (await pausedAction.get()).data()?.status === 'pending'; attempt++) await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal((await pausedAction.get()).data()?.status, 'cancelled');
  assert.equal((await root.collection('leads').doc('smoke-lead').get()).data()?.followUpState, 'HUMAN_HANDOFF');
  console.log('PASS conversation takeover and lead-change Firestore triggers cancel pending follow-ups');
  }
} finally {
  for (const uid of created) {
    await db.recursiveDelete(db.doc(`tenants/workspace-${uid}`));
    await db.doc(`users/${uid}`).delete();
    await auth.deleteUser(uid).catch(() => {});
  }
  if (actor) {
    const audit = await db.collection('userManagementAudit').where('actorId', '==', actor.uid).get();
    for (const row of audit.docs) await row.ref.delete();
  }
  await db.recursiveDelete(root);
  await db.terminate();
  await deleteApp(app);
  console.log('Disposable smoke accounts and workspace cleaned up');
}
