import { useCallback, useEffect, useRef, useState } from 'react';
import { previewScreens } from './preview/screens';
import './native-dashboard-preview.css';

export function NativeDashboardPreview({ tab, ar, title }: { tab: number; ar: boolean; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null), container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ scale: .35, height: 990 });
  const screen = previewScreens[tab] ?? previewScreens[0];
  const sync = useCallback(() => {
    const root = document.documentElement;
    frame.current?.contentWindow?.postMessage({ type: 'gos-demo-view', screen: screen.id, language: ar ? 'ar' : 'en', theme: root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light' }, window.location.origin);
  }, [screen.id, ar]);
  useEffect(() => {
    const receive = (event: MessageEvent) => { if (event.source === frame.current?.contentWindow && event.origin === window.location.origin && event.data?.type === 'gos-demo-screen-ready') { setReady(true); sync(); } };
    window.addEventListener('message', receive); sync();
    const observer = new MutationObserver(sync); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => { window.removeEventListener('message', receive); observer.disconnect(); };
  }, [sync]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => { const scale = entry.contentRect.width / 1200; if (scale > 0) setSize({ scale, height: Math.ceil(entry.contentRect.height / scale) }); });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="lp-native-preview" data-preview-screen={screen.id} aria-busy={!ready}>
    <span className="lp-native-demo-label">{ar ? 'بيانات توضيحية' : 'Demo data'}</span>
    {!ready && <div className="lp-native-loading" role="status">{ar ? 'جارٍ تحميل المعاينة…' : 'Loading dashboard preview…'}</div>}
    <iframe ref={frame} src={`${import.meta.env.BASE_URL}landing-preview.html`} title={`${title} — ${ar ? 'معاينة توضيحية' : 'demo dashboard preview'}`} tabIndex={-1} sandbox="allow-scripts allow-same-origin" onLoad={sync} style={{ width: 1440, height: size.height, transform: `scale(${size.scale})`, opacity: ready ? 1 : 0 }}/>
  </div>;
}
