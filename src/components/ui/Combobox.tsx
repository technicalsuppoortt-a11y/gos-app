import React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import './combobox.css';

export type ComboOption = { value: string; label: string; search?: string };

export function Combobox({
  value,
  options,
  onChange,
  label,
  dir = 'ltr',
  searchable = false,
  searchLabel = 'Search…',
  emptyLabel = 'No results',
  name,
  disabled = false,
  portal,
}: {
  value: string;
  options: readonly ComboOption[];
  onChange: (value: string) => void;
  label: string;
  dir?: 'rtl' | 'ltr';
  searchable?: boolean;
  searchLabel?: string;
  emptyLabel?: string;
  name?: string;
  disabled?: boolean;
  portal?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 250 });
  const [usePortal, setUsePortal] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const id = React.useId();

  const filtered = options.filter(o =>
    `${o.label} ${o.value} ${o.search || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
  const selected = options.find(o => o.value === value);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const choose = (next: string) => {
    onChange(next);
    close();
  };

  const openPanel = () => {
    const anchor = trigger.current;
    if (!anchor) return;
    const inDialog = Boolean(anchor.closest('dialog, [role="dialog"], .ob-dialog'));
    const inTable = Boolean(anchor.closest('table, tbody, tr, td, .ob-table-card'));
    const shouldPortal = portal !== undefined ? portal : (!inDialog && !inTable);
    setUsePortal(shouldPortal);

    if (shouldPortal) {
      const r = anchor.getBoundingClientRect();
      const width = Math.min(Math.max(r.width, 245), window.innerWidth - 24);
      const height = Math.min(options.length * 40 + 20, 250);
      setPosition({
        top: r.bottom + height > window.innerHeight ? Math.max(12, r.top - height - 7) : r.bottom + 7,
        left: Math.max(12, Math.min(dir === 'rtl' ? r.right - width : r.left, window.innerWidth - width - 12)),
        width,
      });
    }

    setQuery('');
    setActive(Math.max(0, options.findIndex(o => o.value === value)));
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => (searchable ? input.current?.focus() : panel.current?.focus()));
    const outside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const resize = () => setOpen(false);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', resize);
    };
  }, [open, searchable]);

  React.useEffect(() => {
    if (open) {
      panel.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [active, open]);

  const keyboard = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
    if (e.key === 'Tab') setOpen(false);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(0, Math.min(filtered.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))));
    }
    if (e.key === 'Home' && !searchable) {
      e.preventDefault();
      setActive(0);
    }
    if (e.key === 'End' && !searchable) {
      e.preventDefault();
      setActive(filtered.length - 1);
    }
    if (e.key === 'Enter' && filtered[active]) {
      e.preventDefault();
      choose(filtered[active].value);
    }
  };

  const menuContent = (
    <div
      ref={panel}
      tabIndex={-1}
      className={`gos-combo-panel ${usePortal ? 'is-portaled' : 'absolute top-full left-0 mt-1 w-full z-50'}`}
      dir={dir}
      style={usePortal ? position : undefined}
      onKeyDown={keyboard}
    >
      {searchable && (
        <div className="gos-combo-search">
          <Search size={15} />
          <input
            ref={input}
            aria-label={searchLabel}
            role="combobox"
            aria-controls={`${id}-list`}
            aria-expanded="true"
            aria-activedescendant={filtered.length ? `${id}-${active}` : undefined}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder={searchLabel}
          />
        </div>
      )}
      <div
        id={`${id}-list`}
        role="listbox"
        aria-label={label}
        className="gos-combo-options"
        aria-activedescendant={!searchable && filtered.length ? `${id}-${active}` : undefined}
      >
        {filtered.map((o, i) => (
          <button
            type="button"
            role="option"
            id={`${id}-${i}`}
            key={o.value}
            data-index={i}
            aria-selected={value === o.value}
            tabIndex={-1}
            className={`gos-combo-option ${active === i ? 'is-highlighted' : ''}`}
            onPointerMove={() => setActive(i)}
            onClick={() => choose(o.value)}
          >
            <span>{o.label}</span>
            {o.value === value && <Check size={14} />}
          </button>
        ))}
        {!filtered.length && <p className="gos-combo-empty">{emptyLabel}</p>}
      </div>
    </div>
  );

  return (
    <div className={`gos-combo relative ${open ? 'is-open z-50' : ''}`} dir={dir}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        ref={trigger}
        className="gos-combo-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        disabled={disabled}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={e => {
          if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault();
            openPanel();
          }
        }}
      >
        <span>{selected?.label || value}</span>
        <ChevronDown size={15} />
      </button>
      {open && (usePortal ? createPortal(menuContent, document.body) : menuContent)}
    </div>
  );
}
