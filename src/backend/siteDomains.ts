import { encodeFirestoreValue } from './firestoreCodec';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db, callBackend, backendError } from './firebase';
import type { Asset, Domain } from '../pages/asset-model';

export const SITE_DOMAINS = 'site_domains';
export const PUBLISHED_SITES = 'published_sites';

export function normalizeHost(input: string | undefined | null): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

export function isPlatformHostname(host: string | undefined | null): boolean {
  if (!host) return true;
  const clean = normalizeHost(host);
  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(clean)) return true;
  if (clean.endsWith('.vercel.app')) return true;
  if (clean.endsWith('.web.app') || clean.endsWith('.firebaseapp.com')) return true;
  if (clean.includes('ngrok') || clean.includes('trycloudflare')) return true;
  if (
    clean === 'upklick.net' ||
    clean === 'www.upklick.net' ||
    clean === 'app.upklick.net' ||
    clean.endsWith('.upklick.net') ||
    clean === 'upklick.com' ||
    clean === 'www.upklick.com' ||
    clean === 'app.upklick.com' ||
    clean.endsWith('.upklick.com') ||
    clean.includes('gos-app')
  ) {
    return true;
  }
  const extras = String(import.meta.env.VITE_APP_HOSTS || import.meta.env.NEXT_PUBLIC_APP_HOSTS || '')
    .split(',')
    .map(item => normalizeHost(item))
    .filter(Boolean);
  return extras.includes(clean);
}

export function getCnameTarget(): string {
  return import.meta.env.VITE_SITES_CNAME || import.meta.env.NEXT_PUBLIC_SITES_CNAME || 'cname.vercel-dns.com';
}

export function getApexIpTarget(): string {
  return import.meta.env.VITE_SITES_A_RECORD_IP || import.meta.env.NEXT_PUBLIC_SITES_A_RECORD_IP || '76.76.21.21';
}

export function isApexDomain(host: string): boolean {
  const parts = normalizeHost(host).split('.').filter(Boolean);
  return parts.length === 2;
}

export type DnsVerificationResult = {
  ok: boolean;
  host: string;
  matched: boolean;
  matchedType?: 'cname' | 'a' | null;
  cnames?: string[];
  aRecords?: string[];
  targets?: string[];
  expectedIps?: string[];
  status?: string;
  ssl?: string;
  vercel?: any;
  firebaseAuth?: any;
  error?: string;
};

export async function connectSiteDomain({
  funnelId,
  ownerUid = '',
  host,
  previousHost = '',
  tenantId = ''
}: {
  funnelId: string;
  ownerUid?: string;
  host: string;
  previousHost?: string;
  tenantId?: string;
}): Promise<{ host: string }> {
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

  const now = new Date().toISOString();
  const alternate = normalized.startsWith('www.')
    ? normalized.replace(/^www\./, '')
    : (normalized.split('.').length === 2 ? `www.${normalized}` : '');

  const payload = {
    host: normalized,
    name: normalized,
    funnelId,
    ownerUid: ownerUid || '',
    tenantId: tenantId || '',
    status: 'pending',
    ssl: 'Not configured',
    updatedAt: now,
    checkedAt: now
  };

  await setDoc(doc(db, SITE_DOMAINS, normalized), payload, { merge: true });

  if (alternate) {
    try {
      await setDoc(doc(db, SITE_DOMAINS, alternate), {
        ...payload,
        host: alternate,
        name: alternate
      }, { merge: true });
    } catch {}
  }

  // Also sync with published_sites
  if (funnelId) {
    try {
      await setDoc(doc(db, PUBLISHED_SITES, funnelId), {
        domain: normalized,
        domainStatus: 'pending',
        updatedAt: now
      }, { merge: true });
    } catch {}
  }

  return { host: normalized };
}

export async function verifySiteDomain(
  host: string,
  extra: { funnelId?: string; ownerUid?: string; tenantId?: string } = {}
): Promise<DnsVerificationResult> {
  const clean = normalizeHost(host);
  if (!clean) throw new Error('Enter a valid domain');

  // Try the Cloud Function callable first
  try {
    const res = await callBackend<DnsVerificationResult>('verifyDomain', {
      host: clean,
      ...extra
    });
    return res;
  } catch (err: any) {
    // If callable fails (e.g. CORS or network in local preview), try HTTP API endpoint
    try {
      const apiEndpoint = import.meta.env.VITE_VERIFY_DOMAIN_ENDPOINT || '/api/sites/verify-domain';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: clean, ...extra })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback: update status locally in Firestore if both backend calls are unreachable
    }

    // Fallback: mark in Firestore as pending
    const now = new Date().toISOString();
    try {
      await setDoc(doc(db, SITE_DOMAINS, clean), {
        host: clean,
        name: clean,
        status: 'pending',
        ssl: 'Not configured',
        checkedAt: now,
        ...extra
      }, { merge: true });
    } catch {}

    return {
      ok: false,
      host: clean,
      matched: false,
      status: 'pending',
      ssl: 'Not configured',
      error: backendError(err)
    };
  }
}

export async function disconnectSiteDomain(
  host: string,
  extra: { funnelId?: string; tenantId?: string } = {}
): Promise<void> {
  const clean = normalizeHost(host);
  if (!clean) return;

  try {
    await callBackend('verifyDomain', { host: clean, disconnect: true, ...extra });
  } catch {
    try {
      await fetch('/api/sites/verify-domain', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: clean, ...extra })
      });
    } catch {}
  }

  const now = new Date().toISOString();
  try {
    await setDoc(doc(db, SITE_DOMAINS, clean), {
      status: 'disconnected',
      ssl: 'Inactive',
      updatedAt: now
    }, { merge: true });
  } catch {}

  if (extra.funnelId) {
    try {
      await setDoc(doc(db, PUBLISHED_SITES, extra.funnelId), {
        domain: '',
        domainStatus: '',
        updatedAt: now
      }, { merge: true });
    } catch {}
  }
}

export async function updateSiteDomain(
  host: string,
  updates: { funnelId?: string; default?: boolean; status?: 'Connected' | 'Pending' | 'Disconnected' },
  prevFunnelId?: string
): Promise<void> {
  const clean = normalizeHost(host);
  if (!clean) return;
  const now = new Date().toISOString();

  const payload: Record<string, any> = { updatedAt: now };
  if (updates.funnelId !== undefined) payload.funnelId = updates.funnelId;
  if (updates.default !== undefined) payload.default = updates.default;
  if (updates.status !== undefined) {
    payload.status = updates.status.toLowerCase();
    payload.ssl = updates.status === 'Connected' ? 'Active' : (updates.status === 'Disconnected' ? 'Inactive' : 'Not configured');
  }

  await setDoc(doc(db, SITE_DOMAINS, clean), payload, { merge: true });

  const alternate = clean.startsWith('www.')
    ? clean.replace(/^www\./, '')
    : (clean.split('.').length === 2 ? `www.${clean}` : '');
  if (alternate) {
    try {
      await setDoc(doc(db, SITE_DOMAINS, alternate), payload, { merge: true });
    } catch {}
  }

  if (prevFunnelId && updates.funnelId !== undefined && prevFunnelId !== updates.funnelId) {
    try {
      await setDoc(doc(db, PUBLISHED_SITES, prevFunnelId), {
        domain: '',
        domainStatus: '',
        updatedAt: now
      }, { merge: true });
    } catch {}
  }
  if (updates.funnelId) {
    try {
      await setDoc(doc(db, PUBLISHED_SITES, updates.funnelId), {
        domain: clean,
        domainStatus: (updates.status || 'connected').toLowerCase(),
        updatedAt: now
      }, { merge: true });
    } catch {}
  }
}

export async function deleteSiteDomain(
  host: string,
  extra: { funnelId?: string; tenantId?: string } = {}
): Promise<void> {
  const clean = normalizeHost(host);
  if (!clean) return;

  try {
    await callBackend('verifyDomain', { host: clean, delete: true, ...extra });
  } catch {
    try {
      await fetch('/api/sites/verify-domain?action=delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: clean, delete: true, ...extra })
      });
    } catch {}
  }

  await deleteDoc(doc(db, SITE_DOMAINS, clean));

  const alternate = clean.startsWith('www.')
    ? clean.replace(/^www\./, '')
    : (clean.split('.').length === 2 ? `www.${clean}` : '');
  if (alternate) {
    try {
      await deleteDoc(doc(db, SITE_DOMAINS, alternate));
    } catch {}
  }

  if (extra.funnelId) {
    try {
      await setDoc(doc(db, PUBLISHED_SITES, extra.funnelId), {
        domain: '',
        domainStatus: '',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch {}
  }
}

export async function toggleSiteDomainStatus(
  host: string,
  currentStatus: string,
  funnelId?: string
): Promise<'Connected' | 'Disconnected'> {
  const clean = normalizeHost(host);
  if (!clean) return 'Disconnected';

  const isCurrentlyActive = currentStatus === 'Connected';
  const newStatus: 'Connected' | 'Disconnected' = isCurrentlyActive ? 'Disconnected' : 'Connected';
  const firestoreStatus = isCurrentlyActive ? 'disconnected' : 'connected';
  const sslStatus = isCurrentlyActive ? 'Inactive' : 'Active';
  const now = new Date().toISOString();

  await setDoc(doc(db, SITE_DOMAINS, clean), {
    status: firestoreStatus,
    ssl: sslStatus,
    updatedAt: now
  }, { merge: true });

  const alternate = clean.startsWith('www.')
    ? clean.replace(/^www\./, '')
    : (clean.split('.').length === 2 ? `www.${clean}` : '');
  if (alternate) {
    try {
      await setDoc(doc(db, SITE_DOMAINS, alternate), {
        status: firestoreStatus,
        ssl: sslStatus,
        updatedAt: now
      }, { merge: true });
    } catch {}
  }

  if (funnelId) {
    try {
      await setDoc(doc(db, PUBLISHED_SITES, funnelId), {
        domainStatus: firestoreStatus,
        updatedAt: now
      }, { merge: true });
    } catch {}
  }

  return newStatus;
}

export async function syncAssetToPublishedSites(asset: Asset, ownerUid = ''): Promise<void> {
  if (!asset?.id) return;
  const steps = (asset.document?.pages || []).map((page, idx) => ({
    id: page.id,
    name: page.name || 'Page',
    path: page.path || (idx === 0 ? '/' : `/page-${idx + 1}`),
    published: true,
    publishedAt: new Date().toISOString(),
    publishedCanvas: page.sections || [],
    publishedPage: page
  }));

  await setDoc(doc(db, PUBLISHED_SITES, asset.id), encodeFirestoreValue({
    ownerUid: ownerUid || '',
    kind: asset.kind || 'funnel',
    funnelId: asset.id,
    name: asset.name || '',
    domain: normalizeHost(asset.domain),
    domainStatus: asset.domain ? 'connected' : '',
    defaultStepIdx: 0,
    steps,
    settings: asset.settings || {},
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

export function mapFirestoreDomainToModel(id: string, data: any): Domain {
  const statusStr = String(data.status || 'Pending').toLowerCase();
  const status: 'Connected' | 'Pending' | 'Disconnected' =
    statusStr === 'connected' ? 'Connected' :
    statusStr === 'disconnected' ? 'Disconnected' : 'Pending';

  const sslStr = String(data.ssl || '').toLowerCase();
  const ssl: 'Active' | 'Not configured' | 'Inactive' =
    sslStr === 'active' || status === 'Connected' ? 'Active' :
    status === 'Disconnected' ? 'Inactive' : 'Not configured';

  const cleanId = String(id || data.host || data.name || '').trim();
  return {
    id: cleanId || crypto.randomUUID(),
    name: data.host || data.name || id || 'domain',
    assetId: data.funnelId || data.assetId || '',
    status,
    ssl,
    default: Boolean(data.default),
    checkedAt: data.checkedAt,
    issues: status === 'Connected' ? [] : ['Point DNS to cname.vercel-dns.com or 76.76.21.21']
  };
}
