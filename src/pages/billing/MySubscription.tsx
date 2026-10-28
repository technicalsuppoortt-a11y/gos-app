import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Coins, Crown, Gem, Gift, History, Inbox, Infinity as InfinityIcon, LayoutGrid, Minus, Package, Plus, RefreshCw, Send, Sparkles, Users, Wallet } from 'lucide-react';
import { billing, effectiveStatus, entitledTools, isLive, useBillingIdentity, useBillingRefresh, useLedger, usePlans, useRequests, useSubscription, useWallet, type BillingPlan } from '../../backend/billing';
import { LedgerTable, RequestsPanel } from './ProviderPanels';
import { Empty, Modal, Spinner, StatusPill, Tabs, billingLabel, priceSuffix, toolName, useAction, useCopy } from './ui';

type View = 'overview' | 'plans' | 'addons' | 'requests' | 'history';

/** The subscriber's own subscription: Admins buy from the platform, Users buy from their Admin. */
export function MySubscription({ audience }: { audience: 'admin' | 'user' }) {
  const c = useCopy();
  const identity = useBillingIdentity();
  useBillingRefresh(!!identity.uid && !identity.loading);
  const { data: sub, loading: subLoading } = useSubscription(identity.uid);
  const { data: wallet } = useWallet(identity.uid);
  const { data: plans, loading: plansLoading, error: plansError } = usePlans(identity.providerId || null);
  const { data: ledger } = useLedger(identity.uid);
  const { data: requests } = useRequests('requesterId', identity.uid);
  const { busy, run } = useAction();
  const [view, setView] = useState<View>('overview');
  const [cycle, setCycle] = useState<'all' | 'monthly' | 'annual' | 'fixed' | 'lifetime'>('all');
  const [confirm, setConfirm] = useState<{ plan: BillingPlan; quantity: number } | null>(null);
  const [note, setNote] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const status = effectiveStatus(sub);
  const live = isLive(sub);
  const trial = plans.find(plan => plan.kind === 'trial' && plan.enabled);
  const paidPlans = plans.filter(plan => plan.kind === 'plan' && (cycle === 'all' || plan.billingType === cycle));
  const addons = plans.filter(plan => plan.kind === 'addon');
  const pending = requests.filter(request => request.status === 'pending');
  const tools = entitledTools(sub);
  const providerLabel = audience === 'admin' ? c.t('the platform', 'المنصة') : c.t('your provider', 'مزود الخدمة');

  const cycleCredits = sub?.plan?.credits ?? 0;
  const balance = wallet?.balance ?? 0;
  const usedPct = cycleCredits ? Math.min(100, Math.max(0, (balance / Math.max(cycleCredits, balance)) * 100)) : 0;
  // Snapshot "now" once per subscription change so render stays pure.
  const [now] = useState(() => Date.now());
  const periodPct = useMemo(() => {
    if (!sub?.currentPeriodEnd) return 100;
    const start = new Date(sub.currentPeriodStart).getTime(), end = new Date(sub.currentPeriodEnd).getTime();
    return Math.min(100, Math.max(0, ((now - start) / Math.max(1, end - start)) * 100));
  }, [now, sub?.currentPeriodStart, sub?.currentPeriodEnd]);
  const daysLeft = sub?.currentPeriodEnd ? Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd).getTime() - now) / 86400000)) : null;

  const startTrial = () => run('trial', () => billing('startTrial'), c.t('Your free trial has started!', 'بدأت تجربتك المجانية!'));
  const submit = () => confirm && run('request', () => billing(confirm.plan.kind === 'addon' ? 'requestAddon' : 'requestPlan', { planId: confirm.plan.id, quantity: confirm.quantity, note }), c.t('Request sent. You will be notified once it is approved.', 'تم إرسال الطلب. سيتم تفعيله بعد الموافقة.')).then(ok => { if (ok) { setConfirm(null); setNote(''); setView('requests'); } });

  if (!identity.uid || identity.loading || subLoading) return <div className="bl"><div className="bl-skeleton" style={{ minHeight: 220 }} /><div className="bl-skeleton" /></div>;

  const noProvider = !identity.providerId;
  const heroClass = !sub ? 'empty' : status === 'expired' || status === 'cancelled' ? 'expired' : '';
  const isPending = (planId: string) => pending.some(request => request.planId === planId);

  return (
    <div className="bl" dir={c.dir}>
      <Tabs<View> label={c.t('Subscription sections', 'أقسام الاشتراك')} value={view} onChange={setView} tabs={[
        { id: 'overview', label: c.t('Overview', 'نظرة عامة'), icon: <LayoutGrid size={14} /> },
        { id: 'plans', label: c.t('Plans', 'الباقات'), icon: <Gem size={14} />, count: plans.filter(plan => plan.kind === 'plan').length },
        { id: 'addons', label: c.t('Add-ons', 'الإضافات'), icon: <Package size={14} />, count: addons.length },
        { id: 'requests', label: c.t('My requests', 'طلباتي'), icon: <Inbox size={14} />, count: pending.length },
        { id: 'history', label: c.t('Credit history', 'سجل الرصيد'), icon: <History size={14} /> },
      ]} />

      {noProvider && <div className="bl-banner warn"><AlertTriangle size={17} /><div><b>{c.t('No provider linked', 'لا يوجد مزود مرتبط')}</b><p>{c.t('Your account is not linked to an admin yet, so no plans are available. Contact support.', 'حسابك غير مرتبط بأدمن بعد، لذلك لا توجد باقات متاحة. تواصل مع الدعم.')}</p></div></div>}
      {plansError && <div className="bl-banner danger"><AlertTriangle size={17} /><p>{plansError}</p></div>}
      {sub?.creditBlocked && <div className="bl-banner warn"><AlertTriangle size={17} /><div><b>{c.t('Monthly credits could not be issued', 'تعذر صرف الرصيد الشهري')}</b><p>{c.t('Your provider does not have enough credits right now. They have been notified via their dashboard.', 'مزود الخدمة لا يملك رصيدًا كافيًا حاليًا.')}</p></div></div>}
      {status === 'expired' && <div className="bl-banner danger"><CalendarClock size={17} /><div><b>{c.t('Your subscription has expired', 'انتهى اشتراكك')}</b><p>{c.t('Tools are locked until you renew. Unused credits have expired.', 'الأدوات مقفلة حتى التجديد. الرصيد غير المستخدم انتهى.')}</p></div><button type="button" className="bl-btn sm danger" onClick={() => setView('plans')}><RefreshCw size={13} />{c.t('Renew now', 'جدد الآن')}</button></div>}

      {view === 'overview' && <>
        <div className="bl-hero">
          <section className={`bl-plan-hero ${heroClass}`}>
            <div>
              <small>{c.t('Current plan', 'الباقة الحالية')}</small>
              <h2><Crown size={22} />{sub ? c.pick(sub.plan?.name) : c.t('No active plan', 'لا توجد باقة نشطة')} {sub && <StatusPill status={status} c={c} />}</h2>
            </div>
            {sub ? <>
              <div className="bl-hero-meta">
                <span><Gem size={14} />{billingLabel(sub.plan, c)}</span>
                <span><CalendarClock size={14} />{sub.currentPeriodEnd ? (live ? c.t(`Ends ${c.date(sub.currentPeriodEnd)} · ${daysLeft} days left`, `ينتهي ${c.date(sub.currentPeriodEnd)} · متبقي ${c.num(daysLeft ?? 0)} يوم`) : c.t(`Ended ${c.date(sub.currentPeriodEnd)}`, `انتهى ${c.date(sub.currentPeriodEnd)}`)) : c.t('Never expires', 'لا ينتهي أبدًا')}</span>
                <span><Users size={14} />{c.t('Seats', 'المقاعد')}: {sub.plan?.limits?.seats ? c.num((sub.plan.limits.seats ?? 0) + (sub.extraSeats ?? 0)) : c.t('Unlimited', 'بلا حد')}</span>
                {audience === 'admin' && <span><Users size={14} />{c.t('Clients', 'العملاء')}: {sub.plan?.limits?.clients ? c.num(sub.plan.limits.clients) : c.t('Unlimited', 'بلا حد')}</span>}
              </div>
              {sub.currentPeriodEnd ? <div className="bl-progress" aria-label={c.t('Period progress', 'تقدم الفترة')}><b style={{ width: `${periodPct}%` }} /></div> : <div className="bl-hero-meta"><span><InfinityIcon size={14} />{c.t('Lifetime access', 'وصول مدى الحياة')}</span></div>}
              <div className="bl-hero-actions">
                {sub.plan?.kind === 'plan' && sub.currentPeriodEnd && <button type="button" className="bl-btn solid" disabled={isPending(sub.planId)} onClick={() => { const plan = plans.find(item => item.id === sub.planId); if (plan) setConfirm({ plan, quantity: 1 }); else setView('plans'); }}><RefreshCw size={14} />{isPending(sub.planId) ? c.t('Renewal requested', 'تم طلب التجديد') : c.t('Renew plan', 'تجديد الباقة')}</button>}
                <button type="button" className="bl-btn" onClick={() => setView('plans')}><Sparkles size={14} />{sub.plan?.kind === 'trial' ? c.t('Upgrade to paid', 'الترقية لباقة مدفوعة') : c.t('Change plan', 'تغيير الباقة')}</button>
                <button type="button" className="bl-btn" onClick={() => setView('addons')}><Plus size={14} />{c.t('Add-ons', 'الإضافات')}</button>
              </div>
            </> : <>
              <p style={{ margin: 0, opacity: .85, fontSize: 13.5 }}>{trial && !noProvider ? c.t(`Start with a free ${trial.durationDays}-day trial, or choose a plan from ${audience === 'admin' ? 'the platform' : 'your provider'}.`, `ابدأ بتجربة مجانية ${c.num(trial.durationDays ?? 0)} يوم، أو اختر باقة من ${providerLabel}.`) : c.t('Choose a plan to unlock tools and monthly credits.', 'اختر باقة لفتح الأدوات والرصيد الشهري.')}</p>
              <div className="bl-hero-actions">
                {trial && <button type="button" className="bl-btn solid" disabled={!!busy} onClick={startTrial}>{busy === 'trial' ? <Spinner /> : <Gift size={15} />}{c.t(`Start ${trial.durationDays}-day free trial`, `ابدأ تجربة مجانية ${c.num(trial.durationDays ?? 0)} يوم`)}</button>}
                <button type="button" className="bl-btn" onClick={() => setView('plans')}><Gem size={14} />{c.t('View plans', 'عرض الباقات')}</button>
              </div>
            </>}
          </section>

          <section className="bl-card bl-wallet">
            <div className="bl-wallet-top">
              <span className="bl-wallet-orb"><Wallet size={22} /></span>
              <div><small style={{ color: 'var(--bl-muted)', fontWeight: 600 }}>{c.t('Credit balance', 'رصيد الكريديت')}</small><div><strong>{c.num(balance)}</strong> <span style={{ color: 'var(--bl-muted)', fontSize: 13 }}>/ {c.num(cycleCredits)}</span></div></div>
            </div>
            <div className="bl-meter" aria-label={c.t('Remaining credits', 'الرصيد المتبقي')}><b style={{ width: `${usedPct}%` }} /></div>
            <div className="bl-kv">
              <div><span>{c.t('Monthly allowance', 'الحصة الشهرية')}</span><b>{c.num(cycleCredits)}</b></div>
              <div><span>{c.t('Cycle resets', 'تجديد الدورة')}</span><b>{live && sub?.creditCycleEnd ? c.date(sub.creditCycleEnd) : '—'}</b></div>
              <div><span>{c.t('Rollover', 'ترحيل الرصيد')}</span><b>{c.t('No · unused credits expire', 'لا · الرصيد غير المستخدم ينتهي')}</b></div>
            </div>
            <button type="button" className="bl-btn primary block" disabled={!live} onClick={() => setView('addons')}><Coins size={15} />{c.t('Request more credits', 'طلب رصيد إضافي')}</button>
          </section>
        </div>

        <section className="bl-card">
          <div className="bl-card-head"><div><h3><Sparkles size={16} />{audience === 'admin' ? c.t('Platform channels', 'قنوات المنصة') : c.t('Included tools', 'الأدوات المتاحة')} <span className="bl-count">{audience === 'admin' ? (sub?.plan.channels?.length ?? 0) : tools.length}</span></h3><p>{audience === 'admin' ? c.t('Channel capabilities included in your platform plan.', 'إمكانات القنوات المشمولة في باقتك.') : c.t('Tools unlocked by your plan and add-ons.', 'الأدوات المفتوحة بباقتك وإضافاتك.')}</p></div></div>
          <div className="bl-card-body">{audience === 'admin' ? <div className="bl-tags">{(sub?.plan.channels ?? []).map(channel => <span key={channel} className="bl-pill violet plain">{channel}</span>)}{!sub?.plan.channels?.length && c.t('No channel capabilities specified.', 'لم يتم تحديد إمكانات القنوات.')}</div> : tools.length ? <div className="bl-tags">{tools.map(id => <span key={id} className="bl-pill violet plain"><Check size={12} />{toolName(id, c.ar)}</span>)}</div> : <p style={{ margin: 0, color: 'var(--bl-muted)', fontSize: 13 }}>{c.t('No tools unlocked yet.', 'لا توجد أدوات مفتوحة بعد.')}</p>}</div>
        </section>
      </>}

      {(view === 'plans' || (audience === 'user' && view === 'overview')) && <>
        <div className="bl-toolbar">
          <div className="bl-presets" role="group" aria-label={c.t('Billing type', 'نوع الاشتراك')}>
            {([['all', 'All', 'الكل'], ['monthly', 'Monthly', 'شهري'], ['annual', 'Annual', 'سنوي'], ['fixed', 'Fixed period', 'مدة محددة'], ['lifetime', 'Lifetime', 'مدى الحياة']] as const).map(([id, en, ar]) => <button key={id} type="button" className="bl-chip" aria-pressed={cycle === id} onClick={() => setCycle(id)}>{c.t(en, ar)}</button>)}
          </div>
          {trial && !sub?.trialUsedAt && !live && <button type="button" className="bl-btn success" disabled={!!busy} onClick={startTrial}>{busy === 'trial' ? <Spinner /> : <Gift size={15} />}{c.t(`Start ${trial.durationDays}-day free trial`, `ابدأ تجربة مجانية ${c.num(trial.durationDays ?? 0)} يوم`)}</button>}
        </div>
        {plansLoading ? <div className="bl-skeleton" /> : paidPlans.length ? (
          <div className="bl-pricing">
            {paidPlans.map(plan => {
              const current = live && sub?.planId === plan.id;
              const features = (c.ar ? plan.features.ar : plan.features.en).length ? (c.ar ? plan.features.ar : plan.features.en) : (c.ar ? plan.features.en : plan.features.ar);
              return (
                <article key={plan.id} className={`bl-price-card${current ? ' current' : ''}`}>
                  {(current || plan.badge.en) && <span className={`bl-ribbon bl-pill violet plain`}>{current ? c.t('Current', 'الحالية') : c.pick(plan.badge)}</span>}
                  <h3>{c.pick(plan.name)}</h3>
                  <div className="bl-amount"><strong>{c.money(plan.price, plan.currency)}</strong><span>{priceSuffix(plan, c)}</span></div>
                  <ul>
                    <li><Coins size={14} />{c.t(`${plan.credits.toLocaleString()} credits / month`, `${c.num(plan.credits)} رصيد / شهريًا`)}</li>
                    {audience === 'user' && <li><Sparkles size={14} />{c.t(`${plan.tools.length} tools included`, `${c.num(plan.tools.length)} أدوات متاحة`)}</li>}
                    {audience === 'admin' && !!plan.channels?.length && <li><Sparkles size={14} />{plan.channels.join(' · ')}</li>}
                    <li><Users size={14} />{plan.limits?.seats ? c.t(`${plan.limits.seats} team seats`, `${c.num(plan.limits.seats)} مقاعد فريق`) : c.t('Unlimited seats', 'مقاعد بلا حد')}</li>
                    {audience === 'admin' && <li><Users size={14} />{plan.limits?.clients ? c.t(`Up to ${plan.limits.clients} clients`, `حتى ${c.num(plan.limits.clients)} عميل`) : c.t('Unlimited clients', 'عملاء بلا حد')}</li>}
                    {features.map((feature, index) => <li key={index}><Check size={14} />{feature}</li>)}
                  </ul>
                  <button type="button" className={`bl-btn ${current ? 'success' : 'primary'} block`} disabled={isPending(plan.id) || (current && !sub?.currentPeriodEnd) || noProvider} onClick={() => setConfirm({ plan, quantity: 1 })}>
                    {isPending(plan.id) ? <><Inbox size={14} />{c.t('Request pending', 'الطلب قيد المراجعة')}</> : current ? (sub?.currentPeriodEnd ? <><RefreshCw size={14} />{c.t('Renew', 'تجديد')}</> : <><InfinityIcon size={14} />{c.t('Owned forever', 'مملوكة للأبد')}</>) : <><Send size={14} />{c.pick(plan.cta) || (live ? c.t('Upgrade plan', 'ترقية الباقة') : c.t('Subscribe', 'اشترك'))}</>}
                  </button>
                </article>
              );
            })}
          </div>
        ) : <section className="bl-card"><Empty icon={<Gem size={22} />} title={c.t('No plans available', 'لا توجد باقات متاحة')} text={c.t(`No plans have been published by ${audience === 'admin' ? 'the platform' : 'your provider'} for this filter.`, `لم يتم نشر باقات من ${providerLabel} لهذا الفلتر.`)} /></section>}
      </>}

      {view === 'addons' && (addons.length ? (
        <>
          {!live && <div className="bl-banner info"><Package size={16} /><p>{c.t('Add-ons require an active subscription.', 'الإضافات تتطلب اشتراكًا نشطًا.')}</p></div>}
          <div className="bl-pricing">
            {addons.map(plan => {
              const quantity = quantities[plan.id] ?? 1;
              const owned = plan.addonType === 'tool' && tools.includes(plan.addonTool ?? '');
              return (
                <article key={plan.id} className="bl-price-card">
                  <span className="bl-ribbon bl-pill violet plain">{billingLabel(plan, c)}</span>
                  <h3>{c.pick(plan.name)}</h3>
                  <div className="bl-amount"><strong>{c.money(plan.price * (plan.addonType === 'tool' ? 1 : quantity), plan.currency)}</strong><span>{c.t('one-time', 'مرة واحدة')}</span></div>
                  <ul>
                    {plan.addonType === 'credits' && <li><Coins size={14} />{c.t(`+${(plan.credits * quantity).toLocaleString()} credits (expire at cycle end)`, `+${c.num(plan.credits * quantity)} رصيد (ينتهي بنهاية الدورة)`)}</li>}
                    {plan.addonType === 'seats' && <li><Users size={14} />{c.t(`+${(plan.addonSeats ?? 0) * quantity} team seats`, `+${c.num((plan.addonSeats ?? 0) * quantity)} مقاعد فريق`)}</li>}
                    {plan.addonType === 'tool' && <li><Sparkles size={14} />{toolName(plan.addonTool ?? '', c.ar)}</li>}
                    {(c.ar ? plan.features.ar : plan.features.en).map((feature, index) => <li key={index}><Check size={14} />{feature}</li>)}
                  </ul>
                  {plan.addonType !== 'tool' && <div className="bl-qty" aria-label={c.t('Quantity', 'الكمية')}><button type="button" aria-label={c.t('Decrease', 'تقليل')} onClick={() => setQuantities(q => ({ ...q, [plan.id]: Math.max(1, quantity - 1) }))}><Minus size={13} /></button><span>{c.num(quantity)}</span><button type="button" aria-label={c.t('Increase', 'زيادة')} onClick={() => setQuantities(q => ({ ...q, [plan.id]: Math.min(100, quantity + 1) }))}><Plus size={13} /></button></div>}
                  <button type="button" className="bl-btn primary block" disabled={!live || owned || isPending(plan.id)} onClick={() => setConfirm({ plan, quantity: plan.addonType === 'tool' ? 1 : quantity })}>
                    {owned ? <><Check size={14} />{c.t('Already unlocked', 'مفتوحة بالفعل')}</> : isPending(plan.id) ? <><Inbox size={14} />{c.t('Request pending', 'الطلب قيد المراجعة')}</> : <><Send size={14} />{c.t('Request add-on', 'طلب الإضافة')}</>}
                  </button>
                </article>
              );
            })}
          </div>
        </>
      ) : <section className="bl-card"><Empty icon={<Package size={22} />} title={c.t('No add-ons available', 'لا توجد إضافات متاحة')} /></section>)}

      {view === 'requests' && <RequestsPanel requests={requests} mode="outgoing" />}

      {view === 'history' && <section className="bl-card"><div className="bl-card-head"><div><h3><History size={16} />{c.t('Credit history', 'سجل الرصيد')}</h3><p>{c.t('Every grant, top-up, expiry and adjustment — recorded by the server.', 'كل منح وشحن وانتهاء وتعديل — مسجل من الخادم.')}</p></div></div><LedgerTable entries={ledger} /></section>}

      {confirm && (
        <Modal
          title={confirm.plan.kind === 'addon' ? c.t('Request add-on', 'طلب إضافة') : live && sub?.planId === confirm.plan.id ? c.t('Request renewal', 'طلب تجديد') : c.t('Request subscription', 'طلب اشتراك')}
          subtitle={c.pick(confirm.plan.name)}
          icon={confirm.plan.kind === 'addon' ? <Package size={18} /> : <Gem size={18} />}
          onClose={() => setConfirm(null)}
          footer={<>
            <button type="button" className="bl-btn" onClick={() => setConfirm(null)}>{c.t('Cancel', 'إلغاء')}</button>
            <button type="button" className="bl-btn primary" disabled={!!busy} onClick={submit}>{busy === 'request' ? <Spinner /> : <Send size={15} />}{c.t('Send request', 'إرسال الطلب')}</button>
          </>}
        >
          <div className="bl-form">
            <div className="bl-kv bl-section">
              <div><span>{c.t('Item', 'العنصر')}</span><b>{c.pick(confirm.plan.name)}{confirm.quantity > 1 ? ` ×${c.num(confirm.quantity)}` : ''}</b></div>
              <div><span>{c.t('Type', 'النوع')}</span><b>{billingLabel(confirm.plan, c)}</b></div>
              <div><span>{c.t('Total', 'الإجمالي')}</span><b className="bl-price">{c.money(confirm.plan.price * confirm.quantity, confirm.plan.currency)}</b></div>
            </div>
            {confirm.plan.kind === 'plan' && live && sub?.planId !== confirm.plan.id && <div className="bl-banner warn"><AlertTriangle size={16} /><p>{c.t('Switching plans starts a new period. Your remaining credits expire and the new plan’s credits are issued.', 'تغيير الباقة يبدأ فترة جديدة. الرصيد المتبقي ينتهي ويُصرف رصيد الباقة الجديدة.')}</p></div>}
            {confirm.plan.kind === 'plan' && live && sub?.planId === confirm.plan.id && <div className="bl-banner success"><RefreshCw size={16} /><p>{c.t('Renewing extends your current end date. Your monthly credits continue as usual.', 'التجديد يمدد تاريخ الانتهاء الحالي. رصيدك الشهري يستمر كالمعتاد.')}</p></div>}
            <label className="bl-field"><span>{c.t('Note to provider (optional)', 'ملاحظة لمزود الخدمة (اختياري)')}</span><textarea className="bl-input" maxLength={300} value={note} onChange={event => setNote(event.target.value)} placeholder={c.t('e.g. Paid via bank transfer, ref #1234', 'مثال: تم الدفع بتحويل بنكي رقم 1234')} /></label>
            <p style={{ margin: 0, color: 'var(--bl-muted)', fontSize: 12.5 }}>{c.t(`Your request goes to ${audience === 'admin' ? 'the platform' : 'your provider'} for approval. Once approved, it activates immediately.`, `يُرسل طلبك إلى ${providerLabel} للموافقة. بعد الموافقة يتفعّل فورًا.`)}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
