import { useMemo, useState } from 'react';
import { Calendar, Check, Coins, Eye, Gem, Layers, Package, Sparkles, Users, X, ShieldCheck, Mail, ArrowUpRight } from 'lucide-react';
import { isLive, effectiveStatus, type BillingPlan, type BillingSubscription } from '../../backend/billing';
import { Modal, StatusPill, billingLabel, priceSuffix, toolName, useCopy } from './ui';

export function PlanDetailsModal({ plan, subscribers, isPlatform, onClose }: { plan: BillingPlan; subscribers: BillingSubscription[]; isPlatform: boolean; onClose: () => void }) {
  const c = useCopy();
  const [search, setSearch] = useState('');
  const planSubs = useMemo(() => subscribers.filter(s => s.planId === plan.id), [subscribers, plan.id]);
  const activeSubs = useMemo(() => planSubs.filter(s => isLive(s)), [planSubs]);
  const filteredSubs = useMemo(() => planSubs.filter(s => `${s.subscriberName} ${s.subscriberEmail}`.toLowerCase().includes(search.toLowerCase())), [planSubs, search]);

  const addon = plan.kind === 'addon';
  const tools = plan.tools || [];
  const channels = plan.channels || [];
  const estRevenue = activeSubs.length * plan.price;

  return (
    <Modal wide title={c.t('Plan details & connected tenants', 'تفاصيل الباقة والمشتركين')} icon={addon ? <Package size={18} /> : <Gem size={18} />} onClose={onClose} footer={<button type="button" className="bl-btn" onClick={onClose}>{c.t('Close', 'إغلاق')}</button>}>
      <div style={{ display: 'grid', gap: 18 }}>
        {/* Header summary banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 18px', borderRadius: 14, background: 'var(--bl-surface-2)', border: '1px solid var(--bl-border)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="bl-avatar" style={{ width: 44, height: 44, borderRadius: 12, fontSize: 18 }}>
              {addon ? <Package size={22} /> : <Layers size={22} />}
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{c.pick(plan.name)}</h3>
                {plan.badge.en && <span className="bl-pill violet plain">{c.pick(plan.badge)}</span>}
                <span className={`bl-pill ${plan.visible ? 'green' : 'plain'}`}>{plan.visible ? c.t('Active / Visible', 'نشطة / ظاهرة') : c.t('Hidden / Inactive', 'مخفية / غير نشطة')}</span>
              </div>
              <p style={{ margin: '3px 0 0', color: 'var(--bl-muted)', fontSize: 13 }}>{c.pick(plan.description) || c.t('Master platform subscription plan configuration.', 'إعدادات باقة المنصة الرئيسية.')}</p>
            </div>
          </div>
          <div style={{ textAlign: c.ar ? 'left' : 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 850, color: 'var(--bl-accent-2)' }}>
              {c.money(plan.price, plan.currency)} <span style={{ fontSize: 13, color: 'var(--bl-muted)', fontWeight: 500 }}>{priceSuffix(plan, c)}</span>
            </div>
            <span className="bl-pill violet plain" style={{ marginBlockStart: 4 }}>{billingLabel(plan, c)}</span>
          </div>
        </div>

        {/* Quick Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <div className="bl-stat" style={{ padding: 12 }}>
            <i style={{ width: 32, height: 32 }}><Users size={16} /></i>
            <div>
              <span>{c.t('Active subscribers', 'المشتركون النشطون')}</span>
              <strong style={{ fontSize: 18 }}>{c.num(activeSubs.length)}</strong>
              <small>{c.t(`${planSubs.length} total history`, `إجمالي السجلات: ${c.num(planSubs.length)}`)}</small>
            </div>
          </div>
          <div className="bl-stat" data-tone="violet" style={{ padding: 12 }}>
            <i style={{ width: 32, height: 32 }}><Coins size={16} /></i>
            <div>
              <span>{c.t('Credits / cycle', 'الكريديت / الدورة')}</span>
              <strong style={{ fontSize: 18 }}>{c.num(plan.credits)}</strong>
              <small>{c.t('Resets monthly', 'يتجدد شهريًا')}</small>
            </div>
          </div>
          <div className="bl-stat" data-tone="green" style={{ padding: 12 }}>
            <i style={{ width: 32, height: 32 }}><Sparkles size={16} /></i>
            <div>
              <span>{c.t('Est. revenue', 'الإيراد التقديري')}</span>
              <strong style={{ fontSize: 18 }}>{c.money(estRevenue, plan.currency)}</strong>
              <small>{c.t('Current active pool', 'من المشتركين الحاليين')}</small>
            </div>
          </div>
          <div className="bl-stat" style={{ padding: 12 }}>
            <i style={{ width: 32, height: 32 }}><ShieldCheck size={16} /></i>
            <div>
              <span>{isPlatform ? c.t('Client limit', 'حد العملاء') : c.t('Team seats', 'مقاعد الفريق')}</span>
              <strong style={{ fontSize: 18 }}>{isPlatform ? (plan.limits?.clients ? c.num(plan.limits.clients) : c.t('Unlimited', 'بلا حد')) : (plan.limits?.seats ? c.num(plan.limits.seats) : c.t('Unlimited', 'بلا حد'))}</strong>
              <small>{c.t('Capacity limit', 'سعة الباقة')}</small>
            </div>
          </div>
        </div>

        {/* Tools or Channels Unlocked */}
        {!addon && (
          <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--bl-border)', background: 'var(--bl-surface)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--bl-muted)' }}>
              <Sparkles size={15} color="var(--bl-accent-2)" />
              {isPlatform ? c.t('Connected Channel Capabilities', 'إمكانات القنوات المربوطة') : c.t('Included Platform Tools', 'الأدوات المشمولة في الباقة')}
            </h4>
            <div className="bl-tags">
              {isPlatform ? (
                channels.length ? channels.map(ch => <span key={ch} className="bl-pill violet plain"><Check size={12} />{ch}</span>) : <span style={{ color: 'var(--bl-muted)', fontSize: 12.5 }}>{c.t('All platform channels unlocked by default.', 'كافة قنوات المنصة متاحة.')}</span>
              ) : (
                tools.length ? tools.map(tid => <span key={tid} className="bl-pill violet plain"><Check size={12} />{toolName(tid, c.ar)}</span>) : <span style={{ color: 'var(--bl-muted)', fontSize: 12.5 }}>{c.t('Full access to all platform tools.', 'وصول كامل لكافة الأدوات.')}</span>
              )}
            </div>
          </div>
        )}

        {/* Connected Tenants / Subscribers Section */}
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 750, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Users size={16} />{c.t('Connected Subscribers & Tenants', 'المشتركون والعملاء المرتبطون')} <span className="bl-count">{planSubs.length}</span>
            </h4>
            {planSubs.length > 3 && (
              <input type="search" className="bl-input" style={{ width: 220, height: 32, fontSize: 12 }} placeholder={c.t('Search subscribers…', 'ابحث في المشتركين…')} value={search} onChange={e => setSearch(e.target.value)} />
            )}
          </div>

          {filteredSubs.length ? (
            <div className="bl-table-wrap" style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--bl-border)', borderRadius: 12 }}>
              <table className="bl-table" style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th>{c.t('Subscriber', 'المشترك')}</th>
                    <th>{c.t('Role', 'الدور')}</th>
                    <th>{c.t('Status', 'الحالة')}</th>
                    <th>{c.t('Started', 'تاريخ البدء')}</th>
                    <th>{c.t('Period End', 'نهاية الفترة')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.map(sub => (
                    <tr key={sub.id}>
                      <td>
                        <div className="bl-name">
                          <div>
                            <b>{sub.subscriberName || c.t('Unnamed User', 'مستخدم')}</b>
                            <small dir="ltr">{sub.subscriberEmail}</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="bl-pill plain">{sub.subscriberRole}</span></td>
                      <td><StatusPill status={effectiveStatus(sub)} c={c} /></td>
                      <td style={{ color: 'var(--bl-muted)' }}>{c.date(sub.startedAt)}</td>
                      <td style={{ color: 'var(--bl-muted)' }}>{sub.currentPeriodEnd ? c.date(sub.currentPeriodEnd) : c.t('Lifetime', 'مدى الحياة')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 14px', borderRadius: 12, background: 'var(--bl-surface-2)', border: '1px dashed var(--bl-border)', color: 'var(--bl-muted)', fontSize: 13 }}>
              {c.t('No subscribers or tenants are currently assigned to this plan.', 'لا يوجد مشتركون مرتبطون بهذه الباقة حاليًا.')}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
