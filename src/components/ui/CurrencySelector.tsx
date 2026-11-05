import { useWorkspacePreferences } from '../../backend/workspacePreferences';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, ChevronDown } from 'lucide-react';
import type { RootState } from '../../store';
import { setCurrency } from '../../store/slices/uiSlice';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';

export interface CurrencyItem {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyItem[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
];

export const getCurrencySymbol = (code: string): string => {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || code;
};

export const CurrencySelector: React.FC<{
  value?: string;
  onChange?: (currency: string) => void;
  className?: string;
  compact?: boolean;
}> = ({ value, onChange, className = '', compact = true }) => {
  useUILanguage();
  const dispatch = useDispatch();
  const { setPreference } = useWorkspacePreferences();
  const reduxCurrency = useSelector((state: RootState) => state.ui.currency || 'USD');
  const activeCode = value || reduxCurrency;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeItem = SUPPORTED_CURRENCIES.find(c => c.code === activeCode) || SUPPORTED_CURRENCIES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    if (setPreference) setPreference({ currency: code });
    else dispatch(setCurrency(code));
    onChange?.(code);
    setOpen(false);
  };
  return (
    <div className={`global-currency-control ${className}`} ref={containerRef}>
      <button
        type="button"
        className="global-currency-trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={translateText(`Select currency, current ${activeItem.code}`)}
        title={translateText(`Currency: ${activeItem.name} (${activeItem.code})`)}
      >
        <span className="global-currency-symbol">{activeItem.symbol}</span>
        <span className="global-currency-code">{activeItem.code}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="global-currency-menu" role="listbox">
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {translateText("Select Currency")}
          </div>
          {SUPPORTED_CURRENCIES.map(item => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={item.code === activeCode}
              className={`global-currency-item ${item.code === activeCode ? 'active' : ''}`}
              onClick={() => handleSelect(item.code)}
            >
              <div className="flex items-center gap-2">
                <span className="global-currency-symbol">{item.symbol}</span>
                <span className="font-semibold">{item.code}</span>
                <span className="text-[10px] opacity-75 font-normal">· {translateText(item.name)}</span>
              </div>
              {item.code === activeCode && <Check size={14} className="text-[var(--ws-accent)] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
