import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { themeColorValue } from '../src/branding/themeColors.ts';

test('Phoenix color roles replace brand accents and preserve status colors and images', () => {
  assert.match(themeColorValue('#7546f5', 'background'), /--gp-primary/);
  assert.match(themeColorValue('#ffffff', 'background'), /--gp-surface/);
  assert.equal(themeColorValue('#ef4444', 'color'), '#ef4444');
  assert.equal(themeColorValue('url(/photo.png)', 'background'), 'url(/photo.png)');
  const bound = themeColorValue('#7546f5', 'fill');
  assert.equal(themeColorValue(bound, 'fill'), bound, 'repeated observer callbacks must be idempotent');
});

async function brandHarness() {
  const source = fs.readFileSync(new URL('../src/backend/phoenixBrand.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText.replace(/export /g, '');
  const documents = new Map();
  const auth = { currentUser: { uid: 'gos-owner' } };
  const saved = [];
  const api = new Function('auth', 'db', 'doc', 'collection', 'getDoc', 'getDocs', 'saveSetup', 'useSyncExternalStore', `${code}; return {loadPhoenixBrand,getPhoenixBrand,clearPhoenixBrand};`)(
    auth, {}, (_, ...segments) => segments.join('/'), (root, name) => `${root}/${name}`,
    async ref => ({ data: () => documents.get(ref) }),
    async ref => ({ docs: (documents.get(ref) || []).map(([id, data]) => ({ id, data: () => data })) }),
    (...values) => saved.push(values), () => null,
  );
  const root = 'users/gos-owner/brandEngineSnapshots/revision';
  documents.set('users/gos-owner/brandEngine/current', { status: 'prepared', sourceUid: 'source-owner', tenantId: 'phoenix_source-owner', snapshotId: 'revision', sourceRevision: 'revision', pageIds: ['branding'], brand: { name: 'موطن', logoAssetId: 'logo', language: 'ar', theme: { light: { primary: '#A8553B' } } } });
  documents.set(`${root}/pages`, [['branding', { revision: 'revision', parameters: { tagline: 'Saved tagline' } }]]);
  documents.set(`${root}/assets`, [['logo', { dataUrl: 'data:image/png;base64,YQ==', width: 1200, height: 400, origin: 'generated_logo' }]]);
  return { api, auth, documents, root, saved };
}

test('manual password session restores name, theme, full logo and text from the server', async () => {
  const { api, saved } = await brandHarness();
  const load = () => api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', 'owner@example.com');
  const first = await load();
  assert.equal(first.brand.theme.light.primary, '#A8553B');
  assert.equal(first.brand.tagline, 'Saved tagline');
  assert.equal(first.logo, 'data:image/png;base64,YQ==');
  assert.equal(first.logoHasWordmark, true);
  api.clearPhoenixBrand();
  assert.equal(api.getPhoenixBrand(), null);
  assert.deepEqual(await load(), first, 'a fresh session must restore the same branding without local browser cache');
  assert.equal(saved.at(-1)[1].onboarding_completed, true);
});

test('chunked logos are assembled and incomplete or foreign snapshots are rejected', async () => {
  const { api, documents, root } = await brandHarness();
  documents.set(`${root}/assets`, [
    ['logo', { encoding: 'chunked-data-url-v1', chunkCount: 2, width: 100, height: 100 }],
    ['logo-part-0', { dataUrl: 'data:image/png;base64,' }], ['logo-part-1', { dataUrl: 'YQ==' }],
  ]);
  assert.equal((await api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', '')).logo, 'data:image/png;base64,YQ==');
  await assert.rejects(api.loadPhoenixBrand('gos-owner', 'foreign-owner', 'phoenix_source-owner', ''));
  documents.set(`${root}/pages`, []);
  await assert.rejects(api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', ''));
});

test('switching users during a brand read cannot publish another account identity', async () => {
  const { api, auth } = await brandHarness();
  auth.currentUser = { uid: 'another-user' };
  await assert.rejects(api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', ''));
  assert.equal(api.getPhoenixBrand(), null);
});

test('generated logos reuse the saved vector and keep full wordmark dimensions', async () => {
  const { api, documents, root } = await brandHarness();
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><text>موطن</text></svg>';
  documents.set(`${root}/assets`, [['logo', { origin: 'generated_logo', width: 1200, height: 400, svg }]]);
  const result = await api.loadPhoenixBrand('gos-owner', 'source-owner', 'phoenix_source-owner', '');
  assert.equal(result.logo, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  assert.equal(result.logoHasWordmark, true);
});
