import React from 'react';
import { retryImport } from './chunkRecovery';

export type PreloadableComponent<T extends React.ComponentType<any>> =
  React.ComponentType<React.ComponentProps<T>> & { preload: () => Promise<{ default: T }> };

/**
 * Wraps React.lazy so routes keep standard Vite code-splitting (and automatic
 * CSS chunk injection), while rendering synchronously on the first frame with
 * zero Suspense skeleton/spinner once `.preload()` has resolved.
 */
export function preloadableLazy<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
): PreloadableComponent<T> {
  let resolved: T | null = null;
  let pending: Promise<{ default: T }> | null = null;
  const preload = () => {
    if (!pending) {
      pending = retryImport(loader).then(
        mod => {
          resolved = mod.default;
          return mod;
        },
        error => {
          pending = null;
          throw error;
        },
      );
    }
    return pending;
  };
  const Lazy = React.lazy(preload);
  const Component = ((props: React.ComponentProps<T>) =>
    resolved ? React.createElement(resolved, props) : React.createElement(Lazy, props)) as PreloadableComponent<T>;
  Component.preload = preload;
  return Component;
}
