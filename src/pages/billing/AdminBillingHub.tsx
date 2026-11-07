import React, { useMemo, useState } from 'react';
import { 
  Wallet, TrendingUp, DollarSign, ArrowUpRight, ArrowDownLeft, 
  CheckCircle2, XCircle, Clock, ShieldCheck, Tag, Plus, 
  Filter, Search, Download, ZoomIn, Eye, Sparkles, AlertCircle,
  MessageCircle, Mail, Phone, ExternalLink, Calendar, Check, X,
  Layers, Percent, Gift, ChevronDown, RefreshCw, Users, Wand2, Ticket, Copy
} from 'lucide-react';
import { 
  billing, 
  PLATFORM, 
  WALLET_CURRENCY, 
  useBillingIdentity, 
  useRequests, 
  useProviderCoupons, 
  useWalletAnalytics, 
  type BillingCoupon, 
  type BillingRequest, 
  type CouponScope, 
  type CouponType, 
  type WalletLedgerRow,
  type WalletAnalyticsReport 
} from '../../backend/billing';
import { Modal, Spinner, downloadCsv, useAction, useCopy, initials } from './ui';
import { Select } from '../../components/ui/Select';
import { getRawReceiptUrl, getReceiptFileName } from './ProviderPanels';
import { ManagedMetaWalletPanel } from '../settings/MetaWalletPanel';
import { showToast } from '../../utils/toast';

interface AdminBillingHubProps {
  ownerId: string;
  isPlatform?: boolean;
}

const CHANNEL_ICONS: Record<string, any> = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: Phone,
  instagram: MessageCircle,
  messenger: MessageCircle,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  email: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
  sms: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  instagram: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  messenger: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
};

export function AdminBillingHub({ ownerId, isPlatform = false }: AdminBillingHubProps) {
  const c = useCopy();
  const { busy, run } = useAction();
  const identity = useBillingIdentity();

  // Active Hub Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<'meta' | 'analytics' | 'pending' | 'ledger' | 'coupons'>('meta');
  
  // Analytics timeframe
  const [days, setDays] = useState<number>(30);
  const [analyticsRevision, setAnalyticsRevision] = useState<number>(0);

  // Fetch live aggregated analytics
  const { data: analytics, loading: analyticsLoading } = useWalletAnalytics(days, analyticsRevision);

  // Fetch billing requests for top-up reviews
  const { data: allRequests, loading: requestsLoading } = useRequests('providerId', ownerId);
  const topupRequests = useMemo(() => {
    return allRequests.filter(r => r.type === 'wallet_topup');
  }, [allRequests]);
  const pendingTopups = useMemo(() => {
    return topupRequests.filter(r => r.status === 'pending');
  }, [topupRequests]);

  // Fetch provider coupons
  const { data: coupons, loading: couponsLoading } = useProviderCoupons(ownerId);

  // Lightbox Zoom State
  const [zoomReceipt, setZoomReceipt] = useState<{ url: string; name?: string } | null>(null);

  // Reject Request Modal State
  const [rejectingRequest, setRejectingRequest] = useState<BillingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Create Coupon Modal State
  const [isCreateCouponOpen, setIsCreateCouponOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<CouponType>('percent');
  const [newCouponValue, setNewCouponValue] = useState<string>('15');
  const [newCouponScopes, setNewCouponScopes] = useState<CouponScope[]>(['wallet_topup', 'plan']);
  const [newCouponMaxRedemptions, setNewCouponMaxRedemptions] = useState<string>('50');
  const [newCouponExpiry, setNewCouponExpiry] = useState<string>('');
  const [newCouponDescription, setNewCouponDescription] = useState<string>('');
  const [couponFormError, setCouponFormError] = useState<string | null>(null);

  // Auto-generator helper
  const generateCouponCode = (type: CouponType = newCouponType, valStr = newCouponValue): string => {
    const num = parseInt(valStr) || (type === 'percent' ? 15 : type === 'fixed' ? 10 : 25);
    const prefixes = type === 'credit_bonus' 
      ? ['BONUS', 'EXTRA', 'PLUS', 'GIFT'] 
      : type === 'fixed' 
      ? ['OFF', 'SAVE', 'CASH', 'DEAL'] 
      : ['SAVE', 'PROMO', 'DEAL', 'GOS'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${num}-${randomSuffix}`;
  };

  const openCreateCouponModal = () => {
    const generated = generateCouponCode('percent', '15');
    setNewCouponCode(generated);
    setNewCouponType('percent');
    setNewCouponValue('15');
    setNewCouponScopes(['wallet_topup', 'plan']);
    setNewCouponMaxRedemptions('50');
    setNewCouponExpiry('');
    setNewCouponDescription('');
    setCouponFormError(null);
    setIsCreateCouponOpen(true);
  };

  // View Coupon Details Modal State
  const [viewingCoupon, setViewingCoupon] = useState<BillingCoupon | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);

  // Compute coupon redemptions, unique users, and financial impact
  const viewingCouponRedemptions = useMemo(() => {
    if (!viewingCoupon) return [];
    return allRequests.filter(r => 
      r.coupon?.id === viewingCoupon.id || 
      (r.coupon?.code && r.coupon.code.toUpperCase() === viewingCoupon.code.toUpperCase())
    );
  }, [allRequests, viewingCoupon]);

  const uniqueUsersCount = useMemo(() => {
    if (!viewingCoupon) return 0;
    const users = new Set(viewingCouponRedemptions.map(r => r.requesterId || (r as any).account_id || (r as any).accountId || r.id));
    return users.size || viewingCoupon.redemptions || 0;
  }, [viewingCoupon, viewingCouponRedemptions]);

  const totalCouponSavings = useMemo(() => {
    if (!viewingCoupon) return 0;
    return viewingCouponRedemptions.reduce((acc, r) => {
      const discount = r.coupon?.discount || (r as any).discountAmount || 0;
      return acc + (Number.isFinite(discount) ? discount : 0);
    }, 0);
  }, [viewingCoupon, viewingCouponRedemptions]);

  const totalCouponBonus = useMemo(() => {
    if (!viewingCoupon) return 0;
    return viewingCouponRedemptions.reduce((acc, r) => {
      const bonus = r.coupon?.bonus || 0;
      return acc + (Number.isFinite(bonus) ? bonus : 0);
    }, 0);
  }, [viewingCoupon, viewingCouponRedemptions]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponCode(code);
    showToast.success(c.t('Coupon code copied to clipboard!', 'تم نسخ كود الخصم إلى الحافظة!'));
    setTimeout(() => setCopiedCouponCode(null), 2000);
  };

  // Ledger Filter State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerChannelFilter, setLedgerChannelFilter] = useState('all');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');

  // Handle Approve Top-up
  const handleApproveTopup = async (req: BillingRequest) => {
    await run(`approve_${req.id}`, async () => {
      await billing('decideRequest', { requestId: req.id, decision: 'approve' });
      setAnalyticsRevision(r => r + 1);
    }, c.t('Top-up approved and credited to wallet.', 'تمت الموافقة على الشحن وإضافة الرصيد للمحفظة.'));
  };

  // Handle Reject Top-up
  const handleConfirmRejectTopup = async () => {
    if (!rejectingRequest) return;
    await run(`reject_${rejectingRequest.id}`, async () => {
      await billing('decideRequest', { 
        requestId: rejectingRequest.id, 
        decision: 'reject',
        reason: rejectReason.trim() || c.t('Payment verification failed', 'تعذر التحقق من الدفع') 
      });
      setRejectingRequest(null);
      setRejectReason('');
      setAnalyticsRevision(r => r + 1);
    }, c.t('Request rejected.', 'تم رفض الطلب.'));
  };

  // Handle Coupon Toggle Active
  const handleToggleCoupon = async (coupon: BillingCoupon) => {
    await run(`coupon_toggle_${coupon.id}`, async () => {
      await billing('setCouponActive', { couponId: coupon.id, active: !coupon.active });
    });
  };

  // Handle Archive Coupon
  const handleArchiveCoupon = async (coupon: BillingCoupon) => {
    if (!confirm(c.t('Are you sure you want to archive this coupon?', 'هل أنت متأكد من أرشفة هذا الكوبون؟'))) return;
    await run(`coupon_archive_${coupon.id}`, async () => {
      await billing('archiveCoupon', { couponId: coupon.id });
    }, c.t('Coupon archived.', 'تم أرشفة الكوبون بنجاح.'));
  };

  // Handle Save New Coupon
  const handleSaveNewCoupon = async () => {
    const code = newCouponCode.trim().toUpperCase();
    const val = parseFloat(newCouponValue);
    if (!code) {
      setCouponFormError(c.t('Please enter or auto-generate a valid coupon code.', 'يرجى إدخال أو توليد كود خصم صالح.'));
      return;
    }
    if (!Number.isFinite(val) || val <= 0) {
      setCouponFormError(c.t('Please enter a positive value for the coupon.', 'يرجى إدخال قيمة موجبة للخصم.'));
      return;
    }
    if (newCouponType === 'percent' && val > 100) {
      setCouponFormError(c.t('Percentage discount cannot exceed 100%.', 'لا يمكن أن تتجاوز نسبة الخصم 100%.'));
      return;
    }
    if (newCouponScopes.length === 0) {
      setCouponFormError(c.t('Please select at least one scope (Wallet, Plan, or Add-on).', 'يرجى اختيار نطاق واحد على الأقل للكوبون.'));
      return;
    }
    setCouponFormError(null);

    await run('save_coupon', async () => {
      const couponPayload = {
        code,
        type: newCouponType,
        value: val,
        currency: 'EUR',
        appliesTo: newCouponScopes,
        maxRedemptions: parseInt(newCouponMaxRedemptions) || 100,
        perUserLimit: 1,
        expiresAt: newCouponExpiry ? new Date(newCouponExpiry).toISOString() : null,
        description: newCouponDescription.trim(),
        active: true,
      };

      await billing('saveCoupon', {
        coupon: couponPayload,
        ...couponPayload,
      });
      setIsCreateCouponOpen(false);
      setNewCouponCode('');
      setNewCouponValue('15');
      setNewCouponDescription('');
      setCouponFormError(null);
    }, c.t('Coupon created successfully.', 'تم إنشاء كود الخصم بنجاح.'));
  };

  // Filtered Ledger Rows
  const filteredLedgerEntries = useMemo(() => {
    const list = analytics?.entries || [];
    return list.filter(row => {
      if (ledgerChannelFilter !== 'all' && (row.channel || 'other') !== ledgerChannelFilter) return false;
      if (ledgerTypeFilter !== 'all') {
        if (ledgerTypeFilter === 'topup' && row.usage_type !== 'wallet_topup') return false;
        if (ledgerTypeFilter === 'usage' && row.usage_type === 'wallet_topup') return false;
      }
      if (ledgerSearch.trim()) {
        const query = ledgerSearch.toLowerCase();
        const match = `${row.id} ${row.description} ${row.channel ?? ''}`.toLowerCase();
        if (!match.includes(query)) return false;
      }
      return true;
    });
  }, [analytics?.entries, ledgerChannelFilter, ledgerTypeFilter, ledgerSearch]);

  // Export Ledger to CSV
  const handleExportCsv = () => {
    if (!filteredLedgerEntries.length) return;
    const headers = ['ID', 'Date', 'Type', 'Channel', 'Customer Charge (€)', 'Provider Cost (€)', 'Margin (€)', 'Status'];
    const rows = filteredLedgerEntries.map(e => [
      e.id,
      new Date(e.created_at).toLocaleString(),
      e.usage_type,
      e.channel || '—',
      (e.customer_charge ?? 0).toFixed(4),
      (e.provider_cost ?? 0).toFixed(4),
      (e.margin ?? 0).toFixed(4),
      e.status
    ]);
    downloadCsv(`wallet_ledger_${Date.now()}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Subtab Navigation Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('meta')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'meta'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageCircle size={15} />
            <span>{c.t('Meta Connections', 'اتصالات Meta')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp size={15} />
            <span>{c.t('Overview & Usage Analytics', 'نظرة عامة وإحصائيات الاستهلاك')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === 'pending'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock size={15} />
            <span>{c.t('Pending Top-Up Requests', 'طلبات الشحن المعلقة')}</span>
            {pendingTopups.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white">
                {pendingTopups.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'ledger'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowDownLeft size={15} />
            <span>{c.t('Transactions & Audit Ledger', 'سجل العمليات والتدقيق المالي')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('coupons')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'coupons'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Tag size={15} />
            <span>{c.t('Coupons & Promo Codes', 'أكواد الخصم والترويج')}</span>
          </button>
        </div>

        {/* Timeframe Dropdown (Active on Analytics & Ledger) */}
        {(activeSubTab === 'analytics' || activeSubTab === 'ledger') && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">{c.t('Period:', 'الفترة:')}</span>
            <Select
              value={String(days)}
              onChange={val => setDays(Number(val))}
              options={[
                { value: '7', label: c.t('Last 7 Days', 'آخر ٧ أيام') },
                { value: '30', label: c.t('Last 30 Days', 'آخر ٣٠ يومًا') },
                { value: '90', label: c.t('Last 90 Days', 'آخر ٩٠ يومًا') },
                { value: '365', label: c.t('All Time (1 Year)', 'سنة كاملة') },
              ]}
            />
          </div>
        )}
      </div>

      {activeSubTab === 'meta' && <ManagedMetaWalletPanel/>}

      {/* Subtab 1: Analytics & Overview */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer Volume */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {c.t('Customer Volume', 'حجم استهلاك العملاء')}
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                  <DollarSign size={17} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                €{analytics?.summary ? analytics.summary.total_customer_charge.toFixed(2) : '0.00'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {c.t('Total billed for carrier communications', 'إجمالي الرسوم المحصلة مقابل الرسائل')}
              </p>
            </div>

            {/* Carrier Provider Cost */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {c.t('Provider Carrier Cost', 'تكلفة المزود الحقيقية')}
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <ArrowUpRight size={17} />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                €{analytics?.summary ? analytics.summary.total_provider_cost.toFixed(2) : '0.00'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {c.t('Direct costs paid to Meta, Twilio, gateways', 'التكلفة المدفوعة مباشرة لـ Meta وTwilio')}
              </p>
            </div>

            {/* Platform Gross Margin */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {c.t('Platform Net Margin', 'صافي هامش الربح')}
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={17} />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                €{analytics?.summary ? analytics.summary.total_margin.toFixed(2) : '0.00'}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  +{analytics?.summary ? analytics.summary.margin_percentage : 0}% {c.t('margin', 'هامش')}
                </span>
                <span className="text-[11px] text-slate-500">{c.t('retained profit', 'أرباح المنصة')}</span>
              </div>
            </div>

            {/* Top-Up Volume & Wallets */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {c.t('Active Wallets & Top-ups', 'المحافظ النشطة والشحن')}
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                  <Wallet size={17} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                €{analytics?.summary ? analytics.summary.total_topups.toFixed(2) : '0.00'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {analytics?.summary?.active_accounts_count ?? 0} {c.t('active accounts', 'حسابات نشطة')} · {analytics?.summary?.total_messages ?? 0} {c.t('messages', 'رسالة')}
              </p>
            </div>
          </div>

          {/* Channel Performance Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Layers size={17} className="text-purple-600" />
                {c.t('Carrier Usage Breakdown by Channel', 'توزيع الاستهلاك حسب شبكات الاتصال')}
              </h3>

              <div className="space-y-4">
                {(analytics?.by_channel || []).map(ch => {
                  const Icon = CHANNEL_ICONS[ch.channel] || MessageCircle;
                  const colorClass = CHANNEL_COLORS[ch.channel] || 'text-slate-500 bg-slate-500/10 border-slate-500/20';
                  return (
                    <div key={ch.channel} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colorClass}`}>
                            <Icon size={16} />
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">
                              {ch.channel}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {ch.count.toLocaleString()} {c.t('messages delivered', 'رسالة تم إرسالها')}
                            </div>
                          </div>
                        </div>

                        <div className="text-end">
                          <div className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                            €{ch.customer_charge.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-emerald-600 font-semibold font-mono">
                            +€{ch.margin.toFixed(2)} ({ch.margin_percentage}%)
                          </div>
                        </div>
                      </div>

                      {/* Visual comparison bar: Cost vs Margin */}
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="bg-rose-500"
                          style={{ width: `${ch.customer_charge > 0 ? (ch.provider_cost / ch.customer_charge) * 100 : 0}%` }}
                          title={`Cost: €${ch.provider_cost.toFixed(2)}`}
                        />
                        <div
                          className="bg-emerald-500"
                          style={{ width: `${ch.customer_charge > 0 ? (ch.margin / ch.customer_charge) * 100 : 0}%` }}
                          title={`Margin: €${ch.margin.toFixed(2)}`}
                        />
                      </div>
                    </div>
                  );
                })}

                {(!analytics?.by_channel || analytics.by_channel.length === 0) && (
                  <p className="text-xs text-slate-500 text-center py-6">
                    {c.t('No carrier communication activity in this time range.', 'لا يوجد استهلاك شبكات اتصال في هذه الفترة.')}
                  </p>
                )}
              </div>
            </div>

            {/* Top Accounts / Tenants Table */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Users size={17} className="text-purple-600" />
                {c.t('Tenants & Accounts Communication Volume', 'استهلاك المستأجرين والعملاء')}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="pb-2.5 text-start font-bold uppercase">{c.t('Account ID', 'الحساب')}</th>
                      <th className="pb-2.5 text-center font-bold uppercase">{c.t('Messages', 'الرسائل')}</th>
                      <th className="pb-2.5 text-end font-bold uppercase">{c.t('Billed', 'المفوتر')}</th>
                      <th className="pb-2.5 text-end font-bold uppercase">{c.t('Margin', 'الربح')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(analytics?.accounts || []).slice(0, 8).map(acc => (
                      <tr key={acc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono text-slate-800 dark:text-slate-200">
                          {acc.name || (acc.id.length > 14 ? `${acc.id.slice(0, 12)}…` : acc.id)}
                        </td>
                        <td className="py-2.5 text-center font-semibold text-slate-600 dark:text-slate-400">
                          {(acc.messages_count ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-end font-mono font-bold text-slate-900 dark:text-slate-100">
                          €{(acc.total_spend ?? 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +€{(acc.margin ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {(!analytics?.accounts || analytics.accounts.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
                          {c.t('No accounts have used carrier communications yet.', 'لم يتم تسجيل استهلاك لأي حساب بعد.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Pending Top-Up Requests */}
      {activeSubTab === 'pending' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock size={17} className="text-amber-500" />
                {c.t('Pending Wallet Top-Up Requests', 'طلبات شحن المحفظة المعلقة')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.t('Verify bank transfer receipts and credit carrier funds to client wallets.', 'راجع إيصالات التحويل البنكي واعتمد إضافة الرصيد إلى محافظ العملاء.')}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {pendingTopups.length} {c.t('Awaiting Review', 'بانتظار المراجعة')}
            </span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {pendingTopups.map(req => {
              const receiptUrl = getRawReceiptUrl(req);
              const receiptName = getReceiptFileName(req);
              return (
                <div key={req.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {receiptUrl ? (
                      <div
                        onClick={() => setZoomReceipt({ url: receiptUrl, name: receiptName })}
                        className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 cursor-pointer relative group"
                        title={c.t('Click to zoom receipt', 'انقر لتكبير الإيصال')}
                      >
                        <img src={receiptUrl} alt="Receipt" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ZoomIn size={16} />
                        </div>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                        <Wallet size={20} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {req.requesterEmail || req.requesterId}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                          {req.paymentMethod || 'Manual'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span>{c.t('Date:', 'التاريخ:')} {new Date(req.createdAt).toLocaleDateString()}</span>
                        {req.transactionId && (
                          <span className="font-mono">{c.t('Ref:', 'رقم الحوالة:')} {req.transactionId}</span>
                        )}
                        {req.coupon && (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Tag size={11} />
                            {req.coupon.code}
                          </span>
                        )}
                      </div>

                      {req.note && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic">
                          "{req.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financial Values & Actions */}
                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-end">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                        €{((req as any).price ?? req.totalAmount ?? 0).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold font-mono">
                        {c.t('Credits:', 'الرصيد:')} €{(req.creditAmount ?? (req as any).credits ?? req.totalAmount ?? 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveTopup(req)}
                        disabled={busy === `approve_${req.id}`}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        {busy === `approve_${req.id}` ? <Spinner size={13} /> : <CheckCircle2 size={14} />}
                        <span>{c.t('Approve', 'موافقة')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRejectingRequest(req)}
                        disabled={busy === `approve_${req.id}`}
                        className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-colors"
                      >
                        {c.t('Reject', 'رفض')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {pendingTopups.length === 0 && (
              <div className="text-center py-10">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {c.t('No pending top-up requests at this time.', 'لا توجد طلبات شحن معلقة حاليًا.')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: Audit Ledger & Logs */}
      {activeSubTab === 'ledger' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowDownLeft size={17} className="text-purple-600" />
                {c.t('Communication Dual-Cost Ledger & Audit Logs', 'سجل الرصيد والتدقيق المالي لقنوات التواصل')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.t('Full audit trail tracking carrier provider costs, customer charges, and profit margins.', 'سجل تدقيق كامل يوضح تكلفة شبكات الاتصال، والرسوم على العميل، وصافي الربح.')}
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredLedgerEntries.length === 0}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} />
              <span>{c.t('Export to CSV', 'تصدير كملف CSV')}</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute inset-y-0 start-3 my-auto text-slate-400" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                placeholder={c.t('Search ledger entries…', 'بحث في العمليات…')}
                className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
            </div>

            <Select
              value={ledgerChannelFilter}
              onChange={val => setLedgerChannelFilter(val)}
              options={[
                { value: 'all', label: c.t('All Channels', 'جميع القنوات') },
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'sms', label: 'SMS' },
                { value: 'email', label: 'Email' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'messenger', label: 'Messenger' },
              ]}
            />

            <Select
              value={ledgerTypeFilter}
              onChange={val => setLedgerTypeFilter(val)}
              options={[
                { value: 'all', label: c.t('All Entry Types', 'جميع العمليات') },
                { value: 'topup', label: c.t('Top-Ups Only', 'عمليات الشحن فقط') },
                { value: 'usage', label: c.t('Message Usage Only', 'استهلاك الرسائل فقط') },
              ]}
            />
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="pb-2.5 text-start font-bold uppercase">{c.t('Date & Time', 'التاريخ والوقت')}</th>
                  <th className="pb-2.5 text-start font-bold uppercase">{c.t('Description', 'الوصف')}</th>
                  <th className="pb-2.5 text-start font-bold uppercase">{c.t('Channel', 'القناة')}</th>
                  <th className="pb-2.5 text-end font-bold uppercase">{c.t('Customer Charge', 'رسوم العميل')}</th>
                  <th className="pb-2.5 text-end font-bold uppercase">{c.t('Provider Cost', 'تكلفة المزود')}</th>
                  <th className="pb-2.5 text-end font-bold uppercase">{c.t('Net Margin', 'صافي الربح')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {filteredLedgerEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-sans text-slate-600 dark:text-slate-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 font-sans text-slate-800 dark:text-slate-200 max-w-[220px] truncate">
                      {entry.description || entry.usage_type}
                    </td>
                    <td className="py-2.5 uppercase font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {entry.channel || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 text-end font-bold text-slate-900 dark:text-slate-100">
                      €{(entry.customer_charge ?? 0).toFixed(4)}
                    </td>
                    <td className="py-2.5 text-end text-rose-600 dark:text-rose-400">
                      €{(entry.provider_cost ?? 0).toFixed(4)}
                    </td>
                    <td className="py-2.5 text-end font-bold text-emerald-600 dark:text-emerald-400">
                      +€{(entry.margin ?? 0).toFixed(4)}
                    </td>
                  </tr>
                ))}
                {filteredLedgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      {c.t('No transactions found matching your filters.', 'لا توجد عمليات تطابق خيارات التصفية.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 4: Coupons Management */}
      {activeSubTab === 'coupons' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Tag size={17} className="text-purple-600" />
                {c.t('Coupon & Promo Code Management', 'إدارة كوبونات الخصم والعروض')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.t('Create discounts and credit bonuses for wallet top-ups and subscriptions.', 'أنشئ خصومات ونسب تخفيض أو رصيدًا إضافيًا عند شحن المحفظة أو الاشتراك في الباقات.')}
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateCouponModal}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>{c.t('Create Coupon Code', 'إنشاء كود خصم جديد')}</span>
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {coupons.map(cpn => {
              const uses = cpn.redemptions ?? 0;
              const maxUses = cpn.maxRedemptions || 100;
              const pct = Math.min(100, Math.round((uses / maxUses) * 100));

              return (
                <div key={cpn.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(cpn.code)}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 font-mono font-bold text-sm text-purple-700 dark:text-purple-300 transition-all flex items-center gap-1.5 group cursor-pointer"
                        title={c.t('Click to copy coupon code', 'انقر لنسخ كود الخصم')}
                      >
                        <span>{cpn.code}</span>
                        {copiedCouponCode === cpn.code ? (
                          <Check size={13} className="text-emerald-500 animate-in zoom-in-50" />
                        ) : (
                          <Copy size={13} className="text-purple-400 group-hover:text-purple-600 dark:text-purple-400 transition-colors" />
                        )}
                      </button>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {cpn.type === 'percent' ? `${cpn.value}% OFF` : cpn.type === 'fixed' ? `€${cpn.value} OFF` : `+€${cpn.value} BONUS`}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cpn.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {cpn.active ? c.t('Active', 'مفعل') : c.t('Paused', 'متوقف')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{c.t('Scope:', 'النطاق:')} {cpn.appliesTo?.join(', ') || 'all'}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {c.t('Uses:', 'الاستخدام:')} {uses} / {maxUses} ({pct}%)
                      </span>
                      {cpn.expiresAt && (
                        <>
                          <span>·</span>
                          <span>{c.t('Expires:', 'ينتهي:')} {new Date(cpn.expiresAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>

                    {/* Mini visual usage bar */}
                    <div className="w-full max-w-xs h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-amber-500' : 'bg-purple-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {cpn.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{cpn.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(cpn.code)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                      title={c.t('Copy coupon code', 'نسخ كود الخصم')}
                    >
                      {copiedCouponCode === cpn.code ? (
                        <>
                          <Check size={13} className="text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{c.t('Copied!', 'تم النسخ!')}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} className="text-slate-500 dark:text-slate-400" />
                          <span>{c.t('Copy', 'نسخ')}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewingCoupon(cpn)}
                      className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
                      title={c.t('View coupon statistics & user redemptions', 'عرض تفاصيل الكوبون واستخدامات العملاء')}
                    >
                      <Eye size={13} />
                      <span>{c.t('View Details', 'عرض التفاصيل')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleCoupon(cpn)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {cpn.active ? c.t('Deactivate', 'تعطيل') : c.t('Activate', 'تفعيل')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleArchiveCoupon(cpn)}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      {c.t('Archive', 'أرشفة')}
                    </button>
                  </div>
                </div>
              );
            })}

            {coupons.length === 0 && (
              <div className="text-center py-10 space-y-3">
                <Tag size={32} className="mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {c.t('No coupon codes created yet.', 'لم يتم إنشاء أي أكواد خصم بعد.')}
                </p>
                <button
                  type="button"
                  onClick={openCreateCouponModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 transition-colors"
                >
                  <Plus size={13} />
                  <span>{c.t('Create First Coupon', 'إنشاء أول كود خصم')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Zoom Receipt Modal */}
      {zoomReceipt && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomReceipt(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={zoomReceipt.url}
              alt="Receipt preview zoomed"
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setZoomReceipt(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-lg"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Reject Request Reason Modal */}
      {rejectingRequest && (
        <Modal
          title={c.t('Reject Top-Up Request', 'رفض طلب شحن الرصيد')}
          onClose={() => setRejectingRequest(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="bl-btn" onClick={() => setRejectingRequest(null)}>
                {c.t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                className="bl-btn danger"
                onClick={handleConfirmRejectTopup}
                disabled={busy === `reject_${rejectingRequest.id}`}
              >
                {busy === `reject_${rejectingRequest.id}` ? <Spinner size={14} /> : c.t('Confirm Rejection', 'تأكيد الرفض')}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {c.t(
                'Rejecting this request will release any associated coupon redemption and notify the customer.',
                'سيؤدي رفض هذا الطلب إلى إلغاء حجز كود الخصم وإشعار العميل بسبب الرفض.'
              )}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {c.t('Reason for Rejection (Optional)', 'سبب الرفض (اختياري)')}
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder={c.t('e.g. Unclear receipt, incorrect amount…', 'مثال: الإيصال غير واضح، المبلغ غير مطابق…')}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Create Coupon Modal */}
      {isCreateCouponOpen && (
        <Modal
          wide={true}
          title={c.t('Create New Promo Coupon', 'إنشاء كود خصم وترويج جديد')}
          subtitle={c.t('Generate custom vouchers and incentives for communication wallets and subscriptions.', 'أنشئ كوبونات ترويجية وحوافز لشحن محفظة الاتصالات والاشتراكات.')}
          icon={<Tag size={18} className="text-purple-600" />}
          onClose={() => {
            setIsCreateCouponOpen(false);
            setCouponFormError(null);
          }}
          footer={
            <div className="flex items-center justify-between w-full gap-3">
              <p className="text-xs text-slate-500 hidden sm:block">
                {c.t('Coupon will be active and redeemable immediately after publishing.', 'سيكون الكود متاحًا وقابلاً للاستخدام فور الحفظ والنشر.')}
              </p>
              <div className="flex items-center gap-2.5 ms-auto">
                <button 
                  type="button" 
                  className="bl-btn" 
                  onClick={() => {
                    setIsCreateCouponOpen(false);
                    setCouponFormError(null);
                  }}
                >
                  {c.t('Cancel', 'إلغاء')}
                </button>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                  onClick={handleSaveNewCoupon}
                  disabled={busy === 'save_coupon'}
                >
                  {busy === 'save_coupon' ? (
                    <>
                      <Spinner size={14} />
                      <span>{c.t('Publishing...', 'جارٍ النشر...')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{c.t('Save & Publish Coupon', 'حفظ ونشر الكود')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Inline Form Error Notification */}
            {couponFormError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs shadow-xs animate-in fade-in duration-200">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="flex-1 font-semibold leading-relaxed">
                  {couponFormError}
                </div>
                <button
                  type="button"
                  onClick={() => setCouponFormError(null)}
                  className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 font-bold p-0.5"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Live Voucher / Ticket Card Preview */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 p-5 text-white shadow-xl border border-purple-500/30">
              {/* Decorative ticket notch circles */}
              <div className="hidden sm:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-purple-500/40 z-10" />
              <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-purple-500/40 z-10" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {/* Left: Voucher details */}
                <div className="sm:col-span-2 space-y-2 border-b sm:border-b-0 sm:border-e border-dashed border-white/15 pb-4 sm:pb-0 sm:pe-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-500/30 text-purple-200 border border-purple-400/30">
                      <Sparkles size={11} className="text-amber-400" />
                      {c.t('Live Ticket Preview', 'معاينة تذكرة الكوبون')}
                    </span>
                    <span className="text-[11px] text-purple-200/70 font-medium">
                      {newCouponType === 'percent' 
                        ? c.t('Percentage Discount', 'خصم مئوي') 
                        : newCouponType === 'fixed' 
                        ? c.t('Fixed Deduction', 'خصم نقدي مباشر') 
                        : c.t('Credit Top-up Bonus', 'رصيد إضافي هدية')}
                    </span>
                  </div>

                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
                    {newCouponType === 'percent' && `${newCouponValue || '0'}% OFF`}
                    {newCouponType === 'fixed' && `€${newCouponValue || '0'} OFF`}
                    {newCouponType === 'credit_bonus' && `+€${newCouponValue || '0'} BONUS`}
                    <span className="text-xs font-normal text-purple-200/80">
                      {newCouponType === 'credit_bonus' 
                        ? c.t('free credits on top-up', 'رصيد مجاني يُضاف للمحفظة') 
                        : c.t('applied at checkout', 'تُخصم عند الدفع')}
                    </span>
                  </div>

                  <p className="text-xs text-purple-100/80 line-clamp-1">
                    {newCouponDescription.trim() || c.t('Special promo code for GOS accounts and campaigns', 'كود ترويجي مخصص لعملاء منصة GOS')}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {newCouponScopes.map(scope => (
                      <span key={scope} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-white/90 border border-white/10">
                        {scope === 'wallet_topup' ? c.t('Wallet Top-Up', 'شحن المحفظة') : scope === 'plan' ? c.t('Plans', 'الباقات') : c.t('Add-ons', 'الإضافات')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: Tear-off Stub */}
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-purple-200/60">
                    {c.t('Code Voucher', 'كوبون الخصم')}
                  </span>
                  <div className="w-full py-2 px-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 font-mono font-extrabold text-sm sm:text-base tracking-widest text-amber-300 select-all shadow-inner">
                    {newCouponCode || 'COUPON-CODE'}
                  </div>
                  <div className="text-[10px] text-purple-200/70 space-y-0.5">
                    <div>{c.t('Limit:', 'الحد:')} {newCouponMaxRedemptions || '∞'} {c.t('redemptions', 'استخدام')}</div>
                    <div>
                      {newCouponExpiry 
                        ? `${c.t('Expires:', 'ينتهي:')} ${new Date(newCouponExpiry).toLocaleDateString()}` 
                        : c.t('No Expiration Date', 'لا يوجد تاريخ انتهاء')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coupon Code Generator Bar */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Ticket size={14} className="text-purple-600" />
                  <span>{c.t('Coupon Code', 'رمز الكود')}</span>
                  <span className="text-rose-500">*</span>
                </label>
                
                {/* Auto Generate Button */}
                <button
                  type="button"
                  onClick={() => {
                    const generated = generateCouponCode(newCouponType, newCouponValue);
                    setNewCouponCode(generated);
                    setCouponFormError(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95"
                >
                  <Wand2 size={13} className="animate-spin-slow" />
                  <span>{c.t('Auto-Generate Code', 'توليد كود تلقائي')}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={newCouponCode}
                  onChange={e => {
                    setNewCouponCode(e.target.value.toUpperCase().replace(/\s+/g, ''));
                    setCouponFormError(null);
                  }}
                  placeholder="e.g. SAVE20-8K2A, BONUS15-PROMO"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono font-bold uppercase tracking-wider focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {c.t(
                  'Click "Auto-Generate Code" for a unique smart promo code, or type your own custom code.',
                  'اضغط على "توليد كود تلقائي" لإنشاء رمز ترويجي ذكي فريد، أو اكتب الكود الخاص بك مباشرة.'
                )}
              </p>
            </div>

            {/* Visual Discount Mechanic Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {c.t('Discount Mechanic & Type', 'نوع ونظام الخصم')}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    type: 'percent' as CouponType,
                    icon: Percent,
                    title: c.t('Percentage Discount', 'نسبة مئوية (%)'),
                    desc: c.t('e.g. 15% off cart total', 'مثال: خصم 15% من الإجمالي'),
                    badge: '%',
                  },
                  {
                    type: 'fixed' as CouponType,
                    icon: DollarSign,
                    title: c.t('Fixed Cash Discount', 'مبلغ مالي ثابت (€)'),
                    desc: c.t('e.g. €20 off order amount', 'مثال: خصم €20 مباشرة'),
                    badge: '€',
                  },
                  {
                    type: 'credit_bonus' as CouponType,
                    icon: Gift,
                    title: c.t('Credit Bonus', 'رصيد إضافي هدية'),
                    desc: c.t('e.g. +€15 extra wallet credits', 'مثال: إضافة €15 مجانًا للمحفظة'),
                    badge: '🎁',
                  },
                ].map(item => {
                  const active = newCouponType === item.type;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setNewCouponType(item.type);
                        setCouponFormError(null);
                      }}
                      className={`p-3.5 rounded-xl border text-start transition-all relative flex flex-col justify-between gap-2 ${
                        active
                          ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-2 ring-purple-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          active 
                            ? 'bg-purple-600 text-white shadow-xs' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          <Icon size={16} />
                        </div>
                        {active && (
                          <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{item.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discount Value with Quick Preset Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {newCouponType === 'percent' 
                    ? c.t('Discount Percentage (%)', 'نسبة الخصم (%)') 
                    : newCouponType === 'fixed' 
                    ? c.t('Deduction Amount (€)', 'مبلغ الخصم النقدي (€)') 
                    : c.t('Bonus Credits Added (€)', 'قيمة الرصيد الإضافي الممنوح (€)')}
                  <span className="text-rose-500 ms-0.5">*</span>
                </label>
                <span className="text-xs text-slate-500">
                  {newCouponType === 'percent' ? c.t('Max: 100%', 'الحد الأقصى: 100%') : c.t('Euros (€)', 'يورو (€)')}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={newCouponValue}
                  onChange={e => {
                    setNewCouponValue(e.target.value);
                    setCouponFormError(null);
                  }}
                  min="1"
                  max={newCouponType === 'percent' ? '100' : undefined}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
              </div>

              {/* Quick Preset Value Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-semibold text-slate-500 me-1">
                  {c.t('Quick Presets:', 'قيم سريعة:')}
                </span>
                {(newCouponType === 'percent' ? [5, 10, 15, 20, 25, 50] : [5, 10, 20, 25, 50, 100]).map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setNewCouponValue(String(val));
                      setCouponFormError(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      newCouponValue === String(val)
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {newCouponType === 'percent' ? `${val}%` : `€${val}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Applicable Scope Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {c.t('Applies To (Target Scopes)', 'ينطبق على (النطاقات المستهدفة)')}
                <span className="text-rose-500 ms-0.5">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'wallet_topup' as CouponScope,
                    icon: Wallet,
                    label: c.t('Communication Wallet', 'شحن محفظة الاتصالات'),
                    hint: c.t('WhatsApp, SMS & transit top-up', 'رسوم ورسائل الواتساب وSMS'),
                  },
                  {
                    id: 'plan' as CouponScope,
                    icon: Layers,
                    label: c.t('Subscription Plans', 'باقات الاشتراك الشهرية/السنوية'),
                    hint: c.t('Platform access & monthly tiers', 'الوصول للمنصة والباقات الدورية'),
                  },
                  {
                    id: 'addon' as CouponScope,
                    icon: Gift,
                    label: c.t('Add-on Packs', 'الباقات الإضافية والمقاعد'),
                    hint: c.t('Extra seats and tool unlocks', 'مقاعد إضافية وتوسعة الأدوات'),
                  },
                ].map(scope => {
                  const checked = newCouponScopes.includes(scope.id);
                  const Icon = scope.icon;
                  return (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => {
                        setNewCouponScopes(prev =>
                          checked ? prev.filter(s => s !== scope.id) : [...prev, scope.id]
                        );
                        setCouponFormError(null);
                      }}
                      className={`p-3 rounded-xl border text-start flex items-start gap-2.5 transition-all ${
                        checked
                          ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 ring-1 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                        checked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {checked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Icon size={13} className={checked ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'} />
                          <span>{scope.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{scope.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Limits & Expiration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {c.t('Max Redemptions Allowed', 'الحد الأقصى لعدد مرات الاستخدام')}
                </label>
                <input
                  type="number"
                  value={newCouponMaxRedemptions}
                  onChange={e => setNewCouponMaxRedemptions(e.target.value)}
                  min="1"
                  placeholder="e.g. 50, 100, 500"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {c.t('Total times this code can be used across all accounts.', 'إجمالي عدد مرات استخدام الكود لكافة العملاء.')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {c.t('Expiration Date (Optional)', 'تاريخ انتهاء الصلاحية (اختياري)')}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={newCouponExpiry}
                    onChange={e => setNewCouponExpiry(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                  {newCouponExpiry && (
                    <button
                      type="button"
                      onClick={() => setNewCouponExpiry('')}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-1"
                      title={c.t('Clear date', 'مسح التاريخ')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {c.t('Leave empty for perpetual validity until archived.', 'اتركه فارغًا ليكون الكود صالحًا دون تحديد تاريخ انتهاء.')}
                </p>
              </div>
            </div>

            {/* Campaign Name / Description */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                {c.t('Internal Campaign Note / Description (Optional)', 'ملاحظة أو وصف الحملة الترويجية (اختياري)')}
              </label>
              <input
                type="text"
                value={newCouponDescription}
                onChange={e => setNewCouponDescription(e.target.value)}
                placeholder={c.t('e.g. VIP Ramadan 2026 Promo, 15% discount on WhatsApp transit fees', 'مثال: عرض رمضان 2026، خصم 15% على شحن المحفظة')}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* View Coupon Details & User Usage Modal */}
      {viewingCoupon && (
        <Modal
          wide={true}
          title={c.t('Coupon Code Details & User Analytics', 'تفاصيل وإحصائيات كود الخصم')}
          subtitle={c.t('Live breakdown of coupon performance, user redemptions, and savings.', 'تقرير مباشر عن أداء الكوبون، استخدامات العملاء، والخصومات المحققة.')}
          icon={<Ticket size={18} className="text-purple-600" />}
          onClose={() => setViewingCoupon(null)}
          footer={
            <div className="flex flex-wrap items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await handleToggleCoupon(viewingCoupon);
                    setViewingCoupon(prev => prev ? { ...prev, active: !prev.active } : null);
                  }}
                  className="bl-btn"
                >
                  {viewingCoupon.active ? c.t('Pause Coupon', 'إيقاف مؤقت للكود') : c.t('Activate Coupon', 'تفعيل الكود')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleArchiveCoupon(viewingCoupon);
                    setViewingCoupon(null);
                  }}
                  className="bl-btn danger"
                >
                  {c.t('Archive', 'أرشفة')}
                </button>
              </div>

              <div className="flex items-center gap-2 ms-auto">
                <button
                  type="button"
                  onClick={() => handleCopyCode(viewingCoupon.code)}
                  className="bl-btn"
                >
                  {copiedCouponCode === viewingCoupon.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copiedCouponCode === viewingCoupon.code ? c.t('Copied!', 'تم النسخ!') : c.t('Copy Code', 'نسخ الكود')}</span>
                </button>
                <button
                  type="button"
                  className="bl-btn primary"
                  onClick={() => setViewingCoupon(null)}
                >
                  {c.t('Done', 'تم')}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Hero Coupon Status Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-slate-50 dark:from-purple-950/40 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-200/80 dark:border-purple-800/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-mono font-black text-lg tracking-wider shadow-sm flex items-center gap-2">
                    <Ticket size={17} />
                    <span>{viewingCoupon.code}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(viewingCoupon.code)}
                    className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-white dark:hover:bg-slate-800 text-purple-700 dark:text-purple-300 transition-colors"
                    title={c.t('Copy code', 'نسخ الكود')}
                  >
                    {copiedCouponCode === viewingCoupon.code ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  </button>

                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                    viewingCoupon.active 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' 
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {viewingCoupon.active ? c.t('Active', 'مفعل') : c.t('Paused', 'متوقف')}
                  </span>

                  <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200">
                    {viewingCoupon.type === 'percent' 
                      ? `${viewingCoupon.value}% DISCOUNT` 
                      : viewingCoupon.type === 'fixed' 
                      ? `€${viewingCoupon.value} OFF` 
                      : `+€${viewingCoupon.value} BONUS`}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {viewingCoupon.description || c.t('Universal platform promotional coupon code.', 'كود خصم وترويج متاح لخدمات المنصة.')}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {(viewingCoupon.appliesTo || []).map(scope => (
                    <span key={scope} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {scope === 'wallet_topup' ? c.t('Communication Wallet', 'شحن المحفظة') : scope === 'plan' ? c.t('Plans', 'الباقات') : c.t('Add-ons', 'الإضافات')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick action stamp */}
              <div className="text-end shrink-0 hidden sm:block">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {c.t('Validity Window', 'فترة الصلاحية')}
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  {viewingCoupon.expiresAt 
                    ? `${c.t('Expires on', 'ينتهي في')} ${new Date(viewingCoupon.expiresAt).toLocaleDateString()}` 
                    : c.t('Perpetual / No expiry', 'مستمر / دون انتهاء')}
                </div>
              </div>
            </div>

            {/* 4 Performance Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Redemptions */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{c.t('Redemptions', 'عدد الاستخدام')}</span>
                  <Ticket size={15} className="text-purple-600" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {viewingCoupon.redemptions ?? 0} <span className="text-xs text-slate-400 font-normal">/ {viewingCoupon.maxRedemptions || '∞'}</span>
                </div>
                <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
                  {Math.min(100, Math.round(((viewingCoupon.redemptions ?? 0) / (viewingCoupon.maxRedemptions || 1)) * 100))}% {c.t('capacity used', 'نسبة الاستهلاك')}
                </div>
              </div>

              {/* Active Users */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{c.t('Active Users', 'المستخدمون')}</span>
                  <Users size={15} className="text-emerald-600" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {uniqueUsersCount}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1">
                  {c.t('Distinct customer accounts', 'عملاء متميزون')}
                </div>
              </div>

              {/* Total Savings Delivered */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{c.t('Savings Granted', 'إجمالي الخصم')}</span>
                  <DollarSign size={15} className="text-amber-600" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  €{totalCouponSavings.toFixed(2)}
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 mt-1">
                  {totalCouponBonus > 0 ? `+€${totalCouponBonus.toFixed(2)} ${c.t('bonus', 'رصيد هدية')}` : c.t('Direct discount given', 'توفير مباشر للعملاء')}
                </div>
              </div>

              {/* Remaining Quota */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{c.t('Remaining Quota', 'المتبقي')}</span>
                  <Sparkles size={15} className="text-indigo-600" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {Math.max(0, (viewingCoupon.maxRedemptions || 100) - (viewingCoupon.redemptions ?? 0))}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1">
                  {c.t('Slots available to redeem', 'مرات متبقية متاحة')}
                </div>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {c.t('Redemption Capacity Progress', 'شريط تقدم الاستهلاك')}
                </span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {viewingCoupon.redemptions ?? 0} / {viewingCoupon.maxRedemptions || '∞'} ({Math.min(100, Math.round(((viewingCoupon.redemptions ?? 0) / (viewingCoupon.maxRedemptions || 1)) * 100))}%)
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((viewingCoupon.redemptions ?? 0) / (viewingCoupon.maxRedemptions || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Customer Redemptions & Usage Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users size={15} className="text-purple-600" />
                  <span>{c.t('Customer Redemptions Activity', 'سجل استخدامات العملاء للكود')}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {viewingCouponRedemptions.length} {c.t('records', 'عملية')}
                  </span>
                </h4>
              </div>

              {viewingCouponRedemptions.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 text-start">{c.t('Customer', 'العميل')}</th>
                        <th className="py-2.5 px-3 text-start">{c.t('Scope / Order', 'الطلب / النطاق')}</th>
                        <th className="py-2.5 px-3 text-start">{c.t('Date & Time', 'التاريخ والوقت')}</th>
                        <th className="py-2.5 px-3 text-end">{c.t('Benefit Applied', 'الفائدة المطبقة')}</th>
                        <th className="py-2.5 px-3 text-center">{c.t('Status', 'الحالة')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                      {viewingCouponRedemptions.map(r => {
                        const userLabel = (r as any).requesterName || r.requesterEmail || r.requesterId;
                        const userInit = initials(userLabel);
                        const discount = r.coupon?.discount || (r as any).discountAmount || 0;
                        const bonus = r.coupon?.bonus || 0;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {userInit}
                                </div>
                                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                                  {userLabel}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                                {r.type === 'wallet_topup' 
                                  ? c.t('Wallet Top-Up', 'شحن المحفظة') 
                                  : r.type === 'plan' 
                                  ? c.t('Subscription Plan', 'باقة اشتراك') 
                                  : c.t('Add-on Pack', 'باقة إضافية')}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                              {new Date(r.createdAt).toLocaleString()}
                            </td>

                            <td className="py-3 px-3 text-end font-mono font-bold">
                              {discount > 0 ? (
                                <span className="text-rose-600 dark:text-rose-400">-€{discount.toFixed(2)}</span>
                              ) : bonus > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400">+€{bonus.toFixed(2)} Bonus</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'approved' 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' 
                                  : r.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mx-auto">
                    <Users size={18} />
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {c.t('No customer redemptions recorded yet', 'لم يتم استخدام هذا الكود من أي عميل حتى الآن')}
                  </h5>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    {c.t(
                      `Share code "${viewingCoupon.code}" with your customers. Redemptions and savings will automatically appear in this live table.`,
                      `شارك الكود "${viewingCoupon.code}" مع عملائك. ستظهر تفاصيل كل عملية استخدام ومقدار الخصم هنا فور تطبيقها.`
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(viewingCoupon.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Copy size={13} />
                    <span>{c.t('Copy Shareable Code', 'نسخ الكود للمشاركة')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
