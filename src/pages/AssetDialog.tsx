import { AssetSelect } from './AssetControls';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Modal } from './settings/kit';
import { createBuilderDocument } from './BuilderWorkspace';
import { AssetPreviewDialog } from './AssetPreviewDialog';
import { AIWebsiteDialog } from './AIWebsiteDialog';
import { images } from './asset-model';
import type { Asset, BuilderMode, Dialog, Workspace } from './asset-model';
import { showToast } from '../utils/toast';
type Props = {
    dialog: Dialog;
    kind: BuilderMode;
    workspace: Workspace;
    setWorkspace: Dispatch<SetStateAction<Workspace>>;
    updateAsset: (id: string, update: (a: Asset) => Asset) => void;
    close: () => void;
    go: (p: string) => void;
    section: string;
    selected: (id: string) => void;
};
export function AssetDialog({ dialog, kind, workspace, setWorkspace, updateAsset, close, go, section, selected }: Props) {
    const asset = workspace.assets.find(item => item.id === dialog.assetId), domain = workspace.domains.find(item => item.id === dialog.domainId);
    const [name, setName] = useState(dialog.type === 'rename' ? asset?.name ?? '' : domain?.name ?? ''), [path, setPath] = useState(''), [error, setError] = useState(''), [dnsStep, setDnsStep] = useState(1), [domainAsset, setDomainAsset] = useState(dialog.assetId ?? domain?.assetId ?? ''), [stepType, setStepType] = useState('Landing');


    const onSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const title = name.trim();
        if (!title) {
            setError('Enter a name to continue.');
            return;
        }
        if (dialog.type === 'rename') {
            updateAsset(dialog.assetId!, item => ({ ...item, name: title, document: { ...item.document, funnel: { ...item.document.funnel, name: title } } }));
            close();
            return;
        }
        if (dialog.type === 'add' && asset) {
            const url = path.trim() || `/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            if (!/^\/[a-z0-9/_-]*$/i.test(url) || asset.document.pages.some(page => page.path === url)) {
                setError('Use a unique URL beginning with / and letters, numbers, hyphens or underscores.');
                return;
            }
            const id = crypto.randomUUID(), document = createBuilderDocument(kind, title, asset.image), preset = kind === 'funnel' ? document.pages[({ Landing: 0, Form: 1, 'Thank You': 2, Booking: 3, Confirmation: 4 } as Record<string, number>)[stepType]] : document.pages[0], page = { ...preset, id, name: title, path: url, isFunnelStep: kind === 'funnel' };
            updateAsset(asset.id, item => ({ ...item, document: { ...item.document, pages: [...item.document.pages, page], steps: kind === 'funnel' ? [...item.document.steps, { id, label: title, pageId: id, type: stepType as 'Landing' }] : [], funnel: { ...item.document.funnel, pagesFlow: [...item.document.pages.map(page => page.id), id], status: 'Draft' } } }));
            selected(id);
            close();
            return;
        }
        const id = crypto.randomUUID(), image = dialog.template === 'Clinic Website' ? images.nutrition : dialog.template === 'Agency Website' ? images.agency : images.fitness, document = createBuilderDocument(kind, title, image, kind === 'funnel' ? 1 : 7, dialog.template);
        if (dialog.type === 'ai') {
            document.pages[0].sections[0].content.title = title;
            document.pages[0].sections[0].content.body = path || 'Discover how we can help you grow.';
        }
        const created: Asset = { id, kind, name: title, domain: '', image, document, updated: new Date().toISOString(), description: dialog.template ?? 'Your new customer experience', settings: { seo: title, navigation: document.pages.map(page => page.name).join(', '), color: '#6366f1' } };
        setWorkspace(current => ({ ...current, assets: [created, ...current.assets] }));
        close();
        go(`${section}/${id}`);
    };
    if (dialog.type === 'preview' && asset) return <AssetPreviewDialog asset={asset} pageId={dialog.pageId} close={close}/>;
    if (dialog.type === 'ai' && kind === 'website') return <AIWebsiteDialog setWorkspace={setWorkspace} close={close} go={go}/>;
    return <Modal title={dialog.type === 'domain' ? 'Connect a domain' : dialog.type === 'delete' ? 'Delete ' + (dialog.pageId ? (kind === 'funnel' ? 'step' : 'page') : 'asset') : dialog.type === 'preview' ? `${asset?.name} · Preview` : dialog.type === 'add' ? `Add ${kind === 'funnel' ? 'step' : 'page'}` : dialog.type === 'rename' ? 'Rename asset' : dialog.type === 'ai' ? 'Build with AI' : `Create ${kind}`} close={close}><div className={'aw-modal-body '+(dialog.type==='preview'&&kind==='funnel'?'aw-funnel-preview':'')}>
 {dialog.type === 'delete' ? <><p>{dialog.pageId ? 'This page and its content' : 'This asset and all its pages'} will be removed from this workspace. This cannot be undone.</p>{asset?.document.pages.length === 1 && dialog.pageId ? <p className="aw-error">Keep at least one page. Delete the entire asset if you no longer need it.</p> : <button className="aw-danger" onClick={() => { if (dialog.pageId && asset) {
            updateAsset(asset.id, item => ({ ...item, document: { ...item.document, pages: item.document.pages.filter(page => page.id !== dialog.pageId), steps: item.document.steps.filter(step => step.pageId !== dialog.pageId), funnel: { ...item.document.funnel, pagesFlow: item.document.pages.filter(page => page.id !== dialog.pageId).map(page => page.id), status: 'Draft' } } }));
        }
        else {
            setWorkspace(current => ({ ...current, assets: current.assets.filter(item => item.id !== dialog.assetId), domains: current.domains.map(domain => domain.assetId === dialog.assetId ? { ...domain, assetId: '', status: 'Disconnected', ssl: 'Inactive', default: false } : domain) }));
            go(section);
        } close(); }}>Delete permanently</button>}</> : dialog.type === 'domain' ? <>
 <div className="aw-dns-steps">{['Domain', 'DNS records', 'Verification'].map((label, i) => <span key={label} className={dnsStep === i + 1 ? 'active' : ''}>{i + 1}. {label}</span>)}</div>
 {dnsStep === 1 ? <form onSubmit={e => { e.preventDefault(); const cleaned = name.trim().toLowerCase(); if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(cleaned)) {
            setError('Enter a valid domain such as example.com, without https:// or a path.');
            return;
        } if (workspace.domains.some(item => item.name === cleaned && item.id !== dialog.domainId)) {
            setError('This domain is already in your workspace. Use Manage to update it.');
            return;
        } if (!domainAsset) {
            setError('Choose a funnel or website to connect.');
            return;
        } setName(cleaned); setError(''); setDnsStep(2); }}><label>Domain name<input value={name} onChange={e => setName(e.target.value)} placeholder="example.com" required/></label><label>Connect to<AssetSelect value={domainAsset} required={true} onChange={e => setDomainAsset(e)} options={[{value:"",label:"Choose an asset"},...workspace.assets.filter(item => !item.archived).map(item => ({value:item.id,label:`${item.kind === 'funnel' ? 'Funnel' : 'Website'} · ${item.name}`}))]}/></label>{error && <p className="aw-error" role="alert">{error}</p>}<button className="aw-primary">Continue <ArrowRight size={14}/></button></form> : dnsStep === 2 ? <><p>Add DNS records through your domain provider. Your hosting service must supply the actual values before you can connect.</p><div className="aw-dns-record"><b>CNAME</b><span>Host: www</span><code>Target: supplied by your hosting provider</code></div><div className="aw-dns-record"><b>A record</b><span>Host: @</span><code>Value: supplied by your hosting provider</code></div><p className="aw-info"><ShieldCheck size={16}/>DNS and SSL verification require a connected hosting backend.</p><button className="aw-secondary" onClick={() => setDnsStep(1)}>Back</button><button className="aw-primary" onClick={() => setDnsStep(3)}>Continue to verification</button></> : <><div className="aw-verification"><ShieldCheck size={32}/><h3>Waiting for DNS verification</h3><p>Save this domain as pending. When hosting is connected, DNS records and SSL can be verified automatically.</p></div><button className="aw-primary" onClick={() => { setWorkspace(current => ({ ...current, domains: dialog.domainId ? current.domains.map(item => item.id === dialog.domainId ? { ...item, name, assetId: domainAsset, status: 'Pending', ssl: 'Not configured', default: false } : item) : [...current.domains, { id: crypto.randomUUID(), name, assetId: domainAsset, status: 'Pending', ssl: 'Not configured', default: false }] })); close(); showToast.success('Domain saved · verification pending'); }}>Save pending domain</button></>}
 </> : <form onSubmit={onSubmit}><p>{dialog.type === 'ai' ? 'Describe your business to personalize a starter website. Live AI generation is not connected.' : dialog.type === 'create' ? 'Start with an asset, then organize and edit its pages.' : dialog.type === 'add' ? 'Add a page to your customer experience.' : ''}</p><label>{dialog.type === 'ai' ? 'Business / website name' : 'Name'}<input autoFocus value={name} onChange={e => setName(e.target.value)} required maxLength={100} placeholder={dialog.type === 'add' ? 'About us' : kind === 'funnel' ? 'My new funnel' : 'My new website'}/></label>{dialog.type === 'add' && <><label>URL path<input value={path} onChange={e => setPath(e.target.value)} placeholder="/about"/></label>{kind === 'funnel' && <label>Step type<AssetSelect value={stepType} onChange={e => setStepType(e)} options={[...['Landing', 'Form', 'Thank You', 'Booking', 'Confirmation'].map(type => ({value:type,label:type}))]}/></label>}</>}{dialog.type === 'ai' && <label>Business description<textarea value={path} onChange={e => setPath(e.target.value)}/></label>}{error && <p className="aw-error" role="alert">{error}</p>}<footer><button type="button" className="aw-secondary" onClick={close}>Cancel</button><button className="aw-primary">{dialog.type === 'rename' ? 'Save name' : dialog.type === 'add' ? 'Add ' + (kind === 'funnel' ? 'Step' : 'Page') : 'Create ' + (kind === 'funnel' ? 'Funnel' : 'Website')}</button></footer></form>}
 </div></Modal>;
}
