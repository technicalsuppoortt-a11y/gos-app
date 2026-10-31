import { BookingSelect as DashboardSelect } from '../booking/BookingSelect';
import { useState } from 'react';
import { ChannelPicker } from './ChannelPicker';
import { CalendarClock, Coins, Gem, Globe, Infinity as InfinityIcon, Languages, ListChecks, Package, Plus, Save, Tag, Trash2, Users, Wrench } from 'lucide-react';
import { billing, CURRENCIES, TOOL_IDS, type BillingPlan } from '../../backend/billing';
import { Modal, Spinner, Toggle, ToolPicker, toolName, useAction, useCopy } from './ui';

type Draft = {
  id?: string; kind: 'plan' | 'addon'; visible: boolean;
  name: { en: string; ar: string }; description: { en: string; ar: string };
  badge: { en: string; ar: string }; cta: { en: string; ar: string };
  features: { en: string[]; ar: string[] };
  price: string; currency: string; billingType: 'monthly' | 'annual' | 'fixed' | 'lifetime'; durationDays: string;
  credits: string; tools: string[]; channels: string[]; seats: string; clients: string;
  addonType: 'credits' | 'seats' | 'tool'; addonSeats: string; addonTool: string; sortOrder: string;
};

function toDraft(kind: 'plan' | 'addon', plan?: BillingPlan | null): Draft {
  return {
    id: plan?.id, kind, visible: plan?.visible ?? true,
    name: plan?.name ?? { en: '', ar: '' }, description: plan?.description ?? { en: '', ar: '' },
    badge: plan?.badge ?? { en: '', ar: '' }, cta: plan?.cta ?? { en: '', ar: '' },
    features: plan?.features ?? { en: [], ar: [] },
    price: String(plan?.price ?? ''), currency: plan?.currency ?? 'USD',
    billingType: plan && plan.billingType !== 'once' ? plan.billingType : 'monthly',
    durationDays: String(plan?.durationDays ?? 90), credits: String(plan?.credits ?? (kind === 'addon' ? 1000 : 500)),
    channels: plan?.channels ?? [], tools: plan?.tools ?? [], seats: String(plan?.limits?.seats ?? 1), clients: String(plan?.limits?.clients ?? 10),
    addonType: plan?.addonType ?? 'credits', addonSeats: String(plan?.addonSeats ?? 1), addonTool: plan?.addonTool ?? '',
    sortOrder: String(plan?.sortOrder ?? 0),
  };
}

export function PlanEditor({ kind, plan, isPlatform, allowedTools, onClose }: { kind: 'plan' | 'addon'; plan?: BillingPlan | null; isPlatform: boolean; allowedTools?: string[] | null; onClose: () => void }) {
  const c = useCopy();
  const { busy, run } = useAction();
  const [draft, setDraft] = useState<Draft>(() => toDraft(kind, plan));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const editing = !!plan;
  const addon = kind === 'addon';
  const toolOptions = TOOL_IDS.filter(id => !allowedTools || allowedTools.includes(id));

  const save = () => run('save', () => billing('savePlan', {
    plan: {
      id: draft.id, kind, visible: draft.visible, name: draft.name, description: draft.description, badge: draft.badge, cta: draft.cta,
      features: { en: draft.features.en.filter(Boolean), ar: draft.features.ar.filter(Boolean) },
      price: Number(draft.price || 0), currency: draft.currency, billingType: draft.billingType, durationDays: Number(draft.durationDays),
      credits: addon && draft.addonType !== 'credits' ? 0 : Number(draft.credits || 0), tools: draft.tools, channels: draft.channels, limits: { seats: Number(draft.seats || 0), clients: Number(draft.clients || 0) },
      addonType: draft.addonType, addonSeats: Number(draft.addonSeats || 0), addonTool: draft.addonTool, sortOrder: Number(draft.sortOrder || 0),
    },
  }), editing ? c.t('Plan updated.', 'تم تحديث الباقة.') : c.t('Plan created.', 'تم إنشاء الباقة.')).then(ok => { if (ok) onClose(); });

  const billingTypes = [
    { id: 'monthly', icon: <CalendarClock size={15} />, en: 'Monthly', ar: 'شهري', hintEn: 'Renews every month', hintAr: 'يتجدد كل شهر' },
    { id: 'annual', icon: <CalendarClock size={15} />, en: 'Annual', ar: 'سنوي', hintEn: '12 months', hintAr: '12 شهر' },
    { id: 'fixed', icon: <CalendarClock size={15} />, en: 'Fixed period', ar: 'مدة محددة', hintEn: 'N days', hintAr: 'عدد أيام' },
    { id: 'lifetime', icon: <InfinityIcon size={15} />, en: 'Lifetime', ar: 'مدى الحياة', hintEn: 'Pay once', hintAr: 'دفعة واحدة' },
  ] as const;

  const featureList = (lang: 'en' | 'ar') => (
    <div className="bl-field">
      <span><ListChecks size={13} />{lang === 'en' ? c.t('English features', 'المزايا بالإنجليزية') : c.t('Arabic features', 'المزايا بالعربية')}</span>
      {draft.features[lang].map((feature, index) => (
        <div key={index} className="bl-list-row">
          <input className="bl-input" dir={lang === 'ar' ? 'rtl' : 'ltr'} value={feature} maxLength={160} placeholder={lang === 'en' ? 'e.g. Access to all tools' : 'مثال: الوصول لكل الأدوات'} onChange={event => set('features', { ...draft.features, [lang]: draft.features[lang].map((item, i) => i === index ? event.target.value : item) })} />
          <button type="button" className="bl-btn icon danger" aria-label={c.t('Remove feature', 'حذف الميزة')} onClick={() => set('features', { ...draft.features, [lang]: draft.features[lang].filter((_, i) => i !== index) })}><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className="bl-btn sm success" style={{ justifySelf: 'start' }} disabled={draft.features[lang].length >= 20} onClick={() => set('features', { ...draft.features, [lang]: [...draft.features[lang], ''] })}><Plus size={13} />{c.t('Add feature', 'إضافة ميزة')}</button>
    </div>
  );

  return (
    <Modal
      wide
      icon={addon ? <Package size={18} /> : <Gem size={18} />}
      title={editing ? (addon ? c.t('Edit add-on', 'تعديل الإضافة') : c.t('Edit subscription plan', 'تعديل باقة الاشتراك')) : addon ? c.t('New add-on', 'إضافة جديدة') : c.t('Add new subscription plan', 'إضافة باقة اشتراك جديدة')}
      subtitle={isPlatform ? c.t('Offered to admins (partners) on the platform.', 'تُعرض للأدمن (الشركاء) على المنصة.') : c.t('Offered to your own clients (users).', 'تُعرض لعملائك (المستخدمين).')}
      onClose={onClose}
      footer={<>
        <button type="button" className="bl-btn" onClick={onClose}>{c.t('Cancel', 'إلغاء')}</button>
        <button type="button" className="bl-btn primary" disabled={!!busy} onClick={save}>{busy ? <Spinner /> : <Save size={15} />}{editing ? c.t('Save changes', 'حفظ التغييرات') : addon ? c.t('Add add-on', 'إضافة') : c.t('Add plan', 'إضافة الباقة')}</button>
      </>}
    >
      <form className="bl-form" onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="bl-toggle-row">
          <div><b><Globe size={14} style={{ verticalAlign: '-2px', marginInlineEnd: 6 }} />{c.t('Show on website / pricing page', 'إظهار الباقة على الموقع')}</b><small>{c.t('Hidden plans can still be assigned manually.', 'الباقات المخفية يمكن تعيينها يدويًا.')}</small></div>
          <Toggle checked={draft.visible} label={c.t('Visible', 'ظاهرة')} onChange={value => set('visible', value)} />
        </div>

        <div className="bl-grid-2">
          <label className="bl-field"><span><Languages size={13} />{c.t('Name (Arabic)', 'الاسم (عربي)')}</span><input className="bl-input" dir="rtl" maxLength={80} value={draft.name.ar} placeholder="مثال: الباقة الذهبية" onChange={event => set('name', { ...draft.name, ar: event.target.value })} /></label>
          <label className="bl-field"><span><Languages size={13} />{c.t('Name (English)', 'الاسم (إنجليزي)')}</span><input className="bl-input" dir="ltr" required maxLength={80} value={draft.name.en} placeholder="e.g. Golden Plan" onChange={event => set('name', { ...draft.name, en: event.target.value })} /></label>
        </div>

        {addon ? (
          <div className="bl-field">
            <span><Package size={13} />{c.t('Add-on type', 'نوع الإضافة')}</span>
            <div className="bl-segment">
              {([['credits', <Coins key="c" size={15} />, 'Credit pack', 'باقة رصيد'], ['seats', <Users key="s" size={15} />, 'Team seats', 'مقاعد فريق'], ['tool', <Wrench key="t" size={15} />, 'Tool unlock', 'فتح أداة']] as const).filter(([id]) => !isPlatform || id !== 'tool').map(([id, icon, en, ar]) => (
                <button key={id} type="button" aria-pressed={draft.addonType === id} onClick={() => set('addonType', id)}>{icon}{c.t(en, ar)}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bl-field">
            <span><CalendarClock size={13} />{c.t('Subscription type', 'نوع الاشتراك')}</span>
            <div className="bl-segment">
              {billingTypes.map(type => (
                <button key={type.id} type="button" aria-pressed={draft.billingType === type.id} onClick={() => set('billingType', type.id)}>{type.icon}{c.t(type.en, type.ar)}<small>{c.t(type.hintEn, type.hintAr)}</small></button>
              ))}
            </div>
          </div>
        )}

        <div className="bl-grid-3">
          <label className="bl-field"><span>$ {c.t('Price', 'السعر')}</span><input className="bl-input" type="number" min={0} step="0.01" inputMode="decimal" value={draft.price} placeholder="100" onChange={event => set('price', event.target.value)} /></label>
          <label className="bl-field"><span>{c.t('Currency', 'العملة')}</span><DashboardSelect className="bl-input" value={draft.currency} onChange={event => set('currency', event.target.value)}>{CURRENCIES.map(currency => <option key={currency} value={currency}>{currency}</option>)}</DashboardSelect></label>
          {!addon && draft.billingType === 'fixed' && <label className="bl-field"><span>{c.t('Duration (days)', 'المدة (أيام)')}</span><input className="bl-input" type="number" min={1} max={3650} value={draft.durationDays} onChange={event => set('durationDays', event.target.value)} /></label>}
          {(!addon || draft.addonType === 'credits') && <label className="bl-field"><span><Coins size={13} />{addon ? c.t('Credits', 'الرصيد') : c.t('Credits / month', 'الرصيد / شهريًا')}</span><input className="bl-input" type="number" min={0} value={draft.credits} onChange={event => set('credits', event.target.value)} />{!addon && <small>{c.t('Resets monthly · no rollover', 'يتجدد شهريًا · لا يُرحّل')}</small>}</label>}
          {addon && draft.addonType === 'seats' && <label className="bl-field"><span><Users size={13} />{c.t('Extra seats', 'مقاعد إضافية')}</span><input className="bl-input" type="number" min={1} max={1000} value={draft.addonSeats} onChange={event => set('addonSeats', event.target.value)} /></label>}
          {!isPlatform && addon && draft.addonType === 'tool' && <label className="bl-field"><span><Wrench size={13} />{c.t('Tool', 'الأداة')}</span><DashboardSelect className="bl-input" value={draft.addonTool} onChange={event => set('addonTool', event.target.value)}><option value="">{c.t('Choose a tool…', 'اختر أداة…')}</option>{toolOptions.map(id => <option key={id} value={id}>{toolName(id, c.ar)}</option>)}</DashboardSelect></label>}
        </div>

        {!addon && (
          <div className="bl-grid-3">
            <label className="bl-field"><span><Users size={13} />{c.t('Team seats', 'مقاعد الفريق')}</span><input className="bl-input" type="number" min={0} value={draft.seats} onChange={event => set('seats', event.target.value)} /><small>{c.t('0 = unlimited', '0 = بلا حد')}</small></label>
            {isPlatform && <label className="bl-field"><span><Users size={13} />{c.t('Client limit', 'حد العملاء')}</span><input className="bl-input" type="number" min={0} value={draft.clients} onChange={event => set('clients', event.target.value)} /><small>{c.t('Active client subscriptions · 0 = unlimited', 'اشتراكات العملاء النشطة · 0 = بلا حد')}</small></label>}
            <label className="bl-field"><span>{c.t('Sort order', 'الترتيب')}</span><input className="bl-input" type="number" min={0} value={draft.sortOrder} onChange={event => set('sortOrder', event.target.value)} /></label>
          </div>
        )}

        <div className="bl-grid-2">
          <label className="bl-field"><span><Tag size={13} />{c.t('Badge (Arabic)', 'الشارة (عربي)')}</span><input className="bl-input" dir="rtl" maxLength={30} value={draft.badge.ar} placeholder="مثال: الأكثر طلبًا" onChange={event => set('badge', { ...draft.badge, ar: event.target.value })} /></label>
          <label className="bl-field"><span><Tag size={13} />{c.t('Badge (English)', 'الشارة (إنجليزي)')}</span><input className="bl-input" dir="ltr" maxLength={30} value={draft.badge.en} placeholder="e.g. Popular" onChange={event => set('badge', { ...draft.badge, en: event.target.value })} /></label>
          <label className="bl-field"><span>{c.t('Button text (Arabic)', 'نص الزر (عربي)')}</span><input className="bl-input" dir="rtl" maxLength={40} value={draft.cta.ar} placeholder="مثال: اشترك الآن" onChange={event => set('cta', { ...draft.cta, ar: event.target.value })} /></label>
          <label className="bl-field"><span>{c.t('Button text (English)', 'نص الزر (إنجليزي)')}</span><input className="bl-input" dir="ltr" maxLength={40} value={draft.cta.en} placeholder="e.g. Subscribe now" onChange={event => set('cta', { ...draft.cta, en: event.target.value })} /></label>
        </div>

        <div className="bl-grid-2">{featureList('ar')}{featureList('en')}</div>

        {!addon && !isPlatform && <ToolPicker c={c} value={draft.tools} allowed={allowedTools} onChange={tools => set('tools', tools)} />}
        {!addon && isPlatform && <ChannelPicker value={draft.channels} onChange={channels => set('channels', channels)} />}
      </form>
    </Modal>
  );
}
