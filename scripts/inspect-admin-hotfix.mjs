import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const cli = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url));
const { getGlobalDefaultAccount, getAccessToken } = cli('./lib/auth.js');
const account = getGlobalDefaultAccount();
if (!account) throw new Error('Firebase CLI sign-in is required.');
const access = account.tokens.access_token && account.tokens.expires_at > Date.now() + 60000 ? account.tokens : await getAccessToken(account.tokens.refresh_token, account.tokens.scopes ?? ['https://www.googleapis.com/auth/cloud-platform']);
const project = 'gos-app-3c7fb';
async function read(url) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${access.access_token}` }, signal: AbortSignal.timeout(30000) });
  const data = await r.json();
  if (!r.ok && r.status !== 404) throw new Error(`Inspection HTTP ${r.status}: ${data.error?.message}`);
  return { status: r.status, data };
}
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
for (const name of ['supportChat', 'configurePaymentMethods', 'publishAsset']) {
  const preflight = await fetch(`https://us-central1-${project}.cloudfunctions.net/${name}`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' }, signal: AbortSignal.timeout(30000) });
  const fn = await read(`https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/us-central1/functions/${name}`);
  console.log(JSON.stringify({ endpoint: name, optionsStatus: preflight.status, allowOrigin: preflight.headers.get('access-control-allow-origin'), allowMethods: preflight.headers.get('access-control-allow-methods'), deployedStatus: fn.status, state: fn.data.state }));
}
const release = await read(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
if (release.status === 200) {
  const rules = await read(`https://firebaserules.googleapis.com/v1/${release.data.rulesetName}`);
  const source = rules.data.source?.files?.map(f => f.content).join('\n') ?? '';
  console.log(JSON.stringify({ firestoreReleaseUpdated: release.data.updateTime, hasPlatformToolsRules: source.includes('/settings/platformTools'), hasSupportRules: source.includes('/supportRooms/'), hasToolWriteGuard: source.includes('toolWriteAllowed') }));
}
const profiles = await read(`${base}/users?pageSize=100&mask.fieldPaths=role&mask.fieldPaths=status&mask.fieldPaths=tenantId`);
const shapes = {};
for (const d of profiles.data.documents ?? []) {
  const f = d.fields ?? {};
  const key = JSON.stringify({ role: f.role?.stringValue ?? '(missing)', status: f.status?.stringValue ?? '(missing)', hasTenant: !!f.tenantId?.stringValue });
  shapes[key] = (shapes[key] ?? 0) + 1;
}
console.log(JSON.stringify({ profileShapes: shapes, moreProfiles: !!profiles.data.nextPageToken }));
const localHtml = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const deployed = await fetch(`https://${project}.web.app/`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
const deployedHtml = await deployed.text();
const scripts = [...localHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
const hostingMatchesBuild = scripts.length > 0 && scripts.every(src => deployedHtml.includes(src));
console.log(JSON.stringify({ hostingStatus: deployed.status, hostingMatchesBuild }));
if (!hostingMatchesBuild) throw new Error('Hosting is not serving the verified frontend build.');
