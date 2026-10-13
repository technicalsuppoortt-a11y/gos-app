import { useUILanguage, localizeNode, translateText } from '../../i18n/display';
import React from 'react';
import { Bold, ImagePlus, Italic, Link2, List, ListOrdered, Underline, X } from 'lucide-react';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import type { Product } from './model';
export function Field({ label, children, hint, icon: Icon }: { label: string; children: React.ReactNode; hint?: string; icon?: React.ElementType }) {
  useUILanguage();
  return <label className="cw-field"><span>{localizeNode(Icon && <Icon size={12} aria-hidden="true"/>)}{localizeNode(label)}</span>{localizeNode(children)}{localizeNode(hint && <small>{localizeNode(hint)}</small>)}</label>;
}
export function Select({ value, options, onChange, disabled = false }: { value: string; options: readonly string[]; onChange: (value: string) => void; disabled?: boolean }) {
  useUILanguage();
  return <span className="cw-select"><CommerceSelect value={value} options={options} onChange={onChange} disabled={disabled}/></span>;
}
export function Card({ title, subtitle, children, action, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  useUILanguage();
  return <section className={`cw-card ${className}`}><header><div><h2>{localizeNode(title)}</h2>{localizeNode(subtitle && <p>{localizeNode(subtitle)}</p>)}</div>{localizeNode(action)}</header>{localizeNode(children)}</section>;
}
export function Status({ status }: { status: Product['status'] }) {
  useUILanguage(); return <span className={`cw-status ${status.toLowerCase()}`}><i/>{localizeNode(status)}</span>; }
export function Toggle({ label, checked, onChange, disabled = false, hint, icon: Icon }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; hint?: string; icon?: React.ElementType }) {
  useUILanguage();
  return <label className="tw-toggle-row"><span>{localizeNode(Icon && <Icon size={12} aria-hidden="true"/>)}{localizeNode(label)}{localizeNode(hint && <small>{localizeNode(hint)}</small>)}</span><input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)}/></label>;
}
function formatted(text: string): React.ReactNode {
  return text.split(/(!\[[^\]]*\]\(https?:\/\/[^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g).map((part, i) => {
    const media = part.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
    if (media) return <img key={i} src={media[2]} alt={translateText(media[1])} style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }}/>;
    if (part.startsWith('**')) return <strong key={i}>{localizeNode(part.slice(2, -2))}</strong>;
    if (part.startsWith('__')) return <u key={i}>{localizeNode(part.slice(2, -2))}</u>;
    if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*')) return <em key={i}>{localizeNode(part.slice(1, -1))}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{localizeNode(link[1])}</a>;
    return part;
  });
}
export function Description({ text }: { text: string }) {
  useUILanguage();
  const lines = text.split('\n'), blocks: React.ReactNode[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index], key = index;
    if (line === '```') {
      const code: string[] = [];
      while (++index < lines.length && lines[index] !== '```') code.push(lines[index]);
      blocks.push(<pre key={key}>{code.join('\n')}</pre>);
    } else if (line.startsWith('- ') || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line), items: React.ReactNode[] = [];
      while (index < lines.length && (ordered ? /^\d+\. /.test(lines[index]) : lines[index].startsWith('- '))) {
        items.push(<li key={index}>{localizeNode(formatted(lines[index].replace(ordered ? /^\d+\. / : /^- /, '')))}</li>); index++;
      }
      index--;
      blocks.push(ordered ? <ol key={key}>{localizeNode(items)}</ol> : <ul key={key}>{localizeNode(items)}</ul>);
    } else if (line.startsWith('> ')) blocks.push(<blockquote key={key}>{localizeNode(formatted(line.slice(2)))}</blockquote>);
    else blocks.push(<p key={key}>{localizeNode(formatted(line) || <br/>)}</p>);
  }
  return <div className="cw-description">{localizeNode(blocks)}</div>;
}
export function RichDescription({ value, onChange, maxLength, allowMedia = false }: { value: string; onChange: (value: string) => void; maxLength?: number; allowMedia?: boolean }) {
  useUILanguage();
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = React.useState(false), [linkOpen, setLinkOpen] = React.useState(false), [url, setUrl] = React.useState('');
  const [mediaLink, setMediaLink] = React.useState(false);
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
  return <div className="tw-rich-editor"><div className="tw-rich-toolbar"><CommerceSelect label="Description block style" value="Paragraph" options={['Paragraph', 'List']} onChange={value => { if (value === 'List') list(false); }} className="tw-block-select"/><button type="button" aria-label={translateText("Bold")} onMouseDown={e => e.preventDefault()} onClick={() => wrap('**')}><Bold size={13}/></button><button type="button" aria-label={translateText("Italic")} onMouseDown={e => e.preventDefault()} onClick={() => wrap('*')}><Italic size={13}/></button><button type="button" aria-label={translateText("Underline")} onMouseDown={e => e.preventDefault()} onClick={() => wrap('__')}><Underline size={13}/></button><i/><button type="button" aria-label={translateText("Bulleted list")} onClick={() => list(false)}><List size={14}/></button><button type="button" aria-label={translateText("Numbered list")} onClick={() => list(true)}><ListOrdered size={14}/></button><button type="button" aria-label={translateText("Add description link")} onMouseDown={e => e.preventDefault()} onClick={() => { selection.current = { start: ref.current?.selectionStart ?? 0, end: ref.current?.selectionEnd ?? 0 }; setMediaLink(false); setLinkOpen(!linkOpen); }}><Link2 size={14}/></button><>{localizeNode(allowMedia && <button type="button" aria-label={translateText("Add description media")} onMouseDown={event => event.preventDefault()} onClick={() => { selection.current = { start: ref.current?.selectionStart ?? 0, end: ref.current?.selectionEnd ?? 0 }; setMediaLink(true); setLinkOpen(true); }}><ImagePlus size={14}/></button>)}</><button type="button" className="tw-editor-preview" onClick={() => setPreview(!preview)}>{localizeNode(preview ? 'Write' : 'Preview')}</button></div>{localizeNode(linkOpen && <div className="tw-link-input"><input aria-label={translateText(mediaLink ? 'Description image URL' : 'Description link URL')} type="url" value={url} placeholder={translateText("https://")} onChange={e => setUrl(e.target.value)}/><button type="button" disabled={!/^https?:\/\//i.test(url)} onClick={() => { const { start, end } = selection.current; onChange(`${value.slice(0, start)}${mediaLink ? '!' : ''}[${value.slice(start, end) || 'Link'}](${url})${value.slice(end)}`); setLinkOpen(false); setUrl(''); }}>{localizeNode(mediaLink ? 'Add media' : 'Add link')}</button></div>)}{localizeNode(preview ? <Description text={value}/> : <textarea ref={ref} aria-label={translateText("Full description")} maxLength={maxLength} value={value} rows={7} onChange={e => onChange(e.target.value)} placeholder={translateText("Describe your offer, the outcome, and what is included.")}/>)}<small className="tw-character-count">{localizeNode(maxLength ? `${value.length}/${maxLength}` : `${value.length} characters`)}</small></div>;
}
export function Dialog({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useUILanguage();
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
  return <div className="cw-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`cw-dialog${wide ? ' tw-dialog-wide' : ''}`}><header><h2 id={titleId}>{localizeNode(title)}</h2><button className="cw-icon-button" aria-label={translateText("Close dialog")} onClick={onClose}><X size={16}/></button></header>{localizeNode(children)}</div></div>;
}
