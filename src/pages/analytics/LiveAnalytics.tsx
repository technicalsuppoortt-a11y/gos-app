import { translateText } from '../../i18n/display';
import { useState } from 'react';
import {
  Banknote,
  Bot,
  CalendarCheck2,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Filter,
  Globe,
  MessageSquareText,
  Percent,
  ReceiptText,
  ShoppingBag,
  UserPlus,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  datesIn,
  previousRangeOf,
  type AnalyticsRow,
  type AnalyticsTabId,
  type DateRange,
  type WorkspaceAnalyticsData,
} from '../../backend/analytics';
import { ChannelIcon } from '../inbox/ChannelIcons';
import {
  AnalyticsKpiGrid,
  BarAndLineSalesChart,
  ConversionFunnelCard,
  DualAreaGrowthChart,
  GroupedBarAIChart,
  ModernDonutCard,
  type FunnelSummaryStage,
  type KpiCardItem,
} from './charts';
import {
  allActiveBookingsInRange,
  computeConversationsAndAI,
  computeFunnelSteps,
  computeProductPerformance,
  confirmedBookingsInRange,
  daily,
  extractFunnels,
  group,
  leadSource,
  leadStage,
  leadTime,
  leadsInRange,
  orderAmountInCurrency,
  paidOrdersInRange,
  paymentMethod,
  paymentTime,
  uniqueVisitorsInRange,
  type CurrencyConverter,
} from './model';
import { t } from './labels';

export type Format = {
  locale: string;
  ar: boolean;
  count: (n: number) => string;
  money: (n: number) => string;
  percent: (n: number | null) => string;
};

export function createAnalyticsFormatter(locale: string, currency: string): Format {
  const ar = locale.startsWith('ar');
  const countFmt = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  });
  let moneyFmt: Intl.NumberFormat;
  try {
    moneyFmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
      numberingSystem: 'latn',
    });
  } catch {
    moneyFmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    });
  }
  const pctFmt = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    numberingSystem: 'latn',
  });

  return {
    locale,
    ar,
    count: n => countFmt.format(Math.round(n)),
    money: n => moneyFmt.format(n).replace(/\u00A0/g, ' '),
    percent: n => (n === null || !Number.isFinite(n) ? '0%' : pctFmt.format(n)),
  };
}

function formatPctDelta(
  current: number,
  previous: number,
  ar: boolean,
  suffixType: 'period' | 'month' | 'improvement' = 'period'
): { text: string; tone: 'positive' | 'negative' | 'neutral' } {
  const suffix =
    suffixType === 'month'
      ? ar
        ? 'مقارنة بالشهر السابق'
        : translateText('vs previous month')
      : suffixType === 'improvement'
        ? ar
          ? 'تحسن'
          : translateText('improvement')
        : ar
          ? 'عن الفترة السابقة'
          : translateText('vs previous period');

  if (previous <= 0 && current <= 0) {
    return {
      text: ar ? 'مستقر عن الفترة السابقة' : '0% vs previous period',
      tone: 'neutral',
    };
  }
  if (previous <= 0 && current > 0) {
    return {
      text: `+100% ${suffix}`,
      tone: 'positive',
    };
  }
  const diffPct = ((current - previous) / previous) * 100;
  const rounded = Math.abs(diffPct) >= 10 ? Math.round(diffPct * 10) / 10 : Math.round(diffPct * 10) / 10;
  if (Math.abs(rounded) < 0.1) {
    return {
      text: ar ? 'مستقر عن الفترة السابقة' : '0% vs previous period',
      tone: 'neutral',
    };
  }
  const sign = rounded > 0 ? '+' : '';
  const effectiveSuffix =
    suffixType === 'improvement' && rounded < 0
      ? ar
        ? 'عن الفترة السابقة'
        : translateText('vs previous period')
      : suffix;
  return {
    text: `${sign}${rounded}% ${effectiveSuffix}`,
    tone: rounded >= 0 ? 'positive' : 'negative',
  };
}

function formatCountDelta(
  current: number,
  previous: number,
  ar: boolean,
  unitAr: string,
  unitEn: string
): { text: string; tone: 'positive' | 'negative' | 'neutral' } {
  const diff = current - previous;
  if (diff === 0) {
    return {
      text: ar ? 'مستقر عن الفترة السابقة' : translateText('Unchanged vs previous period'),
      tone: 'neutral',
    };
  }
  if (diff > 0) {
    return {
      text: ar ? `+${diff} ${unitAr}` : `+${diff} new ${unitEn}`,
      tone: 'positive',
    };
  }
  return {
    text: ar ? `${diff} عن الفترة السابقة` : `${diff} vs previous period`,
    tone: 'negative',
  };
}

export function formatResponseDuration(seconds: number | null, ar: boolean): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
    return ar ? '0 ثانية' : '0s';
  }
  if (seconds < 60) {
    const s = Math.max(1, Math.round(seconds));
    if (ar) {
      return s === 1 ? 'ثانية واحدة' : s === 2 ? 'ثانيتان' : s <= 10 ? `${s} ثواني` : `${s} ثانية`;
    }
    return `${s}s`;
  }
  const mins = Math.round((seconds / 60) * 10) / 10;
  return ar ? `${mins} دقيقة` : `${mins}m`;
}

function computeOverviewConversionRate(
  visitors: number,
  leadsCount: number,
  wonCount: number,
  paidCount: number
): number {
  const conversions = Math.max(wonCount, paidCount);
  if (leadsCount > 0 && conversions <= leadsCount) {
    return conversions / leadsCount;
  }
  if (visitors > 0) {
    return Math.min(1, conversions / visitors);
  }
  return 0;
}

/* -------------------------------------------------------------------------- */
/* Tab 1: Overview (`نظرة عامة`)                                               */
/* -------------------------------------------------------------------------- */
function OverviewTab({
  rows,
  range,
  previousRange,
  compareEnabled,
  currency,
  convertAmount,
  format,
}: {
  rows: WorkspaceAnalyticsData;
  range: DateRange;
  previousRange: DateRange;
  compareEnabled: boolean;
  currency: string;
  convertAmount: CurrencyConverter;
  format: Format;
}) {
  const paidCurr = paidOrdersInRange(rows, range);
  const paidPrev = paidOrdersInRange(rows, previousRange);
  const revCurr = paidCurr.reduce(
    (acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount),
    0
  );
  const revPrev = paidPrev.reduce(
    (acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount),
    0
  );

  const leadsCurr = leadsInRange(rows, range);
  const leadsPrev = leadsInRange(rows, previousRange);

  const bookingsCurr = confirmedBookingsInRange(rows, range);
  const bookingsPrev = confirmedBookingsInRange(rows, previousRange);

  const visitorsCurr = uniqueVisitorsInRange(rows, range);
  const visitorsPrev = uniqueVisitorsInRange(rows, previousRange);

  const wonCurr = leadsCurr.filter(l => leadStage(l) === 'Won').length;
  const wonPrev = leadsPrev.filter(l => leadStage(l) === 'Won').length;

  const convCurr = computeOverviewConversionRate(
    visitorsCurr,
    leadsCurr.length,
    wonCurr,
    paidCurr.length
  );
  const convPrev = computeOverviewConversionRate(
    visitorsPrev,
    leadsPrev.length,
    wonPrev,
    paidPrev.length
  );

  const isMonthlyPreset = Math.abs(datesIn(range).length - 30) <= 2;
  const revDelta = formatPctDelta(revCurr, revPrev, format.ar, isMonthlyPreset ? 'month' : 'period');
  const leadsDelta = formatPctDelta(leadsCurr.length, leadsPrev.length, format.ar, 'period');
  const bookingsDelta = formatCountDelta(
    bookingsCurr.length,
    bookingsPrev.length,
    format.ar,
    'حجز جديد',
    'bookings'
  );
  const convDiffPts = Math.round((convCurr - convPrev) * 1000) / 10;
  const convDeltaText =
    Math.abs(convDiffPts) < 0.1
      ? format.ar
        ? 'مستقر عن الفترة السابقة'
        : '0% vs previous period'
      : `${convDiffPts > 0 ? '+' : ''}${convDiffPts}% ${format.ar ? 'تحسن' : translateText('improvement')}`;

  const kpis: KpiCardItem[] = [
    {
      id: 'confirmed-revenue',
      label: 'Confirmed Revenue',
      value: format.money(revCurr),
      deltaText: revDelta.text,
      deltaTone: revDelta.tone,
      compareHint: compareEnabled ? `${t('Previous period')}: ${format.money(revPrev)}` : undefined,
      icon: Banknote,
      tone: 'purple',
    },
    {
      id: 'new-leads',
      label: 'New Leads',
      value: format.count(leadsCurr.length),
      deltaText: leadsDelta.text,
      deltaTone: leadsDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.count(leadsPrev.length)}`
        : undefined,
      icon: Users,
      tone: 'emerald',
    },
    {
      id: 'confirmed-bookings',
      label: 'Confirmed Bookings',
      value: format.count(bookingsCurr.length),
      deltaText: bookingsDelta.text,
      deltaTone: bookingsDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.count(bookingsPrev.length)}`
        : undefined,
      icon: CalendarCheck2,
      tone: 'purple',
    },
    {
      id: 'conversion-rate',
      label: 'Conversion Rate',
      value: format.percent(convCurr),
      deltaText: convDeltaText,
      deltaTone: convDiffPts > 0 ? 'positive' : convDiffPts < 0 ? 'negative' : 'neutral',
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.percent(convPrev)}`
        : undefined,
      icon: Percent,
      tone: 'purple',
    },
  ];

  const dailyRev = daily(
    range,
    paidCurr,
    bucket => bucket.reduce((acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount), 0),
    paymentTime
  );
  const dailyPrevRev = daily(
    previousRange,
    paidPrev,
    bucket => bucket.reduce((acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount), 0),
    paymentTime
  );
  const dailyLeads = daily(range, leadsCurr, bucket => bucket.length, leadTime);

  const allBookings = allActiveBookingsInRange(rows, range);
  const salesCount = Math.max(paidCurr.length, wonCurr);
  const funnelTop = Math.max(visitorsCurr, leadsCurr.length, allBookings.length, salesCount);
  const effectiveVisitors = visitorsCurr > 0 ? visitorsCurr : funnelTop;
  const pctFmt = (part: number) =>
    funnelTop > 0 ? `${Math.round((part / funnelTop) * 1000) / 10}%` : '0%';

  const funnelStages: FunnelSummaryStage[] = [
    {
      id: 'visitors',
      label: 'Visitors',
      count: effectiveVisitors,
      pctText: funnelTop > 0 ? '100%' : '0%',
      barWidthPct: funnelTop > 0 ? 100 : 0,
      color: '#7C3AED',
    },
    {
      id: 'leads',
      label: 'Leads',
      count: leadsCurr.length,
      pctText: pctFmt(leadsCurr.length),
      barWidthPct: funnelTop > 0 ? Math.max(18, (leadsCurr.length / funnelTop) * 100) : 0,
      color: '#6D28D9',
    },
    {
      id: 'bookings',
      label: 'Bookings',
      count: allBookings.length,
      pctText: pctFmt(allBookings.length),
      barWidthPct: funnelTop > 0 ? Math.max(14, (allBookings.length / funnelTop) * 100) : 0,
      color: '#8B5CF6',
    },
    {
      id: 'sales',
      label: 'Sales',
      count: salesCount,
      pctText: pctFmt(salesCount),
      barWidthPct: funnelTop > 0 ? Math.max(11, (salesCount / funnelTop) * 100) : 0,
      color: '#10B981',
    },
  ];

  return (
    <div className="an2-tab-stack">
      <AnalyticsKpiGrid items={kpis} columns={4} />
      <div className="an2-split-grid">
        <DualAreaGrowthChart
          title="Revenue & Leads Growth"
          range={range}
          locale={format.locale}
          revenueLabel={`${t('Revenue')} (${currency})`}
          leadsLabel={t('Leads')}
          revenueValues={dailyRev}
          leadsValues={dailyLeads}
          previousRevenueValues={dailyPrevRev}
          compareEnabled={compareEnabled}
          formatMoney={format.money}
          formatNumber={format.count}
        />
        <ConversionFunnelCard
          title="Conversion Funnel Summary"
          stages={funnelStages}
          formatCount={format.count}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 2: Sales & Products (`المبيعات والمنتجات`)                              */
/* -------------------------------------------------------------------------- */
function SalesProductsTab({
  rows,
  range,
  previousRange,
  compareEnabled,
  currency,
  convertAmount,
  format,
}: {
  rows: WorkspaceAnalyticsData;
  range: DateRange;
  previousRange: DateRange;
  compareEnabled: boolean;
  currency: string;
  convertAmount: CurrencyConverter;
  format: Format;
}) {
  const paidCurr = paidOrdersInRange(rows, range);
  const paidPrev = paidOrdersInRange(rows, previousRange);

  const revCurr = paidCurr.reduce(
    (acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount),
    0
  );
  const revPrev = paidPrev.reduce(
    (acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount),
    0
  );

  const aovCurr = paidCurr.length > 0 ? revCurr / paidCurr.length : 0;
  const aovPrev = paidPrev.length > 0 ? revPrev / paidPrev.length : 0;

  const isMonthlyPreset = Math.abs(datesIn(range).length - 30) <= 2;
  const revDelta = formatPctDelta(revCurr, revPrev, format.ar, isMonthlyPreset ? 'month' : 'period');
  const txnDelta = formatPctDelta(paidCurr.length, paidPrev.length, format.ar, 'period');
  const aovDelta = formatPctDelta(aovCurr, aovPrev, format.ar, 'improvement');

  const kpis: KpiCardItem[] = [
    {
      id: 'sales-revenue',
      label: 'Confirmed Revenue',
      value: format.money(revCurr),
      deltaText: revDelta.text,
      deltaTone: revDelta.tone,
      compareHint: compareEnabled ? `${t('Previous period')}: ${format.money(revPrev)}` : undefined,
      icon: Banknote,
      tone: 'purple',
    },
    {
      id: 'successful-txns',
      label: 'Successful Transactions',
      value: format.count(paidCurr.length),
      deltaText: txnDelta.text,
      deltaTone: txnDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.count(paidPrev.length)}`
        : undefined,
      icon: ReceiptText,
      tone: 'emerald',
    },
    {
      id: 'aov',
      label: 'Average Order Value',
      value: format.money(aovCurr),
      deltaText: aovDelta.text,
      deltaTone: aovDelta.tone,
      compareHint: compareEnabled ? `${t('Previous period')}: ${format.money(aovPrev)}` : undefined,
      icon: ShoppingBag,
      tone: 'purple',
    },
  ];

  const dailyRev = daily(
    range,
    paidCurr,
    bucket => bucket.reduce((acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount), 0),
    paymentTime
  );
  const dailyTxns = daily(range, paidCurr, bucket => bucket.length, paymentTime);

  const methodBuckets = [...group(paidCurr, paymentMethod)]
    .map(([label, items]) => ({
      label,
      value: items.reduce((acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount), 0) || items.length,
    }))
    .sort((a, b) => b.value - a.value);

  const productsPerf = computeProductPerformance(rows, range, currency, convertAmount);

  return (
    <div className="an2-tab-stack">
      <AnalyticsKpiGrid items={kpis} columns={3} />

      <div className="an2-split-grid">
        <BarAndLineSalesChart
          title="Revenue & Transactions Curve"
          range={range}
          locale={format.locale}
          revenueLabel={`${t('Revenue')} (${currency})`}
          txnsLabel={t('Transactions')}
          revenueValues={dailyRev}
          txnValues={dailyTxns}
          formatMoney={format.money}
          formatNumber={format.count}
        />
        <ModernDonutCard
          title="Payment Methods Distribution"
          items={methodBuckets}
          emptyLabel="No payment transactions yet"
        />
      </div>

      <section className="an2-card an2-table-card">
        <div className="an2-card-head">
          <h2 className="an2-card-title">{t('Products & Courses Performance')}</h2>
        </div>
        {productsPerf.length > 0 ? (
          <div className="an2-table-scroll">
            <table className="an2-table">
              <thead>
                <tr>
                  <th scope="col" className="is-start">
                    {t('Product')}
                  </th>
                  <th scope="col" className="is-center">
                    {t('Units Sold')}
                  </th>
                  <th scope="col" className="is-center">
                    {t('Revenue')}
                  </th>
                  <th scope="col" className="is-end">
                    {t('Conversion Rate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {productsPerf.map(prod => (
                  <tr key={prod.id}>
                    <td className="is-start an2-product-title">
                      <bdi>{prod.name}</bdi>
                    </td>
                    <td className="is-center tabular-nums">{format.count(prod.units)}</td>
                    <td className="is-center tabular-nums an2-strong-cell">
                      <bdi>{format.money(prod.revenue)}</bdi>
                    </td>
                    <td className="is-end tabular-nums">
                      <bdi>{format.percent(prod.conversionRate)}</bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="an2-empty-state">{t('No products or sales recorded in this period')}</p>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 3: Funnels & Leads (`الفانلز والعملاء`)                                 */
/* -------------------------------------------------------------------------- */
function FunnelsLeadsTab({
  rows,
  range,
  previousRange,
  compareEnabled,
  format,
}: {
  rows: WorkspaceAnalyticsData;
  range: DateRange;
  previousRange: DateRange;
  compareEnabled: boolean;
  format: Format;
}) {
  const funnels = extractFunnels(rows);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(() => funnels[0]?.id ?? 'all');

  const activeFunnelId =
    selectedFunnelId !== 'all' && funnels.some(f => f.id === selectedFunnelId)
      ? selectedFunnelId
      : funnels.length === 1
        ? funnels[0].id
        : selectedFunnelId === 'all'
          ? 'all'
          : (funnels[0]?.id ?? 'all');

  const visitorsCurr = uniqueVisitorsInRange(rows, range);
  const visitorsPrev = uniqueVisitorsInRange(rows, previousRange);

  const leadsCurr = leadsInRange(rows, range);
  const leadsPrev = leadsInRange(rows, previousRange);

  const funnelData = computeFunnelSteps(rows, range, activeFunnelId);
  const funnelPrev = computeFunnelSteps(rows, previousRange, activeFunnelId);

  const stagesMap = group(leadsCurr, leadStage);
  const prevStagesMap = group(leadsPrev, leadStage);
  const wonCurr = Math.max(
    stagesMap.get('Won')?.length ?? 0,
    paidOrdersInRange(rows, range).length > 0 && (stagesMap.get('Won')?.length ?? 0) === 0
      ? new Set(paidOrdersInRange(rows, range).map(o => String(o.customerEmail || o.id))).size
      : 0
  );
  const wonPrev = prevStagesMap.get('Won')?.length ?? 0;

  const visDelta = formatPctDelta(visitorsCurr, visitorsPrev, format.ar, 'period');
  const leadDelta = formatPctDelta(leadsCurr.length, leadsPrev.length, format.ar, 'period');
  const compDelta = formatPctDelta(
    funnelData.completionRate,
    funnelPrev.completionRate,
    format.ar,
    'improvement'
  );
  const wonDelta = formatCountDelta(wonCurr, wonPrev, format.ar, 'عميل جديد', 'customers');

  const kpis: KpiCardItem[] = [
    {
      id: 'unique-visitors',
      label: 'Unique Visitors',
      value: format.count(visitorsCurr),
      deltaText: visDelta.text,
      deltaTone: visDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.count(visitorsPrev)}`
        : undefined,
      icon: Globe,
      tone: 'purple',
    },
    {
      id: 'funnel-new-leads',
      label: 'New Leads',
      value: format.count(leadsCurr.length),
      deltaText: leadDelta.text,
      deltaTone: leadDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.count(leadsPrev.length)}`
        : undefined,
      icon: UserPlus,
      tone: 'purple',
    },
    {
      id: 'funnel-completion',
      label: 'Funnel Completion Rate',
      value: format.percent(funnelData.completionRate),
      deltaText: compDelta.text,
      deltaTone: compDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.percent(funnelPrev.completionRate)}`
        : undefined,
      icon: Filter,
      tone: 'purple',
    },
    {
      id: 'won-customers',
      label: 'Won Customers',
      value: format.count(wonCurr),
      deltaText: wonDelta.text,
      deltaTone: wonDelta.tone,
      compareHint: compareEnabled ? `${t('Previous period')}: ${format.count(wonPrev)}` : undefined,
      icon: CheckCircle2,
      tone: 'emerald',
    },
  ];

  const pipelineStages: { key: 'New' | 'Contacted' | 'Qualified' | 'Won'; count: number }[] = [
    { key: 'New', count: stagesMap.get('New')?.length ?? 0 },
    { key: 'Contacted', count: stagesMap.get('Contacted')?.length ?? 0 },
    { key: 'Qualified', count: stagesMap.get('Qualified')?.length ?? 0 },
    { key: 'Won', count: wonCurr },
  ];
  const maxStageCount = Math.max(1, ...pipelineStages.map(s => s.count));

  const sourceBuckets = [...group(leadsCurr, leadSource)]
    .map(([label, items]) => ({ label, value: items.length }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="an2-tab-stack">
      <AnalyticsKpiGrid items={kpis} columns={4} />

      <div className="an2-tri-grid">
        {/* Card 1: Funnel Steps Performance */}
        <section className="an2-card">
          <div className="an2-card-head">
            <h2 className="an2-card-title">{t('Funnel Steps Performance')}</h2>
            <select
              aria-label={t('Funnel')}
              className="an2-pill-select"
              value={activeFunnelId}
              onChange={e => setSelectedFunnelId(e.target.value)}
            >
              {funnels.length !== 1 && <option value="all">{t('All Funnels')}</option>}
              {funnels.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <ul className="an2-progress-list">
            {funnelData.steps.map(step => (
              <li key={step.id} className="an2-progress-item">
                <div className="an2-progress-meta">
                  <span className="an2-progress-label">{t(step.label)}</span>
                  <strong className="an2-progress-val tabular-nums">{step.pct}%</strong>
                </div>
                <div className="an2-progress-track">
                  <div
                    className="an2-progress-fill"
                    style={{
                      width: `${step.pct > 0 ? Math.max(8, Math.min(100, step.pct)) : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Card 2: Sales Pipeline Stages */}
        <section className="an2-card">
          <div className="an2-card-head">
            <h2 className="an2-card-title">{t('Sales Stages')}</h2>
          </div>
          <ul className="an2-progress-list">
            {pipelineStages.map(stage => {
              const widthPct =
                stage.count > 0 ? Math.max(10, Math.round((stage.count / maxStageCount) * 100)) : 0;
              return (
                <li key={stage.key} className="an2-progress-item">
                  <div className="an2-progress-meta">
                    <span className="an2-progress-label">{t(stage.key)}</span>
                    <strong className="an2-progress-val tabular-nums">
                      {format.count(stage.count)}
                    </strong>
                  </div>
                  <div className="an2-progress-track">
                    <div className="an2-progress-fill" style={{ width: `${widthPct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Card 3: Lead Sources Donut */}
        <ModernDonutCard
          title="Lead Sources"
          items={sourceBuckets}
          emptyLabel="No lead sources recorded yet"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 4: Conversations & AI (`المحادثات والـ AI`)                             */
/* -------------------------------------------------------------------------- */
function ConversationsAITab({
  rows,
  range,
  previousRange,
  compareEnabled,
  channelFilter,
  format,
}: {
  rows: WorkspaceAnalyticsData;
  range: DateRange;
  previousRange: DateRange;
  compareEnabled: boolean;
  channelFilter: string;
  format: Format;
}) {
  const curr = computeConversationsAndAI(rows, range, channelFilter);
  const prev = computeConversationsAndAI(rows, previousRange, channelFilter);

  const totalDelta = formatPctDelta(
    curr.totalConversations,
    prev.totalConversations,
    format.ar,
    'period'
  );
  const resDelta = formatPctDelta(
    curr.aiResolutionRate,
    prev.aiResolutionRate,
    format.ar,
    'improvement'
  );

  const speedDelta = (() => {
    if (curr.avgFirstResponseSeconds === null || prev.avgFirstResponseSeconds === null) {
      return {
        text: format.ar ? 'مستقر عن الفترة السابقة' : translateText('Stable vs previous period'),
        tone: 'neutral' as const,
      };
    }
    const diff = prev.avgFirstResponseSeconds - curr.avgFirstResponseSeconds;
    if (Math.abs(diff) < 1) {
      return {
        text: format.ar ? 'مستقر عن الفترة السابقة' : translateText('Stable vs previous period'),
        tone: 'neutral' as const,
      };
    }
    if (diff > 0) {
      const dur = formatResponseDuration(diff, format.ar);
      return {
        text: format.ar ? `أسرع بـ ${dur}` : `${dur} faster`,
        tone: 'positive' as const,
      };
    }
    const dur = formatResponseDuration(Math.abs(diff), format.ar);
    return {
      text: format.ar ? `أبطأ بـ ${dur}` : `${dur} slower`,
      tone: 'negative' as const,
    };
  })();

  const aiConvDelta = formatCountDelta(
    curr.aiLeadsAndBookings,
    prev.aiLeadsAndBookings,
    format.ar,
    'حجز جديد',
    'bookings & leads'
  );

  const kpis: KpiCardItem[] = [
    {
      id: 'total-conversations',
      label: 'Total Conversations',
      value: format.count(curr.totalConversations),
      deltaText: totalDelta.text,
      deltaTone: totalDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.count(prev.totalConversations)}`
        : undefined,
      icon: MessageSquareText,
      tone: 'purple',
    },
    {
      id: 'ai-resolution-rate',
      label: 'AI Resolution Rate',
      value: format.percent(curr.aiResolutionRate),
      deltaText: resDelta.text,
      deltaTone: resDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.percent(prev.aiResolutionRate)}`
        : undefined,
      icon: Bot,
      tone: 'purple',
    },
    {
      id: 'avg-first-response',
      label: 'Avg. First Response Time',
      value: formatResponseDuration(curr.avgFirstResponseSeconds, format.ar),
      deltaText: speedDelta.text,
      deltaTone: speedDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${formatResponseDuration(prev.avgFirstResponseSeconds, format.ar)}`
        : undefined,
      icon: Clock,
      tone: 'purple',
    },
    {
      id: 'ai-bookings-leads',
      label: 'AI Bookings & Leads',
      value: format.count(curr.aiLeadsAndBookings),
      deltaText: aiConvDelta.text,
      deltaTone: aiConvDelta.tone,
      compareHint: compareEnabled
        ? `${t('Previous period')}: ${format.count(prev.aiLeadsAndBookings)}`
        : undefined,
      icon: CalendarPlus,
      tone: 'purple',
    },
  ];

  return (
    <div className="an2-tab-stack">
      <AnalyticsKpiGrid items={kpis} columns={4} />

      <div className="an2-split-grid">
        <GroupedBarAIChart
          title="Conversation Handling: AI vs Human Team"
          range={range}
          locale={format.locale}
          aiValues={curr.dailyAi}
          humanValues={curr.dailyHuman}
          formatNumber={format.count}
        />

        <section className="an2-card">
          <div className="an2-card-head">
            <h2 className="an2-card-title">{t('Channel Response Speed & Performance')}</h2>
          </div>
          <ul className="an2-channel-list">
            {curr.perChannel.map(ch => (
              <li key={ch.channel} className="an2-channel-item">
                <div className="an2-channel-head">
                  <span className="an2-channel-identity">
                    <ChannelIcon channel={ch.channel} size={18} />
                    <span>{t(ch.label)}</span>
                  </span>
                  <span className="an2-channel-stats tabular-nums">
                    <bdi>{formatResponseDuration(ch.avgSeconds, format.ar)}</bdi>
                    <i aria-hidden="true">•</i>
                    <strong>{ch.resolutionPct}%</strong>
                  </span>
                </div>
                <div className="an2-progress-track">
                  <div
                    className="an2-progress-fill"
                    style={{
                      width: `${ch.resolutionPct > 0 ? Math.max(8, ch.resolutionPct) : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Export Payload Builder (CSV & PDF)                                         */
/* -------------------------------------------------------------------------- */
export function buildAnalyticsExportPayload({
  tab,
  rows,
  range,
  currency,
  convertAmount,
  locale,
  channelFilter,
}: {
  tab: AnalyticsTabId;
  rows: WorkspaceAnalyticsData;
  range: DateRange;
  currency: string;
  convertAmount: CurrencyConverter;
  locale: string;
  channelFilter: string;
}): { title: string; filenameBase: string; headings: string[]; tableRows: (string | number)[][] } {
  const format = createAnalyticsFormatter(locale, currency);
  const prevRange = previousRangeOf(range);

  if (tab === 'SalesProducts') {
    const prods = computeProductPerformance(rows, range, currency, convertAmount);
    const paid = paidOrdersInRange(rows, range);
    const rev = paid.reduce((acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount), 0);
    const aov = paid.length > 0 ? rev / paid.length : 0;
    const headings = [t('Product'), t('Units Sold'), t('Revenue'), t('Conversion Rate')];
    const summaryRows: (string | number)[][] = [
      [t('Confirmed Revenue'), format.count(paid.length), format.money(rev), '—'],
      [t('Average Order Value'), '—', format.money(aov), '—'],
      ...prods.map(p => [
        p.name,
        format.count(p.units),
        format.money(p.revenue),
        format.percent(p.conversionRate),
      ]),
    ];
    return {
      title: `${t('Sales & Products')} · ${range.start} – ${range.end} (${currency})`,
      filenameBase: `analytics-sales-products-${range.start}-${range.end}-${currency}`,
      headings,
      tableRows: summaryRows,
    };
  }

  if (tab === 'FunnelsLeads') {
    const vis = uniqueVisitorsInRange(rows, range);
    const visPrev = uniqueVisitorsInRange(rows, prevRange);
    const leads = leadsInRange(rows, range);
    const leadsPrev = leadsInRange(rows, prevRange);
    const funnel = computeFunnelSteps(rows, range, 'all');
    const funnelPrev = computeFunnelSteps(rows, prevRange, 'all');
    const won = leads.filter(l => leadStage(l) === 'Won').length;
    const wonPrev = leadsPrev.filter(l => leadStage(l) === 'Won').length;
    return {
      title: `${t('Funnels & Leads')} · ${range.start} – ${range.end}`,
      filenameBase: `analytics-funnels-leads-${range.start}-${range.end}`,
      headings: [t('Metric'), t('Selected period'), t('Previous period')],
      tableRows: [
        [t('Unique Visitors'), format.count(vis), format.count(visPrev)],
        [t('New Leads'), format.count(leads.length), format.count(leadsPrev.length)],
        [
          t('Funnel Completion Rate'),
          format.percent(funnel.completionRate),
          format.percent(funnelPrev.completionRate),
        ],
        [t('Won Customers'), format.count(won), format.count(wonPrev)],
        ...funnel.steps.map(s => [t(s.label), `${format.count(s.count)} (${s.pct}%)`, '—']),
      ],
    };
  }

  if (tab === 'ConversationsAI') {
    const curr = computeConversationsAndAI(rows, range, channelFilter);
    const prev = computeConversationsAndAI(rows, prevRange, channelFilter);
    return {
      title: `${t('Conversations & AI')} · ${range.start} – ${range.end}`,
      filenameBase: `analytics-conversations-ai-${range.start}-${range.end}`,
      headings: [t('Metric'), t('Selected period'), t('Previous period')],
      tableRows: [
        [
          t('Total Conversations'),
          format.count(curr.totalConversations),
          format.count(prev.totalConversations),
        ],
        [
          t('AI Resolution Rate'),
          format.percent(curr.aiResolutionRate),
          format.percent(prev.aiResolutionRate),
        ],
        [
          t('Avg. First Response Time'),
          formatResponseDuration(curr.avgFirstResponseSeconds, format.ar),
          formatResponseDuration(prev.avgFirstResponseSeconds, format.ar),
        ],
        [
          t('AI Bookings & Leads'),
          format.count(curr.aiLeadsAndBookings),
          format.count(prev.aiLeadsAndBookings),
        ],
        ...curr.perChannel.map(ch => [
          t(ch.label),
          `${formatResponseDuration(ch.avgSeconds, format.ar)} · ${ch.resolutionPct}%`,
          '—',
        ]),
      ],
    };
  }

  // Default: Overview
  const paid = paidOrdersInRange(rows, range);
  const paidPrev = paidOrdersInRange(rows, prevRange);
  const rev = paid.reduce((acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount), 0);
  const revPrev = paidPrev.reduce(
    (acc, r) => acc + orderAmountInCurrency(r, currency, convertAmount),
    0
  );
  const leads = leadsInRange(rows, range);
  const leadsPrev = leadsInRange(rows, prevRange);
  const bookings = confirmedBookingsInRange(rows, range);
  const bookingsPrev = confirmedBookingsInRange(rows, prevRange);
  const conv = computeOverviewConversionRate(
    uniqueVisitorsInRange(rows, range),
    leads.length,
    leads.filter(l => leadStage(l) === 'Won').length,
    paid.length
  );
  const convPrev = computeOverviewConversionRate(
    uniqueVisitorsInRange(rows, prevRange),
    leadsPrev.length,
    leadsPrev.filter(l => leadStage(l) === 'Won').length,
    paidPrev.length
  );

  return {
    title: `${t('Overview')} · ${range.start} – ${range.end} (${currency})`,
    filenameBase: `analytics-overview-${range.start}-${range.end}-${currency}`,
    headings: [t('Metric'), t('Selected period'), t('Previous period')],
    tableRows: [
      [t('Confirmed Revenue'), format.money(rev), format.money(revPrev)],
      [t('New Leads'), format.count(leads.length), format.count(leadsPrev.length)],
      [t('Confirmed Bookings'), format.count(bookings.length), format.count(bookingsPrev.length)],
      [t('Conversion Rate'), format.percent(conv), format.percent(convPrev)],
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Loading Skeleton (Graceful non-disruptive shimmer while initial sync runs) */
/* -------------------------------------------------------------------------- */
function AnalyticsSkeleton({ columns = 4 }: { columns?: 3 | 4 }) {
  return (
    <div className="an2-tab-stack" role="status" aria-label={t('Loading analytics…')}>
      <div className={`an2-kpi-grid ${columns === 3 ? 'an2-kpi-grid--3' : 'an2-kpi-grid--4'}`}>
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className="an2-card an2-kpi-card an2-skeleton-card">
            <div className="an2-skel-line an2-skel-line--sm" />
            <div className="an2-skel-line an2-skel-line--lg" />
            <div className="an2-skel-line an2-skel-line--xs" />
          </div>
        ))}
      </div>
      <div className="an2-split-grid">
        <div className="an2-card an2-skeleton-chart" />
        <div className="an2-card an2-skeleton-chart" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Analytics Content Dispatcher                                          */
/* -------------------------------------------------------------------------- */
export function AnalyticsContent({
  tab,
  data,
  loading,
  error,
  onRetry,
  range,
  compareEnabled,
  currency,
  convertAmount,
  locale,
  channelFilter,
}: {
  tab: AnalyticsTabId;
  data: Record<string, AnalyticsRow[]>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  range: DateRange;
  compareEnabled: boolean;
  currency: string;
  convertAmount: CurrencyConverter;
  locale: string;
  channelFilter: string;
}) {
  const format = createAnalyticsFormatter(locale, currency);
  const previousRange = previousRangeOf(range);

  if (error) {
    return (
      <div className="an2-card an2-error-card" role="alert">
        <p>{t('Could not load workspace analytics.')}</p>
        <button type="button" className="an2-btn" onClick={onRetry}>
          {t('Retry')}
        </button>
      </div>
    );
  }

  if (loading) {
    return <AnalyticsSkeleton columns={tab === 'SalesProducts' ? 3 : 4} />;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        {tab === 'Overview' && (
          <OverviewTab
            rows={data}
            range={range}
            previousRange={previousRange}
            compareEnabled={compareEnabled}
            currency={currency}
            convertAmount={convertAmount}
            format={format}
          />
        )}
        {tab === 'SalesProducts' && (
          <SalesProductsTab
            rows={data}
            range={range}
            previousRange={previousRange}
            compareEnabled={compareEnabled}
            currency={currency}
            convertAmount={convertAmount}
            format={format}
          />
        )}
        {tab === 'FunnelsLeads' && (
          <FunnelsLeadsTab
            rows={data}
            range={range}
            previousRange={previousRange}
            compareEnabled={compareEnabled}
            format={format}
          />
        )}
        {tab === 'ConversationsAI' && (
          <ConversationsAITab
            rows={data}
            range={range}
            previousRange={previousRange}
            compareEnabled={compareEnabled}
            channelFilter={channelFilter}
            format={format}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
