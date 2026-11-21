import { ChevronRight, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '../../backend/credits';
import { isDemoAccount } from '../../backend/demoContext';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

export function CreditBadge({ variant = 'pill', onSelect }: { variant?: 'pill' | 'menu'; onSelect?: () => void } = {}) {
  useUILanguage();
  const credits = useCredits(), navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.role);
  const formatted = credits === null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(credits);
  const handleClick = () => {
    navigate(role === 'SUPER_ADMIN' ? '/super-admin/plans' : role === 'ADMIN' ? '/admin/plans?area=mine' : '/dashboard/settings/billing');
    onSelect?.();
  };

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={t('Available credits')}
        title={t(isDemoAccount ? 'Demo credits · simulated balance' : 'Available credits')}
        className="group flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-start transition-colors hover:bg-indigo-50/80 dark:hover:bg-indigo-500/10"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-200/70 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/25">
            <Coins size={14} />
          </span>
          <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
            {t(isDemoAccount ? 'Demo credits' : 'Available credits')}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span aria-live="polite" dir="ltr" className="rounded-md bg-indigo-50/90 px-2 py-0.5 text-xs font-bold tabular-nums text-indigo-700 ring-1 ring-inset ring-indigo-200/70 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/25">
            {formatted}
          </span>
          <ChevronRight size={13} className="text-slate-400 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 dark:text-slate-500" />
        </span>
      </button>
    );
  }

  return <button type="button" onClick={handleClick} aria-label={t('Available credits')} title={t(isDemoAccount ? 'Demo credits · simulated balance' : 'Available credits')} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/70 px-2 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:hover:bg-indigo-400/20">
    <Coins size={15}/><span aria-live="polite" dir="ltr" className="tabular-nums">{formatted}</span><span className="hidden 2xl:inline">{t(isDemoAccount ? 'Demo credits' : 'Credits')}</span>
  </button>;
}
