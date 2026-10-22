import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { localizeNode, translateText, useUILanguage } from '../../i18n/display';
import { showToast } from '../../utils/toast';
import { deleteProduct } from './repository';
import type { Product } from './model';
import './product-delete-dialog.css';

export function ProductDeleteDialog({ product, onClose, onDeleted }: { product: Product; onClose: () => void; onDeleted?: () => void }) {
  useUILanguage();
  const ref = useRef<HTMLDialogElement>(null), lock = useRef(false), titleId = useId(), descriptionId = useId();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { ref.current?.showModal(); }, []);
  const close = () => { if (!lock.current) onClose(); };
  async function confirm() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await deleteProduct(product.id); showToast.success('Product deleted.'); onDeleted?.(); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete product. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return createPortal(<dialog ref={ref} className="pd-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) close(); }}>
    <div className="pd-content"><span className="pd-warning"><AlertTriangle size={23}/></span><h2 id={titleId}>{translateText('Delete product?')}</h2><p id={descriptionId}>{translateText('Are you sure you want to delete this product?')} <strong>{localizeNode(product.name)}</strong> {translateText('will be removed from your catalog. This action cannot be undone.')}</p>
      {error && <p className="pd-error" role="alert">{localizeNode(error)}</p>}
      <footer><button autoFocus disabled={busy} className="pd-cancel" onClick={close}>{translateText('Cancel')}</button><button disabled={busy} className="pd-delete" onClick={() => void confirm()}>{busy && <LoaderCircle size={15} className="animate-spin"/>}{translateText(busy ? 'Deleting…' : 'Delete Product')}</button></footer>
    </div>
  </dialog>, document.body);
}
