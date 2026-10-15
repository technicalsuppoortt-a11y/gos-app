import React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import './combobox.css';

export type ComboOption = {
  value: string;
  label: string;
  badge?: string;
  sublabel?: string;
  search?: string;
};

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
  const [position, setPosition] = React.useState<{
    top: number;
    left: number;
    width: number;
    maxHeight?: number;
  }>({ top: 0, left: 0, width: 240, maxHeight: 280 });
  const [usePortal, setUsePortal] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const id = React.useId();

  const filtered = React.useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return options;
    return options.filter(o =>
      `${o.label} ${o.value} ${o.badge || ''} ${o.sublabel || ''} ${o.search || ''}`
        .toLocaleLowerCase()
        .includes(q)
    );
  }, [options, query]);

  const selected = options.find(
    o => o.value === value || o.value.toLowerCase() === value.toLowerCase()
  );

  const close = React.useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  const choose = (next: string) => {
    onChange(next);
    close();
  };

  const updatePosition = React.useCallback(() => {
    const anchor = trigger.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();

    // If anchor is scrolled off-screen, close
    if (r.bottom < -40 || r.top > window.innerHeight + 40) {
      setOpen(false);
      return;
    }

    const triggerWidth = r.width;
    // Strictly match trigger width, with safe bounds
    const width = Math.min(Math.max(triggerWidth, 180), window.innerWidth - 24);

    const maxMenuHeight = 280;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;

    const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const availableSpace = placeAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(120, Math.min(maxMenuHeight, availableSpace));

    const top = placeAbove
      ? Math.max(8, r.top - maxHeight - 4)
      : Math.min(window.innerHeight - maxHeight - 8, r.bottom + 4);

    const left = dir === 'rtl'
      ? Math.max(12, Math.min(r.right - width, window.innerWidth - width - 12))
      : Math.max(12, Math.min(r.left, window.innerWidth - width - 12));

    setPosition({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
      maxHeight: Math.round(maxHeight),
    });
  }, [dir]);

  const openPanel = () => {
    const anchor = trigger.current;
    if (!anchor) return;
    const inDialog = Boolean(anchor.closest('dialog, [role="dialog"], .ob-dialog'));
    const inTable = Boolean(anchor.closest('table, tbody, tr, td, .ob-table-card'));
    const shouldPortal = portal !== undefined ? portal : (!inDialog && !inTable);
    setUsePortal(shouldPortal);

    if (shouldPortal) {
      updatePosition();
    }

    setQuery('');
    const selectedIdx = options.findIndex(
      o => o.value === value || o.value.toLowerCase() === value.toLowerCase()
    );
    setActive(Math.max(0, selectedIdx));
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => (searchable ? input.current?.focus() : panel.current?.focus()));

    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      if (panel.current && panel.current.contains(event.target as Node)) {
        return;
      }
      if (usePortal) {
        updatePosition();
      }
    };

    const handleResize = () => {
      if (usePortal) {
        updatePosition();
      } else {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, searchable, usePortal, updatePosition]);

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
      style={usePortal ? {
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
      } : undefined}
      onKeyDown={keyboard}
    >
      {searchable && (
        <div className="gos-combo-search-wrapper">
          <div className="gos-combo-search">
            <Search size={14} className="gos-combo-search-icon" />
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
            {query && (
              <button
                type="button"
                tabIndex={-1}
                className="gos-combo-search-clear"
                onClick={() => {
                  setQuery('');
                  setActive(0);
                  input.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}
      <div
        id={`${id}-list`}
        role="listbox"
        aria-label={label}
        className="gos-combo-options"
        aria-activedescendant={!searchable && filtered.length ? `${id}-${active}` : undefined}
      >
        {filtered.map((o, i) => {
          const isSelected = o.value === value || o.value.toLowerCase() === value.toLowerCase();
          return (
            <button
              type="button"
              role="option"
              id={`${id}-${i}`}
              key={o.value}
              data-index={i}
              aria-selected={isSelected}
              tabIndex={-1}
              className={`gos-combo-option ${active === i ? 'is-highlighted' : ''} ${isSelected ? 'is-selected' : ''}`}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(o.value)}
            >
              {o.badge && <span className="gos-combo-pill">{o.badge}</span>}
              <span className="gos-combo-option-content">
                <span className="gos-combo-option-title">{o.label}</span>
                {o.sublabel && <span className="gos-combo-option-sub">{o.sublabel}</span>}
              </span>
              {isSelected && <Check size={14} className="gos-combo-check" />}
            </button>
          );
        })}
        {!filtered.length && (
          <div className="gos-combo-empty">
            <p>{emptyLabel}</p>
          </div>
        )}
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
        <span className="gos-combo-trigger-content">
          {selected?.badge && <span className="gos-combo-pill">{selected.badge}</span>}
          <span className="gos-combo-label">{selected?.label || value}</span>
        </span>
        <ChevronDown size={15} className="gos-combo-chevron" />
      </button>
      {open && (usePortal ? createPortal(menuContent, document.body) : menuContent)}
    </div>
  );
}
