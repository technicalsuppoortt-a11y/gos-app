import { useMemo, useState } from 'react';
import { Archive, Download, Eye, EyeOff, Gem, Layers, Package, Pencil, Plus, Search, Sparkles } from 'lucide-react';
import { billing, isLive, PLATFORM, type BillingPlan, type BillingSubscription } from '../../backend/billing';
import { PlanEditor } from './PlanEditor';
import { PlanDetailsModal } from './PlanDetailsModal';
import { UnitPricingSettings } from './UnitPricingSettings';
import { Empty, Modal, Spinner, Toggle, billingLabel, downloadCsv, toolName, useAction, useCopy } from './ui';

/** Table of plans or add-ons owned by the Super Admin ("platform") or by an Admin. */
export function PlanCatalog({ kind, plans, subscribers, isPlatform, allowedTools, locked, ownerId }: { kind: 'plan' | 'addon'; plans: BillingPlan[]; subscribers: BillingSubscription[]; isPlatform: boolean; allowedTools?: string[] | null; locked?: boolean; ownerId?: string }) {
  const c = useCopy();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('');
  const [editing, setEditing] = useState<BillingPlan | null | 'new'>(null);
  const [inspecting, setInspecting] = useState<BillingPlan | null>(null);
  const [archiving, setArchiving] = useState<BillingPlan | null>(null);
  const [addonMode, setAddonMode] = useState<'fixed' | 'dynamic'>('fixed');
  const rows = useMemo(() => plans.filter(plan => plan.kind === kind)
    .filter(plan => !currency || plan.currency === currency)
    .filter(plan => `${plan.name.en} ${plan.name.ar}`.toLowerCase().includes(search.trim().toLowerCase())), [plans, kind, search, currency]);
  const activeCount = (id: string) => subscribers.filter(sub => sub.planId === id && isLive(sub)).length;
  const currencies = [...new Set(plans.filter(plan => plan.kind === kind).map(plan => plan.currency))];
  const addon = kind === 'addon';
  const effectiveOwner = ownerId || (isPlatform ? PLATFORM : (plans[0]?.ownerId || ''));

  const exportCsv = () => downloadCsv(`${addon ? 'addons' : 'plans'}.csv`, ['Name (EN)', 'Name (AR)', 'Type', 'Price', 'Currency', 'Credits', isPlatform ? 'Channels' : 'Tools', 'Visible', 'Active subscribers'], rows.map(plan => [plan.name.en, plan.name.ar, plan.kind === 'addon' ? plan.addonType ?? '' : plan.billingType, plan.price, plan.currency, plan.credits, (isPlatform ? plan.channels ?? [] : plan.tools).join(' | '), plan.visible ? 'yes' : 'no', activeCount(plan.id)]));

  return (
    <>
      {addon && effectiveOwner && (
        <UnitPricingSettings
          providerId={effectiveOwner}
          isPlatform={isPlatform}
          onModeChange={setAddonMode}
        />
      )}
      {(!addon || addonMode === 'fixed') && (
        <section className="bl-card">
          <div className="bl-card-head">
            <div>
              <h2>{addon ? <Package size={17} /> : <Gem size={17} />}{addon ? c.t('Add-ons', 'الإضافات') : c.t('Subscription plans', 'باقات الاشتراك')} <span className="bl-count">{rows.length}</span></h2>
              <p>{addon ? (isPlatform ? c.t('Extra credits or seats admins can request on top of their platform plan.', 'رصيد أو مقاعد إضافية يطلبها المسؤول فوق باقة المنصة.') : c.t('Extra credits, seats or tools that subscribers can request on top of their plan.', 'رصيد أو مقاعد أو أدوات إضافية يطلبها المشترك فوق باقته.')) : isPlatform ? c.t('Platform plans define tenant limits, monthly credits and channel capabilities.', 'باقات المنصة تحدد حدود العملاء والرصيد الشهري وإمكانات القنوات.') : c.t('Plans your clients subscribe to. Their credits are deducted from your wallet.', 'باقات يشترك فيها عملاؤك. رصيدهم يُخصم من محفظتك.')}</p>
            </div>
            <div className="bl-toolbar-group">
              <button type="button" className="bl-btn" onClick={exportCsv} disabled={!rows.length}><Download size={15} />{c.t('Export CSV', 'تصدير CSV')}</button>
              <button type="button" className="bl-btn primary" disabled={locked} onClick={() => setEditing('new')}><Plus size={16} />{addon ? c.t('New add-on', 'إضافة جديدة') : c.t('Add new plan', 'إضافة باقة جديدة')}</button>
            </div>
          </div>
          <div className="bl-card-body" style={{ paddingBlockEnd: 0 }}>
            <div className="bl-toolbar">
              <label className="bl-search"><Search size={15} /><input className="bl-input" value={search} onChange={event => setSearch(event.target.value)} placeholder={c.t('Search plans…', 'ابحث في الباقات…')} aria-label={c.t('Search plans', 'بحث في الباقات')} /></label>
              {currencies.length > 1 && <select className="bl-input" style={{ width: 170 }} value={currency} onChange={event => setCurrency(event.target.value)} aria-label={c.t('Currency', 'العملة')}><option value="">{c.t('All currencies', 'كل العملات')}</option>{currencies.map(code => <option key={code} value={code}>{code}</option>)}</select>}
            </div>
          </div>
          {rows.length ? (
            <div className="bl-table-wrap" style={{ marginBlockStart: 14 }}>
              <table className="bl-table">
                <thead><tr>
                  <th>{c.t('Plan name', 'اسم الباقة')}</th><th>{c.t('Type', 'النوع')}</th><th>{c.t('Price', 'السعر')}</th><th>{addon ? c.t('Gives', 'يمنح') : c.t('Credits / mo', 'رصيد / شهر')}</th>
                  {!addon && <th>{isPlatform ? c.t('Channels', 'القنوات') : c.t('Tools', 'الأدوات')}</th>}{!addon && <th>{c.t('Subscribers', 'المشتركون')}</th>}<th>{c.t('Visibility', 'الظهور')}</th><th style={{ textAlign: 'end' }}>{c.t('Actions', 'الإجراءات')}</th>
                </tr></thead>
                <tbody>
                  {rows.map(plan => (
                    <tr key={plan.id}>
                      <td><div className="bl-name"><span className="bl-avatar">{addon ? <Package size={15} /> : <Layers size={15} />}</span><div><b>{c.pick(plan.name)}</b>{plan.badge.en && <small>{c.pick(plan.badge)}</small>}</div></div></td>
                      <td><span className="bl-pill violet plain">{billingLabel(plan, c)}</span></td>
                      <td className="bl-price">{c.money(plan.price, plan.currency)}</td>
                      <td className="bl-credits">{plan.addonType === 'seats' ? c.t(`+${plan.addonSeats} seats`, `+${c.num(plan.addonSeats ?? 0)} مقاعد`) : plan.addonType === 'tool' ? toolName(plan.addonTool ?? '', c.ar) : c.num(plan.credits)}</td>
                      {!addon && <td><span className="bl-pill blue plain" title={isPlatform ? (plan.channels ?? []).join(', ') : plan.tools.map(id => toolName(id, c.ar)).join(', ')}><Sparkles size={12} />{isPlatform ? c.t(`${plan.channels?.length ?? 0} channels`, `${c.num(plan.channels?.length ?? 0)} قنوات`) : c.t(`${plan.tools.length} tools`, `${c.num(plan.tools.length)} أدوات`)}</span></td>}
                      {!addon && <td className="num">{c.num(activeCount(plan.id))}</td>}
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <Toggle
                            label={plan.visible ? c.t('Visible', 'ظاهرة') : c.t('Hidden', 'مخفية')}
                            checked={plan.visible}
                            onChange={async (next) => {
                              await run(`toggle-${plan.id}`, () => billing('savePlan', { plan: { ...plan, visible: next } }), next ? c.t('Plan activated and visible.', 'تم تفعيل الباقة وإظهارها.') : c.t('Plan hidden.', 'تم إخفاء الباقة.'));
                            }}
                          />
                          <span className={`bl-pill ${plan.visible ? 'green' : 'plain'}`} style={{ fontSize: 11 }}>
                            {plan.visible ? c.t('Active', 'مفعلة') : c.t('Hidden', 'مخفية')}
                          </span>
                        </div>
                      </td>
                      <td><div className="bl-actions">
                        <button type="button" className="bl-btn icon" title={c.t('View details & subscribers', 'عرض التفاصيل والمشتركين')} aria-label={c.t('View details', 'عرض التفاصيل')} onClick={() => setInspecting(plan)}><Eye size={14} /></button>
                        <button type="button" className="bl-btn icon" title={c.t('Edit plan', 'تعديل الباقة')} aria-label={c.t('Edit', 'تعديل')} onClick={() => setEditing(plan)}><Pencil size={14} /></button>
                        <button type="button" className="bl-btn icon danger" title={c.t('Archive plan', 'أرشفة الباقة')} aria-label={c.t('Archive', 'أرشفة')} onClick={() => setArchiving(plan)}><Archive size={14} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={addon ? <Package size={22} /> : <Gem size={22} />} title={addon ? c.t('No add-ons yet', 'لا توجد إضافات بعد') : c.t('No plans yet', 'لا توجد باقات بعد')} text={locked ? c.t('Activate your platform subscription to start creating plans.', 'فعّل اشتراكك مع المنصة لتبدأ إنشاء الباقات.') : c.t('Create your first one to start selling.', 'أنشئ أول واحدة لتبدأ البيع.')} action={!locked && <button type="button" className="bl-btn primary" onClick={() => setEditing('new')}><Plus size={15} />{addon ? c.t('New add-on', 'إضافة جديدة') : c.t('Add new plan', 'إضافة باقة جديدة')}</button>} />
          )}
        </section>
      )}
      {inspecting && <PlanDetailsModal plan={inspecting} subscribers={subscribers} isPlatform={isPlatform} onClose={() => setInspecting(null)} />}
      {editing && <PlanEditor kind={kind} plan={editing === 'new' ? null : editing} isPlatform={isPlatform} allowedTools={allowedTools} onClose={() => setEditing(null)} />}
      {archiving && (
        <Modal title={c.t('Archive this plan?', 'أرشفة هذه الباقة؟')} icon={<Archive size={18} />} onClose={() => setArchiving(null)} footer={<>
          <button type="button" className="bl-btn" onClick={() => setArchiving(null)}>{c.t('Cancel', 'إلغاء')}</button>
          <button type="button" className="bl-btn danger" disabled={!!busy} onClick={() => run('archive', () => billing('archivePlan', { planId: archiving.id }), c.t('Plan archived.', 'تمت أرشفة الباقة.')).then(ok => ok && setArchiving(null))}>{busy ? <Spinner /> : <Archive size={15} />}{c.t('Archive', 'أرشفة')}</button>
        </>}>
          <p style={{ margin: 0, color: 'var(--bl-muted)', fontSize: 13.5 }}>{c.t('It will disappear from the pricing page and can no longer be requested. Current subscribers keep their plan until it ends.', 'ستختفي من صفحة الأسعار ولن يمكن طلبها. المشتركون الحاليون يحتفظون بباقتهم حتى نهايتها.')} <b style={{ color: 'var(--bl-text)' }}>{c.pick(archiving.name)}</b></p>
        </Modal>
      )}
    </>
  );
}
