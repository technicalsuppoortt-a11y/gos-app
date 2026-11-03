import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import type { RootState } from '../store';
import { useWorkspacePreferences } from '../backend/workspacePreferences';
import { setCurrency, setLanguage, setTheme } from '../store/slices/uiSlice';
import './workspace-customization.css';
export function WorkspaceCustomization() {
  const { values } = useWorkspacePreferences();
  const dispatch = useDispatch();
  const appStore = useStore<RootState>();
  useEffect(() => {
    if (!values) return;
    const previous = appStore.getState().ui;
    dispatch(setLanguage(values.language)); dispatch(setCurrency(values.currency));
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => dispatch(setTheme(values.mode === 'system' ? media.matches ? 'dark' : 'light' : values.mode));
    apply(); media.addEventListener('change', apply);
    document.documentElement.dataset.workspaceTheme = values.theme;
    return () => {
      media.removeEventListener('change', apply); delete document.documentElement.dataset.workspaceTheme;
      // A different tenant or logout must not inherit this workspace's defaults.
      dispatch(setTheme(previous.theme)); dispatch(setLanguage(previous.language)); dispatch(setCurrency(previous.currency));
    };
  }, [values, dispatch, appStore]);
  return null;
}
