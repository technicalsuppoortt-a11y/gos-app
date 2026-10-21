import type { CommerceConfig } from './model';

export function courseAnalytics(c: CommerceConfig, cutoff = 0, now = Date.now()) {
  const orders = (c.orders ?? []).filter(o => Date.parse(o.at) >= cutoff && Date.parse(o.at) <= now);
  const paid = orders.filter(o => o.status === 'Paid');
  const students = (c.students ?? []).filter(s => Date.parse(s.enrolledAt) >= cutoff && Date.parse(s.enrolledAt) <= now);
  const completed = students.filter(s => s.status === 'Completed' || s.progress === 100).length;
  const currencyOrders = paid.filter(o => o.currency === c.currency);
  const timeline = Array.from({ length: 6 }, (_, i) => {
    const today = new Date(now), monthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + i, 1));
    const month = monthDate.toISOString().slice(0, 7);
    return { month, label: monthDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      revenue: currencyOrders.filter(o => o.at.startsWith(month)).reduce((sum, o) => sum + o.amount, 0),
      orders: paid.filter(o => o.at.startsWith(month)).length, students: students.filter(s => s.enrolledAt.startsWith(month)).length };
  });
  const last = timeline.at(-1)!, previous = timeline.at(-2)!;
  return { orders, paid, students, completed, timeline,
    lessonViews: Object.values(c.lessonViews ?? {}).reduce((sum, views) => sum + views, 0),
    revenue: currencyOrders.reduce((sum, o) => sum + o.amount, 0),
    progress: students.length ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length) : 0,
    completionRate: students.length ? Math.round(completed / students.length * 100) : 0,
    growth: previous.revenue ? Math.round((last.revenue - previous.revenue) / previous.revenue * 100) : null };
}
