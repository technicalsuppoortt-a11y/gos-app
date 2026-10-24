'use client';

import React, { useEffect, useState } from 'react';
import { 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Globe, 
  Link2, 
  RefreshCw, 
  Trash2, 
  HelpCircle,
  ShieldCheck,
  Zap,
  X
} from 'lucide-react';
import { 
  connectFunnelDomain, 
  getCnameTarget, 
  getApexIpTarget,
  getProductionUrls, 
  isApexDomain, 
  markDomainStatus, 
  normalizeHost, 
  publishFunnelPublic, 
  publishStorePublic 
} from '@/lib/sites/publicSite';

export default function DomainSettings({
  funnel,
  stepIdx = 0,
  ownerUid,
  isRtl,
  onSaveFunnel,
  showToast
}) {
  const [domainInput, setDomainInput] = useState(funnel?.domain || '');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState('');
  const [dns, setDns] = useState(null);
  const [activeDnsTab, setActiveDnsTab] = useState('cname'); // 'cname' | 'a_record'
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  useEffect(() => {
    setDomainInput(funnel?.domain || '');
  }, [funnel?.id, funnel?.domain]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const urls = getProductionUrls({ origin, funnel, stepIdx });
  const cnameTarget = getCnameTarget();
  const apexIpTarget = getApexIpTarget();
  const host = normalizeHost(domainInput);
  const apex = host ? isApexDomain(host) : false;
  
  // Compute subdomain prefix
  const parts = host ? host.split('.') : [];
  const subdomainPrefix = parts.length > 2 ? parts[0] : (parts.length === 2 ? '@' : 'www');
  const status = funnel?.domainStatus || (funnel?.domain ? 'pending' : '');

  const copyText = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
      showToast?.(isRtl ? 'تم النسخ إلى الحافظة' : 'Copied to clipboard');
    } catch {
      window.prompt(isRtl ? 'انسخ' : 'Copy', value);
    }
  };

  const saveDomain = async (overrideHost) => {
    if (!funnel?.id) return;
    const targetHost = overrideHost !== undefined ? normalizeHost(overrideHost) : host;
    setBusy(true);
    try {
      const connected = await connectFunnelDomain({
        funnelId: funnel.id,
        ownerUid,
        host: targetHost,
        previousHost: funnel.domain
      });
      const nextFunnel = {
        ...funnel,
        domain: connected.host,
        domainStatus: connected.host ? 'pending' : ''
      };
      onSaveFunnel({
        domain: nextFunnel.domain,
        domainStatus: nextFunnel.domainStatus
      });
      const isStore = nextFunnel.kind === 'store' || Array.isArray(nextFunnel.products) || (Array.isArray(nextFunnel.pages) && !Array.isArray(funnel.steps));
      if (isStore) {
        await publishStorePublic({
          store: { ...nextFunnel, pages: nextFunnel.pages || nextFunnel.steps || [] },
          ownerUid,
          defaultPageIdx: stepIdx
        });
      } else if ((funnel.steps || []).some((step) => step.published)) {
        await publishFunnelPublic({ funnel: nextFunnel, ownerUid, defaultStepIdx: stepIdx });
      }
      setDns(null);
      if (connected.host) {
        // Auto-provision in background on Vercel
        fetch('/api/sites/verify-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: connected.host })
        }).then(r => r.json()).then(data => {
          if (data?.matched) {
            onSaveFunnel({ domain: connected.host, domainStatus: 'connected' });
          }
        }).catch(() => {});
      }
      showToast?.(connected.host
        ? (isRtl ? 'تم حفظ الدومين بنجاح. أضف سجلات DNS ثم افحص الاتصال.' : 'Domain saved. Configure your DNS records, then verify connection.')
        : (isRtl ? 'تمت إزالة الدومين' : 'Domain disconnected'));
    } catch (err) {
      showToast?.(err.message || (isRtl ? 'تعذر حفظ الدومين' : 'Could not save domain'));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmRemove = async () => {
    const prevDomain = funnel?.domain || host;
    setIsRemoveModalOpen(false);
    setDomainInput('');
    if (prevDomain) {
      fetch('/api/sites/verify-domain', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: prevDomain })
      }).catch(() => {});
    }
    await saveDomain('');
  };

  const checkDomain = async () => {
    if (!host) return;
    setChecking(true);
    try {
      const res = await fetch('/api/sites/verify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host })
      });
      const data = await res.json();
      setDns(data);
      const nextStatus = data.matched ? 'connected' : 'pending';
      onSaveFunnel({ domain: host, domainStatus: nextStatus });
      await markDomainStatus(host, nextStatus, { funnelId: funnel.id, ownerUid });
      
      if (data.matched) {
        showToast?.(isRtl ? '✅ تم الاتصال بالدومين بنجاح! يعمل الآن.' : '✅ Domain DNS connected successfully!');
      } else {
        showToast?.(isRtl 
          ? '⏳ لم نجد السجلات الصحيحة بعد. قد يستغرق انتشار DNS بضع دقائق، أعد الفحص لاحقاً.' 
          : '⏳ DNS records not detected yet. Propagation can take a few minutes, please check again shortly.');
      }
    } catch (err) {
      showToast?.(err.message || (isRtl ? 'فشل فحص DNS' : 'DNS check failed'));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* UpKlick Production Default URL Card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--t1)', fontSize: 14 }}>
            <Link2 size={17} style={{ color: '#2563eb' }} />
            <span>{isRtl ? 'رابط الإنتاج الافتراضي (UpKlick)' : 'UpKlick Default Production URL'}</span>
          </div>
          <span style={{ fontSize: 11, background: 'rgba(37,99,235,0.12)', color: '#2563eb', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
            {isRtl ? 'جاهز دائماً' : 'Always Ready'}
          </span>
        </div>
        <p style={{ color: 'var(--t2)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
          {isRtl
            ? 'رابط عام مجاني متاح دائماً بدون دومين خاص، يعمل مباشرة بعد نشر أي خطوة في الفانل.'
            : 'A free public URL available immediately without any custom domain setup, live as soon as you publish.'}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly className="inp" value={urls.appPublished} style={{ flex: 1, fontSize: 13, background: 'var(--surface2)' }} />
          <button type="button" className="btn btn-ghost" title={isRtl ? 'نسخ' : 'Copy'} onClick={() => copyText('app', urls.appPublished)}>
            {copied === 'app' ? <CheckCircle2 size={15} style={{ color: '#16a34a' }} /> : <Copy size={15} />}
          </button>
          <button type="button" onClick={() => window.open(urls.appPublished, '_blank')} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ExternalLink size={15} />
          </button>
        </div>
      </div>

      {/* Connect Custom Real Domain Card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--t1)', fontSize: 16 }}>
            <Globe size={18} style={{ color: '#10b981' }} />
            <span>{isRtl ? 'ربط دومين حقيقي خاص (Custom Domain)' : 'Connect Your Real Custom Domain'}</span>
          </div>
          {funnel?.domain ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ 
                fontSize: 12, 
                fontWeight: 800, 
                padding: '3px 10px',
                borderRadius: 20,
                background: status === 'connected' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                color: status === 'connected' ? '#16a34a' : '#f97316',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}>
                {status === 'connected' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {status === 'connected' ? (isRtl ? 'متصل وجاهز' : 'Connected & Live') : (isRtl ? 'بانتظار التحقق من DNS' : 'Waiting for DNS')}
              </span>
              <button
                type="button"
                onClick={() => setIsRemoveModalOpen(true)}
                title={isRtl ? 'إزالة الدومين' : 'Disconnect domain'}
                style={{
                  background: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  color: '#dc2626',
                  cursor: 'pointer',
                  padding: '5px 9px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 700,
                  transition: 'all 0.2s ease'
                }}
              >
                <Trash2 size={13} />
                <span>{isRtl ? 'إزالة الدومين' : 'Disconnect'}</span>
              </button>
            </div>
          ) : null}
        </div>

        <p style={{ color: 'var(--t2)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
          {isRtl
            ? 'اربط دومينك الحقيقي (مثل offers.yourbrand.com أو www.yourbrand.com أو yourbrand.com) ليفتح الفانل باسم علامتك التجارية مع شهادة أمان SSL مجانية.'
            : 'Connect your real domain (e.g. offers.yourbrand.com, www.yourbrand.com, or yourbrand.com) so visitors see your brand with automatic free SSL.'}
        </p>

        {/* Input & Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <input
            className="inp"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder={isRtl ? 'مثال: offers.yourbrand.com أو www.yourbrand.com' : 'e.g. offers.yourbrand.com or www.yourbrand.com'}
            style={{ flex: 1, minWidth: 240, fontSize: 13.5 }}
          />
          <button 
            type="button" 
            onClick={() => saveDomain()} 
            disabled={busy || !domainInput.trim()} 
            style={{ 
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 8, 
              padding: '10px 18px', 
              fontWeight: 700, 
              fontSize: 13.5, 
              cursor: busy || !domainInput.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {busy ? '...' : (isRtl ? 'حفظ الدومين' : 'Save Domain')}
          </button>
          <button 
            type="button" 
            onClick={checkDomain} 
            disabled={!host || checking} 
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? (isRtl ? 'جارٍ الفحص...' : 'Checking...') : (isRtl ? 'فحص اتصال DNS' : 'Check DNS')}</span>
          </button>
        </div>

        {/* Active Custom URL display if saved */}
        {urls.custom && funnel?.domain ? (
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--edge)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} style={{ color: '#10b981' }} />
                <span>{isRtl ? 'رابط الفانل على دومينك الخاص' : 'Live Funnel on your Custom Domain'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly className="inp" value={urls.custom} style={{ flex: 1, fontSize: 13 }} />
              <button type="button" className="btn btn-ghost" onClick={() => copyText('custom', urls.custom)}>
                {copied === 'custom' ? <CheckCircle2 size={15} style={{ color: '#16a34a' }} /> : <Copy size={15} />}
              </button>
              <button type="button" onClick={() => window.open(urls.custom, '_blank')} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ExternalLink size={15} />
              </button>
            </div>
          </div>
        ) : null}

        {/* DNS Configuration Step-by-Step Instructions */}
        {host ? (
          <div style={{ marginTop: 8, background: 'var(--surface2)', border: '1px solid var(--edge)', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} style={{ color: '#2563eb' }} />
                <span>{isRtl ? 'تعليمات إعداد سجلات DNS عند مسجل الدومين' : 'DNS Records Setup at your Domain Registrar'}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 3, borderRadius: 8, border: '1px solid var(--edge)' }}>
                <button
                  type="button"
                  onClick={() => setActiveDnsTab('cname')}
                  style={{
                    background: activeDnsTab === 'cname' ? '#2563eb' : 'none',
                    color: activeDnsTab === 'cname' ? '#fff' : 'var(--t2)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'سجل CNAME (مستحسن للنطاق الفرعي)' : 'CNAME Record (Subdomains)'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDnsTab('a_record')}
                  style={{
                    background: activeDnsTab === 'a_record' ? '#2563eb' : 'none',
                    color: activeDnsTab === 'a_record' ? '#fff' : 'var(--t2)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'سجل A (للنطاق الرئيسي Root)' : 'A Record (Root/Apex)'}
                </button>
              </div>
            </div>

            {/* DNS Records Table */}
            <div style={{ overflowX: 'auto', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--edge)', marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--edge)', color: 'var(--t2)', textAlign: isRtl ? 'right' : 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Type (النوع)</th>
                    <th style={{ padding: '10px 14px' }}>Name / Host (الاسم / المضيف)</th>
                    <th style={{ padding: '10px 14px' }}>Value / Points to (القيمة / التوجيه)</th>
                    <th style={{ padding: '10px 14px', width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {activeDnsTab === 'cname' ? (
                    <tr>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#2563eb' }}>CNAME</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700 }}>
                        {subdomainPrefix === '@' ? 'www' : subdomainPrefix}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>
                        <code>{cnameTarget}</code>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => copyText('cname_val', cnameTarget)}>
                          {copied === 'cname_val' ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#10b981' }}>A</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700 }}>@</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>
                        <code>{apexIpTarget}</code>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => copyText('a_val', apexIpTarget)}>
                          {copied === 'a_val' ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Registrar Tips */}
            <div style={{ color: 'var(--t2)', fontSize: 12, lineHeight: 1.6, background: 'var(--surface)', padding: 12, borderRadius: 8, border: '1px solid var(--edge)' }}>
              <div style={{ fontWeight: 700, color: 'var(--t1)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                <HelpCircle size={14} />
                <span>{isRtl ? 'كيفية الإضافة لدى مزودي النطاقات الشائعة:' : 'How to add at popular registrars:'}</span>
              </div>
              <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                <li>
                  <b>GoDaddy / Namecheap:</b> {isRtl ? 'افتح إدارة DNS للدومين، ثم اضغط Add New Record وأدخل القيم الموضحة أعلاه.' : 'Go to DNS Management, click Add Record, and enter the values above.'}
                </li>
                <li>
                  <b>Cloudflare:</b> {isRtl ? 'أضف سجل CNAME أو A واجعل حالة البروكسي DNS Only (الرمز الرمادي) في البداية.' : 'Add the CNAME or A record and set Proxy Status to DNS Only (grey cloud).'}
                </li>
                <li>
                  <b>{isRtl ? 'انتشار DNS:' : 'Propagation:'}</b> {isRtl ? 'يستغرق انتشار DNS عادة من 5 دقائق حتى 24 ساعة، ثم يصبح الرابط نشطاً عالمياً.' : 'DNS propagation usually takes between 5 minutes and 24 hours.'}
                </li>
              </ul>
            </div>
          </div>
        ) : null}

        {/* Real-time DNS Verification Diagnostic Results */}
        {dns ? (
          <div style={{ 
            marginTop: 14, 
            padding: 14, 
            borderRadius: 10, 
            background: dns.matched ? 'rgba(22, 163, 74, 0.08)' : 'rgba(249, 115, 22, 0.08)',
            border: `1px solid ${dns.matched ? 'rgba(22, 163, 74, 0.25)' : 'rgba(249, 115, 22, 0.25)'}`,
            display: 'flex', 
            flexDirection: 'column', 
            gap: 6, 
            fontSize: 13 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: dns.matched ? '#16a34a' : '#f97316' }}>
              {dns.matched ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
              <span>
                {dns.matched
                  ? (isRtl ? 'تم العثور على إعداد DNS صحيح!' : `DNS verified (${dns.matchedType?.toUpperCase()} record matched)!`)
                  : (isRtl ? 'لم يتم العثور على سجل DNS متطابق بعد' : 'DNS record not verified yet')}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--t2)', paddingInlineStart: 25 }}>
              {dns.cnames?.length ? (
                <div><b>CNAMEs detected:</b> {dns.cnames.join(', ')}</div>
              ) : null}
              {dns.aRecords?.length ? (
                <div><b>A Records (IPs) detected:</b> {dns.aRecords.join(', ')}</div>
              ) : null}
              {!dns.cnames?.length && !dns.aRecords?.length ? (
                <div>{isRtl ? 'لم يتم العثور على أي سجلات منشورة لهذا الدومين حتى الآن.' : 'No DNS records found for this host yet. Please verify spelling or wait for propagation.'}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* REMOVE DOMAIN CONFIRMATION MODAL */}
      {isRemoveModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: 16,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setIsRemoveModalOpen(false)}
        >
          <div 
            style={{
              background: 'var(--surface, #1e293b)',
              border: '1px solid var(--edge, rgba(255,255,255,0.1))',
              borderRadius: 18,
              width: '100%',
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(220,38,38,0.15)',
              position: 'relative',
              direction: isRtl ? 'rtl' : 'ltr',
              textAlign: isRtl ? 'right' : 'left',
              animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsRemoveModalOpen(false)}
              style={{
                position: 'absolute',
                top: 16,
                [isRtl ? 'left' : 'right']: 16,
                background: 'none',
                border: 'none',
                color: 'var(--t2, #94a3b8)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            {/* Header with Danger Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(220, 38, 38, 0.12)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: 'var(--t1, #f8fafc)' }}>
                  {isRtl ? 'هل أنت متأكد من رغبتك في إزالة هذا الدومين؟' : 'Are you sure you want to disconnect this domain?'}
                </h3>
                <span style={{ fontSize: 12.5, color: '#ef4444', fontWeight: 700 }}>
                  {isRtl ? 'تأكيد فصل الدومين' : 'Confirmation required'}
                </span>
              </div>
            </div>

            {/* Domain preview box */}
            <div style={{
              background: 'var(--surface2, #0f172a)',
              border: '1px solid var(--edge, rgba(255,255,255,0.08))',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <Globe size={18} style={{ color: '#38bdf8' }} />
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: 'var(--t1, #fff)' }}>
                {funnel?.domain || host || 'yourdomain.com'}
              </div>
            </div>

            <p style={{ color: 'var(--t2, #94a3b8)', fontSize: 13, lineHeight: 1.6, margin: '0 0 22px' }}>
              {isRtl
                ? 'سيتم فصل هذا الدومين عن هذا الفانل. سيعود الفانل للعمل عبر رابط UpKlick الافتراضي فوراً، ولن يتم حذف أي صفحة أو تعديل محتواك.'
                : 'This domain will be unlinked from your funnel. Your funnel will immediately remain accessible via the default UpKlick production URL. None of your pages or designs will be lost.'}
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsRemoveModalOpen(false)}
                className="btn btn-ghost"
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13
                }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={busy}
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)'
                }}
              >
                <Trash2 size={15} />
                <span>{busy ? '...' : (isRtl ? 'نعم، إزالة الدومين' : 'Yes, Disconnect Domain')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
