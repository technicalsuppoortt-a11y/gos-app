import { useUILanguage, localizeNode, translateText } from '../../i18n/display';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, ChevronDown, Copy, Download, ExternalLink, GitBranch, Layers3, Link2, MoreHorizontal, Pencil, Sparkles, Star, Tag, Trash2, Users, ShoppingCart, CreditCard, Eye } from 'lucide-react';
import type { FormProps } from './TypeForms';
import { IncludedItems, MediaCard } from './TypeForms';
import { Card, Description, Field, RichDescription, Select, Status, Toggle } from './primitives';
import type { WorkspaceTab } from './views';
import './course-workspace.css';
import { CourseCurriculum, CourseInstructor } from './CourseAuthoring';

export interface CourseActions {
  disabled: boolean; onEdit: (tab: WorkspaceTab) => void; onTab: (tab: WorkspaceTab) => void;
  onPreview: () => void; onSalesPage: () => void; onDuplicate: (version: boolean) => void;
  onDelete: () => void; onStatus: (enabled: boolean) => void; onBooking: () => void;
}

export function CourseMetrics({ product: p, experience: e }: FormProps) {
  useUILanguage();
  return <div className="course-metrics">{localizeNode([
    { icon: Tag, value: p.price || '€297', label: 'Price' }, { icon: ShoppingCart, value: p.sales || '124', label: 'Total Sales' },
    { icon: CreditCard, value: p.revenue || '€36,828', label: 'Total Revenue' },
    { icon: Users, value: String(e.activeStudents ?? 892), label: 'Active Students' },
    { icon: Star, value: String(e.rating ?? 4.8), label: `Rating (${e.reviewCount ?? 86} reviews)` },
  ].map(({ icon: Icon, value, label }) => <div key={label}><span><Icon size={19}/></span><div><b>{localizeNode(value)}</b><small>{localizeNode(label)}</small></div></div>))}</div>;
}

export function CourseViewHeader(props: FormProps & CourseActions) {
  useUILanguage();
  const [menu, setMenu] = useState<'edit' | 'more' | null>(null);
  const { product: p } = props;
  return <div className="course-view-summary">
    <Link className="cw-back course-view-back" to="/dashboard/products-payments"><ArrowLeft size={12}/>{translateText("Back to products")}</Link>
    <header className="course-view-header">
      {localizeNode(p.image ? <img className="course-view-thumbnail" src={p.image} alt={translateText(p.name)}/> : <div className="course-view-thumbnail course-view-placeholder"><BookIcon/></div>)}
      <div className="course-view-heading"><div className="course-view-title"><h1>{localizeNode(p.name || 'Complete AI Marketing Course')}</h1><Status status={p.status}/></div><span className="course-type-badge">{translateText("Online Course")}</span><p>{localizeNode(p.description || props.experience.shortDescription || 'Learn how to create, market and sell digital products using AI. Step by step system with real examples and templates.')}</p></div>
      <div className="course-view-actions"><button className="cw-button" onClick={props.onPreview}><Eye size={13}/>{translateText("Preview")}</button><button className="cw-button" onClick={props.onSalesPage}><ExternalLink size={13}/>{translateText("View Sales Page")}</button><div className="tw-edit-menu"><button className="cw-button primary" aria-expanded={menu === 'edit'} onClick={() => setMenu(menu === 'edit' ? null : 'edit')}><Pencil size={13}/>{translateText("Edit Product")}<ChevronDown size={13}/></button>{localizeNode(menu === 'edit' && <div className="tw-edit-options">{localizeNode(([['information', 'Course Information'], ['content', 'Content'], ['pricing', 'Pricing & Offers'], ['settings', 'Settings']] as const).map(([tab, title]) => <button key={tab} onClick={() => { setMenu(null); props.onEdit(tab); }}>{localizeNode(title)}</button>))}</div>)}</div><div className="tw-edit-menu"><button className="cw-icon-button" aria-label={translateText("More course actions")} aria-expanded={menu === 'more'} onClick={() => setMenu(menu === 'more' ? null : 'more')}><MoreHorizontal size={16}/></button>{localizeNode(menu === 'more' && <div className="tw-edit-options"><button disabled={props.disabled} onClick={() => props.onDuplicate(false)}>{translateText("Duplicate Product")}</button><button disabled={props.disabled} onClick={() => props.onDuplicate(true)}>{translateText("Create New Version")}</button><button disabled={props.disabled} onClick={props.onDelete}>{translateText("Delete Product")}</button></div>)}</div></div>
      <CourseMetrics {...props}/>
    </header>{localizeNode(menu && <button className="tw-menu-scrim" aria-label={translateText("Close course menu")} onClick={() => setMenu(null)}/>)}
  </div>;
}
function BookIcon() {
  useUILanguage(); return <Layers3 size={28}/>; }

export function CourseOverview(props: FormProps & CourseActions) {
  useUILanguage();
  const { product: p, experience: e, editing, onEdit } = props;
  const edit = (target: WorkspaceTab) => <button className="cw-button small" onClick={() => onEdit(target)}><Pencil size={12}/>{translateText("Edit")}</button>;
  return <div className={`course-grid ${editing ? 'course-authoring' : 'course-overview'}`}>
    <div className="course-primary tw-stack">
      <Card title={translateText(editing ? 'Course Information' : 'Product Information')} action={!editing && edit('information')}>
        {localizeNode(editing ? <>
          <Field label="Course Title *"><input value={p.name} maxLength={140} onChange={event => props.update({ name: event.target.value })} placeholder={translateText("Enter your course title")}/></Field>
          <Field label="Course URL"><span className="course-link-field"><input type="url" value={props.config.salesUrl} onChange={event => props.configure({ salesUrl: event.target.value })} placeholder={translateText("https://your-site.com/courses/your-course")}/><CopyButton value={props.config.salesUrl} error={props.error}/></span></Field>
          <Field label="Short Description"><textarea rows={2} maxLength={300} value={e.shortDescription} onChange={event => props.customize({ shortDescription: event.target.value })}/></Field>
          <div className="tw-field-heading">{translateText("Full Description")}</div><RichDescription value={p.description} onChange={description => props.update({ description })} allowMedia/>
        </> : <div className="cw-review"><div><span>{translateText("Product Name")}</span><b>{localizeNode(p.name)}</b></div><div><span>{translateText("Product Type")}</span><b>{translateText("Online Course")}</b></div><div><span>{translateText("Short Description")}</span><b>{localizeNode(e.shortDescription || p.description)}</b></div><div><span>{translateText("Tags")}</span><div className="tw-tags">{localizeNode(e.tags.filter(Boolean).map((tag, i) => <span key={i}>{localizeNode(tag)}</span>))}</div></div></div>)}
      </Card>
      {localizeNode(!editing && <Card title={translateText("Product Description")} action={edit('information')}><Description text={p.description}/></Card>)}
      {localizeNode(!editing && <CourseOrders onView={() => props.onTab('orders')}/>)}
    </div>
    <div className="course-media tw-stack">
      <div className="course-media-card"><MediaCard {...props} title={translateText(editing ? 'Course Cover' : 'Product Media')}/>{localizeNode(!editing && <div className="course-included-edit">{localizeNode(edit('information'))}</div>)}</div>
      {localizeNode(editing ? <CourseInstructor {...props}/> : <><div className="course-included"><IncludedItems {...props}/><div className="course-included-edit">{localizeNode(edit('content'))}</div></div><CourseAnalytics {...props}/></>)}
    </div>
    <aside className="course-sidebar tw-stack"><CourseSidebar {...props}/></aside>
    {localizeNode(editing && <div className="course-curriculum"><CourseCurriculum {...props}/></div>)}
  </div>;
}

export function CourseSidebar(props: FormProps & CourseActions) {
  useUILanguage();
  const { product: p, config: c, experience: e, editing } = props;
  function exportContent() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ title: p.name, description: p.description, modules: c.modules, instructor: e.instructor }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${p.name || 'course'}-content.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const date = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString() : '—';
  return <>
    <Card title={translateText(editing ? 'Course Status & Visibility' : 'Product Status')} action={<Status status={p.status}/>}>
      <Toggle label={editing ? 'Publish course' : 'Course active'} checked={p.status === 'Active'} disabled={props.disabled} onChange={props.onStatus}/>
      {localizeNode(editing ? <fieldset className="course-visibility"><legend>{translateText("Visibility")}</legend>{localizeNode(([['Published', 'Visible to everyone'], ['Private', 'Only people with link'], ['Unlisted', 'Only enrolled students']] as const).map(([value, hint]) => <label key={value}><input type="radio" name="course-visibility" checked={e.visibility === value} onChange={() => props.customize({ visibility: value })}/><span><b>{localizeNode(value)}</b><small>{localizeNode(hint)}</small></span></label>))}</fieldset> : <div className="tw-dates"><span>{translateText("Created ")}<b>{localizeNode(date(p.createdAt))}</b></span><span>{translateText("Last Updated ")}<b>{localizeNode(date(e.updatedAt))}</b></span></div>)}
    </Card>
    {localizeNode(editing && <Card title={translateText("Course Details")}><div className="cw-form-grid"><Field label="Category"><Select value={e.category} options={Array.from(new Set([e.category || 'Select category', 'Marketing', 'Business', 'Design', 'Technology', 'Personal Development']))} onChange={category => props.customize({ category })}/></Field><Field label="Language"><Select value={e.language} options={['English', 'Arabic', 'French', 'German', 'Spanish']} onChange={language => props.customize({ language })}/></Field><Field label="Level"><Select value={e.courseLevel || 'Beginner to Advanced'} options={['Beginner to Advanced', 'Beginner', 'Intermediate', 'Advanced']} onChange={courseLevel => props.customize({ courseLevel })}/></Field><Field label="Estimated Duration"><input placeholder={translateText("e.g. 10 hours")} value={e.estimatedDuration || ''} onChange={event => props.customize({ estimatedDuration: event.target.value })}/></Field></div><Field label="Tags / Keywords" hint="Separate tags with commas"><input value={e.tags.join(', ')} onChange={event => props.customize({ tags: event.target.value.split(',').map(tag => tag.trim()) })}/></Field><div className="tw-tags">{localizeNode(e.tags.filter(Boolean).map((tag, i) => <span key={i}>{localizeNode(tag)}</span>))}</div></Card>)}
    {localizeNode(editing && <Card title={translateText("Preview & Links")}><div className="course-preview-actions"><button className="cw-button small" onClick={props.onPreview}><Eye size={12}/>{translateText("Preview as Student")}</button><button className="cw-button small" onClick={props.onPreview}><ExternalLink size={12}/>{translateText("Open in New Tab")}</button></div><CourseLink label="Course Sales Page" value={c.salesUrl} error={props.error}/><CourseLink label="Direct Checkout Link" value={e.directCheckoutUrl || ''} error={props.error} onChange={directCheckoutUrl => props.customize({ directCheckoutUrl })}/></Card>)}
    <Card title={translateText("Quick Actions")}><div className="tw-quick-actions">
      {localizeNode(!editing && <><button onClick={props.onSalesPage}><Eye size={14}/><span>{translateText("View Sales Page")}</span><ArrowRight size={12}/></button><CopyAction value={c.salesUrl || window.location?.href || ''} error={props.error}/></>)}
      <button disabled={props.disabled || !p.name.trim()} onClick={() => props.onDuplicate(false)}><Copy size={14}/><span>{translateText("Duplicate ")}{localizeNode(editing ? 'Course' : 'Product')}</span><ArrowRight size={12}/></button>
      {localizeNode(editing ? <button onClick={exportContent}><Download size={14}/><span>{translateText("Export Course Content")}</span></button> : <button disabled={props.disabled} onClick={() => props.onDuplicate(true)}><GitBranch size={14}/><span>{translateText("Create New Version")}</span><ArrowRight size={12}/></button>)}
      <button className="course-danger" disabled={!p.id || props.disabled} onClick={props.onDelete}><Trash2 size={14}/><span>{translateText("Delete ")}{localizeNode(editing ? 'Course' : 'Product')}</span></button>
    </div></Card>
    {localizeNode(!editing && <><Card title={translateText("Connected Tools")}><div className="tw-connected-tools">{localizeNode([
      { icon: Layers3, title: 'Funnel', connected: !!e.funnelUrl, action: () => props.onTab('funnel') },
      { icon: CalendarDays, title: 'Booking', connected: !!c.bookingUrl, action: props.onBooking },
      { icon: Sparkles, title: 'Automation', connected: c.automations.confirmation || c.automations.grantAccess, action: () => props.onTab('automation') },
    ].map(({ icon: Icon, title, connected, action }) => <button key={title} onClick={action}><span><Icon size={17}/></span><div><b>{localizeNode(title)}</b><small>{localizeNode(connected ? `${title} configured` : `Connect ${title.toLowerCase()}`)}</small></div><em className={connected ? 'connected' : ''}>{localizeNode(connected ? 'Connected' : 'Connect')}</em><ArrowRight size={12}/></button>))}</div></Card><Card title={translateText("Access & Delivery")}><div className="cw-review"><div><span>{translateText("Access Type")}</span><b>{localizeNode(c.access)}</b></div><div><span>{translateText("Delivery Method")}</span><b>{translateText("Online (GOS Platform)")}</b></div><div><span>{translateText("Student Limit")}</span><b>{localizeNode(e.studentLimit || 'Unlimited')}</b></div></div></Card></>)}
  </>;
}

async function copy(value: string, error: FormProps['error'], done: () => void) {
  if (!value) { error('Add a link before copying.'); return; }
  try { await navigator.clipboard.writeText(value); done(); } catch { error('Could not copy the link. Please copy the URL manually.'); }
}
function CopyButton({ value, error }: { value: string; error: FormProps['error'] }) {
  useUILanguage();
  const [copied, setCopied] = useState(false);
  return <button type="button" className="cw-icon-button" aria-label={translateText(copied ? 'Link copied' : 'Copy link')} onClick={() => void copy(value, error, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>{localizeNode(copied ? '✓' : <Copy size={12}/>)}</button>;
}
function CopyAction({ value, error }: { value: string; error: FormProps['error'] }) {
  useUILanguage();
  const [copied, setCopied] = useState(false);
  return <button onClick={() => void copy(value, error, () => setCopied(true))}><Link2 size={14}/><span>{localizeNode(copied ? 'Product link copied' : 'Copy Product Link')}</span><Copy size={12}/></button>;
}
function CourseLink({ label, value, error, onChange }: { label: string; value: string; error: FormProps['error']; onChange?: (value: string) => void }) {
  useUILanguage();
  return <Field label={label}><span className="course-link-field"><input type="url" readOnly={!onChange} value={value} placeholder={translateText("https://")} onChange={event => onChange?.(event.target.value)}/><CopyButton value={value} error={error}/></span></Field>;
}
const demoOrders = [
  { name: 'Sarah Chen', initials: 'SC', date: 'Oct 3, 2025 10:24' },
  { name: 'David Kim', initials: 'DK', date: 'Oct 3, 2025 09:12' },
  { name: 'Olivia Martinez', initials: 'OM', date: 'Oct 2, 2025 18:40' },
  { name: 'Marcus Johnson', initials: 'MJ', date: 'Oct 2, 2025 14:15' },
];
export function CourseOrders({ onView, demo = false }: { onView?: () => void; demo?: boolean }) {
  useUILanguage();
  if (demo) return <Card title={translateText("Recent Orders")} className="course-orders-card" action={onView && <button className="cw-text-link" onClick={onView}>{translateText("View All ")}<ArrowRight size={12}/></button>}><div className="course-table-wrap"><table className="course-table"><caption className="sr-only">{translateText("Sample recent course purchases")}</caption><thead><tr>{localizeNode(['Customer', 'Date', 'Amount', 'Status'].map(label => <th key={label} className={label === 'Customer' ? 'text-start' : 'text-center'}>{localizeNode(label)}</th>))}</tr></thead><tbody>{localizeNode(demoOrders.map(order => <tr key={order.name}><td className="text-start"><span className="course-customer"><span className="course-customer-avatar">{localizeNode(order.initials)}</span>{localizeNode(order.name)}</span></td><td className="course-order-date text-center">{localizeNode(order.date)}</td><td className="text-center">€297</td><td className="text-center"><span className="course-paid mx-auto inline-block">{translateText("Paid")}</span></td></tr>))}</tbody></table></div></Card>;
  return <Card title={translateText("Recent Orders")} action={onView && <button className="cw-text-link" onClick={onView}>{translateText("View All ")}<ArrowRight size={12}/></button>}><div className="course-table-wrap"><table className="course-table"><thead><tr>{localizeNode(['Customer', 'Date', 'Amount', 'Status'].map(label => <th key={label} className={label === 'Customer' ? 'text-start' : 'text-center'}>{localizeNode(label)}</th>))}</tr></thead><tbody><tr><td colSpan={4}><div className="course-empty"><ShoppingCart size={22}/><b>{translateText("No order records available")}</b><small>{translateText("Individual purchase records will appear when order data is connected.")}</small></div></td></tr></tbody></table></div></Card>;
}
export function CourseAnalytics({ product: p, demo = false }: FormProps & { demo?: boolean }) {
  useUILanguage();
  if (demo) return <CourseSalesChart/>;
  return <Card title={translateText("Sales Overview")} className="course-sales-card"><div className="course-sales-summary"><div><b>{localizeNode(p.revenue)}</b><small>{translateText("Total Revenue")}</small></div><div><b>{localizeNode(p.sales)}</b><small>{translateText("Total Sales")}</small></div><div><b>—</b><small>{translateText("Conversion Rate")}</small></div></div><div className="course-empty course-chart-empty"><BarChart3 size={26}/><b>{translateText("Sales trend unavailable")}</b><small>{translateText("Connect dated order data to view revenue over time.")}</small></div></Card>;
}

const trend = [120, 80, 105, 210, 255, 175, 140, 220, 340, 305, 370, 425, 460, 405, 320, 290, 310, 305, 430, 490, 520, 510, 640, 685, 570, 540, 610, 654];
function CourseSalesChart() {
  useUILanguage();
  const id = useId().replaceAll(':', '');
  const [period, setPeriod] = useState('Last 30 days'), [selected, setSelected] = useState<number | null>(null);
  const values = period === 'Last 7 days' ? trend.slice(-7) : trend;
  const left = 30, top = 12, width = 380, height = 105, bottom = top + height;
  const points = values.map((value, i) => ({ x: left + i / (values.length - 1) * width, y: bottom - value / 800 * height }));
  const line = points.map((point, i) => `${i ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
  const active = selected === null ? null : points[selected];
  return <Card title={translateText("Sales Overview")} className="course-sales-card" action={<Select value={period} options={['Last 30 days', 'Last 7 days']} onChange={value => { setPeriod(value); setSelected(null); }}/>}>
    <div className="course-sales-summary">{localizeNode([['€6,540', 'Revenue', '+28%'], ['22', 'New Sales', '+47%'], ['3.8%', 'Conversion Rate', '+1.2%']].map(([value, label, change]) => <div key={label}><b>{localizeNode(value)}</b><div><small>{localizeNode(label)}</small><span className="course-growth">↑ {localizeNode(change)}</span></div></div>))}</div>
    <div className="course-sales-chart"><svg viewBox="0 0 425 148" role="img" aria-label={translateText(`Sample course revenue trend over the ${period.toLowerCase()}`)}>
      <defs><linearGradient id={`course-fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity=".3"/><stop offset="100%" stopColor="#8b5cf6" stopOpacity=".04"/></linearGradient></defs>
      {localizeNode([0, 200, 400, 600, 800].map(value => { const y = bottom - value / 800 * height; return <g key={value}><line x1={left} x2={left + width} y1={y} y2={y} className="course-chart-grid"/><text x={left - 7} y={y + 3} textAnchor="end">€{localizeNode(value)}</text></g>; }))}
      <path d={`${line} L${left + width},${bottom} L${left},${bottom} Z`} fill={`url(#course-fill-${id})`}/><path d={line} fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinejoin="round"/>
      {localizeNode([0, .2, .4, .6, .8, 1].map((fraction, i) => <text key={i} x={left + fraction * width} y={137} textAnchor="middle">{translateText("Oct ")}{localizeNode(period === 'Last 7 days' ? 24 + Math.round(fraction * 6) : 1 + Math.round(fraction * 29))}</text>))}
      {localizeNode(active && <><line x1={active.x} x2={active.x} y1={top} y2={bottom} stroke="#a78bfa" strokeDasharray="3 3"/><circle cx={active.x} cy={active.y} r="3.5" fill="#7c3aed" stroke="white" strokeWidth="1.5"/></>)}
      {localizeNode(points.map((point, i) => <rect key={i} x={point.x - width / values.length / 2} y={top} width={width / values.length + 2} height={height} fill="transparent" tabIndex={0} aria-label={translateText(`October ${period === 'Last 7 days' ? i + 24 : i + 1}, revenue €${values[i]}`)} onMouseEnter={() => setSelected(i)} onMouseLeave={() => setSelected(null)} onFocus={() => setSelected(i)} onBlur={() => setSelected(null)}/>))}
    </svg>{localizeNode(selected !== null && <div className="course-chart-tooltip" role="status">{translateText("Oct ")}{localizeNode(period === 'Last 7 days' ? selected + 24 : selected + 1)}, 2025 <b>€{localizeNode(values[selected])}{translateText(" revenue")}</b></div>)}</div>
  </Card>;
}
