export const POPULAR_TLDS = ['com', 'net', 'org', 'ai', 'co', 'io', 'store', 'app', 'dev', 'online'] as const;

export const QUICK_MARKUP_PRESETS = [15, 20, 25, 30, 40, 50] as const;

export const DEFAULT_TLD_COSTS: Record<string, { registrar_price: number; renewal_cost: number; transfer_cost: number }> = {
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

export const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'URL'] as const;

export interface ContactFieldConfig {
  key: keyof DomainContact;
  labelEn: string;
  labelAr: string;
  placeholder?: string;
  required?: boolean;
}

export const CONTACT_FIELDS: readonly ContactFieldConfig[] = [
  { key: 'firstName', labelEn: 'First Name', labelAr: 'الاسم الأول', placeholder: 'Ahmed', required: true },
  { key: 'lastName', labelEn: 'Last Name', labelAr: 'اسم العائلة', placeholder: 'Hassan', required: true },
  { key: 'organization', labelEn: 'Organization / Company (Optional)', labelAr: 'الشركة / المنظمة (اختياري)', placeholder: 'Upclick Studio' },
  { key: 'address1', labelEn: 'Street Address', labelAr: 'العنوان بالكامل', placeholder: '123 Tahrir St', required: true },
  { key: 'city', labelEn: 'City', labelAr: 'المدينة', placeholder: 'Cairo', required: true },
  { key: 'state', labelEn: 'State / Province', labelAr: 'المحافظة / الولاية', placeholder: 'Cairo' },
  { key: 'postalCode', labelEn: 'Postal Code', labelAr: 'الرمز البريدي', placeholder: '11511', required: true },
  { key: 'country', labelEn: 'Country Code (e.g. EG, SA, AE, US)', labelAr: 'رمز الدولة (EG, SA, AE, US)', placeholder: 'EG', required: true },
  { key: 'phone', labelEn: 'Phone Number (with country code)', labelAr: 'رقم الهاتف (مع كود الدولة)', placeholder: '+201001234567', required: true },
  { key: 'email', labelEn: 'Email Address', labelAr: 'البريد الإلكتروني', placeholder: 'owner@mybrand.com', required: true },
] as const;

export interface DomainContact {
  firstName: string;
  lastName: string;
  organization?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
}

export interface PublicPricingRow {
  extension: string;
  registration_price: number;
  renewal_price: number;
  transfer_price: number;
  enabled: boolean;
  currency: string;
}

export interface AdminPricingRow extends PublicPricingRow {
  id: string;
  registrar_price: number;
  renewal_cost: number;
  transfer_cost: number;
  markup: number;
  markup_type: 'fixed' | 'percent';
  profit: number;
  profit_margin_pct: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DomainGlobalSettings {
  markup: number;
  markup_type: 'fixed' | 'percent';
  suggested_tlds?: string[];
  currency?: string;
  whois_guard?: boolean;
}

export interface RegistrarConfigSummary {
  provider: 'namecheap';
  apiUser: string;
  userName: string;
  clientIp: string;
  environment: 'sandbox' | 'production';
  sandboxSimulation: boolean;
  liveConfigured: boolean;
  configured: boolean;
  hasApiKey: boolean;
  maskedApiKey: string;
  defaultNameservers: string[];
  updatedAt?: string | null;
}

export interface DomainCheckResult {
  domain: string;
  extension: string;
  available: boolean;
  isPremium?: boolean;
  unsupported?: boolean;
  status: 'available' | 'unavailable' | 'unsupported';
  registration_price?: number;
  renewal_price?: number;
  transfer_price?: number;
  currency?: string;
  source?: string;
}

export interface DnsRecord {
  hostId?: string;
  name: string;
  type: string;
  address: string;
  mxPref?: string;
  ttl?: string;
}

export interface RegisteredDomain {
  id: string;
  domain: string;
  extension: string;
  status: string;
  registrar: string;
  registrar_domain_id?: string;
  registration_price: number;
  renewal_price: number;
  registered_at?: string | null;
  expires_at?: string | null;
  auto_renew: boolean;
  nameservers: string[];
  connected_funnel_id?: string;
  user_id?: string;
  tenant_id?: string;
  admin_id?: string;
  user_email?: string;
  user_name?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DomainOrder {
  id: string;
  domain: string;
  extension: string;
  type: 'registration' | 'renewal' | 'transfer' | string;
  years?: number;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'failed' | 'refunded' | string;
  registrar_cost?: number;
  customer_price: number;
  renewal_price?: number;
  profit?: number;
  currency: string;
  payment_id?: string;
  payment_method?: string;
  stripeSessionId?: string;
  domain_id?: string;
  error_public?: string;
  error_internal?: string;
  error_code?: string;
  user_id?: string;
  tenant_id?: string;
  admin_id?: string;
  user_email?: string;
  user_name?: string;
  created_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
}

export interface RegistrarLog {
  id: string;
  orderId: string;
  userId: string;
  domain: string;
  type: string;
  code: string;
  message: string;
  createdAt?: string | null;
}

export interface DelegatedSiteDomain {
  host: string;
  funnelId: string;
  tenantId: string;
  ownerUid: string;
  status: string;
  sslStatus: string;
  verified: boolean;
  updatedAt?: string | null;
}

export function roundMoney(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

export function computeCustomerPrice(
  registrarPrice: number,
  markup = 4.99,
  markupType: 'fixed' | 'percent' = 'fixed'
): number {
  const base = Number(registrarPrice) || 0;
  const mark = Number.isFinite(Number(markup)) ? Number(markup) : 4.99;
  if (markupType === 'percent') {
    return roundMoney(base * (1 + mark / 100));
  }
  return roundMoney(base + mark);
}

export function parseDomainInput(input: string): { sld: string; tld: string; fqdn: string } | null {
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
  if (parts.length === 1) {
    return { sld: parts[0], tld: 'com', fqdn: `${parts[0]}.com` };
  }
  const sld = parts[0];
  const tld = parts.slice(1).join('.');
  if (!sld || !tld) return null;
  return { sld, tld, fqdn: `${sld}.${tld}` };
}
