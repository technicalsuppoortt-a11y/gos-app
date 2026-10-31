import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { useEntities } from '../../backend/workspace';
import { QuickDetails } from '../../components/ui/QuickDetails';
import { defaultConfig, formatPrice, type Product } from './model';

type Order = { id: string; productId?: string; product_id?: string; items?: { productId?: string; product_id?: string }[]; customerName?: string; customerEmail?: string; customer?: { name?: string; email?: string }; email?: string; status?: string; createdAt?: string; at?: string };
export function ProductQuickView({ product, close, edit }: { product: Product; close: () => void; edit: () => void }) {
  const config = product.config ?? defaultConfig(product.type, product.price);
  const pipelines = useSelector((s: RootState) => s.crm.pipelines);
  const orders = useEntities<Order>('orders');
  const related = orders.filter(o => (o.productId || o.product_id) === product.id || o.items?.some(i => (i.productId || i.product_id) === product.id));
  const pipeline = pipelines.find(p => p.id === (config.crmRouting?.pipelineId || 'main'));
  const stage = pipeline?.stages.find(s => s.id === (config.crmRouting?.stageId || 'LEAD_CAPTURED'));
  return <QuickDetails title={product.name} close={close}>
    <div><span className="detail-badge">{product.status}</span></div>
    <section><h3>Product specs</h3><p>{product.description || 'No description added.'}</p><dl>{Object.entries({ Type: product.type, SKU: config.sku || '—', Access: config.access, Delivery: config.delivery, Files: config.assets.length, Modules: config.modules.length, ...(product.type === 'Service' ? { Duration: `${config.duration} minutes` } : {}) }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section><h3>Pricing</h3><dl><div><dt>Price</dt><dd>{formatPrice(config)}</dd></div><div><dt>Billing</dt><dd>{config.billing}</dd></div><div><dt>Sales</dt><dd>{product.sales}</dd></div><div><dt>Revenue</dt><dd>{product.revenue}</dd></div></dl></section>
    <section><h3>CRM pipeline mapping</h3><dl><div><dt>Pipeline</dt><dd>{pipeline?.name || 'Unavailable pipeline'}</dd></div><div><dt>Initial stage</dt><dd>{stage?.label || config.crmRouting?.stageId || 'Default stage'}</dd></div></dl></section>
    <section><h3>Buyer / customer history</h3>{related.length ? related.map(order => <article key={order.id}><b>{order.customerName || order.customer?.name || 'Customer'}</b><p>{order.customerEmail || order.customer?.email || order.email || 'No email recorded'}</p><span className="detail-badge">{order.status || 'Pending'}</span><p><small>{order.createdAt || order.at || 'Date unavailable'}</small></p></article>) : <p className="detail-muted">No orders recorded for this product.</p>}</section>
    <button className="detail-primary" onClick={edit}>Edit product</button>
  </QuickDetails>;
}
