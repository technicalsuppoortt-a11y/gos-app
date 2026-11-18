import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../launch-brand/src/modules/brand-engine');
function load(file, overrides = {}) {
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  const require = id => {
    if (id in overrides) return overrides[id];
    if (!id.startsWith('.') && !id.startsWith('@/modules/brand-engine/')) throw new Error(`Unmocked dependency: ${id}`);
    const resolved = id.startsWith('@/modules/brand-engine/')
      ? path.join(root, id.slice('@/modules/brand-engine/'.length))
      : path.resolve(path.dirname(file), id);
    return load(resolved, overrides);
  };
  new Function('require', 'module', 'exports', source)(require, mod, mod.exports);
  return mod.exports;
}
const contracts = load(path.join(root, 'data/ai/brandStudioCore.js'));
const { readLogoHistory } = load(path.join(root, 'services/logoHistory.js'));
const { generateRasterLogo } = load(path.join(root, 'services/logoImageWorkflow.js'), {
  './logoImageProvider.js': {}, './logoQualityReview.js': {},
});
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

const artwork = 'data:image/png;base64,iVBORw0KGgo=';

function harness({ refine = false, provider = 'openai', reviewFailure } = {}) {
  const documents = new Map([
    ['users/test-user', { role: 'user' }],
    ['users/test-user/pages/business_discovery', { parameters: {}, revision: 'discovery-1' }],
    ['users/test-user/pages/branding', { parameters: {}, revision: 'brand-1' }],
  ]);
  const jobPath = 'users/test-user/aiJobs/logo-progress';
  const snapshot = ref => ({ data: () => documents.get(ref), exists: () => documents.has(ref) });
  const history = () => readLogoHistory([...documents.entries()].filter(([key]) => key.startsWith('users/test-user/aiJobs/')).map(([key, data]) => ({ id: key.split('/').at(-1), data })));
  const enteredReview = deferred();
  const reviewGate = deferred();
  const enteredRefinement = deferred();
  const refinementGate = deferred();
  const charges = [];
  let providerCalls = 0;
  let reviewCalls = 0;
  let validated = false;
  let saved = 0;
  const review = async () => {
    reviewCalls++;
    assert.equal(validated, true);
    assert.ok(saved > 0, 'The preview must be a persisted asset reference');
    enteredReview.resolve();
    if (refine && reviewCalls === 1) throw Object.assign(new Error('Refine the mark'), { diagnostic: 'brand-weak-logo' });
    if (reviewFailure) throw Object.assign(new Error('Review unavailable'), { diagnostic: reviewFailure });
    if (!refine) await reviewGate.promise;
  };
  const overrides = {
    'firebase/firestore': {
      doc: (_db, ...parts) => parts.join('/'),
      collection: (_db, ...parts) => parts.join('/'),
      query: (...parts) => parts, where: () => ({}), orderBy: () => ({}), limit: () => ({}),
      serverTimestamp: () => 1,
      getDoc: async ref => snapshot(ref),
      getDocs: async () => ({ docs: [] }),
      runTransaction: async (_db, operation) => operation({
        get: async ref => snapshot(ref), set: (ref, value) => documents.set(ref, structuredClone(value)),
      }),
    },
    '@/modules/brand-engine/firebase': { auth: { currentUser: { uid: 'test-user' } }, db: {} },
    './browserAIConnections.js': {
      browserConnectionActions: [],
      loadBrowserConnection: async () => ({ provider, model: 'mock-text-model', revision: 'connection-1' }),
    },
    './browserUsage.js': { recordBrowserOperation: async () => {}, trackedBrowserConnection: value => value },
    '../configuration/catalog': {},
    '../data/platformAccess': { isActivePlatformMember: () => true },
    './directProvider.js': {
      aiFailure: (code, message) => Object.assign(new Error(message), { code }),
      generateProviderText: async () => { throw new Error('Logos must use native image generation, not text/SVG generation'); },
    },
    '@/modules/brand-engine/data/ai/brandStudioCore.js': {
      ...contracts,
      brandBrief: () => ({ name: 'Juniper', language: 'English', tagline: '', theme: { paletteId: 'custom', light: { primary: '#007D70', secondary: '#005EBB', buttonBackground: '#FFFFFF' }, typography: { heading: 'Inter', arabic: 'IBM Plex Sans Arabic' } } }),
      brandGenerationFingerprint: () => 'base',
    },
    './brandLogo.ts': {},
    './logoQualityReview.js': {},
    './logoImageProvider.js': { logoImageModelFor: value => `mock-${value}-image` },
    './logoImageWorkflow.js': { generateRasterLogo: options => generateRasterLogo({
      ...options,
      generate: async connection => {
        assert.equal(connection.provider, provider);
        assert.equal(connection.model, `mock-${provider}-image`);
        providerCalls++;
        if (refine && providerCalls === 2) { enteredRefinement.resolve(); await refinementGate.promise; }
        return { dataUrl: artwork, contentType: 'image/png', model: connection.model };
      },
      prepareImage: async () => { validated = true; return { file: { type: 'image/png' }, width: 1536, height: 1024, dataUrl: artwork }; },
      persistImage: async (_file, identity) => {
        saved++;
        const { dataUrl, ...image } = identity.logo.image;
        assert.equal(dataUrl, artwork);
        return { ...image, assetId: `asset-${saved}` };
      },
      review, loadPreviousImage: async () => null,
    }) },
    './logoAttempts.js': { logoAttemptLimit: 3, reserveLogoAttempt: async () => 'mock-slot', finishLogoAttempt: async (_tx, _slot, _lease, charged) => charges.push(charged) },
    './logoHistory.js': { readLogoHistory },
    './logoReferenceBoard.ts': { createLogoReferenceParts: async () => [], logoReferenceIdentities: () => [] },
    '../data/ai/logoDesignReferences.js': { logoDesignReferences: () => [] },
    './directDiscovery.js': { discoveryActions: [] },
  };
  for (const id of ['@/modules/brand-engine/data/ai/discoveryCore.js', '@/modules/brand-engine/data/ai/copilotCore.js']) overrides[id] = {};
  const { invokeDirectAI } = load(path.join(root, 'services/directAI.js'), overrides);
  return {
    job: () => documents.get(jobPath), history, charges, enteredReview, reviewGate, enteredRefinement, refinementGate,
    providerCalls: () => providerCalls,
    generate: () => invokeDirectAI('generateBrandElement', {
      element: 'logo', answers: {}, language: 'en', requestId: 'logo-progress',
      inputFingerprint: contracts.brandElementFingerprint('base', 'logo', {}),
    }),
  };
}

test('validated artwork is previewable before review completes, without appearing in saved history or charging an attempt', { timeout: 15000 }, async () => {
  const app = harness();
  const generation = app.generate();
  await Promise.race([app.enteredReview.promise, generation]);
  assert.equal(app.job().status, 'running');
  assert.equal(app.job().stage, 'design-review');
  assert.equal(app.job().result.element, 'logo');
  assert.deepEqual(app.job().result.preview.logo.paths, []);
  assert.equal(app.job().result.preview.logo.image.assetId, 'asset-1');
  assert.equal(app.job().result.preview.logo.image.dataUrl, undefined);
  assert.equal(app.job().result.preview.qualityStatus, 'pending');
  assert.equal(app.job().result.suggestions, undefined);
  assert.deepEqual(app.history(), { requestIds: [], suggestions: [] });
  assert.deepEqual(app.charges, []);
  app.reviewGate.resolve();
  const result = await generation;
  assert.equal(result.suggestions.length, 1);
  assert.equal(app.job().status, 'complete');
  assert.equal(app.job().result.preview, undefined);
  assert.deepEqual(app.history().requestIds, ['logo-progress']);
  assert.equal(app.history().suggestions.length, 1);
  assert.deepEqual(app.charges, [true]);
});

test('Gemini logos use the native image route and retain the actual provider and model', async () => {
  const app = harness({ provider: 'gemini' });
  const generation = app.generate();
  await Promise.race([app.enteredReview.promise, generation]);
  app.reviewGate.resolve();
  const result = await generation;
  assert.equal(app.providerCalls(), 1);
  assert.equal(result.provider, 'gemini');
  assert.equal(result.model, 'mock-gemini-image');
  assert.equal(result.suggestions[0].logo.image.model, result.model);
});

test('an unavailable advisory review preserves the image without charging a successful attempt', async () => {
  const app = harness({ reviewFailure: 'provider-timeout' });
  const result = await app.generate();
  assert.equal(result.qualityStatus, 'pending');
  assert.equal(result.provider, 'openai');
  assert.equal(result.suggestions[0].logo.image.assetId, 'asset-1');
  assert.equal(app.providerCalls(), 1);
  assert.deepEqual(app.charges, [false]);
});

test('refinement clears the previous draft preview while the new model request is pending', { timeout: 15000 }, async () => {
  const app = harness({ refine: true });
  const generation = app.generate();
  await Promise.race([app.enteredRefinement.promise, generation]);
  assert.equal(app.providerCalls(), 2);
  assert.equal(app.job().status, 'running');
  assert.equal(app.job().stage, 'generating');
  assert.equal(app.job().result, null);
  assert.deepEqual(app.history(), { requestIds: [], suggestions: [] });
  assert.deepEqual(app.charges, []);
  app.refinementGate.resolve();
  await generation;
  assert.equal(app.job().status, 'complete');
  assert.equal(app.history().suggestions.length, 1);
  assert.deepEqual(app.charges, [true]);
});
