import { AssetAsyncButton } from './AssetAsyncButton';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { PageInitializationDialog } from './PageInitializationDialog';
import { AssetSelect } from './AssetControls';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, ShieldCheck, LoaderCircle, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from './settings/kit';
import { createBuilderDocument } from './BuilderWorkspace';
import { AssetPreviewDialog } from './AssetPreviewDialog';
import { AIWebsiteDialog } from './AIWebsiteDialog';
import { images } from './asset-model';
import type { Asset, BuilderMode, Dialog, Workspace } from './asset-model';
import { showToast } from '../utils/toast';
import { connectWorkspaceDomain, deleteWorkspaceAsset } from '../backend/hosting';
import { backendError } from '../backend/firebase';
import { getCnameTarget, getApexIpTarget, isApexDomain, verifySiteDomain, type DnsVerificationResult } from '../backend/siteDomains';
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
    const [activeDnsTab, setActiveDnsTab] = useState<'cname' | 'a_record'>('cname');
    const [copiedKey, setCopiedKey] = useState<string>('');
    const [dnsResult, setDnsResult] = useState<DnsVerificationResult | null>(null);

    const cnameTarget = getCnameTarget();
    const apexIpTarget = getApexIpTarget();
    const cleanHost = name.trim().toLowerCase();
    const hostParts = cleanHost.split('.');
    const subdomainPrefix = hostParts.length > 2 ? hostParts[0] : (hostParts.length === 2 ? '@' : 'www');

    const copyText = async (key: string, value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(''), 2000);
        showToast.success('Copied to clipboard');
      } catch {
        window.prompt('Copy', value);
      }
    };

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
      catch (error) {
        const errText = backendError(error);
        setError(errText);
        showToast.error(errText);
      }
      finally { dnsLock.current = false; setDnsBusy(false); }
    };
    const verifyDomain = async (background = false) => {
      if (dnsLock.current) return;
      dnsLock.current = true; setDnsBusy(true); setError('');
      try {
        const cleanedHost = name.trim().toLowerCase();
        const diagResult = await verifySiteDomain(cleanedHost, {
          funnelId: domainAsset,
          tenantId: workspace.assets.find(a => a.id === domainAsset)?.id
        });
        setDnsResult(diagResult);

        const result = await connectWorkspaceDomain(domainRecordId, domainAsset, cleanedHost, 'check');
        setDnsDomain(result.domain);
        if (diagResult.matched || result.domain.status === 'Connected') {
          showToast.success('Domain connected · SSL active');
          setTimeout(() => close(), 1200);
        } else if (!background) {
          setDnsStep(3);
          const errText = diagResult.error || 'DNS records not verified yet. Propagation may take up to 24 hours.';
          showToast.error(errText);
        }
      } catch (error) {
        const errText = backendError(error);
        setError(errText);
        showToast.error(errText);
      }
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
        const created: Asset = { id, kind, name: title, domain: '', image, document, updated: new Date().toISOString(), description: dialog.template ?? 'Your new customer experience', settings: { seo: title, navigation: document.pages.map(page => page.name).join(', '), color: '#7C3AED' } };
        await setWorkspace(current => ({ ...current, assets: [created, ...current.assets] }));
        close();
        go(`${section}/${id}`);
        } catch (error) {
          const errText = backendError(error);
          setError(errText);
          showToast.error(errText);
        }
        finally { saveLock.current = false; setSaving(false); }
    };
    if (dialog.type === 'create') return <PageInitializationDialog kind={kind} close={close} create={async created=>{await setWorkspace(current=>({...current,assets:[created,...current.assets]}));close();go((created.kind==='website'?'websites':'funnels')+'/'+created.id+'/edit/'+created.document.pages[0].id);}}/>;
    if (dialog.type === 'preview' && asset) return <AssetPreviewDialog asset={asset} pageId={dialog.pageId} close={close}/>;
    if (dialog.type === 'ai') return <AIWebsiteDialog kind={kind} setWorkspace={setWorkspace} close={close} go={go}/>;
    return <Modal title={translateText(dialog.type === 'domain' ? 'Connect a domain' : dialog.type === 'delete' ? 'Delete ' + (dialog.pageId ? (kind === 'funnel' ? 'step' : 'page') : 'asset') : dialog.type === 'preview' ? `${asset?.name} · Preview` : dialog.type === 'add' ? `Add ${kind === 'funnel' ? 'step' : 'page'}` : dialog.type === 'rename' ? 'Rename asset' : `Create ${kind}`)} close={close}><div className={'aw-modal-body '+(dialog.type==='preview'&&kind==='funnel'?'aw-funnel-preview':'')}>
 {localizeNode(dialog.type === 'delete' ? <><p>{localizeNode(dialog.pageId ? 'This page and its content' : 'This asset and all its pages')}{translateText(" will be removed from this workspace. This cannot be undone.")}</p>{localizeNode(asset?.document.pages.length === 1 && dialog.pageId ? <p className="aw-error">{translateText("Keep at least one page. Delete the entire asset if you no longer need it.")}</p> : <AssetAsyncButton className="aw-danger" busyText="Deleting..." onClick={async () => {
   try {
     if (dialog.pageId && asset) {
       await updateAsset(asset.id, item => ({ ...item, document: { ...item.document, pages: item.document.pages.filter(page => page.id !== dialog.pageId), steps: item.document.steps.filter(step => step.pageId !== dialog.pageId), funnel: { ...item.document.funnel, pagesFlow: item.document.pages.filter(page => page.id !== dialog.pageId).map(page => page.id), status: 'Draft' } } }));
       showToast.success('Page deleted successfully');
     } else {
       await deleteWorkspaceAsset(dialog.assetId!);
       await setWorkspace(current => ({ ...current, assets: current.assets.filter(a => a.id !== dialog.assetId) }));
       showToast.success('Asset deleted successfully');
       close();
       go(section);
       return;
     }
     close();
   } catch (error) {
     showToast.error(backendError(error));
   }
 }}>{translateText("Delete permanently")}</AssetAsyncButton>)}</> : dialog.type === 'domain' ? <>
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
        } setName(cleaned); setError(''); void prepareDomain(cleaned); }}><label>{translateText("Domain name")}<input disabled={dnsBusy} value={name} onChange={e => setName(e.target.value)} placeholder={translateText("example.com")} required/></label><label>{translateText("Connect to")}<AssetSelect disabled={dnsBusy} value={domainAsset} required={true} onChange={e => setDomainAsset(e)} options={[{value:"",label:"Choose an asset"},...workspace.assets.filter(item => !item.archived).map(item => ({value:item.id,label:`${item.kind === 'funnel' ? 'Funnel' : 'Website'} · ${item.name}`}))]}/></label>{localizeNode(error && <p className="aw-error" role="alert">{localizeNode(error)}</p>)}<button className="aw-primary" disabled={dnsBusy} aria-busy={dnsBusy}>{dnsBusy ? <><LoaderCircle size={14} className="animate-spin"/>{translateText("Connecting...")}</> : <>{translateText("Continue ")}<ArrowRight size={14}/></>}</button></form> : dnsStep === 2 ? <><p>{translateText("Add the following DNS records through your domain registrar. Use CNAME for subdomains or A record for apex domains.")}</p><div style={{ display: 'flex', gap: 6, marginBottom: 12 }}><button type="button" className={`aw-secondary ${activeDnsTab === 'cname' ? 'active' : ''}`} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, borderColor: activeDnsTab === 'cname' ? '#7C3AED' : undefined }} onClick={() => setActiveDnsTab('cname')}>CNAME (Subdomain / www)</button><button type="button" className={`aw-secondary ${activeDnsTab === 'a_record' ? 'active' : ''}`} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, borderColor: activeDnsTab === 'a_record' ? '#7C3AED' : undefined }} onClick={() => setActiveDnsTab('a_record')}>A Record (Apex / @)</button></div>{activeDnsTab === 'cname' ? (<div className="aw-dns-record" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><div><b>CNAME</b><span>{subdomainPrefix === '@' ? 'www' : subdomainPrefix}</span><code>{cnameTarget}</code></div><button type="button" className="aw-secondary" style={{ padding: '6px 10px', height: 32 }} onClick={() => copyText('cname', cnameTarget)} title="Copy target">{copiedKey === 'cname' ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}</button></div>) : (<div className="aw-dns-record" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><div><b>A</b><span>@</span><code>{apexIpTarget}</code></div><button type="button" className="aw-secondary" style={{ padding: '6px 10px', height: 32 }} onClick={() => copyText('a_record', apexIpTarget)} title="Copy IP">{copiedKey === 'a_record' ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}</button></div>)}<p className="aw-info"><ShieldCheck size={16}/>{translateText("Automatic SSL certificate provisioning and Firebase Auth whitelisting are triggered once DNS records are verified.")}</p><div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button className="aw-secondary" onClick={() => setDnsStep(1)}>{translateText("Back")}</button><button className="aw-primary" onClick={() => { setDnsStep(3); void verifyDomain(); }}>{translateText("Continue to verification")}</button></div></> : <><div className="aw-verification"><ShieldCheck size={32}/><h3>{translateText("Waiting for DNS verification")}</h3><p>{translateText("Verifying DNS records and SSL provisioning for ")}<b>{name}</b>.{translateText(" Propagation can take from a few minutes up to 24 hours.")}</p>{dnsResult && (<div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: dnsResult.matched ? 'rgba(22, 163, 74, 0.08)' : 'rgba(245, 158, 11, 0.08)', border: `1px solid ${dnsResult.matched ? 'rgba(22, 163, 74, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`, fontSize: 12.5, textAlign: 'start' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: dnsResult.matched ? '#16a34a' : '#d97706', marginBottom: 4 }}>{dnsResult.matched ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<span>{dnsResult.matched ? `DNS Verified (${dnsResult.matchedType?.toUpperCase()} record matched)! SSL Active` : 'DNS records not verified yet'}</span></div>{dnsResult.cnames?.length ? <div><b>CNAMEs detected:</b> {dnsResult.cnames.join(', ')}</div> : null}{dnsResult.aRecords?.length ? <div><b>A Records (IPs) detected:</b> {dnsResult.aRecords.join(', ')}</div> : null}{!dnsResult.cnames?.length && !dnsResult.aRecords?.length && (<div style={{ color: '#94a3b8' }}>No DNS records detected for this host yet. Please verify your DNS registrar configuration.</div>)}</div>)}</div><div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button className="aw-secondary" onClick={() => setDnsStep(2)}>{translateText("Back to DNS records")}</button><button className="aw-primary" disabled={dnsBusy} aria-busy={dnsBusy} onClick={() => void verifyDomain()}>{dnsBusy ? <><LoaderCircle size={14} className="animate-spin"/>{translateText("Verifying...")}</> : translateText("Check DNS & SSL")}</button></div></>)}
 </> : <form onSubmit={onSubmit}><p>{localizeNode(dialog.type === 'add' ? 'Add a page to your customer experience.' : '')}</p><label>{localizeNode('Name')}<input autoFocus value={name} onChange={e => setName(e.target.value)} required maxLength={100} placeholder={translateText(dialog.type === 'add' ? 'About us' : kind === 'funnel' ? 'My new funnel' : 'My new website')}/></label>{localizeNode(dialog.type === 'add' && <><label>{translateText("URL path")}<input value={path} onChange={e => setPath(e.target.value)} placeholder={translateText("/about")}/></label>{localizeNode(kind === 'funnel' && <label>{translateText("Step type")}<AssetSelect value={stepType} onChange={e => setStepType(e)} options={[...['Landing', 'Form', 'Thank You', 'Booking', 'Confirmation'].map(type => ({value:type,label:type}))]}/></label>)}</>)}{localizeNode(error && <p className="aw-error" role="alert">{localizeNode(error)}</p>)}<footer><button type="button" className="aw-secondary" onClick={close}>{translateText("Cancel")}</button><button className="aw-primary" disabled={saving} aria-busy={saving}>{saving ? <><LoaderCircle size={14} className="animate-spin"/>{translateText("Saving...")}</> : localizeNode(dialog.type === 'rename' ? 'Save name' : dialog.type === 'add' ? 'Add ' + (kind === 'funnel' ? 'Step' : 'Page') : 'Create ' + (kind === 'funnel' ? 'Funnel' : 'Website'))}</button></footer></form>)}
 </div></Modal>;
}
