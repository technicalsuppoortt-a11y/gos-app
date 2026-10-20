import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Monitor, Tablet, Smartphone } from 'lucide-react';
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
  const [viewport, setViewport] = useState<'Desktop' | 'Tablet' | 'Mobile'>('Desktop');
  const [frameWidth, setFrameWidth] = useState(Math.min(window.innerWidth, 1280));
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const page = asset?.document.pages.find(item => item.id === selected) ?? asset?.document.pages[0];
  const back = () => navigate(state?.returnTo?.startsWith('/') && !state.returnTo.startsWith('//') ? state.returnTo : `/dashboard/${asset?.kind === 'funnel' ? 'funnels' : 'websites'}/${assetId}/edit/${page?.id ?? ''}`);
  return <>
    <div role="toolbar" aria-label="Preview viewport" style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 1000, display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 'calc(100% - 32px)' }}>{([{ name: 'Desktop', Icon: Monitor }, { name: 'Tablet', Icon: Tablet }, { name: 'Mobile', Icon: Smartphone }] as const).map(({ name, Icon }) => <button key={name} type="button" className={viewport === name ? 'aw-primary' : 'aw-secondary'} aria-pressed={viewport === name} aria-label={name + ' preview'} onClick={() => setViewport(name)}><Icon size={14}/>{translateText(name)}</button>)}<button type="button" className="aw-secondary" onClick={back}><ArrowLeft size={14}/>{translateText('Back to builder')}</button></div>
    <div ref={frame} className={viewport === 'Desktop' ? 'max-w-screen-xl' : viewport === 'Tablet' ? 'max-w-md' : 'max-w-sm'} style={{ width: '100%', margin: '0 auto', transition: 'max-width 250ms ease' }}>{asset && page ? <PublishedPage key={asset.id} asset={asset} pageId={page.id} viewportWidth={frameWidth} viewportDevice={viewport === 'Tablet' ? 'tablet' : viewport === 'Mobile' ? 'mobile' : undefined} onNavigate={setSelected}/> : <p role="status">{translateText('Preview unavailable. Return to the builder to choose a page.')}</p>}</div>
  </>;
}
