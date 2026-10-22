import { ExternalPagePreview } from './PagePreviewFrame';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useAssetWorkspace } from '../asset-store';
import { PublishedPage } from '../PublishedPage';
import { useProducts } from './repository';
import { productPreviewToken, writePreview } from './previewSnapshot';
import type { Product } from './model';
import { translateText, useUILanguage } from '../../i18n/display';
import './dynamic-checkout.css';

export function ProductFunnelLayout({ product, children, viewportWidth }: { product: Product; children: ReactNode; viewportWidth?: number }) {
  const [workspace] = useAssetWorkspace();
  const [selected, setSelected] = useState('');
  const config = product.config!, funnel = workspace.assets.find(item => item.id === config.funnelId && !item.archived);
  useEffect(() => setSelected(''), [config.funnelId, config.funnelPageId]);
  const page = funnel?.document.pages.find(item => item.id === (selected || config.funnelPageId)) ?? funnel?.document.pages[0];
  if (!funnel || !page) return <>{children}</>;
  return <PublishedPage viewportWidth={viewportWidth} asset={funnel} pageId={page.id} onNavigate={setSelected} productSection={<section id="commerce-product" data-commerce-product={product.id} className="cx-funnel-product">{children}</section>}/>;
}

export function ThankYouPage({ product, onOffer }: { product: Product; onOffer?: (offer: Product) => void }) {
  useUILanguage();
  const products = useProducts(), config = product.config!, e = config.experience!;
  const template = config.thankYouTemplate ?? 'confirmation';
  if (template === 'external') return <ExternalPagePreview url={config.thankYouUrl} title={translateText('Custom thank-you page')}/>;
  const upsell = e.offersEnabled && products.find(item => item.id === e.upsellId && item.status === 'Active');
  return <section className={'cx-thankyou cx-thankyou-' + template}><span>{translateText('THANK-YOU PAGE PREVIEW')}</span><h1>{translateText(template === 'onboarding' ? 'Your next chapter starts here.' : template === 'community' ? 'Welcome to the community.' : 'Thank you for your order.')}</h1><h2>{product.name}</h2><p>{translateText('Your confirmation and access instructions will arrive by email after a verified payment.')}</p>
    {template === 'onboarding' ? <ol><li>{translateText('Check your inbox for your confirmation.')}</li><li>{translateText('Access your resources or book your session.')}</li><li>{translateText('Follow your personal next steps below.')}</li></ol> : template === 'community' ? <>{config.thankYouVideoUrl ? <video controls src={config.thankYouVideoUrl}/> : <p>{translateText('Your welcome video will appear here when configured.')}</p>}{config.communityUrl && <a href={config.communityUrl} target="_blank" rel="noreferrer">{translateText('Join the community')}</a>}</> : <dl><dt>{translateText('Product')}</dt><dd>{product.name}</dd><dt>{translateText('Delivery')}</dt><dd>{product.type === 'Service' ? config.fulfillment : e.accessRule}</dd></dl>}
    {e.included.filter(item => item.enabled).map(item => <p key={item.id}>✓ {item.title}</p>)}
    {upsell && <aside className="cx-upsell"><h2>{translateText('Continue your journey')}</h2><h3>{upsell.name}</h3><p>{upsell.config?.experience?.shortDescription || upsell.description}</p><strong>{new Intl.NumberFormat('en', { style: 'currency', currency: upsell.config!.currency }).format(e.upsellDiscountEnabled ? Math.min(e.upsellAmount ?? upsell.config!.amount, upsell.config!.amount) : upsell.config!.amount)}</strong><button className="cw-button primary" onClick={() => {
      const offer = structuredClone(upsell);
      if (e.upsellDiscountEnabled) { const config = offer.config!; config.amount = Math.min(e.upsellAmount ?? config.amount, config.amount); config.experience![config.billing === 'Payment plan' ? 'installmentAmount' : config.billing === 'Subscription' ? 'recurringAmount' : 'oneTimeAmount'] = config.amount; }
      if (onOffer) { onOffer(offer); return; }
      const token = productPreviewToken(offer); writePreview(token, offer); window.location.assign(`/product-preview/${encodeURIComponent(token)}?view=checkout`);
    }}>{translateText(e.upsellOneClick ? 'Preview one-click offer' : 'View upsell offer')}</button></aside>}
  </section>;
}
