import React, { useState } from 'react';
import { GitBranch, PanelsTopLeft, Sparkles } from 'lucide-react';
import { FunnelBuilderView } from './FunnelBuilderView';
import { WebsiteBuilderView } from './WebsiteBuilderView';
import './funnel-builder.css';

export type BuilderMode = 'funnel' | 'website';

/** Shared mode shell for the two distinct Funnel & Website workflows. */
export const FunnelBuilder: React.FC = () => {
  const [mode, setMode] = useState<BuilderMode>('funnel');
  return <div className="fb-mode-host">
    <header className="fb-mode-navbar">
      <div className="fb-mode-heading"><span><Sparkles size={15}/></span><div><b>Funnel &amp; Website</b><small>Build connected customer experiences</small></div></div>
      <nav className="fb-mode-switch" aria-label="Builder mode">
        <button className={mode === 'funnel' ? 'active' : ''} aria-pressed={mode === 'funnel'} onClick={() => setMode('funnel')}><GitBranch size={15}/> Funnel Builder</button>
        <button className={mode === 'website' ? 'active' : ''} aria-pressed={mode === 'website'} onClick={() => setMode('website')}><PanelsTopLeft size={15}/> Website Builder</button>
      </nav>
    </header>
    <main className="fb-mode-content">{mode === 'funnel' ? <FunnelBuilderView/> : <WebsiteBuilderView/>}</main>
  </div>;
};

export default FunnelBuilder;
