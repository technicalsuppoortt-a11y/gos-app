import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import assert from 'node:assert/strict';
// Startup must not require a browser or an accessible storage object.
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
try {
 const { store } = await server.ssrLoadModule('/src/store/index.ts');
 const { loginSuccess } = await server.ssrLoadModule('/src/store/slices/authSlice.ts');
 const { setLanguage, toggleTheme } = await server.ssrLoadModule('/src/store/slices/uiSlice.ts');
 store.dispatch(loginSuccess({ user: { id: 'production-test', name: 'Test User', email: 'test@example.com' }, role: 'USER', tenant: { id: 'production-test', name: 'Test' }, token: 'test' }));
 store.dispatch(setLanguage('en'));store.dispatch(toggleTheme());
 const { UserLayout } = await server.ssrLoadModule('/src/components/layout/UserLayout.tsx');
 const { DashboardPage } = await server.ssrLoadModule('/src/pages/DashboardPage.tsx');
 const { RouteErrorBoundary } = await server.ssrLoadModule('/src/router/RouteBoundary.tsx');
 const boundary = new RouteErrorBoundary({ children: null });boundary.state = { failed: true };
 const failure = renderToString(boundary.render());assert.ok(failure.includes('role="alert"'));assert.ok(failure.includes('Reload page'));assert.ok(failure.includes('Back to dashboard'));
 const render = page => {
  const router = createMemoryRouter([{ path: '/dashboard', element: createElement(UserLayout), children: [{ path: page, element: createElement(DashboardPage, { page }) }] }], { initialEntries: ['/dashboard/' + page] });
  try { return renderToString(createElement(Provider, { store }, createElement(RouterProvider, { router }))); } finally { router.dispose(); }
 };
 const inbox = render('inbox');
 assert.ok(inbox.includes('inbox-root'));
 assert.ok(!inbox.match(/<div[^>]*class="layout-route-content[^"]*"[^>]*>/)?.[0].includes('opacity'), 'Route content is visible without animation completion');
 assert.ok(render('follow-up').includes('AI Follow-Up'));
 // Legacy/corrupt local state must recover without discarding valid default UI.
 Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem(key) { return key.includes('workflows') ? '[null,{"id":"broken"}]' : key.includes('assistant') ? '{"name":null}' : 'null'; }, setItem() {} } });
 assert.ok(render('follow-up').includes('AI Follow-Up'));
 assert.ok(render('inbox').includes('inbox-root'));
 console.log('PASS Inbox and Follow-Up rendering with no window, denied storage and malformed stored state; visible error recovery');
} finally { await server.close(); }
