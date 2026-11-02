import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ChartNoAxesCombined, Check, Clock, CreditCard, Crown, FileText, Landmark, Mail, MessageCircle, MoreHorizontal, Plus, Receipt, RefreshCw, Search, Sparkles, Wallet } from 'lucide-react';
import { Badge, Card, Field, Modal, Toggle } from './kit';
import { Select } from '../../components/ui/Select';
import { friendlyError, safeExternalUrl, settingsApiEnabled, settingsRequest } from './data';
import type { SettingsData, Transaction } from './data';
import { useSearchParams } from 'react-router-dom';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { MySubscription } from '../billing/MySubscription';
import { WalletTopupModal } from '../billing/WalletTopupModal';
import { billing, isLive as subscriptionIsLive, useBillingIdentity, useCommunicationLedger, useCommunicationWallet, useRequests, useSubscription, WALLET_CURRENCY, type BillingSubscription, type WalletLedgerRow } from '../../backend/billing';
import { auth } from '../../backend/firebase';
import { localDemoEnabled } from '../../backend/localDemo';

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', EGP: 'E£', SAR: 'SAR ', AED: 'AED ' };
const CHANNEL_LABELS: Record<string, string> = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS', instagram: 'Instagram', messenger: 'Messenger', webchat: 'Web Chat' };
const ENTRY_TYPES: Record<string, string> = { wallet_topup: 'Top Up', manual_adjustment: 'Adjustment', refund_reversal: 'Refund', transfer_out: 'Transfer' };
const money = (amount: number, symbol = '€') => `${symbol}${amount !== 0 && Math.abs(amount) < 0.01 ? amount.toFixed(4) : amount.toFixed(2)}`;
const serviceIcon = (name: string) => name === 'WhatsApp' ? MessageCircle : name === 'Email' ? Mail : name === 'AI Follow-Up' ? Sparkles : MoreHorizontal;
const serviceColor = (name: string) => name === 'WhatsApp' ? 'green' : name === 'Email' ? 'blue' : name === 'AI Follow-Up' ? 'purple' : 'neutral';
const billingTabs = [{ icon: CreditCard, name: 'Subscription' }, { icon: Wallet, name: 'Wallet' }, { icon: ChartNoAxesCombined, name: 'Usage' }, { icon: Receipt, name: 'Transactions' }, { icon: Landmark, name: 'Payment Methods' }];

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
function subscriptionPlan(sub: BillingSubscription | null, lang: string) {
  if (!sub?.plan) return { name: 'No active plan', price: 0, active: false, renewal: '', currency: 'EUR' };
  return { name: (lang.startsWith('ar') ? sub.plan.name?.ar : '') || sub.plan.name?.en || '', price: sub.plan.price ?? 0, active: subscriptionIsLive(sub), renewal: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—', currency: sub.plan.currency };
}
export function BillingPanel({ data, refresh, saveLocal }: { data: SettingsData; refresh: () => Promise<void>; saveLocal: (data: SettingsData) => Promise<void> }) {
  const lang = useUILanguage();
  const [params, setParams] = useSearchParams();
  const urlTab = params.get('tab');
  const getTabFromUrl = (t: string | null) => {
    if (t === 'payment-methods') return 'Payment Methods';
    if (t === 'wallet') return 'Wallet';
    if (t === 'usage') return 'Usage';
    if (t === 'transactions') return 'Transactions';
    if (t === 'subscription') return 'Subscription';
    return null;
  };
  const [localTab, setLocalTab] = useState(() => getTabFromUrl(urlTab) || 'Subscription');
  const tab = getTabFromUrl(urlTab) || localTab;
  const setTab = (value: string) => {
    setLocalTab(value);
    setParams(p => {
      const slug = value === 'Payment Methods' ? 'payment-methods' : value.toLowerCase();
      p.set('tab', slug);
      return p;
    }, { replace: true });
  };
  const [amount, setAmount] = useState(50), [recharge, setRecharge] = useState(data.recharge), [dialog, setDialog] = useState<'credits' | 'method' | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [method, setMethod] = useState('card'), [query, setQuery] = useState(''), [type, setType] = useState('All');
  const rechargeRef = useRef<HTMLElement>(null), creditsRef = useRef<HTMLElement>(null);
  const idempotency = useRef<string | null>(null);
  const close = useCallback(() => { setDialog(null); setError(''); }, []);
  // Live mode: the Wallet tab is the Communication Wallet (external carrier costs), separate from plan credits.
  const identity = useBillingIdentity();
  const uid = identity.uid || auth.currentUser?.uid || null;
  const live = !!uid;
  const { data: wallet } = useCommunicationWallet(uid);
  const { data: ledger } = useCommunicationLedger(uid, wallet?.updatedAt);
  const { data: sub } = useSubscription(uid);
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
  const planView = live ? subscriptionPlan(sub, lang) : { ...data.plan, currency: 'EUR' };
  const planSymbol = CURRENCY_SYMBOLS[planView.currency] ?? '€';
  const walletRecharge = wallet?.autoRecharge;
  const [syncedRecharge, setSyncedRecharge] = useState(walletRecharge);
  if (live && walletRecharge && walletRecharge !== syncedRecharge) { setSyncedRecharge(walletRecharge); setRecharge(walletRecharge); }
  async function requestTopup() {
    await billing('requestWalletTopup', { amount, currency: wallet?.currency ?? WALLET_CURRENCY, paymentMethod: method, idempotencyKey: idempotency.current });
    close();
    setNotice(`Top-up request for ${fmt(amount)} sent. Your balance updates once the payment is approved.`);
  }
  async function subscription() {
    setBusy(true); setError('');
    try { const result = await settingsRequest<{ url: string }>('/billing/portal', { returnUrl: window.location.href }); window.location.assign(safeExternalUrl(result.url)); } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }
  const transactions = allTransactions.filter(t => (type === 'All' || t.type === type) && `${t.description} ${t.service} ${t.date}`.toLowerCase().includes(query.toLowerCase()));
  function table(full = false) {
    return <Card className="st-transactions" title={translateText(full ? 'Transactions' : 'Recent Transactions')} description="All wallet transactions, usage and top-ups." action={!full && <button className="st-link" onClick={() => setTab('Transactions')}>{translateText("View All ")}<ArrowRight size={14}/></button>}>
      {localizeNode(full && <div className="st-table-filters"><label className="st-search"><Search size={15}/><input aria-label={translateText("Search transactions")} value={query} placeholder={translateText("Search transactions…")} onChange={e => setQuery(e.target.value)}/></label><Select label="Transaction type" value={type} onChange={value => setType(value)} options={['All', 'Usage', 'Top Up']} /></div>)}
      <div className="st-table-scroll"><table><thead><tr>{localizeNode(['Date', 'Type', 'Description', 'Service', 'Amount', 'Balance'].map(c => <th key={c} className={['Date', 'Amount', 'Balance'].includes(c) ? 'text-center' : 'text-start'}>{localizeNode(c)}</th>))}</tr></thead><tbody>{localizeNode((full ? transactions : allTransactions.slice(0, 8)).map(t => <TransactionRow key={t.id} transaction={t} symbol={symbol}/>))}</tbody></table></div>{localizeNode(!(full ? transactions : allTransactions).length && <div className="st-empty"><Receipt size={25}/><p>{translateText("No transactions to show.")}</p></div>)}
    </Card>;
  }
  function usage() {
    return <Card title={translateText("Usage Overview")} description="Your wallet usage across different services this month." action={<span className="st-date-range"><CalendarDays size={14}/>{localizeNode(usagePeriod)}</span>}><div className="st-usage-grid">{localizeNode(usageRows.map(u => { const Icon = serviceIcon(u.service); return <div key={u.service} className="st-usage-service"><div className="st-usage-detail"><span className={`st-service-icon ${serviceColor(u.service)}`}><Icon size={19}/></span><div><small>{localizeNode(u.service)}</small><b>{localizeNode(fmt(u.amount))}</b><p>{localizeNode(u.detail)}</p></div></div><div className="st-progress-row"><div className="st-progress"><span className={serviceColor(u.service)} style={{ width: `${Math.max(0, Math.min(100, u.percentage))}%` }}/></div><small>{localizeNode(u.percentage)}%</small></div></div>; }))}</div></Card>;
  }
  return <>
    <div className="st-billing-title"><span className="st-heading-icon"><Wallet size={24}/></span><div><h2>{translateText("Billing & Payments")}</h2><p>{translateText("Manage your subscription, wallet balance and usage for AI, communication and other services.")}</p></div></div>
    <nav className="st-billing-tabs" aria-label={translateText("Billing navigation")}>{localizeNode(billingTabs.map(item => <button key={item.name} aria-current={tab === item.name ? 'page' : undefined} className={tab === item.name ? 'active' : ''} onClick={() => setTab(item.name)}><item.icon size={16}/>{localizeNode(item.name)}</button>))}</nav>
    {localizeNode(!settingsApiEnabled && <p className="st-demo-note">{translateText("Preview data · Connect the billing service to enable payments and see your live balance.")}</p>)}
    {localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}
    {localizeNode(notice && !dialog && <p className="st-note" role="status">{localizeNode(notice)}</p>)}
    {localizeNode(tab === 'Wallet' && pendingTopup && (
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
    ))}
    {localizeNode(tab === 'Wallet' && <div className="st-wallet-top"><Card className="st-balance-card"><span className="st-wallet-orb"><Wallet size={31}/></span><div><small>{translateText("Wallet Balance")}</small><strong>{localizeNode(fmt(balance))}</strong><p>{translateText("Available credits to use across all services.")}</p></div><div className="st-balance-actions"><button className="st-primary" disabled={!!pendingTopup} title={pendingTopup ? translateText('Top-up request awaiting approval') : undefined} onClick={() => { if (pendingTopup) return; idempotency.current = crypto.randomUUID(); setDialog('credits'); }}>{pendingTopup ? <><Clock size={14}/>{translateText("Top-Up In Review…")}</> : <><Plus size={15}/>{translateText("Add Credits")}</>}</button><div className="st-balance-recharge"><button className="st-link" onClick={() => rechargeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><RefreshCw size={13}/>{translateText("Auto Recharge")}</button><Toggle label="Auto Recharge" checked={recharge.enabled} onChange={enabled => setRecharge({ ...recharge, enabled })}/></div></div></Card><Card className="st-plan-card"><span className="st-crown"><Crown size={23}/></span><div><small>{translateText("Current Plan")}</small><h3>{localizeNode(planView.name)} {localizeNode(planView.active && <Badge>{translateText("Active")}</Badge>)}</h3><b>{localizeNode(money(planView.price, planSymbol).replace('.00', ''))} <span>{translateText("/ month")}</span></b><p>{translateText("Renews on ")}{localizeNode(planView.renewal)}</p></div><button className="st-secondary" disabled={busy} onClick={() => { if (live) setTab('Subscription'); else void subscription(); }}>{translateText("Manage Subscription ")}<ArrowRight size={14}/></button></Card></div>)}
    {localizeNode(tab === 'Wallet' && <div className="st-wallet-grid"><div className="st-wallet-main">{localizeNode(usage())}{localizeNode(table())}</div><aside className="st-wallet-side">
      <section ref={creditsRef}><Card title={translateText("Add Credits")} description="Top up your wallet to continue using all services."><div className="st-credit-amounts">{localizeNode([10, 25, 50, 100].map(n => <button key={n} className={n === amount ? 'active' : ''} aria-pressed={n === amount} disabled={!!pendingTopup} onClick={() => setAmount(n)}>€{localizeNode(n)}</button>))}</div><button className="st-primary st-full" disabled={!!pendingTopup} title={pendingTopup ? translateText('Top-up request awaiting approval') : undefined} onClick={() => { if (pendingTopup) return; idempotency.current = crypto.randomUUID(); setDialog('credits'); }}>{pendingTopup ? translateText('Awaiting Admin Approval') : `${translateText("Add €")}${amount}${translateText(" Credits ")}`}{!pendingTopup && <ArrowRight size={15}/>}</button></Card></section>
      <section ref={rechargeRef}><Card title={translateText("Auto Recharge")} description="Automatically add credits when your balance is low." action={<Toggle label="Enable Auto Recharge" checked={recharge.enabled} onChange={enabled => setRecharge({ ...recharge, enabled })}/>}><div className="st-recharge-fields"><Field label="When balance is below"><Select disabled={!recharge.enabled} value={String(recharge.below)} onChange={value => setRecharge({ ...recharge, below: value })} options={[5, 10, 20, 50].map(n => ({ value: String(n), label: `€${n}` }))} /></Field><Field label="Add this amount"><Select disabled={!recharge.enabled} value={String(recharge.amount)} onChange={value => setRecharge({ ...recharge, amount: value })} options={[10, 25, 50, 100].map(n => ({ value: String(n), label: `€${n}` }))} /></Field><Field label="Payment method"><Select disabled={!recharge.enabled} value={String(recharge.method)} onChange={value => setRecharge({ ...recharge, method: value })} options={data.paymentMethods.filter(m => m.kind !== 'bank').map(m => ({ value: String(m.id), label: `${m.name}${m.kind === 'card' ? ' •••• 4242' : ''}` }))} /></Field></div><button className="st-soft-button st-full" disabled={busy} onClick={async () => { setBusy(true); setError(''); setNotice(''); try { if (live) { const result = await billing<{ wallet?: { autoRecharge?: typeof recharge } }>('saveWalletSettings', { autoRecharge: recharge }); if (result.wallet?.autoRecharge) setRecharge(result.wallet.autoRecharge); setNotice('Wallet settings saved.'); } else if (settingsApiEnabled) { await settingsRequest('/billing/recharge', recharge, 'PATCH'); await refresh(); } else { await saveLocal({ ...data, recharge }); } } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); } }}>{localizeNode(busy ? 'Saving…' : 'Save Settings')}</button></Card></section>
    </aside></div>)}
    {tab === 'Payment Methods' && <PaymentMethodsPanel/>}
    {localizeNode(tab === 'Transactions' && table(true))}
    {localizeNode(tab === 'Usage' && <>{localizeNode(usage())}<Card title={translateText("Usage details")} description="Service charges recorded in your wallet ledger.">{localizeNode(table())}</Card></>)}
    {tab === 'Subscription' && <MySubscription audience="user"/>}
    {dialog === 'credits' && (
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
    {dialog === 'method' && (
      <Modal title={translateText('Add Payment Method')} close={close}>
        <p>{translateText('Your payment provider securely stores your payment details. Upclick does not store full card numbers.')}</p>
        <Field label="Payment method type">
          <Select value={method} onChange={value => setMethod(value)} options={[{ value: 'card', label: 'Credit Card' }, { value: 'paypal', label: 'PayPal' }, { value: 'bank', label: 'Bank Transfer' }]} />
        </Field>
        {localizeNode(error && <p className="st-error" role="alert">{localizeNode(error)}</p>)}
        <div className="st-modal-actions">
          <button className="st-secondary" onClick={close}>{translateText("Cancel")}</button>
          <button className="st-primary" disabled={busy} onClick={async () => {
            setBusy(true); setError('');
            try {
              const result = await settingsRequest<{ url: string }>('/billing/payment-methods/setup', { method, returnUrl: `${window.location.origin}/dashboard/settings/billing` });
              window.location.assign(safeExternalUrl(result.url));
            } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
          }}>
            {localizeNode(busy ? 'Opening checkout…' : 'Continue securely')}<ArrowRight size={15}/>
          </button>
        </div>
      </Modal>
    )}
  </>;
}
function TransactionRow({ transaction: t, symbol = '€' }: { transaction: Transaction; symbol?: string }) {
  useUILanguage();
  const Icon = serviceIcon(t.service);
  return <tr><td className="text-center">{localizeNode(t.date)}</td><td className="text-start"><span className="st-transaction-type"><span className={`st-service-icon ${t.amount > 0 ? 'green' : 'purple'}`}>{localizeNode(t.amount > 0 ? <Plus size={13}/> : <FileText size={13}/>)}</span>{localizeNode(t.type)}</span></td><td className="text-start">{localizeNode(t.description)}</td><td className="text-start"><span className="st-transaction-service">{localizeNode(t.service !== '—' && <Icon size={13} className={serviceColor(t.service)}/>)} {localizeNode(t.service)}</span></td><td className={`text-center ${t.amount > 0 ? 'st-amount-positive' : 'st-amount-negative'}`}>{localizeNode(t.amount > 0 ? '+' : '-')}{localizeNode(money(Math.abs(t.amount), symbol))}</td><td className="text-center">{localizeNode(money(t.balance, symbol))}</td></tr>;
}
