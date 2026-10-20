import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

export const hostingSiteId = (tenantId, assetId) => `gos-${createHash('sha256').update(`${tenantId}/${assetId}`).digest('hex').slice(0, 24)}`;
export function normalizePagePath(path) {
  if (typeof path !== 'string' || !/^\/(?:[a-z0-9_-]+\/?)*$/i.test(path)) throw new Error('Every page needs a valid URL path beginning with /.');
  return path.replace(/\/+$/, '') || '/';
}
export function buildPublicationFiles(asset, template, appOrigin) {
  if (!template.includes('id="gos-publication-data"') || !template.includes('type="module"')) throw new Error('Deploy the published-page frontend entry before publishing assets.');
  const origin = new URL(appOrigin).origin;
  if (!origin.startsWith('https://')) throw new Error('Configure a secure application origin.');
  const pages = asset.document?.pages;
  if (!Array.isArray(pages) || !pages.length || pages.length > 100) throw new Error('Publish between 1 and 100 pages.');
  const paths = new Set(), ids = new Set();
  function resolveMedia(value, key = '') {
    if (Array.isArray(value)) return value.map(item => resolveMedia(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, resolveMedia(item, field)]));
    if (typeof value === 'string' && /^(src|image|featuredImage|avatar|logo|videoUrl)$/.test(key) && value.startsWith('/') && !value.startsWith('//')) return origin + value;
    if (typeof value === 'string' && ['images', 'testimonials', 'items'].includes(key)) {
      try { return JSON.stringify(resolveMedia(JSON.parse(value))); } catch { /* Plain text remains plain text. */ }
    }
    return value;
  }
  const publicAsset = resolveMedia({ id: asset.id, kind: asset.kind, name: asset.name, image: asset.image, domain: asset.domain ?? '', settings: asset.settings, document: asset.document });
  const files = {};
  for (const page of pages) {
    const path = normalizePagePath(page.path);
    if (paths.has(path) || ids.has(page.id)) throw new Error('Pages must have unique IDs and URL paths.');
    paths.add(path); ids.add(page.id);
    const data = JSON.stringify({ asset: publicAsset, pageId: page.id }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    const html = template.replace(/<script id="gos-publication-data" type="application\/json">[\s\S]*?<\/script>/, () => `<script id="gos-publication-data" type="application/json">${data}</script>`)
      .replace('<head>', `<head><base href="${origin}/">`)
      .replace(/\b(src|href)="\/assets\//g, `$1="${origin}/assets/`)
      .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHTML(page.seoTitle || page.name || asset.name)}</title>`)
      .replace('</head>', `<meta name="description" content="${escapeHTML(page.seoDescription || '')}">${page.noIndex ? '<meta name="robots" content="noindex">' : ''}</head>`);
    files[path === '/' ? '/index.html' : `${path}/index.html`] = html;
  }
  const flow = asset.document.funnel?.pagesFlow ?? [];
  if (flow.some(id => !ids.has(id)) || (asset.document.steps ?? []).some(step => !ids.has(step.pageId))) throw new Error('The funnel contains a step linked to a missing page.');
  if (!files['/index.html']) {
    const first = pages.find(page => page.id === flow[0]) ?? pages[0];
    files['/index.html'] = files[`${normalizePagePath(first.path)}/index.html`];
  }
  return files;
}
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function domainVerification(domain) {
  const sslActive = ['CERT_ACTIVE', 'CERT_EXPIRING_SOON'].includes(domain.cert?.state);
  const connected = domain.hostState === 'HOST_ACTIVE' && domain.ownershipState === 'OWNERSHIP_ACTIVE' && sslActive && !domain.deleteTime;
  return {
    status: connected ? 'Connected' : domain.deleteTime ? 'Disconnected' : 'Pending',
    ssl: sslActive ? 'Active' : domain.cert?.state === 'CERT_EXPIRED' ? 'Inactive' : 'Not configured',
    hostState: domain.hostState ?? '', ownershipState: domain.ownershipState ?? '', certificateState: domain.cert?.state ?? '',
    dnsRecords: (domain.requiredDnsUpdates?.desired ?? []).flatMap(set => set.records ?? []),
    issues: (domain.issues ?? []).map(issue => String(issue.message ?? 'DNS verification pending')),
    checkedAt: domain.requiredDnsUpdates?.checkTime ?? new Date().toISOString(),
  };
}

export function createHostingClient({ token, projectId, fetcher = fetch }) {
  const base = 'https://firebasehosting.googleapis.com/v1beta1';
  async function api(path, method = 'GET', body) {
    const response = await fetcher(`${base}/${path}`, { method, headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(response.status === 403 ? 'Firebase Hosting access was denied. Grant the functions service account Firebase Hosting Admin access.' : result.error?.message || `Firebase Hosting request failed (${response.status}).`);
      error.status = response.status; throw error;
    }
    return result;
  }
  return {
    api,
    async ensureSite(siteId) {
      try { return await api(`projects/${projectId}/sites/${siteId}`); }
      catch (error) { if (error.status !== 404) throw error; }
      try { return await api(`projects/${projectId}/sites?siteId=${encodeURIComponent(siteId)}`, 'POST', {}); }
      catch (error) { if (error.status !== 409) throw error; return api(`projects/${projectId}/sites/${siteId}`); }
    },
    async deploy(siteId, files) {
      const version = await api(`sites/${siteId}/versions`, 'POST', { config: { cleanUrls: true, trailingSlashBehavior: 'REMOVE', headers: [{ glob: '**', headers: { 'Cache-Control': 'no-cache' } }] } });
      if (!new RegExp(`^sites/${siteId}/versions/[\\w-]+$`).test(version.name ?? '')) throw new Error('Firebase Hosting returned an invalid version.');
      const blobs = new Map(), hashes = {};
      for (const [path, content] of Object.entries(files)) {
        const bytes = gzipSync(Buffer.from(content));
        const hash = createHash('sha256').update(bytes).digest('hex');
        hashes[path] = hash; blobs.set(hash, bytes);
      }
      const upload = await api(`${version.name}:populateFiles`, 'POST', { files: hashes });
      const url = new URL(upload.uploadUrl);
      if (url.origin !== 'https://upload-firebasehosting.googleapis.com') throw new Error('Firebase Hosting returned an invalid upload destination.');
      for (const hash of upload.uploadRequiredHashes ?? []) {
        if (!blobs.has(hash)) throw new Error('Firebase Hosting requested an unknown file.');
        const response = await fetcher(`${upload.uploadUrl}/${hash}`, { method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/octet-stream' }, signal: AbortSignal.timeout(60000), body: blobs.get(hash) });
        if (!response.ok) throw new Error('A published file could not be uploaded.');
      }
      await api(`${version.name}?updateMask=status`, 'PATCH', { status: 'FINALIZED' });
      const release = await api(`sites/${siteId}/releases?versionName=${encodeURIComponent(version.name)}`, 'POST', {});
      return { version: version.name, release: release.name, url: `https://${siteId}.web.app` };
    },
    async connectDomain(siteId, name) {
      const path = `projects/${projectId}/sites/${siteId}/customDomains/${name}`;
      try { return await api(path); }
      catch (error) { if (error.status !== 404) throw error; }
      const operation = await api(`projects/${projectId}/sites/${siteId}/customDomains?customDomainId=${encodeURIComponent(name)}`, 'POST', {});
      if (operation.error) throw new Error(operation.error.message || 'Domain provisioning failed.');
      if (operation.done && operation.response) return operation.response;
      try { return await api(path); }
      catch (error) { if (error.status !== 404) throw error; return { name: path, reconciling: true }; }
    },
    getDomain: (siteId, name) => api(`projects/${projectId}/sites/${siteId}/customDomains/${name}`),
    async deleteSite(siteId) {
      try { await api(`projects/${projectId}/sites/${siteId}`, 'DELETE'); }
      catch (error) { if (error.status !== 404) throw error; }
    },
  };
}
