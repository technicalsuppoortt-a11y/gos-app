import { useEffect, useState } from 'react';
import { RotateCcw, Save, Sparkles } from 'lucide-react';
import { billing } from '../../backend/billing';
import { CREDIT_ACTIONS, MAX_CREDIT_WEIGHT, creditActions, creditRule, type CreditAction, type CreditRules, type CreditSettings } from '../../../functions/credit-actions.js';
import { showToast } from '../../utils/toast';
import { Spinner, useCopy } from './ui';

type Draft = Partial<Record<CreditAction, { enabled: boolean; weight: string }>>;

export function AICreditSettings({ isPlatform }: { isPlatform: boolean }) {
  const c = useCopy();
  const [settings, setSettings] = useState<CreditSettings | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    billing<CreditSettings>('getCreditWeights').then(value => {
      if (active) setSettings(value);
    }).catch((error: Error) => {
      if (active) setError(error.message);
    });
    return () => { active = false; };
  }, [reload]);

  const edit = (action: CreditAction, value: Draft[CreditAction]) => {
    setDraft(current => ({ ...current, [action]: value }));
    setError('');
  };
  const dirty = creditActions.filter(action => {
    const saved = creditRule(action, settings?.rules);
    const value = draft[action];
    return value && (value.enabled !== saved.enabled || value.weight !== String(saved.weight));
  });

  async function save() {
    if (!settings || saving) return;
    const rules: CreditRules = {};
    for (const action of dirty) {
      const value = draft[action]!;
      const weight = Number(value.weight);
      if (!value.weight.trim() || !Number.isInteger(weight) || weight < 0 || weight > MAX_CREDIT_WEIGHT) {
        setError(c.t('Enter a valid whole-number credit cost for each action.', 'أدخل تكلفة صحيحة لكل إجراء.'));
        return;
      }
      rules[action] = { enabled: value.enabled, weight };
    }
    setSaving(true);
    setError('');
    try {
      setSettings(await billing<CreditSettings>('saveCreditWeights', { revision: settings.revision, rules }));
      setDraft({});
      showToast.success(c.t('Credit settings saved', 'تم حفظ إعدادات الرصيد'));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return <form className="bl-card" role="tabpanel" aria-labelledby="bl-tab-ai-settings" onSubmit={event => { event.preventDefault(); void save(); }}>
    <header className="bl-card-head">
      <div><h2><Sparkles size={17} />{c.t('AI Settings', 'إعدادات الذكاء الاصطناعي')}</h2>
        <p>{isPlatform
          ? c.t('Set usage prices and availability for accounts billed directly by the platform.', 'حدد تكلفة الاستخدام والإتاحة للحسابات التي تفوترها المنصة مباشرة.')
          : c.t('Set usage prices and availability for your clients and Agency workspaces.', 'حدد تكلفة الاستخدام والإتاحة لعملائك ومساحات عمل الوكالة التابعة لك.')}</p>
      </div>
      <button type="submit" className="bl-btn primary" disabled={!dirty.length || saving || !settings}>
        {saving ? <Spinner size={14} /> : <Save size={14} />}{c.t('Save settings', 'حفظ الإعدادات')}
      </button>
    </header>
    {error && <div className="bl-banner danger" role="alert">
      <p>{error}</p>
      <button className="bl-btn sm" type="button" disabled={saving} onClick={() => { setSettings(null); setDraft({}); setError(''); setReload(value => value + 1); }}>
        <RotateCcw size={14} />{c.t('Reload settings', 'إعادة تحميل الإعدادات')}
      </button>
    </div>}
    {!settings && !error && <div className="bl-card-body" role="status"><Spinner /> {c.t('Loading credit settings…', 'جارٍ تحميل إعدادات الرصيد…')}</div>}
    {settings && <div className="bl-table-wrap">
      <table className="bl-table bl-credit-actions">
        <thead><tr>
          <th scope="col">{c.t('Feature', 'الميزة')}</th>
          <th scope="col">{c.t('Available', 'متاحة')}</th>
          <th scope="col">{c.t('Credit cost', 'تكلفة الرصيد')}</th>
          <th scope="col">{c.t('Default', 'الافتراضي')}</th>
        </tr></thead>
        {Array.from(new Set(creditActions.map(action => CREDIT_ACTIONS[action][0]))).map(group => {
          const actions = creditActions.filter(action => CREDIT_ACTIONS[action][0] === group);
          return <tbody key={group}>
            <tr><th colSpan={4} scope="rowgroup">{c.t(group, CREDIT_ACTIONS[actions[0]][1])}</th></tr>
            {actions.map(action => {
              const [, , en, ar, standard] = CREDIT_ACTIONS[action];
              const label = c.t(en, ar);
              const rule = creditRule(action, settings.rules);
              const value = draft[action] ?? { enabled: rule.enabled, weight: String(rule.weight) };
              const unit = group === 'Email' ? c.t('per recipient', 'لكل مستلم')
                : action === 'voice_transcribe' ? c.t('per started minute', 'لكل دقيقة مبدوءة') : c.t('per action', 'لكل إجراء');
              return <tr key={action}>
                <td><b>{label}</b></td>
                <td><label className="bl-toggle"><input type="checkbox" role="switch" aria-label={label} checked={value.enabled} disabled={saving} onChange={event => edit(action, { ...value, enabled: event.target.checked })} /></label></td>
                <td><div className="bl-credit-cost"><input className="bl-input" type="number" min={0} max={MAX_CREDIT_WEIGHT} step={1} required disabled={saving} aria-label={c.t(`${en} credit cost`, `تكلفة ${ar}`)} value={value.weight} onChange={event => edit(action, { ...value, weight: event.target.value })} /><small>{unit}</small></div></td>
                <td><button className="bl-btn sm ghost" type="button" title={c.t('Restore default', 'استعادة القيمة الافتراضية')} aria-label={c.t(`Restore default for ${en}`, `استعادة القيمة الافتراضية لـ ${ar}`)} disabled={saving || value.enabled && value.weight === String(standard)} onClick={() => edit(action, { enabled: true, weight: String(standard) })}><RotateCcw size={13} />{c.num(standard)}</button></td>
              </tr>;
            })}
          </tbody>;
        })}
      </table>
    </div>}
  </form>;
}
