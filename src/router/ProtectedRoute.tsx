import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { Role } from '../types/auth';
import { useOnboarding } from '../pages/onboarding/onboarding-store';

export function routeForRole(role: Role | null): string {
  if (role === 'SUPER_ADMIN') return '/super-admin';
  if (role === 'ADMIN') return '/admin';
  if (role === 'USER') return '/dashboard';
  return '/auth/login';
}

export const ProtectedRoute: React.FC<React.PropsWithChildren<{ allowedRoles: Role[] }>> = ({ children, allowedRoles }) => {
  useUILanguage();
  const { isAuthenticated, role, user } = useSelector((state: RootState) => state.auth);
  const onboarding = useOnboarding();

  const location = useLocation();

  if (!isAuthenticated || !role) return <Navigate to="/auth/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(role)) return <Navigate to={routeForRole(role)} replace />;
  const setup = onboarding.setups[user?.email || ''];
  const userWorkspace = location.pathname.startsWith('/dashboard') || /^\/(crm|funnels|websites|domains)(\/|$)/.test(location.pathname);
  if (userWorkspace && (role === 'USER' || !!setup) && !setup?.onboarding_completed) return <Navigate to="/onboarding" replace/>;
  return <>{localizeNode(children)}</>;
};

export const DefaultRedirect: React.FC = () => {
  useUILanguage();
  const { isAuthenticated, role } = useSelector((state: RootState) => state.auth);
  return <Navigate to={isAuthenticated ? routeForRole(role) : '/auth/login'} replace />;
};

import { Rocket } from 'lucide-react';

export const RouteLoading: React.FC = () => {
  useUILanguage();
  const { theme, language } = useSelector((state: RootState) => state.ui);
  const isArabic = language === 'ar';

  return (
    <div className={`gos-global-loader ${theme === 'dark' ? 'is-dark' : ''}`} role="status" aria-live="polite" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="gos-loader-content">
        <div className="gos-loader-logo">
          <Rocket size={34} strokeWidth={2.2} />
          <div className="gos-loader-pulse"></div>
          <div className="gos-loader-pulse delay"></div>
        </div>
        <div className="gos-loader-brand">
          <b>{translateText("GOS")}</b>
          <span>{translateText("Growth Operating System")}</span>
        </div>
        <div className="gos-loader-bar">
          <div className="gos-loader-progress"></div>
        </div>
        <div className="gos-loader-text">
          {localizeNode(isArabic ? 'جارٍ تحميل مساحة عملك...' : 'Loading your workspace...')}
        </div>
      </div>
    </div>
  );
};
