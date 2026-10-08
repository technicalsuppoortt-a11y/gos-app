import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import './asset-controls.css';

type Option = string | { value: string; label: string; disabled?: boolean };
type SelectProps = {
  value?: string;
  defaultValue?: string;
  options: readonly Option[];
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
};
const emptyOption = '__aw_empty__';

/** The module uses the same Radix select primitive as the shared commerce controls. */
export function AssetSelect({ value, defaultValue = '', options, onChange, label, placeholder = 'Choose an option', className = '', required, disabled }: SelectProps) {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    if (!open) return;
    // The shared modal listens on document; dismiss the nested menu first.
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); setOpen(false);
    };
    window.addEventListener('keydown', dismiss, true);
    return () => window.removeEventListener('keydown', dismiss, true);
  }, [open]);
  const current = value ?? internal;
  const items = options.map(item => typeof item === 'string' ? { value: item, label: item } : item);
  const selected = items.find(item => item.value === current);
  return <span className={`aw-select ${className}`}>
    <Select.Root open={open} onOpenChange={setOpen} value={current || (selected && !selected.disabled && !required ? emptyOption : '')} onValueChange={next => { const value = next === emptyOption ? '' : next; setInternal(value); onChange?.(value); }} required={required} disabled={disabled}>
      <Select.Trigger className="aw-select-trigger" aria-label={label}>
        <Select.Value placeholder={placeholder}>{selected?.label || placeholder}</Select.Value>
        <Select.Icon><ChevronDown size={14}/></Select.Icon>
      </Select.Trigger>
      <Select.Portal><Select.Content className="aw-select-popup" position="popper" align="start" sideOffset={6} collisionPadding={10} onEscapeKeyDown={event => { event.preventDefault(); event.stopPropagation(); setOpen(false); }}>
        <Select.ScrollUpButton className="aw-select-scroll"><ChevronUp size={14}/></Select.ScrollUpButton>
        <Select.Viewport className="aw-select-options">{items.map(item => <Select.Item key={item.value} value={item.value || emptyOption} textValue={item.label || placeholder} disabled={item.disabled} className="aw-select-option">
          <Select.ItemText>{item.label || placeholder}</Select.ItemText>
          <Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
        </Select.Item>)}</Select.Viewport>
        <Select.ScrollDownButton className="aw-select-scroll"><ChevronDown size={14}/></Select.ScrollDownButton>
      </Select.Content></Select.Portal>
    </Select.Root>
  </span>;
}

export function AssetSearch({ value, onChange, placeholder, label = placeholder, className = '', shortcut = false }: { value: string; onChange: (value: string) => void; placeholder: string; label?: string; className?: string; shortcut?: boolean }) {
  const input = useRef<HTMLInputElement>(null), id = useId();
  useEffect(() => {
    if (!shortcut) return;
    const focus = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || target?.closest('input,textarea,select,[contenteditable="true"],[role="combobox"],[role="listbox"]') || document.querySelector('[role="dialog"],[role="alertdialog"]')) return;
      event.preventDefault(); input.current?.focus();
    };
    document.addEventListener('keydown', focus);
    return () => document.removeEventListener('keydown', focus);
  }, [shortcut]);
  return <div className={`aw-search ${className}`}>
    <Search size={15} aria-hidden="true"/>
    <input ref={input} id={id} aria-label={label} aria-keyshortcuts={shortcut ? '/' : undefined} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}/>
    {value && <button type="button" className="aw-search-clear" aria-label={`Clear ${label}`} onClick={() => { onChange(''); input.current?.focus(); }}><X size={13}/></button>}
    {shortcut && <kbd aria-hidden="true">/</kbd>}
  </div>;
}

export function FilterChips({ filters, clear }: { filters: { label: string; remove: () => void }[]; clear: () => void }) {
  if (!filters.length) return null;
  return <div className="aw-filter-chips" aria-label="Active filters">
    {filters.map(filter => <button type="button" className="aw-filter-chip" key={filter.label} aria-label={`Remove ${filter.label} filter`} onClick={filter.remove}>{filter.label}<X size={11}/></button>)}
    <button type="button" className="aw-clear-filters" onClick={clear}>Clear all</button>
  </div>;
}
