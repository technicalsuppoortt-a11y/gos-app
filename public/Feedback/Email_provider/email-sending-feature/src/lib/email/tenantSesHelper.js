import crypto from 'crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function isValidEmailAddress(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

export function cleanDomain(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0];
}

export function isValidDomainName(domain) {
  return DOMAIN_RE.test(cleanDomain(domain));
}

export function hasAwsSesApiCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SES_SECRET_ACCESS_KEY;
  return Boolean(accessKeyId && secretAccessKey);
}

export function generateDeterministicDkimTokens() {
  return [];
}

/**
 * Get accurate UTC Date for AWS SigV4 even if the local Windows clock is skewed
 */
async function getAccurateUtcDate(host) {
  try {
    const res = await fetch(`https://${host}`, { method: 'HEAD', cache: 'no-store' });
    const serverDateStr = res.headers.get('date');
    if (serverDateStr) {
      const parsed = new Date(serverDateStr);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch {
    // Fallback to local clock if HEAD fails
  }
  return new Date();
}

/**
 * Build the required DNS records for a customer's custom domain on AWS SES
 * using the REAL DKIM tokens returned by AWS SES v2 API.
 */
export function buildRequiredDnsRecords(domain, dkimTokens = []) {
  const clean = cleanDomain(domain);
  const tokens = Array.isArray(dkimTokens) ? dkimTokens.filter(Boolean) : [];

  const records = tokens.map((token, idx) => ({
    id: `dkim_${idx + 1}`,
    type: 'CNAME',
    host: `${token}._domainkey`,
    fullHost: `${token}._domainkey.${clean}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: `AWS SES DKIM Signature #${idx + 1}`,
    ttl: '1799'
  }));

  records.push({
    id: 'spf',
    type: 'TXT',
    host: '@',
    fullHost: clean,
    value: 'v=spf1 include:amazonses.com ~all',
    purpose: 'AWS SES SPF Authorization',
    ttl: '1799'
  });

  return records;
}

/**
 * AWS SES v2 REST API call using native Node crypto SigV4 + accurate server UTC time.
 * Requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in environment variables.
 */
export async function callAwsSesV2({ method = 'GET', path, bodyObj = null }) {
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || process.env.SES_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || process.env.SES_SECRET_ACCESS_KEY || '').trim();
  if (!accessKeyId || !secretAccessKey) {
    return {
      configured: false,
      ok: false,
      error: 'Missing AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local'
    };
  }

  const smtpHost = process.env.SMTP_HOST || 'email-smtp.eu-north-1.amazonaws.com';
  const regionMatch = smtpHost.match(/email-smtp\.([a-z0-9-]+)\.amazonaws\.com/i);
  const region = (process.env.AWS_REGION || process.env.SES_REGION || (regionMatch ? regionMatch[1] : 'eu-north-1')).trim();
  const host = `email.${region}.amazonaws.com`;
  const service = 'ses';
  const endpoint = `https://${host}${path}`;
  const body = bodyObj ? JSON.stringify(bodyObj) : '';

  const now = await getAccurateUtcDate(host);
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = [
    method,
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')
  ].join('\n');

  const sign = (key, msg) => crypto.createHmac('sha256', key).update(msg, 'utf8').digest();
  const kDate = sign(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = sign(kDate, region);
  const kService = sign(kRegion, service);
  const kSigning = sign(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzDate,
        Authorization: authorizationHeader
      },
      ...(body ? { body } : {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        configured: true,
        ok: false,
        status: res.status,
        data,
        error: data?.message || data?.Message || `AWS SES API error (${res.status})`
      };
    }
    return { configured: true, ok: true, status: res.status, data };
  } catch (err) {
    return { configured: true, ok: false, error: err.message };
  }
}

/**
 * List all registered Email & Domain Identities from AWS SES v2 (EU-NORTH-1)
 */
export async function listAwsSesIdentities() {
  const res = await callAwsSesV2({
    method: 'GET',
    path: '/v2/email/identities'
  });
  if (!res.configured || !res.ok) {
    return {
      ok: false,
      identities: [],
      error: res.error || null
    };
  }
  const rawList = Array.isArray(res.data?.EmailIdentities) ? res.data.EmailIdentities : [];
  const identities = rawList.map((item) => ({
    name: item.IdentityName || '',
    type: item.IdentityType || (String(item.IdentityName || '').includes('@') ? 'EMAIL_ADDRESS' : 'DOMAIN'),
    sendingEnabled: Boolean(item.SendingEnabled),
    status: item.VerificationStatus || 'PENDING',
    verified: item.VerificationStatus === 'SUCCESS' || item.SendingEnabled === true
  }));
  return {
    ok: true,
    identities
  };
}

/**
 * Register or check a single Email Address Identity in AWS SES (e.g. info@brand.com or user@gmail.com)
 * AWS SES automatically sends a verification link email to that address when created.
 */
export async function ensureAndVerifyTenantEmailAddress(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!isValidEmailAddress(email)) {
    throw new Error('Please enter a valid email address');
  }

  const getRes = await callAwsSesV2({
    method: 'GET',
    path: `/v2/email/identities/${encodeURIComponent(email)}`
  });

  if (!getRes.configured) {
    throw new Error(
      'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required in .env.local to register customer emails/domains in AWS SES.'
    );
  }

  if (getRes.ok && getRes.data) {
    const verified = getRes.data.VerifiedForSendingStatus === true;
    // If not verified yet, delete and recreate so AWS SES re-sends the verification email
    if (!verified) {
      await callAwsSesV2({
        method: 'DELETE',
        path: `/v2/email/identities/${encodeURIComponent(email)}`
      });
      await callAwsSesV2({
        method: 'POST',
        path: '/v2/email/identities',
        bodyObj: { EmailIdentity: email }
      });
    }
    return {
      email,
      emailVerified: verified,
      verificationEmailSent: !verified
    };
  }

  if (getRes.status === 404) {
    const createRes = await callAwsSesV2({
      method: 'POST',
      path: '/v2/email/identities',
      bodyObj: { EmailIdentity: email }
    });
    if (!createRes.ok) {
      throw new Error(createRes.error || 'Failed to register email identity in AWS SES');
    }
    return {
      email,
      emailVerified: false,
      verificationEmailSent: true
    };
  }

  throw new Error(getRes.error || 'Failed to check email identity in AWS SES');
}

/**
 * Create or inspect AWS SES Domain Identity + Check Live DNS via Cloudflare DoH
 */
export async function ensureAndVerifyTenantDomain(uid, rawDomain) {
  const domain = cleanDomain(rawDomain);
  if (!isValidDomainName(domain)) {
    throw new Error('Invalid domain name');
  }

  const getRes = await callAwsSesV2({
    method: 'GET',
    path: `/v2/email/identities/${encodeURIComponent(domain)}`
  });

  if (!getRes.configured) {
    throw new Error(
      'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required in .env.local so UpKlick can register your domain in AWS SES and fetch real DKIM records.'
    );
  }

  let dkimTokens = [];
  let sesVerified = false;
  let dkimStatus = 'PENDING';

  if (getRes.ok && getRes.data) {
    const tokens = getRes.data?.DkimAttributes?.Tokens;
    if (Array.isArray(tokens) && tokens.length > 0) {
      dkimTokens = tokens;
    }
    dkimStatus = getRes.data?.DkimAttributes?.Status || 'PENDING';
    sesVerified =
      getRes.data?.VerifiedForSendingStatus === true ||
      dkimStatus === 'SUCCESS';
  } else if (getRes.status === 404) {
    const createRes = await callAwsSesV2({
      method: 'POST',
      path: '/v2/email/identities',
      bodyObj: { EmailIdentity: domain }
    });
    if (!createRes.ok) {
      throw new Error(createRes.error || 'Failed to create domain identity in AWS SES');
    }
    if (Array.isArray(createRes.data?.DkimAttributes?.Tokens)) {
      dkimTokens = createRes.data.DkimAttributes.Tokens;
    }
    dkimStatus = createRes.data?.DkimAttributes?.Status || 'PENDING';
  } else {
    throw new Error(getRes.error || 'Failed to query AWS SES domain identity');
  }

  const requiredRecords = buildRequiredDnsRecords(domain, dkimTokens);

  // Check live DNS records via Cloudflare DoH so customer sees real-time propagation status
  const verifiedRecords = await Promise.all(
    requiredRecords.map(async (rec) => {
      try {
        const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(rec.fullHost)}&type=${encodeURIComponent(rec.type)}`;
        const res = await fetch(url, {
          headers: { Accept: 'application/dns-json' },
          cache: 'no-store'
        });
        const data = await res.json().catch(() => ({}));
        const answers = Array.isArray(data?.Answer) ? data.Answer : [];
        const matched = answers.some((ans) => {
          const val = String(ans.data || '').replace(/^"|"$/g, '').replace(/\.$/, '').trim().toLowerCase();
          const expected = rec.value.replace(/\.$/, '').trim().toLowerCase();
          if (rec.id === 'spf') {
            return val.includes('amazonses.com');
          }
          return val === expected || val.includes(expected);
        });
        return { ...rec, verified: matched };
      } catch {
        return { ...rec, verified: false };
      }
    })
  );

  return {
    domain,
    dkimTokens,
    dkimStatus,
    domainVerified: sesVerified,
    sesIdentityVerified: sesVerified,
    records: verifiedRecords
  };
}

/**
 * Normalize stored customer email provider settings
 * NEVER uses @upklick.net for customer sender emails.
 */
export function normalizeEmailProviderSettings(raw = {}, userFallback = {}) {
  const defaultSenderName =
    raw.senderName ||
    userFallback.businessName ||
    userFallback.displayName ||
    userFallback.name ||
    'My Brand';

  const defaultReplyTo =
    raw.replyToEmail ||
    userFallback.email ||
    '';

  const mode = raw.mode === 'email_identity' ? 'email_identity' : 'custom_domain';
  const customDomain = cleanDomain(raw.customDomain || '');
  const customFromLocal = String(raw.customFromLocal || 'hello')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '') || 'hello';

  const verifiedSenderEmail = String(raw.verifiedSenderEmail || defaultReplyTo || '').trim().toLowerCase();

  const customFromEmail =
    mode === 'email_identity'
      ? verifiedSenderEmail
      : customDomain
        ? `${customFromLocal}@${customDomain}`
        : verifiedSenderEmail;

  return {
    enabled: raw.enabled !== false,
    mode,
    senderName: String(defaultSenderName).trim().slice(0, 80),
    replyToEmail: isValidEmailAddress(defaultReplyTo) ? String(defaultReplyTo).trim() : '',
    verifiedSenderEmail: isValidEmailAddress(verifiedSenderEmail) ? verifiedSenderEmail : '',
    emailIdentityVerified: Boolean(raw.emailIdentityVerified),
    customDomain,
    customFromLocal,
    customFromEmail,
    brandLogoUrl: String(raw.brandLogoUrl || '').trim(),
    footerText: String(raw.footerText || '').trim().slice(0, 240),
    domainVerified: Boolean(raw.domainVerified),
    sesIdentityVerified: Boolean(raw.sesIdentityVerified),
    dkimTokens: Array.isArray(raw.dkimTokens) ? raw.dkimTokens : [],
    records: Array.isArray(raw.records) ? raw.records : [],
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

/**
 * Resolve effective sender parameters when dispatching an email for a customer.
 * Strictly uses the customer's OWN domain or verified email address — NEVER @upklick.net.
 */
export function resolveTenantSenderIdentity(settings = {}, overrides = {}) {
  const senderName = String(overrides.fromName || settings.senderName || 'My Brand').trim();
  const fromEmail = String(
    overrides.fromEmail ||
      settings.customFromEmail ||
      settings.verifiedSenderEmail ||
      settings.replyToEmail ||
      ''
  )
    .trim()
    .toLowerCase();

  const replyTo = String(overrides.replyTo || settings.replyToEmail || fromEmail).trim();

  return {
    fromName: senderName,
    fromEmail,
    replyTo: isValidEmailAddress(replyTo) ? replyTo : undefined,
    brandName: senderName,
    brandLogoUrl: settings.brandLogoUrl || undefined,
    footerText:
      settings.footerText ||
      `© ${new Date().getFullYear()} ${senderName}. All rights reserved.`,
    mode: settings.mode || 'custom_domain',
    displayFrom: fromEmail ? `"${senderName}" <${fromEmail}>` : senderName
  };
}
