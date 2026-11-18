import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { COVER_HTML, PHOTOS } from '../functions/seed-data/legacy-template-designs.mjs';
import { buildTemplateDesigns } from '../functions/seed-data/build-template-designs.mjs';
import { translateTemplateCopy } from '../functions/template-arabic.js';
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

const NEW_TEMPLATE_IDS = [
  'upklick-funnel-business-development',
  'upklick-funnel-software-platform',
  'upklick-funnel-project-management-ai',
  'upklick-funnel-b2b-saas',
  'upklick-funnel-medical-solution',
  'upklick-funnel-product-development',
  'upklick-funnel-coaching-collective',
];

const HERO_PHOTO_MAP = {
  'upklick-funnel-business-development': PHOTOS.bizDevOffice,
  'upklick-funnel-software-platform': PHOTOS.softCoding,
  'upklick-funnel-project-management-ai': PHOTOS.saasSellHero,
  'upklick-funnel-b2b-saas': PHOTOS.audienceCreatorHero,
  'upklick-funnel-medical-solution': PHOTOS.medDoctorsLab,
  'upklick-funnel-product-development': PHOTOS.saasSellHero,
  'upklick-funnel-coaching-collective': PHOTOS.coachWomanBlazer,
};

async function getFirebaseAccessToken() {
  const cliRequire = createRequire(
    new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url)
  );
  const cliAuth = cliRequire('./lib/auth.js');
  const account = cliAuth.getProjectDefaultAccount(root) || cliAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error('No authenticated Firebase CLI account found.');
  }
  cliAuth.setRefreshToken(account.tokens.refresh_token);
  const res = await cliAuth.getAccessToken(
    account.tokens.refresh_token,
    account.tokens.scopes || [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/firebase',
    ]
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
      source: 'upklick-7-new-funnels-v1',
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
    throw new Error(
      `Firestore ${method} ${relPath} failed (${resp.status}): ${json.error?.message || JSON.stringify(json)}`
    );
  }
  return json;
}

function toFirestoreField(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number')
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
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

const accessToken = await getFirebaseAccessToken();
const databaseRoot = `projects/${projectId}/databases/(default)/documents`;

console.log('1/4 Rendering 7 new Funnel cover thumbnails & hero banners via Headless Edge...');
const browser = await chromium.launch({
  executablePath:
    process.env.FUNNEL_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});

const coverBuffers = new Map();
const heroBuffers = new Map();

try {
  const context = await browser.newContext({ viewport: { width: 960, height: 1240 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  for (const id of NEW_TEMPLATE_IDS) {
    const html = COVER_HTML[id];
    if (!html) throw new Error(`Missing COVER_HTML for ${id}`);
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
    const jpg = await page.screenshot({
      type: 'jpeg',
      quality: 90,
      clip: { x: 0, y: 0, width: 960, height: 1240 },
    });
    coverBuffers.set(id, jpg);
    fs.writeFileSync(path.join(publicThumbDir, `${id}.jpg`), jpg);
    fs.writeFileSync(path.join(seedThumbDir, `${id}.jpg`), jpg);
    console.log(`   ✓ Rendered cover: ${id}.jpg (${(jpg.length / 1024).toFixed(0)} KB)`);

    const heroPhoto = HERO_PHOTO_MAP[id];
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:1280px;height:720px;overflow:hidden;background:#0f172a"><img src="${heroPhoto}" style="width:100%;height:100%;object-fit:cover;display:block"/></body></html>`,
      { waitUntil: 'networkidle', timeout: 45000 }
    );
    const heroJpg = await page.screenshot({
      type: 'jpeg',
      quality: 88,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    heroBuffers.set(id, heroJpg);
    fs.writeFileSync(path.join(publicThumbDir, `${id}-hero.jpg`), heroJpg);
    fs.writeFileSync(path.join(seedThumbDir, `${id}-hero.jpg`), heroJpg);
    console.log(`   ✓ Rendered hero:  ${id}-hero.jpg (${(heroJpg.length / 1024).toFixed(0)} KB)`);
  }
} finally {
  await browser.close();
}

console.log('2/4 Uploading 7 new Funnel covers & heroes to Firebase Storage...');
const storageUrls = new Map();
const heroStorageUrls = new Map();

const existingCatalog = await firestoreRequest(accessToken, 'GET', '/templateCatalog?pageSize=1000');
for (const doc of existingCatalog?.documents || []) {
  const id = doc.name.split('/').pop();
  const existingThumb = doc.fields?.thumbnail?.stringValue;
  const existingHero = doc.fields?.pageTemplate?.mapValue?.fields?.image?.stringValue;
  if (existingThumb && existingThumb.startsWith('https://')) storageUrls.set(id, existingThumb);
  if (existingHero && existingHero.startsWith('https://')) heroStorageUrls.set(id, existingHero);
}

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

console.log('3/4 Building & validating canonical seed manifests (preserving existing Storage URLs)...');
const allSeedRecords = buildSystemTemplateSeed();
const { validateSystemTemplate } = loadTemplateSource('src/pages/system-template-validation.ts');
const arabicMeta = JSON.parse(
  fs.readFileSync(path.join(root, 'functions/seed-data/template-metadata-ar.json'), 'utf8')
);
const arabicCopy = JSON.parse(
  fs.readFileSync(path.join(root, 'functions/seed-data/template-content-ar.json'), 'utf8')
);

for (const rec of allSeedRecords) {
  const coverUrl = storageUrls.get(rec.id);
  const heroUrl = heroStorageUrls.get(rec.id) || coverUrl;
  if (coverUrl) {
    rec.thumbnail = coverUrl;
    if (rec.pageTemplate) {
      rec.pageTemplate.thumbnail = coverUrl;
      if (heroUrl) rec.pageTemplate.image = heroUrl;
    }
  }
  if (heroUrl && rec.builderDocument?.pages?.length) {
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

fs.writeFileSync(
  path.join(root, 'functions/seed-data/system-templates.json'),
  JSON.stringify(allSeedRecords, null, 2) + '\n'
);
const { MASTER_TEMPLATES } = loadTemplateSource('src/pages/system-template-data.ts');
const enrichedMasters = MASTER_TEMPLATES.map(m =>
  storageUrls.has(m.id) ? { ...m, thumbnail: storageUrls.get(m.id) } : m
);
fs.writeFileSync(
  path.join(root, 'functions/seed-data/template-catalog.json'),
  JSON.stringify(enrichedMasters, null, 2) + '\n'
);

console.log('4/4 Non-destructively upserting 7 new Professional Funnel Templates into Firestore templateCatalog...');
for (const id of NEW_TEMPLATE_IDS) {
  const template = allSeedRecords.find(r => r.id === id);
  if (!template) throw new Error(`Missing record ${id}`);
  const translation = arabicMeta[id];
  const dictionary = arabicCopy[id];
  const content = template.content_en || template.content;
  const document = template.builderDocument || template.pageTemplate?.builderDocument;
  const tagsAr = dictionary ? (template.tags || []).map(tag => dictionary[tag] || tag) : [];
  const localizedFields = {
    title_en: template.title_en || template.name,
    description_en: template.description_en || template.description,
    title_ar: translation.title_ar,
    description_ar: translation.description_ar,
    category_en: 'Funnels',
    category_ar: 'مسارات التحويل',
    tags_en: template.tags || [],
    tags_ar: tagsAr,
    ...(dictionary && content
      ? {
          content_en: content,
          content_ar: {
            ...translateTemplateCopy(content, dictionary),
            settings: { ...content.settings, language: 'ar' },
          },
        }
      : {}),
    ...(dictionary && document?.pages?.length
      ? { builder_document_ar: translateTemplateCopy(document, dictionary) }
      : {}),
  };

  const encoded = encodeFirestoreValue({
    ...template,
    ...localizedFields,
    ...buildTemplateDesigns(template.id),
    source: 'official',
    active: true,
    status: 'Published',
    schemaVersion: 2,
    updated: new Date().toISOString(),
    updatedBy: 'super-admin-7-funnels-v1',
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
  console.log(`   ✓ Upserted Firestore templateCatalog/${template.id} ("${template.name}")`);
}

const finalCatalog = await firestoreRequest(accessToken, 'GET', '/templateCatalog?pageSize=1000');
const activeFunnels = (finalCatalog?.documents || [])
  .filter(
    doc =>
      doc.fields?.category?.stringValue === 'Funnels' &&
      doc.fields?.active?.booleanValue !== false &&
      doc.fields?.status?.stringValue === 'Published'
  )
  .map(doc => ({
    id: doc.name.split('/').pop(),
    name: doc.fields?.name?.stringValue,
    title_ar: doc.fields?.title_ar?.stringValue,
    industry: doc.fields?.industry?.stringValue,
    popularity: doc.fields?.popularity?.integerValue,
  }));

console.log('\n=== LIVE FIRESTORE PROVISIONING SUMMARY ===');
console.log(
  JSON.stringify(
    {
      projectId,
      storageBucket: bucketName,
      templateCatalogTotal: finalCatalog?.documents?.length || 0,
      publishedFunnelTemplatesCount: activeFunnels.length,
      publishedFunnelTemplates: activeFunnels,
    },
    null,
    2
  )
);
