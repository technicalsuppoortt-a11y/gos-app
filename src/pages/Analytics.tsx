import { useState } from 'react';
import { ChartColumnBig, ChartNoAxesColumnIncreasing, MessageSquareText, Package, ShoppingBag, Target, UserRoundPlus, UsersRound } from 'lucide-react';
import { dateKey, shiftDate, type AnalyticsTab, type DateRange } from '../backend/analytics';
import { useCurrency } from '../context/CurrencyContext';
import { useUILanguage } from '../i18n/display';
import { AnalyticsContent } from './analytics/LiveAnalytics';
import { t } from './analytics/labels';
import './analytics.css';
import './analytics/dashboard.css';

const tabs = {
  Overview: UsersRound, Sales: ShoppingBag, Leads: UserRoundPlus, Traffic: ChartNoAxesColumnIncreasing,
  Conversions: Target, Conversations: MessageSquareText, Products: Package, Reports: ChartColumnBig,
};
const names = Object.keys(tabs) as AnalyticsTab[];

function preset(days: number): DateRange {
  const end = dateKey(new Date());
  return { start: shiftDate(end, 1 - days), end };
}

export const Analytics = (_props: { notify: (message: string) => void }) => {
  const ar = useUILanguage().startsWith('ar');
  const { currency: preferredCurrency } = useCurrency();
  const [tab, setTab] = useState<AnalyticsTab>('Overview');
  const [range, setRange] = useState(() => preset(30));
  const [selection, setSelection] = useState(30);
  const [draft, setDraft] = useState(range);
  const [currency, setCurrency] = useState<string>();
  const activeCurrency = currency ?? preferredCurrency;
  const currencies = [...new Set([preferredCurrency, 'EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'QAR', 'CAD', 'AUD', 'JOD', 'BHD', 'OMR'])];
  return <main className="an-page" dir={ar ? 'rtl' : 'ltr'}>
    <nav className="an-tabs" role="tablist" aria-label={t('Analytics sections')}>
      {names.map(name => {
        const Icon = tabs[name];
        return <button key={name} type="button" id={`analytics-tab-${name}`} role="tab" aria-controls="analytics-panel"
          aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}
          onKeyDown={event => {
            const offset = event.key === 'ArrowRight' ? (ar ? -1 : 1) : event.key === 'ArrowLeft' ? (ar ? 1 : -1) : 0;
            if (!offset && event.key !== 'Home' && event.key !== 'End') return;
            event.preventDefault();
            const index = event.key === 'Home' ? 0 : event.key === 'End' ? names.length - 1 : (names.indexOf(name) + offset + names.length) % names.length;
            setTab(names[index]);
            document.getElementById(`analytics-tab-${names[index]}`)?.focus();
          }}><Icon size={15} />{t(name)}</button>;
      })}
    </nav>
    <div className="an-dashboard-scroll">
      <form className="an-filters" onSubmit={event => {
        event.preventDefault();
        setRange(draft);
        setSelection(0);
      }}>
        <div className="an-presets" aria-label={t('Date range')}>
          {[7, 30, 90].map(days => <button type="button" key={days} aria-pressed={selection === days} onClick={() => {
            const next = preset(days);
            setRange(next);
            setDraft(next);
            setSelection(days);
          }}>{days} {t('Days')}</button>)}
        </div>
        <label>{t('Start date')}<input type="date" required max={draft.end} min={draft.end ? shiftDate(draft.end, -365) : undefined} value={draft.start} onChange={event => setDraft({ ...draft, start: event.target.value })} /></label>
        <label>{t('End date')}<input type="date" required min={draft.start} max={draft.start ? shiftDate(draft.start, 365) : undefined} value={draft.end} onChange={event => setDraft({ ...draft, end: event.target.value })} /></label>
        <button type="submit">{t('Apply range')}</button>
        {['Overview', 'Sales', 'Products', 'Reports'].includes(tab) && <label>{t('Currency')}
          <select value={activeCurrency} onChange={event => setCurrency(event.target.value)}>{currencies.map(code => <option key={code}>{code}</option>)}</select>
        </label>}
      </form>
      <section id="analytics-panel" role="tabpanel" aria-labelledby={`analytics-tab-${tab}`} tabIndex={0}>
        <AnalyticsContent key={tab} tab={tab} range={range} currency={activeCurrency} locale={ar ? 'ar-EG-u-nu-latn' : 'en-US'} />
      </section>
    </div>
  </main>;
};
