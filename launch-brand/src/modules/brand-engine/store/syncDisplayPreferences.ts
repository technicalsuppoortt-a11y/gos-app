import type { store } from './index';
import type { Language, Theme } from '../data/types';
import { actions } from './brandSlice';

export function resolveDisplayTheme(theme: Theme | 'system', systemDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches): Theme {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}

// Reuse the existing reducers; Phoenix owns the display preferences.
export function syncDisplayPreferences(
  target: Pick<typeof store, 'getState' | 'dispatch'>,
  preferences: { language: Language; theme: Theme | 'system' },
  systemDark?: boolean,
) {
  if (target.getState().brand.language !== preferences.language) {
    target.dispatch(actions.setLanguage(preferences.language));
  }
  if (target.getState().brand.theme !== resolveDisplayTheme(preferences.theme, systemDark)) {
    target.dispatch(actions.toggleTheme());
  }
}

type PreferenceSource = {
  getState: () => { language: Language; theme: Theme | 'system' };
  subscribe: (listener: () => void) => () => void;
};

// Realtime drafts and save reconciliation can hydrate after the initial load.
// Keep Phoenix authoritative for display choices throughout the mounted session.
export function bindDisplayPreferences(
  target: Pick<typeof store, 'getState' | 'dispatch' | 'subscribe'>,
  source: PreferenceSource,
  getSystemDark?: () => boolean,
) {
  let syncing = false;
  const sync = () => {
    if (syncing) return;
    syncing = true;
    try {
      syncDisplayPreferences(target, source.getState(), getSystemDark?.());
    } finally {
      syncing = false;
    }
  };
  const stopTarget = target.subscribe(sync);
  const stopSource = source.subscribe(sync);
  sync();
  return () => { stopTarget(); stopSource(); };
}
