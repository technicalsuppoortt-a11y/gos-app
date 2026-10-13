import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { publicUrl } from './model';
import type { BookingPage } from './model';
import { Modal } from './ui';
import './booking-embed.css';

const attribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function BookingEmbedModal({ page, close }: { page: BookingPage; close: () => void }) {
  useUILanguage();
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null);
  const [error, setError] = useState('');
  const link = publicUrl(page);
  const snippet = `<iframe\n  src="${attribute(link)}"\n  title="${attribute(page.titleOverride || page.name)}"\n  width="100%"\n  height="760"\n  style="border: 0; border-radius: 12px;"\n  loading="lazy"\n></iframe>`;
  const copy = async (kind: 'link' | 'embed') => {
    setError('');
    try {
      await navigator.clipboard.writeText(kind === 'link' ? link : snippet);
      setCopied(kind);
    } catch {
      setCopied(null);
      setError('Copy is unavailable. Select the text and copy it manually.');
    }
  };
  return <Modal title={translateText(`Embed Code — ${page.name}`)} close={close}>
    <div className="bk-embed-content bk-form">
      <label htmlFor="booking-embed-link">{translateText("Direct Link")}</label>
      <div className="bk-embed-link-row"><input id="booking-embed-link" readOnly value={link} onFocus={e => e.target.select()}/><button type="button" className="bk-embed-copy" onClick={() => void copy('link')}>{localizeNode(copied === 'link' ? <Check size={14}/> : <Copy size={14}/>)}<span>{localizeNode(copied === 'link' ? 'Copied!' : 'Copy')}</span></button></div>
      <label htmlFor="booking-embed-snippet">{translateText("Embed Code — place on your website")}</label>
      <textarea id="booking-embed-snippet" readOnly spellCheck={false} value={snippet} onFocus={e => e.target.select()}/>
      <button type="button" className="bk-embed-copy bk-embed-copy-main" onClick={() => void copy('embed')}>{localizeNode(copied === 'embed' ? <Check size={16}/> : <Copy size={16}/>)}<span>{localizeNode(copied === 'embed' ? 'Embed Code Copied!' : 'Copy Embed Code')}</span></button>
      <label htmlFor="booking-embed-calendar">{translateText("Calendar ID (API/Webhooks)")}</label>
      <input id="booking-embed-calendar" readOnly value={page.id} onFocus={e => e.target.select()}/>
      {localizeNode(error && <p className="bk-error" role="alert">{localizeNode(error)}</p>)}
      <span className="sr-only" role="status">{localizeNode(copied === 'link' ? 'Direct link copied.' : copied === 'embed' ? 'Embed code copied.' : '')}</span>
    </div>
  </Modal>;
}
