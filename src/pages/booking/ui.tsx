import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ellipsis, Search, X } from 'lucide-react';

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="bk-search"><Search size={15}/><input aria-label={placeholder} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>{value && <button type="button" aria-label="Clear search" onClick={() => onChange('')}><X size={13}/></button>}</label>;
}
export function Empty({ title, detail }: { title: string; detail?: string }) {
  return <div className="bk-empty"><b>{title}</b>{detail && <p>{detail}</p>}</div>;
}
export function Avatar({ name }: { name: string }) {
  return <span className="bk-avatar" aria-hidden="true">{name.split(' ').map(s => s[0]).slice(0, 2).join('')}</span>;
}
export function Modal({ title, close, children, wide = false }: React.PropsWithChildren<{ title: string; close: () => void; wide?: boolean }>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; el?.showModal(); return () => el?.close(); }, []);
  return <dialog className={`bk-dialog ${wide ? 'bk-builder-dialog' : ''}`} ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } }}><header><div><span className="bk-eyebrow">GOS / BOOKING WORKSPACE</span><h2>{title}</h2></div><button className="bk-icon" type="button" onClick={close} aria-label="Close dialog"><X size={19}/></button></header>{children}</dialog>;
}
export function Menu({ label, children, icon }: React.PropsWithChildren<{ label: string; icon?: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    content.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'pointerdown' && (content.current?.contains(e.target as Node) || button.current?.contains(e.target as Node))) return;
      setOpen(false); if (e.type === 'keydown') button.current?.focus();
    };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', close);
    window.addEventListener('resize', close); window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [open]);
  return <><button ref={button} className={icon ? 'bk-button' : 'bk-icon'} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => { const r = button.current!.getBoundingClientRect(); setPosition({ left: Math.max(8, Math.min(r.right - 210, window.innerWidth - 218)), top: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - 290)) }); setOpen(!open); }}>{icon || <Ellipsis size={17}/>}</button>{open && createPortal(<div className="bk-menu" ref={content} role="menu" aria-label={label} style={position} onClick={e => { if ((e.target as HTMLElement).closest('button')) { setOpen(false); button.current?.focus(); } }} onKeyDown={e => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); const items = Array.from(content.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')); const index = items.indexOf(document.activeElement as HTMLButtonElement);
    items[e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  }}>{children}</div>, document.body)}</>;
}

