import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
const source = fs.readFileSync(new URL('../src/pages/admin/sourceAvailability.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText, {exports});
const {sourceAvailability: availability} = exports;
test('a denied handoff log cannot suppress threads, revenue, leads or workspace counts', () => {
  const failed={'a/handoffLogs':'Denied','a/aiUsage':'Denied',users:'Denied'};
  for(const sources of [['conversations'],['messages'],['transactions'],['leads'],[]]) assert.equal(availability(sources,['a'],failed,[]),'ready');
  assert.equal(availability(['handoffLogs'],['a'],failed,[]),'unavailable');
  assert.equal(availability(['aiUsage'],['a'],failed,[]),'unavailable');
});
test('unrelated pending sources cannot hold successful metrics in loading',()=>{
  assert.equal(availability(['leads'],['a'],{},['a/aiUsage']),'ready');
  assert.equal(availability(['aiUsage'],['a'],{},['a/aiUsage']),'loading');
  assert.equal(availability([],[],{},['directory']),'loading');
});
test('partial sources are labeled without inventing complete totals or blocking union logs',()=>{
  assert.equal(availability(['transactions'],['a','b'],{'a/transactions':'Denied'},[]),'partial');
  assert.equal(availability(['events','auditLogs'],['a'],{'a/auditLogs':'Denied'},[]),'partial');
  assert.equal(availability(['transactions'],['a','b'],{'a/transactions':'Denied','b/transactions':'Denied'},[]),'unavailable');
});
test('missing collections are legitimate empty sources, while directory denial is unavailable',()=>{
  assert.equal(availability(['aiUsage'],[],{},[]),'ready');
  assert.equal(availability(['aiUsage'],['a'],{},[]),'ready');
  assert.equal(availability(['leads'],[],{},[],'Directory denied'),'unavailable');
});
test('Business Assets belongs to main Admin navigation and is absent from Admin Settings tabs',()=>{
  const catalog=fs.readFileSync(new URL('../src/pages/admin/catalog.ts',import.meta.url),'utf8');
  const groups=fs.readFileSync(new URL('../src/pages/admin/AdminGroups.tsx',import.meta.url),'utf8');
  const layout=fs.readFileSync(new URL('../src/components/layout/AdminLayout.tsx',import.meta.url),'utf8');
  assert.match(catalog,/id:'business-assets'/);assert.doesNotMatch(groups,/'business-assets'/);
  assert.match(layout,/modules.filter/);assert.doesNotMatch(layout,/\|\|location.pathname==='\/admin\/business-assets'/);
});
