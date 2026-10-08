import { FunnelAnalytics, FunnelIntegrations, FunnelLeads, FunnelPerformance } from './FunnelInsights';
import { rangeFor } from './funnel-data';
import { DomainExportDialog } from './DomainExportDialog';
import { AssetSelect, AssetSearch, FilterChips } from './AssetControls';
import { useState } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, Check, ChevronDown, Download, ExternalLink, Eye, FileText, Filter, Globe, GripVertical, LayoutGrid, Layers, Link2, List, LockKeyhole, Monitor, Pencil, Plus, Settings, ShieldCheck, Smartphone, Sparkles, Tablet, Trash2 } from 'lucide-react';
import { OptionsMenu } from './crm/CRMPrimitives';
import { showToast } from '../utils/toast';
import { SectionPreview } from './BuilderWorkspace';
import type { BuilderPage } from './BuilderWorkspace';
import { images, templates } from './asset-model';
import type { Asset, BuilderMode, Dialog, Workspace } from './asset-model';
type Actions = {
    label: string;
    onSelect: () => void;
}[];
type Open = (dialog: Dialog) => void;
type Go = (path: string) => void;
export function Status({ value }: {
    value: string;
}) { return <span className={`aw-badge ${['Published', 'Connected', 'Active'].includes(value) ? 'green' : value === 'Pending' ? 'orange' : ['Disconnected', 'Inactive'].includes(value) ? 'red' : 'gray'}`}><i />{value}</span>; }
export function Empty({ title, description, action }: {
    title: string;
    description: string;
    action?: ReactNode;
}) { return <div className="aw-empty"><Layers size={30}/><h3>{title}</h3><p>{description}</p>{action}</div>; }
function Devices({ device, setDevice }: {
    device: string;
    setDevice: (value: string) => void;
}) { return <div className="aw-devices">{[{ name: 'Desktop', Icon: Monitor }, { name: 'Tablet', Icon: Tablet }, { name: 'Mobile', Icon: Smartphone }].map(({ name, Icon }) => <button key={name} aria-label={name} title={name} aria-pressed={device === name} className={device === name ? 'active' : ''} onClick={() => setDevice(name)}><Icon size={16}/></button>)}</div>; }
export function AssetHub({ assets, kind, section, query, setQuery, status, setStatus, sort, setSort, list, setList, archived, setArchived, open, go, actions }: {
    assets: Asset[];
    kind: BuilderMode;
    section: string;
    query: string;
    setQuery: (v: string) => void;
    status: string;
    setStatus: (v: string) => void;
    sort: string;
    setSort: (v: string) => void;
    list: boolean;
    setList: (v: boolean) => void;
    archived: boolean;
    setArchived: (v: boolean) => void;
    open: Open;
    go: Go;
    actions: (asset: Asset) => Actions;
}) {
    const filters = [
      ...(query ? [{label:`Search: ${query}`,remove:()=>setQuery('')}] : []),
      ...(status !== 'All Status' ? [{label:status,remove:()=>setStatus('All Status')}] : []),
      ...(sort !== 'Last Updated' ? [{label:`Sort: ${sort}`,remove:()=>setSort('Last Updated')}] : []),
      ...(archived ? [{label:'Archived',remove:()=>setArchived(false)}] : []),
    ];
    return <>
 {kind === 'website' && <><div className="aw-heading"><span className="aw-heading-icon"><LayoutGrid size={26}/></span><div><h1>Websites</h1><p>Create and manage your websites. Choose a template or build your own.</p></div></div><section className="aw-panel aw-template-section"><header><span className="aw-heading-icon"><Layers size={22}/></span><div><h3>Website Templates</h3><p>Choose from starter templates or personalize your business website.</p></div><button className="aw-text-button" onClick={() => go('templates')}>View All Templates <ArrowRight size={14}/></button></header><div className="aw-templates" id="aw-templates"><article className="aw-ai-template bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100/60 border border-indigo-200/60"><span className="aw-ai-spark"><Sparkles size={28}/></span><h3>Build with AI</h3><p>Your business. Your brand. A head start in minutes.</p><ul className="aw-ai-features"><li><Check size={13}/>Personalized page content</li><li><Check size={13}/>Your goals and brand colors</li><li><Check size={13}/>Fully editable layouts</li></ul><button className="aw-primary" onClick={() => open({ type: 'ai' })}>Create with AI ✨</button></article>{templates.map((template, i) => <article key={template}><div className="aw-template-visual"><img src={[images.fitness, images.consultation, images.nutrition, images.agency, images.nutrition][i]} alt={`${template} starter preview`}/><span>{template.split(' ')[0].toUpperCase()}</span></div><h3>{template}</h3><p>{['Perfect for coaches, trainers and online programs.', 'Ideal for restaurants, cafés and local services.', 'Start your product storefront.', 'Showcase your services and grow your clients.', 'Perfect for clinics and healthcare.'][i]}</p><button className="aw-secondary" onClick={() => open({ type: 'create', template })}>Use Template <ArrowRight size={13}/></button></article>)}</div></section></>}
 <section className={kind === 'website' ? 'aw-panel aw-my-websites' : ''}><div className="aw-controls">{kind === 'website' && <h3><LayoutGrid size={19}/>My Websites <span>({assets.length})</span></h3>}<AssetSearch value={query} onChange={setQuery} placeholder={`Search ${section}...`} shortcut/><AssetSelect value={status} onChange={e => setStatus(e)} label={"Asset status"} options={[...['All Status', 'Published', 'Draft'].map(item => ({value:item,label:item}))]}/><AssetSelect value={sort} onChange={e => setSort(e)} label={"Sort assets"} options={[{value:"Last Updated",label:"Last Updated"},{value:"Name",label:"Name"}]}/><button className="aw-text-button" onClick={() => setArchived(!archived)}>{archived ? 'View active' : 'Archived'}</button><div className="aw-view-switch"><button className={!list ? 'active' : ''} aria-label="Grid view" aria-pressed={!list} onClick={() => setList(false)}><LayoutGrid size={17}/></button><button className={list ? 'active' : ''} aria-label="List view" aria-pressed={list} onClick={() => setList(true)}><List size={17}/></button></div></div>
 <FilterChips filters={filters} clear={()=>{setQuery('');setStatus('All Status');setSort('Last Updated');setArchived(false);}}/>
 <div className={`aw-asset-grid ${kind === 'website' ? 'websites' : ''} ${list ? 'list' : ''}`}>{assets.map(item => <article className="aw-asset-card" key={item.id}><button className="aw-asset-image" aria-label={`Open ${item.name}`} onClick={() => go(`${section}/${item.id}`)}><AssetThumbnail asset={item}/></button><div className="aw-card-body"><h3>{item.name}</h3>{kind === 'website' && <p>{item.description}</p>}<div className="aw-card-meta"><span><Layers size={13}/>{item.document.pages.length} {kind === 'funnel' ? 'Steps' : 'Pages'}</span>{item.domain ? <button className="aw-text-button fn-domain-badge" aria-label={`Change domain for ${item.name}`} onClick={() => open({ type: 'domain-select', assetId: item.id })}><Link2 size={13}/>{item.domain}<ChevronDown size={11}/></button> : <button className="aw-text-button" onClick={() => open({ type: 'domain-select', assetId: item.id })}><Link2 size={13}/>Connect domain</button>}<Status value={item.document.funnel.status}/></div><small className="aw-updated"><CalendarDays size={11}/>Last updated {new Date(item.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small><footer><button className="aw-edit" onClick={() => go(`${section}/${item.id}`)}><Pencil size={14}/>{kind === 'funnel' ? 'Edit' : 'Edit Website'}</button>{kind === 'funnel' && <button className="aw-secondary" onClick={() => open({ type: 'preview', assetId: item.id })}><Eye size={14}/>Preview</button>}<OptionsMenu label={`Options for ${item.name}`} actions={actions(item)}/></footer></div></article>)}</div>{!assets.length && <Empty title={archived ? 'No archived assets' : 'No matching ' + section} description="Choose a different filter or create an asset to get started." action={<button className="aw-primary" onClick={() => open({ type: 'create' })}><Plus size={14}/>Create {kind}</button>}/>}</section>
 </>;
}
export function DomainsView({ workspace, setWorkspace, query, setQuery, status, setStatus, go, open }: {
    workspace: Workspace;
    setWorkspace: Dispatch<SetStateAction<Workspace>>;
    query: string;
    setQuery: (v: string) => void;
    status: string;
    setStatus: (v: string) => void;
    go: Go;
    open: Open;
}) {
    const [connection, setConnection] = useState('All Connections'), [selected, setSelected] = useState<string[]>([]), [exportOpen,setExportOpen]=useState(false);
    const domains = workspace.domains.filter(item => item.name.toLowerCase().includes(query.toLowerCase()) && (status === 'All Status' || item.status === status) && (connection === 'All Connections' || workspace.assets.find(asset => asset.id === item.assetId)?.kind === connection));
    const filters = [
      ...(query ? [{label:`Search: ${query}`,remove:()=>setQuery('')}] : []),
      ...(status !== 'All Status' ? [{label:status,remove:()=>setStatus('All Status')}] : []),
      ...(connection !== 'All Connections' ? [{label:connection==='funnel'?'Funnels':'Websites',remove:()=>setConnection('All Connections')}] : []),
    ];
    return <section className="aw-domains-view" aria-label="Domains management"><div className="aw-heading"><span className="aw-heading-icon"><Globe size={26}/></span><div><h1>Domains</h1><p>Connect and manage your domains for funnels and websites.</p></div><button className="aw-primary" onClick={() => open({ type: 'domain' })}><Plus size={16}/>Connect Domain</button></div>
 <div className="aw-metrics domains">{[{ label: 'Total Domains', value: workspace.domains.length, Icon: Link2 }, { label: 'Connected', value: workspace.domains.filter(item => item.status === 'Connected').length, Icon: Globe }, { label: 'SSL Active', value: workspace.domains.filter(item => item.ssl === 'Active').length, Icon: ShieldCheck }].map(({ label, value, Icon }) => <article key={label}><span><Icon size={24}/></span><div><p>{label}</p><strong>{value}</strong><small>{label === 'SSL Active' ? 'Encrypted connections' : 'In your workspace'}</small></div></article>)}</div>
 <section className="aw-panel"><div className="aw-controls"><AssetSearch value={query} onChange={setQuery} placeholder="Search domains..." shortcut/><AssetSelect value={status} onChange={e => setStatus(e)} label={"Domain status"} options={[...['All Status', 'Connected', 'Pending', 'Disconnected'].map(item => ({value:item,label:item}))]}/><AssetSelect value={connection} onChange={e => setConnection(e)} label={"Connection type"} options={[{value:"All Connections",label:"All Connections"},{value:"funnel",label:"Funnels"},{value:"website",label:"Websites"}]}/><button className="aw-secondary aw-export-button" disabled={!domains.length} onClick={()=>setExportOpen(true)}><Download size={14}/>Export</button>{selected.length > 0 && <span className="aw-muted">{selected.length} selected</span>}</div>
 <FilterChips filters={filters} clear={()=>{setQuery('');setStatus('All Status');setConnection('All Connections');}}/>
 <div className="aw-table-wrap"><table><thead><tr><th><input aria-label="Select all domains" type="checkbox" checked={domains.length > 0 && domains.every(item => selected.includes(item.id))} onChange={e => setSelected(e.target.checked ? domains.map(item => item.id) : [])}/></th><th>Domain</th><th>Status</th><th>Connected To</th><th>SSL</th><th>Default</th><th>Actions</th></tr></thead><tbody>{domains.map(domain => { const linked = workspace.assets.find(item => item.id === domain.assetId); return <tr key={domain.id}><td><input type="checkbox" aria-label={`Select ${domain.name}`} checked={selected.includes(domain.id)} onChange={e => setSelected(current => e.target.checked ? [...current, domain.id] : current.filter(id => id !== domain.id))}/></td><td><a href={`https://${domain.name}`} target="_blank" rel="noreferrer">{domain.name}<ExternalLink size={12}/></a></td><td><Status value={domain.status}/></td><td>{linked ? <button className="aw-linked-asset" onClick={() => go(`${linked.kind === 'funnel' ? 'funnels' : 'websites'}/${linked.id}`)}>{linked.kind === 'funnel' ? <Filter size={17}/> : <LayoutGrid size={17}/>}<span><b>{linked.name}</b><small>{linked.document.pages.length} {linked.kind === 'funnel' ? 'Steps' : 'Pages'}</small></span></button> : <span className="aw-muted">—<small>Not connected yet</small></span>}</td><td><span className="aw-ssl"><LockKeyhole size={12}/><Status value={domain.ssl}/></span></td><td><button role="switch" aria-label={`Set ${domain.name} as default`} aria-checked={domain.default} disabled={domain.status !== 'Connected'} className={`aw-default ${domain.default ? 'active' : ''}`} onClick={() => setWorkspace(current => ({ ...current, domains: current.domains.map(item => ({ ...item, default: item.id === domain.id })) }))}><span />{domain.default ? 'Default' : 'Set as default'}</button></td><td><button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${domain.status === 'Connected' ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : domain.status === 'Pending' ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'}`} onClick={() => open({ type: 'domain', domainId: domain.id })}><Settings size={13}/>{domain.status === 'Connected' ? 'Manage' : domain.status === 'Pending' ? 'Configure' : 'Connect'}</button></td></tr>; })}</tbody></table></div>{!domains.length && <Empty title="No domains found" description="Connect a domain or adjust your search filters."/>}<div className="aw-domain-cta"><span><Plus size={25}/></span><div><h3>Connect a new domain</h3><p>Use your own domain and connect it to your funnel or website.</p></div><button className="aw-secondary" onClick={() => open({ type: 'domain' })}><Plus size={15}/>Connect Domain</button></div></section>{exportOpen&&<DomainExportDialog domains={domains} selected={selected} workspace={workspace} close={()=>setExportOpen(false)}/>}</section>;
}
type OverviewProps = {
    asset: Asset;
    kind: BuilderMode;
    section: string;
    tab: string;
    setTab: (v: string) => void;
    activePage?: BuilderPage;
    selected: (id: string) => void;
    device: string;
    setDevice: (v: string) => void;
    editPage: (p: BuilderPage) => void;
    movePage: (from: string, to: string) => void;
    reorder: boolean;
    setReorder: (v: boolean) => void;
    open: Open;
    go: Go;
    publish: () => void;
    assetActions: (a: Asset) => Actions;
    pageActions: (p: BuilderPage) => Actions;
    updateAsset: (id: string, update: (a: Asset) => Asset) => void;
};
export function AssetOverview({ asset, kind, section, tab, setTab, activePage, selected, device, setDevice, editPage, movePage, reorder, setReorder, open, go, publish, assetActions, pageActions, updateAsset }: OverviewProps) {
    const [range,setRange]=useState(()=>rangeFor(30)),[dragged,setDragged]=useState(''),[over,setOver]=useState('');
    return <>
 <div className="aw-breadcrumb">Funnel &amp; Website <ArrowRight size={11}/>{kind === 'funnel' ? 'Funnels' : 'Websites'}<ArrowRight size={11}/><b>{asset.name}</b></div>
 <header className="aw-asset-header"><button className="aw-icon" aria-label="Back to asset list" onClick={() => go(section)}><ArrowLeft size={20}/></button>{kind === 'website' && <img className="aw-header-thumb" src={asset.image} alt=""/>}<div className="aw-title"><div><h1>{asset.name}</h1><button className="aw-icon" aria-label="Rename asset" onClick={() => open({ type: 'rename', assetId: asset.id })}><Pencil size={14}/></button><Status value={asset.document.funnel.status}/></div><div className="aw-domain-link"><Link2 size={13}/>{asset.domain ? <><button className="fn-domain-badge" onClick={()=>open({type:'domain-select',assetId:asset.id})}>{asset.domain}<ChevronDown size={11}/></button></> : <span>No domain connected</span>}<button onClick={() => open({ type: 'domain-select', assetId: asset.id })}><Plus size={12}/>Connect Domain</button></div></div><div className="aw-actions"><button className="aw-secondary" onClick={() => open({ type: 'preview', assetId: asset.id, pageId: activePage?.id })}><Eye size={15}/>Preview {kind === 'funnel' ? 'Funnel' : ''}</button>{kind === 'website' && <button className="aw-secondary" onClick={() => open({ type: 'domain-select', assetId: asset.id })}><Link2 size={14}/>Domain</button>}<div className="aw-split"><button className="aw-primary" onClick={publish}><ExternalLink size={14}/>Publish {kind === 'funnel' ? 'Funnel' : ''}</button><OptionsMenu label="Publish options" actions={[{ label: 'Publish', onSelect: publish }, { label: 'Save as draft', onSelect: () => updateAsset(asset.id, item => ({ ...item, document: { ...item.document, funnel: { ...item.document.funnel, status: 'Draft' } } })) }]}/></div><OptionsMenu label="Asset options" actions={assetActions(asset)}/></div></header>
 <nav className="aw-subtabs" aria-label="Asset management">{(kind === 'funnel' ? ['Steps', 'Settings', 'Analytics', 'Leads', 'Integrations'] : ['Pages', 'Global Settings', 'Theme', 'Navigation']).map(label => <button key={label} className={tab === label ? 'active' : ''} onClick={() => setTab(label)}>{label === 'Steps' || label === 'Pages' ? <Layers size={14}/> : <Settings size={14}/>} {label}</button>)}</nav>
 {tab === 'Steps' ? <><div className="aw-step-flow">{asset.document.pages.map((page, i) => <div className="aw-step-pair" key={page.id}><article className={'aw-step-card '+(over===page.id&&dragged!==page.id?'fn-step-over':'')} draggable onDragStart={e=>{setDragged(page.id);e.dataTransfer.setData('text/gos-page',page.id);e.dataTransfer.effectAllowed='move';}} onDragEnd={()=>{setDragged('');setOver('');}} onDragOver={e=>{if(e.dataTransfer.types.includes('text/gos-page')){e.preventDefault();setOver(page.id);}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOver('');}} onDrop={e=>{e.preventDefault();movePage(e.dataTransfer.getData('text/gos-page'),page.id);setDragged('');setOver('');}}><header><span>{i + 1}</span><b>{page.name}</b><OptionsMenu label={`Options for ${page.name}`} actions={pageActions(page)}/></header><button className="aw-step-image" onClick={() => open({ type: 'preview', assetId: asset.id, pageId: page.id })}><StepThumbnail page={page} image={asset.image}/></button><Status value={page.status ?? asset.document.funnel.status}/><small>{page.path}</small><button className="aw-edit-step" onClick={() => editPage(page)}><Pencil size={12}/>Edit Step</button><footer><span><Eye size={12}/>{asset.sampleData ? ['1.2K','980','540','420','380'][i]??'—' : '—'} visits</span><span><BarChart3 size={12}/>{asset.sampleData ? ['24','42','68','55','91'][i]??'—' : '—'}%</span></footer>{reorder && <div className="aw-reorder-buttons"><button disabled={i === 0} onClick={() => movePage(page.id, asset.document.pages[i - 1].id)}>← Move</button><button disabled={i === asset.document.pages.length - 1} onClick={() => movePage(page.id, asset.document.pages[i + 1].id)}>Move →</button></div>}</article>{i < asset.document.pages.length - 1 && <ArrowRight className="aw-step-arrow" size={17}/>}</div>)}<button className="aw-add-step" aria-label="Add Step" onClick={() => open({ type: 'add', assetId: asset.id })}><span><Plus size={25}/></span><b>Add Step</b><small>Choose a page type<br />or start from a template</small></button></div><div className="aw-utilities">{[{ label: 'Add Step', hint: 'Add a new step to this funnel', Icon: Plus, action: () => open({ type: 'add', assetId: asset.id }) }, { label: 'Reorder Steps', hint: 'Drag steps or use move buttons', Icon: GripVertical, action: () => setReorder(!reorder) }, { label: 'Funnel Settings', hint: 'Name, domain, SEO and more', Icon: Settings, action: () => setTab('Settings') }, { label: 'Delete Funnel', hint: 'Remove this funnel', Icon: Trash2, action: () => open({ type: 'delete', assetId: asset.id }) }].map(({ label, hint, Icon, action }) => <button className={label === 'Delete Funnel' ? 'danger' : ''} key={label} onClick={action}><span><Icon size={20}/></span><div><b>{label}</b><small>{hint}</small></div></button>)}</div><FunnelPerformance asset={asset} range={range} change={setRange}/></> : tab === 'Pages' ? <div className="aw-page-management"><aside className="aw-panel aw-page-list"><header><h3>Pages <span>({asset.document.pages.length})</span></h3><button className="aw-primary" onClick={() => open({ type: 'add', assetId: asset.id })}><Plus size={14}/>Add Page</button></header>{asset.document.pages.map((page, i) => <div key={page.id} className={`aw-page-row ${activePage?.id === page.id ? 'active' : ''}`} draggable onDragStart={e => e.dataTransfer.setData('text/gos-page', page.id)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); movePage(e.dataTransfer.getData('text/gos-page'), page.id); }}><GripVertical size={14}/><button className="aw-page-select" onClick={() => selected(page.id)}><img src={asset.image} alt=""/><span><b>{page.name}</b><small>{page.path}</small></span></button><Status value={page.status ?? asset.document.funnel.status}/><OptionsMenu label={`${page.name} options`} actions={pageActions(page)}/><div className="aw-page-move"><button aria-label={`Move ${page.name} up`} disabled={i === 0} onClick={() => movePage(page.id, asset.document.pages[i - 1].id)}>↑</button><button aria-label={`Move ${page.name} down`} disabled={i === asset.document.pages.length - 1} onClick={() => movePage(page.id, asset.document.pages[i + 1].id)}>↓</button></div></div>)}</aside><section className="aw-panel aw-preview-panel"><header><div><b>{activePage?.name}</b><small>{activePage?.path}</small></div><Devices device={device} setDevice={setDevice}/><button className="aw-primary" onClick={() => activePage && editPage(activePage)}><Pencil size={14}/>Edit Page</button></header>{activePage && <PagePreview asset={asset} page={activePage} device={device} onNavigate={selected}/>}</section></div> : tab === 'Analytics' ? <FunnelAnalytics asset={asset} range={range} change={setRange}/> : tab === 'Leads' ? <FunnelLeads asset={asset}/> : tab === 'Integrations' ? <FunnelIntegrations asset={asset} update={updateAsset}/> : <section className="aw-panel aw-settings"><h2>{tab}</h2>{tab === 'Theme' ? <><label>Primary brand color<input type="color" value={asset.settings.color} onChange={e => updateAsset(asset.id, item => ({ ...item, settings: { ...item.settings, color: e.target.value } }))}/></label><p>Your brand color is used in the live page preview.</p></> : tab === 'Navigation' ? <><label>Navigation labels<textarea value={asset.settings.navigation} onChange={e => updateAsset(asset.id, item => ({ ...item, settings: { ...item.settings, navigation: e.target.value } }))}/></label><p>Separate labels with commas. Labels matching a page name link to that page.</p></> : <><label>{kind === 'funnel' ? 'Funnel' : 'Website'} name<input value={asset.name} onChange={e => updateAsset(asset.id, item => ({ ...item, name: e.target.value, document: { ...item.document, funnel: { ...item.document.funnel, name: e.target.value } } }))}/></label><label>Default SEO title<input value={asset.settings.seo} onChange={e => updateAsset(asset.id, item => ({ ...item, settings: { ...item.settings, seo: e.target.value } }))}/></label><label>Conversion goal<AssetSelect value={asset.document.funnel.goal} onChange={e => updateAsset(asset.id, item => ({ ...item, document: { ...item.document, funnel: { ...item.document.funnel, goal: e } } }))} options={[...['Lead generation', 'Sales', 'Bookings'].map(goal => ({value:goal,label:goal}))]}/></label><button className="aw-secondary" onClick={() => open({ type: 'domain-select', assetId: asset.id })}><Globe size={15}/>Connect domain</button></>}<p className="aw-saved"><Check size={14}/>Changes saved in this browser</p></section>}
 </>;
}
function StepThumbnail({ page, image }: {
    page: BuilderPage;
    image: string;
}) { const first = page.sections[0]; return first?.type === 'Hero' ? <img src={image} alt={`${page.name} preview`}/> : <div className="aw-mini-step"><span>{first?.type === 'Booking' ? <CalendarDays size={32}/> : first?.type === 'Form' ? <FileText size={32}/> : <Check size={32}/>}</span><h3>{first?.content.title || page.name}</h3><p>{first?.content.body?.slice(0, 85)}</p>{first?.type === 'Form' ? <><i>Your name</i><i>Email address</i><b>Get My Plan</b></> : first?.type === 'Booking' ? <div className="aw-mini-calendar">{Array.from({ length: 28 }, (_, i) => <i key={i}>{i + 1}</i>)}</div> : <b>Continue →</b>}</div>; }
export function AssetThumbnail({ asset }: {
    asset: Asset;
}) {
    const nutrition = asset.name.toLowerCase().includes('nutrition'), agency = asset.name.toLowerCase().includes('agency') || asset.name.toLowerCase().includes('consultation');
    return <div className={`aw-thumbnail ${nutrition ? 'nutrition' : agency ? 'agency' : 'fitness'}`} aria-hidden="true"><div className="aw-thumb-nav"><b>{nutrition ? 'NutriPro' : agency ? 'CoachJoe' : 'FITZONE'}</b><span>Home　 Programs　 About</span><i>Book Now</i></div><div className="aw-thumb-hero"><img src={asset.image} alt=""/><div><h4>{nutrition ? 'Nutrition Made Simple' : agency ? 'Let’s Grow Your Business' : 'Transform Your Life'}</h4><p>{nutrition ? 'Custom nutrition plans for a healthier you.' : 'Personalized coaching. Real results.'}</p><b>{nutrition ? 'Get Started' : 'Book a Free Session'}</b></div></div></div>;
}
export function PagePreview({ asset, page, device, onNavigate }: {
    asset: Asset;
    page: BuilderPage;
    device: string;
    onNavigate: (id: string) => void;
}) {
    const previewAction = () => showToast.info('This is a workspace preview. No booking or payment is created.');
    return <div className={`aw-live-preview ${device.toLowerCase()}`} style={{ '--preview-accent': asset.settings.color, '--fb-accent': asset.settings.color, '--fb-heading-font': asset.document.theme?.font ?? 'Manrope' } as React.CSSProperties}>
 <div className="aw-browser"><i /><i /><i /><span>{asset.domain || 'Unconnected domain'}{page.path}</span></div>
 <div className="aw-preview-site" style={{ backgroundColor: page.backgroundColor ?? '#ffffff' }}>
 {page.showHeader && <nav><b>{asset.name.split(' ')[0].toUpperCase()}</b><div>{asset.settings.navigation.split(',').map((label, i) => { const match = asset.document.pages.find(p => p.name.toLowerCase() === label.trim().toLowerCase()); return <button key={i} onClick={() => { if (match)
        onNavigate(match.id); }}>{label.trim()}</button>; })}</div></nav>}
 {page.hideOnMobile && device === 'Mobile' ? <Empty title="Hidden on mobile" description="This page is hidden at this breakpoint."/> : page.sections.map(section => <section key={section.id} className={section.type === 'Hero' ? 'aw-preview-hero' : 'aw-preview-content'} style={{ backgroundColor: section.type === 'Hero' ? '#080e19' : section.styles.backgroundColor, padding: section.styles.padding + 'px', textAlign: section.styles.textAlign.toLowerCase() as React.CSSProperties['textAlign'], display: section.styles.visibility === 'Hidden' || (section.styles.visibility === 'Desktop only' && device !== 'Desktop') || (section.styles.visibility === 'Tablet only' && device !== 'Tablet') || (section.styles.visibility === 'Mobile only' && device !== 'Mobile') ? 'none' : undefined }}>
 {section.type === 'Hero' ? <><img src={page.featuredImage || asset.image} alt=""/><div><small>TRANSFORM YOUR LIFE</small><h2>{section.content.title}</h2><p>{section.content.body}</p>{section.content.button && <button onClick={previewAction}>{section.content.button}<ArrowRight size={14}/></button>}</div></> : <SectionPreview item={section} onAction={previewAction} onImagePick={() => { }} onImageDrop={event => event.preventDefault()} onNotify={message => showToast.info(message)}/>}
 </section>)}
 {page.showFooter && <footer>{asset.name} · Built for your growth</footer>}</div></div>;
}
