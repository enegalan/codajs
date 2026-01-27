import { getTranslations, type AllTranslations } from '../shared/translations';

export type MenuTranslations = AllTranslations['menu'];

export const getMenuTranslations = (locale: 'en' | 'es' = 'en'): MenuTranslations => {
  return getTranslations(locale).menu;
};
