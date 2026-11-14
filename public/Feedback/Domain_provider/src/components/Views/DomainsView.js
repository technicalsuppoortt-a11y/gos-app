'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Plus,
  Trash2,
  ShieldCheck,
  Zap,
  Sparkles,
  Calendar,
  Lock,
  ArrowRight,
  ExternalLink,
  Settings,
  CreditCard,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '@/lib/domains/client';

function money(n, currency = 'USD') {
  const v = Number(n) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString();
}

const POPULAR_TLDS = ['com', 'net', 'org', 'ai', 'co', 'io', 'store', 'app', 'dev', 'online'];

const CONTACT_FIELDS = [
  ['firstName', 'First Name', 'الاسم الأول'],
  ['lastName', 'Last Name', 'اسم العائلة'],
  ['organization', 'Organization / Company (Optional)', 'الشركة / المنظمة (اختياري)'],
  ['address1', 'Street Address', 'العنوان بالكامل'],
  ['city', 'City', 'المدينة'],
  ['state', 'State / Province', 'المحافظة / الولاية'],
  ['postalCode', 'Postal Code', 'الرمز البريدي'],
  ['country', 'Country Code (e.g. EG, SA, AE, US)', 'رمز الدولة (EG, SA, US)'],
  ['phone', 'Phone Number (with country code)', 'رقم الهاتف (مع كود الدولة)'],
  ['email', 'Email Address', 'البريد الإلكتروني']
];

export default function DomainsView() {
  const { currentPage, setCurrentPage, lang, showToast } = useBusiness();
  const { user } = useAuth();
  const isRtl = lang === 'ar';
  const isRTL = isRtl;

  // Active Tab inside unified Domains Hub
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'my-domains' | 'pricing' | 'settings'

  // Pricing display mode: 'yearly' | 'monthly'
  const [billingView, setBillingView] = useState('monthly');

  // Search state
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedYears, setSelectedYears] = useState({}); // domain -> years (1, 2, 3, 5)

  // Data states
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState([]);
  const [pricingSearch, setPricingSearch] = useState('');
  const [domains, setDomains] = useState([]);
  const [orders, setOrders] = useState([]);
  const [contact, setContact] = useState({});
  const [busyId, setBusyId] = useState('');

  // Modal & Management state
  const [manage, setManage] = useState(null);
  const [dns, setDns] = useState([]);
  const [nsText, setNsText] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [pendingDomainRow, setPendingDomainRow] = useState(null);

  const L = (en, ar) => (isRtl ? ar : en);

  // Sync internal tab if URL/currentPage was set to a legacy sub-page
  useEffect(() => {
    if (currentPage === 'my-domains') setActiveTab('my-domains');
    else if (currentPage === 'domain-settings') setActiveTab('settings');
    else if (currentPage === 'domains' || currentPage === 'domain-pricing') setActiveTab('search');
  }, [currentPage]);

  const loadMine = async () => {
    try {
      const [d, o] = await Promise.all([
        authFetch('/api/domains'),
        authFetch('/api/domains/orders')
      ]);
      setDomains(d.domains || []);
      setOrders(o.orders || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadContact = async () => {
    try {
      const d = await authFetch('/api/domains/contact');
      setContact(d.contact || {});
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'my-domains') loadMine();
    if (activeTab === 'settings') loadContact();
  }, [activeTab, user]);

  const search = async (e, customTerm) => {
    e?.preventDefault?.();
    const term = (customTerm !== undefined ? customTerm : query).trim();
    if (!term) return;
    setError('');
    setSearching(true);
    try {
      const data = await authFetch(`/api/domains/check?domain=${encodeURIComponent(term)}`);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleQuickTldChip = (tld) => {
    let clean = query.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (clean.includes('.')) {
      clean = clean.split('.')[0];
    }
    const target = `${clean || 'mybrand'}.${tld}`;
    setQuery(target);
    search(null, target);
  };

  const startRegister = async (row) => {
    setBusyId(row.domain);
    setError('');
    const years = selectedYears[row.domain] || 1;
    try {
      const created = await authFetch('/api/domains/orders', {
        method: 'POST',
        body: { domain: row.domain, type: 'registration', years }
      });
      const checkout = await authFetch('/api/domains/checkout', {
        method: 'POST',
        body: { orderId: created.order.id }
      });
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }
      throw new Error('Checkout URL missing');
    } catch (err) {
      if (/Domain Settings|contact|registrant/i.test(err.message)) {
        setPendingDomainRow(row);
        setShowContactModal(true);
        loadContact();
      } else {
        setError(err.message);
      }
    } finally {
      setBusyId('');
    }
  };

  const saveContact = async (e) => {
    e.preventDefault();
    setBusyId('contact');
    setError('');
    try {
      await authFetch('/api/domains/contact', { method: 'PUT', body: contact });
      if (showToast) showToast(L('Contact details saved successfully!', 'تم حفظ بيانات المالك بنجاح!'));
      if (showContactModal && pendingDomainRow) {
        setShowContactModal(false);
        startRegister(pendingDomainRow);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const openManage = async (row) => {
    setManage(row);
    setNsText((row.nameservers || []).join('\n'));
    setDns([]);
    try {
      const detail = await authFetch(`/api/domains/${row.id}`);
      setManage(detail.domain);
      setNsText((detail.domain.nameservers || []).join('\n'));
    } catch (err) {
      setError(err.message);
    }
  };

  const loadDns = async (id) => {
    const domainId = id || manage?.id;
    if (!domainId) return;
    setBusyId('dns');
    try {
      const data = await authFetch(`/api/domains/${domainId}/dns`);
      setDns(data.records?.length ? data.records : [{ name: '@', type: 'A', address: '', mxPref: '10', ttl: '1799' }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const saveNs = async () => {
    setBusyId('ns');
    try {
      const nameservers = nsText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const data = await authFetch(`/api/domains/${manage.id}/nameservers`, { method: 'POST', body: { nameservers } });
      setManage((prev) => ({ ...prev, nameservers: data.nameservers }));
      if (showToast) showToast(L('Nameservers updated', 'تم تحديث خوادم الأسماء'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const saveDns = async () => {
    setBusyId('dns-save');
    try {
      const data = await authFetch(`/api/domains/${manage.id}/dns`, { method: 'POST', body: { records: dns } });
      setDns(data.records || dns);
      if (showToast) showToast(L('DNS records saved', 'تم حفظ سجلات DNS'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const toggleRenew = async (row) => {
    setBusyId(`ar-${row.id}`);
    try {
      const data = await authFetch(`/api/domains/${row.id}/autorenew`, {
        method: 'POST',
        body: { auto_renew: !row.auto_renew }
      });
      setDomains((prev) => prev.map((d) => (d.id === row.id ? { ...d, auto_renew: data.auto_renew } : d)));
      if (manage?.id === row.id) setManage((p) => ({ ...p, auto_renew: data.auto_renew }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const renewDomain = async (row) => {
    setBusyId(`rn-${row.id}`);
    try {
      const created = await authFetch(`/api/domains/${row.id}/renew`, { method: 'POST', body: { years: 1 } });
      const checkout = await authFetch('/api/domains/checkout', { method: 'POST', body: { orderId: created.order.id } });
      if (checkout.url) window.location.href = checkout.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  // Filtered pricing catalog
  const filteredPricing = useMemo(() => {
    if (!pricingSearch.trim()) return pricing;
    return pricing.filter((p) => p.extension.toLowerCase().includes(pricingSearch.toLowerCase().replace(/^\./, '')));
  }, [pricing, pricingSearch]);

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* 🌟 Unified Hub Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(236,92,49,0.09) 0%, rgba(168,85,247,0.06) 100%)', borderColor: 'rgba(236,92,49,0.2)', padding: '24px 28px', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={22} style={{ color: 'var(--accent)' }} />
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text)' }}>
                {L('Domains Hub', 'مركز إدارة وشراء النطاقات')}
              </h1>
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--text2)', fontSize: 13.5 }}>
              {L(
                'Search domain availability, register custom URLs, manage DNS records, and connect to your UpKlick sites in seconds.',
                'ابحث عن توفر النطاقات، اشترِ دومينك الخاص، تحكم في سجلات DNS واربطه بمواقعك ومتاجرك على UpKlick فوراً.'
              )}
            </p>
          </div>

          {/* Feature Badges */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--green)', padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} />
              <span>{L('Free WHOIS Privacy', 'حماية الخصوصية مجاناً')}</span>
            </div>
            <div className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--blue)', padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} />
              <span>{L('Instant DNS Setup', 'ربط فوري للمواقع')}</span>
            </div>
          </div>
        </div>

        {/* 🧭 Unified Navigation Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 22, borderTop: '1px solid var(--line)', paddingTop: 16, flexWrap: 'wrap' }}>
          {[
            ['search', L('Search & Register', 'بحث وشراء النطاقات'), Search],
            ['my-domains', L('My Active Domains', 'نطاقاتي المسجلة'), Globe, domains.length],
            ['settings', L('Registrant & WHOIS Details', 'بيانات المالك والإعدادات'), Settings]
          ].map(([key, label, Icon, count]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm ${activeTab === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                setActiveTab(key);
                if (key === 'my-domains') loadMine();
                if (key === 'settings') loadContact();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: activeTab === key ? 800 : 500, padding: '8px 16px' }}
            >
              <Icon size={15} />
              <span>{label}</span>
              {count != null && count > 0 && (
                <span className="badge" style={{ background: activeTab === key ? 'rgba(255,255,255,0.2)' : 'var(--bg3)', fontSize: 11 }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔍 TAB 1: DOMAIN SEARCH & REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'search' && (
        <>
          {/* Hero Search Box */}
          <div className="card" style={{ padding: 26, margin: 0, position: 'relative', overflow: 'hidden' }}>
            <form onSubmit={search} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                <Search size={18} style={{ position: 'absolute', [isRTL ? 'right' : 'left']: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
                <input
                  className="inp"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={L('Find your perfect domain (e.g. mybrand.com or mystore)...', 'ابحث عن اسم نطاقك المثالي (مثال: mybrand.com أو mystore)...')}
                  style={{
                    paddingInlineStart: 44,
                    height: 52,
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 12,
                    border: '2px solid var(--line2)',
                    background: 'var(--bg)'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={searching}
                style={{ height: 52, padding: '0 28px', fontSize: 15, fontWeight: 900, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Search size={17} className={searching ? 'spin' : ''} />
                <span>{searching ? L('Checking Availability…', 'جاري فحص التوفر…') : L('Search Domain', 'بحث النطاق')}</span>
              </button>
            </form>

            {/* Popular TLD Quick Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{L('Popular extensions:', 'امتدادات مقترحة:')}</span>
              {POPULAR_TLDS.map((tld) => (
                <button
                  key={tld}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleQuickTldChip(tld)}
                  style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', background: 'var(--bg2)', borderRadius: 8 }}
                >
                  .{tld}
                </button>
              ))}
            </div>

            {/* Monthly vs Yearly Display Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={15} style={{ color: 'var(--accent)' }} />
                <span>{L('All domains include free WHOIS Privacy, DNS management, and instant SSL.', 'جميع النطاقات تشمل حماية الخصوصية وإدارة DNS وشهادة SSL مجاناً.')}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', padding: '3px 6px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <span style={{ fontSize: 11.5, color: 'var(--text3)', fontWeight: 700, padding: '0 4px' }}>{L('Price display:', 'طريقة عرض السعر:')}</span>
                <button
                  type="button"
                  className={`btn btn-sm ${billingView === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setBillingView('monthly')}
                  style={{ fontSize: 11.5, padding: '3px 10px', height: 'auto', borderRadius: 6 }}
                >
                  {L('Monthly (/mo)', 'شهرياً (يعادل)')}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${billingView === 'yearly' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setBillingView('yearly')}
                  style={{ fontSize: 11.5, padding: '3px 10px', height: 'auto', borderRadius: 6 }}
                >
                  {L('Yearly (/yr)', 'سنوياً')}
                </button>
              </div>
            </div>
          </div>

          {/* Search Results Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((row) => {
              const regPriceYearly = Number(row.registration_price) || 0;
              const regPriceMonthly = Math.round((regPriceYearly / 12) * 100) / 100;
              const years = selectedYears[row.domain] || 1;
              const totalPrice = Math.round(regPriceYearly * years * 100) / 100;

              return (
                <div
                  key={row.domain}
                  className="card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                    padding: '18px 22px',
                    margin: 0,
                    borderLeft: row.available ? (isRtl ? 'none' : '4px solid var(--green)') : 'none',
                    borderRight: row.available ? (isRtl ? '4px solid var(--green)' : 'none') : 'none',
                    background: row.available ? 'linear-gradient(135deg, rgba(16,185,129,0.03) 0%, transparent 100%)' : 'var(--bg2)'
                  }}
                >
                  {/* Domain Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>{row.domain}</span>
                      {row.available ? (
                        <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--green)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={13} /> {L('Available for Registration', 'متاح للتسجيل')}
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={13} /> {L('Unavailable', 'غير متاح')}
                        </span>
                      )}
                    </div>

                    {row.available && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span>🔒 {L('Free Privacy Protection', 'حماية خصوصية مجانية')}</span>
                        <span>⚡ {L('Instant DNS Setup', 'ربط فوري')}</span>
                        <span>🔄 {L('Renewal:', 'سعر التجديد:')} <b>{money(row.renewal_price, row.currency)}/{L('yr', 'سنة')}</b></span>
                      </div>
                    )}
                  </div>

                  {/* Pricing & Duration Actions */}
                  {row.available && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      {/* Price Tag */}
                      <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                        {billingView === 'monthly' ? (
                          <>
                            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                              {money(regPriceMonthly, row.currency)} <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>/{L('mo', 'شهر')}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                              {L(`Billed ${money(totalPrice, row.currency)} for ${years} yr`, `الإجمالي ${money(totalPrice, row.currency)} لـ ${years} سنة`)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                              {money(totalPrice, row.currency)}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                              {L(`For ${years} year${years > 1 ? 's' : ''}`, `لمدة ${years} ${years > 1 ? 'سنوات' : 'سنة'}`)}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Duration Selector */}
                      <select
                        className="inp"
                        value={years}
                        onChange={(e) => setSelectedYears({ ...selectedYears, [row.domain]: Number(e.target.value) })}
                        style={{ width: 110, fontSize: 12, fontWeight: 700, padding: '8px 10px', height: 42 }}
                      >
                        <option value={1}>{L('1 Year', 'سنة واحدة')}</option>
                        <option value={2}>{L('2 Years', 'سنتان')}</option>
                        <option value={3}>{L('3 Years', '3 سنوات')}</option>
                        <option value={5}>{L('5 Years', '5 سنوات')}</option>
                      </select>

                      {/* Register Button */}
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busyId === row.domain}
                        onClick={() => startRegister(row)}
                        style={{ height: 42, padding: '0 20px', fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Zap size={14} className={busyId === row.domain ? 'spin' : ''} />
                        <span>{busyId === row.domain ? L('Processing…', 'جاري المعالجة…') : L('Register Domain', 'تسجيل النطاق')}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {results.length === 0 && !searching && (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', margin: 0 }}>
                <Globe size={36} style={{ color: 'var(--line2)', margin: '0 auto 10px auto', display: 'block' }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text2)' }}>
                  {L('Search for any domain name above to get started', 'ابحث عن أي اسم نطاق في الأعلى للتحقق من توفره فوراً')}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {L('We check live availability across 10+ popular domain extensions simultaneously.', 'نفحص توفر النطاق مباشرة عبر أكثر من 10 امتدادات في نفس اللحظة.')}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 🌐 TAB 2: MY REGISTERED DOMAINS */}
      {/* ========================================================================= */}
      {activeTab === 'my-domains' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                {L('Your Active Domain Portfolio', 'نطاقاتك المسجلة والنشطة')}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                {L('Manage DNS records, configure nameservers, and manage auto-renewals.', 'تحكم في سجلات DNS، اضبط خوادم الأسماء (Nameservers)، وفعل التجديد التلقائي.')}
              </span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={loadMine} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} /> {L('Refresh', 'تحديث')}
            </button>
          </div>

          {!domains.length ? (
            <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', margin: 0 }}>
              <Globe size={40} style={{ color: 'var(--line2)', margin: '0 auto 12px auto', display: 'block' }} />
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{L('No registered domains yet', 'لا توجد نطاقات مسجلة لديك حتى الآن')}</div>
              <p style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 420, margin: '8px auto 16px auto' }}>
                {L('Search and register your custom domain name to connect it with your online store or landing pages.', 'ابحث وسجل دومينك الخاص الآن لربطه بمتجرك أو صفحات الهبوط الخاصة بك.')}
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveTab('search')}>
                <Search size={14} /> {L('Search Domains Now', 'ابحث عن دومين الآن')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {domains.map((row) => (
                <div key={row.id} className="card" style={{ padding: 20, margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Globe size={18} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 900, fontSize: 17, color: 'var(--text)' }}>{row.domain}</span>
                        <span className="badge badge-green" style={{ fontSize: 11 }}>{row.status || 'active'}</span>
                      </div>

                      <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>📅 {L('Registered:', 'تاريخ التسجيل:')} <b>{formatDate(row.registered_at || row.created_at)}</b></span>
                        <span>⏰ {L('Expires:', 'تاريخ الانتهاء:')} <b>{formatDate(row.expires_at)}</b></span>
                        <span>🔄 {L('Auto-Renew:', 'التجديد التلقائي:')} <b>{row.auto_renew ? L('Active', 'مفعّل') : L('Off', 'متوقف')}</b></span>
                        <span>💵 {L('Renewal Price:', 'سعر التجديد:')} <b>{money(row.renewal_price)}/{L('yr', 'سنة')}</b></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openManage(row)}>
                        <Settings size={13} /> {L('Nameservers', 'خوادم الأسماء')}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { openManage(row); loadDns(row.id); }}>
                        <Server size={13} /> {L('DNS Records', 'سجلات DNS')}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleRenew(row)} disabled={busyId === `ar-${row.id}`}>
                        {row.auto_renew ? L('Disable Auto-renew', 'إيقاف التجديد') : L('Enable Auto-renew', 'تفعيل التجديد')}
                      </button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => renewDomain(row)} disabled={busyId === `rn-${row.id}`}>
                        {L('Renew Now', 'تجديد الآن')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Orders history */}
          {orders.length > 0 && (
            <div className="card" style={{ marginTop: 10, margin: 0 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 800 }}>{L('Your Domain Orders History', 'سجل طلبات الدومينات')}</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text3)', textAlign: isRtl ? 'right' : 'left', borderBottom: '1px solid var(--line)' }}>
                      <th style={{ padding: '8px 6px' }}>{L('Domain', 'النطاق')}</th>
                      <th style={{ padding: '8px 6px' }}>{L('Type', 'النوع')}</th>
                      <th style={{ padding: '8px 6px' }}>{L('Status', 'الحالة')}</th>
                      <th style={{ padding: '8px 6px' }}>{L('Price', 'السعر')}</th>
                      <th style={{ padding: '8px 6px' }}>{L('Date', 'التاريخ')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 10).map((o) => (
                      <tr key={o.id} style={{ borderTop: '1px solid var(--line)' }}>
                        <td style={{ padding: '8px 6px', fontWeight: 800 }}>{o.domain}</td>
                        <td style={{ padding: '8px 6px' }}>{o.type}</td>
                        <td style={{ padding: '8px 6px' }}>
                          <span className={`badge ${o.status === 'completed' ? 'badge-green' : o.status === 'failed' ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: 10.5 }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 6px', fontWeight: 800, fontFamily: 'var(--mono)' }}>{money(o.customer_price, o.currency)}</td>
                        <td style={{ padding: '8px 6px', color: 'var(--text3)' }}>{String(o.created_at || '').slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* ⚙️ TAB 3: REGISTRANT & WHOIS CONTACT SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="card" style={{ width: '100%', padding: 24, margin: 0 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              {L('Registrant Contact Information (WHOIS)', 'بيانات مالك النطاق المسجّلة (WHOIS)')}
            </h3>
            <p style={{ color: 'var(--text2)', fontSize: 12.5, margin: '6px 0 0' }}>
              {L(
                'ICANN and global domain registries require valid contact details for every domain owner. This information is saved once and used automatically during domain registration.',
                'تشترط هيئة ICANN العالمية بيانات مالك حقيقية عند تسجيل أي دومين. يتم حفظ هذه البيانات لمرة واحدة واستخدامها تلقائياً عند شراء أي نطاق.'
              )}
            </p>
          </div>

          <form onSubmit={saveContact} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {CONTACT_FIELDS.map(([key, labelEn, labelAr]) => (
                <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
                  <span>{isRtl ? labelAr : labelEn}</span>
                  <input
                    className="inp"
                    value={contact[key] || ''}
                    onChange={(e) => setContact((p) => ({ ...p, [key]: e.target.value }))}
                    required={['firstName', 'lastName', 'address1', 'city', 'postalCode', 'country', 'phone', 'email'].includes(key)}
                    placeholder={key === 'phone' ? '+20.1234567890' : ''}
                  />
                </label>
              ))}
            </div>

            {/* Footer with Security Note & Glowing Action Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text3)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--green)' }} />
                <span>{L('Your contact information is encrypted and strictly used for ICANN compliance.', 'بياناتك مشفرة ومحمية وتُستخدم فقط لتسجيل النطاق لدى الهيئات العالمية.')}</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={busyId === 'contact'}
                style={{
                  height: 48,
                  padding: '0 32px',
                  fontWeight: 900,
                  fontSize: 15,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--accent) 0%, #ff7849 100%)',
                  boxShadow: '0 4px 18px rgba(236, 92, 49, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  border: 'none',
                  color: '#fff',
                  transition: 'all 0.2s ease'
                }}
              >
                <CheckCircle2 size={17} className={busyId === 'contact' ? 'spin' : ''} />
                <span>{busyId === 'contact' ? L('Saving Details…', 'جاري حفظ البيانات…') : L('Save Contact Details', 'حفظ بيانات المالك')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛠️ MODAL: DNS & NAMESERVERS MANAGER */}
      {/* ========================================================================= */}
      {manage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setManage(null)}>
          <div className="card" style={{ width: '100%', maxWidth: 740, maxHeight: '90vh', overflowY: 'auto', padding: 26 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{manage.domain}</h3>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{L('Status:', 'الحالة:')} {manage.status} · {L('Expires:', 'الانتهاء:')} {formatDate(manage.expires_at)}</span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setManage(null)}>✕</button>
            </div>

            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 800 }}>{L('Custom Nameservers (خوادم الأسماء)', 'خوادم الأسماء (Nameservers)')}</h4>
            <textarea className="inp" rows={3} value={nsText} onChange={(e) => setNsText(e.target.value)} placeholder="dns1.namecheaphosting.com&#10;dns2.namecheaphosting.com" style={{ width: '100%', fontSize: 12.5 }} />
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={saveNs} disabled={busyId === 'ns'}>
              <Server size={14} /> {L('Save Nameservers', 'حفظ خوادم الأسماء')}
            </button>

            <h4 style={{ margin: '22px 0 10px', fontSize: 14, fontWeight: 800, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              {L('DNS Records (سجلات DNS)', 'سجلات DNS')}
            </h4>
            <button type="button" className="btn btn-ghost btn-sm" onClick={loadDns} disabled={busyId === 'dns'}>
              <RefreshCw size={13} /> {L('Fetch Current DNS', 'تحميل سجلات DNS الحالية')}
            </button>

            {dns.map((rec, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1.4fr 70px 36px', gap: 6, marginTop: 8 }}>
                <input className="inp" value={rec.name} onChange={(e) => setDns((p) => p.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))} placeholder="@" />
                <select className="inp" value={rec.type} onChange={(e) => setDns((p) => p.map((r, idx) => idx === i ? { ...r, type: e.target.value } : r))}>
                  {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'URL'].map((t) => <option key={t}>{t}</option>)}
                </select>
                <input className="inp" value={rec.address} onChange={(e) => setDns((p) => p.map((r, idx) => idx === i ? { ...r, address: e.target.value } : r))} placeholder="value" />
                <input className="inp" value={rec.ttl} onChange={(e) => setDns((p) => p.map((r, idx) => idx === i ? { ...r, ttl: e.target.value } : r))} placeholder="1799" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDns((p) => p.filter((_, idx) => idx !== i))}><Trash2 size={14} /></button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDns((p) => [...p, { name: '@', type: 'A', address: '', mxPref: '10', ttl: '1799' }])}>
                <Plus size={14} /> {L('Add Record', 'إضافة سجل')}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={saveDns} disabled={busyId === 'dns-save'}>
                {L('Save DNS Records', 'حفظ سجلات DNS')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📋 INLINE MODAL: MISSING CONTACT PROMPT */}
      {/* ========================================================================= */}
      {showContactModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowContactModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 900 }}>
              {L('Complete Registrant Details to Continue', 'أكمل بيانات المالك للمتابعة')}
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 16 }}>
              {L('ICANN requires valid owner details before purchasing a domain. Fill this once and proceed to checkout immediately.', 'تشترط هيئات النطاقات بيانات مالك صحيحة قبل إتمام الشراء. املأ البيانات مرة واحدة للمتابعة إلى صفحة الدفع مباشرة.')}
            </p>

            <form onSubmit={saveContact} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {CONTACT_FIELDS.map(([key, labelEn, labelAr]) => (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5, fontWeight: 700, color: 'var(--text2)' }}>
                    <span>{isRtl ? labelAr : labelEn}</span>
                    <input
                      className="inp"
                      value={contact[key] || ''}
                      onChange={(e) => setContact((p) => ({ ...p, [key]: e.target.value }))}
                      required={['firstName', 'lastName', 'address1', 'city', 'postalCode', 'country', 'phone', 'email'].includes(key)}
                    />
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowContactModal(false)}>{L('Cancel', 'إلغاء')}</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busyId === 'contact'}
                  style={{
                    height: 42,
                    padding: '0 24px',
                    fontWeight: 800,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, var(--accent) 0%, #ff7849 100%)',
                    boxShadow: '0 4px 14px rgba(236, 92, 49, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <CheckCircle2 size={15} className={busyId === 'contact' ? 'spin' : ''} />
                  <span>{L('Save & Proceed to Checkout', 'حفظ والمتابعة للدفع')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
