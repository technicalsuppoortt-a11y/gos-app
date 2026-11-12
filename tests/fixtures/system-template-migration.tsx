import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createMemoryRouter, createRoutesFromElements, Outlet, Route, RouterProvider } from 'react-router-dom';
import AdminTemplateEditorPage from '../../src/pages/admin/AdminTemplateEditorPage';
import { store } from '../../src/store';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { AdminLiveManagement } from '../../src/pages/admin/AdminLiveManagement';
import { TemplatePreviewPage } from '../../src/pages/TemplatePreviewPage';
import { ProtectedRoute } from '../../src/router/ProtectedRoute';
import { CustomerChangePassword } from '../../src/pages/auth/CustomerChangePassword';
import { AdminPreviewPage } from '../../src/pages/admin/AdminPreviewPage';
import { PageTemplateLibrary } from '../../src/pages/PageTemplateLibrary';
import { BookingTemplates } from '../../src/pages/booking/BookingTemplates';
import { ProductTemplateLibrary } from '../../src/pages/commerce/ProductTemplateLibrary';
import { createPageAsset } from '../../src/pages/page-templates';
import i18n from '../../src/i18n/i18n';
(window as any).__setTemplateLanguage = (language: string) => i18n.changeLanguage(language);
import '../../src/index.css';
import '../../src/pages/admin/admin-workspace.css';
import '../../src/components/layout/super-admin.css';
const params = new URLSearchParams(location.search), view = params.get('view') || 'admin';
store.dispatch(loginSuccess({ user: { id: 'fixture', name: 'Fixture', email: 'fixture@example.com', ...(view === 'password' ? { requiresPasswordChange: true } : {}) }, tenant: { id: 'fixture', name: 'Fixture workspace' }, role: view === 'password' ? 'CUSTOMER' : view === 'admin-owned' ? 'ADMIN' : view === 'admin' || location.pathname === '/admin-preview' ? 'SUPER_ADMIN' : 'USER', token: 'fixture' }));
if (params.get('theme') === 'dark') document.documentElement.classList.add('dark');
const router = createMemoryRouter(createRoutesFromElements(<><Route path="/portal/:id" element={<ProtectedRoute allowedRoles={["CUSTOMER"]}><h1>Purchase delivery</h1></ProtectedRoute>}/><Route path="/customer/change-password" element={<ProtectedRoute allowedRoles={["CUSTOMER"]} allowPendingPassword><CustomerChangePassword/></ProtectedRoute>}/><Route path="/admin-preview" element={<AdminPreviewPage/>}/><Route path="/template-preview/:templateId" element={<TemplatePreviewPage/>}/><Route path="/super-admin/dashboard-management" element={<div className="sa-shell"><main className="sa-main"><div className="sa-content"><Outlet/></div></main></div>}>
  <Route index element={<div className="adm-shell sa-templates"><AdminLiveManagement moduleId="templates"/></div>}/>
  <Route path="new" element={<AdminTemplateEditorPage scope="system"/>}/>
  <Route path=":templateId/edit" element={<AdminTemplateEditorPage scope="system"/>}/>
</Route>
<Route path="/admin/templates" element={<div className="adm-shell"><Outlet/></div>}>
  <Route index element={<AdminLiveManagement moduleId="templates"/>}/>
  <Route path="new" element={<AdminTemplateEditorPage scope="mine"/>}/>
  <Route path=":templateId/edit" element={<AdminTemplateEditorPage scope="mine"/>}/>
</Route>
<Route path="*" element={ view === 'booking' ? <BookingTemplates/> : view === 'products' ? <ProductTemplateLibrary/> : <main className="aw-workspace" style={{ padding: 24 }}><PageTemplateLibrary install={template => { (window as any).__installedPage = createPageAsset(template.mode, template.name, template); }}/></main>}/><Route path="/dashboard/booking/:id/edit" element={<h1>Booking copy created</h1>}/><Route path="/dashboard/products-payments/products/:id/edit" element={<h1>Product copy created</h1>}/></>), {
  initialEntries: [view === 'password' ? '/portal/paid-course' :
    view === 'admin' && location.pathname !== '/admin-preview' ? '/super-admin/dashboard-management' :
    view === 'admin-owned' ? '/admin/templates?library=mine' : location.pathname + location.search],
});
(window as any).__templateRouter = router;
createRoot(document.getElementById('root')!).render(<Provider store={store}><RouterProvider router={router}/></Provider>);
