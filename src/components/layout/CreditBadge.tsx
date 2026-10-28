import { Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '../../backend/credits';
import { isDemoAccount } from '../../backend/demoContext';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
export function CreditBadge() {
  const language = useUILanguage();
  const credits = useCredits(), navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.role);
  return <button type="button" onClick={() => navigate(role === 'SUPER_ADMIN' ? '/super-admin/plans' : role === 'ADMIN' ? '/admin/plans?area=mine' : '/dashboard/plans')} aria-label={t('Available credits')} title={t(isDemoAccount ? 'Demo credits · simulated balance' : 'Available credits')} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/70 px-2 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:hover:bg-indigo-400/20">
    <Coins size={15}/><span aria-live="polite">{credits === null ? '—' : new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', { maximumFractionDigits: 2 }).format(credits)}</span><span className="hidden xl:inline">{t(isDemoAccount ? 'Demo credits' : 'Credits')}</span>
  </button>;
}
