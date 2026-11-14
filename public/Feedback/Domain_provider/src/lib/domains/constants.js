export const SUGGESTED_TLDS = ['com', 'net', 'org', 'io', 'ai', 'co'];

export const DEFAULT_MARKUP = 4.99;
export const DEFAULT_MARKUP_TYPE = 'fixed';

export const DOMAIN_ORDER_TYPES = ['registration', 'renewal', 'transfer'];
export const DOMAIN_ORDER_STATUSES = ['pending', 'paid', 'processing', 'completed', 'failed', 'refunded'];

export const DEFAULT_TLD_COSTS = {
  com: { registrar_price: 10.00, renewal_cost: 12.98, transfer_cost: 10.00 },
  net: { registrar_price: 11.98, renewal_cost: 13.98, transfer_cost: 11.98 },
  org: { registrar_price: 10.18, renewal_cost: 13.18, transfer_cost: 10.18 },
  io: { registrar_price: 32.98, renewal_cost: 32.98, transfer_cost: 32.98 },
  ai: { registrar_price: 69.98, renewal_cost: 69.98, transfer_cost: 69.98 },
  co: { registrar_price: 9.98, renewal_cost: 24.98, transfer_cost: 9.98 },
  app: { registrar_price: 14.00, renewal_cost: 18.00, transfer_cost: 14.00 },
  dev: { registrar_price: 12.00, renewal_cost: 14.00, transfer_cost: 12.00 },
  xyz: { registrar_price: 2.00, renewal_cost: 12.00, transfer_cost: 2.00 },
  me: { registrar_price: 12.00, renewal_cost: 18.00, transfer_cost: 12.00 },
  info: { registrar_price: 4.00, renewal_cost: 18.00, transfer_cost: 4.00 },
  online: { registrar_price: 5.00, renewal_cost: 28.00, transfer_cost: 5.00 }
};

export function roundMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

export function computeCustomerPrice(registrarPrice, markup = DEFAULT_MARKUP, markupType = DEFAULT_MARKUP_TYPE, override) {
  if (override != null && override !== '' && Number.isFinite(Number(override))) {
    return roundMoney(override);
  }
  const base = Number(registrarPrice) || 0;
  const m = Number(markup);
  const mark = Number.isFinite(m) ? m : DEFAULT_MARKUP;
  if (markupType === 'percent') return roundMoney(base * (1 + mark / 100));
  return roundMoney(base + mark);
}

export function parseDomainInput(input) {
  const raw = String(input || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  if (!raw) return null;
  const cleaned = raw.replace(/[^a-z0-9.-]/g, '');
  const parts = cleaned.split('.').filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1) {
    return { sld: parts[0], tld: 'com', fqdn: `${parts[0]}.com` };
  }
  const sld = parts[0];
  const tld = parts.slice(1).join('.');
  if (!sld || !tld) return null;
  return { sld, tld, fqdn: `${sld}.${tld}` };
}

export function formatPhoneForNamecheap(phone, country = 'US') {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  const codes = { US: '1', EG: '20', SA: '966', AE: '971', GB: '44', UK: '44' };
  const cc = codes[String(country || 'US').toUpperCase()] || '1';
  if (digits.startsWith(cc) && digits.length > cc.length) {
    return `+${cc}.${digits.slice(cc.length)}`;
  }
  return `+${cc}.${digits}`;
}

export function serializeTs(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value.seconds) return new Date(value.seconds * 1000).toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : null;
}
