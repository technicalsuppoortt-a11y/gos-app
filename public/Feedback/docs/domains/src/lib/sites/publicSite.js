import { db } from '@/lib/firebase';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

export const PUBLISHED_SITES = 'published_sites';
export const SITE_DOMAINS = 'site_domains';

export function normalizeHost(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

export function normalizePath(input) {
  const raw = String(input || '/').trim() || '/';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  if (withSlash.length > 1 && withSlash.endsWith('/')) return withSlash.slice(0, -1);
  return withSlash;
}

export function isPlatformHostname(host) {
  if (!host) return true;
  const clean = normalizeHost(host);
  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(clean)) return true;
  if (clean.endsWith('.vercel.app')) return true;
  if (clean.includes('ngrok') || clean.includes('trycloudflare')) return true;
  if (
    clean === 'upklick.net' ||
    clean === 'www.upklick.net' ||
    clean === 'app.upklick.net' ||
    clean.endsWith('.upklick.net') ||
    clean === 'upklick.com' ||
    clean === 'www.upklick.com' ||
    clean === 'app.upklick.com' ||
    clean.endsWith('.upklick.com')
  ) {
    return true;
  }
  const extras = String(process.env.NEXT_PUBLIC_APP_HOSTS || '')
    .split(',')
    .map((item) => normalizeHost(item))
    .filter(Boolean);
  return extras.includes(clean);
}

export function getCnameTarget() {
  return process.env.NEXT_PUBLIC_SITES_CNAME || 'cname.vercel-dns.com';
}

export function getApexIpTarget() {
  return process.env.NEXT_PUBLIC_SITES_A_RECORD_IP || '76.76.21.21';
}

export function isApexDomain(host) {
  const parts = normalizeHost(host).split('.').filter(Boolean);
  return parts.length === 2;
}

export function getStepPath(step, fallbackIdx = 0) {
  if (step?.path) return normalizePath(step.path);
  if (step?.slug) return normalizePath(step.slug);
  return fallbackIdx === 0 ? '/' : `/page-${fallbackIdx + 1}`;
}

export function getEntitySteps(entity) {
  if (Array.isArray(entity?.steps) && entity.steps.length) return entity.steps;
  if (Array.isArray(entity?.pages) && entity.pages.length) return entity.pages;
  if (Array.isArray(entity?.posts) && entity.posts.length) return entity.posts;
  return [];
}

export function getProductionUrls({ origin, funnel, stepIdx = 0 }) {
  const steps = getEntitySteps(funnel);
  const step = steps[stepIdx] || steps[0];
  const stepPath = getStepPath(step, stepIdx);
  const isStore = funnel?.kind === 'store' || String(funnel?.id || '').startsWith('store_') || Array.isArray(funnel?.products);
  const appPublished = `${origin}/s/${encodeURIComponent(funnel?.id || '')}${stepPath === '/' ? '' : stepPath}`;
  const saved = isStore
    ? `${origin}/preview-site?storeId=${encodeURIComponent(funnel?.id || '')}&pageIdx=${stepIdx}&draft=1`
    : `${origin}/preview-site?funnelId=${encodeURIComponent(funnel?.id || '')}&stepIdx=${stepIdx}&draft=1`;
  const domain = normalizeHost(funnel?.domain);
  const custom = domain ? `https://${domain}${stepPath === '/' ? '' : stepPath}` : '';
  return {
    saved,
    published: custom || appPublished,
    appPublished,
    custom
  };
}

export function pickPublishedStep(site, { stepIdx, path } = {}) {
  const steps = site?.steps || site?.pages || site?.posts || [];
  if (!steps.length) return null;
  const rawWanted = String(path || '').trim();
  const wanted = rawWanted ? normalizePath(rawWanted).toLowerCase() : '';
  const cleanWanted = wanted.replace(/^\//, '');

  if (wanted && wanted !== '/') {
    // 1. Exact match on normalized path (case-insensitive)
    let byPath = steps.find((s) => s.path && normalizePath(s.path).toLowerCase() === wanted);
    if (byPath) return byPath;

    // 2. Match without leading slash against s.path or s.slug
    byPath = steps.find((s) => {
      const sp = String(s.path || s.slug || '').trim().replace(/^\//, '').toLowerCase();
      return sp && sp === cleanWanted;
    });
    if (byPath) return byPath;

    // 3. Match against step name slug or id (e.g. name "admin", "ai-freelance")
    byPath = steps.find((s) => {
      const sName = String(s.name || s.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const sId = String(s.id || '').trim().toLowerCase();
      return (sName && sName === cleanWanted) || (sId && sId === cleanWanted);
    });
    if (byPath) return byPath;
  }

  if (wanted === '/') {
    const rootStep = steps.find((s) => s.path && normalizePath(s.path) === '/');
    if (rootStep) return rootStep;
  }

  if (Number.isFinite(stepIdx) && steps[stepIdx]) return steps[stepIdx];
  if (Number.isFinite(site?.defaultStepIdx) && steps[site.defaultStepIdx]) return steps[site.defaultStepIdx];
  return steps.find((s) => s.published || s.status === 'published') || steps[0] || null;
}

export async function publishFunnelPublic({ funnel, ownerUid, defaultStepIdx = 0 }) {
  if (!funnel?.id) throw new Error('Missing funnel');
  const steps = (funnel.steps || []).map((step, idx) => ({
    id: step.id,
    name: step.name || 'Page',
    path: getStepPath(step, idx),
    published: !!step.published,
    publishedAt: step.publishedAt || null,
    publishedCanvas: (Array.isArray(step.publishedCanvas) && step.publishedCanvas.length > 0)
      ? step.publishedCanvas
      : (Array.isArray(step.canvas) ? step.canvas : []),
    publishedPage: step.publishedPage || step.page || {}
  }));

  await setDoc(doc(db, PUBLISHED_SITES, funnel.id), {
    ownerUid: ownerUid || '',
    kind: 'funnel',
    funnelId: funnel.id,
    name: funnel.name || '',
    domain: normalizeHost(funnel.domain),
    domainStatus: funnel.domainStatus || (funnel.domain ? 'pending' : ''),
    defaultStepIdx,
    steps,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export function storePagesToPublishedSteps(store, { publishAll = true } = {}) {
  return (store?.pages || []).map((page) => {
    const published = publishAll || !!page.published;
    return {
      id: page.id,
      name: page.name || 'Page',
      path: getStepPath(page),
      type: page.type || 'catalog',
      published,
      publishedAt: page.publishedAt || (published ? new Date().toISOString() : null),
      publishedCanvas: published
        ? JSON.parse(JSON.stringify(page.publishedCanvas || page.canvas || []))
        : [],
      publishedPage: published
        ? JSON.parse(JSON.stringify(page.publishedPage || page.page || {}))
        : {},
      canvas: JSON.parse(JSON.stringify(page.canvas || [])),
      page: JSON.parse(JSON.stringify(page.page || {}))
    };
  });
}

export function prepareStoreForPublish(store) {
  const nowIso = new Date().toISOString();
  const pages = (store?.pages || []).map((page) => ({
    ...page,
    published: true,
    publishedAt: nowIso,
    publishedCanvas: JSON.parse(JSON.stringify(page.canvas || page.publishedCanvas || [])),
    publishedPage: JSON.parse(JSON.stringify(page.page || page.publishedPage || {}))
  }));
  return {
    ...store,
    kind: 'store',
    published: true,
    publishedAt: nowIso,
    lastUpdated: new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    pages
  };
}

export async function publishStorePublic({ store, ownerUid, defaultPageIdx = 0 }) {
  if (!store?.id) throw new Error('Missing store');
  const steps = storePagesToPublishedSteps(store, { publishAll: true });
  const products = JSON.parse(JSON.stringify(store.products || []));
  const settings = JSON.parse(JSON.stringify(store.settings || {}));

  await setDoc(doc(db, PUBLISHED_SITES, store.id), {
    ownerUid: ownerUid || '',
    kind: 'store',
    storeId: store.id,
    funnelId: store.id,
    name: store.name || '',
    domain: normalizeHost(store.domain),
    domainStatus: store.domainStatus || (store.domain ? 'pending' : ''),
    defaultStepIdx: defaultPageIdx,
    steps,
    pages: steps,
    products,
    settings,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export function publishedSiteToStore(data, fallbackId = '') {
  if (!data) return null;
  const pages = (data.pages || data.steps || []).map((page) => ({
    ...page,
    canvas: page.publishedCanvas || page.canvas || [],
    page: page.publishedPage || page.page || {}
  }));
  return {
    id: data.storeId || data.funnelId || fallbackId,
    name: data.name || 'Store',
    domain: data.domain || '',
    domainStatus: data.domainStatus || '',
    pages,
    products: data.products || [],
    settings: data.settings || {},
    sales: data.sales || [],
    published: true,
    kind: 'store'
  };
}

export async function connectFunnelDomain({ funnelId, ownerUid, host, previousHost }) {
  const normalized = normalizeHost(host);
  const prev = normalizeHost(previousHost);
  if (prev && prev !== normalized) {
    try { await deleteDoc(doc(db, SITE_DOMAINS, prev)); } catch {}
  }
  if (!normalized) {
    if (prev) {
      try { await deleteDoc(doc(db, SITE_DOMAINS, prev)); } catch {}
    }
    return { host: '' };
  }

  if (isPlatformHostname(normalized)) {
    throw new Error('This domain is a reserved platform domain and cannot be attached to a custom website.');
  }

  const existing = await getDoc(doc(db, SITE_DOMAINS, normalized));
  if (existing.exists() && existing.data()?.funnelId && existing.data().funnelId !== funnelId) {
    throw new Error('This domain is already connected to another website.');
  }

  const alternate = normalized.startsWith('www.')
    ? normalized.replace(/^www\./, '')
    : (normalized.split('.').length === 2 ? `www.${normalized}` : '');

  await setDoc(doc(db, SITE_DOMAINS, normalized), {
    host: normalized,
    funnelId,
    ownerUid: ownerUid || '',
    status: 'pending',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  if (alternate) {
    try {
      await setDoc(doc(db, SITE_DOMAINS, alternate), {
        host: alternate,
        funnelId,
        ownerUid: ownerUid || '',
        status: 'pending',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch {}
  }

  return { host: normalized };
}

export async function markDomainStatus(host, status, extra = {}) {
  const normalized = normalizeHost(host);
  if (!normalized) return;
  await setDoc(doc(db, SITE_DOMAINS, normalized), {
    host: normalized,
    status,
    checkedAt: new Date().toISOString(),
    ...extra
  }, { merge: true });
}
