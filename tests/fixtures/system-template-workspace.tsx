import { useState, type ReactNode } from 'react';
const values = new Map<string, string>();
export const cloudStorage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); (window as any).__workspaceWrites = [...((window as any).__workspaceWrites || []), { key, value }]; window.dispatchEvent(new CustomEvent('gos-booking-change', { detail: key })); },
  removeItem: (key: string) => values.delete(key),
};
(window as any).__templateWorkspace = values;
export const normalizeFirestoreData = <T,>(value: T) => value;
export const flushAssetWrites = async () => {};
export const readCloud = <T,>(key: string, fallback: T): T => { const saved = values.get(key); return saved ? JSON.parse(saved) : fallback; };
export const useCloudState = <T,>(_key: string, initial: T) => useState(initial);
export const useEntities = <T,>(_resource: string): T[] => [];
export const WorkspaceData = ({ children }: { children: ReactNode }) => children;
