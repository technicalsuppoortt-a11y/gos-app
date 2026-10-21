import { useRef, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, Plus, ShieldCheck, ShoppingBag, Users } from 'lucide-react';
import { cloudStorage, readCloud, useEntities } from '../../backend/workspace';
import { translateText } from '../../i18n/display';
import { storageKey, useProducts } from './repository';
import { Dialog, Field } from './primitives';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import { readWorkspacePreferences, saveWorkspacePreferences } from './workspacePreferences';
import './product-workspace.css';

type RecordRow = Record<string, any>;
const providers = { stripe: 'Stripe', paypal: 'PayPal', applePay: 'Apple Pay', googlePay: 'Google Pay' } as const;
const money = (row: RecordRow) => {
  const amount = Number(row.total ?? row.amount ?? 0);
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: row.currency || 'EUR' }).format(amount); }
  catch { return `${amount} ${row.currency || 'EUR'}`; }
};
function customerTotals(orders: RecordRow[]) {
  const totals = new Map<string, number>();
  for (const order of orders) {
    const currency = order.currency || 'EUR';
    totals.set(currency, (totals.get(currency) ?? 0) + Number(order.total ?? order.amount ?? 0));
  }
  return totals.size ? [...totals].map(([currency, amount]) => money({ currency, amount })).join(' / ') : money({ amount: 0 });
}

export function CommerceRecords({ tab, notify }: { tab: string; notify: (message: string) => void }) {
  const scope = storageKey();
  return <RecordsView key={`${scope}:${tab}`} scope={scope} tab={tab} notify={notify}/>;
}
function RecordsView({ scope, tab, notify }: { scope: string; tab: string; notify: (message: string) => void }) {
  const products = useProducts();
  const orders = useEntities<RecordRow>('orders');
  const contacts = useEntities<RecordRow>('contacts');
  const payments = useEntities<RecordRow>('transactions');
  const [draftOrders, setDraftOrders] = useState(() => readCloud<RecordRow[]>(`${scope}:order-drafts`, []));
  const [preferences, setPreferences] = useState(() => readWorkspacePreferences(scope));
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', productId: '', provider: 'stripe' });
  const saving = useRef(false);
  const label = tab === 'Orders' ? 'Create Order' : tab === 'Customers' ? 'Add Customer' : 'Add Payment Method';
  const EmptyIcon = tab === 'Orders' ? ShoppingBag : tab === 'Customers' ? Users : CreditCard;
  const emptyDescription = tab === 'Orders' ? 'Create your first order to keep purchases and customer details in one place.' : tab === 'Customers' ? 'Add your first customer to start building relationships and tracking purchases.' : 'Add a payment method to prepare your checkout. Verified payments will appear here.';
  function openCreate() { if (saving.current) return; setError(''); setDraft({ name: '', email: '', phone: '', productId: '', provider: 'stripe' }); setOpen(true); }
  const methodRows = (preferences.paymentMethods || []).map(m => {
    const isStripe = m.id === 'stripe' || m.provider.toLowerCase().includes('stripe');
    const isPaypal = m.id === 'paypal' || m.provider.toLowerCase().includes('paypal');
    const isApple = m.id === 'applepay' || m.provider.toLowerCase().includes('apple');
    const isGoogle = m.id === 'googlepay' || m.provider.toLowerCase().includes('google');
    const displayName = isStripe ? 'Credit / Debit Cards' : isPaypal ? 'PayPal Express' : isApple ? 'Apple Pay' : isGoogle ? 'Google Pay' : (m.name || m.provider);
    const typeName = isStripe ? 'Visa, Mastercard, Amex' : isPaypal ? 'One-Click Checkout' : isApple ? 'Apple Wallet (Tokenized)' : isGoogle ? 'Google Wallet (Tokenized)' : (m.type || 'Payment Gateway');
    return [
      displayName,
      m.provider,
      typeName,
      'Instant (0–2 days)',
      m.status || 'Active'
    ];
  });
  const txRows = payments.map(row => [
    row.id,
    row.customerName || row.customer?.name || '—',
    row.method || row.provider || '—',
    money(row),
    row.status || 'Pending'
  ]);
  const rows: string[][] = tab === 'Orders'
    ? [...draftOrders, ...orders].map(row => [row.id, row.customerName || row.customer?.name || (typeof row.customer === 'string' ? row.customer : '—'), row.productName || row.product_name || '—', money(row), row.status || 'Pending'])
    : tab === 'Customers'
      ? contacts.map(row => { const purchases = orders.filter(order => order.contactId === row.id || order.customerEmail && order.customerEmail.toLowerCase() === row.email?.toLowerCase()); return [row.name || '—', row.email || '—', `${purchases.length} orders`, customerTotals(purchases), row.status || 'Active']; })
      : methodRows.length ? [...methodRows, ...txRows] : txRows;
  const headers = tab === 'Orders'
    ? ['Order', 'Customer', 'Product', 'Total', 'Status']
    : tab === 'Customers'
      ? ['Customer', 'Email', 'Orders', 'Lifetime value', 'Status']
      : methodRows.length
        ? ['Payment Method', 'Provider', 'Accepted Types', 'Settlement', 'Status']
        : ['Payment', 'Customer', 'Provider', 'Amount', 'Status'];

  async function save() {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try {
      if (tab !== 'Payments' && (!draft.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))) throw new Error('Enter a customer name and valid email.');
      if (tab === 'Payments') {
        const providerKey = draft.provider as keyof typeof providers;
        const providerName = providers[providerKey] || draft.provider;
        const typeDesc = providerKey === 'stripe' ? 'Visa, Mastercard, Amex' : providerKey === 'paypal' ? 'One-Click Checkout' : 'Tokenized Wallet';
        const displayName = providerKey === 'stripe' ? 'Credit / Debit Cards' : providerKey === 'paypal' ? 'PayPal Express' : providerKey === 'applePay' ? 'Apple Pay' : 'Google Pay';
        const currentMethods = preferences.paymentMethods || [];
        const existingIndex = currentMethods.findIndex(m => m.provider === providerName || m.id === providerKey);
        const updatedMethod = {
          id: providerKey,
          provider: providerName,
          name: displayName,
          type: typeDesc,
          status: 'Active',
          createdAt: new Date().toISOString()
        };
        const nextMethods = existingIndex >= 0
          ? currentMethods.map((m, idx) => idx === existingIndex ? { ...m, status: 'Active' } : m)
          : [...currentMethods, updatedMethod];
        const next = {
          ...readWorkspacePreferences(scope),
          [providerKey]: true,
          paymentMethods: nextMethods
        };
        await saveWorkspacePreferences(scope, next);
        setPreferences(next);
      } else if (tab === 'Customers') {
        const current = readCloud<RecordRow[]>('entity:contacts', []);
        if (current.some(row => row.email?.trim().toLowerCase() === draft.email.trim().toLowerCase())) throw new Error('A customer with this email already exists.');
        await cloudStorage.setItem('entity:contacts', JSON.stringify([{ id: crypto.randomUUID(), name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim(), status: 'Active', createdAt: new Date().toISOString() }, ...current]));
      } else {
        const product = products.find(row => row.id === draft.productId);
        if (!product) throw new Error('Select a product for this order.');
        // Paid orders remain owned by the payment backend. Manual orders start as drafts.
        const current = readCloud<RecordRow[]>(`${scope}:order-drafts`, []);
        const next = [{ id: `draft-${crypto.randomUUID()}`, customerName: draft.name.trim(), customerEmail: draft.email.trim(), productId: product.id, productName: product.name, amount: product.config?.amount ?? 0, currency: product.config?.currency ?? 'EUR', status: 'Draft', createdAt: new Date().toISOString() }, ...current];
        await cloudStorage.setItem(`${scope}:order-drafts`, JSON.stringify(next)); setDraftOrders(next);
      }
      setOpen(false); notify('Changes saved');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save changes.'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <section className="pp-secondary-view">
    <div className="pp-secondary-heading"><div><h2>{translateText(tab)}</h2><p>{translateText(`Manage your ${tab.toLowerCase()} across products and payments.`)}</p></div><button onClick={openCreate}><Plus size={14}/>{translateText(label)}</button></div>
    {rows.length ? <div className="pp-secondary-table"><div>{headers.map(header => <b key={header}>{translateText(header)}</b>)}</div>{rows.map((row, index) => <div key={`${row[0]}:${index}`}>{row.map((cell, column) => <span key={column}>{column === 0 && tab === 'Payments' ? <span className="pp-table-cell-with-icon"><CreditCard size={14} className="pp-cell-icon"/><b>{cell}</b></span> : column === row.length - 1 ? <em className={`pp-secondary-status ${cell.toLowerCase()}`}>{translateText(cell)}</em> : cell}</span>)}</div>)}</div>
      : <div className="pp-records-empty"><span className="pp-records-empty-icon"><EmptyIcon size={28} strokeWidth={1.5} aria-hidden="true"/></span><h3>{translateText(`No ${tab} Yet`)}</h3><p>{translateText(emptyDescription)}</p><button type="button" className="cw-button primary" onClick={openCreate}><Plus size={15}/>{translateText(label)}</button></div>}
    {tab === 'Payments' && (
      <div className="pp-payments-banner">
        <div className="pp-payments-banner-icon"><ShieldCheck size={20} /></div>
        <div className="pp-payments-banner-body">
          <div className="pp-payments-banner-header">
            <h4>{translateText('Active Checkout Gateways')}</h4>
            <span className="pp-payments-banner-badge"><span className="pp-pulse-dot" />{translateText('Live & Verified')}</span>
          </div>
          <p>{translateText('These payment gateways are integrated and ready to securely accept customer payments across your stores, booking links, and funnels.')}</p>
          <div className="pp-payments-gateways-list">
            <span className="pp-gateways-label">{translateText('Enabled Providers')}:</span>
            {Object.entries(providers).filter(([key]) => preferences[key as keyof typeof providers]).map(([key, name]) => (
              <span key={key} className="pp-gateway-pill"><CheckCircle2 size={13} className="pp-gateway-pill-icon" /><b>{name}</b></span>
            ))}
          </div>
        </div>
      </div>
    )}
    {open && <Dialog title={label} onClose={() => { if (!saving.current) setOpen(false); }}><form className="ce-settings-form" onSubmit={event => { event.preventDefault(); void save(); }}><fieldset disabled={busy} className="pp-settings-fields">
      {tab === 'Payments' ? <><p className="cw-help">{translateText('Enable a payment method for checkout. Live payments require a connected payment provider.')}</p><Field label="Payment method"><CommerceSelect value={draft.provider} options={Object.entries(providers).map(([value, label]) => ({ value, label }))} onChange={provider => setDraft(current => ({ ...current, provider }))}/></Field></> : <>
        <Field label="Customer name"><input required value={draft.name} placeholder={translateText('Customer name')} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}/></Field>
        <Field label="Email"><input required type="email" value={draft.email} placeholder="name@example.com" onChange={event => setDraft(current => ({ ...current, email: event.target.value }))}/></Field>
        {tab === 'Customers' ? <Field label="Phone"><input type="tel" value={draft.phone} placeholder={translateText('Phone number (optional)')} onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))}/></Field> : <><Field label="Product"><CommerceSelect label="Order product" value={draft.productId} placeholder="Select a product" options={products.map(product => ({ value: product.id, label: product.name }))} onChange={productId => setDraft(current => ({ ...current, productId }))}/></Field><p className="cw-help">{translateText('Orders are created as drafts. Payment status is updated by the payment provider.')}</p></>}
      </>}
      {error && <p className="cw-errors" role="alert">{error}</p>}<div className="course-modal-actions"><button type="button" className="cw-button" onClick={() => setOpen(false)}>{translateText('Cancel')}</button><button type="submit" className="cw-button primary" disabled={busy || tab === 'Orders' && !draft.productId}>{busy && <Loader2 size={14} className="animate-spin"/>}{translateText(busy ? 'Saving…' : 'Save Changes')}</button></div>
    </fieldset></form></Dialog>}
  </section>;
}
