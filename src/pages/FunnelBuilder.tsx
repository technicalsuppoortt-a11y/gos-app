import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, Filter, Globe, LayoutGrid, Plus } from 'lucide-react';
import { BuilderWorkspace } from './BuilderWorkspace';
import type { BuilderDocument, BuilderPage } from './BuilderWorkspace';
import { OptionsMenu } from './crm/CRMPrimitives';
import { showToast } from '../utils/toast';
import { readWorkspace, storageKey } from './asset-model';
import type { Asset, BuilderMode, Dialog, Workspace } from './asset-model';
import { AssetHub, AssetOverview, DomainsView, Empty } from './AssetViews';
import { AssetDialog } from './AssetDialog';
import { FunnelDomainPicker } from './FunnelDomainPicker';
import './funnel-builder.css';
import './asset-workspace.css';
import './asset-controls.css';
import './domains-polish.css';
import './funnel-polish.css';
import './website-funnel-polish.css';
export type { BuilderMode } from './asset-model';
export function FunnelBuilder() {
    const navigate = useNavigate(), location = useLocation();
    const [workspace, setWorkspace] = useState<Workspace>(readWorkspace);
    const [query, setQuery] = useState(''), [status, setStatus] = useState('All Status'), [sort, setSort] = useState('Last Updated'), [list, setList] = useState(false);
    const [tab, setTab] = useState(location.pathname.includes('/websites') ? 'Pages' : 'Steps'), [selectedPage, setSelectedPage] = useState(''), [device, setDevice] = useState('Desktop');
    const [dialog, setDialog] = useState<Dialog | null>(null), [showArchived, setShowArchived] = useState(false), [reorder, setReorder] = useState(false);
    const segments = location.pathname.split('/').filter(Boolean), sectionIndex = segments[0] === 'dashboard' ? 1 : 0, section = segments[sectionIndex] || 'funnels', assetId = segments[sectionIndex + 1], pageId = segments[sectionIndex + 3], base = segments[0] === 'dashboard' ? '/dashboard' : '';
    const kind: BuilderMode = section === 'websites' ? 'website' : 'funnel', asset = workspace.assets.find(item => item.id === assetId && item.kind === kind), activePage = asset?.document.pages.find(page => page.id === selectedPage) ?? asset?.document.pages[0], editing = segments[sectionIndex + 2] === 'edit';
    useEffect(() => { try {
        localStorage.setItem(storageKey, JSON.stringify(workspace));
    }
    catch {
        showToast.error('Browser storage is unavailable. Changes remain in this session.');
    } }, [workspace]);
    useEffect(() => { setQuery(''); setStatus('All Status'); setTab(section === 'websites' ? 'Pages' : 'Steps'); setSelectedPage(''); setReorder(false); }, [section, assetId]);
    const updateAsset = (id: string, update: (value: Asset) => Asset) => setWorkspace(current => ({ ...current, assets: current.assets.map(item => item.id === id ? update(item) : item) }));
    const updateDocument = (document: BuilderDocument) => { if (asset)
        updateAsset(asset.id, item => ({ ...item, document, name: document.funnel.name, settings: { ...item.settings, color: document.theme?.color ?? item.settings.color }, updated: new Date().toISOString() })); };
    const go = (target: string) => navigate(`${/^(funnels|websites|domains)(?:\/|$)/.test(target) ? base : '/dashboard'}/${target}`);
    const open = (value: Dialog) => setDialog(value);
    const editPage = (page: BuilderPage) => asset && go(`${section}/${asset.id}/edit/${page.id}`);
    const publish = () => { if (!asset)
        return; updateAsset(asset.id, item => ({ ...item, document: { ...item.document, pages:item.document.pages.map(page=>({...page,status:'Published'})), funnel: { ...item.document.funnel, status: 'Published' } }, updated: new Date().toISOString() })); showToast.success('Published in this workspace. Live hosting is not connected.'); };
    const assetActions = (item: Asset) => [{ label: 'Rename', onSelect: () => open({ type: 'rename', assetId: item.id }) }, { label: 'Duplicate', onSelect: () => { const copy = structuredClone(item); copy.id = crypto.randomUUID(); copy.name += ' (Copy)'; copy.document.funnel.name = copy.name; copy.document.funnel.status = 'Draft'; copy.domain = ''; copy.sampleData=false; copy.updated = new Date().toISOString(); setWorkspace(current => ({ ...current, assets: [copy, ...current.assets] })); showToast.success('Asset duplicated'); } }, { label: item.archived ? 'Restore' : 'Archive', onSelect: () => updateAsset(item.id, value => ({ ...value, archived: !value.archived })) }, { label: 'Delete', onSelect: () => open({ type: 'delete', assetId: item.id }) }];
    const pageActions = (page: BuilderPage) => [{ label: kind === 'funnel' ? 'Edit Step' : 'Edit Page', onSelect: () => editPage(page) }, { label: 'Duplicate', onSelect: () => { if (!asset)
                return; updateAsset(asset.id, item => { const copy = structuredClone(page); copy.id = crypto.randomUUID(); copy.name += ' (Copy)'; copy.path += '-copy'; return { ...item, document: { ...item.document, pages: [...item.document.pages, copy], steps: kind === 'funnel' ? [...item.document.steps, { id: copy.id, label: copy.name, pageId: copy.id, type: 'Landing' }] : [], funnel: { ...item.document.funnel, status: 'Draft' } } }; }); } }, { label: 'Delete', onSelect: () => open({ type: 'delete', assetId: asset?.id, pageId: page.id }) }];
    const movePage = (from: string, target: string) => { if (!asset || from === target)
        return; updateAsset(asset.id, item => { const pages = [...item.document.pages], source = pages.findIndex(page => page.id === from), dest = pages.findIndex(page => page.id === target); if (source < 0 || dest < 0)
        return item; pages.splice(dest, 0, pages.splice(source, 1)[0]); return { ...item, document: { ...item.document, pages, steps: pages.map(page => item.document.steps.find(step => step.pageId === page.id)).filter((step): step is NonNullable<typeof step> => Boolean(step)), funnel: { ...item.document.funnel, pagesFlow: pages.map(page => page.id), status: 'Draft' } } }; }); };
    const filteredAssets = workspace.assets.filter(item => item.kind === kind && Boolean(item.archived) === showArchived && item.name.toLowerCase().includes(query.toLowerCase()) && (status === 'All Status' || item.document.funnel.status === status)).sort((a, b) => sort === 'Name' ? a.name.localeCompare(b.name) : Date.parse(b.updated) - Date.parse(a.updated));
    const editTarget=asset?.document.pages.find(page=>page.id===pageId||page.path.replace(/^\//,'')===pageId);
    const dialogAsset=workspace.assets.find(item=>item.id===dialog?.assetId);
    const modal=dialog&&(dialog.type==='domain-select'&&dialogAsset?<FunnelDomainPicker asset={dialogAsset} workspace={workspace} setWorkspace={setWorkspace} close={()=>setDialog(null)} add={()=>setDialog({type:'domain',assetId:dialogAsset.id})}/>:<AssetDialog key={`${dialog.type}-${dialog.assetId}-${dialog.pageId}-${dialog.domainId}`} dialog={dialog} kind={kind} workspace={workspace} setWorkspace={setWorkspace} updateAsset={updateAsset} close={() => setDialog(null)} go={go} section={section} selected={setSelectedPage}/>);
    if(editing&&asset&&!editTarget)return <div className="aw-workspace"><Empty title="Step not found" description="Choose an existing step from the funnel overview." action={<button className="aw-primary" onClick={()=>go(section+'/'+asset.id)}>Back to overview</button>}/></div>;
    if (editing && asset)
        return <div className={"aw-editor-host"+(kind==='funnel'?' fn-focused-editor':'')}><BuilderWorkspace key={`${asset.id}-${pageId}`} mode={kind} document={asset.document} domain={asset.domain} initialColor={asset.settings.color} selectedPageId={editTarget?.id} onStepChange={next=>go(section+'/'+asset.id+'/edit/'+next)} onDocumentChange={updateDocument} onBack={() => go(`${section}/${asset.id}`)}/>{modal}</div>;
    return <div className={`aw-workspace${section==='domains'?' aw-domains-workspace':section==='funnels'?' aw-funnels-workspace':''}`}><div className="aw-topbar"><nav aria-label="Funnel and website navigation">{[{ key: 'funnels', label: 'Funnels', Icon: Filter }, { key: 'websites', label: 'Websites', Icon: LayoutGrid }, { key: 'domains', label: 'Domains', Icon: Globe }].map(({ key, label, Icon }) => <button key={key} aria-current={section === key ? 'page' : undefined} className={section === key ? 'active' : ''} onClick={() => go(key)}><Icon size={17}/>{label}</button>)}</nav>{!asset && section !== 'domains' && <div className="aw-actions"><button className="aw-secondary" onClick={() => showToast.info('Choose an asset → organize pages → edit a page → preview and publish.')}><Eye size={15}/>How it works?</button><div className="aw-split"><button className="aw-primary" onClick={() => open({ type: 'create' })}><Plus size={16}/>Create {kind === 'funnel' ? 'Funnel' : 'Website'}</button><OptionsMenu label="Creation options" actions={[{ label: 'Create blank', onSelect: () => open({ type: 'create' }) }, { label: 'Build with AI', onSelect: () => open({ type: 'ai' }) }]}/></div></div>}</div>
 {assetId && !asset ? <Empty title="Asset not found" description="This asset may have been deleted. Choose another asset to continue." action={<button className="aw-primary" onClick={() => go(section)}>Back to {section}<ArrowRight size={14}/></button>}/> : section === 'domains' ? <DomainsView workspace={workspace} setWorkspace={setWorkspace} query={query} setQuery={setQuery} status={status} setStatus={setStatus} go={go} open={open}/> : asset ? <AssetOverview asset={asset} kind={kind} section={section} tab={tab} setTab={setTab} activePage={activePage} selected={setSelectedPage} device={device} setDevice={setDevice} editPage={editPage} movePage={movePage} reorder={reorder} setReorder={setReorder} open={open} go={go} publish={publish} assetActions={assetActions} pageActions={pageActions} updateAsset={updateAsset}/> : <AssetHub assets={filteredAssets} kind={kind} section={section} query={query} setQuery={setQuery} status={status} setStatus={setStatus} sort={sort} setSort={setSort} list={list} setList={setList} archived={showArchived} setArchived={setShowArchived} open={open} go={go} actions={assetActions}/>}{modal}</div>;
}
export default FunnelBuilder;
