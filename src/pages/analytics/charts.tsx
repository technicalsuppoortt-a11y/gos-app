import React, { useId, useState, type ReactNode } from 'react';
import { datesIn, type DateRange } from '../../backend/analytics';
import { t } from './labels';

export type KpiTone = 'purple' | 'emerald';

export type KpiCardItem = {
  id: string;
  label: string;
  value: string;
  deltaText: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  compareHint?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: KpiTone;
};

export function Empty({ children }: { children?: ReactNode }) {
  return <p className="an-analytics-empty">{children ?? t('No records in this period')}</p>;
}

export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return rows.length ? (
    <div className="an-table-wrap">
      <table className="an-table">
        <thead>
          <tr>
            {headers.map(header => (
              <th scope="col" key={header}>
                {t(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty />
  );
}

export function AnalyticsKpiGrid({
  items,
  columns = 4,
}: {
  items: KpiCardItem[];
  columns?: 3 | 4;
}) {
  return (
    <div
      className={`an2-kpi-grid ${columns === 3 ? 'an2-kpi-grid--3' : 'an2-kpi-grid--4'}`}
      role="region"
      aria-label={t('Analytics')}
    >
      {items.map(item => {
        const Icon = item.icon;
        const tone = item.tone ?? 'purple';
        const dTone = item.deltaTone ?? 'positive';
        return (
          <article key={item.id} className="an2-card an2-kpi-card">
            <div className="an2-kpi-header">
              <span className={`an2-kpi-badge an2-kpi-badge--${tone}`} aria-hidden="true">
                <Icon size={15} />
              </span>
              <span className="an2-kpi-label">{t(item.label)}</span>
            </div>
            <div className="an2-kpi-value">
              <bdi>{item.value}</bdi>
            </div>
            <div className="an2-kpi-footer">
              <span className={`an2-kpi-delta an2-kpi-delta--${dTone}`}>
                <bdi>{item.deltaText}</bdi>
              </span>
              {item.compareHint && (
                <span className="an2-kpi-compare-pill">
                  <bdi>{item.compareHint}</bdi>
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SVG Geometry Helpers                                                       */
/* -------------------------------------------------------------------------- */
type Pt = [number, number];
const W = 640;
const H = 220;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

function niceCeiling(peak: number, minCeiling = 10): number {
  if (peak <= 0) return minCeiling;
  const magnitude = Math.pow(10, Math.floor(Math.log10(peak)));
  const residual = peak / magnitude;
  const niceFactor = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return Math.max(minCeiling, niceFactor * magnitude);
}

function buildTicks(maxVal: number, steps = 5): number[] {
  return Array.from({ length: steps + 1 }, (_, idx) => (maxVal * (steps - idx)) / steps);
}

function catmullRomPath(pts: Pt[]): string {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const tension = 1 / 6;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = Math.min(H - PAD_BOTTOM, Math.max(PAD_TOP, p1[1] + (p2[1] - p0[1]) * tension));
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = Math.min(H - PAD_BOTTOM, Math.max(PAD_TOP, p2[1] - (p3[1] - p1[1]) * tension));
    d += ` C${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

function areaFromSpline(pts: Pt[]): string {
  if (!pts.length) return '';
  const base = H - PAD_BOTTOM;
  return `${catmullRomPath(pts)} L${pts[pts.length - 1][0].toFixed(2)} ${base} L${pts[0][0].toFixed(2)} ${base} Z`;
}

function formatAxisDate(dayKey: string, locale: string): string {
  return new Date(dayKey + 'T12:00:00').toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
}

function pickTickIndices(total: number, maxTicks = 6): number[] {
  if (total <= 1) return [0];
  if (total <= maxTicks) return Array.from({ length: total }, (_, i) => i);
  const step = (total - 1) / (maxTicks - 1);
  const indices = new Set<number>();
  for (let i = 0; i < maxTicks; i++) indices.add(Math.round(i * step));
  return [...indices].sort((a, b) => a - b);
}

/* -------------------------------------------------------------------------- */
/* Tab 1: Dual-Series Smooth Area Growth Chart                                */
/* -------------------------------------------------------------------------- */
export function DualAreaGrowthChart({
  title,
  range,
  locale,
  revenueLabel,
  leadsLabel,
  revenueValues,
  leadsValues,
  previousRevenueValues,
  compareEnabled,
  formatMoney,
  formatNumber,
}: {
  title: string;
  range: DateRange;
  locale: string;
  revenueLabel: string;
  leadsLabel: string;
  revenueValues: number[];
  leadsValues: number[];
  previousRevenueValues?: number[];
  compareEnabled?: boolean;
  formatMoney: (n: number) => string;
  formatNumber: (n: number) => string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hovered, setHovered] = useState<number | null>(null);
  const days = datesIn(range);
  const count = Math.max(1, days.length);

  const peakRev = Math.max(
    ...revenueValues,
    ...(compareEnabled && previousRevenueValues ? previousRevenueValues : [0]),
    0
  );
  const revCeiling = niceCeiling(peakRev, 100);
  const peakLeads = Math.max(...leadsValues, 0);
  const leadsCeiling = Math.max(4, peakLeads * 2.35);

  const yTicks = buildTicks(revCeiling, 5);
  const xTickIndices = pickTickIndices(count, 5);

  const toX = (i: number) => (count === 1 ? W / 2 : (i / (count - 1)) * W);
  const revPts: Pt[] = days.map((_, i) => [
    toX(i),
    H - PAD_BOTTOM - (Math.min(revenueValues[i] ?? 0, revCeiling) / revCeiling) * PLOT_H,
  ]);
  const leadPts: Pt[] = days.map((_, i) => [
    toX(i),
    H - PAD_BOTTOM - (Math.min(leadsValues[i] ?? 0, leadsCeiling) / leadsCeiling) * PLOT_H,
  ]);
  const prevPts: Pt[] | null =
    compareEnabled && previousRevenueValues?.length
      ? days.map((_, i) => [
          toX(i),
          H -
            PAD_BOTTOM -
            (Math.min(previousRevenueValues[i] ?? 0, revCeiling) / revCeiling) * PLOT_H,
        ])
      : null;

  const activeIdx = hovered !== null && hovered < count ? hovered : null;

  return (
    <section className="an2-card an2-chart-card">
      <div className="an2-card-head">
        <h2 className="an2-card-title">{t(title)}</h2>
        <div className="an2-legend">
          <span className="an2-legend-item">
            <i className="an2-dot an2-dot--purple" />
            <bdi>{revenueLabel}</bdi>
          </span>
          <span className="an2-legend-item">
            <i className="an2-dot an2-dot--emerald" />
            <span>{leadsLabel}</span>
          </span>
          {compareEnabled && (
            <span className="an2-legend-item">
              <i className="an2-dot an2-dot--muted" />
              <span>{t('Previous revenue')}</span>
            </span>
          )}
        </div>
      </div>

      <div className="an2-plot-shell" dir="ltr" onMouseLeave={() => setHovered(null)}>
        <div className="an2-y-axis">
          {yTicks.map((val, idx) => (
            <span
              key={idx}
              style={{
                top: `${((PAD_TOP + (idx / (yTicks.length - 1)) * PLOT_H) / H) * 100}%`,
              }}
            >
              {formatNumber(Math.round(val))}
            </span>
          ))}
        </div>

        <div className="an2-canvas-area">
          {yTicks.map((_, idx) => (
            <i
              key={idx}
              className="an2-grid-line"
              style={{
                top: `${((PAD_TOP + (idx / (yTicks.length - 1)) * PLOT_H) / H) * 100}%`,
              }}
            />
          ))}

          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="an2-svg">
            <defs>
              <linearGradient id={`revGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id={`leadGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {prevPts && prevPts.length > 1 && (
              <path
                d={catmullRomPath(prevPts)}
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.8"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {revPts.length > 1 && <path d={areaFromSpline(revPts)} fill={`url(#revGrad-${uid})`} />}
            <path
              d={catmullRomPath(revPts)}
              fill="none"
              stroke="#7C3AED"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {leadPts.length > 1 && <path d={areaFromSpline(leadPts)} fill={`url(#leadGrad-${uid})`} />}
            <path
              d={catmullRomPath(leadPts)}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {activeIdx !== null && (
              <line
                x1={toX(activeIdx)}
                x2={toX(activeIdx)}
                y1={PAD_TOP}
                y2={H - PAD_BOTTOM}
                stroke="#7C3AED"
                strokeOpacity="0.28"
                strokeDasharray="3 3"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* Invisible hover columns for silky interactive tooltips */}
          <div className="an2-hover-columns">
            {days.map((day, idx) => (
              <button
                key={day}
                type="button"
                className="an2-hover-slot"
                aria-label={`${formatAxisDate(day, locale)}: ${formatMoney(revenueValues[idx] ?? 0)}`}
                onMouseEnter={() => setHovered(idx)}
                onFocus={() => setHovered(idx)}
              />
            ))}
          </div>

          {activeIdx !== null && (
            <>
              <span
                className="an2-point-dot an2-point-dot--purple"
                style={{
                  left: `${(revPts[activeIdx][0] / W) * 100}%`,
                  top: `${(revPts[activeIdx][1] / H) * 100}%`,
                }}
              />
              <span
                className="an2-point-dot an2-point-dot--emerald"
                style={{
                  left: `${(leadPts[activeIdx][0] / W) * 100}%`,
                  top: `${(leadPts[activeIdx][1] / H) * 100}%`,
                }}
              />
              <div
                className={`an2-tooltip ${activeIdx > count * 0.72 ? 'an2-tooltip--left' : activeIdx < count * 0.22 ? 'an2-tooltip--right' : ''}`}
                style={{ left: `${(toX(activeIdx) / W) * 100}%` }}
              >
                <div className="an2-tooltip-date">{formatAxisDate(days[activeIdx], locale)}</div>
                <div className="an2-tooltip-row">
                  <i className="an2-dot an2-dot--purple" />
                  <span>{formatMoney(revenueValues[activeIdx] ?? 0)}</span>
                </div>
                <div className="an2-tooltip-row">
                  <i className="an2-dot an2-dot--emerald" />
                  <span>
                    {formatNumber(leadsValues[activeIdx] ?? 0)} {t('Leads')}
                  </span>
                </div>
                {compareEnabled && previousRevenueValues && (
                  <div className="an2-tooltip-row an2-tooltip-row--muted">
                    <i className="an2-dot an2-dot--muted" />
                    <span>{formatMoney(previousRevenueValues[activeIdx] ?? 0)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="an2-x-axis">
            {xTickIndices.map(idx => (
              <span
                key={days[idx]}
                style={{ left: `${count === 1 ? 50 : (idx / (count - 1)) * 100}%` }}
              >
                {formatAxisDate(days[idx], locale)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 1: Visual Funnel Breakdown Card                                        */
/* -------------------------------------------------------------------------- */
export type FunnelSummaryStage = {
  id: string;
  label: string;
  count: number;
  pctText: string;
  barWidthPct: number;
  color: string;
};

export function ConversionFunnelCard({
  title,
  stages,
  formatCount,
}: {
  title: string;
  stages: FunnelSummaryStage[];
  formatCount: (n: number) => string;
}) {
  return (
    <section className="an2-card an2-funnel-card">
      <div className="an2-card-head">
        <h2 className="an2-card-title">{t(title)}</h2>
      </div>
      <div className="an2-funnel-stages">
        {stages.map((stage, idx) => (
          <div key={stage.id} className="an2-funnel-stage">
            <div className="an2-funnel-stage-head">
              <span className="an2-funnel-stage-label">{t(stage.label)}</span>
              <span className="an2-funnel-stage-nums">
                <strong>{formatCount(stage.count)}</strong>
                {idx === 0 && <em>({stage.pctText})</em>}
              </span>
            </div>
            <div className="an2-funnel-track">
              <div
                className="an2-funnel-fill"
                style={{
                  width: `${stage.count > 0 ? Math.max(8, Math.min(100, stage.barWidthPct)) : 0}%`,
                  background: stage.color,
                }}
              />
              {idx > 0 && <span className="an2-funnel-track-pct">({stage.pctText})</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 2: Combined Revenue Bars + Transactions Smooth Line Chart              */
/* -------------------------------------------------------------------------- */
export function BarAndLineSalesChart({
  title,
  range,
  locale,
  revenueLabel,
  txnsLabel,
  revenueValues,
  txnValues,
  formatMoney,
  formatNumber,
}: {
  title: string;
  range: DateRange;
  locale: string;
  revenueLabel: string;
  txnsLabel: string;
  revenueValues: number[];
  txnValues: number[];
  formatMoney: (n: number) => string;
  formatNumber: (n: number) => string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hovered, setHovered] = useState<number | null>(null);
  const days = datesIn(range);
  const count = Math.max(1, days.length);

  // Aggregate into <= 30 crisp slots if 90 days is selected so bars stay clean and readable
  const bucketSize = count > 35 ? Math.ceil(count / 30) : 1;
  const buckets = React.useMemo(() => {
    const out: { day: string; rev: number; txns: number }[] = [];
    for (let i = 0; i < count; i += bucketSize) {
      const sliceDays = days.slice(i, i + bucketSize);
      let rev = 0;
      let txns = 0;
      for (let j = i; j < Math.min(count, i + bucketSize); j++) {
        rev += revenueValues[j] ?? 0;
        txns += txnValues[j] ?? 0;
      }
      out.push({ day: sliceDays[sliceDays.length - 1], rev, txns });
    }
    return out;
  }, [days, count, bucketSize, revenueValues, txnValues]);

  const bCount = Math.max(1, buckets.length);
  const revCeiling = niceCeiling(Math.max(...buckets.map(b => b.rev), 0), 100);
  const txnCeiling = Math.max(3, Math.max(...buckets.map(b => b.txns), 0) * 2.25);
  const yTicks = buildTicks(revCeiling, 5);
  const xTickIndices = pickTickIndices(bCount, 5);

  const slotW = W / bCount;
  const barW = Math.min(20, Math.max(4, slotW * 0.54));
  const txnPts: Pt[] = buckets.map((b, i) => [
    (i + 0.5) * slotW,
    H - PAD_BOTTOM - (Math.min(b.txns, txnCeiling) / txnCeiling) * PLOT_H,
  ]);

  const activeIdx = hovered !== null && hovered < bCount ? hovered : null;

  return (
    <section className="an2-card an2-chart-card">
      <div className="an2-card-head">
        <h2 className="an2-card-title">{t(title)}</h2>
        <div className="an2-legend">
          <span className="an2-legend-item">
            <i className="an2-dot an2-dot--purple" />
            <bdi>{revenueLabel}</bdi>
          </span>
          <span className="an2-legend-item">
            <i className="an2-dot an2-dot--emerald" />
            <span>{txnsLabel}</span>
          </span>
        </div>
      </div>

      <div className="an2-plot-shell" dir="ltr" onMouseLeave={() => setHovered(null)}>
        <div className="an2-y-axis">
          {yTicks.map((val, idx) => (
            <span
              key={idx}
              style={{
                top: `${((PAD_TOP + (idx / (yTicks.length - 1)) * PLOT_H) / H) * 100}%`,
              }}
            >
              {formatNumber(Math.round(val))}
            </span>
          ))}
        </div>

        <div className="an2-canvas-area">
          {yTicks.map((_, idx) => (
            <i
              key={idx}
              className="an2-grid-line"
              style={{
                top: `${((PAD_TOP + (idx / (yTicks.length - 1)) * PLOT_H) / H) * 100}%`,
              }}
            />
          ))}

          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="an2-svg">
            <defs>
              <linearGradient id={`barGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              <linearGradient id={`barGradActive-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6D28D9" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
            </defs>

            {buckets.map((b, i) => {
              const barH = (Math.min(b.rev, revCeiling) / revCeiling) * PLOT_H;
              const x = (i + 0.5) * slotW - barW / 2;
              const y = H - PAD_BOTTOM - barH;
              return (
                <rect
                  key={b.day + i}
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(0, barH)}
                  rx={Math.min(4, barW / 2)}
                  fill={activeIdx === i ? `url(#barGradActive-${uid})` : `url(#barGrad-${uid})`}
                  opacity={activeIdx === null || activeIdx === i ? 1 : 0.72}
                />
              );
            })}

            {txnPts.length > 1 && (
              <path
                d={catmullRomPath(txnPts)}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          <div className="an2-hover-columns">
            {buckets.map((b, idx) => (
              <button
                key={b.day + idx}
                type="button"
                className="an2-hover-slot"
                aria-label={`${formatAxisDate(b.day, locale)}: ${formatMoney(b.rev)}`}
                onMouseEnter={() => setHovered(idx)}
                onFocus={() => setHovered(idx)}
              />
            ))}
          </div>

          {activeIdx !== null && (
            <div
              className={`an2-tooltip ${activeIdx > bCount * 0.72 ? 'an2-tooltip--left' : activeIdx < bCount * 0.22 ? 'an2-tooltip--right' : ''}`}
              style={{ left: `${((activeIdx + 0.5) / bCount) * 100}%` }}
            >
              <div className="an2-tooltip-date">{formatAxisDate(buckets[activeIdx].day, locale)}</div>
              <div className="an2-tooltip-row">
                <i className="an2-dot an2-dot--purple" />
                <span>{formatMoney(buckets[activeIdx].rev)}</span>
              </div>
              <div className="an2-tooltip-row">
                <i className="an2-dot an2-dot--emerald" />
                <span>
                  {formatNumber(buckets[activeIdx].txns)} {t('Transactions')}
                </span>
              </div>
            </div>
          )}

          <div className="an2-x-axis">
            {xTickIndices.map(idx => (
              <span
                key={buckets[idx].day + idx}
                style={{ left: `${((idx + 0.5) / bCount) * 100}%` }}
              >
                {formatAxisDate(buckets[idx].day, locale)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Donut Distribution Card (Payment Methods & Lead Sources)                   */
/* -------------------------------------------------------------------------- */
const DONUT_PALETTE = ['#7C3AED', '#10B981', '#6366F1', '#F59E0B', '#0EA5E9', '#EC4899'];

export function ModernDonutCard({
  title,
  items,
  emptyLabel,
  formatValue,
}: {
  title: string;
  items: { label: string; value: number }[];
  emptyLabel?: string;
  formatValue?: (n: number) => string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const nonZero = items.filter(it => it.value > 0);
  const total = nonZero.reduce((acc, it) => acc + it.value, 0);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const segments = nonZero.map((it, idx) => {
    const fraction = total > 0 ? it.value / total : 0;
    const arcLen = fraction * circumference;
    const gap = nonZero.length > 1 ? Math.min(2.6, arcLen * 0.18) : 0;
    const offset = cumulative;
    cumulative += arcLen;
    return {
      ...it,
      pct: Math.round(fraction * 100),
      color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
      dashArray: `${Math.max(0, arcLen - gap)} ${circumference}`,
      dashOffset: -offset,
    };
  });

  return (
    <section className="an2-card an2-donut-card">
      <div className="an2-card-head">
        <h2 className="an2-card-title">{t(title)}</h2>
      </div>

      <div className="an2-donut-layout">
        <div className="an2-donut-ring-wrap">
          <svg viewBox="0 0 120 120" className="an2-donut-svg" role="img" aria-label={t(title)}>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="an2-donut-track"
              strokeWidth="18"
            />
            {segments.map((seg, idx) => (
              <circle
                key={seg.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={activeIdx === idx ? 21 : 18}
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                transform="rotate(-90 60 60)"
                className="an2-donut-segment"
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <title>
                  {t(seg.label)} · {seg.pct}%
                </title>
              </circle>
            ))}
          </svg>
          {activeIdx !== null && segments[activeIdx] && (
            <div className="an2-donut-center">
              <strong>{segments[activeIdx].pct}%</strong>
              <small>{t(segments[activeIdx].label)}</small>
            </div>
          )}
        </div>

        {segments.length > 0 ? (
          <ul className="an2-donut-legend">
            {segments.map((seg, idx) => (
              <li
                key={seg.label}
                className={activeIdx === idx ? 'is-active' : ''}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <span className="an2-donut-legend-name">
                  <i style={{ background: seg.color }} />
                  <span>{t(seg.label)}</span>
                </span>
                <span className="an2-donut-legend-vals">
                  {formatValue && <small>{formatValue(seg.value)}</small>}
                  <strong>{seg.pct}%</strong>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="an2-donut-empty">{t(emptyLabel ?? 'No records in this period')}</p>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 4: Grouped Bar Chart (AI vs Human Team)                                */
/* -------------------------------------------------------------------------- */
export function GroupedBarAIChart({
  title,
  range,
  locale,
  aiValues,
  humanValues,
  formatNumber,
}: {
  title: string;
  range: DateRange;
  locale: string;
  aiValues: number[];
  humanValues: number[];
  formatNumber: (n: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const days = datesIn(range);
  const count = Math.max(1, days.length);

  // Group into ~6-8 crisp date buckets matching the target grouped-bar visual
  const targetGroups = count <= 7 ? count : 6;
  const groupSize = Math.max(1, Math.ceil(count / targetGroups));

  const groups = React.useMemo(() => {
    const out: { day: string; ai: number; human: number }[] = [];
    for (let i = 0; i < count; i += groupSize) {
      const slice = days.slice(i, i + groupSize);
      let ai = 0;
      let human = 0;
      for (let j = i; j < Math.min(count, i + groupSize); j++) {
        ai += aiValues[j] ?? 0;
        human += humanValues[j] ?? 0;
      }
      out.push({ day: slice[slice.length - 1], ai, human });
    }
    return out;
  }, [days, count, groupSize, aiValues, humanValues]);

  const gCount = Math.max(1, groups.length);
  const ceiling = niceCeiling(
    Math.max(...groups.map(g => Math.max(g.ai, g.human)), 0),
    10
  );
  const yTicks = buildTicks(ceiling, 5);
  const slotW = W / gCount;
  const singleBarW = Math.min(22, Math.max(8, slotW * 0.22));
  const barGap = Math.max(4, singleBarW * 0.28);

  const activeIdx = hovered !== null && hovered < gCount ? hovered : null;

  return (
    <section className="an2-card an2-chart-card">
      <div className="an2-card-head">
        <h2 className="an2-card-title">{t(title)}</h2>
        <div className="an2-legend">
          <span className="an2-legend-item">
            <i className="an2-dot an2-dot--purple" />
            <span>{t('AI Response')}</span>
          </span>
          <span className="an2-legend-item">
            <i className="an2-dot an2-dot--emerald" />
            <span>{t('Human Team Intervention')}</span>
          </span>
        </div>
      </div>

      <div className="an2-plot-shell" dir="ltr" onMouseLeave={() => setHovered(null)}>
        <div className="an2-y-axis">
          {yTicks.map((val, idx) => (
            <span
              key={idx}
              style={{
                top: `${((PAD_TOP + (idx / (yTicks.length - 1)) * PLOT_H) / H) * 100}%`,
              }}
            >
              {formatNumber(Math.round(val))}
            </span>
          ))}
        </div>

        <div className="an2-canvas-area">
          {yTicks.map((_, idx) => (
            <i
              key={idx}
              className="an2-grid-line"
              style={{
                top: `${((PAD_TOP + (idx / (yTicks.length - 1)) * PLOT_H) / H) * 100}%`,
              }}
            />
          ))}

          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="an2-svg">
            {groups.map((grp, i) => {
              const centerX = (i + 0.5) * slotW;
              const aiH = (Math.min(grp.ai, ceiling) / ceiling) * PLOT_H;
              const humanH = (Math.min(grp.human, ceiling) / ceiling) * PLOT_H;
              const dim = activeIdx !== null && activeIdx !== i ? 0.65 : 1;
              return (
                <g key={grp.day + i} opacity={dim}>
                  <rect
                    x={centerX - singleBarW - barGap / 2}
                    y={H - PAD_BOTTOM - aiH}
                    width={singleBarW}
                    height={Math.max(0, aiH)}
                    rx={Math.min(5, singleBarW / 2)}
                    fill="#7C3AED"
                  />
                  <rect
                    x={centerX + barGap / 2}
                    y={H - PAD_BOTTOM - humanH}
                    width={singleBarW}
                    height={Math.max(0, humanH)}
                    rx={Math.min(5, singleBarW / 2)}
                    fill="#10B981"
                  />
                </g>
              );
            })}
          </svg>

          <div className="an2-hover-columns">
            {groups.map((grp, idx) => (
              <button
                key={grp.day + idx}
                type="button"
                className="an2-hover-slot"
                aria-label={`${formatAxisDate(grp.day, locale)}: AI ${grp.ai}, Human ${grp.human}`}
                onMouseEnter={() => setHovered(idx)}
                onFocus={() => setHovered(idx)}
              />
            ))}
          </div>

          {activeIdx !== null && (
            <div
              className={`an2-tooltip ${activeIdx > gCount * 0.72 ? 'an2-tooltip--left' : activeIdx < gCount * 0.22 ? 'an2-tooltip--right' : ''}`}
              style={{ left: `${((activeIdx + 0.5) / gCount) * 100}%` }}
            >
              <div className="an2-tooltip-date">{formatAxisDate(groups[activeIdx].day, locale)}</div>
              <div className="an2-tooltip-row">
                <i className="an2-dot an2-dot--purple" />
                <span>
                  {t('AI Response')}: {formatNumber(groups[activeIdx].ai)}
                </span>
              </div>
              <div className="an2-tooltip-row">
                <i className="an2-dot an2-dot--emerald" />
                <span>
                  {t('Human Team Intervention')}: {formatNumber(groups[activeIdx].human)}
                </span>
              </div>
            </div>
          )}

          <div className="an2-x-axis">
            {groups.map((grp, idx) => (
              <span key={grp.day + idx} style={{ left: `${((idx + 0.5) / gCount) * 100}%` }}>
                {formatAxisDate(grp.day, locale)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
