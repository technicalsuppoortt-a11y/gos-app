import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const projectId = JSON.parse(fs.readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects.default;
const require = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url));
const cliAuth = require('./lib/auth.js');
const account = cliAuth.getProjectDefaultAccount(root) || cliAuth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required.');
cliAuth.setRefreshToken(account.tokens.refresh_token);
const token = account.tokens.access_token && account.tokens.expires_at > Date.now() + 60000 ? account.tokens.access_token : (await cliAuth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes || ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'])).access_token;
async function read(path) {
  const response = await fetch(`https://firebaserules.googleapis.com/v1/${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
  const result = await response.json(); if (!response.ok) throw new Error(`Rules API ${response.status}: ${result.error?.message}`); return result;
}
function catalogBlock(source) {
  const match = /match\s+\/templateCatalog\/\{[^}]+\}\s*\{/.exec(source);
  if (!match) throw new Error('The catalog rules block was not found. No deployment configuration was generated.');
  let depth = 1, quote = '', escaped = false, end = match.index + match[0].length;
  for (; end < source.length && depth; end++) {
    const c = source[end];
    if (quote) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === quote) quote = ''; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '{') depth++; if (c === '}') depth--;
  }
  if (depth) throw new Error('Unbalanced catalog rules block.');
  return { start: match.index, end, text: source.slice(match.index, end) };
}
const release = await read(`projects/${projectId}/releases/cloud.firestore`);
const ruleset = await read(release.rulesetName);
const liveFile = ruleset.source.files.find(file => file.name.endsWith('.rules'));
if (!liveFile) throw new Error('Live Firestore source is unavailable.');
const before = liveFile.content, existing = catalogBlock(before);
if (process.argv.includes('--verify')) {
  const expected = JSON.parse(fs.readFileSync(new URL('../artifacts/system-template-migration/rules-review.json', import.meta.url), 'utf8'));
  const matchesPrepared = createHash('sha256').update(before).digest('hex') === expected.afterHash;
  console.log(JSON.stringify({ projectId, ruleset: release.rulesetName, matchesPrepared, tenantRulesPreserved: matchesPrepared }, null, 2));
  if (!matchesPrepared) process.exitCode = 1;
  process.exit(process.exitCode || 0);
}
const local = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const replacement = catalogBlock(local).text;
if (!before.includes('function featureAdmin(') || !before.includes('function signedIn(')) throw new Error('The production rule helpers differ. Review the isolated catalog block before deploying.');
const after = before.slice(0, existing.start) + replacement + before.slice(existing.end);
const directory = new URL('../artifacts/system-template-migration/', import.meta.url); fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(new URL('live-before.rules', directory), before);
fs.writeFileSync(new URL('firestore.rules', directory), after);
fs.writeFileSync(new URL('firebase.json', directory), JSON.stringify({ firestore: { rules: 'firestore.rules' } }, null, 2));
const result = { projectId, productionRuleset: release.rulesetName, changed: before !== after, scope: 'Only /templateCatalog/{templateId}; all other live rules preserved byte-for-byte.', beforeHash: createHash('sha256').update(before).digest('hex'), afterHash: createHash('sha256').update(after).digest('hex'), previousCatalogRules: existing.text, preparedCatalogRules: replacement };
fs.writeFileSync(new URL('rules-review.json', directory), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
