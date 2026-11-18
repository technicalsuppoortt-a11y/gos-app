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
    const resolved = id.startsWith('@/modules/brand-engine/')
      ? path.join(root, id.slice('@/modules/brand-engine/'.length))
      : path.resolve(path.dirname(file), id);
    return load(resolved, overrides);
  };
  new Function('require', 'module', 'exports', source)(require, mod, mod.exports);
  return mod.exports;
}
const contracts = load(path.join(root, 'data/ai/brandStudioCore.js'));
const provider = load(path.join(root, 'services/directProvider.js'));

function harness(payload) {
  const documents = new Map([
    ['users/test-user', { role: 'user' }],
    ['users/test-user/pages/business_discovery', { parameters: {}, revision: 'discovery-1' }],
    ['users/test-user/pages/branding', { parameters: {}, revision: 'brand-1' }],
  ]);
  const snapshot = ref => ({ data: () => documents.get(ref), exists: () => documents.has(ref) });
  const firestore = {
    doc: (_db, ...parts) => parts.join('/'),
    getDoc: async ref => snapshot(ref),
    runTransaction: async (_db, operation) => operation({
      get: async ref => snapshot(ref), set: (ref, value) => documents.set(ref, value),
    }),
  };
  let providerCalls = 0;
  const overrides = {
    'firebase/firestore': firestore,
    '@/modules/brand-engine/firebase': { auth: { currentUser: { uid: 'test-user' } }, db: {} },
    './browserAIConnections.js': {
      browserConnectionActions: [],
      loadBrowserConnection: async () => ({ provider: 'openai', model: 'gpt-4o-mini', revision: 'connection-1' }),
    },
    './browserUsage.js': { recordBrowserOperation: async () => {} },
    '../configuration/catalog': {},
    '../data/platformAccess': { isActivePlatformMember: () => true },
    './directProvider.js': { ...provider, generateProviderText: async () => {
      providerCalls++;
      return { text: JSON.stringify(payload) };
    } },
    '@/modules/brand-engine/data/ai/brandStudioCore.js': {
      ...contracts,
      brandBrief: () => ({ language: 'Arabic' }),
      brandGenerationFingerprint: () => 'base',
    },
    './directDiscovery.js': { discoveryActions: [] },
  };
  for (const id of ['./brandLogo.ts', './logoQualityReview.js', './logoAttempts.js', './logoHistory.js',
    './logoImageWorkflow.js', './logoImageProvider.js', './logoReferenceBoard.ts', '../data/ai/logoDesignReferences.js',
    '@/modules/brand-engine/data/ai/discoveryCore.js', '@/modules/brand-engine/data/ai/copilotCore.js']) overrides[id] = {};
  const { invokeDirectAI } = load(path.join(root, 'services/directAI.js'), overrides);
  return {
    documents,
    providerCalls: () => providerCalls,
    generate: (element, answers = {}) => invokeDirectAI('generateBrandElement', {
      element, answers, language: 'ar', requestId: 'generation-1',
      inputFingerprint: contracts.brandElementFingerprint('base', element, answers),
    }),
  };
}

const rationale = 'Matches the business brief.';
const cases = [
  ['Arabic names', 'name', { preference: 'Arabic', nameLength: 'one' }, ['مدار', 'رونق', 'أثر'].map(name => ({ name, rationale }))],
  ['English names', 'name', { preference: 'English', nameLength: 'one' }, ['Orbit', 'Bloom', 'Spark'].map(name => ({ name, rationale }))],
  ['taglines', 'tagline', {}, ['Built for you', 'Grow your way', 'Make it happen'].map(tagline => ({ tagline, rationale }))],
  ['colors', 'colors', {}, ['#123456', '#654321', '#345678'].map(primary => ({ coreColors: { primary, secondary: '#334455', buttonBackground: '#FFFFFF' }, rationale }))],
  ['typography', 'typography', {}, ['Cairo', 'Tajawal', 'Almarai'].map(arabic => ({ typography: { heading: arabic, body: arabic, arabic }, rationale }))],
];
for (const [label, element, answers, suggestions] of cases) {
  test(`valid ${label} complete without requiring a full brand identity`, async () => {
    const app = harness({ suggestions });
    const result = await app.generate(element, answers);
    assert.equal(result.element, element);
    assert.equal(result.suggestions.length, 3);
    assert.equal(result.candidates, undefined);
    assert.equal(app.providerCalls(), 1);
    assert.equal(app.documents.get('users/test-user/aiJobs/generation-1').status, 'complete');
  });
}
test('invalid name suggestions still fail validation and are not saved as a result', async () => {
  const app = harness({ suggestions: [{ name: 'مدار', rationale }] });
  await assert.rejects(app.generate('name', { nameLength: 'one' }), { diagnostic: 'brand-invalid-count' });
  const job = app.documents.get('users/test-user/aiJobs/generation-1');
  assert.equal(job.status, 'failed');
  assert.equal(job.result, undefined);
});
