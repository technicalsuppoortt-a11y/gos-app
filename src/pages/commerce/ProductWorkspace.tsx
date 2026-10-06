import React from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronDown, Copy, CreditCard, ExternalLink, Eye, FileText, GitBranch, Layers3, Link2, LockKeyhole, Package, Repeat2, Save, Settings2, ShoppingCart, Sparkles, Tag, Users } from 'lucide-react';
import { defaultConfig, defaultExperience, formatPrice, hydrateProduct, kindLabels, newProduct, productKind, validateProduct } from './model';
import type { Billing, CommerceConfig, Product, ProductExperience, ProductKind } from './model';
import { deleteProduct, duplicateProduct, saveProduct, useProducts } from './repository';
import { workspaceViews, resolveTab } from './views';
import type { WorkspaceTab } from './views';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import { Card, Description, Dialog, Field, Select, Status, Toggle } from './primitives';
import { AccessForm, BookingForm, BundleComponents, CourseBuilder, DescriptionCard, DigitalFiles, IncludedItems, InformationForm, InstructorCard, MediaCard, ServiceDetails, ServicePreview } from './TypeForms';
import type { FormProps } from './TypeForms';
import { CheckoutPreview, CheckoutSettings, CurrencySettings, OfferSettings, PricingForm } from './PricingForms';
import { DiscountsAndCoupons, ProductAccessRules } from './PricingExtras';
import { showToast } from '../../utils/toast';
import './product-workspace.css';
import './type-workspace.css';
import './commerce-density.css';
import './pricing-workspace.css';
import './service-workspace.css';
import { ServiceSidebar } from './ServiceWorkspace';
import { DigitalWorkspace } from './DigitalWorkspace';
import './digital-workspace.css';
import { sampleCourseModules } from './course-curriculum-data';
import { CourseAnalytics, CourseMetrics, CourseOrders, CourseOverview, CourseViewHeader } from './CourseWorkspace';

const base = '/dashboard/products-payments';
const types = [
  { kind: 'course', icon: BookOpen, label: 'Course / Membership', description: 'Lessons, learning resources and community access' },
  { kind: 'digital', icon: FileText, label: 'Digital Product', description: 'Downloadable templates, files and digital assets' },
  { kind: 'service', icon: CalendarDays, label: 'Service', description: 'Consulting, coaching and bookable sessions' },
  { kind: 'subscription', icon: Repeat2, label: 'Subscription', description: 'Recurring membership and subscriber benefits' },
  { kind: 'bundle', icon: Layers3, label: 'Bundle', description: 'A curated collection of your existing products' },
] as const;
function createDraft(kind?: ProductKind) {
  const p = newProduct();
  if (kind) { p.type = kindLabels[kind]; p.config = defaultConfig(p.type); }
  if (kind === 'service') p.config!.duration = 30;
  if (kind === 'course') p.config!.modules = sampleCourseModules();
  return hydrateProduct(p);
}

export function ProductWorkspace({ mode, defaultTab }: { mode: 'create' | 'edit' | 'detail'; defaultTab?: WorkspaceTab }) {
  const products = useProducts(), { id } = useParams(), navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const existing = products.find(product => product.id === id), editing = mode !== 'detail';
  const requestedType = types.find(type => type.kind === params.get('type'))?.kind;
  const [chosen, setChosen] = React.useState(mode !== 'create' || !!requestedType);
  const [draft, setDraft] = React.useState<Product>(() => {
    if (!existing) return createDraft(requestedType);
    const initial = hydrateProduct(existing);
    const modules = initial.config!.modules;
    const legacyDemo = initial.id === 'ai-course' && modules.length === 1 && modules[0].title === 'Module 1: Introduction' && modules[0].lessons.length === 3 && modules[0].lessons.every((lesson, i) => typeof lesson !== 'string' && lesson.id === ['welcome', 'outcomes', 'tools'][i]);
    if (mode === 'edit' && productKind(initial.type) === 'course' && (!modules.length || legacyDemo)) initial.config!.modules = sampleCourseModules();
    return initial;
  });
  const [baseline, setBaseline] = React.useState(() => JSON.stringify(draft));
  const [errors, setErrors] = React.useState<string[]>([]), [preview, setPreview] = React.useState(false);
  const [checkoutPreview, setCheckoutPreview] = React.useState<Billing | null>(null), [menu, setMenu] = React.useState(false);
  const [pendingUploads, setPendingUploads] = React.useState(0), [pendingNavigation, setPendingNavigation] = React.useState('');
  const [courseMenu, setCourseMenu] = React.useState(false);
  const [saving, setSaving] = React.useState(false), [deleting, setDeleting] = React.useState(false);
  const p = editing ? draft : existing ? hydrateProduct(existing) : draft;
  const c = p.config ?? defaultConfig(p.type, p.price), e = c.experience ?? defaultExperience();
  const kind = productKind(p.type), view = workspaceViews[kind];
  const dirty = editing && (JSON.stringify(draft) !== baseline || pendingUploads > 0);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(React.useCallback(event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }, [dirty]));
  React.useEffect(() => { if (pendingNavigation && !dirty) navigate(pendingNavigation); }, [pendingNavigation, dirty, navigate]);
  const active = resolveTab(kind, defaultTab ?? params.get('tab') ?? params.get('section'));
  function update(patch: Partial<Product>) { setDraft(current => ({ ...current, ...patch })); }
  function configure(patch: Partial<CommerceConfig> | ((config: CommerceConfig) => Partial<CommerceConfig>)) { setDraft(current => ({ ...current, config: { ...current.config!, ...(typeof patch === 'function' ? patch(current.config!) : patch) } })); }
  function customize(patch: Partial<ProductExperience>) { setDraft(current => ({ ...current, config: { ...current.config!, experience: { ...current.config!.experience!, ...patch } } })); }
  function error(message: string) { setErrors([message]); showToast.error(message); }
  function selectType(nextKind: ProductKind, submit: boolean = true) {
    const type = kindLabels[nextKind];
    setDraft(current => ({ ...current, type, tag: type, config: { ...current.config!, modules: nextKind === 'course' && !current.config!.modules.length ? sampleCourseModules() : current.config!.modules, billing: nextKind === 'subscription' ? 'Subscription' : 'One-time', access: nextKind === 'subscription' ? 'While subscribed' : 'Lifetime access', experience: { ...current.config!.experience!, planEnabled: false, recurringEnabled: nextKind === 'subscription', recurringAmount: nextKind === 'subscription' ? current.config!.amount : current.config!.experience!.recurringAmount } } }));
    if (submit) {
      setChosen(true); setErrors([]);
      setParams({ type: nextKind, tab: 'information' });
    } else {
      setParams({ type: nextKind });
    }
  }
  function tab(next: WorkspaceTab) { setParams(current => { const nextParams = new URLSearchParams(current); nextParams.delete('section'); nextParams.set('tab', next); return nextParams; }); }
  function editTab(next: WorkspaceTab) {
    if (editing) tab(next);
    else navigate(`${base}/products/${p.id}/${next === 'pricing' ? 'pricing' : `edit?tab=${next}`}`);
  }
  function save(publish: boolean) {
    const candidate = { ...draft, status: publish ? 'Active' as const : mode === 'create' ? 'Draft' as const : draft.status };
    const validation = validateProduct(candidate, publish);
    if (validation.length) { setErrors(validation); return; }
    if (pendingUploads > 0) { error('Please wait for your uploads to finish.'); return; }
    setSaving(true);
    try {
      const saved = saveProduct(candidate);
      setBaseline(JSON.stringify(saved)); setDraft(saved); setErrors([]);
      setPendingNavigation(`${base}/products/${saved.id}`);
      showToast.success(publish ? `${view.title} published.` : 'Product saved.');
    } catch (cause) { error(cause instanceof Error ? cause.message : 'Could not save product.'); }
    finally { setSaving(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(c.salesUrl || `${window.location.origin}${base}/products/${p.id || `new?type=${kind}`}`); showToast.success('Product link copied.'); }
    catch { error('Could not copy the link. Please copy it from the address bar.'); }
  }
  function duplicate(version: boolean) {
    if (pendingUploads) { error('Please wait for your uploads to finish.'); return; }
    try { const saved = duplicateProduct(p, version); showToast.success(version ? 'New version created as a draft.' : 'Product duplicated as a draft.'); navigate(`${base}/products/${saved.id}/edit`); }
    catch (cause) { error(cause instanceof Error ? cause.message : 'Could not duplicate product.'); }
  }
  function salesPage() { if (/^https?:\/\//i.test(c.salesUrl)) window.open(c.salesUrl, '_blank', 'noopener,noreferrer'); else setPreview(true); }
  function book() { setPreview(false); if (/^https?:\/\//i.test(c.bookingUrl)) window.open(c.bookingUrl, '_blank', 'noopener,noreferrer'); else { tab('booking'); if (!editing) showToast.error('A booking calendar has not been connected yet.'); } }
  const props: FormProps = { product: { ...p, price: editing ? formatPrice(c) : p.price }, products, config: c, experience: e, editing, update, configure, customize, error, busy: value => setPendingUploads(count => Math.max(0, count + (value ? 1 : -1))) };
  if (mode !== 'create' && !existing) return <div className="cw-page cw-not-found"><Package size={40}/><h1>Product not found</h1><p>This product is unavailable in your catalog.</p><Link className="cw-button primary" to={base}><ArrowLeft size={16}/> Back to Products</Link></div>;
  const disabled = saving || pendingUploads > 0;
  // Legacy Course / Membership catalog entries are courses; standalone memberships keep their existing workspace.
  const courseLayout = chosen && kind === 'course' && existing?.type.toLowerCase() !== 'membership';
  const courseActions = { disabled, onEdit: editTab, onTab: tab, onPreview: () => setPreview(true), onSalesPage: salesPage, onDuplicate: duplicate, onDelete: () => setDeleting(true), onBooking: () => navigate('/dashboard/booking'), onStatus: (enabled: boolean) => {
    const candidate = { ...p, status: enabled ? 'Active' as const : 'Draft' as const };
    const validation = validateProduct(candidate, enabled);
    if (validation.length) { setErrors(validation); return; }
    if (editing) update({ status: candidate.status });
    else { try { const saved = saveProduct(candidate); setDraft(saved); setBaseline(JSON.stringify(saved)); setErrors([]); } catch (cause) { error(cause instanceof Error ? cause.message : 'Could not update course status.'); } }
  } };
  const navigationTabs: ReadonlyArray<readonly [WorkspaceTab, string, React.ElementType]> = courseLayout
    ? editing ? view.tabs.map(([target, label, icon]) => [target, target === 'information' ? 'Course Information' : label, icon] as const)
    : [['information', 'Overview', BookOpen], ['content', 'Content', FileText], ['pricing', 'Pricing & Offers', CreditCard], ['checkout', 'Checkout', ShoppingCart], ['funnel', 'Funnel & Pages', Layers3], ['automation', 'Automation', Sparkles], ['access', 'Students', Users], ['orders', 'Orders', ShoppingCart], ['analytics', 'Analytics', CreditCard], ['settings', 'Settings', Settings2]]
    : view.tabs;
  const digitalOverview = chosen && kind === 'digital' && active === 'information';
  const editAction = (target: WorkspaceTab) => !editing && <button className="cw-text-link" onClick={() => editTab(target)}>Edit <ArrowRight size={12}/></button>;
  const accessSummary = <Card title="Access & Delivery" action={editAction('access')}><div className="tw-sidebar-summary"><div><LockKeyhole size={14}/><span>Access Type</span><b>{c.access}</b></div><div><GlobeIcon/><span>Delivery Method</span><b>{e.accessRule}</b></div>{kind === 'course' && <div><Users size={14}/><span>Student Limit</span><b>{e.studentLimit || 'Unlimited'}</b></div>}{kind === 'digital' && <div><FileText size={14}/><span>Downloads</span><b>{c.downloadLimit} per customer</b></div>}</div></Card>;

  return <div className={`cw-page tw-page tw-${kind}${courseLayout ? ' course-page' : ''}${kind === 'service' && active === 'information' ? ' sw-content-page' : ''}${active === 'pricing' ? ' pricing-page' : ''}`}>
    {courseLayout && !editing && active === 'information' ? <CourseViewHeader {...props} {...courseActions}/> : <header className="cw-action-bar tw-action-bar"><div className="tw-product-heading"><Link className="cw-back" to={base}><ArrowLeft size={14}/> {kind === 'service' || kind === 'digital' ? 'Back' : 'Back to Products'}</Link>{p.image ? <img className="tw-heading-image" src={p.image} alt={p.name || view.title}/> : <div className="tw-heading-image tw-heading-placeholder"><Package size={24}/></div>}<div className="cw-heading"><div><h1>{mode === 'create' ? `Create ${chosen ? view.title : 'Product'}` : courseLayout && editing ? `Edit ${p.name}` : p.name}</h1>{courseLayout && !editing && <span className="course-type-badge">Online Course</span>}{!digitalOverview && <Status status={p.status}/>}</div><p>{!chosen ? 'Choose a product type to start your tailored commerce workflow.' : kind === 'course' ? !editing ? e.shortDescription || p.description : 'Build and sell your online course with lessons, resources and student access.' : kind === 'digital' ? 'Upload your digital files, set pricing and start selling.' : kind === 'service' ? 'Offer your services, connect booking and start getting clients.' : kind === 'subscription' ? 'Build recurring value for your members and subscribers.' : 'Bring your products together in one offer.'}</p></div></div><div className="cw-header-actions"><>{editing && chosen && <button disabled={disabled} className="cw-button" onClick={() => save(false)}><Save size={14}/>{mode === 'create' ? 'Save as Draft' : 'Save Changes'}</button>}<button className="cw-button" onClick={() => setPreview(true)}><Eye size={14}/> Preview</button>{!editing && <button className="cw-button" onClick={salesPage}><ExternalLink size={14}/> View Sales Page</button>}{editing && chosen ? <button disabled={disabled} className="cw-button primary" onClick={() => save(true)}>Publish {kind === 'course' ? 'Course' : kind === 'service' ? 'Service' : 'Product'}<ArrowRight size={14}/></button> : !editing && <div className="tw-edit-menu"><button className="cw-button primary" aria-expanded={menu} onClick={() => setMenu(!menu)}>Edit Product <ChevronDown size={14}/></button>{menu && <><button className="tw-menu-scrim" aria-label="Close edit menu" onClick={() => setMenu(false)}/><div className="tw-edit-options">{view.tabs.map(([target, label]) => <button key={target} onClick={() => editTab(target)}>{label === 'Overview' ? 'Product Information' : label}</button>)}</div></>}</div>}{courseLayout && !editing && <div className="tw-edit-menu"><button className="cw-icon-button" aria-label="More course actions" aria-expanded={courseMenu} onClick={() => setCourseMenu(!courseMenu)}>⋯</button>{courseMenu && <><button className="tw-menu-scrim" aria-label="Close course actions" onClick={() => setCourseMenu(false)}/><div className="tw-edit-options"><button onClick={() => { setCourseMenu(false); duplicate(false); }}>Duplicate Product</button><button onClick={() => { setCourseMenu(false); duplicate(true); }}>Create New Version</button><button onClick={() => { setCourseMenu(false); setDeleting(true); }}>Delete Product</button></div></>}</div>}</></div></header>}
    {!chosen ? <div className="cw-wizard-layout">
      <main className="cw-wizard-main">
        <div className="tw-section-heading cw-wizard-header">
          <h2>Create a New Product</h2>
          <p>Step 1 of 3: Select your product type and basic information.</p>
        </div>
        <div className="cw-type-options">
          {types.map(({ kind, icon: Icon, label, description }) => {
            const isSelected = params.get('type') === kind;
            return <button key={kind} className={isSelected ? 'selected' : ''} aria-pressed={isSelected} onClick={() => selectType(kind, false)}>
              {kind === 'course' && <span className="cw-wizard-badge popular">Most Popular</span>}
              {kind === 'digital' && <span className="cw-wizard-badge setup">Quickest Setup</span>}
              <span className="tw-type-icon"><Icon size={20}/></span>
              <b>{label}</b>
              <small>{description}</small>
            </button>;
          })}
        </div>
        {params.get('type') && <div className="cw-wizard-basics tw-stack">
          <div className="tw-section-heading">
            <h3>Basic Information</h3>
            <p>Set up the initial details for your {draft.type}. You can change these later.</p>
          </div>
          <Card title="Basic Information">
            <div className="cw-form-grid">
              <Field label="Product Title"><input autoFocus value={p.name} onChange={e => update({ name: e.target.value })} placeholder="e.g., AI Marketing Toolkit"/></Field>
              <Field label="Base Price (USD)"><input type="number" min="0" value={c.amount} onChange={e => configure({ amount: parseFloat(e.target.value) || 0 })}/></Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Short Description"><textarea value={e.shortDescription || p.description} onChange={ev => customize({ shortDescription: ev.target.value })} placeholder="Briefly describe what customers will get..."/></Field>
              </div>
            </div>
            <div className="cw-header-actions" style={{ marginTop: 24, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
              <button className="cw-button primary" onClick={() => selectType(params.get('type') as ProductKind, true)}>Continue with {draft.type} <ArrowRight size={14}/></button>
            </div>
          </Card>
        </div>}
      </main>
      <aside className="cw-wizard-sidebar tw-stack">
        <Card title="Which Product Type?">
          <div className="tw-sidebar-summary">
            <div><LockKeyhole size={14}/><span>Instant Download</span><b>Digital Product</b></div>
            <div><GlobeIcon/><span>Hosted Content</span><b>Online Course</b></div>
            <div><Repeat2 size={14}/><span>Recurring Access</span><b>Subscription</b></div>
          </div>
        </Card>
        <Card title="Pro Tip" subtitle="Complete the basics now to instantly unlock your tailored workspace, containing all the specific commerce and delivery tools you need.">{null}</Card>
      </aside>
    </div> : <>
      {mode === 'create' && kind !== 'service' && !digitalOverview && <div className="tw-create-type"><span>Creating a {view.title}</span><CommerceSelect label="Change product type" value={kind} onChange={value => selectType(value as ProductKind)} options={types.map(type => ({ value: type.kind, label: type.label }))}/></div>}
      {!editing && kind !== 'service' && !digitalOverview && !courseLayout && active === 'information' && <div className="tw-top-metrics">{[[Tag, p.price, 'Price'], [ShoppingCart, p.sales, 'Total Sales'], [CreditCard, p.revenue, 'Total Revenue'], [Users, kind === 'course' ? e.studentLimit ? String(e.studentLimit) : 'Unlimited' : kind === 'digital' ? String(c.assets.length) : String(c.components.length), kind === 'course' ? 'Student Capacity' : kind === 'digital' ? 'Digital Files' : 'Component Items']].map(([Icon, value, label], index) => { const MetricIcon = Icon as React.ElementType; return <div key={String(label)} className={`metric-${index}`}><span><MetricIcon size={19}/></span><div><b>{String(value)}</b><small>{String(label)}</small></div></div>; })}</div>}
      {courseLayout && !editing && active !== 'information' && <CourseMetrics {...props}/>}
      <nav className="cw-tabs tw-tabs" aria-label={`${view.title} navigation`}>{navigationTabs.map(([target, label, Icon]) => <button key={target} className={active === target ? 'active' : ''} aria-current={active === target ? 'page' : undefined} onClick={() => { if (defaultTab) navigate(`${base}/products/${p.id}/edit?tab=${target}`); else tab(target); }}><Icon size={14}/>{mode === 'create' && target === 'information' && kind === 'course' ? 'Course Information' : label}</button>)}</nav>
      {errors.length > 0 && <div className="cw-errors" role="alert"><b>Please review these fields</b><ul>{errors.map(message => <li key={message}>{message}</li>)}</ul></div>}
      {courseLayout && active === 'information' ? <CourseOverview {...props} {...courseActions}/> : courseLayout && active === 'orders' ? <CourseOrders/> : courseLayout && active === 'analytics' ? <CourseAnalytics {...props}/> : digitalOverview ? <div className="dw-page min-w-0 overflow-x-hidden"><DigitalWorkspace {...props} disabled={disabled} onStatus={enabled => { if (enabled) { const validation = validateProduct(draft, true); if (validation.length) { setErrors(validation); return; } } update({ status: enabled ? 'Active' : 'Draft' }); }} onSalesPage={salesPage} onCopy={() => { void copyLink(); }} onDuplicate={() => duplicate(false)} onDelete={() => setDeleting(true)} onFunnel={() => tab('funnel')} onAutomation={() => tab('automation')}/></div> : <div className={`tw-workspace${active === 'pricing' ? ' tw-pricing-workspace' : ''}`}><main className="tw-workspace-main">
        {active === 'information' && <>
          {kind === 'service' ? <><div className="tw-service-layout"><div className="tw-stack"><InformationForm {...props}/><MediaCard {...props}/><ServiceDetails {...props}/></div><ServicePreview {...props} onBook={book}/></div><DescriptionCard {...props}/></> : <>
            <div className="tw-information-layout"><div className="tw-stack"><InformationForm {...props}/>{!editing && <DescriptionCard {...props}/>}</div><div className="tw-stack"><MediaCard {...props}/>{kind === 'course' ? <InstructorCard {...props}/> : <ProductTags {...props}/>}<IncludedItems {...props}/></div></div>
            {kind === 'course' && <CourseBuilder {...props}/>}
            {kind === 'digital' && <div className="tw-equal-columns"><DigitalFiles {...props}/><AccessForm {...props}/></div>}
            {kind === 'bundle' && <BundleComponents {...props}/>}
            {kind === 'subscription' && <><IncludedItems {...props}/><SubscriberFulfillment {...props}/></>}
          </>}
        </>}
        {active === 'content' && (kind === 'course' ? <><CourseBuilder {...props}/><InstructorCard {...props}/>{courseLayout && <IncludedItems {...props}/>}</> : kind === 'digital' ? <><DigitalFiles {...props}/><IncludedItems {...props}/></> : <><IncludedItems {...props}/><SubscriberFulfillment {...props}/></>)}
        {active === 'booking' && <><ServiceDetails {...props}/><BookingForm {...props}/><div className="tw-service-preview-narrow"><ServicePreview {...props} onBook={book}/></div></>}
        {active === 'components' && <BundleComponents {...props}/>}
        {active === 'pricing' && <><div className="tw-pricing-layout"><div className="tw-stack"><div className="tw-section-heading"><h2>Pricing &amp; Offers</h2><p>Create pricing options, discounts, and special offers for your product.</p>{!editing && <button className="cw-button" onClick={() => editTab('pricing')}><Settings2 size={14}/> Edit pricing</button>}</div><PricingForm {...props}/></div><CheckoutPreview {...props} showOptionalOffers onCheckout={setCheckoutPreview}/></div><DiscountsAndCoupons {...props}/></>}
        {active === 'checkout' && <div className="tw-pricing-layout"><div className="tw-stack"><CheckoutSettings {...props}/><OfferSettings {...props}/></div><CheckoutPreview {...props} onCheckout={setCheckoutPreview}/></div>}
        {active === 'access' && <><AccessForm {...props}/>{kind === 'course' && <Card title="Access & Students" subtitle="Enrollment rules and student capacity"><div className="tw-student-stats"><Users size={24}/><div><b>{e.studentLimit || 'Unlimited'} students</b><small>{c.enrollment} enrollment · {c.access}</small></div></div></Card>}</>}
        {active === 'funnel' && <Card title="Funnel & Pages" subtitle="Connect the sales funnel and pages for this product."><Field label="Connected Funnel URL"><input type="url" disabled={!editing} value={e.funnelUrl} onChange={event => customize({ funnelUrl: event.target.value })} placeholder="https://"/></Field><Field label="Sales Page URL"><input type="url" disabled={!editing} value={c.salesUrl} onChange={event => configure({ salesUrl: event.target.value })} placeholder="https://"/></Field><div className="cw-header-actions"><button className="cw-button" onClick={salesPage}><Eye size={14}/>View Product Page</button><button className="cw-button" onClick={() => navigate('/dashboard/funnels')}><Layers3 size={14}/>Open Funnel Builder</button>{!editing && <button className="cw-button primary" onClick={() => editTab('funnel')}>Edit connections</button>}</div></Card>}
        {active === 'automation' && <AutomationForm {...props}/>}
        {active === 'settings' && <><ProductSettings {...props}/><CurrencySettings {...props}/></>}
      </main><aside className="tw-workspace-sidebar">
        {kind === 'service' && active !== 'pricing' ? <ServiceSidebar {...props} onTab={target => target === 'checkout' ? tab('checkout') : editTab(target)} onStatus={enabled => { if (enabled) { const validation = validateProduct(draft, true); if (validation.length) { setErrors(validation); return; } } update({ status: enabled ? 'Active' : 'Draft' }); }}/> : active === 'pricing' ? <><CurrencySettings {...props}/><CheckoutSettings {...props}/><OfferSettings {...props}/><ProductAccessRules {...props}/></> : <>
          <Card title={kind === 'course' ? 'Course Status' : 'Product Status'}><div className="cw-publish-status"><span>{editing ? 'Publishing status' : 'Status'}</span><Status status={p.status}/></div>{editing && <><Field label="Publishing status"><Select value={p.status} options={['Draft', 'Active']} onChange={status => { if (status === 'Active') { const validation = validateProduct(draft, true); if (validation.length) { setErrors(validation); return; } } update({ status: status as Product['status'] }); }}/></Field></>}{editing && <Field label="Visibility"><Select value={e.visibility} options={['Published', 'Private', 'Unlisted']} onChange={visibility => customize({ visibility: visibility as ProductExperience['visibility'] })}/></Field>}{!editing && <div className="tw-dates"><span>Created <b>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : 'Catalog product'}</b></span><span>Last updated <b>{e.updatedAt ? new Date(e.updatedAt).toLocaleDateString('en-GB') : '—'}</b></span></div>}{editing && <p className="cw-help">{p.status === 'Draft' ? 'Your product stays private until you publish.' : 'Save your changes to update this active product.'}</p>}</Card>
          {editing && kind !== 'service' && <ProductDetails {...props}/>}
          <Card title="Quick Actions"><div className="tw-quick-actions"><button onClick={salesPage}><Eye size={14}/><span>View Sales Page</span><ArrowRight size={12}/></button><button onClick={() => { void copyLink(); }}><Link2 size={14}/><span>Copy Link</span><Copy size={12}/></button><button disabled={disabled} onClick={() => duplicate(false)}><Copy size={14}/><span>Duplicate {kind === 'course' ? 'Course' : 'Product'}</span><ArrowRight size={12}/></button><button disabled={disabled} onClick={() => duplicate(true)}><GitBranch size={14}/><span>Create Version</span><ArrowRight size={12}/></button></div></Card>
          <Card title="Connected Tools"><div className="tw-connected-tools"><Tool icon={Layers3} title="Funnel" description={e.funnelUrl ? 'Sales funnel linked' : 'Connect a sales funnel'} connected={!!e.funnelUrl} onClick={() => /^https?:\/\//i.test(e.funnelUrl) ? window.open(e.funnelUrl, '_blank', 'noopener,noreferrer') : navigate('/dashboard/funnels')}/><Tool icon={CalendarDays} title="Booking" description={c.bookingUrl ? 'Calendar linked' : 'Booking calendar'} connected={!!c.bookingUrl} onClick={() => kind === 'service' ? editTab('booking') : navigate('/dashboard/booking')}/><Tool icon={Sparkles} title="Automation" description="Post-purchase workflows" connected={c.automations.confirmation || c.automations.grantAccess} onClick={() => tab('automation')}/></div></Card>
          {kind === 'service' ? <IncludedItems {...props}/> : accessSummary}
        </>}
      </aside></div>}
      {editing && !digitalOverview && kind !== 'service' && active !== 'pricing' && <footer className="cw-editor-footer"><span><i className={dirty ? 'dirty' : ''}/>{pendingUploads ? 'Uploading…' : dirty ? 'Unsaved changes' : 'All changes saved'}</span><div><button className="cw-button" onClick={() => setPreview(true)}><Eye size={14}/> Live Preview</button><button disabled={disabled} className="cw-button primary" onClick={() => save(false)}><Save size={14}/> Save Changes</button></div></footer>}
    </>}
    {deleting && <Dialog title="Delete product?" onClose={() => setDeleting(false)}><p>Delete {p.name} from your catalog? This action cannot be undone.</p><div className="cw-header-actions"><button className="cw-button" onClick={() => setDeleting(false)}>Cancel</button><button className="cw-button primary" disabled={disabled} onClick={() => { try { deleteProduct(p.id); setBaseline(JSON.stringify(draft)); setDeleting(false); setPendingNavigation(base); showToast.success('Product deleted.'); } catch (cause) { error(cause instanceof Error ? cause.message : 'Could not delete product.'); } }}>Delete Product</button></div></Dialog>}
    {preview && <Dialog title={`${view.title} Preview`} onClose={() => setPreview(false)} wide>{kind === 'service' ? <ServicePreview {...props} onBook={book}/> : <>{p.image && <img className="cw-preview-image" src={p.image} alt={p.name}/>}<h2>{p.name || `Your ${view.title}`}</h2><Description text={p.description}/><IncludedItems {...props} editing={false}/><div className="cw-preview-bottom"><b>{formatPrice(c)}</b><span className="cw-status draft">Preview only</span></div></>}</Dialog>}
    {checkoutPreview && <Dialog title="Checkout Preview" onClose={() => setCheckoutPreview(null)}><p>This previews the customer checkout for your configured offers.</p><div className="cw-review"><div><span>Product</span><b>{p.name || 'Untitled product'}</b></div><div><span>Price</span><b>{formatPrice({ ...c, billing: checkoutPreview, amount: checkoutPreview === 'One-time' ? e.oneTimeAmount : checkoutPreview === 'Payment plan' ? e.installmentAmount : e.recurringAmount })}</b></div><div><span>Access</span><b>{c.access} · {e.accessRule}</b></div><div><span>Tax</span><b>{c.taxRate}% · {e.taxHandling}</b></div></div><span className="cw-status draft">Preview only · No payment is collected</span></Dialog>}
    {blocker.state === 'blocked' && <Dialog title="Leave without saving?" onClose={() => blocker.reset()}><p>Your latest product changes have not been saved.</p><div className="cw-header-actions"><button className="cw-button" onClick={() => blocker.reset()}>Keep editing</button><button className="cw-button primary" disabled={pendingUploads > 0} onClick={() => blocker.proceed()}>Discard changes</button></div></Dialog>}
  </div>;
}
function GlobeIcon() { return <Package size={14}/>; }
function Tool({ icon: Icon, title, description, connected, onClick }: { icon: React.ElementType; title: string; description: string; connected: boolean; onClick: () => void }) { return <button onClick={onClick}><span><Icon size={17}/></span><div><b>{title}</b><small>{description}</small></div><em className={connected ? 'connected' : ''}>{connected ? 'Configured' : 'Connect'}</em><ArrowRight size={12}/></button>; }
function ProductTags({ experience: e, customize, editing }: FormProps) {
  return <Card title="Product Tags">{editing ? <Field label="Tags / Keywords" hint="Separate tags with commas."><input value={e.tags.join(', ')} onChange={event => customize({ tags: event.target.value.split(',').map(tag => tag.trim()) })} placeholder="Templates, Marketing, Design"/></Field> : <div className="tw-tags">{e.tags.filter(Boolean).map((tag, i) => <span key={i}>{tag}</span>)}{!e.tags.length && <small>No tags added</small>}</div>}</Card>;
}
function ProductDetails({ experience: e, customize, editing, product }: FormProps) { return <Card title={productKind(product.type) === 'course' ? 'Course Details' : 'Product Details'}><div className="cw-form-grid"><Field label="Category"><input disabled={!editing} value={e.category} placeholder="e.g. Marketing" onChange={event => customize({ category: event.target.value })}/></Field><Field label="Language"><Select disabled={!editing} value={e.language} options={['English', 'Arabic', 'French', 'German', 'Spanish']} onChange={language => customize({ language })}/></Field></div><Field label="Tags"><input value={e.tags.join(', ')} disabled={!editing} onChange={event => customize({ tags: event.target.value.split(',').map(tag => tag.trim()) })} placeholder="Separate tags with commas"/></Field><Field label="Version"><input value={e.version} readOnly/></Field></Card>; }
function AutomationForm({ config: c, configure, editing }: FormProps) { return <Card title="Post-purchase Automations" subtitle="Configure what happens after a successful purchase.">{([['grantAccess', 'Grant product access'], ['confirmation', 'Send purchase confirmation'], ['followUp', 'Start customer follow-up']] as const).map(([key, label]) => <Toggle key={key} label={label} checked={c.automations[key]} disabled={!editing} onChange={value => configure({ automations: { ...c.automations, [key]: value } })}/>)}<Field label="CRM tag after purchase"><input disabled={!editing} value={c.automations.crmTag} onChange={event => configure({ automations: { ...c.automations, crmTag: event.target.value } })} placeholder="e.g. course-student"/></Field><div className="cw-notice"><Sparkles size={17}/> Triggers run after a confirmed payment and follow your configured access rules.</div></Card>; }
function ProductSettings({ config: c, configure, experience: e, customize, editing, product: p }: FormProps) { return <Card title="Product Settings"><Field label="Sales Page URL"><input type="url" disabled={!editing} value={c.salesUrl} onChange={event => configure({ salesUrl: event.target.value })} placeholder="https://"/></Field><Field label="Connected Funnel URL"><input type="url" disabled={!editing} value={e.funnelUrl} onChange={event => customize({ funnelUrl: event.target.value })} placeholder="https://"/></Field><Field label="Visibility"><Select disabled={!editing} value={e.visibility} options={['Published', 'Private', 'Unlisted']} onChange={visibility => customize({ visibility: visibility as ProductExperience['visibility'] })}/></Field><div className="cw-review"><div><span>Product ID</span><b>{p.id || 'Assigned when saved'}</b></div><div><span>Publishing status</span><Status status={p.status}/></div></div></Card>; }
function SubscriberFulfillment({ config: c, configure, editing }: FormProps) { return <Card title="Member Benefits & Fulfillment"><Field label="Subscriber delivery instructions"><textarea disabled={!editing} value={c.fulfillment} onChange={event => configure({ fulfillment: event.target.value })} placeholder="Describe the resources, services and benefits delivered each billing period."/></Field><Field label="Member community URL"><input type="url" disabled={!editing} value={c.communityUrl} placeholder="https://" onChange={event => configure({ communityUrl: event.target.value })}/></Field></Card>; }
