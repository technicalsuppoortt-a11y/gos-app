import { thumbnailImageProps } from '../../utils/thumbnailImages';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, Library, Search, ShieldCheck, X } from 'lucide-react';
import { useEntities } from '../../backend/workspace';
import { localizeNode, translateText, useUILanguage } from '../../i18n/display';
import { saveProduct } from './repository';
import { filterProductTemplates, instantiateProductTemplate, productTemplates, type ProductTemplate, type TemplateCalendar } from './productTemplates';
import './product-template-library.css';

export function ProductTemplateLibrary() {
  useUILanguage();
  const navigate = useNavigate(), calendars = useEntities<TemplateCalendar>('calendars');
  const [category, setCategory] = useState('All'), [industry, setIndustry] = useState('All industries'), [query, setQuery] = useState('');
  const [preview, setPreview] = useState<ProductTemplate | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [sort, setSort] = useState('Recommended');
  const [plan, setPlan] = useState(false), [slot, setSlot] = useState('');
  const dialog = useRef<HTMLDialogElement>(null), lock = useRef(false);
  const filtered = filterProductTemplates(category, industry, query).sort((a, b) => sort === 'Name: A to Z' ? a.product.name.localeCompare(b.product.name) : sort === 'Price: Low to High' ? a.product.config!.amount - b.product.config!.amount : sort === 'Price: High to Low' ? b.product.config!.amount - a.product.config!.amount : 0);
  useEffect(() => { if (preview) { dialog.current?.showModal(); setPlan(false); setSlot(''); } }, [preview]);
  function show(template: ProductTemplate) { setError(''); setPreview(template); }
  function close() { if (lock.current) return; dialog.current?.close(); setPreview(null); }
  async function install(template: ProductTemplate) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const product = await saveProduct(instantiateProductTemplate(template, window.location.origin, calendars));
      navigate(`/dashboard/products-payments/products/${encodeURIComponent(product.id)}/edit`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create your product. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const p = preview?.product, config = p?.config;
  return <main className="pt-library">
    <Link className="pt-back" to="/dashboard/products"><ArrowLeft size={15}/>{translateText('Back to Products')}</Link>
    <header className="pt-heading"><div><span className="pt-eyebrow"><Library size={14}/>{translateText('THE PRODUCT STUDIO')}</span><h1>{translateText('Start with something great.')}</h1><p>{translateText('Expertly structured services, downloads and courses. Ready for your brand.')}</p></div><span className="pt-curated"><ShieldCheck size={17}/>{translateText('Curated by Upclick')}</span></header>
    <div className="pt-toolbar"><label className="pt-search"><Search size={16}/><input aria-label={translateText('Search product templates')} placeholder={translateText('Search templates, niches or tags…')} value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label={translateText('Clear search')} onClick={() => setQuery('')}><X size={14}/></button>}</label><div className="pt-filter-control"><span>{translateText('Industry/Niche')}</span><CommerceSelect label="Industry/Niche" value={industry} onChange={setIndustry} options={['All industries', ...new Set(productTemplates.map(t => t.industry))]}/></div><div className="pt-filter-control pt-sort-control"><span>{translateText('Sort by')}</span><CommerceSelect label="Sort templates" value={sort} onChange={setSort} options={['Recommended', 'Name: A to Z', 'Price: Low to High', 'Price: High to Low']}/></div></div>
    <div className="pt-categories" role="group" aria-label={translateText('Template categories')}>{['All', 'Services', 'Digital Products', 'Courses'].map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{translateText(value)}<span>{productTemplates.filter(t => value === 'All' || t.category === value).length}</span></button>)}</div>
    <div className="pt-results"><span><b>{filtered.length}</b> {translateText('templates · Ready to customize')}</span><button onClick={() => { setCategory('All'); setIndustry('All industries'); setQuery(''); setSort('Recommended'); }}>{translateText('Clear filters')}</button></div>
    {error && !preview && <p className="pt-error" role="alert">{localizeNode(error)}</p>}
    <div className="pt-grid">{filtered.map(template => <article className="pt-card" key={template.id} aria-busy={busy} onClick={() => void install(template)}>
      <button className="pt-cover" disabled={busy} onClick={event => { event.stopPropagation(); void install(template); }} aria-label={translateText(`Use ${template.product.name} template`)}><img decoding="async" {...thumbnailImageProps(template.product.image)} src={template.product.image} alt={translateText(template.product.name)} loading="lazy"/></button>
      <div className="pt-card-body"><div className="pt-card-meta"><span className={'pt-badge ' + template.product.type.toLowerCase().replaceAll(' ', '-')}>{translateText(template.category)}</span><b>{template.product.price}</b></div><h2>{localizeNode(template.product.name)}</h2><p>{localizeNode(template.product.description)}</p><div className="pt-tags">{template.tags.map(tag => <span key={tag}>{localizeNode(tag)}</span>)}</div><footer><button disabled={busy} className="pt-primary" onClick={event => { event.stopPropagation(); void install(template); }}>{translateText(busy ? 'Creating…' : 'Use Template')}<ArrowRight size={14}/></button><button className="pt-preview-button" onClick={event => { event.stopPropagation(); show(template); }}><Eye size={15}/>{translateText('Preview')}</button></footer></div>
    </article>)}</div>
    {!filtered.length && <div className="pt-empty"><Search size={28}/><h2>{translateText('No templates match your filters')}</h2><p>{translateText('Try another niche or clear your search.')}</p></div>}
    {preview && p && config && <dialog className="pt-dialog" ref={dialog} aria-labelledby="pt-preview-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="pt-dialog-inner"><header><span>{translateText('Interactive product preview')}</span><button autoFocus aria-label={translateText('Close preview')} disabled={busy} onClick={close}><X size={20}/></button></header><div className="pt-preview-layout"><div><img loading="lazy" decoding="async" className="pt-preview-cover" {...thumbnailImageProps(p.image)} src={p.image} alt={translateText(p.name)}/><span className="pt-badge">{translateText(preview.category)}</span><h2 id="pt-preview-title">{localizeNode(p.name)}</h2><p>{localizeNode(p.description)}</p>
        {p.type === 'Course' && <section className="pt-curriculum"><h3>{translateText('Your learning path')}</h3>{config.modules.map((module, index) => <details key={module.id} open={index === 0}><summary>{localizeNode(module.title)} <small>{module.lessons.length} {translateText('lessons')}</small></summary>{module.lessons.map(lesson => typeof lesson !== 'string' && <div key={lesson.id}><span>{localizeNode(lesson.title)}</span><small>{lesson.kind} · {lesson.duration}</small></div>)}</details>)}</section>}
        {p.type === 'Digital Product' && <section className="pt-resources"><h3>{translateText('Explore the demo resources')}</h3>{config.assets.map(asset => <a key={asset.url} href={asset.url} download>{localizeNode(asset.name)}<ArrowRight size={14}/></a>)}<small>{translateText('Demo content included. Replace with your own files before publishing.')}</small></section>}
      </div><aside><span className="pt-eyebrow">{translateText('YOUR NEXT OFFER')}</span><strong className="pt-price">{plan ? '$75' : p.price}{plan && <small> × 3</small>}</strong>{p.type === 'Course' && <fieldset className="pt-pricing"><legend>{translateText('Payment options')}</legend><label><input type="radio" name="template-plan" checked={!plan} onChange={() => setPlan(false)}/>$199 {translateText('one-time')}</label><label><input type="radio" name="template-plan" checked={plan} onChange={() => setPlan(true)}/>3 × $75 {translateText('monthly')}</label></fieldset>}
        <ul>{preview.features.map(feature => <li key={feature}><Check size={15}/>{localizeNode(feature)}</li>)}</ul>
        {p.type === 'Service' && <div className="pt-slots"><h3>{translateText('Sample availability')}</h3>{config.bookingSlots?.map(value => <button key={value} aria-pressed={slot === value} onClick={() => setSlot(value)}>{value}</button>)}<small>{translateText(slot ? 'Sample slot selected. Live availability comes from your connected calendar.' : 'Preview only. Choose a sample time to explore scheduling.')}</small></div>}
        {p.type === 'Service' && <p className="pt-note">{translateText('Connects to an available 60-minute workspace calendar. If none exists, connect one in the editor.')}</p>}
        {p.type === 'Course' && <p className="pt-note">{translateText('Instructor: Samir Morgan. Includes sample videos and PDFs to replace with your own lessons.')}</p>}
        <button disabled={busy} className="pt-primary" onClick={() => void install(preview)}>{translateText(busy ? 'Creating your product…' : 'Customize this template')}<ArrowRight size={15}/></button><small className="pt-note">{translateText('Creates your own editable draft. No payment required.')}</small>{error && <p role="alert" className="pt-error">{localizeNode(error)}</p>}
      </aside></div></div>
    </dialog>}
  </main>;
}
