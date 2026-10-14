import { storageGet, storageSet } from '../../utils/browserStorage';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ar';

interface UIState {
  theme: Theme;
  language: Language;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

const initialState: UIState = {
  theme: storageGet('theme') === 'dark' ? 'dark' : 'light',
  language: storageGet('i18nextLng') === 'en' ? 'en' : 'ar',
  sidebarOpen: false,
  sidebarCollapsed: storageGet('sidebar_collapsed') === 'true',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
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
      if (typeof document !== 'undefined') { document.documentElement.lang = action.payload; document.documentElement.dir = action.payload === 'ar' ? 'rtl' : 'ltr'; }
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
  toggleTheme, 
  setLanguage, 
  toggleSidebar, 
  setSidebarOpen, 
  toggleSidebarCollapse, 
  setSidebarCollapsed 
} = uiSlice.actions;
export default uiSlice.reducer;

