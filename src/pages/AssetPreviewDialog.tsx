import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import { useEffect, useId, useRef, useState } from 'react';
import { Monitor, Tablet, Smartphone, X, Sun, Moon } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { AssetSelect } from './AssetControls';
import { PagePreview, isColorDark } from './AssetViews';
import type { Asset } from './asset-model';

export function AssetPreviewDialog({ asset, pageId, close }: { asset: Asset; pageId?: string; close: () => void }) {
  useUILanguage();
  const globalTheme = useSelector((state: RootState) => state.ui.theme);
  const isSystemDark = globalTheme === 'dark';

  const [selected, setSelected] = useState(pageId ?? asset.document.pages[0]?.id), [device, setDevice] = useState('Desktop');
  const root = useRef<HTMLDivElement>(null), closeRef = useRef(close), titleId = useId();
  closeRef.current = close;
  const page = asset.document.pages.find(item => item.id === selected) ?? asset.document.pages[0];

  const isPageWhite = !page?.backgroundColor || ['#ffffff', '#fff', 'white', 'rgb(255, 255, 255)', 'rgb(255,255,255)'].includes(page.backgroundColor.trim().toLowerCase());
  const isCustomDark = Boolean(page?.backgroundColor && isColorDark(page.backgroundColor));

  // Canvas theme state: default to 'auto', which syncs with global theme / page background
  const [canvasTheme, setCanvasTheme] = useState<'auto' | 'dark' | 'light'>('auto');

  // Resolved effective theme for preview canvas
  const effectiveDark = canvasTheme === 'auto'
    ? (isCustomDark || (isSystemDark && isPageWhite))
    : (canvasTheme === 'dark');

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
        <div className="aw-preview-modal-title"><h2 id={titleId}>{localizeNode(asset.name)}{translateText(" · Preview")}</h2><p>{translateText("Workspace preview · Live hosting is not connected.")}</p></div>
        <div className="aw-preview-modal-controls">
          <AssetSelect label={asset.kind === 'funnel' ? 'Preview step' : 'Preview page'} value={page?.id} onChange={setSelected} options={asset.document.pages.map(item => ({ value: item.id, label: item.name }))}/>
          <div className="aw-preview-device-switch flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200" role="group" aria-label={translateText("Preview viewport")}>
            {localizeNode([{ name: 'Desktop', Icon: Monitor }, { name: 'Tablet', Icon: Tablet }, { name: 'Mobile', Icon: Smartphone }].map(({ name, Icon }) => <button key={name} type="button" aria-label={translateText(name + ' preview')} aria-pressed={device === name} className={device === name ? 'active bg-white shadow-sm text-purple-600 rounded-lg font-medium' : ''} onClick={() => setDevice(name)}><Icon size={16}/><span>{localizeNode(name)}</span></button>))}
          </div>
          <button
            type="button"
            className={`aw-preview-theme-toggle flex items-center gap-1.5 px-3 h-[36px] rounded-xl border text-[12px] font-medium transition-all ${effectiveDark ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            title={translateText(effectiveDark ? "Switch preview canvas to light mode" : "Switch preview canvas to dark mode")}
            aria-label={translateText(effectiveDark ? "Switch preview canvas to light mode" : "Switch preview canvas to dark mode")}
            onClick={() => setCanvasTheme(effectiveDark ? 'light' : 'dark')}
          >
            {effectiveDark ? <Sun size={15} /> : <Moon size={15} />}
            <span>{translateText(effectiveDark ? "Light Canvas" : "Dark Canvas")}</span>
          </button>
          <button className="aw-preview-close" aria-label={translateText("Close dialog")} onClick={close}><X size={20}/></button>
        </div>
      </header>
      <div className="aw-preview-modal-stage">{localizeNode(page && <div className={'aw-preview-viewport ' + device.toLowerCase() + (effectiveDark ? ' dark' : ' light') + ' transition-all duration-300 ease-in-out'}><PagePreview asset={asset} page={page} device={device} onNavigate={setSelected} isDark={effectiveDark}/></div>)}</div>
    </div>
  </div>;
}
