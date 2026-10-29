import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowDownLeft, ArrowUpRight, Check, Coins, Eye, FileText, Gem, History, 
  Inbox, Package, RefreshCw, Search, SlidersHorizontal, Users, X, Download,
  ExternalLink, AlertCircle, Copy as CopyIcon, Info, CheckCheck, Maximize2, Upload
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../backend/firebase';
import { billing, effectiveStatus, useLedger, type BillingPlan, type BillingRequest, type BillingSubscription, type BillingWallet, type LedgerEntry } from '../../backend/billing';
import { Empty, Modal, Spinner, StatusPill, Tabs, billingLabel, downloadCsv, initials, useAction, useCopy, type Copy } from './ui';

const typeLabel = (request: BillingRequest, c: Copy) => request.type === 'addon' ? c.t('Add-on', 'إضافة') : request.type === 'renewal' ? c.t('Renewal', 'تجديد') : c.t('New plan', 'باقة جديدة');

export function getRawReceiptUrl(request?: Record<string, any> | null): string {
  if (!request) return '';
  let val =
    request.receiptUrl ||
    request.receiptPath ||
    request.imageUrl ||
    request.fileUrl ||
    request.receipt ||
    request.attachmentUrl ||
    request.documentUrl ||
    request.url ||
    request.paymentDetails?.receiptUrl ||
    request.paymentDetails?.receiptPath;

  if (!val && typeof window !== 'undefined') {
    try {
      if (request.id) {
        const cached = localStorage.getItem(`bl_receipt_${request.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          val = parsed.receiptUrl || parsed.receiptPath || parsed.imageUrl || parsed.fileUrl;
        }
      }
      if (!val && request.planId) {
        const userKey = `bl_pending_receipt_${request.requesterId || 'me'}_${request.planId}`;
        const userCached = localStorage.getItem(userKey);
        if (userCached) {
          const parsed = JSON.parse(userCached);
          val = parsed.receiptUrl || parsed.receiptPath || parsed.imageUrl || parsed.fileUrl;
        }
      }
      if (!val) {
        const latest = localStorage.getItem(`bl_latest_receipt_${request.requesterId || 'me'}`) || localStorage.getItem('bl_latest_receipt_me');
        if (latest) {
          const parsed = JSON.parse(latest);
          if (parsed && (!parsed.timestamp || Date.now() - parsed.timestamp < 14400000)) {
            val = parsed.receiptUrl || parsed.receiptPath || parsed.imageUrl || parsed.fileUrl;
          }
        }
      }
    } catch {}
  }

  return typeof val === 'string' ? val.trim() : '';
}

export function getReceiptFileName(request?: Record<string, any> | null): string {
  if (!request) return '';
  let name =
    request.receiptName ||
    request.fileName ||
    request.name ||
    request.documentName ||
    request.attachmentName ||
    request.paymentDetails?.receiptName ||
    request.paymentDetails?.fileName;

  if (!name && typeof window !== 'undefined') {
    try {
      if (request.id) {
        const cached = localStorage.getItem(`bl_receipt_${request.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          name = parsed.receiptName || parsed.fileName;
        }
      }
      if (!name && request.planId) {
        const userKey = `bl_pending_receipt_${request.requesterId || 'me'}_${request.planId}`;
        const userCached = localStorage.getItem(userKey);
        if (userCached) {
          const parsed = JSON.parse(userCached);
          name = parsed.receiptName || parsed.fileName;
        }
      }
      if (!name) {
        const latest = localStorage.getItem(`bl_latest_receipt_${request.requesterId || 'me'}`) || localStorage.getItem('bl_latest_receipt_me');
        if (latest) {
          const parsed = JSON.parse(latest);
          name = parsed.receiptName || parsed.fileName;
        }
      }
    } catch {}
  }

  if (typeof name === 'string' && name.trim()) return name.trim();
  const rawUrl = getRawReceiptUrl(request);
  if (rawUrl && !rawUrl.startsWith('data:')) {
    try {
      const pathname = new URL(rawUrl, 'https://example.com').pathname;
      const base = pathname.split('/').pop();
      if (base) return decodeURIComponent(base);
    } catch {}
  }
  return '';
}

function isImageReceipt(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('data:application/pdf')) return false;
  if (url.includes('.pdf') || url.includes('application/pdf')) return false;
  if (/\.(png|jpe?g|webp|gif|svg|avif|bmp|tiff?)(\?|$)/i.test(url)) return true;
  return !url.toLowerCase().includes('.pdf');
}

async function downloadReceiptFile(url: string, name?: string) {
  if (!url) return;
  const fileName = name || `receipt_${Date.now()}.png`;

  // 1. Data URLs
  if (url.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // 2. Fetch as blob (recommended for cross-origin downloads)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
      return;
    }
  } catch (e) {
    console.warn('Blob fetch failed, trying canvas fallback:', e);
  }

  // 3. Fallback for image: draw to canvas and download data URL
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = fileName.endsWith('.pdf') ? fileName : fileName.replace(/\.[^.]+$/, '.png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      } catch {}
      window.open(url, '_blank', 'noopener,noreferrer');
    };
    img.onerror = () => {
      window.open(url, '_blank', 'noopener,noreferrer');
    };
    img.src = url;
    return;
  } catch {}

  // 4. Default fallback: open in new window
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Incoming (provider decides) or outgoing (requester tracks / cancels) plan & add-on requests. */
export function RequestsPanel({ requests, mode, title }: { requests: BillingRequest[]; mode: 'incoming' | 'outgoing'; title?: string }) {
  const c = useCopy();
  const { busy, run } = useAction();
  const [filter, setFilter] = useState<'pending' | 'rejected' | 'all'>('pending');
  const [rejecting, setRejecting] = useState<BillingRequest | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<BillingRequest | null>(null);
  const [resolvedReceiptUrl, setResolvedReceiptUrl] = useState('');
  const [resolvingReceipt, setResolvingReceipt] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [reason, setReason] = useState('');
  const pending = requests.filter(request => request.status === 'pending');
  const rejected = requests.filter(request => request.status === 'rejected');
  const rows = filter === 'pending' ? pending : filter === 'rejected' ? rejected : requests;

  useEffect(() => {
    if (!viewingReceipt) {
      setResolvedReceiptUrl('');
      setResolvingReceipt(false);
      setIsZoomOpen(false);
      return;
    }

    const raw = getRawReceiptUrl(viewingReceipt);
    if (!raw) {
      setResolvedReceiptUrl('');
      setResolvingReceipt(false);
      return;
    }

    // Direct HTTP(S), Data URL, or Blob URL
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
      setResolvedReceiptUrl(raw);
      setResolvingReceipt(false);
      return;
    }

    // Storage path resolution (e.g. 'billingReceipts/...' or 'gs://...')
    let isSubscribed = true;
    setResolvingReceipt(true);

    try {
      const storageRef = ref(storage, raw);
      getDownloadURL(storageRef)
        .then(downloadUrl => {
          if (isSubscribed) {
            setResolvedReceiptUrl(downloadUrl);
            setResolvingReceipt(false);
          }
        })
        .catch(err => {
          console.warn('Could not resolve download URL from Firebase Storage:', raw, err);
          if (isSubscribed) {
            setResolvedReceiptUrl(raw);
            setResolvingReceipt(false);
          }
        });
    } catch (err) {
      console.warn('Error referencing storage:', err);
      if (isSubscribed) {
        setResolvedReceiptUrl(raw);
        setResolvingReceipt(false);
      }
    }

    return () => {
      isSubscribed = false;
    };
  }, [viewingReceipt]);

  useEffect(() => {
    if (!isZoomOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsZoomOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isZoomOpen]);

  const activeReceiptUrl = resolvedReceiptUrl || getRawReceiptUrl(viewingReceipt);
  const receiptFileName = getReceiptFileName(viewingReceipt) || viewingReceipt?.receiptName || '';

  const approve = (request: BillingRequest) => run(request.id, () => billing('decideRequest', { requestId: request.id, decision: 'approve' }), c.t('Request approved. Subscription and credits were updated.', 'تمت الموافقة. تم تحديث الاشتراك والرصيد.'));
  
  const reject = () => {
    if (!rejecting) return;
    if (!reason.trim()) return;
    return run(
      rejecting.id,
      () => billing('decideRequest', { requestId: rejecting.id, decision: 'reject', reason: reason.trim() }),
      c.t('Request rejected and reason recorded for applicant.', 'تم رفض الطلب وتسجيل السبب لمقدم الطلب.')
    ).then(ok => {
      if (ok) {
        setRejecting(null);
        setReason('');
      }
    });
  };

  const cancel = (request: BillingRequest) => run(request.id, () => billing('cancelRequest', { requestId: request.id }), c.t('Request cancelled.', 'تم إلغاء الطلب.'));

  const [attachingReceipt, setAttachingReceipt] = useState(false);

  const handleAttachReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewingReceipt) return;
    setAttachingReceipt(true);
    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif|bmp|tiff?)$/i.test(file.name);

    if (isImg) {
      const reader = new FileReader();
      reader.onload = () => setResolvedReceiptUrl(reader.result as string);
      reader.readAsDataURL(file);
    }

    try {
      let finalUrl = '';
      try {
        const ext = file.name.split('.').pop() || 'png';
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const storageRef = ref(storage, `billingReceipts/${viewingReceipt.requesterId || 'user'}/${fileName}`);
        const snap = await uploadBytes(storageRef, file, { contentType: file.type || 'image/png' });
        finalUrl = await getDownloadURL(snap.ref);
      } catch (storageErr) {
        console.warn('Storage upload error in handleAttachReceipt:', storageErr);
      }

      if (!finalUrl && isImg) {
        finalUrl = await new Promise<string>(resolve => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.readAsDataURL(file);
        });
      }

      if (finalUrl) {
        setResolvedReceiptUrl(finalUrl);
        await billing('attachReceipt', {
          requestId: viewingReceipt.id,
          receiptUrl: finalUrl,
          receiptName: file.name,
          transactionId: viewingReceipt.transactionId,
        }).catch(err => console.warn('Could not call attachReceipt:', err));

        setViewingReceipt(prev => prev ? {
          ...prev,
          receiptUrl: finalUrl,
          receiptPath: finalUrl,
          imageUrl: finalUrl,
          fileUrl: finalUrl,
          receiptName: file.name,
          fileName: file.name,
        } : null);

        const p = { receiptUrl: finalUrl, receiptName: file.name, timestamp: Date.now() };
        localStorage.setItem(`bl_receipt_${viewingReceipt.id}`, JSON.stringify(p));
        if (viewingReceipt.planId) {
          localStorage.setItem(`bl_pending_receipt_${viewingReceipt.requesterId || 'me'}_${viewingReceipt.planId}`, JSON.stringify(p));
        }
        localStorage.setItem(`bl_latest_receipt_${viewingReceipt.requesterId || 'me'}`, JSON.stringify(p));
      }
    } finally {
      setAttachingReceipt(false);
    }
  };

  return (
    <section className="bl-card">
      <div className="bl-card-head">
        <div><h2><Inbox size={17} />{title ?? (mode === 'incoming' ? c.t('Subscription requests', 'طلبات الاشتراك') : c.t('My requests', 'طلباتي'))}</h2>
          <p>{mode === 'incoming' ? c.t('Approve after confirming payment. Approval activates the plan and issues credits automatically.', 'وافق بعد تأكيد الدفع. الموافقة تفعّل الباقة وتصرف الرصيد تلقائيًا.') : c.t('Track the plans and add-ons you requested from your provider.', 'تابع الباقات والإضافات التي طلبتها من مزود الخدمة.')}</p></div>
        <Tabs label={c.t('Request filter', 'تصفية الطلبات')} value={filter} onChange={setFilter} tabs={[
          { id: 'pending', label: c.t('Pending', 'قيد المراجعة'), count: pending.length, hot: mode === 'incoming' && pending.length > 0 },
          { id: 'rejected', label: c.t('Rejected', 'المرفوضة'), count: rejected.length, hot: mode === 'outgoing' && rejected.length > 0 },
          { id: 'all', label: c.t('All', 'الكل'), count: requests.length }
        ]} />
      </div>
      {rows.length ? (
        <div className="bl-table-wrap">
          <table className="bl-table">
            <thead><tr>
              {mode === 'incoming' && <th>{c.t('Requested by', 'مقدم الطلب')}</th>}
              <th>{c.t('Item', 'العنصر')}</th><th>{c.t('Type', 'النوع')}</th><th>{c.t('Payment', 'طريقة الدفع')}</th><th>{c.t('Total', 'الإجمالي')}</th><th>{c.t('Date', 'التاريخ')}</th><th>{c.t('Status', 'الحالة')}</th><th style={{ textAlign: 'end' }}>{c.t('Actions', 'الإجراءات')}</th>
            </tr></thead>
            <tbody>
              {rows.map(request => (
                <tr key={request.id}>
                  {mode === 'incoming' && <td><div className="bl-name"><span className="bl-avatar">{initials(request.requesterName || request.requesterEmail)}</span><div><b>{request.requesterName || '—'}</b><small dir="ltr">{request.requesterEmail}</small></div></div></td>}
                  <td>
                    <div className="bl-name">
                      <div>
                        <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                          {request.plan.kind === 'addon' ? (
                            <Package size={14} style={{ flexShrink: 0, display: 'inline-block' }} />
                          ) : (
                            <Gem size={14} style={{ flexShrink: 0, display: 'inline-block' }} />
                          )}
                          <span>{c.pick(request.plan.name)}{request.quantity > 1 && ` ×${c.num(request.quantity)}`}</span>
                        </b>
                        {request.note && <small title={request.note}>“{request.note.slice(0, 60)}”</small>}
                        {request.status === 'rejected' && (
                          <div style={{ marginBlockStart: 5, padding: '4px 8px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', fontSize: 11.5, display: 'flex', alignItems: 'flex-start', gap: 5, maxWidth: 360 }}>
                            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                            <span><b>{c.t('Rejection Reason', 'سبب الرفض')}:</b> {request.reason || c.t('No reason specified', 'لم يحدد سبب')}</span>
                          </div>
                        )}
                        {request.reason && request.status !== 'pending' && request.status !== 'rejected' && <small>{c.t('Reason', 'السبب')}: {request.reason}</small>}
                      </div>
                    </div>
                  </td>
                  <td><span className={`bl-pill plain ${request.type === 'renewal' ? 'green' : request.type === 'addon' ? 'violet' : 'blue'}`}>{typeLabel(request, c)}</span></td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="bl-pill plain" style={{ fontSize: 11.5 }}>
                        {request.paymentMethod || (request.paymentType === 'gateway' ? 'Gateway' : 'Manual Transfer')}
                      </span>
                      {(() => {
                        const rawReceipt = getRawReceiptUrl(request);
                        if (rawReceipt) {
                          return (
                            <button
                              type="button"
                              className="bl-receipt-badge-btn"
                              title={c.t('Inspect transfer receipt', 'معاينة إيصال التحويل')}
                              onClick={() => setViewingReceipt(request)}
                            >
                              <FileText size={12} />
                              <span>{c.t('Receipt', 'الإيصال')}</span>
                            </button>
                          );
                        }
                        if (request.paymentType === 'manual') {
                          return (
                            <button
                              type="button"
                              className="bl-receipt-badge-btn missing"
                              title={c.t('Inspect payment details (No receipt attached)', 'تفاصيل الدفع (بدون إيصال)')}
                              onClick={() => setViewingReceipt(request)}
                            >
                              <AlertCircle size={12} />
                              <span>{c.t('No receipt', 'بدون إيصال')}</span>
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                  <td className="bl-price">
                    <div>{c.money(request.totalAmount ?? request.total, request.plan.currency)}</div>
                    {request.addons && request.addons.length > 0 && (
                      <div style={{ fontSize: 10.5, color: 'var(--bl-muted)', fontWeight: 500 }}>
                        +{request.addons.length} {c.t('add-on(s)', 'إضافات')}
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--bl-muted)' }}>{c.dateTime(request.createdAt)}</td>
                  <td><StatusPill status={request.status} c={c} /></td>
                  <td>
                    <div className="bl-actions">
                      <button
                        type="button"
                        className="bl-btn sm"
                        onClick={() => setViewingReceipt(request)}
                        title={c.t('Review request & receipt details', 'معاينة الطلب والإيصال')}
                      >
                        <Eye size={13} />
                        {c.t('Review', 'معاينة')}
                      </button>
                      {request.status === 'pending' && mode === 'incoming' && (
                        <>
                          <button type="button" className="bl-btn sm success" disabled={!!busy} onClick={() => approve(request)}>
                            {busy === request.id ? <Spinner size={13} /> : <Check size={13} />}
                            {c.t('Approve', 'موافقة')}
                          </button>
                          <button type="button" className="bl-btn sm danger" disabled={!!busy} onClick={() => { setReason(''); setRejecting(request); }}>
                            <X size={13} />
                            {c.t('Reject', 'رفض')}
                          </button>
                        </>
                      )}
                      {request.status === 'pending' && mode === 'outgoing' && (
                        <button type="button" className="bl-btn sm" disabled={!!busy} onClick={() => cancel(request)}>
                          {busy === request.id ? <Spinner size={13} /> : <X size={13} />}
                          {c.t('Cancel', 'إلغاء')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty icon={<Inbox size={22} />} title={filter === 'pending' ? c.t('No pending requests', 'لا توجد طلبات معلقة') : filter === 'rejected' ? c.t('No rejected requests', 'لا توجد طلبات مرفوضة') : c.t('No requests yet', 'لا توجد طلبات بعد')} text={mode === 'incoming' ? c.t('New plan, renewal and add-on requests will appear here.', 'طلبات الباقات والتجديد والإضافات ستظهر هنا.') : undefined} />}
      
      {/* Professional Receipt & Transaction Verification Modal */}
      {viewingReceipt && (
        <Modal
          wide
          title={c.t('Payment Receipt & Verification', 'إيصال الدفع وتفاصيل التحقق')}
          icon={<FileText size={18} />}
          onClose={() => setViewingReceipt(null)}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="bl-btn" onClick={() => setViewingReceipt(null)}>
                {c.t('Close', 'إغلاق')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {activeReceiptUrl && (
                  <button
                    type="button"
                    className="bl-btn"
                    onClick={() => downloadReceiptFile(activeReceiptUrl, receiptFileName)}
                  >
                    <Download size={14} />
                    {c.t('Download Receipt', 'تحميل الإيصال')}
                  </button>
                )}

                {mode === 'outgoing' && viewingReceipt.status === 'pending' && (
                  <button
                    type="button"
                    className="bl-btn danger"
                    disabled={!!busy}
                    onClick={async () => {
                      const target = viewingReceipt;
                      await cancel(target);
                      setViewingReceipt(null);
                    }}
                  >
                    {busy === viewingReceipt.id ? <Spinner size={14} /> : <X size={14} />}
                    {c.t('Cancel Request', 'إلغاء الطلب')}
                  </button>
                )}

                {mode === 'incoming' && viewingReceipt.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="bl-btn danger"
                      disabled={!!busy}
                      onClick={() => {
                        const target = viewingReceipt;
                        setViewingReceipt(null);
                        setReason('');
                        setRejecting(target);
                      }}
                    >
                      <X size={14} />
                      {c.t('Reject Request', 'رفض الطلب')}
                    </button>
                    <button
                      type="button"
                      className="bl-btn primary"
                      style={{ background: 'var(--bl-success)' }}
                      disabled={!!busy}
                      onClick={async () => {
                        await approve(viewingReceipt);
                        setViewingReceipt(null);
                      }}
                    >
                      {busy === viewingReceipt.id ? <Spinner size={14} /> : <Check size={14} />}
                      {c.t('Approve & Activate', 'اعتماد وتفعيل')}
                    </button>
                  </>
                )}
              </div>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Prominent Rejection Banner for applicant & admin */}
            {viewingReceipt.status === 'rejected' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1, color: '#ef4444' }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBlockEnd: 3, color: '#ef4444' }}>
                    {c.t('Request Rejected by Administrator', 'تم رفض الطلب بواسطة الإدارة')}
                  </b>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--bl-text)' }}>
                    <span style={{ fontWeight: 600, color: '#ef4444' }}>{c.t('Reason', 'السبب')}: </span>
                    <span style={{ wordBreak: 'break-word' }}>{viewingReceipt.reason || c.t('No reason provided.', 'لم يتم تقديم سبب.')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Details Card */}
            <div className="bl-receipt-modal-grid">
              <div className="bl-receipt-modal-field">
                <small>{c.t('Requester', 'مقدم الطلب')}</small>
                <strong>{viewingReceipt.requesterName || '—'}</strong>
                <span style={{ fontSize: 11.5, color: 'var(--bl-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {viewingReceipt.requesterEmail}
                </span>
              </div>
              <div className="bl-receipt-modal-field">
                <small>{c.t('Plan / Item', 'الباقة / العنصر')}</small>
                <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {viewingReceipt.plan.kind === 'addon' ? <Package size={14} color="var(--bl-accent)" /> : <Gem size={14} color="var(--bl-accent)" />}
                  <span>{c.pick(viewingReceipt.plan.name)} {viewingReceipt.quantity > 1 ? `×${viewingReceipt.quantity}` : ''}</span>
                </strong>
                <span className="bl-pill plain" style={{ fontSize: 11, width: 'fit-content', marginBlockStart: 2 }}>
                  {typeLabel(viewingReceipt, c)}
                </span>
              </div>
              <div className="bl-receipt-modal-field">
                <small>{c.t('Total Due / Transferred', 'المبلغ الإجمالي المحول')}</small>
                <strong style={{ fontSize: 16, color: 'var(--bl-accent-2)' }}>
                  {c.money(viewingReceipt.totalAmount ?? viewingReceipt.total, viewingReceipt.plan.currency)}
                </strong>
                <span style={{ fontSize: 11.5, color: 'var(--bl-muted)' }}>
                  {viewingReceipt.paymentMethod || 'Manual Transfer'}
                </span>
              </div>
              <div className="bl-receipt-modal-field">
                <small>{c.t('Status & Date', 'الحالة والتاريخ')}</small>
                <div style={{ marginBlockStart: 2 }}>
                  <StatusPill status={viewingReceipt.status} c={c} />
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--bl-muted)', marginBlockStart: 4 }}>
                  {c.dateTime(viewingReceipt.createdAt)}
                </span>
                {viewingReceipt.status === 'rejected' && viewingReceipt.reason && (
                  <span style={{ fontSize: 11, color: '#ef4444', marginBlockStart: 2, fontWeight: 600 }} title={viewingReceipt.reason}>
                    {c.t('Reason', 'السبب')}: {viewingReceipt.reason}
                  </span>
                )}
              </div>
            </div>

            {/* Itemized Order Breakdown (Main Plan + Add-ons) */}
            {viewingReceipt.addons && viewingReceipt.addons.length > 0 && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bl-surface)', border: '1px solid var(--bl-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: 8 }}>
                  <b style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bl-text)' }}>
                    {c.t('Itemized Order Breakdown', 'تفاصيل عناصر الطلب')}
                  </b>
                  <span className="bl-pill plain" style={{ fontSize: 11 }}>
                    {viewingReceipt.addons.length} {c.t('Add-on(s) attached', 'إضافة مدمجة')}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {/* Main Plan line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0', borderBottom: '1px dashed var(--bl-border)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Gem size={12} color="var(--bl-accent)" />
                      <span>{c.pick(viewingReceipt.plan.name)} ({c.t('Base Plan', 'الباقة الأساسية')})</span>
                    </span>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {c.money(viewingReceipt.mainPlanPrice ?? viewingReceipt.plan.price, viewingReceipt.plan.currency)}
                    </strong>
                  </div>
                  {/* Addon line items */}
                  {viewingReceipt.addons.map((addon, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0', borderBottom: '1px dashed var(--bl-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Package size={12} color="var(--bl-accent-2)" />
                        <span>{addon.name || addon.id}</span>
                        <span className="bl-pill plain" style={{ fontSize: 10, padding: '1px 5px' }}>
                          {addon.type === 'unit' ? c.t('Dynamic Credits', 'رصيد مرن') : c.t('Fixed Pack', 'باقة ثابتة')}
                        </span>
                        {addon.qty > 1 && <span style={{ fontSize: 11, color: 'var(--bl-muted)' }}>×{addon.qty}</span>}
                        {addon.credits > 0 && <span style={{ fontSize: 11, color: 'var(--bl-accent)' }}>+{addon.credits} cr</span>}
                      </div>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {c.money(addon.price, viewingReceipt.plan.currency)}
                      </strong>
                    </div>
                  ))}
                  {/* Total line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, paddingTop: 4, fontWeight: 700 }}>
                    <span>{c.t('Total Amount', 'المبلغ الإجمالي')}</span>
                    <span style={{ color: 'var(--bl-accent-2)', fontVariantNumeric: 'tabular-nums' }}>
                      {c.money(viewingReceipt.totalAmount ?? viewingReceipt.total, viewingReceipt.plan.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Ref / Sender Phone */}
            {viewingReceipt.transactionId && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--bl-surface)', border: '1px solid var(--bl-border)' }}>
                <div>
                  <small style={{ color: 'var(--bl-muted)', fontSize: 11, fontWeight: 600, display: 'block' }}>
                    {c.t('Transfer Reference / Sender Phone', 'رقم الحوالة أو هاتف المحوّل')}
                  </small>
                  <strong style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                    {viewingReceipt.transactionId}
                  </strong>
                </div>
                <button
                  type="button"
                  className="bl-copy-btn"
                  onClick={() => {
                    void navigator.clipboard.writeText(viewingReceipt.transactionId || '');
                    setCopiedRef(true);
                    setTimeout(() => setCopiedRef(false), 2000);
                  }}
                >
                  {copiedRef ? <CheckCheck size={12} /> : <CopyIcon size={12} />}
                  <span>{copiedRef ? c.t('Copied!', 'تم النسخ!') : c.t('Copy', 'نسخ')}</span>
                </button>
              </div>
            )}

            {/* Note from user */}
            {viewingReceipt.note && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--bl-accent-soft)', fontSize: 12.5, lineHeight: 1.45 }}>
                <Info size={15} color="var(--bl-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <b style={{ display: 'block', fontSize: 11.5, color: 'var(--bl-accent-2)', marginBlockEnd: 2 }}>
                    {c.t('Customer Note', 'ملاحظة العميل')}:
                  </b>
                  <span>{viewingReceipt.note}</span>
                </div>
              </div>
            )}

            {/* Live Receipt Document / Canvas Display */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlockEnd: 8 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <FileText size={14} color="var(--bl-accent)" />
                  {c.t('Uploaded Transfer Receipt', 'إيصال التحويل المرفوع')}
                </label>
                {receiptFileName && (
                  <span style={{ fontSize: 11.5, color: 'var(--bl-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={receiptFileName}>
                    {receiptFileName}
                  </span>
                )}
              </div>

              {resolvingReceipt ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 12, border: '1px solid var(--bl-border)', background: 'var(--bl-surface-2)', display: 'grid', placeItems: 'center', gap: 10 }}>
                  <Spinner size={24} />
                  <span style={{ fontSize: 12.5, color: 'var(--bl-muted)' }}>
                    {c.t('Loading receipt document...', 'جاري تحميل ملف الإيصال...')}
                  </span>
                </div>
              ) : activeReceiptUrl ? (
                isImageReceipt(activeReceiptUrl) ? (
                  <div className="bl-receipt-view-frame">
                    <img
                      src={activeReceiptUrl}
                      alt="Transfer Receipt"
                      className="bl-receipt-view-img"
                      style={{ cursor: 'zoom-in' }}
                      onClick={() => setIsZoomOpen(true)}
                    />
                    <div className="bl-receipt-view-toolbar">
                      <button
                        type="button"
                        className="bl-receipt-tool-link"
                        onClick={() => setIsZoomOpen(true)}
                        title={c.t('Zoom receipt preview', 'تكبير معاينة الإيصال')}
                      >
                        <Maximize2 size={13} />
                        <span>{c.t('Zoom', 'تكبير')}</span>
                      </button>
                      <button
                        type="button"
                        className="bl-receipt-tool-link"
                        onClick={() => downloadReceiptFile(activeReceiptUrl, receiptFileName)}
                        title={c.t('Download Image', 'تحميل الصورة')}
                      >
                        <Download size={13} />
                        <span>{c.t('Download', 'تحميل')}</span>
                      </button>
                      <a
                        href={activeReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bl-receipt-tool-link"
                        title={c.t('Open in new tab', 'فتح في نافذة جديدة')}
                      >
                        <ExternalLink size={13} />
                        <span>{c.t('Open', 'فتح')}</span>
                      </a>
                      <label className="bl-receipt-tool-link" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={13} />
                        <span>{c.t('Replace', 'استبدال')}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          disabled={attachingReceipt}
                          onChange={handleAttachReceipt}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 12, border: '1px solid var(--bl-border)', background: 'var(--bl-surface-2)', display: 'grid', gap: 12, justifyItems: 'center' }}>
                    <div style={{ width: 54, height: 54, borderRadius: 12, background: 'var(--bl-accent-soft)', color: 'var(--bl-accent)', display: 'grid', placeItems: 'center' }}>
                      <FileText size={30} />
                    </div>
                    <div>
                      <b style={{ fontSize: 14, display: 'block' }}>
                        {receiptFileName || c.t('PDF Receipt Document', 'مستند إيصال PDF')}
                      </b>
                      <small style={{ color: 'var(--bl-muted)', fontSize: 12 }}>
                        {c.t('Click to open or download the complete receipt file', 'انقر لفتح أو تحميل ملف الإيصال الكامل')}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        className="bl-btn"
                        onClick={() => downloadReceiptFile(activeReceiptUrl, receiptFileName)}
                      >
                        <Download size={14} />
                        {c.t('Download PDF', 'تحميل الملف')}
                      </button>
                      <a
                        href={activeReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bl-btn primary"
                      >
                        <ExternalLink size={14} />
                        {c.t('Open Document', 'فتح المستند')}
                      </a>
                      <label className="bl-btn" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={14} />
                        <span>{c.t('Replace', 'استبدال')}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          disabled={attachingReceipt}
                          onChange={handleAttachReceipt}
                        />
                      </label>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ padding: '32px 20px', textAlign: 'center', borderRadius: 12, border: '1.5px dashed var(--bl-border-strong)', background: 'var(--bl-surface-2)', display: 'grid', gap: 10, justifyItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bl-warning-soft)', color: 'var(--bl-warning)', display: 'grid', placeItems: 'center' }}>
                    <AlertCircle size={24} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 750 }}>
                    {c.t('No Receipt Document Uploaded', 'لم يتم إرفاق ملف إيصال مع الطلب')}
                  </h4>
                  <p style={{ margin: 0, color: 'var(--bl-muted)', fontSize: 12.5, maxWidth: 460, lineHeight: 1.5 }}>
                    {c.t(
                      'The subscriber placed this manual transfer request without attaching an image file. If the receipt is available now, you can attach it directly below.',
                      'قام المشترك بتقديم هذا الطلب بدون ملف إيصال. إذا كان الإيصال متوفرًا الآن، يمكنك إرفاقه مباشرة أدناه.'
                    )}
                  </p>
                  <label className="bl-btn primary" style={{ cursor: 'pointer', marginBlockStart: 4, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    {attachingReceipt ? <Spinner size={14} /> : <Upload size={14} />}
                    <span>{attachingReceipt ? c.t('Uploading receipt...', 'جاري رفع الإيصال...') : c.t('Attach / Upload Receipt Now', 'إرفاق / رفع الإيصال الآن')}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                      disabled={attachingReceipt}
                      onChange={handleAttachReceipt}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Full Screen Lightbox Zoom Portal */}
      {isZoomOpen && activeReceiptUrl && typeof document !== 'undefined' && createPortal(
        <div
          className="bl-receipt-zoom-scrim"
          style={{ zIndex: 99999 }}
          onClick={() => setIsZoomOpen(false)}
        >
          <div className="bl-receipt-zoom-wrap" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="bl-receipt-zoom-close"
              onClick={() => setIsZoomOpen(false)}
              aria-label={c.t('Close preview', 'إغلاق المعاينة')}
            >
              <X size={18} />
            </button>
            <img
              src={activeReceiptUrl}
              alt="Receipt Full Preview"
              className="bl-receipt-zoom-img"
            />
            <div className="bl-receipt-zoom-caption">
              <span>{receiptFileName || c.t('Uploaded Transfer Receipt', 'إيصال التحويل المرفوع')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="bl-btn"
                style={{ background: 'rgba(255, 255, 255, 0.18)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.3)' }}
                onClick={() => downloadReceiptFile(activeReceiptUrl, receiptFileName)}
              >
                <Download size={14} />
                <span>{c.t('Download', 'تحميل')}</span>
              </button>
              <a
                href={activeReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="bl-btn"
                style={{ background: 'rgba(255, 255, 255, 0.18)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.3)' }}
              >
                <ExternalLink size={14} />
                <span>{c.t('Open in new tab', 'فتح في نافذة جديدة')}</span>
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}

      {rejecting && (
        <Modal
          title={c.t('Reject request', 'رفض الطلب')}
          subtitle={c.t('Specify the rejection reason (required, shown to applicant)', 'حدد سبب الرفض (إلزامي، يظهر لمقدم الطلب)')}
          icon={<X size={18} />}
          onClose={() => { setRejecting(null); setReason(''); }}
          footer={<>
            <button type="button" className="bl-btn" onClick={() => { setRejecting(null); setReason(''); }}>
              {c.t('Cancel', 'إلغاء')}
            </button>
            <button
              type="button"
              className="bl-btn danger"
              disabled={!reason.trim() || !!busy}
              onClick={reject}
            >
              {busy ? <Spinner size={14} /> : <X size={15} />}
              {c.t('Confirm Rejection', 'تأكيد الرفض')}
            </button>
          </>}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 12.5, color: '#dc2626' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1, color: '#ef4444' }} />
              <span>
                {c.t(
                  'Please provide a clear reason for the applicant explaining why their payment or request could not be approved.',
                  'يرجى كتابة سبب واضح لمقدم الطلب يوضح سبب تعذر اعتماد الدفع أو الطلب.'
                )}
              </span>
            </div>

            <label className="bl-field">
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {c.t('Rejection Reason', 'سبب الرفض')} <strong style={{ color: '#ef4444' }}>*</strong>
                </span>
                <small style={{ color: 'var(--bl-muted)', fontSize: 11 }}>{reason.trim().length} / 300</small>
              </span>
              <textarea
                className="bl-input"
                maxLength={300}
                rows={4}
                value={reason}
                autoFocus
                required
                onChange={event => setReason(event.target.value)}
                placeholder={c.t(
                  'e.g., Transfer amount does not match plan price, transaction reference is invalid, or payment was not received on bank statement.',
                  'مثال: المبلغ المحول غير مطابق لسعر الباقة، أو رقم الحوالة غير صحيح، أو لم يصل التحويل إلى الحساب البنكي.'
                )}
              />
              {!reason.trim() && (
                <span style={{ color: '#ef4444', fontSize: 11.5, marginTop: 3 }}>
                  {c.t('Rejection reason is required before confirming.', 'سبب الرفض إلزامي قبل التأكيد.')}
                </span>
              )}
            </label>
          </div>
        </Modal>
      )}
    </section>
  );
}

/** Subscribers of a provider with wallet balances and management actions. */
export function SubscribersPanel({ subscribers, wallets, plans, isPlatform, title }: { subscribers: BillingSubscription[]; wallets: BillingWallet[]; plans: BillingPlan[]; isPlatform: boolean; title: string }) {
  const c = useCopy();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dialog, setDialog] = useState<{ type: 'assign' | 'credits' | 'ledger'; sub: BillingSubscription } | null>(null);
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const balance = (id: string) => wallets.find(wallet => wallet.id === id)?.balance ?? 0;
  const rows = useMemo(() => subscribers
    .filter(sub => status === 'all' || effectiveStatus(sub) === status)
    .filter(sub => `${sub.subscriberName} ${sub.subscriberEmail} ${sub.plan?.name?.en}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')), [subscribers, status, search]);
  const assignable = plans.filter(plan => plan.kind !== 'trial');
  const close = () => { setDialog(null); setPlanId(''); setAmount(''); setReason(''); };

  const submit = () => {
    if (!dialog) return;
    if (dialog.type === 'assign') return run('dialog', () => billing('assignPlan', { subscriberId: dialog.sub.id, planId }), c.t('Plan assigned.', 'تم تعيين الباقة.')).then(ok => ok && close());
    if (dialog.type === 'credits') return run('dialog', () => billing(isPlatform ? 'adjustCredits' : 'transferCredits', { subscriberId: dialog.sub.id, amount: Number(amount), reason }), isPlatform ? c.t('Credits adjusted.', 'تم تعديل الرصيد.') : c.t('Credits transferred from your wallet.', 'تم تحويل الرصيد من محفظتك.')).then(ok => ok && close());
  };

  return (
    <section className="bl-card">
      <div className="bl-card-head">
        <div><h2><Users size={17} />{title} <span className="bl-count">{subscribers.length}</span></h2><p>{isPlatform ? c.t('Admins subscribed to platform plans and their credit wallets.', 'الأدمن المشتركون في باقات المنصة ومحافظ رصيدهم.') : c.t('Your clients, their plans and remaining credits.', 'عملاؤك وباقاتهم والرصيد المتبقي.')}</p></div>
        <button type="button" className="bl-btn" disabled={!rows.length} onClick={() => downloadCsv('subscribers.csv', ['Name', 'Email', 'Plan', 'Status', 'Period end', 'Credits'], rows.map(sub => [sub.subscriberName, sub.subscriberEmail, sub.plan?.name?.en ?? '', effectiveStatus(sub), sub.currentPeriodEnd ?? 'lifetime', balance(sub.id)]))}><RefreshCw size={14} />{c.t('Export CSV', 'تصدير CSV')}</button>
      </div>
      <div className="bl-card-body" style={{ paddingBlockEnd: 0 }}>
        <div className="bl-toolbar">
          <label className="bl-search"><Search size={15} /><input className="bl-input" value={search} onChange={event => setSearch(event.target.value)} placeholder={c.t('Search by name, email or plan…', 'ابحث بالاسم أو البريد أو الباقة…')} aria-label={c.t('Search subscribers', 'بحث في المشتركين')} /></label>
          <select className="bl-input" style={{ width: 180 }} value={status} onChange={event => setStatus(event.target.value)} aria-label={c.t('Status', 'الحالة')}>
            {[['all', 'All statuses', 'كل الحالات'], ['active', 'Active', 'نشط'], ['trialing', 'Free trial', 'تجربة مجانية'], ['expired', 'Expired', 'منتهي']].map(([value, en, ar]) => <option key={value} value={value}>{c.t(en, ar)}</option>)}
          </select>
        </div>
      </div>
      {rows.length ? (
        <div className="bl-table-wrap" style={{ marginBlockStart: 14 }}>
          <table className="bl-table">
            <thead><tr><th>{c.t('Subscriber', 'المشترك')}</th><th>{c.t('Plan', 'الباقة')}</th><th>{c.t('Status', 'الحالة')}</th><th>{c.t('Renews / ends', 'التجديد / الانتهاء')}</th><th>{c.t('Credits left', 'الرصيد المتبقي')}</th><th style={{ textAlign: 'end' }}>{c.t('Actions', 'الإجراءات')}</th></tr></thead>
            <tbody>
              {rows.map(sub => (
                <tr key={sub.id}>
                  <td><div className="bl-name"><span className="bl-avatar">{initials(sub.subscriberName || sub.subscriberEmail)}</span><div><b>{sub.subscriberName || '—'}</b><small dir="ltr">{sub.subscriberEmail}</small></div></div></td>
                  <td><b>{c.pick(sub.plan?.name)}</b><div style={{ color: 'var(--bl-muted)', fontSize: 11.5 }}>{sub.plan ? billingLabel(sub.plan, c) : ''}{sub.extraSeats ? ` · +${c.num(sub.extraSeats)} ${c.t('seats', 'مقاعد')}` : ''}</div></td>
                  <td><StatusPill status={effectiveStatus(sub)} c={c} />{sub.creditBlocked && <div><span className="bl-pill amber plain" style={{ marginBlockStart: 4 }}>{c.t('Credits blocked', 'الرصيد متوقف')}</span></div>}</td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--bl-muted)' }}>{sub.currentPeriodEnd ? c.date(sub.currentPeriodEnd) : c.t('Never (lifetime)', 'لا ينتهي')}</td>
                  <td className="bl-credits">{c.num(balance(sub.id))}</td>
                  <td><div className="bl-actions">
                    <button type="button" className="bl-btn sm" onClick={() => setDialog({ type: 'ledger', sub })}><History size={13} />{c.t('History', 'السجل')}</button>
                    <button type="button" className="bl-btn sm" onClick={() => setDialog({ type: 'credits', sub })}>{isPlatform ? <SlidersHorizontal size={13} /> : <Coins size={13} />}{isPlatform ? c.t('Adjust', 'تعديل') : c.t('Send credits', 'إرسال رصيد')}</button>
                    <button type="button" className="bl-btn sm success" onClick={() => setDialog({ type: 'assign', sub })}><Gem size={13} />{c.t('Assign', 'تعيين')}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty icon={<Users size={22} />} title={c.t('No subscribers yet', 'لا يوجد مشتركون بعد')} text={c.t('Accounts appear here after they start a trial or a plan is approved.', 'تظهر الحسابات هنا بعد بدء التجربة أو الموافقة على باقة.')} />}

      {dialog?.type === 'ledger' && <LedgerModal walletId={dialog.sub.id} name={dialog.sub.subscriberName} onClose={close} />}
      {dialog && dialog.type !== 'ledger' && (
        <Modal
          title={dialog.type === 'assign' ? c.t('Assign plan or add-on', 'تعيين باقة أو إضافة') : isPlatform ? c.t('Adjust credits', 'تعديل الرصيد') : c.t('Send credits from your wallet', 'إرسال رصيد من محفظتك')}
          subtitle={dialog.sub.subscriberName || dialog.sub.subscriberEmail}
          icon={dialog.type === 'assign' ? <Gem size={18} /> : <Coins size={18} />}
          onClose={close}
          footer={<>
            <button type="button" className="bl-btn" onClick={close}>{c.t('Cancel', 'إلغاء')}</button>
            <button type="button" className="bl-btn primary" disabled={!!busy || (dialog.type === 'assign' ? !planId : !Number(amount))} onClick={submit}>{busy ? <Spinner /> : <Check size={15} />}{c.t('Confirm', 'تأكيد')}</button>
          </>}
        >
          {dialog.type === 'assign' ? (
            <div className="bl-form">
              <label className="bl-field"><span>{c.t('Plan', 'الباقة')}</span>
                <select className="bl-input" value={planId} onChange={event => setPlanId(event.target.value)}>
                  <option value="">{c.t('Choose…', 'اختر…')}</option>
                  {assignable.map(plan => <option key={plan.id} value={plan.id}>{c.pick(plan.name)} · {billingLabel(plan, c)} · {c.money(plan.price, plan.currency)}</option>)}
                </select>
              </label>
              <div className="bl-banner info"><RefreshCw size={16} /><p>{c.t('Use this after receiving an offline payment. A new plan starts a new period and resets credits (unused credits expire). Re-assigning the current plan extends it.', 'استخدمها بعد استلام دفع خارجي. الباقة الجديدة تبدأ فترة جديدة وتعيد ضبط الرصيد (الرصيد غير المستخدم ينتهي). تعيين نفس الباقة يمدد مدتها.')}{!isPlatform && ' ' + c.t('Plan credits are deducted from your wallet.', 'رصيد الباقة يُخصم من محفظتك.')}</p></div>
            </div>
          ) : (
            <div className="bl-form">
              <label className="bl-field"><span>{c.t('Credits', 'الرصيد')}</span><input className="bl-input" type="number" step={1} min={isPlatform ? undefined : 1} value={amount} onChange={event => setAmount(event.target.value)} placeholder={isPlatform ? c.t('Use a negative value to deduct', 'استخدم قيمة سالبة للخصم') : '500'} /><small>{c.t('Current balance', 'الرصيد الحالي')}: {c.num(balance(dialog.sub.id))}</small></label>
              <label className="bl-field"><span>{c.t('Reason', 'السبب')}{isPlatform && ' *'}</span><input className="bl-input" maxLength={200} value={reason} onChange={event => setReason(event.target.value)} placeholder={c.t('Recorded in the audit ledger', 'يُسجل في سجل المراجعة')} /></label>
              {!isPlatform && <div className="bl-banner warn"><Coins size={16} /><p>{c.t('Sent credits are deducted from your wallet and expire at the end of the client’s monthly cycle.', 'الرصيد المرسل يُخصم من محفظتك وينتهي بنهاية الدورة الشهرية للعميل.')}</p></div>}
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}

const ledgerType = (entry: LedgerEntry, c: Copy) => ({ grant: c.t('Plan credits', 'رصيد الباقة'), topup: c.t('Top-up', 'شحن'), transfer_out: c.t('Sent to client', 'مرسل لعميل'), expire: c.t('Expired', 'منتهي'), adjustment: c.t('Adjustment', 'تعديل'), usage: c.t('Usage', 'استهلاك') }[entry.type] ?? entry.type);

export function LedgerTable({ entries, compact }: { entries: LedgerEntry[]; compact?: boolean }) {
  const c = useCopy();
  if (!entries.length) return <Empty icon={<History size={22} />} title={c.t('No credit activity yet', 'لا توجد حركات رصيد بعد')} />;
  return (
    <div className="bl-table-wrap">
      <table className="bl-table" style={compact ? { minWidth: 560 } : undefined}>
        <thead><tr><th>{c.t('Date', 'التاريخ')}</th><th>{c.t('Type', 'النوع')}</th><th>{c.t('Description', 'الوصف')}</th><th>{c.t('Amount', 'القيمة')}</th><th>{c.t('Balance', 'الرصيد')}</th></tr></thead>
        <tbody>
          {entries.slice(0, 200).map(entry => (
            <tr key={entry.id}>
              <td style={{ whiteSpace: 'nowrap', color: 'var(--bl-muted)' }}>{c.dateTime(entry.createdAt)}</td>
              <td><span className={`bl-pill plain ${entry.amount > 0 ? 'green' : entry.type === 'expire' ? 'amber' : 'red'}`}>{entry.amount > 0 ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}{ledgerType(entry, c)}</span></td>
              <td style={{ color: 'var(--bl-muted)' }}>{entry.description}</td>
              <td className={`num ${entry.amount > 0 ? 'pos' : 'neg'}`} dir="ltr" style={{ textAlign: c.ar ? 'right' : 'left' }}>{entry.amount > 0 ? '+' : ''}{c.num(entry.amount)}</td>
              <td className="num">{c.num(entry.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LedgerModal({ walletId, name, onClose }: { walletId: string; name?: string; onClose: () => void }) {
  const c = useCopy();
  const { data, loading } = useLedger(walletId);
  return (
    <Modal wide title={c.t('Credit history', 'سجل الرصيد')} subtitle={name} icon={<History size={18} />} onClose={onClose}>
      {loading ? <div className="bl-skeleton" /> : <LedgerTable entries={data} compact />}
    </Modal>
  );
}
