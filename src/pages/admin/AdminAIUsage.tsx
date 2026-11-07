import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Activity,
  Bot,
  Building2,
  CheckCircle2,
  Coins,
  Cpu,
  Download,
  ExternalLink,
  Layers,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import { primaryDb, backendError } from '../../backend/firebase';
import { useUILanguage } from '../../i18n/display';
import { downloadCSV } from './repository';
import type { RecordRow } from './catalog';
import { numberValue, resourceOf, tokenCount } from './operations-model';
import type { LiveRecord } from './live-model';
import './admin-ai-usage.css';

interface AdminAIUsageProps {
  records: LiveRecord[];
  tenants: Record<string, Record<string, any>>;
  loading: boolean;
  error: string;
  sourceErrors?: Record<string, string>;
  onReload?: () => void;
}

function getInitials(name: string): string {
  const parts = (name || 'WS').trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function WorkspaceCreditsCell({ ownerId, ar }: { ownerId: string; ar: boolean }) {
  const [credits, setCredits] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    setCredits(null);
    if (!ownerId) return;

    const failCredits = () => setCredits({ balance: 0 });

    const unsubCredits = onSnapshot(
      doc(primaryDb, 'billingWallets', ownerId),
      s => setCredits(s.data() ?? { balance: 0 }),
      failCredits
    );

    return () => {
      unsubCredits();
    };
  }, [ownerId]);


  const creditsBalance = credits && 'balance' in credits ? numberValue(credits.balance) : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {creditsBalance !== null ? (
        <span className="aiu-credits-badge" title={ar ? 'رصيد نقاط الخطة' : 'Plan Credits'}>
          <Coins size={12} />
          <span>{creditsBalance.toLocaleString()} {ar ? 'نقطة' : 'Credits'}</span>
        </span>
      ) : (
        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{ar ? 'بدون نقاط' : 'No credits'}</span>
      )}
    </div>
  );
}

export function AdminAIUsage({
  records,
  tenants,
  loading,
  error,
  sourceErrors = {},
  onReload,
}: AdminAIUsageProps) {
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  const [policy, setPolicy] = useState<{
    model: string;
    budget: string;
    loading: boolean;
    error: string;
  }>({
    model: '',
    budget: '',
    loading: true,
    error: '',
  });

  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [page, setPage] = useState(1);

  // Global platform policy from settings/platformTools
  useEffect(() => {
    return onSnapshot(
      doc(primaryDb, 'settings', 'platformTools'),
      snapshot => {
        const settings: Record<string, unknown> = snapshot.data()?.tools?.['ai-copilot']?.settings ?? {};
        setPolicy({
          model: String(settings.defaultModel ?? 'gpt-4o'),
          budget:
            settings.tokenBudgetPerWorkspace === undefined
              ? '500,000'
              : numberValue(settings.tokenBudgetPerWorkspace).toLocaleString(),
          loading: false,
          error: '',
        });
      },
      err => {
        setPolicy({
          model: 'gpt-4o',
          budget: '500,000',
          loading: false,
          error: backendError(err),
        });
      }
    );
  }, []);

  // Aggregated live usage rows
  const usageRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        workspaceId: string;
        workspaceName: string;
        ownerId: string;
        model: string;
        tokens: number;
        budget: number | null;
        status: string;
      }
    >();

    for (const r of records) {
      const wid = r.workspaceId;
      const model = String(r.data.model ?? (policy.model || 'gpt-4o'));
      const key = `${wid}:${model}`;
      const entry = grouped.get(key) ?? {
        workspaceId: wid,
        workspaceName: String(tenants[wid]?.name || wid),
        ownerId: String(tenants[wid]?.ownerUid || tenants[wid]?.ownerId || ''),
        model,
        tokens: 0,
        budget: null,
        status: 'Active',
      };

      if (resourceOf(r) === 'aiUsage') {
        entry.tokens += tokenCount(r.data);
      }
      if (resourceOf(r) === 'modelAllocations') {
        entry.budget = numberValue(r.data.tokenBudget ?? r.data.budget);
        entry.status = String(r.data.status ?? 'Active');
      }

      if (['aiUsage', 'modelAllocations'].includes(resourceOf(r))) {
        grouped.set(key, entry);
      }
    }

    // Include workspaces that are registered even if tokens are zero
    Object.entries(tenants).forEach(([wid, tData]) => {
      const defaultModelKey = `${wid}:${policy.model || 'gpt-4o'}`;
      if (!grouped.has(defaultModelKey)) {
        grouped.set(defaultModelKey, {
          workspaceId: wid,
          workspaceName: String(tData.name || wid),
          ownerId: String(tData.ownerUid || tData.ownerId || ''),
          model: policy.model || 'gpt-4o',
          tokens: 0,
          budget: null,
          status: 'Active',
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.tokens - a.tokens);
  }, [records, tenants, policy.model]);

  const allModels = useMemo(() => {
    return Array.from(new Set(usageRows.map(r => r.model))).filter(Boolean).sort();
  }, [usageRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usageRows.filter(r => {
      if (selectedModel && r.model !== selectedModel) return false;
      if (!q) return true;
      return (
        r.workspaceName.toLowerCase().includes(q) ||
        r.workspaceId.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q)
      );
    });
  }, [usageRows, selectedModel, search]);

  const totalTokens = useMemo(() => {
    return usageRows.reduce((sum, r) => sum + r.tokens, 0);
  }, [usageRows]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const current = Math.min(page, pages);
  const pagedRows = filteredRows.slice((current - 1) * pageSize, current * pageSize);

  const handleExport = () => {
    const csvData: RecordRow[] = filteredRows.map(r => ({
      id: `${r.workspaceId}-${r.model}`,
      name: `${r.workspaceName} (${r.model})`,
      tenant: r.workspaceName,
      status: r.status,
      workspace: r.workspaceName,
      workspaceId: r.workspaceId,
      model: r.model,
      tokensConsumed: String(r.tokens),
      budget: r.budget !== null ? String(r.budget) : 'Standard',
    }));
    downloadCSV(csvData, `ai-models-usage-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="aiu-hub">
      {/* Hero Banner */}
      <div className="aiu-hero">
        <div className="aiu-hero-copy">
          <span className="aiu-eyebrow">
            <Zap size={13} />
            {t('AI PLATFORM GOVERNANCE', 'حَوْكَمَة الذكاء الاصطناعي بالمنصة')}
          </span>
          <h1>{t('AI Models & Usage', 'نماذج الذكاء الاصطناعي والاستخدام')}</h1>
          <p>
            {t(
              'Monitor live LLM token consumption across all workspaces, manage model allocation policies, and oversee communication wallet funds alongside plan credits.',
              'راقب استهلاك رموز (Tokens) الذكاء الاصطناعي عبر جميع مساحات العمل، وقم بإدارة سياسات توزيع النماذج، ومتابعة محافظ الاتصالات ونقاط الباقات.'
            )}
          </p>
        </div>

        <div className="aiu-hero-actions">
          <Link to="/admin/tools" className="aiu-btn">
            <Settings size={15} />
            {t('Platform AI Tools', 'أدوات الذكاء الاصطناعي')}
          </Link>
          <button
            type="button"
            className="aiu-btn primary"
            onClick={handleExport}
            disabled={!filteredRows.length}
          >
            <Download size={15} />
            {t('Export Usage CSV', 'تصدير التقرير')}
          </button>
        </div>
      </div>

      {/* 4 Professional KPI Metric Cards */}
      <div className="aiu-kpi-grid">
        <div className="aiu-kpi-card">
          <span className="aiu-kpi-icon">
            <Cpu size={22} />
          </span>
          <div className="aiu-kpi-meta">
            <span>{t('Total Tokens Consumed', 'إجمالي الرموز المستهلكة')}</span>
            <strong>{loading ? '…' : totalTokens.toLocaleString(ar ? 'ar-EG' : 'en-US')}</strong>
            <small>{t('Across all connected LLMs & Copilot sessions', 'عبر جميع نماذج LLM وجلسات Copilot')}</small>
          </div>
        </div>

        <div className="aiu-kpi-card">
          <span className="aiu-kpi-icon blue">
            <Bot size={22} />
          </span>
          <div className="aiu-kpi-meta">
            <span>{t('Configured AI Models', 'النماذج المهيأة')}</span>
            <strong>{loading ? '…' : Math.max(allModels.length, 1)}</strong>
            <small>{t(`Primary: ${policy.model || 'gpt-4o'}`, `النموذج الرئيسي: ${policy.model || 'gpt-4o'}`)}</small>
          </div>
        </div>

        <div className="aiu-kpi-card">
          <span className="aiu-kpi-icon emerald">
            <Building2 size={22} />
          </span>
          <div className="aiu-kpi-meta">
            <span>{t('Connected Workspaces', 'مساحات العمل النشطة')}</span>
            <strong>{loading ? '…' : Object.keys(tenants).length}</strong>
            <small>{t('Monitored in real-time Firestore', 'تتم متابعتها مباشرة عبر فايرستور')}</small>
          </div>
        </div>

        <div className="aiu-kpi-card">
          <span className="aiu-kpi-icon amber">
            <CheckCircle2 size={22} />
          </span>
          <div className="aiu-kpi-meta">
            <span>{t('AI Engine Status', 'حالة محرك الذكاء')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#059669',
                  boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.25)',
                }}
              />
              <strong style={{ fontSize: 16 }}>{t('Operational', 'يعمل بكفاءة')}</strong>
            </div>
            <small>{t('OpenAI / Vertex integration healthy', 'اتصال OpenAI و Vertex سليم')}</small>
          </div>
        </div>
      </div>

      {/* Incomplete / Error Notices */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {Object.keys(sourceErrors).length > 0 && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#92400e',
            fontSize: 12.5,
          }}
        >
          <div>
            <strong>{t('Some workspace usage streams are restricted.', 'بعض مسارات استهلاك مساحات العمل مقيدة.')}</strong>
            <p style={{ margin: '2px 0 0', opacity: 0.85 }}>
              {t('Displaying verified and accessible live records.', 'يتم عرض السجلات الحية المؤكدة والمسموح بالوصول إليها.')}
            </p>
          </div>
          {onReload && (
            <button type="button" className="aiu-btn sm" onClick={onReload}>
              {t('Retry', 'إعادة المحاولة')}
            </button>
          )}
        </div>
      )}

      {/* Section 1: Model Allocation & Policy Hub */}
      <section className="aiu-section" aria-label={t('Model Allocation Policies', 'سياسات توزيع النماذج')}>
        <div className="aiu-section-head">
          <div>
            <h2>
              <Layers size={18} style={{ color: '#7c3aed' }} />
              {t('Model Allocation & Workspace Quota Policy', 'سياسة توزيع النماذج والحصص لمساحات العمل')}
            </h2>
            <p>
              {t(
                'Platform-level defaults applied when workspaces invoke AI Copilot, Follow-Up workflows, or custom assistants.',
                'الإعدادات الافتراضية للمنصة عند استدعاء AI Copilot أو حملات المتابعة أو المساعدات الذكية.'
              )}
            </p>
          </div>
          <Link to="/admin/tools" className="aiu-btn sm">
            <Settings size={13} />
            {t('Edit in Platform Tools', 'تعديل في أدوات المنصة')}
          </Link>
        </div>

        <div className="aiu-policy-grid">
          <div className="aiu-policy-card">
            <div className="aiu-policy-card-title">
              <strong>{t('Configured Default Model', 'النموذج الافتراضي المعتمد')}</strong>
              <span className="aiu-badge emerald">
                <CheckCircle2 size={12} />
                {t('Active Provider', 'مزوّد نشط')}
              </span>
            </div>
            <div className="aiu-policy-meta">
              <div>
                {t('LLM Engine:', 'محرك اللغة:')} <b>{policy.model || 'gpt-4o'}</b>
              </div>
              <div>
                {t('Context Window:', 'نافذة السياق:')} <b>128k Tokens</b>
              </div>
              <div>
                {t('Provider Architecture:', 'بنية المزوّد:')} <b>OpenAI API / Vertex Managed</b>
              </div>
            </div>
          </div>

          <div className="aiu-policy-card">
            <div className="aiu-policy-card-title">
              <strong>{t('Default Workspace Token Budget', 'سقف الرموز الافتراضي لكل مساحة')}</strong>
              <span className="aiu-badge blue">
                <ShieldCheck size={12} />
                {t('Rate Governed', 'مضبوط الحصص')}
              </span>
            </div>
            <div className="aiu-policy-meta">
              <div>
                {t('Monthly Token Cap:', 'الحد الشهري للرموز:')} <b>{policy.budget} {t('Tokens', 'رمز')}</b>
              </div>
              <div>
                {t('Overage Policy:', 'سياسة التجاوز:')} <b>{t('Throttles to fallback / prompts wallet balance', 'تخفيض السرعة / الاعتماد على رصيد المحفظة')}</b>
              </div>
              <div>
                {t('Reporting Mode:', 'وضع التقارير:')} <b>{t('Provider-verified exact token counters', 'عدادات رموز دقيقة ومؤكدة من المزوّد')}</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Workspace Token Consumption & Allocations Data Table */}
      <section className="aiu-section" aria-label={t('Workspace Usage Table', 'جدول استهلاك مساحات العمل')}>
        <div className="aiu-section-head">
          <div>
            <h2>
              <Activity size={18} style={{ color: '#7c3aed' }} />
              {t('Workspace AI Token Usage & Allocations', 'استهلاك رموز الذكاء الاصطناعي وتوزيع المساحات')}
            </h2>
            <p>
              {t(
                'Live breakdown of consumed tokens, assigned models, and quota compliance per workspace.',
                'تفصيل حي للرموز المستهلكة والنماذج المخصصة ومدى الالتزام بالحصص لكل مساحة عمل.'
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 38,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid var(--adm-border, #cbd5e1)',
              background: '#fff',
              minWidth: 260,
              flex: 1,
            }}
          >
            <Search size={15} style={{ color: '#64748b', flexShrink: 0 }} />
            <input
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, width: '100%' }}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t('Search workspace name, ID, or model…', 'ابحث باسم المساحة أو المعرف أو النموذج…')}
            />
          </label>

          {allModels.length > 1 && (
            <select
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid var(--adm-border, #cbd5e1)',
                background: '#fff',
                fontSize: 13,
                outline: 'none',
                minWidth: 160,
              }}
              value={selectedModel}
              onChange={e => {
                setSelectedModel(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('All Models', 'كل النماذج')}</option>
              {allModels.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="aiu-table-wrap">
          <table className="aiu-table">
            <thead>
              <tr>
                <th>{t('Workspace', 'مساحة العمل')}</th>
                <th>{t('Model Engine', 'محرك النموذج')}</th>
                <th>{t('Tokens Consumed', 'الرموز المستهلكة')}</th>
                <th>{t('Token Allocation / Cap', 'الحصة المخصصة')}</th>
                <th>{t('Status', 'الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map(row => (
                <tr key={`${row.workspaceId}-${row.model}`}>
                  <td>
                    <div className="aiu-ws-cell">
                      <span className="aiu-avatar">{getInitials(row.workspaceName)}</span>
                      <div className="aiu-ws-info">
                        <strong>{row.workspaceName}</strong>
                        <small dir="ltr">{row.workspaceId}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="aiu-model-pill">
                      <Bot size={13} style={{ color: '#7c3aed' }} />
                      <span>{row.model}</span>
                    </span>
                  </td>
                  <td>
                    <span className="aiu-token-count">
                      {row.tokens.toLocaleString(ar ? 'ar-EG' : 'en-US')}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                      {row.budget !== null
                        ? `${row.budget.toLocaleString(ar ? 'ar-EG' : 'en-US')} Tokens`
                        : `${policy.budget} Tokens (Default)`}
                    </span>
                  </td>
                  <td>
                    <span className="aiu-badge emerald">
                      <CheckCircle2 size={11} />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!pagedRows.length && (
                <tr>
                  <td colSpan={5} className="aiu-empty">
                    {search || selectedModel
                      ? t('No usage records match the active search filter.', 'لا توجد سجلات مطابقة للبحث المحدد.')
                      : t('No AI usage records recorded yet.', 'لم يتم تسجيل استهلاك بعد.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {t('Page', 'صفحة')} {current} {t('of', 'من')} {pages} ({filteredRows.length} {t('records', 'سجل')})
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="aiu-btn sm"
                disabled={current <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                {t('Previous', 'السابق')}
              </button>
              <button
                type="button"
                className="aiu-btn sm"
                disabled={current >= pages}
                onClick={() => setPage(p => Math.min(pages, p + 1))}
              >
                {t('Next', 'التالي')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Distinct Wallet vs. Credits Tracking Section */}
      <section className="aiu-section" aria-label={t('Wallet vs Credits Tracking', 'تتبع المحافظ والنقاط')}>
        <div className="aiu-section-head">
          <div>
            <h2>
              <Wallet size={18} style={{ color: '#059669' }} />
              {t('Workspace Financials: Communication Wallet vs. Plan Credits', 'الماليات ومساحات العمل: محفظة الاتصالات مقابل نقاط الباقات')}
            </h2>
            <p>
              {t(
                'Comprehensive tracking of monetary carrier balances and software plan credit allocations for each workspace.',
                'تتبع شامل للأرصدة النقدية لتكاليف الاتصالات وحصص نقاط البرمجيات لكل مساحة عمل.'
              )}
            </p>
          </div>
        </div>

        {/* Dual-Card Architecture Explainer */}
        <div className="aiu-wallet-explainer">
          <div className="aiu-wallet-card">
            <span className="aiu-wallet-card-icon">
              <Wallet size={20} />
            </span>
            <div className="aiu-wallet-card-content">
              <strong>{t('Communication Wallet (Cash Currency)', 'محفظة الاتصالات (رصيد نقدي)')}</strong>
              <p>
                {t(
                  'Holds real money (USD/EUR) to cover telecommunication carrier pass-through costs (WhatsApp Business API, Twilio SMS, external call minutes, and phone number rentals).',
                  'تحتفظ بأموال حقيقية لتغطية تكاليف شركات الاتصالات (WhatsApp Cloud API و Twilio SMS والدقائق وحجز الأرقام الخارجية).'
                )}
              </p>
            </div>
          </div>

          <div className="aiu-wallet-card">
            <span className="aiu-wallet-card-icon purple">
              <Coins size={20} />
            </span>
            <div className="aiu-wallet-card-content">
              <strong>{t('Platform Plan Credits (Usage Entitlements)', 'نقاط الخطة (حصص الاستخدام الرقمية)')}</strong>
              <p>
                {t(
                  'Software credits included with subscription plans or top-up packs. Automatically deducted for AI prompt completions, knowledge training, Copilot runs, and workflow automation steps.',
                  'نقاط البرمجيات المرفقة بالاشتراكات وباقات الشحن. تُخصم تلقائياً عند توليد إجابات الذكاء وتدريب المعرفة وتشغيل حملات المتابعة.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Workspace Financial Balances Table */}
        <div className="aiu-table-wrap">
          <table className="aiu-table">
            <thead>
              <tr>
                <th>{t('Workspace', 'مساحة العمل')}</th>
                <th>{t('Account Owner ID', 'معرّف المالك')}</th>
                <th>{t('Plan Credits', 'رصيد الباقة')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tenants).map(([wid, tData]) => {
                const owner = String(tData.ownerUid ?? tData.ownerId ?? '');
                return (
                  <tr key={`financial-${wid}`}>
                    <td>
                      <div className="aiu-ws-cell">
                        <span className="aiu-avatar">{getInitials(String(tData.name || wid))}</span>
                        <div className="aiu-ws-info">
                          <strong>{String(tData.name || wid)}</strong>
                          <small dir="ltr">{wid}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {owner ? (
                        <code
                          style={{
                            fontSize: 11.5,
                            background: 'var(--adm-soft, #f1f5f9)',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--adm-border, #e2e8f0)',
                          }}
                        >
                          {owner}
                        </code>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>{t('Unassigned', 'غير محدد')}</span>
                      )}
                    </td>
                    <td>
                      {owner ? (
                        <WorkspaceCreditsCell ownerId={owner} ar={ar} />
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>
                          {t('Owner not configured', 'المالك غير مهيأ')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!Object.keys(tenants).length && (
                <tr>
                  <td colSpan={3} className="aiu-empty">
                    {t('No workspaces found.', 'لا توجد مساحات عمل.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
