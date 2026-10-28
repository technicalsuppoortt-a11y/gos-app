import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { previewScreens } from './preview/screens';
import { retryImport } from '../../router/chunkRecovery';
type Snapshots = typeof import('./preview/static-snapshots.json');
import './native-dashboard-preview.css';



/** Original native markup, captured ahead of time. No dashboard app boots here. */
export function NativeDashboardPreview({ tab, ar, title }: { tab: number; ar: boolean; title: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [snapshots, setSnapshots] = useState<Snapshots | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => { void retryImport(() => import('./preview/static-snapshots.json')).then(module => { if (active) setSnapshots(module.default); }).catch(error => console.error('Preview failed to load:', error)); };
    if (!host.current || !('IntersectionObserver' in window)) { load(); return () => { active = false; }; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, { rootMargin: '300px' });
    observer.observe(host.current);
    return () => { active = false; observer.disconnect(); };
  }, []);
  const theme = useSelector((state: RootState) => state.ui.theme);
  const screen = previewScreens[tab] ?? previewScreens[0];
  const key = `${ar ? 'ar' : 'en'}-${theme}-${screen.id}` as keyof Snapshots['screens'];
  useLayoutEffect(() => {
    if (!host.current || !snapshots) return;
    const expandImages = (html: string) => html.replace(/__UPCLICK_IMAGE_(\d+)__/g, (_, index: string) => snapshots.images[Number(index)]);
    const styles = expandImages(snapshots.styles);
    // Shadow DOM keeps the original dashboard styles completely out of the landing page.
    const shadow = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    if (!shadow.firstChild) {
      const sheet = document.createElement('style'); sheet.textContent = styles; shadow.append(sheet);
    }
    let canvas = shadow.querySelector<HTMLDivElement>('.lp-static-document');
    if (!canvas) { canvas = document.createElement('div'); shadow.append(canvas); }
    canvas.className = `lp-static-document${theme === 'dark' ? ' dark' : ''}`;
    canvas.dataset.theme = theme;
    canvas.dir = ar ? 'rtl' : 'ltr';
    canvas.lang = ar ? 'ar' : 'en';
    canvas.inert = true;
    canvas.innerHTML = `<div class="lp-static-body"><div class="lp-static-app">${expandImages(snapshots.screens[key])}</div></div>`;
    const fit = () => {
      const scale = host.current!.clientWidth / snapshots.width;
      const height = scale > 0 ? host.current!.clientHeight / scale : snapshots.height;
      canvas!.style.cssText = `--lp-static-height:${height}px;position:absolute;top:0;left:0;width:${snapshots.width}px;height:${height}px;transform-origin:top left;transform:scale(${scale})`;
    };
    fit();
    const observer = new ResizeObserver(fit); observer.observe(host.current);
    return () => observer.disconnect();
  }, [key, ar, theme, snapshots]);
  return <div className="lp-native-preview" data-preview-screen={screen.id} role="img" aria-label={title}>
    <span className="lp-native-demo-label">{ar ? 'بيانات توضيحية' : 'Demo data'}</span>
    <div ref={host} className="lp-native-static"/>
  </div>;
}

