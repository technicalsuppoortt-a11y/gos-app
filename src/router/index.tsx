import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { DefaultRedirect, ProtectedRoute, RouteLoading } from './ProtectedRoute';
import type { Role } from '../types/auth';
import '../route-loading.css';

const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const UserLayout = lazy(() => import('../components/layout/UserLayout').then(module => ({ default: module.UserLayout })));
const AdminLayout = lazy(() => import('../components/layout/AdminLayout').then(module => ({ default: module.AdminLayout })));
const SuperAdminLayout = lazy(() => import('../components/layout/SuperAdminLayout').then(module => ({ default: module.SuperAdminLayout })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const SuperAdminDashboard = lazy(() => import('../pages/super-admin/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard })));
const PagePlaceholder = lazy(() => import('../components/common/PagePlaceholder').then(module => ({ default: module.PagePlaceholder })));
const ActivityPage = lazy(() => import('../pages/ActivityPage').then(module => ({ default: module.ActivityPage })));
const AICopilot = lazy(() => import('../pages/AICopilot').then(module => ({ default: module.AICopilot })));
const FunnelBuilder = lazy(() => import('../pages/FunnelBuilder').then(module => ({ default: module.FunnelBuilder })));

function Suspended({ children }: React.PropsWithChildren) {
  return <Suspense fallback={<RouteLoading/>}>{children}</Suspense>;
}

function GuardedLayout({ roles, children }: React.PropsWithChildren<{ roles: Role[] }>) {
  return <ProtectedRoute allowedRoles={roles}><Suspended>{children}</Suspended></ProtectedRoute>;
}

export const router = createBrowserRouter([
  { path: '/', element: <DefaultRedirect/> },
  { path: '/auth/login', element: <Suspended><LoginPage/></Suspended> },
  { path: '/auth/*', element: <DefaultRedirect/> },
  {
    path: '/dashboard',
    element: <GuardedLayout roles={['USER', 'ADMIN', 'SUPER_ADMIN']}><UserLayout/></GuardedLayout>,
    children: [
      { index: true, element: <Suspended><DashboardPage page="home"/></Suspended> },
      { path: 'copilot', element: <Suspended><AICopilot/></Suspended> },
      { path: 'funnels', element: <Suspended><FunnelBuilder/></Suspended> },
      { path: 'templates', element: <Suspended><PagePlaceholder title="Templates"/></Suspended> },
      { path: 'crm', element: <Suspended><DashboardPage page="crm"/></Suspended> },
      { path: 'inbox', element: <Suspended><DashboardPage page="inbox"/></Suspended> },
      { path: 'follow-up', element: <Suspended><DashboardPage page="follow-up"/></Suspended> },
      { path: 'booking', element: <Suspended><DashboardPage page="booking"/></Suspended> },
      { path: 'products', element: <Suspended><DashboardPage page="products"/></Suspended> },
      { path: 'analytics', element: <Suspended><DashboardPage page="analytics"/></Suspended> },
      { path: 'knowledge', element: <Suspended><DashboardPage page="knowledge"/></Suspended> },
      { path: 'content', element: <Suspended><PagePlaceholder title="Content Generator"/></Suspended> },
      { path: 'academy', element: <Suspended><PagePlaceholder title="GOS Academy"/></Suspended> },
      { path: 'activity', element: <Suspended><ActivityPage/></Suspended> },
      { path: 'integrations', element: <Suspended><DashboardPage page="settings"/></Suspended> },
      { path: 'settings/*', element: <Suspended><DashboardPage page="settings"/></Suspended> },
    ],
  },
  {
    path: '/admin',
    element: <GuardedLayout roles={['ADMIN', 'SUPER_ADMIN']}><AdminLayout/></GuardedLayout>,
    children: [
      { index: true, element: <Suspended><AdminDashboard/></Suspended> },
      { path: 'users', element: <Suspended><PagePlaceholder title="Users Management"/></Suspended> },
      { path: 'integrations', element: <Suspended><PagePlaceholder title="Integrations"/></Suspended> },
      { path: 'billing', element: <Suspended><PagePlaceholder title="Billing"/></Suspended> },
      { path: 'settings', element: <Suspended><PagePlaceholder title="Tenant Settings"/></Suspended> },
    ],
  },
  {
    path: '/super-admin',
    element: <GuardedLayout roles={['SUPER_ADMIN']}><SuperAdminLayout/></GuardedLayout>,
    children: [
      { index: true, element: <Suspended><SuperAdminDashboard/></Suspended> },
      { path: 'clients', element: <Suspended><PagePlaceholder title="Clients"/></Suspended> },
      { path: 'subscriptions', element: <Suspended><PagePlaceholder title="Subscriptions"/></Suspended> },
      { path: 'analytics', element: <Suspended><PagePlaceholder title="Platform Analytics"/></Suspended> },
      { path: 'settings', element: <Suspended><PagePlaceholder title="Platform Settings"/></Suspended> },
      { path: 'users', element: <Suspended><PagePlaceholder title="Team Management"/></Suspended> },
      { path: 'templates', element: <Suspended><PagePlaceholder title="Platform Templates"/></Suspended> },
      { path: 'integrations', element: <Suspended><PagePlaceholder title="Platform Integrations"/></Suspended> },
      { path: 'payments', element: <Suspended><PagePlaceholder title="Payments"/></Suspended> },
      { path: 'logs', element: <Suspended><PagePlaceholder title="Logs & Monitoring"/></Suspended> },
    ],
  },
  { path: '*', element: <DefaultRedirect/> },
]);
