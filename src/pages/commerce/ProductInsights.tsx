import { TablePagination } from './TablePagination';
import { useTablePagination } from './useTablePagination';
import { courseAnalytics } from './analytics-model';
import { useRef, useState } from 'react';
import { Activity, ShoppingCart } from 'lucide-react';
import { Card, Select } from './primitives';
import type { FormProps } from './TypeForms';

export function ProductOrders({ config: c, limit, course = false }: Pick<FormProps, 'config'> & { limit?: number; course?: boolean }) {
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('All statuses');
  const orders = [...(c.orders ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).filter(o => (status === 'All statuses' || o.status === status) && `${o.id} ${o.customer} ${o.email} ${o.productName ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const table = useRef<HTMLDivElement>(null);
  const pagination = useTablePagination(orders.length);
  const rows = limit ? orders.slice(0, limit) : orders.slice(pagination.offset, pagination.offset + pagination.pageSize);
  return <Card className={!limit ? 'ce-records-card ce-orders-card' : ''} title={limit ? 'Recent Orders' : course ? 'Course Orders' : 'Orders'} subtitle={(c.orders ?? []).some(o => o.sample) ? 'Includes labeled sample records for this product.' : 'Orders associated with this product.'}>{!limit && <div className="ce-toolbar"><input aria-label="Search product orders" placeholder="Search order ID, customer or email" value={query} onChange={event => { setQuery(event.target.value); pagination.setPage(0); }}/><Select value={status} options={['All statuses', 'Paid', 'Pending', 'Refunded']} onChange={value => { setStatus(value); pagination.setPage(0); }}/></div>}<div className="ce-table-wrap" ref={table}><table className="ce-table"><thead><tr><th>Customer / Order</th><th>Product</th><th>Date</th><th>Amount</th><th>Payment</th>{course && <th>Enrollment</th>}</tr></thead><tbody>{rows.map(order => <tr key={order.id}><td><b>{order.customer}</b><small>{order.id}{order.sample ? ' · Sample' : ''}</small></td><td>{order.productName || 'This product'}</td><td>{new Date(order.at).toLocaleDateString()}</td><td>{new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.amount)}</td><td><span className={`ce-status ${order.status.toLowerCase()}`}>{order.status}</span></td>{course && <td>{c.students?.find(s => s.email.toLowerCase() === order.email.toLowerCase())?.status || (order.status === 'Paid' ? 'Not enrolled' : 'Awaiting payment')}</td>}</tr>)}</tbody></table>{!orders.length && <div className="ce-empty"><ShoppingCart size={22}/><p>No orders match this view.</p></div>}</div>{!limit && <TablePagination onNavigate={() => { if (table.current) table.current.scrollTop = 0; }} pagination={pagination} noun="orders" sizes={[10, 20, 50]}/>}</Card>;
}

export function ProductRecentActivity({ config: c }: Pick<FormProps, 'config'>) {
  const events = [...(c.activities ?? []), ...(c.orders ?? []).map(o => ({ id: `order-${o.id}`, title: `${o.sample ? 'Sample order · ' : ''}${o.customer}: ${o.status.toLowerCase()}`, at: o.at }))].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 7);
  return <Card title="Recent Activity" subtitle="Product updates, enrollment changes and order events.">{events.map(event => <div className="ce-activity" key={event.id}><span><Activity size={15}/></span><div><b>{event.title}</b><small>{new Date(event.at).toLocaleString()}</small></div></div>)}{!events.length && <p className="cw-help">Activity appears after you save this product or add an enrollment.</p>}</Card>;
}

export function CoursePerformance({ config: c }: Pick<FormProps, 'config'>) {
  const [period, setPeriod] = useState('All time'); const [today] = useState(() => Date.now());
  const cutoff = period === 'Last 7 days' ? today - 7 * 86400000 : period === 'Last 30 days' ? today - 30 * 86400000 : 0;
  const a = courseAnalytics(c, cutoff, today);
  const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c.currency, maximumFractionDigits: 0 }).format(amount);
  const highest = Math.max(1, ...a.timeline.map(month => month.revenue));
  const growthMax = Math.max(1, ...a.timeline.flatMap(month => [month.orders, month.students]));
  const cohorts = [
    { name: 'Completed', count: a.completed, style: 'completed' },
    { name: 'Active', count: a.students.filter(s => s.status === 'Active' && s.progress < 100).length, style: 'active' },
    { name: 'Pending', count: a.students.filter(s => s.status === 'Pending' && s.progress < 100).length, style: 'pending' },
    { name: 'Suspended', count: a.students.filter(s => s.status === 'Suspended' && s.progress < 100).length, style: 'suspended' },
  ];
  return <div className="ce-course-analytics"><Card title="Course Performance" subtitle="Calculated from course orders and enrollments in the selected period." action={<Select value={period} options={['All time', 'Last 30 days', 'Last 7 days']} onChange={setPeriod}/>}><div className="ce-analytics-metrics"><div><small>Sales revenue ({c.currency})</small><b>{money(a.revenue)}</b></div><div><small>Paid orders</small><b>{a.paid.length}</b></div><div><small>Enrolled students</small><b>{a.students.length}</b></div><div><small>Average progress</small><b>{a.progress}%</b></div></div>{(c.orders ?? []).some(o => o.sample) && <p className="cw-help">Includes labeled sample data. Revenue sums {c.currency} orders only.</p>}</Card>
    <div className="ce-chart-grid"><Card title="Sales Revenue" subtitle="Monthly paid revenue · past six months"><div className="ce-column-chart" role="img" aria-label="Monthly sales revenue">{a.timeline.map(month => <div key={month.month}><b>{money(month.revenue)}</b><div className="ce-column-track"><i style={{ height: (month.revenue / highest * 100) + '%' }}/></div><small>{month.label}</small></div>)}</div><div className="ce-chart-caption"><span>Current month vs previous month</span><b>{a.growth === null ? 'No prior revenue' : (a.growth > 0 ? '+' : '') + a.growth + '%'}</b></div></Card>
    <Card title="Student Completion Rates" subtitle="Learning outcomes for enrollments in this period"><div className="ce-completion-chart"><div className="ce-donut" role="img" aria-label={a.completionRate + '% of students completed'} style={{ background: 'conic-gradient(#10b981 ' + a.completionRate + '%, #e8edf7 0)' }}><div><b>{a.completionRate}%</b><small>Completed</small></div></div><div className="ce-cohort-bars">{cohorts.map(cohort => <div key={cohort.name}><span><i className={cohort.style}/>{cohort.name}</span><b>{cohort.count}</b><progress aria-label={cohort.name + ' students'} value={cohort.count} max={Math.max(1, a.students.length)}/></div>)}</div></div><p className="cw-help">{a.completed} completed · {a.students.length} enrolled · {a.progress}% average progress</p></Card>
    <Card title="Monthly Growth" subtitle="Paid orders and new enrollments · past six months"><div className="ce-chart-legend"><span><i/>Paid orders</span><span><i/>New students</span></div><div className="ce-growth-chart" role="img" aria-label="Monthly paid orders and new student enrollments">{a.timeline.map(month => <div key={month.month}><div className="ce-paired-columns"><i style={{ height: (month.orders / growthMax * 100) + '%' }}><b>{month.orders}</b></i><i style={{ height: (month.students / growthMax * 100) + '%' }}><b>{month.students}</b></i></div><small>{month.label}</small></div>)}</div></Card>
    <Card title="Learning outcomes"><div className="cw-review"><div><span>Completed</span><b>{a.completed}</b></div><div><span>Curriculum</span><b>{c.modules.length} modules · {c.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons</b></div><div><span>Pending orders</span><b>{a.orders.filter(o => o.status === 'Pending').length}</b></div><div><span>Refunded orders</span><b>{a.orders.filter(o => o.status === 'Refunded').length}</b></div><div><span>Payment completion</span><b>{a.orders.length ? Math.round(a.paid.length / a.orders.length * 100) : 0}%</b></div></div></Card></div>
  </div>;
}
