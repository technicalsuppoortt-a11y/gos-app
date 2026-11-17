import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { captureForms } from '../functions/lead-capture.js';

function loadTS(relPath, mocks = {}, extraGlobals = {}) {
  const source = fs.readFileSync(new URL(relPath, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  const moduleObj = { exports };
  const fn = vm.runInThisContext(
    `(function(exports, module, require, extra) {
      const window = extra.window ?? globalThis.window;
      const document = extra.document ?? globalThis.document;
      const CSS = extra.CSS ?? globalThis.CSS;
      ${code}
    })`
  );
  fn(
    exports,
    moduleObj,
    id => {
      if (!(id in mocks)) throw new Error(`Unexpected import ${id} in ${relPath}`);
      return mocks[id];
    },
    extraGlobals
  );
  return moduleObj.exports;
}

const systemeModel = loadTS('../src/pages/funnel-systeme-model.ts');
const firestoreCodec = loadTS('../src/backend/firestoreCodec.ts');

test('1. Create Funnel Goal Types: Sell, Build an Audience, and Custom (EN & AR)', () => {
  const sellEn = systemeModel.createSystemeFunnelAsset({
    name: 'Course Launch Funnel',
    domain: 'sales.example.com',
    currency: 'USD',
    goalType: 'sell',
    arabic: false,
  });
  assert.equal(sellEn.kind, 'funnel');
  assert.equal(sellEn.domain, 'sales.example.com');
  assert.equal(sellEn.currency, 'USD');
  assert.equal(sellEn.document.funnel.currency, 'USD');
  assert.equal(sellEn.document.funnel.goalType, 'sell');
  assert.equal(sellEn.document.pages.length, 2);
  assert.equal(sellEn.document.steps.length, 2);
  assert.equal(sellEn.document.pages[0].stepCategory, 'Order Form');
  assert.equal(sellEn.document.pages[1].stepCategory, 'Thank You');
  assert.ok(sellEn.document.inactivePage, 'Fallback Inactive Page is created');
  assert.equal(sellEn.document.pages[0].templateSelected, false);

  const sellAr = systemeModel.createSystemeFunnelAsset({
    name: 'مسار بيع الكورس',
    domain: '',
    currency: 'SAR',
    goalType: 'sell',
    arabic: true,
  });
  assert.equal(sellAr.currency, 'SAR');
  assert.equal(sellAr.document.pages.length, 2);
  assert.equal(sellAr.document.pages[0].name, 'نموذج الطلب');
  assert.equal(sellAr.document.pages[1].name, 'صفحة الشكر');

  const audienceEn = systemeModel.createSystemeFunnelAsset({
    name: 'Newsletter Growth',
    domain: '',
    currency: 'EUR',
    goalType: 'audience',
    arabic: false,
  });
  assert.equal(audienceEn.document.pages.length, 2);
  assert.equal(audienceEn.document.pages[0].stepCategory, 'Opt-in');
  assert.equal(audienceEn.document.pages[1].stepCategory, 'Thank You');

  const audienceAr = systemeModel.createSystemeFunnelAsset({
    name: 'قائمة بريدية',
    domain: '',
    currency: 'EGP',
    goalType: 'audience',
    arabic: true,
  });
  assert.equal(audienceAr.document.pages[0].name, 'صفحة الاشتراك');
  assert.match(audienceAr.document.pages[1].name, /صفحة الشكر/);

  const customFunnel = systemeModel.createSystemeFunnelAsset({
    name: 'Custom Scratch Funnel',
    domain: '',
    currency: 'GBP',
    goalType: 'custom',
    arabic: false,
  });
  assert.equal(customFunnel.document.pages.length, 0);
  assert.equal(customFunnel.document.steps.length, 0);
  assert.deepEqual(customFunnel.document.funnel.pagesFlow, []);
  assert.ok(customFunnel.document.inactivePage, 'Custom funnel still includes Inactive Page fallback');
});

test('2. Superadmin Global Templates Library: Firestore CRUD + Non-Destructive Deep Clone', async () => {
  const firestoreStore = new Map();
  const mockFirestore = {
    collection: (_db, name) => ({ name }),
    doc: (_db, col, id) => `${col}/${id}`,
    setDoc: async (ref, payload) => {
      firestoreStore.set(ref, structuredClone(payload));
    },
    deleteDoc: async ref => {
      firestoreStore.delete(ref);
    },
    onSnapshot: () => () => {},
    serverTimestamp: () => 'SERVER_TS',
  };

  const globalTemplatesMod = loadTS('../src/backend/globalFunnelTemplates.ts', {
    react: { useEffect: () => {}, useMemo: fn => fn(), useState: init => [typeof init === 'function' ? init() : init, () => {}] },
    'firebase/firestore': mockFirestore,
    './firebase': {
      db: {},
      primaryDb: {},
      primaryAuth: { currentUser: { getIdTokenResult: async () => ({ claims: { role: 'SUPER_ADMIN' } }) } },
      backendError: err => String(err),
    },
    './firestoreCodec': firestoreCodec,
    '../store': { store: { getState: () => ({ auth: { role: 'SUPER_ADMIN', user: { id: 'sa-1' } } }) } },
    '../i18n/display': { useUILanguage: () => 'en' },
  });

  // Seed starter templates into simulated global_funnel_templates collection
  const seededCount = await globalTemplatesMod.seedGlobalFunnelTemplatesToFirestore();
  assert.ok(seededCount >= 8, 'Seeds bilingual starter templates across all categories');
  assert.equal(firestoreStore.size, seededCount);

  for (const category of ['Opt-in', 'Sales', 'Order Form', 'Thank You']) {
    const hasCategory = Array.from(firestoreStore.values()).some(doc => doc.category === category);
    assert.equal(hasCategory, true, `Category ${category} exists in global_funnel_templates`);
  }

  // Create and save a custom Superadmin template with nested columns
  const customTpl = globalTemplatesMod.createBlankGlobalFunnelTemplate('Order Form');
  customTpl.id = 'sa-custom-order-1';
  customTpl.title_en = 'VIP Coaching Checkout';
  customTpl.title_ar = 'نموذج طلب التدريب المتقدم';
  customTpl.page_en.sections.push({
    id: 'cols-nested',
    type: 'Columns',
    content: { columns: '2', gap: '16' },
    styles: customTpl.page_en.sections[0].styles,
    children: [
      [
        {
          id: 'nested-btn',
          type: 'Button',
          content: { button: 'Complete Order', destinationType: 'Next Step', destination: '' },
          styles: customTpl.page_en.sections[0].styles,
        },
      ],
      [],
    ],
  });

  await globalTemplatesMod.saveGlobalFunnelTemplate(customTpl);
  const rawStored = firestoreStore.get('global_funnel_templates/sa-custom-order-1');
  assert.ok(rawStored, 'Saved to global_funnel_templates/{id}');

  // Verify nested arrays were encoded safely for Firestore and round-trip cleanly
  const decoded = firestoreCodec.decodeFirestoreValue(rawStored);
  assert.equal(decoded.page_en.sections.at(-1).children[0][0].type, 'Button');

  // Verify non-destructive deep clone into a user's funnel step
  const userFunnel = systemeModel.createSystemeFunnelAsset({
    name: 'User Funnel',
    domain: '',
    currency: 'USD',
    goalType: 'sell',
    arabic: false,
  });
  const step1 = userFunnel.document.pages[0];
  const step2 = userFunnel.document.pages[1];
  step1.crmRouting = { pipelineId: 'sales-pipe', stageId: 'CHECKOUT_STAGE' };

  const clonedStep = systemeModel.cloneTemplateIntoStep(step1, decoded.page_en, step2.id);
  assert.equal(clonedStep.id, step1.id, 'Preserves user step ID');
  assert.equal(clonedStep.name, step1.name, 'Preserves user step name');
  assert.equal(clonedStep.path, step1.path, 'Preserves user URL slug');
  assert.deepEqual(clonedStep.crmRouting, { pipelineId: 'sales-pipe', stageId: 'CHECKOUT_STAGE' });
  assert.equal(clonedStep.templateSelected, true);

  // Section IDs must be freshly generated so multiple steps never collide
  assert.notEqual(clonedStep.sections[0].id, decoded.page_en.sections[0].id);

  // Next Step button inside nested column must point to user's step2.id
  const clonedNestedBtn = clonedStep.sections.at(-1).children[0][0];
  assert.equal(clonedNestedBtn.content.destination, step2.id);

  // Mutating the user's cloned step MUST NOT mutate the Superadmin template
  clonedStep.sections[0].content.title = 'MUTATED BY USER';
  assert.notEqual(decoded.page_en.sections[0].content.title, 'MUTATED BY USER');
});

test('3. Conditional Funnel CRM Routing & Per-Element Website CRM Lead Routing', () => {
  const audience = systemeModel.createSystemeFunnelAsset({
    name: 'Lead Magnet Funnel',
    domain: '',
    currency: 'USD',
    goalType: 'audience',
    arabic: false,
  });
  const optinStep = audience.document.pages[0];
  const thankYouStep = audience.document.pages[1];

  // Opt-in step has a Form -> CRM routing is shown; Thank You step has no Form/Calendar -> hidden!
  assert.equal(systemeModel.hasLeadCaptureElement(optinStep), true);
  assert.equal(systemeModel.hasLeadCaptureElement(thankYouStep), false);

  // Website page with BOTH a Form AND a Booking Calendar, each with its own independent CRM route
  const websitePage = {
    id: 'home-page',
    name: 'Home',
    path: '/',
    showHeader: true,
    showFooter: true,
    sections: [
      {
        id: 'lead-form-1',
        type: 'Form',
        content: {
          title: 'Request Brochure',
          crmPipelineId: 'pipeline-marketing',
          crmStageId: 'BROCHURE_REQUESTED',
        },
        styles: optinStep.sections[0].styles,
      },
      {
        id: 'vip-calendar-1',
        type: 'Booking',
        content: {
          title: 'Book Strategy Call',
          crmPipelineId: 'pipeline-enterprise',
          crmStageId: 'DISCOVERY_CALL_BOOKED',
        },
        styles: optinStep.sections[0].styles,
      },
      {
        id: 'partner-form-2',
        type: 'Contact Form',
        content: {
          title: 'Partner Application',
          crmPipelineId: 'pipeline-partners',
          crmStageId: 'PARTNER_APPLIED',
        },
        styles: optinStep.sections[0].styles,
      },
    ],
  };

  const leadElements = systemeModel.listPageLeadCaptureElements(websitePage);
  assert.equal(leadElements.length, 3);
  assert.deepEqual(leadElements[0].crmRouting, {
    pipelineId: 'pipeline-marketing',
    stageId: 'BROCHURE_REQUESTED',
  });
  assert.deepEqual(leadElements[1].crmRouting, {
    pipelineId: 'pipeline-enterprise',
    stageId: 'DISCOVERY_CALL_BOOKED',
  });
  assert.deepEqual(leadElements[2].crmRouting, {
    pipelineId: 'pipeline-partners',
    stageId: 'PARTNER_APPLIED',
  });

  // Backend captureForms extracts per-form CRM routing independently
  const extractedForms = captureForms({ pages: [websitePage] });
  assert.equal(extractedForms.length, 2);
  assert.equal(extractedForms[0].formId, 'lead-form-1');
  assert.deepEqual(extractedForms[0].crmRouting, {
    pipelineId: 'pipeline-marketing',
    stageId: 'BROCHURE_REQUESTED',
  });
  assert.equal(extractedForms[1].formId, 'partner-form-2');
  assert.deepEqual(extractedForms[1].crmRouting, {
    pipelineId: 'pipeline-partners',
    stageId: 'PARTNER_APPLIED',
  });
});

test('4. Page Builder Button Actions Upgrade: All Action Types Execute Correctly', () => {
  const openedTabs = [];
  const assignedUrls = [];
  const clickedDownloads = [];
  let scrolledId = '';
  let submittedForm = false;

  const mockWindow = {
    location: {
      origin: 'https://funnel.upklick.app',
      href: 'https://funnel.upklick.app/opt-in',
      assign: url => assignedUrls.push(url),
    },
    open: (url, target) => openedTabs.push({ url, target }),
  };

  const mockForm = {
    scrollIntoView: () => {},
    requestSubmit: () => {
      submittedForm = true;
    },
  };

  const mockDocument = {
    body: {
      querySelector: () => mockForm,
      appendChild: () => {},
    },
    querySelector: sel =>
      sel.includes('pricing-sec')
        ? {
            scrollIntoView: () => {
              scrolledId = 'pricing-sec';
            },
          }
        : mockForm,
    getElementById: id => ({
      scrollIntoView: () => {
        scrolledId = id;
      },
    }),
    createElement: tag => {
      assert.equal(tag, 'a');
      const a = { href: '', download: '', target: '', rel: '', click: () => clickedDownloads.push({ href: a.href, download: a.download }), remove: () => {} };
      return a;
    },
  };

  const buttonMod = loadTS(
    '../src/pages/button-actions.tsx',
    {
      react: { useState: init => [init, () => {}] },
      'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: 'Fragment' },
      'lucide-react': { X: () => null, ArrowRight: () => null, Download: () => null, CheckCircle2: () => null, ShieldCheck: () => null },
      './AssetControls': { AssetSelect: () => null },
      '../i18n/display': { useUILanguage: () => 'en', translateText: s => s, localizeNode: n => n },
      '../utils/toast': { showToast: { info: () => {}, error: () => {}, success: () => {} } },
    },
    {
      window: mockWindow,
      document: mockDocument,
      CSS: { escape: s => s },
    }
  );

  const actionValues = buttonMod.getButtonActionOptions().map(o => o.value);
  for (const expected of [
    'Next Step',
    'Specific Page',
    'External URL',
    'Submit Form',
    'Scroll to Section',
    'Open Popup',
    'Download File',
    'Phone Call',
    'Send Email',
  ]) {
    assert.ok(actionValues.includes(expected), `Button action option "${expected}" is registered`);
  }

  let navigatedTo = '';
  let openedPopup = null;
  const env = {
    currentPageId: 'step-1',
    pagesFlow: ['step-1', 'step-2', 'step-3'],
    pages: [{ id: 'step-1' }, { id: 'step-2' }, { id: 'step-3' }],
    onNavigatePage: id => {
      navigatedTo = id;
    },
    onOpenPopup: item => {
      openedPopup = item.id;
    },
  };

  // 1) Go to Next Funnel Step
  buttonMod.executeButtonAction({ id: 'b1', type: 'Button', content: { destinationType: 'Next Step' }, styles: {} }, env);
  assert.equal(navigatedTo, 'step-2');

  // 2) Go to Specific Page / Step
  buttonMod.executeButtonAction({ id: 'b2', type: 'Button', content: { destinationType: 'Specific Page', destination: 'step-3' }, styles: {} }, env);
  assert.equal(navigatedTo, 'step-3');

  // 3) External URL (new tab + same tab)
  buttonMod.executeButtonAction({ id: 'b3', type: 'Button', content: { destinationType: 'External URL', destination: 'https://stripe.com', openInNewTab: 'true' }, styles: {} }, env);
  assert.equal(openedTabs.at(-1).url, 'https://stripe.com/');
  buttonMod.executeButtonAction({ id: 'b3b', type: 'Button', content: { destinationType: 'External URL', destination: 'https://upklick.com', openInNewTab: 'false' }, styles: {} }, env);
  assert.equal(assignedUrls.at(-1), 'https://upklick.com/');

  // 4) Submit Form / Trigger Order
  buttonMod.executeButtonAction({ id: 'b4', type: 'Button', content: { destinationType: 'Submit Form' }, styles: {} }, env);
  assert.equal(submittedForm, true);

  // 5) Scroll to Section
  buttonMod.executeButtonAction({ id: 'b5', type: 'Button', content: { destinationType: 'Scroll to Section', destination: '#pricing-sec' }, styles: {} }, env);
  assert.equal(scrolledId, 'pricing-sec');

  // 6) Open Popup / Modal
  buttonMod.executeButtonAction({ id: 'b6', type: 'Button', content: { destinationType: 'Open Popup', popupSource: 'inline-lead' }, styles: {} }, env);
  assert.equal(openedPopup, 'b6');

  // 7) Download File / Phone / Email
  buttonMod.executeButtonAction({ id: 'b7', type: 'Button', content: { destinationType: 'Download File', destination: 'https://cdn.example.com/ebook.pdf', downloadFilename: 'guide.pdf' }, styles: {} }, env);
  assert.deepEqual(clickedDownloads.at(-1), { href: 'https://cdn.example.com/ebook.pdf', download: 'guide.pdf' });

  buttonMod.executeButtonAction({ id: 'b8', type: 'Button', content: { destinationType: 'Phone Call', destination: '+20 100 222 3333' }, styles: {} }, env);
  assert.equal(mockWindow.location.href, 'tel:+201002223333');

  buttonMod.executeButtonAction({ id: 'b9', type: 'Button', content: { destinationType: 'Send Email', destination: 'vip@example.com', emailSubject: 'Hello Team' }, styles: {} }, env);
  assert.equal(mockWindow.location.href, 'mailto:vip@example.com?subject=Hello%20Team');
});

test('5. Flagship Multi-Step Funnel Templates (Sell & Build an Audience): Pre-Linked Steps, EN/AR Copy & Western Digits (0-9)', async () => {
  const { buildTemplateDesigns } = await import('../functions/seed-data/build-template-designs.mjs');
  const seedRecords = JSON.parse(
    fs.readFileSync(new URL('../functions/seed-data/system-templates.json', import.meta.url), 'utf8')
  );
  const arMeta = JSON.parse(
    fs.readFileSync(new URL('../functions/seed-data/template-metadata-ar.json', import.meta.url), 'utf8')
  );
  const easternDigitRegex = /[٠-٩۰-۹]/;

  const sellTpl = seedRecords.find(r => r.id === 'upklick-funnel-flagship-sell');
  const audTpl = seedRecords.find(r => r.id === 'upklick-funnel-flagship-audience');
  assert.ok(sellTpl, 'Flagship Sell Funnel exists in system-templates.json');
  assert.ok(audTpl, 'Flagship Audience Funnel exists in system-templates.json');

  // Verify pre-linked multi-step Sell Funnel (Sales -> Order Form -> Thank You)
  assert.equal(sellTpl.category, 'Funnels');
  assert.equal(sellTpl.builderDocument.pages.length, 3);
  assert.equal(sellTpl.builderDocument.steps.length, 3);
  const [sellOffer, sellOrder, sellThanks] = sellTpl.builderDocument.pages;
  assert.ok(
    JSON.stringify(sellOffer.sections).includes(sellOrder.id),
    'Sell Offer Page links directly to Order Form step'
  );
  assert.ok(
    JSON.stringify(sellOrder.sections).includes(sellThanks.id),
    'Sell Order Form links directly to Thank You step'
  );

  // Verify pre-linked multi-step Audience Funnel (Opt-in -> Thank You)
  assert.equal(audTpl.category, 'Funnels');
  assert.equal(audTpl.builderDocument.pages.length, 2);
  assert.equal(audTpl.builderDocument.steps.length, 2);
  const [audOptin, audThanks] = audTpl.builderDocument.pages;
  assert.ok(
    JSON.stringify(audOptin.sections).includes(audThanks.id),
    'Audience Opt-in Page links directly to Thank You step'
  );

  // Verify EN & AR localized designs and Western digits (0-9)
  for (const id of ['upklick-funnel-flagship-sell', 'upklick-funnel-flagship-audience']) {
    assert.ok(arMeta[id]?.title_ar, `Arabic metadata exists for ${id}`);
    const designs = buildTemplateDesigns(id);
    assert.ok(designs.design_en?.html.includes('class="page"'));
    assert.ok(/[ء-ي]/.test(designs.design_ar?.html || ''));
    assert.equal(
      easternDigitRegex.test(designs.design_ar.html),
      false,
      `${id} Arabic design uses strictly Western digits (0-9)`
    );
    assert.equal(
      easternDigitRegex.test(JSON.stringify(arMeta[id])),
      false,
      `${id} Arabic metadata uses strictly Western digits (0-9)`
    );
  }
});

test('6. Upgraded 10 Bilingual Step Templates & AI Funnel Architect Multi-Step Pipeline (EN/AR + Western Digits)', async () => {
  const easternDigitRegex = /[٠-٩۰-۹]/;
  const currencyMod = loadTS('../src/utils/currency.ts');

  const globalTemplatesMod = loadTS('../src/backend/globalFunnelTemplates.ts', {
    react: { useEffect: () => {}, useMemo: fn => fn(), useState: init => [typeof init === 'function' ? init() : init, () => {}] },
    'firebase/firestore': {
      collection: () => ({}),
      doc: () => ({}),
      setDoc: async () => {},
      deleteDoc: async () => {},
      onSnapshot: () => () => {},
      serverTimestamp: () => 'TS',
    },
    './firebase': { db: {}, primaryDb: {}, primaryAuth: {}, backendError: e => String(e) },
    './firestoreCodec': firestoreCodec,
    '../store': { store: { getState: () => ({ auth: {} }) } },
    '../i18n/display': { useUILanguage: () => 'en' },
  });

  const builtins = globalTemplatesMod.BUILTIN_GLOBAL_FUNNEL_TEMPLATES;
  assert.equal(builtins.length, 10, 'Exactly 10 upgraded bilingual step templates exist');
  for (const tpl of builtins) {
    assert.equal(tpl.schemaVersion, 3);
    assert.ok(tpl.title_en.length > 5 && tpl.title_ar.length > 5);
    assert.ok(tpl.page_en.sections.length >= 3, `${tpl.id} EN has rich conversion sections`);
    assert.ok(tpl.page_ar.sections.length >= 3, `${tpl.id} AR has rich conversion sections`);
    const enStr = JSON.stringify(tpl.page_en);
    const arStr = JSON.stringify(tpl.page_ar);
    assert.equal(enStr.includes('"lead-capture"'), false, `${tpl.id} EN avoids legacy fitness lead-capture layout`);
    assert.equal(arStr.includes('"lead-capture"'), false, `${tpl.id} AR avoids legacy fitness lead-capture layout`);
    assert.equal(
      easternDigitRegex.test(arStr),
      false,
      `${tpl.id} AR step template renders all numbers in Western digits (0-9)`
    );
    // Every Stats item must begin with a compact Western-digit token so number/label split cleanly
    for (const pg of [tpl.page_en, tpl.page_ar]) {
      for (const s of pg.sections) {
        if (s.type === 'Stats' && s.content?.items) {
          for (const part of s.content.items.split('·')) {
            const firstToken = part.trim().split(' ')[0];
            assert.ok(/\d/.test(firstToken), `${tpl.id} stat token "${firstToken}" starts with Western numerals`);
          }
        }
      }
    }
  }

  const aiArchitectMod = loadTS(
    '../src/backend/aiFunnelArchitect.ts',
    {
      './gosApi': { gosApi: { copilot: async () => ({ text: '' }) } },
      './aiBuilders': { generateBuilderDraft: async () => null },
      '../utils/currency': currencyMod,
      '../pages/funnel-systeme-model': systemeModel,
    },
    { window: { sessionStorage: { getItem: () => '1' }, location: { search: '?account-demo' } } }
  );

  // Arabic Sale Funnel with Eastern-Arabic price input ('١٩٧') -> normalized to Western '197'
  const arSaleAsset = await aiArchitectMod.generateAIFunnelAsset({
    funnelName: 'مسار بيع الأكاديمية',
    businessName: 'أكاديمية رواد النمو',
    niche: 'الدورات التدريبية والاستشارات',
    goal: 'sale',
    audienceAndPainPoints: 'المدربون وصناع المحتوى الراغبون في مضاعفة المبيعات الشهرية',
    offer: 'البرنامج المتكامل لإطلاق الكورسات الرقمية',
    price: '١٩٧',
    currency: 'SAR',
    language: 'ar',
    tone: 'persuasive',
  });

  assert.equal(arSaleAsset.kind, 'funnel');
  assert.equal(arSaleAsset.currency, 'SAR');
  assert.equal(arSaleAsset.document.pages.length, 3, 'Sale AI funnel generates 3 pre-linked steps');
  assert.equal(arSaleAsset.document.pages[0].stepCategory, 'Sales');
  assert.equal(arSaleAsset.document.pages[1].stepCategory, 'Order Form');
  assert.equal(arSaleAsset.document.pages[2].stepCategory, 'Thank You');
  assert.ok(arSaleAsset.document.pages.every(p => p.templateSelected === true));
  const arJson = JSON.stringify(arSaleAsset);
  assert.equal(easternDigitRegex.test(arJson), false, 'All Arabic AI funnel digits are Western 0-9');
  assert.ok(arJson.includes('197 SAR'), 'Eastern digits ١٩٧ normalized to Western 197 SAR');

  // English Audience Funnel (2 pre-linked steps) + Booking Funnel (3 pre-linked steps)
  const enAudienceAsset = await aiArchitectMod.generateAIFunnelAsset({
    businessName: 'MetricPulse SaaS',
    niche: 'B2B SaaS Analytics',
    goal: 'audience',
    audienceAndPainPoints: 'SaaS founders losing trial signups due to leaky onboarding',
    offer: '2026 SaaS Activation & Onboarding Playbook',
    currency: 'USD',
    language: 'en',
    tone: 'executive',
  });
  assert.equal(enAudienceAsset.document.pages.length, 2);
  assert.equal(enAudienceAsset.document.pages[0].stepCategory, 'Opt-in');
  assert.equal(enAudienceAsset.document.pages[1].stepCategory, 'Thank You');

  const enBookingAsset = await aiArchitectMod.generateAIFunnelAsset({
    businessName: 'Apex Dental Studio',
    niche: 'Cosmetic Dentistry Clinic',
    goal: 'booking',
    audienceAndPainPoints: 'Busy professionals wanting a confident smile makeover consultation',
    offer: '3D Digital Smile Design Strategy Consultation',
    price: '49',
    currency: 'USD',
    language: 'en',
    tone: 'friendly',
  });
  assert.equal(enBookingAsset.document.pages.length, 3);
  assert.ok(JSON.stringify(enBookingAsset.document.pages[1].sections).includes('"type":"Booking"'));
});
