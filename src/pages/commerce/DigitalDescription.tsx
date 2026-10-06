import React from 'react';
import { Bold, Code, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Underline } from 'lucide-react';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import { Description, Dialog } from './primitives';

const formats = [
  { label: 'Bold', icon: Bold, name: 'bold' },
  { label: 'Italic', icon: Italic, name: 'italic' },
  { label: 'Underline', icon: Underline, name: 'underline' },
  { label: 'Bulleted list', icon: List, name: 'insertUnorderedList' },
  { label: 'Numbered list', icon: ListOrdered, name: 'insertOrderedList' },
  { label: 'Add description link', icon: Link2, name: 'link' },
  { label: 'Add description media', icon: ImagePlus, name: 'image' },
  { label: 'Quote', icon: Quote, name: 'formatBlock', argument: 'blockquote' },
  { label: 'Code', icon: Code, name: 'formatBlock', argument: 'pre' },
];

// The catalog continues to store Markdown; the editable DOM is never stored as HTML.
function serialize(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  const content = Array.from(node.childNodes).map(serialize).join('');
  switch (node.tagName) {
    case 'BR': return '\n';
    case 'B': case 'STRONG': return `**${content}**`;
    case 'I': case 'EM': return `*${content}*`;
    case 'U': return `__${content}__`;
    case 'A': return /^https?:\/\//i.test(node.getAttribute('href') ?? '') ? `[${content}](${node.getAttribute('href')})` : content;
    case 'IMG': return /^https?:\/\//i.test(node.getAttribute('src') ?? '') ? `![${node.getAttribute('alt') ?? 'Image'}](${node.getAttribute('src')})` : '';
    case 'LI': return `${node.parentElement?.tagName === 'OL' ? `${Array.from(node.parentElement.children).indexOf(node) + 1}.` : '-'} ${content.trim()}\n`;
    case 'UL': case 'OL': return `\n${content}\n`;
    case 'BLOCKQUOTE': return `\n${content.trim().split('\n').map(line => `> ${line}`).join('\n')}\n`;
    case 'CODE': return `\`${content}\``;
    case 'PRE': return `\n\`\`\`\n${node.textContent ?? ''}\n\`\`\`\n`;
    case 'P': case 'DIV': return `${content}\n`;
    default: return content;
  }
}

export function DigitalDescription({ value, onChange, editing }: { value: string; onChange: (value: string) => void; editing: boolean }) {
  const editor = React.useRef<HTMLDivElement>(null), initial = React.useRef<HTMLDivElement>(null);
  const emitted = React.useRef<string | null>(null), validHtml = React.useRef('');
  const range = React.useRef<Range | null>(null);
  const [insert, setInsert] = React.useState<'link' | 'image' | null>(null), [url, setUrl] = React.useState('');
  React.useLayoutEffect(() => {
    if (!editor.current || emitted.current === value) return;
    editor.current.innerHTML = initial.current?.querySelector('.cw-description')?.innerHTML ?? '';
    validHtml.current = editor.current.innerHTML;
  }, [value]);
  function change() {
    const root = editor.current; if (!root) return;
    const next = Array.from(root.childNodes).map(serialize).join('').replace(/\n{3,}/g, '\n\n').trimEnd();
    if (next.length > 2000) { root.innerHTML = validHtml.current; return; }
    validHtml.current = root.innerHTML;
    emitted.current = next;
    onChange(next);
  }
  function command(name: string, argument?: string) {
    editor.current?.focus();
    document.execCommand(name, false, argument);
    change();
  }
  function openInsert(kind: 'link' | 'image') {
    const selection = window.getSelection();
    range.current = selection?.rangeCount && editor.current?.contains(selection.anchorNode) ? selection.getRangeAt(0).cloneRange() : null;
    setUrl(''); setInsert(kind);
  }
  function addResource() {
    let parsed: URL; try { parsed = new URL(url); } catch { return; }
    if (!['https:', 'http:'].includes(parsed.protocol)) return;
    editor.current?.focus();
    const selection = window.getSelection();
    if (range.current) { selection?.removeAllRanges(); selection?.addRange(range.current); }
    if (insert === 'image') command('insertImage', parsed.href);
    else if (selection?.isCollapsed) {
      const link = document.createElement('a'); link.href = parsed.href; link.textContent = parsed.href;
      const current = selection.rangeCount ? selection.getRangeAt(0) : null;
      if (current) { current.insertNode(link); current.setStartAfter(link); current.collapse(true); selection.removeAllRanges(); selection.addRange(current); change(); }
    } else command('createLink', parsed.href);
    setInsert(null);
  }
  return <div className="dw-editor">
    <div hidden aria-hidden="true" ref={initial}><Description text={value}/></div>
    <div className="dw-editor-toolbar" role="toolbar" aria-label="Description formatting">
      <CommerceSelect label="Description block style" value="Paragraph" options={['Paragraph', 'Quote', 'Code']} disabled={!editing} onChange={block => command('formatBlock', block === 'Quote' ? 'blockquote' : block === 'Code' ? 'pre' : 'p')}/>
      {formats.map(({ label, icon: Icon, name, argument }) => <button key={label} type="button" aria-label={label} title={label} disabled={!editing} onMouseDown={event => event.preventDefault()} onClick={() => { if (name === 'link' || name === 'image') openInsert(name); else command(name, argument); }}><Icon size={12}/></button>)}
    </div>
    <div ref={editor} className="dw-editor-content" contentEditable={editing} suppressContentEditableWarning role="textbox" aria-label="Full description" aria-multiline="true" aria-readonly={!editing} tabIndex={0} onInput={change} onPaste={event => { if (!editing) return; event.preventDefault(); command('insertText', event.clipboardData.getData('text/plain')); }} onClick={event => { if ((event.target as HTMLElement).closest('a')) event.preventDefault(); }}/>
    <small className="dw-editor-counter">{value.length}/2000</small>
    {insert && <Dialog title={insert === 'image' ? 'Add image' : 'Add link'} onClose={() => setInsert(null)}><label className="cw-field"><span>{insert === 'image' ? 'Image URL' : 'Link URL'}</span><input type="url" aria-label={insert === 'image' ? 'Description image URL' : 'Description link URL'} autoFocus value={url} onChange={event => setUrl(event.target.value)} placeholder="https://"/></label><button className="cw-button primary" disabled={!/^https?:\/\//i.test(url)} onClick={addResource}>{insert === 'image' ? 'Add image' : 'Add link'}</button></Dialog>}
  </div>;
}
