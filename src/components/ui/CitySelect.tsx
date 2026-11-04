import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Search, Check, ChevronDown, X } from 'lucide-react';
import { WORLD_CITIES, type WorldCity } from '../../utils/worldCities';
import { useUILanguage, translateText, uiDirection } from '../../i18n/display';

export interface CitySelectProps {
  value: string;
  onChange: (city: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  label?: string;
}

export function CitySelect({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select city…',
  className = '',
  label = 'City',
}: CitySelectProps) {
  useUILanguage();
  const dir = uiDirection();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 240,
    placeAbove: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Find if current value matches a known city
  const currentCityObj = useMemo(() => {
    if (!value) return null;
    const lower = value.trim().toLowerCase();
    return WORLD_CITIES.find(c => c.city.toLowerCase() === lower);
  }, [value]);

  // Filtered list based on search query
  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORLD_CITIES.slice(0, 100); // Top 100 default list

    const matches = WORLD_CITIES.filter(c =>
      c.city.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      (c.region && c.region.toLowerCase().includes(q))
    );

    return matches.slice(0, 80);
  }, [query]);

  // Check if query should offer a custom city addition
  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return WORLD_CITIES.some(c => c.city.toLowerCase() === q);
  }, [query]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 260);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 260 && rect.top > 260;

    setCoords({
      top: placeAbove ? Math.max(8, rect.top - 280) : rect.bottom + 4,
      left: dir === 'rtl' ? Math.max(8, rect.right - width) : Math.max(8, rect.left),
      width,
      placeAbove,
    });
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const frame = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      const onScrollOrResize = () => updatePosition();
      window.addEventListener('resize', onScrollOrResize);
      window.addEventListener('scroll', onScrollOrResize, true);

      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', onScrollOrResize);
        window.removeEventListener('scroll', onScrollOrResize, true);
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleSelect = (city: string) => {
    onChange(city);
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filteredCities.length + (hasExactMatch ? -1 : 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!hasExactMatch && query.trim() && activeIndex === 0) {
        handleSelect(query.trim());
      } else {
        const offset = !hasExactMatch && query.trim() ? 1 : 0;
        const target = filteredCities[activeIndex - offset];
        if (target) handleSelect(target.city);
        else if (query.trim()) handleSelect(query.trim());
      }
    }
  };

  return (
    <div className={`relative inline-block ${className}`} dir={dir}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 text-xs font-medium hover:border-purple-300 dark:hover:border-purple-600 transition-colors shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed max-w-[210px]"
        title={value ? `${value}${currentCityObj ? `, ${currentCityObj.country}` : ''}` : translateText(label)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MapPin size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
        <span className="truncate flex-1 text-start">
          {value ? (
            <span>
              <b className="font-semibold">{value}</b>
              {currentCityObj && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 ms-1 font-normal">
                  · {currentCityObj.country}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-normal">
              {translateText(placeholder)}
            </span>
          )}
        </span>

        {value && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="p-0.5 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
            title={translateText("Clear city")}
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          onKeyDown={handleKeyDown}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 9999,
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden flex flex-col text-xs text-slate-800 dark:text-slate-100 max-h-[300px]"
        >
          {/* Search bar inside popover */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/70 dark:bg-slate-900/50">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder={translateText("Search world city or country…")}
              className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* City list scroll container */}
          <div ref={listRef} id={listId} role="listbox" className="overflow-y-auto p-1 max-h-[220px]">
            {/* Custom city entry option if query has no exact match */}
            {!hasExactMatch && query.trim() && (
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === 0}
                onClick={() => handleSelect(query.trim())}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-start transition-colors font-medium text-purple-600 dark:text-purple-400 ${
                  activeIndex === 0 ? 'bg-purple-50 dark:bg-purple-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin size={12} className="shrink-0" />
                  <span>{translateText("Use custom:")} <b>"{query.trim()}"</b></span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{translateText("Custom")}</span>
              </button>
            )}

            {filteredCities.map((item, idx) => {
              const adjustedIdx = !hasExactMatch && query.trim() ? idx + 1 : idx;
              const isSelected = value.trim().toLowerCase() === item.city.toLowerCase();
              const isHighlighted = activeIndex === adjustedIdx;

              return (
                <button
                  key={`${item.city}-${item.country}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(adjustedIdx)}
                  onClick={() => handleSelect(item.city)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-start transition-colors ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold'
                      : isHighlighted
                      ? 'bg-slate-100/80 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{item.city}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                      {item.country} {item.region ? `· ${item.region}` : ''}
                    </span>
                  </div>
                  {isSelected && <Check size={13} className="text-purple-600 dark:text-purple-400 shrink-0 ms-2" />}
                </button>
              );
            })}

            {filteredCities.length === 0 && (
              <div className="py-4 text-center text-slate-400 dark:text-slate-500">
                <p>{translateText("No matching cities found")}</p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelect(query.trim())}
                    className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                  >
                    {translateText("Select")} "{query.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
