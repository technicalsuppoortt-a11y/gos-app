import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { store } from "@/modules/brand-engine/store";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import type { BrandPageId } from "@/modules/brand-engine/data/brandPages";

// Persists meaningful choices in Redux, so unmounting a wizard page loses nothing.
export function usePageParameter<T>(pageId: BrandPageId, key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const stored = useAppSelector((s) => s.brand.pageParameters[pageId]?.[key]);
  const [fallback] = useState<T>(initial);
  useEffect(() => {
    if (stored === undefined) store.dispatch(actions.setPageParameter({ pageId, key, value: fallback }));
  }, [stored, pageId, key, fallback]);
  const value = stored === undefined ? fallback : stored as T;
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    const current = store.getState().brand.pageParameters[pageId]?.[key];
    const previous = current === undefined ? fallback : current as T;
    const resolved = typeof next === "function" ? (next as (value: T) => T)(previous) : next;
    store.dispatch(actions.setPageParameter({ pageId, key, value: resolved }));
  }, [pageId, key, fallback]);
  return [value, setValue];
}
