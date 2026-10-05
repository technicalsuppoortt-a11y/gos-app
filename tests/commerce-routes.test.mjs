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
  ['/dashboard/products-payments/products/ai-course/edit','edit','Course Title'],
  ['/dashboard/products-payments/products/strategy-call/edit?tab=booking','edit','Booking Configuration'],
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
   assert.ok(!html.includes('class="layout-header'),`${url} must exclude the global header`);
   for (const select of html.matchAll(/<select\b[^>]*>/g)) assert.ok(select[0].includes('aria-hidden="true"'), `${url} must not render a visible native select`);
   assert.ok(!html.includes('pp-inspector'),`${url} must not render a drawer`);
   const expectedTabs = url.includes('ai-course') || url.includes('type=course') ? ['Pricing &amp; Offers','Access &amp; Students'] : url.includes('social-pack') || url.includes('type=digital') ? ['Files &amp; Download','Pricing &amp; Payment','Customer Access'] : url.includes('strategy-call') || url.includes('type=service') ? ['Booking','Pricing','Automation'] : [];
   for (const label of expectedTabs) assert.ok(html.includes(label),`${url} must expose ${label}`);
   if (url.endsWith('/pricing') || url.includes('tab=pricing') || url.includes('tab=Pricing')) {
     for (const label of ['Discounts &amp; Coupons','Automatic Discount','Discount Code','Tax Handling','Product Access Rules','After specific date','Add Another Discount','Add Upsell or Downsell','Payment Amount','Trial Period (Optional)','Mastercard','Apple Pay']) assert.ok(html.includes(label), url+' must include '+label);
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
 for (const text of ['€297','€99 / month','€29 / month','3 monthly payments','Most Popular','<del>€497</del>','Mastercard']) assert.ok(preview.includes(text),'Configured preview must include '+text);
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
 console.log('PASS configured pricing tiers, compare currency, payment badges, offer rows and access schedules');
} finally { await server.close(); }
