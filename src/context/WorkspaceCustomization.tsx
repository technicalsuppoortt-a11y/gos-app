import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import {
  inheritWorkspacePreferences,
  preferenceDefaults,
   sanitizeWorkspacePreferences,
  savePersonalPreferences,
  saveWorkspacePreferences,
  useWorkspacePreferenceState,
  WorkspacePreferencesContext,
  type PersonalPreferences,
  type WorkspacePreferences,
} from '../backend/workspacePreferences';
import { backendError } from '../backend/firebase';
import { usePhoenixBrand } from '../backend/phoenixBrand';
import { setCurrency, setLanguage, setTheme } from '../store/slices/uiSlice';
import { showToast } from '../utils/toast';
import './workspace-customization.css';

export function WorkspaceCustomization({ children, publicPage }: { children: ReactNode; publicPage?: boolean }) {
  const state = useWorkspacePreferenceState();
  const { uid, tenantId, canPublish, publicSync } = state;
  const scope = publicPage ? 'public' : state.scope;
  const values = publicPage ? state.publicValues : state.values;
  const personal = publicPage ? {} : state.personal;
  const [lastTopbarChange, setLastTopbarChange] = useState<{ scope: string; patch: PersonalPreferences }>();
  const phoenix = usePhoenixBrand();
  const dispatch = useDispatch();
  const [draft, setDraft] = useState<{ scope: string; patch: Partial<WorkspacePreferences> } | null>(null);
  const preview = useCallback((patch: Partial<WorkspacePreferences> | null) => {
    setDraft(current => patch ? { scope, patch } : current?.scope === scope ? null : current);
  }, [scope]);
  const previewValues = draft?.scope === scope ? draft.patch : null;
  const usePhoenixDefaults = !publicPage && uid && !values && phoenix;
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
    const root = document.documentElement;
    if (theme === 'violet') delete root.dataset.workspaceTheme;
    else root.dataset.workspaceTheme = theme;
  }, [theme, publicSync]);
  useLayoutEffect(() => {
    dispatch(setLanguage(language));
  }, [scope, language, publicSync, dispatch]);
  useLayoutEffect(() => {
    dispatch(setCurrency(currency));
  }, [scope, currency, publicSync, dispatch]);
  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => dispatch(setTheme(mode === 'system' ? (media.matches ? 'dark' : 'light') : mode));
    apply();
    if (mode !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [scope, mode, publicSync, dispatch]);

  const adminSyncedRef = useRef('');
  useEffect(() => {
    if (publicPage || !canPublish || !tenantId || state.loading || previewValues) return;
    const desired = sanitizeWorkspacePreferences(effective);
    const currentPublic = state.publicValues ? sanitizeWorkspacePreferences(state.publicValues) : null;
    const desiredKey = JSON.stringify({
      name: desired.name,
      logoUrl: desired.logoUrl,
      theme: desired.theme,
      language: desired.language,
      currency: desired.currency,
      mode: desired.mode,
      timezone: desired.timezone,
    });
    const publicKey = currentPublic
      ? JSON.stringify({
          name: currentPublic.name,
          logoUrl: currentPublic.logoUrl,
          theme: currentPublic.theme,
          language: currentPublic.language,
          currency: currentPublic.currency,
          mode: currentPublic.mode,
          timezone: currentPublic.timezone,
        })
      : '';
    if (desiredKey !== publicKey && adminSyncedRef.current !== desiredKey) {
      adminSyncedRef.current = desiredKey;
      void saveWorkspacePreferences(tenantId, desired, true, inheritWorkspacePreferences).catch(() => {});
    }
  }, [publicPage, canPublish, tenantId, state.loading, state.publicValues, effective, previewValues]);

  const setPreference = uid && !publicPage ? (patch: PersonalPreferences) => {
    setLastTopbarChange({ scope, patch });
    if (canPublish && tenantId) {
      const nextWorkspace = sanitizeWorkspacePreferences({
        ...effective,
        ...(patch.language ? { language: patch.language } : {}),
        ...(patch.currency ? { currency: patch.currency } : {}),
        ...(patch.mode ? { mode: patch.mode } : {}),
        ...(patch.timezone ? { timezone: patch.timezone } : {}),
      });
      adminSyncedRef.current = JSON.stringify({
        name: nextWorkspace.name,
        logoUrl: nextWorkspace.logoUrl,
        theme: nextWorkspace.theme,
        language: nextWorkspace.language,
        currency: nextWorkspace.currency,
        mode: nextWorkspace.mode,
        timezone: nextWorkspace.timezone,
      });
      void saveWorkspacePreferences(tenantId, nextWorkspace, true, inheritWorkspacePreferences).catch(error =>
        showToast.error(backendError(error))
      );
      return;
    }
    void savePersonalPreferences(uid, patch).catch(error => showToast.error(backendError(error)));
  } : undefined;
  return (
    <WorkspacePreferencesContext.Provider value={{
      ...state, values: usePhoenixDefaults ? workspace : values, effective, preview, setPreference,
      topbarChange: lastTopbarChange?.scope === scope ? lastTopbarChange.patch : undefined,
      themePreview: previewValues?.theme ? previewValues : null,
      hasWorkspaceTheme: !!(previewValues?.theme || (!usePhoenixDefaults && values)),
    }}>
      {children}
    </WorkspacePreferencesContext.Provider>
  );
}
