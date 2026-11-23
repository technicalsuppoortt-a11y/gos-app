import { storageGet, storageSet } from '../../utils/browserStorage';
import { localeDirection, resolveInitialLocale, type SupportedLocale } from '../../i18n/initialLocale';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';
export type Language = SupportedLocale;

interface UIState {
  theme: Theme;
  language: Language;
  currency: string;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

const initialState: UIState = {
  theme: storageGet('theme') === 'dark' ? 'dark' : 'light',
  language: resolveInitialLocale(),
  currency: storageGet('preferred_currency') || 'USD',
  sidebarOpen: false,
  sidebarCollapsed: storageGet('sidebar_collapsed') === 'true',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => { state.theme = action.payload; storageSet('theme', action.payload); },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      storageSet('theme', state.theme);
      if (typeof document !== 'undefined' && state.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      storageSet('i18nextLng', action.payload);
      if (typeof document !== 'undefined') {
        const dir = localeDirection(action.payload);
        document.documentElement.lang = action.payload;
        document.documentElement.dir = dir;
        if (document.body) document.body.dir = dir;
      }
    },
    setCurrency: (state, action: PayloadAction<string>) => {
      state.currency = action.payload;
      storageSet('preferred_currency', action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
       state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      storageSet('sidebar_collapsed', state.sidebarCollapsed ? 'true' : 'false');
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
      storageSet('sidebar_collapsed', action.payload ? 'true' : 'false');
    }
  },
});

export const { 
  setTheme,
  toggleTheme, 
  setLanguage, 
  setCurrency,
  toggleSidebar, 
  setSidebarOpen, 
  toggleSidebarCollapse, 
  setSidebarCollapsed 
} = uiSlice.actions;
export default uiSlice.reducer;
