import { useEffect, useState } from 'react';
import { ChannelPicker } from './ChannelPicker';
import { CalendarDays, Coins, Gift, Save, TrendingUp, Users, Zap } from 'lucide-react';
import { billing, DEFAULT_TRIAL, effectiveStatus, type BillingPlan, type BillingSubscription } from '../../backend/billing';
import { Spinner, Stat, Toggle, ToolPicker, useAction, useCopy } from './ui';

export function TrialSettings({ trial, subscribers, isPlatform, allowedTools, locked }: { trial: BillingPlan | undefined; subscribers: BillingSubscription[]; isPlatform: boolean; allowedTools?: string[] | null; locked?: boolean }) {
  const c = useCopy();
  const { busy, run } = useAction();
  const defaults = DEFAULT_TRIAL[isPlatform ? 'admin' : 'user'];
  const fromPlan = () => ({
    enabled: trial?.enabled ?? true,
    days: String(trial?.durationDays ?? defaults.days),
    credits: String(trial?.credits ?? defaults.credits),
    seats: String(trial?.limits?.seats ?? 1),
    clients: String(trial?.limits?.clients ?? 3),
    channels: trial?.channels ?? [],
    tools: trial?.tools ?? (allowedTools ?? []),
    name: trial?.name ?? { en: 'Free trial', ar: 'تجربة مجانية' },
  });
  const [form, setForm] = useState(fromPlan);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setForm(fromPlan()); }, [trial?.revision]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof ReturnType<typeof fromPlan>>(key: K, value: ReturnType<typeof fromPlan>[K]) => { setDirty(true); setForm(current => ({ ...current, [key]: value })); };

  const trialing = subscribers.filter(sub => effectiveStatus(sub) === 'trialing').length;
  const used = subscribers.filter(sub => sub.trialUsedAt).length;
  const converted = subscribers.filter(sub => sub.trialUsedAt && sub.plan?.kind === 'plan').length;

  const save = () => run('save', () => billing('savePlan', {
    plan: { kind: 'trial', enabled: form.enabled, durationDays: Number(form.days), credits: Number(form.credits), tools: form.tools, channels: form.channels, limits: { seats: Number(form.seats), clients: Number(form.clients) }, name: form.name, visible: true },
  }), c.t('Free trial settings saved.', 'تم حفظ إعدادات التجربة المجانية.')).then(ok => ok && setDirty(false));

  return (
    <div className="bl" style={{ paddingBlockEnd: 0 }}>
      <div className="bl-stats">
        <Stat icon={<Zap size={18} />} label={c.t('Active trials', 'تجارب نشطة')} value={c.num(trialing)} hint={c.t('Currently in free trial', 'في فترة التجربة الآن')} tone="green" />
        <Stat icon={<TrendingUp size={18} />} label={c.t('Converted to paid', 'تحولوا لمدفوع')} value={c.num(converted)} hint={used ? c.t(`${Math.round((converted / used) * 100)}% conversion`, `نسبة التحويل ${c.num(Math.round((converted / used) * 100))}%`) : '—'} tone="amber" />
        <Stat icon={<Users size={18} />} label={c.t('Trials used', 'تجارب مستخدمة')} value={c.num(used)} hint={c.t('One trial per account', 'تجربة واحدة لكل حساب')} />
      </div>

      <section className="bl-card">
        <div className="bl-card-head">
          <div><h2><Gift size={17} />{c.t('Free trial settings', 'إعدادات التجربة المجانية')}</h2><p>{isPlatform ? c.t('New admins can start this trial once before buying a platform plan.', 'الأدمن الجديد يقدر يبدأ التجربة مرة واحدة قبل شراء باقة.') : c.t('Your clients can start this trial once. Trial credits are deducted from your wallet.', 'عملاؤك يبدأون التجربة مرة واحدة. رصيد التجربة يُخصم من محفظتك.')}</p></div>
          <button type="button" className="bl-btn primary" disabled={!!busy || locked} onClick={save}>{busy ? <Spinner /> : <Save size={15} />}{c.t('Save changes', 'حفظ التغييرات')}</button>
        </div>
        <div className="bl-card-body bl-form">
          <div className="bl-toggle-row">
            <div><b>{c.t('Enable free trial for new accounts', 'تفعيل التجربة المجانية للحسابات الجديدة')}</b><small>{c.t('When disabled, accounts must request a paid plan.', 'عند الإيقاف يجب طلب باقة مدفوعة.')}</small></div>
            <Toggle checked={form.enabled} label={c.t('Enable free trial', 'تفعيل التجربة')} onChange={value => set('enabled', value)} />
          </div>
          <div className="bl-grid-2">
            <label className="bl-field"><span>{c.t('Trial name (Arabic)', 'اسم التجربة (عربي)')}</span><input className="bl-input" dir="rtl" maxLength={80} value={form.name.ar} onChange={event => set('name', { ...form.name, ar: event.target.value })} /></label>
            <label className="bl-field"><span>{c.t('Trial name (English)', 'اسم التجربة (إنجليزي)')}</span><input className="bl-input" dir="ltr" maxLength={80} value={form.name.en} onChange={event => set('name', { ...form.name, en: event.target.value })} /></label>
          </div>
          <div className="bl-section">
            <div className="bl-grid-2">
              <label className="bl-field"><span><CalendarDays size={13} />{c.t('Trial duration (days)', 'مدة التجربة (أيام)')}</span><input className="bl-input" type="number" min={1} max={365} value={form.days} onChange={event => set('days', event.target.value)} />
                <div className="bl-presets">{[7, 14, 30, 90].map(days => <button key={days} type="button" className="bl-chip" aria-pressed={form.days === String(days)} onClick={() => set('days', String(days))}>{c.t(`${days} days`, `${c.num(days)} يوم`)}</button>)}</div>
              </label>
              <label className="bl-field"><span><Coins size={13} />{c.t('Credits included', 'الرصيد المجاني')}</span><input className="bl-input" type="number" min={0} value={form.credits} onChange={event => set('credits', event.target.value)} /><small>{c.t('Granted monthly during the trial · no rollover', 'يُمنح شهريًا خلال التجربة · لا يُرحّل')}</small></label>
              <label className="bl-field"><span><Users size={13} />{c.t('Team seats', 'مقاعد الفريق')}</span><input className="bl-input" type="number" min={0} value={form.seats} onChange={event => set('seats', event.target.value)} /></label>
              {isPlatform && <label className="bl-field"><span><Users size={13} />{c.t('Client limit during trial', 'حد العملاء أثناء التجربة')}</span><input className="bl-input" type="number" min={0} value={form.clients} onChange={event => set('clients', event.target.value)} /></label>}
            </div>
          </div>
          {isPlatform ? <ChannelPicker value={form.channels} onChange={channels => set('channels', channels)} /> : <ToolPicker c={c} value={form.tools} allowed={allowedTools} onChange={tools => set('tools', tools)} />}
        </div>
      </section>
    </div>
  );
}
