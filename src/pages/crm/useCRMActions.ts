import { createContext, useContext, useRef, useState } from 'react';
import { showToast } from '../../utils/toast';

export const BusyContext = createContext(false);
export const BusyRegistryContext = createContext<((id: string, busy: boolean) => void) | null>(null);
export const useCRMBusy = () => useContext(BusyContext);

// The ref closes the gap before React commits disabled controls after a click.
export function useCRMActions() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  async function run<T>(operation: () => Promise<T>): Promise<T | undefined> {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    try { return await operation(); }
    catch (error) { showToast.error(error instanceof Error ? error.message : 'Unable to save. Please try again.'); return undefined; }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, run };
}

