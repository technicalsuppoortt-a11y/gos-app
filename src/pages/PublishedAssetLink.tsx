import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ExternalLink } from 'lucide-react';
import type { RootState } from '../store';
import type { Asset } from './asset-model';
import { translateText } from '../i18n/display';

function secureUrl(value?: string) {
  try { const url = new URL(value ?? ''); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}

export function usePublishedAssetUrl(asset?: Asset) {
  const tenantId = useSelector((state: RootState) => state.auth.tenant?.id);
  const [legacy, setLegacy] = useState<{ key: string; url: string }>();
  const published = asset?.document.funnel.status === 'Published';
  const saved = secureUrl(asset?.publishedUrl);
  const custom = published && asset?.domain ? secureUrl(`https://${asset.domain}`) : '';
  const key = tenantId && asset ? `${tenantId}/${asset.id}` : '';
  useEffect(() => {
    if (!published || saved || custom || !key) return;
    let cancelled = false;
    // Older publications predate the URL field. Match the server's stable site ID.
    void crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)).then(hash => {
      const id = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 24);
      if (!cancelled) setLegacy({ key, url: `https://gos-${id}.web.app` });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [published, saved, custom, key]);
  return saved || custom || (published && legacy?.key === key ? legacy.url : '');
}

export function PublishedAssetLink({ asset, className = 'aw-text-button', showUrl = false }: { asset: Asset; className?: string; showUrl?: boolean }) {
  const url = usePublishedAssetUrl(asset);
  return url ? <a className={className} href={url} target="_blank" rel="noopener noreferrer" title={url} style={showUrl ? { maxWidth: '100%', overflowWrap: 'anywhere' } : undefined}><ExternalLink size={13}/>{showUrl ? url : translateText('View Published Site')}</a> : null;
}
