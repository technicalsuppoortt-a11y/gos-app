import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { PageInitializationDialog } from './PageInitializationDialog';
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
import { connectWorkspaceDomain, deleteWorkspaceAsset } from '../backend/hosting';
import { backendError } from '../backend/firebase';
import type { Domain } from './asset-model';
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
  useUILanguage();
    const asset = workspace.assets.find(item => item.id === dialog.assetId), domain = workspace.domains.find(item => item.id === dialog.domainId);
    const [name, setName] = useState(dialog.type === 'rename' ? asset?.name ?? '' : domain?.name ?? ''), [path, setPath] = useState(''), [error, setError] = useState(''), [dnsStep, setDnsStep] = useState(1), [domainAsset, setDomainAsset] = useState(dialog.assetId ?? domain?.assetId ?? ''), [stepType, setStepType] = useState('Landing');
    const [domainRecordId] = useState(() => dialog.domainId ?? crypto.randomUUID());
    const [dnsDomain, setDnsDomain] = useState<Domain | undefined>(domain);
    const [dnsBusy, setDnsBusy] = useState(false);
    const prepareDomain = async (cleaned: string) => {
      if (dnsBusy) return;
      setDnsBusy(true);
      try {
        const result = await connectWorkspaceDomain(domainRecordId, domainAsset, cleaned);
        setDnsDomain(result.domain);
        setWorkspace(current => {
          const exists = current.domains.some(d => d.id === result.domain.id);
          return {
            ...current,
            domains: exists ? current.domains.map(d => d.id === result.domain.id ? result.domain : d) : [...current.domains, result.domain],
          };
        });
        setDnsStep(2);
      }
      catch (error) { setError(backendError(error)); }
      finally { setDnsBusy(false); }
    };
    const verifyDomain = async () => {
      if (dnsBusy) return;
      setDnsBusy(true);
      try {
        const result = await connectWorkspaceDomain(domainRecordId, domainAsset, name.trim().toLowerCase(), 'check');
        setDnsDomain(result.domain);
        setWorkspace(current => {
          const exists = current.domains.some(d => d.id === result.domain.id);
          const updatedDomains = exists ? current.domains.map(d => d.id === result.domain.id ? result.domain : d) : [...current.domains, result.domain];
          return {
            ...current,
            domains: updatedDomains,
            assets: result.domain.status === 'Connected'
              ? current.assets.map(a => a.id === domainAsset ? { ...a, domain: result.domain.name } : (a.domain === result.domain.name ? { ...a, domain: '' } : a))
              : current.assets,
          };
        });
        if (result.domain.status === 'Connected') { close(); showToast.success('Domain connected · SSL active'); }
        else { setDnsStep(2); showToast.info(result.domain.issues?.join(' ') || 'DNS or SSL is still propagating. Check the required records and try again.'); }
      } catch (error) { setError(backendError(error)); showToast.error(backendError(error)); }
      finally { setDnsBusy(false); }
    };


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
    if (dialog.type === 'create') return <PageInitializationDialog kind={kind} close={close} create={created=>{setWorkspace(current=>({...current,assets:[created,...current.assets]}));close();go((created.kind==='website'?'websites':'funnels')+'/'+created.id+'/edit/'+created.document.pages[0].id);}}/>;
    if (dialog.type === 'preview' && asset) return <AssetPreviewDialog asset={asset} pageId={dialog.pageId} close={close}/>;
    if (dialog.type === 'ai') return <AIWebsiteDialog kind={kind} setWorkspace={setWorkspace} close={close} go={go}/>;
    return <Modal title={translateText(dialog.type === 'domain' ? 'Connect a domain' : dialog.type === 'delete' ? 'Delete ' + (dialog.pageId ? (kind === 'funnel' ? 'step' : 'page') : 'asset') : dialog.type === 'preview' ? `${asset?.name} · Preview` : dialog.type === 'add' ? `Add ${kind === 'funnel' ? 'step' : 'page'}` : dialog.type === 'rename' ? 'Rename asset' : `Create ${kind}`)} close={close}><div className={'aw-modal-body '+(dialog.type==='preview'&&kind==='funnel'?'aw-funnel-preview':'')}>
 {localizeNode(dialog.type === 'delete' ? <><p>{localizeNode(dialog.pageId ? 'This page and its content' : 'This asset and all its pages')}{translateText(" will be removed from this workspace. This cannot be undone.")}</p>{localizeNode(asset?.document.pages.length === 1 && dialog.pageId ? <p className="aw-error">{translateText("Keep at least one page. Delete the entire asset if you no longer need it.")}</p> : <button className="aw-danger" onClick={() => { if (dialog.pageId && asset) {
            updateAsset(asset.id, item => ({ ...item, document: { ...item.document, pages: item.document.pages.filter(page => page.id !== dialog.pageId), steps: item.document.steps.filter(step => step.pageId !== dialog.pageId), funnel: { ...item.document.funnel, pagesFlow: item.document.pages.filter(page => page.id !== dialog.pageId).map(page => page.id), status: 'Draft' } } }));
        }
        else {
            void deleteWorkspaceAsset(dialog.assetId!).then(() => { close(); go(section); }).catch(error => showToast.error(backendError(error)));
            return;
        } close(); }}>{translateText("Delete permanently")}</button>)}</> : dialog.type === 'domain' ? <>
 <div className="aw-dns-steps">{localizeNode(['Domain', 'DNS records', 'Verification'].map((label, i) => <span key={label} className={dnsStep === i + 1 ? 'active' : ''}>{localizeNode(i + 1)}. {localizeNode(label)}</span>))}</div>
 {localizeNode(dnsStep === 1 ? <form onSubmit={e => { e.preventDefault(); const cleaned = name.trim().toLowerCase(); if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(cleaned)) {
            setError('Enter a valid domain such as example.com, without https:// or a path.');
            return;
        } if (workspace.domains.some(item => item.name === cleaned && item.id !== dialog.domainId)) {
            setError('This domain is already in your workspace. Use Manage to update it.');
            return;
        } if (!domainAsset) {
            setError('Choose a funnel or website to connect.');
            return;
        } setName(cleaned); setError(''); void prepareDomain(cleaned); }}><label>{translateText("Domain name")}<input value={name} onChange={e => setName(e.target.value)} placeholder={translateText("example.com")} required/></label><label>{translateText("Connect to")}<AssetSelect value={domainAsset} required={true} onChange={e => setDomainAsset(e)} options={[{value:"",label:"Choose an asset"},...workspace.assets.filter(item => !item.archived).map(item => ({value:item.id,label:`${item.kind === 'funnel' ? 'Funnel' : 'Website'} · ${item.name}`}))]}/></label>{localizeNode(error && <p className="aw-error" role="alert">{localizeNode(error)}</p>)}<button className="aw-primary" disabled={dnsBusy}>{translateText("Continue ")}<ArrowRight size={14}/></button></form> : dnsStep === 2 ? <><p>{translateText("Add the following Firebase Hosting records through your DNS provider. Verification may take time to propagate.")}</p>{dnsDomain?.dnsRecords?.map((record,index)=><div className="aw-dns-record" key={index}><b>{record.type}</b><span>{record.domainName}</span><code>{record.requiredAction ? record.requiredAction + ": " : ""}{record.rdata}</code></div>)}<p className="aw-info"><ShieldCheck size={16}/>{translateText("Firebase Hosting verifies domain ownership, DNS routing and SSL before marking this domain connected.")}</p><button className="aw-secondary" onClick={() => setDnsStep(1)}>{translateText("Back")}</button><button className="aw-primary" onClick={() => setDnsStep(3)}>{translateText("Continue to verification")}</button></> : <><div className="aw-verification"><ShieldCheck size={32}/><h3>{translateText("Waiting for DNS verification")}</h3><p>{translateText("Check Firebase Hosting for DNS propagation and SSL certificate readiness. The domain remains pending until both are verified.")}</p></div><button className="aw-primary" disabled={dnsBusy} onClick={() => void verifyDomain()}>{translateText("Check DNS & SSL")}</button></>)}
 </> : <form onSubmit={onSubmit}><p>{localizeNode(dialog.type === 'add' ? 'Add a page to your customer experience.' : '')}</p><label>{localizeNode('Name')}<input autoFocus value={name} onChange={e => setName(e.target.value)} required maxLength={100} placeholder={translateText(dialog.type === 'add' ? 'About us' : kind === 'funnel' ? 'My new funnel' : 'My new website')}/></label>{localizeNode(dialog.type === 'add' && <><label>{translateText("URL path")}<input value={path} onChange={e => setPath(e.target.value)} placeholder={translateText("/about")}/></label>{localizeNode(kind === 'funnel' && <label>{translateText("Step type")}<AssetSelect value={stepType} onChange={e => setStepType(e)} options={[...['Landing', 'Form', 'Thank You', 'Booking', 'Confirmation'].map(type => ({value:type,label:type}))]}/></label>)}</>)}{localizeNode(error && <p className="aw-error" role="alert">{localizeNode(error)}</p>)}<footer><button type="button" className="aw-secondary" onClick={close}>{translateText("Cancel")}</button><button className="aw-primary">{localizeNode(dialog.type === 'rename' ? 'Save name' : dialog.type === 'add' ? 'Add ' + (kind === 'funnel' ? 'Step' : 'Page') : 'Create ' + (kind === 'funnel' ? 'Funnel' : 'Website'))}</button></footer></form>)}
 </div></Modal>;
}
