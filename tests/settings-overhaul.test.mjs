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
 const { readTeam, readSecurity, changeDemoPassword, saveLocal, defaultSecurity } = await server.ssrLoadModule('/src/pages/settings/localState.ts');
 const { moduleForPath } = await server.ssrLoadModule('/src/pages/settings/useModuleAccess.ts');
 const auth = tenant => ({ user: { id: 'owner', name: 'Owner', email: 'owner@example.com' }, role: 'USER', tenant: { id: tenant, name: tenant }, token: 'test' });
 store.dispatch(loginSuccess(auth('tenant-a')));
 const team = readTeam();
 assert.equal(team.members.length, 4);
 const member = { id: 'new', name: 'New member', email: 'new@example.com', role: 'Sales', active: true, permissions: ['crm', 'inbox'] };
 saveLocal('team', { members: [...team.members, member], audit: ['Added member'] });
 assert.deepEqual(readTeam().members.at(-1).permissions, ['crm', 'inbox']);
 saveLocal('team', { members: readTeam().members.map(entry => entry.id === 'new' ? { ...entry, name: 'Edited member', permissions: ['crm'] } : entry), audit: [] });
 assert.equal(readTeam().members.at(-1).name, 'Edited member');
 saveLocal('team', { members: readTeam().members.filter(entry => entry.id !== 'new'), audit: [] });
 assert.equal(readTeam().members.length, 4);
 const security = readSecurity();
 await assert.rejects(changeDemoPassword(security, 'wrong-password', 'NewDemoPassword123!'), /incorrect/);
 await assert.rejects(changeDemoPassword(security, 'DemoPassword123!', 'short'), /12 characters/);
 const changed = await changeDemoPassword(security, 'DemoPassword123!', 'NewDemoPassword123!');
 assert.ok(!JSON.stringify(changed).includes('NewDemoPassword123!'), 'No plaintext password persisted');
 saveLocal('security', changed);
 await assert.rejects(changeDemoPassword(readSecurity(), 'DemoPassword123!', 'AnotherPassword123!'), /incorrect/);
 assert.ok((await changeDemoPassword(readSecurity(), 'NewDemoPassword123!', 'AnotherPassword123!')).passwordHash);
 saveLocal('security', { ...changed, mfa: true, sessions: changed.sessions.filter(session => session.current) });
 assert.equal(readSecurity().mfa, true); assert.equal(readSecurity().sessions.length, 1);
 store.dispatch(loginSuccess(auth('tenant-b')));
 assert.equal(readSecurity().mfa, false); assert.equal(readTeam().audit.length, 2);
 saveLocal('security', { unexpected: true }); assert.deepEqual(Object.keys(readSecurity()), Object.keys(defaultSecurity()));
 for (const [path, module] of [['/dashboard/products-payments/course/id','products'],['/dashboard/websites','funnels'],['/funnels','funnels'],['/crm','crm'],['/dashboard','home']]) assert.equal(moduleForPath(path),module);
 console.log('PASS team CRUD persistence, tenant isolation, password verification and hashing, MFA/session persistence, route permission mapping');
 const { DashboardPage } = await server.ssrLoadModule('/src/pages/DashboardPage.tsx');
 const { AICopilot } = await server.ssrLoadModule('/src/pages/AICopilot.tsx');
 const { FunnelBuilder } = await server.ssrLoadModule('/src/pages/FunnelBuilder.tsx');
 for (const [page, component, title, expected, excluded] of [
   ['funnels', FunnelBuilder, 'Funnel &amp; website', 'Coaching Discovery Funnel', 'Strategy Session'],
   ['booking', DashboardPage, 'Booking', 'Strategy Session', 'Coaching Discovery Funnel'],
   ['follow-up', DashboardPage, 'Automation', 'New Lead Welcome Flow', 'Strategy Session'],
   ['copilot', AICopilot, 'Copilot', 'Store Shopping Concierge', 'Strategy Session'],
   ['products', DashboardPage, 'Products', 'Consulting Session', 'Strategy Session'],
   ['knowledge', DashboardPage, 'Knowledge', 'Agency Services Playbook', 'Strategy Session'],
 ]) {
   const router = createMemoryRouter([{ path: '/dashboard/' + page, element: createElement(component, { page }) }], { initialEntries: ['/dashboard/' + page + '?tab=templates'] });
   const html = renderToString(createElement(Provider, { store }, createElement(RouterProvider, { router })));
   assert.ok(html.includes(title)); assert.ok(html.includes(expected)); assert.ok(!html.includes(excluded)); assert.ok(!html.includes('Design Blocks'));
   router.dispose(); console.log('PASS scoped templates ' + page);
 }
} finally { await server.close(); }
