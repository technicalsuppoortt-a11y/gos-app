import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import assert from 'node:assert/strict';
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
globalThis.window = { addEventListener() {}, removeEventListener() {} };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { store } = await server.ssrLoadModule('/src/store/index.ts');
  const { loginSuccess } = await server.ssrLoadModule('/src/store/slices/authSlice.ts');
  const { SettingsWorkspace } = await server.ssrLoadModule('/src/pages/settings/SettingsWorkspace.tsx');
  const { readSettings, settingsKey, settingsRequest, safeExternalUrl } = await server.ssrLoadModule('/src/pages/settings/data.ts');
  const names = ['Profile', 'Business', 'Team &amp; roles', 'Knowledge', 'Tools', 'Integrations', 'Payments', 'Billing &amp; Wallet', 'Security'];
  const routes = [['','Profile Settings'],['business','Business identity'],['profile','Profile Preview'],['billing','Recent Transactions'],['integrations','WhatsApp Business'],['payments','Payment preferences'],['security','Two-factor authentication'],['team','Team members'],['knowledge','Open Knowledge Center'],['tools','Create conversion funnels'],['billing-wallet','Usage Overview'],['team-roles','Team members']];
  for (const [path, expected] of routes) {
    const router = createMemoryRouter([{path:'/dashboard/settings/*',element:createElement(SettingsWorkspace)},{path:'/dashboard/integrations',element:createElement(SettingsWorkspace)}],{initialEntries:[`/dashboard/settings/${path}`]});
    const html = renderToString(createElement(Provider,{store},createElement(RouterProvider,{router})));
    assert.ok(html.includes(expected),`${path} renders ${expected}`);
    const nav = html.match(/<nav aria-label="Settings navigation">([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav);
    assert.deepEqual([...nav.matchAll(/<b>(.*?)<\/b>/g)].map(m=>m[1]),names,'Preserve exact menu labels and order');
    assert.equal((nav.match(/st-nav-item active/g) ?? []).length,1,'Exactly one settings tab active');
    if (path==='profile') {
      for (const label of ['Profile Photo','Change Photo','Remove','Personal Information','Full Name','Email Address','Phone Number','Language','Timezone','Date Format','Email Notifications','Marketing Updates','Dark Mode','Account Overview','Member Since','Delete Account','Save Changes','Instagram','Facebook','YouTube','LinkedIn','Book a Call']) assert.ok(html.includes(label),`Profile has ${label}`);
      assert.equal((html.match(/role="switch"/g)??[]).length,3);
    }
    if (path==='billing') {
      for (const label of ['€47.80','GOS Pro','Subscription','Wallet','Usage','Transactions','WhatsApp','Email','AI Follow-Up','Other Services','Payment Methods','Auto Recharge','VISA','PayPal','Bank Transfer','Date','Type','Description','Service','Amount','Balance']) assert.ok(html.includes(label),`Billing has ${label}`);
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
  console.log('PASS tenant isolation, saved preferences, corrupt storage recovery, unavailable services, safe provider URLs');
} finally { await server.close(); }
