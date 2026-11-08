import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Mail,
  Pencil,
  Phone,
  Search,
  Tag,
  Users,
  X,
} from 'lucide-react';
import type { RootState } from '../../store';
import { useEntities } from '../../backend/workspace';
import { QuickDetails } from '../../components/ui/QuickDetails';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import { defaultConfig, formatPrice, type Product } from './model';
import './checkout-requests.css';

type OrderRecord = {
  id: string;
  productId?: string;
  product_id?: string;
  productName?: string;
  items?: { productId?: string; product_id?: string; productName?: string; name?: string; amount?: number }[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customer?: { name?: string; email?: string; phone?: string };
  email?: string;
  amount?: number;
  total?: number;
  currency?: string;
  method?: string;
  discountCode?: string;
  discount?: number;
  status?: string;
  createdAt?: string;
  decidedAt?: string;
  at?: string;
};

const initials = (name: string) =>
  (name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'U';

const formatMoney = (amount: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(
      Number(amount) || 0
    );
  } catch {
    return `$${(Number(amount) || 0).toFixed(2)}`;
  }
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export function ProductQuickView({
  product,
  close,
  edit,
  defaultTab = 'users',
}: {
  product: Product;
  close: () => void;
  edit: () => void;
  defaultTab?: 'users' | 'overview';
}) {
  useUILanguage();
  const [activeTab, setActiveTab] = useState<'users' | 'overview'>(defaultTab);
  const [userSearch, setUserSearch] = useState('');
  const config = product.config ?? defaultConfig(product.type, product.price);
  const pipelines = useSelector((s: RootState) => s.crm.pipelines);
  const orders = useEntities<OrderRecord>('orders');
  const pNameLower = String(product.name || '').trim().toLowerCase();

  const relatedOrders = orders.filter(o => {
    if ((o.productId || o.product_id) === product.id) return true;
    if (pNameLower && String(o.productName || '').trim().toLowerCase() === pNameLower) return true;
    if (
      Array.isArray(o.items) &&
      o.items.some(
        i =>
          (i.productId || i.product_id) === product.id ||
          (pNameLower && String(i.productName || i.name || '').trim().toLowerCase() === pNameLower)
      )
    ) {
      return true;
    }
    return false;
  });

  // Merge orders and enrolled students so every buyer/user is visible
  const buyerRows = [...relatedOrders];
  for (const student of config.students ?? []) {
    const sEmail = String(student.email || '').trim().toLowerCase();
    if (
      sEmail &&
      !buyerRows.some(
        o => String(o.customerEmail || o.customer?.email || o.email || '').trim().toLowerCase() === sEmail
      )
    ) {
      buyerRows.push({
        id: student.id,
        productId: product.id,
        productName: product.name,
        customerName: student.name,
        customerEmail: student.email,
        amount: config.amount,
        currency: config.currency,
        status: student.status === 'Active' || student.status === 'Completed' ? 'Paid' : student.status,
        createdAt: student.enrolledAt,
      });
    }
  }

  const paidRows = buyerRows.filter(o => /^(paid|completed|succeeded|approved)$/i.test(String(o.status || '')));
  const q = userSearch.trim().toLowerCase();
  const filteredBuyers = buyerRows.filter(o => {
    if (!q) return true;
    const name = o.customerName || o.customer?.name || '';
    const email = o.customerEmail || o.customer?.email || o.email || '';
    const method = o.method || '';
    const code = o.discountCode || '';
    return [o.id, name, email, method, code].some(v => String(v || '').toLowerCase().includes(q));
  });

  const pipeline = pipelines.find(p => p.id === (config.crmRouting?.pipelineId || 'main'));
  const stage = pipeline?.stages.find(s => s.id === (config.crmRouting?.stageId || 'LEAD_CAPTURED'));

  return (
    <QuickDetails title={product.name} close={close}>
      <div className="request-details cr-details-drawer">
        {/* Hero Summary Banner */}
        <div className="cr-detail-hero">
          <div className="cr-detail-hero-top">
            <span
              className={`request-status ${product.status === 'Active' ? 'approved' : 'pending'}`}
            >
              <span className="cr-status-dot" aria-hidden="true" />
              {t(product.status)}
            </span>
            <span className="cr-ref-pill">{t(product.type)}</span>
          </div>
          <div className="cr-detail-hero-main">
            <div>
              <span className="cr-detail-hero-label">{t('Selling Price')}</span>
              <strong className="cr-detail-hero-amount">{formatPrice(config)}</strong>
            </div>
            <div style={{ textAlign: 'end' }}>
              <span className="cr-detail-hero-label">{t('Total Sales & Revenue')}</span>
              <strong style={{ fontSize: 15, color: '#047857' }}>
                {paidRows.length} {t('sales')} · {product.revenue || formatMoney(0, config.currency)}
              </strong>
            </div>
          </div>
        </div>

        {/* Drawer Segmented Tabs */}
        <div className="cr-status-tabs" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <button
            type="button"
            className={`cr-status-tab ${activeTab === 'users' ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
            onClick={() => setActiveTab('users')}
          >
            <Users size={14} />
            <span>{t('Users & Buyers')}</span>
            <span className="cr-status-tab-count">{buyerRows.length}</span>
          </button>
          <button
            type="button"
            className={`cr-status-tab ${activeTab === 'overview' ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
            onClick={() => setActiveTab('overview')}
          >
            <Box size={14} />
            <span>{t('Product Specs')}</span>
          </button>
        </div>

        {activeTab === 'users' ? (
          <section className="cr-detail-card">
            <header className="cr-detail-card-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Users size={15} />
                <h3>{t('Product Users & Buyers')}</h3>
              </div>
              <span className="cr-method-badge">
                {paidRows.length} {t('Paid')} / {buyerRows.length} {t('Total')}
              </span>
            </header>

            {buyerRows.length > 0 && (
              <div className="cr-search-box" style={{ maxWidth: '100%', marginBottom: 12 }}>
                <Search size={15} className="cr-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  aria-label={t('Search product users')}
                  placeholder={t('Search by user name, email, method or coupon…')}
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                {userSearch && (
                  <button
                    type="button"
                    className="cr-search-clear"
                    aria-label={t('Clear search')}
                    onClick={() => setUserSearch('')}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {filteredBuyers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
                <Users size={28} style={{ margin: '0 auto 8px', opacity: 0.45 }} />
                <strong style={{ display: 'block', color: '#0f172a', marginBottom: 4 }}>
                  {t(buyerRows.length ? 'No matching users found' : 'No users have purchased this product yet')}
                </strong>
                <small>
                  {t(
                    buyerRows.length
                      ? 'Try clearing your search filter.'
                      : 'Customers who complete checkout or get approved will appear here automatically.'
                  )}
                </small>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredBuyers.map(order => {
                  const buyerName = order.customerName || order.customer?.name || 'Customer';
                  const buyerEmail = order.customerEmail || order.customer?.email || order.email || '';
                  const buyerPhone = order.customerPhone || order.customer?.phone || '';
                  const statusRaw = order.status || 'Pending';
                  const isPaid = /^(paid|completed|succeeded|approved)$/i.test(statusRaw);
                  const isRejected = /^rejected$/i.test(statusRaw);
                  const statusTone = isPaid ? 'approved' : isRejected ? 'rejected' : 'pending';
                  const displayStatus = isPaid ? 'Paid' : statusRaw;

                  return (
                    <article
                      key={order.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div className="cr-customer-cell">
                          <span className="cr-customer-avatar" aria-hidden="true">
                            {initials(buyerName)}
                          </span>
                          <div className="cr-customer-meta">
                            <b>{buyerName}</b>
                            <small style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Mail size={11} />
                              {buyerEmail || t('No email recorded')}
                            </small>
                          </div>
                        </div>
                        <span className={`request-status ${statusTone}`}>
                          <span className="cr-status-dot" aria-hidden="true" />
                          {t(displayStatus)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          paddingTop: 8,
                          borderTop: '1px dashed #e2e8f0',
                          fontSize: 12.5,
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                          <strong style={{ color: '#0f172a', fontSize: 13.5 }}>
                            {formatMoney(order.total ?? order.amount ?? config.amount, order.currency || config.currency)}
                          </strong>
                          {order.method && (
                            <span className="cr-method-badge" style={{ padding: '2px 8px', fontSize: 11.5 }}>
                              <CreditCard size={11} style={{ marginInlineEnd: 4 }} />
                              {order.method}
                            </span>
                          )}
                          {order.discountCode && (
                            <span className="cr-discount-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Tag size={11} />
                              {order.discountCode}
                              {order.discount ? ` (-${formatMoney(order.discount, order.currency || config.currency)})` : ''}
                            </span>
                          )}
                        </div>
                        <span style={{ color: '#64748b', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} />
                          {formatDate(order.decidedAt || order.createdAt || order.at)}
                        </span>
                      </div>

                      {(buyerPhone && buyerPhone !== '—') || buyerEmail ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                          {buyerPhone && buyerPhone !== '—' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Phone size={11} />
                              {buyerPhone}
                            </span>
                          ) : (
                            <span />
                          )}
                          {buyerEmail && (
                            <button
                              type="button"
                              className="cr-mini-copy"
                              style={{ width: 'auto', padding: '2px 8px', gap: 4, fontSize: 11.5 }}
                              onClick={() =>
                                navigator.clipboard
                                  ?.writeText(buyerEmail)
                                  .then(() => showToast.success(t('Email copied')))
                              }
                            >
                              <Copy size={11} />
                              <span>{t('Copy email')}</span>
                            </button>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="cr-detail-card">
              <header className="cr-detail-card-header">
                <Box size={15} />
                <h3>{t('Product specs')}</h3>
              </header>
              <p className="cr-detail-muted" style={{ marginBottom: 12 }}>
                {product.description || t('No description added.')}
              </p>
              <dl className="cr-detail-dl">
                {Object.entries({
                  Type: product.type,
                  SKU: config.sku || '—',
                  Access: config.access,
                  Delivery: config.delivery,
                  Files: config.assets.length,
                  Modules: config.modules.length,
                  ...(product.type === 'Service' ? { Duration: `${config.duration} minutes` } : {}),
                }).map(([label, value]) => (
                  <div key={label}>
                    <dt>{t(label)}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="cr-detail-card">
              <header className="cr-detail-card-header">
                <CreditCard size={15} />
                <h3>{t('Pricing & CRM Routing')}</h3>
              </header>
              <dl className="cr-detail-dl">
                <div>
                  <dt>{t('Price')}</dt>
                  <dd>{formatPrice(config)}</dd>
                </div>
                <div>
                  <dt>{t('Billing')}</dt>
                  <dd>{config.billing}</dd>
                </div>
                <div>
                  <dt>{t('Paid Sales')}</dt>
                  <dd>{paidRows.length}</dd>
                </div>
                <div>
                  <dt>{t('Revenue')}</dt>
                  <dd>{product.revenue}</dd>
                </div>
                <div>
                  <dt>{t('CRM Pipeline')}</dt>
                  <dd>{pipeline?.name || t('Default pipeline')}</dd>
                </div>
                <div>
                  <dt>{t('Initial Stage')}</dt>
                  <dd>{stage?.label || config.crmRouting?.stageId || t('Default stage')}</dd>
                </div>
              </dl>
            </section>
          </>
        )}

        <div className="cr-review-actions" style={{ marginTop: 4 }}>
          <button type="button" className="cw-button primary cr-btn-approve" onClick={edit}>
            <Pencil size={14} />
            <span>{t('Edit product')}</span>
          </button>
        </div>
      </div>
    </QuickDetails>
  );
}
