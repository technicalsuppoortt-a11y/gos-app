import { connectWorkspaceDomain } from '../backend/hosting';
import { backendError } from '../backend/firebase';
import { showToast } from '../utils/toast';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Check, Globe, Plus, ShieldCheck } from 'lucide-react';
import { AssetSearch } from './AssetControls';
import { Modal } from './settings/kit';
import type { Asset, Workspace } from './asset-model';

export function FunnelDomainPicker({asset,workspace,setWorkspace,close,add}:{asset:Asset;workspace:Workspace;setWorkspace:Dispatch<SetStateAction<Workspace>>;close:()=>void;add:()=>void}) {
  useUILanguage();
 const navigate = useNavigate();
 const [search,setSearch]=useState(''),[chosen,setChosen]=useState(workspace.domains.find(domain=>domain.name===asset.domain)?.id??'');
 const rows=workspace.domains.filter(domain=>domain.name.toLowerCase().includes(search.toLowerCase())),domain=workspace.domains.find(domain=>domain.id===chosen),owner=workspace.assets.find(item=>item.id===domain?.assetId);
  const handleConnect = () => {
    if (!domain) return;
    setWorkspace(current => ({
      ...current,
      assets: current.assets.map(item =>
        item.id === asset.id
          ? { ...item, domain: domain.name }
          : (item.domain === domain.name ? { ...item, domain: '' } : item)
      ),
      domains: current.domains.map(d =>
        d.id === domain.id
          ? { ...d, assetId: asset.id }
          : (d.name === domain.name ? { ...d, assetId: asset.id } : d)
      ),
    }));
    void connectWorkspaceDomain(domain.id, asset.id, domain.name)
      .then(result => {
        close();
        showToast.info(result.domain.status === 'Connected' ? 'Domain connected' : 'Domain reassigned. Open domain configuration to verify DNS and SSL.');
      })
      .catch(error => {
        showToast.error(backendError(error));
      });
  };
  return <Modal title={translateText(`Choose a ${asset.kind} domain`)} close={close}><div className="aw-modal-body fn-domain-picker"><p>{translateText("Select a connected domain for ")}{localizeNode(asset.name)}.</p><AssetSearch value={search} onChange={setSearch} placeholder={translateText("Search available domains...")}/><div className="fn-domain-options" role="radiogroup" aria-label={translateText("Available domains")}>{localizeNode(rows.map(domain=><button role="radio" aria-checked={chosen===domain.id} disabled={domain.status!=='Connected'} key={domain.id} onClick={()=>setChosen(domain.id)}><span className="fn-domain-symbol"><Globe size={19}/></span><span><b>{localizeNode(domain.name)}</b><small>{localizeNode(workspace.assets.find(item=>item.id===domain.assetId)?.name??'Available to assign')} · {localizeNode(domain.status)}</small></span><span className={'fn-ssl '+(domain.ssl==='Active'?'active':'')}><ShieldCheck size={13}/>{localizeNode(domain.ssl==='Active'?'SSL active':domain.ssl)}</span>{localizeNode(chosen===domain.id&&<Check size={16}/>)}</button>))}</div>{localizeNode(!rows.length&&<div className="fn-no-results">{translateText("No matching domains. Add a domain to get started.")}</div>)}{localizeNode(owner&&owner.id!==asset.id&&<p className="aw-info">{translateText("Connecting will reassign this domain from ")}{localizeNode(owner.name)}{translateText(" to this ")}{localizeNode(asset.kind)}.</p>)}<button className="fn-add-domain" onClick={add}><Plus size={15}/>{translateText("Add New Domain")}</button><button className="fn-add-domain" onClick={()=>{close();navigate('/dashboard/domains');}}><Globe size={15}/>{translateText("Manage all domains")}</button><footer><button className="aw-secondary" onClick={close}>{translateText("Cancel")}</button><button className="aw-primary" disabled={!domain||domain.status!=='Connected'} onClick={handleConnect}>{translateText("Connect domain")}</button></footer></div></Modal>;
}
