import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Coins, Gem, History, Inbox, Package, RefreshCw, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import { billing, effectiveStatus, useLedger, type BillingPlan, type BillingRequest, type BillingSubscription, type BillingWallet, type LedgerEntry } from '../../backend/billing';
import { Empty, Modal, Spinner, StatusPill, Tabs, billingLabel, downloadCsv, initials, useAction, useCopy, type Copy } from './ui';

const typeLabel = (request: BillingRequest, c: Copy) => request.type === 'addon' ? c.t('Add-on', 'إضافة') : request.type === 'renewal' ? c.t('Renewal', 'تجديد') : c.t('New plan', 'باقة جديدة');

/** Incoming (provider decides) or outgoing (requester tracks / cancels) plan & add-on requests. */
export function RequestsPanel({ requests, mode, title }: { requests: BillingRequest[]; mode: 'incoming' | 'outgoing'; title?: string }) {
  const c = useCopy();
  const { busy, run } = useAction();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [rejecting, setRejecting] = useState<BillingRequest | null>(null);
  const [reason, setReason] = useState('');
  const pending = requests.filter(request => request.status === 'pending');
  const rows = filter === 'pending' ? pending : requests;

  const approve = (request: BillingRequest) => run(request.id, () => billing('decideRequest', { requestId: request.id, decision: 'approve' }), c.t('Request approved. Subscription and credits were updated.', 'تمت الموافقة. تم تحديث الاشتراك والرصيد.'));
  const reject = () => rejecting && run(rejecting.id, () => billing('decideRequest', { requestId: rejecting.id, decision: 'reject', reason }), c.t('Request rejected.', 'تم رفض الطلب.')).then(ok => { if (ok) { setRejecting(null); setReason(''); } });
  const cancel = (request: BillingRequest) => run(request.id, () => billing('cancelRequest', { requestId: request.id }), c.t('Request cancelled.', 'تم إلغاء الطلب.'));

  return (
    <section className="bl-card">
      <div className="bl-card-head">
        <div><h2><Inbox size={17} />{title ?? (mode === 'incoming' ? c.t('Subscription requests', 'طلبات الاشتراك') : c.t('My requests', 'طلباتي'))}</h2>
          <p>{mode === 'incoming' ? c.t('Approve after confirming payment. Approval activates the plan and issues credits automatically.', 'وافق بعد تأكيد الدفع. الموافقة تفعّل الباقة وتصرف الرصيد تلقائيًا.') : c.t('Track the plans and add-ons you requested from your provider.', 'تابع الباقات والإضافات التي طلبتها من مزود الخدمة.')}</p></div>
        <Tabs label={c.t('Request filter', 'تصفية الطلبات')} value={filter} onChange={setFilter} tabs={[{ id: 'pending', label: c.t('Pending', 'قيد المراجعة'), count: pending.length, hot: mode === 'incoming' }, { id: 'all', label: c.t('All', 'الكل'), count: requests.length }]} />
      </div>
      {rows.length ? (
        <div className="bl-table-wrap">
          <table className="bl-table">
            <thead><tr>
              {mode === 'incoming' && <th>{c.t('Requested by', 'مقدم الطلب')}</th>}
              <th>{c.t('Item', 'العنصر')}</th><th>{c.t('Type', 'النوع')}</th><th>{c.t('Total', 'الإجمالي')}</th><th>{c.t('Date', 'التاريخ')}</th><th>{c.t('Status', 'الحالة')}</th><th style={{ textAlign: 'end' }}>{c.t('Actions', 'الإجراءات')}</th>
            </tr></thead>
            <tbody>
              {rows.map(request => (
                <tr key={request.id}>
                  {mode === 'incoming' && <td><div className="bl-name"><span className="bl-avatar">{initials(request.requesterName || request.requesterEmail)}</span><div><b>{request.requesterName || '—'}</b><small dir="ltr">{request.requesterEmail}</small></div></div></td>}
                  <td><div className="bl-name"><div><b>{request.plan.kind === 'addon' ? <Package size={13} style={{ verticalAlign: '-2px', marginInlineEnd: 5 }} /> : <Gem size={13} style={{ verticalAlign: '-2px', marginInlineEnd: 5 }} />}{c.pick(request.plan.name)}{request.quantity > 1 && ` ×${c.num(request.quantity)}`}</b>{request.note && <small title={request.note}>“{request.note.slice(0, 60)}”</small>}{request.reason && request.status !== 'pending' && <small>{c.t('Reason', 'السبب')}: {request.reason}</small>}</div></div></td>
                  <td><span className={`bl-pill plain ${request.type === 'renewal' ? 'green' : request.type === 'addon' ? 'violet' : 'blue'}`}>{typeLabel(request, c)}</span></td>
                  <td className="bl-price">{c.money(request.total, request.plan.currency)}</td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--bl-muted)' }}>{c.dateTime(request.createdAt)}</td>
                  <td><StatusPill status={request.status} c={c} /></td>
                  <td><div className="bl-actions">
                    {request.status === 'pending' && mode === 'incoming' && <>
                      <button type="button" className="bl-btn sm success" disabled={!!busy} onClick={() => approve(request)}>{busy === request.id ? <Spinner size={13} /> : <Check size={13} />}{c.t('Approve', 'موافقة')}</button>
                      <button type="button" className="bl-btn sm danger" disabled={!!busy} onClick={() => setRejecting(request)}><X size={13} />{c.t('Reject', 'رفض')}</button>
                    </>}
                    {request.status === 'pending' && mode === 'outgoing' && <button type="button" className="bl-btn sm" disabled={!!busy} onClick={() => cancel(request)}>{busy === request.id ? <Spinner size={13} /> : <X size={13} />}{c.t('Cancel', 'إلغاء')}</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty icon={<Inbox size={22} />} title={filter === 'pending' ? c.t('No pending requests', 'لا توجد طلبات معلقة') : c.t('No requests yet', 'لا توجد طلبات بعد')} text={mode === 'incoming' ? c.t('New plan, renewal and add-on requests will appear here.', 'طلبات الباقات والتجديد والإضافات ستظهر هنا.') : undefined} />}
      {rejecting && (
        <Modal title={c.t('Reject request', 'رفض الطلب')} icon={<X size={18} />} onClose={() => setRejecting(null)} footer={<>
          <button type="button" className="bl-btn" onClick={() => setRejecting(null)}>{c.t('Cancel', 'إلغاء')}</button>
          <button type="button" className="bl-btn danger" disabled={!!busy} onClick={reject}>{busy ? <Spinner /> : <X size={15} />}{c.t('Reject request', 'رفض الطلب')}</button>
        </>}>
          <label className="bl-field"><span>{c.t('Reason (shown to the requester)', 'السبب (يظهر لمقدم الطلب)')}</span><textarea className="bl-input" maxLength={300} value={reason} onChange={event => setReason(event.target.value)} placeholder={c.t('e.g. Payment not received yet', 'مثال: لم يتم استلام الدفع بعد')} /></label>
        </Modal>
      )}
    </section>
  );
}

/** Subscribers of a provider with wallet balances and management actions. */
export function SubscribersPanel({ subscribers, wallets, plans, isPlatform, title }: { subscribers: BillingSubscription[]; wallets: BillingWallet[]; plans: BillingPlan[]; isPlatform: boolean; title: string }) {
  const c = useCopy();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dialog, setDialog] = useState<{ type: 'assign' | 'credits' | 'ledger'; sub: BillingSubscription } | null>(null);
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const balance = (id: string) => wallets.find(wallet => wallet.id === id)?.balance ?? 0;
  const rows = useMemo(() => subscribers
    .filter(sub => status === 'all' || effectiveStatus(sub) === status)
    .filter(sub => `${sub.subscriberName} ${sub.subscriberEmail} ${sub.plan?.name?.en}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')), [subscribers, status, search]);
  const assignable = plans.filter(plan => plan.kind !== 'trial');
  const close = () => { setDialog(null); setPlanId(''); setAmount(''); setReason(''); };

  const submit = () => {
    if (!dialog) return;
    if (dialog.type === 'assign') return run('dialog', () => billing('assignPlan', { subscriberId: dialog.sub.id, planId }), c.t('Plan assigned.', 'تم تعيين الباقة.')).then(ok => ok && close());
    if (dialog.type === 'credits') return run('dialog', () => billing(isPlatform ? 'adjustCredits' : 'transferCredits', { subscriberId: dialog.sub.id, amount: Number(amount), reason }), isPlatform ? c.t('Credits adjusted.', 'تم تعديل الرصيد.') : c.t('Credits transferred from your wallet.', 'تم تحويل الرصيد من محفظتك.')).then(ok => ok && close());
  };

  return (
    <section className="bl-card">
      <div className="bl-card-head">
        <div><h2><Users size={17} />{title} <span className="bl-count">{subscribers.length}</span></h2><p>{isPlatform ? c.t('Admins subscribed to platform plans and their credit wallets.', 'الأدمن المشتركون في باقات المنصة ومحافظ رصيدهم.') : c.t('Your clients, their plans and remaining credits.', 'عملاؤك وباقاتهم والرصيد المتبقي.')}</p></div>
        <button type="button" className="bl-btn" disabled={!rows.length} onClick={() => downloadCsv('subscribers.csv', ['Name', 'Email', 'Plan', 'Status', 'Period end', 'Credits'], rows.map(sub => [sub.subscriberName, sub.subscriberEmail, sub.plan?.name?.en ?? '', effectiveStatus(sub), sub.currentPeriodEnd ?? 'lifetime', balance(sub.id)]))}><RefreshCw size={14} />{c.t('Export CSV', 'تصدير CSV')}</button>
      </div>
      <div className="bl-card-body" style={{ paddingBlockEnd: 0 }}>
        <div className="bl-toolbar">
          <label className="bl-search"><Search size={15} /><input className="bl-input" value={search} onChange={event => setSearch(event.target.value)} placeholder={c.t('Search by name, email or plan…', 'ابحث بالاسم أو البريد أو الباقة…')} aria-label={c.t('Search subscribers', 'بحث في المشتركين')} /></label>
          <select className="bl-input" style={{ width: 180 }} value={status} onChange={event => setStatus(event.target.value)} aria-label={c.t('Status', 'الحالة')}>
            {[['all', 'All statuses', 'كل الحالات'], ['active', 'Active', 'نشط'], ['trialing', 'Free trial', 'تجربة مجانية'], ['expired', 'Expired', 'منتهي']].map(([value, en, ar]) => <option key={value} value={value}>{c.t(en, ar)}</option>)}
          </select>
        </div>
      </div>
      {rows.length ? (
        <div className="bl-table-wrap" style={{ marginBlockStart: 14 }}>
          <table className="bl-table">
            <thead><tr><th>{c.t('Subscriber', 'المشترك')}</th><th>{c.t('Plan', 'الباقة')}</th><th>{c.t('Status', 'الحالة')}</th><th>{c.t('Renews / ends', 'التجديد / الانتهاء')}</th><th>{c.t('Credits left', 'الرصيد المتبقي')}</th><th style={{ textAlign: 'end' }}>{c.t('Actions', 'الإجراءات')}</th></tr></thead>
            <tbody>
              {rows.map(sub => (
                <tr key={sub.id}>
                  <td><div className="bl-name"><span className="bl-avatar">{initials(sub.subscriberName || sub.subscriberEmail)}</span><div><b>{sub.subscriberName || '—'}</b><small dir="ltr">{sub.subscriberEmail}</small></div></div></td>
                  <td><b>{c.pick(sub.plan?.name)}</b><div style={{ color: 'var(--bl-muted)', fontSize: 11.5 }}>{sub.plan ? billingLabel(sub.plan, c) : ''}{sub.extraSeats ? ` · +${c.num(sub.extraSeats)} ${c.t('seats', 'مقاعد')}` : ''}</div></td>
                  <td><StatusPill status={effectiveStatus(sub)} c={c} />{sub.creditBlocked && <div><span className="bl-pill amber plain" style={{ marginBlockStart: 4 }}>{c.t('Credits blocked', 'الرصيد متوقف')}</span></div>}</td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--bl-muted)' }}>{sub.currentPeriodEnd ? c.date(sub.currentPeriodEnd) : c.t('Never (lifetime)', 'لا ينتهي')}</td>
                  <td className="bl-credits">{c.num(balance(sub.id))}</td>
                  <td><div className="bl-actions">
                    <button type="button" className="bl-btn sm" onClick={() => setDialog({ type: 'ledger', sub })}><History size={13} />{c.t('History', 'السجل')}</button>
                    <button type="button" className="bl-btn sm" onClick={() => setDialog({ type: 'credits', sub })}>{isPlatform ? <SlidersHorizontal size={13} /> : <Coins size={13} />}{isPlatform ? c.t('Adjust', 'تعديل') : c.t('Send credits', 'إرسال رصيد')}</button>
                    <button type="button" className="bl-btn sm success" onClick={() => setDialog({ type: 'assign', sub })}><Gem size={13} />{c.t('Assign', 'تعيين')}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty icon={<Users size={22} />} title={c.t('No subscribers yet', 'لا يوجد مشتركون بعد')} text={c.t('Accounts appear here after they start a trial or a plan is approved.', 'تظهر الحسابات هنا بعد بدء التجربة أو الموافقة على باقة.')} />}

      {dialog?.type === 'ledger' && <LedgerModal walletId={dialog.sub.id} name={dialog.sub.subscriberName} onClose={close} />}
      {dialog && dialog.type !== 'ledger' && (
        <Modal
          title={dialog.type === 'assign' ? c.t('Assign plan or add-on', 'تعيين باقة أو إضافة') : isPlatform ? c.t('Adjust credits', 'تعديل الرصيد') : c.t('Send credits from your wallet', 'إرسال رصيد من محفظتك')}
          subtitle={dialog.sub.subscriberName || dialog.sub.subscriberEmail}
          icon={dialog.type === 'assign' ? <Gem size={18} /> : <Coins size={18} />}
          onClose={close}
          footer={<>
            <button type="button" className="bl-btn" onClick={close}>{c.t('Cancel', 'إلغاء')}</button>
            <button type="button" className="bl-btn primary" disabled={!!busy || (dialog.type === 'assign' ? !planId : !Number(amount))} onClick={submit}>{busy ? <Spinner /> : <Check size={15} />}{c.t('Confirm', 'تأكيد')}</button>
          </>}
        >
          {dialog.type === 'assign' ? (
            <div className="bl-form">
              <label className="bl-field"><span>{c.t('Plan', 'الباقة')}</span>
                <select className="bl-input" value={planId} onChange={event => setPlanId(event.target.value)}>
                  <option value="">{c.t('Choose…', 'اختر…')}</option>
                  {assignable.map(plan => <option key={plan.id} value={plan.id}>{c.pick(plan.name)} · {billingLabel(plan, c)} · {c.money(plan.price, plan.currency)}</option>)}
                </select>
              </label>
              <div className="bl-banner info"><RefreshCw size={16} /><p>{c.t('Use this after receiving an offline payment. A new plan starts a new period and resets credits (unused credits expire). Re-assigning the current plan extends it.', 'استخدمها بعد استلام دفع خارجي. الباقة الجديدة تبدأ فترة جديدة وتعيد ضبط الرصيد (الرصيد غير المستخدم ينتهي). تعيين نفس الباقة يمدد مدتها.')}{!isPlatform && ' ' + c.t('Plan credits are deducted from your wallet.', 'رصيد الباقة يُخصم من محفظتك.')}</p></div>
            </div>
          ) : (
            <div className="bl-form">
              <label className="bl-field"><span>{c.t('Credits', 'الرصيد')}</span><input className="bl-input" type="number" step={1} min={isPlatform ? undefined : 1} value={amount} onChange={event => setAmount(event.target.value)} placeholder={isPlatform ? c.t('Use a negative value to deduct', 'استخدم قيمة سالبة للخصم') : '500'} /><small>{c.t('Current balance', 'الرصيد الحالي')}: {c.num(balance(dialog.sub.id))}</small></label>
              <label className="bl-field"><span>{c.t('Reason', 'السبب')}{isPlatform && ' *'}</span><input className="bl-input" maxLength={200} value={reason} onChange={event => setReason(event.target.value)} placeholder={c.t('Recorded in the audit ledger', 'يُسجل في سجل المراجعة')} /></label>
              {!isPlatform && <div className="bl-banner warn"><Coins size={16} /><p>{c.t('Sent credits are deducted from your wallet and expire at the end of the client’s monthly cycle.', 'الرصيد المرسل يُخصم من محفظتك وينتهي بنهاية الدورة الشهرية للعميل.')}</p></div>}
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}

const ledgerType = (entry: LedgerEntry, c: Copy) => ({ grant: c.t('Plan credits', 'رصيد الباقة'), topup: c.t('Top-up', 'شحن'), transfer_out: c.t('Sent to client', 'مرسل لعميل'), expire: c.t('Expired', 'منتهي'), adjustment: c.t('Adjustment', 'تعديل'), usage: c.t('Usage', 'استهلاك') }[entry.type] ?? entry.type);

export function LedgerTable({ entries, compact }: { entries: LedgerEntry[]; compact?: boolean }) {
  const c = useCopy();
  if (!entries.length) return <Empty icon={<History size={22} />} title={c.t('No credit activity yet', 'لا توجد حركات رصيد بعد')} />;
  return (
    <div className="bl-table-wrap">
      <table className="bl-table" style={compact ? { minWidth: 560 } : undefined}>
        <thead><tr><th>{c.t('Date', 'التاريخ')}</th><th>{c.t('Type', 'النوع')}</th><th>{c.t('Description', 'الوصف')}</th><th>{c.t('Amount', 'القيمة')}</th><th>{c.t('Balance', 'الرصيد')}</th></tr></thead>
        <tbody>
          {entries.slice(0, 200).map(entry => (
            <tr key={entry.id}>
              <td style={{ whiteSpace: 'nowrap', color: 'var(--bl-muted)' }}>{c.dateTime(entry.createdAt)}</td>
              <td><span className={`bl-pill plain ${entry.amount > 0 ? 'green' : entry.type === 'expire' ? 'amber' : 'red'}`}>{entry.amount > 0 ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}{ledgerType(entry, c)}</span></td>
              <td style={{ color: 'var(--bl-muted)' }}>{entry.description}</td>
              <td className={`num ${entry.amount > 0 ? 'pos' : 'neg'}`} dir="ltr" style={{ textAlign: c.ar ? 'right' : 'left' }}>{entry.amount > 0 ? '+' : ''}{c.num(entry.amount)}</td>
              <td className="num">{c.num(entry.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LedgerModal({ walletId, name, onClose }: { walletId: string; name?: string; onClose: () => void }) {
  const c = useCopy();
  const { data, loading } = useLedger(walletId);
  return (
    <Modal wide title={c.t('Credit history', 'سجل الرصيد')} subtitle={name} icon={<History size={18} />} onClose={onClose}>
      {loading ? <div className="bl-skeleton" /> : <LedgerTable entries={data} compact />}
    </Modal>
  );
}
