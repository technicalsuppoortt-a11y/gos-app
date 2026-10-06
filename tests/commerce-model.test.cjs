const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function compile(name) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/pages/commerce', name), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}
const modelContext = { exports: {}, URL, Intl };
vm.runInNewContext(compile('model.ts'), modelContext);
const model = modelContext.exports;
function offer(type) {
  return { ...model.newProduct(), id: 'test-offer', type, name: 'Test offer', description: 'A complete offer.', config: model.defaultConfig(type) };
}

test('publishing checks delivery requirements for all five primary types', () => {
  const service = offer('Service');
  assert.match(model.validateProduct(service, true).join(' '), /booking link/);
  service.config.bookingUrl = 'https://example.com/book';
  assert.equal(model.validateProduct(service, true).length, 0);
  const digital = offer('Digital Product');
  assert.match(model.validateProduct(digital, true).join(' '), /digital asset/);
  digital.config.assets = [{ name: 'Workbook', url: 'https://example.com/workbook.pdf' }];
  assert.equal(model.validateProduct(digital, true).length, 0);
  const course = offer('Course / Membership');
  assert.match(model.validateProduct(course, true).join(' '), /modules/);
  course.config.modules = [{ title: 'Introduction', lessons: ['Welcome'] }];
  assert.equal(model.validateProduct(course, true).length, 0);
  course.config.modules[0].lessons = [''];
  assert.match(model.validateProduct(course, true).join(' '), /named lessons/);
  course.config.communityUrl = 'https://example.com/community';
  assert.equal(model.validateProduct(course, true).length, 0);
  const subscription = offer('Subscription');
  assert.equal(subscription.config.billing, 'Subscription');
  subscription.config.billing = 'One-time';
  assert.match(model.validateProduct(subscription, true).join(' '), /recurring billing/);
  const bundle = offer('Bundle');
  assert.match(model.validateProduct(bundle, true).join(' '), /at least two/);
  bundle.config.components = ['course', 'workbook'];
  assert.equal(model.validateProduct(bundle, true).length, 0);
});

test('drafts allow unfinished delivery, but reject invalid billing and unsafe URLs', () => {
  const product = offer('Digital Product');
  assert.equal(model.validateProduct(product).length, 0);
  product.config.amount = -1;
  product.config.taxRate = 101;
  product.config.trialDays = -1;
  product.config.downloadLimit = 0;
  product.config.salesUrl = 'javascript:alert(1)';
  const errors = model.validateProduct(product).join(' ');
  for (const expected of [/Price/, /Tax rate/, /Trial days/, /Download limit/, /valid https/]) assert.match(errors, expected);
  product.config.salesUrl = 'https://';
  assert.match(model.validateProduct(product).join(' '), /valid https/);
});

test('payment plans and recurring prices retain their billing terms', () => {
  const config = model.defaultConfig('Subscription');
  config.amount = 29;
  assert.match(model.formatPrice(config), /29.*\/ month/);
  config.frequency = 'Yearly';
  assert.match(model.formatPrice(config), /\/ year/);
  config.billing = 'Payment plan';
  config.installments = 3;
  config.amount = 97;
  assert.match(model.formatPrice(config), /97.*× 3/);
  const product = offer('Service');
  product.config = { ...config, installments: 1 };
  assert.match(model.validateProduct(product).join(' '), /two installments/);
});

test('physical product model preserves inventory and shipping for future expansion', () => {
  const config = model.defaultConfig('Physical Product');
  assert.equal(config.inventory, 0);
  assert.equal(config.sku, '');
  assert.equal(config.shippingRequired, true);
});

test('repository persists type-specific fields, isolates tenants and handles failed saves atomically', () => {
  const storage = new Map();
  const subscriptions = [];
  let auth = { tenant: { id: 'tenant-a' }, user: { id: 'user-a' } };
  let failStorage = false;
  const repoContext = {
    exports: {}, structuredClone, crypto: require('node:crypto').webcrypto,
    window: { addEventListener() {} },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { if (failStorage) throw new Error('quota'); storage.set(key, value); } },
    require: name => {
      if (name === 'react') return { useSyncExternalStore: (_, snapshot) => snapshot() };
      if (name === './model') return model;
      if (name === './seeds') return { seedProducts: [] };
      if (name === '../../store') return { store: { getState: () => ({ auth }), subscribe: fn => subscriptions.push(fn) } };
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  vm.runInNewContext(compile('repository.ts'), repoContext);
  const repository = repoContext.exports;
  const product = offer('Service');
  product.config.bookingUrl = 'https://example.com/calendar';
  product.config.duration = 90;
  product.config.automations.crmTag = 'coaching-customer';
  const saved = repository.saveProduct(product);
  assert.equal(repository.useProducts()[0].config.duration, 90);
  assert.equal(JSON.parse(storage.get('gos-commerce-products-v1:tenant-a'))[0].config.automations.crmTag, 'coaching-customer');
  failStorage = true;
  assert.throws(() => repository.saveProduct({ ...saved, name: 'Failed change' }), /could not be saved/);
  assert.equal(repository.useProducts()[0].name, 'Test offer');
  failStorage = false;
  const copy = repository.duplicateProduct(saved);
  assert.notEqual(copy.id, saved.id);
  assert.equal(copy.status, 'Draft');
  assert.equal(copy.sales, '0');
  assert.equal(copy.config.experience.version, 1);
  const version = repository.duplicateProduct(saved, true);
  assert.equal(version.config.experience.parentId, saved.id);
  assert.equal(version.config.experience.version, 2);
  assert.equal(saved.config.experience.version, 1);
  auth = { tenant: { id: 'tenant-b' }, user: { id: 'user-b' } };
  subscriptions.forEach(fn => fn());
  assert.equal(repository.useProducts().length, 0);
  repository.saveProduct({ ...product, name: 'Tenant B offer' });
  auth = { tenant: { id: 'tenant-a' }, user: { id: 'user-a' } };
  subscriptions.forEach(fn => fn());
  assert.equal(repository.useProducts().find(p => p.id === saved.id).name, 'Test offer');
  const digital = offer('Digital Product');
  digital.id = '';
  digital.config.experience.fileType = 'Canva Template';
  digital.config.experience.downloadLimitEnabled = false;
  const savedDigital = repository.saveProduct(digital);
  assert.equal(repository.useProducts().find(p => p.id === savedDigital.id).config.experience.fileType, 'Canva Template');
  assert.equal(repository.useProducts().find(p => p.id === savedDigital.id).config.experience.downloadLimitEnabled, false);
  failStorage = true;
  assert.throws(() => repository.deleteProduct(savedDigital.id), /could not be deleted/);
  assert.ok(repository.useProducts().some(p => p.id === savedDigital.id));
  failStorage = false;
  const bundle = offer('Bundle');
  bundle.id = '';
  bundle.config.components = [savedDigital.id, saved.id];
  const savedBundle = repository.saveProduct(bundle);
  assert.throws(() => repository.deleteProduct(savedDigital.id), /bundles/);
  repository.deleteProduct(savedBundle.id);
  repository.deleteProduct(savedDigital.id);
  assert.ok(!repository.useProducts().some(p => p.id === savedDigital.id));
  assert.ok(!JSON.parse(storage.get('gos-commerce-products-v1:tenant-a')).some(p => p.id === savedDigital.id));
  assert.ok(JSON.parse(storage.get('gos-commerce-products-v1:tenant-b')).some(p => p.name === 'Tenant B offer'));
});


test('legacy types and lesson titles migrate without losing saved data', () => {
 for (const [type,kind,label] of [['course','course','Course / Membership'],['Online Course','course','Course / Membership'],['digital','digital','Digital Product'],['service','service','Service']]) {
   const original=offer(type);
   delete original.config.experience;
   original.config.modules=[{title:'Saved module',lessons:['Saved lesson']}];
   original.config.assets=[{name:'Saved file',url:'https://example.com/file.pdf'}];
   const migrated=model.hydrateProduct(original);
   assert.equal(model.productKind(type),kind);
   assert.equal(migrated.type,label);
   assert.equal(migrated.config.assets[0].name,'Saved file');
   assert.equal(model.lessonData(migrated.config.modules[0].lessons[0]).title,'Saved lesson');
   assert.equal(migrated.config.experience.requireLogin,true);
 }
});

test('uploaded digital files can satisfy delivery without a remote URL', () => {
 const product=offer('digital');
 product.config.assets=[{name:'Templates.zip',url:'',storageId:'stored-file-id',size:12000}];
 assert.equal(model.validateProduct(product,true).length,0);
 product.config.modules=[{title:'Module',lessons:[{id:'lesson',title:'Title',kind:'PDF',duration:'2 MB',url:'javascript:alert(1)'}]}];
 assert.match(model.validateProduct(product).join(' '),/Lesson resource URL/);
});

test('optional payment tiers and student limits validate independently', () => {
 const product=offer('Course / Membership'), e=product.config.experience;
 e.planEnabled=true; e.installmentAmount=-1;
 e.recurringEnabled=true; e.recurringAmount=0;
 e.studentLimit=-5; e.showComparePrice=true; e.comparePrice=-1;
 const errors=model.validateProduct(product).join(' ');
 assert.match(errors,/payment plans/); assert.match(errors,/Recurring offers/);
 assert.match(errors,/Student limit/); assert.match(errors,/Compare price/);
});

test('pricing settings migrate and persist without losing manual approval or legacy prices', () => {
 const original=offer('course');
 original.config.delivery='After approval';
 original.config.experience={oneTimeAmount:297,checkout:{secure:false}};
 const migrated=model.hydrateProduct(original), e=migrated.config.experience;
 assert.equal(e.oneTimeAmount,297);
 assert.equal(e.checkout.secure,false);
 assert.equal(e.checkout.guest,true);
 assert.equal(e.accessRule,'After manual approval');
 assert.equal(e.coupon.enabled,false);
 e.coupon={...e.coupon,enabled:true,code:'LAUNCH20',limitUsage:true,usageLimit:100};
 e.discounts=[{id:'discount',enabled:true,type:'Fixed Amount',value:10,appliesTo:'Payment plan'}];
 e.taxHandling='Include tax in price';
 e.accessRule='After specific date';e.accessDate='2027-01-15';
 const restored=model.hydrateProduct(JSON.parse(JSON.stringify(migrated))).config.experience;
 assert.equal(restored.coupon.code,'LAUNCH20');
 assert.equal(restored.discounts[0].appliesTo,'Payment plan');
 assert.equal(restored.accessDate,'2027-01-15');
 assert.equal(restored.taxHandling,'Include tax in price');
 assert.equal(model.validateProduct(migrated).length,0);
});

test('invalid enabled discounts and scheduled access cannot be saved', () => {
 const product=offer('course'), e=product.config.experience;
 e.coupon={...e.coupon,enabled:true,value:101,limitUsage:true,usageLimit:0};
 e.accessRule='After specific date';e.accessDate='';
 let errors=model.validateProduct(product).join(' ');
 for(const pattern of [/discount code/,/usage limit/,/percentages/,/access date/]) assert.match(errors,pattern);
 e.coupon.enabled=false;e.accessRule='Drip content (scheduled release)';e.dripDays=0;
 assert.match(model.validateProduct(product).join(' '),/Drip release interval/);
 e.dripDays=7;
 assert.equal(model.validateProduct(product).length,0);
});
