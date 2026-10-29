import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Coins, Crown, Gem, Gift, Inbox, Layers, Package, Store, Users, Wallet } from 'lucide-react';
import { entitledTools, isLive, PLATFORM, useBillingIdentity, useBillingRefresh, usePlans, useProviderWallets, useRequests, useSubscribers, useSubscription, useWallet } from '../../backend/billing';
import { MySubscription } from './MySubscription';
import { PlanCatalog } from './PlanCatalog';
import { RequestsPanel, SubscribersPanel } from './ProviderPanels';
import { TrialSettings } from './TrialSettings';
import { Stat, Tabs, useCopy } from './ui';

type ProviderTab = 'plans' | 'trial' | 'addons' | 'requests' | 'subscribers';

export function UserPlansPage() {
  const c = useCopy();
  return <div className="bl" dir={c.dir}>
    <header className="bl-head"><div>
      <span className="bl-eyebrow"><Gem size={12} />{c.t('Your workspace subscription', 'اشتراك مساحة عملك')}</span>
      <h1><span className="bl-head-icon"><Layers size={19} /></span>{c.t('Plans & Pricing', 'الباقات والأسعار')}</h1>
      <p>{c.t('Manage your plan, explore your admin’s offers, and request extra credits or tools.', 'أدر باقتك واستعرض عروض المسؤول واطلب رصيدًا أو أدوات إضافية.')}</p>
    </div></header>
    <MySubscription audience="user" />
  </div>;
}

/** Shared provider console: the Super Admin sells to admins, an Admin sells to their clients. */
function ProviderConsole({ ownerId, isPlatform, allowedTools, locked }: { ownerId: string; isPlatform: boolean; allowedTools?: string[] | null; locked?: boolean }) {
  const c = useCopy();
  const [params, setParams] = useSearchParams();
  const tab = (['plans', 'trial', 'addons', 'requests', 'subscribers'].includes(params.get('tab') ?? '') ? params.get('tab') : 'plans') as ProviderTab;
  const setTab = (next: ProviderTab) => setParams(current => { current.set('tab', next); return current; }, { replace: true });
  const { data: plans } = usePlans(ownerId, true);
  const { data: subscribers } = useSubscribers(ownerId);
  const { data: wallets } = useProviderWallets(ownerId);
  const { data: requests } = useRequests('providerId', ownerId);
  const pending = requests.filter(request => request.status === 'pending').length;
  const live = subscribers.filter(sub => isLive(sub));
  const issued = wallets.reduce((sum, wallet) => sum + (wallet.balance ?? 0), 0);
  const currencies = [...new Set(plans.filter(plan => plan.kind === 'plan').map(plan => plan.currency))];
  const mrr = currencies.length === 1 ? live.filter(sub => sub.plan?.kind === 'plan').reduce((sum, sub) => sum + (sub.plan.billingType === 'monthly' ? sub.plan.price : sub.plan.billingType === 'annual' ? sub.plan.price / 12 : 0), 0) : null;

  return (
    <>
      <div className="bl-stats">
        <Stat icon={<Users size={18} />} label={isPlatform ? c.t('Active admins', 'الأدمن النشطون') : c.t('Active clients', 'العملاء النشطون')} value={c.num(live.length)} hint={c.t(`${subscribers.length} total subscribers`, `${c.num(subscribers.length)} مشترك إجمالًا`)} tone="violet" />
        <Stat icon={<Layers size={18} />} label={c.t('Published plans', 'الباقات المنشورة')} value={c.num(plans.filter(plan => plan.kind === 'plan' && plan.visible).length)} hint={c.t(`${plans.filter(plan => plan.kind === 'addon').length} add-ons`, `${c.num(plans.filter(plan => plan.kind === 'addon').length)} إضافات`)} />
        <Stat icon={<Coins size={18} />} label={isPlatform ? c.t('Credits held by admins', 'رصيد لدى الأدمن') : c.t('Credits held by clients', 'رصيد لدى العملاء')} value={c.num(issued)} hint={c.t('Current cycle balances', 'أرصدة الدورة الحالية')} tone="violet" />
        <Stat icon={<Inbox size={18} />} label={c.t('Pending requests', 'طلبات معلقة')} value={c.num(pending)} hint={mrr !== null ? c.t(`≈ ${c.money(Math.round(mrr), currencies[0])} MRR`, `≈ ${c.money(Math.round(mrr), currencies[0])} إيراد شهري`) : c.t('Awaiting your approval', 'بانتظار موافقتك')} tone="amber" />
      </div>
      <Tabs<ProviderTab> label={c.t('Plans management', 'إدارة الباقات')} value={tab} onChange={setTab} tabs={[
        { id: 'plans', label: c.t('Plans', 'الباقات'), icon: <Gem size={14} /> },
        { id: 'trial', label: c.t('Free trial', 'التجربة المجانية'), icon: <Gift size={14} /> },
        { id: 'addons', label: c.t('Add-ons', 'الإضافات'), icon: <Package size={14} /> },
        { id: 'requests', label: c.t('Requests', 'الطلبات'), icon: <Inbox size={14} />, count: pending, hot: true },
        { id: 'subscribers', label: isPlatform ? c.t('Admins & credits', 'الأدمن والرصيد') : c.t('Clients & credits', 'العملاء والرصيد'), icon: <Users size={14} /> },
      ]} />
      {tab === 'plans' && <PlanCatalog kind="plan" plans={plans} subscribers={subscribers} isPlatform={isPlatform} allowedTools={allowedTools} locked={locked} ownerId={ownerId} />}
      {tab === 'addons' && <PlanCatalog kind="addon" plans={plans} subscribers={subscribers} isPlatform={isPlatform} allowedTools={allowedTools} locked={locked} ownerId={ownerId} />}
      {tab === 'trial' && <TrialSettings trial={plans.find(plan => plan.kind === 'trial')} subscribers={subscribers} isPlatform={isPlatform} allowedTools={allowedTools} locked={locked} />}
      {tab === 'requests' && <RequestsPanel requests={requests} mode="incoming" title={isPlatform ? c.t('Requests from admins', 'طلبات الأدمن') : c.t('Requests from your clients', 'طلبات عملائك')} />}
      {tab === 'subscribers' && <SubscribersPanel subscribers={subscribers} wallets={wallets} plans={plans} isPlatform={isPlatform} title={isPlatform ? c.t('Admins & credits', 'الأدمن والرصيد') : c.t('Clients & credits', 'العملاء والرصيد')} />}
    </>
  );
}

export function SuperAdminPlansPage() {
  const c = useCopy();
  return (
    <div className="bl" dir={c.dir}>
      <header className="bl-head">
        <div>
          <span className="bl-eyebrow"><Crown size={12} />{c.t('Platform owner · Service provider', 'مالك المنصة · مزود الخدمة')}</span>
          <h1><span className="bl-head-icon"><Layers size={19} /></span>{c.t('Plans & credits', 'الباقات والرصيد')}</h1>
          <p>{c.t('You own the AI and communication providers. Create the plans, free trial and add-ons admins subscribe to — every admin credit originates here.', 'أنت مالك مزودي الذكاء الاصطناعي وقنوات التواصل. أنشئ الباقات والتجربة المجانية والإضافات التي يشترك فيها الأدمن — كل رصيد الأدمن يبدأ من هنا.')}</p>
        </div>
      </header>
      <ProviderConsole ownerId={PLATFORM} isPlatform />
    </div>
  );
}

export function AdminPlansPage() {
  const c = useCopy();
  const identity = useBillingIdentity();
  useBillingRefresh(!!identity.uid);
  const [params, setParams] = useSearchParams();
  const area = params.get('area') === 'mine' ? 'mine' : 'clients';
  const { data: sub } = useSubscription(identity.uid);
  const { data: wallet } = useWallet(identity.uid);
  if (identity.role === 'SUPER_ADMIN') return <SuperAdminPlansPage />;
  const live = isLive(sub);
  const allowed = entitledTools(sub);
  const switchArea = (next: 'mine' | 'clients') => setParams(next === 'mine' ? { area: 'mine' } : {}, { replace: true });

  return (
    <div className="bl" dir={c.dir}>
      <header className="bl-head">
        <div>
          <span className="bl-eyebrow"><Store size={12} />{c.t('Partner · Reseller', 'شريك · موزع')}</span>
          <h1><span className="bl-head-icon"><Layers size={19} /></span>{c.t('Plans & subscriptions', 'الباقات والاشتراكات')}</h1>
          <p>{c.t('Renew your own platform subscription, and build the plans, free trial and add-ons you sell to your clients.', 'جدد اشتراكك مع المنصة، وابنِ الباقات والتجربة المجانية والإضافات التي تبيعها لعملائك.')}</p>
        </div>
        <div className="bl-switch" role="tablist" aria-label={c.t('Area', 'القسم')}>
          <button type="button" role="tab" aria-selected={area === 'clients'} onClick={() => switchArea('clients')}><Users size={16} /><span>{c.t('Plans for my clients', 'باقات عملائي')}<small>{c.t('What you sell', 'ما تبيعه')}</small></span></button>
          <button type="button" role="tab" aria-selected={area === 'mine'} onClick={() => switchArea('mine')}><Crown size={16} /><span>{c.t('My platform subscription', 'اشتراكي مع المنصة')}<small>{live ? c.t(`${(wallet?.balance ?? 0).toLocaleString()} credits left`, `متبقي ${new Intl.NumberFormat('ar-EG').format(wallet?.balance ?? 0)} رصيد`) : c.t('Renew / upgrade', 'تجديد / ترقية')}</small></span></button>
        </div>
      </header>

      {area === 'mine' ? <MySubscription audience="admin" /> : <>
        {live ? (
          <div className="bl-banner info"><Wallet size={17} /><div><b>{c.t(`Your wallet: ${(wallet?.balance ?? 0).toLocaleString()} credits`, `محفظتك: ${new Intl.NumberFormat('ar-EG').format(wallet?.balance ?? 0)} رصيد`)}</b><p>{c.t('Credits you give clients (plans, trials, add-ons, transfers) are deducted from this wallet. Need more? Request a credit add-on from the platform.', 'الرصيد الذي تمنحه لعملائك (باقات، تجارب، إضافات، تحويلات) يُخصم من هذه المحفظة. تحتاج المزيد؟ اطلب إضافة رصيد من المنصة.')}</p></div><button type="button" className="bl-btn sm" onClick={() => setParams({ area: 'mine' }, { replace: true })}><Coins size={13} />{c.t('Get credits', 'طلب رصيد')}</button></div>
        ) : (
          <div className="bl-banner warn"><AlertTriangle size={17} /><div><b>{c.t('Your platform subscription is not active', 'اشتراكك مع المنصة غير نشط')}</b><p>{c.t('Start the free trial or subscribe to a platform plan to create plans and serve clients.', 'ابدأ التجربة المجانية أو اشترك في باقة لتتمكن من إنشاء الباقات وخدمة العملاء.')}</p></div><button type="button" className="bl-btn sm" onClick={() => setParams({ area: 'mine' }, { replace: true })}><Crown size={13} />{c.t('Activate', 'تفعيل')}</button></div>
        )}
        <ProviderConsole ownerId={identity.uid ?? ''} isPlatform={false} allowedTools={allowed} locked={!live} />
      </>}
    </div>
  );
}
