import { useCallback, useLayoutEffect, useState, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import {
  preferenceDefaults, savePersonalPreferences, useWorkspacePreferenceState, WorkspacePreferencesContext,
  type PersonalPreferences, type WorkspacePreferences,
} from '../backend/workspacePreferences';
import { backendError } from '../backend/firebase';
import { usePhoenixBrand } from '../backend/phoenixBrand';
import { setCurrency, setLanguage, setTheme } from '../store/slices/uiSlice';
import { showToast } from '../utils/toast';
import './workspace-customization.css';

export function WorkspaceCustomization({ children }: { children: ReactNode }) {
  const state = useWorkspacePreferenceState();
  const { scope, uid, values, personal } = state;
  const phoenix = usePhoenixBrand();
  const dispatch = useDispatch();
  const [draft, setDraft] = useState<{ scope: string; patch: Partial<WorkspacePreferences> } | null>(null);
  const preview = useCallback((patch: Partial<WorkspacePreferences> | null) => {
    setDraft(current => patch ? { scope, patch } : current?.scope === scope ? null : current);
  }, [scope]);
  const previewValues = draft?.scope === scope ? draft.patch : null;
  const usePhoenixDefaults = uid && !state.hasAccountWorkspace && phoenix;
  const workspace = usePhoenixDefaults ? {
    ...preferenceDefaults,
    name: phoenix.brand.name,
    logoUrl: phoenix.logo || preferenceDefaults.logoUrl,
    language: phoenix.brand.language,
    mode: phoenix.brand.mode,
  } : values ?? preferenceDefaults;
  const effective = {
    ...workspace,
    language: personal.language ?? workspace.language,
    currency: personal.currency ?? workspace.currency,
    mode: personal.mode ?? workspace.mode,
    timezone: personal.timezone ?? workspace.timezone,
    dateFormat: personal.dateFormat ?? workspace.dateFormat,
    ...previewValues,
  };

  const { language, currency, mode, theme } = effective;
  useLayoutEffect(() => {
    document.documentElement.dataset.workspaceTheme = theme;
  }, [theme]);
  useLayoutEffect(() => {
    dispatch(setLanguage(language));
  }, [scope, language, dispatch]);
  useLayoutEffect(() => {
    dispatch(setCurrency(currency));
  }, [scope, currency, dispatch]);
  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => dispatch(setTheme(mode === 'system' ? (media.matches ? 'dark' : 'light') : mode));
    apply();
    if (mode !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [scope, mode, dispatch]);

  const setPreference = uid ? (patch: PersonalPreferences) => {
    void savePersonalPreferences(uid, patch).catch(error => showToast.error(backendError(error)));
  } : undefined;
  return (
    <WorkspacePreferencesContext.Provider value={{
      ...state, values: usePhoenixDefaults ? workspace : values, effective, preview, setPreference,
      hasWorkspaceTheme: !!(previewValues?.theme || (!usePhoenixDefaults && values)),
    }}>
      {children}
    </WorkspacePreferencesContext.Provider>
  );
}
