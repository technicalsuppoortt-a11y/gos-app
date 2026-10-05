import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import './commerce-select.css';

type Option = string | { value: string; label: string; disabled?: boolean };
export interface CommerceSelectProps {
  value: string; options: readonly Option[]; onChange: (value: string) => void;
  disabled?: boolean; label?: string; placeholder?: string; className?: string;
  triggerClassName?: string; icon?: React.ElementType;
}
const emptyValue = '__gos_empty_option__';
export function CommerceSelect({ value, options, onChange, disabled, label, placeholder = 'Select an option', className = '', triggerClassName = '', icon: Icon }: CommerceSelectProps) {
  const items = options.map(option => typeof option === 'string' ? { value: option, label: option } : option);
  const selected = items.find(option => option.value === value);
  return <span className={`commerce-select ${className}`}>
    <RadixSelect.Root value={value || (items.some(option => option.value === '') ? emptyValue : '')} onValueChange={next => onChange(next === emptyValue ? '' : next)} disabled={disabled}>
      <RadixSelect.Trigger aria-label={label} className={`commerce-select-trigger ${triggerClassName}`} title={selected?.label}>
        {Icon && <Icon size={15} className="commerce-select-leading-icon"/>}
        <RadixSelect.Value placeholder={placeholder}>{selected?.label}</RadixSelect.Value>
        <RadixSelect.Icon className="commerce-select-chevron"><ChevronDown size={15}/></RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal><RadixSelect.Content className="commerce-select-content" position="popper" sideOffset={6} collisionPadding={12} align="start">
        <RadixSelect.ScrollUpButton className="commerce-select-scroll"><ChevronUp size={14}/></RadixSelect.ScrollUpButton>
        <RadixSelect.Viewport className="commerce-select-viewport">
          {items.map(option => <RadixSelect.Item key={option.value} value={option.value || emptyValue} disabled={option.disabled} className="commerce-select-item" textValue={option.label}>
            <RadixSelect.ItemText><span>{option.label}</span></RadixSelect.ItemText>
            <RadixSelect.ItemIndicator className="commerce-select-check"><Check size={15}/></RadixSelect.ItemIndicator>
          </RadixSelect.Item>)}
        </RadixSelect.Viewport>
        <RadixSelect.ScrollDownButton className="commerce-select-scroll"><ChevronDown size={14}/></RadixSelect.ScrollDownButton>
      </RadixSelect.Content></RadixSelect.Portal>
    </RadixSelect.Root>
  </span>;
}
