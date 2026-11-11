import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import {
  DEFAULT_BRAND_NAME,
  inheritWorkspacePreferences,
  isDefaultBrandLogo,
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
import { isLaunchBrandPreview } from '../branding/launchBrandPreview';
import { useCurrencyPreference } from '../backend/currencyPreference';
import { isCurrencyCode } from '../utils/currency';
import { CurrencyProvider } from './CurrencyContext';

const { currency: _currency, ...inheritAppearance } = inheritWorkspacePreferences;

export function WorkspaceCustomization({ children, publicPage }: { children: ReactNode; publicPage?: boolean }) {
  const state = useWorkspacePreferenceState();
  const { uid, tenantId, canPublish, publicSync } = state;
  const scope = publicPage ? 'public' : state.scope;
  const values = publicPage ? state.publicValues : state.values;
  const personal = publicPage ? {} : state.personal;
  const currencyPreference = useCurrencyPreference(publicPage ? '' : uid);
  const [lastTopbarChange, setLastTopbarChange] = useState<{ scope: string; patch: PersonalPreferences }>();
  const phoenix = usePhoenixBrand();
  const dispatch = useDispatch();
  const [draft, setDraft] = useState<{ scope: string; patch: Partial<WorkspacePreferences> } | null>(null);
  const preview = useCallback((patch: Partial<WorkspacePreferences> | null) => {
    setDraft(current => patch ? { scope, patch } : current?.scope === scope ? null : current);
  }, [scope]);
  const previewValues = draft?.scope === scope ? draft.patch : null;
  // Launch Brand's live preview always shows the brand being designed.
  const launchBrandPreview = isLaunchBrandPreview() && !!phoenix;
  const usePhoenixDefaults = launchBrandPreview || (!publicPage && uid && !values && phoenix);
  // Platform publishers copy their effective settings to the public site, so only
  // workspace owners get the deployed brand merged in.
  const phoenixFill = !publicPage && !launchBrandPreview && !canPublish && uid && phoenix ? phoenix : null;
  const workspace = usePhoenixDefaults && phoenix ? {
    ...preferenceDefaults,
    name: phoenix.brand.name,
    logoUrl: phoenix.logo || preferenceDefaults.logoUrl,
    language: phoenix.brand.language,
    mode: phoenix.brand.mode,
  } : phoenixFill && values ? {
    // A deployed Launch Brand fills in whatever the workspace settings still
    // leave at Upclick's defaults, so an untouched settings document can never
    // hide the brand name or logo the owner deployed.
    ...values,
    name: values.name === DEFAULT_BRAND_NAME && phoenixFill.brand.name.trim() ? phoenixFill.brand.name.trim() : values.name,
    logoUrl: isDefaultBrandLogo(values.logoUrl) && phoenixFill.logo ? phoenixFill.logo : values.logoUrl,
  } : values ?? preferenceDefaults;
  const legacyCurrency = isCurrencyCode(personal.currency) ? personal.currency : undefined;
  const displayCurrency = currencyPreference.value === undefined ? legacyCurrency : currencyPreference.value;
  const effective = {
    ...workspace,
    language: launchBrandPreview ? workspace.language : personal.language ?? workspace.language,
    currency: displayCurrency ?? workspace.currency,
    mode: launchBrandPreview ? workspace.mode : personal.mode ?? workspace.mode,
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

  // Browser tab titles follow the workspace brand (the deployed Launch Brand name included).
  const titleName = launchBrandPreview ? phoenix?.brand.name.trim() : workspace.name !== DEFAULT_BRAND_NAME ? workspace.name : phoenix?.brand.name.trim();
  useEffect(() => {
    if (publicPage || !uid || !titleName) return;
    const previous = document.title;
    document.title = titleName;
    return () => { document.title = previous; };
  }, [publicPage, uid, titleName]);

  const tabLogo = isDefaultBrandLogo(workspace.logoUrl) ? phoenix?.logo : workspace.logoUrl;
  useEffect(() => {
    if (publicPage || !uid || !tabLogo) return;
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) return;
    const previous = { href: icon.getAttribute('href'), type: icon.getAttribute('type'), sizes: icon.getAttribute('sizes') };
    icon.href = tabLogo;
    // Let the browser detect the saved logo format, including PNG and SVG.
    icon.removeAttribute('type');
    icon.removeAttribute('sizes');
    return () => {
      for (const [name, value] of Object.entries(previous)) {
        if (value === null) icon.removeAttribute(name);
        else icon.setAttribute(name, value);
      }
    };
  }, [publicPage, uid, tabLogo]);

  const adminSyncedRef = useRef('');
  useEffect(() => {
    if (publicPage || !canPublish || !tenantId || state.loading || previewValues) return;
    const desired = sanitizeWorkspacePreferences({ ...effective, currency: workspace.currency });
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
      void saveWorkspacePreferences(tenantId, desired, true, inheritAppearance).catch(() => {});
    }
  }, [publicPage, canPublish, tenantId, state.loading, state.publicValues, effective, previewValues]);

  const setPreference = uid && !publicPage ? (patch: PersonalPreferences) => {
    setLastTopbarChange({ scope, patch });
    const { currency, ...appearance } = patch;
    if (currency === null || isCurrencyCode(currency)) currencyPreference.setCurrencyPreference(currency);
    if (!Object.keys(appearance).length) return;
    if (canPublish && tenantId) {
      const nextWorkspace = sanitizeWorkspacePreferences({
        ...effective,
        currency: workspace.currency,
        ...(patch.language ? { language: patch.language } : {}),
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
      void saveWorkspacePreferences(tenantId, nextWorkspace, true, inheritAppearance).catch(error =>
        showToast.error(backendError(error))
      );
      return;
    }
    void savePersonalPreferences(uid, appearance).catch(error => showToast.error(backendError(error)));
  } : undefined;
  return (
    <WorkspacePreferencesContext.Provider value={{
      ...state, values: usePhoenixDefaults ? workspace : values, effective, preview, setPreference,
      topbarChange: lastTopbarChange?.scope === scope ? lastTopbarChange.patch : undefined,
      themePreview: previewValues?.theme ? previewValues : null,
      // The default palette with a deployed brand means "use the brand's colors".
      hasWorkspaceTheme: !!(previewValues?.theme || (!usePhoenixDefaults && values && !(phoenixFill?.brand.theme && values.theme === 'violet'))),
    }}>
      <CurrencyProvider currency={isCurrencyCode(currency) ? currency : 'USD'} language={language} enabled={!!uid && !publicPage}>
        {children}
      </CurrencyProvider>
    </WorkspacePreferencesContext.Provider>
  );
}
