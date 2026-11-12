import { defaultConfig, formatPrice as formatProductPrice } from './commerce/model';
import { useCurrency } from '../context/CurrencyContext';
import { thumbnailImageProps } from '../utils/thumbnailImages';
import { usePaymentMethods } from '../backend/paymentMethods';
import { formatDisplayMessage, useUILanguage, localizeNode, translateText } from '../i18n/display';
import { ProductCardActions } from './commerce/ProductCardActions';
import { ProductQuickView } from './commerce/ProductQuickView';
import { QuickDetails } from '../components/ui/QuickDetails';
import { showToast } from '../utils/toast';
import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CommerceSelect } from '../components/ui/CommerceSelect';
import { WorkspaceSettings } from './commerce/WorkspaceSettings';
import { CommerceRecords } from './commerce/CommerceRecords';
import { CheckoutRequests } from './commerce/CheckoutRequests';
import { DiscountsWorkspace } from './DiscountsWorkspace';

import { useTransactions } from './commerce/transactions';
import { usePurchasedProducts } from './commerce/purchases';
import { useCustomerPortalLibrary, type CustomerPurchaseRecord } from '../backend/customerPortal';

import {
  ArrowRight,
  ArrowUpDown,
  Box,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardList,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Grid2X2,
  LayoutGrid,
  Mail,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
  User,
  UserRound,
  UserRoundCheck,
  Users,
  UsersRound,
} from 'lucide-react';
import type { Product, StatKind } from './commerce/model';
import { productPreviewToken, writePreview } from './commerce/previewSnapshot';
import { useProducts } from './commerce/repository';
import './products-payments.css';
import './products-payments-overrides.css';
import './commerce/commerce-enhancements.css';
import './commerce/checkout-requests.css';

const statIcons: Record<StatKind, React.ElementType> = {
  sales: UsersRound,
  revenue: Clock3,
  bookings: CalendarDays,
  members: UserRound,
};

type Props = {
  notify: (message: string) => void;
  showModal?: boolean;
  setShowModal?: (show: boolean) => void;
};

const productTabs = [
  ['Products', ShoppingBag],

  ['Transactions', Receipt],
  ['Orders', FileText],
  ['Requests', ClipboardList],
  ['Customers', Users],
  ['Payments', CreditCard],
  ['Discounts', SlidersHorizontal],
  ['Settings', Settings],
] as const;

const metricData = [
  ['All Products', 'All your products', Box, 'violet', 'All Types'],
  ['Digital Products', 'Files, templates and assets', FileText, 'blue', 'Digital Product'],
  ['Services', 'Consulting and coaching', UserRoundCheck, 'green', 'Service'],
  ['Courses', 'Lessons and learning', Users, 'orange', 'Course'],
] as const;

export const ProductsPayments: React.FC<Props> = ({ notify, showModal = false, setShowModal }) => {
  useUILanguage();
  const [tabParams, setTabParams] = useSearchParams();
  const navigate = useNavigate();
  const products = useProducts();

  const { isPurchased } = usePurchasedProducts();
  const { items: portalItems } = useCustomerPortalLibrary();

  const portalById = useMemo(() => {
    const map = new Map<string, CustomerPurchaseRecord>();
    for (const item of portalItems) {
      if (item.purchaseId) map.set(item.purchaseId, item);
      if (item.productId) map.set(item.productId, item);
      if (item.id) map.set(item.id, item);
    }
    return map;
  }, [portalItems]);

  const rawTab = tabParams.get('tab')?.toLowerCase();
  const selectedTab = useMemo(() => {
    if (!rawTab || rawTab === 'products' || rawTab === 'my-products' || rawTab === 'my-purchases') {
      return 'Products';
    }

    if (rawTab === 'transactions') return 'Transactions';
    if (rawTab === 'payments') return 'Payments';
    if (rawTab === 'orders') return 'Orders';
    if (rawTab === 'requests') return 'Requests';
    if (rawTab === 'customers') return 'Customers';
    if (rawTab === 'discounts') return 'Discounts';
    if (rawTab === 'settings') return 'Settings';
    return 'Products';
  }, [rawTab]);

  // Horizontal Sub-View inside Products: 'all' vs 'purchases'
  const subParam = tabParams.get('sub')?.toLowerCase();
  const activeSubTab = useMemo(() => {
    if (rawTab === 'my-purchases' || subParam === 'purchases' || subParam === 'purchased') {
      return 'purchases';
    }
    return 'all';
  }, [rawTab, subParam]);

  const [search, setSearch] = useState('');
  const [type, setType] = useState('All Types');
  const [status, setStatus] = useState('All Status');
  const [sort, setSort] = useState('Newest First');
  const [view, setView] = useState<'Grid' | 'List'>('Grid');
  const [, setFilterMetric] = useState('All Products');

  React.useEffect(() => {
    if (showModal) {
      setShowModal?.(false);
      navigate('/dashboard/products-payments/products/new');
    }
  }, [showModal, setShowModal, navigate]);

  // Pre-calculate counts for sub-view tabs
  const allProductsCount = products.length;
  const purchasedProducts = useMemo(() => {
    const purchased: Product[] = [];
    for (const entry of portalItems) {
      const snap = entry.productSnapshot;
      if (!snap) continue;
      const cfg = defaultConfig(snap.type, String(entry.amount || 0));
      cfg.amount = Number(entry.amount || 0);
      cfg.currency = entry.currency || 'USD';
      cfg.duration = snap.duration || 60;
      cfg.assets = (snap.assets || []).map(asset => ({
        id: asset.id,
        name: asset.name,
        url: asset.url,
        storageId: asset.storageId,
        size: asset.size,
        mime: asset.mime,
      }));
      cfg.modules = (snap.modules || []).map(mod => ({
        id: mod.id,
        title: mod.title,
        lessons: mod.lessons,
      }));
      purchased.push({
        id: entry.purchaseId,
        name: snap.name,
        type: snap.type,
        price: `${entry.currency || '$'}${entry.amount || 0}`,
        stats: [],
        status: 'Active',
        sales: '1',
        revenue: '0',
        art: snap.kind === 'course' ? 'course' : snap.kind === 'service' ? 'service' : 'digital',
        image: snap.image || undefined,
        tag: snap.type,
        description: snap.description || '',
        config: cfg,
        createdAt: entry.grantedAt,
      });
    }

    return purchased;
  }, [portalItems]);
  const purchasedProductsCount = purchasedProducts.length;

  // Compute products according to active view
  const baseProducts = useMemo(() => {
    if (selectedTab === 'Products') {
      if (activeSubTab === 'purchases') {
        return purchasedProducts;
      }
      return products;
    }
    return products;
  }, [selectedTab, activeSubTab, products, purchasedProducts]);

  const displayed = useMemo(() => {
    return baseProducts
      .filter(
        p =>
          (type === 'All Types' || p.type === type) &&
          (activeSubTab === 'purchases' || status === 'All Status' || p.status === status) &&
          `${p.name} ${p.type}`.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) =>
        sort === 'A to Z'
          ? a.name.localeCompare(b.name)
          : sort === 'Price: Low to High'
          ? (a.config?.amount ?? 0) - (b.config?.amount ?? 0)
          : Number(new Date(b.createdAt ?? 0)) - Number(new Date(a.createdAt ?? 0))
      );
  }, [baseProducts, type, activeSubTab, status, search, sort]);

  const handleTabChange = (name: string) => {
    const slug = name.toLowerCase().replace(' ', '-');
    setTabParams(current => {
      const next = new URLSearchParams(current);
      next.set('tab', slug);
      if (slug !== 'products') {
        next.delete('sub');
      }
      return next;
    });
    if (name !== 'Products' && name !== 'Discounts') {
      notify(`${name} view selected.`);
    }
  };

  const handleSubTabChange = (sub: 'all' | 'purchases') => {
    setTabParams(current => {
      const next = new URLSearchParams(current);
      next.set('tab', 'products');
      next.set('sub', sub);
      return next;
    });
    notify(
      sub === 'purchases'
        ? translateText('My Purchases view selected.')
        : translateText('All Products view selected.')
    );
  };

  return (
    <main className="pp-page">
      {/* Top Navigation Tabs */}
      <div className="pp-tabs">
        {localizeNode(
          productTabs.map(([name, Icon]) => {
            const isActive = selectedTab === name;

            return (
              <button
                key={name}
                className={isActive ? 'active' : ''}
                onClick={() => handleTabChange(name)}
              >
                <Icon size={15} />
                <span>{localizeNode(name)}</span>
              </button>
            );
          })
        )}
        <div className="module-header-actions pp-header-actions"><button className="st-secondary" onClick={() => navigate("/dashboard/products?tab=templates")}>{translateText("Templates")} <ArrowRight size={14}/></button><button
          className="pp-create"
          onClick={() => navigate('/dashboard/products-payments/products/new')}
        >
          <Plus size={15} />
          {translateText(' Create Product ')}
          <ChevronDown size={13} />
        </button></div>
      </div>

      {/* Main Workspace content based on selected tab */}
      {localizeNode(
        selectedTab === 'Products' ? (
          <>
            {/* Products Main View: Horizontal Sub-View Filter */}
            {selectedTab === 'Products' && (
              <div className="pp-subnav-bar">
                <div
                  className="pp-subnav"
                  role="tablist"
                  aria-label={translateText('Products sub-views')}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubTab === 'all'}
                    className={`pp-subnav-btn ${activeSubTab === 'all' ? 'active' : ''}`}
                    onClick={() => handleSubTabChange('all')}
                  >
                    <LayoutGrid size={14} />
                    <span>{translateText('All Products')}</span>
                    <span className="pp-subnav-count">{allProductsCount}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubTab === 'purchases'}
                    className={`pp-subnav-btn ${activeSubTab === 'purchases' ? 'active' : ''}`}
                    onClick={() => handleSubTabChange('purchases')}
                  >
                    <PackageCheck size={14} />
                    <span>{translateText('My Purchases')}</span>
                    <span className="pp-subnav-count">{purchasedProductsCount}</span>
                  </button>
                </div>

                {activeSubTab === 'purchases' && (
                  <div className="pp-purchases-subnav-actions">
                    <div className="pp-purchases-summary-pill">
                      <PackageCheck size={14} className="text-emerald-500" />
                      <span>{translateText('Active in your account:')}</span>
                      <b>{purchasedProductsCount}</b>
                    </div>
                    <button
                      type="button"
                      className="st-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 13px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 600,
                      }}
                      onClick={() => navigate('/portal')}
                    >
                      <span>{translateText('Open Customer Portal')}</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* KPI Metrics Bar for All Products */}
            {selectedTab === 'Products' && activeSubTab === 'all' && (
              <section className="pp-metrics">
                {localizeNode(
                  metricData.map(([label, note, Icon, tone, filter]) => (
                    <button
                      key={label}
                      className={`pp-metric ${tone} ${type === filter ? 'selected' : ''}`}
                      onClick={() => {
                        setType(filter);
                        setFilterMetric(label);
                      }}
                    >
                      <span>
                        <Icon size={23} />
                      </span>
                      <div>
                        <small>{localizeNode(label)}</small>
                        <b>
                          {localizeNode(
                            products.filter(p => filter === 'All Types' || p.type === filter).length
                          )}
                        </b>
                        <em>{localizeNode(note)}</em>
                      </div>
                    </button>
                  ))
                )}
              </section>
            )}

            {/* Catalog Toolbar and Products Grid */}
            <div className="pp-workspace">
              <section className="pp-catalog">
                <div className="pp-toolbar">
                  <label className="pp-search">
                    <Search size={15} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={
                        activeSubTab === 'purchases'
                          ? translateText('Search your purchased products...')
                          : translateText('Search products...')
                      }
                    />
                  </label>
                  <ProfessionalSelect
                    value={type}
                    options={['All Types', 'Service', 'Digital Product', 'Course']}
                    onChange={v => {
                      setType(v);
                      setFilterMetric(v === 'All Types' ? 'All Products' : v);
                    }}
                  />
                  {activeSubTab !== 'purchases' && (
                    <ProfessionalSelect
                      value={status}
                      options={['All Status', 'Active', 'Draft']}
                      onChange={setStatus}
                    />
                  )}
                  <ProfessionalSelect
                    icon={ArrowUpDown}
                    value={sort}
                    options={['Newest First', 'A to Z', 'Price: Low to High']}
                    onChange={setSort}
                  />
                  <span className="pp-toolbar-divider" aria-hidden="true" />
                  <div className="pp-view-toggle">
                    <button
                      className={view === 'Grid' ? 'active' : ''}
                      aria-label={translateText('Grid view')}
                      onClick={() => setView('Grid')}
                    >
                      <Grid2X2 size={16} />
                    </button>
                    <button
                      className={view === 'List' ? 'active' : ''}
                      aria-label={translateText('List view')}
                      onClick={() => setView('List')}
                    >
                      <RowsIcon />
                    </button>
                  </div>
                </div>

                <div className={`pp-products ${view === 'List' ? 'list' : ''}`}>
                  {localizeNode(
                    displayed.length === 0 && (
                      <div className="pp-empty-results">
                        {activeSubTab === 'purchases' ? (
                          <div className="pp-empty-favorites">
                            <div
                              className="pp-empty-icon-wrap pp-purchases-empty-icon"
                              style={{
                                background: '#f0fdf4',
                                color: '#16a34a',
                                borderColor: '#bbf7d0',
                              }}
                            >
                              <PackageCheck size={38} strokeWidth={1.8} />
                            </div>
                            <b>{translateText('No purchased products yet')}</b>
                            <span>
                              {purchasedProductsCount === 0
                                ? translateText(
                                    'Products and courses you purchase or enroll in via checkout will appear here in your personal library.'
                                  )
                                : translateText('No purchased products match your search filter.')}
                            </span>
                            {purchasedProductsCount === 0 ? (
                              <button
                                type="button"
                                className="pp-browse-btn"
                                style={{ background: '#16a34a' }}
                                onClick={() => handleSubTabChange('all')}
                              >
                                <ShoppingBag size={14} />
                                {translateText('Explore All Products')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearch('');
                                  setType('All Types');
                                  setStatus('All Status');
                                  setFilterMetric('All Products');
                                }}
                              >
                                {translateText('Clear filters')}
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <Search size={24} />
                            <b>{translateText('No products found')}</b>
                            <span>{translateText('Try a different search or clear your filters.')}</span>
                            <button
                              onClick={() => {
                                setSearch('');
                                setType('All Types');
                                setStatus('All Status');
                                setFilterMetric('All Products');
                              }}
                            >
                              {translateText('Clear filters')}
                            </button>
                          </>
                        )}
                      </div>
                    )
                  )}

                  {localizeNode(
                    displayed.map(item => {
                      const isCustomerCard = activeSubTab === 'purchases';
                      const portalRecord = isCustomerCard ? portalById.get(item.id) : undefined;
                      const portalHref = `/portal/${encodeURIComponent(
                        portalRecord?.purchaseId || item.id
                      )}`;
                      return (
                        <ProductCard
                          key={item.id}
                          item={item}
                          isPurchased={isCustomerCard || isPurchased(item)}
                          customerMode={isCustomerCard}
                          portalRecord={portalRecord}
                          customerPage={isCustomerCard ? `${portalHref}?preview=1` : `/portal/preview/${encodeURIComponent(item.id)}`}
                          onSelect={() =>
                            navigate(
                              isCustomerCard
                                ? portalHref
                                : `/dashboard/products-payments/products/${item.id}/edit`
                            )
                          }
                          onEdit={() =>
                            navigate(`/dashboard/products-payments/products/${item.id}/edit`)
                          }
                          notify={notify}
                        />
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          </>
        ) : selectedTab === 'Transactions' ? (
          <TransactionsView notify={notify} />
        ) : selectedTab === 'Requests' ? (
          <CheckoutRequests/>
        ) : selectedTab === 'Discounts' ? (
          <DiscountsWorkspace notify={notify} />
        ) : selectedTab === 'Settings' ? (
          <WorkspaceSettings notify={notify} />
        ) : selectedTab === 'Payments' ? (
          <><PaymentMethodsSummary/><CommerceRecords tab={selectedTab} notify={notify}/></>
        ) : (
          <CommerceRecords tab={selectedTab} notify={notify} />
        )
      )}
    </main>
  );
};

function ProductCard({
  item,
  isPurchased = false,
  customerMode = false,
  portalRecord,
  customerPage,
  onSelect,
  onEdit,
  notify,
}: {
  item: Product;
  isPurchased?: boolean;
  customerMode?: boolean;
  portalRecord?: CustomerPurchaseRecord;
  customerPage: string;
  onSelect: () => void;
  onEdit: () => void;
  notify: (message: string) => void;
}) {
  useUILanguage();
  const { formatPrice } = useCurrency();
  const [showUsers, setShowUsers] = useState(false);

  const courseLessonsTotal = useMemo(() => {
    if (portalRecord?.productSnapshot?.modules) {
      return portalRecord.productSnapshot.modules.reduce(
        (sum, mod) => sum + (mod.lessons?.length || 0),
        0
      );
    }
    return (item.config?.modules || []).reduce(
      (sum, mod) => sum + (mod.lessons?.length || 0),
      0
    );
  }, [portalRecord, item.config?.modules]);

  const courseLessonsDone = portalRecord?.completedLessonIds?.length ?? 0;
  const courseProgress = portalRecord?.progress ?? 0;
  const digitalAssetsCount =
    portalRecord?.productSnapshot?.assets?.length || item.config?.assets?.length || 1;
  const serviceDuration =
    portalRecord?.productSnapshot?.duration || item.config?.duration || 60;
  const serviceStatus = portalRecord?.serviceStatus || 'Order Confirmed';

  return (
    <article className={`pp-product-card${customerMode ? " pp-purchase-card" : ""}`} onClick={onSelect}>
      <button
        className="pp-art"
        onClick={event => {
          event.stopPropagation();
          onSelect();
        }}
        aria-label={
          customerMode
            ? translateText(`Open ${item.name} in Customer Portal`)
            : formatDisplayMessage('Edit {{0}}', item.name)
        }
      >
        {localizeNode(
          item.image ? (
            <img decoding="async"
              {...thumbnailImageProps(item.image)} src={item.image}
              alt={formatDisplayMessage('{{0}} thumbnail', item.name)}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <Artwork kind={item.art} />
          )
        )}
      </button>

      <ProductCardActions product={item} customerPage={customerPage} purchaseOnly={customerMode} onEdit={onEdit} notify={notify}/>

      <div className="pp-card-info">
        <div className="pp-card-header-tags">
          <span className={`pp-type-tag ${item.type.toLowerCase().replaceAll(' ', '-')}`}>
            {localizeNode(item.tag)}
          </span>
          {isPurchased && (
            <span
              className="pp-purchased-badge"
              title={translateText('Purchased & active in your account')}
            >
              <Check size={10} strokeWidth={3} />
              {translateText('Purchased')}
            </span>
          )}
        </div>

        <button
          className="pp-product-title"
          onClick={event => {
            event.stopPropagation();
            onSelect();
          }}
        >
          {item.name}
        </button>
        <b className="pp-price">{localizeNode(formatProductPrice(item.config ?? defaultConfig(item.type, item.price), formatPrice))}</b>

        {customerMode ? (
          <div className="pp-purchase-progress">
            <div className="pp-product-metric" style={{ cursor: 'pointer' }}>
              {item.type === 'Course' ? (
                <span>
                  <Users size={12} />
                  {courseLessonsTotal > 0
                    ? `${courseLessonsDone}/${courseLessonsTotal} ${translateText('lessons')} · ${courseProgress}%`
                    : `${courseProgress}% ${translateText('completed')}`}
                </span>
              ) : item.type === 'Service' ? (
                <span>
                  <CalendarDays size={12} />
                  {`${serviceDuration} min · ${translateText(serviceStatus)}`}
                </span>
              ) : (
                <span>
                  <FileText size={12} />
                  {`${digitalAssetsCount} ${translateText(
                    digitalAssetsCount === 1 ? 'digital file' : 'digital files'
                  )} · ${translateText('Instant download')}`}
                </span>
              )}
            </div>
            {item.type === "Course" && <progress max={100} value={courseProgress} aria-label={translateText("Course progress")}/>}
          </div>
        ) : (
          <div
            className="pp-product-metric"
            role="button"
            tabIndex={0}
            title={translateText('Click to view users who purchased this product')}
            style={{ cursor: 'pointer', width: 'fit-content' }}
            onClick={event => {
              event.stopPropagation();
              setShowUsers(true);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                setShowUsers(true);
              }
            }}
          >
            {localizeNode(
              item.stats.map(([kind, text]) => {
                const StatIcon = statIcons[kind];
                return (
                  <span key={kind}>
                    <StatIcon size={12} />
                    {localizeNode(text)}
                  </span>
                );
              })
            )}
          </div>
        )}

        <div className="pp-card-footer">
          {customerMode ? (
            <>
              <span className="pp-status active">
                <span className="pp-status-dot" aria-hidden="true" />
                {translateText(portalRecord?.preview ? 'Preview' : 'Active Access')}
              </span>
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  onSelect();
                }}
                className="pp-purchase-cta"
              >
                <span>
                  {translateText(
                    portalRecord?.preview ? 'See Customer Page' : item.type === 'Course'
                      ? courseProgress > 0 ? 'Continue Course' : 'Start Course'
                      : item.type === 'Service'
                      ? 'Access Service'
                      : 'Access Files'
                  )}
                </span>
                <ArrowRight size={13} />
              </button>
            </>
          ) : (
            <>
              <span className={`pp-status ${item.status.toLowerCase()}`}>
                <span className="pp-status-dot" aria-hidden="true" />
                {localizeNode(item.status)}
              </span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  className="pp-open"
                  title={translateText('View Users & Buyers')}
                  aria-label={formatDisplayMessage('View users of {{0}}', item.name)}
                  onClick={event => {
                    event.stopPropagation();
                    setShowUsers(true);
                  }}
                >
                  <Users size={15} />
                </button>
                <a
                  className="pp-open"
                  href={`/product-preview/${encodeURIComponent(productPreviewToken(item))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={translateText('View Live Preview')}
                  aria-label={formatDisplayMessage('Preview {{0}}', item.name)}
                  onPointerDown={() => {
                    try {
                      writePreview(productPreviewToken(item), item);
                    } catch {}
                  }}
                  onClick={event => {
                    event.stopPropagation();
                    try {
                      writePreview(productPreviewToken(item), item);
                    } catch {
                      event.preventDefault();
                      notify('Preview could not be opened. Browser storage is unavailable or full.');
                    }
                  }}
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  type="button"
                  className="pp-open"
                  title={translateText('Edit product')}
                  aria-label={formatDisplayMessage('Edit {{0}}', item.name)}
                  onClick={event => {
                    event.stopPropagation();
                    onSelect();
                  }}
                >
                  <Pencil size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {!customerMode && showUsers && (
        <ProductQuickView
          product={item}
          defaultTab="users"
          close={() => setShowUsers(false)}
          edit={onEdit}
        />
      )}
    </article>
  );
}

function TransactionsView({ notify }: { notify?: (s: string) => void }) {
  useUILanguage();
  const { formatPrice } = useCurrency();
  const transactions = useTransactions();
  const [txnSearch, setTxnSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Pending' | 'Refunded' | 'Rejected'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [txnSearch, statusFilter, pageSize]);

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const q = txnSearch.toLowerCase();
      const matchesSearch =
        !txnSearch ||
        t.productName.toLowerCase().includes(q) ||
        (t.customerName?.toLowerCase() ?? '').includes(q) ||
        (t.customerEmail?.toLowerCase() ?? '').includes(q) ||
        (t.method?.toLowerCase() ?? '').includes(q) ||
        t.id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [transactions, statusFilter, txnSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredTxns.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTxns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTxns.slice(start, start + pageSize);
  }, [filteredTxns, currentPage, pageSize]);

  const totalVolume = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'Completed');
    const currency = completed[0]?.currency ?? 'USD';
    // Never mix currencies into one figure.
    const sum = completed.filter(t => t.currency === currency).reduce((total, t) => total + t.amountValue, 0);
    return formatPrice(sum, currency);
  }, [transactions, formatPrice]);
  const exportCsv = () => {
    const cell = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    const csv = '\uFEFF' + [['Transaction ID', 'Date', 'Product', 'Customer', 'Email', 'Method', 'Amount', 'Currency', 'Status'], ...filteredTxns.map(t => [t.id, t.date, t.productName, t.customerName, t.customerEmail, t.method, t.amountValue, t.currency, t.status])].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), link = document.createElement('a');
    link.href = url; link.download = `gos-transactions-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify?.(translateText('Transactions exported to CSV.'));
  };

  const completedCount = transactions.filter(t => t.status === 'Completed').length;
  const rate = transactions.length > 0 ? Math.round((completedCount / transactions.length) * 100) : 100;
  const startIdx = filteredTxns.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, filteredTxns.length);

  return (
    <section className="pp-transactions-view"><PaymentMethodsSummary/>
      {/* KPI summary */}
      <div className="pp-txn-kpis">
        <div className="pp-txn-kpi">
          <div className="pp-txn-kpi-icon violet">
            <Receipt size={20} />
          </div>
          <div>
            <small>{translateText('Total Transactions')}</small>
            <b>{transactions.length}</b>
            <em>{translateText('Logged across all products')}</em>
          </div>
        </div>

        <div className="pp-txn-kpi">
          <div className="pp-txn-kpi-icon green">
            <TrendingUp size={20} />
          </div>
          <div>
            <small>{translateText('Settled Volume')}</small>
            <b>{totalVolume}</b>
            <em>{translateText('Verified completed revenue')}</em>
          </div>
        </div>

        <div className="pp-txn-kpi">
          <div className="pp-txn-kpi-icon blue">
            <UserRoundCheck size={20} />
          </div>
          <div>
            <small>{translateText('Success Rate')}</small>
            <b>{rate}%</b>
            <em>{translateText(`${completedCount} completed successfully`)}</em>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="pp-txn-toolbar">
        <label className="pp-search pp-txn-search">
          <Search size={15} />
          <input
            value={txnSearch}
            onChange={e => setTxnSearch(e.target.value)}
            placeholder={translateText('Search by product, customer, email, method, or transaction ID...')}
          />
        </label>

        <div className="pp-txn-filters">
          {(['All', 'Completed', 'Pending', 'Refunded', 'Rejected'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              className={`pp-txn-filter-btn ${statusFilter === tab ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab)}
            >
              {localizeNode(tab)}
              <span className="pp-txn-filter-count">
                {tab === 'All' ? transactions.length : transactions.filter(t => t.status === tab).length}
              </span>
            </button>
          ))}
          {notify && (
            <button
              type="button"
              className="pp-txn-filter-btn"
              title={translateText('Export transactions')}
              disabled={!filteredTxns.length}
              onClick={exportCsv}
            >
              {translateText('Export')}
            </button>
          )}
        </div>
      </div>

      {/* Professional Table Card with Pagination */}
      <div className="cr-table-card">
        {filteredTxns.length === 0 ? (
          <div className="pp-txn-empty">
            <Receipt size={28} />
            <b>{translateText('No transactions found')}</b>
            <span>{translateText('Verified payments from your connected payment provider will appear here.')}</span>
          </div>
        ) : (
          <>
            <div className="request-table">
              <table>
                <thead>
                  <tr>
                    <th>{translateText('Customer')}</th>
                    <th>{translateText('Product & ID')}</th>
                    <th>{translateText('Method')}</th>
                    <th>{translateText('Amount')}</th>
                    <th>{translateText('Date')}</th>
                    <th>{translateText('Status')}</th>
                    <th>{translateText('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTxns.map(t => {
                    const initials = String(t.customerName || t.customerEmail || 'C')
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p: string) => p[0]?.toUpperCase() || '')
                      .join('') || 'C';
                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="cr-customer-cell">
                            <span className="cr-customer-avatar" aria-hidden="true">{initials}</span>
                            <div className="cr-customer-meta">
                              <b dir="auto">{t.customerName || translateText('Customer')}</b>
                              <small>{t.customerEmail || '—'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cr-product-cell">
                            <span className="cr-product-name" dir="auto">{t.productName}</span>
                            <small className="cr-ref-code">#{String(t.id).slice(-8).toUpperCase()}</small>
                          </div>
                        </td>
                        <td>
                          <span className="cr-method-badge">
                            <CreditCard size={12} />
                            {localizeNode(t.method || '—')}
                          </span>
                        </td>
                        <td>
                          <strong className="cr-amount">{formatPrice(t.amountValue, t.currency)}</strong>
                        </td>
                        <td className="cr-date-cell">{t.date}</td>
                        <td>
                          <span className={`request-status ${t.status.toLowerCase()}`}>
                            <span className="cr-status-dot" aria-hidden="true" />
                            {localizeNode(t.status)}
                          </span>
                        </td>
                        <td>
                          <div className="cr-row-actions">
                            <button
                              type="button"
                              className="cw-button cr-action-btn details"
                              onClick={() => setSelectedTxn(t)}
                            >
                              <Eye size={14} />
                              <span>{translateText('View details')}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="cr-pagination" aria-label={translateText('Pagination')}>
              <div className="cr-pagination-info">
                <span>
                  {translateText('Showing')} <b>{startIdx}–{endIdx}</b> {translateText('of')}{' '}
                  <b>{filteredTxns.length}</b> {translateText('transactions')}
                </span>
                <label className="cr-page-size">
                  <span>{translateText('Rows per page')}</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    aria-label={translateText('Rows per page')}
                  >
                    {[5, 8, 15, 25].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="cr-pagination-controls">
                <button
                  type="button"
                  className="cr-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} />
                  <span>{translateText('Previous')}</span>
                </button>
                <div className="cr-page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`cr-page-num ${n === currentPage ? 'active' : ''}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="cr-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <span>{translateText('Next')}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>

      {selectedTxn && (
        <QuickDetails title={translateText('Transaction details')} close={() => setSelectedTxn(null)}>
          <div className="cr-details-drawer">
            <div className="cr-detail-hero">
              <div className="cr-detail-hero-top">
                <span className={`pp-txn-status ${String(selectedTxn.status || 'completed').toLowerCase()}`}>
                  <span className="pp-txn-dot" />
                  {localizeNode(selectedTxn.status)}
                </span>
                <button
                  type="button"
                  className="cr-copy-ref"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(selectedTxn.id);
                      showToast.success(translateText('Transaction ID copied'));
                    } catch {}
                  }}
                >
                  <Copy size={12} />
                  <span>#{String(selectedTxn.id).slice(-8).toUpperCase()}</span>
                </button>
              </div>
              <div className="cr-detail-amount">{localizeNode(selectedTxn.amount)}</div>
              <div className="cr-detail-product-name" dir="auto">{selectedTxn.productName}</div>
              <div className="cr-detail-timestamp">
                <Clock3 size={12} />
                <span>{selectedTxn.date}</span>
              </div>
            </div>

            <div className="cr-detail-card">
              <h4 className="cr-detail-card-title">
                <User size={14} />
                <span>{translateText('Customer Information')}</span>
              </h4>
              <dl className="cr-detail-dl">
                <div>
                  <dt>{translateText('Full Name')}</dt>
                  <dd>{selectedTxn.customerName || '—'}</dd>
                </div>
                <div>
                  <dt>{translateText('Email Address')}</dt>
                  <dd>
                    {selectedTxn.customerEmail ? (
                      <a href={`mailto:${selectedTxn.customerEmail}`} className="cr-detail-link">
                        <Mail size={12} />
                        {selectedTxn.customerEmail}
                      </a>
                    ) : '—'}
                  </dd>
                </div>
                <div>
                  <dt>{translateText('Phone Number')}</dt>
                  <dd>
                    {selectedTxn.customerPhone ? (
                      <span className="cr-detail-inline">
                        <Phone size={12} />
                        {selectedTxn.customerPhone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="cr-detail-card">
              <h4 className="cr-detail-card-title">
                <CreditCard size={14} />
                <span>{translateText('Payment & Settlement')}</span>
              </h4>
              <dl className="cr-detail-dl">
                <div>
                  <dt>{translateText('Transaction ID')}</dt>
                  <dd style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>{selectedTxn.id}</dd>
                </div>
                <div>
                  <dt>{translateText('Payment Method')}</dt>
                  <dd>
                    <span className="cr-method-badge">{selectedTxn.method || '—'}</span>
                  </dd>
                </div>
                <div>
                  <dt>{translateText('Amount Settled')}</dt>
                  <dd><strong>{formatPrice(selectedTxn.amountValue, selectedTxn.currency)}</strong></dd>
                </div>
                <div>
                  <dt>{translateText('Currency')}</dt>
                  <dd>{selectedTxn.currency || 'USD'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </QuickDetails>
      )}
    </section>
  );
}

function Artwork({ kind }: { kind: string }) {
  useUILanguage();
  return (
    <div className={`pp-artwork ${kind}`}>
      <div className="art-glow" />
      <div className="art-phone">
        <span />
        <i />
        <i />
        <i />
      </div>
      {localizeNode(
        kind === 'course' ? (
          <>
            <span className="art-arabic">
              تسويق ذكي<br />
              <b>{translateText('AI')}</b> للمستقبل
            </span>
            <span className="art-person">{translateText('MJ')}</span>
            <small>
              {translateText('GOING')}<br />
              {translateText('FURTHER')}
            </small>
          </>
        ) : kind === 'templates' ? (
          <>
            <span className="art-neon-title">
              {translateText('SOCIAL')}<br />
              {translateText('TEMPLATES')}
            </span>
            <div className="art-phone second">
              <span />
              <i />
              <i />
              <i />
            </div>
            <b className="art-sticker">120+</b>
          </>
        ) : kind === 'speaker' ? (
          <>
            <span className="art-speaker">{translateText('MJ')}</span>
            <div className="art-callout">
              <CalendarClock size={18} />
            </div>
            <small>
              {translateText('STRATEGY')}<br />
              {translateText('SESSION')}
            </small>
          </>
        ) : kind === 'whatsapp' ? (
          <>
            <span className="art-arabic">
              تنفيذ<br />وتحسين
            </span>
            <span className="art-wa">◉</span>
            <small>
              {translateText('WHATSAPP')}<br />
              {translateText('AUTOMATION')}
            </small>
          </>
        ) : kind === 'funnel' ? (
          <>
            <div className="art-dashboard">
              <b>{translateText('Upclick')}</b>
              <i />
              <i />
              <i />
              <span>{translateText('Leads +28%')}</span>
            </div>
            <span className="art-mini-phone" />
          </>
        ) : kind === 'agency' ? (
          <>
            <span className="art-agency-title">
              {translateText('Agency')}<br />
              {translateText('Starter Kit')}
            </span>
            <div className="art-dashboard">
              <b>{translateText('Upclick')}</b>
              <i />
              <i />
              <span>{translateText('Launch system')}</span>
            </div>
          </>
        ) : kind === 'membership' ? (
          <>
            <span className="art-crown">♛</span>
            <b className="art-membership">
              {translateText('Premium')}<br />
              {translateText('Membership')}
            </b>
            <small>{translateText('Upclick PRO')}</small>
          </>
        ) : (
          <>
            <div className="art-phone">
              <span />
              <i />
              <i />
              <i />
            </div>
            <div className="art-phone second">
              <span />
              <i />
              <i />
              <i />
            </div>
            <span className="art-bundle">{translateText('GROW')}</span>
          </>
        )
      )}
    </div>
  );
}

function ProfessionalSelect({
  value,
  options,
  onChange,
  icon: Icon,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  icon?: React.ElementType;
}) {
  useUILanguage();
  return (
    <CommerceSelect
      className="pp-select"
      label={
        Icon
          ? 'Sort products'
          : options[0] === 'All Types'
          ? 'Filter product type'
          : 'Filter product status'
      }
      value={value}
      options={options}
      onChange={onChange}
      icon={Icon}
    />
  );
}

function RowsIcon() {
  useUILanguage();
  return (
    <span className="pp-rows-icon">
      <i />
      <i />
      <i />
    </span>
  );
}

function PaymentMethodsSummary() {
 const { methods, loading, error } = usePaymentMethods({ scope: 'user' });
 const navigate = useNavigate();
 return <div className="pp-payments-banner"><span className="pp-payments-banner-icon"><CreditCard size={20}/></span><div className="pp-payments-banner-body"><b>{translateText('Payment Methods')}</b><span>{translateText(error ? 'Payment methods could not be loaded.' : loading ? 'Loading payment methods…' : methods.filter(m=>m.enabled && (m.type === 'manual' || m.status === 'Connected')).map(m=>m.name).join(' · ') || 'No payment methods configured.')}</span></div><button className="cw-button" onClick={()=>navigate('/dashboard/settings/payment-methods')}>{translateText('Manage payment methods')}</button></div>;
}
