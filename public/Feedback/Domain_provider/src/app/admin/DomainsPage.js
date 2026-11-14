'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Save,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Globe,
  ShoppingCart,
  Percent,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Server,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

async function adminFetch(path, { method = 'GET', body } = {}) {
  const { auth } = await import('../../lib/firebase');
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function money(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

export default function DomainsPage({ isRTL }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('pricing'); // 'analytics' | 'pricing' | 'domains' | 'orders' | 'logs'
  const [q, setQ] = useState('');
  const [domains, setDomains] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [settings, setSettings] = useState({ markup: 20, markup_type: 'percent' });
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [configured, setConfigured] = useState(true);

  // New TLD Form state
  const [showAddTld, setShowAddTld] = useState(false);
  const [newTld, setNewTld] = useState({
    extension: '',
    registrar_price: 10.0,
    renewal_cost: 12.0,
    transfer_cost: 10.0,
    markup: 20,
    markup_type: 'percent'
  });

  // Filter states
  const [domainStatusFilter, setDomainStatusFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setError('');
    try {
      const [d, o, p, l] = await Promise.all([
        adminFetch(`/api/admin/domains${q ? `?q=${encodeURIComponent(q)}` : ''}`),
        adminFetch('/api/admin/domains/orders'),
        adminFetch('/api/admin/domains/pricing'),
        adminFetch('/api/admin/domains/logs')
      ]);
      setDomains(d.domains || []);
      setOrders(o.orders || []);
      setPricing(p.pricing || []);
      if (p.settings) {
        setSettings({
          markup: p.settings.markup != null ? p.settings.markup : 20,
          markup_type: p.settings.markup_type || 'percent'
        });
      }
      setConfigured(p.namecheapConfigured !== false);
      setLogs(l.logs || []);
    } catch (err) {
      setError(err.message);
    }
  }, [q]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const showFeedback = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Analytics Aggregation
  const analytics = useMemo(() => {
    const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.customer_price) || 0), 0);
    const totalCost = orders.reduce((acc, o) => acc + (Number(o.registrar_cost) || 0), 0);
    const totalProfit = Math.round((totalRevenue - totalCost) * 100) / 100;
    const avgProfitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
    const activeDomainsCount = domains.filter((d) => d.status === 'active' || !d.status).length;
    const completedOrdersCount = orders.filter((o) => o.status === 'completed').length;
    const orderSuccessRate = orders.length > 0 ? Math.round((completedOrdersCount / orders.length) * 100) : 100;

    // TLD distribution
    const tldMap = {};
    domains.forEach((d) => {
      const ext = (d.extension || (d.domain && d.domain.split('.').pop()) || 'other').toLowerCase();
      tldMap[ext] = (tldMap[ext] || 0) + 1;
    });
    const tldDistribution = Object.entries(tldMap)
      .map(([ext, count]) => ({ ext, count, pct: Math.round((count / (domains.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      avgProfitMargin,
      activeDomainsCount,
      totalOrders: orders.length,
      completedOrdersCount,
      orderSuccessRate,
      tldDistribution
    };
  }, [domains, orders]);

  // Save single TLD pricing row
  const saveRow = async (row) => {
    setBusy(row.extension);
    setError('');
    try {
      await adminFetch('/api/admin/domains/pricing', {
        method: 'PUT',
        body: {
          extension: row.extension,
          registrar_price: Number(row.registrar_price) || 0,
          registration_price: Number(row.registration_price) || 0,
          renewal_price: Number(row.renewal_price) || 0,
          transfer_price: Number(row.transfer_price) || 0,
          markup: Number(row.markup),
          markup_type: row.markup_type,
          enabled: row.enabled
        }
      });
      await load();
      showFeedback(isRTL ? `تم حفظ تسعير .${row.extension} بنجاح!` : `Saved .${row.extension} pricing!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  // Save global markup settings
  const saveSettings = async () => {
    setBusy('settings');
    setError('');
    try {
      await adminFetch('/api/admin/domains/pricing', {
        method: 'PUT',
        body: { settings }
      });
      await load();
      showFeedback(isRTL ? 'تم حفظ الإعدادات العامة بنجاح' : 'Global settings saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  // Bulk Apply Markup to All TLDs
  const applyBulkMarkupToAll = async () => {
    setBusy('bulk');
    setError('');
    try {
      await adminFetch('/api/admin/domains/pricing', {
        method: 'PUT',
        body: {
          applyBulkMarkup: {
            markup: Number(settings.markup),
            markup_type: settings.markup_type
          }
        }
      });
      await load();
      showFeedback(
        isRTL
          ? `تم تطبيق هامش ربح ${settings.markup}${settings.markup_type === 'percent' ? '%' : '$'} على جميع الامتدادات بنجاح!`
          : `Applied ${settings.markup}${settings.markup_type === 'percent' ? '%' : '$'} profit margin to all TLDs!`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  // Sync Live Costs from Namecheap
  const refreshFromRegistrar = async () => {
    setBusy('refresh');
    setError('');
    try {
      await adminFetch('/api/admin/domains/pricing', {
        method: 'PUT',
        body: { refreshRegistrar: true }
      });
      await load();
      showFeedback(isRTL ? 'تم جلب الأسعار المباشرة من Namecheap وتحديث الأرباح!' : 'Fetched live Namecheap prices and updated pricing!');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  // Add new TLD
  const handleAddNewTld = async (e) => {
    e.preventDefault();
    const ext = String(newTld.extension || '').replace(/^\./, '').trim().toLowerCase();
    if (!ext) return;
    setBusy('add_tld');
    setError('');
    try {
      const regCost = Number(newTld.registrar_price) || 10;
      const markup = Number(newTld.markup) || Number(settings.markup) || 20;
      const type = newTld.markup_type || settings.markup_type || 'percent';
      const regPrice = type === 'percent' ? Math.round(regCost * (1 + markup / 100) * 100) / 100 : regCost + markup;
      const renPrice = type === 'percent' ? Math.round((Number(newTld.renewal_cost) || regCost) * (1 + markup / 100) * 100) / 100 : (Number(newTld.renewal_cost) || regCost) + markup;

      await adminFetch('/api/admin/domains/pricing', {
        method: 'PUT',
        body: {
          extension: ext,
          registrar_price: regCost,
          renewal_cost: Number(newTld.renewal_cost) || regCost,
          transfer_cost: Number(newTld.transfer_cost) || regCost,
          registration_price: regPrice,
          renewal_price: renPrice,
          transfer_price: regPrice,
          markup,
          markup_type: type,
          enabled: true
        }
      });
      setShowAddTld(false);
      setNewTld({ extension: '', registrar_price: 10, renewal_cost: 12, transfer_cost: 10, markup: 20, markup_type: 'percent' });
      await load();
      showFeedback(isRTL ? `تمت إضافة امتداد .${ext} بنجاح!` : `Added .${ext} successfully!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  // Retry failed order
  const retry = async (id) => {
    setBusy(id);
    setError('');
    try {
      await adminFetch(`/api/admin/domains/orders/${id}/retry`, { method: 'POST', body: {} });
      await load();
      showFeedback(isRTL ? 'تمت إعادة محاولة تسجيل النطاق' : 'Retried domain order fulfillment');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const L = (en, ar) => (isRTL ? ar : en);

  // Quick preset helper
  const setPresetMarkup = (val, type = 'percent') => {
    setSettings({ markup: val, markup_type: type });
  };

  // Filtered lists
  const filteredDomains = domains.filter((d) => {
    if (domainStatusFilter === 'active') return d.status === 'active' || !d.status;
    if (domainStatusFilter === 'expired') return d.status === 'expired';
    return true;
  });

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all') return o.status === orderStatusFilter;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease' }}>
      
      {/* Top Banner Warnings & Success Messages */}
      {!configured && (
        <div className="card" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} style={{ color: 'var(--amber)' }} />
          <div>
            <div style={{ fontWeight: 800, color: 'var(--amber)' }}>{L('Namecheap API Keys / IP Missing', 'مفاتيح Namecheap أو الآي بي غير مكتملة')}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              {L('Make sure NAMECHEAP_API_KEY and NAMECHEAP_CLIENT_IP are configured in .env.local and whitelisted in Namecheap.', 'تأكد من كتابة المفتاح والآي بي في ملف .env.local وتفعيلهما في لوحة تحكم Namecheap.')}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* 🚀 Top Executive Financial KPIs */}
      <div className="grid-4" style={{ gap: 14 }}>
        <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--green)', display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{L('Net Domain Profit', 'صافي أرباح النطاقات')}</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
            {money(analytics.totalProfit)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--green)', fontWeight: 800 }}>+{analytics.avgProfitMargin}%</span> {L('avg profit margin', 'متوسط هامش الربح')}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{L('Total Domain Revenue', 'إجمالي مبيعات النطاقات')}</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236,92,49,0.15)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
            {money(analytics.totalRevenue)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {L(`Wholesale cost: ${money(analytics.totalCost)}`, `تكلفة الشراء: ${money(analytics.totalCost)}`)}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--blue)', display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{L('Active Users Domains', 'نطاقات المستخدمين النشطة')}</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.15)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
            {analytics.activeDomainsCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {L(`Total registered: ${domains.length}`, `إجمالي المسجلة: ${domains.length}`)}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--purple)', display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{L('Orders & Registrar Health', 'الطلبات وحالة المسجّل')}</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168,85,247,0.15)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
            {analytics.completedOrdersCount} <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>/ {analytics.totalOrders}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: configured ? 'var(--green)' : 'var(--red)', display: 'inline-block' }}></span>
            <span>{configured ? L('Namecheap Connected', 'متصل مع Namecheap') : L('Unconfigured', 'غير مربوط')}</span>
          </div>
        </div>
      </div>

      {/* 🧭 Navigation Sub-tabs */}
      <div className="card flex-between" style={{ padding: '8px 14px', margin: 0, flexWrap: 'wrap', gap: 8, background: 'var(--bg2)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['pricing', L('TLD Pricing & Profit Margins', 'تسعير الامتدادات وهوامش الأرباح'), Percent],
            ['domains', L('Users Domains', 'نطاقات المستخدمين'), Globe],
            ['orders', L('Orders & Transactions', 'الطلبات وسجل العمليات'), ShoppingCart],
            ['analytics', L('Analytics & Distribution', 'التحليلات وتوزيع النطاقات'), TrendingUp],
            ['logs', L('Registrar Logs & Health', 'سجل أخطاء المسجّل'), Server]
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: tab === key ? 800 : 500 }}
            >
              <Icon size={14} />
              <span>{label}</span>
              {key === 'domains' && domains.length > 0 && <span style={{ opacity: 0.8, fontSize: 11 }}>({domains.length})</span>}
              {key === 'orders' && orders.length > 0 && <span style={{ opacity: 0.8, fontSize: 11 }}>({orders.length})</span>}
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={busy !== ''} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} className={busy ? 'spin' : ''} />
          <span>{L('Refresh Data', 'تحديث البيانات')}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 🏷️ TAB 1: TLD PRICING & PROFIT MARGINS */}
      {/* ========================================================================= */}
      {tab === 'pricing' && (
        <>
          {/* Smart Profit & Markup Control Center */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(236,92,49,0.08) 0%, rgba(168,85,247,0.05) 100%)', borderColor: 'rgba(236,92,49,0.25)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                    {L('Global Profit & Markup Controller', 'التحكم في نسبة وهامش الربح على النطاقات')}
                  </h3>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text2)', margin: '4px 0 0 0' }}>
                  {L(
                    'Define your profit percentage or fixed fee added on top of registrar costs. You can apply it globally across all extensions with one click.',
                    'حدد النسبة المئوية أو المبلغ الثابت للربح فوق سعر تكلفة المسجّل. يمكنك تطبيقه بنقرة واحدة على جميع الامتدادات.'
                  )}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy === 'bulk'}
                  onClick={applyBulkMarkupToAll}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}
                >
                  <ArrowUpRight size={14} />
                  <span>{L(`Apply ${settings.markup}${settings.markup_type === 'percent' ? '%' : '$'} to All TLDs`, `تطبيق ${settings.markup}${settings.markup_type === 'percent' ? '%' : '$'} على كل الامتدادات`)}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy === 'refresh'}
                  onClick={refreshFromRegistrar}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw size={13} className={busy === 'refresh' ? 'spin' : ''} />
                  <span>{L('Sync Namecheap Live Costs', 'جلب تكلفة Namecheap المباشرة')}</span>
                </button>
              </div>
            </div>

            {/* Input & Preset Controls */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg)', padding: '14px 18px', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
                  {L('Profit Type:', 'نوع الربح:')}
                </label>
                <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 8, padding: 3, border: '1px solid var(--line)' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${settings.markup_type === 'percent' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '4px 12px', height: 'auto', borderRadius: 6 }}
                    onClick={() => setSettings((s) => ({ ...s, markup_type: 'percent' }))}
                  >
                    {L('Percentage (%)', 'نسبة مئوية (%)')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${settings.markup_type === 'fixed' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '4px 12px', height: 'auto', borderRadius: 6 }}
                    onClick={() => setSettings((s) => ({ ...s, markup_type: 'fixed' }))}
                  >
                    {L('Fixed Amount ($)', 'مبلغ ثابت ($)')}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
                  {settings.markup_type === 'percent' ? L('Profit Margin (%):', 'نسبة الربح (%):') : L('Profit Amount ($):', 'مبلغ الربح ($):')}
                </label>
                <div style={{ position: 'relative', width: 110 }}>
                  <input
                    className="inp"
                    type="number"
                    step={settings.markup_type === 'percent' ? '1' : '0.01'}
                    value={settings.markup}
                    onChange={(e) => setSettings((s) => ({ ...s, markup: e.target.value }))}
                    style={{ paddingInlineEnd: 28, fontWeight: 800, textAlign: 'center' }}
                  />
                  <span style={{ position: 'absolute', [isRTL ? 'left' : 'right']: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 13, fontWeight: 800 }}>
                    {settings.markup_type === 'percent' ? '%' : '$'}
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>{L('Presets:', 'نسب جاهزة:')}</span>
                {[15, 20, 25, 30, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 800,
                      background: settings.markup_type === 'percent' && Number(settings.markup) === pct ? 'var(--accent)' : 'var(--bg2)',
                      color: settings.markup_type === 'percent' && Number(settings.markup) === pct ? '#fff' : 'var(--text2)'
                    }}
                    onClick={() => setPresetMarkup(pct, 'percent')}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy === 'settings'}
                onClick={saveSettings}
                style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Save size={13} />
                <span>{L('Save Defaults', 'حفظ الإعداد الافتراضي')}</span>
              </button>
            </div>

            {/* 💡 Live Profit Simulator */}
            <div style={{ marginTop: 14, padding: '10px 16px', background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <ShieldCheck size={16} style={{ color: 'var(--green)' }} />
                <span>
                  {settings.markup_type === 'percent' ? (
                    <>
                      {L('Profit Simulator: If a .com costs you ', 'محاكي الربح: إذا كانت تكلفة .com عليك ')}
                      <strong>$10.00</strong>
                      {L(` + ${settings.markup}% profit margin → Customer pays `, ` + هامش ربح ${settings.markup}% → يدفع العميل `)}
                      <strong style={{ color: 'var(--accent)' }}>${(10 * (1 + Number(settings.markup || 0) / 100)).toFixed(2)}</strong>
                      {L(' → Your Net Profit: ', ' → صافي ربحك: ')}
                      <strong style={{ color: 'var(--green)' }}>+${(10 * (Number(settings.markup || 0) / 100)).toFixed(2)}</strong>
                      {L(' per domain sale!', ' في كل عملية بيع!')}
                    </>
                  ) : (
                    <>
                      {L('Profit Simulator: If a .com costs you ', 'محاكي الربح: إذا كانت تكلفة .com عليك ')}
                      <strong>$10.00</strong>
                      {L(` + $${settings.markup} fixed profit → Customer pays `, ` + ربح ثابت $${settings.markup} → يدفع العميل `)}
                      <strong style={{ color: 'var(--accent)' }}>${(10 + Number(settings.markup || 0)).toFixed(2)}</strong>
                      {L(' → Your Net Profit: ', ' → صافي ربحك: ')}
                      <strong style={{ color: 'var(--green)' }}>+${Number(settings.markup || 0).toFixed(2)}</strong>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* TLD Matrix Table Header & Add TLD */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  {L('TLD Pricing Matrix & Profit Breakdown', 'جدول تسعير الامتدادات وحساب الأرباح')}
                </h3>
                <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>
                  {L('Manage registrar wholesale costs, customer registration/renewal prices, and custom markups per TLD.', 'تحكم في أسعار التكلفة وسعر البيع وهوامش الربح لكل امتداد بشكل منفصل.')}
                </span>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddTld(!showAddTld)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} />
                <span>{showAddTld ? L('Close Form', 'إغلاق') : L('Add New TLD', 'إضافة امتداد جديد')}</span>
              </button>
            </div>

            {/* Add New TLD Form Modal / Inset */}
            {showAddTld && (
              <form onSubmit={handleAddNewTld} style={{ background: 'var(--bg2)', padding: 16, borderRadius: 10, border: '1px solid var(--line2)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>{L('Add New Domain Extension', 'إضافة نطاق بامتداد مخصص')}</div>
                <div className="grid-4" style={{ gap: 10 }}>
                  <label style={{ fontSize: 11.5 }}>
                    {L('Extension (e.g. tech, shop)', 'الامتداد (بدون نقطة)')}
                    <input className="inp" required placeholder="tech" value={newTld.extension} onChange={(e) => setNewTld({ ...newTld, extension: e.target.value })} />
                  </label>
                  <label style={{ fontSize: 11.5 }}>
                    {L('Registrar Cost ($)', 'تكلفة المسجّل ($)')}
                    <input className="inp" type="number" step="0.01" value={newTld.registrar_price} onChange={(e) => setNewTld({ ...newTld, registrar_price: e.target.value })} />
                  </label>
                  <label style={{ fontSize: 11.5 }}>
                    {L('Profit Margin (% or $)', 'هامش الربح')}
                    <input className="inp" type="number" step="0.01" value={newTld.markup} onChange={(e) => setNewTld({ ...newTld, markup: e.target.value })} />
                  </label>
                  <label style={{ fontSize: 11.5 }}>
                    {L('Markup Type', 'نوع الهامش')}
                    <select className="inp" value={newTld.markup_type} onChange={(e) => setNewTld({ ...newTld, markup_type: e.target.value })}>
                      <option value="percent">{L('Percentage %', 'نسبة %')}</option>
                      <option value="fixed">{L('Fixed $', 'ثابت $')}</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddTld(false)}>{L('Cancel', 'إلغاء')}</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={busy === 'add_tld'}>{L('Save TLD', 'حفظ الامتداد')}</button>
                </div>
              </form>
            )}

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text3)', textAlign: isRTL ? 'right' : 'left', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '10px 8px' }}>TLD</th>
                    <th style={{ padding: '10px 8px' }}>{L('Registrar Cost', 'تكلفة المسجّل')}</th>
                    <th style={{ padding: '10px 8px' }}>{L('Register Price', 'سعر التسجيل')}</th>
                    <th style={{ padding: '10px 8px' }}>{L('Renewal Price', 'سعر التجديد')}</th>
                    <th style={{ padding: '10px 8px' }}>{L('Transfer Price', 'سعر النقل')}</th>
                    <th style={{ padding: '10px 8px' }}>{L('Markup', 'الهامش')}</th>
                    <th style={{ padding: '10px 8px' }}>{L('Net Profit', 'صافي الربح')}</th>
                    <th style={{ padding: '10px 8px' }}>{L('Margin', 'النسبة')}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>{L('Enabled', 'مفعّل')}</th>
                    <th style={{ padding: '10px 8px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.map((row, i) => {
                    const regCost = Number(row.registrar_price) || 0;
                    const custPrice = Number(row.registration_price) || 0;
                    const profit = Math.round((custPrice - regCost) * 100) / 100;
                    const marginPct = custPrice > 0 ? Math.round((profit / custPrice) * 100) : 0;

                    return (
                      <tr key={row.extension} style={{ borderTop: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        {/* Extension Badge */}
                        <td style={{ padding: '10px 8px', fontWeight: 900 }}>
                          <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--accent)', fontSize: 13, padding: '4px 8px' }}>
                            .{row.extension}
                          </span>
                        </td>

                        {/* Registrar Cost */}
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ position: 'relative', width: 85 }}>
                            <input
                              className="inp"
                              type="number"
                              step="0.01"
                              value={row.registrar_price}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPricing((p) => p.map((r, idx) => idx === i ? { ...r, registrar_price: val } : r));
                              }}
                              style={{ width: '100%', fontSize: 12, padding: '4px 8px' }}
                            />
                          </div>
                        </td>

                        {/* Register Price */}
                        <td style={{ padding: '10px 8px' }}>
                          <input
                            className="inp"
                            type="number"
                            step="0.01"
                            value={row.registration_price}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPricing((p) => p.map((r, idx) => idx === i ? { ...r, registration_price: val } : r));
                            }}
                            style={{ width: 85, fontSize: 12, padding: '4px 8px', fontWeight: 800, color: 'var(--text)' }}
                          />
                        </td>

                        {/* Renewal Price */}
                        <td style={{ padding: '10px 8px' }}>
                          <input
                            className="inp"
                            type="number"
                            step="0.01"
                            value={row.renewal_price}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPricing((p) => p.map((r, idx) => idx === i ? { ...r, renewal_price: val } : r));
                            }}
                            style={{ width: 85, fontSize: 12, padding: '4px 8px' }}
                          />
                        </td>

                        {/* Transfer Price */}
                        <td style={{ padding: '10px 8px' }}>
                          <input
                            className="inp"
                            type="number"
                            step="0.01"
                            value={row.transfer_price}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPricing((p) => p.map((r, idx) => idx === i ? { ...r, transfer_price: val } : r));
                            }}
                            style={{ width: 85, fontSize: 12, padding: '4px 8px' }}
                          />
                        </td>

                        {/* Markup */}
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              className="inp"
                              type="number"
                              step="0.01"
                              value={row.markup}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPricing((p) => p.map((r, idx) => idx === i ? { ...r, markup: val } : r));
                              }}
                              style={{ width: 60, fontSize: 12, padding: '4px 6px' }}
                            />
                            <select
                              className="inp"
                              value={row.markup_type || 'percent'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPricing((p) => p.map((r, idx) => idx === i ? { ...r, markup_type: val } : r));
                              }}
                              style={{ width: 45, fontSize: 11, padding: '4px 2px' }}
                            >
                              <option value="percent">%</option>
                              <option value="fixed">$</option>
                            </select>
                          </div>
                        </td>

                        {/* Profit Amount Badge */}
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{ fontWeight: 800, color: profit >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 12.5 }}>
                            {profit >= 0 ? `+${money(profit)}` : money(profit)}
                          </span>
                        </td>

                        {/* Profit Margin % */}
                        <td style={{ padding: '10px 8px' }}>
                          <span className="badge" style={{ background: marginPct >= 20 ? 'rgba(16,185,129,0.15)' : 'rgba(236,92,49,0.15)', color: marginPct >= 20 ? 'var(--green)' : 'var(--accent)', fontSize: 11, fontWeight: 800 }}>
                            {marginPct}%
                          </span>
                        </td>

                        {/* Enabled Switch */}
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={row.enabled !== false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setPricing((p) => p.map((r, idx) => idx === i ? { ...r, enabled: checked } : r));
                            }}
                          />
                        </td>

                        {/* Save Button */}
                        <td style={{ padding: '10px 8px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy === row.extension}
                            onClick={() => saveRow(row)}
                            title={L('Save this TLD', 'حفظ هذا الامتداد')}
                            style={{ padding: '5px 8px' }}
                          >
                            <Save size={14} className={busy === row.extension ? 'spin' : ''} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 🌐 TAB 2: USERS REGISTERED DOMAINS */}
      {/* ========================================================================= */}
      {tab === 'domains' && (
        <div className="card" style={{ margin: 0 }}>
          {/* Header & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260, maxWidth: 450, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={15} style={{ position: 'absolute', [isRTL ? 'right' : 'left']: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  className="inp"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={L('Search domain, customer name or email...', 'بحث بالنطاق أو اسم العميل أو الإيميل...')}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                  style={{ paddingInlineStart: 32 }}
                />
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
                {L('Search', 'بحث')}
              </button>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={14} style={{ color: 'var(--text3)' }} />
              <select className="inp" value={domainStatusFilter} onChange={(e) => setDomainStatusFilter(e.target.value)} style={{ fontSize: 12 }}>
                <option value="all">{L('All Domains', 'جميع النطاقات')}</option>
                <option value="active">{L('Active Only', 'النشطة فقط')}</option>
                <option value="expired">{L('Expired', 'المنتهية')}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text3)', textAlign: isRTL ? 'right' : 'left', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '10px 8px' }}>{L('Domain Name', 'اسم النطاق')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Customer / Owner', 'العميل المالك')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Price Paid', 'المبلغ المدفوع')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Registered At', 'تاريخ التسجيل')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Expires At', 'تاريخ الانتهاء')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Status', 'الحالة')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Auto-Renew', 'تجديد تلقائي')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDomains.map((d) => {
                  const isExpiringSoon = d.expires_at && new Date(d.expires_at).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={d.id} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 800, color: 'var(--text)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Globe size={14} style={{ color: 'var(--accent)' }} />
                          <span>{d.domain}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 700 }}>{d.user_name || d.user_email || 'User'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.user_email}</div>
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                        {money(d.registration_price)}
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text2)' }}>
                        {String(d.registered_at || d.created_at || '').slice(0, 10) || '-'}
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: 12 }}>
                        <span style={{ color: isExpiringSoon ? 'var(--amber)' : 'var(--text2)', fontWeight: isExpiringSoon ? 800 : 500 }}>
                          {String(d.expires_at || '').slice(0, 10) || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span className={`badge ${d.status === 'expired' ? 'badge-red' : 'badge-green'}`} style={{ fontSize: 11 }}>
                          {d.status || 'active'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: 12 }}>
                        {d.auto_renew !== false ? (
                          <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={13} /> {L('Enabled', 'مفعّل')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text3)' }}>{L('Disabled', 'معطّل')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredDomains.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: 'var(--text3)' }}>
                      {L('No domains found.', 'لا توجد نطاقات مسجلة حالياً.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛒 TAB 3: ORDERS & TRANSACTIONS */}
      {/* ========================================================================= */}
      {tab === 'orders' && (
        <div className="card" style={{ margin: 0 }}>
          {/* Header & Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                {L('Domain Purchase & Renewal Orders', 'طلبات الشراء والتجديد')}
              </h3>
              <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>
                {L('Track purchase costs, customer pricing, profit per order, and retry stuck registrations.', 'متابعة تكاليف الطلبات، سعر البيع، الأرباح، وإعادة محاولة العمليات المعلقة.')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={14} style={{ color: 'var(--text3)' }} />
              <select className="inp" value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} style={{ fontSize: 12 }}>
                <option value="all">{L('All Statuses', 'جميع الحالات')}</option>
                <option value="completed">{L('Completed', 'مكتمل')}</option>
                <option value="paid">{L('Paid (Pending Registrar)', 'مدفوع (قيد التسجيل)')}</option>
                <option value="failed">{L('Failed', 'فشل')}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text3)', textAlign: isRTL ? 'right' : 'left', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '10px 8px' }}>{L('Domain', 'النطاق')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Customer', 'العميل')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Type', 'النوع')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Wholesale Cost', 'تكلفة الشراء')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Customer Paid', 'سعر العميل')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Net Profit', 'صافي الربح')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Status', 'الحالة')}</th>
                  <th style={{ padding: '10px 8px' }}>{L('Date', 'التاريخ')}</th>
                  <th style={{ padding: '10px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 800 }}>{o.domain}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{o.user_name || o.user_email}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{o.user_email}</div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className="badge" style={{ background: 'var(--bg3)', fontSize: 11 }}>
                        {o.type || 'registration'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                      {money(o.registrar_cost)}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--text)' }}>
                      {money(o.customer_price)}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--green)' }}>
                      +{money(o.profit)}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className={`badge ${o.status === 'completed' ? 'badge-green' : o.status === 'failed' ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                        {o.status}
                      </span>
                      {o.error_public && <div style={{ color: 'var(--red)', fontSize: 10, marginTop: 2 }}>{o.error_public}</div>}
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 11.5, color: 'var(--text3)' }}>
                      {String(o.created_at || '').slice(0, 16).replace('T', ' ')}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      {['failed', 'paid', 'processing'].includes(o.status) && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={busy === o.id}
                          onClick={() => retry(o.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                        >
                          <RotateCcw size={12} className={busy === o.id ? 'spin' : ''} />
                          <span>{L('Retry Fulfillment', 'إعادة المحاولة')}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: 30, textAlign: 'center', color: 'var(--text3)' }}>
                      {L('No orders found.', 'لا توجد طلبات مسجلة حالياً.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 TAB 4: ANALYTICS & DISTRIBUTION */}
      {/* ========================================================================= */}
      {tab === 'analytics' && (
        <div className="grid-2" style={{ gap: 16 }}>
          {/* TLD Distribution */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  {L('TLD Market Share & Popularity', 'توزيع الامتدادات الأكثر طلباً')}
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{L('Breakdown of registered domains by TLD', 'نسبة تسجيل النطاقات حسب كل امتداد')}</span>
              </div>
              <Globe size={18} style={{ color: 'var(--accent)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {analytics.tldDistribution.map((tld, idx) => (
                <div key={tld.ext}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ fontWeight: 800, color: 'var(--text)' }}>.{tld.ext}</span>
                    <span style={{ color: 'var(--text2)', fontWeight: 'bold' }}>{tld.count} {L('domains', 'نطاق')} ({tld.pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(tld.pct, 4)}%`, height: '100%', background: idx === 0 ? 'var(--accent)' : idx === 1 ? 'var(--green)' : 'var(--blue)', borderRadius: 10 }}></div>
                  </div>
                </div>
              ))}
              {analytics.tldDistribution.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 20 }}>
                  {L('No domain registrations yet.', 'لا توجد نطاقات مسجلة حتى الآن.')}
                </div>
              )}
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  {L('Financial Performance Summary', 'ملخص الأداء المالي للنطاقات')}
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{L('Profitability and markup efficiency', 'معدلات الربحية وكفاءة الهامش')}</span>
              </div>
              <DollarSign size={18} style={{ color: 'var(--green)' }} />
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{L('Gross Domain Sales', 'إجمالي مبيعات النطاقات')}:</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{money(analytics.totalRevenue)}</span>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{L('Registrar Wholesale Cost', 'تكلفة الشراء من المسجّل')}:</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--red)', fontFamily: 'var(--mono)' }}>-{money(analytics.totalCost)}</span>
            </div>

            <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.1)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{L('Net Platform Profit', 'صافي ربح المنصة')}:</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--green)', fontFamily: 'var(--mono)' }}>+{money(analytics.totalProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚠️ TAB 5: REGISTRAR LOGS & HEALTH */}
      {/* ========================================================================= */}
      {tab === 'logs' && (
        <div className="card" style={{ margin: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              {L('Registrar API Logs & Diagnostic Health', 'سجل أخطاء وتشخيص مسجّل النطاقات')}
            </h3>
            <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>
              {L('Review any API communication issues with Namecheap endpoints.', 'مراجعة أي استجابات خاطئة أو تنبيهات أثناء الاتصال بـ Namecheap.')}
            </span>
          </div>

          {logs.map((log) => (
            <div key={log.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: 'var(--text)' }}>{log.domain} · {log.code || 'API Error'}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{log.createdAt}</span>
              </div>
              <div style={{ color: 'var(--red)', marginTop: 4 }}>{log.message}</div>
              {log.orderId && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Order ID: {log.orderId}</div>}
            </div>
          ))}

          {!logs.length && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
              <CheckCircle2 size={24} style={{ color: 'var(--green)', margin: '0 auto 8px auto', display: 'block' }} />
              {L('All systems running healthy. No registrar errors logged.', 'النظام يعمل بكفاءة ولا توجد أخطاء مسجلة.')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
