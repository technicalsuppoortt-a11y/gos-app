import { useCurrency } from '../../context/CurrencyContext';
import { QuickDetails } from '../../components/ui/QuickDetails';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Eye,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  User,
  Users,
  X,
} from 'lucide-react';
import { cloudStorage, readCloud, useEntities } from '../../backend/workspace';
import { translateText } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import { storageKey, useProducts } from './repository';
import { Dialog, Field } from './primitives';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import { readWorkspacePreferences, saveWorkspacePreferences } from './workspacePreferences';
import './product-workspace.css';
import './checkout-requests.css';

type RecordRow = Record<string, any>;
const providers = { stripe: 'Stripe', paypal: 'PayPal', applePay: 'Apple Pay', googlePay: 'Google Pay' } as const;

function customerTotals(orders: RecordRow[], formatPrice: (amount: number, currency: string) => string) {
  const totals = new Map<string, number>();
  for (const order of orders) {
    const currency = order.currency || 'USD';
    totals.set(currency, (totals.get(currency) ?? 0) + Number(order.total ?? order.amount ?? 0));
  }
  return totals.size
    ? [...totals].map(([currency, amount]) => formatPrice(amount, currency)).join(' / ')
    : formatPrice(0, 'USD');
}

function getInitials(name?: string, email?: string) {
  const source = (name || email || 'C').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function CommerceRecords({ tab, notify }: { tab: string; notify: (message: string) => void }) {
  const scope = storageKey();
  return <RecordsView key={`${scope}:${tab}`} scope={scope} tab={tab} notify={notify} />;
}

function RecordsView({ scope, tab, notify }: { scope: string; tab: string; notify: (message: string) => void }) {
  const { formatPrice } = useCurrency();
  const money = (row: RecordRow) => formatPrice(Number(row.total ?? row.amount ?? 0), row.currency || 'USD');
  const [quick, setQuick] = useState<RecordRow | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const products = useProducts();
  const orders = useEntities<RecordRow>('orders');
  const contacts = useEntities<RecordRow>('contacts');
  const payments = useEntities<RecordRow>('transactions');
  const [draftOrders, setDraftOrders] = useState(() => readCloud<RecordRow[]>(`${scope}:order-drafts`, []));
  const [preferences, setPreferences] = useState(() => readWorkspacePreferences(scope));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', productId: '', provider: 'stripe' });
  const saving = useRef(false);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize, tab]);

  const quickEmail =
    quick?.customerEmail || quick?.customer_email || quick?.customer?.email || quick?.email || '';
  const relatedPayments = quick
    ? payments.filter(
        t =>
          (t.orderId || t.order_id) === quick.id ||
          (quickEmail &&
            (t.customerEmail || t.customer_email || t.customer?.email || t.email || '').toLowerCase() ===
              quickEmail.toLowerCase()),
      )
    : [];
  const relatedOrders = quick
    ? orders.filter(
        o =>
          o.id === quick.id ||
          o.contactId === quick.id ||
          (quickEmail && (o.customerEmail || '').toLowerCase() === quickEmail.toLowerCase()),
      )
    : [];

  const label =
    tab === 'Orders' ? 'Create Order' : tab === 'Customers' ? 'Add Customer' : 'Add Payment Method';
  const EmptyIcon = tab === 'Orders' ? ShoppingBag : tab === 'Customers' ? Users : CreditCard;
  const emptyDescription =
    tab === 'Orders'
      ? 'Create your first order to keep purchases and customer details in one place.'
      : tab === 'Customers'
      ? 'Add your first customer to start building relationships and tracking purchases.'
      : 'Add a payment method to prepare your checkout. Verified payments will appear here.';

  function openCreate() {
    if (saving.current) return;
    setError('');
    setDraft({ name: '', email: '', phone: '', productId: '', provider: 'stripe' });
    setOpen(true);
  }

  // Raw structured items per tab
  const allOrderRecords = useMemo(() => {
    const merged = [...draftOrders, ...orders];
    const seen = new Set<string>();
    return merged.filter(o => {
      const id = String(o.id || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [draftOrders, orders]);

  const allCustomerRecords = useMemo<RecordRow[]>(() => {
    return contacts.map((row): RecordRow => {
      const purchases = orders.filter(
        order =>
          order.contactId === row.id ||
          (order.customerEmail &&
            row.email &&
            order.customerEmail.toLowerCase() === row.email.toLowerCase()),
      );
      const paidPurchases = purchases.filter(order =>
        /^(paid|completed|succeeded|approved)$/i.test(order.status || ''),
      );
      return {
        ...row,
        ordersCount: purchases.length,
        paidCount: paidPurchases.length,
        lifetimeValue: customerTotals(paidPurchases.length ? paidPurchases : purchases, formatPrice),
        purchases,
        status: row.status || 'Active',
      };
    });
  }, [contacts, orders, formatPrice]);

  const methodRecords = useMemo(() => {
    return (preferences.paymentMethods || []).map(m => {
      const isStripe = m.id === 'stripe' || m.provider.toLowerCase().includes('stripe');
      const isPaypal = m.id === 'paypal' || m.provider.toLowerCase().includes('paypal');
      const isApple = m.id === 'applepay' || m.provider.toLowerCase().includes('apple');
      const isGoogle = m.id === 'googlepay' || m.provider.toLowerCase().includes('google');
      const displayName = isStripe
        ? 'Credit / Debit Cards'
        : isPaypal
        ? 'PayPal Express'
        : isApple
        ? 'Apple Pay'
        : isGoogle
        ? 'Google Pay'
        : m.name || m.provider;
      const typeName = isStripe
        ? 'Visa, Mastercard, Amex'
        : isPaypal
        ? 'One-Click Checkout'
        : isApple
        ? 'Apple Wallet (Tokenized)'
        : isGoogle
        ? 'Google Wallet (Tokenized)'
        : m.type || 'Payment Gateway';
      return {
        id: m.id || m.provider,
        isGateway: true,
        displayName,
        provider: m.provider,
        typeName,
        settlement: 'Instant (0–2 days)',
        status: m.status || 'Active',
      };
    });
  }, [preferences.paymentMethods]);

  // Status filter tabs per view
  const statusOptions = useMemo(() => {
    if (tab === 'Orders') return ['All', 'Paid', 'Pending', 'Draft', 'Rejected'];
    if (tab === 'Customers') return ['All', 'Active', 'Lead'];
    return ['All', 'Paid', 'Completed', 'Pending', 'Rejected'];
  }, [tab]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (tab === 'Orders') {
      return allOrderRecords.filter(r => {
        const st = String(r.status || 'Pending');
        const matchesStatus =
          statusFilter === 'All' || st.toLowerCase() === statusFilter.toLowerCase();
        const hay = `${r.id || ''} ${r.customerName || ''} ${r.customerEmail || ''} ${
          r.productName || ''
        } ${r.method || ''} ${r.discountCode || ''}`.toLowerCase();
        return matchesStatus && (!q || hay.includes(q));
      });
    }
    if (tab === 'Customers') {
      return allCustomerRecords.filter(r => {
        const st = String(r.status || 'Active');
        const matchesStatus =
          statusFilter === 'All' || st.toLowerCase() === statusFilter.toLowerCase();
        const hay = `${r.name || ''} ${r.email || ''} ${r.phone || ''}`.toLowerCase();
        return matchesStatus && (!q || hay.includes(q));
      });
    }
    // Payments tab
    return payments.filter(r => {
      const st = String(r.status || 'Paid');
      const matchesStatus =
        statusFilter === 'All' || st.toLowerCase() === statusFilter.toLowerCase();
      const hay = `${r.id || ''} ${r.customerName || ''} ${r.customerEmail || ''} ${
        r.productName || ''
      } ${r.method || r.provider || ''}`.toLowerCase();
      return matchesStatus && (!q || hay.includes(q));
    });
  }, [tab, allOrderRecords, allCustomerRecords, payments, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const startIdx = filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, filteredRecords.length);

  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      if (
        tab !== 'Payments' &&
        (!draft.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
      ) {
        throw new Error('Enter a customer name and valid email.');
      }
      if (tab === 'Payments') {
        const providerKey = draft.provider as keyof typeof providers;
        const providerName = providers[providerKey] || draft.provider;
        const typeDesc =
          providerKey === 'stripe'
            ? 'Visa, Mastercard, Amex'
            : providerKey === 'paypal'
            ? 'One-Click Checkout'
            : 'Tokenized Wallet';
        const displayName =
          providerKey === 'stripe'
            ? 'Credit / Debit Cards'
            : providerKey === 'paypal'
            ? 'PayPal Express'
            : providerKey === 'applePay'
            ? 'Apple Pay'
            : 'Google Pay';
        const currentMethods = preferences.paymentMethods || [];
        const existingIndex = currentMethods.findIndex(
          m => m.provider === providerName || m.id === providerKey,
        );
        const updatedMethod = {
          id: providerKey,
          provider: providerName,
          name: displayName,
          type: typeDesc,
          status: 'Active',
          createdAt: new Date().toISOString(),
        };
        const nextMethods =
          existingIndex >= 0
            ? currentMethods.map((m, idx) => (idx === existingIndex ? { ...m, status: 'Active' } : m))
            : [...currentMethods, updatedMethod];
        const next = {
          ...readWorkspacePreferences(scope),
          [providerKey]: true,
          paymentMethods: nextMethods,
        };
        await saveWorkspacePreferences(scope, next);
        setPreferences(next);
      } else if (tab === 'Customers') {
        const current = readCloud<RecordRow[]>('entity:contacts', []);
        const normalizedEmail = draft.email.trim().toLowerCase();
        if (current.some(row => row.email?.trim().toLowerCase() === normalizedEmail)) {
          throw new Error('A customer with this email already exists.');
        }
        const createdAt = new Date().toISOString();
        const contactId = crypto.randomUUID();
        await cloudStorage.setItem(
          'entity:contacts',
          JSON.stringify([
            {
              id: contactId,
              name: draft.name.trim(),
              email: draft.email.trim(),
              phone: draft.phone.trim(),
              status: 'Active',
              createdAt,
            },
            ...current,
          ]),
        );
        try {
          const existingLeads = readCloud<Record<string, any>[]>('entity:leads', []);
          if (!existingLeads.some(l => String(l.email || '').trim().toLowerCase() === normalizedEmail)) {
            const leadId = `lead-customer-${contactId.slice(0, 12)}`;
            await cloudStorage.setItem(
              'entity:leads',
              JSON.stringify([
                {
                  id: leadId,
                  name: draft.name.trim(),
                  email: draft.email.trim(),
                  phone: draft.phone.trim(),
                  company: '',
                  source: 'Services',
                  owner: 'Unassigned',
                  pipelineId: 'main',
                  stage: 'CONTACT_CREATED',
                  lifecycleStage: 'CONTACT_CREATED',
                  value: 0,
                  currency: 'USD',
                  qualificationStatus: 'Qualified',
                  bookingStatus: 'Not Scheduled',
                  followUpState: 'CUSTOMER',
                  hasWhatsAppConsent: Boolean(draft.phone.trim()),
                  hasMessagingConsent: true,
                  hasEmailConsent: Boolean(normalizedEmail),
                  tags: ['Customer'],
                  activities: [{ id: `act-${contactId}`, type: 'capture', title: 'Customer added in Products', detail: draft.email.trim(), at: createdAt }],
                  notes: [],
                  createdAt,
                  lastActivity: createdAt,
                },
                ...existingLeads,
              ]),
              { silent: true },
            );
          }
        } catch { /* ignore if CRM leads resource not yet initialized */ }
      } else {
        const product = products.find(row => row.id === draft.productId);
        if (!product) throw new Error('Select a product for this order.');
        const createdAt = new Date().toISOString();
        const orderId = `draft-${crypto.randomUUID()}`;
        const current = readCloud<RecordRow[]>(`${scope}:order-drafts`, []);
        const next = [
          {
            id: orderId,
            customerName: draft.name.trim(),
            customerEmail: draft.email.trim(),
            productId: product.id,
            productName: product.name,
            amount: product.config?.amount ?? 0,
            currency: product.config?.currency ?? 'USD',
            status: 'Draft',
            createdAt,
          },
          ...current,
        ];
        await cloudStorage.setItem(`${scope}:order-drafts`, JSON.stringify(next));
        setDraftOrders(next);
        try {
          const normalizedEmail = draft.email.trim().toLowerCase();
          if (normalizedEmail) {
            const existingLeads = readCloud<Record<string, any>[]>('entity:leads', []);
            const matchIdx = existingLeads.findIndex(l => String(l.email || '').trim().toLowerCase() === normalizedEmail);
            const orderValue = Number(product.config?.amount ?? 0);
            const orderCurrency = product.config?.currency ?? 'USD';
            if (matchIdx >= 0) {
              const prev = existingLeads[matchIdx];
              const prevAttached = Array.isArray(prev.attachedProducts) ? prev.attachedProducts : [];
              const updated = {
                ...prev,
                value: Math.max(Number(prev.value || 0), orderValue),
                currency: prev.currency || orderCurrency,
                interest: prev.interest || product.name,
                orderId,
                attachedProducts: prevAttached.some((p: any) => p?.productId === product.id)
                  ? prevAttached
                  : [...prevAttached, { productId: product.id, productName: product.name, attachedAt: createdAt }],
                lastActivity: createdAt,
              };
              const nextLeads = [...existingLeads];
              nextLeads[matchIdx] = updated;
              await cloudStorage.setItem('entity:leads', JSON.stringify(nextLeads), { silent: true });
            } else {
              const leadId = `lead-order-${orderId.replace(/[^a-z0-9]/gi, '').slice(0, 20)}`;
              const rawProdType = String(product.type || '').trim().toLowerCase();
              const prodTypeLabel: 'Course' | 'Digital Product' | 'Service' = rawProdType.includes('course')
                ? 'Course'
                : rawProdType.includes('service') || rawProdType.includes('booking') || rawProdType.includes('consult')
                  ? 'Service'
                  : 'Digital Product';
              await cloudStorage.setItem(
                'entity:leads',
                JSON.stringify([
                  {
                    id: leadId,
                    name: draft.name.trim() || normalizedEmail.split('@')[0],
                    email: draft.email.trim(),
                    phone: draft.phone.trim(),
                    company: '',
                    source: 'Services',
                    owner: 'Unassigned',
                    pipelineId: product.config?.crmRouting?.pipelineId || 'main',
                    stage: 'CONTACT_CREATED',
                    lifecycleStage: 'CONTACT_CREATED',
                    value: orderValue,
                    currency: orderCurrency,
                    interest: `${prodTypeLabel}: ${product.name}`,
                    orderId,
                    qualificationStatus: 'Pending',
                    bookingStatus: 'Not Scheduled',
                    followUpState: 'CONTACTED',
                    hasWhatsAppConsent: Boolean(draft.phone.trim()),
                    hasMessagingConsent: true,
                    hasEmailConsent: true,
                    tags: [prodTypeLabel, product.name],
                    attachedProducts: [{ productId: product.id, productName: product.name, productType: prodTypeLabel, attachedAt: createdAt }],
                    activities: [{ id: `act-${orderId}`, type: 'payment', title: 'Order created in Products', detail: `${prodTypeLabel}: ${product.name} · ${orderCurrency} ${orderValue.toFixed(2)}`, at: createdAt }],
                    notes: [],
                    createdAt,
                    lastActivity: createdAt,
                  },
                  ...existingLeads,
                ]),
                { silent: true },
              );
            }
          }
        } catch { /* ignore if CRM leads resource not yet initialized */ }
      }
      setOpen(false);
      notify('Changes saved');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save changes.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const totalCount =
    tab === 'Orders'
      ? allOrderRecords.length
      : tab === 'Customers'
      ? allCustomerRecords.length
      : payments.length + methodRecords.length;

  return (
    <section className="pp-secondary-view checkout-requests cr-view">
      {/* Header + KPI Strip */}
      <div className="pp-secondary-heading cr-header">
        <div>
          <h2>{translateText(tab)}</h2>
          <p>{translateText(`Manage your ${tab.toLowerCase()} across products and payments.`)}</p>
        </div>
        <div className="cr-kpi-strip" style={{ alignItems: 'center' }}>
          {tab === 'Orders' && (
            <>
              <div className="cr-kpi-pill">
                <span className="cr-kpi-label">{translateText('Total Orders')}</span>
                <strong>{allOrderRecords.length}</strong>
              </div>
              <div className="cr-kpi-pill approved">
                <span className="cr-kpi-label">{translateText('Paid')}</span>
                <strong>
                  {
                    allOrderRecords.filter(o =>
                      /^(paid|completed|approved)$/i.test(String(o.status || '')),
                    ).length
                  }
                </strong>
              </div>
              <div className="cr-kpi-pill pending">
                <span className="cr-kpi-label">{translateText('Pending / Draft')}</span>
                <strong>
                  {
                    allOrderRecords.filter(o =>
                      /^(pending|draft)$/i.test(String(o.status || 'Pending')),
                    ).length
                  }
                </strong>
              </div>
            </>
          )}
          {tab === 'Customers' && (
            <>
              <div className="cr-kpi-pill">
                <span className="cr-kpi-label">{translateText('Total Customers')}</span>
                <strong>{allCustomerRecords.length}</strong>
              </div>
              <div className="cr-kpi-pill approved">
                <span className="cr-kpi-label">{translateText('Active Buyers')}</span>
                <strong>{allCustomerRecords.filter(c => c.ordersCount > 0).length}</strong>
              </div>
            </>
          )}
          {tab === 'Payments' && (
            <>
              <div className="cr-kpi-pill">
                <span className="cr-kpi-label">{translateText('Recorded Payments')}</span>
                <strong>{payments.length}</strong>
              </div>
              <div className="cr-kpi-pill approved">
                <span className="cr-kpi-label">{translateText('Settled')}</span>
                <strong>
                  {
                    payments.filter(p =>
                      /^(paid|completed|approved)$/i.test(String(p.status || '')),
                    ).length
                  }
                </strong>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={openCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 10,
              background: '#7c3aed',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
            }}
          >
            <Plus size={15} />
            {translateText(label)}
          </button>
        </div>
      </div>

      {/* Connected Gateways table in Payments tab if any configured */}
      {tab === 'Payments' && methodRecords.length > 0 && (
        <div className="cr-table-card" style={{ marginBottom: 16 }}>
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: 12,
              fontWeight: 800,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {translateText('Configured Checkout Gateways')}
          </div>
          <div className="request-table">
            <table>
              <thead>
                <tr>
                  <th>{translateText('Payment Method')}</th>
                  <th>{translateText('Provider')}</th>
                  <th>{translateText('Accepted Types')}</th>
                  <th>{translateText('Settlement')}</th>
                  <th>{translateText('Status')}</th>
                  <th>{translateText('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {methodRecords.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div className="cr-customer-cell">
                        <span className="cr-customer-avatar" aria-hidden="true">
                          <CreditCard size={15} />
                        </span>
                        <div className="cr-customer-meta">
                          <b>{translateText(m.displayName)}</b>
                          <small>{m.provider}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="cr-method-badge">{m.provider}</span>
                    </td>
                    <td className="cr-date-cell">{translateText(m.typeName)}</td>
                    <td className="cr-date-cell">{translateText(m.settlement)}</td>
                    <td>
                      <span className="request-status active">
                        <span className="cr-status-dot" aria-hidden="true" />
                        {translateText(m.status)}
                      </span>
                    </td>
                    <td>
                      <div className="cr-row-actions">
                        <button
                          type="button"
                          className="cw-button cr-action-btn details"
                          onClick={() =>
                            setQuick({
                              id: m.id,
                              name: m.displayName,
                              provider: m.provider,
                              AcceptedTypes: m.typeName,
                              Settlement: m.settlement,
                              status: m.status,
                            })
                          }
                        >
                          <Eye size={14} />
                          <span>{translateText('View details')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search & Status Filter Toolbar */}
      {totalCount > 0 && (
        <div className="request-filters cr-toolbar">
          <label className="cr-search-box">
            <Search size={16} className="cr-search-icon" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={translateText(
                tab === 'Customers'
                  ? 'Search customers by name, email, or phone...'
                  : `Search ${tab.toLowerCase()} by customer, product, method, or ID...`,
              )}
              aria-label={translateText(`Search ${tab.toLowerCase()}`)}
            />
            {search && (
              <button
                type="button"
                className="cr-search-clear"
                onClick={() => setSearch('')}
                aria-label={translateText('Clear search')}
              >
                <X size={14} />
              </button>
            )}
          </label>

          <div className="cr-filter-group">
            <div className="cr-status-tabs" role="tablist" aria-label={translateText('Filter by status')}>
              {statusOptions.map(s => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === s}
                  className={`cr-status-tab ${statusFilter === s ? 'active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  <span>{translateText(s)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Records Table */}
      {filteredRecords.length > 0 ? (
        <div className="cr-table-card">
          {tab === 'Orders' && (
            <div className="request-table">
              <table>
                <thead>
                  <tr>
                    <th>{translateText('Customer')}</th>
                    <th>{translateText('Product & Order ID')}</th>
                    <th>{translateText('Method')}</th>
                    <th>{translateText('Total')}</th>
                    <th>{translateText('Date')}</th>
                    <th>{translateText('Status')}</th>
                    <th>{translateText('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map(row => {
                    const cName =
                      row.customerName ||
                      row.customer?.name ||
                      (typeof row.customer === 'string' ? row.customer : 'Customer');
                    const cEmail = row.customerEmail || row.customer?.email || '';
                    const st = String(row.status || 'Pending');
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="cr-customer-cell">
                            <span className="cr-customer-avatar" aria-hidden="true">
                              {getInitials(cName, cEmail)}
                            </span>
                            <div className="cr-customer-meta">
                              <b>{cName}</b>
                              <small>{cEmail || '—'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cr-product-cell">
                            <span className="cr-product-name">{row.productName || row.product_name || '—'}</span>
                            <small className="cr-ref-code">#{String(row.id).slice(-8).toUpperCase()}</small>
                          </div>
                        </td>
                        <td>
                          <span className="cr-method-badge">{row.method || 'Checkout'}</span>
                        </td>
                        <td>
                          <div className="cr-total-cell">
                            <strong className="cr-amount">{money(row)}</strong>
                            {row.discountCode && (
                              <small className="cr-discount-pill">{row.discountCode}</small>
                            )}
                          </div>
                        </td>
                        <td className="cr-date-cell">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                        </td>
                        <td>
                          <span className={`request-status ${st.toLowerCase()}`}>
                            <span className="cr-status-dot" aria-hidden="true" />
                            {translateText(st)}
                          </span>
                        </td>
                        <td>
                          <div className="cr-row-actions">
                            <button
                              type="button"
                              className="cw-button cr-action-btn details"
                              onClick={() => setQuick(row)}
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
          )}

          {tab === 'Customers' && (
            <div className="request-table">
              <table>
                <thead>
                  <tr>
                    <th>{translateText('Customer')}</th>
                    <th>{translateText('Phone')}</th>
                    <th>{translateText('Orders')}</th>
                    <th>{translateText('Lifetime Value')}</th>
                    <th>{translateText('Status')}</th>
                    <th>{translateText('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map(row => (
                    <tr key={row.id || row.email}>
                      <td>
                        <div className="cr-customer-cell">
                          <span className="cr-customer-avatar" aria-hidden="true">
                            {getInitials(row.name, row.email)}
                          </span>
                          <div className="cr-customer-meta">
                            <b>{row.name || '—'}</b>
                            <small>{row.email || '—'}</small>
                          </div>
                        </div>
                      </td>
                      <td className="cr-date-cell">{row.phone || '—'}</td>
                      <td>
                        <span className="cr-method-badge">
                          {row.ordersCount} {translateText(row.ordersCount === 1 ? 'order' : 'orders')}
                        </span>
                      </td>
                      <td>
                        <strong className="cr-amount">{row.lifetimeValue}</strong>
                      </td>
                      <td>
                        <span className={`request-status ${String(row.status || 'Active').toLowerCase()}`}>
                          <span className="cr-status-dot" aria-hidden="true" />
                          {translateText(row.status || 'Active')}
                        </span>
                      </td>
                      <td>
                        <div className="cr-row-actions">
                          <button
                            type="button"
                            className="cw-button cr-action-btn details"
                            onClick={() => setQuick(row)}
                          >
                            <Eye size={14} />
                            <span>{translateText('View details')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Payments' && (
            <div className="request-table">
              <table>
                <thead>
                  <tr>
                    <th>{translateText('Customer')}</th>
                    <th>{translateText('Product & Payment ID')}</th>
                    <th>{translateText('Provider / Method')}</th>
                    <th>{translateText('Amount')}</th>
                    <th>{translateText('Date')}</th>
                    <th>{translateText('Status')}</th>
                    <th>{translateText('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map(row => {
                    const cName = row.customerName || row.customer?.name || 'Customer';
                    const cEmail = row.customerEmail || row.customer?.email || '';
                    const st = String(row.status || 'Paid');
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="cr-customer-cell">
                            <span className="cr-customer-avatar" aria-hidden="true">
                              {getInitials(cName, cEmail)}
                            </span>
                            <div className="cr-customer-meta">
                              <b>{cName}</b>
                              <small>{cEmail || '—'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cr-product-cell">
                            <span className="cr-product-name">{row.productName || '—'}</span>
                            <small className="cr-ref-code">#{String(row.id).slice(-8).toUpperCase()}</small>
                          </div>
                        </td>
                        <td>
                          <span className="cr-method-badge">
                            <CreditCard size={12} />
                            {row.method || row.provider || '—'}
                          </span>
                        </td>
                        <td>
                          <strong className="cr-amount">{money(row)}</strong>
                        </td>
                        <td className="cr-date-cell">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                        </td>
                        <td>
                          <span className={`request-status ${st.toLowerCase()}`}>
                            <span className="cr-status-dot" aria-hidden="true" />
                            {translateText(st)}
                          </span>
                        </td>
                        <td>
                          <div className="cr-row-actions">
                            <button
                              type="button"
                              className="cw-button cr-action-btn details"
                              onClick={() => setQuick(row)}
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
          )}

          {/* Pagination Footer */}
          <footer className="cr-pagination" aria-label={translateText('Pagination')}>
            <div className="cr-pagination-info">
              <span>
                {translateText('Showing')} <b>{startIdx}–{endIdx}</b> {translateText('of')}{' '}
                <b>{filteredRecords.length}</b> {translateText(tab.toLowerCase())}
              </span>
              <label className="cr-page-size">
                <span>{translateText('Rows per page')}</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  aria-label={translateText('Rows per page')}
                >
                  {[5, 8, 15, 25].map(n => (
                    <option key={n} value={n}>
                      {n}
                    </option>
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
        </div>
      ) : totalCount === 0 ? (
        <div className="pp-records-empty">
          <span className="pp-records-empty-icon">
            <EmptyIcon size={28} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h3>{translateText(`No ${tab} Yet`)}</h3>
          <p>{translateText(emptyDescription)}</p>
          <button type="button" className="cw-button primary" onClick={openCreate}>
            <Plus size={15} />
            {translateText(label)}
          </button>
        </div>
      ) : (
        <div className="pp-records-empty cr-empty">
          <span className="pp-records-empty-icon">
            <EmptyIcon size={28} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h3>{translateText(`No matching ${tab.toLowerCase()}`)}</h3>
          <p>{translateText('Try adjusting your search query or status filter.')}</p>
          <button
            type="button"
            className="cw-button"
            onClick={() => {
              setSearch('');
              setStatusFilter('All');
            }}
          >
            {translateText('Reset filters')}
          </button>
        </div>
      )}

      {/* Professional QuickDetails Drawer */}
      {quick && (
        <QuickDetails
          title={translateText(
            tab === 'Customers'
              ? 'Customer profile & history'
              : tab === 'Orders'
              ? 'Order & customer details'
              : 'Payment & transaction details',
          )}
          close={() => setQuick(null)}
        >
          <div className="cr-details-drawer">
            {/* Hero Summary Banner */}
            <div className="cr-detail-hero">
              <div className="cr-detail-hero-top">
                <em
                  className={`pp-secondary-status ${String(
                    quick.status || 'Active',
                  ).toLowerCase()}`}
                >
                  {translateText(String(quick.status || 'Active'))}
                </em>
                {quick.id && (
                  <button
                    type="button"
                    className="cr-copy-ref"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(String(quick.id));
                        showToast.success(translateText('Reference ID copied'));
                      } catch {}
                    }}
                  >
                    <Copy size={12} />
                    <span>#{String(quick.id).slice(-8).toUpperCase()}</span>
                  </button>
                )}
              </div>

              <div className="cr-detail-amount">
                {tab === 'Customers'
                  ? allCustomerRecords.find(row => row.id === quick.id)?.lifetimeValue || formatPrice(0)
                  : money(quick)}
              </div>
              <div className="cr-detail-product-name">
                {tab === 'Customers'
                  ? quick.name || quickEmail || 'Customer'
                  : quick.productName || quick.product_name || quick.name || 'Order Record'}
              </div>
              {quick.createdAt && (
                <div className="cr-detail-timestamp">
                  <Clock size={12} />
                  <span>{new Date(quick.createdAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Customer Information Card */}
            <div className="cr-detail-card">
              <h4 className="cr-detail-card-title">
                <User size={14} />
                <span>{translateText('Customer Information')}</span>
              </h4>
              <dl className="cr-detail-dl">
                <div>
                  <dt>{translateText('Full Name')}</dt>
                  <dd>
                    {quick.customerName ||
                      quick.customer?.name ||
                      quick.name ||
                      (typeof quick.customer === 'string' ? quick.customer : '—')}
                  </dd>
                </div>
                <div>
                  <dt>{translateText('Email Address')}</dt>
                  <dd>
                    {quickEmail ? (
                      <a href={`mailto:${quickEmail}`} className="cr-detail-link">
                        <Mail size={12} />
                        {quickEmail}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{translateText('Phone Number')}</dt>
                  <dd>
                    {quick.customerPhone || quick.customer?.phone || quick.phone ? (
                      <span className="cr-detail-inline">
                        <Phone size={12} />
                        {quick.customerPhone || quick.customer?.phone || quick.phone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Order / Payment Breakdown Card */}
            {tab !== 'Customers' && (
              <div className="cr-detail-card">
                <h4 className="cr-detail-card-title">
                  <CreditCard size={14} />
                  <span>{translateText('Order & Payment Breakdown')}</span>
                </h4>
                <dl className="cr-detail-dl">
                  <div>
                    <dt>{translateText('Product')}</dt>
                    <dd>{quick.productName || quick.product_name || '—'}</dd>
                  </div>
                  <div>
                    <dt>{translateText('Payment Method')}</dt>
                    <dd>
                      <span className="cr-method-badge">
                        {quick.method || quick.provider || 'Checkout'}
                      </span>
                    </dd>
                  </div>
                  {quick.discountCode && (
                    <div>
                      <dt>{translateText('Discount Code')}</dt>
                      <dd>
                        <span className="cr-discount-pill">
                          <Tag size={11} />
                          {quick.discountCode}
                          {quick.discount ? ` (-${quick.discount})` : ''}
                        </span>
                      </dd>
                    </div>
                  )}
                  <div className="cr-detail-total-row">
                    <dt>{translateText('Total Amount')}</dt>
                    <dd>
                      <strong>{money(quick)}</strong>
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Purchased Products / Order History */}
            <div className="cr-detail-card">
              <h4 className="cr-detail-card-title">
                <ShoppingBag size={14} />
                <span>
                  {translateText(
                    tab === 'Customers' ? 'Customer Orders & Products' : 'Purchased Items',
                  )}
                </span>
              </h4>
              {relatedOrders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {relatedOrders.map(ord => (
                    <div
                      key={ord.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>
                          {ord.productName || 'Product'}
                        </strong>
                        <small style={{ fontSize: 11.5, color: '#64748b' }}>
                          {ord.method || 'Checkout'} ·{' '}
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : ''}
                        </small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>
                          {money(ord)}
                        </strong>
                        <em
                          className={`pp-secondary-status ${String(
                            ord.status || 'Paid',
                          ).toLowerCase()}`}
                        >
                          {translateText(String(ord.status || 'Paid'))}
                        </em>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  {quick.productName || quick.product_name || translateText('No orders recorded yet.')}
                </p>
              )}
            </div>

            {/* Transaction History Card */}
            <div className="cr-detail-card">
              <h4 className="cr-detail-card-title">
                <CheckCircle2 size={14} />
                <span>{translateText('Transaction History')}</span>
              </h4>
              {!relatedPayments.length ? (
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  {translateText('No recorded transactions for this customer.')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {relatedPayments.map(t => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>
                          {money(t)} · {t.method || t.provider || 'Payment'}
                        </strong>
                        <small style={{ fontSize: 11.5, color: '#64748b' }}>
                          #{String(t.id).slice(-8).toUpperCase()} ·{' '}
                          {t.createdAt ? new Date(t.createdAt).toLocaleString() : t.at || ''}
                        </small>
                      </div>
                      <em
                        className={`pp-secondary-status ${String(
                          t.status || 'Paid',
                        ).toLowerCase()}`}
                      >
                        {translateText(String(t.status || 'Paid'))}
                      </em>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </QuickDetails>
      )}

      {/* Create Modal */}
      {open && (
        <Dialog
          title={label}
          onClose={() => {
            if (!saving.current) setOpen(false);
          }}
        >
          <form
            className="ce-settings-form"
            onSubmit={event => {
              event.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={busy} className="pp-settings-fields">
              {tab === 'Payments' ? (
                <>
                  <p className="cw-help">
                    {translateText(
                      'Enable a payment method for checkout. Live payments require a connected payment provider.',
                    )}
                  </p>
                  <Field label="Payment method">
                    <CommerceSelect
                      value={draft.provider}
                      options={Object.entries(providers).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      onChange={provider => setDraft(current => ({ ...current, provider }))}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Customer name">
                    <input
                      required
                      value={draft.name}
                      placeholder={translateText('Customer name')}
                      onChange={event =>
                        setDraft(current => ({ ...current, name: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      required
                      type="email"
                      value={draft.email}
                      placeholder="name@example.com"
                      onChange={event =>
                        setDraft(current => ({ ...current, email: event.target.value }))
                      }
                    />
                  </Field>
                  {tab === 'Customers' ? (
                    <Field label="Phone">
                      <input
                        type="tel"
                        value={draft.phone}
                        placeholder={translateText('Phone number (optional)')}
                        onChange={event =>
                          setDraft(current => ({ ...current, phone: event.target.value }))
                        }
                      />
                    </Field>
                  ) : (
                    <>
                      <Field label="Product">
                        <CommerceSelect
                          label="Order product"
                          value={draft.productId}
                          placeholder="Select a product"
                          options={products.map(product => ({
                            value: product.id,
                            label: product.name,
                          }))}
                          onChange={productId => setDraft(current => ({ ...current, productId }))}
                        />
                      </Field>
                      <p className="cw-help">
                        {translateText(
                          'Orders are created as drafts. Payment status is updated by the payment provider.',
                        )}
                      </p>
                    </>
                  )}
                </>
              )}
              {error && (
                <p className="cw-errors" role="alert">
                  {error}
                </p>
              )}
              <div className="course-modal-actions">
                <button type="button" className="cw-button" onClick={() => setOpen(false)}>
                  {translateText('Cancel')}
                </button>
                <button
                  type="submit"
                  className="cw-button primary"
                  disabled={busy || (tab === 'Orders' && !draft.productId)}
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {translateText(busy ? 'Saving…' : 'Save Changes')}
                </button>
              </div>
            </fieldset>
          </form>
        </Dialog>
      )}
    </section>
  );
}
