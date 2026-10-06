import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`st-toggle${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}><span/></button>;
}
export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: string }) { return <span className={`st-badge ${tone}`}>{children}</span>; }
export function Card({ title, description, action, children, className = '' }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`st-card ${className}`}>{title && <div className="st-card-heading"><div><h3>{title}</h3>{description && <p>{description}</p>}</div>{action}</div>}{children}</section>;
}
export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
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
  return <div className="st-modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="st-modal"><div className="st-modal-heading"><h2 id={titleId}>{title}</h2><button className="st-icon-button" aria-label="Close dialog" onClick={close}><X size={18}/></button></div>{children}</div></div>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="st-field"><span>{label}</span>{children}</label>; }
export function PanelHeading({ title, description }: { title: string; description: string }) { return <div className="st-panel-heading"><h2>{title}</h2><p>{description}</p></div>; }
