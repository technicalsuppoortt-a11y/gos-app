import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function compile(path, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: dependencies });
  return exports;
}
test('optional policy loading or denied reads do not replace authenticated workspace routes', () => {
  let policy = { tools: {}, loading: false, error: 'You do not have permission for this action.', revision: 0 }, plan = '';
  const helpers = compile('src/backend/toolPolicy.ts', () => { throw Error('Unexpected dependency'); });
  const { PlatformToolBoundary } = compile('src/backend/platformTools.tsx', name => {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return { useEffect: () => {}, useState: initial => [typeof initial === 'object' && 'tools' in initial ? policy : plan, () => {}] };
    if (name === 'react-redux') return { useSelector: select => select({ auth: { tenant: { id: 'workspace' } } }) };
    if (name === 'react-router-dom') return { useLocation: () => ({ pathname: '/dashboard/funnels' }) };
    if (name === '../i18n/display') return { useUILanguage: () => 'en' };
    if (name === '../pages/admin/tools-data') return { initialTools: [] };
    if (name === './toolPolicy') return helpers;
    if (['./firebase', 'firebase/firestore'].includes(name)) return {};
    throw Error(`Unexpected dependency ${name}`);
  });
  assert.equal(PlatformToolBoundary({ children: 'existing-workspace' }), 'existing-workspace');
  policy = { ...policy, loading: true, error: '' };
  assert.equal(PlatformToolBoundary({ children: 'existing-workspace' }), 'existing-workspace');
  policy = { ...policy, loading: false, tools: { 'funnel-builder': { enabled: true, status: 'Active', accessTier: 'agency_only' } } };
  assert.equal(PlatformToolBoundary({ children: 'existing-workspace' }), 'existing-workspace', 'Missing plan metadata preserves membership access');
  policy.tools['funnel-builder'].enabled = false;
  assert.equal(PlatformToolBoundary({ children: 'existing-workspace' }).props.className, 'module-access-message', 'An explicit successfully loaded disabled policy still applies');
  policy.tools['funnel-builder'].enabled = true;
  plan = 'Starter';
  assert.equal(PlatformToolBoundary({ children: 'existing-workspace' }).props.className, 'module-access-message', 'Known plan restrictions still apply');
});
