import { useRef, type KeyboardEvent } from 'react';
import { BookOpen, FileDown, Handshake, LayoutGrid, type LucideIcon } from 'lucide-react';
import { useUILanguage } from '../../i18n/display';
import './product-type-filter.css';

export type ProductTypeValue = 'All' | 'Course' | 'Digital Product' | 'Service';

const OPTIONS: { value: ProductTypeValue; en: string; ar: string; Icon: LucideIcon }[] = [
  { value: 'All', en: 'All types', ar: 'كل الأنواع', Icon: LayoutGrid },
  { value: 'Course', en: 'Courses', ar: 'الدورات', Icon: BookOpen },
  { value: 'Digital Product', en: 'Digital products', ar: 'المنتجات الرقمية', Icon: FileDown },
  { value: 'Service', en: 'Services', ar: 'الخدمات', Icon: Handshake },
];

/** Normalizes stored product type labels ("Courses", "digital", "Consulting service"…) to a filter value. */
export function productTypeOf(value: unknown): Exclude<ProductTypeValue, 'All'> | '' {
  const text = String(value ?? '').toLowerCase();
  if (!text) return '';
  if (text.includes('course')) return 'Course';
  if (text.includes('service')) return 'Service';
  if (text.includes('digital')) return 'Digital Product';
  return '';
}

/**
 * Segmented product type filter (All · Courses · Digital products · Services) with live counts.
 * Keyboard: arrow keys / Home / End move between options (WAI-ARIA radio group pattern).
 */
export function ProductTypeFilter({ value, onChange, counts, label, className = '' }: {
  value: ProductTypeValue; onChange: (value: ProductTypeValue) => void;
  counts?: Partial<Record<ProductTypeValue, number>>; label?: string; className?: string;
}) {
  const ar = useUILanguage().startsWith('ar');
  const group = useRef<HTMLDivElement>(null);
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ar ? { next: 'ArrowLeft', previous: 'ArrowRight' } : { next: 'ArrowRight', previous: 'ArrowLeft' };
    const index = OPTIONS.findIndex(option => option.value === value);
    const target = event.key === keys.next || event.key === 'ArrowDown' ? (index + 1) % OPTIONS.length
      : event.key === keys.previous || event.key === 'ArrowUp' ? (index - 1 + OPTIONS.length) % OPTIONS.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? OPTIONS.length - 1 : -1;
    if (target < 0) return;
    event.preventDefault();
    onChange(OPTIONS[target].value);
    group.current?.querySelectorAll<HTMLButtonElement>('button')[target]?.focus();
  };
  return <div ref={group} className={`ptf ${className}`} role="radiogroup" aria-label={label || (ar ? 'نوع المنتج' : 'Product type')} onKeyDown={move}>
    {OPTIONS.map(({ value: option, en, ar: arabic, Icon }) => {
      const selected = option === value;
      return <button key={option} type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1}
        className="ptf-option" data-type={option} onClick={() => onChange(option)}>
        <Icon size={14} aria-hidden="true"/>
        <span>{ar ? arabic : en}</span>
        {counts && <span className="ptf-count">{(counts[option] ?? 0).toLocaleString('en-US')}</span>}
      </button>;
    })}
  </div>;
}

/** Display label of a filter value in the active language. */
export function productTypeLabel(value: ProductTypeValue, arabic: boolean) {
  const option = OPTIONS.find(item => item.value === value);
  return option ? arabic ? option.ar : option.en : value;
}

/** Counts per filter value for a list of items. */
export function productTypeCounts<T>(items: T[], typeOf: (item: T) => unknown): Record<ProductTypeValue, number> {
  const counts: Record<ProductTypeValue, number> = { All: items.length, Course: 0, 'Digital Product': 0, Service: 0 };
  for (const item of items) { const type = productTypeOf(typeOf(item)); if (type) counts[type]++; }
  return counts;
}
