import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
function load(path, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => { if (id in mocks) return mocks[id]; throw Error(id); }, crypto: webcrypto, URL, setTimeout }); return exports;
}
const model = load('../src/pages/commerce/model.ts');
const presets = load('../src/pages/commerce/productPresets.ts', { './model': model });
function filesHarness({ uploadError, metadataError, afterUpload } = {}) {
  const operations = [], messages = [];
  const state = { auth: { tenant: { id: 'tenant-a' }, user: { id: 'uid-a' } } };
  const auth = { currentUser: { uid: 'uid-a', getIdToken: async () => { operations.push('token'); } }, authStateReady: async () => { operations.push('ready'); } };
  const files = load('../src/backend/files.ts', {
    './firebase': { auth, firebaseApp: {}, db: {}, backendError: error => error.message }, '../store': { store: { getState: () => state } },
    '../utils/toast': { showToast: Object.fromEntries(['success', 'error', 'info'].map(kind => [kind, message => messages.push({ kind, message })])) },
    'firebase/storage': { getStorage: () => ({}), ref: (_, path) => ({ fullPath: path }), uploadBytes: async (ref, file) => { operations.push({ upload: ref.fullPath }); if (uploadError) throw uploadError; afterUpload?.(state, auth); }, deleteObject: async ref => { operations.push({ deleted: ref.fullPath }); }, getBlob: async ref => { operations.push({ read: ref.fullPath }); return new Blob(['remote']); } },
    'firebase/firestore': { doc: (_, ...parts) => parts.join('/'), setDoc: async (path, data) => { operations.push({ metadata: path, data }); if (metadataError) throw metadataError; } },
  });
  return { files, state, auth, operations, messages };
}
test('uploads await Firebase auth and use the captured tenant path and authenticated UID', async () => {
  const h = filesHarness(); const id = await h.files.storeFile(new File(['pdf'], 'guide.pdf', { type: 'application/pdf' }));
  assert.deepEqual(h.operations.slice(0, 2), ['ready', 'token']);
  assert.equal(h.operations[2].upload, `tenants/tenant-a/commerce/${id}`);
  assert.equal(h.operations[3].metadata, `tenants/tenant-a/files/${id}`); assert.equal(h.operations[3].data.uploadedBy, 'uid-a');
});
test('storage authorization rejection produces a readable local attachment without an error toast or cloud metadata', async () => {
  const h = filesHarness({ uploadError: { code: 'storage/unauthorized' } }); const file = new File(['original bytes'], 'video.mp4');
  const id = await h.files.storeFile(file); assert.match(id, /^local-/);
  assert.equal(await (await h.files.readStoredFile(id)).text(), 'original bytes');
  assert.equal(h.operations.some(row => row.metadata), false); assert.equal(h.messages.some(row => row.kind === 'error'), false);
  assert.match(h.messages[0].message, /locally for this session/);
  h.state.auth.tenant.id = 'tenant-b'; await assert.rejects(h.files.readStoredFile(id), /expired/);
  h.state.auth.tenant.id = 'tenant-a'; h.state.auth.user.id = 'uid-b'; h.auth.currentUser.uid = 'uid-b'; await assert.rejects(h.files.readStoredFile(id), /expired/);
});
test('missing authentication and oversized files cannot become local uploads', async () => {
  const h = filesHarness(); h.auth.currentUser = null;
  await assert.rejects(h.files.storeFile(new File(['x'], 'x.pdf')), /Sign in/);
  await assert.rejects(h.files.storeFile({ size: 101 * 1024 * 1024 }), /100 MB/);
  assert.equal(h.operations.some(row => row.upload), false);
});
test('metadata rejection or a workspace switch cleans up the original cloud object', async () => {
  for (const options of [{ metadataError: Error('permission-denied') }, { afterUpload: state => { state.auth.tenant.id = 'tenant-b'; } }]) {
    const h = filesHarness(options); await assert.rejects(h.files.storeFile(new File(['pdf'], 'a.pdf')));
    assert.ok(h.operations.find(row => row.deleted)?.deleted.startsWith('tenants/tenant-a/commerce/'));
    assert.equal(h.operations.some(row => row.metadata?.includes('tenant-b')), false);
  }
});
test('unrelated upload errors remain actionable failures', async () => {
  const h = filesHarness({ uploadError: Object.assign(Error('Upload failed'), { code: 'storage/retry-limit-exceeded' }) });
  await assert.rejects(h.files.storeFile(new File(['pdf'], 'a.pdf')), /Upload failed/);
  assert.equal(h.messages.at(-1).kind, 'error');
});
test('all six requested templates initialize coherent drafts without fabricating uploaded media', () => {
  for (const id of ['ebook', 'asset-pack', 'coaching', 'consultation', 'masterclass', 'video-course']) {
    const preset = presets.productPresets.find(row => row.id === id); assert.ok(preset);
    const blank = model.newProduct(); blank.config.currency = 'USD'; blank.config.experience.paymentMethods = ['PayPal'];
    const product = presets.applyProductPreset(blank, preset);
    assert.equal(product.status, 'Draft'); assert.equal(product.config.currency, 'USD');
    assert.equal(product.config.amount, preset.amount); assert.equal(product.config.experience.oneTimeAmount, preset.amount);
    assert.equal(product.config.experience.paymentMethods.join(), 'PayPal'); assert.equal(model.validateProduct(product).length, 0);
    assert.equal(product.config.assets.length, 0);
    if (preset.kind === 'course') { assert.ok(product.config.modules.length >= 3); assert.ok(product.config.modules.every(module => module.lessons.every(lesson => !lesson.storageId && !lesson.url))); }
    if (preset.kind === 'service') { assert.equal(product.config.duration, preset.duration); assert.ok(product.config.fulfillment); }
    assert.equal(blank.name, ''); assert.equal(blank.config.modules.length, 0);
  }
});
test('switching template kinds discards incompatible files and curriculum', () => {
  const course = presets.applyProductPreset(model.newProduct(), presets.productPresets.find(row => row.id === 'masterclass'));
  course.config.assets = [{ name: 'old', url: 'https://example.com/old' }];
  const service = presets.applyProductPreset(course, presets.productPresets.find(row => row.id === 'coaching'));
  assert.equal(service.config.modules.length, 0); assert.equal(service.config.assets.length, 0);
});
test('local attachments can be kept in drafts but cannot be published as delivered cloud files', () => {
  const product = presets.applyProductPreset(model.newProduct(), presets.productPresets.find(row => row.id === 'ebook'));
  product.config.assets = [{ name: 'ebook.pdf', url: '', storageId: 'local-test' }];
  assert.equal(model.validateProduct(product).length, 0);
  assert.ok(model.validateProduct(product, true).some(error => error.includes('local attachments')));
});
