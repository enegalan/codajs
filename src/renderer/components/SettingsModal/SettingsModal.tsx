import React, { useState } from 'react';
import { AppSettings } from '../../utils/settingsPersistence';
import { GeneralSettings } from './GeneralSettings';
import { CompilationSettings } from './CompilationSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { useI18n } from '../../i18n';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateGeneral: (updates: Partial<AppSettings['general']>) => void;
  onUpdateCompilation: (updates: Partial<AppSettings['compilation']>) => void;
  onUpdateAppearance: (updates: Partial<AppSettings['appearance']>) => void;
  onReset: () => void;
}

type SettingsTab = 'general' | 'compilation' | 'appearance';

const SettingsModalComponent: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateGeneral,
  onUpdateCompilation,
  onUpdateAppearance,
  onReset,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="settings-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2 className="settings-title">{t.settings.title}</h2>
          <button className="settings-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            {t.settings.tabs.general}
          </button>
          <button
            className={`settings-tab ${activeTab === 'compilation' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('compilation')}
          >
            {t.settings.tabs.compilation}
          </button>
          <button
            className={`settings-tab ${activeTab === 'appearance' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            {t.settings.tabs.appearance}
          </button>
        </div>
        <div className="settings-content">
          {activeTab === 'general' && (
            <GeneralSettings settings={settings.general} onUpdate={onUpdateGeneral} />
          )}
          {activeTab === 'compilation' && (
            <CompilationSettings settings={settings.compilation} onUpdate={onUpdateCompilation} />
          )}
          {activeTab === 'appearance' && (
            <AppearanceSettings settings={settings.appearance} onUpdate={onUpdateAppearance} />
          )}
        </div>
        <div className="settings-footer">
          <button className="settings-reset" onClick={onReset}>
            {t.settings.resetToDefaults}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SettingsModal = React.memo(SettingsModalComponent);
