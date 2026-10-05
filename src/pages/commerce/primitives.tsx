import React from 'react';
import { Bold, Italic, Link2, List, ListOrdered, Underline, X } from 'lucide-react';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import type { Product } from './model';
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="cw-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function Select({ value, options, onChange, disabled = false }: { value: string; options: readonly string[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <span className="cw-select"><CommerceSelect value={value} options={options} onChange={onChange} disabled={disabled}/></span>;
}
export function Card({ title, subtitle, children, action, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return <section className={`cw-card ${className}`}><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</section>;
}
export function Status({ status }: { status: Product['status'] }) { return <span className={`cw-status ${status.toLowerCase()}`}><i/>{status}</span>; }
export function Toggle({ label, checked, onChange, disabled = false, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; hint?: string }) {
  return <label className="tw-toggle-row"><span>{label}{hint && <small>{hint}</small>}</span><input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)}/></label>;
}
function formatted(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|\[[^\]]+\]\(https?:\/\/[^)]+\))/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('__')) return <u key={i}>{part.slice(2, -2)}</u>;
    if (part.startsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return part;
  });
}
export function Description({ text }: { text: string }) {
  return <div className="cw-description">{text.split('\n').map((line, index) => line.startsWith('- ') ? <div className="tw-bullet" key={index}>• {formatted(line.slice(2))}</div> : <p key={index}>{formatted(line)}</p>)}</div>;
}
export function RichDescription({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = React.useState(false), [linkOpen, setLinkOpen] = React.useState(false), [url, setUrl] = React.useState('');
  const selection = React.useRef({ start: 0, end: 0 });
  function wrap(left: string, right = left) {
    const input = ref.current; if (!input) return;
    const start = input.selectionStart, end = input.selectionEnd;
    const text = value.slice(start, end) || 'Text';
    onChange(value.slice(0, start) + left + text + right + value.slice(end));
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + left.length, start + left.length + text.length); });
  }
  function list(ordered: boolean) {
    const input = ref.current; if (!input) return;
    const start = value.lastIndexOf('\n', input.selectionStart - 1) + 1;
    onChange(`${value.slice(0, start)}${ordered ? '1. ' : '- '}${value.slice(start)}`); input.focus();
  }
  return <div className="tw-rich-editor"><div className="tw-rich-toolbar"><CommerceSelect label="Description block style" value="Paragraph" options={['Paragraph', 'List']} onChange={value => { if (value === 'List') list(false); }} className="tw-block-select"/><button type="button" aria-label="Bold" onMouseDown={e => e.preventDefault()} onClick={() => wrap('**')}><Bold size={13}/></button><button type="button" aria-label="Italic" onMouseDown={e => e.preventDefault()} onClick={() => wrap('*')}><Italic size={13}/></button><button type="button" aria-label="Underline" onMouseDown={e => e.preventDefault()} onClick={() => wrap('__')}><Underline size={13}/></button><i/><button type="button" aria-label="Bulleted list" onClick={() => list(false)}><List size={14}/></button><button type="button" aria-label="Numbered list" onClick={() => list(true)}><ListOrdered size={14}/></button><button type="button" aria-label="Add description link" onMouseDown={e => e.preventDefault()} onClick={() => { selection.current = { start: ref.current?.selectionStart ?? 0, end: ref.current?.selectionEnd ?? 0 }; setLinkOpen(!linkOpen); }}><Link2 size={14}/></button><button type="button" className="tw-editor-preview" onClick={() => setPreview(!preview)}>{preview ? 'Write' : 'Preview'}</button></div>{linkOpen && <div className="tw-link-input"><input aria-label="Description link URL" type="url" value={url} placeholder="https://" onChange={e => setUrl(e.target.value)}/><button type="button" disabled={!/^https?:\/\//i.test(url)} onClick={() => { const { start, end } = selection.current; onChange(`${value.slice(0, start)}[${value.slice(start, end) || 'Link'}](${url})${value.slice(end)}`); setLinkOpen(false); setUrl(''); }}>Add link</button></div>}{preview ? <Description text={value}/> : <textarea ref={ref} aria-label="Full description" value={value} rows={7} onChange={e => onChange(e.target.value)} placeholder="Describe your offer, the outcome, and what is included."/>}<small className="tw-character-count">{value.length} characters</small></div>;
}
export function Dialog({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null), closeRef = React.useRef(onClose);
  React.useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const titleId = React.useId();
  React.useEffect(() => {
    const prior = document.activeElement as HTMLElement | null; ref.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const items = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)');
        const first = items?.[0], last = items?.[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handler); return () => { document.removeEventListener('keydown', handler); prior?.focus(); };
  }, []);
  return <div className="cw-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`cw-dialog${wide ? ' tw-dialog-wide' : ''}`}><header><h2 id={titleId}>{title}</h2><button className="cw-icon-button" aria-label="Close dialog" onClick={onClose}><X size={16}/></button></header>{children}</div></div>;
}
