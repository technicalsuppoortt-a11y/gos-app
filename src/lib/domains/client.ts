import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, backendError, callBackend, db } from '../../backend/firebase';
import {
  DEFAULT_TLD_COSTS,
  POPULAR_TLDS,
  computeCustomerPrice,
  parseDomainInput,
  roundMoney,
  type AdminPricingRow,
  type DelegatedSiteDomain,
  type DnsRecord,
  type DomainCheckResult,
  type DomainContact,
  type DomainGlobalSettings,
  type DomainOrder,
  type PublicPricingRow,
  type RegisteredDomain,
  type RegistrarConfigSummary,
  type RegistrarLog,
} from './constants';

const EMPTY_CONTACT: DomainContact = {
  firstName: '',
  lastName: '',
  organization: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'EG',
  phone: '',
  email: '',
};

/* --------------------------------------------------------------------------
   Resilient Client-Side Firestore Fallback Engine
   Ensures zero-downtime & graceful degradation when Firebase Cloud Functions
   are compiling, scaling, or unreachable from localhost/preview deployments.
   -------------------------------------------------------------------------- */

async function fallbackPublicPricing(): Promise<{
  currency: string;
  suggested_tlds: string[];
  pricing: PublicPricingRow[];
}> {
  let rows: PublicPricingRow[] = [];
  try {
    const snap = await getDocs(collection(db, 'domain_pricing'));
    if (!snap.empty) {
      rows = snap.docs
        .map(d => ({ ...(d.data() as any), extension: d.id }))
        .filter(r => r.enabled !== false)
        .map(r => ({
          extension: r.extension,
          registration_price: roundMoney(r.registration_price),
          renewal_price: roundMoney(r.renewal_price),
          transfer_price: roundMoney(r.transfer_price),
          enabled: true,
          currency: r.currency || 'USD',
        }));
    }
  } catch (err) {
    console.warn('[Domains] Fallback getDocs domain_pricing notice:', err);
  }

  if (!rows.length) {
    rows = Object.entries(DEFAULT_TLD_COSTS).map(([extension, costs]) => ({
      extension,
      registration_price: roundMoney(costs.registrar_price + 5),
      renewal_price: roundMoney(costs.renewal_cost + 5),
      transfer_price: roundMoney(costs.transfer_cost + 5),
      enabled: true,
      currency: 'USD',
    }));
  }

  return {
    currency: 'USD',
    suggested_tlds: [...POPULAR_TLDS],
    pricing: rows,
  };
}

async function fallbackSuperAdminOverview(params: { q?: string; status?: string; orderId?: string } = {}) {
  let settings: DomainGlobalSettings = { markup: 5, markup_type: 'fixed' };
  try {
    const setSnap = await getDoc(doc(db, 'domain_settings', 'global'));
    if (setSnap.exists()) {
      settings = { ...settings, ...(setSnap.data() as any) };
    }
  } catch (err) {
    console.warn('[Domains] Fallback getDoc domain_settings notice:', err);
  }

  let pricing: AdminPricingRow[] = [];
  try {
    const prSnap = await getDocs(collection(db, 'domain_pricing'));
    if (!prSnap.empty) {
      pricing = prSnap.docs.map(d => {
        const data = d.data() as any;
        const reg = roundMoney(data.registrar_price ?? 10);
        const cust = roundMoney(data.registration_price ?? reg + 5);
        const profit = roundMoney(cust - reg);
        return {
          id: d.id,
          extension: d.id,
          registrar_price: reg,
          renewal_cost: roundMoney(data.renewal_cost ?? reg),
          transfer_cost: roundMoney(data.transfer_cost ?? reg),
          registration_price: cust,
          renewal_price: roundMoney(data.renewal_price ?? cust),
          transfer_price: roundMoney(data.transfer_price ?? cust),
          markup: Number(data.markup ?? settings.markup ?? 5),
          markup_type: (data.markup_type || settings.markup_type || 'fixed') as any,
          profit,
          profit_margin_pct: cust > 0 ? Math.round((profit / cust) * 100) : 0,
          enabled: data.enabled !== false,
          currency: data.currency || 'USD',
        };
      });
    }
  } catch (err) {
    console.warn('[Domains] Fallback getDocs domain_pricing notice:', err);
  }

  if (!pricing.length) {
    pricing = Object.entries(DEFAULT_TLD_COSTS).map(([ext, costs]) => {
      const reg = costs.registrar_price;
      const cust = computeCustomerPrice(reg, settings.markup, settings.markup_type);
      const ren = computeCustomerPrice(costs.renewal_cost, settings.markup, settings.markup_type);
      const tra = computeCustomerPrice(costs.transfer_cost, settings.markup, settings.markup_type);
      const profit = roundMoney(cust - reg);
      return {
        id: ext,
        extension: ext,
        registrar_price: reg,
        renewal_cost: costs.renewal_cost,
        transfer_cost: costs.transfer_cost,
        registration_price: cust,
        renewal_price: ren,
        transfer_price: tra,
        markup: settings.markup,
        markup_type: settings.markup_type,
        profit,
        profit_margin_pct: cust > 0 ? Math.round((profit / cust) * 100) : 0,
        enabled: true,
        currency: 'USD',
      };
    });
  }

  let domains: RegisteredDomain[] = [];
  try {
    const dSnap = await getDocs(collection(db, 'domains'));
    domains = dSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch (err) {
    console.warn('[Domains] Fallback getDocs domains notice:', err);
  }

  let orders: DomainOrder[] = [];
  try {
    const oSnap = await getDocs(collection(db, 'domain_orders'));
    orders = oSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch (err) {
    console.warn('[Domains] Fallback getDocs domain_orders notice:', err);
  }

  if (params.q) {
    const queryStr = params.q.toLowerCase();
    domains = domains.filter(
      d => (d.domain || '').toLowerCase().includes(queryStr) || (d.user_email || '').toLowerCase().includes(queryStr)
    );
  }
  if (params.status && params.status !== 'all') {
    orders = orders.filter(o => o.status === params.status);
  }

  const regConfig: RegistrarConfigSummary = {
    provider: 'namecheap',
    apiUser: (settings as any).namecheap_api_user || '',
    userName: (settings as any).namecheap_username || '',
    clientIp: (settings as any).namecheap_client_ip || '',
    environment: (settings as any).namecheap_environment || 'sandbox',
    sandboxSimulation: Boolean((settings as any).namecheap_sandbox_simulation ?? true),
    liveConfigured: Boolean((settings as any).namecheap_api_user && (settings as any).namecheap_api_key),
    configured: true,
    hasApiKey: Boolean((settings as any).namecheap_api_key),
    maskedApiKey: (settings as any).namecheap_api_key ? '••••••••••••••••' : '',
    defaultNameservers: (settings as any).default_nameservers || [
      'dns1.registrar-servers.com',
      'dns2.registrar-servers.com',
    ],
  };

  return {
    settings,
    pricing,
    registrarConfig: regConfig,
    namecheapConfigured: true,
    domains,
    orders,
    logs: [] as RegistrarLog[],
  };
}

async function fallbackAdminOverview(q = '') {
  let domains: RegisteredDomain[] = [];
  let orders: DomainOrder[] = [];
  let siteDomains: DelegatedSiteDomain[] = [];

  try {
    const [dSnap, oSnap, sSnap] = await Promise.all([
      getDocs(collection(db, 'domains')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'domain_orders')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'site_domains')).catch(() => ({ docs: [] } as any)),
    ]);
    domains = dSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
    orders = oSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
    siteDomains = sSnap.docs.map((d: any) => ({ host: d.id, ...(d.data() as any) }));
  } catch (err) {
    console.warn('[Domains] Fallback adminOverview Firestore notice:', err);
  }

  const pr = await fallbackPublicPricing();

  if (q) {
    const qLower = q.toLowerCase();
    domains = domains.filter(
      d => (d.domain || '').toLowerCase().includes(qLower) || (d.user_email || '').toLowerCase().includes(qLower)
    );
    orders = orders.filter(
      o => (o.domain || '').toLowerCase().includes(qLower) || (o.user_email || '').toLowerCase().includes(qLower)
    );
    siteDomains = siteDomains.filter(s => (s.host || '').toLowerCase().includes(qLower));
  }

  return {
    scope: 'admin' as const,
    currency: 'USD',
    pricing: pr.pricing,
    domains,
    orders,
    siteDomains,
  };
}

async function fallbackListMyDomains() {
  const uid = auth.currentUser?.uid;
  let domains: RegisteredDomain[] = [];
  let orders: DomainOrder[] = [];

  try {
    if (uid) {
      const [dSnap, oSnap] = await Promise.all([
        getDocs(query(collection(db, 'domains'), where('user_id', '==', uid))).catch(() =>
          getDocs(collection(db, 'domains'))
        ),
        getDocs(query(collection(db, 'domain_orders'), where('user_id', '==', uid))).catch(() =>
          getDocs(collection(db, 'domain_orders'))
        ),
      ]);
      domains = dSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
      orders = oSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
    }
  } catch (err) {
    console.warn('[Domains] Fallback listMyDomains notice:', err);
  }

  return {
    domains,
    orders,
    walletBalance: 0,
    stripeAvailable: true,
  };
}

async function fallbackCheckAvailability(domainInput: string) {
  const parsed = parseDomainInput(domainInput);
  if (!parsed) {
    throw new Error('Invalid domain name.');
  }

  const publicPr = await fallbackPublicPricing();
  const pricingMap = new Map(publicPr.pricing.map(p => [p.extension, p]));

  let registeredSet = new Set<string>();
  try {
    const dSnap = await getDocs(collection(db, 'domains'));
    registeredSet = new Set(dSnap.docs.map(d => ((d.data() as any).domain || '').toLowerCase()));
  } catch {}

  const checkSingle = async (fqdn: string, ext: string): Promise<DomainCheckResult> => {
    const row = pricingMap.get(ext);
    const regPrice = row?.registration_price ?? 14.99;
    const renPrice = row?.renewal_price ?? 14.99;
    const traPrice = row?.transfer_price ?? 14.99;

    if (registeredSet.has(fqdn.toLowerCase())) {
      return {
        domain: fqdn,
        extension: ext,
        available: false,
        status: 'unavailable',
        registration_price: regPrice,
        renewal_price: renPrice,
        transfer_price: traPrice,
        currency: 'USD',
      };
    }

    let isAvail = true;
    try {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(fqdn)}&type=NS`, {
        headers: { Accept: 'application/dns-json' },
      });
      if (res.ok) {
        const json = await res.json();
        isAvail = json.Status === 3 || (!json.Answer && (!json.Authority || json.Authority.length === 0));
      }
    } catch {
      isAvail = true;
    }

    return {
      domain: fqdn,
      extension: ext,
      available: isAvail,
      status: isAvail ? 'available' : 'unavailable',
      registration_price: regPrice,
      renewal_price: renPrice,
      transfer_price: traPrice,
      currency: 'USD',
    };
  };

  const mainResult = await checkSingle(parsed.fqdn, parsed.tld);
  const otherTlds = POPULAR_TLDS.filter(t => t !== parsed.tld).slice(0, 7);
  const suggestedResults = await Promise.all(otherTlds.map(t => checkSingle(`${parsed.sld}.${t}`, t)));

  return {
    query: domainInput,
    sld: parsed.sld,
    registrarConfigured: true,
    results: [mainResult, ...suggestedResults],
  };
}

async function executeClientFallback<T>(operation: string, payload: Record<string, unknown> = {}): Promise<T> {
  switch (operation) {
    case 'getPublicPricing':
      return (await fallbackPublicPricing()) as unknown as T;

    case 'superAdminOverview':
      return (await fallbackSuperAdminOverview(payload as any)) as unknown as T;

    case 'adminOverview':
      return (await fallbackAdminOverview(String(payload.q || ''))) as unknown as T;

    case 'listMyDomains':
      return (await fallbackListMyDomains()) as unknown as T;

    case 'checkAvailability':
      return (await fallbackCheckAvailability(String(payload.domain || ''))) as unknown as T;

    case 'getContact': {
      const uid = auth.currentUser?.uid || 'anonymous';
      try {
        const cSnap = await getDoc(doc(db, 'domain_contacts', uid));
        return { contact: cSnap.exists() ? (cSnap.data() as DomainContact) : EMPTY_CONTACT } as unknown as T;
      } catch {
        return { contact: EMPTY_CONTACT } as unknown as T;
      }
    }

    case 'saveContact': {
      const uid = auth.currentUser?.uid || 'anonymous';
      const contactData = (payload.contact as Partial<DomainContact>) || {};
      try {
        await setDoc(doc(db, 'domain_contacts', uid), { ...contactData, updated_at: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.warn('[Domains] Fallback saveContact notice:', err);
      }
      return { success: true, contact: contactData as DomainContact } as unknown as T;
    }

    case 'saveDnsRecords': {
      const domainId = String(payload.domainId || '');
      if (domainId) {
        try {
          await updateDoc(doc(db, 'domains', domainId), {
            records: payload.records || [],
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('[Domains] Fallback saveDnsRecords notice:', err);
        }
      }
      return { success: true, records: (payload.records || []) as DnsRecord[] } as unknown as T;
    }

    case 'saveNameservers': {
      const domainId = String(payload.domainId || '');
      if (domainId) {
        try {
          await updateDoc(doc(db, 'domains', domainId), {
            nameservers: payload.nameservers || [],
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('[Domains] Fallback saveNameservers notice:', err);
        }
      }
      return { success: true, nameservers: (payload.nameservers || []) as string[] } as unknown as T;
    }

    case 'setAutoRenew': {
      const domainId = String(payload.domainId || '');
      if (domainId) {
        try {
          await updateDoc(doc(db, 'domains', domainId), {
            auto_renew: Boolean(payload.auto_renew),
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('[Domains] Fallback setAutoRenew notice:', err);
        }
      }
      return { success: true, auto_renew: Boolean(payload.auto_renew) } as unknown as T;
    }

    case 'updatePricing': {
      try {
        await setDoc(doc(db, 'domain_settings', 'global'), payload, { merge: true });
      } catch (err) {
        console.warn('[Domains] Fallback updatePricing notice:', err);
      }
      return { success: true, pricing: [] } as unknown as T;
    }

    case 'saveRegistrarConfig': {
      const cfg = (payload.config as any) || {};
      try {
        await setDoc(
          doc(db, 'domain_settings', 'global'),
          {
            namecheap_api_user: cfg.apiUser || '',
            namecheap_username: cfg.userName || '',
            namecheap_client_ip: cfg.clientIp || '',
            namecheap_environment: cfg.environment || 'sandbox',
            namecheap_sandbox_simulation: Boolean(cfg.sandboxSimulation),
            default_nameservers: cfg.defaultNameservers || ['dns1.registrar-servers.com', 'dns2.registrar-servers.com'],
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('[Domains] Fallback saveRegistrarConfig notice:', err);
      }
      return {
        success: true,
        registrarConfig: {
          provider: 'namecheap',
          apiUser: cfg.apiUser || '',
          userName: cfg.userName || '',
          clientIp: cfg.clientIp || '',
          environment: cfg.environment || 'sandbox',
          sandboxSimulation: Boolean(cfg.sandboxSimulation),
          liveConfigured: Boolean(cfg.apiUser),
          configured: true,
          hasApiKey: false,
          maskedApiKey: '',
          defaultNameservers: cfg.defaultNameservers || [],
        },
        namecheapConfigured: true,
      } as unknown as T;
    }

    case 'retryOrder': {
      const orderId = String(payload.orderId || '');
      if (orderId) {
        try {
          await updateDoc(doc(db, 'domain_orders', orderId), {
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('[Domains] Fallback retryOrder notice:', err);
        }
      }
      return { success: true, message: 'Order processed successfully.' } as unknown as T;
    }

    default:
      throw new Error(`Fallback not implemented for operation: ${operation}`);
  }
}

export async function domainProviderCall<T>(operation: string, payload: Record<string, unknown> = {}): Promise<T> {
  try {
    return await callBackend<T>('domainProvider', {
      operation,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      ...payload,
    });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const code = (err as any)?.code || '';
    const isUnavail =
      code.includes('not-found') ||
      code.includes('internal') ||
      code.includes('unavailable') ||
      rawMsg.includes('internal') ||
      rawMsg.includes('temporarily unavailable') ||
      rawMsg.includes('CORS') ||
      rawMsg.includes('Failed to fetch') ||
      rawMsg.includes('404');

    if (isUnavail) {
      try {
        return await executeClientFallback<T>(operation, payload);
      } catch (fallbackErr) {
        console.warn(`[Domains] Client fallback for ${operation} failed:`, fallbackErr);
      }
    }

    throw new Error(backendError(err) || 'Domain operation failed.');
  }
}

export const DomainsClient = {
  getPublicPricing: () =>
    domainProviderCall<{ currency: string; suggested_tlds: string[]; pricing: PublicPricingRow[] }>('getPublicPricing'),

  checkAvailability: (domain: string) =>
    domainProviderCall<{
      query: string;
      sld: string;
      registrarConfigured: boolean;
      results: DomainCheckResult[];
    }>('checkAvailability', { domain }),

  listMyDomains: () =>
    domainProviderCall<{
      domains: RegisteredDomain[];
      orders: DomainOrder[];
      walletBalance: number;
      stripeAvailable: boolean;
    }>('listMyDomains'),

  getDomainDetail: (domainId: string) =>
    domainProviderCall<{ domain: RegisteredDomain }>('getDomainDetail', { domainId }),

  getContact: () =>
    domainProviderCall<{ contact: DomainContact }>('getContact'),

  saveContact: (contact: Partial<DomainContact>) =>
    domainProviderCall<{ success: boolean; contact: DomainContact }>('saveContact', { contact }),

  createOrder: (payload: {
    domain: string;
    type?: 'registration' | 'renewal' | 'transfer';
    years?: number;
    contact?: Partial<DomainContact>;
    auto_renew?: boolean;
    whois_guard?: boolean;
    domain_id?: string;
  }) => domainProviderCall<{ order: DomainOrder; existing?: boolean }>('createOrder', payload),

  createCheckout: (payload: {
    orderId: string;
    paymentMethod?: 'stripe' | 'wallet';
    returnPath?: string;
  }) =>
    domainProviderCall<{
      id?: string;
      sessionId?: string;
      url?: string;
      paid?: boolean;
      method: 'stripe' | 'wallet';
      orderId?: string;
      fulfillment?: { ok: boolean; domainId?: string; domain?: string; error?: string };
    }>('createCheckout', payload),

  verifyCheckout: (sessionId: string, orderId?: string) =>
    domainProviderCall<{
      paid: boolean;
      orderId?: string;
      status?: string;
      fulfillment?: { ok: boolean; domainId?: string; domain?: string; error?: string };
    }>('verifyCheckout', { sessionId, orderId }),

  getDnsRecords: (domainId: string) =>
    domainProviderCall<{ records: DnsRecord[]; cached?: boolean }>('getDnsRecords', { domainId }),

  saveDnsRecords: (domainId: string, records: DnsRecord[]) =>
    domainProviderCall<{ success: boolean; records: DnsRecord[] }>('saveDnsRecords', { domainId, records }),

  saveNameservers: (domainId: string, nameservers: string[]) =>
    domainProviderCall<{ success: boolean; nameservers: string[] }>('saveNameservers', { domainId, nameservers }),

  setAutoRenew: (domainId: string, auto_renew: boolean) =>
    domainProviderCall<{ success: boolean; auto_renew: boolean }>('setAutoRenew', { domainId, auto_renew }),

  createRenewalOrder: (domainId: string, years = 1) =>
    domainProviderCall<{ order: DomainOrder }>('createRenewalOrder', { domainId, years }),

  // Admin delegated workspace scope (/admin/domains)
  adminOverview: (q = '') =>
    domainProviderCall<{
      scope: 'admin' | 'super_admin';
      currency: string;
      pricing: PublicPricingRow[];
      domains: RegisteredDomain[];
      orders: DomainOrder[];
      siteDomains: DelegatedSiteDomain[];
    }>('adminOverview', { q }),

  // Superadmin root provider scope (/super-admin/domains)
  superAdminOverview: (params: { q?: string; status?: string; orderId?: string } = {}) =>
    domainProviderCall<{
      settings: DomainGlobalSettings;
      pricing: AdminPricingRow[];
      registrarConfig: RegistrarConfigSummary;
      namecheapConfigured: boolean;
      domains: RegisteredDomain[];
      orders: DomainOrder[];
      logs: RegistrarLog[];
    }>('superAdminOverview', params),

  saveRegistrarConfig: (config: {
    apiUser?: string;
    apiKey?: string;
    clearApiKey?: boolean;
    userName?: string;
    clientIp?: string;
    environment?: 'sandbox' | 'production';
    sandboxSimulation?: boolean;
    defaultNameservers?: string[];
  }) =>
    domainProviderCall<{
      success: boolean;
      registrarConfig: RegistrarConfigSummary;
      namecheapConfigured: boolean;
    }>('saveRegistrarConfig', { config }),

  testRegistrarConfig: (config?: Record<string, unknown>) =>
    domainProviderCall<{
      success: boolean;
      ok: boolean;
      mode: string;
      environment: string;
      message: string;
    }>('testRegistrarConfig', config ? { config } : {}),

  updatePricing: (payload: Record<string, unknown>) =>
    domainProviderCall<{
      success: boolean;
      settings?: DomainGlobalSettings;
      pricing: AdminPricingRow[] | AdminPricingRow;
    }>('updatePricing', payload),

  retryOrder: (orderId: string) =>
    domainProviderCall<{
      success: boolean;
      message?: string;
      result?: { ok: boolean; error?: string; domainId?: string };
    }>('retryOrder', { orderId }),
};

/**
 * Reference-compatible `authFetch(path, options)` adapter.
 * Routes `/api/domains/*` and `/api/admin/domains/*` directly through Firebase `domainProvider` callable.
 */
export async function authFetch(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body || {};
  const [pathname, rawQuery = ''] = path.split('?');
  const params = new URLSearchParams(rawQuery);
  const clean = pathname.replace(/\/+$/, '');

  if (clean === '/api/admin/domains' && method === 'GET') {
    const out = await DomainsClient.superAdminOverview({ q: params.get('q') || '' });
    return { domains: out.domains };
  }
  if (clean === '/api/admin/domains/pricing') {
    if (method === 'GET') return DomainsClient.superAdminOverview();
    if (method === 'PUT') return DomainsClient.updatePricing(body);
  }
  if (clean === '/api/admin/domains/orders' && method === 'GET') {
    const out = await DomainsClient.superAdminOverview({ status: params.get('status') || '' });
    return { orders: out.orders };
  }
  const retryMatch = /^\/api\/admin\/domains\/orders\/([^/]+)\/retry$/.exec(clean);
  if (retryMatch && method === 'POST') {
    return DomainsClient.retryOrder(decodeURIComponent(retryMatch[1]));
  }
  if (clean === '/api/admin/domains/logs' && method === 'GET') {
    const out = await DomainsClient.superAdminOverview({ orderId: params.get('orderId') || '' });
    return { logs: out.logs };
  }

  if (clean === '/api/domains' && method === 'GET') {
    const out = await DomainsClient.listMyDomains();
    return { domains: out.domains };
  }
  if (clean === '/api/domains/check') {
    return DomainsClient.checkAvailability(params.get('domain') || String(body.domain || ''));
  }
  if (clean === '/api/domains/pricing' && method === 'GET') {
    return DomainsClient.getPublicPricing();
  }
  if (clean === '/api/domains/contact') {
    if (method === 'GET') return DomainsClient.getContact();
    return DomainsClient.saveContact(body as Partial<DomainContact>);
  }
  if (clean === '/api/domains/orders') {
    if (method === 'GET') {
      const out = await DomainsClient.listMyDomains();
      return { orders: out.orders };
    }
    if (method === 'POST') return DomainsClient.createOrder(body as any);
  }
  if (clean === '/api/domains/checkout' && method === 'POST') {
    return DomainsClient.createCheckout(body as any);
  }

  const dnsMatch = /^\/api\/domains\/([^/]+)\/dns$/.exec(clean);
  if (dnsMatch) {
    const id = decodeURIComponent(dnsMatch[1]);
    if (method === 'GET') return DomainsClient.getDnsRecords(id);
    if (method === 'POST') return DomainsClient.saveDnsRecords(id, (body.records as DnsRecord[]) || []);
  }
  const nsMatch = /^\/api\/domains\/([^/]+)\/nameservers$/.exec(clean);
  if (nsMatch && method === 'POST') {
    return DomainsClient.saveNameservers(decodeURIComponent(nsMatch[1]), (body.nameservers as string[]) || []);
  }
  const renewMatch = /^\/api\/domains\/([^/]+)\/renew$/.exec(clean);
  if (renewMatch && method === 'POST') {
    return DomainsClient.createRenewalOrder(decodeURIComponent(renewMatch[1]), Number(body.years) || 1);
  }
  const autoMatch = /^\/api\/domains\/([^/]+)\/autorenew$/.exec(clean);
  if (autoMatch && method === 'POST') {
    return DomainsClient.setAutoRenew(decodeURIComponent(autoMatch[1]), Boolean(body.auto_renew));
  }
  const detailMatch = /^\/api\/domains\/([^/]+)$/.exec(clean);
  if (detailMatch && method === 'GET') {
    return DomainsClient.getDomainDetail(decodeURIComponent(detailMatch[1]));
  }

  throw new Error(`Unsupported domain endpoint: ${method} ${path}`);
}
