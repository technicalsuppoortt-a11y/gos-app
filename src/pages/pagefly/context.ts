import { createContext, useContext } from 'react';
import type { Device, PFMode, PFNode, PFPageContext, PFTheme } from './types';

export type RenderContextValue = {
  mode: PFMode;
  device: Device;
  theme: PFTheme;
  page: PFPageContext;
  nodes: PFNode[];
  selectedId: string | null;
  editingId: string | null;
  commitText: (id: string, key: string, value: string | string[]) => void;
  stopEditing: () => void;
  runAction: (node: PFNode, event?: React.MouseEvent) => void;
  openPopup: (id: string) => void;
  closePopup: (id: string) => void;
  openPopups: string[];
  notify: (message: string, kind?: 'success' | 'info') => void;
  onNextStep?: () => void;
};

export const RenderContext = createContext<RenderContextValue | null>(null);
export function useRender() {
  const value = useContext(RenderContext);
  if (!value) throw new Error('PageFly renderer context missing');
  return value;
}

export const isInteractive = (mode: PFMode) => mode === 'preview' || mode === 'live';
