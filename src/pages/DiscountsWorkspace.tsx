import './commerce/dynamic-checkout.css';
import './commerce/checkout-requests.css';
import { QuickDetails } from '../components/ui/QuickDetails';
import { showToast } from '../utils/toast';
import { useUILanguage, localizeNode, translateText } from '../i18n/display';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useCloudState, useEntities } from '../backend/workspace';
import { DiscountActionMenu } from './DiscountActionMenu';
import { DiscountSelect as Select } from './DiscountSelect';
import { type Discount, readDiscounts, writeDiscounts, discountNewPath, discountEditPath } from './discounts-data';
import {
  ArrowUpDown,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Eye,
  Mail,
  Pencil,
  Phone,
  Plus,
  Power,
  Trash2,
  Search,
  ShoppingCart,
  Tag,
  Ticket,
  Users,
} from 'lucide-react';
import course from '../assets/products/ai-course.jpg';
import templates from '../assets/products/social-pack.jpg';
import bundle from '../assets/products/growth-bundle.jpg';
import './discounts-workspace.css';

type DiscountedOrder = {
  id: string;
  status?: string;
  discount?: number;
  discountCode?: string;
  amount?: number;
  total?: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productName?: string;
  method?: string;
  createdAt?: string;
  decidedAt?: string;
};

function formatOrderMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function getInitials(name?: string, email?: string) {
  const src = (name || email || 'U').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function DiscountsWorkspace({ notify }: { notify: (message: string) => void }) {
  useUILanguage();
  const navigate = useNavigate();
  const [discounts] = useCloudState<Discount[]>('gos-discounts-v1', []);
  const allOrders = useEntities<DiscountedOrder>('orders');
  const paidOrders = allOrders.filter(
    order =>
      (order.discountCode || (order.discount ?? 0) > 0) &&
      /^(paid|completed|succeeded|approved)$/i.test(order.status || ''),
  );
  const setDiscounts = async (update: (rows: Discount[]) => Discount[]) => {
    try {
      await writeDiscounts(update(readDiscounts()));
      return true;
    } catch {
      notify(translateText('Unable to save the discount. Please try again.'));
      return false;
    }
  };
  const [search, setSearch] = React.useState('');
  const [type, setType] = React.useState('All Types');
  const [status, setStatus] = React.useState('All Status');
  const [sort, setSort] = React.useState('Newest First');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [menu, setMenu] = React.useState<string | null>(null);
  const [range, setRange] = React.useState('Last 6 Months');
  const [deleteConfirm, setDeleteConfirm] = React.useState<Discount | null>(null);
  const [detailDiscount, setDetailDiscount] = React.useState<Discount | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [search, type, status, sort]);

  const filtered = discounts
    .filter(
      d =>
        `${d.code} ${d.description}`.toLowerCase().includes(search.toLowerCase()) &&
        (type === 'All Types' || d.type === type) &&
        (status === 'All Status' || d.active === (status === 'Active')),
    )
    .sort((a, b) =>
      sort === 'A to Z'
        ? a.code.localeCompare(b.code)
        : sort === 'Most Used'
        ? b.uses - a.uses
        : sort === 'Value: High to Low'
        ? b.value - a.value
        : 0,
    );

  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const toggle = (id: string) =>
    setSelected(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  const edit = (d: Discount) => navigate(discountEditPath(d.id));

  // Helper to get orders that used a specific discount
  const getOrdersForDiscount = React.useCallback(
    (d: Discount) => {
      const codeNorm = String(d.code || '').trim().toLowerCase();
      return allOrders.filter(order => {
        const orderCode = String(order.discountCode || '').trim().toLowerCase();
        if (orderCode && orderCode === codeNorm) return true;
        if (!orderCode && Number(order.discount || 0) > 0 && discounts.length === 1) return true;
        return false;
      });
    },
    [allOrders, discounts.length],
  );

  const metrics = [
    ['Total Discounts', discounts.length, Ticket, 'purple'],
    [
      'Total Uses',
      discounts.reduce((sum, discount) => sum + (Number(discount.uses) || 0), 0),
      Users,
      'blue',
    ],
    ['Discounted orders', paidOrders.length, ShoppingCart, 'green'],
    ['Active Discounts', discounts.filter(discount => discount.active).length, BarChart3, 'orange'],
  ] as const;

  const detailRedemptions = React.useMemo(
    () => (detailDiscount ? getOrdersForDiscount(detailDiscount) : []),
    [detailDiscount, getOrdersForDiscount],
  );

  return (
    <section className="pp-secondary-view">
      <div className="pp-secondary-heading">
        <div>
          <h2>{translateText('Discounts & Coupons')}</h2>
          <p>{translateText('Create and manage your discount codes to boost your sales.')}</p>
        </div>
        <button onClick={() => navigate(discountNewPath)}>
          <Plus size={14} />
          {translateText(' Create Discount')}
        </button>
      </div>
      <div className="dc-workspace dc-dashboard">
        <section className="dc-metrics" aria-label={translateText('Discount metrics')}>
          {localizeNode(
            metrics.map(([label, value, Icon, tone]) => (
              <article key={label} className={`dc-stat ${tone}`}>
                <span className="dc-stat-icon">
                  <Icon size={22} />
                </span>
                <div>
                  <strong>{value}</strong>
                  <small>{translateText(label)}</small>
                </div>
              </article>
            )),
          )}
        </section>
        <div className="dc-split">
          <section className="dc-left">
            <div className="dc-table-card">
              <div className="dc-toolbar">
                <label className="dc-search">
                  <Search size={13} />
                  <input
                    aria-label={translateText('Search discounts')}
                    placeholder={translateText('Search discounts...')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </label>
                <Select
                  label="Filter discount type"
                  value={type}
                  options={['All Types', 'Percentage', 'Fixed Amount']}
                  onChange={setType}
                />
                <Select
                  label="Filter discount status"
                  value={status}
                  options={['All Status', 'Active', 'Inactive']}
                  onChange={setStatus}
                />
                <span className="dc-sort">
                  <ArrowUpDown size={11} />
                  <Select
                    label="Sort discounts"
                    value={sort}
                    options={['Newest First', 'A to Z', 'Most Used', 'Value: High to Low']}
                    onChange={setSort}
                  />
                </span>
              </div>
              {localizeNode(
                selected.length > 0 && (
                  <div className="dc-selection">
                    <span>
                      {localizeNode(selected.length)}
                      {translateText(' selected')}
                    </span>
                    <button
                      onClick={() => {
                        setDiscounts(items =>
                          items.map(d => (selected.includes(d.id) ? { ...d, active: true } : d)),
                        );
                        setSelected([]);
                      }}
                    >
                      {translateText('Activate')}
                    </button>
                    <button
                      onClick={() => {
                        setDiscounts(items =>
                          items.map(d => (selected.includes(d.id) ? { ...d, active: false } : d)),
                        );
                        setSelected([]);
                      }}
                    >
                      {translateText('Deactivate')}
                    </button>
                    <button onClick={() => setSelected([])}>{translateText('Clear')}</button>
                  </div>
                ),
              )}
              <div className="dc-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="text-center">
                        <input
                          aria-label={translateText('Select all visible discounts')}
                          type="checkbox"
                          checked={rows.length > 0 && rows.every(d => selected.includes(d.id))}
                          onChange={e =>
                            setSelected(current =>
                              e.target.checked
                                ? [...new Set([...current, ...rows.map(d => d.id)])]
                                : current.filter(id => !rows.some(d => d.id === id)),
                            )
                          }
                        />
                      </th>
                      <th className="text-start">{translateText('Code')}</th>
                      <th className="text-center">{translateText('Type')}</th>
                      <th className="text-center">{translateText('Value')}</th>
                      <th className="text-start">{translateText('Applies To')}</th>
                      <th className="text-center">{translateText('Usage')}</th>
                      <th className="text-center">{translateText('Expiration')}</th>
                      <th className="text-center">{translateText('Status')}</th>
                      <th className="text-center dc-actions">
                        <span>{translateText('Actions')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {localizeNode(
                      rows.map(d => (
                        <tr key={d.id} className={selected.includes(d.id) ? 'selected' : ''}>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              aria-label={translateText(`Select ${d.code}`)}
                              checked={selected.includes(d.id)}
                              onChange={() => toggle(d.id)}
                            />
                          </td>
                          <td className="text-start">
                            <span className="cx-copy-code">
                              <button className="dc-code" onClick={() => setDetailDiscount(d)}>
                                {localizeNode(d.code)}
                              </button>
                              <button
                                className="cx-copy-button"
                                aria-label={translateText('Copy code ' + d.code)}
                                title={translateText('Copy Code')}
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(d.code);
                                    showToast.success('Discount code copied!');
                                  } catch {
                                    showToast.error(
                                      'Could not copy code. Please copy it manually.',
                                    );
                                  }
                                }}
                              >
                                <Copy size={13} />
                              </button>
                            </span>
                            <small className="dc-description">{localizeNode(d.description)}</small>
                          </td>
                          <td className="text-center">
                            <span className="dc-type-badge">{localizeNode(d.type)}</span>
                          </td>
                          <td className="text-center dc-value">
                            {localizeNode(d.type === 'Percentage' ? `${d.value}%` : `€${d.value}`)}
                          </td>
                          <td className="text-start">
                            {localizeNode(d.applies)}
                            {localizeNode(
                              d.applies === 'Specific Products' && (
                                <span className="dc-thumbnails">
                                  {localizeNode(
                                    [course, templates, bundle].map((src, i) => (
                                      <img
                                        src={src}
                                        alt={translateText(
                                          [
                                            'AI Marketing Course',
                                            'Social Media Templates',
                                            'Business Growth Bundle',
                                          ][i],
                                        )}
                                        key={src}
                                      />
                                    )),
                                  )}
                                  <span>+{localizeNode(d.code === 'SUMMER25' ? 2 : 3)}</span>
                                </span>
                              ),
                            )}
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => setDetailDiscount(d)}
                              title={translateText('View users who used this discount')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 10px',
                                borderRadius: 999,
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                color: '#334155',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <Users size={12} style={{ color: '#7c3aed' }} />
                              <span>
                                {localizeNode(d.uses)} / {localizeNode(d.limit || '∞')}
                              </span>
                            </button>
                          </td>
                          <td className="text-center">
                            {localizeNode(
                              d.expiry
                                ? new Date(`${d.expiry}T12:00:00`).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'No expiry',
                            )}
                          </td>
                          <td className="text-center">
                            <span className={`dc-status ${d.active ? 'active' : 'inactive'}`}>
                              {localizeNode(d.active ? 'Active' : 'Inactive')}
                            </span>
                          </td>
                          <td className="text-center dc-actions">
                            <div
                              className="dc-row-actions"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                maxWidth: '100%',
                              }}
                            >
                              <button
                                type="button"
                                className="cr-action-btn details"
                                style={{
                                  padding: '5px 9px',
                                  fontSize: 11.5,
                                  borderRadius: 7,
                                  lineHeight: 1.2,
                                }}
                                onClick={() => setDetailDiscount(d)}
                                title={translateText('View discount details & users')}
                              >
                                <Eye size={12} />
                                <span>{translateText('View details')}</span>
                              </button>
                              <DiscountActionMenu
                                id={d.id}
                                code={d.code}
                                open={menu === d.id}
                                onOpenChange={setMenu}
                              >
                                <button
                                  role="menuitem"
                                  onClick={() => {
                                    setDetailDiscount(d);
                                    setMenu(null);
                                  }}
                                >
                                  <Eye size={13} />
                                  {translateText('View details & users')}
                                </button>
                                <button role="menuitem" onClick={() => edit(d)}>
                                  <Pencil size={13} />
                                  {translateText('Edit discount')}
                                </button>
                                <button
                                  role="menuitem"
                                  onClick={() => {
                                    setDiscounts(items =>
                                      items.map(item =>
                                        item.id === d.id ? { ...item, active: !item.active } : item,
                                      ),
                                    );
                                    setMenu(null);
                                  }}
                                >
                                  <Power size={13} />
                                  {localizeNode(d.active ? 'Deactivate' : 'Activate')}
                                </button>
                                <button
                                  role="menuitem"
                                  onClick={() => {
                                    navigate(discountNewPath, {
                                      state: {
                                        duplicate: {
                                          ...d,
                                          id: '',
                                          code: `${d.code}_COPY`,
                                          uses: 0,
                                        },
                                      },
                                    });
                                  }}
                                >
                                  <Copy size={13} />
                                  {translateText('Duplicate')}
                                </button>
                                <button
                                  role="menuitem"
                                  className="danger"
                                  onClick={() => {
                                    setDeleteConfirm(d);
                                    setMenu(null);
                                  }}
                                >
                                  <Trash2 size={13} />
                                  {translateText('Delete discount')}
                                </button>
                              </DiscountActionMenu>
                            </div>
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
                {localizeNode(
                  rows.length === 0 && (
                    <div className="dc-empty">
                      {translateText('No discounts match your filters.')}
                      <button
                        onClick={() => {
                          setSearch('');
                          setType('All Types');
                          setStatus('All Status');
                        }}
                      >
                        {translateText('Clear filters')}
                      </button>
                    </div>
                  ),
                )}
              </div>
              <footer className="dc-pagination">
                <span>
                  {translateText('Showing ')}
                  {localizeNode(filtered.length ? (currentPage - 1) * 8 + 1 : 0)} -{' '}
                  {localizeNode(Math.min(currentPage * 8, filtered.length))}
                  {translateText(' of ')}
                  {localizeNode(filtered.length)}
                  {translateText(' discounts')}
                </span>
                <nav aria-label={translateText('Discount pagination')}>
                  <button
                    disabled={currentPage === 1}
                    aria-label={translateText('Previous page')}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  {localizeNode(
                    Array.from({ length: pages }, (_, i) => (
                      <button
                        key={i}
                        className={currentPage === i + 1 ? 'active' : ''}
                        aria-current={currentPage === i + 1 ? 'page' : undefined}
                        onClick={() => setPage(i + 1)}
                      >
                        {localizeNode(i + 1)}
                      </button>
                    )),
                  )}
                  <button
                    disabled={currentPage === pages}
                    aria-label={translateText('Next page')}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight size={12} />
                  </button>
                </nav>
              </footer>
            </div>
            <section className="dc-performance">
              <div className="dc-chart">
                <header>
                  <h2>{translateText('Discount Performance')}</h2>
                  <Select
                    label="Performance date range"
                    value={range}
                    options={[
                      'Last 30 Days',
                      'Last 3 Months',
                      'Last 6 Months',
                      'Year to Date',
                      'Last 12 Months',
                    ]}
                    onChange={setRange}
                  />
                </header>
                <PerformanceChart range={range} orders={paidOrders} />
              </div>
            </section>
          </section>
        </div>

        {/* Discount Details & Users Drawer */}
        {detailDiscount && (
          <QuickDetails
            title={translateText('Discount Details & Redemptions')}
            close={() => setDetailDiscount(null)}
          >
            <div className="cr-details-drawer">
              {/* Hero Summary Banner */}
              <div className="cr-detail-hero">
                <div className="cr-detail-hero-top">
                  <span className={`dc-status ${detailDiscount.active ? 'active' : 'inactive'}`}>
                    {localizeNode(detailDiscount.active ? 'Active' : 'Inactive')}
                  </span>
                  <button
                    type="button"
                    className="cr-copy-ref"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(detailDiscount.code);
                        showToast.success(translateText('Discount code copied'));
                      } catch {}
                    }}
                  >
                    <Copy size={12} />
                    <span>{detailDiscount.code}</span>
                  </button>
                </div>
                <div className="cr-detail-amount">
                  {detailDiscount.type === 'Percentage'
                    ? `${detailDiscount.value}% OFF`
                    : `€${detailDiscount.value} OFF`}
                </div>
                <div className="cr-detail-product-name">
                  {detailDiscount.description || translateText('Promotional discount coupon')}
                </div>
                <div className="cr-detail-timestamp">
                  <Users size={12} />
                  <span>
                    {translateText('Used')}{' '}
                    <b>
                      {Math.max(Number(detailDiscount.uses) || 0, detailRedemptions.length)} /{' '}
                      {detailDiscount.limit || '∞'}
                    </b>{' '}
                    {translateText('times')}
                  </span>
                </div>
              </div>

              {/* Discount Rules Card */}
              <div className="cr-detail-card">
                <h4 className="cr-detail-card-title">
                  <Tag size={14} />
                  <span>{translateText('Discount Configuration')}</span>
                </h4>
                <dl className="cr-detail-dl">
                  <div>
                    <dt>{translateText('Coupon Code')}</dt>
                    <dd>
                      <span className="cr-discount-pill">{detailDiscount.code}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>{translateText('Discount Type')}</dt>
                    <dd>{translateText(detailDiscount.type)}</dd>
                  </div>
                  <div>
                    <dt>{translateText('Discount Value')}</dt>
                    <dd>
                      <strong>
                        {detailDiscount.type === 'Percentage'
                          ? `${detailDiscount.value}%`
                          : `€${detailDiscount.value}`}
                      </strong>
                    </dd>
                  </div>
                  <div>
                    <dt>{translateText('Applies To')}</dt>
                    <dd>{translateText(detailDiscount.applies)}</dd>
                  </div>
                  <div>
                    <dt>{translateText('Usage Limit')}</dt>
                    <dd>
                      {detailDiscount.uses} / {detailDiscount.limit || '∞'}
                    </dd>
                  </div>
                  <div>
                    <dt>{translateText('Expiration Date')}</dt>
                    <dd>{detailDiscount.expiry || translateText('No expiry')}</dd>
                  </div>
                </dl>
              </div>

              {/* Users Who Used This Discount Card */}
              <div className="cr-detail-card">
                <h4 className="cr-detail-card-title">
                  <Users size={14} />
                  <span>
                    {translateText('Users Who Used This Discount')} ({detailRedemptions.length})
                  </span>
                </h4>

                {detailRedemptions.length === 0 ? (
                  <div
                    style={{
                      padding: '22px 14px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: 12,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <Users size={24} style={{ color: '#94a3b8', margin: '0 auto 6px' }} />
                    <strong
                      style={{
                        display: 'block',
                        fontSize: 13.5,
                        color: '#1e293b',
                        marginBottom: 4,
                      }}
                    >
                      {translateText('No redemptions recorded yet')}
                    </strong>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      {translateText(
                        'Customers who apply this coupon code during checkout will appear here with their order details.',
                      )}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {detailRedemptions.map(ord => {
                      const cName = ord.customerName || 'Customer';
                      const cEmail = ord.customerEmail || '';
                      const currency = ord.currency || 'USD';
                      const totalPaid = Number(ord.total ?? ord.amount ?? 0);
                      const savedAmount = Number(ord.discount ?? 0);
                      const st = String(ord.status || 'Paid');

                      return (
                        <div
                          key={ord.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 12,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: 10,
                            }}
                          >
                            <div className="cr-customer-cell">
                              <span className="cr-customer-avatar" aria-hidden="true">
                                {getInitials(cName, cEmail)}
                              </span>
                              <div className="cr-customer-meta">
                                <strong>{cName}</strong>
                                {cEmail && (
                                  <small
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Mail size={11} />
                                    {cEmail}
                                  </small>
                                )}
                                {ord.customerPhone && (
                                  <small
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Phone size={11} />
                                    {ord.customerPhone}
                                  </small>
                                )}
                              </div>
                            </div>

                            <em className={`pp-secondary-status ${st.toLowerCase()}`}>
                              {translateText(st)}
                            </em>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                              gap: 8,
                              paddingTop: 8,
                              borderTop: '1px dashed #e2e8f0',
                              fontSize: 12,
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {translateText('Product')}
                              </span>
                              <strong style={{ color: '#0f172a' }}>
                                {ord.productName || 'Product'}
                              </strong>
                            </div>
                            <div>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {translateText('Saved')}
                              </span>
                              <strong style={{ color: '#16a34a' }}>
                                -{formatOrderMoney(savedAmount, currency)}
                              </strong>
                            </div>
                            <div>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {translateText('Total Paid')}
                              </span>
                              <strong style={{ color: '#0f172a' }}>
                                {formatOrderMoney(totalPaid, currency)}
                              </strong>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: 11.5,
                              color: '#64748b',
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <CreditCard size={12} />
                              {ord.method || 'Checkout'}
                            </span>
                            {(ord.decidedAt || ord.createdAt) && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={11} />
                                {new Date(ord.decidedAt || ord.createdAt || '').toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="cr-detail-actions">
                <button
                  type="button"
                  className="cw-button"
                  onClick={() => {
                    const target = detailDiscount;
                    setDetailDiscount(null);
                    edit(target);
                  }}
                >
                  <Pencil size={14} />
                  <span>{translateText('Edit Discount')}</span>
                </button>
              </div>
            </div>
          </QuickDetails>
        )}

        {deleteConfirm &&
          createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all"
              onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}
            >
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
                    <Trash2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {translateText('Delete Discount')}
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {translateText('Are you sure you want to delete ')}
                    <strong className="text-slate-800">{localizeNode(deleteConfirm.code)}</strong>
                    {translateText('? This action cannot be undone.')}
                  </p>
                  <div className="flex gap-3 w-full">
                    <button
                      className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      {translateText('Cancel')}
                    </button>
                    <button
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                      onClick={async () => {
                        if (
                          !(await setDiscounts(items =>
                            items.filter(item => item.id !== deleteConfirm.id),
                          ))
                        )
                          return;
                        setSelected(ids => ids.filter(id => id !== deleteConfirm.id));
                        notify('Discount deleted.');
                        setDeleteConfirm(null);
                      }}
                    >
                      {translateText('Delete')}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </section>
  );
}

function PerformanceChart({ range, orders }: { range: string; orders: DiscountedOrder[] }) {
  const language = useUILanguage();
  const now = new Date();
  const daily = range === 'Last 30 Days';
  const count = daily
    ? 30
    : range === 'Last 3 Months'
    ? 3
    : range === 'Last 12 Months'
    ? 12
    : range === 'Year to Date'
    ? now.getMonth() + 1
    : 6;
  const dateKey = (date: Date) =>
    daily
      ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      : `${date.getFullYear()}-${date.getMonth()}`;
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (!order.createdAt) continue;
    const key = dateKey(new Date(order.createdAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const label = new Intl.DateTimeFormat(
    language,
    daily ? { month: 'short', day: 'numeric' } : { month: 'short' },
  );
  const buckets = Array.from({ length: count }, (_, index) => {
    const offset = index - count + 1;
    const date = daily
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
      : new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { label: label.format(date), value: counts.get(dateKey(date)) ?? 0 };
  });
  const highest = Math.max(1, ...buckets.map(bucket => bucket.value)),
    width = 420 / count;
  return (
    <svg
      viewBox="0 0 470 118"
      role="img"
      aria-label={translateText('Completed orders with a discount')}
    >
      <line x1="25" x2="445" y1="94" y2="94" stroke="currentColor" opacity=".2" />
      {buckets.map((bucket, index) => {
        const height = (bucket.value / highest) * 76,
          x = 25 + index * width;
        return (
          <g key={bucket.label}>
            <title>
              {bucket.label} · {bucket.value}
            </title>
            <rect
              x={x + width / 4}
              y={94 - height}
              width={width / 2}
              height={height}
              rx="2"
              fill="#7C3AED"
            />
            {(!daily || index % 5 === 0 || index === count - 1) && (
              <text
                x={x + width / 2}
                y="110"
                textAnchor="middle"
                fill="currentColor"
                fontSize="8"
              >
                {bucket.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
