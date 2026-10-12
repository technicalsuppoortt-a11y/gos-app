/* Safe HTML + media URL helpers used by the renderer and inspector. */

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'A', 'BR', 'SPAN', 'MARK', 'SUP', 'SUB', 'CODE', 'SMALL', 'FONT']);
const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'style', 'color']);

/** Keep simple inline formatting only; strips scripts, event handlers and javascript: URLs. */
export function sanitizeInline(html: string): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, '');
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement;
  const clean = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(child.tagName)) { child.remove(); continue; }
        if (child.tagName === 'DIV' || child.tagName === 'P') { child.insertAdjacentHTML('beforebegin', '<br>'); }
        clean(child);
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const value = attr.value.trim().toLowerCase();
        if (!ALLOWED_ATTRS.has(attr.name) || value.startsWith('javascript:') || (attr.name === 'style' && /expression|url\(/i.test(value))) child.removeAttribute(attr.name);
      }
      if (child.tagName === 'A') { child.setAttribute('rel', 'noopener noreferrer'); }
      clean(child);
    }
  };
  clean(root);
  return root.innerHTML.replace(/^(<br>)+/, '');
}

export const stripTags = (html: string) => (html || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();

export function youtubeId(url = ''): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  if (match) return match[1];
  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : '';
}

export function vimeoId(url = ''): string {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (match) return match[1];
  return /^\d+$/.test(url.trim()) ? url.trim() : '';
}

export const isSafeUrl = (url = '') => /^(https?:|mailto:|tel:|\/|#)/i.test(url.trim());

export function normalizeUrl(url = ''): string {
  const value = url.trim();
  if (!value) return '';
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(value)) return `https://${value}`;
  return '';
}

export const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});
