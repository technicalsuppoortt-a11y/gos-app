import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  History,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  WALLET_CURRENCY,
  billing,
  useBillingIdentity,
  useCommunicationLedger,
  useCommunicationWallet,
  useLedger,
  useSubscription,
  useWallet,
  type WalletLedgerRow,
} from '../../backend/billing';
import { showToast } from '../../utils/toast';
import { LedgerTable } from './ProviderPanels';
import { WalletTopupModal } from './WalletTopupModal';
import { Empty, Spinner, useCopy } from './ui';

const WALLET_USAGE_LABELS: Record<string, { en: string; ar: string }> = {
  wallet_topup: { en: 'Wallet Top-Up', ar: 'شحن المحفظة' },
  plan_payment: { en: 'Plan Payment', ar: 'سداد باقة' },
  subscription_renewal: { en: 'Plan Renewal', ar: 'تجديد اشتراك' },
  auto_renewal: { en: 'Auto-Renewal', ar: 'تجديد تلقائي' },
  addon_purchase: { en: 'Add-on Purchase', ar: 'شراء إضافة' },
  auto_recharge: { en: 'Auto-Recharge', ar: 'شحن رصيد تلقائي' },
  manual_adjustment: { en: 'Manual Adjustment', ar: 'تسوية إدارية' },
  outbound_message: { en: 'Outbound Message', ar: 'رسالة صادرة' },
  inbound_message: { en: 'Inbound Message', ar: 'رسالة واردة' },
};

export function SubscriberWalletPanel({ audience }: { audience: 'admin' | 'user' }) {
  const c = useCopy();
  const identity = useBillingIdentity();
  const { data: commWallet, loading: walletLoading } = useCommunicationWallet(identity.uid);
  const { data: sub } = useSubscription(identity.uid);
  const { data: creditWallet } = useWallet(identity.uid);
  const { data: walletEntries, loading: ledgerLoading } = useCommunicationLedger(
    identity.uid,
    commWallet?.updatedAt,
  );
  const { data: creditEntries } = useLedger(identity.uid);

  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmountInput, setTopupAmountInput] = useState('50');
  const parsedTopupAmount = (() => {
    const num = parseFloat(topupAmountInput.trim());
    return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : 0;
  })();
  const isTopupAmountValid = parsedTopupAmount >= 1 && parsedTopupAmount <= 100000;
  const [togglingRenew, setTogglingRenew] = useState(false);
  const [savingRecharge, setSavingRecharge] = useState(false);

  // Auto-Renewal & Auto-Recharge state synced with Firestore
  const autoRenewEnabled = Boolean(sub?.autoRenew ?? commWallet?.autoRenew);
  const [creditRechargeEnabled, setCreditRechargeEnabled] = useState(false);
  const [belowCredits, setBelowCredits] = useState('100');
  const [addCredits, setAddCredits] = useState('500');
  const [lowCashThreshold, setLowCashThreshold] = useState('10');
  const [cashRechargeAmount, setCashRechargeAmount] = useState('25');

  useEffect(() => {
    if (!commWallet) return;
    setCreditRechargeEnabled(
      Boolean(commWallet.creditAutoRecharge?.enabled || commWallet.autoRecharge?.enabled),
    );
    if (commWallet.creditAutoRecharge?.belowCredits) {
      setBelowCredits(String(commWallet.creditAutoRecharge.belowCredits));
    }
    if (commWallet.creditAutoRecharge?.addCredits) {
      setAddCredits(String(commWallet.creditAutoRecharge.addCredits));
    }
    if (commWallet.autoRecharge?.below) {
      setLowCashThreshold(commWallet.autoRecharge.below);
    } else if (commWallet.lowBalanceThreshold > 0) {
      setLowCashThreshold(String(commWallet.lowBalanceThreshold));
    }
    if (commWallet.autoRecharge?.amount) {
      setCashRechargeAmount(commWallet.autoRecharge.amount);
    }
  }, [commWallet]);

  const currency = commWallet?.currency || WALLET_CURRENCY;
  const available = commWallet
    ? Math.max(0, (commWallet.balance ?? 0) - (commWallet.held ?? 0))
    : 0;
  const held = commWallet?.held ?? 0;

  const handleToggleAutoRenew = async (next: boolean) => {
    if (togglingRenew) return;
    setTogglingRenew(true);
    try {
      await billing('setAutoRenew', { enabled: next });
      showToast.success(
        next
          ? c.t(
              'Automatic subscription renewal via Wallet enabled.',
              'تم تفعيل التجديد التلقائي للاشتراك من المحفظة.',
            )
          : c.t(
              'Automatic subscription renewal disabled.',
              'تم إيقاف التجديد التلقائي للاشتراك.',
            ),
      );
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setTogglingRenew(false);
    }
  };

  const handleSaveAutoRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRecharge) return;
    setSavingRecharge(true);
    try {
      const cleanBelowCash = Math.max(0.01, Number(lowCashThreshold) || 10);
      const cleanCashAmt = Math.max(1, Number(cashRechargeAmount) || 25);
      const cleanBelowCredits = Math.max(1, Math.round(Number(belowCredits) || 100));
      const cleanAddCredits = Math.max(1, Math.round(Number(addCredits) || 500));

      await billing('saveWalletSettings', {
        autoRenew: autoRenewEnabled,
        autoRecharge: {
          enabled: creditRechargeEnabled,
          below: String(cleanBelowCash),
          amount: String(cleanCashAmt),
          method: 'wallet',
        },
        creditAutoRecharge: {
          enabled: creditRechargeEnabled,
          belowCredits: cleanBelowCredits,
          addCredits: cleanAddCredits,
        },
      });
      showToast.success(
        c.t(
          'Wallet auto-recharge preferences saved.',
          'تم حفظ إعدادات الشحن التلقائي من المحفظة.',
        ),
      );
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSavingRecharge(false);
    }
  };

  const renderEntryLabel = (row: WalletLedgerRow) => {
    const item = WALLET_USAGE_LABELS[row.usage_type];
    if (item) return c.t(item.en, item.ar);
    return row.usage_type?.replace(/_/g, ' ') || c.t('Transaction', 'عملية');
  };

  if (walletLoading) {
    return (
      <div className="bl-loading">
        <Spinner />
        <span>{c.t('Loading wallet…', 'جارٍ تحميل المحفظة…')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hierarchy Explanation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 px-4 py-3.5 text-xs text-indigo-950 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-200">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            {audience === 'admin' ? <Users size={16} /> : <ShieldCheck size={16} />}
          </span>
          <div>
            <div className="font-bold text-sm">
              {audience === 'admin'
                ? c.t(
                    'Admin Multi-Tier Wallet · Super Admin & Agency Users',
                    'محفظة المسؤول متعددة المستويات · الإدارة العليا ومستخدمو الوكالة',
                  )
                : c.t(
                    'Workspace Billing Wallet · Instant Payments & Auto-Renewal',
                    'محفظة فوترة الحساب · الدفع الفوري والتجديد التلقائي',
                  )}
            </div>
            <p className="mt-0.5 text-xs opacity-90">
              {audience === 'admin'
                ? c.t(
                    'Use this wallet to instantly pay for platform plans, renewals, and add-ons from the Super Admin, and to automatically fund shared usage for your Agency Users.',
                    'استخدم هذه المحفظة للسداد الفوري لباقات المنصة والتجديدات والإضافات لدى الإدارة العليا، ولتمويل استهلاك مستخدمي الوكالة تلقائيًا.',
                  )
                : c.t(
                    'Top up your wallet once and pay instantly for plans, renewals, add-ons, and communication channels.',
                    'اشحن محفظتك وادفع فوريًا للباقات والتجديدات والإضافات وقنوات التواصل.',
                  )}
            </p>
          </div>
        </div>
      </div>

      {/* Insufficient Auto-Renew Warning if applicable */}
      {sub?.autoRenewError === 'insufficient_wallet_funds' && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <strong>
              {c.t(
                'Auto-renewal paused due to insufficient wallet funds.',
                'تعذّر التجديد التلقائي لعدم كفاية رصيد المحفظة.',
              )}
            </strong>{' '}
            {c.t(
              'Top up your wallet and renew your plan to restore uninterrupted service.',
              'يرجى شحن المحفظة وتجديد الباقة لاستعادة الخدمة دون انقطاع.',
            )}
          </div>
          <button
            type="button"
            onClick={() => setTopupOpen(true)}
            className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
          >
            {c.t('Top Up Now', 'اشحن الآن')}
          </button>
        </div>
      )}

      {/* Top Grid: Balance Hero Card + Auto-Renew / Auto-Recharge Card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Wallet Balance Card */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 text-white shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Wallet size={13} />
                {c.t('Available Wallet Balance', 'رصيد المحفظة المتاح')}
              </span>
              <span className="font-mono text-xs font-semibold text-slate-400">{currency}</span>
            </div>

            <div className="mt-4 font-mono text-3xl font-extrabold tracking-tight text-white">
              {c.money(available, currency)}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
              <div>
                <div className="text-[11px] text-slate-400">{c.t('Reserved', 'محجوز')}</div>
                <div className="mt-0.5 font-mono font-bold text-white">
                  {c.money(held, currency)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">
                  {c.t('Total Top-Ups', 'إجمالي الشحن')}
                </div>
                <div className="mt-0.5 font-mono font-bold text-emerald-300">
                  {c.money(commWallet?.lifetimeTopup ?? 0, currency)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">
                  {c.t('Total Spent', 'إجمالي المنصرف')}
                </div>
                <div className="mt-0.5 font-mono font-bold text-slate-200">
                  {c.money(commWallet?.lifetimeSpent ?? 0, currency)}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Coins size={13} className="text-indigo-400" />
                {c.t('Current AI Credits', 'رصيد الذكاء الاصطناعي الحالي')}
              </span>
              <strong className="font-mono text-white">
                {c.num(creditWallet?.balance ?? 0)}
              </strong>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4">
            <label className="block text-[11px] font-semibold text-white/85">
              {c.t(
                `Choose or enter a specific top-up amount (${currency})`,
                `اختر أو أدخل مبلغ شحن محدد (${currency})`,
              )}
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[10, 25, 50, 100, 250].map(preset => {
                const active = parsedTopupAmount === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopupAmountInput(String(preset))}
                    className={`rounded-lg border py-1.5 text-xs font-bold transition-colors ${
                      active
                        ? 'border-emerald-400 bg-emerald-500 text-white shadow-xs'
                        : 'border-white/15 bg-white/5 text-white/90 hover:border-emerald-400/60 hover:bg-white/10'
                    }`}
                  >
                    {currency === 'EUR' ? `€${preset}` : `${preset}`}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-xs font-bold text-white/70">
                {currency === 'EUR' ? '€' : currency}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={topupAmountInput}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
                    setTopupAmountInput(val);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && isTopupAmountValid) {
                    e.preventDefault();
                    setTopupOpen(true);
                  }
                }}
                placeholder={c.t('Enter specific amount…', 'أدخل مبلغًا محددًا…')}
                aria-label={c.t('Enter specific wallet top-up amount', 'أدخل مبلغ شحن المحفظة')}
                className="w-full rounded-xl border border-white/15 bg-white/10 py-2 ps-8 pe-3 font-mono text-xs font-bold text-white placeholder:text-white/50 focus:border-emerald-400 focus:bg-white/15 focus:outline-none"
              />
            </div>
            {!isTopupAmountValid && (
              <p className="text-[11px] text-rose-300">
                {c.t(
                  'Enter an amount between 1 and 100,000.',
                  'أدخل مبلغًا بين 1 و100,000.',
                )}
              </p>
            )}
            <button
              type="button"
              disabled={!isTopupAmountValid}
              onClick={() => {
                if (!isTopupAmountValid) return;
                setTopupOpen(true);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              {isTopupAmountValid
                ? c.t(
                    `Top Up ${c.money(parsedTopupAmount, currency)}`,
                    `شحن ${c.money(parsedTopupAmount, currency)}`,
                  )
                : c.t('Top Up Wallet', 'شحن المحفظة')}
            </button>
          </div>
        </div>

        {/* Auto-Renewal & Auto-Recharge Card */}
        <form
          onSubmit={handleSaveAutoRecharge}
          className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <RefreshCw size={17} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {c.t(
                      'Auto-Renewal via Wallet',
                      'التجديد التلقائي للاشتراك من المحفظة',
                    )}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {c.t(
                      'Automatically renew your active plan at period end whenever sufficient wallet balance is available.',
                      'تُجدَّد باقتك تلقائيًا عند انتهاء الفترة متى ما توفّر رصيد كافٍ في المحفظة.',
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoRenewEnabled}
                disabled={togglingRenew}
                onClick={() => void handleToggleAutoRenew(!autoRenewEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                  autoRenewEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                    autoRenewEnabled
                      ? c.ar
                        ? '-translate-x-5'
                        : 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Low-Balance Auto-Recharge Toggle & Inputs */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <Zap size={17} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {c.t(
                      'Low-Balance Auto-Recharge from Wallet',
                      'الشحن التلقائي عند انخفاض الرصيد من المحفظة',
                    )}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {c.t(
                      'Automatically top up AI credits from your cash wallet when balance drops below your threshold.',
                      'شحن رصيد الذكاء الاصطناعي تلقائيًا من المحفظة النقدية فور انخفاض الرصيد عن الحد المحدد.',
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={creditRechargeEnabled}
                onClick={() => setCreditRechargeEnabled(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  creditRechargeEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                    creditRechargeEnabled
                      ? c.ar
                        ? '-translate-x-5'
                        : 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {c.t('When AI Credits Below', 'عند انخفاض الرصيد تحت')}
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={belowCredits}
                  onChange={e => setBelowCredits(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {c.t('Auto-Add Credits', 'إضافة رصيد تلقائي')}
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={addCredits}
                  onChange={e => setAddCredits(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {c.t(`Low Wallet Alert (${currency})`, `تنبيه انخفاض المحفظة (${currency})`)}
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={lowCashThreshold}
                  onChange={e => setLowCashThreshold(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3.5 dark:border-slate-800">
            <button
              type="submit"
              disabled={savingRecharge}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingRecharge ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {c.t('Save Automation Settings', 'حفظ إعدادات الأتمتة')}
            </button>
          </div>
        </form>
      </div>

      {/* Wallet Transactions Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {c.t('Wallet Transactions & Deductions', 'حركات المحفظة والخصومات')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {audience === 'admin'
                ? c.t(
                    'Includes wallet top-ups, platform plan/renewal payments, auto-recharges, and Agency User shared deductions.',
                    'تشمل عمليات شحن المحفظة، مدفوعات باقات المنصة والتجديدات، الشحن التلقائي، وخصومات مستخدمي الوكالة.',
                  )
                : c.t(
                    'Complete audit trail of wallet top-ups, plan payments, auto-renewals, and channel usage.',
                    'سجل كامل لعمليات شحن المحفظة ومدفوعات الباقات والتجديد التلقائي واستهلاك القنوات.',
                  )}
            </p>
          </div>
        </div>

        {ledgerLoading ? (
          <div className="py-8 text-center">
            <Spinner />
          </div>
        ) : walletEntries.length === 0 ? (
          <Empty
            icon={<Wallet size={22} />}
            title={c.t('No wallet transactions yet', 'لا توجد حركات محفظة بعد')}
            text={c.t(
              'Top up your wallet or pay for a plan from wallet to see live ledger entries here.',
              'اشحن محفظتك أو سدد باقة من المحفظة لعرض سجل الحركات هنا.',
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <th className="px-4 py-2.5 text-start">{c.t('Date', 'التاريخ')}</th>
                  <th className="px-4 py-2.5 text-start">{c.t('Type', 'النوع')}</th>
                  <th className="px-4 py-2.5 text-start">{c.t('Description', 'الوصف')}</th>
                  <th className="px-4 py-2.5 text-end">{c.t('Amount', 'المبلغ')}</th>
                  <th className="px-4 py-2.5 text-end">{c.t('Balance After', 'الرصيد بعد')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {walletEntries.map(row => {
                  const delta =
                    row.amount !== 0
                      ? row.amount
                      : row.customer_charge
                      ? -Math.abs(row.customer_charge)
                      : 0;
                  const isCredit = delta > 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {c.dateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            isCredit
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft size={12} />
                          ) : (
                            <ArrowUpRight size={12} />
                          )}
                          {renderEntryLabel(row)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                        {row.description || renderEntryLabel(row)}
                        {row.channel && (
                          <span className="ms-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {row.channel}
                          </span>
                        )}
                      </td>
                      <td
                        dir="ltr"
                        className={`px-4 py-3 text-end font-mono text-xs font-bold whitespace-nowrap ${
                          isCredit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : ''}
                        {c.money(delta, row.currency || currency)}
                      </td>
                      <td
                        dir="ltr"
                        className="px-4 py-3 text-end font-mono text-xs font-semibold whitespace-nowrap text-slate-700 dark:text-slate-300"
                      >
                        {row.balance_after !== null && row.balance_after !== undefined
                          ? c.money(row.balance_after, row.currency || currency)
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Consolidated AI & Email Credit Usage Ledger */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <History size={16} className="text-indigo-500" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {c.t('Credits & Usage History', 'سجل الرصيد والاستهلاك')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {c.t(
                'Plan credit grants, transfers, auto-recharges, and AI/email usage.',
                'إضافات رصيد الباقة والتحويلات والشحن التلقائي واستهلاك الذكاء الاصطناعي والبريد.',
              )}
            </p>
          </div>
        </div>
        <LedgerTable entries={creditEntries} />
      </div>

      {topupOpen && (
        <WalletTopupModal
          initialAmount={isTopupAmountValid ? parsedTopupAmount : 50}
          currency={currency}
          onClose={() => setTopupOpen(false)}
        />
      )}
    </div>
  );
}
