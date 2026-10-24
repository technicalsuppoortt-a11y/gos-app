import { PublishedAssetLink } from './PublishedAssetLink';
import { AssetAsyncButton } from './AssetAsyncButton';
import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import {OrderedElementParts} from './element-reordering';
import type {BuilderSection} from './BuilderWorkspace';
import {publishedPageTemplates} from './admin/template-library';
import {PageTemplateCards} from './PageTemplateLibrary';
import type {PageTemplate} from './page-templates';
import { FunnelAnalytics, FunnelIntegrations, FunnelLeads, FunnelPerformance } from './FunnelInsights';
import { rangeFor } from './funnel-data';
import { DomainExportDialog } from './DomainExportDialog';
import { AssetSelect, AssetSearch, FilterChips } from './AssetControls';
import { useState, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, backendError } from '../backend/firebase';
import { SITE_DOMAINS, mapFirestoreDomainToModel, normalizeHost, updateSiteDomain, deleteSiteDomain, toggleSiteDomainStatus } from '../backend/siteDomains';
import { Modal } from './settings/kit';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, Check, ChevronDown, Download, ExternalLink, Eye, FileText, Filter, Globe, GripVertical, LayoutGrid, Layers, Link2, List, LoaderCircle, LockKeyhole, Monitor, Pencil, Plus, Settings, ShieldCheck, Smartphone, Sparkles, Tablet, Trash2 } from 'lucide-react';
import { AssetOptionsMenu as OptionsMenu } from './AssetOptionsMenu';
import { showToast } from '../utils/toast';
import { SectionPreview } from './BuilderWorkspace';
import type { BuilderPage } from './BuilderWorkspace';
import type { Asset, BuilderMode, Dialog, Domain, Workspace } from './asset-model';
type Actions = {
    label: string;
    onSelect: () => void;
}[];
type Open = (dialog: Dialog) => void;
type Go = (path: string) => void;
export function Status({ value }: {
    value: string;
}) {
  useUILanguage(); return <span className={`aw-badge ${['Published', 'Connected', 'Active'].includes(value) ? 'green' : value === 'Pending' ? 'orange' : ['Disconnected', 'Inactive'].includes(value) ? 'red' : 'gray'}`}><i />{localizeNode(value)}</span>; }
export function Empty({ title, description, action }: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
  useUILanguage(); return <div className="aw-empty"><Layers size={30}/><h3>{localizeNode(title)}</h3><p>{localizeNode(description)}</p>{localizeNode(action)}</div>; }
function Devices({ device, setDevice }: {
    device: string;
    setDevice: (value: string) => void;
}) {
  useUILanguage(); return <div className="aw-devices">{localizeNode([{ name: 'Desktop', Icon: Monitor }, { name: 'Tablet', Icon: Tablet }, { name: 'Mobile', Icon: Smartphone }].map(({ name, Icon }) => <button key={name} aria-label={translateText(name)} title={translateText(name)} aria-pressed={device === name} className={device === name ? 'active' : ''} onClick={() => setDevice(name)}><Icon size={16}/></button>))}</div>; }
export function AssetHub({ installTemplate, assets, kind, section, query, setQuery, status, setStatus, sort, setSort, list, setList, archived, setArchived, open, go, actions }: {
    installTemplate: (template:PageTemplate)=>void | Promise<unknown>;
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
  useUILanguage();
    const filters = [
      ...(query ? [{label:`Search: ${query}`,remove:()=>setQuery('')}] : []),
      ...(status !== 'All Status' ? [{label:status,remove:()=>setStatus('All Status')}] : []),
      ...(sort !== 'Last Updated' ? [{label:`Sort: ${sort}`,remove:()=>setSort('Last Updated')}] : []),
      ...(archived ? [{label:'Archived',remove:()=>setArchived(false)}] : []),
    ];
    return <>
 {localizeNode(kind === 'website' && <><div className="aw-heading"><span className="aw-heading-icon"><LayoutGrid size={26}/></span><div><h1>{translateText("Websites")}</h1><p>{translateText("Create and manage your websites. Choose a template or build your own.")}</p></div></div><section className="aw-panel aw-template-section"><header><span className="aw-heading-icon"><Layers size={22}/></span><div><h3>{translateText("Website Templates")}</h3><p>{translateText("Choose from starter templates or personalize your business website.")}</p></div><button className="aw-text-button" onClick={() => go(section+'?tab=templates')}>{translateText("View All Templates ")}<ArrowRight size={14}/></button></header><div className="aw-templates" id="aw-templates"><article className="aw-ai-template bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100/60 border border-indigo-200/60"><span className="aw-ai-spark"><Sparkles size={28}/></span><h3>{translateText("Build with AI")}</h3><p>{translateText("Your business. Your brand. A head start in minutes.")}</p><ul className="aw-ai-features"><li><Check size={13}/>{translateText("Personalized page content")}</li><li><Check size={13}/>{translateText("Your goals and brand colors")}</li><li><Check size={13}/>{translateText("Fully editable layouts")}</li></ul><button className="aw-primary" onClick={() => open({ type: 'ai' })}>{translateText("Create with AI ✨")}</button></article><PageTemplateCards templates={publishedPageTemplates().filter(template=>template.mode==='website')} install={installTemplate}/></div></section></>)}
 <section className={kind === 'website' ? 'aw-panel aw-my-websites' : ''}><div className="aw-controls">{localizeNode(kind === 'website' && <h3><LayoutGrid size={19}/>{translateText("My Websites ")}<span>({localizeNode(assets.length)})</span></h3>)}<AssetSearch value={query} onChange={setQuery} placeholder={translateText(`Search ${section}...`)} shortcut/><AssetSelect value={status} onChange={e => setStatus(e)} label={"Asset status"} options={[...['All Status', 'Published', 'Draft'].map(item => ({value:item,label:item}))]}/><AssetSelect value={sort} onChange={e => setSort(e)} label={"Sort assets"} options={[{value:"Last Updated",label:"Last Updated"},{value:"Name",label:"Name"}]}/><button className="aw-text-button" onClick={() => setArchived(!archived)}>{localizeNode(archived ? 'View active' : 'Archived')}</button><div className="aw-view-switch"><button className={!list ? 'active' : ''} aria-label={translateText("Grid view")} aria-pressed={!list} onClick={() => setList(false)}><LayoutGrid size={17}/></button><button className={list ? 'active' : ''} aria-label={translateText("List view")} aria-pressed={list} onClick={() => setList(true)}><List size={17}/></button></div></div>
 <FilterChips filters={filters} clear={()=>{setQuery('');setStatus('All Status');setSort('Last Updated');setArchived(false);}}/>
 <div className={`aw-asset-grid ${kind === 'website' ? 'websites' : ''} ${list ? 'list' : ''}`}>{localizeNode(assets.map(item => <article className="aw-asset-card" key={item.id}><button className="aw-asset-image" aria-label={translateText(`Open ${item.name}`)} onClick={() => go(`${section}/${item.id}`)}><AssetThumbnail asset={item}/></button><div className="aw-card-body"><h3>{localizeNode(item.name)}</h3>{localizeNode(kind === 'website' && <p>{localizeNode(item.description)}</p>)}<div className="aw-card-meta"><span><Layers size={13}/>{localizeNode(item.document.pages.length)} {localizeNode(kind === 'funnel' ? 'Steps' : 'Pages')}</span>{localizeNode(item.domain ? <button className="aw-text-button fn-domain-badge" aria-label={translateText(`Change domain for ${item.name}`)} onClick={() => open({ type: 'domain-select', assetId: item.id })}><Link2 size={13}/>{localizeNode(item.domain)}<ChevronDown size={11}/></button> : <button className="aw-text-button" onClick={() => open({ type: 'domain-select', assetId: item.id })}><Link2 size={13}/>{translateText("Connect domain")}</button>)}<Status value={item.document.funnel.status}/></div><PublishedAssetLink asset={item} showUrl/><small className="aw-updated"><CalendarDays size={11}/>{translateText("Last updated ")}{localizeNode(new Date(item.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}</small><footer><button className="aw-edit" onClick={() => go(`${section}/${item.id}`)}><Pencil size={14}/>{localizeNode(kind === 'funnel' ? 'Edit' : 'Edit Website')}</button>{localizeNode(kind === 'funnel' && <button className="aw-secondary" onClick={() => open({ type: 'preview', assetId: item.id })}><Eye size={14}/>{translateText("Preview")}</button>)}<OptionsMenu label={`Options for ${item.name}`} actions={actions(item)}/></footer></div></article>))}</div>{localizeNode(!assets.length && <Empty title={translateText(archived ? 'No archived assets' : 'No matching ' + section)} description="Choose a different filter or create an asset to get started." action={<button className="aw-primary" onClick={() => open({ type: 'create' })}><Plus size={14}/>{translateText("Create ")}{localizeNode(kind)}</button>}/>)}</section>
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
  useUILanguage();
    const [connection, setConnection] = useState('All Connections'), [selected, setSelected] = useState<string[]>([]), [exportOpen,setExportOpen]=useState(false);
    const [liveDomains, setLiveDomains] = useState<Domain[]>([]);

    const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
    const [editTargetAssetId, setEditTargetAssetId] = useState<string>('');
    const [editStatus, setEditStatus] = useState<string>('Connected');
    const [editDefault, setEditDefault] = useState<boolean>(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);
    const [deleteSaving, setDeleteSaving] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [togglingId, setTogglingId] = useState<string>('');

    useEffect(() => {
      const unsub = onSnapshot(collection(db, SITE_DOMAINS), snapshot => {
        const live: Domain[] = [];
        snapshot.forEach(docSnap => {
          live.push(mapFirestoreDomainToModel(docSnap.id, docSnap.data()));
        });
        setLiveDomains(live);
      }, err => {
        console.warn('[DomainsView] site_domains sync note:', err);
      });
      return () => unsub();
    }, []);

    const allDomains = useMemo(() => {
      const map = new Map<string, Domain>();
      (workspace?.domains || []).forEach(d => {
        if (d && d.name) map.set(normalizeHost(d.name), d);
      });
      liveDomains.forEach(ld => {
        const clean = normalizeHost(ld.name);
        const existing = map.get(clean);
        map.set(clean, {
          ...existing,
          ...ld,
          id: existing?.id || ld.id,
          assetId: ld.assetId || existing?.assetId || '',
          default: existing?.default ?? ld.default
        });
      });
      return Array.from(map.values());
    }, [workspace?.domains, liveDomains]);

    const handleSetDefault = async (domainId: string, domainName: string) => {
      if (workspace && Array.isArray(workspace.domains)) {
        setWorkspace(current => ({
          ...current,
          domains: current.domains.map(item => ({ ...item, default: item.id === domainId }))
        }));
      }
      try {
        await setDoc(doc(db, SITE_DOMAINS, normalizeHost(domainName)), { default: true }, { merge: true });
        showToast.success(`Set ${domainName} as default domain.`);
      } catch (err) {
        showToast.error(backendError(err));
      }
    };

    const handleToggleStatus = async (domain: Domain) => {
      if (togglingId) return;
      setTogglingId(domain.id);
      try {
        const nextStatus = await toggleSiteDomainStatus(domain.name, domain.status, domain.assetId);
        setWorkspace(current => ({
          ...current,
          domains: (current.domains || []).map(d =>
            d.id === domain.id || normalizeHost(d.name) === normalizeHost(domain.name)
              ? { ...d, status: nextStatus, ssl: nextStatus === 'Connected' ? 'Active' : 'Inactive' }
              : d
          )
        }));
        setLiveDomains(current =>
          current.map(d =>
            d.id === domain.id || normalizeHost(d.name) === normalizeHost(domain.name)
              ? { ...d, status: nextStatus, ssl: nextStatus === 'Connected' ? 'Active' : 'Inactive' }
              : d
          )
        );
        showToast.success(nextStatus === 'Connected' ? `Domain ${domain.name} activated successfully.` : `Domain ${domain.name} deactivated.`);
      } catch (err) {
        showToast.error(backendError(err));
      } finally {
        setTogglingId('');
      }
    };

    const openEditModal = (domain: Domain) => {
      setEditingDomain(domain);
      setEditTargetAssetId(domain.assetId || '');
      setEditStatus(domain.status === 'Connected' ? 'Connected' : 'Disconnected');
      setEditDefault(Boolean(domain.default));
      setEditError('');
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingDomain || editSaving) return;
      setEditSaving(true);
      setEditError('');
      try {
        const prevAssetId = editingDomain.assetId;
        const newStatus = editStatus as 'Connected' | 'Pending' | 'Disconnected';
        await updateSiteDomain(
          editingDomain.name,
          {
            funnelId: editTargetAssetId,
            status: newStatus,
            default: editDefault,
          },
          prevAssetId
        );

        setWorkspace(current => ({
          ...current,
          domains: (current.domains || []).map(d => {
            const isTarget = d.id === editingDomain.id || normalizeHost(d.name) === normalizeHost(editingDomain.name);
            if (isTarget) {
              return {
                ...d,
                assetId: editTargetAssetId,
                status: newStatus,
                ssl: newStatus === 'Connected' ? 'Active' : 'Inactive',
                default: editDefault ? true : (d.default && !editDefault ? false : d.default)
              };
            }
            return editDefault ? { ...d, default: false } : d;
          }),
          assets: (current.assets || []).map(asset => {
            if (prevAssetId && asset.id === prevAssetId && editTargetAssetId !== prevAssetId) {
              return { ...asset, domain: '' };
            }
            if (editTargetAssetId && asset.id === editTargetAssetId) {
              return { ...asset, domain: editingDomain.name };
            }
            return asset;
          })
        }));

        setLiveDomains(current =>
          current.map(d => {
            const isTarget = d.id === editingDomain.id || normalizeHost(d.name) === normalizeHost(editingDomain.name);
            if (isTarget) {
              return {
                ...d,
                assetId: editTargetAssetId,
                status: newStatus,
                ssl: newStatus === 'Connected' ? 'Active' : 'Inactive',
                default: editDefault ? true : (d.default && !editDefault ? false : d.default)
              };
            }
            return editDefault ? { ...d, default: false } : d;
          })
        );

        showToast.success(`Domain ${editingDomain.name} updated successfully.`);
        setEditingDomain(null);
      } catch (err) {
        setEditError(backendError(err));
        showToast.error(backendError(err));
      } finally {
        setEditSaving(false);
      }
    };

    const handleConfirmDelete = async () => {
      if (!deletingDomain || deleteSaving) return;
      setDeleteSaving(true);
      setDeleteError('');
      try {
        await deleteSiteDomain(deletingDomain.name, {
          funnelId: deletingDomain.assetId
        });

        setWorkspace(current => ({
          ...current,
          domains: (current.domains || []).filter(d => d.id !== deletingDomain.id && normalizeHost(d.name) !== normalizeHost(deletingDomain.name)),
          assets: (current.assets || []).map(asset => {
            if (deletingDomain.assetId && asset.id === deletingDomain.assetId) {
              return { ...asset, domain: '' };
            }
            return asset;
          })
        }));

        setLiveDomains(current =>
          current.filter(d => d.id !== deletingDomain.id && normalizeHost(d.name) !== normalizeHost(deletingDomain.name))
        );

        setSelected(current => current.filter(id => id !== deletingDomain.id));

        showToast.success(`Domain ${deletingDomain.name} deleted successfully.`);
        setDeletingDomain(null);
      } catch (err) {
        setDeleteError(backendError(err));
        showToast.error(backendError(err));
      } finally {
        setDeleteSaving(false);
      }
    };

    const domains = allDomains.filter(item => item.name.toLowerCase().includes(query.toLowerCase()) && (status === 'All Status' || item.status === status) && (connection === 'All Connections' || (workspace?.assets || []).find(asset => asset.id === item.assetId)?.kind === connection));
    const filters = [
      ...(query ? [{label:`Search: ${query}`,remove:()=>setQuery('')}] : []),
      ...(status !== 'All Status' ? [{label:status,remove:()=>setStatus('All Status')}] : []),
      ...(connection !== 'All Connections' ? [{label:connection==='funnel'?'Funnels':'Websites',remove:()=>setConnection('All Connections')}] : []),
    ];
    return <section className="aw-domains-view" aria-label={translateText("Domains management")}><div className="aw-heading"><span className="aw-heading-icon"><Globe size={26}/></span><div><h1>{translateText("Domains")}</h1><p>{translateText("Connect and manage your domains for funnels and websites.")}</p></div><button className="aw-primary" onClick={() => open({ type: 'domain' })}><Plus size={16}/>{translateText("Connect Domain")}</button></div>
    <div className="aw-metrics domains">{localizeNode([{ label: 'Total Domains', value: allDomains.length, Icon: Link2 }, { label: 'Connected', value: allDomains.filter(item => item.status === 'Connected').length, Icon: Globe }, { label: 'SSL Active', value: allDomains.filter(item => item.ssl === 'Active').length, Icon: ShieldCheck }].map(({ label, value, Icon }) => <article key={label}><span><Icon size={24}/></span><div><p>{localizeNode(label)}</p><strong>{localizeNode(value)}</strong><small>{localizeNode(label === 'SSL Active' ? 'Encrypted connections' : 'In your workspace')}</small></div></article>))}</div>
  <section className="aw-panel"><div className="aw-controls"><AssetSearch value={query} onChange={setQuery} placeholder={translateText("Search domains...")} shortcut/><AssetSelect value={status} onChange={e => setStatus(e)} label={"Domain status"} options={[...['All Status', 'Connected', 'Pending', 'Disconnected'].map(item => ({value:item,label:item}))]}/><AssetSelect value={connection} onChange={e => setConnection(e)} label={"Connection type"} options={[{value:"All Connections",label:"All Connections"},{value:"funnel",label:"Funnels"},{value:"website",label:"Websites"}]}/><button className="aw-secondary aw-export-button" disabled={!domains.length} onClick={()=>setExportOpen(true)}><Download size={14}/>{translateText("Export")}</button>{localizeNode(selected.length > 0 && <span className="aw-muted">{localizeNode(selected.length)}{translateText(" selected")}</span>)}</div>
  <FilterChips filters={filters} clear={()=>{setQuery('');setStatus('All Status');setConnection('All Connections');}} />
  <div className="aw-table-wrap"><table><thead><tr><th className="text-center" style={{ width: 44 }}><input aria-label={translateText("Select all domains")} type="checkbox" checked={domains.length > 0 && domains.every(item => selected.includes(item.id))} onChange={e => setSelected(e.target.checked ? domains.map(item => item.id) : [])}/></th><th className="text-start">{translateText("Domain")}</th><th className="text-center">{translateText("Status")}</th><th className="text-start">{translateText("Connected To")}</th><th className="text-center">{translateText("SSL")}</th><th className="text-center">{translateText("Default")}</th><th className="text-center" style={{ width: 140 }}>{translateText("Actions")}</th></tr></thead><tbody>{localizeNode(domains.map(domain => { const linked = workspace.assets.find(item => item.id === domain.assetId); return <tr key={domain.id}><td className="text-center"><input type="checkbox" aria-label={translateText(`Select ${domain.name}`)} checked={selected.includes(domain.id)} onChange={e => setSelected(current => e.target.checked ? [...current, domain.id] : current.filter(id => id !== domain.id))}/></td><td className="text-start"><a href={`https://${domain.name}`} target="_blank" rel="noreferrer">{localizeNode(domain.name)}<ExternalLink size={12}/></a></td><td className="text-center"><button type="button" onClick={() => handleToggleStatus(domain)} disabled={togglingId === domain.id} title={domain.status === 'Connected' ? translateText("Click to deactivate domain") : translateText("Click to activate domain")} aria-label={translateText(`Toggle status for ${domain.name}`)} className="inline-flex items-center justify-center cursor-pointer transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none">{togglingId === domain.id ? <span className="aw-badge gray inline-flex items-center gap-1.5 py-0.5 px-2"><LoaderCircle size={12} className="animate-spin" /><span className="text-xs">{translateText("Updating...")}</span></span> : <Status value={domain.status} />}</button></td><td className="text-start">{localizeNode(linked ? <button className="aw-linked-asset" onClick={() => go(`${linked.kind === 'funnel' ? 'funnels' : 'websites'}/${linked.id}`)}>{localizeNode(linked.kind === 'funnel' ? <Filter size={17}/> : <LayoutGrid size={17}/>)}<span><b>{localizeNode(linked.name)}</b><small>{localizeNode(linked.document.pages.length)} {localizeNode(linked.kind === 'funnel' ? 'Steps' : 'Pages')}</small></span></button> : <span className="aw-muted">—<small>{translateText("Not connected yet")}</small></span>)}</td><td className="text-center"><span className="aw-ssl inline-flex items-center justify-center"><LockKeyhole size={12}/><Status value={domain.ssl}/></span></td><td className="text-center"><AssetAsyncButton busyText="Saving..." role="switch" aria-label={translateText(`Set ${domain.name} as default`)} aria-checked={domain.default} disabled={domain.status !== 'Connected'} className={`aw-default mx-auto ${domain.default ? 'active' : ''}`} onClick={() => handleSetDefault(domain.id, domain.name)}><span />{localizeNode(domain.default ? 'Default' : 'Set as default')}</AssetAsyncButton></td><td className="text-center"><div className="flex items-center justify-center gap-1"><button type="button" className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${domain.status === 'Connected' ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : domain.status === 'Pending' ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'}`} onClick={() => open({ type: 'domain', domainId: domain.id })} title={translateText(domain.status === 'Connected' ? 'Manage DNS' : domain.status === 'Pending' ? 'Configure DNS' : 'Connect DNS')}><Settings size={13}/>{localizeNode(domain.status === 'Connected' ? 'Manage' : domain.status === 'Pending' ? 'Configure' : 'Connect')}</button><button type="button" className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title={translateText("Edit domain details")} aria-label={translateText(`Edit ${domain.name}`)} onClick={() => openEditModal(domain)}><Pencil size={14}/></button><button type="button" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title={translateText("Delete domain")} aria-label={translateText(`Delete ${domain.name}`)} onClick={() => { setDeletingDomain(domain); setDeleteError(''); }}><Trash2 size={14}/></button></div></td></tr>; }))}</tbody></table></div>{localizeNode(!domains.length && <Empty title={translateText("No domains found")} description="Connect a domain or adjust your search filters."/>)}<div className="aw-domain-cta"><span><Plus size={25}/></span><div><h3>{translateText("Connect a new domain")}</h3><p>{translateText("Use your own domain and connect it to your funnel or website.")}</p></div><button className="aw-secondary" onClick={() => open({ type: 'domain' })}><Plus size={15}/>{translateText("Connect Domain")}</button></div></section>{localizeNode(exportOpen&&<DomainExportDialog domains={domains} selected={selected} workspace={workspace} close={()=>setExportOpen(false)}/>)}{localizeNode(editingDomain && <Modal title={translateText(`Edit Domain — ${editingDomain.name}`)} close={() => !editSaving && setEditingDomain(null)}><form className="aw-modal-body" onSubmit={handleSaveEdit}><p>{translateText("Update connected funnel or website target, active routing status, and default domain settings.")}</p><label>{translateText("Domain host")}<input type="text" value={editingDomain.name} disabled readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed"/></label><label>{translateText("Connected to")}<AssetSelect value={editTargetAssetId} onChange={setEditTargetAssetId} label="Connected target asset" options={[{ value: '', label: translateText('None (Unconnected / Standalone)') }, ...workspace.assets.filter(item => !item.archived).map(item => ({ value: item.id, label: `${item.kind === 'funnel' ? 'Funnel' : 'Website'} · ${item.name}` }))]}/></label><label>{translateText("Routing Status")}<AssetSelect value={editStatus} onChange={setEditStatus} label="Domain status" options={[{ value: 'Connected', label: translateText('Connected (Active & Routing Traffic)') }, { value: 'Disconnected', label: translateText('Disconnected (Paused / Inactive)') }]} /></label><div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 8 }}><input id="edit-domain-default-cb" type="checkbox" checked={editDefault} onChange={e => setEditDefault(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} /><label htmlFor="edit-domain-default-cb" style={{ margin: 0, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>{translateText("Set as primary default workspace domain")}</label></div>{localizeNode(editError && <p className="aw-error" role="alert">{localizeNode(editError)}</p>)}<footer><button type="button" className="aw-secondary" disabled={editSaving} onClick={() => setEditingDomain(null)}>{translateText("Cancel")}</button><button type="submit" className="aw-primary" disabled={editSaving} aria-busy={editSaving}>{editSaving ? <><LoaderCircle size={14} className="animate-spin"/>{translateText("Saving...")}</> : translateText("Save Changes")}</button></footer></form></Modal>)}{localizeNode(deletingDomain && <Modal title={translateText("Delete Domain")} close={() => !deleteSaving && setDeletingDomain(null)}><div className="aw-modal-body"><p>{translateText("Are you sure you want to delete ")}<strong>{localizeNode(deletingDomain.name)}</strong>?</p><p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{translateText("This will permanently remove the domain configuration from your workspace, disconnect any connected funnel or website, and revoke Vercel / SSL routing records. This action cannot be undone.")}</p>{localizeNode(deleteError && <p className="aw-error" role="alert">{localizeNode(deleteError)}</p>)}<footer><button type="button" className="aw-secondary" disabled={deleteSaving} onClick={() => setDeletingDomain(null)}>{translateText("Cancel")}</button><button type="button" className="aw-danger" disabled={deleteSaving} aria-busy={deleteSaving} onClick={handleConfirmDelete}>{deleteSaving ? <><LoaderCircle size={14} className="animate-spin"/>{translateText("Deleting...")}</> : <><Trash2 size={14}/>{translateText("Delete Domain")}</>}</button></footer></div></Modal>)}</section>;
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
    publish: () => void | Promise<unknown>;
    assetActions: (a: Asset) => Actions;
    pageActions: (p: BuilderPage) => Actions;
    updateAsset: (id: string, update: (a: Asset) => Asset) => void | Promise<unknown>;
};
export function AssetOverview({ asset, kind, section, tab, setTab, activePage, selected, device, setDevice, editPage, movePage, reorder, setReorder, open, go, publish, assetActions, pageActions, updateAsset }: OverviewProps) {
  useUILanguage();
    const [range,setRange]=useState(()=>rangeFor(30)),[dragged,setDragged]=useState(''),[over,setOver]=useState('');
    return <>
 <div className="aw-breadcrumb">{translateText("Funnel & Website ")}<ArrowRight size={11}/>{localizeNode(kind === 'funnel' ? 'Funnels' : 'Websites')}<ArrowRight size={11}/><b>{localizeNode(asset.name)}</b></div>
 <header className="aw-asset-header"><button className="aw-icon" aria-label={translateText("Back to asset list")} onClick={() => go(section)}><ArrowLeft size={20}/></button>{localizeNode(kind === 'website' && <img className="aw-header-thumb" src={asset.image} alt={translateText("")}/>)}<div className="aw-title"><div><h1>{localizeNode(asset.name)}</h1><button className="aw-icon" aria-label={translateText("Rename asset")} onClick={() => open({ type: 'rename', assetId: asset.id })}><Pencil size={14}/></button><Status value={asset.document.funnel.status}/></div><div className="aw-domain-link"><Link2 size={13}/>{localizeNode(asset.domain ? <><button className="fn-domain-badge" onClick={()=>open({type:'domain-select',assetId:asset.id})}>{localizeNode(asset.domain)}<ChevronDown size={11}/></button></> : <span>{translateText("No domain connected")}</span>)}<button onClick={() => open({ type: 'domain-select', assetId: asset.id })}><Plus size={12}/>{translateText("Connect Domain")}</button></div></div><div className="aw-actions"><PublishedAssetLink asset={asset} className="aw-secondary"/><button className="aw-secondary" onClick={() => open({ type: 'preview', assetId: asset.id, pageId: activePage?.id })}><Eye size={15}/>{translateText("Preview ")}{localizeNode(kind === 'funnel' ? 'Funnel' : '')}</button>{localizeNode(kind === 'website' && <button className="aw-secondary" onClick={() => open({ type: 'domain-select', assetId: asset.id })}><Link2 size={14}/>{translateText("Domain")}</button>)}<div className="aw-split"><AssetAsyncButton className="aw-primary" onClick={publish} busyText="Publishing..."><ExternalLink size={14}/>{translateText("Publish ")}{localizeNode(kind === 'funnel' ? 'Funnel' : '')}</AssetAsyncButton><OptionsMenu label="Publish options" actions={[{ label: 'Publish', onSelect: publish }, { label: 'Save as draft', onSelect: () => updateAsset(asset.id, item => ({ ...item, document: { ...item.document, funnel: { ...item.document.funnel, status: 'Draft' } } })) }]}/></div><OptionsMenu label="Asset options" actions={assetActions(asset)}/></div></header>
 <nav className="aw-subtabs" aria-label={translateText("Asset management")}>{localizeNode((kind === 'funnel' ? ['Steps', 'Settings', 'Analytics', 'Leads', 'Integrations'] : ['Pages', 'Global Settings', 'Theme', 'Navigation']).map(label => <button key={label} className={tab === label ? 'active' : ''} onClick={() => setTab(label)}>{localizeNode(label === 'Steps' || label === 'Pages' ? <Layers size={14}/> : <Settings size={14}/>)} {localizeNode(label)}</button>))}</nav>
 {localizeNode(tab === 'Steps' ? <><div className="aw-step-flow">{localizeNode(asset.document.pages.map((page, i) => <div className="aw-step-pair" key={page.id}><article className={'aw-step-card '+(over===page.id&&dragged!==page.id?'fn-step-over':'')} draggable onDragStart={e=>{setDragged(page.id);e.dataTransfer.setData('text/gos-page',page.id);e.dataTransfer.effectAllowed='move';}} onDragEnd={()=>{setDragged('');setOver('');}} onDragOver={e=>{if(e.dataTransfer.types.includes('text/gos-page')){e.preventDefault();setOver(page.id);}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOver('');}} onDrop={e=>{e.preventDefault();movePage(e.dataTransfer.getData('text/gos-page'),page.id);setDragged('');setOver('');}}><header><span>{localizeNode(i + 1)}</span><b>{localizeNode(page.name)}</b><OptionsMenu label={`Options for ${page.name}`} actions={pageActions(page)}/></header><button className="aw-step-image" onClick={() => open({ type: 'preview', assetId: asset.id, pageId: page.id })}><StepThumbnail page={page} image={asset.image}/></button><Status value={page.status ?? asset.document.funnel.status}/><small>{localizeNode(page.path)}</small><button className="aw-edit-step" onClick={() => editPage(page)}><Pencil size={12}/>{translateText("Edit Step")}</button><footer><span><Eye size={12}/>{localizeNode(asset.sampleData ? ['1.2K','980','540','420','380'][i]??'—' : '—')}{translateText(" visits")}</span><span><BarChart3 size={12}/>{localizeNode(asset.sampleData ? ['24','42','68','55','91'][i]??'—' : '—')}%</span></footer>{localizeNode(reorder && <div className="aw-reorder-buttons"><button disabled={i === 0} onClick={() => movePage(page.id, asset.document.pages[i - 1].id)}>{translateText("← Move")}</button><button disabled={i === asset.document.pages.length - 1} onClick={() => movePage(page.id, asset.document.pages[i + 1].id)}>{translateText("Move →")}</button></div>)}</article>{localizeNode(i < asset.document.pages.length - 1 && <ArrowRight className="aw-step-arrow" size={17}/>)}</div>))}<button className="aw-add-step" aria-label={translateText("Add Step")} onClick={() => open({ type: 'add', assetId: asset.id })}><span><Plus size={25}/></span><b>{translateText("Add Step")}</b><small>{translateText("Choose a page type")}<br />{translateText("or start from a template")}</small></button></div><div className="aw-utilities">{localizeNode([{ label: 'Add Step', hint: 'Add a new step to this funnel', Icon: Plus, action: () => open({ type: 'add', assetId: asset.id }) }, { label: 'Reorder Steps', hint: 'Drag steps or use move buttons', Icon: GripVertical, action: () => setReorder(!reorder) }, { label: 'Funnel Settings', hint: 'Name, domain, SEO and more', Icon: Settings, action: () => setTab('Settings') }, { label: 'Delete Funnel', hint: 'Remove this funnel', Icon: Trash2, action: () => open({ type: 'delete', assetId: asset.id }) }].map(({ label, hint, Icon, action }) => <button className={label === 'Delete Funnel' ? 'danger' : ''} key={label} onClick={action}><span><Icon size={20}/></span><div><b>{localizeNode(label)}</b><small>{localizeNode(hint)}</small></div></button>))}</div><FunnelPerformance asset={asset} range={range} change={setRange}/></> : tab === 'Pages' ? <div className="aw-page-management"><aside className="aw-panel aw-page-list"><header><h3>{translateText("Pages ")}<span>({localizeNode(asset.document.pages.length)})</span></h3><button className="aw-primary" onClick={() => open({ type: 'add', assetId: asset.id })}><Plus size={14}/>{translateText("Add Page")}</button></header>{localizeNode(asset.document.pages.map((page, i) => <div key={page.id} className={`aw-page-row ${activePage?.id === page.id ? 'active' : ''}`} draggable onDragStart={e => e.dataTransfer.setData('text/gos-page', page.id)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); movePage(e.dataTransfer.getData('text/gos-page'), page.id); }}><GripVertical size={14}/><button className="aw-page-select" onClick={() => selected(page.id)}><img src={asset.image} alt={translateText("")}/><span><b>{localizeNode(page.name)}</b><small>{localizeNode(page.path)}</small></span></button><Status value={page.status ?? asset.document.funnel.status}/><OptionsMenu label={`${page.name} options`} actions={pageActions(page)}/><div className="aw-page-move"><AssetAsyncButton busyText="" aria-label={translateText(`Move ${page.name} up`)} disabled={i === 0} onClick={() => movePage(page.id, asset.document.pages[i - 1].id)}>↑</AssetAsyncButton><AssetAsyncButton busyText="" aria-label={translateText(`Move ${page.name} down`)} disabled={i === asset.document.pages.length - 1} onClick={() => movePage(page.id, asset.document.pages[i + 1].id)}>↓</AssetAsyncButton></div></div>))}</aside><section className="aw-panel aw-preview-panel"><header><div><b>{localizeNode(activePage?.name)}</b><small>{localizeNode(activePage?.path)}</small></div><Devices device={device} setDevice={setDevice}/><button className="aw-primary" onClick={() => activePage && editPage(activePage)}><Pencil size={14}/>{translateText("Edit Page")}</button></header>{localizeNode(activePage && <PagePreview asset={asset} page={activePage} device={device} onNavigate={selected}/>)}</section></div> : tab === 'Analytics' ? <FunnelAnalytics asset={asset} range={range} change={setRange}/> : tab === 'Leads' ? <FunnelLeads asset={asset}/> : tab === 'Integrations' ? <FunnelIntegrations asset={asset} update={updateAsset}/> : <section className="aw-panel aw-settings"><h2>{localizeNode(tab)}</h2>{localizeNode(tab === 'Theme' ? <><label>{translateText("Primary brand color")}<input type="color" value={asset.settings.color} onChange={e => updateAsset(asset.id, item => ({ ...item, settings: { ...item.settings, color: e.target.value } }))}/></label><p>{translateText("Your brand color is used in the live page preview.")}</p></> : tab === 'Navigation' ? <><label>{translateText("Navigation labels")}<textarea value={asset.settings.navigation} onChange={e => updateAsset(asset.id, item => ({ ...item, settings: { ...item.settings, navigation: e.target.value } }))}/></label><p>{translateText("Separate labels with commas. Labels matching a page name link to that page.")}</p></> : <><label>{localizeNode(kind === 'funnel' ? 'Funnel' : 'Website')}{translateText(" name")}<input value={asset.name} onChange={e => updateAsset(asset.id, item => ({ ...item, name: e.target.value, document: { ...item.document, funnel: { ...item.document.funnel, name: e.target.value } } }))}/></label><label>{translateText("Default SEO title")}<input value={asset.settings.seo} onChange={e => updateAsset(asset.id, item => ({ ...item, settings: { ...item.settings, seo: e.target.value } }))}/></label><label>{translateText("Conversion goal")}<AssetSelect value={asset.document.funnel.goal} onChange={e => updateAsset(asset.id, item => ({ ...item, document: { ...item.document, funnel: { ...item.document.funnel, goal: e } } }))} options={[...['Lead generation', 'Sales', 'Bookings'].map(goal => ({value:goal,label:goal}))]}/></label><button className="aw-secondary" onClick={() => open({ type: 'domain-select', assetId: asset.id })}><Globe size={15}/>{translateText("Connect domain")}</button></>)}<p className="aw-saved"><Check size={14}/>{translateText("Changes saved in this browser")}</p></section>)}
 </>;
}
function StepThumbnail({ page, image }: {
    page: BuilderPage;
    image: string;
}) {
  useUILanguage(); const first = page.sections[0]; return first?.type === 'Hero' ? <img src={image} alt={translateText(`${page.name} preview`)}/> : <div className="aw-mini-step"><span>{localizeNode(first?.type === 'Booking' ? <CalendarDays size={32}/> : first?.type === 'Form' ? <FileText size={32}/> : <Check size={32}/>)}</span><h3>{first?.content.title || page.name}</h3><p>{first?.content.body?.slice(0, 85)}</p>{localizeNode(first?.type === 'Form' ? <><i>{translateText("Your name")}</i><i>{translateText("Email address")}</i><b>{translateText("Get My Plan")}</b></> : first?.type === 'Booking' ? <div className="aw-mini-calendar">{localizeNode(Array.from({ length: 28 }, (_, i) => <i key={i}>{localizeNode(i + 1)}</i>))}</div> : <b>{translateText("Continue →")}</b>)}</div>; }
export function AssetThumbnail({ asset }: {
    asset: Asset;
}) {
  useUILanguage();
    const nutrition = asset.name.toLowerCase().includes('nutrition'), agency = asset.name.toLowerCase().includes('agency') || asset.name.toLowerCase().includes('consultation');
    return <div className={`aw-thumbnail ${nutrition ? 'nutrition' : agency ? 'agency' : 'fitness'}`} aria-hidden="true"><div className="aw-thumb-nav"><b>{localizeNode(nutrition ? 'NutriPro' : agency ? 'CoachJoe' : 'FITZONE')}</b><span>{translateText("Home　 Programs　 About")}</span><i>{translateText("Book Now")}</i></div><div className="aw-thumb-hero"><img src={asset.image} alt={translateText("")}/><div><h4>{localizeNode(nutrition ? 'Nutrition Made Simple' : agency ? 'Let’s Grow Your Business' : 'Transform Your Life')}</h4><p>{localizeNode(nutrition ? 'Custom nutrition plans for a healthier you.' : 'Personalized coaching. Real results.')}</p><b>{localizeNode(nutrition ? 'Get Started' : 'Book a Free Session')}</b></div></div></div>;
}
export function isColorDark(color?: string): boolean {
  if (!color) return false;
  const c = color.trim().toLowerCase();
  if (['#ffffff', '#fff', 'white', '#f8fafc', '#f1f5f9', '#f3f4f6', '#fafafa', '#e2e8f0', 'transparent'].includes(c)) return false;
  if (['#000000', '#000', 'black', '#0f172a', '#080e19', '#111827', '#1e293b', '#0b0b10', '#18181b', '#090d16'].includes(c)) return true;
  if (c.startsWith('#')) {
    const raw = c.replace('#', '');
    const hex = raw.length === 3 ? raw.split('').map(x => x + x).join('') : raw;
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16),
            g = parseInt(hex.substring(2, 4), 16),
            b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return (r * 299 + g * 587 + b * 114) / 1000 < 128;
      }
    }
  }
  return false;
}

export function PagePreview({ asset, page, device, onNavigate, isDark: explicitDark }: {
    asset: Asset;
    page: BuilderPage;
    device: string;
    onNavigate: (id: string) => void;
    isDark?: boolean;
}) {
  useUILanguage();
  const globalTheme = useSelector((state: RootState) => state.ui.theme);
  const isPageWhite = !page.backgroundColor || ['#ffffff', '#fff', 'white', 'rgb(255, 255, 255)', 'rgb(255,255,255)'].includes(page.backgroundColor.trim().toLowerCase());
  const isCustomDark = Boolean(page.backgroundColor && isColorDark(page.backgroundColor));
  const isDark = explicitDark !== undefined ? explicitDark : (isCustomDark || (globalTheme === 'dark' && isPageWhite));

  const canvasBg = page.backgroundColor && !isPageWhite ? page.backgroundColor : (isDark ? '#0f172a' : (page.backgroundColor ?? '#ffffff'));

  const previewAction = (section?:BuilderSection) => {
    if(section?.content.destinationType==='Next Step'&&section.content.destination){
      onNavigate(section.content.destination);
      return;
    }
    showToast.info('This is a workspace preview. No booking or payment is created.');
  };

  return <div className={`aw-live-preview ${device.toLowerCase()} ${isDark ? 'dark' : 'light'}`} style={{ '--preview-accent': asset.settings.color, '--fb-accent': asset.settings.color, '--fb-heading-font': asset.document.theme?.font ?? 'Manrope' } as React.CSSProperties}>
    <div className="aw-browser"><i /><i /><i /><span>{localizeNode(asset.domain || 'Unconnected domain')}{localizeNode(page.path)}</span></div>
    <div className={`aw-preview-site ${isDark ? 'dark' : 'light'}`} style={{ backgroundColor: canvasBg }}>
      {localizeNode(page.showHeader && <nav><b>{localizeNode(asset.name.split(' ')[0].toUpperCase())}</b><div>{localizeNode(asset.settings.navigation.split(',').map((label, i) => { const match = asset.document.pages.find(p => p.name.toLowerCase() === label.trim().toLowerCase()); return <button key={i} onClick={() => { if (match)
        onNavigate(match.id); }}>{localizeNode(label.trim())}</button>; }))}</div></nav>)}
      {page.hideOnMobile && device === 'Mobile' ? <Empty title={translateText("Hidden on mobile")} description="This page is hidden at this breakpoint."/> : page.sections.map(section => {
        const isWhiteSection = !section.styles.backgroundColor || ['#ffffff', '#fff', 'white', 'rgb(255, 255, 255)', 'rgb(255,255,255)'].includes(section.styles.backgroundColor.trim().toLowerCase());
        const sectionBg = section.type === 'Hero' ? '#080e19' : (!isWhiteSection ? section.styles.backgroundColor : (isDark ? 'transparent' : (section.styles.backgroundColor || '#ffffff')));
        return <section key={section.id} className={`fb-canvas-section ${section.type === 'Hero' ? 'aw-preview-hero fb-hero-section' : 'aw-preview-content'}`} style={{ backgroundColor: sectionBg, padding: section.styles.padding + 'px', textAlign: section.styles.textAlign.toLowerCase() as React.CSSProperties['textAlign'], display: section.styles.visibility === 'Hidden' || (section.styles.visibility === 'Desktop only' && device !== 'Desktop') || (section.styles.visibility === 'Tablet only' && device !== 'Tablet') || (section.styles.visibility === 'Mobile only' && device !== 'Mobile') ? 'none' : undefined }}>
          {section.type === 'Hero' ? <><img src={page.featuredImage || asset.image} alt={translateText("")}/><OrderedElementParts item={section}><div><small>{translateText("TRANSFORM YOUR LIFE")}</small><h2 data-element-part={section.id+'::title'}>{section.content.title}</h2><p data-element-part={section.id+'::body'}>{section.content.body}</p>{section.content.button && <button data-element-part={section.id+'::button'} onClick={()=>previewAction(section)}>{section.content.button}<ArrowRight size={14}/></button>}</div></OrderedElementParts></> : <SectionPreview device={device.toLowerCase()} item={section} isDark={isDark} onAction={previewAction} onImagePick={() => { }} onImageDrop={event => event.preventDefault()} onNotify={message => showToast.info(message)}/>}
        </section>;
      })}
      {localizeNode(page.showFooter && <footer>{localizeNode(asset.name)}{translateText(" · Built for your growth")}</footer>)}
    </div>
  </div>;
}
