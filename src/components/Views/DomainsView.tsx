import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  AlertCircle,
  Check,
  CreditCard,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import type { RootState } from '../../store';
import { useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import { DomainsClient } from '../../lib/domains/client';
import {
  CONTACT_FIELDS,
  DNS_RECORD_TYPES,
  POPULAR_TLDS,
  parseDomainInput,
  roundMoney,
  type DnsRecord,
  type DomainCheckResult,
  type DomainContact,
  type DomainOrder,
  type PublicPricingRow,
  type RegisteredDomain,
} from '../../lib/domains/constants';
import '../../pages/domains-provider.css';

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

export interface DomainsViewProps {
  /** Optional slot for connecting external/custom domains to Funnels & Websites in /dashboard/settings/domains */
  siteDomainsSlot?: React.ReactNode;
  siteDomainsCount?: number;
  onConnectRegisteredDomain?: (domainName: string) => void;
  returnPath?: string;
}

export const DomainsView: React.FC<DomainsViewProps> = ({
  siteDomainsSlot,
  siteDomainsCount = 0,
  onConnectRegisteredDomain,
  returnPath = '/dashboard/settings/domains',
}) => {
  const lang = useUILanguage();
  const isRTL = lang.startsWith('ar');
  const theme = useSelector((s: RootState) => s.ui.theme);
  const user = useSelector((s: RootState) => s.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();

  const t = useCallback((en: string, ar: string) => (isRTL ? ar : en), [isRTL]);

  const initialTab = useMemo(() => {
    const tabParam = searchParams.get('dtab');
    if (tabParam === 'my-domains' || tabParam === 'settings' || tabParam === 'site-domains' || tabParam === 'search') {
      return tabParam;
    }
    return 'search';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<'search' | 'my-domains' | 'site-domains' | 'settings'>(initialTab);

  // Search & Availability State
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<DomainCheckResult[]>([]);
  const [selectedYears, setSelectedYears] = useState<Record<string, number>>({});
  const [billingView, setBillingView] = useState<'monthly' | 'yearly'>('monthly');
  const [publicPricing, setPublicPricing] = useState<PublicPricingRow[]>([]);

  // Portfolio & Orders State
  const [domains, setDomains] = useState<RegisteredDomain[]>([]);
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [stripeAvailable, setStripeAvailable] = useState<boolean>(false);
  const [loadingList, setLoadingList] = useState(false);

  // Contact / WHOIS State
  const [contact, setContact] = useState<DomainContact>(EMPTY_CONTACT);
  const [savingContact, setSavingContact] = useState(false);
  const [contactPromptFor, setContactPromptFor] = useState<DomainCheckResult | null>(null);

  // Checkout Modal State
  const [checkoutOrder, setCheckoutOrder] = useState<DomainOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'wallet'>('stripe');
  const [checkingOut, setCheckingOut] = useState(false);
  const [registeringDomain, setRegisteringDomain] = useState('');

  // DNS & Nameserver Modals State
  const [dnsDomain, setDnsDomain] = useState<RegisteredDomain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsSaving, setDnsSaving] = useState(false);

  const [nsDomain, setNsDomain] = useState<RegisteredDomain | null>(null);
  const [nsValues, setNsValues] = useState<string[]>(['', '']);
  const [nsSaving, setNsSaving] = useState(false);

  const loadPortfolio = useCallback(async () => {
    if (!user?.id) return;
    setLoadingList(true);
    try {
      const [portfolio, contactRes, pricingRes] = await Promise.all([
        DomainsClient.listMyDomains(),
        DomainsClient.getContact().catch(() => ({ contact: EMPTY_CONTACT })),
        DomainsClient.getPublicPricing().catch(() => ({ currency: 'USD', suggested_tlds: [], pricing: [] })),
      ]);
      setDomains(portfolio.domains || []);
      setOrders(portfolio.orders || []);
      setWalletBalance(roundMoney(portfolio.walletBalance));
      setStripeAvailable(Boolean(portfolio.stripeAvailable));
      setPaymentMethod(portfolio.stripeAvailable ? 'stripe' : 'wallet');
      if (contactRes?.contact) {
        setContact(prev => ({ ...prev, ...contactRes.contact }));
      }
      if (pricingRes?.pricing?.length) {
        setPublicPricing(pricingRes.pricing);
      }
    } catch (err) {
      console.warn('Domains portfolio load notice:', err);
    } finally {
      setLoadingList(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  // Verify Stripe return (?stripe=success&kind=domain&session_id=cs_...)
  useEffect(() => {
    const stripeState = searchParams.get('stripe');
    const kind = searchParams.get('kind');
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id') || undefined;

    if (kind !== 'domain' || !stripeState) return;

    const cleanParams = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('stripe');
      next.delete('kind');
      next.delete('session_id');
      next.delete('order_id');
      setSearchParams(next, { replace: true });
    };

    if (stripeState === 'cancel') {
      showToast.info(t('Domain checkout was cancelled.', 'تم إلغاء عملية الدفع للنطاق.'));
      cleanParams();
      return;
    }

    if (stripeState === 'success' && sessionId) {
      void (async () => {
        try {
          const res = await DomainsClient.verifyCheckout(sessionId, orderId);
          if (res.paid) {
            if (res.fulfillment?.ok) {
              showToast.success(
                t(
                  'Payment confirmed and your domain is now registered!',
                  'تم تأكيد الدفع وتسجيل نطاقك بنجاح!'
                )
              );
            } else {
              showToast.info(
                res.fulfillment?.error ||
                  t(
                    'Payment received! Domain registration is being finalized.',
                    'تم استلام الدفع! جاري إتمام تفعيل النطاق.'
                  )
              );
            }
            setActiveTab('my-domains');
            await loadPortfolio();
          }
        } catch (err) {
          showToast.error(err instanceof Error ? err.message : t('Could not verify payment session.', 'تعذر التحقق من جلسة الدفع.'));
        } finally {
          cleanParams();
        }
      })();
    }
  }, [searchParams, setSearchParams, loadPortfolio, t]);

  const executeSearch = async (termOverride?: string) => {
    const raw = (termOverride ?? query).trim();
    if (!raw) return;
    setSearching(true);
    setSearchError('');
    try {
      const data = await DomainsClient.checkAvailability(raw);
      setResults(data.results || []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : t('Could not check domain availability.', 'تعذر فحص توفر النطاق.'));
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeSearch();
  };

  const handleTldChipClick = (tld: string) => {
    const parsed = parseDomainInput(query);
    const baseSld = parsed?.sld || 'mybrand';
    const nextQuery = `${baseSld}.${tld}`;
    setQuery(nextQuery);
    void executeSearch(nextQuery);
  };

  const startRegister = async (row: DomainCheckResult, contactOverride?: DomainContact) => {
    const years = selectedYears[row.domain] || 1;
    setRegisteringDomain(row.domain);
    try {
      const created = await DomainsClient.createOrder({
        domain: row.domain,
        type: 'registration',
        years,
        ...(contactOverride ? { contact: contactOverride } : {}),
      });
      setCheckoutOrder(created.order);
      setPaymentMethod(stripeAvailable ? 'stripe' : 'wallet');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/contact details|missing_contact|Domain Settings/i.test(msg)) {
        setContactPromptFor(row);
        showToast.info(
          t(
            'Complete registrant contact details once to register your domain.',
            'أكمل بيانات مالك النطاق مرة واحدة لإتمام التسجيل.'
          )
        );
      } else {
        showToast.error(msg || t('Could not start domain registration.', 'تعذر بدء طلب تسجيل النطاق.'));
      }
    } finally {
      setRegisteringDomain('');
    }
  };

  const handleSaveContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingContact(true);
    try {
      const res = await DomainsClient.saveContact(contact);
      setContact(res.contact);
      showToast.success(t('Registrant details saved successfully.', 'تم حفظ بيانات مالك النطاق بنجاح.'));
      if (contactPromptFor) {
        const pendingRow = contactPromptFor;
        setContactPromptFor(null);
        await startRegister(pendingRow, res.contact);
      }
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Please fill in all required contact fields.', 'يرجى تعبئة جميع الحقول الإلزامية.'));
    } finally {
      setSavingContact(false);
    }
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutOrder) return;
    setCheckingOut(true);
    try {
      const res = await DomainsClient.createCheckout({
        orderId: checkoutOrder.id,
        paymentMethod,
        returnPath,
      });

      if (res.method === 'stripe' && res.url) {
        window.location.href = res.url;
        return;
      }

      if (res.paid) {
        setCheckoutOrder(null);
        if (res.fulfillment?.ok) {
          showToast.success(
            t(
              `Domain ${checkoutOrder.domain} registered and activated!`,
              `تم شراء وتفعيل النطاق ${checkoutOrder.domain} بنجاح!`
            )
          );
        } else {
          showToast.info(
            res.fulfillment?.error ||
              t(
                'Payment completed! Domain fulfillment is queued with the registrar.',
                'تم الدفع بنجاح! طلب النطاق قيد التنفيذ لدى المسجّل.'
              )
          );
        }
        setActiveTab('my-domains');
        await loadPortfolio();
      }
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Checkout failed.', 'فشلت عملية الدفع.'));
    } finally {
      setCheckingOut(false);
    }
  };

  const openDnsModal = async (d: RegisteredDomain) => {
    setDnsDomain(d);
    setDnsLoading(true);
    try {
      const res = await DomainsClient.getDnsRecords(d.id);
      setDnsRecords(
        res.records?.length
          ? res.records
          : [{ name: '@', type: 'A', address: '76.76.21.21', ttl: '1799' }]
      );
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Could not load DNS records.', 'تعذر جلب سجلات DNS.'));
      setDnsRecords([{ name: '@', type: 'A', address: '76.76.21.21', ttl: '1799' }]);
    } finally {
      setDnsLoading(false);
    }
  };

  const applyPlatformDnsPreset = () => {
    setDnsRecords(prev => {
      const filtered = prev.filter(
        r => !((r.name === '@' && r.type === 'A') || (r.name === 'www' && r.type === 'CNAME'))
      );
      return [
        { name: '@', type: 'A', address: '76.76.21.21', ttl: '1799' },
        { name: 'www', type: 'CNAME', address: 'cname.vercel-dns.com', ttl: '1799' },
        ...filtered,
      ];
    });
    showToast.info(
      t(
        'Platform A & CNAME records added. Click Save Changes to publish.',
        'تمت إضافة سجلات المنصة (A و CNAME). اضغط حفظ التعديلات للتطبيق.'
      )
    );
  };

  const saveDnsModal = async () => {
    if (!dnsDomain) return;
    setDnsSaving(true);
    try {
      const res = await DomainsClient.saveDnsRecords(dnsDomain.id, dnsRecords);
      setDnsRecords(res.records || dnsRecords);
      showToast.success(t('DNS records updated successfully.', 'تم تحديث سجلات DNS بنجاح.'));
      setDnsDomain(null);
      await loadPortfolio();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Failed to update DNS records.', 'تعذر حفظ سجلات DNS.'));
    } finally {
      setDnsSaving(false);
    }
  };

  const openNameserversModal = (d: RegisteredDomain) => {
    setNsDomain(d);
    setNsValues(
      d.nameservers?.length >= 2
        ? [...d.nameservers]
        : ['dns1.registrar-servers.com', 'dns2.registrar-servers.com']
    );
  };

  const saveNameserversModal = async () => {
    if (!nsDomain) return;
    const cleaned = nsValues.map(s => s.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      showToast.error(t('Enter at least two nameservers.', 'أدخل خادمين (Nameservers) على الأقل.'));
      return;
    }
    setNsSaving(true);
    try {
      await DomainsClient.saveNameservers(nsDomain.id, cleaned);
      showToast.success(t('Nameservers updated successfully.', 'تم تحديث خوادم الأسماء بنجاح.'));
      setNsDomain(null);
      await loadPortfolio();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Failed to update nameservers.', 'تعذر تحديث خوادم الأسماء.'));
    } finally {
      setNsSaving(false);
    }
  };

  const toggleAutoRenew = async (d: RegisteredDomain) => {
    const next = !d.auto_renew;
    setDomains(prev => prev.map(item => (item.id === d.id ? { ...item, auto_renew: next } : item)));
    try {
      await DomainsClient.setAutoRenew(d.id, next);
      showToast.success(
        next
          ? t('Auto-renewal enabled.', 'تم تفعيل التجديد التلقائي.')
          : t('Auto-renewal disabled.', 'تم إيقاف التجديد التلقائي.')
      );
    } catch (err) {
      setDomains(prev => prev.map(item => (item.id === d.id ? { ...item, auto_renew: !next } : item)));
      showToast.error(err instanceof Error ? err.message : t('Update failed.', 'تعذر تحديث الإعداد.'));
    }
  };

  const startRenewDomain = async (d: RegisteredDomain) => {
    try {
      const res = await DomainsClient.createRenewalOrder(d.id, 1);
      setCheckoutOrder(res.order);
      setPaymentMethod(stripeAvailable ? 'stripe' : 'wallet');
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Could not create renewal order.', 'تعذر إنشاء طلب التجديد.'));
    }
  };

  return (
    <div className="dp-root" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Header & Navigation Tabs (Matches Reference Screenshot 2) */}
      <section className="dp-hero">
        <div className="dp-hero-top">
          <div>
            <h1 className="dp-hero-title">
              <Globe size={24} style={{ color: 'var(--dp-accent)' }} />
              <span>{t('Domains Hub & Registrar', 'مركز إدارة وشراء النطاقات')}</span>
            </h1>
            <p className="dp-hero-subtitle">
              {t(
                'Search live domain availability across 10+ extensions, register your custom brand domain, manage DNS & nameservers, and connect directly to your Upclick websites & funnels.',
                'ابحث عن توفر النطاقات، اشترِ دومينك الخاص، تحكم في سجلات DNS واربطه بمواقعك ومتاجرك على Upclick فوراً.'
              )}
            </p>
          </div>

          <div className="dp-hero-pills">
            <span className="dp-pill dp-pill-emerald">
              <Shield size={13} />
              {t('Free WHOIS Privacy', 'حماية الخصوصية مجاناً')}
            </span>
            <span className="dp-pill dp-pill-blue">
              <Zap size={13} />
              {t('Instant Site Connection', 'ربط فوري للمواقع')}
            </span>
          </div>
        </div>

        <div className="dp-tabs-bar">
          <div className="dp-tabs-list" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'search'}
              onClick={() => setActiveTab('search')}
              className={`dp-tab-btn ${activeTab === 'search' ? 'is-active' : ''}`}
            >
              <Search size={15} />
              <span>{t('Search & Buy Domains', 'بحث وشراء النطاقات')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'my-domains'}
              onClick={() => setActiveTab('my-domains')}
              className={`dp-tab-btn ${activeTab === 'my-domains' ? 'is-active' : ''}`}
            >
              <Globe size={15} />
              <span>{t('My Registered Domains', 'نطاقاتي المسجلة')}</span>
              {domains.length > 0 && <span className="dp-tab-count">{domains.length}</span>}
            </button>

            {siteDomainsSlot && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'site-domains'}
                onClick={() => setActiveTab('site-domains')}
                className={`dp-tab-btn ${activeTab === 'site-domains' ? 'is-active' : ''}`}
              >
                <Link2 size={15} />
                <span>{t('Connect Funnels & Websites', 'ربط المواقع والفانلز')}</span>
                {siteDomainsCount > 0 && <span className="dp-tab-count">{siteDomainsCount}</span>}
              </button>
            )}

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              className={`dp-tab-btn ${activeTab === 'settings' ? 'is-active' : ''}`}
            >
              <Settings size={15} />
              <span>{t('Registrant & WHOIS Settings', 'بيانات المالك والإعدادات')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadPortfolio()}
            className="dp-btn dp-btn-sm"
            title={t('Refresh', 'تحديث')}
          >
            <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} />
            <span>{t('Refresh', 'تحديث')}</span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          TAB 1: SEARCH & BUY DOMAINS
          ===================================================================== */}
      {activeTab === 'search' && (
        <>
          <div className="dp-card">
            <form onSubmit={handleSearchSubmit} className="dp-search-form">
              <div className="dp-search-input-wrap">
                <Search size={18} className="dp-search-icon" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t(
                    'Find your perfect domain (e.g. mybrand.com or mystore)...',
                    'ابحث عن اسم نطاقك المثالي (مثال: mybrand.com أو mystore)...'
                  )}
                  className="dp-input dp-search-input"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="dp-btn dp-btn-primary"
                style={{ height: 48, paddingInline: 24, fontSize: 14 }}
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                <span>
                  {searching
                    ? t('Checking Availability…', 'جاري فحص التوفر…')
                    : t('Search Domain', 'بحث النطاق')}
                </span>
              </button>
            </form>

            {/* Popular TLD Chips */}
            <div className="dp-tld-chips">
              <span style={{ fontSize: 12, color: 'var(--dp-text-muted)', fontWeight: 600 }}>
                {t('Popular extensions:', 'امتدادات مقترحة:')}
              </span>
              {POPULAR_TLDS.map(tld => {
                const rowPrice = publicPricing.find(p => p.extension === tld);
                return (
                  <button
                    key={tld}
                    type="button"
                    onClick={() => handleTldChipClick(tld)}
                    className="dp-tld-chip"
                    title={rowPrice ? `$${rowPrice.registration_price}/yr` : undefined}
                  >
                    .{tld}
                  </button>
                );
              })}
            </div>

            {/* Price Display Toggle Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px solid var(--dp-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--dp-text-muted)' }}>
                <Sparkles size={14} style={{ color: 'var(--dp-amber)' }} />
                <span>
                  {t(
                    'All domains include free WHOIS privacy, DNS management & SSL certificate.',
                    'جميع النطاقات تشمل حماية الخصوصية وإدارة DNS وشهادة SSL مجاناً.'
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>
                  {t('Price display:', 'طريقة عرض السعر:')}
                </span>
                <div
                  style={{
                    display: 'inline-flex',
                    padding: 3,
                    borderRadius: 10,
                    background: 'var(--dp-card-alt)',
                    border: '1px solid var(--dp-border)',
                    gap: 3,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setBillingView('monthly')}
                    className={`dp-btn dp-btn-sm ${billingView === 'monthly' ? 'dp-btn-primary' : ''}`}
                    style={{ border: 'none', padding: '4px 10px' }}
                  >
                    {t('Monthly (/mo)', 'شهرياً (يعادل)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingView('yearly')}
                    className={`dp-btn dp-btn-sm ${billingView === 'yearly' ? 'dp-btn-primary' : ''}`}
                    style={{ border: 'none', padding: '4px 10px' }}
                  >
                    {t('Yearly (/yr)', 'سنوياً')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {searchError && (
            <div className="dp-alert dp-alert-red">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={17} />
                <span>{searchError}</span>
              </div>
            </div>
          )}

          {results.length > 0 ? (
            <div className="dp-card-flush">
              <div className="dp-card-header">
                <div>
                  <h3 className="dp-card-title">
                    {t('Domain Availability Results', 'نتائج توفر النطاقات')}
                  </h3>
                  <p className="dp-card-desc">
                    {t(
                      'Select registration duration and claim your domain instantly.',
                      'اختر مدة التسجيل واحجز نطاقك فوراً.'
                    )}
                  </p>
                </div>
                <span className="dp-pill dp-pill-emerald">
                  {results.filter(r => r.available).length} {t('available', 'متاح')}
                </span>
              </div>

              <div className="dp-result-list">
                {results.map(row => {
                  const years = selectedYears[row.domain] || 1;
                  const regPriceYearly = Number(row.registration_price || 0);
                  const regPriceMonthly = roundMoney(regPriceYearly / 12);
                  const totalPrice = roundMoney(regPriceYearly * years);
                  const isBusy = registeringDomain === row.domain;

                  return (
                    <div key={row.domain} className="dp-result-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                        <div
                          className="dp-mono"
                          style={{
                            minWidth: 48,
                            height: 44,
                            padding: '0 10px',
                            borderRadius: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 12.5,
                            background: row.available ? 'var(--dp-emerald-soft)' : 'var(--dp-card-alt)',
                            color: row.available ? 'var(--dp-emerald)' : 'var(--dp-text-muted)',
                            border: '1px solid var(--dp-border)',
                          }}
                        >
                          .{row.extension}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span
                              className="dp-mono"
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                textDecoration: row.available ? 'none' : 'line-through',
                                opacity: row.available ? 1 : 0.55,
                              }}
                            >
                              {row.domain}
                            </span>

                            {row.available ? (
                              <span className="dp-pill dp-pill-emerald" style={{ padding: '2px 9px', fontSize: 11 }}>
                                <Check size={11} />
                                {t('Available for Registration', 'متاح للتسجيل')}
                              </span>
                            ) : (
                              <span className="dp-pill" style={{ padding: '2px 9px', fontSize: 11, background: 'var(--dp-card-alt)', color: 'var(--dp-text-muted)' }}>
                                {row.unsupported ? t('Unsupported TLD', 'غير مدعوم') : t('Unavailable', 'غير متاح')}
                              </span>
                            )}

                            {row.isPremium && (
                              <span className="dp-pill dp-pill-amber" style={{ padding: '2px 9px', fontSize: 11 }}>
                                {t('Premium', 'نطاق مميز')}
                              </span>
                            )}
                          </div>

                          {row.available && (
                            <div style={{ fontSize: 11.5, color: 'var(--dp-text-muted)', marginTop: 3 }}>
                              {t(
                                `Renews at $${Number(row.renewal_price || regPriceYearly).toFixed(2)}/yr · Free SSL & WHOIS Privacy`,
                                `التجديد بسعر $${Number(row.renewal_price || regPriceYearly).toFixed(2)} سنوياً · شهادة SSL وحماية خصوصية مجاناً`
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {row.available && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                            {billingView === 'monthly' ? (
                              <>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>
                                  ${regPriceMonthly.toFixed(2)}
                                  <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--dp-text-muted)' }}>
                                    {' '}
                                    / {t('mo', 'شهر')}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--dp-text-muted)' }}>
                                  {t(
                                    `Billed $${totalPrice.toFixed(2)} for ${years} yr`,
                                    `تُدفع $${totalPrice.toFixed(2)} لمدة ${years} سنة`
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>
                                  ${totalPrice.toFixed(2)}
                                  <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--dp-text-muted)' }}>
                                    {' '}
                                    / {years === 1 ? t('yr', 'سنة') : `${years} ${t('yrs', 'سنوات')}`}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--dp-text-muted)' }}>
                                  ≈ ${(totalPrice / (years * 12)).toFixed(2)}/{t('mo', 'شهرياً')}
                                </div>
                              </>
                            )}
                          </div>

                          <select
                            value={years}
                            onChange={e =>
                              setSelectedYears(prev => ({
                                ...prev,
                                [row.domain]: Number(e.target.value),
                              }))
                            }
                            className="dp-select dp-input-sm"
                            aria-label={t('Registration years', 'سنوات التسجيل')}
                          >
                            <option value={1}>{t('1 Year', 'سنة واحدة')}</option>
                            <option value={2}>{t('2 Years', 'سنتان')}</option>
                            <option value={3}>{t('3 Years', '3 سنوات')}</option>
                            <option value={5}>{t('5 Years', '5 سنوات')}</option>
                          </select>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void startRegister(row)}
                            className="dp-btn dp-btn-primary"
                          >
                            {isBusy ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                            <span>{t('Register Domain', 'تسجيل النطاق')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            !searching && (
              <div className="dp-card" style={{ textAlign: 'center', padding: '52px 24px' }}>
                <Globe size={42} style={{ margin: '0 auto 14px', color: 'var(--dp-text-muted)', opacity: 0.45 }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                  {t(
                    'Search any domain name above to verify instant availability',
                    'ابحث عن أي اسم نطاق في الأعلى للتحقق من توفره فوراً'
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--dp-text-muted)' }}>
                  {t(
                    'We check live availability across 10+ extensions simultaneously.',
                    'نفحص النطاق مباشرة عبر أكثر من 10 امتدادات في نفس اللحظة.'
                  )}
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* =====================================================================
          TAB 2: MY REGISTERED DOMAINS & ORDERS
          ===================================================================== */}
      {activeTab === 'my-domains' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {loadingList ? (
            <div className="dp-card" style={{ textAlign: 'center', padding: 48 }}>
              <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--dp-accent)' }} />
              <div style={{ fontSize: 13.5, color: 'var(--dp-text-muted)' }}>
                {t('Loading your registered domains…', 'جاري تحميل نطاقاتك المسجلة…')}
              </div>
            </div>
          ) : domains.length === 0 ? (
            <div className="dp-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Globe size={40} style={{ margin: '0 auto 12px', color: 'var(--dp-text-muted)', opacity: 0.45 }} />
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {t('No registered domains yet', 'لا توجد نطاقات مسجلة بعد')}
              </div>
              <p style={{ fontSize: 13, color: 'var(--dp-text-muted)', margin: '0 0 18px' }}>
                {t(
                  'Search and register your first custom domain to launch your brand.',
                  'ابحث وسجّل أول نطاق مخصص لعلامتك التجارية الآن.'
                )}
              </p>
              <button type="button" onClick={() => setActiveTab('search')} className="dp-btn dp-btn-primary">
                <Search size={15} />
                <span>{t('Find a Domain', 'ابحث عن نطاق الآن')}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {domains.map(d => (
                <div
                  key={d.id}
                  className="dp-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className="dp-mono" style={{ fontSize: 17, fontWeight: 800 }}>
                        {d.domain}
                      </span>
                      <span
                        className={`dp-pill ${d.status === 'active' ? 'dp-pill-emerald' : 'dp-pill-amber'}`}
                        style={{ padding: '2px 10px', fontSize: 11 }}
                      >
                        {d.status === 'active' ? t('Active', 'نشط') : d.status}
                      </span>
                      <a
                        href={`https://${d.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--dp-text-muted)', display: 'inline-flex' }}
                        title={t('Open domain in browser', 'فتح النطاق في المتصفح')}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--dp-text-muted)', marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>
                        {t('Expires:', 'ينتهي في:')}{' '}
                        <strong style={{ color: 'var(--dp-text-secondary)' }}>
                          {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : '—'}
                        </strong>
                      </span>
                      {d.nameservers?.length > 0 && (
                        <span className="dp-mono">NS: {d.nameservers.slice(0, 2).join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 12,
                        cursor: 'pointer',
                        padding: '6px 11px',
                        borderRadius: 9,
                        border: '1px solid var(--dp-border)',
                        background: 'var(--dp-card-alt)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(d.auto_renew)}
                        onChange={() => void toggleAutoRenew(d)}
                      />
                      <span>{t('Auto-renew', 'تجديد تلقائي')}</span>
                    </label>

                    <button type="button" onClick={() => void openDnsModal(d)} className="dp-btn dp-btn-sm">
                      <Server size={13} />
                      <span>{t('DNS Records', 'سجلات DNS')}</span>
                    </button>

                    <button type="button" onClick={() => openNameserversModal(d)} className="dp-btn dp-btn-sm">
                      <Globe size={13} />
                      <span>{t('Nameservers', 'خوادم الأسماء')}</span>
                    </button>

                    {onConnectRegisteredDomain && (
                      <button
                        type="button"
                        onClick={() => {
                          onConnectRegisteredDomain(d.domain);
                          if (siteDomainsSlot) setActiveTab('site-domains');
                        }}
                        className="dp-btn dp-btn-sm"
                        style={{ color: 'var(--dp-accent)', borderColor: 'var(--dp-accent-soft)' }}
                      >
                        <Link2 size={13} />
                        <span>{t('Connect to Funnel/Site', 'ربط بموقع / فانل')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void startRenewDomain(d)}
                      className="dp-btn dp-btn-primary dp-btn-sm"
                    >
                      <RefreshCw size={13} />
                      <span>{t('Renew', 'تجديد')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Domain Orders History */}
          {orders.length > 0 && (
            <div className="dp-card-flush">
              <div className="dp-card-header">
                <h3 className="dp-card-title">{t('Domain Orders & Billing History', 'سجل طلبات النطاقات')}</h3>
              </div>
              <div className="dp-table-wrap">
                <table className="dp-table">
                  <thead>
                    <tr>
                      <th>{t('Domain', 'النطاق')}</th>
                      <th>{t('Type', 'النوع')}</th>
                      <th>{t('Duration', 'المدة')}</th>
                      <th>{t('Amount', 'المبلغ')}</th>
                      <th>{t('Status', 'الحالة')}</th>
                      <th>{t('Date', 'التاريخ')}</th>
                      <th>{t('Action', 'إجراء')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td className="dp-mono" style={{ fontWeight: 700 }}>{o.domain}</td>
                        <td>
                          {o.type === 'renewal'
                            ? t('Renewal', 'تجديد')
                            : o.type === 'transfer'
                              ? t('Transfer', 'نقل')
                              : t('Registration', 'تسجيل جديد')}
                        </td>
                        <td>
                          {o.years || 1} {Number(o.years || 1) === 1 ? t('yr', 'سنة') : t('yrs', 'سنوات')}
                        </td>
                        <td style={{ fontWeight: 700 }}>${Number(o.customer_price || 0).toFixed(2)}</td>
                        <td>
                          <span
                            className={`dp-pill ${
                              o.status === 'completed'
                                ? 'dp-pill-emerald'
                                : o.status === 'failed'
                                  ? 'dp-pill-red'
                                  : 'dp-pill-amber'
                            }`}
                            style={{ padding: '2px 9px', fontSize: 11 }}
                          >
                            {o.status === 'completed'
                              ? t('Completed', 'مكتمل')
                              : o.status === 'failed'
                                ? t('Failed', 'فشل')
                                : o.status === 'pending'
                                  ? t('Awaiting Payment', 'بانتظار الدفع')
                                  : o.status}
                          </span>
                          {o.error_public && (
                            <div style={{ fontSize: 11, color: 'var(--dp-red)', marginTop: 4 }}>{o.error_public}</div>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>
                          {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          {o.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => setCheckoutOrder(o)}
                              className="dp-btn dp-btn-primary dp-btn-sm"
                            >
                              <CreditCard size={12} />
                              <span>{t('Complete Payment', 'إتمام الدفع')}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: CONNECT EXTERNAL / SITE DOMAINS (FUNNELS & WEBSITES)
          ===================================================================== */}
      {activeTab === 'site-domains' && siteDomainsSlot && (
        <div>{siteDomainsSlot}</div>
      )}

      {/* =====================================================================
          TAB 4: REGISTRANT & WHOIS SETTINGS
          ===================================================================== */}
      {activeTab === 'settings' && (
        <form onSubmit={e => void handleSaveContact(e)} className="dp-card">
          <div style={{ marginBottom: 18 }}>
            <h3 className="dp-card-title">
              <Shield size={18} style={{ color: 'var(--dp-emerald)' }} />
              <span>{t('ICANN Registrant Contact & WHOIS Privacy', 'بيانات مالك النطاق وحماية الخصوصية (ICANN)')}</span>
            </h3>
            <p className="dp-card-desc">
              {t(
                'Required by ICANN for all domain registrations. Free WHOIS Privacy Protection keeps your personal details hidden from public directories.',
                'بيانات مطلوبة دولياً لتسجيل النطاقات باسمك رسمياً. يتم تفعيل خدمة إخفاء الهوية (WHOIS Privacy) مجاناً لحماية بياناتك الشخصية.'
              )}
            </p>
          </div>

          <div className="dp-form-grid">
            {CONTACT_FIELDS.map(f => (
              <div key={f.key}>
                <label className="dp-label">
                  {isRTL ? f.labelAr : f.labelEn}{' '}
                  {f.required && <span style={{ color: 'var(--dp-red)' }}>*</span>}
                </label>
                <input
                  type={f.key === 'email' ? 'email' : 'text'}
                  required={f.required}
                  placeholder={f.placeholder || ''}
                  value={contact[f.key] || ''}
                  onChange={e => setContact(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="dp-input"
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={savingContact} className="dp-btn dp-btn-primary">
              {savingContact ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              <span>{t('Save Registrant Details', 'حفظ بيانات المالك')}</span>
            </button>
          </div>
        </form>
      )}

      {/* =====================================================================
          MODAL 1: INLINE CONTACT PROMPT BEFORE CHECKOUT
          ===================================================================== */}
      {contactPromptFor &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="dp-theme-scope dp-modal-backdrop" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="dp-modal dp-modal-lg" role="dialog" aria-modal="true">
              <div className="dp-modal-head">
                <div>
                  <h3 className="dp-card-title">
                    {t('Complete Registrant Details', 'إكمال بيانات مالك النطاق')}
                  </h3>
                  <p className="dp-card-desc">
                    {t(
                      `Required once to register ${contactPromptFor.domain}`,
                      `مطلوبة مرة واحدة فقط لإتمام تسجيل ${contactPromptFor.domain}`
                    )}
                  </p>
                </div>
                <button type="button" onClick={() => setContactPromptFor(null)} className="dp-btn dp-btn-sm">
                  <X size={16} />
                </button>
              </div>
              <div className="dp-modal-body">
                <div className="dp-form-grid">
                  {CONTACT_FIELDS.map(f => (
                    <div key={f.key}>
                      <label className="dp-label">
                        {isRTL ? f.labelAr : f.labelEn}{' '}
                        {f.required && <span style={{ color: 'var(--dp-red)' }}>*</span>}
                      </label>
                      <input
                        type={f.key === 'email' ? 'email' : 'text'}
                        placeholder={f.placeholder || ''}
                        value={contact[f.key] || ''}
                        onChange={e => setContact(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="dp-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="dp-modal-foot">
                <button type="button" onClick={() => setContactPromptFor(null)} className="dp-btn">
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  type="button"
                  disabled={savingContact}
                  onClick={() => void handleSaveContact()}
                  className="dp-btn dp-btn-primary"
                >
                  {savingContact ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  <span>{t('Save & Continue to Checkout', 'حفظ والمتابعة للدفع')}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================================
          MODAL 2: DOMAIN CHECKOUT (STRIPE CARD OR WALLET BALANCE)
          ===================================================================== */}
      {checkoutOrder &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="dp-theme-scope dp-modal-backdrop" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="dp-modal" role="dialog" aria-modal="true">
              <div className="dp-modal-head">
                <div>
                  <h3 className="dp-card-title">
                    <CreditCard size={18} style={{ color: 'var(--dp-accent)' }} />
                    <span>{t('Complete Domain Purchase', 'إتمام شراء النطاق')}</span>
                  </h3>
                  <p className="dp-card-desc">
                    {checkoutOrder.type === 'renewal'
                      ? t('Domain Renewal Order', 'طلب تجديد النطاق')
                      : t('Instant Domain Registration + Free WHOIS Privacy', 'تسجيل فوري للنطاق + حماية خصوصية مجاناً')}
                  </p>
                </div>
                <button type="button" onClick={() => setCheckoutOrder(null)} className="dp-btn dp-btn-sm">
                  <X size={16} />
                </button>
              </div>

              <div className="dp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: 'var(--dp-card-alt)',
                    border: '1px solid var(--dp-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div className="dp-mono" style={{ fontSize: 17, fontWeight: 800 }}>
                      {checkoutOrder.domain}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--dp-text-muted)', marginTop: 3 }}>
                      {checkoutOrder.years || 1}{' '}
                      {Number(checkoutOrder.years || 1) === 1 ? t('Year', 'سنة') : t('Years', 'سنوات')} ·{' '}
                      {t('Includes SSL & DNS Management', 'شامل إدارة DNS وشهادة SSL')}
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--dp-accent)' }}>
                    ${Number(checkoutOrder.customer_price || 0).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="dp-label">{t('Choose Payment Method', 'اختر وسيلة الدفع')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('stripe')}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        border:
                          paymentMethod === 'stripe'
                            ? '2px solid var(--dp-accent)'
                            : '1px solid var(--dp-border)',
                        background: paymentMethod === 'stripe' ? 'var(--dp-accent-soft)' : 'var(--dp-card-alt)',
                        color: 'var(--dp-text)',
                        textAlign: 'start',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5 }}>
                        <CreditCard size={16} style={{ color: 'var(--dp-accent)' }} />
                        <span>{t('Credit / Debit Card', 'البطاقة البنكية (Stripe)')}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--dp-text-muted)', marginTop: 4 }}>
                        {t('Instant secure Stripe checkout', 'دفع فوري آمن عبر بوابة Stripe')}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wallet')}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        border:
                          paymentMethod === 'wallet'
                            ? '2px solid var(--dp-emerald)'
                            : '1px solid var(--dp-border)',
                        background: paymentMethod === 'wallet' ? 'var(--dp-emerald-soft)' : 'var(--dp-card-alt)',
                        color: 'var(--dp-text)',
                        textAlign: 'start',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5 }}>
                        <Wallet size={16} style={{ color: 'var(--dp-emerald)' }} />
                        <span>{t('Wallet Balance', 'رصيد المحفظة')}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--dp-text-muted)', marginTop: 4 }}>
                        {t('Available:', 'الرصيد المتاح:')} <strong>${walletBalance.toFixed(2)}</strong>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="dp-modal-foot">
                <button type="button" onClick={() => setCheckoutOrder(null)} className="dp-btn">
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  type="button"
                  disabled={checkingOut}
                  onClick={() => void handleConfirmCheckout()}
                  className="dp-btn dp-btn-primary"
                >
                  {checkingOut ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  <span>
                    {paymentMethod === 'stripe'
                      ? t(
                          `Proceed to Card Checkout ($${Number(checkoutOrder.customer_price || 0).toFixed(2)})`,
                          `المتابعة للدفع بالبطاقة ($${Number(checkoutOrder.customer_price || 0).toFixed(2)})`
                        )
                      : t(
                          `Pay $${Number(checkoutOrder.customer_price || 0).toFixed(2)} from Wallet`,
                          `دفع $${Number(checkoutOrder.customer_price || 0).toFixed(2)} من المحفظة`
                        )}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================================
          MODAL 3: DNS RECORDS EDITOR
          ===================================================================== */}
      {dnsDomain &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="dp-theme-scope dp-modal-backdrop" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="dp-modal dp-modal-lg" role="dialog" aria-modal="true">
              <div className="dp-modal-head">
                <div>
                  <h3 className="dp-card-title">
                    <Server size={18} style={{ color: 'var(--dp-accent)' }} />
                    <span>
                      {t('DNS Records Manager', 'إدارة سجلات DNS')} —{' '}
                      <span className="dp-mono">{dnsDomain.domain}</span>
                    </span>
                  </h3>
                  <p className="dp-card-desc">
                    {t(
                      'Configure A, CNAME, MX, and TXT records for your domain.',
                      'إضافة وتعديل سجلات A و CNAME و MX و TXT الخاصة بنطاقك.'
                    )}
                  </p>
                </div>
                <button type="button" onClick={() => setDnsDomain(null)} className="dp-btn dp-btn-sm">
                  <X size={16} />
                </button>
              </div>

              <div className="dp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <button type="button" onClick={applyPlatformDnsPreset} className="dp-btn dp-btn-sm" style={{ color: 'var(--dp-accent)' }}>
                    <Zap size={13} />
                    <span>{t('Auto-fill Upclick Site Records (A + CNAME)', 'تعبئة تلقائية لربط مواقع المنصة (A + CNAME)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDnsRecords(prev => [...prev, { name: '@', type: 'A', address: '', ttl: '1799' }])
                    }
                    className="dp-btn dp-btn-sm"
                  >
                    <Plus size={13} />
                    <span>{t('Add Record', 'إضافة سجل جديد')}</span>
                  </button>
                </div>

                {dnsLoading ? (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', color: 'var(--dp-accent)' }} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dnsRecords.map((rec, i) => (
                      <div key={i} className="dp-dns-row">
                        <input
                          placeholder="@ / www"
                          value={rec.name}
                          onChange={e =>
                            setDnsRecords(prev =>
                              prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x))
                            )
                          }
                          className="dp-input dp-input-sm dp-mono"
                        />
                        <select
                          value={rec.type}
                          onChange={e =>
                            setDnsRecords(prev =>
                              prev.map((x, idx) => (idx === i ? { ...x, type: e.target.value } : x))
                            )
                          }
                          className="dp-select dp-input-sm"
                        >
                          {DNS_RECORD_TYPES.map(tp => (
                            <option key={tp} value={tp}>
                              {tp}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder={t('Value / Target IP or Host', 'القيمة / الهدف (IP أو Host)')}
                          value={rec.address}
                          onChange={e =>
                            setDnsRecords(prev =>
                              prev.map((x, idx) => (idx === i ? { ...x, address: e.target.value } : x))
                            )
                          }
                          className="dp-input dp-input-sm dp-mono"
                        />
                        <input
                          placeholder="TTL"
                          value={rec.ttl || '1799'}
                          onChange={e =>
                            setDnsRecords(prev =>
                              prev.map((x, idx) => (idx === i ? { ...x, ttl: e.target.value } : x))
                            )
                          }
                          className="dp-input dp-input-sm dp-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setDnsRecords(prev => prev.filter((_, idx) => idx !== i))}
                          className="dp-btn dp-btn-danger dp-btn-sm"
                          style={{ padding: 7 }}
                          title={t('Remove record', 'حذف السجل')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dp-modal-foot">
                <button type="button" onClick={() => setDnsDomain(null)} className="dp-btn">
                  {t('Cancel', 'إلغاء')}
                </button>
                <button type="button" disabled={dnsSaving} onClick={() => void saveDnsModal()} className="dp-btn dp-btn-primary">
                  {dnsSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  <span>{t('Save DNS Records', 'حفظ التعديلات')}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================================
          MODAL 4: CUSTOM NAMESERVERS EDITOR
          ===================================================================== */}
      {nsDomain &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="dp-theme-scope dp-modal-backdrop" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="dp-modal" role="dialog" aria-modal="true">
              <div className="dp-modal-head">
                <div>
                  <h3 className="dp-card-title">
                    <Globe size={18} style={{ color: 'var(--dp-accent)' }} />
                    <span>
                      {t('Custom Nameservers', 'خوادم الأسماء المخصصة')} —{' '}
                      <span className="dp-mono">{nsDomain.domain}</span>
                    </span>
                  </h3>
                </div>
                <button type="button" onClick={() => setNsDomain(null)} className="dp-btn dp-btn-sm">
                  <X size={16} />
                </button>
              </div>

              <div className="dp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {nsValues.map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input
                      placeholder={`ns${i + 1}.example.com`}
                      value={v}
                      onChange={e =>
                        setNsValues(prev => prev.map((x, idx) => (idx === i ? e.target.value : x)))
                      }
                      className="dp-input dp-mono"
                      style={{ flex: 1 }}
                    />
                    {nsValues.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setNsValues(prev => prev.filter((_, idx) => idx !== i))}
                        className="dp-btn dp-btn-danger dp-btn-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setNsValues(prev => [...prev, ''])}
                  className="dp-btn dp-btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Plus size={13} />
                  <span>{t('Add Nameserver', 'إضافة خادم إضافي')}</span>
                </button>
              </div>

              <div className="dp-modal-foot">
                <button type="button" onClick={() => setNsDomain(null)} className="dp-btn">
                  {t('Cancel', 'إلغاء')}
                </button>
                <button type="button" disabled={nsSaving} onClick={() => void saveNameserversModal()} className="dp-btn dp-btn-primary">
                  {nsSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  <span>{t('Update Nameservers', 'حفظ خوادم الأسماء')}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DomainsView;
