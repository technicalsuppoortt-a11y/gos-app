import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { toggleTheme } from '../../store/slices/uiSlice';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.ui.theme);

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  return (
    <button
      onClick={handleToggle}
      className="global-theme-control"
      title={theme === 'light' ? t('dark_mode') : t('light_mode')}
      aria-label={theme === 'light' ? t('dark_mode') : t('light_mode')}
    >
      {theme === 'light' ? (
        <Moon size={16} aria-hidden="true" />
      ) : (
        <Sun size={16} aria-hidden="true" />
      )}
    </button>
  );
};
