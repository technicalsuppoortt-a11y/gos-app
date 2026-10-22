import { useState, useEffect } from 'react';
import { Expand, Monitor, Smartphone, Eye } from 'lucide-react';
import { useUILanguage, translateText } from '../../i18n/display';
import type { Product } from './model';
import { ProductSalesPage } from './ProductSalesPage';
import { ProductFunnelLayout, ThankYouPage } from './ProductPageLayouts';
import { CheckoutScreen } from './CheckoutScreen';
import { LivePageFrame, PreviewDialog, ExternalPagePreview } from './PagePreviewFrame';

export function WorkspacePagePreview({ product, kind, funnel = false }: { product: Product; kind: 'sales' | 'thankYou'; funnel?: boolean }) {
  useUILanguage();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop'), [expanded, setExpanded] = useState(false), [checkout, setCheckout] = useState(false);
  const title = translateText(funnel ? 'Connected funnel preview' : kind === 'sales' ? 'Sales page live preview' : 'Thank-you page live preview');
  const [offer, setOffer] = useState<Product | null>(null);
  const config = product.config!, external = !funnel && (kind === 'sales' ? config.salesTemplate === 'external' : config.thankYouTemplate === 'external');
  useEffect(() => { setCheckout(false); setOffer(null); }, [config.salesTemplate, config.thankYouTemplate, config.funnelId, config.funnelPageId]);
  const body = <div className={`cp-preview cp-${product.type === 'Service' ? 'service' : product.type === 'Course' ? 'course' : 'digital'} lp-page cx-sales-${config.salesTemplate || 'hero'}`} style={{ width: '100%', minWidth: 0 }}>
    {offer ? <><button type="button" className="cp-back" onClick={() => setOffer(null)}>{translateText('Back to confirmation')}</button><CheckoutScreen product={offer}/></> : kind === 'thankYou' ? <ThankYouPage product={product} onOffer={setOffer}/> : <ProductFunnelLayout product={funnel ? product : { ...product, config: { ...config, funnelId: '', funnelPageId: '' } }} viewportWidth={device === 'mobile' ? 390 : 1100}>{checkout ? <><button type="button" className="cp-back" onClick={() => setCheckout(false)}>{translateText('Back to product')}</button><CheckoutScreen key={product.id} product={product}/></> : <ProductSalesPage product={product} buy={() => setCheckout(true)}/>}</ProductFunnelLayout>}
  </div>;
  const render = (full = false) => external ? <ExternalPagePreview url={kind === 'sales' ? config.salesUrl : config.thankYouUrl} title={title}/> : <LivePageFrame title={title} device={device} expanded={full}>{body}</LivePageFrame>;
  return <section className="pv-card" aria-label={title}><header><span><Eye size={13}/>{title}<i>{translateText('Live')}</i></span><div><button type="button" aria-label={translateText('Desktop page preview')} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}><Monitor size={14}/></button><button type="button" aria-label={translateText('Mobile page preview')} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}><Smartphone size={14}/></button><button type="button" aria-label={translateText('Expand ' + title)} onClick={() => setExpanded(true)}><Expand size={14}/></button></div></header><div className="pv-product-context">{product.image && <img src={product.image} alt=""/>}<span><b>{product.name || translateText('Your product')}</b><small>{translateText(product.type)}</small></span><strong>{new Intl.NumberFormat('en', {style:'currency',currency:config.currency}).format(config.amount)}</strong></div>{render()}{expanded && <PreviewDialog title={title} onClose={() => setExpanded(false)}>{render(true)}</PreviewDialog>}</section>;
}
