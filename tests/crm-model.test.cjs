const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load the pure CRM model without introducing a test runner dependency.
const source = fs.readFileSync(path.join(__dirname, '../src/pages/crm/model.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const model = import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

test('CSV handles BOM, quoted commas, escaped quotes and multiline fields', async () => {
  const { parseCSV } = await model;
  assert.deepEqual(parseCSV('\uFEFFname,email,company\r\n"Chen, Sarah",sarah@example.com,"A ""quoted"" company\nsecond line"\r\n'), [
    ['name', 'email', 'company'], ['Chen, Sarah', 'sarah@example.com', 'A "quoted" company\nsecond line'],
  ]);
});
test('CSV skips blank rows and preserves empty trailing columns', async () => {
  const { parseCSV } = await model;
  assert.deepEqual(parseCSV('name,email,phone\n\nSarah,s@example.com,\n\r\n'), [['name', 'email', 'phone'], ['Sarah', 's@example.com', '']]);
  assert.deepEqual(parseCSV(''), []);
});
test('CSV rejects incomplete quoted records', async () => {
  const { parseCSV } = await model;
  assert.throws(() => parseCSV('name,email\n"Sarah,s@example.com'), /Unclosed quoted field/);
});
test('All five templates have distinct stages and a terminal closed stage', async () => {
  const { templates, templateStages } = await model;
  assert.equal(templates.length, 5);
  for (const template of templates) {
    const stages = templateStages(template.stages);
    assert.equal(new Set(stages.map(s => s.id)).size, stages.length);
    assert.equal(stages.at(-1).id, 'PAYMENT_COMPLETED');
    assert.deepEqual(stages.map(s => s.label), template.stages);
  }
});
test('Legacy stages and removed stages stay visible on the board', async () => {
  const { displayStage, mainPipeline } = await model;
  assert.equal(displayStage({ lifecycleStage: 'BOOKING' }, mainPipeline), 'CONVERSATION');
  assert.equal(displayStage({ lifecycleStage: 'ACTIVE_CUSTOMER' }, mainPipeline), 'PAYMENT_COMPLETED');
  const reduced = { ...mainPipeline, stages: [mainPipeline.stages[0]] };
  assert.equal(displayStage({ lifecycleStage: 'QUALIFIED' }, reduced), 'LEAD_CAPTURED');
});
test('New contacts have unique identities, capture activity and explicit consent', async () => {
  const { makeLead } = await model;
  const first = makeLead({ name: 'Sarah Chen', email: 's@example.com', pipelineId: 'service', value: 2400 });
  const second = makeLead({ name: 'Sarah Chen', email: 's@example.com' });
  assert.notEqual(first.id, second.id);
  assert.equal(first.avatar, 'SC');
  assert.equal(first.pipelineId, 'service');
  assert.equal(first.value, 2400);
  assert.equal(first.activities[0].type, 'capture');
  assert.equal(first.hasWhatsAppConsent, false);
  assert.ok(!Number.isNaN(Date.parse(first.createdAt)));
});
test('Recent activity sorting recognizes relative activity timestamps', async () => {
  const { activityTime } = await model;
  assert.ok(activityTime('Just now') > activityTime('4 min ago'));
  assert.ok(activityTime('4 min ago') > activityTime('Yesterday'));
  assert.ok(activityTime('Yesterday') > activityTime('3 days ago'));
  assert.equal(activityTime('Unknown'), 0);
});
