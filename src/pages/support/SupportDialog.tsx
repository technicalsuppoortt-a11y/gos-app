import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useUILanguage } from '../../i18n/display';
export function SupportDialog({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId();
  const ar = useUILanguage().startsWith('ar');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className={`support-dialog ${className}`} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }} dir={ar ? 'rtl' : 'ltr'}><div className="support-dialog-head"><h2 id={titleId}>{title}</h2><button type="button" onClick={onClose} aria-label={ar ? 'إغلاق النافذة' : 'Close dialog'}><X size={20}/></button></div>{children}</dialog>;
}
