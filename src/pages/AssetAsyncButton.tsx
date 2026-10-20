import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { backendError } from '../backend/firebase';
import { showToast } from '../utils/toast';
import { translateText } from '../i18n/display';

export function AssetAsyncButton({ onClick, busyText = 'Saving...', children, disabled, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> & { onClick: () => unknown; busyText?: string; children: ReactNode | ((busy: boolean) => ReactNode) }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  return <button {...props} disabled={disabled || busy} aria-busy={busy} onClick={async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await onClick(); } catch (error) { showToast.error(backendError(error)); }
    finally { lock.current = false; setBusy(false); }
  }}>{typeof children === 'function' ? children(busy) : busy ? <><LoaderCircle size={14} className="animate-spin" aria-hidden="true"/>{translateText(busyText)}</> : children}</button>;
}
