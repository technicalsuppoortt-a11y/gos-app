import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { encodeFirestoreValue } from '../functions/firestore-codec.js';
import { translateTemplateCopy } from '../functions/template-arabic.js';
import { buildTemplateDesigns } from '../functions/seed-data/build-template-designs.mjs';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(fs.readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8'));
const projectId = config.projects.default;
const publicProject = JSON.parse(fs.readFileSync(new URL('../src/backend/gos-public-config.json', import.meta.url), 'utf8')).projectId;
if (projectId !== publicProject) throw new Error('Firebase CLI and application projects differ. Resolve configuration before migrating.');
const records = JSON.parse(fs.readFileSync(new URL('../functions/seed-data/system-templates.json', import.meta.url), 'utf8'));
const arabic = JSON.parse(fs.readFileSync(new URL('../functions/seed-data/template-metadata-ar.json', import.meta.url), 'utf8'));
const arabicCopy = JSON.parse(fs.readFileSync(new URL('../functions/seed-data/template-content-ar.json', import.meta.url), 'utf8'));
const translationsOnly = process.argv.includes('--translations-only');
const designsOnly = process.argv.includes('--designs-only');
const targets = designsOnly ? records.filter(template => arabicCopy[template.id]) : records;
if (!records.length || new Set(records.map(t => t.id)).size !== records.length) throw new Error('Invalid migration manifest.');
if (!process.argv.includes('--apply')) {
  for (const template of targets) buildTemplateDesigns(template.id);
  console.log(JSON.stringify({ projectId, collection: 'templateCatalog', records: targets.length, localizedDesigns: Object.keys(arabicCopy).length, mode: 'dry-run', behavior: designsOnly ? 'Add missing English and Arabic designs to existing built-in page templates.' : translationsOnly ? 'Backfill missing bilingual fields and Arabic layouts on existing built-in templates.' : 'Create missing records and backfill built-in translations. Existing edits, inactive states and migration tombstones are preserved.' }, null, 2));
  process.exit(0);
}
let getAccessToken;
if (process.env.FIRESTORE_EMULATOR_HOST) getAccessToken = async () => 'owner';
else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  getAccessToken = () => auth.getAccessToken();
}
else {
  const cliRequire = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url));
  const cliAuth = cliRequire('./lib/auth.js');
  const account = cliAuth.getProjectDefaultAccount(root) || cliAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('No Firebase CLI account is available. Sign in with Firebase CLI or supply Application Default Credentials.');
  cliAuth.setRefreshToken(account.tokens.refresh_token);
  getAccessToken = async () => account.tokens.access_token && account.tokens.expires_at > Date.now() + 60000 ? account.tokens.access_token : (await cliAuth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes || ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'])).access_token;
}
const origin = process.env.FIRESTORE_EMULATOR_HOST ? `http://${process.env.FIRESTORE_EMULATOR_HOST}` : 'https://firestore.googleapis.com';
const database = `projects/${projectId}/databases/(default)`, documents = `${database}/documents`;
async function request(method, path, body) {
  const response = await fetch(`${origin}/v1/${path}`, { method, headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
  const result = await response.json();
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${result.error?.message || 'Request failed'}`);
  return result;
}
function field(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(field) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, field(item)])) } };
}
function create(path, value) {
  return { update: { name: `${documents}/${path}`, fields: field(value).mapValue.fields }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] };
}
// Read Firestore REST fields without decoding the nested-array tags used by builder documents.
function fromField(value) {
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, fromField(item)]));
  if (value.arrayValue) return (value.arrayValue.values || []).map(fromField);
  if ('integerValue' in value) return Number(value.integerValue);
  return Object.values(value)[0];
}

function localizedFields(template, translation, dictionary) {
  const content = template.content_en || template.content;
  const document = template.builderDocument || template.pageTemplate?.builderDocument;
  return {
    title_en: template.title_en || template.name,
    description_en: template.description_en || template.description,
    title_ar: translation.title_ar,
    description_ar: translation.description_ar,
    ...(dictionary && content ? { content_en: content, content_ar: { ...translateTemplateCopy(content, dictionary), settings: { ...content.settings, language: 'ar' } } } : {}),
    ...(dictionary && document?.pages?.length ? { builder_document_ar: translateTemplateCopy(document, dictionary) } : {}),
  };
}
let created = 0, preserved = 0, translated = 0;
try {
  for (const template of targets) {
    const reference = `templateCatalog/${template.id}`, marker = `systemTemplateMigrations/${template.id}`;
    const designs = buildTemplateDesigns(template.id);
    if (designsOnly) {
      const existing = await request('GET', `${documents}/${reference}`);
      if (!existing) throw new Error(`Missing template ${template.id}`);
      const missing = Object.fromEntries(Object.entries(designs).filter(([key]) => !existing.fields[key]?.mapValue));
      if (!Object.keys(missing).length) { preserved++; continue; }
      await request('POST', `${documents}:commit`, { writes: [{
        update: { name: existing.name, fields: field(missing).mapValue.fields },
        updateMask: { fieldPaths: Object.keys(missing) },
        currentDocument: { updateTime: existing.updateTime },
      }] });
      translated++;
      continue;
    }
    const [existing, migrated] = await Promise.all([request('GET', `${documents}/${reference}`), request('GET', `${documents}/${marker}`)]);
    const translation = arabic[template.id];
    const dictionary = arabicCopy[template.id];
    const metadata = translation ? localizedFields(template, translation, dictionary) : {};
    if (existing && translation && (existing.fields.title_en?.stringValue || existing.fields.name?.stringValue) === translation.name) {
      const saved = Object.fromEntries(Object.entries(existing.fields).map(([key, value]) => [key, fromField(value)]));
      const localized = localizedFields(saved, translation, dictionary);
      const missing = Object.fromEntries(Object.entries(localized).filter(([key, value]) => {
        const current = saved[key];
        return value !== undefined && (typeof value === 'string' ? !current?.trim() : !current);
      }));
      if (saved.content_ar && localized.content_ar) {
        const { headline, steps } = saved.content_ar;
        if (!headline?.trim() || !steps?.length) {
          missing.content_ar = {
            ...localized.content_ar, ...saved.content_ar,
            headline: headline?.trim() ? headline : localized.content_ar.headline,
            steps: steps?.length ? steps : localized.content_ar.steps,
          };
        }
      }
      if (saved.builder_document_ar && !saved.builder_document_ar.pages?.length && localized.builder_document_ar) missing.builder_document_ar = localized.builder_document_ar;
      if (Object.keys(missing).length) {
        if ('description_en' in missing) missing.description_en = existing.fields.description?.stringValue || template.description;
        if ((existing.fields.description_en?.stringValue || existing.fields.description?.stringValue) !== template.description) delete missing.description_ar;
        if (Object.keys(missing).length) {
          await request('POST', `${documents}:commit`, { writes: [{
            update: { name: existing.name, fields: field(missing).mapValue.fields },
            updateMask: { fieldPaths: Object.keys(missing) },
            currentDocument: { updateTime: existing.updateTime },
          }] });
          translated++;
        }
      }
    }
    if (translationsOnly) continue;
    if (existing || migrated) {
      if (existing && !migrated) await request('POST', `${documents}:commit`, { writes: [create(marker, { templateId: template.id, version: 2 })] });
      preserved++; continue;
    }
    await request('POST', `${documents}:commit`, { writes: [create(reference, { ...encodeFirestoreValue({ ...template, ...metadata, ...designs }), source: 'official', schemaVersion: 2, updatedBy: 'system-template-migration-v2', migratedFrom: 'frontend-defaults-v2' }), create(marker, { templateId: template.id, version: 2 })] });
    created++;
  }
  const catalog = await request('GET', `${documents}/templateCatalog?pageSize=1000`);
  const confirmedDesigns = (catalog.documents || []).filter(item => item.fields.design_en?.mapValue?.fields?.html?.stringValue && item.fields.design_ar?.mapValue?.fields?.html?.stringValue).length;
  console.log(JSON.stringify({ projectId, collection: 'templateCatalog', created, preserved, translated, confirmedDesigns, total: catalog.documents?.length || 0, categories: (catalog.documents || []).reduce((counts, doc) => { const category = doc.fields.category?.stringValue || 'Unknown'; counts[category] = (counts[category] || 0) + 1; return counts; }, {}) }, null, 2));
} catch (error) {
  console.error(`Template migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
}
