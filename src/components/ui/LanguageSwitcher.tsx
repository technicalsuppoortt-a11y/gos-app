import { useWorkspacePreferences } from '../../backend/workspacePreferences';
import { useUILanguage, translateText } from '../../i18n/display';
import { LOCALE_OPTIONS, normalizeLocale } from '../../i18n/initialLocale';
import { storageSet } from '../../utils/browserStorage';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setLanguage, type Language } from '../../store/slices/uiSlice';
import { Check, ChevronDown, Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{
  onLanguageChange?: (language: Language) => void;
  className?: string;
  triggerId?: string;
}> = ({ onLanguageChange, className = '', triggerId }) => {
  const uiLang = useUILanguage();
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { setPreference } = useWorkspacePreferences();
  const reduxLang = useSelector((state: RootState) => state.ui.language);
  const activeCode: Language = normalizeLocale(reduxLang) ?? normalizeLocale(uiLang) ?? 'en';
  const activeItem = LOCALE_OPTIONS.find(item => item.code === activeCode) ?? LOCALE_OPTIONS[1];

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLanguage = (newLang: Language) => {
    storageSet('user_selected_lang', newLang);
    storageSet('i18nextLng', newLang);
    void i18n.changeLanguage(newLang);
    dispatch(setLanguage(newLang));
    if (setPreference) setPreference({ language: newLang });
    onLanguageChange?.(newLang);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const focusOption = (index: number) => {
    const wrapped = (index + LOCALE_OPTIONS.length) % LOCALE_OPTIONS.length;
    optionRefs.current[wrapped]?.focus();
  };

  const switcherLabel = translateText(t('switch_lang'));

  return (
    <div
      className={`global-language-control ${className}`.trim()}
      ref={containerRef}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className="global-language-trigger"
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const currentIdx = LOCALE_OPTIONS.findIndex(o => o.code === activeCode);
            setOpen(true);
            requestAnimationFrame(() => focusOption(currentIdx >= 0 ? currentIdx : 0));
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${switcherLabel} (${activeItem.nativeLabel})`}
        title={`${activeItem.nativeLabel} (${activeItem.shortLabel})`}
      >
        <Globe size={14} aria-hidden="true" className="global-language-globe" />
        <span className="global-language-code" dir="ltr">{activeItem.shortLabel}</span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={`global-language-chevron transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="global-language-menu">
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {switcherLabel}
          </div>
          <div className="global-language-options" role="listbox" aria-label={switcherLabel}>
            {LOCALE_OPTIONS.map((item, idx) => {
              const isSelected = item.code === activeCode;
              return (
                <button
                  key={item.code}
                  ref={el => { optionRefs.current[idx] = el; }}
                  type="button"
                  role="option"
                  lang={item.code}
                  data-lang={item.code}
                  aria-selected={isSelected}
                  className={`global-language-item ${isSelected ? 'is-active active' : ''}`}
                  onClick={() => selectLanguage(item.code)}
                  onKeyDown={event => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      focusOption(idx + 1);
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      focusOption(idx - 1);
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      focusOption(0);
                    } else if (event.key === 'End') {
                      event.preventDefault();
                      focusOption(LOCALE_OPTIONS.length - 1);
                    }
                  }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="global-language-badge" dir="ltr">{item.shortLabel}</span>
                    <span className="font-semibold truncate" dir={item.dir}>{item.nativeLabel}</span>
                  </span>
                  {isSelected && <Check size={14} className="text-[var(--ws-accent,#7C3AED)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
