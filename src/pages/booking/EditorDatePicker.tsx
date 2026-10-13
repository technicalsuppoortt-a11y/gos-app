import { useUILanguage, localizeNode, translateText } from '../../i18n/display';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { dateKey, parseDate } from './model';

export function EditorDatePicker({ label, value, change, range = false }: { label: string; value: string; change: (value: string) => void; range?: boolean }) {
  useUILanguage();
  const [open, setOpen] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [today] = useState(() => dateKey(new Date()));
  const [mode, setMode] = useState<'single' | 'range'>(value.includes('_to_') ? 'range' : 'single');
  const [anchor, setAnchor] = useState('');
  const [month, setMonth] = useState(() => { const d = value ? parseDate(value.split('_to_')[0]) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const trigger = useRef<HTMLButtonElement>(null), popover = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open) return;
    const place = () => { const r = trigger.current?.getBoundingClientRect(); if (r) setPosition({ top: r.bottom + 350 > innerHeight ? Math.max(8, r.top - 350) : r.bottom + 6, left: Math.max(8, Math.min(r.left, innerWidth - 288)) }); };
    const outside = (e: PointerEvent) => { if (!trigger.current?.contains(e.target as Node) && !popover.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    place(); document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    popover.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  const [start, end = start] = value.split('_to_');
  const format = (date: string) => date ? parseDate(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const offset = new Date(year, monthIndex, 1).getDay(), count = new Date(year, monthIndex + 1, 0).getDate();
  const choose = (day: string) => {
    if (mode === 'single') { change(day); setOpen(false); trigger.current?.focus(); }
    else if (!anchor) { setAnchor(day); }
    else { change([anchor, day].sort().join('_to_')); setAnchor(''); setOpen(false); trigger.current?.focus(); }
  };
  return <div className="bk-date-control"><span className="bk-control-label">{localizeNode(label)}</span><div className="bk-date-trigger"><button ref={trigger} type="button" aria-label={translateText(label)} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setAnchor(''); setContainer(trigger.current?.closest('dialog') || document.body); setOpen(!open); }}><CalendarDays size={15}/><span>{localizeNode(value ? format(start) + (start !== end ? ' – ' + format(end) : '') : 'Select date')}</span></button>{localizeNode(value && <button type="button" aria-label={translateText(`Clear ${label.toLowerCase()}`)} onClick={() => change('')}><X size={13}/></button>)}</div>
    {open && createPortal(<div ref={popover} role="dialog" aria-label={translateText(`${label} calendar`)} className="bk-date-popover" style={position}>
      {localizeNode(range && <div className="bk-date-tabs" role="tablist" aria-label={translateText("Date selection mode")}>{localizeNode((['single', 'range'] as const).map(m => <button type="button" key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setAnchor(''); }}>{localizeNode(m === 'single' ? 'Single Date' : 'Date Range')}</button>))}</div>)}
      <div className="bk-date-month"><button type="button" aria-label={translateText("Previous month")} onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={15}/></button><select aria-label={translateText("Month")} value={monthIndex} onChange={e => setMonth(new Date(year, Number(e.target.value), 1))}>{localizeNode(Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{localizeNode(new Date(2026, i, 1).toLocaleDateString('en', { month: 'long' }))}</option>))}</select><select aria-label={translateText("Year")} value={year} onChange={e => setMonth(new Date(Number(e.target.value), monthIndex, 1))}>{localizeNode(Array.from({ length: 21 }, (_, i) => year - 10 + i).map(y => <option key={y} value={y}>{localizeNode(y)}</option>))}</select><button type="button" aria-label={translateText("Next month")} onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={15}/></button></div>
      <div className="bk-date-days">{localizeNode(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => <small key={day}>{localizeNode(day)}</small>))}{localizeNode(Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => { const day = i - offset + 1, key = dateKey(new Date(year, monthIndex, day)), selected = anchor ? key === anchor : key === start || key === end; return day < 1 || day > count ? <span key={i}/> : <button type="button" key={i} aria-label={translateText(key)} aria-pressed={selected} className={`${selected ? 'selected' : ''} ${!anchor && start && key > start && key < end ? 'in-range' : ''} ${key === today ? 'today' : ''}`} onClick={() => choose(key)}>{localizeNode(day)}</button>; }))}</div>
      {localizeNode(anchor && <small role="status">{translateText("Choose the end date.")}</small>)}<footer><button type="button" onClick={() => { change(''); setAnchor(''); }}>{translateText("Reset")}</button><button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>{translateText("Done")}</button></footer>
    </div>, container || document.body)}
  </div>;
}
