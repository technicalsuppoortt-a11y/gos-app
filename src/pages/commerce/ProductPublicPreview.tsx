import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { hydrateProduct, type Product } from './model';
import { fetchPublicProduct, useLiveReviews } from './reviewRepository';
import { withReviews } from './model';
import { ProductReviews } from './ProductReviews';
import { ProductSalesPage } from './ProductSalesPage';
import { ExternalPagePreview } from './PagePreviewFrame';
import { CheckoutScreen } from './CheckoutScreen';
import { translateText, useUILanguage } from '../../i18n/display';
import { backendError } from '../../backend/firebase';

export function ProductPublicPreview() {
  useUILanguage();
  const { token = '' } = useParams(), [params, setParams] = useSearchParams();
  const tenantId = params.get('workspace') || '';
  const [state, setState] = useState<{ key: string; product?: Product; error?: string } | null>(null);
  const key = `${tenantId}/${token}`, live = useLiveReviews(tenantId, token);
  useEffect(() => {
    let active = true;
    fetchPublicProduct(tenantId, token).then(product => { if (active) setState({ key, product: hydrateProduct(product) }); }, cause => { if (active) setState({ key, error: backendError(cause) }); });
    return () => { active = false; };
  }, [tenantId, token, key]);
  if (state?.key !== key) return <div className="cp-preview cp-preview-empty" role="status">{translateText('Loading product…')}</div>;
  if (!state.product) return <div className="cp-preview cp-preview-empty" role="alert"><h1>{translateText('Product unavailable')}</h1><p>{state.error}</p></div>;
  const product = withReviews(state.product, live || state.product), checkout = params.get('view') === 'checkout';
  return <div className={`cp-preview lp-page cx-sales-${product.config!.salesTemplate}`}>
    <nav className="lp-nav"><b>{product.name}</b><button className="cw-button" onClick={() => setParams({ workspace: tenantId, ...(checkout ? {} : { view: 'checkout' }) })}>{translateText(checkout ? 'Back to product' : 'View checkout')}</button></nav>
    {checkout ? <CheckoutScreen product={product}/> : product.config!.salesTemplate === 'external' ? <ExternalPagePreview url={product.config!.salesUrl} title={translateText('Sales page')}/> : <ProductSalesPage product={product} buy={() => setParams({ workspace: tenantId, view: 'checkout' })}/>}
    {!checkout && <ProductReviews key={key} tenantId={tenantId} product={product} onSubmitted={summary => setState(current => current?.product ? { ...current, product: { ...current.product, ...summary } } : current)}/>}
  </div>;
}
