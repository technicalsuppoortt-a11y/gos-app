import { useAssetWorkspace } from '../asset-store';
import { ProductSalesPage } from './ProductSalesPage';
import { ExternalPagePreview } from './PagePreviewFrame';
import { ProductFunnelLayout, ThankYouPage } from './ProductPageLayouts';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { productKind, hydrateProduct } from './model';
import type { Product } from './model';
import { productPreviewToken, readPreview, subscribePreview } from './previewSnapshot';
import { CheckoutScreen } from './CheckoutScreen';
import { useProducts, storageKey } from './repository';
import { ProductReviews } from './ProductReviews';
import { useLiveReviews } from './reviewRepository';
import { withReviews } from './model';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../backend/firebase';
import { decodeFirestoreValue } from '../../backend/firestoreCodec';
import { normalizeFirestoreData } from '../../backend/workspace';
import './product-workspace.css';
import './product-preview.css';
import './commerce-enhancements.css';
import './live-preview-design.css';


export function ProductLivePreview() {
  useUILanguage();
  const [workspace] = useAssetWorkspace();
  const { token = '' } = useParams(); const [params, setParams] = useSearchParams();
  const [snapshot, setProduct] = useState(() => readPreview(token));
  const products = useProducts(), tenantId = storageKey().replace('gos-commerce-products-v1:', '');
  const rawId = token.replace(/^product[-_]/, '');
  const saved = products.find(row =>
    row.id === snapshot?.id ||
    row.id === token ||
    row.id === rawId ||
    productPreviewToken(row) === token ||
    (row.slug && (row.slug === token || row.slug === rawId))
  );
  const [remoteProduct, setRemoteProduct] = useState<Product | null>(null);
  useEffect(() => {
    if (snapshot || saved || !tenantId || (!rawId && !token)) return;
    let active = true;
    const lookupId = rawId || token;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'tenants', tenantId, 'products', lookupId));
        if (!active) return;
        if (snap.exists()) {
          const decoded = decodeFirestoreValue(normalizeFirestoreData({ ...snap.data(), id: snap.id }));
          setRemoteProduct(hydrateProduct(decoded));
          return;
        }
        if (token && token !== lookupId) {
          const altSnap = await getDoc(doc(db, 'tenants', tenantId, 'products', token));
          if (active && altSnap.exists()) {
            const decoded = decodeFirestoreValue(normalizeFirestoreData({ ...altSnap.data(), id: altSnap.id }));
            setRemoteProduct(hydrateProduct(decoded));
          }
        }
      } catch {
        /* Fallback gracefully if network/rules are unavailable */
      }
    };
    void load();
    return () => { active = false; };
  }, [snapshot, saved, tenantId, rawId, token]);

  const liveReviews = useLiveReviews(tenantId, snapshot?.id || saved?.id || remoteProduct?.id || rawId || token);
  const source = snapshot || saved || remoteProduct;
  const product = source ? withReviews(source, liveReviews || saved || remoteProduct || source) : null;
  useEffect(() => {
    const refresh = () => setProduct(readPreview(token));
    refresh(); return subscribePreview(token, refresh);
  }, [token]);
  if (!product?.config) return <div className="cp-preview cp-preview-empty"><h1>{translateText("Preview unavailable")}</h1><p>{translateText("Open Preview Product from the editor to create a fresh preview.")}</p></div>;
  const c = product.config, kind = productKind(product.type), checkout = params.get('view') === 'checkout';
  const inFunnel = params.get('view') !== 'thank-you' && workspace.assets.some(asset => asset.id === c.funnelId && !asset.archived);
  const buy = () => { setParams({ view: 'checkout' }); window.scrollTo?.({ top: 0, behavior: 'auto' }); };
  const back = () => { setParams({}); window.scrollTo?.({ top: 0, behavior: 'auto' }); };
  const displayProduct = saved || remoteProduct || snapshot;
  return <MotionConfig reducedMotion="user"><div className={`cp-preview cp-${kind} lp-page cx-sales-${c.salesTemplate || 'hero'}`}>
    <div className="cp-preview-banner"><Sparkles size={13}/><span>{translateText("Live preview · Synced with your editor · No payments collected")}</span></div>
    {!inFunnel && <motion.nav className="lp-nav" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><button onClick={back} className="lp-wordmark" aria-label={translateText("Back to product")}><span>{product.name.slice(0, 1)}</span>{product.name}</button><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} className="lp-nav-action" onClick={buy}>{localizeNode(kind === 'course' ? 'Enroll now' : kind === 'service' ? 'Book a session' : 'Get access')}<ArrowRight size={14}/></motion.button></motion.nav>}
    <AnimatePresence mode="wait" initial={false}><motion.div key={params.get('view') || kind} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .22 }}>
      {params.get('view') === 'thank-you' ? <ThankYouPage product={product}/> : <ProductFunnelLayout product={product}>{checkout ? <><button className="cp-back" onClick={back}><ArrowLeft size={14}/>{translateText(" Back to product")}</button><CheckoutScreen product={product}/><button className="cw-button cx-thankyou-trigger" onClick={() => setParams({view:'thank-you'})}>{translateText('Preview thank-you page')}</button></> : c.salesTemplate === 'external' ? <ExternalPagePreview url={c.salesUrl} title={translateText('Custom sales page')}/> : <ProductSalesPage product={product} buy={buy} progressScope={'live-' + token}/>}</ProductFunnelLayout>}
    </motion.div></AnimatePresence>
    {!checkout && <ProductReviews key={product.id} product={product} tenantId={tenantId} onSubmitted={summary => setProduct(current => current ? { ...current, ...summary } : current)}/>}
    {displayProduct?.status === 'Active' && displayProduct.config?.experience?.visibility !== 'Private' && <div className="lp-container" style={{ paddingBlock: 16 }}><a className="cw-button" href={`/product-preview/${encodeURIComponent(displayProduct.id)}?workspace=${encodeURIComponent(tenantId)}`} target="_blank" rel="noopener noreferrer">{translateText('Open public page')}</a></div>}
    {!inFunnel && <footer className="lp-footer"><span>{product.name}</span><span>{localizeNode(product.type)}{translateText(" · Customer experience preview")}</span></footer>}
  </div></MotionConfig>;
}
