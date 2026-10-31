import { useUILanguage, translateText, localizeNode, uiDirection } from '../../i18n/display';
import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useSelectPortal } from './select-layer';

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
  useUILanguage();
  const portal = useSelectPortal();
  const items = options.map(option => typeof option === 'string' ? { value: option, label: option } : option);
  const selected = items.find(option => option.value === value);
  
  return (
    <div className={twMerge('block w-full', className)}>
      <RadixSelect.Root
        dir={uiDirection()}
        value={value || (items.some(option => option.value === '') ? emptyValue : '')}
        onValueChange={next => onChange(next === emptyValue ? '' : next)}
        disabled={disabled}
        onOpenChange={portal.onOpenChange}
      >
        <RadixSelect.Trigger
          ref={portal.trigger}
          aria-label={translateText(label || placeholder)}
          className={twMerge(
            'flex items-center gap-2 w-full min-w-0 min-h-[40px]',
            'rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-[#192033]',
            'text-sm font-medium text-slate-900 dark:text-slate-100 text-start',
            'transition-all duration-200 ease-in-out',
            'hover:border-purple-400',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-75 dark:disabled:bg-slate-800 dark:disabled:text-slate-400',
            'data-[state=open]:border-purple-500 data-[state=open]:ring-2 data-[state=open]:ring-purple-500/20',
            triggerClassName
          )}
          title={translateText(selected?.label)}
        >
          {localizeNode(Icon && <Icon size={16} className="flex-none text-slate-500 dark:text-slate-400" />)}
          <span className="block flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <RadixSelect.Value placeholder={translateText(placeholder)}>{localizeNode(selected?.label)}</RadixSelect.Value>
          </span>
          <RadixSelect.Icon className="flex-none text-slate-500 transition-transform duration-200 ease-in-out data-[state=open]:rotate-180">
            <ChevronDown size={16} />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal container={portal.container}>
          <RadixSelect.Content
            className={twMerge(
              'ui-select-panel z-[9999] overflow-hidden',
              'shadow-xl border border-slate-100 rounded-xl bg-white/95 backdrop-blur-md dark:bg-[#192033]/95 dark:border-slate-600',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-2',
              'min-w-[max(170px,var(--radix-select-trigger-width))] max-w-[calc(100vw-24px)]'
            )}
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            align="start"
          >
            <RadixSelect.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-slate-500 dark:bg-[#192033] dark:text-slate-300 cursor-default">
              <ChevronUp size={14} />
            </RadixSelect.ScrollUpButton>
            <RadixSelect.Viewport className="p-1.5 max-h-[min(290px,calc(var(--radix-select-content-available-height)-48px))]">
              {localizeNode(items.map(option => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value || emptyValue}
                  disabled={option.disabled}
                  className={twMerge(
                    'relative flex items-center min-h-[36px] w-full',
                    'rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer outline-none select-none',
                    'transition-colors duration-150',
                    'data-[highlighted]:bg-purple-50 data-[highlighted]:text-purple-700 dark:data-[highlighted]:bg-purple-500/20 dark:data-[highlighted]:text-purple-200',
                    'data-[state=checked]:bg-purple-50/50 data-[state=checked]:text-purple-700 data-[state=checked]:font-semibold dark:data-[state=checked]:bg-purple-500/15 dark:data-[state=checked]:text-purple-200',
                    'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
                    'pe-9'
                  )}
                  textValue={translateText(option.label)}
                >
                  <RadixSelect.ItemText>
                    <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap">
                      {localizeNode(option.label)}
                    </span>
                  </RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute end-2.5 flex items-center text-purple-600 dark:text-purple-300">
                    <Check size={16} />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              )))}
            </RadixSelect.Viewport>
            <RadixSelect.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-slate-500 dark:bg-[#192033] dark:text-slate-300 cursor-default">
              <ChevronDown size={14} />
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
