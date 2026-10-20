import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, Filter, Globe, LayoutGrid, Plus } from 'lucide-react';
import {PageTemplateLibrary} from './PageTemplateLibrary';
import {createPageAsset} from './page-templates';
import type {PageTemplate} from './page-templates';
import { BuilderWorkspace } from './BuilderWorkspace';
import type { BuilderDocument, BuilderPage } from './BuilderWorkspace';
import { OptionsMenu } from './crm/CRMPrimitives';
import { showToast } from '../utils/toast';
import { publishWorkspaceAsset } from '../backend/hosting';
import { backendError } from '../backend/firebase';
import { duplicateBuilderPage } from './builder-integrity';
import { useAssetWorkspace } from './asset-store';
import type { Asset, BuilderMode, Dialog } from './asset-model';
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
  useUILanguage();
    const navigate = useNavigate(), location = useLocation();
    const [workspace, setWorkspace] = useAssetWorkspace();
    const [query, setQuery] = useState(''), [status, setStatus] = useState('All Status'), [sort, setSort] = useState('Last Updated'), [list, setList] = useState(false);
    const [tab, setTab] = useState(location.pathname.includes('/websites') ? 'Pages' : 'Steps'), [selectedPage, setSelectedPage] = useState(''), [device, setDevice] = useState('Desktop');
    const [dialog, setDialog] = useState<Dialog | null>(null), [showArchived, setShowArchived] = useState(false), [reorder, setReorder] = useState(false);
    const segments = location.pathname.split('/').filter(Boolean), sectionIndex = segments[0] === 'dashboard' ? 1 : 0, section = segments[sectionIndex] || 'funnels', assetId = segments[sectionIndex + 1], pageId = segments[sectionIndex + 3], base = segments[0] === 'dashboard' ? '/dashboard' : '';
    const kind: BuilderMode = section === 'websites' ? 'website' : 'funnel', asset = workspace.assets.find(item => item.id === assetId && item.kind === kind), activePage = asset?.document.pages.find(page => page.id === selectedPage) ?? asset?.document.pages[0], editing = segments[sectionIndex + 2] === 'edit';
    useEffect(() => { setQuery(''); setStatus('All Status'); setTab(section === 'websites' ? 'Pages' : 'Steps'); setSelectedPage(''); setReorder(false); }, [section, assetId]);
    const updateAsset = (id: string, update: (value: Asset) => Asset) => setWorkspace(current => ({ ...current, assets: current.assets.map(item => item.id === id ? update(item) : item) }));
    const updateDocument = (document: BuilderDocument) => { if (asset)
        return updateAsset(asset.id, item => ({ ...item, document, name: document.funnel.name, settings: { ...item.settings, color: document.theme?.color ?? item.settings.color }, updated: new Date().toISOString() })); };
    const go = (target: string) => navigate(`${/^(funnels|websites|domains)(?:\/|$)/.test(target) ? base : '/dashboard'}/${target}`);
    const installAsset = (created:Asset) => {setWorkspace(current=>({...current,assets:[created,...current.assets]}));setDialog(null);go((created.kind==='website'?'websites':'funnels')+'/'+created.id+'/edit/'+created.document.pages[0].id); };
    const installTemplate = (template:PageTemplate) => installAsset(createPageAsset(kind,template.name,template));
    const open = (value: Dialog) => setDialog(value);
    const editPage = (page: BuilderPage) => asset && go(`${section}/${asset.id}/edit/${page.id}`);
    const publish = async () => {
      if (!asset) return;
      try {
        const result = await publishWorkspaceAsset(asset.id);
        showToast.success(result.draftChanged ? `Published ${result.url}. Newer edits remain a draft.` : `Published ${result.url}`);
      } catch (error) { showToast.error(backendError(error)); }
    };
    const assetActions = (item: Asset) => [{ label: 'Rename', onSelect: () => open({ type: 'rename', assetId: item.id }) }, { label: 'Duplicate', onSelect: () => { const copy = structuredClone(item); copy.id = crypto.randomUUID(); copy.name += ' (Copy)'; copy.document.funnel.name = copy.name; copy.document.funnel.status = 'Draft'; copy.domain = ''; copy.sampleData=false; copy.updated = new Date().toISOString(); setWorkspace(current => ({ ...current, assets: [copy, ...current.assets] })); showToast.success('Asset duplicated'); } }, { label: item.archived ? 'Restore' : 'Archive', onSelect: () => updateAsset(item.id, value => ({ ...value, archived: !value.archived })) }, { label: 'Delete', onSelect: () => open({ type: 'delete', assetId: item.id }) }];
    const pageActions = (page: BuilderPage) => [{ label: kind === 'funnel' ? 'Edit Step' : 'Edit Page', onSelect: () => editPage(page) }, { label: 'Duplicate', onSelect: () => { if (!asset)
                return; updateAsset(asset.id, item => { const copy = duplicateBuilderPage(page, item.document.pages); const sourceStep = item.document.steps.find(step => step.pageId === page.id); return { ...item, document: { ...item.document, pages: [...item.document.pages, copy], steps: kind === 'funnel' ? [...item.document.steps, { id: copy.id, label: copy.name, pageId: copy.id, type: sourceStep?.type ?? 'Landing' }] : [], funnel: { ...item.document.funnel, pagesFlow: [...item.document.funnel.pagesFlow, copy.id], status: 'Draft' } } }; }); } }, { label: 'Delete', onSelect: () => open({ type: 'delete', assetId: asset?.id, pageId: page.id }) }];
    const movePage = (from: string, target: string) => { if (!asset || from === target)
        return; updateAsset(asset.id, item => { const pages = [...item.document.pages], source = pages.findIndex(page => page.id === from), dest = pages.findIndex(page => page.id === target); if (source < 0 || dest < 0)
        return item; pages.splice(dest, 0, pages.splice(source, 1)[0]); return { ...item, document: { ...item.document, pages, steps: pages.map(page => item.document.steps.find(step => step.pageId === page.id)).filter((step): step is NonNullable<typeof step> => Boolean(step)), funnel: { ...item.document.funnel, pagesFlow: pages.map(page => page.id), status: 'Draft' } } }; }); };
    const filteredAssets = workspace.assets.filter(item => item.kind === kind && Boolean(item.archived) === showArchived && item.name.toLowerCase().includes(query.toLowerCase()) && (status === 'All Status' || item.document.funnel.status === status)).sort((a, b) => sort === 'Name' ? a.name.localeCompare(b.name) : Date.parse(b.updated) - Date.parse(a.updated));
    const editTarget=asset?.document.pages.find(page=>page.id===pageId||page.path.replace(/^\//,'')===pageId);
    const dialogAsset=workspace.assets.find(item=>item.id===dialog?.assetId);
    const modal=dialog&&(dialog.type==='domain-select'&&dialogAsset?<FunnelDomainPicker asset={dialogAsset} workspace={workspace} setWorkspace={setWorkspace} close={()=>setDialog(null)} add={()=>setDialog({type:'domain',assetId:dialogAsset.id})}/>:<AssetDialog key={`${dialog.type}-${dialog.assetId}-${dialog.pageId}-${dialog.domainId}`} dialog={dialog} kind={kind} workspace={workspace} setWorkspace={setWorkspace} updateAsset={updateAsset} close={() => setDialog(null)} go={go} section={section} selected={setSelectedPage}/>);
    if (new URLSearchParams(location.search).get('tab') === 'templates') return <div className="aw-workspace pf-template-page"><header className="pf-template-page-header"><div><button className="aw-secondary" onClick={()=>go(section)}>{translateText("Back to ")}{localizeNode(section)}</button><h1>{translateText("Templates")}</h1><p>{translateText("Choose a ready-to-edit page for your business.")}</p></div><button className="aw-primary" onClick={()=>open({type:'create'})}><Plus size={16}/>{translateText("Create ")}{localizeNode(kind==='funnel'?'Funnel':'Website')}</button></header><PageTemplateLibrary install={installTemplate}/>{localizeNode(modal)}</div>;
    if(editing&&asset&&!editTarget)return <div className="aw-workspace"><Empty title={translateText("Step not found")} description="Choose an existing step from the funnel overview." action={<button className="aw-primary" onClick={()=>go(section+'/'+asset.id)}>{translateText("Back to overview")}</button>}/></div>;
    if (editing && asset)
        return <div className={"aw-editor-host" + (kind === 'funnel' ? ' fn-focused-editor' : ' fb-website-editor')}><BuilderWorkspace key={`${asset.id}-${pageId}`} mode={kind} document={asset.document} domain={asset.domain} initialColor={asset.settings.color} selectedPageId={editTarget?.id} onStepChange={next=>go(section+'/'+asset.id+'/edit/'+next)} onDocumentChange={updateDocument} onPublish={()=>publishWorkspaceAsset(asset.id)} onBack={() => go(`${section}/${asset.id}`)}/>{localizeNode(modal)}</div>;
    return <div className={`aw-workspace${section==='domains'?' aw-domains-workspace':section==='funnels'?' aw-funnels-workspace':''}`}><div className="aw-topbar"><nav aria-label={translateText("Funnel and website navigation")}><button onClick={() => navigate(`${base}/funnels?tab=templates`)}><LayoutGrid size={17}/>{translateText("Templates")}</button>{localizeNode([{ key: 'funnels', label: 'Funnels', Icon: Filter }, { key: 'websites', label: 'Websites', Icon: LayoutGrid }, { key: 'domains', label: 'Domains', Icon: Globe }].map(({ key, label, Icon }) => <button key={key} aria-current={section === key ? 'page' : undefined} className={section === key ? 'active' : ''} onClick={() => go(key)}><Icon size={17}/>{localizeNode(label)}</button>))}</nav>{localizeNode(!asset && section !== 'domains' && <div className="aw-actions"><button className="aw-secondary" onClick={() => showToast.info('Choose an asset → organize pages → edit a page → preview and publish.')}><Eye size={15}/>{translateText("How it works?")}</button><div className="aw-split"><button className="aw-primary" onClick={() => open({ type: 'create' })}><Plus size={16}/>{translateText("Create ")}{localizeNode(kind === 'funnel' ? 'Funnel' : 'Website')}</button><OptionsMenu label="Creation options" actions={[{ label: 'Create blank', onSelect: () => installAsset(createPageAsset(kind,'')) }, { label: 'Build with AI', onSelect: () => open({ type: 'ai' }) }]}/></div></div>)}</div>
 {localizeNode(assetId && !asset ? <Empty title={translateText("Asset not found")} description="This asset may have been deleted. Choose another asset to continue." action={<button className="aw-primary" onClick={() => go(section)}>{translateText("Back to ")}{localizeNode(section)}<ArrowRight size={14}/></button>}/> : section === 'domains' ? <DomainsView workspace={workspace} setWorkspace={setWorkspace} query={query} setQuery={setQuery} status={status} setStatus={setStatus} go={go} open={open}/> : asset ? <AssetOverview asset={asset} kind={kind} section={section} tab={tab} setTab={setTab} activePage={activePage} selected={setSelectedPage} device={device} setDevice={setDevice} editPage={editPage} movePage={movePage} reorder={reorder} setReorder={setReorder} open={open} go={go} publish={publish} assetActions={assetActions} pageActions={pageActions} updateAsset={updateAsset}/> : <AssetHub installTemplate={installTemplate} assets={filteredAssets} kind={kind} section={section} query={query} setQuery={setQuery} status={status} setStatus={setStatus} sort={sort} setSort={setSort} list={list} setList={setList} archived={showArchived} setArchived={setShowArchived} open={open} go={go} actions={assetActions}/>)}{localizeNode(modal)}</div>;
}
export default FunnelBuilder;
