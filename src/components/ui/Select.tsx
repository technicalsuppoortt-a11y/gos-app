import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type SelectOption = string | { value: string; label: string; disabled?: boolean };

export interface SelectProps {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  icon?: React.ElementType;
}

const emptyValue = '__gos_empty_option__';

export function Select({
  value,
  options,
  onChange,
  disabled,
  label,
  placeholder = 'Select an option',
  className = '',
  triggerClassName = '',
  icon: Icon
}: SelectProps) {
  const items = options.map(option => typeof option === 'string' ? { value: option, label: option } : option);
  const selected = items.find(option => option.value === value);
  
  return (
    <div className={twMerge('block w-full', className)}>
      <RadixSelect.Root
        value={value || (items.some(option => option.value === '') ? emptyValue : '')}
        onValueChange={next => onChange(next === emptyValue ? '' : next)}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          aria-label={label}
          className={twMerge(
            'flex items-center gap-2 w-full min-w-0 min-h-[40px]',
            'rounded-xl border border-slate-200 bg-white px-3 py-2',
            'text-sm font-medium text-slate-900 text-left',
            'transition-all duration-200 ease-in-out',
            'hover:border-purple-400',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-75',
            'data-[state=open]:border-purple-500 data-[state=open]:ring-2 data-[state=open]:ring-purple-500/20',
            triggerClassName
          )}
          title={selected?.label}
        >
          {Icon && <Icon size={16} className="flex-none text-slate-500" />}
          <span className="block flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <RadixSelect.Value placeholder={placeholder}>{selected?.label}</RadixSelect.Value>
          </span>
          <RadixSelect.Icon className="flex-none text-slate-500 transition-transform duration-200 ease-in-out data-[state=open]:rotate-180">
            <ChevronDown size={16} />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            className={twMerge(
              'z-[9999] overflow-hidden',
              'shadow-xl border border-slate-100 rounded-xl bg-white/95 backdrop-blur-md',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-2',
              'min-w-[max(170px,var(--radix-select-trigger-width))] max-w-[calc(100vw-24px)]'
            )}
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            align="start"
          >
            <RadixSelect.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-slate-500 cursor-default">
              <ChevronUp size={14} />
            </RadixSelect.ScrollUpButton>
            <RadixSelect.Viewport className="p-1.5 max-h-[min(290px,calc(var(--radix-select-content-available-height)-48px))]">
              {items.map(option => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value || emptyValue}
                  disabled={option.disabled}
                  className={twMerge(
                    'relative flex items-center min-h-[36px] w-full',
                    'rounded-lg px-3 py-2 text-sm text-slate-700 cursor-pointer outline-none select-none',
                    'transition-colors duration-150',
                    'data-[highlighted]:bg-purple-50 data-[highlighted]:text-purple-700',
                    'data-[state=checked]:bg-purple-50/50 data-[state=checked]:text-purple-700 data-[state=checked]:font-semibold',
                    'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
                    'pr-9'
                  )}
                  textValue={option.label}
                >
                  <RadixSelect.ItemText>
                    <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap">
                      {option.label}
                    </span>
                  </RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-2.5 flex items-center text-purple-600">
                    <Check size={16} />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
            <RadixSelect.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-slate-500 cursor-default">
              <ChevronDown size={14} />
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
