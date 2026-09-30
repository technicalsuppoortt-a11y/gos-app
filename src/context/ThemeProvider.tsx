import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import i18n from '../i18n/i18n';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const theme = useSelector((state: RootState) => state.ui.theme);
  const language = useSelector((state: RootState) => state.ui.language);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* Keep the selected theme in Redux. */ }
  }, [theme]);

  useEffect(() => {
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    document.body.dir = direction;
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language]);

  return <>{children}</>;
};
