import { useCallback, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle } from 'lucide-react';
import { BusyContext, BusyRegistryContext, useCRMBusy } from './useCRMActions';
import { translateText } from '../../i18n/display';

export function CRMActionBoundary({ busy, children }: { busy: boolean; children: ReactNode }) {
  const inherited = useCRMBusy();
  const parentRegister = useContext(BusyRegistryContext);
  const id = useId();
  const ref = useRef<HTMLFieldSetElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [pendingChildren, setPendingChildren] = useState<Set<string>>(() => new Set());
  const register = useCallback((childId: string, active: boolean) => {
    setPendingChildren(previous => {
      if (previous.has(childId) === active) return previous;
      const next = new Set(previous);
      if (active) next.add(childId); else next.delete(childId);
      return next;
    });
  }, []);
  const ownPending = busy || pendingChildren.size > 0;
  const pending = inherited || ownPending;
  // Nested fetches and dialogs lock the same workspace and share one overlay.
  useLayoutEffect(() => {
    parentRegister?.(id, ownPending);
    return () => parentRegister?.(id, false);
  }, [parentRegister, id, ownPending]);
  useLayoutEffect(() => {
    if (!parentRegister) setTarget(ref.current?.querySelector<HTMLElement>('.crm-workspace, .crm-dialog') ?? ref.current?.closest<HTMLElement>('.crm-workspace, .crm-dialog') ?? null);
  }, [parentRegister]);

  return <BusyRegistryContext.Provider value={register}><BusyContext.Provider value={pending}>
    <fieldset ref={ref} disabled={pending} aria-busy={pending} className="crm-action-boundary"
      onClickCapture={event => { if (pending) { event.preventDefault(); event.stopPropagation(); } }}
      onDragStartCapture={event => { if (pending) event.preventDefault(); }}>
      {children}
    </fieldset>
    {!parentRegister && pending && target && createPortal(
      <div className="crm-loading-overlay bg-white/50 backdrop-blur-sm" role="status" aria-live="polite" aria-label={translateText('Syncing CRM')}>
        <div className="crm-loading-center">
          <LoaderCircle size={32} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/>
          <strong>{translateText('Syncing CRM…')}</strong>
          <span>{translateText('Your workspace will be ready in a moment.')}</span>
        </div>
      </div>, target)}
  </BusyContext.Provider></BusyRegistryContext.Provider>;
}
