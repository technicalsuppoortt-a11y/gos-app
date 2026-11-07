import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { Role } from '../types/auth';
import { useSessionReady } from '../backend/sessionState';
import { WorkspaceLoading, WorkspaceSkeleton } from '../components/common/WorkspaceLoading';
import { isPlatformTeamRole, platformHome } from './platformAccess';


export function routeForRole(role: Role | null, allowedTabs?: readonly string[] | null): string {
  if (isPlatformTeamRole(role)) return platformHome(role, allowedTabs);
  if (role === 'ADMIN') return '/admin';
  if (role === 'USER') return '/dashboard';
  return '/auth/login';
}

export const ProtectedRoute: React.FC<React.PropsWithChildren<{ allowedRoles: Role[] }>> = ({ children, allowedRoles }) => {
  useUILanguage();
  const { isAuthenticated, role, user } = useSelector((state: RootState) => state.auth);


  const location = useLocation();

  const sessionReady = useSessionReady();
  if (!sessionReady) return <WorkspaceSkeleton variant="spinner" fullScreen/>;
  if (!isAuthenticated || !role) return <Navigate to="/auth/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(role)) return <Navigate to={routeForRole(role, user?.allowedTabs)} replace />;
  // The onboarding redirect is temporarily disabled with the setup cycle.
  return <>{localizeNode(children)}</>;
};

export const DefaultRedirect: React.FC = () => {
  useUILanguage();
  const { isAuthenticated, role, user } = useSelector((state: RootState) => state.auth);
  const sessionReady = useSessionReady();
  if (!sessionReady) return <WorkspaceSkeleton variant="spinner" fullScreen/>;
  return <Navigate to={isAuthenticated ? routeForRole(role, user?.allowedTabs) : '/auth/login'} replace />;
};

export const RouteLoading: React.FC = () => {
  const { pathname } = useLocation();
  const dashboard = /^\/(dashboard|admin|super-admin|crm)(\/|$)/.test(pathname);
  return dashboard ? <WorkspaceLoading/> : <WorkspaceSkeleton variant="spinner" fullScreen/>;
};
