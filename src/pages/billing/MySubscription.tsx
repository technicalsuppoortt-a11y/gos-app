import { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CalendarClock, Check, CheckCircle2, Coins, Crown, Eye, Gem, Gift, History, Inbox, Infinity as InfinityIcon, LayoutGrid, Package, Plus, RefreshCw, Sparkles, Users, Wallet, X, Zap } from 'lucide-react';
import { billing, DEFAULT_BILLING_SETTINGS, effectiveStatus, entitledTools, isLive, useBillingIdentity, useBillingRefresh, useBillingSettings, useLedger, usePlans, useRequests, useSubscription, useWallet, type BillingPlan } from '../../backend/billing';
import { LedgerTable, RequestsPanel } from './ProviderPanels';
import { CheckoutModal } from './CheckoutModal';
import { Empty, Modal, Spinner, StatusPill, Tabs, billingLabel, toolName, useAction, useCopy } from './ui';

type View = 'overview' | 'plans' | 'addons' | 'requests' | 'history';

/** The subscriber's own subscription: Admins buy from the platform, Users buy from their Admin. */
export function MySubscription({ audience }: { audience: 'admin' | 'user' }) {
  const c = useCopy();
  const identity = useBillingIdentity();
  useBillingRefresh(!!identity.uid && !identity.loading);
  const { data: sub, loading: subLoading } = useSubscription(identity.uid);
  const { data: wallet } = useWallet(identity.uid);
  const { data: plans, loading: plansLoading, error: plansError } = usePlans(identity.providerId || null);
  const { data: billingSettings } = useBillingSettings(identity.providerId || null);
  const { data: ledger } = useLedger(identity.uid);
  const { data: requests } = useRequests('requesterId', identity.uid);
  const { busy, run } = useAction();
  const [view, setView] = useState<View>('overview');
  const [cycle, setCycle] = useState<'all' | 'monthly' | 'annual' | 'fixed' | 'lifetime'>('all');
  const [checkoutTarget, setCheckoutTarget] = useState<{ plan: BillingPlan; quantity: number; mode: 'plan' | 'renewal' | 'addon' } | null>(null);
  const [inspectingToolsPlan, setInspectingToolsPlan] = useState<BillingPlan | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customSliderUnits, setCustomSliderUnits] = useState<number>(5);
  const [rawCreditsInput, setRawCreditsInput] = useState<string | null>(null);
  const [dismissedRejectionId, setDismissedRejectionId] = useState<string | null>(() => {
    try { return localStorage.getItem('bl_dismissed_rejection_id'); } catch { return null; }
  });
  const handleDismissRejection = (id: string) => {
    setDismissedRejectionId(id);
    try { localStorage.setItem('bl_dismissed_rejection_id', id); } catch {}
  };

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
      {!live && (
        <div className="bl-banner warn" style={{ borderLeft: '4px solid #7C3AED', background: 'rgba(124, 58, 237, 0.08)' }}>
          <Crown size={18} style={{ color: '#7C3AED', flexShrink: 0 }} />
          <div>
            <b style={{ color: '#7C3AED' }}>{c.t('Subscription required to access dashboard', 'يلزم الاشتراك للوصول إلى لوحة التحكم')}</b>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>{c.t('Please select a plan below to complete checkout and unlock all platform tools and features.', 'يرجى اختيار باقة أدناه لإتمام الدفع وفتح جميع أدوات ومزايا المنصة.')}</p>
          </div>
          <button type="button" className="bl-btn sm primary" onClick={() => setView('plans')}><Gem size={13} />{c.t('Choose a plan', 'اختيار باقة')}</button>
        </div>
      )}

      {(() => {
        const latestRejected = requests.find(r => r.status === 'rejected');
        if (!latestRejected) return null;
        if (latestRejected.id === dismissedRejectionId) return null;

        // Hide if another request was sent after this rejected request
        const newerRequest = requests.find(r => {
          if (r.id === latestRejected.id) return false;
          const rTime = new Date(r.createdAt).getTime() || 0;
          const rejTime = new Date(latestRejected.createdAt).getTime() || 0;
          return rTime >= rejTime || r.createdAt >= latestRejected.createdAt;
        });
        if (newerRequest) return null;

        // Hide if any request is currently pending
        if (pending.length > 0) return null;

        // Hide if subscriber already has an active subscription for this plan
        const planMatches = sub?.planId === latestRejected.planId || 
          (sub?.plan?.name && latestRejected.plan?.name && (
            (typeof sub.plan.name === 'string' && sub.plan.name === latestRejected.plan.name) ||
            (sub.plan.name.en && sub.plan.name.en === latestRejected.plan.name.en)
          ));
        if (live && planMatches) return null;

        return (
          <div className="bl-banner danger" style={{ borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.08)' }}>
            <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ color: '#ef4444' }}>{c.t('Payment / Request Rejected by Administrator', 'تم رفض طلب الدفع من قِبل الإدارة')}</b>
              <p style={{ margin: '3px 0 0 0', fontSize: 13, lineHeight: 1.45 }}>
                <b>{c.pick(latestRejected.plan.name)}: </b>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>{c.t('Reason', 'السبب')}: </span>
                <span>{latestRejected.reason || c.t('No reason specified.', 'لم يتم تحديد سبب.')}</span>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                className="bl-btn sm danger"
                onClick={() => setView('requests')}
              >
                <Eye size={13} />
                {c.t('Review Request', 'معاينة الطلب')}
              </button>
              <button
                type="button"
                className="bl-btn icon ghost sm"
                title={c.t('Dismiss', 'إغلاق')}
                onClick={() => handleDismissRejection(latestRejected.id)}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        );
      })()}

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
                {sub.plan?.kind === 'plan' && sub.currentPeriodEnd && <button type="button" className="bl-btn solid" disabled={isPending(sub.planId)} onClick={() => { const plan = plans.find(item => item.id === sub.planId); if (plan) setCheckoutTarget({ plan, quantity: 1, mode: 'renewal' }); else setView('plans'); }}><RefreshCw size={14} />{isPending(sub.planId) ? c.t('Renewal requested', 'تم طلب التجديد') : c.t('Renew plan', 'تجديد الباقة')}</button>}
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
          <div className="bl-reference-grid">
            {paidPlans.map(plan => {
              const current = live && sub?.planId === plan.id;
              const features = (c.ar ? plan.features.ar : plan.features.en).length ? (c.ar ? plan.features.ar : plan.features.en) : (c.ar ? plan.features.en : plan.features.ar);
              return (
                <article key={plan.id} className={`bl-ref-card${current ? ' is-current' : ''}`}>
                  {/* Current plan corner ribbon */}
                  {current && (
                    <div className="bl-ref-ribbon">
                      {c.t('Current Plan', 'باقتك الحالية')}
                    </div>
                  )}
                  {plan.badge.en && !current && (
                    <span className="bl-ref-badge-top bl-pill violet plain">{c.pick(plan.badge)}</span>
                  )}

                  {/* Plan Title */}
                  <h3 className="bl-ref-title">{c.pick(plan.name)}</h3>

                  {/* Pricing Block */}
                  <div className="bl-ref-price-wrap">
                    <div className="bl-ref-price">
                      {c.money(plan.price, plan.currency)}
                      <span>/ {billingLabel(plan, c)}</span>
                    </div>
                    <div className="bl-ref-subprice">
                      {c.t('Original price · estimated display', 'السعر المعتمد — تقديري للعرض')}
                    </div>
                  </div>

                  {/* Credits Badge with lightning */}
                  <div className="bl-ref-credits-pill">
                    <Zap size={14} fill="currentColor" />
                    <span>{c.t(`${plan.credits.toLocaleString()} credits / month`, `${c.num(plan.credits)} نقطة / شهريًا`)}</span>
                  </div>

                  {/* Main Action Button */}
                  <button
                    type="button"
                    className={`bl-ref-cta-btn ${current ? 'current' : 'upgrade'}`}
                    disabled={isPending(plan.id) || (current && !sub?.currentPeriodEnd) || noProvider}
                    onClick={() => setCheckoutTarget({ plan, quantity: 1, mode: current ? 'renewal' : 'plan' })}
                  >
                    {isPending(plan.id) ? (
                      <><Inbox size={15} />{c.t('Request pending', 'الطلب قيد المراجعة')}</>
                    ) : current ? (
                      sub?.currentPeriodEnd ? (
                        <><RefreshCw size={15} />{c.t('Renew Plan', 'تجديد الباقة')}</>
                      ) : (
                        <><Check size={15} />{c.t('Current Plan', 'باقتك الحالية')}</>
                      )
                    ) : (
                      <><Sparkles size={15} />{live ? c.t('Upgrade Now', 'ترقية الآن') : c.t('Subscribe', 'اشترك الآن')}</>
                    )}
                  </button>

                  {/* Features List */}
                  <ul className="bl-ref-features">
                    {audience === 'user' && (
                      <li className="bl-ref-feature-item">
                        <CheckCircle2 size={14} className="bl-ref-check-icon" />
                        <span>{plan.tools.length ? c.t(`Access to ${plan.tools.length} platform tools`, `دخول لـ ${c.num(plan.tools.length)} أدوات احترافية`) : c.t('Access to all tools', 'دخول لكافة الأدوات')}</span>
                      </li>
                    )}
                    {audience === 'admin' && !!plan.channels?.length && (
                      <li className="bl-ref-feature-item">
                        <CheckCircle2 size={14} className="bl-ref-check-icon" />
                        <span>{c.t(`${plan.channels.length} channels included`, `${c.num(plan.channels.length)} قنوات تواصل مفعلة`)}</span>
                      </li>
                    )}
                    <li className="bl-ref-feature-item">
                      <CheckCircle2 size={14} className="bl-ref-check-icon" />
                      <span>{plan.limits?.seats ? c.t(`${plan.limits.seats} team seats included`, `${c.num(plan.limits.seats)} مقاعد فريق`) : c.t('Unlimited team seats', 'مقاعد فريق غير محدودة')}</span>
                    </li>
                    {audience === 'admin' && (
                      <li className="bl-ref-feature-item">
                        <CheckCircle2 size={14} className="bl-ref-check-icon" />
                        <span>{plan.limits?.clients ? c.t(`Up to ${plan.limits.clients} clients`, `حتى ${c.num(plan.limits.clients)} عميل`) : c.t('Unlimited clients', 'عملاء بلا حد')}</span>
                      </li>
                    )}
                    {features.length > 0 ? (
                      features.map((feature, index) => (
                        <li key={index} className="bl-ref-feature-item">
                          <CheckCircle2 size={14} className="bl-ref-check-icon" />
                          <span>{feature}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="bl-ref-feature-item">
                          <CheckCircle2 size={14} className="bl-ref-check-icon" />
                          <span>{c.t('VIP Technical Support', 'دعم فني VIP')}</span>
                        </li>
                        <li className="bl-ref-feature-item">
                          <CheckCircle2 size={14} className="bl-ref-check-icon" />
                          <span>{c.t('Regular Updates', 'تحديثات دورية')}</span>
                        </li>
                      </>
                    )}
                  </ul>

                  {/* Bottom View Tools Button */}
                  <button
                    type="button"
                    className="bl-ref-tools-btn"
                    onClick={() => setInspectingToolsPlan(plan)}
                  >
                    <Crown size={13} />
                    {c.t('View Available Tools', 'عرض الأدوات المتاحة')}
                  </button>
                </article>
              );
            })}
          </div>
        ) : <section className="bl-card"><Empty icon={<Gem size={22} />} title={c.t('No plans available', 'لا توجد باقات متاحة')} text={c.t(`No plans have been published by ${audience === 'admin' ? 'the platform' : 'your provider'} for this filter.`, `لم يتم نشر باقات من ${providerLabel} لهذا الفلتر.`)} /></section>}
      </>}

      {view === 'addons' && (() => {
        const addonMode = billingSettings?.addonMode || 'both';
        const rate = billingSettings?.unitRate || DEFAULT_BILLING_SETTINGS.unitRate;
        const showDynamic = addonMode === 'dynamic' || addonMode === 'both';
        const showFixed = addonMode === 'fixed' || addonMode === 'both' || addons.length > 0;
        const hasContent = showDynamic || (showFixed && addons.length > 0);

        if (!hasContent) {
          return (
            <section className="bl-card">
              <Empty icon={<Package size={22} />} title={c.t('No add-ons available', 'لا توجد إضافات متاحة')} />
            </section>
          );
        }

        const perUnit = rate.creditsPerUnit || 100;
        const minUnits = rate.minUnits || 1;
        const maxUnits = rate.maxUnits || 100;
        const minCredits = minUnits * perUnit;
        const maxCredits = maxUnits * perUnit;

        const currentInputValue = rawCreditsInput !== null ? rawCreditsInput : (customSliderUnits * perUnit).toString();
        const parsedCredits = Number(currentInputValue);
        const hasInput = currentInputValue.trim() !== '';
        const isUnderMin = hasInput && (!Number.isFinite(parsedCredits) || parsedCredits < minCredits);
        const isOverMax = hasInput && parsedCredits > maxCredits;
        const isCreditInvalid = !hasInput || isUnderMin || isOverMax;

        const creditValidationMsg = isUnderMin
          ? c.t(`Minimum is ${minCredits.toLocaleString()} credits (${minUnits} ${minUnits === 1 ? 'unit' : 'units'})`, `الحد الأدنى هو ${c.num(minCredits)} رصيد (${c.num(minUnits)} وحدة)`)
          : isOverMax
          ? c.t(`Maximum is ${maxCredits.toLocaleString()} credits (${maxUnits} units)`, `الحد الأقصى هو ${c.num(maxCredits)} رصيد (${c.num(maxUnits)} وحدة)`)
          : null;

        const setUnitsAndSync = (newUnits: number) => {
          const clamped = Math.max(minUnits, Math.min(maxUnits, newUnits));
          setCustomSliderUnits(clamped);
          setRawCreditsInput((clamped * perUnit).toString());
        };

        const dynamicCredits = !isCreditInvalid && parsedCredits > 0
          ? parsedCredits
          : (customSliderUnits * perUnit);
        const dynamicUnitsFloat = dynamicCredits / perUnit;
        const dynamicCost = Math.round((dynamicUnitsFloat * (rate.pricePerUnit || 5)) * 100) / 100;
        const dynamicPlan: BillingPlan = {
          id: 'dynamic_units',
          ownerId: identity.providerId || 'platform',
          audience,
          kind: 'addon',
          name: {
            en: `${dynamicCredits.toLocaleString()} Custom Credits Top-up`,
            ar: `شحن ${dynamicCredits.toLocaleString()} رصيد مخصص`,
          },
          description: {
            en: `${dynamicCredits.toLocaleString()} credits at ${rate.pricePerUnit || 5} ${rate.currency || 'USD'} per ${perUnit} credits`,
            ar: `${dynamicCredits.toLocaleString()} رصيد بسعر ${rate.pricePerUnit || 5} ${rate.currency || 'USD'} لكل ${perUnit} رصيد`,
          },
          badge: { en: 'Dynamic Top-up', ar: 'شحن مخصص' },
          cta: { en: 'Buy Credits', ar: 'شحن الرصيد' },
          features: {
            en: [`+${dynamicCredits.toLocaleString()} platform credits`, 'Instant top-up to active balance'],
            ar: [`+${c.num(dynamicCredits)} رصيد إضافي للمنصة`, 'شحن فوري للرصيد النشط'],
          },
          price: dynamicCost,
          currency: rate.currency || 'USD',
          billingType: 'once',
          durationDays: null,
          credits: dynamicCredits,
          tools: [],
          limits: {},
          addonType: 'credits',
          addonSeats: null,
          addonTool: null,
          visible: true,
          enabled: true,
          sortOrder: 0,
          status: 'active',
          createdAt: '',
          updatedAt: '',
          revision: 1,
        };

        return (
          <>
            {!live && <div className="bl-banner info"><Package size={16} /><p>{c.t('Add-ons require an active subscription.', 'الإضافات تتطلب اشتراكًا نشطًا.')}</p></div>}

            {/* Dynamic Credit Top-up Card (Interactive Slider) */}
            {showDynamic && (
              <section className="bl-card" style={{ padding: '22px 26px', marginBlockEnd: 24, borderRadius: 16, border: '1px solid var(--bl-accent)', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04) 0%, rgba(167, 139, 250, 0.08) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBlockEnd: 18 }}>
                  <div>
                    <span className="bl-pill violet plain" style={{ marginBlockEnd: 8 }}>
                      <Coins size={12} />
                      {c.t('Unit-Based Dynamic Top-up', 'شحن رصيد مرن بالوحدة')}
                    </span>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0 6px' }}>
                      {c.t('Custom Credit Top-up Slider', 'أداة شحن الرصيد المخصص')}
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--bl-muted)', maxWidth: 600 }}>
                      {c.t(`Top up exactly the credits you need at a fixed rate of ${c.money(rate.pricePerUnit, rate.currency)} per ${c.num(perUnit)} credits.`, `اشحن بالضبط كمية الرصيد التي تحتاجها بسعر ${c.money(rate.pricePerUnit, rate.currency)} لكل ${c.num(perUnit)} رصيد.`)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--bl-accent-2)' }}>
                      {c.money(dynamicCost, rate.currency)}
                    </div>
                    <small style={{ color: 'var(--bl-muted)', fontSize: 12 }}>
                      +{dynamicCredits.toLocaleString()} {c.t('credits', 'رصيد')}
                    </small>
                  </div>
                </div>

                <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--bl-surface)', border: '1px solid var(--bl-border)', display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>
                          {c.t('Enter Credits', 'أدخل كمية الرصيد')}:
                        </span>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={currentInputValue}
                            onChange={e => {
                              const text = e.target.value;
                              const clean = text.replace(/[^\d]/g, '');
                              setRawCreditsInput(clean);
                              const n = Number(clean);
                              if (clean !== '' && Number.isFinite(n) && n >= minCredits && n <= maxCredits) {
                                const calcUnits = Math.round(n / perUnit);
                                setCustomSliderUnits(calcUnits);
                              }
                            }}
                            onBlur={() => {
                              if (currentInputValue.trim() === '') {
                                setRawCreditsInput((customSliderUnits * perUnit).toString());
                              }
                            }}
                            placeholder={`${minCredits} - ${maxCredits}`}
                            style={{
                              width: 140,
                              height: 36,
                              padding: '0 10px',
                              paddingInlineEnd: 55,
                              borderRadius: 8,
                              border: creditValidationMsg ? '1.5px solid #ef4444' : '1.5px solid var(--bl-accent)',
                              background: 'var(--bl-surface-2)',
                              color: creditValidationMsg ? '#ef4444' : 'var(--bl-text)',
                              fontSize: 14,
                              fontWeight: 700,
                              outline: 'none',
                              transition: 'border-color 0.2s',
                            }}
                          />
                          <span style={{ position: 'absolute', insetInlineEnd: 10, fontSize: 11.5, color: creditValidationMsg ? '#ef4444' : 'var(--bl-muted)', fontWeight: 600, pointerEvents: 'none' }}>
                            {c.t('credits', 'رصيد')}
                          </span>
                        </div>
                        {!creditValidationMsg && (
                          <small style={{ color: 'var(--bl-muted)', fontSize: 12 }}>
                            (= <b style={{ color: 'var(--bl-accent)' }}>{Number.isInteger(dynamicUnitsFloat) ? dynamicUnitsFloat : dynamicUnitsFloat.toFixed(1)} {c.t(dynamicUnitsFloat === 1 ? 'unit' : 'units', 'وحدات')}</b>)
                          </small>
                        )}
                      </div>

                      {/* Min / Max Validation Error Alert */}
                      {creditValidationMsg && (
                        <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                          <AlertCircle size={14} style={{ flexShrink: 0 }} />
                          <span>{creditValidationMsg}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--bl-muted)', fontWeight: 600 }}>{c.t('Units Stepper', 'عداد الوحدات')}:</span>
                      <div className="bl-qty">
                        <button type="button" onClick={() => setUnitsAndSync(customSliderUnits - 1)}>−</button>
                        <span>{customSliderUnits}</span>
                        <button type="button" onClick={() => setUnitsAndSync(customSliderUnits + 1)}>+</button>
                      </div>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={minUnits}
                    max={maxUnits}
                    value={customSliderUnits}
                    onChange={e => setUnitsAndSync(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--bl-accent)', cursor: 'pointer' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingBlockStart: 4 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[1, 5, 10, 20, 50].filter(u => u >= minUnits && u <= maxUnits).map(u => (
                        <button
                          key={u}
                          type="button"
                          className={`bl-btn xs ${customSliderUnits === u ? 'primary' : 'ghost'}`}
                          onClick={() => setUnitsAndSync(u)}
                          style={{ borderRadius: 6, fontSize: 11.5, fontWeight: 700 }}
                        >
                          +{c.num(u * perUnit)}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="bl-btn primary"
                      disabled={!live || isCreditInvalid}
                      onClick={() => setCheckoutTarget({ plan: dynamicPlan, quantity: 1, mode: 'addon' })}
                      style={{ padding: '8px 20px', fontWeight: 700 }}
                    >
                      <Sparkles size={14} />
                      {c.t('Purchase Custom Credits', 'شحن هذا الرصيد الآن')}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Fixed Add-on Packages */}
            {showFixed && addons.length > 0 && (
              <>
                <div style={{ marginBlockStart: showDynamic ? 28 : 0, marginBlockEnd: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--bl-text)' }}>
                    {c.t('Fixed Add-on Packages', 'باقات الإضافات الجاهزة')}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--bl-muted)' }}>
                    {c.t('Pre-defined feature, seat, or credit bundles configured by your provider.', 'باقات مميزات أو مقاعد أو رصيد محددة مسبقًا من قِبل مزود الخدمة.')}
                  </p>
                </div>
                <div className="bl-reference-grid">
                  {addons.map(plan => {
                    const quantity = quantities[plan.id] ?? 1;
                    const owned = plan.addonType === 'tool' && tools.includes(plan.addonTool ?? '');
                    const extraFeatures = (c.ar ? plan.features?.ar : plan.features?.en) || [];

                    return (
                      <article key={plan.id} className="bl-ref-card">
                        {/* Top Category Icon & Type Badge Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBlockEnd: 12 }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: plan.addonType === 'seats'
                              ? 'rgba(59, 130, 246, 0.12)'
                              : plan.addonType === 'tool'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : 'rgba(124, 58, 237, 0.12)',
                            color: plan.addonType === 'seats'
                              ? '#3b82f6'
                              : plan.addonType === 'tool'
                              ? '#10b981'
                              : '#7c3aed',
                            flexShrink: 0,
                          }}>
                            {plan.addonType === 'seats' ? <Users size={18} /> : plan.addonType === 'tool' ? <Sparkles size={18} /> : <Coins size={18} />}
                          </div>
                          <span className="bl-pill violet plain" style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
                            {billingLabel(plan, c)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 style={{
                          margin: '0 0 8px',
                          fontSize: 16.5,
                          fontWeight: 800,
                          color: 'var(--bl-text)',
                          lineHeight: 1.35,
                          minHeight: 44,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {c.pick(plan.name)}
                        </h3>

                        {/* Price */}
                        <div style={{ marginBlockEnd: 14, paddingBlockEnd: 12, borderBlockEnd: '1px solid var(--bl-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 28, fontWeight: 850, color: 'var(--bl-text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                              {c.money(plan.price * (plan.addonType === 'tool' ? 1 : quantity), plan.currency)}
                            </span>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--bl-muted)' }}>
                              / {c.t('one-time', 'مرة واحدة')}
                            </span>
                          </div>
                        </div>

                        {/* Features List */}
                        <ul style={{
                          listStyle: 'none',
                          margin: 0,
                          padding: 0,
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          marginBlockEnd: 16,
                          minHeight: 84,
                        }}>
                          {plan.addonType === 'credits' && (
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--bl-text)', lineHeight: 1.4 }}>
                              <Coins size={14} style={{ color: 'var(--bl-accent-2)', flexShrink: 0, marginTop: 2 }} />
                              <span style={{ fontWeight: 600 }}>{c.t(`+${(plan.credits * quantity).toLocaleString()} credits (expire at cycle end)`, `+${c.num(plan.credits * quantity)} رصيد (ينتهي بنهاية الدورة)`)}</span>
                            </li>
                          )}
                          {plan.addonType === 'seats' && (
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--bl-text)', lineHeight: 1.4 }}>
                              <Users size={14} style={{ color: 'var(--bl-accent-2)', flexShrink: 0, marginTop: 2 }} />
                              <span style={{ fontWeight: 600 }}>{c.t(`+${(plan.addonSeats ?? 0) * quantity} team seats`, `+${c.num((plan.addonSeats ?? 0) * quantity)} مقاعد فريق`)}</span>
                            </li>
                          )}
                          {plan.addonType === 'tool' && (
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--bl-text)', lineHeight: 1.4 }}>
                              <Sparkles size={14} style={{ color: 'var(--bl-accent-2)', flexShrink: 0, marginTop: 2 }} />
                              <span style={{ fontWeight: 600 }}>{toolName(plan.addonTool ?? '', c.ar)}</span>
                            </li>
                          )}
                          {extraFeatures.map((feature, index) => (
                            <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--bl-text)', lineHeight: 1.4 }}>
                              <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Footer Section: Stepper + CTA Button */}
                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {plan.addonType !== 'tool' ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 12px',
                              borderRadius: 10,
                              background: 'var(--bl-surface-2)',
                              border: '1px solid var(--bl-border)',
                              height: 38,
                              boxSizing: 'border-box',
                            }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bl-text)' }}>
                                {c.t('Quantity', 'الكمية')}
                              </span>
                              <div className="bl-qty" aria-label={c.t('Quantity', 'الكمية')}>
                                <button type="button" aria-label={c.t('Decrease', 'تقليل')} onClick={() => setQuantities(q => ({ ...q, [plan.id]: Math.max(1, quantity - 1) }))}>−</button>
                                <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{c.num(quantity)}</span>
                                <button type="button" aria-label={c.t('Increase', 'زيادة')} onClick={() => setQuantities(q => ({ ...q, [plan.id]: Math.min(100, quantity + 1) }))}>+</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ height: 38 }} aria-hidden="true" />
                          )}

                          <button
                            type="button"
                            className={`bl-ref-cta-btn ${owned ? 'current' : 'upgrade'}`}
                            style={{ margin: 0, height: 40 }}
                            disabled={!live || owned || isPending(plan.id)}
                            onClick={() => setCheckoutTarget({ plan, quantity: plan.addonType === 'tool' ? 1 : quantity, mode: 'addon' })}
                          >
                            {owned ? (
                              <><Check size={15} />{c.t('Already unlocked', 'مفتوحة بالفعل')}</>
                            ) : isPending(plan.id) ? (
                              <><Inbox size={15} />{c.t('Request pending', 'الطلب قيد المراجعة')}</>
                            ) : (
                              <><Sparkles size={15} />{c.t('Request Add-on', 'طلب الإضافة الآن')}</>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </>
        );
      })()}

      {view === 'requests' && <RequestsPanel requests={requests} mode="outgoing" />}

      {view === 'history' && <section className="bl-card"><div className="bl-card-head"><div><h3><History size={16} />{c.t('Credit history', 'سجل الرصيد')}</h3><p>{c.t('Every grant, top-up, expiry and adjustment — recorded by the server.', 'كل منح وشحن وانتهاء وتعديل — مسجل من الخادم.')}</p></div></div><LedgerTable entries={ledger} /></section>}

      {/* Available Tools Inspection Modal */}
      {inspectingToolsPlan && (
        <Modal
          title={c.t('Available Tools & Capabilities', 'الأدوات والإمكانات المتاحة')}
          subtitle={c.pick(inspectingToolsPlan.name)}
          icon={<Crown size={18} />}
          onClose={() => setInspectingToolsPlan(null)}
          footer={<button type="button" className="bl-btn" onClick={() => setInspectingToolsPlan(null)}>{c.t('Close', 'إغلاق')}</button>}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ margin: 0, color: 'var(--bl-muted)', fontSize: 13.5 }}>
              {c.t('Here are all the specialized tools and platform features included with this subscription plan:', 'فيما يلي كافة الأدوات والميزات الاحترافية المشمولة ضمن هذه الباقة:')}
            </p>
            {audience === 'admin' ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {(inspectingToolsPlan.channels || []).map(ch => (
                  <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--bl-surface-2)', border: '1px solid var(--bl-border)' }}>
                    <CheckCircle2 size={16} color="var(--bl-success)" />
                    <b>{ch}</b>
                  </div>
                ))}
                {!inspectingToolsPlan.channels?.length && (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--bl-muted)', fontSize: 13 }}>{c.t('All platform channels unlocked by default.', 'كافة قنوات المنصة متاحة.')}</div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {(inspectingToolsPlan.tools || []).map(tid => (
                  <div key={tid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bl-surface-2)', border: '1px solid var(--bl-border)' }}>
                    <CheckCircle2 size={16} color="var(--bl-success)" />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{toolName(tid, c.ar)}</span>
                  </div>
                ))}
                {!inspectingToolsPlan.tools?.length && (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--bl-muted)', fontSize: 13, gridColumn: '1 / -1' }}>{c.t('All platform tools unlocked with this plan.', 'كافة أدوات المنصة متاحة ضمن هذه الباقة.')}</div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Unified Secure Checkout & Payment Modal */}
      {checkoutTarget && (
        <CheckoutModal
          plan={checkoutTarget.plan}
          quantity={checkoutTarget.quantity}
          mode={checkoutTarget.mode}
          onClose={() => setCheckoutTarget(null)}
          onSuccess={() => {
            setCheckoutTarget(null);
            setView('requests');
          }}
        />
      )}
    </div>
  );
}
