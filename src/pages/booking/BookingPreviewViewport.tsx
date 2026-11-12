import { translateText } from '../../i18n/display';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

// A real viewport keeps media queries, theme styles and form controls identical
// to the published page, independently of the editor's width and CSS selectors.
export function BookingPreviewViewport({ children, mobile }: { children: ReactNode; mobile: boolean }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!target) return;
    const syncTheme = () => { target.ownerDocument.documentElement.className = document.documentElement.className; };
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    syncTheme();
    return () => observer.disconnect();
  }, [target]);
  return <iframe title={translateText("Booking page preview")} width={mobile ? 390 : 1040} height={mobile ? 844 : 800}
    srcDoc="<!doctype html><html><head></head><body style='margin:0'><div id='booking-preview-root'></div></body></html>"
    onLoad={event => {
      const doc = event.currentTarget.contentDocument;
      if (!doc) return;
      doc.documentElement.className = document.documentElement.className;
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => doc.head.appendChild(style.cloneNode(true)));
      setTarget(doc.getElementById('booking-preview-root'));
    }} style={{ display: 'block', border: 0, width: mobile ? 390 : 1040, height: mobile ? 844 : 800 }}>
    {target && createPortal(children, target)}
  </iframe>;
}
