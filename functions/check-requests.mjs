import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(line => /^[A-Z_]+=/.test(line))
    .map(line => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
    })
);

try {
  initializeApp({ credential: applicationDefault(), projectId: env.VITE_FIREBASE_PROJECT_ID });
  const db = getFirestore();

  const snap = await db.collection('billingRequests').orderBy('createdAt', 'desc').limit(5).get();
  console.log('Total recent requests:', snap.size);
  snap.forEach(doc => {
    console.log('--- Request ID:', doc.id, '---');
    console.log(JSON.stringify(doc.data(), null, 2));
  });
} catch (err) {
  console.error('Error fetching billingRequests:', err);
}
