import { CRMRouting } from '../CRMRouting';
import { TagManager } from './TagManager';
import { PageSelector } from './DynamicCheckoutControls';
import { ProductDeleteDialog } from './ProductDeleteDialog';
import { ProductAdvancedAction } from './ProductAdvancedAction';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useEntities } from '../../backend/workspace';
import { configureProduct, customizeProduct, withLiveProductData } from './workspaceLogic';
import { readWorkspacePreferences } from './workspacePreferences';
import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Link, useBeforeUnload, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, Copy, CreditCard, ExternalLink, Eye, FileText, GitBranch, Layers3, Link2, LockKeyhole, Package, Save, Send, Settings2, ShoppingCart, Sparkles, Tag, Users } from 'lucide-react';
import { defaultConfig, defaultExperience, formatPrice, hydrateProduct, kindLabels, newProduct, productKind, validateProduct } from './model';
import type { Billing, CommerceConfig, Product, ProductExperience, ProductKind } from './model';
import { duplicateProduct, saveProduct, storageKey, useProducts } from './repository';
import { workspaceViews, resolveTab } from './views';
import type { WorkspaceTab } from './views';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import { Card, Dialog, Field, Select, Status, Toggle } from './primitives';
import { AccessForm, BookingForm, BundleComponents, DescriptionCard, DigitalFiles, IncludedItems, InformationForm, InstructorCard, MediaCard, ServiceDetails, ServicePreview } from './TypeForms';
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
import { applyProductPreset, type ProductPreset } from './productPresets';
import { ProductPresetPicker } from './ProductPresetPicker';
import { CourseMetrics, CourseOverview, CourseViewHeader } from './CourseWorkspace';

import { useProductPreview } from './previewSnapshot';
import { withReviews } from './model';
import { useLiveReviews } from './reviewRepository';
import { RatingBadge } from './ProductReviews';
import { DigitalValidationContext, digitalIssue } from './DigitalValidation';
import { CheckoutScreen } from './CheckoutScreen';
import { FunnelConnections } from './FunnelConnections';
import { CourseStudentsPanel } from './CourseStudentsPanel';
import { CoursePerformance, ProductOrders, ProductRecentActivity } from './ProductInsights';
import { CourseCurriculum } from './CourseAuthoring';
import './product-preview.css';
import './commerce-enhancements.css';
import './product-header-layout.css';
import './course-records.css';

const base = '/dashboard/products-payments';
const types = [
  { kind: 'course', icon: BookOpen, label: 'Course', description: 'Lessons, learning resources and community access' },
  { kind: 'digital', icon: FileText, label: 'Digital Product', description: 'Downloadable templates, files and digital assets' },
  { kind: 'service', icon: CalendarDays, label: 'Service', description: 'Consulting, coaching and bookable sessions' },
] as const;
function createDraft(kind?: ProductKind) {
  const p = newProduct();
  if (kind) { p.type = kindLabels[kind]; p.config = defaultConfig(p.type); }
  if (kind === 'service') p.config!.duration = 30;
  const defaults = readWorkspacePreferences(storageKey());
  const config = p.config!;
  config.currency = defaults.currency as CommerceConfig['currency']; config.taxRate = defaults.taxRate;
  config.thankYouUrl = defaults.redirectUrl; config.automations.confirmation = defaults.receipts;
  config.experience = { ...config.experience!, taxHandling: defaults.inclusiveTax ? 'Include tax in price' : 'Calculate at checkout',
    paymentMethods: [...(defaults.stripe ? ['Visa', 'Mastercard'] as const : []), ...(defaults.paypal ? ['PayPal'] as const : []), ...(defaults.applePay ? ['Apple Pay'] as const : []), ...(defaults.googlePay ? ['Google Pay'] as const : [])],
    checkout: { ...config.experience!.checkout, guest: defaults.guestCheckout, collectInfo: defaults.collectName, requirePhone: defaults.requirePhone } };
  return hydrateProduct(p);
}

const PIPELINE_STEPS = [
  {
    id: 'setup',
    stepNumber: '01',
    title: 'Product Setup & Pricing',
    tagline: 'Multi-Tier Offer Creation',
    icon: Package,
    badge: 'Step 01',
    summary: 'Configure pricing models, localized currencies, file uploads or video modules in minutes.',
    metrics: [{ label: 'Supported Currencies', value: '135+' }, { label: 'Product Types', value: 'Course, Digital, Service' }],
    highlights: [
      'Instant SKU & payment route generation',
      'Flexible one-time or recurring billing models',
      'Custom customer delivery instructions & access limits'
    ]
  },
  {
    id: 'checkout',
    stepNumber: '02',
    title: 'Hosted 1-Click Checkout',
    tagline: 'Theme-Synced High Conversion',
    icon: CreditCard,
    badge: 'Step 02',
    summary: 'High-converting checkout pages with Dark Mode synchronization, Stripe, Apple Pay, and 1-click order bumps.',
    metrics: [{ label: 'Payment Gateways', value: 'Stripe, PayPal, Apple Pay' }, { label: 'Theme Mode', value: 'Light & Dark Synced' }],
    highlights: [
      'Automatic theme matching (Dark/Light mode)',
      '1-click frictionless mobile express pay',
      'Order bumps and automated tax calculations'
    ]
  },
  {
    id: 'delivery',
    stepNumber: '03',
    title: 'Automated Instant Delivery',
    tagline: 'Zero-Touch Fulfillment',
    icon: Send,
    badge: 'Step 03',
    summary: 'Deliver downloadable files, video lesson access, or calendar booking links immediately after payment confirmation.',
    metrics: [{ label: 'Delivery Latency', value: '< 2 Seconds' }, { label: 'Security', value: 'Signed Download URLs' }],
    highlights: [
      'Secure signed expiring download links',
      'Calendar booking sync with Google & Apple iCal',
      'Branded confirmation receipts and onboarding emails'
    ]
  },
  {
    id: 'crm',
    stepNumber: '04',
    title: 'CRM Lead & Lifetime Value',
    tagline: 'Automated Contact Tracking',
    icon: Users,
    badge: 'Step 04',
    summary: 'Every buyer and abandoned cart seamlessly updates your CRM pipeline with tags, transactions, and activity history.',
    metrics: [{ label: 'CRM Sync', value: '100% Real-time' }, { label: 'Retention', value: 'Automated Follow-up' }],
    highlights: [
      'Automatic lead creation and customer tagging',
      'Direct synchronization with Upclick AI Follow-Up',
      'Customer lifetime value (LTV) and revenue analytics'
    ]
  }
];

export function ProductWorkspace({ mode, defaultTab }: { mode: 'create' | 'edit' | 'detail'; defaultTab?: WorkspaceTab }) {
  const { id } = useParams();
  const scope = useSelector((state: RootState) => state.auth.tenant?.id || state.auth.user?.id || 'demo');
  return <ProductWorkspaceView key={`${scope}:${mode}:${id || 'new'}`} mode={mode} defaultTab={defaultTab}/>;
}
function ProductWorkspaceView({ mode, defaultTab }: { mode: 'create' | 'edit' | 'detail'; defaultTab?: WorkspaceTab }) {
  useUILanguage();
  const products = useProducts(), { id } = useParams(), navigate = useNavigate();
  const [activePipelineStep, setActivePipelineStep] = React.useState(0);
  const [params, setParams] = useSearchParams();
  const existing = products.find(product => product.id === id), editing = true;
  const liveReviews = useLiveReviews(storageKey().replace('gos-commerce-products-v1:', ''), existing?.id || '');
  const requestedType = types.find(type => type.kind === params.get('type'))?.kind;
  const [chosen, setChosen] = React.useState(mode !== 'create' || !!requestedType);
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Product>(() => {
    if (!existing) return createDraft(requestedType);
    const initial = hydrateProduct(existing);
    return initial;
  });
  const [baseline, setBaseline] = React.useState(() => JSON.stringify(draft));
  const [errors, setErrors] = React.useState<string[]>([]);
  const [validationAttempted, setValidationAttempted] = React.useState(false);
  const [errorTarget, setErrorTarget] = React.useState('');
  const [checkoutPreview, setCheckoutPreview] = React.useState<Billing | null>(null), [menu, setMenu] = React.useState(false);
  const [pendingUploads, setPendingUploads] = React.useState(0), [pendingNavigation, setPendingNavigation] = React.useState('');
  const [courseMenu, setCourseMenu] = React.useState(false);
  const [saving, setSaving] = React.useState(false), [deleting, setDeleting] = React.useState(false);
  const mutation = React.useRef(false);
  const orderRows = useEntities<Record<string, any>>('orders'), transactionRows = useEntities<Record<string, any>>('transactions'), eventRows = useEntities<Record<string, any>>('events'), calendarRows = useEntities<Record<string, any>>('calendars');
  React.useEffect(() => {
    if (mode === 'create' || !existing) return;
    setDraft(current => {
      if (JSON.stringify(current) !== baseline) return current;
      const next = hydrateProduct(existing), serialized = JSON.stringify(next);
      if (serialized === baseline) return current;
      setBaseline(serialized); return next;
    });
  }, [existing, mode, baseline]);
  const p = withReviews(editing ? draft : existing ? hydrateProduct(existing) : draft, liveReviews || existing || draft);
  const c = p.config ?? defaultConfig(p.type, p.price), e = c.experience ?? defaultExperience();
  const kind = productKind(p.type), view = workspaceViews[kind];
  const viewConfig = withLiveProductData(p, orderRows, transactionRows, eventRows, calendarRows);
  const dirty = editing && (JSON.stringify(draft) !== baseline || pendingUploads > 0);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(React.useCallback(event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }, [dirty]));
  React.useEffect(() => { if (pendingNavigation && !dirty) navigate(pendingNavigation); }, [pendingNavigation, dirty, navigate]);
  const active = resolveTab(kind, params.get('tab') ?? defaultTab ?? params.get('section'));
  React.useEffect(() => { if (validationAttempted) setErrors(validateProduct(draft, true)); }, [draft, validationAttempted]);
  React.useEffect(() => {
    if (!errorTarget) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const target = document.querySelector<HTMLElement>(`[data-validation-field="${errorTarget}"]`) || document.querySelector<HTMLElement>('.cw-errors');
        if (target) {
          target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
          target.querySelector<HTMLElement>('input:not([type=hidden]):not([type=file]),textarea,[contenteditable=true],button')?.focus({ preventScroll: true });
        }
        setErrorTarget('');
      });
    }, 60);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [errorTarget, active]);
  function focusError(message: string) { const issue = digitalIssue(message, kind); tab(issue.tab); setErrorTarget(issue.field); }
  function invalid(messages: string[]) { setErrors(messages); setValidationAttempted(true); focusError(messages[0]); }
  function update(patch: Partial<Product>) { setDraft(current => ({ ...current, ...patch })); }
  function configure(patch: Partial<CommerceConfig> | ((config: CommerceConfig) => Partial<CommerceConfig>)) { setDraft(current => configureProduct(current, typeof patch === 'function' ? patch(current.config!) : patch)); }
  function customize(patch: Partial<ProductExperience>) { setDraft(current => customizeProduct(current, patch)); }
  function error(message: string) { setErrors([message]); showToast.error(message); }
  function selectType(nextKind: ProductKind, submit: boolean = true) {
    if (!types.some(type => type.kind === nextKind)) return;
    const type = kindLabels[nextKind];
    setDraft(current => ({ ...current, type, tag: type, config: { ...current.config!, billing: nextKind === 'subscription' ? 'Subscription' : 'One-time', access: nextKind === 'subscription' ? 'While subscribed' : 'Lifetime access', experience: { ...current.config!.experience!, planEnabled: false, recurringEnabled: nextKind === 'subscription', recurringAmount: nextKind === 'subscription' ? current.config!.amount : current.config!.experience!.recurringAmount } } }));
    if (submit) {
      setChosen(true); setErrors([]);
      setParams({ type: nextKind, tab: 'information' });
    } else {
      setParams({ type: nextKind });
    }
  }
  function applyPresetTemplate(template: ProductPreset) {
    setDraft(current => applyProductPreset(current, template));
    setChosen(true); setErrors([]); setTemplateOpen(false);
    setParams({ type: template.kind, tab: 'information' });
    showToast.success(translateText('Template loaded. Save Changes to keep your edits.'));
  }
  function tab(next: WorkspaceTab) { setParams(current => { const nextParams = new URLSearchParams(current); nextParams.delete('section'); nextParams.set('tab', next); return nextParams; }); }
  function editTab(next: WorkspaceTab) {
    if (editing) tab(next);
    else navigate(`${base}/products/${p.id}/${next === 'pricing' ? 'pricing' : `edit?tab=${next}`}`);
  }
  async function save(publish: boolean) {
    if (mutation.current) return;
    const candidate = { ...draft, status: publish ? 'Active' as const : mode === 'create' ? 'Draft' as const : draft.status };
    const validation = validateProduct(candidate, publish);
    if (validation.length) { invalid(validation); return; }
    if (pendingUploads > 0) { error('Please wait for your uploads to finish.'); return; }
    mutation.current = true; setSaving(true);
    try {
      const saved = await saveProduct(candidate, JSON.parse(baseline) as Product);
      setBaseline(JSON.stringify(saved)); setDraft(saved); setErrors([]);
      setPendingNavigation(`${base}/products/${saved.id}/edit?tab=${active}`);
      showToast.success(publish ? `${view.title} published.` : 'Product saved.');
    } catch (cause) { error(cause instanceof Error ? cause.message : 'Could not save product.'); }
    finally { mutation.current = false; setSaving(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(c.salesUrl || `${window.location.origin}${base}/products/${p.id || `new?type=${kind}`}`); showToast.success('Product link copied.'); }
    catch { error('Could not copy the link. Please copy it from the address bar.'); }
  }
  async function duplicate(version: boolean) {
    if (mutation.current) return;
    if (pendingUploads) { error('Please wait for your uploads to finish.'); return; }
    mutation.current = true; setSaving(true);
    try { const saved = await duplicateProduct(p, version); showToast.success(version ? 'New version created as a draft.' : 'Product duplicated as a draft.'); navigate(`${base}/products/${saved.id}/edit`); }
    catch (cause) { error(cause instanceof Error ? cause.message : 'Could not duplicate product.'); }
    finally { mutation.current = false; setSaving(false); }
  }
  function salesPage() { if (c.salesTemplate === 'external' && /^https?:\/\//i.test(c.salesUrl)) window.open(c.salesUrl, '_blank', 'noopener,noreferrer'); else if (productPreview.prepare()) window.open(productPreview.href, '_blank', 'noopener,noreferrer'); }
  function book() { if (/^https?:\/\//i.test(c.bookingUrl)) window.open(c.bookingUrl, '_blank', 'noopener,noreferrer'); else { tab('booking'); if (!editing) showToast.error('A booking calendar has not been connected yet.'); } }
  const props: FormProps = { product: { ...p, price: editing ? formatPrice(c) : p.price, config: viewConfig, sales: String(viewConfig.orders?.filter(order => order.status === 'Paid').length || 0), revenue: new Intl.NumberFormat(undefined, { style: 'currency', currency: c.currency }).format(viewConfig.orders?.filter(order => order.status === 'Paid' && order.currency === c.currency).reduce((sum, order) => sum + order.amount, 0) || 0) }, products, config: viewConfig, experience: { ...e, activeStudents: viewConfig.students?.filter(student => student.status === 'Active').length || 0 }, editing, update, configure, customize, error, busy: value => setPendingUploads(count => Math.max(0, count + (value ? 1 : -1))) };
  const productPreview = useProductPreview(p, error);
  if (mode !== 'create' && !existing) return <div className="cw-page cw-not-found"><Package size={40}/><h1>{translateText("Product not found")}</h1><p>{translateText("This product is unavailable in your catalog.")}</p><Link className="cw-button primary" to={base}><ArrowLeft size={16}/>{translateText(" Back to Products")}</Link></div>;
  const disabled = saving || pendingUploads > 0;
  // Legacy Course / Membership catalog entries are courses; standalone memberships keep their existing workspace.
  const courseLayout = chosen && kind === 'course' && existing?.type.toLowerCase() !== 'membership';
  const courseActions = { disabled, onEdit: editTab, onTab: tab, onPreview: () => { if (productPreview.prepare()) window.open(productPreview.href, '_blank', 'noopener,noreferrer'); }, onSalesPage: salesPage, onDuplicate: duplicate, onDelete: () => setDeleting(true), onBooking: () => navigate('/dashboard/booking'), onStatus: async (enabled: boolean) => {
    const candidate = { ...p, status: enabled ? 'Active' as const : 'Draft' as const };
    const validation = validateProduct(candidate, enabled);
    if (validation.length) { invalid(validation); return; }
    if (editing) update({ status: candidate.status });
    else { try { const saved = await saveProduct(candidate, JSON.parse(baseline) as Product); setDraft(saved); setBaseline(JSON.stringify(saved)); setErrors([]); } catch (cause) { error(cause instanceof Error ? cause.message : 'Could not update course status.'); } }
  } };
  const navigationTabs: ReadonlyArray<readonly [WorkspaceTab, string, React.ElementType]> = view.tabs;
  const digitalOverview = chosen && kind === 'digital' && active === 'information';
  const editAction = (target: WorkspaceTab) => !editing && <button className="cw-text-link" onClick={() => editTab(target)}>{translateText("Edit ")}<ArrowRight size={12}/></button>;
  const accessSummary = <Card title={translateText("Access & Delivery")} action={editAction('access')}><div className="tw-sidebar-summary"><div><LockKeyhole size={14}/><span>{translateText("Access Type")}</span><b>{localizeNode(c.access)}</b></div><div><GlobeIcon/><span>{translateText("Delivery Method")}</span><b>{localizeNode(e.accessRule)}</b></div>{localizeNode(kind === 'course' && <div><Users size={14}/><span>{translateText("Student Limit")}</span><b>{localizeNode(e.studentLimit || 'Unlimited')}</b></div>)}{localizeNode(kind === 'digital' && <div><FileText size={14}/><span>{translateText("Downloads")}</span><b>{localizeNode(c.downloadLimit)}{translateText(" per customer")}</b></div>)}</div></Card>;

  return <DigitalValidationContext.Provider value={validationAttempted ? validateProduct(draft, true) : []}><div inert={saving} aria-busy={saving} className={`cw-page tw-page tw-${kind}${courseLayout ? ' course-page' : ''}${courseLayout && ['orders', 'access'].includes(active) ? ' course-records-page' : ''}${kind === 'service' && active === 'information' ? ' sw-content-page' : ''}${active === 'pricing' ? ' pricing-page' : ''}`}>
    {mode === 'create' && templateOpen && <Dialog title="Choose a Product Template" wide onClose={() => setTemplateOpen(false)}><p>{translateText('Choose a starting point for this draft. Add your own files and booking links, then use Save Changes to persist it.')}</p><ProductPresetPicker kind={kind} currency={c.currency} onSelect={applyPresetTemplate}/></Dialog>}
    {localizeNode(courseLayout && !editing && active === 'information' ? <CourseViewHeader {...props} {...courseActions}/> : <header className="cw-action-bar tw-action-bar product-title-bar flex items-center justify-between gap-4 overflow-hidden"><div className="tw-product-heading flex-1 min-w-0"><Link className="cw-back" to={base}><ArrowLeft size={14}/> {localizeNode(kind === 'service' || kind === 'digital' ? 'Back' : 'Back to Products')}</Link>{localizeNode(p.image ? <img className="tw-heading-image" src={p.image} alt={translateText(p.name || view.title)}/> : <div className="tw-heading-image tw-heading-placeholder"><Package size={24}/></div>)}<div className="cw-heading flex-1 min-w-0"><div><h1 className="min-w-0 flex-1 truncate" title={translateText(p.name || view.title)}>{localizeNode(mode === 'create' ? `Create ${chosen ? view.title : 'Product'}` : courseLayout && editing ? `Edit ${p.name}` : p.name)}</h1>{localizeNode(courseLayout && !editing && <span className="course-type-badge">{translateText("Online Course")}</span>)}{localizeNode(!digitalOverview && <Status status={p.status}/>)}</div><p>{localizeNode(!chosen ? 'Choose a product type to start your tailored commerce workflow.' : kind === 'course' ? !editing ? e.shortDescription || p.description : 'Build and sell your online course with lessons, resources and student access.' : kind === 'digital' ? 'Upload your digital files, set pricing and start selling.' : kind === 'service' ? 'Offer your services, connect booking and start getting clients.' : kind === 'subscription' ? 'Build recurring value for your members and subscribers.' : 'Bring your products together in one offer.')}</p><RatingBadge product={p}/></div></div><div className="cw-header-actions"><>{mode !== 'create' && editing && <button className="cw-button product-delete-trigger" disabled={disabled} onClick={() => setDeleting(true)}>{translateText("Delete Product")}</button>}{mode === 'create' && chosen && <button type="button" className="cw-button" disabled={disabled} onClick={() => setTemplateOpen(true)}><Sparkles size={14}/>{translateText("Use Template")}</button>}{localizeNode(editing && chosen && <button disabled={disabled} className="cw-button" onClick={() => save(false)}><Save size={14}/>{localizeNode(mode === 'create' ? 'Save as Draft' : 'Save Changes')}</button>)}<a className="cw-button primary" href={productPreview.href} target="_blank" rel="noopener noreferrer" onClick={productPreview.prepare}><Eye size={14}/>{translateText("Preview Product")}</a>{localizeNode(!editing && <button className="cw-button" onClick={salesPage}><ExternalLink size={14}/>{translateText(" View Sales Page")}</button>)}{localizeNode(editing && chosen ? <button disabled={disabled} className="cw-button primary" onClick={() => save(true)}>{translateText("Publish ")}{localizeNode(kind === 'course' ? 'Course' : kind === 'service' ? 'Service' : 'Product')}<ArrowRight size={14}/></button> : !editing && <div className="tw-edit-menu"><button className="cw-button primary" aria-expanded={menu} onClick={() => setMenu(!menu)}>{translateText("Edit Product ")}<ChevronDown size={14}/></button>{localizeNode(menu && <><button className="tw-menu-scrim" aria-label={translateText("Close edit menu")} onClick={() => setMenu(false)}/><div className="tw-edit-options">{localizeNode(view.tabs.map(([target, label]) => <button key={target} onClick={() => editTab(target)}>{localizeNode(label === 'Overview' ? 'Product Information' : label)}</button>))}</div></>)}</div>)}{localizeNode(courseLayout && !editing && <div className="tw-edit-menu"><button className="cw-icon-button" aria-label={translateText("More course actions")} aria-expanded={courseMenu} onClick={() => setCourseMenu(!courseMenu)}>⋯</button>{localizeNode(courseMenu && <><button className="tw-menu-scrim" aria-label={translateText("Close course actions")} onClick={() => setCourseMenu(false)}/><div className="tw-edit-options"><button onClick={() => { setCourseMenu(false); duplicate(false); }}>{translateText("Duplicate Product")}</button><button onClick={() => { setCourseMenu(false); duplicate(true); }}>{translateText("Create New Version")}</button><button onClick={() => { setCourseMenu(false); setDeleting(true); }}>{translateText("Delete Product")}</button></div></>)}</div>)}</></div></header>)}
    {(c.assets.some(asset => asset.storageId?.startsWith('local-')) || c.modules.some(module => module.lessons.some(lesson => typeof lesson !== 'string' && lesson.storageId?.startsWith('local-')))) && <p className="cw-notice" role="status">{translateText('Local attachments are available only in this browser session. Upload them to cloud storage or add delivery URLs before publishing.')}</p>}
    {localizeNode(!chosen ? <div className="cw-wizard-layout">
      <main className="cw-wizard-main">
        <div className="tw-section-heading cw-wizard-header">
          <h2>{translateText("Create a New Product")}</h2>
          <p>{translateText("Step 1 of 3: Select your product type and basic information.")}</p>
        </div>
        <div className="cw-type-options">
          {localizeNode(types.map(({ kind, icon: Icon, label, description }) => {
            const isSelected = params.get('type') === kind;
            return <button key={kind} className={isSelected ? 'selected' : ''} aria-pressed={isSelected} onClick={() => selectType(kind, false)}>
              {localizeNode(kind === 'course' && <span className="cw-wizard-badge popular">{translateText("Most Popular")}</span>)}
              {localizeNode(kind === 'digital' && <span className="cw-wizard-badge setup">{translateText("Quickest Setup")}</span>)}
              <span className="tw-type-icon"><Icon size={20}/></span>
              <b>{localizeNode(label)}</b>
              <small>{localizeNode(description)}</small>
            </button>;
          }))}
        </div>
        {localizeNode(requestedType && <div className="cw-wizard-basics tw-stack">
          <div className="tw-section-heading">
            <h3>{translateText("Basic Information")}</h3>
            <p>{translateText("Set up the initial details for your ")}{localizeNode(draft.type)}{translateText(". You can change these later.")}</p>
          </div>
          <Card title={translateText("Basic Information")}>
            <div className="cw-form-grid">
              <Field label="Product Title *"><input autoFocus value={p.name} onChange={e => update({ name: e.target.value })} placeholder={translateText("e.g., AI Marketing Toolkit")}/></Field>
              <Field label="Base Price *"><input type="number" min="0" value={!p.id && c.amount === 0 ? '' : c.amount} onChange={e => configure({ amount: parseFloat(e.target.value) || 0 })}/></Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Short Description"><textarea value={e.shortDescription || p.description} onChange={ev => customize({ shortDescription: ev.target.value })} placeholder={translateText("Briefly describe what customers will get...")}/></Field>
              </div>
            </div>
            <div className="cw-header-actions" style={{ marginTop: 24, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
              <button className="cw-button primary" onClick={() => selectType(requestedType!, true)}>{translateText("Continue with ")}{localizeNode(draft.type)} <ArrowRight size={14}/></button>
            </div>
          </Card>
        </div>)}

        <div className="cw-preset-section">
          <div className="tw-section-heading">
            <h3>{translateText("Quick-Start Preset Templates")}</h3>
            <p>{translateText("Pick a ready-made template to pre-configure pricing, delivery structure, and sales settings instantly.")}</p>
          </div>
          <ProductPresetPicker currency={c.currency} onSelect={applyPresetTemplate}/>
        </div>

        <div className="cw-pipeline-section">
          <div className="tw-section-heading">
            <h3>{translateText("Automated Sales & Delivery Pipeline")}</h3>
            <p>{translateText("Every product you create connects out of the box with checkout, delivery, and CRM lead capture.")}</p>
          </div>
          <div className="cw-pipeline-card">
            <div className="cw-pipeline-track">
              {localizeNode(PIPELINE_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activePipelineStep === idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`cw-pipeline-step-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActivePipelineStep(idx)}
                  >
                    <div className="cw-pipeline-step-head">
                      <span className="cw-pipeline-step-icon"><Icon size={14} /></span>
                      <span className="cw-pipeline-step-num">{step.stepNumber}</span>
                    </div>
                    <div className="cw-pipeline-step-title">{translateText(step.title)}</div>
                    <div className="cw-pipeline-step-tagline">{translateText(step.tagline)}</div>
                  </button>
                );
              }))}
            </div>

            {localizeNode(
              <div className="cw-pipeline-detail">
                <div className="cw-pipeline-detail-info">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 px-2 py-0.5 rounded">
                      {translateText(PIPELINE_STEPS[activePipelineStep].badge)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {translateText(`Stage 0${activePipelineStep + 1} of 04`)}
                    </span>
                  </div>
                  <h4>{translateText(PIPELINE_STEPS[activePipelineStep].title)}</h4>
                  <p>{translateText(PIPELINE_STEPS[activePipelineStep].summary)}</p>
                  <ul className="cw-pipeline-checklist">
                    {PIPELINE_STEPS[activePipelineStep].highlights.map(hl => (
                      <li key={hl}>
                        <Check size={14} />
                        <span>{translateText(hl)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="cw-pipeline-metrics">
                  {PIPELINE_STEPS[activePipelineStep].metrics.map(m => (
                    <div key={m.label} className="cw-pipeline-metric-box">
                      <span>{translateText(m.label)}</span>
                      <b>{localizeNode(m.value)}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <aside className="cw-wizard-sidebar tw-stack">
        <Card title={translateText("Which Product Type?")}>
          <div className="tw-sidebar-summary">
            <div><LockKeyhole size={14}/><span>{translateText("Instant Download")}</span><b>{translateText("Digital Product")}</b></div>
            <div><GlobeIcon/><span>{translateText("Hosted Content")}</span><b>{translateText("Online Course")}</b></div>
            <div><CalendarDays size={14}/><span>{translateText("Expert Guidance")}</span><b>{translateText("Service")}</b></div>
          </div>
        </Card>
        <Card title={translateText("Pro Tip")} subtitle="Complete the basics now to instantly unlock your tailored workspace, containing all the specific commerce and delivery tools you need.">{localizeNode(null)}</Card>
      </aside>
    </div> : <>
      {localizeNode(mode === 'create' && kind !== 'service' && !digitalOverview && <div className="tw-create-type"><span>{translateText("Creating a ")}{localizeNode(view.title)}</span><CommerceSelect label="Change product type" value={kind} onChange={value => selectType(value as ProductKind)} options={types.map(type => ({ value: type.kind, label: type.label }))}/></div>)}
      {localizeNode(!editing && kind !== 'service' && !digitalOverview && !courseLayout && active === 'information' && <div className="tw-top-metrics">{localizeNode([[Tag, p.price, 'Price'], [ShoppingCart, p.sales, 'Total Sales'], [CreditCard, p.revenue, 'Total Revenue'], [Users, kind === 'course' ? e.studentLimit ? String(e.studentLimit) : 'Unlimited' : kind === 'digital' ? String(c.assets.length) : String(c.components.length), kind === 'course' ? 'Student Capacity' : kind === 'digital' ? 'Digital Files' : 'Component Items']].map(([Icon, value, label], index) => { const MetricIcon = Icon as React.ElementType; return <div key={String(label)} className={`metric-${index}`}><span><MetricIcon size={19}/></span><div><b>{localizeNode(String(value))}</b><small>{localizeNode(String(label))}</small></div></div>; }))}</div>)}
      {localizeNode(courseLayout && !editing && active !== 'information' && <CourseMetrics {...props}/>)}
      <nav className="cw-tabs tw-tabs" aria-label={translateText(`${view.title} navigation`)}>{localizeNode(navigationTabs.map(([target, label, Icon]) => <button key={target} className={active === target ? 'active' : ''} aria-current={active === target ? 'page' : undefined} onClick={() => tab(target)}><Icon size={14}/>{localizeNode(label)}</button>))}</nav>
      {localizeNode(errors.length > 0 && <div className="cw-errors" role="alert"><b>{translateText("Please review these fields")}</b><ul className="dv-error-links">{localizeNode(errors.map(message => <li key={message}><button type="button" onClick={() => focusError(message)}>{localizeNode(message)}</button></li>))}</ul></div>)}
      {localizeNode(courseLayout && active === 'information' ? <CourseOverview {...props} {...courseActions}/> : courseLayout && active === 'orders' ? <ProductOrders config={viewConfig} course/> : courseLayout && active === 'access' ? <CourseStudentsPanel {...props}/> : courseLayout && active === 'analytics' ? <CoursePerformance config={viewConfig}/> : digitalOverview ? <div className="dw-page min-w-0 overflow-x-hidden"><DigitalWorkspace {...props} disabled={disabled} onStatus={enabled => { if (enabled) { const validation = validateProduct(draft, true); if (validation.length) { invalid(validation); return; } } update({ status: enabled ? 'Active' : 'Draft' }); }} onSalesPage={salesPage} onCopy={() => { void copyLink(); }} onDuplicate={() => duplicate(false)} onDelete={() => setDeleting(true)} onFunnel={() => tab('funnel')} onAutomation={() => tab('automation')}/></div> : <div className={`tw-workspace${active === 'pricing' ? ' tw-pricing-workspace' : ''}`}><main className="tw-workspace-main">
        {localizeNode(active === 'information' && <>
          {localizeNode(kind === 'service' ? <><div className="tw-service-layout"><div className="tw-stack"><InformationForm {...props}/><MediaCard {...props}/><ServiceDetails {...props}/><BookingForm {...props}/></div><ServicePreview {...props} onBook={book}/></div><DescriptionCard {...props}/></> : <>
            <div className="tw-information-layout"><div className="tw-stack"><InformationForm {...props}/>{localizeNode(!editing && <DescriptionCard {...props}/>)}</div><div className="tw-stack"><MediaCard {...props}/>{localizeNode(kind === 'course' ? <InstructorCard {...props}/> : <ProductTags {...props}/>)}<IncludedItems {...props}/></div></div>
            {localizeNode(kind === 'course' && <CourseCurriculum {...props}/>)}
            {localizeNode(kind === 'digital' && <div className="tw-equal-columns"><DigitalFiles {...props}/><AccessForm {...props}/></div>)}
            {localizeNode(kind === 'bundle' && <BundleComponents {...props}/>)}
            {localizeNode(kind === 'subscription' && <><IncludedItems {...props}/><SubscriberFulfillment {...props}/></>)}
          </>)}
        </>)}
        {localizeNode(active === 'content' && (kind === 'course' ? <><CourseCurriculum {...props}/><InstructorCard {...props}/>{localizeNode(courseLayout && <IncludedItems {...props}/>)}</> : kind === 'digital' ? <><DigitalFiles {...props}/><IncludedItems {...props}/></> : <><IncludedItems {...props}/><SubscriberFulfillment {...props}/></>))}
        {localizeNode(active === 'booking' && <div className="tw-service-layout"><div className="tw-stack"><ServiceDetails {...props}/><BookingForm {...props}/></div><ServicePreview {...props} onBook={book}/></div>)}
        {localizeNode(active === 'components' && <BundleComponents {...props}/>)}
        {localizeNode(active === 'pricing' && <><div className="tw-pricing-layout"><div className="tw-stack"><div className="tw-section-heading"><h2>{translateText("Pricing & Offers")}</h2><p>{translateText("Create pricing options, discounts, and special offers for your product.")}</p>{localizeNode(!editing && <button className="cw-button" onClick={() => editTab('pricing')}><Settings2 size={14}/>{translateText(" Edit pricing")}</button>)}</div><PricingForm {...props}/></div><CheckoutPreview {...props} onCheckout={setCheckoutPreview}/></div><DiscountsAndCoupons {...props}/></>)}
        {localizeNode(active === 'checkout' && <><div className="tw-pricing-layout"><div className="tw-stack"><CheckoutSettings {...props}/><OfferSettings {...props}/></div><CheckoutPreview {...props} onCheckout={setCheckoutPreview}/></div><CheckoutScreen product={p}/></>)}
        {localizeNode(active === 'access' && <AccessForm {...props}/>)}
        {localizeNode(active === 'funnel' && <FunnelConnections {...props}/>)}
        {localizeNode(active === 'automation' && <AutomationForm {...props}/>)}
        {localizeNode(active === 'settings' && <><ProductSettings {...props}/><CurrencySettings {...props}/></>)}
      </main><aside className="tw-workspace-sidebar">
        {localizeNode(kind === 'service' && active !== 'pricing' ? <ServiceSidebar {...props} onTab={target => target === 'checkout' ? tab('checkout') : editTab(target)} onStatus={enabled => { if (enabled) { const validation = validateProduct(draft, true); if (validation.length) { invalid(validation); return; } } update({ status: enabled ? 'Active' : 'Draft' }); }}/> : active === 'pricing' ? <><CurrencySettings {...props}/><CheckoutSettings {...props}/><OfferSettings {...props}/><ProductAccessRules {...props}/></> : <>
          <Card title={translateText(kind === 'course' ? 'Course Status' : 'Product Status')}><div className="cw-publish-status"><span>{localizeNode(editing ? 'Publishing status' : 'Status')}</span><Status status={p.status}/></div>{localizeNode(editing && <><Field label="Publishing status"><Select value={p.status} options={['Draft', 'Active']} onChange={status => { if (status === 'Active') { const validation = validateProduct(draft, true); if (validation.length) { invalid(validation); return; } } update({ status: status as Product['status'] }); }}/></Field></>)}{localizeNode(editing && <Field label="Visibility"><Select value={e.visibility} options={['Published', 'Private', 'Unlisted']} onChange={visibility => customize({ visibility: visibility as ProductExperience['visibility'] })}/></Field>)}{localizeNode(!editing && <div className="tw-dates"><span>{translateText("Created ")}<b>{localizeNode(p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : 'Catalog product')}</b></span><span>{translateText("Last updated ")}<b>{localizeNode(e.updatedAt ? new Date(e.updatedAt).toLocaleDateString('en-GB') : '—')}</b></span></div>)}{localizeNode(editing && <p className="cw-help">{localizeNode(p.status === 'Draft' ? 'Your product stays private until you publish.' : 'Save your changes to update this active product.')}</p>)}</Card>
          {localizeNode(editing && kind !== 'service' && <ProductDetails {...props}/>)}
          <Card title={translateText("Quick Actions")}><div className="tw-quick-actions"><button onClick={salesPage}><Eye size={14}/><span>{translateText("View Sales Page")}</span><ArrowRight size={12}/></button><button onClick={() => { void copyLink(); }}><Link2 size={14}/><span>{translateText("Copy Link")}</span><Copy size={12}/></button><button disabled={disabled} onClick={() => duplicate(false)}><Copy size={14}/><span>{translateText("Duplicate ")}{localizeNode(kind === 'course' ? 'Course' : 'Product')}</span><ArrowRight size={12}/></button><button disabled={disabled} onClick={() => duplicate(true)}><GitBranch size={14}/><span>{translateText("Create Version")}</span><ArrowRight size={12}/></button></div></Card>
          <Card title={translateText("Connected Tools")}><div className="tw-connected-tools"><Tool icon={Layers3} title={translateText("Funnel")} description={e.funnelUrl ? 'Sales funnel linked' : 'Connect a sales funnel'} connected={!!e.funnelUrl} onClick={() => /^https?:\/\//i.test(e.funnelUrl) ? window.open(e.funnelUrl, '_blank', 'noopener,noreferrer') : navigate('/dashboard/funnels')}/><Tool icon={CalendarDays} title={translateText("Booking")} description={c.bookingUrl ? 'Calendar linked' : 'Booking calendar'} connected={!!c.bookingUrl} onClick={() => kind === 'service' ? editTab('booking') : navigate('/dashboard/booking')}/><Tool icon={Sparkles} title={translateText("Automation")} description="Post-purchase workflows" connected={c.automations.confirmation || c.automations.grantAccess} onClick={() => tab('automation')}/></div></Card>
          {localizeNode(kind === 'service' ? <IncludedItems {...props}/> : accessSummary)}
        </>)}
      </aside></div>)}
      {localizeNode(active === 'information' && <div className="ce-insights-grid ce-overview-insights"><ProductRecentActivity config={viewConfig}/><ProductOrders config={viewConfig} limit={5} course={kind === 'course'}/></div>)}
      {localizeNode(editing && !digitalOverview && kind !== 'service' && active !== 'pricing' && <footer className="cw-editor-footer"><span><i className={dirty ? 'dirty' : ''}/>{localizeNode(pendingUploads ? 'Uploading…' : dirty ? 'Unsaved changes' : 'All changes saved')}</span><div><a className="cw-button" href={productPreview.href} target="_blank" rel="noopener noreferrer" onClick={productPreview.prepare}><Eye size={14}/>{translateText("Preview Product")}</a><button disabled={disabled} className="cw-button primary" onClick={() => save(false)}><Save size={14}/>{translateText(" Save Changes")}</button></div></footer>)}
    </>)}
    {deleting && <ProductDeleteDialog product={p} onClose={() => setDeleting(false)} onDeleted={() => { setBaseline(JSON.stringify(draft)); setPendingNavigation(base); }}/>}
    {localizeNode(checkoutPreview && <Dialog title={translateText("Checkout Preview")} onClose={() => setCheckoutPreview(null)} wide><CheckoutScreen product={p} billing={checkoutPreview}/></Dialog>)}
    {localizeNode(blocker.state === 'blocked' && <Dialog title={translateText("Leave without saving?")} onClose={() => blocker.reset()}><p>{translateText("Your latest product changes have not been saved.")}</p><div className="cw-header-actions"><button className="cw-button" onClick={() => blocker.reset()}>{translateText("Keep editing")}</button><button className="cw-button primary" disabled={pendingUploads > 0} onClick={() => blocker.proceed()}>{translateText("Discard changes")}</button></div></Dialog>)}
  </div></DigitalValidationContext.Provider>;
}
function GlobeIcon() {
  useUILanguage(); return <Package size={14}/>; }
function Tool({ icon: Icon, title, description, connected, onClick }: { icon: React.ElementType; title: string; description: string; connected: boolean; onClick: () => void }) {
  useUILanguage(); return <button onClick={onClick}><span><Icon size={17}/></span><div><b>{localizeNode(title)}</b><small>{localizeNode(description)}</small></div><em className={connected ? 'connected' : ''}>{localizeNode(connected ? 'Configured' : 'Connect')}</em><ArrowRight size={12}/></button>; }
function ProductTags({ experience: e, customize, editing }: FormProps) {
  useUILanguage();
  return <Card title={translateText("Product Tags")}>{localizeNode(editing ? <TagManager tags={e.tags} onChange={tags => customize({ tags })}/> : <div className="tw-tags">{localizeNode(e.tags.filter(Boolean).map((tag, i) => <span key={i}>{localizeNode(tag)}</span>))}{localizeNode(!e.tags.length && <small>{translateText("No tags added")}</small>)}</div>)}</Card>;
}
function ProductDetails({ experience: e, customize, editing, product }: FormProps) {
  useUILanguage(); return <Card title={translateText(productKind(product.type) === 'course' ? 'Course Details' : 'Product Details')}><div className="cw-form-grid"><Field label="Category"><input disabled={!editing} value={e.category} placeholder={translateText("e.g. Marketing")} onChange={event => customize({ category: event.target.value })}/></Field><Field label="Language"><Select disabled={!editing} value={e.language} options={['English', 'Arabic', 'French', 'German', 'Spanish']} onChange={language => customize({ language })}/></Field></div><div className="cw-field"><span>{translateText("Tags / Keywords")}</span><TagManager tags={e.tags} disabled={!editing} onChange={tags => customize({ tags })}/></div><Field label="Version"><input value={e.version} readOnly/></Field></Card>; }
function AutomationForm(props: FormProps) { const { config: c, configure, editing } = props;
  useUILanguage(); return <Card title={translateText("Post-purchase Automations")} action={<ProductAdvancedAction {...props} section="automation"/>} subtitle="Configure what happens after a successful purchase.">{localizeNode(([['grantAccess', 'Grant product access'], ['confirmation', 'Send purchase confirmation'], ['followUp', 'Start customer follow-up']] as const).map(([key, label]) => <Toggle key={key} label={label} checked={c.automations[key]} disabled={!editing} onChange={value => configure({ automations: { ...c.automations, [key]: value } })}/>))}<Field label="CRM tag after purchase"><input disabled={!editing} value={c.automations.crmTag} onChange={event => configure({ automations: { ...c.automations, crmTag: event.target.value } })} placeholder={translateText("e.g. course-student")}/></Field><div className="cw-notice"><Sparkles size={17}/>{translateText(" Triggers run after a confirmed payment and follow your configured access rules.")}</div></Card>; }
function ProductSettings(props: FormProps) { const { config: c, configure, experience: e, customize, editing, product: p } = props;
  useUILanguage(); return <Card title={translateText("Product Settings")} action={<ProductAdvancedAction {...props} section="settings"/>} subtitle="Save Changes applies these settings to the product."><CRMRouting defaultStage="PAYMENT_COMPLETED" value={c.crmRouting} disabled={!editing} onChange={crmRouting => configure({ crmRouting })}/><PageSelector product={p} config={c} configure={configure} editing={editing} kind="sales"/><PageSelector product={p} config={c} configure={configure} editing={editing} kind="thankYou"/><Field label="Custom domain" hint="Domain assignment is saved locally. Connect DNS and hosting in Domains."><input disabled={!editing} value={c.customDomain || ''} onChange={event => configure({ customDomain: event.target.value.trim() })} placeholder={translateText("shop.example.com")}/></Field><Field label="Webhook endpoint" hint="Saved configuration; delivery requires a connected payment backend."><input type="url" disabled={!editing} value={c.webhookUrl || ''} onChange={event => configure({ webhookUrl: event.target.value })} placeholder={translateText("https://api.example.com/webhook")}/></Field><div className="ce-webhooks">{localizeNode(['order.paid', 'order.refunded', 'enrollment.created', 'subscription.renewed'].map(event => <label key={event}><input type="checkbox" disabled={!editing} checked={(c.webhookEvents || []).includes(event)} onChange={ev => configure({ webhookEvents: ev.target.checked ? [...(c.webhookEvents || []), event] : (c.webhookEvents || []).filter(value => value !== event) })}/>{localizeNode(event)}</label>))}</div><Field label="Visibility"><Select disabled={!editing} value={e.visibility} options={['Published', 'Private', 'Unlisted']} onChange={visibility => customize({ visibility: visibility as ProductExperience['visibility'] })}/></Field><div className="cw-review"><div><span>{translateText("Product ID")}</span><b>{localizeNode(p.id || 'Assigned when saved')}</b></div><div><span>{translateText("Publishing status")}</span><Status status={p.status}/></div></div></Card>; }
function SubscriberFulfillment({ config: c, configure, editing }: FormProps) {
  useUILanguage(); return <Card title={translateText("Member Benefits & Fulfillment")}><Field label="Subscriber delivery instructions"><textarea disabled={!editing} value={c.fulfillment} onChange={event => configure({ fulfillment: event.target.value })} placeholder={translateText("Describe the resources, services and benefits delivered each billing period.")}/></Field><Field label="Member community URL"><input type="url" disabled={!editing} value={c.communityUrl} placeholder={translateText("https://")} onChange={event => configure({ communityUrl: event.target.value })}/></Field></Card>; }
