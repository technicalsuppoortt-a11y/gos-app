import { useCurrency } from '../../context/CurrencyContext';
import { Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { canViewTopbarWallet } from '../../store/cashWalletVisibility';
import { PLATFORM, useAgencyBilling, useBillingIdentity, useCommunicationWallet, useProviderCommunicationWallets, WALLET_CURRENCY } from '../../backend/billing';
import { isDemoAccount } from '../../backend/demoContext';
import { translateText as t, useUILanguage } from '../../i18n/display';

export function WalletBadge() {
  const visible = useSelector(canViewTopbarWallet);
  return visible ? <CashWalletBadge/> : null;
}

function CashWalletBadge() {
  const language = useUILanguage();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.role);
  const agency = useSelector((state: RootState) => state.auth.user?.accountType === 'agency');
  const identity = useBillingIdentity();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const { data: wallet, loading: walletLoading } = useCommunicationWallet(agency ? null : (isSuperAdmin ? PLATFORM : identity.uid));
  const { data: platformPool, loading: poolLoading } = useProviderCommunicationWallets(isSuperAdmin ? PLATFORM : null);
  const { data: shared, loading: sharedLoading } = useAgencyBilling(agency ? identity.uid : null);

  const loading = agency
    ? (sharedLoading || !shared)
    : isSuperAdmin
    ? (walletLoading && poolLoading)
    : walletLoading;

  const currency = shared?.currency ?? wallet?.currency ?? WALLET_CURRENCY;
  const ownAvailable = wallet ? Math.max(0, (wallet.balance ?? 0) - (wallet.held ?? 0)) : 0;
  const poolAvailable = isSuperAdmin
    ? platformPool.reduce((sum, item) => sum + Math.max(0, (item.balance ?? 0) - (item.held ?? 0)), 0)
    : 0;
  const available = shared?.communicationBalance ?? (isSuperAdmin ? (ownAvailable > 0 ? ownAvailable : poolAvailable) : ownAvailable);

  const ar = language.startsWith('ar');
  const title = t(
    agency
      ? (ar ? 'محفظة الوكالة المشتركة' : 'Shared Agency Wallet')
      : isSuperAdmin
      ? (ar ? 'إجمالي أرصدة محافظ الأدمن' : 'Platform Admin Wallets Balance')
      : role === 'ADMIN'
      ? (ar ? 'رصيد المحفظة · باقات المنصة ومستخدمي الوكالة' : 'Admin Wallet · Platform Billing & Agency Users')
      : isDemoAccount
      ? 'Wallet Balance (Demo)'
      : (ar ? 'رصيد المحفظة المتاح' : 'Available Wallet Balance')
  );

  const targetHref = role === 'SUPER_ADMIN'
    ? '/super-admin/plans?tab=wallet'
    : role === 'ADMIN'
    ? '/admin/plans?area=mine&view=wallet'
    : '/dashboard/settings/billing?tab=wallet';

  return (
    <button
      type="button"
      onClick={() => navigate(targetHref)}
      aria-label={t('Wallet balance')}
      title={title}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 shadow-xs"
    >
      <Wallet size={14} className="text-emerald-600 dark:text-emerald-400" />
      <span aria-live="polite" dir="ltr" className="font-mono font-bold tracking-tight tabular-nums">
        {loading ? '—' : formatPrice(available, currency)}
      </span>
      <span className="hidden 2xl:inline text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
        {t('Wallet')}
      </span>
    </button>
  );
}
