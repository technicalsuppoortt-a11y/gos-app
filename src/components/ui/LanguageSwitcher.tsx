import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setLanguage, type Language } from '../../store/slices/uiSlice';
import { Globe } from 'lucide-react';
import { storageSet } from '../../utils/browserStorage';

export const LanguageSwitcher: React.FC<{ onLanguageChange?: (language: Language) => void }> = ({ onLanguageChange }) => {
  useUILanguage();
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const language = useSelector((state: RootState) => state.ui.language);

  const selectLanguage = (newLang: Language) => {
    void i18n.changeLanguage(newLang);
    dispatch(setLanguage(newLang));
    onLanguageChange?.(newLang);
    storageSet('i18nextLng', newLang);
  };

  return (
    <div className="global-language-control" role="group" aria-label={translateText(t('switch_lang'))}>
      <Globe size={14} aria-hidden="true"/>
      {localizeNode((['en', 'ar'] as const).map(option => <button key={option} type="button" onClick={() => selectLanguage(option)} className={language === option ? 'is-active' : ''} aria-pressed={language === option} lang={option}>{localizeNode(option.toUpperCase())}</button>))}
    </div>
  );
};
