// Run only through Firebase emulators:exec against the demo project below.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, getDocs, serverTimestamp, writeBatch, setDoc, terminate } from 'firebase/firestore';
import { PAGE_IDS, WORKSPACE_PAGE_IDS } from '../functions/bridge.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST)
  throw Error('Start the local Auth and Firestore emulators before running these rules checks.');
const projectId = 'demo-launch-brand-saves';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp: initializeAdmin, deleteApp: deleteAdmin } = require('firebase-admin/app');
const { getFirestore: adminFirestore } = require('firebase-admin/firestore');
const { getAuth: adminAuth } = require('firebase-admin/auth');
const admin = initializeAdmin({ projectId }, 'launch-brand-rules-server');
const database = adminFirestore(admin, 'launch-brand');
const sessions = [];

async function client(launchBrand = true) {
  const account = await adminAuth(admin).createUser({ email: `${crypto.randomUUID()}@example.com`, password: 'local-test-password' });
  if (launchBrand) await adminAuth(admin).setCustomUserClaims(account.uid, { launchBrand: true });
  await database.doc(`users/${account.uid}`).set({ role: 'user' });
  const app = initializeApp({ projectId, apiKey: 'local-key' }, account.uid);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  await signInWithEmailAndPassword(auth, account.email, 'local-test-password');
  const db = getFirestore(app, 'launch-brand');
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(db, host, Number(port));
  const session = { app, db, uid: account.uid };
  sessions.push(session);
  return session;
}
function save(session, pageIds, revision, owner = session.uid) {
  const batch = writeBatch(session.db);
  for (const pageId of pageIds) {
    batch.set(doc(session.db, 'users', owner, 'pages', pageId), {
      pageId, pageName: pageId, schemaVersion: 1, parameters: { saved: revision },
      revision, updatedAt: serverTimestamp(),
    });
  }
  batch.set(doc(session.db, 'users', owner, 'brandEngine', 'draft'), {
    schemaVersion: 1, revision, pageIds, updatedAt: serverTimestamp(),
  });
  return batch.commit();
}
const denied = operation => assert.rejects(operation, error => error.code === 'permission-denied');

try {
  const owner = await client(), other = await client(), withoutClaim = await client(false);
  await save(owner, PAGE_IDS, 'legacy');
  await save(owner, WORKSPACE_PAGE_IDS, 'five-page-revision');
  const pages = (await getDocs(collection(owner.db, 'users', owner.uid, 'pages'))).docs;
  assert.equal(pages.length, 10);
  for (const page of pages) assert.equal(page.data().revision, WORKSPACE_PAGE_IDS.includes(page.id) ? 'five-page-revision' : 'legacy');
  await denied(() => save(other, WORKSPACE_PAGE_IDS, 'not-the-owner', owner.uid));
  await denied(() => save(withoutClaim, WORKSPACE_PAGE_IDS, 'missing-claim'));
  await denied(() => save(owner, [...WORKSPACE_PAGE_IDS, 'vision_journey'], 'unsupported-scope'));
  await denied(() => setDoc(doc(owner.db, 'users', owner.uid, 'pages', 'branding'), {
    pageId: 'branding', pageName: 'Branding', schemaVersion: 1, parameters: {},
    revision: 'uncommitted-revision', updatedAt: serverTimestamp(),
  }));
  console.log('PASS five-page migration, untouched legacy pages, ownership, launch claim, supported manifest scope and atomic revisions.');
} finally {
  for (const session of sessions) { await terminate(session.db); await deleteApp(session.app); }
  await deleteAdmin(admin);
}
