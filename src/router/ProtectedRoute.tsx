import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { Role } from '../types/auth';

export function routeForRole(role: Role | null): string {
  if (role === 'SUPER_ADMIN') return '/super-admin';
  if (role === 'ADMIN') return '/admin';
  if (role === 'USER') return '/dashboard';
  return '/auth/login';
}

export const ProtectedRoute: React.FC<React.PropsWithChildren<{ allowedRoles: Role[] }>> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useSelector((state: RootState) => state.auth);

  const location = useLocation();

  if (!isAuthenticated || !role) return <Navigate to="/auth/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(role)) return <Navigate to={routeForRole(role)} replace />;
  return <>{children}</>;
};

export const DefaultRedirect: React.FC = () => {
  const { isAuthenticated, role } = useSelector((state: RootState) => state.auth);
  return <Navigate to={isAuthenticated ? routeForRole(role) : '/auth/login'} replace />;
};

import { Rocket } from 'lucide-react';

export const RouteLoading: React.FC = () => {
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
          <b>GOS</b>
          <span>Growth Operating System</span>
        </div>
        <div className="gos-loader-bar">
          <div className="gos-loader-progress"></div>
        </div>
        <div className="gos-loader-text">
          {isArabic ? 'جارٍ تحميل مساحة عملك...' : 'Loading your workspace...'}
        </div>
      </div>
    </div>
  );
};
