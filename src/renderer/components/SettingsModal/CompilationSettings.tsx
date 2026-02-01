import React from 'react';
import { AppSettings } from '../../utils/settingsPersistence';
import { useI18n } from '../../i18n';

interface CompilationSettingsProps {
  settings: AppSettings['compilation'];
  onUpdate: (updates: Partial<AppSettings['compilation']>) => void;
}

export const CompilationSettings: React.FC<CompilationSettingsProps> = ({ settings, onUpdate }) => {
  const { t } = useI18n();

  return (
    <div className="settings-section">
      <div className="settings-group">
        <label className="settings-label">{t.compilation.executionTimeout}</label>
        <input
          type="number"
          className="settings-input"
          value={settings.timeout}
          min={1000}
          max={60000}
          step={1000}
          onChange={(e) => onUpdate({ timeout: parseInt(e.target.value, 10) || 5000 })}
        />
        <p className="settings-description">{t.compilation.executionTimeoutDescription}</p>
      </div>
      <div className="settings-group">
        <label className="settings-label">{t.compilation.defaultRuntime}</label>
        <select
          className="settings-select"
          value={settings.defaultRuntime}
          onChange={(e) =>
            onUpdate({ defaultRuntime: e.target.value as 'node' | 'deno' | 'bun' | 'browser' })
          }
        >
          <option value="browser">Browser (Web Audio)</option>
          <option value="node">Node.js</option>
          <option value="deno">Deno</option>
          <option value="bun">Bun</option>
        </select>
      </div>
    </div>
  );
};
