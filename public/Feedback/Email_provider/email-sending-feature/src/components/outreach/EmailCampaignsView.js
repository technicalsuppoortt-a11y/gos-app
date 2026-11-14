'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Send,
  Clock,
  Ban,
  RefreshCw,
  Users,
  Trash2,
  Plus,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Sparkles,
  Layers,
  Eye,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  ChevronLeft,
  Settings,
  Filter,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  Copy,
  ExternalLink,
  Palette
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import {
  CREDIT_BUCKETS,
  getConsumedCredits,
  getCreditBucket,
  matchesTrialAudience
} from '../../lib/credits/buckets';
import EmailBuilderModal from './email-builder/EmailBuilderModal';
import { PREBUILT_EMAIL_TEMPLATES } from './email-builder/emailTemplates';
import { DEFAULT_EMAIL_THEME } from './email-builder/defaultBlocks';
import { compileEmailHtml } from './email-builder/emailHtmlGenerator';

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
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function toIso(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (v.seconds) return new Date(v.seconds * 1000).toISOString();
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'string' ? v : null;
}

function serializeClientCampaign(d) {
  const data = d.data() || {};
  return {
    id: d.id,
    ...data,
    createdAt: toIso(data.createdAt),
    scheduledAt: toIso(data.scheduledAt),
    testSentAt: toIso(data.testSentAt),
    confirmedAt: toIso(data.confirmedAt),
    completedAt: toIso(data.completedAt)
  };
}

function computeBuckets(users, trialOnly) {
  const counts = Object.fromEntries(CREDIT_BUCKETS.map((b) => [b.key, 0]));
  (users || []).forEach((u) => {
    if (!u || u.role === 'admin' || u.role === 'super_admin') return;
    if (!matchesTrialAudience(u, trialOnly)) return;
    const key = u.creditBucket || getCreditBucket(getConsumedCredits(u));
    if (counts[key] !== undefined) counts[key] += 1;
  });
  const buckets = CREDIT_BUCKETS.map((b) => ({ ...b, count: counts[b.key] || 0 }));
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  return { buckets, total };
}

function previewFromUsers(users, audience) {
  const type = audience?.type || 'all';
  const trialOnly = audience?.trialOnly !== false;
  const matched = (users || []).filter((u) => {
    if (!u) return false;
    if (type === 'selected') return (audience.userIds || []).includes(u.id);
    if (u.role === 'admin' || u.role === 'super_admin') return false;
    if (!matchesTrialAudience(u, trialOnly)) return false;
    if (type === 'all') return true;
    if (type === 'segment') {
      const bucket = u.creditBucket || getCreditBucket(getConsumedCredits(u));
      return bucket === audience.segment;
    }
    if (type === 'plan' && audience.plan) {
      return (u.planName || u.plan || '').toLowerCase() === audience.plan.toLowerCase();
    }
    return false;
  });
  return {
    count: matched.length,
    sample: matched.slice(0, 10).map((u) => ({
      id: u.id,
      name: u.name || u.displayName || u.fullName || u.email || '—',
      email: u.email || u.userEmail || '',
      phone: u.phoneNumber || u.phone || '',
      bucket: u.creditBucket || getCreditBucket(getConsumedCredits(u)),
      creditsUsed: getConsumedCredits(u)
    }))
  };
}

function toDatetimeLocal(v) {
  const iso = toIso(v);
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM = {
  name: '',
  channel: 'email',
  subject: '',
  preheader: '',
  fromName: 'فريق UpKlick',
  fromEmail: 'support@upklick.net',
  replyTo: 'support@upklick.net',
  htmlBody: '',
  emailDesign: null,
  actionUrl: '',
  actionText: '',
  audienceType: 'all',
  segment: 'c500',
  plan: '',
  trialOnly: true,
  sendNow: true,
  scheduledAt: ''
};

export default function EmailCampaignsView({ isRTL, users = [] }) {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchTrialOnly, setSearchTrialOnly] = useState(false);
  const [preview, setPreview] = useState(null);
  const [draft, setDraft] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Setup, 2: Design, 3: Audience, 4: Launch
  const [confirmCount, setConfirmCount] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState('welcome-onboarding');
  const [customTemplates, setCustomTemplates] = useState([]);
  const [designTab, setDesignTab] = useState('prebuilt'); // 'prebuilt' | 'saved'

  const t = (ar, en) => (isRTL ? ar : en);
  const composeRef = useRef(null);

  const { buckets, total: segmentTotal } = useMemo(() => {
    return computeBuckets(users, form.trialOnly);
  }, [users, form.trialOnly]);

  const loadSavedTemplatesFromLocalAndApi = useCallback(async () => {
    let localList = [];
    try {
      const cached = localStorage.getItem('upklick_saved_email_templates');
      if (cached) {
        localList = JSON.parse(cached) || [];
        if (Array.isArray(localList) && localList.length > 0) {
          setCustomTemplates(localList);
        }
      }
    } catch {}

    try {
      const data = await adminFetch('/api/admin/outreach/templates');
      if (data.templates && Array.isArray(data.templates)) {
        const map = new Map();
        data.templates.forEach((t) => map.set(t.id, t));
        localList.forEach((t) => { if (!map.has(t.id)) map.set(t.id, t); });
        const merged = Array.from(map.values());
        setCustomTemplates(merged);
        try {
          localStorage.setItem('upklick_saved_email_templates', JSON.stringify(merged));
        } catch {}
      }
    } catch (err) {
      console.warn('[loadSavedTemplatesFromLocalAndApi]', err);
    }
  }, []);

  const loadCore = useCallback(async () => {
    const results = await Promise.allSettled([
      adminFetch('/api/admin/outreach/status'),
      adminFetch('/api/admin/outreach/campaigns')
    ]);

    if (results[0].status === 'fulfilled') {
      setStatus(results[0].value);
    } else {
      setStatus({ emailConfigured: true });
    }

    if (results[1].status === 'fulfilled') {
      const emailOnly = (results[1].value.campaigns || []).filter(c => c.channel !== 'whatsapp');
      setCampaigns(emailOnly);
    }

    await loadSavedTemplatesFromLocalAndApi();
  }, [loadSavedTemplatesFromLocalAndApi]);

  const processScheduledDue = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/outreach/campaigns/dispatch', { method: 'POST' });
      if (res && (res.processedCount > 0 || res.dispatchedCount > 0)) {
        await loadCore();
      }
    } catch {}
  }, [loadCore]);

  useEffect(() => {
    if (!currentUser) return;
    loadCore().catch((err) => setError(err.message));
    processScheduledDue();
    const timer = setInterval(() => {
      processScheduledDue();
    }, 20000);
    return () => clearInterval(timer);
  }, [currentUser, loadCore, processScheduledDue]);

  useEffect(() => {
    if (!info) return undefined;
    const timer = setTimeout(() => setInfo(''), 4500);
    return () => clearTimeout(timer);
  }, [info]);

  // Set default initial template design if form has no htmlBody
  useEffect(() => {
    if (!form.htmlBody && !form.emailDesign) {
      const defaultTmpl = PREBUILT_EMAIL_TEMPLATES[0];
      const compiled = compileEmailHtml(defaultTmpl.blocks, defaultTmpl.theme || DEFAULT_EMAIL_THEME);
      setForm((f) => ({
        ...f,
        emailDesign: { blocks: defaultTmpl.blocks, theme: defaultTmpl.theme },
        htmlBody: compiled
      }));
    }
  }, [form.htmlBody, form.emailDesign]);

  const audience = useMemo(() => {
    const base = { type: form.audienceType, trialOnly: form.trialOnly };
    if (form.audienceType === 'segment') base.segment = form.segment;
    if (form.audienceType === 'plan') base.plan = form.plan;
    if (form.audienceType === 'selected') base.userIds = selectedUsers.map((u) => u.id);
    return base;
  }, [form.audienceType, form.trialOnly, form.segment, form.plan, selectedUsers]);

  const campaignPayload = useCallback(() => ({
    campaignId: draft?.id && draft.status === 'draft' ? draft.id : undefined,
    name: form.name,
    channel: 'email',
    subject: form.subject,
    preheader: form.preheader,
    fromName: form.fromName,
    fromEmail: form.fromEmail,
    replyTo: form.replyTo,
    htmlBody: form.htmlBody,
    emailDesign: form.emailDesign,
    actionUrl: form.actionUrl,
    actionText: form.actionText,
    audience,
    previewCount: preview?.count || 0
  }), [draft, form, audience, preview]);

  const runPreview = async () => {
    setBusy('preview');
    setError('');
    try {
      const data = previewFromUsers(users, audience);
      setPreview(data);
      setConfirmCount(String(data.count ?? ''));
      setInfo(t(`عدد المستلمين المستهدفين: ${data.count}`, `Target recipients count: ${data.count}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const saveDraft = async () => {
    if (!form.name.trim()) {
      setError(t('اكتب اسم الحملة أولاً', 'Enter a campaign name first'));
      return;
    }
    setBusy('save');
    setError('');
    try {
      const payload = campaignPayload();
      let saved = null;
      if (draft?.id && draft.status === 'draft') {
        const data = await adminFetch(`/api/admin/outreach/campaigns/${draft.id}`, {
          method: 'PATCH',
          body: payload
        });
        saved = data.campaign;
      } else {
        const data = await adminFetch('/api/admin/outreach/campaigns', { method: 'POST', body: payload });
        saved = data.campaign;
      }
      setDraft(saved);
      setCampaigns((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)]);
      setInfo(t('تم حفظ المسودة بنجاح', 'Draft saved successfully'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const openDraft = (c) => {
    setDraft(c);
    setForm({
      name: c.name || '',
      channel: 'email',
      subject: c.subject || '',
      preheader: c.preheader || '',
      fromName: c.fromName || 'فريق UpKlick',
      fromEmail: c.fromEmail || 'support@upklick.net',
      replyTo: c.replyTo || 'support@upklick.net',
      htmlBody: c.htmlBody || '',
      emailDesign: c.emailDesign || null,
      actionUrl: c.actionUrl || '',
      actionText: c.actionText || '',
      audienceType: c.audience?.type || 'all',
      segment: c.audience?.segment || 'c500',
      plan: c.audience?.plan || '',
      trialOnly: c.audience?.trialOnly !== false,
      sendNow: !c.scheduledAt,
      scheduledAt: c.scheduledAt ? toDatetimeLocal(c.scheduledAt) : ''
    });
    setSelectedUsers((c.audience?.userIds || []).map((id) => {
      const u = (users || []).find((x) => x.id === id);
      return { id, name: u?.name || id, email: u?.email || '' };
    }));
    setPreview(c.previewCount != null ? { count: c.previewCount, sample: [] } : null);
    setConfirmCount(c.previewCount != null ? String(c.previewCount) : '');
    setCurrentStep(1);
    requestAnimationFrame(() => composeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const confirmSend = async () => {
    setBusy('confirm');
    setError('');
    try {
      const data = await adminFetch('/api/admin/outreach/campaigns/confirm', {
        method: 'POST',
        body: {
          ...campaignPayload(),
          confirmText,
          confirmCount: Number(confirmCount),
          sendNow: form.sendNow,
          scheduledAt: form.sendNow ? undefined : new Date(form.scheduledAt).toISOString()
        }
      });
      setDraft(data.campaign);
      setConfirmText('');
      setInfo(t('تم تأكيد الحملة وإضافتها لقائمة الإرسال الفوري 🚀', 'Campaign confirmed and queued for sending 🚀'));
      await loadCore();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const handleApplyQuickTemplate = (tmpl) => {
    setActiveTemplateId(tmpl.id);
    const compiled = compileEmailHtml(tmpl.blocks, tmpl.theme || DEFAULT_EMAIL_THEME);
    setForm((f) => ({
      ...f,
      emailDesign: { blocks: tmpl.blocks, theme: tmpl.theme },
      htmlBody: compiled
    }));
    setInfo(t(`تم تطبيق قالب: ${isRTL ? tmpl.nameAr : tmpl.nameEn}`, `Applied template: ${tmpl.nameEn}`));
  };

  const handleBuilderSave = ({ blocks, theme, htmlBody }) => {
    setForm((f) => ({
      ...f,
      emailDesign: { blocks, theme },
      htmlBody
    }));
    setInfo(t('تم تحديث تصميم البريد الإلكتروني بنجاح ✨', 'Email design updated successfully ✨'));
  };

  const handleSendTestEmail = async ({ testEmail, htmlBody }) => {
    if (draft?.id) {
      await adminFetch(`/api/admin/outreach/campaigns/${draft.id}/send-test`, {
        method: 'POST',
        body: { testEmail }
      });
    } else {
      // If no draft yet, save draft first then send test
      const payload = campaignPayload();
      const res = await adminFetch('/api/admin/outreach/campaigns', {
        method: 'POST',
        body: { ...payload, htmlBody }
      });
      const saved = res.campaign;
      setDraft(saved);
      await adminFetch(`/api/admin/outreach/campaigns/${saved.id}/send-test`, {
        method: 'POST',
        body: { testEmail }
      });
    }
  };

  const searchResults = useMemo(() => {
    const term = searchQ.trim().toLowerCase();
    return (users || [])
      .filter((u) => {
        if (!u || u.role === 'admin' || u.role === 'super_admin') return false;
        if (searchTrialOnly && !matchesTrialAudience(u, true)) return false;
        if (!term) return true;
        const hay = `${u.name || ''} ${u.displayName || ''} ${u.email || ''} ${u.phoneNumber || ''}`.toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 40);
  }, [users, searchQ, searchTrialOnly]);

  const toggleUser = (user) => {
    setSelectedUsers((prev) => {
      if (prev.some((p) => p.id === user.id)) return prev.filter((p) => p.id !== user.id);
      return [...prev, user];
    });
    setPreview(null);
  };

  // Metrics Calculation
  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent || 0), 0);
  const totalRecipients = campaigns.reduce((acc, c) => acc + (c.total || c.previewCount || 0), 0);
  const deliveryRate = totalRecipients > 0 ? Math.round((totalSent / totalRecipients) * 100) : 100;
  const scheduledCount = campaigns.filter((c) => c.status === 'scheduled').length;

  const canConfirm = Boolean(
    form.name.trim() &&
    form.subject.trim() &&
    form.htmlBody.trim() &&
    preview &&
    String(preview.count) === String(confirmCount) &&
    confirmText.trim().toUpperCase() === 'SEND'
  );

  const checks = [
    { ok: Boolean(form.name.trim()), label: t('اسم الحملة', 'Campaign Name') },
    { ok: Boolean(form.subject.trim()), label: t('عنوان الإيميل', 'Subject') },
    { ok: Boolean(form.htmlBody.trim()), label: t('تصميم القالب', 'Visual Design') },
    { ok: Boolean(preview && preview.count > 0), label: t('معاينة الجمهور', 'Audience Preview') },
    { ok: Boolean(preview && String(preview.count) === String(confirmCount)), label: t('العدد مطابق', 'Count Matches') },
    { ok: confirmText.trim().toUpperCase() === 'SEND', label: 'SEND' }
  ];

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (filterStatus === 'all') return true;
      return c.status === filterStatus;
    });
  }, [campaigns, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCampaigns.slice(start, start + pageSize);
  }, [filteredCampaigns, currentPage, pageSize]);

  return (
    <div className="outreach-page" style={{ animation: 'fadeSlide 0.35s ease' }}>
      
      {/* Top Status & Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        {/* Amazon SES Health Card */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', background: 'linear-gradient(135deg, rgba(255,107,53,0.06) 0%, rgba(108,53,255,0.06) 100%)', border: '1px solid rgba(255,107,53,0.2)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,107,53,0.15)', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <Mail size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text3)', fontWeight: 700 }}>Amazon SES (SMTP)</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              {t('متصل وجاهز للإرسال', 'Connected & Verified')}
            </div>
          </div>
        </div>

        {/* Total Campaigns KPI */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(108,53,255,0.12)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text3)', fontWeight: 700 }}>{t('إجمالي الحملات', 'Total Campaigns')}</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text)' }}>{totalCampaigns}</div>
          </div>
        </div>

        {/* Delivered Emails KPI */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text3)', fontWeight: 700 }}>{t('الرسائل المرسلة', 'Emails Sent')}</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text)' }}>{totalSent.toLocaleString()}</div>
          </div>
        </div>

        {/* Scheduled KPI */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: 'var(--text3)', fontWeight: 700 }}>{t('المجدولة قيد الانتظار', 'Scheduled Queued')}</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text)' }}>{scheduledCount}</div>
            </div>
          </div>
          {scheduledCount > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={processScheduledDue}
              style={{ fontSize: '11px', padding: '4px 8px', background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)', border: 'none', fontWeight: 800 }}
              title={t('معالجة وإرسال الحملات المستحقة الآن', 'Process due scheduled campaigns now')}
            >
              ⚡ {t('معالجة الآن', 'Process')}
            </button>
          )}
        </div>

      </div>

      {/* Admin-Only: Registered AWS SES Domains & Identities (EU-NORTH-1) */}
      {Array.isArray(status?.awsIdentities) && status.awsIdentities.length > 0 && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            marginBottom: '20px',
            background: 'rgba(16, 185, 129, 0.04)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} style={{ color: '#10b981' }} />
              <span>{t('النطاقات والإيميلات المسجلة في AWS SES (للأدمن فقط - EU-NORTH-1)', 'Registered AWS SES Domains & Identities (Admin Only - EU-NORTH-1)')}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={loadCore} style={{ fontSize: '11px', padding: '4px 10px' }}>
              <RefreshCw size={12} />
              <span>{t('تحديث من AWS', 'Refresh AWS')}</span>
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {status.awsIdentities.map((item) => (
              <div
                key={item.name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: item.verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${item.verified ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  fontSize: '12px',
                  direction: 'ltr'
                }}
              >
                <span>{item.type === 'EMAIL_ADDRESS' ? '📧' : '🌐'}</span>
                <strong style={{ color: 'var(--text)' }}>{item.name}</strong>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: item.verified ? '#10b981' : '#f59e0b' }}>
                  {item.verified ? '✓ Verified' : `⏳ ${item.status}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="outreach-banner err" style={{ marginBottom: '16px' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>{error}</div>
          <button type="button" className="outreach-banner-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {info && (
        <div className="outreach-banner ok" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <div>{info}</div>
        </div>
      )}

      {/* Main Campaign Builder Card (GHL Multi-step Wizard) */}
      <div
        ref={composeRef}
        className="card"
        style={{
          padding: '24px',
          marginBottom: '28px',
          border: '1px solid rgba(255, 107, 53, 0.25)',
          background: 'var(--bg2)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
        }}
      >
        {/* Wizard Header */}
        <div className="flex-between" style={{ gap: '12px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Sparkles size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                {draft ? t('تعديل حملة الإيميل', 'Edit Email Campaign') : t('إنشاء وتصميم حملة إيميل جديدة', 'Compose Visual Email Campaign')}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text3)' }}>
              {t('اختر القالب، صمم المحتوى عبر الـ Drag & Drop، حدد فئات الجمهور، وجدول الإرسال فوراً', 'Choose template, design with Drag & Drop visual editor, target audience segments, and schedule.')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsBuilderOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(255, 107, 53, 0.35)',
                fontWeight: 800
              }}
            >
              <Palette size={16} />
              <span>{t('فتح مصمم الإيميلات المرئي (Drag & Drop)', 'Open Visual Email Builder')}</span>
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={saveDraft} disabled={!!busy || !form.name.trim()}>
              {t('حفظ كمسودة', 'Save Draft')}
            </button>
          </div>
        </div>

        {/* 4-Step Navigation Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
          {[
            { step: 1, labelAr: '1. إعدادات الحملة', labelEn: '1. Setup & Sender', icon: Settings },
            { step: 2, labelAr: '2. تصميم الإيميل', labelEn: '2. Visual Design', icon: Palette },
            { step: 3, labelAr: '3. استهداف الجمهور', labelEn: '3. Audience & Segments', icon: Users },
            { step: 4, labelAr: '4. المراجعة والإطلاق', labelEn: '4. Review & Launch', icon: Send }
          ].map((st) => {
            const Icon = st.icon;
            const isActive = currentStep === st.step;
            const isDone = currentStep > st.step;
            return (
              <button
                key={st.step}
                type="button"
                onClick={() => setCurrentStep(st.step)}
                style={{
                  background: isActive ? 'rgba(255, 107, 53, 0.12)' : isDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg3)',
                  border: isActive ? '1px solid #FF6B35' : isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'start',
                  color: isActive ? '#FF6B35' : isDone ? '#10b981' : 'var(--text2)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isActive ? '#FF6B35' : isDone ? '#10b981' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  {isDone ? '✓' : st.step}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>
                  {isRTL ? st.labelAr : st.labelEn}
                </div>
              </button>
            );
          })}
        </div>

        {/* STEP 1: SETUP & SENDER DETAILS */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeSlide 0.25s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text2)' }}>
                  {t('اسم الحملة الداخلي (Internal Campaign Name)', 'Internal Campaign Name')} <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input
                  className="form-control"
                  placeholder={t('مثال: ترحيب المشتركين الجدد - مارس 2026', 'e.g. March 2026 Trial Welcome Blast')}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text2)' }}>
                  {t('اسم المرسل (Sender Name)', 'From Name')}
                </label>
                <input
                  className="form-control"
                  placeholder="UpKlick Team"
                  value={form.fromName}
                  onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text2)' }}>
                  {t('عنوان البريد الإلكتروني (Subject Line)', 'Subject Line')} <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input
                  className="form-control"
                  placeholder={t('🎉 مرحباً {{name}}، ميزات جديدة بانتظارك في حسابك!', '🎉 Welcome {{name}}, new growth features inside!')}
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {['{{name}}', '🚀 عرض حصري', '⏳ تذكير هام', '✨ تحديث جديد'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, subject: `${f.subject} ${sug}`.trim() }))}
                      style={{ fontSize: '11px', background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: '6px', padding: '2px 8px', color: 'var(--text3)', cursor: 'pointer' }}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text2)' }}>
                  {t('نص المعاينة المختصر (Preheader Snippet)', 'Preheader Snippet')}
                </label>
                <input
                  className="form-control"
                  placeholder={t('يظهر بجانب العنوان في صندوق البريد الوارد...', 'Appears next to subject in email inboxes...')}
                  value={form.preheader}
                  onChange={(e) => setForm((f) => ({ ...f, preheader: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep(2)}
                disabled={!form.name.trim() || !form.subject.trim()}
              >
                <span>{t('المتابعة إلى تصميم الإيميل', 'Proceed to Visual Design')}</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VISUAL DESIGN & TEMPLATES */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeSlide 0.25s ease' }}>
            
            {/* Quick Template Picker Strip with Tabs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                  {t('اختر قالباً جاهزاً أو من تصاميمك المحفوظة:', 'Choose a ready template or your saved custom designs:')}
                </div>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg3)', padding: '3px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <button
                    type="button"
                    onClick={() => setDesignTab('prebuilt')}
                    style={{
                      background: designTab === 'prebuilt' ? '#FF6B35' : 'transparent',
                      color: designTab === 'prebuilt' ? '#fff' : 'var(--text3)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {t('قوالب النظام (5)', 'Prebuilt Templates (5)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesignTab('saved')}
                    style={{
                      background: designTab === 'saved' ? '#6C35FF' : 'transparent',
                      color: designTab === 'saved' ? '#fff' : 'var(--text3)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {t(`تصاميمي المحفوظة (${customTemplates.length})`, `My Saved Designs (${customTemplates.length})`)}
                  </button>
                </div>
              </div>

              {designTab === 'prebuilt' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {PREBUILT_EMAIL_TEMPLATES.map((tmpl) => {
                    const isActive = activeTemplateId === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => handleApplyQuickTemplate(tmpl)}
                        style={{
                          background: isActive ? 'rgba(255, 107, 53, 0.12)' : 'var(--bg3)',
                          border: isActive ? '2px solid #FF6B35' : '1px solid var(--line)',
                          borderRadius: '12px',
                          padding: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '20px' }}>{tmpl.thumbnail}</span>
                          {isActive && <span style={{ fontSize: '11px', color: '#FF6B35', fontWeight: 800 }}>✓ {t('المحدد', 'Selected')}</span>}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)' }}>
                          {isRTL ? tmpl.nameAr : tmpl.nameEn}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                customTemplates.length === 0 ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center', background: 'var(--bg3)', borderRadius: '14px', border: '1px dashed var(--line)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎨</div>
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text)', fontWeight: 800 }}>
                      {t('لا توجد تصاميم محفوظة بعد في مكتبتك', 'No custom saved templates yet')}
                    </p>
                    <p style={{ margin: '6px 0 16px', fontSize: '12px', color: 'var(--text3)' }}>
                      {t('افتح مصمم الإيميلات واحفظ أي تصميم بالنقر على "حفظ كقالب مخصص" لتتمكن من استخدامه في أي حملة!', 'Open visual builder and click "Save as Template" to reuse anytime!')}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setIsBuilderOpen(true)}
                        style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)', border: 'none', fontWeight: 800 }}
                      >
                        <Palette size={13} />
                        <span>{t('فتح المصمم وحفظ تصميم جديد', 'Open Designer & Save Template')}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => loadSavedTemplatesFromLocalAndApi()}
                      >
                        <RefreshCw size={13} />
                        <span>{t('تحديث', 'Refresh')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {customTemplates.map((st) => {
                      const isActive = activeTemplateId === st.id;
                      return (
                        <div
                          key={st.id}
                          onClick={() => {
                            setActiveTemplateId(st.id);
                            const compiled = compileEmailHtml(st.blocks, st.theme || DEFAULT_EMAIL_THEME);
                            setForm((f) => ({
                              ...f,
                              emailDesign: { blocks: st.blocks, theme: st.theme },
                              htmlBody: compiled
                            }));
                            setInfo(t(`تم تطبيق تصميم: ${st.name}`, `Loaded design: ${st.name}`));
                          }}
                          style={{
                            background: isActive ? 'rgba(108, 53, 255, 0.15)' : 'var(--bg3)',
                            border: isActive ? '2px solid #6C35FF' : '1px solid var(--line)',
                            borderRadius: '12px',
                            padding: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '20px' }}>{st.thumbnail || '🎨'}</span>
                            {isActive && <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 800 }}>✓ {t('المحدد', 'Selected')}</span>}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)' }}>
                            {st.name}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text3)' }}>
                            {st.blocks?.length || 0} {t('عناصر', 'blocks')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Launch Visual Builder Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,53,0.12) 0%, rgba(108,53,255,0.12) 100%)',
                border: '1px dashed #FF6B35',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                  🎨 {t('محرر السحب والإفلات المرئي الكامل (Drag & Drop Canvas)', 'Full Visual Drag & Drop Canvas')}
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text2)' }}>
                  {t('قم بإضافة وتعديل الصور، الأزرار، الألوان، الكوبونات، ومعاينة الموبايل الحية بكل سهولة.', 'Customize blocks, images, CTA buttons, colors, coupons, and real-time mobile preview.')}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsBuilderOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)',
                  border: 'none',
                  padding: '10px 24px',
                  fontWeight: 800
                }}
              >
                <Palette size={16} />
                <span>{t('تعديل في المصمم المرئي', 'Edit in Visual Designer')}</span>
              </button>
            </div>

            {/* Live Email HTML Container Preview */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px', color: 'var(--text2)' }}>
                {t('معاينة الإيميل الحالي:', 'Live Email Preview:')}
              </div>
              <div
                style={{
                  maxHeight: '380px',
                  overflowY: 'auto',
                  border: '1px solid var(--line)',
                  borderRadius: '14px',
                  background: '#0a0a14',
                  padding: '20px'
                }}
                dangerouslySetInnerHTML={{ __html: form.htmlBody }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCurrentStep(1)}>
                {t('السابق', 'Back')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setCurrentStep(3)}>
                <span>{t('المتابعة لاستهداف الجمهور', 'Proceed to Audience')}</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: AUDIENCE & SEGMENTS */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeSlide 0.25s ease' }}>
            
            {/* Audience Type Radio Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {[
                { id: 'all', label: t('كل المستخدمين', 'All Users'), icon: Users, desc: t('إرسال لكافة المستخدمين', 'Broadcast to all') },
                { id: 'segment', label: t('فئات استهلاك الكريدت', 'Credit Segments'), icon: Layers, desc: t('استهداف حسب فئة الكريدت', 'Target by credit usage') },
                { id: 'selected', label: t('تحديد أشخاص مخصصين', 'Selected People'), icon: Filter, desc: t('اختيار يدوي بالاسم أو الإيميل', 'Pick specific contacts') }
              ].map((opt) => {
                const Icon = opt.icon;
                const isSel = form.audienceType === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => { setForm((f) => ({ ...f, audienceType: opt.id })); setPreview(null); }}
                    style={{
                      background: isSel ? 'rgba(255, 107, 53, 0.12)' : 'var(--bg3)',
                      border: isSel ? '2px solid #FF6B35' : '1px solid var(--line)',
                      borderRadius: '12px',
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={16} color={isSel ? '#FF6B35' : 'var(--text3)'} />
                      <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{opt.label}</strong>
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--text3)' }}>{opt.desc}</span>
                  </div>
                );
              })}
            </div>

            {/* Segment Grid Selector */}
            {form.audienceType === 'segment' && (
              <div style={{ background: 'var(--bg3)', borderRadius: '14px', padding: '16px', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>
                  {t('اختر فئة استهلاك الكريدت المستهدفة:', 'Select Target Credit Segment:')}
                </div>
                <div className="outreach-seg-grid">
                  {buckets.map((b) => {
                    const active = form.segment === b.key;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        className={`outreach-seg-card${active ? ' is-active' : ''}`}
                        onClick={() => { setForm((f) => ({ ...f, segment: b.key })); setPreview(null); }}
                      >
                        <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 700 }}>
                          {isRTL ? b.labelAr : b.labelEn}
                        </div>
                        <div className="outreach-seg-count">{(b.count || 0).toLocaleString()}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom People Multi-Picker */}
            {form.audienceType === 'selected' && (
              <div style={{ border: '1px solid var(--line)', borderRadius: '14px', padding: '16px', background: 'var(--bg3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                    <input
                      className="form-control"
                      style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: '32px' }}
                      placeholder={t('ابحث بالاسم أو البريد الإلكتروني...', 'Search contact name or email...')}
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />
                  </div>
                  <label style={{ fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={searchTrialOnly} onChange={(e) => setSearchTrialOnly(e.target.checked)} />
                    {t('تجريبيون فقط', 'Trial only')}
                  </label>
                </div>

                {/* Search Results List */}
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {searchResults.map((u) => {
                    const isSelected = selectedUsers.some((s) => s.id === u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUser(u)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(255, 107, 53, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid #FF6B35' : '1px solid var(--line)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '12.5px', color: 'var(--text)' }}>{u.name || u.displayName || u.email}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text3)', marginInlineStart: '8px' }}>{u.email}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: isSelected ? '#FF6B35' : 'var(--text3)' }}>
                          {isSelected ? '✓' : '+'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Run Preview Button & Box */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className="btn btn-ghost" onClick={runPreview} disabled={!!busy}>
                <Users size={16} />
                <span>{t('معاينة وحساب عدد المستلمين', 'Calculate & Preview Recipients')} {preview ? `(${preview.count})` : ''}</span>
              </button>
            </div>

            {preview && (
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '13px' }}>
                <strong style={{ color: '#10b981' }}>{t(`جاهز للإرسال إلى ${preview.count} مستلم`, `Ready to send to ${preview.count} matching recipients`)}</strong>
                <ul style={{ margin: '8px 0 0', paddingInlineStart: '18px', color: 'var(--text2)', fontSize: '12px' }}>
                  {preview.sample?.map((u) => (
                    <li key={u.id}>{u.name} — {u.email} ({u.bucket}, {u.creditsUsed} cr)</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCurrentStep(2)}>
                {t('السابق', 'Back')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => { if (!preview) runPreview(); setCurrentStep(4); }}>
                <span>{t('المتابعة للإطلاق والجدولة', 'Proceed to Launch & Schedule')}</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & LAUNCH */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeSlide 0.25s ease' }}>
            
            {/* Scheduling Options */}
            <div style={{ background: 'var(--bg3)', padding: '16px', borderRadius: '14px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>
                {t('توقيت الإرسال:', 'Delivery Schedule:')}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className={form.sendNow ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  onClick={() => setForm((f) => ({ ...f, sendNow: true }))}
                >
                  <Send size={13} /> {t('إرسال فوري بعد التأكيد', 'Send Immediately After Confirm')}
                </button>
                <button
                  type="button"
                  className={!form.sendNow ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  onClick={() => setForm((f) => ({ ...f, sendNow: false }))}
                >
                  <Clock size={13} /> {t('جدولة لتاريخ ووقت محدد', 'Schedule for Later Date')}
                </button>
                {!form.sendNow && (
                  <input
                    type="datetime-local"
                    className="form-control"
                    style={{ maxWidth: '240px' }}
                    value={form.scheduledAt}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  />
                )}
              </div>
            </div>

            {/* Pre-flight Checks */}
            <div className="outreach-launch" style={{ marginTop: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>
                {t('قائمة التحقق قبل الإطلاق — اكتب العدد ثم كلمة SEND:', 'Pre-Launch Verification — type count then SEND:')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginBottom: '14px' }}>
                {checks.map((c) => (
                  <span key={c.label} className={`outreach-check${c.ok ? ' is-done' : ''}`}>
                    <CheckCircle2 size={14} /> {c.label}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="form-control"
                  style={{ maxWidth: '120px' }}
                  placeholder={t('العدد', 'Count')}
                  value={confirmCount}
                  onChange={(e) => setConfirmCount(e.target.value)}
                />
                <input
                  className="form-control"
                  style={{ maxWidth: '140px', letterSpacing: '0.12em', fontWeight: 800 }}
                  placeholder="SEND"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmSend}
                  disabled={!canConfirm || !!busy}
                  style={{
                    background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)',
                    border: 'none',
                    fontWeight: 800
                  }}
                >
                  <Send size={16} className={busy === 'confirm' ? 'outreach-spin' : undefined} />
                  <span>{busy === 'confirm' ? t('جارٍ الإطلاق…', 'Launching…') : t('تأكيد وإطلاق الحملة 🚀', 'Confirm & Launch Campaign 🚀')}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCurrentStep(3)}>
                {t('السابق', 'Back')}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Campaigns History Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 800, fontSize: '15px' }}>{t('سجل حملات الإيميل', 'Email Campaigns')}</span>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>({campaigns.length})</span>
          </div>

          {/* Filter Status Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'all', label: t('الكل', 'All') },
              { id: 'draft', label: t('مسودة', 'Drafts') },
              { id: 'scheduled', label: t('مجدولة', 'Scheduled') },
              { id: 'sending', label: t('جاري الإرسال', 'Sending') },
              { id: 'completed', label: t('مكتملة', 'Completed') }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFilterStatus(f.id); setCurrentPage(1); }}
                style={{
                  background: filterStatus === f.id ? 'rgba(255, 107, 53, 0.15)' : 'transparent',
                  border: filterStatus === f.id ? '1px solid rgba(255, 107, 53, 0.4)' : '1px solid transparent',
                  color: filterStatus === f.id ? '#FF6B35' : 'var(--text3)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'start', fontSize: '12px', color: 'var(--text2)' }}>{t('الحملة والموضوع', 'Campaign & Subject')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'start', fontSize: '12px', color: 'var(--text2)' }}>{t('الحالة', 'Status')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'start', fontSize: '12px', color: 'var(--text2)' }}>{t('التقدم والتسليم', 'Delivery Progress')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'start', fontSize: '12px', color: 'var(--text2)' }}>{t('التاريخ', 'Date')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'start', fontSize: '12px', color: 'var(--text2)' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                    {t('لا توجد حملات إيميل مطابقة', 'No matching email campaigns found')}
                  </td>
                </tr>
              ) : paginatedCampaigns.map((c) => {
                const total = c.total || c.previewCount || 0;
                const pct = total ? Math.min(100, Math.round(((c.sent || 0) / total) * 100)) : 0;
                const isOpen = draft?.id === c.id;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--line)', background: isOpen ? 'rgba(236,92,49,0.06)' : 'transparent' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: 2 }}>
                        {c.subject || t('بدون عنوان', 'No Subject')}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`outreach-status-badge ${c.status || 'draft'}`}>
                        {c.status === 'completed' ? t('مكتملة', 'Completed') : c.status === 'scheduled' ? t('مجدولة', 'Scheduled') : c.status === 'sending' ? t('جاري الإرسال', 'Sending') : t('مسودة', 'Draft')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', minWidth: 160 }}>
                      <div style={{ color: 'var(--text2)', marginBottom: '4px' }}>
                        {c.sent || 0}/{total} {t('أُرسل', 'sent')} {c.failed ? `· ❌ ${c.failed} فشل` : ''}
                      </div>
                      <div className="outreach-progress"><span style={{ width: `${pct}%` }} /></div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '11.5px', color: 'var(--text3)' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US') : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {(c.status === 'scheduled' || c.status === 'paused') && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #6C35FF 100%)', border: 'none', color: '#fff', fontSize: '11px', padding: '4px 9px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                            disabled={busy === c.id}
                            onClick={async () => {
                              setBusy(c.id);
                              try {
                                await adminFetch(`/api/admin/outreach/campaigns/${c.id}`, { method: 'PATCH', body: { action: 'send_now' } });
                                setInfo(t('جارٍ إرسال الحملة فوراً الآن 🚀', 'Campaign dispatch started 🚀'));
                                await loadCore();
                              } catch (err) {
                                setError(err.message);
                              } finally {
                                setBusy('');
                              }
                            }}
                            title={t('بدء إرسال الحملة الآن فوراً', 'Send campaign immediately now')}
                          >
                            <Send size={11} />
                            <span>{busy === c.id ? t('جارٍ الإرسال…', 'Sending…') : t('إرسال الآن', 'Send Now')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDetailsTarget({ campaign: c, recipients: [] })}
                          title={t('عرض تفاصيل المستلمين', 'View recipient logs')}
                        >
                          👁️ {t('السجل', 'Logs')}
                        </button>
                        {c.status === 'draft' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openDraft(c)}
                            title={t('تعديل', 'Edit')}
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--red)' }}
                          onClick={() => setDeleteTarget(c)}
                          title={t('حذف', 'Delete')}
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

        {/* Pagination Footer */}
        {filteredCampaigns.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.015)'
            }}
          >
            {/* Summary & Page Size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--text3)' }}>
              <span>
                {t(
                  `عرض ${(currentPage - 1) * pageSize + 1} إلى ${Math.min(currentPage * pageSize, filteredCampaigns.length)} من أصل ${filteredCampaigns.length} حملة`,
                  `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredCampaigns.length)} of ${filteredCampaigns.length} campaigns`
                )}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{t('لكل صفحة:', 'Per page:')}</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontSize: '11.5px',
                    cursor: 'pointer'
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination Number Buttons */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '4px 10px', fontSize: '12px', opacity: currentPage <= 1 ? 0.4 : 1 }}
                >
                  {isRTL ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                  <span>{t('السابق', 'Prev')}</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isCur = p === currentPage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: isCur ? '#FF6B35' : 'var(--bg3)',
                        color: isCur ? '#ffffff' : 'var(--text2)',
                        border: isCur ? 'none' : '1px solid var(--line)',
                        fontWeight: isCur ? 800 : 600,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '4px 10px', fontSize: '12px', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                >
                  <span>{t('التالي', 'Next')}</span>
                  {isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual Email Builder Modal */}
      <EmailBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          loadSavedTemplatesFromLocalAndApi();
        }}
        initialBlocks={form.emailDesign?.blocks || null}
        initialTheme={form.emailDesign?.theme || null}
        campaignName={form.name}
        onSave={handleBuilderSave}
        onSendTestEmail={handleSendTestEmail}
        onTemplatesUpdated={(newTmpls) => {
          setCustomTemplates(newTmpls);
          try {
            localStorage.setItem('upklick_saved_email_templates', JSON.stringify(newTmpls));
          } catch {}
        }}
        isRTL={isRTL}
      />

      {/* Campaign Details & Log Modal */}
      {detailsTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setDetailsTarget(null)}>
          <div className="modal-card" style={{ maxWidth: '680px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>📊</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{detailsTarget.campaign?.name}</h3>
                  <div style={{ fontSize: '11.5px', color: 'var(--text3)' }}>{detailsTarget.campaign?.subject}</div>
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetailsTarget(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: 'var(--bg3)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{t('المستهدفون', 'Total')}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{detailsTarget.campaign?.total || detailsTarget.campaign?.previewCount || 0}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--green)' }}>{t('أُرسل', 'Sent')}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--green)' }}>{detailsTarget.campaign?.sent || 0}</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--red)' }}>{t('فشل', 'Failed')}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--red)' }}>{detailsTarget.campaign?.failed || 0}</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--amber)' }}>{t('تخطي', 'Skipped')}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--amber)' }}>{detailsTarget.campaign?.skipped || 0}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setDetailsTarget(null)}>{t('إغلاق', 'Close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Campaign Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" style={{ maxWidth: '420px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{t('حذف الحملة', 'Delete Campaign')}</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text)' }}>
                {t('هل أنت متأكد من حذف هذه الحملة؟', 'Are you sure you want to delete this campaign?')}
              </p>
              <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'var(--bg3)', fontWeight: 700 }}>
                {deleteTarget.name}
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>{t('إلغاء', 'Cancel')}</button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--red)', color: '#fff' }}
                onClick={async () => {
                  await adminFetch(`/api/admin/outreach/campaigns/${deleteTarget.id}`, { method: 'DELETE' });
                  setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
                  setDeleteTarget(null);
                  setInfo(t('تم حذف الحملة', 'Campaign deleted'));
                }}
              >
                {t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
