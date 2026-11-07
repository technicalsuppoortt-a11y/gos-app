import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ClipboardList } from 'lucide-react';
import { useSelector } from 'react-redux';
import { backendError, callBackend, db } from '../../backend/firebase';
import { QuickDetails } from '../../components/ui/QuickDetails';
import { translateText as t, useUILanguage } from '../../i18n/display';
import type { RootState } from '../../store';
import './checkout-requests.css';

type Status = 'Pending' | 'Approved' | 'Rejected';
type RequestRow = {
  id: string;
  status: Status;
  createdAt: string;
  decidedAt?: string;
  productName: string;
  items: { productId: string; productName: string }[];
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
  receipt: { name: string; type: string } | null;
  fields: { label: string; value: string }[];
};
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
const date = (value: string) => new Date(value).toLocaleString();

export function CheckoutRequests() {
  const { tenant, user } = useSelector((state: RootState) => state.auth);
  return tenant?.id && <RequestsView key={tenant.id + '/' + user?.id} tenantId={tenant.id}/>;
}

function RequestsView({ tenantId }: { tenantId: string }) {
  useUILanguage();
  const [source, setSource] = useState<{ rows: RequestRow[]; error: string; loading: boolean }>({ rows: [], error: '', loading: true });
  const [retry, setRetry] = useState(0), [selected, setSelected] = useState('');
  const [search, setSearch] = useState(''), [status, setStatus] = useState<Status | 'All'>('All');
  useEffect(() => onSnapshot(query(collection(db, 'tenants', tenantId, 'checkoutRequests'), orderBy('createdAt', 'desc')),
    snapshot => setSource({ rows: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as RequestRow), error: '', loading: false }),
    cause => setSource({ rows: [], error: /(?:^|\/)permission-denied$/i.test(String((cause as { code?: string })?.code ?? '')) ? '' : backendError(cause), loading: false })),
  [tenantId, retry]);
  const text = search.trim().toLowerCase();
  const rows = source.rows.filter(row => (status === 'All' || row.status === status) && [row.id, row.customerName, row.customerEmail, row.customerPhone, row.productName].some(value => value.toLowerCase().includes(text)));
  const request = source.rows.find(row => row.id === selected);
  return <section className="pp-secondary-view checkout-requests">
    <div className="pp-secondary-heading"><div><h2>{t('Checkout Requests')}</h2><p>{t('Review customer submissions, transfer receipts and checkout details.')}</p></div></div>
    <div className="request-filters">
      <input type="search" aria-label={t('Search requests')} placeholder={t('Search by customer, product or reference…')} value={search} onChange={event => setSearch(event.target.value)}/>
      <select aria-label={t('Request status')} value={status} onChange={event => setStatus(event.target.value as Status | 'All')}>{(['All', 'Pending', 'Approved', 'Rejected'] as const).map(option => <option key={option} value={option}>{t(option)}</option>)}</select>
    </div>
    {source.loading ? <p role="status">{t('Loading checkout requests…')}</p>
      : source.error ? <p role="alert">{t(source.error)} <button type="button" className="cw-button" onClick={() => { setSource({ rows: [], error: '', loading: true }); setRetry(value => value + 1); }}>{t('Try again')}</button></p>
      : rows.length ? <div className="request-table"><table><thead><tr>{['Customer', 'Product', 'Total', 'Submitted', 'Status', 'Details'].map(label => <th key={label} scope="col">{t(label)}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>
          <td><b>{row.customerName}</b><small>{row.customerEmail}</small></td><td>{row.productName}</td><td>{money(row.totals.dueToday, row.currency)}</td><td>{date(row.createdAt)}</td>
          <td><span className={`request-status ${row.status.toLowerCase()}`}>{t(row.status)}</span></td>
          <td><button type="button" className="cw-button" onClick={() => setSelected(row.id)}>{t('View details')}</button></td>
        </tr>)}</tbody>
      </table></div>
      : <div className="pp-records-empty"><span className="pp-records-empty-icon"><ClipboardList size={26}/></span><h3>{t(source.rows.length ? 'No matching requests' : 'No checkout requests yet')}</h3><p>{t(source.rows.length ? 'Change your search or status filter.' : 'Submissions from published product checkouts appear here.')}</p></div>}
    {request && <RequestDetails key={request.id} request={request} close={() => setSelected('')}/>}
  </section>;
}

function RequestDetails({ request, close }: { request: RequestRow; close: () => void }) {
  const [note, setNote] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(''), [receiptError, setReceiptError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!request.receipt) return;
    let active = true;
    callBackend<{ url: string }>('productCheckout', { action: 'receipt', id: request.id })
      .then(value => { if (active) setUrl(value.url); })
      .catch(cause => { if (active) setReceiptError(backendError(cause)); });
    return () => { active = false; };
  }, [request.id, !!request.receipt, attempt]);

  async function review(decision: 'approve' | 'reject') {
    if (busy) return;
    setBusy(true);
    setError('');
    try { await callBackend('productCheckout', { action: 'review', id: request.id, decision, note }); }
    catch (cause) { setError(backendError(cause)); }
    finally { setBusy(false); }
  }

  return <QuickDetails title={t('Checkout request')} close={close}>
    <div className="request-details">
      <p><span className={`request-status ${request.status.toLowerCase()}`}>{t(request.status)}</span> · {request.id.slice(0, 12).toUpperCase()} · {date(request.createdAt)}</p>
      <h3>{t('Customer')}</h3>
      <dl><dt>{t('Name')}</dt><dd>{request.customerName}</dd><dt>{t('Email')}</dt><dd>{request.customerEmail}</dd><dt>{t('Phone')}</dt><dd>{request.customerPhone}</dd></dl>
      <h3>{t('Order details')}</h3>
      <ul>{request.items.map(item => <li key={item.productId}>{item.productName}</li>)}</ul>
      <dl>
        <dt>{t('Payment method')}</dt><dd>{request.method}</dd>
        {request.transferAccount && <><dt>{t('Transfer account')}</dt><dd>{request.transferAccount}</dd></>}
        {request.discountCode && <><dt>{t('Discount code')}</dt><dd>{request.discountCode}</dd></>}
        <dt>{t('Product price')}</dt><dd>{money(request.totals.price, request.currency)}</dd>
        <dt>{t('Discount')}</dt><dd>{money(request.totals.discount, request.currency)}</dd>
        <dt>{t('Subtotal')}</dt><dd>{money(request.totals.subtotal, request.currency)}</dd>
        <dt>{t('Tax')}</dt><dd>{money(request.totals.tax, request.currency)}</dd>
        <dt>{t('Total due')}</dt><dd><b>{money(request.totals.dueToday, request.currency)}</b></dd>
        {request.fields.map((field, index) => <div key={index}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
        {request.note && <><dt>{t('Customer note')}</dt><dd>{request.note}</dd></>}
      </dl>
      <h3>{t('Receipt')}</h3>
      {!request.receipt ? <p>{t('No receipt submitted')}</p> : receiptError ? <p role="alert">{t(receiptError)} <button type="button" className="cw-button" onClick={() => { setReceiptError(''); setUrl(''); setAttempt(value => value + 1); }}>{t('Try again')}</button></p>
        : !url ? <p role="status">{t('Loading receipt…')}</p> : <>
          {request.receipt.type.startsWith('image/') ? <img className="request-receipt" src={url} alt={t('Receipt preview')} onError={() => setReceiptError('The receipt preview could not be loaded.')}/>
            : <iframe className="request-receipt" title={t('Receipt preview')} src={url} referrerPolicy="no-referrer"/>}
          <a href={url} target="_blank" rel="noopener noreferrer">{request.receipt.name}</a>
        </>}
      {request.status !== 'Pending' ? <><h3>{t('Review details')}</h3><p>{request.reviewNote || t('No review note')}</p>{request.decidedAt && <small>{date(request.decidedAt)}</small>}</>
        : <section className="request-review">
          <h3>{t('Review request')}</h3>
          <p>{t(request.receipt ? 'Verify the transfer against your payment account before approving.' : 'Approve to confirm this order.')}</p>
          <label>{t('Review note')}<textarea maxLength={1000} rows={3} value={note} disabled={busy} onChange={event => setNote(event.target.value)} placeholder={t('A reason is required to reject the request')}/></label>
          {error && <p role="alert">{t(error)}</p>}
          <div><button type="button" className="cw-button" disabled={busy || !note.trim()} onClick={() => void review('reject')}>{t('Reject request')}</button>
            <button type="button" className="cw-button primary" disabled={busy} onClick={() => void review('approve')}>{t(request.receipt ? 'Approve verified transfer' : 'Approve request')}</button></div>
        </section>}
    </div>
  </QuickDetails>;
}
