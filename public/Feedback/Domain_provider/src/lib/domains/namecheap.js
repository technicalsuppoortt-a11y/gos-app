import { getApiErrors, getApiStatus, getAllTags, getTagBlocks, publicRegistrarError } from './xml';

const SANDBOX_URL = 'https://api.sandbox.namecheap.com/xml.response';
const PROD_URL = 'https://api.namecheap.com/xml.response';

function env(name) {
  return String(process.env[name] || '').trim();
}

export function getNamecheapConfig() {
  const environment = (env('NAMECHEAP_ENVIRONMENT') || 'sandbox').toLowerCase();
  const sandbox = environment !== 'production' && environment !== 'prod';
  return {
    apiUser: env('NAMECHEAP_API_USER'),
    apiKey: env('NAMECHEAP_API_KEY'),
    userName: env('NAMECHEAP_USERNAME') || env('NAMECHEAP_API_USER'),
    clientIp: env('NAMECHEAP_CLIENT_IP'),
    environment: sandbox ? 'sandbox' : 'production',
    endpoint: sandbox ? SANDBOX_URL : PROD_URL,
    configured: Boolean(env('NAMECHEAP_API_USER') && env('NAMECHEAP_API_KEY') && env('NAMECHEAP_CLIENT_IP'))
  };
}

export class NamecheapError extends Error {
  constructor(message, { code = '', raw = '', publicMessage = '' } = {}) {
    super(message);
    this.name = 'NamecheapError';
    this.code = code;
    this.raw = raw;
    this.publicMessage = publicMessage || message;
  }
}

async function callNamecheap(command, extra = {}, { timeoutMs = 25000 } = {}) {
  const cfg = getNamecheapConfig();
  if (!cfg.configured) {
    throw new NamecheapError('Namecheap is not configured', {
      code: 'not_configured',
      publicMessage: 'Domain registrar is not configured yet. Contact support.'
    });
  }

  const params = new URLSearchParams({
    ApiUser: cfg.apiUser,
    ApiKey: cfg.apiKey,
    UserName: cfg.userName,
    ClientIp: cfg.clientIp,
    Command: command,
    ...Object.fromEntries(
      Object.entries(extra).filter(([, v]) => v != null && v !== '')
    )
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let xml = '';
  try {
    const res = await fetch(`${cfg.endpoint}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/xml' }
    });
    xml = await res.text();
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new NamecheapError('Namecheap API timeout', {
        code: 'timeout',
        publicMessage: 'The registrar timed out. Please try again.'
      });
    }
    throw new NamecheapError(err.message || 'Namecheap request failed', {
      code: 'network',
      publicMessage: 'Could not reach the registrar. Please try again.'
    });
  } finally {
    clearTimeout(timer);
  }

  const status = getApiStatus(xml);
  const errors = getApiErrors(xml);
  if (status && status.toUpperCase() !== 'OK') {
    const first = errors[0] || { number: '', message: 'Registrar error' };
    const err = new NamecheapError(first.message || 'Registrar error', {
      code: first.number || 'registrar',
      raw: xml.slice(0, 4000),
      publicMessage: publicRegistrarError(errors)
    });
    err.errors = errors;
    throw err;
  }

  return xml;
}

function money(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const NamecheapService = {
  isConfigured() {
    return getNamecheapConfig().configured;
  },

  getEnvironment() {
    return getNamecheapConfig().environment;
  },

  async checkDomainAvailability(domainList) {
    const list = (Array.isArray(domainList) ? domainList : [domainList])
      .map((d) => String(d || '').trim().toLowerCase())
      .filter(Boolean);
    if (!list.length) return [];

    const xml = await callNamecheap('namecheap.domains.check', {
      DomainList: list.join(',')
    });

    return getAllTags(xml, 'DomainCheckResult').map((row) => ({
      domain: row.Domain || '',
      available: String(row.Available || '').toLowerCase() === 'true',
      isPremium: String(row.IsPremiumName || '').toLowerCase() === 'true',
      premiumRegistrationPrice: money(row.PremiumRegistrationPrice),
      premiumRenewalPrice: money(row.PremiumRenewalPrice),
      premiumTransferPrice: money(row.PremiumTransferPrice),
      eapFee: money(row.EapFee),
      description: row.Description || ''
    }));
  },

  async getDomainPricing(tlds = []) {
    const xml = await callNamecheap('namecheap.users.getPricing', {
      ProductType: 'DOMAIN'
    });
    const wanted = new Set((tlds || []).map((t) => String(t).toLowerCase()));
    const out = {};

    getTagBlocks(xml, 'ProductCategory').forEach((cat) => {
      const action = String(cat.attrs.Name || '').toUpperCase();
      getTagBlocks(cat.inner, 'Product').forEach((prod) => {
        const tld = String(prod.attrs.Name || '').toLowerCase();
        if (wanted.size && !wanted.has(tld)) return;
        const year1 = getAllTags(prod.inner, 'Price').find((p) => String(p.Duration) === '1') || getAllTags(prod.inner, 'Price')[0];
        if (!year1) return;
        if (!out[tld]) out[tld] = { tld, register: 0, renew: 0, transfer: 0, currency: year1.Currency || 'USD' };
        const price = money(year1.YourPrice || year1.Price);
        if (action.includes('REGISTER')) out[tld].register = price;
        else if (action.includes('RENEW')) out[tld].renew = price;
        else if (action.includes('TRANSFER')) out[tld].transfer = price;
      });
    });

    return Object.values(out);
  },

  async registerDomain({ domain, years = 1, contacts, nameservers = '', whoisGuard = true }) {
    const c = contacts || {};
    const fill = (role) => {
      const src = c[role] || c.registrant || c;
      return {
        [`${role}FirstName`]: src.firstName || '',
        [`${role}LastName`]: src.lastName || '',
        [`${role}Address1`]: src.address1 || '',
        [`${role}City`]: src.city || '',
        [`${role}StateProvince`]: src.state || src.stateProvince || 'NA',
        [`${role}PostalCode`]: src.postalCode || '',
        [`${role}Country`]: src.country || 'US',
        [`${role}Phone`]: src.phone || '',
        [`${role}EmailAddress`]: src.email || ''
      };
    };

    const xml = await callNamecheap('namecheap.domains.create', {
      DomainName: domain,
      Years: String(years || 1),
      AddFreeWhoisguard: whoisGuard ? 'yes' : 'no',
      WGEnabled: whoisGuard ? 'yes' : 'no',
      Nameservers: nameservers,
      ...fill('Registrant'),
      ...fill('Tech'),
      ...fill('Admin'),
      ...fill('AuxBilling')
    }, { timeoutMs: 45000 });

    const result = getAllTags(xml, 'DomainCreateResult')[0] || {};
    return {
      registered: String(result.Registered || '').toLowerCase() === 'true',
      domain: result.Domain || domain,
      chargedAmount: money(result.ChargedAmount),
      domainID: result.DomainID || '',
      orderID: result.OrderID || '',
      transactionID: result.TransactionID || '',
      whoisguardEnable: String(result.WhoisguardEnable || '').toLowerCase() === 'true',
      raw: xml.slice(0, 8000)
    };
  },

  async renewDomain({ domain, years = 1 }) {
    const xml = await callNamecheap('namecheap.domains.renew', {
      DomainName: domain,
      Years: String(years || 1)
    }, { timeoutMs: 45000 });
    const result = getAllTags(xml, 'DomainRenewResult')[0] || {};
    return {
      renewed: String(result.Renew || result.Registered || 'true').toLowerCase() !== 'false',
      domain: result.DomainName || domain,
      chargedAmount: money(result.ChargedAmount),
      orderID: result.OrderID || '',
      transactionID: result.TransactionID || '',
      expireDate: result.ExpireDate || '',
      raw: xml.slice(0, 8000)
    };
  },

  async getDomainInfo(domain) {
    const xml = await callNamecheap('namecheap.domains.getInfo', {
      DomainName: domain
    });
    const info = getAllTags(xml, 'DomainGetInfoResult')[0] || {};
    const dns = getAllTags(xml, 'DnsDetails')[0] || {};
    const nameservers = getAllTags(xml, 'Nameserver').map((n) => n.Name || Object.values(n)[0]).filter(Boolean);
    const dates = getAllTags(xml, 'DomainGetInfoResult');
    const created = (xml.match(/<CreatedDate>([^<]+)<\/CreatedDate>/i) || [])[1] || '';
    const expires = (xml.match(/<ExpiredDate>([^<]+)<\/ExpiredDate>/i) || [])[1] || '';
    return {
      domain: info.Domain || domain,
      status: info.Status || '',
      ownerName: info.OwnerName || '',
      isPremium: String(info.IsPremium || '').toLowerCase() === 'true',
      idProtected: String(info.IDProtected || '').toLowerCase() === 'true',
      autoRenew: String((xml.match(/<AutoRenew>([^<]+)<\/AutoRenew>/i) || [])[1] || '').toLowerCase() === 'true',
      createdDate: created,
      expiredDate: expires,
      nameservers: nameservers.length ? nameservers : String(dns.Nameserver || '').split(',').map((s) => s.trim()).filter(Boolean),
      providerType: dns.ProviderType || '',
      raw: xml.slice(0, 8000),
      extra: { dates, info }
    };
  },

  async setNameservers({ domain, nameservers = [] }) {
    const sldTld = splitSldTld(domain);
    const list = (Array.isArray(nameservers) ? nameservers : String(nameservers).split(','))
      .map((n) => String(n || '').trim())
      .filter(Boolean);
    const xml = await callNamecheap('namecheap.domains.dns.setCustom', {
      SLD: sldTld.sld,
      TLD: sldTld.tld,
      Nameservers: list.join(',')
    });
    const result = getAllTags(xml, 'DomainDNSSetCustomResult')[0] || {};
    return {
      updated: String(result.Updated || 'true').toLowerCase() !== 'false',
      domain: result.Domain || domain,
      raw: xml.slice(0, 4000)
    };
  },

  async getDnsRecords(domain) {
    const { sld, tld } = splitSldTld(domain);
    const xml = await callNamecheap('namecheap.domains.dns.getHosts', { SLD: sld, TLD: tld });
    const hosts = getAllTags(xml, 'host').concat(getAllTags(xml, 'Host'));
    return hosts.map((h) => ({
      hostId: h.HostId || h.HostID || '',
      name: h.Name || '',
      type: h.Type || '',
      address: h.Address || '',
      mxPref: h.MXPref || '10',
      ttl: h.TTL || '1799'
    }));
  },

  async setDnsRecords(domain, records = []) {
    const { sld, tld } = splitSldTld(domain);
    const payload = {};
    (records || []).forEach((rec, i) => {
      const n = i + 1;
      payload[`HostName${n}`] = rec.name || rec.HostName || '@';
      payload[`RecordType${n}`] = rec.type || rec.RecordType || 'A';
      payload[`Address${n}`] = rec.address || rec.Address || '';
      payload[`MXPref${n}`] = rec.mxPref || rec.MXPref || '10';
      payload[`TTL${n}`] = rec.ttl || rec.TTL || '1799';
    });
    const xml = await callNamecheap('namecheap.domains.dns.setHosts', {
      SLD: sld,
      TLD: tld,
      ...payload
    });
    const result = getAllTags(xml, 'DomainDNSSetHostsResult')[0] || {};
    return {
      updated: String(result.IsSuccess || result.Updated || 'true').toLowerCase() !== 'false',
      raw: xml.slice(0, 4000)
    };
  }
};

function splitSldTld(domain) {
  const parts = String(domain || '').toLowerCase().split('.').filter(Boolean);
  if (parts.length < 2) return { sld: parts[0] || '', tld: 'com' };
  return { sld: parts[0], tld: parts.slice(1).join('.') };
}
