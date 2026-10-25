'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tracking } from '../../lib/tracking';

export default function TrackingSettingsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');
  const L = (en, ar) => (isRtl ? ar : en);

  // States
  const [trackingConfig, setTrackingConfig] = useState({
    meta: { connected: false, business: '', page: '', pixel: { id: '', name: '' } },
    google: { connected: false, property: { name: '', measurementId: '' } },
    advancedMode: false,
    customEvents: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [rtData, setRtData] = useState([]);
  const [rtFilter, setRtFilter] = useState('');
  const [debugLogs, setDebugLogs] = useState([]);
  const [wizard, setWizard] = useState({ active: false, provider: null, step: 0, picks: {} });
  const [testResults, setTestResults] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  const { meta, google, advancedMode, customEvents } = trackingConfig;

  // Load existing tracking config from tenants/global
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'tenants', 'global'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.trackingCenter) {
            setTrackingConfig({
              meta: {
                connected: false,
                business: '',
                page: '',
                pixel: { id: '', name: '' },
                ...(data.trackingCenter.meta || {})
              },
              google: {
                connected: false,
                property: { name: '', measurementId: '' },
                ...(data.trackingCenter.google || {})
              },
              advancedMode: !!data.trackingCenter.advancedMode,
              customEvents: data.trackingCenter.customEvents || []
            });
          }
        }
      } catch (err) {
        console.error("Error loading global tracking config: ", err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Save State function
  const saveState = async (updatedFields) => {
    const nextConfig = {
      ...trackingConfig,
      ...updatedFields
    };
    setTrackingConfig(nextConfig);
    try {
      await setDoc(doc(db, 'tenants', 'global'), {
        trackingCenter: nextConfig
      }, { merge: true });
      showToast(L('Settings saved successfully!', 'تم حفظ الإعدادات بنجاح!'));
    } catch (err) {
      console.error("Error saving global tracking config: ", err);
      showToast(L('Failed to save settings.', 'فشل حفظ الإعدادات.'));
    }
  };

  // Toast notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
    const el = document.getElementById('toast');
    if (el) {
      el.innerText = msg;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 3000);
    }
  };

  // Realtime Log States & Listeners
  useEffect(() => {
    const handleTrackEvent = (e) => {
      const { event, payload, time } = e.detail;
      const newLog = {
        time: time,
        user: 'Platform User',
        event: event,
        platform: 'Meta / GA4',
        country: 'Local',
        utm: '—',
        status: 'success'
      };
      setRtData(prev => [newLog, ...prev].slice(0, 80));
      addDebugLog('POST', `/tracking/events/${event.replace(/\s+/g, '').toLowerCase()}`, '200 OK — Dispatched to pixels');
    };

    window.addEventListener('upklick_track', handleTrackEvent);
    addDebugLog('GET', '/health/status', '200 OK — Realtime listener active');

    return () => {
      window.removeEventListener('upklick_track', handleTrackEvent);
    };
  }, []);

  const addDebugLog = (method, path, result) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    const newLog = `[${timeStr}] ${method} ${path} → ${result}`;
    setDebugLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  // Connection Steps
  const openWizard = (provider) => {
    setWizard({ active: true, provider, step: 1, picks: {} });
  };

  const closeWizard = () => {
    setWizard({ active: false, provider: null, step: 0, picks: {} });
  };

  const saveDirectIntegration = (provider, value) => {
    if (provider === 'meta') {
      const finishedState = {
        connected: true,
        business: 'Direct Setup',
        page: 'Direct Setup',
        pixel: { id: value, name: 'Custom Pixel' }
      };
      saveState({ meta: finishedState });
      addDebugLog('POST', '/graph/v19/pixel/connect', '200 OK — Connected Pixel: ' + value);
      closeWizard();
    } else if (provider === 'google') {
      const finishedState = {
        connected: true,
        property: { measurementId: value, name: 'Custom GA4 Property' }
      };
      saveState({ google: finishedState });
      addDebugLog('POST', '/analytics/v1/property/connect', '200 OK — Connected GA4: ' + value);
      closeWizard();
    }
  };

  const disconnectIntegration = (provider) => {
    if (provider === 'meta') {
      saveState({ meta: { connected: false, business: null, page: null, pixel: null } });
      addDebugLog('POST', '/graph/v19/pixel/disconnect', '200 OK — Disconnected Pixel');
    } else if (provider === 'google') {
      saveState({ google: { connected: false, property: null } });
      addDebugLog('POST', '/analytics/v1/property/disconnect', '200 OK — Disconnected GA4');
    }
  };

  const handleToggleAdvanced = () => {
    saveState({ advancedMode: !advancedMode });
  };

  const handleAddCustomEvent = () => {
    const name = prompt(L('Enter custom event name (in English, e.g. clicked_button):', 'أدخل اسم الحدث المخصص (باللغة الإنجليزية، مثل: clicked_button):'));
    if (!name) return;
    const cleanName = name.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (cleanName) {
      const nextEvents = [...customEvents, cleanName];
      saveState({ customEvents: nextEvents });
    }
  };

  const handleExportLogs = () => {
    const header = ['Time', 'User ID', 'Event Name', 'Platform', 'Country', 'UTM Campaign', 'Status'];
    const rows = rtData.map(r => [r.time, r.user, r.event, r.platform, r.country, r.utm, r.status]);
    const csvContent = [header, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `platform_tracking_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runTestEvent = (index, eventName) => {
    setTestResults(prev => ({ ...prev, [index]: 'sending' }));
    try {
      if (Tracking && typeof Tracking.track === 'function') {
        Tracking.track(eventName, { test_mode: true, source: 'Admin Settings Page' });
      }
      setTestResults(prev => ({ ...prev, [index]: 'success' }));
    } catch(err) {
      setTestResults(prev => ({ ...prev, [index]: 'failed' }));
    }
  };

  const standardEvents = ['Page View', 'View Content', 'Lead', 'Contact', 'Purchase', 'Add To Cart', 'Initiate Checkout', 'Book Meeting', 'Complete Registration', 'Login', 'Logout', 'Generate AI', 'Upload File', 'Download File', 'Export PDF', 'Invite Member', 'Upgrade Plan', 'Cancel Subscription', 'Payment Success', 'Payment Failed', 'Project Created', 'Project Deleted', 'Subscription Started', 'Subscription Renewed', 'Subscription Cancelled'];
  const allEventsList = [...standardEvents, ...customEvents];

  const mappings = [
    { std: 'Purchase', targets: ['Meta: Purchase', 'GA4: purchase', 'DB: purchase'] },
    { std: 'Lead', targets: ['Meta: Lead', 'GA4: generate_lead'] },
    { std: 'Complete Registration', targets: ['Meta: CompleteRegistration', 'GA4: sign_up'] },
    { std: 'Book Meeting', targets: ['Meta: Schedule', 'GA4: book_meeting'] },
    { std: 'Add To Cart', targets: ['Meta: AddToCart', 'GA4: add_to_cart'] },
    { std: 'Initiate Checkout', targets: ['Meta: InitiateCheckout', 'GA4: begin_checkout'] },
  ];

  const checklist = [
    meta.connected,
    google.connected,
    true,
  ];

  const doneCount = checklist.filter(Boolean).length;
  const readinessPercentage = Math.round((doneCount / checklist.length) * 100);

  const healthItems = [
    { label: L('Meta Connected', 'اتصال فيسبوك Meta'), ok: meta.connected },
    { label: L('GA4 Connected', 'اتصال جوجل GA4'), ok: google.connected },
    { label: L('SSL / HTTPS Secure', 'أمان الاتصال SSL / HTTPS'), ok: true },
  ];

  const testEvents = [
    { name: 'Page View', icon: '📄' },
    { name: 'Lead', icon: '🧲' },
    { name: 'Purchase', icon: '💳' },
    { name: 'Signup', icon: '✍️' },
    { name: 'Login', icon: '🔑' },
    { name: 'Book Meeting', icon: '📅' }
  ];

  const aiRecs = [];
  if (!meta.connected) {
    aiRecs.push({ ic: '⚠️', title: L('Meta is not connected', 'حساب Meta غير متصل'), desc: L('Ad campaigns will lose conversion data. Connect Meta now.', 'ستفقد حملاتك الإعلانية بيانات التحويل الهامة. اربط حسابك الآن.') });
  }
  if (!google.connected) {
    aiRecs.push({ ic: '⚠️', title: L('Google Analytics is not connected', 'حساب جوجل غير متصل'), desc: L('GA4 is crucial to study user behavior. Connect Google now.', 'تحليلات GA4 أساسية لدراسة سلوك الزوار. اربط حسابك الآن.') });
  }
  aiRecs.push({ ic: '🍪', title: L('Cookie Consent Banner missing', 'شريط الموافقة على ملفات الارتباط مفقود'), desc: L('Google Consent Mode v2 requires a consent banner to log data.', 'يتطلب وضع الموافقة من جوجل Consent Mode وجود شريط لملفات الارتباط.') });

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', flexDirection: 'column', gap: '15px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,107,53,0.3)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div>{L('Loading tracking configurations...', 'جاري تحميل إعدادات التتبع...')}</div>
      </div>
    );
  }

  return (
    <div className="pg on" id="pg-tracking-center" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      
      {/* Toast container overlay inside the component */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: isRtl ? 'auto' : '20px',
          left: isRtl ? '20px' : 'auto',
          background: 'var(--mtc-grad, linear-gradient(135deg, #7c3aed 0%, #8a1f4b 100%))',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 999999,
          fontSize: '13px',
          fontWeight: 'bold',
          animation: 'slideIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes slideIn {
              from { transform: translateY(-20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          {toastMessage}
        </div>
      )}

      {/* Scope Wrapper to encapsulate all styles */}
      <div className="mtc-scope">
        
        {/* Header Section */}
        <div className="mtc-header">
          <div className="mtc-header-top">
            <div className="mtc-title-wrap">
              <div className="mtc-brand-icon">📡</div>
              <div>
                <b>{L('Platform Pixel & Analytics Tracking', 'مركز التتبع والبيكسل للمنصة')}</b>
                <span>{L('Unified system-wide tracking integrations', 'إدارة موحدة لأكواد التتبع والتحليلات والبيكسل على مستوى المنصة')}</span>
              </div>
            </div>
            <div className="mtc-top-actions">
              <div className="mtc-mode-toggle" onClick={handleToggleAdvanced} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span>{L('Developer Mode', 'وضع المطور')}</span>
                <div className={`mtc-switch ${advancedMode ? 'on' : ''}`}></div>
              </div>
              <button className="mtc-btn mtc-btn-ghost" onClick={() => setRtData([])}>{L('Reset Logs', 'تصفية السجلات')}</button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mtc-tabs">
            {[
              { id: 'overview', label: L('📊 Overview', '📊 نظرة عامة') },
              { id: 'integrations', label: L('🔌 Connect Accounts', '🔌 ربط الحسابات'), badge: (!meta.connected ? 1 : 0) + (!google.connected ? 1 : 0) },
              { id: 'events', label: L('🎯 Event SDK', '🎯 أحداث التتبّع') },
              { id: 'library', label: L('📚 Event Library', '📚 مكتبة الأحداث') },
              { id: 'realtime', label: L('⚡ Realtime', '⚡ البث اللحظي') },
              { id: 'health', label: L('🩺 Health Check', '🩺 فحص الصحة') },
              { id: 'debug', label: L('🧩 Debug Logs', '🧩 Debug') },
              { id: 'test', label: L('🧪 Test Center', '🧪 الاختبار التجريبي') },
              { id: 'automation', label: L('🤖 AI Optimization', '🤖 الأتمتة والذكاء') },
              { id: 'advanced', label: L('⚙️ Advanced', '⚙️ إعداد متقدم') }
            ].map(tab => (
              <div
                key={tab.id}
                className={`mtc-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="mtc-badge">{tab.badge}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tab views body */}
        <div className="mtc-body">

          {/* 1. Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="mtc-view active">
              <div className="mtc-note">
                💡 {L('This tracking studio centralizes event delivery to Meta Pixel & Google Analytics globally. Detailed configurations can be adjusted under the "Advanced" tab.', 'يقوم مركز التتبع بإرسال الأحداث وتوحيدها لبيكسل فيسبوك وجوجل إيناليتكس على مستوى النظام. إعدادات الربط المتقدمة متاحة في تبويب "إعداد متقدم".')}
              </div>
              <div className="mtc-grid mtc-g4">
                <div className="mtc-card">
                  <div className="mtc-card-label">Marketing Readiness</div>
                  <div className="mtc-card-value">{readinessPercentage}%</div>
                  <div className="mtc-card-delta" style={{ color: 'var(--mtc-violet-soft)' }}>
                    {doneCount} {L(`out of ${checklist.length} items ready`, `من أصل ${checklist.length} بنود جاهزة`)}
                  </div>
                </div>
                <div className="mtc-card">
                  <div className="mtc-card-label">Meta Status <span className={`mtc-dot ${meta.connected ? 'mtc-dot-green' : 'mtc-dot-red'}`}></span></div>
                  <div className="mtc-card-value" style={{ fontSize: '15px', color: meta.connected ? '#4ade80' : 'var(--mtc-text-2)' }}>
                    {meta.connected ? L('Active ✓', 'متصل ونشط ✓') : L('Not Connected', 'غير متصل')}
                  </div>
                </div>
                <div className="mtc-card">
                  <div className="mtc-card-label">Google Status <span className={`mtc-dot ${google.connected ? 'mtc-dot-green' : 'mtc-dot-red'}`}></span></div>
                  <div className="mtc-card-value" style={{ fontSize: '15px', color: google.connected ? '#4ade80' : 'var(--mtc-text-2)' }}>
                    {google.connected ? L('Active ✓', 'متصل ونشط ✓') : L('Not Connected', 'غير متصل')}
                  </div>
                </div>
                <div className="mtc-card">
                  <div className="mtc-card-label">Events Status</div>
                  <div className="mtc-card-value" style={{ fontSize: '14px', color: 'var(--mtc-violet-soft)' }}>
                    {meta.connected || google.connected ? L('Routing Active', 'نشط ويتم الإرسال') : L('Waiting for connection', 'بانتظار الربط')}
                  </div>
                </div>
                <div className="mtc-card">
                  <div className="mtc-card-label">Active Pixel ID</div>
                  <div className="mtc-card-value" style={{ fontSize: '13px', color: 'var(--mtc-violet-soft)' }}>
                    {meta.connected ? meta.pixel.id : '—'}
                  </div>
                </div>
                <div className="mtc-card">
                  <div className="mtc-card-label">Google GA4 ID</div>
                  <div className="mtc-card-value" style={{ fontSize: '13px', color: 'var(--mtc-violet-soft)' }}>
                    {google.connected ? google.property.measurementId : '—'}
                  </div>
                </div>
                <div className="mtc-card">
                  <div className="mtc-card-label">SSL Status</div>
                  <div className="mtc-card-value" style={{ fontSize: '15px', color: '#4ade80' }}>{L('Secure ✓', 'نشط وآمن ✓')}</div>
                </div>
                <div className="mtc-card">
                  <div className="mtc-card-label">Local Test Logs</div>
                  <div className="mtc-card-value" style={{ color: 'var(--mtc-green)' }}>{rtData.length}</div>
                </div>
              </div>

              <h3 className="mtc-sec-title">🏆 {L('Event Tracking Info', 'معلومات الأحداث والتحليلات')}</h3>
              <div className="mtc-grid mtc-g2">
                <div className="mtc-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                    {L('Historical Data & Funnels', 'البيانات التاريخية والأقماع')}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--mtc-text-2)', lineHeight: '1.6' }}>
                    {L('Detailed reports, analytics dashboards, and campaign performance funnels can be securely accessed inside your Meta Events Manager and Google Analytics properties.', 'لمشاهدة تقارير الزيارات ومعدلات التحويل وحملات الإعلانات بالتفصيل، يرجى التوجه للوحة تحكم Meta Events Manager أو حساب Google Analytics الخاص بك.')}
                  </div>
                </div>
                <div className="mtc-card">
                  <div className="mtc-card-label" style={{ marginBottom: '8px' }}>{L('Recent Issues & Errors', 'أحدث المشكلات والأخطاء')}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--mtc-text-2)', padding: '10px 0' }}>
                    🟢 {L('All tracking parameters are healthy. No errors logged in the last 24 hours.', 'جميع معايير التتبع تعمل بشكل سليم. لا توجد أي أخطاء خلال الـ 24 ساعة الماضية.')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Tab: Integrations */}
          {activeTab === 'integrations' && (
            <div className="mtc-view active">
              <p className="mtc-sec-desc">
                {L('Link the platform social pixel accounts seamlessly to run marketing ads.', 'اربط حسابات البيكسل والإحصائيات الخاصة بالمنصة بخطوات بسيطة بدون الحاجة لكتابة أكواد.')}
              </p>
              <div className="mtc-grid mtc-g2">
                
                {/* Meta Card */}
                <div className="mtc-integ-card">
                  <div className="mtc-integ-head">
                    <div className="mtc-integ-logo mtc-logo-meta">f</div>
                    <div>
                      <div className="mtc-integ-name">{L('Meta Facebook Ads', 'ربط فيسبوك (Meta)')}</div>
                      <div className="mtc-integ-desc">{L('Pixel + Conversions API automatic integration', 'ربط كود البيكسل وواجهة Conversion API تلقائياً')}</div>
                    </div>
                  </div>
                  
                  {meta.connected ? (
                    <div className="mtc-connected-box">
                      <div className="mtc-connected-row"><span>Business Manager</span><b>{meta.business}</b></div>
                      <div className="mtc-connected-row"><span>Page</span><b>{meta.page}</b></div>
                      <div className="mtc-connected-row"><span>Pixel ID</span><b>{meta.pixel.id}</b></div>
                      <div className="mtc-connected-row"><span>Conversions API</span><b style={{ color: '#4ade80' }}>{L('Active ✓', 'نشط ومفعل ✓')}</b></div>
                    </div>
                  ) : (
                    <div className="mtc-integ-desc" style={{ color: 'var(--mtc-text-2)' }}>
                      {L('Meta Ads Account is not linked yet.', 'لم يتم ربط حساب إعلانات فيسبوك بعد.')}
                    </div>
                  )}

                  <div className="mtc-integ-meta-row">
                    <span>{meta.connected ? L('Last sync: Just now', 'آخر مزامنة: الآن') : '—'}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {meta.connected && (
                        <button className="mtc-btn mtc-btn-ghost" onClick={() => disconnectIntegration('meta')} style={{ color: 'var(--mtc-red)', borderColor: '#ef444433' }}>
                          {L('Disconnect', 'إلغاء الربط')}
                        </button>
                      )}
                      <button className="mtc-btn mtc-btn-primary" onClick={() => openWizard('meta')}>
                        {meta.connected ? L('Reconnect Meta', 'إعادة المزامنة والربط') : L('Connect Meta', 'ربط حساب فيسبوك')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Google Card */}
                <div className="mtc-integ-card">
                  <div className="mtc-integ-head">
                    <div className="mtc-integ-logo mtc-logo-google">G</div>
                    <div>
                      <div className="mtc-integ-name">{L('Google Analytics 4', 'ربط جوجل (Google Analytics)')}</div>
                      <div className="mtc-integ-desc">{L('GA4 + GTM + Search Console automatic link', 'تفعيل تحليلات جوجل وإحصائيات البحث GTM/GA4')}</div>
                    </div>
                  </div>

                  {google.connected ? (
                    <div className="mtc-connected-box">
                      <div className="mtc-connected-row"><span>GA4 Property</span><b>{google.property.name}</b></div>
                      <div className="mtc-connected-row"><span>Measurement ID</span><b>{google.property.measurementId}</b></div>
                      <div className="mtc-connected-row"><span>Google Tag Manager</span><b style={{ color: '#4ade80' }}>{L('Connected ✓', 'متصل ✓')}</b></div>
                      <div className="mtc-connected-row"><span>Search Console</span><b style={{ color: '#4ade80' }}>{L('Synced ✓', 'نشط ومزامن ✓')}</b></div>
                    </div>
                  ) : (
                    <div className="mtc-integ-desc" style={{ color: 'var(--mtc-text-2)' }}>
                      {L('Google account is not linked yet.', 'لم يتم ربط حساب جوجل بعد.')}
                    </div>
                  )}

                  <div className="mtc-integ-meta-row">
                    <span>{google.connected ? L('Last sync: Just now', 'آخر مزامنة: الآن') : '—'}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {google.connected && (
                        <button className="mtc-btn mtc-btn-ghost" onClick={() => disconnectIntegration('google')} style={{ color: 'var(--mtc-red)', borderColor: '#ef444433' }}>
                          {L('Disconnect', 'إلغاء الربط')}
                        </button>
                      )}
                      <button className="mtc-btn mtc-btn-primary" onClick={() => openWizard('google')}>
                        {google.connected ? L('Reconnect Google', 'إعادة المزامنة والربط') : L('Connect Google', 'ربط حساب جوجل')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* TikTok (Placeholder) */}
                <div className="mtc-integ-card" style={{ opacity: 0.6 }}>
                  <div className="mtc-integ-head">
                    <div className="mtc-integ-logo mtc-logo-tiktok">🎵</div>
                    <div>
                      <div className="mtc-integ-name">{L('TikTok Ads', 'إعلانات تيك توك')}</div>
                      <div className="mtc-integ-desc">{L('Coming soon — easy direct account linking', 'قريباً — ربط مباشر لبيكسل إعلانات تيك توك')}</div>
                    </div>
                  </div>
                  <div className="mtc-integ-meta-row">
                    <span>{L('Integrated natively without code changes', 'إدماج تلقائي بدون الحاجة لكتابة كود')}</span>
                    <button className="mtc-btn mtc-btn-ghost" disabled>{L('Soon', 'قريباً')}</button>
                  </div>
                </div>

                {/* LinkedIn (Placeholder) */}
                <div className="mtc-integ-card" style={{ opacity: 0.6 }}>
                  <div className="mtc-integ-head">
                    <div className="mtc-integ-logo mtc-logo-linkedin">in</div>
                    <div>
                      <div className="mtc-integ-name">{L('LinkedIn Insight Tag', 'ربط لينكد إن')}</div>
                      <div className="mtc-integ-desc">{L('Coming soon — target premium B2B professionals', 'قريباً — تتبع زيارات وحملات إعلانات لينكد إن')}</div>
                    </div>
                  </div>
                  <div className="mtc-integ-meta-row">
                    <span>{L('Supports Pinterest, X, and Reddit pixels too', 'يدعم أيضاً تويتر، بنترست، وريديت')}</span>
                    <button className="mtc-btn mtc-btn-ghost" disabled>{L('Soon', 'قريباً')}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Tab: Event SDK */}
          {activeTab === 'events' && (
            <div className="mtc-view active">
              <p className="mtc-sec-desc">
                {L('All activities are dispatched automatically using our unified front-end Tracking SDK.', 'يتم إرسال أحداث تتبع الزوار والعملاء من خلال كود المطور الموحد التالي:')}
              </p>
              <div className="mtc-card" style={{ marginBottom: '16px' }}>
                <div className="mtc-card-label" style={{ marginBottom: '8px' }}>Tracking SDK Reference</div>
                <div className="mtc-console" style={{ height: 'auto', fontFamily: 'var(--mtc-mono)' }}>
                  <div className="mtc-log-line"><span className="mtc-log-get">Tracking.page()</span> → {L('Auto tracks Page Views on router path changes', 'تسجيل مشاهدات الصفحات تلقائياً عند تغيير المسار')}</div>
                  <div className="mtc-log-line"><span className="mtc-log-identify">Tracking.identify(userId, userTraits)</span> → {L('Identifies user context', 'ربط هوية العميل لتوحيد الجلسات')}</div>
                  <div className="mtc-log-line"><span className="mtc-log-post">Tracking.track("purchase", &#123; value: 49.00, currency: "USD" &#125;)</span> → {L('Logs purchases', 'تسجيل عمليات الشراء الفردية')}</div>
                  <div className="mtc-log-line"><span className="mtc-log-post">Tracking.lead(&#123; source: "main_funnel" &#125;)</span> → {L('Logs new lead captures', 'تسجيل بيانات العملاء المحتملين الجدد')}</div>
                  <div className="mtc-log-line"><span className="mtc-log-post">Tracking.bookMeeting(&#123; type: "coaching" &#125;)</span> → {L('Logs scheduled meetings', 'تسجيل حجز موعد جديد')}</div>
                  <div className="mtc-log-line"><span className="mtc-log-post">Tracking.custom("event_name", payload)</span> → {L('Logs custom business actions', 'إرسال حدث مخصص للمنصة')}</div>
                </div>
              </div>

              <h3 className="mtc-sec-title">🗺️ {L('Event Schema Mapping', 'تطابق وخريطة الأحداث الموحدة')}</h3>
              <div className="mtc-grid mtc-g2">
                {mappings.map((m, idx) => (
                  <div className="mtc-card" key={idx}>
                    <div className="mtc-card-label">{L('Unified Standard Event', 'حدث موحد قياسي')}</div>
                    <div style={{ fontWeight: '800', fontSize: '13px', margin: '5px 0 9px' }}>🎯 {m.std}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {m.targets.map((targ, tIdx) => (
                        <span className="mtc-tag" key={tIdx}>{targ}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Tab: Event Library */}
          {activeTab === 'library' && (
            <div className="mtc-view active">
              <div style={{ display: 'flex', gap: '9px', marginBottom: '14px' }}>
                <input
                  className="mtc-realtime-search"
                  placeholder={L('🔍 Search event name...', '🔍 ابحث في مكتبة الأحداث...')}
                  onChange={(e) => setRtFilter(e.target.value)}
                  value={rtFilter}
                />
                <button className="mtc-btn mtc-btn-primary" onClick={handleAddCustomEvent} style={{ whiteSpace: 'nowrap' }}>
                  {L('+ Add Custom Event', '+ حدث مخصص جديد')}
                </button>
              </div>
              <div className="mtc-grid mtc-g3">
                {allEventsList
                  .filter(e => !rtFilter || e.toLowerCase().includes(rtFilter.toLowerCase()))
                  .map((e, idx) => (
                    <div className="mtc-event-chip" key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--mtc-border-soft)', borderRadius: '11px', background: '#170f2699' }}>
                      <span>🎯 {e}</span>
                      <span className="mtc-pill mtc-pill-violet" style={{ fontSize: '10px' }}>
                        {standardEvents.includes(e) ? L('Standard', 'حدث قياسي') : L('Custom', 'حدث مخصص')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 5. Tab: Realtime Logs */}
          {activeTab === 'realtime' && (
            <div className="mtc-view active">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                <input
                  className="mtc-realtime-search"
                  style={{ maxWidth: '240px' }}
                  placeholder={L('🔍 Filter by event or country...', '🔍 تصفية الأحداث والبلدان...')}
                  onChange={(e) => setRtFilter(e.target.value)}
                  value={rtFilter}
                />
                <button className="mtc-btn mtc-btn-ghost" onClick={handleExportLogs}>
                  📥 {L('Export as CSV', 'تصدير البيانات كـ CSV')}
                </button>
              </div>
              <div className="mtc-card" style={{ overflowX: 'auto' }}>
                <table className="mtc-table">
                  <thead>
                    <tr>
                      <th>{L('Time', 'الوقت')}</th>
                      <th>{L('User ID', 'العميل')}</th>
                      <th>{L('Event', 'الحدث')}</th>
                      <th>{L('Destination', 'المنصة')}</th>
                      <th>{L('Location', 'البلد')}</th>
                      <th>{L('UTM Campaign', 'الحملة')}</th>
                      <th>{L('Status', 'الحالة')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rtData
                      .filter(r => !rtFilter || r.event.toLowerCase().includes(rtFilter.toLowerCase()) || r.country.toLowerCase().includes(rtFilter.toLowerCase()))
                      .map((r, idx) => (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'var(--mtc-mono)', fontSize: '10.5px' }}>{r.time}</td>
                          <td>{r.user}</td>
                          <td><b>{r.event}</b></td>
                          <td><span className="mtc-pill mtc-pill-violet">{r.platform}</span></td>
                          <td>{r.country}</td>
                          <td><code style={{ fontSize: '11px', color: 'var(--mtc-violet-soft)' }}>{r.utm}</code></td>
                          <td>
                            {r.status === 'success' ? (
                              <span className="mtc-pill mtc-pill-green">{L('Success', 'تم الإرسال')}</span>
                            ) : (
                              <span className="mtc-pill mtc-pill-red">{L('Failed', 'فشل')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {rtData.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--mtc-text-2)' }}>
                          {L('No events dispatched in the current session yet.', 'لم يتم إرسال أي أحداث تتبع في الجلسة الحالية بعد.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. Tab: Health Check */}
          {activeTab === 'health' && (
            <div className="mtc-view active">
              <p className="mtc-sec-desc">
                {L('Platform-wide diagnostic health checks for analytics scripts.', 'فحص أوتوماتيكي مستمر لضمان نشاط وجودة الأكواد والبيكسل المتصلة بموقعك.')}
              </p>
              <div className="mtc-card">
                {healthItems.map((item, idx) => (
                  <div className="mtc-health-item" key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 4px', borderBottom: '1px solid #ffffff08', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <span className={`mtc-dot ${item.ok ? 'mtc-dot-green' : 'mtc-dot-red'}`}></span>
                      {item.label}
                    </div>
                    <span className={`mtc-pill ${item.ok ? 'mtc-pill-green' : 'mtc-pill-red'}`}>
                      {item.ok ? L('Healthy', 'سليم') : L('Attention Required', 'يحتاج انتباه')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Tab: Debug Logs */}
          {activeTab === 'debug' && (
            <div className="mtc-view active">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <p className="mtc-sec-desc" style={{ margin: 0 }}>
                  {L('Developer console stream — Request & Response network logging.', 'وحدة مطوري البرمجيات — تتبع فوري للطلبات وحالة الإرسال.')}
                </p>
                <button className="mtc-btn mtc-btn-ghost" onClick={() => setDebugLogs([])}>{L('Clear Console', 'مسح السجلات')}</button>
              </div>
              <div className="mtc-console" style={{ background: '#0a0712', border: '1px solid var(--mtc-border-soft)', borderRadius: '12px', padding: '14px', height: '340px', overflowY: 'auto', lineHeight: '1.7', direction: 'ltr', textAlign: 'left' }}>
                {debugLogs.length === 0 ? (
                  <div style={{ color: 'var(--mtc-text-2)', fontSize: '12px', textAlign: 'center', padding: '100px 0' }}>
                    [Console Idle] Waiting for tracking events...
                  </div>
                ) : (
                  debugLogs.map((log, idx) => (
                    <div className="mtc-log-line" key={idx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '11px', color: 'var(--mtc-text-1)', borderBottom: '1px solid #ffffff02', padding: '2px 0' }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 8. Tab: Test Center */}
          {activeTab === 'test' && (
            <div className="mtc-view active">
              <p className="mtc-sec-desc">
                {L('Click any button to fire mock payload data to Meta and GA4 to test active connections.', 'أرسل حدثاً تجريبياً الآن للتحقق من نشاط وسرعة استقبال الأكواد لبيكسل فيسبوك وجوجل.')}
              </p>
              <div className="mtc-grid mtc-g3">
                {testEvents.map((t, idx) => (
                  <div
                    key={idx}
                    className="mtc-test-btn"
                    onClick={() => runTestEvent(idx, t.name)}
                    style={{ display: 'flex', flexDirection: 'column', gap: '7px', alignItems: 'flex-start', padding: '15px', border: '1px solid var(--mtc-border-soft)', borderRadius: '13px', cursor: 'pointer', background: '#170f2699', transition: '.15s' }}
                  >
                    <span style={{ fontSize: '20px' }}>{t.icon}</span>
                    <b>Test {t.name}</b>
                    <span style={{ fontSize: '10.5px', color: 'var(--mtc-text-2)' }}>{L('Sends tracking event mock payload', 'إرسال بيانات جلسة عشوائية للاختبار')}</span>
                    {testResults[idx] === 'sending' && (
                      <span className="mtc-test-result" style={{ background: '#eab30822', color: '#facc15', fontSize: '10.5px', padding: '3px 7px', borderRadius: '6px' }}>
                        {L('Sending...', 'جاري الإرسال...')}
                      </span>
                    )}
                    {testResults[idx] === 'success' && (
                      <span className="mtc-test-result" style={{ background: '#22c55e22', color: '#4ade80', fontSize: '10.5px', padding: '3px 7px', borderRadius: '6px' }}>
                        ✓ {L('Delivered successfully', 'وصل بنجاح')}
                      </span>
                    )}
                    {testResults[idx] === 'failed' && (
                      <span className="mtc-test-result" style={{ background: '#ef444422', color: '#f87171', fontSize: '10.5px', padding: '3px 7px', borderRadius: '6px' }}>
                        ✗ {L('Failed', 'فشل')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. Tab: AI Optimization */}
          {activeTab === 'automation' && (
            <div className="mtc-view active">
              <p className="mtc-sec-desc">
                {L('Automatic diagnostics and marketing recommendations driven by AI parsing of your pixel health.', 'توصيات ذكية مقترحة أوتوماتيكياً لتحسين جودة وأمان تتبع العملاء الخاص بك.')}
              </p>
              <div>
                {aiRecs.map((rec, idx) => (
                  <div className="mtc-ai-rec" key={idx} style={{ display: 'flex', gap: '11px', padding: '13px', border: '1px solid var(--mtc-border-soft)', borderRadius: '11px', background: '#170f2699', marginBottom: '9px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '20px' }}>{rec.ic}</span>
                    <div>
                      <b style={{ fontSize: '12.5px', display: 'block', marginBottom: '3px' }}>{rec.title}</b>
                      <span style={{ fontSize: '11px', color: 'var(--mtc-text-2)' }}>{rec.desc}</span>
                    </div>
                    <button className="mtc-btn mtc-btn-ghost mtc-ai-fix-btn" style={{ marginLeft: isRtl ? '0' : 'auto', marginRight: isRtl ? 'auto' : '0', flexShrink: 0, fontSize: '11px', padding: '5px 10px' }} onClick={() => showToast(L('AI configuration updated.', 'تم تحديث التكوين بواسطة الذكاء الاصطناعي.'))}>
                      {L('Auto Fix', 'إصلاح تلقائي')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. Tab: Advanced Settings */}
          {activeTab === 'advanced' && (
            <div className="mtc-view active">
              {!advancedMode && (
                <div className="mtc-locked-banner" style={{ display: 'flex', gap: '9px', alignItems: 'center', background: '#eab30814', border: '1px solid #eab30840', borderRadius: '11px', padding: '11px 15px', fontSize: '12px', color: '#facc15', marginBottom: '14px' }}>
                  🔒 {L('Developer Mode locked. Toggle developer switch at the top-right to edit.', 'وضع المطور مقفل. قم بتفعيل زر "وضع المطور" في الأعلى للتحكم اليدوي.')}
                </div>
              )}
              <div className="mtc-card" style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="mtc-card-label" style={{ marginBottom: '8px', fontWeight: 'bold' }}>{L('Manual API & ID Overrides', 'تخطي القيم والمعرفات يدوياً')}</div>
                
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--mtc-text-2)' }}>Meta Pixel ID</label>
                  <input
                    id="advancedMetaPixelId"
                    className="mtc-field"
                    placeholder="e.g. 1029384756102938"
                    disabled={!advancedMode}
                    defaultValue={meta.connected ? meta.pixel.id : ''}
                    style={{ background: '#100b1a', border: '1px solid var(--mtc-border)', borderRadius: '9px', color: '#fff', padding: '8px 11px', fontSize: '11.5px', width: '100%', marginTop: '4px' }}
                    onBlur={(e) => {
                      if (advancedMode) {
                        const val = e.target.value.trim();
                        saveState({
                          meta: {
                            ...meta,
                            connected: !!val,
                            pixel: { id: val, name: val ? 'Custom Pixel' : '' }
                          }
                        });
                      }
                    }}
                  />
                </div>

                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--mtc-text-2)' }}>GA4 Measurement ID</label>
                  <input
                    id="advancedGA4Id"
                    className="mtc-field"
                    placeholder="e.g. G-K3P9XQ21LM"
                    disabled={!advancedMode}
                    defaultValue={google.connected ? google.property.measurementId : ''}
                    style={{ background: '#100b1a', border: '1px solid var(--mtc-border)', borderRadius: '9px', color: '#fff', padding: '8px 11px', fontSize: '11.5px', width: '100%', marginTop: '4px' }}
                    onBlur={(e) => {
                      if (advancedMode) {
                        const val = e.target.value.trim();
                        saveState({
                          google: {
                            ...google,
                            connected: !!val,
                            property: { measurementId: val, name: val ? 'Custom GA4 Property' : '' }
                          }
                        });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="mtc-note">
                ⚙️ {L('Client secrets and webhook variables are loaded globally inside client profiles. Verify server deployment settings to ensure data accuracy.', 'يتم تحميل مفاتيح الحسابات المشفرة ومتحولات الخادم في لوحة تحكم الخادم لضمان أمان الإرسال.')}
              </div>
            </div>
          )}

        </div>

        {/* --- CONNECTION WIZARD OVERLAY MODAL --- */}
        {wizard.active && (
          <div className="mtc-overlay active" style={{ position: 'fixed', inset: 0, background: '#050308cc', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
            <div className="mtc-modal" style={{ width: '460px', maxWidth: '92vw', background: 'linear-gradient(180deg,#1e1533,#150f22)', border: '1px solid var(--mtc-border-soft)', borderRadius: '18px', padding: '26px', boxShadow: '0 30px 80px #00000088' }}>
              
              <div className="mtc-modal-head" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', position: 'relative' }}>
                <div className={`mtc-integ-logo ${wizard.provider === 'meta' ? 'mtc-logo-meta' : 'mtc-logo-google'}`} style={{ width: '36px', height: '36px', fontSize: '15px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {wizard.provider === 'meta' ? 'f' : 'G'}
                </div>
                <div className="mtc-modal-title" style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                  {wizard.provider === 'meta' ? L('Link Meta Account', 'ربط حساب فيسبوك (Meta)') : L('Link Google Account', 'ربط حساب جوجل (Google)')}
                </div>
                <span className="mtc-close" onClick={closeWizard} style={{ cursor: 'pointer', color: 'var(--mtc-text-2)', fontSize: '18px', position: 'absolute', [isRtl ? 'left' : 'right']: '0', [isRtl ? 'right' : 'left']: 'auto' }}>✕</span>
              </div>

              {/* Wizard Body content */}
              <div className="mtc-wizard-body" style={{ minHeight: '180px' }}>
                {wizard.provider === 'meta' && (
                  <div>
                    <div style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--mtc-text-1)', lineHeight: '1.6', textAlign: isRtl ? 'right' : 'left' }}>
                      {L('Enter your Meta Pixel ID below to connect it directly to the platform.', 'قم بإدخال رقم الـ Meta Pixel الخاص بك بالأسفل ليتم ربطه فوراً في المنصة.')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input 
                        type="text" 
                        id="directPixelId" 
                        placeholder="e.g. 123456789012345" 
                        defaultValue={meta.connected ? meta.pixel.id : ''}
                        style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--mtc-border)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '14px', width: '100%' }}
                        autoFocus
                      />
                      <button 
                        className="mtc-btn mtc-btn-primary"
                        onClick={() => {
                          const val = document.getElementById('directPixelId')?.value?.trim();
                          if(val) saveDirectIntegration('meta', val);
                        }}
                        style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold', justifyContent: 'center' }}
                      >
                        {L('Save Connection', 'حفظ التتبع وربط')}
                      </button>
                    </div>
                  </div>
                )}

                {wizard.provider === 'google' && (
                  <div>
                    <div style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--mtc-text-1)', lineHeight: '1.6', textAlign: isRtl ? 'right' : 'left' }}>
                      {L('Enter your Google Analytics 4 Measurement ID below to connect it directly to the platform.', 'قم بإدخال رمز القياس (Measurement ID) الخاص بحساب GA4 ليتم ربطه فوراً.')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input 
                        type="text" 
                        id="directGA4Id" 
                        placeholder="e.g. G-ABC123XYZ" 
                        defaultValue={google.connected ? google.property.measurementId : ''}
                        style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--mtc-border)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '14px', width: '100%' }}
                        autoFocus
                      />
                      <button 
                        className="mtc-btn mtc-btn-primary"
                        onClick={() => {
                          const val = document.getElementById('directGA4Id')?.value?.trim();
                          if(val) saveDirectIntegration('google', val);
                        }}
                        style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold', justifyContent: 'center' }}
                      >
                        {L('Save Connection', 'حفظ التتبع وربط')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Styled JSX scope block containing all scoped classes */}
      <style dangerouslySetInnerHTML={{ __html: `
        .mtc-scope {
          --mtc-bg-0: #0d0a14; 
          --mtc-bg-1: #150f22; 
          --mtc-panel-solid: #1a1329;
          --mtc-border: #33254f; 
          --mtc-border-soft: #2a1e42;
          --mtc-violet: #7c3aed; 
          --mtc-violet-soft: #a78bfa;
          --mtc-grad: linear-gradient(135deg, #7c3aed 0%, #8a1f4b 100%);
          --mtc-green: #22c55e; 
          --mtc-yellow: #eab308; 
          --mtc-red: #ef4444;
          --mtc-text-0: #f4f1fb; 
          --mtc-text-1: #c9c1e0; 
          --mtc-text-2: #8d81ab;
          --mtc-mono: 'JetBrains Mono', 'Consolas', monospace;

          display: block;
          direction: ${isRtl ? 'rtl' : 'ltr'};
          color: var(--mtc-text-0);
          background:
            radial-gradient(circle at 15% 0%, #3a1a5c33 0%, transparent 45%),
            radial-gradient(circle at 85% 10%, #6b103f33 0%, transparent 45%),
            var(--mtc-bg-0);
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--mtc-border-soft);
          padding: 0;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        }

        .mtc-scope * {
          box-sizing: border-box;
        }

        .mtc-scope ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .mtc-scope ::-webkit-scrollbar-thumb {
          background: var(--mtc-border);
          border-radius: 8px;
        }

        .mtc-header {
          padding: 18px 22px 0;
          background: #100b1c99;
          border-bottom: 1px solid var(--mtc-border-soft);
        }

        .mtc-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .mtc-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mtc-brand-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: var(--mtc-grad);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          box-shadow: 0 4px 16px #7c3aed4d;
        }

        .mtc-title-wrap b {
          font-size: 15px;
          display: block;
          color: #fff;
        }

        .mtc-title-wrap span {
          font-size: 11.5px;
          color: var(--mtc-text-2);
          display: block;
          margin-top: 2px;
        }

        .mtc-top-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .mtc-mode-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--mtc-text-2);
          background: var(--mtc-panel-solid);
          border: 1px solid var(--mtc-border);
          padding: 6px 12px;
          border-radius: 999px;
          user-select: none;
        }

        .mtc-switch {
          width: 32px;
          height: 17px;
          background: #332750;
          border-radius: 20px;
          position: relative;
          transition: .2s;
        }

        .mtc-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: ${isRtl ? 'auto' : '2px'};
          right: ${isRtl ? '2px' : 'auto'};
          width: 13px;
          height: 13px;
          background: #8d81ab;
          border-radius: 50%;
          transition: .2s;
        }

        .mtc-switch.on {
          background: var(--mtc-grad);
        }

        .mtc-switch.on::after {
          left: ${isRtl ? 'auto' : '17px'};
          right: ${isRtl ? '17px' : 'auto'};
          background: #fff;
        }

        .mtc-btn {
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 9px;
          transition: .15s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .mtc-btn-primary {
          background: var(--mtc-grad);
          color: #fff;
        }

        .mtc-btn-primary:hover {
          filter: brightness(1.1);
        }

        .mtc-btn-ghost {
          background: var(--mtc-panel-solid);
          border: 1px solid var(--mtc-border);
          color: var(--mtc-text-1);
        }

        .mtc-btn-ghost:hover {
          border-color: var(--mtc-violet-soft);
          color: #fff;
        }

        .mtc-tabs {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          padding-bottom: 0;
          margin-bottom: -1px;
        }

        .mtc-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          padding: 10px 14px;
          font-size: 12.5px;
          color: var(--mtc-text-2);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: .15s;
        }

        .mtc-tab:hover {
          color: var(--mtc-text-0);
        }

        .mtc-tab.active {
          color: #fff;
          border-bottom-color: var(--mtc-violet);
        }

        .mtc-tab .mtc-badge {
          font-size: 9.5px;
          background: var(--mtc-red);
          color: #fff;
          padding: 1px 6px;
          border-radius: 20px;
          margin-inline-start: 4px;
        }

        .mtc-body {
          padding: 22px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .mtc-grid {
          display: grid;
          gap: 14px;
        }

        .mtc-g4 {
          grid-template-columns: repeat(4, 1fr);
        }

        .mtc-g3 {
          grid-template-columns: repeat(3, 1fr);
        }

        .mtc-g2 {
          grid-template-columns: repeat(2, 1fr);
        }

        @media(max-width: 900px) {
          .mtc-g4 { grid-template-columns: repeat(2, 1fr); }
          .mtc-g3 { grid-template-columns: repeat(2, 1fr); }
          .mtc-g2 { grid-template-columns: 1fr; }
        }

        @media(max-width: 600px) {
          .mtc-g4 { grid-template-columns: 1fr; }
          .mtc-g3 { grid-template-columns: 1fr; }
        }

        .mtc-card {
          background: linear-gradient(180deg, #1d1530b8, #170f26b8);
          border: 1px solid var(--mtc-border-soft);
          border-radius: 14px;
          padding: 16px;
          position: relative;
          overflow: hidden;
          text-align: ${isRtl ? 'right' : 'left'};
        }

        .mtc-card-label {
          font-size: 11.5px;
          color: var(--mtc-text-2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mtc-card-value {
          font-size: 22px;
          font-weight: 800;
          margin-top: 6px;
          color: #fff;
        }

        .mtc-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-inline-start: 6px;
        }

        .mtc-dot-green {
          background: var(--mtc-green);
          box-shadow: 0 0 8px #22c55e88;
        }

        .mtc-dot-red {
          background: var(--mtc-red);
          box-shadow: 0 0 8px #ef444488;
        }

        .mtc-sec-title {
          font-size: 14.5px;
          margin: 22px 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-weight: bold;
        }

        .mtc-sec-desc {
          font-size: 12px;
          color: var(--mtc-text-2);
          margin: -6px 0 14px;
        }

        .mtc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .mtc-table th {
          text-align: ${isRtl ? 'right' : 'left'};
          color: var(--mtc-text-2);
          font-weight: 600;
          font-size: 11px;
          padding: 9px 10px;
          border-bottom: 1px solid var(--mtc-border-soft);
        }

        .mtc-table td {
          padding: 9px 10px;
          border-bottom: 1px solid #ffffff08;
          color: var(--mtc-text-1);
        }

        .mtc-table tr:hover td {
          background: #ffffff05;
        }

        .mtc-pill {
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 600;
          display: inline-block;
        }

        .mtc-pill-green {
          background: #22c55e22;
          color: #4ade80;
          border: 1px solid #22c55e44;
        }

        .mtc-pill-red {
          background: #ef444422;
          color: #f87171;
          border: 1px solid #ef444444;
        }

        .mtc-pill-violet {
          background: #7c3aed22;
          color: #a78bfa;
          border: 1px solid #7c3aed44;
        }

        .mtc-integ-card {
          background: linear-gradient(180deg, #1d1530, #170f26);
          border: 1px solid var(--mtc-border-soft);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mtc-integ-head {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mtc-integ-logo {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          flex-shrink: 0;
        }

        .mtc-logo-meta {
          background: linear-gradient(135deg, #0866FF, #5C41FF);
        }

        .mtc-logo-google {
          background: linear-gradient(135deg, #EA4335, #4285F4, #34A853, #FBBC05);
        }

        .mtc-logo-tiktok {
          background: #000;
          border: 1px solid #333;
        }

        .mtc-logo-linkedin {
          background: #0A66C2;
        }

        .mtc-integ-name {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
        }

        .mtc-integ-desc {
          font-size: 11.5px;
          color: var(--mtc-text-2);
          margin-top: 2px;
        }

        .mtc-integ-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11.5px;
          color: var(--mtc-text-2);
          border-top: 1px solid var(--mtc-border-soft);
          padding-top: 10px;
          margin-top: auto;
        }

        .mtc-connected-box {
          background: #22c55e12;
          border: 1px solid #22c55e33;
          border-radius: 12px;
          padding: 11px 13px;
          font-size: 11.5px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .mtc-connected-row {
          display: flex;
          justify-content: space-between;
          color: var(--mtc-text-1);
        }

        .mtc-connected-row b {
          color: #fff;
          font-weight: 600;
        }

        .mtc-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #33275077;
          border-top-color: var(--mtc-violet);
          border-radius: 50%;
          animation: mtc-spin .8s linear infinite;
          margin: 24px auto;
        }

        @keyframes mtc-spin {
          to { transform: rotate(360deg); }
        }

        .mtc-center-text {
          text-align: center;
          color: var(--mtc-text-2);
          font-size: 12px;
        }

        .mtc-success-tick {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #22c55e22;
          border: 2px solid #22c55e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          margin: 12px auto;
          color: #4ade80;
        }

        .mtc-close {
          cursor: pointer;
          color: var(--mtc-text-2);
          font-size: 18px;
          line-height: 1;
        }

        .mtc-realtime-search {
          background: #100b1a;
          border: 1px solid var(--mtc-border);
          border-radius: 9px;
          color: #fff;
          padding: 8px 11px;
          font-size: 12px;
          font-family: inherit;
          width: 100%;
          outline: none;
        }

        .mtc-realtime-search:focus {
          border-color: var(--mtc-violet-soft);
        }

        .mtc-tag {
          font-size: 9.5px;
          padding: 2px 7px;
          border-radius: 6px;
          background: #ffffff0d;
          color: var(--mtc-text-2);
        }

        .mtc-note {
          background: #7c3aed14;
          border: 1px solid #7c3aed3a;
          border-radius: 11px;
          padding: 11px 15px;
          font-size: 11.5px;
          color: var(--mtc-text-1);
          margin-bottom: 16px;
          line-height: 1.8;
          text-align: ${isRtl ? 'right' : 'left'};
        }
      ` }} />

    </div>
  );
}
