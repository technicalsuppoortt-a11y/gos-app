import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
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

const NEW_FLAGSHIP_IDS = ['upklick-funnel-flagship-sell', 'upklick-funnel-flagship-audience'];
const FLAGSHIP_HERO_PHOTOS = {
  'upklick-funnel-flagship-sell': PHOTOS.saasSellHero,
  'upklick-funnel-flagship-audience': PHOTOS.audienceCreatorHero,
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
      source: 'upklick-flagship-funnels-v2',
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

const stepsOnly = process.argv.includes('--steps-only');
const accessToken = await getFirebaseAccessToken();
const databaseRoot = `projects/${projectId}/databases/(default)/documents`;

if (!stepsOnly) {
console.log('1/5 Rendering 2 Flagship Funnel cover thumbnails & hero banners via Headless Edge...');
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

  for (const id of NEW_FLAGSHIP_IDS) {
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

    const heroPhoto = FLAGSHIP_HERO_PHOTOS[id];
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

console.log('2/5 Uploading new Flagship Funnel covers & heroes to Firebase Storage...');
const storageUrls = new Map();
const heroStorageUrls = new Map();

// Read existing templateCatalog docs first so we preserve existing Firebase Storage URLs on existing templates!
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

console.log('3/5 Building & validating canonical seed manifests (preserving existing Storage URLs)...');
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

console.log('4/5 Non-destructively upserting 2 Flagship Full Funnel Templates into Firestore templateCatalog...');
for (const id of NEW_FLAGSHIP_IDS) {
  const template = allSeedRecords.find(r => r.id === id);
  if (!template) throw new Error(`Missing record ${id}`);
  const translation = arabicMeta[id];
  const dictionary = arabicCopy[id];
  const content = template.content_en || template.content;
  const document = template.builderDocument || template.pageTemplate?.builderDocument;
  const localizedFields = {
    title_en: template.title_en || template.name,
    description_en: template.description_en || template.description,
    title_ar: translation.title_ar,
    description_ar: translation.description_ar,
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
    updatedBy: 'super-admin-flagship-funnels-v2',
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
}

console.log('5/5 Non-destructively seeding 10 upgraded Step Templates into Firestore global_funnel_templates...');
const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

let stepTemplatesSeeded = 0;
try {
  const gftModule = await vite.ssrLoadModule('/src/backend/globalFunnelTemplates.ts');
  const builtins = gftModule.BUILTIN_GLOBAL_FUNNEL_TEMPLATES;
  if (!Array.isArray(builtins) || builtins.length < 10) {
    throw new Error(`Expected >= 10 BUILTIN_GLOBAL_FUNNEL_TEMPLATES, got ${builtins?.length}`);
  }

  const existingStepDocs = await firestoreRequest(
    accessToken,
    'GET',
    '/global_funnel_templates?pageSize=200'
  );
  const existingMap = new Map();
  for (const doc of existingStepDocs?.documents || []) {
    const id = doc.name.split('/').pop();
    existingMap.set(id, doc);
  }

  for (const tpl of builtins) {
    const prev = existingMap.get(tpl.id);
    // Preserve custom status/deleted state if Super Admin manually toggled it earlier
    const prevDeleted = prev?.fields?.deleted?.booleanValue === true;
    const prevStatus = prev?.fields?.status?.stringValue;
    const prevActive = prev?.fields?.active?.booleanValue;

    const payload = encodeFirestoreValue({
      ...tpl,
      schemaVersion: 3,
      deleted: prevDeleted ? true : false,
      status: prevStatus === 'Draft' ? 'Draft' : 'Published',
      active: typeof prevActive === 'boolean' ? prevActive : true,
      updated: new Date().toISOString(),
      updatedBy: 'super-admin-step-templates-v3',
    });

    await firestoreRequest(accessToken, 'POST', ':commit', {
      writes: [
        {
          update: {
            name: `${databaseRoot}/global_funnel_templates/${tpl.id}`,
            fields: toFirestoreField(payload).mapValue.fields,
          },
          updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
        },
      ],
    });
    stepTemplatesSeeded++;
    console.log(`   ✓ Upserted global_funnel_templates/${tpl.id} (${tpl.category} · "${tpl.title_en}")`);
  }
} finally {
  await vite.close();
}

const finalCatalog = await firestoreRequest(accessToken, 'GET', '/templateCatalog?pageSize=1000');
const finalCounts = (finalCatalog?.documents || []).reduce((acc, doc) => {
  const cat = doc.fields?.category?.stringValue || 'Unknown';
  acc[cat] = (acc[cat] || 0) + 1;
  return acc;
}, {});
const finalStepDocs = await firestoreRequest(
  accessToken,
  'GET',
  '/global_funnel_templates?pageSize=200'
);

console.log('\n=== LIVE FIRESTORE PROVISIONING SUMMARY ===');
console.log(
  JSON.stringify(
    {
      projectId,
      storageBucket: bucketName,
      templateCatalogTotal: finalCatalog?.documents?.length || 0,
      templateCatalogCategories: finalCounts,
      globalFunnelStepTemplatesTotal: finalStepDocs?.documents?.length || 0,
      stepTemplatesUpserted: stepTemplatesSeeded,
    },
    null,
    2
  )
);
