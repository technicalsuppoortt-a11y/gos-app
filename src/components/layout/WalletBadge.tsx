import { Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { useBillingIdentity, useCommunicationWallet, WALLET_CURRENCY } from '../../backend/billing';
import { isDemoAccount } from '../../backend/demoContext';
import { translateText as t, useUILanguage } from '../../i18n/display';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  EGP: 'E£',
  SAR: 'SAR ',
  AED: 'AED ',
};

export function WalletBadge() {
  const language = useUILanguage();
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.role);
  const identity = useBillingIdentity();
  const { data: wallet, loading } = useCommunicationWallet(identity.uid);

  const currency = wallet?.currency ?? WALLET_CURRENCY;
  const symbol = CURRENCY_SYMBOLS[currency] ?? '€';
  const available = wallet ? Math.max(0, (wallet.balance ?? 0) - (wallet.held ?? 0)) : 0;

  const formattedAmount = loading
    ? '—'
    : new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(available);

  const handleClick = () => {
    if (role === 'SUPER_ADMIN') {
      navigate('/super-admin/plans?tab=wallet');
    } else if (role === 'ADMIN') {
      navigate('/admin/plans?tab=wallet');
    } else {
      navigate('/dashboard/settings/billing?tab=wallet');
    }
  };

  const title = t(
    isDemoAccount
      ? 'Communication Wallet · Carrier Balance (Demo)'
      : 'Communication Wallet · Live Carrier Balance'
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t('Communication Wallet balance')}
      title={title}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 shadow-xs"
    >
      <Wallet size={14} className="text-emerald-600 dark:text-emerald-400" />
      <span aria-live="polite" className="font-mono font-bold tracking-tight">
        {loading ? '—' : `${symbol}${formattedAmount}`}
      </span>
      <span className="hidden xl:inline text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
        {t('Wallet')}
      </span>
    </button>
  );
}
