import { useEffect, useState, type ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../backend/firebase';
import { isPlatformHostname, normalizeHost, SITE_DOMAINS, PUBLISHED_SITES } from '../../backend/siteDomains';
import { PublishedPage } from '../../pages/PublishedPage';
import type { Asset } from '../../pages/asset-model';
import { Globe } from 'lucide-react';

export function CustomDomainInterceptor({ children }: { children: ReactNode }) {
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedAsset, setResolvedAsset] = useState<Asset | null>(null);
  const [resolvedPageId, setResolvedPageId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hostname = window.location.hostname;

    if (isPlatformHostname(hostname)) {
      setIsCustomDomain(false);
      setLoading(false);
      return;
    }

    setIsCustomDomain(true);
    setLoading(true);

    const resolveDomain = async () => {
      try {
        const cleanHost = normalizeHost(hostname);
        let domainSnap = await getDoc(doc(db, SITE_DOMAINS, cleanHost));

        if (!domainSnap.exists() && cleanHost.startsWith('www.')) {
          domainSnap = await getDoc(doc(db, SITE_DOMAINS, cleanHost.replace(/^www\./, '')));
        } else if (!domainSnap.exists() && !cleanHost.startsWith('www.')) {
          domainSnap = await getDoc(doc(db, SITE_DOMAINS, `www.${cleanHost}`));
        }

        if (!domainSnap.exists()) {
          setError(`Domain ${cleanHost} is not connected to any website yet.`);
          setLoading(false);
          return;
        }

        const domainData = domainSnap.data();
        const funnelId = domainData.funnelId;
        if (!funnelId) {
          setError(`Domain is registered but no website or funnel is connected.`);
          setLoading(false);
          return;
        }

        const siteSnap = await getDoc(doc(db, PUBLISHED_SITES, funnelId));
        if (!siteSnap.exists()) {
          setError('The connected website has not been published yet.');
          setLoading(false);
          return;
        }

        const siteData = siteSnap.data();
        const pages = siteData.steps || siteData.pages || [];
        const currentPath = window.location.pathname || '/';
        const cleanPath = currentPath.toLowerCase().replace(/^\//, '');

        let targetPage = pages.find((p: any) => p.path && p.path.toLowerCase().replace(/^\//, '') === cleanPath);
        if (!targetPage && cleanPath) {
          targetPage = pages.find((p: any) => {
            const sSlug = String(p.slug || p.path || '').toLowerCase().replace(/^\//, '');
            const sName = String(p.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return sSlug === cleanPath || sName === cleanPath || p.id === cleanPath;
          });
        }
        if (!targetPage) {
          targetPage = pages.find((p: any) => p.path === '/' || p.published) || pages[0];
        }

        const asset: Asset = {
          id: funnelId,
          kind: siteData.kind || 'funnel',
          name: siteData.name || 'Website',
          domain: cleanHost,
          image: '',
          updated: siteData.updatedAt || new Date().toISOString(),
          settings: siteData.settings || { seo: siteData.name || 'Website', color: '#2563eb', navigation: '' },
          description: '',
          document: {
            pages: pages.map((p: any) => ({
              id: p.id,
              name: p.name || 'Page',
              path: p.path || '/',
              sections: p.publishedCanvas || p.canvas || [],
              showHeader: p.publishedPage?.showHeader ?? true,
              showFooter: p.publishedPage?.showFooter ?? true,
              backgroundColor: p.publishedPage?.backgroundColor || '#ffffff'
            })),
            funnel: {
              name: siteData.name || 'Website',
              goal: '',
              audience: '',
              offer: '',
              pagesFlow: pages.map((p: any) => p.id),
              events: [],
              status: 'Published'
            },
            steps: pages
          }
        };

        setResolvedAsset(asset);
        setResolvedPageId(targetPage?.id || pages[0]?.id || '');
      } catch (err: any) {
        console.error('Error resolving custom domain:', err);
        setError(err.message || 'Could not load custom domain site.');
      } finally {
        setLoading(false);
      }
    };

    resolveDomain();
  }, []);

  if (!isCustomDomain) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '3px solid rgba(56,189,248,0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Loading website...</p>
        </div>
      </div>
    );
  }

  if (error || !resolvedAsset || !resolvedPageId) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: 32, background: '#1e293b', borderRadius: 16, border: '1px solid #334155' }}>
          <Globe size={44} style={{ color: '#38bdf8', marginBottom: 16, marginInline: 'auto' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: '#f8fafc' }}>Website Not Found</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>{error || 'This website is not published yet or the link is incorrect.'}</p>
        </div>
      </div>
    );
  }

  return (
    <PublishedPage
      asset={resolvedAsset}
      pageId={resolvedPageId}
      onNavigate={(id) => setResolvedPageId(id)}
    />
  );
}
