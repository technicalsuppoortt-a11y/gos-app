import { useState } from 'react';
import { Eye, ExternalLink } from 'lucide-react';
import { translateText, useUILanguage } from '../../i18n/display';
import { CommercePolicyDocument } from './CommercePolicyPage';
import { ExternalPagePreview, PreviewDialog, safePreviewUrl } from './PagePreviewFrame';

export function PolicyPreviewLink({ kind, url, custom = false, checkout = false }: { kind: 'terms' | 'privacy'; url?: string; custom?: boolean; checkout?: boolean }) {
  useUILanguage();
  const [open, setOpen] = useState(false);
  const title = translateText(kind === 'terms' ? 'Terms of Service' : 'Privacy Policy');
  const href = custom ? safePreviewUrl(url || '') : `/commerce/policies/${kind}`;
  return <><a className="pv-policy-link" href={href || undefined} aria-disabled={!href} onClick={event => { event.preventDefault(); if (href) setOpen(true); }}>{!checkout && <Eye size={13}/>} {translateText(checkout ? kind === 'terms' ? 'Terms' : 'Privacy policy' : kind === 'terms' ? 'Preview Terms of Service' : 'Preview Privacy Policy')}</a>{open && <PreviewDialog title={title} onClose={() => setOpen(false)}><div className="pv-policy-tools">{href && <a href={href} target="_blank" rel="noopener noreferrer">{translateText('Open in new tab')}<ExternalLink size={12}/></a>}</div>{custom ? <ExternalPagePreview url={url || ''} title={title}/> : <CommercePolicyDocument kind={kind}/>}</PreviewDialog>}</>;
}
