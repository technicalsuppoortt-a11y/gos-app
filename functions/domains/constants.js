export const SUGGESTED_TLDS = ['com', 'net', 'org', 'ai', 'co', 'io', 'store', 'app', 'dev', 'online'];

export const DEFAULT_MARKUP = 4.99;
export const DEFAULT_MARKUP_TYPE = 'fixed'; // 'fixed' ($ added) | 'percent' (% added)

export const DOMAIN_ORDER_TYPES = ['registration', 'renewal', 'transfer'];
export const DOMAIN_ORDER_STATUSES = ['pending', 'paid', 'processing', 'completed', 'failed', 'refunded'];

export const CONTACT_FIELD_KEYS = [
  'firstName',
  'lastName',
  'organization',
  'address1',
  'address2',
  'city',
  'state',
  'postalCode',
  'country',
  'phone',
  'email',
];

export const REQUIRED_CONTACT_FIELDS = [
  'firstName',
  'lastName',
  'address1',
  'city',
  'postalCode',
  'country',
  'phone',
  'email',
];

// Reasonable baseline registrar costs (USD) seeded when domain_pricing is empty.
// Superadmin can sync live costs from Namecheap or edit each TLD at any time.
export const DEFAULT_TLD_COSTS = {
  com: { registrar_price: 10.00, renewal_cost: 12.98, transfer_cost: 10.00 },
  net: { registrar_price: 11.98, renewal_cost: 13.98, transfer_cost: 11.98 },
  org: { registrar_price: 10.18, renewal_cost: 13.18, transfer_cost: 10.18 },
  io: { registrar_price: 32.98, renewal_cost: 32.98, transfer_cost: 32.98 },
  ai: { registrar_price: 69.98, renewal_cost: 69.98, transfer_cost: 69.98 },
  co: { registrar_price: 9.98, renewal_cost: 24.98, transfer_cost: 9.98 },
  store: { registrar_price: 4.98, renewal_cost: 29.98, transfer_cost: 4.98 },
  app: { registrar_price: 14.00, renewal_cost: 18.00, transfer_cost: 14.00 },
  dev: { registrar_price: 12.00, renewal_cost: 14.00, transfer_cost: 12.00 },
  xyz: { registrar_price: 2.00, renewal_cost: 12.00, transfer_cost: 2.00 },
  me: { registrar_price: 12.00, renewal_cost: 18.00, transfer_cost: 12.00 },
  info: { registrar_price: 4.00, renewal_cost: 18.00, transfer_cost: 4.00 },
  online: { registrar_price: 5.00, renewal_cost: 28.00, transfer_cost: 5.00 },
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
  const mark = Number.isFinite(Number(markup)) ? Number(markup) : DEFAULT_MARKUP;
  if (markupType === 'percent') {
    return roundMoney(base * (1 + mark / 100));
  }
  return roundMoney(base + mark);
}

export function parseDomainInput(input) {
  const raw = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/[^a-z0-9.-]/g, '');

  if (!raw) return null;
  const parts = raw.split('.').filter(Boolean);
  if (parts.length === 0) return null;

  const cleanLabel = label => label.replace(/^-+|-+$/g, '').slice(0, 63);

  if (parts.length === 1) {
    const sld = cleanLabel(parts[0]);
    if (!sld) return null;
    return { sld, tld: 'com', fqdn: `${sld}.com` };
  }
  const sld = cleanLabel(parts[0]);
  const tld = parts.slice(1).map(cleanLabel).filter(Boolean).join('.');
  if (!sld || !tld) return null;
  return { sld, tld, fqdn: `${sld}.${tld}` };
}

const DIAL_CODES = {
  US: '1',
  CA: '1',
  EG: '20',
  SA: '966',
  AE: '971',
  KW: '965',
  QA: '974',
  BH: '973',
  OM: '968',
  JO: '962',
  LB: '961',
  MA: '212',
  TN: '216',
  DZ: '213',
  IQ: '964',
  GB: '44',
  UK: '44',
  DE: '49',
  FR: '33',
  TR: '90',
  IN: '91',
};

export function formatPhoneForNamecheap(phone, country = 'US') {
  const raw = String(phone || '').trim();
  if (/^\+\d{1,3}\.\d{5,15}$/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const cc = DIAL_CODES[String(country || 'US').toUpperCase()] || '1';
  if (digits.startsWith(cc) && digits.length > cc.length + 4) {
    return `+${cc}.${digits.slice(cc.length)}`;
  }
  const localDigits = digits.replace(/^0+/, '') || digits;
  return `+${cc}.${localDigits}`;
}

export function serializeTs(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}
