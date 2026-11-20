import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import PlanAccessGuard from '../components/PlanAccessGuard';
import JoeAcademyLogo from '../components/ui/JoeAcademyLogo';
import JoeAcademyLoader from '../components/ui/JoeAcademyLoader';
import { ROUTE_ACCESS } from '../shared/billing/access';
import { useStore } from '../store/useStore';
import { isStaffRole } from '../shared/permissions';
import { isWorkspacePreview, readWorkspaceView } from '../modules/brand-engine/data/workspaceNavigation';
import { usePhoenixTheme } from '../modules/brand-engine/hooks/usePhoenixTheme';
import './launch-brand-page.css';
import { loadBrandWorkspace, preloadBrandWorkspace } from '../services/preloadBrandWorkspace';

const BrandEngineModule = lazy(loadBrandWorkspace);
export default function LaunchBrandPage() {
  const { isAuthLoading, isAuthenticated, role, language } = useStore();
  const displayTheme = usePhoenixTheme();
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);
  const { search } = useLocation();
  const preview = isWorkspacePreview(readWorkspaceView(search));
  const isAr = language === 'ar';
  const canLaunchBrand = !isAuthLoading && isAuthenticated && !isStaffRole(role);
  const loading = <JoeAcademyLoader />;
  useEffect(() => {
    if (canLaunchBrand) preloadBrandWorkspace();
  }, [canLaunchBrand]);

  if (!isAuthLoading && !isAuthenticated) return <Navigate to="/auth" replace />;
  if (!isAuthLoading && isStaffRole(role)) return <Navigate to="/admin" replace />;

  return <div className={`launch-brand-page${preview ? ' launch-brand-page--preview' : ''}${displayTheme === 'dark' ? ' dark' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
    <header className="launch-brand-header" hidden={preview || isWorkspacePreview(readWorkspaceView(search))}>
      <Link className="launch-brand-back" to="/" aria-label={isAr ? 'الرجوع للوحة التحكم' : 'Back to Dashboard'}>
        {isAr ? <ArrowRight size={18} aria-hidden="true" /> : <ArrowLeft size={18} aria-hidden="true" />}
        <span dir="auto">{isAr ? 'الرجوع للوحة التحكم' : 'Back to Dashboard'}</span>
      </Link>
      <div className="launch-brand-toolbar-slot" ref={setHeaderTarget} />
      <div className="launch-brand-identity"><JoeAcademyLogo className="h-9 w-9" /><span dir="auto">{isAr ? 'جو أكاديمي' : 'Joe Academy'}</span></div>
    </header>
    <div className="launch-brand-content">
      {isAuthLoading ? loading : <PlanAccessGuard access={ROUTE_ACCESS['/launch-brand']}>
        <Suspense fallback={loading}><BrandEngineModule headerTarget={headerTarget} /></Suspense>
      </PlanAccessGuard>}
    </div>
  </div>;
}
