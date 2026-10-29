import { useState, useEffect } from 'react';
import { Sliders, Package, Sparkles, Check, Save, Coins, Layers } from 'lucide-react';
import { billing, CURRENCIES, useBillingSettings, type Currency } from '../../backend/billing';
import { Spinner, useAction, useCopy } from './ui';

interface UnitPricingSettingsProps {
  providerId: string;
  isPlatform: boolean;
  onSaved?: () => void;
  onModeChange?: (mode: 'fixed' | 'dynamic' | 'both') => void;
}

export function UnitPricingSettings({ providerId, isPlatform, onSaved, onModeChange }: UnitPricingSettingsProps) {
  const c = useCopy();
  const { busy, run } = useAction();
  const { data: settings, loading } = useBillingSettings(providerId);

  const [mode, setMode] = useState<'fixed' | 'dynamic' | 'both'>('both');
  const [creditsPerUnit, setCreditsPerUnit] = useState<number>(100);
  const [pricePerUnit, setPricePerUnit] = useState<number>(5);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [minUnits, setMinUnits] = useState<number>(1);
  const [maxUnits, setMaxUnits] = useState<number>(100);

  // Interactive live simulator state
  const [previewUnits, setPreviewUnits] = useState<number>(5);

  useEffect(() => {
    if (settings) {
      const activeMode: 'fixed' | 'dynamic' | 'both' = ['fixed', 'dynamic', 'both'].includes(settings.addonMode) ? settings.addonMode : 'both';
      setMode(activeMode);
      onModeChange?.(activeMode);
      if (settings.unitRate) {
        setCreditsPerUnit(settings.unitRate.creditsPerUnit || 100);
        setPricePerUnit(settings.unitRate.pricePerUnit || 5);
        setCurrency(settings.unitRate.currency || 'USD');
        setMinUnits(settings.unitRate.minUnits || 1);
        setMaxUnits(settings.unitRate.maxUnits || 100);
        setPreviewUnits(Math.min(settings.unitRate.maxUnits || 100, Math.max(settings.unitRate.minUnits || 1, 5)));
      }
    }
  }, [settings]);

  const handleModeSelect = (nextMode: 'fixed' | 'dynamic' | 'both') => {
    setMode(nextMode);
    onModeChange?.(nextMode);
    void billing('saveBillingSettings', {
      providerId,
      addonMode: nextMode,
      unitRate: {
        creditsPerUnit: Number(creditsPerUnit) || 100,
        pricePerUnit: Number(pricePerUnit) || 0,
        currency,
        minUnits: Number(minUnits) || 1,
        maxUnits: Number(maxUnits) || 100,
      },
    }).then(() => {
      onSaved?.();
    }).catch(err => {
      console.error('Failed to auto-save mode:', err);
    });
  };

  const saveSettings = () => {
    run('saveSettings', async () => {
      await billing('saveBillingSettings', {
        providerId,
        addonMode: mode,
        unitRate: {
          creditsPerUnit: Number(creditsPerUnit) || 100,
          pricePerUnit: Number(pricePerUnit) || 0,
          currency,
          minUnits: Number(minUnits) || 1,
          maxUnits: Number(maxUnits) || 100,
        },
      });
      onSaved?.();
    }, c.t('Settings saved successfully!', 'تم حفظ إعدادات الإضافات بنجاح!'));
  };

  const previewCredits = previewUnits * creditsPerUnit;
  const previewCost = Math.round(previewUnits * pricePerUnit * 100) / 100;

  if (loading) {
    return (
      <div className="bl-card" style={{ padding: 24, textAlign: 'center' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <section className="bl-card" style={{ padding: '24px 28px', marginBlockEnd: 24, borderRadius: 16, border: '1px solid var(--bl-border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBlockEnd: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBlockEnd: 4 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, background: 'rgba(124, 58, 237, 0.1)', color: 'var(--bl-accent)' }}>
              <Sliders size={18} />
            </span>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
              {isPlatform
                ? c.t('Platform Add-on Rules & Unit Pricing', 'قواعد إضافات المنصة وتسعير الوحدات')
                : c.t('End-User Add-on Modes & Dynamic Rates', 'أنماط إضافات العملاء وأسعار الوحدات')}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--bl-muted)', maxWidth: 650, lineHeight: 1.5 }}>
            {isPlatform
              ? c.t('Configure how tenant Admins purchase add-ons: fixed pre-packaged tiers or dynamic credit top-up sliders.', 'حدد كيف يشتري مسؤولو المنصة الإضافات: باقات جاهزة ثابتة أو شريط تمرير لشحن رصيد مخصص.')
              : c.t('Configure how your end-users purchase extra credits: predefined packages or dynamic credit quantity steppers.', 'حدد كيف يشتري عملاؤك الرصيد الإضافي: باقات جاهزة أو أداة تحديد رصيد ديناميكية.')}
          </p>
        </div>

        <button
          type="button"
          className="bl-btn primary"
          disabled={busy === 'saveSettings'}
          onClick={saveSettings}
          style={{ padding: '9px 18px', fontWeight: 600, borderRadius: 10 }}
        >
          {busy === 'saveSettings' ? <Spinner /> : <Save size={15} />}
          {c.t('Save Add-on Rules', 'حفظ قواعد الإضافات')}
        </button>
      </div>

      {/* Purchase Mode Selector (3 Options: Both, Fixed Packages, or Dynamic Slider) */}
      <div style={{ marginBlockEnd: mode !== 'fixed' ? 20 : 0 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBlockEnd: 8, color: 'var(--bl-text)' }}>
          {c.t('Allowed Purchase Mode in Checkout', 'نمط الشراء المتاح عند الدفع')}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {[
            {
              id: 'both' as const,
              icon: <Layers size={17} />,
              title: c.t('Both (Packages & Dynamic Slider)', 'كلاهما (الباقات الثابتة والشريط)'),
              desc: c.t('Recommended. Subscribers can purchase fixed packages and top up custom credits via slider.', 'الخيار الموصى به. يتيح للمشتركين شراء باقات الإضافات الثابتة وشحن رصيد مخصص.'),
            },
            {
              id: 'fixed' as const,
              icon: <Package size={17} />,
              title: c.t('Fixed Packages Only', 'باقات جاهزة ثابتة فقط'),
              desc: c.t('Only pre-configured bulk packages listed below can be purchased.', 'إتاحة الباقات الثابتة المعرفة في الجدول أدناه فقط.'),
            },
            {
              id: 'dynamic' as const,
              icon: <Sliders size={17} />,
              title: c.t('Dynamic Slider Only', 'أداة شحن رصيد ديناميكية فقط'),
              desc: c.t('Subscribers use the dynamic unit stepper for custom credit top-ups.', 'يتيح شحن أي كمية رصيد حسب سعر الوحدة المحدد.'),
            },
          ].map(item => (
            <div
              key={item.id}
              onClick={() => handleModeSelect(item.id)}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                cursor: 'pointer',
                border: mode === item.id ? '2px solid var(--bl-accent)' : '1px solid var(--bl-border)',
                background: mode === item.id ? 'rgba(124, 58, 237, 0.06)' : 'var(--bl-surface-2)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13.5, color: mode === item.id ? 'var(--bl-accent)' : 'inherit' }}>
                  {item.icon}
                  {item.title}
                </span>
                {mode === item.id && (
                  <span style={{ width: 18, height: 18, borderRadius: 9, background: 'var(--bl-accent)', color: '#fff', display: 'grid', placeItems: 'center' }}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--bl-muted)', lineHeight: 1.4 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Unit Rate Configuration (Active when mode is dynamic or both) */}
      {mode !== 'fixed' && (
        <div style={{ padding: 18, borderRadius: 14, background: 'var(--bl-surface-2)', border: '1px solid var(--bl-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBlockEnd: 14 }}>
            <Coins size={16} style={{ color: 'var(--bl-accent)' }} />
            <b style={{ fontSize: 13.5 }}>{c.t('Unit-Based Rate & Limits', 'تسعير الوحدة وحدود الشحن')}</b>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBlockEnd: 16 }}>
            <label className="bl-field">
              <span>{c.t('Credits Per Unit', 'الرصيد لكل وحدة')}</span>
              <input
                className="bl-input"
                type="number"
                min={1}
                max={100000}
                value={creditsPerUnit}
                onChange={e => setCreditsPerUnit(Math.max(1, Number(e.target.value) || 1))}
              />
              <small>{c.t('Step size (e.g. 100 credits)', 'حجم الخطوة (مثال: 100 رصيد)')}</small>
            </label>

            <label className="bl-field">
              <span>{c.t('Price Per Unit', 'سعر الوحدة')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  className="bl-input"
                  type="number"
                  step="0.01"
                  min={0}
                  value={pricePerUnit}
                  onChange={e => setPricePerUnit(Math.max(0, Number(e.target.value) || 0))}
                />
                <select
                  className="bl-input"
                  style={{ width: 95 }}
                  value={currency}
                  onChange={e => setCurrency(e.target.value as Currency)}
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>
              <small>{c.t('Cost per 1 unit block', 'التكلفة لكل بلوك وحدة')}</small>
            </label>

            <label className="bl-field">
              <span>{c.t('Min Units Slider', 'الحد الأدنى للوحدات')}</span>
              <input
                className="bl-input"
                type="number"
                min={1}
                max={maxUnits}
                value={minUnits}
                onChange={e => setMinUnits(Math.max(1, Math.min(maxUnits, Number(e.target.value) || 1)))}
              />
              <small>{c.t(`= ${(minUnits * creditsPerUnit).toLocaleString()} min credits`, `= ${c.num(minUnits * creditsPerUnit)} كحد أدنى`)}</small>
            </label>

            <label className="bl-field">
              <span>{c.t('Max Units Slider', 'الحد الأقصى للوحدات')}</span>
              <input
                className="bl-input"
                type="number"
                min={minUnits}
                max={10000}
                value={maxUnits}
                onChange={e => setMaxUnits(Math.max(minUnits, Number(e.target.value) || minUnits))}
              />
              <small>{c.t(`= ${(maxUnits * creditsPerUnit).toLocaleString()} max credits`, `= ${c.num(maxUnits * creditsPerUnit)} كحد أقصى`)}</small>
            </label>
          </div>

          {/* Live Simulator Preview */}
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bl-surface)', border: '1px dashed var(--bl-accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bl-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} />
                {c.t('Subscriber Slider Simulator Preview', 'معاينة تجريبية لشريط التمرير لدى المشترك')}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {previewCredits.toLocaleString()} {c.t('Credits', 'رصيد')} = <span style={{ color: 'var(--bl-accent)', fontSize: 15 }}>{c.money(previewCost, currency)}</span>
              </span>
            </div>

            <input
              type="range"
              min={minUnits}
              max={maxUnits}
              value={previewUnits}
              onChange={e => setPreviewUnits(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--bl-accent)', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--bl-muted)', marginTop: 4 }}>
              <span>{(minUnits * creditsPerUnit).toLocaleString()} {c.t('credits', 'رصيد')}</span>
              <span>{c.t(`Selected: ${previewUnits} units (${previewCredits.toLocaleString()} credits) at ${c.money(pricePerUnit, currency)} / unit`, `المحدد: ${previewUnits} وحدة (${c.num(previewCredits)} رصيد) بسعر ${c.money(pricePerUnit, currency)} للوحدة`)}</span>
              <span>{(maxUnits * creditsPerUnit).toLocaleString()} {c.t('credits', 'رصيد')}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
