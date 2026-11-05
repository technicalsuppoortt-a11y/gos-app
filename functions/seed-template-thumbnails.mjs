import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

// One-time seeding of professional gallery images for funnel, website and form templates.
// Starter covers are bundled with the script; admins replace them later from the template editor.
// Run in a trusted environment with Application Default Credentials (e.g. Google Cloud Shell, or after
// `gcloud auth application-default login`):
//   npm run seed:thumbnails            -> fills templates that have no image yet
//   npm run seed:thumbnails -- --force -> replaces existing images too
// Admins can change any image later from the template editor -> Template image.

// Starter images ship next to this script in ./images (one designed cover per template, plus a fallback
// per category for templates created later). No outside download is needed.
// (In the project they live in functions/seed-data/template-thumbnails.)
const folders = [new URL('./images/', import.meta.url), new URL('./seed-data/template-thumbnails/', import.meta.url)];
const imageFor = (id, category) => {
  for (const folder of folders) for (const name of [id, `fallback-${category}`]) {
    try { return readFileSync(new URL(`${encodeURIComponent(name)}.jpg`, folder)); } catch { /* Try the next one. */ }
  }
  return null;
};

// Inside the project the Firebase settings come from .env.local; elsewhere (e.g. Cloud Shell)
// they fall back to FIREBASE_PROJECT_ID / FIREBASE_STORAGE_BUCKET or the gos-app defaults.
let envFile = '';
try { envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch { /* Not inside the project. */ }
const env = Object.fromEntries(envFile.split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
const projectId = process.env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || 'gos-app-3c7fb';
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
initializeApp({ credential: applicationDefault(), projectId, storageBucket: bucketName });
const db = getFirestore(), bucket = getStorage().bucket();
const force = process.argv.includes('--force');

console.log(`Template image seed v6 (bundled images) · project ${projectId} · bucket ${bucketName}`);
const snapshot = await db.collection('templateCatalog').get();
let seeded = 0, skipped = 0;
for (const doc of snapshot.docs) {
  const category = doc.get('category');
  if (!['Funnels', 'Websites', 'Forms', 'Landing Pages'].includes(category)) continue;
  if (doc.get('thumbnail') && !force) { skipped++; continue; }
  const image = imageFor(doc.id, category);
  if (!image) { console.warn(`No starter image for "${doc.get('name')}" (${doc.id}).`); continue; }
  try {
    const token = randomUUID(), path = `templateThumbnails/${doc.id}/starter-cover.jpg`;
    await bucket.file(path).save(image, { contentType: 'image/jpeg', metadata: { cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token, source: 'gos starter cover' } } });
    const thumbnail = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    // Also use it as the page builder's featured image, like an admin upload does.
    const update = { thumbnail };
    const builder = doc.get('builderDocument');
    if (Array.isArray(builder?.pages) && builder.pages.length) update.builderDocument = { ...builder, pages: builder.pages.map((page, index) => index === 0 || page?.featuredImage ? { ...page, featuredImage: thumbnail } : page) };
    if (doc.get('pageTemplate')) update['pageTemplate.image'] = thumbnail;
    await doc.ref.update(update);
    seeded++;
    console.log(`✓ ${category} · ${doc.get('name')}`);
  } catch (error) { console.error(`✗ ${doc.get('name')} (${doc.id}): ${error.message}${error.input ? ` [input: ${error.input}]` : ''}\n   at ${String(error.stack || '').split('\n').slice(1, 3).map(line => line.trim()).join(' | ')}`); }
}
console.log(`Done. ${seeded} template images uploaded, ${skipped} kept (already had an image${force ? '' : '; use --force to replace'}).`);
