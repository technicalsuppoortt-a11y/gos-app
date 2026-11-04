import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { readLocalWorkspacePreferences, useWorkspacePreferences, workspaceThemes } from '../backend/workspacePreferences';
import { setCurrency, setLanguage, setTheme } from '../store/slices/uiSlice';
import { storageGet, storageSet } from '../utils/browserStorage';
import './workspace-customization.css';

export function WorkspaceCustomization() {
  const { values } = useWorkspacePreferences();
  const dispatch = useDispatch();

  // Restore cached workspace theme immediately on client mount and listen for live changes
  useEffect(() => {
    const applyCachedTheme = () => {
      try {
        const localPrefs = readLocalWorkspacePreferences();
        const cached = storageGet('workspace_theme') || localPrefs?.theme || 'violet';
        const validTheme = cached in workspaceThemes ? cached : 'violet';
        document.documentElement.dataset.workspaceTheme = validTheme;
      } catch {
        document.documentElement.dataset.workspaceTheme = 'violet';
      }
    };

    applyCachedTheme();

    const handleThemeEvent = (evt: Event) => {
      const nextTheme = (evt as CustomEvent<{ theme?: string }>).detail?.theme;
      if (nextTheme && nextTheme in workspaceThemes) {
        document.documentElement.dataset.workspaceTheme = nextTheme;
      } else {
        applyCachedTheme();
      }
    };

    window.addEventListener('workspace-theme-changed', handleThemeEvent);
    window.addEventListener('workspace-preferences-updated', applyCachedTheme);
    return () => {
      window.removeEventListener('workspace-theme-changed', handleThemeEvent);
      window.removeEventListener('workspace-preferences-updated', applyCachedTheme);
    };
  }, []);

  useEffect(() => {
    const active = values ?? readLocalWorkspacePreferences();
    if (!active) {
      const fallback = storageGet('workspace_theme');
      document.documentElement.dataset.workspaceTheme =
        fallback && fallback in workspaceThemes ? fallback : 'violet';
      return;
    }
    try {
      storageSet('workspace_theme', active.theme);
    } catch {}
    document.documentElement.dataset.workspaceTheme = active.theme;
    dispatch(setLanguage(active.language));
    dispatch(setCurrency(active.currency));
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => dispatch(setTheme(active.mode === 'system' ? (media.matches ? 'dark' : 'light') : active.mode));
    apply();
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, [values, dispatch]);

  return null;
}
