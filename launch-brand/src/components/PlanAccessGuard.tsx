import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { RouteAccess } from '../shared/billing/access';
import { hasPlanAccess, getDefaultRoute } from '../shared/billing/access';
import { Home } from 'lucide-react';
import { can, type Capability } from '../shared/permissions';

export default function PlanAccessGuard({ access, capability, children }: { access?: RouteAccess; capability?: Capability; children: ReactNode }) {
  const { accountAccess, userProfile, role, language } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAr = language === 'ar';

  const checkAccess = access !== undefined ? access : location.pathname;
  const roleAllows = !capability || can(role, capability);
  if (roleAllows && hasPlanAccess(accountAccess, userProfile, checkAccess as RouteAccess, role === 'admin')) return <>{children}</>;

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-lg items-center justify-center px-4 text-center" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="w-full rounded-[28px] border border-primary-400/20 bg-[var(--surface)] p-8 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-400/10 text-primary-400"><Lock size={25} /></div>
        <h1 className="mt-5 text-xl font-black">{roleAllows ? (isAr ? 'هذه الصفحة مقفلة في باقتك الحالية' : 'This page is locked in your current plan') : (isAr ? 'غير متاح لصلاحية حسابك' : 'Not available for your account')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">{roleAllows ? (isAr ? 'اختر باقة تتضمن هذه الميزة، ثم أرسل طلب الترقية للوصول إليها.' : 'Choose a plan that includes this feature and submit an upgrade request to unlock it.') : (isAr ? 'الصفحة دي مش ضمن صلاحيات حسابك حاليًا.' : 'This page is not part of your account access.')}</p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Paused billing navigation: <button onClick={() => navigate('/billing')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ember-1)] px-5 py-3 text-sm font-bold text-white w-full sm:w-auto"><Sparkles size={16} />{isAr ? 'استعراض الباقات والترقية' : 'View plans & upgrade'}</button> */}
          <button onClick={() => navigate(getDefaultRoute(userProfile, role))} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] px-5 py-3 text-sm font-bold hover:bg-[var(--line)] transition-colors w-full sm:w-auto"><Home size={16} />{isAr ? 'العودة للرئيسية' : 'Return Home'}</button>
        </div>
      </div>
    </section>
  );
}
