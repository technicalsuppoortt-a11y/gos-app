import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  PLATFORM,
  useBillingIdentity,
  useInvoices,
  useProviderBranding,
  type BillingInvoice,
} from '../../backend/billing';
import { useWorkspacePreferenceState } from '../../backend/workspacePreferences';
import { downloadInvoicePdf, type InvoiceBrandResolved } from '../../utils/invoicePdf';
import { showToast } from '../../utils/toast';
import { Empty, Modal, Spinner, useCopy } from './ui';

interface InvoicesPanelProps {
  mode?: 'subscriber' | 'provider';
  audience?: 'user' | 'admin' | 'super_admin';
  ownerId?: string;
}

type DatePreset = 'all' | '7d' | '30d' | '90d' | 'custom';
type StatusFilter = 'all' | BillingInvoice['status'];

export function InvoicesPanel({
  mode = 'subscriber',
  audience = 'user',
  ownerId,
}: InvoicesPanelProps) {
  const c = useCopy();
  const identity = useBillingIdentity();
  const workspacePrefs = useWorkspacePreferenceState();

  const queryField = mode === 'provider' ? 'providerId' : 'subscriberId';
  const queryValue = mode === 'provider' ? (ownerId || identity.uid) : identity.uid;
  const { data: invoices, loading } = useInvoices(
    queryField,
    queryValue,
    mode === 'subscriber' ? identity.email : null,
  );

  // Live hierarchical branding for User subscribers -> reads Parent Admin's `dashboardBrands/{providerId}`
  const subscriberParentProviderId =
    mode === 'subscriber' && audience === 'user'
      ? identity.providerId || invoices.find(inv => inv.providerId && inv.providerId !== PLATFORM)?.providerId || null
      : null;
  const liveParentAdminBrand = useProviderBranding(
    subscriberParentProviderId,
    audience === 'user' ? 'USER' : 'ADMIN',
  );

  /**
   * Strictly enforces hierarchical invoice branding:
   * - User invoice (`subscriberRole === 'USER'` and `providerId !== PLATFORM`) -> Parent Admin's brand & logo.
   * - Admin invoice (`subscriberRole === 'ADMIN'` or `providerId === PLATFORM`) -> Super Admin's brand & logo.
   */
  const resolveBrandForInvoice = (inv: BillingInvoice): InvoiceBrandResolved => {
    const isAdminInvoice = inv.subscriberRole === 'ADMIN' || inv.providerId === PLATFORM;
    if (isAdminInvoice) {
      const saIssuer = inv.issuer?.role === 'SUPER_ADMIN' ? inv.issuer : null;
      return {
        brandName: saIssuer?.brandName || saIssuer?.name || 'Upclick',
        logoUrl: saIssuer?.logoUrl || '/upclick-logo.svg',
        email: saIssuer?.email || 'ops@upclick.app',
        roleLabel: c.t('Super Admin · Platform Billing', 'الإدارة العليا · فوترة المنصة'),
      };
    }

    // User invoice -> Parent Admin's brand & logo
    const viewerIsParentAdmin =
      mode === 'provider' && audience === 'admin' && inv.providerId === identity.uid;
    const viewerInheritsParentAdmin = mode === 'subscriber' && audience === 'user';

    const parentBrandName =
      liveParentAdminBrand.brandName ||
      ((viewerIsParentAdmin || viewerInheritsParentAdmin) ? workspacePrefs.values?.name || '' : '') ||
      (inv.issuer?.brandName && inv.issuer.brandName !== 'Workspace Provider'
        ? inv.issuer.brandName
        : '') ||
      inv.issuer?.name ||
      'Upclick';

    const parentLogoUrl =
      liveParentAdminBrand.logoUrl ||
      ((viewerIsParentAdmin || viewerInheritsParentAdmin) ? workspacePrefs.values?.logoUrl || '' : '') ||
      inv.issuer?.logoUrl ||
      '/upclick-logo.svg';

    const parentEmail =
      liveParentAdminBrand.email ||
      inv.issuer?.email ||
      '';

    return {
      brandName: parentBrandName,
      logoUrl: parentLogoUrl,
      email: parentEmail,
      roleLabel: c.t('Authorized Provider · Admin', 'مزود الخدمة المعتمد · المسؤول'),
    };
  };

  // Search & Advanced Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Preview & PDF Download state
  const [previewInvoice, setPreviewInvoice] = useState<BillingInvoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== 'all' ||
    datePreset !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(minAmount) ||
    Boolean(maxAmount);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
  };

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    const nowMs = Date.now();
    const presetCutoffMs =
      datePreset === '7d'
        ? nowMs - 7 * 86400000
        : datePreset === '30d'
        ? nowMs - 30 * 86400000
        : datePreset === '90d'
        ? nowMs - 90 * 86400000
        : null;

    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    const minVal = minAmount !== '' && Number.isFinite(Number(minAmount)) ? Number(minAmount) : null;
    const maxVal = maxAmount !== '' && Number.isFinite(Number(maxAmount)) ? Number(maxAmount) : null;

    return invoices.filter(inv => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;

      const issuedMs = inv.issuedAt ? new Date(inv.issuedAt).getTime() : 0;
      if (presetCutoffMs !== null && issuedMs < presetCutoffMs) return false;
      if (datePreset === 'custom') {
        if (fromMs !== null && !Number.isNaN(fromMs) && issuedMs < fromMs) return false;
        if (toMs !== null && !Number.isNaN(toMs) && issuedMs > toMs) return false;
      }

      const amt = Number(inv.total ?? 0);
      if (minVal !== null && amt < minVal) return false;
      if (maxVal !== null && amt > maxVal) return false;

      if (q) {
        const brand = resolveBrandForInvoice(inv);
        const itemText = (inv.items || [])
          .map(it => `${it.description?.en || ''} ${it.description?.ar || ''}`)
          .join(' ');
        const haystack = [
          inv.invoiceNumber,
          inv.requestId,
          inv.transactionId,
          inv.paymentMethod,
          inv.paymentType,
          inv.type,
          inv.customer?.name,
          inv.customer?.email,
          brand.brandName,
          itemText,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    invoices,
    search,
    statusFilter,
    datePreset,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    liveParentAdminBrand,
    workspacePrefs.values,
  ]);

  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid');
    const pending = invoices.filter(i => i.status === 'pending');
    const walletPaid = paid.filter(i => i.paymentType === 'wallet');
    const primaryCurrency = invoices[0]?.currency || 'USD';
    const sameCurrency = paid.every(i => i.currency === primaryCurrency);
    const paidSum = sameCurrency ? paid.reduce((s, i) => s + (i.total || 0), 0) : null;
    return {
      totalCount: invoices.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      walletCount: walletPaid.length,
      paidSum,
      primaryCurrency,
    };
  }, [invoices]);

  const handleDownloadPdf = async (inv: BillingInvoice) => {
    if (downloadingId) return;
    setDownloadingId(inv.id);
    try {
      const brand = resolveBrandForInvoice(inv);
      await downloadInvoicePdf(inv, brand, {
        ar: c.ar,
        formatMoney: (val, cur) => c.checkoutMoney(val, cur as any),
      });
      showToast.success(
        c.t(
          `Downloaded ${inv.invoiceNumber}.pdf`,
          `تم تنزيل الفاتورة ${inv.invoiceNumber}.pdf`,
        ),
      );
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : c.t('Could not export PDF.', 'تعذر تصدير ملف PDF.'),
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const renderStatusBadge = (status: BillingInvoice['status']) => {
    const map: Record<
      BillingInvoice['status'],
      { cls: string; icon: React.ReactNode; en: string; ar: string }
    > = {
      paid: {
        cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300',
        icon: <CheckCircle2 size={12} />,
        en: 'Paid',
        ar: 'مدفوعة',
      },
      pending: {
        cls: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300',
        icon: <Clock size={12} />,
        en: 'Pending',
        ar: 'قيد المراجعة',
      },
      rejected: {
        cls: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-300',
        icon: <XCircle size={12} />,
        en: 'Rejected',
        ar: 'مرفوضة',
      },
      cancelled: {
        cls: 'bg-slate-500/10 text-slate-600 border-slate-500/25 dark:text-slate-400',
        icon: <XCircle size={12} />,
        en: 'Cancelled',
        ar: 'ملغاة',
      },
    };
    const item = map[status] || map.pending;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${item.cls}`}
      >
        {item.icon}
        {c.t(item.en, item.ar)}
      </span>
    );
  };

  const typeLabel = (type: BillingInvoice['type']) => {
    switch (type) {
      case 'plan':
        return c.t('Plan Subscription', 'اشتراك باقة');
      case 'renewal':
        return c.t('Plan Renewal', 'تجديد باقة');
      case 'addon':
        return c.t('Add-on', 'إضافة');
      case 'wallet_topup':
        return c.t('Wallet Top-Up', 'شحن محفظة');
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="bl-loading">
        <Spinner />
        <span>{c.t('Loading invoices…', 'جارٍ تحميل الفواتير…')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{c.t('Total Invoices', 'إجمالي الفواتير')}</span>
            <FileText size={15} className="text-indigo-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
            {c.num(stats.totalCount)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {mode === 'provider'
              ? c.t('Issued to your subscribers', 'صادرة لمشتركيك')
              : audience === 'admin'
              ? c.t('Issued by Super Admin', 'صادرة من الإدارة العليا')
              : c.t('Issued by your Admin provider', 'صادرة من مسؤول الخدمة')}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{c.t('Paid Invoices', 'الفواتير المدفوعة')}</span>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.paidSum !== null && stats.paidCount > 0
              ? c.checkoutMoney(stats.paidSum, stats.primaryCurrency as any)
              : c.num(stats.paidCount)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {c.t(`${stats.paidCount} settled statements`, `${c.num(stats.paidCount)} فاتورة مسددة`)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{c.t('Pending Verification', 'بانتظار المراجعة')}</span>
            <Clock size={15} className="text-amber-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
            {c.num(stats.pendingCount)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {c.t('Direct receipts awaiting approval', 'إيصالات بانتظار الاعتماد')}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{c.t('Paid From Wallet', 'مدفوعة من المحفظة')}</span>
            <Wallet size={15} className="text-violet-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
            {c.num(stats.walletCount)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {c.t('Instant wallet settlements & renewals', 'تسويات وتجديدات فورية من المحفظة')}
          </p>
        </div>
      </div>

      {/* Main Search, Advanced Filters & Data Table Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={c.t(
                'Search by invoice #, plan, payment method, reference…',
                'ابحث برقم الفاتورة، الباقة، طريقة الدفع، المرجع…',
              )}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 ps-9 pe-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/70 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Status Pills */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/80">
              {(
                [
                  ['all', c.t('All', 'الكل')],
                  ['paid', c.t('Paid', 'مدفوعة')],
                  ['pending', c.t('Pending', 'معلقة')],
                  ['rejected', c.t('Rejected', 'مرفوضة')],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    statusFilter === id
                      ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Date Preset Selector */}
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as DatePreset)}
              aria-label={c.t('Filter by date', 'تصفية حسب التاريخ')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">{c.t('All Dates', 'كل التواريخ')}</option>
              <option value="7d">{c.t('Last 7 Days', 'آخر 7 أيام')}</option>
              <option value="30d">{c.t('Last 30 Days', 'آخر 30 يومًا')}</option>
              <option value="90d">{c.t('Last 90 Days', 'آخر 90 يومًا')}</option>
              <option value="custom">{c.t('Custom Date Range', 'نطاق تاريخ مخصص')}</option>
            </select>

            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                showFilters || minAmount || maxAmount || datePreset === 'custom'
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Filter size={13} />
              {c.t('Advanced Filters', 'فلاتر متقدمة')}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw size={12} />
                {c.t('Reset', 'إعادة ضبط')}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters Row (Custom Date Range + Amount Min/Max + Cancelled status) */}
        {(showFilters || datePreset === 'custom') && (
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-800 dark:bg-slate-800/40">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {c.t('From Date', 'من تاريخ')}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  if (e.target.value) setDatePreset('custom');
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {c.t('To Date', 'إلى تاريخ')}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value);
                  if (e.target.value) setDatePreset('custom');
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {c.t('Min Amount', 'الحد الأدنى للمبلغ')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minAmount}
                onChange={e => setMinAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {c.t('Max Amount', 'الحد الأقصى للمبلغ')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxAmount}
                onChange={e => setMaxAmount(e.target.value)}
                placeholder="9999.00"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {c.t('Status', 'الحالة')}
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">{c.t('All Statuses', 'كل الحالات')}</option>
                <option value="paid">{c.t('Paid', 'مدفوعة')}</option>
                <option value="pending">{c.t('Pending', 'قيد المراجعة')}</option>
                <option value="rejected">{c.t('Rejected', 'مرفوضة')}</option>
                <option value="cancelled">{c.t('Cancelled', 'ملغاة')}</option>
              </select>
            </div>
          </div>
        )}

        {/* Invoices Table */}
        {filteredInvoices.length === 0 ? (
          <div className="p-6">
            <Empty
              icon={<FileText size={22} />}
              title={
                invoices.length === 0
                  ? c.t('No invoices yet', 'لا توجد فواتير حتى الآن')
                  : c.t('No matching invoices', 'لا توجد فواتير مطابقة للبحث')
              }
              text={
                invoices.length === 0
                  ? c.t(
                      'Every plan subscription, renewal, add-on purchase, or wallet top-up automatically generates an official downloadable invoice here.',
                      'كل اشتراك باقة أو تجديد أو إضافة أو شحن محفظة يُنشئ تلقائيًا فاتورة رسمية قابلة للتنزيل هنا.',
                    )
                  : c.t(
                      'Try adjusting your search keywords, date range, status, or amount filters.',
                      'جرّب تعديل كلمات البحث أو نطاق التاريخ أو فلاتر الحالة والمبلغ.',
                    )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <th className="px-4 py-3 text-start">{c.t('Invoice', 'الفاتورة')}</th>
                  <th className="px-4 py-3 text-start">
                    {mode === 'provider'
                      ? c.t('Customer', 'العميل')
                      : c.t('Issued By', 'صادرة من')}
                  </th>
                  <th className="px-4 py-3 text-start">{c.t('Description', 'البند / الباقة')}</th>
                  <th className="px-4 py-3 text-start">{c.t('Payment Method', 'طريقة الدفع')}</th>
                  <th className="px-4 py-3 text-start">{c.t('Status', 'الحالة')}</th>
                  <th className="px-4 py-3 text-end">{c.t('Amount', 'المبلغ')}</th>
                  <th className="px-4 py-3 text-end">{c.t('Actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredInvoices.map(inv => {
                  const brand = resolveBrandForInvoice(inv);
                  const primaryItem = inv.items?.[0];
                  const itemTitle = primaryItem
                    ? c.pick(primaryItem.description)
                    : typeLabel(inv.type);
                  const extraItemsCount = Math.max(0, (inv.items?.length || 0) - 1);
                  const isBusy = downloadingId === inv.id;

                  return (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      {/* Invoice # & Date */}
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {inv.invoiceNumber}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <Calendar size={11} />
                          <span>{c.date(inv.issuedAt)}</span>
                        </div>
                      </td>

                      {/* Brand / Customer */}
                      <td className="px-4 py-3.5 align-middle">
                        {mode === 'provider' ? (
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {inv.customer?.name || inv.customer?.email || inv.subscriberId}
                            </div>
                            {inv.customer?.email && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {inv.customer.email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <img
                              src={brand.logoUrl || '/upclick-logo.svg'}
                              alt={brand.brandName}
                              onError={e => {
                                (e.currentTarget as HTMLImageElement).src = '/upclick-logo.svg';
                              }}
                              className="h-7 w-7 rounded-lg border border-slate-200 bg-white object-contain p-0.5 dark:border-slate-700"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {brand.brandName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {inv.subscriberRole === 'ADMIN' || inv.providerId === PLATFORM
                                  ? c.t('Super Admin', 'الإدارة العليا')
                                  : c.t('Admin Provider', 'مسؤول الخدمة')}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Item / Plan */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {itemTitle}
                          {extraItemsCount > 0 && (
                            <span className="ms-1.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                              +{extraItemsCount}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {typeLabel(inv.type)}
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium ${
                            inv.paymentType === 'wallet'
                              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {inv.paymentType === 'wallet' ? (
                            <Wallet size={12} />
                          ) : (
                            <CreditCard size={12} />
                          )}
                          {inv.paymentMethod ||
                            (inv.paymentType === 'wallet'
                              ? c.t('From Wallet', 'من المحفظة')
                              : c.t('Direct Pay', 'دفع مباشر'))}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        {renderStatusBadge(inv.status)}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-end align-middle whitespace-nowrap">
                        <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {c.checkoutMoney(inv.total, inv.currency)}
                        </div>
                        {inv.paymentType === 'wallet' && inv.walletCharged !== undefined && (
                          <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            {c.checkoutMoney(inv.walletCharged, (inv.walletCurrency || 'EUR') as any)}{' '}
                            {c.t('wallet', 'محفظة')}
                          </div>
                        )}
                      </td>

                      {/* Actions: Preview & Download PDF */}
                      <td className="px-4 py-3.5 text-end align-middle whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewInvoice(inv)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/15"
                          >
                            <Eye size={13} />
                            {c.t('Preview', 'معاينة')}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDownloadPdf(inv)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {isBusy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            {c.t('Download', 'تنزيل PDF')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Executive Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          brand={resolveBrandForInvoice(previewInvoice)}
          downloading={downloadingId === previewInvoice.id}
          onDownload={() => void handleDownloadPdf(previewInvoice)}
          onClose={() => setPreviewInvoice(null)}
        />
      )}
    </div>
  );
}

function InvoicePreviewModal({
  invoice,
  brand,
  downloading,
  onDownload,
  onClose,
}: {
  invoice: BillingInvoice;
  brand: InvoiceBrandResolved;
  downloading: boolean;
  onDownload: () => void;
  onClose: () => void;
}) {
  const c = useCopy();

  const statusConfig: Record<
    BillingInvoice['status'],
    { bg: string; border: string; text: string; en: string; ar: string }
  > = {
    paid: {
      bg: '#ecfdf5',
      border: '#6ee7b7',
      text: '#047857',
      en: 'PAID',
      ar: 'مدفوعة',
    },
    pending: {
      bg: '#fffbeb',
      border: '#fcd34d',
      text: '#b45309',
      en: 'PENDING APPROVAL',
      ar: 'قيد المراجعة',
    },
    rejected: {
      bg: '#fef2f2',
      border: '#fca5a5',
      text: '#b91c1c',
      en: 'REJECTED',
      ar: 'مرفوضة',
    },
    cancelled: {
      bg: '#f1f5f9',
      border: '#cbd5e1',
      text: '#475569',
      en: 'CANCELLED',
      ar: 'ملغاة',
    },
  };
  const st = statusConfig[invoice.status] || statusConfig.pending;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      wide
      icon={<FileText size={18} />}
      title={`${c.t('Invoice Preview', 'معاينة الفاتورة')} · ${invoice.invoiceNumber}`}
      subtitle={c.t(
        `Issued by ${brand.brandName}`,
        `صادرة من ${brand.brandName}`,
      )}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="bl-btn ghost" onClick={onClose}>
            {c.t('Close', 'إغلاق')}
          </button>
          <button type="button" className="bl-btn" onClick={handlePrint}>
            <Printer size={14} />
            {c.t('Print', 'طباعة')}
          </button>
          <button
            type="button"
            className="bl-btn primary"
            disabled={downloading}
            onClick={onDownload}
          >
            {downloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {c.t('Download PDF', 'تنزيل PDF')}
          </button>
        </>
      }
    >
      {/* White paper sheet protected with data-public-asset so dark-mode surface scripts preserve paper look */}
      <div
        data-public-asset="true"
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* Top Brand Gradient Bar */}
        <div
          style={{
            height: 6,
            background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
          }}
        />

        <div style={{ padding: '28px 32px' }}>
          {/* Header Row: Hierarchical Brand Logo + Brand Name vs INVOICE # + Status */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 20,
              paddingBottom: 24,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img
                src={brand.logoUrl || '/upclick-logo.svg'}
                alt={brand.brandName}
                onError={e => {
                  (e.currentTarget as HTMLImageElement).src = '/upclick-logo.svg';
                }}
                style={{
                  height: 48,
                  maxWidth: 150,
                  objectFit: 'contain',
                  borderRadius: 10,
                  padding: 4,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              />
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  {brand.brandName}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#64748b',
                  }}
                >
                  <ShieldCheck size={13} style={{ color: '#4f46e5' }} />
                  {brand.roleLabel}
                </div>
              </div>
            </div>

            <div style={{ textAlign: c.ar ? 'left' : 'right' }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: '#0f172a',
                }}
              >
                {c.t('INVOICE', 'فاتورة رسمية')}
              </div>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#475569',
                  marginTop: 2,
                }}
              >
                #{invoice.invoiceNumber}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  backgroundColor: st.bg,
                  border: `1px solid ${st.border}`,
                  color: st.text,
                }}
              >
                {c.t(st.en, st.ar)}
              </div>
            </div>
          </div>

          {/* Issued By & Billed To */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginTop: 20,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                }}
              >
                {c.t('Issued By', 'صادرة من')}
              </div>
              <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                {brand.brandName}
              </div>
              <div style={{ marginTop: 2, fontSize: 12.5, color: '#475569' }}>{brand.roleLabel}</div>
              {brand.email && (
                <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>{brand.email}</div>
              )}
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                }}
              >
                {c.t('Billed To', 'فاتورة إلى')}
              </div>
              <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                {invoice.customer?.name || invoice.customer?.email || invoice.subscriberId}
              </div>
              <div style={{ marginTop: 2, fontSize: 12.5, color: '#475569' }}>
                {invoice.subscriberRole === 'ADMIN'
                  ? c.t('Workspace Administrator', 'مسؤول مساحة عمل (Admin)')
                  : c.t('Workspace Subscriber', 'حساب مستخدم')}
              </div>
              {invoice.customer?.email && (
                <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>
                  {invoice.customer.email}
                </div>
              )}
            </div>
          </div>

          {/* Dates & Payment Metadata Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12,
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
            }}
          >
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>
                {c.t('ISSUE DATE', 'تاريخ الإصدار')}
              </div>
              <div style={{ marginTop: 2, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {c.date(invoice.issuedAt)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>
                {c.t('PAID DATE', 'تاريخ السداد')}
              </div>
              <div style={{ marginTop: 2, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {invoice.paidAt ? c.date(invoice.paidAt) : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>
                {c.t('PAYMENT METHOD', 'طريقة الدفع')}
              </div>
              <div style={{ marginTop: 2, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {invoice.paymentMethod ||
                  (invoice.paymentType === 'wallet'
                    ? c.t('From Wallet', 'من المحفظة')
                    : c.t('Direct Pay', 'دفع مباشر'))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>
                {c.t('CURRENCY', 'العملة')}
              </div>
              <div style={{ marginTop: 2, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {invoice.currency}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div
            style={{
              marginTop: 20,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'start', fontWeight: 700 }}>
                    {c.t('Description', 'البند / الوصف')}
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                    {c.t('Qty', 'الكمية')}
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'end', fontWeight: 700 }}>
                    {c.t('Unit Price', 'سعر الوحدة')}
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'end', fontWeight: 700 }}>
                    {c.t('Amount', 'الإجمالي')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <td style={{ padding: '12px 14px', color: '#0f172a' }}>
                      <div style={{ fontWeight: 700 }}>{c.pick(item.description)}</div>
                      {((item.credits ?? 0) > 0 || (item.emailCredits ?? 0) > 0) && (
                        <div style={{ marginTop: 2, fontSize: 11.5, color: '#4f46e5', fontWeight: 600 }}>
                          {(item.credits ?? 0) > 0 &&
                            `+${c.num(item.credits ?? 0)} ${c.t('AI Credits', 'رصيد ذكاء اصطناعي')}`}
                          {(item.credits ?? 0) > 0 && (item.emailCredits ?? 0) > 0 && ' · '}
                          {(item.emailCredits ?? 0) > 0 &&
                            `+${c.num(item.emailCredits ?? 0)} ${c.t('Email Credits', 'رصيد بريد')}`}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        textAlign: 'center',
                        fontWeight: 600,
                        color: '#334155',
                      }}
                    >
                      {c.num(item.quantity ?? 1)}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        textAlign: 'end',
                        fontWeight: 600,
                        color: '#334155',
                      }}
                    >
                      {c.checkoutMoney(item.unitPrice ?? 0, invoice.currency)}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        textAlign: 'end',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      {c.checkoutMoney(item.total ?? 0, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary & Reference Footer */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 20,
              marginTop: 20,
            }}
          >
            <div style={{ flex: '1 1 240px', fontSize: 12, color: '#475569' }}>
              {invoice.transactionId && (
                <div style={{ marginBottom: 4 }}>
                  <strong style={{ color: '#0f172a' }}>
                    {c.t('Reference ID:', 'رقم المرجع:')}
                  </strong>{' '}
                  <span style={{ fontFamily: 'monospace' }}>{invoice.transactionId}</span>
                </div>
              )}
              {invoice.note && (
                <div>
                  <strong style={{ color: '#0f172a' }}>{c.t('Note:', 'ملاحظة:')}</strong>{' '}
                  {invoice.note}
                </div>
              )}
            </div>

            <div style={{ flex: '0 1 300px', width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 4px',
                  fontSize: 13,
                  color: '#475569',
                }}
              >
                <span>{c.t('Subtotal', 'المجموع الفرعي')}</span>
                <strong style={{ color: '#0f172a' }}>
                  {c.checkoutMoney(invoice.subtotal ?? invoice.total, invoice.currency)}
                </strong>
              </div>

              {(invoice.discount ?? 0) > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 4px',
                    fontSize: 13,
                    color: '#059669',
                  }}
                >
                  <span>
                    {c.t('Discount', 'الخصم')}
                    {invoice.couponCode ? ` (${invoice.couponCode})` : ''}
                  </span>
                  <strong>-{c.checkoutMoney(invoice.discount, invoice.currency)}</strong>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 8,
                  padding: '12px 14px',
                  borderRadius: 10,
                  backgroundColor: '#f1f5f9',
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                <span>{c.t('Total', 'الإجمالي')}</span>
                <span>{c.checkoutMoney(invoice.total, invoice.currency)}</span>
              </div>

              {invoice.paymentType === 'wallet' && invoice.walletCharged !== undefined && (
                <div
                  style={{
                    marginTop: 6,
                    textAlign: 'end',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#047857',
                  }}
                >
                  {c.t('Deducted from Wallet:', 'تم الخصم من المحفظة:')}{' '}
                  {c.checkoutMoney(invoice.walletCharged, (invoice.walletCurrency || 'EUR') as any)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
