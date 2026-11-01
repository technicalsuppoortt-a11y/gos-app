// Run with Auth + Firestore emulators only. This script cannot access production.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp: adminApp, deleteApp: deleteAdminApp } = require('firebase-admin/app');
const { getFirestore: adminFirestore } = require('firebase-admin/firestore');
const { getAuth: adminAuth } = require('firebase-admin/auth');
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Auth and Firestore emulators are required.');
const projectId = 'demo-gos-admin-management';
const server = adminApp({ projectId }), db = adminFirestore(server), auth = adminAuth(server), apps = [];
const run = crypto.randomUUID();
const denied = action => assert.rejects(action, error => error.code === 'permission-denied');
async function client(role, tenantId) {
  const account = await auth.createUser({ email: `${role}-${crypto.randomUUID()}@example.com`, password: 'test-password-123' });
  await db.doc(`users/${account.uid}`).set({ name: role, role, tenantId, status: 'Active' });
  await db.doc(`tenants/${tenantId}/members/${account.uid}`).set({ role: 'Owner', active: true, permissions: ['*'] });
  const app = initializeApp({ projectId, apiKey: 'fake-api-key' }, account.uid); apps.push(app);
  const login = getAuth(app); connectAuthEmulator(login, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const database = getFirestore(app), [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':'); connectFirestoreEmulator(database, host, Number(port));
  await signInWithEmailAndPassword(login, account.email, 'test-password-123'); return { db: database, uid: account.uid };
}
try {
  const a = `a-${run}`, b = `b-${run}`;
  const user = await client('USER', a), admin = await client('ADMIN', b), superAdmin = await client('SUPER_ADMIN', b);
  await db.doc(`tenants/${a}`).set({ name: 'Workspace A', ownerId: user.uid });
  await db.doc(`tenants/${b}`).set({ name: 'Workspace B', ownerId: admin.uid });
  for (const resource of ['assets', 'leads', 'calendars', 'bookings', 'products', 'orders', 'transactions']) {
    await db.doc(`tenants/${b}/${resource}/record`).set({ name: resource });
    await denied(() => getDocs(collection(user.db, 'tenants', b, resource)));
    await getDocs(collection(admin.db, 'tenants', a, resource));
    await getDocs(collection(superAdmin.db, 'tenants', a, resource));
  }
  // The tenant owner's ordinary asset workflow remains unchanged by catalog permissions.
  await setDoc(doc(user.db, 'tenants', a, 'assets', 'owned'), { name: 'Owned draft' });
  assert.equal((await getDoc(doc(user.db, 'tenants', a, 'assets', 'owned'))).data().name, 'Owned draft');
  const template = { name: 'Master', category: 'Funnels', source: 'official', active: false, status: 'Draft', content: { headline: 'Hello', steps: [], settings: { enabled: false, language: 'en' } }, updatedBy: admin.uid };
  const reference = doc(admin.db, 'templateCatalog', run);
  await denied(() => setDoc(doc(user.db, 'templateCatalog', run), { ...template, updatedBy: user.uid }));
  await setDoc(reference, template);
  await setDoc(reference, { ...template, active: true, status: 'Published' });
  assert.equal((await getDoc(doc(user.db, 'templateCatalog', run))).data().active, true);
  await denied(() => setDoc(reference, { ...template, category: 'Invalid' }));
  await denied(() => setDoc(reference, { ...template, updatedBy: user.uid }));
  await denied(() => deleteDoc(doc(user.db, 'templateCatalog', run)));
  await deleteDoc(doc(superAdmin.db, 'templateCatalog', run));
  console.log('Admin catalog CRUD and cross-tenant rules passed.');
} finally { await Promise.all(apps.map(app => deleteApp(app))); await deleteAdminApp(server); }
