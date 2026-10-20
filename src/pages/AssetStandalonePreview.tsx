import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAssetWorkspace } from './asset-store';
import { PublishedPage } from './PublishedPage';
import type { Asset } from './asset-model';
import { translateText } from '../i18n/display';
import './asset-workspace.css';

export function AssetStandalonePreview() {
  const { assetId, pageId } = useParams();
  const location = useLocation(), navigate = useNavigate();
  const [workspace] = useAssetWorkspace();
  const state = location.state as { asset?: Asset; returnTo?: string } | null;
  const asset = state?.asset && state.asset.id === assetId ? state.asset : workspace.assets.find(item => item.id === assetId);
  const [selected, setSelected] = useState(pageId);
  const page = asset?.document.pages.find(item => item.id === selected) ?? asset?.document.pages[0];
  const back = () => navigate(state?.returnTo?.startsWith('/') && !state.returnTo.startsWith('//') ? state.returnTo : `/dashboard/${asset?.kind === 'funnel' ? 'funnels' : 'websites'}/${assetId}/edit/${page?.id ?? ''}`);
  return <>
    <button type="button" className="aw-secondary" onClick={back} style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}><ArrowLeft size={14}/>{translateText('Back to builder')}</button>
    {asset && page ? <PublishedPage asset={asset} pageId={page.id} onNavigate={setSelected}/> : <p role="status">{translateText('Preview unavailable. Return to the builder to choose a page.')}</p>}
  </>;
}
