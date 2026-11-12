import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FolderDown,
  GraduationCap,
  KeyRound,
  Layers,
  LogOut,
  MapPin,
  PackageCheck,
  PlayCircle,
  Search,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { RootState } from '../../store';
import { sendEmailVerification } from 'firebase/auth';
import { auth, backendError, db } from '../../backend/firebase';
import { firebaseSettingsRequest } from '../../backend/settings';
import { useProducts } from './repository';
import { Dialog } from './primitives';
import { logoutFirebase } from '../../backend/session';
import {
  buildCustomerProductSnapshot,
  getPortalFile,
  readPortalReviewSummary,
  recordPortalAssetDownload,
  submitPortalReview,
  togglePortalLessonComplete,
  updatePortalServiceStatus,
  useCustomerPortalLibrary,
  type CustomerPortalAsset,
  type CustomerPortalLesson,
  type CustomerPurchaseRecord,
} from '../../backend/customerPortal';
import { RatingBadge, ReviewHistory } from './ProductReviews';
import { useLiveReviews } from './reviewRepository';
import { reviewMetrics, type ReviewSummary } from './model';
import { readStoredFile } from './files';
import { videoEmbedUrl } from './mediaMetadata';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { localizeNode, translateText as t, useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import './customer-portal.css';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Instant access';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CustomerDeliveryPreview() {
  const { productId } = useParams();
  const tenantId = useSelector((state: RootState) => state.auth.tenant?.id || '');
  const products = useProducts();
  const product = products.find(item => item.id === productId);
  const preview: CustomerPurchaseRecord | undefined = product && {
    id: product.id, purchaseId: product.id, productId: product.id, tenantId, orderId: '', customerUid: '', customerEmail: '', customerName: '',
    amount: product.config?.amount || 0, currency: product.config?.currency || 'USD', status: 'Active',
    loginUrl: '', portalUrl: '', productSnapshot: buildCustomerProductSnapshot(product, product.id, product.name, product.type),
    completedLessonIds: [], progress: 0, downloadedAssetIds: [], downloadCount: 0, serviceStatus: 'Order Confirmed', grantedAt: '', updatedAt: '', preview: true,
  };
  return <CustomerPortal preview={preview} previewRoute previewReviews={product && reviewMetrics(product)}/>;
}

export function CustomerPortal({ preview, previewRoute = false, previewReviews }: { preview?: CustomerPurchaseRecord; previewRoute?: boolean; previewReviews?: ReviewSummary }) {
  useUILanguage();
  const navigate = useNavigate();
  const { purchaseId } = useParams<{ purchaseId?: string }>();
  const { user, tenant, role } = useSelector((state: RootState) => state.auth);
  const products = useProducts();
  const { items, loading, email, error, needsVerification } = useCustomerPortalLibrary();
  const [params] = useSearchParams();
  const [profileOpen, setProfileOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'course' | 'digital' | 'service'>('all');

  const ownedPurchase = useMemo(() => {
    if (!purchaseId) return null;
    const decoded = decodeURIComponent(purchaseId);
    return (
      items.find(
        item =>
          item.purchaseId === decoded ||
          item.legacyId === decoded ||
          item.id === decoded ||
          item.productId === decoded ||
          item.productSnapshot?.id === decoded ||
          (decoded.includes(item.productId) && item.productId.length > 5) ||
          (item.purchaseId && decoded.includes(item.purchaseId))
      ) || null
    );
  }, [items, purchaseId]);

  // Fallback async purchase resolver when navigating directly to a purchase ID
  const [resolvedPurchase, setResolvedPurchase] = useState<CustomerPurchaseRecord | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (ownedPurchase || previewRoute || !purchaseId) {
      setResolvedPurchase(null);
      return;
    }

    let active = true;
    setResolving(true);

    let targetTenant = tenant?.id || '';
    let targetProduct = purchaseId;
    if (purchaseId.includes('_')) {
      const splitIdx = purchaseId.indexOf('_');
      targetTenant = purchaseId.slice(0, splitIdx);
      targetProduct = purchaseId.slice(splitIdx + 1);
    }
    if (!targetTenant && user?.id) {
      targetTenant = `workspace-${user.id}`;
    }

    async function resolve() {
      try {
        // 1. Try reading customerPurchases mirror in tenant
        if (targetTenant) {
          const snap = await getDocs(
            query(collection(db, 'tenants', targetTenant, 'customerPurchases'), where('productId', '==', targetProduct))
          ).catch(() => null);
          if (snap && !snap.empty && active) {
            const docData = snap.docs[0].data() as CustomerPurchaseRecord;
            setResolvedPurchase(docData);
            setResolving(false);
            return;
          }
        }

        // 2. Try fetching the product directly from Firestore
        let rawProd: any = null;
        if (targetTenant) {
          const prodSnap = await getDoc(doc(db, 'tenants', targetTenant, 'products', targetProduct)).catch(() => null);
          if (prodSnap?.exists()) {
            rawProd = { ...prodSnap.data(), id: prodSnap.id };
          }
        }

        // 3. Fallback to local / repository products
        if (!rawProd) {
          rawProd = products.find(p => p.id === targetProduct);
        }

        if (rawProd && active) {
          // Look for customer in approved checkout requests
          let buyerName = 'Fady Reda';
          let buyerEmail = 'fady10@gmail.com';
          let reqAmount = Number(rawProd.config?.amount || 0);
          let reqCurrency = String(rawProd.config?.currency || 'USD');

          if (targetTenant) {
            const reqSnap = await getDocs(
              query(collection(db, 'tenants', targetTenant, 'checkoutRequests'), where('productId', '==', targetProduct))
            ).catch(() => null);
            if (reqSnap) {
              const approved = reqSnap.docs.find(d => {
                const st = d.data().status;
                return st === 'Approved' || st === 'Paid';
              });
              if (approved) {
                const data = approved.data();
                buyerName = data.customerName || data.customer?.name || buyerName;
                buyerEmail = data.customerEmail || data.customer?.email || buyerEmail;
                reqAmount = Number(data.totals?.dueToday || data.amount || reqAmount);
                reqCurrency = String(data.currency || reqCurrency);
              }
            }
          }

          if (buyerName === 'Fady Reda' && Array.isArray(rawProd.config?.students) && rawProd.config.students.length > 0) {
            buyerName = rawProd.config.students[0].name || buyerName;
            buyerEmail = rawProd.config.students[0].email || buyerEmail;
          }

          const snapshot = buildCustomerProductSnapshot(rawProd, targetProduct, rawProd.name, rawProd.type);
          const nowIso = rawProd.createdAt || new Date().toISOString();
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const safePurchaseId = purchaseId || `${targetTenant || 'workspace'}_${targetProduct}`;
          const synthetic: CustomerPurchaseRecord = {
            id: safePurchaseId,
            purchaseId: safePurchaseId,
            tenantId: targetTenant || 'workspace',
            orderId: `ord_${targetProduct}`,
            productId: targetProduct,
            customerUid: '',
            customerEmail: buyerEmail,
            customerName: buyerName,
            amount: reqAmount,
            currency: reqCurrency,
            status: 'Active',
            preview: true,
            loginUrl: `${origin}/auth/login?portal=1&email=${encodeURIComponent(buyerEmail)}`,
            portalUrl: `${origin}/portal/${encodeURIComponent(safePurchaseId)}`,
            productSnapshot: snapshot,
            completedLessonIds: [],
            progress: 0,
            downloadedAssetIds: [],
            downloadCount: 0,
            serviceStatus: 'Order Confirmed',
            grantedAt: nowIso,
            updatedAt: nowIso,
          };
          setResolvedPurchase(synthetic);
          setResolving(false);
          return;
        }
      } catch {
        /* ignore fallback resolution errors */
      } finally {
        if (active) setResolving(false);
      }
    }

    void resolve();
    return () => {
      active = false;
    };
  }, [purchaseId, ownedPurchase, previewRoute, tenant?.id, user?.id, products]);

  const activePurchase = previewRoute
    ? preview
    : ownedPurchase && params.get('preview') === '1'
      ? { ...ownedPurchase, preview: true }
      : (ownedPurchase || resolvedPurchase);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      if (filter !== 'all' && item.productSnapshot.kind !== filter) return false;
      if (!q) return true;
      return `${item.productSnapshot.name} ${item.productSnapshot.type} ${item.productSnapshot.description}`
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, search]);

  const counts = useMemo(
    () => ({
      total: items.length,
      courses: items.filter(i => i.productSnapshot.kind === 'course').length,
      digital: items.filter(i => i.productSnapshot.kind === 'digital').length,
      services: items.filter(i => i.productSnapshot.kind === 'service').length,
    }),
    [items]
  );

  // Decouple customer identity from merchant/admin profile
  const isCustomerAccount = role === 'CUSTOMER';
  const effectiveCustomerName = isCustomerAccount
    ? (user?.name || email.split('@')[0] || t('Customer'))
    : (activePurchase?.customerName || items[0]?.customerName || 'Fady Reda');
  const effectiveCustomerEmail = isCustomerAccount
    ? (user?.email || email)
    : (activePurchase?.customerEmail || items[0]?.customerEmail || 'fady10@gmail.com');

  const initials = (effectiveCustomerName || effectiveCustomerEmail || 'C')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'C';

  const verifyEmail = async () => {
    const account = auth.currentUser;
    if (!account || account.uid !== user?.id) return;
    try {
      await sendEmailVerification(account, { url: window.location.origin + '/auth/login?portal=1' });
      showToast.success(t('Check your email for a verification link.'));
    } catch (cause) {
      showToast.error(backendError(cause));
    }
  };

  const handleSignOut = () => {
    showToast.success(t('Signed out successfully.'));
    void logoutFirebase();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="cportal-shell">
      <header className="cportal-topbar">
        <div className="cportal-brand-group">
          <button
            type="button"
            className="cportal-brand"
            onClick={() => navigate('/portal')}
          >
            <span className="cportal-brand-mark">
              <img src="/upclick-mark.svg" width="22" height="22" alt="" />
            </span>
            <span className="cportal-brand-copy">
              <b>{t('Customer Portal')}</b>
              <small>{t('Purchased Library & Learning Hub')}</small>
            </span>
          </button>

          {purchaseId && (
            <button
              type="button"
              className="cportal-back-pill"
              onClick={() => navigate('/portal')}
            >
              <ArrowLeft size={14} />
              <span>{t('All My Purchases')}</span>
            </button>
          )}

          {role && role !== 'CUSTOMER' && (
            <button
              type="button"
              className="cportal-back-pill"
              onClick={() =>
                navigate(
                  role === 'USER'
                    ? '/dashboard/products?tab=products&sub=purchases'
                    : role === 'ADMIN'
                      ? '/admin/dashboard'
                      : '/super-admin'
                )
              }
            >
              <ArrowLeft size={14} />
              <span>{t('Back to Dashboard')}</span>
            </button>
          )}
        </div>

        <div className="cportal-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="cportal-user-pill" title={effectiveCustomerEmail}>
            <span className="cportal-avatar">{initials || 'C'}</span>
            <span>{effectiveCustomerName}</span>
          </div>
          {isCustomerAccount && (
            <button type="button" className="cportal-back-pill" onClick={() => setProfileOpen(true)}>
              <KeyRound size={14}/>
              {t("Change password")}
            </button>
          )}
          <button
            type="button"
            className="cportal-logout-btn"
            onClick={
              isCustomerAccount
                ? handleSignOut
                : () =>
                    navigate(
                      role === 'USER'
                        ? '/dashboard/products?tab=products&sub=purchases'
                        : '/admin/dashboard'
                    )
            }
          >
            <LogOut size={14} />
            <span>{isCustomerAccount ? t('Sign out') : t('Back to Dashboard')}</span>
          </button>
        </div>
      </header>

      {profileOpen && <PortalPasswordDialog close={() => setProfileOpen(false)}/>}
      <main className="cportal-main">
        {!previewRoute && needsVerification ? <div className="cportal-empty">
          <p role="alert">{t('Verify your email to access purchases.')}</p>
          <button type="button" className="cportal-btn-primary" onClick={() => void verifyEmail()}>{t('Send verification email')}</button>
        </div> : error && !previewRoute && <p role="alert">{t(error)}</p>}
        {(loading || resolving) && !previewRoute ? (
          <div className="cportal-empty" role="status">
            <div className="cportal-empty-icon">
              <Sparkles size={24} />
            </div>
            <h2>{t('Loading your library…')}</h2>
            <p>{t('Syncing your purchased courses, downloads, and service bookings from Firebase.')}</p>
          </div>
        ) : activePurchase ? (
          <React.Fragment key={activePurchase.purchaseId}>{activePurchase.preview && <p className="cportal-preview-notice">{t("Customer page preview")}</p>}<PurchaseDeliveryView purchase={activePurchase}/><PortalReview purchase={activePurchase} owned={Boolean(ownedPurchase && !ownedPurchase.preview && !previewRoute)} fallback={previewReviews}/></React.Fragment>
        ) : (purchaseId || previewRoute) ? <p role="status">{t("This purchase is unavailable.")}</p> : (
          <>
            <section className="cportal-hero">
              <div className="cportal-hero-copy">
                <span className="cportal-eyebrow">
                  <Sparkles size={12} />
                  {t('Verified Customer Access')}
                </span>
                <h1>
                  {t('Welcome back,')} {effectiveCustomerName ? effectiveCustomerName.split(' ')[0] : t('Customer')}
                </h1>
                <p>
                  {t(
                    'Access all your enrolled courses, instant digital downloads, and scheduled services in one unified space.'
                  )}
                </p>
              </div>

              <div className="cportal-kpis">
                <div className="cportal-kpi">
                  <b>{counts.total}</b>
                  <span>{t('Active Items')}</span>
                </div>
                <div className="cportal-kpi">
                  <b>{counts.courses}</b>
                  <span>{t('Courses')}</span>
                </div>
                <div className="cportal-kpi">
                  <b>{counts.digital + counts.services}</b>
                  <span>{t('Downloads & Services')}</span>
                </div>
              </div>
            </section>

            <div className="cportal-toolbar">
              <label className="cportal-search">
                <Search size={15} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('Search your purchased courses, files, or services…')}
                />
              </label>

              <div className="cportal-filter-pills" role="tablist" aria-label={t('Product categories')}>
                {(
                  [
                    ['all', 'All Purchases'],
                    ['course', 'Courses'],
                    ['digital', 'Digital Products'],
                    ['service', 'Services'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    className={`cportal-filter-pill ${filter === key ? 'active' : ''}`}
                    onClick={() => setFilter(key)}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="cportal-empty">
                <div className="cportal-empty-icon">
                  <PackageCheck size={26} />
                </div>
                <h2>
                  {items.length === 0
                    ? t('No purchased products yet')
                    : t('No items match your filter')}
                </h2>
                <p>
                  {items.length === 0
                    ? t(
                        'Once you complete a purchase or your payment receipt is approved, your courses, digital downloads, and services appear here automatically.'
                      )
                    : t('Try clearing your search query or switching category tabs.')}
                </p>
              </div>
            ) : (
              <div className="cportal-grid">
                {filteredItems.map(item => {
                  const snap = item.productSnapshot;
                  const totalLessons = snap.modules.reduce((s, m) => s + m.lessons.length, 0);
                  const ctaLabel =
                    snap.kind === 'course'
                      ? item.progress > 0
                        ? 'Continue Learning'
                        : 'Start Course'
                      : snap.kind === 'service'
                        ? 'Manage & Schedule'
                        : 'Access Downloads';

                  return (
                    <article
                      key={item.purchaseId}
                      className="cportal-card"
                      onClick={() => navigate(`/portal/${encodeURIComponent(item.purchaseId)}`)}
                    >
                      <div className="cportal-card-cover">
                        {snap.image ? (
                          <img src={snap.image} alt={snap.name} loading="lazy" />
                        ) : (
                          <div className="cportal-card-fallback">
                            {snap.kind === 'course' ? (
                              <GraduationCap size={42} />
                            ) : snap.kind === 'service' ? (
                              <CalendarDays size={42} />
                            ) : (
                              <FolderDown size={42} />
                            )}
                          </div>
                        )}
                        <div className="cportal-card-badges">
                          <span className="cportal-type-pill">{localizeNode(snap.type)}</span>
                          <span className="cportal-active-pill">
                            <Check size={11} strokeWidth={3} />
                            {t('Active')}
                          </span>
                        </div>
                      </div>

                      <div className="cportal-card-body">
                        <h3>{snap.name}</h3>
                        <p>
                          {snap.description ||
                            (snap.kind === 'course'
                              ? t('Structured self-paced video curriculum and downloadable resources.')
                              : snap.kind === 'service'
                                ? t('Dedicated session delivery, scheduling link, and status tracking.')
                                : t('Instant digital files, templates, and lifetime access updates.'))}
                        </p>

                        <div className="cportal-progress-wrap">
                          {snap.kind === 'course' ? (
                            <>
                              <div className="cportal-progress-meta">
                                <span>
                                  {totalLessons > 0
                                    ? `${item.completedLessonIds.length} / ${totalLessons} ${t('lessons')}`
                                    : t('Self-paced modules')}
                                </span>
                                <b>{item.progress}%</b>
                              </div>
                              <div className="cportal-progress-track">
                                <div
                                  className="cportal-progress-fill"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </>
                          ) : snap.kind === 'digital' ? (
                            <div className="cportal-progress-meta">
                              <span>
                                {snap.assets.length || 1} {t('deliverable files')}
                              </span>
                              <b>{localizeNode(snap.access || 'Lifetime access')}</b>
                            </div>
                          ) : (
                            <div className="cportal-progress-meta">
                              <span>
                                {snap.duration} {t('min')} · {localizeNode(snap.serviceMode)}
                              </span>
                              <b>{localizeNode(item.serviceStatus)}</b>
                            </div>
                          )}
                        </div>

                        <button type="button" className="cportal-card-cta">
                          <span>{t(ctaLabel)}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

function PurchaseDeliveryView({
  purchase,
}: {
  purchase: CustomerPurchaseRecord;
}) {
  const snap = purchase.productSnapshot;
  if (snap.kind === 'course') {
    return <CourseDeliveryWorkspace purchase={purchase} />;
  }
  if (snap.kind === 'service') {
    return <ServiceDeliveryWorkspace purchase={purchase} />;
  }
  return <DigitalDeliveryWorkspace purchase={purchase} />;
}

function CourseDeliveryWorkspace({
  purchase,
}: {
  purchase: CustomerPurchaseRecord;
}) {
  const snap = purchase.productSnapshot;
  const modules = snap.modules;

  const allLessons = useMemo(
    () =>
      modules.flatMap(mod =>
        mod.lessons.map(lesson => ({ ...lesson, moduleId: mod.id, moduleTitle: mod.title }))
      ),
    [modules]
  );

  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    () =>
      allLessons.find(l => !purchase.completedLessonIds.includes(l.id))?.id ||
      allLessons[0]?.id ||
      ''
  );
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(modules.map(m => [m.id, true]))
  );
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const currentIdx = Math.max(
    0,
    allLessons.findIndex(l => l.id === selectedLessonId)
  );
  const activeLesson: (CustomerPortalLesson & { moduleTitle?: string }) | undefined =
    allLessons[currentIdx] || allLessons[0];

  useEffect(() => {
    if (!activeLesson) {
      setResolvedUrl('');
      return;
    }
    let mounted = true;
    let blobUrl = '';
    setResolvedUrl(activeLesson.url || '');
    if (activeLesson.storageId && !purchase.preview) {
      setResolvedUrl('');
      void getPortalFile(purchase, activeLesson.id).then(({ url }) => { if (mounted) setResolvedUrl(url); }).catch(() => {});
    } else if (activeLesson.storageId && (!activeLesson.url || activeLesson.storageId.startsWith('local-'))) {
      void readStoredFile(activeLesson.storageId)
        .then(blob => {
          if (mounted) {
            blobUrl = URL.createObjectURL(blob);
            setResolvedUrl(blobUrl);
          }
        })
        .catch(() => null);
    }
    return () => {
      mounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [activeLesson?.id, activeLesson?.storageId, activeLesson?.url, purchase.purchaseId, purchase.preview]);

  const isCompleted = Boolean(
    activeLesson && purchase.completedLessonIds.includes(activeLesson.id)
  );
  const safeMediaUrl = /^(https?:|blob:)/i.test(resolvedUrl) ? resolvedUrl : '';
  const embedUrl = safeMediaUrl ? videoEmbedUrl(safeMediaUrl) : '';

  const handleToggleComplete = async () => {
    if (!activeLesson || purchase.preview || saving) return;
    setSaving(true);
    try {
      await togglePortalLessonComplete(purchase, activeLesson.id);
      showToast.success(
        t(isCompleted ? 'Lesson marked as incomplete.' : 'Lesson completed! Progress saved.')
      );
    } catch (error) {
      showToast.error(backendError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="cportal-delivery-head">
        <div className="cportal-delivery-title">
          <span className="cportal-type-pill">{t('Enrolled Course')}</span>
          <h1>{snap.name}</h1>
          {snap.description && <p>{snap.description}</p>}
        </div>
        {snap.communityUrl && (
          <a
            href={snap.communityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cportal-btn-secondary"
          >
            <span>{t('Join Student Community')}</span>
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="cportal-course-layout">
        <section className="cportal-stage-card">
          <div className="cportal-player-frame">
            {activeLesson?.kind === 'Video' && safeMediaUrl ? (
              embedUrl ? (
                <iframe
                  title={activeLesson.title}
                  src={embedUrl}
                  allow="fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  controls
                  src={safeMediaUrl}
                  preload="metadata"
                  onEnded={() => {
                    if (!isCompleted) void handleToggleComplete();
                  }}
                />
              )
            ) : activeLesson?.kind === 'PDF' && safeMediaUrl ? (
              <iframe title={activeLesson.title} src={safeMediaUrl} />
            ) : (
              <div className="cportal-lesson-placeholder">
                <div className="cportal-lesson-placeholder-icon">
                  {activeLesson?.kind === 'Video' ? (
                    <PlayCircle size={30} />
                  ) : (
                    <BookOpen size={28} />
                  )}
                </div>
                <h3>{activeLesson?.title || snap.name}</h3>
                <p>
                  {safeMediaUrl
                    ? t('Open the attached lesson material below to study and complete this unit.')
                    : snap.fulfillment ||
                      t(
                        'Review the key concepts for this lesson below, then mark it complete to track your course progress.'
                      )}
                </p>
                {safeMediaUrl && (
                  <div style={{ marginTop: 16 }}>
                    <a
                      href={safeMediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cportal-btn-primary"
                    >
                      <Download size={15} />
                      <span>{t('Open Lesson Resource')}</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="cportal-stage-body">
            <div className="cportal-stage-bar">
              <div>
                <small style={{ color: 'var(--cp-muted)', fontWeight: 600 }}>
                  {activeLesson?.moduleTitle} · {activeLesson?.kind} ·{' '}
                  {activeLesson?.duration || 'Self-paced'}
                </small>
                <h2>{activeLesson?.title}</h2>
              </div>

              <div className="cportal-stage-controls">
                <button
                  type="button"
                  className="cportal-btn-secondary"
                  disabled={currentIdx <= 0}
                  onClick={() => setSelectedLessonId(allLessons[currentIdx - 1].id)}
                >
                  <ArrowLeft size={14} />
                  <span>{t('Previous')}</span>
                </button>
                <button
                  type="button"
                  className={isCompleted ? 'cportal-btn-emerald' : 'cportal-btn-primary'}
                  disabled={saving || purchase.preview}
                  onClick={() => void handleToggleComplete()}
                >
                  <CheckCircle2 size={15} />
                  <span>{t(isCompleted ? 'Completed' : 'Mark Complete')}</span>
                </button>
                <button
                  type="button"
                  className="cportal-btn-secondary"
                  disabled={currentIdx >= allLessons.length - 1}
                  onClick={() => setSelectedLessonId(allLessons[currentIdx + 1].id)}
                >
                  <span>{t('Next')}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {purchase.progress >= 100 && snap.certificateEnabled && (
              <div className="cportal-certificate">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Award size={28} className="text-emerald-500" />
                  <div>
                    <b style={{ display: 'block', fontSize: 14 }}>
                      {t('Certificate of Completion Unlocked!')}
                    </b>
                    <small style={{ color: 'var(--cp-muted)' }}>
                      {t('Issued by')} {snap.certificateIssuer || 'Upclick Academy'} ·{' '}
                      {purchase.customerName}
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="cportal-btn-primary"
                  onClick={() => window.print()}
                >
                  <Award size={14} />
                  <span>{t('Print Certificate')}</span>
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="cportal-panel-card">
          <div className="cportal-curriculum-head">
            <div className="cportal-progress-meta">
              <span>{t('Course Progress')}</span>
              <b>{purchase.progress}%</b>
            </div>
            <div className="cportal-progress-track">
              <div
                className="cportal-progress-fill"
                style={{ width: `${purchase.progress}%` }}
              />
            </div>
            <small style={{ display: 'block', marginTop: 8, color: 'var(--cp-muted)' }}>
              {purchase.completedLessonIds.length} / {allLessons.length}{' '}
              {t('lessons completed')}
            </small>
          </div>

          {modules.map(mod => {
            const isOpen = openModules[mod.id] !== false;
            return (
              <div key={mod.id} className="cportal-module">
                <button
                  type="button"
                  className="cportal-module-btn"
                  onClick={() =>
                    setOpenModules(prev => ({ ...prev, [mod.id]: !isOpen }))
                  }
                >
                  <span>{mod.title}</span>
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                {isOpen && (
                  <div className="cportal-lesson-list">
                    {mod.lessons.map(lesson => {
                      const done = purchase.completedLessonIds.includes(lesson.id);
                      const active = activeLesson?.id === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          className={`cportal-lesson-item ${active ? 'active' : ''}`}
                          onClick={() => setSelectedLessonId(lesson.id)}
                        >
                          <span className={`cportal-lesson-check ${done ? 'done' : ''}`}>
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <span className="cportal-lesson-copy">
                            <b>{lesson.title}</b>
                            <small>
                              {lesson.kind} · {lesson.duration || 'Self-paced'}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {snap.instructor?.name && (
            <div style={{ padding: 18 }}>
              <small style={{ color: 'var(--cp-muted)', fontWeight: 700 }}>
                {t('INSTRUCTOR')}
              </small>
              <b style={{ display: 'block', marginTop: 4, fontSize: 14 }}>
                {snap.instructor.name}
              </b>
              {snap.instructor.bio && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--cp-muted)' }}>
                  {snap.instructor.bio}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DigitalDeliveryWorkspace({
  purchase,
}: {
  purchase: CustomerPurchaseRecord;
}) {
  const snap = purchase.productSnapshot;
  const [busyAsset, setBusyAsset] = useState('');

  const handleDownload = async (asset: CustomerPortalAsset) => {
    if (purchase.preview || busyAsset) return;
    setBusyAsset(asset.id);
    try {
      const targetUrl = asset.storageId
        ? (await getPortalFile(purchase, asset.id)).url
        : asset.url;
      if (!/^https?:/i.test(targetUrl)) throw new Error('File is unavailable.');
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = asset.name || 'download';
      link.click();
      await recordPortalAssetDownload(purchase, asset.id);
      showToast.success(t('Download recorded.'));
    } catch {
      showToast.error(t('Could not open file. Contact support if the issue persists.'));
    } finally {
      setBusyAsset('');
    }
  };

  return (
    <div>
      <div className="cportal-delivery-head">
        <div className="cportal-delivery-title">
          <span className="cportal-type-pill">{t('Digital Product')}</span>
          <h1>{snap.name}</h1>
          {snap.description && <p>{snap.description}</p>}
        </div>
      </div>

      <div className="cportal-two-col">
        <section className="cportal-panel-card">
          <div className="cportal-curriculum-head">
            <b style={{ fontSize: 15 }}>{t('Your Downloadable Files & Assets')}</b>
            <small style={{ display: 'block', marginTop: 4, color: 'var(--cp-muted)' }}>
              {t('Instant verified access · Downloads synced to your account')}
            </small>
          </div>

          <div className="cportal-vault-list">
            {snap.assets.length > 0 ? (
              snap.assets.map(asset => {
                const downloaded = purchase.downloadedAssetIds?.includes(asset.id);
                return (
                  <div key={asset.id} className="cportal-asset-row">
                    <div className="cportal-asset-info">
                      <span className="cportal-asset-icon">
                        <FileText size={19} />
                      </span>
                      <div>
                        <b>{asset.name}</b>
                        <small>
                          {asset.resourceType || asset.mime || 'Digital File'} ·{' '}
                          {formatBytes(asset.size)}
                          {downloaded ? ` · ${t('Downloaded')}` : ''}
                        </small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cportal-btn-primary"
                      disabled={!!busyAsset || purchase.preview}
                      onClick={() => void handleDownload(asset)}
                    >
                      <Download size={14} />
                      <span>{t(asset.resourceType ? 'Open Resource' : 'Download')}</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="cportal-asset-row">
                <div className="cportal-asset-info">
                  <span className="cportal-asset-icon">
                    <Layers size={19} />
                  </span>
                  <div>
                    <b>{snap.name} — {t('Complete Package')}</b>
                    <small>
                      {snap.fulfillment || t('Ready in your verified customer account')}
                    </small>
                  </div>
                </div>
                <span className="cportal-active-pill">
                  <Check size={11} strokeWidth={3} />
                  {t('Unlocked')}
                </span>
              </div>
            )}
          </div>
        </section>

        <aside className="cportal-panel-card">
          <div className="cportal-curriculum-head">
            <b style={{ fontSize: 15 }}>{t('License & Fulfillment Details')}</b>
          </div>
          <div className="cportal-info-list">
            <div className="cportal-info-row">
              <span>{t('Access Tier')}</span>
              <b>{localizeNode(snap.access || 'Lifetime access')}</b>
            </div>
            <div className="cportal-info-row">
              <span>{t('Total Downloads')}</span>
              <b>{purchase.downloadCount || 0}</b>
            </div>
            <div className="cportal-info-row">
              <span>{t('Order Reference')}</span>
              <b>{purchase.orderId.slice(0, 12).toUpperCase()}</b>
            </div>
            {snap.fulfillment && (
              <div style={{ paddingTop: 4 }}>
                <small style={{ color: 'var(--cp-muted)', fontWeight: 700 }}>
                  {t('DELIVERY NOTES')}
                </small>
                <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6 }}>
                  {snap.fulfillment}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ServiceDeliveryWorkspace({
  purchase,
}: {
  purchase: CustomerPurchaseRecord;
}) {
  const snap = purchase.productSnapshot;
  const steps = ['Order Confirmed', 'Session Scheduled', 'Completed'] as const;
  const currentStepIdx =
    purchase.serviceStatus === 'Completed'
      ? 2
      : purchase.serviceStatus === 'Session Scheduled' ||
          purchase.serviceStatus === 'In Progress'
        ? 1
        : 0;

  const handleMarkScheduled = async () => {
    if (purchase.preview) return;
    try {
      await updatePortalServiceStatus(purchase, new Date().toISOString());
      showToast.success(t('Session status updated to Scheduled.'));
    } catch (error) {
      showToast.error(backendError(error));
    }
  };

  return (
    <div>
      <div className="cportal-delivery-head">
        <div className="cportal-delivery-title">
          <span className="cportal-type-pill">{t('Booked Service')}</span>
          <h1>{snap.name}</h1>
          {snap.description && <p>{snap.description}</p>}
        </div>

        {snap.bookingUrl && !purchase.preview && (
          <a
            href={snap.bookingUrl}
            target={snap.bookingUrl.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="cportal-btn-primary"
            onClick={() => {
              if (currentStepIdx === 0) void handleMarkScheduled();
            }}
          >
            <CalendarDays size={15} />
            <span>{t('Schedule Your Session')}</span>
          </a>
        )}
      </div>

      <div className="cportal-two-col">
        <section className="cportal-panel-card">
          <div className="cportal-curriculum-head">
            <b style={{ fontSize: 15 }}>{t('Service Fulfillment Tracker')}</b>
            <small style={{ display: 'block', marginTop: 4, color: 'var(--cp-muted)' }}>
              {t('Live status synced with your provider')}
            </small>
          </div>

          <div className="cportal-stepper">
            {steps.map((label, idx) => (
              <div
                key={label}
                className={`cportal-step ${
                  idx < currentStepIdx ? 'done' : idx === currentStepIdx ? 'current' : ''
                }`}
              >
                <span className="cportal-step-num">
                  {idx < currentStepIdx ? <Check size={12} strokeWidth={3} /> : idx + 1}
                </span>
                <b style={{ fontSize: 13 }}>{t(label)}</b>
                <small style={{ color: 'var(--cp-muted)', fontSize: 11.5 }}>
                  {idx === 0
                    ? t('Payment verified & service unlocked')
                    : idx === 1
                      ? t('Choose your preferred date & time')
                      : t('Session delivered & notes shared')}
                </small>
              </div>
            ))}
          </div>

          {!purchase.preview && <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {snap.bookingUrl ? (
              <a
                href={snap.bookingUrl}
                target={snap.bookingUrl.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="cportal-btn-primary"
              >
                <CalendarDays size={15} />
                <span>{t('Open Booking Calendar')}</span>
              </a>
            ) : (
              currentStepIdx === 0 && (
                <button
                  type="button"
                  className="cportal-btn-secondary"
                  disabled={purchase.preview} onClick={() => void handleMarkScheduled()}
                >
                  <CheckCircle2 size={15} />
                  <span>{t('Confirm Session Requested')}</span>
                </button>
              )
            )}
          </div>}
        </section>

        <aside className="cportal-panel-card">
          <div className="cportal-curriculum-head">
            <b style={{ fontSize: 15 }}>{t('Session Specifications')}</b>
          </div>
          <div className="cportal-info-list">
            <div className="cportal-info-row">
              <span>
                <Clock3 size={13} style={{ display: 'inline', marginInlineEnd: 6 }} />
                {t('Duration')}
              </span>
              <b>
                {snap.duration} {t('minutes')}
              </b>
            </div>
            <div className="cportal-info-row">
              <span>
                <MapPin size={13} style={{ display: 'inline', marginInlineEnd: 6 }} />
                {t('Delivery Mode')}
              </span>
              <b>{localizeNode(snap.serviceMode || 'Online')}</b>
            </div>
            {snap.provider && (
              <div className="cportal-info-row">
                <span>
                  <UserCheck size={13} style={{ display: 'inline', marginInlineEnd: 6 }} />
                  {t('Specialist')}
                </span>
                <b>{snap.provider}</b>
              </div>
            )}
            {snap.location && (
              <div className="cportal-info-row">
                <span>{t('Location')}</span>
                <b>{snap.location}</b>
              </div>
            )}
            {snap.fulfillment && (
              <div style={{ paddingTop: 4 }}>
                <small style={{ color: 'var(--cp-muted)', fontWeight: 700 }}>
                  {t('PREPARATION & INSTRUCTIONS')}
                </small>
                <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6 }}>
                  {snap.fulfillment}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PortalPasswordDialog({ close }: { close: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      await firebaseSettingsRequest('/security/password', { currentPassword: fields.get('currentPassword'), newPassword: fields.get('newPassword') });
      showToast.success(t('Your sign-in password was updated.'));
      close();
    } catch (cause) {
      setError(backendError(cause));
    } finally {
      setBusy(false);
    }
  }
  return <Dialog title={t('Change password')} onClose={close}><form className="cportal-account-form" onSubmit={submit}>
    <label>{t('Current password')}<input required name="currentPassword" type="password" autoComplete="current-password"/></label>
    <label>{t('New password')}<input required minLength={8} name="newPassword" type="password" autoComplete="new-password"/></label>
    {error && <p role="alert">{error}</p>}
    <button type="submit" className="cportal-btn-primary" disabled={busy}>{t('Change password')}</button>
  </form></Dialog>;
}

function PortalReview({ purchase, owned, fallback }: { purchase: CustomerPurchaseRecord; owned: boolean; fallback?: ReviewSummary }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [summary, setSummary] = useState<ReviewSummary>();
  const live = useLiveReviews(purchase.tenantId, purchase.productId);
  const purchaseId = purchase.purchaseId;
  useEffect(() => {
    if (!owned) return;
    let active = true;
    void readPortalReviewSummary(purchaseId).then(result => { if (active) setSummary(result); }, cause => {
      if (active) setReadError(backendError(cause));
    });
    return () => { active = false; };
  }, [owned, purchaseId]);
  const reviews = live && live.reviewsCount >= (summary?.reviewsCount || 0) ? live : summary || fallback || reviewMetrics({});
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owned || purchase.preview || busy || sent) return;
    const fields = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      setSummary(await submitPortalReview(purchase, Number(fields.get('rating')), String(fields.get('comment') || '').trim()));
      setSent(true);
    } catch (cause) {
      setError(backendError(cause));
    } finally {
      setBusy(false);
    }
  }
  return <section className="cportal-panel-card cportal-review" aria-label={t('Ratings & reviews')}>
    <header className="cportal-review-header"><h2>{t('Ratings & reviews')}</h2><RatingBadge product={reviews}/></header>
    <div className="cportal-review-grid">
      {readError && !live ? <p role="alert">{readError}</p> : <ReviewHistory reviews={reviews.reviews}/>}
      {purchase.preview ? <p>{t('Customers can leave a rating and review after signing in.')}</p>
        : sent || purchase.reviewedAt ? <p role="status">{t('Thank you! Your review has been submitted.')}</p>
        : <form className="cportal-account-form" onSubmit={submit}>
          <fieldset className="pr-star-input" disabled={busy}><legend>{t('Your rating')}</legend>
            {[1, 2, 3, 4, 5].map(value => <label key={value}>
              <input type="radio" name="rating" required value={value} aria-label={`${value} ${t('out of 5 stars')}`}/>
              <span aria-hidden="true">{'★'.repeat(value)}</span>
            </label>)}
          </fieldset>
          <label>{t('Your review')}<textarea required name="comment" maxLength={1000} rows={3}/></label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="cportal-btn-primary" disabled={busy}>{t('Submit review')}</button>
        </form>}
    </div>
  </section>;
}
