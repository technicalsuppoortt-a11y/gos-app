import dns from 'node:dns/promises';
import { randomUUID } from 'node:crypto';
import { attrMap, getAllTags, getTagBlocks, getApiStatus, getApiErrors, publicRegistrarError } from './xml.js';
import { DEFAULT_TLD_COSTS, roundMoney } from './constants.js';

export const REGISTRAR_CONFIG_PATH = 'domainRegistrarConfigurations/namecheap';

const ENDPOINTS = {
  sandbox: 'https://api.sandbox.namecheap.com/xml.response',
  production: 'https://api.namecheap.com/xml.response',
};

let cachedConfig = null;
let cachedConfigAt = 0;
const CONFIG_TTL_MS = 15_000;

export function invalidateRegistrarConfigCache() {
  cachedConfig = null;
  cachedConfigAt = 0;
}

function buildConfigObject(stored = {}) {
  const apiUser = String(stored.apiUser ?? process.env.NAMECHEAP_API_USER ?? '').trim();
  const apiKey = String(stored.apiKey ?? process.env.NAMECHEAP_API_KEY ?? '').trim();
  const userName = String(stored.userName ?? process.env.NAMECHEAP_USERNAME ?? apiUser).trim();
  const clientIp = String(stored.clientIp ?? process.env.NAMECHEAP_CLIENT_IP ?? '').trim();
  const envRaw = String(stored.environment ?? process.env.NAMECHEAP_ENVIRONMENT ?? 'sandbox').toLowerCase();
  const environment = envRaw === 'production' || envRaw === 'prod' ? 'production' : 'sandbox';
  const sandboxSimulation = Boolean(stored.sandboxSimulation);
  const liveConfigured = Boolean(apiUser && apiKey && clientIp);
  return {
    apiUser,
    apiKey,
    userName: userName || apiUser,
    clientIp,
    environment,
    endpoint: ENDPOINTS[environment],
    sandboxSimulation,
    liveConfigured,
    configured: liveConfigured || sandboxSimulation,
    defaultNameservers: Array.isArray(stored.defaultNameservers) && stored.defaultNameservers.length >= 2
      ? stored.defaultNameservers
      : ['dns1.registrar-servers.com', 'dns2.registrar-servers.com'],
    updatedAt: stored.updatedAt || null,
    updatedBy: stored.updatedBy || null,
  };
}

export async function getNamecheapConfig(db, { force = false, override = null } = {}) {
  if (override) {
    const base = db ? await getNamecheapConfig(db, { force }) : buildConfigObject({});
    return buildConfigObject({
      ...base,
      ...override,
      apiKey: override.apiKey ? override.apiKey : base.apiKey,
    });
  }
  if (!db) return buildConfigObject({});
  if (!force && cachedConfig && Date.now() - cachedConfigAt < CONFIG_TTL_MS) {
    return cachedConfig;
  }
  const snap = await db.doc(REGISTRAR_CONFIG_PATH).get();
  const cfg = buildConfigObject(snap.exists ? snap.data() : {});
  cachedConfig = cfg;
  cachedConfigAt = Date.now();
  return cfg;
}

export async function getRegistrarConfigSummary(db) {
  const cfg = await getNamecheapConfig(db, { force: true });
  return {
    provider: 'namecheap',
    apiUser: cfg.apiUser,
    userName: cfg.userName,
    clientIp: cfg.clientIp,
    environment: cfg.environment,
    sandboxSimulation: cfg.sandboxSimulation,
    liveConfigured: cfg.liveConfigured,
    configured: cfg.configured,
    hasApiKey: Boolean(cfg.apiKey),
    maskedApiKey: cfg.apiKey ? `••••••••${cfg.apiKey.slice(-4)}` : '',
    defaultNameservers: cfg.defaultNameservers,
    updatedAt: cfg.updatedAt,
  };
}

export async function saveRegistrarConfig(db, patch = {}, actorUid = '') {
  const snap = await db.doc(REGISTRAR_CONFIG_PATH).get();
  const prev = snap.exists ? snap.data() : {};
  const next = {
    provider: 'namecheap',
    apiUser: patch.apiUser !== undefined ? String(patch.apiUser).trim() : (prev.apiUser || ''),
    apiKey: patch.clearApiKey
      ? ''
      : (patch.apiKey && String(patch.apiKey).trim() ? String(patch.apiKey).trim() : (prev.apiKey || '')),
    userName: patch.userName !== undefined ? String(patch.userName).trim() : (prev.userName || ''),
    clientIp: patch.clientIp !== undefined ? String(patch.clientIp).trim() : (prev.clientIp || ''),
    environment: String(patch.environment ?? prev.environment ?? 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox',
    sandboxSimulation: patch.sandboxSimulation !== undefined ? Boolean(patch.sandboxSimulation) : Boolean(prev.sandboxSimulation),
    defaultNameservers: Array.isArray(patch.defaultNameservers)
      ? patch.defaultNameservers.map(s => String(s || '').trim().toLowerCase()).filter(Boolean)
      : (prev.defaultNameservers || ['dns1.registrar-servers.com', 'dns2.registrar-servers.com']),
    updatedAt: new Date().toISOString(),
    updatedBy: actorUid || prev.updatedBy || 'super_admin',
  };
  await db.doc(REGISTRAR_CONFIG_PATH).set(next, { merge: true });
  invalidateRegistrarConfigCache();
  return getRegistrarConfigSummary(db);
}

export class NamecheapError extends Error {
  constructor(message, { code = '', raw = '', publicMessage = '' } = {}) {
    super(message);
    this.name = 'NamecheapError';
    this.code = code;
    this.raw = raw;
    this.publicMessage = publicMessage || 'We could not complete the registrar request. Please try again.';
  }
}

async function callNamecheap(command, extra = {}, { db = null, cfg: providedCfg = null, fetcher = fetch, timeoutMs = 25000 } = {}) {
  const cfg = providedCfg || (await getNamecheapConfig(db));
  if (!cfg.liveConfigured) {
    throw new NamecheapError('Namecheap credentials are not configured', {
      code: 'not_configured',
      publicMessage: 'Domain service is temporarily unavailable. Registrar credentials are not configured.',
    });
  }

  const params = new URLSearchParams({
    ApiUser: cfg.apiUser,
    ApiKey: cfg.apiKey,
    UserName: cfg.userName,
    ClientIp: cfg.clientIp,
    Command: command,
  });
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let xml = '';
  try {
    const res = await fetcher(`${cfg.endpoint}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/xml, text/xml' },
    });
    xml = await res.text();
  } catch (err) {
    const timedOut = err?.name === 'AbortError';
    throw new NamecheapError(timedOut ? 'Namecheap request timed out' : (err?.message || 'Network error'), {
      code: timedOut ? 'timeout' : 'network',
      publicMessage: timedOut
        ? 'The registrar timed out. Please try again.'
        : 'Could not reach the domain registrar. Please try again shortly.',
    });
  } finally {
    clearTimeout(timer);
  }

  const status = getApiStatus(xml);
  if (status && status !== 'OK') {
    const errors = getApiErrors(xml);
    const first = errors[0] || { number: 'unknown', message: 'Registrar error' };
    const err = new NamecheapError(`[Namecheap ${first.number}] ${first.message}`, {
      code: first.number || 'registrar',
      raw: xml.slice(0, 4000),
      publicMessage: publicRegistrarError(errors),
    });
    err.errors = errors;
    throw err;
  }

  return xml;
}

const WELL_KNOWN_TAKEN = new Set([
  'google.com', 'facebook.com', 'apple.com', 'amazon.com', 'microsoft.com',
  'openai.com', 'github.com', 'youtube.com', 'instagram.com', 'whatsapp.com',
  'example.com', 'example.org', 'example.net', 'stripe.com', 'namecheap.com',
]);

async function checkDomainViaDns(domain) {
  const clean = String(domain || '').toLowerCase().trim();
  if (WELL_KNOWN_TAKEN.has(clean)) return false;
  try {
    const ns = await Promise.race([
      dns.resolveNs(clean),
      new Promise((_, reject) => setTimeout(() => reject(new Error('dns_timeout')), 2500)),
    ]);
    if (Array.isArray(ns) && ns.length > 0) return false;
  } catch (err) {
    const code = String(err?.code || '');
    if (code === 'ENOTFOUND' || code === 'ENODATA' || err?.message === 'dns_timeout') {
      return true;
    }
  }
  return true;
}

export const NamecheapService = {
  async isConfigured(db) {
    const cfg = await getNamecheapConfig(db);
    return cfg.configured;
  },

  async isLiveConfigured(db) {
    const cfg = await getNamecheapConfig(db);
    return cfg.liveConfigured;
  },

  async getEnvironment(db) {
    const cfg = await getNamecheapConfig(db);
    return cfg.sandboxSimulation && !cfg.liveConfigured ? 'simulation' : cfg.environment;
  },

  async testConnection(db, { override = null, fetcher = fetch } = {}) {
    const cfg = await getNamecheapConfig(db, { force: true, override });
    if (cfg.sandboxSimulation && !cfg.liveConfigured) {
      return {
        ok: true,
        mode: 'simulation',
        environment: 'sandbox',
        message: 'Sandbox simulation mode is active and ready for testing.',
      };
    }
    const xml = await callNamecheap(
      'namecheap.domains.check',
      { DomainList: 'example.com' },
      { cfg, fetcher, timeoutMs: 15000 }
    );
    const tags = getAllTags(xml, 'DomainCheckResult');
    return {
      ok: tags.length > 0 || getApiStatus(xml) === 'OK',
      mode: 'live',
      environment: cfg.environment,
      message: `Connected to Namecheap (${cfg.environment}) successfully.`,
    };
  },

  async checkDomainAvailability(domainList, { db = null, fetcher = fetch, allowDnsFallback = false } = {}) {
    const list = Array.isArray(domainList) ? domainList : [domainList];
    const cleaned = list.map(d => String(d || '').trim().toLowerCase()).filter(Boolean);
    if (!cleaned.length) return [];

    const cfg = await getNamecheapConfig(db);
    if (cfg.liveConfigured) {
      const xml = await callNamecheap(
        'namecheap.domains.check',
        { DomainList: cleaned.join(',') },
        { cfg, fetcher }
      );
      const tags = getAllTags(xml, 'DomainCheckResult');
      return tags.map(a => ({
        domain: (a.Domain || '').toLowerCase(),
        available: String(a.Available).toLowerCase() === 'true',
        isPremium: String(a.IsPremiumName).toLowerCase() === 'true',
        premiumRegistrationPrice: a.PremiumRegistrationPrice ? Number(a.PremiumRegistrationPrice) : null,
        premiumRenewalPrice: a.PremiumRenewalPrice ? Number(a.PremiumRenewalPrice) : null,
        premiumTransferPrice: a.PremiumTransferPrice ? Number(a.PremiumTransferPrice) : null,
        eapFee: a.EapFee ? Number(a.EapFee) : 0,
        description: a.Description || '',
        source: 'namecheap',
      }));
    }

    if (cfg.sandboxSimulation || allowDnsFallback) {
      // Also check already registered domains in Firestore so our own platform domains show taken!
      const ownedSet = new Set();
      if (db) {
        for (let i = 0; i < cleaned.length; i += 10) {
          const chunk = cleaned.slice(i, i + 10);
          const snap = await db.collection('domains').where('domain', 'in', chunk).get().catch(() => null);
          snap?.forEach(doc => {
            const d = doc.data();
            if (d?.domain && d?.status !== 'expired') ownedSet.add(String(d.domain).toLowerCase());
          });
        }
      }
      const checks = await Promise.all(
        cleaned.map(async domain => {
          const available = ownedSet.has(domain) ? false : await checkDomainViaDns(domain);
          return {
            domain,
            available,
            isPremium: false,
            premiumRegistrationPrice: null,
            premiumRenewalPrice: null,
            premiumTransferPrice: null,
            eapFee: 0,
            description: '',
            source: cfg.sandboxSimulation ? 'simulation' : 'dns_preview',
          };
        })
      );
      return checks;
    }

    throw new NamecheapError('Namecheap credentials are not configured', {
      code: 'not_configured',
      publicMessage: 'Domain search is not available yet. The registrar is not configured.',
    });
  },

  async getDomainPricing(tlds = [], { db = null, fetcher = fetch } = {}) {
    const cfg = await getNamecheapConfig(db);
    if (!cfg.liveConfigured) {
      if (cfg.sandboxSimulation) {
        const wanted = tlds.length ? tlds.map(t => t.toLowerCase()) : Object.keys(DEFAULT_TLD_COSTS);
        return wanted
          .filter(tld => DEFAULT_TLD_COSTS[tld])
          .map(tld => ({
            tld,
            register: DEFAULT_TLD_COSTS[tld].registrar_price,
            renew: DEFAULT_TLD_COSTS[tld].renewal_cost,
            transfer: DEFAULT_TLD_COSTS[tld].transfer_cost,
            currency: 'USD',
          }));
      }
      throw new NamecheapError('Namecheap live API credentials are required to sync wholesale costs.', {
        code: 'not_configured',
        publicMessage: 'Configure Namecheap API credentials first to sync live wholesale costs.',
      });
    }

    const xml = await callNamecheap(
      'namecheap.users.getPricing',
      { ProductType: 'DOMAIN' },
      { cfg, fetcher, timeoutMs: 35000 }
    );

    const wanted = new Set(tlds.map(t => t.toLowerCase()));
    const byTld = {};

    const categories = getTagBlocks(xml, 'ProductCategory');
    for (const cat of categories) {
      const catName = (cat.attrs.Name || '').toLowerCase();
      if (!['register', 'renew', 'transfer'].includes(catName)) continue;

      const products = getTagBlocks(cat.inner, 'Product');
      for (const prod of products) {
        const tld = (prod.attrs.Name || '').toLowerCase();
        if (!tld || (wanted.size && !wanted.has(tld))) continue;

        const prices = getAllTags(prod.inner, 'Price');
        const oneYear = prices.find(p => p.Duration === '1') || prices[0];
        if (!oneYear) continue;

        const cost = roundMoney(oneYear.YourPrice || oneYear.Price);
        if (!cost) continue;
        byTld[tld] = byTld[tld] || { tld, currency: oneYear.Currency || 'USD' };
        byTld[tld][catName] = cost;
      }
    }

    return Object.values(byTld);
  },

  async registerDomain({ domain, years = 1, contacts, nameservers = '', whoisGuard = true }, { db = null, fetcher = fetch } = {}) {
    const cfg = await getNamecheapConfig(db);
    if (!cfg.liveConfigured && cfg.sandboxSimulation) {
      const token = randomUUID().slice(0, 8).toUpperCase();
      return {
        registered: true,
        domain,
        chargedAmount: 0,
        domainID: `SIM-DOM-${token}`,
        orderID: `SIM-ORD-${token}`,
        transactionID: `SIM-TXN-${token}`,
        whoisguardEnable: Boolean(whoisGuard),
        raw: '<ApiResponse Status="OK" Simulated="true"/>',
      };
    }

    const c = contacts || {};
    const roles = ['Registrant', 'Tech', 'Admin', 'AuxBilling'];
    const contactParams = {};
    for (const role of roles) {
      const src = c[role.toLowerCase()] || c.registrant || c;
      contactParams[`${role}FirstName`] = src.firstName || '';
      contactParams[`${role}LastName`] = src.lastName || '';
      contactParams[`${role}Address1`] = src.address1 || '';
      contactParams[`${role}City`] = src.city || '';
      contactParams[`${role}StateProvince`] = src.state || src.stateProvince || 'NA';
      contactParams[`${role}PostalCode`] = src.postalCode || '';
      contactParams[`${role}Country`] = (src.country || 'US').toUpperCase();
      contactParams[`${role}Phone`] = src.phone || '';
      contactParams[`${role}EmailAddress`] = src.email || '';
    }

    const extra = {
      DomainName: domain,
      Years: Math.max(1, Math.min(10, Number(years) || 1)),
      AddFreeWhoisguard: whoisGuard ? 'yes' : 'no',
      WGEnabled: whoisGuard ? 'yes' : 'no',
      ...contactParams,
    };
    if (nameservers) extra.Nameservers = Array.isArray(nameservers) ? nameservers.join(',') : nameservers;

    const xml = await callNamecheap('namecheap.domains.create', extra, { cfg, fetcher, timeoutMs: 45000 });
    const [res] = getAllTags(xml, 'DomainCreateResult');
    if (!res) {
      throw new NamecheapError('Unexpected registrar response on create', { code: 'bad_xml', raw: xml.slice(0, 2000) });
    }
    return {
      registered: String(res.Registered).toLowerCase() === 'true',
      domain: res.Domain || domain,
      chargedAmount: Number(res.ChargedAmount || 0),
      domainID: res.DomainID || '',
      orderID: res.OrderID || '',
      transactionID: res.TransactionID || '',
      whoisguardEnable: String(res.WhoisguardEnable).toLowerCase() === 'true',
      raw: xml.slice(0, 4000),
    };
  },

  async renewDomain({ domain, years = 1 }, { db = null, fetcher = fetch } = {}) {
    const cfg = await getNamecheapConfig(db);
    if (!cfg.liveConfigured && cfg.sandboxSimulation) {
      const token = randomUUID().slice(0, 8).toUpperCase();
      const expire = new Date(Date.now() + (Number(years) || 1) * 365 * 24 * 60 * 60 * 1000).toISOString();
      return {
        renewed: true,
        domain,
        chargedAmount: 0,
        orderID: `SIM-REN-${token}`,
        transactionID: `SIM-TXN-${token}`,
        expireDate: expire,
        raw: '<ApiResponse Status="OK" Simulated="true"/>',
      };
    }

    const xml = await callNamecheap(
      'namecheap.domains.renew',
      { DomainName: domain, Years: Math.max(1, Math.min(10, Number(years) || 1)) },
      { cfg, fetcher, timeoutMs: 45000 }
    );
    const [res] = getAllTags(xml, 'DomainRenewResult');
    const [details] = getAllTags(xml, 'DomainDetails');
    return {
      renewed: res ? String(res.Renew).toLowerCase() === 'true' : true,
      domain: res?.DomainName || domain,
      chargedAmount: Number(res?.ChargedAmount || 0),
      orderID: res?.OrderID || '',
      transactionID: res?.TransactionID || '',
      expireDate: details?.ExpiredDate || '',
      raw: xml.slice(0, 4000),
    };
  },

  async getDomainInfo(domain, { db = null, fetcher = fetch } = {}) {
    const cfg = await getNamecheapConfig(db);
    if (!cfg.liveConfigured && cfg.sandboxSimulation) {
      return {
        domain,
        status: 'Ok',
        ownerName: '',
        isPremium: false,
        idProtected: true,
        autoRenew: true,
        createdDate: new Date().toISOString(),
        expiredDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        nameservers: cfg.defaultNameservers,
        providerType: 'CUSTOM',
        raw: '<ApiResponse Status="OK" Simulated="true"/>',
      };
    }

    const xml = await callNamecheap('namecheap.domains.getInfo', { DomainName: domain }, { cfg, fetcher });
    const [info] = getTagBlocks(xml, 'DomainGetInfoResult');
    const attrs = info?.attrs || {};
    const dnsBlock = getTagBlocks(xml, 'DnsDetails')[0];
    const nameservers = [];
    if (dnsBlock) {
      const nsRe = /<Nameserver[^>]*>([^<]+)<\/Nameserver>/gi;
      let m;
      while ((m = nsRe.exec(dnsBlock.inner)) !== null) nameservers.push(m[1].trim());
    }
    const createdMatch = /<CreatedDate>([^<]+)<\/CreatedDate>/i.exec(xml);
    const expiredMatch = /<ExpiredDate>([^<]+)<\/ExpiredDate>/i.exec(xml);
    const autoRenewMatch = /<AutoRenew>([^<]+)<\/AutoRenew>/i.exec(xml);

    return {
      domain: attrs.DomainName || domain,
      status: attrs.Status || 'Unknown',
      ownerName: attrs.OwnerName || '',
      isPremium: String(attrs.IsPremium).toLowerCase() === 'true',
      idProtected: /<WhoisGuard[^>]*Enabled="True"/i.test(xml),
      autoRenew: autoRenewMatch ? autoRenewMatch[1].trim().toLowerCase() === 'true' : null,
      createdDate: createdMatch ? createdMatch[1].trim() : '',
      expiredDate: expiredMatch ? expiredMatch[1].trim() : '',
      nameservers,
      providerType: dnsBlock?.attrs?.ProviderType || '',
      raw: xml.slice(0, 4000),
      extra: attrMap(''),
    };
  },

  async setNameservers({ domain, nameservers = [] }, { db = null, fetcher = fetch } = {}) {
    const [sld, ...tldParts] = String(domain || '').toLowerCase().split('.');
    const tld = tldParts.join('.');
    const list = (Array.isArray(nameservers) ? nameservers : String(nameservers).split(','))
      .map(s => s.trim())
      .filter(Boolean);
    if (!sld || !tld || list.length < 2) {
      throw new NamecheapError('At least two nameservers are required', {
        code: 'validation',
        publicMessage: 'Provide at least two valid nameservers.',
      });
    }

    const cfg = await getNamecheapConfig(db);
    if (!cfg.liveConfigured && cfg.sandboxSimulation) {
      return {
        updated: true,
        domain,
        raw: '<ApiResponse Status="OK" Simulated="true"/>',
      };
    }

    const xml = await callNamecheap(
      'namecheap.domains.dns.setCustom',
      { SLD: sld, TLD: tld, Nameservers: list.join(',') },
      { cfg, fetcher }
    );
    const [res] = getAllTags(xml, 'DomainDNSSetCustomResult');
    return {
      updated: res ? String(res.Updated ?? res.Update).toLowerCase() !== 'false' : true,
      domain,
      raw: xml.slice(0, 2000),
    };
  },

  async getDnsRecords(domain, { db = null, fetcher = fetch, fallbackRecords = null } = {}) {
    const [sld, ...tldParts] = String(domain || '').toLowerCase().split('.');
    const tld = tldParts.join('.');
    const cfg = await getNamecheapConfig(db);

    if (!cfg.liveConfigured) {
      if (cfg.sandboxSimulation || Array.isArray(fallbackRecords)) {
        return Array.isArray(fallbackRecords) ? fallbackRecords : [];
      }
    }

    const xml = await callNamecheap(
      'namecheap.domains.dns.getHosts',
      { SLD: sld, TLD: tld },
      { cfg, fetcher }
    );
    const hosts = getAllTags(xml, 'host').concat(getAllTags(xml, 'Host'));
    const seen = new Set();
    const out = [];
    for (const h of hosts) {
      const key = `${h.HostId || ''}:${h.Name}:${h.Type}:${h.Address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        hostId: h.HostId || '',
        name: h.Name || '@',
        type: (h.Type || 'A').toUpperCase(),
        address: h.Address || '',
        mxPref: h.MXPref || '10',
        ttl: h.TTL || '1799',
      });
    }
    return out;
  },

  async setDnsRecords(domain, records = [], { db = null, fetcher = fetch } = {}) {
    const [sld, ...tldParts] = String(domain || '').toLowerCase().split('.');
    const tld = tldParts.join('.');
    if (!Array.isArray(records) || records.length === 0) {
      throw new NamecheapError('At least one DNS record is required', {
        code: 'validation',
        publicMessage: 'Keep at least one DNS record on the domain.',
      });
    }

    const normalized = records.map((r, idx) => ({
      hostId: r.hostId || String(idx + 1),
      name: String(r.name || '@').trim() || '@',
      type: String(r.type || 'A').trim().toUpperCase(),
      address: String(r.address || '').trim(),
      mxPref: String(r.mxPref || '10'),
      ttl: String(r.ttl || '1799'),
    }));

    const cfg = await getNamecheapConfig(db);
    if (!cfg.liveConfigured && cfg.sandboxSimulation) {
      return {
        updated: true,
        records: normalized,
        raw: '<ApiResponse Status="OK" Simulated="true"/>',
      };
    }

    const extra = { SLD: sld, TLD: tld };
    normalized.forEach((r, idx) => {
      const i = idx + 1;
      extra[`HostName${i}`] = r.name;
      extra[`RecordType${i}`] = r.type;
      extra[`Address${i}`] = r.address;
      if (r.type === 'MX') extra[`MXPref${i}`] = r.mxPref;
      extra[`TTL${i}`] = r.ttl;
    });
    const xml = await callNamecheap('namecheap.domains.dns.setHosts', extra, { cfg, fetcher });
    const [res] = getAllTags(xml, 'DomainDNSSetHostsResult');
    return {
      updated: res ? String(res.IsSuccess).toLowerCase() === 'true' : true,
      records: normalized,
      raw: xml.slice(0, 2000),
    };
  },
};
