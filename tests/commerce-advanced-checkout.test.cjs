const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, mocks = {}) {
  const context = { exports: {}, URL, Intl, require: name => mocks[name] };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/pages/commerce/${file}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports;
}
const model = load('model'), { checkoutTotals, resolvePromoDiscount } = load('checkout-model', { './model': model });
function product() { const p = model.newProduct(); p.id = 'main'; p.name = 'Service'; p.config.amount = 100; p.config.experience.oneTimeAmount = 100; p.config.taxRate = 20; return p; }
const code = { id: 'global', code: 'SUMM12', type: 'Percentage', value: 20, active: true, applies: 'All Products', minimum: 0, uses: 0, limit: 0, expiry: '', customersOnly: false, once: false };
test('explicitly selected global percentage and fixed promos recalculate inclusive/exclusive taxes and bumps', () => {
  const p = product();
  assert.equal(checkoutTotals(p).dueToday, 120);
  const totals = checkoutTotals(p, undefined, 10, ' summ12 ', [code]);
  assert.equal(totals.discount, 20); assert.equal(totals.tax, 18); assert.equal(totals.dueToday, 108);
  p.config.experience.taxHandling = 'Include tax in price';
  const inclusive = checkoutTotals(p, undefined, 10, 'SUMM12', [code]);
  assert.equal(inclusive.dueToday, 90); assert.equal(inclusive.tax, 15);
  assert.equal(checkoutTotals(p, undefined, 0, 'SUMM12', [{ ...code, type: 'Fixed Amount', value: 200 }]).dueToday, 0);
});
test('global eligibility rejects expiration, disabled, exhausted, minimum, currency, scope and customer restrictions', () => {
  const p = product();
  for (const patch of [{ active:false }, { expiry:'2020-01-01' }, { expiry:'bad' }, { limit:1, uses:1 }, { minimum:101 }, { currency:'USD' }, { applies:'Specific Products', productIds:['other'] }, { applies:'Payment Plans' }, { customersOnly:true }, { once:true }, { value:NaN }]) assert.equal(resolvePromoDiscount(p, 'SUMM12', [{ ...code, ...patch }]), null);
  assert.ok(resolvePromoDiscount(p, 'SUMM12', [{ ...code, applies:'Specific Products', productIds:['main'] }]));
  assert.equal(resolvePromoDiscount(p, 'wrong', [code]), null);
});
test('product coupon wins collisions and invalid input preserves only automatic discounts', () => {
  const p = product(); p.config.experience.coupon = { ...p.config.experience.coupon, enabled:true, code:'SUMM12', type:'Fixed Amount', value:5 };
  assert.equal(checkoutTotals(p, undefined, 0, 'summ12', [code]).discount,5);
  assert.equal(checkoutTotals(p, undefined, 0, 'unknown', [code]).discount,0);
});
test('structured fields migrate once, retain identity/order/required flags, and page choices survive hydration', () => {
  const p = product(); p.config.checkoutFields = 'Company, Tax ID';
  let migrated = model.hydrateProduct(p);
  assert.equal(migrated.config.customCheckoutFields[1].label,'Tax ID');
  migrated.config.customCheckoutFields.reverse(); migrated.config.customCheckoutFields[0].required=true;
  migrated.config.thankYouTemplate='community'; migrated.config.salesTemplate='minimal';
  migrated.config.experience.downsellId='legacy';
  migrated = model.hydrateProduct(JSON.parse(JSON.stringify(migrated)));
  assert.equal(migrated.config.customCheckoutFields[0].id,'legacy-field-1');
  assert.equal(migrated.config.customCheckoutFields[0].required,true);
  assert.equal(migrated.config.salesTemplate,'minimal'); assert.equal(migrated.config.thankYouTemplate,'community');
  assert.equal('downsellId' in migrated.config.experience,false);
  migrated.config.customCheckoutFields[0].label='';
  assert.match(model.validateProduct(migrated).join(' '),/non-empty labels/);
});
