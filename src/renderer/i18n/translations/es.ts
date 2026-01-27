import { getTranslations } from '../../../shared/translations';
import type { Translations } from '../types';

export const es: Translations = (() => {
  const t = getTranslations('es');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { menu, ...rest } = t;
  return rest;
})();
