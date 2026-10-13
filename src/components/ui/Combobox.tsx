import React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import './combobox.css';

export type ComboOption = { value: string; label: string; search?: string };
export function Combobox({ value, options, onChange, label, dir = 'ltr', searchable = false, searchLabel = 'Search…', emptyLabel = 'No results', name, disabled = false }: {
  value: string; options: readonly ComboOption[]; onChange: (value: string) => void; label: string;
  dir?: 'rtl' | 'ltr'; searchable?: boolean; searchLabel?: string; emptyLabel?: string; name?: string; disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false), [query, setQuery] = React.useState(''), [active, setActive] = React.useState(0);
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 250 });
  const [portalTarget, setPortalTarget] = React.useState<Element>(() => document.body);
  const trigger = React.useRef<HTMLButtonElement>(null), panel = React.useRef<HTMLDivElement>(null), input = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  const filtered = options.filter(o => `${o.label} ${o.value} ${o.search || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const selected = options.find(o => o.value === value);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const choose = (next: string) => { onChange(next); close(); };
  const openPanel = () => {
    const anchor = trigger.current; if (!anchor) return;
    const r = anchor.getBoundingClientRect(); const width = Math.min(Math.max(r.width, 245), innerWidth - 24);
    const height = Math.min(300, innerHeight - 24);
    setPosition({ top: r.bottom + height > innerHeight ? Math.max(12, r.top - height - 7) : r.bottom + 7, left: Math.max(12, Math.min(dir === 'rtl' ? r.right - width : r.left, innerWidth - width - 12)), width });
    setPortalTarget(anchor.closest('dialog') || document.body);
    setQuery(''); setActive(Math.max(0, options.findIndex(o => o.value === value))); setOpen(true);
  };
  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchable ? input.current?.focus() : panel.current?.focus());
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    const resize = () => setOpen(false);
    document.addEventListener('pointerdown', outside); window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize); };
  }, [open, searchable]);
  React.useEffect(() => { if (open) panel.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);
  const keyboard = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') setOpen(false);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, Math.min(filtered.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))); }
    if (e.key === 'Home' && !searchable) { e.preventDefault(); setActive(0); }
    if (e.key === 'End' && !searchable) { e.preventDefault(); setActive(filtered.length - 1); }
    if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); choose(filtered[active].value); }
  };
  return <div className="gos-combo" dir={dir}>
    {name && <input type="hidden" name={name} value={value}/>}
    <button type="button" ref={trigger} className="gos-combo-trigger" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} disabled={disabled} onClick={() => open ? close() : openPanel()} onKeyDown={e => { if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openPanel(); } }}><span>{selected?.label || value}</span><ChevronDown size={15}/></button>
    {open && createPortal(<div ref={panel} tabIndex={-1} className="gos-combo-panel" dir={dir} style={position} onKeyDown={keyboard}>
      {searchable && <div className="gos-combo-search"><Search size={15}/><input ref={input} aria-label={searchLabel} role="combobox" aria-controls={`${id}-list`} aria-expanded="true" aria-activedescendant={filtered.length ? `${id}-${active}` : undefined} value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} placeholder={searchLabel}/></div>}
      <div id={`${id}-list`} role="listbox" aria-label={label} className="gos-combo-options" aria-activedescendant={!searchable && filtered.length ? `${id}-${active}` : undefined}>
        {filtered.map((o, i) => <button type="button" role="option" id={`${id}-${i}`} key={o.value} data-index={i} aria-selected={value === o.value} tabIndex={-1} className={`gos-combo-option ${active === i ? 'is-highlighted' : ''}`} onPointerMove={() => setActive(i)} onClick={() => choose(o.value)}><span>{o.label}</span>{o.value === value && <Check size={14}/>}</button>)}
        {!filtered.length && <p className="gos-combo-empty">{emptyLabel}</p>}
      </div>
    </div>, portalTarget)}
  </div>;
}
