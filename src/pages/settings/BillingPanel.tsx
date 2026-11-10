import { useCurrency } from '../../context/CurrencyContext';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  FileText,
  Landmark,
  Layers,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import { Card, Field, Toggle } from './kit';
import { Select } from '../../components/ui/Select';
import { friendlyError, settingsApiEnabled, settingsRequest } from './data';
import type { SettingsData, Transaction } from './data';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { canViewCashWallet } from '../../store/cashWalletVisibility';
import { AgencyBilling } from '../billing/AgencyBilling';
import { InvoicesPanel } from '../billing/InvoicesPanel';
import { RequestsPanel } from '../billing/ProviderPanels';
import { MetaWalletPanel } from './MetaWalletPanel';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { MySubscription } from '../billing/MySubscription';
import { WalletTopupModal } from '../billing/WalletTopupModal';
import {
  billing,
  useBillingIdentity,
  useCommunicationLedger,
  useCommunicationWallet,
  useRequests,
  useSubscription,
  WALLET_CURRENCY,
  type WalletLedgerRow,
} from '../../backend/billing';
import { auth } from '../../backend/firebase';

const META_CHANNELS = new Set(['whatsapp', 'facebook', 'instagram', 'messenger']);
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
  instagram: 'Instagram',
  facebook: 'Facebook',
  messenger: 'Messenger',
  webchat: 'Web Chat',
};
const ENTRY_TYPES: Record<string, string> = {
  wallet_topup: 'Top Up',
  manual_adjustment: 'Adjustment',
  refund_reversal: 'Refund',
  transfer_out: 'Transfer',
  plan_payment: 'Plan Payment',
  subscription_renewal: 'Renewal',
  auto_renewal: 'Auto-Renewal',
  addon_purchase: 'Add-on',
  auto_recharge: 'Auto-Recharge',
};
const serviceIcon = (name: string) =>
  name === 'WhatsApp'
    ? MessageCircle
    : name === 'Email'
    ? Mail
    : name === 'AI Follow-Up'
    ? Sparkles
    : MoreHorizontal;
const serviceColor = (name: string) =>
  name === 'WhatsApp'
    ? 'green'
    : name === 'Email'
    ? 'blue'
    : name === 'AI Follow-Up'
    ? 'purple'
    : 'neutral';

const billingTabs = [
  { id: 'overview', icon: CreditCard, name: 'Overview & Subscription' },
  { id: 'plans', icon: Layers, name: 'Plans' },
  { id: 'wallet', icon: Wallet, name: 'Wallet' },
  { id: 'invoices', icon: FileText, name: 'Invoices' },
  { id: 'payment-methods', icon: Landmark, name: 'Payment Methods' },
] as const;
type BillingTab = (typeof billingTabs)[number]['id'];

/** Communication Wallet ledger row → table row. */
function ledgerToTransaction(row: WalletLedgerRow, fallbackBalance: number): Transaction {
  const usage = !ENTRY_TYPES[row.usage_type];
  const label = row.channel ? CHANNEL_LABELS[row.channel] ?? row.channel : '—';
  return {
    id: row.id,
    date: new Date(row.created_at).toLocaleDateString(),
    type: ENTRY_TYPES[row.usage_type] ?? 'Usage',
    description: `${row.description || (usage ? `${label} message` : 'Wallet')}${
      row.status === 'pending' ? ' (pending)' : ''
    }`,
    service: usage ? label : 'Wallet',
    amount: row.amount !== 0 ? row.amount : row.customer_charge ? -Math.abs(row.customer_charge) : 0,
    balance: row.balance_after ?? fallbackBalance,
  };
}

/** Current-month carrier usage per channel (communication only — AI never appears here). */
function summarizeUsage(rows: WalletLedgerRow[]) {
  const today = new Date(),
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  const groups = new Map<string, { amount: number; count: number }>();
  for (const row of rows) {
    if (
      ENTRY_TYPES[row.usage_type] ||
      !row.channel ||
      !['pending', 'confirmed'].includes(row.status) ||
      new Date(row.created_at) < start
    )
      continue;
    const label = CHANNEL_LABELS[row.channel] ?? row.channel,
      group = groups.get(label) ?? { amount: 0, count: 0 };
    groups.set(label, {
      amount: group.amount + (row.customer_charge || 0),
      count: group.count + (row.quantity || 1),
    });
  }
  const total = [...groups.values()].reduce((sum, group) => sum + group.amount, 0);
  const day = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return {
    usageRows: [...groups.entries()].map(([service, group]) => ({
      service,
      amount: group.amount,
      detail: `${group.count} ${group.count === 1 ? 'message' : 'messages'}`,
      percentage: total ? Math.round((group.amount / total) * 100) : 0,
    })),
    usagePeriod: `${day(start)} – ${day(today)}, ${today.getFullYear()}`,
  };
}

export function BillingPanel({
  data,
  integrations,
  refresh,
  saveLocal,
  agencyUid,
}: {
  data: SettingsData;
  integrations?: SettingsData['integrations'];
  refresh: () => Promise<void>;
  saveLocal: (data: SettingsData) => Promise<void>;
  agencyUid: string | null;
}) {
  const language = useUILanguage();
  const { formatPrice } = useCurrency();
  const managed = !useSelector(canViewCashWallet);
  const [params, setParams] = useSearchParams();
  const urlTab = params.get('tab');
  const tab: BillingTab =
    urlTab === 'usage' || urlTab === 'transactions'
      ? 'wallet'
      : billingTabs.find(item => item.id === urlTab)?.id ?? 'overview';
  const setTab = (value: BillingTab) => {
    setParams(
      current => {
        current.set('tab', value);
        return current;
      },
      { replace: true },
    );
  };

  const [amount, setAmount] = useState(50);
  const [customAmountInput, setCustomAmountInput] = useState('50');
  const isCustomAmountValid = amount >= 1 && amount <= 100000;

  const handleSelectTopupPreset = (n: number) => {
    setAmount(n);
    setCustomAmountInput(String(n));
  };

  const handleCustomTopupChange = (raw: string) => {
    if (raw === '' || /^\d+(\.\d{0,2})?$/.test(raw)) {
      setCustomAmountInput(raw);
      const parsed = parseFloat(raw);
      setAmount(Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0);
    }
  };
  const [recharge, setRecharge] = useState(() => ({
    enabled: Boolean(data.recharge?.enabled),
    below: data.recharge?.below || '10',
    amount: data.recharge?.amount || '25',
    method: data.recharge?.method || 'wallet',
  }));
  const [belowCredits, setBelowCredits] = useState('100');
  const [addCredits, setAddCredits] = useState('500');
  const [showTopup, setShowTopup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renewBusy, setRenewBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');

  const rechargeRef = useRef<HTMLElement>(null);
  const creditsRef = useRef<HTMLElement>(null);
  const close = useCallback(() => {
    setShowTopup(false);
    setError('');
  }, []);

  const identity = useBillingIdentity();
  const uid = agencyUid ? null : identity.uid || auth.currentUser?.uid || null;
  const live = !!uid;
  const { data: wallet } = useCommunicationWallet(uid);
  const { data: sub } = useSubscription(uid);
  const { data: ledger } = useCommunicationLedger(uid, wallet?.updatedAt);
  const { data: userRequests } = useRequests('requesterId', uid);

  const pendingTopup = useMemo(() => {
    return (userRequests || []).find(
      r => r && r.type === 'wallet_topup' && r.status === 'pending',
    );
  }, [userRequests]);

  const [notice, setNotice] = useState('');
  const walletCurrency = wallet?.currency ?? WALLET_CURRENCY;
  const fmt = (value: number) =>
    formatPrice(value, walletCurrency, Math.abs(value) < 0.01 && value !== 0 ? 4 : 0);
  const balance = live
    ? wallet
      ? Math.round((wallet.balance - (wallet.held ?? 0)) * 10000) / 10000
      : 0
    : data.balance;

  const autoRenewEnabled = Boolean(sub?.autoRenew ?? wallet?.autoRenew);

  const allTransactions = useMemo(
    () =>
      live
        ? ledger.map(row => ledgerToTransaction(row, wallet?.balance ?? 0))
        : data.transactions,
    [live, ledger, wallet?.balance, data.transactions],
  );
  const { usageRows, usagePeriod } = useMemo(
    () =>
      live
        ? summarizeUsage(ledger)
        : { usageRows: data.usage, usagePeriod: data.usagePeriod },
    [live, ledger, data.usage, data.usagePeriod],
  );
  const metaUsage = useMemo(
    () =>
      summarizeUsage(
        ledger.filter(
          row => row.status === 'confirmed' && META_CHANNELS.has(row.channel ?? ''),
        ),
      ).usageRows,
    [ledger],
  );

  const walletRecharge = wallet?.autoRecharge ?? data.recharge;
  const walletCreditRecharge = wallet?.creditAutoRecharge;
  const [syncedKey, setSyncedKey] = useState('');
  const nextSyncKey = JSON.stringify([walletRecharge, walletCreditRecharge]);
  if (nextSyncKey !== syncedKey) {
    setSyncedKey(nextSyncKey);
    setRecharge({
      enabled: Boolean(walletCreditRecharge?.enabled || walletRecharge?.enabled),
      below: walletRecharge?.below || '10',
      amount: walletRecharge?.amount || '25',
      method: walletRecharge?.method || 'wallet',
    });
    if (walletCreditRecharge?.belowCredits) {
      setBelowCredits(String(walletCreditRecharge.belowCredits));
    }
    if (walletCreditRecharge?.addCredits) {
      setAddCredits(String(walletCreditRecharge.addCredits));
    }
  }

  const transactions = allTransactions.filter(
    t =>
      (type === 'All' || t.type === type) &&
      `${t.description} ${t.service} ${t.date} ${t.type}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  const handleToggleAutoRenew = async (enabled: boolean) => {
    if (!live || renewBusy) return;
    setRenewBusy(true);
    setError('');
    setNotice('');
    try {
      await billing('setAutoRenew', { enabled });
      setNotice(
        enabled
          ? translateText('Automatic subscription renewal via Wallet enabled.')
          : translateText('Automatic subscription renewal disabled.'),
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setRenewBusy(false);
    }
  };

  function table() {
    return (
      <Card
        className="st-transactions"
        title={translateText('Wallet Transactions')}
        description="All wallet top-ups, plan payments, auto-renewals, and service usage."
      >
        {localizeNode(
          <div className="st-table-filters">
            <label className="st-search">
              <Search size={15} />
              <input
                aria-label={translateText('Search transactions')}
                value={query}
                placeholder={translateText('Search transactions…')}
                onChange={e => setQuery(e.target.value)}
              />
            </label>
            <Select
              label="Transaction type"
              value={type}
              onChange={value => setType(value)}
              options={[
                'All',
                'Top Up',
                'Plan Payment',
                'Renewal',
                'Auto-Renewal',
                'Add-on',
                'Auto-Recharge',
                'Usage',
              ]}
            />
          </div>,
        )}
        <div className="st-table-scroll">
          <table>
            <thead>
              <tr>
                {localizeNode(
                  [
                    'Date',
                    'Type',
                    'Description',
                    'Service',
                    'Amount',
                    ...(!managed ? ['Balance'] : []),
                  ].map(col => (
                    <th
                      key={col}
                      className={
                        ['Date', 'Amount', 'Balance'].includes(col)
                          ? 'text-center'
                          : 'text-start'
                      }
                    >
                      {localizeNode(col)}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {localizeNode(
                transactions.map(t => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    formatAmount={fmt}
                    showBalance={!managed}
                  />
                )),
              )}
            </tbody>
          </table>
        </div>
        {localizeNode(
          !transactions.length && (
            <div className="st-empty">
              <Receipt size={25} />
              <p>{translateText('No transactions to show.')}</p>
            </div>
          ),
        )}
      </Card>
    );
  }

  function usage(metaOnly = false) {
    const rows = metaOnly ? metaUsage : usageRows;
    if (metaOnly && !rows.length) return null;
    return (
      <Card
        title={translateText('Usage Overview')}
        description={
          metaOnly
            ? 'Recorded Meta messaging charges this month.'
            : 'Your wallet usage across different services this month.'
        }
        action={
          <span className="st-date-range">
            <CalendarDays size={14} />
            {localizeNode(usagePeriod)}
          </span>
        }
      >
        <div className="st-usage-grid">
          {localizeNode(
            rows.map(u => {
              const Icon = serviceIcon(u.service);
              return (
                <div key={u.service} className="st-usage-service">
                  <div className="st-usage-detail">
                    <span className={`st-service-icon ${serviceColor(u.service)}`}>
                      <Icon size={19} />
                    </span>
                    <div>
                      <small>{localizeNode(u.service)}</small>
                      <b>{localizeNode(fmt(u.amount))}</b>
                      <p>{localizeNode(u.detail)}</p>
                    </div>
                  </div>
                  <div className="st-progress-row">
                    <div className="st-progress">
                      <span
                        className={serviceColor(u.service)}
                        style={{
                          width: `${Math.max(0, Math.min(100, u.percentage))}%`,
                        }}
                      />
                    </div>
                    <small>{localizeNode(u.percentage)}%</small>
                  </div>
                </div>
              );
            }),
          )}
        </div>
      </Card>
    );
  }

  return (
    <div dir={language.startsWith('ar') ? 'rtl' : 'ltr'}>
      <nav className="st-billing-tabs" aria-label={translateText('Billing navigation')}>
        {billingTabs.map(item => (
          <button
            type="button"
            key={item.id}
            aria-current={tab === item.id ? 'page' : undefined}
            className={tab === item.id ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={16} />
            {translateText(item.name)}
          </button>
        ))}
      </nav>

      {agencyUid ? (
        tab === 'overview' ? (
          <AgencyBilling uid={agencyUid} showWalletBalance={!managed} />
        ) : tab === 'wallet' ? (
          <div className="space-y-4">
            <AgencyBilling uid={agencyUid} showWalletBalance={!managed} />
            <MetaWalletPanel integrations={integrations} />
          </div>
        ) : (
          <Card title="Shared billing">
            <p>
              {translateText('The Platform Admin manages billing for this workspace.')}
            </p>
          </Card>
        )
      ) : (
        <>
          {error && (
            <p className="st-error" role="alert">
              {localizeNode(error)}
            </p>
          )}
          {notice && !showTopup && (
            <p className="st-note" role="status">
              {localizeNode(notice)}
            </p>
          )}

          {(tab === 'overview' || tab === 'plans') && (
            <MySubscription
              audience="user"
              section={tab}
              onSectionChange={next => setTab(next)}
            />
          )}

          {tab === 'invoices' && (
            <div className="bl">
              <InvoicesPanel mode="subscriber" audience="user" />
            </div>
          )}

          {tab === 'wallet' && (
            <div className="space-y-5">
              {!managed && pendingTopup && (
                <div className="mb-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock size={20} className="animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {translateText('Top-Up Request Pending Review')}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          {translateText('Awaiting Approval')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {translateText('You requested a wallet top-up of')}{' '}
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">
                          €{(pendingTopup.totalAmount ?? pendingTopup.subtotal ?? 0).toFixed(2)}
                        </strong>{' '}
                        {translateText('via')}{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {pendingTopup.paymentMethod || 'Manual Transfer'}
                        </span>{' '}
                        {translateText('on')}{' '}
                        {new Date(pendingTopup.createdAt).toLocaleDateString()}.{' '}
                        {translateText(
                          'Your request is being reviewed by administration. You cannot send another top-up request until this request is approved or rejected.',
                        )}
                      </p>
                      {pendingTopup.transactionId && (
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {translateText('Reference:')} {pendingTopup.transactionId}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                      <Clock size={13} />
                      <span>{translateText('In Review')}</span>
                    </span>
                  </div>
                </div>
              )}

              {!managed && (
                <div>
                  <Card className="st-balance-card">
                    <span className="st-wallet-orb">
                      <Wallet size={31} />
                    </span>
                    <div>
                      <small>{translateText('Wallet Balance')}</small>
                      <strong>{localizeNode(fmt(balance))}</strong>
                      <p>
                        {translateText(
                          'Available to pay instantly for plans, renewals, add-ons, auto-recharge, and messaging channels.',
                        )}
                      </p>
                    </div>
                    <div className="st-balance-actions">
                      <button
                        className="st-primary"
                        disabled={!!pendingTopup}
                        title={
                          pendingTopup
                            ? translateText('Top-up request awaiting approval')
                            : undefined
                        }
                        onClick={() => {
                          if (pendingTopup) return;
                          setShowTopup(true);
                        }}
                      >
                        {pendingTopup ? (
                          <>
                            <Clock size={14} />
                            {translateText('Top-Up In Review…')}
                          </>
                        ) : (
                          <>
                            <Plus size={15} />
                            {translateText('Top Up Wallet')}
                          </>
                        )}
                      </button>
                      <div className="st-balance-recharge">
                        <button
                          className="st-link"
                          onClick={() =>
                            rechargeRef.current?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'center',
                            })
                          }
                        >
                          <RefreshCw size={13} />
                          {translateText('Auto-Renew & Recharge')}
                        </button>
                        <Toggle
                          label="Auto-Renewal via Wallet"
                          checked={autoRenewEnabled}
                          onChange={enabled => void handleToggleAutoRenew(enabled)}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              <div className={managed ? 'st-wallet-main' : 'st-wallet-grid'}>
                <div className="st-wallet-main">
                  {usage()}
                  {table()}
                  <MySubscription audience="user" section="history" />
                </div>

                {!managed && (
                  <aside className="st-wallet-side">
                    <section ref={creditsRef}>
                      <Card
                        title={translateText('Top Up Wallet')}
                        description="Add funds to your wallet for instant plan payments, renewals, and services."
                      >
                        <div className="st-credit-amounts">
                          {localizeNode(
                            [10, 25, 50, 100].map(n => (
                              <button
                                type="button"
                                key={n}
                                className={n === amount ? 'active' : ''}
                                aria-pressed={n === amount}
                                disabled={!!pendingTopup}
                                onClick={() => handleSelectTopupPreset(n)}
                              >
                                {fmt(n)}
                              </button>
                            )),
                          )}
                        </div>
                        <div className="mb-3">
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            {translateText('Or enter a specific amount')} ({walletCurrency})
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-xs font-bold text-slate-400">
                              {walletCurrency === 'EUR' ? '€' : walletCurrency}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={!!pendingTopup}
                              value={customAmountInput}
                              onChange={e => handleCustomTopupChange(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !pendingTopup && isCustomAmountValid) {
                                  e.preventDefault();
                                  setShowTopup(true);
                                }
                              }}
                              placeholder={translateText('Enter specific amount…')}
                              aria-label={translateText('Enter specific wallet top-up amount')}
                              className="w-full rounded-lg border border-slate-200 bg-white py-2 ps-8 pe-3 text-xs font-semibold text-slate-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                          </div>
                          {!isCustomAmountValid && (
                            <small className="mt-1 block text-[11px] text-rose-500">
                              {translateText('Enter an amount between 1 and 100,000.')}
                            </small>
                          )}
                        </div>
                        <button
                          type="button"
                          className="st-primary st-full"
                          disabled={!!pendingTopup || !isCustomAmountValid}
                          title={
                            pendingTopup
                              ? translateText('Top-up request awaiting approval')
                              : undefined
                          }
                          onClick={() => {
                            if (pendingTopup || !isCustomAmountValid) return;
                            setShowTopup(true);
                          }}
                        >
                          {pendingTopup
                            ? translateText('Awaiting Admin Approval')
                            : `${translateText('Top Up')} ${fmt(amount)}`}
                          {!pendingTopup && <ArrowRight size={15} />}
                        </button>
                      </Card>
                    </section>

                    <section ref={rechargeRef}>
                      <Card
                        title={translateText('Auto-Renewal & Auto-Recharge')}
                        description="Automatically renew your subscription and recharge low credits from your Wallet."
                      >
                        <div className="space-y-4">
                          {/* Auto-Renewal Toggle */}
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <RefreshCw size={13} className="text-emerald-600" />
                                {translateText('Auto-Renew Subscription')}
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                {translateText(
                                  'Deduct renewal from Wallet when sufficient funds exist.',
                                )}
                              </p>
                            </div>
                            <Toggle
                              label="Enable Auto-Renew Subscription"
                              checked={autoRenewEnabled}
                              onChange={enabled => void handleToggleAutoRenew(enabled)}
                            />
                          </div>

                          {/* Low-Balance Credit Auto-Recharge Toggle */}
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Zap size={13} className="text-indigo-600" />
                                {translateText('Low-Balance Auto-Recharge')}
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                {translateText(
                                  'Top up AI credits automatically from Wallet when low.',
                                )}
                              </p>
                            </div>
                            <Toggle
                              label="Enable Auto Recharge"
                              checked={recharge.enabled}
                              onChange={enabled =>
                                setRecharge({
                                  ...recharge,
                                  enabled,
                                  below: recharge.below || '10',
                                  amount: recharge.amount || '25',
                                  method: 'wallet',
                                })
                              }
                            />
                          </div>

                          <div className="st-recharge-fields">
                            <Field label="When AI credits drop below">
                              <input
                                type="number"
                                min={1}
                                step={1}
                                disabled={!recharge.enabled}
                                value={belowCredits}
                                onChange={e => setBelowCredits(e.target.value)}
                                placeholder={translateText('Enter credits threshold…')}
                              />
                            </Field>
                            <Field label="Auto-add AI credits from Wallet">
                              <input
                                type="number"
                                min={1}
                                step={1}
                                disabled={!recharge.enabled}
                                value={addCredits}
                                onChange={e => setAddCredits(e.target.value)}
                                placeholder={translateText('Enter credits to add…')}
                              />
                            </Field>
                            <Field label="Low Wallet Balance Alert (€)">
                              <input
                                type="number"
                                min={1}
                                step="0.01"
                                value={recharge.below}
                                onChange={e => setRecharge({ ...recharge, below: e.target.value })}
                                placeholder={translateText('Enter alert balance…')}
                              />
                            </Field>
                          </div>

                          <button
                            className="st-soft-button st-full"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              setError('');
                              setNotice('');
                              try {
                                const payloadRecharge = {
                                  enabled: recharge.enabled,
                                  below: recharge.below || '10',
                                  amount: recharge.amount || '25',
                                  method: 'wallet',
                                };
                                if (live) {
                                  const result = await billing<{
                                    wallet?: { autoRecharge?: typeof payloadRecharge };
                                  }>('saveWalletSettings', {
                                    autoRenew: autoRenewEnabled,
                                    autoRecharge: payloadRecharge,
                                    creditAutoRecharge: {
                                      enabled: recharge.enabled,
                                      belowCredits: Number(belowCredits) || 100,
                                      addCredits: Number(addCredits) || 500,
                                    },
                                  });
                                  if (result.wallet?.autoRecharge) {
                                    setRecharge(result.wallet.autoRecharge);
                                  }
                                  setNotice(translateText('Wallet & auto-recharge settings saved.'));
                                } else if (settingsApiEnabled) {
                                  await settingsRequest(
                                    '/billing/recharge',
                                    payloadRecharge,
                                    'PATCH',
                                  );
                                  await refresh();
                                } else {
                                  await saveLocal({ ...data, recharge: payloadRecharge });
                                }
                              } catch (e) {
                                setError(friendlyError(e));
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {localizeNode(busy ? 'Saving…' : 'Save Automation Settings')}
                          </button>
                        </div>
                      </Card>
                    </section>
                  </aside>
                )}
              </div>

              <MetaWalletPanel integrations={integrations} />
            </div>
          )}

          {tab === 'payment-methods' && (
            <>
              <PaymentMethodsPanel scope="user" />
              <div className="bl">
                <RequestsPanel
                  requests={userRequests}
                  mode="outgoing"
                  title={translateText('Payment Requests & Receipts')}
                />
              </div>
            </>
          )}

          {!managed && showTopup && (
            <WalletTopupModal
              initialAmount={amount}
              currency={wallet?.currency ?? WALLET_CURRENCY}
              onClose={close}
              onSuccess={() => {
                close();
                setNotice(
                  translateText(
                    'Top-up request processed. Your balance updates automatically.',
                  ),
                );
                void refresh();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function TransactionRow({
  transaction: t,
  formatAmount,
  showBalance,
}: {
  transaction: Transaction;
  formatAmount: (amount: number) => string;
  showBalance: boolean;
}) {
  useUILanguage();
  const Icon = serviceIcon(t.service);
  return (
    <tr>
      <td className="text-center">{localizeNode(t.date)}</td>
      <td className="text-start">
        <span className="st-transaction-type">
          <span className={`st-service-icon ${t.amount > 0 ? 'green' : 'purple'}`}>
            {localizeNode(t.amount > 0 ? <Plus size={13} /> : <FileText size={13} />)}
          </span>
          {localizeNode(t.type)}
        </span>
      </td>
      <td className="text-start">{localizeNode(t.description)}</td>
      <td className="text-start">
        <span className="st-transaction-service">
          {localizeNode(
            t.service !== '—' && t.service !== 'Wallet' && (
              <Icon size={13} className={serviceColor(t.service)} />
            ),
          )}{' '}
          {localizeNode(t.service)}
        </span>
      </td>
      <td
        className={`text-center ${
          t.amount > 0 ? 'st-amount-positive' : 'st-amount-negative'
        }`}
      >
        {localizeNode(t.amount > 0 ? '+' : '-')}
        {localizeNode(formatAmount(Math.abs(t.amount)))}
      </td>
      {showBalance && <td className="text-center">{localizeNode(formatAmount(t.balance))}</td>}
    </tr>
  );
}
