import { useEffect, useId, useRef, useState } from 'react';
import { Monitor, Tablet, Smartphone, X } from 'lucide-react';
import { AssetSelect } from './AssetControls';
import { PagePreview } from './AssetViews';
import type { Asset } from './asset-model';

export function AssetPreviewDialog({ asset, pageId, close }: { asset: Asset; pageId?: string; close: () => void }) {
  const [selected, setSelected] = useState(pageId ?? asset.document.pages[0]?.id), [device, setDevice] = useState('Desktop');
  const root = useRef<HTMLDivElement>(null), closeRef = useRef(close), titleId = useId();
  closeRef.current = close;
  const page = asset.document.pages.find(item => item.id === selected) ?? asset.document.pages[0];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const items = () => Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]') ?? []).filter(el => el.getClientRects().length);
    items()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const focusable = items(), first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <div className="aw-preview-scrim" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div ref={root} className="aw-preview-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="aw-preview-modal-header">
        <div className="aw-preview-modal-title"><h2 id={titleId}>{asset.name} · Preview</h2><p>Workspace preview · Live hosting is not connected.</p></div>
        <div className="aw-preview-modal-controls">
          <AssetSelect label={asset.kind === 'funnel' ? 'Preview step' : 'Preview page'} value={page?.id} onChange={setSelected} options={asset.document.pages.map(item => ({ value: item.id, label: item.name }))}/>
          <div className="aw-preview-device-switch flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200" role="group" aria-label="Preview viewport">
            {[{ name: 'Desktop', Icon: Monitor }, { name: 'Tablet', Icon: Tablet }, { name: 'Mobile', Icon: Smartphone }].map(({ name, Icon }) => <button key={name} type="button" aria-label={name + ' preview'} aria-pressed={device === name} className={device === name ? 'active bg-white shadow-sm text-purple-600 rounded-lg font-medium' : ''} onClick={() => setDevice(name)}><Icon size={16}/><span>{name}</span></button>)}
          </div>
          <button className="aw-preview-close" aria-label="Close dialog" onClick={close}><X size={20}/></button>
        </div>
      </header>
      <div className="aw-preview-modal-stage">{page && <div className={'aw-preview-viewport ' + device.toLowerCase() + ' transition-all duration-300 ease-in-out'}><PagePreview asset={asset} page={page} device={device} onNavigate={setSelected}/></div>}</div>
    </div>
  </div>;
}
