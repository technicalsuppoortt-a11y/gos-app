import { cloudStorage, useCloudState } from '../backend/workspace';
import { useTemplateCatalog } from '../backend/templateCatalog';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, Eye, LayoutGrid, Library, List, Pencil, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { showToast } from '../utils/toast';
import { Select } from '../components/ui/Select';
import './templates-workspace.css';

import { categories, industries, goals, destinations, colors, MASTER_TEMPLATES, type Template, type Category } from './system-template-data';

export { MASTER_TEMPLATES, type Template } from './system-template-data';
const storageKey = 'entity:userTemplates';
function validContent(value: unknown): value is Template['content'] {
 if (!value || typeof value !== 'object') return false;
 const c = value as Partial<Template['content']>;
 return typeof c.headline === 'string' && Array.isArray(c.steps) && c.steps.every(s => typeof s === 'string') && typeof c.settings?.enabled === 'boolean' && typeof c.settings.language === 'string';
}
function loadAssets(): Template[] {
 try {
  const stored: unknown = JSON.parse(cloudStorage.getItem(storageKey) ?? 'null');
  if (Array.isArray(stored)) return stored.filter((a): a is Template => a && typeof a.id === 'string' && typeof a.name === 'string' && typeof a.description === 'string' && categories.includes(a.category) && a.source === 'mine' && industries.includes(a.industry) && goals.includes(a.goal) && Array.isArray(a.tags) && a.tags.every((tag: unknown) => typeof tag === 'string') && typeof a.updated === 'string' && Number.isFinite(Date.parse(a.updated)) && typeof a.popularity === 'number' && colors.includes(a.color) && validContent(a.content));
 } catch { /* Browsing remains available with blocked or malformed storage. */ }
 return [];
}
function thumbnail(t: Template) {
 const flow = ['CRM Pipelines', 'Automations', 'AI Assistants', 'AI Knowledge Packs'].includes(t.category);
 const shape = flow
  ? '<path d="M130 80H310M220 80V125" stroke="COLOR" stroke-width="3"/><rect x="66" y="55" width="115" height="46" rx="10" fill="COLOR"/><rect x="258" y="55" width="115" height="46" rx="10" fill="COLOR"/><rect x="162" y="125" width="115" height="40" rx="10" fill="COLOR" opacity=".65"/><g fill="white"><rect x="82" y="69" width="70" height="5" rx="2"/><rect x="82" y="82" width="42" height="4" rx="2"/><rect x="274" y="69" width="70" height="5" rx="2"/><rect x="274" y="82" width="42" height="4" rx="2"/><rect x="180" y="141" width="75" height="5" rx="2"/></g>'
  : '<rect x="40" y="38" width="360" height="148" rx="8" fill="white"/><rect x="57" y="52" width="32" height="7" rx="3" fill="COLOR"/><path d="M286 56h24m14 0h24m14 0h20" stroke="#cbd0df" stroke-width="3"/><rect x="58" y="80" width="145" height="10" rx="3" fill="COLOR"/><rect x="58" y="99" width="110" height="10" rx="3" fill="COLOR"/><path d="M58 122h143m-143 9h110" stroke="#cbd0df" stroke-width="4"/><rect x="58" y="146" width="68" height="20" rx="5" fill="COLOR"/><rect x="248" y="78" width="132" height="88" rx="12" fill="COLOR" opacity=".12"/><circle cx="314" cy="122" r="28" fill="COLOR" opacity=".55"/><path d="m291 134 23-30 23 30" stroke="white" fill="none" stroke-width="3"/>';
 const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="210" viewBox="0 0 440 210"><rect width="440" height="210" fill="COLOR" opacity=".09"/>' + shape + '<text x="220" y="201" text-anchor="middle" font-family="Arial" font-size="9" letter-spacing="2" fill="COLOR">' + t.category.toUpperCase() + '</text></svg>';
 return 'data:image/svg+xml,' + encodeURIComponent(svg.replaceAll('COLOR', t.color));
}
function TemplateImage({ template }: { template: Template }) {
  useUILanguage(); return <img className="tl-thumbnail" src={thumbnail(template)} alt={translateText(template.name + ' layout preview')} />; }
function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  useUILanguage();
 return <label className="tl-filter flex flex-col gap-1.5"><span>{localizeNode(label)}</span><Select label={label} value={value} onChange={onChange} options={options} /></label>;
}
type DialogState = { kind: 'preview' | 'install' | 'edit'; template: Template };
export type TemplateScope = 'funnels' | 'booking' | 'follow-up' | 'products' | 'copilot' | 'knowledge';
const scopeCategories: Record<TemplateScope, Category[]> = { funnels: ['Funnels', 'Websites', 'Landing Pages'], booking: ['Booking Pages'], 'follow-up': ['Automations', 'Email/SMS/WhatsApp'], products: ['Products'], copilot: ['AI Assistants'], knowledge: ['AI Knowledge Packs'] };
export function TemplatesWorkspace({ scope = 'funnels', onInstall }: { scope?: TemplateScope; onInstall?: (template: Template) => void }) {
  useUILanguage();
 const nativeCategories = scopeCategories[scope];
 const tabs = ['All', ...nativeCategories];
 const destinations = [scope + ' / Templates'];
 const [assets, setAssets] = useCloudState<Template[]>(storageKey, []);
 const catalog = useTemplateCatalog();
 const [query, setQuery] = useState('');
 const [category, setCategory] = useState('All');
 const [industry, setIndustry] = useState('All industries');
 const [goal, setGoal] = useState('All goals');
 const [source, setSource] = useState('All');
 const [sort, setSort] = useState('Newest First');
 const [view, setView] = useState<'grid' | 'list'>('grid');
 const [dialog, setDialog] = useState<DialogState | null>(null);
 const [step, setStep] = useState(1);
 const [destination, setDestination] = useState('');
 const [name, setName] = useState('');
 const [description, setDescription] = useState('');
 const [config, setConfig] = useState('');
 const [error, setError] = useState('');
 const searchRef = useRef<HTMLInputElement>(null);
 const modalRef = useRef<HTMLDialogElement>(null);
 const actionLock = useRef(false);
 const all = useMemo(() => [...catalog, ...assets].filter(template => nativeCategories.includes(template.category)), [assets, nativeCategories, catalog]);
 const filtered = useMemo(() => all.filter(t => (category === 'All' || t.category === category) && (industry === 'All industries' || t.industry === industry) && (goal === 'All goals' || t.goal === goal) && (source === 'All' || (source === 'System/Upclick Official' ? t.source === 'official' : source === 'Owned by Me' ? t.source === 'mine' : t.source !== 'official')) && (t.name + ' ' + t.category + ' ' + t.tags.join(' ')).toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === 'Alphabetical' ? a.name.localeCompare(b.name) : sort === 'Most Popular' ? b.popularity - a.popularity : b.updated.localeCompare(a.updated)), [all, category, industry, goal, source, query, sort]);
 useEffect(() => {
  const listener = (event: KeyboardEvent) => {
   if (document.querySelector('dialog[open]')) return;
   const target = event.target as HTMLElement;
   if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
   if (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) { event.preventDefault(); searchRef.current?.focus(); }
  };
  window.addEventListener('keydown', listener);
  return () => window.removeEventListener('keydown', listener);
 }, []);
 useEffect(() => { if (dialog && !modalRef.current?.open) modalRef.current?.showModal(); }, [dialog]);
 function open(kind: DialogState['kind'], template: Template) {
  setStep(1); setDestination(''); setName(kind === 'edit' ? template.name : template.name + ' — Copy'); setDescription(template.description); setConfig(JSON.stringify(template.content, null, 2)); setError(''); actionLock.current = false; setDialog({ kind, template });
 }
 function close() { modalRef.current?.close(); setDialog(null); }
 function persist(next: Template[]) {
  try { setAssets(next); return true; }
  catch { setError('Your browser could not save this asset. Free storage or allow local storage, then try again.'); return false; }
 }
 function install() {
  if (!dialog || !destination || !name.trim() || actionLock.current) return;
  actionLock.current = true;
  const copy: Template = { ...structuredClone(dialog.template), id: crypto.randomUUID(), name: name.trim(), source: 'mine', masterId: dialog.template.masterId ?? dialog.template.id, destination, updated: new Date().toISOString().slice(0, 10), popularity: 0 };
  if (persist([...assets, copy])) { try { onInstall?.(copy); } catch (failure) { persist(assets); setError(failure instanceof Error ? failure.message : 'The template could not be installed.'); actionLock.current = false; return; } setStep(3); showToast.success('Independent copy created', 'Saved in ' + destination); }
  else actionLock.current = false;
 }
 function saveEdit() {
  if (!dialog || dialog.template.source !== 'mine' || !name.trim()) return;
  try {
   const content: unknown = JSON.parse(config);
   if (!validContent(content)) throw new Error('Invalid content');
   if (persist(assets.map(a => a.id === dialog.template.id ? { ...a, name: name.trim(), description: description.trim(), content, updated: new Date().toISOString().slice(0, 10) } : a))) { close(); showToast.success('Your asset has been updated'); }
  } catch { setError('Enter valid JSON with a headline, steps array, and settings containing enabled and language.'); }
 }
 function reset() { setQuery(''); setCategory('All'); setIndustry('All industries'); setGoal('All goals'); setSource('All'); }
 const hasFilters = query || category !== 'All' || industry !== 'All industries' || goal !== 'All goals' || source !== 'All';
 return <section className="tl-workspace h-[calc(100vh-4rem)] overflow-hidden flex flex-col" aria-label={translateText("Template library")}>
  <header className="tl-heading"><div><div className="tl-eyebrow"><Library size={13} />{translateText(" YOUR GROWTH TOOLKIT")}</div><h1>{localizeNode(scope === 'funnels' ? 'Funnel & website' : scope === 'follow-up' ? 'Automation' : scope.charAt(0).toUpperCase() + scope.slice(1))}{translateText(" templates ")}<span>{localizeNode(all.length)}</span></h1><p>{translateText("Browse and customize templates for this module.")}</p></div><div className="tl-heading-note"><ShieldCheck size={17} /><span>{translateText("Start with a template.")}<br /><b>{translateText("Make it your own.")}</b></span></div></header>
  <div className="tl-toolbar"><label className="tl-search"><Search size={17} /><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder={translateText("Search templates, tags, categories…")} aria-label={translateText("Search templates")} /><kbd>{translateText("⌘K /")}</kbd>{localizeNode(query && <button onClick={() => setQuery('')} aria-label={translateText("Clear search")}><X size={14} /></button>)}</label><div className="tl-filters">
   <Filter label="Category" value={category} options={['All', ...nativeCategories]} onChange={setCategory} />
   <Filter label="Industry/Niche" value={industry} options={['All industries', ...industries]} onChange={setIndustry} />
   <Filter label="Goal" value={goal} options={['All goals', ...goals]} onChange={setGoal} />
   <Filter label="Source/Ownership" value={source} options={['All', 'System/Upclick Official', 'Team/Custom', 'Owned by Me']} onChange={setSource} />
   <Filter label="Sort By" value={sort} options={['Newest First', 'Most Popular', 'Alphabetical']} onChange={setSort} />
  </div><div className="tl-view" role="group" aria-label={translateText("Library view")}><button aria-label={translateText("Grid view")} aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={16} /></button><button aria-label={translateText("List view")} aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={16} /></button></div></div>
  <nav className="tl-tabs" aria-label={translateText("Template categories")}>{localizeNode(tabs.map(tab => <button key={tab} aria-pressed={category === tab} onClick={() => setCategory(tab)} className={category === tab ? 'bg-indigo-600 text-white rounded-lg shadow-sm' : ''}>{localizeNode(tab)}<span>{localizeNode(tab === 'All' ? all.length : all.filter(t => t.category === tab).length)}</span></button>))}</nav>
  <div className="tl-results"><span><b>{localizeNode(filtered.length)}</b> {localizeNode(category === 'All' ? 'templates' : category.toLowerCase())} <span className="tl-results-muted">{translateText("· Ready to customize")}</span></span>{localizeNode(hasFilters ? <button onClick={reset}>{translateText("Clear filters ")}<X size={12} /></button> : <span className="tl-results-muted"><Sparkles size={12} />{translateText(" Curated for your next growth move")}</span>)}</div>
  <div className="tl-library flex-1 overflow-y-auto custom-scrollbar" tabIndex={0} aria-label={translateText("Template results")}><div className={view === 'grid' ? 'tl-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4' : 'tl-list p-4'}>
   {localizeNode(filtered.map(t => <article className={'tl-card ' + (view === 'list' ? 'tl-card-row' : '')} key={t.id}><div className="tl-art"><TemplateImage template={t} /><span className="tl-art-label">{localizeNode(t.source === 'official' ? <><ShieldCheck size={11} />{translateText(" Upclick Official")}</> : t.source === 'mine' ? 'Custom · Yours' : 'Custom · Team')}</span><div className="tl-hover"><button onClick={() => open('preview', t)}><Eye size={15} />{translateText(" Preview")}</button><button onClick={() => open('install', t)}>{translateText("Install ")}<ArrowRight size={14} /></button></div></div><div className="tl-card-copy"><span className="tl-category">{localizeNode(t.category)}</span><h2 title={translateText(t.name)}>{localizeNode(t.name)}</h2><p title={translateText(t.description)}>{localizeNode(t.description)}</p><div className="tl-tags">{localizeNode(t.tags.slice(0, 2).map(tag => <span key={tag}>{localizeNode(tag)}</span>))}</div><div className="tl-meta"><span>{translateText("Updated ")}{localizeNode(new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(t.updated)))}</span><span>{localizeNode(t.source === 'mine' ? 'Your asset' : (t.popularity / 1000).toFixed(1) + 'k uses')}</span></div></div><div className="tl-actions"><button className="tl-use" onClick={() => open('install', t)}>{translateText("Use Template ")}<ArrowRight size={13} /></button><button title={translateText("Preview")} aria-label={translateText('Preview ' + t.name)} onClick={() => open('preview', t)}><Eye size={15} /></button><button title={translateText("Duplicate")} aria-label={translateText('Duplicate ' + t.name)} onClick={() => open('install', t)}><Copy size={14} /></button>{localizeNode(t.source === 'mine' && <button title={translateText("Edit")} aria-label={translateText('Edit ' + t.name)} onClick={() => open('edit', t)}><Pencil size={14} /></button>)}</div></article>))}
   {localizeNode(!filtered.length && <div className="tl-empty"><Search size={30} /><h2>{translateText("No matching templates")}</h2><p>{translateText("Try another keyword or broaden your filters.")}</p><button className="tl-primary" onClick={reset}>{translateText("Reset filters")}</button></div>)}
  </div></div>
  <footer className="tl-footer"><span><ShieldCheck size={12} />{translateText(" Every installation creates an independent copy.")}</span><span>{translateText("Local demo library · ")}{localizeNode(assets.filter(asset => nativeCategories.includes(asset.category)).length)}{translateText(" owned assets")}</span></footer>
  {localizeNode(dialog && <dialog ref={modalRef} className="tl-dialog" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }} aria-labelledby="tl-dialog-title"><div className="tl-dialog-inner"><header><div><span className="tl-eyebrow">{localizeNode(dialog.kind === 'edit' ? 'YOUR EDITABLE ASSET' : dialog.kind === 'preview' ? 'TEMPLATE PREVIEW' : 'INSTALL TEMPLATE')}</span><h2 id="tl-dialog-title">{localizeNode(dialog.kind === 'edit' ? 'Edit your asset' : step === 3 ? 'Your copy is ready' : dialog.template.name)}</h2></div><button onClick={close} aria-label={translateText("Close dialog")}><X size={19} /></button></header>
   {localizeNode(dialog.kind === 'install' && <ol className="tl-steps">{localizeNode(['Preview', 'Destination', 'Created'].map((label, i) => <li key={label} className={step >= i + 1 ? 'active' : ''}><span>{localizeNode(step > i + 1 ? <Check size={12} /> : i + 1)}</span>{localizeNode(label)}</li>))}</ol>)}
   <div className="tl-dialog-body">{localizeNode(dialog.kind === 'edit' ? <><label>{translateText("Asset name")}<input value={name} maxLength={100} onChange={e => setName(e.target.value)} /></label><label>{translateText("Use case")}<input value={description} maxLength={240} onChange={e => setDescription(e.target.value)} /></label><label>{translateText("Asset configuration")}<textarea rows={9} value={config} onChange={e => setConfig(e.target.value)} spellCheck={false} /></label><p className="tl-help">{translateText("Changes apply only to this owned asset in ")}{localizeNode(dialog.template.destination)}.</p></> : step === 3 ? <div className="tl-success"><span><Check size={30} /></span><h3>{localizeNode(name.trim())}</h3><p>{translateText("Created in ")}<b>{localizeNode(destination)}</b></p><p>{translateText("Your copy is independent and ready to edit in this module.")}</p></div> : step === 2 ? <><div className="tl-install-summary"><Copy size={20} /><div><b>{localizeNode(dialog.template.name)}</b><span>{localizeNode(dialog.template.category)}{translateText(" · Independent copy")}</span></div></div><label className="flex flex-col gap-1.5">{translateText("Destination Workspace / Folder")}<Select placeholder={translateText("Select a destination…")} value={destination} onChange={setDestination} options={[{ value: '', label: 'Select a destination…', disabled: true }, ...destinations]} /></label><label>{translateText("New asset name")}<input value={name} maxLength={100} onChange={e => setName(e.target.value)} /></label><div className="tl-safe"><ShieldCheck size={18} /><p>{translateText("A new editable asset will be saved to this browser. Its configuration is copied independently; edits never change the master template.")}</p></div></> : <><TemplateImage template={dialog.template} /><div className="tl-preview-badges"><span className="tl-category">{localizeNode(dialog.template.category)}</span><span>{localizeNode(dialog.template.source === 'official' ? 'Upclick Official' : 'Custom')}</span></div><p>{localizeNode(dialog.template.description)}</p><dl className="tl-details"><div><dt>{translateText("Industry")}</dt><dd>{localizeNode(dialog.template.industry)}</dd></div><div><dt>{translateText("Goal")}</dt><dd>{localizeNode(dialog.template.goal)}</dd></div><div><dt>{translateText("Last updated")}</dt><dd>{localizeNode(dialog.template.updated)}</dd></div><div><dt>{translateText("Includes")}</dt><dd>{localizeNode(dialog.template.tags.join(' · '))}</dd></div></dl><div className="tl-safe"><ShieldCheck size={18} /><p>{translateText("Review the template before choosing a destination. Your installation will be an independent editable copy.")}</p></div></>)}{localizeNode(error && <p className="tl-error" role="alert">{localizeNode(error)}</p>)}</div>
   <footer>{localizeNode(dialog.kind === 'edit' ? <><button onClick={close}>{translateText("Cancel")}</button><button className="tl-primary" disabled={!name.trim()} onClick={saveEdit}>{translateText("Save Changes")}</button></> : step === 3 ? <><button onClick={() => { reset(); setSource('Owned by Me'); close(); }}>{translateText("View owned assets")}</button><button className="tl-primary" onClick={close}>{translateText("Done ")}<Check size={14} /></button></> : <><button onClick={() => step === 2 ? setStep(1) : close()}>{localizeNode(step === 2 ? 'Back' : 'Cancel')}</button><button className="tl-primary" disabled={step === 2 && (!destination || !name.trim())} onClick={() => dialog.kind === 'preview' ? open('install', dialog.template) : step === 1 ? setStep(2) : install()}>{localizeNode(dialog.kind === 'preview' ? 'Use Template' : step === 1 ? 'Continue to Destination' : 'Create Independent Copy')}{localizeNode(step === 2 ? <Copy size={14} /> : <ArrowRight size={14} />)}</button></>)}</footer>
  </div></dialog>)}
 </section>;
}
