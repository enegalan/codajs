import React, { createContext, useContext, useMemo } from 'react';
import { Locale, Translations } from './types';
import { en } from './translations/en';
import { es } from './translations/es';

interface I18nContextValue {
  t: Translations;
  locale: Locale;
}

const translations: Record<Locale, Translations> = {
  en,
  es,
};

const I18nContext = createContext<I18nContextValue>({
  t: en,
  locale: 'en',
});

interface I18nProviderProps {
  locale: Locale;
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ locale, children }) => {
  const value = useMemo(
    () => ({
      t: translations[locale] || en,
      locale,
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  return useContext(I18nContext);
};
