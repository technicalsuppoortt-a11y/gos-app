import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  DollarSign,
  FileText,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import type { RootState } from '../../store';
import { useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import { DomainsClient } from '../../lib/domains/client';
import {
  DNS_RECORD_TYPES,
  QUICK_MARKUP_PRESETS,
  computeCustomerPrice,
  roundMoney,
  type AdminPricingRow,
  type DelegatedSiteDomain,
  type DnsRecord,
  type DomainGlobalSettings,
  type DomainOrder,
  type PublicPricingRow,
  type RegisteredDomain,
  type RegistrarConfigSummary,
  type RegistrarLog,
} from '../../lib/domains/constants';
import { DomainsView } from '../../components/Views/DomainsView';
import '../../pages/domains-provider.css';

export interface DomainsPageProps {
  scope?: 'super_admin' | 'admin';
  isRTL?: boolean;
}

export const DomainsPage: React.FC<DomainsPageProps> = ({ scope: propScope, isRTL: propIsRTL }) => {
  const uiLang = useUILanguage();
  const isRTL = propIsRTL ?? uiLang.startsWith('ar');
  const theme = useSelector((s: RootState) => s.ui.theme);
  const role = useSelector((s: RootState) => s.auth.role);

  const effectiveScope: 'super_admin' | 'admin' =
    propScope ?? (role === 'SUPER_ADMIN' ? 'super_admin' : 'admin');
  const isSuper = effectiveScope === 'super_admin';

  const t = useCallback((en: string, ar: string) => (isRTL ? ar : en), [isRTL]);

  const [tab, setTab] = useState<string>(isSuper ? 'pricing' : 'domains');
  const [q, setQ] = useState('');
  const [domains, setDomains] = useState<RegisteredDomain[]>([]);
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [pricing, setPricing] = useState<AdminPricingRow[]>([]);
  const [publicPricing, setPublicPricing] = useState<PublicPricingRow[]>([]);
  const [siteDomains, setSiteDomains] = useState<DelegatedSiteDomain[]>([]);
  const [settings, setSettings] = useState<DomainGlobalSettings>({
    markup: 5,
    markup_type: 'fixed',
  });
  const [logs, setLogs] = useState<RegistrarLog[]>([]);
  const [registrarConfig, setRegistrarConfig] = useState<RegistrarConfigSummary | null>(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');

  // Filters
  const [domainStatusFilter, setDomainStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'completed' | 'paid' | 'failed'>('all');

  // Add TLD Form (Superadmin)
  const [showAddTld, setShowAddTld] = useState(false);
  const [newTld, setNewTld] = useState<{
    extension: string;
    registrar_price: number;
    renewal_cost: number;
    transfer_cost: number;
    markup: number;
    markup_type: 'fixed' | 'percent';
  }>({
    extension: '',
    registrar_price: 10,
    renewal_cost: 12,
    transfer_cost: 10,
    markup: 5,
    markup_type: 'fixed',
  });

  // Registrar Credentials Modal (Superadmin)
  const [showRegistrarModal, setShowRegistrarModal] = useState(false);
  const [regForm, setRegForm] = useState<{
    apiUser: string;
    apiKey: string;
    userName: string;
    clientIp: string;
    environment: 'sandbox' | 'production';
    sandboxSimulation: boolean;
  }>({
    apiUser: '',
    apiKey: '',
    userName: '',
    clientIp: '',
    environment: 'sandbox',
    sandboxSimulation: false,
  });

  // Delegated / Support DNS & Nameservers Modals
  const [dnsDomain, setDnsDomain] = useState<RegisteredDomain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [dnsLoading, setDnsLoading] = useState(false);

  const [nsDomain, setNsDomain] = useState<RegisteredDomain | null>(null);
  const [nsValues, setNsValues] = useState<string[]>(['', '']);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isSuper) {
        const res = await DomainsClient.superAdminOverview({ q });
        setDomains(res.domains || []);
        setOrders(res.orders || []);
        setPricing(res.pricing || []);
        if (res.settings) setSettings(res.settings);
        setLogs(res.logs || []);
        setConfigured(res.namecheapConfigured !== false);
        if (res.registrarConfig) {
          setRegistrarConfig(res.registrarConfig);
          setRegForm({
            apiUser: res.registrarConfig.apiUser || '',
            apiKey: '',
            userName: res.registrarConfig.userName || '',
            clientIp: res.registrarConfig.clientIp || '',
            environment: res.registrarConfig.environment || 'sandbox',
            sandboxSimulation: Boolean(res.registrarConfig.sandboxSimulation),
          });
        }
      } else {
        const res = await DomainsClient.adminOverview(q);
        setDomains(res.domains || []);
        setOrders(res.orders || []);
        setPublicPricing(res.pricing || []);
        setSiteDomains(res.siteDomains || []);
      }
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Failed to load domain data.', 'تعذر تحميل بيانات النطاقات.'));
    } finally {
      setLoading(false);
    }
  }, [isSuper, q, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Analytics Summary
  const analytics = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'paid');
    const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.customer_price || 0), 0);
    const totalCost = completedOrders.reduce((acc, o) => acc + Number(o.registrar_cost || 0), 0);
    const totalProfit = roundMoney(totalRevenue - totalCost);
    const avgProfitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    const activeDomainsCount = domains.filter(d => d.status === 'active' || !d.status).length;
    const tldCounts: Record<string, number> = {};
    domains.forEach(d => {
      const ext = d.extension || (d.domain ? d.domain.split('.').slice(1).join('.') : 'other');
      tldCounts[ext] = (tldCounts[ext] || 0) + 1;
    });
    const tldDistribution = Object.entries(tldCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      totalRevenue: roundMoney(totalRevenue),
      totalCost: roundMoney(totalCost),
      totalProfit,
      avgProfitMargin,
      activeDomainsCount,
      totalDomains: domains.length,
      completedOrdersCount: orders.filter(o => o.status === 'completed').length,
      failedOrdersCount: orders.filter(o => o.status === 'failed').length,
      totalOrders: orders.length,
      tldDistribution,
    };
  }, [orders, domains]);

  // Superadmin Pricing Actions
  const saveRow = async (row: AdminPricingRow) => {
    setBusy(`row:${row.extension}`);
    try {
      const res = await DomainsClient.updatePricing(row as unknown as Record<string, unknown>);
      const saved = res.pricing as AdminPricingRow;
      setPricing(prev => prev.map(r => (r.extension === row.extension ? saved : r)));
      showToast.success(t(`Saved .${row.extension} pricing.`, `تم حفظ تسعير .${row.extension} بنجاح.`));
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Save failed.', 'تعذر الحفظ.'));
    } finally {
      setBusy('');
    }
  };

  const deleteRow = async (ext: string) => {
    setBusy(`del:${ext}`);
    try {
      const res = await DomainsClient.updatePricing({ deleteExtension: ext });
      if (Array.isArray(res.pricing)) setPricing(res.pricing);
      else setPricing(prev => prev.filter(r => r.extension !== ext));
      showToast.success(t(`Removed .${ext} extension.`, `تم حذف الامتداد .${ext}.`));
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Delete failed.', 'تعذر الحذف.'));
    } finally {
      setBusy('');
    }
  };

  const handleAddTld = async (e: React.FormEvent) => {
    e.preventDefault();
    const ext = newTld.extension.replace(/^\./, '').trim().toLowerCase();
    if (!ext) return;
    setBusy('add-tld');
    try {
      const regPrice = computeCustomerPrice(newTld.registrar_price, newTld.markup, newTld.markup_type);
      const renPrice = computeCustomerPrice(newTld.renewal_cost, newTld.markup, newTld.markup_type);
      const trnPrice = computeCustomerPrice(newTld.transfer_cost, newTld.markup, newTld.markup_type);

      const res = await DomainsClient.updatePricing({
        extension: ext,
        registrar_price: Number(newTld.registrar_price),
        renewal_cost: Number(newTld.renewal_cost),
        transfer_cost: Number(newTld.transfer_cost),
        registration_price: regPrice,
        renewal_price: renPrice,
        transfer_price: trnPrice,
        markup: Number(newTld.markup),
        markup_type: newTld.markup_type,
        enabled: true,
      });
      const saved = res.pricing as AdminPricingRow;
      setPricing(prev => {
        const filtered = prev.filter(r => r.extension !== ext);
        return [...filtered, saved].sort((a, b) => a.extension.localeCompare(b.extension));
      });
      setShowAddTld(false);
      setNewTld({
        extension: '',
        registrar_price: 10,
        renewal_cost: 12,
        transfer_cost: 10,
        markup: settings.markup || 5,
        markup_type: settings.markup_type || 'fixed',
      });
      showToast.success(t(`Added .${ext} successfully!`, `تم إضافة الامتداد .${ext} بنجاح!`));
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Could not add TLD.', 'تعذر إضافة الامتداد.'));
    } finally {
      setBusy('');
    }
  };

  const applyBulkMarkupAction = async () => {
    setBusy('bulk');
    try {
      const res = await DomainsClient.updatePricing({
        applyBulkMarkup: {
          markup: Number(settings.markup),
          markup_type: settings.markup_type,
        },
      });
      if (Array.isArray(res.pricing)) setPricing(res.pricing);
      showToast.success(
        t(
          'Global profit margin applied across all TLDs!',
          'تم تطبيق نسبة الربح الجديدة على جميع الامتدادات بنجاح!'
        )
      );
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Bulk update failed.', 'تعذر تطبيق الهامش الجماعي.'));
    } finally {
      setBusy('');
    }
  };

  const saveDefaultSettings = async () => {
    setBusy('settings');
    try {
      await DomainsClient.updatePricing({ settings });
      showToast.success(t('Default margin settings saved.', 'تم حفظ إعدادات الربح الافتراضية.'));
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Failed to save defaults.', 'تعذر حفظ الإعدادات.'));
    } finally {
      setBusy('');
    }
  };

  const refreshLiveCosts = async () => {
    setBusy('refresh-costs');
    try {
      const res = await DomainsClient.updatePricing({ refreshRegistrar: true });
      if (Array.isArray(res.pricing)) setPricing(res.pricing);
      showToast.success(
        t('Wholesale costs synced from Namecheap!', 'تمت مزامنة أسعار الشراء المباشرة من Namecheap!')
      );
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Could not sync registrar costs.', 'تعذر جلب أسعار المسجّل.'));
    } finally {
      setBusy('');
    }
  };

  const retryOrderFulfillment = async (orderId: string) => {
    setBusy(`retry:${orderId}`);
    try {
      const res = await DomainsClient.retryOrder(orderId);
      if (res.success) {
        showToast.success(t('Order fulfilled successfully!', 'تم تنفيذ وتسجيل الطلب بنجاح!'));
      } else {
        showToast.error(res.result?.error || t('Fulfillment retry failed.', 'لم تكتمل إعادة المحاولة.'));
      }
      await loadData();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Retry failed.', 'فشلت إعادة المحاولة.'));
    } finally {
      setBusy('');
    }
  };

  const handleSaveRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('save-reg');
    try {
      const res = await DomainsClient.saveRegistrarConfig({
        apiUser: regForm.apiUser,
        ...(regForm.apiKey.trim() ? { apiKey: regForm.apiKey.trim() } : {}),
        userName: regForm.userName || regForm.apiUser,
        clientIp: regForm.clientIp,
        environment: regForm.environment,
        sandboxSimulation: regForm.sandboxSimulation,
      });
      setRegistrarConfig(res.registrarConfig);
      setConfigured(res.namecheapConfigured);
      setRegForm(prev => ({ ...prev, apiKey: '' }));
      setShowRegistrarModal(false);
      showToast.success(t('Registrar API settings saved!', 'تم حفظ إعدادات مسجّل النطاقات بنجاح!'));
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Could not save registrar settings.', 'تعذر حفظ إعدادات المسجّل.'));
    } finally {
      setBusy('');
    }
  };

  const handleTestRegistrar = async () => {
    setBusy('test-reg');
    try {
      const res = await DomainsClient.testRegistrarConfig({
        apiUser: regForm.apiUser,
        ...(regForm.apiKey.trim() ? { apiKey: regForm.apiKey.trim() } : {}),
        userName: regForm.userName || regForm.apiUser,
        clientIp: regForm.clientIp,
        environment: regForm.environment,
        sandboxSimulation: regForm.sandboxSimulation,
      });
      showToast.success(res.message || t('Registrar connection verified!', 'تم التحقق من الاتصال بالمسجّل بنجاح!'));
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Connection test failed.', 'فشل اختبار الاتصال بالمسجّل.'));
    } finally {
      setBusy('');
    }
  };

  const openDnsModal = async (d: RegisteredDomain) => {
    setDnsDomain(d);
    setDnsLoading(true);
    try {
      const res = await DomainsClient.getDnsRecords(d.id);
      setDnsRecords(
        res.records?.length ? res.records : [{ name: '@', type: 'A', address: '76.76.21.21', ttl: '1799' }]
      );
    } catch {
      setDnsRecords([{ name: '@', type: 'A', address: '76.76.21.21', ttl: '1799' }]);
    } finally {
      setDnsLoading(false);
    }
  };

  const saveDnsModal = async () => {
    if (!dnsDomain) return;
    setBusy('save-dns');
    try {
      await DomainsClient.saveDnsRecords(dnsDomain.id, dnsRecords);
      showToast.success(t('DNS records updated.', 'تم حفظ سجلات DNS بنجاح.'));
      setDnsDomain(null);
      await loadData();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Failed to save DNS records.', 'تعذر حفظ سجلات DNS.'));
    } finally {
      setBusy('');
    }
  };

  const saveNameserversModal = async () => {
    if (!nsDomain) return;
    setBusy('save-ns');
    try {
      await DomainsClient.saveNameservers(
        nsDomain.id,
        nsValues.map(v => v.trim()).filter(Boolean)
      );
      showToast.success(t('Nameservers updated.', 'تم تحديث خوادم الأسماء.'));
      setNsDomain(null);
      await loadData();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t('Failed to update nameservers.', 'تعذر تحديث خوادم الأسماء.'));
    } finally {
      setBusy('');
    }
  };

  const filteredDomains = useMemo(() => {
    return domains.filter(d => {
      if (domainStatusFilter === 'active') return d.status === 'active' || !d.status;
      if (domainStatusFilter === 'expired') return d.status === 'expired';
      return true;
    });
  }, [domains, domainStatusFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (orderStatusFilter === 'all') return true;
      return o.status === orderStatusFilter;
    });
  }, [orders, orderStatusFilter]);

  // Live .com simulator values
  const simBase = 10.0;
  const simCustomer = computeCustomerPrice(simBase, Number(settings.markup || 0), settings.markup_type);
  const simProfit = roundMoney(simCustomer - simBase);

  return (
    <div className="dp-root" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'} style={{ padding: '4px 0 28px' }}>
      {/* Page Header */}
      <div className="dp-hero">
        <div className="dp-hero-top">
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--dp-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {isSuper
                ? t('ROOT DOMAIN PROVIDER · SUPERADMIN', 'المزود الرئيسي للنطاقات · الإدارة العليا')
                : t('WORKSPACE DOMAIN MANAGEMENT · ADMIN', 'إدارة نطاقات مساحة العمل · المسؤول')}
            </div>
            <h1 className="dp-hero-title">
              <Globe size={24} style={{ color: isSuper ? 'var(--dp-orange)' : 'var(--dp-accent)' }} />
              <span>
                {isSuper
                  ? t('Admin Control Panel — Domain Provider', 'لوحة التحكم للمسؤولين — مزود النطاقات')
                  : t('Domains & Delegated Orders', 'إدارة النطاقات وطلبات العملاء')}
              </span>
            </h1>
            <p className="dp-hero-subtitle">
              {isSuper
                ? t(
                    'Domain pricing, profit margins, registrar API credentials, global orders, and post-payment fulfillment retry.',
                    'تسعير النطاقات، هوامش الأرباح، مفاتيح الربط مع المسجّل، الطلبات، وإعادة محاولة التسجيل بعد الدفع.'
                  )
                : t(
                    'Manage registered domains across your workspaces, inspect custom site SSL connections, and track client domain orders.',
                    'إدارة النطاقات المسجلة لمساحات العمل التابعة لك، ومراجعة شهادات SSL للمواقع، ومتابعة طلبات النطاقات.'
                  )}
            </p>
          </div>

          <div className="dp-hero-pills">
            {isSuper && (
              <>
                <span className={`dp-pill ${configured ? 'dp-pill-emerald' : 'dp-pill-amber'}`}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: configured ? 'var(--dp-emerald)' : 'var(--dp-amber)',
                    }}
                  />
                  {configured
                    ? registrarConfig?.sandboxSimulation && !registrarConfig?.liveConfigured
                      ? t('Sandbox Simulation Active', 'وضع المحاكاة مفعل')
                      : t('System Active', 'النظام يعمل')
                    : t('Registrar Unconfigured', 'المسجّل غير مربوط')}
                </span>
                <button
                  type="button"
                  onClick={() => setShowRegistrarModal(true)}
                  className="dp-btn dp-btn-sm"
                >
                  <KeyRound size={14} />
                  <span>{t('Registrar API Credentials', 'إعدادات مفاتيح المسجّل')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Superadmin Missing Namecheap Keys Banner (Matches Screenshot 1) */}
      {isSuper && !configured && (
        <div className="dp-alert dp-alert-amber">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} style={{ color: 'var(--dp-amber)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {t('Namecheap API Keys / IP Missing', 'مفاتيح Namecheap أو الآي بي غير مكتملة')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--dp-text-secondary)', marginTop: 2 }}>
                {t(
                  'Configure your Namecheap API key and whitelisted IP, or enable Sandbox Simulation mode for testing.',
                  'تأكد من كتابة المفتاح والآي بي وتفعيلهما في لوحة تحكم Namecheap، أو قم بتفعيل وضع المحاكاة للاختبار.'
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRegistrarModal(true)}
            className="dp-btn dp-btn-orange dp-btn-sm"
          >
            <KeyRound size={13} />
            <span>{t('Configure Namecheap API', 'إعداد مفاتيح Namecheap')}</span>
          </button>
        </div>
      )}

      {/* 4 Executive KPI Cards */}
      {isSuper ? (
        <div className="dp-kpi-grid">
          <div className="dp-kpi-card" data-tone="emerald">
            <div className="dp-kpi-head">
              <span className="dp-kpi-label">{t('Net Domain Profit', 'صافي أرباح النطاقات')}</span>
              <span className="dp-kpi-icon" style={{ background: 'var(--dp-emerald-soft)', color: 'var(--dp-emerald)' }}>
                <DollarSign size={17} />
              </span>
            </div>
            <div className="dp-kpi-value" style={{ color: 'var(--dp-emerald)' }}>
              ${analytics.totalProfit.toFixed(2)}
            </div>
            <div className="dp-kpi-sub">
              <span style={{ color: 'var(--dp-emerald)', fontWeight: 700 }}>+{analytics.avgProfitMargin}%</span>
              <span>{t('avg profit margin', 'متوسط هامش الربح')}</span>
            </div>
          </div>

          <div className="dp-kpi-card" data-tone="orange">
            <div className="dp-kpi-head">
              <span className="dp-kpi-label">{t('Total Domain Sales', 'إجمالي مبيعات النطاقات')}</span>
              <span className="dp-kpi-icon" style={{ background: 'var(--dp-orange-soft)', color: 'var(--dp-orange)' }}>
                <TrendingUp size={17} />
              </span>
            </div>
            <div className="dp-kpi-value">${analytics.totalRevenue.toFixed(2)}</div>
            <div className="dp-kpi-sub">
              <span>
                {t('Wholesale cost:', 'تكلفة الشراء:')} ${analytics.totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="dp-kpi-card" data-tone="blue">
            <div className="dp-kpi-head">
              <span className="dp-kpi-label">{t('Registered User Domains', 'نطاقات المستخدمين المسجلة')}</span>
              <span className="dp-kpi-icon" style={{ background: 'var(--dp-blue-soft)', color: 'var(--dp-blue)' }}>
                <Globe size={17} />
              </span>
            </div>
            <div className="dp-kpi-value">{analytics.activeDomainsCount}</div>
            <div className="dp-kpi-sub">
              <span>
                {t('Total registered:', 'إجمالي المسجلة:')} {analytics.totalDomains}
              </span>
            </div>
          </div>

          <div className="dp-kpi-card" data-tone="violet">
            <div className="dp-kpi-head">
              <span className="dp-kpi-label">{t('Orders & Registrar Status', 'الطلبات وحالة المسجّل')}</span>
              <span className="dp-kpi-icon" style={{ background: 'var(--dp-accent-soft)', color: 'var(--dp-accent)' }}>
                <Server size={17} />
              </span>
            </div>
            <div className="dp-kpi-value">
              {analytics.completedOrdersCount}{' '}
              <span style={{ fontSize: 15, color: 'var(--dp-text-muted)', fontWeight: 600 }}>
                / {analytics.totalOrders}
              </span>
            </div>
            <div className="dp-kpi-sub">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: configured ? 'var(--dp-emerald)' : 'var(--dp-red)',
                }}
              />
              <span style={{ color: configured ? 'var(--dp-emerald)' : 'var(--dp-red)', fontWeight: 600 }}>
                {configured ? t('Connected', 'متصل') : t('Unconfigured', 'غير مربوط')}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="dp-kpi-grid">
          <div className="dp-kpi-card" data-tone="violet">
            <div className="dp-kpi-head">
              <span className="dp-kpi-label">{t('Active Workspace Domains', 'النطاقات النشطة')}</span>
              <span className="dp-kpi-icon" style={{ background: 'var(--dp-accent-soft)', color: 'var(--dp-accent)' }}>
                <Globe size={17} />
              </span>
            </div>
            <div className="dp-kpi-value">{analytics.activeDomainsCount}</div>
            <div className="dp-kpi-sub">{t('Under your delegated scope', 'ضمن مساحات العمل التابعة لك')}</div>
          </div>

          <div className="dp-kpi-card" data-tone="emerald">
            <div className="dp-kpi-head">
              <span className="dp-kpi-label">{t('Connected Site Domains', 'نطاقات المواقع المربوطة')}</span>
              <span className="dp-kpi-icon" style={{ background: 'var(--dp-emerald-soft)', color: 'var(--dp-emerald)' }}>
                <ShieldCheck size={17} />
              </span>
            </div>
            <div className="dp-kpi-value">{siteDomains.filter(s => s.verified).length}</div>
            <div className="dp-kpi-sub">
              {t('Total configured hosts:', 'إجمالي النطاقات المضافة:')} {siteDomains.length}
            </div>
          </div>

          <div className="dp-kpi-card" data-tone="orange">
            <div className="dp-kpi-head">
              <span className="dp-kpi-label">{t('Delegated Domain Orders', 'طلبات النطاقات')}</span>
              <span className="dp-kpi-icon" style={{ background: 'var(--dp-orange-soft)', color: 'var(--dp-orange)' }}>
                <ShoppingBag size={17} />
              </span>
            </div>
            <div className="dp-kpi-value">{analytics.totalOrders}</div>
            <div className="dp-kpi-sub">
              {t('Completed:', 'المكتملة:')} {analytics.completedOrdersCount}
            </div>
          </div>

          <div className="dp-kpi-card" data-tone="blue">
            <div className="dp-kpi-head">
              <span className="dp-kpi-label">{t('Available Extensions', 'الامتدادات المتاحة')}</span>
              <span className="dp-kpi-icon" style={{ background: 'var(--dp-blue-soft)', color: 'var(--dp-blue)' }}>
                <Sparkles size={17} />
              </span>
            </div>
            <div className="dp-kpi-value">{publicPricing.length}</div>
            <div className="dp-kpi-sub">{t('Ready for instant registration', 'جاهزة للتسجيل الفوري')}</div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="dp-tabs-bar">
        <div className="dp-tabs-list">
          {isSuper ? (
            <>
              <button
                type="button"
                onClick={() => setTab('pricing')}
                className={`dp-tab-btn ${tab === 'pricing' ? 'is-active-orange' : ''}`}
              >
                <Percent size={14} />
                <span>{t('TLD Pricing & Profit Margins', 'تسعير الامتدادات وهوامش الأرباح')}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('domains')}
                className={`dp-tab-btn ${tab === 'domains' ? 'is-active-orange' : ''}`}
              >
                <Globe size={14} />
                <span>{t('Users Domains', 'نطاقات المستخدمين')}</span>
                <span className="dp-tab-count">{domains.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`dp-tab-btn ${tab === 'orders' ? 'is-active-orange' : ''}`}
              >
                <ShoppingBag size={14} />
                <span>{t('Orders & Transactions', 'الطلبات وسجل العمليات')}</span>
                <span className="dp-tab-count">{orders.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('analytics')}
                className={`dp-tab-btn ${tab === 'analytics' ? 'is-active-orange' : ''}`}
              >
                <BarChart3 size={14} />
                <span>{t('Analytics & Distribution', 'التحليلات وتوزيع النطاقات')}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('logs')}
                className={`dp-tab-btn ${tab === 'logs' ? 'is-active-orange' : ''}`}
              >
                <FileText size={14} />
                <span>{t('Registrar Error Logs', 'سجل أخطاء المسجّل')}</span>
                {logs.length > 0 && <span className="dp-tab-count">{logs.length}</span>}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setTab('domains')}
                className={`dp-tab-btn ${tab === 'domains' ? 'is-active' : ''}`}
              >
                <Globe size={14} />
                <span>{t('Workspace & Client Domains', 'نطاقات مساحة العمل والعملاء')}</span>
                <span className="dp-tab-count">{domains.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('site-domains')}
                className={`dp-tab-btn ${tab === 'site-domains' ? 'is-active' : ''}`}
              >
                <Link2 size={14} />
                <span>{t('Connected Site Domains (SSL)', 'نطاقات المواقع و SSL')}</span>
                <span className="dp-tab-count">{siteDomains.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`dp-tab-btn ${tab === 'orders' ? 'is-active' : ''}`}
              >
                <ShoppingBag size={14} />
                <span>{t('Delegated Orders', 'الطلبات والمعاملات')}</span>
                <span className="dp-tab-count">{orders.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('buy')}
                className={`dp-tab-btn ${tab === 'buy' ? 'is-active' : ''}`}
              >
                <Search size={14} />
                <span>{t('Search & Buy Domain', 'بحث وشراء نطاق')}</span>
              </button>
            </>
          )}
        </div>

        <button type="button" onClick={() => void loadData()} disabled={loading} className="dp-btn dp-btn-sm">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>{t('Refresh Data', 'تحديث البيانات')}</span>
        </button>
      </div>

      {/* =====================================================================
          SUPERADMIN TAB 1: TLD PRICING & PROFIT MARGINS (Matches Screenshot 1)
          ===================================================================== */}
      {isSuper && tab === 'pricing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Global Profit & Markup Controller */}
          <div className="dp-card" style={{ borderColor: 'rgba(234, 88, 12, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <h3 className="dp-card-title">
                  <Sparkles size={17} style={{ color: 'var(--dp-orange)' }} />
                  <span>{t('Global Profit & Markup Controller', 'التحكم في نسبة وهامش الربح على النطاقات')}</span>
                </h3>
                <p className="dp-card-desc">
                  {t(
                    'Set your percentage (%) or fixed ($) profit added over registrar wholesale cost across all TLDs.',
                    'حدد النسبة المئوية أو المبلغ الثابت للربح فوق سعر المسجّل، وطبّقها بضغطة واحدة على جميع الامتدادات.'
                  )}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void applyBulkMarkupAction()}
                  className="dp-btn dp-btn-orange dp-btn-sm"
                >
                  <Zap size={13} />
                  <span>
                    {t(
                      `Apply ${settings.markup}${settings.markup_type === 'percent' ? '%' : '$'} to All TLDs`,
                      `تطبيق ${settings.markup}${settings.markup_type === 'percent' ? '%' : '$'} على كل الامتدادات`
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void refreshLiveCosts()}
                  className="dp-btn dp-btn-sm"
                >
                  <RefreshCw size={13} className={busy === 'refresh-costs' ? 'animate-spin' : ''} />
                  <span>{t('Sync Namecheap Live Costs', 'جلب تكلفة Namecheap المباشرة')}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>
                    {t('Profit Type:', 'نوع الربح:')}
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
                      onClick={() => setSettings(s => ({ ...s, markup_type: 'percent' }))}
                      className={`dp-btn dp-btn-sm ${settings.markup_type === 'percent' ? 'dp-btn-orange' : ''}`}
                      style={{ border: 'none', padding: '5px 11px' }}
                    >
                      {t('Percentage (%)', 'نسبة مئوية (%)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, markup_type: 'fixed' }))}
                      className={`dp-btn dp-btn-sm ${settings.markup_type === 'fixed' ? 'dp-btn-orange' : ''}`}
                      style={{ border: 'none', padding: '5px 11px' }}
                    >
                      {t('Fixed Amount ($)', 'مبلغ ثابت ($)')}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>
                    {settings.markup_type === 'percent'
                      ? t('Profit Margin (%):', 'نسبة الربح (%):')
                      : t('Profit Amount ($):', 'مبلغ الربح ($):')}
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.markup ?? 0}
                    onChange={e => setSettings(s => ({ ...s, markup: Number(e.target.value) }))}
                    className="dp-input dp-input-sm dp-mono"
                    style={{ width: 92, textAlign: 'center', fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--dp-text-muted)' }}>
                    {t('Presets:', 'نسب جاهزة:')}
                  </span>
                  {QUICK_MARKUP_PRESETS.map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, markup_type: 'percent', markup: pct }))}
                      className={`dp-btn dp-btn-sm ${
                        settings.markup_type === 'percent' && Number(settings.markup) === pct
                          ? 'dp-btn-orange'
                          : ''
                      }`}
                      style={{ padding: '4px 9px', fontSize: 11.5 }}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void saveDefaultSettings()}
                className="dp-btn dp-btn-sm"
              >
                <Save size={13} />
                <span>{t('Save Defaults', 'حفظ الإعداد الافتراضي')}</span>
              </button>
            </div>

            {/* Live .com Profit Simulator */}
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'var(--dp-emerald-soft)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <CheckCircle2 size={15} style={{ color: 'var(--dp-emerald)' }} />
              <span>
                {t('Live Profit Example: A', 'مثال للربح: نطاق')} <strong>.com</strong>{' '}
                {t('costing $10.00 +', 'تكلفته $10.00 + ربح')}{' '}
                <strong>
                  {settings.markup_type === 'percent' ? `${settings.markup}%` : `$${settings.markup}`}
                </strong>{' '}
                = {t('Customer pays', 'يدفع العميل')}{' '}
                <strong style={{ color: 'var(--dp-orange)' }}>${simCustomer.toFixed(2)}</strong> —{' '}
                {t('Your Net Profit:', 'صافي ربحك:')}{' '}
                <strong style={{ color: 'var(--dp-emerald)' }}>+${simProfit.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          {/* TLD Pricing Matrix & Profit Breakdown Table */}
          <div className="dp-card-flush">
            <div className="dp-card-header">
              <div>
                <h3 className="dp-card-title">
                  {t('TLD Pricing Matrix & Profit Breakdown', 'جدول تسعير الامتدادات وحساب الأرباح')}
                </h3>
                <p className="dp-card-desc">
                  {t(
                    'Control wholesale cost, selling price, renewal/transfer rates, and profit margin per TLD.',
                    'تحكم في سعر التكلفة وسعر البيع وهامش الربح لكل امتداد بشكل منفصل.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTld(v => !v)}
                className="dp-btn dp-btn-sm"
              >
                <Plus size={14} />
                <span>{showAddTld ? t('Close Form', 'إغلاق') : t('Add New TLD', 'إضافة امتداد جديد')}</span>
              </button>
            </div>

            {showAddTld && (
              <form
                onSubmit={e => void handleAddTld(e)}
                style={{
                  padding: 18,
                  borderBottom: '1px solid var(--dp-border)',
                  background: 'var(--dp-card-alt)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 12,
                  alignItems: 'end',
                }}
              >
                <div>
                  <label className="dp-label">{t('Extension (no dot)', 'الامتداد (بدون نقطة)')}</label>
                  <input
                    required
                    placeholder="tech"
                    value={newTld.extension}
                    onChange={e => setNewTld(p => ({ ...p, extension: e.target.value }))}
                    className="dp-input dp-input-sm dp-mono"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="dp-label">{t('Registrar Cost ($)', 'تكلفة المسجّل ($)')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTld.registrar_price}
                    onChange={e =>
                      setNewTld(p => ({
                        ...p,
                        registrar_price: Number(e.target.value),
                        renewal_cost: Number(e.target.value) + 2,
                        transfer_cost: Number(e.target.value),
                      }))
                    }
                    className="dp-input dp-input-sm dp-mono"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="dp-label">{t('Profit Margin', 'هامش الربح')}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTld.markup}
                    onChange={e => setNewTld(p => ({ ...p, markup: Number(e.target.value) }))}
                    className="dp-input dp-input-sm dp-mono"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="dp-label">{t('Markup Type', 'نوع الهامش')}</label>
                  <select
                    value={newTld.markup_type}
                    onChange={e =>
                      setNewTld(p => ({ ...p, markup_type: e.target.value as 'fixed' | 'percent' }))
                    }
                    className="dp-select dp-input-sm"
                    style={{ width: '100%' }}
                  >
                    <option value="percent">{t('Percentage (%)', 'نسبة مئوية (%)')}</option>
                    <option value="fixed">{t('Fixed ($)', 'مبلغ ثابت ($)')}</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={busy === 'add-tld'} className="dp-btn dp-btn-orange dp-btn-sm">
                    <Check size={13} />
                    <span>{t('Save TLD', 'حفظ الامتداد')}</span>
                  </button>
                </div>
              </form>
            )}

            <div className="dp-table-wrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>TLD</th>
                    <th>{t('Registrar Cost', 'تكلفة المسجّل')}</th>
                    <th>{t('Register Price', 'سعر التسجيل')}</th>
                    <th>{t('Renewal Price', 'سعر التجديد')}</th>
                    <th>{t('Transfer Price', 'سعر النقل')}</th>
                    <th>{t('Markup', 'الهامش')}</th>
                    <th>{t('Net Profit', 'صافي الربح')}</th>
                    <th>{t('Margin', 'النسبة')}</th>
                    <th>{t('Enabled', 'مفعّل')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pricing.map((row, idx) => {
                    const regCost = Number(row.registrar_price || 0);
                    const custPrice = Number(row.registration_price || 0);
                    const profit = roundMoney(custPrice - regCost);
                    const marginPct = custPrice > 0 ? Math.round((profit / custPrice) * 100) : 0;

                    const patchRow = (patch: Partial<AdminPricingRow>) =>
                      setPricing(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

                    return (
                      <tr key={row.extension}>
                        <td>
                          <span
                            className="dp-mono"
                            style={{
                              padding: '3px 9px',
                              borderRadius: 7,
                              background: 'var(--dp-orange-soft)',
                              color: 'var(--dp-orange)',
                              fontWeight: 800,
                              fontSize: 12.5,
                            }}
                          >
                            .{row.extension}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={row.registrar_price}
                            onChange={e => patchRow({ registrar_price: Number(e.target.value) })}
                            className="dp-input dp-input-sm dp-mono"
                            style={{ width: 88 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={row.registration_price}
                            onChange={e => patchRow({ registration_price: Number(e.target.value) })}
                            className="dp-input dp-input-sm dp-mono"
                            style={{ width: 88, fontWeight: 700 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={row.renewal_price}
                            onChange={e => patchRow({ renewal_price: Number(e.target.value) })}
                            className="dp-input dp-input-sm dp-mono"
                            style={{ width: 88 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={row.transfer_price}
                            onChange={e => patchRow({ transfer_price: Number(e.target.value) })}
                            className="dp-input dp-input-sm dp-mono"
                            style={{ width: 88 }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number"
                              step="0.5"
                              value={row.markup}
                              onChange={e => {
                                const m = Number(e.target.value);
                                patchRow({
                                  markup: m,
                                  registration_price: computeCustomerPrice(regCost, m, row.markup_type),
                                });
                              }}
                              className="dp-input dp-input-sm dp-mono"
                              style={{ width: 68 }}
                            />
                            <select
                              value={row.markup_type}
                              onChange={e => {
                                const tp = e.target.value as 'fixed' | 'percent';
                                patchRow({
                                  markup_type: tp,
                                  registration_price: computeCustomerPrice(regCost, Number(row.markup || 0), tp),
                                });
                              }}
                              className="dp-select dp-input-sm"
                              style={{ paddingInline: 6 }}
                            >
                              <option value="percent">%</option>
                              <option value="fixed">$</option>
                            </select>
                          </div>
                        </td>
                        <td>
                          <span
                            className="dp-mono"
                            style={{
                              fontWeight: 700,
                              color: profit >= 0 ? 'var(--dp-emerald)' : 'var(--dp-red)',
                            }}
                          >
                            {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`dp-pill ${marginPct >= 15 ? 'dp-pill-emerald' : 'dp-pill-amber'}`}
                            style={{ padding: '2px 8px', fontSize: 11 }}
                          >
                            {marginPct}%
                          </span>
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={row.enabled !== false}
                            onChange={e => patchRow({ enabled: e.target.checked })}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              disabled={busy === `row:${row.extension}`}
                              onClick={() => void saveRow(row)}
                              className="dp-btn dp-btn-sm"
                              title={t('Save TLD', 'حفظ الامتداد')}
                            >
                              {busy === `row:${row.extension}` ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Save size={13} />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={busy === `del:${row.extension}`}
                              onClick={() => void deleteRow(row.extension)}
                              className="dp-btn dp-btn-danger dp-btn-sm"
                              title={t('Delete TLD', 'حذف الامتداد')}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SHARED TAB: REGISTERED DOMAINS (Superadmin Global / Admin Delegated)
          ===================================================================== */}
      {tab === 'domains' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
              <div className="dp-search-input-wrap" style={{ maxWidth: 420 }}>
                <Search size={15} className="dp-search-icon" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder={t(
                    'Search domain, customer name or email…',
                    'بحث بالنطاق أو اسم العميل أو الإيميل…'
                  )}
                  className="dp-input"
                  style={{ width: '100%', paddingInlineStart: 38 }}
                />
              </div>
              <button type="button" onClick={() => void loadData()} className="dp-btn dp-btn-primary dp-btn-sm">
                {t('Search', 'بحث')}
              </button>
            </div>

            <select
              value={domainStatusFilter}
              onChange={e => setDomainStatusFilter(e.target.value as 'all' | 'active' | 'expired')}
              className="dp-select dp-input-sm"
            >
              <option value="all">{t('All Domains', 'جميع النطاقات')}</option>
              <option value="active">{t('Active Only', 'النشطة فقط')}</option>
              <option value="expired">{t('Expired', 'المنتهية')}</option>
            </select>
          </div>

          <div className="dp-card-flush">
            <div className="dp-table-wrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>{t('Domain Name', 'اسم النطاق')}</th>
                    <th>{t('Customer / Owner', 'العميل المالك')}</th>
                    <th>{t('Price Paid', 'المبلغ المدفوع')}</th>
                    <th>{t('Registered At', 'تاريخ التسجيل')}</th>
                    <th>{t('Expires At', 'تاريخ الانتهاء')}</th>
                    <th>{t('Status', 'الحالة')}</th>
                    <th>{t('Auto-Renew', 'تجديد تلقائي')}</th>
                    <th>{t('Manage', 'إدارة')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDomains.map(d => {
                    const isExpiringSoon =
                      d.expires_at &&
                      new Date(d.expires_at).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                    return (
                      <tr key={d.id}>
                        <td className="dp-mono" style={{ fontWeight: 800 }}>{d.domain}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{d.user_name || '—'}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--dp-text-muted)' }}>
                            {d.user_email || d.user_id}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>${Number(d.registration_price || 0).toFixed(2)}</td>
                        <td style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>
                          {d.registered_at ? new Date(d.registered_at).toLocaleDateString() : '—'}
                        </td>
                        <td
                          style={{
                            fontSize: 12,
                            fontWeight: isExpiringSoon ? 700 : 400,
                            color: isExpiringSoon ? 'var(--dp-amber)' : 'var(--dp-text-muted)',
                          }}
                        >
                          {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <span
                            className={`dp-pill ${d.status === 'active' ? 'dp-pill-emerald' : 'dp-pill-amber'}`}
                            style={{ padding: '2px 9px', fontSize: 11 }}
                          >
                            {d.status === 'active' ? t('Active', 'نشط') : d.status}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: d.auto_renew ? 'var(--dp-emerald)' : 'var(--dp-text-muted)' }}>
                            {d.auto_renew ? t('Enabled', 'مفعّل') : t('Disabled', 'معطّل')}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => void openDnsModal(d)}
                              className="dp-btn dp-btn-sm"
                            >
                              DNS
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNsDomain(d);
                                setNsValues(
                                  d.nameservers?.length >= 2
                                    ? [...d.nameservers]
                                    : ['dns1.registrar-servers.com', 'dns2.registrar-servers.com']
                                );
                              }}
                              className="dp-btn dp-btn-sm"
                            >
                              NS
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDomains.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--dp-text-muted)' }}>
                        {t('No registered domains match your search.', 'لا توجد نطاقات مسجلة مطابقة للبحث.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ADMIN TAB: CONNECTED SITE / FUNNEL DOMAINS (SSL)
          ===================================================================== */}
      {!isSuper && tab === 'site-domains' && (
        <div className="dp-card-flush">
          <div className="dp-card-header">
            <div>
              <h3 className="dp-card-title">
                {t('Connected Funnel & Website Custom Domains', 'النطاقات المخصصة المربوطة بالمواقع والفانلز')}
              </h3>
              <p className="dp-card-desc">
                {t(
                  'Live SSL & DNS status across workspaces under your administration.',
                  'حالة ربط النطاقات وشهادات SSL عبر مساحات العمل التابعة لك.'
                )}
              </p>
            </div>
          </div>
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>{t('Custom Host', 'النطاق المخصص')}</th>
                  <th>{t('Workspace / Tenant', 'مساحة العمل')}</th>
                  <th>{t('Funnel / Asset ID', 'معرف الموقع / الفانل')}</th>
                  <th>{t('SSL Status', 'حالة SSL')}</th>
                  <th>{t('Verification', 'التحقق')}</th>
                  <th>{t('Updated', 'آخر تحديث')}</th>
                </tr>
              </thead>
              <tbody>
                {siteDomains.map(sd => (
                  <tr key={sd.host}>
                    <td className="dp-mono" style={{ fontWeight: 700 }}>{sd.host}</td>
                    <td className="dp-mono" style={{ fontSize: 12 }}>{sd.tenantId || sd.ownerUid || '—'}</td>
                    <td className="dp-mono" style={{ fontSize: 12 }}>{sd.funnelId || '—'}</td>
                    <td>
                      <span className={`dp-pill ${sd.verified ? 'dp-pill-emerald' : 'dp-pill-amber'}`} style={{ padding: '2px 9px', fontSize: 11 }}>
                        {sd.verified ? t('Active SSL', 'SSL نشط') : t('Pending', 'قيد التجهيز')}
                      </span>
                    </td>
                    <td>
                      {sd.verified ? t('Verified', 'تم التحقق') : t('Awaiting DNS', 'بانتظار DNS')}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>
                      {sd.updatedAt ? new Date(sd.updatedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {siteDomains.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--dp-text-muted)' }}>
                      {t('No custom site domains connected yet.', 'لا توجد نطاقات مخصصة مربوطة بالمواقع حتى الآن.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SHARED TAB: ORDERS & TRANSACTIONS
          ===================================================================== */}
      {tab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12.5, color: 'var(--dp-text-muted)' }}>
              {isSuper
                ? t(
                    'All domain purchases, wholesale registrar costs, net profits, and manual fulfillment retries.',
                    'جميع طلبات الشراء والتجديد، تكلفة المسجّل، صافي الربح، وإعادة المحاولة عند تعثر التسجيل.'
                  )
                : t(
                    'Domain registration and renewal orders across your workspaces.',
                    'سجل طلبات شراء وتجديد النطاقات لمساحات العمل التابعة لك.'
                  )}
            </span>

            <select
              value={orderStatusFilter}
              onChange={e => setOrderStatusFilter(e.target.value as 'all' | 'completed' | 'paid' | 'failed')}
              className="dp-select dp-input-sm"
            >
              <option value="all">{t('All Statuses', 'جميع الحالات')}</option>
              <option value="completed">{t('Completed', 'مكتمل')}</option>
              <option value="paid">{t('Paid (Pending Registrar)', 'مدفوع (قيد التسجيل)')}</option>
              <option value="failed">{t('Failed', 'فشل')}</option>
            </select>
          </div>

          <div className="dp-card-flush">
            <div className="dp-table-wrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>{t('Domain', 'النطاق')}</th>
                    <th>{t('Customer', 'العميل')}</th>
                    <th>{t('Type', 'النوع')}</th>
                    {isSuper && <th>{t('Wholesale Cost', 'تكلفة الشراء')}</th>}
                    <th>{t('Customer Paid', 'سعر العميل')}</th>
                    {isSuper && <th>{t('Net Profit', 'صافي الربح')}</th>}
                    <th>{t('Status', 'الحالة')}</th>
                    <th>{t('Date', 'التاريخ')}</th>
                    {isSuper && <th />}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o.id}>
                      <td className="dp-mono" style={{ fontWeight: 700 }}>{o.domain}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.user_name || '—'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--dp-text-muted)' }}>
                          {o.user_email || o.user_id}
                        </div>
                      </td>
                      <td>
                        {o.type === 'renewal'
                          ? t('Renewal', 'تجديد')
                          : o.type === 'transfer'
                            ? t('Transfer', 'نقل')
                            : t('Registration', 'تسجيل')}
                      </td>
                      {isSuper && (
                        <td className="dp-mono" style={{ color: 'var(--dp-text-muted)' }}>
                          ${Number(o.registrar_cost || 0).toFixed(2)}
                        </td>
                      )}
                      <td className="dp-mono" style={{ fontWeight: 700 }}>
                        ${Number(o.customer_price || 0).toFixed(2)}
                      </td>
                      {isSuper && (
                        <td className="dp-mono" style={{ fontWeight: 700, color: 'var(--dp-emerald)' }}>
                          +${Number(o.profit || 0).toFixed(2)}
                        </td>
                      )}
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
                          {o.status}
                        </span>
                        {o.error_public && (
                          <div style={{ fontSize: 11, color: 'var(--dp-red)', marginTop: 4, maxWidth: 220 }}>
                            {o.error_public}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--dp-text-muted)' }}>
                        {o.created_at ? new Date(o.created_at).toLocaleString() : '—'}
                      </td>
                      {isSuper && (
                        <td>
                          {['failed', 'paid', 'processing', 'pending'].includes(o.status) && (
                            <button
                              type="button"
                              disabled={busy === `retry:${o.id}`}
                              onClick={() => void retryOrderFulfillment(o.id)}
                              className="dp-btn dp-btn-orange dp-btn-sm"
                            >
                              {busy === `retry:${o.id}` ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <RotateCcw size={12} />
                              )}
                              <span>{t('Retry Fulfillment', 'إعادة المحاولة')}</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={isSuper ? 9 : 6} style={{ textAlign: 'center', padding: 40, color: 'var(--dp-text-muted)' }}>
                        {t('No domain orders found.', 'لا توجد طلبات مسجلة حتى الآن.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUPERADMIN TAB 4: ANALYTICS & TLD DISTRIBUTION
          ===================================================================== */}
      {isSuper && tab === 'analytics' && (
        <div className="dp-form-grid">
          <div className="dp-card">
            <h3 className="dp-card-title" style={{ marginBottom: 16 }}>
              <BarChart3 size={17} style={{ color: 'var(--dp-orange)' }} />
              <span>{t('TLD Market Share & Popularity', 'توزيع الامتدادات الأكثر طلباً')}</span>
            </h3>
            {analytics.tldDistribution.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--dp-text-muted)' }}>
                {t('No registered domains yet to calculate share.', 'لا توجد نطاقات كافية لحساب التوزيع بعد.')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analytics.tldDistribution.map(([ext, count]) => {
                  const pct =
                    analytics.totalDomains > 0 ? Math.round((count / analytics.totalDomains) * 100) : 0;
                  return (
                    <div key={ext}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                        <span className="dp-mono" style={{ fontWeight: 700 }}>.{ext}</span>
                        <span style={{ color: 'var(--dp-text-muted)' }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: 'var(--dp-card-alt)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(pct, 5)}%`,
                            borderRadius: 999,
                            background: 'linear-gradient(90deg, #ea580c, #fbbf24)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dp-card">
            <h3 className="dp-card-title" style={{ marginBottom: 16 }}>
              <DollarSign size={17} style={{ color: 'var(--dp-emerald)' }} />
              <span>{t('Financial Performance Summary', 'ملخص الأداء المالي للنطاقات')}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 11, background: 'var(--dp-card-alt)' }}>
                <span style={{ color: 'var(--dp-text-secondary)', fontSize: 13 }}>
                  {t('Gross Domain Sales', 'إجمالي مبيعات النطاقات')}
                </span>
                <strong>${analytics.totalRevenue.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 11, background: 'var(--dp-card-alt)' }}>
                <span style={{ color: 'var(--dp-text-secondary)', fontSize: 13 }}>
                  {t('Registrar Wholesale Cost', 'تكلفة الشراء من المسجّل')}
                </span>
                <span>-${analytics.totalCost.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderRadius: 11, background: 'var(--dp-emerald-soft)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span style={{ color: 'var(--dp-emerald)', fontWeight: 700 }}>
                  {t('Net Platform Profit', 'صافي ربح المنصة')}
                </span>
                <strong style={{ color: 'var(--dp-emerald)', fontSize: 17 }}>
                  +${analytics.totalProfit.toFixed(2)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUPERADMIN TAB 5: REGISTRAR ERROR LOGS & HEALTH
          ===================================================================== */}
      {isSuper && tab === 'logs' && (
        <div className="dp-card-flush">
          <div className="dp-card-header">
            <h3 className="dp-card-title">
              <Activity size={17} style={{ color: 'var(--dp-amber)' }} />
              <span>{t('Registrar API Logs & Diagnostic Health', 'سجل أخطاء وتشخيص مسجّل النطاقات')}</span>
            </h3>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36 }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 10px', color: 'var(--dp-emerald)' }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {t(
                    'All systems running healthy. No registrar errors logged.',
                    'النظام يعمل بكفاءة ولا توجد أخطاء مسجلة.'
                  )}
                </div>
              </div>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    background: 'var(--dp-red-soft)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong className="dp-mono">
                      {log.domain} · {log.code || 'API_ERROR'}
                    </strong>
                    <span style={{ fontSize: 11.5 }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 6 }}>{log.message}</div>
                  {log.orderId && (
                    <div className="dp-mono" style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                      Order ID: {log.orderId}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          ADMIN TAB 4: SEARCH & BUY DOMAIN FOR OWN AGENCY WORKSPACE
          ===================================================================== */}
      {!isSuper && tab === 'buy' && <DomainsView returnPath="/admin/domains" />}

      {/* =====================================================================
          MODAL: SUPERADMIN REGISTRAR API CREDENTIALS (NAMECHEAP)
          ===================================================================== */}
      {isSuper &&
        showRegistrarModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="dp-theme-scope dp-modal-backdrop" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
            <form onSubmit={e => void handleSaveRegistrar(e)} className="dp-modal dp-modal-lg" role="dialog" aria-modal="true">
              <div className="dp-modal-head">
                <div>
                  <h3 className="dp-card-title">
                    <KeyRound size={18} style={{ color: 'var(--dp-orange)' }} />
                    <span>
                      {t(
                        'Root Domain Registrar Configuration (Namecheap)',
                        'إعدادات المزود الرئيسي لمسجّل النطاقات (Namecheap)'
                      )}
                    </span>
                  </h3>
                  <p className="dp-card-desc">
                    {t(
                      'Stored encrypted server-side in Firestore. Never exposed to Admins or Users.',
                      'تُحفظ المفاتيح بشكل آمن في الخادم ولا تظهر إطلاقاً للمسؤولين أو المستخدمين.'
                    )}
                  </p>
                </div>
                <button type="button" onClick={() => setShowRegistrarModal(false)} className="dp-btn dp-btn-sm">
                  <X size={16} />
                </button>
              </div>

              <div className="dp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="dp-form-grid">
                  <div>
                    <label className="dp-label">{t('API User (NAMECHEAP_API_USER)', 'اسم مستخدم API')}</label>
                    <input
                      value={regForm.apiUser}
                      onChange={e => setRegForm(p => ({ ...p, apiUser: e.target.value }))}
                      placeholder="your_namecheap_user"
                      className="dp-input dp-mono"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="dp-label">
                      {t('API Key', 'مفتاح API السري')}{' '}
                      {registrarConfig?.hasApiKey && (
                        <span style={{ color: 'var(--dp-emerald)' }}>({registrarConfig.maskedApiKey})</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={regForm.apiKey}
                      onChange={e => setRegForm(p => ({ ...p, apiKey: e.target.value }))}
                      placeholder={
                        registrarConfig?.hasApiKey
                          ? t('Leave blank to keep existing key', 'اتركه فارغاً للاحتفاظ بالمفتاح الحالي')
                          : t('Enter Namecheap API Key', 'أدخل مفتاح API من Namecheap')
                      }
                      className="dp-input dp-mono"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="dp-label">{t('Account Username (Optional)', 'اسم الحساب (اختياري)')}</label>
                    <input
                      value={regForm.userName}
                      onChange={e => setRegForm(p => ({ ...p, userName: e.target.value }))}
                      placeholder="Defaults to API User"
                      className="dp-input dp-mono"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="dp-label">{t('Whitelisted Server IPv4', 'عنوان IP الخادم المفعّل')}</label>
                    <input
                      value={regForm.clientIp}
                      onChange={e => setRegForm(p => ({ ...p, clientIp: e.target.value }))}
                      placeholder="e.g. 34.120.10.5"
                      className="dp-input dp-mono"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="dp-label">{t('Environment', 'بيئة التشغيل')}</label>
                    <select
                      value={regForm.environment}
                      onChange={e =>
                        setRegForm(p => ({ ...p, environment: e.target.value as 'sandbox' | 'production' }))
                      }
                      className="dp-select"
                      style={{ width: '100%' }}
                    >
                      <option value="sandbox">{t('Sandbox (Testing)', 'بيئة تجريبية (Sandbox)')}</option>
                      <option value="production">{t('Production (Live Domains)', 'بيئة فعلية (Production)')}</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: 22 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={regForm.sandboxSimulation}
                        onChange={e => setRegForm(p => ({ ...p, sandboxSimulation: e.target.checked }))}
                      />
                      <span>
                        {t(
                          'Enable Sandbox Simulation Mode (when live IP is not whitelisted)',
                          'تفعيل وضع المحاكاة الذكي (للاختبار بدون IP ثابت)'
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="dp-modal-foot">
                <button
                  type="button"
                  disabled={busy === 'test-reg'}
                  onClick={() => void handleTestRegistrar()}
                  className="dp-btn"
                >
                  {busy === 'test-reg' ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                  <span>{t('Test Connection', 'اختبار الاتصال')}</span>
                </button>
                <button type="button" onClick={() => setShowRegistrarModal(false)} className="dp-btn">
                  {t('Cancel', 'إلغاء')}
                </button>
                <button type="submit" disabled={busy === 'save-reg'} className="dp-btn dp-btn-orange">
                  {busy === 'save-reg' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{t('Save Registrar Config', 'حفظ إعدادات المسجّل')}</span>
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* =====================================================================
          MODAL: DNS RECORDS (Admin / Superadmin Support)
          ===================================================================== */}
      {dnsDomain &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="dp-theme-scope dp-modal-backdrop" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="dp-modal dp-modal-lg" role="dialog" aria-modal="true">
              <div className="dp-modal-head">
                <h3 className="dp-card-title">
                  DNS — <span className="dp-mono">{dnsDomain.domain}</span>
                </h3>
                <button type="button" onClick={() => setDnsDomain(null)} className="dp-btn dp-btn-sm">
                  <X size={16} />
                </button>
              </div>
              <div className="dp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  onClick={() =>
                    setDnsRecords(prev => [...prev, { name: '@', type: 'A', address: '', ttl: '1799' }])
                  }
                  className="dp-btn dp-btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Plus size={13} />
                  <span>{t('Add Record', 'إضافة سجل')}</span>
                </button>
                {dnsLoading ? (
                  <Loader2 size={22} className="animate-spin" style={{ margin: '20px auto' }} />
                ) : (
                  dnsRecords.map((rec, i) => (
                    <div key={i} className="dp-dns-row">
                      <input
                        value={rec.name}
                        onChange={e =>
                          setDnsRecords(prev => prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                        }
                        className="dp-input dp-input-sm dp-mono"
                      />
                      <select
                        value={rec.type}
                        onChange={e =>
                          setDnsRecords(prev => prev.map((x, idx) => (idx === i ? { ...x, type: e.target.value } : x)))
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
                        value={rec.address}
                        onChange={e =>
                          setDnsRecords(prev =>
                            prev.map((x, idx) => (idx === i ? { ...x, address: e.target.value } : x))
                          )
                        }
                        className="dp-input dp-input-sm dp-mono"
                      />
                      <input
                        value={rec.ttl || '1799'}
                        onChange={e =>
                          setDnsRecords(prev => prev.map((x, idx) => (idx === i ? { ...x, ttl: e.target.value } : x)))
                        }
                        className="dp-input dp-input-sm dp-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setDnsRecords(prev => prev.filter((_, idx) => idx !== i))}
                        className="dp-btn dp-btn-danger dp-btn-sm"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="dp-modal-foot">
                <button type="button" onClick={() => setDnsDomain(null)} className="dp-btn">
                  {t('Cancel', 'إلغاء')}
                </button>
                <button type="button" disabled={busy === 'save-dns'} onClick={() => void saveDnsModal()} className="dp-btn dp-btn-primary">
                  {t('Save DNS', 'حفظ')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =====================================================================
          MODAL: NAMESERVERS (Admin / Superadmin Support)
          ===================================================================== */}
      {nsDomain &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="dp-theme-scope dp-modal-backdrop" data-dp-theme={theme} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="dp-modal" role="dialog" aria-modal="true">
              <div className="dp-modal-head">
                <h3 className="dp-card-title">
                  Nameservers — <span className="dp-mono">{nsDomain.domain}</span>
                </h3>
                <button type="button" onClick={() => setNsDomain(null)} className="dp-btn dp-btn-sm">
                  <X size={16} />
                </button>
              </div>
              <div className="dp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nsValues.map((v, i) => (
                  <input
                    key={i}
                    value={v}
                    onChange={e => setNsValues(prev => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                    placeholder={`ns${i + 1}.example.com`}
                    className="dp-input dp-mono"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setNsValues(prev => [...prev, ''])}
                  className="dp-btn dp-btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Plus size={13} />
                  <span>{t('Add Nameserver', 'إضافة خادم')}</span>
                </button>
              </div>
              <div className="dp-modal-foot">
                <button type="button" onClick={() => setNsDomain(null)} className="dp-btn">
                  {t('Cancel', 'إلغاء')}
                </button>
                <button type="button" disabled={busy === 'save-ns'} onClick={() => void saveNameserversModal()} className="dp-btn dp-btn-primary">
                  {t('Save Nameservers', 'حفظ')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DomainsPage;
