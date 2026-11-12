import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { COVER_HTML, PHOTOS } from '../functions/seed-data/legacy-template-designs.mjs';
import { buildTemplateDesigns } from '../functions/seed-data/build-template-designs.mjs';
import { encodeFirestoreValue } from '../functions/firestore-codec.js';
import { buildSystemTemplateSeed, loadTemplateSource } from './build-system-template-seed.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core'
);
const root = fileURLToPath(new URL('../', import.meta.url));

const firebaseRc = JSON.parse(fs.readFileSync(path.join(root, '.firebaserc'), 'utf8'));
const publicConfig = JSON.parse(fs.readFileSync(path.join(root, 'src/backend/gos-public-config.json'), 'utf8'));
const projectId = firebaseRc.projects.default;
if (projectId !== publicConfig.projectId) {
  throw new Error(`Project mismatch: ${projectId} vs ${publicConfig.projectId}`);
}
const bucketName = publicConfig.storageBucket || `${projectId}.firebasestorage.app`;

const publicThumbDir = path.join(root, 'public/template-thumbnails');
const seedThumbDir = path.join(root, 'functions/seed-data/template-thumbnails');
fs.mkdirSync(publicThumbDir, { recursive: true });
fs.mkdirSync(seedThumbDir, { recursive: true });

const HERO_SOURCE_MAP = {
  'ghl-website-framing-construction': PHOTOS.framingHero,
  'ghl-website-life-insurance': PHOTOS.insuranceHero,
  'ghl-website-pharmacy': PHOTOS.pharmacyHero,
  'ghl-funnel-mortgage-company': PHOTOS.mortgageHome,
  'ghl-funnel-brake-muffler': PHOTOS.brakeMechanic,
  'ghl-funnel-locksmith': PHOTOS.locksmithKeys,
};

async function getFirebaseAccessToken() {
  const cliRequire = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url));
  const cliAuth = cliRequire('./lib/auth.js');
  const account = cliAuth.getProjectDefaultAccount(root) || cliAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error('No authenticated Firebase CLI account found.');
  }
  cliAuth.setRefreshToken(account.tokens.refresh_token);
  const res = await cliAuth.getAccessToken(
    account.tokens.refresh_token,
    account.tokens.scopes || ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
  );
  return res.access_token;
}

async function uploadToFirebaseStorage(accessToken, storagePath, buffer, contentType = 'image/jpeg') {
  const downloadToken = randomUUID();
  const boundary = 'gos_boundary_' + randomUUID().replace(/-/g, '');
  const metadata = JSON.stringify({
    name: storagePath,
    contentType,
    cacheControl: 'public, max-age=31536000',
    metadata: {
      firebaseStorageDownloadTokens: downloadToken,
      source: 'ghl-super-admin-templates-v1',
    },
  });
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    'utf8'
  );
  const ending = Buffer.from(`\r\n--${boundary}--`, 'utf8');
  const body = Buffer.concat([preamble, buffer, ending]);

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=multipart`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Storage upload failed (${resp.status}) for ${storagePath}: ${errText}`);
  }
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
}

async function firestoreRequest(accessToken, method, relPath, body) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const resp = await fetch(`${base}${relPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000),
  });
  if (resp.status === 404) return null;
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(`Firestore ${method} ${relPath} failed (${resp.status}): ${json.error?.message || JSON.stringify(json)}`);
  }
  return json;
}

function toFirestoreField(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreField) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, toFirestoreField(v)])
      ),
    },
  };
}

console.log('1/5 Rendering 9 GoHighLevel full-page cover thumbnails & 6 hero banners via Headless Edge...');
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});

const coverBuffers = new Map();
const heroBuffers = new Map();

try {
  const context = await browser.newContext({ viewport: { width: 960, height: 1240 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  for (const [id, html] of Object.entries(COVER_HTML)) {
    await page.setViewportSize({ width: 960, height: 1240 });
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 45000 });
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(res => {
                img.onload = res;
                img.onerror = res;
              })
        )
      );
    });
    const jpg = await page.screenshot({ type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: 960, height: 1240 } });
    coverBuffers.set(id, jpg);
    fs.writeFileSync(path.join(publicThumbDir, `${id}.jpg`), jpg);
    fs.writeFileSync(path.join(seedThumbDir, `${id}.jpg`), jpg);
    console.log(`   ✓ Rendered cover: ${id}.jpg (${(jpg.length / 1024).toFixed(0)} KB)`);
  }

  for (const [id, photoUrl] of Object.entries(HERO_SOURCE_MAP)) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:1280px;height:720px;overflow:hidden;background:#0f172a"><img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block"/></body></html>`,
      { waitUntil: 'networkidle', timeout: 45000 }
    );
    const heroJpg = await page.screenshot({ type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    heroBuffers.set(id, heroJpg);
    fs.writeFileSync(path.join(publicThumbDir, `${id}-hero.jpg`), heroJpg);
    fs.writeFileSync(path.join(seedThumbDir, `${id}-hero.jpg`), heroJpg);
    console.log(`   ✓ Rendered hero:  ${id}-hero.jpg (${(heroJpg.length / 1024).toFixed(0)} KB)`);
  }
} finally {
  await browser.close();
}

console.log('2/5 Uploading covers & hero banners to Firebase Storage...');
const accessToken = await getFirebaseAccessToken();
const storageUrls = new Map();
const heroStorageUrls = new Map();

for (const [id, buffer] of coverBuffers.entries()) {
  const url = await uploadToFirebaseStorage(accessToken, `templateThumbnails/${id}/cover.jpg`, buffer);
  storageUrls.set(id, url);
  console.log(`   ✓ Uploaded Storage cover: ${id}`);
}
for (const [id, buffer] of heroBuffers.entries()) {
  const url = await uploadToFirebaseStorage(accessToken, `templateThumbnails/${id}/hero.jpg`, buffer);
  heroStorageUrls.set(id, url);
  console.log(`   ✓ Uploaded Storage hero:  ${id}`);
}

console.log('3/5 Building & enriching canonical 9 templates with Firebase Storage URLs...');
const allSeedRecords = buildSystemTemplateSeed();
const { validateSystemTemplate } = loadTemplateSource('src/pages/system-template-validation.ts');
const targetCategories = new Set(['Websites', 'Funnels', 'Forms']);

for (const rec of allSeedRecords) {
  if (!targetCategories.has(rec.category)) continue;
  const coverUrl = storageUrls.get(rec.id);
  const heroUrl = heroStorageUrls.get(rec.id) || coverUrl;
  rec.thumbnail = coverUrl;
  if (rec.pageTemplate) {
    rec.pageTemplate.thumbnail = coverUrl;
    rec.pageTemplate.image = heroUrl;
  }
  if (rec.builderDocument?.pages?.length) {
    rec.builderDocument.pages = rec.builderDocument.pages.map(pg => ({
      ...pg,
      featuredImage: pg.featuredImage ? heroUrl : '',
      sections: pg.sections.map(s =>
        s.content?.image && s.content.image.includes('/template-thumbnails/')
          ? { ...s, content: { ...s.content, image: heroUrl } }
          : s
      ),
    }));
    if (rec.pageTemplate) rec.pageTemplate.builderDocument = rec.builderDocument;
  }
  const validationErrors = validateSystemTemplate(rec);
  if (validationErrors.length) {
    throw new Error(`Validation failed for ${rec.id}: ${validationErrors.join(' ')}`);
  }
}

console.log('4/5 Cleaning up legacy Websites, Funnels & Forms in live Firestore (preserving all other categories)...');
const existingCatalog = await firestoreRequest(accessToken, 'GET', '/templateCatalog?pageSize=1000');
const existingDocs = existingCatalog?.documents || [];
const docsToPurge = existingDocs.filter(doc => targetCategories.has(doc.fields?.category?.stringValue || ''));
const preservedDocs = existingDocs.filter(doc => !targetCategories.has(doc.fields?.category?.stringValue || ''));

console.log(`   Found ${existingDocs.length} total docs in templateCatalog: purging ${docsToPurge.length} targeted legacy docs, preserving ${preservedDocs.length} non-targeted docs.`);

const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
if (docsToPurge.length > 0) {
  const deleteWrites = [];
  for (const doc of docsToPurge) {
    const id = doc.name.split('/').pop();
    deleteWrites.push({ delete: `${databaseRoot}/templateCatalog/${id}` });
    deleteWrites.push({ delete: `${databaseRoot}/systemTemplateMigrations/${id}` });
  }
  await firestoreRequest(accessToken, 'POST', ':commit', { writes: deleteWrites });
  console.log(`   ✓ Purged ${docsToPurge.length} legacy Websites/Funnels/Forms templates from Firestore.`);
}

console.log('5/5 Seeding 9 GoHighLevel templates (3 Websites, 3 Funnels, 3 Forms) to live Firestore...');
const newNineRecords = allSeedRecords.filter(r => targetCategories.has(r.category));
if (newNineRecords.length !== 9) {
  throw new Error(`Expected exactly 9 targeted templates, got ${newNineRecords.length}`);
}

for (const template of newNineRecords) {
  const encoded = encodeFirestoreValue({
    ...template,
    ...buildTemplateDesigns(template.id),
    source: 'official',
    active: true,
    status: 'Published',
    schemaVersion: 2,
    updated: new Date().toISOString(),
    updatedBy: 'super-admin-ghl-seed-v1',
  });
  await firestoreRequest(accessToken, 'POST', ':commit', {
    writes: [
      {
        update: {
          name: `${databaseRoot}/templateCatalog/${template.id}`,
          fields: toFirestoreField(encoded).mapValue.fields,
        },
        updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      },
      {
        update: {
          name: `${databaseRoot}/systemTemplateMigrations/${template.id}`,
          fields: toFirestoreField({ templateId: template.id, version: 2 }).mapValue.fields,
        },
        updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
      },
    ],
  });
  console.log(`   ✓ Seeded Firestore templateCatalog/${template.id} (${template.category} · "${template.name}" · downloads: ${template.popularity})`);
}

// Persist updated seed JSON manifests with live Storage URLs
fs.writeFileSync(path.join(root, 'functions/seed-data/system-templates.json'), JSON.stringify(allSeedRecords, null, 2) + '\n');
const { MASTER_TEMPLATES } = loadTemplateSource('src/pages/system-template-data.ts');
const enrichedMasters = MASTER_TEMPLATES.map(m => (storageUrls.has(m.id) ? { ...m, thumbnail: storageUrls.get(m.id) } : m));
fs.writeFileSync(path.join(root, 'functions/seed-data/template-catalog.json'), JSON.stringify(enrichedMasters, null, 2) + '\n');

// Verify live Firestore post-seed counts
const finalCatalog = await firestoreRequest(accessToken, 'GET', '/templateCatalog?pageSize=1000');
const finalCounts = (finalCatalog?.documents || []).reduce((acc, doc) => {
  const cat = doc.fields?.category?.stringValue || 'Unknown';
  acc[cat] = (acc[cat] || 0) + 1;
  return acc;
}, {});
const adminCustom = await firestoreRequest(accessToken, 'GET', '/adminTemplates?pageSize=100');

console.log('\n=== LIVE FIRESTORE VERIFICATION ===');
console.log(
  JSON.stringify(
    {
      projectId,
      storageBucket: bucketName,
      templateCatalogTotal: finalCatalog?.documents?.length || 0,
      categories: finalCounts,
      preservedAdminTemplatesCount: adminCustom?.documents?.length || 0,
    },
    null,
    2
  )
);
