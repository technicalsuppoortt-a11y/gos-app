import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const require = createRequire(import.meta.url), root = fileURLToPath(new URL('../', import.meta.url));
const cache = new Map(); let serial = 0;
const stableUUID = () => { const hex = createHash('sha256').update(`gos-template-migration-v2:${serial++}`).digest('hex'); return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`; };
const math = Object.create(Math); math.random = () => parseInt(stableUUID().slice(0, 8), 16) / 0x100000000;
function pureBuilder(source) {
  // Extract the existing factory and its actual local dependencies, without loading the editor UI.
  const ast = ts.createSourceFile('BuilderWorkspace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), declarations = new Map();
  for (const node of ast.statements) {
    if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node);
    if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) if (ts.isIdentifier(declaration.name)) declarations.set(declaration.name.text, node);
  }
  const selected = new Set();
  function include(name) { const node = declarations.get(name); if (!node || selected.has(node)) return; selected.add(node); const visit = child => { if (ts.isIdentifier(child)) include(child.text); ts.forEachChild(child, visit); }; ts.forEachChild(node, visit); }
  include('createBuilderDocument');
  return [...ast.statements].filter(node => selected.has(node)).map(node => node.getText(ast)).join('\n') + '\nexports.createBuilderDocument = createBuilderDocument;';
}
export function loadTemplateSource(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  let source = fs.readFileSync(filename, 'utf8');
  if (filename.endsWith('BuilderWorkspace.tsx')) source = pureBuilder(source);
  const compiled = ts.transpileModule(source, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  function resolve(id) {
    if (id.endsWith('/backend/workspace')) return { cloudStorage: { getItem: () => null, setItem() { throw new Error('Seeding must not write workspace state.'); } } };
    if (!id.startsWith('.')) return require(id);
    const base = path.resolve(path.dirname(filename), id);
    const target = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!target || !target.startsWith(path.join(root, 'src'))) throw new Error(`Unexpected seed dependency: ${id}`);
    return loadTemplateSource(path.relative(root, target));
  }
  vm.runInNewContext(compiled, { module, exports: module.exports, require: resolve, structuredClone, crypto: { ...webcrypto, randomUUID: stableUUID }, Date, Intl, Math: math, URL, console }, { filename });
  return module.exports;
}
export function buildSystemTemplateSeed() {
  const { MASTER_TEMPLATES } = loadTemplateSource('src/pages/system-template-data.ts');
  const { pageTemplates } = loadTemplateSource('src/pages/page-template-data.ts');
  const { initializeTemplateAsset } = loadTemplateSource('src/pages/system-template-assets.ts');
  const { bookingTemplatePresets, createBookingTemplate } = loadTemplateSource('src/pages/booking/template-presets.ts');
  const { productTemplates } = loadTemplateSource('src/pages/commerce/productTemplates.ts');
  const { productPresets, applyProductPreset } = loadTemplateSource('src/pages/commerce/productPresets.ts');
  const { newProduct } = loadTemplateSource('src/pages/commerce/model.ts');
  const { templates: pipelines } = loadTemplateSource('src/pages/crm/model.ts');
  const { legacyWebTemplateRows, seedRows } = loadTemplateSource('src/pages/admin/catalog.ts');
  const base = (id, name, category, description = '') => ({ id, name, category, description, industry: 'Professional Services', goal: 'Lead Generation', source: 'official', tags: [], color: '#7C3AED', updated: '2026-11-01', popularity: 0, active: true, status: 'Published', content: { headline: name, steps: ['Welcome', 'Explore offer', 'Take action'], settings: { enabled: false, language: 'en' } } });
  const records = MASTER_TEMPLATES.map(t => initializeTemplateAsset({ ...t, active: true, status: 'Published' }));
  for (const page of pageTemplates) {
    const category = page.mode === 'funnel' ? 'Funnels' : page.mode === 'form' ? 'Forms' : 'Websites';
    const existing = records.find(t => t.id === page.id || t.id === `page-${page.id}`);
    const steps = page.builderDocument?.pages?.length ? page.builderDocument.pages.map(p => p.name) : ['Welcome', 'Take action'];
    const value = initializeTemplateAsset({
      ...base(existing?.id || page.id, page.name, category, page.description || page.body),
      ...(existing || {}),
      industry: page.industry,
      goal: page.goal,
      color: page.color,
      popularity: page.popularity ?? existing?.popularity ?? 0,
      tags: page.tags ?? existing?.tags ?? [],
      thumbnail: page.thumbnail ?? existing?.thumbnail,
      pageTemplate: page,
      builderDocument: page.builderDocument ?? existing?.builderDocument,
      content: { headline: page.title, steps, settings: { enabled: true, language: 'en' } },
    });
    if (existing) Object.assign(existing, value); else records.push(value);
  }
  for (const preset of bookingTemplatePresets) {
    const existing = records.find(t => t.category === 'Booking Pages' && t.name === preset.name);
    const value = initializeTemplateAsset({ ...base(existing?.id || `booking-${preset.key}`, preset.name, 'Booking Pages', preset.description), industry: preset.category, bookingPage: createBookingTemplate(preset) });
    if (existing) Object.assign(existing, value); else records.push(value);
  }
  for (const preset of productTemplates) records.push(initializeTemplateAsset({ ...base(`product-${preset.id}`, preset.product.name, 'Products', preset.product.description), industry: preset.industry, tags: preset.tags, productTemplate: preset }));
  for (const preset of productPresets) {
    const product = applyProductPreset(newProduct(), preset);
    records.push(initializeTemplateAsset({ ...base(`product-preset-${preset.id}`, preset.name, 'Products', preset.description), productTemplate: { id: `product-preset-${preset.id}`, category: preset.kind === 'course' ? 'Courses' : preset.kind === 'service' ? 'Services' : 'Digital Products', industry: 'Professional Services', tags: [], features: preset.features, product } }));
  }
  for (const [index, preset] of pipelines.entries()) records.push(initializeTemplateAsset({ ...base(`pipeline-preset-${index}`, preset.name, 'CRM Pipelines', preset.description), pipelineTemplate: preset, content: { headline: preset.name, steps: preset.stages, settings: { enabled: false, language: 'en' } } }));
  for (const row of [...legacyWebTemplateRows, ...seedRows('templates', 0)]) if (!records.some(t => t.id === row.id)) records.push(initializeTemplateAsset({ ...base(row.id, row.name, row.category === 'Funnel' ? 'Funnels' : 'Websites', row.content), status: row.status, active: row.status === 'Published' }));
  if (new Set(records.map(t => t.id)).size !== records.length) throw new Error('Duplicate migration IDs.');
  return JSON.parse(JSON.stringify(records));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const records = buildSystemTemplateSeed();
  const output = path.join(root, 'functions/seed-data/system-templates.json');
  if (fs.existsSync(output)) {
    const previous = new Map(JSON.parse(fs.readFileSync(output, 'utf8')).map(item => [item.id, item]));
    for (const record of records) {
      const prior = previous.get(record.id);
      if (prior?.thumbnail?.startsWith('https://firebasestorage.googleapis.com/')) {
        record.thumbnail = prior.thumbnail;
        if (record.pageTemplate) record.pageTemplate.thumbnail = prior.thumbnail;
      }
      if (prior?.pageTemplate?.image?.startsWith('https://firebasestorage.googleapis.com/') && record.pageTemplate) {
        record.pageTemplate.image = prior.pageTemplate.image;
        if (record.builderDocument?.pages) {
          for (const page of record.builderDocument.pages) {
            if (page.featuredImage?.startsWith('/template-thumbnails/')) page.featuredImage = prior.pageTemplate.image;
          }
        }
      }
    }
  }
  const { validateSystemTemplate } = loadTemplateSource('src/pages/system-template-validation.ts');
  for (const record of records) { const errors = validateSystemTemplate(record); if (errors.length) throw new Error(`${record.id}: ${errors.join(' ')}`); }
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(records, null, 2) + '\n');
  console.log(JSON.stringify({ output, total: records.length, categories: records.reduce((counts, t) => ({ ...counts, [t.category]: (counts[t.category] || 0) + 1 }), {}) }, null, 2));
}
