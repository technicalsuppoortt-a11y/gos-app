import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import assert from 'node:assert/strict';
import { Provider } from 'react-redux';
const values=new Map();
globalThis.localStorage={ getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key) };
globalThis.window={addEventListener(){},removeEventListener(){}};
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const { UserLayout }=await server.ssrLoadModule('/src/components/layout/UserLayout.tsx');
 const { store }=await server.ssrLoadModule('/src/store/index.ts');
 const { ProductWorkspace }=await server.ssrLoadModule('/src/pages/commerce/ProductWorkspace.tsx');
 for (const [url,mode,expected] of [
  ['/dashboard/products-payments/products/new','create','Product Type Selection'],
  ['/dashboard/products-payments/products/new?type=course','create','Instructor Name'],
  ['/dashboard/products-payments/products/new?type=digital','create','Upload your files'],
  ['/dashboard/products-payments/products/new?type=service','create','Team Member / Provider'],
  ['/dashboard/products-payments/products/new?type=subscription','create','Subscriber delivery instructions'],
  ['/dashboard/products-payments/products/new?type=bundle','create','Component Products'],
  ['/dashboard/products-payments/products/ai-course','detail','Course Content'],
  ['/dashboard/products-payments/products/ai-course?tab=Pricing','detail','Pricing &amp; Offers'],
  ['/dashboard/products-payments/products/ai-course?tab=Content','detail','Course Content'],
  ['/dashboard/products-payments/products/ai-course?tab=Automation','detail','Post-purchase Automations'],
  ['/dashboard/products-payments/products/ai-course?tab=Settings','detail','Product Settings'],
  ['/dashboard/products-payments/products/ai-course?tab=access','detail','Student Limits &amp; Access'],
  ['/dashboard/products-payments/products/ai-course?tab=checkout','detail','Upsell &amp; Downsell'],
  ['/dashboard/products-payments/products/social-pack','detail','Access &amp; Download Settings'],
  ['/dashboard/products-payments/products/strategy-call','detail','Service Preview'],
  ['/dashboard/products-payments/products/strategy-call/edit','edit','Edit Details'],
  ['/dashboard/products-payments/products/strategy-call/edit?tab=checkout','edit','Custom checkout fields'],
  ['/dashboard/products-payments/products/ai-course/edit','edit','Course Title'],
  ['/dashboard/products-payments/products/strategy-call/edit?tab=booking','edit','Booking Configuration'],
  ['/dashboard/products-payments/products/social-pack/edit','edit','Compare Price (Optional)'],
  ['/dashboard/products-payments/products/social-pack/edit?tab=funnel','edit','Connected Funnel URL'],
  ['/dashboard/products-payments/products/social-pack/edit?tab=settings','edit','Sales Page URL'],
  ['/dashboard/products-payments/products/social-pack/edit?tab=content','edit','Upload your files'],
  ['/dashboard/products-payments/products/ai-course/edit?tab=content','edit','Add Module'],
  ['/dashboard/products-payments/products/gos-pro/edit?tab=pricing','edit','Trial Period'],
  ['/dashboard/products-payments/products/growth-bundle/edit?tab=components','edit','Component Products'],
  ['/dashboard/products-payments/products/ai-course/edit?tab=checkout','edit','Custom checkout fields'],
  ['/dashboard/products-payments/products/ai-course/edit?tab=settings','edit','Visibility'],
  ['/dashboard/products-payments/products/ai-course/pricing','edit','Pricing Options Preview'],
  ['/dashboard/products-payments/products/unknown','detail','Product not found']
 ]) {
   const router=createMemoryRouter([{element:createElement(UserLayout),children:[{path:'/dashboard/products-payments/products/new',element:createElement(ProductWorkspace,{mode})},{path:'/dashboard/products-payments/products/:id/pricing',element:createElement(ProductWorkspace,{mode,defaultTab:'pricing'})},{path:'/dashboard/products-payments/products/:id/edit',element:createElement(ProductWorkspace,{mode})},{path:'/dashboard/products-payments/products/:id',element:createElement(ProductWorkspace,{mode})}]}],{initialEntries:[url]});
   const html=renderToString(createElement(Provider,{store},createElement(RouterProvider,{router})));
   assert.ok(html.includes(expected),`${url} must render ${expected}`);
   const service = url.includes('type=service') || url.includes('strategy-call');
   const digitalOverview = html.includes('dw-grid');
   assert.equal((html.match(/<header class="layout-header(?:\s|")/g) ?? []).length,1, `${url} must preserve the shared header without duplicating it`);
   if (digitalOverview) {
     for (const label of ['Product Information','Digital Files','Pricing &amp; Payment','Product Images','Product Tags','Access &amp; Download Settings', 'What&#x27;s Included','Product Status','Product Details','Connected Tools','Quick Actions']) assert.ok(html.includes(label), `${url} must include ${label}`);
     assert.equal((html.match(/<nav class="cw-tabs tw-tabs"[\s\S]*?<\/nav>/)?.[0].match(/<button\b/g) ?? []).length,8);
     for (const label of ['Description formatting', 'Bold', 'Italic', 'Underline', 'Bulleted list', 'Numbered list', 'Add description link', 'Add description media', 'Quote', 'Code', 'Change product thumbnail']) assert.ok(html.includes(label), `${url} must expose ${label}`);
     assert.ok(!html.includes('tw-top-metrics'), 'Digital overview must omit extra metrics');
     assert.ok(!html.includes('cw-editor-footer'), 'Digital overview uses header save actions');
   }
   if (service && !url.includes('tab=booking') && !url.includes('tab=checkout')) {
     for (const label of ['Basic Information', 'Quick Settings', 'Booking Calendar', 'Checkout Page', 'Service Preview', 'Secure payment', 'Mastercard', 'Apple Pay', 'Google Pay']) assert.ok(html.includes(label), `${url} must include ${label}`);
     assert.ok(!html.includes('Connected Tools'), `${url} must exclude Connected Tools`);
     assert.ok(!html.includes('tw-top-metrics'), `${url} must exclude extra metrics`);
     assert.ok(!html.includes('Booking Configuration'), `${url} must keep booking configuration in its own tab`);
   }
   for (const select of html.matchAll(/<select\b[^>]*>/g)) assert.ok(select[0].includes('aria-hidden="true"'), `${url} must not render a visible native select`);
   assert.ok(!html.includes('pp-inspector'),`${url} must not render a drawer`);
   const expectedTabs = url.includes('ai-course') || url.includes('type=course') ? ['Pricing &amp; Offers','Access &amp; Students'] : url.includes('social-pack') || url.includes('type=digital') ? ['Product Information','Files &amp; Download','Pricing &amp; Payment','Checkout','Funnel &amp; Pages','Customer Access','Automation','Settings'] : url.includes('strategy-call') || url.includes('type=service') ? ['Booking','Pricing','Automation'] : [];
   for (const label of expectedTabs) assert.ok(html.includes(label),`${url} must expose ${label}`);
   if (url.endsWith('/pricing') || url.includes('tab=pricing') || url.includes('tab=Pricing')) {
     for (const label of ['Discounts &amp; Coupons','Automatic Discount','Discount Code','Tax Handling','Product Access Rules','After specific date','Add Another Discount','Add Upsell or Downsell','Payment Amount','Trial Period (Optional)','Mastercard','Apple Pay','Google Pay','Geofence Offer']) assert.ok(html.includes(label), url+' must include '+label);
   }
   console.log('PASS',url);
   router.dispose();
 }
 const model=await server.ssrLoadModule('/src/pages/commerce/model.ts');
 const forms=await server.ssrLoadModule('/src/pages/commerce/PricingForms.tsx');
 const extras=await server.ssrLoadModule('/src/pages/commerce/PricingExtras.tsx');
 const product=model.hydrateProduct({...model.newProduct(),name:'Configured course',type:'course',price:'€297'});
 const config=product.config, experience=config.experience;
 Object.assign(experience,{oneTimeAmount:297,comparePrice:497,showComparePrice:true,planEnabled:true,installmentAmount:99,recurringEnabled:true,recurringAmount:29,offersEnabled:true,upsellId:'offer-a',accessRule:'After specific date',accessDate:'2027-01-15',paymentMethods:['Visa','Mastercard']});
 const props={product,config,experience,products:[{...product,id:'offer-a',name:'Advanced templates',price:'€47'}],editing:true,update(){},configure(){},customize(){},error(){},busy(){}};
 const preview=renderToString(createElement(forms.CheckoutPreview,{...props,onCheckout(){}}));
 for (const text of ['€297','€99 / month','€29 / month','3 monthly payments','Best Value','<del>€497</del>','Mastercard']) assert.ok(preview.includes(text),'Configured preview must include '+text);
 assert.ok(!preview.includes('PayPal'),'Disabled payment methods must not appear');
 const pricing=renderToString(createElement(forms.PricingForm,props));
 assert.ok(pricing.includes('Compare Price (Optional)'));
 assert.ok(pricing.includes('Compare currency'));
 const offers=renderToString(createElement(forms.OfferSettings,props));
 for(const text of ['Advanced templates','€47','Delete upsell offer']) assert.ok(offers.includes(text));
 const access=renderToString(createElement(extras.ProductAccessRules,props));
 assert.ok(access.includes('type="date"') && access.includes('2027-01-15'));
 experience.accessRule='Drip content (scheduled release)';
 assert.ok(renderToString(createElement(extras.ProductAccessRules,props)).includes('Release interval (days)'));
 const digitalForms=await server.ssrLoadModule('/src/pages/commerce/TypeForms.tsx');
 const digitalProduct=model.hydrateProduct({...model.newProduct(), name:'Digital files fixture'});
 digitalProduct.config.assets=Array.from({length:6},(_,index)=>({name:'Resource-'+index+'.zip',url:'https://example.com/file.zip',size:1024}));
 digitalProduct.config.experience.included=Array.from({length:6},(_,index)=>({id:'feature-'+index,title:'Feature '+index,enabled:true}));
 const digitalProps={...props,product:digitalProduct,config:digitalProduct.config,experience:digitalProduct.config.experience,compact:true,paginate:false};
 const digitalFiles=renderToString(createElement(digitalForms.DigitalFiles,digitalProps));
 const digitalIncluded=renderToString(createElement(digitalForms.IncludedItems,digitalProps));
 for(let index=0;index<6;index++){assert.ok(digitalFiles.includes('Resource-'+index+'.zip'));assert.ok(digitalIncluded.includes('Feature '+index));}
 assert.ok(!digitalFiles.includes('Next files'));assert.ok(!digitalIncluded.includes('Next included items'));
 assert.ok(digitalFiles.includes('dw-file-zip'));assert.ok(digitalFiles.includes('1 KB'));
 console.log('PASS natural digital lists retain every file and included item');
 console.log('PASS configured pricing tiers, compare currency, payment badges, offer rows and access schedules');
} finally { await server.close(); }
