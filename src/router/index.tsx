import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import React, { lazy as reactLazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DefaultRedirect, ProtectedRoute } from './ProtectedRoute';
import { Suspended } from './RouteBoundary';
import { retryImport } from './chunkRecovery';
const lazy: typeof reactLazy = loader => reactLazy(() => retryImport(loader));
import type { Role } from '../types/auth';
import '../route-loading.css';
const ActivationPage = lazy(() => import('../pages/onboarding/ActivationPage').then(module => ({ default: module.ActivationPage })));
const OnboardingWizard = lazy(() => import('../pages/onboarding/OnboardingWizard').then(module => ({ default: module.OnboardingWizard })));
const AdminUsers = lazy(() => import('../pages/onboarding/AdminUsers').then(module => ({ default: module.AdminUsers })));

const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const LandingPage = lazy(() => import('../pages/landing/LandingPage').then(module => ({ default: module.LandingPage })));
const UserLayout = lazy(() => import('../components/layout/UserLayout').then(module => ({ default: module.UserLayout })));
const AdminLayout = lazy(() => import('../components/layout/AdminLayout').then(module => ({ default: module.AdminLayout })));
const SuperAdminLayout = lazy(() => import('../components/layout/SuperAdminLayout').then(module => ({ default: module.SuperAdminLayout })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const AdminWorkspace = lazy(() => import('../pages/admin/AdminWorkspace').then(module => ({ default: module.AdminWorkspace })));
const AdminTools = lazy(() => import('../pages/admin/AdminTools').then(module => ({ default: module.AdminTools })));
const SuperAdminDashboard = lazy(() => import('../pages/super-admin/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard })));
const BookingEditorPage = lazy(() => import('../pages/booking/BookingEditorPage'));
const AppointmentEditorPage = lazy(() => import('../pages/booking/AppointmentEditorPage'));
const PublicBookingPage = lazy(() => import('../pages/booking/PublicBookingPage'));

const PagePlaceholder = lazy(() => import('../components/common/PagePlaceholder').then(module => ({ default: module.PagePlaceholder })));
const ActivityPage = lazy(() => import('../pages/ActivityPage').then(module => ({ default: module.ActivityPage })));
const SettingsWorkspace = lazy(() => import('../pages/settings/SettingsWorkspace').then(module => ({ default: module.SettingsWorkspace })));
const AICopilot = lazy(() => import('../pages/AICopilot').then(module => ({ default: module.AICopilot })));
const FunnelBuilder = lazy(() => import('../pages/FunnelBuilder').then(module => ({ default: module.FunnelBuilder })));
const CRMRecord = lazy(() => import('../pages/crm/CRMRecord').then(module => ({ default: module.CRMRecord })));
const DiscountEditorPage = lazy(() => import('../pages/DiscountEditorPage').then(module => ({ default: module.DiscountEditorPage })));

const ProductLivePreview = lazy(() => import('../pages/commerce/ProductLivePreview').then(module => ({ default: module.ProductLivePreview })));
const ProductWorkspace = lazy(() => import('../pages/commerce/ProductWorkspace').then(module => ({ default: module.ProductWorkspace })));

const crmChildren = [
  { index: true, element: <Suspended><DashboardPage page="crm"/></Suspended> },
  ...['pipeline', 'contacts', 'activities', 'tasks', 'overview', 'templates'].map(path => ({ path, element: <Suspended><DashboardPage page="crm"/></Suspended> })),
  { path: 'contacts/:id', element: <Suspended><CRMRecord/></Suspended> },
  { path: 'opportunities/:id', element: <Suspended><CRMRecord/></Suspended> },
];

function GuardedLayout({ roles, children }: React.PropsWithChildren<{ roles: Role[] }>) {
  useUILanguage();
  return <ProtectedRoute allowedRoles={roles}><Suspended>{localizeNode(children)}</Suspended></ProtectedRoute>;
}

export const router = createBrowserRouter([
  { path: '/activate', element: <Suspended><ActivationPage/></Suspended> },
  { path: '/onboarding', element: <Suspended><OnboardingWizard/></Suspended> },
  { path: '/product-preview/:token', element: <ProtectedRoute allowedRoles={['USER', 'ADMIN', 'SUPER_ADMIN']}><Suspended><ProductLivePreview/></Suspended></ProtectedRoute> },
  { path: '/book/:slug', element: <Suspended><PublicBookingPage/></Suspended> },
  // Public marketing landing page — intentionally NOT wrapped in ProtectedRoute/GuardedLayout.
  { path: '/', element: <Suspended><LandingPage/></Suspended> },
  { path: '/login', element: <Suspended><LoginPage/></Suspended> },
  { path: '/auth/login', element: <Suspended><LoginPage/></Suspended> },
  { path: '/forgot-password', element: <Suspended><ForgotPasswordPage/></Suspended> },
  { path: '/auth/forgot-password', element: <Suspended><ForgotPasswordPage/></Suspended> },
  { path: '/reset-password', element: <Suspended><ResetPasswordPage/></Suspended> },
  { path: '/auth/reset-password', element: <Suspended><ResetPasswordPage/></Suspended> },
  { path: '/auth/*', element: <DefaultRedirect/> },
  ...['funnels/*', 'websites/*', 'domains/*'].map(path => ({ path: `/${path}`, element: <GuardedLayout roles={['USER', 'ADMIN', 'SUPER_ADMIN']}><UserLayout/></GuardedLayout>, children: [{ path:'*', element:<Suspended><FunnelBuilder/></Suspended> }] })),
  { path: '/crm', element: <GuardedLayout roles={['USER', 'ADMIN', 'SUPER_ADMIN']}><UserLayout/></GuardedLayout>, children: crmChildren },
  {
    path: '/dashboard',
    element: <GuardedLayout roles={['USER', 'ADMIN', 'SUPER_ADMIN']}><UserLayout/></GuardedLayout>,
    children: [
      { index: true, element: <Suspended><DashboardPage page="home"/></Suspended> },
      { path: 'copilot', element: <Suspended><AICopilot/></Suspended> },
      ...['funnels/*', 'websites/*', 'domains/*'].map(path => ({ path, element: <Suspended><FunnelBuilder/></Suspended> })),
      { path: 'templates', element: <Navigate to="/dashboard/funnels?tab=templates" replace/> },
      { path: 'crm', children: crmChildren },
      { path: 'inbox', element: <Suspended><DashboardPage page="inbox"/></Suspended> },
      { path: 'follow-up', element: <Suspended><DashboardPage page="follow-up"/></Suspended> },
      { path: 'booking/new', element: <Suspended><BookingEditorPage/></Suspended> },
      { path: 'booking/appointments/new', element: <Suspended><AppointmentEditorPage/></Suspended> },
      { path: 'booking/appointments/:appointmentId/edit', element: <Suspended><AppointmentEditorPage/></Suspended> },
      { path: 'booking/:pageId/edit', element: <Suspended><BookingEditorPage/></Suspended> },
      { path: 'booking', element: <Suspended><DashboardPage page="booking"/></Suspended> },
      { path: 'products', element: <Suspended><DashboardPage page="products"/></Suspended> },
      { path: 'products-payments', element: <Suspended><DashboardPage page="products"/></Suspended> },
      { path: 'products-payments/products/new', element: <Suspended><ProductWorkspace mode="create"/></Suspended> },
      { path: 'products-payments/products/:id/pricing', element: <Suspended><ProductWorkspace mode="edit" defaultTab="pricing"/></Suspended> },
      { path: 'products-payments/products/:id/edit', element: <Suspended><ProductWorkspace mode="edit"/></Suspended> },
      { path: 'products-payments/products/:id', element: <Suspended><ProductWorkspace mode="edit"/></Suspended> },
      { path: 'products-payments/course/:id', element: <Suspended><ProductWorkspace mode="edit"/></Suspended> },
      { path: 'products-payments/course/:id/edit', element: <Suspended><ProductWorkspace mode="edit"/></Suspended> },
      { path: 'products-payments/course/:id/orders', element: <Suspended><ProductWorkspace mode="edit" defaultTab="orders"/></Suspended> },
      { path: 'products-payments/course/:id/students', element: <Suspended><ProductWorkspace mode="edit" defaultTab="access"/></Suspended> },
      { path: 'products-payments/discounts/new', element: <Suspended><DiscountEditorPage/></Suspended> },
      { path: 'products-payments/discounts/:id/edit', element: <Suspended><DiscountEditorPage/></Suspended> },
      { path: 'analytics', element: <Suspended><DashboardPage page="analytics"/></Suspended> },
      { path: 'knowledge', element: <Suspended><DashboardPage page="knowledge"/></Suspended> },
      { path: 'content', element: <Suspended><PagePlaceholder title={translateText("Content Generator")}/></Suspended> },
      { path: 'academy', element: <Suspended><PagePlaceholder title={translateText("GOS Academy")}/></Suspended> },
      { path: 'activity', element: <Suspended><ActivityPage/></Suspended> },
      { path: 'integrations', element: <Suspended><SettingsWorkspace/></Suspended> },
      { path: 'settings', element: <Navigate to="/dashboard/settings/profile" replace/> },
      { path: 'settings/*', element: <Suspended><SettingsWorkspace/></Suspended> },
    ],
  },
  {
    path: '/admin',
    element: <GuardedLayout roles={['ADMIN', 'SUPER_ADMIN']}><AdminLayout/></GuardedLayout>,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace/> },
      { path: 'tools', element: <Suspended><AdminTools/></Suspended> },
      { path: 'users', element: <Suspended><AdminUsers/></Suspended> },
      ...['dashboard','conversations','onboarding','plans','payments-gateways','transactions','funnels','funnels-websites','crm','booking','products','templates','analytics','landing','ai-usage','domains','integrations','settings'].map(path=>({path,element:<Suspended><AdminWorkspace/></Suspended>})),
      { path: 'leads', element: <Navigate to="/admin/crm" replace/> },
      { path: 'billing', element: <Navigate to="/admin/transactions" replace/> },
    ],
  },
  {
    path: '/super-admin',
    element: <GuardedLayout roles={['SUPER_ADMIN']}><SuperAdminLayout/></GuardedLayout>,
    children: [
      { index: true, element: <Suspended><SuperAdminDashboard/></Suspended> },
      { path: 'clients', element: <Suspended><PagePlaceholder title={translateText("Clients")}/></Suspended> },
      { path: 'subscriptions', element: <Suspended><PagePlaceholder title={translateText("Subscriptions")}/></Suspended> },
      { path: 'analytics', element: <Suspended><PagePlaceholder title={translateText("Platform Analytics")}/></Suspended> },
      { path: 'settings', element: <Suspended><PagePlaceholder title={translateText("Platform Settings")}/></Suspended> },
      { path: 'users', element: <Suspended><PagePlaceholder title={translateText("Team Management")}/></Suspended> },
      { path: 'templates', element: <Navigate to="/super-admin" replace/> },
      { path: 'integrations', element: <Suspended><PagePlaceholder title={translateText("Platform Integrations")}/></Suspended> },
      { path: 'payments', element: <Suspended><PagePlaceholder title={translateText("Payments")}/></Suspended> },
      { path: 'logs', element: <Suspended><PagePlaceholder title={translateText("Logs & Monitoring")}/></Suspended> },
    ],
  },
  { path: '*', element: <DefaultRedirect/> },
]);
