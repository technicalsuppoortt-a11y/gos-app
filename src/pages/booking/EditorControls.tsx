import { useUILanguage, localizeNode, translateText } from '../../i18n/display';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { BookingSelect } from './BookingSelect';
import { bookingColor } from './model';

export function Toggle({ label, checked, change, disabled = false }: { label: string; checked: boolean; change: (value: boolean) => void; disabled?: boolean }) {
  useUILanguage();
  return <div className="bk-toggle-row"><span>{localizeNode(label)}</span><button type="button" role="switch" aria-label={translateText(label)} aria-checked={checked} disabled={disabled} className="bk-toggle" onClick={() => change(!checked)}><span/></button></div>;
}

export function TimeInput({ label, value, change }: { label: string; value: string; change: (value: string) => void }) {
  useUILanguage();
  const values = [...new Set([value, ...Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String(i % 4 * 15).padStart(2, '0')}`)])].sort();
  return <BookingSelect className="bk-time-select" aria-label={translateText(label)} value={value} onChange={e => change(e.target.value)}>{localizeNode(values.map(t => { const [hour, minute] = t.split(':').map(Number); return <option key={t} value={t}>{localizeNode(hour % 12 || 12)}:{localizeNode(String(minute).padStart(2, '0'))} {localizeNode(hour < 12 ? 'AM' : 'PM')}</option>; }))}</BookingSelect>;
}

export function PresetNumber({ label, value, values, change, unit = 'minutes', min = 0, max = 10000 }: { label: string; value: number; values: number[]; change: (value: number) => void; unit?: 'minutes' | 'days'; min?: number; max?: number }) {
  useUILanguage();
  const [custom, setCustom] = useState(false);
  const format = (n: number) => unit === 'days' ? (n % 30 === 0 ? `${n / 30} month${n === 30 ? '' : 's'}` : n % 7 === 0 ? `${n / 7} week${n === 7 ? '' : 's'}` : `${n} day${n === 1 ? '' : 's'}`) : n && n % 60 === 0 ? `${n / 60} hour${n === 60 ? '' : 's'}` : `${n} min`;
  return <label>{localizeNode(label)}<BookingSelect aria-label={translateText(label)} value={custom ? 'custom' : value} onChange={e => { if (e.target.value === 'custom') setCustom(true); else { setCustom(false); change(Number(e.target.value)); } }}>{localizeNode([...new Set([...values, value])].sort((a, b) => a - b).map(n => <option key={n} value={n}>{localizeNode(format(n))}</option>))}<option value="custom">{translateText("Custom")}</option></BookingSelect>{localizeNode(custom && <input aria-label={translateText(`Custom ${label.toLowerCase()}`)} type="number" min={min} max={max} value={value} onChange={e => change(Math.max(min, Math.min(max, Number(e.target.value))))}/>)}</label>;
}

const palette = [['Blue','#3b82f6'],['Purple','#8b5cf6'],['Pink','#ec4899'],['Red','#ef4444'],['Orange','#f97316'],['Amber','#f59e0b'],['Green','#22c55e'],['Emerald','#10b981'],['Teal','#14b8a6'],['Cyan','#06b6d4'],['Sky','#0ea5e9'],['Indigo','#6366f1'],['Fuchsia','#d946ef'],['Rose','#f43f5e'],['Slate','#64748b'],['Zinc','#71717a'],['Lime','#84cc16'],['Yellow','#eab308'],['Coral','#ff7f50'],['Navy','#000080'],['Maroon','#800000'],['Crimson','#dc143c'],['Lavender','#e6e6fa'],['Plum','#dda0dd'],['Forest Green','#228b22']];
export function ColorPicker({ value, change }: { value: string; change: (value: string) => void }) {
  useUILanguage();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open) return;
    const place = () => { const r = trigger.current?.getBoundingClientRect(); if (r) setPosition({ left: Math.max(8, Math.min(r.left, innerWidth - 300)), top: r.bottom + 270 > innerHeight ? Math.max(8, r.top - 270) : r.bottom + 6 }); };
    const close = (e: PointerEvent) => { if (!trigger.current?.contains(e.target as Node) && !panel.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    place(); document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape); window.addEventListener('resize', place); window.addEventListener('scroll', place, true); panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  return <div className="bk-color-picker-control"><span className="bk-control-label">{translateText("Page color")}</span><button ref={trigger} type="button" className="bk-button bk-color-trigger" aria-label={translateText("Choose page color")} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}><i style={{ background: bookingColor(value) }}/>{localizeNode(bookingColor(value))}</button>{open && createPortal(<div ref={panel} role="dialog" aria-label={translateText("Page color")} className="bk-color-popover bk-form" style={position}><div className="bk-palette">{localizeNode(palette.map(([name, color]) => <button type="button" key={name} style={{ background: color }} aria-label={translateText(name)} aria-pressed={bookingColor(value) === color} onClick={() => { change(color); setOpen(false); trigger.current?.focus(); }}>{localizeNode(bookingColor(value) === color && <Check size={16}/>)}</button>))}</div><label>{translateText("Custom color")}<input aria-label={translateText("Custom color")} type="color" value={bookingColor(value)} onChange={e => change(e.target.value)}/></label><button type="button" className="bk-button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>{translateText("Done")}</button></div>, document.body)}</div>;
}
