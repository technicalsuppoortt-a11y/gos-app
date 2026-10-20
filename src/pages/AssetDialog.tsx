import { AssetAsyncButton } from './AssetAsyncButton';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { PageInitializationDialog } from './PageInitializationDialog';
import { AssetSelect } from './AssetControls';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, ShieldCheck, LoaderCircle } from 'lucide-react';
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
    updateAsset: (id: string, update: (a: Asset) => Asset) => void | Promise<unknown>;
    close: () => void;
    go: (p: string) => void;
    section: string;
    selected: (id: string) => void;
};
export function AssetDialog({ dialog, kind, workspace, setWorkspace, updateAsset, close, go, section, selected }: Props) {
  useUILanguage();
    const asset = workspace.assets.find(item => item.id === dialog.assetId), domain = workspace.domains.find(item => item.id === dialog.domainId);
    const [name, setName] = useState(dialog.type === 'rename' ? asset?.name ?? '' : domain?.name ?? ''), [path, setPath] = useState(''), [error, setError] = useState(''), [dnsStep, setDnsStep] = useState(domain ? 2 : 1), [domainAsset, setDomainAsset] = useState(dialog.assetId ?? domain?.assetId ?? ''), [stepType, setStepType] = useState('Landing');
    const [domainRecordId] = useState(() => dialog.domainId ?? crypto.randomUUID());
    const [dnsDomain, setDnsDomain] = useState<Domain | undefined>(domain);
    const [dnsBusy, setDnsBusy] = useState(false);
    const dnsLock = useRef(false);
    const verifyRef = useRef<(background?: boolean) => Promise<void>>(async () => {});
    useEffect(() => {
      if (dialog.type !== 'domain' || dnsStep < 2 || dnsDomain?.status !== 'Pending') return;
      let cancelled = false, timer: ReturnType<typeof setTimeout>, delay = 15000;
      const poll = async () => {
        if (cancelled) return;
        if (!document.hidden) await verifyRef.current(true);
        delay = Math.min(delay * 1.5, 60000);
        if (!cancelled) timer = setTimeout(poll, delay);
      };
      timer = setTimeout(poll, delay);
      return () => { cancelled = true; clearTimeout(timer); };
    }, [dialog.type, dnsStep, dnsDomain?.status]);
    const prepareDomain = async (cleaned: string) => {
      if (dnsLock.current) return;
      dnsLock.current = true; setDnsBusy(true); setError('');
      try {
        const result = await connectWorkspaceDomain(domainRecordId, domainAsset, cleaned);
        setDnsDomain(result.domain);
        setDnsStep(2);
      }
      catch (error) { setError(backendError(error)); }
      finally { dnsLock.current = false; setDnsBusy(false); }
    };
    const verifyDomain = async (background = false) => {
      if (dnsLock.current) return;
      dnsLock.current = true; setDnsBusy(true); setError('');
      try {
        const result = await connectWorkspaceDomain(domainRecordId, domainAsset, name.trim().toLowerCase(), 'check');
        setDnsDomain(result.domain);
        if (result.domain.status === 'Connected') { close(); showToast.success('Domain connected · SSL active'); }
        else if (!background) setDnsStep(2);
      } catch (error) { setError(backendError(error)); }
      finally { dnsLock.current = false; setDnsBusy(false); }
    };


    verifyRef.current = verifyDomain;

    const [saving, setSaving] = useState(false);
    const saveLock = useRef(false);
    const onSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (saveLock.current) return;
        saveLock.current = true; setSaving(true);
        try {
        const title = name.trim();
        if (!title) {
            setError('Enter a name to continue.');
            return;
        }
        if (dialog.type === 'rename') {
            await updateAsset(dialog.assetId!, item => ({ ...item, name: title, document: { ...item.document, funnel: { ...item.document.funnel, name: title } } }));
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
            await updateAsset(asset.id, item => ({ ...item, document: { ...item.document, pages: [...item.document.pages, page], steps: kind === 'funnel' ? [...item.document.steps, { id, label: title, pageId: id, type: stepType as 'Landing' }] : [], funnel: { ...item.document.funnel, pagesFlow: [...item.document.pages.map(page => page.id), id], status: 'Draft' } } }));
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
        await setWorkspace(current => ({ ...current, assets: [created, ...current.assets] }));
        close();
        go(`${section}/${id}`);
        } catch (error) { setError(backendError(error)); }
        finally { saveLock.current = false; setSaving(false); }
    };
    if (dialog.type === 'create') return <PageInitializationDialog kind={kind} close={close} create={async created=>{await setWorkspace(current=>({...current,assets:[created,...current.assets]}));close();go((created.kind==='website'?'websites':'funnels')+'/'+created.id+'/edit/'+created.document.pages[0].id);}}/>;
    if (dialog.type === 'preview' && asset) return <AssetPreviewDialog asset={asset} pageId={dialog.pageId} close={close}/>;
    if (dialog.type === 'ai') return <AIWebsiteDialog kind={kind} setWorkspace={setWorkspace} close={close} go={go}/>;
    return <Modal title={translateText(dialog.type === 'domain' ? 'Connect a domain' : dialog.type === 'delete' ? 'Delete ' + (dialog.pageId ? (kind === 'funnel' ? 'step' : 'page') : 'asset') : dialog.type === 'preview' ? `${asset?.name} · Preview` : dialog.type === 'add' ? `Add ${kind === 'funnel' ? 'step' : 'page'}` : dialog.type === 'rename' ? 'Rename asset' : `Create ${kind}`)} close={close}><div className={'aw-modal-body '+(dialog.type==='preview'&&kind==='funnel'?'aw-funnel-preview':'')}>
 {localizeNode(dialog.type === 'delete' ? <><p>{localizeNode(dialog.pageId ? 'This page and its content' : 'This asset and all its pages')}{translateText(" will be removed from this workspace. This cannot be undone.")}</p>{localizeNode(asset?.document.pages.length === 1 && dialog.pageId ? <p className="aw-error">{translateText("Keep at least one page. Delete the entire asset if you no longer need it.")}</p> : <AssetAsyncButton className="aw-danger" busyText="Deleting..." onClick={async () => { if (dialog.pageId && asset) {
            await updateAsset(asset.id, item => ({ ...item, document: { ...item.document, pages: item.document.pages.filter(page => page.id !== dialog.pageId), steps: item.document.steps.filter(step => step.pageId !== dialog.pageId), funnel: { ...item.document.funnel, pagesFlow: item.document.pages.filter(page => page.id !== dialog.pageId).map(page => page.id), status: 'Draft' } } }));
        }
        else {
            await deleteWorkspaceAsset(dialog.assetId!); close(); go(section);
            return;
        } close(); }}>{translateText("Delete permanently")}</AssetAsyncButton>)}</> : dialog.type === 'domain' ? <>
 {error && dnsStep > 1 && <p className="aw-error" role="alert">{error}</p>}{dnsStep > 1 && dnsDomain?.status === 'Pending' && <div role="status">{dnsBusy && <span><LoaderCircle size={14} className="animate-spin"/>{translateText("Verifying...")}</span>}<p>{translateText("DNS and SSL are pending. Status refreshes automatically while this window is open. Propagation may take up to 24 hours.")}</p>{dnsDomain.issues?.map((issue, index) => <p key={index}>{issue}</p>)}</div>}<div className="aw-dns-steps">{localizeNode(['Domain', 'DNS records', 'Verification'].map((label, i) => <span key={label} className={dnsStep === i + 1 ? 'active' : ''}>{localizeNode(i + 1)}. {localizeNode(label)}</span>))}</div>
 {localizeNode(dnsStep === 1 ? <form onSubmit={e => { e.preventDefault(); const cleaned = name.trim().toLowerCase(); if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(cleaned)) {
            setError('Enter a valid domain such as example.com, without https:// or a path.');
            return;
        } if (workspace.domains.some(item => item.name === cleaned && item.id !== dialog.domainId)) {
            setError('This domain is already in your workspace. Use Manage to update it.');
            return;
        } if (!domainAsset) {
            setError('Choose a funnel or website to connect.');
            return;
        } setName(cleaned); setError(''); void prepareDomain(cleaned); }}><label>{translateText("Domain name")}<input disabled={dnsBusy} value={name} onChange={e => setName(e.target.value)} placeholder={translateText("example.com")} required/></label><label>{translateText("Connect to")}<AssetSelect disabled={dnsBusy} value={domainAsset} required={true} onChange={e => setDomainAsset(e)} options={[{value:"",label:"Choose an asset"},...workspace.assets.filter(item => !item.archived).map(item => ({value:item.id,label:`${item.kind === 'funnel' ? 'Funnel' : 'Website'} · ${item.name}`}))]}/></label>{localizeNode(error && <p className="aw-error" role="alert">{localizeNode(error)}</p>)}<button className="aw-primary" disabled={dnsBusy} aria-busy={dnsBusy}>{dnsBusy ? <><LoaderCircle size={14} className="animate-spin"/>{translateText("Connecting...")}</> : <>{translateText("Continue ")}<ArrowRight size={14}/></>}</button></form> : dnsStep === 2 ? <><p>{translateText("Add the following Firebase Hosting records through your DNS provider. Verification may take time to propagate.")}</p>{dnsDomain?.dnsRecords?.map((record,index)=><div className="aw-dns-record" key={index}><b>{record.type}</b><span>{record.domainName}</span><code>{record.requiredAction ? record.requiredAction + ": " : ""}{record.rdata}</code></div>)}<p className="aw-info"><ShieldCheck size={16}/>{translateText("Firebase Hosting verifies domain ownership, DNS routing and SSL before marking this domain connected.")}</p><button className="aw-secondary" onClick={() => setDnsStep(1)}>{translateText("Back")}</button><button className="aw-primary" onClick={() => setDnsStep(3)}>{translateText("Continue to verification")}</button></> : <><div className="aw-verification"><ShieldCheck size={32}/><h3>{translateText("Waiting for DNS verification")}</h3><p>{translateText("Check Firebase Hosting for DNS propagation and SSL certificate readiness. The domain remains pending until both are verified.")}</p></div><button className="aw-primary" disabled={dnsBusy} aria-busy={dnsBusy} onClick={() => void verifyDomain()}>{dnsBusy ? <><LoaderCircle size={14} className="animate-spin"/>{translateText("Verifying...")}</> : translateText("Check DNS & SSL")}</button></>)}
 </> : <form onSubmit={onSubmit}><p>{localizeNode(dialog.type === 'add' ? 'Add a page to your customer experience.' : '')}</p><label>{localizeNode('Name')}<input autoFocus value={name} onChange={e => setName(e.target.value)} required maxLength={100} placeholder={translateText(dialog.type === 'add' ? 'About us' : kind === 'funnel' ? 'My new funnel' : 'My new website')}/></label>{localizeNode(dialog.type === 'add' && <><label>{translateText("URL path")}<input value={path} onChange={e => setPath(e.target.value)} placeholder={translateText("/about")}/></label>{localizeNode(kind === 'funnel' && <label>{translateText("Step type")}<AssetSelect value={stepType} onChange={e => setStepType(e)} options={[...['Landing', 'Form', 'Thank You', 'Booking', 'Confirmation'].map(type => ({value:type,label:type}))]}/></label>)}</>)}{localizeNode(error && <p className="aw-error" role="alert">{localizeNode(error)}</p>)}<footer><button type="button" className="aw-secondary" onClick={close}>{translateText("Cancel")}</button><button className="aw-primary" disabled={saving} aria-busy={saving}>{saving ? <><LoaderCircle size={14} className="animate-spin"/>{translateText("Saving...")}</> : localizeNode(dialog.type === 'rename' ? 'Save name' : dialog.type === 'add' ? 'Add ' + (kind === 'funnel' ? 'Step' : 'Page') : 'Create ' + (kind === 'funnel' ? 'Funnel' : 'Website'))}</button></footer></form>)}
 </div></Modal>;
}
