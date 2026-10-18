// Run through Firebase emulators:exec. Never points at a live Firebase project.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, collection, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp: initializeAdmin, deleteApp: deleteAdmin } = require('firebase-admin/app');
const { getFirestore: adminFirestore } = require('firebase-admin/firestore');
const { getAuth: adminAuth } = require('firebase-admin/auth');

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Start Auth and Firestore emulators with project demo-gos-user-dashboard before running this test.');
const projectId = 'demo-gos-user-dashboard';
const server = initializeAdmin({ projectId }, 'rules-server');
const db = adminFirestore(server), auth = adminAuth(server);
const run = crypto.randomUUID().slice(0,8), clients = [];
const denied = action => assert.rejects(action, error => error.code === 'permission-denied');
async function client(role, tenantId, permissions = ['*']) {
  const account = await auth.createUser({ email: `${role.toLowerCase()}-${crypto.randomUUID()}@example.com`, password: 'test-password-123' });
  await db.doc(`users/${account.uid}`).set({ id: account.uid, name: role, email: account.email, role, tenantId, status: 'Active' });
  await db.doc(`tenants/${tenantId}/members/${account.uid}`).set({ role: 'Member', active: true, permissions });
  const app = initializeApp({ apiKey: 'fake-api-key', projectId, authDomain: 'localhost' }, account.uid); clients.push(app);
  const session = getAuth(app); connectAuthEmulator(session, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  await signInWithEmailAndPassword(session, account.email, 'test-password-123');
  const database = getFirestore(app), [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(database, host, Number(port));
  return { account, db: database };
}
try {
  const tenantA = `rules-a-${run}`, tenantB = `rules-b-${run}`;
  const owner = await client('USER', tenantA), other = await client('USER', tenantB), admin = await client('ADMIN', tenantA), superAdmin = await client('SUPER_ADMIN', tenantA), limited = await client('USER', tenantA, ['inbox']);
  await setDoc(doc(owner.db, 'tenants', tenantA, 'products', 'product'), { name: 'Owned product' });
  await denied(() => getDoc(doc(other.db, 'tenants', tenantA, 'products', 'product')));
  await denied(() => setDoc(doc(owner.db, 'users', owner.account.uid), { role: 'SUPER_ADMIN' }));
  await denied(() => setDoc(doc(owner.db, 'tenants', tenantA, 'members', owner.account.uid), { permissions: ['*'] }));
  await denied(() => setDoc(doc(owner.db, 'tenants', tenantA, 'transactions', 'fake-paid'), { status: 'PAID', amount: 999 }));
  await denied(() => setDoc(doc(owner.db, 'tenants', tenantA, 'bookings', 'unchecked'), { status: 'Confirmed' }));
  await denied(() => getDocs(collection(limited.db, 'tenants', tenantA, 'products')));
  await denied(() => getDocs(collection(owner.db, 'users')));
  await getDocs(query(collection(admin.db, 'users'), where('role', '==', 'USER')));
  await denied(() => getDocs(collection(admin.db, 'users')));
  await getDocs(collection(superAdmin.db, 'users'));
  await db.doc(`tenants/${tenantA}/copilotConversations/private`).set({ actorId: owner.account.uid, text: 'Private history' });
  await denied(() => getDoc(doc(limited.db, 'tenants', tenantA, 'copilotConversations', 'private')));
  await db.doc(`users/${owner.account.uid}`).update({ status: 'Deactivated' });
  await denied(() => getDoc(doc(owner.db, 'tenants', tenantA, 'products', 'product')));
  console.log('PASS tenant isolation, role escalation denial, module permissions, server-only payments/bookings, account listing limits and deactivation.');
} finally { await Promise.all(clients.map(app => deleteApp(app))); await deleteAdmin(server); }
