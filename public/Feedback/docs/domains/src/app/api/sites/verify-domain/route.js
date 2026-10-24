import { NextResponse } from 'next/server';
import { promises as dns } from 'dns';
import { normalizeHost } from '@/lib/sites/publicSite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_A_IPS = [
  process.env.SITES_A_RECORD_IP,
  process.env.NEXT_PUBLIC_SITES_A_RECORD_IP,
  '76.76.21.21',
  '216.150.1.1'
].filter(Boolean);

function expectedTargets() {
  const raw = [
    process.env.NEXT_PUBLIC_SITES_CNAME,
    process.env.SITES_CNAME_TARGET,
    'cname.vercel-dns.com'
  ].filter(Boolean);
  return raw.map((item) => normalizeHost(item));
}

function recordMatches(value, targets) {
  const host = normalizeHost(value);
  if (!host) return false;
  if (host.includes('vercel-dns.com')) return true;
  return targets.some((target) => host === target || host.endsWith(`.${target}`));
}

function getVercelQuery() {
  const teamId = process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID;
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
}

async function addDomainToVercel(domainName) {
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    return { configured: false, reason: 'Missing VERCEL_TOKEN or VERCEL_PROJECT_ID environment variables' };
  }
  const query = getVercelQuery();
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID)}/domains${query}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
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

async function removeDomainFromVercel(domainName) {
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) return null;
  const query = getVercelQuery();
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID)}/domains/${encodeURIComponent(domainName)}${query}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
      }
    });
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function getGoogleAuthClient() {
  const { GoogleAuth } = await import('google-auth-library');
  let credentials = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {}
  }
  if (!credentials && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.FIREBASE_PROJECT_ID || 'upklick-software'
    };
  }
  if (!credentials) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const p = path.join(process.cwd(), 'upklick-software-firebase-adminsdk-fbsvc-7c8b04f04c.json');
      if (fs.existsSync(p)) {
        credentials = JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    } catch {}
  }
  const projectId = credentials?.project_id || process.env.FIREBASE_PROJECT_ID || 'upklick-software';
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  return { client, projectId };
}

async function addDomainToFirebaseAuth(domainName) {
  try {
    const { client, projectId } = await getGoogleAuthClient();
    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
    const res = await client.request({ url });
    const currentDomains = res?.data?.authorizedDomains || [];
    
    const clean = normalizeHost(domainName);
    if (!clean) return { ok: false };
    
    const set = new Set(currentDomains.map((d) => d.toLowerCase()));
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
    await client.request({
      url: patchUrl,
      method: 'PATCH',
      data: { authorizedDomains: nextDomains }
    });
    return { ok: true, added: clean };
  } catch (err) {
    console.warn('[verify-domain] Could not add domain to Firebase Auth authorizedDomains:', err.message);
    return { ok: false, error: err.message };
  }
}

async function removeDomainFromFirebaseAuth(domainName) {
  try {
    const { client, projectId } = await getGoogleAuthClient();
    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
    const res = await client.request({ url });
    const currentDomains = res?.data?.authorizedDomains || [];
    
    const clean = normalizeHost(domainName);
    if (!clean) return { ok: false };
    const toRemove = new Set([clean]);
    if (clean.startsWith('www.')) toRemove.add(clean.replace(/^www\./, ''));
    else toRemove.add(`www.${clean}`);
    
    const nextDomains = currentDomains.filter((d) => !toRemove.has(d.toLowerCase()));
    if (nextDomains.length === currentDomains.length) return { ok: true };
    
    const patchUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=authorizedDomains`;
    await client.request({
      url: patchUrl,
      method: 'PATCH',
      data: { authorizedDomains: nextDomains }
    });
    return { ok: true, removed: clean };
  } catch (err) {
    console.warn('[verify-domain] Could not remove domain from Firebase Auth authorizedDomains:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const host = normalizeHost(body?.host);
    if (!host || !host.includes('.')) {
      return NextResponse.json({ error: 'Enter a valid domain like www.yourbrand.com or yourbrand.com' }, { status: 400 });
    }

    const targets = expectedTargets();
    let cnames = [];
    let aRecords = [];

    try {
      cnames = await dns.resolveCname(host);
    } catch {
      cnames = [];
    }

    try {
      aRecords = await dns.resolve4(host);
    } catch {
      aRecords = [];
    }

    const cnameMatched = cnames.some((value) => recordMatches(value, targets));
    const aRecordMatched = aRecords.some((ip) => EXPECTED_A_IPS.includes(ip));
    const matched = cnameMatched || aRecordMatched;
    const matchedType = cnameMatched ? 'cname' : (aRecordMatched ? 'a' : null);

    // Auto-provision on Vercel
    let vercel = null;
    if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
      vercel = await addDomainToVercel(host);
      // If apex domain without www, also register www on Vercel
      const parts = host.split('.');
      if (parts.length === 2) {
        await addDomainToVercel(`www.${host}`).catch(() => {});
      } else if (parts.length === 3 && parts[0] === 'www') {
        await addDomainToVercel(parts.slice(1).join('.')).catch(() => {});
      }
    } else {
      vercel = { configured: false, reason: 'VERCEL_TOKEN and VERCEL_PROJECT_ID not set in env' };
    }

    // Auto-authorize in Firebase Authentication (OAuth / Redirect Domains)
    const firebaseAuth = await addDomainToFirebaseAuth(host);

    return NextResponse.json({
      ok: true,
      host,
      matched,
      matchedType,
      cnames: cnames.map((value) => normalizeHost(value)),
      aRecords,
      targets,
      expectedIps: EXPECTED_A_IPS,
      vercel,
      firebaseAuth
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not check DNS' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json();
    const host = normalizeHost(body?.host);
    if (!host) {
      return NextResponse.json({ error: 'Missing host' }, { status: 400 });
    }
    const vercel = await removeDomainFromVercel(host);
    const firebaseAuth = await removeDomainFromFirebaseAuth(host);
    return NextResponse.json({ ok: true, host, vercel, firebaseAuth });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not remove domain from Vercel' }, { status: 500 });
  }
}
