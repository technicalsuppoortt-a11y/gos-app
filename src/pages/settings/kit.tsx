import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  useUILanguage();
  return <button type="button" role="switch" aria-checked={checked} aria-label={translateText(label)} disabled={disabled} className={`st-toggle${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}><span/></button>;
}
export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: string }) {
  useUILanguage(); return <span className={`st-badge ${tone}`}>{localizeNode(children)}</span>; }
export function Card({ title, description, action, children, className = '' }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  useUILanguage();
  return <section className={`st-card ${className}`}>{localizeNode(title && <div className="st-card-heading"><div><h3>{localizeNode(title)}</h3>{localizeNode(description && <p>{localizeNode(description)}</p>)}</div>{localizeNode(action)}</div>)}{localizeNode(children)}</section>;
}
export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  useUILanguage();
  const ref = useRef<HTMLDivElement>(null), titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]') ?? []);
    focusable()[0]?.focus();
    const before = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const items = focusable(), first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = before; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [close]);
  return <div className="st-modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="st-modal"><div className="st-modal-heading"><h2 id={titleId}>{localizeNode(title)}</h2><button className="st-icon-button" aria-label={translateText("Close dialog")} onClick={close}><X size={18}/></button></div>{localizeNode(children)}</div></div>;
}
export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  useUILanguage(); return <label className={`st-field ${className}`.trim()}><span>{localizeNode(label)}</span>{localizeNode(children)}</label>; }
export function PanelHeading({ title, description }: { title: string; description: string }) {
  useUILanguage(); return <div className="st-panel-heading"><h2>{localizeNode(title)}</h2><p>{localizeNode(description)}</p></div>; }
