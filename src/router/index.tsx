import { PlatformToolBoundary } from '../backend/platformTools';
import type { RouteObject } from 'react-router-dom';
import { WorkspaceData } from '../backend/workspace';
import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import React, { lazy as reactLazy } from 'react';
import { createBrowserRouter, Navigate, useSearchParams } from 'react-router-dom';
import { DefaultRedirect, ProtectedRoute } from './ProtectedRoute';
import { Suspended } from './RouteBoundary';
import { retryImport } from './chunkRecovery';
const lazy: typeof reactLazy = loader => reactLazy(() => retryImport(loader));
import type { Role } from '../types/auth';
import '../route-loading.css';

const SupportChat = lazy(() => import('../pages/support/SupportChat').then(module => ({ default: module.SupportChat })));
const CommercePolicyPage = lazy(() => import('../pages/commerce/CommercePolicyPage').then(module => ({ default: module.CommercePolicyPage })));
const EmailActionPage = lazy(() => import('../pages/auth/EmailActionPage').then(module => ({ default: module.EmailActionPage })));
const PhoenixSignIn = lazy(() => import('../pages/auth/PhoenixSignIn'));

const ActivationPage = lazy(() => import('../pages/auth/ActivationLinkPage').then(module => ({ default: module.ActivationPage })));
const ActivateAccountPage = lazy(() => import('../pages/onboarding/ActivateAccountPage'));
// OnboardingWizard is temporarily disabled.
const AdminUsers = lazy(() => import('../pages/onboarding/AdminUsers').then(module => ({ default: module.AdminUsers })));

const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const LandingPage = lazy(() => import('../pages/landing/LandingPage').then(module => ({ default: module.LandingPage })));
const UserLayout = lazy(() => import('../components/layout/UserLayout').then(module => ({ default: module.UserLayout })));
const UserSupportPage = lazy(() => import('../pages/support/UserSupportEntry').then(module => ({ default: module.UserSupportPage })));
function controlToolRoute(route: RouteObject): RouteObject {
  return { ...route, ...(route.element ? { element: <PlatformToolBoundary>{route.element}</PlatformToolBoundary> } : {}), ...(route.children ? { children: route.children.map(controlToolRoute) } : {}) } as RouteObject;
}
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
const MarketingTracking = lazy(() => import('../pages/MarketingTracking').then(module => ({ default: module.MarketingTracking })));
const SuperAdminWorkspace = lazy(() => import('../pages/super-admin/SuperAdminWorkspace').then(module => ({ default: module.SuperAdminWorkspace })));
const SuperAdminPlansPage = lazy(() => import('../pages/billing/PlansPages').then(module => ({ default: module.SuperAdminPlansPage })));
const UserPlansPage = lazy(() => import('../pages/billing/PlansPages').then(module => ({ default: module.UserPlansPage })));
const AICopilot = lazy(() => import('../pages/AICopilot').then(module => ({ default: module.AICopilot })));
const AssetStandalonePreview = lazy(() => import('../pages/AssetStandalonePreview').then(module => ({ default: module.AssetStandalonePreview })));
const FunnelBuilder = lazy(() => import('../pages/FunnelBuilder').then(module => ({ default: module.FunnelBuilder })));
const CRMRecord = lazy(() => import('../pages/crm/CRMRecord').then(module => ({ default: module.CRMRecord })));
const DiscountEditorPage = lazy(() => import('../pages/DiscountEditorPage').then(module => ({ default: module.DiscountEditorPage })));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));

const ProductLivePreview = lazy(() => import('../pages/commerce/ProductLivePreview').then(module => ({ default: module.ProductLivePreview })));
const ProductPublicPreview = lazy(() => import('../pages/commerce/ProductPublicPreview').then(module => ({ default: module.ProductPublicPreview })));
function ProductPreviewRoute() {
  const [params] = useSearchParams();
  return params.has('workspace') ? <Suspended><ProductPublicPreview/></Suspended> : <ProtectedRoute allowedRoles={['USER', 'ADMIN', 'SUPER_ADMIN']}><WorkspaceData><Suspended><ProductLivePreview/></Suspended></WorkspaceData></ProtectedRoute>;
}
const ProductAccess = lazy(() => import('../pages/commerce/ProductAccess').then(module => ({ default: module.ProductAccess })));
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
  { path: '/auth/phoenix', element: <Suspended><PhoenixSignIn/></Suspended> },
  { path: '/activate', element: <Suspended><ActivationPage/></Suspended> },
  { path: '/onboarding/activate-account', element: <Suspended><ActivateAccountPage/></Suspended> },
  // Keep activation links usable while the onboarding cycle is disabled.
  { path: '/onboarding', element: <Navigate to="/dashboard" replace/> },
  { path: '/product-preview/:token', element: <ProductPreviewRoute/> },
  { path: '/product-access', element: <Suspended><ProductAccess/></Suspended> },
  { path: '/asset-preview/:assetId/:pageId?', element: <ProtectedRoute allowedRoles={['USER']}><WorkspaceData><Suspended><AssetStandalonePreview/></Suspended></WorkspaceData></ProtectedRoute> },
  { path: '/book/:slug', element: <Suspended><PublicBookingPage/></Suspended> },
  { path: '/commerce/policies/:kind', element: <Suspended><CommercePolicyPage/></Suspended> },
  { path: '/privacy', element: <Suspended><PrivacyPage/></Suspended> },
  { path: '/settings/privacy', element: <Navigate to="/dashboard/settings/privacy" replace/> },
  { path: '/settings', element: <Navigate to="/dashboard/settings/profile" replace/> },
  { path: '/settings/*', element: <Navigate to="/dashboard/settings" replace/> },
  // Public marketing landing page — intentionally NOT wrapped in ProtectedRoute/GuardedLayout.
  { path: '/', element: new URLSearchParams(window.location.search).has('oobCode') ? <Suspended><EmailActionPage/></Suspended> : <Suspended><LandingPage/></Suspended> },
  { path: '/login', element: <Suspended><LoginPage/></Suspended> },
  { path: '/auth/login', element: <Suspended><LoginPage/></Suspended> },
  { path: '/forgot-password', element: <Suspended><ForgotPasswordPage/></Suspended> },
  { path: '/auth/forgot-password', element: <Suspended><ForgotPasswordPage/></Suspended> },
  { path: '/reset-password', element: <Suspended><EmailActionPage/></Suspended> },
  { path: '/auth/reset-password', element: <Suspended><EmailActionPage/></Suspended> },
  { path: '/auth/action', element: <Suspended><EmailActionPage/></Suspended> },
  { path: '/__/auth/action', element: <Suspended><EmailActionPage/></Suspended> },
  { path: '/auth/*', element: <DefaultRedirect/> },
  ...['funnels/*', 'websites/*', 'forms/*', 'domains/*'].map(path => ({ path: `/${path}`, element: <GuardedLayout roles={['USER']}><UserLayout/></GuardedLayout>, children: [{ path:'*', element:<PlatformToolBoundary><Suspended><FunnelBuilder/></Suspended></PlatformToolBoundary> }] })),
  { path: '/crm', element: <GuardedLayout roles={['USER']}><UserLayout/></GuardedLayout>, children: crmChildren.map(controlToolRoute) },
  {
    path: '/dashboard',
    element: <GuardedLayout roles={['USER']}><UserLayout/></GuardedLayout>,
    children: [
      { index: true, element: <Suspended><DashboardPage page="home"/></Suspended> },
      { path: 'support', element: <Suspended><UserSupportPage/></Suspended> },
      { path: 'plans', element: <Suspended><UserPlansPage/></Suspended> },
      { path: 'copilot', element: <Suspended><AICopilot/></Suspended> },
      ...['funnels/*', 'websites/*', 'forms/*', 'domains/*'].map(path => ({ path, element: <Suspended><FunnelBuilder/></Suspended> })),
      { path: 'templates', element: <Navigate to="/dashboard/funnels?tab=templates" replace/> },
      { path: 'crm', children: crmChildren },
      { path: 'inbox', element: <Suspended><DashboardPage page="inbox"/></Suspended> },
      { path: 'follow-up', element: <Suspended><DashboardPage page="follow-up"/></Suspended> },
      { path: 'ai-followup', element: <Suspended><DashboardPage page="follow-up"/></Suspended> },
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
      { path: 'marketing-tracking', element: <Navigate to="/dashboard/settings/pixel" replace/> },
      { path: 'knowledge', element: <Suspended><DashboardPage page="knowledge"/></Suspended> },
      { path: 'content', element: <Suspended><PagePlaceholder title={translateText("Content Generator")}/></Suspended> },
      { path: 'academy', element: <Suspended><PagePlaceholder title={translateText("Upclick Academy")}/></Suspended> },
      { path: 'activity', element: <Suspended><ActivityPage/></Suspended> },
      { path: 'integrations', element: <Suspended><SettingsWorkspace/></Suspended> },
      { path: 'settings', element: <Navigate to="/dashboard/settings/profile" replace/> },
      { path: 'settings/*', element: <Suspended><SettingsWorkspace/></Suspended> },
    ].map(controlToolRoute),
  },
  {
    path: '/admin',
    element: <GuardedLayout roles={['ADMIN', 'SUPER_ADMIN']}><AdminLayout/></GuardedLayout>,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace/> },
      { path: 'support', element: <Suspended><SupportChat/></Suspended> },
      { path: 'tools', element: <Suspended><AdminTools/></Suspended> },
      { path: 'users', element: <Suspended><AdminUsers/></Suspended> },
      ...['dashboard','conversations','plans','payments-gateways','user-billing-settings','transactions','funnels','funnels-websites','crm','booking','products','templates','analytics','landing','ai-usage','integrations','settings'].map(path=>({path,element:<Suspended><AdminWorkspace/></Suspended>})),
      { path: 'leads', element: <Navigate to="/admin/crm" replace/> },
      { path: 'billing', element: <Navigate to="/admin/transactions" replace/> },
    ],
  },
  {
    path: '/super-admin',
    element: <GuardedLayout roles={['SUPER_ADMIN']}><SuperAdminLayout/></GuardedLayout>,
    children: [
      { index: true, element: <Suspended><SuperAdminDashboard/></Suspended> },
      { path: 'support', element: <Suspended><SupportChat/></Suspended> },
      { path: 'clients', element: <Suspended><SuperAdminWorkspace/></Suspended> },
      { path: 'subscriptions', element: <Suspended><SuperAdminWorkspace/></Suspended> },
      { path: 'plans', element: <Suspended><SuperAdminPlansPage/></Suspended> },
      { path: 'analytics', element: <Suspended><SuperAdminWorkspace/></Suspended> },
      { path: 'settings', element: <Suspended><SuperAdminWorkspace/></Suspended> },
      { path: 'users', element: <Suspended><SuperAdminWorkspace/></Suspended> },
      { path: 'templates', element: <Suspended><div className="adm-shell sa-templates"><AdminWorkspace/></div></Suspended> },
      { path: 'integrations', element: <Suspended><SuperAdminWorkspace/></Suspended> },
      { path: 'payments', element: <Suspended><SuperAdminWorkspace/></Suspended> },
      { path: 'marketing-tracking', element: <Suspended><MarketingTracking/></Suspended> },
      { path: 'logs', element: <Suspended><SuperAdminWorkspace/></Suspended> },
    ],
  },
  { path: '*', element: <DefaultRedirect/> },
]);
