import { app } from 'electron';
import { AppStore } from '../../store';

export function createSettingsHandlers(appStore: AppStore) {
  return {
    'settings:get-ui-language': async (): Promise<'en' | 'es'> => {
      const storedLanguage = appStore.getSetting('uiLanguage');
      if (storedLanguage) {
        return storedLanguage;
      }
      const systemLocale = app.getLocale();
      return systemLocale.startsWith('es') ? 'es' : 'en';
    },
  };
}
