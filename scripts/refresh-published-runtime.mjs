// Refresh one site's runtime from dist while retaining its deployed content.
// Dry run by default; --apply releases it. Requires an authenticated Firebase CLI.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { buildPublicationFiles, createHostingClient, hostingSiteId, normalizePagePath, publicationResourcePaths } from '../functions/hosting-client.js';
import { captureForms } from '../functions/lead-capture.js';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const projectId = option('--project', 'gos-app-3c7fb'), siteId = option('--site');
if (!/^[a-z0-9-]+$/.test(projectId) || !/^gos-[a-f0-9]{24}$/.test(siteId ?? '')) throw new Error('Supply a valid --project and --site.');
const cli = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/package.json', import.meta.url));
const cliAuth = cli('firebase-tools/lib/auth.js');
const account = cliAuth.getGlobalDefaultAccount();
if (!account) throw new Error('Sign in with the Firebase CLI before refreshing a site.');
let credentials;
async function token() {
  if (!credentials || credentials.expiresAt < Date.now() + 60000) {
    const result = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
    credentials = { accessToken: result.access_token, expiresAt: Date.now() + (result.expires_in || 3600) * 1000 };
  }
  return credentials.accessToken;
}
const admin = createRequire(new URL('../functions/package.json', import.meta.url));
const { Firestore } = admin('@google-cloud/firestore'), { OAuth2Client } = admin('google-auth-library');
const authClient = new OAuth2Client();
authClient.setCredentials({ access_token: await token(), expiry_date: Date.now() + 3000000 });
const db = new Firestore({ projectId, authClient }), origin = `https://${siteId}.web.app`;
async function pageData(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000), headers: { 'Cache-Control': 'no-cache' } });
  if (!response.ok) throw new Error(`Published page is unavailable (${response.status}).`);
  const match = (await response.text()).match(/<script id="gos-publication-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('The site does not contain a supported publication snapshot.');
  return JSON.parse(match[1]);
}
const published = await pageData('/'), asset = published.asset;
if (!asset?.id || !asset.document?.pages?.length || asset.document.pages.length > 100) throw new Error('Invalid published asset.');
let states;
try { states = (await db.collectionGroup('hosting').where('siteId', '==', siteId).get()).docs; }
catch (error) {
  if (error.code !== 9) throw error;
  const tenants = await db.collection('tenants').listDocuments();
  if (!tenants.length || tenants.length > 500) throw new Error('A site lookup index is required for this project.');
  states = (await db.getAll(...tenants.map(tenant => tenant.collection('hosting').doc(asset.id)))).filter(state => state.data()?.siteId === siteId);
}
if (states.length !== 1) throw new Error('Could not uniquely locate this site in the workspace.');
const stateRef = states[0].ref, root = stateRef.parent.parent;
if (hostingSiteId(root.id, asset.id) !== siteId || stateRef.id !== asset.id) throw new Error('The publication does not match its workspace binding.');
const assetRef = root.collection('assets').doc(asset.id), record = await assetRef.get();
if (!record.exists || record.data().archived) throw new Error('The workspace asset is unavailable.');
const pages = [];
for (const metadata of asset.document.pages) {
  const data = metadata.id === published.pageId ? published : await pageData(normalizePagePath(metadata.path));
  const page = data.asset?.document?.pages?.find(item => item.id === metadata.id);
  if (data.asset?.id !== asset.id || !Array.isArray(page?.sections)) throw new Error('The deployed pages do not share one valid asset snapshot.');
  pages.push(page);
}
asset.document.pages = pages;
const template = await readFile(new URL('../dist/published.html', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../dist/hosting-manifest.json', import.meta.url), 'utf8'));
const captureToken = randomBytes(32).toString('base64url');
const capture = { tenantId: root.id, captureToken, endpoint: `https://us-central1-${projectId}.cloudfunctions.net/captureAssetLead` };
const files = buildPublicationFiles(asset, template, origin, true, capture);
let bytes = 0;
for (const path of publicationResourcePaths(asset, manifest, template)) {
  let content;
  try { content = await readFile(new URL('../dist' + path, import.meta.url)); }
  catch (error) {
    if (error.code !== 'ENOENT' || path.startsWith('/assets/')) throw error;
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
    if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('A required published media file is unavailable.');
    content = Buffer.from(await response.arrayBuffer());
  }
  bytes += content.length;
  if (content.length > 10 * 1024 * 1024 || bytes > 50 * 1024 * 1024) throw new Error('Runtime resource limit exceeded.');
  files[path] = content;
}
console.log(JSON.stringify({ siteId, assetName: asset.name, pages: pages.length, files: Object.keys(files).length, formBlocks: captureForms(asset.document).length, apply: args.includes('--apply') }));
if (args.includes('--apply')) {
  const lease = randomUUID();
  await db.runTransaction(async tx => {
    const [state, latest] = await Promise.all([tx.get(stateRef), tx.get(assetRef)]);
    if (!latest.exists || latest.data().archived) throw new Error('The asset is unavailable.');
    if (state.data()?.lease && Date.now() - state.data().startedAt < 300000) throw new Error('Wait for the current hosting operation to finish.');
    if (state.data()?.version !== states[0].data()?.version) throw new Error('The publication changed while preparing its refresh.');
    tx.set(stateRef, { lease, startedAt: Date.now() }, { merge: true });
  });
  try {
    const release = await createHostingClient({ token, projectId }).deploy(siteId, files);
    await db.runTransaction(async tx => {
      const state = await tx.get(stateRef);
      if (state.data()?.lease !== lease) throw new Error('The hosting operation changed.');
      const previous = states[0].data();
      tx.set(stateRef, { ...release, lease: null, captureTokenHash: createHash('sha256').update(captureToken).digest('hex'), captureForms: captureForms(asset.document), runtimeRefreshedAt: new Date().toISOString(), previousRuntimeRelease: { version: previous.version || '', release: previous.release || '', captureTokenHash: previous.captureTokenHash || '', captureForms: previous.captureForms || [] } }, { merge: true });
    });
    console.log(`Runtime refreshed: ${release.url}`);
  } catch (error) {
    await db.runTransaction(async tx => { const state = await tx.get(stateRef); if (state.data()?.lease === lease) tx.set(stateRef, { lease: null }, { merge: true }); });
    throw error;
  }
}
await db.terminate();
