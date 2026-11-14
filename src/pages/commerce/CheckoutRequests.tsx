import { useCurrency } from '../../context/CurrencyContext';
import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  KeyRound,
  Receipt,
  Search,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { backendError, callBackend, db } from '../../backend/firebase';
import {
  buildCustomerProductSnapshot,
  syncMerchantPortalDelivery,
  type CustomerPurchaseRecord,
} from '../../backend/customerPortal';
import { QuickDetails } from '../../components/ui/QuickDetails';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { matchesLocalizedSearch } from '../../utils/arabicSearch';
import { showToast } from '../../utils/toast';
import type { RootState } from '../../store';
import { useProducts } from './repository';
import './checkout-requests.css';

type Status = 'Pending' | 'Approved' | 'Rejected';
type RequestRow = {
  id: string;
  status: Status;
  createdAt: string;
  decidedAt?: string;
  productId?: string;
  product_id?: string;
  product?: { id?: string };
  productName: string;
  items: { productId: string; product_id?: string; productName: string; amount?: number; quantity?: number }[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  currency: string;
  method: string;
  transferAccount?: string;
  totals: { price: number; subtotal: number; discount: number; tax: number; dueToday: number };
  note: string;
  reviewNote?: string;
  discountCode: string;
  receipt: { name: string; type: string; dataUrl?: string; url?: string } | null;
  fields: { label: string; value: string }[];
};

const date = (value: string, locale = 'en') => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });
};

const initials = (name: string) =>
  (name || 'C')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'C';

async function applyRequestDecision(
  request: RequestRow,
  decision: 'approve' | 'reject',
  note: string
) {
  await callBackend('productCheckout', { action: 'review', id: request.id, decision, note: note.trim() });
}

export function CheckoutRequests() {
  const { tenant, user } = useSelector((state: RootState) => state.auth);
  return tenant?.id && <RequestsView key={tenant.id + '/' + user?.id} tenantId={tenant.id} />;
}

function RequestsView({ tenantId }: { tenantId: string }) {
  const { formatPrice: money } = useCurrency();
  const isArabic = useUILanguage().startsWith('ar');
  const workspaceProducts = useProducts();
  const [source, setSource] = useState<{ rows: RequestRow[]; error: string; loading: boolean }>({
    rows: [],
    error: '',
    loading: true,
  });
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState('');
  const [focusReject, setFocusReject] = useState(false);
  const [rowBusyId, setRowBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | 'All'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    let active = true;
    const bySource = new Map<string, RequestRow[]>();
    let settled = 0;

    const recompute = () => {
      if (!active) return;
      const merged = new Map<string, RequestRow>();
      for (const source of ['mirror', 'tenant']) {
        for (const item of bySource.get(source) || []) {
          if (item?.id) merged.set(item.id, item);
        }
      }
      const rows = [...merged.values()].sort((a, b) =>
        String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
      );
      setSource({ rows, error: '', loading: false });
    };

    const unsubTenant = onSnapshot(
      query(collection(db, 'tenants', tenantId, 'checkoutRequests'), orderBy('createdAt', 'desc')),
      snapshot => {
        settled++;
        bySource.set(
          'tenant',
          snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as RequestRow)
        );
        recompute();
      },
      cause => {
        settled++;
        const isPermDenied = /(?:^|\/)permission-denied$/i.test(String((cause as { code?: string })?.code ?? ''));
        if (!isPermDenied && settled >= 2 && !bySource.size) {
          setSource({ rows: [], error: backendError(cause), loading: false });
        } else {
          recompute();
        }
      }
    );

    const unsubMirror = onSnapshot(
      collection(db, 'settings', `checkoutRequests_${tenantId}`, 'items'),
      snapshot => {
        settled++;
        bySource.set(
          'mirror',
          snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as RequestRow)
        );
        recompute();
      },
      () => {
        settled++;
        recompute();
      }
    );

    return () => {
      active = false;
      unsubTenant();
      unsubMirror();
    };
  }, [tenantId, retry]);

  const rows = source.rows.filter(
    row =>
      (status === 'All' || row.status === status) &&
      matchesLocalizedSearch(search, [
        row.id,
        row.customerName,
        row.customerEmail,
        row.customerPhone,
        row.productName,
        row.method || '',
        row.method ? t(row.method) : '',
        row.status,
        t(row.status),
      ])
  );

  const counts = {
    All: source.rows.length,
    Pending: source.rows.filter(r => r.status === 'Pending').length,
    Approved: source.rows.filter(r => r.status === 'Approved').length,
    Rejected: source.rows.filter(r => r.status === 'Rejected').length,
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedRows = rows.slice(startIdx, startIdx + pageSize);
  const request = source.rows.find(row => row.id === selected);

  async function quickApprove(row: RequestRow) {
    if (rowBusyId) return;
    setRowBusyId(row.id);
    try {
      if (row.status === 'Approved') {
        const candidateId = [row.productId, row.product_id, row.product?.id, ...(row.items || []).flatMap(item => [item.productId, item.product_id])]
          .find(id => typeof id === 'string' && /^[\w-]{1,150}$/.test(id));
        const cleanProdName = String(row.productName || row.items?.[0]?.productName || '').trim().toLowerCase();
        const matchedProduct = workspaceProducts.find(
          p => (candidateId && p.id === candidateId) || (cleanProdName && p.name.trim().toLowerCase() === cleanProdName),
        );
        const resolvedProductId =
          matchedProduct?.id ||
          candidateId ||
          (cleanProdName ? `prod_${cleanProdName.replace(/[^a-z0-9]+/g, '_').slice(0, 48)}` : 'product');

        // Ensure canonical product document exists in Firestore so backend fulfillment resolves config reliably
        if (matchedProduct?.config && /^[\w-]{1,150}$/.test(matchedProduct.id)) {
          const {
            reviews: _r,
            ratingAverage: _ra,
            reviewsCount: _rc,
            ratingTotal: _rt,
            ...safeProductDoc
          } = matchedProduct as unknown as Record<string, unknown>;
          await setDoc(
            doc(db, 'tenants', tenantId, 'products', matchedProduct.id),
            JSON.parse(JSON.stringify(safeProductDoc)),
            { merge: true },
          ).catch(() => null);
        }

        const cleanEmail = String(row.customerEmail || '').trim().toLowerCase();
        const purchaseId = `${tenantId}_${resolvedProductId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gos-app-3c7fb.web.app';
        const portalPath = `/portal/${encodeURIComponent(purchaseId)}`;
        const nowIso = new Date().toISOString();

        let localDeliverySynced = false;
        if (cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          const portalRecord: CustomerPurchaseRecord = {
            id: purchaseId,
            purchaseId,
            legacyId: purchaseId,
            tenantId,
            orderId: row.id,
            productId: resolvedProductId,
            customerUid: '',
            customerEmail: cleanEmail,
            customerName: row.customerName || cleanEmail.split('@')[0] || 'Customer',
            customerPhone: row.customerPhone || '',
            paymentMethod: row.method || '',
            transferAccount: row.transferAccount || '',
            discountCode: row.discountCode || '',
            decidedAt: row.decidedAt || nowIso,
            amount: Number(row.totals?.dueToday ?? 0),
            currency: row.currency || matchedProduct?.config?.currency || 'USD',
            status: 'Active',
            loginUrl: `${origin}/auth/login?portal=1&email=${encodeURIComponent(cleanEmail)}&redirect=${encodeURIComponent(portalPath)}`,
            portalUrl: `${origin}${portalPath}`,
            productSnapshot: buildCustomerProductSnapshot(
              matchedProduct,
              resolvedProductId,
              row.productName || matchedProduct?.name || 'Purchased Product',
              matchedProduct?.type || 'Course',
            ),
            completedLessonIds: [],
            progress: 0,
            downloadedAssetIds: [],
            downloadCount: 0,
            serviceStatus: 'Order Confirmed',
            grantedAt: row.decidedAt || row.createdAt || nowIso,
            updatedAt: nowIso,
          };
          await syncMerchantPortalDelivery(portalRecord);
          localDeliverySynced = true;
        }

        let backendSynced = false;
        try {
          const result = await callBackend<{ ok: boolean }>('productCheckout', {
            action: 'sync_portal_access',
            requestId: row.id,
            tenantId,
            ...(resolvedProductId ? { productId: resolvedProductId } : {}),
          }, 90000);
          backendSynced = Boolean(result?.ok);
        } catch (syncErr) {
          // Repair interrupted legacy checkout approval or provision directly via commerceService
          if (/^[a-f0-9]{64}$/i.test(row.id)) {
            await callBackend('productCheckout', {
              action: 'review',
              id: row.id,
              decision: 'approve',
              note: row.reviewNote || 'Approved by merchant',
            }).then(() => { backendSynced = true; }).catch(() => null);
          }
          if (!backendSynced && cleanEmail && /^[\w-]{1,150}$/.test(resolvedProductId)) {
            await callBackend('commerceService', {
              action: 'provisionCustomerPortal',
              productId: resolvedProductId,
              email: cleanEmail,
              name: row.customerName,
              orderId: row.id,
              amount: Number(row.totals?.dueToday ?? 0),
              currency: row.currency || 'USD',
              paymentMethod: row.method || '',
              customerPhone: row.customerPhone || '',
            }).then(() => { backendSynced = true; }).catch(() => null);
          }
          if (!backendSynced && !localDeliverySynced) {
            throw syncErr;
          }
        }

        if (!backendSynced && !localDeliverySynced) {
          throw new Error('Customer portal access could not be synced.');
        }
        showToast.success(isArabic ? 'تمت مزامنة وصول العميل إلى البوابة.' : 'Customer portal access synced.');
      } else {
        await applyRequestDecision(row, 'approve', row.reviewNote || 'Approved by merchant');
        showToast.success(t('Checkout request approved.'));
      }
    } catch (cause) {
      const code = (cause as { code?: string })?.code;
      showToast.error(row.status === 'Approved'
        ? code === 'functions/failed-precondition'
          ? (isArabic ? 'تعذرت مزامنة الوصول. تحقق من اعتماد الطلب وتوفر المنتج.' : 'Could not sync access. Check the approval and product availability.')
          : (isArabic ? 'تعذرت مزامنة الوصول إلى البوابة. حاول مرة أخرى.' : 'Could not sync portal access. Try again.')
        : t(backendError(cause)));
    } finally {
      setRowBusyId('');
    }
  }

  return (
    <section className="pp-secondary-view checkout-requests">
      <div className="pp-secondary-heading cr-header">
        <div>
          <h2>{t('Checkout Requests')}</h2>
          <p>{t('Review customer submissions, transfer receipts and checkout details.')}</p>
        </div>
      </div>

      <div className="request-filters cr-toolbar">
        <div className="cr-search-box">
          <Search size={16} className="cr-search-icon" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('Search requests')}
            placeholder={t('Search by customer, product, method or reference…')}
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="cr-search-clear"
              aria-label={t('Clear search')}
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="cr-filter-group">
          <div className="cr-status-tabs" role="group" aria-label={t('Filter by request status')}>
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(option => (
              <button
                key={option}
                type="button"
                aria-pressed={status === option}
                className={`cr-status-tab ${status === option ? 'active' : ''} ${option.toLowerCase()}`}
                onClick={() => {
                  setStatus(option);
                  setPage(1);
                }}
              >
                <span>{t(option)}</span>
                <span className="cr-status-tab-count">{counts[option]}</span>
              </button>
            ))}
          </div>

        </div>
      </div>

      {source.loading ? (
        <div className="cr-loading-state" role="status">
          <div className="cr-spinner" aria-hidden="true" />
          <p>{t('Loading checkout requests…')}</p>
        </div>
      ) : source.error ? (
        <div className="cr-error-banner" role="alert">
          <span>{t(source.error)}</span>
          <button
            type="button"
            className="cw-button"
            onClick={() => {
              setSource({ rows: [], error: '', loading: true });
              setRetry(value => value + 1);
            }}
          >
            {t('Try again')}
          </button>
        </div>
      ) : rows.length ? (
        <div className="cr-table-card">
          <div className="request-table" tabIndex={0} role="region" aria-label={t('Checkout Requests')}>
            <table className="cr-requests-table">
              <colgroup>
                <col className="cr-col-customer" />
                <col className="cr-col-product" />
                <col className="cr-col-method" />
                <col className="cr-col-total" />
                <col className="cr-col-date" />
                <col className="cr-col-status" />
                <col className="cr-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  {['Customer', 'Product', 'Method', 'Total', 'Submitted', 'Status', 'Actions'].map(label => (
                    <th key={label} scope="col">
                      {label === 'Submitted' && isArabic ? 'تاريخ الإرسال' : t(label)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div className="cr-customer-cell">
                        <span className="cr-customer-avatar" aria-hidden="true">
                          {initials(row.customerName)}
                        </span>
                        <div className="cr-customer-meta">
                          <b>{row.customerName}</b>
                          <small title={row.customerEmail}><bdi>{row.customerEmail}</bdi></small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cr-product-cell">
                        <span className="cr-product-name">{row.productName}</span>
                        <small className="cr-ref-code">#{row.id.slice(0, 8).toUpperCase()}</small>
                      </div>
                    </td>
                    <td>
                      <span className="cr-method-badge">{row.method || t('Manual transfer')}</span>
                    </td>
                    <td>
                      <strong className="cr-amount"><bdi>{money(row.totals?.dueToday ?? 0, row.currency)}</bdi></strong>
                    </td>
                    <td>
                      <span className="cr-date-cell">{date(row.createdAt, isArabic ? 'ar' : 'en')}</span>
                    </td>
                    <td>
                      <span className={`request-status ${row.status.toLowerCase()}`}>
                        <span className="cr-status-dot" aria-hidden="true" />
                        {t(row.status)}
                      </span>
                    </td>
                    <td>
                      <div className="cr-row-actions">
                        {row.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              className="cr-action-btn approve"
                              disabled={rowBusyId === row.id}
                              title={t('Approve verified transfer')}
                              onClick={() => void quickApprove(row)}
                            >
                              <CheckCircle2 size={14} />
                              <span>{t('Approve')}</span>
                            </button>
                            <button
                              type="button"
                              className="cr-action-btn reject"
                              disabled={rowBusyId === row.id}
                              title={t('Reject with reason')}
                              onClick={() => {
                                setFocusReject(true);
                                setSelected(row.id);
                              }}
                            >
                              <XCircle size={14} />
                              <span>{t('Reject')}</span>
                            </button>
                          </>
                        )}
                        {row.status === 'Approved' && (
                          <button type="button" className="cw-button cr-action-btn cr-sync-button" disabled={Boolean(rowBusyId)} aria-busy={rowBusyId === row.id} onClick={() => void quickApprove(row)}>
                            <KeyRound size={14} />
                            <span>{rowBusyId === row.id
                              ? (isArabic ? 'جارٍ المزامنة…' : 'Syncing…')
                              : (isArabic ? 'مزامنة الوصول إلى البوابة' : 'Sync portal access')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="cw-button cr-action-btn details"
                          onClick={() => {
                            setFocusReject(false);
                            setSelected(row.id);
                          }}
                        >
                          <Eye size={14} />
                          <span>{t('View details')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cr-pagination" aria-label={t('Pagination')}>
            <div className="cr-pagination-info">
              <span>
                {t('Showing')} <strong>{rows.length ? startIdx + 1 : 0}</strong>–
                <strong>{Math.min(startIdx + pageSize, rows.length)}</strong> {t('of')} <strong>{rows.length}</strong>{' '}
                {t('requests')}
              </span>
              <label className="cr-page-size">
                <span>{t('Rows per page')}</span>
                <select
                  aria-label={t('Rows per page')}
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[5, 8, 10, 20, 50].map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cr-pagination-controls">
              <button
                type="button"
                className="cr-page-btn"
                disabled={safePage <= 1}
                aria-label={t('Previous page')}
                onClick={() => setPage(Math.max(1, safePage - 1))}
              >
                <ChevronLeft size={15} />
                <span>{t('Previous')}</span>
              </button>
              <div className="cr-page-numbers">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="cr-page-ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={`cr-page-num ${safePage === item ? 'active' : ''}`}
                        aria-current={safePage === item ? 'page' : undefined}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    )
                  )}
              </div>
              <button
                type="button"
                className="cr-page-btn"
                disabled={safePage >= totalPages}
                aria-label={t('Next page')}
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              >
                <span>{t('Next')}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pp-records-empty">
          <span className="pp-records-empty-icon">
            <ClipboardList size={26} />
          </span>
          <h3>{t(source.rows.length ? 'No matching requests' : 'No checkout requests yet')}</h3>
          <p>
            {t(
              source.rows.length
                ? 'Change your search or status filter.'
                : 'Submissions from published product checkouts appear here.'
            )}
          </p>
        </div>
      )}

      {request && (
        <RequestDetails
          key={request.id}
          tenantId={tenantId}
          request={request}
          focusReject={focusReject}
          close={() => {
            setSelected('');
            setFocusReject(false);
          }}
        />
      )}
    </section>
  );
}

function RequestDetails({
  tenantId,
  request,
  focusReject = false,
  close,
}: {
  tenantId: string;
  request: RequestRow;
  focusReject?: boolean;
  close: () => void;
}) {
  const { formatPrice: money } = useCurrency();
  const [note, setNote] = useState(request.reviewNote || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inlineUrl = request.receipt?.dataUrl || request.receipt?.url || '';
  const [fetchedUrl, setFetchedUrl] = useState('');
  const url = inlineUrl || fetchedUrl;
  const [receiptError, setReceiptError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusReject && request.status === 'Pending') {
      const timer = setTimeout(() => {
        noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        noteRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [focusReject, request.status]);

  useEffect(() => {
    if (!request.receipt || inlineUrl) return;
    let active = true;
    callBackend<{ url: string }>('productCheckout', { action: 'receipt', id: request.id })
      .then(value => {
        if (active) setFetchedUrl(value.url);
      })
      .catch(cause => {
        if (active) setReceiptError(backendError(cause));
      });
    return () => {
      active = false;
    };
  }, [request.id, request.receipt, inlineUrl, attempt]);

  async function review(decision: 'approve' | 'reject') {
    if (busy) return;
    if (decision === 'reject' && !note.trim()) {
      setError(t('Please enter a rejection reason before rejecting this request.'));
      noteRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await applyRequestDecision(request, decision, note);
      showToast.success(t(decision === 'approve' ? 'Checkout request approved.' : 'Checkout request rejected.'));
    } catch (cause) {
      setError(backendError(cause));
    } finally {
      setBusy(false);
    }
  }

  function copyValue(value: string, label: string) {
    navigator.clipboard
      ?.writeText(value)
      .then(() => showToast.success(`${label} ${t('copied')}`));
  }

  return (
    <QuickDetails title={t('Checkout request')} close={close}>
      <div className="request-details cr-details-drawer">
        {/* Top Summary Banner */}
        <div className="cr-detail-hero">
          <div className="cr-detail-hero-top">
            <span className={`request-status ${request.status.toLowerCase()}`}>
              <span className="cr-status-dot" aria-hidden="true" />
              {t(request.status)}
            </span>
            <button
              type="button"
              className="cr-ref-pill"
              onClick={() => copyValue(request.id, t('Reference ID'))}
              title={t('Copy reference ID')}
            >
              <span>#{request.id.slice(0, 12).toUpperCase()}</span>
              <Copy size={12} />
            </button>
          </div>
          <div className="cr-detail-hero-main">
            <div>
              <span className="cr-detail-hero-label">{t('Total due')}</span>
              <strong className="cr-detail-hero-amount">{money(request.totals?.dueToday ?? 0, request.currency)}</strong>
            </div>
            <div className="cr-detail-hero-date">
              <Clock size={13} />
              <span>{date(request.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Customer Information Card */}
        <section className="cr-detail-card">
          <header className="cr-detail-card-header">
            <User size={15} />
            <h3>{t('Customer')}</h3>
          </header>
          <div className="cr-detail-customer-head">
            <span className="cr-customer-avatar large" aria-hidden="true">
              {initials(request.customerName)}
            </span>
            <div>
              <strong>{request.customerName}</strong>
              <span>{request.customerEmail}</span>
            </div>
          </div>
          <dl className="cr-detail-dl">
            <div>
              <dt>{t('Name')}</dt>
              <dd>{request.customerName}</dd>
            </div>
            <div>
              <dt>{t('Email')}</dt>
              <dd>{request.customerEmail}</dd>
            </div>
            <div>
              <dt>{t('Phone')}</dt>
              <dd>{request.customerPhone || '—'}</dd>
            </div>
          </dl>
        </section>

        {/* Order & Payment Summary Card */}
        <section className="cr-detail-card">
          <header className="cr-detail-card-header">
            <CreditCard size={15} />
            <h3>{t('Order details')}</h3>
          </header>
          <ul className="cr-detail-products">
            {(request.items?.length ? request.items : [{ productId: 'default', productName: request.productName }]).map(
              item => (
                <li key={item.productId}>{item.productName}</li>
              )
            )}
          </ul>
          <dl className="cr-detail-dl">
            <div>
              <dt>{t('Payment method')}</dt>
              <dd>
                <span className="cr-method-badge">{request.method}</span>
              </dd>
            </div>
            {request.transferAccount && (
              <div>
                <dt>{t('Transfer account')}</dt>
                <dd className="cr-copy-row">
                  <code>{request.transferAccount}</code>
                  <button
                    type="button"
                    className="cr-mini-copy"
                    onClick={() => copyValue(request.transferAccount!, t('Transfer account'))}
                  >
                    <Copy size={12} />
                  </button>
                </dd>
              </div>
            )}
            {request.discountCode && (
              <div>
                <dt>{t('Discount code')}</dt>
                <dd>
                  <span className="cr-discount-pill">{request.discountCode}</span>
                </dd>
              </div>
            )}
            <div>
              <dt>{t('Product price')}</dt>
              <dd>{money(request.totals.price, request.currency)}</dd>
            </div>
            <div>
              <dt>{t('Discount')}</dt>
              <dd>{money(request.totals.discount, request.currency)}</dd>
            </div>
            <div>
              <dt>{t('Subtotal')}</dt>
              <dd>{money(request.totals.subtotal, request.currency)}</dd>
            </div>
            <div>
              <dt>{t('Tax')}</dt>
              <dd>{money(request.totals.tax, request.currency)}</dd>
            </div>
            <div className="cr-detail-total-row">
              <dt>{t('Total due')}</dt>
              <dd>
                <b>{money(request.totals.dueToday, request.currency)}</b>
              </dd>
            </div>
            {request.fields?.map((field, index) => (
              <div key={index}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
            {request.note && (
              <div className="cr-detail-note-row">
                <dt>{t('Customer note')}</dt>
                <dd>{request.note}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Receipt Preview Card */}
        <section className="cr-detail-card">
          <header className="cr-detail-card-header">
            <Receipt size={15} />
            <h3>{t('Receipt')}</h3>
          </header>
          {!request.receipt ? (
            <p className="cr-detail-muted">{t('No receipt submitted')}</p>
          ) : receiptError ? (
            <div className="cr-error-banner" role="alert">
              <span>{t(receiptError)}</span>
              <button
                type="button"
                className="cw-button"
                onClick={() => {
                  setReceiptError('');
                  setFetchedUrl('');
                  setAttempt(value => value + 1);
                }}
              >
                {t('Try again')}
              </button>
            </div>
          ) : !url ? (
            <p role="status" className="cr-detail-muted">
              {t('Loading receipt…')}
            </p>
          ) : (
            <div className="cr-receipt-box">
              <div className="cr-receipt-frame">
                {request.receipt.type.startsWith('image/') ? (
                  <img
                    className="request-receipt"
                    src={url}
                    alt={t('Receipt preview')}
                    onError={() => setReceiptError('The receipt preview could not be loaded.')}
                  />
                ) : (
                  <iframe
                    className="request-receipt"
                    title={t('Receipt preview')}
                    src={url}
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <div className="cr-receipt-footer">
                <span className="cr-receipt-filename">
                  <FileText size={14} />
                  {request.receipt.name}
                </span>
                <a href={url} target="_blank" rel="noopener noreferrer" className="cr-receipt-open">
                  <span>{t('Open full receipt')}</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Review & Decision Card */}
        {request.status !== 'Pending' ? (
          <section className={`cr-detail-card cr-decision-summary ${request.status.toLowerCase()}`}>
            <header className="cr-detail-card-header">
              {request.status === 'Approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <h3>{t('Review details')}</h3>
            </header>
            <p className="cr-decision-note">{request.reviewNote || t('No review note')}</p>
            {request.decidedAt && <small className="cr-decision-date">{date(request.decidedAt)}</small>}
          </section>
        ) : (
          <section className="request-review cr-detail-card cr-review-card">
            <header className="cr-detail-card-header">
              <CheckCircle2 size={15} />
              <h3>{t('Review request')}</h3>
            </header>
            <p className="cr-review-hint">
              {t(
                request.receipt
                  ? 'Verify the transfer against your payment account before approving.'
                  : 'Approve to confirm this order.'
              )}
            </p>
            <label className="cr-review-label">
              <span className="cr-review-label-row">
                <span>{t('Review note')}</span>
                <small className="cr-review-badge">{t('Required to reject')}</small>
              </span>
              <textarea
                ref={noteRef}
                maxLength={1000}
                rows={3}
                value={note}
                disabled={busy}
                onChange={event => {
                  setNote(event.target.value);
                  if (error) setError('');
                }}
                placeholder={t('A reason is required to reject the request')}
              />
            </label>
            {error && (
              <p className="cr-review-error" role="alert">
                {t(error)}
              </p>
            )}
            <div className="cr-review-actions">
              <button
                type="button"
                className="cw-button cr-btn-reject"
                disabled={busy}
                onClick={() => void review('reject')}
              >
                <XCircle size={15} />
                <span>{t('Reject request')}</span>
              </button>
              <button
                type="button"
                className="cw-button primary cr-btn-approve"
                disabled={busy}
                onClick={() => void review('approve')}
              >
                <CheckCircle2 size={15} />
                <span>{t(request.receipt ? 'Approve verified transfer' : 'Approve request')}</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </QuickDetails>
  );
}
