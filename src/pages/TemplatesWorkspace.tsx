import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, Eye, LayoutGrid, Library, List, Pencil, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { showToast } from '../utils/toast';
import './templates-workspace.css';

const categories = ['Funnels', 'Websites', 'Landing Pages', 'Booking Pages', 'CRM Pipelines', 'AI Assistants', 'AI Knowledge Packs', 'Automations', 'Products', 'Email/SMS/WhatsApp', 'Design Blocks'] as const;
type Category = typeof categories[number];
const industries = ['E-commerce', 'Fitness/Coaching', 'Real Estate', 'SaaS/Agency', 'Healthcare/Clinic', 'Professional Services'];
const goals = ['Lead Generation', 'Direct Sale', 'Appointment Booking', 'Customer Onboarding', 'Automation Flow'];
const tabs: (Category | 'All')[] = ['All', 'Funnels', 'Websites', 'Landing Pages', 'Booking Pages', 'CRM Pipelines', 'AI Assistants', 'Automations', 'Design Blocks'];
const destinations = ['Growth Workspace / Campaigns', 'Growth Workspace / Sales', 'Growth Workspace / Client Success', 'Agency Workspace / Client Assets'];
type Template = { id: string; name: string; description: string; category: Category; industry: string; goal: string; source: 'official' | 'team' | 'mine'; tags: string[]; updated: string; popularity: number; color: string; destination?: string; masterId?: string; content: { headline: string; steps: string[]; settings: { enabled: boolean; language: string } } };
const seeds: [Category, string, string, number, number, string[]][] = [
 ['Funnels', 'Coaching Discovery Funnel', 'Turn warm leads into booked discovery calls.', 1, 2, ['coaching', 'consultation', '3 steps']],
 ['Funnels', 'Product Launch Funnel', 'Build anticipation and convert your next launch.', 0, 1, ['launch', 'checkout', '4 steps']],
 ['Funnels', 'Property Lead Engine', 'Capture and qualify buyers for your listings.', 2, 0, ['property', 'buyers', 'qualification']],
 ['Websites', 'Modern Agency Studio', 'A polished home for your services and case studies.', 3, 0, ['portfolio', 'agency', '5 pages']],
 ['Websites', 'Wellness Clinic', 'Introduce your practitioners and grow patient bookings.', 4, 2, ['clinic', 'care', '4 pages']],
 ['Websites', 'Boutique Storefront', 'Showcase your collection with a refined storefront.', 0, 1, ['shop', 'collection', 'commerce']],
 ['Landing Pages', 'SaaS Waitlist', 'Validate your next product with a focused waitlist.', 3, 0, ['waitlist', 'startup', 'conversion']],
 ['Landing Pages', 'Fitness Challenge', 'Fill your next 30-day coaching program.', 1, 1, ['challenge', 'fitness', 'enrollment']],
 ['Landing Pages', 'Free Market Report', 'Exchange local insights for qualified buyer leads.', 2, 0, ['lead magnet', 'report', 'property']],
 ['Booking Pages', 'Strategy Session', 'Let prospects book a high-value strategy call.', 5, 2, ['calendar', 'consultation', '30 minutes']],
 ['Booking Pages', 'Clinic Appointment', 'Simplify patient scheduling and visit preparation.', 4, 2, ['patient', 'calendar', 'reminders']],
 ['Booking Pages', 'Personal Training Intro', 'Match new members with the right coach.', 1, 2, ['training', 'coach', 'intro']],
 ['CRM Pipelines', 'Agency Sales Pipeline', 'Move opportunities from first contact to signed deal.', 3, 0, ['sales', 'qualification', '6 stages']],
 ['CRM Pipelines', 'Property Buyer Journey', 'Track viewings, offers, and closing milestones.', 2, 1, ['viewings', 'buyers', '5 stages']],
 ['CRM Pipelines', 'Client Onboarding Board', 'Give every new client a consistent first experience.', 5, 3, ['handoff', 'client success', '4 stages']],
 ['AI Assistants', 'Store Shopping Concierge', 'Help customers discover products and resolve questions.', 0, 1, ['support', 'recommendations', 'AI']],
 ['AI Assistants', 'Lead Qualification Agent', 'Ask the right questions before your sales team steps in.', 3, 0, ['qualification', 'sales', 'AI']],
 ['AI Assistants', 'Clinic Reception Assistant', 'Answer visit questions and guide appointment requests.', 4, 2, ['reception', 'booking', 'AI']],
 ['AI Knowledge Packs', 'Agency Services Playbook', 'Ground your assistant in services, scope, and FAQs.', 3, 3, ['knowledge', 'services', 'FAQ']],
 ['AI Knowledge Packs', 'Store Policies & Returns', 'Give consistent answers on delivery and returns.', 0, 4, ['policies', 'shipping', 'knowledge']],
 ['AI Knowledge Packs', 'Coaching Program Guide', 'Equip your assistant with program and session details.', 1, 3, ['program', 'knowledge', 'FAQ']],
 ['Automations', 'New Lead Welcome Flow', 'Welcome, qualify, and route every incoming lead.', 5, 4, ['workflow', 'routing', 'welcome']],
 ['Automations', 'Abandoned Cart Recovery', 'Bring shoppers back with timely follow-up messages.', 0, 4, ['cart', 'recovery', '3 triggers']],
 ['Automations', 'Appointment Reminder Flow', 'Reduce no-shows with a sequence of helpful reminders.', 4, 4, ['reminders', 'calendar', 'workflow']],
 ['Products', 'Digital Course Bundle', 'Package lessons and resources into a ready-to-sell offer.', 1, 1, ['course', 'bundle', 'digital']],
 ['Products', 'Agency Retainer', 'Standardize your recurring service subscription.', 3, 1, ['subscription', 'retainer', 'service']],
 ['Products', 'Consulting Session', 'Sell a focused one-to-one expert consultation.', 5, 1, ['consulting', 'session', 'service']],
 ['Email/SMS/WhatsApp', 'Welcome Email Sequence', 'Introduce your brand and guide the first next step.', 3, 3, ['email', 'welcome', '5 messages']],
 ['Email/SMS/WhatsApp', 'SMS Booking Reminder', 'Keep appointments top of mind with a concise SMS.', 4, 2, ['SMS', 'reminder', 'booking']],
 ['Email/SMS/WhatsApp', 'WhatsApp Lead Follow-Up', 'Re-engage interested prospects with a personal message.', 2, 0, ['WhatsApp', 'follow-up', 'leads']],
 ['Design Blocks', 'Conversion Hero Section', 'Start your page with a clear promise and compelling CTA.', 3, 0, ['hero', 'section', 'responsive']],
 ['Design Blocks', 'Testimonials & Social Proof', 'Build trust with customer stories and review cards.', 5, 0, ['reviews', 'testimonials', 'trust']],
 ['Design Blocks', 'Product Pricing Table', 'Make your plans easy to compare and choose.', 0, 1, ['pricing', 'plans', 'section']],
];
const colors = ['#6458c9', '#367c73', '#ab6b4c', '#485785', '#8059a0', '#386b9a'];
export const MASTER_TEMPLATES: Template[] = seeds.map(([category, name, description, niche, goal, tags], i) => ({
 id: 'master-' + i, name, description, category, industry: industries[niche], goal: goals[goal], tags, source: i % 7 === 5 ? 'team' : 'official',
 updated: '2026-10-' + String(7 - i % 7).padStart(2, '0'), popularity: 2400 - i * 47, color: colors[i % colors.length],
 content: { headline: name, steps: category === 'CRM Pipelines' ? ['New lead', 'Qualified', 'Proposal', 'Won'] : category === 'Automations' ? ['Trigger received', 'Check conditions', 'Send message', 'Assign owner'] : ['Welcome', 'Explore offer', 'Take action'], settings: { enabled: false, language: 'en' } },
}));
const ownedSeed: Template = { ...structuredClone(MASTER_TEMPLATES[0]), id: 'owned-coaching', name: 'My Coaching Discovery', source: 'mine', destination: destinations[0], masterId: 'master-0', popularity: 0 };
const storageKey = 'gos.templates.assets.v1';
function validContent(value: unknown): value is Template['content'] {
 if (!value || typeof value !== 'object') return false;
 const c = value as Partial<Template['content']>;
 return typeof c.headline === 'string' && Array.isArray(c.steps) && c.steps.every(s => typeof s === 'string') && typeof c.settings?.enabled === 'boolean' && typeof c.settings.language === 'string';
}
function loadAssets(): Template[] {
 try {
  const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  if (Array.isArray(stored)) return stored.filter((a): a is Template => a && typeof a.id === 'string' && typeof a.name === 'string' && typeof a.description === 'string' && categories.includes(a.category) && a.source === 'mine' && industries.includes(a.industry) && goals.includes(a.goal) && Array.isArray(a.tags) && a.tags.every((tag: unknown) => typeof tag === 'string') && typeof a.updated === 'string' && Number.isFinite(Date.parse(a.updated)) && typeof a.popularity === 'number' && colors.includes(a.color) && validContent(a.content));
 } catch { /* Browsing remains available with blocked or malformed storage. */ }
 return [structuredClone(ownedSeed)];
}
function thumbnail(t: Template) {
 const flow = ['CRM Pipelines', 'Automations', 'AI Assistants', 'AI Knowledge Packs'].includes(t.category);
 const shape = flow
  ? '<path d="M130 80H310M220 80V125" stroke="COLOR" stroke-width="3"/><rect x="66" y="55" width="115" height="46" rx="10" fill="COLOR"/><rect x="258" y="55" width="115" height="46" rx="10" fill="COLOR"/><rect x="162" y="125" width="115" height="40" rx="10" fill="COLOR" opacity=".65"/><g fill="white"><rect x="82" y="69" width="70" height="5" rx="2"/><rect x="82" y="82" width="42" height="4" rx="2"/><rect x="274" y="69" width="70" height="5" rx="2"/><rect x="274" y="82" width="42" height="4" rx="2"/><rect x="180" y="141" width="75" height="5" rx="2"/></g>'
  : '<rect x="40" y="38" width="360" height="148" rx="8" fill="white"/><rect x="57" y="52" width="32" height="7" rx="3" fill="COLOR"/><path d="M286 56h24m14 0h24m14 0h20" stroke="#cbd0df" stroke-width="3"/><rect x="58" y="80" width="145" height="10" rx="3" fill="COLOR"/><rect x="58" y="99" width="110" height="10" rx="3" fill="COLOR"/><path d="M58 122h143m-143 9h110" stroke="#cbd0df" stroke-width="4"/><rect x="58" y="146" width="68" height="20" rx="5" fill="COLOR"/><rect x="248" y="78" width="132" height="88" rx="12" fill="COLOR" opacity=".12"/><circle cx="314" cy="122" r="28" fill="COLOR" opacity=".55"/><path d="m291 134 23-30 23 30" stroke="white" fill="none" stroke-width="3"/>';
 const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="210" viewBox="0 0 440 210"><rect width="440" height="210" fill="COLOR" opacity=".09"/>' + shape + '<text x="220" y="201" text-anchor="middle" font-family="Arial" font-size="9" letter-spacing="2" fill="COLOR">' + t.category.toUpperCase() + '</text></svg>';
 return 'data:image/svg+xml,' + encodeURIComponent(svg.replaceAll('COLOR', t.color));
}
function TemplateImage({ template }: { template: Template }) { return <img className="tl-thumbnail" src={thumbnail(template)} alt={template.name + ' layout preview'} />; }
function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
 return <label className="tl-filter"><span>{label}</span><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
}
type DialogState = { kind: 'preview' | 'install' | 'edit'; template: Template };
export function TemplatesWorkspace() {
 const [assets, setAssets] = useState(loadAssets);
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
 const all = useMemo(() => [...MASTER_TEMPLATES, ...assets], [assets]);
 const filtered = useMemo(() => all.filter(t => (category === 'All' || t.category === category) && (industry === 'All industries' || t.industry === industry) && (goal === 'All goals' || t.goal === goal) && (source === 'All' || (source === 'System/GOS Official' ? t.source === 'official' : source === 'Owned by Me' ? t.source === 'mine' : t.source !== 'official')) && (t.name + ' ' + t.category + ' ' + t.tags.join(' ')).toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === 'Alphabetical' ? a.name.localeCompare(b.name) : sort === 'Most Popular' ? b.popularity - a.popularity : b.updated.localeCompare(a.updated)), [all, category, industry, goal, source, query, sort]);
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
  try { localStorage.setItem(storageKey, JSON.stringify(next)); setAssets(next); return true; }
  catch { setError('Your browser could not save this asset. Free storage or allow local storage, then try again.'); return false; }
 }
 function install() {
  if (!dialog || !destination || !name.trim() || actionLock.current) return;
  actionLock.current = true;
  const copy: Template = { ...structuredClone(dialog.template), id: crypto.randomUUID(), name: name.trim(), source: 'mine', masterId: dialog.template.masterId ?? dialog.template.id, destination, updated: new Date().toISOString().slice(0, 10), popularity: 0 };
  if (persist([...assets, copy])) { setStep(3); showToast.success('Independent copy created', 'Saved in ' + destination); }
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
 return <section className="tl-workspace h-[calc(100vh-4rem)] overflow-hidden flex flex-col" aria-label="Template library">
  <header className="tl-heading"><div><div className="tl-eyebrow"><Library size={13} /> YOUR GROWTH TOOLKIT</div><h1>Templates <span>{all.length}</span></h1><p>Reusable asset library for scaling your Growth Operating System</p></div><div className="tl-heading-note"><ShieldCheck size={17} /><span>Start with a template.<br /><b>Make it your own.</b></span></div></header>
  <div className="tl-toolbar"><label className="tl-search"><Search size={17} /><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search templates, tags, categories…" aria-label="Search templates" /><kbd>⌘K /</kbd>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}</label><div className="tl-filters">
   <Filter label="Category" value={category} options={['All', ...categories]} onChange={setCategory} />
   <Filter label="Industry/Niche" value={industry} options={['All industries', ...industries]} onChange={setIndustry} />
   <Filter label="Goal" value={goal} options={['All goals', ...goals]} onChange={setGoal} />
   <Filter label="Source/Ownership" value={source} options={['All', 'System/GOS Official', 'Team/Custom', 'Owned by Me']} onChange={setSource} />
   <Filter label="Sort By" value={sort} options={['Newest First', 'Most Popular', 'Alphabetical']} onChange={setSort} />
  </div><div className="tl-view" role="group" aria-label="Library view"><button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={16} /></button><button aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={16} /></button></div></div>
  <nav className="tl-tabs" aria-label="Template categories">{tabs.map(tab => <button key={tab} aria-pressed={category === tab} onClick={() => setCategory(tab)} className={category === tab ? 'bg-indigo-600 text-white rounded-lg shadow-sm' : ''}>{tab}<span>{tab === 'All' ? all.length : all.filter(t => t.category === tab).length}</span></button>)}</nav>
  <div className="tl-results"><span><b>{filtered.length}</b> {category === 'All' ? 'templates' : category.toLowerCase()} <span className="tl-results-muted">· Ready to customize</span></span>{hasFilters ? <button onClick={reset}>Clear filters <X size={12} /></button> : <span className="tl-results-muted"><Sparkles size={12} /> Curated for your next growth move</span>}</div>
  <div className="tl-library flex-1 overflow-y-auto custom-scrollbar" tabIndex={0} aria-label="Template results"><div className={view === 'grid' ? 'tl-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4' : 'tl-list p-4'}>
   {filtered.map(t => <article className={'tl-card ' + (view === 'list' ? 'tl-card-row' : '')} key={t.id}><div className="tl-art"><TemplateImage template={t} /><span className="tl-art-label">{t.source === 'official' ? <><ShieldCheck size={11} /> GOS Official</> : t.source === 'mine' ? 'Custom · Yours' : 'Custom · Team'}</span><div className="tl-hover"><button onClick={() => open('preview', t)}><Eye size={15} /> Preview</button><button onClick={() => open('install', t)}>Install <ArrowRight size={14} /></button></div></div><div className="tl-card-copy"><span className="tl-category">{t.category}</span><h2 title={t.name}>{t.name}</h2><p title={t.description}>{t.description}</p><div className="tl-tags">{t.tags.slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}</div><div className="tl-meta"><span>Updated {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(t.updated))}</span><span>{t.source === 'mine' ? 'Your asset' : (t.popularity / 1000).toFixed(1) + 'k uses'}</span></div></div><div className="tl-actions"><button className="tl-use" onClick={() => open('install', t)}>Use Template <ArrowRight size={13} /></button><button title="Preview" aria-label={'Preview ' + t.name} onClick={() => open('preview', t)}><Eye size={15} /></button><button title="Duplicate" aria-label={'Duplicate ' + t.name} onClick={() => open('install', t)}><Copy size={14} /></button>{t.source === 'mine' && <button title="Edit" aria-label={'Edit ' + t.name} onClick={() => open('edit', t)}><Pencil size={14} /></button>}</div></article>)}
   {!filtered.length && <div className="tl-empty"><Search size={30} /><h2>No matching templates</h2><p>Try another keyword or broaden your filters.</p><button className="tl-primary" onClick={reset}>Reset filters</button></div>}
  </div></div>
  <footer className="tl-footer"><span><ShieldCheck size={12} /> Every installation creates an independent copy.</span><span>Local demo library · {assets.length} owned assets</span></footer>
  {dialog && <dialog ref={modalRef} className="tl-dialog" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }} aria-labelledby="tl-dialog-title"><div className="tl-dialog-inner"><header><div><span className="tl-eyebrow">{dialog.kind === 'edit' ? 'YOUR EDITABLE ASSET' : dialog.kind === 'preview' ? 'TEMPLATE PREVIEW' : 'INSTALL TEMPLATE'}</span><h2 id="tl-dialog-title">{dialog.kind === 'edit' ? 'Edit your asset' : step === 3 ? 'Your copy is ready' : dialog.template.name}</h2></div><button onClick={close} aria-label="Close dialog"><X size={19} /></button></header>
   {dialog.kind === 'install' && <ol className="tl-steps">{['Preview', 'Destination', 'Created'].map((label, i) => <li key={label} className={step >= i + 1 ? 'active' : ''}><span>{step > i + 1 ? <Check size={12} /> : i + 1}</span>{label}</li>)}</ol>}
   <div className="tl-dialog-body">{dialog.kind === 'edit' ? <><label>Asset name<input value={name} maxLength={100} onChange={e => setName(e.target.value)} /></label><label>Use case<input value={description} maxLength={240} onChange={e => setDescription(e.target.value)} /></label><label>Asset configuration<textarea rows={9} value={config} onChange={e => setConfig(e.target.value)} spellCheck={false} /></label><p className="tl-help">Changes apply only to this owned asset in {dialog.template.destination}.</p></> : step === 3 ? <div className="tl-success"><span><Check size={30} /></span><h3>{name.trim()}</h3><p>Created in <b>{destination}</b></p><p>Your copy is independent and ready to edit. The source template is unchanged.</p></div> : step === 2 ? <><div className="tl-install-summary"><Copy size={20} /><div><b>{dialog.template.name}</b><span>{dialog.template.category} · Independent copy</span></div></div><label>Destination Workspace / Folder<select value={destination} onChange={e => setDestination(e.target.value)}><option value="" disabled>Select a destination…</option>{destinations.map(d => <option key={d}>{d}</option>)}</select></label><label>New asset name<input value={name} maxLength={100} onChange={e => setName(e.target.value)} /></label><div className="tl-safe"><ShieldCheck size={18} /><p>A new editable asset will be saved to this browser. Its configuration is copied independently; edits never change the master template.</p></div></> : <><TemplateImage template={dialog.template} /><div className="tl-preview-badges"><span className="tl-category">{dialog.template.category}</span><span>{dialog.template.source === 'official' ? 'GOS Official' : 'Custom'}</span></div><p>{dialog.template.description}</p><dl className="tl-details"><div><dt>Industry</dt><dd>{dialog.template.industry}</dd></div><div><dt>Goal</dt><dd>{dialog.template.goal}</dd></div><div><dt>Last updated</dt><dd>{dialog.template.updated}</dd></div><div><dt>Includes</dt><dd>{dialog.template.tags.join(' · ')}</dd></div></dl><div className="tl-safe"><ShieldCheck size={18} /><p>Review the template before choosing a destination. Your installation will be an independent editable copy.</p></div></>}{error && <p className="tl-error" role="alert">{error}</p>}</div>
   <footer>{dialog.kind === 'edit' ? <><button onClick={close}>Cancel</button><button className="tl-primary" disabled={!name.trim()} onClick={saveEdit}>Save Changes</button></> : step === 3 ? <><button onClick={() => { reset(); setSource('Owned by Me'); close(); }}>View owned assets</button><button className="tl-primary" onClick={close}>Done <Check size={14} /></button></> : <><button onClick={() => step === 2 ? setStep(1) : close()}>{step === 2 ? 'Back' : 'Cancel'}</button><button className="tl-primary" disabled={step === 2 && (!destination || !name.trim())} onClick={() => dialog.kind === 'preview' ? open('install', dialog.template) : step === 1 ? setStep(2) : install()}>{dialog.kind === 'preview' ? 'Use Template' : step === 1 ? 'Continue to Destination' : 'Create Independent Copy'}{step === 2 ? <Copy size={14} /> : <ArrowRight size={14} />}</button></>}</footer>
  </div></dialog>}
 </section>;
}
