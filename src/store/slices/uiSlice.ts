import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ar';

interface UIState {
  theme: Theme;
  language: Language;
  sidebarOpen: boolean;
}

const initialState: UIState = {
  theme: (localStorage.getItem('theme') as Theme) || 'light',
  language: (localStorage.getItem('i18nextLng') as Language) || 'ar',
  sidebarOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      document.documentElement.dir = action.payload === 'ar' ? 'rtl' : 'ltr';
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
       state.sidebarOpen = action.payload;
    }
  },
});

export const { toggleTheme, setLanguage, toggleSidebar, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
