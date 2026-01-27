import React from 'react';
import { AppSettings } from '../../utils/settingsPersistence';
import { useI18n } from '../../i18n';

interface GeneralSettingsProps {
  settings: AppSettings['general'];
  onUpdate: (updates: Partial<AppSettings['general']>) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate }) => {
  const { t } = useI18n();

  const handleBrowseFolder = async () => {
    const folder = await window.electronAPI.browseFolder();
    if (folder) {
      onUpdate({ savePath: folder });
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-group">
        <label className="settings-label">{t.general.uiLanguage}</label>
        <select
          className="settings-select"
          value={settings.uiLanguage}
          onChange={(e) => onUpdate({ uiLanguage: e.target.value as 'en' | 'es' })}
        >
          <option value="en">{t.general.languages.english}</option>
          <option value="es">{t.general.languages.spanish}</option>
        </select>
      </div>
      <div className="settings-group">
        <label className="settings-label">{t.general.codeLanguage}</label>
        <select
          className="settings-select"
          value={settings.language}
          onChange={(e) => onUpdate({ language: e.target.value as 'javascript' | 'typescript' })}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
        </select>
      </div>
      <div className="settings-group">
        <label className="settings-label">{t.general.saveFolder}</label>
        <div className="settings-path-input">
          <input
            type="text"
            className="settings-input settings-input-path"
            value={settings.savePath}
            placeholder={t.general.saveFolderPlaceholder}
            onChange={(e) => onUpdate({ savePath: e.target.value })}
            readOnly
          />
          <button className="settings-browse-button" onClick={handleBrowseFolder}>
            {t.general.browse}
          </button>
        </div>
        <p className="settings-description">{t.general.saveFolderDescription}</p>
      </div>
      <div className="settings-group">
        <label className="settings-checkbox-label">
          <input
            type="checkbox"
            checked={settings.autoExecution}
            onChange={(e) => onUpdate({ autoExecution: e.target.checked })}
          />
          <span>{t.general.autoExecution}</span>
        </label>
        <p className="settings-description">{t.general.autoExecutionDescription}</p>
      </div>
      <div className="settings-group">
        <label className="settings-checkbox-label">
          <input
            type="checkbox"
            checked={settings.autoSave}
            onChange={(e) => onUpdate({ autoSave: e.target.checked })}
          />
          <span>{t.general.autoSave}</span>
        </label>
        <p className="settings-description">{t.general.autoSaveDescription}</p>
      </div>
      <div className="settings-group">
        <label className="settings-checkbox-label">
          <input
            type="checkbox"
            checked={settings.confirmClose}
            onChange={(e) => onUpdate({ confirmClose: e.target.checked })}
          />
          <span>{t.general.confirmClose}</span>
        </label>
        <p className="settings-description">{t.general.confirmCloseDescription}</p>
      </div>
    </div>
  );
};
