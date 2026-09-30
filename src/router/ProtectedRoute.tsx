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

export const RouteLoading: React.FC = () => {
  const location = useLocation();
  const { theme, language } = useSelector((state: RootState) => state.ui);
  const isSuperAdmin = location.pathname.startsWith('/super-admin');
  const isArabic = language === 'ar';

  return <div className={`route-loading${isSuperAdmin ? ' is-super-admin' : ''}${theme === 'dark' ? ' is-dark' : ''}`} role="status" aria-live="polite" dir={isArabic ? 'rtl' : 'ltr'}>
    <aside className="loading-sidebar" aria-hidden="true">
      <div className="loading-brand"><span>G</span><i/><b/></div>
      <div className="loading-nav-list">{Array.from({ length: isSuperAdmin ? 8 : 7 }, (_, index) => <i key={index} className={index === 0 ? 'selected' : ''}/>)}</div>
      <div className="loading-user"><i/><span><b/><small/></span></div>
    </aside>
    <main className="loading-main">
      <header className="loading-topbar"><i/><div><span/><span/></div></header>
      <section className="loading-content" aria-hidden="true">
        <div className="loading-title-card"><span className="loading-title-icon"/><div><i/><b/></div></div>
        <div className="loading-metrics">{Array.from({ length: 4 }, (_, index) => <div key={index}><i/><b/><span/></div>)}</div>
        <div className="loading-table"><div className="loading-table-head"><b/><span/></div>{Array.from({ length: 5 }, (_, index) => <i key={index}/>)}</div>
        <div className="loading-message"><span className="loading-spinner"/><span>{isArabic ? 'جارٍ تجهيز مساحة عملك' : 'Preparing your workspace'}</span><small>{isArabic ? 'لحظات قليلة حتى يصبح كل شيء جاهزًا' : 'Getting everything ready for you'}</small></div>
      </section>
    </main>
  </div>;
};
