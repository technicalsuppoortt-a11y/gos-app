import { useWorkspacePreferences } from '../../backend/workspacePreferences';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, ChevronDown } from 'lucide-react';
import { setCurrency } from '../../store/slices/uiSlice';
import { useUILanguage, translateText } from '../../i18n/display';
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '../../utils/currency';
import type { RootState } from '../../store';

export const CurrencySelector: React.FC<{
  value?: string;
  onChange?: (currency: string) => void;
  className?: string;
  compact?: boolean;
}> = ({ value, onChange, className = '' }) => {
  const ar = useUILanguage().startsWith('ar');
  const dispatch = useDispatch();
  const { setPreference } = useWorkspacePreferences();
  const currency = useSelector((state: RootState) => state.ui.currency);
  const activeItem = SUPPORTED_CURRENCIES.find(c => c.code === (value || currency)) || SUPPORTED_CURRENCIES[0];
  const activeCode = activeItem.code;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: CurrencyCode) => {
    if (setPreference) setPreference({ currency: code });
    else dispatch(setCurrency(code));
    onChange?.(code);
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div className={`global-currency-control ${className}`} ref={containerRef} onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <button
        ref={trigger}
        type="button"
        className="global-currency-trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${translateText('Select Currency')} (${activeCode})`}
        title={`${translateText(activeItem.name)} (${activeCode})`}
      >
        <span className="global-currency-symbol">
          {activeItem.symbol.length <= 2 ? (
            activeItem.symbol
          ) : (
            <img className="global-currency-flag" alt="" src={new URL(`../../assets/currency-flags/${activeItem.flag}.svg`, import.meta.url).href}/>
          )}
        </span>
        <span className="global-currency-code" dir="ltr">{activeItem.code}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="global-currency-menu">
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {translateText("Select Currency")}
          </div>
          <div className="global-currency-options" role="listbox" aria-label={translateText('Select Currency')}>
            {SUPPORTED_CURRENCIES.map(item => (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={item.code === activeCode}
                className={`global-currency-item ${item.code === activeCode ? 'active' : ''}`}
                onClick={() => handleSelect(item.code)}
              >
                <div className="flex items-center gap-2" dir="ltr">
                  <span className="global-currency-symbol">
                    <img className="global-currency-flag" alt="" src={new URL(`../../assets/currency-flags/${item.flag}.svg`, import.meta.url).href}/>
                  </span>
                  <span className="font-semibold">{item.code}</span>
                  <span className="text-[10px] opacity-75 font-normal" dir="auto">· {translateText(item.name)}</span>
                </div>
                {item.code === activeCode && <Check size={14} className="text-[var(--ws-accent)] shrink-0" />}
              </button>
            ))}
          </div>
          <a className="global-currency-attribution" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
            {ar ? 'أسعار الصرف من Exchange Rate API' : 'Rates By Exchange Rate API'}
          </a>
        </div>
      )}
    </div>
  );
};
