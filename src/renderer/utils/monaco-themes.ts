import { initializeMonacoThemes, getMonacoThemeName } from '../../shared/themes/monaco-themes';

export { getMonacoThemeName };

export function initializeEditorThemes(): void {
  initializeMonacoThemes();
}
