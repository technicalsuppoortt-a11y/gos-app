// One-time copy of Launch Brand data from Joe Academy (phoenix-app-8bc7b,
// default database) to gos-app (gos-app-3c7fb, database "launch-brand").
// Same document IDs, same fields, same structure. Safe to run again: it
// overwrites the copy with Joe Academy's current values.
//
//   node migrate-from-joe-academy.mjs --dry-run      (count only, writes nothing)
//   node migrate-from-joe-academy.mjs                (copy everything)
//   node migrate-from-joe-academy.mjs --globals-only (only AI / discovery settings)
//   node migrate-from-joe-academy.mjs --uid=<joeUid> (one user)
//   node migrate-from-joe-academy.mjs --to-emulator --uid=<joeUid>
//        (local testing: copy into the gos Firestore emulator on 127.0.0.1:8080, no files)
//
// Needs Application Default Credentials for an account that can read
// phoenix-app-8bc7b and write gos-app-3c7fb (Google Cloud Shell works).
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const args = new Map(process.argv.slice(2).map(arg => { const [key, value = 'true'] = arg.replace(/^--/, '').split('='); return [key, value]; }));
const dryRun = args.has('dry-run');
const onlyUid = args.get('uid');
const globalsOnly = args.has('globals-only');
const toEmulator = args.has('to-emulator');

const source = initializeApp({ credential: applicationDefault(), projectId: 'phoenix-app-8bc7b', storageBucket: 'phoenix-app-8bc7b.firebasestorage.app' }, 'joe-academy');
const target = initializeApp({ credential: applicationDefault(), projectId: 'gos-app-3c7fb', storageBucket: 'gos-app-3c7fb.firebasestorage.app' }, 'gos-app');
const from = getFirestore(source);
const to = getFirestore(target, 'launch-brand');
if (toEmulator) to.settings({ host: args.get('emulator-host') || '127.0.0.1:8080', ssl: false });

// Global documents Launch Brand reads (AI connection, discovery catalog/settings, tenant).
const GLOBAL_COLLECTIONS = ['aiConnections', 'aiUsage', 'aiAdminAudit', 'discoveryCatalog', 'discoveryCatalogDrafts', 'discoveryCatalogVersions', 'discoveryCatalogAudit', 'discoverySettings', 'discoverySettingsVersions'];
const GLOBAL_DOCS = ['tenants/global'];
// Everything Launch Brand keeps under users/{uid}.
const USER_COLLECTIONS = ['brandEngine', 'pages', 'assets', 'conversations', 'notifications', 'aiJobs', 'aiUsageEvents', 'aiUsageDaily', 'aiUsageSummary', 'aiUsageLegacy', 'aiUsage', 'aiSettings', 'aiConnections', 'aiBrowserCredentials', 'aiCenterMessages', 'aiOperationEvents', 'logoGenerationCredits', 'logoGenerationAttempts', 'billing', 'brandEngineImports', 'brandEngineSnapshots', 'brandEngineAssets'];

const counts = { documents: 0, users: 0, files: 0 };
const writer = dryRun ? null : to.bulkWriter();
writer?.onWriteError(error => { console.error('write failed', error.documentRef.path, error.message); return error.failedAttempts < 5; });

async function copyDocument(snapshot) {
  counts.documents++;
  if (writer) writer.set(to.doc(snapshot.ref.path), snapshot.data());
  // Nested subcollections (for example conversations/{id}/messages).
  for (const child of await snapshot.ref.listCollections()) await copyCollection(child);
}
async function copyCollection(collection) {
  for (const snapshot of (await collection.get()).docs) await copyDocument(snapshot);
}

async function copyFiles(uid) {
  if (toEmulator) return;
  const [files] = await getStorage(source).bucket().getFiles({ prefix: `users/${uid}/brandAssets/` });
  for (const file of files) {
    counts.files++;
    if (!dryRun) await file.copy(getStorage(target).bucket().file(file.name));
  }
}

async function copyUser(snapshot) {
  const uid = snapshot.id;
  const draft = await from.doc(`users/${uid}/brandEngine/draft`).get();
  if (!draft.exists && snapshot.data()?.isBrandEngineProvisioned !== true) return;
  counts.users++;
  counts.documents++;
  if (writer) writer.set(to.doc(`users/${uid}`), snapshot.data());
  for (const name of USER_COLLECTIONS) await copyCollection(from.collection(`users/${uid}/${name}`));
  await copyFiles(uid);
  if (counts.users % 25 === 0) console.log(`… ${counts.users} users, ${counts.documents} documents`);
}

for (const name of GLOBAL_COLLECTIONS) await copyCollection(from.collection(name));
for (const path of GLOBAL_DOCS) { const snapshot = await from.doc(path).get(); if (snapshot.exists) await copyDocument(snapshot); }
if (!globalsOnly) {
  if (onlyUid) { const snapshot = await from.doc(`users/${onlyUid}`).get(); if (snapshot.exists) await copyUser(snapshot); }
  else for (const snapshot of (await from.collection('users').get()).docs) await copyUser(snapshot);
}
await writer?.close();
console.log(`${dryRun ? 'Dry run (nothing written)' : 'Done'}: ${counts.users} users, ${counts.documents} documents, ${counts.files} files.`);
