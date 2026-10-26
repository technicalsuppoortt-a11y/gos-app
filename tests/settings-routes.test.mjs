import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import assert from 'node:assert/strict';
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { store } = await server.ssrLoadModule('/src/store/index.ts');
  const { loginSuccess } = await server.ssrLoadModule('/src/store/slices/authSlice.ts');
  const { UserLayout } = await server.ssrLoadModule('/src/components/layout/UserLayout.tsx');
  const { SettingsWorkspace } = await server.ssrLoadModule('/src/pages/settings/SettingsWorkspace.tsx');
  const { readSettings, settingsKey, settingsRequest, safeExternalUrl } = await server.ssrLoadModule('/src/pages/settings/data.ts');
  const names = ['Profile', 'Business', 'Team &amp; roles', 'Knowledge', 'Tools', 'Integrations', 'Billing &amp; Payments', 'Security'];
  const routes = [['','Profile Settings'],['business','Business identity'],['profile','Profile Preview'],['billing','Recent Transactions'],['integrations','WhatsApp Business'],['payments','Payment preferences'],['security','Two-factor authentication'],['team','Team members'],['knowledge','Knowledge library'],['tools','Create conversion funnels'],['billing-wallet','Usage Overview'],['team-roles','Team members']];
  for (const [path, expected] of routes) {
    const router = createMemoryRouter([{path:'/dashboard',element:createElement(UserLayout),children:[{path:'settings/*',element:createElement(SettingsWorkspace)},{path:'integrations',element:createElement(SettingsWorkspace)}]}],{initialEntries:[`/dashboard/settings/${path}`]});
    const html = renderToString(createElement(Provider,{store},createElement(RouterProvider,{router})));
    assert.ok(html.includes(expected),`${path} renders ${expected}`);
    const nav = html.match(/<nav[^>]*aria-label="Settings navigation">([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav);
    assert.ok(!html.includes('class="st-page-heading"'), 'Redundant Settings banner is absent in every view');
    assert.ok(!html.includes('Manage your account, business, integrations and payments.'), 'Duplicate banner copy is removed');
    assert.ok(!html.includes('class="st-navigation"'), 'Settings navigation is absent from page content');
    assert.ok(!html.includes('href="/dashboard/templates"'), 'No global Templates sidebar link');
    assert.deepEqual([...nav.matchAll(/<span>(.*?)<\/span>/g)].map(m=>m[1]),names,'Preserve exact menu labels and order');
    assert.equal((nav.match(/layout-settings-link is-active/g) ?? []).length,1,'Exactly one settings tab active');
    if (path==='profile') {
      for (const label of ['Profile Photo','Change Photo','Remove','Personal Information','Full Name','Email Address','Phone Number','Language','Timezone','Date Format','Email Notifications','Marketing Updates','Appearance Mode','Account Overview','Member Since','Delete Account','Save Changes','Instagram','Facebook','YouTube','LinkedIn','Book a Call']) assert.ok(html.includes(label),`Profile has ${label}`);
      assert.equal((html.match(/role="switch"/g)??[]).length,3);
    }
    if (path==='team') {
      assert.ok(html.includes('Team members pagination'));
      assert.ok(html.includes('Team members rows per page'));
      assert.ok(html.includes('Previous') && html.includes('Next'));
      assert.ok(html.includes('aria-label="Search team members"'));
    }
    if (path==='billing') {
      for (const label of ['€47.80','Upclick Pro','Subscription','Wallet','Usage','Transactions','WhatsApp','Email','AI Follow-Up','Other Services','Payment Methods','Auto Recharge','VISA','PayPal','Bank Transfer','Date','Type','Description','Service','Amount','Balance']) assert.ok(html.includes(label),`Billing has ${label}`);
      assert.ok(html.includes('Preview data'),'Reference wallet values are identified as preview data');
    }
    if (path==='integrations') {
      assert.equal((html.match(/st-integration-card/g)??[]).length,11);
      assert.ok(!html.includes('st-badge green'),'No provider is falsely connected');
    }
    router.dispose();console.log(`PASS ${path}`);
  }
  store.dispatch(loginSuccess({user:{id:'a',name:'Alice',email:'a@example.com'},role:'USER',tenant:{id:'tenant-a',name:'A'},token:'test'}));
  const first = readSettings();first.profile.name='Saved A';localStorage.setItem(settingsKey(),JSON.stringify(first));assert.equal(readSettings().profile.name,'Saved A');
  store.dispatch(loginSuccess({user:{id:'a',name:'Alice',email:'a@example.com'},role:'USER',tenant:{id:'tenant-b',name:'B'},token:'test'}));
  assert.equal(readSettings().profile.name,'Alice','Tenant settings stay isolated');
  localStorage.setItem(settingsKey(),'{invalid');assert.equal(readSettings().profile.name,'Alice','Corrupt storage recovers');
  await assert.rejects(settingsRequest('/billing/checkout',{amount:50}),/not connected yet/,'Unavailable backend must not create fake charges or credits');
  assert.throws(()=>safeExternalUrl('javascript:alert(1)'),/invalid link/);assert.throws(()=>safeExternalUrl('http://example.com'),/invalid link/);assert.equal(safeExternalUrl('https://example.com/pay'),'https://example.com/pay');
  const { saveLocal } = await server.ssrLoadModule('/src/pages/settings/localState.ts');
  const members = Array.from({length:42},(_,index)=>({id:'member-'+index,name:'Test Member '+index,email:'member'+index+'@example.com',role:'Member',active:true,permissions:['home']}));
  saveLocal('team',{members,audit:[]});
  const teamRouter=createMemoryRouter([{path:'/dashboard/settings/team',element:createElement(SettingsWorkspace)}],{initialEntries:['/dashboard/settings/team']});
  const teamHtml=renderToString(createElement(Provider,{store},createElement(RouterProvider,{router:teamRouter}))).replace(/<!--.*?-->/g,'');
  const body=teamHtml.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
  assert.equal((body.match(/<tr>/g)??[]).length,10,'Team table renders ten of 42 records');
  assert.ok(teamHtml.includes('Showing 1–10 of 42 members'));
  assert.ok(!body.includes('Test Member 10'),'Next-page members are excluded');
  for(const size of [10,25,50]) assert.ok(teamHtml.includes('value="'+size+'"'),'Rows option '+size);
  teamRouter.dispose();
  const { TeamPagination }=await server.ssrLoadModule('/src/pages/settings/TeamPagination.tsx');
  const { paginationRange }=await server.ssrLoadModule('/src/pages/commerce/pagination-model.ts');
  for(const [total,size,page,text,disabled] of [[42,10,4,'Showing 41–42 of 42 members',1],[42,25,1,'Showing 26–42 of 42 members',1],[0,50,8,'Showing 0–0 of 0 members',2],[10,10,8,'Showing 1–10 of 10 members',2]]){
    const pagination={...paginationRange(total,size,page),pageSize:size,setPage(){},setPageSize(){}};
    const html=renderToString(createElement(TeamPagination,{pagination})).replace(/<!--.*?-->/g,'');
    assert.ok(html.includes(text));assert.equal((html.match(/disabled=""/g)??[]).length,disabled);
  }
  console.log('PASS team page size, range, final and empty pages, deletion clamping, and navigation boundaries');
  console.log('PASS tenant isolation, saved preferences, corrupt storage recovery, unavailable services, safe provider URLs');
} finally { await server.close(); }
