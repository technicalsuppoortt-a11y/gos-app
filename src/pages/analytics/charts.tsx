import { useId, type ReactNode } from 'react';
import { Activity, CircleDollarSign, MessageSquare, Package, Users } from 'lucide-react';
import { datesIn, type DateRange } from '../../backend/analytics';
import { Card, ChartFrame, Donut, DonutLegend, Legend, Sparkline, areaPath, smoothPath, toPoints, VH, VW } from './kit';
import { t } from './labels';

const colors = ['#7c3aed', '#168474', '#2563eb', '#c24483', '#bc6213', '#64748b'];
const icons = [Activity, CircleDollarSign, Users, MessageSquare, Package];
export type Metric = [label: string, value: string | number, spark?: number[]];
type Series = { name: string; values: (number | null)[]; format?: (value: number) => string };

export function Empty({ children }: { children?: ReactNode }) {
  return <p className="an-analytics-empty">{children ?? t('No records in this period')}</p>;
}

export function Metrics({ items }: { items: Metric[] }) {
  return <div className={`an-kpis cols-${items.length}`}>{items.map(([label, value, spark], index) => {
    const Icon = icons[index % icons.length];
    return <article key={label} className={`an-kpi ${['violet', 'green', 'blue', 'pink', 'orange'][index % 5]}`}>
      <span className="an-kpi-icon"><Icon /></span><div className="an-kpi-copy"><small>{t(label)}</small><div className="an-kpi-value"><b>{value}</b></div></div>
      {spark && <Sparkline data={spark.length === 1 ? [...spark, ...spark] : spark} color={colors[index % colors.length]} className="an-kpi-spark" />}
    </article>;
  })}</div>;
}

export function Trend({ title, range, locale, series, kind = 'line', empty, children }: {
  title: string; range: DateRange; locale: string; series: Series[]; kind?: 'area' | 'line' | 'bars' | 'stacked'; empty?: boolean; children?: ReactNode;
}) {
  const gradient = useId();
  const days = datesIn(range);
  const slots = days.length;
  const bars = kind === 'bars' || kind === 'stacked';
  const dual = kind === 'bars' && series.length === 2;
  const maxima = series.map(item => Math.max(1, ...item.values.map(value => value ?? 0)));
  const max = kind === 'stacked'
    ? Math.max(1, ...days.map((_, index) => series.reduce((total, item) => total + (item.values[index] ?? 0), 0)))
    : Math.max(...maxima);
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, numberingSystem: 'latn' });
  const x: [number, string][] = days.flatMap((day, i) => i % Math.ceil(slots / 5) === 0 || i === slots - 1
    ? [[bars || slots === 1 ? (i + 0.5) / slots : i / (slots - 1), new Date(day + 'T12:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' })] as [number, string]] : []);
  const axis = series[0].format ?? format.format;
  return <Card title={t(title)} action={<Legend items={series.map(({ name }, i) => [t(name), colors[i]])} />}>
    {empty ? <Empty /> : <div className="an-plot-frame" dir="ltr">
      <ChartFrame x={x} yLabels={[axis(dual ? maxima[0] : max), axis((dual ? maxima[0] : max) / 2), axis(0)]}>
        <defs><linearGradient id={gradient} x2="0%" y2="100%"><stop offset="0%" stopColor={colors[0]} stopOpacity=".35"/><stop offset="100%" stopColor={colors[0]} stopOpacity=".02"/></linearGradient></defs>
        {series.map(({ name, values, format: tooltip }, index) => {
          const ceiling = dual ? maxima[index] : max;
          if (bars) {
            const slot = VW / slots;
            const width = slot * 0.78 / (kind === 'bars' ? series.length : 1);
            return <g key={name}>{values.map((value, i) => {
              const height = (value ?? 0) / ceiling * VH;
              const baseline = kind === 'stacked' ? series.slice(0, index).reduce((total, item) => total + (item.values[i] ?? 0), 0) / max * VH : 0;
              return <rect key={days[i]} x={i * slot + slot * .11 + (kind === 'bars' ? width * index : 0)} y={VH - height - baseline} width={width} height={height} fill={colors[index]}>
                <title>{days[i]} · {t(name)} · {(tooltip ?? format.format)(value ?? 0)}</title>
              </rect>;
            })}</g>;
          }
          const points = toPoints(values.map(value => value ?? 0), ceiling, slots === 1);
          const path = kind === 'area' ? smoothPath(points) : points.map(([x, y], i) => values[i] === null ? '' : `${i && values[i - 1] !== null ? 'L' : 'M'}${x} ${y}`).join(' ');
          return <g key={name}>
            {kind === 'area' && points.length > 1 && <path d={areaPath(points)} fill={`url(#${gradient})`} />}
            <path d={path} stroke={colors[index]} strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
            {(slots === 1 || values.includes(null)) && points.map(([x, y], i) => values[i] !== null && <path key={days[i]} d={`M${x} ${y}h.01`} strokeLinecap="round" stroke={colors[index]} strokeWidth="4" vectorEffect="non-scaling-stroke" />)}
          </g>;
        })}
      </ChartFrame>
      {dual && <div className="an-secondary-axis" aria-label={t('Transaction scale')}>
        {[maxima[1], maxima[1] / 2, 0].map((value, i) => <span key={i}>{format.format(value)}</span>)}
      </div>}
    </div>}
    {children}
  </Card>;
}

export function Breakdown({ title, rows, format = String }: { title: string; rows: [string, number][]; format?: (value: number) => string }) {
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return <Card title={t(title)}>{rows.length ? <ul className="an-breakdown">{rows.map(([label, value], i) => <li key={i}>
    <span>{t(label)}</span><span className="an-track"><i style={{ width: `${value / max * 100}%` }} /></span><b>{format(value)}</b>
  </li>)}</ul> : <Empty />}</Card>;
}

export function Distribution({ title, rows, format }: { title: string; rows: [string, number][]; format: (value: number) => string }) {
  const segments = rows.map(([name, value], i) => ({ name: t(name), value, color: colors[i % colors.length] }));
  return <Card title={t(title)}>{segments.length ? <div className="an-donut-row"><Donut segments={segments} /><DonutLegend segments={segments} format={format} /></div> : <Empty />}</Card>;
}

export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return rows.length ? <div className="an-table-wrap"><table className="an-table"><thead><tr>{headers.map(header => <th scope="col" key={header}>{t(header)}</th>)}</tr></thead>
    <tbody>{rows.map((cells, i) => <tr key={i}>{cells.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
  </table></div> : <Empty />;
}
