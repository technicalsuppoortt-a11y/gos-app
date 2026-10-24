import { promises as dns } from 'node:dns';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { applicationDefault } from 'firebase-admin/app';

const EXPECTED_A_IPS = [
  process.env.SITES_A_RECORD_IP,
  process.env.NEXT_PUBLIC_SITES_A_RECORD_IP,
  '76.76.21.21',
  '216.150.1.1'
].filter(Boolean);

export function normalizeHost(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

export function isPlatformHostname(host) {
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
  const extras = String(process.env.APP_HOSTS || process.env.NEXT_PUBLIC_APP_HOSTS || '')
    .split(',')
    .map(item => normalizeHost(item))
    .filter(Boolean);
  return extras.includes(clean);
}

export function expectedTargets() {
  const raw = [
    process.env.NEXT_PUBLIC_SITES_CNAME,
    process.env.SITES_CNAME_TARGET,
    'cname.vercel-dns.com'
  ].filter(Boolean);
  return raw.map(item => normalizeHost(item));
}

function recordMatches(value, targets) {
  const host = normalizeHost(value);
  if (!host) return false;
  if (host.includes('vercel-dns.com')) return true;
  return targets.some(target => host === target || host.endsWith(`.${target}`));
}

function getVercelQuery() {
  const teamId = process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID;
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
}

export async function addDomainToVercel(domainName) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    return { configured: false, reason: 'Missing VERCEL_TOKEN or VERCEL_PROJECT_ID environment variables' };
  }
  const query = getVercelQuery();
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${query}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: domainName })
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function removeDomainFromVercel(domainName) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  const query = getVercelQuery();
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domainName)}${query}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

export async function addDomainToFirebaseAuth(domainName, projectId = 'gos-app-3c7fb') {
  try {
    const clean = normalizeHost(domainName);
    if (!clean) return { ok: false };

    // Identity Toolkit Admin API to update authorizedDomains
    const token = (await applicationDefault().getAccessToken()).access_token;
    if (!token) return { ok: false, reason: 'No access token available' };

    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: await res.text() };
    }
    const data = await res.json();
    const currentDomains = data?.authorizedDomains || [];

    const set = new Set(currentDomains.map(d => d.toLowerCase()));
    set.add(clean);
    if (clean.startsWith('www.')) {
      set.add(clean.replace(/^www\./, ''));
    } else if (clean.split('.').length === 2) {
      set.add(`www.${clean}`);
    }

    const nextDomains = Array.from(set);
    if (nextDomains.length === currentDomains.length) {
      return { ok: true, alreadyAuthorized: true };
    }

    const patchUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=authorizedDomains`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ authorizedDomains: nextDomains })
    });
    return { ok: patchRes.ok, added: clean };
  } catch (err) {
    console.warn('[domain-verification] Could not add domain to Firebase Auth authorizedDomains:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function removeDomainFromFirebaseAuth(domainName, projectId = 'gos-app-3c7fb') {
  try {
    const clean = normalizeHost(domainName);
    if (!clean) return { ok: false };

    const token = (await applicationDefault().getAccessToken()).access_token;
    if (!token) return { ok: false, reason: 'No access token available' };

    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    const currentDomains = data?.authorizedDomains || [];

    const toRemove = new Set([clean]);
    if (clean.startsWith('www.')) toRemove.add(clean.replace(/^www\./, ''));
    else toRemove.add(`www.${clean}`);

    const nextDomains = currentDomains.filter(d => !toRemove.has(d.toLowerCase()));
    if (nextDomains.length === currentDomains.length) return { ok: true };

    const patchUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=authorizedDomains`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ authorizedDomains: nextDomains })
    });
    return { ok: true, removed: clean };
  } catch (err) {
    console.warn('[domain-verification] Could not remove domain from Firebase Auth authorizedDomains:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function verifyDomainDns(host) {
  const clean = normalizeHost(host);
  if (!clean || !clean.includes('.')) {
    throw new Error('Enter a valid domain like www.yourbrand.com or yourbrand.com');
  }

  const targets = expectedTargets();
  let cnames = [];
  let aRecords = [];

  try {
    cnames = await dns.resolveCname(clean);
  } catch {
    cnames = [];
  }

  try {
    aRecords = await dns.resolve4(clean);
  } catch {
    aRecords = [];
  }

  const cnameMatched = cnames.some(value => recordMatches(value, targets));
  const aRecordMatched = aRecords.some(ip => EXPECTED_A_IPS.includes(ip));
  const matched = cnameMatched || aRecordMatched;
  const matchedType = cnameMatched ? 'cname' : (aRecordMatched ? 'a' : null);

  return {
    host: clean,
    matched,
    matchedType,
    cnames: cnames.map(value => normalizeHost(value)),
    aRecords,
    targets,
    expectedIps: EXPECTED_A_IPS
  };
}

export async function verifyAndProvisionDomain(host, { db, ownerUid = '', funnelId = '', tenantId = '' }) {
  const clean = normalizeHost(host);
  const dnsResult = await verifyDomainDns(clean);

  // Auto-provision on Vercel
  let vercel = null;
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
    vercel = await addDomainToVercel(clean);
    const parts = clean.split('.');
    if (parts.length === 2) {
      await addDomainToVercel(`www.${clean}`).catch(() => {});
    } else if (parts.length === 3 && parts[0] === 'www') {
      await addDomainToVercel(parts.slice(1).join('.')).catch(() => {});
    }
  } else {
    vercel = { configured: false, reason: 'VERCEL_TOKEN and VERCEL_PROJECT_ID not set in env' };
  }

  // Auto-whitelist in Firebase Auth
  const firebaseAuth = await addDomainToFirebaseAuth(clean);

  // Update site_domains in Firestore
  const now = new Date().toISOString();
  const nextStatus = dnsResult.matched ? 'connected' : 'pending';
  const sslStatus = dnsResult.matched ? 'Active' : 'Not configured';

  const domainData = {
    host: clean,
    name: clean,
    status: nextStatus,
    ssl: sslStatus,
    checkedAt: now,
    updatedAt: now,
    matchedType: dnsResult.matchedType,
    cnames: dnsResult.cnames,
    aRecords: dnsResult.aRecords
  };
  if (funnelId) domainData.funnelId = funnelId;
  if (ownerUid) domainData.ownerUid = ownerUid;
  if (tenantId) domainData.tenantId = tenantId;

  await db.collection('site_domains').doc(clean).set(domainData, { merge: true });

  // Alternate (www. / apex)
  const alternate = clean.startsWith('www.')
    ? clean.replace(/^www\./, '')
    : (clean.split('.').length === 2 ? `www.${clean}` : '');

  if (alternate) {
    try {
      await db.collection('site_domains').doc(alternate).set({
        ...domainData,
        host: alternate,
        name: alternate
      }, { merge: true });
    } catch {}
  }

  // Sync with published_sites if funnelId is known
  if (funnelId) {
    try {
      await db.collection('published_sites').doc(funnelId).set({
        domain: clean,
        domainStatus: nextStatus,
        updatedAt: now
      }, { merge: true });
    } catch {}
  }

  // Sync with tenant's domain record if tenantId is available
  if (tenantId) {
    try {
      const tenantDomainQuery = await db.collection('tenants').doc(tenantId).collection('domains').where('name', '==', clean).get();
      if (!tenantDomainQuery.empty) {
        for (const doc of tenantDomainQuery.docs) {
          await doc.ref.set({
            status: dnsResult.matched ? 'Connected' : 'Pending',
            ssl: sslStatus,
            checkedAt: now,
            issues: dnsResult.matched ? [] : ['Waiting for DNS propagation. Points to cname.vercel-dns.com or 76.76.21.21']
          }, { merge: true });
        }
      }
    } catch {}
  }

  return {
    ok: true,
    ...dnsResult,
    vercel,
    firebaseAuth,
    status: nextStatus,
    ssl: sslStatus
  };
}

export async function disconnectSiteDomain(host, { db, funnelId = '', tenantId = '' }) {
  const clean = normalizeHost(host);
  if (!clean) return { ok: false, error: 'Missing host' };

  const vercel = await removeDomainFromVercel(clean);
  const firebaseAuth = await removeDomainFromFirebaseAuth(clean);

  // Update site_domains
  const now = new Date().toISOString();
  try {
    await db.collection('site_domains').doc(clean).set({
      status: 'disconnected',
      updatedAt: now
    }, { merge: true });
  } catch {}

  const alternate = clean.startsWith('www.')
    ? clean.replace(/^www\./, '')
    : (clean.split('.').length === 2 ? `www.${clean}` : '');
  if (alternate) {
    try {
      await db.collection('site_domains').doc(alternate).set({
        status: 'disconnected',
        updatedAt: now
      }, { merge: true });
    } catch {}
  }

  if (funnelId) {
    try {
      await db.collection('published_sites').doc(funnelId).set({
        domain: '',
        domainStatus: '',
        updatedAt: now
      }, { merge: true });
    } catch {}
  }

  if (tenantId) {
    try {
      const tenantDomainQuery = await db.collection('tenants').doc(tenantId).collection('domains').where('name', '==', clean).get();
      for (const doc of tenantDomainQuery.docs) {
        await doc.ref.set({
          status: 'Disconnected',
          ssl: 'Not configured',
          updatedAt: now
        }, { merge: true });
      }
    } catch {}
  }

  return { ok: true, host: clean, vercel, firebaseAuth };
}
