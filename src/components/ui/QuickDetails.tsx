import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './quick-details.css';
export function QuickDetails({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestClose = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(close, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220);
  }, [close]);
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = 'hidden';
    return () => { clearTimeout(timer.current); dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className={`quick-details${closing ? ' is-closing' : ''}`} aria-label={title} onCancel={e => { e.preventDefault(); requestClose(); }} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) requestClose(); }}><header><div><span className="quick-details-eyebrow">Quick details</span><h2>{title}</h2></div><button type="button" aria-label="Close details" onClick={requestClose}>✕</button></header><div className="quick-details-body">{children}</div></dialog>, document.body);
}
