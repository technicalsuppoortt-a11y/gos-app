import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ChartNoAxesCombined, Check, Clock, CreditCard, Layers, FileText, Landmark, Mail, MessageCircle, MoreHorizontal, Plus, Receipt, RefreshCw, Search, Sparkles, Wallet } from 'lucide-react';
import { Card, Field, Toggle } from './kit';
import { Select } from '../../components/ui/Select';
import { friendlyError, settingsApiEnabled, settingsRequest } from './data';
import type { SettingsData, Transaction } from './data';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { canViewCashWallet } from '../../store/cashWalletVisibility';
import { AgencyBilling } from '../billing/AgencyBilling';
import { RequestsPanel } from '../billing/ProviderPanels';
import { MetaWalletPanel } from './MetaWalletPanel';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { MySubscription } from '../billing/MySubscription';
import { WalletTopupModal } from '../billing/WalletTopupModal';
import { billing, useBillingIdentity, useCommunicationLedger, useCommunicationWallet, useRequests, WALLET_CURRENCY, type WalletLedgerRow } from '../../backend/billing';
import { auth } from '../../backend/firebase';

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', EGP: 'E£', SAR: 'SAR ', AED: 'AED ' };
const META_CHANNELS = new Set(['whatsapp', 'facebook', 'instagram', 'messenger']);
const CHANNEL_LABELS: Record<string, string> = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS', instagram: 'Instagram', facebook: 'Facebook', messenger: 'Messenger', webchat: 'Web Chat' };
const ENTRY_TYPES: Record<string, string> = { wallet_topup: 'Top Up', manual_adjustment: 'Adjustment', refund_reversal: 'Refund', transfer_out: 'Transfer' };
const money = (amount: number, symbol = '€') => `${symbol}${amount !== 0 && Math.abs(amount) < 0.01 ? amount.toFixed(4) : amount.toFixed(2)}`;
const serviceIcon = (name: string) => name === 'WhatsApp' ? MessageCircle : name === 'Email' ? Mail : name === 'AI Follow-Up' ? Sparkles : MoreHorizontal;
const serviceColor = (name: string) => name === 'WhatsApp' ? 'green' : name === 'Email' ? 'blue' : name === 'AI Follow-Up' ? 'purple' : 'neutral';
const billingTabs = [
  { id: 'overview', icon: CreditCard, name: 'Overview & Subscription' },
  { id: 'plans', icon: Layers, name: 'Plans' },
  { id: 'wallet', icon: Wallet, name: 'Meta Advertising & API Wallet' },
  { id: 'usage', icon: ChartNoAxesCombined, name: 'Usage & History' },
  { id: 'payment-methods', icon: Landmark, name: 'Payment Methods' },
] as const;
type BillingTab = (typeof billingTabs)[number]['id'];

/** Communication Wallet ledger row → table row. */
function ledgerToTransaction(row: WalletLedgerRow, fallbackBalance: number): Transaction {
  const usage = !ENTRY_TYPES[row.usage_type];
  const label = row.channel ? CHANNEL_LABELS[row.channel] ?? row.channel : '—';
  return { id: row.id, date: new Date(row.created_at).toLocaleDateString(), type: ENTRY_TYPES[row.usage_type] ?? 'Usage', description: `${row.description || (usage ? `${label} message` : 'Wallet')}${row.status === 'pending' ? ' (pending)' : ''}`, service: usage ? label : '—', amount: row.amount, balance: row.balance_after ?? fallbackBalance };
}
/** Current-month carrier usage per channel (communication only — AI never appears here). */
function summarizeUsage(rows: WalletLedgerRow[]) {
  const today = new Date(), start = new Date(today.getFullYear(), today.getMonth(), 1);
  const groups = new Map<string, { amount: number; count: number }>();
  for (const row of rows) {
    if (ENTRY_TYPES[row.usage_type] || !row.channel || !['pending', 'confirmed'].includes(row.status) || new Date(row.created_at) < start) continue;
    const label = CHANNEL_LABELS[row.channel] ?? row.channel, group = groups.get(label) ?? { amount: 0, count: 0 };
    groups.set(label, { amount: group.amount + (row.customer_charge || 0), count: group.count + (row.quantity || 1) });
  }
  const total = [...groups.values()].reduce((sum, group) => sum + group.amount, 0);
  const day = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return {
    usageRows: [...groups.entries()].map(([service, group]) => ({ service, amount: group.amount, detail: `${group.count} ${group.count === 1 ? 'message' : 'messages'}`, percentage: total ? Math.round((group.amount / total) * 100) : 0 })),
    usagePeriod: `${day(start)} – ${day(today)}, ${today.getFullYear()}`,
  };
}
export function BillingPanel({ data, integrations, refresh, saveLocal, agencyUid }: {
  data: SettingsData;
  integrations?: SettingsData['integrations'];
  refresh: () => Promise<void>;
  saveLocal: (data: SettingsData) => Promise<void>;
  agencyUid: string | null;
}) {
  const language = useUILanguage();
  const managed = !useSelector(canViewCashWallet);
  const [params, setParams] = useSearchParams();
  const urlTab = params.get('tab');
  const tab = urlTab === 'transactions' ? 'usage' : billingTabs.find(item => item.id === urlTab)?.id ?? 'overview';
  const setTab = (value: BillingTab) => {
    setParams(current => {
      current.set('tab', value);
      return current;
    }, { replace: true });
  };
  const [amount, setAmount] = useState(50), [recharge, setRecharge] = useState(data.recharge), [showTopup, setShowTopup] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [query, setQuery] = useState(''), [type, setType] = useState('All');
  const rechargeRef = useRef<HTMLElement>(null), creditsRef = useRef<HTMLElement>(null);
  const close = useCallback(() => { setShowTopup(false); setError(''); }, []);
  const identity = useBillingIdentity();
  const uid = agencyUid ? null : identity.uid || auth.currentUser?.uid || null;
  const live = !!uid;
  const { data: wallet } = useCommunicationWallet(uid);
  const { data: ledger } = useCommunicationLedger(uid, wallet?.updatedAt);
  const { data: userRequests } = useRequests('requesterId', uid);
  const pendingTopup = useMemo(() => {
    return (userRequests || []).find(r => r && r.type === 'wallet_topup' && r.status === 'pending');
  }, [userRequests]);
  const [notice, setNotice] = useState('');
  const symbol = CURRENCY_SYMBOLS[wallet?.currency ?? WALLET_CURRENCY] ?? '€';
  const fmt = (value: number) => money(value, symbol);
  const balance = live ? (wallet ? Math.round((wallet.balance - (wallet.held ?? 0)) * 10000) / 10000 : 0) : data.balance;
  const allTransactions = useMemo(() => live ? ledger.map(row => ledgerToTransaction(row, wallet?.balance ?? 0)) : data.transactions, [live, ledger, wallet?.balance, data.transactions]);
  const { usageRows, usagePeriod } = useMemo(() => live ? summarizeUsage(ledger) : { usageRows: data.usage, usagePeriod: data.usagePeriod }, [live, ledger, data.usage, data.usagePeriod]);
  const metaUsage = useMemo(() => summarizeUsage(ledger.filter(row => row.status === 'confirmed' && META_CHANNELS.has(row.channel ?? ''))).usageRows, [ledger]);
  const walletRecharge = wallet?.autoRecharge ?? data.recharge;
  const [syncedRecharge, setSyncedRecharge] = useState(walletRecharge);
  if (walletRecharge !== syncedRecharge) { setSyncedRecharge(walletRecharge); setRecharge(walletRecharge); }
  const transactions = allTransactions.filter(t => (type === 'All' || t.type === type) && `${t.description} ${t.service} ${t.date}`.toLowerCase().includes(query.toLowerCase()));
  function table() {
    return <Card className="st-transactions" title={translateText('Transactions')} description="All wallet transactions, usage and top-ups.">
      {localizeNode(<div className="st-table-filters"><label className="st-search"><Search size={15}/><input aria-label={translateText("Search transactions")} value={query} placeholder={translateText("Search transactions…")} onChange={e => setQuery(e.target.value)}/></label><Select label="Transaction type" value={type} onChange={value => setType(value)} options={['All', 'Usage', 'Top Up']} /></div>)}
      <div className="st-table-scroll"><table><thead><tr>{localizeNode(['Date', 'Type', 'Description', 'Service', 'Amount', ...(!managed ? ['Balance'] : [])].map(c => <th key={c} className={['Date', 'Amount', 'Balance'].includes(c) ? 'text-center' : 'text-start'}>{localizeNode(c)}</th>))}</tr></thead><tbody>{localizeNode(transactions.map(t => <TransactionRow key={t.id} transaction={t} symbol={symbol} showBalance={!managed}/>))}</tbody></table></div>{localizeNode(!transactions.length && <div className="st-empty"><Receipt size={25}/><p>{translateText("No transactions to show.")}</p></div>)}
    </Card>;
  }
  function usage(metaOnly = false) {
    const rows = metaOnly ? metaUsage : usageRows;
    if (metaOnly && !rows.length) return null;
    return <Card title={translateText("Usage Overview")} description={metaOnly ? "Recorded Meta messaging charges this month." : "Your wallet usage across different services this month."} action={<span className="st-date-range"><CalendarDays size={14}/>{localizeNode(usagePeriod)}</span>}><div className="st-usage-grid">{localizeNode(rows.map(u => { const Icon = serviceIcon(u.service); return <div key={u.service} className="st-usage-service"><div className="st-usage-detail"><span className={`st-service-icon ${serviceColor(u.service)}`}><Icon size={19}/></span><div><small>{localizeNode(u.service)}</small><b>{localizeNode(fmt(u.amount))}</b><p>{localizeNode(u.detail)}</p></div></div><div className="st-progress-row"><div className="st-progress"><span className={serviceColor(u.service)} style={{ width: `${Math.max(0, Math.min(100, u.percentage))}%` }}/></div><small>{localizeNode(u.percentage)}%</small></div></div>; }))}</div></Card>;
  }
  return <div dir={language.startsWith("ar") ? "rtl" : "ltr"}>
    <nav className="st-billing-tabs" aria-label={translateText("Billing navigation")}>
      {billingTabs.map(item => <button type="button" key={item.id} aria-current={tab === item.id ? "page" : undefined} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><item.icon size={16}/>{translateText(item.name)}</button>)}
    </nav>
    {tab === "wallet" && <><MetaWalletPanel integrations={integrations}/>{!agencyUid && usage(true)}</>}
    {agencyUid ? (tab === "overview" ? <AgencyBilling uid={agencyUid} showWalletBalance={!managed}/> : tab !== "wallet" && <Card title="Shared billing"><p>{translateText("The Platform Admin manages billing for this workspace.")}</p></Card>) : <>
    {error && <p className="st-error" role="alert">{localizeNode(error)}</p>}
    {notice && !showTopup && <p className="st-note" role="status">{localizeNode(notice)}</p>}
    {(tab === "overview" || tab === "plans" || tab === "usage") && <MySubscription audience="user" section={tab === "usage" ? "history" : tab} onSectionChange={setTab}/>}
    {tab === "usage" && <>
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
              {translateText('You requested a wallet top-up of')} <strong className="text-slate-900 dark:text-slate-100 font-bold">€{(pendingTopup.totalAmount ?? pendingTopup.subtotal ?? 0).toFixed(2)}</strong> {translateText('via')} <span className="font-semibold text-slate-800 dark:text-slate-200">{pendingTopup.paymentMethod || 'Manual Transfer'}</span> {translateText('on')} {new Date(pendingTopup.createdAt).toLocaleDateString()}. {translateText('Your request is being reviewed by administration. You cannot send another top-up request until this request is approved or rejected.')}
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
    {!managed && <div><Card className="st-balance-card"><span className="st-wallet-orb"><Wallet size={31}/></span><div><small>{translateText("Wallet Balance")}</small><strong>{localizeNode(fmt(balance))}</strong><p>{translateText("Funds available for supported communication services.")}</p></div><div className="st-balance-actions"><button className="st-primary" disabled={!!pendingTopup} title={pendingTopup ? translateText('Top-up request awaiting approval') : undefined} onClick={() => { if (pendingTopup) return; setShowTopup(true); }}>{pendingTopup ? <><Clock size={14}/>{translateText("Top-Up In Review…")}</> : <><Plus size={15}/>{translateText("Top Up")}</>}</button><div className="st-balance-recharge"><button className="st-link" onClick={() => rechargeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><RefreshCw size={13}/>{translateText("Auto Recharge")}</button><Toggle label="Auto Recharge" checked={recharge.enabled} onChange={enabled => setRecharge({ ...recharge, enabled })}/></div></div></Card></div>}
    <div className={managed ? "st-wallet-main" : "st-wallet-grid"}><div className="st-wallet-main">{usage()}{table()}</div>{!managed && <aside className="st-wallet-side">
      <section ref={creditsRef}><Card title={translateText("Top Up")} description="Top up your wallet to fund supported communication services."><div className="st-credit-amounts">{localizeNode([10, 25, 50, 100].map(n => <button key={n} className={n === amount ? 'active' : ''} aria-pressed={n === amount} disabled={!!pendingTopup} onClick={() => setAmount(n)}>€{localizeNode(n)}</button>))}</div><button className="st-primary st-full" disabled={!!pendingTopup} title={pendingTopup ? translateText('Top-up request awaiting approval') : undefined} onClick={() => { if (pendingTopup) return; setShowTopup(true); }}>{pendingTopup ? translateText('Awaiting Admin Approval') : `${translateText("Add €")}${amount}${translateText(" Credits ")}`}{!pendingTopup && <ArrowRight size={15}/>}</button></Card></section>
      <section ref={rechargeRef}><Card title={translateText("Auto Recharge")} description="Automatically add credits when your balance is low." action={<Toggle label="Enable Auto Recharge" checked={recharge.enabled} onChange={enabled => setRecharge({ ...recharge, enabled })}/>}><div className="st-recharge-fields"><Field label="When balance is below"><Select disabled={!recharge.enabled} value={String(recharge.below)} onChange={value => setRecharge({ ...recharge, below: value })} options={[5, 10, 20, 50].map(n => ({ value: String(n), label: `€${n}` }))} /></Field><Field label="Add this amount"><Select disabled={!recharge.enabled} value={String(recharge.amount)} onChange={value => setRecharge({ ...recharge, amount: value })} options={[10, 25, 50, 100].map(n => ({ value: String(n), label: `€${n}` }))} /></Field><Field label="Payment method"><Select disabled={!recharge.enabled} value={String(recharge.method)} onChange={value => setRecharge({ ...recharge, method: value })} options={data.paymentMethods.filter(m => m.kind !== 'bank').map(m => ({ value: String(m.id), label: `${m.name}${m.kind === 'card' ? ' •••• 4242' : ''}` }))} /></Field></div><button className="st-soft-button st-full" disabled={busy} onClick={async () => { setBusy(true); setError(''); setNotice(''); try { if (live) { const result = await billing<{ wallet?: { autoRecharge?: typeof recharge } }>('saveWalletSettings', { autoRecharge: recharge }); if (result.wallet?.autoRecharge) setRecharge(result.wallet.autoRecharge); setNotice('Wallet settings saved.'); } else if (settingsApiEnabled) { await settingsRequest('/billing/recharge', recharge, 'PATCH'); await refresh(); } else { await saveLocal({ ...data, recharge }); } } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}>{localizeNode(busy ? 'Saving…' : 'Save Settings')}</button></Card></section>
    </aside>}</div>
    </>}
    {tab === "payment-methods" && <>
      <PaymentMethodsPanel scope="user"/>
      <div className="bl"><RequestsPanel requests={userRequests} mode="outgoing" title={translateText("Invoices & receipts")}/></div>
    </>}
    {!managed && tab === "usage" && showTopup && (
      <WalletTopupModal
        initialAmount={amount}
        currency={wallet?.currency ?? WALLET_CURRENCY}
        onClose={close}
        onSuccess={() => {
          close();
          setNotice(translateText('Top-up request processed. Your balance updates automatically.'));
          void refresh();
        }}
      />
    )}
    </>}
  </div>;
}
function TransactionRow({ transaction: t, symbol = '€', showBalance }: { transaction: Transaction; symbol?: string; showBalance: boolean }) {
  useUILanguage();
  const Icon = serviceIcon(t.service);
  return <tr><td className="text-center">{localizeNode(t.date)}</td><td className="text-start"><span className="st-transaction-type"><span className={`st-service-icon ${t.amount > 0 ? 'green' : 'purple'}`}>{localizeNode(t.amount > 0 ? <Plus size={13}/> : <FileText size={13}/>)}</span>{localizeNode(t.type)}</span></td><td className="text-start">{localizeNode(t.description)}</td><td className="text-start"><span className="st-transaction-service">{localizeNode(t.service !== '—' && <Icon size={13} className={serviceColor(t.service)}/>)} {localizeNode(t.service)}</span></td><td className={`text-center ${t.amount > 0 ? 'st-amount-positive' : 'st-amount-negative'}`}>{localizeNode(t.amount > 0 ? '+' : '-')}{localizeNode(money(Math.abs(t.amount), symbol))}</td>{showBalance && <td className="text-center">{localizeNode(money(t.balance, symbol))}</td>}</tr>;
}
