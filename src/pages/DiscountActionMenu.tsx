import React from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

type Props = { id: string; code: string; open: boolean; onOpenChange: (id: string | null) => void; children: React.ReactNode };

export function DiscountActionMenu({ id, code, open, onOpenChange, children }: Props) {
 const trigger = React.useRef<HTMLButtonElement>(null);
 const popup = React.useRef<HTMLDivElement>(null);
 const menuId = React.useId();
 const [position, setPosition] = React.useState({ top: 0, left: 0 });
 React.useLayoutEffect(() => {
  if (!open || !trigger.current || !popup.current) return;
  const anchor = trigger.current.getBoundingClientRect();
  const bounds = popup.current.getBoundingClientRect();
  const top = anchor.bottom + bounds.height + 8 <= window.innerHeight ? anchor.bottom + 6 : anchor.top - bounds.height - 6;
  setPosition({ top: Math.max(8, Math.min(top, window.innerHeight - bounds.height - 8)), left: Math.max(8, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 8)) });
  popup.current.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
 }, [open]);
 React.useEffect(() => {
  if (!open) return;
  const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) onOpenChange(null); };
  const resize = () => onOpenChange(null);
  const scroll = (event: Event) => { if (!popup.current?.contains(event.target as Node)) onOpenChange(null); };
  document.addEventListener('pointerdown', outside);
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', scroll, true);
  return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize); window.removeEventListener('scroll', scroll, true); };
 }, [open, onOpenChange]);
 const close = () => { onOpenChange(null); trigger.current?.focus({ preventScroll: true }); };
 const keyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
   event.preventDefault();
   const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
   buttons[next]?.focus();
  } else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  else if (event.key === 'Tab') { event.preventDefault(); close(); }
 };
 return <>
  <button ref={trigger} type="button" aria-label={`Actions for ${code}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => onOpenChange(open ? null : id)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); onOpenChange(id); } }}><MoreHorizontal size={14}/></button>
  {open && createPortal(<div ref={popup} id={menuId} className="dc-action-menu dc-action-menu-portal" role="menu" aria-label={`${code} actions`} style={{ position: 'fixed', ...position, zIndex: 9999 }} onKeyDown={keyboard} onClick={() => onOpenChange(null)}>{children}</div>, document.body)}
 </>;
}
