import { ProductQuickView } from './ProductQuickView';
import { ProductDeleteDialog } from './ProductDeleteDialog';
import { useUILanguage, translateText } from '../../i18n/display';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Eye, ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Product } from './model';
import { productPreviewToken, writePreview } from './previewSnapshot';

export function ProductCardActions({ product, onEdit, notify }: { product: Product; onEdit: () => void; notify: (message: string) => void }) {
  useUILanguage();
  const [quick, setQuick] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null), menuId = useId();
  const token = productPreviewToken(product);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', outside); window.addEventListener('resize', close); window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [open]);
  return <MotionConfig reducedMotion="user"><button ref={trigger} className="pp-card-more" title={translateText("Product actions")} aria-label={translateText(`Actions for ${product.name}`)} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={event => {
    event.stopPropagation(); const bounds = event.currentTarget.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(bounds.right - 210, window.innerWidth - 218)), top: Math.max(8, Math.min(bounds.bottom + 6, window.innerHeight - 200)) }); setOpen(value => !value);
  }}><MoreHorizontal size={17}/></button>{typeof document !== 'undefined' && createPortal(<AnimatePresence>{open && <motion.div ref={menu} id={menuId} className="pp-card-actions" role="menu" aria-label={translateText(`${product.name} actions`)} style={position} initial={{ opacity: 0, y: -5, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: .15 }} onClick={event => event.stopPropagation()} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    else if (event.key === 'Tab') { setOpen(false); trigger.current?.focus(); }
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      const index = items.indexOf(document.activeElement as HTMLElement);
      items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  }}><button role="menuitem" onClick={() => { setOpen(false); setQuick(true); }}><Eye size={15}/>{translateText("Quick View Details")}</button><button role="menuitem" onClick={() => { setOpen(false); onEdit(); }}><Pencil size={15}/>{translateText("Edit Product")}</button><a role="menuitem" href={`/product-preview/${encodeURIComponent(token)}`} target="_blank" rel="noopener noreferrer" onPointerDown={() => { try { writePreview(token, product); } catch {} }} onClick={event => {
    try { writePreview(token, product); setOpen(false); }
    catch { event.preventDefault(); notify('Preview could not be opened. Browser storage is unavailable or full.'); }
  }}><ExternalLink size={15}/>{translateText("View Live Preview")}</a><button role="menuitem" className="pp-delete-action" onClick={() => { setOpen(false); setDeleting(true); }}><Trash2 size={15}/>{translateText("Delete Product")}</button></motion.div>}</AnimatePresence>, document.body)}{quick && <ProductQuickView product={product} close={() => { setQuick(false); trigger.current?.focus(); }} edit={() => { setQuick(false); onEdit(); }}/>} {deleting && <ProductDeleteDialog product={product} onClose={() => { setDeleting(false); trigger.current?.focus(); }}/>}</MotionConfig>;
}
