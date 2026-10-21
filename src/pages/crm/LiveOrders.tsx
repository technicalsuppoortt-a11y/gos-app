import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Mail, MessageCircle, Package, Plus } from 'lucide-react';
import { useEntities } from '../../backend/workspace';
import { attachGosProduct } from '../../backend/gosCRM';
import type { ApiRecord } from '../../backend/gosApi';
import type { CanonicalLead } from '../../store/slices/crmSlice';
import type { Product } from '../commerce/model';
import { showToast } from '../../utils/toast';
import { translateText } from '../../i18n/display';
import { CRMActionBoundary } from './CRMActions';
import { useCRMActions } from './useCRMActions';
import { Dialog } from './CRMDialogs';
import { CustomSelect } from './CRMPrimitives';
import { linkedToLead, productCheckoutURL } from './recordLinks';

const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : value || '';

export function LiveOrders({ lead }: { lead: CanonicalLead }) {
  const orders = useEntities<ApiRecord>('orders').filter(row => linkedToLead(row, lead, 'order'));
  const transactions = useEntities<ApiRecord>('transactions').filter(row => linkedToLead(row, lead, 'order'));
  const products = useEntities<Product>('products');
  const actions = useCRMActions();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const selectedProduct = products.find(product => product.id === productId);
  const attachments = lead.attachedProducts ?? [];
  const alreadyAttached = attachments.some(product => product.productId === productId);
  const ids = new Set(orders.flatMap(row => [row.id, row.transactionId, row.transaction_id].filter(Boolean)));
  const rows = [...orders, ...transactions.filter(row => !ids.has(row.id) && !orders.some(order => order.id === (row.orderId || row.order_id)))];

  function share(product: Product) {
    const url = productCheckoutURL(product);
    if (!url) return <p className="crm-muted">{translateText('Add a checkout or sales page URL in the product settings to share a link.')}</p>;
    const text = `Hi ${lead.name}, here is the link for ${product.name}: ${url}`;
    return <div className="crm-product-share">
      <button type="button" className="crm2-btn-secondary" aria-label={`Copy checkout link for ${product.name}`} onClick={() => actions.run(async () => { await navigator.clipboard.writeText(url); showToast.success('Checkout link copied.'); })}><Copy size={14}/>{translateText('Copy checkout link')}</button>
      {lead.email && <a className="crm2-btn-secondary" href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(text)}`}><Mail size={14}/>{translateText('Share by email')}</a>}
      {lead.phone && <a className="crm2-btn-secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`}><MessageCircle size={14}/>{translateText('Share on WhatsApp')}</a>}
    </div>;
  }

  return <CRMActionBoundary busy={actions.busy}>
    <div className="crm-section-heading">
      <p className="crm-muted">{translateText('Purchases and payments linked by contact, email or phone.')}</p>
      <button type="button" className="crm2-btn-primary" onClick={() => { setProductId(''); setOpen(true); }}><Plus size={14}/>{translateText('Attach Product')}</button>
    </div>
    {rows.length ? <div>{rows.map(row => <div className="crm-feed-item" key={row.id}>
      <Package size={20}/><div><b>{row.productName || row.product_name || row.invoiceNumber || 'Order / payment'}</b><p>{date(row.createdAt || row.created_at || row.at || row.date)}{row.invoiceNumber ? ' · Invoice ' + row.invoiceNumber : ''}</p></div>
      <span>{row.status} {row.currency} {row.total ?? row.amount ?? ''}</span>
    </div>)}</div> : <p className="crm-empty">{translateText('No orders recorded for this contact. Attach a product to track interest or share its checkout link.')}</p>}
    {attachments.length > 0 && <div><h3>{translateText('Attached products')}</h3>{attachments.map(attachment => {
      const product = products.find(item => item.id === attachment.productId);
      return <article className="crm-note" key={attachment.productId}><b>{product?.name || attachment.productName}</b><p className="crm-muted">{translateText('Attached')} {date(attachment.attachedAt)} · {translateText('Purchase not recorded')}</p>{product && share(product)}</article>;
    })}</div>}
    {open && <Dialog title="Attach product to contact" close={() => { if (!actions.busy) setOpen(false); }}>
      <form onSubmit={event => {
        event.preventDefault();
        if (!selectedProduct || alreadyAttached) return;
        void actions.run(async () => {
          const saved = await attachGosProduct(lead.id, selectedProduct);
          if (saved) { setOpen(false); showToast.success('Product attached to contact.'); }
        });
      }}>
        <div className="crm-dialog-content">
          <p>{translateText('Associate a product with')} {lead.name}. {translateText('A purchase appears here after an order or payment is recorded.')}</p>
          {products.length ? <label className="crm-field">{translateText('Product')}<CustomSelect aria-label="Product to attach" value={productId} onChange={setProductId} options={[{ value: '', label: 'Select product' }, ...products.map(product => ({ value: product.id, label: `${product.name}${product.status === 'Draft' ? ' · Draft' : ''}` }))]}/></label> : <p className="crm-muted">{translateText('No products available yet.')} <Link to="/dashboard/products">{translateText('Create a product')}</Link></p>}
          {selectedProduct && share(selectedProduct)}
          {alreadyAttached && <p className="crm-muted">{translateText('This product is already attached to the contact.')}</p>}
        </div>
        <div className="crm-dialog-footer"><button type="button" className="crm2-btn-secondary" onClick={() => setOpen(false)}>{translateText('Cancel')}</button><button className="crm2-btn-primary" disabled={!selectedProduct || alreadyAttached}>{translateText('Save product')}</button></div>
      </form>
    </Dialog>}
  </CRMActionBoundary>;
}
