import { useCurrency } from '../../context/CurrencyContext';
import { ChevronRight, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { canViewTopbarWallet } from '../../store/cashWalletVisibility';
import { PLATFORM, useAgencyBilling, useBillingIdentity, useCommunicationWallet, useProviderCommunicationWallets, WALLET_CURRENCY } from '../../backend/billing';
import { isDemoAccount } from '../../backend/demoContext';
import { translateText as t, useUILanguage, translateText } from '../../i18n/display';

export function WalletBadge({ variant = 'pill', onSelect }: { variant?: 'pill' | 'menu'; onSelect?: () => void } = {}) {
  const visible = useSelector(canViewTopbarWallet);
  return visible ? <CashWalletBadge variant={variant} onSelect={onSelect} /> : null;
}

function CashWalletBadge({ variant = 'pill', onSelect }: { variant?: 'pill' | 'menu'; onSelect?: () => void }) {
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
      ? (ar ? 'محفظة الوكالة المشتركة' : translateText('Shared Agency Wallet'))
      : isSuperAdmin
      ? (ar ? 'إجمالي أرصدة محافظ الأدمن' : translateText('Platform Admin Wallets Balance'))
      : role === 'ADMIN'
      ? (ar ? 'رصيد المحفظة · باقات المنصة ومستخدمي الوكالة' : translateText('Admin Wallet · Platform Billing & Agency Users'))
      : isDemoAccount
      ? 'Wallet Balance (Demo)'
      : (ar ? 'رصيد المحفظة المتاح' : translateText('Available Wallet Balance'))
  );

  const targetHref = role === 'SUPER_ADMIN'
    ? '/super-admin/plans?tab=wallet'
    : role === 'ADMIN'
    ? '/admin/plans?area=mine&view=wallet'
    : '/dashboard/settings/billing?tab=wallet';

  const handleClick = () => {
    navigate(targetHref);
    onSelect?.();
  };

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={t('Wallet balance')}
        title={title}
        className="group flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-start transition-colors hover:bg-emerald-50/80 dark:hover:bg-emerald-500/10"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25">
            <Wallet size={14} />
          </span>
          <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
            {t('Wallet')}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span aria-live="polite" dir="ltr" className="rounded-md bg-emerald-50/90 px-2 py-0.5 font-mono text-xs font-bold tracking-tight tabular-nums text-emerald-700 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25">
            {loading ? '—' : formatPrice(available, currency)}
          </span>
          <ChevronRight size={13} className="text-slate-400 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 dark:text-slate-500" />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
