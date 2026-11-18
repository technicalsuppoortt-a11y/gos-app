import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../launch-brand/src/modules/brand-engine');
function loader(overrides, navigator, window) {
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.env', '({ DEV: false })');
    const code = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const require = id => {
      if (id in overrides) return overrides[id];
      if (!id.startsWith('.') && !id.startsWith('@/modules/brand-engine/')) throw Error(`Unmocked dependency: ${id}`);
      let resolved = id.startsWith('@/modules/brand-engine/')
        ? path.join(root, id.slice('@/modules/brand-engine/'.length))
        : path.resolve(path.dirname(file), id);
      if (!path.extname(resolved)) resolved += '.ts';
      return load(resolved);
    };
    new Function('require', 'module', 'exports', 'navigator', 'window', code)(require, module, module.exports, navigator, window);
    return module.exports;
  }
  return load;
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function harness({ legacy = false } = {}) {
  const uid = 'test-user';
  const auth = { currentUser: { uid } };
  const navigator = { onLine: true };
  const documents = new Map();
  const commits = [], notifications = [], plans = [], reads = [], listeners = [];
  let attempts = 0;
  const activity = { owner: uid };
  let brand = {
    userProfile: { uid }, brandName: 'Original', business: 'consulting', subNiche: '',
    businessDescription: '', language: 'en', theme: 'light', activeStep: 3, completedSteps: [],
    deployed: false, brandPalette: 'evergreen', builderBrandLinked: true, messages: [],
    pageParameters: { branding: { elementSources: { name: 'manual' } } },
  };
  const store = {
    getState: () => ({ brand, activity }),
    dispatch(action) {
      if (action.type === 'syncError') activity.syncErrorCode = action.payload;
      else if (action.type === 'saveFailed') activity.saveErrorCode = action.payload;
      else if (action.type === 'preparation') brand = { ...brand, phoenixPreparation: action.payload };
      else if (action.type === 'completeStep') brand = { ...brand, completedSteps: [...new Set([...brand.completedSteps, action.payload])] };
      else brand = { ...brand, ...action.payload };
    },
  };
  const snapshot = ref => ({ data: () => structuredClone(documents.get(ref)) });
  const firestore = {
    doc: (_db, ...parts) => parts.join('/'),
    collection: (_db, ...parts) => parts.join('/'),
    documentId: () => '__id__', where: (_field, _operator, ids) => ids,
    query: (collection, ids) => ({ collection, ids }),
    onSnapshot(target, next) { const entry = { target, next }; listeners.push(entry); return () => listeners.splice(listeners.indexOf(entry), 1); },
    getDoc: async ref => snapshot(ref), getDocFromServer: async ref => snapshot(ref),
    getDocsFromServer: async target => {
      const collection = typeof target === 'string' ? target : target.collection;
      return { docs: [...documents.entries()]
        .filter(([ref]) => ref.startsWith(collection + '/') && (typeof target === 'string' || target.ids.includes(ref.split('/').at(-1))))
        .map(([ref]) => snapshot(ref)) };
    },
    serverTimestamp: () => 'server-time',
    runTransaction: async (_db, operation) => {
      attempts++;
      const plan = plans.shift();
      const writes = [];
      const result = await operation({
        get: async ref => { reads.push(ref); return snapshot(ref); },
        set: (ref, value, options) => writes.push({ ref, value: structuredClone(value), merge: options?.merge }),
        update: (ref, value) => writes.push({ ref, value: structuredClone(value), merge: true }),
      });
      if (plan) {
        plan.entered.resolve();
        await plan.release.promise;
        if (plan.error) throw plan.error;
      }
      for (const { ref, value, merge } of writes) {
        documents.set(ref, merge ? { ...documents.get(ref), ...value } : value);
      }
      commits.push(writes);
      return result;
    },
  };
  const load = loader({
    'firebase/firestore': firestore,
    '@/modules/brand-engine/firebase': { auth, db: {} },
    '@/modules/brand-engine/store': { store },
    '@/modules/brand-engine/store/brandSlice': { actions: {
      hydrateUserDraft: payload => ({ type: 'hydrate', payload }),
      setPhoenixPreparation: payload => ({ type: 'preparation', payload }),
      completeStep: payload => ({ type: 'completeStep', payload }),
    } },
    '@/modules/brand-engine/store/activitySlice': { activityActions: {
      syncError: payload => ({ type: 'syncError', payload }),
      saveFailed: payload => ({ type: 'saveFailed', payload }),
    } },
    '@/modules/brand-engine/data/dashboardWorkspace': { hasWorkspaceBookingConflict: () => false },
    './brandTheme.ts': { resolveBrandTheme: () => ({ light: { primary: '#00C19A' } }) },
    './brandLogoPersistence': { ensureBrandLogoSaved: async () => {} },
    './saveNotifications': { persistSaveNotification: async (...args) => { notifications.push(args); } },
  }, navigator, { location: { origin: 'http://localhost' } });
  const pages = load(path.join(root, 'data/brandPages.ts'));
  function seed(owner = uid) {
    const savedPages = legacy ? pages.serializeBrandPages(brand) : pages.serializeWorkspacePages(brand);
    for (const page of savedPages) {
      documents.set(`users/${owner}/pages/${page.pageId}`, JSON.parse(JSON.stringify({ ...page, revision: 'baseline' })));
    }
    documents.set(`users/${owner}/brandEngine/draft`, {
      schemaVersion: 1, revision: 'baseline', pageIds: savedPages.map(page => page.pageId),
    });
    documents.set(`users/${owner}`, { displayName: 'Existing profile' });
  }
  seed();
  const draft = load(path.join(root, 'services/brandDraft.ts'));
  return {
    uid, auth, navigator, documents, commits, notifications, draft, reads, activity,
    workspacePageIds: pages.workspacePageIds,
    state: () => brand,
    subscribe: () => load(path.join(root, 'services/brandDraftRealtime.ts')).subscribeBrandDraft(uid),
    emitSnapshot() {
      for (const { target, next } of [...listeners]) next({
        metadata: { hasPendingWrites: false, fromCache: false },
        docs: target.ids.map(id => snapshot(`${target.collection}/${id}`)),
      });
    },
    attempts: () => attempts,
    edit(key, value) { brand = { ...brand, [key]: value }; },
    async open(options) {
      brand = { ...brand, ...await draft.loadBrandDraft(auth.currentUser.uid, options) };
    },
    async switchAccount(owner) {
      auth.currentUser = { uid: owner };
      brand = { ...brand, userProfile: { uid: owner } };
      seed(owner);
      brand = { ...brand, ...await draft.loadBrandDraft(owner) };
    },
    holdNext(error) {
      const plan = { entered: deferred(), release: deferred(), error };
      plans.push(plan);
      return plan;
    },
  };
}

test('opening an unchanged saved workspace does not commit another revision', async () => {
  const h = harness();
  await h.open();
  assert.equal(await h.draft.saveBrandDraft(), 'baseline');
  assert.equal(h.attempts(), 0);
});

test('save triggers in the same turn share one commit containing the latest edits', async () => {
  const h = harness();
  await h.open();
  h.edit('brandName', 'First edit');
  const first = h.draft.saveBrandDraft();
  h.edit('brandName', 'Latest edit');
  const latest = h.draft.saveBrandDraft();
  assert.equal(first, latest);
  const revision = await latest;
  assert.equal(h.attempts(), 1);
  assert.equal(h.documents.get(`users/${h.uid}/pages/branding`).parameters.brandName, 'Latest edit');
  const pages = [...h.documents.entries()].filter(([ref]) => ref.startsWith(`users/${h.uid}/pages/`));
  assert.equal(pages.length, 5);
  assert.ok(pages.every(([, page]) => page.revision === revision));
  assert.equal(h.documents.get(`users/${h.uid}/brandEngine/draft`).revision, revision);
  assert.equal(h.documents.get(`users/${h.uid}`).displayName, 'Existing profile');
  assert.equal(h.draft.hasUnsavedBrandDraft(h.uid), false);
});

test('slow saves share identical work and coalesce all waiting edits into one snapshot', async () => {
  const h = harness();
  await h.open();
  const gate = h.holdNext();
  h.edit('brandName', 'In flight');
  const first = h.draft.saveBrandDraft();
  await gate.entered.promise;
  assert.equal(h.draft.saveBrandDraft(), first);
  h.edit('brandName', 'Intermediate');
  const queued = h.draft.saveBrandDraft();
  h.edit('brandName', 'Final');
  assert.equal(h.draft.saveBrandDraft(), queued);
  gate.release.resolve();
  await Promise.all([first, queued]);
  assert.equal(h.attempts(), 2);
  assert.deepEqual(h.commits.map(writes => writes.find(write => write.ref.endsWith('/pages/branding')).value.parameters.brandName), ['In flight', 'Final']);
  assert.equal(h.draft.hasUnsavedBrandDraft(h.uid), false);
});

test('quota failure stops queued and subsequent writes until an explicit retry saves the latest edits', async () => {
  const h = harness();
  await h.open();
  const quotaError = Object.assign(new Error('Quota exceeded'), { code: 'firestore/resource-exhausted' });
  const gate = h.holdNext(quotaError);
  h.edit('brandName', 'In flight');
  const first = h.draft.saveBrandDraft();
  await gate.entered.promise;
  h.edit('brandName', 'Queued');
  const queued = h.draft.saveBrandDraft();
  const results = Promise.allSettled([first, queued]);
  gate.release.resolve();
  assert.ok((await results).every(result => result.status === 'rejected' && result.reason === quotaError));
  assert.equal(h.attempts(), 1);
  assert.equal(h.draft.isBrandDraftSavePaused(h.uid), true);
  assert.equal(h.draft.hasUnsavedBrandDraft(h.uid), true);
  assert.equal(h.documents.get(`users/${h.uid}/pages/branding`).parameters.brandName, 'Original');
  h.edit('brandName', 'Latest unsaved edit');
  await assert.rejects(h.draft.saveBrandDraft(), error => error === quotaError);
  h.draft.retryBrandDraftSave('another-user');
  assert.equal(h.draft.isBrandDraftSavePaused(h.uid), true);
  assert.equal(h.attempts(), 1);
  h.draft.retryBrandDraftSave(h.uid);
  await h.draft.saveBrandDraft();
  assert.equal(h.attempts(), 2);
  assert.equal(h.documents.get(`users/${h.uid}/pages/branding`).parameters.brandName, 'Latest unsaved edit');
  assert.equal(h.draft.hasUnsavedBrandDraft(h.uid), false);
});

test('offline saves fail without network requests and recover without losing edits', async () => {
  const h = harness();
  await h.open();
  h.navigator.onLine = false;
  h.edit('brandName', 'Offline edit');
  await assert.rejects(h.draft.saveBrandDraft(), { code: 'unavailable' });
  assert.equal(h.attempts(), 0);
  assert.equal(h.draft.isBrandDraftSavePaused(h.uid), false);
  assert.equal(h.draft.hasUnsavedBrandDraft(h.uid), true);
  h.navigator.onLine = true;
  await h.draft.saveBrandDraft();
  assert.equal(h.documents.get(`users/${h.uid}/pages/branding`).parameters.brandName, 'Offline edit');
});

test('a paused account does not block another signed-in account', async () => {
  const h = harness();
  await h.open();
  const gate = h.holdNext(Object.assign(new Error('Quota exceeded'), { code: 'resource-exhausted' }));
  h.edit('brandName', 'Unsaved account A');
  const failed = assert.rejects(h.draft.saveBrandDraft(), { code: 'resource-exhausted' });
  await gate.entered.promise;
  gate.release.resolve();
  await failed;
  await h.switchAccount('second-user');
  h.edit('brandName', 'Account B');
  await h.draft.saveBrandDraft();
  assert.equal(h.draft.isBrandDraftSavePaused('second-user'), false);
  assert.equal(h.documents.get('users/second-user/pages/branding').parameters.brandName, 'Account B');
  assert.equal(h.documents.get(`users/${h.uid}/pages/branding`).parameters.brandName, 'Original');
});

test('legacy ten-page drafts migrate by writing only the five current pages and leave hidden documents untouched', async () => {
  const h = harness({ legacy: true });
  h.documents.get(`users/${h.uid}/pages/ai_center`).parameters.messages = [{ role: 'user', content: 'Saved hidden chat' }];
  const hidden = new Map([...h.documents.entries()]
    .filter(([ref]) => ref.includes('/pages/') && !h.workspacePageIds.includes(ref.split('/').at(-1)))
    .map(([ref, value]) => [ref, structuredClone(value)]));
  await h.open({ workspaceOnly: true });
  const normal = h.draft.saveBrandDraft();
  assert.equal(normal, h.draft.saveBrandDraft());
  await normal;
  assert.equal(h.attempts(), 1);
  assert.deepEqual(h.commits[0].filter(write => write.ref.includes('/pages/')).map(write => write.value.pageId), h.workspacePageIds);
  assert.deepEqual(h.documents.get(`users/${h.uid}/brandEngine/draft`).pageIds, h.workspacePageIds);
  for (const [ref, value] of hidden) assert.deepEqual(h.documents.get(ref), value);
  assert.ok(h.reads.filter(ref => ref.includes('/pages/')).every(ref => h.workspacePageIds.includes(ref.split('/').at(-1))));
  await h.open({ workspaceOnly: true });
  await h.draft.saveBrandDraft();
  assert.equal(h.attempts(), 1);
});

test('hidden screen changes do not trigger a save in the five-page workspace', async () => {
  const h = harness();
  await h.open();
  h.edit('messages', [{ role: 'user', content: 'An old hidden chat' }]);
  h.edit('pageParameters', { ...h.state().pageParameters, marketing: { campaign: 'Old hidden campaign' } });
  assert.equal(h.draft.hasUnsavedBrandDraft(h.uid), false);
  await h.draft.saveBrandDraft();
  assert.equal(h.attempts(), 0);
});

test('setup progress and selected modules survive reopening without a vision or integrations document', async () => {
  const h = harness();
  await h.open();
  h.edit('activeStep', 18);
  h.edit('completedSteps', [13, 14, 5]);
  h.edit('modules', ['crm', 'payments']);
  await h.draft.saveBrandDraft();
  assert.equal(h.documents.has(`users/${h.uid}/pages/vision_journey`), false);
  assert.equal(h.documents.has(`users/${h.uid}/pages/integrations`), false);
  assert.equal(h.documents.get(`users/${h.uid}/pages/deployment`).parameters.activeStep, 18);
  assert.deepEqual(h.documents.get(`users/${h.uid}/pages/dashboard`).parameters.modules, ['crm', 'payments']);
  h.edit('activeStep', 1);
  h.edit('completedSteps', []);
  h.edit('modules', []);
  await h.open({ workspaceOnly: true, progress: { activeStep: 1, completedSteps: [] } });
  assert.equal(h.state().activeStep, 18);
  assert.deepEqual(h.state().completedSteps, [13, 14, 5]);
  assert.deepEqual(h.state().modules, ['crm', 'payments']);
});

test('five-page realtime edits merge with local changes and do not create a save feedback loop', async () => {
  const h = harness();
  await h.open();
  const stop = h.subscribe();
  h.edit('brandName', 'Local name');
  for (const id of h.workspacePageIds) h.documents.get(`users/${h.uid}/pages/${id}`).revision = 'remote';
  h.documents.get(`users/${h.uid}/pages/business_discovery`).parameters.businessDescription = 'Remote description';
  h.documents.get(`users/${h.uid}/brandEngine/draft`).revision = 'remote';
  h.documents.set(`users/${h.uid}/pages/marketing`, { revision: 'old-hidden-revision', parameters: {} });
  h.emitSnapshot();
  await h.draft.saveBrandDraft();
  assert.equal(h.state().brandName, 'Local name');
  assert.equal(h.state().businessDescription, 'Remote description');
  assert.equal(h.activity.syncErrorCode, null);
  assert.equal(h.attempts(), 1);
  h.emitSnapshot();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.attempts(), 1);
  assert.equal(h.documents.get(`users/${h.uid}/pages/marketing`).revision, 'old-hidden-revision');
  stop();
});

test('deployment preparation verifies and hashes the five saved pages without creating legacy documents', async () => {
  const h = harness();
  await h.open();
  const result = await h.draft.preparePhoenixConfiguration();
  assert.equal(result.status, 'prepared');
  const preparation = h.documents.get(`users/${h.uid}/brandEngine/phoenixPreparation`);
  assert.equal(preparation.snapshotId, h.documents.get(`users/${h.uid}/brandEngine/draft`).revision);
  assert.match(preparation.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal([...h.documents.keys()].filter(ref => ref.includes('/pages/')).length, 5);
  assert.equal((await h.draft.loadPhoenixPreparation(h.uid)).state, 'prepared');
});

test('save failures distinguish quota exhaustion and connection failures in both languages', () => {
  const failures = loader({}, {})(path.join(root, 'data/saveFailure.ts'));
  assert.equal(failures.saveFailureCode({ code: 'firestore/resource-exhausted' }), 'resource-exhausted');
  assert.equal(failures.saveFailureCode(new TypeError('Failed to fetch')), 'unavailable');
  assert.equal(failures.saveFailureCode(new Error('net::ERR_NAME_NOT_RESOLVED')), 'unavailable');
  assert.match(failures.saveFailureMessage('resource-exhausted', false), /usage limit.*autosave is paused/);
  assert.match(failures.saveFailureMessage('resource-exhausted', true), /حد الاستخدام/);
});

test('autosave keeps quota errors visible across edits and reconnects; Retry resumes with current content', async () => {
  let cursor = 0, paused = false, saves = 0, retries = 0;
  const hooks = [], effects = [], timers = new Map(), events = new Map();
  const state = {
    brand: { userProfile: { uid: 'test-user' }, content: '[]' },
    activity: { retry: 0, status: 'idle' },
  };
  const actions = Object.fromEntries(['setOwner', 'setStatus', 'saveFailed', 'record', 'retrySave']
    .map(type => [type, payload => ({ type, payload })]));
  const dispatch = ({ type, payload }) => {
    if (type === 'setStatus') state.activity.status = payload;
    if (type === 'saveFailed') { state.activity.status = 'error'; state.activity.saveErrorCode = payload; }
    if (type === 'retrySave') state.activity.retry++;
  };
  const window = {
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: name => events.delete(name),
    setTimeout(fn, delay) { const id = Symbol(); timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  const load = loader({
    react: {
      useRef(value) { return hooks[cursor++] ??= { current: value }; },
      useEffect(fn, deps) {
        const id = cursor++;
        if (!hooks[id] || deps.some((dep, index) => dep !== hooks[id].deps[index])) {
          effects.push(() => { hooks[id]?.cleanup?.(); hooks[id] = { deps, cleanup: fn() }; });
        }
      },
    },
    'react/jsx-runtime': { jsx: () => null, Fragment: null },
    '@/modules/brand-engine/store/hooks': { useAppDispatch: () => dispatch, useAppSelector: select => select(state) },
    '@/modules/brand-engine/store/activitySlice': { activityActions: actions },
    '@/modules/brand-engine/data/brandPages': { fingerprintBrandPages: brand => brand.content },
    '@/modules/brand-engine/services/brandDraft': {
      isBrandDraftSavePaused: () => paused,
      retryBrandDraftSave: () => { retries++; paused = false; },
      saveBrandDraft: async () => {
        saves++;
        if (saves === 1) {
          paused = true;
          throw Object.assign(new Error('Quota exceeded'), { code: 'resource-exhausted' });
        }
        return 'saved';
      },
    },
    '@/modules/brand-engine/services/brandDraftRealtime': { subscribeBrandDraft: () => () => {} },
    '@/modules/brand-engine/services/saveNotifications': { subscribeSaveNotifications: () => () => {} },
    './SaveNotifications': { SaveToast: () => null },
  }, {}, window);
  const { DraftSync } = load(path.join(root, 'components/brandengine/DraftSync.tsx'));
  const render = () => {
    cursor = 0;
    DraftSync();
    while (effects.length) effects.shift()();
  };
  const flushSave = async () => {
    assert.equal(timers.size, 1);
    const [id, timer] = [...timers][0];
    timers.delete(id);
    timer.fn();
    await new Promise(resolve => setImmediate(resolve));
  };
  render();
  state.brand.content = '[{"pageId":"branding","parameters":{"brandName":"First"}}]';
  render();
  assert.equal(timers.size, 1);
  await flushSave();
  assert.equal(state.activity.status, 'error');
  state.brand.content = '[{"pageId":"branding","parameters":{"brandName":"Latest"}}]';
  render();
  events.get('online')();
  render();
  assert.equal(saves, 1);
  assert.equal(retries, 0);
  assert.equal(timers.size, 0);
  assert.equal(state.activity.saveErrorCode, 'resource-exhausted');
  dispatch(actions.retrySave());
  render();
  assert.equal(retries, 1);
  await flushSave();
  assert.equal(saves, 2);
  assert.equal(state.activity.status, 'saved');
});
