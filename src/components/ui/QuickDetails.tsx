import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './quick-details.css';
export function QuickDetails({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return createPortal(<dialog ref={ref} className="quick-details" aria-label={title} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}><header><h2>{title}</h2><button type="button" aria-label="Close details" onClick={close}>✕</button></header><div className="quick-details-body">{children}</div></dialog>, document.body);
}
