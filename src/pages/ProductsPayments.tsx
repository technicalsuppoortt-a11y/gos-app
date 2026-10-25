import { usePaymentMethods } from '../backend/paymentMethods';
import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import { ProductCardActions } from './commerce/ProductCardActions';
import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CommerceSelect } from '../components/ui/CommerceSelect';
import { WorkspaceSettings } from './commerce/WorkspaceSettings';
import { CommerceRecords } from './commerce/CommerceRecords';
import { DiscountsWorkspace } from './DiscountsWorkspace';

import { useTransactions } from './commerce/transactions';
import { usePurchasedProducts } from './commerce/purchases';

import {
  ArrowRight,
  ArrowUpDown,
  Box,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  FileText,
  Grid2X2,

  LayoutGrid,
  PackageCheck,
  Pencil,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  UserRoundCheck,
  Users,
  UsersRound,
} from 'lucide-react';
import type { Product, StatKind } from './commerce/model';
import { useProducts } from './commerce/repository';
import './products-payments.css';
import './products-payments-overrides.css';
import './commerce/commerce-enhancements.css';

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

  const rawTab = tabParams.get('tab')?.toLowerCase();
  const selectedTab = useMemo(() => {
    if (!rawTab || rawTab === 'products' || rawTab === 'my-products' || rawTab === 'my-purchases') {
      return 'Products';
    }

    if (rawTab === 'transactions') return 'Transactions';
    if (rawTab === 'payments') return 'Payments';
    if (rawTab === 'orders') return 'Orders';
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
    return products.filter(p => isPurchased(p));
  }, [products, isPurchased]);
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
          (status === 'All Status' || p.status === status) &&
          `${p.name} ${p.type}`.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) =>
        sort === 'A to Z'
          ? a.name.localeCompare(b.name)
          : sort === 'Price: Low to High'
          ? (a.config?.amount ?? 0) - (b.config?.amount ?? 0)
          : Number(new Date(b.createdAt ?? 0)) - Number(new Date(a.createdAt ?? 0))
      );
  }, [baseProducts, type, status, search, sort]);

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
                  <div className="pp-purchases-summary-pill">
                    <PackageCheck size={14} className="text-emerald-500" />
                    <span>{translateText('Active in your account:')}</span>
                    <b>{purchasedProductsCount}</b>
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
                  <ProfessionalSelect
                    value={status}
                    options={['All Status', 'Active', 'Draft']}
                    onChange={setStatus}
                  />
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
                    displayed.map(item => (
                      <ProductCard
                        key={item.id}
                        item={item}

                        isPurchased={isPurchased(item)}

                        onSelect={() =>
                          navigate(`/dashboard/products-payments/products/${item.id}/edit`)
                        }
                        onEdit={() =>
                          navigate(`/dashboard/products-payments/products/${item.id}/edit`)
                        }
                        notify={notify}
                      />
                    ))
                  )}
                </div>
              </section>
            </div>
          </>
        ) : selectedTab === 'Transactions' ? (
          <TransactionsView notify={notify} />
        ) : selectedTab === 'Discounts' ? (
          <DiscountsWorkspace notify={notify} />
        ) : selectedTab === 'Settings' ? (
          <WorkspaceSettings notify={notify} />
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

  onSelect,
  onEdit,
  notify,
}: {
  item: Product;

  isPurchased?: boolean;

  onSelect: () => void;
  onEdit: () => void;
  notify: (message: string) => void;
}) {
  useUILanguage();

  return (
    <article className="pp-product-card" onClick={onSelect}>
      <button
        className="pp-art"
        onClick={event => {
          event.stopPropagation();
          onSelect();
        }}
        aria-label={translateText(`Edit ${item.name}`)}
      >
        {localizeNode(
          item.image ? (
            <img
              src={item.image}
              alt={translateText(`${item.name} thumbnail`)}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <Artwork kind={item.art} />
          )
        )}
      </button>

      <ProductCardActions product={item} onEdit={onEdit} notify={notify} />

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
          {localizeNode(item.name)}
        </button>
        <b className="pp-price">{localizeNode(item.price)}</b>
        <div className="pp-product-metric">
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
        <div className="pp-card-footer">
          <span className={`pp-status ${item.status.toLowerCase()}`}>
            <span className="pp-status-dot" aria-hidden="true" />
            {localizeNode(item.status)}
          </span>
          <button
            className="pp-open"
            title={translateText('Edit product')}
            aria-label={translateText(`Edit ${item.name}`)}
            onClick={event => {
              event.stopPropagation();
              onSelect();
            }}
          >
            <Pencil size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function TransactionsView({ notify }: { notify?: (s: string) => void }) {
  useUILanguage();
  const transactions = useTransactions();
  const [txnSearch, setTxnSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Pending' | 'Refunded'>('All');

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const q = txnSearch.toLowerCase();
      const matchesSearch =
        !txnSearch ||
        t.productName.toLowerCase().includes(q) ||
        (t.customerName?.toLowerCase() ?? '').includes(q) ||
        t.id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [transactions, statusFilter, txnSearch]);

  const totalVolume = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'Completed');
    const currency = completed[0]?.currency ?? 'USD';
    // Never mix currencies into one figure.
    const sum = completed.filter(t => t.currency === currency).reduce((total, t) => total + t.amountValue, 0);
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(sum); } catch { return `${sum.toFixed(2)} ${currency}`; }
  }, [transactions]);
  const exportCsv = () => {
    const cell = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    const csv = '\uFEFF' + [['Transaction ID', 'Date', 'Product', 'Customer', 'Email', 'Method', 'Amount', 'Currency', 'Status'], ...filteredTxns.map(t => [t.id, t.date, t.productName, t.customerName, t.customerEmail, t.method, t.amountValue, t.currency, t.status])].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), link = document.createElement('a');
    link.href = url; link.download = `gos-transactions-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify?.(translateText('Transactions exported to CSV.'));
  };

  const completedCount = transactions.filter(t => t.status === 'Completed').length;
  const rate = transactions.length > 0 ? Math.round((completedCount / transactions.length) * 100) : 100;

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
            placeholder={translateText('Search by product, customer, or transaction ID...')}
          />
        </label>

        <div className="pp-txn-filters">
          {(['All', 'Completed', 'Pending', 'Refunded'] as const).map(tab => (
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

      {/* Table */}
      <div className="pp-txn-table-container">
        <div className="pp-txn-table-header">
          <span>{translateText('Transaction ID')}</span>
          <span>{translateText('Date')}</span>
          <span>{translateText('Product Name')}</span>
          <span>{translateText('Customer')}</span>
          <span>{translateText('Payment Method')}</span>
          <span className="text-end">{translateText('Amount')}</span>
          <span className="text-center">{translateText('Status')}</span>
        </div>

        {filteredTxns.length === 0 ? (
          <div className="pp-txn-empty">
            <Receipt size={28} />
            <b>{translateText('No transactions found')}</b>
            <span>{translateText('Verified payments from your connected payment provider will appear here.')}</span>
          </div>
        ) : (
          filteredTxns.map(t => (
            <div key={t.id} className="pp-txn-row">
              <span className="pp-txn-id">{t.id}</span>
              <span className="pp-txn-date">
                <Clock3 size={12} className="inline me-1 opacity-60" />
                {t.date}
              </span>
              <b className="pp-txn-product">{localizeNode(t.productName)}</b>
              <span className="pp-txn-customer">{localizeNode(t.customerName || t.customerEmail || '—')}</span>
              <span className="pp-txn-method">
                <CreditCard size={12} className="inline me-1 opacity-60" />
                {localizeNode(t.method || '—')}
              </span>
              <b className="pp-txn-amount text-end">{localizeNode(t.amount)}</b>
              <span className="text-center">
                <span className={`pp-txn-status ${t.status.toLowerCase()}`}>
                  <span className="pp-txn-dot" />
                  {localizeNode(t.status)}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
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
              <b>{translateText('GOS')}</b>
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
              <b>{translateText('GOS')}</b>
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
            <small>{translateText('GOS PRO')}</small>
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
 const { methods, loading, error } = usePaymentMethods();
 const navigate = useNavigate();
 return <div className="pp-payments-banner"><span className="pp-payments-banner-icon"><CreditCard size={20}/></span><div className="pp-payments-banner-body"><b>{translateText('Payment Methods')}</b><span>{translateText(error ? 'Payment methods could not be loaded.' : loading ? 'Loading payment methods…' : methods.filter(m=>m.enabled && (m.type === 'manual' || m.status === 'Connected')).map(m=>m.name).join(' · ') || 'No payment methods configured.')}</span></div><button className="cw-button" onClick={()=>navigate('/dashboard/settings/billing?tab=payment-methods')}>{translateText('Manage payment methods')}</button></div>;
}
