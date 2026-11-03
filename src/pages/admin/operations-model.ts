import type { LiveRecord } from './live-model';
import { safeDate } from '../../utils/safeDate';
export const resourceOf = (r: LiveRecord) => r.path.split('/').at(-2) ?? '';
export const numberValue = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : 0;
export function dateValue(v: unknown): string {
  return safeDate(v)?.toISOString() ?? '';
}
export function tokenCount(data: Record<string, unknown>) { return numberValue(data.totalTokens ?? data.total_tokens ?? data.tokens) || numberValue(data.inputTokens ?? data.input_tokens) + numberValue(data.outputTokens ?? data.output_tokens); }
export function aggregateOperations(records: LiveRecord[]) {
  const leads = records.filter(r => resourceOf(r) === 'leads');
  const won = leads.filter(r => /^(won|customer|converted)$/i.test(String(r.data.lifecycleStage ?? r.data.stage ?? r.data.status ?? ''))).length;
  const revenue = new Map<string, number>();
  const trends = new Map<string, number>();
  for (const r of records.filter(r => resourceOf(r) === 'transactions' && /^(completed|paid|succeeded|confirmed)$/i.test(String(r.data.status)))) {
    const currency = String(r.data.currency || 'Unspecified');
    const amount = numberValue(r.data.amount ?? r.data.total);
    revenue.set(currency, (revenue.get(currency) ?? 0) + amount);
    const month = dateValue(r.data.createdAt ?? r.data.date ?? r.data.at).slice(0, 7);
    if (month) { const key = `${month} · ${currency}`; trends.set(key, (trends.get(key) ?? 0) + amount); }
  }
  return { leads: leads.length, won, conversion: leads.length ? won / leads.length * 100 : null, revenue: [...revenue], trends: [...trends].sort(([a], [b]) => a.localeCompare(b)), tokens: records.filter(r => resourceOf(r) === 'aiUsage').reduce((sum, r) => sum + tokenCount(r.data), 0) };
}
