import type { Locale, AllTranslations } from '../../shared/translations';

export type { Locale };
export type Translations = Omit<AllTranslations, 'menu'>;
