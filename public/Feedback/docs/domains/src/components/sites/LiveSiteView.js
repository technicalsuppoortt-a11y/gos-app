'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ElementRenderer from '@/components/builder/ElementRenderer';
import { DEFAULT_PAGE } from '@/lib/builder/elementRegistry';
import { normalizeHost, isPlatformHostname, pickPublishedStep, publishedSiteToStore, PUBLISHED_SITES, SITE_DOMAINS } from '@/lib/sites/publicSite';
import { findLocalBlogById, findLocalFormById, findLocalFunnelById, findLocalStoreById } from '@/lib/sites/userSitesScope';
import {
  cartCount,
  loadStoreCart,
  saveStoreCart,
  setCartItemQty,
  upsertCartItem
} from '@/lib/sites/storeCart';
import {
  StorePreviewContext,
  buildStorePreviewUrl,
  findStorePage,
  hydrateStorePage,
  resolveStorePageIndex
} from '@/components/sites/stores/StorePreviewContext';

function pickStorePage(store, { stepIdx, path }) {
  const pages = store?.pages || [];
  if (!pages.length) return null;
  if (path) {
    const found = findStorePage(pages, path);
    if (found) return found;
  }
  if (Number.isFinite(stepIdx) && pages[stepIdx]) return pages[stepIdx];
  return pages.find((p) => p.type === 'home') || pages[0] || null;
}

function readLocalStore(lookupId) {
  return findLocalStoreById(lookupId);
}

export default function LiveSiteView({
  funnelId = '',
  storeId = '',
  stepIdx,
  path = '',
  host = '',
  isDraft = false,
  productId = ''
}) {
  const [step, setStep] = useState(null);
  const [storeRecord, setStoreRecord] = useState(null);
  const [mode, setMode] = useState(isDraft ? 'draft' : 'live');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState('');

  useEffect(() => {
    if (storeRecord?.id) setCart(loadStoreCart(storeRecord.id));
  }, [storeRecord?.id]);

  useEffect(() => {
    let cancelled = false;

    const browserPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const effectivePath = path || (browserPath && browserPath !== '/preview-site' ? browserPath : '/');

    const applyStore = (match, resolvedProductId, nextMode) => {
      const rawPage = pickStorePage(match, { stepIdx, path: effectivePath });
      if (!rawPage) return false;
      const page = (!isDraft && (rawPage.publishedCanvas || match.published))
        ? { ...rawPage, canvas: rawPage.publishedCanvas || rawPage.canvas, page: rawPage.publishedPage || rawPage.page }
        : rawPage;
      if (!cancelled) {
        setStoreRecord(match);
        setStep(hydrateStorePage(page, match, resolvedProductId));
        setMode(nextMode);
      }
      return true;
    };

    const load = async () => {
      setLoading(true);
      try {
        const resolvedProductId = productId || (typeof window !== 'undefined'
          ? (new URLSearchParams(window.location.search).get('productId') || '')
          : '');
        const lookupId = storeId || funnelId;

        if (isDraft) {
          const localStore = readLocalStore(lookupId);
          if (localStore && applyStore(localStore, resolvedProductId, 'draft')) return;
        }

        let resolvedId = lookupId;
        const incomingHost = normalizeHost(host || (typeof window !== 'undefined' ? window.location.hostname : ''));
        const isCustomLookup = (!resolvedId || resolvedId === '_custom_domain' || resolvedId === '_domain') && !isPlatformHostname(incomingHost);
        if (incomingHost && isCustomLookup) {
          let domainSnap = await getDoc(doc(db, SITE_DOMAINS, incomingHost));
          if (!domainSnap.exists() && incomingHost.startsWith('www.')) {
            domainSnap = await getDoc(doc(db, SITE_DOMAINS, incomingHost.replace(/^www\./, '')));
          } else if (!domainSnap.exists() && !incomingHost.startsWith('www.')) {
            domainSnap = await getDoc(doc(db, SITE_DOMAINS, `www.${incomingHost}`));
          }
          if (domainSnap.exists()) {
            resolvedId = domainSnap.data().funnelId || resolvedId;
          }
        }

        if (resolvedId) {
          const siteSnap = await getDoc(doc(db, PUBLISHED_SITES, resolvedId));
          if (siteSnap.exists()) {
            const data = siteSnap.data() || {};
            const isStoreDoc = data.kind === 'store' || Array.isArray(data.products);
            if (isStoreDoc) {
              const store = publishedSiteToStore(data, resolvedId);
              if (applyStore(store, resolvedProductId, incomingHost ? 'custom' : 'live')) return;
            } else {
              const picked = pickPublishedStep(data, { stepIdx, path: effectivePath });
              if (!cancelled && picked) {
                setStoreRecord(null);
                const resolvedCanvas = (Array.isArray(picked.publishedCanvas) && picked.publishedCanvas.length > 0)
                  ? picked.publishedCanvas
                  : (Array.isArray(picked.canvas) ? picked.canvas : []);
                setStep({
                  ...picked,
                  canvas: resolvedCanvas,
                  page: picked.publishedPage || picked.page || {}
                });
                setMode(incomingHost ? 'custom' : 'live');
                return;
              }
            }
          }
        }

        if (!cancelled) setStoreRecord(null);

        if (isDraft) {
          const match = findLocalFunnelById(funnelId || resolvedId) || findLocalBlogById(funnelId || resolvedId) || findLocalFormById(funnelId || resolvedId);
          const steps = match?.steps || (match?.canvas ? [{
            id: match.id,
            name: match.name || 'Form',
            path: `/${match.id}`,
            canvas: match.canvas,
            page: DEFAULT_PAGE
          }] : (match?.posts || []).map((p, idx) => ({
            id: p.id,
            name: p.title || 'Post',
            path: `/${p.slug || p.id}`,
            canvas: p.canvas || [],
            page: p.page || DEFAULT_PAGE
          })));
          const draftStep = pickPublishedStep({ steps }, { stepIdx, path: effectivePath }) || (Number.isFinite(stepIdx) ? steps?.[stepIdx] : null) || steps?.[0] || null;
          if (!cancelled && draftStep) {
            setStep(draftStep);
            setMode('draft');
            return;
          }
        }

        if (!cancelled) setStep(null);
      } catch (err) {
        console.error(err);
        if (!cancelled) setStep(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [funnelId, storeId, stepIdx, path, host, isDraft, productId]);

  const storePreviewValue = useMemo(() => {
    if (!storeRecord) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const persistCart = (next) => {
      setCart(next);
      saveStoreCart(storeRecord.id, next);
    };
    return {
      store: storeRecord,
      isDraft,
      cart,
      cartCount: cartCount(cart),
      catalogQuery,
      setCatalogQuery,
      addToCart: (product) => persistCart(upsertCartItem(cart, product, 1)),
      setItemQty: (id, qty) => persistCart(setCartItemQty(cart, id, qty)),
      clearCart: () => persistCart([]),
      navigateTo: (href, extra = {}) => {
        const pages = storeRecord.pages || [];
        const idx = resolveStorePageIndex(pages, href);
        const target = pages[idx] || pages[0];
        const pathPart = target?.path && target.path !== '/' ? target.path : '';
        const qs = extra.productId ? `?productId=${encodeURIComponent(extra.productId)}` : '';
        const onCustomDomain = mode === 'custom' || (
          typeof window !== 'undefined' &&
          storeRecord.domain &&
          normalizeHost(window.location.host) === normalizeHost(storeRecord.domain)
        );
        const url = isDraft
          ? buildStorePreviewUrl({
              origin,
              storeId: storeRecord.id,
              pageIdx: idx,
              path: target?.path || '/',
              isDraft: true,
              productId: extra.productId || ''
            })
          : onCustomDomain
            ? `${origin}${pathPart || '/'}${qs}`
            : `${origin}/s/${encodeURIComponent(storeRecord.id)}${pathPart}${qs}`;
        window.location.href = url;
      }
    };
  }, [storeRecord, isDraft, cart, catalogQuery, mode]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(37,99,235,0.3)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          {isDraft ? 'Loading preview...' : 'Loading live site...'}
        </div>
      </div>
    );
  }

  if (!step) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <Globe size={48} style={{ color: '#38bdf8', marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Page not found</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>This store is not published yet, or the link is incorrect.</p>
          <a href="/dashboard" style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const canvas = step.canvas || [];
  const page = { ...DEFAULT_PAGE, ...(step.page || {}) };
  const isStore = !!storeRecord;
  const badge = mode === 'draft' ? 'Saved preview' : '';

  return (
    <StorePreviewContext.Provider value={storePreviewValue}>
    <div style={{ minHeight: '100vh', background: page.background || '#ffffff', color: page.textColor || '#0f172a', fontFamily: `"${page.fontFamily || 'DM Sans'}", "IBM Plex Sans Arabic", system-ui, sans-serif` }}>
      <style>{`
        .uk-live-grid { display: grid; gap: 14px; }
        @media (max-width: 800px) {
          .uk-row { grid-template-columns: 1fr !important; }
          .uk-live-grid { grid-template-columns: 1fr !important; }
        }
        ${page.customCss || ''}
      `}</style>
      {badge ? (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 16,
          background: 'rgba(15, 23, 42, 0.88)',
          color: '#fff',
          padding: '6px 14px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          zIndex: 99999
        }}>
          {badge}
        </div>
      ) : null}

      <main style={{
        maxWidth: isStore ? '100%' : (page.maxWidth || 1080),
        margin: '0 auto',
        padding: isStore ? 0 : `${page.paddingY || 60}px ${page.paddingX || 20}px`
      }}>
        {canvas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a' }}>{step.name}</h1>
            <p>{isDraft ? 'This page is empty. Add elements in the builder.' : 'This page is empty. Add elements in the builder, then publish.'}</p>
          </div>
        ) : (
          canvas.map((el) => {
            const fullBleed = isStore && ['store_header', 'store_hero_banner'].includes(el.type);
            return (
              <div
                key={el.id}
                style={{
                  margin: fullBleed ? 0 : (isStore ? '0 auto 8px' : '24px 0'),
                  maxWidth: fullBleed ? 'none' : (isStore ? 1200 : 'none'),
                  padding: fullBleed ? 0 : (isStore ? '0 20px' : 0)
                }}
              >
                <ElementRenderer el={el} interactive />
              </div>
            );
          })
        )}
      </main>

      {page.showBranding !== false && (
        <footer style={{ borderTop: '1px solid #e2e8f0', padding: '36px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Powered by <b>UpKlick Stores & Funnels</b>
        </footer>
      )}
    </div>
    </StorePreviewContext.Provider>
  );
}
