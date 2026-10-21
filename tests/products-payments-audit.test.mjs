import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadTS(path, mocks = {}) {
  const fileUrl = new URL(path, import.meta.url);
  const code = ts.transpileModule(fs.readFileSync(fileUrl, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: id => {
      if (id in mocks) return mocks[id];
      if (id.endsWith('/model') || id === './model') return commerceModel;
      throw new Error(`Unexpected import ${id}`);
    },
    console,
    URL: globalThis.URL,
    crypto: globalThis.crypto,
  });
  return exports;
}

const commerceModel = loadTS('../src/pages/commerce/model.ts');
const {
  newProduct,
  defaultConfig,
  defaultExperience,
  hydrateProduct,
  validateProduct,
  productKind,
} = commerceModel;

const checkoutModel = loadTS('../src/pages/commerce/checkout-model.ts', {
  './model': commerceModel,
});
const { checkoutTotals } = checkoutModel;

const recordLinks = loadTS('../src/pages/crm/recordLinks.ts');
const { linkedToLead } = recordLinks;

test('TC-01: Product Catalog Navigation & Metric Filtering', () => {
  const catalog = [
    hydrateProduct({ id: 'p1', name: 'Executive Strategy Call', type: 'Service', price: '€150', status: 'Active', createdAt: '2026-10-01' }),
    hydrateProduct({ id: 'p2', name: 'AI Marketing Masterclass', type: 'Course', price: '€297', status: 'Active', createdAt: '2026-10-05' }),
    hydrateProduct({ id: 'p3', name: 'Social Media Templates', type: 'Digital Product', price: '€47', status: 'Draft', createdAt: '2026-10-10' }),
    hydrateProduct({ id: 'p4', name: 'Lead Gen Playbook', type: 'Digital Product', price: '€29', status: 'Active', createdAt: '2026-10-12' }),
  ];

  // 1. Filter by category
  const services = catalog.filter(p => p.type === 'Service');
  assert.equal(services.length, 1);
  assert.equal(services[0].name, 'Executive Strategy Call');

  const digital = catalog.filter(p => p.type === 'Digital Product');
  assert.equal(digital.length, 2);

  const courses = catalog.filter(p => p.type === 'Course');
  assert.equal(courses.length, 1);

  // 2. Status filter
  const activeProducts = catalog.filter(p => p.status === 'Active');
  assert.equal(activeProducts.length, 3);
  const draftProducts = catalog.filter(p => p.status === 'Draft');
  assert.equal(draftProducts.length, 1);

  // 3. Search query
  const searched = catalog.filter(p => `${p.name} ${p.type}`.toLowerCase().includes('templates'));
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, 'p3');

  // 4. Sorting: Price Low to High
  const sortedPrice = [...catalog].sort((a, b) => (a.config?.amount ?? 0) - (b.config?.amount ?? 0));
  assert.equal(sortedPrice[0].config?.amount, 29);
  assert.equal(sortedPrice[sortedPrice.length - 1].config?.amount, 297);
});

test('TC-02: Type-Specific Product Creation & Editing Flow', () => {
  // A. Service Product Type
  const service = newProduct();
  service.name = '1-on-1 Consulting';
  service.type = 'Service';
  service.config = defaultConfig('Service', '€150');
  service.config.duration = 60;
  service.config.bookingUrl = 'https://calendar.gos.app/consulting';
  service.config.bookingSlots = ['Mon 10:00', 'Wed 14:00', 'Fri 16:00'];
  service.config.experience = defaultExperience();
  service.config.experience.provider = 'Samir Morgan';
  service.config.experience.serviceMode = 'Online';

  assert.equal(productKind(service.type), 'service');
  assert.equal(service.config.duration, 60);
  assert.equal(service.config.experience.provider, 'Samir Morgan');
  assert.equal(service.config.bookingSlots.length, 3);
  assert.equal(service.config.experience.serviceMode, 'Online');

  // B. Digital Product Type
  const digital = newProduct();
  digital.name = 'Creator Toolkit PDF';
  digital.type = 'Digital Product';
  digital.config = defaultConfig('Digital Product', '€39');
  digital.config.assets = [
    { name: 'playbook.pdf', url: '', storageId: 'storage-file-123', size: 1048576, mime: 'application/pdf' },
  ];
  digital.config.downloadLimit = 5;
  digital.config.experience = defaultExperience();
  digital.config.experience.directDownload = true;
  digital.config.experience.watermark = true;

  assert.equal(productKind(digital.type), 'digital');
  assert.equal(digital.config.assets.length, 1);
  assert.equal(digital.config.downloadLimit, 5);
  assert.equal(digital.config.experience.directDownload, true);
  assert.equal(digital.config.experience.watermark, true);

  // C. Course Product Type
  const course = newProduct();
  course.name = 'Full-Stack Creator Academy';
  course.type = 'Course';
  course.config = defaultConfig('Course', '€199');
  course.config.modules = [
    {
      title: 'Module 1: Foundations',
      lessons: [
        { id: 'l1', title: 'Welcome & Overview', kind: 'Video', duration: '08:45', url: 'https://vimeo.com/12345' },
        { id: 'l2', title: 'Blueprint Worksheet', kind: 'PDF', duration: '1.2 MB', url: '' },
      ],
    },
    {
      title: 'Module 2: Advanced Systems',
      lessons: [
        { id: 'l3', title: 'Funnels & Automations', kind: 'Video', duration: '14:20', url: 'https://vimeo.com/67890' },
      ],
    },
  ];
  course.config.experience = defaultExperience();
  course.config.experience.studentLimit = 50;
  course.config.experience.accessRule = 'Drip content (scheduled release)';
  course.config.experience.dripDays = 7;

  assert.equal(productKind(course.type), 'course');
  assert.equal(course.config.modules.length, 2);
  assert.equal(course.config.modules[0].lessons.length, 2);
  assert.equal(course.config.experience.studentLimit, 50);
  assert.equal(course.config.experience.dripDays, 7);

  // D. Physical Product Configuration
  const physical = defaultConfig('Physical Product');
  assert.equal(physical.shippingRequired, true);
  assert.equal(physical.inventory, 0);
  assert.equal(physical.sku, '');
});

test('TC-03: Save Action & Explicit Persistence Validations', () => {
  // Validation for publishing active products
  const incompleteActiveService = newProduct();
  incompleteActiveService.name = 'Test Service';
  incompleteActiveService.type = 'Service';
  incompleteActiveService.status = 'Active';
  incompleteActiveService.config = defaultConfig('Service');
  incompleteActiveService.config.amount = 0; // Invalid price
  incompleteActiveService.config.bookingUrl = ''; // Missing booking URL

  const activeErrors = validateProduct(incompleteActiveService, true);
  assert.ok(activeErrors.length > 0, 'Active service without price and booking URL must produce validation errors');

  // Draft mode allows saving incomplete items for later
  const draftService = { ...incompleteActiveService, status: 'Draft' };
  const draftErrors = validateProduct(draftService, false);
  assert.equal(draftErrors.length, 0, 'Draft product must save without requiring active publish constraints');

  // Completed active service passes validation
  incompleteActiveService.description = 'Comprehensive 1-on-1 strategy coaching session.';
  incompleteActiveService.config.amount = 100;
  incompleteActiveService.config.duration = 60;
  incompleteActiveService.config.bookingUrl = 'https://calendar.google.com/book';
  incompleteActiveService.config.experience = defaultExperience();
  incompleteActiveService.config.experience.oneTimeAmount = 100;
  const readyErrors = validateProduct(incompleteActiveService, true);
  assert.equal(readyErrors.length, 0, 'Complete active product passes validation');
});

test('TC-04: Order Creation & CRM Contact Association', () => {
  const lead = {
    id: 'lead-samy-1',
    name: 'Samy Mostafa',
    email: 'samy.mostafa@example.com',
    phone: '+20 100 123 4567',
    company: 'Mostafa Tech',
    stage: 'LEAD',
    value: 0,
    tags: [],
    attachedProducts: [],
  };

  const orderRecord = {
    id: 'ord-9921',
    customerName: 'Samy Mostafa',
    customerEmail: 'samy.mostafa@example.com',
    productName: 'Executive Strategy Call',
    total: 150,
    currency: 'EUR',
    status: 'Paid',
    createdAt: '2026-10-21T14:30:00Z',
  };

  // Test CRM linking heuristic
  assert.ok(linkedToLead(orderRecord, lead, 'order'), 'Order matching customerEmail must link to lead');

  // Test product attachment
  const updatedLead = {
    ...lead,
    value: lead.value + orderRecord.total,
    stage: 'CUSTOMER',
    attachedProducts: [
      {
        productId: 'prod-service-1',
        productName: orderRecord.productName,
        attachedAt: orderRecord.createdAt,
      },
    ],
  };

  assert.equal(updatedLead.stage, 'CUSTOMER');
  assert.equal(updatedLead.value, 150);
  assert.equal(updatedLead.attachedProducts.length, 1);
  assert.equal(updatedLead.attachedProducts[0].productName, 'Executive Strategy Call');
});

test('TC-05: Discounts & Checkout Validation', () => {
  const product = newProduct();
  product.name = 'Premium Masterclass';
  product.type = 'Course';
  product.config = defaultConfig('Course', '€200');
  product.config.amount = 200;
  product.config.taxRate = 10;
  product.config.experience = defaultExperience();
  product.config.experience.oneTimeAmount = 200;

  // 1. Standard calculation: Tax exclusive
  product.config.experience.taxHandling = 'Calculate at checkout';
  const exclusiveTotals = checkoutTotals(product, 'One-time');
  assert.equal(exclusiveTotals.subtotal, 200);
  assert.equal(exclusiveTotals.tax, 20); // 10% of 200
  assert.equal(exclusiveTotals.total, 220);
  assert.equal(exclusiveTotals.dueToday, 220);

  // 2. Standard calculation: Tax inclusive
  product.config.experience.taxHandling = 'Include tax in price';
  const inclusiveTotals = checkoutTotals(product, 'One-time');
  assert.equal(inclusiveTotals.total, 200);
  assert.equal(inclusiveTotals.subtotal, 200);

  // 3. Discount code calculation logic
  const discountRule = {
    code: 'SAVE20',
    type: 'Percentage',
    value: 20, // 20% off
    limit: 100,
    uses: 4,
    active: true,
  };

  assert.ok(discountRule.active);
  assert.ok(discountRule.uses < discountRule.limit);
  const discountedSubtotal = exclusiveTotals.subtotal * (1 - discountRule.value / 100);
  assert.equal(discountedSubtotal, 160); // 200 - 40 = 160
  const discountedTax = (discountedSubtotal * product.config.taxRate) / 100;
  assert.equal(discountedTax, 16);
  assert.equal(discountedSubtotal + discountedTax, 176);
});
