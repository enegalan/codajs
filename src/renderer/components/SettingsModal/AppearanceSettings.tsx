import React from 'react';
import { AppSettings } from '../../utils/settingsPersistence';
import { useI18n } from '../../i18n';

interface AppearanceSettingsProps {
  settings: AppSettings['appearance'];
  onUpdate: (updates: Partial<AppSettings['appearance']>) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ settings, onUpdate }) => {
  const { t } = useI18n();

  return (
    <div className="settings-section">
      <div className="settings-group">
        <label className="settings-label">{t.appearance.theme}</label>
        <select
          className="settings-select"
          value={settings.theme}
          onChange={(e) =>
            onUpdate({
              theme: e.target.value as
                | 'dark'
                | 'light'
                | 'dracula'
                | 'neon'
                | 'monokai'
                | 'nord'
                | 'one-dark'
                | 'solarized-dark'
                | 'solarized-light'
                | 'gruvbox'
                | 'tokyo-night'
                | 'synthwave-84',
            })
          }
        >
          <option value="dark">{t.appearance.themes.dark}</option>
          <option value="light">{t.appearance.themes.light}</option>
          <option value="dracula">{t.appearance.themes.dracula}</option>
          <option value="neon">{t.appearance.themes.neon}</option>
          <option value="monokai">{t.appearance.themes.monokai}</option>
          <option value="nord">{t.appearance.themes.nord}</option>
          <option value="one-dark">{t.appearance.themes.oneDark}</option>
          <option value="solarized-dark">{t.appearance.themes.solarizedDark}</option>
          <option value="solarized-light">{t.appearance.themes.solarizedLight}</option>
          <option value="gruvbox">{t.appearance.themes.gruvbox}</option>
          <option value="tokyo-night">{t.appearance.themes.tokyoNight}</option>
          <option value="synthwave-84">{t.appearance.themes.synthwave84}</option>
        </select>
      </div>
      <div className="settings-group">
        <label className="settings-label">
          {t.appearance.fontSize}: {settings.fontSize}px
        </label>
        <input
          type="range"
          className="settings-range"
          value={settings.fontSize}
          min={10}
          max={24}
          step={1}
          onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value, 10) })}
        />
      </div>
    </div>
  );
};
