import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { AssetAsyncButton } from './AssetAsyncButton';
import { localizeNode, translateText } from '../i18n/display';

/** Asset actions retain the workspace menu styling while awaiting persistence. */
export function AssetOptionsMenu({ label, actions }: { label: string; actions: { label: string; onSelect: () => unknown }[] }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null), lock = useRef(false);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!lock.current && !root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !lock.current) { setOpen(false); root.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="crm-options" ref={root}><button className="crm-options-trigger" aria-label={translateText(label)} aria-expanded={open} disabled={busy} onClick={() => setOpen(!open)}><MoreHorizontal size={16}/></button>{open && <div className="crm-options-popup" aria-label={translateText(label)}>{actions.map(action => <AssetAsyncButton key={action.label} disabled={busy} busyText={/publish/i.test(action.label) ? 'Publishing...' : /create|duplicate/i.test(action.label) ? 'Creating...' : 'Saving...'} onClick={async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await action.onSelect(); setOpen(false); } finally { lock.current = false; setBusy(false); }
  }}>{localizeNode(action.label)}</AssetAsyncButton>)}</div>}</div>;
}
