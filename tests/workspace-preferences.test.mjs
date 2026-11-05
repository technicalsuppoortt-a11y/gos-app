import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/backend/workspacePreferences.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });

function mount(impersonating = false) {
  const auth = { user: { id: 'client' }, tenant: { id: 'workspace' }, role: 'USER',
    impersonation: impersonating ? { user: { id: 'admin' } } : null };
  const listeners = new Map();
  const hooks = [];
  const effects = [];
  let slot = 0;
  const modules = {
    react: {
      createContext: () => ({}),
      useState(initial) {
        const index = slot++;
        hooks[index] ??= initial;
        return [hooks[index], value => { hooks[index] = value; }];
      },
      useEffect(effect) { effects.push(effect); },
    },
    'react-redux': { useSelector: select => select({ auth }) },
    'firebase/firestore': {
      doc: (...parts) => parts.join('/'),
      onSnapshot(path, next, fail) {
        listeners.set(path, { next, fail });
        return () => listeners.delete(path);
      },
    },
    'firebase/storage': {},
    './firebase': { auth: { currentUser: { uid: 'client' } }, db: 'clientDb', primaryDb: 'primaryDb' },
  };
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: id => modules[id] });
  const state = () => {
    slot = 0;
    return exports.useWorkspacePreferenceState();
  };
  state();
  for (const effect of effects.splice(0)) effect();
  return {
    state, listeners,
    emit: (path, data) => listeners.get(path).next({ data: () => data }),
  };
}

const publicPath = 'primaryDb/settings/publicAppearance';
const workspacePath = 'clientDb/tenants/workspace/preferences/general';
const profilePath = 'clientDb/users/client';
const personalPath = 'clientDb/users/client/preferences/dashboard';
const adminDefaults = { language: 'ar', currency: 'EGP', mode: 'dark' };
const publicDefaults = { language: 'en', currency: 'USD', mode: 'light' };
const visible = ({ values }) => ({ language: values.language, currency: values.currency, mode: values.mode });

test('a new Agency user inherits the linked admin defaults and receives live changes', () => {
  const view = mount();
  view.emit(publicPath, { values: publicDefaults });
  view.emit(workspacePath, { values: publicDefaults });
  view.emit(personalPath, undefined);
  view.emit(profilePath, { accountType: 'agency', supportParentId: 'admin', tenantId: 'workspace' });
  const adminPath = 'clientDb/dashboardBrands/admin';
  view.emit(adminPath, { values: adminDefaults });
  assert.deepEqual(visible(view.state()), adminDefaults);
  view.emit(adminPath, { values: { ...adminDefaults, mode: 'system' } });
  view.emit(publicPath, { values: { ...publicDefaults, currency: 'EUR' } });
  assert.deepEqual(visible(view.state()), { ...adminDefaults, mode: 'system' });
  view.emit(personalPath, { language: 'en' });
  assert.equal(view.state().personal.language, 'en');
});

test('switching into an agency workspace can read the original admin publication', () => {
  const view = mount(true);
  view.emit(publicPath, { values: publicDefaults });
  view.emit(profilePath, { accountType: 'agency', billingOwnerId: 'admin' });
  view.emit('primaryDb/dashboardBrands/admin', { values: adminDefaults });
  assert.deepEqual(visible(view.state()), adminDefaults);
});

test('accounts without a readable admin publication retain workspace and public fallbacks', () => {
  const view = mount();
  view.emit(publicPath, { values: publicDefaults });
  view.emit(profilePath, { accountType: 'agency', createdBy: 'admin' });
  view.listeners.get('clientDb/dashboardBrands/admin').fail(new Error('Permission denied'));
  assert.deepEqual(visible(view.state()), publicDefaults);
  view.emit(workspacePath, { values: adminDefaults });
  assert.deepEqual(visible(view.state()), adminDefaults);
});
