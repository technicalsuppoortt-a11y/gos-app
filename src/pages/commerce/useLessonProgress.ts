import { useState } from 'react';
import type { SetStateAction } from 'react';
import { storageKey } from './repository';

export function useLessonProgress(scope: string) {
  const key = `${storageKey()}:lesson-preview:${scope}`;
  const [completed, update] = useState<string[]>(() => {
    try { const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []; }
    catch { return []; }
  });
  function setCompleted(action: SetStateAction<string[]>) {
    const next = typeof action === 'function' ? action(completed) : action;
    update(next);
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* Preview remains usable without storage. */ }
  }
  return [completed, setCompleted] as const;
}
