import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

// Run only in a trusted server environment with Application Default Credentials.
// Existing passwords are preserved. Never ship master-account passwords to the browser.
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
initializeApp({ credential: applicationDefault(), projectId: env.VITE_FIREBASE_PROJECT_ID });
const auth = getAuth(), db = getFirestore();
for (const [email, role, name] of [['super@gmail.com', 'SUPER_ADMIN', 'Super Admin'], ['admin@gmail.com', 'ADMIN', 'Admin']]) {
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; user = await auth.createUser({ email, password: '12345678', displayName: name }); }
  const profile = (await db.doc(`users/${user.uid}`).get()).data();
  const tenantId = profile?.tenantId || `workspace-${user.uid}`;
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role, tenantId });
  const batch = db.batch();
  batch.set(db.doc(`users/${user.uid}`), { id: user.uid, email, name, role, tenantId, status: user.disabled ? 'Deactivated' : 'Active' }, { merge: true });
  batch.set(db.doc(`tenants/${tenantId}`), { id: tenantId, name: `${name} workspace`, ownerId: user.uid }, { merge: true });
  batch.set(db.doc(`tenants/${tenantId}/members/${user.uid}`), { name, email, role: 'Owner', active: !user.disabled, permissions: ['*'] }, { merge: true });
  await batch.commit();
  console.log(`Verified ${role} account and workspace.`);
}
const catalog = JSON.parse(readFileSync(new URL('./seed-data/template-catalog.json', import.meta.url), 'utf8'));
for (const template of catalog) {
  const ref = db.doc(`templateCatalog/${template.id}`);
  if (!(await ref.get()).exists) await ref.create(template);
}
console.log(`Verified ${catalog.length} catalog template records; existing customizations preserved.`);
