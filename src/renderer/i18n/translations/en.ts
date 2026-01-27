import { getTranslations } from '../../../shared/translations';
import type { Translations } from '../types';

export const en: Translations = (() => {
  const t = getTranslations('en');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { menu, ...rest } = t;
  return rest;
})();
