import { useRef, useState } from 'react';
import './select-layer.css';

/** Body portals escape ordinary modal overflow. Native dialogs need their top layer. */
export function useSelectPortal() {
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined);
  const onOpenChange = (open: boolean) => {
    if (open) setContainer(trigger.current?.closest('dialog') ?? trigger.current?.ownerDocument.body);
  };
  return { trigger, container, onOpenChange };
}
