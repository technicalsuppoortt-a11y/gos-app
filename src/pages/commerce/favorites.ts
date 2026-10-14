import { useSyncExternalStore, useCallback } from 'react';

const FAVORITES_STORAGE_KEY = 'gos_favorite_products';

const listeners = new Set<() => void>();

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === 'string');
      }
    }
  } catch {
    // Return empty on error
  }
  return [];
}

let favoritesCache: string[] = typeof window !== 'undefined' ? readFavorites() : [];

function notifyListeners() {
  listeners.forEach(fn => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === FAVORITES_STORAGE_KEY || event.key === null) {
      favoritesCache = readFavorites();
      notifyListeners();
    }
  });
  window.addEventListener('gos-favorites-updated', () => {
    favoritesCache = readFavorites();
    notifyListeners();
  });
}

export function getFavorites(): string[] {
  return favoritesCache;
}

export function setFavorites(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save favorites to localStorage:', err);
  }
  favoritesCache = ids;
  notifyListeners();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gos-favorites-updated'));
  }
}

export function toggleProductFavorite(id: string): boolean {
  const current = readFavorites();
  const exists = current.includes(id);
  const next = exists ? current.filter(item => item !== id) : [...current, id];
  setFavorites(next);
  return !exists;
}

export function useProductFavorites() {
  const favorites = useSyncExternalStore(
    fn => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => favoritesCache,
    () => [] as string[]
  );

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (id: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      event?.preventDefault();
      return toggleProductFavorite(id);
    },
    []
  );

  return { favorites, isFavorite, toggleFavorite };
}
